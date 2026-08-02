import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";

export type ActivityState =
  | "idle"
  | "compiling"
  | "running"
  | "building"
  | "formatting";

interface ToolbarProps {
  onRun: () => void;
  onBuild: () => void;
  onFormat: () => void;
  onScreenshot: () => void;
  onReport: () => void;
  onSave: () => void;
  onNew: () => void;
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onOpenSettings: () => void;
  activityState: ActivityState;
  currentFile: string | null;
}

export function Toolbar({
  onRun,
  onBuild,
  onFormat,
  onScreenshot,
  onReport,
  onSave,
  onNew,
  onOpenFolder,
  onOpenFile,
  onOpenSettings,
  activityState,
  currentFile,
}: ToolbarProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const { settings } = useSettings();
  const busy = activityState !== "idle";

  const showLabels = settings.showToolbarLabels;

  const runLabel =
    activityState === "compiling"
      ? showLabels ? "⏳ Compiling..." : "⏳"
      : activityState === "running"
      ? showLabels ? "🟡 Running..." : "🟡"
      : showLabels ? "▶ Run" : "▶";

  const buildLabel =
    activityState === "building"
      ? showLabels ? "⏳ Building..." : "⏳"
      : showLabels ? "🔨 Build" : "🔨";

  const toolsAction = (fn: () => void) => () => {
    fn();
    setToolsOpen(false);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="toolbar-group">
          <button
            className={`run-btn ${busy ? "running" : ""}`}
            onClick={onRun}
            disabled={busy}
            title="Run Code (Ctrl/Cmd+Enter)"
          >
            {runLabel}
          </button>

          <button
            className="tool-btn"
            onClick={onBuild}
            disabled={busy}
            title="Build Executable"
          >
            {buildLabel}
          </button>
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group tools-dropdown-wrapper">
          <button
            className="tool-btn"
            onClick={() => setToolsOpen((v) => !v)}
            title="Format, Snapshot, Lab Report"
          >
            {activityState === "formatting"
              ? showLabels ? "⏳ Formatting..." : "⏳"
              : showLabels ? "🛠️ Tools ▾" : "🛠️ ▾"}
          </button>

          {toolsOpen && (
            <>
              <div
                className="context-menu-backdrop"
                onClick={() => setToolsOpen(false)}
              />
              <div className="context-menu tools-menu">
                <button onClick={toolsAction(onFormat)} disabled={busy}>
                  ✨ Format (Ctrl+Shift+F)
                </button>
                <button onClick={toolsAction(onScreenshot)}>
                  📸 Snapshot (Ctrl+Alt+S)
                </button>
                <button onClick={toolsAction(onReport)}>
                  📄 Lab Report (Ctrl+Alt+R)
                </button>
              </div>
            </>
          )}
        </div>

        <div className="toolbar-divider" />

        <div className="toolbar-group">
          <button className="tool-btn subtle" onClick={onSave} title="Save File (Ctrl/Cmd+S)">
            💾 {showLabels && "Save"}
          </button>
          <button className="tool-btn subtle" onClick={onNew} title="New File (Ctrl/Cmd+N)">
            📝 {showLabels && "New"}
          </button>
          <button className="tool-btn subtle" onClick={onOpenFolder} title="Open Folder (Ctrl/Cmd+O)">
            📁 {showLabels && "Folder"}
          </button>
          <button className="tool-btn subtle" onClick={onOpenFile} title="Open File">
            📄 {showLabels && "File"}
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        {currentFile && (
          <span className="file-label">📄 {currentFile.split("/").pop()}</span>
        )}
        <span className="badge">C99</span>
        <button
          className="icon-action-btn"
          onClick={onOpenSettings}
          title="Preferences (Ctrl/Cmd+,)"
          style={{ fontSize: "14px", marginLeft: "4px" }}
        >
          ⚙️
        </button>
      </div>
    </div>
  );
}
