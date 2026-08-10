import { useState } from "react";
import { useSettings, AppSettings } from "../../context/SettingsContext";
import { THEMES, THEME_VARIABLES } from "../../context/themes";
import { FileService } from "../../services/FileService";

interface SettingsModalProps {
  onClose: () => void;
}

type Tab = "themes" | "editor" | "terminal" | "interface" | "backups";

const NAV_TABS: { id: Tab; icon: string; label: string }[] = [
  { id: "themes",    icon: "🎨", label: "Themes"    },
  { id: "editor",    icon: "📝", label: "Editor"    },
  { id: "terminal",  icon: "🖥️", label: "Terminal"  },
  { id: "interface", icon: "🛠️", label: "Interface" },
  { id: "backups",   icon: "💾", label: "Backups"   },
];

const FONT_FAMILIES = [
  "Fira Code, JetBrains Mono, Menlo, Consolas, monospace",
  "JetBrains Mono, Menlo, Consolas, monospace",
  "Menlo, Monaco, 'Courier New', monospace",
  "'Courier New', Courier, monospace",
  "Consolas, 'Liberation Mono', monospace",
];

/* Theme-aware palette derived from the app's live CSS custom properties, so the
   modal adapts to whatever theme (preset or custom) is currently active. */
const usePalette = () => {
  const root = getComputedStyle(document.documentElement);
  const v = (name: string, fallback: string) =>
    root.getPropertyValue(name).trim() || fallback;
  return {
    bg:        v("--bg-primary", "#0c0d10"),
    panel:     v("--bg-panel", "#121318"),
    surface:   v("--bg-secondary", "#101218"),
    elevated:  v("--bg-hover", "#1e2028"),
    hover:     v("--bg-hover", "#1e2028"),
    border:    v("--border", "#1a1c24"),
    borderFoc: v("--border", "#1a1c24"),
    amber:     v("--accent", "#f0a500"),
    amberDim:  v("--btn-primary-hover", "#d48900"),
    amberGlow: "rgba(240, 165, 0, 0.10)",
    amberText: "rgba(240, 165, 0, 0.75)",
    text:      v("--text-primary", "#e8eaf0"),
    textSec:   v("--text-secondary", "#c4c8de"),
    textMuted: v("--text-dim", "#8b8fa8"),
    textDim:   "rgba(139, 143, 168, 0.4)",
  };
};

/* ═══════════════════════════════════════════════ MODAL ROOT ══ */
export function SettingsModal({ onClose }: SettingsModalProps) {
  const [tab, setTab] = useState<Tab>("themes");

  const handleBackdrop = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="modal-backdrop"
      onClick={handleBackdrop}
      style={{ zIndex: 1000 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 760,
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          boxShadow: "0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(240,165,0,0.04)",
        }}
      >
        <ModalHeader onClose={onClose} />

        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Sidebar tab={tab} setTab={setTab} />

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "28px 32px 0",
              background: "var(--bg-primary)",
            }}
          >
            {tab === "themes"    && <ThemesTab />}
            {tab === "editor"    && <EditorTab />}
            {tab === "terminal"  && <TerminalTab />}
            {tab === "interface" && <InterfaceTab />}
            {tab === "backups"   && <BackupsTab />}
          </div>
        </div>

        <ModalFooter onClose={onClose} />
      </div>
    </div>
  );
}

/* ── Modal Header ── */
function ModalHeader({ onClose }: { onClose: () => void }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px",
        height: 56,
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 18 }}>⚙️</span>
        <span
          style={{
            fontFamily: "inherit",
            fontSize: 15,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "0.04em",
          }}
        >
          C-Shell Preferences
        </span>
      </div>
      <button className="close-btn" onClick={onClose} style={{ width: 28, height: 28 }}>
        ×
      </button>
    </div>
  );
}

