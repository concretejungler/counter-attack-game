import { DIFFICULTY, Sim, SIM_DT } from './sim/sim';
import type { LevelDef, SimEvent, TileRef, Vec3 } from './sim/types';
import { rotateCells } from './sim/clutter';
import { CONTENT, ALL_LEVELS, CAMPAIGN_LEVELS, levelById } from './content';
import { createGameView } from './render/createView';
import type { GameView, RendererKind, HandPose } from './render/view';
import { UI } from './ui/ui';
import { AudioMan } from './audio/audio';
import { Sfx } from './audio/sfx';
import { Music, type BossId } from './audio/music';
import { loadSave, persistSave, type SaveData } from './meta/save';
import { weeklySeed } from './sim/endless';
import { evaluateAchievements, evaluateSingle, purchase, type AchievementDef } from './meta/achievements';
import { metaModsFromSave, isSecretUnlocked, type SecretLevelId } from './meta/progress';
import {
  newRun, reachableNodeIndices, currentFloorNodes, nodeAt, seedForNode, runModsForFight,
  draftOptions, addToDeck, fightRewardScraps, isEliteNode, isBossNode, isFinalBoss,
  shopPrice, rollShopWares, RELICS_BY_ID, CURSE_POOL, dailyChoreFor, dayNumber,
  type RunState, type NodeDef,
} from './meta/infestation';
import { RNG } from './core/rng';
import { setArachnophobiaMode } from './render/models/critterModels';
import { setArachnophobiaMode2D } from './render2d/entities';
import { isMobileViewport } from './core/device';

type Mode =
  | { kind: 'idle' }
  | { kind: 'placeTower'; def: string }
  | { kind: 'placeClutter'; shape: string; rot: 0 | 1 | 2 | 3 }
  | { kind: 'spell'; id: string }
  | { kind: 'carry'; towerId: number };

interface Gesture {
  type: 'critter' | 'sweep';
  critterId?: number;
  startX: number;
  startY: number;
  startT: number;
  lastSweep: number;
  /** Last swept board point (world units) + surface, used to interpolate a continuous swept path
   *  across fast drags whose throttled 90ms samples would otherwise leave gaps. */
  lastSweepX?: number;
  lastSweepZ?: number;
  lastSweepSurface?: number;
  /** true while this gesture is a touch/pen press-and-hold on a tower, waiting to decide long-press (carry) vs tap (inspect). */
  towerHoldId?: number;
}

/**
 * Player-facing crumb pickup radius, in tiles (1 world unit = 1 tile). A sweep banks every crumb
 * within this radius of the swept board point. Deliberately generous (~1.7 tiles) so tapping or
 * dragging NEAR a crumb collects it and precise aim isn't required — especially on touch screens.
 * This is intentionally separate from the balance harness, which passes its own radius (1.4, see
 * tests/harness/autoplay.ts), so widening player forgiveness never shifts the difficulty report.
 * Was 0.95 tiles.
 */
const SWEEP_PICKUP_RADIUS = 1.7;

/**
 * Hand-magnet feed rate. While the pointer is over the board, game.ts sends a queued `handMove`
 * command (last board point the Hand hovers) at most this often — the sim keeps crumbs drifting
 * toward it for ~0.5s per command (MAGNET_FRESH_TICKS), so re-sending at ~10Hz keeps the magnet
 * live for both a moving AND a parked pointer. Purely a real-pointer path; never runs in tests.
 */
const HAND_MOVE_THROTTLE_MS = 100;

const FIRE_SFX: Record<string, string> = {
  'sgt-spritz': 'shoot-spray',
  'old-smacky': 'slam',
  'sir-toastsalot': 'shoot-toast',
  'big-blow': 'push',
  'bandolero': 'shoot-band',
};

export class Game {
  readonly renderer: GameView;
  readonly save: SaveData;
  readonly ui: UI;
  readonly audio = new AudioMan();
  readonly sfx = new Sfx(this.audio);
  readonly music = new Music(this.audio);
  sim: Sim | null = null;
  level: LevelDef | null = null;
  speedMult = 1;
  paused = false;
  screenshotReady = false;

  private mode: Mode = { kind: 'idle' };
  private gesture: Gesture | null = null;
  private acc = 0;
  private last = 0;
  private pointer = { x: 0, y: 0, ndcX: 0, ndcY: 0 };
  /** Hand-magnet: last board point the pointer hovered (world units + surface), or null when the
   *  pointer is off the board. Fed to the sim as throttled `handMove` commands (see maybeSendHandMove). */
  private handMoveTarget: { surface: number; x: number; z: number } | null = null;
  private lastHandMoveT = 0;
  private inspectedTower: number | null = null;
  // star trackers
  private towerIds = new Set<number>();
  private edgeFalls = 0;
  private stolen = 0;
  private recovered = 0;
  private maxScent = 0;
  private bossAlive = false;
  private toastsSeen = new Set<string>();
  private endlessMode = false;
  // INFESTATION MODE (§15): non-null while a run node's fight is in progress. floor/nodeIndex
  // identify which node in save.infestation.map this fight resolves; isDailyChore marks the
  // separate one-off Daily Chores flow (§16) which reuses the fight-resolution path but never
  // touches save.infestation.
  private infestFight: { floor: 1 | 2 | 3; nodeIndex: number } | null = null;
  private dailyChoreActive = false;
  /** SECRET LEVELS (§14 + §20.16): the id of the secret level currently in play, or null. These
   *  bypass the normal campaign stars/BP-per-star math entirely (see endLevel's secret branch) —
   *  set here so endLevel can special-case them the same way infestFight/dailyChoreActive gate
   *  their own resolution paths. */
  private secretLevelActive: string | null = null;

  // ---------- EASTER EGGS (§20) ----------
  /** §20.1 Konami code: rolling buffer of recent keydowns, checked on title screen only. Session
   *  flag (retroModeArmed) makes the *next* level load in Retro Mode — set once, consumed once. */
  private konamiBuffer: string[] = [];
  private retroModeArmed = false;
  /** §20.13 idle campfire: seconds of zero input accumulated during the current build phase.
   *  Any input event (bindInput's pointerdown/keydown) resets this to 0. */
  private idleSeconds = 0;
  private readonly IDLE_CAMPFIRE_SECONDS = 180;
  /** §20.6 Wave-42 towel: true for the one endless wave where endlessDepth === 42, so the
   *  drape+toast only fires once (on the waveStart transition into it) rather than every tick. */
  private towelWaveActive = false;
  /** Last Grid.pathVersion pushed to the renderer's enemy-path preview — retrace only when the
   *  flow field actually changes (clutter placed/removed), not every frame. */
  private lastPathVersion = -1;
  /** Dedup key for the pre-placement path preview (Addendum 2 §4) so previewPathWith only recomputes
   *  when the hovered clutter spot (or the live grid via pathVersion) actually changes, not per frame. */
  private lastPreviewKey: string | null = null;
  // ---------- PHOTO MODE (GAME-PROMPT §18) ----------
  photoMode = false;
  private photoWasPaused = false;
  private photoHudHidden = false;

  constructor(private canvas: HTMLCanvasElement, rendererKind: RendererKind = '2d') {
    this.renderer = createGameView(canvas, rendererKind);
    // Expose the live renderer to CSS/UI so 2D-only overlays (view-toggle glyph, photo panel) can
    // branch on it. '2d' is the default; '3d' is the ?renderer=3d debug fallback.
    document.documentElement.dataset.renderer = rendererKind;
    this.save = loadSave();
    this.ui = new UI(CONTENT, this.save, {
      onSelectTower: (def) => this.selectTower(def),
      onSelectClutter: (shape) => this.selectClutter(shape),
      onSelectSpell: (id) => this.selectSpell(id),
      onCallWave: () => {
        this.sim?.command({ type: 'callWave' });
        this.sfx.play('ui-click');
      },
      onSpeed: (m) => {
        this.speedMult = m;
        this.sfx.play('ui-click');
      },
      onPause: () => this.togglePause(),
      onPhotoMode: () => this.togglePhotoMode(),
      onTopDown: () => this.toggleTopDown(),
      onUpgrade: (id) => {
        this.sim?.command({ type: 'upgradeTower', id });
        this.refreshInspectSoon();
      },
      onBranch: (id, branch) => {
        this.sim?.command({ type: 'branchTower', id, branch });
        this.refreshInspectSoon();
      },
      onSell: (id) => {
        this.sim?.command({ type: 'sellTower', id });
        this.closeInspect();
      },
      onMove: (id) => {
        this.sim?.command({ type: 'carryStart', towerId: id });
        this.mode = { kind: 'carry', towerId: id };
        this.renderer.setHandPose('open');
        this.closeInspect();
      },
      onHighFive: (id) => this.sim?.command({ type: 'highFive', towerId: id }),
      onRearm: (id) => {
        this.sim?.command({ type: 'rearmTrap', towerId: id });
        this.refreshInspectSoon();
      },
      onClose: () => this.closeInspect(),
      onStartLevel: (id) => {
        // First time a player launches any level, run the How-to-Play flip-book first (once —
        // tracked in seenNotes, replayable anytime from the title's "How to Play" button).
        if (!this.save.seenNotes.includes('how-to-play')) {
          this.save.seenNotes.push('how-to-play');
          persistSave(this.save);
          this.ui.showTutorial(() => this.startLevel(id), "Let's Play! →");
        } else {
          this.startLevel(id);
        }
      },
      onBackToTitle: () => this.showTitle(),
      onToLevels: () => this.showLevels(),
      onPickMutation: (id) => {
        this.sim?.command({ type: 'pickMutation', id });
        this.sfx.play('ui-click');
      },
      onSettingsChanged: (s) => {
        this.audio.setVolumes(s.musicVol, s.sfxVol);
        this.applyAccessibilitySettings();
        persistSave(this.save);
      },
      onResume: () => {
        this.paused = false;
      },
      onStartEndless: () => this.startEndless(),
      onStartSecretLevel: (id) => this.startSecretLevel(id),
      onChoose: (option) => {
        this.sim?.command({ type: 'choose', option });
      },
      onChoiceTick: () => this.sfx.play('choice-tick'),
      onFlyShooed: () => {
        this.save.flyShooed = true;
        this.checkAchievement('fly-shooed');
        persistSave(this.save);
      },
      onRename: (def, name) => {
        this.save.towerNames[def] = name;
        if (name.trim().toLowerCase() === 'talkie' && def === 'sir-toastsalot') {
          this.ui.toast('🍞 the toaster has OPINIONS now.');
          this.checkAchievement('renamed-toaster');
        }
        persistSave(this.save);
        this.refreshInspectSoon();
      },
      onPetChange: (pet) => {
        this.save.settings.pet = pet;
        persistSave(this.save);
      },
      onJunkDrawerPurchase: (id) => {
        const ok = purchase(this.save, id);
        if (ok) {
          persistSave(this.save);
          this.checkAchievement('towers-owned-most');
          this.applyCorkboardSkin();
          this.sfx.play('ui-click');
        } else {
          this.sfx.play('place-bad');
        }
        return ok;
      },
      // ---------- INFESTATION MODE (§15) ----------
      onInfestationStart: () => this.startInfestation(),
      onDailyChoreStart: () => this.startDailyChore(),
      onInfestationPickNode: (index) => this.pickInfestationNode(index),
      onInfestationAbandon: () => {
        this.save.infestation = null;
        persistSave(this.save);
        this.sfx.play('place-bad');
        this.showTitle();
      },
      onInfestationDraftPick: (towerId) => {
        const run = this.save.infestation;
        if (!run) return;
        addToDeck(run, towerId);
        persistSave(this.save);
        this.sfx.play('ui-click');
        this.ui.showInfestationMap(run);
      },
      onGarageSaleBuyTower: (id) => {
        const run = this.save.infestation;
        if (!run || !this.infestFight) return;
        const price = shopPrice(run, 'towerCard');
        if (run.scraps < price || run.deck.length >= 12) { this.sfx.play('place-bad'); return; }
        run.scraps -= price;
        addToDeck(run, id);
        persistSave(this.save);
        this.sfx.play('ui-click');
        this.ui.refreshGarageSale(run, this.infestFight.floor, this.infestFight.nodeIndex);
      },
      onGarageSaleBuyRelic: (id) => {
        const run = this.save.infestation;
        if (!run || !this.infestFight) return;
        const price = shopPrice(run, 'relic');
        if (run.scraps < price || run.relics.includes(id)) { this.sfx.play('place-bad'); return; }
        run.scraps -= price;
        this.grantRelic(run, id);
        persistSave(this.save);
        this.sfx.play('shiny-chime');
        this.ui.refreshGarageSale(run, this.infestFight.floor, this.infestFight.nodeIndex);
      },
      onGarageSaleRemoveCurse: (id) => {
        const run = this.save.infestation;
        if (!run || !this.infestFight) return;
        const price = shopPrice(run, 'removeCurse');
        if (run.scraps < price || !run.curses.includes(id)) { this.sfx.play('place-bad'); return; }
        run.scraps -= price;
        run.curses = run.curses.filter((c) => c !== id);
        persistSave(this.save);
        this.sfx.play('ui-click');
        this.ui.refreshGarageSale(run, this.infestFight.floor, this.infestFight.nodeIndex);
      },
      onGarageSaleBuySlices: () => {
        const run = this.save.infestation;
        if (!run || !this.infestFight) return;
        const price = shopPrice(run, 'slices');
        if (run.scraps < price) { this.sfx.play('place-bad'); return; }
        run.scraps -= price;
        run.slices = Math.min(12, run.slices + 2);
        persistSave(this.save);
        this.sfx.play('ui-click');
        this.ui.refreshGarageSale(run, this.infestFight.floor, this.infestFight.nodeIndex);
      },
      onGarageSaleLeave: () => {
        const run = this.save.infestation;
        if (!run || !this.infestFight) return;
        this.clearInfestationNode(run, this.infestFight.floor, this.infestFight.nodeIndex);
        this.infestFight = null;
        persistSave(this.save);
        this.ui.showInfestationMap(run);
      },
      onRunOverReturn: () => {
        this.save.infestation = null;
        persistSave(this.save);
        this.showTitle();
      },
      // ---------- EASTER EGGS (§20) ----------
      onMagnetsSolved: () => {
        if (this.save.eggs.fridgeMagnetsSolved) return; // reward is one-time-per-save
        this.save.eggs.fridgeMagnetsSolved = true;
        this.save.browniePoints.earned += 50;
        persistSave(this.save);
        this.sfx.play('fridge-open');
        this.ui.toast('🧊 the magnets spelled OPEN SESAME... +50 🧁 BP!');
      },
    });

    this.renderer.onFlashPulse = (strength) => this.ui.pulseFlash(strength);
    this.applyAccessibilitySettings();
    setArachnophobiaMode(this.save.settings.arachnophobia); // initial boot value; later toggles apply at next finishLevelBoot()
    setArachnophobiaMode2D(this.save.settings.arachnophobia); // same for the 2D renderer's spider swap

    this.bindInput();
    this.music.start();
    this.last = performance.now();
    const loop = (t: number) => {
      requestAnimationFrame(loop);
      const dt = Math.min(0.1, (t - this.last) / 1000);
      this.last = t;
      this.update(dt);
    };
    requestAnimationFrame(loop);
  }

