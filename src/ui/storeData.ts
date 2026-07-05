/**
 * TOWER STORE catalog + LIVE-stat extraction + save-backfill glue (Addendum 2 §2, packet M-2).
 *
 * This file is the single source of truth for the store's *catalog* data (BP prices, kid-voice
 * blurbs, the free STARTER_KIT, and the BELT_LIMITS) AND for the pure helpers that read LIVE stats
 * straight out of the content defs — the store cards NEVER hand-type a damage/rate/range number,
 * they call the extractors here so a balance tweak in src/content/ flows through automatically.
 *
 * Layering note: this module imports ONLY from ../content (a leaf that never imports meta/) and
 * ../sim/types. That keeps it safe to import from BOTH src/meta/save.ts (backfill) and src/ui/*
 * without a dependency cycle. It deliberately does NOT import achievements.ts — BP accounting is
 * done inline (earned - spent) so save.ts -> storeData.ts -> achievements.ts -> save.ts can't form.
 */
import { CONTENT } from '../content';
import type { TowerDef, ClutterShape, SpellDef, DamageType, StatusId } from '../sim/types';

export type StoreCategory = 'tower' | 'block' | 'spell';

/** Belt capacities per category (Addendum 2 §2: 5 towers / 3 blocks / 3 power-ups). */
export const BELT_LIMITS: Record<StoreCategory, number> = { tower: 5, block: 3, spell: 3 };

/** Owned-for-free from the very first boot (Addendum 2 §2). Starter blocks match kitchen-1's deck. */
export const STARTER_KIT: Record<StoreCategory, string[]> = {
  tower: ['sgt-spritz', 'old-smacky'],
  block: ['cereal-i', 'tupper-o'],
  spell: ['lemon-smite'],
};
export const STARTER_KIT_ALL: string[] = [...STARTER_KIT.tower, ...STARTER_KIT.block, ...STARTER_KIT.spell];

/** Kid-voice blurbs + BP prices. Prices are catalog data (hand-authored); STATS are always LIVE
 *  (see the *LiveStats extractors below). A price of 0 means starter-kit / free-to-own. */
interface CatalogEntry { blurb: string; price: number }

const TOWER_CATALOG: Record<string, CatalogEntry> = {
  'sgt-spritz': { price: 0, blurb: 'Squirts bugs super fast. Your trusty first friend!' },
  'old-smacky': { price: 0, blurb: 'WHAP! Big swatter, big knockback. Simple and mean.' },
  'sir-toastsalot': { price: 90, blurb: 'Lobs flaming toast that splashes and burns. Breakfast hurts.' },
  'big-blow': { price: 80, blurb: 'A fan that shoves bugs backward. No damage, all attitude.' },
  'stick-rick': { price: 70, blurb: 'Tape goo on the floor makes everybody walk reeeal slow.' },
  'gnomeo': { price: 100, blurb: 'A creepy gnome bugs love to punch — then he EXPLODES.' },
  'the-coldfather': { price: 240, blurb: 'Chilly fridge aura slows the whole crowd, then cold-blasts them.' },
  'bandolero': { price: 300, blurb: 'Rubber-band sniper. Cross-room shots for the big scary ones.' },
  'vroomba': { price: 180, blurb: 'A little robot that roams around vacuuming tiny bugs and crumbs.' },
  'professor-scorch': { price: 260, blurb: 'Magnifying-glass sunbeam. Melts bugs (and fliers) fast.' },
  'mike-rowave': { price: 280, blurb: 'Slow charge, HUGE blast. Ground bugs get microwaved.' },
  'bubbles-laroux': { price: 150, blurb: 'Bubbles that stun flying bugs. Weak hits, great crowd control.' },
  'saltimus-prime': { price: 160, blurb: 'Salty cone spray that crusts bugs sticky-slow.' },
  'the-daily-smack': { price: 60, blurb: 'Cheap, fast newspaper smacks. A great early shooter.' },
  'lux-interior': { price: 130, blurb: 'A lamp that reveals sneaky bugs and pulses light damage.' },
  'dj-decibel': { price: 190, blurb: 'A boombox that speeds up your towers and beat-stuns bugs.' },
  'eau-de-no': { price: 150, blurb: 'Stinky perfume cloud that confuses bugs into wandering off.' },
  'old-stinky': { price: 140, blurb: 'The Sock. Ages bugs and scares them. Nobody comes close.' },
  'count-blendula': { price: 220, blurb: 'Shreds close bugs into crumb smoothies — extra money!' },
  'herr-tick-tock': { price: 260, blurb: 'A clock that REWINDS nearby bugs back in time. Spooky.' },
  'alexis': { price: 280, blurb: 'Drops heavy boxes on the scary ones and buffs nearby towers.' },
  'audrey-the-third': { price: 180, blurb: 'A biting plant that grows stronger the longer it lives.' },
  'static': { price: 200, blurb: 'A balloon that zaps a bug and the zap JUMPS to its friends.' },
  'snappy-and-sons': { price: 90, blurb: 'Cheap mousetrap. One giant SNAP, then re-arm it.' },
};

