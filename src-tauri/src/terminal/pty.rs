use portable_pty::{native_pty_system, CommandBuilder, MasterPty, PtySize};
use std::{
    io::{Read, Write},
    sync::{Arc, Mutex},
    thread,
};
use tauri::{AppHandle, Emitter};

use super::events::TERMINAL_OUTPUT_EVENT;

pub struct PtyManager {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
}

impl PtyManager {
    pub fn new(app: AppHandle) -> Result<Self, String> {
        let pty_system = native_pty_system();

        let pair = pty_system
            .openpty(PtySize {
                rows: 30,
                cols: 120,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())?;

        let mut cmd = CommandBuilder::new("/bin/zsh");
        cmd.arg("-l"); // login shell, so it behaves like a real terminal (.zprofile etc.)

        
        cmd.env("TERM", "xterm-256color");

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

        let master = Arc::new(Mutex::new(pair.master));

        // Push output to the frontend as it arrives, instead of buffering
        // it for the frontend to poll for.
        thread::spawn(move || {
            let mut buffer = [0u8; 4096];

            loop {
                match reader.read(&mut buffer) {
                    Ok(0) => break, // shell exited / pty closed
                    Ok(size) => {
                        let text = String::from_utf8_lossy(&buffer[..size]).to_string();
                        // If emit fails (e.g. window already closed), just stop —
                        // there's no frontend left to receive it.
                        if app.emit(TERMINAL_OUTPUT_EVENT, text).is_err() {
                            break;
                        }
                    }
                    Err(_) => break,
                }
            }
        });

        Ok(Self {
            writer: Arc::new(Mutex::new(writer)),
            master,
        })
    }

    pub fn send(&self, data: &str) -> Result<(), String> {
        let mut writer = self.writer.lock().unwrap();
        writer.write_all(data.as_bytes()).map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<(), String> {
        self.master
            .lock()
            .unwrap()
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())
    }
}