  // ---------- screen flow ----------
  showTitle(): void {
    this.sim = null;
    this.level = null;
    this.infestFight = null;
    this.dailyChoreActive = false;
    this.secretLevelActive = null;
    this.music.intensity = 0;
    this.music.heartbeat = false;
    this.exitPhotoModeIfOpen();
    this.ui.showTitle();
  }

  showLevels(): void {
    this.sim = null;
    this.level = null;
    this.paused = false;
    this.endlessMode = false;
    this.secretLevelActive = null;
    this.exitPhotoModeIfOpen();
    this.music.intensity = 0;
    this.music.heartbeat = false;
    // Abandoning mid-fight (pause veil "Abandon level") during a run or a Daily Chore returns to
    // the run map / title rather than campaign level-select — quitting a single fight does NOT
    // forfeit run progress (map/deck/relics/curses/scraps are untouched); only the explicit
    // "Abandon Run" button on the map screen does that. The fight's own outcome (win/loss scrap
    // and slice bookkeeping) simply never happened since endLevel() was never reached.
    if (this.infestFight) {
      this.infestFight = null;
      this.ui.hideRunStrip();
      const run = this.save.infestation;
      if (run) { this.ui.showInfestationMap(run); return; }
    }
    if (this.dailyChoreActive) {
      this.dailyChoreActive = false;
      this.showTitle();
      return;
    }
    this.ui.showLevelSelect();
  }

  /** Pantry Panic (§16): endless siege on the banquet kitchen, weekly seed, personal-best depth. */
  startEndless(): void {
    this.endlessMode = true;
    this.startLevel('kitchen-5', weeklySeed(Date.now()));
    this.ui.toast('🥫 PANTRY PANIC — the pantry is infinite. you are not. good luck!!');
  }

  // ---------- INFESTATION MODE (§15) ----------

  /** Title entry point — resumes an in-progress run if one exists, otherwise starts a fresh
   *  one. Gated by the title screen itself (only rendered clickable once kitchen-5 is beaten). */
  startInfestation(): void {
    this.sim = null;
    this.level = null;
    this.endlessMode = false;
    this.infestFight = null;
    this.secretLevelActive = null;
    this.music.intensity = 0;
    this.music.heartbeat = false;
    let run = this.save.infestation;
    if (!run || run.over) {
      run = newRun((Date.now() % 0x7fffffff) | 1);
      this.save.infestation = run;
      persistSave(this.save);
      this.sfx.play('ui-click');
    }
    this.ui.showInfestationMap(run);
  }

  /** Daily Chores (§16): seeded-by-date pick of one mutator + one random campaign level, win
   *  once per day for +25 BP. Entirely separate from an Infestation run (no deck/relics/curses
   *  carry over — a single vanilla-roster fight against a curse-buffed swarm). */
  startDailyChore(): void {
    const chore = dailyChoreFor(Date.now());
    if (this.save.lastDailyChoreDay === chore.day) {
      this.ui.toast('📅 already done today — come back tomorrow!!');
      return;
    }
    this.dailyChoreActive = true;
    this.infestFight = null;
    this.endlessMode = false;
    this.secretLevelActive = null;
    this.level = levelById(chore.levelId);
    const difficulty = this.save.settings.difficulty;
    this.sim = new Sim(this.level, {
      seed: chore.day | 1,
      difficulty,
      content: CONTENT,
      events: true,
      director: difficulty === 'landlord' || difficulty === 'condemned' || !!this.level.director,
      pet: this.save.settings.pet ?? undefined,
      metaMods: metaModsFromSave(this.save),
      preMutations: [chore.mutationId],
    });
    this.finishLevelBoot(chore.levelId);
    this.ui.toast(`📅 DAILY CHORE: ${CONTENT.mutations[chore.mutationId]?.name ?? chore.mutationId} — win for +25 BP!`);
  }

  /** SECRET LEVELS (§14 + §20.16) — launched only from the "???" attic panel, only once
   *  isSecretUnlocked() passes (the panel itself never renders a locked level clickable, but this
   *  re-checks so a stale/replayed UI reference can never launch a locked secret). Bypasses the
   *  normal campaign stars/BP-per-star flow entirely; see endLevel's secret branch for rewards.
   *
   *  The Impossible Room (secret-impossible) gets two forced knobs on top of whatever the
   *  player's own settings.difficulty/pet are: 'condemned' difficulty and the Director engaged,
   *  regardless of the player's chosen difficulty tier — GAME-PROMPT §14 calls for "genuinely
   *  brutal... it should NOT be par-winnable", and it also uses weeklySeed() (src/sim/endless.ts)
   *  so every player sees the same room during a given ISO week (the "this week's impossible
   *  room" framing echoed in the level's blurb/UI). Every other secret level plays at the
   *  player's own chosen difficulty, same as a normal campaign level. */
  startSecretLevel(id: string): void {
    if (!isSecretUnlocked(this.save, id as SecretLevelId)) return;
    this.infestFight = null;
    this.dailyChoreActive = false;
    this.endlessMode = false;
    this.secretLevelActive = id;
    this.level = levelById(id);
    const isImpossible = id === 'secret-impossible';
    const difficulty = isImpossible ? 'condemned' : this.save.settings.difficulty;
    this.sim = new Sim(this.level, {
      seed: isImpossible ? weeklySeed(Date.now()) : ((Date.now() % 100000) | 1),
      difficulty,
      content: CONTENT,
      events: true,
      director: isImpossible || difficulty === 'landlord' || difficulty === 'condemned' || !!this.level.director,
      pet: this.save.settings.pet ?? undefined,
      metaMods: metaModsFromSave(this.save),
    });
    this.finishLevelBoot(id);
    if (isImpossible) this.ui.toast('🚪 THIS WEEK\'S IMPOSSIBLE ROOM — good luck. genuinely.');
  }

  private pickInfestationNode(index: number): void {
    const run = this.save.infestation;
    if (!run) return;
    const nodes = currentFloorNodes(run);
    const reachable = reachableNodeIndices(run);
    if (!reachable.includes(index)) return;
    const node = nodes[index];
    run.nodeIndex = index;
    persistSave(this.save);

    switch (node.kind) {
      case 'fight':
      case 'elite':
        this.startInfestationFight(run, node, run.floor, index);
        return;
      case 'boss':
        this.startInfestationFight(run, node, run.floor, index);
        return;
      case 'shop':
        this.infestFight = { floor: run.floor, nodeIndex: index };
        this.sfx.play('ui-click');
        this.ui.showGarageSale(run, run.floor, index);
        return;
      case 'rest': {
        // Couch Nap: +3 slices, capped 12 — resolves instantly, no fight.
        run.slices = Math.min(12, run.slices + 3);
        this.clearInfestationNode(run, run.floor, index);
        persistSave(this.save);
        this.sfx.play('win');
        this.ui.toast('🛋️ Couch Nap — +3 cake slices (capped at 12).');
        this.ui.showInfestationMap(run);
        return;
      }
    }
  }

  private clearInfestationNode(run: RunState, floor: number, index: number): void {
    run.map[floor - 1][index].cleared = true;
  }

  private grantRelic(run: RunState, relicId: string): void {
    if (run.relics.includes(relicId)) return;
    run.relics.push(relicId);
    const r = RELICS_BY_ID[relicId];
    if (r?.mod.cakeSlices) run.slices = Math.min(12, run.slices + r.mod.cakeSlices);
  }

  /** Launches a fight/elite/boss node's campaign level with the run's runMods/preMutations/deck
   *  threaded through SimOptions per the §15 contract. Elite fights additionally offer a curse
   *  (mutation id) as the price of a guaranteed relic drop on win — see resolveInfestationFight. */
  private startInfestationFight(run: RunState, node: NodeDef, floor: 1 | 2 | 3, nodeIndex: number): void {
    if (!node.levelId) return;
    this.infestFight = { floor, nodeIndex };
    this.dailyChoreActive = false;
    this.endlessMode = false;
    this.secretLevelActive = null;
    // hud.ts (outside this feature's file ownership) gates its build bar purely off
    // `level.allowedTowers` — it never reads SimOptions/state at all — so the deck-gate has to
    // be applied here, on the LevelDef object the Hud is actually constructed with, exactly like
    // the campaign's tutorial-gating levels already do. Shallow copy: never mutates the shared
    // ALL_LEVELS entry (other modes launching the same level must see its authored gate).
    this.level = { ...levelById(node.levelId), allowedTowers: run.deck };
    const difficulty = this.save.settings.difficulty;
    this.sim = new Sim(this.level, {
      seed: seedForNode(run, floor, nodeIndex),
      difficulty,
      content: CONTENT,
      events: true,
      // Elite/boss nodes always run with the Director engaged (§13 "Director unchained") on top
      // of whatever the player's difficulty setting would already trigger — a run's elites need
      // to bite even on houseguest, since the whole roguelike's tension comes from resource
      // attrition (deck/relics/slices) rather than a difficulty slider.
      director: isEliteNode(node) || isBossNode(node) || difficulty === 'landlord' || difficulty === 'condemned' || !!this.level.director,
      pet: this.save.settings.pet ?? undefined,
      metaMods: metaModsFromSave(this.save),
      runMods: { ...runModsForFight(run), cakeSlices: run.slices },
      preMutations: run.curses,
      allowedTowersOverride: run.deck,
    });
    this.finishLevelBoot(node.levelId);
    const nodeLabel = isBossNode(node) ? `FLOOR ${floor} BOSS` : isEliteNode(node) ? 'ELITE' : 'Fight';
    this.ui.showRunStrip(run, nodeLabel);
    if (isEliteNode(node)) this.ui.toast('👑 ELITE — win this and a relic is yours (a curse comes with it).');
  }

  /** Shared tail of startLevel/startInfestationFight/startDailyChore — HUD boot, star trackers
   *  reset, forecast, intro sticky note, click sfx. Extracted so the three fight-launching call
   *  sites (campaign, Infestation, Daily Chore) don't duplicate this bookkeeping. */
  private finishLevelBoot(levelId: string): void {
    if (!this.sim || !this.level) return;
    this.music.setTheme(this.level.theme);
    // Arachnophobia mode (§20.15) takes effect at level load, not live — see
    // applyAccessibilitySettings()'s doc comment for why. Both renderers get the flag.
    setArachnophobiaMode(this.save.settings.arachnophobia);
    setArachnophobiaMode2D(this.save.settings.arachnophobia);
    this.renderer.loadLevel(this.level, CONTENT);
    this.ui.showHud(this.level);
    this.ui.hud?.refreshClutter(this.sim.state.clutterHand);
    this.applyCorkboardSkin();
    this.mode = { kind: 'idle' };
    this.acc = 0;
    this.paused = false;
    this.towerIds.clear();
    this.edgeFalls = 0;
    this.stolen = 0;
    this.recovered = 0;
    this.maxScent = 0;
    this.bossAlive = false;
    this.toastsSeen.clear();
    this.updateForecast();
    const intro = this.level.tutorial?.find((n) => n.wave === 0);
    if (intro) this.ui.stickyNote(intro.text, `${levelId}-w0`);
    this.sfx.play('ui-click');

    // §20.1 Konami code: consume the one-level arming flag set from the title screen.
    this.renderer.setRetroMode(this.retroModeArmed);
    if (this.retroModeArmed) {
      this.retroModeArmed = false;
      this.ui.toast('🕹️ RETRO MODE — one level, extra chunky.');
    }
    // §20.3 red balloon: ~1/6 chance per level, purely cosmetic/clickable.
    this.renderer.maybeSpawnBalloon();
    // §20.13 idle campfire: fresh level, fresh idle clock.
    this.idleSeconds = 0;
    this.renderer.clearCampfire();
    // §20.6 Wave-42 towel: cleared on every level (re-evaluated per endless wave in handleEvents).
    this.towelWaveActive = false;
    this.renderer.clearTowels();
    // Enemy-path preview: draw the initial routes now that the sim (and its flow field) exists.
    this.lastPathVersion = -1;
    this.refreshEnemyPath();

    // MOBILE UX: default to the overhead "see everything" framing on phone-sized viewports —
    // the diorama's normal orbit camera is cramped on a small landscape screen. loadLevel() just
    // reset topDownActive to false above, so this only ever ENTERS (never toggles back out).
    if (isMobileViewport() && !this.renderer.isTopDownActive()) this.toggleTopDown();
    // Sync the view-toggle glyph to the actual starting framing: the 2D camera boots at the
    // fit-whole-board ("see everything") view, so the button should show 🔍 "zoom back in" from
    // the start rather than the default ⛶. (3D boots zoomed-in, so this leaves it as ⛶ there.)
    this.ui.hud?.setTopDownActive(this.renderer.isTopDownActive());
  }

