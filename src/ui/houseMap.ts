/**
 * CRAYON HOUSE CUTAWAY — level-select engine (U1 packet).
 *
 * Renders the scrollable house cross-section from src/ui/houseMapData.ts: nine themed rooms drawn
 * crayon-style (inline SVG, colors from THEME_PALETTES), a winding SVG crumb-trail threading every
 * level node in world order, node buttons in three states (+ boss doors + secret nodes), a
 * tap-to-open bottom-sheet level card (name/stars/best/pet-picker/PLAY), native vertical scroll
 * with scroll-snap, a whole-house zoom-out fast-travel toggle, and unlock/travel juice. Reduced
 * motion respected. See docs/superpowers/plans/2026-07-05-mobile-store-revamp.md §A1/§A3/§A4.
 *
 * Owns NO game state: it reads `save` + meta/progress helpers and forwards player intent through
 * the callbacks (identical contracts to the old buildLevelSelect — onPick/onPickSecret/onPetChange/
 * onBack/onJournal/onJunkDrawer/onEndless). screens.ts wraps this so ui.ts is untouched.
 */
import type { SaveData } from '../meta/save';
import type { RoomTheme } from '../sim/types';
import { levelById } from '../content';
import { LEVEL_ICONS } from './icons';
import { THEME_PALETTES, type ThemePalette } from '../render/palette';
import {
  worldsGrouped, bossLevelOf, isLevelUnlocked, isWorldUnlocked, starsFor,
  furthestUnlockedLevel, prerequisiteRoomLabel,
  SECRET_LEVELS, isSecretUnlocked, secretLockHint, type SecretLevelId,
} from '../meta/progress';
import { SCENE, ROOMS, NODES, SECRET_NODES, PATH } from './houseMapData';
import { buildStatusRibbon } from './statusRibbon';

export interface HouseMapCallbacks {
  onPick: (levelId: string) => void;
  onPickSecret?: (levelId: string) => void;
  onPetChange: (pet: 'cat' | 'dog' | 'goldfish' | null) => void;
  onBack: () => void;
  onJournal: () => void;
  onJunkDrawer: () => void;
  onEndless?: () => void;
  /** THE TOWER STORE (Addendum 2 §2) — the corner "🛒" button. */
  onStore?: () => void;
}

const el = (tag: string, cls = '', html = ''): HTMLElement => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};

const reducedMotion = (): boolean => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Title-Case a kid-voice room label ("the living room" → "The Living Room") so EVERY room label
 *  matches the title-menu convention ("My Journal", "The Junk Drawer"). Fixes the U1 casing drift
 *  where map labels rendered inconsistently ("The Kitchen" vs "the Living Room"). */
const titleCase = (s: string): string => s.replace(/\b\w/g, (c) => c.toUpperCase());
/** Canonical Title-Case label per theme, derived from the house-map data (all authored as "the X"). */
const ROOM_TITLE = new Map(ROOMS.map((r) => [r.theme, titleCase(r.label)] as const));
const roomTitle = (theme: RoomTheme): string => ROOM_TITLE.get(theme) ?? titleCase(theme);

/** Fallback room glyph for nodes without a bespoke LEVEL_ICONS entry. */
const ROOM_ICON: Record<RoomTheme, string> = {
  kitchen: '🍰', living: '🛋️', bathroom: '🚿', bedroom: '🛏️', garage: '🚗',
  basement: '🕸️', attic: '📦', backyard: '🌳', sewer: '🚽', secret: '❓',
};

const GATEWAY_ICON: Record<string, string> = {
  door: '🚪', stairs: '🪜', vent: '🕳️', chute: '⤵️', pipe: '🚰',
};

const PET_OPTIONS: { id: 'cat' | 'dog' | 'goldfish' | null; icon: string; name: string; desc: string }[] = [
  { id: null, icon: '🚫', name: 'none', desc: 'just you and the towers.' },
  { id: 'cat', icon: '🐱', name: 'Princess Destructo', desc: 'might swat your towers. might delete a wave. no promises.' },
  { id: 'dog', icon: '🐶', name: 'Sir Barksalot', desc: 'barks critters silly. eats your crumbs.' },
  { id: 'goldfish', icon: '🐟', name: 'The Oracle', desc: 'does nothing. knows everything.' },
];

const hx = (n: number): string => `#${(n & 0xffffff).toString(16).padStart(6, '0')}`;
/** Multiply an 0xRRGGBB toward black by k (0..1). */
const darken = (n: number, k: number): string => {
  const r = Math.round(((n >> 16) & 0xff) * k);
  const g = Math.round(((n >> 8) & 0xff) * k);
  const b = Math.round((n & 0xff) * k);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};
const lighten = (n: number, k: number): string => {
  const kk = Math.max(0, Math.min(1, k));
  const r = Math.min(255, Math.round(((n >> 16) & 0xff) + (255 - ((n >> 16) & 0xff)) * kk));
  const g = Math.min(255, Math.round(((n >> 8) & 0xff) + (255 - ((n >> 8) & 0xff)) * kk));
  const b = Math.min(255, Math.round((n & 0xff) + (255 - (n & 0xff)) * kk));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
};
/** Perceptual-ish luminance 0..1 of an 0xRRGGBB. */
const lumOf = (n: number): number =>
  (0.299 * ((n >> 16) & 0xff) + 0.587 * ((n >> 8) & 0xff) + 0.114 * (n & 0xff)) / 255;
/** How much to lift a room's colors for MAP legibility — 0 for already-bright themes (kitchen),
 *  up to ~0.45 for the in-game-dark ones (bedroom/basement/sewer) so the cutaway stays a readable
 *  crayon drawing while keeping each theme's hue. */
