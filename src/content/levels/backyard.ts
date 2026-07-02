import type { LevelDef, WaveEntry } from '../../sim/types';

const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

const W8_TOWERS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather', 'bandolero',
  'vroomba', 'lux-interior', 'bubbles-laroux', 'saltimus-prime', 'snappy-and-sons', 'dj-decibel',
  'mike-rowave', 'static', 'old-stinky', 'eau-de-no', 'herr-tick-tock', 'the-daily-smack',
  'audrey-the-third', 'count-blendula',
];

const BACKYARD_DECK = ['cereal-i', 'books-l', 'tupper-o', 'toolbox-o', 'flowerpot-t', 'spatula-t'];

export const BACKYARD_1: LevelDef = {
  id: 'backyard-1',
  name: 'Lawn Order',
  world: 8,
  index: 1,
  blurb: 'The yard is wide open, which is just another word for rude.',
  theme: 'backyard',
  surfaces: [
    { id: 'lawn', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 12 },
  ],
  climbs: [],
  spawns: [
    { id: 'gate', tile: { s: 0, c: 0, r: 11 }, kind: 'door' },
    { id: 'fence', tile: { s: 0, c: 15, r: 0 }, kind: 'crack' },
    { id: 'hose', tile: { s: 0, c: 15, r: 11 }, kind: 'drain' },
  ],
  cakeTile: { s: 0, c: 8, r: 5 },
  cakeSlices: 10,
  startCrumbs: 470,
  clutterDeck: BACKYARD_DECK,
  clutterPerWave: 4,
  allowedTowers: W8_TOWERS,
  waves: [
    { entries: [e('ant-fire', 16, 0.85, 'gate'), e('ant-carpenter', 6, 1.4, 'fence', 3)] },
    { entries: [e('snail-shaman', 2, 4.5, 'hose'), e('ant-fire', 12, 0.95, 'gate', 4)] },
    { entries: [e('hornet', 2, 3.0, 'fence'), e('ant-carpenter', 8, 1.2, 'gate', 3)] },
    { entries: [e('ant-carpenter', 10, 1.0, 'gate'), e('snail-shaman', 2, 4.0, 'fence', 5)] },
    { entries: [e('wasp-baron', 2, 3.0, 'fence'), e('ant-fire', 16, 0.75, 'gate', 4)] },
    { entries: [e('hornet', 3, 2.6, 'fence'), e('snail-shaman', 2, 3.5, 'hose', 4), e('ant-carpenter', 9, 1.0, 'gate', 6)] },
    { entries: [e('pigeon', 1, 6.0, 'hose'), e('ant-fire', 16, 0.7, 'gate'), e('wasp-baron', 2, 3.0, 'fence', 5)] },
    { entries: [e('pigeon', 1, 5.0, 'fence'), e('hornet', 3, 2.4, 'hose', 3), e('ant-carpenter', 10, 0.9, 'gate', 6), e('snail-shaman', 3, 3.0, 'hose', 10)] },
  ],
  mutationWaves: [3, 6],
  tutorial: [
    { wave: 0, text: 'open lawn means YOU build the maze. floor towers count. plants bite. plants are friends now.' },
    { wave: 2, text: 'wasps and hornets own the air unless cold, sonic, or newspapers disagree.' },
  ],
  challenge: { text: 'Win after placing at least eight clutter pieces', id: 'pure-mazing' },
};

const backyardShell = (
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
  world: 8,
  index,
  blurb,
  theme: 'backyard',
  surfaces: [
    { id: 'patio', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 10 },
    { id: 'picnic-table', kind: 'table', origin: { x: 4, y: 2.4, z: 2 }, cols: 7, rows: 4 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 8 }, to: { s: 1, c: 0, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 11, r: 8 }, to: { s: 1, c: 6, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 7, r: 1 }, to: { s: 1, c: 3, r: 0 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'gate', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'fence', tile: { s: 0, c: 14, r: 0 }, kind: 'crack' },
    { id: 'sky', tile: { s: 0, c: 14, r: 9 }, kind: 'window' },
  ],
  cakeTile: { s: 1, c: 3, r: 1 },
  cakeSlices: 10,
  startCrumbs: index === 5 ? 530 : 470,
  clutterDeck: BACKYARD_DECK,
  clutterPerWave: 4,
  allowedTowers: W8_TOWERS,
  waves,
  mutationWaves: [3, Math.max(6, waves.length - 3)],
  challenge,
});

