/**
 * REFERENCE PAINTER — The Crumb King (id 'crumb-king'). THE BOSS REFERENCE.
 * ========================================================================
 * Bosses paint into the 128 box (opts.variant === 'boss') and should FILL it
 * (~100 of 128) with more detail than a swarmer — the bigger canvas is where
 * bosses earn their menace. This shows Codex how to spend that budget while
 * staying "imposing but cute" (plan §2, GAME-PROMPT §25).
 *
 * What it demonstrates:
 *  - a compacted-crumb-ball body: one big gold blob whose silhouette is broken
 *    up by a deterministic RING of little crumb lumps, plus interior speckle —
 *    all positioned by a tiny seeded helper (NO Math.random; deterministic per
 *    frame so the cache is stable);
 *  - throne / servant-ant hints behind + below to sell "king" without clutter;
 *  - a comically TINY crown (small relative to the huge body = the joke);
 *  - a big boss face: heavy cocoa brows over round friendly eyes, crumb grin,
 *    rosy cheeks;
 *  - 2 frames animate small idle life (crown tilt, servant legs, pupil shift).
 */

import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

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
  const wobble = frame ? 1 : -1;

  const strokeInk = (w = ink) => {
    ctx.lineWidth = w;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
  };

  const bodyR = size * 0.4;

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

  // --- crumb-ball body ---
  // rim lumps: deterministic ring of little crumbs breaking the silhouette
  const lumps = 16;
  for (let i = 0; i < lumps; i++) {
    const a = (i / lumps) * Math.PI * 2;
    const rr = bodyR + size * (0.01 + rnd(i) * 0.03);
    const lx = cx + Math.cos(a) * rr;
    const ly = cy + Math.sin(a) * rr * 0.94;
    const lr = size * (0.03 + rnd(i + 7) * 0.025);
    ctx.beginPath();
    ctx.arc(lx, ly, lr, 0, Math.PI * 2);
    ctx.fillStyle = hex(mix(gold, i & 1 ? 0x8a5a2c : 0xe7c477, 0.4));
    ctx.fill();
    strokeInk(size * 0.02);
  }
  // main mass
  ctx.beginPath();
  ctx.ellipse(cx, cy, bodyR, bodyR * 0.94, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(gold);
  ctx.fill();
  strokeInk();
  // top-left flat sheen
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.12, cy - size * 0.14, size * 0.2, size * 0.16, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(lighten(gold, 0.3), 0.4);
  ctx.fill();
  // interior crumb speckle (texture)
  for (let i = 0; i < 22; i++) {
    const a = rnd(i + 30) * Math.PI * 2;
    const rad = rnd(i + 51) * bodyR * 0.8;
    const sx = cx + Math.cos(a) * rad;
    const sy = cy + Math.sin(a) * rad * 0.9;
    const sr = size * (0.008 + rnd(i + 70) * 0.014);
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = rgba(rnd(i) > 0.5 ? darken(gold, 0.22) : lighten(gold, 0.28), 0.7);
    ctx.fill();
  }

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
