import { useSettings, AppSettings } from "../../context/SettingsContext";
import { THEMES, THEME_VARIABLES } from "../../context/themes";
import { FileService } from "../../services/FileService";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();
  const customThemes = settings.customThemes || [];

  /* ---- Custom theme helpers ---- */

  const saveCustomTheme = (theme: {
    id: string;
    name: string;
    variables: Record<string, string>;
  }) => {
    const exists = customThemes.some((t) => t.id === theme.id);
    let next: typeof customThemes;
    if (exists) {
      next = customThemes.map((t) => (t.id === theme.id ? theme : t));
    } else {
      next = [...customThemes, theme];
    }
    updateSettings({ customThemes: next });
  };

  const deleteCustomTheme = (id: string) => {
    const next = customThemes.filter((t) => t.id !== id);
    updateSettings({ customThemes: next });
    // If the active theme was deleted, fall back to the default.
    if (settings.theme === id) {
      updateSettings({ theme: "retro" });
    }
  };

  const newCustomTheme = () => {
    const base = THEMES.retro;
    const id = `custom-${Date.now()}`;
    const theme = {
      id,
      name: "New Theme",
      variables: { ...base.variables },
    };
    saveCustomTheme(theme);
    updateSettings({ theme: id });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content settings-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "540px" }}
      >
        <div className="modal-header">
          <h3>⚙️ C-Shell Preferences</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="report-form-container" style={{ padding: "20px" }}>
          {/* Theme Selector */}
          <div className="form-group span-2" style={{ marginBottom: "18px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "8px",
              }}
            >
              <label style={{ fontWeight: 600 }}>Theme Palette</label>
              <button
                className="action-btn secondary"
                style={{ fontSize: "12px", padding: "4px 10px" }}
                onClick={newCustomTheme}
                title="Create a copy of the current palette as a new custom theme"
              >
                ➕ New Custom Theme
              </button>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              {Object.values(THEMES).map((t) => {
                const isActive = settings.theme === t.id;
                const borderStyle = isActive
                  ? "2px solid var(--accent)"
                  : "2px solid var(--border)";
                return (
                  <div
                    key={t.id}
                    onClick={() => updateSettings({ theme: t.id })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: borderStyle,
                      background: t.variables["--bg-secondary"],
                      color: t.variables["--text-primary"],
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>
                      {t.name}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: t.variables["--bg-primary"],
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                      />
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: t.variables["--text-primary"],
                        }}
                      />
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: t.variables["--accent"],
                        }}
                      />
                    </div>
                  </div>
                );
              })}

              {/* Custom themes created by the user */}
              {customThemes.map((t) => {
                const isActive = settings.theme === t.id;
                const borderStyle = isActive
                  ? "2px solid var(--accent)"
                  : "2px solid var(--border)";
                return (
                  <div
                    key={t.id}
                    onClick={() => updateSettings({ theme: t.id })}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "8px",
                      border: borderStyle,
                      background: t.variables["--bg-secondary"],
                      color: t.variables["--text-primary"],
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <span style={{ fontSize: "13px", fontWeight: 600 }}>
                      ✨ {t.name}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: t.variables["--bg-primary"],
                          border: "1px solid rgba(255,255,255,0.2)",
                        }}
                      />
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: t.variables["--text-primary"],
                        }}
                      />
                      <span
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: t.variables["--accent"],
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Custom Theme Editor: shown when a custom theme is active */}
          {customThemes.some((t) => t.id === settings.theme) &&
            (() => {
              const active = customThemes.find(
                (t) => t.id === settings.theme
              )!;
              return (
                <div
                  className="form-group span-2"
                  style={{
                    marginBottom: "18px",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    padding: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "10px",
                    }}
                  >
                    <label style={{ fontWeight: 600 }}>
                      ✨ Custom Theme: {active.name}
                    </label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <button
                        className="action-btn secondary"
                        style={{ fontSize: "12px", padding: "4px 10px" }}
                        onClick={() => {
                          const name = prompt("Theme name:", active.name);
                          if (name && name.trim()) {
                            saveCustomTheme({ ...active, name: name.trim() });
                          }
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="action-btn danger"
                        style={{ fontSize: "12px", padding: "4px 10px" }}
                        onClick={() => {
                          if (confirm(`Delete "${active.name}"?`)) {
                            deleteCustomTheme(active.id);
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "6px 14px",
                    }}
                  >
                    {THEME_VARIABLES.map(({ key, label }) => (
                      <label
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontSize: "12px",
                          color: "var(--text-dim)",
                          cursor: "pointer",
                        }}
                      >
                        <input
                          type="color"
                          value={active.variables[key] || "#000000"}
                          onChange={(e) =>
                            saveCustomTheme({
                              ...active,
                              variables: {
                                ...active.variables,
                                [key]: e.target.value,
                              },
                            })
                          }
                          style={{ width: "28px", height: "24px", border: "none", background: "none", padding: 0 }}
                        />
                        {label}
                      </label>
                    ))}
                  </div>
                  <div style={{ marginTop: "10px" }}>
                    <label style={{ fontWeight: 600, fontSize: "13px" }}>
                      Custom CSS
                    </label>
                    <textarea
                      value={settings.userCss || ""}
                      onChange={(e) =>
                        updateSettings({ userCss: e.target.value })
                      }
                      placeholder={"/* Override any style here, e.g.\n.app { font-family: 'Fira Code'; } */"}
                      rows={4}
                      style={{
                        width: "100%",
                        boxSizing: "border-box",
                        marginTop: "6px",
                        padding: "8px",
                        borderRadius: "6px",
                        border: "1px solid var(--border)",
                        background: "var(--bg-primary)",
                        color: "var(--text-primary)",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        resize: "vertical",
                      }}
                    />
                  </div>
                </div>
              );
            })()}

          {/* Editor Options */}
          <div className="form-group span-2" style={{ marginBottom: "16px" }}>
            <label style={{ fontWeight: 600 }}>
              Editor Font Size: {settings.editorFontSize}px
            </label>
            <input
              type="range"
              min={11}
              max={22}
              step={1}
              value={settings.editorFontSize}
              onChange={(e) =>
                updateSettings({ editorFontSize: Number(e.target.value) })
              }
              style={{ marginTop: "6px" }}
            />
          </div>

          {/* Terminal Options */}
          <div className="form-group span-2" style={{ marginBottom: "16px" }}>
            <label style={{ fontWeight: 600 }}>
              Terminal Font Size: {settings.terminalFontSize || 14}px
            </label>
            <input
              type="range"
              min={10}
              max={24}
              step={1}
              value={settings.terminalFontSize || 14}
              onChange={(e) =>
                updateSettings({ terminalFontSize: Number(e.target.value) })
              }
              style={{ marginTop: "6px" }}
            />
          </div>

          {/* Toolbar Options */}
          <div className="include-toggles" style={{ marginTop: "10px" }}>
            <label style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.showToolbarLabels}
                onChange={(e) =>
                  updateSettings({ showToolbarLabels: e.target.checked })
                }
              />
              Show Text Labels on Toolbar Buttons
            </label>
            <label style={{ cursor: "pointer", marginTop: "8px", display: "block" }}>
              <input
                type="checkbox"
                checked={settings.autosave}
                onChange={(e) =>
                  updateSettings({ autosave: e.target.checked })
                }
              />
              Autosave Files (every 30s)
            </label>
          </div>

          {/* Tab Size */}
          <div className="form-group span-2" style={{ marginBottom: "16px", marginTop: "14px" }}>
            <label style={{ fontWeight: 600 }}>
              Tab Size: {settings.tabSize} spaces
            </label>
            <input
              type="range"
              min={2}
              max={8}
              step={2}
              value={settings.tabSize}
              onChange={(e) =>
                updateSettings({ tabSize: Number(e.target.value) })
              }
              style={{ marginTop: "6px" }}
            />
          </div>

          {/* Font Family */}
          <div className="form-group span-2" style={{ marginBottom: "16px", marginTop: "14px" }}>
            <label style={{ fontWeight: 600 }}>Editor Font Family</label>
            <select
              value={settings.fontFamily}
              onChange={(e) => updateSettings({ fontFamily: e.target.value })}
              style={{
                width: "100%",
                padding: "8px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                marginTop: "6px",
              }}
            >
              <option value="Fira Code, JetBrains Mono, Menlo, Consolas, monospace">
                Fira Code / JetBrains Mono
              </option>
              <option value="Menlo, Monaco, 'Courier New', monospace">
                Menlo / Monaco
              </option>
              <option value="'Courier New', Courier, monospace">
                Courier New
              </option>
              <option value="Consolas, 'Liberation Mono', monospace">
                Consolas
              </option>
            </select>
          </div>

          {/* Word Wrap & Indent Toggles */}
          <div className="include-toggles" style={{ marginTop: "10px" }}>
            <label style={{ cursor: "pointer", marginBottom: "6px", display: "block" }}>
              <input
                type="checkbox"
                checked={settings.wordWrap}
                onChange={(e) =>
                  updateSettings({ wordWrap: e.target.checked })
                }
              />
              Word Wrap in Editor
            </label>
            <label style={{ cursor: "pointer", display: "block" }}>
              <input
                type="checkbox"
                checked={settings.useTabsIndent}
                onChange={(e) =>
                  updateSettings({ useTabsIndent: e.target.checked })
                }
              />
              Indent using Hard Tabs (instead of Spaces)
            </label>
          </div>
          {/* Layout & UI Customization */}
          <div className="include-toggles" style={{ marginTop: "14px" }}>
            <label style={{ cursor: "pointer", marginBottom: "6px", display: "block" }}>
              <input
                type="checkbox"
                checked={settings.showToolbar}
                onChange={(e) =>
                  updateSettings({ showToolbar: e.target.checked })
                }
              />
              Show Top Toolbar
            </label>
            <label style={{ cursor: "pointer", display: "block" }}>
              <input
                type="checkbox"
                checked={settings.showStatusBar}
                onChange={(e) =>
                  updateSettings({ showStatusBar: e.target.checked })
                }
              />
              Show Bottom Status Bar
            </label>
          </div>

          {/* Theme Import / Export */}
          <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
            <button
              className="action-btn secondary"
              onClick={async () => {
                try {
                  const dest = await FileService.saveJsonDialog("c-shell-settings.json");
                  if (!dest) return;
                  await FileService.writeFile(dest, JSON.stringify(settings, null, 2));
                  alert("Settings exported successfully!");
                } catch (e) {
                  alert(`Export failed: ${e}`);
                }
              }}
            >
              📤 Export Settings
            </button>
            <button
              className="action-btn secondary"
              onClick={async () => {
                try {
                  const file = await FileService.openJsonDialog();
                  if (!file) return;
                  const json = await FileService.readFile(file);
                  const parsed = JSON.parse(json);
                  if (typeof parsed !== "object" || parsed === null) {
                    throw new Error("invalid settings object");
                  }
                  // Only carry over known keys so an older/broken file can't
                  // inject unknown state.
                  const next: Partial<AppSettings> = {};
                  for (const key of Object.keys(parsed) as (keyof AppSettings)[]) {
                    if (key in settings) {
                      (next as Record<string, unknown>)[key] = parsed[key];
                    }
                  }
                  await updateSettings(next);
                  alert("Settings imported successfully!");
                } catch (e) {
                  alert(`Import failed: ${e}`);
                }
              }}
            >
              📥 Import Settings
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="action-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
