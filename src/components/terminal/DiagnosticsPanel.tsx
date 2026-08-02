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
      }}
    >
      {diagnostics.map((d, i) => (
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
              d.is_error ? "var(--error)" : "var(--text-primary)"
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
        </div>
      ))}
    </div>
  );
}
