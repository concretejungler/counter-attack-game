import { describe, it, expect } from 'vitest';
import { Sim, serializeSim, SIM_DT } from '../src/sim/sim';
import type { SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, twoSurfaceLevel, testContent } from './fixtures';

function opts(seed = 42): SimOptions {
  return { seed, difficulty: 'houseguest', content: testContent() };
}

/** Run n ticks, collecting all events. */
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

const seconds = (s: number) => Math.round(s / SIM_DT);

describe('Sim core (Cycle A)', () => {
  it('starts in build phase with starting crumbs', () => {
    const sim = new Sim(tinyLevel(), opts());
    expect(sim.state.phase).toBe('build');
    expect(sim.state.crumbs).toBe(100);
    expect(sim.state.cakeSlices).toBe(10);
  });

  it('is deterministic: same seed + commands → identical state; different seed differs', () => {
    const lvl = () => tinyLevel({ clutterDeck: ['box-o'], clutterPerWave: 3, startCrumbs: 500 });
    const script = (sim: Sim) => {
      sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } });
      sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
      sim.command({ type: 'callWave' });
      run(sim, seconds(4));
      sim.command({ type: 'sweep', surface: 0, x: 4, z: 2, radius: 3 });
      run(sim, seconds(4));
    };
    const a = new Sim(lvl(), opts(7));
    const b = new Sim(lvl(), opts(7));
    const c = new Sim(lvl(), opts(8));
    script(a); script(b); script(c);
    expect(serializeSim(a)).toEqual(serializeSim(b));
    expect(serializeSim(a)).not.toEqual(serializeSim(c));
  });

  it('callWave starts assault and spawns critters on schedule', () => {
    const sim = new Sim(tinyLevel(), opts());
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(0.1));
    expect(ev.some((e) => e.t === 'waveStart')).toBe(true);
    expect(sim.state.phase).toBe('assault');
    // 3 ants at 0.5s interval → all out by 1.2s
    run(sim, seconds(1.2));
    expect(sim.state.critters.size).toBe(3);
  });

  it('critters walk toward the cake', () => {
    const sim = new Sim(tinyLevel(), opts());
    sim.command({ type: 'callWave' });
    run(sim, seconds(0.5));
    const c0 = [...sim.state.critters.values()][0];
    const cakePos = { x: 6.5, z: 6.5 };
    const d0 = Math.hypot(c0.pos.x - cakePos.x, c0.pos.z - cakePos.z);
    run(sim, seconds(1.5));
    const c1 = sim.state.critters.get(c0.id)!;
    const d1 = Math.hypot(c1.pos.x - cakePos.x, c1.pos.z - cakePos.z);
    expect(d1).toBeLessThan(d0);
  });

  it('critter bites cake, then flees to exit and leaks', () => {
    const lvl = tinyLevel({
      waves: [{ entries: [{ critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 }] }],
    });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(25));
    expect(ev.some((e) => e.t === 'cakeBite')).toBe(true);
    expect(sim.state.cakeSlices).toBe(9);
    expect(ev.some((e) => e.t === 'leak')).toBe(true);
    expect(sim.state.critters.size).toBe(0);
  });

  it('wins when all waves done and board clear (bites tracked)', () => {
    const lvl = tinyLevel({
      waves: [{ entries: [{ critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 }] }],
    });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(30));
    const won = ev.find((e) => e.t === 'won');
    expect(won).toBeTruthy();
    expect(sim.state.phase).toBe('won');
  });

  it('loses when the cake is devoured', () => {
    const lvl = tinyLevel({
      cakeSlices: 1,
      waves: [{ entries: [{ critter: 'test-ant', count: 2, interval: 0.5, spawn: 'door', delay: 0 }] }],
    });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(30));
    const lost = ev.find((e) => e.t === 'lost');
    expect(lost).toBeTruthy();
    expect(lost && lost.t === 'lost' ? lost.reason : null).toBe('cakeDevoured');
    expect(sim.state.phase).toBe('lost');
  });

  it('critters climb to elevated surfaces via climb links', () => {
    const sim = new Sim(twoSurfaceLevel(), opts());
    sim.command({ type: 'callWave' });
    run(sim, seconds(30));
    // the two ants must have reached surface 1 at some point: cake got bitten
    expect(sim.state.cakeSlices).toBeLessThan(10);
  });

  it('build phase between waves auto-calls after timer; early call banks bonus crumbs', () => {
    const sim = new Sim(tinyLevel(), opts());
    sim.command({ type: 'callWave' });
    run(sim, seconds(30)); // wave 1 done (ants bite + leave), back in build
    expect(sim.state.phase).toBe('build');
    expect(sim.state.waveIndex).toBe(0);
    const crumbsBefore = sim.state.crumbs;
    sim.command({ type: 'callWave' }); // early call with timer remaining
    const ev = run(sim, seconds(0.1));
    const clear = ev.find((e) => e.t === 'waveStart');
    expect(clear).toBeTruthy();
    expect(sim.state.crumbs).toBeGreaterThan(crumbsBefore);
  });

  it('mutation draft: offer after configured wave, blocks next wave until picked, applies mods', () => {
    const lvl = tinyLevel({
      mutationWaves: [1],
      waves: [
        { entries: [{ critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 }] },
        { entries: [{ critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 }] },
      ],
    });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(30));
    const offer = ev.find((e) => e.t === 'mutationOffer');
    expect(offer).toBeTruthy();
    expect(sim.state.mutationOffer).not.toBe(null);
    // callWave is ignored while offer pending
    sim.command({ type: 'callWave' });
    run(sim, seconds(1));
    expect(sim.state.phase).toBe('build');
    // pick the hp mutation, then next wave critters have +50% hp
    sim.command({ type: 'pickMutation', id: 'mut-hp' });
    run(sim, seconds(0.1));
    expect(sim.state.mutations).toContain('mut-hp');
    sim.command({ type: 'callWave' });
    run(sim, seconds(1.5));
    const critter = [...sim.state.critters.values()][0];
    expect(critter.maxHp).toBe(15); // 10 * 1.5
  });

  it('scent history is sampled into recap', () => {
    const sim = new Sim(tinyLevel(), opts());
    run(sim, seconds(5));
    expect(sim.state.recap.scentHistory.length).toBeGreaterThanOrEqual(4);
  });
});
