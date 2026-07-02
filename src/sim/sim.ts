import { RNG } from '../core/rng';
import { Grid } from './grid';
import { WaveRuntime } from './waves';
import { damageCritter, spawnCritter, updateCritters } from './critters';
import { tryPlaceClutter } from './clutter';
import { tryBranchTower, tryPlaceTower, trySellTower, tryUpgradeTower, updateTowers } from './towers';
import { updateProjectiles } from './projectiles';
import { applySweep, updateCrumbEating } from './crumbs';
import {
  applyCarryCancel, applyCarryDrop, applyCarryStart, applyFlick,
  applyHighFive, applyRearmTrap, applySquash, updateHand,
} from './hand';
import { applyCast, updateSpells } from './spells';
import type {
  Critter, ContentDB, DamageType, DifficultyId, DifficultyMods, LevelDef, LossReason,
  SimCommand, SimEvent, SimOptions, SimState, TileRef, Vec3,
} from './types';

export const SIM_DT = 1 / 30;
export const BUILD_TIME = 25;          // seconds between waves before auto-call
export const EARLY_CALL_RATE = 3;      // crumbs per remaining second
export const SCENT_VALUE_CAP = 200;    // crumb-value on board that equals 100% scent
export const SWARM_HOLD_SECONDS = 60;  // time at 100% scent before THE SWARM
export const SWARM_SIZE = 50;
export const SCOUT_INTERVAL = 6;       // build-phase scout spawn period at >=50% scent

export const DIFFICULTY: Record<DifficultyId, DifficultyMods> = {
  houseguest: { critterHp: 1.0, critterSpeed: 1.0, bounty: 1.0, scentDecay: 0.4, startCrumbs: 1.0, pauseAllowed: true, cakeSlices: 1 },
  homeowner: { critterHp: 1.3, critterSpeed: 1.05, bounty: 0.9, scentDecay: 0.25, startCrumbs: 1.0, pauseAllowed: true, cakeSlices: 1 },
  landlord: { critterHp: 1.6, critterSpeed: 1.1, bounty: 0.8, scentDecay: 0.15, startCrumbs: 0.8, pauseAllowed: false, cakeSlices: 1 },
  condemned: { critterHp: 2.0, critterSpeed: 1.15, bounty: 0.7, scentDecay: 0.1, startCrumbs: 0.7, pauseAllowed: false, cakeSlices: 1 },
};

/** Shared context handed to system functions. Implemented by Sim. */
export interface SimCtx {
  state: SimState;
  level: LevelDef;
  grid: Grid;
  rng: RNG;
  content: ContentDB;
  diff: DifficultyMods;
  emit(e: SimEvent): void;
  nextId(): number;
  /** Sum of a numeric modifier across all active mutations. */
  modSum(key: string): number;
  recomputePaths(): void;
  lose(reason: LossReason): void;
  destroyClutter(id: number, how: 'chewed' | 'spell' | 'sold'): void;
  dropCrumbs(at: Vec3, surface: number, value: number): void;
}

export class Sim implements SimCtx {
  state: SimState;
  level: LevelDef;
  grid: Grid;
  rng: RNG;
  content: ContentDB;
  diff: DifficultyMods;

  private idCounter = 1;
  private events: SimEvent[] = [];
  private cmdQueue: SimCommand[] = [];
  private waveRt: WaveRuntime | null = null;
  private prevScent = 0;
  private scoutTimer = 0;
  private swarmWarned = new Set<number>();
  /** Most common ground critter in the level — used for scouts and THE SWARM. */
  private swarmDef: string;

