import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { XTermView, XTermHandle } from "./XTermView";
import { useSettings } from "../../context/SettingsContext";

type Mode = "normal" | "minimized" | "maximized" | "closed";

const MIN_HEIGHT = 120;
const MINIMIZED_HEIGHT = 80;
const CLOSED_HEIGHT = 32;

export interface TerminalPanelHandle {
  getTerminalBuffer: () => string;
  clear: () => void;
}

export const TerminalPanel = forwardRef<TerminalPanelHandle>(function TerminalPanel(_, ref) {
  const { settings, updateSettings } = useSettings();
  const [height, setHeight] = useState(settings.terminalHeight || 200);
  const [mode, setMode] = useState<Mode>("normal");
  const draggingRef = useRef(false);
  const heightRef = useRef(height);
  heightRef.current = height;
  const xtermRef = useRef<XTermHandle>(null);

  useImperativeHandle(ref, () => ({
    getTerminalBuffer: () => xtermRef.current?.getBufferText() || "",
    clear: () => xtermRef.current?.clear(),
  }));

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
        <span className="terminal-title">🖥️ TERMINAL</span>

        <div className="terminal-header-right">
          <div className="terminal-actions">
            <button
              className="terminal-action-btn"
              title="Clear terminal"
              onClick={(e) => {
                e.stopPropagation();
                xtermRef.current?.clear();
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
        <XTermView ref={xtermRef} />
      </div>
    </div>
  );
});
