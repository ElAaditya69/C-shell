# C-Shell — Deep Analysis Report

**Analyzed:** 2026-08-15 · **Scope:** full repo (`src/`, `src-tauri/`, docs)
**Stack (actual, from code):** Tauri v2 · React 19.1 · TypeScript · CodeMirror 6 · xterm.js 5 · Rust 2021 · Vite 8
**Unit:** `src/` ≈ 7,188 LOC TypeScript/TSX; `src-tauri/` Rust backend.

---

## Part 1 — What Has Been Built (Feature Inventory)

This is a complete cross-platform C IDE desktop app. Everything below is **verified present in code**, not just claimed in docs.

### A. Core IDE
1. **Built-in PTY terminal** (xterm.js frontend + native `portable-pty` backend). Spawns `$SHELL` on Unix, `cmd.exe` on Windows. Push-based output (reader thread → Tauri event → xterm), live resize, scrollback 5000, `Ctrl+Shift+C/V` copy-paste. *Files: `src/components/terminal/XTermView.tsx`, `src-tauri/src/terminal/pty.rs`.*
2. **GCC/Clang Build & Run** with live timing, colored error/warning output, and a run-finished marker (`__CSHELL_RUN_DONE__`) that flips the app back to idle. *`src-tauri/src/commands/compile.rs`, `src/services/CompileService.ts`.*
3. **Session restore** — remembers open tabs, active file, workspace folder, sidebar width, terminal height. *`src/hooks/useTabs.ts`, SettingsContext.*
4. **Crash recovery** — 30s background autosave, unsaved-changes quit guards, crash backup journal to `localStorage` with restore/discard banner. *`useTabs`, App.tsx.*
5. **External change detection** — reloads files edited outside the IDE on window focus (confirm for dirty files). *`useTabs.ts:72-112`.*
6. **Split editor** — two CodeMirror panes bound to the same tab. *`App.tsx:660-680`.*

### B. Editor (CodeMirror 6)
7. **C/C++ syntax highlighting**, bracket matching, active-line, search & replace.
8. **Symbol navigation** — regex-based parser for functions/structs/typedefs/macros; "Go to Symbol" (`Ctrl+Shift+O`) + breadcrumbs bar. *`Editor.tsx:69-96,332-369`.*
9. **Line bookmarks** (`Ctrl+F2`/`F2`). **Comments** (line `Ctrl+/`, block `Shift+Alt+A`). Move/duplicate lines. Multi-cursor, column selection.
10. **clang-format** integration (`Ctrl+Shift+F`). *`FormatService`, `src-tauri/commands/format.rs`.*
11. **4 theme presets** (Retro, Midnight, Solarized, Light) via CSS design tokens + **custom themes** (duplicate/edit 13 color vars, swatch pickers) + **custom CSS**. *`src/context/themes.ts`, SettingsModal.*
12. **Font customization** (family/size), tab size, hard tabs, word wrap, indent guides (Replit extension).
13. **Auto-clean on save** — trims trailing whitespace, ensures final newline.

### C. Navigation & Productivity
14. **Quick Open** (`Ctrl+P`), **Command Palette** (`Ctrl+Shift+P`, fuzzy, 22+ commands + 4 theme switchers), **Go to Line** (`Ctrl+G`).
15. **Workspace search & replace** across all files (`Ctrl+Shift+F`). *`SearchInFilesModal.tsx`.*
16. **17 built-in C snippets** inserted at cursor. *`SnippetsModal.tsx`.*
17. **Welcome screen** — recent projects/files, shortcut cheat-sheet, 9 built-in example programs. *`WelcomeScreen.tsx`, `data/examples.ts`.*

### D. File Explorer
18. **Lazy-loaded tree**, drag & drop move between dirs. *`useFileExplorer.ts`, `FileTree.tsx`.*
19. **Context menu** — new file/folder, rename, delete, copy path, copy folder path, pin to favorites.
20. **Pinned folders** section, **view options** (hidden files toggle, sort name/type, compact/comfortable), **resizable / left-right sidebar**, extension-based file icons.

### E. Diagnostics / Problems
21. **Error/warning badges**, filter (all/errors/warnings), click-to-jump to exact file:line:col, copy individual/all. *`DiagnosticsPanel.tsx` + `parse_gcc_diagnostics` in Rust.*

### F. Settings & Customization
22. **Global settings** persisted at `~/.c-shell/settings.json` with corruption recovery. *`src-tauri/commands/settings.rs`.*
23. **5-tab settings modal** (Themes / Editor / Terminal / Interface / Backups) with import/export JSON.
24. **Layout controls** — toolbar/status bar visibility, explorer position, terminal position setting.
25. **Zen + Presentation modes**, floating exit pill, window focus regain.

### G. Academic Tools
26. **Code Snapshot** (`Ctrl+Alt+S`) — syntax-highlighted PNG export, 4 themes / 3 window styles / padding, copy or save. *`ScreenshotModal` + `ScreenshotService` + html-to-image.*
27. **Lab Report Generator** (`Ctrl+Alt+R`) — student/course/objectives form, live preview, export HTML/Markdown/PDF (print). *`LabReportModal` + `ReportService`.*

### H. Backend / Ops
28. **16 Tauri commands** across 6 modules (`app`, `compile`, `files`, `format`, `settings`, `terminal`), plus event-based IPC.
29. **Cross-platform branching** — shell, temp dirs, paths, clang-format lookup, binary names all branch for Windows/macOS/Linux.
30. **CI/CD** — GitHub Actions cross-platform matrix (macOS/Windows/Linux) with lint + typecheck. *(`.github/workflows/`)*
31. **Documentation set** — README + 5 docs (`INSTALLATION`, `KEYBOARD_SHORTCUTS`, `SETTINGS`, `PROJECT_FILE`, `TROUBLESHOOTING`).

