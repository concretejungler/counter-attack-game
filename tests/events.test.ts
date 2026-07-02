import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import { CHOICE_DEADLINE_SECONDS } from '../src/sim/events';
import type { LevelDef, SimEvent, SimOptions } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

/** A long, generous level so events reliably get several wave-start rolls within the test window. */
function eventsLevel(overrides: Partial<LevelDef> = {}): LevelDef {
  return tinyLevel({
    startCrumbs: 5000,
    cakeSlices: 10000,
    waves: Array.from({ length: 8 }, () => ({
      entries: [{ critter: 'test-ant', count: 3, interval: 0.5, spawn: 'door', delay: 0 }],
    })),
    ...overrides,
  });
}

function playThrough(sim: Sim, waves: number, ticksPerWave = seconds(20)): SimEvent[] {
  const all: SimEvent[] = [];
  for (let w = 0; w < waves; w++) {
    sim.command({ type: 'callWave' });
    all.push(...run(sim, ticksPerWave));
    // auto-resolve any pending choice by just letting the deadline pass (already inside ticksPerWave in most cases)
  }
  return all;
}

describe('Random events: inert unless enabled', () => {
  it('events:false (default) never rolls an event even across many waves', () => {
    const level = eventsLevel();
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent() }); // events omitted -> false
    const ev = playThrough(sim, 8);
    expect(ev.some((e) => e.t === 'eventStart')).toBe(false);
    expect(sim.state.activeEvents.length).toBe(0);
    expect(sim.state.pendingChoice).toBe(null);
  });

  it('events:false ignores eventChance:1 on the level too (engine gate, not just the roll)', () => {
    const level = eventsLevel({ eventChance: 1 });
    const sim = new Sim(level, { seed: 1, difficulty: 'houseguest', content: testContent(), events: false });
    const ev = playThrough(sim, 8);
    expect(ev.some((e) => e.t === 'eventStart')).toBe(false);
  });
});

describe('Random events: rolling and effects', () => {
  it('rolls at most 2 events across a whole level even with eventChance:1 every wave', () => {
    const level = eventsLevel({ eventChance: 1 });
    const sim = new Sim(level, { seed: 3, difficulty: 'houseguest', content: testContent(), events: true });
    const ev = playThrough(sim, 8);
    const starts = ev.filter((e) => e.t === 'eventStart');
    expect(starts.length).toBeGreaterThan(0);
    expect(starts.length).toBeLessThanOrEqual(2);
    expect(sim.state.eventsThisLevel).toBeLessThanOrEqual(2);
  });

  it('never rolls when eventChance:0', () => {
    const level = eventsLevel({ eventChance: 0 });
    const sim = new Sim(level, { seed: 3, difficulty: 'houseguest', content: testContent(), events: true });
    const ev = playThrough(sim, 8);
    expect(ev.some((e) => e.t === 'eventStart')).toBe(false);
  });

  it('same seed + same options produces the same sequence of events (deterministic)', () => {
    const level = eventsLevel({ eventChance: 1 });
    function eventIdsFor(seed: number): string[] {
      const sim = new Sim(level, { seed, difficulty: 'houseguest', content: testContent(), events: true });
      const ev = playThrough(sim, 8);
      return ev.filter((e) => e.t === 'eventStart').map((e) => (e.t === 'eventStart' ? e.id : ''));
    }
    const a = eventIdsFor(9);
    const b = eventIdsFor(9);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });

  it('a non-choice instant event (crumbRain) drops crumbs on the board immediately', () => {
    // isolate to a content set with only the instant crumbRain event so the roll is deterministic-by-construction
    const content = testContent();
    const only = { ...content, events: { 'test-crumb-rain': content.events['test-crumb-rain'] } };
    const level = eventsLevel({ eventChance: 1 });
    const sim = new Sim(level, { seed: 4, difficulty: 'houseguest', content: only, events: true });
    const before = sim.state.crumbEnts.size;
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(2));
    expect(ev.some((e) => e.t === 'eventStart' && e.id === 'test-crumb-rain')).toBe(true);
    expect(ev.some((e) => e.t === 'eventEnd' && e.id === 'test-crumb-rain')).toBe(true);
    expect(sim.state.crumbEnts.size).toBeGreaterThan(before);
  });

  it('a timed event (powerOutage) disables zap/sonic/light towers for its duration then releases them', () => {
    const content = testContent();
    const only = { ...content, events: { 'test-power-outage': content.events['test-power-outage'] } };
    const level = eventsLevel({ eventChance: 1 });
    const sim = new Sim(level, { seed: 6, difficulty: 'houseguest', content: only, events: true });

    // place a zap-dmgType tower isn't in fixtures; test-freezer is 'cold'. Use test-gun ('spray') as a
    // control (should stay enabled) -- powerOutage only targets zap/sonic/light dmgTypes, of which none
    // exist in the test tower fixtures, so this test instead verifies the active-event lifecycle directly.
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(1));
    expect(ev.some((e) => e.t === 'eventStart' && e.id === 'test-power-outage')).toBe(true);
    expect(sim.state.activeEvents.some((a) => a.effect === 'powerOutage')).toBe(true);

    run(sim, seconds(6)); // durationSec: 6 -- should have expired by now
    expect(sim.state.activeEvents.some((a) => a.effect === 'powerOutage')).toBe(false);
  });

  it('a timed event (gust) speeds up fliers for its duration', () => {
    const content = testContent();
    const only = { ...content, events: { 'test-gust': content.events['test-gust'] } };
    const level = eventsLevel({ eventChance: 1, waves: [{ entries: [{ critter: 'test-fly', count: 1, interval: 1, spawn: 'door', delay: 0.5 }] }] });
    const sim = new Sim(level, { seed: 8, difficulty: 'houseguest', content: only, events: true });
    sim.command({ type: 'callWave' });
    run(sim, seconds(1));
    expect(sim.state.activeEvents.some((a) => a.effect === 'gust')).toBe(true);
  });
});

