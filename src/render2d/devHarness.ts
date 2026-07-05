/**
 * Standalone dev harness for the 2D core (plan §5 P1-B). Instantiates Renderer2D
 * against a synthetic LevelDef-ish board — a kitchen-sized floor + 2 raised
 * surfaces + clutter blocks + a cake + entries/exits + a population of fake
 * critter/tower/projectile/crumb states — and animates it, so the core is
 * visually verifiable BEFORE game integration (P2-I).
 *
 * This file is typechecked (it lives under src/), which is the point: it exercises
 * the real public API of Renderer2D and the real sim `Grid`, so an API drift shows
 * up as a tsc error. tools/dev2d.html is just a thin shell that calls
 * `startDevHarness(canvas)`.
 *
 * It is NOT part of the production bundle (only index.html is built); it is reached
 * via `npm run dev` at /tools/dev2d.html.
 */

import type {
  LevelDef, SimState, Critter, Tower, ClutterPiece, CrumbEnt, Projectile,
  TileRef, ContentDB,
} from '../sim/types';
import { Grid } from '../sim/grid';
import { CONTENT } from '../content/index';
import { Renderer2D } from './renderer2d';

const SIM_DT = 1 / 30;

// ---------------------------------------------------------------------------
// synthetic level
// ---------------------------------------------------------------------------
function makeLevel(): LevelDef {
  return {
    id: 'dev2d', name: 'Dev Board', world: 1, index: 1, blurb: '', theme: 'kitchen',
    surfaces: [
      { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 18, rows: 12 },
      { id: 'counter', kind: 'counter', origin: { x: 10, y: 2.8, z: 2 }, cols: 5, rows: 4, blocked: [[2, 1]] },
      { id: 'shelf', kind: 'shelf', origin: { x: 2, y: 3.8, z: 7 }, cols: 4, rows: 3 },
    ],
    climbs: [
      { from: { s: 0, c: 12, r: 6 }, to: { s: 1, c: 2, r: 3 }, kind: 'climb' },
      { from: { s: 0, c: 3, r: 6 }, to: { s: 2, c: 1, r: 2 }, kind: 'climb' },
    ],
    spawns: [
      { id: 'door', tile: { s: 0, c: 0, r: 10 }, kind: 'door' },
      { id: 'vent', tile: { s: 0, c: 17, r: 1 }, kind: 'vent' },
      { id: 'drain', tile: { s: 0, c: 9, r: 11 }, kind: 'drain' },
    ],
    cakeTile: { s: 1, c: 2, r: 2 },
    cakeSlices: 8, startCrumbs: 200,
    clutterDeck: ['cereal-i', 'tupper-o', 'books-l'], clutterPerWave: 3,
    waves: [],
  };
}

// ---------------------------------------------------------------------------
// state builders
// ---------------------------------------------------------------------------
function emptyState(level: LevelDef): SimState {
  return {
    tick: 0, time: 0, phase: 'assault', waveIndex: 0, wavesTotal: 5,
    buildTimer: -1, buildTimerMax: 25, crumbs: 200, mana: 40, manaMax: 100,
    scent: 30, scentHoldT: 0, cakeSlices: level.cakeSlices, cakeMax: 10,
    critters: new Map(), towers: new Map(), projectiles: [],
    crumbEnts: new Map(), clutter: new Map(), clutterHand: [],
    hand: { flickCharges: 3, flickMax: 3, flickRecharge: 0, squashCd: 0, carryCd: 0, carrying: null, zapT: 0 },
    handMagnet: null,
    spellCds: {}, mutations: [], mutationOffer: null, grudges: [],
    jarring: null, jarredStock: [],
    recap: {
      bitesBySource: {}, leaksByWave: [], scentHistory: [], crumbsBanked: 0,
      crumbsWasted: 0, kills: 0, killsByTower: {}, sweeps: 0, directorNotes: [],
    },
    speedMult: 1, activeEvents: [], eventsThisLevel: 0, pendingChoice: null,
    ceasefireWaves: 0, pet: null, endlessDepth: 0,
  };
}

interface MakeCritterOpts {
  surface?: number;
  flying?: boolean;
  shiny?: boolean;
  elite?: boolean;
  crowned?: string;
  state?: Critter['state'];
  statuses?: Critter['statuses'];
  hidden?: boolean;
}

