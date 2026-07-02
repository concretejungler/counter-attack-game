import type { CritterDef, LevelDef, WaveDef, WaveEntry } from './types';
import type { SimCtx } from './sim';

/**
 * Pantry Panic — Endless mode (GAME-PROMPT §16). Fully inert unless SimOptions.endless is true.
 * When the level's authored waves run out, nextEndlessWave() procedurally generates the next
 * WaveDef and play continues forever until loss. Scent/mutation systems keep working — sim.ts
 * reuses the existing mutationOffer path every ENDLESS_MUTATION_EVERY-th generated wave.
 *
 * All randomness here MUST come from ctx.endlessRng (a dedicated stream, seed^'ENDL') — never
 * ctx.rng, which the ~40 hand-tuned campaign balance par-scripts depend on staying byte-stable.
 * This file never reads the wall clock and never uses the browser's non-deterministic random
 * source — weeklySeed() takes its timestamp as a plain numeric parameter; the caller (outside
 * src/sim) is responsible for sourcing it.
 */

export const ENDLESS_GROWTH_PCT = 0.12;   // hp-mass budget growth per generated wave (compounding)
export const ENDLESS_MIN_INTERVAL = 0.25; // floor for spawn intervals as waves tighten
export const ENDLESS_ELITE_EVERY = 5;     // every 5th generated wave: elite wave
export const ENDLESS_BOSS_EVERY = 10;     // every 10th generated wave: full boss wave
export const ENDLESS_MUTATION_EVERY = 5;  // every 5th generated wave: mutation draft offer
const ENDLESS_ELITE_MINIBOSS_HP_PCT = 0.4; // mini-boss base hp fraction at depth 1, before depth scaling

/** hp-mass of a set of wave entries (species hp * count * hpMul), mirrors director.ts's hpMassOf. */
function hpMassOf(ctx: SimCtx, entries: WaveEntry[]): number {
  let sum = 0;
  for (const e of entries) {
    const def = ctx.content.critters[e.critter];
    if (def) sum += def.hp * e.count * (e.hpMul ?? 1);
  }
  return sum;
}

/** Non-boss species that appear in this level's own authored waves — the "home" pool. */
function levelSpecies(ctx: SimCtx, level: LevelDef): string[] {
  const set = new Set<string>();
  for (const w of level.waves) for (const e of w.entries) set.add(e.critter);
  return [...set].filter((id) => {
    const def = ctx.content.critters[id];
    return !!def && !def.boss;
  });
}

/** Every non-boss species in the entire content roster. */
function allNonBossSpecies(ctx: SimCtx): string[] {
  return Object.values(ctx.content.critters).filter((d) => !d.boss).map((d) => d.id);
}

/** Every boss species in the content roster. */
function allBossSpecies(ctx: SimCtx): string[] {
  return Object.values(ctx.content.critters).filter((d) => d.boss).map((d) => d.id);
}

/**
 * Draw pool for a generated wave at the given depth (1-based: the wave currently being built is
 * generated wave number `depth`). Early depths lean on the level's own world species; the pool
 * broadens to the entire non-boss roster as depth increases, fully broad by depth 10.
 */
function drawPool(ctx: SimCtx, level: LevelDef, depth: number): string[] {
  const home = levelSpecies(ctx, level);
  const all = allNonBossSpecies(ctx);
  if (home.length === 0) return all;
  const broadenT = Math.min(1, Math.max(0, (depth - 1) / 9));
  const extraSlots = Math.round(broadenT * all.length);
  if (extraSlots <= 0) return home;
  // deterministic broadened pool (no RNG spent here, so pool composition never desyncs picks):
  // home species always present, plus a depth-scaled slice of the full roster.
  const rest = all.filter((id) => !home.includes(id));
  return [...home, ...rest.slice(0, Math.min(extraSlots, rest.length))];
}

/** hp-mass budget for generated wave `depth` (1-based): grows ENDLESS_GROWTH_PCT per wave, compounding, off the last authored wave's mass. */
export function budgetForDepth(ctx: SimCtx, level: LevelDef, depth: number): number {
  const lastAuthored = level.waves[level.waves.length - 1];
  const baseMass = Math.max(1, hpMassOf(ctx, lastAuthored?.entries ?? []));
  return baseMass * Math.pow(1 + ENDLESS_GROWTH_PCT, depth);
}

