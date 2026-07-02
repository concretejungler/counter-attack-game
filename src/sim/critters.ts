import type { Critter, CritterDef, DamageType, StatusId, TileRef, Tower, Vec3 } from './types';
import type { SimCtx } from './sim';
import { onBiterEscaped, settleGrudge } from './grudges';

const BITE_CHANNEL = 0.8;     // seconds spent taking a bite
const ARRIVE_DIST = 0.18;     // how close to a tile center counts as arrived
const CAKE_REACH = 0.55;
const EXIT_REACH = 0.4;
const GRAVITY = 22;
const FALL_SAFE = 1.0;        // fall height that causes zero damage
const FALL_DMG_PER_UNIT = 25;

export function critterDef(ctx: SimCtx, id: string): CritterDef {
  const def = ctx.content.critters[id];
  if (!def) throw new Error(`unknown critter def: ${id}`);
  return def;
}

const SHINY_CHANCE = 0.01; // 1-in-100 (GAME-PROMPT §2.5)

export function spawnCritter(
  ctx: SimCtx, defId: string, at: TileRef,
  opts: { elite?: boolean; shinyEligible?: boolean } = {},
): Critter {
  const def = critterDef(ctx, defId);
  const hpMul = ctx.diff.critterHp * (1 + ctx.modSum('allHpPct') + (def.flying ? ctx.modSum('flierHpPct') : 0));
  const pos = ctx.grid.worldOf(at);
  const jx = (ctx.rng.next() - 0.5) * 0.4;
  const jz = (ctx.rng.next() - 0.5) * 0.4;
  // Shiny rolls draw from ctx.shinyRng — a separate seeded stream from ctx.rng — so this
  // brand-new roll never perturbs the main gameplay RNG sequence that dozens of hand-tuned
  // balance par-scripts depend on staying byte-stable (positions, clutter deals, AI draws...).
  const shinyEligible = (opts.shinyEligible ?? true) && !def.boss;
  const shiny = shinyEligible && ctx.shinyRng.chance(SHINY_CHANCE);
  const cr: Critter = {
    id: ctx.nextId(),
    def: defId,
    hp: Math.round(def.hp * hpMul),
    maxHp: Math.round(def.hp * hpMul),
    pos: { x: pos.x + jx, y: pos.y, z: pos.z + jz },
    facing: 0,
    surface: at.s,
    state: 'walk',
    statuses: {},
    slowPct: 0,
    bitesDone: 0,
    carriedSlice: false,
    playedDead: false,
    dodged: {},
    crumbsEaten: 0,
    elite: opts.elite ?? false,
    shiny,
    crowned: undefined,
    flying: !!def.flying,
    vel: { x: 0, y: 0, z: 0 },
    wobble: ctx.rng.next() * Math.PI * 2,
    spawnedAt: ctx.state.tick,
  };
  ctx.state.critters.set(cr.id, cr);
  ctx.emit({ t: 'spawn', id: cr.id, def: defId, at: { ...cr.pos }, shiny: cr.shiny });
  if (shiny) ctx.emit({ t: 'shinySpawn', id: cr.id, def: defId, at: { ...cr.pos } });
  return cr;
}

/** Status-derived speed multiplier and per-tick status countdown (aura slows handled separately). */
function tickStatuses(cr: Critter, dt: number): number {
  let slow = 0;
  const st = cr.statuses;
  for (const k of Object.keys(st) as StatusId[]) {
    st[k] = (st[k] ?? 0) - dt;
    if ((st[k] ?? 0) <= 0) delete st[k];
  }
  if (st.frozen) return 0;
  if (st.stunned) return 0;
  if (st.sticky) slow = Math.max(slow, 0.6);
  if (st.soaked) slow = Math.max(slow, 0.15);
  return 1 - slow;
}

/** First hit from each tower misses dodgy critters. Returns true if this hit is dodged. */
export function tryDodge(cr: Critter, towerId: number, ctx: SimCtx): boolean {
  const def = ctx.content.critters[cr.def];
  if (!def?.traits?.includes('dodgeFirst')) return false;
  if (cr.dodged[towerId]) return false;
  cr.dodged[towerId] = true;
  return true;
}

/** Shove a critter; elevated critters shoved past the rim start falling. */
export function applyKnockback(ctx: SimCtx, cr: Critter, dirX: number, dirZ: number, amount: number): void {
  if (amount <= 0) return;
  if (cr.state === 'climb' || cr.state === 'fall' || cr.state === 'flung') return;
  const kbDef = ctx.content.critters[cr.def];
  if (kbDef?.traits?.includes('anchored')) return;
  const n = Math.hypot(dirX, dirZ) || 1;
  cr.pos.x += (dirX / n) * amount;
  cr.pos.z += (dirZ / n) * amount;
  if (cr.flying) return;
  const tile = ctx.grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
  if (tile) return;
  const surf = ctx.grid.surfaces[cr.surface].def;
  if (surf.kind === 'floor') {
    // floors have walls, not cliffs — clamp back in
    cr.pos.x = Math.min(surf.origin.x + surf.cols - 0.1, Math.max(surf.origin.x + 0.1, cr.pos.x));
    cr.pos.z = Math.min(surf.origin.z + surf.rows - 0.1, Math.max(surf.origin.z + 0.1, cr.pos.z));
    return;
  }
  // over the edge!
  cr.state = 'fall';
  cr.fallFromY = cr.pos.y;
  cr.vel = { x: (dirX / n) * 1.5, y: 0, z: (dirZ / n) * 1.5 };
}