function makeCritter(id: number, def: string, x: number, z: number, y: number, o: MakeCritterOpts = {}): Critter {
  const cd = CONTENT.critters[def];
  const hp = cd?.hp ?? 20;
  return {
    id, def, hp, maxHp: hp,
    pos: { x, y, z }, facing: 0, surface: o.surface ?? 0,
    state: o.state ?? 'walk', statuses: o.statuses ?? {}, slowPct: 0,
    bitesDone: 0, carriedSlice: false, playedDead: false, dodged: {},
    crumbsEaten: 0, elite: !!o.elite, shiny: !!o.shiny, flying: !!o.flying,
    vel: { x: 0, y: 0, z: 0 }, wobble: Math.random() * 6, spawnedAt: 0,
    crowned: o.crowned, hidden: o.hidden,
  };
}

function makeTower(id: number, def: string, tile: TileRef, pos: { x: number; y: number; z: number }, tier: 1 | 2 | 3, branch: string | null): Tower {
  return {
    id, def, tier, branch, tile, pos, cooldown: 0, mountClutter: null,
    carried: false, downed: false, armed: true, invested: 100, disabled: 0,
    kills: 0, moraleT: id === 2 ? 3 : 0, ageWaves: 0, aim: 0,
  };
}

function makeClutter(id: number, shape: string, anchorS: number, cells: [number, number][], origin: { x: number; z: number }, hp: number): ClutterPiece {
  const resolved: TileRef[] = cells.map(([c, r]) => ({ s: anchorS, c, r }));
  return {
    id, shape, rot: 0, anchor: { s: anchorS, c: cells[0][0], r: cells[0][1] },
    cells: resolved, hp, maxHp: CONTENT.shapes[shape]?.hp ?? hp, mounted: [],
  };
}

// ---------------------------------------------------------------------------
// harness
// ---------------------------------------------------------------------------
export interface HarnessHandle {
  setCritterCount(n: number): void;
  fit(): void;
  toggle(): void;
  stats(): { ms: number; critters: number };
  destroy(): void;
}

interface Mover { c: Critter; tx: number; tz: number; wander: number; }

