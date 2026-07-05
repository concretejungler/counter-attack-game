# STEAM PC PIVOT — resolutions + desktop application (2026-07-05)

> User directive: the game will launch on STEAM as a PC game (mobile is no longer the target,
> though the responsive work stays). Fix all resolutions for PC and start moving toward an actual
> installable desktop application. Fable plans; Opus/Codex implement.
> Prior non-negotiables hold for the GAME code (sim/content untouched; procedural game art; 351
> tests; strict painter gates). NEW allowance: the desktop SHELL may add dev/app dependencies
> (Electron toolchain) — the WEB bundle stays zero-dependency (three.js aside) and deployable.

## Decisions (locked)

1. **Shell = Electron + electron-builder** (not Tauri): Steam overlay is Chromium-proven and
   steamworks.js is the mature Steamworks binding for later; Tauri/WebView2 has known Steam
   overlay problems. Steamworks itself is R3 (NOT now) — the shell must simply not preclude it
   (document the launch flags; keep main-process code structured for a steam module drop-in).
2. **PC resolution matrix** (all must be verified): 1280×720, 1600×900, 1920×1080, 2560×1440,
   3440×1440 (21:9), 3840×2160. Windowed + fullscreen. The mobile breakpoint
   (`max-width:820px / max-height:500px`) must be UNREACHABLE in the shell (min window 960×600).
3. **UI scaling**: auto UI-scale by resolution (≈ min(viewportH/900, viewportW/1600) clamped
   0.85–2.0) multiplying the existing `--ui-scale` user setting (existing 0.85–1.3 slider stays as
   a preference on top). Canvas DPR: raise desktop `dprCap()` to 2.5 and scale sprite cache size
   with the auto-scale so board art stays crisp at 1440p/4K.
4. **Input**: keyboard+mouse first on PC — hover states everywhere, keep touch support intact
   (Steam Deck touch / future mobile). Tutorial/photo/help wording adapts by `pointer: fine`.
   Add keybinding surface later (R3); existing keys (V, P, R, Esc, Konami) documented in How-to-Play.
5. **Saves**: keep localStorage inside the shell for now (Electron persists it per-app);
   R3 moves to file-based + Steam Cloud. The existing export/import save codes are the bridge.
6. **Web build stays alive** (dev loop + shareable link); the shell wraps the same `dist/`.

## Packets

- **S-A (Opus) "PC Resolution & Input Pass"** — owns `src/ui/**`, `src/style.css`,
  `src/render2d/renderer2d.ts`+`camera2d.ts` (DPR/auto-scale plumbing), `src/core/device.ts`,
  `src/main.ts` (auto-scale bootstrap): implement decision 3+4; drive Playwright at the full
  matrix (add nothing to tools/ — S-C builds the sweep tool; coordinate via matching viewport
  lists); fix every layout break (house map/title/HUD/sheets/modals at 720p→4K and 21:9);
  fullscreen toggle button (web: Fullscreen API; shell: window.gameShell?.setFullscreen bridge if
  present) in settings + F11; settings gains a "Display" section (fullscreen, UI scale incl. Auto).
- **S-B (Opus) "Electron Shell"** — owns NEW `app/` dir + `package.json` (additive scripts/deps)
  + root config: Electron main (single BrowserWindow, borderless-fullscreen default, windowed
  toggle, min 960×600, persisted window state), preload exposing a tiny `gameShell` bridge
  (fullscreen, quit, version), loads `dist/` (prod) or the vite dev server (dev); electron-builder
  (Windows NSIS + portable), app icon wired from S-C's generated .ico; scripts: `app:dev`,
  `app:pack`; Steam-overlay-readiness notes (flags, steamworks.js drop-in point) in `app/README.md`.
  MUST NOT touch game src except (if unavoidable) a guarded `window.gameShell` type decl.
- **S-C (Codex) "Icon + Resolution Sweep Tool"** — owns `tools/gen-icon.mjs` (renders the Crumb
  King/cake sprite via the existing in-browser painter pipeline to 16/32/48/256 PNGs + .ico at
  `app/build/icon.ico`; procedural, no external assets) and `tools/shot-res.mjs` (Playwright
  sweep: title/levels/hud/battle at the §2 matrix, files `shots/res-<w>x<h>-<scene>.png`).
