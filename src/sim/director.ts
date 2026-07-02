import type { CritterDef, DamageType, LevelDef, SimEvent, WaveDef, WaveEntry } from './types';
import type { SimCtx } from './sim';

/**
 * The Director AI (GAME-PROMPT §13). L4D-style: watches how the player has been playing —
 * tower damage-type spam, sweeping diligence, flier leaks — and augments the NEXT wave with a
 * small counter-composition drawn only from species that already appear somewhere in this
 * level's own waves (never introduces out-of-world species). Augmentation is capped at 25% of
 * the wave's authored hp-mass so it never replaces the hand-tuned par script, only leans on it.
 *
 * Fully inert unless SimOptions.director (or LevelDef.director) is true — the balance harness
 * runs with both false, so director.ts must never be called from sim.ts's default path.
 */

const AUGMENT_HP_CAP_PCT = 0.25;

export interface DirectorTelemetry {
  /** Kills this wave, grouped by the tower's damage type. */
  dmgTypeKills: Partial<Record<DamageType, number>>;
  /** Total sweeps performed (recap.sweeps snapshot at wave start, used to detect zero-sweep waves). */
  sweptThisWave: boolean;
  /** True if a flying critter leaked (bit the cake or escaped alive) during the wave just cleared. */
  flierLeaked: boolean;
  /** Total leaks (any species) during the wave just cleared. */
  leaksThisWave: number;
}

/** Rolling per-level state the Director keeps between waves. Not part of SimState — telemetry only, replayable from recap + events. */
export class DirectorMemory {
  dmgTypeTotals: Partial<Record<DamageType, number>> = {};
  flierLeaksTotal = 0;
  /** True if the wave just cleared saw zero sweep commands (updated by recordWaveTelemetry). */
  noSweepLastWave = false;
  cleanWaveStreak = 0; // waves in a row with zero leaks and at least one sweep
}

/** Species set that legitimately appears somewhere in this level's authored waves — the Director's augmentation pool. */
function worldAppropriateSpecies(ctx: SimCtx, level: LevelDef): string[] {
  const set = new Set<string>();
  for (const w of level.waves) for (const e of w.entries) set.add(e.critter);
  return [...set].filter((id) => ctx.content.critters[id] && !ctx.content.critters[id].boss);
}

/**
 * Ingests the wave just cleared into the running DirectorMemory: damage-type totals from 'hit'
 * events, flier-leak counts from 'leak' events, and sweeping diligence (sweptCount = number of
 * sweep commands issued during that wave, passed by the caller from recap.sweeps deltas).
 */
export function recordWaveTelemetry(ctx: SimCtx, mem: DirectorMemory, waveEvents: SimEvent[], sweptCount: number): void {
  let leaksThisWave = 0;
  for (const e of waveEvents) {
    // 'hit' events carry dmgType per-blow; 'die' does not, so damage-type profiling accrues here.
    if (e.t === 'hit') {
      mem.dmgTypeTotals[e.dmgType] = (mem.dmgTypeTotals[e.dmgType] ?? 0) + e.amount;
    }
    if (e.t === 'leak') {
      leaksThisWave++;
      const def = ctx.content.critters[e.def];
      if (def?.flying) mem.flierLeaksTotal++;
    }
  }
  mem.noSweepLastWave = sweptCount === 0;
  if (leaksThisWave === 0 && sweptCount > 0) mem.cleanWaveStreak++;
  else mem.cleanWaveStreak = 0;
}

/** Dominant damage type this level so far, or null if no clear favorite (needs a real lead to trigger). */
function dominantDmgType(mem: DirectorMemory): DamageType | null {
  const entries = Object.entries(mem.dmgTypeTotals) as [DamageType, number][];
  if (entries.length === 0) return null;
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (total <= 0) return null;
  entries.sort((a, b) => b[1] - a[1]);
  const [topType, topVal] = entries[0];
  return topVal / total >= 0.6 ? topType : null;
}

/** Species in the world pool that resist the given damage type. */
function speciesResisting(ctx: SimCtx, pool: string[], dmgType: DamageType): string[] {
  return pool.filter((id) => ctx.content.critters[id]?.resist === dmgType);
}

function speciesWithCrumbHunger(ctx: SimCtx, pool: string[]): string[] {
  return pool.filter((id) => !!ctx.content.critters[id]?.crumbHunger);
}

function speciesFliers(ctx: SimCtx, pool: string[]): string[] {
  return pool.filter((id) => !!ctx.content.critters[id]?.flying);
}

function hpMassOf(ctx: SimCtx, entries: WaveEntry[]): number {
  let sum = 0;
  for (const e of entries) {
    const def = ctx.content.critters[e.critter];
    if (def) sum += def.hp * e.count;
  }
  return sum;
}

interface AugmentPlan {
  addPool: string[];
  note: string;
  budget: number;
}

