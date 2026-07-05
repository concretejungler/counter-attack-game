/**
 * PAINTER - The Bedbug Baron (id 'bedbug-baron'). Fancy stealth boss (V2).
 * A huge quilted bedbug oval with a tiny top hat and velvet collar. V2: 3-tone
 * ramp with a belly on the quilted mass, celCrescent + rim on the shell, velvet
 * collar carries fabricTicks along its hem, the silk hat gets a specStreak, and
 * a signature crimson halo sits behind the body.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, belly, celCrescent, rim, haloBehind, specStreak, fabricTicks, innerInk, aoUnder } from '../../paint';

const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 611.3) * 43758.5453;
  return x - Math.floor(x);
};

registerCritterPainter('bedbug-baron', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.045;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.roach, PAL.cherry, 0.35));
  const b3 = ramp(base);
  const velvet = warm(darken(PAL.cherry, 0.22));
  const v3 = ramp(velvet);
  const gold = warm(PAL.butter);
  const silk = warm(darken(PAL.denim, 0.25));
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  // --- signature crimson halo behind the body ---
  haloBehind(ctx, cx, cy, size * 0.45, base, 0.24);

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.035; ctx.strokeStyle = hex(darken(base, 0.34)); ctx.fillStyle = hex(darken(base, 0.34));
  for (let i = 0; i < 5; i++) {
    const ly = cy - size * 0.22 + i * size * 0.1;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.02;
    for (const sgn of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.28, ly); ctx.lineTo(cx + sgn * size * 0.39, ly + kick); ctx.lineTo(cx + sgn * size * 0.43, ly + size * 0.04 + kick); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + sgn * size * 0.43, ly + size * 0.04 + kick, size * 0.016, 0, Math.PI * 2); ctx.fill();
    }
  }

  // velvet collar (cel-shaded fabric with a ticked hem)
  const traceCollar = () => {
    ctx.moveTo(cx - size * 0.28, cy - size * 0.29); ctx.quadraticCurveTo(cx, cy - size * 0.44, cx + size * 0.28, cy - size * 0.29);
    ctx.lineTo(cx + size * 0.22, cy - size * 0.13); ctx.quadraticCurveTo(cx, cy - size * 0.21, cx - size * 0.22, cy - size * 0.13); ctx.closePath();
  };
  ctx.beginPath(); traceCollar(); ctx.fillStyle = hex(velvet); ctx.fill(); stroke(size * 0.028);
  ctx.save(); ctx.beginPath(); traceCollar(); ctx.clip();
  ctx.fillStyle = rgba(v3.shadow, 0.55); ctx.fillRect(cx - size * 0.28, cy - size * 0.2, size * 0.56, size * 0.12);
  ctx.restore();
  fabricTicks(ctx, cx - size * 0.2, cy - size * 0.15, cx + size * 0.2, cy - size * 0.15, v3.light, 6, size * 0.05);
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.arc(cx + sgn * size * 0.16, cy - size * 0.22, size * 0.025, 0, Math.PI * 2); ctx.fillStyle = hex(gold); ctx.fill(); stroke(size * 0.012); }

  aoUnder(ctx, cx, cy + size * 0.4, size * 0.28, size * 0.05, 0.2);

  // --- quilted shell (dominant mass): belly + cel + rim ---
  ctx.beginPath(); ctx.ellipse(cx, cy, size * 0.36, size * 0.42, 0, 0, Math.PI * 2); ctx.fillStyle = hex(base); ctx.fill(); stroke();
  belly(ctx, cx, cy, size * 0.34, size * 0.4, b3, 0.5);
  celCrescent(ctx, cx, cy, size * 0.36, size * 0.42, b3.shadow, 0.42, 0.5);
  // quilting seams (interior identity lines → innerInk, thin)
  ctx.strokeStyle = innerInk(base); ctx.lineWidth = size * 0.022;
  for (const dy of [-0.2, -0.09, 0.02, 0.13, 0.24]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * (0.29 - Math.abs(dy) * 0.32), size * 0.024, 0, 0, Math.PI * 2); ctx.stroke(); }
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.04, cy - size * 0.31); ctx.quadraticCurveTo(cx + sgn * size * 0.16, cy, cx + sgn * size * 0.07, cy + size * 0.32); ctx.strokeStyle = innerInk(base); ctx.lineWidth = size * 0.016; ctx.stroke(); }
  // sparse chunky flecks (resting texture)
  for (let i = 0; i < 8; i++) { const a = rnd(i) * Math.PI * 2; const rad = rnd(i + 20) * size * 0.25; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad * 1.18, size * (0.012 + rnd(i + 40) * 0.01), 0, Math.PI * 2); ctx.fillStyle = rgba(rnd(i + 60) > 0.5 ? lighten(base, 0.28) : b3.shadow, 0.5); ctx.fill(); }
  rim(ctx, cx, cy, size * 0.36, size * 0.42, b3.light, size * 0.032, 0.5);

  const eyeY = cy - size * 0.08;
  const eyeR = size * 0.072;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.12;
    ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.021);
    ctx.beginPath(); ctx.arc(ex + wobble * eyeR * 0.12, eyeY + eyeR * 0.2, eyeR * 0.48, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(ex - eyeR * 0.28, eyeY - eyeR * 0.28, eyeR * 0.21, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.03; ctx.beginPath(); ctx.moveTo(ex - sgn * eyeR * 1.1, eyeY - eyeR * 1.25); ctx.lineTo(ex + sgn * eyeR * 1.05, eyeY - eyeR * 0.75); ctx.stroke();
  }
  ctx.beginPath(); ctx.arc(cx, cy + size * 0.11, size * 0.12, 0.12 * Math.PI, 0.88 * Math.PI); ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.025; ctx.stroke();

  // --- tiny silk top hat: cel-lit felt + a specStreak sheen + gold band ---
  const hatY = cy - size * 0.45 + wobble * size * 0.004;
  ctx.beginPath(); ctx.ellipse(cx, hatY + size * 0.035, size * 0.15, size * 0.035, 0, 0, Math.PI * 2); ctx.fillStyle = hex(darken(PAL.denim, 0.35)); ctx.fill(); stroke(size * 0.022);
  ctx.beginPath(); ctx.rect(cx - size * 0.075, hatY - size * 0.055, size * 0.15, size * 0.1); ctx.fillStyle = hex(silk); ctx.fill(); stroke(size * 0.022);
  ctx.save(); ctx.beginPath(); ctx.rect(cx - size * 0.075, hatY - size * 0.055, size * 0.15, size * 0.1); ctx.clip();
  ctx.fillStyle = rgba(ramp(silk).shadow, 0.5); ctx.fillRect(cx + size * 0.02, hatY - size * 0.055, size * 0.06, size * 0.1);
  specStreak(ctx, cx - size * 0.015, hatY - size * 0.01, size * 0.11, size * 0.026, 0.5);
  ctx.restore();
  ctx.beginPath(); ctx.rect(cx - size * 0.075, hatY + size * 0.005, size * 0.15, size * 0.025); ctx.fillStyle = hex(gold); ctx.fill();
});
