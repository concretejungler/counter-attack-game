import type { LevelDef, WaveEntry } from '../../sim/types';

/** Terse wave-entry helper. */
const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

export const KITCHEN_1: LevelDef = {
  id: 'kitchen-1',
  name: 'First Crumbs',
  world: 1,
  index: 1,
  blurb: 'The wish came true at 7:42pm. By 7:43, the ants knew.',
  theme: 'kitchen',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 14, rows: 10 },
    { id: 'counter', kind: 'counter', origin: { x: 4, y: 2.8, z: 3 }, cols: 6, rows: 4 },
  ],
  climbs: [
    { from: { s: 0, c: 6, r: 2 }, to: { s: 1, c: 2, r: 0 }, kind: 'climb' },
  ],
  spawns: [{ id: 'door', tile: { s: 0, c: 0, r: 8 }, kind: 'door' }],
  cakeTile: { s: 1, c: 4, r: 2 },
  cakeSlices: 10,
  startCrumbs: 160,
  clutterDeck: ['cereal-i', 'tupper-o'],
  clutterPerWave: 3,
  allowedTowers: ['sgt-spritz', 'old-smacky'],
  waves: [
    { entries: [e('ant-worker', 6, 1.4, 'door')] },
    { entries: [e('ant-worker', 10, 1.0, 'door')] },
    { entries: [e('ant-worker', 12, 0.8, 'door'), e('ant-soldier', 1, 1, 'door', 8)] },
    { entries: [e('ant-worker', 10, 0.8, 'door'), e('fly-house', 3, 2.2, 'door', 3)] },
    { entries: [e('ant-worker', 14, 0.7, 'door'), e('ant-soldier', 2, 4, 'door', 5), e('fly-house', 4, 2, 'door', 8)] },
  ],
  tutorial: [
    { wave: 0, text: 'hi house!! the wish worked!! defend my BIRTHDAY CAKE. drag CLUTTER from the corkboard to build walls, then put SGT. SPRITZ on top!! — me' },
    { wave: 1, text: 'the crumbs they drop = MONEY but also = SMELL. drag your hand over crumbs to SWEEP them up before more bugs smell it!!' },
    { wave: 2, text: 'you can FLICK bugs with your finger!! (3 charges). little ones you can just SQUASH. cooldowns tho!!' },
    { wave: 3, text: 'FLIES dodge the first hit. Old Smacky has WORDS for flies.' },
    { wave: 4, text: 'if ants eat crumbs off the floor they MOLT into soldier ants. do NOT let them snack!!' },
  ],
  challenge: { text: 'Win without losing a single slice', id: 'perfect-cake' },
};

export const KITCHEN_2: LevelDef = {
  id: 'kitchen-2',
  name: 'The Sink Strait',
  world: 1,
  index: 2,
  blurb: 'Two fronts, one faucet, zero mercy.',
  theme: 'kitchen',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 14, rows: 10 },
    { id: 'counter-long', kind: 'counter', origin: { x: 2, y: 2.8, z: 1 }, cols: 8, rows: 3, blocked: [[4, 0], [4, 1], [5, 0], [5, 1]] }, // the sink
    { id: 'counter-side', kind: 'counter', origin: { x: 2, y: 2.8, z: 4 }, cols: 3, rows: 5 },
  ],
  climbs: [
    { from: { s: 0, c: 10, r: 2 }, to: { s: 1, c: 7, r: 1 }, kind: 'climb' },
    { from: { s: 0, c: 2, r: 9 }, to: { s: 2, c: 0, r: 4 }, kind: 'climb' },
    { from: { s: 1, c: 0, r: 2 }, to: { s: 2, c: 0, r: 0 }, kind: 'ramp' }, // counters connect at the corner
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 13, r: 9 }, kind: 'door' },
    { id: 'window', tile: { s: 1, c: 7, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 2, c: 1, r: 2 },
  cakeSlices: 10,
  startCrumbs: 190,
  clutterDeck: ['cereal-i', 'tupper-o', 'books-l'],
  clutterPerWave: 3,
  allowedTowers: ['sgt-spritz', 'old-smacky', 'sir-toastsalot'],
  waves: [
    { entries: [e('ant-worker', 8, 1.1, 'door')] },
    { entries: [e('ant-worker', 8, 1.0, 'door'), e('fly-fruit', 8, 0.5, 'window', 4)] },
    { entries: [e('ant-bullet', 5, 1.6, 'door'), e('ant-worker', 8, 1, 'door', 2)] },
    { entries: [e('ant-worker', 12, 0.8, 'door'), e('fly-house', 4, 2, 'window', 2), e('fly-fruit', 10, 0.4, 'window', 8)] },
    { entries: [e('ant-bullet', 8, 1.2, 'door'), e('ant-soldier', 3, 3, 'door', 4)] },
    { entries: [e('fly-fruit', 24, 0.3, 'window'), e('fly-house', 5, 2, 'window', 5)] },
    { entries: [e('ant-worker', 16, 0.6, 'door'), e('ant-bullet', 8, 1, 'door', 6), e('ant-soldier', 4, 2.5, 'door', 10), e('fly-house', 6, 1.8, 'window', 4)] },
  ],
  mutationWaves: [4],
  tutorial: [
    { wave: 0, text: 'TWO ways in now. the WINDOW is a flier highway. toast cannot hit fliers btw. — me' },
    { wave: 3, text: 'BULLET ANTS GO NYOOM. cold stuff slows them but we don\'t have cold stuff yet so. good luck!!' },
  ],
  challenge: { text: 'Win with 4 or fewer towers built', id: 'minimalist' },
};

