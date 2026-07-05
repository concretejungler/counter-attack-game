import type { SimCtx } from './sim';
import { critterDef } from './critters';

const EAT_RADIUS = 0.5;

// ---------- Hand-magnet (crumb magnetism) ----------
// Every crumb on the surface the Hand hovers drifts toward the hover point; closer crumbs move
// faster and auto-bank on contact (no clicking). Per-tick speed follows v = clamp(K/max(d,FLOOR),
// VMIN, VMAX): the closest crumbs (d <= FLOOR) hit VMAX; the farthest crawl at VMIN. Fully inert
// unless a `handMove` command set state.handMagnet — the balance harness never sends one, so this
// pass is a no-op (byte-identical) across every test/balance run.
const MAGNET_FRESH_TICKS = 15;   // ~0.5s at 30Hz: attraction stops this long after the last handMove
const MAGNET_K = 5.5;            // speed-curve numerator (tiles/s · tile)
const MAGNET_VMIN = 0.5;         // tiles/s for far-away crumbs (across-the-map drift)
const MAGNET_VMAX = 7.0;         // tiles/s for crumbs right at the hand
const MAGNET_DIST_FLOOR = 0.75;  // clamp the curve denominator so adjacent crumbs cap at VMAX
const MAGNET_CONTACT = 0.5;      // tiles: within this the crumb is picked up (matches sweep/eat contact)

/**
 * Credit banked crumb value: crumbs, recap totals, mana charge, and the crumbBank event. The single
 * crediting path shared by manual sweeps (applySweep) and the hand-magnet auto-pickup
 * (updateCrumbMagnet) so their crumb/scent/mana/sweep bookkeeping is byte-identical.
 */
function bankCrumbs(ctx: SimCtx, sum: number): void {
  if (sum <= 0) return;
  ctx.state.crumbs += sum;
  ctx.state.recap.crumbsBanked += sum;
  ctx.state.recap.sweeps++;
  ctx.state.mana = Math.min(ctx.state.manaMax, ctx.state.mana + Math.ceil(sum / 10));
  ctx.emit({ t: 'crumbBank', amount: sum, total: ctx.state.crumbs });
}

/** Bank all crumbs on a surface within radius. Sweeping is also how mana charges. */
export function applySweep(ctx: SimCtx, surface: number, x: number, z: number, radius: number): void {
  let sum = 0;
  for (const [id, ent] of ctx.state.crumbEnts) {
    if (ent.surface !== surface) continue;
    if (Math.hypot(ent.pos.x - x, ent.pos.z - z) > radius) continue;
    sum += ent.value;
    ctx.state.crumbEnts.delete(id);
  }
  bankCrumbs(ctx, sum);
}

/**
 * Hand-magnet: crumbs on the hovered surface accelerate toward state.handMagnet and auto-bank on
 * contact. No-op unless a fresh handMove set the magnet (see MAGNET_FRESH_TICKS) — so it never runs
 * in tests/balance, keeping the sim byte-identical when the feature is unused. Cross-surface crumbs
 * are untouched (the hand only attracts the surface it hovers).
 */
export function updateCrumbMagnet(ctx: SimCtx, dt: number): void {
  const magnet = ctx.state.handMagnet;
  if (!magnet) return;
  if (ctx.state.tick - magnet.tick > MAGNET_FRESH_TICKS) return;
  let banked = 0;
  for (const [id, ent] of ctx.state.crumbEnts) {
    if (ent.surface !== magnet.surface) continue;
    const dx = magnet.x - ent.pos.x;
    const dz = magnet.z - ent.pos.z;
    const d = Math.hypot(dx, dz);
    if (d <= MAGNET_CONTACT) {
      banked += ent.value;
      ctx.state.crumbEnts.delete(id);
      continue;
    }
    const v = Math.min(MAGNET_VMAX, Math.max(MAGNET_VMIN, MAGNET_K / Math.max(d, MAGNET_DIST_FLOOR)));
    const step = Math.min(d, v * dt); // never overshoot the hover point
    const inv = 1 / d;
    ent.pos.x += dx * inv * step;
    ent.pos.z += dz * inv * step;
    if (d - step <= MAGNET_CONTACT) {
      banked += ent.value;
      ctx.state.crumbEnts.delete(id);
    }
  }
  bankCrumbs(ctx, banked);
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