  /** Trace the route the critters will walk from each spawn to the cake (the sim's own flow field)
   *  and hand the world-space polylines to the renderer's on-board path preview. Cheap; only called
   *  on level load and whenever the flow field changes (see the pathVersion check in update()). */
  private refreshEnemyPath(): void {
    if (!this.sim || !this.level) return;
    const grid = this.sim.grid;
    const paths: Vec3[][] = [];
    for (const sp of this.level.spawns) {
      const tiles = grid.pathTo(sp.tile);
      if (tiles.length < 2) continue;
      paths.push(tiles.map((t) => {
        const w = grid.worldOf(t);
        return { x: w.x, y: w.y, z: w.z };
      }));
    }
    this.renderer.setPathPolylines(paths);
    this.lastPathVersion = grid.pathVersion;
  }

  /** Resolves an Infestation fight's outcome (called from endLevel when this.infestFight is
   *  set): win = slices carry forward + scraps + draft (elites also grant a relic + offer a
   *  curse) + node cleared + advance; loss = run over, recap. Boss wins on floor 1/2 advance the
   *  run to the next floor's node 0; the floor-3 boss win ends the run victorious. */
  private resolveInfestationFight(won: boolean, state: import('./sim/types').SimState): void {
    const run = this.save.infestation;
    const { floor, nodeIndex } = this.infestFight!;
    this.infestFight = null;
    this.ui.hideRunStrip();
    if (!run) return;
    const node = run.map[floor - 1][nodeIndex];

    this.save.stats.kills += state.recap.kills;
    this.save.stats.sweeps += state.recap.sweeps;
    this.save.stats.crumbsBanked += state.recap.crumbsBanked;
    run.kills += state.recap.kills;

    if (!won) {
      run.over = true;
      run.won = false;
      persistSave(this.save);
      this.sfx.play('lose');
      this.music.intensity = 0;
      this.music.heartbeat = false;
      this.ui.showRunOver({ won: false, run });
      return;
    }

    // Damage persists: the cake's remaining slices carry into the next fight.
    run.slices = Math.max(1, state.cakeSlices);
    run.scraps += fightRewardScraps(state);
    this.clearInfestationNode(run, floor, nodeIndex);
    this.save.stats.wins++;
    persistSave(this.save);
    this.sfx.play('win');

    const wasFinalBoss = isFinalBoss(run, node);
    if (wasFinalBoss) {
      run.over = true;
      run.won = true;
      run.floorsCleared = 3;
      persistSave(this.save);
      this.ui.showRunOver({ won: true, run });
      return;
    }

    if (isBossNode(node)) {
      // Floor cleared — advance to the next floor's entry node.
      run.floorsCleared = Math.max(run.floorsCleared, floor);
      run.floor = (floor + 1) as 1 | 2 | 3;
      run.nodeIndex = -1;
      persistSave(this.save);
      this.ui.toast(`🐜 Floor ${floor} clear! Descending to floor ${run.floor}...`);
      this.ui.showInfestationMap(run);
      return;
    }

    if (isEliteNode(node)) {
      // Elites pay a curse for a guaranteed relic — offered/applied here, deterministically
      // picked from the node's own seed so a replayed run seed sees the same curse+relic pair.
      const rng = new RNG(seedForNode(run, floor, nodeIndex) ^ 0x454c4954); // 'ELIT'
      const unownedCurses = CURSE_POOL.filter((c) => !run.curses.includes(c));
      if (unownedCurses.length > 0) run.curses.push(rng.pick(unownedCurses));
      const unownedRelics = Object.keys(RELICS_BY_ID).filter((id) => !run.relics.includes(id));
      if (unownedRelics.length > 0) this.grantRelic(run, rng.pick(unownedRelics));
      persistSave(this.save);
      this.ui.toast('👑 Elite defeated! A relic is yours... at a price. (curse added)');
    }

    // Fight/elite wins draft a tower card into the deck.
    const rng = new RNG(seedForNode(run, floor, nodeIndex) ^ 0x44524654); // 'DRFT'
    const options = draftOptions(run, rng);
    persistSave(this.save);
    if (options.length > 0) this.ui.showInfestationDraft(options);
    else this.ui.showInfestationMap(run);
  }

  startLevel(id: string, seed?: number): void {
    this.infestFight = null;
    this.dailyChoreActive = false;
    this.secretLevelActive = null;
    this.level = levelById(id);
    const difficulty = this.save.settings.difficulty;
    this.sim = new Sim(this.level, {
      seed: seed ?? ((Date.now() % 100000) | 1),
      difficulty,
      content: CONTENT,
      // Live play gets the full experience; the balance harness never sets these.
      // Director joins on the two upper tiers (§13: "Director unchained" territory).
      events: true,
      director: difficulty === 'landlord' || difficulty === 'condemned' || !!this.level.director,
      pet: this.save.settings.pet ?? undefined,
      endless: this.endlessMode,
      // The Junk Drawer (§18): permanent BP-purchased unlocks, derived fresh from save each
      // level start so a purchase mid-session takes effect on the very next level.
      metaMods: metaModsFromSave(this.save),
    });
    this.finishLevelBoot(id);
  }

  private endLevel(won: boolean, reason?: string): void {
    if (!this.sim || !this.level) return;
    const state = this.sim.state;
    const bites = state.cakeMax - state.cakeSlices;

    // Daily Chores (§16): a one-off mutator+level flow, resolved entirely outside the campaign
    // star/BP bookkeeping below (kills still fold into lifetime stats — same event wiring as
    // every other mode). Checked before the Infestation branch since the two are mutually
    // exclusive (infestFight is never set while dailyChoreActive is true).
    if (this.dailyChoreActive) {
      this.dailyChoreActive = false;
      this.save.stats[won ? 'wins' : 'losses']++;
      this.save.stats.kills += state.recap.kills;
      this.save.stats.sweeps += state.recap.sweeps;
      this.save.stats.crumbsBanked += state.recap.crumbsBanked;
      if (won) {
        this.save.lastDailyChoreDay = dayNumber(Date.now());
        this.save.browniePoints.earned += 25;
        this.ui.toast('📅 Daily Chore complete — +25 Brownie Points!');
      }
      persistSave(this.save);
      this.sfx.play(won ? 'win' : 'lose');
      this.music.intensity = 0;
      this.music.heartbeat = false;
      this.ui.showRecap(
        { won, lossReason: reason, level: this.level, state, recap: state.recap, stars: 0, starDetail: [false, false, false] },
        () => { this.ui.closeModal(); this.showTitle(); },
        () => { this.ui.closeModal(); this.showTitle(); },
        null,
      );
      return;
    }

    // SECRET LEVELS (§14 + §20.16): no stars, no campaign progression math — a self-contained
    // win/loss with its own one-time rewards (Dev Room / Impossible Room) tracked in
    // save.secrets. Kills/sweeps/crumbs still fold into lifetime stats like every other mode.
    if (this.secretLevelActive) {
      const secretId = this.secretLevelActive;
      this.secretLevelActive = null;
      this.save.stats[won ? 'wins' : 'losses']++;
      this.save.stats.kills += state.recap.kills;
      this.save.stats.sweeps += state.recap.sweeps;
      this.save.stats.crumbsBanked += state.recap.crumbsBanked;
      if (won && secretId === 'secret-dev' && !this.save.secrets.foundDevRoom) {
        this.save.secrets.foundDevRoom = true;
        this.save.browniePoints.earned += 100;
        this.ui.toast('🎂 +100 Brownie Points — thanks for finding us!!');
        const def = evaluateSingle('found-dev-room', { save: this.save });
        if (def) this.announceAchievement(def);
      }
      if (won && secretId === 'secret-impossible' && !this.save.secrets.impossibleCleared) {
        this.save.secrets.impossibleCleared = true;
        this.save.browniePoints.earned += 200;
        this.ui.toast('🏆 +200 Brownie Points — you are, in fact, human.');
        const def = evaluateSingle('impossible', { save: this.save });
        if (def) this.announceAchievement(def);
      }
      persistSave(this.save);
      this.sfx.play(won ? 'win' : 'lose');
      this.music.intensity = 0;
      this.music.heartbeat = false;
      this.ui.showRecap(
        { won, lossReason: reason, level: this.level, state, recap: state.recap, stars: 0, starDetail: [false, false, false] },
        () => { this.ui.closeModal(); this.showLevels(); },
        () => { this.ui.closeModal(); this.showLevels(); },
        null,
      );
      return;
    }

    // INFESTATION MODE (§15): a run fight resolves through the map/draft flow, not campaign
    // stars — see resolveInfestationFight().
    if (this.infestFight) {
      this.resolveInfestationFight(won, state);
      return;
    }

    // Pantry Panic (§16): endless runs only ever END — no stars, no BP; the score is depth.
    if (this.endlessMode) {
      const depth = state.endlessDepth;
      const best = this.save.stats.endlessBest ?? 0;
      if (depth > best) {
        this.save.stats.endlessBest = depth;
        this.ui.toast(`🥫 NEW PANTRY RECORD: survived ${depth} endless waves!!`);
      }
      this.save.stats.losses++;
      this.save.stats.kills += state.recap.kills;
      persistSave(this.save);
      this.sfx.play('lose');
      this.music.intensity = 0;
      this.music.heartbeat = false;
      this.music.setBoss(null);
      this.ui.showRecap(
        {
          won: false,
          lossReason: reason,
          level: this.level,
          state,
          recap: state.recap,
          stars: 0,
          starDetail: [false, false, false],
          endlessDepth: depth,
        },
        () => {
          this.ui.closeModal();
          this.startEndless();
        },
        () => {
          this.ui.closeModal();
          this.showLevels();
        },
        null,
      );
      return;
    }

    const challengeMet = this.evalChallenge();
    const starDetail: [boolean, boolean, boolean] = [won, won && bites <= 2, won && challengeMet];
    const stars = starDetail.filter(Boolean).length;

    // Brownie Points (§4/§18): first-time stars pay 10 BP each — re-earning a star already
    // held pays nothing. Compute the delta against the previously saved star count BEFORE
    // overwriting it below.
    const prevStars = this.save.stars[this.level.id] ?? 0;
    const newStars = won ? Math.max(prevStars, stars) : prevStars;
    const starDeltaBp = Math.max(0, newStars - prevStars) * 10;
    this.save.browniePoints.earned += starDeltaBp;

    if (won) {
      this.save.stars[this.level.id] = newStars;
      this.save.stats.wins++;
      if (bites === 0) this.save.stats.winsNoBite++;
      if (this.save.settings.difficulty === 'condemned') this.save.stats.winsCondemned++;
      if (this.save.settings.pet) this.save.stats.winsByPet[this.save.settings.pet]++;
    } else {
      this.save.stats.losses++;
    }
    this.save.stats.kills += state.recap.kills;
    this.save.stats.sweeps += state.recap.sweeps;
    this.save.stats.crumbsBanked += state.recap.crumbsBanked;

    // Achievements (§18): evaluated once against the just-updated save + this level's result.
    const unlocked = evaluateAchievements({
      save: this.save,
      levelResult: {
        won, bites, stars, challengeMet,
        pet: this.save.settings.pet, difficulty: this.save.settings.difficulty,
        world: this.level.world,
      },
    });
    persistSave(this.save);

    if (starDeltaBp > 0) this.ui.toast(`🧁 +${starDeltaBp} Brownie Points!`);
    for (const a of unlocked) this.announceAchievement(a);

    this.sfx.play(won ? 'win' : 'lose');
    this.music.intensity = 0;
    this.music.heartbeat = false;

    const idx = CAMPAIGN_LEVELS.findIndex((l) => l.id === this.level!.id);
    const next = won && idx >= 0 && idx + 1 < CAMPAIGN_LEVELS.length ? CAMPAIGN_LEVELS[idx + 1] : null;
    const levelId = this.level.id;
    this.ui.showRecap(
      {
        won,
        lossReason: reason,
        level: this.level,
        state,
        recap: state.recap,
        stars,
        starDetail,
      },
      () => {
        this.ui.closeModal();
        this.startLevel(levelId);
      },
      () => {
        this.ui.closeModal();
        this.showLevels();
      },
      next ? () => {
        this.ui.closeModal();
        this.startLevel(next.id);
      } : null,
    );
  }

  private evalChallenge(): boolean {
    if (!this.sim || !this.level?.challenge) return false;
    const state = this.sim.state;
    switch (this.level.challenge.id) {
      case 'perfect-cake': return state.cakeSlices === state.cakeMax;
      case 'minimalist': return this.towerIds.size <= 4;
      case 'edge-15': return this.edgeFalls >= 15;
      case 'no-heists': return this.stolen > 0 ? this.stolen === this.recovered : true;
      case 'clean-victory': return this.maxScent <= 50;
      default: return false;
    }
  }

  /** Junk Drawer cosmetic (§18): recolors the build-bar trim if a corkboard skin is owned.
   *  hud.ts is outside this feature's file ownership, so this reaches in from the outside —
   *  Hud.root is a plain public HTMLElement, so a CSS class toggle is all that's needed; the
   *  actual styling lives in style.css (.hud-cluster.skin-blue / .skin-mint), which this owns. */
  private applyCorkboardSkin(): void {
    const root = this.ui.hud?.root;
    if (!root) return;
    root.classList.remove('skin-blue', 'skin-mint');
    if (this.save.junkDrawer.includes('corkboard-skin-blue')) root.classList.add('skin-blue');
    else if (this.save.junkDrawer.includes('corkboard-skin-mint')) root.classList.add('skin-mint');
  }

