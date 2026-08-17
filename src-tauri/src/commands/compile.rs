use super::terminal::{send_to_terminal, wait_for_terminal};
use crate::terminal::events::{TERMINAL_FOCUS_EVENT, TERMINAL_OUTPUT_EVENT};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Instant;
use tauri::{command, AppHandle, Emitter};

const RUN_DONE_MARKER: &str = "__CSHELL_RUN_DONE__";

/// How long a compiled program is allowed to run before it is interrupted.
/// The interrupt is delivered at the terminal level (Ctrl-C), so it reaches
/// whatever the pty's foreground job is — the running program itself.
/// Bounded here so a runaway/infinite-loop program can't hold the terminal
/// forever; the user can still stop earlier with the Stop button.
const RUN_TIMEOUT: std::time::Duration = std::time::Duration::from_secs(30);

/// Per-run launch configuration, set from the UI before Run.
/// args — program argv (each is shell-escaped at run-line build time, so
///        user text can never break out of quotes).
/// stdin_file — redirect the program's stdin from this file (`< file`);
///        when absent the terminal stays interactive and the user can type.
/// cwd — run the binary from this directory instead of the build temp dir;
///        when absent the temp dir is used (current behavior).
#[derive(Serialize, Deserialize, Clone, Debug, Default)]
pub struct RunConfig {
    pub args: Vec<String>,
    pub stdin_file: Option<String>,
    pub cwd: Option<String>,
}

/// Quotes one shell word with single quotes (POSIX-safe on every sh clone):
/// '  -> '\''  — the only metacharacter single quotes cannot contain. The
/// quoted result is one literal word regardless of spaces, $(), backticks,
/// `;`, `&`, globs, etc., so user-supplied args/stdin/cwd paths can't
/// escape into the run line.
fn shell_quote(arg: &str) -> String {
    format!("'{}'", arg.replace('\'', "'\\''"))
}

/// cmd.exe quoting: wrap in double quotes and drop embedded quotes (escaping
/// them in cmd is unreliable; embedded quotes in program args are vanishingly
/// rare, so a lossy collapse is the safe trade).
#[cfg(windows)]
fn cmd_quote(s: &str) -> String {
    format!("\"{}\"", s.replace('"', ""))
}

/// Windows build path — binary is run in the temp dir; args + stdin follow
/// the same quoting rules. cwd support is limited on cmd: `cd /d "dir"` is
/// prepended so relative args/input paths resolve from the user's folder.
#[cfg(windows)]
fn windows_cwd_prefix(cwd: &str) -> String {
    format!("cd /d {} && ", cmd_quote(cwd))
}

/// cmd.exe quoting: wrap in double quotes and drop embedded quotes (escaping
/// them in cmd is unreliable; embedded quotes in program args are vanishingly
/// rare, so a lossy collapse is the safe trade).
#[cfg(not(windows))]
#[allow(dead_code)]
fn cmd_quote(s: &str) -> String {
    // Never used on Unix; kept cfg'd so the symbol table stays clean.
    let _ = s;
    String::new()
}

/// Builds the POSIX run line. Only constants and shell_quote()d user values
/// are interpolated. `bin_word` is the exact invocation word ("./program" or
/// an absolute temp-dir path when a custom cwd is set); `args` render as
/// 'a' 'b' …, stdin as ` < 'file'` (must follow the command word and args),
/// the run happens in `dir`.
fn posix_run_line(
    dir: &str,
    bin_word: &str,
    args: &[String],
    stdin_file: Option<&str>,
    marker: &str,
) -> String {
    let args_part: String = args
        .iter()
        .map(|a| format!(" {}", shell_quote(a)))
        .collect();
    let stdin_part = match stdin_file {
        Some(f) if !f.trim().is_empty() => format!(" < {}", shell_quote(f)),
        _ => String::new(),
    };
    format!(
        "(cd {} && {}{}{}; code=$?; if [ $code -eq 0 ]; then echo \"✅ Program exited successfully\"; elif [ $code -gt 128 ]; then echo \"🛑 Program terminated by signal $((code-128))\"; else echo \"⚠️ Program exited with code $code\"; fi; rm -f {}; echo \"{}\")\r\n",
        shell_quote(dir),
        shell_quote(bin_word),
        args_part,
        stdin_part,
        shell_quote(bin_word),
        marker
    )
}

