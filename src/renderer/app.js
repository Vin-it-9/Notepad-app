// DOM elements - wait for them to be available
let noteTitle, noteContent, newBtn, openBtn, saveBtn, fileExplorer, tabsContainer;
let refreshFilesBtn, statusMessage, emptyExplorerMessage, searchInput, searchBtn;
let searchCloseBtn, searchContainer, prevMatchBtn, nextMatchBtn, matchCounter;
let wordCountEl, charCountEl, settingsBtn, settingsModal, closeSettingsBtn;
let saveSettingsBtn, autoSaveIntervalInput, fontSizeInput, autoSaveCheckbox;

// Application state
let currentFilePath = null;
let openFiles = [];
let activeFileIndex = -1;
let searchMatches = [];
let currentMatchIndex = -1;
let autoSaveInterval = null;
let settings = {
  autoSaveEnabled: true,
  autoSaveIntervalSeconds: 60,
  fontSize: 16
};

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
  // Initialize DOM references
  initDomReferences();
  
  // Initialize application
  initializeApp();
});

// Initialize DOM references
function initDomReferences() {
  // Core elements
  noteTitle = document.getElementById('noteTitle');
  noteContent = document.getElementById('noteContent');
  newBtn = document.getElementById('newBtn');
  openBtn = document.getElementById('openBtn');
  saveBtn = document.getElementById('saveBtn');
  fileExplorer = document.getElementById('file-explorer');
  tabsContainer = document.getElementById('tabs-container');
  refreshFilesBtn = document.getElementById('refreshFilesBtn');
  statusMessage = document.getElementById('status-message');
  emptyExplorerMessage = document.getElementById('empty-explorer-message');
  
  // Search elements
  searchInput = document.getElementById('searchInput');
  searchBtn = document.getElementById('searchBtn');
  searchCloseBtn = document.getElementById('searchCloseBtn');
  searchContainer = document.getElementById('searchContainer');
  prevMatchBtn = document.getElementById('prevMatchBtn');
  nextMatchBtn = document.getElementById('nextMatchBtn');
  matchCounter = document.getElementById('matchCounter');
  
  // Stats elements
  wordCountEl = document.getElementById('wordCount');
  charCountEl = document.getElementById('charCount');
  
  // Settings elements
  settingsBtn = document.getElementById('settingsBtn');
  settingsModal = document.getElementById('settingsModal');
  closeSettingsBtn = document.getElementById('closeSettingsBtn');
  saveSettingsBtn = document.getElementById('saveSettingsBtn');
  autoSaveIntervalInput = document.getElementById('autoSaveInterval');
  fontSizeInput = document.getElementById('fontSize');
  autoSaveCheckbox = document.getElementById('autoSaveEnabled');
  
  // Log if any important elements are missing
  const missingElements = [];
  if (!noteTitle) missingElements.push('noteTitle');
  if (!noteContent) missingElements.push('noteContent');
  if (!searchBtn) missingElements.push('searchBtn');
  if (!searchContainer) missingElements.push('searchContainer');
  if (!settingsBtn) missingElements.push('settingsBtn');
  if (!settingsModal) missingElements.push('settingsModal');
  if (!wordCountEl) missingElements.push('wordCountEl');
  if (!charCountEl) missingElements.push('charCountEl');
  
  if (missingElements.length > 0) {
    console.error('Missing DOM elements:', missingElements.join(', '));
  } else {
    console.log('All DOM elements found successfully');
  }
}

// Initialize application
function initializeApp() {
  // Setup event listeners
  setupEventListeners();
  
  // Load settings
  loadSettings().then(() => {
    // Apply settings
    applySettings();
    
    // Create new note
    createNewNote();
    
    // Load files from directory
    loadFilesFromDirectory();
  });
}

// Setup event listeners
function setupEventListeners() {
 // Core functionality
  newBtn.addEventListener('click', createNewNote);
  openBtn.addEventListener('click', loadNote);
  saveBtn.addEventListener('click', () => saveNote(activeFileIndex));
  refreshFilesBtn.addEventListener('click', loadFilesFromDirectory);
  
  // Note content events
  noteContent.addEventListener('input', handleNoteContentChange);
  noteTitle.addEventListener('input', handleNoteTitleChange);
  
  // Search functionality
  searchBtn.addEventListener('click', showSearch);
  searchCloseBtn.addEventListener('click', hideSearch);
  searchInput.addEventListener('input', performSearch);
  prevMatchBtn.addEventListener('click', prevMatch);
  nextMatchBtn.addEventListener('click', nextMatch);
  
  // Settings functionality
  settingsBtn.addEventListener('click', toggleSettingsModal);
  closeSettingsBtn.addEventListener('click', toggleSettingsModal);
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
  
  // Menu events from main process
  window.electronAPI.onNewNote(() => {
    createNewNote();
  });
  
  window.electronAPI.onSaveRequest(() => {
    saveNote(activeFileIndex);
  });
  
  window.electronAPI.onSaveAsRequest(() => {
    saveNoteAs();
  });
  
  // New menu handlers for Find and Settings
  window.electronAPI.onFindRequest(() => {
    showSearch();
  });
  
  window.electronAPI.onSettingsRequest(() => {
    toggleSettingsModal();
  });
  
}

