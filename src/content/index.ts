import type { ContentDB, LevelDef } from '../sim/types';
import { TOWER_DEFS } from './towers';
import { CRITTER_DEFS } from './critters';
import { SHAPE_DEFS } from './clutterShapes';
import { SPELL_DEFS } from './spells';
import { MUTATION_DEFS } from './mutations';
import { KITCHEN_LEVELS } from './levels/kitchen';

export const CONTENT: ContentDB = {
  critters: CRITTER_DEFS,
  towers: TOWER_DEFS,
  shapes: SHAPE_DEFS,
  spells: SPELL_DEFS,
  mutations: MUTATION_DEFS,
};

export const ALL_LEVELS: LevelDef[] = [...KITCHEN_LEVELS];

export function levelById(id: string): LevelDef {
  const lvl = ALL_LEVELS.find((l) => l.id === id);
  if (!lvl) throw new Error(`unknown level: ${id}`);
  return lvl;
}
