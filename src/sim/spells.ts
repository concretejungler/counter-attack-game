import type { SimCtx } from './sim';
import { damageCritter } from './critters';

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
    case 'cleanse':
    case 'gamble':
    case 'repair':
    case 'handBuff':
      // arrive with Phase 2 content
      return;
  }
}
