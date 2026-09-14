/* =========================================================================
   Qarz Daftar — Electron asosiy jarayoni (Windows desktop dasturi)
   Backup operatsiyalari haqiqiy fayl tizimida, atomik tarzda bajariladi.
   ========================================================================= */
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');

const backup = require('./backup-fs');

let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#0b0f1a',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'assets', 'icons', 'icon-512.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false
    }
  });
  win.loadFile(path.join(__dirname, '..', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

/* ---------------- Backup IPC ---------------- */
ipcMain.handle('backup:pickFolder', async () => {
  const r = await dialog.showOpenDialog(win, {
    title: 'Backup papkasini tanlang',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Tanlash'
  });
  if (r.canceled || !r.filePaths.length) return null;
  return r.filePaths[0];
});

ipcMain.handle('backup:write', async (e, dir, text) => backup.write(dir, text));
ipcMain.handle('backup:readMain', async (e, dir) => backup.readMain(dir));
ipcMain.handle('backup:safety', async (e, dir, text) => backup.safety(dir, text));
ipcMain.handle('backup:check', async (e, dir) => backup.check(dir));
