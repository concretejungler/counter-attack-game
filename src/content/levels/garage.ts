import type { LevelDef, WaveEntry } from '../../sim/types';

const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

const W5_TOWERS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather', 'bandolero',
  'vroomba', 'lux-interior', 'bubbles-laroux', 'saltimus-prime', 'snappy-and-sons', 'dj-decibel', 'mike-rowave', 'static',
];

export const GARAGE_1: LevelDef = {
  id: 'garage-1',
  name: 'Tool Time',
  world: 5,
  index: 1,
  blurb: 'The toolbox says it can fix this. The toolbox is lying, but confidently.',
  theme: 'garage',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 10 },
    { id: 'workbench', kind: 'counter', origin: { x: 4, y: 2.7, z: 2 }, cols: 8, rows: 3 },
    { id: 'tool-shelf', kind: 'shelf', origin: { x: 10, y: 4.8, z: 5 }, cols: 5, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 4, r: 7 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 12, r: 7 }, to: { s: 1, c: 7, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 7, r: 1 }, to: { s: 2, c: 0, r: 2 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'garage-door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'crack', tile: { s: 0, c: 15, r: 0 }, kind: 'crack' },
  ],
  cakeTile: { s: 1, c: 5, r: 1 },
  cakeSlices: 10,
  startCrumbs: 380,
  clutterDeck: ['toolbox-o', 'cereal-i', 'tupper-o', 'spatula-t'],
  clutterPerWave: 3,
  allowedTowers: W5_TOWERS,
  waves: [
    { entries: [e('beetle', 1, 3.5, 'garage-door')] },
    { entries: [e('slug', 4, 2.4, 'crack')] },
    { entries: [e('beetle', 2, 2.8, 'garage-door'), e('slug', 5, 1.8, 'crack', 4)] },
    { entries: [e('beetle', 3, 2.2, 'garage-door'), e('slug', 7, 1.4, 'crack', 4)] },
    { entries: [e('beetle', 4, 2.0, 'garage-door'), e('slug', 8, 1.2, 'crack', 5)] },
    { entries: [e('beetle', 7, 1.5, 'garage-door'), e('beetle', 4, 1.8, 'crack', 4), e('slug', 10, 1.0, 'garage-door', 6)] },
    { entries: [e('beetle', 10, 1.2, 'garage-door'), e('beetle', 5, 1.5, 'crack', 4), e('slug', 12, 0.9, 'garage-door', 6)] },
  ],
  mutationWaves: [3, 5],
  tutorial: [
    { wave: 0, text: 'GARAGE stuff has armor. MIKE ROWAVE zaps big ground pests. STATIC chains through piles. science!!' },
  ],
  challenge: { text: 'Win with at least one Mike Rowave on the workbench', id: 'microwave-bench' },
};

export const GARAGE_2: LevelDef = {
  id: 'garage-2',
  name: 'Oil Slick City',
  world: 5,
  index: 2,
  blurb: 'Everything slides except the bugs, which feels targeted.',
  theme: 'garage',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 17, rows: 10 },
    { id: 'workbench', kind: 'counter', origin: { x: 3, y: 2.7, z: 1 }, cols: 9, rows: 3 },
    { id: 'storage-shelf', kind: 'shelf', origin: { x: 11, y: 4.7, z: 5 }, cols: 5, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 5 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 12, r: 5 }, to: { s: 1, c: 8, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 8, r: 1 }, to: { s: 2, c: 0, r: 2 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'garage-door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'floor-crack', tile: { s: 0, c: 16, r: 9 }, kind: 'crack' },
    { id: 'vent', tile: { s: 0, c: 16, r: 0 }, kind: 'vent' },
  ],
  cakeTile: { s: 1, c: 6, r: 1 },
  cakeSlices: 10,
  startCrumbs: 380,
  clutterDeck: ['toolbox-o', 'cereal-i', 'tupper-o', 'spatula-t', 'books-l'],
  clutterPerWave: 4,
  allowedTowers: W5_TOWERS,
  waves: [
    { entries: [e('beetle', 1, 3.5, 'garage-door')] },
    { entries: [e('slug', 4, 2.4, 'floor-crack')] },
    { entries: [e('beetle', 2, 2.8, 'garage-door'), e('slug', 5, 1.8, 'floor-crack', 4)] },
    { entries: [e('beetle', 3, 2.2, 'garage-door'), e('slug', 7, 1.4, 'floor-crack', 4)] },
    { entries: [e('beetle', 4, 2.0, 'garage-door'), e('slug', 8, 1.2, 'floor-crack', 5)] },
    { entries: [e('beetle', 4, 1.8, 'garage-door'), e('slug', 8, 1.0, 'garage-door', 6)] },
    { entries: [e('beetle', 5, 1.5, 'garage-door'), e('slug', 8, 0.9, 'garage-door', 6)] },
  ],
  mutationWaves: [3, 6],
  challenge: { text: 'Win before any mouse escapes with a slice', id: 'no-slick-heist' },
};

