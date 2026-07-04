# Sprite Painter Style Guide (P3-P) — read this before writing ANY painter

This is the law for the ~80 hand-painted sprites in `src/render2d/painters/`.
The four **reference painters** lock the pattern — copy them exactly, swap the
geometry and colors, do not reinvent:

| Reference | File | Archetype it locks |
|---|---|---|
| Worker Ant | `critters/workerAnt.ts` | baseline swarmer (64 box) |
| Housefly | `critters/housefly.ts` | flier (wings, no self-shadow) |
| Crumb King | `critters/crumbKing.ts` | boss (128 box) |
| Sgt. Spritz | `towers/sgtSpritz.ts` | tower (96 box, face+tiers+ascend) |

**The style, in one line:** kid's picture-book, top-down — chunky dark-cocoa
outlines, flat bright fills from the world palette, big friendly eyes on
everything alive, drawn with plain Canvas 2D paths. No text, no emoji, no images.

---

## 1. The painter file template (copy this shape verbatim)

```ts
/**
 * PAINTER — <Display Name> (id '<content-id>'). <one-line archetype>.
 * <2–3 lines: what's distinctive about this critter/tower's silhouette.>
 */
import { registerCritterPainter } from '../../spriteCache'; // or registerTowerPainter
import { PAL } from '../../../render/palette';
import { COCOA_CSS, hex, rgba, mix, lighten, darken } from '../../colors';
// towers colored by damage type also: import { dmgTypeColor } from '../../fallback';

registerCritterPainter('<content-id>', (ctx, size, frame, opts) => {
  const cx = size / 2;
  const cy = size / 2;              // critters: nudge +size*0.02..0.04 if top-heavy
  const ink = size * 0.047;         // ≈3px @ 64 — the cocoa outline width
  const shiny = !!opts.shiny;       // critters only; towers ignore
  const warm = (c: number) => (shiny ? mix(c, PAL.butter, 0.4) : c);

  // ... draw BACK-TO-FRONT, centered on (cx,cy), transparent background ...
});
```

Then add ONE import line to your barrel (`critters/index.ts` or
`towers/index.ts`) — e.g. `import './myCritter';`. Never edit anything else.

**Registration is the export.** The `register*Painter(...)` call at module load
IS the file's job; there is no `export`. Later registrations win, so a real
painter overrides the day-one fallback automatically.

The painter runs **once** per `(id, frame, variant, tier, shiny, size)` then the
result is cached and stamped with `drawImage`. So it is **not** in the hot loop —
prefer clarity over cleverness. Gradients/clip/save-restore are fine here.

---

## 2. Outline rule (non-negotiable)

- Color: **always `COCOA_CSS`** (0x33211a). Never pure black.
- Width: **`const ink = size * 0.047`** (≈3px logical at the 64 box; scales to
  ~4.5px @96 tower, ~6px @128 boss). Use `ink` for the main silhouette; thinner
  lines (`size*0.02..0.03`) for interior details (legs, brows, veins).
- `lineJoin`/`lineCap` are already `'round'` (set by spriteCache). Keep them round.
- Pattern: **fill then stroke each shape, back to front.** Overlapping segment
  seams read as body segmentation — that's desirable for bugs.

---

## 3. Palette sourcing rule (pull, don't invent hex)

`src/render/palette.ts` `PAL` is the color source of truth. **Import from it.**

- **Critters:** use the species' `PAL` entry when one exists (`PAL.antWorker`,
  `PAL.flyBody`/`PAL.flyWing`, `PAL.roach`, `PAL.slug`, `PAL.moth`,
  `PAL.dustBunny`, `PAL.stinkbug`, `PAL.mouse`, `PAL.snailShell`,
  `PAL.crumbGold`, `PAL.butter` for crowns/gold…). No entry? Match the sibling
  fallback color in `fallback.ts` `KNOWN_CRITTER`, or derive with
  `hsl(...)`/`mix(...)` in the sickly green/brown range — never a raw arbitrary hex.
- **Towers:** color the appliance body by its material (`PAL.metal`,
  `PAL.metalDark`, whites, plastics) and the **accent by damage type** via
  `dmgTypeColor(def.dmgType)` (spray=blue, swat=cherry, heat=flame, cold=ice,
  gas=goo-green, sonic=violet, light=butter, zap=cyan). This keeps a shot's color
  reading true to what the tower does.
- Derive shades with the helpers in `colors.ts`: `lighten(c, t)`, `darken(c, t)`,
  `mix(a, b, t)`, `hex(n)`, `rgba(n, a)`. Precompute a `warm()` for shiny.

---

## 4. Composition & proportions

- Draw **centered** in the `size`×`size` box on a **transparent** background.
- **Critters:** top-down, **head pointing NORTH**, **bilaterally symmetric**. The
  entity layer flips X via `faceSign` to face travel direction, so symmetry is
  free — do not draw a left/right-facing profile. Body ≈ **44px of the 64 box**
  (~0.68·size tall). Leave ~10% margin for antennae/wings.
- **Bosses** (`opts.variant === 'boss'`, 128 box): FILL it — body ~**100 of 128**
  (~0.8·size). Spend the extra pixels on detail (texture speckle, throne/servant
  hints, a real face with brows). Bosses are "imposing but cute," never gory.
