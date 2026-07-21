use crate::terminal::{
    events::TERMINAL_OUTPUT_EVENT,
    service::TerminalService,
};
use std::sync::{Mutex, OnceLock};
use tauri::command;

static TERMINAL: OnceLock<Mutex<TerminalService>> = OnceLock::new();

#[command]
pub fn start_terminal() -> Result<(), String> {
    println!("Event channel ready: {}", TERMINAL_OUTPUT_EVENT);

    TERMINAL
        .set(Mutex::new(TerminalService::new()?))
        .map_err(|_| "Terminal already started".to_string())?;

    Ok(())
}

#[command]
pub fn send_command(command: String) -> Result<(), String> {
    println!("COMMAND RECEIVED: {:?}", command);

    let terminal = TERMINAL
        .get()
        .ok_or("Terminal not started")?;

    terminal
        .lock()
        .unwrap()
        .send_command(&command)
}

#[command]
pub fn read_output() -> Result<String, String> {
    let terminal = TERMINAL
        .get()
        .ok_or("Terminal not started")?;

    let output = terminal
        .lock()
        .unwrap()
        .read_output()?;

    if !output.is_empty() {
        println!("PTY OUTPUT: {:?}", output);
    }

    Ok(output)
}