/* ── Sidebar ── */
function Sidebar({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const clr = usePalette();
  return (
    <div
      style={{
        width: 190,
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        padding: "20px 0",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: "0.12em",
          color: "var(--text-dim)",
          padding: "0 18px 10px",
          textTransform: "uppercase",
        }}
      >
        Settings
      </div>
      {NAV_TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "9px 18px",
              margin: "0 8px",
              background: active ? clr.amberGlow : "none",
              border: "none",
              borderRadius: 4,
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              color: active ? "var(--accent)" : "var(--text-secondary)",
              position: "relative",
              transition: "background 0.12s, color 0.12s",
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.background = "var(--bg-hover)";
                e.currentTarget.style.color = "var(--text-primary)";
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.background = "none";
                e.currentTarget.style.color = "var(--text-secondary)";
              }
            }}
          >
            {active && (
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: 3,
                  height: 18,
                  background: "var(--accent)",
                  borderRadius: "0 2px 2px 0",
                }}
              />
            )}
            <span style={{ fontSize: 14, lineHeight: 1 }}>{t.icon}</span>
            {t.label}
          </button>
        );
      })}

      <div
        style={{
          marginTop: "auto",
          padding: "16px 18px 4px",
          fontSize: 10,
          color: "var(--text-dim)",
          fontStyle: "italic",
          lineHeight: 1.6,
          opacity: 0.7,
        }}
      >
        C-Shell v0.6.0-1<br />Professional Edition
      </div>
    </div>
  );
}