- **Towers** (96 box): the ITEM silhouette ≈ **84 of 96** (~0.84·size), readable
  at a glance. Towers are viewed front-ish (not top-down) and are **never
  mirrored** — commit to a fixed nozzle/spout orientation (point it EAST so it
  reads as "aiming right").
- **Do NOT bake a ground/drop shadow** into the sprite — the entity layer draws
  the blob shadow in a separate pass (and fliers get an altitude-offset shadow).

---

## 5. The 2-frame walk convention (critters)

Cache 2 frames; `frame` is `0` or `1`. Between them, move only the **legs**
(and wings for fliers) — the body stays put (bob is added at stamp time):

- **Legs:** tripod shuffle. Alternate each leg row's forward/back by
  `((i + frame) & 1)` and shift the foot along the north–south (travel) axis by
  ~`size*0.05`. Stubby, chunky legs (`lineWidth ≈ size*0.042`) with a little
  rounded foot dot — see workerAnt.
- **Fliers:** wings get a crisp shape + a fainter "ghost" ellipse that widens on
  `frame === 1` to fake the buzz (housefly). Fliers draw **no shadow**.
- **Bosses:** may use both frames for subtle idle life (crown tilt, pupil shift,
  servant legs) — keep it small.
- **Towers:** ignore `frame` (always drawn at frame 0). Recoil/attack is a
  draw-time transform in the entity layer — do not animate it in the painter.

---

## 6. Eyes & face rules

- **Every living thing has eyes.** Big, friendly, white sclera + cocoa pupil +
  a white catchlight. Reuse the workerAnt eye recipe. Pupil can look gently
  forward/down for warmth.
- **Fliers'** compound eyes ARE the personality — go big, add iridescent washes
  and a catchlight (housefly).
- **Towers have personality BROWS** (GAME-PROMPT §22 Pixar-lamp anthropomorphism),
  not just googly eyes. Match the character: a stern sergeant scowls (inner brow
  ends LOW, outer HIGH); a cheerful tower has raised round brows. Add a matching
  mouth (confident set line, smirk, grin).
- **Bosses** get heavy brows + a signature mouth (Crumb King's crumb-tooth grin),
  optional rosy cheeks to stay "cute" while imposing.

---

## 7. variant / tier / shiny contract (what spriteCache passes you)

`opts: { variant?: string; tier?: number; shiny?: boolean }`

- **Critters** receive `variant: 'boss' | ''` and `shiny: boolean`.
  - `variant === 'boss'`: only matters for shared painters; a dedicated boss
    painter (its own file) can assume the 128 box.
  - `shiny`: bake a **warm-gold tint** into the fills (`mix(color, PAL.butter, ~0.4)`).
    Do **not** draw sparkles or a gold rim — the entity layer adds those at stamp
    time. Shiny is only a tint here.
- **Towers** receive `variant` (contains `'ascend'` when a tier-3 branch is
  chosen) and `tier: 1..3`.
  - `tier`: draw **1–3 gold PIPS** (dots) — clamp `Math.max(1, Math.min(3, tier))`.
    NEVER draw the letters "I/II/III" (no text glyphs).
  - `variant.includes('ascend')`: draw a **golden ascension rim** around the
    silhouette + a couple of sparkle stars.
  - Towers are not sent `shiny`; handle it defensively (a `warm()` tint) so the
    pattern stays uniform, but don't rely on it.

---

## 8. DO / DON'T

**DO**
- Import colors from `PAL`/`colors.ts`; keep the cocoa outline consistent.
- Draw back-to-front; centered; transparent bg; readable silhouette at 24–40px.
- Keep each painter file **self-contained** (define tiny local path helpers like
  `roundRect`/`ellipse` inside the painter — copy them from the references).
- Be deterministic: if you need scatter (crumb speckle), use a fixed array or a
  seeded helper like `const rnd = (i) => { const x = Math.sin(i*127.1+311.7)*43758.5453; return x - Math.floor(x); };`.

**DON'T**
- ❌ `Math.random`, `Date.now`, or any time source — the painter must be a pure
  function of `(size, frame, opts)` or the cache corrupts. (`Math.sin` etc. are fine.)
- ❌ No text, no `fillText`, no emoji, no `drawImage` of external images/fonts.
- ❌ No module-level mutable state; no allocations meant to persist between calls.
- ❌ No baked ground shadow, no baked shiny sparkles/rim, no baked hit-flash or
  status tints — the entity layer owns all of those at stamp time.
- ❌ No imports from `src/render/` except `palette.ts` (read-only). No three.js.
- ❌ Never edit `renderer2d.ts`, `spriteCache.ts`, `fallback.ts`, or any file
  outside your painter file + your one barrel import line.

---

## 9. Verify before you report

Every painter must render **non-blank at its native box** with **≥3 distinct
fill colors** and a visible **cocoa outline pass**, and must still read as itself
at gameplay zoom (~24–40px critters, ~44px towers, ~96px bosses). `npx tsc
--noEmit` must be clean. Eyeball it on both a light and a dark background — the
outline has to hold on both.
