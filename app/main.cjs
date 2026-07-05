// COUNTER ATTACK! — Electron main process (S-B shell).
// Single BrowserWindow wrapping the same static `dist/` web build the browser ships.
// CommonJS on purpose (.cjs): the root package.json is `"type":"module"`, but the main/preload
// process code is loaded by Electron as CJS regardless of that field.
'use strict';

const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

// ----------------------------------------------------------------------------------------------
// Config
// ----------------------------------------------------------------------------------------------
const isDev = process.env.ELECTRON_DEV === '1';
const DEV_URL = process.env.ELECTRON_DEV_URL || 'http://localhost:5173';
const BG_COLOR = '#1a1410'; // matches index.html <meta theme-color> / game backdrop
const MIN_W = 960;
const MIN_H = 600;

// --- Steam overlay readiness (decision 1). Do NOT integrate Steamworks now. These are the launch
//     flags steamworks.js documents for its in-app overlay to hook Electron's GPU process. Default
//     OFF; opt in via STEAM_OVERLAY=1 or `--steam-overlay` so nothing changes for normal play.
//     When steamworks.js lands (R3) this same gate flips on. See app/README.md. ---
const steamOverlay =
  process.env.STEAM_OVERLAY === '1' || process.argv.includes('--steam-overlay');
if (steamOverlay) {
  app.commandLine.appendSwitch('in-process-gpu');
  app.commandLine.appendSwitch('disable-direct-composition');
}

// Single-instance: a second launch focuses the running window instead of spawning a rival.
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// ----------------------------------------------------------------------------------------------
// Persisted window state — bounds + fullscreen in userData/window-state.json
// ----------------------------------------------------------------------------------------------
const stateFile = () => path.join(app.getPath('userData'), 'window-state.json');

function loadState() {
  try {
    const raw = JSON.parse(fs.readFileSync(stateFile(), 'utf8'));
    if (raw && typeof raw === 'object') return raw;
  } catch {
    /* first run / corrupt file → defaults */
  }
  return {};
}

let saveTimer = null;
function saveState(win) {
  if (!win || win.isDestroyed()) return;
  try {
    // getNormalBounds() = the windowed bounds even while maximized/fullscreen, so we restore to a
    // sane window next launch rather than a zero-size or screen-filling rectangle.
    const b = win.getNormalBounds();
    const data = {
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      fullscreen: win.isFullScreen(),
      maximized: win.isMaximized(),
    };
    fs.mkdirSync(path.dirname(stateFile()), { recursive: true });
    fs.writeFileSync(stateFile(), JSON.stringify(data, null, 2));
  } catch {
    /* non-fatal: a lost window position never blocks the game */
  }
}

function scheduleSave(win) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(win), 400);
}

// A stored position may point at a monitor that is now unplugged — clamp back on-screen.
function boundsAreVisible(state) {
  if (!Number.isInteger(state.x) || !Number.isInteger(state.y)) return false;
  const { screen } = require('electron');
  const displays = screen.getAllDisplays();
  return displays.some((d) => {
    const wa = d.workArea;
    return (
      state.x < wa.x + wa.width &&
      state.x + (state.width || MIN_W) > wa.x &&
      state.y < wa.y + wa.height &&
      state.y + (state.height || MIN_H) > wa.y
    );
  });
}

// ----------------------------------------------------------------------------------------------
// Window
// ----------------------------------------------------------------------------------------------
let win = null;

function setFullscreen(on) {
  if (!win || win.isDestroyed()) return false;
  win.setFullScreen(!!on);
  return win.isFullScreen();
}

function toggleFullscreen() {
  if (!win || win.isDestroyed()) return false;
  return setFullscreen(!win.isFullScreen());
}

function createWindow() {
  const state = loadState();
  // Borderless-fullscreen by default (decision: a PC game opens immersive); windowed via toggle.
  const startFullscreen =
    typeof state.fullscreen === 'boolean' ? state.fullscreen : true;

  const opts = {
    width: Math.max(state.width || 1280, MIN_W),
    height: Math.max(state.height || 720, MIN_H),
    minWidth: MIN_W,
    minHeight: MIN_H,
    backgroundColor: BG_COLOR,
    show: false, // reveal on ready-to-show → no white boot flash
    fullscreen: startFullscreen,
    autoHideMenuBar: true,
    title: 'COUNTER ATTACK!',
    icon: path.join(__dirname, 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      // Hand the preload a couple of read-only facts without a sync IPC round-trip.
      additionalArguments: [
        `--app-version=${app.getVersion()}`,
        `--start-fullscreen=${startFullscreen ? '1' : '0'}`,
      ],
    },
  };
  if (boundsAreVisible(state)) {
    opts.x = state.x;
    opts.y = state.y;
  }

  win = new BrowserWindow(opts);
  Menu.setApplicationMenu(null); // no menu bar
  if (state.maximized && !startFullscreen) win.maximize();

  win.once('ready-to-show', () => win.show());

  // --- Load the game: dev server when ELECTRON_DEV=1, else the packaged static build ---
  if (isDev) {
    win.loadURL(DEV_URL);
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  // --- Fullscreen accelerators: F11 and Alt+Enter (scoped to this webContents, not global) ---
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const isF11 = input.key === 'F11';
    const isAltEnter = input.alt && (input.key === 'Enter' || input.code === 'Enter');
    if (isF11 || isAltEnter) {
      event.preventDefault();
      toggleFullscreen();
    }
  });

  // --- Keep the renderer's cached fullscreen flag in sync with reality ---
  const pushFullscreen = () => {
    if (win && !win.isDestroyed())
      win.webContents.send('gameShell:fullscreen', win.isFullScreen());
  };
  win.on('enter-full-screen', pushFullscreen);
  win.on('leave-full-screen', pushFullscreen);

  // --- Persist window state ---
  win.on('resize', () => scheduleSave(win));
  win.on('move', () => scheduleSave(win));
  win.on('close', () => saveState(win));
  win.on('closed', () => {
    win = null;
  });

  // --- Safety: deny external navigation and any new-window/popup (decision: locked-down shell) ---
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url); // legit links → system browser
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    const sameApp = isDev ? url.startsWith(DEV_URL) : url.startsWith('file://');
    if (!sameApp) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  // Block <webview> attachment entirely.
  win.webContents.on('will-attach-webview', (event) => event.preventDefault());
}

// ----------------------------------------------------------------------------------------------
// IPC — backs window.gameShell (see preload.cjs)
// ----------------------------------------------------------------------------------------------
ipcMain.handle('gameShell:setFullscreen', (_e, on) => setFullscreen(on));
ipcMain.handle('gameShell:toggleFullscreen', () => toggleFullscreen());
ipcMain.handle('gameShell:isFullscreen', () =>
  win && !win.isDestroyed() ? win.isFullScreen() : false,
);
ipcMain.handle('gameShell:quit', () => {
  app.quit();
});

// ----------------------------------------------------------------------------------------------
// Lifecycle
// ----------------------------------------------------------------------------------------------
app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore();
    win.focus();
  }
});

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  // Windows/Linux: quit with the last window. (macOS convention kept for completeness.)
  if (process.platform !== 'darwin') app.quit();
});
