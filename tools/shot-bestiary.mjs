// Bestiary screenshot tool: grid every Phase-2 tower + every Phase-2 critter (incl.
// bosses), shoot both scenes for visual review.
//
// Constraint: window.__game only exposes demo/startLevel/state/grantCrumbs/callWave/
// setSpeed/fastForward/levels/drawCalls (see src/game.ts exposeDebug) — there is no
// sim.command()/sim.debugSpawn() surface reachable from here, and this tool may not
// touch game.ts/main.ts/renderer.ts (file ownership). window.__game.state() DOES
// return a live reference to the mutable SimState though (game.sim.state), and
// renderer.syncTick() (driven every tick by fastForward) reads state.towers /
// state.critters directly off that object — so we place towers and spawn critters by
// inserting well-formed Tower/Critter records straight into those Maps. This is the
// same data the real sim.command('placeTower')/debugSpawn() would produce, just
// assembled here instead of dispatched through a command queue.
//
// Camera: the default kitchen-5 camera frames the whole 15x11 floor from a fixed
// pose (see renderer.ts buildRoom -> rig.setBounds); there's no exposed hook to move
// it. The floor's raised banquet counter (surface index 1, origin (3, 2.8, 3), 9x5)
// is where the cake sits — brightly lit, front-and-center in that default framing —
// so grids are laid out ON the banquet surface instead of the floor, clear of the
// cake tile (banquet-local (4,2)).
import { mkdirSync } from 'node:fs';
import { serve, launchBrowser } from './serve.mjs';

mkdirSync('shots', { recursive: true });

const BANQUET_ORIGIN = { x: 3, y: 2.8, z: 3 }; // src/content/levels/kitchen.ts KITCHEN_5 surfaces[1]

const NEW_TOWERS = [
  'vroomba', 'professor-scorch', 'mike-rowave', 'bubbles-laroux', 'saltimus-prime',
  'the-daily-smack', 'lux-interior', 'dj-decibel', 'eau-de-no', 'old-stinky',
  'count-blendula', 'herr-tick-tock', 'alexis', 'audrey-the-third', 'static',
  'snappy-and-sons',
];

const NEW_CRITTERS = [
  'ant-fire', 'ant-carpenter', 'maggot', 'roach-winged', 'roach-nuclear', 'possum-jr',
  'bedbug', 'cricket-bard', 'centipede', 'centipede-half', 'centipede-bit', 'beetle',
  'rat-knight', 'pillbug', 'earwig', 'tick', 'silverfish', 'mosquito', 'wasp-baron',
  'hornet', 'pigeon', 'termite', 'snail-shaman',
];
const NEW_BOSSES = [
  'moadb', 'sir-clogsworth', 'bedbug-baron', 'rat-king', 'grandma-longlegs',
  'possum-phantom', 'trash-panda-don', 'the-exterminator',
];

const { url, stop } = await serve();
const browser = await launchBrowser();
const page = await browser.newPage({ viewport: { width: 1900, height: 1100 } });
page.on('pageerror', (err) => console.error('PAGE ERROR:', String(err)));
page.on('console', (msg) => { if (msg.type() === 'error') console.error('CONSOLE ERROR:', msg.text()); });

await page.goto(url);
await page.waitForFunction(() => window.__game?.screenshotReady === true, null, { timeout: 30000 });

