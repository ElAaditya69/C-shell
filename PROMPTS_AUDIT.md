# C-Shell — Audit Fix Prompts (from AUDIT.md, 2026-08-16)

Paste in order. **Run from `~/Desktop/c-shell/c-shell`.** Check the exit criteria after each before moving on. Scope is per prompt — don't let Claude Code "also clean up other things".

---

## BATCH 1 — Security parity (fix first)

### Prompt 1 — Python runner shell injection (F1)
```
c-shell: Remove the shell-injection in the Python runner.

In src/App.tsx runCode(), ~line 203:
  FileService.sendCommand(`python3 "${tabToRun.path}"\n`);
interpolates the workspace file path (which the user can name anything,
e.g. `x; rm -rf ~` or containing `"` or backticks) directly into a shell
string. That is the same injection class Phase 0 removed from C runs.

Fix: never build a shell string from the path. Options:
1. If the pty's shell is sh/bash/zsh, escape properly — but better:
2. Use the built binary approach: add a backend command that runs
   python with the file path as an argv, OR
3. As a minimal frontend fix: reject any path containing characters
   outside [A-Za-z0-9 _/.-] before running, and alert the user.

Recommended: backend command run_python(file_path) that uses
Command::new("python3").arg(&file_path) — no shell involved.
Keep the terminal-output event + focus behavior identical.
Run cargo check + npm run build. Add a unit test if you add a backend path.
```

### Prompt 2 — Unescaped RegExp in Replace All (F2)
```
c-shell: Fix Replace-All crashing on regex metacharacters.

In src/components/common/SearchInFilesModal.tsx handleReplaceAll(), ~line 80:
  const regex = new RegExp(query, "gi");
A query like `[` `(` `.` `*` `\` throws SyntaxError → replace silently dies.

Fix:
1. Wrap in try/catch; on error surface a friendly message
   ("Query can't be used for replacement — it contains regex characters").
2. Better: replace with a literal string match (String.split/join or
   indexOf loop) so Replace All always works for plain text, and add an
   opt-in "Regular expression" checkbox for power users (then keep the
   try/catch).
Run npm run build. Test: query "(x)" with both checkbox states.
```

---

## BATCH 2 — The reported visual bug

### Prompt 3 — Dragged tab ghost overlaps toolbar (V1)
```
c-shell: Fix the drag-tab ghost rendering on top of the toolbar.

Bug: when dragging a tab, the ghost clone is appended to <body> with class
.tab-ghost which is position:fixed; top:0; left:0, and the drag code only
sets style.transform = translate(dx, 0). So the ghost renders at the
viewport origin — over the toolbar (titlebar+toolbar are ~58px tall) —
instead of aligned with the tab bar.

Fix in src/components/editor/TabBar.tsx + src/App.css:
1. On pointerdown, capture the source tab's getBoundingClientRect() and
   set the ghost's inline top/left to that rect (not 0,0), then
   transform = translate(dx, 0) as now.
2. Match the ghost metrics to real tabs: .tab-ghost height 30px, padding
   0 12px, plus border-radius, border-top accent style consistent with
   .tab.active.
3. Add lostpointercapture handling: if the pointer is lost (dragged out
   of window, OS intercepts), end the drag and remove the ghost.
4. Clean up: also handle pointercancel → endDrag (may already exist).

Verify visually: drag a tab — the ghost should stay inside the tab bar row
at the same Y as the tabs, with a drop shadow, never over the toolbar.
```

---

## BATCH 3 — Data safety

### Prompt 4 — Autosave stale-closure bug (F3)
```
c-shell: Fix autosave restoring stale code over newer edits.

In src/hooks/useTabs.ts the autosave effect (~line 25):
  tabs.forEach(async (tab) => {
    await FileService.writeFile(tab.path, tab.code);
    setTabs(prev => prev.map(t => t.id===tab.id ? {...t, savedCode: tab.code} : t));
  });
`tab.code` here is the closure value from when the effect last ran (a
stale render), NOT the content just written. If autosave fires while the
user is typing, savedCode can be reset to an older snapshot, and the next
autosave then treats the newer edits as unsaved-against-stale → resurrects
old bytes.

Fix: inside the setTabs updater, read the CURRENT code from `prev`
(the freshest state) and use that as savedCode after the write:
  const current = prev.find(t => t.id===tab.id)?.code ?? tab.code;
  await writeFile(tab.path, current); // write the fresh value
  setTabs(prev => ...savedCode: current...)
Also clear the crash backup entry for a cleanly autosaved tab.
Run npm run build.
```

