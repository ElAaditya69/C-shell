import { useEffect, useRef, useState } from "react";
import { useSettings } from "../../context/SettingsContext";

export interface CommandAction {
  id: string;
  label: string;
  category: string;
  shortcut?: string;
  perform: () => void;
}

interface CommandPaletteProps {
  actions: CommandAction[];
  onClose: () => void;
}

export function CommandPalette({ actions, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { updateSettings } = useSettings();

  const allActions: CommandAction[] = [
    ...actions,
    {
      id: "theme-retro",
      label: "Theme: Retro Amber",
      category: "Theme",
      perform: () => updateSettings({ theme: "retro" }),
    },
    {
      id: "theme-midnight",
      label: "Theme: Midnight Blue",
      category: "Theme",
      perform: () => updateSettings({ theme: "midnight" }),
    },
    {
      id: "theme-solarized",
      label: "Theme: Solarized Dark",
      category: "Theme",
      perform: () => updateSettings({ theme: "solarized" }),
    },
    {
      id: "theme-light",
      label: "Theme: Clean Light",
      category: "Theme",
      perform: () => updateSettings({ theme: "light" }),
    },
  ];

  const filtered = allActions.filter(
    (a) =>
      a.label.toLowerCase().includes(query.toLowerCase()) ||
      a.category.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[activeIndex]) {
        filtered[activeIndex].perform();
        onClose();
      }
    }
  };

  return (
    <div className="quick-open-backdrop" onClick={onClose}>
      <div
        className="quick-open-box"
        onClick={(e) => e.stopPropagation()}
        style={{ width: "560px" }}
      >
        <input
          ref={inputRef}
          className="quick-open-input"
          placeholder="Type a command or search actions... (e.g. Run, Format, Theme)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className="quick-open-list" style={{ maxHeight: "320px" }}>
          {filtered.length === 0 ? (
            <div className="quick-open-empty">No matching commands</div>
          ) : (
            filtered.map((action, i) => (
              <div
                key={action.id}
                className={`quick-open-item ${
                  i === activeIndex ? "active" : ""
                }`}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  action.perform();
                  onClose();
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span>{action.label}</span>
                {action.shortcut && (
                  <span
                    style={{
                      fontSize: "11px",
                      opacity: 0.6,
                      background: "rgba(255,255,255,0.08)",
                      padding: "2px 6px",
                      borderRadius: "4px",
                    }}
                  >
                    {action.shortcut}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