// ---------------------------------------------------------------------------
// Scene 1: towers grid on the banquet counter (surface 1), flanking the cake.
// ---------------------------------------------------------------------------
const towerResult = await page.evaluate(({ towers, origin }) => {
  const g = window.__game;
  g.startLevel('kitchen-5');
  const state = g.state();
  if (!state) return { ok: false, reason: 'no sim state after startLevel' };

  // banquet is 9 cols x 5 rows local; cake sits at local (4,2). Two rows flanking
  // the cake front-to-back (rows 0 and 4, the surface's near/far edges) keep every
  // tower clear of the cake mesh while staying tightly framed on the lit stage.
  const cols = 8;
  const spacing = 1.1;
  const startLc = 0.5;
  const rowsL = [0.55, 4.15];
  let nextId = 900000;
  const placed = [];

  towers.forEach((def, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const lc = startLc + col * spacing;
    const lr = rowsL[row] ?? rowsL[rowsL.length - 1];
    const tower = {
      id: nextId++,
      def,
      tier: 1,
      branch: null,
      tile: { s: 1, c: Math.round(lc), r: Math.round(lr) },
      pos: { x: origin.x + lc, y: origin.y, z: origin.z + lr },
      cooldown: 0,
      mountClutter: null,
      carried: false,
      downed: false,
      armed: true,
      invested: 0,
      disabled: 0,
      kills: 0,
      moraleT: 0,
      ageWaves: 0,
      aim: 0,
    };
    state.towers.set(tower.id, tower);
    placed.push(def);
  });

  return { ok: true, placed, count: state.towers.size };
}, { towers: NEW_TOWERS, origin: BANQUET_ORIGIN }).catch((e) => ({ ok: false, reason: String(e) }));

console.log('towers:', JSON.stringify(towerResult));

await page.evaluate(() => window.__game.fastForward(20));
await page.waitForTimeout(1000);
await page.screenshot({ path: 'shots/bestiary-towers.png' });
console.log('shot: shots/bestiary-towers.png');

// ---------------------------------------------------------------------------
// Scene 2: critters grid (regular species + bosses) on the same banquet stage,
// inserted directly + frozen mid-idle so nothing wanders off during fastForward.
// ---------------------------------------------------------------------------
const critterResult = await page.evaluate(({ critters, bosses, origin }) => {
  const g = window.__game;
  g.startLevel('kitchen-5');
  const state = g.state();
  if (!state) return { ok: false, reason: 'no sim state after startLevel' };

  let nextId = 800000;
  const placed = [];
  const mk = (def, x, y, z, i) => ({
    id: nextId++,
    def,
    hp: 999999,
    maxHp: 999999,
    pos: { x, y, z },
    facing: Math.PI, // face the camera (matches existing demo() spawn framing)
    surface: 0,
    state: 'walk',
    statuses: { frozen: 9999 },
    slowPct: 0,
    bitesDone: 0,
    carriedSlice: false,
    playedDead: false,
    dodged: {},
    crumbsEaten: 0,
    elite: false,
    shiny: false,
    flying: false,
    vel: { x: 0, y: 0, z: 0 },
    hidden: false,
    wobble: i * 0.7,
    spawnedAt: 0,
  });

  // Regular species (small, ~0.2-1m): banquet is 9 cols x 5 rows local, cake sits
  // at local (4,2)-(5,3) dead center. Split into a left region (local x 0-3.4) and
  // a right region (local x 5.6-9) flanking the cake, 3 cols x 4 rows each — 24
  // slots total, comfortably fits 23 species with zero overlap and zero cake clip.
  const regionCols = 3;
  const spacing = 1.05;
  const startLr = 0.55;
  const leftStartLc = 0.55;
  const rightStartLc = 5.75;
  critters.forEach((def, i) => {
    const region = i < 12 ? 0 : 1;
    const idx = region === 0 ? i : i - 12;
    const col = idx % regionCols;
    const row = Math.floor(idx / regionCols);
    const lc = (region === 0 ? leftStartLc : rightStartLc) + col * spacing;
    const lr = startLr + row * spacing;
    const c = mk(def, origin.x + lc, origin.y, origin.z + lr, i);
    c.surface = 1;
    state.critters.set(c.id, c);
    placed.push(def);
  });

  // Bosses (large, ~1-2m): open floor strip in front of the counter, well clear of
  // the counter's cabinet body (which ends at floor row ~7.9 — see room.ts
  // buildElevatedSurface) and centered under the default floor-framed camera.
  const bossSpacing = 1.7;
  const bossStartC = 1.5;
  const bossRow = 8.8;
  bosses.forEach((def, i) => {
    const c = mk(def, bossStartC + i * bossSpacing, 0, bossRow, critters.length + i);
    c.surface = 0;
    state.critters.set(c.id, c);
    placed.push(def);
  });

  return { ok: true, placed, count: state.critters.size };
}, { critters: NEW_CRITTERS, bosses: NEW_BOSSES, origin: BANQUET_ORIGIN }).catch((e) => ({ ok: false, reason: String(e) }));

