const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Note operations
  saveNote: (content, title) => ipcRenderer.invoke('save-note', content, title),
  saveNoteToPath: (content, filePath) => ipcRenderer.invoke('save-note-to-path', content, filePath),
  loadNote: () => ipcRenderer.invoke('load-note'),
  
  // File explorer operations
  listDirectory: () => ipcRenderer.invoke('list-directory'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  
  // Menu event handlers
  onNewNote: (callback) => ipcRenderer.on('menu-new-note', callback),
  onSaveRequest: (callback) => ipcRenderer.on('menu-save', callback),
  onSaveAsRequest: (callback) => ipcRenderer.on('menu-save-as', callback),
});