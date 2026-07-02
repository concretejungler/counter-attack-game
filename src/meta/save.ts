import type { RunState } from './infestation';

/** Versioned localStorage save with export/import codes. */
export interface SaveData {
  version: 1;
  /** levelId -> 0..3 stars. Keyed by id (not world/index), so this already spans every
   *  world's levels — no migration needed as the campaign grows. Progression/unlock state
   *  (which levels/worlds are open) is derived from this map at read time; see meta/progress.ts. */
  stars: Record<string, number>;
  settings: {
    musicVol: number;
    sfxVol: number;
    /** Legacy boolean, kept for backward compat with old saves — loadSave() folds this into
     *  shakeIntensity (true->1, false->0) the first time an old save is read. New code should
     *  read/write shakeIntensity; this field is left stale afterwards but harmless. */
    shake: boolean;
    difficulty: 'houseguest' | 'homeowner' | 'landlord' | 'condemned';
    /** Player-picked pet chaos agent (GAME-PROMPT §9). Optional-safe like critterdex/flyShooed
     *  below — backfilled to null by loadSave() for saves written before this existed. */
    pet: 'cat' | 'dog' | 'goldfish' | null;
    // ---------- ACCESSIBILITY SUITE (GAME-PROMPT §23 + §20.15) ----------
    /** 0..1 multiplier on camera-shake amplitude (renderer.ts / camera.ts consume this).
     *  Optional-safe: loadSave() backfills from the legacy `shake` boolean for old saves. */
    shakeIntensity: number;
    /** 0..1 multiplier on full-screen flash/vignette pulse effects (renderer.ts). Optional-safe,
     *  backfilled to 1 for saves predating this setting. */
    flashIntensity: number;
    /** 0.85..1.3 — CSS --ui-scale multiplier applied to the whole diegetic overlay (see
     *  style.css :root and game.ts applySettingsToView()). Optional-safe, backfilled to 1. */
    uiScale: number;
    /** Colorblind-safe mode (§23): adds shape/icon reinforcement to status/team colors in the
     *  HUD beyond color alone. Optional-safe, backfilled to false. */
    colorblind: boolean;
    /** Arachnophobia mode (§20.15, shipped with love): swaps grandma-longlegs and any other
     *  spider-silhouette critter models for googly-eyed roombas. Read by critterModels.ts at
     *  model-build time — takes effect next level load (the toggle's label says so). Optional-safe,
     *  backfilled to false. */
    arachnophobia: boolean;
  };
  stats: {
    wins: number;
    losses: number;
    kills: number;
    sweeps: number;
    crumbsBanked: number;
    /** Extra counters feeding Achievements (§18) — additive fields, optional-safe like
     *  critterdex/flyShooed below (loadSave() backfills zeros/empties for older saves). */
    jarsTotal: number;              // lifetime successful jars (mirrors sum of critterdex.jarred, kept denormalized for O(1) achievement checks)
    grudgesSettled: number;         // lifetime crowned-elite kills
    moooomCasts: number;            // lifetime MOOOOM! spell casts
    winsByPet: Record<'cat' | 'dog' | 'goldfish', number>;
    winsNoBite: number;             // wins with zero cake slices lost (perfect-cake)
    winsCondemned: number;          // wins on the 'condemned' difficulty
    balloonsPopped: number;         // §20.3 red balloon easter egg counter
    endlessBest: number;            // Pantry Panic (§16): deepest generated wave survived
  };
  seenNotes: string[];                   // dismissed tutorial notes
  /** The Critterdex — kid's field journal. Keyed by critter def id. Optional-safe: added
   *  after v1 shipped, so loadSave() backfills empty records for saves written before this
   *  existed (no version bump needed, same pattern as stats/settings backfill below). */
  critterdex: {
    kills: Record<string, number>;       // squished count per species
    jarred: Record<string, number>;      // capture count per species
    shinySeen: Record<string, number>;   // shiny sightings (chime heard) per species
  };
  /** The Fly (§20.14 UI gag): true once shooed for good (clicked 3 times in one encounter).
   *  Optional-safe like critterdex above — backfilled by loadSave() for older saves. */
  flyShooed: boolean;
  /** Per-save tower renames (§20.14 lite). Keyed by towerDef id — a rename applies to that
   *  tower species everywhere it's placed, matching the "rename unlocks a voice pack" framing
   *  in GAME-PROMPT (the toaster has opinions once renamed "Talkie"). */
  towerNames: Record<string, string>;
  /** Brownie Points (§4/§18 meta currency) — lifetime totals, not a spendable balance field,
   *  so `browniePoints.earned - browniePoints.spent` is always the current balance (and the
   *  ledger is auditable/replay-safe). Earned by first-time stars + achievement unlocks. */
  browniePoints: { earned: number; spent: number };
  /** Unlocked achievement ids (src/meta/achievements.ts). A Set would be nicer but arrays
   *  survive JSON round-trips without a reviver; membership checks are done via a Set built
   *  at read time in progress.ts helpers. */
  achievements: string[];
  /** Purchased Junk Drawer unlock ids (src/meta/achievements.ts JUNK_DRAWER_ITEMS). */
  junkDrawer: string[];
  /** INFESTATION MODE (§15): the in-progress run, or null between runs. Optional-safe like
   *  critterdex/flyShooed above — backfilled to null by loadSave() for saves written before this
   *  existed. A run is abandoned by simply setting this back to null (no separate "abandoned"
   *  bookkeeping needed — the map/deck/relics are all regenerated fresh by newRun() next time). */
  infestation: RunState | null;
  /** Daily Chores (§16): UTC day-number (src/meta/infestation.ts dayNumber()) of the last
   *  completed chore, or null if none yet. Prevents repeat claims within the same day. */
  lastDailyChoreDay: number | null;
  /** EASTER EGGS (§20) — additive per-save flags, all optional-safe (backfilled by loadSave()
   *  for saves written before P4). Kept flat rather than nested so they round-trip through
   *  export/import codes with zero extra plumbing, same pattern as flyShooed above. */
  eggs: {
    /** §20.4 Fridge poetry magnets: true once OPEN+SESAME has been arranged adjacent and the
     *  +50 BP reward granted — a one-time-per-save reward, checked before granting again. */
    fridgeMagnetsSolved: boolean;
    /** §20.2 Sunflower hum: lifetime click count on the windowsill sunflower prop (any level).
     *  The 8-note hum + sway fires every 5th click (count % 5 === 0), not just once ever. */
    sunflowerClicks: number;
  };
}

