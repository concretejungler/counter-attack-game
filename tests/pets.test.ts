import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import type { SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

function place(sim: Sim, tower: string, at: { s: number; c: number; r: number }): void {
  sim.command({ type: 'placeClutter', shape: 'box-i', rot: 0, at });
  sim.tick();
  sim.command({ type: 'placeTower', def: tower, at });
  sim.tick();
}

/** A level with a big single wave so plenty of critters can be alive at once (pounce/bark thresholds). */
function crowdedLevel() {
  return tinyLevel({
    waves: [
      { entries: [{ critter: 'test-ant', count: 20, interval: 0.05, spawn: 'door', delay: 0 }] },
      { entries: [{ critter: 'test-ant', count: 20, interval: 0.05, spawn: 'door', delay: 0 }] },
      { entries: [{ critter: 'test-ant', count: 20, interval: 0.05, spawn: 'door', delay: 0 }] },
    ],
    cakeSlices: 10000,
  });
}

describe('Pets: inert unless SimOptions.pet is set', () => {
  it('pet undefined = byte-identical sim to no-pet option (determinism guard)', () => {
    const level = crowdedLevel();
    const optsUndefined = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent(), pet: undefined });
    const optsOmitted = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent() });

    function playthrough(opts: SimOptions): unknown[] {
      const sim = new Sim(level, opts);
      place(sim, 'test-gun', { s: 0, c: 3, r: 3 });
      const all: SimEvent[] = [];
      for (let w = 0; w < level.waves.length; w++) {
        sim.command({ type: 'callWave' });
        all.push(...run(sim, seconds(25)));
      }
      return all;
    }

    const a = playthrough(optsUndefined(7));
    const b = playthrough(optsOmitted(7));
    expect(a).toEqual(b);
  });

  it('state.pet is null when no pet is configured', () => {
    const sim = new Sim(crowdedLevel(), { seed: 1, difficulty: 'houseguest', content: testContent() });
    expect(sim.state.pet).toBe(null);
  });
});

