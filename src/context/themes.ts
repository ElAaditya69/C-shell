export interface ThemePreset {
  id: string;
  name: string;
  variables: Record<string, string>;
}

/** A user-created theme stored in settings (has no hardcoded CSS backing). */
export interface CustomTheme {
  id: string;
  name: string;
  variables: Record<string, string>;
}

/**
 * The editable CSS custom properties. Order here defines the order shown in
 * the custom theme editor.
 */
export const THEME_VARIABLES: { key: string; label: string }[] = [
  { key: "--bg-primary", label: "App Background" },
  { key: "--bg-secondary", label: "Sidebar / Panels" },
  { key: "--bg-panel", label: "Panel Background" },
  { key: "--bg-hover", label: "Hover Background" },
  { key: "--bg-deep", label: "Deep Background" },
  { key: "--text-primary", label: "Primary Text" },
  { key: "--text-secondary", label: "Secondary Text" },
  { key: "--text-dim", label: "Dim Text" },
  { key: "--text-bright", label: "Bright Text" },
  { key: "--accent", label: "Accent" },
  { key: "--border", label: "Borders" },
  { key: "--btn-primary", label: "Primary Button" },
  { key: "--btn-primary-hover", label: "Button Hover" },
];

export const THEMES: Record<string, ThemePreset> = {
  retro: {
    id: "retro",
    name: "⚡ Retro Amber",
    variables: {
      "--bg-primary": "#0c0d10",
      "--bg-secondary": "#101218",
      "--bg-panel": "#121318",
      "--bg-hover": "#1e2028",
      "--bg-deep": "#0a0b0e",
      "--text-primary": "#e8eaf0",
      "--text-secondary": "#c4c8de",
      "--text-dim": "#8b8fa8",
      "--text-bright": "#f0a500",
      "--accent": "#f0a500",
      "--border": "#1a1c24",
      "--btn-primary": "#f0a500",
      "--btn-primary-hover": "#d48900",
    },
  },
  midnight: {
    id: "midnight",
    name: "🌃 Midnight Blue",
    variables: {
      "--bg-primary": "#0b1020",
      "--bg-secondary": "#111a30",
      "--bg-panel": "#141e36",
      "--bg-hover": "#1f2d4e",
      "--bg-deep": "#060a14",
      "--text-primary": "#e8ecf4",
      "--text-secondary": "#c3cbe0",
      "--text-dim": "#7c8bb0",
      "--text-bright": "#38bdf8",
      "--accent": "#38bdf8",
      "--border": "#1e2a44",
      "--btn-primary": "#38bdf8",
      "--btn-primary-hover": "#0ea5e9",
    },
  },
  solarized: {
    id: "solarized",
    name: "🌲 Solarized Dark",
    variables: {
      "--bg-primary": "#00212b",
      "--bg-secondary": "#073642",
      "--bg-panel": "#083b49",
      "--bg-hover": "#155e6b",
      "--bg-deep": "#00161d",
      "--text-primary": "#e8f0ef",
      "--text-secondary": "#a0b8b6",
      "--text-dim": "#6b8f8c",
      "--text-bright": "#2aa198",
      "--accent": "#cb4b16",
      "--border": "#08404e",
      "--btn-primary": "#2aa198",
      "--btn-primary-hover": "#1f8a82",
    },
  },
  light: {
    id: "light",
    name: "☀️ Clean Light",
    variables: {
      "--bg-primary": "#f7f7f5",
      "--bg-secondary": "#ffffff",
      "--bg-panel": "#ffffff",
      "--bg-hover": "#ecece7",
      "--bg-deep": "#eef0ec",
      "--text-primary": "#1b1f24",
      "--text-secondary": "#3d4450",
      "--text-dim": "#7d8490",
      "--text-bright": "#b45309",
      "--accent": "#b45309",
      "--border": "#e1e4de",
      "--btn-primary": "#b45309",
      "--btn-primary-hover": "#92400e",
    },
  },
};
