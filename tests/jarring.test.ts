import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import { JAR_HP_PCT_THRESHOLD, JAR_TOWER_DEFAULT } from '../src/sim/hand';
import { TOWER_DEFS } from '../src/content/towers';
import type { ContentDB, SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

/** testContent() plus the real jarred-unique tower defs from src/content/towers.ts. */
function jarContent(): ContentDB {
  const base = testContent();
  return {
    ...base,
    towers: {
      ...base.towers,
      'jar-wasp': TOWER_DEFS['jar-wasp'],
      'jar-firefly': TOWER_DEFS['jar-firefly'],
      'jar-stag': TOWER_DEFS['jar-stag'],
      'jar-queen-ant': TOWER_DEFS['jar-queen-ant'],
      'jar-pillbug': TOWER_DEFS['jar-pillbug'],
    },
  };
}

const opts = (seed = 42): SimOptions => ({ seed, difficulty: 'houseguest', content: jarContent() });

describe('Jarring: shiny spawns', () => {
  it('same seed produces the same shiny critter ids across two sims (deterministic)', () => {
    // A big wave gives plenty of 1-in-100 rolls to land at least one shiny deterministically.
    const waves = [{ entries: [{ critter: 'test-ant', count: 400, interval: 0.02, spawn: 'door', delay: 0 }] }];
    const lvl = tinyLevel({ waves, cakeSlices: 10000 });

    function shinyIdsFor(seed: number): number[] {
      const sim = new Sim(lvl, opts(seed));
      sim.command({ type: 'callWave' });
      const ev = run(sim, seconds(20));
      return ev.filter((e) => e.t === 'shinySpawn').map((e) => (e as { id: number }).id);
    }

    const a = shinyIdsFor(7);
    const b = shinyIdsFor(7);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0); // 400 rolls at 1% should almost certainly land at least one
  });

  it('scout spawns (build-phase, >=50% scent) are never shiny', () => {
    const lvl = tinyLevel({ waves: [{ entries: [{ critter: 'test-ant', count: 1, interval: 1, spawn: 'door', delay: 0 }] }] });
    const sim = new Sim(lvl, opts());
    // seed a real crumb pile so updateScent sustains >=50% instead of decaying it straight back down
    sim.state.crumbEnts.set(9001, { id: 9001, pos: { x: 1, y: 0, z: 1 }, surface: 0, value: 140, sweepT: 0 });
    run(sim, seconds(6)); // let scent climb to its crumb-derived target (~70%)
    expect(sim.state.scent).toBeGreaterThanOrEqual(50);
    const ev = run(sim, seconds(30));
    const scoutSpawns = ev.filter((e) => e.t === 'scoutSpawn');
    expect(scoutSpawns.length).toBeGreaterThan(0);
    // no shinySpawn should ever originate from a scout-triggered spawn in the build phase
    // (the sim only calls spawnCritter with shinyEligible:false for scouts — this just guards
    // that scouts don't secretly get lucky via the main roll path)
    expect(ev.some((e) => e.t === 'shinySpawn')).toBe(false);
    expect(sim.state.phase).toBe('build');
  });
});

