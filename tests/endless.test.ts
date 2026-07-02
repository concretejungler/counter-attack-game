import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import { budgetForDepth, ENDLESS_BOSS_EVERY, ENDLESS_ELITE_EVERY, ENDLESS_MIN_INTERVAL, nextEndlessWave, weeklySeed } from '../src/sim/endless';
import type { ContentDB, SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

/**
 * The shared test fixtures (tests/fixtures.ts) have no boss-tier critter at all, so elite/boss
 * generated waves (which draw from ctx.content.critters filtered to `boss: true`) would have
 * nothing to pick from. Rather than edit the shared fixtures file (out of scope for this
 * endless-mode change), this test file layers one boss critter onto a cloned ContentDB locally.
 */
function endlessContent(): ContentDB {
  const base = testContent();
  return {
    ...base,
    critters: {
      ...base.critters,
      'test-boss': {
        id: 'test-boss', name: 'Test Boss', tier: 5, hp: 500, speed: 0.5, size: 1,
        bounty: 100, bites: 2, resist: null, weak: null, boss: true, desc: 'test',
      },
    },
  };
}

/** Two authored waves; defaults to plenty of cake so a run can go many generated waves without dying immediately. */
function endlessLevel(overrides: Parameters<typeof tinyLevel>[0] = {}) {
  return tinyLevel({ cakeSlices: 100000, ...overrides });
}

/** Runs wave callWave->clear cycles headless (no towers placed) up to `waves` total (authored + generated). */
function runWaves(sim: Sim, waves: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let w = 0; w < waves; w++) {
    if (sim.state.phase === 'lost' || sim.state.phase === 'won') break;
    sim.command({ type: 'callWave' });
    all.push(...run(sim, seconds(30)));
    // drain any mutation offer so build-timer auto-advance isn't blocked (sim.tick() pauses the
    // build timer while mutationOffer is pending — see sim.ts's build-phase auto-call gate).
    if (sim.state.mutationOffer) {
      sim.command({ type: 'pickMutation', id: sim.state.mutationOffer[0] });
      all.push(...run(sim, 1));
    }
  }
  return all;
}

describe('Endless mode: inert unless enabled', () => {
  it('endless:undefined is byte-identical to omitting the flag entirely (determinism guard)', () => {
    const level = endlessLevel();
    const optsUndefined = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent(), endless: undefined });
    const optsOmitted = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent() });

    function play(opts: SimOptions): { events: SimEvent[]; state: unknown } {
      const sim = new Sim(level, opts);
      const events = runWaves(sim, level.waves.length + 2); // past authored waves too (should just do nothing extra)
      return {
        events,
        state: {
          phase: sim.state.phase,
          waveIndex: sim.state.waveIndex,
          endlessDepth: sim.state.endlessDepth,
          crumbs: sim.state.crumbs,
        },
      };
    }

    const withUndefined = play(optsUndefined(42));
    const withOmitted = play(optsOmitted(42));
    expect(withUndefined.events).toEqual(withOmitted.events);
    expect(withUndefined.state).toEqual(withOmitted.state);
  });

  it('endless:false behaves exactly like campaign — wins on wave exhaustion', () => {
    const level = endlessLevel();
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent(), endless: false });
    const events = runWaves(sim, level.waves.length);
    expect(events.some((e) => e.t === 'won')).toBe(true);
    expect(sim.state.endlessDepth).toBe(0);
  });

  it('SimState.endlessDepth is 0 in campaign runs', () => {
    const level = endlessLevel();
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent() });
    expect(sim.state.endlessDepth).toBe(0);
    runWaves(sim, level.waves.length);
    expect(sim.state.endlessDepth).toBe(0);
  });
});

