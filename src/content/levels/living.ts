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
    { entries: [e('dust-bunny', 2, 3.5, 'hall')] },
    { entries: [e('maggot', 3, 2.6, 'couch')] },
    { entries: [e('dust-bunny', 2, 3.0, 'hall'), e('maggot', 3, 2.2, 'couch', 4)] },
    { entries: [e('moth', 10, 1.1, 'couch'), e('maggot', 8, 1.4, 'hall', 2), e('dust-bunny', 6, 1.7, 'couch', 6)] },
    { entries: [e('silverfish', 7, 0.95, 'hall'), e('cricket-bard', 3, 2.6, 'couch', 4), e('moth', 6, 1.3, 'hall', 7)] },
    { entries: [e('dust-bunny', 9, 1.1, 'couch'), e('moth', 10, 0.85, 'hall', 3), e('silverfish', 7, 0.9, 'couch', 6), e('cricket-bard', 3, 2.2, 'hall', 9), e('fly-house', 6, 1.2, 'couch', 12)] },
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
    { entries: [e('dust-bunny', 2, 3.5, 'hall')] },
    { entries: [e('maggot', 3, 2.6, 'vent')] },
    { entries: [e('dust-bunny', 2, 3.0, 'hall'), e('maggot', 3, 2.2, 'vent', 4)] },
    { entries: [e('moth', 10, 1.1, 'vent'), e('maggot', 6, 1.5, 'hall', 2), e('dust-bunny', 6, 1.7, 'hall', 6)] },
    { entries: [e('silverfish', 7, 0.95, 'hall'), e('cricket-bard', 3, 2.6, 'vent', 4), e('moth', 7, 1.2, 'vent', 7)] },
    { entries: [e('dust-bunny', 6, 1.3, 'hall'), e('moth', 6, 1.3, 'vent', 4), e('silverfish', 4, 1.3, 'hall', 9)] },
    { entries: [e('cricket-bard', 3, 2.8, 'vent'), e('dust-bunny', 5, 1.4, 'hall', 4), e('moth', 6, 1.4, 'vent', 9), e('silverfish', 3, 1.6, 'hall', 14), e('fly-house', 3, 1.9, 'vent', 20)] },
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
    { entries: [e('dust-bunny', 2, 3.5, 'hall')] },
    { entries: [e('maggot', 2, 3.0, 'couch')] },
    { entries: [e('dust-bunny', 2, 3.0, 'hall'), e('maggot', 2, 2.6, 'couch', 4)] },
    { entries: [e('moth', 4, 2.2, 'couch'), e('maggot', 3, 2.6, 'hall', 2), e('dust-bunny', 2, 2.8, 'couch', 6)] },
    { entries: [e('silverfish', 5, 1.3, 'hall'), e('moth', 5, 1.5, 'couch', 5), e('dust-bunny', 3, 2.2, 'couch', 9)] },
    { entries: [e('dust-bunny', 9, 1.0, 'couch'), e('moth', 6, 1.4, 'couch', 3), e('silverfish', 6, 1.0, 'hall', 8)] },
    { entries: [e('dust-bunny', 9, 0.9, 'hall'), e('silverfish', 6, 1.0, 'couch', 8), e('moth', 7, 1.5, 'couch', 12), e('cricket-bard', 4, 2.2, 'couch', 20)] },
    { entries: [e('dust-bunny', 10, 0.85, 'couch'), e('silverfish', 7, 0.9, 'hall', 8), e('moth', 6, 1.6, 'couch', 12), e('cricket-bard', 4, 2.4, 'couch', 20), e('fly-house', 4, 1.8, 'couch', 26)] },
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
    { entries: [e('dust-bunny', 2, 3.5, 'crack')] },
    { entries: [e('dust-bunny', 2, 3.0, 'hall')] },
    { entries: [e('dust-bunny', 2, 3.0, 'crack'), e('dust-bunny', 2, 2.6, 'hall', 4)] },
    { entries: [e('moth', 4, 2.2, 'hall'), e('dust-bunny', 3, 2.6, 'crack', 2), e('dust-bunny', 2, 2.8, 'hall', 6)] },
    { entries: [e('silverfish', 5, 1.3, 'hall'), e('moth', 6, 1.4, 'hall', 5), e('dust-bunny', 5, 1.9, 'crack', 9)] },
    { entries: [e('dust-bunny', 8, 1.1, 'crack'), e('moth', 8, 1.2, 'hall', 3), e('silverfish', 5, 1.2, 'hall', 8)] },
    { entries: [e('cricket-bard', 4, 2.2, 'hall'), e('silverfish', 7, 1.1, 'hall'), e('dust-bunny', 8, 1.0, 'crack', 8)] },
    { entries: [e('moth', 8, 1.3, 'hall'), e('silverfish', 7, 1.1, 'hall'), e('cricket-bard', 4, 2.2, 'hall', 20), e('dust-bunny', 8, 1.0, 'crack', 8)] },
    { entries: [e('dust-bunny', 10, 0.9, 'crack'), e('moth', 8, 1.2, 'hall'), e('silverfish', 8, 1.0, 'hall'), e('cricket-bard', 5, 2.0, 'hall', 24), e('fly-house', 6, 1.5, 'crack', 28)] },
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
    { entries: [e('dust-bunny', 2, 3.5, 'hall')] },
    { entries: [e('dust-bunny', 2, 3.5, 'couch')] },
    { entries: [e('dust-bunny', 2, 3.0, 'hall'), e('moth', 2, 3.2, 'vent', 4)] },
    { entries: [e('dust-bunny', 5, 1.9, 'couch'), e('moth', 5, 1.9, 'vent', 3), e('dust-bunny', 3, 2.6, 'hall', 8)] },
    { entries: [e('silverfish', 6, 1.2, 'hall'), e('cricket-bard', 2, 3.4, 'vent', 3), e('dust-bunny', 5, 1.8, 'couch', 8)] },
    { entries: [e('moth', 8, 1.1, 'vent'), e('dust-bunny', 8, 1.1, 'couch', 3), e('silverfish', 5, 1.3, 'hall', 9)] },
    { entries: [e('cricket-bard', 3, 2.8, 'vent'), e('silverfish', 8, 1.0, 'hall', 3), e('dust-bunny', 8, 1.0, 'couch', 8)] },
    { entries: [e('moth', 10, 0.95, 'vent'), e('silverfish', 8, 1.0, 'hall', 3), e('cricket-bard', 3, 2.4, 'vent', 20), e('dust-bunny', 8, 1.0, 'couch', 13)] },
    { entries: [e('dust-bunny', 10, 0.9, 'couch'), e('moth', 10, 0.9, 'vent', 3), e('silverfish', 8, 0.95, 'hall', 8), e('cricket-bard', 4, 2.2, 'vent', 24), e('fly-house', 6, 1.4, 'hall', 28)] },
    { entries: [e('moadb', 1, 1, 'couch'), e('dust-bunny', 8, 1.0, 'couch', 10), e('moth', 8, 1.1, 'vent', 14), e('silverfish', 6, 1.2, 'hall', 18)] },
  ],
  mutationWaves: [4, 8],
  tutorial: [
    { wave: 9, text: 'M.O.A.D.B. SPLITS when it pops. sweep fast, spray faster, and maybe yell MOOOOM if legal.' },
  ],
  challenge: { text: 'Defeat M.O.A.D.B. before it reaches the end table', id: 'dust-before-table' },
};

export const LIVING_LEVELS: LevelDef[] = [LIVING_1, LIVING_2, LIVING_3, LIVING_4, LIVING_5];

