/**
 * PAINTER - Earwig (id 'earwig'). Tunneling pincer crawler.
 * The long narrow body points north, while the huge rounded rear pincers are the
 * exaggerated readable feature.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('earwig', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.02;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.roach, PAL.antSoldier, 0.2));
  const head = warm(darken(base, 0.1));
  const leg = darken(base, 0.36);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const oval = (x: number, y: number, rx: number, ry: number, fill: number) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fill); ctx.fill(); stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32); ctx.beginPath(); ctx.arc(x + sgn * r * 0.14, y + r * 0.22, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.033; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 4; i++) { const y = cy - size * 0.12 + i * size * 0.085; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.032; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.085, y); ctx.lineTo(cx + sgn * size * 0.19, y + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.19, y + kick, size * 0.014, 0, Math.PI * 2); ctx.fill(); } }
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.03;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.065, cy + size * 0.29); ctx.quadraticCurveTo(cx + sgn * size * 0.18, cy + size * 0.42, cx + sgn * size * 0.05, cy + size * 0.45); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.08, size * 0.12, size * 0.28, 0, 0, Math.PI * 2); ctx.fillStyle = hex(base); ctx.fill(); stroke();
  ctx.strokeStyle = rgba(darken(base, 0.28), 0.8); ctx.lineWidth = size * 0.02; for (const dy of [-0.08, 0, 0.08, 0.16]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.1, size * 0.016, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx - size * 0.035, cy + size * 0.03, size * 0.04, size * 0.17, -0.18, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(base, 0.34), 0.35); ctx.fill();
  oval(cx, cy - size * 0.22, size * 0.12, size * 0.105, head);
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.021; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.045, cy - size * 0.29); ctx.quadraticCurveTo(cx + sgn * size * 0.13, cy - size * 0.39, cx + sgn * size * 0.08, cy - size * 0.44); ctx.stroke(); eye(cx + sgn * size * 0.052, cy - size * 0.22, size * 0.044, sgn); }
});
