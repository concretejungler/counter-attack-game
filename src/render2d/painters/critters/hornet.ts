/**
 * PAINTER - Hornet (id 'hornet'). Armored striped flier. (V2 elite shading.)
 * The huge amber head, tight armor bands, and long cocoa stinger make it read
 * as a wasp that found a helmet, with buzzing wings and no baked shadow. V2: the
 * amber abdomen is glossy (belly + rim), each dark band gets a light gloss edge
 * so the stripes read as raised lacquer, cel crescents on every mass.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten } from '../../colors';
import { ramp, celCrescent, celCrescentPath, belly, rim, innerInk } from '../../paint';

registerCritterPainter('hornet', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const amber = warm(mix(PAL.butter, PAL.flame, 0.42));
  const amberR = ramp(amber);
  const dark = warm(mix(PAL.roach, 0x140a05, 0.12)); // dark chitin (own material)
  const darkR = ramp(dark);
  const wing = PAL.flyWing;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const thoraxY = cy - size * 0.04;

  // --- wings (behind body): ghost + crisp, NO baked shadow (flier) ---
  const spread = frame ? 0.57 : 0.45;
  for (const sgn of [-1, 1]) {
    const wx = cx + sgn * size * 0.12;
    const wy = thoraxY - size * 0.02;
    const tipX = wx + sgn * size * spread;
    const tipY = wy - size * 0.27;
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * (0.86 + (frame ? 0.14 : 0))); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.22, size * 0.09, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, frame ? 0.28 : 0.18); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * 0.75); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.2, size * 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, 0.62); ctx.fill(); stroke(size * 0.018); ctx.beginPath(); ctx.ellipse(-size * 0.02, -size * 0.015, size * 0.08, size * 0.035, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(210,235,245,0.4)'; ctx.fill(); ctx.strokeStyle = rgba(PAL.flyBody, 0.45); ctx.lineWidth = size * 0.011; ctx.beginPath(); ctx.moveTo(-size * 0.16, 0); ctx.lineTo(size * 0.16, -size * 0.005); ctx.stroke(); ctx.restore();
  }

  // --- legs ---
  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.022; ctx.strokeStyle = innerInk(dark);
  for (let i = 0; i < 3; i++) { const ly = thoraxY + i * size * 0.08; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.028; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.08, ly); ctx.lineTo(cx + sgn * size * 0.2, ly + size * 0.04 + kick); ctx.stroke(); } }

  // --- stinger (dark barb) ---
  const stingTrace = () => { ctx.moveTo(cx - size * 0.1, cy + size * 0.18); ctx.quadraticCurveTo(cx, cy + size * 0.45, cx + size * 0.1, cy + size * 0.18); ctx.quadraticCurveTo(cx, cy + size * 0.31, cx - size * 0.1, cy + size * 0.18); ctx.closePath(); };
  ctx.beginPath(); stingTrace(); ctx.fillStyle = hex(dark); ctx.fill(); stroke(size * 0.028);
  celCrescentPath(ctx, stingTrace, cx, cy + size * 0.28, size * 0.09, size * 0.14, darkR.shadow, 0.5, 0.6);

  // --- abdomen: glossy amber lacquer (the dominant mass) ---
  const abY = cy + size * 0.12;
  ctx.beginPath(); ctx.ellipse(cx, abY, size * 0.15, size * 0.23, 0, 0, Math.PI * 2); ctx.fillStyle = hex(amber); ctx.fill(); stroke();
  belly(ctx, cx, abY, size * 0.145, size * 0.22, amberR, 0.6);
  // dark bands, each with a toward-light gloss edge = raised lacquer stripes
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, abY, size * 0.15, size * 0.23, 0, 0, Math.PI * 2); ctx.clip();
  for (const dy of [0.01, 0.11, 0.21]) {
    ctx.strokeStyle = hex(dark); ctx.lineWidth = size * 0.04;
    ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.14, size * 0.024, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(amberR.light, 0.75); ctx.lineWidth = size * 0.012;
    ctx.beginPath(); ctx.ellipse(cx, cy + size * (dy - 0.028), size * 0.12, size * 0.02, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  ctx.restore();
  celCrescent(ctx, cx, abY, size * 0.15, size * 0.23, amberR.shadow, 0.42, 0.5);
  rim(ctx, cx, abY, size * 0.15, size * 0.23, amberR.light, size * 0.022, 0.55);

  // --- thorax (dark dome) ---
  ctx.beginPath(); ctx.ellipse(cx, thoraxY, size * 0.13, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(dark); ctx.fill(); stroke();
  celCrescent(ctx, cx, thoraxY, size * 0.13, size * 0.13, darkR.shadow, 0.45, 0.55);
  ctx.beginPath(); ctx.ellipse(cx - size * 0.04, thoraxY - size * 0.03, size * 0.055, size * 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(dark, 0.32), 0.45); ctx.fill();

  // --- amber head/eye mass ---
  const eyeY = cy - size * 0.21;
  ctx.beginPath(); ctx.ellipse(cx, eyeY, size * 0.14, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(amber); ctx.fill(); stroke();
  celCrescent(ctx, cx, eyeY, size * 0.14, size * 0.13, amberR.shadow, 0.42, 0.5);
  rim(ctx, cx, eyeY, size * 0.14, size * 0.13, amberR.light, size * 0.02, 0.5);
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.065;
    ctx.beginPath(); ctx.ellipse(ex, eyeY, size * 0.066, size * 0.076, sgn * 0.1, 0, Math.PI * 2); ctx.fillStyle = hex(mix(PAL.cherry, dark, 0.35)); ctx.fill(); stroke(size * 0.02);
    ctx.beginPath(); ctx.arc(ex - sgn * size * 0.018, eyeY - size * 0.025, size * 0.021, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }
});
