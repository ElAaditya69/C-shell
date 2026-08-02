import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { THEMES } from "./themes";

export interface AppSettings {
  theme: string;
  sidebarWidth: number;
  terminalHeight: number;
  showToolbarLabels: boolean;
  editorFontSize: number;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "retro",
  sidebarWidth: 220,
  terminalHeight: 200,
  showToolbarLabels: true,
  editorFontSize: 14,
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: async () => {},
});

export function applyThemeVariables(themeKey: string) {
  const themePreset = THEMES[themeKey] || THEMES.retro;
  const root = document.documentElement;
  Object.entries(themePreset.variables).forEach(([varName, value]) => {
    root.style.setProperty(varName, value);
  });
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    (async () => {
      try {
        const json = await invoke<string>("load_settings");
        if (json && json !== "{}") {
          const parsed = JSON.parse(json);
          const merged = { ...DEFAULT_SETTINGS, ...parsed };
          setSettings(merged);
          applyThemeVariables(merged.theme);
        } else {
          applyThemeVariables(DEFAULT_SETTINGS.theme);
        }
      } catch (err) {
        console.error("Failed to load settings:", err);
        applyThemeVariables(DEFAULT_SETTINGS.theme);
      }
    })();
  }, []);

  const updateSettings = async (partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      if (partial.theme) {
        applyThemeVariables(partial.theme);
      }
      invoke("save_settings", { settingsJson: JSON.stringify(next) }).catch((err) =>
        console.error("Failed to save settings:", err)
      );
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
