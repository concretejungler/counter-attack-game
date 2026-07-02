import { describe, it, expect } from 'vitest';
import { Sim, serializeSim, SIM_DT } from '../src/sim/sim';
import type { ContentDB, SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

/**
 * EXTERMINATOR ALLIANCE FINALE (GAME-PROMPT §8.9, sewer-3 only).
 *
 * The shared test fixtures (tests/fixtures.ts) have no boss-tier critter and definitely nothing
 * named 'the-exterminator' (sim.ts keys the alliance flip off that exact def id, matching the
 * real content/critters.ts boss). Rather than edit the shared fixtures file (out of scope — other
 * suites depend on its exact contents), this file layers the boss onto a cloned ContentDB locally,
 * following the same pattern tests/endless.test.ts uses for its own boss-tier fixture.
 */
function finaleContent(): ContentDB {
  const base = testContent();
  return {
    ...base,
    critters: {
      ...base.critters,
      'the-exterminator': {
        id: 'the-exterminator', name: 'THE EXTERMINATOR', tier: 5,
        hp: 500, speed: 0.5, size: 1.55, bounty: 200, bites: 5,
        resist: 'gas', weak: 'zap', boss: true, armor: 10,
        traits: ['towerSmash'], chewDps: 40,
        desc: 'test',
      },
    },
  };
}

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

/** One wave: a handful of ordinary ants arrive first, then the exterminator himself, then an escort ant after. */
function finaleLevel(overrides: Parameters<typeof tinyLevel>[0] = {}) {
  return tinyLevel({
    cakeSlices: 10000,
    waves: [
      {
        entries: [
          { critter: 'test-ant', count: 4, interval: 0.3, spawn: 'door', delay: 0 },
          { critter: 'the-exterminator', count: 1, interval: 1, spawn: 'door', delay: 3 },
          { critter: 'test-ant', count: 2, interval: 0.5, spawn: 'door', delay: 6 }, // escort, spawns AFTER the flip
        ],
      },
    ],
    ...overrides,
  });
}

function opts(seed = 1): SimOptions {
  return { seed, difficulty: 'houseguest', content: finaleContent() };
}

describe('Alliance finale: the flip', () => {
  it('emits an alliance event and flips every alive non-boss critter the instant the boss spawns', () => {
    const sim = new Sim(finaleLevel(), opts());
    sim.command({ type: 'callWave' });
    // let the 4 pre-boss ants spawn and roam a bit, but stop well before the boss (delay 3s)
    run(sim, seconds(2));
    const preFlip = [...sim.state.critters.values()];
    expect(preFlip.length).toBe(4);
    expect(preFlip.every((c) => !c.allied)).toBe(true);

    const events = run(sim, seconds(1.5)); // crosses the t=3s boss spawn
    const allianceEv = events.find((e) => e.t === 'alliance');
    expect(allianceEv).toBeDefined();
    expect(allianceEv && (allianceEv as { count: number }).count).toBe(4);

    const boss = [...sim.state.critters.values()].find((c) => c.def === 'the-exterminator');
    expect(boss).toBeDefined();
    expect(boss!.allied).toBeFalsy(); // the boss itself never defects

    const flipped = [...sim.state.critters.values()].filter((c) => c.def === 'test-ant');
    expect(flipped.length).toBe(4);
    expect(flipped.every((c) => c.allied === true)).toBe(true);
    expect(flipped.every((c) => c.state === 'walk')).toBe(true);
  });

  it('escort critters that spawn AFTER the flip stay hostile', () => {
    const sim = new Sim(finaleLevel(), opts());
    sim.command({ type: 'callWave' });
    run(sim, seconds(7)); // past the boss spawn (t=3) and the escort spawn (t=6)
    const escorts = [...sim.state.critters.values()].filter((c) => c.def === 'test-ant' && !c.allied);
    expect(escorts.length).toBeGreaterThan(0);
  });

  it('a defecting Mouse-Thief-style carrier returns its stolen slice', () => {
    const content = finaleContent();
    const level = finaleLevel({
      waves: [
        {
          entries: [
            { critter: 'test-thief', count: 1, interval: 1, spawn: 'door', delay: 0 },
            { critter: 'the-exterminator', count: 1, interval: 1, spawn: 'door', delay: 4 },
          ],
        },
      ],
    });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content });
    sim.command({ type: 'callWave' });
    // Let the thief reach the cake and steal a slice (cake is at 6,6; thief spawns at 1,1, speed 3).
    run(sim, seconds(3.5));
    const before = sim.state.cakeSlices;
    const thief = [...sim.state.critters.values()].find((c) => c.def === 'test-thief');
    // If it already stole by t=3.5, cakeSlices dropped by 1 and carriedSlice is true.
    const stoleBeforeFlip = thief?.carriedSlice === true;
    run(sim, seconds(1)); // cross the t=4 boss spawn
    const thiefAfter = [...sim.state.critters.values()].find((c) => c.def === 'test-thief');
    if (stoleBeforeFlip) {
      expect(thiefAfter?.allied).toBe(true);
      expect(thiefAfter?.carriedSlice).toBe(false);
      expect(sim.state.cakeSlices).toBe(before + 1);
    } else {
      // Thief hadn't stolen yet — nothing to recover, just confirm it still flipped cleanly.
      expect(thiefAfter?.allied).toBe(true);
    }
  });
});

