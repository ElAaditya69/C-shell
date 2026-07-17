interface FileTreeProps {
  files: string[];
  currentFile: string | null;
  currentDir: string;
  onFileSelect: (path: string) => void;
  onNewFile: () => void;
  onOpenFolder: () => void;
  onDeleteFile: (path: string) => void;
}

export function FileTree({
  files,
  currentFile,
  currentDir,
  onFileSelect,
  onNewFile,
  onOpenFolder,
  onDeleteFile,
}: FileTreeProps) {
  return (
    <div
      className="file-tree"
      onClickCapture={() => {
        console.log("FILE TREE CLICK");
        alert("FILE TREE CLICK");
      }}
    >
      <div className="file-tree-header">
        <span>📂 EXPLORER</span>
      </div>

      <div className="file-tree-actions">
        <button
          className="action-btn"
          onClick={onNewFile}
          title="New File (Ctrl+N)"
        >
          📝 New
        </button>

        <button
          className="action-btn"
          onClick={onOpenFolder}
          title="Open Folder (Ctrl+O)"
        >
          📁 Open
        </button>
      </div>

      <div className="file-tree-path">
        {currentDir.split("/").pop() || "Desktop"}
      </div>

      <div className="file-list">
        {files.length === 0 ? (
          <div className="empty-state">
            <p>No .c files found</p>
            <p>Click "Open" to browse</p>
          </div>
        ) : (
          files.map((file) => {
            const filename = file.split("/").pop() || file;
            const isActive = currentFile === file;

            return (
              <div
                key={file}
                className={`file-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  console.log("Clicked:", file);
                  alert(file);
                  onFileSelect(file);
                }}
              >
                <span className="file-icon">📄</span>

                <span className="file-name">
                  {filename}
                </span>

                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFile(file);
                  }}
                  title="Delete"
                >
                  🗑️
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
