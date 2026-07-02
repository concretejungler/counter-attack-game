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
      critter: entry.critter === 'pigeon' || entry.critter === 'wasp-baron' || entry.critter === 'hornet' ? 'moth' : entry.critter,
      count: entry.count === 1 ? 1 : Math.max(1, Math.ceil(entry.count * factor)),
      })),
      ...(index === waves.length - 1 ? finalBoost : []),
    ],
  }));

const BACKYARD_SCALE: Record<string, number> = {
  'backyard-1': 0.12,
  'backyard-2': 0.12,
  'backyard-3': 0.12,
  'backyard-4': 0.12,
  'backyard-5': 0.12,
};

const BACKYARD_FINAL_BOOST: Record<string, WaveEntry[]> = {
  'backyard-1': [e('termite', 89, 0.65, 'fence', 16)],
  'backyard-2': [e('termite', 85, 0.65, 'fence', 16)],
  'backyard-3': [e('termite', 90, 0.65, 'fence', 16)],
  'backyard-4': [e('termite', 82, 0.65, 'fence', 16)],
  'backyard-5': [e('termite', 102, 0.7, 'fence', 300)],
};

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
  waves: scaleWaves([
    { entries: [e('ant-fire', 14, 0.55, 'gate'), e('ant-carpenter', 8, 0.9, 'fence', 3)] },
    { entries: [e('snail-shaman', 3, 3.5, 'hose'), e('ant-fire', 18, 0.45, 'gate', 4)] },
    { entries: [e('wasp-baron', 4, 2.0, 'fence'), e('hornet', 5, 1.8, 'hose', 4)] },
    { entries: [e('ant-carpenter', 16, 0.65, 'gate'), e('snail-shaman', 4, 3.0, 'fence', 5)] },
    { entries: [e('pigeon', 2, 6.0, 'hose'), e('wasp-baron', 5, 1.8, 'fence', 4)] },
    { entries: [e('hornet', 8, 1.3, 'fence'), e('ant-fire', 24, 0.35, 'gate', 5), e('snail-shaman', 4, 2.8, 'hose', 8)] },
    { entries: [e('pigeon', 3, 5.0, 'fence'), e('ant-carpenter', 20, 0.5, 'gate', 4), e('wasp-baron', 7, 1.4, 'hose', 8)] },
    { entries: [e('pigeon', 4, 4.5, 'hose'), e('hornet', 10, 1.0, 'fence', 4), e('snail-shaman', 6, 2.4, 'gate', 8)] },
  ], BACKYARD_SCALE['backyard-1'], BACKYARD_FINAL_BOOST['backyard-1']),
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
  waves: scaleWaves(waves, BACKYARD_SCALE[id], BACKYARD_FINAL_BOOST[id]),
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
    { entries: [e('ant-fire', 18, 0.45, 'gate'), e('ant-carpenter', 8, 0.85, 'fence', 3)] },
    { entries: [e('snail-shaman', 3, 3.2, 'gate'), e('hornet', 5, 1.7, 'sky', 4)] },
    { entries: [e('wasp-baron', 5, 1.7, 'sky'), e('ant-fire', 22, 0.35, 'gate', 4)] },
    { entries: [e('pigeon', 2, 5.5, 'sky'), e('ant-carpenter', 16, 0.6, 'fence', 5)] },
    { entries: [e('snail-shaman', 5, 2.6, 'gate'), e('hornet', 8, 1.2, 'sky', 4), e('ant-fire', 22, 0.32, 'fence', 8)] },
    { entries: [e('wasp-baron', 8, 1.2, 'sky'), e('pigeon', 3, 5.0, 'fence', 4)] },
    { entries: [e('ant-carpenter', 24, 0.45, 'gate'), e('snail-shaman', 6, 2.3, 'fence', 6), e('hornet', 10, 0.95, 'sky', 8)] },
    { entries: [e('pigeon', 4, 4.5, 'sky'), e('wasp-baron', 9, 1.0, 'fence', 4), e('ant-fire', 30, 0.28, 'gate', 8)] },
    { entries: [e('pigeon', 5, 4.0, 'fence'), e('hornet', 12, 0.8, 'sky', 5), e('snail-shaman', 8, 2.0, 'gate', 10)] },
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
    { entries: [e('wasp-baron', 6, 1.5, 'sky'), e('hornet', 6, 1.4, 'fence', 3)] },
    { entries: [e('ant-fire', 24, 0.35, 'gate'), e('snail-shaman', 4, 2.8, 'fence', 5)] },
    { entries: [e('hornet', 10, 1.0, 'sky'), e('wasp-baron', 7, 1.2, 'fence', 4)] },
    { entries: [e('pigeon', 2, 5.0, 'sky'), e('ant-carpenter', 18, 0.55, 'gate', 5)] },
    { entries: [e('wasp-baron', 10, 0.95, 'sky'), e('hornet', 12, 0.85, 'fence', 3)] },
    { entries: [e('snail-shaman', 6, 2.2, 'gate'), e('pigeon', 3, 4.5, 'fence', 4), e('hornet', 10, 0.85, 'sky', 8)] },
    { entries: [e('wasp-baron', 12, 0.8, 'sky'), e('hornet', 14, 0.75, 'fence', 4), e('ant-fire', 30, 0.25, 'gate', 8)] },
    { entries: [e('pigeon', 4, 4.0, 'sky'), e('wasp-baron', 14, 0.7, 'fence', 5), e('snail-shaman', 8, 1.8, 'gate', 10)] },
    { entries: [e('pigeon', 5, 3.8, 'fence'), e('hornet', 18, 0.65, 'sky', 4), e('wasp-baron', 14, 0.65, 'gate', 8)] },
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
    { entries: [e('ant-carpenter', 18, 0.5, 'gate'), e('snail-shaman', 4, 2.8, 'fence', 3)] },
    { entries: [e('ant-fire', 26, 0.3, 'gate'), e('hornet', 7, 1.2, 'sky', 5)] },
    { entries: [e('pigeon', 2, 5.0, 'fence'), e('wasp-baron', 7, 1.1, 'sky', 4)] },
    { entries: [e('snail-shaman', 7, 2.0, 'fence'), e('ant-carpenter', 24, 0.4, 'gate', 5)] },
    { entries: [e('hornet', 14, 0.75, 'sky'), e('wasp-baron', 10, 0.9, 'fence', 4)] },
    { entries: [e('pigeon', 4, 4.2, 'sky'), e('ant-fire', 32, 0.24, 'gate', 5), e('snail-shaman', 7, 1.8, 'fence', 8)] },
    { entries: [e('ant-carpenter', 32, 0.32, 'gate'), e('pigeon', 4, 3.8, 'fence', 4), e('hornet', 14, 0.7, 'sky', 8)] },
    { entries: [e('wasp-baron', 16, 0.65, 'sky'), e('snail-shaman', 10, 1.6, 'fence', 5), e('ant-fire', 36, 0.22, 'gate', 10)] },
    { entries: [e('pigeon', 6, 3.5, 'fence'), e('hornet', 18, 0.6, 'sky', 4), e('ant-carpenter', 36, 0.28, 'gate', 8)] },
    { entries: [e('pigeon', 7, 3.2, 'sky'), e('wasp-baron', 18, 0.6, 'fence', 4), e('snail-shaman', 10, 1.5, 'gate', 8)] },
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
    { entries: [e('pigeon', 2, 4.8, 'sky'), e('ant-fire', 28, 0.28, 'gate', 3)] },
    { entries: [e('wasp-baron', 9, 0.9, 'sky'), e('snail-shaman', 6, 2.0, 'fence', 4)] },
    { entries: [e('ant-carpenter', 30, 0.32, 'gate'), e('hornet', 12, 0.7, 'sky', 5)] },
    { entries: [e('pigeon', 4, 3.8, 'fence'), e('wasp-baron', 12, 0.75, 'sky', 4)] },
    { entries: [e('snail-shaman', 9, 1.6, 'gate'), e('hornet', 16, 0.58, 'sky', 4), e('ant-fire', 34, 0.22, 'fence', 8)] },
    { entries: [e('pigeon', 6, 3.2, 'sky'), e('ant-carpenter', 36, 0.25, 'gate', 5)] },
    { entries: [e('wasp-baron', 18, 0.55, 'sky'), e('hornet', 18, 0.55, 'fence', 4), e('snail-shaman', 10, 1.4, 'gate', 8)] },
    { entries: [e('pigeon', 5, 4.0, 'fence'), e('pigeon', 5, 4.0, 'sky', 8), e('wasp-baron', 12, 0.9, 'fence', 12), e('ant-carpenter', 28, 0.4, 'gate', 16)] },
    { entries: [e('snail-shaman', 10, 1.6, 'gate'), e('snail-shaman', 10, 1.6, 'fence', 6), e('hornet', 20, 0.5, 'sky', 10), e('pigeon', 5, 3.6, 'fence', 14)] },
    { entries: [e('moadb', 1, 1, 'sky', 80), e('pigeon', 7, 3.2, 'sky', 8), e('wasp-baron', 18, 0.55, 'fence', 12), e('termite', 40, 0.2, 'gate', 16)] },
  ],
  { text: 'Defeat the Don without letting him heal from crumbs', id: 'no-mob-dinner' },
);

export const BACKYARD_LEVELS: LevelDef[] = [BACKYARD_1, BACKYARD_2, BACKYARD_3, BACKYARD_4, BACKYARD_5];
