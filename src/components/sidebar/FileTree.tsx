import { useState } from "react";
import { FileNode } from "../../services/FileService";
import { FileTreeNode } from "./FileTreeNode";
import { ContextMenu } from "./ContextMenu";

interface FileTreeProps {
  files: FileNode[];
  currentFile: string | null;
  currentDir: string;
  refreshKey: number;
  onFileSelect: (path: string) => void;
  onNewFile: () => void;
  onOpenFolder: () => void;
  onRefresh: () => void;
  onDeleteNode: (path: string, isDir: boolean) => void;
  onRenameNode: (path: string, currentName: string) => void;
  onNewFolder: (parentPath: string) => void;
  onNewFileInFolder: (parentPath: string) => void;
}

export function FileTree({
  files,
  currentFile,
  currentDir,
  refreshKey,
  onFileSelect,
  onNewFile,
  onOpenFolder,
  onRefresh,
  onDeleteNode,
  onRenameNode,
  onNewFolder,
  onNewFileInFolder,
}: FileTreeProps) {
  const [menu, setMenu] = useState<{ x: number; y: number; node: FileNode } | null>(
    null
  );

  const openContextMenu = (e: React.MouseEvent, node: FileNode) => {
    setMenu({ x: e.clientX, y: e.clientY, node });
  };

  return (
    <div className="file-tree">
      <div className="file-tree-header">
        <span className="explorer-title">📂 EXPLORER</span>
        <div className="file-tree-header-actions">
          <button
            className="icon-action-btn"
            onClick={onNewFile}
            title="New File (Ctrl/Cmd+N)"
          >
            📝
          </button>
          <button
            className="icon-action-btn"
            onClick={onOpenFolder}
            title="Open Folder (Ctrl/Cmd+O)"
          >
            📁
          </button>
          <button
            className="icon-action-btn"
            onClick={onRefresh}
            title="Refresh Explorer"
          >
            🔄
          </button>
        </div>
      </div>

      <div className="file-tree-path">
        {currentDir.split("/").pop() || "Desktop"}
      </div>

      <div className="file-list">
        {files.length === 0 ? (
          <div className="empty-state">
            <p>Nothing here yet</p>
            <p>Click "Open" to browse a folder</p>
          </div>
        ) : (
          files.map((node) => (
            <FileTreeNode
              key={`${refreshKey}-${node.path}`}
              node={node}
              currentFile={currentFile}
              onFileSelect={onFileSelect}
              onContextMenu={openContextMenu}
            />
          ))
        )}
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          node={menu.node}
          onRename={() => onRenameNode(menu.node.path, menu.node.name)}
          onDelete={() => onDeleteNode(menu.node.path, menu.node.is_dir)}
          onNewFile={() => onNewFileInFolder(menu.node.path)}
          onNewFolder={() => onNewFolder(menu.node.path)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
