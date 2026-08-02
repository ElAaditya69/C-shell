import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { CompileService } from './services/CompileService';
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
import { useTabs } from './hooks/useTabs';
import { useFileExplorer } from './hooks/useFileExplorer';
import { useSettings } from './context/SettingsContext';
import './App.css';

function App() {
  const [activityState, setActivityState] = useState<ActivityState>('idle');
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const [commandPaletteVisible, setCommandPaletteVisible] = useState(false);
  const [screenshotModalVisible, setScreenshotModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const { settings } = useSettings();
  const editorRef = useRef<EditorHandle>(null);
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
    if (isRestoredRef.current) return;
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
        isRestoredRef.current = true;
      } catch {
        // Stay clean if loading fails
      }
    })();
  }, [loadDirectory, settings.lastDir, settings.openTabs]);

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
    saveFile(loadDirectory);
  };

  const handleSaveAs = () => {
    saveFileAs(loadDirectory);
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

  const runCode = async () => {
    if (!activeTab || !activeTab.path) {
      alert('Please save the file first!');
      return;
    }

    setActivityState('compiling');
    try {
      await CompileService.compileAndRun(activeTab.code, activeTab.path);
      setActivityState('running');
    } catch (error) {
      alert(`Failed to run: ${error}`);
      setActivityState('idle');
    }
  };

  const buildCode = async () => {
    if (!activeTab || !activeTab.path) {
      alert('Please save the file first!');
      return;
    }

    setActivityState('building');
    try {
      await CompileService.build(activeTab.code, activeTab.path);
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quickOpenVisible) return;

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
      if (mod && key === 'o') {
        e.preventDefault();
        handleOpenFolder();
        return;
      }
      if (mod && e.shiftKey && key === 'p') {
        e.preventDefault();
        setCommandPaletteVisible((v) => !v);
        return;
      }
      if (mod && key === 'p') {
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
        editorRef.current?.toggleComment();
        return;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTab, activeTabId, quickOpenVisible]);

  const handleSelectDiagnostic = (diag: { file: string; line: number; col: number }) => {
    const matchingTab = tabs.find((t) => t.name === diag.file || t.path?.endsWith(diag.file));
    if (matchingTab) {
      setActiveTabId(matchingTab.id);
    }
    setTimeout(() => {
      editorRef.current?.jumpToPosition(diag.line, diag.col);
    }, 50);
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
    { id: 'toggle-comment', label: '💬 Toggle Comment', category: 'Edit', shortcut: 'Ctrl+/', perform: () => editorRef.current?.toggleComment() },
  ];

  return (
    <div className="app retro-theme">
      <div className="titlebar">
        <span className="logo">⚡ C-SHELL</span>
        <span className="subtitle">v0.3.0 — Professional Edition</span>
      </div>

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
            activityState={activityState}
            currentFile={activeTab?.path ?? null}
          />

          <div className="editor-wrapper">
            <TabBar
              tabs={tabs}
              activeTabId={activeTabId}
              onSelect={setActiveTabId}
              onClose={closeTab}
            />

            {activeTab ? (
              <Editor
                ref={editorRef}
                code={activeTab.code}
                onChange={updateActiveCode}
              />
            ) : (
              <WelcomeScreen
                onNewFile={newFile}
                onOpenFolder={handleOpenFolder}
                onOpenFile={handleOpenFile}
                onOpenRecent={loadDirectory}
              />
            )}
          </div>

          <TerminalPanel ref={terminalRef} onSelectDiagnostic={handleSelectDiagnostic} />
        </div>
      </div>

      <div className="statusbar">
        <span>📁 {activeTab?.path || 'No file'}</span>
        <span>{currentDir || 'No folder'}</span>
        <span>Ln 1, Col 1</span>
        <span>UTF-8</span>
        <span>
          {activityState === 'idle'
            ? '🟢 Ready'
            : activityState === 'compiling'
            ? '🟡 Compiling'
            : activityState === 'building'
            ? '🟡 Building'
            : activityState === 'formatting'
            ? '🟡 Formatting'
            : '🟡 Running'}
        </span>
        <span>gcc • C99</span>
      </div>

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
    </div>
  );
}

export default App;