const ROLL_CYCLE = 5;
const ROLL_PHASE = 3; // first 3s of the cycle = rolling/invulnerable

/** rollUp: true while inside the invulnerable rolling phase of its cycle. */
function isRolling(cr: Critter, def: CritterDef): boolean {
  if (!def.traits?.includes('rollUp')) return false;
  const t = (cr.cycleT ?? 0) % ROLL_CYCLE;
  return t < ROLL_PHASE;
}

const SUBMERGE_CYCLE = 7;
const SUBMERGE_SURFACED = 4; // first 4s of the cycle = surfaced

function effectiveSpeed(ctx: SimCtx, cr: Critter, def: CritterDef, statusMul: number): number {
  const base = def.speed * ctx.diff.critterSpeed * (1 + ctx.modSum('allSpeedPct'));
  const fear = cr.statuses.feared ? 1.25 : 1;
  // speedAura: consume-and-reset stamp applied by nearby speedAura critters
  const haste = 1 + (cr.hasteStamp ?? 0);
  cr.hasteStamp = 0;
  const roll = isRolling(cr, def) ? 1.5 : 1;
  return base * statusMul * fear * haste * roll;
}

function steerToward(cr: Critter, target: Vec3, speed: number, dt: number): void {
  const dx = target.x - cr.pos.x;
  const dz = target.z - cr.pos.z;
  const d = Math.hypot(dx, dz);
  if (d < 1e-6) return;
  const step = Math.min(d, speed * dt);
  cr.pos.x += (dx / d) * step;
  cr.pos.z += (dz / d) * step;
  cr.facing = Math.atan2(dx, dz);
}

function startClimb(ctx: SimCtx, cr: Critter, to: TileRef): void {
  const toPos = ctx.grid.worldOf(to);
  cr.state = 'climb';
  cr.climbT = 0;
  cr.climbFrom = { ...cr.pos };
  cr.climbTo = toPos;
  cr.climbToSurface = to.s;
  cr.climbDur = 0.5 + Math.abs(toPos.y - cr.pos.y) * 0.35;
}

function despawn(ctx: SimCtx, cr: Critter): void {
  ctx.state.critters.delete(cr.id);
  if (cr.bitesDone > 0 || cr.carriedSlice) {
    ctx.emit({ t: 'leak', id: cr.id, def: cr.def });
    const w = Math.max(0, ctx.state.waveIndex);
    ctx.state.recap.leaksByWave[w] = (ctx.state.recap.leaksByWave[w] ?? 0) + 1;
    // The Grudge System (§2.6): a biter that escapes alive gets a name and returns crowned.
    onBiterEscaped(ctx, cr, critterDef(ctx, cr.def));
  }
}

function arriveAtCake(ctx: SimCtx, cr: Critter, def: CritterDef): void {
  cr.state = 'eatCake';
  cr.actionT = def.traits?.includes('thief') ? 0.3 : BITE_CHANNEL;
}

function finishBite(ctx: SimCtx, cr: Critter, def: CritterDef): void {
  // thieves snatch a whole slice and run — recoverable if you kill them before they exit
  if (def.traits?.includes('thief')) {
    if (!cr.carriedSlice && ctx.state.cakeSlices > 0) {
      cr.carriedSlice = true;
      ctx.state.cakeSlices--;
      ctx.emit({ t: 'sliceStolen', critterId: cr.id });
    }
    cr.state = 'flee';
    return;
  }
  const bites = Math.max(0, def.bites);
  if (bites > 0 && ctx.state.cakeSlices > 0) {
    ctx.state.cakeSlices = Math.max(0, ctx.state.cakeSlices - bites);
    cr.bitesDone += bites;
    const name = def.name;
    ctx.state.recap.bitesBySource[name] = (ctx.state.recap.bitesBySource[name] ?? 0) + bites;
    ctx.emit({ t: 'cakeBite', slicesLeft: ctx.state.cakeSlices, by: cr.def, at: { ...cr.pos } });
  }
  cr.state = 'flee';
}

/** A decoy in range? Ground critters can't resist beating up a smug gnome. */
function findDecoy(ctx: SimCtx, cr: Critter): number | null {
  for (const tw of ctx.state.towers.values()) {
    if (tw.hp === undefined || tw.hp <= 0 || tw.carried) continue;
    const def = ctx.content.towers[tw.def];
    const radius = def?.tiers[tw.tier - 1].extra?.decoyRadius ?? 0;
    if (radius <= 0) continue;
    if (Math.abs(tw.pos.y - cr.pos.y) > 1.2) continue;
    if (Math.hypot(tw.pos.x - cr.pos.x, tw.pos.z - cr.pos.z) <= radius) return tw.id;
  }
  return null;
}

/**
 * Nearest tower to a critter, gated by `surfaceGate`:
 *  - 'any15': towers qualify if |y diff| < 1.5, regardless of surface index (latcher: "any surface if |y diff| < 1.5, else same surface")
 *  - 'same': only towers on the same surface index qualify
 *  - 'any': unlimited range/surface (webber)
 */
