/**
 * REFERENCE PAINTER — Worker Ant (id 'ant-worker'). THE BASELINE SWARMER.
 * =====================================================================
 * This is the "how simple can a great sprite be" reference (plan §2). Every
 * Codex critter painter copies THIS pattern. If you are a Codex worker: read
 * painters/GUIDE.md, then copy this file's shape and swap the geometry/colors.
 *
 * What it demonstrates:
 *  - top-down bug seen from above, head pointing NORTH, bilaterally symmetric
 *    (the entity layer flips X via faceSign, so left/right symmetry is free);
 *  - 3-segment body (head · thorax · abdomen) ≈ 44px tall inside the 64 box;
 *  - 6 stubby legs that swap a tripod gait between the 2 walk frames;
 *  - antennae + big friendly eyes (every living thing gets eyes);
 *  - chunky cocoa outline (≈3px @ 64), flat bright fills sourced from PAL;
 *  - shiny = a baked warm-gold tint (the sparkles/rim are added by the entity
 *    layer at stamp time — do NOT draw them here).
 *
 * Painter contract: draw centered in a `size`×`size` box, transparent
 * background, outlines included. Runs ONCE per (id,frame,variant,shiny,size)
 * then cached — so it is NOT hot; readability beats micro-optimization.
 */

import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('ant-worker', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2;
  const ink = size * 0.047; // ≈3px logical @ 64
  const shiny = !!opts.shiny;

  // --- palette (species color from PAL; warm-tinted when shiny) ---
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(PAL.antWorker);       // 0xc05838 reddish worker
  const abdomenCol = base;
  const thoraxCol = warm(darken(PAL.antWorker, 0.08));
  const headCol = warm(darken(PAL.antWorker, 0.04));
  const sheen = lighten(base, 0.32);
  const legCol = darken(PAL.antWorker, 0.34);

  const stroke = () => {
    ctx.lineWidth = ink;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
  };
  const ellipse = (x: number, y: number, rx: number, ry: number, fill: number) => {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(fill);
    ctx.fill();
    stroke();
  };

  // --- 6 legs (behind the body): tripod gait swaps between frames ---
  // Head is north, so "forward" is up (−y); legs shuffle along that axis.
  ctx.lineCap = 'round';
  ctx.lineWidth = size * 0.042;   // stubby, chunky legs
  ctx.strokeStyle = hex(legCol);
  ctx.fillStyle = hex(legCol);
  const thoraxY = cy - size * 0.02;
  for (let i = 0; i < 3; i++) {
    const ly = thoraxY + (i - 1) * size * 0.1;    // 3 leg rows
    const gait = ((i + frame) & 1) ? 1 : -1;      // alternate rows per frame
    const kick = gait * size * 0.05;
    for (const sgn of [-1, 1]) {
      const ax = cx + sgn * size * 0.08;           // attach at thorax edge
      const kneeX = cx + sgn * size * 0.17;
      const footX = cx + sgn * size * 0.21;
      const footY = ly + size * 0.05 + kick;       // shuffling foot
      ctx.beginPath();
      ctx.moveTo(ax, ly);
      ctx.lineTo(kneeX, ly + size * 0.03);         // short femur out
      ctx.lineTo(footX, footY);                    // stubby tibia
      ctx.stroke();
      ctx.beginPath();                             // little rounded foot
      ctx.arc(footX, footY, size * 0.022, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- antennae (behind head): thin cocoa whips with club tips ---
  ctx.lineWidth = size * 0.024;
  ctx.strokeStyle = COCOA_CSS;
  const headY = cy - size * 0.2;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sgn * size * 0.05, headY - size * 0.06);
    ctx.quadraticCurveTo(
      cx + sgn * size * 0.16, headY - size * 0.24,
      cx + sgn * size * 0.11, headY - size * 0.32,
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + sgn * size * 0.11, headY - size * 0.33, size * 0.028, 0, Math.PI * 2);
    ctx.fillStyle = COCOA_CSS;
    ctx.fill();
  }

  // --- body: abdomen → thorax → head, back to front ---
  ellipse(cx, cy + size * 0.19, size * 0.165, size * 0.19, abdomenCol);
  // abdomen sheen (flat highlight, up-left)
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.04, cy + size * 0.12, size * 0.09, size * 0.1, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(sheen, 0.55);
  ctx.fill();

  ellipse(cx, thoraxY, size * 0.095, size * 0.11, thoraxCol);
  ellipse(cx, headY, size * 0.125, size * 0.125, headCol);

  // head sheen
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.04, headY - size * 0.03, size * 0.06, size * 0.055, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(lighten(headCol, 0.3), 0.5);
  ctx.fill();

  // mandibles (two little cocoa nubs at the north tip of the head)
  ctx.strokeStyle = COCOA_CSS;
  ctx.lineWidth = size * 0.022;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sgn * size * 0.06, headY - size * 0.1);
    ctx.quadraticCurveTo(cx + sgn * size * 0.11, headY - size * 0.17, cx + sgn * size * 0.03, headY - size * 0.16);
    ctx.stroke();
  }

  // --- big friendly eyes on the head ---
  const eyeR = size * 0.05;
  const eyeY = headY - size * 0.01;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.055;
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = eyeR * 0.32;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // pupil looks gently forward+down (friendly)
    ctx.beginPath();
    ctx.arc(ex + sgn * eyeR * 0.18, eyeY + eyeR * 0.28, eyeR * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = COCOA_CSS;
    ctx.fill();
    // catchlight
    ctx.beginPath();
    ctx.arc(ex - eyeR * 0.25, eyeY - eyeR * 0.25, eyeR * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // little smile
  ctx.strokeStyle = COCOA_CSS;
  ctx.lineWidth = size * 0.02;
  ctx.beginPath();
  ctx.arc(cx, eyeY + size * 0.05, size * 0.045, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
});
