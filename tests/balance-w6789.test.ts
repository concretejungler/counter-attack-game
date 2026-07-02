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

// Honest world-6 waves are 3-8x the old gutted content, and world 6 is a TYPE puzzle:
// pillbug + roach-nuclear are weak to GAS (and pillbug resists swat), centipedes are weak
// to COLD, earwigs to SONIC, ticks + termites to HEAT. The par therefore matches damage
// types instead of raw DPS — gas (saltimus-prime cone, old-stinky aura) shreds the armored
// pillbugs/roaches that were eating the cake, heat (sir-toastsalot) burns ticks/termites,
// cold (the-coldfather) slows and doubles on centipedes, and mike-rowave/bandolero finish
// beef. Cheap gas/heat AoE is front-loaded on the cake surface within the 410-crumb budget.
// b1/b2/b5 share this workbench layout (7x4 cake surface, climb mouths at floor rows 7 + (7,1)).
// A tick latcher that latches a tower with no killer nearby permanently disables it and
// never dies or advances (a sim quirk), stalling the wave; grandma-longlegs also SPAWNS
// ticks. The par defuses this two ways: (1) two overlapping sir-toastsalot (heat, tick-weak)
// on the cake surface instantly finish any tick that climbs up to latch, and (2) floor
// towers are placed only in KILLING PAIRS near the spawns so a latched tick is finished by
// its partner and low-hp stragglers pinned in the crack/stairs corners get mopped up.
// Latcher ticks steer toward the nearest tower and, if that tower is elevated/unreachable by
// a straight floor walk, pile up motionless at their spawn (a sim-AI quirk) — a stuck cluster
// stalls the wave. So besides the cake-surface type-matched core (gas for pillbugs/roaches,
// heat for ticks/termites, cold for centipedes), each par plants heat/chain floor PAIRS on the
// spawn corners the ticks get stuck at (vent 7,9 and crack 14,0) so they reliably latch, get
// finished by the partner, and the wave can complete.
// basement-1 (workbench): type-matched core on the cake surface (gas for pillbugs, heat for
// ticks, cold for centipedes) plus a heat/chain floor pair by the stairs climb (3,7) — the
// route the tick waves take — so latchers are finished before they can stall. b1 has only 7
// waves, so the plan front-loads value; later steps are harmless no-ops if never reached.
const basementPar = (topSurface = 1): Step[] => [
  {
    wave: 0,
    clutter: [[1, 0, topSurface], [4, 0, topSurface]],
    towers: [
      ['saltimus-prime', 1, 0, topSurface],
      ['sir-toastsalot', 4, 0, topSurface],
    ],
  },
  { wave: 1, clutter: [[1, 2, topSurface]], towers: [['old-stinky', 1, 2, topSurface]] },
  { wave: 2, clutter: [[4, 2, topSurface]], towers: [['saltimus-prime', 4, 2, topSurface]] },
  { wave: 3, clutter: [[2, 6], [4, 7]], towers: [['sir-toastsalot', 2, 6], ['static', 4, 7]] },
  { wave: 4, towers: [['the-coldfather', 2, 0, topSurface]] },
  { wave: 5, towers: [['old-stinky', 2, 2, topSurface]] },
  { wave: 6, towers: [['mike-rowave', 4, 0, topSurface]] },
  { wave: 7, clutter: [[12, 1], [13, 3]], towers: [['sir-toastsalot', 12, 1], ['static', 13, 3]] },
  { wave: 8, towers: [['bandolero', 1, 0, topSurface]] },
  { wave: 9, towers: [['saltimus-prime', 2, 2, topSurface]] },
];

// basement-3 (Web Site): cake on the web-shelf (surface 2, 5x3). The 14-col floor's crack
// corner is the tick trap here, so the floor pair sits by the crack; core stays type-matched.
const basement3Par: Step[] = [
  {
    wave: 0,
    clutter: [[1, 0, 2], [4, 0, 2]],
    towers: [['saltimus-prime', 1, 0, 2], ['sir-toastsalot', 4, 0, 2]],
  },
  { wave: 1, clutter: [[1, 2, 2]], towers: [['old-stinky', 1, 2, 2]] },
  { wave: 2, clutter: [[4, 2, 2]], towers: [['saltimus-prime', 4, 2, 2]] },
  { wave: 3, towers: [['the-coldfather', 2, 0, 2]] },
  { wave: 4, clutter: [[11, 1], [12, 3]], towers: [['sir-toastsalot', 11, 1], ['static', 12, 3]] },
  { wave: 5, towers: [['old-stinky', 2, 2, 2]] },
  { wave: 6, towers: [['mike-rowave', 4, 0, 2]] },
  { wave: 7, clutter: [[6, 8], [8, 8]], towers: [['sir-toastsalot', 6, 8], ['static', 8, 8]] },
  { wave: 8, towers: [['bandolero', 1, 0, 2]] },
  { wave: 9, towers: [['saltimus-prime', 2, 2, 2]] },
];

