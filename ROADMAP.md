# C-Shell — Roadmap & Build Plan

**Purpose:** sequence the next moves so vibe-coding stays coherent and the critical bugs get fixed deliberately.
**Current state:** v0.6.0 — complete IDE, 30+ features shipped, 3 critical security findings + a few moderate/minor fixes (see AUDIT.md / PROMPTS_AUDIT.md).

---

## Phase 0 — Fix the critical stuff FIRST (do not vibe these)

Security is not vibe-coding territory. Do these deliberately, ideally with Claude Code prompts from the report.

- [ ] **0.1 Path sandboxing** — canonicalize + allowlist all file commands in `src-tauri/commands/files.rs` to the opened workspace dir (read/write/binary/create/rename/delete/list).
- [ ] **0.2 Real CSP** — replace `"csp": null` in `tauri.conf.json` with a working Content-Security-Policy.
- [ ] **0.3 Run-line injection** — in `compile.rs` `compile_and_run`, stop interpolating raw filename into the shell string (derive a safe temp name).
- [ ] **0.4 Process cleanup** — reap/kill the PTY child on quit; add a run timeout.
- **Exit criteria:** `cargo check` + `tsc` clean; manual test of open/read/write/run/quit on macOS.

**Then fix the moderate batch (quick, low-risk):**
- [ ] `Ctrl+Shift+F` binding conflict (format vs search)
- [ ] Windows `\` path handling in `FileTree.tsx:92` / `useTabs.ts:303`
- [ ] `unwrap` → `?`/`ok_or` on the mutex locks in `terminal.rs` / `pty.rs`
- [ ] Lossy diagnostic parser: handle `:` in paths + surface linker errors

---

## Phase 1 — Resolve the debt (small, high-value)

- [ ] **Wire up or cut `ProjectService.ts`** — per-project `.cshell.json` is claimed in README but dead. Either connect it (nice feature) or delete it + fix docs. Decide, don't leave dangling.
- [ ] **Unify version strings** (3 currently: `0.6.0-2` / `0.6.0-1` / `0.2.1`).
- [ ] **Gutter markers for bookmarks** (jump works, no visual indicator).
- [ ] **Rough edges:** catch unhandled pty-start rejection; wrap Replace-All `new RegExp` in try/catch; fix empty-`substring` save-dir edge; actually render terminal "right" position or remove the dead setting.
- [ ] **Refactor the 4-layer terminal wrapper** — `service.rs → engine.rs → session.rs → pty.rs` is all pass-through with only `pty.rs` doing work. Collapse to 1–2 layers.

---

## Phase 2 — Next flagship feature (from PROJECT.md roadmap)

**Learning Mode** (Sprint 4) — step-by-step memory/pointer visualization, AST analysis, beginner-friendly compiler explanation helper. This is YOUR differentiator vs VS Code and worth the build.

Suggested build slices (keep each shippable):
1. **Compiler-error explainer** — map common gcc errors/warnings to plain-language hints (reuse `parse_gcc_diagnostics`).
2. **Step-through execution** — `gdb`/LLDB-driven next/step/continue with variable readout.
3. **Pointer/memory visualizer** — ASCII or inline SVG view of address/stack/heap for C types.
4. **Live symbol map** — turn the existing regex symbol parser into a real outline panel.

---

## Phase 3 — Polish / vision (when core is green)

- [ ] **Fast path first-class**: profile startup; lazy-load heavy modals (code-split).
- [ ] **Packaging**: proper icons, universal binaries, auto-update (Tauri updater), signed builds.
- [ ] **Docs sync**: update README (React 19, real features), kill stale claims (clipboard export, file-icon overstatement).
- [ ] **Tests**: add Rust tests for `parse_gcc_diagnostics` + `standard_flag` (one exists); a few frontend smoke tests.

---

## Working guardrails for vibe-coding

1. **Fix Phase 0 before adding features** — debt compounds fast in an IDE.
2. **One workslice per session** — don't mix themes + features + refactors.
3. **Keep the report updated** as you fix, so the doc never misleads you.
4. **Feature-first or fix-first, but decide** — dead code (`ProjectService`, right-position setting) should be wired or cut, not left floating.
