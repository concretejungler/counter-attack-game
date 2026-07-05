/**
 * PAINTER - Fire Ant (id 'ant-fire'). Hot red ant raider.
 * The profile stays ant-simple, but a red-orange body and flame-shaped abdomen
 * mark make it read as the spicy fast variant.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix } from '../../colors';
import { ramp, celCrescent, belly, haloBehind } from '../../paint';

registerCritterPainter('ant-fire', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(PAL.cherry);
  const r3 = ramp(base);
  const orange = warm(PAL.antBullet);
  const head = warm(mix(PAL.cherry, r3.shadow, 0.2));
  const leg = mix(r3.shadow, 0x000000, 0.12);
  const glow = warm(PAL.flame);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const oval = (x: number, y: number, rx: number, ry: number, fill: number) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fill); ctx.fill(); stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32);
    ctx.beginPath(); ctx.arc(x + sgn * r * 0.16, y + r * 0.26, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  };

  const thoraxY = cy - size * 0.02;
  const headY = cy - size * 0.2;
  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.04; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 3; i++) {
    const ly = thoraxY + (i - 1) * size * 0.096;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.055;
    for (const sgn of [-1, 1]) {
      const footX = cx + sgn * size * 0.215;
      const footY = ly + size * 0.04 + kick;
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.075, ly); ctx.lineTo(cx + sgn * size * 0.165, ly + size * 0.025); ctx.lineTo(footX, footY); ctx.stroke();
      ctx.beginPath(); ctx.arc(footX, footY, size * 0.02, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.023;
  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.05, headY - size * 0.055); ctx.quadraticCurveTo(cx + sgn * size * 0.16, headY - size * 0.2, cx + sgn * size * 0.105, headY - size * 0.31); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + sgn * size * 0.105, headY - size * 0.31, size * 0.025, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
  }
  // V2: a faint warm ember halo behind the abdomen (the "spicy" read-target),
  // then belly + cel shading; the flame mark stays the focal detail region.
  const abY = cy + size * 0.18;
  haloBehind(ctx, cx, abY, size * 0.24, glow, 0.16);
  oval(cx, abY, size * 0.16, size * 0.19, base);
  belly(ctx, cx, abY, size * 0.15, size * 0.18, r3, 0.5);
  celCrescent(ctx, cx, abY, size * 0.16, size * 0.19, r3.shadow, 0.45, 0.5);
  ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.02); ctx.quadraticCurveTo(cx - size * 0.09, cy + size * 0.12, cx - size * 0.035, cy + size * 0.23); ctx.quadraticCurveTo(cx, cy + size * 0.18, cx + size * 0.035, cy + size * 0.3); ctx.quadraticCurveTo(cx + size * 0.095, cy + size * 0.14, cx, cy + size * 0.02); ctx.closePath(); ctx.fillStyle = rgba(glow, 0.85); ctx.fill();
  // flame-mark hot core (two tones read as fire even at 24px)
  ctx.beginPath(); ctx.moveTo(cx, cy + size * 0.08); ctx.quadraticCurveTo(cx - size * 0.04, cy + size * 0.15, cx, cy + size * 0.24); ctx.quadraticCurveTo(cx + size * 0.045, cy + size * 0.15, cx, cy + size * 0.08); ctx.closePath(); ctx.fillStyle = rgba(warm(PAL.butter), 0.9); ctx.fill();
  oval(cx, thoraxY, size * 0.095, size * 0.11, orange);
  celCrescent(ctx, cx, thoraxY, size * 0.095, size * 0.11, ramp(orange).shadow, 0.5, 0.55);
  oval(cx, headY, size * 0.125, size * 0.12, head);
  celCrescent(ctx, cx, headY, size * 0.125, size * 0.12, r3.shadow, 0.42, 0.5);
  ctx.beginPath(); ctx.ellipse(cx - size * 0.04, headY - size * 0.03, size * 0.055, size * 0.05, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(r3.light, 0.5); ctx.fill();
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.055, headY - size * 0.005, size * 0.048, sgn);
});