- **S-QA (Opus)** — full-matrix sweep via shot-res, READ everything, fix in-lane/report; boot the
  packed exe (`app:pack` output) headfully via Playwright's Electron driver or manual spawn +
  screenshot; gates (tsc/351/build/smoke/strict painters); ship verdict.

## Ownership
| Files | Owner |
|---|---|
| src/ui/**, style.css, renderer2d.ts, camera2d.ts, device.ts, main.ts | S-A |
| app/**, package.json, electron configs | S-B |
| tools/gen-icon.mjs, tools/shot-res.mjs | S-C |
| BUILDLOG/RESUME/plans | Fable |

## Addendum: TITLE SCREEN v3 — "the composed stage" (2026-07-05, user screenshot review)

The v2 diorama scattered at large/tall desktop viewports (props %-anchored to the viewport).
LOCKED redesign:
1. The whole title is ONE fixed-aspect STAGE (1600x900 design space) scaled uniformly to fit the
   viewport (contain), centered; beyond it a subtly darker wall tone (elegant letterbox). Identical
   composition at every resolution/aspect.
2. In-stage composition (background -> front): kitchen wall + window (sun, day tint) upper-left
   THIRD; a counter running the FULL stage width across the bottom third; ON the counter: fridge
   (left, tall silhouette; poetry magnets are a SMALL prop on its door -> tapping opens the magnet
   mini-game as a centered overlay modal — declutter win #1), the birthday CAKE (center-left on
   the counter, candles lit — it IS the stakes), toaster (right) with the peeking critter.
3. Center column hierarchy: wordmark -> subtitle -> DEFEND THE CAKE! CTA -> one tidy row/grid of
   compact secondary tiles (Infestation/Journal/Junk Drawer/Daily Chore/How to Play) -> footnote.
   Status ribbon stays top-center; light-switch settings top-right (in-stage).
4. Packets: TS-D (Codex) `src/ui/titleSceneData.ts` — pure stage-coord geometry for props (window,
   counter, fridge, cake, toaster, switch positions/sizes). TS-B (Opus) rebuilds buildTitle as the
   stage (owns screens.ts title region, style.css title block, magnets-overlay rehost; consumes
   titleSceneData; may render sprites via spriteCache for props). TS-QA (Opus) sweeps the full
   resolution matrix via tools/shot-res.mjs + mobile, fixes in-lane.

## Addendum 2: STORE + BELTS + PLACEMENT + SHUTTLE (2026-07-05, user directives — LOCKED)

1. PLACEMENT: fix the can't-place bug; new rule = towers placeable on ANY standable tile (surface
   or clutter). Floor/surface-placed towers are NON-BLOCKING mounts (pathing unchanged — mazing
   keeps its value); clutter mounts unchanged. Sim edit authorized; 351+balance must stay green.
2. STORE (BP currency): buy towers/blocks/power-ups once, use everywhere. Belts: 5 towers /
   3 blocks / 3 power-ups. In-game belt drawer edits WITHOUT pausing (sheet already non-pausing).
   HUD bar shows BELT ONLY (fixes icon flood). Store cards: kid-voice desc + LIVE stats from defs
   (dmg/rate/range/effects — programmatic, never hand-typed). Power-up cards add a tiny example
   diagram. Starter kit owned free: sgt-spritz, old-smacky, 2 clutter shapes, lemon-smite.
   Tutorial allowedTowers intersects belt (allowedTowers wins if empty ∩). Infestation deck
   unchanged. Existing saves: grant starter kit + keep BP.
3. NEW BLOCKS: +2-3 static clutter shapes AND the SHUTTLE block — deterministic patrol (e.g. 2
   tiles left, 2 right), towers ride it, grid/path updates as it moves. Additive content def;
   inert unless placed; new sim tests required.
4. PRE-PLACEMENT PATH PREVIEW: pure sim helper (grid clone) computes the hypothetical route while
   hovering a block; render as a dashed alt-color ghost ribbon next to the live one.
5. PACKETS: M-3 (Codex, NOW) src/ui/storeData.ts catalog (prices+descs for 29 towers/all blocks/8
   spells + stat-extraction spec). M-1 (Opus, after crumb-magnet lands — owns sim/content/game.ts):
   placement rule+bug, shuttle, preview helper+wiring, new clutter shapes, tests. M-2 (Opus, after
   TS-B lands — owns ui/save/style): save schema (owned+belts, additive), store screen, belt
   drawer, HUD belt filter, stats rendering. Then QA + installer rebuild + deploy.
