import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { FileService } from "../../services/FileService";

import "xterm/css/xterm.css";

export function Terminal() {
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

    term.onData(async (data) => {
      try {
        await FileService.sendCommand(data);
      } catch (err) {
        console.error(err);
      }
    });

    const readLoop = async () => {
      while (true) {
        try {
          const out = await FileService.readOutput();

          if (out) {
            term.write(out);
          }
        } catch (e) {
          console.error(e);
          break;
        }
      }
    };

    readLoop();

    const resize = () => fitAddon.fit();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      term.dispose();
    };
  }, []);



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
