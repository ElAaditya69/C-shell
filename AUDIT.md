# C-Shell — Professional Audit Report

**Date:** 2026-08-16 · **Audit of:** v0.6.0-2 (post Phase 0) · **Scope:** code, UX, C-IDE feature parity
**Method:** full read-through of frontend (`src/`) + backend (`src-tauri/`), screenshots, cross-referenced against README / ROADMAP / DEEP_REPORT claims.

**Status of the security baseline (Phase 0) — VERIFIED CLEAN**
Path sandbox in `files.rs` (canonicalize + component-wise prefix + symlink escape + no-workspace rejection, 5 tests), real CSP in `tauri.conf.json`, sanitized run line in `compile.rs` (`safe_temp_basename`, `-std=` single arg, 30 s timeout, linker-error surfacing, 4 tests), PTY cleanup in `pty.rs` (`kill()`, process-group SIGTERM→SIGKILL, reader join on `Exit`). All four are in code and covered by tests. The remaining issues below are new and distinct from Phase 0.

---

## Section A — Visual / UX bugs

| # | Severity | Location | Issue | Why it matters |
|---|----------|----------|-------|----------------|
| V1 | **HIGH** | `TabBar.tsx:44-49` + `App.css:800` `.tab-ghost` | Dragged tab ghost renders at viewport origin, overlapping the toolbar. Ghost is `position:fixed; top:0; left:0` and only `transform: translateX(dx)` is applied — it never receives the tab's real Y offset. Also mismatched metrics (ghost 34px vs tab 30px, ghost 16px padding vs tab 12px). | This is the exact bug the user reported ("tabs arranging thing ... on top of my toolbar"). |
| V2 | MED | `TabBar.tsx` | No pointer-capture cancellation: `lostpointercapture` / `pointercancel` with ghost already created never calls `endDrag()` → stuck ghost + stuck `draggingId`. | Ghost can get "stuck" on screen after e.g. dragging the pointer outside the window and releasing over the OS chrome. |
| V3 | LOW | `XTermView.tsx` | Terminal scrollback (5000 lines) is discarded every time the terminal is hidden (`Ctrl+` closes via `setVisible(false)` → unmount). | Output you were reading is gone; feels broken, not like "collapse". |
| V4 | MED | `Editor.tsx:69-96` | Breadcrumb "current symbol" is hardcoded to `parsed[0]` — it never tracks the cursor, so it shows a wrong/arbitrary symbol while you edit. | The breadcrumb actively misleads navigation. |
| V5 | MED | `useTabs.ts` | Bookmarks are component state: switching tabs unmounts `Editor`, losing all bookmarks. No gutter marker (known debt, now confirmed as data loss). | A navigation feature that doesn't survive a tab switch isn't worth shipping. |

## Section B — Functional bugs

| # | Severity | Location | Issue | Why it matters |
|---|----------|----------|-------|----------------|
| F1 | **HIGH** | `App.tsx:199-208` | Python runner interpolates the workspace file path directly into a shell string: `python3 "${tabToRun.path}"`. A file named `x; rm -rf ~` or containing `"`/backtick executes arbitrary commands. | Same injection class Phase 0 just removed from C runs — now reintroduced on the frontend for .py. Must be fixed to parity (no shell string: pass as argv, or quote+escape). |
| F2 | **HIGH** | `SearchInFilesModal.tsx:80` | Replace All runs `new RegExp(query, "gi")` on the unescaped query. Query `[`, `(`, `*`, `\` throws → replace silently dies, and the UI still reports whatever matched earlier. | Data-corruption-adjacent UX failure on a professional tool. Needs try/catch + escaped literal or a "regex" toggle. |
| F3 | MED | `useTabs.ts:25-40` | Autosave sets `savedCode` from the *closure* `tab.code` captured at effect re-run (last render), not from the bytes just written. If you type and autosave fires, `savedCode` can be reset to a stale 30 s-old value → next autosave resurrects old content over newer edits. | Silent data loss in the feature meant to prevent data loss. |
| F4 | MED | `useTabs.ts:114-118` + quit flow | Untitled (never-saved) tabs are clean (`code === savedCode`), so quitting with a new unsaved file never prompts and silently drops it. `beforeunload` and the `quit-requested` handler both miss it. | Real "I wrote code in a new file, closed the app, it's gone" loss. |
| F5 | MED | `useTabs.ts:46-69` | Crash backup is unbounded plaintext in `localStorage` (a 5 MB dirty file breaks `setItem` with a QuotaExceeded that's uncaught) and is restored without trimming or line-ending normalization, and with tab `id = file path` colliding with real open-file ids. | Backup is load-bearing but fragile; the restore path can produce duplicate/corrupt tabs. |
| F6 | MED | `useFileExplorer.ts` / `FileTree.tsx` | Moving/creating/renaming paths concatenated with `/` between `dirName(path)` and a name (e.g. `createFolder`), and `dirName("C:\\dir\\")` now returns `C:\dir` after the trailing-slash collapse — but bare-root/Windows-drive edge cases still produce `""` parents. Explorer "right" position (`order: 3`) doesn't update the FileTree drag handle side fully. | Windows path correctness is claimed but not airtight; the "right explorer" layout has a visible glitch. |
| F7 | LOW | `SettingsContext.tsx` | `userCss` is injected as raw `<style>` text (self-XSS); `~/.c-shell/settings.json` stores recent paths in plaintext (minor). | Low severity but worth a hardening note. |
| F8 | LOW | `XTermView.tsx:93-103` | Ctrl+Shift+V reads clipboard and `sendCommand`s it raw — paste of a `;`-containing string is fine through the pty, but terminal paste isn't rate-limited and multi-KB pastes wedge the pty writer lock. | Professional terminal hygiene. |

## Section C — Missing C-IDE features (parity gaps)

These are what make C-Shell feel like a toy rather than an IDE. Priorities from the C developer's POV:

| # | Priority | Feature | Current state | Why it matters |
|---|----------|---------|---------------|----------------|
| C1 | **P0** | **Run configuration** | None — one gcc command, no args, no env, no working dir, no stdin file. | C programs take `argv`, read `stdin`, link libs. Without this, *real* C projects can't be run at all. |
| C2 | **P0** | **Multi-file project support** | Compiles a single `.c` with `-std -Wall`. `#include "other.c"` is the only multi-file story. | A real C project is many files + headers + libs. Without it, the IDE is a single-file playground. |
| C3 | **P1** | **Debugger** | None. | Breakpoints/step/watch is the core of "C IDE". This is the #1 missing differentiator. |
| C4 | **P1** | **Symbol outline panel** | Regex "Go to Symbol" in one file only (single-line sigs; misses `static int`, `char *`, multi-line). | Navigation that an IDE must have. |
| C5 | **P1** | **Problems panel from editor (diagnostics while typing)** | Only populated from the last gcc run. No inline squiggles. | "Problems" that only appear after you hit Run are a compile tool, not an IDE. |
| C6 | **P2** | **Refactoring** | None. | Rename-symbol, extract-function are expected. |
| C7 | **P2** | **Find references / go to definition** | Regex only. | Same. |
| C8 | **P2** | **CMake / Make integration** | None. | The de-facto C build systems are untouched. |
| C9 | **P3** | **Multi-cursor** | CodeMirror supports it but it's not wired (no `Mod-Alt-` arrows / `Alt-click` bindings). | Cheap win — CM has it built-in. |
| C10 | **P3** | **Integral file nesting / .h↔.c toggle** | None. | Big usability win, small effort. |
| C11 | **P3** | **Live unit-test runner** | None. | C-testing (minunit/criterion) is a common workflow. |
| C12 | **P3** | **Source control** | None (no git UI/status). | Most users will bounce to VS Code for git anyway. |

