import type { SimCtx } from './sim';
import { critterDef } from './critters';

const EAT_RADIUS = 0.5;

/** Bank all crumbs on a surface within radius. Sweeping is also how mana charges. */
export function applySweep(ctx: SimCtx, surface: number, x: number, z: number, radius: number): void {
  let sum = 0;
  for (const [id, ent] of ctx.state.crumbEnts) {
    if (ent.surface !== surface) continue;
    if (Math.hypot(ent.pos.x - x, ent.pos.z - z) > radius) continue;
    sum += ent.value;
    ctx.state.crumbEnts.delete(id);
  }
  if (sum <= 0) return;
  ctx.state.crumbs += sum;
  ctx.state.recap.crumbsBanked += sum;
  ctx.state.recap.sweeps++;
  ctx.state.mana = Math.min(ctx.state.manaMax, ctx.state.mana + Math.ceil(sum / 10));
  ctx.emit({ t: 'crumbBank', amount: sum, total: ctx.state.crumbs });
}

/** Hungry critters hoover crumbs they pass and molt into something worse. */
export function updateCrumbEating(ctx: SimCtx, dt: number): void {
  void dt;
  for (const cr of ctx.state.critters.values()) {
    if (cr.flying || cr.state !== 'walk') continue;
    const def = critterDef(ctx, cr.def);
    if (!def.crumbHunger || !def.evolveTo) continue;
    for (const [id, ent] of ctx.state.crumbEnts) {
      if (ent.surface !== cr.surface) continue;
      if (Math.hypot(ent.pos.x - cr.pos.x, ent.pos.z - cr.pos.z) > EAT_RADIUS) continue;
      cr.crumbsEaten += ent.value;
      ctx.state.recap.crumbsWasted += ent.value;
      ctx.state.crumbEnts.delete(id);
      ctx.emit({ t: 'crumbEaten', critterId: cr.id, at: { ...ent.pos } });
      if (cr.crumbsEaten >= def.crumbHunger) {
        evolveCritter(ctx, cr.id, def.evolveTo);
        break;
      }
    }
  }
}

export function evolveCritter(ctx: SimCtx, critterId: number, into: string): void {
  const cr = ctx.state.critters.get(critterId);
  if (!cr) return;
  const newDef = ctx.content.critters[into];
  if (!newDef) return;
  const from = cr.def;
  const hpMul = ctx.diff.critterHp * (1 + ctx.modSum('allHpPct') + (newDef.flying ? ctx.modSum('flierHpPct') : 0));
  cr.def = into;
  cr.maxHp = Math.round(newDef.hp * hpMul);
  cr.hp = cr.maxHp;
  cr.flying = !!newDef.flying;
  cr.crumbsEaten = 0;
  cr.dodged = {};
  ctx.emit({ t: 'evolve', id: cr.id, from, into, at: { ...cr.pos } });
}