#[cfg(windows)]
fn windows_run_line(
    dir: &str,
    bin_word: &str,
    args: &[String],
    stdin_file: Option<&str>,
    marker: &str,
) -> String {
    let args_part: String = args
        .iter()
        .map(|a| format!(" {}", cmd_quote(a)))
        .collect();
    let stdin_part = match stdin_file {
        Some(f) if !f.trim().is_empty() => format!(" < {}", cmd_quote(f)),
        _ => String::new(),
    };
    format!(
        "pushd {} && start /b {}{}{} & if errorlevel 1 (echo ⚠️ Program exited with a non-zero code) else (echo ✅ Program exited successfully) & popd & echo {}\r\n",
        cmd_quote(dir),
        bin_word,
        args_part,
        stdin_part,
        marker
    )
}

#[derive(Serialize, Clone, Debug)]
pub struct Diagnostic {
    pub file: String,
    pub line: u32,
    pub col: u32,
    pub is_error: bool,
    pub message: String,
}

/// Parses one gcc/clang diagnostic line of the form
///   PATH:LINE:COL: KIND: MESSAGE
/// PATH itself may contain colons (Windows drive letters), and MESSAGE may
/// contain colons too. We walk left→right and take the FIRST colon position
/// that is immediately followed by numeric line:col and then a kind word, so
/// a drive-letter/`..`/directory colon can never be mistaken for the real
/// line/col separator (those aren't followed by digits). Full path is kept
/// (not just the file name) so the frontend can click-to-jump across dirs.
fn parse_gcc_diagnostics(stderr: &str) -> Vec<Diagnostic> {
    let mut diagnostics: Vec<Diagnostic> = Vec::new();

    for line in stderr.lines() {
        // Walk every ':' occurrence; the first one that yields a valid
        // line:col:kind triple right after it is the real separator.
        let mut found = None;
        for (colon_idx, _) in line.match_indices(':') {
            let tail = &line[colon_idx + 1..];
            let after_line = match tail.find(':') {
                Some(i) => i,
                None => continue,
            };
            let line_num = match tail[..after_line].trim().parse::<u32>() {
                Ok(n) => n,
                Err(_) => continue,
            };
            let rest = &tail[after_line + 1..];
            let after_col = match rest.find(':') {
                Some(i) => i,
                None => continue,
            };
            let col_num = match rest[..after_col].trim().parse::<u32>() {
                Ok(n) => n,
                Err(_) => continue,
            };
            let after_kind = &rest[after_col + 1..];
            let kind_part = &after_kind[..after_kind.find(':').unwrap_or(after_kind.len())];
            let kind = kind_part.trim();
            let is_error = kind.contains("error"); // "error" / "fatal error"
            let is_warning = kind.starts_with("warning");
            if !(is_error || is_warning) {
                continue;
            }
            found = Some((
                line[..colon_idx].trim().to_string(),
                line_num,
                col_num,
                is_error,
                after_kind
                    .splitn(2, ':')
                    .nth(1)
                    .unwrap_or("")
                    .trim()
                    .to_string(),
            ));
            break;
        }

        if let Some((file, line_num, col_num, is_error, message)) = found {
            diagnostics.push(Diagnostic {
                file,
                line: line_num,
                col: col_num,
                is_error,
                message,
            });
        } else if !diagnostics
            .iter()
            .any(|d| d.line == 0 && d.message == line)
        {
            // Linker / driver lines carry no line:col — e.g.
            //   ld: symbol(s) not found for architecture arm64
            //   collect2: error: ld returned 1 exit status
            // Surface them as file-wide diagnostics (line 0) so the user
            // sees the real failure instead of a blank error pane.
            if let Some((file, message)) = split_linker_line(line) {
                diagnostics.push(Diagnostic {
                    file,
                    line: 0,
                    col: 0,
                    is_error: true,
                    message,
                });
            }
        }
    }

    diagnostics
}

