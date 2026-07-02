import type { Critter, CritterDef, GrudgeEntry } from './types';
import type { SimCtx } from './sim';
import { spawnCritter } from './critters';

/**
 * The Grudge System (GAME-PROMPT §2.6). A biter that escapes alive gets a funny
 * name and returns next wave as a crowned mini-elite with a bounty. Escapes stack
 * buffs. Killing a crowned critter settles the grudge for good.
 */

const FIRST_NAMES = [
  'Greg', 'Janet', 'Kevin', 'Doris', 'Nigel', 'Patricia', 'Wesley', 'Beatrice',
  'Chad', 'Mildred', 'Barry', 'Gwendolyn', 'Stuart', 'Ethel', 'Reginald', 'Carol',
  'Dennis', 'Agnes', 'Trevor', 'Hazel', 'Cliff', 'Doreen', 'Norm', 'Ida',
  'Gary', 'Sheila', 'Boris', 'Nadine', 'Lyle', 'Marjorie',
];

const EPITHETS = [
  'the Glutton', 'the Unkillable', 'the Menace', 'the Bold', 'the Sneak',
  'the Relentless', 'the Crumbstealer', 'the Nimble', 'the Dreaded', 'the Lucky',
  'the Ravenous', 'the Slippery', 'the Persistent', 'the Terrible', 'the Swift',
  'the Cake-Cursed', 'the Notorious', 'the Unbothered', 'the Grudgeful', 'the Feared',
  'the Wanted', 'the Legendary', 'the Audacious', 'the Merciless',
];

/** Grudge buff per escape stack, applied to the crowned elite's HP each time it returns. */
export const GRUDGE_HP_PCT_PER_ESCAPE = 0.15;
/** Base bounty + growth per escape (matches GAME-PROMPT: 25 + 20*escapes). */
export const GRUDGE_BASE_BOUNTY = 25;
export const GRUDGE_BOUNTY_PER_ESCAPE = 20;

/** Picks a seeded, level-unique funny name from the table. Falls back to a numbered suffix if exhausted. */
function rollGrudgeName(ctx: SimCtx): string {
  const used = new Set(ctx.state.grudges.map((g) => g.name));
  for (let attempt = 0; attempt < 50; attempt++) {
    const first = ctx.grudgeRng.pick(FIRST_NAMES);
    const epithet = ctx.grudgeRng.pick(EPITHETS);
    const name = `${first} ${epithet}`;
    if (!used.has(name)) return name;
  }
  // exhausted the combination space (extremely long levels) — disambiguate deterministically
  let n = 2;
  let name = `${ctx.grudgeRng.pick(FIRST_NAMES)} ${ctx.grudgeRng.pick(EPITHETS)}`;
  while (used.has(`${name} ${n}`)) n++;
  return `${name} ${n}`;
}

/**
 * Called from critters.ts when a critter that has bitten (bitesDone > 0 or carriedSlice)
 * despawns alive at an exit. Bosses are excluded. Creates a new grudge, or — if this
 * critter was already a crowned elite that escaped again — re-taunts (stacks the buff).
 */
export function onBiterEscaped(ctx: SimCtx, cr: Critter, def: CritterDef): void {
  if (def.boss) return;

  if (cr.crowned) {
    const grudge = ctx.state.grudges.find((g) => g.name === cr.crowned);
    if (grudge) {
      grudge.escapes++;
      grudge.bounty = GRUDGE_BASE_BOUNTY + GRUDGE_BOUNTY_PER_ESCAPE * grudge.escapes;
      grudge.aliveAs = null;
      ctx.emit({ t: 'grudgeBorn', name: grudge.name, def: grudge.def, escapes: grudge.escapes });
      ctx.state.recap.directorNotes.push(`${grudge.name} escaped again — the grudge deepens.`);
      return;
    }
  }

  const name = rollGrudgeName(ctx);
  const grudge: GrudgeEntry = {
    name,
    def: cr.def,
    escapes: 1,
    bounty: GRUDGE_BASE_BOUNTY + GRUDGE_BOUNTY_PER_ESCAPE * 1,
    aliveAs: null,
  };
  ctx.state.grudges.push(grudge);
  ctx.emit({ t: 'grudgeBorn', name: grudge.name, def: grudge.def, escapes: grudge.escapes });
  ctx.state.recap.directorNotes.push(`${grudge.name} escaped — they'll be back.`);
}

/**
 * Called at the start of every wave (sim.ts). Every grudge not currently alive on the
 * board spawns as a crowned elite at a seeded spawn point, buffed by its escape count.
 */
export function spawnGrudges(ctx: SimCtx): void {
  const st = ctx.state;
  if (st.grudges.length === 0 || ctx.level.spawns.length === 0) return;
  for (const grudge of st.grudges) {
    if (grudge.aliveAs !== null && st.critters.has(grudge.aliveAs)) continue;
    const def = ctx.content.critters[grudge.def];
    if (!def) continue;
    const spawn = ctx.grudgeRng.pick(ctx.level.spawns);
    const cr = spawnCritter(ctx, grudge.def, spawn.tile, { elite: true, shinyEligible: false });
    const hpMul = 1 + GRUDGE_HP_PCT_PER_ESCAPE * grudge.escapes;
    cr.maxHp = Math.round(cr.maxHp * hpMul);
    cr.hp = cr.maxHp;
    cr.crowned = grudge.name;
    grudge.aliveAs = cr.id;
    ctx.emit({ t: 'grudgeReturn', name: grudge.name, critterId: cr.id, bounty: grudge.bounty });
  }
}

/**
 * Called from killCritter (critters.ts) when the dying critter is crowned. Awards the
 * grudge bounty as an extra crumb drop, emits grudgeSettled, and removes the entry for good.
 */
export function settleGrudge(ctx: SimCtx, cr: Critter): void {
  if (!cr.crowned) return;
  const idx = ctx.state.grudges.findIndex((g) => g.name === cr.crowned);
  if (idx === -1) return;
  const grudge = ctx.state.grudges[idx];
  ctx.state.grudges.splice(idx, 1);
  ctx.dropCrumbs(cr.pos, cr.surface, grudge.bounty);
  ctx.emit({ t: 'grudgeSettled', name: grudge.name, critterId: cr.id, bounty: grudge.bounty });
}
