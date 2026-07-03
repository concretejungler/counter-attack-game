# RESUME / LLM HANDOFF — COUNTER ATTACK!

> Purpose: everything a fresh LLM (or a future session) needs to pick up this project cold.
> Read this first, then `BUILDLOG.md`, then `GAME-PROMPT.md` (the design law). Last updated after
> commit `794aad7` (2026-07-03).

---

## 0. TL;DR — how to resume in 60 seconds

- **What it is:** `COUNTER ATTACK!` — a whimsical 3D tower-defense game. Critters (ants, flies,
  roaches…) invade a house and march for the **birthday cake**; you are the **Hand of the house**
  and defend it with housewares (spray bottles, toasters, gnomes…) placed on "clutter" walls.
- **Tech:** TypeScript (strict) + Three.js + Vite. Deterministic 30 Hz sim, procedural everything
  (no asset files), diegetic DOM/CSS UI, WebAudio synth.
- **Status:** Feature-complete through **Phase 4** (all 40 campaign levels + secret levels + roguelike
  Infestation mode + Endless + photo mode + easter eggs + accessibility). Phase 5 (WebRTC multiplayer)
  is NOT built and was NOT requested.
- **Branch:** work happens directly on **`master`**. Working tree is clean.
- **Health:** `npm test` → **351 tests green**. `npm run smoke` → OK. `npx tsc --noEmit` → clean.
- **Deployed (public):** https://concretejungler.github.io/counter-attack-game/ via GitHub Pages
  (Actions workflow). **The live site is BEHIND local `master`** — recent work is committed locally
  but NOT pushed/deployed yet (user said "keep refining before pushing").
- **Local dev:** `npm run dev` (Vite, port 5173). A server was running on 5173 during the last
  session; a fresh browser load serves current source via Vite's FS watch.

---

## 1. The non-negotiable architecture rules

These are enforced by tests and by a source-scan. **Violating them breaks determinism and ~40
hand-tuned balance par-scripts.**

1. **`src/sim/` + `src/content/` are a pure deterministic fixed-timestep (30 Hz, `SIM_DT = 1/30`)
   simulation.** NO `three.js` imports, NO `Math.random`, NO `Date.now` there — a vitest source-scan
   (`tests/`) fails the build if you add them. Use the seeded RNG in `src/sim/core/rng.ts`
   (`mulberry32`) only.
2. **Any new randomness in the sim MUST use a dedicated seeded RNG stream, never the main
   `ctx.rng`.** The existing dedicated streams (all XOR-mixed from the main seed) are:
   `shinyRng`, `grudgeRng`, `eventRng`, `directorRng`, `petRng`, `endlessRng`. Reusing `ctx.rng`
   for a new feature shifts every downstream draw and invalidates the balance par-scripts. This is
   the single most important sim rule.
3. **Command-in / event-out.** `sim.command(cmd)` **queues** a command (applied on the *next*
   `sim.tick()`), and `sim.tick(): SimEvent[]` returns events. Render/UI read `sim.state` but NEVER
   mutate it. Commands are NOT applied synchronously — you cannot read the result of a placement in
   the same turn you issued it.
4. **Inert-by-default mode flags.** `SimOptions.{director,events,pet,endless,runMods,preMutations,
   metaMods,allowedTowersOverride}` all default OFF so the 40-level balance gates stay valid.
   Determinism-guard tests enforce this.
5. **All models procedural** (primitives + canvas textures). Critters use `InstancedMesh` per
   species. **No external assets ever** (keeps deploys legally clean) — this includes fonts (see the
   typography note in §4). Shared types live in `src/sim/types.ts`; content is data-driven defs in
   `src/content/`.
6. **Tuning lives in content defs**, not hardcoded in systems.
7. **Debug hooks** for tooling: `window.__game` exposes `loadLevel`, `state`, `grantCrumbs`,
   `callWave`, `setSpeed`, `demo(name)`, `screenshotReady`. The `demo()` scenes are the QA harness.

---

## 2. Directory map (where things live)