/// `ld:` / `collect2:` lines have no source location; treat the head before
/// the first `:` as the "file" and the rest as the message. Anything else
/// (continuation lines) is not surfaced.
fn split_linker_line(line: &str) -> Option<(String, String)> {
    let idx = line.find(':')?;
    let head = line[..idx].trim().to_string();
    let tail = line[idx + 1..].trim().to_string();
    let is_linker = head.ends_with("ld") || head.ends_with("collect2");
    if is_linker && !tail.is_empty() {
        Some((head, tail))
    } else {
        None
    }
}

fn colorize_gcc_output(output: &str) -> String {
    output
        .lines()
        .map(|line| {
            if line.contains(" error:") {
                format!("\x1b[31m{}\x1b[0m", line)
            } else if line.contains(" warning:") {
                format!("\x1b[33m{}\x1b[0m", line)
            } else {
                line.to_string()
            }
        })
        .collect::<Vec<_>>()
        .join("\r\n")
}

fn temp_dir() -> PathBuf {
    if cfg!(windows) {
        std::env::temp_dir().join("c-shell")
    } else {
        PathBuf::from("/tmp/c-shell")
    }
}

/// Maps an arbitrary user filename onto a shell/fs-safe temp basename so no
/// special characters (quotes, `$()`, backticks, spaces, slashes) can ever
/// interpolate into a shell string. Keeps up to 64 [A-Za-z0-9._-] chars and
/// always ends in `.c` so gcc treats it as C source.
fn safe_temp_basename(filename: &str) -> String {
    let mut safe: String = filename
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == '-' || *c == '_' || *c == '.')
        .collect();
    if safe.is_empty() || safe == "." || safe == ".." || safe.starts_with('.') {
        safe = "program".to_string();
    }
    let ends_c = safe.to_ascii_lowercase().ends_with(".c");
    safe.truncate(if ends_c { 64 } else { 60 });
    if ends_c {
        safe
    } else {
        format!("{}.c", safe)
    }
}

struct BuildOutcome {
    success: bool,
    temp_dir: PathBuf,
    binary_name: &'static str,
}

/// Recursively collects every `.c` file under `root` (excluding the build
/// temp dir), sorted for a deterministic compile order. Includes .c only —
/// .h headers are pulled in via -I, never listed on the command line.
fn collect_folder_sources(root: &Path, exclude: &Path) -> Vec<PathBuf> {
    let mut out = Vec::new();
    let mut stack = vec![root.to_path_buf()];
    while let Some(dir) = stack.pop() {
        if dir == exclude {
            continue;
        }
        let Ok(entries) = fs::read_dir(&dir) else { continue };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                stack.push(path);
            } else if path
                .extension()
                .map(|e| e.eq_ignore_ascii_case("c"))
                .unwrap_or(false)
            {
                out.push(path);
            }
        }
    }
    out.sort();
    out
}

/// Builds the gcc invocation. `sources` is the .c files; `workspace_dir`
/// (folder mode only) adds `-I<dir>` so `#include "utils.h"` resolves.
/// -std is passed as a single "-std=…" argument.
fn gcc_command(
    sources: &[PathBuf],
    binary_path: &Path,
    std_flag: &str,
    workspace_dir: Option<&Path>,
) -> Command {
    let mut cmd = Command::new("gcc");
    for src in sources {
        cmd.arg(src);
    }
    cmd.arg("-o")
        .arg(binary_path)
        // Must be a single argument: gcc/clang reject "-std" and "c99"
        // passed separately (the flag value would be parsed as a file).
        .arg(format!("-std={}", std_flag))
        .arg("-Wall");
    if let Some(w) = workspace_dir {
        cmd.arg(format!("-I{}", w.display()));
    }
    cmd
}

