import type { Critter, CritterDef, DamageType, StatusId, TileRef, Vec3 } from './types';
import type { SimCtx } from './sim';

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

export function spawnCritter(ctx: SimCtx, defId: string, at: TileRef, opts: { elite?: boolean } = {}): Critter {
  const def = critterDef(ctx, defId);
  const hpMul = ctx.diff.critterHp * (1 + ctx.modSum('allHpPct') + (def.flying ? ctx.modSum('flierHpPct') : 0));
  const pos = ctx.grid.worldOf(at);
  const jx = (ctx.rng.next() - 0.5) * 0.4;
  const jz = (ctx.rng.next() - 0.5) * 0.4;
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
    shiny: false,
    crowned: undefined,
    flying: !!def.flying,
    vel: { x: 0, y: 0, z: 0 },
    wobble: ctx.rng.next() * Math.PI * 2,
    spawnedAt: ctx.state.tick,
  };
  ctx.state.critters.set(cr.id, cr);
  ctx.emit({ t: 'spawn', id: cr.id, def: defId, at: { ...cr.pos }, shiny: cr.shiny });
  return cr;
}

/** Status-derived speed multiplier and per-tick status countdown. */
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
  cr.slowPct = Math.max(cr.slowPct, slow);
  return 1 - Math.min(0.95, cr.slowPct);
}

function effectiveSpeed(ctx: SimCtx, cr: Critter, def: CritterDef, statusMul: number): number {
  const base = def.speed * ctx.diff.critterSpeed * (1 + ctx.modSum('allSpeedPct'));
  const fear = cr.statuses.feared ? 1.25 : 1;
  return base * statusMul * fear;
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
  }
}

function arriveAtCake(ctx: SimCtx, cr: Critter, def: CritterDef): void {
  cr.state = 'eatCake';
  cr.actionT = BITE_CHANNEL;
}

function finishBite(ctx: SimCtx, cr: Critter, def: CritterDef): void {
  const bites = Math.max(0, def.bites);
  if (bites > 0 && ctx.state.cakeSlices > 0) {
    ctx.state.cakeSlices = Math.max(0, ctx.state.cakeSlices - bites);
    cr.bitesDone += bites;
    const name = def.name;
    ctx.state.recap.bitesBySource[name] = (ctx.state.recap.bitesBySource[name] ?? 0) + bites;
    ctx.emit({ t: 'cakeBite', slicesLeft: ctx.state.cakeSlices, by: cr.def, at: { ...cr.pos } });
    if (ctx.state.cakeSlices <= 0) {
      ctx.lose('cakeDevoured');
      return;
    }
  }
  cr.state = 'flee';
}

/** Walking brain: follow the cake flow field; climb, chew, or bite as the path demands. */
function walkBrain(ctx: SimCtx, cr: Critter, def: CritterDef, speed: number, dt: number): void {
  const grid = ctx.grid;
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

export function updateCritters(ctx: SimCtx, dt: number): void {
  const dead: Critter[] = [];
  for (const cr of ctx.state.critters.values()) {
    const def = critterDef(ctx, cr.def);
    cr.slowPct = 0; // aura systems re-apply each tick before movement next frame
    const statusMul = tickStatuses(cr, dt);

    switch (cr.state) {
      case 'walk': {
        if (statusMul === 0) break;
        const speed = effectiveSpeed(ctx, cr, def, statusMul);
        walkBrain(ctx, cr, def, speed, dt);
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
        chewClutter(ctx, cr, def, dt);
        break;
      }
      case 'fall':
      case 'flung': {
        cr.vel.y -= GRAVITY * dt;
        cr.pos.x += cr.vel.x * dt;
        cr.pos.y += cr.vel.y * dt;
        cr.pos.z += cr.vel.z * dt;
        const landSurf = ctx.grid.surfaceBelow(cr.pos.x, cr.pos.z, cr.pos.y + 1.5);
        const floorY = landSurf >= 0 ? ctx.grid.surfaces[landSurf].def.origin.y : 0;
        if (cr.vel.y < 0 && cr.pos.y <= floorY) {
          cr.pos.y = floorY;
          const fallFrom = cr.fallFromY ?? floorY;
          const drop = Math.max(0, fallFrom - floorY);
          cr.surface = landSurf >= 0 ? landSurf : cr.surface;
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
    if (cr.hp <= 0 && cr.state !== 'playDead') dead.push(cr);
  }
  for (const cr of dead) {
    if (ctx.state.critters.has(cr.id)) killCritter(ctx, cr, 'tower');
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
}

/** Central damage entry — handles resist/weak, armor, playDead fakeouts, and death. */
export function damageCritter(
  ctx: SimCtx,
  cr: Critter,
  amount: number,
  type: DamageType,
  cause: 'tower' | 'squash' | 'fall' | 'spell' | 'flick' | 'chain',
  opts: DamageOpts = {},
): void {
  if (!ctx.state.critters.has(cr.id)) return;
  if (cr.state === 'playDead') return; // untouchable while faking
  const def = critterDef(ctx, cr.def);
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
    const traits = def.traits ?? [];
    const extraPlays = ctx.modSum('roachExtraPlayDead');
    const maxPlays = traits.includes('playDead') ? 1 + extraPlays : 0;
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
  cause: 'tower' | 'squash' | 'fall' | 'spell' | 'flick' | 'chain',
  opts: DamageOpts = {},
): void {
  const def = critterDef(ctx, cr.def);
  ctx.state.critters.delete(cr.id);

  // recovered slice!
  if (cr.carriedSlice) {
    ctx.state.cakeSlices = Math.min(ctx.state.cakeMax, ctx.state.cakeSlices + 1);
    ctx.emit({ t: 'sliceRecovered', at: { ...cr.pos } });
  }

  // bounty drops as physical crumbs
  const bounty = Math.max(1, Math.round(def.bounty * ctx.diff.bounty * (1 + ctx.modSum('bountyPct'))));
  ctx.dropCrumbs(cr.pos, cr.surface, bounty);

  // split on death (centipedes, dust bunnies...)
  if (def.splitInto) {
    const tile = ctx.grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
    if (tile) {
      for (let i = 0; i < def.splitInto.count; i++) {
        const child = spawnCritter(ctx, def.splitInto.def, tile);
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
