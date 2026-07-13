interface TerminalProps {
  output: string;
}

export function Terminal({ output }: TerminalProps) {
  return (
    <div className="terminal-panel">
      <div className="terminal-header">
        <span className="terminal-title">🖥️ TERMINAL</span>
        <div className="terminal-buttons">
          <span className="term-btn close"></span>
          <span className="term-btn minimize"></span>
          <span className="term-btn maximize"></span>
        </div>
      </div>
      <div className="terminal-body">
        <pre>{output || '$ Ready to compile...\n'}</pre>
      </div>
    </div>
  );
}

