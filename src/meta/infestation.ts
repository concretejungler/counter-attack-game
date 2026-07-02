/**
 * INFESTATION MODE (GAME-PROMPT §15) — the Slay-the-Spire flagship run layer.
 *
 * A pure meta-game module: run generation, node resolution, deck/relic/curse bookkeeping,
 * and the runMods translation the sim consumes. No three.js, no DOM — src/ui/screens.ts
 * renders this state, src/game.ts drives it.
 *
 * File-ownership note: this module imports RNG from src/core/rng.ts (core, not sim — allowed)
 * and level/tower data from src/content (data only, no sim/ systems). It does NOT import from
 * src/sim/sim.ts; game.ts is responsible for constructing the actual Sim with the runMods this
 * module computes.
 *
 * Sim contract: SimOptions.runMods / .preMutations / .allowedTowersOverride landed in
 * src/sim/types.ts (added by a parallel workstream) with the exact shape this module targets —
 * game.ts passes them straight through to `new Sim(...)`, no casts needed. hud.ts remains the
 * sole consumer of allowedTowers-style gating (it only ever reads level.allowedTowers), so
 * game.ts's startInfestationFight constructs the Hud's LevelDef with allowedTowers overridden to
 * the run's deck — see the "allowedTowers?? gate the build bar from the deck" note in the brief.
 */
import { RNG } from '../core/rng';
import { ALL_LEVELS } from '../content';
import type { LevelDef } from '../sim/types';

// ---------- deck ----------

export const STARTER_DECK_CORE = ['sgt-spritz', 'old-smacky', 'stick-rick'];
/** One random 4th starter, rolled once at run creation (kept out of the core 3 so every run's
 *  opening feels a little different without destabilizing the "always have spray+swat+tape"
 *  floor every loadout needs to survive floor 1 node 1). */
const STARTER_POOL_4TH = ['sir-toastsalot', 'big-blow', 'gnomeo', 'the-coldfather'];

export const DECK_MAX = 12;

// ---------- relics ----------

export interface RelicDef {
  id: string;
  name: string;
  item: string;              // the household object it flavors as
  desc: string;
  /** Additive contribution to runMods; multiple relics of the same key sum. */
  mod: Partial<{
    dmgPct: number;
    ratePct: number;
    rangePct: number;
    sellRefundPct: number;
    crumbPct: number;
    cakeSlices: number;
  }>;
  /** UI-only flavor mods not (yet) sim-backed — handled entirely in screens.ts/game.ts. */
  shopDiscountPct?: number;   // Expired Coupons: Garage Sale prices -25% (also makes prices meaner via curse odds — flavor only)
}

export const RELICS: RelicDef[] = [
  {
    id: 'lazy-susan', name: 'Lazy Susan', item: '🌀 turntable',
    desc: 'Every tower fires 12% faster — it never has to fully stop rotating.',
    mod: { ratePct: 0.12 },
  },
  {
    id: 'grandma-cookbook', name: "Grandma's Cookbook", item: '📕 recipe book',
    desc: 'Double butter on everything. +15% tower damage.',
    mod: { dmgPct: 0.15 },
  },
  {
    id: 'good-scissors', name: 'The Good Scissors', item: '✂️ the ones nobody may touch',
    desc: 'Sharpened for war. +18% tower damage.',
    mod: { dmgPct: 0.18 },
  },
  {
    id: 'expired-coupons', name: 'Expired Coupons', item: '🎫 coupon binder',
    desc: 'Garage Sale prices are 25% cheaper. The salesman is not happy about it.',
    mod: {},
    shopDiscountPct: 0.25,
  },
  {
    id: 'lucky-sponge', name: 'Lucky Sponge', item: '🧽 the good sponge',
    desc: 'Found behind the sink. +2 cake slices, right now.',
    mod: { cakeSlices: 2 },
  },
  {
    id: 'extension-cord', name: 'Long Extension Cord', item: '🔌 the orange one',
    desc: 'Every tower reaches 15% further.',
    mod: { rangePct: 0.15 },
  },
  {
    id: 'bulk-warehouse-card', name: 'Bulk Warehouse Card', item: '🪪 membership card',
    desc: 'Selling towers refunds 25% more scrap value.',
    mod: { sellRefundPct: 0.25 },
  },
  {
    id: 'good-tupperware', name: 'The Good Tupperware', item: '🥡 (never returned, never will be)',
    desc: 'Crumbs are worth 15% more — it seals in freshness AND value.',
    mod: { crumbPct: 0.15 },
  },
  {
    id: 'birthday-candle-stub', name: 'Birthday Candle Stub', item: '🕯️ half-melted, one wish left',
    desc: '+1 cake slice, right now. It was going to get thrown out anyway.',
    mod: { cakeSlices: 1 },
  },
  {
    id: 'oven-mitt', name: 'The Good Oven Mitt', item: '🧤 no burns today',
    desc: '+10% tower damage, +5% fire rate — grip like you mean it.',
    mod: { dmgPct: 0.10, ratePct: 0.05 },
  },
  {
    id: 'batteries-not-included', name: '(Batteries Not Included)', item: '🔋 but you found some anyway',
    desc: '+20% fire rate. Somewhere, a remote control weeps.',
    mod: { ratePct: 0.20 },
  },
  {
    id: 'good-china', name: 'The Good China', item: '🍽️ only for guests, apparently',
    desc: '+3 cake slices, right now. Company is coming, might as well use it.',
    mod: { cakeSlices: 3 },
  },
  {
    id: 'costco-membership', name: 'Costco Membership', item: '🛒 the card, laminated',
    desc: 'Crumbs worth +10%, tower damage +8%. Everything in bulk, including violence.',
    mod: { crumbPct: 0.10, dmgPct: 0.08 },
  },
  {
    id: 'sharpened-pencil', name: 'Suspiciously Sharp Pencil', item: '✏️ #2, weaponized',
    desc: '+22% tower damage. Do not ask where it has been.',
    mod: { dmgPct: 0.22 },
  },
];

