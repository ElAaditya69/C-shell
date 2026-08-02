import { invoke } from "@tauri-apps/api/core";

export class CompileService {
  static async compileAndRun(code: string, filename: string): Promise<void> {
    await invoke("compile_and_run", { code, filename });
  }

  static async build(code: string, filename: string): Promise<void> {
    await invoke("build_only", { code, filename });
  }

  static async cleanBuild(): Promise<void> {
    await invoke("clean_build");
  }
}
