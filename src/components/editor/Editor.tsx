import { forwardRef, useImperativeHandle, useRef } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { cpp } from '@codemirror/lang-cpp';
import { toggleLineComment } from '@codemirror/commands';
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
        extensions={[cpp()]}
        onChange={onChange}
        onCreateEditor={(view) => {
          viewRef.current = view;
        }}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: false,
        }}
      />
    </div>
  );
});
