import { invoke } from "@tauri-apps/api/core";

export class CompileService {
  static async compileAndRun(
    code: string,
    filename: string
  ): Promise<string> {
    return await invoke("compile_and_run", {
      code,
      filename,
    });
  }
}
