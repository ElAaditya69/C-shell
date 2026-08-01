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
            build_only,
            format_code,
            read_file,
            write_file,
            write_binary_file,
            list_directory,
            create_file,
            create_directory,
            rename_path,
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
                api.prevent_exit();
                let _ = app_handle.emit("quit-requested", ());
            }
        });
}