describe('Jarring: capture channel', () => {
  it('jarStart on an eligible shiny critter succeeds, ticks 2s, captures it and unlocks a jarred tower', () => {
    const sim = new Sim(tinyLevel(), opts());
    const cr = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 4 });
    cr.shiny = true;
    cr.statuses.frozen = 3; // hold it still — jarring fails on >0.75 tiles of drift, and a walking
                             // critter would easily out-walk that during a 2s channel
    sim.debugDamage(cr.id, 9, 'swat'); // 10 hp -> 1 hp, well under 20%
    expect(cr.hp / cr.maxHp).toBeLessThan(JAR_HP_PCT_THRESHOLD);

    sim.command({ type: 'jarStart', critterId: cr.id });
    const ev0 = run(sim, 1);
    expect(ev0.some((e) => e.t === 'jarStart' && e.critterId === cr.id)).toBe(true);
    expect(sim.state.jarring).toEqual({ critterId: cr.id, t: expect.any(Number) });

    const ev = run(sim, seconds(2.1));
    expect(sim.state.critters.has(cr.id)).toBe(false); // captured, not killed
    expect(ev.some((e) => e.t === 'die')).toBe(false); // no death event
    expect(sim.state.jarring).toBe(null);
    const jarDone = ev.find((e) => e.t === 'jarDone');
    expect(jarDone).toBeTruthy();
    expect(jarDone && jarDone.t === 'jarDone' ? jarDone.towerDef : null).toBe(JAR_TOWER_DEFAULT);
    expect(sim.state.jarredStock).toEqual([JAR_TOWER_DEFAULT]);
  });

  it('jarStart fails as ineligible when not shiny, above HP threshold, boss, or hand carrying', () => {
    const sim = new Sim(tinyLevel({ clutterDeck: ['box-o'], clutterPerWave: 3, startCrumbs: 500 }), opts());

    // not shiny
    const notShiny = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 4 });
    sim.debugDamage(notShiny.id, 9, 'swat');
    sim.command({ type: 'jarStart', critterId: notShiny.id });
    let ev = run(sim, 1);
    expect(ev.some((e) => e.t === 'jarFail' && e.reason === 'ineligible')).toBe(true);
    expect(sim.state.jarring).toBe(null);

    // shiny but hp too high
    const tooHealthy = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 5 });
    tooHealthy.shiny = true;
    sim.command({ type: 'jarStart', critterId: tooHealthy.id });
    ev = run(sim, 1);
    expect(ev.some((e) => e.t === 'jarFail' && e.reason === 'ineligible')).toBe(true);

    // shiny, low hp, but hand is carrying a tower
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 0, r: 3 } });
    run(sim, 1);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 0, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    sim.command({ type: 'carryStart', towerId: tw.id });
    run(sim, 1);
    const eligible = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 6 });
    eligible.shiny = true;
    sim.debugDamage(eligible.id, 9, 'swat');
    sim.command({ type: 'jarStart', critterId: eligible.id });
    ev = run(sim, 1);
    expect(ev.some((e) => e.t === 'jarFail' && e.reason === 'ineligible')).toBe(true);
  });

  it('jar channel fails if the critter moves more than the tolerance from its anchor', () => {
    const sim = new Sim(tinyLevel(), opts());
    const cr = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 4 });
    cr.shiny = true;
    sim.debugDamage(cr.id, 9, 'swat');
    sim.command({ type: 'jarStart', critterId: cr.id });
    run(sim, 1);
    expect(sim.state.jarring).not.toBe(null);

    // shove the critter well past the move tolerance while the channel is active
    cr.pos.x += 2;
    const ev = run(sim, seconds(0.5));
    expect(ev.some((e) => e.t === 'jarFail' && e.reason === 'moved')).toBe(true);
    expect(sim.state.jarring).toBe(null);
    expect(sim.state.critters.has(cr.id)).toBe(true); // still alive, just not captured
    expect(sim.state.jarredStock).toEqual([]);
  });

  it('jar channel fails if the critter dies mid-channel', () => {
    const sim = new Sim(tinyLevel(), opts());
    const cr = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 4 });
    cr.shiny = true;
    sim.debugDamage(cr.id, 9, 'swat');
    sim.command({ type: 'jarStart', critterId: cr.id });
    run(sim, 1);
    expect(sim.state.jarring).not.toBe(null);

    sim.debugDamage(cr.id, 100, 'swat'); // finish it off while channeling
    const ev = run(sim, 2);
    expect(ev.some((e) => e.t === 'jarFail' && e.reason === 'died')).toBe(true);
    expect(sim.state.jarring).toBe(null);
  });

  it('jarCancel command cancels an in-progress channel', () => {
    const sim = new Sim(tinyLevel(), opts());
    const cr = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 4 });
    cr.shiny = true;
    sim.debugDamage(cr.id, 9, 'swat');
    sim.command({ type: 'jarStart', critterId: cr.id });
    run(sim, 1);
    sim.command({ type: 'jarCancel' });
    const ev = run(sim, 1);
    expect(ev.some((e) => e.t === 'jarFail' && e.reason === 'cancelled')).toBe(true);
    expect(sim.state.jarring).toBe(null);
    expect(sim.state.critters.has(cr.id)).toBe(true);
  });

  it('flick/squash/carryStart are ignored while a jar channel is active', () => {
    const sim = new Sim(tinyLevel({ clutterDeck: ['box-o'], clutterPerWave: 3, startCrumbs: 500 }), opts());
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];

    const jarTarget = sim.debugSpawn('test-ant', { s: 0, c: 4, r: 4 });
    jarTarget.shiny = true;
    sim.debugDamage(jarTarget.id, 9, 'swat');
    sim.command({ type: 'jarStart', critterId: jarTarget.id });
    run(sim, 1);
    expect(sim.state.jarring).not.toBe(null);

    const other = sim.debugSpawn('test-ant', { s: 0, c: 0, r: 7 });
    const beforeCharges = sim.state.hand.flickCharges;
    sim.command({ type: 'flick', critterId: other.id, dir: { x: 1, z: 0 }, power: 8 });
    sim.command({ type: 'squash', critterId: other.id });
    sim.command({ type: 'carryStart', towerId: tw.id });
    run(sim, 1);

    expect(sim.state.hand.flickCharges).toBe(beforeCharges); // flick ignored
    expect(sim.state.critters.has(other.id)).toBe(true); // squash ignored
    expect(sim.state.towers.get(tw.id)!.carried).toBe(false); // carryStart ignored
  });
});