export const RELICS_BY_ID: Record<string, RelicDef> = Object.fromEntries(RELICS.map((r) => [r.id, r]));

/** Sums a run's relics into the sim-facing runMods bag. cakeSlices is instant-on-pickup (applied
 *  once at grantRelic time, not summed here) — everything else composes additively per §15. */
export function relicsToRunMods(relicIds: string[]): { dmgPct?: number; ratePct?: number; rangePct?: number; sellRefundPct?: number; crumbPct?: number } {
  const out: { dmgPct?: number; ratePct?: number; rangePct?: number; sellRefundPct?: number; crumbPct?: number } = {};
  for (const id of relicIds) {
    const r = RELICS_BY_ID[id];
    if (!r) continue;
    if (r.mod.dmgPct) out.dmgPct = (out.dmgPct ?? 0) + r.mod.dmgPct;
    if (r.mod.ratePct) out.ratePct = (out.ratePct ?? 0) + r.mod.ratePct;
    if (r.mod.rangePct) out.rangePct = (out.rangePct ?? 0) + r.mod.rangePct;
    if (r.mod.sellRefundPct) out.sellRefundPct = (out.sellRefundPct ?? 0) + r.mod.sellRefundPct;
    if (r.mod.crumbPct) out.crumbPct = (out.crumbPct ?? 0) + r.mod.crumbPct;
  }
  return out;
}

/** Aggregate shop discount across all owned relics (Expired Coupons et al), UI-side only. */
export function shopDiscountPct(relicIds: string[]): number {
  let d = 0;
  for (const id of relicIds) d += RELICS_BY_ID[id]?.shopDiscountPct ?? 0;
  return Math.min(0.6, d);
}

// ---------- curses ----------

/** Curses are drafted from elite fights and reuse the campaign's mutation ids (they're
 *  already swarm-buffs — perfect fit per the build brief) — passed as preMutations to every
 *  subsequent fight in the run. */
export const CURSE_POOL = [
  'thick-shells', 'hyper-legs', 'lean-times', 'double-dead', 'gym-membership', 'termite-jaws',
  'top-gun', 'marathon-training', 'armored-airspace', 'crumb-recession', 'false-finale',
  'chewing-union', 'bulk-buy-bodies', 'caffeine-mandibles', 'window-seat-upgrade', 'bad-generation',
];

// ---------- node map ----------

export type NodeKind = 'fight' | 'elite' | 'shop' | 'rest' | 'boss';

export interface NodeDef {
  id: string;                 // unique within the run: `f{floor}n{index}`
  kind: NodeKind;
  floor: 1 | 2 | 3;
  col: number;                // position within the floor's row (0-4)
  levelId?: string;           // fight/elite/boss: which campaign level to launch
  /** Indices (within the SAME floor's node array) reachable from this node. Boss floors funnel
   *  everything into a single final index. */
  next: number[];
  cleared: boolean;
}

const FLOOR_WORLDS: [number, number, number][] = [[1, 2, 3], [4, 5, 6], [7, 8, 9]];

