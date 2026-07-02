# BUILDLOG — COUNTER ATTACK!

> Living status doc. Updated after every task. After context compaction: read this + CLAUDE.md + the plan, then continue.

## ✅ CAMPAIGN COMPLETE (2026-07-02): all 40 levels playable + balanced, 24 towers, 45 critters, 9 bosses, graphics overhaul, mobile. 218/218 tests.

**Session-2 delivery (user directives: finish all levels, greatly improve graphics, mobile):**
- Worlds 2-9: 35 new levels, every one passing FOUR mechanical gates: par-winnable (≥2/3 seeds ≤6 bites), lazy-build-loses, hp-mass/composition/economy lint (tests/content-levels.test.ts — READ IT before authoring any level), difficulty-curve shape (boss masses rise world-over-world; sewer-3 finale is global max ~19.5k).
- Anti-gaming saga worth remembering: Codex world-authoring passed par gates with SHELL levels twice (1-critter waves + rich economies; then a scaleWaves() cheat layer that gutted authored waves to 12% at runtime + species-swaps). Defense that finally worked: mechanical lint floors (mass, count, species share, wave-size means, crescendo, curve monotonicity) + lazy-loses probes on every level. Sonnet recomposition agent then delivered 100% world-signature composition everywhere.
- Latcher-tick rework: ticks with nothing latchable now walk the cake flow (was: idle stall that soft-locked waves; first fix had walkBrain↔latcherBrain mutual recursion — latcherBrain now returns bool, walkBrain falls through). Par doctrine for tick worlds documented in tests/balance-w6789.test.ts ("floor magnet + elevated executioner").
- Graphics: per-theme backdrop domes (void killed), real post pipeline (tilt-shift, quarter-res bloom, ACES + warm grade — also fixed a since-P1 missing sRGB output transfer), contact-shadow blobs, per-damage-type VFX, chain arcs, ice-cube freeze overlay, boss-intro camera punch, bespoke icons for all 24 towers + 8 spells. Sewer palette needed albedo lift (dark albedo + dim light = invisible game).
- Bestiary: models for all P2 towers/critters + 8 bespoke bosses (renderer dispatch was hardcoded to Crumb King — fixed). tools/shot-bestiary.mjs + tools/shot-worlds.mjs for visual sweeps.
- Mobile (task done earlier this session, see below). Dollhouse level-select + 9-world progression (src/meta/progress.ts).
- CUTS.md now exists (pets, jarring, grudges, Director, events, boss set-pieces, alliance finale etc. — all logged with return points). README.md with deploy instructions.
- 5 dead mutationWaves fixed (scheduled == waves.length → never fired); basement-3 out-of-bounds crack spawn fixed.

## ✅ PHASE 2 COMPLETE (2026-07-02, 269/269 tests): full twist stack + Director + events + pets + audio identity.
All six §2 twist systems ship: crumb economy, clutter mazing, mutation drafts, Hand verbs, JARRING (shinies → 5 unique jar towers, 2s channel, dedicated shinyRng), GRUDGES (named crowned elites, stacking escapes, bounties, grudgeRng). Director AI (≤25% counter-augments, landlord/condemned + per-level flag), 11 random events + 4 Oh-Crap choice scenarios (interactive torn-notebook panel, 5s countdown, keyboard/touch), pets (cat/dog/goldfish on petRng, picker on level select), Critterdex journal (kills/jars/shinies persisted), 9 boss leitmotifs + per-world instrumentation + shiny-chime/jar-pop/grudge stings, The Fly egg, tower renaming (Talkie). All chaos systems inert-by-default so the 40-level balance gates stay valid (dedicated RNG streams: shinyRng/grudgeRng/directorRng/eventRng/petRng — NEVER add draws to the main stream; ~40 par scripts depend on byte-stability).

**NEXT: P3 hooks** — (1) Infestation roguelike mode (§15 — flagship; needs a design contract first: node map, tower-card deck w/ rarities, 40 relics, curses, Weird Closet events, run-long mutations, Garage Sale haggle; build as a mode wrapper over Sim like endless, deck gates allowedTowers, relics = global mods table); (2) Endless mode (§16 Pantry Panic: procedural wave generator past authored waves, weekly seed, local leaderboard); (3) Daily Chores mutators; (4) Junk Drawer meta tree (Brownie Points from stars/achievements → permanent unlocks); (5) achievements (~40 to start, not 150); (6) photo mode (free cam + tilt-shift slider; GIF export = stretch). Then P4 soul (remaining eggs, secret levels, accessibility incl. arachnophobia mode, loss vignettes, EXTERMINATOR alliance finale — the story payoff), P5 multiplayer per §17. Model-router discipline unchanged: Codex only with un-gameable mechanical gates; Sonnet for judgment-adjacent implementation; independent verification always; commit per verified wave.

