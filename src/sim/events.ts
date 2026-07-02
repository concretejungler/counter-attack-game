import type { EventDef, TileRef } from './types';
import type { SimCtx } from './sim';
import { towerDefOf } from './towers';

/** Random Events (GAME-PROMPT S11) + Oh-Crap Scenarios (S12) engine. */

export const CHOICE_DEADLINE_SECONDS = 5;
const MAX_EVENTS_PER_LEVEL = 2;

const ZAP_LIGHT_SONIC: ReadonlySet<string> = new Set(['zap', 'sonic', 'light']);

/** True if this level/world combination is eligible for the given event def. */
function eligible(level: { world: number }, def: EventDef): boolean {
  if (def.worlds && !def.worlds.includes(level.world)) return false;
  return true;
}

/** Weighted seeded pick from eligible EventDefs, or null if none are eligible / the pool is empty. */
function rollEvent(ctx: SimCtx): EventDef | null {
  const pool = Object.values(ctx.content.events).filter((d) => eligible(ctx.level, d));
  if (pool.length === 0) return null;
  const totalWeight = pool.reduce((s, d) => s + Math.max(0, d.weight), 0);
  if (totalWeight <= 0) return null;
  let roll = ctx.eventRng.next() * totalWeight;
  for (const def of pool) {
    roll -= Math.max(0, def.weight);
    if (roll <= 0) return def;
  }
  return pool[pool.length - 1];
}

/** Called at the start of every wave (sim.ts), gated by SimOptions.events. Rolls at most 1-2 events per level. */
export function maybeStartEvent(ctx: SimCtx): void {
  const st = ctx.state;
  if (st.eventsThisLevel >= MAX_EVENTS_PER_LEVEL) return;
  const chance = ctx.level.eventChance ?? 0.25;
  if (!ctx.eventRng.chance(chance)) return;
  const def = rollEvent(ctx);
  if (!def) return;
  st.eventsThisLevel++;
  startEvent(ctx, def);
}

function startEvent(ctx: SimCtx, def: EventDef): void {
  const st = ctx.state;
  ctx.emit({ t: 'eventStart', id: def.id, name: def.name, text: def.text });

  if (def.choice) {
    offerChoice(ctx, def);
    return;
  }

  applyInstantOrBegin(ctx, def);
  if (def.kind === 'timed') {
    const data = def.effect === 'tvTruce' ? { tvPhase: 'freeze' as const } : undefined;
    st.activeEvents.push({ id: def.id, effect: def.effect, t: def.durationSec ?? 0, data });
  } else {
    ctx.emit({ t: 'eventEnd', id: def.id });
  }
}

function offerChoice(ctx: SimCtx, def: EventDef): void {
  if (!def.choice) return;
  ctx.state.pendingChoice = {
    id: def.id,
    prompt: def.choice.prompt,
    options: def.choice.options,
    deadline: ctx.state.time + CHOICE_DEADLINE_SECONDS,
  };
  ctx.emit({
    t: 'choiceOffered', id: def.id, prompt: def.choice.prompt, options: def.choice.options,
    deadline: ctx.state.pendingChoice.deadline,
  });
}

/** Applies an instant, non-choice effect's one-shot payload immediately. */
function applyInstantOrBegin(ctx: SimCtx, def: EventDef): void {
  switch (def.effect) {
    case 'crumbRain':
      dropCrumbsAtRandomTiles(ctx, 6, 8);
      return;
    case 'leftoverNight':
      dropCrumbPiles(ctx, 3, 15);
      return;
    case 'scentSpike':
      ctx.state.scent = Math.min(100, ctx.state.scent + 25);
      return;
    case 'quake':
      applyQuake(ctx);
      return;
    // timed effects (powerOutage/gust/tvTruce) have no one-shot payload; handled by the active-event tick loop.
    default:
      return;
  }
}

function randomFloorTile(ctx: SimCtx): TileRef | null {
  const floor = ctx.grid.surfaces[0];
  if (!floor) return null;
  const cols = floor.def.cols;
  const rows = floor.def.rows;
  for (let attempt = 0; attempt < 20; attempt++) {
    const c = ctx.eventRng.int(0, cols - 1);
    const r = ctx.eventRng.int(0, rows - 1);
    const t: TileRef = { s: 0, c, r };
    if (!ctx.grid.isStaticBlocked(t)) return t;
  }
  return null;
}

function dropCrumbsAtRandomTiles(ctx: SimCtx, count: number, valueEach: number): void {
  for (let i = 0; i < count; i++) {
    const t = randomFloorTile(ctx);
    if (!t) continue;
    ctx.dropCrumbs(ctx.grid.worldOf(t), t.s, valueEach);
  }
}

