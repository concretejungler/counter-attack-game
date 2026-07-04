/**
 * PAINTER - Cricket Bard (id 'cricket-bard'). Chirpy speed-aura cricket.
 * Oversized folded jump legs and a little shield-shaped wing plate make the
 * singer silhouette distinct without drawing note glyphs.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('cricket-bard', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.02;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.stinkbug, PAL.slug, 0.35));
  const wing = warm(lighten(PAL.slug, 0.18));
  const leg = darken(base, 0.34);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const oval = (x: number, y: number, rx: number, ry: number, fill: number, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = hex(fill); ctx.fill(); stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32); ctx.beginPath(); ctx.arc(x + sgn * r * 0.15, y + r * 0.22, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (const sgn of [-1, 1]) {
    const kick = (frame ? 1 : -1) * size * 0.03;
    ctx.lineWidth = size * 0.05; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.1, cy + size * 0.06); ctx.lineTo(cx + sgn * size * 0.25, cy + size * 0.15 + kick); ctx.lineTo(cx + sgn * size * 0.18, cy + size * 0.34 + kick); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + sgn * size * 0.18, cy + size * 0.34 + kick, size * 0.023, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = size * 0.028; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.08, cy - size * 0.03); ctx.lineTo(cx + sgn * size * 0.21, cy - size * 0.09 - kick); ctx.stroke();
  }
  oval(cx, cy + size * 0.12, size * 0.14, size * 0.2, base);
  ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.03); ctx.quadraticCurveTo(cx - size * 0.12, cy + size * 0.07, cx - size * 0.07, cy + size * 0.24); ctx.quadraticCurveTo(cx, cy + size * 0.19, cx + size * 0.07, cy + size * 0.24); ctx.quadraticCurveTo(cx + size * 0.12, cy + size * 0.07, cx, cy - size * 0.03); ctx.closePath(); ctx.fillStyle = rgba(wing, 0.78); ctx.fill(); stroke(size * 0.022);
  ctx.strokeStyle = rgba(darken(wing, 0.25), 0.65); ctx.lineWidth = size * 0.012; for (const dx of [-0.04, 0, 0.04]) { ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.01); ctx.lineTo(cx + size * dx, cy + size * 0.21); ctx.stroke(); }
  oval(cx, cy - size * 0.17, size * 0.13, size * 0.12, darken(base, 0.08));
  for (const sgn of [-1, 1]) { ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.022; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.055, cy - size * 0.25); ctx.quadraticCurveTo(cx + sgn * size * 0.14, cy - size * 0.37, cx + sgn * size * 0.08, cy - size * 0.43); ctx.stroke(); eye(cx + sgn * size * 0.055, cy - size * 0.17, size * 0.046, sgn); }
});