function findNearestTower(
  ctx: SimCtx, cr: Critter, maxRange: number, surfaceGate: 'any15' | 'same' | 'any',
): { tw: Tower; dist: number } | null {
  let best: { tw: Tower; dist: number } | null = null;
  for (const tw of ctx.state.towers.values()) {
    if (tw.carried) continue;
    if (surfaceGate === 'any15' && Math.abs(tw.pos.y - cr.pos.y) >= 1.5 && tw.tile.s !== cr.surface) continue;
    if (surfaceGate === 'same' && tw.tile.s !== cr.surface) continue;
    const d = Math.hypot(tw.pos.x - cr.pos.x, tw.pos.z - cr.pos.z);
    if (d > maxRange) continue;
    if (!best || d < best.dist) best = { tw, dist: d };
  }
  return best;
}

/**
 * latcher brain: walk toward and attach to the nearest tower, disabling it while alive.
 * Returns false when nothing is latchable from here — the caller (walkBrain) then walks
 * the critter toward the cake like anyone else, which brings towers into reach via climbs.
 */
function latcherBrain(ctx: SimCtx, cr: Critter, def: CritterDef, speed: number, dt: number): boolean {
  // already latched?
  if (cr.latchTarget !== undefined) {
    const tw = ctx.state.towers.get(cr.latchTarget);
    if (!tw || tw.carried) {
      cr.latchTarget = undefined;
    } else {
      tw.disabled = Math.max(tw.disabled, 0.2);
      return true; // does not move while latched
    }
  }
  const found = findNearestTower(ctx, cr, Infinity, 'any15');
  if (!found) return false;
  if (found.dist <= 0.5) {
    cr.latchTarget = found.tw.id;
    found.tw.disabled = Math.max(found.tw.disabled, 0.2);
    return true;
  }
  steerToward(cr, found.tw.pos, speed, dt);
  return true;
}

/** clutterEater brain: ignore the cake, seek + chew the nearest clutter piece; flee if none left. */
function clutterEaterBrain(ctx: SimCtx, cr: Critter, def: CritterDef, speed: number, dt: number): void {
  let bestCell: Vec3 | null = null;
  let bestClutterId: number | null = null;
  let bestDist = Infinity;
  for (const [id, piece] of ctx.state.clutter) {
    for (const cell of piece.cells) {
      if (cell.s !== cr.surface) continue;
      const w = ctx.grid.worldOf(cell);
      const d = Math.hypot(w.x - cr.pos.x, w.z - cr.pos.z);
      if (d < bestDist) {
        bestDist = d;
        bestCell = w;
        bestClutterId = id;
      }
    }
  }
  if (bestCell === null || bestClutterId === null) {
    cr.state = 'flee';
    return;
  }
  if (bestDist < 0.6) {
    cr.state = 'chew';
    cr.chewTarget = bestClutterId;
    return;
  }
  steerToward(cr, bestCell, speed, dt);
}

const ALLY_MELEE_RANGE = 0.6;
const ALLY_MELEE_PERIOD = 0.5; // seconds between swings — a real per-swing hit, not a tiny per-tick nibble

/** Finds the (single) living exterminator boss on the board, if any. */
function findExterminator(ctx: SimCtx): Critter | null {
  for (const cr of ctx.state.critters.values()) {
    if (cr.def === 'the-exterminator') return cr;
  }
  return null;
}

/**
 * Alliance finale brain (GAME-PROMPT §8.9, sewer-3 only): allied critters ignore the cake entirely
 * and instead steer toward THE EXTERMINATOR and chip him with melee dps once in range. If the boss
 * is already dead (or somehow absent), an allied critter just holds position — wave-clear logic
 * (sim.ts onWaveClear/tick) already excludes allied critters from the "still fighting" count, so an
 * idle ally never blocks the level from clearing.
 *
 * Damage is applied as one swing every ALLY_MELEE_PERIOD seconds (like a tower's rate-gated
 * attack) rather than a tiny dps*dt nibble every tick — damageCritter's armor reduction floors to
 * a minimum of 1 damage per CALL, so calling it 30x/sec would let even a low-dps ally punch
 * through heavy armor at 30x its intended rate. A real per-swing hit keeps armor meaningful.
 */
function alliedBrain(ctx: SimCtx, cr: Critter, def: CritterDef, speed: number, dt: number): void {
  const boss = findExterminator(ctx);
  if (!boss) return; // nothing left to fight; harmless idle
  const d = Math.hypot(boss.pos.x - cr.pos.x, boss.pos.z - cr.pos.z);
  if (d > ALLY_MELEE_RANGE) {
    steerToward(cr, boss.pos, speed, dt);
    return;
  }
  cr.facing = Math.atan2(boss.pos.x - cr.pos.x, boss.pos.z - cr.pos.z);
  cr.meleeT = (cr.meleeT ?? 0) + dt;
  if (cr.meleeT < ALLY_MELEE_PERIOD) return;
  cr.meleeT = 0;
  const dps = def.chewDps ?? Math.max(1, def.bounty / 4);
  damageCritter(ctx, boss, dps * ALLY_MELEE_PERIOD, 'swat', 'ally', { allyDef: cr.def });
}

