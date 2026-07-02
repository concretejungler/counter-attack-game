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
    shake: boolean;
    difficulty: 'houseguest' | 'homeowner' | 'landlord' | 'condemned';
    /** Player-picked pet chaos agent (GAME-PROMPT §9). Optional-safe like critterdex/flyShooed
     *  below — backfilled to null by loadSave() for saves written before this existed. */
    pet: 'cat' | 'dog' | 'goldfish' | null;
  };
  stats: {
    wins: number;
    losses: number;
    kills: number;
    sweeps: number;
    crumbsBanked: number;
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
}

const KEY = 'counterattack_save_v1';

export function defaultSave(): SaveData {
  return {
    version: 1,
    stars: {},
    settings: { musicVol: 0.7, sfxVol: 0.9, shake: true, difficulty: 'houseguest', pet: null },
    stats: { wins: 0, losses: 0, kills: 0, sweeps: 0, crumbsBanked: 0 },
    seenNotes: [],
    critterdex: { kills: {}, jarred: {}, shinySeen: {} },
    flyShooed: false,
    towerNames: {},
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
      settings: { ...defaultSave().settings, ...data.settings },
      stats: { ...defaultSave().stats, ...data.stats },
      critterdex: {
        kills: { ...(data.critterdex?.kills ?? {}) },
        jarred: { ...(data.critterdex?.jarred ?? {}) },
        shinySeen: { ...(data.critterdex?.shinySeen ?? {}) },
      },
      flyShooed: data.flyShooed ?? false,
      towerNames: { ...(data.towerNames ?? {}) },
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