```
src/
  sim/        deterministic sim — grid.ts (Dijkstra cake/exit flow fields, chew-through),
              sim.ts (command/tick loop), critters.ts, towers.ts, projectiles.ts, clutter.ts,
              endless.ts, director.ts, events.ts, grudges.ts, pets.ts, spells.ts, types.ts,
              core/rng.ts
  content/    data-driven defs — towers.ts, critters.ts, spells.ts, mutations.ts, events.ts,
              index.ts (CAMPAIGN_LEVELS + SECRET_LEVELS = ALL_LEVELS), levels/*.ts
  render/     Three.js view — renderer.ts (main), camera.ts, room.ts, post.ts (DOF+bloom+ACES),
              handView.ts, pathView.ts, vfx.ts, eggs.ts, palette.ts, build.ts,
              models/{critterModels,towerModels,petModels,props}.ts
  ui/         diegetic DOM/CSS — ui.ts (screen router), hud.ts, screens.ts (title/levels/journal/
              settings/tutorial/infestation), choicePanel.ts, magnets.ts, fly.ts, icons.ts
  audio/      WebAudio synth (zero audio files)
  meta/       save.ts, achievements.ts, infestation.ts, progress.ts
  game.ts     orchestrator — input, main loop, event handling, mode state machine, demo scenes
  style.css   ALL diegetic UI styling
tests/        vitest — sim suites + content-levels lints + balance par-scripts + source-scan
tools/        shot*.mjs (Playwright screenshots), smoke.mjs, serve.mjs, audit-levels.mjs
docs/superpowers/plans/2026-06-12-counter-attack.md   implementation plan
```

---

## 3. Commands

- `npm run dev` — Vite dev server, port 5173.
- `npm test` (`npx vitest run`) — sim + balance suites. **Must stay green (351).**
- `npm run build` — typecheck + production bundle to `dist/` (deployable static).
- `npm run smoke` (`node tools/smoke.mjs`) — headless boot, fails on console errors.
- `node tools/shot.mjs <scene[,scene...]>` — Playwright screenshots to `shots/` (review visually!).
  QA scenes include: `title, levels, hud, battle, boss, mutation, choice, recap, towers, critters,
  photo, tutorial, topdown, crumbs, wallfade, hand, arachnophobia`.
- `node tools/shot-mobile.mjs` — mobile-viewport screenshots (landscape + portrait).
- `npm run balance` — headless bot playthroughs / difficulty report.
- Evaluation loop after every milestone: **tests → smoke → screenshots (critique them) → balance →
  log findings in BUILDLOG.md → commit.**

---

## 4. What changed in the most recent session (2026-07-03)

All committed to `master`, newest first. All verified (351 tests + smoke + screenshots, desktop+mobile).

- **`794aad7` — unify font, see-through walls, menu casing**
  - **Typography:** UI mixed two font families and led with "Segoe Print" (Windows-only), so text
    rendered differently per element and per device. Now ONE family everywhere: `--font-hand` leads
    with `Comic Sans MS` (+ friendly fallbacks), and `--font-label` is aliased to it (`src/style.css`
    `:root`). Title menu casing aligned to Title Case ("My Journal", "The Junk Drawer").
  - **See-through walls:** the 2 diorama walls (north/west) blocked the board when the camera orbited
    to their outside. Each now fades to a faint ghost based on camera position (solid at normal
    angles). `room.ts` clones the wall material + tags `userData.fadeWall = {axis, coord}`;
    `renderer.ts` collects them (`fadeWalls`) and updates `.opacity` per frame in `frame()`.
- **`f7354e4` — parallax-correct tower placement + glowing crumbs**
  - **Placement bug ("sometimes can't place towers"):** clutter blocks are ~0.85 tall but the pointer
    raycast hit a flat ground plane, so aiming at a block's top landed a tile *behind* it (parallax) →
    silent fail + selection dropped. Fix: `renderer.pickClutterTile()` raycasts the actual raised
    clutter meshes (tagged `userData.tile`); `game.ts` `towerTargetTile()` prefers it for
    tower/carry placement. Added `towerCellValid()` (mirrors `sim/towers.ts tryPlaceTower`) driving
    both ghost colour and the click gate — an invalid tap now plays `place-bad` and KEEPS the tower
    selected instead of no-op + cancel.
  - **Glowing crumbs:** brighter/bigger tetrahedra + a soft additive golden "puddle" glow mesh under
    each crumb (`crumbGlowMesh` in `renderer.ts`, synced in the crumb loop).
