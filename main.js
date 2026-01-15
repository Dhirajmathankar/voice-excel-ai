const { app, BrowserWindow } = require('electron');
const path = require('path');
const AutoLaunch = require('auto-launch');

// Configure auto-launch
const myAppAutoLauncher = new AutoLaunch({
    name: 'Excel Mitra',               // App name shown in Windows startup
    path: process.execPath,      // Path to your Electron .exe
});

myAppAutoLauncher.isEnabled().then((isEnabled) => {
    if (!isEnabled) myAppAutoLauncher.enable();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Load Angular build
  win.loadFile(path.join(__dirname, 'dist/desktop-application/index.html'));

  // Open DevTools in dev mode (optional)
  // win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
