import { useState } from "react";
import { FileNode, FileService } from "../../services/FileService";

interface FileTreeNodeProps {
  node: FileNode;
  currentFile: string | null;
  onFileSelect: (path: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
}

export function FileTreeNode({
  node,
  currentFile,
  onFileSelect,
  onContextMenu,
}: FileTreeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<FileNode[] | null>(null);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="tree-node">
      <div
        className={`file-item ${isActive ? "active" : ""}`}
        onClick={handleClick}
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
              onFileSelect={onFileSelect}
              onContextMenu={onContextMenu}
            />
          ))}
        </div>
      )}
    </div>
  );
}
