import type { LevelDef, WaveEntry } from '../../sim/types';

const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

const W3_TOWERS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather', 'bandolero',
  'vroomba', 'lux-interior', 'bubbles-laroux', 'saltimus-prime',
];

export const BATHROOM_1: LevelDef = {
  id: 'bathroom-1',
  name: 'Porcelain Throne',
  world: 3,
  index: 1,
  blurb: 'The throne is occupied by cake, which is probably against plumbing code.',
  theme: 'bathroom',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 14, rows: 10 },
    { id: 'toilet-lid', kind: 'table', origin: { x: 5, y: 2.0, z: 2 }, cols: 4, rows: 4 },
    { id: 'sink', kind: 'sink', origin: { x: 9, y: 2.6, z: 1 }, cols: 4, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 5, r: 7 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 9, r: 6 }, to: { s: 1, c: 3, r: 3 }, kind: 'climb' },
    { from: { s: 1, c: 3, r: 0 }, to: { s: 2, c: 0, r: 2 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'drain', tile: { s: 0, c: 13, r: 9 }, kind: 'drain' },
  ],
  cakeTile: { s: 1, c: 2, r: 1 },
  cakeSlices: 10,
  startCrumbs: 320,
  clutterDeck: ['soap-i', 'tupper-o', 'sponge-s', 'cereal-i'],
  clutterPerWave: 3,
  allowedTowers: W3_TOWERS,
  waves: [
    { entries: [e('slug', 3, 3.0, 'door')] },
    { entries: [e('snail', 3, 2.8, 'drain')] },
    { entries: [e('slug', 5, 2.2, 'door'), e('roach', 3, 2.4, 'drain', 4)] },
    { entries: [e('snail', 5, 2.4, 'door'), e('slug', 5, 2.0, 'drain', 4)] },
    { entries: [e('roach', 7, 1.8, 'door'), e('snail', 4, 2.0, 'drain', 5)] },
    { entries: [e('slug', 10, 1.3, 'door'), e('roach', 7, 1.5, 'drain', 4)] },
    { entries: [e('snail', 8, 1.6, 'door'), e('slug', 10, 1.1, 'drain', 4)] },
  ],
  mutationWaves: [3, 5],
  tutorial: [
    { wave: 0, text: 'bathroom bugs are sloopy. BUBBLES pops fliers, SALTIMUS makes ground stuff regret being wet.' },
    { wave: 4, text: 'EARWIGS tunnel under the maze and show up close. rude shortcut!!' },
  ],
  challenge: { text: 'Win without letting an earwig bite the cake', id: 'no-earwig-bites' },
};

export const BATHROOM_2: LevelDef = {
  id: 'bathroom-2',
  name: 'Shower Hour',
  world: 3,
  index: 2,
  blurb: 'Steam fogs the glass. Something inside writes CAKE on it backwards.',
  theme: 'bathroom',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 10 },
    { id: 'tub-rim', kind: 'sink', origin: { x: 3, y: 2.2, z: 2 }, cols: 8, rows: 3 },
    { id: 'vanity', kind: 'counter', origin: { x: 10, y: 2.7, z: 5 }, cols: 4, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 7 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 11, r: 5 }, to: { s: 1, c: 7, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 13, r: 8 }, to: { s: 2, c: 3, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 7, r: 1 }, to: { s: 2, c: 0, r: 0 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'shower-drain', tile: { s: 0, c: 14, r: 0 }, kind: 'drain' },
    { id: 'window', tile: { s: 1, c: 7, r: 0 }, kind: 'window' },
  ],
  cakeTile: { s: 2, c: 2, r: 1 },
  cakeSlices: 10,
  startCrumbs: 320,
  clutterDeck: ['soap-i', 'tupper-o', 'sponge-s', 'books-l', 'cereal-i'],
  clutterPerWave: 4,
  allowedTowers: W3_TOWERS,
  waves: [
    { entries: [e('slug', 2, 3.0, 'door')] },
    { entries: [e('snail', 1, 3.2, 'shower-drain')] },
    { entries: [e('slug', 3, 2.0, 'door')] },
    { entries: [e('snail', 3, 2.4, 'door')] },
    { entries: [e('snail', 3, 2.0, 'door')] },
    { entries: [e('snail', 3, 1.8, 'door'), e('slug', 4, 1.5, 'door', 6)] },
    { entries: [e('snail', 25, 0.8, 'door'), e('slug', 25, 0.7, 'door', 6), e('roach', 3, 1.6, 'door', 10)] },
  ],
  mutationWaves: [3, 6],
  challenge: { text: 'Win with at least two bubble towers built', id: 'bubble-bath' },
};

