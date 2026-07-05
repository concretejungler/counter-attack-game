/**
 * PAINTER - Grandma Longlegs (id 'grandma-longlegs'). Web-knitting spider boss (V2).
 * Giant round chitin body with absurdly long legs, a tiny bonnet, knitting
 * needles and web lines. V2: the glossy chitin abdomen (belly + cel + rim)
 * contrasts a MATTE fabric bonnet (soft cel + ticked brim); web lines stay thin
 * light strokes; a warm brown halo sits behind.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, belly, celCrescent, rim, haloBehind, fabricTicks, glossDot, aoUnder } from '../../paint';

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 771.9) * 43758.5453;
  return x - Math.floor(x);
};

registerCritterPainter('grandma-longlegs', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const body = warm(mix(PAL.roach, PAL.mouse, 0.52));
  const bd3 = ramp(body);
  const bonnet = warm(mix(PAL.moth, PAL.flyWing, 0.25));
  const bon3 = ramp(bonnet);
  const yarn = warm(PAL.flyWing);
  const chitin = warm(darken(body, 0.38));
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  // --- warm brown halo behind ---
  haloBehind(ctx, cx, cy + size * 0.04, size * 0.45, body, 0.22);

  // long chitin legs (hard, dark — contrast with the soft bonnet)
  ctx.lineCap = 'round';
  ctx.lineWidth = size * 0.028;
  ctx.strokeStyle = hex(chitin);
  ctx.fillStyle = hex(chitin);
  for (let i = 0; i < 4; i++) {
    const ly = cy - size * 0.22 + i * size * 0.14;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.025;
    for (const sgn of [-1, 1]) {
      const kneeX = cx + sgn * size * (0.38 + i * 0.025);
      const footX = cx + sgn * size * (0.48 - i * 0.015);
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.22, ly); ctx.lineTo(kneeX, ly + size * 0.04); ctx.lineTo(footX, ly + size * 0.13 + kick); ctx.stroke();
      ctx.beginPath(); ctx.arc(kneeX, ly + size * 0.04, size * 0.02, 0, Math.PI * 2); ctx.fill(); // knuckle joint = chitin bead
      ctx.beginPath(); ctx.arc(footX, ly + size * 0.13 + kick, size * 0.015, 0, Math.PI * 2); ctx.fill();
    }
  }

  // --- bonnet: MATTE fabric (soft cel + ticked brim, no gloss) ---
  const traceBonnet = () => { ctx.moveTo(cx - size * 0.22, cy - size * 0.34); ctx.quadraticCurveTo(cx, cy - size * 0.5, cx + size * 0.22, cy - size * 0.34); ctx.lineTo(cx + size * 0.16, cy - size * 0.22); ctx.quadraticCurveTo(cx, cy - size * 0.3, cx - size * 0.16, cy - size * 0.22); ctx.closePath(); };
  ctx.beginPath(); traceBonnet(); ctx.fillStyle = hex(bonnet); ctx.fill(); stroke(size * 0.026);
  ctx.save(); ctx.beginPath(); traceBonnet(); ctx.clip();
  celCrescent(ctx, cx, cy - size * 0.34, size * 0.22, size * 0.14, bon3.shadow, 0.4, 0.45);
  ctx.restore();
  fabricTicks(ctx, cx - size * 0.14, cy - size * 0.25, cx + size * 0.14, cy - size * 0.25, bon3.shadow, 5, size * 0.045);
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sgn * size * 0.14, cy - size * 0.29, size * 0.024, 0, Math.PI * 2); ctx.fillStyle = hex(PAL.butter); ctx.fill(); stroke(size * 0.012); }

  aoUnder(ctx, cx, cy + size * 0.4, size * 0.26, size * 0.05, 0.2);

  // --- glossy chitin abdomen (dominant mass): belly + cel + rim ---
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.04, size * 0.34, size * 0.39, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  belly(ctx, cx, cy + size * 0.05, size * 0.32, size * 0.37, bd3, 0.62);
  celCrescent(ctx, cx, cy + size * 0.04, size * 0.34, size * 0.39, bd3.shadow, 0.42, 0.5);
  for (let i = 0; i < 8; i++) { const a = rnd(i) * Math.PI * 2; const r = rnd(i + 20) * size * 0.24; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + size * 0.04 + Math.sin(a) * r * 1.05, size * (0.012 + rnd(i + 50) * 0.01), 0, Math.PI * 2); ctx.fillStyle = rgba(rnd(i + 70) > 0.5 ? lighten(body, 0.24) : bd3.shadow, 0.5); ctx.fill(); }
  rim(ctx, cx, cy + size * 0.04, size * 0.34, size * 0.39, bd3.light, size * 0.032, 0.5);
  glossDot(ctx, cx - size * 0.11, cy - size * 0.08, size * 0.03, 0.5); // chitin catchlight

  // web lines (thin light strokes)
  ctx.strokeStyle = rgba(yarn, 0.75); ctx.lineWidth = size * 0.012;
  for (const dx of [-0.22, -0.11, 0, 0.11, 0.22]) { ctx.beginPath(); ctx.moveTo(cx + size * dx, cy - size * 0.31); ctx.quadraticCurveTo(cx, cy, cx + size * (dx * 0.55), cy + size * 0.32); ctx.stroke(); }
  // knitting needles (metal, with a glint)
  ctx.strokeStyle = hex(PAL.metal); ctx.lineWidth = size * 0.018;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, cy + size * 0.09); ctx.lineTo(cx + sgn * size * 0.25, cy - size * 0.06 + wobble * size * 0.01); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + sgn * size * 0.25, cy - size * 0.06 + wobble * size * 0.01, size * 0.02, 0, Math.PI * 2); ctx.fillStyle = hex(lighten(PAL.metal, 0.2)); ctx.fill(); stroke(size * 0.01); }

  const eyeY = cy - size * 0.09;
  const eyeR = size * 0.066;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.11;
    ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.02);
    ctx.beginPath(); ctx.arc(ex + wobble * eyeR * 0.1, eyeY + eyeR * 0.22, eyeR * 0.47, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - eyeR * 0.28, eyeY - eyeR * 0.27, eyeR * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.026; ctx.beginPath(); ctx.moveTo(ex - sgn * eyeR * 1.1, eyeY - eyeR * 1.2); ctx.lineTo(ex + sgn * eyeR, eyeY - eyeR * 0.7); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy + size * 0.07, size * 0.1, 0.18 * Math.PI, 0.82 * Math.PI); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.023; ctx.stroke();
});
