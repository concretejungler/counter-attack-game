// COUNTER ATTACK! — preload bridge.
// Runs in an isolated world (contextIsolation on, nodeIntegration off, sandbox on) and exposes a
// deliberately tiny, safe surface to the game: window.gameShell. The web build already probes for
// this object (`window.gameShell?.setFullscreen(...)`), so absence in the browser is fine.
'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Read the read-only facts main handed us via webPreferences.additionalArguments.
function argValue(name, fallback) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

const version = argValue('app-version', '0.0.0');

// isFullscreen() is synchronous by contract, so we mirror the main-process truth locally and let
// main push updates whenever fullscreen changes (F11, Alt+Enter, OS chrome, or a bridge call).
let fullscreen = argValue('start-fullscreen', '0') === '1';
ipcRenderer.on('gameShell:fullscreen', (_event, on) => {
  fullscreen = !!on;
});

contextBridge.exposeInMainWorld('gameShell', {
  version,
  isFullscreen: () => fullscreen,
  setFullscreen: async (on) => {
    fullscreen = await ipcRenderer.invoke('gameShell:setFullscreen', !!on);
    return fullscreen;
  },
  toggleFullscreen: async () => {
    fullscreen = await ipcRenderer.invoke('gameShell:toggleFullscreen');
    return fullscreen;
  },
  quit: () => ipcRenderer.invoke('gameShell:quit'),
});
