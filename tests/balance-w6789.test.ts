import { describe, it, expect } from 'vitest';
import { autoPlay, BALANCE_SEEDS, type Step } from './harness/autoplay';
import { BASEMENT_LEVELS } from '../src/content/levels/basement';
import { ATTIC_LEVELS } from '../src/content/levels/attic';
import { BACKYARD_LEVELS } from '../src/content/levels/backyard';
import { SEWER_LEVELS } from '../src/content/levels/sewer';

const cakeGuard = (s: number, c: number, r: number): Step[] => [
  {
    wave: 0,
    clutter: [[0, 0, s], [5, 0, s], [2, 3, s]],
    towers: [
      ['static', 0, 0, s],
      ['mike-rowave', 5, 0, s],
      ['old-stinky', 2, 3, s],
    ],
  },
];

const basementPar = (topSurface = 1): Step[] => [
  {
    wave: 0,
    clutter: [[0, 0, topSurface], [5, 0, topSurface], [2, 3, topSurface]],
    towers: [
      ['static', 0, 0, topSurface],
      ['mike-rowave', 5, 0, topSurface],
      ['old-stinky', 2, 3, topSurface],
    ],
  },
  { wave: 1, clutter: [[2, 7], [11, 7]], towers: [['professor-scorch', 2, 7], ['saltimus-prime', 11, 7]] },
  { wave: 2, towers: [['stick-rick', 3, 7], ['stick-rick', 11, 7], ['snappy-and-sons', 7, 1]] },
  { wave: 3, clutter: [[6, 2, 1], [4, 0, topSurface]], towers: [['static', 6, 2, 1], ['eau-de-no', 4, 0, topSurface]] },
  { wave: 4, towers: [['gnomeo', 7, 8], ['old-smacky', 6, 2, 1]] },
  { wave: 5, clutter: [[12, 8], [1, 8]], towers: [['bandolero', 12, 8], ['sir-toastsalot', 1, 8]] },
  { wave: 6, clutter: [[0, 2, topSurface], [5, 2, topSurface], [2, 0, topSurface], [4, 0, topSurface]], towers: [['the-coldfather', 4, 1, topSurface], ['static', 3, 2, topSurface], ['sir-toastsalot', 0, 2, topSurface], ['mike-rowave', 5, 2, topSurface], ['professor-scorch', 2, 0, topSurface], ['old-smacky', 3, 2, topSurface], ['snappy-and-sons', 2, 1, topSurface], ['snappy-and-sons', 4, 1, topSurface], ['gnomeo', 2, 2, topSurface], ['gnomeo', 4, 2, topSurface], ['stick-rick', 3, 0, topSurface]] },
  { wave: 7, clutter: [[9, 7], [5, 7]], towers: [['mike-rowave', 9, 7], ['old-stinky', 5, 7]] },
  { wave: 8, towers: [['snappy-and-sons', 4, 8], ['gnomeo', 10, 8]] },
  { wave: 9, clutter: [[0, 2, topSurface], [5, 2, topSurface], [2, 0, topSurface], [4, 0, topSurface]], towers: [['sir-toastsalot', 0, 2, topSurface], ['mike-rowave', 5, 2, topSurface], ['professor-scorch', 2, 0, topSurface], ['mike-rowave', 4, 0, topSurface], ['old-smacky', 3, 2, topSurface], ['snappy-and-sons', 2, 1, topSurface], ['snappy-and-sons', 4, 1, topSurface], ['gnomeo', 2, 2, topSurface], ['gnomeo', 4, 2, topSurface], ['stick-rick', 3, 0, topSurface]] },
];

const atticPar: Step[] = [
  {
    wave: 0,
    clutter: [[0, 0, 2], [3, 0, 2], [1, 2, 1]],
    towers: [['static', 0, 0, 2], ['the-daily-smack', 3, 0, 2], ['lux-interior', 1, 2, 1]],
  },
  { wave: 1, clutter: [[2, 0, 1], [6, 0, 1]], towers: [['dj-decibel', 2, 0, 1], ['the-daily-smack', 6, 0, 1]] },
  { wave: 2, towers: [['lux-interior', 1, 1, 2], ['static', 4, 1, 2]] },
  { wave: 3, clutter: [[2, 8], [11, 8]], towers: [['herr-tick-tock', 2, 8], ['bandolero', 11, 8]] },
  { wave: 4, towers: [['stick-rick', 2, 8], ['stick-rick', 11, 8], ['snappy-and-sons', 7, 2, 1]] },
  { wave: 5, clutter: [[5, 2, 1], [8, 2, 1]], towers: [['mike-rowave', 5, 2, 1], ['old-stinky', 8, 2, 1]] },
  { wave: 6, towers: [['the-daily-smack', 4, 0, 2], ['static', 0, 3, 1]] },
  { wave: 7, clutter: [[1, 7], [12, 7]], towers: [['dj-decibel', 1, 7], ['bandolero', 12, 7]] },
  { wave: 8, towers: [['gnomeo', 7, 8], ['snappy-and-sons', 10, 8]] },
];

