import type { LevelDef, WaveEntry } from '../../sim/types';

const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

const W4_TOWERS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather', 'bandolero',
  'vroomba', 'lux-interior', 'bubbles-laroux', 'saltimus-prime', 'snappy-and-sons', 'dj-decibel',
];

export const BEDROOM_1: LevelDef = {
  id: 'bedroom-1',
  name: 'Under Where?',
  world: 4,
  index: 1,
  blurb: 'Under the bed is not empty. It was just waiting for cake.',
  theme: 'bedroom',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 10 },
    { id: 'bed', kind: 'table', origin: { x: 3, y: 2.1, z: 2 }, cols: 8, rows: 4 },
    { id: 'nightstand', kind: 'table', origin: { x: 11, y: 2.5, z: 4 }, cols: 3, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 8 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 11, r: 8 }, to: { s: 1, c: 7, r: 3 }, kind: 'climb' },
    { from: { s: 1, c: 7, r: 1 }, to: { s: 2, c: 0, r: 1 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'underbed', tile: { s: 0, c: 14, r: 1 }, kind: 'crack' },
  ],
  cakeTile: { s: 1, c: 5, r: 1 },
  cakeSlices: 10,
  startCrumbs: 350,
  clutterDeck: ['books-l', 'tupper-o', 'cereal-i', 'soap-i'],
  clutterPerWave: 3,
  allowedTowers: W4_TOWERS,
  waves: [
    { entries: [e('dust-bunny', 2, 3.5, 'door')] },
    { entries: [e('bedbug', 2, 3.0, 'underbed')] },
    { entries: [e('dust-bunny', 2, 3.4, 'door'), e('bedbug', 2, 2.8, 'underbed', 4)] },
    { entries: [e('dust-bunny', 8, 2.1, 'underbed'), e('bedbug', 3, 3.0, 'underbed', 6), e('tick', 2, 4.5, 'door', 14)] },
    { entries: [e('mosquito', 10, 1.1, 'door'), e('bedbug', 4, 2.4, 'underbed', 4), e('moth', 12, 0.9, 'door', 9)] },
    { entries: [e('bedbug', 5, 2.4, 'underbed'), e('dust-bunny', 10, 1.3, 'underbed', 10), e('moth', 11, 1.1, 'door', 20), e('mosquito', 4, 1.9, 'door', 26)] },
    { entries: [e('cricket-bard', 5, 2.2, 'door'), e('bedbug', 6, 1.8, 'underbed', 4), e('mosquito', 11, 1.0, 'door', 9), e('tick', 2, 4.5, 'door', 22), e('dust-bunny', 12, 0.95, 'underbed', 12)] },
  ],
  mutationWaves: [3, 5],
  tutorial: [
    { wave: 0, text: 'BEDBUGS are invisible unless LUX shines on them. lamp first, panic second.' },
    { wave: 1, text: 'SNAPPY & SONS is a floor trap. very dramatic. remember to rearm traps if stuff survives.' },
  ],
  challenge: { text: 'Win with no hidden bedbug bites', id: 'nothing-under-bed' },
};

