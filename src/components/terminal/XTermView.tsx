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

export interface XTermProps {
  started?: boolean;
}

const RUN_DONE_MARKER = "__CSHELL_RUN_DONE__";
export const RUN_FINISHED_EVENT = "cshell:run-finished";

export const XTermView = forwardRef<XTermHandle, XTermProps>(function XTermView({ started = false }, ref) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { settings } = useSettings();
  const hasStartedRef = useRef(false);

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

  // Effect 1: Create terminal instance ONCE on mount
  useEffect(() => {
    if (!terminalRef.current || xtermRef.current) return;

    const style = getComputedStyle(document.documentElement);
    const bg = style.getPropertyValue("--bg-primary").trim() || "#0b0b12";
    const fg = style.getPropertyValue("--text-primary").trim() || "#ffb000";

    const family = settings.terminalFontFamily || "JetBrainsMono Nerd Font";
    const fontStack = `"${family}", "JetBrainsMono Nerd Font", "JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace`;

    const term = new XTerm({
      cursorBlink: true,
      fontFamily: fontStack,
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
    fitAddonRef.current = fitAddon;
    term.loadAddon(fitAddon);
    term.open(terminalRef.current);
    fitAddon.fit();
    term.focus();

    term.writeln("Welcome to C-Shell!");
    term.writeln("");

    xtermRef.current = term;

    let unlistenOutput: (() => void) | undefined;
    let unlistenFocus: (() => void) | undefined;
    let rafId: number | null = null;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (width === 0 || height === 0) return;

      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        fitAddon.fit();
        if (hasStartedRef.current) {
          FileService.resizeTerminal(term.rows, term.cols).catch((err) =>
            console.error("Failed to resize pty:", err)
          );
        }
      });
    });
    resizeObserver.observe(terminalRef.current);

    (async () => {
      // Handle incoming data from the pty (only if pty has started)
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

      // Handle terminal focus events
      unlistenFocus = await listen("terminal-focus", () => {
        term.focus();
      });
    })();

    // Handle keypresses from the terminal (send to pty only if pty has started)
    term.onData((data) => {
      if (data === "\x03") {
        window.dispatchEvent(new CustomEvent(RUN_FINISHED_EVENT));
      }
      // Only send data to pty if it has started
      if (hasStartedRef.current) {
        FileService.sendCommand(data).catch((err) =>
          console.error("Failed to send input:", err)
        );
      }
    });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      unlistenOutput?.();
      unlistenFocus?.();
      term.dispose();
      xtermRef.current = null;
    };
  }, []);

  // Effect 2: Dynamically update terminal font, size, and theme without disposing the terminal!
  useEffect(() => {
    const term = xtermRef.current;
    if (!term) return;

    const family = settings.terminalFontFamily || "JetBrainsMono Nerd Font";
    const fontStack = `"${family}", "JetBrainsMono Nerd Font", "JetBrains Mono", Menlo, Monaco, Consolas, "Courier New", monospace`;
    term.options.fontFamily = fontStack;
    term.options.fontSize = settings.terminalFontSize || 14;

    const style = getComputedStyle(document.documentElement);
    const bg = style.getPropertyValue("--bg-primary").trim() || "#0b0b12";
    const fg = style.getPropertyValue("--text-primary").trim() || "#ffb000";
    term.options.theme = {
      background: bg,
      foreground: fg,
      cursor: fg,
    };

    fitAddonRef.current?.fit();
  }, [settings.terminalFontFamily, settings.terminalFontSize, settings.theme]);

  // Effect 3: Start the pty when the terminal is started
  useEffect(() => {
    if (!started || !xtermRef.current || hasStartedRef.current) return;

    const term = xtermRef.current;
    (async () => {
      try {
        await FileService.startTerminal();
        hasStartedRef.current = true;
        await FileService.resizeTerminal(term.rows, term.cols);
      } catch (err) {
        if (!String(err).includes("already started")) {
          console.error("Failed to start terminal:", err);
          term.writeln(`\r\n[c-shell] Failed to start terminal: ${err}\r\n`);
        } else {
          hasStartedRef.current = true;
        }
      }
    })();
  }, [started]);
});