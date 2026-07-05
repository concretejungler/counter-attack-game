/**
 * PAINTER - Stick Rick (id 'stick-rick'). Desk TAPE DISPENSER — floor glue zone.
 * Heavy weighted wedge body, a BIG roll of tape as the dominant silhouette, a
 * serrated cutter nose pointing EAST (business end), and a translucent strip of
 * tape trailing off it. Slow-talking chill face + brows; damage accent = its
 * spray/adhesive type; tier pips mark upgrades.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerTowerPainter('stick-rick', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047;
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const accent = warm(dmgTypeColor('spray'));       // blue adhesive plastic
  const bodyCol = warm(mix(dmgTypeColor('spray'), PAL.metal, 0.35));
  const tape = warm(mix(PAL.cakeSponge, PAL.wood, 0.22)); // warm tan roll

  const strokeInk = (w = ink) => { ctx.lineWidth = w; ctx.strokeStyle = COCOA_CSS; ctx.stroke(); };
  const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };
  const drawFace = (fx: number, fy: number, spread: number, eyeR: number, mood: number) => {
    for (const sgn of [-1, 1]) {
      const ex = fx + sgn * spread;
      ctx.beginPath(); ctx.arc(ex, fy, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); strokeInk(size * 0.015);
      ctx.beginPath(); ctx.arc(ex + eyeR * 0.22, fy + eyeR * 0.12, eyeR * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
      ctx.beginPath(); ctx.arc(ex - eyeR * 0.23, fy - eyeR * 0.27, eyeR * 0.18, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill();
      // laid-back droopy brows (inner high, outer low)
      ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.023;
      ctx.beginPath();
      ctx.moveTo(ex - sgn * eyeR, fy - eyeR * (0.95 + mood * 0.1));
      ctx.lineTo(ex + sgn * eyeR, fy - eyeR * (1.25 - mood * 0.05));
      ctx.stroke();
    }
    // easygoing smirk
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(fx - spread * 0.5, fy + eyeR * 1.5);
    ctx.quadraticCurveTo(fx + spread * 0.15, fy + eyeR * 1.85, fx + spread * 0.6, fy + eyeR * 1.35);
    ctx.stroke();
  };
  const drawPips = (py: number) => {
    const pr = size * 0.028;
    const gap = pr * 2.8;
    const px0 = cx - ((tier - 1) * gap) / 2;
    for (let i = 0; i < tier; i++) {
      ctx.beginPath(); ctx.arc(px0 + i * gap, py, pr, 0, Math.PI * 2);
      ctx.fillStyle = hex(PAL.butter); ctx.fill(); strokeInk(size * 0.014);
    }
  };
  const drawSparkles = (cyc: number) => {
    ctx.fillStyle = 'rgba(255,240,170,0.95)';
    for (const [dx, dy] of [[-0.32, 0.0], [0.34, 0.14], [0.22, -0.24]] as [number, number][]) {
      const sxp = cx + size * dx; const syp = cyc + size * dy;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        ctx.lineTo(sxp + Math.cos(a) * size * 0.03, syp + Math.sin(a) * size * 0.03);
        ctx.lineTo(sxp + Math.cos(a + 0.39) * size * 0.012, syp + Math.sin(a + 0.39) * size * 0.012);
      }
      ctx.closePath(); ctx.fill();
    }
  };

  // --- serrated cutter nose (EAST), drawn behind the body edge ---
  const noseX = cx + size * 0.34;
  const noseY = size * 0.6;
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.24, noseY - size * 0.07);
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    ctx.lineTo(noseX + t * size * 0.14, noseY - size * 0.07 + (i % 2 ? size * 0.03 : 0));
  }
  ctx.lineTo(cx + size * 0.24, noseY + size * 0.05);
  ctx.closePath();
  ctx.fillStyle = hex(PAL.metal); ctx.fill(); strokeInk(size * 0.022);

  // --- heavy weighted wedge body (tall at back-west, sloping to nose-east) ---
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.34, size * 0.77);
  ctx.lineTo(cx - size * 0.34, size * 0.52);
  ctx.quadraticCurveTo(cx - size * 0.34, size * 0.43, cx - size * 0.25, size * 0.43);
  ctx.lineTo(cx + size * 0.08, size * 0.5);
  ctx.quadraticCurveTo(cx + size * 0.32, size * 0.54, cx + size * 0.36, size * 0.66);
  ctx.lineTo(cx + size * 0.28, size * 0.77);
  ctx.closePath();
  ctx.fillStyle = hex(bodyCol); ctx.fill(); strokeInk();
  // front lip highlight
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.3, size * 0.55);
  ctx.lineTo(cx + size * 0.02, size * 0.6);
  ctx.strokeStyle = rgba(lighten(bodyCol, 0.35), 0.6); ctx.lineWidth = size * 0.02; ctx.stroke();

  // --- BIG tape roll on top (the dominant silhouette) ---
  const rollX = cx - size * 0.04, rollY = size * 0.37, rollR = size * 0.25;
  ctx.beginPath(); ctx.arc(rollX, rollY, rollR, 0, Math.PI * 2);
  ctx.fillStyle = hex(tape); ctx.fill(); strokeInk();
  // wound-tape layer rings
  ctx.strokeStyle = rgba(darken(tape, 0.22), 0.7); ctx.lineWidth = size * 0.012;
  for (const rr of [rollR * 0.78, rollR * 0.58]) { ctx.beginPath(); ctx.arc(rollX, rollY, rr, 0, Math.PI * 2); ctx.stroke(); }
  // roll sheen
  ctx.beginPath(); ctx.ellipse(rollX - rollR * 0.36, rollY - rollR * 0.38, rollR * 0.3, rollR * 0.2, -0.5, 0, Math.PI * 2);
  ctx.fillStyle = rgba(lighten(tape, 0.4), 0.5); ctx.fill();
  // hub hole
  ctx.beginPath(); ctx.arc(rollX, rollY, rollR * 0.4, 0, Math.PI * 2);
  ctx.fillStyle = hex(darken(bodyCol, 0.16)); ctx.fill(); strokeInk(size * 0.03);
  ctx.beginPath(); ctx.arc(rollX, rollY, rollR * 0.18, 0, Math.PI * 2);
  ctx.fillStyle = hex(lighten(accent, 0.1)); ctx.fill(); strokeInk(size * 0.016);

  // --- translucent tape strip trailing off the roll over the cutter (east) ---
  ctx.beginPath();
  ctx.moveTo(rollX + rollR * 0.85, rollY + size * 0.02);
  ctx.quadraticCurveTo(cx + size * 0.26, size * 0.5, cx + size * 0.34, noseY - size * 0.02);
  ctx.lineTo(cx + size * 0.36, noseY + size * 0.02);
  ctx.quadraticCurveTo(cx + size * 0.26, size * 0.54, rollX + rollR * 0.7, rollY + size * 0.08);
  ctx.closePath();
  ctx.fillStyle = rgba(lighten(tape, 0.35), 0.6); ctx.fill();
  ctx.strokeStyle = rgba(darken(tape, 0.2), 0.6); ctx.lineWidth = size * 0.012; ctx.stroke();

  // --- face on the body front + tier pips ---
  drawFace(cx - size * 0.12, size * 0.64, size * 0.08, size * 0.036, 0.1);
  drawPips(size * 0.88);

  if (ascended) {
    roundRect(cx - size * 0.42, size * 0.14, size * 0.86, size * 0.68, size * 0.14);
    ctx.strokeStyle = hex(PAL.butter); ctx.lineWidth = size * 0.03; ctx.stroke();
    drawSparkles(size * 0.46);
  }
});
