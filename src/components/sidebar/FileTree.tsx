import { useEffect, useRef, useState } from "react";
import { FileNode, FileService } from "../../services/FileService";
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
  const [showHidden, setShowHidden] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'type'>('name');
  const [density, setDensity] = useState<'compact' | 'comfortable'>('comfortable');
  const [pinnedFolders, setPinnedFolders] = useState<string[]>([]);

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

  const handleMoveNode = async (srcPath: string, targetFolderPath: string) => {
    const fileName = srcPath.split("/").pop() || srcPath.split("\\").pop();
    if (!fileName) return;
    const destPath = `${targetFolderPath}/${fileName}`;
    try {
      await FileService.renamePath(srcPath, destPath);
      onRefresh();
    } catch (e) {
      alert(`Failed to move file: ${e}`);
    }
  };

  // Filter & sort files
  let processedFiles = files.filter((f) => showHidden || !f.name.startsWith("."));
  processedFiles.sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    if (sortBy === 'type') {
      const extA = a.name.split('.').pop() || '';
      const extB = b.name.split('.').pop() || '';
      return extA.localeCompare(extB);
    }
    return a.name.localeCompare(b.name);
  });

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
            onClick={() => setShowHidden((v) => !v)}
            title={showHidden ? "Hide Hidden Files" : "Show Hidden Files"}
            style={{ opacity: showHidden ? 1 : 0.5 }}
          >
            👁️
          </button>
          <button
            className="icon-action-btn"
            onClick={() => setSortBy((s) => (s === 'name' ? 'type' : 'name'))}
            title={`Sort by: ${sortBy.toUpperCase()}`}
          >
            🔤
          </button>
          <button
            className="icon-action-btn"
            onClick={() => setDensity((d) => (d === 'compact' ? 'comfortable' : 'compact'))}
            title={`Density: ${density}`}
          >
            🪟
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
            onClick={onNewFile}
            title="New File (Ctrl/Cmd+N)"
          >
            📝
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

      {pinnedFolders.length > 0 && (
        <div style={{ padding: "6px 12px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 600, marginBottom: "4px" }}>
            📌 PINNED FOLDERS
          </div>
          {pinnedFolders.map((p) => (
            <div
              key={p}
              onClick={() => onFileSelect(p)}
              style={{ fontSize: "12px", color: "var(--text-primary)", cursor: "pointer", padding: "2px 0" }}
            >
              📁 {p.split("/").pop()}
            </div>
          ))}
        </div>
      )}

      <div className="file-list">
        {processedFiles.length === 0 ? (
          <div className="empty-state">
            <p>Nothing here yet</p>
            <p>Click "Open" to browse a folder</p>
          </div>
        ) : (
          processedFiles.map((node) => (
            <FileTreeNode
              key={`${refreshKey}-${node.path}`}
              node={node}
              currentFile={currentFile}
              density={density}
              onFileSelect={onFileSelect}
              onContextMenu={openContextMenu}
              onMoveNode={handleMoveNode}
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
          onPinFolder={() => {
            if (menu.node.is_dir) {
              setPinnedFolders((prev) => Array.from(new Set([...prev, menu.node.path])));
            }
          }}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}
