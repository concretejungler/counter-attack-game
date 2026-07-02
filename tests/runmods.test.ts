import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import type { ContentDB, SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

/**
 * A beefy, armor/resist-free critter (unlike test-tank, which has armor:2 and resist:'swat' —
 * armor is a flat post-multiplier subtraction, so it would make dmgPct's effect on the *landed*
 * hit amount non-linear and unsuitable for a "doubled dmgPct doubles hit amount" style assertion).
 * High hp so it survives many hits within the measurement window regardless of dmgPct.
 */
function contentWithTonka(): ContentDB {
  const base = testContent();
  return {
    ...base,
    critters: {
      ...base.critters,
      'test-tonka': {
        id: 'test-tonka', name: 'Test Tonka', tier: 3, hp: 100000, speed: 1, size: 0.6,
        bounty: 25, bites: 2, resist: null, weak: null, desc: 'test',
      },
    },
  };
}

/** Place a box + a gun tower on it, return the tower id. */
function placeGun(sim: Sim, c = 3, r = 3): number {
  sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c, r } });
  run(sim, 1);
  sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c, r } });
  run(sim, 1);
  const tw = [...sim.state.towers.values()][0];
  return tw.id;
}

function boxLevel(overrides: Parameters<typeof tinyLevel>[0] = {}) {
  return tinyLevel({
    clutterDeck: ['box-o'],
    clutterPerWave: 3,
    startCrumbs: 500,
    waves: [{ entries: [{ critter: 'test-tank', count: 1, interval: 1, spawn: 'door', delay: 0 }] }],
    ...overrides,
  });
}

/** Single tonka (armor/resist-free, effectively unkillable in the measurement window) plus a huge cake so a leak never ends the run early. */
function tonkaLevel(overrides: Parameters<typeof tinyLevel>[0] = {}) {
  return tinyLevel({
    clutterDeck: ['box-o'],
    clutterPerWave: 3,
    startCrumbs: 500,
    cakeSlices: 100000,
    waves: [{ entries: [{ critter: 'test-tonka', count: 1, interval: 1, spawn: 'door', delay: 0 }] }],
    ...overrides,
  });
}

describe('SimOptions.runMods: inert unless set (determinism guard)', () => {
  it('runMods:undefined is byte-identical to omitting the flag entirely', () => {
    const level = boxLevel();
    const optsUndefined = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent(), runMods: undefined });
    const optsOmitted = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent() });

    function playthrough(opts: SimOptions): unknown {
      const sim = new Sim(level, opts);
      placeGun(sim);
      sim.command({ type: 'callWave' });
      const events = run(sim, seconds(30));
      return { events, crumbs: sim.state.crumbs, cakeSlices: sim.state.cakeSlices, cakeMax: sim.state.cakeMax, mutations: sim.state.mutations };
    }

    const a = playthrough(optsUndefined(11));
    const b = playthrough(optsOmitted(11));
    expect(a).toEqual(b);
  });

  it('runMods with all-empty object behaves identically to omission too', () => {
    const level = boxLevel();
    const optsEmpty = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent(), runMods: {} });
    const optsOmitted = (seed: number): SimOptions => ({ seed, difficulty: 'houseguest', content: testContent() });

    function playthrough(opts: SimOptions): unknown {
      const sim = new Sim(level, opts);
      placeGun(sim);
      sim.command({ type: 'callWave' });
      return run(sim, seconds(30));
    }

    expect(playthrough(optsEmpty(5))).toEqual(playthrough(optsOmitted(5)));
  });
});

describe('SimOptions.runMods.dmgPct', () => {
  it('is applied after tier/branch/buff/age math: doubles the landed hit amount on an armor-free target', () => {
    function firstHitAmount(dmgPct?: number): number {
      const sim = new Sim(tonkaLevel(), { seed: 3, difficulty: 'houseguest', content: contentWithTonka(), runMods: dmgPct !== undefined ? { dmgPct } : undefined });
      placeGun(sim);
      sim.command({ type: 'callWave' });
      const events = run(sim, seconds(20));
      const hit = events.find((e) => e.t === 'hit');
      return hit && hit.t === 'hit' ? hit.amount : -1;
    }
    const base = firstHitAmount(undefined);
    const doubled = firstHitAmount(1.0); // +100% damage
    expect(base).toBeGreaterThan(0);
    expect(doubled).toBeCloseTo(base * 2, 5);
  });

  it('a positive dmgPct speeds up time-to-kill: more remaining-hp drained from a stationary target in a fixed window', () => {
    // tonkaLevel's wave walks toward the cake and eventually leaves gun range, so measure damage
    // dealt (hp drained) within a short window instead of counting hits to actual death.
    function hpDrained(dmgPct?: number): number {
      const sim = new Sim(tonkaLevel(), { seed: 3, difficulty: 'houseguest', content: contentWithTonka(), runMods: dmgPct !== undefined ? { dmgPct } : undefined });
      placeGun(sim);
      sim.command({ type: 'callWave' });
      run(sim, seconds(3));
      const cr = [...sim.state.critters.values()][0];
      return 100000 - cr.hp;
    }
    const baseline = hpDrained(undefined);
    const buffed = hpDrained(1.0); // +100% damage -> should drain more hp in the same window
    expect(baseline).toBeGreaterThan(0);
    expect(buffed).toBeGreaterThan(baseline);
  });
});

