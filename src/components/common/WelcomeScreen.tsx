import { useSettings } from "../../context/SettingsContext";
import { BUILT_IN_EXAMPLES } from "../../data/examples";
import { Logo } from "./Logo";

interface WelcomeScreenProps {
  onNewFile: () => void;
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onOpenRecent: (path: string) => void;
  onOpenFileByPath?: (path: string) => void;
  onOpenExample?: (code: string, filename: string) => void;
}

const SHORTCUTS: Array<{ keys: string; action: string }> = [
  { keys: "Ctrl+Enter", action: "Run Code" },
  { keys: "Ctrl+S", action: "Save" },
  { keys: "Ctrl+P", action: "Quick Open" },
  { keys: "Ctrl+Shift+P", action: "Command Palette" },
  { keys: "Ctrl+Shift+Alt+F", action: "Format Code" },
  { keys: "Ctrl+`", action: "Toggle Terminal" },
];

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
        {/* Hero */}
        <div className="welcome-hero">
          <div className="welcome-hero-row">
            <span className="welcome-logo">
              <Logo size={34} />
            </span>
            <div>
              <h1 className="welcome-title">C-SHELL</h1>
              <p className="welcome-tagline">
                A modern, retro-styled C programming environment
              </p>
            </div>
          </div>

          <div className="welcome-actions">
            <button className="action-btn primary" onClick={onNewFile}>
              + New File
            </button>
            <button className="action-btn secondary" onClick={onOpenFile}>
              📄 Open File
            </button>
            <button className="action-btn secondary" onClick={onOpenFolder}>
              📁 Open Folder
            </button>
          </div>
        </div>

        {/* Two-column layout */}
        <div className="welcome-grid">
          <div className="welcome-col">
            {/* Recent projects */}
            <section className="welcome-section">
              <div className="welcome-section-header">
                <div className="welcome-section-title">
                  <span className="welcome-section-bar" />
                  <span>Recent Projects</span>
                </div>
                {recents.length > 0 && (
                  <button
                    className="welcome-clear-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearRecents();
                    }}
                    title="Clear all recent items"
                  >
                    × Clear all
                  </button>
                )}
              </div>
              <div className="welcome-recent-list">
                {recents.slice(0, 5).map((p) => (
                  <div
                    key={p}
                    className="welcome-recent-item"
                    onClick={() => onOpenRecent(p)}
                  >
                    <span className="welcome-recent-icon">📁</span>
                    <div className="welcome-recent-body">
                      <div className="welcome-recent-name">
                        {p.split(/[/\\]/).pop() || p}
                      </div>
                      <div className="welcome-recent-path">{p}</div>
                    </div>
                    <button
                      className="welcome-recent-remove"
                      title={`Remove ${p.split(/[/\\]/).pop() || p} from recents`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecentProject(p);
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {recentFiles.length > 0 && (
              <section className="welcome-section">
                <div className="welcome-section-header">
                  <div className="welcome-section-title">
                    <span className="welcome-section-bar" />
                    <span>Recent Files</span>
                  </div>
                </div>
                <div className="welcome-recent-list">
                  {recentFiles.slice(0, 5).map((f) => (
                    <div
                      key={f}
                      className="welcome-recent-item"
                      onClick={() => onOpenFileByPath?.(f)}
                    >
                      <span className="welcome-recent-icon">📄</span>
                      <div className="welcome-recent-body">
                        <div className="welcome-recent-name">
                          {f.split(/[/\\]/).pop() || f}
                        </div>
                        <div className="welcome-recent-path">{f}</div>
                      </div>
                      <button
                        className="welcome-recent-remove"
                        title={`Remove ${f.split(/[/\\]/).pop() || f} from recents`}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeRecentFile(f);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Keyboard shortcuts */}
            <section className="welcome-section">
              <div className="welcome-section-header">
                <div className="welcome-section-title">
                  <span className="welcome-section-bar" />
                  <span>Keyboard Shortcuts</span>
                </div>
              </div>
              <div className="keyboard-list">
                {SHORTCUTS.map((s) => (
                  <div className="keyboard-row" key={s.action}>
                    <span className="keyboard-action">{s.action}</span>
                    <kbd className="shortcut-kbd">{s.keys}</kbd>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Built-in examples */}
          <div className="welcome-col">
            <section className="welcome-section">
              <div className="welcome-section-header">
                <div className="welcome-section-title">
                  <span className="welcome-section-bar" />
                  <span>Built-in Examples</span>
                </div>
              </div>
              <div className="welcome-examples">
                {BUILT_IN_EXAMPLES.map((ex) => (
                  <div
                    key={ex.id}
                    className="example-item"
                    onClick={() => onOpenExample?.(ex.code, ex.filename)}
                  >
                    <span className="example-icon">{ex.icon}</span>
                    <div className="example-body">
                      <div className="example-label">{ex.label}</div>
                      <div className="example-desc">{ex.description}</div>
                    </div>
                    <span className="example-arrow" aria-hidden="true">
                      →
                    </span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}