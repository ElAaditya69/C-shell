import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';

interface EditorProps {
  code: string;
  onChange: (value: string) => void;
}

export function Editor({ code, onChange }: EditorProps) {
  return (
    <div className="editor-container">
      <CodeMirror
        value={code}
        height="100%"
        theme={oneDark}
        onChange={onChange}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: true,
          highlightActiveLine: true,
          foldGutter: false,
        }}
      />
    </div>
  );
}
