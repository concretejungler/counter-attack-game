import type { LevelDef, WaveEntry } from '../../sim/types';

const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

const scaleWaves = (waves: LevelDef['waves'], factor: number, finalBoost: WaveEntry[] = []): LevelDef['waves'] =>
  waves.map((wave, index) => ({
    entries: [
      ...wave.entries
        .filter((_entry, entryIndex) => index === waves.length - 1 || entryIndex === 0)
        .map((entry) => ({
      ...entry,
      critter: entry.critter === 'tick' || entry.critter === 'earwig' || entry.critter === 'centipede' ? 'pillbug' : entry.critter === 'roach-nuclear' ? 'roach' : entry.critter,
      count: entry.count === 1 ? 1 : Math.max(1, Math.ceil(entry.count * factor)),
      })),
      ...(index === waves.length - 1 ? finalBoost : []),
    ],
  }));

const BASEMENT_SCALE: Record<string, number> = {
  'basement-1': 0.12,
  'basement-2': 0.12,
  'basement-3': 0.12,
  'basement-4': 0.12,
  'basement-5': 0.12,
};

const BASEMENT_FINAL_BOOST: Record<string, WaveEntry[]> = {
  'basement-1': [e('termite', 57, 0.65, 'crack', 18), e('roach-nuclear', 2, 4.4, 'vent', 28)],
  'basement-2': [e('termite', 55, 0.65, 'crack', 18), e('roach-nuclear', 2, 4.2, 'vent', 28)],
  'basement-3': [e('termite', 61, 0.65, 'crack', 18)],
  'basement-4': [e('termite', 55, 0.65, 'crack', 18), e('roach-nuclear', 2, 4.0, 'vent', 28)],
  'basement-5': [e('termite', 37, 0.7, 'crack', 18), e('roach-nuclear', 2, 4.0, 'vent', 28)],
};

const W6_TOWERS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather', 'bandolero',
  'vroomba', 'lux-interior', 'bubbles-laroux', 'saltimus-prime', 'snappy-and-sons', 'dj-decibel',
  'mike-rowave', 'static', 'old-stinky', 'eau-de-no',
];

const BASEMENT_DECK = ['cereal-i', 'books-l', 'tupper-o', 'toolbox-o', 'wine-l', 'spatula-t'];

const basementShell = (
  id: string,
  index: number,
  name: string,
  blurb: string,
  startCrumbs: number,
  waves: LevelDef['waves'],
  challenge: LevelDef['challenge'],
  extra?: Partial<LevelDef>,
): LevelDef => ({
  id,
  name,
  world: 6,
  index,
  blurb,
  theme: 'basement',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 10 },
    { id: 'workbench', kind: 'table', origin: { x: 4, y: 2.6, z: 2 }, cols: 7, rows: 4 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 7 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 11, r: 7 }, to: { s: 1, c: 6, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 7, r: 1 }, to: { s: 1, c: 3, r: 0 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'stairs', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'crack', tile: { s: 0, c: 14, r: 0 }, kind: 'crack' },
    { id: 'vent', tile: { s: 0, c: 7, r: 9 }, kind: 'vent' },
  ],
  cakeTile: { s: 1, c: 3, r: 1 },
  cakeSlices: 10,
  startCrumbs: index === 5 ? 470 : 410,
  clutterDeck: BASEMENT_DECK,
  clutterPerWave: 4,
  allowedTowers: W6_TOWERS,
  waves: scaleWaves(waves, BASEMENT_SCALE[id], BASEMENT_FINAL_BOOST[id]),
  mutationWaves: waves.length >= 7 ? [3, Math.max(5, waves.length - 3)] : undefined,
  challenge,
  ...extra,
});

export const BASEMENT_1: LevelDef = basementShell(
  'basement-1',
  1,
  'Fuse Box Blues',
  'Everything hums until the roaches start glowing back.',
  300,
  [
    { entries: [e('pillbug', 2, 1.4, 'stairs'), e('termite', 1, 2.5, 'crack', 4)] },
    { entries: [e('earwig', 5, 1.8, 'vent'), e('termite', 3, 2.6, 'crack', 5)] },
    { entries: [e('pillbug', 7, 1.5, 'stairs'), e('tick', 10, 0.8, 'vent', 4)] },
    { entries: [e('centipede', 2, 5.0, 'crack'), e('earwig', 6, 1.5, 'stairs', 3)] },
    { entries: [e('termite', 5, 1.8, 'vent'), e('roach-nuclear', 2, 5.5, 'crack', 6)] },
    { entries: [e('centipede', 3, 4.5, 'stairs'), e('pillbug', 8, 1.2, 'vent', 3), e('tick', 10, 0.7, 'crack', 7)] },
    { entries: [e('roach-nuclear', 3, 4.5, 'crack'), e('centipede', 3, 4.8, 'stairs', 4), e('earwig', 8, 1.2, 'vent', 8)] },
  ],
  { text: 'Win without any tower being disabled by ticks', id: 'no-latch' },
  {
    tutorial: [
      { wave: 0, text: 'ticks hug towers until the tower gives up. heat or a quick smack fixes clingy dots.' },
      { wave: 4, text: 'NUCLEAR ROACHES play dead and glow. gas is the answer, which feels backwards but ok.' },
    ],
  },
);

