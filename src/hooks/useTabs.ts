import { useEffect, useRef, useState } from "react";
import { FileService } from "../services/FileService";
import { useSettings } from "../context/SettingsContext";

export interface OpenTab {
  id: string;
  path: string | null;
  name: string;
  code: string;
  savedCode: string;
}

const STARTER_CODE = `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`;

export function useTabs() {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const untitledCounter = useRef(1);
  const { settings, updateSettings } = useSettings();

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  useEffect(() => {
    if (!settings.autosave) return;
    const interval = setInterval(() => {
      tabs.forEach(async (tab) => {
        if (tab.path && tab.code !== tab.savedCode) {
          try {
            await FileService.writeFile(tab.path, tab.code);
            setTabs((prev) =>
              prev.map((t) => (t.id === tab.id ? { ...t, savedCode: tab.code } : t))
            );
          } catch (e) {
            console.error("Autosave failed for tab:", tab.name, e);
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [tabs, settings.autosave]);

  useEffect(() => {
    const validPaths = tabs.map((t) => t.path).filter((p): p is string => Boolean(p));
    const activePath = activeTab?.path || null;
    updateSettings({ openTabs: validPaths, activeTabPath: activePath });
  }, [tabs, activeTabId]);

  const openFile = async (path: string) => {
    const existing = tabs.find((t) => t.path === path);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }

    try {
      const content = await FileService.readFile(path);
      const newTab: OpenTab = {
        id: path,
        path,
        name: path.split("/").pop() || path,
        code: content,
        savedCode: content,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (e) {
      alert(`Failed to open file:\n${e}`);
    }
  };

  const newFile = () => {
    const id = `untitled-${untitledCounter.current}`;
    const name = `Untitled-${untitledCounter.current}.c`;
    untitledCounter.current += 1;

    const newTab: OpenTab = {
      id,
      path: null,
      name,
      code: STARTER_CODE,
      savedCode: STARTER_CODE,
    };

    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(id);
  };

  const updateActiveCode = (value: string) => {
    if (!activeTabId) return;
    setTabs((prev) =>
      prev.map((t) => (t.id === activeTabId ? { ...t, code: value } : t))
    );
  };

  const writeAndUpdateTab = async (
    tab: OpenTab,
    filePath: string,
    isNewId: boolean
  ) => {
    let cleanCode = tab.code
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n");
    if (!cleanCode.endsWith("\n")) {
      cleanCode += "\n";
    }

    await FileService.writeFile(filePath, cleanCode);
    const tabId = isNewId ? filePath : tab.id;

    setTabs((prev) =>
      prev.map((t) =>
        t.id === tab.id
          ? {
              ...t,
              id: tabId,
              path: filePath,
              name: filePath.split("/").pop()!,
              code: cleanCode,
              savedCode: cleanCode,
            }
          : t
      )
    );
    setActiveTabId(tabId);
  };

  const saveFile = async (onSaved?: (dir: string) => void) => {
    if (!activeTab) return;

    try {
      let filePath = activeTab.path;
      let isNewId = false;

      if (!filePath) {
        filePath = await FileService.saveDialog();
        if (!filePath) return;

        await FileService.createFile(filePath);
        isNewId = true;
      }

      await writeAndUpdateTab(activeTab, filePath, isNewId);
      onSaved?.(filePath.substring(0, filePath.lastIndexOf("/")));
    } catch (e) {
      alert(`Error saving: ${e}`);
    }
  };

  const saveFileAs = async (onSaved?: (dir: string) => void) => {
    if (!activeTab) return;

    try {
      const filePath = await FileService.saveDialog();
      if (!filePath) return;

      await FileService.createFile(filePath);
      await writeAndUpdateTab(activeTab, filePath, true);
      onSaved?.(filePath.substring(0, filePath.lastIndexOf("/")));
    } catch (e) {
      alert(`Error saving: ${e}`);
    }
  };

  const closeTab = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab && tab.code !== tab.savedCode) {
      const ok = confirm(`"${tab.name}" has unsaved changes. Close anyway?`);
      if (!ok) return;
    }

    setTabs((prev) => {
      const index = prev.findIndex((t) => t.id === id);
      const next = prev.filter((t) => t.id !== id);

      if (activeTabId === id) {
        const neighbor = next[index] ?? next[index - 1] ?? null;
        setActiveTabId(neighbor ? neighbor.id : null);
      }

      return next;
    });
  };

  const removeTabForPath = (path: string) => {
    setTabs((prev) => {
      const index = prev.findIndex((t) => t.path === path);
      if (index === -1) return prev;

      const next = prev.filter((t) => t.path !== path);
      if (activeTabId === prev[index].id) {
        const neighbor = next[index] ?? next[index - 1] ?? null;
        setActiveTabId(neighbor ? neighbor.id : null);
      }
      return next;
    });
  };

  // Keeps an open tab pointing at the right place after its file gets
  // renamed on disk. (Folder renames are a known gap — see checklist note.)
  const renameTabForPath = (oldPath: string, newPath: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.path === oldPath
          ? { ...t, id: newPath, path: newPath, name: newPath.split("/").pop()! }
          : t
      )
    );
    if (activeTabId === oldPath) {
      setActiveTabId(newPath);
    }
  };

  return {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    openFile,
    newFile,
    updateActiveCode,
    saveFile,
    saveFileAs,
    closeTab,
    removeTabForPath,
    renameTabForPath,
  };
}
