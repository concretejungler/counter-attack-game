import type { PetState, TileRef, Tower } from './types';
import type { SimCtx } from './sim';
import { killCritter } from './critters';

/**
 * Pets (GAME-PROMPT §9), simplified to a shippable core. Fully inert unless SimOptions.pet is
 * set (constructor default undefined = no pet). All pet randomness draws from the dedicated
 * `petRng` stream (seeded seed^'PETS', same pattern as shinyRng/grudgeRng in sim.ts) so a pet
 * pick never perturbs the main gameplay RNG sequence the balance par-scripts depend on.
 *
 * Cats lounge and occasionally SWAT a tower; once per level they POUNCE if the board is crowded.
 * Dogs BARK to stun the board but tax crumb drops. Goldfish are a passive full-wave-preview oracle.
 */

const CAT_SWAT_CHANCE = 0.2;          // per waveStart (GAME-PROMPT §9: "20% chance")
const CAT_SWAT_DISABLE_SECONDS = 5;
const CAT_POUNCE_MIN_ALIVE = 12;
const CAT_POUNCE_KILL_PCT = 0.3;
const DOG_BARK_MIN_ALIVE = 8;
const DOG_BARK_COOLDOWN = 30;
const DOG_BARK_STUN_SECONDS = 2;
const DOG_CRUMB_TAX_PCT = 0.15;

/** Seeded floor tile the cat/goldfish can occupy — falls back to (0,0) on surface 0 if the roll never lands. */
function randomFloorTile(ctx: SimCtx): TileRef {
  const floor = ctx.grid.surfaces[0];
  if (floor) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const c = ctx.petRng.int(0, floor.def.cols - 1);
      const r = ctx.petRng.int(0, floor.def.rows - 1);
      const t: TileRef = { s: 0, c, r };
      if (!ctx.grid.isStaticBlocked(t)) return t;
    }
  }
  return { s: 0, c: 0, r: 0 };
}

/** Constructs the initial PetState for a fresh level, or null if SimOptions.pet is unset. */
export function initPet(ctx: SimCtx, id: 'cat' | 'dog' | 'goldfish'): PetState {
  let tile: TileRef;
  if (id === 'dog') {
    // sits near the cake's climb base — same surface as the cake, floor tile closest to it if the
    // cake itself lives on the floor, otherwise just the cake's own tile projected onto surface 0.
    tile = ctx.level.cakeTile.s === 0 ? ctx.level.cakeTile : { s: 0, c: 0, r: 0 };
  } else {
    tile = randomFloorTile(ctx);
  }
  const pos = ctx.grid.worldOf(tile);
  return { id, pos, surface: tile.s, mood: 'idle', cooldown: 0, pounced: false };
}

/** Relocates the cat to a new seeded sunbeam. Called at every buildPhase (cat only). */
export function relocateCat(ctx: SimCtx): void {
  const pet = ctx.state.pet;
  if (!pet || pet.id !== 'cat') return;
  const tile = randomFloorTile(ctx);
  const pos = ctx.grid.worldOf(tile);
  pet.pos = pos;
  pet.surface = tile.s;
  ctx.emit({ t: 'petMove', at: { ...pos } });
}

/** True if `at` is a legal spot to drop a downed tower onto bare floor (mirrors hand.ts's carry-drop trap-placement legality). */
function isLegalFloorDrop(ctx: SimCtx, at: TileRef): boolean {
  if (!ctx.grid.inBounds(at)) return false;
  if (ctx.grid.isStaticBlocked(at) || ctx.grid.isClutter(at)) return false;
  const same = (a: TileRef, b: TileRef) => a.s === b.s && a.c === b.c && a.r === b.r;
  if (same(at, ctx.level.cakeTile)) return false;
  if (ctx.level.spawns.some((sp) => same(sp.tile, at))) return false;
  for (const other of ctx.state.towers.values()) {
    if (other.mountClutter === null && same(other.tile, at)) return false;
  }
  return true;
}

/** Adjacent (4-neighbor) legal floor tiles to `tile`, in deterministic order. */
function adjacentLegalTiles(ctx: SimCtx, tile: TileRef): TileRef[] {
  const candidates: TileRef[] = [
    { s: tile.s, c: tile.c + 1, r: tile.r },
    { s: tile.s, c: tile.c - 1, r: tile.r },
    { s: tile.s, c: tile.c, r: tile.r + 1 },
    { s: tile.s, c: tile.c, r: tile.r - 1 },
  ];
  return candidates.filter((t) => isLegalFloorDrop(ctx, t));
}

/** Disables `tw` for CAT_SWAT_DISABLE_SECONDS and, if a legal adjacent tile exists, knocks it there (off its clutter mount). */
function swatTower(ctx: SimCtx, tw: Tower): void {
  tw.disabled = Math.max(tw.disabled, CAT_SWAT_DISABLE_SECONDS);
  const curTile = tw.tile;
  const options = adjacentLegalTiles(ctx, curTile);
  if (options.length > 0) {
    const dest = ctx.petRng.pick(options);
    if (tw.mountClutter !== null) {
      const old = ctx.state.clutter.get(tw.mountClutter);
      if (old) old.mounted = old.mounted.filter((m) => m !== tw.id);
    }
    const base = ctx.grid.worldOf(dest);
    tw.tile = dest;
    tw.pos = { x: base.x, y: base.y, z: base.z };
    tw.mountClutter = null;
    tw.downed = false;
    ctx.emit({ t: 'towerDropped', id: tw.id, at: { ...tw.pos } });
  }
  ctx.emit({ t: 'petSwat', towerId: tw.id });
}

