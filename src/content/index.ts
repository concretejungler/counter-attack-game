import type { ContentDB, LevelDef } from '../sim/types';
import { TOWER_DEFS } from './towers';
import { CRITTER_DEFS } from './critters';
import { SHAPE_DEFS } from './clutterShapes';
import { SPELL_DEFS } from './spells';
import { MUTATION_DEFS } from './mutations';
import { EVENT_DEFS } from './events';
import { KITCHEN_LEVELS } from './levels/kitchen';
import { LIVING_LEVELS } from './levels/living';
import { BATHROOM_LEVELS } from './levels/bathroom';
import { BEDROOM_LEVELS } from './levels/bedroom';
import { GARAGE_LEVELS } from './levels/garage';
import { BASEMENT_LEVELS } from './levels/basement';
import { ATTIC_LEVELS } from './levels/attic';
import { BACKYARD_LEVELS } from './levels/backyard';
import { SEWER_LEVELS } from './levels/sewer';
import { SECRET_LEVELS } from './levels/secret';

export const CONTENT: ContentDB = {
  critters: CRITTER_DEFS,
  towers: TOWER_DEFS,
  shapes: SHAPE_DEFS,
  spells: SPELL_DEFS,
  mutations: MUTATION_DEFS,
  events: EVENT_DEFS,
};

/** The 9-world campaign, in play order. Does NOT include SECRET_LEVELS — see that file's header
 *  for why (world 0, excluded from every world-indexed system by construction). */
export const CAMPAIGN_LEVELS: LevelDef[] = [
  ...KITCHEN_LEVELS, ...LIVING_LEVELS, ...BATHROOM_LEVELS, ...BEDROOM_LEVELS,
  ...GARAGE_LEVELS, ...BASEMENT_LEVELS, ...ATTIC_LEVELS, ...BACKYARD_LEVELS, ...SEWER_LEVELS,
];

export { SECRET_LEVELS } from './levels/secret';

/** Every level in the game, campaign + secret (GAME-PROMPT §14 secret list). Content-reference
 *  lints (tests/content.test.ts) intentionally iterate this full list — secret levels must
 *  resolve/pathfind cleanly just like campaign ones. Progression/world-grouping code should use
 *  CAMPAIGN_LEVELS (or worldsGrouped(), which is built from it) instead so secret levels never
 *  leak into the dollhouse grid or world-indexed math. */
export const ALL_LEVELS: LevelDef[] = [...CAMPAIGN_LEVELS, ...SECRET_LEVELS];

export function levelById(id: string): LevelDef {
  const lvl = ALL_LEVELS.find((l) => l.id === id);
  if (!lvl) throw new Error(`unknown level: ${id}`);
  return lvl;
}
