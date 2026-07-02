/**
 * Achievements (GAME-PROMPT §18: "150+, many with riddle names" — we ship ~40 to start,
 * same scoping call the BUILDLOG P3 hooks note made). Defs are pure predicates evaluated
 * against a stats snapshot; nothing here touches src/sim/ — it only reads SaveData (already
 * updated by game.ts before evaluation) plus an optional per-level result for level-end-only
 * conditions (bites taken, pet used, challenge met, etc).
 *
 * Two evaluation points (both driven from game.ts, never from sim/):
 *  - `evaluateLevelEnd()` — called once right after a level's stats are folded into `save`
 *    (so achievement checks see the POST-level totals) — covers tiers/milestones/win-flavor
 *    achievements.
 *  - Event-driven ones (first jar, first grudge settled, first shiny, fly shooed) are checked
 *    individually inline in game.ts's handleEvents switch via `checkSingle()`, right at the
 *    moment the relevant SimEvent arrives — cheaper than re-scanning all ~40 defs every tick
 *    and keeps the "first X" achievements feeling instant.
 */
import type { CAMPAIGN_LEVELS as CampaignLevelsType } from '../content';
import { CAMPAIGN_LEVELS } from '../content';
import type { SaveData } from './save';
import { totalStars, MAX_STARS, critterdexCompletionPct } from './progress';

export interface LevelResult {
  won: boolean;
  bites: number;                 // cake slices lost this run
  stars: number;                 // 0-3 stars just earned (post-max with previous best)
  challengeMet: boolean;
  pet: 'cat' | 'dog' | 'goldfish' | null;
  difficulty: SaveData['settings']['difficulty'];
  world: number;
}

export interface AchievementCtx {
  save: SaveData;
  levelResult?: LevelResult;
}

export interface AchievementDef {
  id: string;
  name: string;                  // riddle-flavored per §18
  desc: string;                  // the "answer" / flavor text
  bp: number;                    // Brownie Points paid on unlock
  check: (ctx: AchievementCtx) => boolean;
}

function worldFullyWon(save: SaveData, world: number): boolean {
  const levels = (CAMPAIGN_LEVELS as typeof CampaignLevelsType).filter((l) => l.world === world);
  return levels.length > 0 && levels.every((l) => (save.stars[l.id] ?? 0) >= 1);
}

