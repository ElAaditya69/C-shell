import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";

import "xterm/css/xterm.css";

interface TerminalProps {
  output: string;
}

export function Terminal({ output }: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
      convertEol: true,
      theme: {
        background: "#0b0b12",
        foreground: "#ffb000",
        cursor: "#ffb000",
      },
    });

    const fitAddon = new FitAddon();

    term.loadAddon(fitAddon);

    term.open(terminalRef.current);

    fitAddon.fit();

    term.writeln("Welcome to C-Shell!");
    term.writeln("");

    xtermRef.current = term;

    const resize = () => fitAddon.fit();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      term.dispose();
    };
  }, []);

  useEffect(() => {
    if (!xtermRef.current) return;

    xtermRef.current.clear();

    if (output.trim() === "") {
      xtermRef.current.writeln("$ Ready to compile...");
    } else {
      xtermRef.current.write(output.replace(/\n/g, "\r\n"));
    }
  }, [output]);

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

      <div
        ref={terminalRef}
        style={{
          width: "100%",
          height: "100%",
          padding: "10px",
        }}
      />
    </div>
  );
}
