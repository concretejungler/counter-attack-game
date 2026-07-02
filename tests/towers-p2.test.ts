import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import { towerStats } from '../src/sim/towers';
import type { ContentDB, SimEvent, SimOptions, TowerDef } from '../src/sim/types';
import { tinyLevel, testContent, TEST_TOWERS } from './fixtures';

const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

const P2_TOWERS: Record<string, TowerDef> = {
  // Aura tower that buffs neighboring towers' rate/dmg — no damage/range-vs-critters of its own beyond the aura.
  'test-buffer': {
    id: 'test-buffer', name: 'Test Buffer', item: 'Buffer', role: 'buff aura',
    dmgType: 'sonic', attack: 'aura', targeting: 'close',
    tiers: [
      { cost: 40, dmg: 0, rate: 1, range: 5, extra: { buffRatePct: 0.5, buffDmgPct: 0.25 } },
      { cost: 30, dmg: 0, rate: 1, range: 5, extra: { buffRatePct: 0.5, buffDmgPct: 0.25 } },
      { cost: 30, dmg: 0, rate: 1, range: 5, extra: { buffRatePct: 0.5, buffDmgPct: 0.25 } },
    ],
    branches: [],
    hitsAir: true,
    floorMount: true,
    desc: 'test', barks: ['buff'],
  },
  // Plain gun with agePct scaling.
  'test-ager': {
    id: 'test-ager', name: 'Test Ager', item: 'Gun', role: 'ages into power',
    dmgType: 'spray', attack: 'projectile', targeting: 'first',
    tiers: [
      { cost: 50, dmg: 10, rate: 1, range: 3, extra: { agePct: 0.2 } },
      { cost: 40, dmg: 10, rate: 1, range: 3, extra: { agePct: 0.2 } },
      { cost: 80, dmg: 10, rate: 1, range: 3, extra: { agePct: 0.2 } },
    ],
    branches: [],
    hitsAir: true,
    projSpeed: 20,
    desc: 'test', barks: ['pew'],
  },
  // Projectile gun with chain lightning.
  'test-chainer': {
    id: 'test-chainer', name: 'Test Chainer', item: 'Chain Gun', role: 'chain lightning',
    dmgType: 'zap', attack: 'projectile', targeting: 'first',
    tiers: [
      { cost: 50, dmg: 20, rate: 1, range: 5, extra: { chainCount: 2, chainDmgPct: 1.0 } },
      { cost: 40, dmg: 20, rate: 1, range: 5, extra: { chainCount: 2, chainDmgPct: 1.0 } },
      { cost: 80, dmg: 20, rate: 1, range: 5, extra: { chainCount: 2, chainDmgPct: 1.0 } },
    ],
    branches: [],
    hitsAir: true,
    projSpeed: 30,
    desc: 'test', barks: ['zap'],
  },
  // Vroomba: floor-mounted patrolling tower that sucks up tiny critters.
  'test-roomba': {
    id: 'test-roomba', name: 'Test Roomba', item: 'Roomba', role: 'patrol + suck',
    dmgType: 'swat', attack: 'none', targeting: 'close',
    tiers: [
      { cost: 60, dmg: 0, rate: 1, range: 0.8, extra: { roam: 1, roamSpeed: 3, suckSize: 0.3, autoSweep: 1 } },
      { cost: 50, dmg: 0, rate: 1, range: 0.8, extra: { roam: 1, roamSpeed: 3, suckSize: 0.3, autoSweep: 1 } },
      { cost: 90, dmg: 0, rate: 1, range: 0.8, extra: { roam: 1, roamSpeed: 3, suckSize: 0.3, autoSweep: 1 } },
    ],
    branches: [],
    floorMount: true,
    groundOnly: true,
    desc: 'test', barks: ['vroom'],
  },
  // Aura tower that reveals hidden critters within range.
  'test-revealer': {
    id: 'test-revealer', name: 'Test Revealer', item: 'Flashlight', role: 'reveal aura',
    dmgType: 'light', attack: 'aura', targeting: 'close',
    tiers: [
      { cost: 40, dmg: 0, rate: 1, range: 3, extra: { reveal: 1 } },
      { cost: 30, dmg: 0, rate: 1, range: 3, extra: { reveal: 1 } },
      { cost: 30, dmg: 0, rate: 1, range: 3, extra: { reveal: 1 } },
    ],
    branches: [],
    hitsAir: true,
    floorMount: true,
    desc: 'test', barks: ['click'],
  },
  // Aura tower that rewinds critters back along their path each pulse.
  'test-rewinder': {
    id: 'test-rewinder', name: 'Test Rewinder', item: 'Remote', role: 'rewind aura',
    dmgType: 'sonic', attack: 'aura', targeting: 'close',
    tiers: [
      { cost: 40, dmg: 0, rate: 2, range: 3, extra: { rewindSec: 1 } },
      { cost: 30, dmg: 0, rate: 2, range: 3, extra: { rewindSec: 1 } },
      { cost: 30, dmg: 0, rate: 2, range: 3, extra: { rewindSec: 1 } },
    ],
    branches: [],
    hitsAir: false,
    floorMount: true,
    desc: 'test', barks: ['rewind'],
  },
};

