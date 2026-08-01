use serde::Serialize;
use std::fs;
use tauri::command;

#[derive(Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[command]
pub fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[command]
pub fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

/// Lists ONE level of a directory — folders are always shown (so you can
/// navigate into them), but only .c/.h files. Hidden entries (.git,
/// .DS_Store, etc.) are skipped. Folders sort before files, both
/// alphabetically. The frontend calls this again for a subfolder's own
/// path only when that folder is actually expanded, not eagerly.
#[command]
pub fn list_directory(path: String) -> Result<Vec<FileNode>, String> {
    let mut out = Vec::new();
    let entries = fs::read_dir(&path).map_err(|e| e.to_string())?;

    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let entry_path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') {
            continue;
        }

        let is_dir = entry_path.is_dir();

        if !is_dir {
            let is_c_file = entry_path
                .extension()
                .map_or(false, |ext| ext == "c" || ext == "h");
            if !is_c_file {
                continue;
            }
        }

        out.push(FileNode {
            name,
            path: entry_path.to_string_lossy().to_string(),
            is_dir,
        });
    }

    out.sort_by(|a, b| {
        b.is_dir
            .cmp(&a.is_dir)
            .then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(out)
}

#[command]
pub fn create_file(path: String) -> Result<(), String> {
    fs::write(&path, "").map_err(|e| e.to_string())
}

#[command]
pub fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir(&path).map_err(|e| e.to_string())
}

#[command]
pub fn rename_path(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path).map_err(|e| e.to_string())
}

/// Works for both files and folders — folders are removed recursively.
#[command]
pub fn delete_file(path: String) -> Result<(), String> {
    let p = std::path::Path::new(&path);
    if p.is_dir() {
        fs::remove_dir_all(p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(p).map_err(|e| e.to_string())
    }
}

fn decode_base64(input: &str) -> Result<Vec<u8>, String> {
    const ALPHABET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut table = [255u8; 256];
    for (i, &b) in ALPHABET.iter().enumerate() {
        table[b as usize] = i as u8;
    }
    table[b'=' as usize] = 0;

    let clean: String = input.chars().filter(|c| !c.is_whitespace()).collect();
    let bytes = clean.as_bytes();
    if bytes.len() % 4 != 0 {
        return Err("Invalid base64 encoding length".to_string());
    }

    let mut out = Vec::with_capacity(bytes.len() * 3 / 4);
    for chunk in bytes.chunks(4) {
        let a = table[chunk[0] as usize];
        let b = table[chunk[1] as usize];
        let c = table[chunk[2] as usize];
        let d = table[chunk[3] as usize];
        if a == 255 || b == 255 || c == 255 || d == 255 {
            return Err("Invalid base64 character".to_string());
        }
        let triple = ((a as u32) << 18) | ((b as u32) << 12) | ((c as u32) << 6) | (d as u32);
        out.push((triple >> 16) as u8);
        if chunk[2] != b'=' {
            out.push((triple >> 8) as u8);
        }
        if chunk[3] != b'=' {
            out.push(triple as u8);
        }
    }
    Ok(out)
}

#[command]
pub fn write_binary_file(path: String, base64_data: String) -> Result<(), String> {
    let clean_data = if let Some(idx) = base64_data.find(',') {
        &base64_data[idx + 1..]
    } else {
        &base64_data
    };

    let bytes = decode_base64(clean_data)?;
    fs::write(&path, bytes).map_err(|e| e.to_string())
}