export const ACHIEVEMENT_DEFS: AchievementDef[] = [
  // ---------- win-count / world-clear tiers ----------
  {
    id: 'first-blood',
    name: 'The First Crumb Falls',
    desc: 'Win your first level.',
    bp: 10,
    check: ({ save }) => save.stats.wins >= 1,
  },
  {
    id: 'world-1-clear',
    name: "What's Cookin'?",
    desc: 'Clear every level in The Kitchen.',
    bp: 20,
    check: ({ save }) => worldFullyWon(save, 1),
  },
  {
    id: 'world-2-clear',
    name: 'Couch Potato No More',
    desc: 'Clear every level in the Living Room.',
    bp: 20,
    check: ({ save }) => worldFullyWon(save, 2),
  },
  {
    id: 'world-3-clear',
    name: 'Squeaky Clean',
    desc: 'Clear every level in the Bathroom.',
    bp: 20,
    check: ({ save }) => worldFullyWon(save, 3),
  },
  {
    id: 'world-4-clear',
    name: "Nighty Night, Bugs",
    desc: 'Clear every level in the Bedroom.',
    bp: 20,
    check: ({ save }) => worldFullyWon(save, 4),
  },
  {
    id: 'world-5-clear',
    name: 'Parked Permanently',
    desc: 'Clear every level in the Garage.',
    bp: 25,
    check: ({ save }) => worldFullyWon(save, 5),
  },
  {
    id: 'world-6-clear',
    name: 'Down Where It\'s Damp',
    desc: 'Clear every level in the Basement.',
    bp: 25,
    check: ({ save }) => worldFullyWon(save, 6),
  },
  {
    id: 'world-7-clear',
    name: 'Dust Bunny Landlord',
    desc: 'Clear every level in the Attic.',
    bp: 25,
    check: ({ save }) => worldFullyWon(save, 7),
  },
  {
    id: 'world-8-clear',
    name: 'Touch Grass (Defend It Instead)',
    desc: 'Clear every level in the Backyard.',
    bp: 30,
    check: ({ save }) => worldFullyWon(save, 8),
  },
  {
    id: 'world-9-clear',
    name: 'Down the Drain',
    desc: 'Clear every level in the Sewers.',
    bp: 40,
    check: ({ save }) => worldFullyWon(save, 9),
  },
  {
    id: 'all-40-levels',
    name: 'Pest Free (Almost)',
    desc: 'Win every level in the campaign.',
    bp: 100,
    check: ({ save }) => (CAMPAIGN_LEVELS as typeof CampaignLevelsType).every((l) => (save.stars[l.id] ?? 0) >= 1),
  },
  {
    id: 'golden-jar-stars',
    name: 'Every Star in the Sky',
    desc: 'Earn all 3 stars on every level.',
    bp: 150,
    check: ({ save }) => totalStars(save) >= MAX_STARS,
  },

  // ---------- kill tiers ----------
  {
    id: 'kills-100',
    name: 'A Rounding Error, To Them',
    desc: 'Squish 100 critters, lifetime.',
    bp: 10,
    check: ({ save }) => save.stats.kills >= 100,
  },
  {
    id: 'kills-1000',
    name: 'The House Remembers',
    desc: 'Squish 1,000 critters, lifetime.',
    bp: 30,
    check: ({ save }) => save.stats.kills >= 1000,
  },
  {
    id: 'kills-10000',
    name: 'A Genocide, Technically',
    desc: 'Squish 10,000 critters, lifetime.',
    bp: 75,
    check: ({ save }) => save.stats.kills >= 10000,
  },

  // ---------- sweep tiers ----------
  {
    id: 'sweeps-100',
    name: 'A Tidy Start',
    desc: 'Sweep crumbs 100 times, lifetime.',
    bp: 10,
    check: ({ save }) => save.stats.sweeps >= 100,
  },
  {
    id: 'sweeps-1000',
    name: 'Married to the Dustpan',
    desc: 'Sweep crumbs 1,000 times, lifetime.',
    bp: 30,
    check: ({ save }) => save.stats.sweeps >= 1000,
  },
  {
    id: 'sweeps-5000',
    name: 'The Floor Has Never Been Cleaner',
    desc: 'Sweep crumbs 5,000 times, lifetime.',
    bp: 60,
    check: ({ save }) => save.stats.sweeps >= 5000,
  },

  // ---------- stars / challenge ----------
  {
    id: 'first-3-star',
    name: 'The Overachiever',
    desc: 'Earn 3 stars on any one level.',
    bp: 15,
    check: ({ save }) => Object.values(save.stars).some((s) => s >= 3),
  },
  {
    id: 'no-bite-win',
    name: 'Not Even a Nibble',
    desc: 'Win a level without losing a single cake slice.',
    bp: 20,
    check: ({ save }) => save.stats.winsNoBite > 0,
  },

  // ---------- jars / grudges / shinies (also event-driven via checkSingle, see game.ts) ----------
  {
    id: 'first-jar',
    name: 'Gotta Catch a Few',
    desc: 'Jar your first critter.',
    bp: 15,
    check: ({ save }) => save.stats.jarsTotal >= 1,
  },
  {
    id: 'jars-10',
    name: 'The Shelf Is Getting Full',
    desc: 'Jar 10 critters, lifetime.',
    bp: 30,
    check: ({ save }) => save.stats.jarsTotal >= 10,
  },
  {
    id: 'jars-25',
    name: 'A Whole Curio Cabinet',
    desc: 'Jar 25 critters, lifetime.',
    bp: 50,
    check: ({ save }) => save.stats.jarsTotal >= 25,
  },
  {
    id: 'first-grudge-settled',
    name: 'Score Settled',
    desc: 'Defeat your first named grudge elite.',
    bp: 15,
    check: ({ save }) => save.stats.grudgesSettled >= 1,
  },
  {
    id: 'grudges-5',
    name: 'The Vendetta Collector',
    desc: 'Settle 5 grudges, lifetime.',
    bp: 35,
    check: ({ save }) => save.stats.grudgesSettled >= 5,
  },
  {
    id: 'first-shiny',
    name: 'Ears Perk Up',
    desc: 'Spot your first shiny critter.',
    bp: 15,
    check: ({ save }) => Object.values(save.critterdex.shinySeen).some((n) => n > 0),
  },
  {
    id: 'critterdex-half',
    name: 'Halfway to the Golden Jar',
    desc: 'Fill in 50% of the Critterdex.',
    bp: 40,
    check: ({ save }) => critterdexCompletionPct(save) >= 50,
  },
  {
    id: 'critterdex-full',
    name: 'The Golden Jar',
    desc: 'Fill in 100% of the Critterdex — see (and jar) every species.',
    bp: 100,
    check: ({ save }) => critterdexCompletionPct(save) >= 100,
  },

  // ---------- pet wins ----------
  {
    id: 'win-with-cat',
    name: "Princess Destructo's Blessing",
    desc: 'Win a level with the cat.',
    bp: 15,
    check: ({ save }) => save.stats.winsByPet.cat > 0,
  },
  {
    id: 'win-with-dog',
    name: "Sir Barksalot's Approval",
    desc: 'Win a level with the dog.',
    bp: 15,
    check: ({ save }) => save.stats.winsByPet.dog > 0,
  },
  {
    id: 'win-with-goldfish',
    name: "The Oracle Approves",
    desc: 'Win a level with the goldfish.',
    bp: 15,
    check: ({ save }) => save.stats.winsByPet.goldfish > 0,
  },
  {
    id: 'win-all-pets',
    name: 'A House Full of Chaos',
    desc: 'Win a level with the cat, the dog, AND the goldfish.',
    bp: 40,
    check: ({ save }) => save.stats.winsByPet.cat > 0 && save.stats.winsByPet.dog > 0 && save.stats.winsByPet.goldfish > 0,
  },

  // ---------- difficulty ----------
  {
    id: 'condemned-win',
    name: 'This House Should Not Stand',
    desc: 'Win a level on Condemned difficulty.',
    bp: 50,
    check: ({ save }) => save.stats.winsCondemned > 0,
  },

  // ---------- spells ----------
  {
    id: 'moooom-1',
    name: 'MOOOOM!!',
    desc: 'Cast the MOOOOM! spell for the first time.',
    bp: 10,
    check: ({ save }) => save.stats.moooomCasts >= 1,
  },
  {
    id: 'moooom-10',
    name: 'She Has Stopped Answering',
    desc: 'Cast the MOOOOM! spell 10 times, lifetime.',
    bp: 30,
    check: ({ save }) => save.stats.moooomCasts >= 10,
  },

  // ---------- misc / event-driven UI gags ----------
  {
    id: 'fly-shooed',
    name: 'Wax On',
    desc: 'Shoo the fly for good.',
    bp: 10,
    check: ({ save }) => save.flyShooed,
  },
  {
    id: 'losses-10',
    name: "The House Always... Doesn't",
    desc: 'Lose the same level 10 times (the game leaves you a sticky note).',
    bp: 10,
    check: ({ save }) => save.stats.losses >= 10,
  },
  {
    id: 'crumbs-10000',
    name: 'Hoarder, Technically',
    desc: 'Bank 10,000 crumbs, lifetime.',
    bp: 25,
    check: ({ save }) => save.stats.crumbsBanked >= 10000,
  },
  {
    id: 'crumbs-100000',
    name: 'The Crumb Economy, Personified',
    desc: 'Bank 100,000 crumbs, lifetime.',
    bp: 60,
    check: ({ save }) => save.stats.crumbsBanked >= 100000,
  },
  {
    id: 'perfect-run',
    name: 'Flawless Household',
    desc: 'Win a level while meeting its bonus challenge AND losing zero slices.',
    bp: 25,
    check: ({ levelResult }) => !!(levelResult?.won && levelResult.bites === 0 && levelResult.challengeMet),
  },
  {
    id: 'world-3-star',
    name: 'The Completionist Room',
    desc: 'Earn 3 stars on every level in a single world.',
    bp: 45,
    check: ({ save }) =>
      [1, 2, 3, 4, 5, 6, 7, 8, 9].some((w) =>
        (CAMPAIGN_LEVELS as typeof CampaignLevelsType).filter((l) => l.world === w).every((l) => (save.stars[l.id] ?? 0) >= 3),
      ),
  },
  {
    id: 'towers-owned-most',
    name: 'A Well-Stocked Junk Drawer',
    desc: 'Purchase 4 Junk Drawer unlocks.',
    bp: 40,
    check: ({ save }) => save.junkDrawer.length >= 4,
  },
  {
    id: 'renamed-toaster',
    name: 'He Has Opinions Now',
    desc: 'Rename the toaster "Talkie."',
    bp: 10,
    check: ({ save }) => (save.towerNames['sir-toastsalot'] ?? '').trim().toLowerCase() === 'talkie',
  },

  // ---------- easter eggs (§20) ----------
  {
    id: 'balloon-pop-1',
    name: 'Gotcha',
    desc: 'Pop the red balloon that drifts past the window.',
    bp: 10,
    check: ({ save }) => save.stats.balloonsPopped >= 1,
  },
  {
    id: 'balloon-pop-100',
    name: 'Monkey Business',
    desc: 'Pop 100 red balloons, lifetime.',
    bp: 40,
    check: ({ save }) => save.stats.balloonsPopped >= 100,
  },

  // ---------- secret levels (§14, §20.9, §20.16) ----------
  {
    id: 'found-dev-room',
    name: 'Knock Knock',
    desc: 'Find and beat the Dev Room.',
    bp: 25,
    check: ({ save }) => save.secrets.foundDevRoom,
  },
  {
    id: 'impossible',
    name: 'Are You Human?',
    desc: 'Beat the Impossible Room. Sub-1% clear rate by design — this one is not a bluff.',
    bp: 200,
    check: ({ save }) => save.secrets.impossibleCleared,
  },
];