  /** ACCESSIBILITY SUITE (GAME-PROMPT §23 + §20.15) — applies every accessibility setting to
   *  the live view layer EXCEPT arachnophobia. Called once at boot and again from
   *  onSettingsChanged whenever the thermostat panel changes anything (shake/flash/uiScale/
   *  colorblind all apply immediately, mid-level is fine — nothing about them depends on when
   *  a critter view was built). Arachnophobia is handled separately: setArachnophobiaMode() is
   *  only called from the constructor (initial boot value) and finishLevelBoot() (§20.15's own
   *  "next level load" contract), because boss Group views are built once per critter instance
   *  (critterModels.ts) — flipping the module flag mid-level could swap Grandma Longlegs' model
   *  out from under an in-progress boss fight. */
  private applyAccessibilitySettings(): void {
    const s = this.save.settings;
    this.renderer.setAccessibilitySettings(s.shakeIntensity, s.flashIntensity);
    const root = document.documentElement;
    root.style.setProperty('--ui-scale', `${s.uiScale}`);
    document.body.classList.toggle('colorblind', s.colorblind);
  }

  /** Screenshot/QA hook only (see exposeDebug's `setSettings`) — lets tools/shot*.mjs stage
   *  accessibility settings (e.g. uiScale extremes) without going through the settings UI. */
  applyAccessibilitySettingsForDebug(): void {
    this.applyAccessibilitySettings();
  }

  // ---------- main loop ----------
  private update(dt: number): void {
    if (this.sim && this.level && !this.paused && !this.ui.modalOpen && !this.ui.rotateBlocking) {
      // hand-magnet: keep the last hovered board point fresh even when the pointer sits still
      // (pointermove stops firing), so a parked pointer keeps pulling crumbs in. Throttled internally.
      this.maybeSendHandMove();
      this.acc += dt * this.speedMult;
      let guard = 0;
      while (this.acc >= SIM_DT && guard++ < 10) {
        const events = this.sim.tick();
        this.renderer.syncTick(this.sim.state, events);
        this.handleEvents(events);
        this.acc -= SIM_DT;
      }
      this.renderer.syncProjectiles(this.sim.state);
      // Re-trace the enemy-path preview only when placing/removing clutter reshaped the route.
      if (this.sim.grid.pathVersion !== this.lastPathVersion) this.refreshEnemyPath();
      this.maxScent = Math.max(this.maxScent, this.sim.state.scent);
      this.ui.setSwarmAlarm(this.sim.state.scent >= 99);
      this.updateMusicMood();
      this.ui.updateHud(this.sim.state, this.speedMult);
      // Oh-Crap countdown: the sim does NOT pause for this, by design (§12 — 5 seconds of
      // real panic against a still-running assault), so the drain-bar tracks sim time live.
      this.ui.updateChoice(this.sim.state.time);
      this.updateGhost();
      this.updateIdleCampfire(dt);
    }
    this.audio.setVolumes(this.save.settings.musicVol, this.save.settings.sfxVol);
    this.renderer.frame(dt);
    this.screenshotReady = true;
  }

  /** §20.13 idle campfire: 3+ minutes of zero input during a build phase spawns a tiny campfire
   *  + marshmallow sticks near the towers; any input (see noteInput(), called from bindInput)
   *  clears it with a scurry. Only tracked during 'build' — the assault phase is never idle by
   *  definition (waves are moving/attacking regardless of player input). */
  private updateIdleCampfire(dt: number): void {
    if (!this.sim || this.sim.state.phase !== 'build' || this.photoMode) {
      if (this.renderer.campfireActive) this.renderer.clearCampfire();
      this.idleSeconds = 0;
      return;
    }
    this.idleSeconds += dt;
    if (this.idleSeconds >= this.IDLE_CAMPFIRE_SECONDS && !this.renderer.campfireActive) {
      const spot = this.campfireSpot();
      if (spot) this.renderer.spawnCampfire(spot);
    }
  }

  /** Picks a world point near the player's own towers for the idle campfire to sit — falls back
   *  to the cake if no towers are placed yet (an idle build phase with zero towers is exactly
   *  when the game wants to nudge the player, so it shouldn't be a no-op). */
  private campfireSpot(): { x: number; y: number; z: number } | null {
    if (!this.sim || !this.level) return null;
    const towers = [...this.sim.state.towers.values()];
    if (towers.length > 0) {
      const t = towers[towers.length - 1];
      return { x: t.pos.x + 0.9, y: t.pos.y, z: t.pos.z + 0.6 };
    }
    const cake = this.sim.state.cakeSlices >= 0 ? this.level.cakeTile : null;
    if (!cake) return null;
    const w = this.sim.grid.worldOf(cake);
    return { x: w.x + 1.2, y: w.y, z: w.z + 0.6 };
  }

  /** Called from every real user input path (pointerdown, keydown, wheel) — resets the idle
   *  clock and clears an already-spawned campfire "with a scurry" (the clear itself IS the
   *  scurry-read; a dedicated poof VFX would need a render hook this feature doesn't own). */
  private noteInput(): void {
    this.idleSeconds = 0;
    if (this.renderer.campfireActive) this.renderer.clearCampfire();
  }

  /** §20.3 red balloon: popped via a direct click — lifetime counter (Monkey Business
   *  achievement threshold lives in achievements.ts, reading this same stat). */
  private onBalloonPopped(): void {
    this.save.stats.balloonsPopped++;
    persistSave(this.save);
    this.sfx.play('balloon-pop');
    this.ui.toast('🎈 pop!');
    this.checkAchievement('balloon-pop-1');
    this.checkAchievement('balloon-pop-100');
  }

  /** §20.2 windowsill sunflower: every click sways it; the 5th click (and every 5th after)
   *  plays the 8-note hum — "PvZ wink" per GAME-PROMPT, not a 1:1 copy. */
  private onSunflowerClicked(): void {
    this.renderer.eggsSwaySunflower();
    this.save.eggs.sunflowerClicks++;
    if (this.save.eggs.sunflowerClicks % 5 === 0) {
      this.sfx.play('sunflower-hum');
      this.ui.toast('🌻 hmm hm hmmmm...');
    }
    persistSave(this.save);
  }

  private updateMusicMood(): void {
    if (!this.sim) return;
    const st = this.sim.state;
    this.music.heartbeat = st.cakeSlices === 1 && st.phase === 'assault';
    if (st.phase === 'build') this.music.intensity = 1;
    else if (st.phase === 'assault') this.music.intensity = this.bossAlive || st.cakeSlices <= 3 ? 3 : 2;
  }

  private handleEvents(events: SimEvent[]): void {
    if (!this.sim || !this.level) return;
    for (const ev of events) {
      switch (ev.t) {
        case 'waveStart': {
          const wave = this.level.waves[ev.index];
          const bossEntry = wave?.entries.find((e) => CONTENT.critters[e.critter]?.boss);
          if (bossEntry) {
            const bossDef = CONTENT.critters[bossEntry.critter];
            this.ui.banner(`👑 ${bossDef.name.toUpperCase()} APPROACHES`, true);
            this.sfx.play('boss-intro');
            this.music.setBoss(bossEntry.critter as BossId);
            this.bossAlive = true;
          } else {
            this.ui.banner(`Wave ${ev.index + 1} of ${ev.total}`);
            this.sfx.play('wave-start');
          }
          this.ui.hud?.hideForecast();
          this.ui.dismissSticky();
          // §20.6 Wave-42 towel: Endless-only, fires once on the transition into depth 42.
          if (this.endlessMode && this.sim.state.endlessDepth === 42 && !this.towelWaveActive) {
            this.towelWaveActive = true;
            this.renderer.drapeTowelsOnTowers();
            this.ui.toast('🧻 wave 42... everything pauses. towels appear. don\'t panic.');
          } else if (this.towelWaveActive && this.sim.state.endlessDepth !== 42) {
            this.towelWaveActive = false;
            this.renderer.clearTowels();
          }
          break;
        }
        case 'waveClear':
          this.sfx.play('wave-clear');
          break;
        case 'buildPhase': {
          this.ui.hud?.refreshClutter(this.sim.state.clutterHand);
          this.updateForecast();
          const note = this.level.tutorial?.find((n) => n.wave === ev.index);
          if (note) this.ui.stickyNote(note.text, `${this.level.id}-w${ev.index}`);
          persistSave(this.save);
          break;
        }
        case 'clutterPlace':
          this.sfx.play('clutter');
          this.ui.hud?.refreshClutter(this.sim.state.clutterHand);
          break;
        case 'mutationOffer':
          this.sfx.play('mutation-ratchet');
          this.ui.showMutationDraft(ev.options);
          break;
        case 'cakeBite':
          this.sfx.play('cake-bite');
          break;
        case 'sliceStolen':
          this.stolen++;
          this.sfx.play('slice-stolen');
          this.toastOnce('stolen', '🐭 A MOUSE HAS A WHOLE SLICE!! Stop it before it escapes!!');
          break;
        case 'sliceRecovered':
          this.recovered++;
          this.sfx.play('slice-back');
          this.ui.toast('🍰 Slice recovered!!');
          break;
        case 'die': {
          this.sfx.play('die-poof', 70);
          const def = CONTENT.critters[ev.def];
          this.save.critterdex.kills[ev.def] = (this.save.critterdex.kills[ev.def] ?? 0) + 1;
          if (def?.boss) {
            this.bossAlive = false;
            this.music.setBoss(null);
            this.ui.banner(`👑 ${def.name.toUpperCase()} FALLS!`);
            this.ui.toast('sweep up the royal remains!!');
          }
          break;
        }
        // Jarring is being implemented in parallel (src/sim/) — 'jarDone' already exists in
        // the SimEvent union (types.ts) but no system emits it yet. Wired defensively here so
        // Critterdex jar counts start working the moment that system lands, with no further
        // game.ts changes needed.
        case 'jarDone':
          this.save.critterdex.jarred[ev.def] = (this.save.critterdex.jarred[ev.def] ?? 0) + 1;
          this.save.stats.jarsTotal++;
          this.sfx.play('jar-pop');
          this.ui.toast(`🫙 Jarred! ${CONTENT.critters[ev.def]?.name ?? ev.def} joins the Critterdex.`);
          this.checkAchievement('first-jar');
          this.checkAchievement('jars-10');
          this.checkAchievement('jars-25');
          persistSave(this.save);
          break;
        case 'grudgeBorn':
          this.sfx.play('grudge-return');
          this.ui.toast(`😤 ${ev.name} escaped... and will REMEMBER this.`);
          this.updateForecast();
          break;
        case 'grudgeReturn':
          this.sfx.play('grudge-return');
          this.ui.banner(`👑 ${ev.name} IS BACK`, true);
          this.updateForecast();
          break;
        case 'grudgeSettled':
          this.save.stats.grudgesSettled++;
          this.sfx.play('grudge-settled');
          this.ui.toast(`⚖️ ${ev.name}: settled. Bounty collected!`);
          this.checkAchievement('first-grudge-settled');
          this.checkAchievement('grudges-5');
          persistSave(this.save);
          break;
        case 'eventStart': {
          this.sfx.play('event-doorbell');
          const def = CONTENT.events?.[ev.id];
          this.ui.eventBanner(ev.id, ev.name, ev.text, def?.kind === 'timed');
          break;
        }
        case 'eventEnd':
          this.ui.dismissEventBanner(ev.id);
          break;
        case 'choiceOffered':
          this.sfx.play('choice-tick');
          this.ui.showChoice(this.sim.state.pendingChoice!);
          break;
        case 'choiceMade':
          this.ui.hideChoice();
          if (ev.auto) this.ui.toast('⏱️ too slow — the default happened.');
          break;
        case 'forecast':
          this.ui.hud?.showForecast(this.forecastWithGrudges(ev.text));
          break;
        case 'shinySpawn':
          this.save.critterdex.shinySeen[ev.def] = (this.save.critterdex.shinySeen[ev.def] ?? 0) + 1;
          this.sfx.play('shiny-chime');
          this.ui.toast(`✨ SHINY! a ${CONTENT.critters[ev.def]?.name ?? ev.def} sparkles nearby...`);
          this.checkAchievement('first-shiny');
          persistSave(this.save);
          break;
        case 'fire': {
          const name = FIRE_SFX[ev.def];
          if (name) this.sfx.play(name, 90);
          if (CONTENT.towers[ev.def]?.attack === 'trap') this.sfx.play('trap-snap');
          break;
        }
        case 'fakeDeath':
          this.sfx.play('fakeout');
          this.toastOnce('fakeout', '🪳 it\'s FAKING. keep shooting!!');
          break;
        case 'evolve':
          this.sfx.play('evolve');
          this.toastOnce('evolve', '😱 it ate crumbs off the floor and MOLTED!! SWEEP!');
          break;
        case 'scentThreshold':
          if (ev.rising) {
            this.sfx.play('sniff');
            if (ev.threshold === 50) this.toastOnce('scent50', '👃 50% scent — scouts are sniffing around between waves!');
            if (ev.threshold === 75) this.toastOnce('scent75', '👃👃 75% SCENT — waves are getting BIGGER. SWEEP THE FLOOR.');
          }
          break;
        case 'swarmWarning':
          this.sfx.play('klaxon');
          this.ui.toast(`🚨 THE SWARM ARRIVES IN ${ev.secondsLeft}s — CLEAN. THE. FLOOR.`);
          break;
        case 'scoutSpawn':
          this.sfx.play('scout');
          break;
        case 'crumbBank':
          this.sfx.play('crumb-bank', 60);
          break;
        case 'squash':
          this.sfx.play('squash');
          break;
        case 'flick':
          this.sfx.play('flick');
          break;
        case 'fall':
          if (ev.from > 1.2) this.edgeFalls++;
          break;
        case 'highFive':
          this.sfx.play('highfive');
          break;
        case 'towerPlace':
          this.towerIds.add(ev.id);
          this.sfx.play('place');
          break;
        case 'towerUpgrade':
          this.sfx.play('upgrade');
          break;
        case 'towerSell':
          this.sfx.play('sell');
          break;
        case 'towerGone':
          this.sfx.play('gnome-break');
          this.toastOnce('gnome', '🍄 Gnomeo died as he lived: smiling, then exploding.');
          break;
        case 'towerDisabled':
          this.toastOnce('stink', '🦨 stink gas!! that tower needs a minute.');
          break;
        case 'petSwat': {
          const tw = this.sim.state.towers.get(ev.towerId);
          const name = tw ? (CONTENT.towers[tw.def]?.name ?? tw.def) : 'a tower';
          this.ui.toast(`😼 Princess Destructo swatted ${name}. she is not sorry.`);
          break;
        }
        case 'petPounce':
          this.ui.toast(`😼 POUNCE. ${ev.kills} critters simply gone.`);
          break;
        case 'petBark':
          this.ui.toast('🐶 BARK!!');
          break;
        case 'spellCast':
          this.sfx.play(ev.spell === 'moooom' ? 'spell-mom' : ev.spell === 'forbidden-slipper' ? 'spell-slipper' : 'spell-lemon');
          if (ev.spell === 'moooom') {
            this.save.stats.moooomCasts++;
            this.checkAchievement('moooom-1');
            this.checkAchievement('moooom-10');
            persistSave(this.save);
          }
          break;
        case 'won':
          this.endLevel(true);
          break;
        case 'lost':
          this.endLevel(false, ev.reason);
          break;
        default:
          // Defensive string-keyed case: a parallel agent may add a goldfish-oracle
          // 'petProphecy' SimEvent (full next-wave composition) to types.ts after this was
          // written. Route it into the same forecast panel with a fish prefix the moment
          // it exists, with zero further game.ts changes needed — mirrors the 'jarDone'
          // pattern already used above for the same reason. Typed loosely (not a case in the
          // SimEvent union at write time) so this keeps compiling either way.
          if ((ev as { t: string }).t === 'petProphecy') {
            const p = ev as unknown as { wave: number; composition: { critter: string; count: number }[] };
            const parts = p.composition.map(({ critter, count }) => {
              const def = CONTENT.critters[critter];
              const name = def?.boss ? `👑 ${def.name}` : def?.name ?? critter;
              return `${count}× <b>${name}</b>`;
            });
            this.ui.hud?.showForecast(this.forecastWithGrudges(`🐟 the goldfish foresees wave ${p.wave + 1}: ${parts.join(', ')}`));
          }
          break;
      }
    }
  }