### Prompt 5 — Untitled tabs silently lost on quit (F4)
```
c-shell: Don't drop never-saved tabs on quit.

A new Untitled file has code === savedCode, so both beforeunload
(App.tsx) and the quit-requested handler skip the unsaved-changes
prompt. Closing the app with a new unsaved file loses it silently.

Fix: treat a tab as dirty if EITHER code!==savedCode OR path===null
(untitled). In App.tsx useTabs is the source of truth; add a helper
hasUnsavedWork() covering both, and use it in both handlers. Also make
Ctrl+W (close tab) prompt for untitled tabs.
Run npm run build.
```

### Prompt 6 — Crash backup hardening (F5)
```
c-shell: Make crash recovery safe for large/binary content.

Problems in src/hooks/useTabs.ts:
- localStorage "c_shell_crash_backup" stores dirty tab CODE unbounded;
  a 5MB quota write throws (uncaught setItem) killing the app.
- Tabs are restored raw (no trim/line-ending normalization) and their id
  is the file path — collides with real open tabs.
- Deleting a file/folder doesn't clear the backup.

Fix:
1. Truncate each tab's code in the backup to e.g. 64KB (+ a flag that it
   was truncated) so setItem can't blow the quota; wrap in try/catch.
2. On restore, re-append ".c" if missing / normalize line endings, and
   rebase ids to a unique scheme (e.g. "backup-1") so they can't clash
   with real file-path ids.
3. After a successful save of a tab, remove that tab from the backup.
4. Export/import path for the backup (JSON) so users can recover it even
   if the app won't reopen.
Run npm run build.
```

---

## BATCH 4 — C-IDE core (the differentiators)

### Prompt 7 — Run configuration (C1)
```
c-shell: Add per-run configuration: program args, stdin, working dir.

Currently compile_and_run runs the binary with no argv, no stdin source,
and cwd = the temp dir. Real C programs need arguments and input.

Add a RunConfig:{ args: string[], stdinFile?: string, cwd?: string } —
UI: a small modal + toolbar dropdown (or in Settings) with fields for
Program arguments, Redirect stdin from file, Working directory.
Backend compile.rs compile_and_run: write args to a response file or pass
them on the run line with safe escaping (args are user-specified — escape
or use response-file to avoid shell issues), and pass stdinFile via < file
(or let the terminal user type). Preserve the __CSHELL_RUN_DONE__ marker
and the 30s timeout + Ctrl-C watchdog. Wire the C launch config to the
same temp-basename sanitizer already in place.
Run cargo check + cargo test.
```

### Prompt 8 — Multi-file project build (C2)
```
c-shell: Compile the whole workspace folder as one translation unit set.

Currently build/run compiles a single .c. For a real project, a folder
holds main.c + utils.c + utils.h and the compile command should be
  gcc main.c utils.c ... -I<folder> -std=c99 -Wall -o program

Fix in compile.rs build():
- Detect the workspace root of the file being run (the frontend knows it —
  pass workspaceDir into compile_and_run/build_only from App.tsx).
  safe_temp_basename's allowlist), exclude the temp dir, pass them all to
  gcc, with -I<workspaceDir>. Keep the single-file path when no folder.

Frontend: pass currentDir from useFileExplorer into CompileService calls.
Run cargo check + cargo test. Verify a 2-file hello project runs.
```

---

## BATCH 5 — Navigation & polish

### Prompt 9 — Persistent bookmarks + gutter markers (V5)
```
c-shell: Bookmarks must survive tab switches and be visible.

Currently bookmarks are per-Editor-mount useState in Editor.tsx; switching
tabs unmounts the editor and bookmarks vanish, and there's no gutter
marker.

Fix:
1. Hoist bookmarks to a context/hook keyed by file path (e.g.
   useBookmarks stored per-path in memory, persisted in settings).
2. Draw a marker in the CodeMirror gutter (a gutter extension with a
   bookmark dot) for bookmarked lines.
3. Keep Ctrl+F2 toggle / F2 next.
Run npm run build.
```

### Prompt 10 — Real symbol outline (C4-lite)
```
c-shell: Replace the single-line regex symbol parser with a robust one.

Editor.tsx parses symbols per-line and misses static, pointers,
multi-line signatures, function prototypes vs definitions, and structs.

Fix: use the already-available @lezer parser (CodeMirror) — walk the
syntax tree for FunctionDeclaration / StructDeclaration nodes (lang-cpp)
so definitions, pointers, and multi-line signatures work, and report
kinds: function/struct/macro/enum/typedef. Keep the symbols modal, and
also render a simple dropdown outline in the breadcrumb bar.
Run npm run build.
```

### Prompt 11 — Stop button parity + terminal scrollback persistence (V3)
```
c-shell: Don't discard terminal scrollback when the panel collapses.

XTermView unmounts when visible=false (Ctrl+` collapse), losing 5000
lines of scrollback.

