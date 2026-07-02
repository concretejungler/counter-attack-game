import { describe, it, expect } from 'vitest';
import { autoPlay, BALANCE_SEEDS, type Step } from './harness/autoplay';
import { LIVING_LEVELS } from '../src/content/levels/living';
import { BATHROOM_LEVELS } from '../src/content/levels/bathroom';
import { BEDROOM_LEVELS } from '../src/content/levels/bedroom';
import { GARAGE_LEVELS } from '../src/content/levels/garage';
import { CRITTER_DEFS } from '../src/content/critters';

const ALL_W2345 = [...LIVING_LEVELS, ...BATHROOM_LEVELS, ...BEDROOM_LEVELS, ...GARAGE_LEVELS];

const PAR: Record<string, Step[]> = {
  'living-1': [
    { wave: 0, clutter: [[4, 1, 1]], towers: [['lux-interior', 4, 1, 1], ['sgt-spritz', 4, 1, 1]] },
    { wave: 1, clutter: [[1, 3, 1]], towers: [['the-coldfather', 1, 3, 1], ['old-smacky', 1, 3, 1]] },
    { wave: 2, towers: [['vroomba', 7, 7], ['stick-rick', 4, 7]] },
    { wave: 3, clutter: [[6, 2, 1]], towers: [['bandolero', 6, 2, 1]] },
    { wave: 4, towers: [['gnomeo', 11, 7]] },
  ],
  'living-2': [
    { wave: 0, clutter: [[4, 1, 1]], towers: [['sgt-spritz', 4, 1, 1], ['lux-interior', 4, 1, 1]] },
    { wave: 1, clutter: [[1, 2, 1]], towers: [['the-coldfather', 1, 2, 1], ['old-smacky', 1, 2, 1]] },
    { wave: 2, towers: [['vroomba', 7, 8], ['stick-rick', 3, 3], ['stick-rick', 10, 3]] },
    { wave: 3, clutter: [[2, 1, 2]], towers: [['sir-toastsalot', 2, 1, 2]] },
    { wave: 4, clutter: [[6, 1, 1]], towers: [['bandolero', 6, 1, 1]] },
    { wave: 5, towers: [['gnomeo', 8, 8]] },
  ],
  'living-3': [
    { wave: 0, clutter: [[2, 1, 2]], towers: [['sgt-spritz', 2, 1, 2], ['lux-interior', 2, 1, 2]] },
    { wave: 1, clutter: [[1, 2, 1]], towers: [['the-coldfather', 1, 2, 1], ['old-smacky', 1, 2, 1]] },
    { wave: 2, towers: [['stick-rick', 4, 7], ['stick-rick', 13, 5], ['vroomba', 8, 8]] },
    { wave: 3, clutter: [[3, 2, 2]], towers: [['bandolero', 3, 2, 2]] },
    { wave: 4, clutter: [[4, 1, 1]], towers: [['sir-toastsalot', 4, 1, 1]] },
    { wave: 5, towers: [['gnomeo', 12, 5]] },
  ],
  'living-4': [
    { wave: 0, clutter: [[3, 0, 3]], towers: [['lux-interior', 3, 0, 3], ['sgt-spritz', 3, 0, 3]] },
    { wave: 1, clutter: [[5, 2, 2]], towers: [['the-coldfather', 5, 2, 2], ['old-smacky', 5, 2, 2]] },
    { wave: 2, towers: [['stick-rick', 2, 6], ['stick-rick', 11, 6], ['vroomba', 7, 6]] },
    { wave: 3, clutter: [[1, 1, 3]], towers: [['bandolero', 1, 1, 3]] },
    { wave: 4, clutter: [[7, 1, 2]], towers: [['sir-toastsalot', 7, 1, 2]] },
    { wave: 6, clutter: [[8, 2, 1]], towers: [['sgt-spritz', 8, 2, 1], ['gnomeo', 8, 6]] },
  ],
  'living-5': [
    { wave: 0, clutter: [[2, 1, 2]], towers: [['sgt-spritz', 2, 1, 2], ['lux-interior', 2, 1, 2]] },
    { wave: 1, clutter: [[7, 1, 1]], towers: [['the-coldfather', 7, 1, 1], ['old-smacky', 7, 1, 1]] },
    { wave: 2, towers: [['stick-rick', 3, 8], ['stick-rick', 12, 8], ['vroomba', 8, 8]] },
    { wave: 3, clutter: [[3, 1, 2]], towers: [['bandolero', 3, 1, 2]] },
    { wave: 4, clutter: [[1, 2, 1]], towers: [['sir-toastsalot', 1, 2, 1], ['sgt-spritz', 1, 2, 1]] },
    { wave: 6, towers: [['gnomeo', 12, 8]] },
    { wave: 8, clutter: [[5, 2, 1]], towers: [['bandolero', 5, 2, 1]] },
  ],

  'bathroom-1': [
    { wave: 0, clutter: [[2, 1, 1]], towers: [['saltimus-prime', 2, 1, 1], ['sgt-spritz', 2, 1, 1]] },
    { wave: 1, clutter: [[0, 2, 1]], towers: [['the-coldfather', 0, 2, 1], ['bubbles-laroux', 0, 2, 1]] },
    { wave: 2, towers: [['stick-rick', 5, 7], ['stick-rick', 9, 6], ['snappy-and-sons', 8, 6]] },
    { wave: 3, clutter: [[2, 1, 2]], towers: [['bandolero', 2, 1, 2]] },
    { wave: 5, clutter: [[3, 2, 1]], towers: [['sir-toastsalot', 3, 2, 1]] },
  ],
  'bathroom-2': [
    { wave: 0, clutter: [[2, 1, 2]], towers: [['saltimus-prime', 2, 1, 2], ['bubbles-laroux', 2, 1, 2]] },
    { wave: 1, clutter: [[6, 1, 1]], towers: [['the-coldfather', 6, 1, 1], ['sgt-spritz', 6, 1, 1]] },
    { wave: 2, towers: [['stick-rick', 3, 7], ['stick-rick', 13, 8], ['snappy-and-sons', 11, 5]] },
    { wave: 3, clutter: [[3, 1, 2]], towers: [['bandolero', 3, 1, 2]] },
    { wave: 4, clutter: [[1, 2, 1]], towers: [['sir-toastsalot', 1, 2, 1]] },
    { wave: 6, towers: [['gnomeo', 12, 7]] },
  ],
  'bathroom-3': [
    { wave: 0, clutter: [[3, 1, 2]], towers: [['saltimus-prime', 3, 1, 2], ['bubbles-laroux', 3, 1, 2]] },
    { wave: 1, clutter: [[3, 1, 1]], towers: [['the-coldfather', 3, 1, 1], ['sgt-spritz', 3, 1, 1]] },
    { wave: 2, towers: [['stick-rick', 2, 5], ['stick-rick', 13, 5], ['snappy-and-sons', 8, 5]] },
    { wave: 3, clutter: [[1, 1, 2]], towers: [['bandolero', 1, 1, 2]] },
    { wave: 4, clutter: [[1, 2, 1]], towers: [['sir-toastsalot', 1, 2, 1]] },
    { wave: 6, towers: [['gnomeo', 7, 5]] },
    { wave: 7, clutter: [[4, 2, 2]], towers: [['saltimus-prime', 4, 2, 2]] },
  ],
  'bathroom-4': [
    { wave: 0, clutter: [[3, 1, 2]], towers: [['saltimus-prime', 3, 1, 2], ['sgt-spritz', 3, 1, 2]] },
    { wave: 1, clutter: [[6, 1, 1]], towers: [['bubbles-laroux', 6, 1, 1], ['the-coldfather', 6, 1, 1]] },
    { wave: 2, towers: [['stick-rick', 3, 7], ['stick-rick', 12, 7], ['snappy-and-sons', 14, 7]] },
    { wave: 3, clutter: [[4, 1, 2]], towers: [['bandolero', 4, 1, 2]] },
    { wave: 4, clutter: [[2, 1, 1]], towers: [['sir-toastsalot', 2, 1, 1]] },
    { wave: 6, towers: [['gnomeo', 13, 8]] },
    { wave: 8, clutter: [[7, 2, 1]], towers: [['saltimus-prime', 7, 2, 1], ['sgt-spritz', 7, 2, 1]] },
  ],

  // bedroom-1 post tick-AI change: ticks (wave 3+, from the door) steer to the nearest
  // latchable tower from any range and stall the wave if nothing can kill the latched pile.
  // A floorMount stick-rick magnet at (9,1) goes down FIRST at build 3 (before the delayed
  // wave-3 tick entry spawns); the bed garrison and the wave-4 bandolero (range 7.5 covers
  // the whole floor, 'strong' targeting snipes the pile once real threats are gone) keep the
  // magnet pile from ever soft-locking a wave.
  'bedroom-1': [
    { wave: 0, clutter: [[5, 1, 1]], towers: [['lux-interior', 5, 1, 1], ['sgt-spritz', 5, 1, 1]] },
    { wave: 1, clutter: [[7, 2, 1]], towers: [['dj-decibel', 7, 2, 1], ['the-coldfather', 7, 2, 1]] },
    { wave: 2, towers: [['stick-rick', 3, 8], ['stick-rick', 11, 8], ['snappy-and-sons', 10, 8]] },
    { wave: 3, clutter: [[1, 0, 1]], towers: [['stick-rick', 9, 1], ['static', 1, 0, 1]] },
    { wave: 4, clutter: [[1, 2, 1]], towers: [['bandolero', 1, 2, 1]] },
  ],
  'bedroom-2': [
    { wave: 0, clutter: [[3, 2, 2]], towers: [['lux-interior', 3, 2, 2], ['sgt-spritz', 3, 2, 2]] },
    { wave: 1, clutter: [[5, 1, 1]], towers: [['dj-decibel', 5, 1, 1], ['the-coldfather', 5, 1, 1]] },
    { wave: 2, towers: [['stick-rick', 2, 5], ['stick-rick', 13, 8], ['snappy-and-sons', 14, 7]] },
    { wave: 3, clutter: [[1, 0, 2]], towers: [['static', 1, 0, 2]] },
    { wave: 4, clutter: [[4, 1, 2]], towers: [['old-smacky', 4, 1, 2]] },
    { wave: 6, towers: [['gnomeo', 13, 8]] },
  ],
  'bedroom-3': [
    { wave: 0, clutter: [[2, 1, 2]], towers: [['lux-interior', 2, 1, 2], ['sgt-spritz', 2, 1, 2]] },
    { wave: 1, clutter: [[6, 1, 1]], towers: [['lux-interior', 6, 1, 1], ['dj-decibel', 6, 1, 1]] },
    { wave: 2, towers: [['stick-rick', 4, 8], ['stick-rick', 12, 8], ['snappy-and-sons', 15, 8]] },
    { wave: 3, clutter: [[1, 1, 2]], towers: [['static', 1, 1, 2]] },
    { wave: 4, clutter: [[2, 0, 2]], towers: [['old-smacky', 2, 0, 2]] },
    { wave: 6, towers: [['gnomeo', 12, 8]] },
  ],
  'bedroom-4': [
    { wave: 0, clutter: [[3, 1, 2]], towers: [['lux-interior', 3, 1, 2], ['sgt-spritz', 3, 1, 2]] },
    { wave: 1, clutter: [[7, 1, 1]], towers: [['lux-interior', 7, 1, 1], ['dj-decibel', 7, 1, 1]] },
    { wave: 2, towers: [['stick-rick', 3, 8], ['stick-rick', 12, 8], ['snappy-and-sons', 15, 7]] },
    { wave: 3, clutter: [[0, 1, 2]], towers: [['static', 0, 1, 2]] },
    { wave: 4, clutter: [[0, 2, 2]], towers: [['old-smacky', 0, 2, 2]] },
    { wave: 6, towers: [['gnomeo', 12, 8]] },
    { wave: 8, clutter: [[0, 0, 2]], towers: [['sgt-spritz', 0, 0, 2]] },
  ],

  'garage-1': [
    { wave: 0, clutter: [[5, 1, 1]], towers: [['mike-rowave', 5, 1, 1], ['static', 5, 1, 1]] },
    { wave: 1, clutter: [[7, 2, 1]], towers: [['dj-decibel', 7, 2, 1], ['bandolero', 7, 2, 1]] },
    { wave: 2, towers: [['stick-rick', 4, 7], ['stick-rick', 12, 7], ['snappy-and-sons', 12, 7]] },
    { wave: 3, clutter: [[1, 2, 2], [4, 1, 1]], towers: [['static', 1, 2, 2], ['old-smacky', 4, 1, 1], ['stick-rick', 5, 0, 1]] },
    { wave: 5, towers: [['gnomeo', 12, 7]] },
  ],
  'garage-2': [
    { wave: 0, clutter: [[6, 1, 1]], towers: [['mike-rowave', 6, 1, 1], ['static', 6, 1, 1]] },
    { wave: 1, clutter: [[8, 2, 1]], towers: [['dj-decibel', 8, 2, 1], ['bandolero', 8, 2, 1]] },
    { wave: 2, towers: [['stick-rick', 3, 5], ['stick-rick', 12, 5], ['snappy-and-sons', 12, 5]] },
    { wave: 3, clutter: [[2, 2, 2], [8, 1, 1]], towers: [['static', 2, 2, 2], ['static', 8, 1, 1]] },
    { wave: 4, clutter: [[7, 0, 1]], towers: [['static', 7, 0, 1], ['stick-rick', 8, 5], ['stick-rick', 10, 5]] },
    { wave: 6, towers: [['gnomeo', 12, 5], ['stick-rick', 6, 5], ['stick-rick', 12, 5]] },
  ],
  'garage-3': [
    { wave: 0, clutter: [[3, 1, 2]], towers: [['mike-rowave', 3, 1, 2], ['static', 3, 1, 2]] },
    { wave: 1, clutter: [[5, 1, 1]], towers: [['dj-decibel', 5, 1, 1], ['bandolero', 5, 1, 1]] },
    { wave: 2, towers: [['stick-rick', 4, 8], ['stick-rick', 16, 4], ['snappy-and-sons', 16, 4]] },
    { wave: 3, clutter: [[3, 0, 2], [0, 2, 2]], towers: [['static', 3, 0, 2], ['static', 0, 2, 2]] },
    { wave: 4, clutter: [[3, 2, 2]], towers: [['static', 3, 2, 2]] },
    { wave: 6, towers: [['gnomeo', 11, 8]] },
    { wave: 7, clutter: [[2, 2, 2]], towers: [['mike-rowave', 2, 2, 2]] },
  ],
  'garage-4': [
    { wave: 0, clutter: [[4, 1, 3]], towers: [['mike-rowave', 4, 1, 3], ['static', 4, 1, 3]] },
    { wave: 1, clutter: [[6, 2, 2]], towers: [['dj-decibel', 6, 2, 2], ['bandolero', 6, 2, 2]] },
    { wave: 2, towers: [['stick-rick', 1, 6], ['stick-rick', 13, 6], ['snappy-and-sons', 13, 6]] },
    { wave: 3, clutter: [[1, 2, 3], [6, 0, 3]], towers: [['static', 1, 2, 3], ['old-smacky', 6, 0, 3]] },
    { wave: 4, clutter: [[2, 0, 3]], towers: [['static', 2, 0, 3]] },
    { wave: 6, towers: [['gnomeo', 13, 6]] },
    { wave: 8, clutter: [[5, 1, 3]], towers: [['mike-rowave', 5, 1, 3], ['bandolero', 5, 1, 3]] },
  ],
  'garage-5': [
    { wave: 0, clutter: [[3, 1, 2]], towers: [['mike-rowave', 3, 1, 2], ['static', 3, 1, 2]] },
    { wave: 1, clutter: [[6, 1, 1]], towers: [['dj-decibel', 6, 1, 1], ['bandolero', 6, 1, 1]] },
    { wave: 2, towers: [['stick-rick', 3, 8], ['stick-rick', 12, 8], ['snappy-and-sons', 16, 4]] },
    { wave: 3, clutter: [[6, 1, 2], [1, 1, 2]], towers: [['static', 6, 1, 2], ['static', 1, 1, 2]] },
    { wave: 4, clutter: [[7, 0, 2]], towers: [['static', 7, 0, 2]] },
    { wave: 6, towers: [['gnomeo', 12, 8]] },
    { wave: 8, clutter: [[5, 1, 2]], towers: [['mike-rowave', 5, 1, 2], ['bandolero', 5, 1, 2]] },
    { wave: 10, clutter: [[0, 1, 2]], towers: [['static', 0, 1, 2]] },
  ],
};

