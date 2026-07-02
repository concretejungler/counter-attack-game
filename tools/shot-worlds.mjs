// Screenshot one mid-battle scene per world theme for room/art evaluation.
import { mkdirSync } from 'node:fs';
import { serve, launchBrowser } from './serve.mjs';

mkdirSync('shots', { recursive: true });
const LEVELS = process.argv[2]
  ? process.argv[2].split(',')
  : ['kitchen-3', 'living-2', 'bathroom-2', 'bedroom-2', 'garage-2', 'basement-2', 'attic-2', 'backyard-2', 'sewer-2'];

const { url, stop } = await serve();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));

await page.goto(url);
await page.waitForFunction(() => window.__game?.screenshotReady === true, null, { timeout: 30000 });

for (const id of LEVELS) {
  await page.evaluate((lvl) => {
    const g = window.__game;
    g.startLevel(lvl);
    g.grantCrumbs(600);
    g.callWave();
    g.fastForward(270); // ~9 sim-seconds — mid-wave chaos
  }, id);
  await page.waitForTimeout(800); // render settle
  await page.screenshot({ path: `shots/world-${id}.png` });
  console.log(`shot: shots/world-${id}.png`);
}

await browser.close();
await stop();
console.log('WORLD SHOTS DONE');
