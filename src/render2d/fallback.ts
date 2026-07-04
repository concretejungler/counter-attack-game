/**
 * Fallback painters (plan §2 Phase-1 requirement): a rounded blob in the def's
 * palette color + googly eyes + name initial, so EVERY species/tower/boss in
 * `src/content/` renders from day one. Art packets (P3-*) later register real
 * painters that override these by (kind,id).
 *
 * Locked painter signature (plan §3.2): (ctx, size, frame, opts) => void — draw
 * centered in a size x size box, transparent background, outlines included.
 *
 * Color source of truth is `src/render/palette.ts` (imported read-only). Critters
 * with a hand-known palette entry use it; the rest derive a stable, distinct color
 * from an id hash tuned by tier. Towers are colored by damage type (readable at a
 * glance — blue soak, red swat, orange heat, cyan cold, green gas...).
 */

import type { ContentDB, CritterDef, TowerDef, DamageType } from '../sim/types';
import { PAL } from '../render/palette';
import { COCOA_CSS, hex, hsl, lighten, darken, hashStr } from './colors';
import { registerCritterPainter, registerTowerPainter, registerPropPainter, hasPainter, type SpritePainter } from './spriteCache';

// ---- known critter colors (from PAL); others derived by hash+tier ----
const KNOWN_CRITTER: Record<string, number> = {
  'ant-worker': PAL.antWorker,
  'ant-soldier': PAL.antSoldier,
  'ant-bullet': PAL.antBullet,
  'ant-fire': 0xd8452c,
  'ant-carpenter': 0x9a6a3c,
  'fly-house': PAL.flyBody,
  'fly-fruit': PAL.fruitFly,
  'roach': PAL.roach,
  'roach-winged': 0x7a4a2e,
  'roach-nuclear': 0x8fbf3a,
  'mouse-thief': PAL.mouse,
  'slug': PAL.slug,
  'snail': PAL.snailShell,
  'moth': PAL.moth,
  'dust-bunny': PAL.dustBunny,
  'dust-bunnette': lighten(PAL.dustBunny, 0.1),
  'stinkbug': PAL.stinkbug,
  'maggot': 0xe6dcc0,
  'centipede': 0xb5642f,
  'beetle': 0x3f5d4a,
  'rat-knight': 0x8f8f96,
  'silverfish': 0xb8c0cc,
  'mosquito': 0x6a7a5c,
  'wasp-baron': 0xe0b23a,
  'hornet': 0xd88a2a,
  'pigeon': 0x9aa4ae,
  'termite': 0xe0c89a,
};

/** A stable, distinct fill color for a critter def. */
export function critterFallbackColor(def: CritterDef): number {
  const known = KNOWN_CRITTER[def.id];
  if (known !== undefined) return known;
  // derive from id hash: sickly greens/browns/muted range, deepened by tier
  const h = hashStr(def.id);
  const hue = h % 360;
  const sat = 0.4 + ((h >> 8) & 0xff) / 255 * 0.25;
  const light = 0.56 - (def.tier - 1) * 0.05;
  return hsl(hue, sat, Math.max(0.32, light));
}

// ---- tower colors by damage type ----
const DMG_COLOR: Record<DamageType, number> = {
  spray: 0x5f9fd8,
  swat: PAL.cherry,
  heat: PAL.flame,
  cold: 0x8fd8ec,
  gas: PAL.goo,
  sonic: 0xb08fd8,
  light: PAL.butter,
  zap: 0x7ac8ff,
};

export function towerFallbackColor(def: TowerDef): number {
  return DMG_COLOR[def.dmgType] ?? PAL.metal;
}

/** Color for a damage type — shared by projectiles/VFX so a spray shot reads blue, heat orange, etc. */
export function dmgTypeColor(t: DamageType): number {
  return DMG_COLOR[t] ?? PAL.metal;
}

// ---------------------------------------------------------------------------
// painters
// ---------------------------------------------------------------------------

