import type { LevelDef, WaveEntry } from '../../sim/types';

const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

const scaleWaves = (waves: LevelDef['waves'], factor: number, finalBoost: WaveEntry[] = []): LevelDef['waves'] =>
  waves.map((wave, index) => ({
    entries: [
      ...wave.entries.map((entry) => ({
      ...entry,
      count: entry.count === 1 ? 1 : Math.max(1, Math.ceil(entry.count * factor)),
      })),
      ...(index === waves.length - 1 ? finalBoost : []),
    ],
  }));

const ATTIC_SCALE: Record<string, number> = {
  'attic-1': 0.65,
  'attic-2': 0.62,
  'attic-3': 0.34,
  'attic-4': 0.28,
};

const ATTIC_FINAL_BOOST: Record<string, WaveEntry[]> = {
  'attic-1': [e('termite', 8, 0.8, 'eave', 16)],
  'attic-2': [],
  'attic-3': [e('termite', 15, 0.75, 'eave', 16)],
  'attic-4': [],
};

const W7_TOWERS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather', 'bandolero',
  'vroomba', 'lux-interior', 'bubbles-laroux', 'saltimus-prime', 'snappy-and-sons', 'dj-decibel',
  'mike-rowave', 'static', 'old-stinky', 'eau-de-no', 'herr-tick-tock', 'the-daily-smack',
];

const ATTIC_DECK = ['cereal-i', 'books-l', 'tupper-o', 'toolbox-o', 'wine-l', 'spatula-t'];

const atticShell = (
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
  world: 7,
  index,
  blurb,
  theme: 'attic',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 14, rows: 10 },
    { id: 'trunk', kind: 'table', origin: { x: 3, y: 2.7, z: 2 }, cols: 8, rows: 4 },
    { id: 'rafters', kind: 'shelf', origin: { x: 5, y: 5.2, z: 1 }, cols: 5, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 2, r: 8 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 11, r: 8 }, to: { s: 1, c: 7, r: 3 }, kind: 'climb' },
    { from: { s: 1, c: 2, r: 0 }, to: { s: 2, c: 1, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 6, r: 0 }, to: { s: 2, c: 4, r: 2 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'stairs', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'eave', tile: { s: 0, c: 13, r: 0 }, kind: 'crack' },
    { id: 'window', tile: { s: 2, c: 4, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 2, c: 2, r: 1 },
  cakeSlices: 10,
  startCrumbs: index === 4 ? 500 : 440,
  clutterDeck: ATTIC_DECK,
  clutterPerWave: 4,
  allowedTowers: W7_TOWERS,
  waves: scaleWaves(waves, ATTIC_SCALE[id], ATTIC_FINAL_BOOST[id]),
  mutationWaves: [3, Math.max(5, waves.length - 3)],
  challenge,
  ...extra,
});

export const ATTIC_1: LevelDef = atticShell(
  'attic-1',
  1,
  'Heirloom Hold',
  'Grandma said the trunk had memories. The possums found snacks.',
  340,
  [
    { entries: [e('silverfish', 10, 0.7, 'stairs'), e('moth', 6, 1.2, 'window', 3)] },
    { entries: [e('bedbug', 6, 1.4, 'eave'), e('possum-jr', 2, 4.5, 'stairs', 4)] },
    { entries: [e('roach-winged', 5, 1.8, 'stairs'), e('moth', 10, 0.9, 'window', 4)] },
    { entries: [e('possum-jr', 4, 3.8, 'eave'), e('silverfish', 14, 0.55, 'stairs', 5)] },
    { entries: [e('bedbug', 10, 1.0, 'stairs'), e('roach-winged', 6, 1.6, 'eave', 4)] },
    { entries: [e('moth', 18, 0.55, 'window'), e('possum-jr', 5, 3.2, 'stairs', 6)] },
    { entries: [e('roach-winged', 8, 1.3, 'eave'), e('bedbug', 12, 0.8, 'stairs', 4), e('silverfish', 16, 0.45, 'window', 8)] },
    { entries: [e('possum-jr', 7, 2.8, 'stairs'), e('roach-winged', 8, 1.2, 'eave', 5), e('moth', 16, 0.5, 'window', 8)] },
  ],
  { text: 'Keep every heirloom clutter piece standing', id: 'heirloom-safe' },
  {
    tutorial: [
      { wave: 1, text: 'possum juniors play dead TWICE. sonic makes them stop doing theater.' },
      { wave: 2, text: 'winged roaches walk until they get close, then fly because drama.' },
    ],
  },
);

