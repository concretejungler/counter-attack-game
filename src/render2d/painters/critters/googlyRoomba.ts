/**
 * PAINTER — Googly Roomba (id 'googly-roomba'). Arachnophobia-mode substitute.
 * A friendly round robot-vacuum disc: chunky rubber bumper ring, a bin-lid seam,
 * a status LED, two BIG googly eyes with loose offset pupils, and tiny caster
 * wheels peeking under the south edge. ZERO spider traits — it stands in for
 * spider species when arachnophobia mode is on (a wiring agent maps them here),
 * and must also read at the 128 boss box (Grandma Longlegs substitution).
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('googly-roomba', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.02;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const boss = opts.variant === 'boss';
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const shell = warm(lighten(PAL.metal, 0.16)); // friendly light disc, not menacing black
  const bumper = warm(darken(PAL.metal, 0.16));
  const wobble = frame ? 1 : -1;
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  const R = size * 0.42;

  // --- tiny caster wheels peeking under the south edge (behind the disc) ---
  ctx.fillStyle = hex(PAL.metalDark);
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(cx + sgn * size * 0.2, cy + R * 0.92, size * 0.06, size * 0.036, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(PAL.metalDark); ctx.fill(); stroke(size * 0.02);
  }

  // --- main vacuum disc ---
  ctx.beginPath(); ctx.ellipse(cx, cy, R, R * 0.96, 0, 0, Math.PI * 2);
  ctx.fillStyle = hex(shell); ctx.fill(); stroke();
  // rubber bumper ring (darker band just inside the rim)
  ctx.beginPath(); ctx.ellipse(cx, cy, R * 0.9, R * 0.86, 0, 0, Math.PI * 2);
  ctx.strokeStyle = hex(bumper); ctx.lineWidth = size * 0.052; ctx.stroke();
  // top-left sheen
  ctx.beginPath(); ctx.ellipse(cx - R * 0.34, cy - R * 0.36, R * 0.42, R * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = rgba(lighten(shell, 0.45), 0.45); ctx.fill();
  // bin-lid seam sweeping across the lower disc
  ctx.strokeStyle = rgba(darken(shell, 0.32), 0.6); ctx.lineWidth = size * 0.022;
  ctx.beginPath(); ctx.arc(cx, cy - R * 0.15, R * 0.72, 0.18 * Math.PI, 0.82 * Math.PI); ctx.stroke();

  // --- status LED near the front (north) rim ---
  if (boss) { // boss gets a raised sensor puck so the big disc isn't empty
    ctx.beginPath(); ctx.arc(cx, cy - R * 0.68, size * 0.075, 0, Math.PI * 2);
    ctx.fillStyle = hex(warm(mix(PAL.metal, PAL.mint, 0.5))); ctx.fill(); stroke(size * 0.024);
    ctx.beginPath(); ctx.arc(cx, cy - R * 0.68, size * 0.03, 0, Math.PI * 2);
    ctx.fillStyle = hex(warm(PAL.cherry)); ctx.fill(); stroke(size * 0.014);
  } else {
    ctx.beginPath(); ctx.arc(cx, cy - R * 0.72, size * 0.032, 0, Math.PI * 2);
    ctx.fillStyle = hex(warm(PAL.cherry)); ctx.fill(); stroke(size * 0.016);
  }

  // --- BIG googly eyes with loose offset pupils (the personality) ---
  const eyeR = size * 0.135;
  const eyeY = cy - R * 0.28;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.17;
    ctx.beginPath(); ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.028);
    // pupil sits low + offset (googly), each eye a touch different = comedy
    const px = ex + sgn * eyeR * 0.26 + wobble * eyeR * 0.1;
    const py = eyeY + eyeR * 0.44;
    ctx.beginPath(); ctx.arc(px, py, eyeR * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(px - eyeR * 0.22, py - eyeR * 0.22, eyeR * 0.19, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  }

  // --- friendly smile ---
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.026; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(cx, cy + R * 0.02, size * 0.1, 0.12 * Math.PI, 0.88 * Math.PI); ctx.stroke();
});
