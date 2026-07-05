/**
 * TITLE SCREEN v3 — "the composed stage" (plan: 2026-07-05-steam-pc-pivot §Addendum).
 *
 * Pure geometry for the fixed-aspect title stage. The whole title is ONE 1600×900 design-space
 * STAGE that screens.ts scales uniformly (contain) and centers; every prop and every menu element
 * is placed in these STAGE coordinates (top-left origin px for props; center-anchored for MENU) so
 * the composition is byte-for-byte identical at every resolution/aspect — only the scale changes.
 *
 * NO three.js, NO sim, NO randomness — a static layout table consumed by screens.ts.
 *
 * MERGE NOTE (TS-B owns this file's merge): the TS-D/Codex draft landed and set the shape below —
 * `STAGE`, `PropSpec[]` with those exact `kind` strings, and the flat `MENU` object. TS-B kept that
 * shape verbatim and re-tuned the NUMBERS during screenshot review to (a) lift the window clear of
 * the fridge top, (b) slide the cake left so the DEFEND-THE-CAKE! CTA no longer covers it, and
 * (c) raise `ctaH` 92→104 so the CTA stays ≥44px effective touch size at the tightest mobile scale
 * (844×390 → ×0.433 → 45px). See screens.ts for how each `kind` is painted.
 *
 * Occlusion (paint order = z): wall 0 · window 1 · sun/daylightBeam 2 · counter 3 · fridge/
 * critterPeek/lightSwitch 4 · magnetBoard/cake/toaster 5. The critter (z4) tucks behind the toaster
 * (z5) so only its head pokes above the toaster's top edge; the counter (z3) sits behind the props
 * that rest on it (crayon-flat style — bases read as touching the surface line).
 */

export const STAGE = { w: 1600, h: 900 };

export interface PropSpec {
  kind: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
}

export const PROPS: PropSpec[] = [
  // Kitchen back wall — the warm-beige canvas everything sits on.
  { kind: 'wall', x: 0, y: 0, w: 1600, h: 900, z: 0 },
  // Window in the upper-LEFT third; lifted clear of the fridge top (y-end 240 < fridge top 244).
  { kind: 'window', x: 150, y: 58, w: 300, h: 182, z: 1 },
  // Sun disc, nestled in the window's upper area.
  { kind: 'sun', x: 360, y: 104, w: 54, h: 54, z: 2 },
  // Soft daylight shaft falling from the window toward the cake; the counter (z3) clips its foot.
  { kind: 'daylightBeam', x: 220, y: 190, w: 640, h: 440, z: 2 },
  // The counter/cabinet face runs the FULL stage width across the bottom third (top surface y≈620).
  { kind: 'counter', x: 0, y: 620, w: 1600, h: 280, z: 3 },
  // Tall fridge silhouette, far left; its base meets the counter surface line.
  { kind: 'fridge', x: 60, y: 244, w: 224, h: 388, z: 4 },
  // Peek-a-boo critter tucked BEHIND the toaster (z4 < toaster z5) — only its head pokes up.
  { kind: 'critterPeek', x: 1352, y: 466, w: 84, h: 84, z: 4 },
  // Light-switch = the Settings control, top-right in-stage.
  { kind: 'lightSwitch', x: 1486, y: 70, w: 58, h: 86, z: 4 },
  // The poetry-magnet board — a SMALL prop on the fridge door; tapping it opens the mini-game.
  { kind: 'magnetBoard', x: 92, y: 366, w: 176, h: 152, z: 5 },
  // The birthday CAKE — center-left on the counter, candles lit. It IS the stakes; sits left of the CTA.
  { kind: 'cake', x: 402, y: 508, w: 150, h: 126, z: 5 },
  // Toaster on the right end of the counter (hosts the peeking critter).
  { kind: 'toaster', x: 1330, y: 502, w: 200, h: 132, z: 5 },
];

export const MENU: {
  colX: number;
  wordmarkY: number;
  subtitleY: number;
  ctaY: number;
  ctaW: number;
  ctaH: number;
  tilesY: number;
  tileW: number;
  tileH: number;
  tileGap: number;
  footY: number;
} = {
  colX: 800, // horizontal center of the whole menu column
  wordmarkY: 142,
  subtitleY: 258, // clears the two-line wordmark's descenders (was 238 → overlapped "ATTACK!")
  ctaY: 636, // dominant CTA in the lower thumb-band, beside the cake
  ctaW: 460,
  ctaH: 104, // ×0.433 mobile scale → 45px ≥ 44px touch minimum (was 92 = 39.8px)
  tilesY: 762,
  tileW: 190,
  tileH: 110,
  tileGap: 16,
  footY: 876,
};
