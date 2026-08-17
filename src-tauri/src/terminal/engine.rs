use super::session::TerminalSession;
use tauri::AppHandle;

pub struct TerminalEngine {
    session: TerminalSession,
}

impl TerminalEngine {
    pub fn new(app: AppHandle) -> Result<Self, String> {
        Ok(Self {
            session: TerminalSession::new(app)?,
        })
    }

    pub fn send(&self, input: &str) -> Result<(), String> {
        self.session.send(input)
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<(), String> {
        self.session.resize(rows, cols)
    }

    pub fn kill(&self) {
        self.session.kill()
    }
}