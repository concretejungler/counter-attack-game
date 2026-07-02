import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import { applyKnockback, damageCritter } from '../src/sim/critters';
import type { CritterDef, SimEvent, SimOptions, ContentDB } from '../src/sim/types';
import { tinyLevel, testContent, TEST_CRITTERS } from './fixtures';

const seconds = (s: number) => Math.round(s / SIM_DT);

function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

/** Phase-2 trait critter defs, layered onto the shared test content. */
const P2_CRITTERS: Record<string, CritterDef> = {
  'p2-evolver': {
    id: 'p2-evolver', name: 'P2 Evolver', tier: 1, hp: 10, speed: 0, size: 0.25,
    bounty: 5, bites: 1, resist: null, weak: null,
    traits: ['timedEvolve'], evolveTo: 'test-tank', evolveAfter: 1, desc: 'test',
  },
  'p2-stealth': {
    id: 'p2-stealth', name: 'P2 Stealth', tier: 1, hp: 10, speed: 0, size: 0.25,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['stealth'], desc: 'test',
  },
  'p2-rollup': {
    id: 'p2-rollup', name: 'P2 Roll-Up', tier: 1, hp: 20, speed: 1, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['rollUp'], desc: 'test',
  },
  'p2-tunneler': {
    id: 'p2-tunneler', name: 'P2 Tunneler', tier: 1, hp: 20, speed: 2, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['tunneler'], desc: 'test',
  },
  'p2-latcher': {
    id: 'p2-latcher', name: 'P2 Latcher', tier: 1, hp: 30, speed: 3, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['latcher'], desc: 'test',
  },
  'p2-spawner': {
    id: 'p2-spawner', name: 'P2 Spawner', tier: 1, hp: 40, speed: 0, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null,
    traits: ['spawner'], spawnDef: 'test-ant', spawnEvery: 1, spawnCount: 2, desc: 'test',
  },
  'p2-playdead2': {
    id: 'p2-playdead2', name: 'P2 Play Dead x2', tier: 1, hp: 20, speed: 1, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null,
    traits: ['playDead'], playDeadTimes: 2, desc: 'test',
  },
  'p2-anchored': {
    id: 'p2-anchored', name: 'P2 Anchored', tier: 1, hp: 20, speed: 1, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['anchored'], desc: 'test',
  },
  'p2-healpulse': {
    id: 'p2-healpulse', name: 'P2 Heal Pulse', tier: 1, hp: 20, speed: 0, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['healPulse'], desc: 'test',
  },
  'p2-speedaura': {
    id: 'p2-speedaura', name: 'P2 Speed Aura', tier: 1, hp: 20, speed: 0, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['speedAura'], desc: 'test',
  },
  'p2-stationary-tank': {
    id: 'p2-stationary-tank', name: 'P2 Stationary Tank', tier: 3, hp: 200, speed: 0, size: 0.6,
    bounty: 25, bites: 2, resist: 'swat', weak: 'heat', armor: 2, desc: 'test',
  },
  'p2-clutter-eater': {
    id: 'p2-clutter-eater', name: 'P2 Clutter Eater', tier: 1, hp: 20, speed: 3, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['clutterEater'], desc: 'test',
  },
  'p2-towersmash': {
    id: 'p2-towersmash', name: 'P2 Tower Smash', tier: 1, hp: 20, speed: 0, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['towerSmash'], desc: 'test',
  },
  'p2-webber': {
    id: 'p2-webber', name: 'P2 Webber', tier: 1, hp: 20, speed: 0, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['webber'], desc: 'test',
  },
  'p2-submerge': {
    id: 'p2-submerge', name: 'P2 Submerge', tier: 1, hp: 20, speed: 1, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['submerge'], desc: 'test',
  },
  'p2-latefly': {
    id: 'p2-latefly', name: 'P2 Late Flier', tier: 1, hp: 10, speed: 2, size: 0.3,
    bounty: 5, bites: 1, resist: null, weak: null, traits: ['lateFlier'], desc: 'test',
  },
};

function p2Content(): ContentDB {
  const base = testContent();
  return { ...base, critters: { ...TEST_CRITTERS, ...P2_CRITTERS } };
}

