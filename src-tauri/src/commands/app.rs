use tauri::{command, AppHandle};

/// Called by the frontend once it has decided quitting is actually OK
/// (no unsaved changes, or the user confirmed anyway). The initial quit
/// request was already intercepted and prevented on the Rust side.
#[command]
pub fn confirm_quit(app: AppHandle) {
    app.exit(0);
}
