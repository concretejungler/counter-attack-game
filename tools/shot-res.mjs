import { mkdirSync } from 'node:fs';
import { serve, launchBrowser } from './serve.mjs';

const DEFAULT_SCENES = ['title', 'levels', 'hud', 'battle'];
const DEFAULT_SIZES = [
  [1280, 720],
  [1600, 900],
  [1920, 1080],
  [2560, 1440],
  [3440, 1440],
  [3840, 2160],
];

function parseScenes(args) {
  const scenesArg = args.find((arg) => !arg.startsWith('--'));
  if (!scenesArg) return DEFAULT_SCENES;
  const scenes = scenesArg.split(',').map((scene) => scene.trim()).filter(Boolean);
  if (!scenes.length) throw new Error('Scene list is empty');
  return scenes;
}

function parseSizes(args) {
  const sizesArg = args.find((arg) => arg.startsWith('--sizes='));
  if (!sizesArg) return DEFAULT_SIZES;
  const rawSizes = sizesArg.slice('--sizes='.length).split(',').map((size) => size.trim()).filter(Boolean);
  if (!rawSizes.length) throw new Error('--sizes list is empty');
  return rawSizes.map((raw) => {
    const match = /^(\d+)x(\d+)$/i.exec(raw);
    if (!match) throw new Error(`Invalid size "${raw}". Use WxH, e.g. 1920x1080`);
    const width = Number(match[1]);
    const height = Number(match[2]);
    if (width <= 0 || height <= 0) throw new Error(`Invalid size "${raw}". Width and height must be positive`);
    return [width, height];
  });
}

async function main() {
  const args = process.argv.slice(2);
  const scenes = parseScenes(args);
  const sizes = parseSizes(args);
  const { url, stop } = await serve();
  let browser;

  try {
    browser = await launchBrowser();
    for (const [width, height] of sizes) {
      const page = await browser.newPage({
        viewport: { width, height },
        deviceScaleFactor: 1,
        hasTouch: false,
      });
      page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));
      page.on('console', (msg) => {
        if (msg.type() === 'error') console.error('PAGE CONSOLE:', msg.text());
      });

      try {
        await page.goto(url);
        await page.waitForFunction(() => window.__game?.screenshotReady === true, null, { timeout: 30000 });

        for (const scene of scenes) {
          await page.evaluate((selectedScene) => window.__game.demo(selectedScene), scene);
          await page.waitForTimeout(1100);
          mkdirSync('shots', { recursive: true });
          const path = `shots/res-${width}x${height}-${scene}.png`;
          await page.screenshot({ path });
          console.log(`shot: ${path}`);
        }
      } finally {
        await page.close();
      }
    }
  } finally {
    if (browser) await browser.close();
    await stop();
  }

  console.log('RES SHOTS DONE');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  console.error('Usage: node tools/shot-res.mjs [scene,scene] [--sizes=WxH,WxH]');
  process.exit(1);
});






