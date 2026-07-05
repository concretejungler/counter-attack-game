# RESUME / LLM HANDOFF — COUNTER ATTACK!

> Purpose: everything a fresh LLM (or a future session) needs to pick up this project cold.
> Read this first, then `BUILDLOG.md`, then `GAME-PROMPT.md` (the design law). Last updated after
> the mobile-UX-overhaul commit (2026-07-03, follows `794aad7`).

---

## 0. TL;DR — how to resume in 60 seconds

- **What it is:** `COUNTER ATTACK!` — a whimsical 3D tower-defense game. Critters (ants, flies,
  roaches…) invade a house and march for the **birthday cake**; you are the **Hand of the house**
  and defend it with housewares (spray bottles, toasters, gnomes…) placed on "clutter" walls.
- **Tech:** TypeScript (strict) + Vite. **The game is 2D top-down** (Canvas 2D renderer in
  `src/render2d/`, default) — converted 2026-07-04 per user directive because 3D played poorly on
  phones. The original three.js renderer still compiles behind `?renderer=3d` (debug fallback only).
  Deterministic 30 Hz sim, procedural everything (no asset files), diegetic DOM/CSS UI, WebAudio synth.
- **Status:** Feature-complete through **Phase 4** (all 40 campaign levels + secret levels + roguelike
  Infestation mode + Endless + photo mode + easter eggs + accessibility) **and fully converted to 2D**
  (plan: `docs/superpowers/plans/2026-07-04-2d-conversion.md`; log: BUILDLOG top entry). Phase 5
  (WebRTC multiplayer) is NOT built and was NOT requested.
- **Branch:** work happens directly on **`master`**. Working tree is clean.
- **Health:** `npm test` → **351 tests green**. `npm run smoke` → OK. `npx tsc --noEmit` → clean.
- **Deployed (public):** https://concretejungler.github.io/counter-attack-game/ via GitHub Pages
  (Actions workflow). Redeployed 2026-07-03 with the mobile UX overhaul (user-requested). To ship
  again: `node tools/deploy-pages.mjs` (publishes dist/ to gh-pages), then push `master` (triggers
  the Pages workflow — that push order matters).
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

## 3b. TARGET PLATFORM (2026-07-05 pivot): STEAM PC

The game now targets a Steam PC launch. `app/` holds the Electron shell; `npm run app:dev` runs it
against vite, `npm run app:pack` builds the NSIS installer + portable exe into `release/`
(temp-staged — Defender EPERM workaround, see app/README.md). Icon via `node tools/gen-icon.mjs`;
resolution sweep via `node tools/shot-res.mjs`. Auto UI-scale + Display settings landed (BUILDLOG
top entry). Steamworks is NOT integrated — drop-in point + overlay flags documented in
app/README.md. The web build/Pages deploy still works and stays the quick-share channel.

## 4. Prior session (2026-07-05 — MOBILE-STORE REVAMP; read BUILDLOG entry for detail)

Store-quality menu/level-select rebuild + full art re-light, per user directives. Key state:
- Level select = the crayon house-map (`src/ui/houseMap.ts` + `houseMapData.ts`); title = parallax
  diorama; shared `statusRibbon.ts`; menu juice lives in the ui layer (own small audio bus).
- ALL sprites use the v2 "one-light" system: toolkit `src/render2d/paint.ts`, law in
  `painters/GUIDE.md` V2 section — any new painter MUST follow it (ramp() shadows, cel crescents,
  ≤6-8 marks, tier rules). Coverage gates: `check-painters <kind> --strict`.
- Board auto-fits ABOVE the HUD bars (Camera2D insets, renderer2d measures the DOM bars);
  bar sections labeled Towers / Building Blocks / Power-Ups.
- Crumb sweep: `SWEEP_PICKUP_RADIUS = 1.7` tiles in game.ts (harness radius is separate — 1.4).
- Perf stress number (300 critters, 4× throttle) sits ~8ms vs the aspirational 4ms budget —
  Canvas-2D drawImage floor + contended hosts; judge on real devices before optimizing further.

## 4a. Prior session (2026-07-04 — THE 2D CONVERSION)

