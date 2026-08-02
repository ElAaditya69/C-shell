import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { XTermView, XTermHandle } from "./XTermView";
import { DiagnosticsPanel, Diagnostic } from "./DiagnosticsPanel";
import { useSettings } from "../../context/SettingsContext";
import { listen } from "@tauri-apps/api/event";

type Mode = "normal" | "minimized" | "maximized" | "closed";
type PanelTab = "terminal" | "problems";

const MIN_HEIGHT = 120;
const MINIMIZED_HEIGHT = 80;
const CLOSED_HEIGHT = 32;

export interface TerminalPanelHandle {
  getTerminalBuffer: () => string;
  clear: () => void;
}

interface TerminalPanelProps {
  onSelectDiagnostic?: (diag: Diagnostic) => void;
}

export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(function TerminalPanel({ onSelectDiagnostic }, ref) {
  const { settings, updateSettings } = useSettings();
  const [height, setHeight] = useState(settings.terminalHeight || 200);
  const [mode, setMode] = useState<Mode>("normal");
  const [activeTab, setActiveTab] = useState<PanelTab>("terminal");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const draggingRef = useRef(false);
  const heightRef = useRef(height);
  heightRef.current = height;
  const xtermRef = useRef<XTermHandle>(null);

  useImperativeHandle(ref, () => ({
    getTerminalBuffer: () => xtermRef.current?.getBufferText() || "",
    clear: () => xtermRef.current?.clear(),
  }));

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await listen<Diagnostic[]>("compiler-diagnostics", (e) => {
        setDiagnostics(e.payload || []);
        if (e.payload && e.payload.length > 0) {
          setActiveTab("problems");
        }
      });
    })();
    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    if (settings.terminalHeight) {
      setHeight(settings.terminalHeight);
    }
  }, [settings.terminalHeight]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const maxHeight = window.innerHeight * 0.7;
      const next = window.innerHeight - e.clientY;
      setHeight(Math.min(Math.max(next, MIN_HEIGHT), maxHeight));
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        updateSettings({ terminalHeight: heightRef.current });
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [updateSettings]);

  const startDrag = (e: React.MouseEvent) => {
    if (mode !== "normal") return;
    draggingRef.current = true;
    e.preventDefault();
  };

  const restore = () => {
    if (mode !== "normal") setMode("normal");
  };

  const panelHeight =
    mode === "minimized"
      ? MINIMIZED_HEIGHT
      : mode === "closed"
      ? CLOSED_HEIGHT
      : mode === "maximized"
      ? Math.round(window.innerHeight * 0.7)
      : height;

  return (
    <div className="terminal-panel" style={{ height: panelHeight }}>
      {mode === "normal" && (
        <div className="terminal-drag-handle" onMouseDown={startDrag} />
      )}

      <div className="terminal-header" onClick={restore}>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <span
            className={`terminal-title ${activeTab === "terminal" ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("terminal");
            }}
            style={{
              cursor: "pointer",
              opacity: activeTab === "terminal" ? 1 : 0.6,
              borderBottom: activeTab === "terminal" ? "2px solid var(--accent)" : "none",
              paddingBottom: "2px",
            }}
          >
            🖥️ TERMINAL
          </span>
          <span
            className={`terminal-title ${activeTab === "problems" ? "active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("problems");
            }}
            style={{
              cursor: "pointer",
              opacity: activeTab === "problems" ? 1 : 0.6,
              borderBottom: activeTab === "problems" ? "2px solid var(--accent)" : "none",
              paddingBottom: "2px",
            }}
          >
            ⚠️ PROBLEMS {diagnostics.length > 0 && `(${diagnostics.length})`}
          </span>
        </div>

        <div className="terminal-header-right">
          <div className="terminal-actions">
            <button
              className="terminal-action-btn"
              title="Clear terminal"
              onClick={(e) => {
                e.stopPropagation();
                if (activeTab === "terminal") xtermRef.current?.clear();
                else setDiagnostics([]);
              }}
            >
              🧹 Clear
            </button>
            <button
              className="terminal-action-btn"
              title="Stop running program (Ctrl+C)"
              onClick={(e) => {
                e.stopPropagation();
                xtermRef.current?.sendInterrupt();
              }}
            >
              ⏹ Stop
            </button>
          </div>

          <div className="terminal-buttons">
            <span
              className="term-btn close"
              title="Close"
              onClick={(e) => {
                e.stopPropagation();
                setMode(mode === "closed" ? "normal" : "closed");
              }}
            />
            <span
              className="term-btn minimize"
              title="Minimize"
              onClick={(e) => {
                e.stopPropagation();
                setMode(mode === "minimized" ? "normal" : "minimized");
              }}
            />
            <span
              className="term-btn maximize"
              title="Maximize"
              onClick={(e) => {
                e.stopPropagation();
                setMode(mode === "maximized" ? "normal" : "maximized");
              }}
            />
          </div>
        </div>
      </div>

      <div
        className="terminal-body-wrapper"
        style={{
          display: mode === "minimized" || mode === "closed" ? "none" : "block",
        }}
      >
        {activeTab === "terminal" ? (
          <XTermView ref={xtermRef} />
        ) : (
          <DiagnosticsPanel
            diagnostics={diagnostics}
            onSelectDiagnostic={(diag) => onSelectDiagnostic?.(diag)}
          />
        )}
      </div>
    </div>
  );
});