const OPENING: Record<string, Step> = {
  'living-1': { wave: 0, clutter: [[4, 6], [10, 6], [3, 1, 1]], towers: [['professor-scorch', 4, 6], ['professor-scorch', 10, 6], ['old-smacky', 3, 1, 1]] },
  'living-2': { wave: 0, clutter: [[3, 3], [10, 3], [3, 1, 1]], towers: [['professor-scorch', 3, 3], ['professor-scorch', 10, 3], ['professor-scorch', 3, 1, 1]] },
  'living-3': { wave: 0, clutter: [[4, 7], [6, 7], [2, 1, 2]], towers: [['old-smacky', 4, 7], ['sgt-spritz', 6, 7], ['sgt-spritz', 2, 1, 2]] },
  'living-4': { wave: 0, clutter: [[2, 5], [11, 5], [2, 0, 3]], towers: [['professor-scorch', 2, 5], ['professor-scorch', 11, 5], ['professor-scorch', 2, 0, 3]] },
  'living-5': { wave: 0, clutter: [[3, 7], [9, 7], [2, 1, 2]], towers: [['professor-scorch', 3, 7], ['professor-scorch', 9, 7], ['sgt-spritz', 2, 1, 2]] },

  'bathroom-1': { wave: 0, clutter: [[5, 6], [9, 5], [2, 1, 1]], towers: [['professor-scorch', 5, 6], ['professor-scorch', 9, 5], ['professor-scorch', 2, 1, 1]] },
  'bathroom-2': { wave: 0, clutter: [[3, 6], [4, 7], [5, 6], [7, 6]], towers: [['professor-scorch', 3, 6], ['sir-toastsalot', 4, 7], ['sir-toastsalot', 5, 6], ['professor-scorch', 7, 6]] },
  'bathroom-3': { wave: 0, clutter: [[2, 5], [13, 5], [2, 1, 2]], towers: [['professor-scorch', 2, 5], ['professor-scorch', 13, 5], ['professor-scorch', 2, 1, 2]] },
  'bathroom-4': { wave: 0, clutter: [[3, 7], [12, 7], [3, 1, 2]], towers: [['professor-scorch', 3, 7], ['professor-scorch', 12, 7], ['professor-scorch', 3, 1, 2]] },

  // 310 of 350 crumbs — all three must actually place at wave 0 (the old bandolero opener
  // cost 370 and left sgt-spritz permanently pending behind the greedy upgrader, leaking
  // stealthed bedbugs). Bandolero moves to the wave-4 PAR step instead.
  'bedroom-1': { wave: 0, clutter: [[4, 1, 1], [3, 0, 1], [5, 1, 1]], towers: [['lux-interior', 4, 1, 1], ['sir-toastsalot', 3, 0, 1], ['sgt-spritz', 5, 1, 1]] },
  'bedroom-2': { wave: 0, clutter: [[3, 1, 2], [0, 0, 2], [4, 0, 2]], towers: [['lux-interior', 3, 1, 2], ['bandolero', 0, 0, 2], ['sgt-spritz', 4, 0, 2]] },
  'bedroom-3': { wave: 0, clutter: [[2, 1, 2], [0, 0, 2], [3, 0, 2]], towers: [['lux-interior', 2, 1, 2], ['bandolero', 0, 0, 2], ['sgt-spritz', 3, 0, 2]] },
  'bedroom-4': { wave: 0, clutter: [[1, 1, 2], [0, 0, 2], [1, 2, 2]], towers: [['lux-interior', 1, 1, 2], ['bandolero', 0, 0, 2], ['sgt-spritz', 1, 2, 2]] },

  'garage-1': { wave: 0, clutter: [[5, 1, 1]], towers: [['mike-rowave', 5, 1, 1]] },
  'garage-2': { wave: 0, clutter: [[6, 1, 1], [3, 1, 1]], towers: [['mike-rowave', 6, 1, 1], ['old-smacky', 3, 1, 1]] },
  'garage-3': { wave: 0, clutter: [[1, 0, 2], [1, 1, 2]], towers: [['mike-rowave', 1, 0, 2], ['sgt-spritz', 1, 1, 2]] },
  'garage-4': { wave: 0, clutter: [[3, 1, 3], [5, 1, 3]], towers: [['mike-rowave', 3, 1, 3], ['dj-decibel', 5, 1, 3]] },
  'garage-5': { wave: 0, clutter: [[2, 1, 2], [4, 1, 2]], towers: [['mike-rowave', 2, 1, 2], ['saltimus-prime', 4, 1, 2]] },
};