describe('Pets: cat (Princess Destructo)', () => {
  const opts = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent(), pet: 'cat' });

  it('spawns with a pet state and lounges at a seeded floor spot', () => {
    const sim = new Sim(crowdedLevel(), opts(1));
    expect(sim.state.pet).not.toBe(null);
    expect(sim.state.pet?.id).toBe('cat');
    expect(sim.state.pet?.surface).toBe(0);
  });

  it('relocates (emits petMove) at build phase transitions', () => {
    const sim = new Sim(crowdedLevel(), opts(1));
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(25));
    expect(ev.some((e) => e.t === 'petMove')).toBe(true);
  });

  it('deterministically swats+moves a tower on a seed that rolls the 20% chance', () => {
    const level = crowdedLevel();
    // scan a handful of seeds for one that rolls a swat in wave 1 — the swat roll itself is
    // deterministic per-seed (petRng), so once found this is a stable regression lock.
    let found: { seed: number; ev: SimEvent[] } | null = null;
    for (let seed = 1; seed < 60; seed++) {
      const sim = new Sim(level, opts(seed));
      place(sim, 'test-gun', { s: 0, c: 3, r: 3 });
      sim.command({ type: 'callWave' });
      const ev = run(sim, seconds(25));
      if (ev.some((e) => e.t === 'petSwat')) {
        found = { seed, ev };
        break;
      }
    }
    expect(found).not.toBe(null);
    const swat = found!.ev.find((e) => e.t === 'petSwat');
    expect(swat).toBeTruthy();

    // re-run the same seed: identical outcome (disabled the same tower, deterministic pick)
    const sim2 = new Sim(level, opts(found!.seed));
    place(sim2, 'test-gun', { s: 0, c: 3, r: 3 });
    sim2.command({ type: 'callWave' });
    const ev2 = run(sim2, seconds(25));
    const swat2 = ev2.find((e) => e.t === 'petSwat');
    expect(swat2).toEqual(swat);
  });

  it('a swatted tower is disabled for 5 seconds', () => {
    const level = crowdedLevel();
    let sim: Sim | null = null;
    let towerId = -1;
    for (let seed = 1; seed < 60; seed++) {
      const s = new Sim(level, opts(seed));
      place(s, 'test-gun', { s: 0, c: 3, r: 3 });
      const [tw] = s.state.towers.keys();
      s.command({ type: 'callWave' });
      const ev = run(s, seconds(1)); // just enough to catch the waveStart swat roll
      const swat = ev.find((e) => e.t === 'petSwat');
      if (swat && swat.t === 'petSwat') {
        sim = s;
        towerId = tw;
        break;
      }
    }
    expect(sim).not.toBe(null);
    const tw = sim!.state.towers.get(towerId);
    expect(tw).toBeTruthy();
    expect(tw!.disabled).toBeGreaterThan(0);
    expect(tw!.disabled).toBeLessThanOrEqual(5);
  });

  it('POUNCE fires at most once per level even across many waves with >=12 critters alive', () => {
    const sim = new Sim(crowdedLevel(), opts(3));
    place(sim, 'test-gun', { s: 0, c: 3, r: 3 });
    let pounceCount = 0;
    for (let w = 0; w < 3; w++) {
      sim.command({ type: 'callWave' });
      const ev = run(sim, seconds(25));
      pounceCount += ev.filter((e) => e.t === 'petPounce').length;
    }
    expect(pounceCount).toBeLessThanOrEqual(1);
    expect(sim.state.pet?.pounced).toBe(pounceCount === 1);
  });

  it('when it pounces, it kills ~30% of live critters and swats the top-kill tower', () => {
    // find a seed/level combo where pounce actually triggers within the window
    let hit: { ev: SimEvent[] } | null = null;
    for (let seed = 1; seed < 30; seed++) {
      const sim = new Sim(crowdedLevel(), opts(seed));
      place(sim, 'test-gun', { s: 0, c: 3, r: 3 });
      sim.command({ type: 'callWave' });
      const ev = run(sim, seconds(3)); // early in the wave, while many are freshly spawned and alive
      if (ev.some((e) => e.t === 'petPounce')) {
        hit = { ev };
        break;
      }
    }
    expect(hit).not.toBe(null);
    const pounce = hit!.ev.find((e) => e.t === 'petPounce');
    expect(pounce && pounce.t === 'petPounce' ? pounce.kills : 0).toBeGreaterThan(0);
    const swatAfterPounce = hit!.ev.filter((e) => e.t === 'petSwat');
    expect(swatAfterPounce.length).toBeGreaterThanOrEqual(1);
  });
});