const mapBoost = (pal: Pal): number => Math.max(0, 0.55 - lumOf(pal.wallCream));

const INK = '#4a2f1a'; // brand cocoa outline
const STROKE = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
const STROKE_THIN = `stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;

// ---------------------------------------------------------------------------
// SVG furniture painters — crayon silhouettes: 2-tone cel (upper-left light) + cocoa outline +
// 1-3 identifying marks. Colors come from the room's THEME_PALETTE so each room reads as itself.
// ---------------------------------------------------------------------------
type Pal = ThemePalette;
const CHERRY = '#cc5544';
const DENIM = '#3f5d7d';

const box = (x: number, y: number, w: number, h: number, fill: string, dark: string, r = 6): string =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${fill}"/>` +
  `<rect x="${x}" y="${y + h * 0.56}" width="${w}" height="${h * 0.44}" rx="${Math.min(r, 3)}" fill="${dark}" opacity="0.5"/>` +
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" ${STROKE}/>`;

function paintFurniture(f: { kind: string; x: number; y: number; w: number; h: number; tilt?: number }, pal: Pal): string {
  const { x, y, w, h } = f;
  const cx = x + w / 2, cy = y + h / 2;
  const b = mapBoost(pal);
  const wood = lighten(pal.wood, b), woodD = darken(pal.wood, 0.62 + b * 0.3);
  const met = lighten(pal.metal, b * 0.85), metD = darken(pal.metal, 0.6 + b * 0.25);
  const cab = lighten(pal.cabinet, b), cabD = darken(pal.cabinet, 0.62 + b * 0.3);
  const top = lighten(pal.counterTop, b * 0.7);
  let body = '';

  switch (f.kind) {
    case 'fridge':
      body = box(x, y, w, h, met, metD, 7) +
        `<line x1="${x + w * 0.72}" y1="${y + 8}" x2="${x + w * 0.72}" y2="${y + h - 8}" ${STROKE_THIN}/>` +
        `<rect x="${x + w * 0.76}" y="${y + h * 0.16}" width="4" height="${h * 0.2}" rx="2" fill="${INK}"/>`;
      break;
    case 'stove':
      body = box(x, y, w, h, met, metD, 6) +
        [[0.3, 0.32], [0.7, 0.32], [0.3, 0.66], [0.7, 0.66]].map(([bx, by]) =>
          `<circle cx="${x + w * bx}" cy="${y + h * by}" r="${Math.min(w, h) * 0.11}" fill="${darken(pal.metalDark, 0.7)}" ${STROKE_THIN}/>`).join('');
      break;
    case 'sink': {
      body = box(x, y, w, h, top, darken(pal.counterTop, 0.7), 5) +
        `<ellipse cx="${cx}" cy="${y + h * 0.6}" rx="${w * 0.3}" ry="${h * 0.22}" fill="${darken(pal.metal, 0.72)}" ${STROKE_THIN}/>` +
        `<path d="M${cx} ${y + h * 0.32} q ${w * 0.14} -6 ${w * 0.14} 8" fill="none" ${STROKE_THIN}/>`;
      break;
    }
    case 'counter':
    case 'table':
    case 'workbench':
      body = box(x, y, w, h * 0.5, top, darken(pal.counterTop, 0.72), 5) +
        `<rect x="${x + w * 0.06}" y="${y + h * 0.5}" width="7" height="${h * 0.5}" fill="${woodD}"/>` +
        `<rect x="${x + w * 0.9}" y="${y + h * 0.5}" width="7" height="${h * 0.5}" fill="${woodD}"/>`;
      break;
    case 'dresser':
      body = box(x, y, w, h, wood, woodD, 5) +
        `<line x1="${x + 6}" y1="${y + h / 3}" x2="${x + w - 6}" y2="${y + h / 3}" ${STROKE_THIN}/>` +
        `<line x1="${x + 6}" y1="${y + 2 * h / 3}" x2="${x + w - 6}" y2="${y + 2 * h / 3}" ${STROKE_THIN}/>`;
      break;
    case 'bookshelf':
    case 'shelfunit':
      body = box(x, y, w, h, wood, woodD, 4) +
        [0.28, 0.52, 0.76].map((fy) => `<line x1="${x + 4}" y1="${y + h * fy}" x2="${x + w - 4}" y2="${y + h * fy}" ${STROKE_THIN}/>`).join('') +
        [0.15, 0.4, 0.62].map((bx, i) => `<rect x="${x + w * bx}" y="${y + h * (0.06 + (i % 2) * 0.02)}" width="${w * 0.14}" height="${h * 0.18}" fill="${[CHERRY, '#d8a020', DENIM][i] ?? cab}"/>`).join('');
      break;
    case 'trunk':
      body = box(x, y + h * 0.18, w, h * 0.82, wood, woodD, 5) +
        `<path d="M${x} ${y + h * 0.2} q ${w / 2} ${-h * 0.28} ${w} 0 z" fill="${lighten(pal.wood, 0.12)}" ${STROKE}/>` +
        `<rect x="${cx - 6}" y="${y + h * 0.4}" width="12" height="10" rx="2" fill="${met}" ${STROKE_THIN}/>`;
      break;
    case 'boxes':
      body = box(x, y, w * 0.62, h, '#c89a62', '#8a6238', 3) +
        box(x + w * 0.52, y + h * 0.24, w * 0.48, h * 0.76, '#d8ad76', '#9a7040', 3) +
        `<line x1="${x + w * 0.31}" y1="${y}" x2="${x + w * 0.31}" y2="${y + h}" ${STROKE_THIN}/>`;
      break;
    case 'beam':
      body = box(x, y, w, h, wood, woodD, 3);
      break;
    case 'planter':
      body = `<path d="M${x + w * 0.12} ${y + h * 0.35} L${x + w * 0.88} ${y + h * 0.35} L${x + w * 0.78} ${y + h} L${x + w * 0.22} ${y + h} z" fill="${woodD}" ${STROKE}/>` +
        `<ellipse cx="${cx}" cy="${y + h * 0.3}" rx="${w * 0.42}" ry="${h * 0.16}" fill="#5f9345"/>` +
        `<circle cx="${cx}" cy="${y + h * 0.16}" r="${w * 0.16}" fill="#e8657f" ${STROKE_THIN}/>`;
      break;
    case 'sofa':
    case 'bed': {
      const soft = f.kind === 'bed' ? lighten(pal.cabinet, 0.2) : cab;
      const softD = darken(pal.cabinet, 0.66);
      body = box(x, y + h * 0.34, w, h * 0.66, soft, softD, 10);
      if (f.kind === 'sofa') {
        body += box(x, y, w, h * 0.5, soft, softD, 10) +
          `<rect x="${x - 4}" y="${y + h * 0.3}" width="12" height="${h * 0.5}" rx="6" fill="${soft}" ${STROKE}/>` +
          `<rect x="${x + w - 8}" y="${y + h * 0.3}" width="12" height="${h * 0.5}" rx="6" fill="${soft}" ${STROKE}/>`;
      } else {
        body += `<rect x="${x + w * 0.06}" y="${y + h * 0.12}" width="${w * 0.34}" height="${h * 0.3}" rx="6" fill="#fff4e0" ${STROKE}/>`;
        body += `<rect x="${x}" y="${y + h * 0.46}" width="${w}" height="${h * 0.2}" fill="${CHERRY}" opacity="0.8"/>`;
      }
      break;
    }
    case 'tv':
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h * 0.82}" rx="5" fill="#2b2d34" ${STROKE}/>` +
        `<rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${h * 0.82 - 8}" rx="3" fill="${lighten(pal.windowSky, 0.1)}" opacity="0.55"/>` +
        `<rect x="${cx - w * 0.16}" y="${y + h * 0.82}" width="${w * 0.32}" height="${h * 0.18}" fill="${metD}"/>`;
      break;
    case 'rug':
      body = `<ellipse cx="${cx}" cy="${cy}" rx="${w / 2}" ry="${h / 2}" fill="${lighten(pal.cabinet, 0.12)}" ${STROKE}/>` +
        `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.32}" ry="${h * 0.32}" fill="none" ${STROKE_THIN}/>`;
      break;
    case 'lamp':
      body = `<rect x="${cx - 3}" y="${y + h * 0.3}" width="6" height="${h * 0.6}" fill="${woodD}"/>` +
        `<ellipse cx="${cx}" cy="${y + h * 0.92}" rx="${w * 0.4}" ry="6" fill="${woodD}"/>` +
        `<path d="M${x + w * 0.16} ${y + h * 0.32} L${x + w * 0.84} ${y + h * 0.32} L${x + w * 0.7} ${y} L${x + w * 0.3} ${y} z" fill="${hx(pal.sunbeam)}" ${STROKE}/>`;
      break;
    case 'tub':
      body = `<rect x="${x}" y="${y + h * 0.2}" width="${w}" height="${h * 0.8}" rx="${h * 0.4}" fill="#eef4f5" ${STROKE}/>` +
        `<rect x="${x + w * 0.1}" y="${y + h * 0.34}" width="${w * 0.8}" height="${h * 0.44}" rx="${h * 0.22}" fill="${lighten(pal.windowSky, 0.2)}" opacity="0.7"/>` +
        `<circle cx="${x + w * 0.9}" cy="${y + h * 0.16}" r="5" fill="${met}" ${STROKE_THIN}/>`;
      break;
    case 'toilet':
      body = `<ellipse cx="${cx}" cy="${y + h * 0.62}" rx="${w * 0.42}" ry="${h * 0.34}" fill="#eef4f5" ${STROKE}/>` +
        `<rect x="${x + w * 0.14}" y="${y}" width="${w * 0.72}" height="${h * 0.4}" rx="5" fill="#e6eef0" ${STROKE}/>`;
      break;
    case 'mirror':
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${lighten(pal.windowSky, 0.25)}" ${STROKE}/>` +
        `<line x1="${x + w * 0.28}" y1="${y + h * 0.12}" x2="${x + w * 0.12}" y2="${y + h * 0.5}" stroke="#ffffff" stroke-width="4" stroke-linecap="round" opacity="0.7"/>`;
      break;
    case 'window':
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${hx(pal.windowSky)}" ${STROKE}/>` +
        `<line x1="${cx}" y1="${y}" x2="${cx}" y2="${y + h}" ${STROKE_THIN}/>` +
        `<line x1="${x}" y1="${cy}" x2="${x + w}" y2="${cy}" ${STROKE_THIN}/>`;
      break;
    case 'car':
      body = `<rect x="${x}" y="${y + h * 0.34}" width="${w}" height="${h * 0.42}" rx="10" fill="#c0503c" ${STROKE}/>` +
        `<path d="M${x + w * 0.2} ${y + h * 0.36} L${x + w * 0.32} ${y + h * 0.06} L${x + w * 0.72} ${y + h * 0.06} L${x + w * 0.82} ${y + h * 0.36} z" fill="${lighten(pal.windowSky, 0.1)}" ${STROKE}/>` +
        [0.26, 0.74].map((bx) => `<circle cx="${x + w * bx}" cy="${y + h * 0.8}" r="${h * 0.18}" fill="#2b2d34" ${STROKE}/>`).join('');
      break;
    case 'pipe':
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${met}" ${STROKE}/>` +
        `<rect x="${x}" y="${y + h * 0.2}" width="${w}" height="${h * 0.24}" fill="#ffffff" opacity="0.35"/>` +
        [0.1, 0.9].map((bx) => `<rect x="${x + w * bx - 4}" y="${y - 3}" width="8" height="${h + 6}" rx="2" fill="${metD}" ${STROKE_THIN}/>`).join('');
      break;
    case 'valve':
      body = `<circle cx="${cx}" cy="${cy}" r="${Math.min(w, h) * 0.34}" fill="${met}" ${STROKE}/>` +
        `<line x1="${cx - w * 0.44}" y1="${cy}" x2="${cx + w * 0.44}" y2="${cy}" ${STROKE}/>` +
        `<line x1="${cx}" y1="${cy - h * 0.44}" x2="${cx}" y2="${cy + h * 0.44}" ${STROKE}/>`;
      break;
    case 'ladder':
      body = `<rect x="${x + w * 0.1}" y="${y}" width="6" height="${h}" rx="3" fill="${woodD}"/>` +
        `<rect x="${x + w * 0.78}" y="${y}" width="6" height="${h}" rx="3" fill="${woodD}"/>` +
        [0.2, 0.45, 0.7, 0.92].map((fy) => `<line x1="${x + w * 0.1}" y1="${y + h * fy}" x2="${x + w * 0.84}" y2="${y + h * fy}" ${STROKE}/>`).join('');
      break;
    case 'fence':
      body = [0.1, 0.4, 0.7].map((bx) => `<path d="M${x + w * bx} ${y + h} L${x + w * bx} ${y + h * 0.2} L${x + w * bx + w * 0.1} ${y} L${x + w * bx + w * 0.2} ${y + h * 0.2} L${x + w * bx + w * 0.2} ${y + h} z" fill="${wood}" ${STROKE}/>`).join('');
      break;
    case 'grill':
      body = `<path d="M${x} ${y + h * 0.4} a ${w / 2} ${w / 2} 0 0 1 ${w} 0 z" fill="#3a3d44" ${STROKE}/>` +
        `<rect x="${x + w * 0.06}" y="${y + h * 0.4}" width="${w * 0.88}" height="${h * 0.14}" fill="${metD}" ${STROKE_THIN}/>` +
        [0.3, 0.7].map((bx) => `<line x1="${x + w * bx}" y1="${y + h * 0.54}" x2="${x + w * bx}" y2="${y + h}" ${STROKE}/>`).join('');
      break;
    case 'barrel':
      body = box(x, y, w, h, wood, woodD, 8) +
        [0.2, 0.8].map((fy) => `<line x1="${x}" y1="${y + h * fy}" x2="${x + w}" y2="${y + h * fy}" ${STROKE_THIN}/>`).join('');
      break;
    case 'boiler':
      body = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w / 2}" fill="${met}" ${STROKE}/>` +
        `<circle cx="${cx}" cy="${y + h * 0.28}" r="${w * 0.22}" fill="#eee" ${STROKE_THIN}/>` +
        `<line x1="${cx}" y1="${y + h * 0.28}" x2="${cx + w * 0.12}" y2="${y + h * 0.2}" ${STROKE_THIN}/>`;
      break;
    default:
      body = box(x, y, w, h, wood, woodD, 5);
  }
  return `<g transform="rotate(${f.tilt ?? 0} ${cx} ${cy})">${body}</g>`;
}

