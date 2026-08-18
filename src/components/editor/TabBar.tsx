import { useRef, useState } from "react";

export interface OpenTab {
  id: string;
  path: string | null;
  name: string;
  code: string;
  savedCode: string;
}

interface TabBarProps {
  tabs: OpenTab[];
  activeTabId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  /** Commit a drag reorder: move tab at fromIndex to toIndex. */
  onReorder: (fromIndex: number, toIndex: number) => void;
}

/** How far the pointer must travel (px) before a press becomes a drag.
    Below this, the press behaves as a normal click-to-switch. */
const DRAG_THRESHOLD = 4;
/** Minimal horizontal travel between reorder steps while dragging. */
const REORDER_STEP = 16;

export function TabBar({ tabs, activeTabId, onSelect, onClose, onReorder }: TabBarProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const pointerIdRef = useRef<number | null>(null);
  const startXRef = useRef(0);
  const lastXRef = useRef(0);
  const lastIndexRef = useRef(0);
  const didDragRef = useRef(false);
  const ghostRef = useRef<HTMLDivElement | null>(null);

  const handlePointerDown = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    didDragRef.current = false;
    pointerIdRef.current = e.pointerId;
    startXRef.current = e.clientX;
    lastXRef.current = e.clientX;
    lastIndexRef.current = index;

    const source = e.currentTarget as HTMLElement;
    const rect = source.getBoundingClientRect();
    const ghost = source.cloneNode(true) as HTMLDivElement;
    ghost.classList.add("tab-ghost");
    ghost.classList.remove("active");
    ghost.style.width = `${source.offsetWidth}px`;
    // Anchor the ghost exactly over the source tab (viewport coords), so it
    // never appears at (0,0) — i.e. over the toolbar — while dragging. The
    // drag transform then moves it horizontally from that anchored spot.
    ghost.style.top = `${rect.top}px`;
    ghost.style.left = `${rect.left}px`;
    document.body.appendChild(ghost);
    ghostRef.current = ghost;

    source.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent, id: string) => {
    if (pointerIdRef.current !== e.pointerId || !draggingId && Math.abs(e.clientX - startXRef.current) < DRAG_THRESHOLD) {
      return;
    }
    if (!draggingId) {
      setDraggingId(id);
      didDragRef.current = true;
    }
    if (!ghostRef.current) return;

    ghostRef.current.style.transform = `translate(${e.clientX - startXRef.current}px, 0)`;

    const dx = e.clientX - lastXRef.current;
    if (Math.abs(dx) < REORDER_STEP) return;

    const fromIndex = tabs.findIndex((t) => t.id === id);
    if (fromIndex === -1) return;
    let targetIndex = lastIndexRef.current;
    if (dx > 0) {
      targetIndex = Math.min(tabs.length - 1, lastIndexRef.current + Math.round(dx / REORDER_STEP));
    } else {
      targetIndex = Math.max(0, lastIndexRef.current + Math.round(dx / REORDER_STEP));
    }
    if (targetIndex === fromIndex) return;
    onReorder(fromIndex, targetIndex);
    lastIndexRef.current = targetIndex;
    lastXRef.current = e.clientX;
  };

  const endDrag = () => {
    pointerIdRef.current = null;
    ghostRef.current?.remove();
    ghostRef.current = null;
    if (draggingId) setDraggingId(null);
  };

  const handlePointerUp = () => {
    endDrag();
  };

  const handlePointerCancel = () => {
    endDrag();
  };

  const handleLostPointerCapture = () => {
    // Pointer capture was released unexpectedly (drag left the window, the
    // OS intercepted it, the element was removed…). Without this the ghost
    // would be stuck on screen and the tab stuck in draggable state.
    if (pointerIdRef.current !== null) {
      endDrag();
    }
  };

  return (
    <div className="tab-bar">
      {tabs.length === 0 && (
        <div className="tab active welcome-tab">
          <span>
            <span className="welcome-tab-icon">●</span> Welcome
          </span>
        </div>
      )}
      {tabs.map((tab, index) => {
        const isDirty = tab.code !== tab.savedCode;
        const isDragging = draggingId === tab.id;
        return (
          <div
            key={tab.id}
            className={`tab ${tab.id === activeTabId ? "active" : ""} ${isDragging ? "dragging" : ""}`}
            draggable={true}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/c-shell-tab", tab.id);
              e.dataTransfer.setData("text/plain", tab.id);
            }}
            onClick={() => {
              // A real drag fires click on release — don't treat it as a switch.
              if (isDragging || didDragRef.current) return;
              onSelect(tab.id);
            }}
            onPointerDown={(e) => handlePointerDown(e, index)}
            onPointerMove={(e) => handlePointerMove(e, tab.id)}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
            onLostPointerCapture={handleLostPointerCapture}
          >
            <span>{tab.name}</span>
            {isDirty && <span className="unsaved">●</span>}
            <span
              className="tab-close"
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}