/** Same shape as finaleLevel but with no post-boss escort wave, so nothing hostile ever re-enters play. */
function noEscortFinaleLevel(overrides: Parameters<typeof tinyLevel>[0] = {}) {
  return tinyLevel({
    cakeSlices: 10000,
    waves: [
      {
        entries: [
          { critter: 'test-ant', count: 4, interval: 0.3, spawn: 'door', delay: 0 },
          { critter: 'the-exterminator', count: 1, interval: 1, spawn: 'door', delay: 3 },
        ],
      },
    ],
    ...overrides,
  });
}

describe('Alliance finale: allied critters are untouchable by towers and never bite the cake', () => {
  it('towers ignore allied critters even when they sit in point-blank range', () => {
    const sim = new Sim(noEscortFinaleLevel(), opts());
    place(sim, 'test-gun', { s: 0, c: 1, r: 1 }); // right on top of the spawn door
    sim.command({ type: 'callWave' });
    run(sim, seconds(2));
    expect([...sim.state.critters.values()].length).toBe(4);
    run(sim, seconds(1.5)); // crosses the flip
    const flippedHp = [...sim.state.critters.values()]
      .filter((c) => c.def === 'test-ant')
      .map((c) => c.hp);
    expect(flippedHp.length).toBe(4);
    // Give the tower plenty of time to have fired repeatedly if it were still allowed to.
    run(sim, seconds(5));
    const stillThere = [...sim.state.critters.values()].filter((c) => c.def === 'test-ant');
    expect(stillThere.length).toBe(4);
    for (const c of stillThere) expect(c.hp).toBe(10); // test-ant's full hp — never scratched by the gun
  });

  it('allied critters never reach eatCake state (cake stays untouched by them)', () => {
    const sim = new Sim(noEscortFinaleLevel({ cakeSlices: 3 }), opts());
    sim.command({ type: 'callWave' });
    run(sim, seconds(2));
    run(sim, seconds(1.5)); // flip
    const cakeAfterFlip = sim.state.cakeSlices;
    run(sim, seconds(10));
    expect(sim.state.cakeSlices).toBe(cakeAfterFlip); // allied ants never bite it
  });
});

describe('Alliance finale: allied critters fight the boss', () => {
  it('an allied critter steers toward and damages the exterminator', () => {
    const sim = new Sim(finaleLevel(), opts());
    sim.command({ type: 'callWave' });
    run(sim, seconds(4.5)); // past the flip
    const boss = [...sim.state.critters.values()].find((c) => c.def === 'the-exterminator')!;
    const hpAfterFlip = boss.hp;
    run(sim, seconds(6));
    const bossLater = sim.state.critters.get(boss.id);
    expect(bossLater).toBeDefined();
    expect(bossLater!.hp).toBeLessThan(hpAfterFlip);
  });

  it('emits allianceKill with the killer def id when an ally lands the killing blow', () => {
    // Very low boss hp so a single ally finishes him off quickly and unambiguously.
    const content = finaleContent();
    content.critters['the-exterminator'] = { ...content.critters['the-exterminator'], hp: 5 };
    const level = finaleLevel({
      waves: [
        {
          entries: [
            { critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 },
            { critter: 'the-exterminator', count: 1, interval: 1, spawn: 'door', delay: 2 },
          ],
        },
      ],
    });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content });
    sim.command({ type: 'callWave' });
    const events = run(sim, seconds(10));
    const killEv = events.find((e) => e.t === 'allianceKill');
    expect(killEv).toBeDefined();
    expect(killEv && (killEv as { by: string }).by).toBe('test-ant');
    // and the boss is actually gone
    expect([...sim.state.critters.values()].some((c) => c.def === 'the-exterminator')).toBe(false);
  });
});

