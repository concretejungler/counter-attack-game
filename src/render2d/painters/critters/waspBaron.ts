/**
 * PAINTER - Wasp Baron (id 'wasp-baron'). Elite striped flier.
 * Bold wasp bands, buzzing translucent wings, and a red aviator scarf give the
 * Red Baron wink while keeping the critter symmetric and cute.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, darken } from '../../colors';

registerCritterPainter('wasp-baron', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const amber = warm(mix(PAL.butter, PAL.flame, 0.25));
  const dark = warm(darken(PAL.roach, 0.12));
  const scarf = warm(PAL.cherry);
  const wing = PAL.flyWing;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const thoraxY = cy - size * 0.04;
  const spread = frame ? 0.64 : 0.5;

  for (const sgn of [-1, 1]) {
    const wx = cx + sgn * size * 0.12; const wy = thoraxY - size * 0.02; const tipX = wx + sgn * size * spread; const tipY = wy - size * 0.28;
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * (0.84 + (frame ? 0.16 : 0))); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.23, size * 0.09, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, frame ? 0.28 : 0.18); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * 0.72); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.21, size * 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, 0.64); ctx.fill(); stroke(size * 0.018); ctx.restore();
  }

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.023; ctx.strokeStyle = hex(darken(dark, 0.15));
  for (let i = 0; i < 3; i++) { const ly = thoraxY + i * size * 0.08; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.028; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.08, ly); ctx.lineTo(cx + sgn * size * 0.21, ly + size * 0.045 + kick); ctx.stroke(); } }

  ctx.beginPath(); ctx.moveTo(cx - size * 0.1, cy + size * 0.18); ctx.quadraticCurveTo(cx, cy + size * 0.45, cx + size * 0.1, cy + size * 0.18); ctx.quadraticCurveTo(cx, cy + size * 0.31, cx - size * 0.1, cy + size * 0.18); ctx.fillStyle = hex(dark); ctx.fill(); stroke(size * 0.027);
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.12, size * 0.145, size * 0.23, 0, 0, Math.PI * 2); ctx.fillStyle = hex(amber); ctx.fill(); stroke();
  ctx.strokeStyle = hex(dark); ctx.lineWidth = size * 0.043; for (const dy of [0, 0.105, 0.21]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.13, size * 0.023, 0, 0, Math.PI * 2); ctx.stroke(); }
  ctx.beginPath(); ctx.ellipse(cx, thoraxY, size * 0.13, size * 0.125, 0, 0, Math.PI * 2); ctx.fillStyle = hex(dark); ctx.fill(); stroke();
  ctx.beginPath(); ctx.moveTo(cx - size * 0.12, thoraxY + size * 0.06); ctx.quadraticCurveTo(cx, thoraxY + size * 0.12, cx + size * 0.12, thoraxY + size * 0.06); ctx.lineTo(cx + size * 0.04, thoraxY + size * 0.14); ctx.lineTo(cx - size * 0.04, thoraxY + size * 0.14); ctx.closePath(); ctx.fillStyle = hex(scarf); ctx.fill(); stroke(size * 0.017);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.22, size * 0.14, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(amber); ctx.fill(); stroke();
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.065; const ey = cy - size * 0.22; ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.064, size * 0.074, sgn * 0.1, 0, Math.PI * 2); ctx.fillStyle = hex(mix(PAL.cherry, dark, 0.35)); ctx.fill(); stroke(size * 0.019); ctx.beginPath(); ctx.arc(ex - sgn * size * 0.017, ey - size * 0.025, size * 0.02, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});