export const BASEMENT_2: LevelDef = basementShell(
  'basement-2',
  2,
  'Box Fort',
  'The fort is cardboard. The termites read that as a menu.',
  320,
  [
    { entries: [e('termite', 1, 2.0, 'crack'), e('pillbug', 2, 1.2, 'stairs', 2)] },
    { entries: [e('pillbug', 8, 1.25, 'vent'), e('earwig', 4, 2.0, 'crack', 5)] },
    { entries: [e('termite', 7, 1.5, 'stairs'), e('roach', 4, 2.5, 'vent', 4)] },
    { entries: [e('centipede', 3, 4.4, 'crack'), e('tick', 14, 0.65, 'vent', 5)] },
    { entries: [e('roach-nuclear', 2, 5.0, 'stairs'), e('pillbug', 10, 1.1, 'crack', 2)] },
    { entries: [e('termite', 8, 1.25, 'vent'), e('centipede', 3, 4.0, 'stairs', 4), e('earwig', 6, 1.4, 'crack', 8)] },
    { entries: [e('roach-nuclear', 3, 4.4, 'vent'), e('centipede', 4, 4.2, 'stairs', 3), e('termite', 8, 1.1, 'crack', 7)] },
    { entries: [e('centipede', 5, 3.8, 'crack'), e('roach-nuclear', 3, 4.0, 'vent', 4), e('tick', 18, 0.55, 'stairs', 8)] },
  ],
  { text: 'Have at least five clutter pieces survive', id: 'box-fort-standing' },
);

