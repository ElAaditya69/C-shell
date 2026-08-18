import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { XTermView, XTermHandle, RUN_FINISHED_EVENT } from "./XTermView";
import { DiagnosticsPanel, Diagnostic } from "./DiagnosticsPanel";
import { useSettings } from "../../context/SettingsContext";
import { listen } from "@tauri-apps/api/event";
import { FileService } from "../../services/FileService";

type Mode = "normal" | "minimized" | "maximized";
type PanelTab = "terminal" | "problems";

const MIN_HEIGHT = 120;
const MINIMIZED_HEIGHT = 80;

export interface TerminalPanelHandle {
  getTerminalBuffer: () => string;
  clear: () => void;
  show: () => void;
  toggle: () => void;
  isVisible: () => boolean;
  sendInterrupt: () => void;
  ensureStarted: () => Promise<void>;
}

interface TerminalPanelProps {
  onSelectDiagnostic?: (diag: Diagnostic) => void;
}

export const TerminalPanel = forwardRef<TerminalPanelHandle, TerminalPanelProps>(function TerminalPanel({ onSelectDiagnostic }, ref) {
  const { settings, updateSettings } = useSettings();
  const [height, setHeight] = useState(settings.terminalHeight || 200);
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("normal");
  const [started, setStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("terminal");
  const [unreadDiag, setUnreadDiag] = useState(false);
  const [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]);
  const draggingRef = useRef(false);
  const heightRef = useRef(height);
  heightRef.current = height;
  const xtermRef = useRef<XTermHandle>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const startedRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const showTerminal = useCallback(() => {
    startedRef.current = true;
    setStarted(true);
    setVisible(true);
    setMode("normal");
  }, []);

  const sendInterrupt = useCallback(() => {
    FileService.sendCommand("\x03").catch((err) =>
      console.error("Failed to send interrupt:", err)
    );
    window.dispatchEvent(new CustomEvent(RUN_FINISHED_EVENT));
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      getTerminalBuffer: () => xtermRef.current?.getBufferText() || "",
      clear: () => xtermRef.current?.clear(),
      show: showTerminal,
      toggle: () => {
        if (!startedRef.current) {
          showTerminal();
          return;
        }
        setVisible((v) => !v);
      },
      isVisible: () => visibleRef.current,
      sendInterrupt,
      ensureStarted: async () => {
        // show() only sets state — XTermView mounts on the next render
        // flush, so wait (bounded) for the handle before starting the pty.
        if (!startedRef.current) showTerminal();
        const deadline = Date.now() + 1500;
        while (!xtermRef.current && Date.now() < deadline) {
          await new Promise((r) => setTimeout(r, 10));
        }
        await xtermRef.current?.ensureStarted();
      },
    }),
    [showTerminal, sendInterrupt]
  ); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      unlisten = await listen<Diagnostic[]>("compiler-diagnostics", (e) => {
        const payload = e.payload || [];
        // Every event is the CURRENT run's full state — an empty payload
        // from a clean build clears the list, never leaves stale entries
        // behind from a previous program.
        setDiagnostics(payload);
        // Only ERRORS steal focus: auto-switch to PROBLEMS + expand the
        // terminal when the build actually failed. Warnings on a program
        // that compiled update the count badge but never yank the editor.
        const hasErrors = payload.some((d) => d.is_error);
        if (hasErrors) {
          setActiveTab("problems");
          showTerminal();
          // An error pop is itself a "seen" diagnostic — don't dot the tab.
          setUnreadDiag(false);
        } else if (payload.length > 0) {
          // New diagnostics arrived while the user stays on the terminal
          // tab: mark the problems tab with a subtle dot (cleared when it
          // is opened, or on the next run's payload).
          if (activeTabRef.current === "terminal") {
            setUnreadDiag(true);
          }
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

  const panelHeight = visible
    ? mode === "minimized"
      ? MINIMIZED_HEIGHT
      : mode === "maximized"
      ? Math.round(window.innerHeight * 0.7)
      : height
    : 0;

  return (
    <div
      className={`terminal-panel${visible ? "" : " collapsed"}`}
      style={{ height: panelHeight, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
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
              setUnreadDiag(false);
            }}
            style={{
              cursor: "pointer",
              opacity: activeTab === "problems" ? 1 : 0.6,
              borderBottom: activeTab === "problems" ? "2px solid var(--accent)" : "none",
              paddingBottom: "2px",
              position: "relative",
            }}
          >
            ⚠️ PROBLEMS {diagnostics.length > 0 && `(${diagnostics.length})`}
            {unreadDiag && activeTab !== "problems" && (
              <span
                title="New diagnostics"
                style={{
                  position: "absolute",
                  top: "-2px",
                  right: "-8px",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  background: "var(--accent)",
                  opacity: 0.8,
                }}
              />
            )}
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
                sendInterrupt();
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

      <div className="terminal-body-wrapper" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: activeTab === 'terminal' ? 'block' : 'none' }}>
          {started ? <XTermView ref={xtermRef} started={started} /> : (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-dim)',
                fontSize: '13px'
              }}
            >
              ▶ Run a program to start the terminal
            </div>
          )}
        </div>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, display: activeTab === 'problems' ? 'block' : 'none' }}>
          <DiagnosticsPanel diagnostics={diagnostics} onSelectDiagnostic={onSelectDiagnostic ?? (() => {})} />
        </div>
      </div>
    </div>
  );
});