/**
 * REFERENCE PAINTER — The Crumb King (id 'crumb-king'). THE BOSS REFERENCE (V2).
 * ========================================================================
 * Bosses paint into the 128 box (opts.variant === 'boss') and should FILL it
 * (~100 of 128) with more detail than a swarmer — the bigger canvas is where
 * bosses earn their menace. This shows Codex how to spend that budget while
 * staying "imposing but cute" (plan §B, GUIDE.md "V2 STYLE LAW"): full 3-tone
 * ramp, ONE belly on the dominant round mass, per-material spec, a rim on the
 * primary silhouette, and a subtle in-body haloBehind in the signature color.
 *
 * What it demonstrates:
 *  - a compacted-crumb-ball body: one big gold blob whose silhouette is broken
 *    by a deterministic RING of crumb lumps, each tinted by its facing relative
 *    to the ONE upper-left light (the crumb crust reads as a lit sphere);
 *  - belly() volume + celCrescent away-side + rim() toward-light on that mass;
 *  - throne / servant-ant hints behind + below to sell "king" without clutter;
 *  - a comically TINY crown with a specStreak gold glint (the joke: small on a
 *    huge body);
 *  - a big boss face: heavy cocoa brows over round friendly eyes, crumb grin,
 *    rosy cheeks;
 *  - 2 frames animate small idle life (crown tilt, servant legs, pupil shift).
 */

import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, belly, celCrescent, rim, haloBehind, specStreak, aoUnder } from '../../paint';

// deterministic 0..1 from an index — replaces Math.random in a cached painter
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