console.log('critters:', JSON.stringify(critterResult));

await page.evaluate(() => window.__game.fastForward(6));
// re-freeze after the fastForward pass in case anything thawed/moved during tick()
await page.evaluate(() => {
  const state = window.__game.state();
  if (!state) return;
  for (const cr of state.critters.values()) {
    cr.statuses.frozen = 9999;
    cr.hidden = false;
  }
});
await page.evaluate(() => window.__game.fastForward(1));
await page.waitForTimeout(1000);
await page.screenshot({ path: 'shots/bestiary-critters.png' });
console.log('shot: shots/bestiary-critters.png');

// ---------------------------------------------------------------------------
// Scene 3: boss verification. renderer.ts hardcodes ALL boss critters to
// buildCrumbKing() (see src/render/renderer.ts:215, `def?.boss ? buildCrumbKing() :
// null`) — that dispatch line lives outside this tool's file ownership (only
// towerModels.ts / critterModels.ts / this tool may be touched), so the in-game
// scene above renders every Phase-2 boss as a Crumb King clone regardless of the 8
// bespoke BossView builders added to critterModels.ts. To actually verify those 8
// models render correctly, this scene bypasses Game/GameRenderer entirely: it opens
// a bare page, dynamically imports critterModels.ts as an ES module straight off the
// Vite dev server, and drives a minimal standalone three.js scene calling
// buildBossView() directly. This is a real gap for whoever owns renderer.ts to wire
// up (one line: dispatch BOSS_BUILDERS[def] before falling back to buildCrumbKing).
// ---------------------------------------------------------------------------
await page.evaluate(() => {
  document.body.innerHTML = '<canvas id="boss-canvas" style="display:block;width:100vw;height:100vh"></canvas>';
});

const bossVerify = await page.evaluate(async (bosses) => {
  const THREE = await import('/node_modules/three/build/three.module.js');
  const { buildBossView } = await import('/src/render/models/critterModels.ts');

  const canvas = document.getElementById('boss-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x33261a);
  const hemi = new THREE.HemisphereLight(0xfff2dc, 0x7a5a3c, 1.2);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffe2b0, 1.6);
  key.position.set(6, 10, 6);
  scene.add(key);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 12), new THREE.MeshStandardMaterial({ color: 0x8a5a36 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 3.6, 15);
  camera.lookAt(0, 1.1, 0);

  const built = [];
  const failed = [];
  bosses.forEach((def, i) => {
    try {
      const view = buildBossView(def);
      if (!view) { failed.push({ def, reason: 'buildBossView returned null' }); return; }
      view.group.position.set((i - (bosses.length - 1) / 2) * 2.7, 0, 0);
      scene.add(view.group);
      built.push({ def, view });
    } catch (e) {
      failed.push({ def, reason: String(e) });
    }
  });

  // a few animate ticks so idle motion settles into a lively, non-t-pose frame
  for (let t = 0; t < 40; t++) {
    for (const { view } of built) view.animate(1 / 30, t / 30);
  }
  renderer.render(scene, camera);

  return { built: built.map((b) => b.def), failed };
}, NEW_BOSSES).catch((e) => ({ built: [], failed: [{ def: 'ALL', reason: String(e) }] }));

console.log('boss verify:', JSON.stringify(bossVerify));
await page.waitForTimeout(300);
await page.screenshot({ path: 'shots/bestiary-bosses.png' });
console.log('shot: shots/bestiary-bosses.png (standalone boss-model verification, bypasses the renderer.ts CrumbKing-only dispatch gap)');

await browser.close();
await stop();
console.log('BESTIARY SHOTS DONE');