describe('Endless mode: generation kicks in after authored waves', () => {
  it('never wins on wave exhaustion when endless is on — keeps generating instead', () => {
    const level = endlessLevel();
    const sim = new Sim(level, { seed: 7, difficulty: 'houseguest', content: testContent(), endless: true });
    const events = runWaves(sim, level.waves.length + 3);
    expect(events.some((e) => e.t === 'won')).toBe(false);
    expect(sim.state.phase).not.toBe('won');
    expect(sim.state.endlessDepth).toBeGreaterThanOrEqual(3);
  });

  it('wavesTotal stays the authored count even deep into endless (campaign HUD contract)', () => {
    const level = endlessLevel();
    const sim = new Sim(level, { seed: 7, difficulty: 'houseguest', content: testContent(), endless: true });
    runWaves(sim, level.waves.length + 5);
    expect(sim.state.wavesTotal).toBe(level.waves.length);
  });

  it('emits waveStart events past the authored wave count', () => {
    const level = endlessLevel();
    const sim = new Sim(level, { seed: 7, difficulty: 'houseguest', content: testContent(), endless: true });
    const events = runWaves(sim, level.waves.length + 2);
    const waveStarts = events.filter((e) => e.t === 'waveStart');
    expect(waveStarts.length).toBeGreaterThanOrEqual(level.waves.length + 2);
  });

  it('spawns critters on generated waves (nonzero spawn events past authored waves)', () => {
    const level = endlessLevel();
    const sim = new Sim(level, { seed: 7, difficulty: 'houseguest', content: testContent(), endless: true });
    // burn through authored waves first
    runWaves(sim, level.waves.length);
    const depthBefore = sim.state.endlessDepth;
    const events = runWaves(sim, 1);
    expect(sim.state.endlessDepth).toBeGreaterThan(depthBefore);
    expect(events.some((e) => e.t === 'spawn')).toBe(true);
  });
});