const strategyFor = (id: string): Step[] => {
  const rest = (PAR[id] ?? []).filter((s) => s.wave >= 3);
  return OPENING[id] ? [OPENING[id], ...rest] : rest;
};

describe('Balance: par player beats worlds 2-5 on houseguest', () => {
  for (const level of ALL_W2345) {
    it(`${level.id}: wins >=2/3 seeds with <=6 avg bites`, () => {
      const strategy = strategyFor(level.id);
      expect(strategy, `${level.id} has PAR`).toBeTruthy();
      const results = BALANCE_SEEDS.map((s) => autoPlay(level, strategy, 'houseguest', s, { log: process.env.BALANCE_LOG === '1' }));
      const wins = results.filter((r) => r.won).length;
      const avgBites = results.reduce((a, r) => a + r.bites, 0) / results.length;
      const detail = results.map((r) => `${r.won ? 'W' : 'L'}(${r.bites}b,w${r.wavesSurvived})`).join(' ');
      console.log(`  ${level.id}: ${detail} avgBites=${avgBites.toFixed(1)}`);
      expect(wins, `${level.id} wins: ${detail}`).toBeGreaterThanOrEqual(2);
      expect(avgBites, `${level.id} avg bites`).toBeLessThanOrEqual(6);
    });
  }
});