function p2Content(): ContentDB {
  const base = testContent();
  return { ...base, towers: { ...TEST_TOWERS, ...P2_TOWERS } };
}

const opts = (seed = 42): SimOptions => ({ seed, difficulty: 'houseguest', content: p2Content() });

function placeBox(sim: Sim, c = 3, r = 3) {
  sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c, r } });
  run(sim, 1);
}

function boxLevel() {
  return tinyLevel({
    clutterDeck: ['box-o'],
    clutterPerWave: 3,
    startCrumbs: 1000,
    waves: [{ entries: [{ critter: 'test-ant', count: 3, interval: 0.5, spawn: 'door', delay: 0 }] }],
  });
}

describe('Phase 2 tower behaviors', () => {
  it('buff aura raises a neighboring tower\'s effective rate and damage (towerStats)', () => {
    const sim = new Sim(boxLevel(), opts());
    placeBox(sim, 3, 3);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const gun = [...sim.state.towers.values()].find((t) => t.def === 'test-gun')!;
    const before = towerStats(sim as any, gun); // no buffer nearby yet — baseline stats
    expect(before.rate).toBe(2);
    expect(before.dmg).toBe(5);

    sim.command({ type: 'placeTower', def: 'test-buffer', at: { s: 0, c: 5, r: 3 } }); // bare floor, within its range-5 aura
    run(sim, 1); // placement tick already stamps the gun (aura stamps run at the top of updateTowers)
    const after = towerStats(sim as any, gun);
    expect(after.rate).toBeGreaterThan(before.rate);
    expect(after.dmg).toBeGreaterThan(before.dmg);
    expect(after.rate).toBeCloseTo(before.rate * 1.5, 5);
    expect(after.dmg).toBeCloseTo(before.dmg * 1.25, 5);
  });

  it('agePct scales damage up with ageWaves, capped at +100%', () => {
    const sim = new Sim(boxLevel(), opts());
    placeBox(sim, 3, 3);
    sim.command({ type: 'placeTower', def: 'test-ager', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    const base = towerStats(sim as any, tw);
    expect(base.dmg).toBe(10);

    tw.ageWaves = 3; // +0.2*3 = +60%
    const scaled = towerStats(sim as any, tw);
    expect(scaled.dmg).toBeCloseTo(16, 5);

    tw.ageWaves = 20; // would be +400%, capped to +100%
    const capped = towerStats(sim as any, tw);
    expect(capped.dmg).toBeCloseTo(20, 5);
  });

  it('chain lightning kills a cluster of weak critters with a single projectile', () => {
    const lvl = boxLevel();
    lvl.waves = [{ entries: [{ critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 }] }];
    const sim = new Sim(lvl, opts());
    placeBox(sim, 3, 3);
    sim.command({ type: 'placeTower', def: 'test-chainer', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    sim.command({ type: 'callWave' });
    // let the first ant spawn and walk into range
    let ev: SimEvent[] = [];
    for (let i = 0; i < seconds(3) && sim.state.critters.size === 0; i++) ev.push(...run(sim, 1));
    // seed two more weak critters clustered adjacent to the primary target
    const primary = [...sim.state.critters.values()][0];
    const tile = sim.grid.tileOfWorld(0, primary.pos.x, primary.pos.z)!;
    const c2 = sim.debugSpawn('test-ant', tile);
    c2.pos = { x: primary.pos.x + 0.4, y: primary.pos.y, z: primary.pos.z };
    const c3 = sim.debugSpawn('test-ant', tile);
    c3.pos = { x: primary.pos.x - 0.4, y: primary.pos.y, z: primary.pos.z + 0.3 };
    expect(sim.state.critters.size).toBe(3);

    ev = run(sim, seconds(3));
    const dies = ev.filter((e) => e.t === 'die');
    // chainCount 2 + primary hit = up to 3 kills from a single projectile impact
    expect(dies.length).toBeGreaterThanOrEqual(3);
    expect(dies.some((e) => e.t === 'die' && e.cause === 'chain')).toBe(true);
  });

  it('roam tower reverses at a wall and sucks up a small critter within range', () => {
    const lvl = boxLevel();
    lvl.surfaces[0].blocked = [[6, 3]]; // wall just east of where the roomba starts
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'placeTower', def: 'test-roomba', at: { s: 0, c: 5, r: 3 } }); // bare floor (floorMount)
    run(sim, 1);
    expect(sim.state.towers.size).toBe(1);
    const tw = [...sim.state.towers.values()][0];
    run(sim, seconds(0.3)); // long enough to reach the wall (0.5 tile gap at speed 3) but not bounce back past start
    const afterWall = sim.state.towers.get(tw.id)!;
    expect(afterWall.patrolDir).toBe(-1); // reversed after bumping the wall
    expect(afterWall.pos.x).toBeLessThan(6); // never clipped into the blocked wall tile

    // spawn a tiny critter right on top of the roomba and confirm it gets sucked up
    const tinyTile = sim.grid.tileOfWorld(0, afterWall.pos.x, afterWall.pos.z)!;
    const tiny = sim.debugSpawn('test-ant', tinyTile); // size 0.25 <= suckSize 0.3
    tiny.pos = { x: afterWall.pos.x, y: afterWall.pos.y, z: afterWall.pos.z };
    expect(sim.state.critters.has(tiny.id)).toBe(true);
    run(sim, 1);
    expect(sim.state.critters.has(tiny.id)).toBe(false);
  });

  it('reveal tower flips revealStamp on a hidden critter within range', () => {
    const sim = new Sim(boxLevel(), opts());
    sim.command({ type: 'placeTower', def: 'test-revealer', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    const cr = sim.debugSpawn('test-ant', { s: 0, c: 3, r: 3 });
    cr.pos = { x: tw.pos.x + 0.5, y: tw.pos.y, z: tw.pos.z };
    cr.hidden = true;
    cr.revealStamp = false;
    expect(cr.revealStamp).toBe(false);
    run(sim, 1);
    expect(sim.state.critters.get(cr.id)!.revealStamp).toBe(true);
  });

  it('rewind aura pulse moves a critter backward along its path (distance-to-cake increases)', () => {
    const sim = new Sim(boxLevel(), opts());
    sim.command({ type: 'placeTower', def: 'test-rewinder', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    const cr = sim.debugSpawn('test-ant', { s: 0, c: 3, r: 3 });
    cr.pos = { x: tw.pos.x, y: tw.pos.y, z: tw.pos.z };
    const tileBefore = sim.grid.tileOfWorld(0, cr.pos.x, cr.pos.z)!;
    const distBefore = sim.grid.distOf(tileBefore);

    run(sim, 1); // single tick: cooldown starts at 0, so the pulse (rate 2/sec) fires immediately
    const after = sim.state.critters.get(cr.id)!;
    const tileAfter = sim.grid.tileOfWorld(0, after.pos.x, after.pos.z)!;
    const distAfter = sim.grid.distOf(tileAfter);
    expect(distAfter).toBeGreaterThan(distBefore);
  });
});