// ---------------------------------------------------------------------------
// Crumb path — Catmull-Rom smoothing to a cubic-bezier "d" string.
// ---------------------------------------------------------------------------
function smoothPath(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length < 3) return `M${pts.map((p) => `${p.x} ${p.y}`).join(' L')}`;
  let d = `M${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + (p2.x - p0.x) / 6, c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6, c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x} ${c1y} ${c2x} ${c2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Nearest PATH-vertex index for a node (nodes are authored onto PATH, so this is usually exact). */
function pathIndexFor(node: { x: number; y: number }): number {
  let best = 0, bestD = Infinity;
  for (let i = 0; i < PATH.length; i++) {
    const d = (PATH[i].x - node.x) ** 2 + (PATH[i].y - node.y) ** 2;
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

// Session memory: detect boss-clear entry to play the path-draw/travel juice (no save field needed).
let prevFurthestId: string | null = null;

export function buildHouseMap(save: SaveData, cb: HouseMapCallbacks): HTMLElement {
  const screen = el('div', 'screen house-screen house2');

  const worlds = worldsGrouped();
  const bossIds = new Set(worlds.map((w) => bossLevelOf(w).id));
  const furthest = furthestUnlockedLevel(save);
  const roomByTheme = new Map<RoomTheme, typeof ROOMS[number]>();
  ROOMS.forEach((r) => roomByTheme.set(r.theme, r));

  // ---------- top bar: back + ribbon + utility cluster ----------
  const topbar = el('div', 'house2-topbar');
  const back = el('button', 'house2-back wood-btn small', '← Fridge');
  back.onclick = cb.onBack;
  const ribbon = el('div', 'house2-ribbon');
  ribbon.append(buildStatusRibbon(save, true));
  const cluster = el('div', 'house2-corner');
  const journalBtn = el('button', 'house2-util wood-btn small', '📔');
  journalBtn.title = 'My Journal';
  journalBtn.onclick = cb.onJournal;
  const drawerBtn = el('button', 'house2-util wood-btn small', '🗄️');
  drawerBtn.title = 'The Junk Drawer';
  drawerBtn.onclick = cb.onJunkDrawer;
  cluster.append(journalBtn, drawerBtn);
  if (cb.onStore) {
    const storeBtn = el('button', 'house2-util wood-btn small', '🛒');
    storeBtn.title = 'Tower Store';
    storeBtn.onclick = () => cb.onStore?.();
    cluster.append(storeBtn);
  }
  if (cb.onEndless && (save.stars['kitchen-5'] ?? 0) > 0) {
    const endlessBtn = el('button', 'house2-util wood-btn small', '🥫');
    endlessBtn.title = `Pantry Panic${save.stats.endlessBest ? ` — best ${save.stats.endlessBest}` : ''}`;
    endlessBtn.onclick = () => cb.onEndless?.();
    cluster.append(endlessBtn);
  }
  topbar.append(back, ribbon, cluster);
  screen.append(topbar);

  // ---------- viewport + stage ----------
  const viewport = el('div', 'house2-viewport');
  const stage = el('div', 'house2-stage');
  stage.style.setProperty('--scene-h', String(SCENE.h));

  // Build the whole scene as one markup string (SVG art + DOM overlays), then wire handlers.
  const svg = buildSceneSVG(save, bossIds, furthest.id, roomByTheme);
  stage.innerHTML = svg;

  // node/secret/gateway/roomhit overlays
  const overlay = el('div', 'house2-nodes');
  overlay.innerHTML =
    buildRoomOverlays(save) +
    buildGatewayGlyphs(save) +
    buildNodeButtons(save, bossIds, furthest.id) +
    buildSecretButtons(save);
  stage.append(overlay);

  viewport.append(stage);
  screen.append(viewport);

  // ---------- zoom-out fast-travel toggle ----------
  const zoomBtn = el('button', 'house2-zoombtn wood-btn small', '🏠 Whole House');
  screen.append(zoomBtn);

  // ---------- mirrored bottom-left back (mobile thumb zone) ----------
  const backBottom = el('button', 'house2-back-bottom wood-btn small', '← Fridge');
  backBottom.onclick = cb.onBack;
  screen.append(backBottom);

  // ---------- bottom sheet ----------
  const scrim = el('div', 'house2-scrim');
  const sheet = el('div', 'house2-sheet');
  screen.append(scrim, sheet);

  let sheetOpen = false;
  const closeSheet = (): void => {
    sheetOpen = false;
    sheet.classList.remove('open');
    scrim.classList.remove('show');
  };
  scrim.onclick = closeSheet;

  const openLevelSheet = (levelId: string): void => {
    const level = levelById(levelId);
    const stars = starsFor(save, levelId);
    const isBoss = bossIds.has(levelId);
    sheet.innerHTML = '';
    sheet.append(el('div', 'house2-sheet-handle'));
    const head = el('div', 'house2-sheet-head');
    head.innerHTML = `
      <div class="h2s-ico">${LEVEL_ICONS[levelId] ?? ROOM_ICON[level.theme]}</div>
      <div class="h2s-titles">
        <div class="h2s-name">${isBoss ? '👑 ' : ''}${level.name}</div>
        <div class="h2s-sub">${roomTitle(level.theme)} · level ${level.index}</div>
      </div>`;
    sheet.append(head);

    const starRow = el('div', 'house2-sheet-stars');
    starRow.innerHTML = [0, 1, 2].map((i) => `<span class="${i < stars ? 'on' : 'off'}">★</span>`).join('');
    sheet.append(starRow);

    const best = stars > 0
      ? `🏆 best: ${stars}/3 star${stars === 1 ? '' : 's'}${stars >= 3 ? ' — challenge cleared!' : ''}`
      : '✨ not beaten yet — go get it!';
    sheet.append(el('div', 'house2-sheet-best', best));
    sheet.append(el('div', 'house2-sheet-blurb', `“${level.blurb}”`));
    if (level.challenge?.text) sheet.append(el('div', 'house2-sheet-chal', `⭐ challenge: ${level.challenge.text}`));

    sheet.append(buildPetPicker(save, cb.onPetChange));

    const play = el('button', 'house2-sheet-play wood-btn', '🎂 PLAY');
    play.onclick = () => { closeSheet(); cb.onPick(levelId); };
    sheet.append(play);

    sheetOpen = true;
    sheet.classList.add('open');
    scrim.classList.add('show');
  };

  const openSecretSheet = (levelId: string, unlocked: boolean): void => {
    const level = levelById(levelId);
    sheet.innerHTML = '';
    sheet.append(el('div', 'house2-sheet-handle'));
    const head = el('div', 'house2-sheet-head');
    head.innerHTML = `
      <div class="h2s-ico">${unlocked ? (LEVEL_ICONS[levelId] ?? '❓') : '🔒'}</div>
      <div class="h2s-titles">
        <div class="h2s-name">${unlocked ? level.name : '??? — a secret'}</div>
        <div class="h2s-sub">hidden room</div>
      </div>`;
    sheet.append(head);
    if (unlocked) {
      sheet.append(el('div', 'house2-sheet-blurb', `“${level.blurb}”`));
      sheet.append(buildPetPicker(save, cb.onPetChange));
      const play = el('button', 'house2-sheet-play wood-btn', '🌀 ENTER');
      play.onclick = () => { closeSheet(); cb.onPickSecret?.(levelId); };
      sheet.append(play);
    } else {
      sheet.append(el('div', 'house2-sheet-best', '🔎 a hidden level lurks here...'));
      sheet.append(el('div', 'house2-sheet-blurb', secretLockHint(levelId as SecretLevelId)));
    }
    sheetOpen = true;
    sheet.classList.add('open');
    scrim.classList.add('show');
  };

  // ---------- wire node / secret / roomhit handlers ----------
  overlay.querySelectorAll<HTMLElement>('.house2-node').forEach((btn) => {
    const id = btn.dataset.level!;
    if (btn.classList.contains('locked')) return; // locked: prereq shown via title only
    btn.onclick = () => openLevelSheet(id);
  });
  overlay.querySelectorAll<HTMLElement>('.house2-secret').forEach((btn) => {
    const id = btn.dataset.level!;
    const unlocked = isSecretUnlocked(save, id as SecretLevelId);
    btn.onclick = () => openSecretSheet(id, unlocked);
  });

  // ---------- zoom-out fast-travel ----------
  let zoomed = false;
  const setZoom = (on: boolean): void => {
    zoomed = on;
    if (on) {
      const vh = viewport.clientHeight;
      const defaultW = stage.getBoundingClientRect().width;
      const fitW = Math.min(defaultW, (vh - 24) * SCENE.w / SCENE.h);
      stage.style.width = `${fitW}px`;
      viewport.classList.add('zoomed');
      zoomBtn.textContent = '🔍 Zoom In';
    } else {
      stage.style.width = '';
      viewport.classList.remove('zoomed');
      zoomBtn.textContent = '🏠 Whole House';
    }
  };
  zoomBtn.onclick = () => setZoom(!zoomed);

  // tap a room while zoomed → snap in and center it
  overlay.querySelectorAll<HTMLElement>('.house2-roomhit').forEach((hit) => {
    hit.onclick = () => {
      if (!zoomed) return;
      const cy = Number(hit.dataset.cy);
      setZoom(false);
      requestAnimationFrame(() => scrollToSceneY(viewport, stage, cy, !reducedMotion()));
    };
  });

  // ---------- initial scroll + boss-clear travel juice ----------
  requestAnimationFrame(() => {
    const node = NODES.find((n) => n.levelId === furthest.id);
    const cy = node ? node.y : SCENE.h * 0.5;
    const bossJustCleared = prevFurthestId !== null && prevFurthestId !== furthest.id
      && levelById(prevFurthestId).theme !== furthest.theme;
    prevFurthestId = furthest.id;

    if (bossJustCleared && !reducedMotion()) {
      // start at the previous node, then scripted scroll into the new room as the path draws.
      const prevNode = NODES.find((n) => n.levelId === furthestBefore(save, furthest.id));
      scrollToSceneY(viewport, stage, prevNode ? prevNode.y : cy, false);
      playPathDraw(stage);
      setTimeout(() => scrollToSceneY(viewport, stage, cy, true), 260);
    } else {
      scrollToSceneY(viewport, stage, cy, false);
    }
  });

  // ---------- edge auto-scroll (PC) ----------
  // With a mouse, hovering the top/bottom band of the map scrolls it — faster the closer the
  // cursor is to the edge (like an RTS camera). Disabled on touch (no hover), while the level
  // sheet is open, and under reduced-motion.
  const EDGE_BAND = 120;        // px from top/bottom edge that starts scrolling
  const EDGE_MAX_SPEED = 15;    // px/frame at the very edge
  const finePointer = matchMedia('(pointer: fine)').matches;
  if (finePointer && !reducedMotion()) {
    let edgeDir = 0;            // -1 up, +1 down, 0 idle
    let edgeStrength = 0;       // 0..1 proximity ramp
    let edgeRAF = 0;
    const stopEdge = (): void => {
      if (edgeRAF) { cancelAnimationFrame(edgeRAF); edgeRAF = 0; }
      edgeDir = 0;
    };
    const stepEdge = (): void => {
      if (edgeDir === 0 || sheetOpen || zoomed) { edgeRAF = 0; return; }
      viewport.scrollTop += edgeDir * EDGE_MAX_SPEED * edgeStrength;
      edgeRAF = requestAnimationFrame(stepEdge);
    };
    viewport.addEventListener('mousemove', (e) => {
      if (sheetOpen || zoomed) { stopEdge(); return; }
      const r = viewport.getBoundingClientRect();
      const fromTop = e.clientY - r.top;
      const fromBottom = r.bottom - e.clientY;
      if (fromTop < EDGE_BAND) {
        edgeDir = -1;
        edgeStrength = Math.max(0.12, 1 - fromTop / EDGE_BAND);
      } else if (fromBottom < EDGE_BAND) {
        edgeDir = 1;
        edgeStrength = Math.max(0.12, 1 - fromBottom / EDGE_BAND);
      } else {
        edgeDir = 0;
      }
      if (edgeDir !== 0 && !edgeRAF) edgeRAF = requestAnimationFrame(stepEdge);
      else if (edgeDir === 0) stopEdge();
    });
    viewport.addEventListener('mouseleave', stopEdge);
  }

  // keep sheet dismissable via Escape without stealing gameplay keys (this screen has no others)
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && sheetOpen) { closeSheet(); }
  };
  screen.addEventListener('keydown', onKey);

  return screen;
}

/** The node one step before `currentId` in world order (for the travel-start position). */
function furthestBefore(_save: SaveData, currentId: string): string {
  const idx = NODES.findIndex((n) => n.levelId === currentId);
  return idx > 0 ? NODES[idx - 1].levelId : currentId;
}

function scrollToSceneY(viewport: HTMLElement, stage: HTMLElement, sceneY: number, smooth: boolean): void {
  const stageH = stage.getBoundingClientRect().height || (stage.clientHeight);
  const target = (sceneY / SCENE.h) * stageH - viewport.clientHeight / 2;
  viewport.scrollTo({ top: Math.max(0, target), behavior: smooth ? 'smooth' : 'auto' });
}

function playPathDraw(stage: HTMLElement): void {
  const draw = stage.querySelector<SVGPathElement>('.house2-path-draw');
  if (!draw) return;
  draw.classList.remove('drawing');
  void (draw as unknown as HTMLElement).offsetWidth; // reflow to restart
  draw.classList.add('drawing');
}

// ---------------------------------------------------------------------------
// Markup builders.
// ---------------------------------------------------------------------------
function buildSceneSVG(
  save: SaveData,
  _bossIds: Set<string>,
  furthestId: string,
  roomByTheme: Map<RoomTheme, typeof ROOMS[number]>,
): string {
  const W = SCENE.w, H = SCENE.h;
  let rooms = '';
  let furniture = '';
  for (const room of ROOMS) {
    const pal = THEME_PALETTES[room.theme];
    const { x, y, w, h } = room.rect;
    const unlocked = isWorldUnlocked(save, worldsFor(room.theme));
    const b = mapBoost(pal);
    const wall = lighten(pal.wallCream, 0.12 + b * 1.15);
    const floor = lighten(pal.floorTileA, 0.04 + b);
    rooms += `<g class="h2-room${unlocked ? '' : ' locked'}">
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${wall}"/>
      <rect x="${x}" y="${y + h - Math.min(34, h * 0.14)}" width="${w}" height="${Math.min(34, h * 0.14)}" rx="6" fill="${floor}"/>
      <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="none" stroke="${INK}" stroke-width="4" stroke-dasharray="2 9" stroke-linecap="round"/>
    </g>`;
    for (const f of room.furniture) furniture += paintFurniture(f, pal);
    if (!unlocked) {
      // fog wash (desaturating, not blackening) + a clear padlock in the upper-middle so the
      // "beat X first" scribble below stays legible.
      const lock = Math.min(96, Math.min(w, h) * 0.26);
      furniture += `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#efe6d2" opacity="0.62"/>` +
        `<text x="${x + w / 2}" y="${y + h * 0.36}" font-size="${lock}" text-anchor="middle" dominant-baseline="central">🔒</text>`;
    }
  }

  // crumb path: ahead (faint) full, traveled (bright) up to current, plus a hidden draw overlay
  const furthestNode = NODES.find((n) => n.levelId === furthestId);
  const cutIdx = furthestNode ? pathIndexFor(furthestNode) : 0;
  const traveledPts = PATH.slice(0, Math.max(2, cutIdx + 1));
  const dAll = smoothPath(PATH);
  const dTrav = smoothPath(traveledPts);
  const drawStart = furthestNode ? Math.max(0, pathIndexFor({ x: furthestNode.x, y: furthestNode.y }) - 5) : 0;
  const dDraw = smoothPath(PATH.slice(drawStart, cutIdx + 1));

  const path = `
    <path class="h2-path-ahead" d="${dAll}" fill="none" stroke="#7a5a3a" stroke-width="6" stroke-linecap="round" stroke-dasharray="2 15" opacity="0.35"/>
    <path class="h2-path-glow" d="${dTrav}" fill="none" stroke="#ffcf6a" stroke-width="15" stroke-linecap="round" opacity="0.28"/>
    <path class="h2-path-crumbs" d="${dTrav}" fill="none" stroke="#f2b23c" stroke-width="7" stroke-linecap="round" stroke-dasharray="1.5 13"/>
    <path class="house2-path-draw" d="${dDraw}" pathLength="1" fill="none" stroke="#fff0c0" stroke-width="8" stroke-linecap="round"/>`;

  return `<svg class="house2-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="house level map">
    <defs>
      <filter id="h2wob" x="-4%" y="-2%" width="108%" height="104%">
        <feTurbulence type="fractalNoise" baseFrequency="0.014" numOctaves="2" seed="7" result="n"/>
        <feDisplacementMap in="SourceGraphic" in2="n" scale="4.5" xChannelSelector="R" yChannelSelector="G"/>
      </filter>
      <radialGradient id="h2paper" cx="50%" cy="18%" r="90%">
        <stop offset="0%" stop-color="#fbf3df"/><stop offset="100%" stop-color="#eaddc0"/>
      </radialGradient>
    </defs>
    <rect x="0" y="0" width="${W}" height="${H}" fill="url(#h2paper)"/>
    <g filter="url(#h2wob)">
      ${rooms}
      ${furniture}
      ${path}
    </g>
  </svg>`;
}