  private toastOnce(key: string, text: string): void {
    if (this.toastsSeen.has(key)) return;
    this.toastsSeen.add(key);
    this.ui.toast(text);
  }

  /** Event-driven achievement check (§18) — evaluates one achievement by id right when its
   *  triggering SimEvent arrives (jarDone, grudgeSettled, shinySpawn, flyShooed, moooom casts,
   *  toaster rename), rather than waiting for level end. Caller is responsible for persisting
   *  save afterward (mirrors the existing mutate-then-persistSave pattern in handleEvents). */
  private checkAchievement(id: string): void {
    const def = evaluateSingle(id, { save: this.save });
    if (def) this.announceAchievement(def);
  }

  /** Toasts + plays a sting for a newly-unlocked achievement (§18: "Unlocks toast"). Reuses
   *  'shiny-chime' (the existing "dopamine bell" per §24) rather than adding a new synth
   *  recipe — src/audio/ is outside this feature's file ownership. */
  private announceAchievement(def: AchievementDef): void {
    this.ui.toast(`🏆 achievement: ${def.name} (+${def.bp} BP)`);
    this.sfx.play('shiny-chime');
  }

  /** Appends any live grudges as a taunt line onto forecast/wave-preview text (§2.6). */
  private forecastWithGrudges(text: string): string {
    if (!this.sim) return text;
    const grudges = this.sim.state.grudges;
    if (!grudges || grudges.length === 0) return text;
    const taunts = grudges
      .filter((g) => g.aliveAs === null)
      .map((g) => `😤 ${g.name} is coming back for YOU`);
    if (taunts.length === 0) return text;
    return `${text}<br>${taunts.join('<br>')}`;
  }

  private updateForecast(): void {
    if (!this.sim || !this.level) return;
    const next = this.level.waves[this.sim.state.waveIndex + 1];
    if (!next) {
      this.ui.hud?.hideForecast();
      return;
    }
    const counts = new Map<string, number>();
    for (const e of next.entries) {
      const def = CONTENT.critters[e.critter];
      const name = def?.boss ? `👑 ${def.name}` : def?.name ?? e.critter;
      counts.set(name, (counts.get(name) ?? 0) + e.count);
    }
    const parts = [...counts.entries()].map(([n, c]) => `${c}× <b>${n}</b>`);
    const scentNote = this.sim.state.scent >= 25 ? ' <b>+10% (they smell it)</b>' : '';
    this.ui.hud?.showForecast(this.forecastWithGrudges(`📋 Critter Forecast: ${parts.join(', ')}${scentNote}`));
  }

  // ---------- selection ----------
  private selectTower(def: string): void {
    if (!this.sim) return;
    const cost = CONTENT.towers[def]?.tiers[0].cost ?? 0;
    if (this.sim.state.crumbs < cost) {
      this.ui.toast('not enough crumbs!! sweep more!!');
      this.sfx.play('place-bad');
      return;
    }
    this.mode = { kind: 'placeTower', def };
    this.ui.hud?.setSelected({ kind: 'tower', id: def });
    this.closeInspect();
    this.sfx.play('ui-click');
  }

  private selectClutter(shape: string): void {
    this.mode = { kind: 'placeClutter', shape, rot: 0 };
    this.ui.hud?.setSelected({ kind: 'clutter', id: shape });
    this.closeInspect();
    this.sfx.play('ui-click');
  }

  private selectSpell(id: string): void {
    if (!this.sim) return;
    const sp = CONTENT.spells[id];
    if ((this.sim.state.spellCds[id] ?? 0) > 0 || this.sim.state.mana < sp.cost) {
      this.ui.toast(this.sim.state.mana < sp.cost ? 'not enough static charge!! (kills + sweeping fill the jar)' : 'still recharging!!');
      this.sfx.play('place-bad');
      return;
    }
    this.mode = { kind: 'spell', id };
    this.ui.hud?.setSelected({ kind: 'spell', id });
    this.sfx.play('ui-click');
  }

  private cancelMode(): void {
    if (this.mode.kind === 'carry') {
      this.sim?.command({ type: 'carryCancel' });
    }
    this.mode = { kind: 'idle' };
    this.ui.hud?.setSelected(null);
    this.renderer.hideGhost();
    this.clearGhostPathPreview();
    this.renderer.setHandPose('point');
  }

  private closeInspect(): void {
    this.inspectedTower = null;
    this.ui.hideInspect();
    this.renderer.hideGhost();
  }

  private refreshInspectSoon(): void {
    const id = this.inspectedTower;
    if (id === null) return;
    setTimeout(() => {
      if (this.inspectedTower !== id || !this.sim) return;
      const tw = this.sim.state.towers.get(id);
      if (tw) this.ui.showInspect(tw, this.sim.state, this.pointer.x, this.pointer.y);
      else this.closeInspect();
    }, 80);
  }

  private togglePause(): void {
    if (!this.sim) return;
    if (this.photoMode) {
      // Photo Mode owns pause state while active (see togglePhotoMode) — route the HUD's pause
      // button/Escape key to exiting Photo Mode instead of desyncing this.paused underneath it.
      this.togglePhotoMode();
      return;
    }
    if (!DIFFICULTY[this.save.settings.difficulty].pauseAllowed && this.sim.state.phase === 'assault') {
      this.ui.toast('landlords do not pause. 😤');
      return;
    }
    this.paused = !this.paused;
    if (this.paused) this.ui.showPause();
    else this.ui.closeModal();
  }

  /** Overhead "see everything" camera toggle — HUD button + V key. First press frames the whole
   *  board from near-overhead so nothing sits off-screen; second press restores the prior framing. */
  private toggleTopDown(): void {
    if (!this.sim) return;
    const active = this.renderer.toggleTopDown();
    this.ui.hud?.setTopDownActive(active);
    this.sfx.play('ui-click');
  }

  /** Called from the orbit/zoom input handlers: a manual camera move invalidates the top-down
   *  snapshot, so drop the active highlight (the next button press re-frames from scratch). */
  private noteCameraMovedManually(): void {
    this.renderer.noteCameraMovedManually();
    this.ui.hud?.setTopDownActive(false);
  }

  // ---------- PHOTO MODE (GAME-PROMPT §18) ----------
  /** Free-orbit camera + tilt-shift slider + hide-HUD toggle + PNG snap. Reuses the existing
   *  pause (sim stops ticking) but is its own mode on top: entering always pauses (remembering
   *  whether the game was already paused, so exiting restores the prior state rather than
   *  force-unpausing mid-assault), and it expands the camera rig's orbit/zoom limits so players
   *  can get shots the normal gameplay framing would never allow. */
  togglePhotoMode(): void {
    if (!this.sim) return;
    if (!this.photoMode) {
      // Same "landlords do not pause" rule as the regular pause button (§13 difficulty engine) —
      // Photo Mode is a pause superset, so it inherits the restriction rather than sidestepping it.
      if (!this.paused && !DIFFICULTY[this.save.settings.difficulty].pauseAllowed && this.sim.state.phase === 'assault') {
        this.ui.toast('landlords do not pause. 😤 (works fine during build phase!)');
        return;
      }
      this.photoWasPaused = this.paused;
      this.paused = true;
      this.renderer.setFreeOrbit(true);
      this.photoMode = true;
      this.ui.showPhotoMode({
        onFocusY: (v) => this.renderer.setPhotoFocusY(v),
        onBlurStrength: (v) => this.renderer.setPhotoBlurStrength(v),
        onToggleHud: () => this.togglePhotoHud(),
        onSnap: () => this.snapPhoto(),
        onClose: () => this.togglePhotoMode(),
      });
      this.sfx.play('ui-click');
    } else {
      this.photoMode = false;
      this.renderer.setFreeOrbit(false);
      // restore live tilt-shift defaults (matches DioramaShader's own uniform defaults)
      this.renderer.setPhotoFocusY(0.45);
      this.renderer.setPhotoBlurStrength(1.6);
      if (this.photoHudHidden) this.togglePhotoHud();
      this.paused = this.photoWasPaused;
      this.ui.hidePhotoMode();
      if (!this.paused) this.ui.closeModal();
      this.sfx.play('ui-click');
    }
  }

  private togglePhotoHud(): void {
    this.photoHudHidden = !this.photoHudHidden;
    this.ui.setHudHidden(this.photoHudHidden);
  }

  /** Defensive reset for screen-flow transitions that can happen while Photo Mode is open (e.g.
   *  a screenshot/demo tool jumping scenes) — clears the panel + free-orbit + hidden-HUD state
   *  without going through the normal toggle (which requires a live this.sim). */
  private exitPhotoModeIfOpen(): void {
    if (!this.photoMode) return;
    this.photoMode = false;
    this.renderer.setFreeOrbit(false);
    if (this.photoHudHidden) {
      this.photoHudHidden = false;
      this.ui.setHudHidden(false);
    }
    this.ui.hidePhotoMode();
  }

  /** Renders one synchronous frame and downloads it as a PNG — the "MOOOOM! killcam shares
   *  itself" button (§18). No preserveDrawingBuffer plumbing needed: GameRenderer.snapPhoto()
   *  renders straight to the canvas and reads it back via toBlob() in the same tick, before
   *  the next frame gets a chance to touch the default framebuffer. */
  private async snapPhoto(): Promise<void> {
    this.sfx.play('camera-shutter');
    const blob = await this.renderer.snapPhoto();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.href = url;
    a.download = `counter-attack-${this.level?.id ?? 'photo'}-${stamp}.png`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    this.ui.toast('📸 saved!');
  }

  /** Hand-magnet feed: queue a throttled `handMove` for the last board point the pointer hovered so
   *  the sim keeps ALL crumbs on that surface drifting toward the Hand (no clicking). Throttled to
   *  ~10Hz; re-called every frame from update() so a parked (non-moving) pointer stays magnetic. */
  private maybeSendHandMove(): void {
    if (!this.sim || !this.handMoveTarget) return;
    const now = performance.now();
    if (now - this.lastHandMoveT < HAND_MOVE_THROTTLE_MS) return;
    this.lastHandMoveT = now;
    const t = this.handMoveTarget;
    this.sim.command({ type: 'handMove', surface: t.surface, x: t.x, z: t.z });
  }

  // ---------- input ----------
  private tileAtPointer(): TileRef | null {
    const hit = this.renderer.pickSurfacePoint(this.pointer.ndcX, this.pointer.ndcY);
    if (!hit || !this.sim) return null;
    return this.sim.grid.tileOfWorld(hit.surface, hit.x, hit.z);
  }

