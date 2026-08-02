import { useState } from "react";
import { FileNode } from "../../services/FileService";
import { FileService } from "../../services/FileService";

interface SearchInFilesModalProps {
  files: FileNode[];
  onSelectFile: (path: string) => void;
  onClose: () => void;
}

interface SearchResult {
  filePath: string;
  fileName: string;
  line: number;
  content: string;
}

export function SearchInFilesModal({
  files,
  onSelectFile,
  onClose,
}: SearchInFilesModalProps) {
  const [query, setQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [replacedCount, setReplacedCount] = useState<number | null>(null);

  const flattenFiles = (nodes: FileNode[]): FileNode[] => {
    let acc: FileNode[] = [];
    nodes.forEach((n) => {
      if (!n.is_dir) {
        acc.push(n);
      }
      if (n.children) {
        acc = acc.concat(flattenFiles(n.children));
      }
    });
    return acc;
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setReplacedCount(null);
    const allFiles = flattenFiles(files);
    const matches: SearchResult[] = [];

    for (const f of allFiles) {
      try {
        const content = await FileService.readFile(f.path);
        const lines = content.split("\n");
        lines.forEach((lineText, idx) => {
          if (lineText.toLowerCase().includes(query.toLowerCase())) {
            matches.push({
              filePath: f.path,
              fileName: f.name,
              line: idx + 1,
              content: lineText.trim(),
            });
          }
        });
      } catch {
        // Skip unreadable binary/deleted files
      }
    }

    setResults(matches);
    setSearching(false);
  };

  const handleReplaceAll = async () => {
    if (!query || results.length === 0) return;
    const uniquePaths = Array.from(new Set(results.map((r) => r.filePath)));
    let totalReplaced = 0;

    for (const path of uniquePaths) {
      try {
        const content = await FileService.readFile(path);
        const regex = new RegExp(query, "gi");
        const matches = content.match(regex);
        if (matches) {
          totalReplaced += matches.length;
          const updated = content.replace(regex, replaceQuery);
          await FileService.writeFile(path, updated);
        }
      } catch (e) {
        console.error("Replace failed for path:", path, e);
      }
    }

    setReplacedCount(totalReplaced);
    handleSearch();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "560px", padding: "20px" }}
      >
        <div className="modal-header">
          <h3>🔍 Search & Replace in Workspace</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 600 }}>
              SEARCH TERM
            </label>
            <input
              type="text"
              placeholder="Search across all project files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              autoFocus
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                marginTop: "4px",
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 600 }}>
              REPLACE WITH
            </label>
            <input
              type="text"
              placeholder="Replacement text..."
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                marginTop: "4px",
              }}
            />
          </div>

          <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
            <button
              className="action-btn primary"
              onClick={handleSearch}
              disabled={searching}
            >
              {searching ? "Searching..." : "🔍 Search Workspace"}
            </button>
            {results.length > 0 && (
              <button
                className="action-btn secondary"
                onClick={handleReplaceAll}
              >
                🔄 Replace All Matches ({results.length})
              </button>
            )}
          </div>
        </div>

        {replacedCount !== null && (
          <div
            style={{
              marginTop: "12px",
              padding: "8px 12px",
              borderRadius: "6px",
              background: "rgba(46, 204, 113, 0.15)",
              color: "#2ecc71",
              fontSize: "13px",
              fontWeight: 600,
            }}
          >
            ✅ Replaced {replacedCount} occurrences across files.
          </div>
        )}

        <div
          style={{
            marginTop: "16px",
            maxHeight: "260px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          {results.length === 0 ? (
            <div style={{ color: "var(--text-dim)", fontSize: "13px", textAlign: "center", padding: "16px" }}>
              {query ? "No matching lines found." : "Enter a search term above."}
            </div>
          ) : (
            results.map((res, i) => (
              <div
                key={i}
                onClick={() => {
                  onSelectFile(res.filePath);
                  onClose();
                }}
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  background: "var(--bg-hover)",
                  cursor: "pointer",
                  fontSize: "12px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--accent)" }}>
                  <span>📄 {res.fileName}</span>
                  <span>Line {res.line}</span>
                </div>
                <div style={{ color: "var(--text-dim)", fontFamily: "monospace" }}>
                  {res.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
