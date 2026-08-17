use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use std::{
    io::{Read, Write},
    sync::{Arc, Mutex, atomic::{AtomicBool, Ordering}},
    thread::{self, JoinHandle},
};
use tauri::{AppHandle, Emitter};

use super::events::TERMINAL_OUTPUT_EVENT;

pub struct PtyManager {
    writer: Arc<Mutex<Box<dyn Write + Send>>>,
    master: Arc<Mutex<Box<dyn MasterPty + Send>>>,
    child: Mutex<Box<dyn Child + Send + Sync>>,
    reader_thread: Mutex<Option<JoinHandle<()>>>,
    shutting_down: Arc<AtomicBool>,
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

        #[cfg(target_os = "windows")]
        let mut cmd = CommandBuilder::new("cmd.exe");

        #[cfg(not(target_os = "windows"))]
        let mut cmd = {
            let default_shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/sh".to_string());
            let mut command = CommandBuilder::new(default_shell);
            command.arg("-l");
            command
        };


        cmd.env("TERM", "xterm-256color");

        let child = pair
            .slave
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
        let shutting_down = Arc::new(AtomicBool::new(false));
        let sd_flag = shutting_down.clone();

        // Push output to the frontend as it arrives, instead of buffering
        // it for the frontend to poll for.
        let reader_thread = thread::spawn(move || {
            let mut buffer = [0u8; 4096];

            loop {
                if sd_flag.load(Ordering::Relaxed) {
                    break; // app is quitting — stop pushing
                }
                match reader.read(&mut buffer) {
                    Ok(0) => break, // shell exited / pty closed (EOF)
                    Ok(size) => {
                        let text = String::from_utf8_lossy(&buffer[..size]).to_string();
                        // If emit fails (e.g. window already closed), just stop —
                        // there's no frontend left to receive it.
                        if app.emit(TERMINAL_OUTPUT_EVENT, text).is_err() {
                            break;
                        }
                    }
                    // Transient read errors (EINTR, pty-level hiccups) are
                    // not fatal: only EOF, the shutdown flag, or a dead
                    // frontend stops the loop. Otherwise an infinite-loop
                    // program would stop streaming output on the first
                    // spurious error.
                    Err(_) => {
                        thread::sleep(std::time::Duration::from_millis(5));
                    }
                }
            }
        });

        Ok(Self {
            writer: Arc::new(Mutex::new(writer)),
            master,
            child: Mutex::new(child),
            reader_thread: Mutex::new(Some(reader_thread)),
            shutting_down,
        })
    }

    pub fn send(&self, data: &str) -> Result<(), String> {
        let mut writer = self
            .writer
            .lock()
            .map_err(|_| "Terminal writer lock poisoned".to_string())?;
        writer
            .write_all(data.as_bytes())
            .map_err(|e| e.to_string())?;
        writer.flush().map_err(|e| e.to_string())
    }

    pub fn resize(&self, rows: u16, cols: u16) -> Result<(), String> {
        self.master
            .lock()
            .map_err(|_| "Terminal master lock poisoned".to_string())?
            .resize(PtySize {
                rows,
                cols,
                pixel_width: 0,
                pixel_height: 0,
            })
            .map_err(|e| e.to_string())
    }

    /// Terminates the shell (and, via the pty foreground signal on Unix,
    /// whatever the shell is currently running), reaps the child, and joins
    /// the reader thread. Called once on app exit. Idempotent: the
    /// shutting_down flag makes later calls become no-ops.
    pub fn kill(&self) {
        if self
            .shutting_down
            .swap(true, Ordering::SeqCst)
        {
            return; // already killed
        }

        // Unix: signal the pty's foreground process group — this reaches the
        // shell's current foreground job (e.g. a running C program), not just
        // the shell itself. A program stuck in an infinite loop is SIGTERMed;
        // if it ignores SIGTERM it dies with SIGKILL on the second pass.
        #[cfg(unix)]
        {
            let master_guard = self.master.lock().unwrap_or_else(|p| p.into_inner());
            if let Some(pgid) = master_guard.process_group_leader() {
                unsafe {
                    if libc::kill(pgid, libc::SIGTERM) == 0 {
                        std::thread::sleep(std::time::Duration::from_millis(300));
                        let _ = libc::kill(pgid, libc::SIGKILL);
                    }
                }
            }
        }

        // Kill the shell itself and reap it. Killing the child closes the
        // pty master's read end, so the reader thread hits EOF (read → Ok(0))
        // and exits on its own; join it so no thread outlives the app.
        {
            let mut child = self.child.lock().unwrap_or_else(|p| p.into_inner());
            let _ = child.kill();
            let _ = child.wait();
        }
        self.join_reader();
    }

    /// Waits (bounded) for the reader thread to finish. Once the child is
    /// dead the pty read returns EOF and the thread exits; the bound is a
    /// backstop so kill() can never hang app shutdown.
    fn join_reader(&self) {
        let handle = {
            let mut slot = self.reader_thread.lock().unwrap_or_else(|p| p.into_inner());
            slot.take()
        };
        if let Some(h) = handle {
            let _ = h.join();
        }
    }
}