import { describe, it, expect } from 'vitest';
import { Sim } from '../src/sim/sim';
import { CONTENT, levelById } from '../src/content';

/** Phase-2 spell kinds: timestop, cleanse, gamble, repair, handBuff. */

function freshSim(seed = 7) {
  return new Sim(levelById('kitchen-1'), { seed, difficulty: 'houseguest', content: CONTENT });
}

describe('Five-Second Rule (timestop)', () => {
  it('stuns every critter and freezes them in place', () => {
    const sim = freshSim();
    const a = sim.debugSpawn('ant-worker', { s: 0, c: 0, r: 8 });
    const b = sim.debugSpawn('roach', { s: 0, c: 2, r: 8 });
    sim.state.mana = 100;
    sim.command({ type: 'castSpell', spell: 'five-second-rule' });
    sim.tick();
    expect(a.statuses.stunned ?? 0).toBeGreaterThan(4);
    expect(b.statuses.stunned ?? 0).toBeGreaterThan(4);
    const x0 = a.pos.x, z0 = a.pos.z;
    for (let i = 0; i < 60; i++) sim.tick(); // 2s
    expect(a.pos.x).toBe(x0);
    expect(a.pos.z).toBe(z0);
  });
});

describe('New Lemon Scent (cleanse)', () => {
  it('halves the scent meter and strips sticky/soaked', () => {
    const sim = freshSim();
    const a = sim.debugSpawn('ant-worker', { s: 0, c: 0, r: 8 });
    a.statuses.sticky = 5;
    a.statuses.soaked = 5;
    sim.state.scent = 80;
    sim.state.mana = 100;
    sim.command({ type: 'castSpell', spell: 'new-lemon-scent' });
    sim.tick();
    expect(sim.state.scent).toBeLessThanOrEqual(40);
    expect(a.statuses.sticky).toBeUndefined();
    expect(a.statuses.soaked).toBeUndefined();
  });
});

describe('Insurance Claim (repair)', () => {
  it('restores chewed clutter to full hp', () => {
    const sim = freshSim();
    sim.command({ type: 'placeClutter', shape: sim.state.clutterHand[0], rot: 0, at: { s: 0, c: 0, r: 0 } });
    sim.tick();
    const piece = [...sim.state.clutter.values()][0];
    expect(piece).toBeDefined();
    piece.hp = 10;
    sim.state.mana = 100;
    sim.command({ type: 'castSpell', spell: 'insurance-claim' });
    sim.tick();
    expect(piece.hp).toBe(piece.maxHp);
  });
});

describe('Static Discharge (handBuff)', () => {
  it('lets squash fire repeatedly with no cooldown while active', () => {
    const sim = freshSim();
    const a = sim.debugSpawn('ant-worker', { s: 0, c: 0, r: 8 });
    const b = sim.debugSpawn('ant-worker', { s: 0, c: 1, r: 8 });
    sim.state.mana = 100;
    sim.command({ type: 'castSpell', spell: 'static-discharge' });
    sim.tick();
    expect(sim.state.hand.zapT).toBeGreaterThan(0);
    sim.command({ type: 'squash', critterId: a.id });
    sim.tick();
    sim.command({ type: 'squash', critterId: b.id });
    sim.tick();
    expect(sim.state.critters.has(a.id)).toBe(false);
    expect(sim.state.critters.has(b.id)).toBe(false);
  });
});

describe('Mystery Leftovers (gamble)', () => {
  it('is deterministic for a fixed seed', () => {
    const run = () => {
      const sim = freshSim(42);
      sim.state.mana = 100;
      sim.command({ type: 'castSpell', spell: 'mystery-leftovers' });
      sim.tick();
      return { crumbs: sim.state.crumbs, critters: sim.state.critters.size };
    };
    const a = run();
    const b = run();
    expect(a).toEqual(b);
    // one of the three outcomes must have happened
    const jackpot = a.crumbs > 160;
    const ambush = a.critters > 0;
    const sim = freshSim(42);
    sim.state.mana = 100;
    sim.command({ type: 'castSpell', spell: 'mystery-leftovers' });
    sim.tick();
    const morale = [...sim.state.towers.values()].every((t) => t.moraleT > 0);
    expect(jackpot || ambush || morale || sim.state.towers.size === 0).toBe(true);
  });
});
