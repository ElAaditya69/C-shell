import { useSettings } from "../../context/SettingsContext";
import { BUILT_IN_EXAMPLES } from "../../data/examples";

interface WelcomeScreenProps {
  onNewFile: () => void;
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onOpenRecent: (path: string) => void;
  onOpenExample?: (code: string, filename: string) => void;
}

export function WelcomeScreen({
  onNewFile,
  onOpenFolder,
  onOpenFile,
  onOpenRecent,
  onOpenExample,
}: WelcomeScreenProps) {
  const { settings } = useSettings();
  const recents = settings.recentProjects || [];

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
            <h4>📂 Recent Projects</h4>
            {recents.slice(0, 5).map((p) => (
              <div
                key={p}
                className="welcome-recent-item"
                onClick={() => onOpenRecent(p)}
              >
                {p.split("/").pop() || p.split("\\").pop() || p}
                <span style={{ marginLeft: "8px", opacity: 0.4, fontSize: "11px" }}>
                  {p}
                </span>
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
