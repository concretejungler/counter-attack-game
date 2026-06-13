import type { Critter, TileRef, Tower, TowerDef } from './types';
import type { SimCtx } from './sim';
import { applyKnockback, damageCritter, tryDodge } from './critters';
import { spawnProjectile } from './projectiles';

export const CLUTTER_MOUNT_HEIGHT = 0.85;
export const MORALE_RATE_BONUS = 1.25;

export function towerDefOf(ctx: SimCtx, id: string): TowerDef {
  const def = ctx.content.towers[id];
  if (!def) throw new Error(`unknown tower def: ${id}`);
  return def;
}

export interface TowerStats {
  dmg: number;
  rate: number;
  range: number;
  extra: Record<string, number>;
}

export function towerStats(ctx: SimCtx, tw: Tower): TowerStats {
  const def = towerDefOf(ctx, tw.def);
  const tier = def.tiers[tw.tier - 1];
  const extra: Record<string, number> = { ...(tier.extra ?? {}) };
  let dmg = tier.dmg;
  let rate = tier.rate;
  let range = tier.range;
  if (tw.branch) {
    const br = def.branches.find((b) => b.id === tw.branch);
    if (br) {
      for (const [k, v] of Object.entries(br.mod)) {
        if (k === 'dmgPct') dmg *= 1 + v;
        else if (k === 'ratePct') rate *= 1 + v;
        else if (k === 'rangePct') range *= 1 + v;
        else extra[k] = (extra[k] ?? 0) + v;
      }
    }
  }
  if (tw.moraleT > 0) rate *= MORALE_RATE_BONUS;
  return { dmg, rate, range, extra };
}

const sameTile = (a: TileRef, b: TileRef) => a.s === b.s && a.c === b.c && a.r === b.r;

export function tryPlaceTower(ctx: SimCtx, defId: string, at: TileRef): boolean {
  const def = ctx.content.towers[defId];
  if (!def) return false;
  const cost = def.tiers[0].cost;
  if (ctx.state.crumbs < cost) return false;
  if (!ctx.grid.inBounds(at)) return false;

  let mountClutter: number | null = null;
  if (def.attack === 'trap' || def.floorMount) {
    if (ctx.grid.isStaticBlocked(at) || ctx.grid.isClutter(at)) return false;
    if (sameTile(at, ctx.level.cakeTile)) return false;
    if (ctx.level.spawns.some((sp) => sameTile(sp.tile, at))) return false;
    for (const tw of ctx.state.towers.values()) if (sameTile(tw.tile, at)) return false;
  } else {
    const cid = ctx.grid.clutterIdAt(at);
    if (cid === null) return false;
    const piece = ctx.state.clutter.get(cid);
    if (!piece) return false;
    const shape = ctx.content.shapes[piece.shape];
    if (piece.mounted.length >= shape.mountSlots) return false;
    mountClutter = cid;
  }

  const base = ctx.grid.worldOf(at);
  const tower: Tower = {
    id: ctx.nextId(),
    def: defId,
    tier: 1,
    branch: null,
    tile: at,
    pos: { x: base.x, y: base.y + (mountClutter !== null ? CLUTTER_MOUNT_HEIGHT : 0), z: base.z },
    cooldown: 0,
    mountClutter,
    carried: false,
    downed: false,
    armed: true,
    invested: cost,
    disabled: 0,
    kills: 0,
    moraleT: 0,
    ageWaves: 0,
    aim: 0,
  };
  const decoyHp = def.tiers[0].extra?.decoyHp;
  if (decoyHp) tower.hp = decoyHp;
  ctx.state.towers.set(tower.id, tower);
  if (mountClutter !== null) ctx.state.clutter.get(mountClutter)!.mounted.push(tower.id);
  ctx.state.crumbs -= cost;
  ctx.emit({ t: 'towerPlace', id: tower.id, def: defId, at: { ...tower.pos } });
  return true;
}

