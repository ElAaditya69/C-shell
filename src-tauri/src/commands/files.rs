use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{command, State};

#[derive(Serialize, Clone)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

// ---------------------------------------------------------------------------
// Path sandbox. Every file command canonicalizes its target and rejects any
// path that does not resolve inside the opened workspace root (set via
// set_workspace). Canonicalization follows symlinks, so a symlink inside the
// workspace that points outside resolves outside and is rejected. If no
// workspace has been opened, every file command is rejected.
// ---------------------------------------------------------------------------

/// Tauri-managed state: the canonical root of the workspace the explorer is
/// rooted at. `None` means no folder has been opened — all file commands
/// fail. `Mutex` because set_workspace must mutate it; `State<T>` only gives
/// shared access.
pub struct Workspace {
    pub root: Mutex<Option<PathBuf>>,
}

fn canon(dir: &str) -> Result<PathBuf, String> {
    Path::new(dir)
        .canonicalize()
        .map_err(|e| format!("Invalid path: {}", e))
}

/// Component-wise prefix check. `Path::starts_with` is already
/// component-wise (no `/foo/bar` vs `/foo/bar2` false positives); on
/// Windows the comparison must ignore case, so both sides are lowercased
/// per component.
fn is_under(path: &Path, root: &Path) -> bool {
    #[cfg(windows)]
    {
        let p: Vec<String> = path
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_lowercase())
            .collect();
        let r: Vec<String> = root
            .components()
            .map(|c| c.as_os_str().to_string_lossy().to_lowercase())
            .collect();
        p.len() >= r.len() && p[..r.len()] == r[..]
    }
    #[cfg(not(windows))]
    {
        path.starts_with(root)
    }
}

fn is_allowed(ws: &Workspace, canon_path: &Path) -> Result<(), String> {
    let root = ws
        .root
        .lock()
        .map_err(|_| "Workspace state poisoned".to_string())?;
    let inside = root
        .as_ref()
        .map(|w| is_under(canon_path, w))
        .unwrap_or(false);
    if inside {
        Ok(())
    } else {
        Err("Path is outside the workspace".to_string())
    }
}

/// Absolutizes a command-supplied path (which may arrive relative) without
/// canonicalizing — the target may not exist yet (create/write).
fn absolutize(req: &str) -> Result<PathBuf, String> {
    let p = PathBuf::from(req);
    if p.is_absolute() {
        Ok(p)
    } else {
        std::env::current_dir()
            .map(|c| c.join(p))
            .map_err(|e| format!("Could not resolve path: {}", e))
    }
}

/// Resolves an existing path and checks it is inside the workspace.
fn resolve_existing(ws: &Workspace, req: &str) -> Result<PathBuf, String> {
    let c = canon(req)?;
    is_allowed(ws, &c)?;
    Ok(c)
}

/// Resolves a not-yet-existing path (create/overwrite): the PARENT must
/// exist and be inside the workspace; the final component is then joined
/// back on, with traversal/`.`/`..` name components rejected.
fn resolve_new(ws: &Workspace, req: &str) -> Result<PathBuf, String> {
    let abs = absolutize(req)?;
    let name = abs
        .file_name()
        .ok_or_else(|| "Invalid path".to_string())?
        .to_string_lossy()
        .to_string();
    if name == "." || name == ".." || name.contains('/') || name.contains('\\') {
        return Err("Path is outside the workspace".to_string());
    }
    let parent = abs.parent().ok_or_else(|| "Invalid path".to_string())?;
    let canon_parent = canon(&parent.to_string_lossy())?;
    is_allowed(ws, &canon_parent)?;
    Ok(canon_parent.join(name))
}

/// Sets (or clears) the workspace folder the explorer is rooted at. Called
/// when the user opens/closes a folder.
#[command]
pub fn set_workspace(
    dir: Option<String>,
    ws: State<'_, Workspace>,
) -> Result<(), String> {
    let mut root = ws
        .root
        .lock()
        .map_err(|_| "Workspace state poisoned".to_string())?;
    *root = match dir {
        Some(d) => Some(canon(&d)?),
        None => None,
    };
    Ok(())
}

