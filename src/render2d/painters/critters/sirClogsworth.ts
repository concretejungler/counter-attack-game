/**
 * PAINTER - Sir Clogsworth (id 'sir-clogsworth'). Drain-serpent boss.
 * A coiling hair-and-soap serpent rises from a metal drain ring, with suds and
 * a monocle gag to make the bathroom boss imposing but friendly.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('sir-clogsworth', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const hair = warm(mix(PAL.roach, PAL.mouse, 0.32));
  const suds = warm(lighten(PAL.flyWing, 0.18));
  const metal = warm(PAL.metal);
  const soap = warm(PAL.mint);
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.25, size * 0.36, size * 0.16, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(metal, 0.1)); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.25, size * 0.23, size * 0.085, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(PAL.metalDark, 0.2)); ctx.fill(); stroke(size * 0.026);
  ctx.strokeStyle = rgba(lighten(metal, 0.25), 0.8); ctx.lineWidth = size * 0.012;
  for (const dx of [-0.18, -0.06, 0.06, 0.18]) { ctx.beginPath(); ctx.moveTo(cx + size * dx, cy + size * 0.18); ctx.lineTo(cx + size * dx * 0.55, cy + size * 0.32); ctx.stroke(); }

  ctx.lineCap = 'round';
  ctx.strokeStyle = hex(hair); ctx.lineWidth = size * 0.21;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.22, cy + size * 0.2);
  ctx.bezierCurveTo(cx + size * 0.35, cy + size * 0.18, cx + size * 0.32, cy - size * 0.2, cx, cy - size * 0.18);
  ctx.bezierCurveTo(cx - size * 0.36, cy - size * 0.16, cx - size * 0.28, cy - size * 0.43, cx + size * 0.08, cy - size * 0.38 + wobble * size * 0.008);
  ctx.stroke();
  ctx.lineWidth = size * 0.12; ctx.strokeStyle = hex(lighten(hair, 0.12)); ctx.beginPath(); ctx.moveTo(cx - size * 0.19, cy + size * 0.18); ctx.bezierCurveTo(cx + size * 0.24, cy + size * 0.14, cx + size * 0.24, cy - size * 0.14, cx, cy - size * 0.14); ctx.stroke();

  for (const p of [[-0.25, 0.12, 0.06], [0.25, 0.08, 0.055], [-0.12, -0.22, 0.05], [0.16, -0.18, 0.045], [0.03, 0.3, 0.052]] as const) {
    ctx.beginPath(); ctx.arc(cx + size * p[0], cy + size * p[1], size * p[2], 0, Math.PI * 2); ctx.fillStyle = rgba(suds, 0.9); ctx.fill(); stroke(size * 0.016);
  }
  ctx.beginPath(); ctx.ellipse(cx + size * 0.08, cy - size * 0.4, size * 0.18, size * 0.14, 0.08, 0, Math.PI * 2); ctx.fillStyle = hex(hair); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx + size * 0.02, cy - size * 0.43, size * 0.08, size * 0.035, -0.18, 0, Math.PI * 2); ctx.fillStyle = hex(soap); ctx.fill(); stroke(size * 0.018);
  const eyeY = cy - size * 0.41;
  for (const sgn of [-1, 1]) { const ex = cx + size * (0.02 + sgn * 0.07); ctx.beginPath(); ctx.arc(ex, eyeY, size * 0.055, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.017); ctx.beginPath(); ctx.arc(ex + wobble * size * 0.004, eyeY + size * 0.012, size * 0.026, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.012, eyeY - size * 0.012, size * 0.01, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
  ctx.beginPath(); ctx.arc(cx + size * 0.09, eyeY, size * 0.078, 0, Math.PI * 2); ctx.strokeStyle = hex(PAL.butter); ctx.lineWidth = size * 0.018; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx + size * 0.15, eyeY + size * 0.05); ctx.quadraticCurveTo(cx + size * 0.22, cy - size * 0.27, cx + size * 0.16, cy - size * 0.22); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.012; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + size * 0.08, cy - size * 0.31, size * 0.07, 0.18 * Math.PI, 0.82 * Math.PI); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.022; ctx.stroke();
});