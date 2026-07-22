import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { listen } from "@tauri-apps/api/event";
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
    term.focus();

    term.writeln("Welcome to C-Shell!");
    term.writeln("");

    xtermRef.current = term;

    let unlisten: (() => void) | undefined;
    let disposed = false;

    (async () => {
      // Listen for pty output BEFORE starting the shell, so we never
      // miss the first bytes it writes.
      unlisten = await listen<string>("terminal-output", (event) => {
        term.write(event.payload);
      });

      if (disposed) return;

      try {
        await FileService.startTerminal();
        // Tell the shell the real size of the panel, not the 30x120 default.
        await FileService.resizeTerminal(term.rows, term.cols);
      } catch (err) {
        console.error("Failed to start terminal:", err);
        term.writeln(`\r\n[c-shell] Failed to start terminal: ${err}\r\n`);
      }
    })();

    term.onData((data) => {
      FileService.sendCommand(data).catch((err) =>
        console.error("Failed to send input:", err)
      );
    });

    const handleResize = () => {
      fitAddon.fit();
      FileService.resizeTerminal(term.rows, term.cols).catch((err) =>
        console.error("Failed to resize pty:", err)
      );
    };

    window.addEventListener("resize", handleResize);

    return () => {
      disposed = true;
      window.removeEventListener("resize", handleResize);
      unlisten?.();
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
        style={{ width: "100%", height: "100%", padding: "10px" }}
      />
    </div>
  );
}