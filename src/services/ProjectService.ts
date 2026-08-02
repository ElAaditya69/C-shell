import { FileService } from "./FileService";

export interface ProjectConfig {
  name: string;
  compiler: "gcc" | "clang";
  buildConfig: "debug" | "release";
  compilerFlags: string[];
  includeDirectories: string[];
  libraryDirectories: string[];
  runArguments: string[];
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  name: "C-Shell Project",
  compiler: "gcc",
  buildConfig: "debug",
  compilerFlags: ["-Wall", "-Wextra"],
  includeDirectories: [],
  libraryDirectories: [],
  runArguments: [],
};

export class ProjectService {
  static async loadProjectConfig(dirPath: string): Promise<ProjectConfig> {
    const configPath = `${dirPath}/.cshell.json`;
    try {
      const json = await FileService.readFile(configPath);
      if (json) {
        const parsed = JSON.parse(json);
        return { ...DEFAULT_PROJECT_CONFIG, ...parsed };
      }
    } catch {
      // Default fallback
    }
    return DEFAULT_PROJECT_CONFIG;
  }

  static async saveProjectConfig(
    dirPath: string,
    config: ProjectConfig
  ): Promise<void> {
    const configPath = `${dirPath}/.cshell.json`;
    await FileService.writeFile(configPath, JSON.stringify(config, null, 2));
  }
}
