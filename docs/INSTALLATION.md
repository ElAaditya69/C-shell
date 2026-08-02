# Installation Guide

## System Requirements

| Requirement | Minimum Version |
|---|---|
| **Node.js** | v18+ (recommend v20 LTS) |
| **Rust & Cargo** | v1.75+ |
| **GCC or Clang** | Any recent version |
| **clang-format** | Optional, for code formatting |

### Supported Operating Systems
- **macOS** 12 (Monterey) or later
- **Windows** 10 (build 1803) or later
- **Linux** Ubuntu 22.04+ / Fedora 38+ / Arch (recent)

---

## macOS

### 1. Install Xcode Command Line Tools
```bash
xcode-select --install
```

### 2. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustc --version  # verify
```

### 3. Install Node.js
```bash
# Via Homebrew (recommended)
brew install node

# Or download from https://nodejs.org
```

### 4. Install GCC (optional — Xcode CLT includes clang)
```bash
brew install gcc
```

### 5. Install clang-format (optional)
```bash
brew install clang-format
```

### 6. Clone & Run
```bash
git clone https://github.com/AXLShorts/c-shell.git
cd c-shell
npm install
npm run dev
```

---

## Windows

### 1. Install Visual Studio Build Tools
Download [Visual Studio Build Tools 2022](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and install the **"Desktop development with C++"** workload.

### 2. Install Rust
Download and run [rustup-init.exe](https://rustup.rs/) from the official Rust website.

```powershell
rustc --version  # verify
```

### 3. Install Node.js
Download and install from [nodejs.org](https://nodejs.org/) (LTS recommended).

### 4. Install GCC (MinGW-w64)
- Download from [MinGW-w64](https://www.mingw-w64.org/) or install via MSYS2
- Add the `bin/` directory to your system PATH

```powershell
gcc --version  # verify
```

### 5. Clone & Run
```powershell
git clone https://github.com/AXLShorts/c-shell.git
cd c-shell
npm install
npm run dev
```

---

## Linux (Ubuntu / Debian)

### 1. Install System Dependencies
```bash
sudo apt-get update
sudo apt-get install -y \
  build-essential \
  gcc \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf \
  curl \
  wget
```

### 2. Install Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"
rustc --version  # verify
```

### 3. Install Node.js
```bash
# Via nvm (recommended)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20

# Or via package manager
sudo apt-get install -y nodejs npm
```

### 4. Install clang-format (optional)
```bash
sudo apt-get install -y clang-format
```

### 5. Clone & Run
```bash
git clone https://github.com/AXLShorts/c-shell.git
cd c-shell
npm install
npm run dev
```

---

## Linux (Fedora / RHEL)

```bash
sudo dnf install -y gcc gtk3-devel webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel patchelf
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
# Then follow Node.js and Clone & Run steps above
```

---

## Building for Production

### Frontend Only
```bash
npm run build
# Output: dist/
```

### Full Desktop Application
```bash
npm run tauri build
```

Build artifacts are placed in:
```
src-tauri/target/release/bundle/
├── dmg/          # macOS .dmg installer
├── msi/          # Windows .msi installer
├── nsis/         # Windows .exe installer
├── deb/          # Linux .deb package
└── appimage/     # Linux .AppImage portable
```

---

## Troubleshooting Installation

| Problem | Solution |
|---|---|
| `error: could not find system library 'webkit2gtk-4.1'` | Install `libwebkit2gtk-4.1-dev` (Ubuntu) or `webkit2gtk4.1-devel` (Fedora) |
| `rustc` version too old | Run `rustup update stable` |
| `npm install` fails on native modules | Ensure C++ build tools are installed (Xcode CLT / MSVC / build-essential) |
| `gcc: command not found` | Install GCC and ensure it's in your system PATH |
| WebView2 missing (Windows) | Install [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) |