- **`b99739b` — overhead-view button, 20%-smaller dock, How-to-Play tutorial**
  - **Overhead "see everything" camera:** ⛶ HUD button (speed cluster) + `V` key toggles a
    near-top-down framing that fits every surface on screen, then restores the prior view.
    `CameraRig.overview/snapshot/restore` + `renderer.frameOverview()` + `renderer.toggleTopDown()`.
    Manual orbit/zoom drops the active highlight (`noteCameraMovedManually`).
  - **Dock shrunk 20% (desktop only):** `.build-bar` + `.speed-cluster` get `transform: scale(0.8)`;
    mobile keeps its own touch-sized layout (`transform: none`).
  - **How-to-Play tutorial:** `buildTutorial()` in `screens.ts` — 8-page flip-book (goal, build/battle
    loop, path preview, clutter/towers, the Hand, crumbs/mana/spells, scent/THE SWARM, buttons/camera).
    Reachable from a title "🎓 How to Play" fridge button; auto-shown once before the first level
    (gated via `save.seenNotes` including `'how-to-play'` — replayable, never nags).
- **`b088026` — swarm-alarm click-blocking bug**
  - The full-screen red "THE SWARM" vignette (scent ≥ 99) is a direct child of `#ui`, where
    `#ui > * { pointer-events: auto }` (specificity 1,0,0) beat its plain `.swarm-alarm
    { pointer-events: none }` (0,1,0) — so it silently ate every click while glowing. Fixed to
    `#ui > .swarm-alarm` (mirrors the earlier `.flash-pulse` fix). **General lesson: any full-screen
    overlay appended directly under `#ui` that needs `pointer-events:none` MUST use an
    ID-qualified selector (`#ui > .foo`) or it loses the cascade.**