const BLOCK_CATALOG: Record<string, CatalogEntry> = {
  'cereal-i': { price: 0, blurb: 'A long cereal box. Basic wall, holds one tower.' },
  'tupper-o': { price: 0, blurb: 'A 2x2 tub — tough, and fits TWO towers on top!' },
  'books-l': { price: 40, blurb: 'An L of books. Bends the path around a corner.' },
  'pasta-j': { price: 45, blurb: 'A J-shaped pasta box for twisty little mazes.' },
  'sponge-s': { price: 35, blurb: 'A squishy S-wall. Cheap, but chews fast.' },
  'spatula-t': { price: 45, blurb: 'A T of utensils. Handy corner piece.' },
  'soap-i': { price: 40, blurb: 'A slippery bar-soap wall. Long and thin.' },
  'toolbox-o': { price: 70, blurb: 'Heavy 2x2 toolbox. Big HP, two tower slots.' },
  'wine-l': { price: 65, blurb: 'A sturdy wine crate corner. Tough L.' },
  'flowerpot-t': { price: 60, blurb: 'A T of flowerpots with two tower slots.' },
  'napkin-i3': { price: 30, blurb: 'A little 3-long napkin stack. Cheap short wall.' },
  'jars-o': { price: 60, blurb: 'A 2x2 of mason jars. Tough, two slots.' },
  'ladder-i': { price: 55, blurb: 'A tall 4-long step-ladder wall.' },
  'shuttle-drawer': { price: 150, blurb: 'A SLIDING drawer that patrols back and forth — ride a tower on it!' },
};

const SPELL_CATALOG: Record<string, CatalogEntry> = {
  'lemon-smite': { price: 0, blurb: 'Zap a spot with citrus lightning. Cheap and quick.' },
  'forbidden-slipper': { price: 60, blurb: "Fling mom's slipper down a whole lane. OW." },
  'moooom': { price: 120, blurb: 'MOOOOM! Her giant hand wipes a whole lane off the map.' },
  'five-second-rule': { price: 55, blurb: 'Freeze EVERYTHING for five whole seconds.' },
  'new-lemon-scent': { price: 45, blurb: 'Scrub the scent meter way down. Instant clean.' },
  'mystery-leftovers': { price: 40, blurb: 'Open the mystery box... treasure? trouble? YES.' },
  'insurance-claim': { price: 70, blurb: 'Paperwork magic repairs your walls and towers.' },
  'static-discharge': { price: 65, blurb: 'Charge your HAND so squishing zaps bugs too.' },
};

// ---------------------------------------------------------------------------
// Canonical id lists (LIVE from CONTENT, so new defs auto-appear in the store).
// Jarred-unique towers (jar-*, cost 0, earned by capture) are NOT buyable/beltable — they place
// through their own jarredStock path, so they're excluded here.
// ---------------------------------------------------------------------------
export function allTowerIds(): string[] {
  return Object.keys(CONTENT.towers).filter((id) => !id.startsWith('jar-') && !id.startsWith('test-'));
}
export function allBlockIds(): string[] {
  return Object.keys(CONTENT.shapes).filter((id) => !id.startsWith('test-'));
}
export function allSpellIds(): string[] {
  return Object.keys(CONTENT.spells).filter((id) => !id.startsWith('test-'));
}
export function allOwnableIds(): string[] {
  return [...allTowerIds(), ...allBlockIds(), ...allSpellIds()];
}

export function categoryOf(id: string): StoreCategory | null {
  if (CONTENT.towers[id] && !id.startsWith('jar-')) return 'tower';
  if (CONTENT.shapes[id]) return 'block';
  if (CONTENT.spells[id]) return 'spell';
  return null;
}