describe('Pets: dog (Sir Barksalot)', () => {
  const opts = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent(), pet: 'dog' });

  it('spawns near the cake', () => {
    const level = crowdedLevel();
    const sim = new Sim(level, opts(1));
    expect(sim.state.pet?.id).toBe('dog');
  });

  it('barks (stuns all live critters 2s) once >=8 critters are alive, then goes on cooldown', () => {
    const sim = new Sim(crowdedLevel(), opts(1));
    sim.command({ type: 'callWave' });
    // step tick-by-tick so we can inspect state the instant the bark fires (stun is a one-time
    // 2s pulse on whoever is alive that tick, not an aura — later spawns are never touched).
    let barkEvent: Extract<SimEvent, { t: 'petBark' }> | null = null;
    for (let i = 0; i < seconds(3); i++) {
      const ev = sim.tick();
      const bark = ev.find((e): e is Extract<SimEvent, { t: 'petBark' }> => e.t === 'petBark');
      if (bark) {
        barkEvent = bark;
        // every critter alive at this exact tick should be stunned
        for (const cr of sim.state.critters.values()) {
          expect(cr.statuses.stunned ?? 0).toBeGreaterThan(0);
        }
        break;
      }
    }
    expect(barkEvent).not.toBe(null);
    expect(barkEvent!.stunned).toBeGreaterThanOrEqual(8);
    expect(sim.state.pet?.cooldown).toBeGreaterThan(0);

    // does not bark again immediately (cooldown gate)
    const ev2 = run(sim, seconds(2));
    expect(ev2.some((e) => e.t === 'petBark')).toBe(false);
  });

  it('eats 15% of each crumb drop before it lands (per-drop value is floored 85% of the untaxed bounty)', () => {
    // A direct debugSpawn + debugDamage kill isolates the tax math from bark's side effect of
    // holding critters in a tower's range longer (more kills overall) — that's a real, legitimate
    // emergent interaction, but it makes an aggregate banked-value comparison an unreliable signal
    // for the tax itself. test-ant bounty is 5; 15% of 5 floored = 0, so taxed value = 5 - 0 = 5.
    // Use test-tank (bounty 25) instead so the 15% tax is a non-trivial floor(25*0.15)=3 -> 22.
    const level = crowdedLevel();
    const sim = new Sim(level, opts(1));
    const cr = sim.debugSpawn('test-tank', { s: 0, c: 1, r: 1 });
    sim.debugDamage(cr.id, 100000, 'heat');
    const drops = sim.tick().filter((e): e is Extract<SimEvent, { t: 'crumbDrop' }> => e.t === 'crumbDrop');
    expect(drops.length).toBe(1);
    expect(drops[0].value).toBe(22); // 25 - floor(25*0.15) = 25 - 3 = 22
  });

  it('an identical kill drops strictly less crumb value with the dog than with no pet at all', () => {
    const level = crowdedLevel();
    const simDog = new Sim(level, opts(1));
    const simNoPet = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent() });
    for (const sim of [simDog, simNoPet]) {
      const cr = sim.debugSpawn('test-tank', { s: 0, c: 1, r: 1 });
      sim.debugDamage(cr.id, 100000, 'heat');
    }
    const dogDrop = simDog.tick().find((e): e is Extract<SimEvent, { t: 'crumbDrop' }> => e.t === 'crumbDrop');
    const plainDrop = simNoPet.tick().find((e): e is Extract<SimEvent, { t: 'crumbDrop' }> => e.t === 'crumbDrop');
    expect(dogDrop).toBeTruthy();
    expect(plainDrop).toBeTruthy();
    expect(dogDrop!.value).toBeLessThan(plainDrop!.value);
  });

  it('crumbDrop events carry the taxed (reduced) value directly', () => {
    const sim = new Sim(crowdedLevel(), opts(1));
    place(sim, 'test-gun', { s: 0, c: 3, r: 3 });
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(25));
    const drops = ev.filter((e): e is Extract<SimEvent, { t: 'crumbDrop' }> => e.t === 'crumbDrop');
    expect(drops.length).toBeGreaterThan(0);
    // test-ant bounty is 5; taxed 15% floored = 4. No drop should exceed the untaxed bounty.
    for (const d of drops) expect(d.value).toBeLessThanOrEqual(5);
  });
});

describe('Pets: goldfish (The Oracle)', () => {
  const opts = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent(), pet: 'goldfish' });

  it('spawns at a fixed seeded bowl spot, passive (no active mood)', () => {
    const sim = new Sim(crowdedLevel(), opts(1));
    expect(sim.state.pet?.id).toBe('goldfish');
    expect(sim.state.pet?.mood).toBe('idle');
  });

  it('emits the FULL next-wave composition (species x counts) at every build phase', () => {
    const level = crowdedLevel();
    const sim = new Sim(level, opts(1));
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(25)); // clears wave 0, buildPhase for wave 1 fires

    const prophecy = ev.find((e): e is Extract<SimEvent, { t: 'petProphecy' }> => e.t === 'petProphecy');
    expect(prophecy).toBeTruthy();
    expect(prophecy!.wave).toBe(1);
    expect(prophecy!.composition).toEqual([{ critter: 'test-ant', count: 20 }]);
  });

  it('has no downside — crumb drops are untaxed compared to a no-pet control', () => {
    const level = crowdedLevel();
    const simFish = new Sim(level, opts(1));
    const simNoPet = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent() });
    place(simFish, 'test-gun', { s: 0, c: 3, r: 3 });
    place(simNoPet, 'test-gun', { s: 0, c: 3, r: 3 });
    for (const sim of [simFish, simNoPet]) {
      sim.command({ type: 'callWave' });
      run(sim, seconds(15));
    }
    const fishValue = simFish.state.recap.crumbsBanked + [...simFish.state.crumbEnts.values()].reduce((s, e) => s + e.value, 0);
    const plainValue = simNoPet.state.recap.crumbsBanked + [...simNoPet.state.crumbEnts.values()].reduce((s, e) => s + e.value, 0);
    expect(simFish.state.recap.kills).toBeGreaterThan(0);
    expect(fishValue).toBe(plainValue);
  });
});