---

## Part 2 — Correctness Review

### 🔴 Critical (fix first)

**1. Unvalidated arbitrary path commands + no CSP = host-file access.**
`tauri.conf.json:23` sets `"csp": null` (webview unrestricted), and every file command in `files.rs:13-139` (`read_file`, `write_file`, `write_binary_file`, `create_file`, `create_directory`, `rename_path`, `delete_file`, `list_directory`) plus `settings.rs` accepts arbitrary path strings with **zero canonicalization, sandbox root, or allowlist**. A compromised/injected frontend can read/write/delete/rename any host file. *Highest severity, worth fixing regardless.*

**2. Shell injection in the run line.**
`compile.rs:232-250` embeds the user-supplied `filename` base name into a shell command string — `rm -f "{}"` / `del {}` / `pushd "{}"`. A filename containing `"`, backticks, or `$()` (Unix) or `"`/`&` (cmd) escapes into the user's interactive shell. Real edge-injection surface.

**3. Orphaned processes — no kill/timeout.**
The child spawned by the PTY (`pty.rs:43-45`) is **never waited, killed, or reaped**; the reader thread is unjoined. On app quit, no signal is sent to a running shell or program — an infinite-loop C program stays alive after the editor closes. No timeout path exists.

### 🟠 Moderate

**4. Poisoned-mutex `unwrap`s.** `terminal.rs:36,45` and `pty.rs:87,93` call `.unwrap()` on shared mutex locks; a panic mid-lock poisons the mutex and subsequent calls panic.

**5. Diagnostic parser is lossy.** `parse_gcc_diagnostics` (`compile.rs:21-53`) splits on `:` with `splitn(5,':')`, so Windows drive paths or any path containing `:` drop lines; files lose their directory (only `file_name()` stored, ambiguous across dirs); **linker/`collect2` errors (fewer than 5 fields) never surface.**

**6. `Ctrl+Shift+F` double-bound.** App `App.tsx:385` binds `mod+shift+f` → format code, while the Command Palette `search-files` action also claims `Ctrl+Shift+F` → search modal. Same chord, two actions; the keydown handler wins, so search-files is only reachable via palette.

**7. Windows path bugs.** `FileTree.tsx:92` and `useTabs.ts:303` split paths on `"/"` only — Windows backslash paths break rename/drag-drop (other path helpers use dual `/` and `\\` split, inconsistent).

### 🟡 Minor / Doc-drift & dead code

- **`ProjectService.ts` is entirely dead** — per-project `.cshell.json` config is defined (service + types) but **never imported or called anywhere**. README/PROJECT.md tout it as a feature; it's not wired into the frontend.
- **Three inconsistent version strings:** `0.6.0-2` (App titlebar / tauri.conf / package.json), `0.6.0-1` (SettingsModal), `0.2.1` (ReportService footer).
- **Stale docs:** README says "React 18" (actual 19). PROJECT.md claims theme import/export via *clipboard* (actual: file dialog), workspace search "match highlighting" (actual: plain text lines), settings path `~/.c-shell` vs `~/.cshell` naming. "File type icons for .py/.js/..." overstated — only dirs, `.c`, `.h`, Makefile are colored.
- **Bookmarks have no gutter markers** — jump works but no visual indicator in CSS.
- **Dead code:** `XTermView.sendInterrupt` (duplicate of TerminalPanel's) never called; `EditorHandle.getCursorPosition` never called; TerminalPanel `clean()` never called by App.
- **Terminal "right" position setting is dead** — no right-side layout rendering exists despite the setting.
- **`TerminalPanel.ensureStarted` rejection not caught** — pty-start failure surfaces as unhandled promise rejection (`App.tsx:176`).
- **Replace All regex bug:** `SearchInFilesModal` searches case-insensitive substring but replaces with `new RegExp(query,"gi")` with no try/catch — typing a regex metachar (`.`/`(`) breaks or double-compiles during replace.
- **Subtle temp-dir bug:** `useTabs.ts:224` can compute `substring(0,-1)` → empty string → `listDirectory("")` when computing save dir for a dialog-opened file without a folder.
- **`standard_flag` whitelist** is good; but Toolbar initializes standard as `"C99"` while C_STANDARDS includes `GNU99` and backend lowercases input — cosmetic case inconsistency (harmless).
- **Backend compile unverified in sandbox** — deps resolve, but the Tauri Linux target needs system GTK headers (not present in VM; not a code failure). Source passes full manual type/syntax review. **Recommend `cargo check` on macOS host before trusting a build.**

---

## Part 3 — Quick Verdict

**Overall: solid, unusually complete IDE.** 30+ features shipped, clean module separation (services ↔ hooks ↔ components ↔ Rust commands), safe-Rust core (no `unsafe`), command-null-safety handled well in the compiler step (whitelist `-std`, `Command::new` args, temp-file injection-safe). Real test exists for the gcc flag logic.

**Priority order if you fix anything:**
1. Path validation (sandbox to workspace dir) + set a CSP.
2. Fix the run-line shell injection (use typed file path, not shell string).
3. Kill/reap the PTY child on quit + add a run timeout.
4. Fix the `Ctrl+Shift+F` binding conflict.
5. Wire up or remove the dead `ProjectService.ts`.
6. Unify version strings; update stale README/PROJECT.md.
