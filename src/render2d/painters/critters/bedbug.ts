/**
 * PAINTER - Bedbug (id 'bedbug'). Flat stealthy apple-seed crawler.
 * The whole read is a squat ribbed oval, with tiny side legs and oversized
 * eyes peeking from the north edge.
 */
import { registerCritterPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, celCrescent, belly as bellyGrad } from '../../paint';

registerCritterPainter('bedbug', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2 + size * 0.04;
  const ink = size * 0.047;
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);
  const base = warm(mix(PAL.roach, PAL.cherry, 0.28));
  const r3 = ramp(base);
  // pronotum shield: a step toward the hue-shifted shadow (hard-cel sub-form)
  const shield = warm(mix(base, r3.shadow, 0.32));
  const leg = mix(r3.shadow, 0x000000, 0.1);
  const stroke = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const eye = (x: number, y: number, r: number, sgn: number) => {
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); stroke(r * 0.32);
    ctx.beginPath(); ctx.arc(x + sgn * r * 0.16, y + r * 0.24, r * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
    ctx.beginPath(); ctx.arc(x - r * 0.25, y - r * 0.25, r * 0.2, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
  };

  ctx.lineCap = 'round'; ctx.lineWidth = size * 0.032; ctx.strokeStyle = hex(leg); ctx.fillStyle = hex(leg);
  for (let i = 0; i < 4; i++) {
    const ly = cy - size * 0.11 + i * size * 0.08;
    const kick = (((i + frame) & 1) ? 1 : -1) * size * 0.03;
    for (const sgn of [-1, 1]) {
      const footX = cx + sgn * size * 0.245;
      const footY = ly + kick;
      ctx.beginPath(); ctx.moveTo(cx + sgn * size * 0.14, ly); ctx.lineTo(cx + sgn * size * 0.2, footY); ctx.lineTo(footX, footY + size * 0.02); ctx.stroke();
      ctx.beginPath(); ctx.arc(footX, footY + size * 0.02, size * 0.015, 0, Math.PI * 2); ctx.fill();
    }
  }
  // V2: the squat oval is the whole sprite — belly gradient for volume, cel lens
  // on the away side, then the pronotum shield as a hard-cel sub-form.
  ctx.beginPath(); ctx.ellipse(cx, cy, size * 0.2, size * 0.29, 0, 0, Math.PI * 2); ctx.fillStyle = hex(base); ctx.fill(); stroke();
  bellyGrad(ctx, cx, cy, size * 0.19, size * 0.28, r3, 0.5);
  celCrescent(ctx, cx, cy, size * 0.2, size * 0.29, r3.shadow, 0.45, 0.5);
  ctx.beginPath(); ctx.ellipse(cx, cy - size * 0.1, size * 0.17, size * 0.11, 0, Math.PI, Math.PI * 2); ctx.lineTo(cx + size * 0.17, cy - size * 0.05); ctx.quadraticCurveTo(cx, cy + size * 0.01, cx - size * 0.17, cy - size * 0.05); ctx.closePath(); ctx.fillStyle = hex(shield); ctx.fill(); stroke(size * 0.025);
  ctx.strokeStyle = rgba(r3.shadow, 0.85); ctx.lineWidth = size * 0.022;
  for (const dy of [-0.02, 0.06, 0.14, 0.22]) { ctx.beginPath(); ctx.ellipse(cx, cy + size * dy, size * (0.16 - Math.max(0, dy) * 0.16), size * 0.018, 0, 0, Math.PI * 2); ctx.stroke(); }
  for (const sgn of [-1, 1]) eye(cx + sgn * size * 0.065, cy - size * 0.14, size * 0.046, sgn);
});
