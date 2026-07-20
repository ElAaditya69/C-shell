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

    pub fn send(&mut self, input: &str) -> Result<(), String> {
        self.pty.send(input)
    }

    pub fn read(&mut self) -> Result<String, String> {
        self.pty.read_line()
    }
}
