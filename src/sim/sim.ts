import { RNG } from '../core/rng';
import { Grid } from './grid';
import { WaveRuntime } from './waves';
import { damageCritter, spawnCritter, updateCritters } from './critters';
import { tryPlaceClutter } from './clutter';
import { towerStats, tryBranchTower, tryPlaceTower, trySellTower, tryUpgradeTower, updateTowers } from './towers';
import { updateProjectiles } from './projectiles';
import { applySweep, updateCrumbEating, updateCrumbMagnet } from './crumbs';
import {
  applyCarryCancel, applyCarryDrop, applyCarryStart, applyFlick,
  applyHighFive, applyJarCancel, applyJarStart, applyRearmTrap, applySquash, isJarTower, updateHand,
} from './hand';
import { applyCast, updateSpells } from './spells';
import { spawnGrudges } from './grudges';
import { DirectorMemory, augmentWave, forecastText, recordWaveTelemetry } from './director';
import { ENDLESS_MUTATION_EVERY, nextEndlessWave } from './endless';
import {
  applyActiveEventEffectsPost, applyActiveEventEffectsPre, applyChoose,
  maybeStartEvent, updateActiveEvents, updatePendingChoice,
} from './events';
import { dogCrumbTax, initPet, petOnBuildPhase, petOnWaveStart, updatePet } from './pets';
import type {
  Critter, ContentDB, DamageType, DifficultyId, DifficultyMods, LevelDef, LossReason,
  SimCommand, SimEvent, SimOptions, SimState, TileRef, Vec3, WaveDef,
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
  /**
   * Independent seeded streams reserved for cosmetic/side-channel randomness that must stay
   * deterministic per seed but should never perturb the main gameplay RNG sequence (positions,
   * clutter deals, mutation shuffles, AI-relevant draws) — dozens of hand-tuned balance
   * par-scripts depend on that sequence staying byte-stable run to run.
   */
  shinyRng: RNG;    // shiny-critter roll (GAME-PROMPT §2.5)
  grudgeRng: RNG;   // grudge name picks + crowned-elite spawn-door picks (GAME-PROMPT §2.6)
  eventRng: RNG;    // random event rolls + effect randomness (GAME-PROMPT §11/§12) — inert unless SimOptions.events
  directorRng: RNG; // Director AI augmentation picks (GAME-PROMPT §13) — inert unless SimOptions.director
  petRng: RNG;      // pet chaos-agent rolls (GAME-PROMPT §9) — inert unless SimOptions.pet
  endlessRng: RNG;  // Pantry Panic procedural wave generation (GAME-PROMPT §16) — inert unless SimOptions.endless
  content: ContentDB;
  diff: DifficultyMods;
  /** INFESTATION MODE (§15) run-long relic effects — see Sim.runMods doc. Always {} outside a run that sets SimOptions.runMods. */
  runMods: NonNullable<SimOptions['runMods']>;
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
  shinyRng: RNG;
  grudgeRng: RNG;
  eventRng: RNG;
  directorRng: RNG;
  petRng: RNG;
  endlessRng: RNG;
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

  /** Director AI (§13) — inert (constructor default false) unless SimOptions.director or LevelDef.director is true. */
  readonly directorOn: boolean;
  private directorMem = new DirectorMemory();
  /** Random events (§11) + Oh-Crap scenarios (§12) — inert unless SimOptions.events is true. */
  readonly eventsOn: boolean;
  /** Pet chaos agent (§9) — undefined unless SimOptions.pet is set. */
  readonly petKind: 'cat' | 'dog' | 'goldfish' | undefined;
  /** Pantry Panic — Endless mode (§16) — inert (constructor default false) unless SimOptions.endless is true. */
  readonly endlessOn: boolean;
  /**
   * INFESTATION MODE (§15) run-long relic effects — inert (all fields undefined/no-op) unless
   * SimOptions.runMods is set. Read by towerStats() (dmgPct/ratePct/rangePct), trySellTower()
   * (sellRefundPct), and Sim.dropCrumbs() (crumbPct). cakeSlices is consumed once at construction
   * (see state.cakeSlices/cakeMax init below) and not read again after that.
   */
  readonly runMods: NonNullable<SimOptions['runMods']>;
  /** recap.sweeps snapshot at the start of the wave in progress, used to detect zero-sweep waves for the Director. */
  private sweepsAtWaveStart = 0;
  /**
   * Every event emitted since the current wave started, so onWaveClear's Director telemetry sees
   * the WHOLE wave — `this.events` alone only holds the current tick's events (it's drained by
   * every `tick()` return), which would otherwise starve recordWaveTelemetry down to one tick.
   */
  private waveEventLog: SimEvent[] = [];
  /**
   * Endless mode (§16) elite-wave mini-boss hp scaling: WaveRuntime/SpawnRequest (waves.ts) only
   * carry {critter, spawn} — they don't thread a per-entry hp multiplier through. Since a
   * generated WaveDef's hpMul is only ever set on at most one entry (the mini-boss), sim.ts keeps
   * a small critter-id -> multiplier side table populated from the generated wave at startWave and
   * consumes it (delete-on-use) the first time that species spawns this wave.
   */
  private endlessHpMulByCritter = new Map<string, number>();

  constructor(level: LevelDef, opts: SimOptions) {
    this.level = level;
    this.content = opts.content;
    this.rng = new RNG(opts.seed);
    this.shinyRng = new RNG((opts.seed ^ 0x5348_4e59) >>> 0);    // 'SHNY' XOR-mixed, independent stream
    this.grudgeRng = new RNG((opts.seed ^ 0x4752_4447) >>> 0);   // 'GRDG' XOR-mixed, independent stream
    this.eventRng = new RNG((opts.seed ^ 0x4556_4e54) >>> 0);    // 'EVNT' XOR-mixed, independent stream
    this.directorRng = new RNG((opts.seed ^ 0x4449_5245) >>> 0); // 'DIRE' XOR-mixed, independent stream
    this.petRng = new RNG((opts.seed ^ 0x5045_5453) >>> 0);      // 'PETS' XOR-mixed, independent stream
    this.endlessRng = new RNG((opts.seed ^ 0x454e_444c) >>> 0);  // 'ENDL' XOR-mixed, independent stream
    this.directorOn = !!opts.director || !!level.director;
    this.eventsOn = !!opts.events;
    this.petKind = opts.pet;
    this.endlessOn = !!opts.endless;
    this.runMods = opts.runMods ?? {};
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
      crumbs: Math.round(level.startCrumbs * this.diff.startCrumbs * (1 + (opts.metaMods?.startCrumbsPct ?? 0))),
      mana: 0,
      manaMax: 100 + (opts.metaMods?.manaMax ?? 0),
      scent: 0,
      scentHoldT: 0,
      cakeSlices: opts.runMods?.cakeSlices ?? level.cakeSlices,
      cakeMax: opts.runMods?.cakeSlices ?? level.cakeSlices,
      critters: new Map(),
      towers: new Map(),
      projectiles: [],
      crumbEnts: new Map(),
      clutter: new Map(),
      clutterHand: [],
      hand: { flickCharges: 3 + (opts.metaMods?.flickMax ?? 0), flickMax: 3 + (opts.metaMods?.flickMax ?? 0), flickRecharge: 0, squashCd: 0, carryCd: 0, carrying: null, zapT: 0 },
      handMagnet: null,
      spellCds: {},
      mutations: [],
      mutationOffer: null,
      grudges: [],
      jarring: null,
      jarredStock: [],
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
      activeEvents: [],
      eventsThisLevel: 0,
      pendingChoice: null,
      ceasefireWaves: 0,
      pet: null,
      endlessDepth: 0,
      allowedTowersOverride: opts.allowedTowersOverride,
    };
    // INFESTATION MODE (§15) curses: applied at tick 0 so their `mod` effects (read via ctx.modSum)
    // are live from the very first tick. Unknown ids (not in content.mutations) are ignored rather
    // than throwing — a stale/renamed curse id shouldn't hard-crash a run. Validated against
    // content.mutations, not de-duped against itself (a caller passing duplicate ids gets duplicate
    // mod contributions, same as any other multi-mutation stacking in this game).
    if (opts.preMutations) {
      for (const id of opts.preMutations) {
        if (this.content.mutations[id]) this.state.mutations.push(id);
      }
    }
    this.dealClutterHand();
    if (this.petKind) this.state.pet = initPet(this, this.petKind);
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
    // Sir Barksalot (§9): eats 15% of each crumb drop's value before it lands.
    const taxed = dogCrumbTax(this, value);
    if (taxed <= 0) return;
    // INFESTATION MODE (§15) relics: crumbPct scales every crumb drop's value (bounties, worker
    // drops, event crumbs, etc.) after the dog tax. Rounded so crumb values stay integers like
    // every other crumb-value computation in the sim.
    const scaled = this.runMods.crumbPct ? Math.round(taxed * (1 + this.runMods.crumbPct)) : taxed;
    if (scaled <= 0) return;
    const id = this.nextId();
    const ent = {
      id,
      pos: { x: at.x, y: at.y, z: at.z },
      surface,
      value: scaled,
      sweepT: 0,
    };
    this.state.crumbEnts.set(id, ent);
    this.emit({ t: 'crumbDrop', id, at: { ...at }, value: scaled });
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
        spawnCritter(this, this.swarmDef, spawn.tile, { shinyEligible: false });
        this.emit({ t: 'scoutSpawn', def: this.swarmDef });
      }
    }

    // 4. wave spawns
    if (st.phase === 'assault' && this.waveRt) {
      for (const req of this.waveRt.update(dt)) {
        const spawn = this.level.spawns.find((s) => s.id === req.spawn) ?? this.level.spawns[0];
        const cr = spawnCritter(this, req.critter, spawn.tile);
        // Endless mode elite mini-bosses (§16): apply + consume this wave's hp multiplier (if any)
        // for this species. Scales hp post-spawn so src/sim/critters.ts (out of scope for this
        // feature) never needs a new spawn parameter.
        if (this.endlessOn && this.endlessHpMulByCritter.has(req.critter)) {
          const mul = this.endlessHpMulByCritter.get(req.critter)!;
          this.endlessHpMulByCritter.delete(req.critter);
          cr.hp = Math.round(cr.hp * mul);
          cr.maxHp = Math.round(cr.maxHp * mul);
        }
        // EXTERMINATOR ALLIANCE FINALE (GAME-PROMPT §8.9, sewer-3): the instant the boss himself
        // spawns, every critter that was ALREADY alive defects — the dramatic beat is the flip.
        // Authored escort entries that spawn later (his goons) stay hostile by design; only the
        // alive-at-spawn set turns. The exterminator's own fresh spawn is excluded (it's the boss).
        if (req.critter === 'the-exterminator') this.triggerAlliance(cr.id);
      }
    }

    // 4b. random events (§11) + Oh-Crap scenarios (§12) — fully inert unless SimOptions.events
    if (this.eventsOn) {
      updatePendingChoice(this);
      applyActiveEventEffectsPre(this);
    }

    // 5. entities & systems
    updateHand(this, dt);
    updateCritters(this, dt);
    updateTowers(this, dt);
    if (this.eventsOn) applyActiveEventEffectsPost(this);
    this.updateStationaryAutoSweep();
    updateProjectiles(this, dt);
    updateCrumbEating(this, dt);
    updateCrumbMagnet(this, dt);
    updateSpells(this, dt);
    this.updateScent(dt);
    if (this.eventsOn) updateActiveEvents(this, dt);
    if (this.state.pet) updatePet(this, dt);

    // 6. centralized loss: the cake is gone AND nobody is carrying a recoverable slice
    if (st.cakeSlices <= 0) {
      let carrierAlive = false;
      let exterminatorAlive = false;
      for (const c of st.critters.values()) {
        if (c.carriedSlice) carrierAlive = true;
        if (c.def === 'the-exterminator') exterminatorAlive = true;
      }
      if (!carrierAlive) {
        // Alliance finale (§8.9): losing sewer-3's final wave with the boss still up is a
        // different ending than the ordinary cake-devoured loss — GAME-PROMPT §19 "Exterminated".
        this.lose(exterminatorAlive ? 'exterminated' : 'cakeDevoured');
      }
    }

    // 7. wave clear / win: the boss + every non-allied critter are gone. Allied critters (§8.9)
    // may still be alive fighting the exterminator (or idling, harmlessly, after he's already
    // dead) — they never block a wave from clearing.
    if (st.phase === 'assault' && this.waveRt?.done) {
      let blocking = false;
      for (const c of st.critters.values()) {
        if (!c.allied) { blocking = true; break; }
      }
      if (!blocking) this.onWaveClear();
    }

    // 8. recap sampling (1/s)
    if (st.tick % 30 === 0) st.recap.scentHistory.push(Math.round(st.scent));

    if (this.directorOn) this.waveEventLog.push(...this.events);
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
      case 'placeTower': {
        if (isJarTower(this, cmd.def)) {
          // jarred-unique towers are placeable only while earned stock is available; they cost 0 crumbs.
          const stockIdx = this.state.jarredStock.indexOf(cmd.def);
          if (stockIdx === -1) return;
          if (tryPlaceTower(this, cmd.def, cmd.at)) this.state.jarredStock.splice(stockIdx, 1);
          return;
        }
        tryPlaceTower(this, cmd.def, cmd.at);
        return;
      }
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
      case 'handMove':
        // hand-magnet: remember where the Hand hovers + when, so updateCrumbMagnet can drift crumbs
        // toward it while the target stays fresh. Additive & inert unless a real pointer feeds it.
        this.state.handMagnet = { surface: cmd.surface, x: cmd.x, z: cmd.z, tick: this.state.tick };
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
      case 'jarStart':
        applyJarStart(this, cmd.critterId);
        return;
      case 'jarCancel':
        applyJarCancel(this);
        return;
      case 'choose':
        applyChoose(this, cmd.option);
        return;
    }
  }

  private startWave(bonusCrumbs: number): void {
    const st = this.state;
    st.waveIndex++;
    const authoredWave = this.level.waves[st.waveIndex];
    // Pantry Panic — Endless mode (§16): once authored waves run out, generate the next one
    // procedurally instead of stalling out. Fully inert unless SimOptions.endless is true.
    const generatedWave = !authoredWave && this.endlessOn ? nextEndlessWave(this, this.level, st.endlessDepth + 1) : null;
    if (!authoredWave && !generatedWave) return;
    if (generatedWave) st.endlessDepth++;
    st.phase = 'assault';
    st.buildTimer = -1;
    if (bonusCrumbs > 0) {
      st.crumbs += bonusCrumbs;
      st.recap.crumbsBanked += bonusCrumbs;
      this.emit({ t: 'crumbBank', amount: bonusCrumbs, total: st.crumbs });
    }

    // Ant Diplomacy ceasefire (§12): skip this wave's spawns entirely while the truce holds.
    if (st.ceasefireWaves > 0) {
      st.ceasefireWaves--;
      this.waveRt = new WaveRuntime({ entries: [] }, 1);
      this.emit({ t: 'waveStart', index: st.waveIndex, total: st.wavesTotal });
      return;
    }

    const countScale = st.scent >= 25 ? 1.1 : 1.0;
    // Director AI (§13): augments the wave (never replaces authored entries) when enabled. The
    // sweepsAtWaveStart snapshot + a fresh waveEventLog let onWaveClear see exactly this wave's
    // sweep count and hit/leak events (this.events alone is drained every single tick).
    this.sweepsAtWaveStart = st.recap.sweeps;
    this.waveEventLog = [];
    let wave = generatedWave ?? authoredWave!;
    if (this.directorOn && authoredWave) {
      const spawnId = this.level.spawns[0]?.id ?? '';
      const { wave: augmented, note } = augmentWave(this, this.level, authoredWave, this.directorMem, spawnId);
      wave = augmented;
      if (note) st.recap.directorNotes.push(note);
    }
    // Endless hp-scaled entries (mini-bosses): index by critter id for the tick loop to consume
    // (see endlessHpMulByCritter doc comment — WaveRuntime/SpawnRequest don't carry hpMul through).
    this.endlessHpMulByCritter.clear();
    if (generatedWave) {
      for (const e of wave.entries) if (e.hpMul && e.hpMul !== 1) this.endlessHpMulByCritter.set(e.critter, e.hpMul);
    }
    this.waveRt = new WaveRuntime(wave, countScale);
    spawnGrudges(this);
    if (this.eventsOn) maybeStartEvent(this);
    if (this.state.pet) petOnWaveStart(this);
    this.emit({ t: 'waveStart', index: st.waveIndex, total: st.wavesTotal });
  }

  private onWaveClear(): void {
    const st = this.state;
    this.emit({ t: 'waveClear', index: st.waveIndex, earlyBonus: 0 });
    for (const tw of st.towers.values()) tw.ageWaves++;

    // Director AI (§13): fold this whole wave's events + sweep count into rolling telemetry.
    // waveEventLog holds everything emitted since startWave (this.events alone only holds the
    // current tick — it's drained on every tick() return, long before the wave actually ends).
    if (this.directorOn) {
      const sweptCount = st.recap.sweeps - this.sweepsAtWaveStart;
      recordWaveTelemetry(this, this.directorMem, [...this.waveEventLog, ...this.events], sweptCount);
    }

    // Pantry Panic — Endless mode (§16): winning never triggers on wave exhaustion when endless
    // is on — instead play just continues (startWave will generate the next wave procedurally).
    if (st.waveIndex >= st.wavesTotal - 1 && !this.endlessOn) {
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
    if (this.state.pet) petOnBuildPhase(this, st.waveIndex + 1);

    // Director forecast (§13): a deliberately-partial weather-report preview of the next wave,
    // including whether the Director would currently augment it (telemetry can still shift
    // before it actually fires at that wave's startWave — the forecast is allowed to be partial).
    if (this.directorOn) {
      const nextWave = this.level.waves[st.waveIndex + 1];
      if (nextWave) {
        this.emit({ t: 'forecast', text: forecastText(this, this.level, nextWave, this.directorMem) });
      }
    }

    // mutation draft? (mutationWaves entries are 1-based wave numbers; endless offers one every
    // ENDLESS_MUTATION_EVERY-th GENERATED wave, reusing this same mutationOffer path per §16).
    const waveNum = st.waveIndex + 1;
    const endlessMutationDue = this.endlessOn && st.endlessDepth > 0 && st.endlessDepth % ENDLESS_MUTATION_EVERY === 0;
    if (this.level.mutationWaves?.includes(waveNum) || endlessMutationDue) {
      const all = Object.keys(this.content.mutations).filter((m) => !st.mutations.includes(m));
      const offer = this.rng.shuffle(all).slice(0, Math.min(3, all.length));
      if (offer.length > 0) {
        st.mutationOffer = offer;
        this.emit({ t: 'mutationOffer', options: [...offer] });
      }
    }
  }

  /**
   * EXTERMINATOR ALLIANCE FINALE (GAME-PROMPT §8.9, sewer-3): flips every currently-alive
   * non-boss critter (everyone except the exterminator itself, id `exterminatorId`) to `allied`.
   * Any in-flight action state (mid-bite, fleeing, chewing clutter, climbing, latched onto a
   * tower...) is reset to a clean 'walk' state so alliedBrain (critters.ts) takes over immediately
   * — that's the dramatic beat, it should read instantly, not finish out a stale action first.
   * Latched towers are released so they don't stay disabled by a critter that no longer means it
   * harm. A defector caught mid-heist (Mouse Thief carrying a stolen slice) drops it back — same
   * "slice recovered" treatment a kill would give it, since it's on our side now.
   */
  private triggerAlliance(exterminatorId: number): void {
    const st = this.state;
    let count = 0;
    for (const cr of st.critters.values()) {
      if (cr.id === exterminatorId) continue;
      const def = this.content.critters[cr.def];
      if (def?.boss) continue; // other bosses (shouldn't co-occur, but stay hostile defensively)
      if (cr.allied) continue;
      cr.allied = true;
      cr.state = 'walk';
      cr.chewTarget = undefined;
      cr.decoyTarget = undefined;
      cr.latchTarget = undefined;
      if (cr.carriedSlice) {
        cr.carriedSlice = false;
        st.cakeSlices = Math.min(st.cakeMax, st.cakeSlices + 1);
        this.emit({ t: 'sliceRecovered', at: { ...cr.pos } });
      }
      count++;
    }
    if (count > 0) this.emit({ t: 'alliance', count });
  }

  /**
   * Stationary aura towers with an `autoSweep` extra but no `roam` (currently just the jarred
   * Queen Ant Jar — see GAME-PROMPT §2.5: "spawns friendly worker ants that sweep crumbs FOR
   * you", implemented here as a passive bank-in-range aura rather than literal roaming spawns).
   * Vroomba-style roam towers already auto-sweep inside updateRoamTower (towers.ts) — this pass
   * is gated to skip anything with `roam` set so the two paths never double-fire.
   */
  private updateStationaryAutoSweep(): void {
    const st = this.state;
    for (const tw of st.towers.values()) {
      if (tw.disabled > 0 || tw.carried || tw.downed) continue;
      const def = this.content.towers[tw.def];
      if (!def || def.attack !== 'aura') continue;
      const stats = towerStats(this, tw);
      if (!stats.extra.autoSweep || stats.extra.roam) continue;
      for (const ent of [...st.crumbEnts.values()]) {
        if (ent.surface !== tw.tile.s) continue;
        const d = Math.hypot(ent.pos.x - tw.pos.x, ent.pos.z - tw.pos.z);
        if (d > stats.extra.autoSweep) continue;
        st.crumbEnts.delete(ent.id);
        st.crumbs += ent.value;
        st.recap.crumbsBanked += ent.value;
        this.emit({ t: 'crumbBank', amount: ent.value, total: st.crumbs });
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
          spawnCritter(this, this.swarmDef, spawn.tile, { shinyEligible: false });
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
