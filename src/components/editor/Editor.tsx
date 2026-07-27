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
import { keymap } from '@codemirror/view';
import type { EditorView } from '@codemirror/view';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
}

export interface EditorHandle {
  toggleComment: () => void;
}

export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  { code, onChange },
  ref
) {
  const viewRef = useRef<EditorView | null>(null);

  useImperativeHandle(ref, () => ({
    toggleComment: () => {
      const view = viewRef.current;
      if (!view) return;
      toggleLineComment({ state: view.state, dispatch: view.dispatch });
      view.focus();
    },
  }));

  return (
    <div className="editor-container">
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
            // Ctrl+H opens the same panel — Find and Replace share one
            // UI in CodeMirror 6, there's no separate "replace mode".
            { key: 'Mod-h', run: openSearchPanel },
            { key: 'Mod-g', run: gotoLine },
          ]),
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