/** Walking brain: follow the cake flow field; climb, chew, or bite as the path demands. */
function walkBrain(ctx: SimCtx, cr: Critter, def: CritterDef, speed: number, dt: number): void {
  const grid = ctx.grid;

  if (def.traits?.includes('latcher') && latcherBrain(ctx, cr, def, speed, dt)) return;
  if (def.traits?.includes('clutterEater')) {
    clutterEaterBrain(ctx, cr, def, speed, dt);
    return;
  }

  if (!cr.flying) {
    const decoy = findDecoy(ctx, cr);
    if (decoy !== null) {
      cr.state = 'chew';
      cr.decoyTarget = decoy;
      return;
    }
  }
  if (cr.flying) {
    // fliers beeline for the cake in the air
    const cake = grid.worldOf(ctx.level.cakeTile);
    const dx = cake.x - cr.pos.x;
    const dz = cake.z - cr.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < CAKE_REACH) {
      cr.surface = ctx.level.cakeTile.s;
      cr.pos.y = cake.y;
      arriveAtCake(ctx, cr, def);
      return;
    }
    steerToward(cr, cake, speed, dt);
    cr.pos.y = Math.max(cake.y, cr.pos.y) + 0; // cruise at cake height or above (render adds bob)
    return;
  }

  const tile = grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
  if (!tile) {
    // shoved off-grid: head back toward the surface interior
    const surf = grid.surfaces[cr.surface].def;
    const cx = surf.origin.x + surf.cols / 2;
    const cz = surf.origin.z + surf.rows / 2;
    steerToward(cr, { x: cx, y: cr.pos.y, z: cz }, speed, dt);
    return;
  }

  // at the cake tile?
  if (grid.distOf(tile) === 0) {
    const center = grid.worldOf(tile);
    if (Math.hypot(center.x - cr.pos.x, center.z - cr.pos.z) < CAKE_REACH) {
      arriveAtCake(ctx, cr, def);
      return;
    }
    steerToward(cr, center, speed, dt);
    return;
  }

  const next = grid.flowOf(tile);
  if (!next) return; // unreachable; idle (should not happen)

  // chew target?
  if (grid.isClutter(next)) {
    cr.state = 'chew';
    cr.chewTarget = grid.clutterIdAt(next) ?? undefined;
    return;
  }

  // climb step?
  if (next.s !== tile.s) {
    const center = grid.worldOf(tile);
    if (Math.hypot(center.x - cr.pos.x, center.z - cr.pos.z) < ARRIVE_DIST) {
      startClimb(ctx, cr, next);
    } else {
      steerToward(cr, center, speed, dt);
    }
    return;
  }

  steerToward(cr, grid.worldOf(next), speed, dt);
}

/** Fleeing brain: follow the exit flow field, climb down as needed, despawn at exits. */
function fleeBrain(ctx: SimCtx, cr: Critter, speed: number, dt: number): void {
  const grid = ctx.grid;
  if (cr.flying) {
    const exit = grid.worldOf(ctx.level.spawns[0].tile);
    if (Math.hypot(exit.x - cr.pos.x, exit.z - cr.pos.z) < EXIT_REACH) {
      despawn(ctx, cr);
      return;
    }
    steerToward(cr, exit, speed * 1.15, dt);
    return;
  }
  const tile = grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
  if (!tile) {
    despawn(ctx, cr); // wandered fully off; count it as gone
    return;
  }
  if (grid.distExitOf(tile) === 0) {
    const center = grid.worldOf(tile);
    if (Math.hypot(center.x - cr.pos.x, center.z - cr.pos.z) < EXIT_REACH) {
      despawn(ctx, cr);
      return;
    }
    steerToward(cr, center, speed * 1.15, dt);
    return;
  }
  const next = grid.flowExitOf(tile);
  if (!next) {
    despawn(ctx, cr);
    return;
  }
  if (grid.isClutter(next)) {
    // fleeing critters chew too (they want OUT)
    cr.state = 'chew';
    cr.chewTarget = grid.clutterIdAt(next) ?? undefined;
    return;
  }
  if (next.s !== tile.s) {
    const center = grid.worldOf(tile);
    if (Math.hypot(center.x - cr.pos.x, center.z - cr.pos.z) < ARRIVE_DIST) {
      startClimb(ctx, cr, next);
    } else {
      steerToward(cr, center, speed * 1.15, dt);
    }
    return;
  }
  steerToward(cr, grid.worldOf(next), speed * 1.15, dt);
}

/**
 * confused/feared walking critters follow the exit flow field (like fleeBrain) but keep state 'walk'
 * and must NOT despawn at the exit — they just idle there until the status wears off, then walkBrain
 * resumes toward the cake on the next tick. We reuse fleeBrain's steering but intercept the despawn path.
 */
function confusedFleeBrain(ctx: SimCtx, cr: Critter, speed: number, dt: number): void {
  const grid = ctx.grid;
  if (cr.flying) {
    const exit = grid.worldOf(ctx.level.spawns[0].tile);
    if (Math.hypot(exit.x - cr.pos.x, exit.z - cr.pos.z) < EXIT_REACH) return; // idle at exit
    steerToward(cr, exit, speed * 1.15, dt);
    return;
  }
  const tile = grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
  if (!tile) return; // idle; do not despawn a confused/feared critter
  if (grid.distExitOf(tile) === 0) {
    const center = grid.worldOf(tile);
    if (Math.hypot(center.x - cr.pos.x, center.z - cr.pos.z) < EXIT_REACH) return; // idle at exit
    steerToward(cr, center, speed * 1.15, dt);
    return;
  }
  const next = grid.flowExitOf(tile);
  if (!next) return; // idle
  if (grid.isClutter(next)) {
    cr.state = 'chew';
    cr.chewTarget = grid.clutterIdAt(next) ?? undefined;
    return;
  }
  if (next.s !== tile.s) {
    const center = grid.worldOf(tile);
    if (Math.hypot(center.x - cr.pos.x, center.z - cr.pos.z) < ARRIVE_DIST) {
      startClimb(ctx, cr, next);
    } else {
      steerToward(cr, center, speed * 1.15, dt);
    }
    return;
  }
  steerToward(cr, grid.worldOf(next), speed * 1.15, dt);
}