export const BEDROOM_2: LevelDef = {
  id: 'bedroom-2',
  name: 'Closet Case',
  world: 4,
  index: 2,
  blurb: 'The closet door opens by itself, which is only cool in movies.',
  theme: 'bedroom',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 10 },
    { id: 'dresser', kind: 'counter', origin: { x: 2, y: 2.6, z: 1 }, cols: 6, rows: 3 },
    { id: 'bed', kind: 'table', origin: { x: 8, y: 2.0, z: 4 }, cols: 6, rows: 4 },
  ],
  climbs: [
    { from: { s: 0, c: 2, r: 5 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 8, r: 5 }, to: { s: 1, c: 5, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 13, r: 8 }, to: { s: 2, c: 5, r: 3 }, kind: 'climb' },
    { from: { s: 1, c: 5, r: 1 }, to: { s: 2, c: 0, r: 1 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'closet', tile: { s: 0, c: 14, r: 0 }, kind: 'crack' },
    { id: 'window', tile: { s: 2, c: 5, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 2, c: 3, r: 2 },
  cakeSlices: 10,
  startCrumbs: 350,
  clutterDeck: ['books-l', 'tupper-o', 'cereal-i', 'soap-i', 'spatula-t'],
  clutterPerWave: 4,
  allowedTowers: W4_TOWERS,
  waves: [
    { entries: [e('dust-bunny', 2, 3.5, 'door')] },
    { entries: [e('bedbug', 2, 3.0, 'closet')] },
    { entries: [e('dust-bunny', 2, 3.4, 'door'), e('bedbug', 2, 2.8, 'closet', 4)] },
    { entries: [e('dust-bunny', 9, 2.1, 'closet'), e('bedbug', 4, 3.0, 'closet', 6)] },
    { entries: [e('mosquito', 10, 1.1, 'window'), e('bedbug', 4, 2.4, 'closet', 4), e('moth', 12, 0.9, 'window', 9)] },
    { entries: [e('bedbug', 6, 2.4, 'closet'), e('dust-bunny', 10, 1.3, 'closet', 10), e('moth', 11, 1.1, 'window', 20), e('mosquito', 4, 1.9, 'window', 26)] },
    { entries: [e('cricket-bard', 5, 2.2, 'window'), e('bedbug', 8, 1.7, 'closet', 4), e('mosquito', 11, 1.0, 'window', 9), e('dust-bunny', 13, 0.95, 'closet', 12)] },
  ],
  mutationWaves: [3, 6],
  challenge: { text: 'Win after blocking both closet lanes with clutter', id: 'closet-closed' },
};

export const BEDROOM_3: LevelDef = {
  id: 'bedroom-3',
  name: 'Lights Out',
  world: 4,
  index: 3,
  blurb: 'Permanent night mode: cozy for blankets, awful for cake defense.',
  theme: 'bedroom',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 10 },
    { id: 'bed', kind: 'table', origin: { x: 4, y: 2.0, z: 2 }, cols: 8, rows: 4 },
    { id: 'desk', kind: 'counter', origin: { x: 11, y: 2.7, z: 5 }, cols: 4, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 4, r: 8 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 12, r: 8 }, to: { s: 1, c: 7, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 15, r: 8 }, to: { s: 2, c: 3, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 7, r: 1 }, to: { s: 2, c: 0, r: 0 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'underbed', tile: { s: 0, c: 15, r: 0 }, kind: 'crack' },
    { id: 'window', tile: { s: 1, c: 7, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 2, c: 2, r: 1 },
  cakeSlices: 10,
  startCrumbs: 350,
  clutterDeck: ['books-l', 'tupper-o', 'cereal-i', 'soap-i', 'spatula-t'],
  clutterPerWave: 4,
  allowedTowers: W4_TOWERS,
  waves: [
    { entries: [e('dust-bunny', 2, 3.5, 'door')] },
    { entries: [e('bedbug', 2, 3.0, 'underbed')] },
    { entries: [e('dust-bunny', 2, 3.4, 'door'), e('bedbug', 2, 2.8, 'underbed', 4)] },
    { entries: [e('dust-bunny', 9, 1.9, 'underbed'), e('bedbug', 4, 2.3, 'underbed', 6)] },
    { entries: [e('mosquito', 10, 1.1, 'window'), e('bedbug', 4, 2.4, 'underbed', 4), e('moth', 12, 0.9, 'window', 9)] },
    { entries: [e('bedbug', 6, 2.1, 'underbed'), e('dust-bunny', 10, 1.3, 'underbed', 10), e('moth', 11, 1.1, 'window', 20), e('mosquito', 4, 1.9, 'window', 26)] },
    { entries: [e('cricket-bard', 5, 2.2, 'window'), e('bedbug', 8, 1.7, 'underbed', 4), e('mosquito', 11, 1.0, 'window', 9), e('dust-bunny', 13, 0.95, 'underbed', 12)] },
  ],
  mutationWaves: [4, 6],
  tutorial: [
    { wave: 0, text: 'LIGHTS OUT means LUX IS MANDATORY. no lamp = bedbugs do crimes unseen. write that down!!' },
  ],
  challenge: { text: 'Win with three Lux Interior lamps revealing the cake route', id: 'triple-lux' },
};

export const BEDROOM_4: LevelDef = {
  id: 'bedroom-4',
  name: 'The Bedbug Baron',
  world: 4,
  index: 4,
  blurb: 'He is tiny, fancy, invisible, and somehow wearing a cape.',
  theme: 'bedroom',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 10 },
    { id: 'bed', kind: 'table', origin: { x: 3, y: 2.0, z: 2 }, cols: 9, rows: 4 },
    { id: 'dresser', kind: 'counter', origin: { x: 11, y: 2.8, z: 5 }, cols: 5, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 8 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 12, r: 8 }, to: { s: 1, c: 8, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 15, r: 7 }, to: { s: 2, c: 4, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 8, r: 1 }, to: { s: 2, c: 0, r: 0 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'underbed', tile: { s: 0, c: 15, r: 0 }, kind: 'crack' },
    { id: 'window', tile: { s: 1, c: 8, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 2, c: 3, r: 1 },
  cakeSlices: 10,
  startCrumbs: 410,
  clutterDeck: ['books-l', 'tupper-o', 'cereal-i', 'soap-i', 'spatula-t'],
  clutterPerWave: 4,
  allowedTowers: W4_TOWERS,
  waves: [
    { entries: [e('dust-bunny', 10, 1.0, 'door')] },
    { entries: [e('bedbug', 3, 2.6, 'underbed'), e('dust-bunny', 9, 1.1, 'door', 4)] },
    { entries: [e('moth', 5, 1.6, 'window'), e('bedbug', 3, 2.4, 'underbed', 3), e('dust-bunny', 10, 1.0, 'door', 7)] },
    { entries: [e('dust-bunny', 5, 1.9, 'underbed'), e('bedbug', 4, 2.0, 'underbed', 4), e('dust-bunny', 12, 0.9, 'door', 6)] },
    { entries: [e('mosquito', 5, 1.6, 'window'), e('bedbug', 5, 1.8, 'underbed', 3), e('moth', 6, 1.4, 'window', 7), e('dust-bunny', 4, 2.0, 'door', 10)] },
    { entries: [e('dust-bunny', 5, 1.8, 'underbed'), e('bedbug', 4, 2.0, 'underbed', 3), e('dust-bunny', 14, 0.85, 'door', 8)] },
    { entries: [e('cricket-bard', 2, 3.0, 'window'), e('bedbug', 4, 1.9, 'underbed', 3), e('mosquito', 4, 1.8, 'window', 7), e('dust-bunny', 11, 0.9, 'door', 10)] },
    { entries: [e('bedbug', 6, 1.6, 'underbed'), e('dust-bunny', 6, 1.6, 'underbed', 8), e('moth', 7, 1.2, 'window', 11), e('dust-bunny', 18, 0.7, 'door', 3)] },
    { entries: [e('mosquito', 7, 1.4, 'window'), e('bedbug', 8, 1.3, 'underbed', 3), e('cricket-bard', 3, 2.4, 'window', 8), e('dust-bunny', 18, 0.7, 'door', 11)] },
    { entries: [e('bedbug-baron', 1, 1, 'underbed'), e('bedbug', 9, 1.3, 'underbed', 10), e('mosquito', 6, 1.4, 'window', 15), e('dust-bunny', 4, 1.7, 'underbed', 20), e('dust-bunny', 24, 0.6, 'door', 12)] },
  ],
  mutationWaves: [4, 8],
  tutorial: [
    { wave: 9, text: 'BARON IS STEALTH TOO. keep him in lamp range or he eats cake like a fancy dot.' },
  ],
  challenge: { text: 'Defeat the Baron while a Lux tower covers the cake', id: 'baron-in-spotlight' },
};

export const BEDROOM_LEVELS: LevelDef[] = [BEDROOM_1, BEDROOM_2, BEDROOM_3, BEDROOM_4];

