import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';
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
import { keymap, rectangularSelection, crosshairCursor, drawSelection } from '@codemirror/view';
import type { EditorView as EditorViewType } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import type { Extension } from '@codemirror/state';
import { useSettings } from '../../context/SettingsContext';

interface EditorProps {
  code: string;
  fileName?: string;
  onChange: (value: string) => void;
  onCursorChange?: (pos: { line: number; col: number }) => void;
}

export interface EditorHandle {
  toggleComment: () => void;
  toggleBlockComment: () => void;
  jumpToPosition: (line: number, col: number) => void;
  openSymbolPicker: () => void;
  toggleBookmark: () => void;
  nextBookmark: () => void;
  insertText: (text: string) => void;
  getCursorPosition: () => { line: number; col: number };
}

interface SymbolItem {
  name: string;
  kind: 'function' | 'struct' | 'macro';
  line: number;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { code, fileName = 'main.c', onChange, onCursorChange },
  ref
) {
  const viewRef = useRef<EditorViewType | null>(null);
  const { settings } = useSettings();
  const [symbolModalOpen, setSymbolModalOpen] = useState(false);
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  const [currentSymbol, setCurrentSymbol] = useState<string | null>(null);
  // Keep the latest callback in a ref so the cursor-tracking extension is
  // created once and never re-triggers @uiw's reconfigure effect.
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;
  const lastCursorHeadRef = useRef(-1);

  // Parse symbols (functions and structs) from C code
  useEffect(() => {
    const parsed: SymbolItem[] = [];
    const safeCode = typeof code === 'string' ? code : '';
    const lines = safeCode.split('\n');
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
    insertText: (text: string) => {
      const view = viewRef.current;
      if (!view) return;
      const pos = view.state.selection.main.head;
      view.dispatch({
        changes: { from: pos, insert: text },
        selection: { anchor: pos + text.length },
      });
      view.focus();
    },
    getCursorPosition: () => {
      const view = viewRef.current;
      if (!view) return { line: 1, col: 1 };
      const pos = view.state.selection.main.head;
      const line = view.state.doc.lineAt(pos);
      return { line: line.number, col: pos - line.from + 1 };
    },
  }));

  const indentExtension = settings.useTabsIndent
    ? indentUnit.of('\t')
    : indentUnit.of(' '.repeat(settings.tabSize || 4));

  /* Theme the editor from the app's CSS variables (instead of the hardcoded
     oneDark) so syntax colors follow theme changes, including custom themes.
     Built from CSS var() references, so any value change restyles live. */
  const editorTheme = useMemo<Extension>(
    () =>
      EditorView.theme(
        {
          '&': {
            color: 'var(--text-primary)',
            backgroundColor: 'var(--bg-primary)',
          },
          '.cm-content': { caretColor: 'var(--text-primary)' },
          '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--accent)' },
          '.cm-cursor': { borderLeftColor: 'var(--accent)' },
          '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
            backgroundColor: 'color-mix(in srgb, var(--accent) 30%, transparent)',
          },
          '.cm-activeLine': { backgroundColor: 'var(--bg-hover)' },
          '.cm-activeLineGutter': {
            backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
          },
          '.cm-gutters': {
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--text-dim)',
            borderRight: '1px solid var(--border)',
          },
          '.cm-matchingBracket': {
            backgroundColor: 'color-mix(in srgb, var(--accent) 25%, transparent)',
            color: 'var(--text-primary)',
          },
          '.cm-searchMatch': { backgroundColor: 'var(--bg-hover)' },
        },
        { dark: true }
      ),
    []
  );

  /* Amber-tinted retro syntax palette driven by the same CSS variables. */
  const editorHighlight = useMemo(
    () =>
      syntaxHighlighting(
        HighlightStyle.define([
          { tag: t.comment, color: 'var(--text-dim)', fontStyle: 'italic' },
          { tag: [t.keyword, t.modifier], color: 'var(--text-bright)' },
          { tag: [t.name, t.deleted, t.character, t.propertyName, t.macroName], color: 'var(--text-secondary)' },
          { tag: [t.function(t.variableName), t.labelName], color: 'var(--blue)' },
          { tag: [t.color, t.constant(t.name), t.standard(t.name)], color: 'var(--text-bright)' },
          { tag: [t.definition(t.name), t.separator], color: 'var(--text-primary)' },
          { tag: [t.typeName, t.className, t.number, t.changed, t.annotation, t.modifier, t.self, t.namespace], color: 'var(--blue)' },
          { tag: [t.operator, t.operatorKeyword, t.url, t.escape, t.regexp, t.link, t.special(t.string)], color: 'var(--accent)' },
          { tag: [t.meta, t.comment], color: 'var(--text-dim)' },
          { tag: [t.strong], fontWeight: 'bold' },
          { tag: [t.emphasis], fontStyle: 'italic' },
          { tag: [t.strikethrough], textDecoration: 'line-through' },
          { tag: [t.link, t.atom, t.bool, t.url], color: 'var(--blue)' },
          { tag: [t.invalid], color: 'var(--error)' },
          { tag: [t.string, t.inserted], color: 'var(--success)' },
        ])
      ),
    []
  );

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

      <div
        className="editor-code-area"
        style={{ flex: 1, minHeight: 0, height: '100%', position: 'relative' }}
      >
        <CodeMirror
          value={code}
          height="100%"
          theme={editorTheme}
          extensions={[
            editorHighlight,
            cpp(),
            search({ top: true }),
            EditorView.updateListener.of(() => {
              const view = viewRef.current;
              if (!view) return;
              // Only react when the cursor actually moved. Reconfigure updates
              // (e.g. font/theme changes) still fire this listener; skipping
              // unchanged positions keeps reconfigures from re-rendering App.
              const pos = view.state.selection.main.head;
              if (lastCursorHeadRef.current === pos) return;
              lastCursorHeadRef.current = pos;
              const line = view.state.doc.lineAt(pos);
              onCursorChangeRef.current?.({ line: line.number, col: pos - line.from + 1 });
            }),
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
            ]),
            indentExtension,
            ...(settings.wordWrap ? [EditorView.lineWrapping] : []),
          ]}
          onChange={onChange}
          onCreateEditor={(view) => {
            viewRef.current = view;
            const pos = view.state.selection.main.head;
            lastCursorHeadRef.current = pos;
            const line = view.state.doc.lineAt(pos);
            onCursorChangeRef.current?.({ line: line.number, col: pos - line.from + 1 });
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
