import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CompileService } from './services/CompileService';
import { FileService } from './services/FileService';
import { FormatService } from './services/FormatService';
import { Editor, EditorHandle } from './components/editor/Editor';
import { TabBar } from './components/editor/TabBar';
import { QuickOpen } from './components/editor/QuickOpen';
import { WelcomeScreen } from './components/common/WelcomeScreen';
import { TerminalPanel, TerminalPanelHandle } from './components/terminal/TerminalPanel';
import { RUN_FINISHED_EVENT } from './components/terminal/XTermView';
import { Toolbar, ActivityState } from './components/toolbar/Toolbar';
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
  const [splitView, setSplitView] = useState(false);
  const [cStandard, setCStandard] = useState("c99");
  const [cursorPos, setCursorPos] = useState<{ line: number; col: number }>({
    line: 1,
    col: 1,
  });
  const { settings, isSettingsLoaded } = useSettings();
  const editorRef = useRef<EditorHandle>(null);
  const splitEditorRef = useRef<EditorHandle>(null);
  const terminalRef = useRef<TerminalPanelHandle>(null);

  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    openFile,
    newFile,
    updateActiveCode,
    saveFile,
    saveFileAs,
    closeTab,
    removeTabForPath,
    renameTabForPath,
    hasCrashBackup,
    restoreCrashBackup,
    dismissCrashBackup,
  } = useTabs();

  const {
    files,
    currentDir,
    refreshKey,
    loadDirectory,
    refresh,
    openFolder,
    openFileDialog,
    deleteFile,
    createFolder,
    createFileInFolder,
    renamePath,
  } = useFileExplorer();

  const isRestoredRef = useRef(false);

  useEffect(() => {
    if (!isSettingsLoaded || isRestoredRef.current) return;
    // Mark this before awaiting directory/file reads. Those reads update settings
    // and re-render the app; without this guard restoration can start twice.
    isRestoredRef.current = true;
    (async () => {
      try {
        const targetDir =
          settings.lastDir || (await invoke<string>('get_home_dir'));
        if (targetDir) await loadDirectory(targetDir);

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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const hasUnsaved = tabs.some((t) => t.code !== t.savedCode);
      if (hasUnsaved) {
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

    // Show the terminal so the user can see output as it starts.
    terminalRef.current?.show();

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
        await FileService.sendCommand(`python3 "${tabToRun.path}"\n`);
      } catch {
        alert('Failed to run Python file. Ensure python3 is in PATH.');
      }
      setActivityState('idle');
      return;
    }

    setActivityState('compiling');
    try {
      await CompileService.compileAndRun(tabToRun.code, tabToRun.path!, cStandard);
      setActivityState('running');
    } catch (error) {
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
      await CompileService.build(tabToBuild.code, tabToBuild.path!, cStandard);
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
        const hasUnsaved = tabsRef.current.some((t) => t.code !== t.savedCode);

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

  /* Toggle Split Editor View */
  const toggleSplitView = () => {
    setSplitView((v) => !v);
  };

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
      if (mod && e.shiftKey && key === 'f') {
        e.preventDefault();
        formatCode();
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
        editorRef.current?.openSymbolPicker();
        return;
      }
      if (mod && !e.shiftKey && key === 'o') {
        e.preventDefault();
        handleOpenFolder();
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
        editorRef.current?.toggleComment();
        return;
      }
      /* Toggle Terminal: Ctrl+` */
      if (mod && key === '`') {
        e.preventDefault();
        terminalRef.current?.toggle();
        return;
      }
    };
    // Capture before CodeMirror receives the event: Run must never insert a
    // newline, and comment/symbol shortcuts must have one owner only.
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [tabs, activeTab, activeTabId, quickOpenVisible, zenMode, presentationMode]);

  const handleSelectDiagnostic = (diag: { file: string; line: number; col: number }) => {
    const matchingTab = tabs.find((t) => t.name === diag.file || t.path?.endsWith(diag.file));
    if (matchingTab) {
      setActiveTabId(matchingTab.id);
    }
    setTimeout(() => {
      editorRef.current?.jumpToPosition(diag.line, diag.col);
    }, 50);
  };

  const handleInsertSnippet = (text: string) => {
    editorRef.current?.insertText(text);
  };

  const commandActions: CommandAction[] = [
    { id: 'run', label: '▶ Run Code', category: 'Build', shortcut: 'Ctrl+Enter', perform: runCode },
    { id: 'build', label: '🔨 Build Only', category: 'Build', perform: buildCode },
    { id: 'format', label: '✨ Format Code', category: 'Edit', shortcut: 'Ctrl+Shift+F', perform: formatCode },
    { id: 'save', label: '💾 Save File', category: 'File', shortcut: 'Ctrl+S', perform: handleSave },
    { id: 'new', label: '📝 New File', category: 'File', shortcut: 'Ctrl+N', perform: newFile },
    { id: 'open-folder', label: '📁 Open Folder', category: 'File', shortcut: 'Ctrl+O', perform: handleOpenFolder },
    { id: 'open-file', label: '📄 Open File', category: 'File', perform: handleOpenFile },
    { id: 'snapshot', label: '📸 Code Snapshot', category: 'Tools', shortcut: 'Ctrl+Alt+S', perform: () => setScreenshotModalVisible(true) },
    { id: 'report', label: '📄 Lab Report', category: 'Tools', shortcut: 'Ctrl+Alt+R', perform: () => setReportModalVisible(true) },
    { id: 'settings', label: '⚙️ Preferences', category: 'General', shortcut: 'Ctrl+,', perform: () => setSettingsModalVisible(true) },
    { id: 'toggle-comment', label: '💬 Toggle Line Comment', category: 'Edit', shortcut: 'Ctrl+/', perform: () => editorRef.current?.toggleComment() },
    { id: 'toggle-block-comment', label: '💬 Toggle Block Comment', category: 'Edit', shortcut: 'Shift+Alt+A', perform: () => editorRef.current?.toggleBlockComment() },
    { id: 'search-files', label: '🔍 Search & Replace in Workspace', category: 'Navigation', shortcut: 'Ctrl+Shift+F', perform: () => setSearchModalVisible(true) },
    { id: 'clean-build', label: '🧹 Clean Build Artifacts', category: 'Build', perform: () => CompileService.cleanBuild() },
    { id: 'rebuild', label: '🔄 Rebuild Workspace', category: 'Build', perform: buildCode },
    { id: 'toggle-bookmark', label: '🔖 Toggle Line Bookmark', category: 'Navigation', shortcut: 'Ctrl+F2', perform: () => editorRef.current?.toggleBookmark() },
    { id: 'next-bookmark', label: '🔖 Jump to Next Bookmark', category: 'Navigation', shortcut: 'F2', perform: () => editorRef.current?.nextBookmark() },
    { id: 'zen-mode', label: '🧘 Zen Mode', category: 'View', shortcut: 'Ctrl+K Z', perform: toggleZenMode },
    { id: 'presentation-mode', label: '🎬 Presentation Mode', category: 'View', perform: togglePresentationMode },
    { id: 'split-editor', label: '🪟 Toggle Split Editor', category: 'View', perform: toggleSplitView },
    { id: 'snippets', label: '✂️ Insert Snippet', category: 'Edit', perform: () => setSnippetsModalVisible(true) },
  ];

  const appClassName = [
    'app retro-theme',
    zenMode ? 'zen-mode' : '',
    presentationMode ? 'presentation-mode' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={appClassName}>
      <div className="titlebar">
        <span className="logo">
          <Logo size={20} /> C-SHELL
        </span>
        <span className="subtitle">v0.6.0-1 — Professional Edition</span>
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
        />

        <div className="editor-panel">
          {settings.showToolbar !== false && (
            <Toolbar
              onRun={runCode}
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
              activityState={activityState}
              onStandardChange={(s) => setCStandard(s.toLowerCase())}
            />
          )}

          <div className="editor-wrapper">
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelect={setActiveTabId}
              onClose={closeTab}
            />

            {activeTab ? (
              splitView ? (
                <div className="split-editor-container">
                  <div className="split-pane">
                    <Editor
                      ref={editorRef}
                      code={activeTab.code}
                      fileName={activeTab.name}
                      onChange={updateActiveCode}
                      onCursorChange={setCursorPos}
                    />
                  </div>
                  <div className="split-divider" />
                  <div className="split-pane">
                    <Editor
                      ref={splitEditorRef}
                      code={activeTab.code}
                      fileName={activeTab.name}
                      onChange={updateActiveCode}
                    />
                  </div>
                </div>
              ) : (
                <Editor
                  ref={editorRef}
                  code={activeTab.code}
                  fileName={activeTab.name}
                  onChange={updateActiveCode}
                  onCursorChange={setCursorPos}
                />
              )
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
              title="Keyboard shortcuts &amp; help"
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
    </div>
  );
}

export default App;
