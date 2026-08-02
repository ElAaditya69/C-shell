import { useState } from "react";

export interface Diagnostic {
  file: string;
  line: number;
  col: number;
  is_error: boolean;
  message: string;
}

interface DiagnosticsPanelProps {
  diagnostics: Diagnostic[];
  onSelectDiagnostic: (diag: Diagnostic) => void;
}

export function DiagnosticsPanel({
  diagnostics,
  onSelectDiagnostic,
}: DiagnosticsPanelProps) {
  const [filter, setFilter] = useState<"all" | "errors" | "warnings">("all");

  const errors = diagnostics.filter((d) => d.is_error);
  const warnings = diagnostics.filter((d) => !d.is_error);

  const filtered = diagnostics.filter((d) => {
    if (filter === "errors") return d.is_error;
    if (filter === "warnings") return !d.is_error;
    return true;
  });

  const copyDiagnostic = (d: Diagnostic, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `${d.file}:${d.line}:${d.col}: ${d.is_error ? "error" : "warning"}: ${d.message}`;
    navigator.clipboard.writeText(text);
  };

  const copyAllDiagnostics = () => {
    const text = diagnostics
      .map(
        (d) =>
          `${d.file}:${d.line}:${d.col}: ${d.is_error ? "error" : "warning"}: ${d.message}`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
  };

  if (diagnostics.length === 0) {
    return (
      <div className="empty-state" style={{ padding: "16px" }}>
        <p>🟢 No problems detected in compilation.</p>
      </div>
    );
  }

  return (
    <div
      className="diagnostics-panel"
      style={{
        padding: "8px",
        overflowY: "auto",
        height: "100%",
        fontFamily: "monospace",
        fontSize: "12px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Filter and Summary Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "8px",
          paddingBottom: "6px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span
            style={{
              background: "rgba(255, 51, 51, 0.2)",
              color: "#ff3333",
              padding: "2px 8px",
              borderRadius: "10px",
              fontWeight: 600,
            }}
          >
            ❌ {errors.length} Errors
          </span>
          <span
            style={{
              background: "rgba(255, 176, 0, 0.2)",
              color: "#ffb000",
              padding: "2px 8px",
              borderRadius: "10px",
              fontWeight: 600,
            }}
          >
            ⚠️ {warnings.length} Warnings
          </span>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            style={{
              padding: "2px 6px",
              borderRadius: "4px",
              border: "1px solid var(--border)",
              background: "var(--bg-primary)",
              color: "var(--text-primary)",
              fontSize: "11px",
            }}
          >
            <option value="all">Show All ({diagnostics.length})</option>
            <option value="errors">Errors Only ({errors.length})</option>
            <option value="warnings">Warnings Only ({warnings.length})</option>
          </select>

          <button
            className="action-btn secondary"
            onClick={copyAllDiagnostics}
            style={{ padding: "2px 8px", fontSize: "11px" }}
            title="Copy all diagnostic messages to clipboard"
          >
            📋 Copy All
          </button>
        </div>
      </div>

      {/* Diagnostics List */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {filtered.map((d, i) => (
          <div
            key={`${d.file}-${d.line}-${d.col}-${i}`}
            onClick={() => onSelectDiagnostic(d)}
            style={{
              padding: "6px 10px",
              marginBottom: "4px",
              borderRadius: "4px",
              background: d.is_error
                ? "rgba(255, 51, 51, 0.1)"
                : "rgba(255, 176, 0, 0.1)",
              borderLeft: `3px solid ${
                d.is_error ? "#ff3333" : "#ffb000"
              }`,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <span style={{ fontSize: "14px" }}>{d.is_error ? "❌" : "⚠️"}</span>
            <span style={{ fontWeight: 600, color: "var(--accent)" }}>
              {d.file}:{d.line}:{d.col}
            </span>
            <span style={{ color: "var(--text-primary)", flex: 1 }}>
              {d.message}
            </span>
            <button
              onClick={(e) => copyDiagnostic(d, e)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-dim)",
                cursor: "pointer",
                fontSize: "11px",
              }}
              title="Copy message"
            >
              📋
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
