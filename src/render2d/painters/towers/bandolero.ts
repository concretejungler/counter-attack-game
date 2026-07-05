/**
 * PAINTER - Bandolero (id 'bandolero'). RUBBER-BAND BALLISTA sniper.
 * Crossed wooden limbs form an X, a drawn elastic band pulls back into a V (pocket
 * WEST, fork open EAST = business end east, like Sgt. Spritz), all mounted on a
 * peg-board junk-drawer body. The crossed-limb X + taut band ARE the silhouette.
 * Narrow-eyed drifter face; damage accent = its swat type; tier pips mark upgrades.
 */
import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';

registerTowerPainter('bandolero', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047;
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);
  const accent = warm(dmgTypeColor('swat'));
  const wood = warm(PAL.wood);
  const band = warm(darken(dmgTypeColor('swat'), 0.14)); // taut red rubber band

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
  const drawFace = (fx: number, fy: number, spread: number, eyeR: number) => {
    for (const sgn of [-1, 1]) {
      const ex = fx + sgn * spread;
      ctx.beginPath(); ctx.arc(ex, fy, eyeR, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); strokeInk(size * 0.015);
      ctx.beginPath(); ctx.arc(ex + eyeR * 0.32, fy + eyeR * 0.1, eyeR * 0.5, 0, Math.PI * 2); ctx.fillStyle = COCOA_CSS; ctx.fill();
      // heavy squint lids (narrow-eyed drifter): a low brow that cuts across the eye
      ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.03;
      ctx.beginPath();
      ctx.moveTo(ex - sgn * eyeR * 1.2, fy - eyeR * 0.55);
      ctx.lineTo(ex + sgn * eyeR * 1.0, fy - eyeR * 0.15);
      ctx.stroke();
    }
    // flat, wordless set mouth
    ctx.strokeStyle = COCOA_CSS; ctx.lineWidth = size * 0.02;
    ctx.beginPath();
    ctx.moveTo(fx - spread * 0.5, fy + eyeR * 1.7);
    ctx.lineTo(fx + spread * 0.5, fy + eyeR * 1.6);
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

  // --- peg-board junk-drawer body (behind the mechanism) ---
  const bx = cx - size * 0.32, by = size * 0.56, bw = size * 0.64, bh = size * 0.24;
  roundRect(bx, by, bw, bh, size * 0.05);
  ctx.fillStyle = hex(wood); ctx.fill(); strokeInk();
  ctx.fillStyle = rgba(darken(wood, 0.4), 0.5);
  for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) {
    ctx.beginPath();
    ctx.arc(bx + size * 0.08 + c * size * 0.12, by + size * 0.08 + r * size * 0.09, size * 0.017, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- crossed wooden limbs (the X) ---
  const tipNE: [number, number] = [cx + size * 0.31, size * 0.24];
  const tipSE: [number, number] = [cx + size * 0.31, size * 0.56];
  const tipNW: [number, number] = [cx - 0.30 * size, size * 0.24];
  const tipSW: [number, number] = [cx - 0.30 * size, size * 0.56];
  ctx.lineCap = 'round';
  for (const [a, b] of [[tipSW, tipNE], [tipNW, tipSE]] as [number, number][][]) {
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]);
    ctx.strokeStyle = hex(darken(wood, 0.06)); ctx.lineWidth = size * 0.075; ctx.stroke();
    ctx.strokeStyle = rgba(lighten(wood, 0.3), 0.55); ctx.lineWidth = size * 0.02; ctx.stroke();
  }
  // limb-tip notch caps (where the band hooks) on the east fork
  for (const [tx, ty] of [tipNE, tipSE]) {
    ctx.beginPath(); ctx.arc(tx, ty, size * 0.032, 0, Math.PI * 2);
    ctx.fillStyle = hex(darken(wood, 0.2)); ctx.fill(); strokeInk(size * 0.02);
  }

  // --- drawn elastic band: a V pulled back to a pocket WEST of the pivot ---
  const pocket: [number, number] = [cx - size * 0.03, size * 0.4];
  ctx.strokeStyle = hex(band); ctx.lineWidth = size * 0.03; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(tipNE[0], tipNE[1]); ctx.lineTo(pocket[0], pocket[1]); ctx.lineTo(tipSE[0], tipSE[1]);
  ctx.stroke();

  // --- central pivot bolt ---
  ctx.beginPath(); ctx.arc(cx + size * 0.005, size * 0.4, size * 0.045, 0, Math.PI * 2);
  ctx.fillStyle = hex(PAL.metalDark); ctx.fill(); strokeInk(size * 0.022);

  // --- projectile pellet nocked in the pocket ---
  ctx.beginPath(); ctx.arc(pocket[0], pocket[1], size * 0.045, 0, Math.PI * 2);
  ctx.fillStyle = hex(lighten(accent, 0.12)); ctx.fill(); strokeInk(size * 0.02);

  // --- face on the peg-board + tier pips ---
  drawFace(cx - size * 0.02, by + bh * 0.5, size * 0.075, size * 0.032);
  drawPips(size * 0.9);

  if (ascended) {
    roundRect(cx - size * 0.4, size * 0.16, size * 0.82, size * 0.68, size * 0.13);
    ctx.strokeStyle = hex(PAL.butter); ctx.lineWidth = size * 0.03; ctx.stroke();
    drawSparkles(size * 0.44);
  }
});
