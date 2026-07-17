import { useCallback } from "react";
import { FileService } from "../services/FileService";

export function useFiles() {
  const loadDirectory = useCallback(async (dir: string) => {
    return await FileService.listDirectory(dir);
  }, []);

  return {
    loadDirectory,
  };
}
