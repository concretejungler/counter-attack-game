# COUNTER ATTACK! Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (inline execution chosen — single coherent codebase, user directed full autonomous build of all phases, no questions). Steps use checkbox (`- [ ]`) syntax; progress is ALSO mirrored in `BUILDLOG.md` (authoritative after context compaction).

**Goal:** Build the complete game specified in `GAME-PROMPT.md` — all 5 phases — evaluating and improving continuously.

**Architecture:** Deterministic fixed-timestep simulation (pure TypeScript, zero three.js imports, seeded RNG, command-in/event-out) with a separate Three.js render layer that interpolates, a DOM/CSS diegetic UI overlay, and a WebAudio procedural synth for all sound. All assets procedural (canvas textures, primitive-composed models, synthesized audio). Content is data-driven (`content/` defs).

**Tech Stack:** TypeScript + Three.js + Vite. Vitest for sim tests. Playwright (chromium) for screenshot evaluation + smoke tests — I read the screenshots and critique the visuals each milestone. No runtime dependencies beyond three.

---

## Non-negotiable contracts (lock these — later tasks depend on exact names)

- Sim tick rate **30 Hz** (`SIM_DT = 1/30`). Render interpolates with alpha.
- `Sim` API: `new Sim(level: LevelDef, opts: SimOptions)` · `sim.command(cmd: SimCommand)` · `sim.tick(): SimEvent[]` · `sim.state: SimState` (read-only for render/UI).
- RNG: `mulberry32(seed)` in `core/rng.ts`; **no `Math.random`/`Date.now` inside `src/sim/` or `src/content/`** (enforced by a vitest source-scan test).
- Coordinates: levels are **surface grids** (1 tile = 1 world unit). `TileRef = {s,c,r}` (surface index, col, row). Surfaces have `origin: Vec3` + `cols/rows` + height implied by origin.y. `ClimbDef` edges connect surfaces. Flow field = BFS over the unified tile graph toward the cake tile; fliers ignore it (steer directly, drop onto cake surface).
- Damage types: `'spray'|'swat'|'zap'|'heat'|'cold'|'gas'|'sonic'|'light'`. Every critter: one `resist`, one `weak` (×0.5 / ×2).
- Statuses: `burnt, soaked (2× zap), frozen, sticky, stunned, confused, feared, buttered, shrunk, crowned`.
- Crumbs are sim entities with positions; the Scent meter (0–100) = f(uncollected crumb value). Thresholds 25/50/75/100 per GAME-PROMPT §2.1.
- Clutter: tetromino cells on a surface; HP; towers mount on clutter tops or `buildSpots`. Full blocks legal — blocked critters chew nearest wall.
- Debug hooks for tooling: `window.__game` exposes `{ loadLevel(id), state(), grantCrumbs(n), callWave(), setSpeed(n), screenshotReady: boolean }`.
- Naming: game/app shell class `Game` (`src/game.ts`), renderer `GameRenderer` (`src/render/renderer.ts`), UI orchestrator `UI` (`src/ui/ui.ts`), audio `AudioMan` (`src/audio/audio.ts`).

## File map (create as listed; one responsibility each)

