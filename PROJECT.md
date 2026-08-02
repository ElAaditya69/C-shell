# C-Shell — Technical Specification & Project Status

## Mission
Build the ultimate lightweight, high-performance, cross-platform C IDE designed for students, educators, and C developers.

## Current Version
**v0.3.0 (Sprint 3.5 Complete — Stability, Polish & Reliability)**

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
- **Interactive Diagnostics**: Structured GCC error/warning parser emits diagnostic events. Interactive **Problems** tab lets users click any diagnostic to jump straight to the line and column in the editor.

### 3. Modern Code Editor
- **CodeMirror 6 Engine**: Syntax highlighting, current line highlight, bracket matching, search & replace (`Ctrl+F`/`Ctrl+H`), and Go-To-Line (`Ctrl+G`).
- **Formatting & Customization**: Integrated `clang-format` engine (`Ctrl+Shift+F`), configurable Tab Size (2-8 spaces), Word Wrap toggle, Font Size slider, and 4 Theme Presets (Retro, Midnight, Solarized, Light).
- **Auto Clean on Save**: Automatically trims trailing whitespace and ensures a final trailing newline when saving.

### 4. Productivity & Academic Tools
- **Command Palette (`Ctrl+Shift+P`)**: Search and execute all IDE commands with fuzzy search.
- **Quick Open (`Ctrl+P`)**: Fast workspace file switcher.
- **Code Snapshot (`Ctrl+Alt+S`)**: Export beautiful, syntax-highlighted code screenshots with custom themes and padding.
- **Academic Lab Report Generator (`Ctrl+Alt+R`)**: Convert C source code and execution terminal output into formatted PDF or HTML lab reports.
- **Rich Welcome Screen**: Startup dashboard featuring recent projects, quick action buttons, and keyboard shortcut reference.

---

## 🛠️ Architecture & Tech Stack

- **Frontend**: React 18, TypeScript, CodeMirror 6, xterm.js, HTML5/CSS3 with full CSS variables theme engine.
- **Backend**: Tauri v2, Rust 2021 edition.
- **IPC & Events**: Custom Tauri commands (`compile.rs`, `terminal/`, `settings.rs`, `format.rs`, `app.rs`).
- **Build System**: Vite 8.

---

## 📅 Roadmap & Next Phase

- **Sprint 4 (Next)**: Learning Mode (Step-by-step memory/pointer visualization, AST analysis, beginner-friendly compiler explanation helper).
