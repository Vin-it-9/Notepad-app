# NextExt

<div align="center">

![NextExt Logo](https://img.shields.io/badge/NextExt-Enhanced%20Notepad-1f6feb?style=for-the-badge&logo=electron&logoColor=white)

[![Built with Electron](https://img.shields.io/badge/Built%20with-Electron-47848F.svg?style=flat-square)](https://www.electronjs.org/)
[![Styled with TailwindCSS](https://img.shields.io/badge/Styled%20with-TailwindCSS-38B2AC.svg?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![GitHub Dark Mode](https://img.shields.io/badge/Theme-GitHub%20Dark-0D1117.svg?style=flat-square&logo=github&logoColor=white)](https://github.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

*A modern, feature-rich text editor with GitHub-inspired dark mode UI*

[Features](#features) • [Installation](#installation) • [Usage](#usage) • [Development](#development) • [Building](#building)

</div>

## 📝 Overview

NextExt is an enhanced notepad application built with Electron and styled with TailwindCSS. It features a clean, GitHub-inspired dark mode interface with multi-tab editing, a file explorer sidebar, and automatic saving functionality.


## ✨ Features

- **GitHub Dark Mode UI**: Clean, modern interface inspired by GitHub's dark theme
- **Multi-tab Editing**: Work with multiple files simultaneously in tabs
- **File Explorer**: Built-in sidebar for browsing and managing your files
- **Auto-save**: Automatically saves files when using keyboard shortcuts
- **Modern UI Elements**: Smooth animations, custom scrollbars, and intuitive design

## 🚀 Installation

### Windows

1. Download the latest `.exe` installer from [Releases](https://github.com/Vin-it-9/nextext/releases)
2. Run the installer and follow the on-screen instructions
3. Launch NextExt from the Start Menu or desktop shortcut


## 📁 Project Structure

```
notepad-app/
├── build/                  # Build and packaging assets
│   └── icons/              # Application icons for different platforms
├── src/
│   ├── main.js             # Main Electron process
│   ├── preload.js          # Preload script for secure context bridge
│   └── renderer/           # Renderer process files 
│       ├── app.js          # Application logic
│       ├── index.html      # Main HTML interface
│       ├── input.css       # TailwindCSS input
│       └── output.css      # Generated CSS output
├── package.json            # Project configuration and dependencies
└── README.md               # Project documentation
```

## 🖥️ Usage

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + N` | New file |
| `Ctrl + O` | Open file |
| `Ctrl + S` | Save file (without dialog if already saved) |
| `Ctrl + Shift + S` | Save As |
| `Ctrl + W` | Close current tab |
| `Ctrl + Tab` | Switch between tabs |

### Features Walkthrough

1. **File Management**
   - Use the sidebar file explorer to browse saved files
   - Click on files to open them in the editor
   - Use the save button or `Ctrl+S` to save changes
   - Create new files with the New button or `Ctrl+N`

2. **Tabs**
   - Work with multiple files at once
   - Click tabs to switch between files
   - Close tabs with the X button or `Ctrl+W`

3. **Editor**
   - Edit the title and content with real-time changes
   - Modified files are marked with a dot in the tab

## 💻 Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v14 or newer)
- npm or yarn

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/nextext.git
   cd nextext
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm start
   ```

### Environment Configuration

- Development mode includes hot-reload for CSS changes
- Logs are printed to the console for debugging
- DevTools can be opened with `Ctrl+Shift+I`

## 🏗️ Building

To build distributable packages:

```bash
# Build for current platform
npm run build

# Build for specific platforms
npm run build-win    # Windows
npm run build-mac    # macOS
npm run build-linux  # Linux
```

Build outputs will be placed in the `dist` directory.

### Icon Generation

Custom icons for the application can be placed in the `build/icons` directory:

- `icon.ico` - Windows icon
- `icon.icns` - macOS icon
- `icon.png` - Linux icon (512x512px)

<div align="center">
  <sub>Built with ❤️ by <a href="https://github.com/Vin-it-9">Vinit</a></sub>
</div>
