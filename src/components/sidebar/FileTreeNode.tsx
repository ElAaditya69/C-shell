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

  const getFileColor = (name: string, isDir: boolean) => {
    if (isDir) return "#f0a500";
    const ext = name.split(".").pop();
    if (ext === "c") return "#5c9cf5";
    if (ext === "h") return "#3dd68c";
    if (name === "Makefile") return "#f05c5c";
    return "#8b8fa8";
  };

  const renderIcon = (name: string, isDir: boolean) => {
    const color = getFileColor(name, isDir);
    if (isDir) {
      return (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
          <path
            d="M1 4h12v8H1V4zM1 4l2-2h4l1 2"
            stroke={color}
            strokeWidth="1.2"
            strokeLinejoin="round"
            fill="rgba(240,165,0,0.08)"
          />
        </svg>
      );
    }
    return (
      <svg width="12" height="14" viewBox="0 0 12 14" fill="none" style={{ flexShrink: 0 }}>
        <path
          d="M1 1h7l3 3v9H1V1z"
          stroke={color}
          strokeWidth="1.1"
          fill={color + "14"}
        />
        <path d="M8 1v3h3" stroke={color} strokeWidth="1.1" />
      </svg>
    );
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
          onClick={(e) => {
            if (!node.is_dir) return;
            // The caret sits inside a draggable row; a tiny mouse movement
            // during click can start a drag and swallow the click event. Give
            // the caret its own toggle handler so folders always collapse.
            e.stopPropagation();
            void handleClick();
          }}
          style={node.is_dir ? { cursor: "pointer" } : undefined}
        />
        <span style={{ display: "inline-flex", alignItems: "center", marginRight: "6px" }}>
          {renderIcon(node.name, node.is_dir)}
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
