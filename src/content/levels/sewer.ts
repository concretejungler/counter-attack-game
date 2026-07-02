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
      critter: entry.critter === 'tick' ? 'earwig' : entry.critter === 'pigeon' ? 'hornet' : entry.critter,
      count: entry.count === 1 ? 1 : Math.max(1, Math.ceil(entry.count * factor)),
      })),
      ...(index === waves.length - 1 ? finalBoost : []),
    ],
  }));

const SEWER_SCALE: Record<string, number> = {
  'sewer-1': 0.12,
  'sewer-2': 0.12,
  'sewer-3': 0.12,
};

const SEWER_FINAL_BOOST: Record<string, WaveEntry[]> = {
  'sewer-1': [e('termite', 82, 0.65, 'grate', 16)],
  'sewer-2': [e('termite', 76, 0.65, 'grate', 16)],
  'sewer-3': [e('termite', 80, 0.6, 'grate', 16)],
};

const W9_TOWERS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather', 'bandolero',
  'vroomba', 'lux-interior', 'bubbles-laroux', 'saltimus-prime', 'snappy-and-sons', 'dj-decibel',
  'mike-rowave', 'static', 'old-stinky', 'eau-de-no', 'herr-tick-tock', 'the-daily-smack',
  'audrey-the-third', 'count-blendula', 'alexis', 'professor-scorch',
];

const SEWER_DECK = ['cereal-i', 'books-l', 'tupper-o', 'toolbox-o', 'wine-l', 'flowerpot-t'];

const sewerShell = (
  id: string,
  index: number,
  name: string,
  blurb: string,
  startCrumbs: number,
  waves: LevelDef['waves'],
  challenge: LevelDef['challenge'],
): LevelDef => ({
  id,
  name,
  world: 9,
  index,
  blurb,
  theme: 'sewer',
  surfaces: [
    { id: 'tunnel', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 10 },
    { id: 'pipewalk', kind: 'sink', origin: { x: 4, y: 2.4, z: 2 }, cols: 8, rows: 4 },
    { id: 'service-ledge', kind: 'shelf', origin: { x: 5, y: 4.8, z: 1 }, cols: 6, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 8 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 12, r: 8 }, to: { s: 1, c: 7, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 8, r: 1 }, to: { s: 1, c: 4, r: 0 }, kind: 'climb' },
    { from: { s: 1, c: 2, r: 0 }, to: { s: 2, c: 1, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 6, r: 0 }, to: { s: 2, c: 5, r: 2 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'drain', tile: { s: 0, c: 0, r: 9 }, kind: 'drain' },
    { id: 'pipe', tile: { s: 0, c: 15, r: 0 }, kind: 'vent' },
    { id: 'grate', tile: { s: 0, c: 15, r: 9 }, kind: 'crack' },
  ],
  cakeTile: { s: 2, c: 3, r: 1 },
  cakeSlices: 10,
  startCrumbs: index === 3 ? 560 : 500,
  clutterDeck: SEWER_DECK,
  clutterPerWave: 4,
  allowedTowers: W9_TOWERS,
  waves: scaleWaves(waves, SEWER_SCALE[id], SEWER_FINAL_BOOST[id]),
  mutationWaves: [4, Math.max(7, waves.length - 3)],
  challenge,
});

export const SEWER_1: LevelDef = sewerShell(
  'sewer-1',
  1,
  'Down the Drain',
  'Protect the bug bomb. Also protect the cake. Multitasking is gross.',
  375,
  [
    { entries: [e('roach-nuclear', 3, 3.5, 'drain'), e('centipede', 3, 3.6, 'pipe')] },
    { entries: [e('rat-knight', 2, 5.0, 'grate'), e('pigeon', 2, 5.0, 'pipe', 4)] },
    { entries: [e('earwig', 12, 0.8, 'drain'), e('pillbug', 12, 0.75, 'grate', 4)] },
    { entries: [e('roach-nuclear', 5, 3.0, 'pipe'), e('rat-knight', 3, 4.2, 'drain', 5)] },
    { entries: [e('pigeon', 3, 4.2, 'pipe'), e('centipede', 5, 3.0, 'grate', 4)] },
    { entries: [e('roach-winged', 14, 0.65, 'pipe'), e('hornet', 12, 0.7, 'grate', 4), e('snail-shaman', 7, 1.8, 'drain', 8)] },
    { entries: [e('roach-nuclear', 6, 2.8, 'drain'), e('rat-knight', 4, 3.8, 'grate', 5), e('pigeon', 3, 4.0, 'pipe', 8)] },
    { entries: [e('centipede', 8, 2.6, 'pipe'), e('roach-nuclear', 7, 2.6, 'drain', 4), e('hornet', 16, 0.55, 'grate', 8)] },
    { entries: [e('rat-knight', 6, 3.2, 'drain'), e('pigeon', 5, 3.5, 'pipe', 4), e('roach-nuclear', 8, 2.4, 'grate', 8)] },
  ],
  { text: 'Win with Vroomba still running', id: 'escort-complete' },
);

