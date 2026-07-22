use crate::terminal::events::TERMINAL_OUTPUT_EVENT;
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn compile_and_run(app: AppHandle, code: String, filename: String) -> Result<(), String> {
    let temp_dir = std::env::temp_dir().join("c-shell");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    // `filename` is usually a full path like /Users/you/Desktop/foo.c.
    // Path::join() discards the base when given an absolute path, so
    // joining it onto temp_dir would silently give back the ORIGINAL
    // file — and deleting "the temp copy" at the end would delete the
    // user's real saved file. Take just the file name instead, so we
    // always operate on a genuine temp copy.
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

    emit(format!("\r\n$ gcc {} -o program -std=c99 -Wall\r\n", base_name));

    let compile_output = Command::new("gcc")
        .arg(&file_path)
        .arg("-o")
        .arg(&binary_path)
        .arg("-std=c99")
        .arg("-Wall")
        .output()
        .map_err(|e| format!("Failed to run gcc: {}", e))?;

    if !compile_output.status.success() {
        let stderr = String::from_utf8_lossy(&compile_output.stderr);
        emit("❌ COMPILATION ERROR:\r\n".to_string());
        emit(stderr.replace('\n', "\r\n"));
        let _ = fs::remove_file(&file_path);
        return Ok(());
    }

    emit("✅ Compiled. Running ./program:\r\n\r\n".to_string());

    let run_output = Command::new(&binary_path)
        .current_dir(&temp_dir)
        .output()
        .map_err(|e| format!("Failed to run program: {}", e))?;

    let stdout = String::from_utf8_lossy(&run_output.stdout);
    let stderr = String::from_utf8_lossy(&run_output.stderr);

    if !stdout.is_empty() {
        emit(stdout.replace('\n', "\r\n"));
    }
    if !stderr.is_empty() {
        emit("⚠️ STDERR:\r\n".to_string());
        emit(stderr.replace('\n', "\r\n"));
    }

    emit(format!("\r\n[process exited: {}]\r\n", run_output.status));

    let _ = fs::remove_file(&file_path);
    let _ = fs::remove_file(&binary_path);

    Ok(())
}