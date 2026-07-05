import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import type { SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

const opts = (seed = 42): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent() });
const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

/** Place a 2x2 box at (3,3) and return events. */
function placeBox(sim: Sim, c = 3, r = 3): SimEvent[] {
  sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c, r } });
  return run(sim, 1);
}

function boxLevel() {
  return tinyLevel({
    clutterDeck: ['box-o'],
    clutterPerWave: 3,
    startCrumbs: 500,
    waves: [{ entries: [{ critter: 'test-ant', count: 3, interval: 0.5, spawn: 'door', delay: 0 }] }],
  });
}

describe('Clutter placement', () => {
  it('places a tetromino from the hand, occupying cells and consuming the hand piece', () => {
    const sim = new Sim(boxLevel(), opts());
    expect(sim.state.clutterHand.length).toBe(3);
    const ev = placeBox(sim);
    expect(ev.some((e) => e.t === 'clutterPlace')).toBe(true);
    expect(sim.state.clutter.size).toBe(1);
    expect(sim.state.clutterHand.length).toBe(2);
    const piece = [...sim.state.clutter.values()][0];
    expect(piece.cells).toHaveLength(4);
  });

  it('rejects placement on occupied, static, cake, or spawn tiles', () => {
    const sim = new Sim(boxLevel(), opts());
    placeBox(sim, 3, 3);
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } }); // overlap
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 6, r: 6 } }); // cake
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 1, r: 1 } }); // spawn
    run(sim, 1);
    expect(sim.state.clutter.size).toBe(1);
  });

  it('rejects clutter overlapping the cake tile', () => {
    const sim = new Sim(boxLevel(), opts());
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 5, r: 5 } }); // would cover cake (6,6)
    run(sim, 1);
    expect(sim.state.clutter.size).toBe(0);
  });

  it('blocked-in critters chew through clutter and destroy it', () => {
    // static wall splits the room at col 4 (rows 0-5); the only gaps (4,6)+(4,7) get sealed with clutter
    const lvl = boxLevel();
    lvl.surfaces[0].blocked = [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5]];
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 4, r: 6 } }); // (4,6)(5,6)(4,7)(5,7)
    run(sim, 1);
    expect(sim.state.clutter.size).toBe(1);
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(60));
    expect(ev.some((e) => e.t === 'clutterChew')).toBe(true);
    expect(ev.some((e) => e.t === 'clutterGone')).toBe(true);
    expect(sim.state.cakeSlices).toBeLessThan(10);
  });
});

