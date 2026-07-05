/**
 * PAINTER - The Trash Panda Don (id 'trash-panda-don'). Raccoon mafioso boss (V2).
 * A masked raccoon in a tiny coat holding a garbage-lid shield, fedora on top.
 * V2: the garbage lid is hard metal (cel + specStreak + rim rivets + a boss
 * glint), the fedora is matte felt (cel + hatband), the coat is the dominant
 * mass (belly + cel + rim + ticked hem); a cool coat halo sits behind.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, belly, celCrescent, rim, haloBehind, specStreak, rivets, glossDot, fabricTicks, innerInk, aoUnder } from '../../paint';

registerCritterPainter('trash-panda-don', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const fur = warm(mix(PAL.mouse, PAL.metalDark, 0.35));
  const furR = ramp(fur);
  const dark = warm(darken(PAL.mouse, 0.42));
  const coat = warm(darken(PAL.denim, 0.3));
  const c3 = ramp(coat);
  const lid = warm(PAL.metal);
  const lidR = ramp(lid);
  const felt = warm(darken(PAL.snailShell, 0.1));
  const feltR = ramp(felt);
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  // --- cool coat halo behind ---
  haloBehind(ctx, cx, cy + size * 0.05, size * 0.45, coat, 0.22);

  // tail
  ctx.lineCap = 'round'; ctx.strokeStyle = hex(dark); ctx.lineWidth = size * 0.05;
  ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.3); ctx.quadraticCurveTo(cx + size * 0.36, cy + size * 0.44, cx + size * 0.18, cy + size * (0.49 + wobble * 0.006)); ctx.stroke();
  // legs
  ctx.strokeStyle = hex(darken(fur, 0.35)); ctx.fillStyle = hex(darken(fur, 0.35)); ctx.lineWidth = size * 0.034;
  for (let i = 0; i < 3; i++) { const y = cy - size * 0.02 + i * size * 0.13; const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.022; for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.24, y); ctx.lineTo(cx + sgn * size * 0.37, y + size * 0.05 + kick); ctx.stroke(); } }

  aoUnder(ctx, cx, cy + size * 0.4, size * 0.28, size * 0.05, 0.2);

  // --- coat (dominant mass) ---
  const traceCoat = () => { ctx.moveTo(cx - size * 0.3, cy - size * 0.18); ctx.quadraticCurveTo(cx, cy - size * 0.31, cx + size * 0.3, cy - size * 0.18); ctx.lineTo(cx + size * 0.32, cy + size * 0.35); ctx.quadraticCurveTo(cx, cy + size * 0.45, cx - size * 0.32, cy + size * 0.35); ctx.closePath(); };
  ctx.beginPath(); traceCoat(); ctx.fillStyle = hex(coat); ctx.fill(); stroke();
  ctx.save(); ctx.beginPath(); traceCoat(); ctx.clip();
  belly(ctx, cx, cy + size * 0.08, size * 0.3, size * 0.34, c3, 0.5);
  celCrescent(ctx, cx, cy + size * 0.08, size * 0.32, size * 0.35, c3.shadow, 0.42, 0.5);
  rim(ctx, cx, cy + size * 0.08, size * 0.32, size * 0.35, c3.light, size * 0.03, 0.45);
  ctx.restore();
  // fur chest
  ctx.beginPath(); ctx.moveTo(cx - size * 0.1, cy - size * 0.14); ctx.lineTo(cx, cy + size * 0.22); ctx.lineTo(cx + size * 0.1, cy - size * 0.14); ctx.closePath(); ctx.fillStyle = rgba(lighten(fur, 0.32), 0.68); ctx.fill(); stroke(size * 0.017);
  // ticked hem
  fabricTicks(ctx, cx - size * 0.25, cy + size * 0.38, cx + size * 0.25, cy + size * 0.38, c3.light, 6, size * 0.05);

  // --- garbage-lid shield: hard metal ---
  ctx.beginPath(); ctx.ellipse(cx - size * 0.28, cy + size * 0.04, size * 0.16, size * 0.25, -0.35, 0, Math.PI * 2); ctx.fillStyle = hex(lid); ctx.fill(); stroke(size * 0.035);
  ctx.save(); ctx.beginPath(); ctx.ellipse(cx - size * 0.28, cy + size * 0.04, size * 0.16, size * 0.25, -0.35, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = rgba(lidR.shadow, 0.45); ctx.fillRect(cx - size * 0.28, cy + size * 0.04, size * 0.2, size * 0.3);
  specStreak(ctx, cx - size * 0.32, cy - size * 0.04, size * 0.28, size * 0.035, 0.5);
  ctx.restore();
  rim(ctx, cx - size * 0.28, cy + size * 0.04, size * 0.16, size * 0.25, lidR.light, size * 0.03, 0.5);
  rivets(ctx, [
    { x: cx - size * 0.28, y: cy - size * 0.16 }, { x: cx - size * 0.17, y: cy - size * 0.02 },
    { x: cx - size * 0.39, y: cy + size * 0.1 }, { x: cx - size * 0.28, y: cy + size * 0.24 },
  ], size * 0.018, innerInk(lid));
  ctx.beginPath(); ctx.arc(cx - size * 0.28, cy + size * 0.04, size * 0.065, 0, Math.PI * 2); ctx.fillStyle = hex(lighten(lid, 0.18)); ctx.fill(); stroke(size * 0.016);
  glossDot(ctx, cx - size * 0.3, cy + size * 0.01, size * 0.022, 0.8);

  // ears
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.17, cy - size * 0.31, size * 0.1, size * 0.14, sgn * 0.35, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke(size * 0.024); ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.17, cy - size * 0.31, size * 0.054, size * 0.08, sgn * 0.35, 0, Math.PI * 2); ctx.fillStyle = rgba(dark, 0.6); ctx.fill(); }
  // head
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.2, size * 0.23, size * 0.19, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fur); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy - size * 0.2, size * 0.23, size * 0.19, furR.shadow, 0.42, 0.5);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.21, size * 0.19, size * 0.08, 0, 0, Math.PI * 2); ctx.fillStyle = hex(dark); ctx.fill();
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.085; const ey = cy - size * 0.22; ctx.beginPath(); ctx.arc(ex, ey, size * 0.055, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.016); ctx.beginPath(); ctx.arc(ex + wobble * size * 0.005, ey + size * 0.012, size * 0.026, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.012, ey - size * 0.012, size * 0.01, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.09, size * 0.055, size * 0.038, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(fur, 0.22)); ctx.fill(); stroke(size * 0.014);

  // --- fedora: matte felt (brim + cel-lit crown + hatband) ---
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.39, size * 0.2, size * 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(felt, 0.12)); ctx.fill(); stroke(size * 0.02);
  const traceCrown = () => { ctx.moveTo(cx - size * 0.11, cy - size * 0.39); ctx.lineTo(cx - size * 0.08, cy - size * 0.5); ctx.lineTo(cx + size * 0.08, cy - size * 0.5); ctx.lineTo(cx + size * 0.11, cy - size * 0.39); ctx.closePath(); };
  ctx.beginPath(); traceCrown(); ctx.fillStyle = hex(felt); ctx.fill(); stroke(size * 0.02);
  ctx.save(); ctx.beginPath(); traceCrown(); ctx.clip();
  ctx.fillStyle = rgba(feltR.shadow, 0.5); ctx.fillRect(cx + size * 0.02, cy - size * 0.5, size * 0.09, size * 0.12);
  ctx.restore();
  // hatband
  ctx.strokeStyle = innerInk(felt); ctx.lineWidth = size * 0.02; ctx.beginPath(); ctx.moveTo(cx - size * 0.105, cy - size * 0.41); ctx.lineTo(cx + size * 0.105, cy - size * 0.41); ctx.stroke();
});