  constructor(level: LevelDef, opts: SimOptions) {
    this.level = level;
    this.content = opts.content;
    this.rng = new RNG(opts.seed);
    this.diff = DIFFICULTY[opts.difficulty];
    this.grid = new Grid(level);
    this.grid.recompute(level.cakeTile);
    this.grid.recomputeExit(level.spawns.map((s) => s.tile));

    const counts = new Map<string, number>();
    for (const w of level.waves) {
      for (const e of w.entries) {
        const def = this.content.critters[e.critter];
        if (def && !def.flying && !def.boss) counts.set(e.critter, (counts.get(e.critter) ?? 0) + e.count);
      }
    }
    this.swarmDef = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? level.waves[0].entries[0].critter;

    this.state = {
      tick: 0,
      time: 0,
      phase: 'build',
      waveIndex: -1,
      wavesTotal: level.waves.length,
      buildTimer: -1,
      buildTimerMax: BUILD_TIME,
      crumbs: Math.round(level.startCrumbs * this.diff.startCrumbs),
      mana: 0,
      manaMax: 100,
      scent: 0,
      scentHoldT: 0,
      cakeSlices: level.cakeSlices,
      cakeMax: level.cakeSlices,
      critters: new Map(),
      towers: new Map(),
      projectiles: [],
      crumbEnts: new Map(),
      clutter: new Map(),
      clutterHand: [],
      hand: { flickCharges: 3, flickMax: 3, flickRecharge: 0, squashCd: 0, carryCd: 0, carrying: null, zapT: 0 },
      spellCds: {},
      mutations: [],
      mutationOffer: null,
      recap: {
        bitesBySource: {},
        leaksByWave: [],
        scentHistory: [],
        crumbsBanked: 0,
        crumbsWasted: 0,
        kills: 0,
        killsByTower: {},
        sweeps: 0,
        directorNotes: [],
      },
      speedMult: 1,
    };
    this.dealClutterHand();
  }

  // ---------- SimCtx ----------
  emit(e: SimEvent): void {
    this.events.push(e);
  }

  nextId(): number {
    return this.idCounter++;
  }

  modSum(key: string): number {
    let sum = 0;
    for (const id of this.state.mutations) {
      const def = this.content.mutations[id];
      if (def && key in def.mod) sum += def.mod[key];
    }
    return sum;
  }

  recomputePaths(): void {
    this.grid.recompute(this.level.cakeTile);
    this.grid.recomputeExit(this.level.spawns.map((s) => s.tile));
  }

  lose(reason: LossReason): void {
    if (this.state.phase === 'lost' || this.state.phase === 'won') return;
    this.state.phase = 'lost';
    this.emit({ t: 'lost', reason });
  }

  destroyClutter(id: number, how: 'chewed' | 'spell' | 'sold'): void {
    const piece = this.state.clutter.get(id);
    if (!piece) return;
    this.state.clutter.delete(id);
    this.grid.clearClutter(id);
    // any towers on top come crashing down (unless the Hand is holding them)
    for (const towerId of piece.mounted) {
      const tw = this.state.towers.get(towerId);
      if (!tw) continue;
      tw.mountClutter = null;
      if (tw.carried) continue;
      tw.downed = true;
      tw.pos = { ...tw.pos, y: this.grid.worldOf(tw.tile).y };
      this.emit({ t: 'towerDropped', id: towerId, at: { ...tw.pos } });
    }
    this.emit({ t: 'clutterGone', id });
    this.recomputePaths();
  }

  dropCrumbs(at: Vec3, surface: number, value: number): void {
    const id = this.nextId();
    const ent = {
      id,
      pos: { x: at.x, y: at.y, z: at.z },
      surface,
      value,
      sweepT: 0,
    };
    this.state.crumbEnts.set(id, ent);
    this.emit({ t: 'crumbDrop', id, at: { ...at }, value });
  }

  // ---------- public API ----------
  command(c: SimCommand): void {
    this.cmdQueue.push(c);
  }

  tick(): SimEvent[] {
    if (this.state.phase === 'won' || this.state.phase === 'lost') {
      this.cmdQueue.length = 0;
      return [];
    }
    const dt = SIM_DT;
    const st = this.state;
    st.tick++;
    st.time += dt;

    // 1. commands
    const cmds = this.cmdQueue.splice(0, this.cmdQueue.length);
    for (const cmd of cmds) this.applyCommand(cmd);

    // 2. build timer auto-call
    if (st.phase === 'build' && st.buildTimer > 0 && !st.mutationOffer) {
      st.buildTimer -= dt;
      if (st.buildTimer <= 0) this.startWave(0);
    }

    // 3. build-phase scent scouts
    if (st.phase === 'build' && st.scent >= 50) {
      this.scoutTimer += dt;
      if (this.scoutTimer >= SCOUT_INTERVAL) {
        this.scoutTimer = 0;
        const spawn = this.rng.pick(this.level.spawns);
        spawnCritter(this, this.swarmDef, spawn.tile);
        this.emit({ t: 'scoutSpawn', def: this.swarmDef });
      }
    }

    // 4. wave spawns
    if (st.phase === 'assault' && this.waveRt) {
      for (const req of this.waveRt.update(dt)) {
        const spawn = this.level.spawns.find((s) => s.id === req.spawn) ?? this.level.spawns[0];
        spawnCritter(this, req.critter, spawn.tile);
      }
    }

    // 5. entities & systems
    updateHand(this, dt);
    updateCritters(this, dt);
    updateTowers(this, dt);
    updateProjectiles(this, dt);
    updateCrumbEating(this, dt);
    updateSpells(this, dt);
    this.updateScent(dt);

    // 6. centralized loss: the cake is gone AND nobody is carrying a recoverable slice
    if (st.cakeSlices <= 0) {
      let carrierAlive = false;
      for (const c of st.critters.values()) {
        if (c.carriedSlice) { carrierAlive = true; break; }
      }
      if (!carrierAlive) this.lose('cakeDevoured');
    }

    // 7. wave clear / win
    if (st.phase === 'assault' && this.waveRt?.done && st.critters.size === 0) {
      this.onWaveClear();
    }

    // 8. recap sampling (1/s)
    if (st.tick % 30 === 0) st.recap.scentHistory.push(Math.round(st.scent));

    return this.events.splice(0, this.events.length);
  }