export function tryUpgradeTower(ctx: SimCtx, id: number): boolean {
  const tw = ctx.state.towers.get(id);
  if (!tw || (tw.tier !== 1 && tw.tier !== 2)) return false;
  const def = towerDefOf(ctx, tw.def);
  const cost = def.tiers[tw.tier].cost; // next tier's cost
  if (ctx.state.crumbs < cost) return false;
  ctx.state.crumbs -= cost;
  tw.invested += cost;
  tw.tier = (tw.tier + 1) as 1 | 2 | 3;
  const decoyHp = def.tiers[tw.tier - 1].extra?.decoyHp;
  if (decoyHp) tw.hp = decoyHp; // decoys re-armor on upgrade
  ctx.emit({ t: 'towerUpgrade', id, tier: tw.tier });
  return true;
}

export function tryBranchTower(ctx: SimCtx, id: number, branchId: string): boolean {
  const tw = ctx.state.towers.get(id);
  if (!tw || tw.tier < 3 || tw.branch !== null) return false;
  const def = towerDefOf(ctx, tw.def);
  const br = def.branches.find((b) => b.id === branchId);
  if (!br) return false;
  if (ctx.state.crumbs < br.cost) return false;
  ctx.state.crumbs -= br.cost;
  tw.invested += br.cost;
  tw.branch = branchId;
  ctx.emit({ t: 'towerBranch', id, branch: branchId });
  return true;
}

export function trySellTower(ctx: SimCtx, id: number): boolean {
  const tw = ctx.state.towers.get(id);
  if (!tw) return false;
  if (tw.mountClutter !== null) {
    const piece = ctx.state.clutter.get(tw.mountClutter);
    if (piece) piece.mounted = piece.mounted.filter((m) => m !== id);
  }
  ctx.state.towers.delete(id);
  const refund = Math.round(tw.invested * 0.9);
  ctx.state.crumbs += refund;
  ctx.emit({ t: 'towerSell', id });
  return true;
}

/** Progress metric: lower = closer to the cake (targeting mode 'first'). */
function progressOf(ctx: SimCtx, cr: Critter): number {
  if (!cr.flying) {
    const tile = ctx.grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
    if (tile) {
      const d = ctx.grid.distOf(tile);
      if (Number.isFinite(d)) return d;
    }
  }
  const cake = ctx.grid.worldOf(ctx.level.cakeTile);
  return Math.hypot(cake.x - cr.pos.x, cake.z - cr.pos.z);
}

function candidates(ctx: SimCtx, tw: Tower, def: TowerDef, range: number): Critter[] {
  const out: Critter[] = [];
  for (const cr of ctx.state.critters.values()) {
    if (cr.state === 'playDead') continue;
    if (def.groundOnly && cr.flying) continue;
    const d = Math.hypot(cr.pos.x - tw.pos.x, cr.pos.z - tw.pos.z);
    if (d <= range) out.push(cr);
  }
  return out;
}

function pickTarget(ctx: SimCtx, tw: Tower, def: TowerDef, range: number): Critter | null {
  let pool = candidates(ctx, tw, def, range);
  if (pool.length === 0) return null;
  if (def.targeting === 'air') {
    const fliers = pool.filter((c) => c.flying);
    if (fliers.length > 0) pool = fliers;
  }
  switch (def.targeting) {
    case 'close':
      return pool.reduce((a, b) =>
        Math.hypot(a.pos.x - tw.pos.x, a.pos.z - tw.pos.z) <= Math.hypot(b.pos.x - tw.pos.x, b.pos.z - tw.pos.z) ? a : b,
      );
    case 'strong':
      return pool.reduce((a, b) => (a.hp >= b.hp ? a : b));
    case 'first':
    case 'air':
    default:
      return pool.reduce((a, b) => (progressOf(ctx, a) <= progressOf(ctx, b) ? a : b));
  }
}

