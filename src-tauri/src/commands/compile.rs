use super::terminal::send_to_terminal;
use crate::terminal::events::{TERMINAL_FOCUS_EVENT, TERMINAL_OUTPUT_EVENT};
use std::fs;
use std::path::Path;
use std::process::Command;
use tauri::{command, AppHandle, Emitter};

#[command]
pub fn compile_and_run(app: AppHandle, code: String, filename: String) -> Result<(), String> {
    let temp_dir = std::env::temp_dir().join("c-shell");
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

    emit(
        "✅ Compiled. Running below — click the terminal and type if your program asks for input:\r\n\r\n"
            .to_string(),
    );

    // Run the program INSIDE the real shell instead of as a detached
    // process. A detached process has no connected keyboard input, so
    // scanf()/fgets() would hit end-of-input instantly — that's why input
    // previously appeared broken. Typing the run command into the shell
    // means stdin/stdout are the user's real terminal, same as running
    // it by hand. The trailing commands clean up the temp files
    // afterward, once the program has actually finished.
    let run_line = format!(
        "\"{}\"; echo \"[process exited: $?]\"; rm -f \"{}\" \"{}\"\r\n",
        binary_path.display(),
        binary_path.display(),
        file_path.display()
    );

    send_to_terminal(&run_line)?;
    let _ = app.emit(TERMINAL_FOCUS_EVENT, ());

    Ok(())
}