registerCritterPainter('crumb-king', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.045; // ≈6px @ 128 — chunky boss line
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const gold = warm(PAL.crumbGold);          // 0xd8a44c compacted-crumb gold
  const g3 = ramp(gold);                      // V2: 3-tone (never plain darker)
  const wobble = frame ? 1 : -1;

  const strokeInk = (w = ink) => {
    ctx.lineWidth = w;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
  };

  const bodyR = size * 0.4;

  // --- signature gold halo BEHIND the body (subtle, in-box) ---
  haloBehind(ctx, cx, cy, size * 0.45, gold, 0.24);

  // --- throne hints (behind everything) ---
  const throneWood = 0x7a4a2c;
  const velvet = darken(PAL.cherry, 0.25);
  // back panel
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.3, cy + size * 0.2);
  ctx.lineTo(cx - size * 0.3, cy - size * 0.24);
  ctx.quadraticCurveTo(cx, cy - size * 0.44, cx + size * 0.3, cy - size * 0.24);
  ctx.lineTo(cx + size * 0.3, cy + size * 0.2);
  ctx.closePath();
  ctx.fillStyle = hex(velvet);
  ctx.fill();
  strokeInk(size * 0.03);
  // one soft cel on the velvet away-side so the throne isn't dead-flat
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.3, cy + size * 0.2);
  ctx.lineTo(cx - size * 0.3, cy - size * 0.24);
  ctx.quadraticCurveTo(cx, cy - size * 0.44, cx + size * 0.3, cy - size * 0.24);
  ctx.lineTo(cx + size * 0.3, cy + size * 0.2);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = rgba(ramp(velvet).shadow, 0.5);
  ctx.fillRect(cx + size * 0.02, cy - size * 0.44, size * 0.3, size * 0.7);
  ctx.restore();
  // throne posts with ball finials
  for (const sgn of [-1, 1]) {
    const px = cx + sgn * size * 0.34;
    ctx.beginPath();
    ctx.moveTo(px, cy + size * 0.34);
    ctx.lineTo(px, cy - size * 0.24);
    ctx.lineWidth = size * 0.05;
    ctx.strokeStyle = hex(throneWood);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px, cy - size * 0.27, size * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = hex(lighten(throneWood, 0.15));
    ctx.fill();
    strokeInk(size * 0.02);
  }

  // --- servant worker-ants at the base (carry the throne) ---
  const antCol = PAL.antWorker;
  for (const sgn of [-1, 1]) {
    const ax = cx + sgn * size * 0.26;
    const ay = cy + size * 0.36;
    // legs
    ctx.strokeStyle = hex(darken(antCol, 0.3));
    ctx.lineWidth = size * 0.014;
    for (let i = -1; i <= 1; i++) {
      const lk = ((i + (frame ? 1 : 0)) & 1) ? size * 0.02 : -size * 0.02;
      ctx.beginPath();
      ctx.moveTo(ax + i * size * 0.03, ay);
      ctx.lineTo(ax + i * size * 0.03 + lk, ay + size * 0.05);
      ctx.stroke();
    }
    // body + head
    ctx.beginPath();
    ctx.ellipse(ax, ay, size * 0.06, size * 0.045, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(antCol);
    ctx.fill();
    strokeInk(size * 0.018);
    ctx.beginPath();
    ctx.arc(ax - sgn * size * 0.06, ay - size * 0.01, size * 0.032, 0, Math.PI * 2);
    ctx.fillStyle = hex(darken(antCol, 0.05));
    ctx.fill();
    strokeInk(size * 0.016);
    ctx.beginPath();
    ctx.arc(ax - sgn * size * 0.065, ay - size * 0.015, size * 0.01, 0, Math.PI * 2);
    ctx.fillStyle = COCOA_CSS;
    ctx.fill();
  }
  // ground the crumb ball onto the throne with a soft AO pocket
  aoUnder(ctx, cx, cy + bodyR * 0.62, bodyR * 0.8, size * 0.05, 0.22);

  // --- crumb-ball body ---
  // rim lumps: deterministic ring of crumbs, each TINTED by how it faces the
  // one upper-left light (upper-left lumps read lighter, lower-right darker) so
  // the crust reads as a lit sphere — the "seeded crumb-lump shading".
  const lumps = 16;
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2;
    const rr = bodyR + size * (0.01 + rnd(i) * 0.03);
    const lx = cx + Math.cos(a) * rr;
    const ly = cy + Math.sin(a) * rr * 0.94;
    const lr = size * (0.03 + rnd(i + 7) * 0.025);
    // facing dot with the light (upper-left = lit); +seeded crumb variation
    const lit = 0.5 - 0.5 * (Math.cos(a) * 0.6 + Math.sin(a) * 0.8);
    const jt = (rnd(i + 7) - 0.5) * 0.2;
    const tone = lit > 0.5
      ? mix(gold, g3.light, Math.min(1, (lit - 0.5) * 1.5 + jt))
      : mix(gold, g3.shadow, Math.min(1, (0.5 - lit) * 1.5 - jt));
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fillStyle = hex(tone);
    ctx.fill();
    strokeInk(size * 0.02);
  }
  // main mass
  ctx.beginPath();
  ctx.ellipse(cx, cy, bodyR, bodyR * 0.94, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(gold);
  ctx.fill();
  strokeInk();
  // ONE belly gradient (dominant round mass) → cel shadow lens on the away side
  belly(ctx, cx, cy, bodyR * 0.97, bodyR * 0.91, g3, 0.5);
  celCrescent(ctx, cx, cy, bodyR, bodyR * 0.94, g3.shadow, 0.42, 0.45);
  // interior crumb speckle — chunky enough to survive downscale (≤ ~9 flecks)
  for (let i = 0; i < 9; i++) {
    const a = rnd(i + 30) * Math.PI * 2;
    const rad = rnd(i + 51) * bodyR * 0.72;
    const sx = cx + Math.cos(a) * rad;
    const sy = cy + Math.sin(a) * rad * 0.9;
    const sr = size * (0.014 + rnd(i + 70) * 0.016);
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = rgba(rnd(i) > 0.5 ? g3.shadow : lighten(gold, 0.28), 0.55);
    ctx.fill();
  }
  // toward-light rim band on the crumb ball (boss-tier silhouette pop)
  rim(ctx, cx, cy, bodyR, bodyR * 0.94, g3.light, size * 0.032, 0.5);

  // --- big boss face ---
  const eyeY = cy - size * 0.05;
  const eyeR = size * 0.075;
  // rosy cheeks (cute)
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + sgn * size * 0.22, eyeY + size * 0.09, size * 0.055, size * 0.035, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(232,120,110,0.5)';
    ctx.fill();
  }
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.13;
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    strokeInk(size * 0.022);
    // pupil (shifts slightly by frame = alive)
    ctx.beginPath();
    ctx.arc(ex + wobble * eyeR * 0.14, eyeY + eyeR * 0.2, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = COCOA_CSS;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex - eyeR * 0.28, eyeY - eyeR * 0.28, eyeR * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    // heavy brow (imposing) — angled down toward center
    ctx.strokeStyle = COCOA_CSS;
    ctx.lineWidth = size * 0.03;
    ctx.beginPath();
    ctx.moveTo(ex - sgn * eyeR * 1.2, eyeY - eyeR * 1.35);
    ctx.lineTo(ex + sgn * eyeR * 1.1, eyeY - eyeR * 0.75);
    ctx.stroke();
  }
  // crumb grin with a couple of blocky "crumb teeth"
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.13, cy + size * 0.13);
  ctx.quadraticCurveTo(cx, cy + size * 0.25, cx + size * 0.13, cy + size * 0.13);
  ctx.lineWidth = size * 0.025;
  ctx.strokeStyle = COCOA_CSS;
  ctx.stroke();
  ctx.fillStyle = rgba(0xfff2d8, 0.95);
  for (const dx of [-0.05, 0.02]) {
    ctx.beginPath();
    ctx.rect(cx + size * dx, cy + size * 0.15, size * 0.045, size * 0.045);
    ctx.fill();
    ctx.lineWidth = size * 0.012;
    ctx.stroke();
  }

  // --- tiny crown (the joke: small on a huge head) ---
  const crownW = size * 0.22;
  const crownY = cy - bodyR - size * 0.02 + wobble * size * 0.006;
  const cxs = cx - crownW / 2;
  ctx.beginPath();
  ctx.moveTo(cxs, crownY);
  ctx.lineTo(cxs, crownY - size * 0.06);
  ctx.lineTo(cxs + crownW * 0.25, crownY - size * 0.02);
  ctx.lineTo(cxs + crownW * 0.5, crownY - size * 0.09);
  ctx.lineTo(cxs + crownW * 0.75, crownY - size * 0.02);
  ctx.lineTo(cxs + crownW, crownY - size * 0.06);
  ctx.lineTo(cxs + crownW, crownY);
  ctx.closePath();
  ctx.fillStyle = hex(PAL.butter);
  ctx.fill();
  strokeInk(size * 0.022);
  // per-material spec: a bright gold streak across the crown (polished metal)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cxs, crownY);
  ctx.lineTo(cxs, crownY - size * 0.06);
  ctx.lineTo(cxs + crownW * 0.25, crownY - size * 0.02);
  ctx.lineTo(cxs + crownW * 0.5, crownY - size * 0.09);
  ctx.lineTo(cxs + crownW * 0.75, crownY - size * 0.02);
  ctx.lineTo(cxs + crownW, crownY - size * 0.06);
  ctx.lineTo(cxs + crownW, crownY);
  ctx.closePath();
  ctx.clip();
  specStreak(ctx, cx - crownW * 0.12, crownY - size * 0.04, crownW * 0.9, size * 0.03, 0.6);
  ctx.restore();
  // crown jewels
  const jewels = [PAL.cherry, PAL.mint, PAL.cherry];
  for (let j = 0; j < 3; j++) {
    ctx.beginPath();
    ctx.arc(cxs + crownW * (0.25 + j * 0.25), crownY - size * 0.005, size * 0.014, 0, Math.PI * 2);
    ctx.fillStyle = hex(jewels[j]);
    ctx.fill();
    ctx.lineWidth = size * 0.01;
    ctx.stroke();
  }
});
