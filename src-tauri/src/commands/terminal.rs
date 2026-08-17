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

/// Blocks (bounded) until the terminal service is started. `compile_and_run`
/// runs on a command thread, so a short bounded wait is safe and closes the
/// race where build output / the run command are typed before the pty exists.
pub fn wait_for_terminal(timeout: std::time::Duration) -> bool {
    let deadline = std::time::Instant::now() + timeout;
    while std::time::Instant::now() < deadline {
        if TERMINAL.get().is_some() {
            return true;
        }
        std::thread::sleep(std::time::Duration::from_millis(20));
    }
    TERMINAL.get().is_some()
}

#[command]
pub fn send_command(command: String) -> Result<(), String> {
    send_to_terminal(&command)
}

#[command]
pub fn resize_terminal(rows: u16, cols: u16) -> Result<(), String> {
    let terminal = TERMINAL.get().ok_or("Terminal not started")?;
    terminal
        .lock()
        .map_err(|_| "Terminal lock poisoned".to_string())?
        .resize(rows, cols)
}

/// Types raw input into the already-running shell session. Used both by
/// the frontend forwarding real keystrokes (`send_command`) and internally
/// by other commands — like `compile_and_run` — that need to run something
/// through the real interactive terminal instead of a detached process.
pub fn send_to_terminal(data: &str) -> Result<(), String> {
    match TERMINAL.get() {
        Some(terminal) => terminal
            .lock()
            .map_err(|_| "Terminal lock poisoned".to_string())?
            .send_command(data),
        None => Err("Terminal not started".to_string()),
    }
}

/// Tears down the PTY child (and its foreground job) on app exit. Best
/// effort: the terminal may never have been started, or may already be gone.
pub fn kill_terminal_process() {
    if let Some(terminal) = TERMINAL.get() {
        let _ = terminal.lock().unwrap_or_else(|p| p.into_inner()).kill();
    }
}