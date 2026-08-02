use tauri::{command, AppHandle};

/// Called by the frontend once it has decided quitting is actually OK
/// (no unsaved changes, or the user confirmed anyway). The initial quit
/// request was already intercepted and prevented on the Rust side.
#[command]
pub fn confirm_quit(app: AppHandle) {
    app.exit(0);
}

/// Returns the current user's home directory so the frontend can open
/// a sensible default folder instead of a hardcoded path.
#[command]
pub fn get_home_dir() -> Result<String, String> {
    #[cfg(target_os = "windows")]
    {
        std::env::var("USERPROFILE")
            .map_err(|_| "Could not determine home directory".to_string())
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::env::var("HOME")
            .map_err(|_| "Could not determine home directory".to_string())
    }
}
