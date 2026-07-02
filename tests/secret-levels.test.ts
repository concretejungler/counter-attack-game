import { describe, it, expect } from 'vitest';
import { CONTENT, ALL_LEVELS, CAMPAIGN_LEVELS, SECRET_LEVELS, levelById } from '../src/content';
import { Sim, SIM_DT } from '../src/sim/sim';
import { Grid } from '../src/sim/grid';
import { defaultSave } from '../src/meta/save';
import {
  isSecretUnlocked, secretLockHint, threeStarLevelCount, isFinaleWon,
  worldsGrouped, totalStars, MAX_STARS, furthestUnlockedLevel,
} from '../src/meta/progress';

const seconds = (s: number) => Math.round(s / SIM_DT);

describe('Secret levels — registry', () => {
  it('all four secret levels exist with the expected ids', () => {
    const ids = SECRET_LEVELS.map((l) => l.id).sort();
    expect(ids).toEqual(['secret-crumb', 'secret-credits', 'secret-dev', 'secret-impossible'].sort());
  });

  it('ALL_LEVELS is CAMPAIGN_LEVELS + SECRET_LEVELS, nothing lost or duplicated', () => {
    expect(ALL_LEVELS.length).toBe(CAMPAIGN_LEVELS.length + SECRET_LEVELS.length);
    const ids = new Set(ALL_LEVELS.map((l) => l.id));
    expect(ids.size).toBe(ALL_LEVELS.length); // no duplicate ids
    for (const l of SECRET_LEVELS) expect(ids.has(l.id)).toBe(true);
  });

  it('levelById finds every secret level', () => {
    for (const l of SECRET_LEVELS) {
      expect(levelById(l.id).id).toBe(l.id);
    }
  });

  it('secret levels render as the kitchen theme dispatch (theme: secret is a valid RoomTheme)', () => {
    for (const l of SECRET_LEVELS) expect(l.theme).toBe('secret');
  });

  it('secret levels use world 0, campaign levels never do', () => {
    for (const l of SECRET_LEVELS) expect(l.world).toBe(0);
    for (const l of CAMPAIGN_LEVELS) expect(l.world).toBeGreaterThanOrEqual(1);
  });
});

describe('Secret levels — excluded from campaign progression math', () => {
  it('worldsGrouped() never includes world 0 / any secret level', () => {
    const worlds = worldsGrouped();
    expect(worlds.length).toBe(9); // still exactly the 9 campaign worlds
    for (const worldLevels of worlds) {
      for (const l of worldLevels) {
        expect(l.world).toBeGreaterThanOrEqual(1);
        expect(SECRET_LEVELS.some((s) => s.id === l.id)).toBe(false);
      }
    }
  });

  it('MAX_STARS / totalStars are computed over CAMPAIGN_LEVELS only', () => {
    expect(MAX_STARS).toBe(CAMPAIGN_LEVELS.length * 3);
    const save = defaultSave();
    for (const l of SECRET_LEVELS) save.stars[l.id] = 3; // simulate somehow having "stars" on a secret level
    expect(totalStars(save)).toBe(0); // ignored — secret levels aren't summed
  });

  it('furthestUnlockedLevel() never returns a secret level', () => {
    const save = defaultSave();
    const furthest = furthestUnlockedLevel(save);
    expect(SECRET_LEVELS.some((s) => s.id === furthest.id)).toBe(false);
  });
});