  /** Tile a tower should target. For tower-on-clutter placement, prefer the clutter block actually
   *  under the cursor (raycast against the raised mesh) so parallax doesn't land it a tile behind;
   *  floor-mounted towers/traps still use the flat ground pick. */
  private towerTargetTile(floorPlace: boolean): TileRef | null {
    if (!floorPlace) {
      const cl = this.renderer.pickClutterTile(this.pointer.ndcX, this.pointer.ndcY);
      if (cl) return cl;
    }
    return this.tileAtPointer();
  }

  /** Whether a tower of `def` can be placed on `tile` right now — mirrors sim/towers.ts tryPlaceTower
   *  (crumbs already gated at selection). Drives both the ghost colour and the click gate so a red
   *  ghost never silently fails + cancels the placement. */
  private towerCellValid(def: (typeof CONTENT.towers)[string], tile: TileRef): boolean {
    if (!this.sim || !this.level) return false;
    const g = this.sim.grid;
    if (!g.inBounds(tile)) return false;
    const same = (a: TileRef, b: TileRef): boolean => a.s === b.s && a.c === b.c && a.r === b.r;
    const cid = g.clutterIdAt(tile);
    if (def.attack === 'trap' || def.floorMount) {
      if (g.isStaticBlocked(tile) || cid !== null) return false;
      if (same(tile, this.level.cakeTile)) return false;
      if (this.level.spawns.some((sp) => same(sp.tile, tile))) return false;
      for (const tw of this.sim.state.towers.values()) if (same(tw.tile, tile)) return false;
      return true;
    }
    if (cid !== null) {
      // clutter cell → blocking mount, if a slot is free
      const piece = this.sim.state.clutter.get(cid);
      if (!piece) return false;
      const shape = CONTENT.shapes[piece.shape];
      return piece.mounted.length < (shape?.mountSlots ?? 1);
    }
    // Addendum 2 §1: any standable open floor/surface tile → non-blocking floor mount.
    if (g.isStaticBlocked(tile)) return false;
    if (same(tile, this.level.cakeTile)) return false;
    if (this.level.spawns.some((sp) => same(sp.tile, tile))) return false;
    for (const tw of this.sim.state.towers.values()) if (same(tw.tile, tile)) return false;
    return true;
  }

  /** Drop the pre-placement path preview (Addendum 2 §4) if one is showing. */
  private clearGhostPathPreview(): void {
    if (this.lastPreviewKey !== null) {
      this.lastPreviewKey = null;
      this.renderer.setGhostPathPolylines?.([]);
    }
  }

  private updateGhost(): void {
    if (!this.sim || !this.level) return;
    // the dashed hypothetical ribbon only ever shows while placing a clutter block — clear it the
    // instant we're doing anything else (placing a tower, carrying, spell, idle, deselect).
    if (this.mode.kind !== 'placeClutter') this.clearGhostPathPreview();
    if (this.mode.kind === 'placeClutter') {
      const tile = this.tileAtPointer();
      if (!tile) {
        this.renderer.hideGhost();
        this.clearGhostPathPreview();
        return;
      }
      const shape = CONTENT.shapes[this.mode.shape];
      const cells = rotateCells(shape.cells, this.mode.rot).map(([c, r]) => ({ s: tile.s, c: tile.c + c, r: tile.r + r }));
      const valid = cells.every((t) =>
        this.sim!.grid.inBounds(t) && !this.sim!.grid.isStaticBlocked(t) && !this.sim!.grid.isClutter(t) &&
        !(t.s === this.level!.cakeTile.s && t.c === this.level!.cakeTile.c && t.r === this.level!.cakeTile.r) &&
        !this.level!.spawns.some((sp) => sp.tile.s === t.s && sp.tile.c === t.c && sp.tile.r === t.r),
      );
      this.renderer.showGhost(cells.map((t) => this.sim!.grid.worldOf(t)), valid);
      // Addendum 2 §4: while hovering a VALID spot, push the hypothetical enemy route as a 2nd,
      // dashed ghost ribbon so the maze reshape reads before committing. pathVersion in the key
      // forces a refresh after a place (shift-place keeps the block selected).
      const key = `${this.mode.shape}:${this.mode.rot}:${tile.s},${tile.c},${tile.r}:${valid}:${this.sim.grid.pathVersion}`;
      if (key !== this.lastPreviewKey) {
        this.lastPreviewKey = key;
        this.renderer.setGhostPathPolylines?.(valid ? this.sim.grid.previewPathWith(cells) : []);
      }
    } else if (this.mode.kind === 'placeTower' || this.mode.kind === 'carry') {
      const defId = this.mode.kind === 'placeTower' ? this.mode.def : this.sim.state.towers.get(this.mode.towerId)?.def;
      const def = defId ? CONTENT.towers[defId] : null;
      if (!def) return;
      const floorPlace = def.attack === 'trap' || !!def.floorMount;
      const tile = this.towerTargetTile(floorPlace);
      if (!tile) {
        this.renderer.hideGhost();
        return;
      }
      const cid = this.sim.grid.clutterIdAt(tile);
      const valid = this.towerCellValid(def, tile);
      const w = this.sim.grid.worldOf(tile);
      this.renderer.showGhost([{ x: w.x, y: w.y + (cid !== null ? 0.85 : 0), z: w.z }], valid);
      this.renderer.showRange(w.x, w.y + (cid !== null ? 0.85 : 0), w.z, def.tiers[0].range);
    }
  }

  private bindInput(): void {
    const canvas = this.canvas;
    let orbiting = false;
    let lastX = 0;
    let lastY = 0;

    // ---- multi-touch (two-finger orbit + pinch zoom) ----
    const activeTouches = new Map<number, { x: number; y: number }>();
    let twoFinger = false;
    let pinchBaseSpan = 1;
    let twoFingerMidX = 0;
    let twoFingerMidY = 0;

    // ---- long-press (touch/pen) to pick up a tower ----
    let longPressTimer: ReturnType<typeof setTimeout> | null = null;
    let longPressFired = false;
    const clearLongPress = () => {
      if (longPressTimer !== null) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    };

    const touchSpan = (): number => {
      const pts = [...activeTouches.values()];
      if (pts.length < 2) return pinchBaseSpan;
      return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    };
    const touchMid = (): { x: number; y: number } => {
      const pts = [...activeTouches.values()];
      if (pts.length < 2) return { x: lastX, y: lastY };
      return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
    };

    const beginTwoFinger = () => {
      // cancel any single-finger gesture in progress — two-finger always means camera control
      clearLongPress();
      this.gesture = null;
      this.renderer.setHandPose('point');
      twoFinger = true;
      pinchBaseSpan = Math.max(1, touchSpan());
      this.renderer.beginPinch();
      const mid = touchMid();
      twoFingerMidX = mid.x;
      twoFingerMidY = mid.y;
    };

    canvas.addEventListener('pointerdown', (e) => {
      this.noteInput();
      if (e.pointerType === 'touch') {
        activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activeTouches.size === 2) {
          beginTwoFinger();
          return;
        }
        if (activeTouches.size > 2) return; // ignore 3rd+ finger
      }
      if (twoFinger) return;

      if (e.button === 1 || e.button === 2 || this.photoMode) {
        // PHOTO MODE (§18): every primary-button/touch drag is a camera orbit — no gameplay
        // picking (placing/sweeping/inspecting) while framing a shot.
        orbiting = true;
        lastX = e.clientX;
        lastY = e.clientY;
        return;
      }
      if (e.button !== 0 || !this.sim) return;
      this.updatePointer(e);

      if (this.mode.kind === 'placeClutter') {
        const tile = this.tileAtPointer();
        if (tile) {
          this.sim.command({ type: 'placeClutter', shape: this.mode.shape, rot: this.mode.rot, at: tile });
          if (!e.shiftKey) this.cancelMode();
        }
        return;
      }
      if (this.mode.kind === 'placeTower') {
        const def = CONTENT.towers[this.mode.def];
        const tile = this.towerTargetTile(def.attack === 'trap' || !!def.floorMount);
        if (tile && this.towerCellValid(def, tile)) {
          this.sim.command({ type: 'placeTower', def: this.mode.def, at: tile });
          if (!e.shiftKey) this.cancelMode();
        } else {
          // invalid spot — give feedback but KEEP the tower selected so a near-miss can retry,
          // instead of silently doing nothing and dropping the selection.
          this.sfx.play('place-bad');
        }
        return;
      }
      if (this.mode.kind === 'spell') {
        const hit = this.renderer.pickSurfacePoint(this.pointer.ndcX, this.pointer.ndcY);
        if (hit) {
          this.sim.command({ type: 'castSpell', spell: this.mode.id, surface: hit.surface, x: hit.x, z: hit.z });
          this.cancelMode();
        }
        return;
      }
      if (this.mode.kind === 'carry') {
        const carried = this.sim.state.towers.get(this.mode.towerId);
        const cdef = carried ? CONTENT.towers[carried.def] : null;
        const tile = this.towerTargetTile(!!cdef && (cdef.attack === 'trap' || !!cdef.floorMount));
        if (tile) {
          this.sim.command({ type: 'carryDrop', at: tile });
          this.cancelMode();
        }
        return;
      }

      // §20.3 red balloon + §20.2 sunflower: ambient decor, take priority over gameplay picking
      // since they're rare/small and a miss just falls through to a normal sweep anyway.
      if (this.renderer.pickBalloon(this.pointer.ndcX, this.pointer.ndcY)) {
        this.onBalloonPopped();
        return;
      }
      if (this.renderer.pickSunflower(this.pointer.ndcX, this.pointer.ndcY)) {
        this.onSunflowerClicked();
        return;
      }

      // idle: critter gesture > tower inspect (or long-press carry on touch/pen) > sweep
      const critterId = this.renderer.pickCritter(this.pointer.ndcX, this.pointer.ndcY, this.sim.state);
      if (critterId !== null) {
        this.gesture = { type: 'critter', critterId, startX: e.clientX, startY: e.clientY, startT: performance.now(), lastSweep: 0 };
        this.renderer.setHandPose('flick');
        return;
      }
      const towerId = this.renderer.pickTower(this.pointer.ndcX, this.pointer.ndcY, this.sim.state);
      if (towerId !== null) {
        if (e.pointerType === 'touch' || e.pointerType === 'pen') {
          // long-press = carry pickup; short tap (handled on pointerup) = inspect
          longPressFired = false;
          const px = e.clientX;
          const py = e.clientY;
          longPressTimer = setTimeout(() => {
            longPressTimer = null;
            if (!this.sim || this.mode.kind !== 'idle') return;
            const tw = this.sim.state.towers.get(towerId);
            if (!tw || tw.carried) return;
            longPressFired = true;
            this.sim.command({ type: 'carryStart', towerId });
            this.mode = { kind: 'carry', towerId };
            this.renderer.setHandPose('open');
            this.closeInspect();
            this.sfx.play('ui-click');
          }, 450);
          this.gesture = { type: 'sweep', startX: px, startY: py, startT: performance.now(), lastSweep: 0, towerHoldId: towerId };
          return;
        }
        const tw = this.sim.state.towers.get(towerId)!;
        this.inspectedTower = towerId;
        this.ui.showInspect(tw, this.sim.state, e.clientX, e.clientY);
        const def = CONTENT.towers[tw.def];
        this.renderer.showRange(tw.pos.x, tw.pos.y, tw.pos.z, def.tiers[tw.tier - 1].range);
        this.sfx.play('ui-hover');
        return;
      }
      this.closeInspect();
      this.gesture = { type: 'sweep', startX: e.clientX, startY: e.clientY, startT: performance.now(), lastSweep: 0 };
      this.renderer.setHandPose('sweep');
    });

    addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch' && activeTouches.has(e.pointerId)) {
        activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      }
      if (twoFinger) {
        if (activeTouches.size >= 2) {
          const mid = touchMid();
          this.renderer.panBy(mid.x - twoFingerMidX, mid.y - twoFingerMidY);
          twoFingerMidX = mid.x;
          twoFingerMidY = mid.y;
          const span = touchSpan();
          this.renderer.pinchZoom(span / pinchBaseSpan);
          this.noteCameraMovedManually();
        }
        return;
      }
      this.updatePointer(e);
      if (orbiting) {
        this.renderer.panBy(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX;
        lastY = e.clientY;
        this.noteCameraMovedManually();
      }
      // long-press cancels if the finger wanders too far before the timer fires
      if (longPressTimer !== null && this.gesture) {
        const dx = e.clientX - this.gesture.startX;
        const dy = e.clientY - this.gesture.startY;
        if (Math.hypot(dx, dy) > 14) clearLongPress();
      }
      // hand follows pointer
      const hit = this.renderer.pickSurfacePoint(this.pointer.ndcX, this.pointer.ndcY);
      if (hit && this.level) {
        const y = this.level.surfaces[hit.surface].origin.y;
        this.renderer.setHandTarget(hit.x, y, hit.z, y);
        // hand-magnet: reuse this pick (no extra picking) as the crumb-attraction point.
        this.handMoveTarget = { surface: hit.surface, x: hit.x, z: hit.z };
        this.maybeSendHandMove();
      } else {
        this.handMoveTarget = null; // pointer left the board — attraction lapses after MAGNET_FRESH_TICKS
      }
      // sweep while dragging — interpolate along the drag segment so a fast swipe leaves no gaps
      // between the throttled 90ms samples (each intermediate point banks any crumbs it passes).
      if (this.gesture?.type === 'sweep' && this.gesture.towerHoldId === undefined && this.sim) {
        const now = performance.now();
        if (now - this.gesture.lastSweep > 90 && hit) {
          const g = this.gesture;
          g.lastSweep = now;
          if (g.lastSweepSurface === hit.surface && g.lastSweepX !== undefined && g.lastSweepZ !== undefined) {
            const dx = hit.x - g.lastSweepX;
            const dz = hit.z - g.lastSweepZ;
            // step ~1 tile apart between the previous sample and this one; radius overlap covers the seams
            const steps = Math.min(12, Math.floor(Math.hypot(dx, dz)));
            for (let i = 1; i <= steps; i++) {
              const f = i / (steps + 1);
              this.sim.command({ type: 'sweep', surface: hit.surface, x: g.lastSweepX + dx * f, z: g.lastSweepZ + dz * f, radius: SWEEP_PICKUP_RADIUS });
            }
          }
          this.sim.command({ type: 'sweep', surface: hit.surface, x: hit.x, z: hit.z, radius: SWEEP_PICKUP_RADIUS });
          g.lastSweepX = hit.x;
          g.lastSweepZ = hit.z;
          g.lastSweepSurface = hit.surface;
          this.sfx.play('sweep', 160);
        }
      }
    });

    const endTouch = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activeTouches.delete(e.pointerId);
      // hand-magnet: a lifted finger has no lingering "hover", so stop feeding handMove once the
      // last touch ends (a mouse, by contrast, keeps hovering and stays magnetic while parked).
      if (activeTouches.size === 0) this.handMoveTarget = null;
      if (twoFinger && activeTouches.size < 2) {
        twoFinger = false;
        if (activeTouches.size === 1) {
          // one finger remains — hand off to single-finger tracking cleanly
          const [[, p]] = [...activeTouches.entries()];
          lastX = p.x;
          lastY = p.y;
        }
      }
    };

    addEventListener('pointerup', (e) => {
      endTouch(e);
      if (e.button === 1 || e.button === 2) {
        orbiting = false;
        return;
      }
      if (twoFinger) return;
      clearLongPress();
      if (!this.gesture || !this.sim) {
        this.gesture = null;
        return;
      }
      const g = this.gesture;
      this.gesture = null;
      this.renderer.setHandPose('point');

      if (g.type === 'critter' && g.critterId !== undefined) {
        const dx = e.clientX - g.startX;
        const dy = e.clientY - g.startY;
        const dist = Math.hypot(dx, dy);
        if (dist < 16 && performance.now() - g.startT < 350) {
          // tap = squash attempt
          this.sim.command({ type: 'squash', critterId: g.critterId });
          this.renderer.handPress();
        } else if (dist >= 16) {
          // slingshot: pull back, fling forward
          const cr = this.sim.state.critters.get(g.critterId);
          if (cr) {
            const release = this.renderer.pickSurfacePoint(this.pointer.ndcX, this.pointer.ndcY);
            if (release) {
              const dirX = cr.pos.x - release.x;
              const dirZ = cr.pos.z - release.z;
              const len = Math.hypot(dirX, dirZ);
              if (len > 0.2) {
                this.sim.command({
                  type: 'flick',
                  critterId: g.critterId,
                  dir: { x: dirX / len, z: dirZ / len },
                  power: Math.min(12, 3 + len * 2.2),
                });
              }
            }
          }
        }
        return;
      }

      // a plain tap (or the tail of a drag) on the floor banks crumbs near the release point too,
      // so a single tap NEAR a crumb collects it — the same forgiveness as the drag-sweep. Reuses
      // the existing sweep gesture/command; no new gesture type.
      if (g.type === 'sweep' && g.towerHoldId === undefined) {
        const hit = this.renderer.pickSurfacePoint(this.pointer.ndcX, this.pointer.ndcY);
        if (hit) this.sim.command({ type: 'sweep', surface: hit.surface, x: hit.x, z: hit.z, radius: SWEEP_PICKUP_RADIUS });
        return;
      }

      // g.towerHoldId marks the "touch tower" placeholder gesture from pointerdown above:
      // if long-press didn't fire (still idle mode) and it was a short tap, treat as inspect.
      if (g.towerHoldId !== undefined && !longPressFired && this.mode.kind === 'idle') {
        const dist = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
        const tw = dist < 16 ? this.sim.state.towers.get(g.towerHoldId) : undefined;
        if (tw) {
          this.inspectedTower = g.towerHoldId!;
          this.ui.showInspect(tw, this.sim.state, e.clientX, e.clientY);
          const def = CONTENT.towers[tw.def];
          this.renderer.showRange(tw.pos.x, tw.pos.y, tw.pos.z, def.tiers[tw.tier - 1].range);
          this.sfx.play('ui-hover');
        }
      }
    });

    canvas.addEventListener('pointercancel', (e) => {
      endTouch(e);
      clearLongPress();
      this.gesture = null;
      orbiting = false;
    });

    canvas.addEventListener('dblclick', (e) => {
      if (!this.sim) return;
      this.updatePointer(e);
      const towerId = this.renderer.pickTower(this.pointer.ndcX, this.pointer.ndcY, this.sim.state);
      if (towerId !== null) this.sim.command({ type: 'highFive', towerId });
    });

    canvas.addEventListener('wheel', (e) => {
      this.noteInput();
      this.renderer.zoomBy(e.deltaY);
      this.noteCameraMovedManually();
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // suppress double-tap-to-zoom / iOS Safari gesture zoom on the canvas
    canvas.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    canvas.addEventListener('gesturestart', (e) => e.preventDefault());

    addEventListener('keydown', (e) => {
      this.noteInput();
      this.trackKonami(e.key);
      // Oh-Crap choice panel eats 1/2 first — it's a forced 5-second decision that shouldn't
      // also flip game speed while it's open.
      if (this.ui.choiceOpen && this.ui.handleChoiceKey(e.key)) {
        e.preventDefault();
        return;
      }
      if (this.photoMode && e.key === 'Escape') {
        this.togglePhotoMode();
        return;
      }
      if (e.key === 'r' || e.key === 'R') {
        if (this.mode.kind === 'placeClutter') {
          this.mode.rot = ((this.mode.rot + 1) % 4) as 0 | 1 | 2 | 3;
        }
      } else if (e.key === 'Escape') {
        if (this.mode.kind !== 'idle') this.cancelMode();
        else if (this.inspectedTower !== null) this.closeInspect();
        else if (this.sim) this.togglePause();
      } else if (e.key === ' ') {
        if (this.sim?.state.phase === 'build' && !this.photoMode) {
          this.sim.command({ type: 'callWave' });
          e.preventDefault();
        }
      } else if (e.key === '1' || e.key === '2' || e.key === '3') {
        if (!this.photoMode) this.speedMult = parseInt(e.key, 10) as 1 | 2 | 3;
      } else if (e.key === 'p' || e.key === 'P') {
        // PHOTO MODE (§18): P toggles Photo Mode when a level is loaded; plain pause stays on
        // Escape/the HUD pause button — Photo Mode is a superset (it pauses AND frees the camera).
        if (this.sim) this.togglePhotoMode();
      } else if (e.key === 'v' || e.key === 'V') {
        if (this.sim && !this.photoMode) this.toggleTopDown();
      }
    });
  }

  /** §20.1 Konami code, title screen only: ↑↑↓↓←→←→BA arms Retro Mode for the *next* level load
   *  (consumed once in finishLevelBoot — session-only, no save flag). Rolling buffer, case-
   *  insensitive on the letter keys, trimmed to the sequence length so it never grows unbounded. */
  private trackKonami(key: string): void {
    if (this.sim) return; // title screen only (no sim loaded)
    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
    const norm = key.length === 1 ? key.toLowerCase() : key;
    this.konamiBuffer.push(norm);
    if (this.konamiBuffer.length > KONAMI.length) this.konamiBuffer.shift();
    if (this.konamiBuffer.length === KONAMI.length && this.konamiBuffer.every((k, i) => k === KONAMI[i])) {
      this.konamiBuffer = [];
      this.retroModeArmed = true;
      this.ui.toast('🕹️🕹️🕹️ RETRO MODE ARMED — next level loads extra chunky.');
      this.sfx.play('wave-clear');
    }
  }

  private updatePointer(e: { clientX: number; clientY: number }): void {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.ndcX = (e.clientX / innerWidth) * 2 - 1;
    this.pointer.ndcY = -(e.clientY / innerHeight) * 2 + 1;
  }

  // ---------- demos for screenshot evaluation ----------
  fastForward(ticks: number): void {
    if (!this.sim) return;
    for (let i = 0; i < ticks; i++) {
      const events = this.sim.tick();
      this.handleEvents(events);
      if (i === ticks - 1) this.renderer.syncTick(this.sim.state, events);
    }
    this.renderer.syncTick(this.sim.state, []);
    if (this.sim) this.ui.updateHud(this.sim.state, this.speedMult);
  }

  demo(name: string): void {
    switch (name) {
      case 'title':
        this.showTitle();
        return;
      case 'levels':
        this.showLevels();
        return;
      case 'settings':
        this.showTitle();
        this.ui.showSettings();
        return;
      case 'journal': {
        // seed some fake Critterdex progress so the screenshot shows a mix of filled-in
        // pages, silhouette "???" cards, and a boss spread — not an all-empty journal.
        const species = Object.keys(CONTENT.critters);
        species.forEach((id, i) => {
          if (i % 3 !== 0) this.save.critterdex.kills[id] = 3 + ((i * 17) % 90);
          if (i % 7 === 0) this.save.critterdex.jarred[id] = 1 + (i % 3);
          if (i % 11 === 0) this.save.critterdex.shinySeen[id] = 1;
        });
        this.ui.showJournal('title');
        return;
      }
      case 'junkdrawer': {
        // seed a believable BP balance + a couple of owned items (one sim unlock, one
        // cosmetic) so the screenshot shows the owned/affordable/locked states side by side.
        this.save.browniePoints.earned = 620;
        this.save.browniePoints.spent = 150 + 40;
        this.save.junkDrawer = ['fourth-flick', 'corkboard-skin-blue'];
        this.ui.showJunkDrawer('title');
        return;
      }
      case 'hud':
        this.startLevel('kitchen-1', 1337);
        return;
      case 'battle': {
        this.startLevel('kitchen-1', 1337);
        const sim = this.sim!;
        sim.state.crumbs = 900;
        sim.state.clutterHand = ['cereal-i', 'tupper-o', 'tupper-o'];
        sim.command({ type: 'placeClutter', shape: 'cereal-i', rot: 1, at: { s: 0, c: 2, r: 3 } });
        sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 11, r: 4 } });
        sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 1, r: 0 } });
        this.fastForward(2);
        sim.command({ type: 'placeTower', def: 'sgt-spritz', at: { s: 0, c: 2, r: 4 } });
        sim.command({ type: 'placeTower', def: 'old-smacky', at: { s: 0, c: 11, r: 4 } });
        sim.command({ type: 'placeTower', def: 'sir-toastsalot', at: { s: 0, c: 1, r: 0 } });
        sim.command({ type: 'placeTower', def: 'gnomeo', at: { s: 0, c: 3, r: 1 } });
        this.fastForward(2);
        sim.command({ type: 'callWave' });
        this.fastForward(Math.round(7 / SIM_DT));
        return;
      }
      case 'boss': {
        this.startLevel('kitchen-5', 1337);
        const sim = this.sim!;
        sim.state.crumbs = 2000;
        sim.state.clutterHand = ['tupper-o', 'tupper-o'];
        sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 1, r: 5 } });
        sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 12, r: 6 } });
        this.fastForward(2);
        sim.command({ type: 'placeTower', def: 'the-coldfather', at: { s: 0, c: 1, r: 5 } });
        sim.command({ type: 'placeTower', def: 'bandolero', at: { s: 0, c: 12, r: 6 } });
        this.fastForward(2);
        sim.debugSpawn('crumb-king', { s: 0, c: 3, r: 8 });
        for (let i = 0; i < 8; i++) sim.debugSpawn('ant-worker', { s: 0, c: 2 + (i % 4), r: 9 });
        this.fastForward(Math.round(2.5 / SIM_DT));
        return;
      }
      // §20.15 accessibility QA: spawns Grandma Longlegs so the arachnophobia swap (googly
      // roomba) can be visually verified. Reads settings.arachnophobia as normal (toggle it via
      // __game.setSettings before calling this demo — startLevel's finishLevelBoot() picks up
      // the current value, matching the real "takes effect next level load" contract).
      case 'arachnophobia': {
        this.startLevel('kitchen-5', 1337);
        const sim = this.sim!;
        sim.debugSpawn('grandma-longlegs', { s: 0, c: 7, r: 9 });
        this.fastForward(2);
        // camera placed roughly where the critter is walking TOWARD (the cake, north of spawn)
        // so its face — which turns to track its facing/walk direction — points at the lens.
        this.renderer.poseForDemo({ yaw: 1.0, pitch: 0.85, dist: 4.3, target: { x: 7.5, y: 0.4, z: 9.1 } });
        return;
      }
      case 'mutation': {
        this.startLevel('kitchen-2', 1337);
        this.ui.showMutationDraft(['thick-shells', 'hyper-legs', 'double-dead']);
        return;
      }
      case 'choice': {
        // Forces an Oh-Crap pendingChoice for screenshot verification of the panel — the
        // sim only ever creates these through the (RNG-gated) events system, so this pokes
        // sim.state directly, mirroring the existing 'recap'/'mutation' demo scenes above.
        this.startLevel('kitchen-3', 1337);
        const sim = this.sim!;
        sim.state.crumbs = 500;
        this.fastForward(2);
        sim.command({ type: 'callWave' });
        this.fastForward(Math.round(3 / SIM_DT));
        for (let i = 0; i < 10; i++) sim.debugSpawn('ant-worker', { s: 0, c: 2 + (i % 6), r: 8 });
        const deadline = sim.state.time + 5;
        sim.state.pendingChoice = {
          id: 'crumb-avalanche',
          prompt: 'A shelf tips — 500 crumbs spill at once! Sweep the jackpot, or take the instant scent hit?',
          options: ['🧹 Sweep jackpot!', '💨 Refund (scent spike)'],
          deadline,
        };
        this.ui.showChoice(sim.state.pendingChoice);
        return;
      }
      case 'recap': {
        this.startLevel('kitchen-1', 1337);
        const sim = this.sim!;
        sim.state.cakeSlices = 8;
        sim.state.recap.kills = 42;
        sim.state.recap.sweeps = 11;
        sim.state.recap.crumbsBanked = 310;
        sim.state.recap.crumbsWasted = 18;
        sim.state.recap.killsByTower = { 'sgt-spritz': 21, 'old-smacky': 14, 'gnomeo': 7 };
        sim.state.recap.bitesBySource = { 'Worker Ant': 2 };
        sim.state.recap.scentHistory = [0, 5, 12, 30, 42, 38, 55, 61, 44, 30, 22, 35, 48, 20, 10];
        this.endLevel(true);
        return;
      }
      case 'towers': {
        this.startLevel('kitchen-1', 1337);
        const sim = this.sim!;
        sim.state.crumbs = 99999;
        const roster = ['sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'the-coldfather', 'bandolero'];
        sim.state.clutterHand = roster.map(() => 'tupper-o');
        roster.forEach((_def, i) => {
          sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 1 + (i % 3) * 4, r: i < 3 ? 0 : 7 } });
        });
        this.fastForward(2);
        roster.forEach((def, i) => {
          sim.command({ type: 'placeTower', def, at: { s: 0, c: 1 + (i % 3) * 4, r: i < 3 ? 0 : 7 } });
        });
        sim.command({ type: 'placeTower', def: 'gnomeo', at: { s: 0, c: 12, r: 2 } });
        sim.command({ type: 'placeTower', def: 'stick-rick', at: { s: 0, c: 12, r: 8 } });
        this.fastForward(4);
        this.renderer.poseForDemo({ yaw: 0.05, pitch: 0.8, dist: 11.5, target: { x: 7, y: 1.0, z: 4 } });
        return;
      }
      case 'critters': {
        this.startLevel('kitchen-1', 1337);
        const sim = this.sim!;
        const species = ['ant-worker', 'ant-soldier', 'ant-bullet', 'fly-house', 'fly-fruit', 'roach', 'mouse-thief', 'slug', 'snail', 'moth', 'dust-bunny', 'dust-bunnette', 'stinkbug'];
        species.forEach((def, i) => {
          sim.debugSpawn(def, { s: 0, c: 1 + (i % 7) * 2, r: i < 7 ? 8 : 6 });
        });
        for (const cr of sim.state.critters.values()) cr.statuses.frozen = 9999;
        this.fastForward(2);
        this.renderer.poseForDemo({ yaw: 0.05, pitch: 0.85, dist: 9, target: { x: 7, y: 0.4, z: 7 } });
        return;
      }
      // QA: frames the Hand cursor up close so its orientation/pose can be visually verified.
      case 'hand': {
        this.startLevel('kitchen-1', 1337);
        this.fastForward(2);
        const pose = (globalThis as { __handPose?: HandPose }).__handPose ?? 'point';
        this.renderer.setHandTarget(7, 1.4, 7, 0.4);
        this.renderer.setHandPose(pose);
        // match the real play camera angle (yaw/pitch from CameraRig defaults) so the hand
        // reads exactly as the player sees it, just zoomed in on the cursor.
        this.renderer.poseForDemo({ yaw: -Math.PI * 0.22, pitch: 0.92, dist: 4.0, target: { x: 7, y: 1.4, z: 7 } });
        return;
      }
      // QA: the How-to-Play flip-book over the title.
      case 'tutorial': {
        this.showTitle();
        this.ui.showTutorial(() => {});
        return;
      }
      // QA: the overhead "see everything" framing over a staged battle. Idempotent — on a
      // mobile-sized viewport, finishLevelBoot() (via startLevel() inside demo('battle')) already
      // enters top-down by default, so only toggle if it isn't already active.
      case 'topdown': {
        this.demo('battle');
        if (!this.renderer.isTopDownActive()) this.toggleTopDown();
        return;
      }
      // QA: verify the walls render as a constant super-transparent ghost (not fully invisible,
      // not blocking the board) regardless of camera angle — see renderer.ts's per-frame fade.
      // 3D-only (there are no see-through walls in the top-down 2D view) — alias to `battle` in 2D
      // so the scene still produces a stable, non-crashing frame for the screenshot harness.
      case 'wallfade': {
        if (this.renderer.kind === '2d') { this.demo('battle'); return; }
        this.startLevel('kitchen-1', 1337);
        this.fastForward(2);
        this.renderer.poseForDemo({ yaw: Math.PI * 0.92, pitch: 0.82, dist: 17, target: { x: 7, y: 1, z: 5 } });
        return;
      }
      // QA: the mobile bottom-sheet build bar, sprung open (sections + spell pins visible).
      case 'mobilesheet': {
        this.demo('battle');
        this.ui.hud?.openSheet();
        return;
      }
      // PERF: stage ~300 live critters spread across the floor for tools/perf2d.mjs (§5 P2-I,
      // the 4ms render budget at 300 critters). Uses debugSpawn so it's deterministic and does
      // not depend on wave timing; run it, then setSpeed(3) + sample renderMs.
      case 'stress': {
        this.startLevel('kitchen-1', 1337);
        const sim = this.sim!;
        const floor = this.level!.surfaces[0];
        const cols = Math.max(1, floor.cols - 2);
        const rows = Math.max(1, floor.rows - 2);
        const defs = ['ant-worker', 'ant-soldier', 'roach', 'fly-house', 'dust-bunny'];
        for (let i = 0; i < 300; i++) {
          const c = 1 + (i % cols);
          const r = 1 + (Math.floor(i / cols) % rows);
          sim.debugSpawn(defs[i % defs.length], { s: 0, c, r });
        }
        this.fastForward(2);
        return;
      }
      // QA: a field of ground crumbs to eyeball the glow.
      case 'crumbs': {
        this.startLevel('kitchen-1', 1337);
        const sim = this.sim!;
        for (let c = 2; c <= 11; c++) {
          for (let r = 2; r <= 9; r++) {
            if ((c + r) % 2 === 0) {
              const w = sim.grid.worldOf({ s: 0, c, r });
              sim.dropCrumbs({ x: w.x, y: w.y, z: w.z }, 0, 10);
            }
          }
        }
        this.fastForward(1);
        this.renderer.poseForDemo({ yaw: 0.05, pitch: 0.8, dist: 11, target: { x: 7, y: 0.3, z: 6 } });
        return;
      }
      // ---------- P4 easter egg / photo mode demo scenes ----------
      case 'photo': {
        this.startLevel('kitchen-1', 1337);
        const sim = this.sim!;
        sim.state.crumbs = 900;
        sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 1, r: 0 } });
        this.fastForward(2);
        sim.command({ type: 'placeTower', def: 'sir-toastsalot', at: { s: 0, c: 1, r: 0 } });
        this.fastForward(2);
        this.togglePhotoMode();
        return;
      }
      case 'retro': {
        this.retroModeArmed = true;
        this.startLevel('kitchen-1', 1337);
        this.fastForward(2);
        return;
      }
      case 'balloon': {
        this.startLevel('kitchen-1', 1337);
        this.renderer.maybeSpawnBalloon(1); // force-spawn for screenshot verification
        // Balloon drift is centered on the window (see EggsController.reset) with only a ~4.5-unit
        // half-span each way, so framing on the window at a normal-ish zoom always catches it.
        this.renderer.poseForDemo({ yaw: 0.15, pitch: 0.85, dist: 11, target: { x: 8.7, y: 4.4, z: 0.5 } });
        return;
      }
      case 'campfire': {
        this.startLevel('kitchen-1', 1337);
        const sim = this.sim!;
        sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 2, r: 8 } });
        this.fastForward(2);
        sim.command({ type: 'placeTower', def: 'sgt-spritz', at: { s: 0, c: 2, r: 8 } });
        this.fastForward(2);
        const w = sim.grid.worldOf({ s: 0, c: 4, r: 8 });
        this.renderer.spawnCampfire(w);
        this.fastForward(1);
        this.renderer.poseForDemo({ yaw: 0.2, pitch: 0.9, dist: 6.5, target: { x: w.x, y: w.y + 0.3, z: w.z } });
        return;
      }
      case 'magnets': {
        this.showTitle();
        return;
      }
      // ---------- INFESTATION MODE (§15) demo scenes ----------
      case 'infest-map': {
        // seed a believable in-progress run — floor 2, a couple cleared nodes, a relic + a
        // curse, so the screenshot shows the branching path with real state, not an empty run.
        this.save.stars['kitchen-5'] = 3;
        let run = newRun(777);
        run.floor = 2;
        run.slices = 8;
        run.scraps = 145;
        run.relics = ['lazy-susan', 'grandma-cookbook', 'lucky-sponge'];
        run.curses = ['thick-shells'];
        run.deck = ['sgt-spritz', 'old-smacky', 'stick-rick', 'gnomeo', 'bandolero'];
        run.map[0].forEach((n) => { n.cleared = true; });
        run.nodeIndex = -1;
        this.save.infestation = run;
        this.ui.showInfestationMap(run);
        return;
      }
      case 'infest-draft': {
        this.save.stars['kitchen-5'] = 3;
        const run = newRun(777);
        run.deck = ['sgt-spritz', 'old-smacky', 'stick-rick'];
        this.save.infestation = run;
        this.ui.showInfestationMap(run);
        this.ui.showInfestationDraft(['gnomeo', 'the-coldfather', 'bandolero']);
        return;
      }
      case 'infest-fight': {
        // Verifies the run HUD strip (floor/node/slices/deck/relics) renders correctly over an
        // actual live fight, with no overlap against the campaign HUD's top chips.
        this.save.stars['kitchen-5'] = 3;
        const run = newRun(777);
        run.floor = 1;
        run.slices = 7;
        run.relics = ['lazy-susan', 'grandma-cookbook'];
        run.deck = ['sgt-spritz', 'old-smacky', 'stick-rick'];
        this.save.infestation = run;
        this.pickInfestationNode(0);
        this.fastForward(2);
        return;
      }
      case 'infest-shop': {
        this.save.stars['kitchen-5'] = 3;
        const run = newRun(777);
        run.floor = 1;
        run.slices = 6;
        run.scraps = 95;
        run.relics = ['expired-coupons'];
        run.curses = ['hyper-legs'];
        run.deck = ['sgt-spritz', 'old-smacky', 'stick-rick'];
        this.save.infestation = run;
        this.infestFight = { floor: 1, nodeIndex: 1 };
        this.ui.showGarageSale(run, 1, 1);
        return;
      }
      case 'infest-runover': {
        this.save.stars['kitchen-5'] = 3;
        const run = newRun(777);
        run.floor = 3;
        run.kills = 214;
        run.floorsCleared = 3;
        run.won = true;
        run.over = true;
        run.relics = ['lazy-susan', 'grandma-cookbook', 'good-scissors', 'lucky-sponge'];
        run.deck = ['sgt-spritz', 'old-smacky', 'stick-rick', 'gnomeo', 'bandolero', 'vroomba'];
        this.save.infestation = run;
        this.ui.showInfestationMap(run);
        this.ui.showRunOver({ won: true, run });
        return;
      }
    }
  }
}