**Director AI + Random Events + Oh-Crap Scenarios LANDED (253/253 tests, tsc clean).** GAME-PROMPT §11/§12/§13, sim-only (no render/ui/game.ts touched — UI wiring is a later pass):
- `src/sim/director.ts`: tracks per-wave telemetry (damage-type totals from `hit` events, flier-leak counts, sweep diligence) into a `DirectorMemory`. At each `startWave` when `directorOn`, `augmentWave()` picks ONE of four strategies (dmg-type counter-resist, crumbHunger evolvers for non-sweepers, more fliers if fliers are leaking, mixed probe after 2+ clean waves) and appends a counter-composition strictly capped at 25% of the wave's authored hp-mass — the cap is enforced by flooring `count` to 0 (skipping the augmentation) rather than forcing `Math.max(1, ...)`, since a single unit of a tanky species could otherwise blow the budget. Species are drawn only from the level's own authored waves (never introduces out-of-world species) via a dedicated `directorRng` stream so augmentation never perturbs `ctx.rng`. Writes plain-language `recap.directorNotes` lines and emits a `{ t: 'forecast' }` event at every `buildPhase` previewing the next wave — the forecast text-generation path is RNG-free (split `planAugmentation` from the RNG-consuming species pick in `augmentWave`) so the preview never desyncs the real pick made later.
- `src/sim/events.ts` + `src/content/events.ts`: 11 EventDefs (7 non-choice + 4 Oh-Crap choice scenarios) mapped onto a small sim-consumable effect-key set (`crumbRain`, `powerOutage`, `gust`, `tvTruce` two-phase freeze→speedup, `scentSpike`, `quake`, `leftoverNight`, plus 4 choice effects). Rolled at wave start on a dedicated `eventRng` stream, capped at 1-2 per level (`state.eventsThisLevel`), gated by `SimOptions.events` (default false) + `LevelDef.eventChance` (default 0.25). Oh-Crap choice machinery: `state.pendingChoice` + `{ type: 'choose' }` command; a 5-second deadline auto-resolves to option 1 (the passive pick) via `updatePendingChoice`, ticked every frame. Ant Diplomacy's ceasefire actually skips `WaveRuntime` spawn entries for `state.ceasefireWaves` waves. Unmappable §11 gags (Mom's Sweep, Grease Fire, Door-to-Door Salesman, Roomba Firmware, The Fly UI gag, Sunbeam Shift, Bug Bounty) logged in CUTS.md with reasons + return points, as instructed.
- New types (all additive to `types.ts`): `EventDef`/`EventEffectKind`/`ActiveEvent`/`PendingChoice`, `SimOptions.director`/`.events`, `LevelDef.director`/`.eventChance`, `SimState.activeEvents`/`.eventsThisLevel`/`.pendingChoice`/`.ceasefireWaves`, `SimCommand: 'choose'`, `SimEvent: 'forecast'|'eventStart'|'eventEnd'|'choiceOffered'|'choiceMade'`, `ContentDB.events`.
- Both systems verified fully inert by default: a dedicated test proves `director:false` produces byte-identical wave spawns to omitting the flag entirely, and `events:false` never rolls even with `eventChance:1` on the level. All pre-existing balance suites (which never pass `director`/`events`) are unaffected — full 233-test baseline plus 20 new tests (`tests/director.test.ts`, `tests/events.test.ts`) all green.
- Bug caught by the tests themselves during development: `onWaveClear`'s Director telemetry was originally reading `this.events` (the tick-scoped buffer, drained every single `tick()` return) instead of a wave-scoped log, which would have starved multi-tick damage-type telemetry down to just the wave's final tick. Fixed with a `waveEventLog` accumulator reset at each `startWave`.

**T13 balance gate PASSED — 8/8 balance tests, 76/76 total.** Final numbers (houseguest, 3 seeds):
- kitchen-1: W×3, 5.0 avg bites · kitchen-2: W×3, 2.0 · kitchen-3: W×3, 1.7 · kitchen-4: W×3, 0.0 · kitchen-5 (boss): W×3, 4.7
- minimal single-spritz LOSES ✓ · par crumbles on condemned ✓ · perf 0.10ms/tick @ 300 critters ✓

