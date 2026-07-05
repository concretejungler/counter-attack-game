/**
 * PAINTER - Tick (id 'tick'). Tiny round latcher.
 * A squat bead body with oversized grabby front legs and pin-dot face keeps the
 * tiny gameplay sprite readable as a clinging pest.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, celCrescent, belly as bellyGrad } from '../../paint';

registerCritterPainter('tick', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.05;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (col: number) => (shiny ? mix(col, PAL.butter, 0.4) : col);
  const body = warm(mix(PAL.roach, PAL.cherry, 0.18));
  const r3 = ramp(body);
  const head = warm(lighten(body, 0.05));
  const leg = mix(r3.shadow, 0x000000, 0.1);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };

  ctx.lineCap = 'round'; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 4; i++) {
    const y = cy - size * 0.16 + i * size * 0.09;
    const reach = i === 0 ? size * 0.34 : size * 0.22;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.025;
    ctx.lineWidth = i === 0 ? size * 0.044 : size * 0.032;
    for (const sgn of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.12, y); ctx.quadraticCurveTo(cx + sgn * reach, y - size * 0.02, cx + sgn * reach, y + size * 0.08 + kick); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + sgn * reach, y + size * 0.08 + kick, size * 0.018, 0, Math.PI * 2); ctx.fill();
    }
  }

  // V2: belly + cel give the engorged bead its dome; head bead a small cel.
  ctx.beginPath(); ctx.ellipse(cx, cy + size * 0.06, size * 0.2, size * 0.24, 0, 0, Math.PI * 2); ctx.fillStyle = hex(body); ctx.fill(); stroke();
  bellyGrad(ctx, cx, cy + size * 0.06, size * 0.19, size * 0.23, r3, 0.55);
  celCrescent(ctx, cx, cy + size * 0.06, size * 0.2, size * 0.24, r3.shadow, 0.45, 0.5);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.18, size * 0.12, size * 0.1, 0, 0, Math.PI * 2); ctx.fillStyle = hex(head); ctx.fill(); stroke();
  celCrescent(ctx, cx, cy - size * 0.18, size * 0.12, size * 0.1, r3.shadow, 0.42, 0.5);
  for (const sgn of [-1, 1]) { const ex = cx + sgn * size * 0.045; const ey = cy - size * 0.18; ctx.beginPath(); ctx.arc(ex, ey, size * 0.036, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(size * 0.011); ctx.beginPath(); ctx.arc(ex + sgn * size * 0.004, ey + size * 0.008, size * 0.017, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill(); ctx.beginPath(); ctx.arc(ex - size * 0.008, ey - size * 0.008, size * 0.007, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); }
});
