# BUILDLOG — COUNTER ATTACK!

> Living status doc. Updated after every task. After context compaction: read this + CLAUDE.md + the plan, then continue.

## ✅ PHASE 1 COMPLETE (2026-07-01). Now: Phase 2 (worlds 2-9) + graphics overhaul + mobile.

**T13 balance gate PASSED — 8/8 balance tests, 76/76 total.** Final numbers (houseguest, 3 seeds):
- kitchen-1: W×3, 5.0 avg bites · kitchen-2: W×3, 2.0 · kitchen-3: W×3, 1.7 · kitchen-4: W×3, 0.0 · kitchen-5 (boss): W×3, 4.7
- minimal single-spritz LOSES ✓ · par crumbles on condemned ✓ · perf 0.10ms/tick @ 300 critters ✓

**What the balance failures actually were (findings):**
1. **Harness bug, not tuning:** par scripts mounted towers at the clutter *anchor* tile, but `pasta-j`/`sponge-s` have no cell at (0,0) and the hand is a random draw → clutter landed offset / tower placement silently no-opped → zero-defense losses (kitchen-5 died wave 0 with 290 unspent crumbs). Fix: `autoPlay` now places like a human — tries shapes×rotations×nudges, mounts towers on real placed cells with free slots, retries unaffordable towers next build phase.
2. **Anti-air holes:** fliers cruise at cake height and beeline (critters.ts walkBrain) — floor towers near ground funnels never touch them. kitchen-3/5 par now builds ON the stove/banquet next to the cake. Rule of thumb for all future par scripts: *the cake surface needs its own garrison.*
3. **dodgeFirst is brutal vs single towers:** a housefly at the cake eats exactly one Smacky swing (dodged), bites 0.8s, flees at +15% — one tower can NEVER kill a transiting fly. Fly counts are the difficulty dial that punishes minimal builds without touching par (par's counter garrison kills them).
4. kitchen-1 waves 3-5 toughened so a lone unupgraded spritz loses (18 workers @0.5s outpaces its 1.8/s kill rate; 9 flies across waves 4-5).

**Current session directives (user, 2026-07-01):** finish ALL remaining levels (worlds 2-9), greatly improve graphics, make it playable on mobile. Full autonomy, work to completion. Task list: #2 Phase-2 sim+content foundation → #3 worlds 2-9 rooms/levels/bosses → #4 graphics overhaul → #5 mobile.

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
