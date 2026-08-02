import { useSettings } from "../../context/SettingsContext";
import { THEMES } from "../../context/themes";

interface SettingsModalProps {
  onClose: () => void;
}

export function SettingsModal({ onClose }: SettingsModalProps) {
  const { settings, updateSettings } = useSettings();

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
            <label style={{ fontWeight: 600, marginBottom: "8px" }}>
              Theme Palette
            </label>
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
            </div>
          </div>

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

          {/* Word Wrap */}
          <div className="include-toggles" style={{ marginTop: "10px" }}>
            <label style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={settings.wordWrap}
                onChange={(e) =>
                  updateSettings({ wordWrap: e.target.checked })
                }
              />
              Word Wrap in Editor
            </label>
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
