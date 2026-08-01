import { useCallback, useState } from "react";
import { FileService, FileNode } from "../services/FileService";

export function useFileExplorer() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentDir, setCurrentDir] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const loadDirectory = useCallback(async (dir: string) => {
    try {
      const nodes = await FileService.listDirectory(dir);
      setFiles(nodes);
      setCurrentDir(dir);
    } catch (e) {
      console.error("Failed to load directory:", e);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    if (currentDir) loadDirectory(currentDir);
  }, [currentDir, loadDirectory]);

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
    async (path: string, isDir: boolean) => {
      const label = isDir ? "folder (and everything inside it)" : "file";
      if (!confirm(`Delete this ${label}: ${path.split("/").pop()}?`)) {
        return false;
      }
      try {
        await FileService.deleteFile(path);
        refresh();
        return true;
      } catch (e) {
        alert(`Error deleting: ${e}`);
        return false;
      }
    },
    [refresh]
  );

  const createFolder = useCallback(
    async (parentPath: string) => {
      const name = prompt("New folder name:");
      if (!name || !name.trim()) return;
      try {
        await FileService.createDirectory(`${parentPath}/${name.trim()}`);
        refresh();
      } catch (e) {
        alert(`Error creating folder: ${e}`);
      }
    },
    [refresh]
  );

  const createFileInFolder = useCallback(
    async (parentPath: string): Promise<string | null> => {
      const name = prompt("New file name (e.g. main.c):");
      if (!name || !name.trim()) return null;
      const fullPath = `${parentPath}/${name.trim()}`;
      try {
        await FileService.createFile(fullPath);
        refresh();
        return fullPath;
      } catch (e) {
        alert(`Error creating file: ${e}`);
        return null;
      }
    },
    [refresh]
  );

  const renamePath = useCallback(
    async (path: string, currentName: string) => {
      const newName = prompt("Rename to:", currentName);
      if (!newName || !newName.trim() || newName.trim() === currentName) {
        return null;
      }
      const parentDir = path.substring(0, path.lastIndexOf("/"));
      const newPath = `${parentDir}/${newName.trim()}`;
      try {
        await FileService.renamePath(path, newPath);
        refresh();
        return newPath;
      } catch (e) {
        alert(`Error renaming: ${e}`);
        return null;
      }
    },
    [refresh]
  );

  return {
    files,
    currentDir,
    refreshKey,
    loadDirectory,
    refresh,
    openFolder,
    openFileDialog,
    deleteFile,
    createFolder,
    createFileInFolder,
    renamePath,
  };
}