export const BASEMENT_3: LevelDef = basementShell(
  'basement-3',
  3,
  'Web Site',
  'It is not online. It is just sticky and everywhere.',
  335,
  [
    { entries: [e('earwig', 1, 1.5, 'crack'), e('pillbug', 2, 1.1, 'vent', 3)] },
    { entries: [e('pillbug', 9, 1.1, 'stairs'), e('termite', 4, 1.8, 'crack', 4)] },
    { entries: [e('centipede', 3, 4.2, 'vent'), e('tick', 14, 0.6, 'stairs', 5)] },
    { entries: [e('roach-nuclear', 2, 4.8, 'crack'), e('earwig', 8, 1.2, 'vent', 4)] },
    { entries: [e('termite', 8, 1.1, 'stairs'), e('pillbug', 10, 1.0, 'crack', 3), e('tick', 10, 0.7, 'vent', 8)] },
    { entries: [e('centipede', 5, 3.8, 'crack'), e('roach', 5, 2.0, 'stairs', 5)] },
    { entries: [e('roach-nuclear', 4, 3.8, 'vent'), e('earwig', 10, 1.0, 'crack', 4), e('termite', 8, 1.0, 'stairs', 7)] },
    { entries: [e('centipede', 5, 3.5, 'stairs'), e('roach-nuclear', 4, 3.6, 'crack', 5), e('pillbug', 12, 0.9, 'vent', 8)] },
  ],
  { text: 'Win with no more than three clutter losses', id: 'web-preserved' },
  {
    surfaces: [
      { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 14, rows: 10 },
      { id: 'workbench', kind: 'table', origin: { x: 4, y: 2.6, z: 2 }, cols: 7, rows: 4, blocked: [[1, 1], [5, 2]] },
      { id: 'web-shelf', kind: 'shelf', origin: { x: 5, y: 4.7, z: 1 }, cols: 5, rows: 3 },
    ],
    climbs: [
      { from: { s: 0, c: 2, r: 8 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
      { from: { s: 0, c: 11, r: 7 }, to: { s: 1, c: 6, r: 3 }, kind: 'climb' },
      { from: { s: 1, c: 3, r: 0 }, to: { s: 2, c: 2, r: 2 }, kind: 'climb' },
      { from: { s: 0, c: 7, r: 1 }, to: { s: 2, c: 2, r: 0 }, kind: 'climb' },
    ],
    cakeTile: { s: 2, c: 2, r: 1 },
  },
);

export const BASEMENT_4: LevelDef = basementShell(
  'basement-4',
  4,
  'Wine Cellar',
  'The bottles are dusty, dramatic, and absolutely in the way.',
  350,
  [
    { entries: [e('pillbug', 2, 1.0, 'stairs'), e('termite', 1, 1.5, 'crack', 4)] },
    { entries: [e('centipede', 3, 4.0, 'vent'), e('tick', 14, 0.6, 'stairs', 3)] },
    { entries: [e('roach-nuclear', 3, 4.0, 'crack'), e('earwig', 8, 1.1, 'vent', 4)] },
    { entries: [e('termite', 9, 1.0, 'stairs'), e('centipede', 4, 3.8, 'crack', 5)] },
    { entries: [e('pillbug', 14, 0.85, 'vent'), e('roach-nuclear', 4, 3.7, 'stairs', 6)] },
    { entries: [e('centipede', 5, 3.4, 'crack'), e('tick', 18, 0.5, 'vent', 4), e('termite', 8, 0.95, 'stairs', 8)] },
    { entries: [e('roach-nuclear', 5, 3.4, 'stairs'), e('earwig', 12, 0.9, 'crack', 4)] },
    { entries: [e('centipede', 6, 3.1, 'vent'), e('roach-nuclear', 5, 3.2, 'crack', 5), e('pillbug', 14, 0.8, 'stairs', 8)] },
    { entries: [e('centipede', 7, 3.0, 'stairs'), e('roach-nuclear', 6, 3.0, 'vent', 5), e('termite', 10, 0.8, 'crack', 8)] },
  ],
  { text: 'Defeat every centipede before it splits twice', id: 'no-wiggle-bits' },
  {
    surfaces: [
      { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 10 },
      { id: 'cellar-table', kind: 'table', origin: { x: 4, y: 2.5, z: 2 }, cols: 8, rows: 4 },
      { id: 'bottle-shelf', kind: 'shelf', origin: { x: 3, y: 4.4, z: 0 }, cols: 10, rows: 2 },
    ],
    climbs: [
      { from: { s: 0, c: 3, r: 7 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
      { from: { s: 0, c: 12, r: 7 }, to: { s: 1, c: 7, r: 3 }, kind: 'climb' },
      { from: { s: 1, c: 1, r: 0 }, to: { s: 2, c: 1, r: 1 }, kind: 'climb' },
      { from: { s: 1, c: 6, r: 0 }, to: { s: 2, c: 7, r: 1 }, kind: 'climb' },
    ],
    cakeTile: { s: 2, c: 5, r: 0 },
  },
);

export const BASEMENT_5: LevelDef = basementShell(
  'basement-5',
  5,
  'Grandma Longlegs',
  'She brought cookies. The cookies are ticks.',
  370,
  [
    { entries: [e('pillbug', 2, 1.0, 'stairs'), e('termite', 1, 1.0, 'crack', 3)] },
    { entries: [e('termite', 7, 1.1, 'vent'), e('earwig', 8, 1.0, 'stairs', 4)] },
    { entries: [e('centipede', 4, 3.6, 'crack'), e('tick', 18, 0.45, 'vent', 5)] },
    { entries: [e('roach-nuclear', 4, 3.5, 'stairs'), e('termite', 9, 0.9, 'crack', 4)] },
    { entries: [e('centipede', 6, 3.2, 'vent'), e('pillbug', 14, 0.8, 'stairs', 5)] },
    { entries: [e('roach-nuclear', 5, 3.0, 'crack'), e('earwig', 14, 0.85, 'vent', 4), e('tick', 16, 0.45, 'stairs', 8)] },
    { entries: [e('centipede', 7, 3.0, 'stairs'), e('termite', 10, 0.8, 'vent', 5)] },
    { entries: [e('roach-nuclear', 6, 2.8, 'vent'), e('centipede', 6, 3.0, 'crack', 4), e('pillbug', 16, 0.7, 'stairs', 8)] },
    { entries: [e('roach-nuclear', 4, 3.0, 'crack'), e('tick', 16, 0.6, 'crack', 6), e('centipede', 5, 4.0, 'stairs', 10), e('termite', 10, 0.8, 'vent', 14)] },
    { entries: [e('grandma-longlegs', 1, 1, 'vent'), e('tick', 22, 0.45, 'vent', 5), e('termite', 10, 0.8, 'stairs', 8), e('centipede', 6, 3.2, 'crack', 12)] },
  ],
  { text: 'Beat Grandma Longlegs with no more than two bites taken', id: 'no-grandma-snacks' },
);

export const BASEMENT_LEVELS: LevelDef[] = [BASEMENT_1, BASEMENT_2, BASEMENT_3, BASEMENT_4, BASEMENT_5];
