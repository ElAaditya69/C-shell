use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::io::{Read, Write};

pub struct PtyManager {
    writer: Box<dyn Write + Send>,
    reader: Box<dyn Read + Send>,
}

impl PtyManager {
    pub fn new() -> Result<Self, String> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows: 30,
                cols: 120,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let cmd = CommandBuilder::new("/bin/zsh");

        pair.slave
            .spawn_command(cmd)
            .map_err(|e| e.to_string())?;

        let reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| e.to_string())?;

        let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

        Ok(Self { reader, writer })
    }

    pub fn send(&mut self, command: &str) -> Result<(), String> {
        self.writer
            .write_all(command.as_bytes())
            .map_err(|e| e.to_string())?;

        self.writer
            .write_all(b"\n")
            .map_err(|e| e.to_string())?;

        self.writer.flush().map_err(|e| e.to_string())
    }

    pub fn read_line(&mut self) -> Result<String, String> {
        let mut buffer = [0u8; 4096];

        let size = self
            .reader
            .read(&mut buffer)
            .map_err(|e| e.to_string())?;

        Ok(String::from_utf8_lossy(&buffer[..size]).to_string())
    }
}
