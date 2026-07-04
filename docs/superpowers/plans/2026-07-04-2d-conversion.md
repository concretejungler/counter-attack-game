# 2D CONVERSION — Master Plan (2026-07-04)

> User directive: the 3D view doesn't work well on phones. Convert COUNTER ATTACK! into a 2D
> top-down game. Planning by the orchestrator (Fable); ALL implementation by Opus 4.8 subagents
> and Codex CLI workers. This document is the single source of truth every work packet points at.

## 0. Non-negotiables (stamped on every agent)

1. **NEVER edit `src/sim/` or `src/content/`.** The deterministic sim and the balance of all 40
   levels depend on it. A vitest source-scan enforces purity; 351 tests must stay green after
   every packet (`npx vitest run`).
2. TypeScript strict. `npx tsc --noEmit` clean after every packet.
3. **No new dependencies. No asset files.** Everything procedural (Canvas 2D draw calls, offscreen
   canvas sprite caches). This keeps deploys legally clean and the bundle tiny.
4. Zero console errors (`npm run smoke`).
5. File ownership is law (see §6). Never touch a file another packet owns.
6. The existing 3D renderer keeps compiling and working (debug fallback `?renderer=3d`), but the
   GAME is 2D. Anything that cannot translate to 2D is logged in `CUTS.md` with a reason.
7. UI (DOM dock/sheet/quick-spells/screens) is renderer-independent and stays as-is.

## 1. Why this works

`src/sim/` is a fixed-timestep 30 Hz simulation with no rendering concepts. The renderer is a pure
view: it reads `sim.state`, interpolates, and forwards input picks to `game.ts`. Replacing
`src/render/` (three.js) with `src/render2d/` (Canvas 2D) changes zero gameplay.

## 2. The 2D view — design spec

**Style: "kid's picture-book top-down."** Chunky dark-cocoa outlines (3px logical at 64px sprite
scale), flat bright fills from the existing per-world palettes (`src/render/palette.ts`
THEME_PALETTES is the color source of truth — READ it, import from it if convenient, do not copy
hex strings by hand). Soft round drop shadows. Squash-and-stretch applied at draw time via
transforms. Deaths = cartoon poof (expanding dust ring + tiny halo float-up).

**Projection.** Pure top-down affine: `screenX = (worldX - camX) * scale + viewW/2`, same for
worldZ → screenY. No rotation, no perspective. Elevation (floor → chair → counter → shelf) is
communicated by:
- each raised surface drawn as a platform "island": rounded-rect slab, rim highlight on top/left,
  4-6px offset drop shadow, slightly lighter fill than the floor;
- draw order: floor → surfaces sorted by height → shadows → ground entities (sorted by worldZ) →
  elevated entities → fliers → VFX → hand cursor;
- fliers: sprite at full opacity + small blob shadow offset by their altitude; gentle bob.
- climbing critters at a surface edge: scramble squash animation (scaleY pulse) during climb ticks.

**Camera.** Default = fit whole board with 24px margin (recompute on resize/orientation). Pinch
zoom 1.0×–2.5× of fit scale; two-finger drag pans; single-finger stays gameplay (tap/flick/sweep,
exactly the gesture semantics `game.ts` already has). No orbit. `fitBoard()` re-centers.

**Sprites.** All painted by code into offscreen canvases once, cached, then `drawImage`-stamped.
- Logical boxes: critters 64×64 (body ≈ 44px), bosses 128×128, towers 96×96, props vary.
  Cache at `dprCap()` resolution.
- Critters: 2-frame walk bob (cache 2 frames), hit-flash (white composite at draw), status tints
  (soaked=blue tint, burnt=char specks, frozen=ice-cube overlay rect, sticky=amber blobs,
  confused=orbiting stars, feared=sweat drop, shrunk=0.6 scale, buttered=shine streak).
  Shiny = golden sparkle particles at draw time + warm tint.
- Towers: 1 idle frame + recoil/attack transform at draw time; tier badges (I/II/III pips) and
  ascension = golden rim. Faces mandatory — every tower has eyes/personality (reuse the icon
  spirit from `src/ui/icons.ts`, but these are board sprites, not UI icons).
