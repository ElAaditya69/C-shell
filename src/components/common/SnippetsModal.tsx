import { useState } from "react";
import { BUILT_IN_SNIPPETS, CodeSnippet } from "../../data/examples";

interface SnippetsModalProps {
  onInsert: (snippet: string) => void;
  onClose: () => void;
}

export function SnippetsModal({ onInsert, onClose }: SnippetsModalProps) {
  const [filter, setFilter] = useState("");

  const filtered = BUILT_IN_SNIPPETS.filter(
    (s) =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.prefix.toLowerCase().includes(filter.toLowerCase()) ||
      s.description.toLowerCase().includes(filter.toLowerCase())
  );

  const handleInsert = (snippet: CodeSnippet) => {
    onInsert(snippet.body);
    onClose();
  };

  return (
    <div className="snippets-modal-overlay" onClick={onClose}>
      <div className="snippets-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
          <input
            type="text"
            placeholder="🔍 Search snippets..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none",
            }}
          />
        </div>
        <div style={{ overflowY: "auto", flex: 1 }}>
          {filtered.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--text-dim)" }}>
              No snippets found.
            </div>
          )}
          {filtered.map((s) => (
            <div
              key={s.prefix}
              className="snippet-item"
              onClick={() => handleInsert(s)}
            >
              <div>
                <span className="snippet-name">{s.name}</span>
                <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "2px" }}>
                  {s.description}
                </div>
              </div>
              <span className="snippet-prefix">{s.prefix}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