/* ── Modal Footer ── */
function ModalFooter({ onClose }: { onClose: () => void }) {
  const { settings, updateSettings } = useSettings();
  const clr = usePalette();

  const exportSettings = async () => {
    try {
      const dest = await FileService.saveJsonDialog("c-shell-settings.json");
      if (!dest) return;
      await FileService.writeFile(dest, JSON.stringify(settings, null, 2));
      alert("Settings exported successfully!");
    } catch (e) {
      alert(`Export failed: ${e}`);
    }
  };

  const importSettings = async () => {
    try {
      const file = await FileService.openJsonDialog();
      if (!file) return;
      const json = await FileService.readFile(file);
      const parsed = JSON.parse(json);
      if (typeof parsed !== "object" || parsed === null) {
        throw new Error("invalid settings object");
      }
      const next: Partial<AppSettings> = {};
      for (const key of Object.keys(parsed) as (keyof AppSettings)[]) {
        if (key in settings) {
          (next as Record<string, unknown>)[key] = parsed[key];
        }
      }
      await updateSettings(next);
      alert("Settings imported successfully!");
    } catch (e) {
      alert(`Import failed: ${e}`);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "14px 24px",
        background: "var(--bg-panel)",
        borderTop: "1px solid var(--border)",
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", gap: 8 }}>
        <GhostBtn label="📥 Import Settings" onClick={importSettings} />
        <GhostBtn label="📤 Export Settings" onClick={exportSettings} />
      </div>

      <button
        onClick={onClose}
        style={{
          padding: "8px 28px",
          background: `linear-gradient(135deg, ${clr.amber} 0%, ${clr.amberDim} 100%)`,
          border: "none",
          borderRadius: 4,
          color: "#0d0e11",
          fontFamily: "inherit",
          fontSize: 12,
          fontWeight: 700,
          cursor: "pointer",
          letterSpacing: "0.06em",
          transition: "filter 0.15s, transform 0.1s",
          boxShadow: `0 2px 12px rgba(240,165,0,0.25)`,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.filter = "brightness(1.1)";
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.filter = "none";
          e.currentTarget.style.transform = "none";
        }}
      >
        Done
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════ TAB CONTENT ══ */

/* ── Themes Tab ── */
function ThemesTab() {
  const { settings, updateSettings } = useSettings();
  const customThemes = settings.customThemes || [];

  const saveCustomTheme = (theme: {
    id: string;
    name: string;
    variables: Record<string, string>;
  }) => {
    const exists = customThemes.some((t) => t.id === theme.id);
    let next: typeof customThemes;
    if (exists) {
      next = customThemes.map((t) => (t.id === theme.id ? theme : t));
    } else {
      next = [...customThemes, theme];
    }
    updateSettings({ customThemes: next });
  };

  const deleteCustomTheme = (id: string) => {
    const next = customThemes.filter((t) => t.id !== id);
    updateSettings({ customThemes: next });
    if (settings.theme === id) {
      updateSettings({ theme: "retro" });
    }
  };

  const newCustomTheme = () => {
    const base = THEMES.retro;
    const id = `custom-${Date.now()}`;
    const theme = {
      id,
      name: "New Theme",
      variables: { ...base.variables },
    };
    saveCustomTheme(theme);
    updateSettings({ theme: id });
  };

  const activeCustom = customThemes.find((t) => t.id === settings.theme);

  const swatchCard = (
    t: { id: string; name: string; variables: Record<string, string> },
    prefix?: string
  ) => {
    const isActive = settings.theme === t.id;
    return (
      <div
        key={t.id}
        onClick={() => updateSettings({ theme: t.id })}
        style={{
          padding: "10px 14px",
          borderRadius: 8,
          border: isActive
            ? "2px solid var(--accent)"
            : "2px solid var(--border)",
          background: t.variables["--bg-secondary"],
          color: t.variables["--text-primary"],
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          transition: "all 0.15s ease",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          {prefix ? `${prefix} ${t.name}` : t.name}
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: t.variables["--bg-primary"],
              border: "1px solid rgba(255,255,255,0.2)",
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: t.variables["--text-primary"],
            }}
          />
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: t.variables["--accent"],
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <div style={{ paddingBottom: 32 }}>
      <Section label="Theme Palette">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            Choose a theme palette or create your own
          </span>
          <GhostBtn
            label="➕ New Custom Theme"
            onClick={newCustomTheme}
            title="Create a copy of the current palette as a new custom theme"
          />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}
        >
          {Object.values(THEMES).map((t) => swatchCard(t))}
          {customThemes.map((t) => swatchCard(t, "✨"))}
        </div>
      </Section>

      {/* Custom Theme Editor: shown when a custom theme is active */}
      {activeCustom && (
        <Section label="Custom Theme Editor" style={{ marginTop: 28 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Editing: <b style={{ color: "var(--text-primary)" }}>{activeCustom.name}</b>
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <GhostBtn
                label="✏️ Rename"
                small
                onClick={() => {
                  const name = prompt("Theme name:", activeCustom.name);
                  if (name && name.trim()) {
                    saveCustomTheme({ ...activeCustom, name: name.trim() });
                  }
                }}
              />
              <GhostBtn
                label="🗑️ Delete"
                small
                onClick={() => {
                  if (confirm(`Delete "${activeCustom.name}"?`)) {
                    deleteCustomTheme(activeCustom.id);
                  }
                }}
              />
            </div>
          </div>

          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: 8,
              padding: 14,
              background: "var(--bg-secondary)",
            }}
          >
            {/* Perfect two-column grid: each row is a fixed-width swatch plus
                its text label, so swatches and labels align across rows. */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "6px 14px",
              }}
            >
              {THEME_VARIABLES.map(({ key, label }) => (
                <SwatchRow
                  key={key}
                  variableKey={key}
                  label={label}
                  value={activeCustom.variables[key] || "#000000"}
                  onChange={(value) =>
                    saveCustomTheme({
                      ...activeCustom,
                      variables: { ...activeCustom.variables, [key]: value },
                    })
                  }
                />
              ))}
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
              Custom CSS
            </label>
            <textarea
              value={settings.userCss || ""}
              onChange={(e) => updateSettings({ userCss: e.target.value })}
              placeholder={"/* Override any style here, e.g.\n.app { font-family: 'Fira Code'; } */"}
              rows={4}
              style={{
                width: "100%",
                boxSizing: "border-box",
                marginTop: 6,
                padding: 8,
                borderRadius: 6,
                border: "1px solid var(--border)",
                background: "var(--bg-primary)",
                color: "var(--text-primary)",
                fontFamily: "monospace",
                fontSize: 12,
                resize: "vertical",
              }}
            />
          </div>
        </Section>
      )}
    </div>
  );
}

/* ── Editor Tab ── */
function EditorTab() {
  const { settings, updateSettings } = useSettings();
  const set = (k: keyof AppSettings, v: unknown) =>
    updateSettings({ [k]: v } as Partial<AppSettings>);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Section label="Font Configuration">
        <ControlRow label="Editor Font Size" value={`${settings.editorFontSize}px`}>
          <StyledSlider
            min={10} max={24} step={1}
            value={settings.editorFontSize}
            onChange={(v) => set("editorFontSize", v)}
          />
        </ControlRow>

        <Divider />

        <ControlRow label="Terminal Font Size" value={`${settings.terminalFontSize}px`}>
          <StyledSlider
            min={8} max={20} step={1}
            value={settings.terminalFontSize}
            onChange={(v) => set("terminalFontSize", v)}
          />
        </ControlRow>

        <Divider />

        <ControlRow label="Editor Font Family">
          <StyledSelect
            value={settings.fontFamily}
            options={FONT_FAMILIES}
            onChange={(v) => set("fontFamily", v)}
          />
        </ControlRow>
      </Section>

      <Section label="Editor Behavior" style={{ marginTop: 28 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px 24px",
            padding: "4px 0",
          }}
        >
          <StyledCheckbox
            label="Word Wrap"
            desc="Wrap long lines at viewport edge"
            checked={settings.wordWrap}
            onChange={(v) => set("wordWrap", v)}
          />
          <StyledCheckbox
            label="Autosave Files"
            desc="Save automatically every 30s"
            checked={settings.autosave}
            onChange={(v) => set("autosave", v)}
          />
          <StyledCheckbox
            label="Indent using Hard Tabs"
            desc="Use tab characters instead of spaces"
            checked={settings.useTabsIndent}
            onChange={(v) => set("useTabsIndent", v)}
          />
          <StyledCheckbox
            label="Show Toolbar Labels"
            desc="Display text on toolbar buttons"
            checked={settings.showToolbarLabels}
            onChange={(v) => set("showToolbarLabels", v)}
          />
          <StyledCheckbox
            label="Show Top Toolbar"
            desc="Display the main toolbar"
            checked={settings.showToolbar}
            onChange={(v) => set("showToolbar", v)}
          />
          <StyledCheckbox
            label="Show Bottom Status Bar"
            desc="Display file info and build status"
            checked={settings.showStatusBar}
            onChange={(v) => set("showStatusBar", v)}
          />
        </div>
      </Section>
    </div>
  );
}

/* ── Terminal Tab ── */
function TerminalTab() {
  const { settings, updateSettings } = useSettings();
  const set = (k: keyof AppSettings, v: unknown) =>
    updateSettings({ [k]: v } as Partial<AppSettings>);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Section label="Terminal Display">
        <ControlRow label="Terminal Font Size" value={`${settings.terminalFontSize}px`}>
          <StyledSlider
            min={8} max={20} step={1}
            value={settings.terminalFontSize}
            onChange={(v) => set("terminalFontSize", v)}
          />
        </ControlRow>

        <Divider />

        <ControlRow label="Terminal Font Family">
          <StyledSelect
            value={settings.terminalFontFamily}
            options={FONT_FAMILIES}
            onChange={(v) => set("terminalFontFamily", v)}
          />
        </ControlRow>

        <Divider />

        <ControlRow label="Terminal Position">
          <StyledSelect
            value={settings.terminalPosition}
            options={["bottom", "right"]}
            onChange={(v) => set("terminalPosition", v)}
          />
        </ControlRow>
      </Section>
    </div>
  );
}