/**
 * Deterministic (RNG-free) decision of WHETHER and WHY the Director would augment this wave,
 * and which species pool it would draw from. Split out from the actual species pick so the
 * buildPhase forecast preview can describe the incoming front without burning a directorRng
 * draw that would then desync from the real pick made later at startWave.
 */
function planAugmentation(ctx: SimCtx, level: LevelDef, wave: WaveDef, mem: DirectorMemory): AugmentPlan | null {
  const pool = worldAppropriateSpecies(ctx, level);
  if (pool.length === 0) return null;

  const authoredMass = hpMassOf(ctx, wave.entries);
  if (authoredMass <= 0) return null;
  const budget = authoredMass * AUGMENT_HP_CAP_PCT;

  const dom = dominantDmgType(mem);
  if (dom) {
    const resisters = speciesResisting(ctx, pool, dom);
    if (resisters.length > 0) {
      return { addPool: resisters, budget, note: `You lean hard on ${dom}. The house noticed — something's building a resistance.` };
    }
  }
  if (mem.noSweepLastWave) {
    const hungry = speciesWithCrumbHunger(ctx, pool);
    if (hungry.length > 0) {
      return { addPool: hungry, budget, note: "You haven't been sweeping. Something down there is getting fat off it." };
    }
  }
  if (mem.flierLeaksTotal > 0) {
    const fliers = speciesFliers(ctx, pool);
    if (fliers.length > 0) {
      return { addPool: fliers, budget, note: 'Fliers keep slipping past you. More are coming through the air this time.' };
    }
  }
  if (mem.cleanWaveStreak >= 2) {
    // clean play: mixed probe drawn from the whole world pool
    return { addPool: pool, budget, note: "You've been clean. Here's a little of everything to test that." };
  }
  return null;
}

/**
 * Builds a counter-composition worth <= AUGMENT_HP_CAP_PCT of the wave's authored hp-mass and
 * appends it to `entries` (returns a new WaveDef — the original is never mutated). Returns the
 * augmented WaveDef plus a plain-language director note, or the original wave + null note if
 * there's nothing to add (no telemetry yet, or the world pool has no matching species).
 */
export function augmentWave(
  ctx: SimCtx, level: LevelDef, wave: WaveDef, mem: DirectorMemory, spawnId: string,
): { wave: WaveDef; note: string | null } {
  const plan = planAugmentation(ctx, level, wave, mem);
  if (!plan) return { wave, note: null };

  // Pick one representative species (seeded, on the dedicated directorRng stream so Director
  // augmentation never perturbs the main gameplay RNG sequence balance par-scripts rely on).
  const pick = ctx.directorRng.pick(plan.addPool);
  const def = ctx.content.critters[pick];
  if (!def || def.hp <= 0) return { wave, note: null };
  // Strict cap: if even a single unit of the chosen species would blow the 25% budget, skip the
  // augmentation entirely rather than rounding up to 1 anyway (the mass cap is a hard contract).
  const count = Math.floor(plan.budget / def.hp);
  if (count <= 0) return { wave, note: null };

  const extra: WaveEntry = {
    critter: pick,
    count,
    interval: Math.max(0.4, 1.6 - count * 0.02),
    spawn: spawnId,
    delay: 1,
  };

  return { wave: { entries: [...wave.entries, extra] }, note: plan.note };
}

/**
 * Human-readable weather-report forecast line for the upcoming wave (emitted as a 'forecast'
 * event at buildPhase). RNG-free by design — previews the AUTHORED wave's composition plus
 * whether the Director would augment it, without pre-consuming the actual augmentation pick.
 */
export function forecastText(ctx: SimCtx, level: LevelDef, wave: WaveDef, mem: DirectorMemory | null): string {
  const countsBySpecies = new Map<string, number>();
  for (const e of wave.entries) countsBySpecies.set(e.critter, (countsBySpecies.get(e.critter) ?? 0) + e.count);
  const totalCount = [...countsBySpecies.values()].reduce((a, b) => a + b, 0);
  if (totalCount === 0) return 'Quiet skies. Suspiciously quiet.';

  const entries = [...countsBySpecies.entries()].sort((a, b) => b[1] - a[1]);
  const parts: string[] = [];
  const flierCount = entries
    .filter(([id]) => (ctx.content.critters[id] as CritterDef | undefined)?.flying)
    .reduce((s, [, n]) => s + n, 0);
  if (flierCount > 0) {
    const pct = Math.round((flierCount / totalCount) * 100);
    parts.push(`${pct}% chance of fliers`);
  }
  const [topId, topN] = entries[0];
  const topDef = ctx.content.critters[topId];
  if (topDef) {
    const pct = Math.round((topN / totalCount) * 100);
    parts.push(`${pct >= 60 ? 'Heavy' : 'Scattered'} ${topDef.name.toLowerCase()}s`);
  }
  const plan = mem ? planAugmentation(ctx, level, wave, mem) : null;
  if (plan) parts.push('a front of regret moving in');
  return parts.length > 0 ? parts.join('. ') + '.' : 'Mixed activity expected.';
}
