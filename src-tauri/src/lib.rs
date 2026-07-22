
mod commands;
mod terminal;

use commands::*;



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
            resize_terminal
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}