if (process.env.BALANCE_REPORT === '1') {
  const LAZY: Step[] = [
    { wave: 0, clutter: [[4, 4]], towers: [['sgt-spritz', 4, 4]] },
    { wave: 1, clutter: [[6, 5]], towers: [['old-smacky', 6, 5]] },
  ];
  const resultLine = (results: ReturnType<typeof autoPlay>[]) =>
    results.map((r) => `${r.won ? 'W' : 'L'}(${r.bites}b,w${r.wavesSurvived})`).join(' ');

  describe('Balance report: worlds 2-5', () => {
    it('prints hp mass, critter counts, par, and lazy outcomes', () => {
      console.log('level\thpMass\tcritters\tpar\tlazy');
      for (const level of ALL_W2345) {
        const entries = level.waves.flatMap((w) => w.entries);
        const hpMass = entries.reduce((sum, entry) => sum + (CRITTER_DEFS[entry.critter]?.hp ?? 0) * entry.count, 0);
        const critters = entries.reduce((sum, entry) => sum + entry.count, 0);
        const par = BALANCE_SEEDS.map((seed) => autoPlay(level, strategyFor(level.id), 'houseguest', seed));
        const lazy = BALANCE_SEEDS.map((seed) => autoPlay(level, LAZY, 'houseguest', seed, { upgrades: false, spells: false }));
        console.log(`${level.id}\t${hpMass}\t${critters}\t${resultLine(par)}\t${resultLine(lazy)}`);
      }
    });
  });
}
