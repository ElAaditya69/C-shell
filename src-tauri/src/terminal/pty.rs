use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::{
    io::{Read, Write},
    sync::{Arc, Mutex},
    thread,
};

pub struct PtyManager {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    output: Arc<Mutex<String>>,
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

        let mut reader = pair
            .master
            .try_clone_reader()
            .map_err(|e| e.to_string())?;

        let writer = pair
            .master
            .take_writer()
            .map_err(|e| e.to_string())?;

        let output = Arc::new(Mutex::new(String::new()));

        let output_clone = output.clone();

        thread::spawn(move || {
            let mut buffer = [0u8; 4096];

            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break,

                    Ok(size) => {
                        let text =
                            String::from_utf8_lossy(&buffer[..size]).to_string();

                        let mut out = output_clone.lock().unwrap();

                        out.push_str(&text);
                    }

                    Err(_) => break,
                }
            }
        });

        Ok(Self {
            writer: Arc::new(Mutex::new(writer)),
            output,
        })
    }

    pub fn send(&mut self, data: &str) -> Result<(), String> {
        let mut writer = self.writer.lock().unwrap();

        writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;

        writer.flush().map_err(|e| e.to_string())
    }

    pub fn read_line(&mut self) -> Result<String, String> {
        let mut output = self.output.lock().unwrap();

        let text = output.clone();

        output.clear();

        Ok(text)
    }
}