- Fallback painter (Phase 1): rounded blob in the def's palette color + googly eyes + name initial.
  EVERY species/tower renders from day one via fallback; art packets replace fallbacks.

**Perf budget.** ≤4 ms render CPU per frame at 300 live critters, measured via the perf probe
(§5 P2-I) on desktop Chrome with 4× CPU throttle (phone proxy). Techniques: sprite caches, single
pass full redraw, no per-frame allocations in the hot loop (reuse arrays), batched path draws for
chevrons/trails, `ctx.setTransform` not save/restore stacks in the entity loop.

## 3. Architecture

### 3.1 GameView interface (the seam)

`src/render/view.ts` (created by P1-A) exports `interface GameView` — derived from ACTUAL usage of
`GameRenderer` + `CameraRig` + `pathView` in `game.ts` (do not guess; grep every `this.renderer.`
and `renderer.rig.` call site). Expected shape (P1-A finalizes exact signatures):

- lifecycle: `loadLevel(level, content)`, `resize()`, `frame(dtMs, sim, alpha, uiState)`, `dispose()`
- picking: `pickSurfacePoint(ndcX, ndcY)`, `pickClutterTile(ndcX, ndcY)`, `pickTower/pickCritter/
  pickBalloon/pickSunflower` (whatever game.ts actually uses)
- camera intents: `panBy(dx,dy)`, `zoomBy(factor)` / `pinchZoom(...)`, `fitBoard()`,
  `noteCameraMovedManually()`, `isTopDownActive()`, `toggleTopDown()` (2D: fit vs. zoomed state),
  `poseForDemo(name|params)` (demo scenes), `shake/punch/bossIntro` juice hooks
- world↔screen: `worldToScreen(x,y,z)` (UI needs it for inspect-panel anchoring, damage floaters)
- features: `setPathPolylines(...)`, crumb/vfx/egg hooks, `snapPhoto()`
- `readonly kind: '2d' | '3d'`

The 3D `GameRenderer` gets a thin adapter so `game.ts` depends ONLY on `GameView`. Renderer choice:
`?renderer=3d` URL param forces 3D; default is 2D once P2-I lands (until then default stays 3D).

### 3.2 render2d module layout & extension points (P1-B creates ALL of these)

```
src/render2d/
  renderer2d.ts      GameView implementation: canvas mgmt, camera, frame loop, draw order
  camera2d.ts        fit/pan/zoom math, world<->screen
  spriteCache.ts     get(kind,id,variant,frame) -> HTMLCanvasElement; registry of painters
  fallback.ts        blob-with-eyes fallback painters (critter/tower/prop)
  board.ts           floor + surface platforms + clutter blocks + cake + entries/exits
  entities.ts        critter/tower/projectile/crumb/pet stamping, interpolation, statuses
  painters/
    critters/index.ts   (owned by Codex critter batch; pre-created empty with instructions)
    towers/index.ts     (owned by Codex tower batch; pre-created empty)
    rooms/index.ts      (owned by Room Painter; pre-created empty)
  vfx2d.ts           (owned by VFX packet; pre-created stub with event hook API wired)
  hand2d.ts          (owned by Hand packet; pre-created stub)
```

Painters self-register: `registerCritterPainter('worker-ant', paintFn)`. `renderer2d.ts` imports
the three `painters/*/index.ts` barrels + stubs ONCE in Phase 1 — later packets only add files
inside their owned folder and lines to THEIR OWN index. No shared-file edits after Phase 1.

Painter signature (locked): `type SpritePainter = (ctx: CanvasRenderingContext2D, size: number,
frame: number, opts: { variant?: string; tier?: number; shiny?: boolean }) => void` — draw
centered in a `size`×`size` box, transparent background, outlines included.

## 4. Verification commands (every packet runs its own gate before reporting)

`npx tsc --noEmit` · `npx vitest run` (351) · `npm run build` · `npm run smoke` ·
`node tools/shot.mjs <scenes>` / `node tools/shot-2d.mjs <scenes>` (added in P2-I) — and READ the
screenshots you produce; fix obvious breakage before reporting.

## 5. Phases & work packets

