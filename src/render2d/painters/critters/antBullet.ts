/**
 * PAINTER - Bullet Ant (id 'ant-bullet'). Needle-fast ant sprinter.
 * The silhouette is a narrow dart: long pointed abdomen, tiny thorax, and legs
 * swept backward so it reads as speed even at 24px.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('ant-bullet', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(PAL.antBullet);
  const head = warm(darken(PAL.antBullet, 0.08));
  const thorax = warm(lighten(PAL.antBullet, 0.04));
  const leg = darken(PAL.antBullet, 0.34);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const oval = (x: number, y: number, rx: number, ry: number, fill: number) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fill); ctx.fill(); stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32);
    ctx.beginPath(); ctx.arc(x + sgn * r * 0.15, y + r * 0.24, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  };

  const thoraxY = cy - size * 0.01;
  const headY = cy - size * 0.23;
  ctx.lineCap = 'round'; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg); ctx.lineWidth = size * 0.034;
  for (let i = 0; i < 3; i++) {
    const ly = thoraxY + (i - 1) * size * 0.09;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.055;
    for (const sgn of [-1, 1]) {
      const footX = cx + sgn * size * (0.2 + i * 0.018);
      const footY = ly + size * 0.1 + kick;
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.065, ly); ctx.lineTo(cx + sgn * size * 0.15, ly + size * 0.035); ctx.lineTo(footX, footY); ctx.stroke();
      ctx.beginPath(); ctx.arc(footX, footY, size * 0.018, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.022;
  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.045, headY - size * 0.06); ctx.quadraticCurveTo(cx + sgn * size * 0.12, headY - size * 0.2, cx + sgn * size * 0.07, headY - size * 0.31); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + sgn * size * 0.07, headY - size * 0.31, size * 0.02, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.43);
  ctx.quadraticCurveTo(cx - size * 0.16, cy + size * 0.25, cx - size * 0.09, cy + size * 0.08);
  ctx.quadraticCurveTo(cx, cy - size * 0.01, cx + size * 0.09, cy + size * 0.08);
  ctx.quadraticCurveTo(cx + size * 0.16, cy + size * 0.25, cx, cy + size * 0.43);
  ctx.closePath(); ctx.fillStyle = hex(base); ctx.fill(); stroke();
  ctx.strokeStyle = rgba(darken(base, 0.2), 0.85); ctx.lineWidth = size * 0.024;
  for (const dy of [0.18, 0.28]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * 0.08, size * 0.016, 0, 0, Math.PI * 2); ctx.stroke(); }
  oval(cx, thoraxY, size * 0.075, size * 0.095, thorax);
  oval(cx, headY, size * 0.105, size * 0.115, head);
  ctx.beginPath(); ctx.ellipse(cx - size * 0.03, cy + size * 0.19, size * 0.04, size * 0.12, -0.15, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(base, 0.32), 0.45); ctx.fill();
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.048, headY - size * 0.01, size * 0.044, sgn);
});
