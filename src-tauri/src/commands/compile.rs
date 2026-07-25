use super::terminal::send_to_terminal;
use crate::terminal::events::{TERMINAL_FOCUS_EVENT, TERMINAL_OUTPUT_EVENT};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::{command, AppHandle, Emitter};

/// Wraps gcc's own "error:"/"warning:" lines in ANSI color codes so they
/// stand out in the terminal — red for errors, yellow for warnings.
/// Other lines (like the source snippet gcc prints under each message)
/// are left as-is.
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

#[command]
pub fn compile_and_run(app: AppHandle, code: String, filename: String) -> Result<(), String> {
    let temp_dir = if cfg!(windows) {
        std::env::temp_dir().join("c-shell")
    } else {
        std::path::PathBuf::from("/tmp/c-shell")
    };
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let base_name = Path::new(&filename)
        .file_name()
        .map(|f| f.to_string_lossy().to_string())
        .unwrap_or_else(|| "program.c".to_string());

    let file_path = temp_dir.join(&base_name);
    fs::write(&file_path, &code).map_err(|e| e.to_string())?;

    let binary_name = if cfg!(windows) { "program.exe" } else { "program" };
    let binary_path = temp_dir.join(binary_name);

    let emit = |text: String| {
        let _ = app.emit(TERMINAL_OUTPUT_EVENT, text);
    };

    // Remove any executable left over from a previous run, so a failed
    // compile can never leave a stale binary around to be run by mistake.
    let _ = fs::remove_file(&binary_path);

    emit(format!("\r\n$ gcc {} -o program -std=c99 -Wall\r\n", base_name));

    let compile_output = Command::new("gcc")
        .arg(&file_path)
        .arg("-o")
        .arg(&binary_path)
        .arg("-std=c99")
        .arg("-Wall")
        .output()
        .map_err(|e| format!("Failed to run gcc: {}", e))?;

    let stderr = String::from_utf8_lossy(&compile_output.stderr);

    if !compile_output.status.success() {
        emit("\x1b[31m❌ COMPILATION ERROR:\x1b[0m\r\n".to_string());
        emit(colorize_gcc_output(&stderr));
        emit("\r\n".to_string());
        let _ = fs::remove_file(&file_path);
        return Ok(());
    }

    // gcc can succeed AND still print warnings (that's the whole point of
    // -Wall) — these were previously being silently thrown away.
    if !stderr.trim().is_empty() {
        emit("\x1b[33m⚠️ COMPILER WARNINGS:\x1b[0m\r\n".to_string());
        emit(colorize_gcc_output(&stderr));
        emit("\r\n".to_string());
    }

    emit(
        "✅ Compiled. Running below — click the terminal and type if your program asks for input:\r\n\r\n"
            .to_string(),
    );

    // Run everything inside a subshell `(...)` instead of a plain `cd` —
    // a bare `cd` would permanently move the user's actual terminal
    // session into the temp folder. A subshell's `cd` only applies
    // inside those parentheses.
    //
    // The exit message distinguishes: a clean exit (code 0), a program
    // killed by a signal — e.g. the Stop button sending Ctrl+C, which
    // by shell convention shows up as exit code 128+signal — and a
    // normal non-zero exit code (e.g. `return 1;` in main).
    let run_line = format!(
        "(cd \"{}\" && ./{}; code=$?; if [ $code -eq 0 ]; then echo \"✅ Program exited successfully\"; elif [ $code -gt 128 ]; then echo \"🛑 Program terminated by signal $((code-128))\"; else echo \"⚠️ Program exited with code $code\"; fi; rm -f {} {})\r\n",
        temp_dir.display(),
        binary_name,
        binary_name,
        base_name
    );

    send_to_terminal(&run_line)?;
    let _ = app.emit(TERMINAL_FOCUS_EVENT, ());

    Ok(())
}