/** speedAura: stamp nearby (non-self) critters on the same surface. Read next tick by effectiveSpeed. */
function applySpeedAura(ctx: SimCtx, cr: Critter): void {
  for (const other of ctx.state.critters.values()) {
    if (other.id === cr.id) continue;
    if (other.surface !== cr.surface) continue;
    if (Math.hypot(other.pos.x - cr.pos.x, other.pos.z - cr.pos.z) > 2.5) continue;
    other.hasteStamp = 0.3;
  }
}

/** healPulse: every 3s, heal nearby (non-self) same-surface critters for 8% of their maxHp. */
function applyHealPulse(ctx: SimCtx, cr: Critter, dt: number): void {
  cr.pulseT = (cr.pulseT ?? 0) + dt;
  if (cr.pulseT < 3) return;
  cr.pulseT = 0;
  for (const other of ctx.state.critters.values()) {
    if (other.id === cr.id) continue;
    if (other.surface !== cr.surface) continue;
    if (Math.hypot(other.pos.x - cr.pos.x, other.pos.z - cr.pos.z) > 2.0) continue;
    other.hp = Math.min(other.maxHp, other.hp + other.maxHp * 0.08);
  }
}

/** towerSmash / webber: periodically disable the nearest tower. */
function applyTowerDisableTrait(
  ctx: SimCtx, cr: Critter, dt: number, period: number, range: number, disableSeconds: number,
): void {
  cr.pulseT = (cr.pulseT ?? 0) + dt;
  if (cr.pulseT < period) return;
  cr.pulseT = 0;
  const found = findNearestTower(ctx, cr, range, range === Infinity ? 'any' : 'any15');
  if (!found) return;
  found.tw.disabled = Math.max(found.tw.disabled, disableSeconds);
  ctx.emit({ t: 'towerDisabled', id: found.tw.id, seconds: disableSeconds });
}

/** spawner: periodically spawns minions at the spawner's current tile. */
function applySpawner(ctx: SimCtx, cr: Critter, def: CritterDef, dt: number): void {
  if (!def.spawnDef || !def.spawnEvery || !def.spawnCount) return;
  cr.pulseT = (cr.pulseT ?? 0) + dt;
  if (cr.pulseT < def.spawnEvery) return;
  cr.pulseT = 0;
  const tile = ctx.grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
  if (!tile) return;
  for (let i = 0; i < def.spawnCount; i++) {
    const child = spawnCritter(ctx, def.spawnDef, tile, { shinyEligible: false });
    child.pos.x = cr.pos.x + (ctx.rng.next() - 0.5) * 0.5;
    child.pos.z = cr.pos.z + (ctx.rng.next() - 0.5) * 0.5;
  }
}

/** stealth: consume-and-reset revealStamp into hidden (towers stamp revealStamp=true when they see it). */
function applyStealth(cr: Critter): void {
  cr.hidden = !cr.revealStamp;
  cr.revealStamp = false;
}

/** submerge: cycle 4s surfaced / 3s submerged; hidden while submerged. */
function applySubmerge(cr: Critter, dt: number): void {
  cr.cycleT = (cr.cycleT ?? 0) + dt;
  const t = cr.cycleT % SUBMERGE_CYCLE;
  cr.hidden = t >= SUBMERGE_SURFACED;
}

/** tunneler: hidden (and immune, handled in damageCritter) while far from the cake; surfaces permanently once close. */
function applyTunneler(ctx: SimCtx, cr: Critter): void {
  if (cr.hidden === false) return; // already surfaced permanently
  const tile = ctx.grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
  const dist = tile ? ctx.grid.distOf(tile) : Infinity;
  cr.hidden = !(dist <= 6);
}

/** lateFlier: ground walker that takes wing once path-distance to the cake drops below 6. */
function applyLateFlier(ctx: SimCtx, cr: Critter): void {
  if (cr.flying) return;
  const tile = ctx.grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
  if (tile && ctx.grid.distOf(tile) < 6) cr.flying = true;
}

interface EvolveReq { cr: Critter; def: CritterDef }

