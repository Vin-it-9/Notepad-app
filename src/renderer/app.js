// DOM elements
const noteTitle = document.getElementById('noteTitle');
const noteContent = document.getElementById('noteContent');
const newBtn = document.getElementById('newBtn');
const openBtn = document.getElementById('openBtn');
const saveBtn = document.getElementById('saveBtn');
const fileExplorer = document.getElementById('file-explorer');
const tabsContainer = document.getElementById('tabs-container');
const refreshFilesBtn = document.getElementById('refreshFilesBtn');
const statusMessage = document.getElementById('status-message');
const emptyExplorerMessage = document.getElementById('empty-explorer-message');

// Application state
let currentFilePath = null;
let openFiles = [];
let activeFileIndex = -1;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  createNewNote();
  loadFilesFromDirectory();
});

// Create a new note
function createNewNote() {
  const id = Date.now().toString();
  const title = 'Untitled';
  
  // Create new file in state
  const newFile = { 
    id, 
    title, 
    content: '', 
    path: null, 
    isModified: false 
  };
  
  openFiles.push(newFile);
  switchToFile(openFiles.length - 1);
  createTabForFile(newFile, openFiles.length - 1);
  
  updateStatusMessage('New note created');
}

// Load files from save directory
async function loadFilesFromDirectory() {
  // Clear existing files
  fileExplorer.innerHTML = '';
  
  try {
    const result = await window.electronAPI.listDirectory();
    
    if (result.success && result.files.length > 0) {
      emptyExplorerMessage.classList.add('hidden');
      
      // Sort files alphabetically
      result.files.sort((a, b) => a.name.localeCompare(b.name));
      
      result.files.forEach(file => {
        createFileElement(file);
      });
    } else {
      emptyExplorerMessage.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Failed to load files:', error);
    updateStatusMessage('Failed to load files', true);
  }
}

// Create file element in sidebar
function createFileElement(file) {
  const fileElement = document.createElement('div');
  fileElement.className = 'flex items-center p-2 cursor-pointer sidebar-file hover:bg-gray-100';
  fileElement.dataset.path = file.path;
  fileElement.innerHTML = `
    <i class="fas fa-file-alt text-gray-500 mr-2"></i>
    <span class="truncate">${file.name}</span>
  `;
  
  fileElement.addEventListener('click', async () => {
    try {
      const result = await window.electronAPI.readFile(file.path);
      if (result.success) {
        const existingIndex = openFiles.findIndex(f => f.path === file.path);
        
        if (existingIndex >= 0) {
          // File is already open, switch to it
          switchToFile(existingIndex);
        } else {
          // Open new file
          const newFile = {
            id: Date.now().toString(),
            title: file.name.replace('.txt', ''),
            content: result.content,
            path: file.path,
            isModified: false
          };
          
          openFiles.push(newFile);
          createTabForFile(newFile, openFiles.length - 1);
          switchToFile(openFiles.length - 1);
        }
        
        updateStatusMessage(`Opened: ${file.name}`);
      }
    } catch (error) {
      console.error('Failed to open file:', error);
      updateStatusMessage('Failed to open file', true);
    }
  });
  
  fileExplorer.appendChild(fileElement);
}

// Create a tab for a file
function createTabForFile(file, index) {
  const tab = document.createElement('div');
  tab.className = 'flex items-center pr-1 border-r cursor-pointer';
  tab.dataset.index = index;
  
  tab.innerHTML = `
    <div class="px-3 py-2 flex items-center max-w-xs">
      <span class="truncate">${file.title}${file.isModified ? ' *' : ''}</span>
      <button class="tab-close ml-2 px-1 rounded-full hover:bg-red-500 hover:text-white">
        <i class="fas fa-times text-xs"></i>
      </button>
    </div>
  `;
  
  tab.addEventListener('click', (e) => {
    // Don't switch if clicking the close button
    if (!e.target.closest('.tab-close')) {
      switchToFile(parseInt(tab.dataset.index));
    }
  });
  
  const closeBtn = tab.querySelector('.tab-close');
  closeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    closeFile(parseInt(tab.dataset.index));
  });
  
  tabsContainer.appendChild(tab);
}

// Switch to a specific file
function switchToFile(index) {
  if (index < 0 || index >= openFiles.length) return;
  
  // Save current content if there's an active file
  if (activeFileIndex >= 0 && activeFileIndex < openFiles.length) {
    openFiles[activeFileIndex].content = noteContent.value;
    openFiles[activeFileIndex].title = noteTitle.value;
  }
  
  // Switch to new file
  activeFileIndex = index;
  const file = openFiles[activeFileIndex];
  
  // Update UI
  noteTitle.value = file.title;
  noteContent.value = file.content;
  currentFilePath = file.path;
  
  // Update tabs
  const tabs = tabsContainer.querySelectorAll('div[data-index]');
  tabs.forEach(tab => {
    const tabIndex = parseInt(tab.dataset.index);
    if (tabIndex === activeFileIndex) {
      tab.classList.add('tab-active');
    } else {
      tab.classList.remove('tab-active');
    }
  });
  
  // Update sidebar
  const sidebarFiles = fileExplorer.querySelectorAll('.sidebar-file');
  sidebarFiles.forEach(fileEl => {
    // Highlight the current file in the sidebar if it exists
    const filePath = fileEl.dataset.path;
    if (filePath === file.path) {
      fileEl.classList.add('active');
    } else {
      fileEl.classList.remove('active');
    }
  });
}

