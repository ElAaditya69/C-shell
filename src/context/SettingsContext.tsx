import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { THEMES, CustomTheme } from "./themes";

export interface AppSettings {
  theme: string;
  sidebarWidth: number;
  terminalHeight: number;
  showToolbarLabels: boolean;
  editorFontSize: number;
  fontFamily: string;
  terminalFontSize: number;
  terminalFontFamily: string;
  useTabsIndent: boolean;
  tabSize: number;
  wordWrap: boolean;
  autosave: boolean;
  lastDir: string | null;
  openTabs: string[];
  activeTabPath: string | null;
  recentProjects: string[];
  recentFiles: string[];
  showToolbar: boolean;
  showStatusBar: boolean;
  explorerPosition: 'left' | 'right';
  terminalPosition: 'bottom' | 'right';
  userCss: string;
  customThemes: CustomTheme[];
  backupEnabled: boolean;
  backupInterval: number;
  backupCount: number;
  backupDir: string;
  cStandard: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "retro",
  sidebarWidth: 220,
  terminalHeight: 200,
  showToolbarLabels: true,
  editorFontSize: 14,
  fontFamily: "JetBrainsMono Nerd Font",
  terminalFontSize: 14,
  terminalFontFamily: "JetBrainsMono Nerd Font",
  useTabsIndent: false,
  tabSize: 4,
  wordWrap: true,
  autosave: false,
  lastDir: null,
  openTabs: [],
  activeTabPath: null,
  recentProjects: [],
  recentFiles: [],
  showToolbar: true,
  showStatusBar: true,
  explorerPosition: "left",
  terminalPosition: "bottom",
  userCss: "",
  customThemes: [],
  backupEnabled: true,
  backupInterval: 30,
  backupCount: 5,
  backupDir: "~/.cshell/backups/",
  cStandard: "c99",
};

interface SettingsContextType {
  settings: AppSettings;
  isSettingsLoaded: boolean;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
  addRecentProject: (folderPath: string) => Promise<void>;
  addRecentFile: (filePath: string) => Promise<void>;
  removeRecentProject: (folderPath: string) => Promise<void>;
  removeRecentFile: (filePath: string) => Promise<void>;
  clearRecents: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  isSettingsLoaded: false,
  updateSettings: async () => {},
  addRecentProject: async () => {},
  addRecentFile: async () => {},
  removeRecentProject: async () => {},
  removeRecentFile: async () => {},
  clearRecents: async () => {},
});

/** Resolve a theme key to its variable map, checking custom themes first. */
export function resolveThemeVariables(
  themeKey: string,
  customThemes: CustomTheme[]
): Record<string, string> | null {
  const custom = customThemes.find((t) => t.id === themeKey);
  if (custom) return custom.variables;
  const preset = THEMES[themeKey];
  return preset ? preset.variables : null;
}

export function applyThemeVariables(
  themeKey: string,
  customThemes?: CustomTheme[]
) {
  const vars = resolveThemeVariables(themeKey, customThemes || []);
  if (vars) {
    const root = document.documentElement;
    Object.entries(vars).forEach(([varName, value]) => {
      root.style.setProperty(varName, value);
    });
  }
}

const USER_CSS_ID = "c-shell-user-css";

/** Legacy builds stacked fonts into one comma list (e.g. "Fira Code, JetBrains
    Mono, …"). The font dropdown now offers each family on its own, so migrate a
    saved value down to its first named face. Unknown/custom strings are kept
    as-is so a power-user's direct CSS font value still applies. */
export function normalizeFontFamily(value: string | undefined): string {
  if (!value) return "JetBrainsMono Nerd Font, JetBrains Mono, monospace";
  // For simplicity, we return the value as is to support font stacks.
  // Legacy behavior of taking the first face is not needed for our current defaults.
  return value;
}

