use super::session::TerminalSession;

pub struct TerminalEngine {
    session: TerminalSession,
}

impl TerminalEngine {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            session: TerminalSession::new()?,
        })
    }

    pub fn send(&mut self, input: &str) -> Result<(), String> {
        self.session.send(input)
    }

    pub fn read(&mut self) -> Result<String, String> {
        self.session.read()
    }
}