describe('Jarring: placing jarred-unique towers', () => {
  it('placing a jar tower consumes one matching stock entry and costs 0 crumbs', () => {
    const lvl = tinyLevel({ clutterDeck: ['box-o'], clutterPerWave: 3, startCrumbs: 50 });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);

    // no stock yet — placement must fail even though the tower is free
    sim.command({ type: 'placeTower', def: 'jar-wasp', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    expect(sim.state.towers.size).toBe(0);

    sim.state.jarredStock.push('jar-wasp');
    const crumbsBefore = sim.state.crumbs;
    sim.command({ type: 'placeTower', def: 'jar-wasp', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    expect(sim.state.towers.size).toBe(1);
    expect([...sim.state.towers.values()][0].def).toBe('jar-wasp');
    expect(sim.state.crumbs).toBe(crumbsBefore); // free
    expect(sim.state.jarredStock).toEqual([]); // stock consumed

    // a second placement attempt has no stock left and must fail
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 5, r: 3 } });
    run(sim, 1);
    sim.command({ type: 'placeTower', def: 'jar-wasp', at: { s: 0, c: 5, r: 3 } });
    run(sim, 1);
    expect(sim.state.towers.size).toBe(1);
  });

  it('jar-stag (blocker) and jar-pillbug (trap) place via their own floorMount/trap paths', () => {
    const lvl = tinyLevel({ startCrumbs: 0 });
    const sim = new Sim(lvl, opts());
    sim.state.jarredStock.push('jar-stag', 'jar-pillbug');
    sim.command({ type: 'placeTower', def: 'jar-stag', at: { s: 0, c: 2, r: 2 } });
    sim.command({ type: 'placeTower', def: 'jar-pillbug', at: { s: 0, c: 3, r: 2 } });
    run(sim, 1);
    expect(sim.state.towers.size).toBe(2);
    const defs = [...sim.state.towers.values()].map((t) => t.def).sort();
    expect(defs).toEqual(['jar-pillbug', 'jar-stag']);
    expect(sim.state.jarredStock).toEqual([]);
  });

  it('jar-queen-ant passively auto-sweeps crumbs in range into the bank (no roaming)', () => {
    const lvl = tinyLevel({ clutterDeck: ['box-o'], clutterPerWave: 3, startCrumbs: 0 });
    const sim = new Sim(lvl, opts());
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    sim.state.jarredStock.push('jar-queen-ant');
    sim.command({ type: 'placeTower', def: 'jar-queen-ant', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    expect(tw.def).toBe('jar-queen-ant');
    const startX = tw.pos.x;

    // drop a crumb pile well within the tower's 2.2-tile aura range
    sim.state.crumbEnts.set(9002, { id: 9002, pos: { x: tw.pos.x + 0.5, y: 0, z: tw.pos.z }, surface: 0, value: 33, sweepT: 0 });
    const crumbsBefore = sim.state.crumbs;
    const ev = run(sim, 5);

    expect(sim.state.crumbEnts.has(9002)).toBe(false); // swept
    expect(sim.state.crumbs).toBe(crumbsBefore + 33); // banked
    expect(ev.some((e) => e.t === 'crumbBank' && e.amount === 33)).toBe(true);
    expect(tw.pos.x).toBe(startX); // never roams — stays put
  });
});