// basement-5 (Grandma Longlegs) has the heaviest tick pressure — the boss SPAWNS ticks and
// webs towers — so it opens double-gas (pillbug/roach control) with two overlapping heat
// towers by wave 2 to vaporize latching ticks, cold at wave 3, and the paired floor mop to
// clear ticks pinned in the crack/stairs corners.
const basement5Par: Step[] = [
  {
    wave: 0,
    clutter: [[1, 0, 1], [4, 0, 1]],
    towers: [['saltimus-prime', 1, 0, 1], ['old-stinky', 4, 0, 1]],
  },
  { wave: 1, clutter: [[1, 2, 1]], towers: [['sir-toastsalot', 1, 2, 1]] },
  { wave: 2, clutter: [[4, 2, 1]], towers: [['sir-toastsalot', 4, 2, 1]] },
  { wave: 3, towers: [['the-coldfather', 2, 0, 1]] },
  { wave: 4, clutter: [[12, 1], [13, 3]], towers: [['sir-toastsalot', 12, 1], ['static', 13, 3]] },
  { wave: 5, towers: [['saltimus-prime', 2, 2, 1]] },
  { wave: 6, towers: [['mike-rowave', 4, 0, 1]] },
  { wave: 7, clutter: [[1, 7], [2, 8]], towers: [['sir-toastsalot', 1, 7], ['static', 2, 8]] },
  { wave: 8, towers: [['bandolero', 1, 0, 1]] },
  { wave: 9, towers: [['old-stinky', 2, 2, 1]] },
];

// basement-2 (Box Fort) front-loads a 6-pillbug rush in wave 1; it needs DOUBLE gas up
// immediately (pillbugs are gas-weak, swat-resistant) rather than the shared heat opener.
const basement2Par: Step[] = [
  {
    wave: 0,
    clutter: [[1, 0, 1], [4, 0, 1]],
    towers: [['saltimus-prime', 1, 0, 1], ['old-stinky', 4, 0, 1]],
  },
  { wave: 1, clutter: [[1, 2, 1]], towers: [['saltimus-prime', 1, 2, 1]] },
  { wave: 2, clutter: [[4, 2, 1]], towers: [['the-coldfather', 4, 2, 1]] },
  { wave: 3, towers: [['sir-toastsalot', 2, 0, 1]] },
  { wave: 4, clutter: [[12, 1], [13, 3]], towers: [['sir-toastsalot', 12, 1], ['static', 13, 3]] },
  { wave: 5, towers: [['old-stinky', 2, 2, 1]] },
  { wave: 6, towers: [['mike-rowave', 4, 0, 1]] },
  { wave: 7, clutter: [[1, 7], [2, 8]], towers: [['sir-toastsalot', 1, 7], ['static', 2, 8]] },
  { wave: 8, towers: [['bandolero', 1, 0, 1]] },
  { wave: 9, towers: [['saltimus-prime', 2, 2, 1]] },
];

// basement-4: wine cellar. Cake sits on a 10x2 bottle-shelf (surface 2, rows 0-1 only) at
// col 5; climbs land at s2 (1,1) and (7,1). Same type-matched comp spread across the shelf
// width around the cake, with overlapping heat for the wave-1 tick rush, gas for the pillbug
// waves, cold for the centipede split-storms, and a paired floor mop by the crack corner.
const basement4Par: Step[] = [
  {
    wave: 0,
    clutter: [[4, 0, 2], [6, 0, 2]],
    towers: [
      ['saltimus-prime', 4, 0, 2],
      ['sir-toastsalot', 6, 0, 2],
    ],
  },
  { wave: 1, clutter: [[2, 0, 2]], towers: [['sir-toastsalot', 2, 0, 2]] },
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