const KEY = 'counterattack_save_v1';

export function defaultSave(): SaveData {
  return {
    version: 1,
    stars: {},
    settings: {
      musicVol: 0.7, sfxVol: 0.9, shake: true, difficulty: 'houseguest', pet: null,
      shakeIntensity: 1, flashIntensity: 1, uiScale: 1, colorblind: false, arachnophobia: false,
    },
    stats: {
      wins: 0, losses: 0, kills: 0, sweeps: 0, crumbsBanked: 0,
      jarsTotal: 0, grudgesSettled: 0, moooomCasts: 0,
      winsByPet: { cat: 0, dog: 0, goldfish: 0 },
      winsNoBite: 0, winsCondemned: 0, balloonsPopped: 0, endlessBest: 0,
    },
    seenNotes: [],
    critterdex: { kills: {}, jarred: {}, shinySeen: {} },
    flyShooed: false,
    towerNames: {},
    browniePoints: { earned: 0, spent: 0 },
    achievements: [],
    junkDrawer: [],
    infestation: null,
    lastDailyChoreDay: null,
    eggs: { fridgeMagnetsSolved: false, sunflowerClicks: 0 },
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return defaultSave();
    return {
      ...defaultSave(),
      ...data,
      settings: {
        ...defaultSave().settings,
        ...data.settings,
        // backward compat: old saves only had the boolean `shake`. If this save predates
        // shakeIntensity (no numeric field present), fold the boolean in; otherwise trust
        // whatever shakeIntensity value is already on the save (a later explicit 0 must stick).
        shakeIntensity: data.settings?.shakeIntensity ?? (data.settings?.shake === false ? 0 : 1),
      },
      stats: {
        ...defaultSave().stats,
        ...data.stats,
        winsByPet: { ...defaultSave().stats.winsByPet, ...data.stats?.winsByPet },
      },
      critterdex: {
        kills: { ...(data.critterdex?.kills ?? {}) },
        jarred: { ...(data.critterdex?.jarred ?? {}) },
        shinySeen: { ...(data.critterdex?.shinySeen ?? {}) },
      },
      flyShooed: data.flyShooed ?? false,
      towerNames: { ...(data.towerNames ?? {}) },
      browniePoints: { ...defaultSave().browniePoints, ...data.browniePoints },
      achievements: [...(data.achievements ?? [])],
      junkDrawer: [...(data.junkDrawer ?? [])],
      infestation: data.infestation ?? null,
      lastDailyChoreDay: data.lastDailyChoreDay ?? null,
      eggs: { ...defaultSave().eggs, ...data.eggs },
    };
  } catch {
    return defaultSave();
  }
}

export function persistSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage full/denied — play on without persistence
  }
}

export function exportCode(data: SaveData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(data))));
}

export function importCode(code: string): SaveData | null {
  try {
    const data = JSON.parse(decodeURIComponent(escape(atob(code.trim())))) as SaveData;
    if (data.version !== 1) return null;
    return data;
  } catch {
    return null;
  }
}