export function updateCritters(ctx: SimCtx, dt: number): void {
  const dead: Critter[] = [];
  const evolving: EvolveReq[] = [];
  for (const cr of ctx.state.critters.values()) {
    const def = critterDef(ctx, cr.def);
    const traits0 = def.traits;

    // latchTarget must not survive a knockback/squash flinging the critter airborne
    if (cr.latchTarget !== undefined && (cr.state === 'flung' || cr.state === 'fall')) {
      cr.latchTarget = undefined;
    }

    // timedEvolve: queue for post-loop replacement so we don't mutate the Map mid-iteration
    if (traits0?.includes('timedEvolve') && def.evolveTo && def.evolveAfter !== undefined) {
      if ((ctx.state.tick - cr.spawnedAt) * (1 / 30) >= def.evolveAfter) {
        evolving.push({ cr, def });
        continue;
      }
    }

    // passive per-tick trait ticks (independent of state machine)
    if (traits0?.includes('stealth')) applyStealth(cr);
    if (traits0?.includes('submerge')) applySubmerge(cr, dt);
    if (traits0?.includes('rollUp')) cr.cycleT = (cr.cycleT ?? 0) + dt;
    if (traits0?.includes('tunneler')) applyTunneler(ctx, cr);
    if (traits0?.includes('healPulse')) applyHealPulse(ctx, cr, dt);
    if (traits0?.includes('speedAura')) applySpeedAura(ctx, cr);
    if (traits0?.includes('towerSmash')) applyTowerDisableTrait(ctx, cr, dt, 6, 3.5, 4);
    if (traits0?.includes('webber')) applyTowerDisableTrait(ctx, cr, dt, 8, Infinity, 5);
    if (traits0?.includes('spawner')) applySpawner(ctx, cr, def, dt);
    if (traits0?.includes('lateFlier')) applyLateFlier(ctx, cr);

    // aura slows were stamped by towers AFTER our last update; consume, then reset for this tick
    const auraSlow = Math.min(0.9, cr.slowPct);
    cr.slowPct = 0;
    const statusMul = tickStatuses(cr, dt) * (1 - auraSlow);
    if (cr.statuses.burnt) cr.hp -= (cr.burnDps ?? 5) * dt;

    switch (cr.state) {
      case 'walk': {
        if (statusMul === 0) break;
        const speed = effectiveSpeed(ctx, cr, def, statusMul);
        if (cr.allied) {
          alliedBrain(ctx, cr, def, speed, dt);
        } else if (cr.statuses.confused || cr.statuses.feared) {
          confusedFleeBrain(ctx, cr, speed, dt);
        } else {
          walkBrain(ctx, cr, def, speed, dt);
        }
        break;
      }
      case 'flee': {
        if (statusMul === 0) break;
        const speed = effectiveSpeed(ctx, cr, def, statusMul);
        fleeBrain(ctx, cr, speed, dt);
        break;
      }
      case 'climb': {
        cr.climbT = (cr.climbT ?? 0) + dt / (cr.climbDur ?? 1);
        const t = Math.min(1, cr.climbT);
        const a = cr.climbFrom!;
        const b = cr.climbTo!;
        cr.pos.x = a.x + (b.x - a.x) * t;
        cr.pos.y = a.y + (b.y - a.y) * t;
        cr.pos.z = a.z + (b.z - a.z) * t;
        if (t >= 1) {
          cr.surface = cr.climbToSurface!;
          cr.state = cr.bitesDone > 0 || cr.carriedSlice ? 'flee' : 'walk';
        }
        break;
      }
      case 'eatCake': {
        cr.actionT = (cr.actionT ?? BITE_CHANNEL) - dt;
        if (cr.actionT <= 0) finishBite(ctx, cr, def);
        break;
      }
      case 'chew': {
        if (cr.decoyTarget !== undefined) attackDecoy(ctx, cr, def, dt);
        else chewClutter(ctx, cr, def, dt);
        break;
      }
      case 'fall':
      case 'flung': {
        cr.vel.y -= GRAVITY * dt;
        cr.vel.x *= 1 - 1.2 * dt; // air drag so flicks don't sail forever
        cr.vel.z *= 1 - 1.2 * dt;
        cr.pos.x += cr.vel.x * dt;
        cr.pos.y += cr.vel.y * dt;
        cr.pos.z += cr.vel.z * dt;
        let landSurf = ctx.grid.surfaceBelow(cr.pos.x, cr.pos.z, cr.pos.y + 1.5);
        if (landSurf < 0) {
          // off every surface: land on the room floor (surfaces[0] by convention) and clamp in
          landSurf = 0;
          const f = ctx.grid.surfaces[0].def;
          cr.pos.x = Math.min(f.origin.x + f.cols - 0.1, Math.max(f.origin.x + 0.1, cr.pos.x));
          cr.pos.z = Math.min(f.origin.z + f.rows - 0.1, Math.max(f.origin.z + 0.1, cr.pos.z));
        }
        const floorY = ctx.grid.surfaces[landSurf].def.origin.y;
        if (cr.vel.y < 0 && cr.pos.y <= floorY) {
          cr.pos.y = floorY;
          const fallFrom = cr.fallFromY ?? floorY;
          const drop = Math.max(0, fallFrom - floorY);
          cr.surface = landSurf;
          cr.vel = { x: 0, y: 0, z: 0 };
          const dmg = Math.max(0, (drop - FALL_SAFE) * FALL_DMG_PER_UNIT);
          cr.state = cr.bitesDone > 0 || cr.carriedSlice ? 'flee' : 'walk';
          ctx.emit({ t: 'fall', id: cr.id, from: drop });
          if (dmg > 0) damageCritter(ctx, cr, dmg, 'swat', 'fall');
        }
        break;
      }
      case 'playDead': {
        cr.actionT = (cr.actionT ?? 2) - dt;
        if (cr.actionT <= 0) cr.state = 'walk';
        break;
      }
      case 'eatCrumb': {
        // crumbs system drives this; safety: fall back to walking
        cr.actionT = (cr.actionT ?? 0.4) - dt;
        if (cr.actionT <= 0) cr.state = 'walk';
        break;
      }
    }
    // boss auras: shed crumbs / hoover them back up
    const traits = def.traits;
    if (traits?.includes('crumbShed') && cr.state !== 'flee') {
      cr.shedT = (cr.shedT ?? 0) + dt;
      if (cr.shedT >= 2) {
        cr.shedT = 0;
        ctx.dropCrumbs({ ...cr.pos }, cr.surface, 3);
      }
    }
    if (traits?.includes('crumbHeal') && cr.hp < cr.maxHp) {
      for (const [id, ent] of ctx.state.crumbEnts) {
        if (ent.surface !== cr.surface) continue;
        if (Math.hypot(ent.pos.x - cr.pos.x, ent.pos.z - cr.pos.z) > 1.0) continue;
        cr.hp = Math.min(cr.maxHp, cr.hp + ent.value * 3);
        ctx.state.crumbEnts.delete(id);
        ctx.emit({ t: 'crumbEaten', critterId: cr.id, at: { ...ent.pos } });
      }
    }

    if (cr.hp <= 0 && cr.state !== 'playDead') dead.push(cr);
  }
  for (const { cr, def } of evolving) {
    if (!ctx.state.critters.has(cr.id)) continue;
    const tile = ctx.grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z) ?? { s: cr.surface, c: 0, r: 0 };
    const at = { ...cr.pos };
    ctx.state.critters.delete(cr.id);
    const evolved = spawnCritter(ctx, def.evolveTo!, tile, { shinyEligible: false });
    evolved.pos = { ...at };
    evolved.surface = cr.surface;
    // Only 'walk'/'flee' are safe to carry over as-is (no extra interpolation fields). Any other
    // transient state (climb/chew/eatCake/fall/flung/eatCrumb/playDead) depends on fields the
    // fresh spawn doesn't have — fall back to the same bites-based walk/flee pattern used elsewhere.
    evolved.state = cr.state === 'walk' || cr.state === 'flee'
      ? cr.state
      : (cr.bitesDone > 0 || cr.carriedSlice ? 'flee' : 'walk');
    evolved.bitesDone = cr.bitesDone;
    evolved.carriedSlice = cr.carriedSlice;
    evolved.shiny = cr.shiny; // shininess carries through an evolution, not re-rolled
    ctx.emit({ t: 'evolve', id: evolved.id, from: cr.def, into: def.evolveTo!, at: { ...at } });
  }
  for (const cr of dead) {
    if (ctx.state.critters.has(cr.id)) killCritter(ctx, cr, 'tower');
  }
}