// Close a file
function closeFile(index) {
  if (index < 0 || index >= openFiles.length) return;
  
  const file = openFiles[index];
  
  // Ask for confirmation if file is modified
  if (file.isModified) {
    // In a real app, you'd show a dialog here
    const confirmed = confirm(`Save changes to ${file.title} before closing?`);
    if (confirmed) {
      saveNote(index);
    }
  }
  
  // Remove file from state
  openFiles.splice(index, 1);
  
  // Update tabs
  tabsContainer.innerHTML = '';
  openFiles.forEach((file, i) => {
    createTabForFile(file, i);
  });
  
  // Switch to another file or create new one
  if (openFiles.length > 0) {
    const newIndex = Math.min(index, openFiles.length - 1);
    switchToFile(newIndex);
  } else {
    createNewNote();
  }
}

// Save the current note
async function saveNote(index = activeFileIndex, forceSaveDialog = false) {
  const fileToSave = openFiles[index];
  if (!fileToSave) return;
  
  const content = fileToSave.content || noteContent.value;
  const title = fileToSave.title || noteTitle.value;
  
  try {
    let result;
    
    // If file already has a path and we're not forcing a dialog, save directly
    if (fileToSave.path && !forceSaveDialog) {
      result = await window.electronAPI.saveNoteToPath(content, fileToSave.path);
    } else {
      // Otherwise show save dialog
      result = await window.electronAPI.saveNote(content, title);
    }
    
    if (result.success) {
      fileToSave.path = result.filePath;
      fileToSave.isModified = false;
      
      // Extract filename from path for the title
      const fileName = result.filePath.split('\\').pop().split('/').pop();
      fileToSave.title = fileName.replace('.txt', '');
      
      // Update UI if this is the active file
      if (index === activeFileIndex) {
        noteTitle.value = fileToSave.title;
        currentFilePath = fileToSave.path;
      }
      
      // Refresh file list
      loadFilesFromDirectory();
      
      // Update tabs
      tabsContainer.innerHTML = '';
      openFiles.forEach((file, i) => {
        createTabForFile(file, i);
      });
      
      updateStatusMessage('File saved successfully');
    }
  } catch (error) {
    console.error('Failed to save:', error);
    updateStatusMessage('Failed to save file', true);
  }
}

// Save As - always shows dialog
function saveNoteAs() {
  saveNote(activeFileIndex, true);
}

// Load a note
async function loadNote() {
  try {
    const result = await window.electronAPI.loadNote();
    
    if (result.success) {
      // Extract filename from path for the title
      const fileName = result.filePath.split('\\').pop().split('/').pop();
      const title = fileName.replace('.txt', '');
      
      // Check if the file is already open
      const existingIndex = openFiles.findIndex(f => f.path === result.filePath);
      
      if (existingIndex >= 0) {
        // File is already open, switch to it
        switchToFile(existingIndex);
      } else {
        // Create new file entry
        const newFile = {
          id: Date.now().toString(),
          title,
          content: result.content,
          path: result.filePath,
          isModified: false
        };
        
        openFiles.push(newFile);
        createTabForFile(newFile, openFiles.length - 1);
        switchToFile(openFiles.length - 1);
      }
      
      updateStatusMessage('File loaded successfully');
    }
  } catch (error) {
    console.error('Failed to load:', error);
    updateStatusMessage('Failed to load file', true);
  }
}

// Update status message
function updateStatusMessage(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = isError ? 'text-red-500' : 'text-gray-600';
  
  // Clear message after a few seconds
  setTimeout(() => {
    statusMessage.textContent = '';
  }, 3000);
}

// Event listeners for buttons
newBtn.addEventListener('click', createNewNote);
openBtn.addEventListener('click', loadNote);
saveBtn.addEventListener('click', () => saveNote(activeFileIndex));
refreshFilesBtn.addEventListener('click', loadFilesFromDirectory);

// Listen for content changes to mark file as modified
noteContent.addEventListener('input', () => {
  if (activeFileIndex >= 0) {
    const file = openFiles[activeFileIndex];
    if (!file.isModified) {
      file.isModified = true;
      
      // Update tab to show modification
      tabsContainer.innerHTML = '';
      openFiles.forEach((file, i) => {
        createTabForFile(file, i);
      });
      switchToFile(activeFileIndex);
    }
    
    // Update content in memory
    file.content = noteContent.value;
  }
});

noteTitle.addEventListener('input', () => {
  if (activeFileIndex >= 0) {
    const file = openFiles[activeFileIndex];
    if (!file.isModified) {
      file.isModified = true;
    }
    
    // Update title in memory
    file.title = noteTitle.value;
    
    // Update tab
    tabsContainer.innerHTML = '';
    openFiles.forEach((file, i) => {
      createTabForFile(file, i);
    });
    switchToFile(activeFileIndex);
  }
});

// Listen for keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ctrl+S to save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    saveNote(activeFileIndex);
  }
  
  // Ctrl+Shift+S to Save As
  if (e.ctrlKey && e.shiftKey && e.key === 'S') {
    e.preventDefault();
    saveNoteAs();
  }
});

// Listen for menu events from the main process
window.electronAPI.onNewNote(() => {
  createNewNote();
});

window.electronAPI.onSaveRequest(() => {
  saveNote(activeFileIndex);
});

window.electronAPI.onSaveAsRequest(() => {
  saveNoteAs();
});

// Initialize with an empty note
createNewNote();