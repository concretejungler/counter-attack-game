/**
 * PAINTER - The Trash Panda Don (id 'trash-panda-don'). Raccoon mafioso boss.
 * A masked raccoon in a tiny coat holds a garbage-lid shield, with a fedora on
 * top so the boss joke reads from the silhouette.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('trash-panda-don', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const fur = warm(mix(PAL.mouse, PAL.metalDark, 0.35));
  const dark = warm(darken(PAL.mouse, 0.42));
  const coat = warm(darken(PAL.denim, 0.3));
  const lid = warm(PAL.metal);
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(dark); ctx.lineWidth = size * 0.05;
  ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.3); ctx.quadraticCurveTo(cx + size * 0.36, cy + size * 0.44, cx + size * 0.18, cy + size * (0.49 + wobble * 0.006)); ctx.stroke();
  ctx.strokeStyle = hex(darken(fur, 0.35)); ctx.fillStyle = hex(darken(fur, 0.35)); ctx.lineWidth = size * 0.034;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.02 + i * size * 0.13; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.022; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.24, y); ctx.lineTo(cx + sgn * size * 0.37, y + size * 0.05 + kick); ctx.stroke(); } }

  ctx.beginPath(); ctx.moveTo(cx - size * 0.3, cy - size * 0.18); ctx.quadraticCurveTo(cx, cy - size * 0.31, cx + size * 0.3, cy - size * 0.18); ctx.lineTo(cx + size * 0.32, cy + size * 0.35); ctx.quadraticCurveTo(cx, cy + size * 0.45, cx - size * 0.32, cy + size * 0.35); ctx.closePath(); ctx.fillStyle = hex(coat); ctx.fill(); stroke();
  ctx.beginPath(); ctx.moveTo(cx - size * 0.1, cy - size * 0.14); ctx.lineTo(cx, cy + size * 0.22); ctx.lineTo(cx + size * 0.1, cy - size * 0.14); ctx.closePath(); ctx.fillStyle = rgba(lighten(fur, 0.32), 0.68); ctx.fill(); stroke(size * 0.017);
  ctx.beginPath(); ctx.ellipse(cx - size * 0.28, cy + size * 0.04, size * 0.16, size * 0.25, -0.35, 0, Math.PI * 2); ctx.fillStyle = hex(lid); ctx.fill(); stroke(size * 0.035);
  ctx.beginPath(); ctx.arc(cx - size * 0.28, cy + size * 0.04, size * 0.065, 0, Math.PI * 2); ctx.fillStyle = hex(lighten(lid, 0.18)); ctx.fill(); stroke(size * 0.016);

  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.17, cy - size * 0.31, size * 0.1, size * 0.14, sgn * 0.35, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke(size * 0.024); ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.17, cy - size * 0.31, size * 0.054, size * 0.08, sgn * 0.35, 0, Math.PI * 2); ctx.fillStyle = rgba(dark, 0.6); ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.2, size * 0.23, size * 0.19, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.21, size * 0.19, size * 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = hex(dark); ctx.fill();
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.085; const ey = cy - size * 0.22; ctx.beginPath(); ctx.arc(ex, ey, size * 0.055, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.016); ctx.beginPath(); ctx.arc(ex + wobble * size * 0.005, ey + size * 0.012, size * 0.026, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.012, ey - size * 0.012, size * 0.01, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.09, size * 0.055, size * 0.038, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(fur, 0.22)); ctx.fill(); stroke(size * 0.014);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.39, size * 0.2, size * 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(PAL.snailShell, 0.22)); ctx.fill(); stroke(size * 0.02);
  ctx.beginPath(); ctx.moveTo(cx - size * 0.11, cy - size * 0.39); ctx.lineTo(cx - size * 0.08, cy - size * 0.5); ctx.lineTo(cx + size * 0.08, cy - size * 0.5); ctx.lineTo(cx + size * 0.11, cy - size * 0.39); ctx.closePath(); ctx.fillStyle = hex(darken(PAL.snailShell, 0.1)); ctx.fill(); stroke(size * 0.02);
});