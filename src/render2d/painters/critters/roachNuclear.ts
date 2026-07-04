/**
 * PAINTER - Nuclear Roach (id 'roach-nuclear'). Glowing armored survivor.
 * The regular roach shape is exaggerated with a bright goo core, armor ribs,
 * and warning-green freckles, but no status tint or sparkles.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

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
  const glow = warm(PAL.goo);
  const armor = warm(darken(base, 0.2));
  const leg = darken(base, 0.36);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.02;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, cy - size * 0.25); ctx.quadraticCurveTo(cx + sgn * size * 0.22, cy - size * 0.45, cx + sgn * size * 0.14, cy - size * 0.51); ctx.stroke(); }
  ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg); ctx.lineWidth = size * 0.04;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.06 + i * size * 0.12; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.14, y); ctx.lineTo(cx + sgn * size * 0.27, y + size * 0.025); ctx.lineTo(cx + sgn * size * 0.34, y + size * 0.08 + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.34, y + size * 0.08 + kick, size * 0.019, 0, Math.PI * 2); ctx.fill(); } }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.08, size * 0.23, size * 0.34, 0, 0, Math.PI * 2); ctx.fillStyle = hex(base); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.09, size * 0.11, size * 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(glow, 0.72); ctx.fill(); stroke(size * 0.018);
  ctx.strokeStyle = rgba(armor, 0.88); ctx.lineWidth = size * 0.029; for (const dy of [-0.08, 0.03, 0.14, 0.25]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.18, size * 0.02, 0, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 16; i++) { const a = rnd(i) * Math.PI * 2; const r = rnd(i + 24) * size * 0.2; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 1.35, size * (0.008 + rnd(i + 60) * 0.011), 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(glow, 0.25), 0.8); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.24, size * 0.15, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(armor); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.27, size * 0.08, size * 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(glow, 0.62); ctx.fill();
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.062; const ey = cy - size * 0.24; ctx.beginPath(); ctx.arc(ex, ey, size * 0.045, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.013); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.005, ey + size * 0.012, size * 0.022, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.011, ey - size * 0.012, size * 0.008, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