function dropCrumbPiles(ctx: SimCtx, piles: number, valueEach: number): void {
  for (let i = 0; i < piles; i++) {
    const t = randomFloorTile(ctx);
    if (!t) continue;
    ctx.dropCrumbs(ctx.grid.worldOf(t), t.s, valueEach);
  }
}

/** Spin Cycle Quake: shuffles every tower's aim + disables 1s; scatters crumbs to random nearby tiles. */
function applyQuake(ctx: SimCtx): void {
  for (const tw of ctx.state.towers.values()) {
    tw.aim = ctx.eventRng.range(-Math.PI, Math.PI);
    tw.disabled = Math.max(tw.disabled, 1);
    ctx.emit({ t: 'towerDisabled', id: tw.id, seconds: 1 });
  }
  for (const ent of ctx.state.crumbEnts.values()) {
    const t = ctx.grid.tileOfWorld(ent.surface, ent.pos.x, ent.pos.z);
    if (!t) continue;
    const dc = ctx.eventRng.int(-1, 1);
    const dr = ctx.eventRng.int(-1, 1);
    const dest: TileRef = { s: ent.surface, c: t.c + dc, r: t.r + dr };
    if (!ctx.grid.inBounds(dest) || ctx.grid.isStaticBlocked(dest)) continue;
    const w = ctx.grid.worldOf(dest);
    ent.pos.x = w.x;
    ent.pos.z = w.z;
  }
}

/** True while `powerOutage` is active anywhere -- consumed each tick to gate zap/sonic/light towers. */
function powerOutageActive(ctx: SimCtx): boolean {
  return ctx.state.activeEvents.some((a) => a.effect === 'powerOutage');
}

function gustActive(ctx: SimCtx): boolean {
  return ctx.state.activeEvents.some((a) => a.effect === 'gust');
}

/**
 * Pre-pass continuous effects for active timed events -- must run BEFORE updateCritters/updateTowers
 * each tick, since gust's hasteStamp is read-and-reset inside updateCritters (same "stamp this
 * tick, consumed this tick" convention as speedAura critters) and powerOutage's disable needs to
 * land before towers act.
 */
export function applyActiveEventEffectsPre(ctx: SimCtx): void {
  const st = ctx.state;
  if (powerOutageActive(ctx)) {
    for (const tw of st.towers.values()) {
      const def = ctx.content.towers[tw.def];
      if (def && ZAP_LIGHT_SONIC.has(def.dmgType)) {
        tw.disabled = Math.max(tw.disabled, 0.2); // continuously re-asserted while the outage lasts
      }
    }
  }
  if (gustActive(ctx)) {
    for (const cr of st.critters.values()) {
      if (cr.flying) cr.hasteStamp = Math.max(cr.hasteStamp ?? 0, 0.4);
    }
  }
  for (const ev of st.activeEvents) {
    if (ev.effect === 'tvTruce' && ev.data?.tvPhase === 'speedup') {
      for (const cr of st.critters.values()) cr.hasteStamp = Math.max(cr.hasteStamp ?? 0, 1.0); // +100% speed, everyone
    }
  }
}

/**
 * Post-pass continuous effects -- must run AFTER updateTowers, since towers.ts's updateAuraStamps
 * zeroes buffRatePct/buffDmgPct at the start of every updateTowers call before re-stamping from
 * buff-aura towers; stamping overloadChoice's +100% rate any earlier would just get wiped.
 */
export function applyActiveEventEffectsPost(ctx: SimCtx): void {
  const st = ctx.state;
  for (const ev of st.activeEvents) {
    if (ev.effect !== 'overloadChoice') continue;
    const elapsed = 20 - ev.t; // t counts down from 20
    const burnoutStart = ev.data?.burnoutDelay ?? 10;
    const burnoutIds = new Set(ev.data?.burnoutTowerIds ?? []);
    for (const tw of st.towers.values()) {
      const def = ctx.content.towers[tw.def];
      if (!def || !ZAP_LIGHT_SONIC.has(def.dmgType)) continue;
      if (burnoutIds.has(tw.id) && elapsed >= burnoutStart) {
        tw.disabled = Math.max(tw.disabled, 0.2); // burnt out for the remainder of the window
      } else {
        tw.buffRatePct = (tw.buffRatePct ?? 0) + 1.0; // +100% fire rate while overloaded and not burnt out
      }
    }
  }
}

const TV_TRUCE_SPEEDUP_SECONDS = 10;