export function catalogFor(id: string): CatalogEntry {
  return TOWER_CATALOG[id] ?? BLOCK_CATALOG[id] ?? SPELL_CATALOG[id] ?? { price: 0, blurb: '' };
}
export function storeItemPrice(id: string): number {
  return catalogFor(id).price;
}
export function storeItemBlurb(id: string): string {
  return catalogFor(id).blurb;
}
export function storeItemName(id: string): string {
  return CONTENT.towers[id]?.name ?? CONTENT.shapes[id]?.name ?? CONTENT.spells[id]?.name ?? id;
}

// ---------------------------------------------------------------------------
// Ownership + purchase (BP accounting, mirrors the Junk Drawer earned-spent ledger inline).
// ---------------------------------------------------------------------------
interface HasBP { browniePoints: { earned: number; spent: number }; store: { owned: string[] } }

export function currentBPInline(save: HasBP): number {
  return save.browniePoints.earned - save.browniePoints.spent;
}
export function ownsStoreItem(save: HasBP, id: string): boolean {
  return save.store.owned.includes(id);
}
export function canBuyStoreItem(save: HasBP, id: string): boolean {
  if (ownsStoreItem(save, id)) return false;
  if (categoryOf(id) === null) return false;
  return currentBPInline(save) >= storeItemPrice(id);
}
/** Spend BP and mark owned. Re-validates so a stale button can never push BP negative. Returns
 *  false (no-op) when unaffordable/already-owned. Caller persists the save. */
export function buyStoreItem(save: HasBP, id: string): boolean {
  if (!canBuyStoreItem(save, id)) return false;
  save.browniePoints.spent += storeItemPrice(id);
  save.store.owned.push(id);
  return true;
}

// ---------------------------------------------------------------------------
// Belt equip/unequip — enforces BELT_LIMITS. equip() returns false when the belt is full (caller
// shows the "belt full" toast) or the item isn't owned.
// ---------------------------------------------------------------------------
interface HasBelts {
  store: { owned: string[]; beltTowers: string[]; beltBlocks: string[]; beltSpells: string[] };
  settings: { quickSpells: string[] };
}
const beltKey = (cat: StoreCategory): 'beltTowers' | 'beltBlocks' | 'beltSpells' =>
  cat === 'tower' ? 'beltTowers' : cat === 'block' ? 'beltBlocks' : 'beltSpells';

export function beltFor(save: HasBelts, cat: StoreCategory): string[] {
  return save.store[beltKey(cat)];
}
export function isEquipped(save: HasBelts, id: string): boolean {
  const cat = categoryOf(id);
  return cat !== null && beltFor(save, cat).includes(id);
}
/** Toggle an owned item on/off its belt. Returns { ok, reason }: ok=false + reason='full' when
 *  trying to equip past the category limit; ok=false + reason='notOwned' when unowned. */
export function toggleBelt(save: HasBelts, id: string): { ok: boolean; reason?: 'full' | 'notOwned' } {
  const cat = categoryOf(id);
  if (cat === null) return { ok: false, reason: 'notOwned' };
  if (!save.store.owned.includes(id)) return { ok: false, reason: 'notOwned' };
  const belt = save.store[beltKey(cat)];
  const idx = belt.indexOf(id);
  if (idx >= 0) {
    belt.splice(idx, 1);
  } else {
    if (belt.length >= BELT_LIMITS[cat]) return { ok: false, reason: 'full' };
    belt.push(id);
  }
  if (cat === 'spell') reconcileQuickSpells(save);
  return { ok: true };
}

/** Mobile quick-spell pins MUST stay a subset of the spell belt (Addendum 2 §2). Drops any pin no
 *  longer on the belt; then tops the trio up from the belt (oldest-first) so a swap never leaves a
 *  gap the player must re-pin by hand. Safe to call after any spell-belt edit. */
export function reconcileQuickSpells(save: HasBelts): void {
  const belt = save.store.beltSpells;
  let qs = save.settings.quickSpells.filter((id) => belt.includes(id));
  for (const id of belt) {
    if (qs.length >= 3) break;
    if (!qs.includes(id)) qs.push(id);
  }
  save.settings.quickSpells = qs;
}

// ---------------------------------------------------------------------------
// Save backfill (called by src/meta/save.ts loadSave when save.store is absent).
// owned = STARTER_KIT ∪ demonstrably-used ids (towerNames keys); veterans (>10 stars) own it all.
// Belts default to the first 5/3/3 owned in each category (catalog order).
// ---------------------------------------------------------------------------
export interface StoreSave {
  owned: string[];
  beltTowers: string[];
  beltBlocks: string[];
  beltSpells: string[];
}

