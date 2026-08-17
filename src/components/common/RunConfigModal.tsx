import { useState } from "react";
import { FileService } from "../../services/FileService";
import { RunConfig } from "../../services/CompileService";

interface RunConfigModalProps {
  config: RunConfig;
  onSave: (config: RunConfig) => void;
  onClose: () => void;
}

/**
 * Per-run launch configuration: program arguments, stdin redirection from a
 * file, and a working directory. The config is passed to the backend as
 * structured data (never a shell string) — the backend quotes every value
 * when it builds the run line.
 */
export function RunConfigModal({ config, onSave, onClose }: RunConfigModalProps) {
  const [argsText, setArgsText] = useState((config.args ?? []).join(" "));
  const [stdinFile, setStdinFile] = useState(config.stdinFile ?? "");
  const [cwd, setCwd] = useState(config.cwd ?? "");

  const pickStdin = async () => {
    const picked = await FileService.openFileDialog();
    if (picked) setStdinFile(picked);
  };

  const pickCwd = async () => {
    const picked = await FileService.openFolder();
    if (picked) setCwd(picked);
  };

  const save = () => {
    onSave({
      args: argsText.trim() ? argsText.trim().split(/\s+/) : [],
      stdinFile: stdinFile.trim() || undefined,
      cwd: cwd.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "540px", padding: "20px" }}
      >
        <div className="modal-header">
          <h3>⚙️ Run Configuration</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 600 }}>
              PROGRAM ARGUMENTS
            </label>
            <input
              type="text"
              placeholder="-v --input data.txt (space-separated)"
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                marginTop: "4px",
                fontFamily: "monospace",
              }}
            />
            <div style={{ fontSize: "11px", color: "var(--text-dim)", marginTop: "4px" }}>
              Each word becomes one argv value. Use quotes in the shell only if
              your argument contains spaces (e.g. {"\""}two words{"\""}).
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 600 }}>
              REDIRECT STDIN FROM FILE
            </label>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <input
                type="text"
                placeholder="Leave empty to type input in the terminal"
                value={stdinFile}
                onChange={(e) => setStdinFile(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontFamily: "monospace",
                }}
              />
              <button className="action-btn secondary" onClick={pickStdin} style={{ whiteSpace: "nowrap" }}>
                📂 Browse…
              </button>
            </div>
          </div>

          <div>
            <label style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 600 }}>
              WORKING DIRECTORY (OPTIONAL)
            </label>
            <div style={{ display: "flex", gap: "8px", marginTop: "4px" }}>
              <input
                type="text"
                placeholder="Defaults to the build temp directory"
                value={cwd}
                onChange={(e) => setCwd(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "6px",
                  border: "1px solid var(--border)",
                  background: "var(--bg-primary)",
                  color: "var(--text-primary)",
                  fontFamily: "monospace",
                }}
              />
              <button className="action-btn secondary" onClick={pickCwd} style={{ whiteSpace: "nowrap" }}>
                📁 Browse…
              </button>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginTop: "16px", justifyContent: "flex-end" }}>
          <button className="action-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="action-btn primary" onClick={save}>
            Save Config
          </button>
        </div>
      </div>
    </div>
  );
}