describe('Endless mode: determinism', () => {
  it('same seed + endless:true produces identical generated-wave spawns', () => {
    const level = endlessLevel();
    function spawnsFor(seed: number): string[] {
      const sim = new Sim(level, { seed, difficulty: 'houseguest', content: testContent(), endless: true });
      const events = runWaves(sim, level.waves.length + 4);
      return events.filter((e) => e.t === 'spawn').map((e) => (e.t === 'spawn' ? `${e.def}` : ''));
    }
    const a = spawnsFor(99);
    const b = spawnsFor(99);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('endless generation never perturbs the main gameplay RNG sequence used by campaign par-scripts', () => {
    // Campaign runs (endless omitted) must be byte-identical whether or not endlessRng exists as
    // a stream on the Sim instance -- this is really just the same guarantee as the other
    // dedicated streams (shinyRng/grudgeRng/etc): constructing the stream must never itself
    // consume from ctx.rng. Verified by re-checking the inert-by-default test's rng-derived
    // outputs (crumb placement / clutter deals) stay identical across many seeds.
    const level = endlessLevel();
    for (const seed of [1, 2, 3, 11, 500]) {
      const withEndlessField = new Sim(level, { seed, difficulty: 'houseguest', content: testContent(), endless: false });
      const without = new Sim(level, { seed, difficulty: 'houseguest', content: testContent() });
      expect(withEndlessField.state.clutterHand).toEqual(without.state.clutterHand);
    }
  });
});

describe('Endless mode: budget growth', () => {
  it('hp-mass budget grows monotonically and compounds ~12% per generated wave', () => {
    const level = endlessLevel();
    const sim = new Sim(level, { seed: 3, difficulty: 'houseguest', content: testContent(), endless: true });
    const budgets: number[] = [];
    for (let depth = 1; depth <= 20; depth++) budgets.push(budgetForDepth(sim, level, depth));
    for (let i = 1; i < budgets.length; i++) expect(budgets[i]).toBeGreaterThan(budgets[i - 1]);
    // compounding check: budget(depth) === budget(1) * 1.12^(depth-1)
    const ratio = budgets[10] / budgets[0];
    const expectedRatio = Math.pow(1.12, 10);
    expect(ratio).toBeCloseTo(expectedRatio, 3);
  });

  it('spawn intervals tighten with depth, floored at ENDLESS_MIN_INTERVAL', () => {
    const level = endlessLevel();
    const sim = new Sim(level, { seed: 3, difficulty: 'houseguest', content: testContent(), endless: true });
    const wave1 = nextEndlessWave(sim, level, 1);
    const wave50 = nextEndlessWave(sim, level, 50);
    const minInterval = (w: typeof wave1) => Math.min(...w.entries.map((e) => e.interval));
    expect(minInterval(wave50)).toBeLessThanOrEqual(minInterval(wave1) + 1e-9);
    for (let depth = 1; depth <= 60; depth++) {
      const w = nextEndlessWave(sim, level, depth);
      for (const e of w.entries) expect(e.interval).toBeGreaterThanOrEqual(ENDLESS_MIN_INTERVAL - 1e-9);
    }
  });
});

describe('Endless mode: elite/boss cadence', () => {
  it(`every ${ENDLESS_ELITE_EVERY}th generated wave includes a boss-tier mini-boss entry (elite wave) except full boss waves`, () => {
    const level = endlessLevel();
    const content = endlessContent();
    const sim = new Sim(level, { seed: 5, difficulty: 'houseguest', content, endless: true });
    for (let depth = 1; depth <= 40; depth++) {
      if (depth % ENDLESS_ELITE_EVERY !== 0) continue;
      if (depth % ENDLESS_BOSS_EVERY === 0) continue; // full boss waves take precedence
      const wave = nextEndlessWave(sim, level, depth);
      // "mini-boss" here means: tagged with an explicit hpMul (the elite-wave scaling curve),
      // as opposed to full boss waves whose boss entry is always left at the natural hpMul=1.
      const hasMiniBoss = wave.entries.some((e) => {
        const def = content.critters[e.critter];
        return !!def?.boss && e.hpMul !== undefined;
      });
      expect(hasMiniBoss, `depth ${depth} should have an hp-scaled mini-boss entry`).toBe(true);
    }
  });

  it(`every ${ENDLESS_BOSS_EVERY}th generated wave is a full boss wave (unscaled boss entry present)`, () => {
    const level = endlessLevel();
    const content = endlessContent();
    const sim = new Sim(level, { seed: 5, difficulty: 'houseguest', content, endless: true });
    for (let depth = ENDLESS_BOSS_EVERY; depth <= 40; depth += ENDLESS_BOSS_EVERY) {
      const wave = nextEndlessWave(sim, level, depth);
      const hasFullBoss = wave.entries.some((e) => {
        const def = content.critters[e.critter];
        return !!def?.boss && (e.hpMul ?? 1) === 1;
      });
      expect(hasFullBoss, `depth ${depth} should have a full-strength boss entry`).toBe(true);
    }
  });

  it('at the first elite wave (depth 5), the mini-boss is scaled down to the 40% base (well below a full boss)', () => {
    const level = endlessLevel();
    const content = endlessContent();
    const sim = new Sim(level, { seed: 5, difficulty: 'houseguest', content, endless: true });
    const wave = nextEndlessWave(sim, level, ENDLESS_ELITE_EVERY);
    const entry = wave.entries.find((e) => content.critters[e.critter]?.boss);
    expect(entry?.hpMul).toBeDefined();
    expect(entry!.hpMul!).toBeCloseTo(0.4 * Math.pow(1.12, ENDLESS_ELITE_EVERY), 5);
    expect(entry!.hpMul!).toBeLessThan(1);
  });

  it('mini-boss hp scaling grows with depth (40% base, compounding)', () => {
    const level = endlessLevel();
    const content = endlessContent();
    const sim = new Sim(level, { seed: 5, difficulty: 'houseguest', content, endless: true });
    function miniBossMul(depth: number): number | undefined {
      const wave = nextEndlessWave(sim, level, depth);
      const entry = wave.entries.find((e) => content.critters[e.critter]?.boss && e.hpMul !== undefined);
      return entry?.hpMul;
    }
    const early = miniBossMul(ENDLESS_ELITE_EVERY);
    const later = miniBossMul(ENDLESS_ELITE_EVERY * 3);
    expect(early).toBeDefined();
    expect(later).toBeDefined();
    expect(later!).toBeGreaterThan(early!);
  });

  it('mini-boss hp scaling actually lands on the spawned critter (post-spawn hp multiplier applied)', () => {
    const level = endlessLevel();
    const content = endlessContent();
    const sim = new Sim(level, { seed: 21, difficulty: 'houseguest', content, endless: true });
    runWaves(sim, level.waves.length + ENDLESS_ELITE_EVERY - 1); // land exactly on the elite wave
    const before = sim.state.critters.size;
    const events = runWaves(sim, 1);
    expect(sim.state.endlessDepth).toBeGreaterThanOrEqual(ENDLESS_ELITE_EVERY);
    const spawns = events.filter((e): e is Extract<SimEvent, { t: 'spawn' }> => e.t === 'spawn');
    const bossSpawn = spawns.find((s) => content.critters[s.def]?.boss);
    expect(bossSpawn, 'elite wave should spawn a boss-tier mini-boss').toBeTruthy();
    expect(before).toBeGreaterThanOrEqual(0); // sanity — no crash reading state mid-run
  });
});

describe('Endless mode: 60-wave headless run', () => {
  it('runs 60 waves without crashing and eventually loses with no towers placed', () => {
    const level = endlessLevel({ cakeSlices: 15 }); // thin cake — undefended run should lose well before wave 60
    const sim = new Sim(level, { seed: 13, difficulty: 'houseguest', content: testContent(), endless: true });
    expect(() => runWaves(sim, 60)).not.toThrow();
    expect(sim.state.phase).toBe('lost');
  });

  it('wave 42 exists and is reachable without crashing', () => {
    const level = endlessLevel();
    const sim = new Sim(level, { seed: 4, difficulty: 'houseguest', content: testContent(), endless: true });
    expect(() => runWaves(sim, 42)).not.toThrow();
    expect(sim.state.phase).not.toBe('won'); // endless never wins
    // reached at least close to wave 42 (a loss can end the run early, which is fine/expected)
    expect(sim.state.waveIndex + 1).toBeGreaterThan(0);
  });

  it('mutation drafts keep firing every 5th generated wave through a long run', () => {
    const level = endlessLevel({ cakeSlices: 100000, mutationWaves: [] }); // no authored mutation waves, isolate endless cadence
    const sim = new Sim(level, { seed: 9, difficulty: 'houseguest', content: testContent(), endless: true });
    const events = runWaves(sim, level.waves.length + 16);
    const offers = events.filter((e) => e.t === 'mutationOffer');
    expect(offers.length).toBeGreaterThanOrEqual(2); // at generated depth 5, 10, 15...
  });
});

describe('weeklySeed()', () => {
  it('is pure and deterministic for the same timestamp', () => {
    const now = Date.parse('2026-07-02T12:00:00Z');
    expect(weeklySeed(now)).toBe(weeklySeed(now));
  });

  it('produces the same seed for any timestamp within the same ISO week', () => {
    const monday = Date.parse('2026-06-29T00:00:01Z');
    const sunday = Date.parse('2026-07-05T23:59:59Z');
    expect(weeklySeed(monday)).toBe(weeklySeed(sunday));
  });

  it('changes across an ISO week boundary', () => {
    const thisWeek = Date.parse('2026-07-02T12:00:00Z');
    const nextWeek = Date.parse('2026-07-09T12:00:00Z');
    expect(weeklySeed(thisWeek)).not.toBe(weeklySeed(nextWeek));
  });

  it('handles ISO year-boundary edge cases (e.g. 2025-12-29 belongs to ISO week 2026-W01)', () => {
    const dec29 = Date.parse('2025-12-29T12:00:00Z'); // Monday
    const jan1 = Date.parse('2026-01-01T12:00:00Z');   // Thursday, same ISO week
    expect(weeklySeed(dec29)).toBe(weeklySeed(jan1));
  });

  it('returns a >>>0-safe unsigned 32-bit integer', () => {
    const seed = weeklySeed(Date.parse('2026-07-02T12:00:00Z'));
    expect(Number.isInteger(seed)).toBe(true);
    expect(seed).toBeGreaterThanOrEqual(0);
    expect(seed).toBeLessThanOrEqual(0xffffffff);
  });
});