/** Rounded-rect path helper (kept local to avoid a per-frame import in hot code). */
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function googlyEyes(ctx: CanvasRenderingContext2D, cx: number, cy: number, eyeR: number, spread: number, look: number): void {
  for (const sx of [-1, 1]) {
    const ex = cx + sx * spread;
    ctx.beginPath();
    ctx.arc(ex, cy, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = eyeR * 0.35;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex + look * eyeR * 0.4, cy + eyeR * 0.15, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = COCOA_CSS;
    ctx.fill();
  }
}

/** Fallback critter: chunky blob, legs/antennae, googly eyes, name initial. */
export function makeCritterFallback(def: CritterDef): SpritePainter {
  const base = critterFallbackColor(def);
  const belly = lighten(base, 0.3);
  const legCol = darken(base, 0.3);
  const initial = (def.name || def.id).trim().charAt(0).toUpperCase();
  const isBoss = !!def.boss || def.size >= 1;
  const isFly = !!def.flying;

  return (ctx, size, frame, _opts) => {
    const cx = size / 2;
    const cy = size / 2 + size * 0.02;
    const rx = size * (isBoss ? 0.4 : 0.35);
    const ry = size * (isBoss ? 0.34 : 0.3);
    const lw = Math.max(2, size * 0.05);
    const step = frame === 1 ? 1 : -1;

    // legs (alternate by frame for a walk feel)
    ctx.strokeStyle = hex(legCol);
    ctx.lineWidth = Math.max(1.5, size * 0.035);
    for (let i = -1; i <= 1; i++) {
      const ly = cy + ry * 0.15 + i * ry * 0.4;
      const kick = step * (i % 2 === 0 ? 1 : -1) * size * 0.05;
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.8, ly);
      ctx.lineTo(cx - rx * 1.15, ly + size * 0.06 + kick);
      ctx.moveTo(cx + rx * 0.8, ly);
      ctx.lineTo(cx + rx * 1.15, ly + size * 0.06 - kick);
      ctx.stroke();
    }

    // antennae (bugs) or wings hint (fliers)
    ctx.lineWidth = Math.max(1.5, size * 0.03);
    ctx.strokeStyle = COCOA_CSS;
    ctx.beginPath();
    ctx.moveTo(cx - rx * 0.35, cy - ry * 0.7);
    ctx.quadraticCurveTo(cx - rx * 0.6, cy - ry * 1.25, cx - rx * 0.45, cy - ry * 1.45);
    ctx.moveTo(cx + rx * 0.35, cy - ry * 0.7);
    ctx.quadraticCurveTo(cx + rx * 0.6, cy - ry * 1.25, cx + rx * 0.45, cy - ry * 1.45);
    ctx.stroke();
    if (isFly) {
      ctx.fillStyle = 'rgba(230,240,248,0.65)';
      for (const sx of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(cx + sx * rx * 0.9, cy - ry * 0.35, rx * 0.55, ry * 0.4, sx * 0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = Math.max(1, size * 0.02);
        ctx.strokeStyle = COCOA_CSS;
        ctx.stroke();
      }
    }

    // body
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(base);
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();

    // belly highlight
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.32, rx * 0.62, ry * 0.42, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(belly);
    ctx.globalAlpha = 0.7;
    ctx.fill();
    ctx.globalAlpha = 1;

    // eyes
    googlyEyes(ctx, cx, cy - ry * 0.28, size * (isBoss ? 0.1 : 0.11), rx * 0.42, step);

    // name initial on the belly
    ctx.fillStyle = 'rgba(51,33,26,0.8)';
    ctx.font = `700 ${Math.round(size * 0.22)}px "Comic Sans MS", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, cx, cy + ry * 0.42);

    // boss crown
    if (isBoss) {
      ctx.fillStyle = hex(PAL.butter);
      ctx.strokeStyle = COCOA_CSS;
      ctx.lineWidth = Math.max(1.5, size * 0.025);
      const cwy = cy - ry * 1.05;
      ctx.beginPath();
      ctx.moveTo(cx - rx * 0.45, cwy);
      ctx.lineTo(cx - rx * 0.45, cwy - size * 0.09);
      ctx.lineTo(cx - rx * 0.2, cwy - size * 0.03);
      ctx.lineTo(cx, cwy - size * 0.11);
      ctx.lineTo(cx + rx * 0.2, cwy - size * 0.03);
      ctx.lineTo(cx + rx * 0.45, cwy - size * 0.09);
      ctx.lineTo(cx + rx * 0.45, cwy);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  };
}

/** Fallback tower: chunky appliance box with a face + tier pips + ascension rim. */
export function makeTowerFallback(def: TowerDef): SpritePainter {
  const base = towerFallbackColor(def);
  const top = lighten(base, 0.22);
  const dark = darken(base, 0.28);
  const initial = (def.name || def.id).trim().charAt(0).toUpperCase();

  return (ctx, size, frame, opts) => {
    const cx = size / 2;
    const w = size * 0.62;
    const h = size * 0.58;
    const x = cx - w / 2;
    const y = size * 0.28;
    const lw = Math.max(2, size * 0.05);
    const tier = opts.tier ?? 1;
    const ascended = !!opts.variant && opts.variant.includes('ascend');

    // little foot shadow-plate
    ctx.fillStyle = 'rgba(51,33,26,0.18)';
    ctx.beginPath();
    ctx.ellipse(cx, y + h + size * 0.02, w * 0.6, size * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();

    // body box
    roundRect(ctx, x, y, w, h, size * 0.12);
    ctx.fillStyle = hex(base);
    ctx.fill();
    ctx.lineWidth = lw;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();

    // top cap (lighter)
    roundRect(ctx, x + w * 0.08, y - size * 0.06, w * 0.84, size * 0.16, size * 0.07);
    ctx.fillStyle = hex(top);
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, size * 0.03);
    ctx.stroke();

    // face
    googlyEyes(ctx, cx, y + h * 0.42, size * 0.075, w * 0.22, frame === 1 ? 1 : -1);
    ctx.strokeStyle = COCOA_CSS;
    ctx.lineWidth = Math.max(1.5, size * 0.028);
    ctx.beginPath();
    ctx.arc(cx, y + h * 0.62, w * 0.16, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    // initial badge
    ctx.fillStyle = 'rgba(51,33,26,0.7)';
    ctx.font = `700 ${Math.round(size * 0.16)}px "Comic Sans MS", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, cx, y + h * 0.85);

    // tier pips (I / II / III) along the bottom
    const pips = Math.max(1, Math.min(3, tier));
    const pr = size * 0.03;
    const gap = pr * 2.6;
    const px0 = cx - ((pips - 1) * gap) / 2;
    for (let i = 0; i < pips; i++) {
      ctx.beginPath();
      ctx.arc(px0 + i * gap, y + h + size * 0.11, pr, 0, Math.PI * 2);
      ctx.fillStyle = hex(PAL.butter);
      ctx.fill();
      ctx.lineWidth = Math.max(1, size * 0.014);
      ctx.strokeStyle = COCOA_CSS;
      ctx.stroke();
    }

    // ascension golden rim
    if (ascended) {
      roundRect(ctx, x - lw, y - size * 0.08, w + lw * 2, h + size * 0.1, size * 0.14);
      ctx.strokeStyle = hex(PAL.butter);
      ctx.lineWidth = Math.max(2, size * 0.035);
      ctx.stroke();
    }
    void dark;
  };
}

