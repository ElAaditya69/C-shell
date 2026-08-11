import { useState } from "react";
import { useSettings } from "../../context/SettingsContext";

export type ActivityState =
  | "idle"
  | "compiling"
  | "running"
  | "building"
  | "formatting";

const C_STANDARDS = ["C89", "C99", "C11", "C17", "GNU99"];

interface ToolbarProps {
  onRun: () => void;
  onBuild: () => void;
  onFormat: () => void;
  onScreenshot: () => void;
  onReport: () => void;
  onSave: () => void;
  onNew: () => void;
  onOpenFolder: () => void;
  onOpenFile: () => void;
  onOpenSettings: () => void;
  onToggleTerminal: () => void;
  onToggleSplitView?: () => void;
  isSplitView?: boolean;
  activityState: ActivityState;
  onStandardChange?: (standard: string) => void;
}

export function Toolbar({
  onRun,
  onBuild,
  onFormat,
  onScreenshot,
  onReport,
  onSave,
  onNew,
  onOpenFolder,
  onOpenFile,
  onOpenSettings,
  onToggleTerminal,
  onToggleSplitView,
  isSplitView,
  activityState,
  onStandardChange,
}: ToolbarProps) {
  const [toolsOpen, setToolsOpen] = useState(false);
  const [standard, setStandard] = useState("C99");
  const { settings } = useSettings();
  const busy = activityState !== "idle";

  const showLabels = settings.showToolbarLabels;

  const runLabel =
    activityState === "compiling"
      ? showLabels ? "⏳ Compiling..." : "⏳"
      : activityState === "running"
      ? showLabels ? "🟡 Running..." : "🟡"
      : showLabels ? "▶ Run" : "▶";

  const buildLabel =
    activityState === "building"
      ? showLabels ? "⏳ Building..." : "⏳"
      : showLabels ? "✓ Check Code" : "✓";

  const toolsAction = (fn: () => void) => () => {
    fn();
    setToolsOpen(false);
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <button
          className={`run-btn ${busy ? "running" : ""}`}
          onClick={onRun}
          disabled={busy}
          title="Run Code (Ctrl/Cmd+Enter)"
        >
          <span>{runLabel}</span>
        </button>

        <div className="toolbar-divider" />

        <button
          className="tool-btn"
          onClick={onBuild}
          disabled={busy}
          title="Compile and check for errors without running the program"
        >
          {buildLabel}
        </button>

        <div className="toolbar-group tools-dropdown-wrapper">
          <button
            className="tool-btn"
            onClick={() => setToolsOpen((v) => !v)}
            title="Format, Snapshot, Lab Report"
          >
            {activityState === "formatting"
              ? showLabels ? "⏳ Formatting..." : "⏳"
              : showLabels ? "🛠️ Tools ▾" : "🛠️ ▾"}
          </button>

          {toolsOpen && (
            <>
              <div
                className="context-menu-backdrop"
                onClick={() => setToolsOpen(false)}
              />
              <div className="context-menu tools-menu">
                <button onClick={toolsAction(onFormat)} disabled={busy}>
                  ✨ Format code (clean indentation) — Ctrl+Shift+F
                </button>
                <button onClick={toolsAction(onScreenshot)}>
                  📸 Snapshot (Ctrl+Alt+S)
                </button>
                <button onClick={toolsAction(onReport)}>
                  📄 Lab Report (Ctrl+Alt+R)
                </button>
              </div>
            </>
          )}
        </div>

        <div className="toolbar-divider" />

        <button className="tool-btn" onClick={onSave} title="Save File (Ctrl/Cmd+S)">
          💾 {showLabels && "Save"}
        </button>
        <button className="tool-btn" onClick={onNew} title="New File (Ctrl/Cmd+N)">
          + {showLabels && "New"}
        </button>
        <button className="tool-btn" onClick={onOpenFolder} title="Open Folder (Ctrl/Cmd+O)">
          📁 {showLabels && "Folder"}
        </button>
        <button className="tool-btn" onClick={onOpenFile} title="Open File">
          📄 {showLabels && "File"}
        </button>

        <div className="toolbar-divider" />

        <button
          className="tool-btn"
          onClick={onToggleTerminal}
          title="Toggle Terminal (Ctrl+`)"
        >
          🖥️ {showLabels && "Terminal"}
        </button>
        <button
          className={`tool-btn ${isSplitView ? "split-active" : ""}`}
          onClick={onToggleSplitView}
          title={isSplitView ? "Exit Split Editor" : "Split Editor"}
          style={isSplitView ? { boxShadow: "inset 0 0 0 1px var(--accent)", color: "var(--accent)" } : undefined}
        >
          ▭ {showLabels && (isSplitView ? "Split On" : "Split")}
        </button>
      </div>

      <div className="toolbar-right">
        <label className="standard-select" title="C Standard — the -std flag used when compiling (e.g. -std=c99)">
          <span className="standard-select-label" aria-hidden="true">
            C Standard
          </span>
          <select
            value={standard}
            onChange={(e) => {
              const s = e.target.value;
              setStandard(s);
              onStandardChange?.(s);
            }}
            title="C Standard (controls the -std flag when compiling)"
            aria-label="C Standard"
          >
            {C_STANDARDS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <span aria-hidden="true">▾</span>
        </label>

        <button
          className="icon-action-btn settings-icon"
          onClick={onOpenSettings}
          title="Preferences (Ctrl/Cmd+,)"
        >
          ⚙
        </button>
      </div>
    </div>
  );
}