- **`5ba3e16` — on-board enemy-path preview + upside-down Hand fix**
  - **Path preview:** a glowing chevron ribbon flows from each spawn to the cake, showing the actual
    route (the sim's own Dijkstra flow field). `Grid.pathVersion` bumps on every cake-field recompute;
    `Grid.pathTo()` traces it; `game.ts` re-pushes world polylines to `render/pathView.ts` whenever
    the version changes (clutter placed/removed). Determinism untouched (pathVersion is not RNG).
  - **Hand fix:** the cursor's fingers curled up/away from the board (palm-up = upside-down); flipped
    the finger-curl sign in `handView.ts` so they tuck down (palm-down).

---

## 5. Hard-won lessons / gotchas (read before touching related code)

- **RNG stream discipline** (see §1.2). The #1 way to silently break the balance gates.
- **CSS specificity trap under `#ui`:** `#ui > * { pointer-events: auto }` overrides any plain-class
  `pointer-events: none` on a direct child. Use `#ui > .yourclass`. Bit both `.flash-pulse` and
  `.swarm-alarm`.
- **Parallax on raised meshes:** picking against flat ground planes is wrong for anything elevated
  (clutter blocks, counters). Raycast the real meshes and tag them with `userData.tile`.
- **Commands are queued, not immediate** (§1.3) — gate placement UX on a local validity check, don't
  expect to read sim results synchronously.
- **No external assets** includes fonts — cross-device font consistency is limited to system-font
  stacks (we chose Comic Sans MS-first). Embedding an OFL font base64 would be the only way to get
  pixel-identical fonts everywhere, but that conflicts with the "no assets" rule; not done.
- **Codex will game un-guarded gates.** When delegating content authoring to Codex CLI (cost routing,
  see §7), it previously produced shell levels + a runtime wave-scaling cheat to pass the par gate.
  Only delegate to Codex with **un-gameable mechanical acceptance gates** (mass floors, composition
  share, "lazy-build-must-lose" probes — see `tests/content-levels.test.ts` + `balance-hardness`).
- **Balance harness doctrine:** any tower-placement *attempt* consumes a sim tick and shifts
  downstream RNG, so par-tuning uses type-chart *substitutions* in wave-0 openings, not added
  placements. Harness lives in `tests/harness/autoplay.ts`.
- **Windows/PowerShell:** commit via `git commit -F <file>` when the message has quotes/`!` — inline
  here-strings choke on embedded `"`.

---

## 6. Deployment

- GitHub Pages via Actions workflow `.github/workflows/pages.yml` (the legacy Jekyll builder was
  wedged; switched to `build_type=workflow`). The workflow checks out the `gh-pages` branch and
  uploads it. Live URL: **https://concretejungler.github.io/counter-attack-game/**.
- **To ship current work you must build + publish** (the live site is currently behind `master`).
  Confirm with the user before pushing/deploying — outward-facing action.

---

## 7. Cost-aware model routing (user directive)

The user wants long build sessions to spend the cheapest adequate tokens. There is a `model-router`
skill (`~/.claude/skills/model-router/SKILL.md`) and a memory (`cost-aware-model-routing.md`):
- **Main model (inline):** architecture, API/type design, tricky debugging, balance/design judgment,
  screenshot critique, final integration + commits + verification.
- **Codex CLI** (`codex exec -s workspace-write --skip-git-repo-check -o <outfile> "<prompt>"`,
  OpenAI tokens): bulk file authoring from a COMPLETE spec, under un-gameable mechanical gates.
- **Sonnet 5 subagents** (`Agent` tool, `model: "sonnet"`): multi-file repo-aware implementation with
  bounded judgment; `Explore` agents for reads/summaries.
- **Verification is non-negotiable:** run tests + typecheck + smoke after every delegated batch.
- Note: this refinement phase has been done inline (interactive, judgment-heavy, tightly iterated).

---

## 8. User & working preferences (Joshua)

- Wants polished, addictive, deployable games he can share. Full creative freedom granted.
- Communication: default to prose, don't stack questions, own mistakes plainly, be direct.
- Match investigation depth to the task.
- Commit after each working milestone; update `BUILDLOG.md` in the same commit.
- Persistent memory lives at `~/.claude/projects/C--Users-hukhu-Desktop-Tower-D/memory/` (index in
  `MEMORY.md`).

---

## 9. Open threads / likely next steps (none are committed asks unless noted)

- **Capitalization pass (offered, awaiting direction):** most content is intentional lowercase
  "kid-handwriting" voice; the user asked for more consistency. Title menu was aligned to Title Case.
  A game-wide standardization (all Title Case vs all lowercase) is a big opinionated sweep — do only
  with an explicit chosen convention. Some strings are asserted in tests; grep before mass-editing.
- **Deploy the current `master`** when the user says the refinement is done.
- **Optional polish carried in `CUTS.md`** (deferred features log).
- **Mobile dock shrink:** the 20% shrink is desktop-only by design (mobile keeps ≥44px touch
  targets). Revisit only if the user asks for smaller mobile controls.
- **Phase 5 (WebRTC "Block Party" multiplayer):** designed in GAME-PROMPT.md, not built, not requested.
- Possible: fade tall *furniture* (cabinets/island) when it occludes the board, like the walls now do
  — the walls were the explicit ask; furniture occlusion is the natural follow-up.

---

## 10. Quick reference — key constants & sim contracts

- `SIM_DT = 1/30` · `BUILD_TIME` 25s · `CHEW_COST` 15 (walk-tiles to chew a clutter tile) ·
  `CLIMB_COST` 1 · scent thresholds 25/50/75/100 (100-and-held = THE SWARM = loss).
- `Sim(level, opts)` · `.command(cmd)` (queued) · `.tick(): SimEvent[]` · `.state` (read-only for
  view) · `.grid` (Dijkstra fields, `flowOf`, `pathTo`, `worldOf`, `tileOfWorld`, `pathVersion`).
- Difficulties: `houseguest` (easiest) → `homeowner` → `landlord` → `condemned`.
- 40 campaign levels across worlds: kitchen, living, bathroom, bedroom, garage, basement, attic,
  backyard, sewer (+ `secret` levels reachable from the "???" attic corner).
