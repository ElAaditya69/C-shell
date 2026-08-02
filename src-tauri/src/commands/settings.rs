use std::fs;
use std::path::PathBuf;
use tauri::command;

fn get_settings_file_path() -> Result<PathBuf, String> {
    #[cfg(target_os = "windows")]
    let base_dir = std::env::var("USERPROFILE").map_err(|_| "Could not determine home directory".to_string())?;

    #[cfg(not(target_os = "windows"))]
    let base_dir = std::env::var("HOME").map_err(|_| "Could not determine home directory".to_string())?;

    let dir = PathBuf::from(base_dir).join(".c-shell");
    Ok(dir.join("settings.json"))
}

#[command]
pub fn load_settings() -> Result<String, String> {
    let file_path = get_settings_file_path()?;
    if !file_path.exists() {
        return Ok("{}".to_string());
    }
    fs::read_to_string(file_path).map_err(|e| e.to_string())
}

#[command]
pub fn save_settings(settings_json: String) -> Result<(), String> {
    let file_path = get_settings_file_path()?;
    if let Some(parent) = file_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(file_path, settings_json).map_err(|e| e.to_string())
}