export const BATHROOM_3: LevelDef = {
  id: 'bathroom-3',
  name: 'Drain Brain',
  world: 3,
  index: 3,
  blurb: 'Every drain had a meeting and decided the agenda was cake.',
  theme: 'bathroom',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 10 },
    { id: 'sink-left', kind: 'sink', origin: { x: 2, y: 2.6, z: 1 }, cols: 5, rows: 3 },
    { id: 'sink-right', kind: 'sink', origin: { x: 8, y: 2.6, z: 1 }, cols: 5, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 2, r: 5 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 7, r: 5 }, to: { s: 1, c: 4, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 8, r: 5 }, to: { s: 2, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 13, r: 5 }, to: { s: 2, c: 4, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 4, r: 1 }, to: { s: 2, c: 0, r: 1 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'floor-drain', tile: { s: 0, c: 0, r: 9 }, kind: 'drain' },
    { id: 'tub-drain', tile: { s: 0, c: 14, r: 9 }, kind: 'drain' },
    { id: 'sink-drain', tile: { s: 1, c: 0, r: 0 }, kind: 'drain' },
  ],
  cakeTile: { s: 2, c: 3, r: 1 },
  cakeSlices: 10,
  startCrumbs: 320,
  clutterDeck: ['soap-i', 'tupper-o', 'sponge-s', 'books-l', 'spatula-t'],
  clutterPerWave: 4,
  allowedTowers: W3_TOWERS,
  waves: [
    { entries: [e('slug', 3, 3.0, 'floor-drain')] },
    { entries: [e('snail', 3, 2.8, 'tub-drain')] },
    { entries: [e('slug', 5, 2.2, 'floor-drain'), e('roach', 3, 2.4, 'tub-drain', 4)] },
    { entries: [e('snail', 5, 2.4, 'floor-drain'), e('slug', 5, 2.0, 'tub-drain', 4)] },
    { entries: [e('roach', 7, 1.8, 'floor-drain'), e('snail', 4, 2.0, 'tub-drain', 5)] },
    { entries: [e('slug', 10, 1.3, 'floor-drain'), e('roach', 7, 1.5, 'tub-drain', 4)] },
    { entries: [e('snail', 8, 1.6, 'floor-drain'), e('slug', 10, 1.1, 'tub-drain', 4)] },
  ],
  mutationWaves: [4, 7],
  tutorial: [
    { wave: 0, text: 'this one is ALL DRAINS. if it gurgles, assume it wants frosting.' },
  ],
  challenge: { text: 'Win after placing clutter on both sinks', id: 'double-basin' },
};

export const BATHROOM_4: LevelDef = {
  id: 'bathroom-4',
  name: 'Sir Clogsworth',
  world: 3,
  index: 4,
  blurb: 'A royal blorp rises from the pipe with terrible manners.',
  theme: 'bathroom',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 10 },
    { id: 'tub-rim', kind: 'sink', origin: { x: 3, y: 2.3, z: 2 }, cols: 9, rows: 3 },
    { id: 'vanity', kind: 'counter', origin: { x: 10, y: 2.8, z: 5 }, cols: 5, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 7 }, to: { s: 1, c: 0, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 12, r: 7 }, to: { s: 1, c: 8, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 14, r: 8 }, to: { s: 2, c: 4, r: 2 }, kind: 'climb' },
    { from: { s: 1, c: 8, r: 1 }, to: { s: 2, c: 0, r: 0 }, kind: 'ramp' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'drain', tile: { s: 0, c: 15, r: 0 }, kind: 'drain' },
    { id: 'overflow', tile: { s: 1, c: 8, r: 0 }, kind: 'drain' },
  ],
  cakeTile: { s: 2, c: 3, r: 1 },
  cakeSlices: 10,
  startCrumbs: 380,
  clutterDeck: ['soap-i', 'tupper-o', 'sponge-s', 'books-l', 'cereal-i', 'spatula-t'],
  clutterPerWave: 4,
  allowedTowers: W3_TOWERS,
  waves: [
    { entries: [e('slug', 3, 3.0, 'door')] },
    { entries: [e('snail', 3, 2.8, 'drain')] },
    { entries: [e('slug', 5, 2.2, 'door'), e('roach', 3, 2.4, 'drain', 4)] },
    { entries: [e('snail', 5, 2.4, 'door'), e('slug', 5, 2.0, 'drain', 4)] },
    { entries: [e('roach', 7, 1.8, 'door'), e('snail', 4, 2.0, 'drain', 5)] },
    { entries: [e('slug', 10, 1.3, 'door'), e('roach', 7, 1.5, 'drain', 4)] },
    { entries: [e('snail', 8, 1.6, 'door'), e('slug', 10, 1.1, 'drain', 4)] },
    { entries: [e('roach', 9, 1.4, 'door'), e('snail', 7, 1.5, 'drain', 4), e('slug', 8, 1.0, 'door', 8)] },
    { entries: [e('snail', 10, 1.3, 'door'), e('roach', 10, 1.2, 'drain', 4), e('slug', 10, 0.9, 'drain', 8)] },
    { entries: [e('sir-clogsworth', 1, 1, 'drain'), e('slug', 10, 1.2, 'door', 8), e('roach', 6, 1.5, 'drain', 10)] },
  ],
  mutationWaves: [4, 8],
  tutorial: [
    { wave: 9, text: 'SIR CLOGSWORTH dives under attacks. zap is best. also he is NOT actually a knight, probably.' },
  ],
  challenge: { text: 'Defeat Sir Clogsworth while every drain is defended', id: 'all-drains-covered' },
};

export const BATHROOM_LEVELS: LevelDef[] = [BATHROOM_1, BATHROOM_2, BATHROOM_3, BATHROOM_4];

