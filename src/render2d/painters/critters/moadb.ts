/**
 * PAINTER - M.O.A.D.B. (id 'moadb'). Mother of all dust bunny boss.
 * A huge fuzzy lint snowball with couch-fluff ears, crown-comb, and tiny shed
 * bunnies orbiting the base sells "dust boss" at the 128 box.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 941.2) * 43758.5453;
  return x - Math.floor(x);
};

registerCritterPainter('moadb', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const fuzz = warm(PAL.dustBunny);
  const deep = warm(darken(PAL.dustBunny, 0.22));
  const lint = warm(lighten(PAL.dustBunny, 0.24));
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.02; ctx.strokeStyle = hex(deep);
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const x = cx + Math.cos(a) * size * (0.31 + rnd(i) * 0.05); const y = cy + Math.sin(a) * size * (0.31 + rnd(i + 20) * 0.05); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * size * 0.09, y + Math.sin(a) * size * 0.08); ctx.stroke(); }
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sgn * size * 0.2, cy - size * 0.3, size * 0.13, size * 0.2, sgn * 0.45, 0, Math.PI * 2); ctx.fillStyle = hex(lint); ctx.fill(); stroke(size * 0.026); }
  for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2; const lx = cx + Math.cos(a) * size * (0.34 + rnd(i) * 0.035); const ly = cy + Math.sin(a) * size * (0.33 + rnd(i + 12) * 0.035); ctx.beginPath(); ctx.arc(lx, ly, size * (0.035 + rnd(i + 40) * 0.025), 0, Math.PI * 2); ctx.fillStyle = hex(rnd(i + 80) > 0.5 ? lint : deep); ctx.fill(); stroke(size * 0.018); }
  ctx.beginPath(); ctx.ellipse(cx, cy, size * 0.38, size * 0.37, 0, 0, Math.PI * 2); ctx.fillStyle = hex(fuzz); ctx.fill(); stroke();
  ctx.beginPath(); ctx.ellipse(cx - size * 0.1, cy - size * 0.11, size * 0.19, size * 0.13, -0.25, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(fuzz, 0.32), 0.45); ctx.fill();
  for (let i = 0; i < 28; i++) { const a = rnd(i + 100) * Math.PI * 2; const r = rnd(i + 130) * size * 0.31; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size * (0.007 + rnd(i + 160) * 0.012), 0, Math.PI * 2); ctx.fillStyle = rgba(rnd(i) > 0.5 ? lighten(fuzz, 0.3) : darken(fuzz, 0.28), 0.75); ctx.fill(); }
  for (const sgn of [-1, 1]) { const bx = cx + sgn * size * 0.32; const by = cy + size * 0.34 + wobble * size * 0.008; ctx.beginPath(); ctx.ellipse(bx, by, size * 0.07, size * 0.045, 0, 0, Math.PI * 2); ctx.fillStyle = hex(deep); ctx.fill(); stroke(size * 0.016); ctx.beginPath(); ctx.arc(bx + sgn * size * 0.035, by - size * 0.035, size * 0.032, 0, Math.PI * 2); ctx.fillStyle = hex(lint); ctx.fill(); stroke(size * 0.014); }

  const eyeY = cy - size * 0.05;
  const eyeR = size * 0.073;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.12;
    ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.022);
    ctx.beginPath(); ctx.arc(ex + wobble * eyeR * 0.13, eyeY + eyeR * 0.24, eyeR * 0.48, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - eyeR * 0.28, eyeY - eyeR * 0.28, eyeR * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.028; ctx.beginPath(); ctx.moveTo(ex - sgn * eyeR * 1.1, eyeY - eyeR * 1.25); ctx.lineTo(ex + sgn * eyeR, eyeY - eyeR * 0.78); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy + size * 0.12, size * 0.11, 0.16 * Math.PI, 0.84 * Math.PI); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.025; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(cx - size * 0.12, cy - size * 0.38); ctx.lineTo(cx - size * 0.05, cy - size * 0.29); ctx.lineTo(cx, cy - size * 0.41); ctx.lineTo(cx + size * 0.05, cy - size * 0.29); ctx.lineTo(cx + size * 0.12, cy - size * 0.38); ctx.lineTo(cx + size * 0.1, cy - size * 0.29); ctx.lineTo(cx - size * 0.1, cy - size * 0.29); ctx.closePath(); ctx.fillStyle = hex(PAL.butter); ctx.fill(); stroke(size * 0.02);
});
