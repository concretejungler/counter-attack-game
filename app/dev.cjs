// COUNTER ATTACK! — dev launcher for `npm run app:dev`.
// Boots the Vite dev server, waits for it to answer, then launches Electron pointed at it with
// ELECTRON_DEV=1. Kept dependency-free (no `concurrently`) — a small spawn+poll does the job.
'use strict';

const { spawn } = require('node:child_process');
const path = require('node:path');
const http = require('node:http');

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.env.PORT || 5173);
const URL = `http://localhost:${PORT}`;

// Resolve local binaries so we don't depend on shell PATH / npx quirks across platforms.
const viteBin = require.resolve('vite/bin/vite.js', { paths: [ROOT] });
const electronBin = require('electron'); // in a plain Node context this is the exe path

const children = [];
function killAll() {
  for (const c of children) {
    try {
      c.kill();
    } catch {
      /* already gone */
    }
  }
}
process.on('SIGINT', () => {
  killAll();
  process.exit(0);
});
process.on('exit', killAll);

// --- 1. Vite dev server ---
const vite = spawn(process.execPath, [viteBin, '--port', String(PORT), '--strictPort'], {
  cwd: ROOT,
  stdio: 'inherit',
});
children.push(vite);

// --- 2. Poll until Vite responds, then launch Electron ---
function waitForServer(attemptsLeft) {
  const req = http.get(URL, () => {
    req.destroy();
    launchElectron();
  });
  req.on('error', () => {
    if (attemptsLeft <= 0) {
      console.error(`[app:dev] Vite did not answer at ${URL} in time.`);
      killAll();
      process.exit(1);
    }
    setTimeout(() => waitForServer(attemptsLeft - 1), 300);
  });
}

function launchElectron() {
  const electron = spawn(electronBin, [ROOT], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, ELECTRON_DEV: '1', ELECTRON_DEV_URL: URL },
  });
  children.push(electron);
  electron.on('close', (code) => {
    killAll();
    process.exit(code ?? 0);
  });
}

waitForServer(60); // ~18s budget for the dev server to come up
