import { useState } from "react";
import { FileNode, FileService } from "../../services/FileService";

interface FileTreeNodeProps {
  node: FileNode;
  currentFile: string | null;
  density?: 'compact' | 'comfortable';
  onFileSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  onMoveNode?: (srcPath: string, targetFolderPath: string) => void;
}

export function FileTreeNode({
  node,
  currentFile,
  density = 'comfortable',
  onFileSelect,
  onContextMenu,
  onMoveNode,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const getFileIcon = (name: string, isDir: boolean) => {
    if (isDir) return "📁";
    if (name.endsWith(".c")) return "⚡";
    if (name.endsWith(".h")) return "📋";
    if (name.endsWith(".json")) return "⚙️";
    if (name.endsWith(".md")) return "📄";
    return "📄";
  };

  const handleClick = async () => {
    if (!node.is_dir) {
      onFileSelect(node.path);
      return;
    }

    if (!expanded && children === null) {
      setLoading(true);
      try {
        const kids = await FileService.listDirectory(node.path);
        setChildren(kids);
      } catch (e) {
        console.error("Failed to load folder:", e);
      }
      setLoading(false);
    }
    setExpanded((v) => !v);
  };

  const isActive = !node.is_dir && currentFile === node.path;
  const paddingY = density === 'compact' ? '3px' : '6px';

  return (
    <div className="tree-node">
      <div
        className={`file-item ${isActive ? "active" : ""} ${isDragOver ? "drag-over" : ""}`}
        style={{ padding: `${paddingY} 8px` }}
        onClick={handleClick}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData("text/plain", node.path);
        }}
        onDragOver={(e) => {
          if (node.is_dir) {
            e.preventDefault();
            setIsDragOver(true);
          }
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const srcPath = e.dataTransfer.getData("text/plain");
          if (srcPath && node.is_dir && srcPath !== node.path) {
            onMoveNode?.(srcPath, node.path);
          }
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, node);
        }}
      >
        <span
          className={`tree-caret ${node.is_dir ? "" : "tree-caret-hidden"} ${
            expanded ? "expanded" : ""
          }`}
        />
        <span style={{ marginRight: "6px", fontSize: "12px" }}>
          {getFileIcon(node.name, node.is_dir)}
        </span>
        <span className={`file-name ${node.is_dir ? "is-dir" : ""}`}>
          {node.name}
        </span>
      </div>

      {node.is_dir && expanded && (
        <div className="tree-children">
          {loading && <div className="file-tree-loading">Loading...</div>}
          {children?.length === 0 && !loading && (
            <div className="file-tree-loading">(empty)</div>
          )}
          {children?.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              currentFile={currentFile}
              density={density}
              onFileSelect={onFileSelect}
              onContextMenu={onContextMenu}
              onMoveNode={onMoveNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
