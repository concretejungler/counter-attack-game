# MOBILE-STORE REVAMP — menus, level select, graphics detail (2026-07-05)

> User directive: the game will eventually live on Android/iOS — everything must view/handle like a
> store-quality mobile title NOW (still a web game; no native port yet). Menus + level select get
> rebuilt on researched TD patterns (Opus/Codex implement). ALL graphics get a hands-on detail
> revamp by the orchestrator (Fable) personally — explicit user instruction.
> Research inputs: TD menu/level-select pattern library + TD art-technique library (agent reports,
> 2026-07-05). Non-negotiables from `2026-07-04-2d-conversion.md` §0 still apply verbatim
> (no sim/content edits, 351 tests, no deps, no assets, strict painter gates, TS strict).

## A. UI revamp — locked design

### A1. Level select = THE CRAYON HOUSE CUTAWAY (replaces the dollhouse grid)
One tall scrollable cross-section of the house ("front wall removed"), drawn crayon-style in
DOM/CSS(+SVG). Layout (bottom→top): sewer annex (below) → basement → [kitchen | living] ground
floor → [bathroom | bedroom] → attic; garage annex left of ground floor, backyard annex right.
- A **winding crumb-trail path** (SVG) threads each room's furniture, level nodes strung along it;
  stairs/vents/laundry-chute connect rooms (diegetic gateways).
- **Node states:** locked = grey crayon scribble + padlock; current = pulsing (scale 1.0↔1.08) +
  bobbing "you are here" crayon arrow — the eye must land on it in <1s; done = full color + 0-3
  gold stars ON the node. Boss nodes = the room's exit door/vent, 1.5-2× size, ornate.
- **Secret levels** = hidden nodes (behind fridge / floorboards) that fade in when unlocked;
  keep the "???" mystery styling.
- **Tap node → bottom-sheet level card** (over dimmed map, map stays as anchor): level name +
  icon, star row, best result, pet picker moved INTO this sheet (declutters the map), big PLAY
  bottom-center in thumb reach. No full-page navigation.
- **Camera:** vertical scroll with snap-to-room; a "whole house" zoom-out button = fast travel
  (replaces any separate world screen). On boss clear: scripted camera pull-back → travel along
  the path through the gateway to the next room (~1.5s eased) with the gate visibly unlocking.
- **Unlock juice:** new node pops in with shine; the crumb path DRAWS ITSELF into the new room
  (SVG stroke-dashoffset animation) as the camera follows.
- Rooms get their palette from THEME_PALETTES; each room shows 3-5 crayon furniture silhouettes
  (data-driven table, see Codex packet) so the map reads as that room at a glance.

