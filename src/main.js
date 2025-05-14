const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const Store = require('electron-store').default;
const store = new Store();


let mainWindow;

// Fix cache location to avoid permission errors
app.commandLine.appendSwitch('disk-cache-dir', path.join(app.getPath('userData'), 'cache'));
app.commandLine.appendSwitch('disable-gpu-cache');

// Create a specific folder for saving notes
function ensureSaveDirectory() {
  const desktopPath = app.getPath('desktop');
  const saveDir = path.join(desktopPath, 'nextext');
  
  if (!fs.existsSync(saveDir)) {
    try {
      fs.mkdirSync(saveDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create nextext directory:', error);
    }
  }
  
  return saveDir;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      partition: 'persist:notepadapp'
    },
    icon: path.join(__dirname, '../assets/icons/icon.png')
  });

  

  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));

  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Note',
          accelerator: 'CmdOrCtrl+N',
          click() {
            mainWindow.webContents.send('menu-new-note');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click() {
            mainWindow.webContents.send('menu-open');
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click() {
            mainWindow.webContents.send('menu-save');
          }
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click() {
            mainWindow.webContents.send('menu-save-as');
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Settings',
          click() {
            mainWindow.webContents.send('menu-settings');
          }
        },
        {
          type: 'separator'
        },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click() {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click() {
            mainWindow.webContents.send('menu-find');
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'toggledevtools' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click() {
            dialog.showMessageBox(mainWindow, {
              title: 'About NextExt',
              message: 'NextExt - Enhanced Notepad',
              detail: 'Version 1.1.0\nCreated with Electron and Tailwind CSS\n\nFeatures:\n- Multiple tabs\n- File explorer\n- Search functionality\n- Auto-save\n- Word and character count',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Make sure to set paths before app is ready
app.setPath('userData', path.join(app.getPath('appData'), 'nextext-app'));

app.whenReady().then(() => {
  createWindow();
  ensureSaveDirectory();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// List files in the save directory
ipcMain.handle('list-directory', async () => {
  try {
    const saveDir = ensureSaveDirectory();
    const files = fs.readdirSync(saveDir);
    
    // Filter for text files and get details
    const fileDetails = files
      .filter(file => file.endsWith('.txt'))
      .map(file => {
        const filePath = path.join(saveDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          size: stats.size,
          modified: stats.mtime
        };
      });
    
    return { 
      success: true, 
      files: fileDetails,
      directory: saveDir
    };
  } catch (error) {
    console.error('Error listing directory:', error);
    return { success: false, message: error.message };
  }
});

// Read a specific file
ipcMain.handle('read-file', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return { success: true, content, filePath };
    }
    return { success: false, message: 'File not found' };
  } catch (error) {
    console.error('Error reading file:', error);
    return { success: false, message: error.message };
  }
});

// Save directly to a specific path (without dialog)
ipcMain.handle('save-note-to-path', async (event, content, filePath) => {
  try {
    if (filePath) {
      fs.writeFileSync(filePath, content);
      return { success: true, filePath };
    }
    return { success: false, message: 'Invalid file path' };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, message: error.message };
  }
});

// Save note (with dialog)
ipcMain.handle('save-note', async (event, content, title) => {
  try {
    // Make sure the save directory exists
    const saveDir = ensureSaveDirectory();
    
    // Use the title as the filename, or "Untitled" if not provided
    const fileName = (title && title.trim() !== '') ? 
      `${title.replace(/[/\\?%*:|"<>]/g, '-')}.txt` : 'Untitled.txt';
    
    const { filePath, canceled } = await dialog.showSaveDialog({
      buttonLabel: 'Save Note',
      defaultPath: path.join(saveDir, fileName),
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePath && !canceled) {
      fs.writeFileSync(filePath, content);
      return { success: true, filePath };
    }
    return { success: false, message: 'Save canceled' };
  } catch (error) {
    console.error('Error saving file:', error);
    return { success: false, message: error.message };
  }
});

ipcMain.handle('quit-app', () => {
  app.quit();
});

ipcMain.handle('show-about', () => {
  dialog.showMessageBox(mainWindow, {
    title: 'About NextExt',
    message: 'NextExt - Enhanced Notepad',
    detail: 'Version 1.1.0\nCreated with Electron and Tailwind CSS\n\nFeatures:\n- Multiple tabs\n- File explorer\n- Search functionality\n- Auto-save\n- Word and character count',
    buttons: ['OK']
  });
});

ipcMain.handle('toggle-fullscreen', () => {
  if (mainWindow) {
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
  }
});
// Load note
ipcMain.handle('load-note', async () => {
  try {
    // Default to the save directory when opening files too
    const saveDir = ensureSaveDirectory();
    
    const { filePaths, canceled } = await dialog.showOpenDialog({
      defaultPath: saveDir,
      properties: ['openFile'],
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (filePaths && filePaths.length > 0 && !canceled) {
      const content = fs.readFileSync(filePaths[0], 'utf-8');
      return { success: true, content, filePath: filePaths[0] };
    }
    return { success: false, message: 'Open canceled' };
  } catch (error) {
    console.error('Error loading file:', error);
    return { success: false, message: error.message };
  }
});

// Settings handlers
ipcMain.handle('get-settings', async () => {
  try {
    // Default settings
    const defaultSettings = {
      autoSaveEnabled: true,
      autoSaveIntervalSeconds: 60,
      fontSize: 16
    };
    
    // Get settings from store or return defaults
    const savedSettings = store.get('settings');
    return { ...defaultSettings, ...savedSettings };
  } catch (error) {
    console.error('Error loading settings:', error);
    return null;
  }
});

ipcMain.handle('save-settings', async (event, settings) => {
  try {
    store.set('settings', settings);
    return { success: true };
  } catch (error) {
    console.error('Error saving settings:', error);
    return { success: false, message: error.message };
  }
});

// Search functionality helper
ipcMain.handle('search-in-file', async (event, content, searchTerm) => {
  try {
    if (!content || !searchTerm) {
      return { success: false, matches: [] };
    }
    
    const matches = [];
    const regex = new RegExp(searchTerm, 'gi');
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + searchTerm.length
      });
    }
    
    return { success: true, matches };
  } catch (error) {
    console.error('Error searching in file:', error);
    return { success: false, message: error.message };
  }
});

// Add event listener for settings menu item
ipcMain.on('menu-settings', () => {
  mainWindow.webContents.send('menu-settings');
});

// Add event listener for find menu item
ipcMain.on('menu-find', () => {
  mainWindow.webContents.send('menu-find');
});