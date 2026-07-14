import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { Editor } from './components/Editor';
import { Terminal } from './components/Terminal';
import { Toolbar } from './components/Toolbar';
import { FileTree } from './components/FileTree';
import './App.css';

function App() {
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('Welcome to C-Shell! Click "New" to create a file or "Open" to browse.\n');
  const [isRunning, setIsRunning] = useState(false);
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [files, setFiles] = useState<string[]>([]);
  const [currentDir, setCurrentDir] = useState('');

  const loadDirectory = useCallback(async (dir: string) => {
    try {
      const fileList = await invoke('list_directory', { path: dir });
      setFiles(fileList as string[]);
      setCurrentDir(dir);
    } catch (e) {
      console.error('Failed to load directory:', e);
      setOutput(prev => prev + `\nError loading directory: ${e}\n`);
    }
  }, []);

  useEffect(() => {
    loadDirectory('/Users/mac/Desktop');
  }, [loadDirectory]);

  const openFile = async (path: string) => {
    try {
      const content = await invoke('read_file', { path });
      setCode(content as string);
      setCurrentFile(path);
      setOutput(prev => prev + `\nOpened: ${path}\n`);
    } catch (e) {
      setOutput(prev => prev + `\nError reading file: ${e}\n`);
    }
  };

  const saveFile = async () => {
    if (!currentFile) {
      setOutput(prev => prev + '\nUse "New" to create a file first!\n');
      return;
    }
    try {
      await invoke('write_file', { path: currentFile, contents: code });
      setOutput(prev => prev + '\n💾 File saved!\n');
      loadDirectory(currentDir);
    } catch (e) {
      setOutput(prev => prev + `\nError saving: ${e}\n`);
    }
  };

  const newFile = async () => {
  console.log("NEW BUTTON CLICKED");
  alert("New button works!");

    
    const path = `/Users/mac/Desktop/${filename}`;
    try {
      await invoke('create_file', { path });
      setCode('#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}');
      setCurrentFile(path);
      loadDirectory(currentDir);
      setOutput(prev => prev + `\nCreated: ${path}\n`);
    } catch (e) {
      setOutput(prev => prev + `\nError creating file: ${e}\n`);
    }
  };

  const openFolder = async () => {
  console.log("OPEN BUTTON CLICKED");
  alert("Open button works!");

  };

  const deleteFile = async (path: string) => {
    if (confirm(`Delete ${path.split('/').pop()}?`)) {
      try {
        await invoke('delete_file', { path });
        if (currentFile === path) {
          setCurrentFile(null);
          setCode('');
        }
        loadDirectory(currentDir);
        setOutput(prev => prev + `\nDeleted: ${path}\n`);
      } catch (e) {
        setOutput(prev => prev + `\nError deleting: ${e}\n`);
      }
    }
  };

  const runCode = async () => {
    if (!currentFile) {
      setOutput(prev => prev + '\n❌ Please create/save a file first!\n');
      return;
    }
    
    setIsRunning(true);
    setOutput(prev => prev + '\nCompiling...\n');
    
    try {
      const filename = currentFile.split('/').pop() || 'main.c';
      const result = await invoke('compile_and_run', { 
        code, 
        filename 
      });
      setOutput(result as string);
    } catch (error) {
      setOutput(`Error: ${error}`);
    }
    
    setIsRunning(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveFile();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        runCode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [code, currentFile, currentDir]);

  return (
    <div className="app retro-theme">
      <div className="titlebar">
        <span className="logo">⚡ C-SHELL</span>
        <span className="subtitle">v0.2.0 — Professional Edition</span>
      </div>
      
      <div className="main-container">
        <FileTree 
          files={files}
          currentFile={currentFile}
          currentDir={currentDir}
          onFileSelect={openFile}
          onNewFile={newFile}
          onOpenFolder={openFolder}
          onDeleteFile={deleteFile}
        />
        
        <div className="editor-panel">
          <Toolbar 
            onRun={runCode} 
            onSave={saveFile}
            onNew={newFile}
            onOpenFolder={openFolder}
            isRunning={isRunning}
            currentFile={currentFile}
          />
          
          <div className="editor-wrapper">
            <div className="tab-bar">
              {currentFile ? (
                <div className="tab active">
                  {currentFile.split('/').pop()}
                </div>
              ) : (
                <div className="tab">No file open</div>
              )}
            </div>
            <Editor 
              code={code} 
              onChange={setCode}
            />
          </div>
          
          <Terminal output={output} />
        </div>
      </div>
      
      <div className="statusbar">
        <span>📁 {currentFile || 'No file'}</span>
        <span>{currentDir || 'No folder'}</span>
        <span>{isRunning ? '🟡 Running' : '🟢 Ready'}</span>
        <span>C99 Standard</span>
      </div>
    </div>
  );
}

export default App;