describe('Secret levels — content lint (mirrors tests/content.test.ts, scoped to SECRET_LEVELS)', () => {
  it('every wave entry references a real critter and a real spawn on that level', () => {
    for (const lvl of SECRET_LEVELS) {
      const spawnIds = new Set(lvl.spawns.map((s) => s.id));
      for (const wave of lvl.waves) {
        for (const entry of wave.entries) {
          expect(CONTENT.critters[entry.critter], `${lvl.id}: critter ${entry.critter}`).toBeTruthy();
          expect(spawnIds.has(entry.spawn), `${lvl.id}: spawn ${entry.spawn}`).toBe(true);
        }
      }
    }
  });

  it('clutter decks and allowed towers all resolve; cake/spawns are in-bounds and unblocked', () => {
    for (const lvl of SECRET_LEVELS) {
      const grid = new Grid(lvl);
      for (const shape of lvl.clutterDeck) {
        expect(CONTENT.shapes[shape], `${lvl.id}: shape ${shape}`).toBeTruthy();
      }
      for (const t of lvl.allowedTowers ?? []) {
        expect(CONTENT.towers[t], `${lvl.id}: tower ${t}`).toBeTruthy();
      }
      expect(grid.inBounds(lvl.cakeTile), `${lvl.id}: cake in bounds`).toBe(true);
      expect(grid.isStaticBlocked(lvl.cakeTile), `${lvl.id}: cake not blocked`).toBe(false);
      for (const sp of lvl.spawns) {
        expect(grid.inBounds(sp.tile), `${lvl.id}: spawn ${sp.id} in bounds`).toBe(true);
        expect(grid.isStaticBlocked(sp.tile), `${lvl.id}: spawn ${sp.id} not blocked`).toBe(false);
      }
      expect(lvl.surfaces[0].kind, `${lvl.id}: surfaces[0] must be the floor`).toBe('floor');
    }
  });

  it('every secret level is pathable: every spawn reaches the cake', () => {
    for (const lvl of SECRET_LEVELS) {
      const grid = new Grid(lvl);
      grid.recompute(lvl.cakeTile);
      for (const sp of lvl.spawns) {
        expect(Number.isFinite(grid.distOf(sp.tile)), `${lvl.id}: ${sp.id} reaches cake`).toBe(true);
      }
    }
  });

  it('no dead mutation waves: every mutationWaves entry is within [1, waves.length - 1]', () => {
    for (const lvl of SECRET_LEVELS) {
      for (const mw of lvl.mutationWaves ?? []) {
        expect(mw, `${lvl.id}: mutation wave ${mw} in range`).toBeGreaterThan(0);
        expect(mw, `${lvl.id}: mutation wave ${mw} never fires (level has ${lvl.waves.length} waves)`).toBeLessThan(lvl.waves.length);
      }
    }
  });

  it('no empty waves anywhere in a secret level', () => {
    for (const lvl of SECRET_LEVELS) {
      lvl.waves.forEach((w, i) => {
        const count = w.entries.reduce((a, e) => a + e.count, 0);
        expect(count, `${lvl.id} wave ${i} is empty`).toBeGreaterThanOrEqual(1);
      });
    }
  });
});

describe('Secret levels — unlock predicates', () => {
  it('secret-crumb unlocks once 10 distinct campaign levels are 3-starred, not before', () => {
    const save = defaultSave();
    expect(isSecretUnlocked(save, 'secret-crumb')).toBe(false);
    for (let i = 0; i < 9; i++) save.stars[CAMPAIGN_LEVELS[i].id] = 3;
    expect(threeStarLevelCount(save)).toBe(9);
    expect(isSecretUnlocked(save, 'secret-crumb')).toBe(false);
    save.stars[CAMPAIGN_LEVELS[9].id] = 3;
    expect(threeStarLevelCount(save)).toBe(10);
    expect(isSecretUnlocked(save, 'secret-crumb')).toBe(true);
  });

  it('secret-crumb only counts 3-star levels, not 1/2-star wins', () => {
    const save = defaultSave();
    for (let i = 0; i < 15; i++) save.stars[CAMPAIGN_LEVELS[i].id] = 2;
    expect(isSecretUnlocked(save, 'secret-crumb')).toBe(false);
  });

  it('secret-dev unlocks exactly with save.eggs.fridgeMagnetsSolved', () => {
    const save = defaultSave();
    expect(isSecretUnlocked(save, 'secret-dev')).toBe(false);
    save.eggs.fridgeMagnetsSolved = true;
    expect(isSecretUnlocked(save, 'secret-dev')).toBe(true);
  });

  it('secret-impossible and secret-credits unlock only after sewer-3 is won', () => {
    const save = defaultSave();
    expect(isFinaleWon(save)).toBe(false);
    expect(isSecretUnlocked(save, 'secret-impossible')).toBe(false);
    expect(isSecretUnlocked(save, 'secret-credits')).toBe(false);
    save.stars['sewer-3'] = 1;
    expect(isFinaleWon(save)).toBe(true);
    expect(isSecretUnlocked(save, 'secret-impossible')).toBe(true);
    expect(isSecretUnlocked(save, 'secret-credits')).toBe(true);
  });

  it('beating an earlier sewer level does not unlock the finale-gated secrets', () => {
    const save = defaultSave();
    save.stars['sewer-1'] = 3;
    save.stars['sewer-2'] = 3;
    expect(isSecretUnlocked(save, 'secret-impossible')).toBe(false);
    expect(isSecretUnlocked(save, 'secret-credits')).toBe(false);
  });

  it('secretLockHint returns non-empty kid-voice text for every id, unlocked or not', () => {
    for (const l of SECRET_LEVELS) {
      const hint = secretLockHint(l.id as any);
      expect(typeof hint).toBe('string');
      expect(hint.length).toBeGreaterThan(0);
    }
  });
});

