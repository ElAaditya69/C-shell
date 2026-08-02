# ⚡ C-SHELL — Modern C Programming IDE

> A lightweight, cross-platform, retro-styled C IDE built for speed, simplicity, and student productivity. Powered by **Tauri v2**, **Rust**, **React 18**, and **CodeMirror 6**.

---

## ✨ Features at a Glance

### 🖥️ Core IDE
- **Built-in PTY Terminal** — Full interactive shell (`zsh`, `bash`, `cmd.exe`) with xterm.js rendering and live resize.
- **GCC / Clang Integration** — Instant Build & Run with accurate timing, colored warnings/errors, and click-to-jump diagnostics.
- **Session Restore** — Automatically remembers open tabs, active file, workspace folder, sidebar width, and terminal height.
- **Crash Recovery** — 30-second background autosave, unsaved-changes guards on quit, and automatic crash backup recovery.

### 🎨 Editor & Themes
- **CodeMirror 6 Engine** — Syntax highlighting, bracket matching, current line highlight, search & replace.
- **4 Theme Presets** — Retro (default), Midnight, Solarized, and Light — powered by CSS design tokens.
- **Customizable Fonts** — Editor and terminal font family & size preferences.
- **Smart Editing** — Line comments (`Ctrl+/`), block comments (`Shift+Alt+A`), move/duplicate lines, multi-cursor, bookmarks.
- **Code Formatting** — Integrated `clang-format` support (`Ctrl+Shift+F`).
- **Auto Clean on Save** — Trims trailing whitespace and ensures a final newline.

### 🧭 Navigation & Productivity
- **Quick Open** (`Ctrl+P`) — Fast workspace file switcher.
- **Command Palette** (`Ctrl+Shift+P`) — Search and execute all IDE commands with fuzzy search.
- **Go to Line** (`Ctrl+G`) — Jump to any line number.
- **Go to Symbol** (`Ctrl+Shift+O`) — Navigate functions, structs, and macros.
- **Workspace Search** (`Ctrl+Shift+F`) — Search & replace across all files.
- **Line Bookmarks** (`Ctrl+F2` / `F2`) — Toggle and jump between bookmarks.

### 📂 File Explorer
- **Drag & Drop** — Move files between directories with HTML5 drag-and-drop.
- **Context Menu** — New File, New Folder, Rename, Delete, Copy Path, Copy Containing Folder Path, Pin to Favorites.
- **Sort & Filter** — Sort by name or type, toggle hidden files, compact/comfortable density.
- **File Type Icons** — Visual differentiation for `.c`, `.h`, `.py`, `.js`, `.json`, `.md`, and more.

### ⚠️ Diagnostics Panel
- **Error & Warning Badges** — Real-time count of errors and warnings from compilation.
- **Filter & Group** — Filter by errors only, warnings only, or show all.
- **Click to Navigate** — Click any diagnostic to jump to the exact file, line, and column.
- **Copy Messages** — Copy individual or all diagnostic messages to clipboard.

### 🔧 Build System
- **Rebuild & Clean** — Rebuild workspace and clean build artifacts from Command Palette.
- **Project Config** (`.cshell.json`) — Per-project compiler, flags, include/library directories, and run arguments.
- **Build Notifications** — Real-time status indicators and colored terminal output.
- **Concurrent Build Prevention** — Toolbar buttons disabled during active compilation.

