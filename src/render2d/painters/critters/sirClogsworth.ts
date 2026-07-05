/**
 * PAINTER - Sir Clogsworth (id 'sir-clogsworth'). Drain-serpent boss (V2).
 * A coiling hair-and-soap serpent rising from a metal drain ring. V2: the hair
 * tube reads as WET — a dark base strand, a lit ridge core, and a glossDot chain
 * running along the coil; the drain ring is cel-lit metal with a specStreak; the
 * soap suds get white catchlights; a cool bathroom halo sits behind.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, belly, celCrescent, rim, haloBehind, glossDot, specStreak } from '../../paint';

registerCritterPainter('sir-clogsworth', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const hair = warm(mix(PAL.roach, PAL.mouse, 0.32));
  const h3 = ramp(hair);
  const suds = warm(lighten(PAL.flyWing, 0.18));
  const metal = warm(PAL.metal);
  const m3 = ramp(metal);
  const soap = warm(PAL.mint);
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  // --- cool bathroom halo behind ---
  haloBehind(ctx, cx, cy - size * 0.1, size * 0.45, soap, 0.2);

  // --- drain ring (cel-lit wet metal) ---
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.25, size * 0.36, size * 0.16, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(metal, 0.1)); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy + size * 0.25, size * 0.36, size * 0.16, m3.shadow, 0.4, 0.5);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.25, size * 0.36, size * 0.16, 0, 0, Math.PI * 2); ctx.clip();
  specStreak(ctx, cx - size * 0.06, cy + size * 0.19, size * 0.32, size * 0.03, 0.45); ctx.restore();
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.25, size * 0.23, size * 0.085, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(PAL.metalDark, 0.2)); ctx.fill(); stroke(size * 0.026);
  ctx.strokeStyle = rgba(m3.light, 0.8); ctx.lineWidth = size * 0.012;
  for (const dx of [-0.18, -0.06, 0.06, 0.18]) { ctx.beginPath(); ctx.moveTo(cx + size * dx, cy + size * 0.18); ctx.lineTo(cx + size * dx * 0.55, cy + size * 0.32); ctx.stroke(); }
  rim(ctx, cx, cy + size * 0.25, size * 0.36, size * 0.16, m3.light, size * 0.028, 0.45);

  // --- wet hair coil: dark base strand + lit ridge core ---
  ctx.lineCap = 'round';
  ctx.strokeStyle = hex(h3.shadow); ctx.lineWidth = size * 0.21;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.22, cy + size * 0.2);
  ctx.bezierCurveTo(cx + size * 0.35, cy + size * 0.18, cx + size * 0.32, cy - size * 0.2, cx, cy - size * 0.18);
  ctx.bezierCurveTo(cx - size * 0.36, cy - size * 0.16, cx - size * 0.28, cy - size * 0.43, cx + size * 0.08, cy - size * 0.38 + wobble * size * 0.008);
  ctx.stroke();
  ctx.lineWidth = size * 0.13; ctx.strokeStyle = hex(hair);
  ctx.beginPath(); ctx.moveTo(cx - size * 0.19, cy + size * 0.18); ctx.bezierCurveTo(cx + size * 0.24, cy + size * 0.14, cx + size * 0.24, cy - size * 0.14, cx, cy - size * 0.14); ctx.stroke();
  ctx.lineWidth = size * 0.062; ctx.strokeStyle = rgba(h3.light, 0.95);
  ctx.beginPath(); ctx.moveTo(cx - size * 0.17, cy + size * 0.15); ctx.bezierCurveTo(cx + size * 0.19, cy + size * 0.1, cx + size * 0.19, cy - size * 0.11, cx, cy - size * 0.11); ctx.stroke();
  // glossDot chain running along the coil ridge (wet strands)
  for (const p of [[0.10, 0.11], [0.22, -0.02], [0.15, -0.15], [-0.2, -0.25], [-0.13, -0.35]] as const) {
    glossDot(ctx, cx + size * (p[0] - 0.015), cy + size * (p[1] - 0.02), size * 0.019, 0.6);
  }

  // --- soap suds with bright white catchlights ---
  for (const p of [[-0.25, 0.12, 0.06], [0.25, 0.08, 0.055], [-0.12, -0.22, 0.05], [0.16, -0.18, 0.045], [0.03, 0.3, 0.052]] as const) {
    ctx.beginPath(); ctx.arc(cx + size * p[0], cy + size * p[1], size * p[2], 0, Math.PI * 2); ctx.fillStyle = rgba(suds, 0.9); ctx.fill(); stroke(size * 0.016);
    ctx.beginPath(); ctx.arc(cx + size * (p[0] - p[2] * 0.35), cy + size * (p[1] - p[2] * 0.35), size * p[2] * 0.34, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fill();
  }

  // --- head (dominant round mass): belly + cel + rim + wet glossDot ---
  ctx.beginPath(); ctx.ellipse(cx + size * 0.08, cy - size * 0.4, size * 0.18, size * 0.14, 0.08, 0, Math.PI * 2); ctx.fillStyle = hex(hair); ctx.fill(); stroke();
  belly(ctx, cx + size * 0.08, cy - size * 0.4, size * 0.17, size * 0.13, h3, 0.5);
  celCrescent(ctx, cx + size * 0.08, cy - size * 0.4, size * 0.18, size * 0.14, h3.shadow, 0.42, 0.5);
  rim(ctx, cx + size * 0.08, cy - size * 0.4, size * 0.18, size * 0.14, h3.light, size * 0.028, 0.5);
  // soap band across the brow
  ctx.beginPath(); ctx.ellipse(cx + size * 0.02, cy - size * 0.43, size * 0.08, size * 0.035, -0.18, 0, Math.PI * 2); ctx.fillStyle = hex(soap); ctx.fill(); stroke(size * 0.018);
  glossDot(ctx, cx + size * 0.02, cy - size * 0.45, size * 0.02, 0.7);

  const eyeY = cy - size * 0.41;
  for (const sgn of [-1, 1]) { const ex = cx + size * (0.02 + sgn * 0.07); ctx.beginPath(); ctx.arc(ex, eyeY, size * 0.055, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.017); ctx.beginPath(); ctx.arc(ex + wobble * size * 0.004, eyeY + size * 0.012, size * 0.026, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.012, eyeY - size * 0.012, size * 0.01, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
  // gold monocle with a glint
  ctx.beginPath(); ctx.arc(cx + size * 0.09, eyeY, size * 0.078, 0, Math.PI * 2); ctx.strokeStyle = hex(PAL.butter); ctx.lineWidth = size * 0.018; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + size * 0.055, eyeY - size * 0.05, size * 0.015, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,250,220,0.8)'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + size * 0.15, eyeY + size * 0.05); ctx.quadraticCurveTo(cx + size * 0.22, cy - size * 0.27, cx + size * 0.16, cy - size * 0.22); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.012; ctx.stroke();
  ctx.beginPath(); ctx.arc(cx + size * 0.08, cy - size * 0.31, size * 0.07, 0.18 * Math.PI, 0.82 * Math.PI); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.022; ctx.stroke();
});
