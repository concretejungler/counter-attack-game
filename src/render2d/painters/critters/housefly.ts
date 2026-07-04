/**
 * REFERENCE PAINTER — Housefly (id 'fly-house'). THE FLIER REFERENCE.
 * ==================================================================
 * The flier archetype for Codex (plan §2). Shows how a flying critter is
 * painted: it draws NO shadow of its own — the entity layer draws a small blob
 * shadow offset by altitude and stamps the sprite at full opacity with a gentle
 * bob. Everything here is the bug itself, centered, head NORTH.
 *
 * What it demonstrates:
 *  - wing-blur ellipses (a solid wing + a fainter "ghost" that widens on frame 1
 *    to fake the buzz) — this is the 2-frame convention for fliers;
 *  - iridescent compound eyes (the fly's whole personality is the eyes): a
 *    maroon dome layered with translucent cyan/violet + a white catchlight,
 *    "flat bright fills" plus a couple of sheen washes;
 *  - 2-segment slate body (thorax · striped abdomen), spindly legs;
 *  - chunky cocoa outline, shiny = baked warm tint (sparkles come from the
 *    entity layer, not here).
 */

import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('fly-house', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.03; // nudge down; wings need room up top
  const ink = size * 0.045;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);

  const bodyCol = warm(PAL.flyBody);          // 0x5a6b78 slate
  const thoraxCol = warm(lighten(PAL.flyBody, 0.08));
  const stripe = darken(PAL.flyBody, 0.28);
  const wingCol = PAL.flyWing;                 // 0xcfe3ee pale blue
  const legCol = darken(PAL.flyBody, 0.35);

  const strokeInk = (w = ink) => {
    ctx.lineWidth = w;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
  };

  const thoraxY = cy - size * 0.05;

  // --- wings (behind body): blur ghost first, then the crisp wing ---
  const spread = frame ? 0.62 : 0.5;   // buzz wider on frame 1
  const wingUp = -0.62;
  for (const sgn of [-1, 1]) {
    const wx = cx + sgn * size * 0.14;
    const wy = thoraxY - size * 0.02;
    const tipX = wx + sgn * size * spread;
    const tipY = wy + size * wingUp * 0.5;
    // ghost (motion blur)
    ctx.save();
    ctx.translate((wx + tipX) / 2, (wy + tipY) / 2);
    ctx.rotate(sgn * (0.9 + (frame ? 0.18 : 0)));
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.24, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(wingCol, frame ? 0.28 : 0.18);
    ctx.fill();
    ctx.restore();
    // crisp wing
    ctx.save();
    ctx.translate((wx + tipX) / 2, (wy + tipY) / 2);
    ctx.rotate(sgn * 0.78);
    ctx.beginPath();
    ctx.ellipse(0, 0, size * 0.22, size * 0.1, 0, 0, Math.PI * 2);
    ctx.fillStyle = rgba(wingCol, 0.62);
    ctx.fill();
    strokeInk(size * 0.02);
    // iridescent sheen washes + a couple of veins
    ctx.beginPath();
    ctx.ellipse(-size * 0.03, -size * 0.02, size * 0.1, size * 0.045, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(150,220,235,0.45)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(size * 0.06, size * 0.015, size * 0.07, size * 0.03, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(200,170,235,0.4)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(90,110,120,0.5)';
    ctx.lineWidth = size * 0.012;
    ctx.beginPath();
    ctx.moveTo(-size * 0.18, 0);
    ctx.lineTo(size * 0.18, -size * 0.01);
    ctx.moveTo(-size * 0.16, size * 0.03);
    ctx.lineTo(size * 0.16, size * 0.02);
    ctx.stroke();
    ctx.restore();
  }

  // --- legs (spindly, 3 per side): small shuffle by frame ---
  ctx.lineCap = 'round';
  ctx.lineWidth = size * 0.02;
  ctx.strokeStyle = hex(legCol);
  for (let i = 0; i < 3; i++) {
    const ly = thoraxY + size * 0.02 + i * size * 0.09;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(cx + sgn * size * 0.07, ly);
      ctx.lineTo(cx + sgn * size * 0.19, ly + size * 0.05 + kick);
      ctx.stroke();
    }
  }

  // --- abdomen (striped) ---
  ctx.beginPath();
  ctx.ellipse(cx, cy + size * 0.17, size * 0.13, size * 0.19, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(bodyCol);
  ctx.fill();
  strokeInk();
  // stripes
  ctx.strokeStyle = rgba(stripe, 0.75);
  ctx.lineWidth = size * 0.03;
  for (const dy of [0.06, 0.16, 0.26]) {
    ctx.beginPath();
    ctx.ellipse(cx, cy + size * dy, size * 0.115, size * 0.02, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- thorax (fuzzy dome) ---
  ctx.beginPath();
  ctx.ellipse(cx, thoraxY, size * 0.135, size * 0.13, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(thoraxCol);
  ctx.fill();
  strokeInk();
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.04, thoraxY - size * 0.03, size * 0.06, size * 0.055, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(lighten(thoraxCol, 0.35), 0.5);
  ctx.fill();

  // --- huge iridescent compound eyes (the face) ---
  const eyeMaroon = 0x9c3030;
  const headY = cy - size * 0.22;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.085;
    ctx.beginPath();
    ctx.ellipse(ex, headY, size * 0.11, size * 0.13, sgn * 0.12, 0, Math.PI * 2);
    ctx.fillStyle = hex(eyeMaroon);
    ctx.fill();
    strokeInk(size * 0.028);
    // iridescent hex-facet washes
    ctx.beginPath();
    ctx.ellipse(ex - sgn * size * 0.03, headY + size * 0.02, size * 0.06, size * 0.07, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(220,120,90,0.45)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(ex + sgn * size * 0.02, headY + size * 0.05, size * 0.04, size * 0.05, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(120,90,180,0.4)';
    ctx.fill();
    // big catchlight (friendly)
    ctx.beginPath();
    ctx.arc(ex - sgn * size * 0.03, headY - size * 0.04, size * 0.032, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + sgn * size * 0.03, headY + size * 0.04, size * 0.014, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();
  }

  // tiny proboscis nub between the eyes (north tip)
  ctx.beginPath();
  ctx.ellipse(cx, headY - size * 0.11, size * 0.03, size * 0.04, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(darken(bodyCol, 0.1));
  ctx.fill();
  strokeInk(size * 0.02);
});