function worldPoolFor(floor: 1 | 2 | 3): { fights: LevelDef[]; boss: LevelDef } {
  const worlds = FLOOR_WORLDS[floor - 1];
  const worldLevels = ALL_LEVELS.filter((l) => worlds.includes(l.world));
  const byWorld = new Map<number, LevelDef[]>();
  for (const l of worldLevels) {
    if (!byWorld.has(l.world)) byWorld.set(l.world, []);
    byWorld.get(l.world)!.push(l);
  }
  const fights: LevelDef[] = [];
  let boss: LevelDef | null = null;
  // The floor's boss is the final world's boss level (highest index in the highest world number
  // present) — matches "the floor's world-boss level" from the brief for a clean run finale.
  const worldNums = [...byWorld.keys()].sort((a, b) => a - b);
  const finalWorld = worldNums[worldNums.length - 1];
  for (const w of worldNums) {
    const levels = byWorld.get(w)!.slice().sort((a, b) => a.index - b.index);
    const worldBoss = levels.reduce((a, b) => (b.index > a.index ? b : a));
    for (const l of levels) {
      if (l.id === worldBoss.id) {
        if (w === finalWorld) boss = l;
        else fights.push(l); // non-final-world bosses still count as normal fight fodder
      } else {
        fights.push(l);
      }
    }
  }
  if (!boss) boss = fights.pop() ?? worldLevels[worldLevels.length - 1];
  return { fights, boss };
}

/** 5-node branching path per floor: node 0 is the single entry, nodes 1-3 are the branching
 *  middle (fight/elite/shop/rest mix), node 4 is the floor boss where every path converges. */
function generateFloor(rng: RNG, floor: 1 | 2 | 3): NodeDef[] {
  const { fights, boss } = worldPoolFor(floor);
  const pick = () => fights[rng.int(0, fights.length - 1)];

  const nodes: NodeDef[] = [];
  // node 0: always a fight (a gentle floor opener).
  nodes.push({ id: `f${floor}n0`, kind: 'fight', floor, col: 0, levelId: pick().id, next: [1, 2], cleared: false });
  // nodes 1-2: one elite, one shop-or-rest — order shuffled per run for variety.
  const midKinds: NodeKind[] = rng.shuffle(['elite', rng.chance(0.5) ? 'shop' : 'rest']);
  nodes.push({
    id: `f${floor}n1`, kind: midKinds[0], floor, col: 1,
    levelId: midKinds[0] === 'elite' || midKinds[0] === 'fight' ? pick().id : undefined,
    next: [3], cleared: false,
  });
  nodes.push({
    id: `f${floor}n2`, kind: midKinds[1], floor, col: 1,
    levelId: midKinds[1] === 'elite' || midKinds[1] === 'fight' ? pick().id : undefined,
    next: [3], cleared: false,
  });
  // node 3: always a fight, funnels both branches together before the boss.
  nodes.push({ id: `f${floor}n3`, kind: 'fight', floor, col: 2, levelId: pick().id, next: [4], cleared: false });
  // node 4: floor boss.
  nodes.push({ id: `f${floor}n4`, kind: 'boss', floor, col: 3, levelId: boss.id, next: [], cleared: false });
  return nodes;
}

export interface RunState {
  seed: number;
  floor: 1 | 2 | 3;
  /** Index into map[floor-1] of the node currently occupied (-1 = not yet departed node 0, i.e.
   *  run just started and node 0 itself is the first playable node). */
  nodeIndex: number;
  map: NodeDef[][];           // 3 floors x 5 nodes
  deck: string[];             // tower ids
  relics: string[];           // relic ids
  curses: string[];           // mutation ids, applied as preMutations to every subsequent fight
  slices: number;             // persists across fights within the run; starts 10
  scraps: number;             // run currency for Garage Sale
  over: boolean;
  won: boolean;                // true = beat floor-3 boss
  /** Recap bookkeeping for the run-over screen. */
  kills: number;
  floorsCleared: number;
}

export function newRun(seed: number): RunState {
  const rng = new RNG(seed);
  const map: NodeDef[][] = [1, 2, 3].map((f) => generateFloor(rng, f as 1 | 2 | 3));
  const starter4th = STARTER_POOL_4TH[rng.int(0, STARTER_POOL_4TH.length - 1)];
  return {
    seed,
    floor: 1,
    nodeIndex: -1,
    map,
    deck: [...STARTER_DECK_CORE, starter4th],
    relics: [],
    curses: [],
    slices: 10,
    scraps: 0,
    over: false,
    won: false,
    kills: 0,
    floorsCleared: 0,
  };
}

/** Nodes reachable right now: node 0 of the current floor if the run hasn't departed yet,
 *  otherwise whatever `.next` of the current node lists (deduped, since floor 1&2's middle
 *  nodes both point at index 3). */
export function reachableNodeIndices(run: RunState): number[] {
  const floorNodes = run.map[run.floor - 1];
  if (run.nodeIndex === -1) return [0];
  const cur = floorNodes[run.nodeIndex];
  return [...new Set(cur.next)];
}

export function currentFloorNodes(run: RunState): NodeDef[] {
  return run.map[run.floor - 1];
}

export function nodeAt(run: RunState, floor: 1 | 2 | 3, index: number): NodeDef {
  return run.map[floor - 1][index];
}

/** Seed for a specific node's fight — derived deterministically from the run seed + floor +
 *  node index so replays of the same run seed always generate the same encounters. */
