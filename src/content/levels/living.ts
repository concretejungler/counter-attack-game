import type { LevelDef, WaveEntry } from '../../sim/types';

const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

const W2_TOWERS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather', 'bandolero',
  'vroomba', 'lux-interior',
];

export const LIVING_1: LevelDef = {
  id: 'living-1',
  name: 'Couch Country',
  world: 2,
  index: 1,
  blurb: 'The couch coughed once, and a whole ecosystem took it personally.',
  theme: 'living',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 10 },
    { id: 'sofa', kind: 'table', origin: { x: 4, y: 1.8, z: 2 }, cols: 7, rows: 4 },
  ],
  climbs: [
    { from: { s: 0, c: 4, r: 7 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 11, r: 7 }, to: { s: 1, c: 6, r: 3 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'hall', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'couch', tile: { s: 0, c: 14, r: 2 }, kind: 'couch' },
  ],
  cakeTile: { s: 1, c: 4, r: 1 },
  cakeSlices: 10,
  startCrumbs: 290,
  clutterDeck: ['books-l', 'tupper-o', 'cereal-i', 'spatula-t'],
  clutterPerWave: 3,
  allowedTowers: W2_TOWERS,
  waves: [
    { entries: [e('slug', 3, 3.0, 'hall')] },
    { entries: [e('slug', 4, 2.6, 'couch')] },
    { entries: [e('slug', 5, 2.2, 'hall'), e('roach', 2, 2.6, 'couch', 4)] },
    { entries: [e('roach', 4, 2.2, 'hall'), e('slug', 5, 2.0, 'couch', 4)] },
    { entries: [e('slug', 8, 1.8, 'hall'), e('roach', 2, 2.2, 'couch', 5)] },
    { entries: [e('slug', 10, 1.4, 'hall'), e('roach', 5, 1.8, 'couch', 4)] },
  ],
  tutorial: [
    { wave: 0, text: 'new room, new dust crimes. VROOMBA can patrol the floor and eat little stuff. it is VERY bossy.' },
    { wave: 1, text: 'LUX INTERIOR is a lamp that sees sneaky things. also moths are weird about lamps.' },
  ],
  challenge: { text: 'Win with at least one Vroomba still patrolling', id: 'vacuum-duty' },
};

