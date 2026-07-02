import type { TileRef, Vec2, Vec3 } from './types';
import type { SimCtx } from './sim';
import { critterDef, killCritter } from './critters';
import { CLUTTER_MOUNT_HEIGHT, towerDefOf } from './towers';

export const FLICK_RECHARGE_SECONDS = 20;
export const SQUASH_COOLDOWN = 6;
export const CARRY_COOLDOWN = 8;
export const SQUASHABLE_SIZE = 0.35;
export const HIGH_FIVE_BUFF = 10;

// ---------- Jarring (GAME-PROMPT §2.5) ----------
export const JAR_CHANNEL_SECONDS = 2.0;
export const JAR_HP_PCT_THRESHOLD = 0.20;
export const JAR_MOVE_TOLERANCE = 0.75; // tiles

/** Species -> unique jarred tower def id. DEFAULT is used for anything not listed. */
export const JAR_TOWER_MAP: Record<string, string> = {
  'wasp-baron': 'jar-wasp',
  hornet: 'jar-wasp',
  mosquito: 'jar-firefly', // no dedicated firefly critter def; mosquito stands in
  beetle: 'jar-stag',
  pillbug: 'jar-pillbug',
  'ant-worker': 'jar-queen-ant',
  'ant-soldier': 'jar-queen-ant',
  'ant-bullet': 'jar-queen-ant',
  'ant-fire': 'jar-queen-ant',
  'ant-carpenter': 'jar-queen-ant',
};
export const JAR_TOWER_DEFAULT = 'jar-wasp';

export function jarTowerFor(defId: string): string {
  return JAR_TOWER_MAP[defId] ?? JAR_TOWER_DEFAULT;
}

const JAR_TOWER_IDS = new Set([
  'jar-wasp', 'jar-firefly', 'jar-stag', 'jar-queen-ant', 'jar-pillbug',
]);

/** True if `defId` is one of the jarred-unique tower defs (placeable only from earned stock). */
export function isJarTower(ctx: SimCtx, defId: string): boolean {
  return JAR_TOWER_IDS.has(defId);
}

/** Anchor position at channel start, keyed by critter id — transient, module-local, cleared on resolve. */
const jarAnchors = new Map<number, Vec3>();

function resolveJar(ctx: SimCtx, reason: 'moved' | 'died' | 'cancelled'): void {
  const jarring = ctx.state.jarring;
  if (!jarring) return;
  ctx.emit({ t: 'jarFail', critterId: jarring.critterId, reason });
  jarAnchors.delete(jarring.critterId);
  ctx.state.jarring = null;
}

export function applyJarStart(ctx: SimCtx, critterId: number): void {
  if (ctx.state.jarring) return; // one channel at a time; not even a fail event — command is simply ignored
  const h = ctx.state.hand;
  const cr = ctx.state.critters.get(critterId);
  const ineligible =
    !cr ||
    !cr.shiny ||
    cr.hp / cr.maxHp >= JAR_HP_PCT_THRESHOLD ||
    critterDef(ctx, cr.def).boss ||
    h.carrying !== null;
  if (ineligible) {
    ctx.emit({ t: 'jarFail', critterId, reason: 'ineligible' });
    return;
  }
  ctx.state.jarring = { critterId, t: JAR_CHANNEL_SECONDS };
  jarAnchors.set(critterId, { ...cr!.pos });
  ctx.emit({ t: 'jarStart', critterId });
}

export function applyJarCancel(ctx: SimCtx): void {
  if (!ctx.state.jarring) return;
  resolveJar(ctx, 'cancelled');
}

/** Ticks the jar channel: fail on death/movement, succeed at t<=0 (capture — no death event, no bounty). */
function updateJarring(ctx: SimCtx, dt: number): void {
  const jarring = ctx.state.jarring;
  if (!jarring) return;
  const cr = ctx.state.critters.get(jarring.critterId);
  if (!cr) {
    resolveJar(ctx, 'died');
    return;
  }
  const anchor = jarAnchors.get(jarring.critterId);
  if (anchor) {
    const moved = Math.hypot(cr.pos.x - anchor.x, cr.pos.z - anchor.z);
    if (moved > JAR_MOVE_TOLERANCE) {
      resolveJar(ctx, 'moved');
      return;
    }
  }
  jarring.t -= dt;
  if (jarring.t > 0) return;

  // captured! remove the critter with no death event and no bounty, unlock the jarred tower.
  const def = critterDef(ctx, cr.def);
  const towerDef = jarTowerFor(cr.def);
  ctx.state.critters.delete(cr.id);
  ctx.state.jarredStock.push(towerDef);
  jarAnchors.delete(jarring.critterId);
  ctx.state.jarring = null;
  ctx.emit({ t: 'jarDone', critterId: cr.id, def: cr.def, towerDef });
}

export function updateHand(ctx: SimCtx, dt: number): void {
  const h = ctx.state.hand;
  if (h.flickCharges < h.flickMax) {
    h.flickRecharge += dt;
    if (h.flickRecharge >= FLICK_RECHARGE_SECONDS) {
      h.flickRecharge = 0;
      h.flickCharges++;
    }
  }
  if (h.squashCd > 0) h.squashCd = Math.max(0, h.squashCd - dt);
  if (h.carryCd > 0) h.carryCd = Math.max(0, h.carryCd - dt);
  if (h.zapT > 0) h.zapT = Math.max(0, h.zapT - dt);
  updateJarring(ctx, dt);
}

