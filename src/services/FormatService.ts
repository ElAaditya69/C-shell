import { invoke } from "@tauri-apps/api/core";

export class FormatService {
  static async format(code: string, filename: string): Promise<string> {
    return await invoke("format_code", { code, filename });
  }
}