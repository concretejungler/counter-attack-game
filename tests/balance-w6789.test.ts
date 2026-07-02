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

// World 6 is a TYPE puzzle: pillbug + roach-nuclear are weak to GAS (pillbug resists swat),
// centipedes are weak to COLD, earwigs to SONIC, ticks + termites to HEAT. Cores are gas
// (saltimus-prime/old-stinky) + heat (sir-toastsalot) + cold (the-coldfather) on the cake
// surface, with mike-rowave/bandolero finishing beef.
//
// TICKS (latchers) steer toward the nearest LATCHABLE tower (same surface, or |dy| < 1.5)
// from unlimited range; if nothing is latchable they march the cake path and latch whatever
// they reach. Two hard rules fall out of that:
//  1. A latchable tower must exist from the moment the first tick spawns (floor spawns, y=0
//     — elevated cake-surface towers do NOT qualify), or the sim's latcher/walk fallback hits
//     unhappy paths; and any latched tick is immortal until something kills it, so it must
//     always die fast or the wave never ends.
//  2. Exploit the steering instead of fighting it: a cheap floorMount stick-rick on the open
//     floor is a permanent tick MAGNET — every floor tick beelines to it and latches, never
//     climbing to the cake — and an adjacent sir-toastsalot (heat = 2x vs 45hp ticks) melts
//     the latched pile. Magnet BEFORE the level's first tick wave, killer right behind it.
// TICK DOCTRINE (post sim-change). Latcher ticks steer toward the nearest LATCHABLE tower
// (same surface, or |dy| < 1.5) from unlimited range, and a latched tick is immortal and
// motionless until something kills it. Cake-surface towers (y >= 2.6) are unlatchable from
// the floor, so every tick level gets a cheap floorMount stick-rick MAGNET: all floor ticks
// beeline to it, latch, and never climb. The pile then dies to garrison guns (towers target
// by raw 2D XZ distance — height is ignored), plus lemon-smite (power 45 = tick hp) whenever
// >= 5 remain. Two placement rules learned the hard way:
//  - the magnet goes at wave 1's build phase, NOT wave 0: keeping wave 0's placement sequence
//    identical to the tuned opener preserves its seeded RNG rolls (and its full 410 budget),
//    and build 1 still runs before the earliest tick spawn;
//  - never put another latchable (floor) tower nearer the tick approach than the magnet, and
//    never let clutter anchors wall in the cake's neighbor ring.
// basement-1 (workbench, cake s1(3,1)): gas double-up by wave 1 for the pillbug rushes;
// magnet (9,1) sits by the bench's NE corner under the garrison guns. 7 waves.
const basementPar = (topSurface = 1): Step[] => [
  {
    wave: 0,
    clutter: [[1, 0, topSurface], [4, 0, topSurface]],
    towers: [
      ['saltimus-prime', 1, 0, topSurface],
      ['sir-toastsalot', 4, 0, topSurface],
    ],
  },
  { wave: 1, clutter: [[1, 2, topSurface]], towers: [['stick-rick', 9, 1], ['saltimus-prime', 1, 2, topSurface]] },
  { wave: 2, clutter: [[4, 2, topSurface]], towers: [['old-stinky', 4, 2, topSurface]] },
  { wave: 3, towers: [['the-coldfather', 2, 0, topSurface]] },
  { wave: 4, clutter: [[6, 8], [8, 8]], towers: [['sir-toastsalot', 6, 8], ['static', 8, 8]] },
  { wave: 5, towers: [['old-stinky', 2, 2, topSurface]] },
  { wave: 6, towers: [['mike-rowave', 4, 0, topSurface]] },
];

// basement-3 (Web Site): cake on the web-shelf (s2, 5x3). East-edge sir doubles as pile
// killer; magnet in the SE floor channel out of the rest of the garrison's range.
const basement3Par: Step[] = [
  {
    wave: 0,
    clutter: [[1, 1, 2], [3, 1, 2]],
    towers: [['saltimus-prime', 1, 1, 2], ['sir-toastsalot', 4, 1, 2], ['stick-rick', 12, 4]],
  },
  { wave: 1, clutter: [[1, 0, 2]], towers: [['old-stinky', 1, 0, 2]] },
  { wave: 2, clutter: [[3, 0, 2]], towers: [['saltimus-prime', 3, 0, 2]] },
  { wave: 3, towers: [['the-coldfather', 2, 1, 2]] },
  { wave: 4, clutter: [[4, 2, 2]], towers: [['sir-toastsalot', 4, 2, 2]] },
  { wave: 5, clutter: [[2, 7]], towers: [['static', 2, 7]] },
  { wave: 6, towers: [['mike-rowave', 3, 1, 2]] },
  { wave: 7, towers: [['old-stinky', 2, 2, 2]] },
];

// basement-5 (Grandma Longlegs): the boss SPAWNS 2 ticks/6s wherever she stands and webs
// towers. Bench east-edge sir owns the magnet pile; overlapping bench heat kills ticks she
// spawns after climbing up top.
const basement5Par: Step[] = [
  {
    wave: 0,
    clutter: [[2, 1, 1], [5, 1, 1]],
    towers: [['saltimus-prime', 2, 1, 1], ['sir-toastsalot', 6, 1, 1], ['stick-rick', 13, 4]],
  },
  { wave: 1, clutter: [[2, 3, 1]], towers: [['old-stinky', 2, 3, 1]] },
  { wave: 2, clutter: [[4, 0, 1]], towers: [['sir-toastsalot', 4, 0, 1]] },
  { wave: 3, towers: [['the-coldfather', 3, 1, 1]] },
  { wave: 4, clutter: [[5, 3, 1]], towers: [['sir-toastsalot', 5, 3, 1]] },
  { wave: 5, towers: [['saltimus-prime', 3, 2, 1]] },
  { wave: 6, towers: [['mike-rowave', 4, 1, 1]] },
  { wave: 7, clutter: [[2, 7]], towers: [['static', 2, 7]] },
  { wave: 8, towers: [['bandolero', 2, 1, 1]] },
  { wave: 9, towers: [['old-stinky', 3, 3, 1]] },
];

