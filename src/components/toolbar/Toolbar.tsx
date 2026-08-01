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
  activityState,
  currentFile,
}: ToolbarProps) {
  const busy = activityState !== "idle";

  const runLabel =
    activityState === "compiling"
      ? "⏳ Compiling..."
      : activityState === "running"
      ? "🟡 Running..."
      : "▶ Run";

  const buildLabel =
    activityState === "building" ? "⏳ Building..." : "🔨 Build";

  const formatLabel =
    activityState === "formatting" ? "⏳ Formatting..." : "✨ Format";

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        {/* Execution Group */}
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

        {/* Tools Group */}
        <div className="toolbar-group">
          <button
            className="tool-btn"
            onClick={onFormat}
            disabled={busy}
            title="Format Document (Ctrl/Cmd+Shift+F)"
          >
            {formatLabel}
          </button>

          <button
            className="tool-btn"
            onClick={onScreenshot}
            title="Code Screenshot (Ctrl/Cmd+Alt+S)"
          >
            📸 Snapshot
          </button>

          <button
            className="tool-btn"
            onClick={onReport}
            title="Generate Lab Report (Ctrl/Cmd+Alt+R)"
          >
            📄 Lab Report
          </button>
        </div>

        <div className="toolbar-divider" />

        {/* File Actions Group */}
        <div className="toolbar-group">
          <button className="tool-btn icon-btn" onClick={onSave} title="Save File (Ctrl/Cmd+S)">
            💾 Save
          </button>

          <button className="tool-btn icon-btn" onClick={onNew} title="New File (Ctrl/Cmd+N)">
            📝 New
          </button>

          <button
            className="tool-btn icon-btn"
            onClick={onOpenFolder}
            title="Open Folder (Ctrl/Cmd+O)"
          >
            📁 Folder
          </button>

          <button className="tool-btn icon-btn" onClick={onOpenFile} title="Open File">
            📄 File
          </button>
        </div>
      </div>

      <div className="toolbar-right">
        {currentFile && (
          <span className="file-label">📄 {currentFile.split("/").pop()}</span>
        )}
        <span className="badge">C99</span>
      </div>
    </div>
  );
}