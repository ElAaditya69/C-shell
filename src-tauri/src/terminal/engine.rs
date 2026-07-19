use super::pty::PtyManager;

pub struct TerminalEngine {
    pty: PtyManager,
}

impl TerminalEngine {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            pty: PtyManager::new()?,
        })
    }

    pub fn send(&mut self, command: &str) -> Result<(), String> {
        self.pty.send(command)
    }

    pub fn read(&mut self) -> Result<String, String> {
        self.pty.read_line()
    }
}
