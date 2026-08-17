import { invoke } from "@tauri-apps/api/core";

export interface RunConfig {
  args: string[];
  stdinFile?: string;
  cwd?: string;
}

export class CompileService {
  static async compileAndRun(
    code: string,
    filename: string,
    standard?: string,
    config?: RunConfig,
    workspaceDir?: string | null
  ): Promise<void> {
    await invoke("compile_and_run", { code, filename, standard, config, workspaceDir });
  }

  static async build(
    code: string,
    filename: string,
    standard?: string,
    workspaceDir?: string | null
  ): Promise<void> {
    await invoke("build_only", { code, filename, standard, workspaceDir });
  }

  static async runPython(filePath: string): Promise<void> {
    await invoke("run_python", { filePath });
  }

  static async cleanBuild(): Promise<void> {
    await invoke("clean_build");
  }
}
