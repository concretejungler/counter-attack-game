/**
 * PAINTER - The Exterminator (id 'the-exterminator'). Human finale boss.
 * A looming top-down gas-mask human with a backpack tank and sprayer wand reads
 * as the finale while staying rounded, bright, and strictly cartoon.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, darken } from '../../colors';

registerCritterPainter('the-exterminator', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const suit = warm(mix(PAL.metal, PAL.moth, 0.42));
  const mask = warm(PAL.metalDark);
  const tank = warm(mix(PAL.goo, PAL.metal, 0.38));
  const glove = warm(PAL.butter);
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.19, size * 0.18, size * 0.33, 0, 0, Math.PI * 2); ctx.fillStyle = hex(tank); ctx.fill(); stroke(size * 0.032);
  ctx.strokeStyle = rgba(PAL.flyWing, 0.75); ctx.lineWidth = size * 0.016; for (const dx of [-0.06, 0.06]) { ctx.beginPath(); ctx.moveTo(cx + size * dx, cy - size * 0.08); ctx.lineTo(cx + size * dx, cy + size * 0.43); ctx.stroke(); }

  ctx.strokeStyle = hex(suit); ctx.lineWidth = size * 0.09;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.2, cy - size * 0.04); ctx.quadraticCurveTo(cx + sgn * size * 0.38, cy + size * 0.03, cx + sgn * size * 0.31, cy + size * 0.25 + wobble * size * 0.01); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.31, cy + size * 0.25 + wobble * size * 0.01, size * 0.052, 0, Math.PI * 2); ctx.fillStyle = hex(glove); ctx.fill(); stroke(size * 0.02); }
  ctx.beginPath(); ctx.moveTo(cx - size * 0.28, cy - size * 0.15); ctx.quadraticCurveTo(cx, cy - size * 0.28, cx + size * 0.28, cy - size * 0.15); ctx.lineTo(cx + size * 0.24, cy + size * 0.35); ctx.quadraticCurveTo(cx, cy + size * 0.45, cx - size * 0.24, cy + size * 0.35); ctx.closePath(); ctx.fillStyle = hex(suit); ctx.fill(); stroke();
  ctx.beginPath(); ctx.moveTo(cx, cy - size * 0.14); ctx.lineTo(cx - size * 0.08, cy + size * 0.35); ctx.moveTo(cx, cy - size * 0.14); ctx.lineTo(cx + size * 0.08, cy + size * 0.35); ctx.strokeStyle = rgba(darken(suit, 0.25), 0.72); ctx.lineWidth = size * 0.023; ctx.stroke();

  ctx.strokeStyle = hex(PAL.metalDark); ctx.lineWidth = size * 0.026;
  ctx.beginPath(); ctx.moveTo(cx - size * 0.25, cy + size * 0.17); ctx.quadraticCurveTo(cx - size * 0.46, cy + size * 0.05, cx - size * 0.42, cy - size * 0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - size * 0.42, cy - size * 0.1); ctx.lineTo(cx - size * 0.24, cy - size * 0.23); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx - size * 0.22, cy - size * 0.24, size * 0.025, 0, Math.PI * 2); ctx.fillStyle = rgba(PAL.goo, 0.85); ctx.fill(); stroke(size * 0.01);

  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.29, size * 0.19, size * 0.17, 0, 0, Math.PI * 2); ctx.fillStyle = hex(mask); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.17, size * 0.075, size * 0.085, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(mask, 0.28)); ctx.fill(); stroke(size * 0.018);
  ctx.strokeStyle = rgba(PAL.flyWing, 0.5); ctx.lineWidth = size * 0.012; for (const dx of [-0.025, 0, 0.025]) { ctx.beginPath(); ctx.moveTo(cx + size * dx, cy - size * 0.22); ctx.lineTo(cx + size * dx, cy - size * 0.12); ctx.stroke(); }
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.075; const ey = cy - size * 0.31;
    ctx.beginPath(); ctx.arc(ex, ey, size * 0.06, 0, Math.PI * 2); ctx.fillStyle = hex(PAL.flyWing); ctx.fill(); stroke(size * 0.018);
    ctx.beginPath(); ctx.arc(ex + wobble * size * 0.004, ey + size * 0.012, size * 0.026, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - size * 0.013, ey - size * 0.013, size * 0.011, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
});