function attackDecoy(ctx: SimCtx, cr: Critter, def: CritterDef, dt: number): void {
  const tw = cr.decoyTarget !== undefined ? ctx.state.towers.get(cr.decoyTarget) : undefined;
  if (!tw || tw.hp === undefined || tw.hp <= 0 || tw.carried) {
    cr.decoyTarget = undefined;
    cr.state = cr.bitesDone > 0 || cr.carriedSlice ? 'flee' : 'walk';
    return;
  }
  // shuffle up close, then whale on it
  const d = Math.hypot(tw.pos.x - cr.pos.x, tw.pos.z - cr.pos.z);
  if (d > 0.55) {
    steerToward(cr, tw.pos, def.speed * 0.9, dt);
    return;
  }
  const dps = def.chewDps ?? 4;
  const before = tw.hp;
  tw.hp -= dps * dt;
  if (Math.floor(before / 8) !== Math.floor(tw.hp / 8)) {
    const towerDef = ctx.content.towers[tw.def];
    const maxHp = towerDef?.tiers[tw.tier - 1].extra?.decoyHp ?? 1;
    ctx.emit({ t: 'towerHit', id: tw.id, hpPct: Math.max(0, tw.hp / maxHp) });
  }
  if (tw.hp <= 0) {
    // ceramic martyrdom
    const towerDef = ctx.content.towers[tw.def];
    const tier = towerDef?.tiers[tw.tier - 1];
    const aoe = tier?.extra?.explodeAoe ?? 1.3;
    const dmg = tier?.dmg ?? 30;
    ctx.emit({ t: 'towerGone', id: tw.id, at: { ...tw.pos } });
    ctx.state.towers.delete(tw.id);
    for (const victim of [...ctx.state.critters.values()]) {
      if (Math.hypot(victim.pos.x - tw.pos.x, victim.pos.z - tw.pos.z) <= aoe && Math.abs(victim.pos.y - tw.pos.y) < 1.2) {
        damageCritter(ctx, victim, dmg, towerDef?.dmgType ?? 'heat', 'tower', { towerDef: tw.def });
      }
    }
    cr.decoyTarget = undefined;
    if (ctx.state.critters.has(cr.id)) {
      cr.state = cr.bitesDone > 0 || cr.carriedSlice ? 'flee' : 'walk';
    }
  }
}

function chewClutter(ctx: SimCtx, cr: Critter, def: CritterDef, dt: number): void {
  const id = cr.chewTarget;
  const piece = id !== undefined ? ctx.state.clutter.get(id) : undefined;
  if (!piece) {
    cr.state = cr.bitesDone > 0 || cr.carriedSlice ? 'flee' : 'walk';
    cr.chewTarget = undefined;
    return;
  }
  const dps = (def.chewDps ?? 4) * (1 + ctx.modSum('chewPct'));
  piece.hp -= dps * dt;
  if (piece.hp <= 0) {
    ctx.destroyClutter(piece.id, 'chewed');
    cr.state = cr.bitesDone > 0 || cr.carriedSlice ? 'flee' : 'walk';
    cr.chewTarget = undefined;
  } else if (Math.floor((piece.hp + dps * dt) / 10) !== Math.floor(piece.hp / 10)) {
    const cell = piece.cells[0];
    ctx.emit({ t: 'clutterChew', id: piece.id, hpPct: piece.hp / piece.maxHp, at: ctx.grid.worldOf(cell) });
  }
}

export interface DamageOpts {
  towerId?: number;
  towerDef?: string;
  statusId?: StatusId;
  statusDur?: number;
  statusChance?: number;
  bountyPct?: number;
  /** Alliance finale (§8.9): critter def id of the allied attacker, so a killing blow can emit `allianceKill`. */
  allyDef?: string;
}

