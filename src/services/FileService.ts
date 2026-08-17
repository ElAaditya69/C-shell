import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
  children?: FileNode[];
}

/**
 * Splits a file path into its components on BOTH separators ("/" and "\\"),
 * so Windows paths (C:\src\main.c) work the same as POSIX ones. Use instead
 * of path.split("/") or path.lastIndexOf("/") when the path may come from
 * either platform.
 */
export function splitPath(path: string): string[] {
  return path.split(/[/\\]+/).filter(Boolean);
}

/**
 * Returns the directory portion of a path, honoring both separators.
 * Returns "" when there is no separator (the path is a bare file name).
 * Never computes substring(0, -1), so a trailing separator or a
 * no-separator path can't produce a bogus negative-index slice.
 */
export function dirName(path: string): string {
  const lastSep = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  if (lastSep < 0) return "";
  // Collapse trailing separators (Windows "C:\dir\", POSIX "/dir/") so the
  // result is a clean parent path, not an empty slice.
  let end = lastSep;
  while (end > 0 && (path[end - 1] === "/" || path[end - 1] === "\\")) {
    end--;
  }
  return path.substring(0, end);
}

export class FileService {
  static async readFile(path: string): Promise<string> {
    return await invoke("read_file", { path });
  }

  static async writeFile(path: string, contents: string): Promise<void> {
    await invoke("write_file", { path, contents });
  }

  static async writeBinaryFile(path: string, base64Data: string): Promise<void> {
    await invoke("write_binary_file", { path, base64Data });
  }

  static async createFile(path: string): Promise<void> {
    await invoke("create_file", { path });
  }

  static async createDirectory(path: string): Promise<void> {
    await invoke("create_directory", { path });
  }

  static async renamePath(oldPath: string, newPath: string): Promise<void> {
    await invoke("rename_path", { oldPath, newPath });
  }

  static async deleteFile(path: string): Promise<void> {
    await invoke("delete_file", { path });
  }

  static async listDirectory(path: string): Promise<FileNode[]> {
    return await invoke("list_directory", { path });
  }

  static async setWorkspace(dir: string | null): Promise<void> {
    await invoke("set_workspace", { dir });
  }

  static async authorizePath(path: string): Promise<void> {
    await invoke("authorize_path", { path });
  }

  static async saveDialog(): Promise<string | null> {
    const picked = await save({
      defaultPath: "Untitled.c",
      filters: [{ name: "C Source", extensions: ["c"] }],
    });
    if (picked) await invoke("authorize_path", { path: picked });
    return picked;
  }

  static async saveJsonDialog(defaultName: string): Promise<string | null> {
    const picked = await save({
      defaultPath: defaultName,
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (picked) await invoke("authorize_path", { path: picked });
    return picked;
  }

  static async openFileDialog(): Promise<string | null> {
    const picked = (await open({
      multiple: false,
      directory: false,
      filters: [{ name: "C Source", extensions: ["c", "h"] }],
    })) as string | null;
    if (picked) await invoke("authorize_path", { path: picked });
    return picked;
  }

  static async openJsonDialog(): Promise<string | null> {
    const picked = (await open({
      multiple: false,
      directory: false,
      filters: [{ name: "JSON", extensions: ["json"] }],
    })) as string | null;
    if (picked) await invoke("authorize_path", { path: picked });
    return picked;
  }

  /** Unscoped crash-backup IO — paths come only from the native dialogs. */
  static async exportBackup(path: string, contents: string): Promise<void> {
    await invoke("export_backup", { path, contents });
  }

  static async importBackup(path: string): Promise<string> {
    return await invoke("import_backup", { path });
  }

  static async openFolder(): Promise<string | null> {
    const picked = (await open({
      directory: true,
      multiple: false,
    })) as string | null;
    if (picked) await invoke("set_workspace", { dir: picked });
    return picked;
  }

  static async startTerminal(): Promise<void> {
    await invoke("start_terminal");
  }

  static async sendCommand(command: string): Promise<void> {
    await invoke("send_command", { command });
  }

  static async resizeTerminal(rows: number, cols: number): Promise<void> {
    await invoke("resize_terminal", { rows, cols });
  }
}
