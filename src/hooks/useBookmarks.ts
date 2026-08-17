import { useCallback, useEffect, useRef, useState } from "react";
import { gutter, GutterMarker } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { BlockInfo } from "@codemirror/view";

export interface BookmarkState {
  bookmarksByPath: Record<string, number[]>;
}

class BookmarkMarker extends GutterMarker {
  constructor(readonly line: number) {
    super();
  }
  toDOM(): Node {
    const span = document.createElement("span");
    span.className = "bookmark-marker";
    span.textContent = "◉";
    span.title = `Bookmark (line ${this.line})`;
    return span;
  }
}

/** Gutter extension drawing a marker on every bookmarked line. */
export function bookmarkGutterExtension(bookmarks: number[]): Extension {
  const markers = new Map<number, BookmarkMarker>();
  bookmarks.forEach((line) => markers.set(line, new BookmarkMarker(line)));
  return gutter({
    class: "bookmark-gutter",
    lineMarker: (view, block: BlockInfo) => {
      const lineNum = view.state.doc.lineAt(block.from).number;
      return markers.get(lineNum) ?? null;
    },
    initialSpacer: () => new BookmarkMarker(0),
    // Reuse the line-number gutter's width so bookmarks never push lines.
    lineMarkerChange: (update) => {
      return (update.docChanged as boolean) || update.viewportChanged;
    },
  });
}

const STORE_KEY = "c_shell_bookmarks";

/** Reads the persisted bookmark map, tolerating garbage. */
function loadBookmarks(): Record<string, number[]> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const clean: Record<string, number[]> = {};
        Object.entries(parsed as Record<string, unknown>).forEach(
          ([path, lines]) => {
            if (Array.isArray(lines)) {
              clean[path] = lines
                .filter((l): l is number => typeof l === "number" && l > 0)
                .sort((a, b) => a - b);
            }
          }
        );
        return clean;
      }
    }
  } catch {
    // Corrupt store — start fresh.
  }
  return {};
}

/**
 * Per-path bookmark store, persisted in localStorage (survives app restarts
 * and tab switches — the editor mounts/unmounts freely without losing
 * bookmarks, which is the whole point vs. the old per-mount useState).
 */
export function useBookmarks() {
  const [bookmarksByPath, setBookmarksByPath] = useState<Record<string, number[]>>(loadBookmarks);
  const persistTimer = useRef<number | null>(null);

  // Debounced write (a toggle storm shouldn't hit localStorage per keystroke).
  useEffect(() => {
    if (persistTimer.current !== null) clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      try {
        localStorage.setItem(STORE_KEY, JSON.stringify(bookmarksByPath));
      } catch (e) {
        console.error("Failed to persist bookmarks:", e);
      }
    }, 300);
    return () => {
      if (persistTimer.current !== null) clearTimeout(persistTimer.current);
    };
  }, [bookmarksByPath]);

  const toggleBookmark = useCallback((path: string, line: number) => {
    setBookmarksByPath((prev) => {
      const cur = prev[path] ?? [];
      const next = cur.includes(line) ? cur.filter((l) => l !== line) : [...cur, line];
      return { ...prev, [path]: next.sort((a, b) => a - b) };
    });
  }, []);

  const nextBookmark = useCallback(
    (path: string, currentLine: number): number | null => {
      const list = bookmarksByPath[path] ?? [];
      if (list.length === 0) return null;
      return list.find((l) => l > currentLine) ?? list[0];
    },
    [bookmarksByPath]
  );

  return {
    bookmarks: bookmarksByPath,
    bookmarksFor: (path: string) => bookmarksByPath[path] ?? [],
    toggleBookmark,
    nextBookmark,
  };
}