import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import type { CrumbEnt, SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, twoSurfaceLevel, testContent } from './fixtures';

const opts = (seed = 42): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent() });

function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

/** Seed a resting crumb directly (same trick the jarring/economy suites use). */
function seedCrumb(sim: Sim, id: number, x: number, z: number, value: number, surface = 0): CrumbEnt {
  const ent: CrumbEnt = { id, pos: { x, y: 0, z }, surface, value, sweepT: 0 };
  sim.state.crumbEnts.set(id, ent);
  return ent;
}

const dist = (a: { x: number; z: number }, x: number, z: number) => Math.hypot(a.x - x, a.z - z);

describe('Hand-magnet crumb attraction', () => {
  // ---------- (a) inert without handMove: byte-identical crumb positions ----------
  it('never moves crumbs when no handMove command is sent (byte-identical over 100 ticks)', () => {
    const sim = new Sim(tinyLevel({ startCrumbs: 0 }), opts());
    seedCrumb(sim, 9001, 2, 2, 20);
    seedCrumb(sim, 9002, 5.5, 4.5, 20);
    run(sim, 100);
    expect(sim.state.handMagnet).toBeNull();
    const a = sim.state.crumbEnts.get(9001)!;
    const b = sim.state.crumbEnts.get(9002)!;
    // resting crumbs stay EXACTLY put — no drift, no bank, no sweep bookkeeping touched
    expect(a.pos.x).toBe(2);
    expect(a.pos.z).toBe(2);
    expect(b.pos.x).toBe(5.5);
    expect(b.pos.z).toBe(4.5);
    expect(sim.state.crumbs).toBe(0);
    expect(sim.state.recap.crumbsBanked).toBe(0);
    expect(sim.state.recap.sweeps).toBe(0);
  });

  // ---------- (b) closer = faster ----------
  it('pulls nearer crumbs faster than farther ones, both toward the hand', () => {
    const sim = new Sim(tinyLevel({ startCrumbs: 0 }), opts());
    const near = seedCrumb(sim, 9101, 4, 6, 20); // d=2 from magnet
    const far = seedCrumb(sim, 9102, 7, 7, 20);  // d~4.24 from magnet
    const near0 = dist(near.pos, 4, 4);
    const far0 = dist(far.pos, 4, 4);
    sim.command({ type: 'handMove', surface: 0, x: 4, z: 4 });
    run(sim, 5); // within the freshness window; neither reaches contact yet
    const nearGain = near0 - dist(near.pos, 4, 4);
    const farGain = far0 - dist(far.pos, 4, 4);
    expect(nearGain).toBeGreaterThan(0);              // both drift inward
    expect(farGain).toBeGreaterThan(0);
    expect(nearGain).toBeGreaterThan(farGain);        // closer crumb moves faster
    expect(dist(far.pos, 4, 4)).toBeGreaterThan(3);   // far crumb only drifts slowly
  });

  // ---------- (b) contact auto-banks with sweep-identical bookkeeping ----------
  it('auto-banks on contact with crumb/mana/scent accounting identical to a sweep', () => {
    const V = 33;
    // magnet run: crumb drifts in and banks itself (no click)
    const magSim = new Sim(tinyLevel({ startCrumbs: 0 }), opts());
    seedCrumb(magSim, 9201, 4.6, 4, V);
    magSim.command({ type: 'handMove', surface: 0, x: 4.5, z: 4 });
    const magEv = run(magSim, 20);

    // sweep baseline: same crumb, one manual sweep of it
    const swSim = new Sim(tinyLevel({ startCrumbs: 0 }), opts());
    seedCrumb(swSim, 9201, 4.6, 4, V);
    swSim.command({ type: 'sweep', surface: 0, x: 4.5, z: 4, radius: 1.2 });
    run(swSim, 1);

    expect(magSim.state.crumbEnts.size).toBe(0);
    expect(magSim.state.crumbs).toBe(swSim.state.crumbs);
    expect(magSim.state.crumbs).toBe(V);
    expect(magSim.state.mana).toBe(swSim.state.mana);
    expect(magSim.state.recap.crumbsBanked).toBe(swSim.state.recap.crumbsBanked);
    expect(magSim.state.recap.sweeps).toBe(swSim.state.recap.sweeps); // one bank == one sweep
    const bank = magEv.find((e) => e.t === 'crumbBank');
    expect(bank && bank.t === 'crumbBank' ? bank.amount : 0).toBe(V);
  });

  // ---------- (b) cross-surface crumbs are untouched ----------
  it('only attracts crumbs on the hovered surface', () => {
    const sim = new Sim(twoSurfaceLevel({ startCrumbs: 0 }), opts());
    const other = seedCrumb(sim, 9301, 3, 3, 20, 1); // surface 1
    sim.command({ type: 'handMove', surface: 0, x: 3, z: 3 });
    run(sim, 10);
    // the magnet hovers surface 0; the surface-1 crumb never budges
    expect(other.pos.x).toBe(3);
    expect(other.pos.z).toBe(3);
    expect(sim.state.crumbEnts.has(9301)).toBe(true);
  });

  // ---------- (c) staleness: attraction stops ~15 ticks after the last handMove ----------
  it('stops attracting ~15 ticks after the last handMove', () => {
    const sim = new Sim(tinyLevel({ startCrumbs: 0 }), opts());
    const far = seedCrumb(sim, 9401, 7, 7, 20); // far enough it never reaches contact in-window
    const start = { x: far.pos.x, z: far.pos.z };
    sim.command({ type: 'handMove', surface: 0, x: 4, z: 4 });
    run(sim, 16); // freshness window is inclusive of offset 0..15
    const moved = { x: far.pos.x, z: far.pos.z };
    // it drifted while fresh
    expect(moved.x).toBeLessThan(start.x);
    expect(moved.z).toBeLessThan(start.z);
    // now go stale — no further handMove
    run(sim, 30);
    expect(far.pos.x).toBe(moved.x); // frozen: attraction lapsed
    expect(far.pos.z).toBe(moved.z);
    expect(sim.state.crumbEnts.has(9401)).toBe(true); // never banked
  });
});
