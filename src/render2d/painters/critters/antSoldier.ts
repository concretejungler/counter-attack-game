/**
 * PAINTER - Soldier Ant (id 'ant-soldier'). Armored ant bruiser.
 * A wide head, helmet cap, and squared-off shoulders separate it from the
 * worker while keeping the familiar three-part ant read.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('ant-soldier', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.01;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const body = warm(PAL.antSoldier);
  const armor = warm(mix(PAL.antSoldier, PAL.metalDark, 0.28));
  const head = warm(darken(PAL.antSoldier, 0.08));
  const leg = darken(PAL.antSoldier, 0.36);
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
  oval(cx, cy + size * 0.18, size * 0.17, size * 0.18, body);
  ctx.strokeStyle = rgba(darken(body, 0.25), 0.8); ctx.lineWidth = size * 0.025;
  for (const dy of [0.1, 0.2, 0.29]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.13, size * 0.018, 0, 0, Math.PI * 2); ctx.stroke(); }
  oval(cx, thoraxY, size * 0.125, size * 0.125, armor);
  oval(cx, headY, size * 0.145, size * 0.13, head);
  ctx.beginPath(); ctx.ellipse(cx, headY - size * 0.055, size * 0.13, size * 0.065, 0, Math.PI, Math.PI * 2); ctx.lineTo(cx + size * 0.13, headY - size * 0.03); ctx.quadraticCurveTo(cx, headY + size * 0.03, cx - size * 0.13, headY - size * 0.03); ctx.closePath(); ctx.fillStyle = hex(lighten(armor, 0.1)); ctx.fill(); stroke(size * 0.025);
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.062, headY + size * 0.005, size * 0.05, sgn);
});
