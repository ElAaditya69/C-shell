import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Terminal as XTerm } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { listen } from "@tauri-apps/api/event";
import { FileService } from "../../services/FileService";

import { useSettings } from "../../context/SettingsContext";

import "xterm/css/xterm.css";

export interface XTermHandle {
  clear: () => void;
  sendInterrupt: () => void;
  getBufferText: () => string;
}

const RUN_DONE_MARKER = "__CSHELL_RUN_DONE__";
export const RUN_FINISHED_EVENT = "cshell:run-finished";

export const XTermView = forwardRef<XTermHandle>(function XTermView(_, ref) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const { settings } = useSettings();

  useImperativeHandle(ref, () => ({
    clear: () => xtermRef.current?.clear(),
    sendInterrupt: () => {
      FileService.sendCommand("\x03").catch((err) =>
        console.error("Failed to send interrupt:", err)
      );
      window.dispatchEvent(new CustomEvent(RUN_FINISHED_EVENT));
    },
    getBufferText: () => {
      const term = xtermRef.current;
      if (!term) return "";
      const activeBuffer = term.buffer.active;
      const lines: string[] = [];
      for (let i = 0; i < activeBuffer.length; i++) {
        const line = activeBuffer.getLine(i);
        if (line) {
          lines.push(line.translateToString(true));
        }
      }
      return lines.join("\n").trim();
    },
  }));

  useEffect(() => {
    if (xtermRef.current) {
      xtermRef.current.options.fontSize = settings.terminalFontSize || 14;
      if (settings.terminalFontFamily) {
        xtermRef.current.options.fontFamily = settings.terminalFontFamily;
      }
    }
  }, [settings.terminalFontSize, settings.terminalFontFamily]);

  /* Theme changes re-style the app through CSS variables on <html>. xterm
     reads them once at mount, so watch for variable changes and push the full
     palette into the live terminal (xterm v5 re-themes in place). */
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    const applyColors = () => {
      const t = xtermRef.current;
      if (!t) return;
      const s = getComputedStyle(document.documentElement);
      const r = (name: string, fallback: string) =>
        s.getPropertyValue(name).trim() || fallback;
      t.options.theme = {
        background: r("--bg-primary", "#0b0b12"),
        foreground: r("--text-primary", "#e8eaf0"),
        cursor: r("--text-primary", "#e8eaf0"),
        cursorAccent: r("--bg-primary", "#0b0b12"),
        selectionBackground: r("--accent", "#ffb000"),
        selectionForeground: r("--bg-primary", "#0b0b12"),
        black: r("--bg-deep", "#000000"),
        red: r("--error", "#f05c5c"),
        green: r("--success", "#3dd68c"),
        yellow: r("--text-bright", "#f0a500"),
        blue: r("--blue", "#5c9cf5"),
        magenta: r("--text-bright", "#f0a500"),
        cyan: r("--blue", "#5c9cf5"),
        white: r("--text-secondary", "#c4c8de"),
        brightBlack: r("--text-dim", "#8b8fa8"),
        brightRed: r("--error", "#f05c5c"),
        brightGreen: r("--success", "#3dd68c"),
        brightYellow: r("--text-bright", "#f0a500"),
        brightBlue: r("--blue", "#5c9cf5"),
        brightMagenta: r("--text-bright", "#f0a500"),
        brightCyan: r("--blue", "#5c9cf5"),
        brightWhite: r("--text-primary", "#e8eaf0"),
      };
    };

    applyColors();

    // applyThemeVariables writes to documentElement.style, so watching the
    // style attribute covers every theme switch (preset, custom, user CSS).
    const observer = new MutationObserver(() => applyColors());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
    return () => observer.disconnect();
  }, [settings.theme]);

  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const style = getComputedStyle(document.documentElement);
    const bg = style.getPropertyValue("--bg-primary").trim() || "#0b0b12";
    const fg = style.getPropertyValue("--text-primary").trim() || "#ffb000";

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: settings.terminalFontFamily || "JetBrains Mono, monospace",
      fontSize: settings.terminalFontSize || 14,
      convertEol: true,
      scrollback: 5000,
      theme: {
        background: bg,
        foreground: fg,
        cursor: fg,
      },
    });

    term.attachCustomKeyEventHandler((arg) => {
      if (arg.ctrlKey && arg.shiftKey && arg.code === 'KeyC') {
        const sel = term.getSelection();
        if (sel) navigator.clipboard.writeText(sel);
        return false;
      }
      if (arg.ctrlKey && arg.shiftKey && arg.code === 'KeyV') {
        navigator.clipboard.readText().then((txt) => FileService.sendCommand(txt));
        return false;
      }
      return true;
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
        const payload = event.payload;

        if (payload.includes(RUN_DONE_MARKER)) {
          const cleaned = payload
            .split(RUN_DONE_MARKER)
            .join("")
            .replace(/\r?\n$/, "\r\n");
          if (cleaned.trim().length > 0) term.write(cleaned);
          window.dispatchEvent(new CustomEvent(RUN_FINISHED_EVENT));
          return;
        }

        term.write(payload);
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

      if (data === "\x03") {
        window.dispatchEvent(new CustomEvent(RUN_FINISHED_EVENT));
      }
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
