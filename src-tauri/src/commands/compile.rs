use super::terminal::send_to_terminal;
use crate::terminal::events::{TERMINAL_FOCUS_EVENT, TERMINAL_OUTPUT_EVENT};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::{command, AppHandle, Emitter};

const RUN_DONE_MARKER: &str = "__CSHELL_RUN_DONE__";

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
        emit(format!("{}\r\n", RUN_DONE_MARKER));
        let _ = fs::remove_file(&file_path);
        return Ok(());
    }

    if !stderr.trim().is_empty() {
        emit("\x1b[33m⚠️ COMPILER WARNINGS:\x1b[0m\r\n".to_string());
        emit(colorize_gcc_output(&stderr));
        emit("\r\n".to_string());
    }

    emit(
        "✅ Compiled. Running below — click the terminal and type if your program asks for input:\r\n\r\n"
            .to_string(),
    );

let run_line = if cfg!(windows) {
    format!(
        "cd /d \"{}\" && .\\{} && echo \"✅ Program exited successfully\" && del {} {} && echo \"{}\"\r\n",
        temp_dir.display(),
        binary_name,
        binary_name,
        base_name,
        RUN_DONE_MARKER
    )
} else {
    format!(
        "(cd \"{}\" && ./{}; code=$?; if [ $code -eq 0 ]; then echo \"✅ Program exited successfully\"; elif [ $code -gt 128 ]; then echo \"🛑 Program terminated by signal $((code-128))\"; else echo \"⚠️ Program exited with code $code\"; fi; rm -f {} {}; echo \"{}\")\r\n",
        temp_dir.display(),
        binary_name,
        binary_name,
        base_name,
        RUN_DONE_MARKER
    )
};
    send_to_terminal(&run_line)?;
    let _ = app.emit(TERMINAL_FOCUS_EVENT, ());

    Ok(())
}
