import { describe, it, expect } from 'vitest';
import type { LevelDef } from '../src/sim/types';
import { autoPlay, BALANCE_SEEDS, type Step } from './harness/autoplay';
import { LIVING_LEVELS } from '../src/content/levels/living';
import { BATHROOM_LEVELS } from '../src/content/levels/bathroom';
import { BEDROOM_LEVELS } from '../src/content/levels/bedroom';
import { GARAGE_LEVELS } from '../src/content/levels/garage';
import { BASEMENT_LEVELS } from '../src/content/levels/basement';
import { ATTIC_LEVELS } from '../src/content/levels/attic';
import { BACKYARD_LEVELS } from '../src/content/levels/backyard';
import { SEWER_LEVELS } from '../src/content/levels/sewer';

/**
 * Hardness floor for every post-tutorial level: a lazy build (two cheap towers,
 * no upgrades, no spells) must LOSE ≥2/3 seeds. Par gates prove winnable;
 * this proves the win must be earned. Together with the hp-mass lint this
 * makes the balance gates un-gameable from either direction.
 */

const LAZY: Step[] = [
  { wave: 0, clutter: [[4, 4]], towers: [['sgt-spritz', 4, 4]] },
  { wave: 1, clutter: [[6, 5]], towers: [['old-smacky', 6, 5]] },
];

const ALL: LevelDef[] = [
  ...LIVING_LEVELS, ...BATHROOM_LEVELS, ...BEDROOM_LEVELS, ...GARAGE_LEVELS,
  ...BASEMENT_LEVELS, ...ATTIC_LEVELS, ...BACKYARD_LEVELS, ...SEWER_LEVELS,
];

describe('Balance: lazy builds lose on every world 2-9 level', () => {
  for (const level of ALL) {
    it(`${level.id}: two unupgraded towers cannot hold`, () => {
      const results = BALANCE_SEEDS.map((s) => autoPlay(level, LAZY, 'houseguest', s, { upgrades: false, spells: false }));
      const losses = results.filter((r) => !r.won).length;
      const detail = results.map((r) => `${r.won ? 'W' : 'L'}(${r.bites}b,w${r.wavesSurvived})`).join(' ');
      expect(losses, `${level.id} lazy build should lose: ${detail}`).toBeGreaterThanOrEqual(2);
    });
  }
});
