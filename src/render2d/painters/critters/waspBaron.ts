/**
 * PAINTER - Wasp Baron (id 'wasp-baron'). Elite striped flier. (V2 elite shading.)
 * Bold wasp bands, buzzing translucent wings, and a red aviator scarf give the
 * Red Baron wink while keeping the critter symmetric and cute. V2: glossy amber
 * abdomen (belly + rim + gloss-edged bands) and the scarf carries a stitched hem
 * (fabricTicks) as its own accent material.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix } from '../../colors';
import { ramp, celCrescent, celCrescentPath, belly, rim, fabricTicks, innerInk } from '../../paint';

registerCritterPainter('wasp-baron', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const amber = warm(mix(PAL.butter, PAL.flame, 0.25));
  const amberR = ramp(amber);
  const dark = warm(mix(PAL.roach, 0x140a05, 0.16)); // dark chitin (own material)
  const darkR = ramp(dark);
  const scarf = warm(PAL.cherry);
  const scarfR = ramp(scarf);
  const wing = PAL.flyWing;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const thoraxY = cy - size * 0.04;
  const spread = frame ? 0.64 : 0.5;

  // --- wings: ghost + crisp, NO baked shadow (flier) ---
  for (const sgn of [-1, 1]) {
    const wx = cx + sgn * size * 0.12; const wy = thoraxY - size * 0.02; const tipX = wx + sgn * size * spread; const tipY = wy - size * 0.28;
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * (0.84 + (frame ? 0.16 : 0))); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.23, size * 0.09, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, frame ? 0.28 : 0.18); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate((wx + tipX) / 2, (wy + tipY) / 2); ctx.rotate(sgn * 0.72); ctx.beginPath(); ctx.ellipse(0, 0, size * 0.21, size * 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(wing, 0.64); ctx.fill(); stroke(size * 0.018); ctx.beginPath(); ctx.ellipse(-size * 0.02, -size * 0.015, size * 0.08, size * 0.035, 0, 0, Math.PI * 2); ctx.fillStyle = 'rgba(210,235,245,0.4)'; ctx.fill(); ctx.restore();
  }

  // --- legs ---
  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.023; ctx.strokeStyle = innerInk(dark);
  for (let i = 0; i < 3; i++) { const ly = thoraxY + i * size * 0.08; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.028; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.08, ly); ctx.lineTo(cx + sgn * size * 0.21, ly + size * 0.045 + kick); ctx.stroke(); } }

  // --- stinger (dark barb) ---
  const stingTrace = () => { ctx.moveTo(cx - size * 0.1, cy + size * 0.18); ctx.quadraticCurveTo(cx, cy + size * 0.45, cx + size * 0.1, cy + size * 0.18); ctx.quadraticCurveTo(cx, cy + size * 0.31, cx - size * 0.1, cy + size * 0.18); ctx.closePath(); };
  ctx.beginPath(); stingTrace(); ctx.fillStyle = hex(dark); ctx.fill(); stroke(size * 0.027);
  celCrescentPath(ctx, stingTrace, cx, cy + size * 0.28, size * 0.09, size * 0.14, darkR.shadow, 0.5, 0.6);

  // --- abdomen: glossy amber lacquer (dominant mass) ---
  const abY = cy + size * 0.12;
  ctx.beginPath(); ctx.ellipse(cx, abY, size * 0.145, size * 0.23, 0, 0, Math.PI * 2); ctx.fillStyle = hex(amber); ctx.fill(); stroke();
  belly(ctx, cx, abY, size * 0.14, size * 0.22, amberR, 0.6);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, abY, size * 0.145, size * 0.23, 0, 0, Math.PI * 2); ctx.clip();
  for (const dy of [0, 0.105, 0.21]) {
    ctx.strokeStyle = hex(dark); ctx.lineWidth = size * 0.043;
    ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.13, size * 0.025, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = rgba(amberR.light, 0.75); ctx.lineWidth = size * 0.012;
    ctx.beginPath(); ctx.ellipse(cx, cy + size * (dy - 0.03), size * 0.115, size * 0.02, 0, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  }
  ctx.restore();
  celCrescent(ctx, cx, abY, size * 0.145, size * 0.23, amberR.shadow, 0.42, 0.5);
  rim(ctx, cx, abY, size * 0.145, size * 0.23, amberR.light, size * 0.022, 0.55);

  // --- thorax (dark dome) ---
  ctx.beginPath(); ctx.ellipse(cx, thoraxY, size * 0.13, size * 0.125, 0, 0, Math.PI * 2); ctx.fillStyle = hex(dark); ctx.fill(); stroke();
  celCrescent(ctx, cx, thoraxY, size * 0.13, size * 0.125, darkR.shadow, 0.45, 0.55);

  // --- red aviator scarf (the accent) with stitched hem ---
  const scarfStitch = mix(scarf, 0x3a0c0c, 0.5); // warm dark red, not a violet cel
  const scarfTrace = () => { ctx.moveTo(cx - size * 0.13, thoraxY + size * 0.05); ctx.quadraticCurveTo(cx, thoraxY + size * 0.12, cx + size * 0.13, thoraxY + size * 0.05); ctx.lineTo(cx + size * 0.05, thoraxY + size * 0.15); ctx.lineTo(cx - size * 0.05, thoraxY + size * 0.15); ctx.closePath(); };
  ctx.beginPath(); scarfTrace(); ctx.fillStyle = hex(scarf); ctx.fill(); stroke(size * 0.017);
  celCrescentPath(ctx, scarfTrace, cx, thoraxY + size * 0.1, size * 0.13, size * 0.06, scarfStitch, 0.35, 0.45);
  ctx.save(); ctx.beginPath(); scarfTrace(); ctx.clip(); fabricTicks(ctx, cx - size * 0.11, thoraxY + size * 0.07, cx + size * 0.11, thoraxY + size * 0.07, scarfStitch, 4, size * 0.045); ctx.restore();

  // --- amber head/eye mass ---
  const headY = cy - size * 0.22;
  ctx.beginPath(); ctx.ellipse(cx, headY, size * 0.14, size * 0.13, 0, 0, Math.PI * 2); ctx.fillStyle = hex(amber); ctx.fill(); stroke();
  celCrescent(ctx, cx, headY, size * 0.14, size * 0.13, amberR.shadow, 0.42, 0.5);
  rim(ctx, cx, headY, size * 0.14, size * 0.13, amberR.light, size * 0.02, 0.5);
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.065; const ey = headY; ctx.beginPath(); ctx.ellipse(ex, ey, size * 0.064, size * 0.074, sgn * 0.1, 0, Math.PI * 2); ctx.fillStyle = hex(mix(PAL.cherry, dark, 0.35)); ctx.fill(); stroke(size * 0.019); ctx.beginPath(); ctx.arc(ex - sgn * size * 0.017, ey - size * 0.025, size * 0.02, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
