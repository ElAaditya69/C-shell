# Project File Reference (`.cshell.json`)

## Overview

C-Shell uses a `.cshell.json` file in the root of your project directory to store per-project build and run configuration. This file is automatically loaded when you open a folder and can be edited manually or through the IDE.

---

## File Location

Place `.cshell.json` in the root of your project folder:

```
my-project/
├── .cshell.json       ← project configuration
├── main.c
├── utils.c
├── utils.h
└── include/
    └── helpers.h
```

---

## Full Schema

```json
{
  "name": "My C Project",
  "compiler": "gcc",
  "buildConfig": "debug",
  "compilerFlags": ["-Wall", "-Wextra"],
  "includeDirectories": ["./include", "/usr/local/include"],
  "libraryDirectories": ["./lib"],
  "runArguments": ["--verbose", "input.txt"]
}
```

---

## Field Reference

| Field | Type | Default | Description |
|---|---|---|---|
| `name` | `string` | `"C-Shell Project"` | Display name of the project |
| `compiler` | `"gcc"` \| `"clang"` | `"gcc"` | Which compiler to invoke |
| `buildConfig` | `"debug"` \| `"release"` | `"debug"` | Debug includes `-g`; Release includes `-O2` |
| `compilerFlags` | `string[]` | `["-Wall", "-Wextra"]` | Additional flags passed to the compiler |
| `includeDirectories` | `string[]` | `[]` | Extra `-I` include search paths |
| `libraryDirectories` | `string[]` | `[]` | Extra `-L` library search paths |
| `runArguments` | `string[]` | `[]` | CLI arguments passed to the executable at runtime |

---

## Examples

### Minimal Configuration
```json
{
  "name": "Hello World"
}
```
All other fields use defaults (`gcc`, `debug`, `-Wall -Wextra`).

### Debug Build with Address Sanitizer
```json
{
  "name": "Memory Debug Project",
  "compiler": "gcc",
  "buildConfig": "debug",
  "compilerFlags": ["-Wall", "-Wextra", "-fsanitize=address", "-g"],
  "runArguments": []
}
```

### Release Build with Optimizations
```json
{
  "name": "Production Build",
  "compiler": "clang",
  "buildConfig": "release",
  "compilerFlags": ["-Wall", "-O3", "-march=native", "-flto"],
  "includeDirectories": ["./include"],
  "libraryDirectories": ["./lib"],
  "runArguments": ["--config", "prod.cfg"]
}
```

### Multi-File Project with Libraries
```json
{
  "name": "Graphics Demo",
  "compiler": "gcc",
  "buildConfig": "debug",
  "compilerFlags": ["-Wall", "-Wextra", "-lm", "-lSDL2"],
  "includeDirectories": ["/usr/include/SDL2"],
  "libraryDirectories": ["/usr/lib/x86_64-linux-gnu"],
  "runArguments": ["--fullscreen"]
}
```

---

## How It Works

1. When you open a folder in C-Shell, the IDE looks for `.cshell.json` in the root.
2. If found, its settings override the global defaults for that project.
3. If not found, global defaults are used (GCC, debug mode, `-Wall -Wextra`).
4. You can create or edit `.cshell.json` manually — changes are picked up on the next build.

---

## Notes

- Relative paths in `includeDirectories` and `libraryDirectories` are resolved relative to the project root.
- The `runArguments` array is passed as-is to the compiled executable — use it for CLI flags, input files, etc.
- Invalid or malformed `.cshell.json` files are safely ignored; the IDE falls back to defaults.
