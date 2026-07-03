// QA: screenshot the Hand cursor up close in several poses to verify orientation.
import { mkdirSync } from 'node:fs';
import { serve, launchBrowser } from './serve.mjs';

mkdirSync('shots', { recursive: true });
const poses = ['point', 'fist', 'open', 'sweep'];

const { url, stop } = await serve();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));

await page.goto(url);
await page.waitForFunction(() => window.__game?.screenshotReady === true, null, { timeout: 30000 });

for (const pose of poses) {
  await page.evaluate((p) => { globalThis.__handPose = p; window.__game.demo('hand'); }, pose);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `shots/hand-${pose}.png` });
  console.log(`shot: shots/hand-${pose}.png`);
}

await browser.close();
await stop();
console.log('HAND SHOTS DONE');
