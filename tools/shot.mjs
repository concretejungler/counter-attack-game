// Stage demo scenes and screenshot them to shots/ for visual evaluation.
import { mkdirSync } from 'node:fs';
import { serve, launchBrowser } from './serve.mjs';

mkdirSync('shots', { recursive: true });
const scenes = process.argv[2] ? process.argv[2].split(',') : ['title', 'levels', 'hud', 'battle', 'boss', 'mutation', 'recap'];

const { url, stop } = await serve();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));

await page.goto(url);
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
