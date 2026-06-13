import type { Critter, Projectile, Tower, TowerDef } from './types';
import type { SimCtx } from './sim';
import { applyKnockback, damageCritter, tryDodge } from './critters';
import type { TowerStats } from './towers';

const HIT_DIST = 0.35;
const SPLASH_FACTOR = 0.6;

export function spawnProjectile(ctx: SimCtx, tw: Tower, def: TowerDef, stats: TowerStats, target: Critter): void {
  const speed = def.projSpeed ?? 10;
  const from = { x: tw.pos.x, y: tw.pos.y + 0.4, z: tw.pos.z };
  const p: Projectile = {
    id: ctx.nextId(),
    tower: tw.id,
    def: tw.def,
    pos: from,
    vel: { x: 0, y: 0, z: 0 },
    target: target.id,
    ttl: 3,
    arc: !!def.arc,
    dmg: stats.dmg,
    dmgType: def.dmgType,
    aoe: def.aoe ?? 0,
    knockback: (def.knockback ?? 0) + (stats.extra.knockback ?? 0),
    statusId: def.status?.id,
    statusDur: def.status?.dur,
    mods: stats.extra,
  };
  if (p.arc) {
    // ballistic lob to the target's predicted position — commits at launch, never retargets
    const eta = Math.hypot(target.pos.x - from.x, target.pos.z - from.z) / speed;
    const lead = Math.min(eta, 1.2) * 1.2;
    p.arcDest = {
      x: target.pos.x + Math.sin(target.facing) * lead,
      y: target.pos.y,
      z: target.pos.z + Math.cos(target.facing) * lead,
    };
    p.arcStart = { ...from };
    p.arcT = 0;
    p.arcDur = Math.max(0.35, eta);
  } else {
    const d = Math.hypot(target.pos.x - from.x, target.pos.z - from.z) || 1;
    p.vel = {
      x: ((target.pos.x - from.x) / d) * speed,
      y: 0,
      z: ((target.pos.z - from.z) / d) * speed,
    };
  }
  ctx.state.projectiles.push(p);
}

export function updateProjectiles(ctx: SimCtx, dt: number): void {
  const alive: Projectile[] = [];
  for (const p of ctx.state.projectiles) {
    p.ttl -= dt;
    if (p.ttl <= 0) continue;

    if (p.arc) {
      p.arcT = (p.arcT ?? 0) + dt / (p.arcDur ?? 0.5);
      const t = Math.min(1, p.arcT);
      const a = p.arcStart!;
      const b = p.arcDest!;
      p.pos.x = a.x + (b.x - a.x) * t;
      p.pos.z = a.z + (b.z - a.z) * t;
      p.pos.y = a.y + (b.y - a.y) * t + Math.sin(t * Math.PI) * 1.6; // lob height
      if (t >= 1) {
        impactAt(ctx, p, null);
        continue;
      }
      alive.push(p);
      continue;
    }

    // homing
    const target = p.target !== null ? ctx.state.critters.get(p.target) : undefined;
    if (target && target.state !== 'playDead') {
      const speed = Math.hypot(p.vel.x, p.vel.z) || 10;
      const dx = target.pos.x - p.pos.x;
      const dz = target.pos.z - p.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      p.vel.x = (dx / d) * speed;
      p.vel.z = (dz / d) * speed;
      p.pos.y += (target.pos.y + 0.25 - p.pos.y) * Math.min(1, dt * 8);
      if (d < HIT_DIST) {
        impactAt(ctx, p, target);
        continue;
      }
    }
    p.pos.x += p.vel.x * dt;
    p.pos.z += p.vel.z * dt;
    alive.push(p);
  }
  ctx.state.projectiles = alive;
}

function impactAt(ctx: SimCtx, p: Projectile, primary: Critter | null | undefined): void {
  const hitPos = primary ? primary.pos : p.arcDest ?? p.pos;

  if (primary) {
    if (tryDodge(primary, p.tower, ctx)) return; // projectile spent on a dodge
    hitOne(ctx, p, primary, 1);
  }
  if (p.aoe > 0) {
    for (const cr of ctx.state.critters.values()) {
      if (cr === primary || cr.state === 'playDead') continue;
      const d = Math.hypot(cr.pos.x - hitPos.x, cr.pos.z - hitPos.z);
      if (d <= p.aoe && Math.abs(cr.pos.y - hitPos.y) < 1.2) {
        hitOne(ctx, p, cr, primary ? SPLASH_FACTOR : 1);
      }
    }
  }
}

const MOD_STATUSES = [
  ['soakedDur', 'soaked'],
  ['stickyDur', 'sticky'],
  ['frozenDur', 'frozen'],
  ['fearedDur', 'feared'],
  ['butteredDur', 'buttered'],
  ['stunnedDur', 'stunned'],
] as const;

function hitOne(ctx: SimCtx, p: Projectile, cr: Critter, factor: number): void {
  damageCritter(ctx, cr, p.dmg * factor, p.dmgType, 'tower', {
    towerId: p.tower,
    towerDef: p.def,
    statusId: p.statusId,
    statusDur: p.statusDur,
  });
  if (!ctx.state.critters.has(cr.id)) return;
  if (p.mods.burnDps) {
    cr.statuses.burnt = Math.max(cr.statuses.burnt ?? 0, p.mods.burnDur ?? 2);
    cr.burnDps = Math.max(cr.burnDps ?? 0, p.mods.burnDps);
  }
  for (const [modKey, status] of MOD_STATUSES) {
    const dur = p.mods[modKey];
    if (dur) cr.statuses[status] = Math.max(cr.statuses[status] ?? 0, dur);
  }
  if (p.knockback > 0) {
    applyKnockback(ctx, cr, cr.pos.x - p.pos.x, cr.pos.z - p.pos.z, p.knockback);
  }
}
