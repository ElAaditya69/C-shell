use crate::terminal::service::TerminalService;
use std::sync::{Mutex, OnceLock};
use tauri::{command, AppHandle};

static TERMINAL: OnceLock<Mutex<TerminalService>> = OnceLock::new();

#[command]
pub fn start_terminal(app: AppHandle) -> Result<(), String> {
    TERMINAL
        .set(Mutex::new(TerminalService::new(app)?))
        .map_err(|_| "Terminal already started".to_string())
}

#[command]
pub fn send_command(command: String) -> Result<(), String> {
    send_to_terminal(&command)
}

#[command]
pub fn resize_terminal(rows: u16, cols: u16) -> Result<(), String> {
    let terminal = TERMINAL.get().ok_or("Terminal not started")?;
    terminal.lock().unwrap().resize(rows, cols)
}

/// Types raw input into the already-running shell session. Used both by
/// the frontend forwarding real keystrokes (`send_command`) and internally
/// by other commands — like `compile_and_run` — that need to run something
/// through the real interactive terminal instead of a detached process.
pub fn send_to_terminal(data: &str) -> Result<(), String> {
    let terminal = TERMINAL.get().ok_or("Terminal not started")?;
    terminal.lock().unwrap().send_command(data)
}