const backyardOpenPar: Step[] = [
  { wave: 0, clutter: [[6, 4], [10, 4], [7, 6]], towers: [['static', 6, 4], ['professor-scorch', 10, 4], ['the-daily-smack', 7, 6], ['stick-rick', 8, 4]] },
  { wave: 1, clutter: [[6, 4], [10, 4]], towers: [['static', 6, 4], ['the-coldfather', 10, 4]] },
  { wave: 2, clutter: [[5, 6], [11, 6]], towers: [['bandolero', 5, 6], ['dj-decibel', 11, 6]] },
  { wave: 3, towers: [['audrey-the-third', 6, 5], ['count-blendula', 10, 5], ['snappy-and-sons', 8, 3]] },
  { wave: 4, clutter: [[3, 8], [13, 2]], towers: [['mike-rowave', 3, 8], ['static', 13, 2]] },
  { wave: 5, towers: [['old-stinky', 8, 7], ['stick-rick', 7, 4]] },
  { wave: 6, clutter: [[12, 8], [2, 2]], towers: [['bandolero', 12, 8], ['sir-toastsalot', 2, 2]] },
  { wave: 7, towers: [['gnomeo', 5, 5], ['snappy-and-sons', 11, 5]] },
];

const backyardPar: Step[] = [
  {
    wave: 0,
    clutter: [[0, 0, 1], [5, 0, 1], [2, 3, 1]],
    towers: [['static', 0, 0, 1], ['professor-scorch', 5, 0, 1], ['the-daily-smack', 2, 3, 1], ['stick-rick', 7, 1]],
  },
  { wave: 1, clutter: [[3, 8], [11, 8]], towers: [['audrey-the-third', 3, 8], ['count-blendula', 11, 8]] },
  { wave: 2, towers: [['stick-rick', 3, 8], ['stick-rick', 11, 8], ['snappy-and-sons', 7, 1]] },
  { wave: 3, clutter: [[1, 3, 1], [5, 3, 1]], towers: [['the-coldfather', 1, 3, 1], ['static', 5, 3, 1]] },
  { wave: 4, clutter: [[12, 7], [2, 7]], towers: [['bandolero', 12, 7], ['mike-rowave', 2, 7]] },
  { wave: 5, towers: [['dj-decibel', 4, 1, 1], ['old-stinky', 2, 2, 1]] },
  { wave: 6, clutter: [[5, 7], [9, 7]], towers: [['audrey-the-third', 5, 7], ['count-blendula', 9, 7]] },
  { wave: 7, towers: [['gnomeo', 7, 8], ['snappy-and-sons', 10, 8]] },
  { wave: 8, clutter: [[6, 2, 1], [1, 1, 1], [5, 1, 1]], towers: [['bandolero', 6, 2, 1], ['lux-interior', 6, 2, 1], ['professor-scorch', 1, 1, 1], ['static', 5, 1, 1], ['mike-rowave', 3, 2, 1]] },
  { wave: 9, clutter: [[1, 1, 1], [5, 1, 1], [0, 2, 1], [4, 2, 1]], towers: [['professor-scorch', 1, 1, 1], ['mike-rowave', 5, 1, 1], ['static', 3, 3, 1], ['mike-rowave', 0, 2, 1], ['professor-scorch', 4, 2, 1], ['professor-scorch', 2, 1, 1], ['lux-interior', 4, 1, 1], ['static', 2, 2, 1], ['snappy-and-sons', 2, 1, 1], ['snappy-and-sons', 4, 1, 1], ['gnomeo', 2, 2, 1], ['gnomeo', 4, 2, 1], ['stick-rick', 3, 0, 1], ['snappy-and-sons', 3, 8], ['snappy-and-sons', 11, 8], ['snappy-and-sons', 7, 1], ['gnomeo', 6, 8], ['gnomeo', 10, 8], ['stick-rick', 7, 8], ['audrey-the-third', 7, 7], ['count-blendula', 9, 7]] },
];

const backyardBossPar: Step[] = [
  {
    wave: 0,
    clutter: [[0, 0, 1], [5, 0, 1], [2, 3, 1]],
    towers: [['static', 0, 0, 1], ['professor-scorch', 5, 0, 1], ['alexis', 2, 3, 1]],
  },
  ...backyardPar.filter((step) => step.wave !== 0),
];