export const GARAGE_3: LevelDef = {
  id: 'garage-3',
  name: 'Car Alarm Calamity',
  world: 5,
  index: 3,
  blurb: 'The alarm goes WEE-OO. The rats hear dinner music.',
  theme: 'garage',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 17, rows: 10 },
    { id: 'hood', kind: 'table', origin: { x: 4, y: 2.0, z: 3 }, cols: 7, rows: 4 },
    { id: 'workbench', kind: 'counter', origin: { x: 11, y: 2.8, z: 1 }, cols: 5, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 4, r: 8 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 11, r: 8 }, to: { s: 1, c: 6, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 16, r: 4 }, to: { s: 2, c: 4, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 6, r: 1 }, to: { s: 2, c: 0, r: 2 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'garage-door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'engine', tile: { s: 1, c: 0, r: 0 }, kind: 'vent' },
    { id: 'crack', tile: { s: 0, c: 16, r: 0 }, kind: 'crack' },
  ],
  cakeTile: { s: 2, c: 3, r: 1 },
  cakeSlices: 10,
  startCrumbs: 380,
  clutterDeck: ['toolbox-o', 'cereal-i', 'tupper-o', 'spatula-t', 'books-l'],
  clutterPerWave: 4,
  allowedTowers: W5_TOWERS,
  waves: [
    { entries: [e('beetle', 1, 3.5, 'garage-door')] },
    { entries: [e('slug', 4, 2.4, 'crack')] },
    { entries: [e('beetle', 2, 2.8, 'garage-door'), e('slug', 5, 1.8, 'crack', 4)] },
    { entries: [e('rat-knight', 2, 2.8, 'garage-door'), e('slug', 5, 1.6, 'crack', 4)] },
    { entries: [e('beetle', 4, 2.0, 'garage-door'), e('slug', 8, 1.2, 'crack', 5)] },
    { entries: [e('rat-knight', 4, 2.0, 'garage-door'), e('beetle', 4, 1.8, 'crack', 4), e('slug', 10, 1.0, 'garage-door', 6)] },
    { entries: [e('beetle', 6, 1.5, 'garage-door'), e('rat-knight', 5, 1.6, 'crack', 4), e('slug', 12, 0.9, 'garage-door', 6)] },
  ],
  mutationWaves: [4, 7],
  challenge: { text: 'Win with a DJ Decibel near the cake route', id: 'alarm-remix' },
};

export const GARAGE_4: LevelDef = {
  id: 'garage-4',
  name: 'Shelf Life',
  world: 5,
  index: 4,
  blurb: 'The garage shelves have levels, and all of them are bad.',
  theme: 'garage',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 14, rows: 9 },
    { id: 'low-shelf', kind: 'shelf', origin: { x: 1, y: 2.5, z: 2 }, cols: 12, rows: 3 },
    { id: 'high-shelf', kind: 'shelf', origin: { x: 2, y: 5.2, z: 1 }, cols: 10, rows: 3 },
    { id: 'top-shelf', kind: 'shelf', origin: { x: 4, y: 7.8, z: 1 }, cols: 7, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 1, r: 6 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 13, r: 6 }, to: { s: 1, c: 11, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 2, r: 0 }, to: { s: 2, c: 1, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 9, r: 0 }, to: { s: 2, c: 7, r: 2 }, kind: 'climb' },
    { from: { s: 2, c: 3, r: 0 }, to: { s: 3, c: 1, r: 2 }, kind: 'climb' },
    { from: { s: 2, c: 7, r: 0 }, to: { s: 3, c: 5, r: 2 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'garage-door', tile: { s: 0, c: 0, r: 8 }, kind: 'door' },
    { id: 'wall-crack', tile: { s: 0, c: 13, r: 0 }, kind: 'crack' },
    { id: 'rafters', tile: { s: 2, c: 9, r: 0 }, kind: 'vent' },
  ],
  cakeTile: { s: 3, c: 4, r: 1 },
  cakeSlices: 10,
  startCrumbs: 380,
  clutterDeck: ['toolbox-o', 'cereal-i', 'tupper-o', 'spatula-t', 'books-l'],
  clutterPerWave: 4,
  allowedTowers: W5_TOWERS,
  waves: [
    { entries: [e('beetle', 1, 3.5, 'garage-door')] },
    { entries: [e('slug', 4, 2.4, 'wall-crack')] },
    { entries: [e('beetle', 2, 2.8, 'garage-door'), e('slug', 5, 1.8, 'wall-crack', 4)] },
    { entries: [e('rat-knight', 2, 2.8, 'garage-door'), e('slug', 5, 1.6, 'wall-crack', 4)] },
    { entries: [e('beetle', 4, 2.0, 'garage-door'), e('slug', 8, 1.2, 'wall-crack', 5)] },
    { entries: [e('rat-knight', 4, 2.0, 'garage-door'), e('beetle', 4, 1.8, 'wall-crack', 4), e('slug', 10, 1.0, 'garage-door', 6)] },
    { entries: [e('beetle', 6, 1.5, 'garage-door'), e('rat-knight', 5, 1.6, 'wall-crack', 4), e('slug', 12, 0.9, 'garage-door', 6)] },
  ],
  mutationWaves: [4, 8],
  challenge: { text: 'Win after building defenses on all shelf tiers', id: 'vertical-tooling' },
};