### A2. Title screen = LIVING DIORAMA (replaces the flat fridge menu)
- Shallow parallax kitchen scene: 3-4 layers (back wall+window / counter+toaster+fridge /
  foreground crumbs) drifting on slow sine loops; a critter periodically peeks from behind the
  toaster and ducks; drifting dust/crumb particles. Layers may be small canvases painted by the
  existing render2d painters (reuse, don't redraw art).
- One dominant crayon **"DEFEND THE CAKE!" CTA** (≥200×64, magnet/crayon-circled style, ~2× the
  weight of anything else) in the bottom reachable band; secondary destinations (Infestation,
  Journal, Junk Drawer, Daily Chore, How to Play) as smaller equal tiles; Settings as a
  light-switch icon top corner.
- **Persistent status ribbon** (corkboard strip, top, safe-area aware): total ⭐ stars, 🧁 BP,
  streak — shared across all menu screens.
- Keep: fridge-poetry magnets egg + OPEN SESAME note (relocate into the scene tastefully),
  save-slot fiction, kid-voice casing.

### A3. Global juice pass (all menu screens)
Button spring (press 0.94 → release overshoot 1.05, 150-250ms, shadow tightens) on EVERY button ·
star-burst (8-16 radial particles + elastic star pop + chime) on star earn · counts tick up with
collectibles flying to the ribbon on bezier arcs · screen transitions are slides/wipes (250-500ms;
crayon-scribble wipe is on-brand), never hard cuts · ambient idle life on menus (motes, blinks) ·
a WebAudio cue on every interaction (tick/press/unlock arpeggio/whoosh — synth recipes exist in
src/audio). Sub-screens (journal/junk drawer/settings/recaps) get the spring+transition+safe-area
pass and the ribbon, NOT structural rebuilds.

### A4. Ergonomics law (every screen)
`env(safe-area-inset-*)` padding + 16px side / 32px bottom margins; primary CTAs bottom-center/
corners (thumb green zones), utilities top corners; targets ≥44px with ≥8px gaps; type scale:
body 14-16px, buttons 18-22px, headers 22-28px via clamp(); test at 844×390. Landscape phone is
the design target; desktop inherits (centered, max-width shells).

## B. Graphics detail revamp — Fable hands-on (personally, per user directive) — LOCKED

Research-locked style law (the "one light" doctrine): richness = consistent light model + value
staging + weighted outlines, NOT more marks. Any mark <1.5 display px aliases to mud; ≤6-8 marks
per sprite.

**B1. `src/render2d/paint.ts` toolkit (Fable authors):**
- Global light: upper-left ({-0.6,-0.8}), warm key. Everything derives from it.
- `ramp(base)` → {shadow, base, light}: shadow = hue rotated ~25° toward blue-violet, s×~1.05,
  l×~0.62 (NEVER plain darker); light = hue +18° toward warm, s×0.85, l×1.18. Needs rgb↔hsl.
- `celShade(ctx, drawShape, base)`: clip-to-shape + lower-right shadow-shape fill, leaving a base
  sliver at the turning edge before the outline (the pro tell).
- `belly(ctx, x,y,rx,ry, base)`: radial gradient, light point offset ~30% up-left — ONE per sprite
  on the dominant round mass; hard cel shapes for sub-forms.
- `rim(ctx, path/arc, tone)`: bright top-left edge band — elites/towers/bosses only (≥34px reads).
- `innerLine(base)`: interior lines = that region's fill darkened ~50% + hue-shifted (thin);
  exterior silhouette stays chunky COCOA (brand line). Delete non-essential interior lines.
- Textures (clip-to-shape, light-aligned): `woodGrain` (2-4 curved multiply strokes + 1 light
  streak), `specStreak` (one bright diagonal bar, screen/lighter), `rivets`, `glossDot`,
  `fabricTicks` (3-6 hem dashes), `furEdge` (scalloped silhouette, NOT interior hatching), `aoUnder`
  (soft multiply ellipse), `jit(seed,i)` seeded jitter.
- Accent rule: one complementary high-chroma accent at the face/read-target per sprite.

**B2. Detail tiers:** fodder (24-28px on-screen) = weighted outline + 2-tone cel + accent, nothing
more · elites/towers = + belly gradient, rim, 3-6 texture marks, second accent · bosses (128) =
full 3-tone, per-material spec/streaks, rim, glow halo, trim props. Density variation: one focal
detail region, calm resting zones.

**B3. Board/environment pass:** board stays desaturated/mid-value (units own contrast extremes);
baked AO (multiply radial) under every prop + along wall/platform bases; path emphasis = lighter
warmer track with AO-darkened edges; board texture frequency ≠ sprite frequency (big soft board
marks). Boss/special units get an additive glow halo behind them.

**B4. Motion polish (in entities.ts, light touch — it's perf-tuned):** per-instance phase-offset
idle bob, area-preserving squash (walk 2-4%, hit 10-20%), spawn overshoot pop (0→1.15→1), contact
shadow scales/fades with bob height, tower 1-2% breathing. Only where not already present.

**B5. Execution batches (Fable, contact-sheet + `check-painters --strict` between each):**
B0 paint.ts + GUIDE v2 + 3 upgraded references → B1-B3 critters+bosses (~15/batch) → B4 towers →
B5 rooms/board AO+path + entities motion + boss halos.

## C. Work packets
- **U1 (Opus): House-map level select** — rebuild `buildLevelSelect` (+ its CSS + SVG path/nodes +
  camera + bottom-sheet + unlock/travel animations). Owns: `src/ui/screens.ts` (level-select region),
  `src/style.css` (new house-map block), may add `src/ui/houseMap.ts`. Consumes the Codex data table.
- **C1 (Codex): `src/ui/houseMapData.ts`** — pure data: per-room map geometry (room rects in scene
  coords, path waypoints, node positions per level id from content, furniture-silhouette specs,
  gateway positions/types). Spec'd precisely by U1's needs; mechanical.
- **U2 (Opus, after U1): Title diorama + ribbon + global juice + sub-screen polish.** Owns
  screens.ts (title region), ui.ts (transitions/ribbon mount), style.css (title/juice blocks),
  audio hook wiring.
- **F (Fable): section B.** Runs in parallel with U1/U2 (disjoint files: render2d painters).
- **QA (Opus) → fixes → gates → deploy** (RESUME §6 recipe; deployment sha rules).

## D. File ownership this initiative
| Files | Owner |
|---|---|
| src/render2d/** (painters, paint.ts, rooms, board detail) | Fable ONLY |
| src/ui/screens.ts, src/ui/houseMap.ts, style.css (map block) | U1 then U2 |
| src/ui/houseMapData.ts | C1 (Codex) |
| src/ui/ui.ts, src/audio hooks | U2 |
| BUILDLOG/RESUME/CUTS/plans | Fable |
