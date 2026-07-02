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
        for (let i = 0; i < l.waves.length; i++) {
          const waveCount = l.waves[i].entries.reduce((a, e) => a + e.count, 0);
          expect(waveCount, `${l.id} wave ${i} is empty`).toBeGreaterThanOrEqual(1);
        }
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
      });
    }
  }
});
