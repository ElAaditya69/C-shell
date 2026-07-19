use crate::terminal::engine::TerminalEngine;
use std::sync::{Mutex, OnceLock};
use tauri::command;

static TERMINAL: OnceLock<Mutex<TerminalEngine>> = OnceLock::new();

#[command]
pub fn start_terminal() -> Result<(), String> {
    TERMINAL
        .set(Mutex::new(TerminalEngine::new()?))
        .map_err(|_| "Terminal already started".to_string())?;

    Ok(())
}

#[command]
pub fn send_command(command: String) -> Result<(), String> {
    let terminal = TERMINAL
        .get()
        .ok_or("Terminal not started")?;

    terminal.lock().unwrap().send(&command)
}

#[command]
pub fn read_output() -> Result<String, String> {
    let terminal = TERMINAL
        .get()
        .ok_or("Terminal not started")?;

    terminal.lock().unwrap().read()
}