  /** Test/tooling hooks — also used by the balance harness and debug console. */
  debugSpawn(def: string, at: TileRef): Critter {
    return spawnCritter(this, def, at);
  }

  debugDamage(id: number, amount: number, type: DamageType): void {
    const cr = this.state.critters.get(id);
    if (cr) damageCritter(this, cr, amount, type, 'spell');
  }

  // ---------- internals ----------
  private applyCommand(cmd: SimCommand): void {
    switch (cmd.type) {
      case 'callWave': {
        if (this.state.phase !== 'build' || this.state.mutationOffer) return;
        const bonus = this.state.buildTimer > 0 ? Math.round(this.state.buildTimer * EARLY_CALL_RATE) : 0;
        this.startWave(bonus);
        return;
      }
      case 'pickMutation': {
        const offer = this.state.mutationOffer;
        if (!offer || !offer.includes(cmd.id)) return;
        this.state.mutations.push(cmd.id);
        this.state.mutationOffer = null;
        this.emit({ t: 'mutationPicked', id: cmd.id });
        return;
      }
      case 'placeClutter':
        tryPlaceClutter(this, cmd.shape, cmd.rot, cmd.at);
        return;
      case 'placeTower':
        tryPlaceTower(this, cmd.def, cmd.at);
        return;
      case 'upgradeTower':
        tryUpgradeTower(this, cmd.id);
        return;
      case 'branchTower':
        tryBranchTower(this, cmd.id, cmd.branch);
        return;
      case 'sellTower':
        trySellTower(this, cmd.id);
        return;
      case 'flick':
        applyFlick(this, cmd.critterId, cmd.dir, cmd.power);
        return;
      case 'squash':
        applySquash(this, cmd.critterId);
        return;
      case 'sweep':
        applySweep(this, cmd.surface, cmd.x, cmd.z, cmd.radius);
        return;
      case 'carryStart':
        applyCarryStart(this, cmd.towerId);
        return;
      case 'carryDrop':
        applyCarryDrop(this, cmd.at);
        return;
      case 'carryCancel':
        applyCarryCancel(this);
        return;
      case 'highFive':
        applyHighFive(this, cmd.towerId);
        return;
      case 'rearmTrap':
        applyRearmTrap(this, cmd.towerId);
        return;
      case 'castSpell':
        applyCast(this, cmd.spell, cmd.surface, cmd.x, cmd.z);
        return;
    }
  }

  private startWave(bonusCrumbs: number): void {
    const st = this.state;
    st.waveIndex++;
    const wave = this.level.waves[st.waveIndex];
    if (!wave) return;
    const countScale = st.scent >= 25 ? 1.1 : 1.0;
    this.waveRt = new WaveRuntime(wave, countScale);
    st.phase = 'assault';
    st.buildTimer = -1;
    if (bonusCrumbs > 0) {
      st.crumbs += bonusCrumbs;
      st.recap.crumbsBanked += bonusCrumbs;
      this.emit({ t: 'crumbBank', amount: bonusCrumbs, total: st.crumbs });
    }
    this.emit({ t: 'waveStart', index: st.waveIndex, total: st.wavesTotal });
  }