export function defaultStoreSave(): StoreSave {
  return {
    owned: [...STARTER_KIT_ALL],
    beltTowers: [...STARTER_KIT.tower],
    beltBlocks: [...STARTER_KIT.block],
    beltSpells: [...STARTER_KIT.spell],
  };
}

interface BackfillSrc {
  stars?: Record<string, number>;
  towerNames?: Record<string, string>;
}

export function backfillStore(src: BackfillSrc): StoreSave {
  const totalStars = Object.values(src.stars ?? {}).reduce((a, b) => a + (b || 0), 0);
  const veteran = totalStars > 10;

  const towerSet = new Set(allTowerIds());
  let owned: string[];
  if (veteran) {
    owned = allOwnableIds();
  } else {
    // starter kit + any tower the player renamed (towerNames keys) — a demonstrably-used tower.
    const used = Object.keys(src.towerNames ?? {}).filter((id) => towerSet.has(id));
    owned = [...new Set([...STARTER_KIT_ALL, ...used])];
  }

  const towerOrder = allTowerIds();
  const blockOrder = allBlockIds();
  const spellOrder = allSpellIds();
  const ownedSet = new Set(owned);
  const ownedInOrder = (order: string[]): string[] => order.filter((id) => ownedSet.has(id));

  return {
    owned,
    beltTowers: ownedInOrder(towerOrder).slice(0, BELT_LIMITS.tower),
    beltBlocks: ownedInOrder(blockOrder).slice(0, BELT_LIMITS.block),
    beltSpells: ownedInOrder(spellOrder).slice(0, BELT_LIMITS.spell),
  };
}

/** Repair a partially-present store bag (e.g. a save written by an older M-2 build, or one whose
 *  belts reference no-longer-owned/renamed ids). Idempotent; keeps existing choices where valid. */
export function sanitizeStore(store: Partial<StoreSave> | undefined, src: BackfillSrc): StoreSave {
  if (!store || !Array.isArray(store.owned) || store.owned.length === 0) return backfillStore(src);
  const owned = [...new Set(store.owned.filter((id) => categoryOf(id) !== null))];
  // ensure the starter kit is always owned (never strippable)
  for (const id of STARTER_KIT_ALL) if (!owned.includes(id)) owned.push(id);
  const ownedSet = new Set(owned);
  const clean = (belt: string[] | undefined, cat: StoreCategory): string[] => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const id of belt ?? []) {
      if (categoryOf(id) === cat && ownedSet.has(id) && !seen.has(id)) { seen.add(id); out.push(id); }
    }
    return out.slice(0, BELT_LIMITS[cat]);
  };
  let beltTowers = clean(store.beltTowers, 'tower');
  let beltBlocks = clean(store.beltBlocks, 'block');
  let beltSpells = clean(store.beltSpells, 'spell');
  // never leave a category's belt empty if the player owns something for it
  const fill = (belt: string[], order: string[], cat: StoreCategory): string[] => {
    if (belt.length > 0) return belt;
    return order.filter((id) => ownedSet.has(id)).slice(0, BELT_LIMITS[cat]);
  };
  beltTowers = fill(beltTowers, allTowerIds(), 'tower');
  beltBlocks = fill(beltBlocks, allBlockIds(), 'block');
  beltSpells = fill(beltSpells, allSpellIds(), 'spell');
  return { owned, beltTowers, beltBlocks, beltSpells };
}

// ===========================================================================
// LIVE stat extraction — reads straight from the content defs (never hand-typed).
// ===========================================================================
export const DMG_TYPE_ICON: Record<DamageType, string> = {
  spray: '💦', swat: '💥', zap: '⚡', heat: '🔥', cold: '❄️', gas: '☁️', sonic: '🔊', light: '☀️',
};
const STATUS_LABEL: Record<StatusId, string> = {
  burnt: 'burn', soaked: 'soak', frozen: 'freeze', sticky: 'stick', stunned: 'stun',
  confused: 'confuse', feared: 'fear', buttered: 'slip', shrunk: 'shrink',
};
const ATTACK_LABEL: Record<string, string> = {
  projectile: 'shoots', beam: 'beam', cone: 'cone spray', slam: 'melee slam',
  aura: 'aura', trap: 'one-shot trap', push: 'pushback', none: 'decoy',
};

