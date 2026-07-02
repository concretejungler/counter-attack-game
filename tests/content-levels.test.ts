import { describe, it, expect } from 'vitest';
import type { LevelDef } from '../src/sim/types';
import { CRITTER_DEFS } from '../src/content/critters';
import { KITCHEN_LEVELS } from '../src/content/levels/kitchen';
import { LIVING_LEVELS } from '../src/content/levels/living';
import { BATHROOM_LEVELS } from '../src/content/levels/bathroom';
import { BEDROOM_LEVELS } from '../src/content/levels/bedroom';
import { GARAGE_LEVELS } from '../src/content/levels/garage';
import { BASEMENT_LEVELS } from '../src/content/levels/basement';
import { ATTIC_LEVELS } from '../src/content/levels/attic';
import { BACKYARD_LEVELS } from '../src/content/levels/backyard';
import { SEWER_LEVELS } from '../src/content/levels/sewer';

/**
 * Anti-shell lint: levels must contain REAL waves, not token spawns tuned to
 * sneak past the par gate. Floors are calibrated against kitchen (world 1):
 * kitchen-1 hpMass 1166 / 72 critters ... kitchen-5 (boss) hpMass 6698 / 211.
 * Later worlds ramp: swarm pressure never decays as critters get beefier.
 */

const WORLDS: [number, LevelDef[]][] = [
  [1, KITCHEN_LEVELS], [2, LIVING_LEVELS], [3, BATHROOM_LEVELS], [4, BEDROOM_LEVELS],
  [5, GARAGE_LEVELS], [6, BASEMENT_LEVELS], [7, ATTIC_LEVELS], [8, BACKYARD_LEVELS], [9, SEWER_LEVELS],
];

const hpMassOf = (l: LevelDef) =>
  l.waves.reduce((a, w) => a + w.entries.reduce((x, e) => x + e.count * (CRITTER_DEFS[e.critter]?.hp ?? 0), 0), 0);
const crittersOf = (l: LevelDef) => l.waves.reduce((a, w) => a + w.entries.reduce((x, e) => x + e.count, 0), 0);
const isBossLevel = (l: LevelDef) => l.waves.some((w) => w.entries.some((e) => CRITTER_DEFS[e.critter]?.boss));

/** Signature rosters per world — waves must be THEMED, not generic chaff spam. */
const SIGNATURES: Record<number, string[]> = {
  1: ['ant-worker', 'ant-soldier', 'ant-bullet', 'fly-house', 'fly-fruit'],
  2: ['dust-bunny', 'dust-bunnette', 'moth', 'silverfish', 'maggot', 'fly-house', 'cricket-bard', 'moadb'],
  3: ['slug', 'snail', 'roach', 'earwig', 'fly-fruit', 'silverfish', 'sir-clogsworth'],
  4: ['bedbug', 'tick', 'moth', 'mosquito', 'dust-bunny', 'cricket-bard', 'bedbug-baron'],
  5: ['mouse-thief', 'rat-knight', 'beetle', 'pillbug', 'centipede', 'centipede-half', 'centipede-bit', 'ant-bullet', 'rat-king'],
  6: ['tick', 'centipede', 'centipede-half', 'centipede-bit', 'pillbug', 'earwig', 'termite', 'roach-nuclear', 'grandma-longlegs'],
  7: ['moth', 'possum-jr', 'silverfish', 'roach-winged', 'bedbug', 'possum-phantom'],
  8: ['ant-fire', 'ant-carpenter', 'wasp-baron', 'hornet', 'pigeon', 'snail-shaman', 'trash-panda-don'],
  9: ['roach-nuclear', 'centipede', 'centipede-half', 'centipede-bit', 'rat-knight', 'pigeon', 'the-exterminator'],
};