function worldsFor(theme: RoomTheme): import('../sim/types').LevelDef[] {
  return worldsGrouped().find((w) => w[0].theme === theme) ?? [];
}

function pct(v: number, total: number): string {
  return `${(v / total * 100).toFixed(3)}%`;
}

function buildRoomOverlays(save: SaveData): string {
  // transparent per-room hit rects (fast-travel targets when zoomed) + locked prereq labels
  let html = '';
  for (const room of ROOMS) {
    const { x, y, w, h } = room.rect;
    const wl = worldsFor(room.theme);
    const unlocked = isWorldUnlocked(save, wl);
    const cyc = y + h / 2;
    html += `<div class="house2-roomhit" data-cy="${cyc}" style="left:${pct(x, SCENE.w)};top:${pct(y, SCENE.h)};width:${pct(w, SCENE.w)};height:${pct(h, SCENE.h)}"></div>`;
    html += `<div class="house2-roomlabel${unlocked ? '' : ' locked'}" style="left:${pct(x + w / 2, SCENE.w)};top:${pct(y + 4, SCENE.h)}">${titleCase(room.label)}</div>`;
    if (!unlocked) {
      const wi = worldsGrouped().findIndex((wx) => wx[0].theme === room.theme);
      const prereq = prerequisiteRoomLabel(wi);
      html += `<div class="house2-prereq" style="left:${pct(x + w / 2, SCENE.w)};top:${pct(y + h * 0.64, SCENE.h)}">beat ${prereq ?? 'the last room'} first!!</div>`;
    }
  }
  return html;
}

