mod commands;
mod terminal;

use commands::*;
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            compile_and_run,
            read_file,
            write_file,
            list_directory,
            create_file,
            delete_file,
            start_terminal,
            send_command,
            resize_terminal,
            confirm_quit
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                // Always intercept first — the frontend decides whether
                // it's actually OK to quit (checking for unsaved changes)
                // and calls confirm_quit if so. This is the only way to
                // reliably catch Cmd+Q / the Quit menu on macOS, which
                // bypass the window's own close-requested event entirely.
                api.prevent_exit();
                let _ = app_handle.emit("quit-requested", ());
            }
        });
}