/**
 * Ticks down active timed events; fires begin/end transitions. TV Time Truce is two-phase:
 * phase 1 ('freeze', durationSec from the EventDef -- 5s) stuns everyone, then phase 2
 * ('speedup', 10s) replaces it in-place with critters running at +100% speed. Only phase 2's
 * expiry counts as the event actually ending (no eventEnd fires at the freeze->speedup handoff).
 */
export function updateActiveEvents(ctx: SimCtx, dt: number): void {
  const st = ctx.state;
  for (const ev of [...st.activeEvents]) {
    ev.t -= dt;
    if (ev.effect === 'tvTruce' && ev.data?.tvPhase === 'freeze') applyTvTruceFreezeTick(ctx);
    if (ev.t <= 0) {
      if (ev.effect === 'tvTruce' && ev.data?.tvPhase === 'freeze') {
        ev.data = { tvPhase: 'speedup' };
        ev.t = TV_TRUCE_SPEEDUP_SECONDS;
        continue; // phase handoff -- event stays active, no eventEnd yet
      }
      st.activeEvents = st.activeEvents.filter((a) => a !== ev);
      ctx.emit({ t: 'eventEnd', id: ev.id });
    }
  }
}

/** TV Time Truce phase 1: everyone (critters AND towers) frozen. */
function applyTvTruceFreezeTick(ctx: SimCtx): void {
  for (const cr of ctx.state.critters.values()) cr.statuses.stunned = Math.max(cr.statuses.stunned ?? 0, 0.2);
  for (const tw of ctx.state.towers.values()) tw.disabled = Math.max(tw.disabled, 0.2);
}

// ---------- Oh-Crap choice resolution ----------

/** Command handler: { type: 'choose' }. No-op if there's no pending choice. */
export function applyChoose(ctx: SimCtx, option: 0 | 1): void {
  const pc = ctx.state.pendingChoice;
  if (!pc) return;
  resolveChoice(ctx, pc.id, option, false);
}

/** Called every tick (sim.ts): auto-resolves to option 1 (the passive pick) once the deadline passes. */
export function updatePendingChoice(ctx: SimCtx): void {
  const pc = ctx.state.pendingChoice;
  if (!pc) return;
  if (ctx.state.time >= pc.deadline) resolveChoice(ctx, pc.id, 1, true);
}

function resolveChoice(ctx: SimCtx, id: string, option: number, auto: boolean): void {
  ctx.state.pendingChoice = null;
  ctx.emit({ t: 'choiceMade', id, option, auto });
  const def = ctx.content.events[id];
  if (!def) {
    ctx.emit({ t: 'eventEnd', id });
    return;
  }
  applyChoiceOutcome(ctx, def, option);
  ctx.emit({ t: 'eventEnd', id });
}

function applyChoiceOutcome(ctx: SimCtx, def: EventDef, option: number): void {
  const st = ctx.state;
  switch (def.effect) {
    case 'antDiplomacy': {
      if (option === 0) {
        const cost = Math.round(st.crumbs * 0.5);
        st.crumbs -= cost;
        st.ceasefireWaves = 3;
      }
      return;
    }
    case 'overloadChoice': {
      if (option === 0) {
        // seeded 15% burnout roll per eligible tower, resolved now: burnout kicks in 10s after
        // the overload starts and lasts 10s (i.e. the last 10s of the 20s overload window).
        // Towers that don't burn out get +100% rate for the full 20s window via the continuous
        // per-tick stamp in applyActiveEventEffectsPost.
        const burnoutTowerIds: number[] = [];
        for (const tw of st.towers.values()) {
          const def2 = towerDefOf(ctx, tw.def);
          if (!ZAP_LIGHT_SONIC.has(def2.dmgType)) continue;
          if (ctx.eventRng.chance(0.15)) burnoutTowerIds.push(tw.id);
        }
        st.activeEvents.push({
          id: def.id, effect: 'overloadChoice', t: 20,
          data: { burnoutTowerIds, burnoutDelay: 10 },
        });
      }
      return;
    }
    case 'crumbAvalanche': {
      if (option === 0) {
        dropCrumbPiles(ctx, 5, 100); // 500-value spill, sweep jackpot
      } else {
        st.crumbs += 150; // MOOOOM refund -- smaller, instant, safe
        st.scent = Math.min(100, st.scent + 25);
        ctx.emit({ t: 'crumbBank', amount: 150, total: st.crumbs });
      }
      return;
    }
    case 'sockStrike': {
      if (option === 0) {
        st.crumbs = Math.max(0, st.crumbs - 100);
      } else {
        for (const tw of st.towers.values()) tw.disabled = Math.max(tw.disabled, 10);
      }
      return;
    }
    default:
      return;
  }
}