// basement-2 (Box Fort): 6-pillbug rush in wave 1 needs the double-gas opening intact at
// wave 0 (identical to the tuned pre-change opener); magnet joins at build 1, first ticks
// arrive wave 3 with bench heat (w3) covering the pile.
const basement2Par: Step[] = [
  {
    wave: 0,
    clutter: [[1, 0, 1], [4, 0, 1]],
    towers: [['saltimus-prime', 1, 0, 1], ['old-stinky', 4, 0, 1]],
  },
  { wave: 1, clutter: [[1, 2, 1]], towers: [['stick-rick', 9, 1], ['saltimus-prime', 1, 2, 1]] },
  { wave: 2, clutter: [[4, 2, 1]], towers: [['the-coldfather', 4, 2, 1]] },
  { wave: 3, towers: [['sir-toastsalot', 2, 0, 1]] },
  { wave: 4, clutter: [[12, 1], [13, 3]], towers: [['sir-toastsalot', 12, 1], ['static', 13, 3]] },
  { wave: 5, towers: [['old-stinky', 2, 2, 1]] },
  { wave: 6, towers: [['mike-rowave', 4, 0, 1]] },
  { wave: 7, clutter: [[1, 7], [2, 8]], towers: [['sir-toastsalot', 1, 7], ['static', 2, 8]] },
];

// basement-4: wine cellar, cake on the 10x2 bottle-shelf. Wave 0 is byte-identical to the
// tuned pre-change opener (its seeded rolls win the opening fight); the magnet lands at
// build 1, just before the wave-1 tick rush, under the shelf garrison's guns.
const basement4Par: Step[] = [
  {
    wave: 0,
    clutter: [[4, 0, 2], [6, 0, 2]],
    towers: [
      ['saltimus-prime', 4, 0, 2],
      ['sir-toastsalot', 6, 0, 2],
    ],
  },
  { wave: 1, clutter: [[2, 0, 2]], towers: [['stick-rick', 9, 1], ['sir-toastsalot', 2, 0, 2]] },
  { wave: 2, clutter: [[8, 0, 2]], towers: [['old-stinky', 8, 0, 2]] },
  { wave: 3, clutter: [[0, 1, 2]], towers: [['saltimus-prime', 0, 1, 2]] },
  { wave: 4, clutter: [[13, 1], [14, 3]], towers: [['sir-toastsalot', 13, 1], ['static', 14, 3]] },
  { wave: 5, clutter: [[8, 1, 2]], towers: [['the-coldfather', 8, 1, 2]] },
  { wave: 6, clutter: [[5, 1, 2]], towers: [['mike-rowave', 5, 1, 2]] },
  { wave: 7, clutter: [[1, 7], [2, 8]], towers: [['sir-toastsalot', 1, 7], ['static', 2, 8]] },
  { wave: 8, clutter: [[3, 1, 2]], towers: [['bandolero', 3, 1, 2]] },
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

const backyardHivePar: Step[] = [
  {
    wave: 0,
    clutter: [[0, 0, 1], [5, 0, 1], [2, 3, 1]],
    towers: [['static', 0, 0, 1], ['professor-scorch', 5, 0, 1], ['the-daily-smack', 2, 3, 1]],
  },
  { wave: 1, clutter: [[3, 1, 1]], towers: [['static', 3, 1, 1]] },
  { wave: 2, clutter: [[1, 2, 1]], towers: [['professor-scorch', 1, 2, 1]] },
  { wave: 3, clutter: [[1, 3, 1]], towers: [['the-daily-smack', 1, 3, 1]] },
  { wave: 4, clutter: [[4, 3, 1]], towers: [['static', 4, 3, 1]] },
  { wave: 5, clutter: [[0, 1, 1]], towers: [['professor-scorch', 0, 1, 1]] },
  { wave: 6, clutter: [[6, 1, 1]], towers: [['the-daily-smack', 6, 1, 1]] },
  { wave: 7, clutter: [[6, 3, 1]], towers: [['static', 6, 3, 1]] },
  { wave: 8, clutter: [[3, 2, 1]], towers: [['professor-scorch', 3, 2, 1]] },
];

const backyardBossPar: Step[] = [
  {
    wave: 0,
    clutter: [[0, 0, 1], [5, 0, 1], [2, 3, 1]],
    towers: [['static', 0, 0, 1], ['professor-scorch', 5, 0, 1], ['alexis', 2, 3, 1]],
  },
  ...backyardHivePar.filter((step) => step.wave !== 0),
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
  'basement-2': basement2Par,
  'basement-3': basement3Par,
  'basement-4': basement4Par,
  'basement-5': basement5Par,
  'attic-1': atticPar,
  'attic-2': atticPar,
  'attic-3': atticPar,
  'attic-4': atticPar,
  'backyard-1': backyardOpenPar,
  'backyard-2': backyardHivePar,
  'backyard-3': backyardHivePar,
  'backyard-4': backyardHivePar,
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