Fix: keep XTermView mounted always; toggle only via CSS display/height
(like the split/zen modes do). The terminal keeps running + keeps its
buffer. Update TerminalPanel so hiding sets a "collapsed" class that
sets height:0 / visibility instead of unmounting.
Run npm run build.
```

---

## Order & gates

| Step | Prompt | Gate |
|---|---|---|
| 1 | 1 — python injection | npm run build + cargo check |
| 2 | 2 — regex replace | npm run build, test `(x)` |
| 3 | 3 — ghost tab | visual: drag tab, ghost in tab row |
| 4 | 4 — autosave staleness | cargo-less, npm run build |
| 5 | 5 — untitled quit prompt | npm run build |
| 6 | 6 — crash backup | npm run build, restore test |
| 7 | 7 — run config | cargo test |
| 8 | 8 — multi-file build | cargo test, 2-file project |
| 9 | 9 — bookmarks | npm run build |
| 10 | 10 — symbol outline | npm run build |
| 11 | 11 — scrollback | visual: collapse/expand keeps output |

After all 11, update AUDIT.md checkboxes. Sprint 4 (Learning Mode) stays deferred.

---

# BATCH 6 — Post-audit "opens broken" repair (2026-08-16)

After Batches 1–5 shipped, the app opened visually broken. Diagnosis (from
code, not screenshots): no crash is possible — `tsc --noEmit` passes and every
diff in the batch is intentional. The breakage comes from one of three places,
fixed below in order. **After ALL of Batch 6 passes, commit.** Quote the
"Final: commit" section verbatim last.

### Prompt 12 — Fresh install/build (do this first — most likely cause)
```
c-shell: The app may be running a stale bundle, making it look broken.
Do NOT change code yet. In this order:
1. rm -rf node_modules, then npm install (so the lockfile +
   @replit/codemirror-indentation-markers and every other dep are
   definitely materialized).
2. npm run build  (must be EXIT 0, no errors, no warnings).
3. src-tauri: cargo check (EXIT 0).
4. npm run tauri dev — confirm the app still opens to the Welcome screen
   with the toolbar, tab bar, terminal, and status bar stacked correctly.
Report only. No code changes.
```
Gate: steps 1–4 each exit 0 and the app opens normally. If the app STILL
looks broken after this with a fresh bundle, say so and proceed to Prompt 13.

### Prompt 13 — Default C standard falls back to C89 (new-folder builds can fail)
```
c-shell: Fix the C Standard <select> default state.

Toolbar standard-select: value={standard} initialized to "C99", while
App.tsx <Toolbar onStandardChange={(s) => setCStandard(s.toLowerCase())}
does the wiring — so when the user pastes an old settings.json (or never
touches the select), cStandard stays "c89" and a Run in a temp dir that
can't find stdio.h fails, which makes the app look broken.

Fix: initialize App.tsx's cStandard state from settings.cStandard (default
"c99"), and on mount, if that stored value isn't in C_STANDARDS lowercased,
reset it. Keep the <select> value as a mirror of the ACTIVE cStandard
(i.e. lift the standard state into App.tsx and pass value + onChange down
to Toolbar), so the select can never show one value while the compiler
uses another.
Run npm run build. Test: reopen after setting the standard to C11 in
Settings → the select shows C11 and -std=c11 is used.
```

### Prompt 14 — Indent-guide colors can silently fail (inconsistent line stripes)
```
c-shell: Make indentation guides follow the theme without var() strings.

Editor.tsx indentGuidesExtension passes CSS var() STRINGS to the Replit
indentation-markers colors config:
  indentationMarkers({ colors: {
    light: 'var(--border)', dark: 'var(--border)',
    activeLight: 'var(--text-dim)', activeDark: 'var(--text-dim)',
  }})
The extension emits EditorView.baseTheme '&light'/'&dark' with the value
as the --indent-marker-bg-color variable, and .cm-line::before renders a
repeating-linear-gradient with it. CSS custom properties are resolved from
the :root when the element's own scope doesn't define them — but they DON'T
resolve inside .cm-line's own background when the editor theme sets
background-color on the same element (CodeMirror sets cm-content bg), and
any custom theme can override the base theme's '&light'/'&dark' layer so
the markers fall back to the lib defaults, mispainted.