const sewerPar: Step[] = [
  {
    wave: 0,
    clutter: [[0, 0, 2], [4, 0, 2], [2, 2, 1]],
    towers: [['static', 0, 0, 2], ['professor-scorch', 4, 0, 2], ['stick-rick', 8, 1], ['alexis', 2, 2, 1]],
  },
  { wave: 1, clutter: [[2, 0, 1], [6, 0, 1]], towers: [['mike-rowave', 2, 0, 1], ['professor-scorch', 6, 0, 1]] },
  { wave: 2, towers: [['static', 1, 1, 2], ['mike-rowave', 5, 1, 2]] },
  { wave: 3, clutter: [[3, 8], [12, 8]], towers: [['count-blendula', 3, 8], ['audrey-the-third', 12, 8]] },
  { wave: 4, towers: [['stick-rick', 3, 8], ['stick-rick', 12, 8], ['snappy-and-sons', 8, 1]] },
  { wave: 5, clutter: [[5, 2, 1], [8, 2, 1]], towers: [['professor-scorch', 5, 2, 1], ['alexis', 8, 2, 1]] },
  { wave: 6, clutter: [[1, 7], [14, 7]], towers: [['bandolero', 1, 7], ['static', 14, 7]] },
  { wave: 7, towers: [['dj-decibel', 4, 1, 2], ['the-coldfather', 2, 2, 2]] },
  { wave: 8, clutter: [[7, 3, 1]], towers: [['mike-rowave', 7, 3, 1]] },
  { wave: 9, towers: [['gnomeo', 7, 8], ['snappy-and-sons', 11, 8]] },
  { wave: 10, clutter: [[10, 2, 1], [0, 3, 1]], towers: [['professor-scorch', 10, 2, 1], ['alexis', 0, 3, 1]] },
  { wave: 11, clutter: [[0, 2, 2], [3, 0, 2], [5, 1, 2]], towers: [['static', 0, 2, 2], ['mike-rowave', 3, 0, 2], ['professor-scorch', 5, 1, 2], ['alexis', 5, 0, 2], ['static', 5, 2, 2], ['mike-rowave', 5, 2, 2], ['professor-scorch', 3, 1, 2], ['snappy-and-sons', 2, 1, 2], ['snappy-and-sons', 4, 1, 2], ['gnomeo', 2, 2, 2], ['gnomeo', 4, 2, 2], ['stick-rick', 3, 0, 2]] },
  { wave: 12, clutter: [[1, 0, 2], [4, 2, 2]], towers: [['static', 1, 0, 2], ['professor-scorch', 4, 2, 2], ['alexis', 3, 1, 2]] },
];

const PAR: Record<string, Step[]> = {
  'basement-1': basementPar(),
  'basement-2': basementPar(),
  'basement-3': basementPar(2),
  'basement-4': basementPar(2),
  'basement-5': basementPar(),
  'attic-1': atticPar,
  'attic-2': atticPar,
  'attic-3': atticPar,
  'attic-4': atticPar,
  'backyard-1': backyardOpenPar,
  'backyard-2': backyardPar,
  'backyard-3': backyardPar,
  'backyard-4': backyardPar,
  'backyard-5': backyardBossPar,
  'sewer-1': sewerPar,
  'sewer-2': sewerPar,
  'sewer-3': sewerPar,
};

const LEVELS = [...BASEMENT_LEVELS, ...ATTIC_LEVELS, ...BACKYARD_LEVELS, ...SEWER_LEVELS];

describe('Balance: par player beats Worlds 6-9 on houseguest', () => {
  for (const level of LEVELS) {
    it(`${level.id}: wins >=2/3 seeds with <=6 avg bites`, () => {
      const results = BALANCE_SEEDS.map((s) => autoPlay(level, PAR[level.id], 'houseguest', s, { log: process.env.LEVEL === level.id }));
      const wins = results.filter((r) => r.won).length;
      const avgBites = results.reduce((a, r) => a + r.bites, 0) / results.length;
      const detail = results.map((r) => `${r.won ? 'W' : 'L'}(${r.bites}b,w${r.wavesSurvived})`).join(' ');
      console.log(`  ${level.id}: ${detail} avgBites=${avgBites.toFixed(1)}`);
      expect(wins, `${level.id} wins: ${detail}`).toBeGreaterThanOrEqual(2);
      expect(avgBites, `${level.id} avg bites`).toBeLessThanOrEqual(6);
    });
  }
});