export const BACKYARD_2: LevelDef = backyardShell(
  'backyard-2',
  2,
  'BBQ Blitz',
  'The grill is hot, the ants are hotter, and nobody asked them.',
  365,
  [
    { entries: [e('ant-fire', 16, 0.65, 'gate'), e('ant-carpenter', 6, 1.3, 'fence', 3)] },
    { entries: [e('snail-shaman', 2, 4.0, 'gate'), e('ant-fire', 12, 0.75, 'sky', 4)] },
    { entries: [e('hornet', 2, 3.0, 'sky'), e('ant-carpenter', 8, 1.1, 'gate', 3)] },
    { entries: [e('pigeon', 1, 6.0, 'sky'), e('ant-carpenter', 9, 1.0, 'fence', 5)] },
    { entries: [e('snail-shaman', 2, 3.5, 'gate'), e('hornet', 3, 2.5, 'sky', 4), e('ant-fire', 12, 0.65, 'fence', 8)] },
    { entries: [e('wasp-baron', 1, 4.0, 'sky'), e('pigeon', 1, 5.5, 'fence', 4)] },
    { entries: [e('ant-carpenter', 10, 0.85, 'gate'), e('snail-shaman', 2, 3.2, 'fence', 6), e('hornet', 3, 2.2, 'sky', 8)] },
    { entries: [e('pigeon', 1, 5.0, 'sky'), e('wasp-baron', 2, 3.4, 'fence', 4), e('ant-fire', 14, 0.55, 'gate', 8)] },
    { entries: [e('pigeon', 1, 4.5, 'fence'), e('hornet', 4, 2.0, 'sky', 5), e('snail-shaman', 3, 2.6, 'gate', 10)] },
  ],
  { text: 'Win with at least three heat towers built', id: 'grill-master' },
);

export const BACKYARD_3: LevelDef = backyardShell(
  'backyard-3',
  3,
  'The Hive',
  'The diplomacy failed when the hive said BZZZZ in all caps.',
  375,
  [
    { entries: [e('ant-fire', 4, 2.2, 'gate')] },
    { entries: [e('ant-fire', 5, 2.0, 'gate')] },
    { entries: [e('ant-carpenter', 3, 2.6, 'gate'), e('ant-fire', 5, 1.9, 'gate', 5)] },
    { entries: [e('hornet', 2, 3.4, 'sky'), e('ant-carpenter', 8, 1.3, 'gate', 5)] },
    { entries: [e('ant-carpenter', 10, 1.1, 'gate'), e('hornet', 2, 3.2, 'sky', 6)] },
    { entries: [e('wasp-baron', 1, 4.5, 'sky'), e('hornet', 3, 2.8, 'fence', 6)] },
    { entries: [e('snail-shaman', 3, 2.8, 'gate'), e('hornet', 5, 2.0, 'sky', 10)] },
    { entries: [e('wasp-baron', 3, 2.6, 'sky'), e('hornet', 5, 2.0, 'fence', 5), e('ant-fire', 14, 0.6, 'gate', 10)] },
    { entries: [e('pigeon', 2, 4.8, 'sky'), e('wasp-baron', 3, 2.4, 'fence', 10), e('snail-shaman', 4, 2.4, 'gate', 16), e('hornet', 4, 2.0, 'sky', 22)] },
  ],
  { text: 'Defeat 30 flying critters with cold or sonic damage', id: 'ground-the-hive' },
);