export const SEWER_2: LevelDef = sewerShell(
  'sewer-2',
  2,
  'The Nest',
  'Every tunnel says skitter, then answers itself.',
  390,
  [
    { entries: [e('termite', 10, 0.8, 'drain'), e('tick', 18, 0.45, 'pipe', 3)] },
    { entries: [e('centipede', 5, 3.0, 'grate'), e('roach-nuclear', 4, 3.0, 'drain', 4)] },
    { entries: [e('possum-jr', 6, 2.2, 'pipe'), e('rat-knight', 3, 4.0, 'grate', 5)] },
    { entries: [e('pigeon', 3, 4.0, 'pipe'), e('hornet', 14, 0.65, 'grate', 4), e('wasp-baron', 10, 0.8, 'drain', 8)] },
    { entries: [e('roach-nuclear', 7, 2.5, 'drain'), e('centipede', 7, 2.6, 'pipe', 4), e('tick', 24, 0.35, 'grate', 8)] },
    { entries: [e('rat-knight', 5, 3.2, 'grate'), e('snail-shaman', 8, 1.6, 'drain', 5), e('pigeon', 4, 3.5, 'pipe', 9)] },
    { entries: [e('termite', 16, 0.55, 'drain'), e('roach-nuclear', 8, 2.3, 'pipe', 4), e('centipede', 8, 2.4, 'grate', 8)] },
    { entries: [e('pigeon', 6, 3.0, 'pipe'), e('rat-knight', 6, 3.0, 'drain', 4), e('hornet', 18, 0.5, 'grate', 8)] },
    { entries: [e('roach-nuclear', 10, 2.0, 'grate'), e('centipede', 10, 2.1, 'pipe', 4), e('possum-jr', 12, 1.5, 'drain', 8)] },
    { entries: [e('rat-knight', 8, 2.5, 'drain'), e('pigeon', 7, 2.8, 'pipe', 4), e('roach-nuclear', 10, 1.9, 'grate', 8)] },
  ],
  { text: 'Destroy the nest before a spawner brood reaches cake', id: 'nest-cracked' },
);

export const SEWER_3: LevelDef = sewerShell(
  'sewer-3',
  3,
  'THE EXTERMINATOR',
  'For once, every bug looks at us and says: truce?',
  400,
  [
    { entries: [e('roach-nuclear', 5, 2.6, 'drain'), e('centipede', 5, 2.8, 'pipe')] },
    { entries: [e('rat-knight', 4, 3.2, 'grate'), e('pigeon', 3, 3.8, 'pipe', 4)] },
    { entries: [e('hornet', 16, 0.55, 'pipe'), e('wasp-baron', 10, 0.75, 'grate', 4), e('roach-winged', 14, 0.65, 'drain', 8)] },
    { entries: [e('centipede', 8, 2.3, 'drain'), e('roach-nuclear', 8, 2.2, 'pipe', 4), e('tick', 24, 0.32, 'grate', 8)] },
    { entries: [e('rat-knight', 6, 2.8, 'grate'), e('pigeon', 5, 3.2, 'pipe', 5), e('snail-shaman', 8, 1.5, 'drain', 9)] },
    { entries: [e('roach-nuclear', 10, 1.9, 'drain'), e('centipede', 10, 2.0, 'pipe', 4), e('hornet', 18, 0.48, 'grate', 8)] },
    { entries: [e('rat-knight', 8, 2.4, 'drain'), e('pigeon', 6, 2.8, 'pipe', 4), e('wasp-baron', 14, 0.6, 'grate', 8)] },
    { entries: [e('centipede', 12, 1.8, 'pipe'), e('roach-nuclear', 12, 1.7, 'grate', 4), e('possum-jr', 12, 1.4, 'drain', 8)] },
    { entries: [e('rat-knight', 10, 2.1, 'grate'), e('pigeon', 8, 2.5, 'pipe', 5), e('snail-shaman', 10, 1.2, 'drain', 9)] },
    { entries: [e('roach-nuclear', 10, 2.2, 'drain'), e('roach-nuclear', 10, 2.2, 'pipe', 8), e('centipede', 8, 2.4, 'grate', 12), e('hornet', 18, 0.55, 'pipe', 16)] },
    { entries: [e('rat-knight', 8, 2.6, 'pipe'), e('rat-knight', 8, 2.6, 'drain', 8), e('pigeon', 6, 3.0, 'pipe', 12), e('wasp-baron', 16, 0.6, 'grate', 16)] },
    { entries: [e('the-exterminator', 1, 1, 'grate'), e('rat-knight', 10, 2.2, 'drain', 6), e('pigeon', 8, 2.4, 'pipe', 10), e('roach-nuclear', 14, 1.6, 'grate', 14), e('centipede', 10, 1.8, 'pipe', 18), e('ant-fire', 50, 0.3, 'drain', 20)] },
  ],
  { text: 'Defeat THE EXTERMINATOR before the house is fumigated', id: 'final-truce' },
);

export const SEWER_LEVELS: LevelDef[] = [SEWER_1, SEWER_2, SEWER_3];
