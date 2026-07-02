import type { LevelDef, WaveEntry } from '../../sim/types';

/**
 * SECRET LEVELS (GAME-PROMPT §14 secret list + §20.16 playable credits). Phase 4 bonus content —
 * reachable only through their own unlock predicates (see src/meta/progress.ts isSecretUnlocked),
 * never through normal campaign progression.
 *
 * World number: 0. This is deliberate and load-bearing:
 *  - src/meta/progress.ts worldsGrouped() drives the campaign dollhouse grid; it groups strictly
 *    by ALL_LEVELS' `world` field. World 0 is never iterated by the campaign's 1-9 world walk
 *    (achievements.ts's worldFullyWon/'world-3-star' hardcode [1..9]; infestation.ts's
 *    FLOOR_WORLDS is an explicit [[1,2,3],[4,5,6],[7,8,9]] whitelist) — so these levels cannot
 *    accidentally leak into the dollhouse grid, Infestation's remixed node pool, or any
 *    world-indexed achievement, without needing an exclusion list anywhere. They're surfaced only
 *    by the dedicated "???" attic-corner secret panel (screens.ts buildSecretPanel).
 *  - tests/content.test.ts iterates ALL_LEVELS (reference-resolution, pathability, mutation-wave
 *    range lint) — these levels MUST pass that suite, and do.
 *  - tests/content-levels.test.ts's anti-shell composition/hp-mass/curve lint iterates its own
 *    fixed WORLDS: [1, KITCHEN_LEVELS]...[9, SEWER_LEVELS] table, built from the named per-world
 *    exports — SECRET_LEVELS is never added to it, so these levels are naturally exempt (per the
 *    task brief) without any special-case code in that lint file.
 *  - No balance suite (balance.test.ts / balance-w2345.test.ts / balance-w6789.test.ts /
 *    balance-hardness.test.ts) references SECRET_LEVELS or iterates ALL_LEVELS, so none of these
 *    — especially the deliberately-not-par-winnable Impossible Room — are ever asserted par.
 */

const e = (critter: string, count: number, interval: number, spawn: string, delay = 0): WaveEntry =>
  ({ critter, count, interval, spawn, delay });

// The full tower roster (matches world 9's "everything unlocked" allowedTowers list) — bonus
// content shouldn't gate a tutorial tower subset the way early campaign levels do.
const ALL_TOWERS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather', 'bandolero',
  'vroomba', 'lux-interior', 'bubbles-laroux', 'saltimus-prime', 'snappy-and-sons', 'dj-decibel',
  'mike-rowave', 'static', 'old-stinky', 'eau-de-no', 'herr-tick-tock', 'the-daily-smack',
  'audrey-the-third', 'count-blendula', 'alexis', 'professor-scorch',
];