/** Spawn interval for generated wave `depth`: tightens with depth, floored at ENDLESS_MIN_INTERVAL. */
function intervalForDepth(depth: number): number {
  return Math.max(ENDLESS_MIN_INTERVAL, 1.4 - depth * 0.04);
}

/**
 * Fills wave entries by drawing species from `pool`, spending the hp-mass budget across a small
 * number of picks (never more than opts.maxPicks entries) so generated waves stay readable.
 */
function fillByBudget(
  ctx: SimCtx, pool: string[], budget: number, interval: number, spawnId: string, rng: SimCtx['endlessRng'],
  opts: { minTier?: number; maxPicks?: number } = {},
): WaveEntry[] {
  const candidates = pool
    .map((id) => ctx.content.critters[id])
    .filter((d): d is CritterDef => !!d && d.hp > 0 && (opts.minTier === undefined || d.tier >= opts.minTier));
  if (candidates.length === 0) return [];

  const entries: WaveEntry[] = [];
  let remaining = budget;
  let delay = 0;
  const maxPicks = opts.maxPicks ?? 24;
  let guard = 0; // safety: bounds iterations so a pathological tiny-budget/huge-hp roster can't loop forever
  while (remaining > 0 && entries.length < maxPicks && guard < 200) {
    guard++;
    const def = rng.pick(candidates);
    const sliceBudget = Math.max(def.hp, remaining / Math.max(1, maxPicks - entries.length));
    const cnt = Math.max(1, Math.min(40, Math.floor(sliceBudget / def.hp)));
    const spent = cnt * def.hp;
    if (spent > remaining && entries.length > 0) break; // don't blow the budget once we have at least one entry
    entries.push({ critter: def.id, count: cnt, interval, spawn: spawnId, delay });
    remaining -= spent;
    delay += 0.6;
  }
  return entries;
}

/**
 * Generates the next endless wave. `index` is the 1-based count of generated waves so far
 * (the wave this call produces is generated wave number `index`; the first call past authored
 * waves passes index=1). Every ENDLESS_ELITE_EVERY-th generated wave is an elite wave (fewer,
 * beefier: tier 3-4 heavy plus a mini-boss at ENDLESS_ELITE_MINIBOSS_HP_PCT hp scaling with depth,
 * via WaveEntry.hpMul — sim.ts's wave-spawn call site applies it post-spawn). Every
 * ENDLESS_BOSS_EVERY-th generated wave is a full boss wave.
 */
export function nextEndlessWave(ctx: SimCtx, level: LevelDef, index: number): WaveDef {
  const spawnId = level.spawns[0]?.id ?? '';
  const budget = budgetForDepth(ctx, level, index);
  const interval = intervalForDepth(index);
  const rng = ctx.endlessRng;
  const depthScale = Math.pow(1 + ENDLESS_GROWTH_PCT, index);

  if (index > 0 && index % ENDLESS_BOSS_EVERY === 0) {
    const bosses = allBossSpecies(ctx);
    if (bosses.length > 0) {
      const pick = rng.pick(bosses);
      const def = ctx.content.critters[pick];
      const bossCount = def ? Math.max(1, Math.min(3, Math.floor(budget / def.hp))) : 1;
      const bossEntries: WaveEntry[] = [
        { critter: pick, count: bossCount, interval: Math.max(interval, 3), spawn: spawnId, delay: 1 },
      ];
      // light escort so full boss waves aren't eerily empty (drawn from the broadened pool).
      const escortPool = drawPool(ctx, level, index);
      bossEntries.push(...fillByBudget(ctx, escortPool, budget * 0.15, interval, spawnId, rng, { maxPicks: 6 }));
      return { entries: bossEntries };
    }
  }

  if (index > 0 && index % ENDLESS_ELITE_EVERY === 0) {
    // elite wave: fewer, beefier — tier 3-4 heavy plus a mini-boss.
    const pool = drawPool(ctx, level, index);
    let heavy = fillByBudget(ctx, pool, budget * 0.7, Math.max(interval, 0.8), spawnId, rng, { minTier: 3, maxPicks: 6 });
    if (heavy.length === 0) {
      heavy = fillByBudget(ctx, pool, budget * 0.7, Math.max(interval, 0.8), spawnId, rng, { maxPicks: 6 });
    }
    const entries = [...heavy];
    const bosses = allBossSpecies(ctx);
    if (bosses.length > 0) {
      const pick = rng.pick(bosses);
      entries.push({
        critter: pick, count: 1, interval: 1, spawn: spawnId, delay: 2,
        hpMul: ENDLESS_ELITE_MINIBOSS_HP_PCT * depthScale,
      });
    }
    return { entries };
  }

  // regular generated wave.
  const pool = drawPool(ctx, level, index);
  const entries = fillByBudget(ctx, pool, budget, interval, spawnId, rng, { maxPicks: 24 });
  return { entries };
}