export function startDevHarness(canvas: HTMLCanvasElement): HarnessHandle {
  const content: ContentDB = CONTENT;
  const level = makeLevel();
  const grid = new Grid(level);

  // clutter on the floor (so pathing routes around it too)
  const state = emptyState(level);
  const clutterA = makeClutter(1, 'cereal-i', 0, [[5, 6], [6, 6], [7, 6], [8, 6]], level.surfaces[0].origin, 70);
  const clutterB = makeClutter(2, 'tupper-o', 0, [[13, 8], [14, 8], [13, 9], [14, 9]], level.surfaces[0].origin, 120);
  const clutterC = makeClutter(3, 'books-l', 0, [[6, 3], [6, 4], [6, 5], [7, 5]], level.surfaces[0].origin, 60); // partly chewed
  state.clutter.set(1, clutterA);
  state.clutter.set(2, clutterB);
  state.clutter.set(3, clutterC);
  for (const cl of state.clutter.values()) grid.setClutter(cl.cells, cl.id);
  grid.recompute(level.cakeTile);
  grid.recomputeExit(level.spawns.map((s) => s.tile));

  // towers
  const t1World = grid.worldOf({ s: 0, c: 5, r: 6 });
  const t2World = grid.worldOf({ s: 0, c: 13, r: 8 });
  const t3World = grid.worldOf({ s: 1, c: 1, r: 1 });
  state.towers.set(1, makeTower(1, 'sgt-spritz', { s: 0, c: 5, r: 6 }, t1World, 1, null));
  state.towers.set(2, makeTower(2, 'old-smacky', { s: 0, c: 13, r: 8 }, t2World, 2, null));
  state.towers.set(3, makeTower(3, 'sir-toastsalot', { s: 1, c: 1, r: 1 }, t3World, 3, 'poptart-napalm'));

  // crumbs scattered on the floor
  let crumbId = 1;
  for (const [c, r, v] of [[3, 2, 8], [8, 9, 20], [11, 5, 12], [15, 6, 40], [2, 8, 6], [9, 3, 15]] as [number, number, number][]) {
    const w = grid.worldOf({ s: 0, c, r });
    state.crumbEnts.set(crumbId, { id: crumbId, pos: { x: w.x, y: 0, z: w.z }, surface: 0, value: v, sweepT: 0 } as CrumbEnt);
    crumbId++;
  }

  // ---- showcase critters (statuses / boss / fliers / elevated) ----
  const movers: Mover[] = [];
  let nextId = 1;
  const showcase: { def: string; opts: MakeCritterOpts; tile: TileRef }[] = [
    { def: 'ant-worker', opts: { statuses: { soaked: 2 } }, tile: { s: 0, c: 2, r: 2 } },
    { def: 'roach', opts: { statuses: { burnt: 2 } }, tile: { s: 0, c: 3, r: 2 } },
    { def: 'ant-bullet', opts: { statuses: { frozen: 2 } }, tile: { s: 0, c: 4, r: 2 } },
    { def: 'slug', opts: { statuses: { sticky: 2 } }, tile: { s: 0, c: 5, r: 2 } },
    { def: 'silverfish', opts: { statuses: { confused: 2 } }, tile: { s: 0, c: 6, r: 2 } },
    { def: 'mouse-thief', opts: { statuses: { feared: 2 } }, tile: { s: 0, c: 7, r: 2 } },
    { def: 'ant-fire', opts: { statuses: { buttered: 2 } }, tile: { s: 0, c: 8, r: 2 } },
    { def: 'centipede-bit', opts: { statuses: { shrunk: 2 } }, tile: { s: 0, c: 9, r: 2 } },
    { def: 'ant-soldier', opts: { shiny: true }, tile: { s: 0, c: 10, r: 2 } },
    { def: 'stinkbug', opts: { crowned: 'Greg' }, tile: { s: 0, c: 11, r: 2 } },
    { def: 'fly-house', opts: { flying: true }, tile: { s: 0, c: 6, r: 8 } },
    { def: 'moth', opts: { flying: true }, tile: { s: 0, c: 10, r: 9 } },
    { def: 'bedbug', opts: { hidden: true }, tile: { s: 0, c: 13, r: 3 } },
    { def: 'snail', opts: { surface: 1 }, tile: { s: 1, c: 3, r: 1 } },  // on the counter
    { def: 'ant-worker', opts: { surface: 2 }, tile: { s: 2, c: 2, r: 1 } }, // on the shelf
    { def: 'crumb-king', opts: {}, tile: { s: 0, c: 8, r: 5 } }, // boss
  ];
  for (const sc of showcase) {
    const w = grid.worldOf(sc.tile);
    const c = makeCritter(nextId++, sc.def, w.x, w.z, w.y, sc.opts);
    c.surface = sc.opts.surface ?? sc.tile.s;
    state.critters.set(c.id, c);
    movers.push({ c, tx: w.x, tz: w.z, wander: Math.random() * Math.PI * 2 });
  }

  const renderer = new Renderer2D(canvas);
  renderer.loadLevel(level, content);
  renderer.resize();
  // push the enemy-path preview once (renderer2d no longer auto-traces the grid — game.ts/harness
  // owns the routes now, mirroring the real integration).
  const pathPolys = level.spawns
    .map((sp) => grid.pathTo(sp.tile).map((t) => grid.worldOf(t)))
    .filter((line) => line.length > 1);
  renderer.setPathPolylines(pathPolys);

  // ---- population control (perf) ----
  const spawnTiles = level.spawns.map((s) => grid.worldOf(s.tile));
  const cakeW = grid.worldOf(level.cakeTile);
  const marchDefs = ['ant-worker', 'ant-soldier', 'ant-bullet', 'roach', 'fly-fruit', 'fly-house', 'silverfish'];

  function addMarcher(): void {
    const sp = spawnTiles[nextId % spawnTiles.length];
    const def = marchDefs[nextId % marchDefs.length];
    const flying = def.startsWith('fly');
    const c = makeCritter(nextId++, def, sp.x + (Math.random() - 0.5), sp.z + (Math.random() - 0.5), 0, { flying });
    state.critters.set(c.id, c);
    movers.push({ c, tx: cakeW.x, tz: cakeW.z, wander: Math.random() * Math.PI * 2 });
  }

  function setCritterCount(target: number): void {
    // showcase critters (first 16) are pinned; adjust the marcher population
    const pinned = showcase.length;
    let marchers = movers.length - pinned;
    while (marchers < target) { addMarcher(); marchers++; }
    while (marchers > target && movers.length > pinned) {
      const m = movers.pop()!;
      state.critters.delete(m.c.id);
      marchers--;
    }
  }
  setCritterCount(0); // start with just the showcase

  // ---- projectiles (fake, for the projectile draw pass) ----
  let projId = 1;
  let projTimer = 0;
  function stepProjectiles(dt: number): void {
    projTimer -= dt;
    if (projTimer <= 0 && state.critters.size > 0) {
      projTimer = 0.4;
      const towers = [...state.towers.values()];
      const tw = towers[projId % towers.length];
      const targets = [...state.critters.values()];
      const tgt = targets[(projId * 7) % targets.length];
      const dx = tgt.pos.x - tw.pos.x, dz = tgt.pos.z - tw.pos.z;
      const len = Math.hypot(dx, dz) || 1;
      const def = content.towers[tw.def];
      const p: Projectile = {
        id: projId++, tower: tw.id, def: tw.def,
        pos: { x: tw.pos.x, y: 0, z: tw.pos.z },
        vel: { x: (dx / len) * 12, y: 0, z: (dz / len) * 12 },
        target: tgt.id, ttl: len / 12, arc: !!def?.arc, dmg: 5,
        dmgType: def?.dmgType ?? 'spray', aoe: 0, knockback: 0, mods: {},
      };
      state.projectiles.push(p);
    }
    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      p.pos.x += p.vel.x * dt;
      p.pos.z += p.vel.z * dt;
      p.ttl -= dt;
      if (p.ttl <= 0) state.projectiles.splice(i, 1);
    }
  }

  // ---- sim step (30 Hz): move critters, animate cake/hit/death ----
  let cakeTimer = 6;
  let hitTimer = 1.2;
  function stepSim(): void {
    state.tick++;
    state.time += SIM_DT;
    for (const m of movers) {
      const c = m.c;
      const cd = content.critters[c.def];
      const speed = (cd?.speed ?? 2) * 0.6;
      m.wander += SIM_DT;
      // pinned showcase critters gently oscillate in place; marchers head for the cake
      const isPinned = movers.indexOf(m) < showcase.length;
      let tx = m.tx, tz = m.tz;
      if (isPinned) {
        tx = m.tx + Math.sin(m.wander) * 0.35;
        tz = m.tz + Math.cos(m.wander * 0.8) * 0.2;
      }
      const dx = tx - c.pos.x, dz = tz - c.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > 0.02) {
        const step = Math.min(d, speed * SIM_DT);
        c.pos.x += (dx / d) * step;
        c.pos.z += (dz / d) * step;
        c.facing = Math.atan2(dz, dx);
      }
      if (!isPinned && d < 0.4) {
        // reached the cake area -> respawn at a random entry (loops the population)
        const sp = spawnTiles[(c.id + state.tick) % spawnTiles.length];
        c.pos.x = sp.x + (Math.random() - 0.5);
        c.pos.z = sp.z + (Math.random() - 0.5);
      }
    }
    // periodic hit (flash/squash) on a random critter
    hitTimer -= SIM_DT;
    if (hitTimer <= 0) {
      hitTimer = 0.5;
      const arr = [...state.critters.values()];
      const victim = arr[(state.tick >> 2) % arr.length];
      if (victim) victim.hp = Math.max(1, victim.hp - victim.maxHp * 0.15);
    }
    // slowly deplete the cake to show slices vanishing (then reset)
    cakeTimer -= SIM_DT;
    if (cakeTimer <= 0) {
      cakeTimer = 3;
      state.cakeSlices = state.cakeSlices <= 1 ? state.cakeMax : state.cakeSlices - 1;
    }
    stepProjectiles(SIM_DT);
  }

  // ---- rAF loop ----
  let last = performance.now();
  let acc = 0;
  let running = true;
  let msAvg = 0;
  let raf = 0;

  function loop(now: number): void {
    if (!running) return;
    const dtMs = now - last;
    last = now;
    acc += dtMs;
    let guard = 0;
    while (acc >= SIM_DT * 1000 && guard++ < 5) {
      stepSim();
      acc -= SIM_DT * 1000;
    }
    renderer.syncTick(state, []);
    renderer.syncProjectiles(state);
    const t0 = performance.now();
    renderer.frame(dtMs / 1000);
    const ms = performance.now() - t0;
    msAvg = msAvg * 0.9 + ms * 0.1;
    raf = requestAnimationFrame(loop);
  }
  raf = requestAnimationFrame(loop);

  const onResize = () => renderer.resize();
  window.addEventListener('resize', onResize);

  return {
    setCritterCount,
    fit: () => renderer.fitBoard(),
    toggle: () => renderer.toggleTopDown(),
    stats: () => ({ ms: msAvg, critters: state.critters.size }),
    destroy: () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    },
  };
}
