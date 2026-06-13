import type { LevelDef, CritterDef, TowerDef, ClutterShape, SpellDef, MutationDef, ContentDB } from '../src/sim/types';

/** 8x8 single floor surface. Spawn at (1,1), cake at (6,6). */
export function tinyLevel(overrides: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 'test-tiny',
    name: 'Test Tiny',
    world: 0,
    index: 0,
    blurb: 'test',
    theme: 'kitchen',
    surfaces: [
      { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 8, rows: 8 },
    ],
    climbs: [],
    spawns: [{ id: 'door', tile: { s: 0, c: 1, r: 1 }, kind: 'door' }],
    cakeTile: { s: 0, c: 6, r: 6 },
    cakeSlices: 10,
    startCrumbs: 100,
    clutterDeck: ['box-i', 'box-l'],
    clutterPerWave: 3,
    waves: [
      { entries: [{ critter: 'test-ant', count: 3, interval: 0.5, spawn: 'door', delay: 0 }] },
      { entries: [{ critter: 'test-ant', count: 5, interval: 0.4, spawn: 'door', delay: 0 }] },
    ],
    ...overrides,
  };
}

/** Floor 10x10 plus a 4x4 counter at height 3, connected by one climb at floor(5,2)->counter(0,0). Cake on counter (3,3). */
export function twoSurfaceLevel(overrides: Partial<LevelDef> = {}): LevelDef {
  return {
    id: 'test-two',
    name: 'Test Two Surfaces',
    world: 0,
    index: 1,
    blurb: 'test',
    theme: 'kitchen',
    surfaces: [
      { id: 'floor', kind: 'floor', origin: { x: 0, y: 0, z: 0 }, cols: 10, rows: 10 },
      { id: 'counter', kind: 'counter', origin: { x: 2, y: 3, z: 12 }, cols: 4, rows: 4 },
    ],
    climbs: [{ from: { s: 0, c: 5, r: 2 }, to: { s: 1, c: 0, r: 0 }, kind: 'climb' }],
    spawns: [{ id: 'door', tile: { s: 0, c: 0, r: 9 }, kind: 'door' }],
    cakeTile: { s: 1, c: 3, r: 3 },
    cakeSlices: 10,
    startCrumbs: 100,
    clutterDeck: ['box-i'],
    clutterPerWave: 3,
    waves: [{ entries: [{ critter: 'test-ant', count: 2, interval: 1, spawn: 'door', delay: 0 }] }],
    ...overrides,
  };
}

export const TEST_CRITTERS: Record<string, CritterDef> = {
  'test-ant': {
    id: 'test-ant', name: 'Test Ant', tier: 1, hp: 10, speed: 2, size: 0.25,
    bounty: 5, bites: 1, resist: null, weak: null, desc: 'test',
  },
  'test-tank': {
    id: 'test-tank', name: 'Test Tank', tier: 3, hp: 200, speed: 1, size: 0.6,
    bounty: 25, bites: 2, resist: 'swat', weak: 'heat', armor: 2, desc: 'test',
  },
  'test-fly': {
    id: 'test-fly', name: 'Test Fly', tier: 1, hp: 8, speed: 3, size: 0.25,
    bounty: 4, bites: 1, resist: null, weak: null, flying: true, traits: ['dodgeFirst'], desc: 'test',
  },
  'test-thief': {
    id: 'test-thief', name: 'Test Thief', tier: 2, hp: 20, speed: 3, size: 0.45,
    bounty: 15, bites: 0, resist: null, weak: null, traits: ['thief'], desc: 'test',
  },
  'test-roach': {
    id: 'test-roach', name: 'Test Roach', tier: 2, hp: 40, speed: 1.8, size: 0.4,
    bounty: 10, bites: 1, resist: 'swat', weak: 'gas', traits: ['playDead'], desc: 'test',
  },
  'test-eater': {
    id: 'test-eater', name: 'Test Eater', tier: 1, hp: 10, speed: 2, size: 0.25,
    bounty: 5, bites: 1, resist: null, weak: null, crumbHunger: 10, evolveTo: 'test-tank', desc: 'test',
  },
};