/** Central damage entry — handles resist/weak, armor, playDead fakeouts, and death. */
export function damageCritter(
  ctx: SimCtx,
  cr: Critter,
  amount: number,
  type: DamageType,
  cause: 'tower' | 'squash' | 'fall' | 'spell' | 'flick' | 'chain' | 'ally',
  opts: DamageOpts = {},
): void {
  if (!ctx.state.critters.has(cr.id)) return;
  if (cr.state === 'playDead') return; // untouchable while faking
  const def = critterDef(ctx, cr.def);
  const traits = def.traits ?? [];
  // rollUp: invulnerable while in the rolling phase of its cycle
  if (isRolling(cr, def)) return;
  // tunneler / submerge: untargetable AND immune while hidden underground/underwater
  if (cr.hidden && (traits.includes('tunneler') || traits.includes('submerge'))) return;
  let dmg = amount;
  if (def.resist === type) dmg *= 0.5;
  if (def.weak === type) dmg *= 2;
  dmg = Math.max(1, dmg - (def.armor ?? 0));
  cr.hp -= dmg;
  ctx.emit({ t: 'hit', critterId: cr.id, at: { ...cr.pos }, dmgType: type, amount: dmg, kind: 'projectile' });

  if (opts.statusId && (opts.statusChance === undefined || ctx.rng.chance(opts.statusChance))) {
    const cur = cr.statuses[opts.statusId] ?? 0;
    cr.statuses[opts.statusId] = Math.max(cur, opts.statusDur ?? 2);
  }

  if (cr.hp <= 0) {
    const extraPlays = ctx.modSum('roachExtraPlayDead');
    const basePlays = traits.includes('playDead') ? (def.playDeadTimes ?? 1) : 0;
    const maxPlays = basePlays > 0 ? basePlays + extraPlays : 0;
    const playsUsed = cr.playedDead ? 1 + (cr.extraPlaysUsed ?? 0) : 0;
    if (maxPlays > 0 && playsUsed < maxPlays) {
      if (cr.playedDead) cr.extraPlaysUsed = (cr.extraPlaysUsed ?? 0) + 1;
      cr.playedDead = true;
      cr.hp = Math.round(cr.maxHp * 0.4);
      cr.state = 'playDead';
      cr.actionT = 2;
      ctx.emit({ t: 'fakeDeath', id: cr.id, at: { ...cr.pos } });
      return;
    }
    killCritter(ctx, cr, cause, opts);
  }
}

export function killCritter(
  ctx: SimCtx,
  cr: Critter,
  cause: 'tower' | 'squash' | 'fall' | 'spell' | 'flick' | 'chain' | 'ally',
  opts: DamageOpts = {},
): void {
  const def = critterDef(ctx, cr.def);
  ctx.state.critters.delete(cr.id);

  // Alliance finale (§8.9): an allied critter just landed the killing blow on the boss — the recap/story beat.
  if (cause === 'ally' && def.boss && opts.allyDef) {
    ctx.emit({ t: 'allianceKill', by: opts.allyDef });
  }

  // stink bombs: disable nearby towers on death
  if (def.traits?.includes('deathGas')) {
    for (const tw of ctx.state.towers.values()) {
      if (Math.hypot(tw.pos.x - cr.pos.x, tw.pos.z - cr.pos.z) <= 1.6 && Math.abs(tw.pos.y - cr.pos.y) < 1.5) {
        tw.disabled = Math.max(tw.disabled, 4);
        ctx.emit({ t: 'towerDisabled', id: tw.id, seconds: 4 });
      }
    }
  }

  // recovered slice!
  if (cr.carriedSlice) {
    ctx.state.cakeSlices = Math.min(ctx.state.cakeMax, ctx.state.cakeSlices + 1);
    ctx.emit({ t: 'sliceRecovered', at: { ...cr.pos } });
  }

  // bounty drops as physical crumbs
  const bounty = Math.max(1, Math.round(def.bounty * ctx.diff.bounty * (1 + ctx.modSum('bountyPct') + (opts.bountyPct ?? 0))));
  ctx.dropCrumbs(cr.pos, cr.surface, bounty);

  // Grudge System (§2.6): killing a crowned elite pays its grudge bounty and settles the score for good.
  if (cr.crowned) settleGrudge(ctx, cr);

  // split on death (centipedes, dust bunnies...)
  if (def.splitInto) {
    const tile = ctx.grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
    if (tile) {
      for (let i = 0; i < def.splitInto.count; i++) {
        const child = spawnCritter(ctx, def.splitInto.def, tile, { shinyEligible: false });
        child.pos.x = cr.pos.x + (ctx.rng.next() - 0.5) * 0.5;
        child.pos.z = cr.pos.z + (ctx.rng.next() - 0.5) * 0.5;
      }
    }
  }

  ctx.state.recap.kills++;
  if (opts.towerDef) {
    ctx.state.recap.killsByTower[opts.towerDef] = (ctx.state.recap.killsByTower[opts.towerDef] ?? 0) + 1;
  }
  if (opts.towerId !== undefined) {
    const tw = ctx.state.towers.get(opts.towerId);
    if (tw) tw.kills++;
  }
  ctx.state.mana = Math.min(ctx.state.manaMax, ctx.state.mana + 1);
  ctx.emit({ t: 'die', id: cr.id, def: cr.def, at: { ...cr.pos }, cause, bounty });
}
