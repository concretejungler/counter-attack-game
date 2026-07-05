/**
 * REFERENCE PAINTER — Sgt. Spritz (id 'sgt-spritz'). THE TOWER REFERENCE.
 * ======================================================================
 * Towers paint into the 96 box, always frame 0 (recoil/attack is a draw-time
 * transform in the entity layer — do NOT animate frames here). Every tower is
 * an appliance with a FACE and personality (plan §2, GAME-PROMPT §22): eyes +
 * brows that say who it is. Sgt. Spritz is the drill-sergeant spray bottle —
 * stern, determined, "sees every smudge as a personal insult."
 *
 * What it demonstrates for Codex tower painters:
 *  - body ≈84 of the 96 box; a clear ITEM silhouette (spray bottle) read at a
 *    glance, colored by damage type via dmgTypeColor(def.dmgType);
 *  - nozzle ORIENTATION: the sprayer/trigger points east so the tower reads as
 *    "aiming right" (the entity layer never mirrors towers);
 *  - a face with expressive BROWS (personality), not just googly eyes;
 *  - opts.tier → I/II/III shown as 1–3 gold PIPS (no text/roman-numeral glyphs);
 *  - opts.variant.includes('ascend') → golden ascension rim + sparkle;
 *  - opts.shiny is handled defensively (warm tint) though towers aren't sent it.
 */

import { registerTowerPainter } from '../../spriteCache';
import { PAL } from '../../../render/palette';
import { dmgTypeColor } from '../../fallback';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
import { ramp, celCrescent, rim, specStreak, glossDot, aoUnder, rivets, innerInk } from '../../paint';

