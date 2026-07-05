/**
 * PAINTER - Soldier Ant (id 'ant-soldier'). Armored ant bruiser.
 * A wide head, helmet cap, and squared-off shoulders separate it from the
 * worker while keeping the familiar three-part ant read.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten } from '../../colors';
import { ramp, celCrescent, belly, specStreak } from '../../paint';

registerCritterPainter('ant-soldier', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.01;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const body = warm(PAL.antSoldier);
  const r3 = ramp(body);
  const armor = warm(mix(PAL.antSoldier, PAL.metalDark, 0.28));
  const armorR = ramp(armor);
  const head = warm(mix(PAL.antSoldier, r3.shadow, 0.18));
  const leg = mix(r3.shadow, 0x000000, 0.1);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const oval = (x: number, y: number, rx: number, ry: number, fill: number) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fill); ctx.fill(); stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32);
    ctx.beginPath(); ctx.arc(x + sgn * r * 0.16, y + r * 0.22, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  };

  const thoraxY = cy - size * 0.015;
  const headY = cy - size * 0.21;
  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.046; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 3; i++) {
    const ly = thoraxY + (i - 1) * size * 0.105;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.042;
    for (const sgn of [-1, 1]) {
      const footX = cx + sgn * size * 0.23;
      const footY = ly + size * 0.055 + kick;
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.09, ly); ctx.lineTo(cx + sgn * size * 0.18, ly + size * 0.02); ctx.lineTo(footX, footY); ctx.stroke();
      ctx.beginPath(); ctx.arc(footX, footY, size * 0.023, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.024;
  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.06, headY - size * 0.055); ctx.quadraticCurveTo(cx + sgn * size * 0.19, headY - size * 0.19, cx + sgn * size * 0.13, headY - size * 0.31); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + sgn * size * 0.13, headY - size * 0.31, size * 0.027, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
  }
  // V2: belly gradient on the abdomen (dominant mass) + cel crescents per segment.
  const abY = cy + size * 0.18;
  oval(cx, abY, size * 0.17, size * 0.18, body);
  belly(ctx, cx, abY, size * 0.16, size * 0.17, r3, 0.5);
  celCrescent(ctx, cx, abY, size * 0.17, size * 0.18, r3.shadow, 0.45, 0.55);
  ctx.strokeStyle = rgba(r3.shadow, 0.75); ctx.lineWidth = size * 0.025;
  for (const dy of [0.1, 0.2, 0.29]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.13, size * 0.018, 0, 0, Math.PI * 2); ctx.stroke(); }
  oval(cx, thoraxY, size * 0.125, size * 0.125, armor);
  celCrescent(ctx, cx, thoraxY, size * 0.125, size * 0.125, armorR.shadow, 0.5, 0.6);
  oval(cx, headY, size * 0.145, size * 0.13, head);
  celCrescent(ctx, cx, headY, size * 0.145, size * 0.13, r3.shadow, 0.42, 0.5);
  // helmet cap: cel-lit metal with one spec streak = "hard shiny"
  ctx.beginPath(); ctx.ellipse(cx, headY - size * 0.055, size * 0.13, size * 0.065, 0, Math.PI, Math.PI * 2); ctx.lineTo(cx + size * 0.13, headY - size * 0.03); ctx.quadraticCurveTo(cx, headY + size * 0.03, cx - size * 0.13, headY - size * 0.03); ctx.closePath(); ctx.fillStyle = hex(lighten(armor, 0.1)); ctx.fill(); stroke(size * 0.025);
  ctx.save();
  ctx.beginPath(); ctx.ellipse(cx, headY - size * 0.045, size * 0.125, size * 0.06, 0, 0, Math.PI * 2); ctx.clip();
  specStreak(ctx, cx - size * 0.04, headY - size * 0.06, size * 0.14, size * 0.03, 0.5);
  ctx.fillStyle = rgba(armorR.shadow, 0.4);
  ctx.fillRect(cx + size * 0.02, headY - size * 0.12, size * 0.12, size * 0.1);
  ctx.restore();
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.062, headY + size * 0.005, size * 0.05, sgn);
});
