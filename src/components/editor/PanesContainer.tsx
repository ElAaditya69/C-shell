import { Fragment, forwardRef, useImperativeHandle, useRef, useState, useEffect } from "react";
import { Editor, EditorHandle } from "./Editor";

export interface PaneState {
  id: number;
  tabId: string | null;
}

/** Map of paneId → its Editor handle (jump/outline/bookmark refs). */
export interface PaneRefs {
  [paneId: number]: EditorHandle;
}

export interface OpenTabLike {
  id: string;
  name: string;
  code: string;
  savedCode: string;
  path: string | null;
}

export interface PanesContainerProps {
  panes: PaneState[];
  tabsById: Map<string, OpenTabLike>;
  activePaneId: number;
  onFocusPane: (paneId: number) => void;
  onClosePane: (paneId: number) => void;
  /** File picker for an empty pane (or 📂 button on a pane with a file). */
  onOpenFileInPane: (paneId: number) => void;
  /** Drop of a tab (or click of 📂 / "+ Open File") into this pane. */
  onPaneDrop: (paneId: number, tabId?: string) => void;
  onChangeCode: (tabId: string, value: string) => void;
  onCursorChange?: (pos: { line: number; col: number }) => void;
}

/**
 * Multi-pane editor: N independent panes, each showing ITS OWN tab (different
 * files side by side, like VS Code / Vivaldi — not the old same-file mirror).
 * Pane state (which tabId) lives in App; each pane keeps its own Editor ref.
 * A pane with no tab shows an empty state with "+ Open File". The tab bar
 * stays shared above; dropping a tab onto a pane loads that file there.
 */
export const PanesContainer = forwardRef<PaneRefs, PanesContainerProps>(
  function PanesContainer(
    {
      panes,
      tabsById,
      activePaneId,
      onFocusPane,
      onClosePane,
      onOpenFileInPane,
      onPaneDrop,
      onChangeCode,
      onCursorChange,
    },
    ref
  ) {
    const refs = useRef<PaneRefs>({});
    useImperativeHandle(ref, () => refs.current);

    const containerRef = useRef<HTMLDivElement>(null);
    const [splitRatio, setSplitRatio] = useState(0.5);
    const isDraggingDivider = useRef(false);

    // Mouse drag resizing for the split divider
    useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
        if (!isDraggingDivider.current || !containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width <= 0) return;
        const newRatio = (e.clientX - rect.left) / rect.width;
        const clamped = Math.max(0.15, Math.min(0.85, newRatio));
        setSplitRatio(clamped);
      };

      const handleMouseUp = () => {
        if (isDraggingDivider.current) {
          isDraggingDivider.current = false;
          document.body.style.cursor = "";
          document.body.style.userSelect = "";
        }
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, []);

    const handleDividerMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      isDraggingDivider.current = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    };

    return (
      <div className="split-editor-container" ref={containerRef}>
        {panes.map((pane, index) => {
          const tab = pane.tabId ? tabsById.get(pane.tabId) : undefined;
          const focused = pane.id === activePaneId;
          const paneFlex = panes.length === 2 ? (index === 0 ? splitRatio : 1 - splitRatio) : 1;

          return (
            <Fragment key={pane.id}>
              {index > 0 && (
                <div
                  className="split-divider"
                  onMouseDown={handleDividerMouseDown}
                  title="Drag to resize panes"
                />
              )}
              <div
                className={`split-pane${focused ? " pane-focused" : ""}`}
                style={{ flex: paneFlex }}
                onClick={() => onFocusPane(pane.id)}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const tabId =
                    e.dataTransfer.getData("application/c-shell-tab") ||
                    e.dataTransfer.getData("text/plain");
                  if (tabId) {
                    onPaneDrop(pane.id, tabId);
                  }
                }}
              >
                {tab ? (
                  <>
                    <div className="pane-header">
                      <span className="pane-header-name">
                        📄 {tab.name}
                        {tab.code !== tab.savedCode ? " ●" : ""}
                      </span>
                      <div className="pane-header-actions">
                        <span
                          className="pane-action"
                          title="Open a file in this pane"
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenFileInPane(pane.id);
                          }}
                        >
                          📂
                        </span>
                        <span
                          className="pane-action pane-close"
                          title="Close pane"
                          onClick={(e) => {
                            e.stopPropagation();
                            onClosePane(pane.id);
                          }}
                        >
                          ×
                        </span>
                      </div>
                    </div>
                    <Editor
                      ref={(h) => {
                        if (h) refs.current[pane.id] = h;
                        else delete refs.current[pane.id];
                      }}
                      code={tab.code}
                      fileName={tab.name}
                      onChange={(v) => onChangeCode(tab.id, v)}
                      onCursorChange={focused ? onCursorChange : undefined}
                    />
                  </>
                ) : (
                  <div className="pane-empty">
                    <div className="split-empty-state">No file open</div>
                    <button
                      className="pane-empty-open"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenFileInPane(pane.id);
                      }}
                    >
                      + Open File
                    </button>
                  </div>
                )}
              </div>
            </Fragment>
          );
        })}
      </div>
    );
  }
);