/* ── Interface Tab ── */
function InterfaceTab() {
  const { settings, updateSettings } = useSettings();
  const set = (k: keyof AppSettings, v: unknown) =>
    updateSettings({ [k]: v } as Partial<AppSettings>);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Section label="Interface Visibility">
        <div style={{ display: "flex", flexDirection: "column", gap: 4, padding: "4px 0" }}>
          <StyledCheckbox
            label="Show Top Toolbar"
            desc="Display the main toolbar with Run, Save, and tool buttons"
            checked={settings.showToolbar}
            onChange={(v) => set("showToolbar", v)}
            horizontal
          />
          <StyledCheckbox
            label="Show Bottom Status Bar"
            desc="Display file info, encoding, and build status at the bottom"
            checked={settings.showStatusBar}
            onChange={(v) => set("showStatusBar", v)}
            horizontal
          />
          <StyledCheckbox
            label="Show Toolbar Labels"
            desc="Display text labels on toolbar buttons"
            checked={settings.showToolbarLabels}
            onChange={(v) => set("showToolbarLabels", v)}
            horizontal
          />
        </div>
      </Section>

      <Section label="File Explorer" style={{ marginTop: 28 }}>
        <ControlRow label="Explorer Position">
          <StyledSelect
            value={settings.explorerPosition}
            options={["left", "right"]}
            onChange={(v) => set("explorerPosition", v)}
          />
        </ControlRow>

        <Divider />

        <ControlRow label="Editor Tab Size" value={`${settings.tabSize} spaces`}>
          <StyledSlider
            min={2} max={8} step={1}
            value={settings.tabSize}
            onChange={(v) => set("tabSize", v)}
          />
        </ControlRow>
      </Section>
    </div>
  );
}