### 🛠️ Academic Tools
- **Code Snapshot** (`Ctrl+Alt+S`) — Export beautiful syntax-highlighted code screenshots.
- **Lab Report Generator** (`Ctrl+Alt+R`) — Generate formatted HTML/PDF lab reports combining code, output, and student details.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | ▶ Run Code |
| `Ctrl + S` | 💾 Save File |
| `Ctrl + N` | 📝 New File |
| `Ctrl + O` | 📁 Open Folder |
| `Ctrl + P` | 🔍 Quick Open |
| `Ctrl + Shift + P` | ⚡ Command Palette |
| `Ctrl + G` | 📍 Go to Line |
| `Ctrl + Shift + O` | 🧭 Go to Symbol |
| `Ctrl + Shift + F` | 🔎 Search in Files |
| `Ctrl + /` | 💬 Toggle Line Comment |
| `Shift + Alt + A` | 💬 Toggle Block Comment |
| `Alt + Up/Down` | ↕️ Move Line Up/Down |
| `Shift + Alt + Down` | 📋 Duplicate Line |
| `Ctrl + F2` | 🔖 Toggle Bookmark |
| `F2` | 🔖 Next Bookmark |
| `Ctrl + ,` | ⚙️ Preferences |
| `Ctrl + Alt + S` | 📸 Code Snapshot |
| `Ctrl + Alt + R` | 📄 Lab Report |
| `Ctrl + Shift + C` | 📋 Terminal Copy |
| `Ctrl + Shift + V` | 📋 Terminal Paste |

> **macOS**: Use `Cmd` instead of `Ctrl`.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ (recommend v20 LTS)
- **Rust & Cargo** v1.75+
- **GCC** or **Clang** installed in system `PATH`
- **clang-format** (optional, for code formatting)

### Supported Platforms
| Platform | Minimum Version |
|---|---|
| macOS | 12 (Monterey)+ |
| Windows | 10 (build 1803)+ |
| Linux | Ubuntu 22.04 / Fedora 38+ |

### Development Setup

```bash
# Clone the repository
git clone https://github.com/AXLShorts/c-shell.git
cd c-shell

# Install dependencies
npm install

# Start in development mode
npm run dev
```

### Production Build

```bash
# Build the Tauri desktop application
npm run tauri build

# Artifacts output to: src-tauri/target/release/bundle/
```

---

## 📂 Project Structure

```
c-shell/
├── src/                        # React frontend
│   ├── components/
│   │   ├── editor/             # CodeMirror editor wrapper
│   │   ├── sidebar/            # File explorer & tree
│   │   ├── terminal/           # Terminal & diagnostics
│   │   ├── toolbar/            # Toolbar & tab bar
│   │   ├── settings/           # Settings modal
│   │   └── common/             # Shared modals (QuickOpen, Search, etc.)
│   ├── context/                # React contexts (Settings, Themes)
│   ├── hooks/                  # Custom hooks (useTabs, useFileExplorer)
│   ├── services/               # Service layer (FileService, CompileService, ProjectService)
│   └── App.tsx                 # Main application shell
├── src-tauri/                  # Rust Tauri backend
│   ├── src/
│   │   ├── commands/           # IPC commands (compile, settings, format, app)
│   │   └── terminal/           # PTY terminal manager
│   └── Cargo.toml
├── docs/                       # Documentation
│   ├── INSTALLATION.md
│   ├── KEYBOARD_SHORTCUTS.md
│   ├── SETTINGS.md
│   ├── PROJECT_FILE.md
│   └── TROUBLESHOOTING.md
├── .github/workflows/          # CI/CD pipelines
├── PROJECT.md                  # Technical specification
└── README.md                   # This file
```

---

## 🛠️ Architecture

- **Frontend**: React 18 + TypeScript + CodeMirror 6 + xterm.js
- **Backend**: Tauri v2 + Rust 2021 edition
- **IPC**: Custom Tauri commands (`compile.rs`, `terminal/`, `settings.rs`, `format.rs`, `app.rs`)
- **Build Tool**: Vite 8
- **CI/CD**: GitHub Actions with cross-platform matrix builds (macOS, Windows, Linux)

---

## 📖 Documentation

| Document | Description |
|---|---|
| [Installation Guide](docs/INSTALLATION.md) | Platform-specific setup instructions |
| [Keyboard Shortcuts](docs/KEYBOARD_SHORTCUTS.md) | Complete shortcut reference |
| [Settings Guide](docs/SETTINGS.md) | All configurable preferences |
| [Project File Reference](docs/PROJECT_FILE.md) | `.cshell.json` schema and examples |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and solutions |

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT License. Created for students and C programmers everywhere.