```
package.json tsconfig.json vite.config.ts index.html src/style.css
src/main.ts                  boot: Game + debug hooks
src/game.ts                  state machine: title→levelSelect→playing→recap/victory
src/core/rng.ts              mulberry32 + helpers (pick, shuffle, range)
src/core/mathUtil.ts         lerp, clamp, dist2, ease fns
src/sim/types.ts             ALL shared types (LevelDef, TowerDef, CritterDef, SimEvent, SimCommand...)
src/sim/sim.ts               Sim class: tick orchestration, command queue, event emit
src/sim/grid.ts              surfaces, tile graph, flow field, edge detection (for falls)
src/sim/critters.ts          spawn/AI/movement/status/traits (playDead, thief, dodge...)
src/sim/towers.ts            placement, targeting, firing, tiers/branches, mounts
src/sim/projectiles.ts       arcs, beams, cones; hit resolution
src/sim/crumbs.ts            crumb entities, sweeping, scent meter + thresholds
src/sim/cake.ts              slices, bites, thief steal/recover
src/sim/clutter.ts           tetromino placement, chew damage, collapse
src/sim/waves.ts             wave scheduling, early-call bonus, forecast data
src/sim/spells.ts            mana (Static Charge), casts
src/sim/hand.ts              flick/squash/sweep/carry/highfive commands + cooldowns
src/sim/mutations.ts         mutation cards, application, stacking      (P1: draft at wave 5)
src/sim/director.ts          adaptive composition (P2)
src/sim/grudges.ts           escape tracking, crowned elites (P2)
src/content/towers.ts        TOWER_DEFS (8 in P1 → 24 in P2)
src/content/critters.ts      CRITTER_DEFS (12 in P1 → 30 in P2)
src/content/spells.ts        SPELL_DEFS
src/content/clutterShapes.ts tetromino shape lib
src/content/mutations.ts     MUTATION_DEFS
src/content/levels/*.ts      kitchen1..kitchen5 + index registry
src/render/renderer.ts       scene, sync(simState, alpha, events), pools
src/render/camera.ts         orbit rig w/ constraints + zoom punches
src/render/room.ts           per-theme room environment builder (kitchen first)
src/render/models/towerModels.ts   procedural tower builders (Group factories w/ animate fn)
src/render/models/critterModels.ts instanced species meshes + canvas face textures
src/render/models/props.ts   cake, clutter pieces, dustpan, jars, decor
src/render/vfx.ts            particle pools (poof, halo, crumbs sparkle, splash, fire)
src/render/handView.ts       3D hand cursor following mouse, verb animations
src/render/post.ts           vignette + tilt-shift-ish blur + color grade pass
src/ui/ui.ts                 screen router, HUD lifecycle
src/ui/screens/title.ts      fridge-door menu
src/ui/screens/levelSelect.ts house map
src/ui/screens/recap.ts      death recap + victory stars
src/ui/screens/settings.ts   thermostat panel
src/ui/hud.ts                corkboard build bar, cake slices, scent nose, egg timer, spells, speed, forecast
src/ui/icons.ts              inline SVG icon factory (hand-authored paths)
src/audio/audio.ts           context mgmt, master chain, settings
src/audio/sfx.ts             synthesized one-shots (name-keyed graph builders)
src/audio/music.ts           step-sequencer, adaptive layers, boss themes
src/meta/save.ts             versioned localStorage + export/import codes
src/meta/progress.ts         stars, unlocks, stats, Critterdex counts
tests/*.test.ts              see Testing
tools/smoke.mjs              boot → no console errors → canvas renders
tools/shot.mjs               drive states → screenshot to shots/*.png (I review these)
tools/balance.mjs            headless bot playthroughs → win/loss/bites report
BUILDLOG.md                  living status — UPDATE AFTER EVERY TASK
CLAUDE.md                    how to run/test/conventions
```

## Testing strategy

Vitest on sim only (render/UI evaluated via Playwright screenshots + smoke). Required suites: `rng` determinism · `grid` flowfield reaches cake, reroutes on clutter, chew-when-blocked · `economy` sweep banking + scent thresholds · `combat` resist/weak math + statuses · `cake` bite/steal/recover · `waves` schedule + early-call · `clutter` placement legality + collapse · `sim.determinism` (two sims, same seed+commands ⇒ identical state hash) · `sim.noWallclock` (source scan: no Math.random/Date.now under src/sim, src/content) · `balance` scripted par-solutions per level (win on Houseguest ≤3 bites; empty defense loses by wave 3).

## Evaluation gates (the "evaluate as you build" directive)

After each milestone: (1) `npm test` green; (2) `node tools/smoke.mjs` zero console errors; (3) `node tools/shot.mjs` → **Read the PNGs, critique composition/readability/charm, fix what's weak**; (4) `node tools/balance.mjs` difficulty within targets; (5) update `BUILDLOG.md` with findings + improvements made. Performance gate at P1 end: 300-critter stress sim ticks < 8ms avg on this machine (headless), draw calls < 300.

---

## Phase 1 — Vertical Slice (Kitchen) — tasks