/// Kept for frontend signature compatibility. The sandbox is workspace-only,
/// so nothing is granted here — validated paths are simply ignored.
#[command]
pub fn authorize_path(path: String) -> Result<(), String> {
    let _ = canon(&path)?;
    Ok(())
}

// ---------------------------------------------------------------------------
// File commands (all sandbox-checked).
// ---------------------------------------------------------------------------

#[command]
pub fn read_file(path: String, ws: State<'_, Workspace>) -> Result<String, String> {
    let p = resolve_existing(ws.inner(), &path)?;
    fs::read_to_string(&p).map_err(|e| e.to_string())
}

#[command]
pub fn write_file(
    path: String,
    contents: String,
    ws: State<'_, Workspace>,
) -> Result<(), String> {
    let p = resolve_new(ws.inner(), &path)?;
    fs::write(&p, contents).map_err(|e| e.to_string())
}

/// Lists ONE level of a directory — folders are always shown (so you can
/// navigate into them), but only .c/.h files. Hidden entries (.git,
/// .DS_Store, etc.) are skipped. Folders sort before files, both
/// alphabetically. The frontend calls this again for a subfolder's own
/// path only when that folder is actually expanded, not eagerly.
#[command]
pub fn list_directory(
    path: String,
    ws: State<'_, Workspace>,
) -> Result<Vec<FileNode>, String> {
    let dir_path = resolve_existing(ws.inner(), &path)?;
    let mut out = Vec::new();
    let entries = fs::read_dir(&dir_path).map_err(|e| e.to_string())?;

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
pub fn create_file(path: String, ws: State<'_, Workspace>) -> Result<(), String> {
    let p = resolve_new(ws.inner(), &path)?;
    fs::write(&p, "").map_err(|e| e.to_string())
}

#[command]
pub fn create_directory(
    path: String,
    ws: State<'_, Workspace>,
) -> Result<(), String> {
    let p = resolve_new(ws.inner(), &path)?;
    fs::create_dir(&p).map_err(|e| e.to_string())
}

#[command]
pub fn rename_path(
    old_path: String,
    new_path: String,
    ws: State<'_, Workspace>,
) -> Result<(), String> {
    let old = resolve_existing(ws.inner(), &old_path)?;
    let new = resolve_new(ws.inner(), &new_path)?;
    fs::rename(&old, &new).map_err(|e| e.to_string())
}

/// Works for both files and folders — folders are removed recursively.
#[command]
pub fn delete_file(path: String, ws: State<'_, Workspace>) -> Result<(), String> {
    let p = resolve_existing(ws.inner(), &path)?;
    if p.is_dir() {
        fs::remove_dir_all(&p).map_err(|e| e.to_string())
    } else {
        fs::remove_file(&p).map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::OnceLock;

    // Tests are serialized so they don't stomp each other's temp dirs.
    static TEST_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

    fn with_workspace<F: FnOnce(&Workspace) -> ()>(dir: &str, f: F) {
        let _guard = TEST_LOCK
            .get_or_init(|| Mutex::new(()))
            .lock()
            .unwrap_or_else(|p| p.into_inner());
        let ws = Workspace {
            root: Mutex::new(Some(canon(dir).unwrap())),
        };
        f(&ws);
    }

    fn without_workspace<F: FnOnce(&Workspace) -> ()>(f: F) {
        let _guard = TEST_LOCK
            .get_or_init(|| Mutex::new(()))
            .lock()
            .unwrap_or_else(|p| p.into_inner());
        let ws = Workspace {
            root: Mutex::new(None),
        };
        f(&ws);
    }

    #[test]
    fn rejects_paths_outside_workspace() {
        let w = std::env::temp_dir().join("c-shell-sandbox-test-root");
        let sub = w.join("nested");
        fs::create_dir_all(&sub).unwrap();

        // Ensure a sibling is NOT under w (e.g. temp_dir's parent is safe).
        let sibling = w.with_file_name("c-shell-sandbox-test-outside");
        fs::create_dir_all(&sibling).unwrap();

        with_workspace(&w.to_string_lossy(), |ws| {
            // inside — ok
            assert!(resolve_existing(ws, &sub.to_string_lossy()).is_ok());
            // outside — denied
            assert!(resolve_existing(ws, &sibling.to_string_lossy()).is_err());
            assert!(resolve_new(ws, &sibling.join("x.c").to_string_lossy()).is_err());
        });

        fs::remove_dir_all(&w).ok();
        fs::remove_dir_all(&sibling).ok();
    }

    #[test]
    fn no_workspace_rejects_everything() {
        let p = std::env::temp_dir().join("c-shell-sandbox-test-nows");
        fs::create_dir_all(&p).unwrap();
        without_workspace(|ws| {
            assert_eq!(
                resolve_existing(ws, &p.to_string_lossy()).unwrap_err(),
                "Path is outside the workspace"
            );
            assert_eq!(
                resolve_new(ws, &p.join("x.c").to_string_lossy()).unwrap_err(),
                "Path is outside the workspace"
            );
        });
        fs::remove_dir_all(&p).ok();
    }

    #[test]
    fn traversal_in_new_path_is_rejected() {
        let w = std::env::temp_dir().join("c-shell-sandbox-test-traversal");
        fs::create_dir_all(&w).unwrap();
        with_workspace(&w.to_string_lossy(), |ws| {
            // ".." as a name component must not escape the workspace.
            assert!(resolve_new(ws, &w.join("..").join("escape.c").to_string_lossy()).is_err());
            fs::write(w.join("ok.c"), "").unwrap();
        });
        fs::remove_dir_all(&w).ok();
    }

    #[test]
    fn symlink_outside_workspace_is_denied() {
        // canonicalize() follows symlinks, so a link inside the workspace
        // that points outside must be rejected.
        #[cfg(unix)]
        {
            let w = std::env::temp_dir().join("c-shell-sandbox-test-symlink");
            let outside = std::env::temp_dir().join("c-shell-sandbox-test-symlink-out");
            fs::create_dir_all(&w).unwrap();
            fs::write(&outside, "secret").unwrap();
            #[cfg(unix)]
            {
                std::os::unix::fs::symlink(&outside, w.join("secret.c")).unwrap();
            }
            with_workspace(&w.to_string_lossy(), |ws| {
                assert!(resolve_existing(ws, &w.join("secret.c").to_string_lossy()).is_err());
            });
            fs::remove_dir_all(&w).ok();
            fs::remove_file(&outside).ok();
        }
    }

    #[test]
    fn write_file_creates_within_workspace() {
        let w = std::env::temp_dir().join("c-shell-sandbox-test-write");
        fs::create_dir_all(&w).unwrap();
        with_workspace(&w.to_string_lossy(), |ws| {
            let target = resolve_new(ws, &w.join("new.c").to_string_lossy()).unwrap();
            fs::write(&target, "int main(void){return 0;}\n").unwrap();
            assert_eq!(
                fs::read_to_string(w.join("new.c")).unwrap(),
                "int main(void){return 0;}\n"
            );
        });
        fs::remove_dir_all(&w).ok();
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
pub fn write_binary_file(
    path: String,
    base64_data: String,
    ws: State<'_, Workspace>,
) -> Result<(), String> {
    let clean_data = if let Some(idx) = base64_data.find(',') {
        &base64_data[idx + 1..]
    } else {
        &base64_data
    };

    let bytes = decode_base64(clean_data)?;
    let p = resolve_new(ws.inner(), &path)?;
    fs::write(&p, bytes).map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// Crash-backup export/import. These are deliberately NOT workspace-sandboxed:
// a crash may leave the app unable to open any workspace at all, so the
// recovery flow must read/write the backup JSON at a path the user picks with
// the native save/open dialogs (themselves user-confirmed surface). Scope is
// limited to these two text commands.
// ---------------------------------------------------------------------------

#[command]
pub fn export_backup(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

#[command]
pub fn import_backup(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}