/** Princess Destructo: called at every waveStart (sim.ts). 20% chance to swat a seeded random tower. */
function catWaveStart(ctx: SimCtx): void {
  const towers = [...ctx.state.towers.values()].filter((tw) => !tw.carried);
  if (towers.length === 0) return;
  if (!ctx.petRng.chance(CAT_SWAT_CHANCE)) return;
  const target = ctx.petRng.pick(towers);
  swatTower(ctx, target);
}

/**
 * Princess Destructo: once per LEVEL, if >=12 critters are alive, POUNCE — kills a seeded 30% of
 * live critters, then swats whichever tower has racked up the most kills ("eye contact"). Checked
 * every tick while the pet is a cat and hasn't pounced yet this level.
 */
function catPounceCheck(ctx: SimCtx): void {
  const pet = ctx.state.pet;
  if (!pet || pet.id !== 'cat' || pet.pounced) return;
  const alive = [...ctx.state.critters.values()];
  if (alive.length < CAT_POUNCE_MIN_ALIVE) return;
  pet.pounced = true;
  pet.mood = 'active';

  const killCount = Math.round(alive.length * CAT_POUNCE_KILL_PCT);
  // Seeded pick without replacement: shuffle then take the first N — deterministic per petRng draw.
  const victims = ctx.petRng.shuffle(alive).slice(0, killCount);
  for (const cr of victims) {
    if (ctx.state.critters.has(cr.id)) killCritter(ctx, cr, 'spell');
  }
  ctx.emit({ t: 'petPounce', kills: victims.length });

  // eye contact: swat whichever tower has the highest kill count so far.
  let best: Tower | null = null;
  for (const tw of ctx.state.towers.values()) {
    if (tw.carried) continue;
    if (!best || tw.kills > best.kills) best = tw;
  }
  if (best) swatTower(ctx, best);
}

/** Sir Barksalot: BARK when >=8 critters alive and off cooldown — stuns everyone 2s. Ticked every frame (dog only). */
function dogBarkCheck(ctx: SimCtx, dt: number): void {
  const pet = ctx.state.pet;
  if (!pet || pet.id !== 'dog') return;
  if (pet.cooldown > 0) {
    pet.cooldown = Math.max(0, pet.cooldown - dt);
    if (pet.cooldown === 0) pet.mood = 'idle';
    return;
  }
  const alive = [...ctx.state.critters.values()];
  if (alive.length < DOG_BARK_MIN_ALIVE) return;
  pet.cooldown = DOG_BARK_COOLDOWN;
  pet.mood = 'active';
  let stunned = 0;
  for (const cr of alive) {
    const cur = cr.statuses.stunned ?? 0;
    cr.statuses.stunned = Math.max(cur, DOG_BARK_STUN_SECONDS);
    stunned++;
  }
  ctx.emit({ t: 'petBark', stunned });
}

/** Sir Barksalot's downside: eats 15% of each crumb drop's value before it lands. Called from Sim.dropCrumbs. */
export function dogCrumbTax(ctx: SimCtx, value: number): number {
  if (ctx.state.pet?.id !== 'dog') return value;
  return Math.max(0, value - Math.floor(value * DOG_CRUMB_TAX_PCT));
}

/** The Oracle: emits the full next-wave composition as a petProphecy event. Called at every buildPhase (goldfish only). */
export function oracleProphecy(ctx: SimCtx, waveIndex: number): void {
  const pet = ctx.state.pet;
  if (!pet || pet.id !== 'goldfish') return;
  const wave = ctx.level.waves[waveIndex];
  if (!wave) return;
  const counts = new Map<string, number>();
  for (const e of wave.entries) counts.set(e.critter, (counts.get(e.critter) ?? 0) + e.count);
  const composition = [...counts.entries()].map(([critter, count]) => ({ critter, count }));
  ctx.emit({ t: 'petProphecy', wave: waveIndex, composition });
}

/** Per-tick pet update: cat pounce watch + dog bark watch. Called from Sim.tick() when a pet is active. */
export function updatePet(ctx: SimCtx, dt: number): void {
  if (!ctx.state.pet) return;
  catPounceCheck(ctx);
  dogBarkCheck(ctx, dt);
}

/** Called at every waveStart (sim.ts) when a pet is active — cat's swat roll. */
export function petOnWaveStart(ctx: SimCtx): void {
  if (ctx.state.pet?.id === 'cat') catWaveStart(ctx);
}

/** Called at every buildPhase (sim.ts) when a pet is active — cat relocates, goldfish prophesies. */
export function petOnBuildPhase(ctx: SimCtx, nextWaveIndex: number): void {
  if (!ctx.state.pet) return;
  if (ctx.state.pet.id === 'cat') relocateCat(ctx);
  if (ctx.state.pet.id === 'goldfish') oracleProphecy(ctx, nextWaveIndex);
}