export const LIVING_2: LevelDef = {
  id: 'living-2',
  name: 'Cable Chaos',
  world: 2,
  index: 2,
  blurb: 'Every cable is a tripwire if you believe in yourself badly enough.',
  theme: 'living',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 10 },
    { id: 'tv-stand', kind: 'counter', origin: { x: 3, y: 2.2, z: 1 }, cols: 8, rows: 3 },
    { id: 'coffee-table', kind: 'table', origin: { x: 5, y: 1.4, z: 5 }, cols: 5, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 3 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 10, r: 3 }, to: { s: 1, c: 7, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 7, r: 8 }, to: { s: 2, c: 2, r: 2 }, kind: 'climb' },
    { from: { s: 2, c: 2, r: 0 }, to: { s: 1, c: 4, r: 2 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'hall', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'vent', tile: { s: 0, c: 14, r: 0 }, kind: 'vent' },
    { id: 'screen', tile: { s: 1, c: 7, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 1, c: 4, r: 1 },
  cakeSlices: 10,
  startCrumbs: 290,
  clutterDeck: ['books-l', 'tupper-o', 'cereal-i', 'pasta-j', 'spatula-t'],
  clutterPerWave: 3,
  allowedTowers: W2_TOWERS,
  waves: [
    { entries: [e('slug', 3, 2.8, 'hall')] },
    { entries: [e('slug', 6, 1.7, 'vent')] },
    { entries: [e('slug', 8, 1.2, 'hall'), e('slug', 5, 1.5, 'vent', 5)] },
    { entries: [e('slug', 14, 0.9, 'hall'), e('roach', 2, 2.4, 'hall', 6)] },
    { entries: [e('slug', 24, 0.55, 'hall'), e('slug', 8, 1.0, 'vent', 5)] },
    { entries: [e('slug', 30, 0.42, 'hall'), e('roach', 5, 1.6, 'hall', 6)] },
    { entries: [e('slug', 42, 0.32, 'hall'), e('slug', 12, 0.8, 'vent', 5), e('roach', 8, 1.2, 'hall', 8)] },
  ],
  mutationWaves: [3, 5],
  challenge: { text: 'Win while building on every surface', id: 'all-surfaces' },
};

export const LIVING_3: LevelDef = {
  id: 'living-3',
  name: 'The Rug Pull',
  world: 2,
  index: 3,
  blurb: 'The rug slides. The bugs cheer. The cake does not approve this feature.',
  theme: 'living',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 10 },
    { id: 'ottoman', kind: 'table', origin: { x: 4, y: 1.5, z: 3 }, cols: 5, rows: 4 },
    { id: 'side-table', kind: 'table', origin: { x: 10, y: 2.0, z: 2 }, cols: 4, rows: 4 },
  ],
  climbs: [
    { from: { s: 0, c: 4, r: 7 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 9, r: 7 }, to: { s: 1, c: 4, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 13, r: 5 }, to: { s: 2, c: 3, r: 3 }, kind: 'climb' },
    { from: { s: 1, c: 4, r: 1 }, to: { s: 2, c: 0, r: 2 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'hall', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'couch', tile: { s: 0, c: 15, r: 1 }, kind: 'couch' },
    { id: 'window', tile: { s: 2, c: 3, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 2, c: 2, r: 1 },
  cakeSlices: 10,
  startCrumbs: 290,
  clutterDeck: ['books-l', 'tupper-o', 'cereal-i', 'pasta-j', 'spatula-t'],
  clutterPerWave: 4,
  allowedTowers: W2_TOWERS,
  waves: [
    { entries: [e('slug', 3, 2.8, 'hall')] },
    { entries: [e('slug', 6, 1.7, 'couch')] },
    { entries: [e('slug', 9, 1.1, 'hall'), e('slug', 5, 1.4, 'couch', 5)] },
    { entries: [e('slug', 16, 0.85, 'hall'), e('roach', 2, 2.4, 'hall', 6)] },
    { entries: [e('slug', 24, 0.5, 'hall'), e('slug', 8, 0.9, 'couch', 5)] },
    { entries: [e('slug', 32, 0.38, 'hall'), e('roach', 4, 1.7, 'hall', 7)] },
    { entries: [e('slug', 42, 0.3, 'hall'), e('slug', 10, 0.75, 'couch', 5), e('roach', 6, 1.3, 'hall', 8)] },
    { entries: [e('slug', 48, 0.28, 'hall'), e('roach', 8, 1.1, 'hall', 8), e('slug', 12, 0.7, 'couch', 10)] },
  ],
  mutationWaves: [3, 6],
  challenge: { text: 'Win with no more than 2 slices bitten after the rug shift', id: 'rug-stable' },
};

export const LIVING_4: LevelDef = {
  id: 'living-4',
  name: 'Bookshelf Bastion',
  world: 2,
  index: 4,
  blurb: 'Tall shelves, tiny feet, and one very nervous birthday cake.',
  theme: 'living',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 14, rows: 10 },
    { id: 'low-shelf', kind: 'shelf', origin: { x: 2, y: 2.4, z: 2 }, cols: 10, rows: 3 },
    { id: 'high-shelf', kind: 'shelf', origin: { x: 3, y: 5.0, z: 1 }, cols: 8, rows: 3 },
    { id: 'top-shelf', kind: 'shelf', origin: { x: 4, y: 7.4, z: 1 }, cols: 6, rows: 2 },
  ],
  climbs: [
    { from: { s: 0, c: 2, r: 6 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 11, r: 6 }, to: { s: 1, c: 9, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 2, r: 0 }, to: { s: 2, c: 1, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 8, r: 0 }, to: { s: 2, c: 6, r: 2 }, kind: 'climb' },
    { from: { s: 2, c: 2, r: 0 }, to: { s: 3, c: 1, r: 1 }, kind: 'climb' },
    { from: { s: 2, c: 5, r: 0 }, to: { s: 3, c: 4, r: 1 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'hall', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'crack', tile: { s: 0, c: 13, r: 0 }, kind: 'crack' },
    { id: 'window', tile: { s: 2, c: 7, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 3, c: 3, r: 0 },
  cakeSlices: 10,
  startCrumbs: 290,
  clutterDeck: ['books-l', 'tupper-o', 'cereal-i', 'pasta-j', 'spatula-t'],
  clutterPerWave: 4,
  allowedTowers: W2_TOWERS,
  waves: [
    { entries: [e('slug', 3, 2.8, 'hall')] },
    { entries: [e('roach', 3, 2.4, 'hall'), e('slug', 6, 1.1, 'hall', 5)] },
    { entries: [e('roach', 2, 3.8, 'hall'), e('roach', 6, 1.6, 'hall', 3)] },
    { entries: [e('roach', 8, 1.3, 'hall'), e('slug', 6, 0.9, 'crack', 4)] },
    { entries: [e('slug', 8, 0.8, 'crack'), e('roach', 9, 1.3, 'hall', 3), e('roach', 2, 3.3, 'hall', 7)] },
    { entries: [e('roach', 10, 1.1, 'hall'), e('slug', 24, 0.4, 'crack', 3), e('roach', 3, 2.8, 'hall', 8)] },
    { entries: [e('slug', 10, 0.7, 'crack'), e('roach', 12, 1.1, 'hall', 2), e('roach', 10, 1.0, 'hall', 6)] },
    { entries: [e('roach', 4, 2.5, 'hall'), e('roach', 14, 0.85, 'hall', 3), e('slug', 12, 0.6, 'crack', 6)] },
    { entries: [e('roach', 24, 0.55, 'hall'), e('slug', 14, 0.5, 'crack', 3), e('slug', 48, 0.22, 'hall', 5), e('roach', 5, 2.0, 'hall', 9), e('roach', 8, 1.2, 'hall', 11)] },
  ],
  mutationWaves: [4, 7],
  challenge: { text: 'Win while the cake stays on the top shelf', id: 'top-shelf-safe' },
};

export const LIVING_5: LevelDef = {
  id: 'living-5',
  name: 'Dust to Dust',
  world: 2,
  index: 5,
  blurb: 'The couch void has a queen, and the queen is mostly lint.',
  theme: 'living',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 10 },
    { id: 'sectional', kind: 'table', origin: { x: 3, y: 1.9, z: 2 }, cols: 9, rows: 4 },
    { id: 'end-table', kind: 'table', origin: { x: 11, y: 2.1, z: 4 }, cols: 4, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 8 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 12, r: 8 }, to: { s: 1, c: 8, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 15, r: 4 }, to: { s: 2, c: 3, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 8, r: 1 }, to: { s: 2, c: 0, r: 1 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'hall', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'couch', tile: { s: 0, c: 15, r: 0 }, kind: 'couch' },
    { id: 'vent', tile: { s: 0, c: 8, r: 9 }, kind: 'vent' },
  ],
  cakeTile: { s: 2, c: 2, r: 1 },
  cakeSlices: 10,
  startCrumbs: 350,
  clutterDeck: ['books-l', 'tupper-o', 'cereal-i', 'pasta-j', 'spatula-t'],
  clutterPerWave: 4,
  allowedTowers: W2_TOWERS,
  waves: [
    { entries: [e('slug', 3, 2.8, 'hall')] },
    { entries: [e('slug', 8, 1.4, 'hall')] },
    { entries: [e('slug', 10, 1.0, 'hall'), e('slug', 6, 1.3, 'hall', 5)] },
    { entries: [e('slug', 22, 0.6, 'hall'), e('roach', 2, 2.1, 'hall', 8)] },
    { entries: [e('slug', 30, 0.45, 'hall'), e('slug', 8, 0.8, 'couch', 8)] },
    { entries: [e('slug', 36, 0.35, 'hall'), e('roach', 4, 1.6, 'hall', 8)] },
    { entries: [e('slug', 42, 0.3, 'hall'), e('slug', 12, 0.7, 'couch', 5)] },
    { entries: [e('slug', 48, 0.28, 'hall'), e('roach', 6, 1.2, 'hall', 8)] },
    { entries: [e('slug', 54, 0.25, 'hall'), e('slug', 14, 0.65, 'couch', 5), e('roach', 6, 1.1, 'hall', 10)] },
    { entries: [e('moadb', 1, 1, 'couch'), e('slug', 42, 0.25, 'hall', 10), e('slug', 12, 0.65, 'couch', 12), e('roach', 8, 1.2, 'hall', 14)] },
  ],
  mutationWaves: [4, 8],
  tutorial: [
    { wave: 9, text: 'M.O.A.D.B. SPLITS when it pops. sweep fast, spray faster, and maybe yell MOOOOM if legal.' },
  ],
  challenge: { text: 'Defeat M.O.A.D.B. before it reaches the end table', id: 'dust-before-table' },
};

export const LIVING_LEVELS: LevelDef[] = [LIVING_1, LIVING_2, LIVING_3, LIVING_4, LIVING_5];