describe('Towers', () => {
  it('mounts on clutter, and (Addendum 2 §1) also floor-mounts on bare floor as a non-blocking tower', () => {
    const sim = new Sim(boxLevel(), opts());
    placeBox(sim);
    const before = sim.state.crumbs;
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } }); // on the box (clutter)
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 1, r: 5 } }); // bare floor → now OK
    const ev = run(sim, 1);
    expect(ev.filter((e) => e.t === 'towerPlace')).toHaveLength(2);
    expect(sim.state.towers.size).toBe(2);
    expect(sim.state.crumbs).toBe(before - 100);
    const clutterTw = [...sim.state.towers.values()].find((t) => t.tile.c === 3 && t.tile.r === 3)!;
    expect(clutterTw.mountClutter).not.toBe(null);
    const floorTw = [...sim.state.towers.values()].find((t) => t.tile.c === 1 && t.tile.r === 5)!;
    expect(floorTw.mountClutter).toBe(null); // floor mount = no clutter under it
  });

  it('traps place directly on walkable floor and trigger once on contact', () => {
    const sim = new Sim(boxLevel(), opts());
    // trap on the ants' first row path (flow goes +c along r=1)
    sim.command({ type: 'placeTower', def: 'test-trap', at: { s: 0, c: 4, r: 1 } });
    run(sim, 1);
    expect(sim.state.towers.size).toBe(1);
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(6));
    const trapKills = ev.filter((e) => e.t === 'die');
    expect(trapKills.length).toBe(1); // one-shot, then disarmed
    const trap = [...sim.state.towers.values()][0];
    expect(trap.armed).toBe(false);
    sim.command({ type: 'rearmTrap', towerId: trap.id });
    run(sim, 1);
    expect(sim.state.towers.get(trap.id)!.armed).toBe(true);
  });

  it('gun kills ants; bounty drops as crumb entities; kills are credited', () => {
    const sim = new Sim(boxLevel(), opts());
    placeBox(sim);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(25));
    const dies = ev.filter((e) => e.t === 'die');
    expect(dies.length).toBe(3);
    expect(ev.some((e) => e.t === 'crumbDrop')).toBe(true);
    expect(sim.state.crumbEnts.size).toBeGreaterThan(0);
    const tower = [...sim.state.towers.values()][0];
    expect(tower.kills).toBe(3);
    expect(sim.state.phase).toBe('won');
  });

  it('applies resist (x0.5), weakness (x2), and armor damage math', () => {
    // test-tank: resist swat, weak heat, armor 2, hp 200
    const sim = new Sim(boxLevel(), opts());
    const c = sim.debugSpawn('test-tank', { s: 0, c: 4, r: 4 });
    sim.debugDamage(c.id, 20, 'swat');   // 20*0.5 - 2 = 8
    sim.debugDamage(c.id, 20, 'heat');   // 20*2 - 2 = 38
    sim.debugDamage(c.id, 20, 'spray');  // 20 - 2 = 18
    const after = sim.state.critters.get(c.id)!;
    expect(after.maxHp - after.hp).toBe(8 + 38 + 18);
  });

  it('aura tower slows critters inside its range', () => {
    const sim = new Sim(boxLevel(), opts());
    placeBox(sim, 2, 0); // box near the r=1 corridor
    sim.command({ type: 'placeTower', def: 'test-freezer', at: { s: 0, c: 2, r: 0 } });
    run(sim, 1);
    sim.command({ type: 'callWave' });
    run(sim, seconds(1.5));
    const inRange = [...sim.state.critters.values()].find((c) => {
      const tw = [...sim.state.towers.values()][0];
      return Math.hypot(c.pos.x - tw.pos.x, c.pos.z - tw.pos.z) <= 2.5;
    });
    expect(inRange).toBeTruthy();
    expect(inRange!.slowPct).toBeGreaterThan(0);
  });

  it('groundOnly towers ignore fliers; hitsAir towers shoot them (after one dodge)', () => {
    const lvl = boxLevel();
    lvl.waves = [{ entries: [{ critter: 'test-fly', count: 1, interval: 1, spawn: 'door', delay: 0 }] }];
    const sim = new Sim(lvl, opts());
    placeBox(sim);
    sim.command({ type: 'placeTower', def: 'test-swatter', at: { s: 0, c: 3, r: 3 } }); // groundOnly
    run(sim, 1);
    sim.command({ type: 'callWave' });
    const evSwat = run(sim, seconds(4));
    expect(evSwat.filter((e) => e.t === 'fire')).toHaveLength(0); // swatter never targets the fly

    const sim2 = new Sim(lvl, opts());
    placeBox(sim2);
    sim2.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim2, 1);
    sim2.command({ type: 'callWave' });
    const ev2 = run(sim2, seconds(15));
    const hits = ev2.filter((e) => e.t === 'hit');
    const dies = ev2.filter((e) => e.t === 'die');
    expect(dies).toHaveLength(1);
    expect(hits).toHaveLength(2); // hp8 / dmg5 = 2 hits; first projectile was dodged
  });

  it('playDead critter fakes once (untargetable), revives, then dies for real', () => {
    const lvl = boxLevel();
    lvl.waves = [{ entries: [{ critter: 'test-roach', count: 1, interval: 1, spawn: 'door', delay: 0 }] }];
    const sim = new Sim(lvl, opts());
    placeBox(sim);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(40));
    const fakes = ev.filter((e) => e.t === 'fakeDeath');
    const dies = ev.filter((e) => e.t === 'die');
    expect(fakes).toHaveLength(1);
    expect(dies).toHaveLength(1);
  });

  it('upgrade raises tier and costs; branch unlocks at tier 3; sell refunds 90%', () => {
    const sim = new Sim(boxLevel(), opts());
    placeBox(sim);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    const c0 = sim.state.crumbs;
    sim.command({ type: 'upgradeTower', id: tw.id });   // -> tier2, cost 40
    sim.command({ type: 'upgradeTower', id: tw.id });   // -> tier3, cost 80
    sim.command({ type: 'branchTower', id: tw.id, branch: 'acid' }); // cost 100
    run(sim, 1);
    const t2 = sim.state.towers.get(tw.id)!;
    expect(t2.tier).toBe(3);
    expect(t2.branch).toBe('acid');
    expect(sim.state.crumbs).toBe(c0 - 40 - 80 - 100);
    expect(t2.invested).toBe(50 + 40 + 80 + 100);
    sim.command({ type: 'sellTower', id: tw.id });
    run(sim, 1);
    expect(sim.state.towers.size).toBe(0);
    expect(sim.state.crumbs).toBe(c0 - 220 + Math.round(270 * 0.9));
  });

  it('destroying mount clutter downs the tower (stops firing)', () => {
    const sim = new Sim(boxLevel(), opts());
    placeBox(sim);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const piece = [...sim.state.clutter.values()][0];
    sim.destroyClutter(piece.id, 'chewed');
    const tw = [...sim.state.towers.values()][0];
    expect(tw.downed).toBe(true);
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(8));
    expect(ev.filter((e) => e.t === 'fire')).toHaveLength(0);
  });
});
