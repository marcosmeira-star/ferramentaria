const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let backendProc;

function backendPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'backend', 'backend.exe');
  }
  return null;
}

function startBackend() {
  const env = {
    ...process.env,
    HOST: '127.0.0.1',
    PORT: '8000',
    DATABASE_URL: `sqlite:///${path.join(app.getPath('userData'), 'ferramentaria.db').replace(/\\/g, '/')}`,
  };

  if (app.isPackaged) {
    backendProc = spawn(backendPath(), [], { env, windowsHide: true });
  } else {
    backendProc = spawn('python', ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'], {
      cwd: path.join(__dirname, '..', 'backend'),
      env,
      windowsHide: true,
    });
  }

  backendProc.on('error', (err) => {
    dialog.showErrorBox('Erro ao iniciar backend', String(err));
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1024,
    minHeight: 680,
    icon: path.join(__dirname, 'assets', 'app.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'frontend', 'index.html'));
}

app.on('second-instance', () => {
  const win = BrowserWindow.getAllWindows()[0];
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (backendProc && !backendProc.killed) backendProc.kill();
});