const MS_PER_DAY = 86400000;

/**
 * Civil (Gregorian) year/month/day from a day count since the epoch (1970-01-01 = day 0).
 * Howard Hinnant's `civil_from_days` algorithm — pure integer arithmetic, no calendar-object
 * usage at all, so this stays completely wall-clock-free by construction (sim.ts never reads the
 * clock itself; the shell passes a timestamp in).
 */
function civilFromDays(z: number): { y: number; m: number; d: number } {
  z += 719468;
  const era = (z >= 0 ? z : z - 146096) / 146097 | 0;
  const doe = z - era * 146097;
  const yoe = (doe - (doe / 1460 | 0) + (doe / 36524 | 0) - (doe / 146096 | 0)) / 365 | 0;
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + (yoe / 4 | 0) - (yoe / 100 | 0));
  const mp = (5 * doy + 2) / 153 | 0;
  const d = doy - ((153 * mp + 2) / 5 | 0) + 1;
  const m = mp + (mp < 10 ? 3 : -9);
  return { y: y + (m <= 2 ? 1 : 0), m, d };
}

/** Day count since the epoch for a given civil date (inverse of civilFromDays). */
function daysFromCivil(y: number, m: number, d: number): number {
  const yy = y - (m <= 2 ? 1 : 0);
  const era = (yy >= 0 ? yy : yy - 399) / 400 | 0;
  const yoe = yy - era * 400;
  const mp = (m + 9) % 12;
  const doy = ((153 * mp + 2) / 5 | 0) + d - 1;
  const doe = yoe * 365 + (yoe / 4 | 0) - (yoe / 100 | 0) + doy;
  return era * 146097 + doe - 719468;
}

/**
 * Pure ISO-week seed derivation from a passed-in timestamp (ms since epoch). Deliberately
 * implemented with integer day arithmetic instead of a calendar-object API, matching the sim-wide
 * rule that nothing under src/sim reads the wall clock — the shell/UI passes `now` in (e.g. its
 * own reading of the current instant, taken once at menu time) so the weekly leaderboard seed
 * changes exactly once per ISO week, deterministically, everywhere this function is called.
 */
export function weeklySeed(now: number): number {
  const dayNumber = Math.floor(now / MS_PER_DAY);
  // ISO weekday: epoch day 0 (1970-01-01) was a Thursday (iso weekday 4).
  const isoWeekday = ((dayNumber + 3) % 7 + 7) % 7 + 1; // 1=Mon..7=Sun
  const thursdayDay = dayNumber - isoWeekday + 4; // Thursday of this ISO week uniquely fixes the ISO year
  const { y: isoYear } = civilFromDays(thursdayDay);
  const jan4Day = daysFromCivil(isoYear, 1, 4);
  const jan4Weekday = ((jan4Day + 3) % 7 + 7) % 7 + 1;
  const week1MondayDay = jan4Day - jan4Weekday + 1;
  const isoWeek = Math.floor((thursdayDay - week1MondayDay) / 7) + 1;
  // fold year+week into a 32-bit seed, XOR-mixed with the 'ENDL' tag so it lands in the same
  // family as the other dedicated RNG streams without colliding with any single-seed campaign run.
  const raw = (isoYear * 100 + isoWeek) >>> 0;
  return (raw ^ 0x454e_444c) >>> 0;
}
