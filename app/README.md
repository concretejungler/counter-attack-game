# COUNTER ATTACK! — Desktop shell (Electron)

This directory is the **Steam / Windows PC wrapper** around the exact same static web build that
ships to the browser (`dist/`). The game itself is unchanged — the shell only adds a native window,
fullscreen control, persisted window state, and the packaging pipeline.

```
app/
  main.cjs      Electron main process — window, fullscreen, window-state persistence, IPC, safety
  preload.cjs   contextBridge → window.gameShell (fullscreen / quit / version)
  dev.cjs       `npm run app:dev` launcher (vite dev server + electron, no extra deps)
  build/
    icon.ico    app + installer icon (256/48/32/16). See "Icon" below.
  README.md     (this file)
```

## Scripts

| Command          | What it does                                                              |
| ---------------- | ------------------------------------------------------------------------- |
| `npm run app:dev`  | Vite dev server + Electron with `ELECTRON_DEV=1` (loads `localhost:5173`). |
| `npm run app:pack` | `npm run build` then electron-builder → NSIS installer + portable in `release/`. |
| `npm run app:dir`  | `npm run build` then electron-builder `--dir` (unpacked, fast boot tests). |

Prod loads `../dist/index.html`; dev loads the Vite server. Both are packaged into the app asar.

`app:pack`/`app:dir` go through `app/pack.cjs`, which runs electron-builder with its output redirected
to an OS-temp staging dir and then copies the finished artifacts back into `release/`. This is a
workaround for a Windows quirk on this machine: the project lives under the Desktop tree, where
Defender real-time protection holds a transient lock on the freshly-extracted 235 MB `electron.exe`,
making electron-builder's atomic `win-unpacked.tmp → win-unpacked` rename fail with `EPERM` (plain
file writes/copies to the same folder still succeed, so the copy-back works). On a machine without
the quirk — or once the project folder is added as a Defender exclusion — it is just a temp build
plus a copy. To build directly to `release/` without the wrapper: `electron-builder --win`.

## The `window.gameShell` bridge

Exposed by `preload.cjs` via `contextBridge` (safe: contextIsolation on, nodeIntegration off,
sandbox on). The web UI feature-detects it (`window.gameShell?.setFullscreen(...)`), so it's simply
absent in a plain browser.

| Member                  | Type                          | Notes                                         |
| ----------------------- | ----------------------------- | --------------------------------------------- |
| `version`               | `string`                      | App version (from `package.json`).            |
| `isFullscreen()`        | `boolean` (sync)              | Cached; main pushes updates on every change.  |
| `setFullscreen(on)`     | `Promise<boolean>`            | Resolves to the resulting fullscreen state.   |
| `toggleFullscreen()`    | `Promise<boolean>`            | Flips fullscreen; resolves to new state.      |
| `quit()`                | `Promise<void>`               | Quits the app.                                |

Keyboard: **F11** and **Alt+Enter** toggle fullscreen (handled in main via `before-input-event`,
so they work regardless of what the page is focused on). The window opens **borderless-fullscreen**
by default and remembers your last bounds + fullscreen choice in
`app.getPath('userData')/window-state.json`.

## Steam readiness (Steamworks is R3 — NOT wired up here)

Per the pivot plan (decision 1) the shell must **not preclude** Steamworks, without integrating it
now. Two things are already in place:

**1. Overlay launch flags, default-OFF.** The Steam in-app overlay hooks Electron's GPU process,
and `steamworks.js` documents two Chromium switches for reliable overlay rendering. They are wired
in `main.cjs` behind a gate so normal play is unaffected:

```js
// main.cjs — enabled only when STEAM_OVERLAY=1 or `--steam-overlay`
app.commandLine.appendSwitch('in-process-gpu');
app.commandLine.appendSwitch('disable-direct-composition');
```

When Steamworks lands, flip this gate on for Steam builds (e.g. a `STEAM=1` build-time env).

**2. steamworks.js drop-in point (R3).** Add the dependency and initialize in `main.cjs` right
after `app.whenReady()`, before `createWindow()`:

```js
// R3 only — do NOT add now.
// const steamworks = require('steamworks.js');
// const client = steamworks.init(YOUR_APP_ID);      // 480 = Spacewar test appid
// steamworks.electronEnableSteamOverlay();           // installs the overlay hook
// … expose achievements / cloud saves to the renderer over IPC (extend the gameShell bridge).
```

Saves stay in `localStorage` for now (Electron persists it per-app under userData); R3 moves them to
file-based + Steam Cloud, bridged by the existing export/import save codes.

### Why Electron, not Tauri

The Steam overlay is a Chromium-proven surface and `steamworks.js` is the mature Node binding for
Steamworks. Tauri/WebView2 has known Steam-overlay problems (the overlay fails to composite over
WebView2 reliably), so Electron is the lower-risk shell for a Steam launch. The web bundle stays
zero-dependency and independently deployable — the shell just wraps it.

## Icon

The icon is authored procedurally by the sibling `tools/gen-icon.mjs` job (Crumb King / cake sprite
rendered through the in-browser painter pipeline → `app/build/icon.ico`). If that file is a
solid-color placeholder, it means gen-icon.mjs had not landed yet at build time; re-run the icon
job and rebuild to pick up the real art. No external asset files are ever used (legally clean).