/// Whitelist of accepted C standards; gcc maps "GNU99" to "gnu99".
fn standard_flag(standard: &str) -> String {
    match standard.trim().to_ascii_lowercase() {
        // Accept both "c99" (our canonical labels) and user-typed variants.
        s if s == "gnu99" || s == "gnu17" || s == "gnu11" || s == "gnu89" || s == "c89" || s == "c11" || s == "c17" => s,
        _ => "c99".to_string(),
    }
}

/// Shared by build_only and compile_and_run: writes the source to a temp
/// file, runs gcc, and emits colorized errors/warnings plus how long it
/// took. Doesn't run the program — that's the caller's job, if any.
///
/// `workspace_dir`: when the frontend passes the workspace root the active
/// file lives in, the whole folder is compiled as one translation-unit set
/// (main.c utils.c … -I<workspaceDir>). Without it, the classic single-file
/// path stays unchanged.
fn build(
    app: &AppHandle,
    code: &str,
    filename: &str,
    standard: Option<String>,
    workspace_dir: Option<String>,
) -> Result<BuildOutcome, String> {
    let dir = temp_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let std_flag = standard
        .map(|s| standard_flag(&s))
        .unwrap_or_else(|| "c99".to_string());

    let base_name = safe_temp_basename(filename);

    let file_path = dir.join(&base_name);
    fs::write(&file_path, code).map_err(|e| e.to_string())?;

    let binary_name = if cfg!(windows) {
        "program.exe"
    } else {
        "program"
    };
    let binary_path = dir.join(binary_name);

    let emit = |text: String| {
        let _ = app.emit(TERMINAL_OUTPUT_EVENT, text);
    };

    let _ = fs::remove_file(&binary_path);

    // Folder mode: workspace root resolves, exists, and holds at least one
    // other .c file — otherwise fall back to single-file.
    let folder_mode = workspace_dir
        .as_deref()
        .filter(|w| !w.trim().is_empty())
        .and_then(|w| Path::new(w).canonicalize().ok())
        .filter(|w| w.is_dir())
        .filter(|w| w != &dir)
        .filter(|w| {
            collect_folder_sources(w, &dir)
                .iter()
                .any(|s| s != &file_path)
        });
    let mut sources = vec![file_path.clone()];
    if let Some(w) = &folder_mode {
        sources = collect_folder_sources(w, &dir);
        if !sources.contains(&file_path) {
            sources.push(file_path.clone());
        }
        sources.sort();
    }
    let workspace_arg = folder_mode.as_ref().map(|p| p.as_path());

    let sources_display: Vec<String> = sources
        .iter()
        .map(|s| s.file_name().unwrap_or_default().to_string_lossy().to_string())
        .collect();
    let echo_line = match &folder_mode {
        Some(w) => format!(
            "\r\n$ gcc {} -o program -std={} -Wall -I{}\r\n",
            sources_display.join(" "),
            std_flag,
            w.display()
        ),
        None => format!(
            "\r\n$ gcc {} -o program -std={} -Wall\r\n",
            base_name, std_flag
        ),
    };
    emit(echo_line);

    let start = Instant::now();
    let compile_output = gcc_command(&sources, &binary_path, &std_flag, workspace_arg)
        .output()
        .map_err(|e| format!("Failed to run gcc: {}", e))?;
    let elapsed = start.elapsed();

    let stderr = String::from_utf8_lossy(&compile_output.stderr);
    let success = compile_output.status.success();
    let diagnostics = parse_gcc_diagnostics(&stderr);
    let _ = app.emit("compiler-diagnostics", diagnostics);

    if !success {
        emit("\x1b[31m❌ COMPILATION ERROR:\x1b[0m\r\n".to_string());
        emit(colorize_gcc_output(&stderr));
        emit(format!(
            "\r\n(failed after {:.2}s)\r\n",
            elapsed.as_secs_f32()
        ));
        let _ = fs::remove_file(&file_path);
    } else {
        if !stderr.trim().is_empty() {
            emit("\x1b[33m⚠️ COMPILER WARNINGS:\x1b[0m\r\n".to_string());
            emit(colorize_gcc_output(&stderr));
            emit("\r\n".to_string());
        }
        emit(format!("✅ Compiled in {:.2}s\r\n", elapsed.as_secs_f32()));
    }

    Ok(BuildOutcome {
        success,
        temp_dir: dir,
        binary_name,
    })
}

