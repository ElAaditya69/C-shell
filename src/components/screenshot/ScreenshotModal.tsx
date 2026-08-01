import { useRef, useState } from "react";
import { ScreenshotService } from "../../services/ScreenshotService";

interface ScreenshotModalProps {
  code: string;
  fileName: string;
  onClose: () => void;
}

type Theme = "retro" | "cyberpunk" | "onedark" | "clean";
type WindowStyle = "mac" | "win" | "minimal";

export function ScreenshotModal({ code, fileName, onClose }: ScreenshotModalProps) {
  const [theme, setTheme] = useState<Theme>("retro");
  const [windowStyle, setWindowStyle] = useState<WindowStyle>("mac");
  const [padding, setPadding] = useState<number>(32);
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [showFileName, setShowFileName] = useState(true);
  const [busy, setBusy] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const url = await ScreenshotService.captureToDataUrl(cardRef.current);
      await ScreenshotService.copyToClipboard(url);
      alert("📸 Image copied to clipboard!");
    } catch (e) {
      alert(`Failed to copy image: ${e}`);
    }
    setBusy(false);
  };

  const handleSave = async () => {
    if (!cardRef.current) return;
    setBusy(true);
    try {
      const url = await ScreenshotService.captureToDataUrl(cardRef.current);
      const defaultName = `${fileName.replace(/\.c$/, "")}_snapshot.png`;
      const saved = await ScreenshotService.saveImage(url, defaultName);
      if (saved) {
        alert("💾 Screenshot saved successfully!");
      }
    } catch (e) {
      alert(`Failed to save screenshot: ${e}`);
    }
    setBusy(false);
  };

  const lines = code.split("\n");

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content screenshot-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>📸 Code Screenshot Generator</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="screenshot-options">
          <div className="option-group">
            <label>Theme:</label>
            <select value={theme} onChange={(e) => setTheme(e.target.value as Theme)}>
              <option value="retro">⚡ Retro Amber</option>
              <option value="cyberpunk">🔮 Synthwave</option>
              <option value="onedark">🌃 One Dark</option>
              <option value="clean">☀️ Clean Light</option>
            </select>
          </div>

          <div className="option-group">
            <label>Window Style:</label>
            <select
              value={windowStyle}
              onChange={(e) => setWindowStyle(e.target.value as WindowStyle)}
            >
              <option value="mac">🔴🟡🟢 macOS Dots</option>
              <option value="win">🔲 Windows Frame</option>
              <option value="minimal">── Minimal</option>
            </select>
          </div>

          <div className="option-group">
            <label>Padding:</label>
            <select
              value={padding}
              onChange={(e) => setPadding(Number(e.target.value))}
            >
              <option value={16}>Small (16px)</option>
              <option value={32}>Medium (32px)</option>
              <option value={48}>Large (48px)</option>
            </select>
          </div>

          <div className="option-group check-group">
            <label>
              <input
                type="checkbox"
                checked={showLineNumbers}
                onChange={(e) => setShowLineNumbers(e.target.checked)}
              />
              Line Numbers
            </label>
            <label>
              <input
                type="checkbox"
                checked={showFileName}
                onChange={(e) => setShowFileName(e.target.checked)}
              />
              File Badge
            </label>
          </div>
        </div>

        {/* Captured Canvas Wrapper */}
        <div className="screenshot-preview-container">
          <div
            ref={cardRef}
            className={`screenshot-card theme-${theme}`}
            style={{ padding: `${padding}px` }}
          >
            <div className={`window-header style-${windowStyle}`}>
              {windowStyle === "mac" && (
                <div className="mac-dots">
                  <span className="dot red" />
                  <span className="dot yellow" />
                  <span className="dot green" />
                </div>
              )}
              {windowStyle === "win" && (
                <div className="win-title">C-Shell Code Editor</div>
              )}
              {showFileName && (
                <span className="file-badge">📄 {fileName || "main.c"}</span>
              )}
            </div>

            <div className="code-content">
              {lines.map((line, idx) => (
                <div key={idx} className="code-line">
                  {showLineNumbers && (
                    <span className="line-num">{idx + 1}</span>
                  )}
                  <span className="line-text">{line || " "}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-actions">
          <button
            className="action-btn primary"
            onClick={handleCopy}
            disabled={busy}
          >
            📋 Copy to Clipboard
          </button>
          <button
            className="action-btn secondary"
            onClick={handleSave}
            disabled={busy}
          >
            💾 Save PNG Image
          </button>
          <button className="action-btn cancel" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
