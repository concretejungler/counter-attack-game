import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import type { LevelDef, SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

/**
 * A level whose authored waves already include test-spray-resist (resists 'spray', matching
 * test-gun's dmgType), test-fly (flying), and test-eater (crumbHunger) alongside plain test-ant
 * -- so the Director's "world-appropriate species" pool (drawn only from species that already
 * appear somewhere in the level's own waves) has real candidates for every augmentation branch.
 * Each of those species appears with count 0 in most waves so they don't perturb par difficulty,
 * except where a test wants them actually walking.
 */
function directorLevel(overrides: Partial<LevelDef> = {}): LevelDef {
  return tinyLevel({
    waves: [
      { entries: [{ critter: 'test-ant', count: 6, interval: 0.5, spawn: 'door', delay: 0 }] },
      { entries: [{ critter: 'test-ant', count: 6, interval: 0.5, spawn: 'door', delay: 0 }] },
      { entries: [{ critter: 'test-ant', count: 6, interval: 0.5, spawn: 'door', delay: 0 }] },
      { entries: [{ critter: 'test-ant', count: 6, interval: 0.5, spawn: 'door', delay: 0 }] },
      // these three entries exist purely to register their species in the level's world pool
      // (Director augmentation may only draw from species that appear in the level's own waves).
      { entries: [
        { critter: 'test-ant', count: 6, interval: 0.5, spawn: 'door', delay: 0 },
        { critter: 'test-spray-resist', count: 1, interval: 999, spawn: 'door', delay: 999 },
        { critter: 'test-fly', count: 1, interval: 999, spawn: 'door', delay: 999 },
        { critter: 'test-eater', count: 1, interval: 999, spawn: 'door', delay: 999 },
      ] },
    ],
    cakeSlices: 10000, // plenty of cake so a few bites never end the run early
    ...overrides,
  });
}

function place(sim: Sim, tower: string, at: { s: number; c: number; r: number }): void {
  sim.command({ type: 'placeClutter', shape: 'box-i', rot: 0, at });
  sim.tick();
  sim.command({ type: 'placeTower', def: tower, at });
  sim.tick();
}

describe('Director AI: inert unless enabled', () => {
  it('director:false produces byte-identical wave spawns to a plain Sim run (zero wave deltas)', () => {
    const level = directorLevel();
    const optsOff = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent(), director: false });
    const optsBaseline = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent() }); // director omitted entirely

    function spawnsFor(opts: SimOptions): { def: string; at: unknown }[] {
      const sim = new Sim(level, opts);
      const all: SimEvent[] = [];
      for (let w = 0; w < level.waves.length; w++) {
        sim.command({ type: 'callWave' });
        all.push(...run(sim, seconds(25)));
      }
      return all.filter((e) => e.t === 'spawn').map((e) => (e.t === 'spawn' ? { def: e.def, at: e.at } : null)) as { def: string; at: unknown }[];
    }

    const withFlagOff = spawnsFor(optsOff(11));
    const withFlagOmitted = spawnsFor(optsBaseline(11));
    expect(withFlagOff).toEqual(withFlagOmitted);
    // sanity: without a real telemetry-driving playthrough there's nothing to augment anyway,
    // but the real guarantee here is the byte-identical comparison above.
    expect(withFlagOff.length).toBeGreaterThan(0);
  });

  it('LevelDef.director can force it on even if SimOptions.director is omitted', () => {
    const level = directorLevel({ director: true });
    const sim = new Sim(level, { seed: 5, difficulty: 'houseguest', content: testContent() }); // opts.director omitted
    expect(sim.directorOn).toBe(true);
  });

  it('defaults to false when neither SimOptions nor LevelDef set it', () => {
    const level = directorLevel();
    const sim = new Sim(level, { seed: 5, difficulty: 'houseguest', content: testContent() });
    expect(sim.directorOn).toBe(false);
  });
});

describe('Director AI: augmentation', () => {
  const optsOn = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent(), director: true });

  it('augments a wave with counter-composition worth <= 25% of the authored hp-mass after spray spam', () => {
    const level = directorLevel();
    const sim = new Sim(level, optsOn(21));
    place(sim, 'test-gun', { s: 0, c: 3, r: 3 });

    // wave 1: the spray tower kills test-ants, giving damage-type telemetry a clear leader for wave 2.
    sim.command({ type: 'callWave' });
    run(sim, seconds(20));

    const authoredMass = 6 * 10; // wave 2 authored: 6x test-ant @ 10hp
    sim.command({ type: 'callWave' });
    const ev2 = run(sim, seconds(20));
    const spawns = ev2.filter((e): e is Extract<SimEvent, { t: 'spawn' }> => e.t === 'spawn');
    const content = testContent();
    let augmentedMass = 0;
    for (const s of spawns) {
      if (s.def === 'test-ant') continue; // authored species, not augmentation
      const def = content.critters[s.def];
      if (def) augmentedMass += def.hp;
    }
    expect(augmentedMass).toBeGreaterThan(0); // the augmentation actually fired
    expect(augmentedMass).toBeLessThanOrEqual(authoredMass * 0.25 + 1e-6);
    // spray-spam telemetry should have pulled in the spray-resistant species specifically
    expect(spawns.some((s) => s.def === 'test-spray-resist')).toBe(true);
  });

  it('never introduces species outside the level\'s own authored waves (world-appropriate pool only)', () => {
    const level = directorLevel();
    const sim = new Sim(level, optsOn(33));
    place(sim, 'test-gun', { s: 0, c: 3, r: 3 });
    const authoredSpecies = new Set(level.waves.flatMap((w) => w.entries.map((e) => e.critter)));

    for (let w = 0; w < level.waves.length; w++) {
      sim.command({ type: 'callWave' });
      const ev = run(sim, seconds(20));
      for (const e of ev) {
        if (e.t === 'spawn') expect(authoredSpecies.has(e.def)).toBe(true);
      }
    }
  });

  it('writes a plain-language directorNotes line when it augments', () => {
    const level = directorLevel();
    const sim = new Sim(level, optsOn(21));
    place(sim, 'test-gun', { s: 0, c: 3, r: 3 });
    sim.command({ type: 'callWave' });
    run(sim, seconds(20));
    sim.command({ type: 'callWave' });
    run(sim, seconds(20));
    expect(sim.state.recap.directorNotes.some((n) => n.length > 0)).toBe(true);
  });

  it('emits a forecast event at buildPhase previewing the next wave', () => {
    const level = directorLevel();
    const sim = new Sim(level, optsOn(21));
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(20));
    const forecast = ev.find((e) => e.t === 'forecast');
    expect(forecast).toBeTruthy();
    expect(forecast && forecast.t === 'forecast' ? forecast.text.length : 0).toBeGreaterThan(0);
  });

  it('same seed + same options produces the same augmented spawns (deterministic)', () => {
    const level = directorLevel();
    function spawnsFor(seed: number): string[] {
      const sim = new Sim(level, optsOn(seed));
      place(sim, 'test-gun', { s: 0, c: 3, r: 3 });
      const all: SimEvent[] = [];
      for (let w = 0; w < level.waves.length; w++) {
        sim.command({ type: 'callWave' });
        all.push(...run(sim, seconds(20)));
      }
      return all.filter((e) => e.t === 'spawn').map((e) => (e.t === 'spawn' ? e.def : '')).filter(Boolean);
    }
    const a = spawnsFor(77);
    const b = spawnsFor(77);
    expect(a).toEqual(b);
  });
});