function buildGatewayGlyphs(save: SaveData): string {
  // one glyph per room-to-room gateway (all but the last room). Lit if the NEXT world is unlocked.
  let html = '';
  for (let i = 0; i < ROOMS.length - 1; i++) {
    const room = ROOMS[i];
    const nextWorld = worldsFor(ROOMS[i + 1].theme);
    const lit = nextWorld.length > 0 && isWorldUnlocked(save, nextWorld);
    const g = room.gateway;
    html += `<div class="house2-gateway${lit ? ' lit' : ''}" style="left:${pct(g.x, SCENE.w)};top:${pct(g.y, SCENE.h)}" title="${g.type}">${GATEWAY_ICON[g.type] ?? '🚪'}</div>`;
  }
  return html;
}

/** The "you are here" callout for the current node (U1 fix 4a): auto-flip it to the vertical side
 *  with free space so it never covers a sibling node. On fresh saves the next node sits above-right
 *  of the current one, so the old always-above pill overlapped it — we place the pill OPPOSITE the
 *  nearest neighbour, and nudge it horizontally away from that neighbour too. */
function arrowCallout(cur: { x: number; y: number }): string {
  let nx = cur.x, ny = cur.y, bestD = Infinity;
  for (const n of NODES) {
    if (n.x === cur.x && n.y === cur.y) continue;
    const d = (n.x - cur.x) ** 2 + (n.y - cur.y) ** 2;
    if (d < bestD) { bestD = d; nx = n.x; ny = n.y; }
  }
  const nearTop = cur.y < SCENE.h * 0.08;
  const siblingAbove = ny < cur.y - 6;
  const below = nearTop || siblingAbove;           // flip under the node if a sibling is above it
  const ico = below ? '👆' : '👇';
  // horizontal nudge away from the nearest neighbour (px of the node's own container width)
  const nudge = nx > cur.x + 6 ? -18 : nx < cur.x - 6 ? 18 : 0;
  return `<span class="hn-arrow ${below ? 'below' : 'above'}" style="--nudge:${nudge}px">${ico} you are here</span>`;
}