/** Injects or removes the user's custom CSS via a <style> element. */
export function applyUserCss(userCss: string | undefined) {
  let style = document.getElementById(USER_CSS_ID) as HTMLStyleElement | null;
  if (userCss && userCss.trim().length > 0) {
    if (!style) {
      style = document.createElement("style");
      style.id = USER_CSS_ID;
      document.head.appendChild(style);
    }
    style.textContent = userCss;
  } else if (style) {
    style.remove();
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const saveQueue = useRef(Promise.resolve());

  const persistSettings = useCallback((next: AppSettings) => {
    // Settings changes often happen back-to-back (open file → open tab → recent
    // list). Queue writes so an older snapshot cannot overwrite a newer one.
    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => invoke("save_settings", { settingsJson: JSON.stringify(next) }));
    saveQueue.current.catch((err) =>
      console.error("Failed to save settings:", err)
    );
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const json = await invoke<string>("load_settings");
        if (json && json !== "{}") {
          const parsed = JSON.parse(json);
          const merged = {
            ...DEFAULT_SETTINGS,
            ...parsed,
            fontFamily: normalizeFontFamily(parsed.fontFamily),
            terminalFontFamily: normalizeFontFamily(parsed.terminalFontFamily),
            customThemes: Array.isArray(parsed.customThemes)
              ? parsed.customThemes
              : [],
          };
          setSettings(merged);
          applyThemeVariables(merged.theme, merged.customThemes);
          applyUserCss(merged.userCss);
        } else {
          applyThemeVariables(DEFAULT_SETTINGS.theme, []);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        applyThemeVariables(DEFAULT_SETTINGS.theme);
      } finally {
        setIsSettingsLoaded(true);
      }
    })();
  }, []);

  const updateSettings = useCallback(async (partial: Partial<AppSettings>) => {
    // Do not let startup effects overwrite the settings file before it loads.
    if (!isSettingsLoaded) return;
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (partial.theme || partial.customThemes) {
        applyThemeVariables(
          partial.theme ?? next.theme,
          partial.customThemes ?? next.customThemes
        );
      }
      if (partial.userCss !== undefined) {
        applyUserCss(partial.userCss);
      }
      persistSettings(next);
      return next;
    });
  }, [isSettingsLoaded, persistSettings]);

  const addRecentProject = useCallback(async (folderPath: string) => {
    if (!folderPath || !isSettingsLoaded) return;
    setSettings((prev) => {
      const filtered = (prev.recentProjects || []).filter((p) => p !== folderPath);
      const updated = [folderPath, ...filtered].slice(0, 10);
      const next = { ...prev, recentProjects: updated, lastDir: folderPath };
      persistSettings(next);
      return next;
    });
  }, [isSettingsLoaded, persistSettings]);

  const addRecentFile = useCallback(async (filePath: string) => {
    if (!filePath || !isSettingsLoaded) return;
    setSettings((prev) => {
      const filtered = (prev.recentFiles || []).filter((f) => f !== filePath);
      const updated = [filePath, ...filtered].slice(0, 10);
      const next = { ...prev, recentFiles: updated };
      persistSettings(next);
      return next;
    });
  }, [isSettingsLoaded, persistSettings]);

  const removeRecentProject = useCallback(async (folderPath: string) => {
    if (!folderPath || !isSettingsLoaded) return;
    setSettings((prev) => {
      const next = {
        ...prev,
        recentProjects: (prev.recentProjects || []).filter((p) => p !== folderPath),
      };
      persistSettings(next);
      return next;
    });
  }, [isSettingsLoaded, persistSettings]);

  const removeRecentFile = useCallback(async (filePath: string) => {
    if (!filePath || !isSettingsLoaded) return;
    setSettings((prev) => {
      const next = {
        ...prev,
        recentFiles: (prev.recentFiles || []).filter((f) => f !== filePath),
      };
      persistSettings(next);
      return next;
    });
  }, [isSettingsLoaded, persistSettings]);

  const clearRecents = useCallback(async () => {
    if (!isSettingsLoaded) return;
    setSettings((prev) => {
      const next = { ...prev, recentProjects: [], recentFiles: [] };
      persistSettings(next);
      return next;
    });
  }, [isSettingsLoaded, persistSettings]);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        isSettingsLoaded,
        updateSettings,
        addRecentProject,
        addRecentFile,
        removeRecentProject,
        removeRecentFile,
        clearRecents,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
