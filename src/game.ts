import { Vector3 } from 'three';
import { DIFFICULTY, Sim, SIM_DT } from './sim/sim';
import type { LevelDef, SimEvent, TileRef } from './sim/types';
import { rotateCells } from './sim/clutter';
import { CONTENT, ALL_LEVELS, levelById } from './content';
import { GameRenderer } from './render/renderer';
import { UI } from './ui/ui';
import { AudioMan } from './audio/audio';
import { Sfx } from './audio/sfx';
import { Music, type BossId } from './audio/music';
import { loadSave, persistSave, type SaveData } from './meta/save';
import { weeklySeed } from './sim/endless';
import { evaluateAchievements, evaluateSingle, purchase, type AchievementDef } from './meta/achievements';
import { metaModsFromSave } from './meta/progress';

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
  /** true while this gesture is a touch/pen press-and-hold on a tower, waiting to decide long-press (carry) vs tap (inspect). */
  towerHoldId?: number;
}

const FIRE_SFX: Record<string, string> = {
  'sgt-spritz': 'shoot-spray',
  'old-smacky': 'slam',
  'sir-toastsalot': 'shoot-toast',
  'big-blow': 'push',
  'bandolero': 'shoot-band',
};

export class Game {
  readonly renderer: GameRenderer;
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

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new GameRenderer(canvas);
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
      onStartLevel: (id) => this.startLevel(id),
      onBackToTitle: () => this.showTitle(),
      onToLevels: () => this.showLevels(),
      onPickMutation: (id) => {
        this.sim?.command({ type: 'pickMutation', id });
        this.sfx.play('ui-click');
      },
      onSettingsChanged: (s) => {
        this.audio.setVolumes(s.musicVol, s.sfxVol);
        persistSave(this.save);
      },
      onResume: () => {
        this.paused = false;
      },
      onStartEndless: () => this.startEndless(),
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
    });

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
    this.music.intensity = 0;
    this.music.heartbeat = false;
    this.ui.showTitle();
  }

  showLevels(): void {
    this.sim = null;
    this.level = null;
    this.paused = false;
    this.endlessMode = false;
    this.music.intensity = 0;
    this.music.heartbeat = false;
    this.ui.showLevelSelect();
  }

  /** Pantry Panic (§16): endless siege on the banquet kitchen, weekly seed, personal-best depth. */
  startEndless(): void {
    this.endlessMode = true;
    this.startLevel('kitchen-5', weeklySeed(Date.now()));
    this.ui.toast('🥫 PANTRY PANIC — the pantry is infinite. you are not. good luck!!');
  }

  startLevel(id: string, seed?: number): void {
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
    this.music.setTheme(this.level.theme);
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
    if (intro) this.ui.stickyNote(intro.text, `${id}-w0`);
    this.sfx.play('ui-click');
  }

  private endLevel(won: boolean, reason?: string): void {
    if (!this.sim || !this.level) return;
    const state = this.sim.state;
    const bites = state.cakeMax - state.cakeSlices;

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

    const idx = ALL_LEVELS.findIndex((l) => l.id === this.level!.id);
    const next = won && idx >= 0 && idx + 1 < ALL_LEVELS.length ? ALL_LEVELS[idx + 1] : null;
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

  // ---------- main loop ----------
  private update(dt: number): void {
    if (this.sim && this.level && !this.paused && !this.ui.modalOpen && !this.ui.rotateBlocking) {
      this.acc += dt * this.speedMult;
      let guard = 0;
      while (this.acc >= SIM_DT && guard++ < 10) {
        const events = this.sim.tick();
        this.renderer.syncTick(this.sim.state, events);
        this.handleEvents(events);
        this.acc -= SIM_DT;
      }
      this.renderer.syncProjectiles(this.sim.state);
      this.maxScent = Math.max(this.maxScent, this.sim.state.scent);
      this.ui.setSwarmAlarm(this.sim.state.scent >= 99);
      this.updateMusicMood();
      this.ui.updateHud(this.sim.state, this.speedMult);
      // Oh-Crap countdown: the sim does NOT pause for this, by design (§12 — 5 seconds of
      // real panic against a still-running assault), so the drain-bar tracks sim time live.
      this.ui.updateChoice(this.sim.state.time);
      this.updateGhost();
    }
    this.audio.setVolumes(this.save.settings.musicVol, this.save.settings.sfxVol);
    this.renderer.frame(dt);
    this.screenshotReady = true;
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
    if (!DIFFICULTY[this.save.settings.difficulty].pauseAllowed && this.sim.state.phase === 'assault') {
      this.ui.toast('landlords do not pause. 😤');
      return;
    }
    this.paused = !this.paused;
    if (this.paused) this.ui.showPause();
    else this.ui.closeModal();
  }

  // ---------- input ----------
  private tileAtPointer(): TileRef | null {
    const hit = this.renderer.pickSurfacePoint(this.pointer.ndcX, this.pointer.ndcY);
    if (!hit || !this.sim) return null;
    return this.sim.grid.tileOfWorld(hit.surface, hit.x, hit.z);
  }

  private updateGhost(): void {
    if (!this.sim || !this.level) return;
    if (this.mode.kind === 'placeClutter') {
      const tile = this.tileAtPointer();
      if (!tile) {
        this.renderer.hideGhost();
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
    } else if (this.mode.kind === 'placeTower' || this.mode.kind === 'carry') {
      const tile = this.tileAtPointer();
      if (!tile) {
        this.renderer.hideGhost();
        return;
      }
      const defId = this.mode.kind === 'placeTower' ? this.mode.def : this.sim.state.towers.get(this.mode.towerId)?.def;
      const def = defId ? CONTENT.towers[defId] : null;
      if (!def) return;
      const floorPlace = def.attack === 'trap' || def.floorMount;
      const cid = this.sim.grid.clutterIdAt(tile);
      const valid = floorPlace
        ? !this.sim.grid.isStaticBlocked(tile) && cid === null
        : cid !== null;
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
    let pinchBaseDist = 16;
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
      pinchBaseDist = this.renderer.rig.getTargetDist();
      const mid = touchMid();
      twoFingerMidX = mid.x;
      twoFingerMidY = mid.y;
    };

    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        activeTouches.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (activeTouches.size === 2) {
          beginTwoFinger();
          return;
        }
        if (activeTouches.size > 2) return; // ignore 3rd+ finger
      }
      if (twoFinger) return;

      if (e.button === 1 || e.button === 2) {
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
        const tile = this.tileAtPointer();
        if (tile) {
          this.sim.command({ type: 'placeTower', def: this.mode.def, at: tile });
          if (!e.shiftKey) this.cancelMode();
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
        const tile = this.tileAtPointer();
        if (tile) {
          this.sim.command({ type: 'carryDrop', at: tile });
          this.cancelMode();
        }
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
          this.renderer.rig.orbit(mid.x - twoFingerMidX, mid.y - twoFingerMidY);
          twoFingerMidX = mid.x;
          twoFingerMidY = mid.y;
          const span = touchSpan();
          this.renderer.rig.pinchZoom(pinchBaseDist, span / pinchBaseSpan);
        }
        return;
      }
      this.updatePointer(e);
      if (orbiting) {
        this.renderer.rig.orbit(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX;
        lastY = e.clientY;
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
        this.renderer.hand.setTarget(new Vector3(hit.x, y, hit.z), y);
      }
      // sweep while dragging
      if (this.gesture?.type === 'sweep' && this.gesture.towerHoldId === undefined && this.sim) {
        const now = performance.now();
        if (now - this.gesture.lastSweep > 90 && hit) {
          this.gesture.lastSweep = now;
          this.sim.command({ type: 'sweep', surface: hit.surface, x: hit.x, z: hit.z, radius: 0.95 });
          this.sfx.play('sweep', 160);
        }
      }
    });

    const endTouch = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      activeTouches.delete(e.pointerId);
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
          this.renderer.hand.press();
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
      this.renderer.rig.zoom(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // suppress double-tap-to-zoom / iOS Safari gesture zoom on the canvas
    canvas.addEventListener('touchstart', (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    canvas.addEventListener('gesturestart', (e) => e.preventDefault());

    addEventListener('keydown', (e) => {
      // Oh-Crap choice panel eats 1/2 first — it's a forced 5-second decision that shouldn't
      // also flip game speed while it's open.
      if (this.ui.choiceOpen && this.ui.handleChoiceKey(e.key)) {
        e.preventDefault();
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
        if (this.sim?.state.phase === 'build') {
          this.sim.command({ type: 'callWave' });
          e.preventDefault();
        }
      } else if (e.key === '1' || e.key === '2' || e.key === '3') {
        this.speedMult = parseInt(e.key, 10) as 1 | 2 | 3;
      } else if (e.key === 'p' || e.key === 'P') {
        this.togglePause();
      }
    });
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
        this.renderer.rig.pose(0.05, 0.8, 11.5);
        this.renderer.rig.target.set(7, 1.0, 4);
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
        this.renderer.rig.pose(0.05, 0.85, 9);
        this.renderer.rig.target.set(7, 0.4, 7);
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
    setSpeed: (n: number) => {
      game.speedMult = n;
    },
    fastForward: (ticks: number) => game.fastForward(ticks),
    levels: () => ALL_LEVELS.map((l) => l.id),
    drawCalls: () => game.renderer.drawCallCount(),
    get screenshotReady() {
      return game.screenshotReady;
    },
  };
}