function buildNodeButtons(save: SaveData, bossIds: Set<string>, furthestId: string): string {
  let html = '';
  for (const n of NODES) {
    const level = levelById(n.levelId);
    // A fully-locked world shows just its greyed room + padlock + "beat X first" scribble — its
    // individual (all-locked) node buttons would only add clutter, so skip them.
    if (!isWorldUnlocked(save, worldsFor(level.theme))) continue;
    const unlocked = isLevelUnlocked(save, level);
    const stars = starsFor(save, n.levelId);
    const done = stars > 0;
    const isBoss = bossIds.has(n.levelId);
    const isCurrent = n.levelId === furthestId;
    const cls = [
      'house2-node',
      isBoss ? 'boss' : '',
      unlocked ? (done ? 'done' : 'open') : 'locked',
      isCurrent ? 'current' : '',
    ].filter(Boolean).join(' ');
    const face = unlocked ? (LEVEL_ICONS[n.levelId] ?? ROOM_ICON[level.theme]) : '🔒';
    const starRow = done
      ? `<span class="hn-stars">${'★'.repeat(stars)}<i>${'★'.repeat(3 - stars)}</i></span>`
      : '';
    const title = unlocked
      ? `${level.name} — ${level.blurb}`
      : 'beat the previous level first!';
    const arrow = isCurrent ? arrowCallout(n) : '';
    html += `<button class="${cls}" data-level="${n.levelId}" title="${title.replace(/"/g, '&quot;')}"
      style="left:${pct(n.x, SCENE.w)};top:${pct(n.y, SCENE.h)}">
      ${arrow}<span class="hn-face">${face}</span><span class="hn-num">${level.index}</span>${starRow}</button>`;
  }
  return html;
}

