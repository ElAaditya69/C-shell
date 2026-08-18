import { useEffect, useRef, useState } from "react";
import { FileService, dirName } from "../services/FileService";
import { useSettings } from "../context/SettingsContext";

export interface OpenTab {
  id: string;
  path: string | null;
  name: string;
  code: string;
  savedCode: string;
}

const STARTER_CODE = "";

export function useTabs() {
  const [tabs, setTabs] = useState<OpenTab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const untitledCounter = useRef(1);
  const { settings, updateSettings, addRecentFile } = useSettings();

  const activeTab = tabs.find((t) => t.id === activeTabId) ?? null;

  // Mirrors the freshest tabs state so the autosave interval (whose closure
  // only sees the render it was created in) can read the CURRENT code at
  // write time — never a stale snapshot.
  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    if (!settings.autosave) return;
    const interval = setInterval(() => {
      tabsRef.current.forEach(async (tab) => {
        if (tab.path && tab.code !== tab.savedCode) {
          try {
            // Read the freshest content from the mirror — if the user is
            // typing when autosave fires, this is the current editor state,
            // not the stale closure value. The write and savedCode agree on
            // the same bytes, so nothing older can be resurrected.
            const current = tabsRef.current.find((t) => t.id === tab.id);
            if (!current || current.code === current.savedCode) return;
            await FileService.writeFile(tab.path, current.code);
            setTabs((prev) =>
              prev.map((t) =>
                t.id === tab.id ? { ...t, savedCode: current.code } : t
              )
            );
          } catch (e) {
            console.error("Autosave failed for tab:", tab.name, e);
          }
        }
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [tabs, settings.autosave]);

  /** Raw stored backup entries: fresh-shape ({ code, truncated, path: string|null })
      or legacy raw OpenTabs. Decoded to OpenTab at restore time. */
  type CrashBackupEntry = any;
  const [hasCrashBackup, setHasCrashBackup] = useState(false);
  const crashBackupData = useRef<CrashBackupEntry[] | null>(null);

  // Check for crash backup on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("c_shell_crash_backup");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          crashBackupData.current = parsed;
          setHasCrashBackup(true);
        }
      }
    } catch {
      // Ignore invalid localStorage
    }
  }, []);

  // Backup dirty tabs to localStorage. Codes are truncated to
  // CRASH_BACKUP_MAX_CHARS so a huge file (or many dirty tabs) can never
  // blow the ~5MB localStorage quota and kill the app with an uncaught
  // setItem throw; the write itself is also guarded.
  const CRASH_BACKUP_MAX_CHARS = 64 * 1024;
  const crashBackupTabs = (
    list: OpenTab[]
  ): { id: string; path: string | null; name: string; code: string; savedCode: string; truncated: boolean }[] =>
    list
      .filter((t) => t.code !== t.savedCode)
      .map((t) => {
        const truncated = t.code.length > CRASH_BACKUP_MAX_CHARS;
        return {
          id: t.id,
          path: t.path,
          name: t.name,
          code: truncated ? t.code.slice(0, CRASH_BACKUP_MAX_CHARS) : t.code,
          savedCode: t.savedCode,
          truncated,
        };
      });

  useEffect(() => {
    const backup = crashBackupTabs(tabs);
    try {
      if (backup.length > 0) {
        localStorage.setItem("c_shell_crash_backup", JSON.stringify(backup));
      } else {
        localStorage.removeItem("c_shell_crash_backup");
      }
    } catch (e) {
      // Quota exceeded or storage unavailable — a lost autosave backup is
      // preferable to a crash; the user still has their working files.
      console.error("Crash backup write failed:", e);
    }
  }, [tabs]);

  // External file change detection on window focus
  useEffect(() => {
    const handleFocus = async () => {
      tabs.forEach(async (tab) => {
        if (!tab.path) return;
        try {
          const diskContent = await FileService.readFile(tab.path);
          if (diskContent !== tab.savedCode) {
            if (tab.code === tab.savedCode) {
              // Auto-reload clean files
              setTabs((prev) =>
                prev.map((t) =>
                  t.id === tab.id
                    ? { ...t, code: diskContent, savedCode: diskContent }
                    : t
                )
              );
            } else {
              // Prompt if file has local edits as well as disk changes
              const reload = confirm(
                `File "${tab.name}" was modified externally. Reload from disk and discard local changes?`
              );
              if (reload) {
                setTabs((prev) =>
                  prev.map((t) =>
                    t.id === tab.id
                      ? { ...t, code: diskContent, savedCode: diskContent }
                      : t
                  )
                );
              }
            }
          }
        } catch {
          // File might have been deleted externally
        }
      });
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [tabs]);

  useEffect(() => {
    const validPaths = tabs.map((t) => t.path).filter((p): p is string => Boolean(p));
    const activePath = activeTab?.path || null;
    updateSettings({ openTabs: validPaths, activeTabPath: activePath });
  }, [tabs, activeTabId]);

  const openFile = async (path: string) => {
    addRecentFile(path);
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
        name: path.split(/[/\\]/).pop() || path,
        code: content,
        savedCode: content,
      };
      setTabs((prev) => [...prev, newTab]);
      setActiveTabId(newTab.id);
    } catch (e) {
      alert(`Failed to open file:\n${e}`);
    }
  };

  const newFile = (initialCode?: string, customName?: string) => {
    const id = `untitled-${untitledCounter.current}`;
    const name =
      typeof customName === "string"
        ? customName
        : `Untitled-${untitledCounter.current}.c`;
    untitledCounter.current += 1;

    const codeToUse = typeof initialCode === "string" ? initialCode : STARTER_CODE;

    const newTab: OpenTab = {
      id,
      path: null,
      name,
      code: codeToUse,
      savedCode: codeToUse,
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

  const updateTabCode = (tabId: string, value: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, code: value } : t))
    );
  };

  const writeAndUpdateTab = async (
    tab: OpenTab,
    filePath: string,
    isNewId: boolean
  ): Promise<OpenTab> => {
    let cleanCode = tab.code
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n");
    if (!cleanCode.endsWith("\n")) {
      cleanCode += "\n";
    }

    await FileService.writeFile(filePath, cleanCode);
    const tabId = isNewId ? filePath : tab.id;

    const updatedTab: OpenTab = {
      ...tab,
      id: tabId,
      path: filePath,
      name: filePath.split(/[/\\]/).pop()!,
      code: cleanCode,
      savedCode: cleanCode,
    };

    setTabs((prev) =>
      prev.map((t) =>
        t.id === tab.id
          ? updatedTab
          : t
      )
    );
    setActiveTabId(tabId);
    await addRecentFile(filePath);
    // The tab's bytes are now on disk — drop it from the crash backup so a
    // future crash can't re-promise content the user already saved.
    purgeBackupForPath(filePath);
    return updatedTab;
  };

  const saveFile = async (onSaved?: (dir: string) => void): Promise<OpenTab | null> => {
    if (!activeTab) return null;

    try {
      let filePath = activeTab.path;
      let isNewId = false;

      if (!filePath) {
        filePath = await FileService.saveDialog();
        if (!filePath) return null;
        isNewId = true;
      }

      const savedTab = await writeAndUpdateTab(activeTab, filePath, isNewId);
      onSaved?.(dirName(filePath));
      return savedTab;
    } catch (e) {
      alert(`Error saving: ${e}`);
      return null;
    }
  };

  const saveFileAs = async (onSaved?: (dir: string) => void): Promise<OpenTab | null> => {
    if (!activeTab) return null;

    try {
      const filePath = await FileService.saveDialog();
      if (!filePath) return null;

      const savedTab = await writeAndUpdateTab(activeTab, filePath, true);
      onSaved?.(dirName(filePath));
      return savedTab;
    } catch (e) {
      alert(`Error saving: ${e}`);
      return null;
    }
  };

  /**
   * Commits a live drag reorder. The settings effect below (openTabs is
   * persisted in tab order) saves the new arrangement automatically, so a
   * reorder survives the session and the next launch.
   */
  const reorderTabs = (fromIndex: number, toIndex: number) => {
    setTabs((prev) => {
      if (fromIndex === toIndex) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const closeTab = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    // Untitled tabs have path === null and code === savedCode — but their
    // content exists only in memory, so closing them loses it. Treat them
    // as dirty too.
    if (tab && (tab.code !== tab.savedCode || tab.path === null)) {
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
    // Deleting the file orphaned its backup entry — don't offer to restore
    // code that no longer exists on disk.
    purgeBackupForPath(path);
  };

  // Keeps an open tab pointing at the right place after its file gets
  // renamed on disk. (Folder renames are a known gap — see checklist note.)
  const renameTabForPath = (oldPath: string, newPath: string) => {
    setTabs((prev) =>
      prev.map((t) =>
        t.path === oldPath
          ? { ...t, id: newPath, path: newPath, name: newPath.split(/[/\\]/).pop()! }
          : t
      )
    );
    if (activeTabId === oldPath) {
      setActiveTabId(newPath);
    }
  };

  /**
   * Normalizes one stored backup entry into a usable OpenTab, handling both
   * the new shape ({ truncated, path: null|string }) and legacy raw OpenTabs.
   *   - Line endings are normalized to \n (the backup may come from a
   *     Windows machine or a pasted export).
   *   - If the path has no ".c"/".h" extension it is re-appended, so a
   *     restored tab opens as C code instead of an unrecognized type.
   *   - Two entries can share a path (e.g. the same file was dirty from two
   *     sessions), so ids are rebased to a unique "backup-N" scheme that can
   *     never collide with real file-path ids.
   * @param idx 1-based index used for the rebased id.
   */
  const normalizeBackupTab = (entry: any, idx: number): OpenTab => {
    let code = String(entry?.code ?? "");
    code = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    const rawName = String(entry?.name ?? "Untitled.c");
    let path: string | null = null;
    if (typeof entry?.path === "string" && entry.path !== "") {
      path = entry.path;
    }
    const extOk = /\.(c|h)$/i.test(rawName) || (path !== null && /\.(c|h)$/i.test(path));
    const name = extOk ? rawName : `${rawName}.c`;
    return {
      id: `backup-${idx}`,
      path, // null for untitled entries — they live only in the editor
      name,
      code,
      savedCode: code,
    };
  };

  const restoreCrashBackup = () => {
    if (crashBackupData.current && crashBackupData.current.length > 0) {
      const restored = crashBackupData.current.map(normalizeBackupTab);
      setTabs(restored);
      setActiveTabId(restored[0].id);
    }
    localStorage.removeItem("c_shell_crash_backup");
    setHasCrashBackup(false);
  };

  const dismissCrashBackup = () => {
    localStorage.removeItem("c_shell_crash_backup");
    setHasCrashBackup(false);
  };

  /** Removes keptPath from the stored backup (called after a successful save). */
  const purgeBackupForPath = (keptPath: string) => {
    let remaining: unknown[] | null = null;
    try {
      const raw = localStorage.getItem("c_shell_crash_backup");
      if (raw) remaining = JSON.parse(raw);
    } catch {
      return;
    }
    if (!Array.isArray(remaining)) return;
    const next = remaining.filter(
      (e) => !(e && typeof e === "object" && (e as any).path === keptPath)
    );
    try {
      if (next.length > 0) {
        localStorage.setItem("c_shell_crash_backup", JSON.stringify(next));
      } else {
        localStorage.removeItem("c_shell_crash_backup");
      }
    } catch {}
    setHasCrashBackup(next.length > 0);
  };

  /**
   * Export: write the current backup JSON to a user-picked path. Works even
   * when the app can't reopen (file IO happens outside the workspace
   * sandbox), so the recovery copy outlives a crashed installer/disk.
   */
  const exportCrashBackup = async (): Promise<string | null> => {
    let payload: unknown = null;
    try {
      const raw = localStorage.getItem("c_shell_crash_backup");
      if (raw) payload = JSON.parse(raw);
    } catch {
      return "The saved crash backup could not be read.";
    }
    if (!Array.isArray(payload) || payload.length === 0) {
      return "There is no crash backup to export.";
    }
    try {
      const target = await FileService.saveJsonDialog("crash-backup.json");
      if (!target) return null; // user cancelled
      await FileService.exportBackup(target, JSON.stringify(payload, null, 2));
      return null;
    } catch (e) {
      return `Failed to export crash backup: ${e}`;
    }
  };

  /**
   * Import: read a backup JSON from a user-picked path and restore it,
   * exactly as if the app had found the backup on mount. The picked file
   * must be outside the workspace sandbox rule, hence import_backup.
   */
  const importCrashBackup = async (): Promise<string | null> => {
    try {
      const source = await FileService.openJsonDialog();
      if (!source) return null; // user cancelled
      const contents = await FileService.importBackup(source);
      const parsed = JSON.parse(contents);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return "That file does not contain a crash backup.";
      }
      crashBackupData.current = parsed;
      setHasCrashBackup(true);
      return null;
    } catch (e) {
      return `Failed to import crash backup: ${e}`;
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
    updateTabCode,
    saveFile,
    saveFileAs,
    closeTab,
    reorderTabs,
    removeTabForPath,
    renameTabForPath,
    hasCrashBackup,
    restoreCrashBackup,
    dismissCrashBackup,
    exportCrashBackup,
    importCrashBackup,
  };
}
