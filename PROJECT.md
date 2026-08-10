# C-Shell — Technical Specification & Project Status

## Mission
Build the ultimate lightweight, high-performance, cross-platform C IDE designed for students, educators, and C developers.

## Current Version
**v0.6.0-beta (Release — Full Feature IDE)**

---

## ⚡ Key Features

### 1. Core IDE & Stability
- **Cross-Platform**: Zero hardcoded paths; native home/desktop directory resolution on macOS, Windows, and Linux.
- **PTY Terminal**: Built-in interactive xterm.js terminal powered by native PTY (`portable-pty` in Rust). Spawns `$SHELL` on Unix and `cmd.exe` on Windows.
- **Session Restoration**: Automatically remembers open files, active tab, workspace folder, sidebar width, and terminal height across app restarts.
- **Data Safety & Crash Recovery**: 30-second background autosave, unsaved changes confirmation prompts on close/quit, and automatic crash backup recovery.
- **External Change Detection**: Detects file changes made outside the IDE when the window gains focus and prompts to reload.

### 2. Intelligent C Compiler Integration
- **GCC / Clang Engine**: Integrated Build & Run flow with colored terminal output and live compilation timing.
- **Interactive Diagnostics**: Structured GCC error/warning parser with error/warning count badges, filtering, and click-to-jump navigation.
- **Project Configuration**: Per-project `.cshell.json` files for custom compiler, flags, include/library directories, and run arguments.
- **Build Actions**: Rebuild, Clean, and Cancel Build from Command Palette. Concurrent build prevention.

### 3. Modern Code Editor
- **CodeMirror 6 Engine**: Syntax highlighting, current line highlight, bracket matching, search & replace, multi-cursor, column selection.
- **Formatting & Customization**: Integrated `clang-format` engine, configurable Tab Size, Hard Tabs, Word Wrap, Font Size, Font Family, and 4 Theme Presets.
- **Smart Editing**: Line comments, block comments, move/duplicate lines, line bookmarks with jump navigation.
- **Auto Clean on Save**: Automatically trims trailing whitespace and ensures a final trailing newline.
- **Breadcrumbs & Symbol Navigation**: Visual breadcrumbs bar and Go to Symbol modal for functions, structs, and macros.

### 4. Navigation & Productivity
- **Command Palette (`Ctrl+Shift+P`)**: Search and execute all IDE commands with fuzzy search.
- **Quick Open (`Ctrl+P`)**: Fast workspace file switcher.
- **Go to Line (`Ctrl+G`)** and **Go to Symbol (`Ctrl+Shift+O`)**.
- **Workspace Search & Replace (`Ctrl+Shift+F`)**: Search across all files with match highlighting and batch replace.
- **Line Bookmarks (`Ctrl+F2` / `F2`)**: Toggle and jump between bookmarked lines.

### 5. File Explorer
- **Drag & Drop**: HTML5 drag-and-drop file movement between directories.
- **Context Menu**: New File, New Folder, Rename, Delete, Copy Path, Copy Containing Folder Path, Pin to Favorites.
- **Sort & Filter**: Sort by name/type, toggle hidden files, compact/comfortable density mode.
- **File Type Icons**: Visual differentiation for `.c`, `.h`, `.py`, `.js`, `.json`, `.md`, and more.

### 6. Diagnostics / Problems Panel
- **Error & Warning Count Badges**: Real-time error and warning counts displayed as colored badges.
- **Filter & Group**: Filter by errors only, warnings only, or show all.
- **Click to Navigate**: Click any diagnostic to jump to exact file, line, and column in the editor.
- **Copy Messages**: Copy individual or all diagnostic messages to clipboard.

### 7. Customization Engine
- **Global Settings**: Persisted at `~/.c-shell/settings.json` with automatic recovery from corruption.
- **Workspace Settings**: Per-project `.cshell.json` configuration files.
- **Theme Import/Export**: Export settings JSON to clipboard and import from clipboard.
- **Layout Controls**: Toggle toolbar, status bar; configure explorer and terminal positions.

### 8. Academic Tools
- **Code Snapshot (`Ctrl+Alt+S`)**: Export beautiful, syntax-highlighted code screenshots with custom themes and padding.
- **Academic Lab Report Generator (`Ctrl+Alt+R`)**: Convert C source code and execution output into formatted PDF/HTML lab reports.
- **Rich Welcome Screen**: Startup dashboard with recent projects, quick action buttons, and keyboard shortcut reference.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, TypeScript, CodeMirror 6, xterm.js, HTML5/CSS3 with full CSS variables theme engine.
- **Backend**: Tauri v2, Rust 2021 edition.
- **IPC & Events**: Custom Tauri commands (`compile.rs`, `terminal/`, `settings.rs`, `format.rs`, `app.rs`).
- **Build System**: Vite 8.
- **CI/CD**: GitHub Actions cross-platform matrix (macOS, Windows, Linux) with lint + typecheck pipeline.

---

## 📖 Documentation

| Document | Description |
|---|---|
| [README.md](README.md) | Project overview and quick start |
| [docs/INSTALLATION.md](docs/INSTALLATION.md) | Platform-specific installation guide |
| [docs/KEYBOARD_SHORTCUTS.md](docs/KEYBOARD_SHORTCUTS.md) | Complete keyboard shortcut reference |
| [docs/SETTINGS.md](docs/SETTINGS.md) | All configurable preferences |
| [docs/PROJECT_FILE.md](docs/PROJECT_FILE.md) | `.cshell.json` schema and examples |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common issues and solutions |

---

## 📅 Roadmap & Next Phase

- **Sprint 4 (Next)**: Learning Mode (Step-by-step memory/pointer visualization, AST analysis, beginner-friendly compiler explanation helper).