export function applyFlick(ctx: SimCtx, critterId: number, dir: Vec2, power: number): void {
  const h = ctx.state.hand;
  if (ctx.state.jarring) return; // hand is busy channeling the jar
  if (h.flickCharges <= 0) return;
  const cr = ctx.state.critters.get(critterId);
  if (!cr) return;
  const def = critterDef(ctx, cr.def);
  if (def.boss) return; // bosses do not appreciate being flicked
  if (def.traits?.includes('anchored')) return;
  h.flickCharges--;
  const n = Math.hypot(dir.x, dir.z) || 1;
  const p = Math.max(2, Math.min(12, power));
  cr.state = 'flung';
  cr.fallFromY = cr.pos.y;
  cr.vel = { x: (dir.x / n) * p, y: 2.5, z: (dir.z / n) * p };
  cr.chewTarget = undefined;
  ctx.emit({ t: 'flick', critterId });
}

export function applySquash(ctx: SimCtx, critterId: number): void {
  const h = ctx.state.hand;
  if (ctx.state.jarring) return; // hand is busy channeling the jar
  const charged = h.zapT > 0;
  if (!charged && h.squashCd > 0) return;
  const cr = ctx.state.critters.get(critterId);
  if (!cr) return;
  const def = critterDef(ctx, cr.def);
  if (def.boss) return;
  const squashable = def.size <= SQUASHABLE_SIZE || !!cr.statuses.shrunk;
  if (!charged && !squashable) return;
  if (!charged) h.squashCd = SQUASH_COOLDOWN;
  ctx.emit({ t: 'squash', at: { ...cr.pos } });
  killCritter(ctx, cr, 'squash');
}

export function applyCarryStart(ctx: SimCtx, towerId: number): void {
  const h = ctx.state.hand;
  if (ctx.state.jarring) return; // hand is busy channeling the jar
  if (h.carrying !== null || h.carryCd > 0) return;
  const tw = ctx.state.towers.get(towerId);
  if (!tw || tw.carried) return;
  tw.carried = true;
  h.carrying = towerId;
}

export function applyCarryDrop(ctx: SimCtx, at: TileRef): void {
  const h = ctx.state.hand;
  if (h.carrying === null) return;
  const tw = ctx.state.towers.get(h.carrying);
  if (!tw) {
    h.carrying = null;
    return;
  }
  const def = towerDefOf(ctx, tw.def);
  if (!ctx.grid.inBounds(at)) return;

  let newMount: number | null = null;
  if (def.attack === 'trap') {
    if (ctx.grid.isStaticBlocked(at) || ctx.grid.isClutter(at)) return;
    for (const other of ctx.state.towers.values()) {
      if (other.id !== tw.id && other.tile.s === at.s && other.tile.c === at.c && other.tile.r === at.r) return;
    }
  } else {
    const cid = ctx.grid.clutterIdAt(at);
    if (cid === null) return;
    const piece = ctx.state.clutter.get(cid);
    if (!piece) return;
    const shape = ctx.content.shapes[piece.shape];
    const occupants = piece.mounted.filter((m) => m !== tw.id);
    if (occupants.length >= shape.mountSlots) return;
    newMount = cid;
  }

  // release old mount
  if (tw.mountClutter !== null) {
    const old = ctx.state.clutter.get(tw.mountClutter);
    if (old) old.mounted = old.mounted.filter((m) => m !== tw.id);
  }
  const base = ctx.grid.worldOf(at);
  tw.tile = at;
  tw.pos = { x: base.x, y: base.y + (newMount !== null ? CLUTTER_MOUNT_HEIGHT : 0), z: base.z };
  tw.mountClutter = newMount;
  if (newMount !== null) ctx.state.clutter.get(newMount)!.mounted.push(tw.id);
  tw.carried = false;
  tw.downed = false;
  tw.ageWaves = 0;
  h.carrying = null;
  h.carryCd = CARRY_COOLDOWN;
  ctx.emit({ t: 'towerPlace', id: tw.id, def: tw.def, at: { ...tw.pos } });
}

export function applyCarryCancel(ctx: SimCtx): void {
  const h = ctx.state.hand;
  if (h.carrying === null) return;
  const tw = ctx.state.towers.get(h.carrying);
  h.carrying = null;
  if (!tw) return;
  tw.carried = false;
  const def = towerDefOf(ctx, tw.def);
  // if its perch vanished mid-carry, it lands on its face
  if (def.attack !== 'trap' && tw.mountClutter === null) tw.downed = true;
}

export function applyHighFive(ctx: SimCtx, towerId: number): void {
  const tw = ctx.state.towers.get(towerId);
  if (!tw) return;
  tw.moraleT = HIGH_FIVE_BUFF;
  ctx.emit({ t: 'highFive', towerId, hit: true });
}

export function applyRearmTrap(ctx: SimCtx, towerId: number): void {
  const tw = ctx.state.towers.get(towerId);
  if (!tw || tw.armed) return;
  const def = towerDefOf(ctx, tw.def);
  if (def.attack !== 'trap') return;
  tw.armed = true;
}
