import { useState } from "react";
import { FileNode, FileService } from "../../services/FileService";

interface FileTreeNodeProps {
  node: FileNode;
  currentFile: string | null;
  density?: 'compact' | 'comfortable';
  showHidden?: boolean;
  sortBy?: 'name' | 'type';
  onFileSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  onMoveNode?: (srcPath: string, targetFolderPath: string) => void;
}

export function FileTreeNode({
  node,
  currentFile,
  density = 'comfortable',
  showHidden = false,
  sortBy = 'name',
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
    if (name.endsWith(".py")) return "🐍";
    if (name.endsWith(".js") || name.endsWith(".ts")) return "📜";
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

  // Process children according to showHidden and sortBy filters
  let processedChildren = (children || []).filter(
    (f) => showHidden || !f.name.startsWith(".")
  );
  processedChildren.sort((a, b) => {
    if (a.is_dir !== b.is_dir) return a.is_dir ? -1 : 1;
    if (sortBy === 'type') {
      const extA = a.name.split('.').pop() || '';
      const extB = b.name.split('.').pop() || '';
      return extA.localeCompare(extB);
    }
    return a.name.localeCompare(b.name);
  });

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
          {processedChildren.length === 0 && !loading && (
            <div className="file-tree-loading" style={{ opacity: 0.5, fontStyle: "italic" }}>
              (empty folder)
            </div>
          )}
          {processedChildren.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              currentFile={currentFile}
              density={density}
              showHidden={showHidden}
              sortBy={sortBy}
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