export interface TowerLiveStats {
  dmg: number; rate: number; range: number;
  dmgType: DamageType; dmgIcon: string;
  attack: string; attackLabel: string;
  /** short kid-legible "what's special about it" phrase built from def flags (aoe/status/extra). */
  special: string;
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

export function towerLiveStats(id: string): TowerLiveStats | null {
  const def = CONTENT.towers[id] as TowerDef | undefined;
  if (!def) return null;
  const t0 = def.tiers[0];
  const tags: string[] = [];
  if (def.attack === 'none') tags.push('taunt decoy → explodes');
  else if (def.attack === 'trap') tags.push('one-shot trap');
  else if (def.attack === 'aura' || def.attack === 'beam' || def.attack === 'cone' || def.attack === 'push') {
    tags.push(ATTACK_LABEL[def.attack]);
  }
  if (def.status) tags.push(`${STATUS_LABEL[def.status.id]}${def.status.chance ? ` ${pct(def.status.chance)}` : ''}`);
  const ex = t0.extra ?? {};
  if (ex.slowPct) tags.push(`slow ${pct(ex.slowPct)}`);
  if (ex.chainCount) tags.push(`chains ${ex.chainCount}`);
  if (ex.decoyHp) tags.push(`${ex.decoyHp} hp decoy`);
  if (ex.reveal) tags.push('reveals hidden');
  if (ex.buffRatePct) tags.push(`+${pct(ex.buffRatePct)} ally rate`);
  if (ex.buffDmgPct) tags.push(`+${pct(ex.buffDmgPct)} ally dmg`);
  if (ex.autoSweep) tags.push('auto-sweeps crumbs');
  if (ex.smoothiePct) tags.push(`+${pct(ex.smoothiePct)} crumbs`);
  if (ex.rewindSec) tags.push(`rewinds ${ex.rewindSec}s`);
  if (ex.agePct) tags.push(`grows +${pct(ex.agePct)}/wave`);
  if (ex.roam) tags.push('roams the floor');
  if (def.aoe) tags.push(`splash ${def.aoe}`);
  if (def.knockback) tags.push(`knockback ${def.knockback}`);
  if (def.hitsAir && !def.groundOnly) tags.push('hits air');
  if (def.groundOnly) tags.push('ground only');
  return {
    dmg: t0.dmg, rate: t0.rate, range: t0.range,
    dmgType: def.dmgType, dmgIcon: DMG_TYPE_ICON[def.dmgType],
    attack: def.attack, attackLabel: ATTACK_LABEL[def.attack] ?? def.attack,
    special: tags.slice(0, 3).join(' · '),
  };
}

export interface BlockLiveStats {
  cells: [number, number][]; cols: number; rows: number;
  hp: number; mountSlots: number;
  patrol: { range: number; speed: number; pause: number } | null;
}
export function blockLiveStats(id: string): BlockLiveStats | null {
  const def = CONTENT.shapes[id] as ClutterShape | undefined;
  if (!def) return null;
  const cols = Math.max(...def.cells.map((c) => c[0])) + 1;
  const rows = Math.max(...def.cells.map((c) => c[1])) + 1;
  return {
    cells: def.cells, cols, rows,
    hp: def.hp, mountSlots: def.mountSlots,
    patrol: def.patrol ?? null,
  };
}

export interface SpellLiveStats {
  cost: number; cooldown: number; kind: SpellDef['kind']; power: number; radius: number | null;
  effect: string;
}
export function spellLiveStats(id: string): SpellLiveStats | null {
  const def = CONTENT.spells[id] as SpellDef | undefined;
  if (!def) return null;
  let effect: string;
  switch (def.kind) {
    case 'bolt': effect = `${def.power} dmg${def.radius ? ` · ${def.radius} radius` : ''}`; break;
    case 'lane': effect = `${def.power} dmg down a whole lane`; break;
    case 'momHand': effect = 'wipes an entire lane clean'; break;
    case 'timestop': effect = `freezes everything for ${def.power}s`; break;
    case 'cleanse': effect = 'scrubs the scent meter down'; break;
    case 'gamble': effect = 'random treasure — or trouble!'; break;
    case 'repair': effect = 'repairs walls + towers'; break;
    case 'handBuff': effect = `hand zaps bugs for ${def.power}s`; break;
    default: effect = '';
  }
  return { cost: def.cost, cooldown: def.cooldown, kind: def.kind, power: def.power, radius: def.radius ?? null, effect };
}