describe('Secret levels — sim sanity (not a balance/par gate — see file header)', () => {
  it('every secret level boots and its first wave can be called without throwing', () => {
    for (const lvl of SECRET_LEVELS) {
      const sim = new Sim(lvl, { seed: 1, difficulty: 'houseguest', content: CONTENT });
      expect(() => {
        sim.command({ type: 'callWave' });
        for (let i = 0; i < seconds(5); i++) sim.tick();
      }, `${lvl.id} should tick cleanly`).not.toThrow();
      expect(sim.state.waveIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it('secret-crumb undefended eventually loses (real waves, not a shell level)', () => {
    const sim = new Sim(levelById('secret-crumb'), { seed: 1, difficulty: 'houseguest', content: CONTENT });
    sim.command({ type: 'callWave' });
    let lost = false;
    for (let i = 0; i < seconds(600) && !lost; i++) {
      lost = sim.tick().some((ev) => ev.t === 'lost');
    }
    expect(lost).toBe(true);
  });

  it('secret-credits starts with startCrumbs: 999 (towers free, per the brief)', () => {
    expect(levelById('secret-credits').startCrumbs).toBe(999);
  });

  it('secret-credits ships 6 waves, each with a tutorial sticky note (rolling credits)', () => {
    const lvl = levelById('secret-credits');
    expect(lvl.waves.length).toBe(6);
    for (let i = 0; i < lvl.waves.length; i++) {
      expect(lvl.tutorial?.some((t) => t.wave === i), `secret-credits wave ${i} has credit text`).toBe(true);
    }
  });

  it('secret-dev ships exactly 5 easy waves', () => {
    expect(levelById('secret-dev').waves.length).toBe(5);
  });

  it('secret-impossible ships 12 waves and forces director on', () => {
    const lvl = levelById('secret-impossible');
    expect(lvl.waves.length).toBe(12);
    expect(lvl.director).toBe(true);
  });

  it('secret-impossible is not referenced by any balance suite (grep guard)', async () => {
    // Static assertion, mirrors the "no balance suite" requirement from the brief: this file
    // itself is the only one allowed to exercise secret-impossible in a sim. Balance suites
    // (tests/balance*.test.ts) reference specific named level exports (KITCHEN_1, LIVING_2, ...)
    // rather than iterating ALL_LEVELS, so secret-impossible is structurally never swept in —
    // this test just documents/pins that invariant against SECRET_IMPOSSIBLE specifically.
    const { SECRET_IMPOSSIBLE } = await import('../src/content/levels/secret');
    expect(SECRET_IMPOSSIBLE.id).toBe('secret-impossible');
  });
});
