export type RunState = "idle" | "compiling" | "running" | "building";

interface ToolbarProps {
  onRun: () => void;
  onBuild: () => void;
  onSave: () => void;
  onNew: () => void;
  onOpenFolder: () => void;
  onOpenFile: () => void;
  runState: RunState;
  currentFile: string | null;
}

export function Toolbar({
  onRun,
  onBuild,
  onSave,
  onNew,
  onOpenFolder,
  onOpenFile,
  runState,
  currentFile,
}: ToolbarProps) {
  const busy = runState !== "idle";

  const runLabel =
    runState === "compiling"
      ? "⏳ Compiling..."
      : runState === "running"
      ? "🟡 Running..."
      : "▶ Run";

  const buildLabel = runState === "building" ? "⏳ Building..." : "🔨 Build";

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button
          className={`run-btn ${busy ? "running" : ""}`}
          onClick={onRun}
          disabled={busy}
          title="Run (Ctrl+Enter)"
        >
          {runLabel}
        </button>

        <button
          className="tool-btn"
          onClick={onBuild}
          disabled={busy}
          title="Build only, don't run"
        >
          {buildLabel}
        </button>

        <button className="tool-btn" onClick={onSave} title="Save (Ctrl+S)">
          💾 Save
        </button>

        <button className="tool-btn" onClick={onNew} title="New File">
          📝 New
        </button>

        <button
          className="tool-btn"
          onClick={onOpenFolder}
          title="Open Folder"
        >
          📁 Open Folder
        </button>

        <button className="tool-btn" onClick={onOpenFile} title="Open File">
          📄 Open File
        </button>

        {currentFile && (
          <span className="file-label">{currentFile.split("/").pop()}</span>
        )}
      </div>

      <div className="toolbar-right">
        <span className="badge">C</span>
      </div>
    </div>
  );
}
