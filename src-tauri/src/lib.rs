mod commands;
mod terminal;

use commands::*;
use tauri::Emitter;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(commands::files::Workspace {
            root: std::sync::Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            compile_and_run,
            build_only,
            run_python,
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
            confirm_quit,
            get_home_dir,
            load_settings,
            save_settings,
            clean_build,
            set_workspace,
            authorize_path,
            export_backup,
            import_backup
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
                let _ = app_handle.emit("quit-requested", ());
            }
            tauri::RunEvent::Exit => {
                // Reap the PTY child and its shell before the process goes
                // away, so a running C program can't outlive the editor.
                let _ = kill_terminal_process();
            }
            _ => {}
        });
}