export const KITCHEN_3: LevelDef = {
  id: 'kitchen-3',
  name: 'Stovetop Scramble',
  world: 1,
  index: 3,
  blurb: 'The cake is BEHIND the burners. The burners do not care about anyone.',
  theme: 'kitchen',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 14, rows: 11 },
    { id: 'stove', kind: 'stove', origin: { x: 3, y: 2.8, z: 2 }, cols: 7, rows: 5, blocked: [[1, 1], [1, 3], [4, 1], [4, 3]] }, // burners
  ],
  climbs: [
    { from: { s: 0, c: 4, r: 8 }, to: { s: 1, c: 1, r: 4 }, kind: 'climb' },
    { from: { s: 0, c: 8, r: 8 }, to: { s: 1, c: 5, r: 4 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'drain', tile: { s: 0, c: 13, r: 10 }, kind: 'drain' },
  ],
  cakeTile: { s: 1, c: 6, r: 2 },
  cakeSlices: 10,
  startCrumbs: 200,
  clutterDeck: ['cereal-i', 'tupper-o', 'books-l', 'sponge-s'],
  clutterPerWave: 3,
  allowedTowers: ['sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick'],
  waves: [
    { entries: [e('ant-worker', 10, 0.9, 'door'), e('ant-worker', 6, 1.2, 'drain', 6)] },
    { entries: [e('roach', 2, 4, 'drain'), e('ant-worker', 10, 0.9, 'door', 3)] },
    { entries: [e('moth', 5, 1.8, 'door'), e('ant-bullet', 6, 1.4, 'drain', 4)] },
    { entries: [e('roach', 4, 3, 'drain'), e('ant-soldier', 4, 2.5, 'door', 5)] },
    { entries: [e('ant-worker', 18, 0.5, 'door'), e('fly-fruit', 14, 0.35, 'drain', 6)] },
    { entries: [e('roach', 5, 2.5, 'drain'), e('moth', 6, 1.5, 'door', 4), e('ant-bullet', 8, 1, 'door', 8)] },
    { entries: [e('ant-soldier', 6, 2, 'door'), e('roach', 4, 3, 'drain', 6), e('fly-house', 6, 1.6, 'door', 10)] },
    { entries: [e('roach', 8, 1.8, 'drain'), e('ant-worker', 20, 0.45, 'door', 4), e('moth', 8, 1.2, 'door', 12)] },
  ],
  mutationWaves: [3, 6],
  tutorial: [
    { wave: 1, text: 'ROACHES PLAY DEAD. they are LYING. keep shooting or flick them off the counter!!' },
    { wave: 2, text: 'Big Blow can shove critters off counter EDGES. falling hurts them A LOT. physics is on OUR side!!' },
  ],
  challenge: { text: 'Shove 15 critters off an edge', id: 'edge-15' },
};

export const KITCHEN_4: LevelDef = {
  id: 'kitchen-4',
  name: 'Pantry Raid',
  world: 1,
  index: 4,
  blurb: 'Three shelves up. The mice know exactly where the cake is.',
  theme: 'kitchen',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 12, rows: 9 },
    { id: 'shelf-low', kind: 'shelf', origin: { x: 2, y: 2.6, z: 1 }, cols: 8, rows: 3 },
    { id: 'shelf-high', kind: 'shelf', origin: { x: 3, y: 5.2, z: 1 }, cols: 6, rows: 2 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 4 }, to: { s: 1, c: 1, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 8, r: 4 }, to: { s: 1, c: 6, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 2, r: 0 }, to: { s: 2, c: 1, r: 1 }, kind: 'climb' },
    { from: { s: 1, c: 5, r: 0 }, to: { s: 2, c: 3, r: 1 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 11, r: 8 }, kind: 'door' },
    { id: 'crack', tile: { s: 0, c: 0, r: 0 }, kind: 'crack' },
    { id: 'window', tile: { s: 1, c: 7, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 2, c: 3, r: 0 },
  cakeSlices: 10,
  startCrumbs: 220,
  clutterDeck: ['cereal-i', 'tupper-o', 'books-l', 'pasta-j', 'spatula-t'],
  clutterPerWave: 4,
  allowedTowers: ['sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather'],
  waves: [
    { entries: [e('ant-worker', 12, 0.8, 'door'), e('dust-bunny', 2, 5, 'crack', 4)] },
    { entries: [e('slug', 4, 3, 'crack'), e('ant-worker', 10, 0.9, 'door', 3)] },
    { entries: [e('mouse-thief', 1, 1, 'door'), e('ant-bullet', 6, 1.3, 'door', 3)] },
    { entries: [e('dust-bunny', 5, 3, 'crack'), e('moth', 6, 1.5, 'window', 2)] },
    { entries: [e('snail', 3, 4, 'crack'), e('roach', 3, 3, 'door', 5), e('fly-fruit', 12, 0.4, 'window', 8)] },
    { entries: [e('mouse-thief', 2, 8, 'door'), e('slug', 5, 2.5, 'crack', 4)] },
    { entries: [e('ant-worker', 20, 0.5, 'door'), e('ant-soldier', 5, 2.2, 'door', 8), e('dust-bunny', 4, 3.5, 'crack', 4)] },
    { entries: [e('snail', 4, 3.5, 'crack'), e('moth', 8, 1.2, 'window', 3), e('ant-bullet', 10, 0.9, 'door', 6)] },
    { entries: [e('mouse-thief', 3, 6, 'door'), e('roach', 6, 2.2, 'door', 4), e('slug', 6, 2, 'crack', 8), e('fly-house', 8, 1.4, 'window', 10)] },
  ],
  mutationWaves: [3, 6],
  tutorial: [
    { wave: 2, text: 'MOUSE!!! it STEALS WHOLE SLICES. if it escapes the slice is GONE. kill it before the exit and you get the slice BACK!!' },
    { wave: 0, text: 'dust bunnies SPLIT when they pop. spray them, splitting hates wet.' },
  ],
  challenge: { text: 'Recover every stolen slice', id: 'no-heists' },
};

