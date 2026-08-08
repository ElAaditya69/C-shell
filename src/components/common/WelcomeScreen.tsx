import { useSettings } from "../../context/SettingsContext";
import { BUILT_IN_EXAMPLES } from "../../data/examples";

interface WelcomeScreenProps {
  onNewFile: () => void;
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onOpenRecent: (path: string) => void;
  onOpenFileByPath?: (path: string) => void;
  onOpenExample?: (code: string, filename: string) => void;
}

export function WelcomeScreen({
  onNewFile,
  onOpenFolder,
  onOpenFile,
  onOpenRecent,
  onOpenFileByPath,
  onOpenExample,
}: WelcomeScreenProps) {
  const { settings, removeRecentProject, removeRecentFile, clearRecents } =
    useSettings();
  const recents = settings.recentProjects || [];
  const recentFiles = settings.recentFiles || [];

  return (
    <div className="welcome-screen">
      <div className="welcome-card">
        <div className="welcome-logo">⚡</div>
        <h2 style={{ color: "var(--text-primary)", marginBottom: "4px" }}>
          C-SHELL
        </h2>
        <p className="welcome-tagline">
          A modern, retro-styled C programming IDE
        </p>

        <div className="welcome-actions">
          <button className="action-btn primary" onClick={onNewFile}>
            📝 New File
          </button>
          <button className="action-btn secondary" onClick={onOpenFile}>
            📄 Open File
          </button>
          <button className="action-btn secondary" onClick={onOpenFolder}>
            📁 Open Folder
          </button>
        </div>

        {recents.length > 0 && (
          <div className="welcome-recent">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4 style={{ marginBottom: "10px" }}>📂 Recent Projects</h4>
              <button
                className="welcome-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  clearRecents();
                }}
                title="Clear all recent items"
              >
                ✕ Clear all
              </button>
            </div>
            {recents.slice(0, 5).map((p) => (
              <div
                key={p}
                className="welcome-recent-item"
                onClick={() => onOpenRecent(p)}
              >
                <span className="welcome-recent-label">
                  {p.split(/[/\\]/).pop() || p}
                  <span className="welcome-recent-path">{p}</span>
                </span>
                <button
                  className="welcome-recent-remove"
                  title={`Remove ${p.split(/[/\\]/).pop() || p} from recents`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentProject(p);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {recentFiles.length > 0 && (
          <div className="welcome-recent" style={{ marginTop: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h4 style={{ marginBottom: "10px" }}>📄 Recent Files</h4>
              <button
                className="welcome-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  clearRecents();
                }}
                title="Clear all recent items"
              >
                ✕ Clear all
              </button>
            </div>
            {recentFiles.slice(0, 5).map((f) => (
              <div
                key={f}
                className="welcome-recent-item"
                onClick={() => onOpenFileByPath?.(f)}
              >
                <span className="welcome-recent-label">
                  {f.split(/[/\\]/).pop() || f}
                  <span className="welcome-recent-path">{f}</span>
                </span>
                <button
                  className="welcome-recent-remove"
                  title={`Remove ${f.split(/[/\\]/).pop() || f} from recents`}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeRecentFile(f);
                  }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Built-in Examples */}
        <div className="welcome-examples">
          <h4>📚 Built-in Examples</h4>
          {BUILT_IN_EXAMPLES.map((ex) => (
            <div
              key={ex.id}
              className="example-item"
              onClick={() => onOpenExample?.(ex.code, ex.filename)}
            >
              <span className="example-icon">{ex.icon}</span>
              <span className="example-label">{ex.label}</span>
              <span className="example-desc">{ex.description}</span>
            </div>
          ))}
        </div>

        <div className="welcome-shortcuts">
          <kbd>Ctrl+Enter</kbd><span>Run Code</span>
          <kbd>Ctrl+S</kbd><span>Save</span>
          <kbd>Ctrl+P</kbd><span>Quick Open</span>
          <kbd>Ctrl+Shift+P</kbd><span>Command Palette</span>
          <kbd>Ctrl+Shift+F</kbd><span>Format Code</span>
          <kbd>Ctrl+,</kbd><span>Preferences</span>
          <kbd>Ctrl+K Z</kbd><span>Zen Mode</span>
          <kbd>Ctrl+Alt+S</kbd><span>Screenshot</span>
          <kbd>Ctrl+Alt+R</kbd><span>Lab Report</span>
        </div>
      </div>
    </div>
  );
}