export const ACHIEVEMENTS_BY_ID: Record<string, AchievementDef> = Object.fromEntries(
  ACHIEVEMENT_DEFS.map((a) => [a.id, a]),
);

export function isUnlocked(save: SaveData, id: string): boolean {
  return save.achievements.includes(id);
}

/** Evaluate every achievement not yet unlocked against the given ctx; returns newly-unlocked
 *  defs (caller persists save + awards BP + shows toasts — kept UI-agnostic here). Mutates
 *  save.achievements + save.browniePoints.earned directly since every call site immediately
 *  persists anyway (mirrors the mutate-then-persistSave pattern used throughout game.ts). */
export function evaluateAchievements(ctx: AchievementCtx): AchievementDef[] {
  const unlocked: AchievementDef[] = [];
  for (const def of ACHIEVEMENT_DEFS) {
    if (isUnlocked(ctx.save, def.id)) continue;
    if (def.check(ctx)) {
      ctx.save.achievements.push(def.id);
      ctx.save.browniePoints.earned += def.bp;
      unlocked.push(def);
    }
  }
  return unlocked;
}

/** Evaluate a single achievement by id (event-driven ones — first jar, first grudge settled,
 *  first shiny, fly shooed — checked inline in game.ts at the moment the triggering SimEvent
 *  arrives, rather than waiting for the next level-end sweep). Returns the def if newly
 *  unlocked, else null. Safe to call even if the id doesn't exist (returns null). */
