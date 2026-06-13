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
- **Renderer milestone (screenshot eval rounds 1-3):** Toy-box diorama works — warm toon kitchen, glowing cake HP, charming critter bestiary (all 13 species read distinctly), boss model lands. FIXED during eval: (1) critters pathed under kitchen island through solid cabinet → furniture now blocks floor beneath (shelves stay open) — better mazing too; (2) demo placements silently failed (clutter-hand validation — correct behavior, bad demo); (3) ants invisible at gameplay zoom → +35% critter scale, brighter palette; (4) camera framed too far → tightened; (5) towers too small → +28% scale; (6) bullet ant read as a carrot → stretch reduced; (7) gnome/rick are floorMount — placement on clutter correctly rejected.
- Render notes: smoke test = screenshot-luminance (readPixels needs preserveDrawingBuffer — avoided); renderer.info.autoReset=false for full-frame draw-call counts (~133 calls in build scene).
- CUT (P1): dustpan prop — sweeping collects directly into the Hand (sim already works this way; revisit in P2 polish).

## Cuts
(none yet — see CUTS.md if created)
