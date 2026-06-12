# COUNTER ATTACK! — Critters vs. Housewares

3D tower defense game. **`GAME-PROMPT.md` is the design law.** **`BUILDLOG.md` is current build status** — read it first after any context loss. Implementation plan: `docs/superpowers/plans/2026-06-12-counter-attack.md`.

## Commands
- `npm run dev` — dev server (vite, port 5173)
- `npm test` — vitest sim suites (must stay green)
- `npm run build` — typecheck + production bundle to `dist/` (deployable static)
- `npm run smoke` — headless boot, fails on console errors
- `npm run shot` — Playwright screenshots to `shots/` (review them visually!)
- `npm run balance` — headless bot playthroughs, difficulty report

## Architecture (do not violate)
- `src/sim/` + `src/content/` = **deterministic fixed-timestep (30Hz) simulation. NO three.js imports, NO Math.random, NO Date.now** — seeded RNG (`core/rng.ts`) only. A vitest source-scan enforces this.
- Sim API: commands in (`sim.command(cmd)`), events out (`sim.tick(): SimEvent[]`). Render/UI read `sim.state` but never mutate it.
- `src/render/` = Three.js view layer, interpolates between ticks. All models procedural (primitives + canvas textures). Critters use InstancedMesh per species.
- `src/ui/` = DOM/CSS diegetic overlay (fridge menus, corkboard HUD). `src/audio/` = WebAudio synth, zero audio files.
- All shared types live in `src/sim/types.ts`. Content is data-driven defs in `src/content/`.
- Debug hooks for tools: `window.__game` (loadLevel, state, grantCrumbs, callWave, setSpeed).

## Conventions
- TypeScript strict. Small focused files. No external assets ever (procedural only — keeps deploys legally clean).
- Commit after each working milestone. Update `BUILDLOG.md` in the same commit.
- Evaluation loop after every milestone: tests → smoke → screenshots (critique them) → balance → log findings in BUILDLOG.
- Tuning lives in content defs, not hardcoded in systems.