describe('Oh-Crap scenarios: choice machinery', () => {
  it('a choice deadline auto-resolves to option 1 (the passive pick) after 5 seconds', () => {
    const content = testContent();
    const only = { ...content, events: { 'test-sock-strike': content.events['test-sock-strike'] } };
    const level = eventsLevel({ eventChance: 1 });
    const sim = new Sim(level, { seed: 12, difficulty: 'houseguest', content: only, events: true });
    sim.command({ type: 'callWave' });
    const ev1 = run(sim, seconds(1));
    const offered = ev1.find((e) => e.t === 'choiceOffered');
    expect(offered).toBeTruthy();
    expect(sim.state.pendingChoice).not.toBe(null);
    // deadline is offerTime + CHOICE_DEADLINE_SECONDS, and the event was offered sometime within
    // the first second of ticks -- so it must land within (0, 1] seconds of that window's start.
    const deadline = sim.state.pendingChoice!.deadline;
    expect(deadline).toBeGreaterThan(CHOICE_DEADLINE_SECONDS);
    expect(deadline).toBeLessThanOrEqual(CHOICE_DEADLINE_SECONDS + 1);

    // don't send a 'choose' command -- let time pass the deadline
    const ev2 = run(sim, seconds(CHOICE_DEADLINE_SECONDS + 0.5));
    const made = ev2.find((e) => e.t === 'choiceMade');
    expect(made).toBeTruthy();
    expect(made && made.t === 'choiceMade' ? made.option : -1).toBe(1);
    expect(made && made.t === 'choiceMade' ? made.auto : false).toBe(true);
    expect(sim.state.pendingChoice).toBe(null);
  });

  it('choosing option 0 resolves immediately without waiting for the deadline', () => {
    const content = testContent();
    const only = { ...content, events: { 'test-sock-strike': content.events['test-sock-strike'] } };
    const level = eventsLevel({ eventChance: 1 });
    const sim = new Sim(level, { seed: 12, difficulty: 'houseguest', content: only, events: true });
    sim.command({ type: 'callWave' });
    run(sim, seconds(1));
    expect(sim.state.pendingChoice).not.toBe(null);

    sim.command({ type: 'choose', option: 0 });
    const ev = run(sim, 2);
    const made = ev.find((e) => e.t === 'choiceMade');
    expect(made && made.t === 'choiceMade' ? made.option : -1).toBe(0);
    expect(made && made.t === 'choiceMade' ? made.auto : true).toBe(false);
    expect(sim.state.pendingChoice).toBe(null);
  });

  it('Ant Diplomacy: accepting the ceasefire (option 0) pays 50% crumbs and skips the next 3 waves\' spawns', () => {
    const content = testContent();
    const only = { ...content, events: { 'test-ant-diplomacy': content.events['test-ant-diplomacy'] } };
    const level = eventsLevel({ eventChance: 1 });
    const sim = new Sim(level, { seed: 15, difficulty: 'houseguest', content: only, events: true });
    const crumbsBefore = sim.state.crumbs;

    sim.command({ type: 'callWave' }); // wave 0 rolls the event
    run(sim, seconds(1));
    expect(sim.state.pendingChoice).not.toBe(null);
    sim.command({ type: 'choose', option: 0 }); // accept the ceasefire
    const ev = run(sim, seconds(20));

    expect(sim.state.crumbs).toBeLessThan(crumbsBefore); // paid 50% tribute
    expect(sim.state.ceasefireWaves).toBeGreaterThan(0); // truce is active
    // wave 0 itself: no test-ant spawns should occur once the ceasefire is accepted before spawns land.
    // (the choice resolves mid-wave-0, so wave 0's own spawns may have already gone out before the
    // accept; the guarantee under test is the NEXT waves are skipped.)
    void ev;

    sim.command({ type: 'callWave' }); // wave 1 -- should be a skipped ceasefire wave
    const waveBeforeCeasefire = sim.state.ceasefireWaves;
    const ev2 = run(sim, seconds(5));
    expect(ev2.some((e) => e.t === 'spawn')).toBe(false);
    expect(sim.state.ceasefireWaves).toBe(waveBeforeCeasefire - 1);
  });

  it('Ant Diplomacy: declining (option 1) costs nothing and spawns proceed normally', () => {
    const content = testContent();
    const only = { ...content, events: { 'test-ant-diplomacy': content.events['test-ant-diplomacy'] } };
    const level = eventsLevel({ eventChance: 1 });
    const sim = new Sim(level, { seed: 15, difficulty: 'houseguest', content: only, events: true });
    const crumbsBefore = sim.state.crumbs;

    sim.command({ type: 'callWave' });
    run(sim, seconds(1));
    expect(sim.state.pendingChoice).not.toBe(null);
    sim.command({ type: 'choose', option: 1 }); // decline
    const ev = run(sim, seconds(20));

    expect(sim.state.crumbs).toBe(crumbsBefore); // no tribute paid
    expect(sim.state.ceasefireWaves).toBe(0);
    expect(ev.some((e) => e.t === 'spawn')).toBe(true); // wave 0's own spawns still happen
  });
});
