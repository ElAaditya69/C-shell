import { useEffect, useState } from 'react';
import { CompileService } from './services/CompileService';
import { Editor } from './components/editor/Editor';
import { TabBar } from './components/editor/TabBar';
import { TerminalPanel } from './components/terminal/TerminalPanel';
import { Toolbar } from './components/toolbar/Toolbar';
import { FileTree } from './components/sidebar/FileTree';
import { useTabs } from './hooks/useTabs';
import { useFileExplorer } from './hooks/useFileExplorer';
import './App.css';

function App() {
  const [isRunning, setIsRunning] = useState(false);

  const {
    tabs,
    activeTabId,
    activeTab,
    setActiveTabId,
    openFile,
    newFile,
    updateActiveCode,
    saveFile,
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
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId) closeTab(activeTabId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, activeTabId]);

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
              <Editor code={activeTab.code} onChange={updateActiveCode} />
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
    </div>
  );
}

export default App;
