import { useCallback, useState } from "react";
import { FileService } from "../services/FileService";

export function useFileExplorer() {
  const [files, setFiles] = useState<string[]>([]);
  const [currentDir, setCurrentDir] = useState("");

  const loadDirectory = useCallback(async (dir: string) => {
    try {
      const fileList = await FileService.listDirectory(dir);
      setFiles(fileList as string[]);
      setCurrentDir(dir);
    } catch (e) {
      console.error("Failed to load directory:", e);
    }
  }, []);

  const openFolder = useCallback(async () => {
    try {
      const folder = await FileService.openFolder();
      if (!folder) return null;
      await loadDirectory(folder);
      return folder;
    } catch (e) {
      alert(`${e}`);
      return null;
    }
  }, [loadDirectory]);

  const openFileDialog = useCallback(async () => {
    try {
      const file = await FileService.openFileDialog();
      if (!file) return null;
      const dir = file.substring(0, file.lastIndexOf("/"));
      await loadDirectory(dir);
      return file;
    } catch (e) {
      alert(`${e}`);
      return null;
    }
  }, [loadDirectory]);

  const deleteFile = useCallback(
    async (path: string) => {
      if (!confirm(`Delete ${path.split("/").pop()}?`)) return false;
      try {
        await FileService.deleteFile(path);
        await loadDirectory(currentDir);
        return true;
      } catch (e) {
        alert(`Error deleting: ${e}`);
        return false;
      }
    },
    [loadDirectory, currentDir]
  );

  return {
    files,
    currentDir,
    loadDirectory,
    openFolder,
    openFileDialog,
    deleteFile,
  };
}
