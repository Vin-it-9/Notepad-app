const { contextBridge, ipcRenderer } = require('electron');

// Set up secure bridge between renderer and main processes
contextBridge.exposeInMainWorld('electronAPI', {
  // Note operations
  saveNote: (content, title) => ipcRenderer.invoke('save-note', content, title),
  saveNoteToPath: (content, filePath) => ipcRenderer.invoke('save-note-to-path', content, filePath),
  loadNote: () => ipcRenderer.invoke('load-note'),
  
  // File explorer operations
  listDirectory: () => ipcRenderer.invoke('list-directory'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // Settings operations
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  
  // Search operations
  searchInFile: (content, searchTerm) => ipcRenderer.invoke('search-in-file', content, searchTerm),
  
  // Menu event handlers
  onNewNote: (callback) => {
    ipcRenderer.on('menu-new-note', () => callback());
    return () => ipcRenderer.removeListener('menu-new-note', callback);
  },
  onSaveRequest: (callback) => {
    ipcRenderer.on('menu-save', () => callback());
    return () => ipcRenderer.removeListener('menu-save', callback);
  },
  onSaveAsRequest: (callback) => {
    ipcRenderer.on('menu-save-as', () => callback());
    return () => ipcRenderer.removeListener('menu-save-as', callback);
  },
  onFindRequest: (callback) => {
    ipcRenderer.on('menu-find', () => callback());
    return () => ipcRenderer.removeListener('menu-find', callback);
  },
  onSettingsRequest: (callback) => {
    ipcRenderer.on('menu-settings', () => callback());
    return () => ipcRenderer.removeListener('menu-settings', callback);
  },
// Add these new methods to the electronAPI object in preload.js
quit: () => ipcRenderer.invoke('quit-app'),
showAbout: () => ipcRenderer.invoke('show-about'),
toggleFullscreen: () => ipcRenderer.invoke('toggle-fullscreen'),
});

// Console log for debugging
console.log('Preload script loaded successfully');