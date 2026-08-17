import { forwardRef, useImperativeHandle, useRef, useState, useEffect, useMemo } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import { EditorView } from '@codemirror/view';
import type { SyntaxNode } from '@lezer/common';
import { cpp } from '@codemirror/lang-cpp';
import {
  toggleLineComment,
  toggleBlockComment,
  copyLineDown,
  moveLineUp,
  moveLineDown,
  insertTab,
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
import { EditorState } from '@codemirror/state';
import type { Extension } from '@codemirror/state';
import { indentationMarkers } from '@replit/codemirror-indentation-markers';
import { useSettings } from '../../context/SettingsContext';
import { useBookmarks, bookmarkGutterExtension } from '../../hooks/useBookmarks';

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
  kind: 'function' | 'struct' | 'macro' | 'enum' | 'typedef';
  line: number;
}

/** Small icons for each symbol kind (used in the modal + outline dropdown). */
function kindIcon(kind: SymbolItem['kind']): string {
  switch (kind) {
    case 'function': return '⚡';
    case 'struct': return '📦';
    case 'enum': return '🎨';
    case 'typedef': return '🏷️';
    case 'macro': return '#';
  }
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { code, fileName = 'main.c', onChange, onCursorChange },
  ref
) {
  const viewRef = useRef<EditorViewType | null>(null);
  const { settings } = useSettings();
  const [symbolModalOpen, setSymbolModalOpen] = useState(false);
  const [symbols, setSymbols] = useState<SymbolItem[]>([]);
  // Mirror for the update listener (created once): the listener reads the
  // CURRENT symbol list without re-creating the extension on every parse.
  const symbolsRef = useRef<SymbolItem[]>([]);
  // Which symbol the cursor is currently inside — drives the outline's
  // active item. Derived from the tree in the update listener below.
  const [activeSymbolName, setActiveSymbolName] = useState<string | null>(null);
  // Debounce handle for the tree re-parse (300 ms after last transaction).
  const symbolParseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep the latest callback in a ref so the cursor-tracking extension is
  // created once and never re-triggers @uiw's reconfigure effect.
  const onCursorChangeRef = useRef(onCursorChange);
  onCursorChangeRef.current = onCursorChange;
  const lastCursorHeadRef = useRef(-1);

  // Parse symbols from the lezer syntax tree (via the editor view) so
  // definitions, prototypes, pointers, static, multi-line signatures and
  // anonymous-struct typedefs all resolve to the same nodes — a single-line
  // regex cannot see any of those. Walk pre-order for stable ordering.
  const parseSymbols = (view: EditorViewType | null): SymbolItem[] => {
    if (!view) return [];
    const body = syntaxTree(view.state).topNode;
    const out: SymbolItem[] = [];

    const text = (node: unknown) =>
      view.state.doc.sliceString((node as { from: number }).from, (node as { to: number }).to);

    const lineOf = (node: unknown) =>
      view.state.doc.lineAt((node as { from: number }).from).number;

    // Walks one cursor; `parentName` is the enclosing definition name so
    // typedefs wrapped in struct/enum tags resolve to the typedef kind.
    const walk = (node: unknown, parentName: string | null) => {
      const t = (node as { type: { name: string } }).type.name;
      // lezer nodes expose firstChild/nextSibling as getter properties,
      // not methods — calling them throws `TypeError: node.firstChild is
      // not a function`.
      const children = () => {
        const kids: unknown[] = [];
        let c = (node as { firstChild: unknown | null }).firstChild;
        while (c) {
          kids.push(c);
          c = (c as { nextSibling: unknown | null }).nextSibling;
        }
        return kids;
      };
      if (!t.includes('Preproc')) {
        // Recurse into children first (deepest declaration wins, so the
        // typedef's inner struct doesn't double-report).
        const kids = children();
        for (const ch of kids) walk(ch, parentName);
      } else if (t === 'PreprocDirective') {
        // #define — first child Identifier is the macro name.
        let name = '';
        for (const ch of children()) {
          if ((ch as { type: { name: string } }).type.name === 'Identifier') {
            name = text(ch).trim();
            break;
          }
          // The Identifier can sit one level deeper (e.g. in a ParenExpr
          // for function-like macros) — walk that subnode's children too.
          let c2 = (ch as { firstChild: unknown | null }).firstChild;
          while (c2) {
            if ((c2 as { type: { name: string } }).type.name === 'Identifier') {
              name = text(c2).trim();
              break;
            }
            c2 = (c2 as { nextSibling: unknown | null }).nextSibling;
          }
          if (name) break;
        }
        if (name) out.push({ name: `#${name}`, kind: 'macro', line: lineOf(node) });
        return;
      }

      if (t === 'FunctionDefinition') {
        // Name = the FunctionDeclarator's Identifier (works for pointers,
        // static, multi-line — the outer node stays FunctionDefinition).
        let name = '';
        for (const ch of children()) {
          if ((ch as { type: { name: string } }).type.name === 'FunctionDeclarator') {
            const id = ch as { firstChild: unknown | null };
            let inner = id.firstChild;
            while (inner) {
              if ((inner as { type: { name: string } }).type.name === 'Identifier') {
                name = text(inner).trim();
                break;
              }
              inner = (inner as { nextSibling: unknown | null }).nextSibling;
            }
            break;
          }
        }
        if (name) out.push({ name: `${name}()`, kind: 'function', line: lineOf(node) });
        return;
      }

      // A function PROTOTYPE is a bare Declaration whose FunctionDeclarator
      // has no body: `int foo(int);` — the grammar gives the body case its own
      // FunctionDefinition node, so definitions vs prototypes parse to
      // different parents and prototypes are invisible to the code above.
      if (t === 'Declaration') {
        for (const ch of children()) {
          if ((ch as { type: { name: string } }).type.name === 'FunctionDeclarator') {
            let name = '';
            const id = ch as { firstChild: unknown | null };
            let inner = id.firstChild;
            while (inner) {
              if ((inner as { type: { name: string } }).type.name === 'Identifier') {
                name = text(inner).trim();
                break;
              }
              inner = (inner as { nextSibling: unknown | null }).nextSibling;
            }
            if (name) out.push({ name: `${name}()`, kind: 'function', line: lineOf(node) });
            break;
          }
        }
        // Struct/enum tags inside a declaration were already reported by the
        // child recursion above — don't add anything else here.
        return;
      }

      // struct/enum specs — the tag (or typedef alias) is the TypeIdentifier
      // child: `struct Point {…}` → struct Point; `typedef struct {…} Hidden;`
      // → the alias lives on the spec, but it's a TYPEDEF, not a struct.
      if (t === 'StructSpecifier' || t === 'EnumSpecifier') {
        let name: string | null = null;
        for (const ch of children()) {
          if ((ch as { type: { name: string } }).type.name === 'TypeIdentifier') {
            name = text(ch).trim();
            break;
          }
        }
        if (name) {
          // Inside `typedef struct Name {…} Alias;` both the tag and the
          // alias exist; the outermost typedef should own the symbol. The
          // parentName mechanism keeps the spec from double-reporting the
          // tag — the typedef walker below handles the alias.
          if (parentName === '__TYPEDEF__') {
            out.push({ name, kind: 'typedef', line: lineOf(node) });
          } else {
            out.push({
              name,
              kind: t === 'StructSpecifier' ? 'struct' : 'enum',
              line: lineOf(node),
            });
          }
        }
        return;
      }

      // typedef <type> Name;
      if (t === 'TypeDefinition') {
        let alias: string | null = null;
        let hasInnerSpec = false;
        for (const ch of children()) {
          const chName = (ch as { type: { name: string } }).type.name;
          if (chName === 'TypeIdentifier') alias = text(ch).trim();
          if (chName === 'StructSpecifier' || chName === 'EnumSpecifier') {
            hasInnerSpec = true;
            walk(ch, '__TYPEDEF__');
          }
        }
        if (!hasInnerSpec && alias) {
          // `typedef unsigned long size_t2;`
          out.push({ name: alias, kind: 'typedef', line: lineOf(node) });
        }
        return;
      }
    };

    walk(body, null);

    // Dedup (a typedef whose inner struct is anonymous already names itself;
    // an unhandled top-level node is skipped) — keep first occurrence.
    const seen = new Set<string>();
    return out.filter((s) => {
      const k = `${s.kind}:${s.name}:${s.line}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  };

  useEffect(() => {
    const parsed = parseSymbols(viewRef.current);
    setSymbols(parsed);
    symbolsRef.current = parsed;
    // Clean up the debounced parse if we unmount mid-typing.
    return () => {
      if (symbolParseTimer.current) {
        clearTimeout(symbolParseTimer.current);
        symbolParseTimer.current = null;
      }
    };
  }, [code, viewRef, symbolModalOpen]);

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

  // Bookmarks are keyed by file path (per-file persistence across tab
  // switches) — the store lives in localStorage (via useBookmarks), not in
  // this mount, so unmounting the editor never loses them.
  const { bookmarksFor, toggleBookmark: toggleStoredBookmark } = useBookmarks();
  const activeBookmarkKey = fileName;
  const bookmarksForFile = bookmarksFor(activeBookmarkKey);
  // The gutter extension must see the CURRENT bookmark set for this file
  // (it's recreated on change) — pass it through and let the memo follow.
  const bookmarkGutterExtensionMemo = useMemo(
    () => bookmarkGutterExtension(bookmarksForFile),
    [bookmarksForFile]
  );

  // Same imperative surface as before — now backed by the per-path store.
  const toggleBookmark = () => {
    const view = viewRef.current;
    if (!view) return;
    const currentLine = view.state.doc.lineAt(view.state.selection.main.head).number;
    toggleStoredBookmark(activeBookmarkKey, currentLine);
  };

  const nextBookmark = () => {
    if (bookmarksForFile.length === 0) return;
    const view = viewRef.current;
    if (!view) return;
    const currentLine = view.state.doc.lineAt(view.state.selection.main.head).number;
    const nextLine =
      bookmarksForFile.find((l) => l > currentLine) || bookmarksForFile[0];
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

  // Tabs ON → one tab character per indent level; OFF → spaces-per-tab.
  // This is the single place the unit is derived — guides and tabSize
  // extensions are synchronized to it below.
  const indentUnitValue = settings.useTabsIndent
    ? '\t'
    : ' '.repeat(settings.tabSize || 4);
  const indentExtension = indentUnit.of(indentUnitValue);

  /* Vertical indent guides (VS Code-style). The Replit extension draws one
     faint line per indentation level down the leading whitespace; stride is
     the indent unit, so tabs/spaces follow the editor settings.
     Colors must be CONCRETE values, not var() strings: the extension emits
     them into a baseTheme '&light'/'&dark' layer that custom themes can
     override, and var() references don't reliably resolve inside .cm-line's
     own background (CodeMirror paints cm-content's bg on the same element,
     shadowing the :root scope). Resolve the app's CSS variables to their
     actual values ONCE per theme change below; if resolution ever comes
     back empty, fall back to the retro theme's literals so guides never
     render with undefined colors. */
  const resolveGuideColors = () => {
    const read = (v: string, fallback: string) => {
      const resolved = getComputedStyle(document.documentElement)
        .getPropertyValue(v)
        .trim();
      return resolved || fallback;
    };
    return {
      light: read('--border', '#1a1c24'),
      dark: read('--border', '#1a1c24'),
      activeLight: read('--text-dim', '#8b8fa8'),
      activeDark: read('--text-dim', '#8b8fa8'),
    };
  };

  const indentGuidesExtension = useMemo(
    () => {
      const colors = resolveGuideColors();
      return indentationMarkers({
        highlightActiveBlock: true,
        hideFirstIndent: false,
        markerType: 'fullScope',
        thickness: 1,
        activeThickness: 1,
        colors,
      });
    },
    // Re-resolve when the theme (or custom CSS / font size affecting
    // indent width) changes — the resolved literals are baked into the
    // extension at construction time.
    [
      settings.theme,
      settings.userCss,
      settings.customThemes,
      settings.tabSize,
      settings.useTabsIndent,
      settings.editorFontSize,
      indentUnitValue,
    ]
  );

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
            fontSize: `${settings.editorFontSize}px`,
            // CodeMirror's default base-theme sets `.cm-scroller { font-family:
            // monospace }`, whose specificity beats any font set on the wrapper.
            // Declare it on .cm-scroller itself so the setting actually reaches
            // the rendered glyphs.
            '& .cm-scroller': {
              fontFamily: settings.fontFamily || 'inherit',
            },
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
    [settings.editorFontSize, settings.fontFamily]
  );

  /* Sync the state-level tabSize with the indent setting so the guide
     extension (which measures leading whitespace against state.tabSize)
     stays aligned with the configured indent unit. Tabs ON → tabSize is
     the tab width; OFF → spaces-per-tab. The toggle is a dep so flipping
     Tabs/Spaces re-creates this extension. */
  const tabSizeExtension = useMemo(
    () =>
      EditorState.tabSize.of(
        settings.useTabsIndent ? settings.tabSize || 4 : settings.tabSize || 4
      ),
    [settings.tabSize, settings.useTabsIndent]
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

  const fontExtension = useMemo(() => {
    const family = settings.fontFamily || 'JetBrainsMono Nerd Font';
    const fontStack = `"${family}", "JetBrainsMono Nerd Font", "JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace`;
    return EditorView.theme({
      '&': {
        fontSize: `${settings.editorFontSize || 14}px`,
        fontFamily: fontStack,
      },
      '.cm-content': {
        fontFamily: fontStack,
      },
      '.cm-gutters': {
        fontFamily: fontStack,
      },
      '.cm-line': {
        fontFamily: fontStack,
      },
    });
  }, [settings.fontFamily, settings.editorFontSize]);

  return (
    <div
      className="editor-container"
      style={{
        fontSize: `${settings.editorFontSize}px`,
        fontFamily: settings.fontFamily || 'inherit',
        letterSpacing: 'normal',
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
        <span>›</span>
        {/* Outline dropdown: jump to any symbol in the file; highlights the
            one under the cursor (activeSymbolName) as you move around. */}
        {symbols.length > 0 ? (
          <select
            className="editor-outline-select"
            value={activeSymbolName ?? (symbols[0]?.name ?? '')}
            onChange={(e) => {
              const sym = symbols.find((s) => s.name === e.target.value);
              if (sym) {
                jumpToLineNum(sym.line);
              }
            }}
          >
            {symbols.map((sym) => (
              <option key={`${sym.kind}:${sym.name}:${sym.line}`} value={sym.name}>
                {kindIcon(sym.kind)} {sym.name} — Ln {sym.line}
              </option>
            ))}
          </select>
        ) : (
          <span>C definitions</span>
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
            fontExtension,
            cpp(),
            search({ top: true }),
            EditorView.updateListener.of((update) => {
              const view = viewRef.current;
              if (!view) return;
              // Only react when the cursor actually moved. Reconfigure updates
              // (e.g. font/theme changes) still fire this listener; skipping
              // unchanged positions keeps reconfigures from re-rendering App.
              const pos = update.state.selection.main.head;
              if (!update.docChanged && lastCursorHeadRef.current === pos) return;
              lastCursorHeadRef.current = pos;
              const line = update.state.doc.lineAt(pos);
              onCursorChangeRef.current?.({ line: line.number, col: pos - line.from + 1 });
              // Enclosing symbol for the outline's active marker: walk up from
              // the cursor to the nearest definition/declaration node.
              const node = syntaxTree(view.state).resolveInner(pos, 1);
              let cursor: SyntaxNode | null = node;
              let active: string | null = null;
              let hops = 0;
              while (cursor && hops < 3) {
                const t = cursor.type.name;
                if (t === 'FunctionDefinition') {
                  active = (symbolsRef.current.find((s) => s.kind === 'function' && s.line === view.state.doc.lineAt(cursor!.from).number)?.name) ?? null;
                  break;
                }
                if (t === 'StructSpecifier' || t === 'EnumSpecifier' || t === 'TypeDefinition') {
                  const ln = view.state.doc.lineAt(cursor.from).number;
                  active = symbolsRef.current.find((s) => s.line === ln)?.name ?? null;
                  break;
                }
                cursor = cursor.parent;
                hops++;
              }
              if (active !== activeSymbolName) setActiveSymbolName(active);
              // Symbol list: re-parse only when the document actually
              // changed (typed text, paste, undo/redo), and debounced 300 ms —
              // re-walking the whole tree on every keystroke makes large
              // files stutter. Pure cursor/viewport/selection updates never
              // change the doc, so they skip the parse entirely. The tree is
              // already at the NEW doc here, so read update.state, never a
              // stale viewRef snapshot.
              if (update.docChanged) {
                if (symbolParseTimer.current) {
                  clearTimeout(symbolParseTimer.current);
                }
                symbolParseTimer.current = setTimeout(() => {
                  const parsed = parseSymbols(viewRef.current);
                  setSymbols(parsed);
                  symbolsRef.current = parsed;
                }, 300);
              }
            }),
            drawSelection(),
            rectangularSelection(),
            crosshairCursor(),
            keymap.of([
              ...searchKeymap,
              // Tab inserts the indent unit (tabs or configured spaces) instead
              // of the browser default focus-nav; keeps guides aligned when
              // typing at the start of a line with spaces mode.
              { key: 'Tab', run: insertTab },
                      { key: 'Mod-h', run: openSearchPanel },
              { key: 'Mod-g', run: gotoLine },
              { key: 'Alt-ArrowDown', run: moveLineDown },
              { key: 'Alt-ArrowUp', run: moveLineUp },
              { key: 'Shift-Alt-ArrowDown', run: copyLineDown },
            ]),
            indentExtension,
            tabSizeExtension,
            indentGuidesExtension,
            bookmarkGutterExtensionMemo,
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
                      {kindIcon(sym.kind)} {sym.name}
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