/* ── Backups Tab ── */
function BackupsTab() {
  const { settings, updateSettings } = useSettings();
  const set = (k: keyof AppSettings, v: unknown) =>
    updateSettings({ [k]: v } as Partial<AppSettings>);

  return (
    <div style={{ paddingBottom: 32 }}>
      <Section label="Automatic Backups">
        <div style={{ marginBottom: 16 }}>
          <StyledCheckbox
            label="Enable Automatic Backups"
            desc="Periodically save copies of open files to a backup directory"
            checked={settings.backupEnabled}
            onChange={(v) => set("backupEnabled", v)}
            horizontal
          />
        </div>

        <Divider />

        <ControlRow label="Backup Interval" value={`Every ${settings.backupInterval}s`}>
          <StyledSlider
            min={10} max={300} step={10}
            value={settings.backupInterval}
            onChange={(v) => set("backupInterval", v)}
            disabled={!settings.backupEnabled}
          />
        </ControlRow>

        <Divider />

        <ControlRow label="Backup Copies to Keep" value={`${settings.backupCount} copies`}>
          <StyledSlider
            min={1} max={20} step={1}
            value={settings.backupCount}
            onChange={(v) => set("backupCount", v)}
            disabled={!settings.backupEnabled}
          />
        </ControlRow>
      </Section>

      <Section label="Backup Location" style={{ marginTop: 28 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 12px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 4,
          }}
        >
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              flex: 1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {settings.backupDir}
          </span>
          <GhostBtn
            label="Change…"
            small
            onClick={async () => {
              const dir = await FileService.openFolder();
              if (dir) set("backupDir", dir);
            }}
          />
        </div>
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════ SHARED CONTROLS ══ */

function Section({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
          paddingBottom: 10,
          borderBottom: "1px solid var(--border)",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 3,
            height: 13,
            background: "var(--accent)",
            borderRadius: 2,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--text-secondary)",
            textTransform: "uppercase",
          }}
        >
          {label}
        </span>
      </div>
      {children}
    </div>
  );
}

function ControlRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children: React.ReactNode;
}) {
  const clr = usePalette();
  return (
    <div style={{ padding: "10px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 10,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>
          {label}
        </span>
        {value && (
          <span
            style={{
              fontSize: 11,
              color: clr.amber,
              fontWeight: 600,
              letterSpacing: "0.04em",
              background: clr.amberGlow,
              padding: "1px 8px",
              borderRadius: 3,
              border: "1px solid rgba(240,165,0,0.15)",
            }}
          >
            {value}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)", margin: "2px 0" }} />;
}

/* ── Color Swatch Row (Themes tab) ── */
function SwatchRow({
  variableKey,
  label,
  value,
  onChange,
}: {
  variableKey: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label
      title={variableKey}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        fontSize: 12,
        color: "var(--text-dim)",
        cursor: "pointer",
        minWidth: 0,
      }}
    >
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 28,
          height: 24,
          border: "none",
          background: "none",
          padding: 0,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          minWidth: 0,
        }}
      >
        {label}
      </span>
    </label>
  );
}

