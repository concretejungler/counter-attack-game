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

describe('Crumb economy & scent', () => {
  it('sweeping banks crumb value within radius and builds mana', () => {
    const sim = new Sim(tinyLevel({ startCrumbs: 0 }), opts());
    sim.dropCrumbs({ x: 4.5, y: 0, z: 4.5 }, 0, 30);
    sim.dropCrumbs({ x: 5.0, y: 0, z: 4.5 }, 0, 10);
    sim.dropCrumbs({ x: 1.0, y: 0, z: 1.0 }, 0, 99); // far away — not swept
    sim.command({ type: 'sweep', surface: 0, x: 4.6, z: 4.5, radius: 1.2 });
    const ev = run(sim, 1);
    const bank = ev.find((e) => e.t === 'crumbBank');
    expect(bank && bank.t === 'crumbBank' ? bank.amount : 0).toBe(40);
    expect(sim.state.crumbs).toBe(40);
    expect(sim.state.crumbEnts.size).toBe(1);
    expect(sim.state.mana).toBeGreaterThan(0);
    expect(sim.state.recap.sweeps).toBe(1);
    expect(sim.state.recap.crumbsBanked).toBe(40);
  });

  it('uncollected crumbs raise scent across thresholds; sweeping lowers it', () => {
    const sim = new Sim(tinyLevel(), opts());
    sim.dropCrumbs({ x: 4, y: 0, z: 4 }, 0, 70); // target 35%
    const ev = run(sim, seconds(4));
    expect(ev.some((e) => e.t === 'scentThreshold' && e.threshold === 25 && e.rising)).toBe(true);
    expect(sim.state.scent).toBeGreaterThanOrEqual(30);
    sim.command({ type: 'sweep', surface: 0, x: 4, z: 4, radius: 2 });
    const ev2 = run(sim, seconds(6));
    expect(ev2.some((e) => e.t === 'scentThreshold' && e.threshold === 25 && !e.rising)).toBe(true);
    expect(sim.state.scent).toBeLessThan(25);
  });

  it('waves grow when scent >= 25 at call time', () => {
    const sim = new Sim(tinyLevel(), opts());
    sim.dropCrumbs({ x: 4, y: 0, z: 4 }, 0, 200); // pin scent high
    run(sim, seconds(5));
    expect(sim.state.scent).toBeGreaterThanOrEqual(25);
    sim.command({ type: 'callWave' });
    run(sim, seconds(3));
    // wave 1 defines 3 ants; ceil(3 * 1.1) = 4
    expect(sim.state.critters.size).toBe(4);
  });

  it('scent >= 50 during build spawns scouts between waves', () => {
    const sim = new Sim(tinyLevel(), opts());
    sim.dropCrumbs({ x: 4, y: 0, z: 4 }, 0, 250);
    const ev = run(sim, seconds(14));
    expect(ev.some((e) => e.t === 'scoutSpawn')).toBe(true);
    expect(sim.state.critters.size).toBeGreaterThan(0);
  });

  it('hungry critters eat crumbs off the board and evolve', () => {
    const lvl = tinyLevel({
      waves: [{ entries: [{ critter: 'test-eater', count: 1, interval: 1, spawn: 'door', delay: 0 }] }],
    });
    const sim = new Sim(lvl, opts());
    // crumbs directly on the ant's corridor (flow runs +c along r=1)
    sim.dropCrumbs({ x: 3.5, y: 0, z: 1.5 }, 0, 12);
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(6));
    expect(ev.some((e) => e.t === 'crumbEaten')).toBe(true);
    const evo = ev.find((e) => e.t === 'evolve');
    expect(evo).toBeTruthy();
    expect(evo && evo.t === 'evolve' ? evo.into : '').toBe('test-tank');
    const evolved = [...sim.state.critters.values()][0];
    expect(evolved.def).toBe('test-tank');
    expect(sim.state.recap.crumbsWasted).toBe(12);
  });

  it('thief steals a slice; killing it recovers the slice; escaping loses it', () => {
    const lvl = tinyLevel({
      startCrumbs: 500,
      clutterDeck: ['box-o'],
      waves: [{ entries: [{ critter: 'test-thief', count: 1, interval: 1, spawn: 'door', delay: 0 }] }],
    });
    const sim = new Sim(lvl, opts());
    // gun covering the cake approach
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 4, r: 5 } });
    run(sim, 1);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 4, r: 5 } });
    run(sim, 1);
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(30));
    expect(ev.some((e) => e.t === 'sliceStolen')).toBe(true);
    expect(ev.some((e) => e.t === 'sliceRecovered')).toBe(true);
    expect(sim.state.cakeSlices).toBe(10);

    // without defense, the slice is gone for good
    const sim2 = new Sim(lvl, opts());
    sim2.command({ type: 'callWave' });
    const ev2 = run(sim2, seconds(30));
    expect(ev2.some((e) => e.t === 'sliceStolen')).toBe(true);
    expect(ev2.some((e) => e.t === 'leak')).toBe(true);
    expect(sim2.state.cakeSlices).toBe(9);
    expect(sim2.state.phase).toBe('won'); // wave over, thief gone
  });

  it('stealing the LAST slice is not instant loss while the thief still lives', () => {
    const lvl = tinyLevel({
      cakeSlices: 1,
      waves: [{ entries: [{ critter: 'test-thief', count: 1, interval: 1, spawn: 'door', delay: 0 }] }],
    });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'callWave' });
    // run until the steal happens
    let stolen = false;
    for (let i = 0; i < seconds(20) && !stolen; i++) {
      stolen = sim.tick().some((e) => e.t === 'sliceStolen');
    }
    expect(stolen).toBe(true);
    expect(sim.state.phase).toBe('assault'); // chase is still on!
    // thief escapes → now it's a loss
    run(sim, seconds(20));
    expect(sim.state.phase).toBe('lost');
  });
});
