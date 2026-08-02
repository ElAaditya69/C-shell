import { forwardRef, useImperativeHandle, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { cpp } from '@codemirror/lang-cpp';
import { toggleLineComment } from '@codemirror/commands';
import {
  search,
  searchKeymap,
  gotoLine,
  openSearchPanel,
} from '@codemirror/search';
import { keymap, EditorView } from '@codemirror/view';
import type { EditorView as EditorViewType } from '@codemirror/view';
import { indentUnit } from '@codemirror/language';
import { useSettings } from '../../context/SettingsContext';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
}

export interface EditorHandle {
  toggleComment: () => void;
  jumpToPosition: (line: number, col: number) => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { code, onChange },
  ref
) {
  const viewRef = useRef<EditorViewType | null>(null);
  const { settings } = useSettings();

  useImperativeHandle(ref, () => ({
    toggleComment: () => {
      const view = viewRef.current;
      if (!view) return;
      toggleLineComment({ state: view.state, dispatch: view.dispatch });
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
  }));

  return (
    <div className="editor-container" style={{ fontSize: `${settings.editorFontSize}px` }}>
      <CodeMirror
        value={code}
        height="100%"
        theme={oneDark}
        extensions={[
          cpp(),
          // Renders the panel at the top of the editor rather than the
          // bottom, so it's visible immediately without scrolling.
          search({ top: true }),
          keymap.of([
            ...searchKeymap,
            { key: 'Mod-h', run: openSearchPanel },
            { key: 'Mod-g', run: gotoLine },
          ]),
          indentUnit.of(' '.repeat(settings.tabSize || 4)),
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
          // We supply our own search keymap above (with Go To Line
          // added in), so the built-in default one is turned off to
          // avoid any ambiguity about which bindings are actually active.
          searchKeymap: false,
        }}
      />
    </div>
  );
});