export function updateTowers(ctx: SimCtx, dt: number): void {
  for (const tw of ctx.state.towers.values()) {
    if (tw.moraleT > 0) tw.moraleT -= dt;
    if (tw.disabled > 0) {
      tw.disabled -= dt;
      continue;
    }
    if (tw.carried || tw.downed) continue;

    const def = towerDefOf(ctx, tw.def);
    const stats = towerStats(ctx, tw);

    if (def.attack === 'trap') {
      if (!tw.armed) continue;
      for (const cr of ctx.state.critters.values()) {
        if (cr.flying || cr.state === 'playDead') continue;
        if (Math.abs(cr.pos.y - tw.pos.y) > 0.6) continue;
        const d = Math.hypot(cr.pos.x - tw.pos.x, cr.pos.z - tw.pos.z);
        if (d <= stats.range) {
          tw.armed = false;
          ctx.emit({ t: 'fire', towerId: tw.id, def: tw.def, at: { ...tw.pos }, target: { ...cr.pos } });
          damageCritter(ctx, cr, stats.dmg, def.dmgType, 'tower', {
            towerId: tw.id, towerDef: tw.def,
            statusId: def.status?.id, statusDur: def.status?.dur, statusChance: def.status?.chance,
          });
          break;
        }
      }
      continue;
    }

    if (def.attack === 'aura') {
      // the slow field is continuous (stamped every tick); only damage pulses on the rate cadence
      tw.cooldown -= dt;
      const pool = candidates(ctx, tw, def, stats.range);
      const slow = stats.extra.slowPct ?? 0;
      if (slow > 0) {
        for (const cr of pool) cr.slowPct = Math.max(cr.slowPct, slow);
      }
      if (tw.cooldown <= 0 && pool.length > 0) {
        tw.cooldown = 1 / stats.rate;
        if (stats.dmg > 0) {
          for (const cr of pool) {
            damageCritter(ctx, cr, stats.dmg, def.dmgType, 'tower', { towerId: tw.id, towerDef: tw.def });
          }
        }
      }
      continue;
    }

    if (def.attack === 'none') continue; // decoys don't shoot; they absorb

    tw.cooldown -= dt;
    if (tw.cooldown > 0) continue;

    const target = pickTarget(ctx, tw, def, stats.range);
    if (!target) continue;
    tw.cooldown = 1 / stats.rate;
    tw.aim = Math.atan2(target.pos.x - tw.pos.x, target.pos.z - tw.pos.z);
    ctx.emit({ t: 'fire', towerId: tw.id, def: tw.def, at: { ...tw.pos }, target: { ...target.pos } });

    switch (def.attack) {
      case 'projectile': {
        spawnProjectile(ctx, tw, def, stats, target);
        break;
      }
      case 'slam': {
        const aoe = def.aoe ?? 1;
        for (const cr of candidates(ctx, tw, def, stats.range + aoe)) {
          const d = Math.hypot(cr.pos.x - target.pos.x, cr.pos.z - target.pos.z);
          if (d > aoe) continue;
          if (tryDodge(cr, tw.id, ctx)) continue;
          damageCritter(ctx, cr, stats.dmg, def.dmgType, 'tower', {
            towerId: tw.id, towerDef: tw.def,
            statusId: def.status?.id, statusDur: def.status?.dur, statusChance: def.status?.chance,
          });
          if (def.knockback) {
            applyKnockback(ctx, cr, cr.pos.x - tw.pos.x, cr.pos.z - tw.pos.z, def.knockback + (stats.extra.knockback ?? 0));
          }
        }
        break;
      }
      case 'cone':
      case 'push': {
        const halfAngle = 0.6;
        for (const cr of candidates(ctx, tw, def, stats.range)) {
          const ang = Math.atan2(cr.pos.x - tw.pos.x, cr.pos.z - tw.pos.z);
          let diff = Math.abs(ang - tw.aim);
          if (diff > Math.PI) diff = Math.PI * 2 - diff;
          if (diff > halfAngle) continue;
          if (def.attack === 'cone') {
            if (tryDodge(cr, tw.id, ctx)) continue;
            damageCritter(ctx, cr, stats.dmg, def.dmgType, 'tower', {
              towerId: tw.id, towerDef: tw.def,
              statusId: def.status?.id, statusDur: def.status?.dur, statusChance: def.status?.chance,
            });
          }
          const kb = (def.knockback ?? 0) + (stats.extra.knockback ?? 0);
          if (kb > 0) applyKnockback(ctx, cr, cr.pos.x - tw.pos.x, cr.pos.z - tw.pos.z, kb);
        }
        break;
      }
      case 'beam': {
        // continuous: re-fires every cooldown slice; dmg is per-shot like others but rate is high
        if (!tryDodge(target, tw.id, ctx)) {
          damageCritter(ctx, target, stats.dmg, def.dmgType, 'tower', {
            towerId: tw.id, towerDef: tw.def,
            statusId: def.status?.id, statusDur: def.status?.dur, statusChance: def.status?.chance,
          });
        }
        break;
      }
    }
  }
}
