use super::pty::PtyManager;
use tauri::AppHandle;

pub struct TerminalSession {
    pty: PtyManager,
}

impl TerminalSession {
    pub fn new(app: AppHandle) -> Result<Self, String> {
        Ok(Self {
            pty: PtyManager::new(app)?,
        })
    }

    pub fn send(&self, input: &str) -> Result<(), String> {
        self.pty.send(input)
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<(), String> {
        self.pty.resize(rows, cols)
    }
}