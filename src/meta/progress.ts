/**
 * Campaign progression: which levels/worlds are unlocked, star totals, room grouping.
 * Pure functions over ALL_LEVELS + SaveData['stars'] — no new save fields required,
 * since unlock state is fully derivable from stars already keyed by level id.
 */
import { ALL_LEVELS, CONTENT } from '../content';
import type { CritterDef, LevelDef, RoomTheme } from '../sim/types';
import type { SaveData } from './save';

/** The 9 rooms in dollhouse cutaway order: top floor -> bottom -> outside. */
export const ROOM_ORDER: RoomTheme[] = [
  'attic', 'bedroom', 'bathroom', 'living', 'kitchen', 'garage', 'basement', 'backyard', 'sewer',
];

export const ROOM_LABEL: Record<RoomTheme, string> = {
  kitchen: 'The Kitchen',
  living: 'Living Room',
  bathroom: 'The Bathroom',
  bedroom: 'The Bedroom',
  garage: 'The Garage',
  basement: 'The Basement',
  attic: 'The Attic',
  backyard: 'The Backyard',
  sewer: 'The Sewers',
  secret: 'Secret Room',
};

export const ROOM_COLOR: Record<RoomTheme, string> = {
  kitchen: '#ffe8c0',
  living: '#e0d8f0',
  bathroom: '#cfe3ee',
  bedroom: '#f8d0c0',
  garage: '#d8d8d0',
  basement: '#c8c0d8',
  attic: '#f0e0a0',
  backyard: '#cfe6c8',
  sewer: '#b8c8b0',
  secret: '#e8c0e0',
};

/** Levels grouped by world number, in ALL_LEVELS order (already sorted by world). */
export function worldsGrouped(): LevelDef[][] {
  const byWorld = new Map<number, LevelDef[]>();
  for (const lvl of ALL_LEVELS) {
    if (!byWorld.has(lvl.world)) byWorld.set(lvl.world, []);
    byWorld.get(lvl.world)!.push(lvl);
  }
  return [...byWorld.entries()].sort((a, b) => a[0] - b[0]).map(([, levels]) => levels);
}

/** The last level of a world is its boss level (highest `index`). */
export function bossLevelOf(worldLevels: LevelDef[]): LevelDef {
  return worldLevels.reduce((a, b) => (b.index > a.index ? b : a));
}

export function starsFor(save: SaveData, levelId: string): number {
  return save.stars[levelId] ?? 0;
}

export function isLevelWon(save: SaveData, levelId: string): boolean {
  return starsFor(save, levelId) >= 1;
}

/** World 1's first level is always unlocked. A later world's first level unlocks once
 *  the previous world's boss (last/highest-index level) is won. Within a world, level N+1
 *  unlocks once level N is won. */
export function isLevelUnlocked(save: SaveData, level: LevelDef): boolean {
  const worlds = worldsGrouped();
  const worldIdx = worlds.findIndex((w) => w[0].world === level.world);
  if (worldIdx === -1) return false;
  const worldLevels = worlds[worldIdx].slice().sort((a, b) => a.index - b.index);
  const posInWorld = worldLevels.findIndex((l) => l.id === level.id);
  if (posInWorld === 0) {
    if (worldIdx === 0) return true; // kitchen-1 always unlocked
    const prevWorld = worlds[worldIdx - 1];
    return isLevelWon(save, bossLevelOf(prevWorld).id);
  }
  return isLevelWon(save, worldLevels[posInWorld - 1].id);
}

export function isWorldUnlocked(save: SaveData, worldLevels: LevelDef[]): boolean {
  const first = worldLevels.slice().sort((a, b) => a.index - b.index)[0];
  return isLevelUnlocked(save, first);
}

/** The previous room's label, for the "beat <room> first!!" lock scribble. */
export function prerequisiteRoomLabel(worldIdx: number): string | null {
  const worlds = worldsGrouped();
  if (worldIdx <= 0) return null;
  const prev = worlds[worldIdx - 1][0];
  return ROOM_LABEL[prev.theme];
}

/** The furthest-unlocked level across the whole campaign — used to focus the house map
 *  and as the fridge "Play" default target. */
export function furthestUnlockedLevel(save: SaveData): LevelDef {
  let furthest = ALL_LEVELS[0];
  for (const lvl of ALL_LEVELS) {
    if (isLevelUnlocked(save, lvl)) furthest = lvl;
  }
  return furthest;
}

export function totalStars(save: SaveData): number {
  return ALL_LEVELS.reduce((sum, lvl) => sum + starsFor(save, lvl.id), 0);
}

export const MAX_STARS = ALL_LEVELS.length * 3;

// ---------- Critterdex ----------

/** All species, ordered: regular critters (by tier) then bosses last, each in content
 *  registration order within their group — reads like a field-journal table of contents. */
export function critterdexOrder(): CritterDef[] {
  const all = Object.values(CONTENT.critters);
  const regular = all.filter((c) => !c.boss);
  const bosses = all.filter((c) => c.boss);
  return [...regular, ...bosses];
}

export function killCount(save: SaveData, defId: string): number {
  return save.critterdex.kills[defId] ?? 0;
}

export function jarCount(save: SaveData, defId: string): number {
  return save.critterdex.jarred[defId] ?? 0;
}

export function shinyCount(save: SaveData, defId: string): number {
  return save.critterdex.shinySeen[defId] ?? 0;
}

/** A species counts as "seen" (unlocks its journal page) once killed or jarred at least once. */
export function isCritterSeen(save: SaveData, defId: string): boolean {
  return killCount(save, defId) > 0 || jarCount(save, defId) > 0;
}

export function critterdexCompletionPct(save: SaveData): number {
  const order = critterdexOrder();
  if (order.length === 0) return 0;
  const seen = order.filter((c) => isCritterSeen(save, c.id)).length;
  return Math.round((seen / order.length) * 100);
}