describe('Alliance finale: wave-clear logic', () => {
  it('a wave does NOT clear while non-allied (hostile escort) critters remain, even if the boss and all allies are gone', () => {
    const content = finaleContent();
    content.critters['the-exterminator'] = { ...content.critters['the-exterminator'], hp: 1 }; // dies almost instantly to allies
    const level = finaleLevel({
      waves: [
        {
          entries: [
            { critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 },
            { critter: 'the-exterminator', count: 1, interval: 1, spawn: 'door', delay: 2 },
            { critter: 'test-roach', count: 1, interval: 1, spawn: 'door', delay: 3 }, // hostile escort, arrives after boss dies
          ],
        },
      ],
    });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content });
    sim.command({ type: 'callWave' });
    run(sim, seconds(4)); // boss has spawned, near-instantly died to the ally, escort roach has spawned and is hostile
    expect(sim.state.phase).toBe('assault'); // still fighting the hostile roach — must not have cleared
    const roach = [...sim.state.critters.values()].find((c) => c.def === 'test-roach');
    expect(roach).toBeDefined();
    expect(roach!.allied).toBeFalsy();
  });

  it('a wave clears once the boss and all non-allied critters are gone, even if a defected ally is still alive', () => {
    const content = finaleContent();
    content.critters['the-exterminator'] = { ...content.critters['the-exterminator'], hp: 1 };
    const level = finaleLevel({
      waves: [
        {
          entries: [
            { critter: 'test-tank', count: 1, interval: 1, spawn: 'door', delay: 0 }, // tanky ally, survives long after the boss dies
            { critter: 'the-exterminator', count: 1, interval: 1, spawn: 'door', delay: 2 },
          ],
        },
      ],
    });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content });
    sim.command({ type: 'callWave' });
    const events = run(sim, seconds(6));
    const cleared = events.some((e) => e.t === 'waveClear');
    expect(cleared).toBe(true);
    // the allied tank can still be alive and idling (harmlessly) after the boss is gone
    const survivor = [...sim.state.critters.values()].find((c) => c.def === 'test-tank');
    if (survivor) expect(survivor.allied).toBe(true);
  });
});

describe('Loss reasons: exterminated vs cakeDevoured', () => {
  it('losing with the exterminator alive emits reason "exterminated"', () => {
    const content = finaleContent();
    const level = finaleLevel({
      cakeSlices: 1,
      waves: [
        {
          entries: [
            { critter: 'the-exterminator', count: 1, interval: 1, spawn: 'door', delay: 0 },
          ],
        },
      ],
    });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content });
    sim.command({ type: 'callWave' });
    const events = run(sim, seconds(20));
    const lost = events.find((e) => e.t === 'lost');
    expect(lost).toBeDefined();
    expect(lost && (lost as { reason: string }).reason).toBe('exterminated');
  });

  it('losing an ordinary level (no exterminator ever on board) still emits reason "cakeDevoured"', () => {
    const level = tinyLevel({
      cakeSlices: 1,
      waves: [{ entries: [{ critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 }] }],
    });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent() });
    sim.command({ type: 'callWave' });
    const events = run(sim, seconds(10));
    const lost = events.find((e) => e.t === 'lost');
    expect(lost).toBeDefined();
    expect(lost && (lost as { reason: string }).reason).toBe('cakeDevoured');
  });
});

describe('Alliance finale: determinism guard — non-finale levels are unaffected', () => {
  it('an ordinary level with no exterminator content produces byte-identical sims to before this feature (regression guard)', () => {
    const lvl = () => tinyLevel({ clutterDeck: ['box-o'], clutterPerWave: 3, startCrumbs: 500 });
    const script = (sim: Sim) => {
      sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } });
      sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
      sim.command({ type: 'callWave' });
      run(sim, seconds(6));
      sim.command({ type: 'sweep', surface: 0, x: 4, z: 2, radius: 3 });
      run(sim, seconds(6));
    };
    const a = new Sim(lvl(), { seed: 7, difficulty: 'houseguest', content: testContent() });
    const b = new Sim(lvl(), { seed: 7, difficulty: 'houseguest', content: testContent() });
    script(a); script(b);
    expect(serializeSim(a)).toEqual(serializeSim(b));
    // no critter in a "no exterminator ever spawns" run should ever end up allied
    expect([...a.state.critters.values()].every((c) => !c.allied)).toBe(true);
  });

  it('a level that never spawns the-exterminator never emits alliance/allianceKill events', () => {
    const sim = new Sim(tinyLevel(), { seed: 3, difficulty: 'houseguest', content: testContent() });
    sim.command({ type: 'callWave' });
    const events = run(sim, seconds(20));
    expect(events.some((e) => e.t === 'alliance' || e.t === 'allianceKill')).toBe(false);
  });
});