// =========================================================================
// 1. THE CRUMB DIMENSION — unlocked by beating any 10 levels with 3 stars.
// Dessert-scaled kitchen, "everything bounces" physics gag (logged to CUTS.md — the sim has no
// per-level physics-gag hook, so the level itself just leans hard on crumb-adjacent swarms: big,
// bouncy, numerous). 8 waves, generous crumbs.
// =========================================================================
export const SECRET_CRUMB: LevelDef = {
  id: 'secret-crumb',
  name: 'The Crumb Dimension',
  world: 0,
  index: 1,
  blurb: 'Somewhere behind the toaster, three golden crumbs stacked so high they folded reality. Everything down here bounces. EVERYTHING.',
  theme: 'secret',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 15, rows: 11 },
    { id: 'sprinkle-shelf', kind: 'counter', origin: { x: 3, y: 2.8, z: 3 }, cols: 9, rows: 5 },
  ],
  climbs: [
    { from: { s: 0, c: 4, r: 9 }, to: { s: 1, c: 1, r: 4 }, kind: 'climb' },
    { from: { s: 0, c: 10, r: 9 }, to: { s: 1, c: 7, r: 4 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' },
    { id: 'crack', tile: { s: 0, c: 14, r: 0 }, kind: 'crack' },
  ],
  cakeTile: { s: 1, c: 4, r: 2 },
  cakeSlices: 10,
  startCrumbs: 320,
  clutterDeck: ['cereal-i', 'tupper-o', 'books-l', 'sponge-s'],
  clutterPerWave: 4,
  allowedTowers: ALL_TOWERS,
  waves: [
    { entries: [e('ant-worker', 14, 0.7, 'door'), e('dust-bunny', 3, 3, 'crack', 3)] },
    { entries: [e('maggot', 10, 1.0, 'crack'), e('ant-worker', 14, 0.6, 'door', 2)] },
    { entries: [e('ant-soldier', 6, 1.8, 'door'), e('dust-bunny', 4, 2.6, 'crack', 3)] },
    { entries: [e('ant-bullet', 10, 1.0, 'door'), e('maggot', 12, 0.8, 'crack', 3)] },
    { entries: [e('ant-worker', 20, 0.5, 'door'), e('dust-bunny', 5, 2.2, 'crack', 4), e('ant-soldier', 6, 1.6, 'door', 6)] },
    { entries: [e('maggot', 16, 0.65, 'crack'), e('ant-bullet', 10, 0.9, 'door', 3)] },
    { entries: [e('dust-bunny', 6, 2.0, 'crack'), e('ant-worker', 22, 0.45, 'door', 3), e('ant-soldier', 8, 1.4, 'door', 8)] },
    { entries: [e('ant-worker', 24, 0.4, 'door'), e('dust-bunny', 8, 1.8, 'crack', 3), e('maggot', 16, 0.6, 'crack', 8), e('ant-bullet', 12, 0.8, 'door', 10)] },
  ],
  mutationWaves: [4],
  tutorial: [
    { wave: 0, text: 'ok so. this is not a real room. it is where the CRUMBS GO when nobody sweeps for a REALLY long time. everything bounces here. i do not make the rules. — me' },
  ],
  challenge: { text: 'Win without losing a single slice', id: 'perfect-cake' },
};

// =========================================================================
// 2. THE DEV ROOM — unlocked by the fridge-poetry magnets secret (save.eggs.fridgeMagnetsSolved).
// A tiny gag level: 5 easy waves, thank-you sticky note. Reward handled specially in game.ts
// (endLevel): +100 BP + the 'found-dev-room' achievement instead of stars (relics are
// Infestation-only, so a unique achievement stands in for "The First Crumb").
// =========================================================================
export const SECRET_DEV_ROOM: LevelDef = {
  id: 'secret-dev',
  name: 'The Dev Room',
  world: 0,
  index: 2,
  blurb: 'A door behind the water heater that was definitely not there before. Concept art on the walls. A sticky note with your name on it. Sort of.',
  theme: 'secret',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 10, rows: 8 },
    { id: 'desk', kind: 'counter', origin: { x: 2, y: 2.8, z: 2 }, cols: 5, rows: 3 },
  ],
  climbs: [
    { from: { s: 0, c: 3, r: 6 }, to: { s: 1, c: 1, r: 2 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 7 }, kind: 'door' },
  ],
  cakeTile: { s: 1, c: 2, r: 1 },
  cakeSlices: 10,
  startCrumbs: 260,
  clutterDeck: ['cereal-i', 'tupper-o'],
  clutterPerWave: 3,
  allowedTowers: ALL_TOWERS,
  waves: [
    { entries: [e('ant-worker', 6, 1.2, 'door')] },
    { entries: [e('ant-worker', 8, 1.0, 'door'), e('fly-house', 2, 2.5, 'door', 3)] },
    { entries: [e('roach', 2, 3.5, 'door'), e('ant-worker', 8, 0.9, 'door', 2)] },
    { entries: [e('ant-soldier', 4, 2.0, 'door'), e('fly-house', 3, 2.0, 'door', 3)] },
    { entries: [e('ant-worker', 10, 0.7, 'door'), e('ant-soldier', 4, 1.8, 'door', 4), e('roach', 3, 3.0, 'door', 8)] },
  ],
  tutorial: [
    { wave: 0, text: 'you found us!! — the dev room. concept art on the walls (mostly cake sketches, one very good gnome). thanks for playing. seriously.' },
  ],
};

