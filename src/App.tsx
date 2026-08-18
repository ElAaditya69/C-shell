import { useEffect, useMemo, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CompileService, RunConfig } from './services/CompileService';
import { RunConfigModal } from './components/common/RunConfigModal';
import { FileService } from './services/FileService';
import { FormatService } from './services/FormatService';
import { Editor, EditorHandle } from './components/editor/Editor';
import { TabBar } from './components/editor/TabBar';
import { PanesContainer, PaneState, PaneRefs } from './components/editor/PanesContainer';
import { QuickOpen } from './components/editor/QuickOpen';
import { WelcomeScreen } from './components/common/WelcomeScreen';
import { TerminalPanel, TerminalPanelHandle } from './components/terminal/TerminalPanel';
import { RUN_FINISHED_EVENT } from './components/terminal/XTermView';
import { Toolbar, ActivityState, C_STANDARDS } from './components/toolbar/Toolbar';
import { FileTree } from './components/sidebar/FileTree';
import { ScreenshotModal } from './components/screenshot/ScreenshotModal';
import { LabReportModal } from './components/report/LabReportModal';
import { SettingsModal } from './components/settings/SettingsModal';
import { CommandPalette, CommandAction } from './components/common/CommandPalette';
import { SearchInFilesModal } from './components/common/SearchInFilesModal';
import { SnippetsModal } from './components/common/SnippetsModal';
import { useTabs } from './hooks/useTabs';
import { Logo } from './components/common/Logo';
import { useFileExplorer } from './hooks/useFileExplorer';
import { useSettings } from './context/SettingsContext';
import './App.css';

