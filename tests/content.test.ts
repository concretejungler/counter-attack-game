import { describe, it, expect } from 'vitest';
import { CONTENT, ALL_LEVELS } from '../src/content';
import { Sim, SIM_DT } from '../src/sim/sim';
import { Grid } from '../src/sim/grid';

const seconds = (s: number) => Math.round(s / SIM_DT);

describe('Content lint — every reference resolves', () => {
  it('level waves reference existing critters and spawns', () => {
    for (const lvl of ALL_LEVELS) {
      const spawnIds = new Set(lvl.spawns.map((s) => s.id));
      for (const wave of lvl.waves) {
        for (const entry of wave.entries) {
          expect(CONTENT.critters[entry.critter], `${lvl.id}: critter ${entry.critter}`).toBeTruthy();
          expect(spawnIds.has(entry.spawn), `${lvl.id}: spawn ${entry.spawn}`).toBe(true);
        }
      }
    }
  });

  it('level decks, towers, climbs, cake tiles are valid', () => {
    for (const lvl of ALL_LEVELS) {
      const grid = new Grid(lvl);
      for (const shape of lvl.clutterDeck) {
        expect(CONTENT.shapes[shape], `${lvl.id}: shape ${shape}`).toBeTruthy();
      }
      for (const t of lvl.allowedTowers ?? []) {
        expect(CONTENT.towers[t], `${lvl.id}: tower ${t}`).toBeTruthy();
      }
      expect(grid.inBounds(lvl.cakeTile), `${lvl.id}: cake in bounds`).toBe(true);
      expect(grid.isStaticBlocked(lvl.cakeTile), `${lvl.id}: cake not blocked`).toBe(false);
      for (const climb of lvl.climbs) {
        expect(grid.inBounds(climb.from), `${lvl.id}: climb from`).toBe(true);
        expect(grid.inBounds(climb.to), `${lvl.id}: climb to`).toBe(true);
        expect(climb.from.s).not.toBe(climb.to.s);
      }
      for (const sp of lvl.spawns) {
        expect(grid.inBounds(sp.tile), `${lvl.id}: spawn ${sp.id} in bounds`).toBe(true);
        expect(grid.isStaticBlocked(sp.tile), `${lvl.id}: spawn ${sp.id} not blocked`).toBe(false);
      }
      expect(lvl.surfaces[0].kind, `${lvl.id}: surfaces[0] must be the floor (landing convention)`).toBe('floor');
      for (const mw of lvl.mutationWaves ?? []) {
        expect(mw, `${lvl.id}: mutation wave ${mw} never triggers (level has ${lvl.waves.length} waves)`).toBeLessThan(lvl.waves.length);
        expect(mw, `${lvl.id}: mutation wave ${mw} out of range`).toBeGreaterThan(0);
      }
    }
  });

  it('critter evolutions and splits resolve; tower branches are unique', () => {
    for (const def of Object.values(CONTENT.critters)) {
      if (def.evolveTo) expect(CONTENT.critters[def.evolveTo], `${def.id} evolves`).toBeTruthy();
      if (def.splitInto) expect(CONTENT.critters[def.splitInto.def], `${def.id} splits`).toBeTruthy();
    }
    for (const def of Object.values(CONTENT.towers)) {
      const ids = def.branches.map((b) => b.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(def.tiers).toHaveLength(3);
      // Jarred-unique towers (GAME-PROMPT §2.5) are earned, not bought — cost 0 by design.
      if (!def.id.startsWith('jar-')) {
        for (const tier of def.tiers) expect(tier.cost).toBeGreaterThan(0);
      }
      expect(def.barks.length).toBeGreaterThan(0);
    }
  });

  it('every level is pathable: spawns reach the cake', () => {
    for (const lvl of ALL_LEVELS) {
      const grid = new Grid(lvl);
      grid.recompute(lvl.cakeTile);
      for (const sp of lvl.spawns) {
        expect(Number.isFinite(grid.distOf(sp.tile)), `${lvl.id}: ${sp.id} reaches cake`).toBe(true);
      }
    }
  });
});

describe('Content playthrough sanity', () => {
  it('kitchen-1 undefended: the cake falls by wave 2', () => {
    const sim = new Sim(ALL_LEVELS[0], { seed: 1, difficulty: 'houseguest', content: CONTENT });
    sim.command({ type: 'callWave' });
    let lost = false;
    for (let i = 0; i < seconds(120) && !lost; i++) {
      lost = sim.tick().some((ev) => ev.t === 'lost');
    }
    expect(lost).toBe(true);
    expect(sim.state.waveIndex).toBeLessThanOrEqual(1);
  });

  it('the Crumb King sheds crumbs and heals from them', () => {
    const lvl = ALL_LEVELS[4];
    const sim = new Sim(lvl, { seed: 7, difficulty: 'houseguest', content: CONTENT });
    const boss = sim.debugSpawn('crumb-king', { s: 0, c: 5, r: 9 });
    let drops = 0;
    for (let i = 0; i < seconds(7); i++) {
      drops += sim.tick().filter((ev) => ev.t === 'crumbDrop').length;
    }
    expect(drops).toBeGreaterThanOrEqual(2);
    sim.debugDamage(boss.id, 200, 'swat');
    const hurt = sim.state.critters.get(boss.id)!.hp;
    sim.dropCrumbs({ ...sim.state.critters.get(boss.id)!.pos }, 0, 20);
    for (let i = 0; i < seconds(1); i++) sim.tick();
    expect(sim.state.critters.get(boss.id)!.hp).toBeGreaterThan(hurt);
  });
});
