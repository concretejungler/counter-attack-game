import type { LevelDef, WaveEntry } from '../../sim/types';

const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

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
  waves,
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
    { entries: [e('roach-nuclear', 2, 3.4, 'drain'), e('centipede-bit', 6, 1.4, 'pipe', 2)] },
    { entries: [e('rat-knight', 1, 1, 'grate'), e('centipede-bit', 7, 1.2, 'pipe', 3)] },
    { entries: [e('centipede-half', 3, 2.4, 'drain'), e('roach-nuclear', 2, 3.2, 'grate', 4)] },
    { entries: [e('roach-nuclear', 3, 2.6, 'pipe'), e('centipede-bit', 9, 1.0, 'drain', 4)] },
    { entries: [e('pigeon', 1, 6.0, 'pipe'), e('centipede', 1, 5.0, 'grate', 4)] },
    { entries: [e('centipede-half', 4, 1.9, 'drain'), e('rat-knight', 1, 1, 'grate', 5), e('roach-nuclear', 2, 3.0, 'pipe', 8)] },
    { entries: [e('roach-nuclear', 4, 2.4, 'drain'), e('centipede-bit', 10, 0.9, 'pipe', 4), e('pigeon', 1, 5.0, 'grate', 8)] },
    { entries: [e('centipede', 2, 4.0, 'pipe'), e('roach-nuclear', 4, 2.3, 'drain', 4), e('centipede-half', 4, 1.8, 'grate', 8)] },
    { entries: [e('rat-knight', 2, 3.0, 'grate'), e('pigeon', 1, 4.5, 'pipe', 4), e('roach-nuclear', 4, 2.1, 'drain', 8)] },
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
    { entries: [e('roach-nuclear', 2, 3.2, 'drain'), e('centipede-bit', 7, 1.3, 'pipe', 2)] },
    { entries: [e('centipede-half', 3, 2.3, 'grate'), e('rat-knight', 1, 1, 'drain', 4)] },
    { entries: [e('centipede-bit', 10, 0.95, 'pipe'), e('roach-nuclear', 3, 2.8, 'drain', 4)] },
    { entries: [e('pigeon', 1, 6.0, 'pipe'), e('centipede', 1, 5.0, 'grate', 5), e('rat-knight', 1, 1, 'drain', 8)] },
    { entries: [e('roach-nuclear', 4, 2.3, 'drain'), e('centipede-bit', 11, 0.85, 'pipe', 4), e('centipede-half', 3, 2.0, 'grate', 8)] },
    { entries: [e('rat-knight', 2, 3.0, 'grate'), e('pigeon', 1, 5.0, 'pipe', 5), e('roach-nuclear', 3, 2.6, 'drain', 8)] },
    { entries: [e('centipede', 2, 4.4, 'pipe'), e('roach-nuclear', 5, 2.2, 'drain', 4), e('centipede-bit', 10, 0.85, 'grate', 8)] },
    { entries: [e('pigeon', 1, 4.6, 'pipe'), e('rat-knight', 2, 2.8, 'drain', 4), e('centipede-half', 4, 1.8, 'grate', 8)] },
    { entries: [e('roach-nuclear', 6, 2.0, 'drain'), e('centipede', 2, 4.0, 'pipe', 4), e('centipede-bit', 10, 0.8, 'grate', 8)] },
    { entries: [e('rat-knight', 3, 2.6, 'grate'), e('pigeon', 2, 4.2, 'pipe', 4), e('roach-nuclear', 5, 2.0, 'drain', 8)] },
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
    { entries: [e('roach-nuclear', 2, 3.2, 'drain'), e('centipede-bit', 5, 1.4, 'pipe', 2)] },
    { entries: [e('rat-knight', 1, 1, 'grate'), e('centipede-bit', 5, 1.4, 'pipe', 4)] },
    { entries: [e('centipede-half', 2, 2.6, 'drain'), e('roach-nuclear', 2, 3.0, 'grate', 4)] },
    { entries: [e('centipede-bit', 7, 1.1, 'pipe'), e('roach-nuclear', 2, 2.8, 'drain', 4)] },
    { entries: [e('rat-knight', 1, 1, 'grate'), e('pigeon', 1, 6.0, 'pipe', 5)] },
    { entries: [e('roach-nuclear', 2, 2.8, 'drain'), e('centipede-half', 2, 2.4, 'grate', 5)] },
    { entries: [e('rat-knight', 1, 1, 'grate'), e('centipede-bit', 6, 1.1, 'pipe', 4)] },
    { entries: [e('pigeon', 1, 5.4, 'pipe'), e('roach-nuclear', 2, 2.6, 'drain', 4), e('centipede', 1, 5.0, 'grate', 8)] },
    { entries: [e('rat-knight', 2, 2.8, 'grate'), e('centipede-half', 2, 2.2, 'drain', 4), e('roach-nuclear', 2, 2.6, 'pipe', 8)] },
    { entries: [e('pigeon', 1, 5.0, 'pipe'), e('centipede', 1, 4.6, 'grate', 4), e('roach-nuclear', 3, 2.3, 'drain', 8)] },
    { entries: [e('rat-knight', 2, 2.6, 'drain'), e('pigeon', 1, 4.6, 'pipe', 4), e('roach-nuclear', 3, 2.2, 'grate', 8)] },
    { entries: [e('the-exterminator', 1, 1, 'grate'), e('rat-knight', 1, 1, 'drain', 6), e('pigeon', 1, 5.0, 'pipe', 10), e('roach-nuclear', 3, 2.4, 'grate', 14), e('centipede', 1, 5.0, 'pipe', 18)] },
  ],
  { text: 'Defeat THE EXTERMINATOR before the house is fumigated', id: 'final-truce' },
);

export const SEWER_LEVELS: LevelDef[] = [SEWER_1, SEWER_2, SEWER_3];
