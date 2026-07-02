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
    { entries: [e('snail', 3, 3.0, 'door')] },
    { entries: [e('snail', 4, 2.8, 'underbed')] },
    { entries: [e('roach', 5, 2.2, 'door'), e('snail', 3, 2.4, 'underbed', 4)] },
    { entries: [e('snail', 6, 2.0, 'door'), e('roach', 5, 1.9, 'underbed', 4)] },
    { entries: [e('snail', 8, 1.7, 'door'), e('roach', 6, 1.6, 'underbed', 5)] },
    { entries: [e('snail', 10, 1.3, 'door'), e('roach', 8, 1.3, 'underbed', 4)] },
    { entries: [e('slug', 14, 1.0, 'door'), e('snail', 8, 1.2, 'underbed', 4)] },
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
    { entries: [e('snail', 3, 3.0, 'door')] },
    { entries: [e('snail', 4, 2.8, 'closet')] },
    { entries: [e('snail', 6, 1.9, 'door'), e('snail', 4, 2.2, 'closet', 4)] },
    { entries: [e('snail', 8, 1.6, 'door'), e('slug', 8, 1.5, 'closet', 4)] },
    { entries: [e('snail', 10, 1.4, 'door'), e('snail', 6, 1.4, 'closet', 5)] },
    { entries: [e('snail', 12, 1.1, 'door'), e('slug', 12, 1.0, 'closet', 4)] },
    { entries: [e('slug', 18, 0.8, 'door'), e('snail', 10, 1.0, 'closet', 4), e('roach', 3, 1.5, 'door', 8)] },
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
    { entries: [e('snail', 3, 3.0, 'door')] },
    { entries: [e('snail', 4, 2.8, 'underbed')] },
    { entries: [e('roach', 5, 2.2, 'door'), e('snail', 3, 2.4, 'underbed', 4)] },
    { entries: [e('snail', 6, 2.0, 'door'), e('roach', 5, 1.9, 'underbed', 4)] },
    { entries: [e('snail', 8, 1.7, 'door'), e('roach', 6, 1.6, 'underbed', 5)] },
    { entries: [e('snail', 10, 1.3, 'door'), e('roach', 8, 1.3, 'underbed', 4)] },
    { entries: [e('slug', 14, 1.0, 'door'), e('snail', 8, 1.2, 'underbed', 4)] },
  ],
  mutationWaves: [4, 7],
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
    { entries: [e('snail', 3, 3.0, 'door')] },
    { entries: [e('snail', 4, 2.8, 'underbed')] },
    { entries: [e('roach', 5, 2.2, 'door'), e('snail', 3, 2.4, 'underbed', 4)] },
    { entries: [e('snail', 6, 2.0, 'door'), e('roach', 5, 1.9, 'underbed', 4)] },
    { entries: [e('snail', 8, 1.7, 'door'), e('roach', 6, 1.6, 'underbed', 5)] },
    { entries: [e('snail', 10, 1.3, 'door'), e('roach', 8, 1.3, 'underbed', 4)] },
    { entries: [e('slug', 14, 1.0, 'door'), e('snail', 8, 1.2, 'underbed', 4)] },
    { entries: [e('snail', 11, 1.2, 'door'), e('roach', 9, 1.2, 'underbed', 4), e('slug', 10, 0.9, 'door', 8)] },
    { entries: [e('snail', 12, 1.1, 'door'), e('roach', 12, 1.1, 'underbed', 4), e('slug', 12, 0.8, 'underbed', 8)] },
    { entries: [e('bedbug-baron', 1, 1, 'underbed'), e('slug', 10, 1.2, 'door', 8), e('roach', 6, 1.5, 'underbed', 10)] },
  ],
  mutationWaves: [4, 8],
  tutorial: [
    { wave: 9, text: 'BARON IS STEALTH TOO. keep him in lamp range or he eats cake like a fancy dot.' },
  ],
  challenge: { text: 'Defeat the Baron while a Lux tower covers the cake', id: 'baron-in-spotlight' },
};

export const BEDROOM_LEVELS: LevelDef[] = [BEDROOM_1, BEDROOM_2, BEDROOM_3, BEDROOM_4];