export function seedForNode(run: RunState, floor: number, nodeIndex: number): number {
  return (run.seed ^ Math.imul(floor + 1, 0x9e3779b1) ^ Math.imul(nodeIndex + 1, 0x85ebca77)) >>> 0;
}

// ---------- draft ----------

const ALL_TOWER_IDS = [
  'sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'stick-rick', 'gnomeo', 'the-coldfather',
  'bandolero', 'vroomba', 'professor-scorch', 'mike-rowave', 'bubbles-laroux', 'saltimus-prime',
  'the-daily-smack', 'lux-interior', 'dj-decibel', 'eau-de-no', 'old-stinky', 'count-blendula',
  'herr-tick-tock', 'alexis', 'audrey-the-third', 'static', 'snappy-and-sons',
];

/** Draft 3 tower options after a fight win, weighted toward towers not already in the deck
 *  (owned towers get a small chance to reappear as a "duplicate for flavor" pick, but the pool
 *  is built unowned-first so drafts stay useful as the deck fills up). */
export function draftOptions(run: RunState, rng: RNG, count = 3): string[] {
  const unowned = ALL_TOWER_IDS.filter((t) => !run.deck.includes(t));
  const owned = ALL_TOWER_IDS.filter((t) => run.deck.includes(t));
  const pool = unowned.length >= count ? unowned : [...unowned, ...owned];
  const shuffled = rng.shuffle(pool);
  const picks: string[] = [];
  for (const t of shuffled) {
    if (picks.length >= count) break;
    if (!picks.includes(t)) picks.push(t);
  }
  return picks;
}

export function addToDeck(run: RunState, towerId: string): void {
  if (run.deck.length >= DECK_MAX) return;
  run.deck.push(towerId);
}

// ---------- shop (Garage Sale) ----------

export const SHOP_PRICES = { towerCard: 40, removeCurse: 60, relic: 80, slices: 30 } as const;

export function shopPrice(run: RunState, key: keyof typeof SHOP_PRICES): number {
  const disc = shopDiscountPct(run.relics);
  return Math.max(5, Math.round(SHOP_PRICES[key] * (1 - disc)));
}

/** Rolls a Garage Sale's wares deterministically from the run seed + node so revisiting the
 *  same seed always sees the same table. */
export function rollShopWares(run: RunState, floor: number, nodeIndex: number): { towerCards: string[]; relicOffer: string | null } {
  const rng = new RNG(seedForNode(run, floor, nodeIndex) ^ 0x53484f50); // 'SHOP'
  const unowned = ALL_TOWER_IDS.filter((t) => !run.deck.includes(t));
  const towerCards = rng.shuffle(unowned.length ? unowned : ALL_TOWER_IDS).slice(0, 3);
  const unownedRelics = RELICS.map((r) => r.id).filter((id) => !run.relics.includes(id));
  const relicOffer = unownedRelics.length ? rng.pick(unownedRelics) : null;
  return { towerCards, relicOffer };
}

// ---------- fight resolution ----------

export function runModsForFight(run: RunState): { dmgPct?: number; ratePct?: number; rangePct?: number; sellRefundPct?: number; crumbPct?: number } {
  return relicsToRunMods(run.relics);
}

/** Rewards paid on a fight win — flat scrap plus a small bonus scaled off cake slices remaining
 *  (rewards clean play without punishing an already-bitten run further). */
export function fightRewardScraps(sim: { cakeSlices: number; cakeMax: number }): number {
  const cleanBonus = sim.cakeMax > 0 ? Math.round(5 * (sim.cakeSlices / sim.cakeMax)) : 0;
  return 30 + cleanBonus;
}

export function isEliteNode(node: NodeDef): boolean {
  return node.kind === 'elite';
}

export function isBossNode(node: NodeDef): boolean {
  return node.kind === 'boss';
}

export function isFinalBoss(run: RunState, node: NodeDef): boolean {
  return node.kind === 'boss' && run.floor === 3;
}

// ---------- daily chores (§16, small bonus scope) ----------

/** Deterministic day number from a timestamp (UTC midnight buckets) — mirrors weeklySeed()'s
 *  "caller sources the wall-clock number, this module stays pure" split in src/sim/endless.ts. */
export function dayNumber(now: number): number {
  return Math.floor(now / 86400000);
}

export interface DailyChore {
  day: number;
  levelId: string;
  mutationId: string;
}

export function dailyChoreFor(now: number): DailyChore {
  const day = dayNumber(now);
  const rng = new RNG((day * 0x1000193) >>> 0);
  const level = rng.pick(ALL_LEVELS.filter((l) => l.id !== 'kitchen-1')); // skip the tutorial level
  const mutationId = rng.pick(CURSE_POOL);
  return { day, levelId: level.id, mutationId };
}
