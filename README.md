# ⚡ C-SHELL — Modern C Programming IDE

> A lightweight, cross-platform, retro-styled C IDE built for speed, simplicity, and student productivity. Powered by Tauri v2, Rust, React, and CodeMirror.

![C-Shell IDE](https://raw.githubusercontent.com/username/c-shell/main/public/banner.png)

---

## ✨ Features

- 🚀 **Built-in PTY Terminal**: Full interactive shell support (`zsh`, `bash`, or `cmd.exe`) with xterm.js rendering and live resize handling.
- 🔨 **GCC / Clang Integration**: Instant Build & Run with accurate timing, colored warnings/errors, and interactive click-to-jump line navigation.
- 🎨 **Custom Themes & Styling**: Retro, Midnight, Solarized, and Light themes powered by CSS design tokens.
- 📂 **Workspace & Session Restore**: Automatically restores open tabs, active files, recent projects, and layout sizes on startup.
- 🛡️ **Data Safety**: 30s background autosave, crash recovery prompt, external file modification detection, and unsaved changes quit guards.
- 📸 **Code Snapshots (`Ctrl+Alt+S`)**: Export beautiful code snippets with customizable themes for sharing or presentation.
- 📄 **Academic Lab Report Generator (`Ctrl+Alt+R`)**: Create printable HTML/PDF lab reports combining C code, execution results, and student details.
- 🔍 **Command Palette (`Ctrl+Shift+P`) & Quick Open (`Ctrl+P`)**: Navigate files and execute commands instantly.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl + Enter` | ▶ Run Code |
| `Ctrl + S` | 💾 Save File |
| `Ctrl + Shift + F` | ✨ Format Code (`clang-format`) |
| `Ctrl + P` | 🔍 Quick Open File |
| `Ctrl + Shift + P` | ⚡ Command Palette |
| `Ctrl + ,` | ⚙️ Preferences |
| `Ctrl + Alt + S` | 📸 Code Snapshot |
| `Ctrl + Alt + R` | 📄 Generate Lab Report |
| `Ctrl + /` | 💬 Toggle Line Comment |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Rust & Cargo (1.75+)
- GCC or Clang installed in system `PATH`
- `clang-format` (optional, for code formatting)

### Development Setup

```bash
# Clone the repository
git clone https://github.com/your-username/c-shell.git
cd c-shell

# Install dependencies
npm install

# Run application in development mode
npm run dev
```

### Production Build

```bash
# Build desktop application for current platform
npm run build
```

---

## 📄 License
MIT License. Created for students and C programmers everywhere.
