use super::terminal::send_to_terminal;
use crate::terminal::events::{TERMINAL_FOCUS_EVENT, TERMINAL_OUTPUT_EVENT};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::Instant;
use tauri::{command, AppHandle, Emitter};

const RUN_DONE_MARKER: &str = "__CSHELL_RUN_DONE__";

#[derive(Serialize, Clone, Debug)]
pub struct Diagnostic {
    pub file: String,
    pub line: u32,
    pub col: u32,
    pub is_error: bool,
    pub message: String,
}

fn parse_gcc_diagnostics(stderr: &str) -> Vec<Diagnostic> {
    let mut diagnostics = Vec::new();
    for line in stderr.lines() {
        let parts: Vec<&str> = line.splitn(5, ':').collect();
        if parts.len() >= 5 {
            let path_part = parts[0].trim();
            let file_name = Path::new(path_part)
                .file_name()
                .map(|f| f.to_string_lossy().to_string())
                .unwrap_or_else(|| path_part.to_string());

            if let (Ok(line_num), Ok(col_num)) = (
                parts[1].trim().parse::<u32>(),
                parts[2].trim().parse::<u32>(),
            ) {
                let kind_part = parts[3].trim();
                let is_error = kind_part.contains("error");
                let is_warning = kind_part.contains("warning");

                if is_error || is_warning {
                    diagnostics.push(Diagnostic {
                        file: file_name,
                        line: line_num,
                        col: col_num,
                        is_error,
                        message: parts[4].trim().to_string(),
                    });
                }
            }
        }
    }
    diagnostics
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

struct BuildOutcome {
    success: bool,
    temp_dir: PathBuf,
    base_name: String,
    binary_name: &'static str,
}

/// Shared by build_only and compile_and_run: writes the source to a temp
/// file, runs gcc, and emits colorized errors/warnings plus how long it
/// took. Doesn't run the program — that's the caller's job, if any.
fn build(app: &AppHandle, code: &str, filename: &str) -> Result<BuildOutcome, String> {
    let dir = temp_dir();
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;

    let base_name = Path::new(filename)
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| "program.c".to_string());

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

    emit(format!(
        "\r\n$ gcc {} -o program -std=c99 -Wall\r\n",
        base_name
    ));

    let start = Instant::now();
    let compile_output = Command::new("gcc")
        .arg(&file_path)
        .arg("-o")
        .arg(&binary_path)
        .arg("-std=c99")
        .arg("-Wall")
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
        base_name,
        binary_name,
    })
}

/// Compiles only — no execution. gcc's own compile time already gives
/// an accurate "done" signal here (unlike Run, there's no async
/// terminal hand-off afterward), so the frontend can just await this
/// normally without needing the marker/event dance Run requires.
#[command]
pub fn build_only(app: AppHandle, code: String, filename: String) -> Result<(), String> {
    build(&app, &code, &filename)?;
    Ok(())
}

#[command]
pub fn compile_and_run(app: AppHandle, code: String, filename: String) -> Result<(), String> {
    let outcome = build(&app, &code, &filename)?;

    if !outcome.success {
        let _ = app.emit(TERMINAL_OUTPUT_EVENT, format!("{}\r\n", RUN_DONE_MARKER));
        return Ok(());
    }

    let _ = app.emit(
        TERMINAL_OUTPUT_EVENT,
        "Running below — click the terminal and type if your program asks for input:\r\n\r\n"
            .to_string(),
    );

    let run_line = if cfg!(windows) {
        format!(
            "pushd \"{}\" && {} & if errorlevel 1 (echo ⚠️ Program exited with a non-zero code) else (echo ✅ Program exited successfully) & del /f /q {} {} >nul 2>&1 & popd & echo {}\r\n",
            outcome.temp_dir.display(),
            outcome.binary_name,
            outcome.binary_name,
            outcome.base_name,
            RUN_DONE_MARKER
        )
    } else {
        format!(
            "(cd \"{}\" && ./{}; code=$?; if [ $code -eq 0 ]; then echo \"✅ Program exited successfully\"; elif [ $code -gt 128 ]; then echo \"🛑 Program terminated by signal $((code-128))\"; else echo \"⚠️ Program exited with code $code\"; fi; rm -f {} {}; echo \"{}\")\r\n",
            outcome.temp_dir.display(),
            outcome.binary_name,
            outcome.binary_name,
            outcome.base_name,
            RUN_DONE_MARKER
        )
    };

    send_to_terminal(&run_line)?;
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
