import { FileNode } from "../../services/FileService";

interface ContextMenuProps {
  x: number;
  y: number;
  node: FileNode;
  onRename: () => void;
  onDelete: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onPinFolder?: () => void;
  onClose: () => void;
}

export function ContextMenu({
  x,
  y,
  node,
  onRename,
  onDelete,
  onNewFile,
  onNewFolder,
  onPinFolder,
  onClose,
}: ContextMenuProps) {
  const action = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <>
      <div className="context-menu-backdrop" onClick={onClose} />
      <div className="context-menu" style={{ top: y, left: x }}>
        {node.is_dir && (
          <>
            <button onClick={action(onNewFile)}>📄 New File</button>
            <button onClick={action(onNewFolder)}>📁 New Folder</button>
            {onPinFolder && <button onClick={action(onPinFolder)}>📌 Pin to Favorites</button>}
            <div className="context-menu-divider" />
          </>
        )}
        <button onClick={action(onRename)}>✏️ Rename</button>
        <button
          onClick={action(() => {
            navigator.clipboard.writeText(node.path);
          })}
        >
          📋 Copy Path
        </button>
        <button onClick={action(onDelete)} className="danger">
          🗑️ Delete
        </button>
      </div>
    </>
  );
}