describe('Level content lint: no shell levels', () => {
  for (const [world, levels] of WORLDS) {
    for (const l of levels) {
      const boss = isBossLevel(l);
      it(`${l.id} (world ${world}${boss ? ', boss' : ''}) has real waves and a sane economy`, () => {
        const mass = hpMassOf(l);
        const count = crittersOf(l);
        const massFloor = boss ? 1500 * world : 1000 * world;
        expect(mass, `${l.id} total wave hp-mass ${mass} < floor ${massFloor}`).toBeGreaterThanOrEqual(massFloor);
        expect(count, `${l.id} total critter count`).toBeGreaterThanOrEqual(boss ? 55 : 45);
        expect(l.startCrumbs, `${l.id} startCrumbs too rich`).toBeLessThanOrEqual(230 + 30 * world + (boss ? 60 : 0));
        expect(l.startCrumbs, `${l.id} startCrumbs too poor`).toBeGreaterThanOrEqual(150);
        expect(l.waves.length, `${l.id} wave count`).toBeGreaterThanOrEqual(boss ? 10 : 5);
        const waveCounts = l.waves.map((w) => w.entries.reduce((a, e) => a + e.count, 0));
        for (let i = 0; i < waveCounts.length; i++) {
          expect(waveCounts[i], `${l.id} wave ${i} is empty`).toBeGreaterThanOrEqual(1);
        }
        // waves are SWARMS, not drips: healthy mean size, and single-critter waves are rare accents
        const mean = waveCounts.reduce((a, b) => a + b, 0) / waveCounts.length;
        expect(mean, `${l.id} mean wave size (drip-feed shell?)`).toBeGreaterThanOrEqual(4.5);
        const drips = waveCounts.filter((c) => c < 3).length;
        expect(drips, `${l.id} has too many near-empty waves`).toBeLessThanOrEqual(2);
        if (world >= 2) {
          expect(l.spawns.length, `${l.id} spawn fronts`).toBeGreaterThanOrEqual(2);
        }
        if (l.waves.length >= 7) {
          expect(l.mutationWaves?.length ?? 0, `${l.id} mutation drafts`).toBeGreaterThanOrEqual(1);
        }
        // last wave must be the biggest or near-biggest (crescendo, not fizzle)
        const per = l.waves.map((w) => w.entries.reduce((a, e) => a + e.count * (CRITTER_DEFS[e.critter]?.hp ?? 0), 0));
        const maxMass = Math.max(...per);
        expect(per[per.length - 1], `${l.id} finale wave should crescendo`).toBeGreaterThanOrEqual(maxMass * 0.6);

        // themed composition: enough distinct species, and the world's signature critters carry the level
        const species = new Set<string>();
        let sigCount = 0;
        for (const w of l.waves) {
          for (const e of w.entries) {
            species.add(e.critter);
            if (SIGNATURES[world].includes(e.critter)) sigCount += e.count;
          }
        }
        expect(species.size, `${l.id} species variety`).toBeGreaterThanOrEqual(boss ? 4 : 3);
        expect(sigCount / count, `${l.id} share of world-signature critters`).toBeGreaterThanOrEqual(0.35);
      });
    }
  }
});

describe('Difficulty curve shape', () => {
  const bossLevels = WORLDS.map(([world, levels]) => ({
    world,
    level: levels.find(isBossLevel)!,
    all: levels,
  }));

  it('every world has a boss level', () => {
    for (const b of bossLevels) expect(b.level, `world ${b.world} boss`).toBeDefined();
  });

  it('boss hp-mass rises across worlds (2% tolerance)', () => {
    for (let i = 1; i < bossLevels.length; i++) {
      const prev = hpMassOf(bossLevels[i - 1].level);
      const cur = hpMassOf(bossLevels[i].level);
      expect(cur, `world ${bossLevels[i].world} boss mass ${cur} vs world ${bossLevels[i - 1].world} ${prev}`)
        .toBeGreaterThanOrEqual(prev * 0.98);
    }
  });

  it('the finale is the beefiest level in the game', () => {
    const finale = hpMassOf(SEWER_LEVELS[SEWER_LEVELS.length - 1]);
    for (const [, levels] of WORLDS) {
      for (const l of levels) {
        if (l.id === 'sewer-3') continue;
        expect(hpMassOf(l), `${l.id} out-masses the finale`).toBeLessThanOrEqual(finale);
      }
    }
  });

  it('each world crescendos into its boss level', () => {
    for (const b of bossLevels) {
      const bossMass = hpMassOf(b.level);
      for (const l of b.all) {
        if (l === b.level) continue;
        expect(hpMassOf(l), `${l.id} out-masses its own world boss`).toBeLessThanOrEqual(bossMass);
      }
    }
  });
});
