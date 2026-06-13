import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import type { SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, twoSurfaceLevel, testContent } from './fixtures';

const opts = (seed = 42): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent() });
const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

describe('Hand of the Homeowner', () => {
  it('flick consumes a charge, flings the critter, and charges regenerate', () => {
    const sim = new Sim(tinyLevel(), opts());
    const cr = sim.debugSpawn('test-ant', { s: 0, c: 3, r: 3 });
    const x0 = cr.pos.x;
    sim.command({ type: 'flick', critterId: cr.id, dir: { x: 1, z: 0 }, power: 8 });
    run(sim, 1);
    expect(sim.state.hand.flickCharges).toBe(2);
    run(sim, seconds(1.2)); // let it fly + land
    const after = sim.state.critters.get(cr.id);
    expect(after && after.pos.x - x0).toBeGreaterThan(1);
    run(sim, seconds(21));
    expect(sim.state.hand.flickCharges).toBe(3);
  });

  it('flicking a critter off an elevated surface causes a lethal fall', () => {
    const sim = new Sim(twoSurfaceLevel(), opts());
    const cr = sim.debugSpawn('test-ant', { s: 1, c: 3, r: 1 }); // near the counter rim (y=3)
    sim.command({ type: 'flick', critterId: cr.id, dir: { x: 1, z: 0 }, power: 10 });
    const ev = run(sim, seconds(3));
    expect(ev.some((e) => e.t === 'fall')).toBe(true);
    const die = ev.find((e) => e.t === 'die');
    expect(die && die.t === 'die' ? die.cause : null).toBe('fall');
  });

  it('squash kills small critters with a cooldown; big critters are immune', () => {
    const sim = new Sim(tinyLevel(), opts());
    const big = sim.debugSpawn('test-tank', { s: 0, c: 5, r: 3 });
    // big critters never squash — and an invalid target does not consume the cooldown
    sim.command({ type: 'squash', critterId: big.id });
    run(sim, 1);
    expect(sim.state.critters.has(big.id)).toBe(true);
    expect(sim.state.hand.squashCd).toBe(0);
    // smalls spawn far from the cake so they stay alive through the cooldown wait
    const small1 = sim.debugSpawn('test-ant', { s: 0, c: 0, r: 7 });
    const small2 = sim.debugSpawn('test-ant', { s: 0, c: 0, r: 6 });
    sim.command({ type: 'squash', critterId: small1.id });
    const ev = run(sim, 1);
    const die = ev.find((e) => e.t === 'die');
    expect(die && die.t === 'die' ? die.cause : null).toBe('squash');
    // cooldown blocks the immediate second squash
    sim.command({ type: 'squash', critterId: small2.id });
    run(sim, 1);
    expect(sim.state.critters.has(small2.id)).toBe(true);
    // after cooldown it works
    run(sim, seconds(6.2));
    sim.command({ type: 'squash', critterId: small2.id });
    run(sim, 1);
    expect(sim.state.critters.has(small2.id)).toBe(false);
  });

  it('carry takes the tower offline, drop re-mounts it elsewhere', () => {
    const lvl = tinyLevel({ clutterDeck: ['box-o'], clutterPerWave: 3, startCrumbs: 500 });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } });
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 5, r: 0 } });
    run(sim, 1);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    sim.command({ type: 'carryStart', towerId: tw.id });
    run(sim, 1);
    expect(sim.state.towers.get(tw.id)!.carried).toBe(true);
    expect(sim.state.hand.carrying).toBe(tw.id);
    sim.command({ type: 'carryDrop', at: { s: 0, c: 5, r: 0 } });
    run(sim, 1);
    const moved = sim.state.towers.get(tw.id)!;
    expect(moved.carried).toBe(false);
    expect(moved.tile).toEqual({ s: 0, c: 5, r: 0 });
    expect(sim.state.hand.carrying).toBe(null);
    expect(sim.state.hand.carryCd).toBeGreaterThan(0);
  });

  it('high-five grants a morale buff', () => {
    const lvl = tinyLevel({ clutterDeck: ['box-o'], clutterPerWave: 3, startCrumbs: 500 });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    sim.command({ type: 'highFive', towerId: tw.id });
    const ev = run(sim, 1);
    expect(ev.some((e) => e.t === 'highFive' && e.hit)).toBe(true);
    expect(sim.state.towers.get(tw.id)!.moraleT).toBeGreaterThan(0);
  });
});

describe('Spells', () => {
  it('bolt costs mana, damages critters in radius, and respects cooldown', () => {
    const sim = new Sim(tinyLevel(), opts());
    sim.state.mana = 50;
    const a = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 4 });
    const b = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 5 });
    const far = sim.debugSpawn('test-ant', { s: 0, c: 0, r: 0 });
    sim.command({ type: 'castSpell', spell: 'test-bolt', surface: 0, x: 4.5, z: 4.7 });
    const ev = run(sim, 1);
    expect(ev.some((e) => e.t === 'spellCast')).toBe(true);
    expect(sim.state.critters.has(a.id)).toBe(false);
    expect(sim.state.critters.has(b.id)).toBe(false);
    expect(sim.state.critters.has(far.id)).toBe(true);
    expect(sim.state.mana).toBe(32); // 50 - 20 cost + 2 kill-mana
    // cooldown: immediate recast fizzles
    sim.command({ type: 'castSpell', spell: 'test-bolt', surface: 0, x: 0.5, z: 0.5 });
    run(sim, 1);
    expect(sim.state.critters.has(far.id)).toBe(true);
    expect(sim.state.mana).toBe(32);
  });

  it('lane spell sweeps a full column', () => {
    const sim = new Sim(tinyLevel(), opts());
    sim.state.mana = 100;
    const a = sim.debugSpawn('test-ant', { s: 0, c: 3, r: 0 });
    const b = sim.debugSpawn('test-ant', { s: 0, c: 3, r: 7 });
    const c = sim.debugSpawn('test-ant', { s: 0, c: 6, r: 4 });
    sim.command({ type: 'castSpell', spell: 'test-lane', surface: 0, x: 3.5, z: 4 });
    run(sim, 1);
    expect(sim.state.critters.has(a.id)).toBe(false);
    expect(sim.state.critters.has(b.id)).toBe(false);
    expect(sim.state.critters.has(c.id)).toBe(true);
  });
});

describe('No wall-clock in sim', () => {
  it('src/sim and src/content never use Math.random or Date.now', async () => {
    const { readdirSync, readFileSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dirs = ['src/sim', 'src/content'].filter((d) => existsSync(d));
    const offenders: string[] = [];
    for (const dir of dirs) {
      for (const f of readdirSync(dir, { recursive: true }) as string[]) {
        if (!f.toString().endsWith('.ts')) continue;
        const text = readFileSync(join(dir, f.toString()), 'utf8');
        if (/Math\.random|Date\.now|new Date\(/.test(text)) offenders.push(`${dir}/${f}`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
