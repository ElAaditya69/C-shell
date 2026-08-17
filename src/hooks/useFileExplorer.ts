import { useCallback, useState } from "react";
import { FileService, FileNode, dirName } from "../services/FileService";
import { useSettings } from "../context/SettingsContext";

export function useFileExplorer() {
  const [files, setFiles] = useState<FileNode[]>([]);
  const [currentDir, setCurrentDir] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const { addRecentProject } = useSettings();

  const loadDirectory = useCallback(async (dir: string) => {
    try {
      // Make this the sandbox root (also covers restore / welcome-screen
      // recent-project opens that bypass the folder dialog).
      await FileService.setWorkspace(dir);
      const nodes = await FileService.listDirectory(dir);
      setFiles(nodes);
      setCurrentDir(dir);
      addRecentProject(dir);
    } catch (e) {
      console.error("Failed to load directory:", e);
    }
  }, [addRecentProject]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    if (currentDir) loadDirectory(currentDir);
  }, [currentDir, loadDirectory]);

  // Unload the current folder so the Explorer shows the "no folder open"
  // empty state (like VS Code) instead of any directory's contents.
  const closeFolder = useCallback(async () => {
    setFiles([]);
    setCurrentDir("");
    setRefreshKey((k) => k + 1);
    // Drop the sandbox root so no stale workspace stays trusted.
    await FileService.setWorkspace(null);
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
      // Native dialog result is already authorized for the parent dir.
      return await FileService.openFileDialog();
    } catch (e) {
      alert(`${e}`);
      return null;
    }
  }, []);

  const deleteFile = useCallback(
    async (path: string, isDir: boolean) => {
      const label = isDir ? "folder (and everything inside it)" : "file";
      const fileName = path.split(/[/\\]/).pop() || path;
      if (!confirm(`Delete this ${label}: ${fileName}?`)) {
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
      const fullPath = `${parentPath.replace(/\\/g, "/")}/${name.trim()}`;
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
      const parentDir = dirName(path);
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
    closeFolder,
    openFolder,
    openFileDialog,
    deleteFile,
    createFolder,
    createFileInFolder,
    renamePath,
  };
}