// =========================================================================
// 3. THE IMPOSSIBLE ROOM — unlocked after beating sewer-3. Rotating weekly (weeklySeed from
// src/sim/endless.ts, displayed in-UI as "this week's impossible room"). Genuinely brutal:
// condemned-difficulty forced + Director on (game.ts's launcher hardcodes both regardless of the
// player's chosen difficulty), 12 waves of late-game (world 6-9 tier) composition, low
// startCrumbs. Deliberately NOT in any balance suite — see file header.
// =========================================================================
export const SECRET_IMPOSSIBLE: LevelDef = {
  id: 'secret-impossible',
  name: 'The Impossible Room',
  world: 0,
  index: 3,
  blurb: 'A door that was not there yesterday and will not be there tomorrow. This week it wants to talk to you specifically.',
  theme: 'secret',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 16, rows: 12 },
    { id: 'high-shelf', kind: 'shelf', origin: { x: 3, y: 5.0, z: 2 }, cols: 8, rows: 3 },
    { id: 'counter', kind: 'counter', origin: { x: 4, y: 2.8, z: 4 }, cols: 8, rows: 5 },
  ],
  climbs: [
    { from: { s: 0, c: 5, r: 10 }, to: { s: 2, c: 1, r: 4 }, kind: 'climb' },
    { from: { s: 0, c: 12, r: 10 }, to: { s: 2, c: 7, r: 4 }, kind: 'climb' },
    { from: { s: 2, c: 3, r: 0 }, to: { s: 1, c: 2, r: 2 }, kind: 'climb' },
    { from: { s: 0, c: 2, r: 1 }, to: { s: 1, c: 0, r: 0 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 11 }, kind: 'door' },
    { id: 'vent', tile: { s: 0, c: 15, r: 0 }, kind: 'vent' },
    { id: 'drain', tile: { s: 0, c: 15, r: 11 }, kind: 'drain' },
    { id: 'crack', tile: { s: 0, c: 0, r: 0 }, kind: 'crack' },
  ],
  cakeTile: { s: 1, c: 4, r: 1 },
  cakeSlices: 10,
  startCrumbs: 180,
  clutterDeck: ['cereal-i', 'tupper-o', 'books-l', 'pasta-j', 'toolbox-o'],
  clutterPerWave: 3,
  allowedTowers: ALL_TOWERS,
  waves: [
    { entries: [e('centipede-bit', 14, 0.6, 'door'), e('roach-nuclear', 3, 2.2, 'vent', 3)] },
    { entries: [e('rat-knight', 3, 1.6, 'drain'), e('centipede-half', 6, 1.2, 'door', 3)] },
    { entries: [e('beetle', 3, 2.0, 'drain'), e('centipede-bit', 16, 0.5, 'vent', 3)] },
    { entries: [e('wasp-baron', 5, 1.4, 'vent'), e('rat-knight', 3, 1.6, 'door', 4)] },
    { entries: [e('pillbug', 6, 1.4, 'drain'), e('centipede', 3, 1.8, 'door', 4), e('roach-nuclear', 4, 1.9, 'crack', 6)] },
    { entries: [e('hornet', 6, 1.2, 'vent'), e('rat-knight', 4, 1.4, 'door', 3), e('earwig', 5, 1.6, 'crack', 6)] },
    { entries: [e('snail-shaman', 3, 2.4, 'drain'), e('centipede', 4, 1.6, 'door', 4), e('wasp-baron', 5, 1.3, 'vent', 8)] },
    { entries: [e('pigeon', 3, 2.6, 'vent'), e('beetle', 5, 1.6, 'drain', 4), e('centipede-half', 10, 0.8, 'door', 8)] },
    { entries: [e('rat-knight', 6, 1.1, 'door'), e('hornet', 8, 1.0, 'vent', 3), e('roach-nuclear', 6, 1.5, 'crack', 8)] },
    { entries: [e('centipede', 6, 1.2, 'door'), e('pigeon', 3, 2.2, 'vent', 4), e('snail-shaman', 4, 2.0, 'drain', 8)] },
    { entries: [e('grandma-longlegs', 1, 1, 'crack'), e('rat-knight', 6, 1.0, 'door', 4), e('hornet', 8, 0.9, 'vent', 8)] },
    { entries: [e('the-exterminator', 1, 1, 'door'), e('trash-panda-don', 1, 1, 'crack', 4), e('centipede', 6, 1.0, 'vent', 10), e('rat-knight', 8, 0.9, 'drain', 14)] },
  ],
  mutationWaves: [4, 8],
  director: true,
  eventChance: 0.5,
  tutorial: [
    { wave: 0, text: 'this week\'s impossible room. good luck. you\'re gonna need it. — the house, probably. it doesn\'t usually talk. this is new.' },
  ],
  challenge: { text: 'Defeat the room (yes, really)', id: 'clean-victory' },
};