export const TEST_TOWERS: Record<string, TowerDef> = {
  'test-gun': {
    id: 'test-gun', name: 'Test Gun', item: 'Gun', role: 'single target',
    dmgType: 'spray', attack: 'projectile', targeting: 'first',
    tiers: [
      { cost: 50, dmg: 5, rate: 2, range: 3 },
      { cost: 40, dmg: 9, rate: 2.2, range: 3.2 },
      { cost: 80, dmg: 15, rate: 2.5, range: 3.5 },
    ],
    branches: [
      { id: 'acid', name: 'Acid', desc: 'adds burn', cost: 100, mod: { burnDps: 4, burnDur: 2 } },
      { id: 'pressure', name: 'Pressure', desc: 'adds knockback', cost: 100, mod: { knockback: 1.2 } },
    ],
    hitsAir: true,
    projSpeed: 12,
    desc: 'test', barks: ['pew'],
  },
  'test-swatter': {
    id: 'test-swatter', name: 'Test Swatter', item: 'Swatter', role: 'melee aoe',
    dmgType: 'swat', attack: 'slam', targeting: 'close',
    tiers: [
      { cost: 70, dmg: 12, rate: 0.8, range: 1.5 },
      { cost: 60, dmg: 20, rate: 0.9, range: 1.6 },
      { cost: 110, dmg: 32, rate: 1.0, range: 1.8 },
    ],
    branches: [],
    knockback: 0.8,
    aoe: 1.2,
    groundOnly: true,
    desc: 'test', barks: ['smack'],
  },
  'test-trap': {
    id: 'test-trap', name: 'Test Trap', item: 'Mousetrap', role: 'one-shot trap',
    dmgType: 'swat', attack: 'trap', targeting: 'close',
    tiers: [
      { cost: 30, dmg: 50, rate: 1, range: 0.45 },
      { cost: 25, dmg: 90, rate: 1, range: 0.5 },
      { cost: 50, dmg: 150, rate: 1, range: 0.55 },
    ],
    branches: [],
    groundOnly: true,
    desc: 'test', barks: ['snap'],
  },
  'test-freezer': {
    id: 'test-freezer', name: 'Test Freezer', item: 'Fridge', role: 'slow aura',
    dmgType: 'cold', attack: 'aura', targeting: 'close',
    tiers: [
      { cost: 90, dmg: 0, rate: 1, range: 2.5, extra: { slowPct: 0.3 } },
      { cost: 70, dmg: 1, rate: 1, range: 2.8, extra: { slowPct: 0.4 } },
      { cost: 120, dmg: 2, rate: 1, range: 3.2, extra: { slowPct: 0.5 } },
    ],
    branches: [],
    hitsAir: true,
    desc: 'test', barks: ['brr'],
  },
};

export const TEST_SPELLS: Record<string, SpellDef> = {
  'test-bolt': {
    id: 'test-bolt', name: 'Test Bolt', cost: 20, cooldown: 5,
    kind: 'bolt', power: 30, radius: 1.5, desc: 'test',
  },
  'test-lane': {
    id: 'test-lane', name: 'Test Lane', cost: 40, cooldown: 12,
    kind: 'lane', power: 80, radius: 1.0, desc: 'test',
  },
};

export const TEST_MUTATIONS: Record<string, MutationDef> = {
  'mut-hp': { id: 'mut-hp', name: 'Thick Shells', desc: 'all +50% hp', mod: { allHpPct: 0.5 } },
  'mut-speed': { id: 'mut-speed', name: 'Hyper Legs', desc: 'all +30% speed', mod: { allSpeedPct: 0.3 } },
  'mut-bounty': { id: 'mut-bounty', name: 'Lean Times', desc: '-20% bounty', mod: { bountyPct: -0.2 } },
};

export function testContent(): ContentDB {
  return {
    critters: TEST_CRITTERS,
    towers: TEST_TOWERS,
    shapes: TEST_SHAPES,
    spells: TEST_SPELLS,
    mutations: TEST_MUTATIONS,
  };
}

export const TEST_SHAPES: Record<string, ClutterShape> = {
  'box-i': { id: 'box-i', name: 'Box I', cells: [[0, 0], [1, 0], [2, 0], [3, 0]], hp: 60, mountSlots: 1, look: 'cereal' },
  'box-l': { id: 'box-l', name: 'Box L', cells: [[0, 0], [0, 1], [0, 2], [1, 2]], hp: 60, mountSlots: 1, look: 'book' },
  'box-o': { id: 'box-o', name: 'Box O', cells: [[0, 0], [1, 0], [0, 1], [1, 1]], hp: 80, mountSlots: 1, look: 'tupper' },
};
