# C-Shell — Claude Code Fix Prompts

Paste in order. **Run from `~/Desktop/c-shell/c-shell`.** After each prompt, check the exit criteria before moving on. Don't let Claude Code "also clean up other things" — scope is per prompt.

---

## CRITICAL (fix first — security)

### Prompt A — Path sandboxing (files.rs)
```
c-shell: Sandbox all file commands to the opened workspace.

In src-tauri/, file commands (read_file, write_file, write_binary_file,
create_file, create_directory, rename_path, delete_file, list_directory in
src/commands/files.rs) accept arbitrary paths with no validation. Fix:

1. Add Tauri managed state holding the workspace root (a struct Workspace
   { root: PathBuf }), and a new command set_workspace(root) that
   canonicalizes and stores it. The frontend calls it when a folder opens.
2. In every file command above, canonicalize the requested path and reject
   with Err("Path is outside the workspace") if it does not start_with the
   workspace root. Canonicalize resolves symlinks, so symlinks pointing
   outside get rejected too. If no workspace is set, return Err.
3. Keep command signatures and return types IDENTICAL so the frontend
   compiles unchanged.
4. Windows: compare canonicalized paths case-insensitively.

Then run: cd src-tauri && cargo check
Fix any errors before finishing. Show a summary of files changed.
```

### Prompt B — Real CSP (tauri.conf.json)
```
c-shell: Replace "csp": null in src-tauri/tauri.conf.json with a working
Content-Security-Policy for Tauri v2. Baseline:

default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline';
font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost

Keep dev mode working (vite hot-reload + terminal-output events must still
flow). Verify the app runs in dev (npm run tauri dev) after the change.
Do not touch anything else.
```

### Prompt C — Run-line shell injection (compile.rs)
```
c-shell: Remove the shell-injection surface in compile_and_run.

In src-tauri/src/commands/compile.rs, the run line interpolates the
user-supplied filename base_name into a shell string
(rm -f "{}", del {}, pushd "{}"). A filename containing " or $() or `
(Unix) or & (cmd) escapes into the shell.

Fix: stop using the user filename in the run line entirely. Write the
source to a FIXED safe temp name (e.g. always "main.c") derived from a
constant or a sanitizer that only allows [A-Za-z0-9_.-], and use that same
name in the run-line string. Preserve: cross-platform syntax (Windows cmd
vs POSIX), the __CSHELL_RUN_DONE__ marker, and exit-code reporting.
Add a unit test for the sanitizer. Run cargo check + cargo test.
```

### Prompt D — PTY process cleanup (pty.rs / lib.rs)
```
c-shell: Stop orphaned processes from the PTY terminal.

In src-tauri/src/terminal/pty.rs, the Child from spawn_command is discarded
and the reader thread is never joined. On app quit, a running shell or
infinite-loop program is never killed. Fix:

1. Keep the Child. Add a kill() method that kills the child's process group
   (Unix: kill the pgid via CommandBuilder new_session / killpg equivalent;
   Windows: child.kill()).
2. On quit: in src-tauri/src/lib.rs RunEvent::ExitRequested handler, kill
   the child and join the reader thread before allowing exit.
3. Add a run timeout: configurable kill after N seconds of the compiled
   program running (default: no timeout or 30s — pick one, make it a const).
4. In the reader thread read loop, don't treat transient errors as fatal
   (only EOF should stop the loop).
Run cargo check. No frontend changes.
```

---

## MODERATE (quick, low-risk)

### Prompt E — Poisoned-mutex unwraps
```
c-shell: Replace .unwrap() on Mutex locks in src-tauri/src/commands/terminal.rs
(lines ~36, 45) and src-tauri/src/terminal/pty.rs (lines ~87, 93) with ? /
ok_or so a poisoned lock can't panic the app. Keep behavior identical.
Run cargo check.
```

### Prompt F — Lossy diagnostic parser
```
c-shell: Fix parse_gcc_diagnostics in src-tauri/src/commands/compile.rs.

Problems: splitn(5, ':') drops lines whose path contains ':' (Windows drive
paths), Diagnostic.file only keeps the file NAME (ambiguous across dirs),
and linker/collect2 errors (fewer than 5 fields) are never surfaced.

Fix: parse the leading path correctly (handle "C:\..." and "dir:file"),
store the full path in Diagnostic.file, and surface linker errors too.
Keep the Diagnostic struct fields unchanged (frontend depends on them).
Add unit tests: one Windows-style path, one path containing ':', one
linker/collect2 error line. Run cargo test.
```

### Prompt G — Ctrl+Shift+F conflict
```
c-shell: Resolve the Ctrl+Shift+F double-binding.

App.tsx (~line 385) binds mod+shift+f to FORMAT CODE, but the Command
Palette's search-files action also claims Ctrl+Shift+F (and README says it's
workspace search). Standard convention: Ctrl+Shift+F = search in files,
Shift+Alt+F = format.

Fix: rebind search-in-files to mod+shift+f, rebind format to mod+shift+alt+f
(and Shift+Alt+F), update Toolbar.tsx label, CommandPalette.tsx action, and
docs/KEYBOARD_SHORTCUTS.md. Verify both chords work after the change.
```

### Prompt H — Windows path handling
```
c-shell: Fix paths split only on "/" — Windows backslashes break them.

Search src/ for path.split("/") and path.lastIndexOf("/") where a file path
is being processed. Known: src/components/sidebar/FileTree.tsx (~line 92)
and src/hooks/useTabs.ts (~line 303, and the ~224 lastIndexOf computation).

Create a shared helper (e.g. in src/services/FileService.ts) that splits on
both / and \, and use it in FileTree rename, useTabs renameTabForPath, and
the save-dir computation (which can currently compute substring(0,-1) and
call listDirectory("")). Run npm run build (tsc + vite) to verify.
```

---

## Order & gates

| Step | Prompt | Gate |
|---|---|---|
| 1 | A — sandbox | cargo check clean |
| 2 | B — CSP | dev app runs |
| 3 | C — injection | cargo check + cargo test |
| 4 | D — cleanup | cargo check |
| 5 | E — unwraps | cargo check |
| 6 | F — parser | cargo test |
| 7 | G — shortcut | both chords work |
| 8 | H — windows paths | npm run build clean |

After all 8: update DEEP_REPORT.md checkboxes and delete this file (or keep as reference).