/// Compiles only — no execution. gcc's own compile time already gives
/// an accurate "done" signal here (unlike Run, there's no async
/// terminal hand-off afterward), so the frontend can just await this
/// normally without needing the marker/event dance Run requires.
/// Wait (bounded) for the pty to be up before emitting output, so the
/// frontend's listener is attached and nothing typed/emitted is dropped.
fn wait_terminal_ready() -> Result<(), String> {
    if wait_for_terminal(std::time::Duration::from_millis(3000)) {
        Ok(())
    } else {
        Err("Terminal not started".to_string())
    }
}

#[command]
pub fn build_only(
    app: AppHandle,
    code: String,
    filename: String,
    standard: Option<String>,
    workspace_dir: Option<String>,
) -> Result<(), String> {
    wait_terminal_ready()?;
    build(&app, &code, &filename, standard, workspace_dir)?;
    Ok(())
}

/// Runs a Python file with the real `python3` executable — the file path is
/// passed as an argv, never interpolated into a shell string, so a filename
/// containing `"`, `$()`, backticks, `&`, `;`, etc. cannot escape into the
/// shell. Spawns in a background thread and polls `try_wait` with the same
/// RUN_TIMEOUT bound as compiled C programs; on timeout the child is killed
/// (the pty's shell is left alone). The terminal-output and terminal-focus
/// events are emitted exactly as `compile_and_run` does.
#[command]
pub fn run_python(app: AppHandle, file_path: String) -> Result<(), String> {
    wait_terminal_ready()?;

    let mut child = Command::new("python3")
        .arg(&file_path)
        .spawn()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                "Python runner not found: ensure python3 is in PATH.".to_string()
            } else {
                format!("Failed to run python3: {}", e)
            }
        })?;

    let _ = app.emit(
        TERMINAL_OUTPUT_EVENT,
        format!("$ python3 {}\r\n", file_path),
    );

    let value = app.clone();
    std::thread::spawn(move || {
        let spill = |text: String| {
            let _ = value.emit(TERMINAL_OUTPUT_EVENT, text);
        };
        // Poll for completion; anything that stops early (timeout kill,
        // unexpected error) still emits the done marker so the frontend's
        // run-finished listener always flips the UI back to idle.
        let deadline = std::time::Instant::now() + RUN_TIMEOUT;
        loop {
            match child.try_wait() {
                Ok(None) => {
                    if std::time::Instant::now() >= deadline {
                        let _ = child.kill();
                        let _ = child.wait();
                        spill("\r\n⏱️ Run timed out (30s) — killed python3.\r\n".to_string());
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }
                Ok(Some(status)) => {
                    if status.success() {
                        spill("\r\n✅ Python program exited successfully\r\n".to_string());
                    } else {
                        spill(format!(
                            "\r\n⚠️ Python program exited with code {}\r\n",
                            status.code().unwrap_or(-1)
                        ));
                    }
                    break;
                }
                Err(_) => break,
            }
        }
        let _ = value.emit(TERMINAL_OUTPUT_EVENT, format!("{}\r\n", RUN_DONE_MARKER));
    });

    let _ = app.emit(TERMINAL_FOCUS_EVENT, ());
    Ok(())
}

