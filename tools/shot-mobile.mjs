// Stage demo scenes and screenshot them at phone size (landscape, the primary play
// orientation) to shots/ for mobile visual evaluation. Mirrors tools/shot.mjs but
// drives an iPhone-13-like device: touch, 3x DPR, 844x390 landscape viewport.
import { mkdirSync } from 'node:fs';
import { serve, launchBrowser } from './serve.mjs';

mkdirSync('shots', { recursive: true });
const scenes = process.argv[2] ? process.argv[2].split(',') : ['title', 'levels', 'settings', 'journal', 'hud', 'battle', 'boss', 'mutation', 'choice', 'recap'];

const { url, stop } = await serve();
const browser = await launchBrowser();

// iPhone-13-like descriptor, landscape orientation (width/height swapped from portrait).
const context = await browser.newContext({
  viewport: { width: 844, height: 390 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));

await page.goto(url);
await page.waitForFunction(() => window.__game?.screenshotReady === true, null, { timeout: 30000 });

for (const scene of scenes) {
  await page.evaluate((s) => window.__game.demo(s), scene);
  await page.waitForTimeout(1100); // let particles/anims settle into a lively frame
  await page.screenshot({ path: `shots/mobile-${scene}-landscape.png` });
  console.log(`shot: shots/mobile-${scene}-landscape.png`);
}

// One portrait check on the HUD scene — should show the "turn me sideways" overlay.
await page.setViewportSize({ width: 390, height: 844 });
await page.evaluate((s) => window.__game.demo(s), 'hud');
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/mobile-hud-portrait.png' });
console.log('shot: shots/mobile-hud-portrait.png');

await context.close();
await browser.close();
await stop();
console.log('MOBILE SHOTS DONE');
