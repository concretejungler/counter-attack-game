// Stage demo scenes and screenshot them to shots/ for visual evaluation.
// The game is 2D by default; pass RENDERER=3d (env) or --renderer=3d to shoot the three.js fallback.
import { mkdirSync } from 'node:fs';
import { serve, launchBrowser } from './serve.mjs';

mkdirSync('shots', { recursive: true });
const args = process.argv.slice(2);
const scenesArg = args.find((a) => !a.startsWith('--'));
const scenes = scenesArg ? scenesArg.split(',') : ['title', 'levels', 'settings', 'journal', 'hud', 'battle', 'boss', 'mutation', 'choice', 'recap'];
const renderer = process.env.RENDERER || args.find((a) => a.startsWith('--renderer='))?.split('=')[1] || '';
const query = renderer === '3d' ? '?renderer=3d' : '';

const { url, stop } = await serve();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));

await page.goto(url + query);
await page.waitForFunction(() => window.__game?.screenshotReady === true, null, { timeout: 30000 });

for (const scene of scenes) {
  await page.evaluate((s) => window.__game.demo(s), scene);
  await page.waitForTimeout(1100); // let particles/anims settle into a lively frame
  await page.screenshot({ path: `shots/${scene}.png` });
  console.log(`shot: shots/${scene}.png`);
}

await browser.close();
await stop();
console.log('SHOTS DONE');
