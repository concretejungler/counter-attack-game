import type { SimCtx } from './sim';
import { damageCritter, spawnCritter } from './critters';

export function updateSpells(ctx: SimCtx, dt: number): void {
  for (const k of Object.keys(ctx.state.spellCds)) {
    if (ctx.state.spellCds[k] > 0) ctx.state.spellCds[k] = Math.max(0, ctx.state.spellCds[k] - dt);
  }
}

export function applyCast(ctx: SimCtx, spellId: string, surface?: number, x?: number, z?: number): void {
  const def = ctx.content.spells[spellId];
  if (!def) return;
  if ((ctx.state.spellCds[spellId] ?? 0) > 0) return;
  if (ctx.state.mana < def.cost) return;
  ctx.state.mana -= def.cost;
  ctx.state.spellCds[spellId] = def.cooldown;
  const at = x !== undefined && z !== undefined ? { x, y: 0, z } : null;
  ctx.emit({ t: 'spellCast', spell: spellId, at });

  switch (def.kind) {
    case 'bolt': {
      if (at === null) return;
      const radius = def.radius ?? 1.5;
      for (const cr of [...ctx.state.critters.values()]) {
        if (surface !== undefined && cr.surface !== surface) continue;
        if (Math.hypot(cr.pos.x - at.x, cr.pos.z - at.z) > radius) continue;
        damageCritter(ctx, cr, def.power, 'zap', 'spell');
      }
      return;
    }
    case 'lane': {
      // the Forbidden Slipper sweeps an entire column, every surface
      if (at === null) return;
      const half = def.radius ?? 1.0;
      for (const cr of [...ctx.state.critters.values()]) {
        if (Math.abs(cr.pos.x - at.x) > half) continue;
        damageCritter(ctx, cr, def.power, 'swat', 'spell');
      }
      return;
    }
    case 'momHand': {
      // MOOOOM! — wipes the lane. No resist helps you against Mom.
      if (at === null) return;
      const half = (def.radius ?? 1.0) * 1.5;
      for (const cr of [...ctx.state.critters.values()]) {
        if (Math.abs(cr.pos.x - at.x) > half) continue;
        damageCritter(ctx, cr, 99999, 'swat', 'spell');
      }
      return;
    }
    case 'timestop':
      for (const cr of ctx.state.critters.values()) {
        cr.statuses.stunned = Math.max(cr.statuses.stunned ?? 0, def.power);
      }
      return;
    case 'cleanse':
      ctx.state.scent = Math.max(0, ctx.state.scent * 0.5);
      for (const cr of ctx.state.critters.values()) {
        delete cr.statuses.sticky;
        delete cr.statuses.soaked;
      }
      return;
    case 'gamble':
      switch (Math.floor(ctx.rng.next() * 3)) {
        case 0:
          ctx.state.crumbs += 150;
          ctx.emit({ t: 'crumbBank', amount: 150, total: ctx.state.crumbs });
          return;
        case 1:
          for (const tw of ctx.state.towers.values()) tw.moraleT = 15;
          return;
        default: {
          const ambushDef = ctx.level.waves[0].entries[0].critter;
          for (let i = 0; i < 8; i++) {
            const spawn = ctx.rng.pick(ctx.level.spawns);
            spawnCritter(ctx, ambushDef, spawn.tile);
          }
          return;
        }
      }
    case 'repair':
      for (const piece of ctx.state.clutter.values()) piece.hp = piece.maxHp;
      for (const tw of ctx.state.towers.values()) {
        tw.downed = false;
        if (ctx.content.towers[tw.def]?.attack === 'trap') tw.armed = true;
      }
      return;
    case 'handBuff':
      ctx.state.hand.zapT = def.power;
      return;
  }
}
