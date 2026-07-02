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
  };
  stats: {
    wins: number;
    losses: number;
    kills: number;
    sweeps: number;
    crumbsBanked: number;
  };
  seenNotes: string[];                   // dismissed tutorial notes
}

const KEY = 'counterattack_save_v1';

export function defaultSave(): SaveData {
  return {
    version: 1,
    stars: {},
    settings: { musicVol: 0.7, sfxVol: 0.9, shake: true, difficulty: 'houseguest' },
    stats: { wins: 0, losses: 0, kills: 0, sweeps: 0, crumbsBanked: 0 },
    seenNotes: [],
  };
}

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultSave();
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 1) return defaultSave();
    return { ...defaultSave(), ...data, settings: { ...defaultSave().settings, ...data.settings }, stats: { ...defaultSave().stats, ...data.stats } };
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