- [ ] **T1 Scaffold:** git init, package.json (three, typescript, vite, vitest, playwright devDeps), tsconfig (strict), vite.config, index.html, style.css shell, main.ts hello-cube boot, CLAUDE.md, BUILDLOG.md, .gitignore. Verify: `npm run dev` serves; commit.
- [ ] **T2 Core sim foundation:** rng + tests; types.ts full contracts; grid.ts surfaces/flowfield + tests; Sim skeleton w/ tick/command/events + determinism test. Commit.
- [ ] **T3 Critters & movement:** spawn, flow-following w/ separation, climb edges, falls/edge logic, statuses, traits (playDead, thief, dodgeFirst, chewer, evolve-on-crumbs). Tests. Commit.
- [ ] **T4 Towers & combat:** placement on clutter/spots, targeting modes, tiers, branches, projectiles/beams/cones/auras, resist matrix. Tests. Commit.
- [ ] **T5 Economy & cake & clutter:** crumb drops, sweeping, scent thresholds (incl. between-wave scouts + Swarm timer), cake bites/steal/recover, tetromino clutter w/ chew + collapse, wave system + early call + forecast, mutation draft at wave 5/boss. Tests. Commit.
- [ ] **T6 Hand verbs (sim):** flick (impulse + fall off edges), squash (size-gated, cooldown), sweep (drag collection), carry (tower offline + relocate), high-five (morale buff). Tests. Commit.
- [ ] **T7 Renderer foundation:** scene/lighting (warm key + window shafts + dust motes), orbit camera, kitchen room builder, post pass (vignette/tilt-shift/grade), cake model, clutter models. Smoke + first screenshots → critique. Commit.
- [ ] **T8 Critter & tower visuals:** instanced species meshes w/ canvas faces + wobble anim; 8 tower models w/ idle/attack/celebrate anims; projectile + vfx pools (poof+halo deaths, splashes, toast arcs, butter shimmer). Screenshots → critique. Commit.
- [ ] **T9 Hand view & interactions:** 3D hand cursor, raycast picking, flick gesture (drag-slingshot), squash press, sweep trail, carry lift, hover feedback. Screenshot + feel pass. Commit.
- [ ] **T10 HUD & screens:** corkboard build bar (polaroid cards), cake slice chip, scent nose meter, egg timer, spell shelf, speed/pause, forecast banner, tower inspect/upgrade panel, mutation draft modal, title (fridge), level select (house map), settings (thermostat), death recap (w/ leak sources + scent graph), victory stars. Screenshots all screens → critique. Commit.
- [ ] **T11 Audio:** synth engine, ~20 sfx (place, shoot variants, splat, poof, bite-crunch, sweep, jar-pop reserve, chime, ui clicks), adaptive 3-layer kitchen-orchestra track + Crumb King theme, heartbeat-at-1-slice. Commit.
- [ ] **T12 Phase 1 content:** 8 towers (Spritz, Smacky, Toastsalot, Big Blow, Stick Rick, Gnomeo, Coldfather, Bandolero) tuned; 12 critters (Worker/Soldier/Bullet Ant, Housefly, Fruit-Fly Cloud, Roach, Mouse Thief, Slug, Snail, Moth, Dust Bunny, Stink Bug); Crumb King boss (crumb-shed + heal-from-crumbs mechanic); levels kitchen 1–5 w/ gimmicks + 3-star challenges; spells Lemon Smite + Forbidden Slipper + MOOOOM!; sticky-note tutorial; difficulty Houseguest/Homeowner/Landlord. Commit.
- [ ] **T13 Balance & evaluation pass:** balance.mjs par solutions all 5 levels; tune until targets hit; perf stress test; full screenshot sweep; fix the 5 ugliest/weakest things found; Death Recap accuracy check; BUILDLOG findings. Commit. **Gate: the slice must be genuinely fun & hard.**

## Phase 2 — The Full House (outline; detail tasks in BUILDLOG when reached)

Worlds 2–9 rooms+levels (35 more levels, per GAME-PROMPT §14 list) · remaining 16 towers + ascensions · remaining 18 critters + variants · bosses 2–9 incl. EXTERMINATOR alliance finale · pets (cat/dog/goldfish) · jarring + shinies + Critterdex · grudges · Director AI · random events (14) · Oh-Crap scenarios (10) · all 8 spells · House Rules + Condemned difficulty + Iron House · cake flavors.

## Phase 3 — The Hooks

Infestation roguelike (node map, tower-card deck, 40 relics, curses, Weird Closet events, Garage Sale haggle) · Endless w/ seeded weekly · Daily Chores mutators · Junk Drawer meta tree · achievements (150) · photo mode + GIF export.

## Phase 4 — The Soul

All 18 easter eggs (§20) · seasonal (clock-based) · secret levels (Crumb Dimension, Dev Room, Impossible Room) · audio polish (boss leitmotifs, mickey-mousing) · accessibility suite (colorblind patterns, arachnophobia mode, shake/flash sliders, remap, UI scale) · performance hardening pass.

## Phase 5 — The Block Party

Deterministic lockstep over WebRTC (manual-paste signaling + STUN, join-by-link where possible) · Food Fight versus + send economy · Block Party co-op · King of the Crawl asymmetric · Pass the Remote couch mode · sandbox room editor + share codes. Honest limitations documented in README.

## Definition of done (per GAME-PROMPT §28)

All systems implemented or logged in CUTS.md with reason · 60fps@300 critters · zero placeholder anything · one command dev (`npm run dev`), one command deploy bundle (`npm run build`) · README with deploy instructions (itch.io/Vercel/Pages).