/* ── Styled Slider ── */
function StyledSlider({
  min,
  max,
  step,
  value,
  onChange,
  disabled,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const clr = usePalette();
  const pct = ((value - min) / (max - min)) * 100;
  const trackFill = `linear-gradient(to right, ${clr.amber} ${pct}%, var(--bg-secondary) ${pct}%)`;

  return (
    <div style={{ position: "relative", padding: "4px 0" }}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          width: "100%",
          height: 4,
          appearance: "none",
          background: disabled ? "var(--bg-secondary)" : trackFill,
          border: "1px solid var(--border)",
          borderRadius: 2,
          outline: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
        }}
      />
      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${clr.text};
          border: 2px solid ${clr.amber};
          cursor: pointer;
          box-shadow: 0 0 0 3px ${clr.amberGlow};
          transition: box-shadow 0.15s, transform 0.1s;
        }
        input[type=range]::-webkit-slider-thumb:hover {
          box-shadow: 0 0 0 5px rgba(240,165,0,0.15);
          transform: scale(1.1);
        }
        input[type=range]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${clr.text};
          border: 2px solid ${clr.amber};
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

/* ── Styled Select ── */
function StyledSelect({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: "100%",
          padding: "8px 32px 8px 12px",
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: 4,
          color: "var(--text-primary)",
          fontFamily: "inherit",
          fontSize: 12,
          cursor: "pointer",
          appearance: "none",
          outline: "none",
          transition: "border-color 0.15s",
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--text-dim)",
          fontSize: 9,
          pointerEvents: "none",
        }}
      >
        ▾
      </span>
    </div>
  );
}

/* ── Styled Checkbox ── */
function StyledCheckbox({
  label,
  desc,
  checked,
  onChange,
  horizontal,
}: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  horizontal?: boolean;
}) {
  const clr = usePalette();
  return (
    <label
      style={{
        display: "flex",
        alignItems: horizontal ? "center" : "flex-start",
        gap: 10,
        cursor: "pointer",
        padding: horizontal ? "10px 12px" : "8px 10px",
        background: "none",
        border: "1px solid transparent",
        borderRadius: 4,
        transition: "background 0.12s, border-color 0.12s",
        userSelect: "none",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
        e.currentTarget.style.borderColor = "var(--border)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "none";
        e.currentTarget.style.borderColor = "transparent";
      }}
    >
      <div
        onClick={() => onChange(!checked)}
        style={{
          width: 18,
          height: 18,
          borderRadius: 4,
          border: `1.5px solid ${checked ? clr.amber : "var(--border)"}`,
          background: checked ? clr.amberGlow : "var(--bg-secondary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "border-color 0.15s, background 0.15s",
          marginTop: horizontal ? 0 : 1,
        }}
      >
        {checked && (
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
            <path d="M1 4L3.5 6.5L9 1" stroke={clr.amber} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500, lineHeight: 1.3 }}>
          {label}
        </div>
        {desc && (
          <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2, lineHeight: 1.4 }}>
            {desc}
          </div>
        )}
      </div>
    </label>
  );
}

/* ── Ghost Button ── */
function GhostBtn({
  label,
  small,
  onClick,
  title,
}: {
  label: string;
  small?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const clr = usePalette();
  return (
    <button
      onClick={onClick}
      title={title}
      style={{
        padding: small ? "4px 10px" : "7px 14px",
        background: "none",
        border: `1px solid ${clr.border}`,
        borderRadius: 4,
        color: clr.textSec,
        fontFamily: "inherit",
        fontSize: small ? 10 : 11,
        cursor: "pointer",
        whiteSpace: "nowrap",
        transition: "color 0.12s, border-color 0.12s, background 0.12s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = clr.text;
        e.currentTarget.style.borderColor = clr.borderFoc;
        e.currentTarget.style.background = clr.surface;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = clr.textSec;
        e.currentTarget.style.borderColor = clr.border;
        e.currentTarget.style.background = "none";
      }}
    >
      {label}
    </button>
  );
}