export const BACKYARD_4: LevelDef = backyardShell(
  'backyard-4',
  4,
  'Sandbox Showdown',
  'The sandcastle was neutral until the carpenter ants filed permits.',
  385,
  [
    { entries: [e('ant-carpenter', 9, 1.0, 'gate'), e('snail-shaman', 2, 4.0, 'fence', 3), e('ant-fire', 6, 1.4, 'gate', 6)] },
    { entries: [e('ant-fire', 14, 0.65, 'gate'), e('hornet', 2, 3.0, 'sky', 5)] },
    { entries: [e('pigeon', 1, 5.5, 'fence'), e('ant-carpenter', 9, 1.0, 'gate', 4)] },
    { entries: [e('snail-shaman', 3, 2.8, 'fence'), e('ant-carpenter', 10, 0.9, 'gate', 5)] },
    { entries: [e('hornet', 3, 2.4, 'sky'), e('wasp-baron', 1, 3.6, 'fence', 4)] },
    { entries: [e('pigeon', 1, 4.4, 'sky'), e('ant-fire', 12, 0.6, 'gate', 5), e('snail-shaman', 3, 2.4, 'fence', 8)] },
    { entries: [e('ant-carpenter', 12, 0.55, 'gate'), e('pigeon', 1, 4.0, 'fence', 4), e('hornet', 3, 2.1, 'sky', 8)] },
    { entries: [e('wasp-baron', 2, 2.6, 'sky'), e('snail-shaman', 3, 2.0, 'fence', 5), e('ant-fire', 12, 0.5, 'gate', 10)] },
    { entries: [e('pigeon', 1, 4.0, 'fence'), e('hornet', 4, 1.8, 'sky', 4), e('ant-carpenter', 10, 0.6, 'gate', 8)] },
    { entries: [e('pigeon', 1, 3.6, 'sky'), e('wasp-baron', 2, 2.4, 'fence', 4), e('snail-shaman', 3, 1.9, 'gate', 8)] },
  ],
  { text: 'Win while the cake table never loses a clutter mount', id: 'sandcastle' },
);

export const BACKYARD_5: LevelDef = backyardShell(
  'backyard-5',
  5,
  'The Trash Panda Don',
  'He made an offer the leftovers could not refuse.',
  395,
  [
    { entries: [e('ant-fire', 8, 1.2, 'gate'), e('ant-carpenter', 4, 1.9, 'fence', 3)] },
    { entries: [e('snail-shaman', 1, 5.0, 'gate'), e('ant-fire', 8, 1.1, 'sky', 4)] },
    { entries: [e('hornet', 2, 3.2, 'sky'), e('ant-carpenter', 5, 1.5, 'gate', 3)] },
    { entries: [e('pigeon', 1, 6.0, 'fence'), e('ant-carpenter', 6, 1.4, 'gate', 5)] },
    { entries: [e('wasp-baron', 1, 4.4, 'sky'), e('hornet', 2, 2.8, 'fence', 4), e('ant-fire', 8, 1.0, 'gate', 8)] },
    { entries: [e('snail-shaman', 2, 3.4, 'gate'), e('pigeon', 1, 5.4, 'fence', 4), e('hornet', 2, 2.6, 'sky', 8)] },
    { entries: [e('wasp-baron', 2, 3.2, 'sky'), e('hornet', 3, 2.4, 'fence', 4), e('ant-fire', 8, 0.85, 'gate', 8)] },
    { entries: [e('pigeon', 1, 4.8, 'sky'), e('wasp-baron', 2, 3.0, 'fence', 5), e('snail-shaman', 2, 2.8, 'gate', 10)] },
    { entries: [e('pigeon', 1, 4.4, 'fence'), e('hornet', 3, 2.2, 'sky', 4), e('wasp-baron', 2, 2.8, 'gate', 8), e('ant-carpenter', 7, 1.0, 'fence', 12)] },
    { entries: [e('trash-panda-don', 1, 1, 'sky'), e('pigeon', 1, 5.0, 'sky', 10), e('wasp-baron', 2, 3.0, 'fence', 14), e('snail-shaman', 2, 3.0, 'gate', 18), e('ant-fire', 8, 0.9, 'gate', 22)] },
  ],
  { text: 'Defeat the Don without letting him heal from crumbs', id: 'no-mob-dinner' },
);

export const BACKYARD_LEVELS: LevelDef[] = [BACKYARD_1, BACKYARD_2, BACKYARD_3, BACKYARD_4, BACKYARD_5];
