import { serve, launchBrowser } from './serve.mjs';

const args = process.argv.slice(2);
const kindArg = args.find((arg) => !arg.startsWith('--'));
const idsArg = args.find((arg) => arg.startsWith('--ids='));
const strict = args.includes('--strict');

if (kindArg !== 'critters' && kindArg !== 'towers') {
  console.error('Usage: node tools/check-painters.mjs <critters|towers> [--ids=a,b,c] [--strict]');
  process.exit(2);
}

const requestedIds = idsArg
  ? idsArg.slice('--ids='.length).split(',').map((id) => id.trim()).filter(Boolean)
  : null;

const { url, stop } = await serve();
const browser = await launchBrowser();
let exitCode = 0;

try {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.error('PAGE CONSOLE:', msg.text());
  });
  await page.goto(url);

  const results = await page.evaluate(async ({ kindArg, requestedIds }) => {
    const isTowers = kindArg === 'towers';
    const spriteCache = await import('/src/render2d/spriteCache.ts');
    if (isTowers) {
      await import('/src/render2d/painters/towers/index.ts');
    } else {
      await import('/src/render2d/painters/critters/index.ts');
    }
    const content = isTowers
      ? await import('/src/content/towers.ts')
      : await import('/src/content/critters.ts');
    const defs = isTowers ? content.TOWER_DEFS : content.CRITTER_DEFS;
    const allIds = Object.keys(defs);
    const ids = requestedIds && requestedIds.length ? requestedIds : allIds;
    const spriteKind = isTowers ? 'tower' : 'critter';

    const inspectCanvas = (cv, logicalSize) => {
      const out = document.createElement('canvas');
      out.width = logicalSize;
      out.height = logicalSize;
      const outCtx = out.getContext('2d');
      if (!outCtx) return { nonTransparentPct: 0, colors: 0 };
      outCtx.drawImage(cv, 0, 0, logicalSize, logicalSize);
      const data = outCtx.getImageData(0, 0, logicalSize, logicalSize).data;
      let nonTransparent = 0;
      const colors = new Set();
      for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (a === 0) continue;
        nonTransparent++;
        if (a >= 128) {
          const r = data[i] >> 4;
          const g = data[i + 1] >> 4;
          const b = data[i + 2] >> 4;
          colors.add((r << 8) | (g << 4) | b);
        }
      }
      return {
        nonTransparentPct: nonTransparent / (logicalSize * logicalSize),
        colors: colors.size,
      };
    };

    return ids.map((id) => {
      const def = defs[id];
      if (!def) {
        return { id, status: 'FAIL', reason: 'unknown content id', nonTransparentPct: 0, colors: 0, hasPainter: false };
      }
      const has = spriteCache.hasPainter(spriteKind, id);
      if (!has) {
        return { id, status: 'MISSING', reason: 'no registered painter', nonTransparentPct: 0, colors: 0, hasPainter: false };
      }
      const isBoss = !isTowers && !!(def.boss || def.size >= 1);
      const logicalSize = isTowers ? 96 : (isBoss ? 128 : 64);
      const opts = isTowers ? { tier: 3, variant: '' } : { variant: isBoss ? 'boss' : '', shiny: false };
      const cv = spriteCache.getSprite(spriteKind, id, logicalSize, 0, opts);
      if (!cv) {
        return { id, status: 'FAIL', reason: 'getSprite returned null', nonTransparentPct: 0, colors: 0, hasPainter: true };
      }
      const metrics = inspectCanvas(cv, logicalSize);
      const enoughPixels = metrics.nonTransparentPct >= 0.05;
      const enoughColors = metrics.colors >= 3;
      return {
        id,
        status: enoughPixels && enoughColors ? 'PASS' : 'FAIL',
        reason: enoughPixels && enoughColors ? '' : 'rendered check failed',
        nonTransparentPct: metrics.nonTransparentPct,
        colors: metrics.colors,
        hasPainter: true,
      };
    });
  }, { kindArg, requestedIds });

  let passed = 0;
  let missing = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === 'PASS') passed++;
    if (r.status === 'MISSING') missing++;
    if (r.status === 'FAIL') failed++;
    const pct = (r.nonTransparentPct * 100).toFixed(1);
    const suffix = r.status === 'PASS'
      ? `${pct}% pixels, ${r.colors} colors`
      : `${r.reason}; ${pct}% pixels, ${r.colors} colors`;
    console.log(`${r.status} ${r.id} - ${suffix}`);
  }
  console.log(`SUMMARY ${kindArg}: ${passed}/${results.length} PASS, ${missing} missing, ${failed} failed`);

  if (failed > 0 || (strict && missing > 0)) exitCode = 1;
} finally {
  await browser.close();
  await stop();
}

process.exit(exitCode);