// Load settings from store
async function loadSettings() {
  try {
    const savedSettings = await window.electronAPI.getSettings();    
    if (savedSettings) {
      settings = { ...settings, ...savedSettings };
    }
    
    // Initialize settings form with current values
    autoSaveIntervalInput.value = settings.autoSaveIntervalSeconds;
    fontSizeInput.value = settings.fontSize;
    autoSaveCheckbox.checked = settings.autoSaveEnabled;
    
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
}

// Apply settings
function applySettings() {
  console.log('Applying settings...');
  
  // Apply font size
  noteContent.style.fontSize = `${settings.fontSize}px`;
  console.log(`Applied font size: ${settings.fontSize}px`);
  
  // Setup auto-save based on settings
  setupAutoSave();
}

// Setup auto-save
function setupAutoSave() {
  
  if (autoSaveInterval) {
    clearInterval(autoSaveInterval);
    console.log('Cleared existing auto-save interval');
  }
  
  // Set up new interval if enabled
  if (settings.autoSaveEnabled) {
    autoSaveInterval = setInterval(() => {
      console.log('Auto-save interval triggered, checking for changes...');
      if (activeFileIndex >= 0 && openFiles[activeFileIndex].isModified) {
        console.log('File is modified, auto-saving...');
        saveNote(activeFileIndex);
        updateStatusMessage('Auto-saved');
      } else {
        console.log('No modified files to auto-save');
      }
    }, settings.autoSaveIntervalSeconds * 1000);
    
    console.log(`Auto-save interval set to ${settings.autoSaveIntervalSeconds} seconds`);
  } else {
    console.log('Auto-save is disabled');
  }
}

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
      console.log('No files found in directory');
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
          console.log('File already open, switching to tab');
          switchToFile(existingIndex);
        } else {
          // Open new file
          console.log('Opening new file');
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
  if (index < 0 || index >= openFiles.length) {
    console.warn('Invalid file index, aborting switch');
    return;
  }
  
  // Save current content if there's an active file
  if (activeFileIndex >= 0 && activeFileIndex < openFiles.length) {
    console.log('Saving current file state before switch');
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

  // Update word and character count
  updateDocumentStats();

  // Clear any existing search
  clearSearch();

}

// Close a file
function closeFile(index) {
 
  if (index < 0 || index >= openFiles.length) {
    console.warn('Invalid file index, aborting close');
    return;
  }
  
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

// Handle note content change
function handleNoteContentChange() {
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
    
    // Update word and character count
    updateDocumentStats();
  }
}

// Handle note title change
function handleNoteTitleChange() {
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
}

// Save the current note
async function saveNote(index = activeFileIndex, forceSaveDialog = false) {  
  const fileToSave = openFiles[index];
  if (!fileToSave) {
    console.warn('No file to save, aborting');
    return;
  }
  
  const content = fileToSave.content || noteContent.value;
  const title = fileToSave.title || noteTitle.value;
  
  try {
    let result;
    
    // If file already has a path and we're not forcing a dialog, save directly
    if (fileToSave.path && !forceSaveDialog) {
      console.log('Saving to existing path:', fileToSave.path);
      result = await window.electronAPI.saveNoteToPath(content, fileToSave.path);
    } else {
      // Otherwise show save dialog
      console.log('Showing save dialog');
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
      console.log('File saved successfully to:', result.filePath);
    }
  } catch (error) {
    console.error('Failed to save:', error);
    updateStatusMessage('Failed to save file', true);
  }
}

// Save As - always shows dialog
function saveNoteAs() {
  console.log('Save As requested');
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
        console.log('File already open, switching to tab');
        switchToFile(existingIndex);
      } else {
        // Create new file entry
        console.log('Creating new file entry for loaded file');
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
  console.log('Status message:', message, 'isError:', isError);
  
  statusMessage.textContent = message;
  statusMessage.className = isError ? 'text-red-500' : 'text-gray-600';
  
  // Clear message after a few seconds
  setTimeout(() => {
    statusMessage.textContent = '';
  }, 3000);
}

// Handle keyboard shortcuts
function handleKeyboardShortcuts(e) {
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
  
  // Ctrl+F to search
  if (e.ctrlKey && e.key === 'f') {
    e.preventDefault();
    showSearch();
  }
  
  // Escape to close search or settings
  if (e.key === 'Escape') {
    if (!searchContainer.classList.contains('hidden')) {
      hideSearch();
    }
    if (!settingsModal.classList.contains('hidden')) {
      toggleSettingsModal();
    }
  }
}

// Word and character count
function updateDocumentStats() {  
  if (activeFileIndex < 0) return;
  
  const content = noteContent.value;
  
  // Calculate character count (including spaces)
  const charCount = content.length;
  
  // Calculate word count (simple implementation)
  const wordCount = content
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
  
  // Update UI
  if (wordCountEl && charCountEl) {
    wordCountEl.textContent = wordCount;
    charCountEl.textContent = charCount;
    console.log(`Updated stats - Words: ${wordCount}, Characters: ${charCount}`);
  } else {
    console.error('Count elements not available');
  }
}

// Search functionality
function showSearch() {
  if (searchContainer) {
    searchContainer.classList.remove('hidden');
    searchInput.focus();
    searchInput.select();
  } else {
    console.error('Search container not found');
  }
}

function hideSearch() {
  if (searchContainer) {
    searchContainer.classList.add('hidden');
    clearSearch();
    noteContent.focus();
  } else {
    console.error('Search container not found');
  }
}

function clearSearch() {
  if (searchInput) searchInput.value = '';
  searchMatches = [];
  currentMatchIndex = -1;
  if (matchCounter) matchCounter.textContent = '0/0';
}

function performSearch() {  
  if (!searchInput) {
    console.error('Search input element not found');
    return;
  }
  
  const searchQuery = searchInput.value;
  if (!searchQuery) {
    if (matchCounter) matchCounter.textContent = '0/0';
    return;
  }
  
  const content = noteContent.value;
  searchMatches = [];
  let match;
  
  try {
    // Find all matches
    const safeSearchQuery = escapeRegExp(searchQuery);
    const regex = new RegExp(safeSearchQuery, 'gi');
    
    while ((match = regex.exec(content)) !== null) {
      searchMatches.push({
        start: match.index,
        end: match.index + searchQuery.length
      });
    }
    
    // Update match counter
    if (matchCounter) {
      matchCounter.textContent = searchMatches.length > 0 ? 
        `1/${searchMatches.length}` : '0/0';
    }
    
    // Go to first match if any
    if (searchMatches.length > 0) {
      currentMatchIndex = 0;
      goToMatch(currentMatchIndex);
    }
    
    console.log(`Found ${searchMatches.length} matches`);
  } catch (error) {
    console.error('Search error:', error);
  }
}

function prevMatch() {
  console.log('Moving to previous match');
  
  if (searchMatches.length === 0) return;
  
  currentMatchIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
  goToMatch(currentMatchIndex);
  
  if (matchCounter) {
    matchCounter.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
  }
}

function nextMatch() {
  console.log('Moving to next match');
  
  if (searchMatches.length === 0) return;
  
  currentMatchIndex = (currentMatchIndex + 1) % searchMatches.length;
  goToMatch(currentMatchIndex);
  
  if (matchCounter) {
    matchCounter.textContent = `${currentMatchIndex + 1}/${searchMatches.length}`;
  }
}

function goToMatch(index) {
  console.log('Going to match at index:', index);
  
  if (!noteContent) {
    console.error('Note content element not found');
    return;
  }
  
  const match = searchMatches[index];
  noteContent.focus();
  noteContent.setSelectionRange(match.start, match.end);
  
  // Ensure the match is visible (scroll if needed)
  const textBeforeMatch = noteContent.value.substring(0, match.start);
  const linesBefore = textBeforeMatch.split('\n').length - 1;
  const lineHeight = parseInt(window.getComputedStyle(noteContent).lineHeight);
  const scrollPos = linesBefore * lineHeight;
  
  noteContent.scrollTop = scrollPos - noteContent.clientHeight / 2;
}

// Helper function to escape regex special characters
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Settings panel
function toggleSettingsModal() {
  console.log('Toggling settings modal');
  
  if (!settingsModal) {
    console.error('Settings modal element not found');
    return;
  }
  
  if (settingsModal.classList.contains('hidden')) {
    settingsModal.classList.remove('hidden');
    
    // Set form values to match current settings
    if (autoSaveIntervalInput) autoSaveIntervalInput.value = settings.autoSaveIntervalSeconds;
    if (fontSizeInput) fontSizeInput.value = settings.fontSize;
    if (autoSaveCheckbox) autoSaveCheckbox.checked = settings.autoSaveEnabled;
    
    console.log('Settings modal opened');
  } else {
    settingsModal.classList.add('hidden');
    console.log('Settings modal closed');
  }
}

async function saveSettings() {
  console.log('Saving settings');
  
  try {
    // Get values from form
    if (autoSaveCheckbox) settings.autoSaveEnabled = autoSaveCheckbox.checked;
    if (autoSaveIntervalInput) settings.autoSaveIntervalSeconds = parseInt(autoSaveIntervalInput.value) || 60;
    if (fontSizeInput) settings.fontSize = parseInt(fontSizeInput.value) || 16;
    
    // Save settings to store
    console.log('Saving settings to store:', settings);
    await window.electronAPI.saveSettings(settings);
    
    // Apply settings
    applySettings();
    
    // Close modal
    if (settingsModal) settingsModal.classList.add('hidden');
    
    updateStatusMessage('Settings saved');
  } catch (error) {
    console.error('Failed to save settings:', error);
    updateStatusMessage('Failed to save settings', true);
  }
}

// Log that we've finished loading
console.log('App.js loaded successfully');