describe('SimOptions.runMods.ratePct / rangePct', () => {
  it('ratePct increases fire rate (more hit events in a fixed window against an unkillable target)', () => {
    function hitCount(ratePct?: number): number {
      const sim = new Sim(tonkaLevel(), {
        seed: 3, difficulty: 'houseguest', content: contentWithTonka(), runMods: ratePct !== undefined ? { ratePct } : undefined,
      });
      placeGun(sim);
      sim.command({ type: 'callWave' });
      const events = run(sim, seconds(4));
      return events.filter((e) => e.t === 'hit').length;
    }
    const baseline = hitCount(undefined);
    const faster = hitCount(1.0); // double fire rate
    expect(faster).toBeGreaterThan(baseline);
  });

  it('rangePct extends effective range (tower engages a target it otherwise could not)', () => {
    // test-gun tier-1 range is 3. Place gun far from a stationary target so only an extended range reaches it.
    const level = tinyLevel({
      clutterDeck: ['box-o'],
      startCrumbs: 500,
      surfaces: [{ id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 12, rows: 12 }],
      spawns: [{ id: 'door', tile: { s: 0, c: 1, r: 1 }, kind: 'door' }],
      cakeTile: { s: 0, c: 10, r: 10 },
      waves: [{ entries: [{ critter: 'test-tank', count: 1, interval: 1, spawn: 'door', delay: 0 }] }],
    });

    function reachesTarget(rangePct?: number): boolean {
      const sim = new Sim(level, { seed: 9, difficulty: 'houseguest', content: testContent(), runMods: rangePct !== undefined ? { rangePct } : undefined });
      sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 1, r: 4 } });
      run(sim, 1);
      sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 1, r: 4 } });
      run(sim, 1);
      // debugSpawn a tank 4.2 tiles away in z (out of base range 3, within range*1.5=4.5)
      const cr = sim.debugSpawn('test-tank', { s: 0, c: 1, r: 8 });
      cr.pos = { x: 1.5, y: cr.pos.y, z: 8.5 };
      const events = run(sim, seconds(3));
      return events.some((e) => e.t === 'hit' && e.critterId === cr.id);
    }

    expect(reachesTarget(undefined)).toBe(false);
    expect(reachesTarget(0.5)).toBe(true);
  });
});

describe('SimOptions.runMods.sellRefundPct', () => {
  it('overrides the default 0.9 refund fraction', () => {
    const sim = new Sim(boxLevel(), { seed: 1, difficulty: 'houseguest', content: testContent(), runMods: { sellRefundPct: 0.5 } });
    const id = placeGun(sim);
    const crumbsAfterBuild = sim.state.crumbs;
    sim.command({ type: 'sellTower', id });
    run(sim, 1);
    // tower cost 50; refund at 0.5 = 25
    expect(sim.state.crumbs).toBe(crumbsAfterBuild + 25);
  });

  it('default (omitted) still refunds at 0.9', () => {
    const sim = new Sim(boxLevel(), { seed: 1, difficulty: 'houseguest', content: testContent() });
    const id = placeGun(sim);
    const crumbsAfterBuild = sim.state.crumbs;
    sim.command({ type: 'sellTower', id });
    run(sim, 1);
    expect(sim.state.crumbs).toBe(crumbsAfterBuild + 45); // round(50*0.9)
  });
});

describe('SimOptions.runMods.crumbPct', () => {
  it('scales a drop\'s crumb value (via Sim.dropCrumbs, after the dog tax)', () => {
    const simBase = new Sim(tinyLevel({ startCrumbs: 0 }), { seed: 1, difficulty: 'houseguest', content: testContent() });
    simBase.dropCrumbs({ x: 4, y: 0, z: 4 }, 0, 40);
    const baseEv = run(simBase, 1);
    const baseDrop = baseEv.find((e) => e.t === 'crumbDrop');
    expect(baseDrop && baseDrop.t === 'crumbDrop' ? baseDrop.value : -1).toBe(40);

    const simBoosted = new Sim(tinyLevel({ startCrumbs: 0 }), { seed: 1, difficulty: 'houseguest', content: testContent(), runMods: { crumbPct: 0.5 } });
    simBoosted.dropCrumbs({ x: 4, y: 0, z: 4 }, 0, 40);
    const boostedEv = run(simBoosted, 1);
    const boostedDrop = boostedEv.find((e) => e.t === 'crumbDrop');
    expect(boostedDrop && boostedDrop.t === 'crumbDrop' ? boostedDrop.value : -1).toBe(60); // 40 * 1.5
  });

  it('scales a kill bounty drop end-to-end (crumbDrop value reflects crumbPct; die.bounty stays unscaled pre-drop)', () => {
    const sim = new Sim(boxLevel(), { seed: 1, difficulty: 'houseguest', content: testContent(), runMods: { crumbPct: 1.0 } }); // +100%
    const cr = sim.debugSpawn('test-tank', { s: 0, c: 3, r: 3 });
    sim.debugDamage(cr.id, 100000, 'swat');
    const events = run(sim, 1);
    const die = events.find((e) => e.t === 'die');
    const drop = events.find((e) => e.t === 'crumbDrop');
    expect(die && die.t === 'die' ? die.bounty : -1).toBeGreaterThan(0);
    expect(drop && drop.t === 'crumbDrop' && die && die.t === 'die' ? drop.value : -1).toBe(
      die && die.t === 'die' ? die.bounty * 2 : -1,
    );
  });
});

