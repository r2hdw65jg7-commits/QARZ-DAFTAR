const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('gcNative', {
  platform: process.platform,
  backup: {
    pickFolder: () => ipcRenderer.invoke('backup:pickFolder'),
    write: (dir, text) => ipcRenderer.invoke('backup:write', dir, text),
    readMain: (dir) => ipcRenderer.invoke('backup:readMain', dir),
    safety: (dir, text) => ipcRenderer.invoke('backup:safety', dir, text),
    check: (dir) => ipcRenderer.invoke('backup:check', dir)
  }
});
