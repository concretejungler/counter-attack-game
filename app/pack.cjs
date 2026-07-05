// COUNTER ATTACK! — packaging wrapper for `npm run app:pack` / `app:dir`.
//
// Why a wrapper? On this Windows machine the project lives under the Desktop tree, where Defender
// real-time protection holds a transient lock on the freshly-extracted 235MB electron.exe. That
// makes electron-builder's atomic directory rename (win-unpacked.tmp -> win-unpacked) fail with
// EPERM even though individual file writes/copies to the same folder succeed. The identical build
// runs cleanly when its output dir is OUTSIDE the protected tree.
//
// So we: (1) run electron-builder with output redirected to an OS-temp staging dir, then
// (2) copy the finished artifacts back into the project's release/ (plain file copies, which the
// protection allows). On machines without the quirk this is simply a temp build + a copy — still
// correct, just slightly more I/O. Pass --dir for an unpacked-only build (quick boot tests).
'use strict';

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const RELEASE = path.join(ROOT, 'release');
const STAGING = path.join(os.tmpdir(), 'counter-attack-build');
const dirOnly = process.argv.includes('--dir');

// Resolve the electron-builder CLI entry robustly (no reliance on shell PATH / .bin shims).
const ebPkgPath = require.resolve('electron-builder/package.json', { paths: [ROOT] });
const ebBin = require(ebPkgPath).bin['electron-builder'];
const ebCli = path.join(path.dirname(ebPkgPath), ebBin);

fs.rmSync(STAGING, { recursive: true, force: true });
fs.mkdirSync(STAGING, { recursive: true });

const args = [ebCli, '--win', `--config.directories.output=${STAGING}`];
if (dirOnly) args.push('--dir');

console.log(`[app:pack] electron-builder → ${STAGING}${dirOnly ? ' (--dir)' : ''}`);
const res = spawnSync(process.execPath, args, { cwd: ROOT, stdio: 'inherit' });
if (res.status !== 0) {
  console.error('[app:pack] electron-builder failed.');
  process.exit(res.status ?? 1);
}

// --- Copy staging → release/ (recursive plain copy, allowed under the Desktop protection) ---
fs.rmSync(RELEASE, { recursive: true, force: true });
fs.mkdirSync(RELEASE, { recursive: true });
for (const entry of fs.readdirSync(STAGING)) {
  fs.cpSync(path.join(STAGING, entry), path.join(RELEASE, entry), { recursive: true });
}

// --- Report the installer(s) with sizes ---
const installers = fs
  .readdirSync(RELEASE)
  .filter((f) => f.toLowerCase().endsWith('.exe'))
  .map((f) => {
    const size = fs.statSync(path.join(RELEASE, f)).size;
    return `  ${path.join('release', f)}  (${(size / 1024 / 1024).toFixed(1)} MB)`;
  });
console.log(`[app:pack] artifacts copied to ${RELEASE}:`);
console.log(installers.join('\n') || '  (no .exe found)');
console.log('[app:pack] DONE');
