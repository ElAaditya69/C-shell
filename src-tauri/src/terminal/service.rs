use super::engine::TerminalEngine;
use tauri::AppHandle;

pub struct TerminalService {
    engine: TerminalEngine,
}

impl TerminalService {
    pub fn new(app: AppHandle) -> Result<Self, String> {
        Ok(Self {
            engine: TerminalEngine::new(app)?,
        })
    }

    pub fn send_command(&self, command: &str) -> Result<(), String> {
        self.engine.send(command)
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<(), String> {
        self.engine.resize(rows, cols)
    }

    pub fn kill(&self) {
        self.engine.kill()
    }
}