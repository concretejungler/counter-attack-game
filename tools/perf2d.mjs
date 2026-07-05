// 2D render perf probe (§5 P2-I). Stages a 300-critter stress via window.__game hooks, applies a
// 4x CPU throttle (phone proxy) via CDP Emulation.setCPUThrottlingRate, then samples the renderer's
// per-frame render CPU (window.__game.renderMs()) over ~5s and prints the average vs the 4ms budget.
//
//   node tools/perf2d.mjs
//
// The number is the CPU time spent inside Renderer2D.frame() only (not sim ticks / rAF overhead),
// measured under the throttle so it reflects a mid-tier phone.
import { serve, launchBrowser } from './serve.mjs';

const BUDGET_MS = 4; // plan §2 perf budget: <=4ms render CPU/frame at 300 critters (throttled)
const THROTTLE = 4;
const SAMPLE_MS = 8000;   // longer window so a stray GC/OS spike doesn't dominate the average
const WARMUP_MS = 1500;   // discard the first frames (JIT warmup, sprite-cache cold misses, first paint)

const { url, stop } = await serve();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));

await page.goto(url); // 2D is the default renderer
await page.waitForFunction(() => window.__game?.screenshotReady === true, null, { timeout: 30000 });

// stage 300 critters and run at 3x
const staged = await page.evaluate(() => {
  window.__game.demo('stress');
  window.__game.setSpeed(3);
  return window.__game.state()?.critters?.size ?? 0;
});

// 4x CPU throttle via the Chrome DevTools Protocol (phone proxy)
const client = await page.context().newCDPSession(page);
await client.send('Emulation.setCPUThrottlingRate', { rate: THROTTLE });

// let it settle a beat, then sample renderMs each rAF for SAMPLE_MS (dropping WARMUP_MS of frames)
await page.waitForTimeout(600);
const result = await page.evaluate(
  ({ sampleMs, warmupMs }) =>
    new Promise((resolve) => {
      const samples = [];
      const t0 = performance.now();
      const tick = () => {
        const ms = window.__game.renderMs();
        // only bank frames after the warmup window (JIT/sprite-cache cold misses skew the first ~1.5s)
        if (ms > 0 && performance.now() - t0 >= warmupMs) samples.push(ms);
        if (performance.now() - t0 < sampleMs) requestAnimationFrame(tick);
        else {
          samples.sort((a, b) => a - b);
          const n = Math.max(1, samples.length);
          const avg = samples.reduce((s, v) => s + v, 0) / n;
          const median = samples[Math.floor(n * 0.5)] ?? avg;
          const min = samples[0] ?? avg;
          const p95 = samples[Math.floor(n * 0.95)] ?? avg;
          resolve({ avg, median, min, p95, frames: samples.length, critters: window.__game.state()?.critters?.size ?? 0 });
        }
      };
      requestAnimationFrame(tick);
    }),
  { sampleMs: SAMPLE_MS, warmupMs: WARMUP_MS },
);

await browser.close();
await stop();

// Verdict keys on the average (the plan's stated metric); median/min are reported so a noisy host
// (background CPU contention inflating avg/p95) is visible rather than mistaken for a render cost.
const verdict = result.avg <= BUDGET_MS ? 'PASS' : 'OVER BUDGET';
console.log(
  `perf2d: staged=${staged} critters, sampled ${result.frames} frames @ ${THROTTLE}x CPU throttle, ` +
    `live=${result.critters}`,
);
console.log(
  `perf2d: avg=${result.avg.toFixed(2)}ms  median=${result.median.toFixed(2)}ms  min=${result.min.toFixed(2)}ms  ` +
    `p95=${result.p95.toFixed(2)}ms  budget=${BUDGET_MS}ms  -> ${verdict}`,
);
