import { useEffect, useRef, useState } from 'react';
import { CompileService } from './services/CompileService';
import { Editor, EditorHandle } from './components/editor/Editor';
import { TabBar } from './components/editor/TabBar';
import { QuickOpen } from './components/editor/QuickOpen';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { Toolbar } from './components/toolbar/Toolbar';
import { FileTree } from './components/sidebar/FileTree';
import { useTabs } from './hooks/useTabs';
import { useFileExplorer } from './hooks/useFileExplorer';
import './App.css';

function App() {
  const [isRunning, setIsRunning] = useState(false);
  const [quickOpenVisible, setQuickOpenVisible] = useState(false);
  const editorRef = useRef<EditorHandle>(null);

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
  } = useTabs();

  const { files, currentDir, loadDirectory, openFolder, openFileDialog, deleteFile } =
    useFileExplorer();

  useEffect(() => {
    loadDirectory('/Users/mac/Desktop');
  }, [loadDirectory]);

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

  const handleDelete = async (path: string) => {
    const deleted = await deleteFile(path);
    if (deleted) removeTabForPath(path);
  };

  const runCode = async () => {
    if (!activeTab || !activeTab.path) {
      alert('Please save the file first!');
      return;
    }

    setIsRunning(true);
    try {
      await CompileService.compileAndRun(activeTab.code, activeTab.path);
    } catch (error) {
      alert(`Failed to run: ${error}`);
    }
    setIsRunning(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (quickOpenVisible) return;

      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      if (mod && e.shiftKey && key === 's') {
        e.preventDefault();
        handleSaveAs();
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
      if (mod && key === 'p') {
        e.preventDefault();
        setQuickOpenVisible((v) => !v);
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
  }, [activeTab, activeTabId, quickOpenVisible]);

  return (
    <div className="app retro-theme">
      <div className="titlebar">
        <span className="logo">⚡ C-SHELL</span>
        <span className="subtitle">v0.2.0 — Professional Edition</span>
      </div>

      <div className="main-container">
        <FileTree
          files={files}
          currentFile={activeTab?.path ?? null}
          currentDir={currentDir}
          onFileSelect={openFile}
          onNewFile={newFile}
          onOpenFolder={handleOpenFolder}
          onDeleteFile={handleDelete}
        />

        <div className="editor-panel">
          <Toolbar
            onRun={runCode}
            onSave={handleSave}
            onNew={newFile}
            onOpenFolder={handleOpenFolder}
            onOpenFile={handleOpenFile}
            isRunning={isRunning}
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
              <div className="editor-empty-state">
                <p>No file open</p>
                <p>Click "New" to create a file or "Open File" to browse.</p>
              </div>
            )}
          </div>

          <TerminalPanel />
        </div>
      </div>

      <div className="statusbar">
        <span>📁 {activeTab?.path || 'No file'}</span>
        <span>{currentDir || 'No folder'}</span>
        <span>{isRunning ? '🟡 Running' : '🟢 Ready'}</span>
        <span>C99 Standard</span>
      </div>

      {quickOpenVisible && (
        <QuickOpen
          files={files}
          onSelect={openFile}
          onClose={() => setQuickOpenVisible(false)}
        />
      )}
    </div>
  );
}

export default App;