## Section D — Polish / correctness nits

1. `ProjectService.ts` is dead (config claimed in README, never wired — ROADMAP debt, confirmed).
2. Version strings differ in 3 places (`0.6.0-2` / `0.6.0-1` / `0.2.1`).
3. `Editor.tsx` `settings.tabSize` edits don't recompute `indentGuidesExtension`'s stride (memo deps) — guides desync after a tab-size change.
4. Toolbar "Tools ▾" dropdown uses `context-menu-backdrop` which may not match the menu's stacking context; focus doesn't close it.
5. `App.tsx` `quit-requested` handler: `window.confirm` inside a Tauri event can't prevent exit if the frontend is gone — the Rust `prevent_exit` + re-emit is the right pattern, but the frontend path only works while the webview is alive.
6. `ReportService` / `ScreenshotService` not audited in depth this pass (likely fine).
7. The app only ever searches the *currently loaded* folder's file list for search-in-files (not recursive-disk); hidden files excluded from search silently.
8. `keyboard-shortcuts` doc and Command Palette shortcuts disagree on `Ctrl+Shift+F` (already re-mapped in code, docs may lag).

## Section E — "Make it professional" recommendations (cheap, high-signal)

1. **E1 · Empty states everywhere** — no-folder, no-files, no-diagnostics: all have polished empty states already. Add one for "no open tabs" in the split view.
2. **E2 · Status-bar polish** — show `main.c` vs full path toggle, add a small "saved ✓ / modified ●" indicator, show compiler name+version once (`gcc --version` line 1) — instant professional feel.
3. **E3 · Command Palette categories** — already present; add a fuzzy filter score display so it feels like VS Code's.
4. **E4 · Theme parity** — the editor theme is derived from CSS vars; the terminal theme is only bg/fg (not full ANSI palette). Sync the ANSI 16 from the theme.
5. **E5 · First-run experience** — a 1-screen "Welcome tour" with 3 examples, a "Learn C" link, and a "Set default compiler" step would convert the Welcome screen into onboarding.
6. **E6 · Release hygiene** — bump version to 0.7.0, set `#![forbid(unsafe_code)]`-style crate hygiene, run `cargo clippy` + `npm run build` in CI, add a smoke test.

---

## Suggested fix order

1. **Security parity (F1, F2)** — 1 work-slice.
2. **Ghost tab (V1)** — the reported visual bug — 1 slice (set transform from `getBoundingClientRect()`).
3. **Data-safety (F3, F4, F5)** — autosave closure, untitled-on-quit, crash backup hardening — 1 slice.
4. **C-IDE core (C1, C2)** — run config + multi-file — 2 slices.
5. **Navigation (V5, C4, C3-lite)** — persistent bookmarks, real outline, gdb stepping — 2 slices.
6. **Everything else** — V2, V3, F6, F7, F8, E2, E4 — polish pass.

Sprint 4 (Learning Mode) stays deferred until the above is shipped — it builds on C3/C4 anyway.