export const GARAGE_5: LevelDef = {
  id: 'garage-5',
  name: 'The Rat King',
  world: 5,
  index: 5,
  blurb: 'Three rats in a coat is funny until the coat has a health bar.',
  theme: 'garage',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 17, rows: 10 },
    { id: 'workbench', kind: 'counter', origin: { x: 3, y: 2.7, z: 2 }, cols: 9, rows: 3 },
    { id: 'storage-shelf', kind: 'shelf', origin: { x: 10, y: 5.2, z: 5 }, cols: 6, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 8 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 12, r: 8 }, to: { s: 1, c: 8, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 16, r: 4 }, to: { s: 2, c: 5, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 8, r: 1 }, to: { s: 2, c: 0, r: 1 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'garage-door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'wall-crack', tile: { s: 0, c: 16, r: 0 }, kind: 'crack' },
    { id: 'rafters', tile: { s: 2, c: 5, r: 0 }, kind: 'vent' },
  ],
  cakeTile: { s: 2, c: 3, r: 1 },
  cakeSlices: 10,
  startCrumbs: 430,
  clutterDeck: ['toolbox-o', 'cereal-i', 'tupper-o', 'spatula-t', 'books-l', 'pasta-j'],
  clutterPerWave: 4,
  allowedTowers: W5_TOWERS,
  waves: [
    { entries: [e('beetle', 1, 3.5, 'garage-door')] },
    { entries: [e('slug', 4, 2.4, 'wall-crack')] },
    { entries: [e('beetle', 2, 2.8, 'garage-door'), e('slug', 5, 1.8, 'wall-crack', 4)] },
    { entries: [e('rat-knight', 2, 2.8, 'garage-door'), e('slug', 5, 1.6, 'wall-crack', 4)] },
    { entries: [e('beetle', 4, 2.0, 'garage-door'), e('slug', 8, 1.2, 'wall-crack', 5)] },
    { entries: [e('rat-knight', 4, 2.0, 'garage-door'), e('beetle', 4, 1.8, 'wall-crack', 4), e('slug', 10, 1.0, 'garage-door', 6)] },
    { entries: [e('beetle', 6, 1.5, 'garage-door'), e('rat-knight', 5, 1.6, 'wall-crack', 4), e('slug', 12, 0.9, 'garage-door', 6)] },
    { entries: [e('beetle', 7, 1.4, 'garage-door'), e('rat-knight', 6, 1.5, 'wall-crack', 4), e('slug', 12, 0.8, 'garage-door', 6)] },
    { entries: [e('rat-knight', 7, 1.4, 'garage-door'), e('beetle', 7, 1.4, 'wall-crack', 4), e('slug', 14, 0.8, 'wall-crack', 6)] },
    { entries: [e('rat-king', 1, 1, 'garage-door'), e('beetle', 5, 1.6, 'wall-crack', 8), e('slug', 12, 0.9, 'garage-door', 10)] },
  ],
  mutationWaves: [4, 8],
  tutorial: [
    { wave: 10, text: 'THE RAT KING splits into rat knights. sonic hurts him. DJ says this is his encore.' },
  ],
  challenge: { text: 'Defeat the Rat King with no stolen slices lost', id: 'king-no-heist' },
};

export const GARAGE_LEVELS: LevelDef[] = [GARAGE_1, GARAGE_2, GARAGE_3, GARAGE_4, GARAGE_5];

