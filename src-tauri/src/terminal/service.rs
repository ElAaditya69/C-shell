use super::engine::TerminalEngine;

pub struct TerminalService {
    engine: TerminalEngine,
}

impl TerminalService {
    pub fn new() -> Result<Self, String> {
        Ok(Self {
            engine: TerminalEngine::new()?,
        })
    }

    pub fn send_command(&mut self, command: &str) -> Result<(), String> {
        self.engine.send(command)
    }

    pub fn read_output(&mut self) -> Result<String, String> {
        self.engine.read()
    }
}