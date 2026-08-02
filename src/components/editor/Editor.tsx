import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { cpp } from '@codemirror/lang-cpp';
import {
  toggleLineComment,
  toggleBlockComment,
  copyLineDown,
  moveLineUp,
  moveLineDown,
} from '@codemirror/commands';
import {
  search,
  searchKeymap,
  gotoLine,
  openSearchPanel,
} from '@codemirror/search';
import { keymap, EditorView, rectangularSelection, crosshairCursor, drawSelection } from '@codemirror/view';
import type { EditorView as EditorViewType } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import { useSettings } from '../../context/SettingsContext';

interface EditorProps {
  code: string;
  fileName?: string;
  onChange: (value: string) => void;
}

export interface EditorHandle {
  toggleComment: () => void;
  toggleBlockComment: () => void;
  jumpToPosition: (line: number, col: number) => void;
  openSymbolPicker: () => void;
  toggleBookmark: () => void;
  nextBookmark: () => void;
}

interface SymbolItem {
  name: string;
  kind: 'function' | 'struct' | 'macro';
  line: number;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { code, fileName = 'main.c', onChange },
  ref
) {
  const viewRef = useRef<EditorViewType | null>(null);
  const { settings } = useSettings();
  const [symbolModalOpen, setSymbolModalOpen] = useState(false);
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);

  // Parse symbols (functions and structs) from C code
  useEffect(() => {
    const parsed: SymbolItem[] = [];
    const lines = code.split('\n');
    lines.forEach((line, idx) => {
      // Functions
      const fnMatch = line.match(/\b(?:int|void|float|double|char|long|short|bool|auto)\s+([a-zA-Z_]\w*)\s*\(/);
      if (fnMatch && !line.includes(';')) {
        parsed.push({ name: `${fnMatch[1]}()`, kind: 'function', line: idx + 1 });
      }
      // Structs / Typedefs
      const structMatch = line.match(/\b(?:struct|typedef struct)\s+([a-zA-Z_]\w*)/);
      if (structMatch) {
        parsed.push({ name: structMatch[1], kind: 'struct', line: idx + 1 });
      }
      // Macros
      const macroMatch = line.match(/#define\s+([a-zA-Z_]\w*)/);
      if (macroMatch) {
        parsed.push({ name: macroMatch[1], kind: 'macro', line: idx + 1 });
      }
    });
    setSymbols(parsed);
    if (parsed.length > 0) {
      setCurrentSymbol(parsed[0].name);
    } else {
      setCurrentSymbol(null);
    }
  }, [code]);

  const jumpToLineNum = (lineNum: number) => {
    const view = viewRef.current;
    if (!view) return;
    try {
      const lineObj = view.state.doc.line(Math.min(lineNum, view.state.doc.lines));
      view.dispatch({
        selection: { anchor: lineObj.from, head: lineObj.from },
        scrollIntoView: true,
      });
      view.focus();
    } catch (e) {
      console.error(e);
    }
  };

  const [bookmarks, setBookmarks] = useState<number[]>([]);

  const toggleBookmark = () => {
    const view = viewRef.current;
    if (!view) return;
    const currentLine = view.state.doc.lineAt(view.state.selection.main.head).number;
    setBookmarks((prev) =>
      prev.includes(currentLine)
        ? prev.filter((l) => l !== currentLine)
        : [...prev, currentLine].sort((a, b) => a - b)
    );
  };

  const nextBookmark = () => {
    if (bookmarks.length === 0) return;
    const view = viewRef.current;
    if (!view) return;
    const currentLine = view.state.doc.lineAt(view.state.selection.main.head).number;
    const nextLine = bookmarks.find((l) => l > currentLine) || bookmarks[0];
    jumpToLineNum(nextLine);
  };

  useImperativeHandle(ref, () => ({
    toggleComment: () => {
      const view = viewRef.current;
      if (!view) return;
      toggleLineComment({ state: view.state, dispatch: view.dispatch });
      view.focus();
    },
    toggleBlockComment: () => {
      const view = viewRef.current;
      if (!view) return;
      toggleBlockComment({ state: view.state, dispatch: view.dispatch });
      view.focus();
    },
    jumpToPosition: (line: number, col: number) => {
      const view = viewRef.current;
      if (!view) return;
      try {
        const lineObj = view.state.doc.line(Math.min(line, view.state.doc.lines));
        const pos = Math.min(lineObj.from + Math.max(0, col - 1), lineObj.to);
        view.dispatch({
          selection: { anchor: pos, head: pos },
          scrollIntoView: true,
        });
        view.focus();
      } catch (err) {
        console.error("Failed to jump to position:", err);
      }
    },
    openSymbolPicker: () => {
      setSymbolModalOpen(true);
    },
    toggleBookmark,
    nextBookmark,
  }));

  const indentExtension = settings.useTabsIndent
    ? indentUnit.of('\t')
    : indentUnit.of(' '.repeat(settings.tabSize || 4));

  return (
    <div
      className="editor-container"
      style={{
        fontSize: `${settings.editorFontSize}px`,
        fontFamily: settings.fontFamily || 'inherit',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
      }}
    >
      {/* Breadcrumbs Bar */}
      <div
        className="editor-breadcrumbs"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 12px',
          background: 'var(--bg-panel)',
          borderBottom: '1px solid var(--border)',
          fontSize: '12px',
          color: 'var(--text-dim)',
        }}
      >
        <span>📄 {fileName}</span>
        {currentSymbol && (
          <>
            <span>›</span>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {currentSymbol}
            </span>
          </>
        )}
        <button
          onClick={() => setSymbolModalOpen(true)}
          style={{
            marginLeft: 'auto',
            background: 'none',
            border: 'none',
            color: 'var(--text-dim)',
            cursor: 'pointer',
            fontSize: '11px',
          }}
          title="Go to Symbol (Ctrl+Shift+O)"
        >
          🔍 Symbols ({symbols.length})
        </button>
      </div>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <CodeMirror
          value={code}
          height="100%"
          theme={oneDark}
          extensions={[
            cpp(),
            search({ top: true }),
            drawSelection(),
            rectangularSelection(),
            crosshairCursor(),
            keymap.of([
              ...searchKeymap,
              { key: 'Mod-h', run: openSearchPanel },
              { key: 'Mod-g', run: gotoLine },
              { key: 'Alt-ArrowDown', run: moveLineDown },
              { key: 'Alt-ArrowUp', run: moveLineUp },
              { key: 'Shift-Alt-ArrowDown', run: copyLineDown },
              { key: 'Mod-Shift-o', run: () => { setSymbolModalOpen(true); return true; } },
            ]),
            indentExtension,
            ...(settings.wordWrap ? [EditorView.lineWrapping] : []),
          ]}
          onChange={onChange}
          onCreateEditor={(view) => {
            viewRef.current = view;
          }}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightActiveLine: true,
            foldGutter: false,
            searchKeymap: false,
          }}
        />
      </div>

      {/* Go To Symbol Overlay Modal */}
      {symbolModalOpen && (
        <div
          className="modal-backdrop"
          onClick={() => setSymbolModalOpen(false)}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '420px', padding: '16px' }}
          >
            <div className="modal-header">
              <h4>🔍 Go to Symbol in {fileName}</h4>
              <button
                className="close-btn"
                onClick={() => setSymbolModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                maxHeight: '300px',
                overflowY: 'auto',
                marginTop: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              {symbols.length === 0 ? (
                <div style={{ color: 'var(--text-dim)', fontSize: '13px', padding: '8px' }}>
                  No functions or structs found in file.
                </div>
              ) : (
                symbols.map((sym, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      jumpToLineNum(sym.line);
                      setCurrentSymbol(sym.name);
                      setSymbolModalOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      background: 'var(--bg-hover)',
                      fontSize: '13px',
                    }}
                  >
                    <span>
                      {sym.kind === 'function' ? '⚡ ' : sym.kind === 'struct' ? '📦 ' : '🏷️ '}
                      {sym.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                      Ln {sym.line}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