export const ATTIC_2: LevelDef = atticShell(
  'attic-2',
  2,
  'Draft Dodgers',
  'The wind has lanes. The moths have boarding passes.',
  350,
  [
    { entries: [e('moth', 14, 0.6, 'window'), e('silverfish', 10, 0.6, 'stairs', 3)] },
    { entries: [e('roach-winged', 6, 1.5, 'eave'), e('moth', 16, 0.45, 'window', 4)] },
    { entries: [e('bedbug', 9, 1.0, 'stairs'), e('possum-jr', 3, 3.8, 'eave', 5)] },
    { entries: [e('moth', 22, 0.38, 'window'), e('silverfish', 18, 0.42, 'eave', 5)] },
    { entries: [e('roach-winged', 9, 1.15, 'stairs'), e('bedbug', 12, 0.8, 'eave', 4)] },
    { entries: [e('possum-jr', 6, 2.8, 'eave'), e('moth', 20, 0.4, 'window', 5)] },
    { entries: [e('roach-winged', 10, 1.0, 'stairs'), e('silverfish', 22, 0.35, 'eave', 4), e('moth', 18, 0.38, 'window', 8)] },
    { entries: [e('possum-jr', 8, 2.4, 'stairs'), e('roach-winged', 12, 0.9, 'eave', 4), e('moth', 24, 0.32, 'window', 8)] },
  ],
  { text: 'Win while placing at least four anti-air towers', id: 'anti-air-net' },
);

export const ATTIC_3: LevelDef = atticShell(
  'attic-3',
  3,
  'Memory Lane',
  'Every photo is cute. Every silverfish is eating the corner.',
  365,
  [
    { entries: [e('silverfish', 14, 0.55, 'stairs'), e('bedbug', 6, 1.2, 'eave', 4)] },
    { entries: [e('possum-jr', 4, 3.2, 'stairs'), e('moth', 14, 0.6, 'window', 3)] },
    { entries: [e('roach-winged', 8, 1.2, 'eave'), e('silverfish', 18, 0.4, 'stairs', 5)] },
    { entries: [e('bedbug', 14, 0.75, 'stairs'), e('possum-jr', 5, 2.8, 'eave', 4)] },
    { entries: [e('moth', 22, 0.38, 'window'), e('roach-winged', 10, 1.0, 'stairs', 6)] },
    { entries: [e('possum-jr', 7, 2.4, 'eave'), e('silverfish', 24, 0.32, 'stairs', 5)] },
    { entries: [e('bedbug', 18, 0.6, 'stairs'), e('roach-winged', 12, 0.85, 'eave', 4), e('moth', 20, 0.35, 'window', 8)] },
    { entries: [e('possum-jr', 8, 2.2, 'stairs'), e('roach-winged', 14, 0.8, 'eave', 4), e('silverfish', 24, 0.3, 'window', 8)] },
    { entries: [e('possum-jr', 10, 2.0, 'eave'), e('bedbug', 20, 0.5, 'stairs', 4), e('roach-winged', 14, 0.75, 'window', 8)] },
  ],
  { text: 'Win before any photo corner gets chewed', id: 'photos-intact' },
);

export const ATTIC_4: LevelDef = atticShell(
  'attic-4',
  4,
  'The Possum Phantom',
  'He keeps dying. He keeps being wrong about that.',
  380,
  [
    { entries: [e('possum-jr', 4, 3.0, 'stairs'), e('moth', 14, 0.5, 'window', 4)] },
    { entries: [e('silverfish', 20, 0.35, 'eave'), e('bedbug', 10, 0.8, 'stairs', 5)] },
    { entries: [e('roach-winged', 10, 0.95, 'stairs'), e('possum-jr', 5, 2.6, 'eave', 4)] },
    { entries: [e('moth', 26, 0.3, 'window'), e('bedbug', 14, 0.65, 'stairs', 5)] },
    { entries: [e('possum-jr', 8, 2.2, 'eave'), e('roach-winged', 12, 0.8, 'stairs', 5)] },
    { entries: [e('silverfish', 28, 0.28, 'eave'), e('moth', 24, 0.3, 'window', 5), e('bedbug', 14, 0.6, 'stairs', 8)] },
    { entries: [e('possum-jr', 10, 2.0, 'stairs'), e('roach-winged', 14, 0.7, 'eave', 4)] },
    { entries: [e('possum-jr', 8, 2.5, 'eave'), e('possum-jr', 8, 2.5, 'stairs', 8), e('moth', 24, 0.4, 'window', 12), e('silverfish', 20, 0.45, 'eave', 16)] },
    { entries: [e('roach-winged', 16, 0.7, 'stairs'), e('roach-winged', 16, 0.7, 'eave', 8), e('bedbug', 18, 0.55, 'stairs', 12)] },
    { entries: [e('possum-phantom', 1, 1, 'eave'), e('possum-jr', 12, 1.8, 'stairs', 6), e('moth', 30, 0.28, 'window', 10), e('roach-winged', 16, 0.65, 'eave', 14)] },
  ],
  { text: 'Beat the Phantom before the fourth fake-out', id: 'no-encore' },
);

export const ATTIC_LEVELS: LevelDef[] = [ATTIC_1, ATTIC_2, ATTIC_3, ATTIC_4];
