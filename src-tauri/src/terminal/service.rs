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

    pub fn send(&mut self, input: &str) -> Result<(), String> {
        self.engine.send(input)
    }

    pub fn read(&mut self) -> Result<String, String> {
        self.engine.read()
    }
}
