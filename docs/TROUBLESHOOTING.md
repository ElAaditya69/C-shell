# Troubleshooting Guide

## Build & Compilation Issues

### `gcc: command not found` or `compiler not found`

**Cause**: GCC or Clang is not installed or not in your system PATH.

**Fix by platform**:
- **macOS**: `xcode-select --install` (installs Clang) or `brew install gcc`
- **Linux**: `sudo apt install build-essential` (Ubuntu/Debian) or `sudo dnf install gcc` (Fedora)
- **Windows**: Install [MinGW-w64](https://www.mingw-w64.org/) and add its `bin/` directory to your system PATH

**Verify**: Run `gcc --version` or `clang --version` in your terminal.

---

### Build fails with linker errors

**Cause**: Missing libraries or incorrect library paths.

**Fix**:
1. Check `libraryDirectories` in your `.cshell.json` project file
2. Ensure required system libraries are installed
3. Add `-l` flags (e.g., `-lm` for math) to `compilerFlags` in `.cshell.json`

---

### `clang-format` not working

**Cause**: `clang-format` is not installed.

**Fix**:
- **macOS**: `brew install clang-format`
- **Linux**: `sudo apt install clang-format`
- **Windows**: Install via [LLVM releases](https://releases.llvm.org/) or `choco install llvm`

**Verify**: Run `clang-format --version` in your terminal.

---

## Application Issues

### App won't start or shows a white screen

**Possible causes**: Corrupted settings, missing webview runtime, or build error.

**Fix**:
1. Delete settings file to reset: `rm ~/.c-shell/settings.json`
2. Run `npm run dev` from terminal to see error logs in the console
3. On Windows, ensure [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) is installed

---

### Terminal not working or shows blank

**Cause**: Shell binary not found or PTY spawn failure.

**Fix**:
- **Linux/macOS**: Ensure `$SHELL` environment variable is set correctly (`echo $SHELL`)
- **Windows**: Ensure `cmd.exe` is accessible (it should be by default)
- Check that no antivirus is blocking terminal process spawning

---

### Settings not saving

**Cause**: File permission issue or corrupted settings directory.

**Fix**:
1. Check permissions on `~/.c-shell/` directory
2. Try: Export Settings → delete `settings.json` → Import Settings
3. On Linux: `chmod -R 755 ~/.c-shell/`

---

### Session not restoring (tabs/files missing on restart)

**Cause**: Autosave disabled or localStorage cleared.

**Fix**:
1. Enable **Autosave** in Preferences (`Ctrl + ,`)
2. Ensure you're not clearing webview/browser data between sessions
3. The session is saved to `~/.c-shell/settings.json` — verify it exists and contains `openTabs`

---

### External file changes not detected

**Cause**: The file watcher triggers on window focus.

**Fix**: Click back into the C-Shell window — it checks for external modifications when the window gains focus. If a file was modified externally, you'll be prompted to reload.

---

## Performance Issues

### Editor slow with large files

**Fix**:
1. Disable **Word Wrap** in Preferences for large files
2. Consider splitting large source files into smaller modules
3. Close unused editor tabs to free memory

---

### High memory usage

**Fix**:
1. Close unused tabs (each tab holds the file content in memory)
2. Restart the application periodically for long sessions
3. Avoid opening extremely large project directories (10,000+ files)

---

## Platform-Specific Issues

### macOS: Gatekeeper blocks the application

**Cause**: App is not signed with an Apple Developer certificate.

**Fix**:
```bash
# Option 1: Right-click the app → Open → Click "Open" in the dialog

# Option 2: Remove quarantine attribute
xattr -cr /Applications/C-Shell.app
```

---

### Linux: WebKitGTK errors during build

**Cause**: Missing WebKitGTK development libraries.

**Fix**:
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev

# Fedora
sudo dnf install webkit2gtk4.1-devel gtk3-devel
```

---

### Windows: WebView2 Runtime missing

**Cause**: The Tauri app requires Microsoft Edge WebView2 Runtime.

**Fix**: Download and install from [Microsoft's WebView2 page](https://developer.microsoft.com/en-us/microsoft-edge/webview2/).

---

### Windows: `npm install` fails with node-gyp errors

**Cause**: Missing C++ build tools.

**Fix**: Install [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the **"Desktop development with C++"** workload.

---

## Getting Help

1. Check the documentation in the `docs/` folder
2. Search existing [GitHub Issues](https://github.com/AXLShorts/c-shell/issues)
3. Open a new issue with:
   - Your OS and version
   - Node.js version (`node --version`)
   - Rust version (`rustc --version`)
   - Steps to reproduce the problem
   - Any error messages from the terminal
