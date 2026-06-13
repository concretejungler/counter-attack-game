# BUILDLOG — COUNTER ATTACK!

> Living status doc. Updated after every task. After context compaction: read this + CLAUDE.md + the plan, then continue.

## ⏸️ RESUME HERE (checkpoint 2026-06-12): Phase 1 balance-tuning loop, mid-flight

**What works:** sim (62 tests), content lint (6), full renderer + diegetic UI + audio, playable end-to-end (`npm run dev` → fridge title → play). 68 unit tests green. Smoke + screenshots pass.

**Active task = T13 balance gate.** `tests/balance.test.ts` runs a scripted "par player" (builds per-level strategy, sweeps richest crumb pile every 2s, casts lemon-smite/MOOOOM at clusters, auto-upgrades). Gate: par play wins ≥2/3 seeds with ≤6 avg bites on houseguest; minimal/condemned must LOSE.

**Last balance run (after tuning round 1):**
- kitchen-1: W(5b) W(5b) W(5b) ✅ PASS
- kitchen-2: W(0b) W(4b) W(1b) ✅ PASS
- kitchen-3: L L L (all die wave 4) ❌ — par player can't hold
- kitchen-4: L L L (all die wave 8) ❌
- kitchen-5: L L L (die wave 0-1, the BOSS finale) ❌
- perf: 0.05ms/tick @ 300 critters ✅ (gate <8ms — huge headroom)

**NEXT STEPS (do these in order):**
1. Diagnose kitchen-3/4/5 par failures. Two hypotheses: (a) par *strategies* in `PAR` map place towers in weak spots / too few towers for the crumb budget — improve the scripts first (cheaper than nerfing); (b) genuinely overtuned waves — if even good strategies lose, soften early waves of 3/4/5. kitchen-5 dying at wave 0-1 is suspicious → likely the par strategy is bad (only 2 towers before a real wave) OR startCrumbs too low for the opening. Check `console.log` per-wave death in the balance output; consider logging `wavesSurvived` deaths.
2. Tune by editing CONTENT (`src/content/levels/kitchen.ts` waves, `towers.ts` tiers, `spells.ts`) NOT sim systems. Re-run `npx vitest run tests/balance.test.ts` until 5/5 pass.
3. Then: full `npx vitest run` green, `node tools/smoke.mjs`, `node tools/shot.mjs` (review battle/boss/hud PNGs once more), update this log's findings, commit, mark task #6 done.
4. Phase 1 DONE → start Phase 2 (task #7): worlds 2-9, 16 more towers, 18 more critters, bosses 2-9 + EXTERMINATOR, pets, jarring/Critterdex, grudges, Director AI, random events, Oh-Crap scenarios, House Rules.

**Key commands:** `npx vitest run tests/balance.test.ts 2>&1 | Select-String 'kitchen-\d:|stress:|Tests '` shows the per-level W/L line. Balance file has `PAR` strategy map + `autoPlay()`. Difficulty mults in `src/sim/sim.ts` DIFFICULTY.

---

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
