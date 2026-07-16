interface ToolbarProps {
  onRun: () => void;
  onSave: () => void;
  onNew: () => void;
  onOpenFolder: () => void;
  onOpenFile: () => void;
  isRunning: boolean;
  currentFile: string | null;
}

export function Toolbar({
  onRun,
  onSave,
  onNew,
  onOpenFolder,
  onOpenFile,
  isRunning,
  currentFile,
}: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button
          className={`run-btn ${isRunning ? "running" : ""}`}
          onClick={onRun}
          disabled={isRunning}
          title="Run (Ctrl+Enter)"
        >
          {isRunning ? "⏳ Running..." : "▶ Run"}
        </button>

        <button
          className="tool-btn"
          onClick={onSave}
          title="Save (Ctrl+S)"
        >
          💾 Save
        </button>

        <button
          className="tool-btn"
          onClick={onNew}
          title="New File"
        >
          📝 New
        </button>

        <button
          className="tool-btn"
          onClick={onOpenFolder}
          title="Open Folder"
        >
          📁 Open Folder
        </button>

        <button
          className="tool-btn"
          onClick={onOpenFile}
          title="Open File"
        >
          📄 Open File
        </button>

        {currentFile && (
          <span className="file-label">
            {currentFile.split("/").pop()}
          </span>
        )}
      </div>

      <div className="toolbar-right">
        <span className="badge">C</span>
      </div>
    </div>
  );
}