describe('SimOptions.runMods.cakeSlices', () => {
  it('overrides both level.cakeSlices and cakeMax at construction (wounded-cake carry-over)', () => {
    const level = tinyLevel({ cakeSlices: 10 });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent(), runMods: { cakeSlices: 3 } });
    expect(sim.state.cakeSlices).toBe(3);
    expect(sim.state.cakeMax).toBe(3);
  });

  it('omitted leaves level.cakeSlices as cakeMax (campaign behavior unaffected)', () => {
    const level = tinyLevel({ cakeSlices: 10 });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent() });
    expect(sim.state.cakeSlices).toBe(10);
    expect(sim.state.cakeMax).toBe(10);
  });
});

describe('SimOptions.preMutations', () => {
  it('applies at tick 0 (mod is live from the start, before any wave)', () => {
    const sim = new Sim(tinyLevel(), { seed: 1, difficulty: 'houseguest', content: testContent(), preMutations: ['mut-hp'] });
    expect(sim.state.mutations).toContain('mut-hp');
    // mut-hp = +50% hp; verify modSum reads it immediately (tick 0, no ticks run yet).
    expect(sim.modSum('allHpPct')).toBeCloseTo(0.5, 5);
  });

  it('observable effect: a preMutation hp buff raises a spawned critter\'s max hp directly', () => {
    // debugSpawn applies the same hpMul math (ctx.diff.critterHp * (1 + ctx.modSum('allHpPct'))) as a
    // real wave spawn (see spawnCritter in critters.ts) — checking hp right after spawn sidesteps any
    // walk/range/wave-clear timing noise from a live tower engagement.
    function spawnedHp(preMutations?: string[]): number {
      const sim = new Sim(tinyLevel(), { seed: 1, difficulty: 'houseguest', content: testContent(), preMutations });
      const cr = sim.debugSpawn('test-tank', { s: 0, c: 3, r: 3 });
      return cr.hp;
    }
    const baseline = spawnedHp(undefined);
    const buffed = spawnedHp(['mut-hp']); // +50% hp
    expect(buffed).toBeCloseTo(baseline * 1.5, 5);
  });

  it('unknown mutation ids are silently ignored, not thrown', () => {
    expect(() => new Sim(tinyLevel(), { seed: 1, difficulty: 'houseguest', content: testContent(), preMutations: ['not-a-real-mutation'] })).not.toThrow();
    const sim = new Sim(tinyLevel(), { seed: 1, difficulty: 'houseguest', content: testContent(), preMutations: ['not-a-real-mutation'] });
    expect(sim.state.mutations).not.toContain('not-a-real-mutation');
  });

  it('preMutations are excluded from later in-run mutation draft offers', () => {
    const level = tinyLevel({ mutationWaves: [1] }); // draft fires after wave 1 clears
    const sim = new Sim(level, {
      seed: 1, difficulty: 'houseguest', content: testContent(),
      preMutations: ['mut-hp'], // only 3 mutations exist in testContent: mut-hp, mut-speed, mut-bounty
    });
    sim.command({ type: 'callWave' });
    const events = run(sim, seconds(30));
    const offerEvent = events.find((e) => e.t === 'mutationOffer');
    expect(offerEvent).toBeDefined();
    if (offerEvent && offerEvent.t === 'mutationOffer') {
      expect(offerEvent.options).not.toContain('mut-hp');
      // only 2 remain (mut-speed, mut-bounty) since mut-hp is already owned
      expect(offerEvent.options.length).toBe(2);
    }
  });
});

describe('SimOptions.allowedTowersOverride', () => {
  it('is not enforced by sim placement (UI-gating only) — a tower outside the override still places', () => {
    const level = tinyLevel({ allowedTowers: ['test-swatter'] });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent(), allowedTowersOverride: ['test-trap'] });
    sim.command({ type: 'placeClutter', shape: 'box-i', rot: 0, at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } }); // not in either allow-list
    const events = run(sim, 1);
    expect(events.some((e) => e.t === 'towerPlace')).toBe(true);
  });

  it('is threaded through onto state for a UI layer to read', () => {
    const sim = new Sim(tinyLevel(), { seed: 1, difficulty: 'houseguest', content: testContent(), allowedTowersOverride: ['test-gun', 'test-trap'] });
    expect(sim.state.allowedTowersOverride).toEqual(['test-gun', 'test-trap']);
  });

  it('is undefined on state when omitted', () => {
    const sim = new Sim(tinyLevel(), { seed: 1, difficulty: 'houseguest', content: testContent() });
    expect(sim.state.allowedTowersOverride).toBeUndefined();
  });
});
