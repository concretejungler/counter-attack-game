/**
 * PAINTER - Centipede Bit (id 'centipede-bit'). Tiny loose wiggle.
 * Just three big beads, a few frantic legs, and oversized eyes: it reads as the
 * small escaped piece of the larger crawler.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('centipede-bit', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.02;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.slug, PAL.stinkbug, 0.25));
  const leg = darken(base, 0.38);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32); ctx.beginPath(); ctx.arc(x + sgn * r * 0.14, y + r * 0.22, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.032; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 4; i++) { const y = cy - size * 0.12 + i * size * 0.08; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.08, y); ctx.lineTo(cx + sgn * size * 0.19, y + kick); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.19, y + kick, size * 0.014, 0, Math.PI * 2); ctx.fill(); } }
  for (let i = 2; i >= 0; i--) { const y = cy - size * 0.12 + i * size * 0.11; ctx.beginPath(); ctx.ellipse(cx + (i === 1 ? size * 0.025 : 0), y, size * 0.115, size * 0.075, 0, 0, Math.PI * 2); ctx.fillStyle = hex(mix(base, i === 0 ? PAL.slug : PAL.stinkbug, 0.18)); ctx.fill(); stroke(); }
  ctx.beginPath(); ctx.ellipse(cx - size * 0.035, cy + size * 0.04, size * 0.045, size * 0.12, -0.25, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(base, 0.32), 0.36); ctx.fill();
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.05, cy - size * 0.13, size * 0.042, sgn);
});
