import { useEffect, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { listen } from "@tauri-apps/api/event";
import { FileService } from "../../services/FileService";

import "xterm/css/xterm.css";

export function XTermView() {
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

    // IMPORTANT: fitAddon.fit() slightly adjusts this same container's
    // internal sizing, which would immediately re-trigger this observer
    // if called synchronously here — creating an infinite resize loop
    // that pegs the JS thread and blocks keyboard input entirely.
    // Deferring the actual work to the next animation frame (and
    // cancelling any pending one) breaks that loop.
    let rafId: number | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return; // hidden (minimized/closed)

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
    // Padding lives on this outer wrapper, NOT on the div xterm.js
    // measures and fits against — padding on the fitted element itself
    // causes fit()'s size calculation to be slightly off, which creates
    // a self-triggering resize feedback loop (the flicker/black-out).
    <div style={{ width: "100%", height: "100%", padding: "10px", boxSizing: "border-box" }}>
      <div ref={terminalRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}