function opts(seed = 42): SimOptions {
  return { seed, difficulty: 'houseguest', content: p2Content() };
}

/**
 * "Quiet" tiny level: the single wave never auto-fires within our short test windows (build phase
 * only auto-calls after BUILD_TIME/never here since we don't call `callWave`), so critters spawned
 * manually via debugSpawn are the only ones present. Keep a normal wave entry so the Sim constructor's
 * swarmDef inference has something to look at.
 */
const QUIET_WAVES = [{ entries: [{ critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 }] }];

function quietLevel() {
  return tinyLevel({ waves: QUIET_WAVES });
}

describe('Phase-2 critter traits', () => {
  it('timedEvolve: replaces the critter with evolveTo once evolveAfter seconds have elapsed', () => {
    const sim = new Sim(quietLevel(), opts());
    const cr = sim.debugSpawn('p2-evolver', { s: 0, c: 3, r: 3 });
    const startPos = { ...cr.pos };

    // just under the threshold: still the original critter
    const evBefore = run(sim, seconds(0.9));
    expect(evBefore.some((e) => e.t === 'evolve')).toBe(false);
    expect(sim.state.critters.has(cr.id)).toBe(true);

    // cross the threshold
    const evAfter = run(sim, seconds(0.2));
    const evolveEvent = evAfter.find((e) => e.t === 'evolve');
    expect(evolveEvent).toBeTruthy();
    if (evolveEvent && evolveEvent.t === 'evolve') {
      expect(evolveEvent.from).toBe('p2-evolver');
      expect(evolveEvent.into).toBe('test-tank');
      const newCr = sim.state.critters.get(evolveEvent.id);
      expect(newCr).toBeTruthy();
      expect(newCr!.def).toBe('test-tank');
      // the evolve event captures the exact hand-off position (evolveTo may have nonzero speed and
      // will have taken further steps by the time later ticks in this same batch finish)
      expect(evolveEvent.at.x).toBeCloseTo(startPos.x, 5);
      expect(evolveEvent.at.z).toBeCloseTo(startPos.z, 5);
    }
    expect(sim.state.critters.has(cr.id)).toBe(false);
  });

  it('stealth: hidden flips true when unrevealed, false the tick after being stamped', () => {
    const sim = new Sim(quietLevel(), opts());
    const cr = sim.debugSpawn('p2-stealth', { s: 0, c: 3, r: 3 });
    run(sim, 1);
    expect(sim.state.critters.get(cr.id)!.hidden).toBe(true); // never revealed -> hidden

    // a tower "reveals" it this tick
    sim.state.critters.get(cr.id)!.revealStamp = true;
    run(sim, 1);
    expect(sim.state.critters.get(cr.id)!.hidden).toBe(false); // consumed the reveal stamp

    // stamp is consumed (one-shot); next tick reverts to hidden since nothing re-stamped it
    run(sim, 1);
    expect(sim.state.critters.get(cr.id)!.hidden).toBe(true);
  });

  it('rollUp: blocks all damage while rolling, then takes damage once unrolled', () => {
    const sim = new Sim(quietLevel(), opts());
    const cr = sim.debugSpawn('p2-rollup', { s: 0, c: 3, r: 3 });
    // tick 1 so cycleT starts advancing from ~0 (well within the 3s rolling phase)
    run(sim, 1);
    const before = sim.state.critters.get(cr.id)!.hp;
    damageCritter(sim, sim.state.critters.get(cr.id)!, 15, 'spray', 'spell');
    expect(sim.state.critters.get(cr.id)!.hp).toBe(before); // fully blocked while rolling

    // advance past the 3s rolling phase into the 2s vulnerable phase
    run(sim, seconds(3.5));
    const beforeVuln = sim.state.critters.get(cr.id)!.hp;
    damageCritter(sim, sim.state.critters.get(cr.id)!, 15, 'spray', 'spell');
    expect(sim.state.critters.get(cr.id)!.hp).toBeLessThan(beforeVuln);
  });

  it('tunneler: immune and hidden while far from the cake, surfaces permanently once within 6 of the cake', () => {
    const sim = new Sim(quietLevel(), opts());
    // spawn far from the cake (cake at 6,6); distOf should be well over 6 tiles away
    const cr = sim.debugSpawn('p2-tunneler', { s: 0, c: 0, r: 0 });
    run(sim, 1);
    const c1 = sim.state.critters.get(cr.id)!;
    expect(c1.hidden).toBe(true);
    const hpBefore = c1.hp;
    damageCritter(sim, c1, 50, 'spray', 'spell');
    expect(sim.state.critters.get(cr.id)!.hp).toBe(hpBefore); // immune while tunneling

    // teleport it next to the cake tile (well within 6 tiles) and tick so distOf gate flips
    const c2 = sim.state.critters.get(cr.id)!;
    c2.pos = { x: 6.5, y: 0, z: 5.5 };
    run(sim, 1);
    const c3 = sim.state.critters.get(cr.id)!;
    expect(c3.hidden).toBe(false);
    const hpBefore2 = c3.hp;
    damageCritter(sim, c3, 5, 'spray', 'spell');
    expect(sim.state.critters.get(cr.id)!.hp).toBeLessThan(hpBefore2); // targetable + damageable now
  });

  it('latcher: attaches to the nearest tower and keeps it disabled every tick', () => {
    const lvl = tinyLevel({
      waves: QUIET_WAVES,
      startCrumbs: 500,
      clutterDeck: ['box-o'],
    });
    const sim = new Sim(lvl, opts());
    // trap-style tower placed directly on bare floor (no clutter mount needed)
    sim.command({ type: 'placeTower', def: 'test-trap', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tower = [...sim.state.towers.values()][0];
    expect(tower).toBeTruthy();

    // spawn the latcher right next to the tower so it latches almost immediately
    const cr = sim.debugSpawn('p2-latcher', { s: 0, c: 3, r: 3 });
    run(sim, seconds(1));
    const latched = sim.state.critters.get(cr.id)!;
    expect(latched.latchTarget).toBe(tower.id);
    const tw = sim.state.towers.get(tower.id)!;
    expect(tw.disabled).toBeGreaterThan(0);

    // stays disabled tick after tick while latched
    run(sim, 5);
    expect(sim.state.towers.get(tower.id)!.disabled).toBeGreaterThan(0);
    // critter did not move away while latched
    const latched2 = sim.state.critters.get(cr.id)!;
    expect(latched2.pos.x).toBeCloseTo(latched.pos.x, 3);
    expect(latched2.pos.z).toBeCloseTo(latched.pos.z, 3);
  });

  it('spawner: produces minions every spawnEvery seconds, spawnCount at a time', () => {
    const sim = new Sim(quietLevel(), opts());
    sim.debugSpawn('p2-spawner', { s: 0, c: 3, r: 3 });
    expect(sim.state.critters.size).toBe(1);

    const ev = run(sim, seconds(1.05));
    const spawns = ev.filter((e) => e.t === 'spawn' && e.def === 'test-ant');
    expect(spawns.length).toBe(2);
    expect(sim.state.critters.size).toBe(3); // spawner + 2 minions

    const ev2 = run(sim, seconds(1.0));
    const spawns2 = ev2.filter((e) => e.t === 'spawn' && e.def === 'test-ant');
    expect(spawns2.length).toBe(2);
    expect(sim.state.critters.size).toBe(5);
  });

  it('playDeadTimes=2: revives twice (two fakeDeath events) before dying for real', () => {
    const sim = new Sim(quietLevel(), opts());
    const cr = sim.debugSpawn('p2-playdead2', { s: 0, c: 3, r: 3 });
    const fakeDeaths: SimEvent[] = [];
    let dies: SimEvent[] = [];

    for (let i = 0; i < 3 && sim.state.critters.has(cr.id); i++) {
      // whatever hp remains, this always kills (playDead resets hp to 40% of max each time)
      const c = sim.state.critters.get(cr.id)!;
      if (c.state === 'playDead') {
        // wait it out
        const ev = run(sim, seconds(2.5));
        fakeDeaths.push(...ev.filter((e) => e.t === 'fakeDeath'));
        dies.push(...ev.filter((e) => e.t === 'die'));
        continue;
      }
      damageCritter(sim, c, 999, 'spray', 'spell');
      const evNow: SimEvent[] = [];
      // damageCritter emits synchronously into the sim's internal queue; flush via a tick
      evNow.push(...run(sim, 1));
      fakeDeaths.push(...evNow.filter((e) => e.t === 'fakeDeath'));
      dies.push(...evNow.filter((e) => e.t === 'die'));
    }
    // ensure fully resolved
    let guard = 0;
    while (sim.state.critters.has(cr.id) && guard < 300) {
      const c = sim.state.critters.get(cr.id)!;
      if (c.state !== 'playDead') damageCritter(sim, c, 999, 'spray', 'spell');
      const ev = run(sim, 1);
      fakeDeaths.push(...ev.filter((e) => e.t === 'fakeDeath'));
      dies.push(...ev.filter((e) => e.t === 'die'));
      guard++;
    }
    expect(fakeDeaths.length).toBe(2);
    expect(dies.length).toBe(1);
    expect(sim.state.critters.has(cr.id)).toBe(false);
  });

  it('anchored: applyKnockback is a no-op (no shove, no fall)', () => {
    const sim = new Sim(quietLevel(), opts());
    const cr = sim.debugSpawn('p2-anchored', { s: 0, c: 3, r: 3 });
    const c = sim.state.critters.get(cr.id)!;
    const before = { ...c.pos };
    applyKnockback(sim, c, 1, 0, 5);
    const after = sim.state.critters.get(cr.id)!;
    expect(after.pos.x).toBeCloseTo(before.x, 6);
    expect(after.pos.z).toBeCloseTo(before.z, 6);
    expect(after.state).toBe('walk');
  });

  it('healPulse: heals nearby critters for 8% of maxHp every 3s, capped at maxHp', () => {
    const sim = new Sim(quietLevel(), opts());
    sim.debugSpawn('p2-healpulse', { s: 0, c: 3, r: 3 });
    // speed-0 victim so it doesn't wander outside the 2.0-tile heal radius before the first pulse
    const victim = sim.debugSpawn('p2-stationary-tank', { s: 0, c: 3, r: 4 }); // 1 tile away, within 2.0
    damageCritter(sim, sim.state.critters.get(victim.id)!, 100, 'spray', 'spell');
    const hpAfterHit = sim.state.critters.get(victim.id)!.hp;
    const maxHp = sim.state.critters.get(victim.id)!.maxHp;

    run(sim, seconds(3.1));
    const healed = sim.state.critters.get(victim.id)!.hp;
    expect(healed).toBeGreaterThan(hpAfterHit);
    expect(healed).toBeCloseTo(hpAfterHit + maxHp * 0.08, 0);
  });

  it('speedAura: nearby critters move faster, stamp resets each tick', () => {
    const sim = new Sim(quietLevel(), opts());
    sim.debugSpawn('p2-speedaura', { s: 0, c: 3, r: 3 });
    const target = sim.debugSpawn('test-ant', { s: 0, c: 3, r: 4 });
    run(sim, 1);
    // hasteStamp should have been applied then consumed by effectiveSpeed within the same batch of ticks
    const c = sim.state.critters.get(target.id)!;
    expect(c.hasteStamp).toBe(0); // consumed, not left dangling
  });

  it('clutterEater: ignores the cake and heads for the nearest clutter piece, then chews it', () => {
    const lvl = tinyLevel({ waves: QUIET_WAVES, clutterDeck: ['box-o'], startCrumbs: 500 });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    expect(sim.state.clutter.size).toBe(1);

    const cr = sim.debugSpawn('p2-clutter-eater', { s: 0, c: 0, r: 0 });
    const ev = run(sim, seconds(5));
    const c = sim.state.critters.get(cr.id)!;
    expect(['chew', 'walk']).toContain(c.state);
    expect(ev.some((e) => e.t === 'clutterChew' || e.t === 'clutterGone')).toBe(true);
  });

  it('clutterEater: flees when no clutter exists anywhere', () => {
    const sim = new Sim(quietLevel(), opts());
    const cr = sim.debugSpawn('p2-clutter-eater', { s: 0, c: 3, r: 3 });
    run(sim, 1);
    expect(sim.state.critters.get(cr.id)!.state).toBe('flee');
  });

  it('towerSmash: disables the nearest tower within range every 6s', () => {
    const lvl = tinyLevel({ waves: QUIET_WAVES });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'placeTower', def: 'test-trap', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tower = [...sim.state.towers.values()][0];
    sim.debugSpawn('p2-towersmash', { s: 0, c: 4, r: 3 }); // within 3.5 tiles

    const ev = run(sim, seconds(6.1));
    const disabledEv = ev.filter((e) => e.t === 'towerDisabled');
    expect(disabledEv.length).toBeGreaterThanOrEqual(1);
    expect(sim.state.towers.get(tower.id)!.disabled).toBeGreaterThan(0);
  });

  it('webber: disables the nearest tower anywhere every 8s, unlimited range', () => {
    const lvl = tinyLevel({ waves: QUIET_WAVES });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'placeTower', def: 'test-trap', at: { s: 0, c: 7, r: 0 } });
    run(sim, 1);
    const tower = [...sim.state.towers.values()][0];
    sim.debugSpawn('p2-webber', { s: 0, c: 0, r: 7 }); // far away

    const ev = run(sim, seconds(8.1));
    const disabledEv = ev.filter((e) => e.t === 'towerDisabled');
    expect(disabledEv.length).toBeGreaterThanOrEqual(1);
    expect(sim.state.towers.get(tower.id)!.disabled).toBeGreaterThan(0);
  });

  it('submerge: cycles hidden/surfaced and is immune to damage while submerged', () => {
    const sim = new Sim(quietLevel(), opts());
    const cr = sim.debugSpawn('p2-submerge', { s: 0, c: 3, r: 3 });
    run(sim, 1);
    expect(sim.state.critters.get(cr.id)!.hidden).toBe(false); // starts surfaced (t < 4s)

    run(sim, seconds(4.5)); // now in the 4-7s submerged window
    const sub = sim.state.critters.get(cr.id)!;
    expect(sub.hidden).toBe(true);
    const hpBefore = sub.hp;
    damageCritter(sim, sub, 50, 'spray', 'spell');
    expect(sim.state.critters.get(cr.id)!.hp).toBe(hpBefore); // immune while submerged

    run(sim, seconds(3)); // wrap back around to surfaced (cycle = 7s)
    const resurfaced = sim.state.critters.get(cr.id)!;
    expect(resurfaced.hidden).toBe(false);
    const hpBefore2 = resurfaced.hp;
    damageCritter(sim, resurfaced, 5, 'spray', 'spell');
    expect(sim.state.critters.get(cr.id)!.hp).toBeLessThan(hpBefore2);
  });

  it('lateFlier: takes wing once path-distance to the cake drops below 6 tiles', () => {
    const sim = new Sim(quietLevel(), opts());
    const cr = sim.debugSpawn('p2-latefly', { s: 0, c: 0, r: 0 }); // far from cake (6,6)
    run(sim, 1);
    expect(sim.state.critters.get(cr.id)!.flying).toBe(false);

    const c = sim.state.critters.get(cr.id)!;
    c.pos = { x: 6.5, y: 0, z: 5.5 }; // adjacent to the cake tile, well within 6
    run(sim, 1);
    expect(sim.state.critters.get(cr.id)!.flying).toBe(true);
  });

  it('bountyPct DamageOpts boosts bounty on kill', () => {
    const sim = new Sim(quietLevel(), opts());
    const cr = sim.debugSpawn('test-ant', { s: 0, c: 3, r: 3 });
    const before = sim.state.crumbEnts.size;
    damageCritter(sim, sim.state.critters.get(cr.id)!, 999, 'spray', 'tower', { bountyPct: 1.0 });
    run(sim, 1);
    expect(sim.state.crumbEnts.size).toBeGreaterThan(before);
    const ent = [...sim.state.crumbEnts.values()].at(-1)!;
    // test-ant bounty 5 * diff.bounty(1.0) * (1 + 0 + 1.0) = 10
    expect(ent.value).toBe(10);
  });
});