Fix: resolve the CSS variables to CONCRETE colors at theme-apply time via
getComputedStyle(document.documentElement).getPropertyValue('--border') /
'--text-dim' ONCE per theme change (subscribe to theme changes or simply
recompute when settings.theme / settings.userCss changes), and pass the
RESOLVED colors to indentationMarkers. Also set the gradient thickness
right: markers must be visually clean vertical lines at every indent
level, aligned with getIndentUnit — no stray full-width stripes, no
fallback colors. If getComputedStyle ever returns empty, fall back to the
app's lit value (#1a1c24 / #8b8fa8) so markers NEVER render with undefined
colors.
Run npm run build. Visual gate: guides render as clean vertical lines for
both ampersand and colors themes; no full-width line stripes.
```

### Prompt 15 — Full-tree symbol re-walk on every keystroke (typing lag)
```
c-shell: Don't re-walk the whole lezer tree for the outline on each edit.

Editor.tsx: useEffect(() => { parseSymbols(viewRef.current) ... }, [code])
re-parses the ENTIRE syntax tree on every keystroke, and in the listener
this.state.update... dispatch may also re-trigger the EditorProps onChange
chain, making large files stutter — it can feel broken when typing.

Fix:
1. In the extension's update listener, gate the parse: only recompute the
   symbol list when syntaxTree(update.state).topNode has CHANGED
   (treeChanged flag) — skip on pure cursor/viewport/selection updates.
   After the transaction the listener sees, the tree is already at the NEW
   doc, so read from the update.state, not a stale view.state, and still
   re-run after focusing the outline/symbol picker, opening the file, etc.
2. Throttle the top-level Re-parse to e.g. 300 ms after the last
   transaction (debounce via setTimeout) so typing a long line reparses at
   most ~3–4×/s.
3. Keep the imperative jumpToPosition/toggleBookmark behavior unchanged.
Run npm run build. Test: type in a 1000-line file — outline refreshes
within 300 ms of stopping, typing never freezes.
```

### Prompt 16 — Indent setting edge cases (no-op ternary + stale memo deps)
```
c-shell: Fix the no-op indentation-settings ternary and the stale memo deps
in Editor.tsx.

tabSizeExtension:
  EditorState.tabSize.of(
    settings.useTabsIndent ? settings.tabSize || 4 : settings.tabSize || 4
  )
The two branches are IDENTICAL — toggling tabs/spaces changes nothing, and
the memo deps [settings.tabSize] don't include settings.useTabsIndent, so a
"Tabs vs Spaces" toggle never re-creates the state extension or the
indent-guide stride. (Settings already has useTabsIndent and tabSize:
tabs on → tabSize is the tab width; tabs off → spaces, tabSize is spaces
per tab; indentUnit.of(' '.repeat(settings.tabSize || 4)) is the only
place using it today.)

Fix:
1. Derive indentUnit from useTabsIndent: '\t'.repeat(1) for tabs,
   ' '.repeat(settings.tabSize || 4) for spaces (JSX line ~357).
2. Add settings.useTabsIndent to tabSizeExtension deps so it re-creates on
   toggle.
3. Recreate indentGuidesExtension when the indent unit changes too.
Run npm run build. Test: flip Tabs/Spaces in Settings — indentation and
guides switch immediately.
```

### Prompt 17 — Terminal paste wedges the pty (F8, was deferred)
```
c-shell: Rate-limit multi-KB paste into the terminal.

XTermView.tsx Ctrl+Shift+V reads the clipboard and sendCommand()s it raw;
a multi-KB paste can wedge the pty's writer lock for seconds (the whole
app feels frozen/looks broken while it flushes).

Fix: if the pasted text is over ~512 characters, don't send the whole block
as one string. Instead write it to the backend in chunks with a small gap
(é.g. 512 chars + 25 ms) and the Ctrl-C watchdog unchanged; an alternative
is one atomic sendCommand per line, preserving newlines. Keep the pty
single-writer lock and never block the UI thread. The paste must land in
order and never drop bytes.
Run cargo check. Test on macOS: copy a 100 KB text, Ctrl+Shift+V in the
terminal — UI stays responsive, all bytes arrive.
```

### Final: commit (run LAST, after every gate above passes — do NOT do this earlier)
```
c-shell: Everything above passed. Now commit the finished audit-fix work.
DO NOT create a release, DO NOT tag, DO NOT push. Commit only.
1. git add -A
2. git status — confirm only the expected files are staged
   (src/, src-tauri/, package.json, package-lock.json, Cargo.lock + the
   audit/report docs). No stray files (e.g. no .DS_Store, no build
   output). If anything is untracked/unexpected, unstage or add
   .gitignore/SKIP as appropriate, then re-stage.
3. git commit -m "fix: ship audit-fix pass — clean F1-F5, V1-V3, C1-C2, C4-lite, bookmarks, run config, layout/theme hardening"
then stop. Do not push, do not tag, do not open a release. Report the
commit hash and the final git status.
```
Gate: `git status` clean except untracked report docs the user wants kept; commit contains exactly the audit-fix work; NO tag/release/push created.