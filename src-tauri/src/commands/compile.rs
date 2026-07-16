use std::fs;
use std::process::Command;
use tauri::command;

#[command]
pub fn compile_and_run(code: String, filename: String) -> Result<String, String> {
    let temp_dir = std::env::temp_dir().join("c-shell");
    fs::create_dir_all(&temp_dir).map_err(|e| e.to_string())?;

    let file_path = temp_dir.join(&filename);
    fs::write(&file_path, code).map_err(|e| e.to_string())?;

    let binary_name = if cfg!(windows) {
        "program.exe"
    } else {
        "program"
    };

    let binary_path = temp_dir.join(binary_name);

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

        return Ok(format!(
            "❌ COMPILATION ERROR:\n\n{}",
            stderr
        ));
    }

    let run_output = Command::new(&binary_path)
        .current_dir(&temp_dir)
        .output()
        .map_err(|e| format!("Failed to run program: {}", e))?;

    let stdout = String::from_utf8_lossy(&run_output.stdout);
    let stderr = String::from_utf8_lossy(&run_output.stderr);

    let mut result = String::new();

    result.push_str("✅ COMPILATION SUCCESSFUL\n");
    result.push_str("═══════════════════════════════════════\n\n");

    if !stdout.is_empty() {
        result.push_str(&stdout);
    }

    if !stderr.is_empty() {
        result.push_str("\n⚠️ STDERR:\n");
        result.push_str(&stderr);
    }

    let _ = fs::remove_file(&file_path);
    let _ = fs::remove_file(&binary_path);

    Ok(result)
}
