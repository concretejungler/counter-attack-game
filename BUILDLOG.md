# BUILDLOG — COUNTER ATTACK!

> Living status doc. Updated after every task. After context compaction: read this + CLAUDE.md + the plan, then continue.

## Status: Phase 1 — sim core DONE (57 tests), now content features + renderer

| Phase | Status |
|---|---|
| P1 Vertical Slice (kitchen) | ✅ sim core (T2-T6) · ⏳ content features → content → renderer → UI → audio → balance |
| P2 Full House | not started |
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
(append per milestone)

## Cuts
(none yet — see CUTS.md if created)