/** Generic prop fallback (a labeled block). Board.ts draws cake/clutter itself; this is a safety net. */
export function makePropFallback(label: string, color: number): SpritePainter {
  const initial = label.trim().charAt(0).toUpperCase();
  return (ctx, size) => {
    const m = size * 0.16;
    roundRect(ctx, m, m, size - m * 2, size - m * 2, size * 0.12);
    ctx.fillStyle = hex(color);
    ctx.fill();
    ctx.lineWidth = Math.max(2, size * 0.045);
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    ctx.fillStyle = 'rgba(51,33,26,0.7)';
    ctx.font = `700 ${Math.round(size * 0.3)}px "Comic Sans MS", system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, size / 2, size / 2);
  };
}

/**
 * Register a fallback painter for every critter and tower in the content DB that
 * does not already have a (real) painter registered. Call in loadLevel AFTER the
 * painters barrels (painters/<kind>/index.ts) have imported (their real painters win).
 */
export function registerFallbackPainters(content: ContentDB): void {
  for (const id in content.critters) {
    if (!hasPainter('critter', id)) registerCritterPainter(id, makeCritterFallback(content.critters[id]));
  }
  for (const id in content.towers) {
    if (!hasPainter('tower', id)) registerTowerPainter(id, makeTowerFallback(content.towers[id]));
  }
  // a couple of generic props used by board.ts's fallbacks
  if (!hasPainter('prop', 'crumb')) registerPropPainter('crumb', makePropFallback('crumb', PAL.crumbGold));
}
