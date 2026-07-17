import { useState, useEffect, useCallback } from 'react';
import { FileService } from './services/FileService';
import { CompileService } from './services/CompileService';
import { Editor } from './components/editor/Editor';
import { Terminal } from './components/terminal/Terminal';
import { Toolbar } from './components/toolbar/Toolbar';
import { FileTree } from './components/sidebar/FileTree';
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
      const fileList = await FileService.listDirectory(dir);
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
  alert("openFile() called!");

  console.log(path);

  try {
    const content = await FileService.readFile(path);

    alert("File read successfully!");

    setCode(content);
    setCurrentFile(path);

    setOutput(prev => prev + `\nOpened: ${path}\n`);
  } catch (e) {
    alert(`ERROR:\n${e}`);
    console.error(e);
  }
};

const saveFile = async () => {
    try {
      let filePath = currentFile;

      if (!filePath) {
        filePath = await FileService.saveDialog();

        if (!filePath) {
          setOutput(prev => prev + "\n❌ Save cancelled.\n");
          return;
        }

        await FileService.createFile(filePath);
        setCurrentFile(filePath);
      }

      await FileService.writeFile(filePath, code);

      setOutput(prev => prev + "\n💾 File saved!\n");

      loadDirectory(filePath.substring(0, filePath.lastIndexOf("/")));
    } catch (e) {
      setOutput(prev => prev + `\nError saving: ${e}\n`);
    }
  };

  const newFile = async () => {
    setCode(`#include <stdio.h>

int main() {
    printf("Hello, World!\n");
    return 0;
}
`);

    setCurrentFile(null);

    setOutput(prev =>
      prev + "\n📝 New untitled file created.\n"
    );
  };

  const openFolder = async () => {
  try {
    const folder = await FileService.openFolder();

    if (!folder) {
      setOutput(prev => prev + "\n📁 Folder selection cancelled.\n");
      return;
    }

    setCurrentDir(folder);

    await loadDirectory(folder);

    setOutput(prev =>
      prev + `\n📂 Opened folder: ${folder}\n`
    );
  } catch (e) {
    setOutput(prev => prev + `\n❌ ${e}\n`);
  }
};

 


  const openSingleFile = async () => {
    try {
      const file = await FileService.openFileDialog();

      if (!file) {
        setOutput(prev => prev + "\n📄 Open cancelled.\n");
        return;
      }

      await openFile(file);

      const dir = file.substring(0, file.lastIndexOf("/"));
      await loadDirectory(dir);
      setCurrentDir(dir);

      setOutput(prev => prev + `\n📄 Opened: ${file}\n`);
    } catch (e) {
      setOutput(prev => prev + `\n❌ ${e}\n`);
    }
  };

  const deleteFile = async (path: string) => {

    if (confirm(`Delete ${path.split('/').pop()}?`)) {
      try {
        await FileService.deleteFile(path);
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
    setOutput(prev => prev + "\n❌ Please save the file first!\n");
    return;
  }

  setIsRunning(true);

  try {
    const result = await CompileService.compileAndRun(code, currentFile);
    setOutput(result);
  } catch (error) {
    setOutput(`❌ ${error}`);
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
  onOpenFile={openSingleFile}
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