function buildSecretButtons(save: SaveData): string {
  let html = '';
  for (const s of SECRET_NODES) {
    const unlocked = isSecretUnlocked(save, s.levelId as SecretLevelId);
    const face = unlocked ? (LEVEL_ICONS[s.levelId] ?? '❓') : '?';
    html += `<button class="house2-secret ${unlocked ? 'unlocked' : 'locked'}" data-level="${s.levelId}"
      style="left:${pct(s.x, SCENE.w)};top:${pct(s.y, SCENE.h)}" title="${unlocked ? 'a secret level!' : '???'}">
      <span class="hn-face">${face}</span></button>`;
  }
  return html;
}

// ---------------------------------------------------------------------------
// Pet picker (moved into the bottom sheet, per §A1 — declutters the map).
// ---------------------------------------------------------------------------
function buildPetPicker(save: SaveData, onPetChange: (pet: 'cat' | 'dog' | 'goldfish' | null) => void): HTMLElement {
  const bed = el('div', 'pet-bed house2-sheet-pets');
  bed.append(el('div', 'pet-bed-label', "🛏️ who's coming?"));
  const row = el('div', 'pet-bed-row');
  PET_OPTIONS.forEach((opt) => {
    const btn = el('button', `pet-opt${save.settings.pet === opt.id ? ' picked' : ''}`, `
      <div class="pet-opt-ico">${opt.icon}</div>
      <div class="pet-opt-name">${opt.name}</div>`);
    btn.title = opt.desc;
    btn.onclick = () => {
      save.settings.pet = opt.id;
      onPetChange(opt.id);
      row.querySelectorAll('.pet-opt').forEach((b) => b.classList.remove('picked'));
      btn.classList.add('picked');
    };
    row.append(btn);
  });
  bed.append(row);
  return bed;
}
