import type { TileRef, Vec2 } from './types';
import type { SimCtx } from './sim';
import { critterDef, killCritter } from './critters';
import { CLUTTER_MOUNT_HEIGHT, towerDefOf } from './towers';

export const FLICK_RECHARGE_SECONDS = 20;
export const SQUASH_COOLDOWN = 6;
export const CARRY_COOLDOWN = 8;
export const SQUASHABLE_SIZE = 0.35;
export const HIGH_FIVE_BUFF = 10;

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
}

export function applyFlick(ctx: SimCtx, critterId: number, dir: Vec2, power: number): void {
  const h = ctx.state.hand;
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