#[command]
pub fn compile_and_run(
    app: AppHandle,
    code: String,
    filename: String,
    standard: Option<String>,
    config: Option<RunConfig>,
    workspace_dir: Option<String>,
) -> Result<(), String> {
    wait_terminal_ready()?;
    let outcome = build(&app, &code, &filename, standard, workspace_dir)?;

    if !outcome.success {
        let _ = app.emit(TERMINAL_OUTPUT_EVENT, format!("{}\r\n", RUN_DONE_MARKER));
        return Ok(());
    }

    let _ = app.emit(
        TERMINAL_OUTPUT_EVENT,
        "Running below — click the terminal and type if your program asks for input:\r\n\r\n"
            .to_string(),
    );

    let cfg = config.unwrap_or_default();
    // cd target: custom cwd or the build temp dir.
    let cd_target = match &cfg.cwd {
        Some(c) if !c.trim().is_empty() => c.clone(),
        _ => outcome.temp_dir.to_string_lossy().to_string(),
    };
    // Invocation word: with a custom cwd the binary lives in the temp dir, so
    // run it by absolute path (./only works from the temp dir itself); the
    // path is stable — the temp dir + constants, never user input.
    let bin_word = match &cfg.cwd {
        Some(c) if !c.trim().is_empty() => format!(
            "{}/{}",
            outcome.temp_dir.to_string_lossy(),
            outcome.binary_name
        ),
        _ => format!("./{}", outcome.binary_name),
    };

    // Safe run line: the binary name and all user config (args, stdin file,
    // cwd) are shell_quote()d, so nothing user-controlled can escape the
    // shell. Run is watchdogged but the shell stays alive and waits, so the
    // frontend keeps the terminal interactive.
    let run_line = if cfg!(windows) {
        #[cfg(windows)]
        {
            windows_run_line(
                &cd_target,
                &bin_word,
                &cfg.args,
                cfg.stdin_file.as_deref(),
                RUN_DONE_MARKER,
            )
        }
        #[cfg(not(windows))]
        {
            // Unreachable on non-Windows; keeps both cfg branches total.
            String::new()
        }
    } else {
        #[cfg(not(windows))]
        {
            posix_run_line(
                &cd_target,
                &bin_word,
                &cfg.args,
                cfg.stdin_file.as_deref(),
                RUN_DONE_MARKER,
            )
        }
        #[cfg(windows)]
        {
            // Unreachable on Windows; keeps both cfg branches total.
            String::new()
        }
    };

    send_to_terminal(&run_line)?;

    // Run timeout: after RUN_TIMEOUT seconds, send an interrupt (Ctrl-C =
    // \x03) through the terminal. The foreground job — the running C program
    // — receives SIGINT, the shell's `wait` returns, its "terminated by
    // signal 130/2" branch reports it, and the done marker flips the UI back
    // to idle. Delivered at the terminal level so it works regardless of
    // which job is foreground.
    std::thread::spawn(move || {
        std::thread::sleep(RUN_TIMEOUT);
        let _ = send_to_terminal("\x03");
    });
    let _ = app.emit(TERMINAL_FOCUS_EVENT, ());

    Ok(())
}

