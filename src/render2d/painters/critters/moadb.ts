/**
 * PAINTER - M.O.A.D.B. (id 'moadb'). Mother of all dust bunny boss (V2).
 * A huge fuzzy lint snowball with couch-fluff ears, crown-comb, and tiny shed
 * bunnies orbiting the base. V2: the silhouette itself is a scalloped furEdge
 * (fluff lives in the outline, never interior hatching); dusty soft tones from
 * ramp(), one belly on the lint core, rim + a signature grey halo behind.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, belly, celCrescent, rim, haloBehind, furEdgePath, aoUnder } from '../../paint';

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
  const f3 = ramp(fuzz);                    // dusty violet-grey shadow, warm light
  const deep = warm(darken(PAL.dustBunny, 0.22));
  const lint = warm(lighten(PAL.dustBunny, 0.24));
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  const bodyRx = size * 0.36;
  const bodyRy = size * 0.35;

  // --- signature dusty halo behind the fluff (subtle, in-box) ---
  haloBehind(ctx, cx, cy, size * 0.45, lint, 0.22);

  // stray lint whiskers poking out (kept thin, a few, for fluff character)
  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.018; ctx.strokeStyle = hex(deep);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + rnd(i) * 0.3;
    const x = cx + Math.cos(a) * bodyRx * 1.0;
    const y = cy + Math.sin(a) * bodyRy * 1.0;
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * size * 0.08, y + Math.sin(a) * size * 0.075); ctx.stroke();
  }

  // couch-fluff ears (behind the body), each with a soft cel
  for (const sgn of [-1, 1]) {
    const exc = cx + sgn * size * 0.2, eyc = cy - size * 0.3;
    ctx.beginPath(); ctx.ellipse(exc, eyc, size * 0.13, size * 0.2, sgn * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = hex(lint); ctx.fill(); stroke(size * 0.026);
    celCrescent(ctx, exc, eyc, size * 0.13, size * 0.2, ramp(lint).shadow, 0.4, 0.5);
  }

  aoUnder(ctx, cx, cy + bodyRy * 0.7, bodyRx * 0.8, size * 0.05, 0.2);

  // --- fluff body: scalloped fur silhouette IS the outline ---
  const furP = furEdgePath(cx, cy, bodyRx, bodyRy, 12, 0.17, 3);
  ctx.fillStyle = hex(fuzz); ctx.fill(furP);
  ctx.lineWidth = ink; ctx.strokeStyle = COCOA_CSS; ctx.stroke(furP);
  // ONE belly on the lint core → cel shadow lens on the away side
  belly(ctx, cx, cy, bodyRx * 0.92, bodyRy * 0.92, f3, 0.58);
  celCrescent(ctx, cx, cy, bodyRx * 0.96, bodyRy * 0.96, f3.shadow, 0.42, 0.58);
  // a few chunky lint flecks (resting texture, sized to survive downscale)
  for (let i = 0; i < 8; i++) {
    const a = rnd(i + 100) * Math.PI * 2;
    const r = rnd(i + 130) * bodyRx * 0.72;
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, size * (0.013 + rnd(i + 160) * 0.014), 0, Math.PI * 2);
    ctx.fillStyle = rgba(rnd(i) > 0.5 ? lint : f3.shadow, 0.55); ctx.fill();
  }
  rim(ctx, cx, cy, bodyRx * 0.98, bodyRy * 0.98, f3.light, size * 0.03, 0.5);

  // shed baby bunnies at the base
  for (const sgn of [-1, 1]) {
    const bx = cx + sgn * size * 0.32; const by = cy + size * 0.34 + wobble * size * 0.008;
    ctx.beginPath(); ctx.ellipse(bx, by, size * 0.07, size * 0.045, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(deep); ctx.fill(); stroke(size * 0.016);
    ctx.beginPath(); ctx.arc(bx + sgn * size * 0.035, by - size * 0.035, size * 0.032, 0, Math.PI * 2);
    ctx.fillStyle = hex(lint); ctx.fill(); stroke(size * 0.014);
  }

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
  // crown-comb (calm gold accent)
  ctx.beginPath(); ctx.moveTo(cx - size * 0.12, cy - size * 0.38); ctx.lineTo(cx - size * 0.05, cy - size * 0.29); ctx.lineTo(cx, cy - size * 0.41); ctx.lineTo(cx + size * 0.05, cy - size * 0.29); ctx.lineTo(cx + size * 0.12, cy - size * 0.38); ctx.lineTo(cx + size * 0.1, cy - size * 0.29); ctx.lineTo(cx - size * 0.1, cy - size * 0.29); ctx.closePath(); ctx.fillStyle = hex(PAL.butter); ctx.fill(); stroke(size * 0.02);
});