export const KITCHEN_5: LevelDef = {
  id: 'kitchen-5',
  name: "The Crumb King's Feast",
  world: 1,
  index: 5,
  blurb: 'He has heard about the cake. He has brought his own fork.',
  theme: 'kitchen',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 11 },
    { id: 'banquet', kind: 'counter', origin: { x: 3, y: 2.8, z: 3 }, cols: 9, rows: 5 },
  ],
  climbs: [
    { from: { s: 0, c: 4, r: 9 }, to: { s: 1, c: 1, r: 4 }, kind: 'climb' },
    { from: { s: 0, c: 10, r: 9 }, to: { s: 1, c: 7, r: 4 }, kind: 'climb' },
    { from: { s: 0, c: 2, r: 2 }, to: { s: 1, c: 0, r: 0 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'vent', tile: { s: 0, c: 14, r: 0 }, kind: 'vent' },
    { id: 'drain', tile: { s: 0, c: 7, r: 10 }, kind: 'drain' },
  ],
  cakeTile: { s: 1, c: 4, r: 2 },
  cakeSlices: 10,
  startCrumbs: 260,
  clutterDeck: ['cereal-i', 'tupper-o', 'books-l', 'pasta-j', 'sponge-s', 'spatula-t'],
  clutterPerWave: 4,
  waves: [
    { entries: [e('ant-worker', 14, 0.7, 'door'), e('ant-bullet', 4, 1.8, 'vent', 5)] },
    { entries: [e('roach', 4, 2.8, 'drain'), e('fly-fruit', 12, 0.4, 'vent', 3)] },
    { entries: [e('mouse-thief', 2, 7, 'door'), e('slug', 4, 2.5, 'drain', 3)] },
    { entries: [e('stinkbug', 3, 4, 'vent'), e('ant-soldier', 5, 2.2, 'door', 4)] },
    { entries: [e('dust-bunny', 6, 2.5, 'drain'), e('moth', 7, 1.4, 'vent', 4), e('ant-worker', 16, 0.5, 'door', 6)] },
    { entries: [e('snail', 5, 3, 'door'), e('roach', 5, 2.4, 'drain', 5), e('fly-house', 7, 1.5, 'vent', 8)] },
    { entries: [e('stinkbug', 4, 3.5, 'drain'), e('ant-bullet', 12, 0.8, 'vent', 4), e('mouse-thief', 2, 9, 'door', 10)] },
    { entries: [e('ant-worker', 24, 0.4, 'door'), e('ant-soldier', 8, 1.8, 'door', 8), e('fly-fruit', 18, 0.3, 'vent', 6)] },
    { entries: [e('roach', 8, 1.8, 'drain'), e('snail', 4, 3, 'door', 6), e('moth', 10, 1.1, 'vent', 4), e('stinkbug', 3, 5, 'drain', 14)] },
    { entries: [e('crumb-king', 1, 1, 'door'), e('ant-worker', 16, 1.2, 'door', 10), e('ant-soldier', 6, 4, 'vent', 15), e('fly-house', 6, 3, 'vent', 20)] },
  ],
  mutationWaves: [4, 8],
  tutorial: [
    { wave: 9, text: 'THE CRUMB KING EATS CRUMBS TO HEAL!!! SWEEP THE FLOOR DURING THE FIGHT!! THIS IS NOT A DRILL!!' },
  ],
  challenge: { text: 'Defeat the Crumb King while the scent meter never passes 50%', id: 'clean-victory' },
};

export const KITCHEN_LEVELS: LevelDef[] = [KITCHEN_1, KITCHEN_2, KITCHEN_3, KITCHEN_4, KITCHEN_5];