#[command]
pub fn clean_build(app: AppHandle) -> Result<(), String> {
    let dir = temp_dir();
    if dir.exists() {
        let _ = fs::remove_dir_all(&dir);
    }
    let _ = app.emit(
        TERMINAL_OUTPUT_EVENT,
        "\x1b[32m🧹 Build artifacts cleaned successfully.\x1b[0m\r\n".to_string(),
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn safe_basename_strips_shell_metacharacters() {
        // Quotes, spaces, `$()`, backticks, slashes and dots must never
        // survive into a path that later goes into a shell string.
        assert_eq!(
            safe_temp_basename("../evil; rm -rf / \"$(id)\" `x`.c"),
            "program.c"
        );
        assert_eq!(safe_temp_basename("main.c"), "main.c");
        assert_eq!(safe_temp_basename(".."), "program.c");
        assert_eq!(safe_temp_basename(""), "program.c");
        let long = "a".repeat(200);
        let out = safe_temp_basename(&long);
        assert!(out.len() <= 64);
        assert!(out.ends_with(".c"));
    }

    #[test]
    fn parses_gcc_diagnostics_with_colons_in_paths_and_full_message() {
        let out = parse_gcc_diagnostics(
            "/Users/x/my dir/main.c:5:13: error: undeclared identifier 'foo'\n\
             /Users/x/main.c:1:1: warning: implicit declaration of function 'bar' [-Wimplicit-function-declaration]\r\n\
             collect2: error: ld returned 1 exit status",
        );
        assert_eq!(out.len(), 3);
        assert_eq!(out[0].file, "/Users/x/my dir/main.c");
        assert_eq!(out[0].line, 5);
        assert_eq!(out[0].col, 13);
        assert!(out[0].is_error);
        assert_eq!(out[0].message, "undeclared identifier 'foo'");
        assert_eq!(out[1].file, "/Users/x/main.c");
        assert!(!out[1].is_error);
        // Message contains a colon, must be preserved after the 4th field.
        assert!(out[1].message.starts_with("implicit declaration"));
        assert_eq!(out[2].file, "collect2");
        assert_eq!(out[2].line, 0);
        assert!(out[2].is_error);
        assert!(out[2].message.contains("ld returned 1 exit status"));
    }

    #[test]
    fn windows_drive_colon_not_mistaken_for_line_col() {
        let out = parse_gcc_diagnostics(
            "C:\\src\\main.c:3:7: error: 'x' undeclared (first use in this function)",
        );
        assert_eq!(out.len(), 1);
        assert_eq!(out[0].file, "C:\\src\\main.c");
        assert_eq!(out[0].line, 3);
        assert_eq!(out[0].col, 7);
    }

    #[test]
    fn python_runner_passes_path_as_argv_no_shell() {
        // The file path must reach python3 as a single argv entry, so a
        // filename containing `"`, `$()`, backticks, `;` or `&` can never be
        // interpreted by a shell. Build the exact command run_python uses and
        // verify the argv.
        let evil = "/tmp/evil; rm -rf ~ \"$(id)\" `x`.py";
        let mut cmd = Command::new("python3");
        cmd.arg(&evil);
        let args: Vec<String> = cmd
            .get_args()
            .map(|a| a.to_string_lossy().to_string())
            .collect();
        assert_eq!(args, vec![evil]);
        // No shell was involved: the string is passed verbatim, unchanged.
        assert_eq!(cmd.get_program().to_string_lossy(), "python3");
    }

    #[test]
    fn run_config_args_are_quoted_not_interpolated() {
        // Evil argv must land inside single quotes, never as shell words.
        let line = posix_run_line(
            "/tmp/c-shell",
            "./program",
            &["normal".into(), "a b; rm -rf /".into(), "`x`".into(), "$(id)".into(), "'quote'".into()],
            None,
            RUN_DONE_MARKER,
        );
        assert!(line.contains("'a b; rm -rf /'"), "got: {}", line);
        assert!(line.contains("'`x`'"), "got: {}", line);
        assert!(line.contains("'$(id)'"), "got: {}", line);
        // A single quote is escaped as the classic '\'' sequence.
        assert!(line.contains("''\\''quote'"), "got: {}", line);
        assert!(line.contains(RUN_DONE_MARKER));
    }

    #[test]
    fn run_config_stdin_redirection_is_quoted() {
        let line = posix_run_line(
            "/tmp/c-shell",
            "./program",
            &[],
            Some("/tmp/in file; echo pwned > /tmp/x".into()),
            RUN_DONE_MARKER,
        );
        // The whole nasty filename must be ONE single-quoted word glued to the
        // "<" redirect — the semicolon/redirect inside it are literal text,
        // not shell syntax (if they escaped the quote the word would break).
        assert!(
            line.contains("&& './program' < '/tmp/in file; echo pwned > /tmp/x';"),
            "got: {}",
            line
        );
    }

    #[test]
    fn run_config_custom_cwd_and_binary_word() {
        // Custom cwd → absolute temp-dir binary word; run happens in cwd.
        let line = posix_run_line(
            "/Users/me/project",
            "/tmp/c-shell/program",
            &[],
            None,
            RUN_DONE_MARKER,
        );
        assert!(line.starts_with("(cd '/Users/me/project' &&"), "got: {}", line);
        assert!(line.contains("'/tmp/c-shell/program'"), "got: {}", line);
        assert!(!line.contains("./program"), "got: {}", line);
    }

    #[test]
    fn gcc_std_flag_is_single_argument_and_compiles_all_standards() {
        let dir = temp_dir();
        fs::create_dir_all(&dir).unwrap();
        let src = dir.join("argv_test.c");
        fs::write(&src, "int main(void) { return 0; }\n").unwrap();

        for label in ["c89", "c99", "c11", "c17", "gnu99"] {
            let std_flag = standard_flag(label);
            let bin = dir.join(format!("argv_{}", label));
            let mut cmd = gcc_command(&[src.clone()], &bin, &std_flag, None);
            let out = cmd.output().expect("gcc runs");
            assert!(
                out.status.success(),
                "compile failed for {}: {}",
                label,
                String::from_utf8_lossy(&out.stderr)
            );
        }
    }

    #[test]
    fn folder_sources_collected_with_headers_not_listed() {
        let root = temp_dir().join("ws_test");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(root.join("sub")).unwrap();
        fs::write(root.join("main.c"), "int main(void) { return 0; }\n").unwrap();
        fs::write(root.join("utils.c"), "int helper(void) { return 1; }\n").unwrap();
        fs::write(root.join("utils.h"), "int helper(void);\n").unwrap();
        fs::write(root.join("sub/extra.c"), "int extra(void) { return 2; }\n").unwrap();
        fs::write(root.join("notes.txt"), "not a source\n").unwrap();

        let srcs = collect_folder_sources(&root, &temp_dir());
        let rel: Vec<String> = srcs
            .iter()
            .map(|s| s.strip_prefix(&root).unwrap().to_string_lossy().to_string())
            .collect();
        assert_eq!(rel, vec!["main.c", "sub/extra.c", "utils.c"]);
    }

    #[test]
    fn folder_mode_compiles_two_files_with_include() {
        // A real 2-file project: main.c calls a function declared in utils.h
        // and defined in utils.c. Folder mode must pass both files to gcc
        // with -I<dir> so the header resolves — single-file mode would fail
        // with an undefined reference.
        let root = temp_dir().join("proj_test");
        let _ = fs::remove_dir_all(&root);
        fs::create_dir_all(&root).unwrap();
        fs::write(
            root.join("utils.h"),
            "int helper(void);\n",
        )
        .unwrap();
        fs::write(
            root.join("utils.c"),
            "int helper(void) { return 42; }\n",
        )
        .unwrap();
        fs::write(
            root.join("main.c"),
            "#include \"utils.h\"\n#include <stdio.h>\nint main(void) { printf(\"%d\\n\", helper()); return 0; }\n",
        )
        .unwrap();

        let srcs = collect_folder_sources(&root, &temp_dir());
        let bin = temp_dir().join("proj_test_program");
        let mut cmd = gcc_command(&srcs, &bin, "c99", Some(&root));
        let out = cmd.output().expect("gcc runs");
        assert!(
            out.status.success(),
            "2-file folder compile failed: {}",
            String::from_utf8_lossy(&out.stderr)
        );
        let run = Command::new(&bin)
            .output()
            .expect("compiled binary runs");
        assert_eq!(
            String::from_utf8_lossy(&run.stdout).trim(),
            "42",
            "expected helper() output"
        );
        let _ = fs::remove_file(&bin);
    }
}