// =========================================================================
// 4. PLAYABLE CREDITS (§20.16) — unlocked by beating sewer-3. 6 gentle waves; every wave's
// tutorial sticky note doubles as rolling credit text. Towers free (startCrumbs 999).
// =========================================================================
export const SECRET_CREDITS: LevelDef = {
  id: 'secret-credits',
  name: 'The Credits',
  world: 0,
  index: 4,
  blurb: 'The house takes a bow. Roll credits — and yes, you may open fire.',
  theme: 'secret',
  surfaces: [
    { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 14, rows: 10 },
    { id: 'counter', kind: 'counter', origin: { x: 3, y: 2.8, z: 3 }, cols: 8, rows: 4 },
  ],
  climbs: [
    { from: { s: 0, c: 4, r: 8 }, to: { s: 1, c: 1, r: 3 }, kind: 'climb' },
    { from: { s: 0, c: 9, r: 8 }, to: { s: 1, c: 6, r: 3 }, kind: 'climb' },
  ],
  spawns: [
    { id: 'door', tile: { s: 0, c: 0, r: 8 }, kind: 'door' },
    { id: 'vent', tile: { s: 0, c: 13, r: 0 }, kind: 'vent' },
  ],
  cakeTile: { s: 1, c: 4, r: 1 },
  cakeSlices: 10,
  startCrumbs: 999,
  clutterDeck: ['cereal-i', 'tupper-o', 'books-l'],
  clutterPerWave: 4,
  allowedTowers: ALL_TOWERS,
  waves: [
    { entries: [e('ant-worker', 10, 0.9, 'door')] },
    { entries: [e('fly-house', 6, 1.6, 'vent'), e('ant-soldier', 4, 1.8, 'door', 3)] },
    { entries: [e('roach', 4, 2.4, 'door'), e('moth', 5, 1.6, 'vent', 3)] },
    { entries: [e('ant-bullet', 8, 1.0, 'door'), e('dust-bunny', 4, 2.2, 'vent', 3)] },
    { entries: [e('snail', 4, 2.2, 'door'), e('ant-worker', 14, 0.6, 'door', 3), e('fly-house', 6, 1.4, 'vent', 6)] },
    { entries: [e('crumb-king', 1, 1, 'door'), e('ant-worker', 10, 1.4, 'door', 8), e('ant-soldier', 4, 3, 'vent', 12)] },
  ],
  tutorial: [
    { wave: 0, text: 'COUNTER ATTACK! — built by the house itself, one wish at a time.' },
    { wave: 1, text: 'thanks to the sponges, the swatters, and every tower that took a hit for the cake. thanks to the ants for the material.' },
    { wave: 2, text: 'thanks to the agents in the walls — codex, sonnet, the whole crew — for the code, the critters, and for not eating the crumbs themselves.' },
    { wave: 3, text: 'no critters were permanently harmed in the making of this game (they respawn, they are fine, they are already planning next wave).' },
    { wave: 4, text: 'thanks to YOU. for playing. for losing on purpose to see the vignette. for coming back anyway.' },
    { wave: 5, text: 'one last wave. one last cake. it was always about the cake. — the house, signing off (for now)' },
  ],
};

export const SECRET_LEVELS: LevelDef[] = [SECRET_CRUMB, SECRET_DEV_ROOM, SECRET_IMPOSSIBLE, SECRET_CREDITS];
