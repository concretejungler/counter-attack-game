/**
 * PAINTER - Centipede (id 'centipede'). Full many-legged hallway crawler.
 * A long necklace of rounded armor beads and a sawtooth fringe of legs make the
 * too-many-shoes silhouette obvious at small scale.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerCritterPainter('centipede', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.slug, PAL.roach, 0.28));
  const head = warm(darken(PAL.slug, 0.08));
  const leg = darken(base, 0.38);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32); ctx.beginPath(); ctx.arc(x + sgn * r * 0.14, y + r * 0.22, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); };

  const segs = 8;
  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.024; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < segs; i++) {
    const y = cy - size * 0.22 + i * size * 0.07;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.026;
    for (const sgn of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.1, y); ctx.lineTo(cx + sgn * size * 0.22, y + kick); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + sgn * size * 0.225, y + kick, size * 0.012, 0, Math.PI * 2); ctx.fill();
    }
  }
  for (let i = segs - 1; i >= 0; i--) {
    const y = cy - size * 0.22 + i * size * 0.07;
    ctx.beginPath(); ctx.ellipse(cx, y, size * (0.12 - i * 0.003), size * 0.055, 0, 0, Math.PI * 2);
    ctx.fillStyle = hex(i === 0 ? head : mix(base, i & 1 ? PAL.stinkbug : PAL.slug, 0.18)); ctx.fill(); stroke(size * (i === 0 ? 0.036 : 0.026));
    if (i > 0) { ctx.beginPath(); ctx.ellipse(cx - size * 0.035, y - size * 0.012, size * 0.04, size * 0.018, 0, 0, Math.PI * 2); ctx.fillStyle = rgba(lighten(base, 0.35), 0.35); ctx.fill(); }
  }
  ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.022;
  for (const sgn of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.055, cy - size * 0.27); ctx.quadraticCurveTo(cx + sgn * size * 0.14, cy - size * 0.36, cx + sgn * size * 0.1, cy - size * 0.43); ctx.stroke(); }
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.048, cy - size * 0.225, size * 0.04, sgn);
});
