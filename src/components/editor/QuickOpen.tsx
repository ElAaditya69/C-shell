import { useEffect, useRef, useState } from "react";
import { FileNode } from "../../services/FileService";

interface QuickOpenProps {
  files: FileNode[];
  onSelect: (path: string) => void;
  onClose: () => void;
}

export function QuickOpen({ files, onSelect, onClose }: QuickOpenProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = files
    .filter((f) => !f.is_dir)
    .filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        onSelect(filtered[activeIndex].path);
        onClose();
      }
    }
  };

  return (
    <div className="quick-open-backdrop" onClick={onClose}>
      <div className="quick-open-box" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="quick-open-input"
          placeholder="Type a file name... (current folder only)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="quick-open-list">
          {filtered.length === 0 ? (
            <div className="quick-open-empty">No matching files</div>
          ) : (
            filtered.map((file, i) => (
              <div
                key={file.path}
                className={`quick-open-item ${i === activeIndex ? "active" : ""}`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  onSelect(file.path);
                  onClose();
                }}
              >
                {file.name}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
