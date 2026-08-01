import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";

export interface FileNode {
  name: string;
  path: string;
  is_dir: boolean;
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

  static async saveDialog(): Promise<string | null> {
    return await save({
      defaultPath: "Untitled.c",
      filters: [{ name: "C Source", extensions: ["c"] }],
    });
  }

  static async openFileDialog(): Promise<string | null> {
    return (await open({
      multiple: false,
      directory: false,
      filters: [{ name: "C Source", extensions: ["c", "h"] }],
    })) as string | null;
  }

  static async openFolder(): Promise<string | null> {
    return (await open({
      directory: true,
      multiple: false,
    })) as string | null;
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