export function evaluateSingle(id: string, ctx: AchievementCtx): AchievementDef | null {
  const def = ACHIEVEMENTS_BY_ID[id];
  if (!def || isUnlocked(ctx.save, id)) return null;
  if (!def.check(ctx)) return null;
  ctx.save.achievements.push(def.id);
  ctx.save.browniePoints.earned += def.bp;
  return def;
}

// ---------- The Junk Drawer (§18 permanent unlock tree) ----------
export interface JunkDrawerItem {
  id: string;
  name: string;
  desc: string;
  cost: number;
  requires?: string;              // another JunkDrawerItem id that must be owned first
  /** Sim-affecting unlocks feed metaModsFromSave() in progress.ts; cosmetic ones are UI-only
   *  (no sim field) and are simply checked with `save.junkDrawer.includes(id)` wherever the
   *  cosmetic is rendered — kept out of src/sim/ entirely per the file-ownership split. */
  kind: 'sim' | 'cosmetic';
}

export const JUNK_DRAWER_ITEMS: JunkDrawerItem[] = [
  {
    id: 'fourth-flick',
    name: 'Fourth Flick',
    desc: 'The Hand gets a 4th flick charge (base is 3).',
    cost: 150,
    kind: 'sim',
  },
  {
    id: 'static-battery',
    name: 'Static Battery',
    desc: '+25 max Static Charge (mana) for spells.',
    cost: 120,
    kind: 'sim',
  },
  {
    id: 'allowance',
    name: 'Allowance',
    desc: '+10% starting crumbs on every level.',
    cost: 200,
    kind: 'sim',
  },
  {
    id: 'bigger-allowance',
    name: 'Bigger Allowance',
    desc: 'Another +10% starting crumbs (stacks with Allowance).',
    cost: 400,
    requires: 'allowance',
    kind: 'sim',
  },
  {
    id: 'corkboard-skin-blue',
    name: 'Blue Gingham Corkboard',
    desc: 'Cosmetic HUD skin — recolors the build-bar trim blue gingham.',
    cost: 40,
    kind: 'cosmetic',
  },
  {
    id: 'corkboard-skin-mint',
    name: 'Mint Chip Corkboard',
    desc: 'Cosmetic HUD skin — recolors the build-bar trim mint.',
    cost: 40,
    kind: 'cosmetic',
  },
  {
    id: 'candle-count-99',
    name: '"99th" Birthday Candle',
    desc: 'Cosmetic — the cake HUD shows a joke 99-candle count instead of the real one.',
    cost: 25,
    kind: 'cosmetic',
  },
  {
    id: 'sparkle-title',
    name: 'Sparkle Title Screen',
    desc: 'Cosmetic — adds a subtle sparkle shimmer to the fridge title letters.',
    cost: 60,
    kind: 'cosmetic',
  },
];

export const JUNK_DRAWER_BY_ID: Record<string, JunkDrawerItem> = Object.fromEntries(
  JUNK_DRAWER_ITEMS.map((i) => [i.id, i]),
);

export function isPurchased(save: SaveData, id: string): boolean {
  return save.junkDrawer.includes(id);
}

export function currentBP(save: SaveData): number {
  return save.browniePoints.earned - save.browniePoints.spent;
}

export function canAfford(save: SaveData, item: JunkDrawerItem): boolean {
  if (isPurchased(save, item.id)) return false;
  if (item.requires && !isPurchased(save, item.requires)) return false;
  return currentBP(save) >= item.cost;
}

/** Purchases an item, deducting BP and marking it owned. Returns false (no-op) if unaffordable
 *  or prerequisites aren't met — callers should check canAfford() first for UI state but this
 *  re-validates so nothing can go negative via a stale button. */
export function purchase(save: SaveData, id: string): boolean {
  const item = JUNK_DRAWER_BY_ID[id];
  if (!item || !canAfford(save, item)) return false;
  save.browniePoints.spent += item.cost;
  save.junkDrawer.push(id);
  return true;
}
