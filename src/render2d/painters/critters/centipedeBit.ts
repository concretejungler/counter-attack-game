/**
 * PAINTER - Centipede Bit (id 'centipede-bit'). Tiny loose wiggle.
 * Narratively a tiny critter, but the entity layer shrinks it hard (small def
 * size), so the SPRITE must fill its box to survive gameplay zoom: three FAT
 * beads spanning ~0.81 of the box, a bold cocoa outline, frantic legs and big
 * oversized eyes read it as the escaped piece of the larger crawler.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, celCrescent, belly as bellyGrad } from '../../paint';

registerCritterPainter('centipede-bit', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.02;
  const ink = size * 0.052; // bolder than baseline so the small on-board size still reads
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.slug, PAL.stinkbug, 0.25));
  const r3 = ramp(base);
  const leg = mix(r3.shadow, 0x000000, 0.1);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.34); ctx.beginPath(); ctx.arc(x + sgn * r * 0.16, y + r * 0.24, r * 0.52, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.28, y - r * 0.28, r * 0.24, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  // --- frantic legs (behind the beads): chunky, tripod gait swaps per frame ---
  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.05; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 3; i++) {
    const y = cy - size * 0.13 + i * size * 0.19;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.05;
    for (const sgn of [-1, 1]) {
      const fx = cx + sgn * size * 0.31;
      const fy = y + size * 0.05 + kick;
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.14, y); ctx.lineTo(cx + sgn * size * 0.24, y + size * 0.03); ctx.lineTo(fx, fy); ctx.stroke();
      ctx.beginPath(); ctx.arc(fx, fy, size * 0.026, 0, Math.PI * 2); ctx.fill();
    }
  }

  // --- three FAT beads (tail -> mid -> head), overlapping = segmentation ---
  // V2: each bead is a sphere via celCrescent; ONE belly on the widest (mid) bead.
  const beads: [number, number, number, number, number][] = [
    [cx, cy + size * 0.24, size * 0.185, size * 0.175, 0.18],   // tail
    [cx, cy + size * 0.02, size * 0.205, size * 0.19, 0.0],     // mid (widest)
    [cx, cy - size * 0.22, size * 0.195, size * 0.185, -0.12],  // head
  ];
  beads.forEach(([bx, by, rx, ry, tint], i) => {
    const beadCol = mix(base, i === 2 ? PAL.slug : PAL.stinkbug, Math.abs(tint) + 0.14);
    ctx.beginPath(); ctx.ellipse(bx, by, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(beadCol);
    ctx.fill(); stroke();
    if (i === 1) bellyGrad(ctx, bx, by, rx, ry, ramp(beadCol), 0.5);
    celCrescent(ctx, bx, by, rx, ry, ramp(beadCol).shadow, 0.45, 0.55);
  });

  // --- antennae off the head ---
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.026;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(cx + sgn * size * 0.07, cy - size * 0.36);
    ctx.quadraticCurveTo(cx + sgn * size * 0.17, cy - size * 0.48, cx + sgn * size * 0.12, cy - size * 0.54);
    ctx.stroke();
    ctx.beginPath(); ctx.arc(cx + sgn * size * 0.12, cy - size * 0.55, size * 0.028, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
  }

  // --- big oversized eyes + little smile on the head bead ---
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.08, cy - size * 0.23, size * 0.078, sgn);
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.022;
  ctx.beginPath(); ctx.arc(cx, cy - size * 0.13, size * 0.055, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
});