The whole view layer was replaced: the game now renders top-down 2D via `src/render2d/` (Canvas 2D,
sprite-cache + code-drawn painters for all 45 critters/29 towers/10 room themes, pooled VFX, 2D hand/
pets/eggs). `game.ts` talks to a renderer-agnostic `GameView` interface (`src/render/view.ts`);
`?renderer=3d` boots the old three.js view as a debug fallback. Sim/content untouched — 351 tests
never broke. Full narrative + P4 punch-list resolution in BUILDLOG's top entry; design law in the
plan doc. Key operational notes: sprite coverage is gated by `node tools/check-painters.mjs
<critters|towers> --strict` (run it after touching painters); 2D perf probe is `tools/perf2d.mjs`
(4ms@4×-throttle stress target unmet — Canvas2D drawImage floor ~5ms at 300 critters; real-device
play is the arbiter); painters style law lives in `src/render2d/painters/GUIDE.md`.

## 4b. Prior session (2026-07-03 — MOBILE UX OVERHAUL)

One big commit (see the top BUILDLOG entry for full detail). The phone HUD was rethought end-to-end:
- **Mobile dock + build sheet** (`src/ui/hud.ts`): on the mobile breakpoint the always-visible build
  strip and 2×2 speed cluster are replaced by a bottom dock — build-toggle (selection icon + clutter
  badge), **3 quick-spell slots** (pinned via ★ toggles in the sheet, FIFO at 3, persisted in
  `save.settings.quickSpells`), `⋯`, single cycling speed button, pause, ⛶/3D. The build bar becomes
  a slide-up sheet with scrim, lowercase section labels, auto-close on select; photo mode lives in
  the sheet footer. Desktop DOM identical (new elements `display:none/contents` outside the media query).
- **Top-down default on phones**: `finishLevelBoot` auto-enters overhead framing on mobile viewports
  (enter-only; `renderer.isTopDownActive()` getter); `loadLevel` resets the flag; ⛶ reads "3D" while active.
- **Walls always ghosted everywhere** (0.14; 0 + invisible in top-down) — replaced the camera-angle fade.
- **Menu-screen fixes from an Opus audit**: mobile `.screen { justify-content: flex-start }` (the
  title screen's play button was clipped off the top of the viewport!), house-scroller 56vh,
  sticky-note level-card readability, sticky CTA rows (`.recap-actions`/`.modal-done-row` in
  screens.ts) so Next Level / Done are never below the fold, recap graph 60px on mobile.
- **QA/deploy tooling**: `demo('mobilesheet')`; shot-mobile scenes += mobilesheet/topdown/tutorial;
  `tools/deploy-pages.mjs` (worktree-based gh-pages publisher, `--dry-run` supported).

The previous session's work (`794aad7` and earlier — font unification, see-through-walls v1, parallax
placement fix, overhead button, tutorial, path preview, swarm-alarm fix) is chronicled in BUILDLOG.md.

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

- GitHub Pages via Actions workflow `.github/workflows/pages.yml` (`build_type=workflow`). The
  workflow checks out the `gh-pages` branch and uploads it — it does NOT build. Live URL:
  **https://concretejungler.github.io/counter-attack-game/**.
- **To ship:** `node tools/deploy-pages.mjs` (builds + publishes dist/ to gh-pages via a scratch
  worktree; `--dry-run` supported), then `git push origin master` (triggers the workflow). Confirm
  with the user before pushing/deploying — outward-facing action.
- **Deploy gotchas (refined 2026-07-05 after a second wedge):** (1) Never `gh run rerun` a failed
  pages run — the kept artifact dies on "Multiple artifacts named github-pages"; always dispatch
  FRESH (`gh workflow run pages.yml`). (2) Pages deployments are KEYED BY COMMIT SHA
  (`pages_build_version`). A stuck deployment blocks successors ("Deployment failed, try again
  later" instantly); cancelling it (`gh api -X POST .../pages/deployments/<full-sha>/cancel`)
  unblocks the queue BUT **poisons that sha** — the next run reuses the same deployment id, polls a
  `deployment_cancelled` record for 10 minutes, and fails. After any cancel, **push a new commit
  (new sha) before redeploying.** (3) Legacy branch-mode builds wedge at "building" forever for this
  repo; stay on workflow mode. (4) `DELETE /pages` is rejected (422); not an available fix.
  (5) Multiple GitHub accounts live on this machine (`concretejungler` owns this repo;
  `MedAssistant-ux` may be gh's active account) — if pushes 403, scope auth per-command:
  `GH_TOKEN=$(gh auth token -u concretejungler)` for gh calls, and for git pushes use the
  base64 extraheader pattern (see git log for the exact invocation) rather than flipping the
  machine-wide active account.

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
