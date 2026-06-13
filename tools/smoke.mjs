// Boot the game headless; fail on any console error or missing canvas pixels.
import { serve, launchBrowser } from './serve.mjs';

const { url, stop } = await serve();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });

const errors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') errors.push(msg.text());
});
page.on('pageerror', (err) => errors.push(String(err)));

await page.goto(url);
await page.waitForFunction(() => window.__game?.screenshotReady === true, null, { timeout: 30000 });
await page.waitForTimeout(800);

// canvas must not be a black void — analyze a real screenshot
import('node:fs').then((fs) => fs.mkdirSync('shots', { recursive: true }));
const shot = await page.screenshot({ path: 'shots/smoke.png' });
const stats = await page.evaluate(async (b64) => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + b64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, 64, 64);
  const d = ctx.getImageData(0, 0, 64, 64).data;
  let lum = 0;
  for (let i = 0; i < d.length; i += 4) lum += d[i] + d[i + 1] + d[i + 2];
  return {
    lum: lum / (64 * 64 * 3),
    drawCalls: window.__game.drawCalls(),
    state: window.__game.state()?.phase,
  };
}, shot.toString('base64'));

await browser.close();
await stop();

console.log(`phase=${stats.state} drawCalls=${stats.drawCalls} avgLum=${stats.lum.toFixed(1)}`);
if (errors.length > 0) {
  console.error('CONSOLE ERRORS:');
  for (const e of errors.slice(0, 10)) console.error('  ' + e);
  process.exit(1);
}
if (stats.lum < 4) {
  console.error('FAIL: canvas appears black/empty');
  process.exit(1);
}
console.log('SMOKE OK');
