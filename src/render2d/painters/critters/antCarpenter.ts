/**
 * PAINTER - Carpenter Ant (id 'ant-carpenter'). Chunky wall-chewer ant.
 * A broad thorax, blocky mandibles, and a little wood-chip plank on the back
 * make the carpenter read as a tiny demolition worker.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('ant-carpenter', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.01;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const body = warm(mix(PAL.antSoldier, PAL.woodDark, 0.28));
  const belly = warm(lighten(PAL.antSoldier, 0.08));
  const head = warm(darken(PAL.antSoldier, 0.08));
  const wood = warm(PAL.wood);
  const leg = darken(PAL.antSoldier, 0.36);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const oval = (x: number, y: number, rx: number, ry: number, fill: number, rot = 0) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.fillStyle = hex(fill); ctx.fill(); stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32);
    ctx.beginPath(); ctx.arc(x + sgn * r * 0.16, y + r * 0.24, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.24, y - r * 0.26, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  };

  const thoraxY = cy - size * 0.02;
  const headY = cy - size * 0.22;
  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.043; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 3; i++) {
    const ly = thoraxY + (i - 1) * size * 0.1;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.045;
    for (const sgn of [-1, 1]) {
      const footX = cx + sgn * size * 0.22;
      const footY = ly + size * 0.055 + kick;
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.085, ly); ctx.lineTo(cx + sgn * size * 0.17, ly + size * 0.02); ctx.lineTo(footX, footY); ctx.stroke();
      ctx.beginPath(); ctx.arc(footX, footY, size * 0.022, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.024;
  for (const sgn of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.055, headY - size * 0.065); ctx.quadraticCurveTo(cx + sgn * size * 0.18, headY - size * 0.2, cx + sgn * size * 0.13, headY - size * 0.31); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + sgn * size * 0.13, headY - size * 0.31, size * 0.027, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
  }
  oval(cx, cy + size * 0.19, size * 0.16, size * 0.18, belly);
  oval(cx, thoraxY, size * 0.12, size * 0.13, body);
  ctx.save(); ctx.translate(cx, thoraxY - size * 0.02); ctx.rotate(-0.18);
  ctx.beginPath(); ctx.rect(-size * 0.13, -size * 0.045, size * 0.26, size * 0.09); ctx.fillStyle = hex(wood); ctx.fill(); stroke(size * 0.02);
  ctx.strokeStyle = rgba(PAL.woodDark, 0.75); ctx.lineWidth = size * 0.012;
  for (const y of [-0.018, 0.018]) { ctx.beginPath(); ctx.moveTo(-size * 0.1, size * y); ctx.lineTo(size * 0.1, size * y); ctx.stroke(); }
  ctx.restore();
  oval(cx, headY, size * 0.13, size * 0.12, head);
  ctx.fillStyle = hex(darken(head, 0.18));
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.075, headY - size * 0.115, size * 0.045, size * 0.025, sgn * 0.45, 0, Math.PI * 2); ctx.fill(); stroke(size * 0.019); }
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.056, headY - size * 0.012, size * 0.048, sgn);
});
