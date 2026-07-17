use crate::terminal::pty::PtyManager;
use std::sync::{Mutex, OnceLock};
use tauri::command;

static TERMINAL: OnceLock<Mutex<PtyManager>> = OnceLock::new();

#[command]
pub fn start_terminal() -> Result<(), String> {
    TERMINAL
        .set(Mutex::new(PtyManager::new()?))
        .map_err(|_| "Terminal already started".to_string())?;

    Ok(())
}

#[command]
pub fn send_command(command: String) -> Result<(), String> {
    let terminal = TERMINAL
        .get()
        .ok_or("Terminal not started")?;

    let mut terminal = terminal.lock().unwrap();

    terminal.send(&command)
}

#[command]
pub fn read_output() -> Result<String, String> {
    let terminal = TERMINAL
        .get()
        .ok_or("Terminal not started")?;

    let mut terminal = terminal.lock().unwrap();

   terminal.read_line().map(|line| {
    println!("OUTPUT: {}", line);
    line
})
}
