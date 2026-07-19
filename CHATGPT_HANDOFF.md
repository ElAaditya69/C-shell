# CHATGPT_HANDOFF.md

# C-Shell Development Handoff

**Project:** C-Shell

**Current Version:** v0.4 (Development)

---

# IMPORTANT

This file exists so development can continue across different ChatGPT conversations without re-explaining the project.

Before writing any code, the assistant should understand this document completely.

The goal is to **continue the existing project**, not redesign it.

---

# Development Rules

These rules must always be followed.

## 1. Continue Existing Architecture

Never restart the project.

Never suggest rebuilding everything from scratch.

Always continue from the current implementation.

---

## 2. Explain Before Coding

Before introducing a new subsystem or major refactor:

* explain why it is needed
* explain the architecture
* explain how it affects the project

Only then provide code.

---

## 3. Implementation Packages

Do **not** provide random snippets.

Every feature should be delivered as a complete implementation package containing:

* objective
* files affected
* replacement commands
* build commands
* testing checklist
* git commit message

Avoid partial implementations that leave the project in a broken state.

---

## 4. Preserve Existing Systems

Unless there is a serious architectural issue:

Do NOT redesign completed systems.

Completed systems should be extended—not rewritten.

---

## 5. Refactor Before Features

If the architecture needs improvement:

Refactor first.

Then add new features.

Never stack new features on top of unstable code.

---

## 6. Think Like a Lead Developer

Treat C-Shell like a real open-source software project.

Code should be:

* modular
* maintainable
* cross-platform
* easy to understand
* scalable

---

# Project Mission

Build the best beginner-friendly C programming IDE while remaining useful for experienced programmers.

This is **not** just a school project.

The goal is to become a polished, open-source desktop IDE.

---

# Technology Stack

Frontend

* React
* TypeScript
* Vite
* xterm.js

Backend

* Rust
* Tauri 2.11.x
* portable-pty

Platforms

* macOS (current)
* Windows (planned)
* Linux (planned)

---

# Current Progress

## Editor

Completed

* Code editor
* File editing
* New file
* Save file
* Open file
* Status bar
* Toolbar

---

## File Explorer

Completed

* Folder browser
* File tree
* Native dialogs
* Rust filesystem backend

---

## Compiler

Completed

* GCC/Clang compilation
* Run executable
* Rust compile command
* Frontend compile service

---

## Rust Backend

Completed

Commands include

* compile_and_run
* read_file
* write_file
* create_file
* delete_file
* list_directory

---

## Terminal

Current state

* xterm.js integrated
* portable-pty integrated
* Terminal window working
* Keyboard events partially connected

Current implementation still uses a synchronous TerminalEngine and is **not** considered final.

---

# Current Architecture

Current Rust structure

```text
src-tauri/src/

commands/
terminal/

lib.rs
```

Current TerminalEngine

```text
TerminalEngine
      │
      ▼
 PtyManager
      │
      ▼
 portable-pty
```

This architecture works but blocks on PTY reads.

---

# Architectural Decision

Do **not** continue patching Terminal V1.

Instead implement **Terminal V2**.

Reason:

The current architecture causes:

* blocking reads
* mutex contention
* freezes
* poor scalability

Terminal V2 should become the permanent foundation.

---

# Planned Terminal V2

Target architecture

```text
                 TerminalEngine
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
 Writer Thread                 Reader Thread
        │                             │
        ▼                             ▼
      PTY                      Event Emitter
                                      │
                                      ▼
                                 React xterm
```

Characteristics

* event driven
* background reader
* dedicated writer
* no polling
* no UI freezing
* scalable
* cross-platform friendly

---

# Immediate Goal

Finish Terminal V2 before adding any new IDE features.

The terminal is currently the highest priority subsystem.

---

# Planned Roadmap

## v0.4

* Interactive Terminal V2

## v0.5

* Interactive stdin (`scanf()`)
* Ctrl+C / Ctrl+D
* Arrow keys
* Resize support
* ANSI polish

## v0.6

Editor improvements

* Auto-save
* Better tabs
* Unsaved indicator
* Explorer improvements

## v0.7

Screenshot Engine

Automatically generate images containing

* source code
* compiler output
* terminal output

Designed specifically for school lab reports.

This is considered one of the flagship features of C-Shell.

## v0.8

Cross-platform polishing

* Windows
* Linux
* Packaging

## v0.9

Public Beta

## v1.0

Stable Release

---

# Coding Style

Prefer

* small modules
* clean architecture
* readable Rust
* readable React

Avoid

* giant files
* duplicated logic
* unnecessary complexity

---

# Git Workflow

Each completed feature should end with

```bash
git add .
git commit -m "<meaningful message>"
```

---

# Session Ending Checklist

At the end of every development session provide:

1. What was completed.
2. Current project status.
3. Next recommended task.
4. Suggested git commit message.

---

# Current Next Task

Implement Terminal V2 using:

* Tauri 2.11.x
* portable-pty
* event-driven architecture

After Terminal V2 is stable, continue with editor polish and then the Screenshot Engine.

This project should always move forward incrementally and maintain a production-quality architecture.

---

# Long-Term Vision

C-Shell is intended to become more than a C programming IDE.

The long-term goal is to build an educational development environment that helps students learn programming instead of simply writing code for them.

## Planned AI Assistant (Future)

A dedicated C-Shell AI assistant is planned after the core IDE reaches a stable release.

The AI should:

* Explain compiler errors in beginner-friendly language.
* Explain C concepts step by step.
* Help debug programs by teaching rather than giving answers immediately.
* Suggest improvements and best practices.
* Explain algorithms and data structures.
* Help students understand why code works.
* Integrate directly inside C-Shell instead of relying on external tools.
* Be optional and privacy-friendly.

### Guiding Principle

The AI should be a **teacher**, not a code generator.

Its purpose is to help students become better programmers by encouraging understanding, problem-solving, and learning rather than simply completing assignments for them.

This feature is part of the long-term roadmap and should only be developed after the IDE foundation (editor, compiler, terminal, screenshot engine, and cross-platform support) is stable.