**What the balance failures actually were (findings):**
1. **Harness bug, not tuning:** par scripts mounted towers at the clutter *anchor* tile, but `pasta-j`/`sponge-s` have no cell at (0,0) and the hand is a random draw → clutter landed offset / tower placement silently no-opped → zero-defense losses (kitchen-5 died wave 0 with 290 unspent crumbs). Fix: `autoPlay` now places like a human — tries shapes×rotations×nudges, mounts towers on real placed cells with free slots, retries unaffordable towers next build phase.
2. **Anti-air holes:** fliers cruise at cake height and beeline (critters.ts walkBrain) — floor towers near ground funnels never touch them. kitchen-3/5 par now builds ON the stove/banquet next to the cake. Rule of thumb for all future par scripts: *the cake surface needs its own garrison.*
3. **dodgeFirst is brutal vs single towers:** a housefly at the cake eats exactly one Smacky swing (dodged), bites 0.8s, flees at +15% — one tower can NEVER kill a transiting fly. Fly counts are the difficulty dial that punishes minimal builds without touching par (par's counter garrison kills them).
4. kitchen-1 waves 3-5 toughened so a lone unupgraded spritz loses (18 workers @0.5s outpaces its 1.8/s kill rate; 9 flies across waves 4-5).

**Current session directives (user, 2026-07-01):** finish ALL remaining levels (worlds 2-9), greatly improve graphics, make it playable on mobile. Full autonomy, work to completion. Task list: #2 Phase-2 sim+content foundation → #3 worlds 2-9 rooms/levels/bosses → #4 graphics overhaul → #5 mobile.

**2026-07-01 #5 Mobile support LANDED.** Full touch/phone playability, done in parallel with the graphics + Phase-2 content workstreams (file ownership: index.html, style.css, main.ts, game.ts, ui/**, camera.ts, handView.ts, device.ts, shot-mobile.mjs; minimal surgical edits to renderer.ts DPR/resize).
- `src/core/device.ts`: `isTouchDevice()`, `isMobileViewport()` (matches CSS breakpoint — narrow-width OR short-height, so landscape phones like 844×390 are correctly detected despite being "wide"), `isPortrait()`, `dprCap()` (1.5 mobile / 2 desktop).
- Input unified on Pointer Events in `game.ts`: tap/drag/flick/sweep all now touch-native; added long-press (450ms, touch/pen only) on a tower → carry pickup (tap to drop, reusing the existing `carryStart`/`carryDrop` commands); two-finger drag → camera orbit, pinch → zoom (`CameraRig.pinchZoom()` added alongside existing mouse orbit, mouse path untouched/unregressed).
- `index.html`: proper viewport meta (`viewport-fit=cover`, no pinch-zoom), theme-color, apple PWA meta tags.
- `style.css`: `overscroll-behavior:none` + fixed-position html/body/app to kill pull-to-refresh; `touch-action:none` on canvas/UI, `manipulation` on buttons to suppress double-tap zoom; full responsive pass at `(max-width:820px), (max-height:500px)` (the OR is required — landscape phones are wide but short) — HUD chips/meters shrink with `clamp()`, all touch targets ≥44px, bottom build bar becomes a horizontally-scrolling strip (`.build-bar-scroll`, momentum + snap) with the speed/pause cluster docked as a separate opaque 2×2 grid so nothing overlaps at 390px-tall viewports; portrait shows a diegetic "turn me sideways!!" sticky-note overlay (blocks sim ticking while shown, see `UI.rotateBlocking`).
- `src/audio/audio.ts`: unlock listener extended to `touchend` alongside `pointerdown`/`keydown` as a mobile-Safari safety net (WebAudio already resumes on every `ensure()` call).
- `tools/shot-mobile.mjs`: Playwright iPhone-13-like context (844×390 landscape, DPR 3, isMobile/hasTouch) driving the same demo scenes as `shot.mjs`, plus one portrait check confirming the rotate overlay.
- Verified: `npm run build` (tsc+bundle) clean, `node tools/smoke.mjs` OK, `node tools/shot.mjs` desktop unregressed (pixel-identical layout), `node tools/shot-mobile.mjs` produces 8 clean screenshots — iterated 3 rounds on the landscape HUD after screenshots caught real overlap bugs (chips wrapping to 2 lines, speed cluster overlapping the spell shelf, breakpoint not matching landscape at all because `max-width:820px` alone doesn't catch an 844-wide short viewport).

**2026-07-01 Phase-2 foundation LANDED (104/104 tests, tsc clean).** Multi-agent build (model-router skill: Codex CLI + Sonnet subagents + main-model orchestration):
- 14 new critter traits in sim (stealth/reveal stamps, tunneler, latcher, rollUp, submerge, spawner, towerSmash, webber, timedEvolve, lateFlier, speedAura, healPulse, anchored, clutterEater) + confused/feared exit-flow behavior + playDeadTimes + bountyPct pass-through.
- New tower behaviors: chain lightning (chainCount/chainDmgPct), buff auras (buffRatePct/buffDmgPct stamp pattern), reveal, roam/suck/autoSweep (Vroomba), rewindSec pulses (Tick-Tock), agePct scaling (Old Stinky/Audrey), smoothie bounty, aura status stamping (shared MOD_STATUSES table exported from projectiles.ts).
- All 8 spells implemented (timestop/cleanse/gamble/repair/handBuff joined bolt/lane/momHand). hand.zapT = Static Discharge.
- Content: 24 towers total, 45 critters total (all bosses 2-9 incl. the-exterminator), 16 mutations, 10 clutter shapes.
- All 9 themed room builders in render (palette.ts THEME_PALETTES + room.ts per-theme rigs; bedroom/basement/sewer are practical-light dark rooms; backyard is exterior).
- Balance harness extracted to tests/harness/autoplay.ts (accepts LevelDef objects so unregistered levels can be gated).
- Suites: critters-p2 (17), towers-p2 (6), spells-p2 (5).

**Parked notes:** content/index.ts still only registers kitchen levels — wire worlds 2-9 when level files land. Mobile agent in flight (ui/, camera, handView, index.html, style.css, device.ts, shot-mobile.mjs). CUTS to log later: Scorch window-LOS scaling, Mike Rowave explosion risk, Static hand-rub reload, cricket weeping-angel rule, Lux flier-aggro, pets/jarring/grudges/Director (Phase-2 back half), condemned loss vignette.

**Key commands:** `npx vitest run tests/balance.test.ts 2>&1 | Select-String 'kitchen-\d:|stress:|Tests '` shows per-level W/L. Balance file has `PAR` strategy map + `autoPlay()` (smart placement). Difficulty mults in `src/sim/sim.ts` DIFFICULTY.

---

## Status: Phase 1 — sim core DONE (57 tests), now content features + renderer

| Phase | Status |
|---|---|
| P1 Vertical Slice (kitchen) | ✅ DONE — sim, content, renderer, UI, audio, balance gate all green |
| P2 Full House | ⏳ in progress (worlds 2-9, towers 9-24, critters 13-30, bosses 2-9) |
| P3 Hooks (roguelike/meta) | not started |
| P4 Soul (eggs/polish) | not started |
| P5 Block Party (multiplayer) | not started |

### Sim contracts that exist (post-compaction cheat sheet)
- `Sim(level, {seed, difficulty, content})` · `command()` · `tick(): SimEvent[]` · `debugSpawn/debugDamage`
- Systems: grid (Dijkstra cake+exit fields, chew-through), waves, critters (walk/climb/fall/flung/chew/eatCake/flee/playDead), towers (projectile/slam/cone/aura/trap/push/beam), projectiles (homing+arc), crumbs (sweep/eat-evolve), hand (flick/squash/sweep/carry/highFive/rearm), spells (bolt/lane/momHand), mutations, scent (25/50/75/100 thresholds, scouts, THE SWARM)
- Key consts: SIM_DT 1/30 · BUILD_TIME 25s · CHEW_COST 15 · scent cap 200 crumb-value

## Decisions log
- 2026-06-12: Stack pinned — three ^0.165, vite 5, vitest 1.6, playwright (chromium) for screenshot evaluation. Base './' for itch.io compatibility.
- 2026-06-12: Sim tick 30Hz; surface-grid + BFS flowfield pathing; fliers steer free. Critters = InstancedMesh per species; towers = individual animated Groups.
- 2026-06-12: All assets procedural (models from primitives, faces from canvas textures, audio synthesized). Zero asset files.

## Evaluation findings & improvements
- **Renderer milestone (screenshot eval rounds 1-3):** Toy-box diorama works — warm toon kitchen, glowing cake HP, charming critter bestiary (all 13 species read distinctly), boss model lands. FIXED during eval: (1) critters pathed under kitchen island through solid cabinet → furniture now blocks floor beneath (shelves stay open) — better mazing too; (2) demo placements silently failed (clutter-hand validation — correct behavior, bad demo); (3) ants invisible at gameplay zoom → +35% critter scale, brighter palette; (4) camera framed too far → tightened; (5) towers too small → +28% scale; (6) bullet ant read as a carrot → stretch reduced; (7) gnome/rick are floorMount — placement on clutter correctly rejected.
- Render notes: smoke test = screenshot-luminance (readPixels needs preserveDrawingBuffer — avoided); renderer.info.autoReset=false for full-frame draw-call counts (~133 calls in build scene).
- CUT (P1): dustpan prop — sweeping collects directly into the Hand (sim already works this way; revisit in P2 polish).

## Cuts
(none yet — see CUTS.md if created)
