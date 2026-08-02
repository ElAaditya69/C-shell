export interface ThemePreset {
  id: string;
  name: string;
  variables: Record<string, string>;
}

export const THEMES: Record<string, ThemePreset> = {
  retro: {
    id: "retro",
    name: "⚡ Retro Amber",
    variables: {
      "--bg-primary": "#0a0a0f",
      "--bg-secondary": "#12121a",
      "--bg-panel": "#1a1a2e",
      "--bg-hover": "#252540",
      "--bg-deep": "#050508",
      "--text-primary": "#ffb000",
      "--text-secondary": "#ffcc44",
      "--text-dim": "#886600",
      "--text-bright": "#ffdd66",
      "--accent": "#ff6b35",
      "--border": "#2a2a3e",
      "--btn-primary": "#319795",
      "--btn-primary-hover": "#2c7a7b",
    },
  },
  midnight: {
    id: "midnight",
    name: "🌃 Midnight Blue",
    variables: {
      "--bg-primary": "#0f172a",
      "--bg-secondary": "#1e293b",
      "--bg-panel": "#334155",
      "--bg-hover": "#475569",
      "--bg-deep": "#090d16",
      "--text-primary": "#38bdf8",
      "--text-secondary": "#7dd3fc",
      "--text-dim": "#64748b",
      "--text-bright": "#bae6fd",
      "--accent": "#f43f5e",
      "--border": "#334155",
      "--btn-primary": "#0284c7",
      "--btn-primary-hover": "#0369a1",
    },
  },
  solarized: {
    id: "solarized",
    name: "🌲 Solarized Dark",
    variables: {
      "--bg-primary": "#002b36",
      "--bg-secondary": "#073642",
      "--bg-panel": "#094352",
      "--bg-hover": "#155869",
      "--bg-deep": "#001e26",
      "--text-primary": "#2aa198",
      "--text-secondary": "#859900",
      "--text-dim": "#586e75",
      "--text-bright": "#93a1a1",
      "--accent": "#cb4b16",
      "--border": "#073642",
      "--btn-primary": "#268bd2",
      "--btn-primary-hover": "#1a6091",
    },
  },
  light: {
    id: "light",
    name: "☀️ Clean Light",
    variables: {
      "--bg-primary": "#ffffff",
      "--bg-secondary": "#f8fafc",
      "--bg-panel": "#f1f5f9",
      "--bg-hover": "#e2e8f0",
      "--bg-deep": "#e2e8f0",
      "--text-primary": "#0f172a",
      "--text-secondary": "#334155",
      "--text-dim": "#64748b",
      "--text-bright": "#0284c7",
      "--accent": "#2563eb",
      "--border": "#cbd5e1",
      "--btn-primary": "#2563eb",
      "--btn-primary-hover": "#1d4ed8",
    },
  },
};
