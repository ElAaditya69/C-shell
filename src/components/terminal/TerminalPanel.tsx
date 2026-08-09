import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { XTermView, XTermHandle } from "./XTermView";
import { DiagnosticsPanel, Diagnostic } from "./DiagnosticsPanel";
import { useSettings } from "../../context/SettingsContext";
import { listen } from "@tauri-apps/api/event";

type Mode = "normal" | "minimized" | "maximized";
type PanelTab = "terminal" | "problems";

const MIN_HEIGHT = 120;
const MINIMIZED_HEIGHT = 80;

export interface TerminalPanelHandle {
  getTerminalBuffer: () => string;
  clear: () => void;
  /** Make the terminal visible (mounted) so it can be used / output shown. */
  show: () => void;
  /** Toggle between collapsed (32px) and expanded. */
  toggle: () => void;
  isVisible: () => boolean;
}

interface TerminalPanelProps {
  onSelectDiagnostic?: (diag: Diagnostic) => void;
}

export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(function TerminalPanel({ onSelectDiagnostic }, ref) {
  const { settings, updateSettings } = useSettings();
  const [height, setHeight] = useState(settings.terminalHeight || 200);
  // Starts collapsed so no shell is spawned until the user actually runs
  // something or opens the terminal (VS Code-like lazy startup).
  // `visible` controls whether the whole panel is shown at all (true hide,
  // not just a collapsed bar). `mode` controls the expanded/collapsed state.
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("normal");
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("terminal");
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const draggingRef = useRef(false);
  const heightRef = useRef(height);
  heightRef.current = height;
  const xtermRef = useRef<XTermHandle>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const startedRef = useRef(false);

  const showTerminal = useCallback(() => {
    startedRef.current = true;
    setStarted(true);
    setVisible(true);
    setMode("normal");
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getTerminalBuffer: () => xtermRef.current?.getBufferText() || "",
      clear: () => xtermRef.current?.clear(),
      show: showTerminal,
      toggle: () => {
        // Opening the terminal (even for the first time) starts the shell
        // immediately so it's usable for manual commands without running code.
        if (!startedRef.current) {
          showTerminal();
          return;
        }
        setVisible((v) => !v);
      },
      isVisible: () => visibleRef.current,
    }),
    [showTerminal]
  );

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await listen<Diagnostic[]>("compiler-diagnostics", (e) => {
        setDiagnostics(e.payload || []);
        if (e.payload && e.payload.length > 0) {
          setActiveTab("problems");
          // Surface diagnostics even if the terminal has never been opened.
          showTerminal();
        }
      });
    })();
    return () => {
      unlisten?.();
    };
  }, [showTerminal]);

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
      : mode === "maximized"
      ? Math.round(window.innerHeight * 0.7)
      : height;

  // Hidden until the user toggles the terminal open (toolbar button, Ctrl+`,
  // or Run). Once opened the shell starts immediately so it's usable for
  // manual commands — not just for running the current file.
  if (!visible) return null;

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
              title="Close terminal (Ctrl+` to reopen)"
              onClick={(e) => {
                e.stopPropagation();
                setVisible(false);
              }}
            />
            <span
              className="term-btn minimize"
              title="Minimize (collapse to a thin bar)"
              onClick={(e) => {
                e.stopPropagation();
                setMode(mode === "minimized" ? "normal" : "minimized");
              }}
            />
            <span
              className="term-btn maximize"
              title="Maximize (expand to fill the window)"
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
          display: mode === "minimized" ? "none" : "block",
        }}
      >
        {activeTab === "terminal" ? (
          // The PTY shell only spawns once the terminal is first shown.
          started ? (
            <XTermView ref={xtermRef} />
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-dim)",
                fontSize: "13px",
                minHeight: MIN_HEIGHT,
              }}
            >
              ▶ Run a program to start the terminal
            </div>
          )
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