registerTowerPainter('sgt-spritz', (ctx, size, _frame, opts) => {
  const cx = size / 2;
  const ink = size * 0.047; // ≈4.5px @ 96 — chunky
  const tier = Math.max(1, Math.min(3, opts.tier ?? 1));
  const ascended = !!opts.variant && opts.variant.includes('ascend');
  const shiny = !!opts.shiny;
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.35) : c);

  const spray = warm(dmgTypeColor('spray')); // blue soaker
  const liquid = warm(lighten(dmgTypeColor('spray'), 0.12));
  const metal = warm(PAL.metal);

  const strokeInk = (w = ink) => {
    ctx.lineWidth = w;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
  };
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

  // geometry: bottle body sits low, sprayer head up top, nozzle to the east
  const bodyX = cx - size * 0.21;
  const bodyY = size * 0.34;
  const bodyW = size * 0.42;
  const bodyH = size * 0.42;

  const r3 = ramp(spray);
  const metalR = ramp(metal);

  // --- sprayer head + trigger (drawn behind the body top) ---
  // head block (V2: cel-shaded metal + rivet + spec streak = "hard shiny")
  roundRect(cx - size * 0.13, size * 0.14, size * 0.22, size * 0.14, size * 0.05);
  ctx.fillStyle = hex(metal);
  ctx.fill();
  strokeInk(size * 0.035);
  ctx.save();
  roundRect(cx - size * 0.13, size * 0.14, size * 0.22, size * 0.14, size * 0.05);
  ctx.clip();
  ctx.fillStyle = rgba(metalR.shadow, 0.5);
  ctx.fillRect(cx - size * 0.13, size * 0.22, size * 0.22, size * 0.07);
  specStreak(ctx, cx - size * 0.04, size * 0.18, size * 0.16, size * 0.035, 0.5);
  ctx.restore();
  rivets(ctx, [{ x: cx - size * 0.09, y: size * 0.185 }], size * 0.016, innerInk(metal));
  // nozzle barrel pointing EAST
  roundRect(cx + size * 0.06, size * 0.17, size * 0.22, size * 0.08, size * 0.03);
  ctx.fillStyle = hex(darken(PAL.metal, 0.05));
  ctx.fill();
  strokeInk(size * 0.03);
  // nozzle tip
  ctx.beginPath();
  ctx.arc(cx + size * 0.29, size * 0.21, size * 0.03, 0, Math.PI * 2);
  ctx.fillStyle = hex(PAL.metalDark);
  ctx.fill();
  strokeInk(size * 0.025);
  // idle spray droplets off the tip (personality, not an attack frame)
  ctx.fillStyle = rgba(liquid, 0.8);
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(cx + size * (0.34 + i * 0.03), size * (0.2 + (i - 1) * 0.02), size * 0.012, 0, Math.PI * 2);
    ctx.fill();
  }
  // trigger handle curving down under the nozzle
  ctx.beginPath();
  ctx.moveTo(cx + size * 0.05, size * 0.28);
  ctx.quadraticCurveTo(cx + size * 0.17, size * 0.33, cx + size * 0.12, size * 0.42);
  ctx.lineWidth = size * 0.05;
  ctx.strokeStyle = hex(PAL.metalDark);
  ctx.lineCap = 'round';
  ctx.stroke();
  // collar/neck
  roundRect(cx - size * 0.1, size * 0.28, size * 0.2, size * 0.08, size * 0.02);
  ctx.fillStyle = hex(darken(PAL.metal, 0.12));
  ctx.fill();
  strokeInk(size * 0.03);

  // --- bottle body (translucent plastic + liquid fill, V2 shading) ---
  // ground the bottle where it meets the tile first
  aoUnder(ctx, cx, bodyY + bodyH + size * 0.015, bodyW * 0.5, size * 0.035, 0.2);
  roundRect(bodyX, bodyY, bodyW, bodyH, size * 0.11);
  ctx.fillStyle = rgba(spray, 0.55);
  ctx.fill();
  // liquid inside (lower ~60%) with its own tone depth
  ctx.save();
  roundRect(bodyX, bodyY, bodyW, bodyH, size * 0.11);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(bodyX, bodyY + bodyH * 0.42);
  ctx.quadraticCurveTo(cx, bodyY + bodyH * 0.36, bodyX + bodyW, bodyY + bodyH * 0.42);
  ctx.lineTo(bodyX + bodyW, bodyY + bodyH);
  ctx.lineTo(bodyX, bodyY + bodyH);
  ctx.closePath();
  ctx.fillStyle = hex(liquid);
  ctx.fill();
  // liquid depth: hue-shifted shadow pooled at the away-from-light side
  ctx.fillStyle = rgba(r3.shadow, 0.35);
  ctx.fillRect(cx + bodyW * 0.08, bodyY + bodyH * 0.42, bodyW * 0.42, bodyH * 0.6);
  // meniscus light line
  ctx.strokeStyle = rgba(r3.light, 0.7);
  ctx.lineWidth = size * 0.014;
  ctx.beginPath();
  ctx.moveTo(bodyX + bodyW * 0.06, bodyY + bodyH * 0.415);
  ctx.quadraticCurveTo(cx, bodyY + bodyH * 0.36, bodyX + bodyW * 0.94, bodyY + bodyH * 0.415);
  ctx.stroke();
  ctx.restore();
  // body outline over the top
  roundRect(bodyX, bodyY, bodyW, bodyH, size * 0.11);
  strokeInk();
  // plastic gloss: one vertical highlight + a hard gloss dot at the shoulder
  ctx.beginPath();
  ctx.ellipse(bodyX + bodyW * 0.22, bodyY + bodyH * 0.5, size * 0.03, bodyH * 0.34, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
  glossDot(ctx, bodyX + bodyW * 0.24, bodyY + bodyH * 0.14, size * 0.022, 0.75);
  // warm rim on the toward-light edge (elite/tower tier treatment)
  rim(ctx, cx, bodyY + bodyH * 0.5, bodyW * 0.52, bodyH * 0.52, r3.light, size * 0.03, 0.5);
  // cel shadow lens on the away side of the whole bottle
  celCrescent(ctx, cx, bodyY + bodyH * 0.5, bodyW * 0.52, bodyH * 0.52, r3.shadow, 0.5, 0.3);

  // --- face on the body (eyes + determined sergeant brows) ---
  const eyeY = bodyY + bodyH * 0.42;
  const eyeR = size * 0.062;
  for (const sgn of [-1, 1]) {
    const ex = cx + sgn * size * 0.1;
    ctx.beginPath();
    ctx.arc(ex, eyeY, eyeR, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.lineWidth = eyeR * 0.3;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
    // pupil looks forward/east (toward its target)
    ctx.beginPath();
    ctx.arc(ex + eyeR * 0.3, eyeY, eyeR * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = COCOA_CSS;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + eyeR * 0.05, eyeY - eyeR * 0.3, eyeR * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }
  // stern brows: inner ends LOW, outer ends HIGH = focused sergeant scowl
  ctx.strokeStyle = COCOA_CSS;
  ctx.lineWidth = size * 0.034;
  ctx.lineCap = 'round';
  for (const sgn of [-1, 1]) {
    const bx = cx + sgn * size * 0.1;
    ctx.beginPath();
    ctx.moveTo(bx + sgn * eyeR * 1.2, eyeY - eyeR * 1.55);  // outer, high
    ctx.lineTo(bx - sgn * eyeR * 0.7, eyeY - eyeR * 0.7);   // inner, low
    ctx.stroke();
  }
  // confident set mouth
  ctx.lineWidth = size * 0.022;
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.06, eyeY + size * 0.09);
  ctx.quadraticCurveTo(cx, eyeY + size * 0.12, cx + size * 0.06, eyeY + size * 0.08);
  ctx.stroke();

  // --- tier pips (1..3 gold dots) along the base ---
  const pr = size * 0.028;
  const gap = pr * 2.8;
  const px0 = cx - ((tier - 1) * gap) / 2;
  for (let i = 0; i < tier; i++) {
    ctx.beginPath();
    ctx.arc(px0 + i * gap, bodyY + bodyH + size * 0.05, pr, 0, Math.PI * 2);
    ctx.fillStyle = hex(PAL.butter);
    ctx.fill();
    ctx.lineWidth = size * 0.014;
    ctx.strokeStyle = COCOA_CSS;
    ctx.stroke();
  }

  // --- ascension golden rim + sparkle ---
  if (ascended) {
    roundRect(bodyX - ink, bodyY - size * 0.02, bodyW + ink * 2, bodyH + size * 0.04, size * 0.14);
    ctx.strokeStyle = hex(PAL.butter);
    ctx.lineWidth = size * 0.03;
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,240,170,0.95)';
    for (const [dx, dy] of [[-0.27, 0.1], [0.28, 0.3], [0.24, -0.14]] as [number, number][]) {
      const sxp = cx + size * dx;
      const syp = bodyY + bodyH * 0.5 + size * dy;
      ctx.beginPath();
      for (let k = 0; k < 4; k++) {
        const a = (k / 4) * Math.PI * 2;
        ctx.lineTo(sxp + Math.cos(a) * size * 0.03, syp + Math.sin(a) * size * 0.03);
        ctx.lineTo(sxp + Math.cos(a + 0.39) * size * 0.012, syp + Math.sin(a + 0.39) * size * 0.012);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
});
