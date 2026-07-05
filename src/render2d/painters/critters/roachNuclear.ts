/**
 * PAINTER - Nuclear Roach (id 'roach-nuclear'). Glowing armored survivor.
 * (V2 elite shading.) The regular roach shape is exaggerated with a bright goo
 * core, armor ribs, and warning-green freckles, but no status tint or sparkles.
 * V2: a subtle toxic-green halo glows out from under the shell, the shell is a
 * belly-lit dome with a rim, and the goo core keeps its sickly pop.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten } from '../../colors';
import { ramp, celCrescent, belly, rim, haloBehind, innerInk } from '../../paint';

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 1337.7) * 43758.5453;
  return x - Math.floor(x);
};

registerCritterPainter('roach-nuclear', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.roach, PAL.goo, 0.18));
  const baseR = ramp(base);
  const glow = warm(PAL.goo);
  const armor = warm(mix(base, baseR.shadow, 0.5));
  const armorR = ramp(armor);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  // --- toxic glow leaking out from under the shell (subtle) ---
  haloBehind(ctx, cx, cy + size * 0.09, size * 0.36, glow, 0.26);

  // --- antennae ---
  ctx.lineCap = 'round'; ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.02;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, cy - size * 0.25); ctx.quadraticCurveTo(cx + sgn * size * 0.22, cy - size * 0.45, cx + sgn * size * 0.14, cy - size * 0.51); ctx.stroke(); }

  // --- legs ---
  ctx.strokeStyle = innerInk(base); ctx.fillStyle = innerInk(base); ctx.lineWidth = size * 0.04;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.06 + i * size * 0.12; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.14, y); ctx.lineTo(cx + sgn * size * 0.27, y + size * 0.025); ctx.lineTo(cx + sgn * size * 0.34, y + size * 0.08 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.34, y + size * 0.08 + kick, size * 0.019, 0, Math.PI * 2); ctx.fill(); } }

  // --- shell dome (dominant mass): belly + cel + rim ---
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.08, size * 0.23, size * 0.34, 0, 0, Math.PI * 2); ctx.fillStyle = hex(base); ctx.fill(); stroke();
  belly(ctx, cx, cy + size * 0.08, size * 0.22, size * 0.33, baseR, 0.55);

  // --- glowing goo core down the spine ---
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.09, size * 0.11, size * 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(glow, 0.9); ctx.fill(); stroke(size * 0.018);
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.065, size * 0.19, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(glow, 0.35), 0.65); ctx.fill();

  // --- armor ribs (own material shadow tone) ---
  ctx.strokeStyle = rgba(armorR.shadow, 0.88); ctx.lineWidth = size * 0.029; for (const dy of [-0.08, 0.03, 0.14, 0.25]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.18, size * 0.02, 0, 0, Math.PI * 2); ctx.stroke(); }

  // --- warning freckles (few, large enough to survive downscale) ---
  for (let i = 0; i < 6; i++) { const a = rnd(i) * Math.PI * 2; const r = (0.4 + rnd(i + 24) * 0.6) * size * 0.17; const fx = cx + Math.cos(a) * r; const fy = cy + size * 0.06 + Math.sin(a) * r * 1.3; ctx.beginPath(); ctx.arc(fx, fy, size * (0.026 + rnd(i + 60) * 0.01), 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(glow, 0.22), 0.85); ctx.fill(); }

  celCrescent(ctx, cx, cy + size * 0.08, size * 0.23, size * 0.34, baseR.shadow, 0.45, 0.5);
  rim(ctx, cx, cy + size * 0.08, size * 0.23, size * 0.34, baseR.light, size * 0.024, 0.5);

  // --- head plate ---
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.24, size * 0.15, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(armor); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy - size * 0.24, size * 0.15, size * 0.13, armorR.shadow, 0.42, 0.5);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.27, size * 0.08, size * 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(glow, 0.62); ctx.fill();
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.062; const ey = cy - size * 0.24; ctx.beginPath(); ctx.arc(ex, ey, size * 0.045, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.013); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.012, size * 0.022, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.011, ey - size * 0.012, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