export function exposeDebug(game: Game): void {
  (window as unknown as { __game: object }).__game = {
    demo: (name: string) => game.demo(name),
    startLevel: (id: string) => game.startLevel(id, 1337),
    state: () => game.sim?.state,
    grantCrumbs: (n: number) => {
      if (game.sim) game.sim.state.crumbs += n;
    },
    callWave: () => game.sim?.command({ type: 'callWave' }),
    // ---- placement / shuttle / path-preview QA hooks (used by throwaway Playwright probes) ----
    command: (c: import('./sim/types').SimCommand) => game.sim?.command(c),
    pathVersion: () => game.sim?.grid.pathVersion ?? -1,
    level: () => game.sim?.level,
    selectClutter: (shape: string) => (game as unknown as { selectClutter(s: string): void }).selectClutter(shape),
    previewPath: (cells: import('./sim/types').TileRef[]) => game.sim?.grid.previewPathWith(cells),
    // empty `extra` reproduces the CURRENT live route exactly — the diff baseline for a preview.
    livePath: () => game.sim?.grid.previewPathWith([]),
    ghostPaths: () => (game.renderer as { getGhostPathPolylines?: () => unknown }).getGhostPathPolylines?.() ?? [],
    setSpeed: (n: number) => {
      game.speedMult = n;
    },
    fastForward: (ticks: number) => game.fastForward(ticks),
    levels: () => ALL_LEVELS.map((l) => l.id),
    drawCalls: () => game.renderer.drawCallCount(),
    // Render CPU (ms) spent in the last frame — surfaced for tools/perf2d.mjs. The 2D renderer
    // records it; the 3D renderer has no equivalent, so this reads 0 there.
    renderMs: () => (game.renderer as { lastFrameMs?: number }).lastFrameMs ?? 0,
    // World<->screen tooling hooks (used by pointer-driven QA/probes to aim real PointerEvents at a
    // board location): project a world point to CSS px, and resolve a tile's world centre.
    worldToScreen: (x: number, y: number, z: number) => game.renderer.worldToScreen(x, y, z),
    tileWorld: (s: number, c: number, r: number) => game.sim?.grid.worldOf({ s, c, r }),
    get screenshotReady() {
      return game.screenshotReady;
    },
    // ---- accessibility QA hook (screenshot tooling only) ----
    setSettings: (patch: Partial<SaveData['settings']>) => {
      Object.assign(game.save.settings, patch);
      game.applyAccessibilitySettingsForDebug();
    },
  };
}