**P1-A "Interface Surgeon" (Opus).** Extract `GameView` from real usage; adapt `game.ts` to the
interface; 3D adapter; `?renderer=3d|2d` switch (default 3d for now); everything green. Owns:
`src/game.ts`, `src/render/**`, `src/main.ts`. Must not create anything in `src/render2d/`.

**P1-B "2D Core" (Opus).** Build `src/render2d/` per §3.2 against the §3.1 contract STRUCTURALLY
(no imports from src/render/ — P1-A owns it; minor signature drift reconciled in P2-I). Fallback
painters for all species/towers, board/platforms/clutter/cake, camera, interpolation, picking,
path chevrons, crumbs, basic poofs. Include a self-test harness page path (`?renderer=2d&demo=hud`
works once integrated; until then a standalone `tools/dev2d.html` driven by `npm run dev` is fine).
Owns: `src/render2d/**`, `tools/dev2d.html`.

**P2-I "Integrator" (Opus).** Wire renderer2d as the default `GameView`; reconcile signatures;
adapt demo scenes; 2D photo snapshot; `tools/shot-2d.mjs` + mobile variant + perf probe scene
(300 critters, prints ms/frame); update smoke if needed. Game fully playable in 2D w/ fallback art.
Owns: `src/game.ts`, `src/main.ts`, `src/render2d/renderer2d.ts` (reconciliation), `tools/**`.

**P3 art fan-out (parallel; no shared files):**
- **P3-P "Pattern Author" (Opus):** 4 reference painters (worker-ant, housefly, sgt-spritz boss:
  crumb-king) + painter style guide comments. Owns: 4 files in painters/ + a `painters/GUIDE.md`.
- **P3-C "Critter batch" (Codex):** all remaining critters + bosses + variants. Gates: every id in
  `CONTENT.critters` has a registered painter; each renders non-blank at 64px with ≥3 distinct
  fill colors and an outline pass (mechanical checker script provided in packet); tsc clean.
- **P3-T "Tower batch" (Codex):** all towers + jarred uniques + tier badges. Same gate style.
- **P3-V "VFX & Juice" (Opus):** projectiles, beams, chain arcs, cones, auras, traps, spell VFX
  (slipper sweep, MOOOOM hand, timestop wash), scent/swarm vignette hooks, wave banners on-board
  bits. Owns `vfx2d.ts` + new `vfx/` folder if needed.
- **P3-H "Hand & Friends" (Opus):** the Hand cursor (idle/point/flick slingshot band/squash press/
  sweep trail/carry grab), pets (cat/dog/goldfish bowl), eggs (balloon, campfire, towels, ui-fly
  shadow), gnome-etc props. Owns `hand2d.ts` + `props2d.ts`.
- **P3-R "Room Painter" (Opus):** 9 themed rooms + secret theme: floor treatments, furniture
  slabs, windows/doors/vents/drains as readable 2D markers, day/night tint per palette. Owns
  `painters/rooms/**`.

**P4 "QA sweep" (Opus critics + Opus fixers).** Full scene sweep desktop+mobile via shot tools,
bestiary contact sheets, perf probe numbers; findings ranked; fixers resolve; orchestrator does
final judgment, updates BUILDLOG/RESUME/CUTS, commits per milestone, deploys via
`node tools/deploy-pages.mjs` + master push (see RESUME §6 gotchas).

## 6. File-ownership matrix (conflict law)

| Files | Owner |
|---|---|
| src/game.ts, src/main.ts, src/render/** | P1-A, then P2-I |
| src/render2d/** (except owned subpaths below) | P1-B, then P2-I |
| src/render2d/painters/critters/** | P3-P (4 refs) then P3-C |
| src/render2d/painters/towers/** | P3-T |
| src/render2d/painters/rooms/** | P3-R |
| src/render2d/vfx2d.ts, vfx/** | P3-V |
| src/render2d/hand2d.ts, props2d.ts | P3-H |
| tools/** | P2-I |
| BUILDLOG.md, RESUME.md, CUTS.md, this plan | orchestrator only |

## 7. Status log (orchestrator updates)

- 2026-07-04: plan written; P1-A + P1-B spawned.
