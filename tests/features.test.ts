import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import type { CritterDef, SimEvent, SimOptions, TowerDef } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

const seconds = (s: number) => Math.round(s / SIM_DT);
function run(sim: Sim, n: number): SimEvent[] {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
}

/** Content with feature-bearing defs layered on top of the standard test set. */
function featureContent() {
  const content = testContent();
  content.critters = {
    ...content.critters,
    'test-stinker': {
      id: 'test-stinker', name: 'Stinker', tier: 2, hp: 10, speed: 1.5, size: 0.4,
      bounty: 8, bites: 1, resist: null, weak: null, traits: ['deathGas'], desc: 'test',
    } as CritterDef,
    'test-boss': {
      id: 'test-boss', name: 'Boss', tier: 5, hp: 500, speed: 0.5, size: 1.0,
      bounty: 100, bites: 3, resist: null, weak: null, boss: true,
      traits: ['crumbShed', 'crumbHeal'], desc: 'test',
    } as CritterDef,
  };
  content.towers = {
    ...content.towers,
    'test-gnome': {
      id: 'test-gnome', name: 'Gnome', item: 'Gnome', role: 'decoy',
      dmgType: 'heat', attack: 'none', targeting: 'close', floorMount: true,
      tiers: [
        { cost: 60, dmg: 30, rate: 1, range: 1.4, extra: { decoyHp: 80, decoyRadius: 1.3, explodeAoe: 1.4 } },
        { cost: 45, dmg: 50, rate: 1, range: 1.4, extra: { decoyHp: 160, decoyRadius: 1.4, explodeAoe: 1.5 } },
        { cost: 80, dmg: 80, rate: 1, range: 1.4, extra: { decoyHp: 300, decoyRadius: 1.5, explodeAoe: 1.7 } },
      ],
      branches: [],
      desc: 'test', barks: ['hm'],
    } as TowerDef,
    'test-tape': {
      id: 'test-tape', name: 'Tape', item: 'Tape', role: 'floor slow',
      dmgType: 'spray', attack: 'aura', targeting: 'close', floorMount: true,
      tiers: [
        { cost: 50, dmg: 0, rate: 1, range: 1.2, extra: { slowPct: 0.5 } },
        { cost: 40, dmg: 0, rate: 1, range: 1.3, extra: { slowPct: 0.6 } },
        { cost: 70, dmg: 0, rate: 1, range: 1.5, extra: { slowPct: 0.7 } },
      ],
      branches: [],
      desc: 'test', barks: ['stick'],
    } as TowerDef,
  };
  return content;
}

const fopts = (seed = 42): SimOptions => ({ seed, difficulty: 'houseguest', content: featureContent() });

describe('Content-driven sim features', () => {
  it('floorMount towers place directly on walkable floor', () => {
    const sim = new Sim(tinyLevel({ startCrumbs: 300 }), fopts());
    sim.command({ type: 'placeTower', def: 'test-tape', at: { s: 0, c: 4, r: 1 } });
    const ev = run(sim, 1);
    expect(ev.filter((e) => e.t === 'towerPlace')).toHaveLength(1);
    const tw = [...sim.state.towers.values()][0];
    expect(tw.mountClutter).toBe(null);
  });

  it('deathGas critters disable nearby towers when killed', () => {
    const sim = new Sim(tinyLevel({ startCrumbs: 300 }), fopts());
    sim.command({ type: 'placeTower', def: 'test-tape', at: { s: 0, c: 4, r: 2 } });
    run(sim, 1);
    const stinker = sim.debugSpawn('test-stinker', { s: 0, c: 4, r: 2 });
    sim.debugDamage(stinker.id, 999, 'heat');
    const ev = run(sim, 1);
    expect(ev.some((e) => e.t === 'towerDisabled')).toBe(true);
    const tw = [...sim.state.towers.values()][0];
    expect(tw.disabled).toBeGreaterThan(0);
  });

  it('decoy gnome lures critters, soaks hits, then explodes', () => {
    const sim = new Sim(tinyLevel({ startCrumbs: 300 }), fopts());
    sim.command({ type: 'placeTower', def: 'test-gnome', at: { s: 0, c: 4, r: 1 } });
    run(sim, 1);
    const gnome = [...sim.state.towers.values()][0];
    expect(gnome.hp).toBe(80);
    sim.command({ type: 'callWave' });
    const ev = run(sim, seconds(20));
    // ants stopped to beat up the gnome instead of (or before) reaching the cake
    expect(ev.some((e) => e.t === 'towerHit')).toBe(true);
    // gnome died and exploded, killing attackers
    expect(ev.some((e) => e.t === 'towerGone')).toBe(true);
    expect(ev.some((e) => e.t === 'die')).toBe(true);
    expect(sim.state.towers.size).toBe(0);
  });

  it('crumbShed boss drops crumbs as it walks; crumbHeal boss eats board crumbs to heal', () => {
    const sim = new Sim(tinyLevel(), fopts());
    const boss = sim.debugSpawn('test-boss', { s: 0, c: 2, r: 2 });
    const ev = run(sim, seconds(5));
    expect(ev.filter((e) => e.t === 'crumbDrop').length).toBeGreaterThanOrEqual(2);
    // hurt it, then feed it a crumb right on its path
    sim.debugDamage(boss.id, 100, 'swat');
    const hpAfterHit = sim.state.critters.get(boss.id)!.hp;
    sim.dropCrumbs({ ...sim.state.critters.get(boss.id)!.pos }, 0, 10);
    run(sim, seconds(1));
    expect(sim.state.critters.get(boss.id)!.hp).toBeGreaterThan(hpAfterHit);
  });

  it('branch mods can apply statuses on hit (soakedDur)', () => {
    const content = featureContent();
    content.towers['test-gun'] = {
      ...content.towers['test-gun'],
      branches: [
        { id: 'soaker', name: 'Soaker', desc: 'soaks', cost: 50, mod: { soakedDur: 2 } },
        ...content.towers['test-gun'].branches,
      ],
    };
    const sim = new Sim(
      tinyLevel({ clutterDeck: ['box-o'], clutterPerWave: 3, startCrumbs: 900 }),
      { seed: 42, difficulty: 'houseguest', content },
    );
    sim.command({ type: 'placeClutter', shape: 'box-o', rot: 0, at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 3 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    sim.command({ type: 'upgradeTower', id: tw.id });
    sim.command({ type: 'upgradeTower', id: tw.id });
    sim.command({ type: 'branchTower', id: tw.id, branch: 'soaker' });
    run(sim, 1);
    const tank = sim.debugSpawn('test-tank', { s: 0, c: 4, r: 4 }); // slow, survives hits
    run(sim, seconds(3));
    expect(sim.state.critters.get(tank.id)!.statuses.soaked).toBeGreaterThan(0);
  });
});
