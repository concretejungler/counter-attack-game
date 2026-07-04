/**
 * PAINTER - Beetle (id 'beetle'). Heavy armored dome beetle.
 * A big rounded shell, central split seam, shield plates, and tiny horn make it
 * read as a helmet with legs.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('beetle', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.02;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const shell = warm(mix(PAL.stinkbug, PAL.roach, 0.35));
  const plate = warm(lighten(shell, 0.12));
  const head = warm(darken(shell, 0.18));
  const leg = darken(shell, 0.38);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32); ctx.beginPath(); ctx.arc(x + sgn * r * 0.13, y + r * 0.23, r * 0.48, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.045; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 3; i++) { const ly = cy - size * 0.05 + i * size * 0.11; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.035; for (const sgn of [-1, 1]) { const fx = cx + sgn * size * 0.27; const fy = ly + kick; ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.16, ly); ctx.lineTo(cx + sgn * size * 0.23, fy); ctx.lineTo(fx, fy + size * 0.025); ctx.stroke(); ctx.beginPath(); ctx.arc(fx, fy + size * 0.025, size * 0.022, 0, Math.PI * 2); ctx.fill(); } }
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.08, size * 0.24, size * 0.31, 0, 0, Math.PI * 2); ctx.fillStyle = hex(shell); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.09, size * 0.18, size * 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(plate, 0.55); ctx.fill();
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.022; ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.2); ctx.lineTo(cx, cy + size * 0.35); ctx.stroke();
  ctx.strokeStyle = rgba(darken(shell, 0.3), 0.8); ctx.lineWidth = size * 0.023; for (const dy of [-0.06, 0.06, 0.18]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.19, size * 0.02, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.22, size * 0.14, size * 0.12, 0, 0, Math.PI * 2); ctx.fillStyle = hex(head); ctx.fill(); stroke();
  ctx.beginPath(); ctx.moveTo(cx - size * 0.035, cy - size * 0.31); ctx.quadraticCurveTo(cx, cy - size * 0.43, cx + size * 0.035, cy - size * 0.31); ctx.quadraticCurveTo(cx, cy - size * 0.34, cx - size * 0.035, cy - size * 0.31); ctx.fillStyle = hex(plate); ctx.fill(); stroke(size * 0.022);
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.06, cy - size * 0.22, size * 0.046, sgn);
});
