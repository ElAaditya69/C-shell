import { useEffect, useRef, useState } from "react";
import { FileNode } from "../../services/FileService";
import { FileTreeNode } from "./FileTreeNode";
import { ContextMenu } from "./ContextMenu";
import { useSettings } from "../../context/SettingsContext";

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

const MIN_WIDTH = 160;
const MAX_WIDTH = 480;
const COLLAPSED_WIDTH = 32;

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
  const { settings, updateSettings } = useSettings();
  const [width, setWidth] = useState(settings.sidebarWidth || 220);
  const [collapsed, setCollapsed] = useState(false);
  const draggingRef = useRef(false);
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    if (settings.sidebarWidth) {
      setWidth(settings.sidebarWidth);
    }
  }, [settings.sidebarWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setWidth(Math.min(Math.max(e.clientX, MIN_WIDTH), MAX_WIDTH));
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        updateSettings({ sidebarWidth: widthRef.current });
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateSettings]);

  const startDrag = (e: React.MouseEvent) => {
    draggingRef.current = true;
    e.preventDefault();
  };

  const openContextMenu = (e: React.MouseEvent, node: FileNode) => {
    setMenu({ x: e.clientX, y: e.clientY, node });
  };

  if (collapsed) {
    return (
      <div className="file-tree collapsed" style={{ width: COLLAPSED_WIDTH }}>
        <button
          className="sidebar-expand-btn"
          onClick={() => setCollapsed(false)}
          title="Show Explorer"
        >
          »
        </button>
      </div>
    );
  }

  return (
    <div className="file-tree" style={{ width }}>
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
          <button
            className="icon-action-btn"
            onClick={() => setCollapsed(true)}
            title="Collapse Explorer"
          >
            «
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

      <div className="file-tree-drag-handle" onMouseDown={startDrag} />

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
