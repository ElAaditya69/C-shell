import { useEffect, useRef, useState } from "react";
import { XTermView, XTermHandle } from "./XTermView";

type Mode = "normal" | "minimized" | "maximized" | "closed";

const MIN_HEIGHT = 120;
const MINIMIZED_HEIGHT = 80;
const CLOSED_HEIGHT = 32;
const DEFAULT_HEIGHT = 200;

export function TerminalPanel() {
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [mode, setMode] = useState<Mode>("normal");
  const draggingRef = useRef(false);
  const xtermRef = useRef<XTermHandle>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const maxHeight = window.innerHeight * 0.7;
      const next = window.innerHeight - e.clientY;
      setHeight(Math.min(Math.max(next, MIN_HEIGHT), maxHeight));
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

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
}
