import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { listen } from "@tauri-apps/api/event";
import { FileService } from "../../services/FileService";

import "xterm/css/xterm.css";

export interface XTermHandle {
  clear: () => void;
  sendInterrupt: () => void;
}

export const XTermView = forwardRef<XTermHandle>(function XTermView(_, ref) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);

  useImperativeHandle(ref, () => ({
    clear: () => xtermRef.current?.clear(),
    sendInterrupt: () => {
      // Ctrl+C, forwarded through the real shell — the shell delivers
      // SIGINT to whatever's currently running in the foreground (the
      // compiled program), same as pressing Ctrl+C in any real terminal.
      FileService.sendCommand("\x03").catch((err) =>
        console.error("Failed to send interrupt:", err)
      );
    },
  }));

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: "JetBrains Mono, monospace",
      fontSize: 14,
      convertEol: true,
      scrollback: 5000,
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

    let unlistenOutput: (() => void) | undefined;
    let unlistenFocus: (() => void) | undefined;
    let disposed = false;
    let hasStarted = false;

    (async () => {
      unlistenOutput = await listen<string>("terminal-output", (event) => {
        term.write(event.payload);
      });
      unlistenFocus = await listen("terminal-focus", () => {
        term.focus();
      });

      if (disposed) return;

      try {
        await FileService.startTerminal();
        hasStarted = true;
        await FileService.resizeTerminal(term.rows, term.cols);
      } catch (err) {
        if (!String(err).includes("already started")) {
          console.error("Failed to start terminal:", err);
          term.writeln(`\r\n[c-shell] Failed to start terminal: ${err}\r\n`);
        } else {
          hasStarted = true;
        }
      }
    })();

    term.onData((data) => {
      FileService.sendCommand(data).catch((err) =>
        console.error("Failed to send input:", err)
      );
    });

    let rafId: number | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        fitAddon.fit();
        if (hasStarted) {
          FileService.resizeTerminal(term.rows, term.cols).catch((err) =>
            console.error("Failed to resize pty:", err)
          );
        }
      });
    });
    resizeObserver.observe(terminalRef.current);

    return () => {
      disposed = true;
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      unlistenOutput?.();
      unlistenFocus?.();
      term.dispose();
    };
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", padding: "10px", boxSizing: "border-box" }}>
      <div ref={terminalRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
});