  private onWaveClear(): void {
    const st = this.state;
    this.emit({ t: 'waveClear', index: st.waveIndex, earlyBonus: 0 });
    for (const tw of st.towers.values()) tw.ageWaves++;
    if (st.waveIndex >= st.wavesTotal - 1) {
      st.phase = 'won';
      this.emit({ t: 'won', bitesTaken: st.cakeMax - st.cakeSlices });
      return;
    }
    st.phase = 'build';
    st.buildTimer = BUILD_TIME;
    st.buildTimerMax = BUILD_TIME;
    this.scoutTimer = 0;
    this.dealClutterHand();
    this.emit({ t: 'buildPhase', index: st.waveIndex + 1, clutterHand: [...st.clutterHand] });

    // mutation draft? (mutationWaves entries are 1-based wave numbers)
    const waveNum = st.waveIndex + 1;
    if (this.level.mutationWaves?.includes(waveNum)) {
      const all = Object.keys(this.content.mutations).filter((m) => !st.mutations.includes(m));
      const offer = this.rng.shuffle(all).slice(0, Math.min(3, all.length));
      if (offer.length > 0) {
        st.mutationOffer = offer;
        this.emit({ t: 'mutationOffer', options: [...offer] });
      }
    }
  }

  private dealClutterHand(): void {
    const st = this.state;
    const deck = this.level.clutterDeck;
    if (deck.length === 0) {
      st.clutterHand = [];
      return;
    }
    st.clutterHand = Array.from({ length: this.level.clutterPerWave }, () => this.rng.pick(deck));
  }

  private updateScent(dt: number): void {
    const st = this.state;
    let total = 0;
    for (const c of st.crumbEnts.values()) total += c.value;
    const target = Math.min(100, (total / SCENT_VALUE_CAP) * 100);
    if (target > st.scent) {
      st.scent = Math.min(target, st.scent + 15 * dt);
    } else {
      const fall = 5 + 20 * this.diff.scentDecay;
      st.scent = Math.max(target, st.scent - fall * dt);
    }

    // threshold events
    for (const th of [25, 50, 75, 100] as const) {
      if (this.prevScent < th && st.scent >= th) this.emit({ t: 'scentThreshold', threshold: th, rising: true });
      if (this.prevScent >= th && st.scent < th) this.emit({ t: 'scentThreshold', threshold: th, rising: false });
    }
    this.prevScent = st.scent;

    // THE SWARM
    if (st.scent >= 99.5) {
      st.scentHoldT += dt;
      const left = SWARM_HOLD_SECONDS - st.scentHoldT;
      for (const warnAt of [45, 30, 15, 5]) {
        if (left <= warnAt && !this.swarmWarned.has(warnAt)) {
          this.swarmWarned.add(warnAt);
          this.emit({ t: 'swarmWarning', secondsLeft: Math.max(0, Math.round(left)) });
        }
      }
      if (st.scentHoldT >= SWARM_HOLD_SECONDS) {
        st.scentHoldT = 0;
        this.swarmWarned.clear();
        for (let i = 0; i < SWARM_SIZE; i++) {
          const spawn = this.level.spawns[i % this.level.spawns.length];
          spawnCritter(this, this.swarmDef, spawn.tile);
        }
        // the horde consumed the trail
        for (const id of [...st.crumbEnts.keys()]) st.crumbEnts.delete(id);
        st.scent = 50;
      }
    } else {
      st.scentHoldT = 0;
      this.swarmWarned.clear();
    }
  }
}

/** Stable plain-object snapshot for determinism checks and saves. */
export function serializeSim(sim: Sim): object {
  const st = sim.state;
  return {
    tick: st.tick,
    phase: st.phase,
    waveIndex: st.waveIndex,
    crumbs: st.crumbs,
    mana: st.mana,
    scent: st.scent,
    cakeSlices: st.cakeSlices,
    rng: sim.rng.getState(),
    critters: [...st.critters.values()]
      .sort((a, b) => a.id - b.id)
      .map((c) => ({ id: c.id, def: c.def, hp: c.hp, x: c.pos.x, y: c.pos.y, z: c.pos.z, state: c.state, surface: c.surface })),
    towers: [...st.towers.values()]
      .sort((a, b) => a.id - b.id)
      .map((t) => ({ id: t.id, def: t.def, tier: t.tier, branch: t.branch, tile: t.tile, kills: t.kills })),
    crumbEnts: [...st.crumbEnts.values()].sort((a, b) => a.id - b.id).map((c) => ({ id: c.id, value: c.value, x: c.pos.x, z: c.pos.z })),
    clutter: [...st.clutter.values()].sort((a, b) => a.id - b.id).map((p) => ({ id: p.id, shape: p.shape, hp: p.hp, anchor: p.anchor })),
    mutations: [...st.mutations],
  };
}
