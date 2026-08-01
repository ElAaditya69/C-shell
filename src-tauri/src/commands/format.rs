use std::io::Write;
#[cfg(target_os = "macos")]
use std::path::Path;
use std::process::{Command, Stdio};
use tauri::command;

const C_SHELL_STYLE: &str = "{BasedOnStyle: LLVM, IndentWidth: 4, ColumnLimit: 100, UseTab: Never}";

fn formatter_command() -> Command {
    #[cfg(target_os = "macos")]
    {
        // Finder-launched apps may not receive Terminal's PATH, so check
        // Homebrew's standard locations first.
        for path in [
            "/opt/homebrew/bin/clang-format",
            "/usr/local/bin/clang-format",
        ] {
            if Path::new(path).is_file() {
                return Command::new(path);
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        Command::new("clang-format.exe")
    }

    #[cfg(not(target_os = "windows"))]
    {
        Command::new("clang-format")
    }
}

#[command]
pub fn format_code(code: String, filename: String) -> Result<String, String> {
    let mut formatter = formatter_command();

    let mut child = formatter
        .arg("--style")
        .arg(C_SHELL_STYLE)
        .arg("--assume-filename")
        .arg(filename)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|error| {
            if error.kind() == std::io::ErrorKind::NotFound {
                "C-Shell could not find clang-format. Install it, then restart C-Shell.".to_string()
            } else {
                format!("Failed to start clang-format: {error}")
            }
        })?;

    {
        let stdin = child
            .stdin
            .as_mut()
            .ok_or("Could not send source code to clang-format")?;

        stdin
            .write_all(code.as_bytes())
            .map_err(|error| format!("Failed to send source code to clang-format: {error}"))?;
    }

    let output = child
        .wait_with_output()
        .map_err(|error| format!("clang-format did not finish correctly: {error}"))?;

    if !output.status.success() {
        let details = String::from_utf8_lossy(&output.stderr).trim().to_string();

        return Err(if details.is_empty() {
            "clang-format could not format this file.".to_string()
        } else {
            format!("clang-format could not format this file: {details}")
        });
    }

    String::from_utf8(output.stdout)
        .map_err(|error| format!("clang-format returned invalid text: {error}"))
}