function App() {
  const [activityState, setActivityState] = useState<ActivityState>('idle');
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [screenshotModalVisible, setScreenshotModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [snippetsModalVisible, setSnippetsModalVisible] = useState(false);
  const [zenMode, setZenMode] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  // Multi-pane editing: each pane shows ITS OWN tab (different files side by
  // side). Empty array = classic single-editor layout. When the last pane is
  // closed, fall back to the classic layout (panes become []).
  const [panes, setPanes] = useState<PaneState[]>([]);
  // The pane the user last interacted with (click, type, tab select, focus
  // key). Drives: tab-click loading, Ctrl+1/2 focus, status-bar cursor.
  const [activePaneId, setActivePaneId] = useState(1);
  // useSettings must run before any state initialized from settings —
  // its destructured consts are referenced during render.
  const { settings, isSettingsLoaded, updateSettings } = useSettings();
  // The ACTIVE C standard — the source of truth for both the toolbar select
  // and the -std flag. Initialized from persisted settings.cStandard so a
  // saved C11 isn't silently ignored after restart.
  const [cStandard, setCStandard] = useState(() => settings.cStandard || "c99");
  const [runConfig, setRunConfig] = useState<RunConfig>({ args: [] });
  const [runConfigOpen, setRunConfigOpen] = useState(false);
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({
    line: 1,
    col: 1,
  });
  const editorRef = useRef<EditorHandle>(null);
  const paneRefs = useRef<PaneRefs>({});
  const terminalRef = useRef<TerminalPanelHandle>(null);

  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    openFile,
    newFile,
    updateActiveCode,
    updateTabCode,
    saveFile,
    saveFileAs,
    closeTab,
    reorderTabs,
    removeTabForPath,
    renameTabForPath,
    hasCrashBackup,
    restoreCrashBackup,
    dismissCrashBackup,
    exportCrashBackup,
    importCrashBackup,
  } = useTabs();

  const tabsById = useMemo(() => new Map(tabs.map((t) => [t.id, t])), [tabs]);

  const {
    files,
    currentDir,
    refreshKey,
    loadDirectory,
    refresh,
    closeFolder,
    openFolder,
    openFileDialog,
    deleteFile,
    createFolder,
    createFileInFolder,
    renamePath,
  } = useFileExplorer();

  const isRestoredRef = useRef(false);

  // C standard: settings are the single source of truth. When they load (or
  // change via Settings → C Standard), mirror them into the active state; if
  // a stored value isn't a known standard (e.g. pasted from an old settings
  // file), reset it to the default instead of compiling with a bogus -std.
  useEffect(() => {
    if (!isSettingsLoaded) return;
    const valid = C_STANDARDS.map((s) => s.toLowerCase());
    if (settings.cStandard && valid.includes(settings.cStandard.toLowerCase())) {
      setCStandard(settings.cStandard.toLowerCase());
    } else {
      setCStandard("c99");
      // Persist the correction so the invalid value doesn't reappear.
      if (settings.cStandard !== "c99") {
        void updateSettings({ cStandard: "c99" });
      }
    }
  }, [isSettingsLoaded, settings.cStandard, updateSettings]);

  useEffect(() => {
    if (!isSettingsLoaded || isRestoredRef.current) return;
    // Mark this before awaiting directory/file reads. Those reads update settings
    // and re-render the app; without this guard restoration can start twice.
    isRestoredRef.current = true;
    (async () => {
      try {
        // Only restore the folder the user explicitly opened last session.
        // No folder fallback — if nothing was opened, show the "no folder
        // open" empty state (like VS Code) rather than dumping a parent
        // directory's contents.
        const targetDir = settings.lastDir;
        if (targetDir) {
          await FileService.setWorkspace(targetDir);
          await loadDirectory(targetDir);
        }

        if (settings.openTabs && settings.openTabs.length > 0) {
          for (const path of settings.openTabs) {
            await openFile(path);
          }
        }
      } catch {
        // Stay clean if loading fails
      }
    })();
  }, [isSettingsLoaded, loadDirectory, openFile, settings.lastDir, settings.openTabs]);

  // A tab counts as dirty if its content differs from what's on disk OR it
  // was never saved at all (untitled tabs have path === null and
  // code === savedCode, but their content exists only in memory — dropping
  // it on quit would lose the file silently).
  const hasUnsavedWork = (list: { code: string; savedCode: string; path: string | null }[]) =>
    list.some((t) => t.code !== t.savedCode || t.path === null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedWork(tabs)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [tabs]);

  const handleOpenFolder = async () => {
    await openFolder();
  };

  const handleCloseFolder = async () => {
    closeFolder();
    await updateSettings({ lastDir: null });
  };

  const handleOpenFile = async () => {
    const file = await openFileDialog();
    if (file) await openFile(file);
  };

  const handleSave = () => {
    void saveFile(loadDirectory);
  };

  const handleSaveAs = () => {
    void saveFileAs(loadDirectory);
  };

  const handleDelete = async (path: string, isDir: boolean) => {
    const deleted = await deleteFile(path, isDir);
    if (deleted) removeTabForPath(path);
  };

  const handleRename = async (path: string, currentName: string) => {
    const newPath = await renamePath(path, currentName);
    if (newPath) renameTabForPath(path, newPath);
  };

  const handleNewFileInFolder = async (parentPath: string) => {
    const newPath = await createFileInFolder(parentPath);
    if (newPath) await openFile(newPath);
  };

  /* Open a built-in example as a new untitled tab */
  const openExample = (code: string, filename: string) => {
    newFile(code, filename);
  };

  /* Detect if a file is Python and run accordingly */
  const isPythonFile = (name: string) =>
    name.endsWith('.py') || name.endsWith('.pyw');

  const runCode = async () => {
    if (!activeTab) return;

    // Show the terminal so the user can see output as it starts, and wait
    // for the pty to actually exist before typing the compile/run command —
    // otherwise build output and the run command are dropped ("Terminal not
    // started") and Run appears to do nothing.
    terminalRef.current?.show();
    await terminalRef.current?.ensureStarted();

    let tabToRun = activeTab;
    if (!tabToRun.path) {
      const shouldSave = window.confirm(
        'This file must be saved before it can run. Save it now?'
      );
      if (!shouldSave) return;

      const savedTab = await saveFileAs(loadDirectory);
      if (!savedTab) return;
      tabToRun = savedTab;
    }

    if (tabToRun.code !== tabToRun.savedCode) {
      const savedTab = await saveFile(loadDirectory);
      if (!savedTab) return;
      tabToRun = savedTab;
    }

    if (isPythonFile(tabToRun.name)) {
      /* Python support — run via terminal */
      setActivityState('running');
      try {
        // Python runs through the backend command (path passed as argv, no
      // shell interpolation), so a filename with `"`, `$()`, backticks or
      // `;` can never escape into a shell string.
      await CompileService.runPython(tabToRun.path!);
      } catch {
        alert('Failed to run Python file. Ensure python3 is in PATH.');
      }
      setActivityState('idle');
      return;
    }

    setActivityState('compiling');
    try {
      await CompileService.compileAndRun(tabToRun.code, tabToRun.path!, cStandard, runConfig, currentDir);
      setActivityState('running');
    } catch (error) {
      console.error('[RUN] compileAndRun error:', error);
      alert(`Failed to run: ${error}`);
      setActivityState('idle');
    }
  };

  const buildCode = async () => {
    if (!activeTab) return;
    // Show the terminal so build output / diagnostics can be reviewed.
    terminalRef.current?.show();

    let tabToBuild = activeTab;
    if (!tabToBuild.path) {
      const shouldSave = window.confirm(
        'This file must be saved before it can build. Save it now?'
      );
      if (!shouldSave) return;
      const savedTab = await saveFileAs(loadDirectory);
      if (!savedTab) return;
      tabToBuild = savedTab;
    } else if (tabToBuild.code !== tabToBuild.savedCode) {
      const savedTab = await saveFile(loadDirectory);
      if (!savedTab) return;
      tabToBuild = savedTab;
    }

    setActivityState('building');
    try {
      await CompileService.build(tabToBuild.code, tabToBuild.path!, cStandard, currentDir);
    } catch (error) {
      alert(`Failed to build: ${error}`);
    }
    setActivityState('idle');
  };

  const formatCode = async () => {
    if (!activeTab) {
      alert('Open a C file before formatting.');
      return;
    }

    setActivityState('formatting');

    try {
      const formattedCode = await FormatService.format(
        activeTab.code,
        activeTab.name
      );

      updateActiveCode(formattedCode);
    } catch (error) {
      alert(`Failed to format: ${error}`);
    }

    setActivityState('idle');
  };

  useEffect(() => {
    const handleRunFinished = () => setActivityState('idle');
    window.addEventListener(RUN_FINISHED_EVENT, handleRunFinished);
    return () => window.removeEventListener(RUN_FINISHED_EVENT, handleRunFinished);
  }, []);

  
  const tabsRef = useRef(tabs);
  useEffect(() => {
    tabsRef.current = tabs;
  }, [tabs]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    (async () => {
      unlisten = await listen('quit-requested', async () => {
        const hasUnsaved = hasUnsavedWork(tabsRef.current);

        if (!hasUnsaved) {
          await invoke('confirm_quit');
          return;
        }

        const confirmed = window.confirm(
          'You have unsaved changes. Quit anyway?'
        );
        if (confirmed) {
          await invoke('confirm_quit');
        }
      });
    })();

    return () => {
      unlisten?.();
    };
  }, []);

  /* Toggle Zen Mode */
  const toggleZenMode = () => {
    setZenMode((v) => !v);
    setPresentationMode(false);
  };

  /* Toggle Presentation Mode */
  const togglePresentationMode = () => {
    setPresentationMode((v) => !v);
    setZenMode(false);
  };

  /* Toggle Split Editor View: splits into independent multi-panes. */
  const toggleSplitView = () => {
    setPanes((prev) => {
      if (prev.length <= 1) {
        // Classic / single -> split into 2 panes:
        // Pane 1 keeps the active tab, pane 2 starts with another open tab or empty.
        const currentTabId = activeTabId ?? tabs[0]?.id ?? null;
        const otherTab = tabs.find((t) => t.id !== currentTabId);
        const p1: PaneState = { id: 1, tabId: currentTabId };
        const p2: PaneState = { id: 2, tabId: otherTab?.id ?? null };
        setActivePaneId(2);
        if (otherTab) {
          setActiveTabId(otherTab.id);
        }
        return [p1, p2];
      }
      // Split -> un-split the focused pane to return to classic single-editor
      const target = prev.find((p) => p.id === activePaneId) ?? prev[0];
      const remaining = prev.find((p) => p.id !== target.id) ?? prev[0];
      if (remaining?.tabId) {
        setActiveTabId(remaining.tabId);
      } else if (target.tabId) {
        setActiveTabId(target.tabId);
      }
      setActivePaneId(1);
      return [];
    });
  };

  /** Close a pane. Closing one of 2 panes returns to classic single-editor layout. */
  const closePane = (paneId: number) => {
    setPanes((prev) => {
      if (prev.length <= 2) {
        const remaining = prev.find((p) => p.id !== paneId);
        if (remaining?.tabId) {
          setActiveTabId(remaining.tabId);
        }
        setActivePaneId(1);
        return [];
      }
      const rest = prev.filter((p) => p.id !== paneId);
      if (!rest.some((p) => p.id === activePaneId)) {
        setActivePaneId(rest[0].id);
        if (rest[0].tabId) setActiveTabId(rest[0].tabId);
      }
      return rest;
    });
  };

  /** Focus a pane and activate its tab */
  const handleFocusPane = (paneId: number) => {
    setActivePaneId(paneId);
    const pane = panes.find((p) => p.id === paneId);
    if (pane?.tabId) {
      setActiveTabId(pane.tabId);
    }
  };

  /** Select a tab from the shared TabBar */
  const handleSelectTab = (id: string) => {
    setActiveTabId(id);
    if (panes.length > 1) {
      const existing = panes.find((p) => p.tabId === id);
      if (existing) {
        setActivePaneId(existing.id);
      } else {
        setPanes((prev) =>
          prev.map((p) => (p.id === activePaneId ? { ...p, tabId: id } : p))
        );
      }
    }
  };

  /** Close a tab */
  const handleCloseTab = (id: string) => {
    closeTab(id);
    if (panes.length > 1) {
      setPanes((prev) =>
        prev.map((p) => (p.tabId === id ? { ...p, tabId: null } : p))
      );
    }
  };

  /** Open a file via dialog in a specific pane */
  const handleOpenFileInPane = async (paneId: number) => {
    setActivePaneId(paneId);
    const file = await openFileDialog();
    if (!file) return;
    await openFile(file);
    setPanes((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((p) => (p.id === paneId ? { ...p, tabId: file } : p));
    });
  };

  /** Drop a tab onto a pane */
  const handlePaneDrop = (paneId: number, tabId?: string) => {
    if (!tabId) return;
    setActivePaneId(paneId);
    setActiveTabId(tabId);
    setPanes((prev) => {
      if (prev.length === 0) return prev;
      return prev.map((p) => (p.id === paneId ? { ...p, tabId } : p));
    });
  };

  /** Helper to get active Editor handle */
  const getActiveEditor = () =>
    (panes.length > 1 ? paneRefs.current[activePaneId] : editorRef.current) ??
    editorRef.current ??
    Object.values(paneRefs.current)[0] ??
    null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quickOpenVisible) return;

      const target = e.target as HTMLElement | null;
      const isDialogInput =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target?.isContentEditable && !target.classList.contains('cm-content'));
      if (isDialogInput) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (e.ctrlKey && key === 'tab') {
        e.preventDefault();
        if (tabs.length === 0) return;
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId);
        const direction = e.shiftKey ? -1 : 1;
        const nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
        setActiveTabId(tabs[nextIndex].id);
        return;
      }

      /* Zen Mode: Ctrl+K Z */
      if (mod && key === 'k') {
        e.preventDefault();
        const handleZ = (e2: KeyboardEvent) => {
          if (e2.key.toLowerCase() === 'z') {
            e2.preventDefault();
            toggleZenMode();
          }
          window.removeEventListener('keydown', handleZ);
        };
        window.addEventListener('keydown', handleZ);
        return;
      }

      /* Escape exits Zen/Presentation mode */
      if (key === 'escape' && (zenMode || presentationMode)) {
        setZenMode(false);
        setPresentationMode(false);
        return;
      }

      if (mod && e.altKey && key === 's') {
        e.preventDefault();
        setScreenshotModalVisible(true);
        return;
      }
      if (mod && e.altKey && key === 'r') {
        e.preventDefault();
        setReportModalVisible(true);
        return;
      }
      if (mod && e.shiftKey && key === 's') {
        e.preventDefault();
        handleSaveAs();
        return;
      }
      /* Search & Replace in Workspace: Ctrl+Shift+F (standard convention) */
      if (mod && e.shiftKey && !e.altKey && key === 'f') {
        e.preventDefault();
        setSearchModalVisible(true);
        return;
      }
      /* Format code: Ctrl+Shift+Alt+F (Ctrl+Alt+F / Ctrl+Shift+F are search) */
      if (mod && e.shiftKey && e.altKey && key === 'f') {
        e.preventDefault();
        formatCode();
        return;
      }
      if (mod && e.altKey && key === 'f') {
        e.preventDefault();
        setSearchModalVisible(true);
        return;
      }
      if (mod && key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
      if (mod && key === 'enter') {
        e.preventDefault();
        e.stopPropagation();
        runCode();
        return;
      }
      if (mod && key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
        return;
      }
      if (mod && key === 'n') {
        e.preventDefault();
        newFile();
        return;
      }
      if (mod && e.shiftKey && key === 'o') {
        e.preventDefault();
        e.stopPropagation();
        getActiveEditor()?.openSymbolPicker();
        return;
      }
      if (mod && !e.shiftKey && key === 'o') {
        e.preventDefault();
        handleOpenFolder();
        return;
      }
      /* Focus pane by index: Ctrl+1 / Ctrl+2 */
      if (mod && (key === '1' || key === '2')) {
        e.preventDefault();
        const targetId = key === '1' ? 1 : 2;
        if (panes.length > 1) {
          handleFocusPane(targetId);
        } else if (key === '2') {
          toggleSplitView();
        }
        return;
      }
      if (mod && e.shiftKey && key === 'p') {
        e.preventDefault();
        setCommandPaletteVisible((v) => !v);
        return;
      }
      if (mod && !e.shiftKey && key === 'p') {
        e.preventDefault();
        setQuickOpenVisible((v) => !v);
        return;
      }
      if (mod && key === ',') {
        e.preventDefault();
        setSettingsModalVisible(true);
        return;
      }
      if (mod && key === '/') {
        e.preventDefault();
        e.stopPropagation();
        getActiveEditor()?.toggleComment();
        return;
      }
      /* Toggle Terminal: Ctrl+` */
      if (mod && key === '`') {
        e.preventDefault();
        terminalRef.current?.toggle();
        return;
      }
      /* Toggle line bookmark: Ctrl+F2 */
      if (mod && key === 'f2') {
        e.preventDefault();
        getActiveEditor()?.toggleBookmark();
        return;
      }
      /* Jump to next bookmark: F2 */
      if (!mod && key === 'f2') {
        e.preventDefault();
        getActiveEditor()?.nextBookmark();
        return;
      }
      /* Help / Shortcuts: Ctrl+Shift+H — opens the same shortcuts list the
         status-bar "?" opens (the command palette doubles as the help panel). */
      if (mod && e.shiftKey && key === 'h') {
        e.preventDefault();
        setCommandPaletteVisible(true);
        return;
      }
    };
    // Capture before CodeMirror receives the event: Run must never insert a
    // newline, and comment/symbol shortcuts must have one owner only.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [tabs, activeTab, activeTabId, quickOpenVisible, zenMode, presentationMode, panes, activePaneId]);

  const handleSelectDiagnostic = (diag: { file: string; line: number; col: number }) => {
    // diag.file may be a full path (normal gcc lines) or a bare word
    // (linker/collect2 lines, line=0) — match by exact path, then basename.
    const diagBase = diag.file.split(/[/\\]/).pop();
    const matchingTab = tabs.find(
      (t) => t.path === diag.file || (diagBase && t.name === diagBase)
    );
    if (matchingTab) {
      setActiveTabId(matchingTab.id);
      // Jump in the pane that shows the file (fallback: active pane).
      const pane = panes.find((p) => p.tabId === matchingTab.id);
      if (pane) {
        setActivePaneId(pane.id);
      }
    }
    setTimeout(() => {
      getActiveEditor()?.jumpToPosition(diag.line, diag.col);
    }, 50);
  };

  const handleInsertSnippet = (text: string) => {
    getActiveEditor()?.insertText(text);
  };

  const commandActions: CommandAction[] = [
    { id: 'run', label: '▶ Run Code', category: 'Build', shortcut: 'Ctrl+Enter', perform: runCode },
    { id: 'build', label: '🔨 Build Only', category: 'Build', perform: buildCode },
    { id: 'format', label: '✨ Format Code', category: 'Edit', shortcut: 'Ctrl+Shift+Alt+F', perform: formatCode },
    { id: 'save', label: '💾 Save File', category: 'File', shortcut: 'Ctrl+S', perform: handleSave },
    { id: 'new', label: '📝 New File', category: 'File', shortcut: 'Ctrl+N', perform: newFile },
    { id: 'open-folder', label: '📁 Open Folder', category: 'File', shortcut: 'Ctrl+O', perform: handleOpenFolder },
    { id: 'open-file', label: '📄 Open File', category: 'File', perform: handleOpenFile },
    { id: 'snapshot', label: '📸 Code Snapshot', category: 'Tools', shortcut: 'Ctrl+Alt+S', perform: () => setScreenshotModalVisible(true) },
    { id: 'report', label: '📄 Lab Report', category: 'Tools', shortcut: 'Ctrl+Alt+R', perform: () => setReportModalVisible(true) },
    { id: 'settings', label: '⚙️ Preferences', category: 'General', shortcut: 'Ctrl+,', perform: () => setSettingsModalVisible(true) },
    { id: 'toggle-comment', label: '💬 Toggle Line Comment', category: 'Edit', shortcut: 'Ctrl+/', perform: () => getActiveEditor()?.toggleComment() },
    { id: 'toggle-block-comment', label: '💬 Toggle Block Comment', category: 'Edit', shortcut: 'Shift+Alt+A', perform: () => getActiveEditor()?.toggleBlockComment() },
    { id: 'search-files', label: '🔍 Search & Replace in Workspace', category: 'Navigation', shortcut: 'Ctrl+Shift+F', perform: () => setSearchModalVisible(true) },
    { id: 'clean-build', label: '🧹 Clean Build Artifacts', category: 'Build', perform: () => CompileService.cleanBuild() },
    { id: 'rebuild', label: '🔄 Rebuild Workspace', category: 'Build', perform: buildCode },
    { id: 'toggle-bookmark', label: '🔖 Toggle Line Bookmark', category: 'Navigation', shortcut: 'Ctrl+F2', perform: () => getActiveEditor()?.toggleBookmark() },
    { id: 'next-bookmark', label: '🔖 Jump to Next Bookmark', category: 'Navigation', shortcut: 'F2', perform: () => getActiveEditor()?.nextBookmark() },
    { id: 'zen-mode', label: '🧘 Zen Mode', category: 'View', shortcut: 'Ctrl+K Z', perform: toggleZenMode },
    { id: 'presentation-mode', label: '🎬 Presentation Mode', category: 'View', perform: togglePresentationMode },
    { id: 'split-editor', label: '🪟 Toggle Split Editor', category: 'View', perform: toggleSplitView },
    { id: 'focus-pane-1', label: '🪟 Focus Editor Pane 1', category: 'View', shortcut: 'Ctrl+1', perform: () => handleFocusPane(1) },
    { id: 'focus-pane-2', label: '🪟 Focus Editor Pane 2', category: 'View', shortcut: 'Ctrl+2', perform: () => (panes.length > 1 ? handleFocusPane(2) : toggleSplitView()) },
    { id: 'snippets', label: '✂️ Insert Snippet', category: 'Edit', perform: () => setSnippetsModalVisible(true) },
    { id: 'help-shortcuts', label: '❓ Keyboard Shortcuts & Help', category: 'General', shortcut: 'Ctrl+Shift+H', perform: () => setCommandPaletteVisible(true) },
  ];

  const appClassName = [
    'app retro-theme',
    zenMode ? 'zen-mode' : '',
    presentationMode ? 'presentation-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      {(zenMode || presentationMode) && (
        <div
          style={{
            position: 'fixed',
            top: '12px',
            right: '16px',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--bg-panel)',
            border: '1px solid var(--border)',
            borderRadius: '20px',
            padding: '4px 12px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
            fontSize: '12px',
            color: 'var(--text-secondary)',
            backdropFilter: 'blur(8px)',
          }}
        >
          <span>
            {zenMode ? '🧘 Zen Mode' : '🎬 Presentation Mode'}
            <span style={{ opacity: 0.6, marginLeft: '6px' }}>(Esc)</span>
          </span>
          <button
            onClick={() => {
              setZenMode(false);
              setPresentationMode(false);
            }}
            title="Exit to normal view (Esc)"
            style={{
              background: 'var(--accent)',
              color: '#0d0e11',
              border: 'none',
              borderRadius: '12px',
              padding: '2px 8px',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'filter 0.12s, transform 0.1s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.15)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'none';
              e.currentTarget.style.transform = 'none';
            }}
          >
            Exit
          </button>
        </div>
      )}

      <div className={appClassName}>
      <div className="titlebar">
        <span className="logo">
          <Logo size={20} /> C-SHELL
        </span>
        <span className="subtitle">v0.6.0-2 — Professional Edition</span>
      </div>

      {hasCrashBackup && (
        <div
          className="crash-recovery-banner"
          style={{
            background: "var(--accent)",
            color: "#fff",
            padding: "8px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          <span>
            ⚠️ Unsaved changes from a previous session were found. Would you like
            to restore them?
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              className="action-btn primary"
              onClick={restoreCrashBackup}
              style={{ padding: "4px 12px", fontSize: "12px" }}
            >
              Restore
            </button>
            <button
              className="action-btn secondary"
              onClick={async () => {
                const err = await exportCrashBackup();
                if (err) alert(err);
              }}
              style={{ padding: "4px 12px", fontSize: "12px" }}
            >
              Export…
            </button>
            <button
              className="action-btn secondary"
              onClick={async () => {
                const err = await importCrashBackup();
                if (err) alert(err);
              }}
              style={{ padding: "4px 12px", fontSize: "12px" }}
            >
              Import…
            </button>
            <button
              className="action-btn secondary"
              onClick={dismissCrashBackup}
              style={{ padding: "4px 12px", fontSize: "12px" }}
            >
              Discard
            </button>
          </div>
        </div>
      )}

      <div className="main-container">
        <FileTree
          files={files}
          currentFile={activeTab?.path ?? null}
          currentDir={currentDir}
          refreshKey={refreshKey}
          onFileSelect={openFile}
          onNewFile={newFile}
          onOpenFolder={handleOpenFolder}
          onRefresh={refresh}
          onDeleteNode={handleDelete}
          onRenameNode={handleRename}
          onNewFolder={createFolder}
          onNewFileInFolder={handleNewFileInFolder}
          onCloseFolder={handleCloseFolder}
        />

        <div className="editor-panel">
          {settings.showToolbar !== false && (
            <Toolbar
              onRun={runCode}
              onOpenRunConfig={() => setRunConfigOpen(true)}
              onBuild={buildCode}
              onFormat={formatCode}
              onScreenshot={() => setScreenshotModalVisible(true)}
              onReport={() => setReportModalVisible(true)}
              onSave={handleSave}
              onNew={newFile}
              onOpenFolder={handleOpenFolder}
              onOpenFile={handleOpenFile}
              onOpenSettings={() => setSettingsModalVisible(true)}
              onToggleTerminal={() => terminalRef.current?.toggle()}
              onToggleSplitView={toggleSplitView}
              isSplitView={panes.length > 1}
              activityState={activityState}
              standard={cStandard}
              onStandardChange={(s) => setCStandard(s.toLowerCase())}
            />
          )}

          <div className="editor-wrapper">
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelect={handleSelectTab}
              onClose={handleCloseTab}
              onReorder={reorderTabs}
            />

            {panes.length > 1 ? (
              <PanesContainer
                ref={paneRefs}
                panes={panes}
                tabsById={tabsById}
                activePaneId={activePaneId}
                onFocusPane={handleFocusPane}
                onClosePane={closePane}
                onOpenFileInPane={handleOpenFileInPane}
                onPaneDrop={handlePaneDrop}
                onChangeCode={updateTabCode}
                onCursorChange={setCursorPos}
              />
            ) : activeTab ? (
              <Editor
                ref={editorRef}
                code={activeTab.code}
                fileName={activeTab.name}
                onChange={updateActiveCode}
                onCursorChange={setCursorPos}
              />
            ) : (
              <WelcomeScreen
                onNewFile={newFile}
                onOpenFolder={handleOpenFolder}
                onOpenFile={handleOpenFile}
                onOpenRecent={loadDirectory}
                onOpenFileByPath={openFile}
                onOpenExample={openExample}
              />
            )}
          </div>

          <TerminalPanel ref={terminalRef} onSelectDiagnostic={handleSelectDiagnostic} />
        </div>
      </div>

      {settings.showStatusBar !== false && (
        <div className="statusbar">
          <span className="status-item">
            📄 {activeTab?.path || 'No file'}
          </span>
          <span className="status-item status-sep">|</span>
          <span className="status-item">{currentDir || 'No folder'}</span>
          <span className="statusbar-right">
            <span className="status-item">
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
            <span className="status-sep">|</span>
            <span className="status-item">UTF-8</span>
            <span className="status-sep">|</span>
            <span className="status-item">
              {activityState === 'idle'
                ? '• Ready'
                : activityState === 'compiling'
                ? '• Compiling'
                : activityState === 'building'
                ? '• Building'
                : activityState === 'formatting'
                ? '• Formatting'
                : '• Running'}
            </span>
            <span className="status-sep">|</span>
            <span className="status-item">
              {activeTab && isPythonFile(activeTab.name)
                ? 'Python'
                : `gcc • ${cStandard.toUpperCase()}`}
            </span>
            <span className="status-sep">|</span>
            <span
              className="status-item status-help"
              title="Keyboard shortcuts &amp; help (Ctrl+Shift+H)"
              onClick={() => setCommandPaletteVisible(true)}
            >
              ?
            </span>
          </span>
        </div>
      )}

      {quickOpenVisible && (
        <QuickOpen
          files={files}
          onSelect={openFile}
          onClose={() => setQuickOpenVisible(false)}
        />
      )}

      {screenshotModalVisible && activeTab && (
        <ScreenshotModal
          code={activeTab.code}
          fileName={activeTab.name || 'main.c'}
          onClose={() => setScreenshotModalVisible(false)}
        />
      )}

      {reportModalVisible && (
        <LabReportModal
          code={activeTab?.code || ''}
          fileName={activeTab?.name || 'main.c'}
          terminalOutput={terminalRef.current?.getTerminalBuffer() || ''}
          onClose={() => setReportModalVisible(false)}
        />
      )}

      {settingsModalVisible && (
        <SettingsModal onClose={() => setSettingsModalVisible(false)} />
      )}

      {commandPaletteVisible && (
        <CommandPalette
          actions={commandActions}
          onClose={() => setCommandPaletteVisible(false)}
        />
      )}

      {searchModalVisible && (
        <SearchInFilesModal
          files={files}
          onSelectFile={openFile}
          onClose={() => setSearchModalVisible(false)}
        />
      )}

      {snippetsModalVisible && (
        <SnippetsModal
          onInsert={handleInsertSnippet}
          onClose={() => setSnippetsModalVisible(false)}
        />
      )}

      {runConfigOpen && (
        <RunConfigModal
          config={runConfig}
          onSave={setRunConfig}
          onClose={() => setRunConfigOpen(false)}
        />
      )}
      </div>
    </>
  );
}

export default App;
