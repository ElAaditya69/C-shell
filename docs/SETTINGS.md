# Settings Guide

## Accessing Settings

- **Keyboard**: `Ctrl + ,` (or `Cmd + ,` on macOS)
- **Command Palette**: `Ctrl + Shift + P` → type "Preferences"
- **Toolbar**: Click the ⚙️ gear icon

Settings are persisted by the Tauri backend at `~/.c-shell/settings.json`.

---

## Appearance

### Theme
Choose from 4 built-in themes:

| Theme | Description |
|---|---|
| **Retro** (default) | Dark theme with warm amber/green accents |
| **Midnight** | Deep blue-black with cool tones |
| **Solarized** | Classic Solarized Dark palette |
| **Light** | Clean white theme for bright environments |

Custom themes created in the **Themes** tab can be renamed inline — click **✏️ Rename**, type a new name, and press **Enter** (or **✓ Save**); press **Escape** to cancel. Renames persist to `settings.json`.

### Editor Font Size
Slider from **10px** to **24px**. Default: **14px**.

### Editor Font Family
| Option | Fonts |
|---|---|
| **Fira Code / JetBrains Mono** (default) | `Fira Code, JetBrains Mono, Menlo, Consolas, monospace` |
| **Menlo / Monaco** | `Menlo, Monaco, 'Courier New', monospace` |
| **Courier New** | `'Courier New', Courier, monospace` |
| **Consolas** | `Consolas, 'Liberation Mono', monospace` |

### Terminal Font Size
Slider from **10px** to **24px**. Default: **14px**.

### Terminal Font Family
Same font options as the editor.

### Show Toolbar Labels
Toggle text labels next to toolbar icons. Default: **enabled**.

---

## Editor Behavior

### Tab Size
Slider from **2** to **8** spaces. Default: **4 spaces**.

### Use Hard Tabs
When enabled, pressing Tab inserts a real `\t` character instead of spaces. Default: **disabled** (spaces).

### Word Wrap
Toggle soft word wrapping in the editor. Default: **enabled**.

### Autosave
When enabled, automatically saves all dirty files every **30 seconds**. Default: **disabled**.

---

## Layout & UI Customization

### Show Toolbar
Toggle the top toolbar visibility. When hidden, use keyboard shortcuts or Command Palette to access all actions. Default: **visible**.

### Show Status Bar
Toggle the bottom status bar visibility. Default: **visible**.

### Explorer Position
Choose sidebar placement: **Left** (default) or **Right**.

### Terminal Position
Choose terminal panel placement: **Bottom** (default) or **Right**.

---

## Import / Export Settings

### Export Settings
Click **📤 Export Settings** in Preferences to copy your full settings JSON to the clipboard. Share or back up your configuration.

### Import Settings
Click **📥 Import Settings** and paste a previously exported JSON string to restore settings from another machine or backup.

---

## Default Settings Reference

```json
{
  "theme": "retro",
  "sidebarWidth": 220,
  "terminalHeight": 200,
  "showToolbarLabels": true,
  "editorFontSize": 14,
  "fontFamily": "Fira Code, JetBrains Mono, Menlo, Consolas, monospace",
  "terminalFontSize": 14,
  "terminalFontFamily": "JetBrains Mono, Menlo, Consolas, monospace",
  "useTabsIndent": false,
  "tabSize": 4,
  "wordWrap": true,
  "autosave": false,
  "lastDir": null,
  "openTabs": [],
  "activeTabPath": null,
  "recentProjects": [],
  "recentFiles": [],
  "showToolbar": true,
  "showStatusBar": true,
  "explorerPosition": "left",
  "terminalPosition": "bottom",
  "userCss": ""
}
```

---

## Resetting Settings

If your settings become corrupted or you want to start fresh:

1. Close C-Shell
2. Delete `~/.c-shell/settings.json`
3. Reopen C-Shell — defaults will be restored automatically

The app includes a built-in recovery mechanism: if `settings.json` fails to parse, it falls back to `DEFAULT_SETTINGS` without crashing.
