# COUNTER ATTACK! — Critters vs. Housewares

A 3D tower defense where your house fights back. During a thunderstorm birthday wish, every
gadget and utensil woke up — and the neighborhood critters are marching on the birthday cake.
The cake IS your health bar. Ten slices. Sweep the crumbs or the swarm smells them.

**40 levels across 9 rooms** (kitchen → sewers) · **24 living towers** · **45 critter species
incl. 9 bosses** · **8 spells** · crumb economy + scent meter · tetromino clutter mazing ·
mutation drafts · a 3D Hand avatar (flick, squash, sweep, carry, high-five) · full mobile/touch
support · 100% procedural assets (no external files, legally clean).

## Play / develop

```bash
npm install
npm run dev        # local dev server (vite) → http://localhost:5173
```

Desktop: mouse (drag = flick/sweep, wheel = zoom, right-drag = orbit).
Phone: full touch — pinch zoom, two-finger orbit, long-press to carry towers. Landscape only.

## Build & deploy

```bash
npm run build      # typecheck + static bundle in dist/
```

`dist/` is a fully static site (base `./`). Deploy anywhere:
- **itch.io**: zip the contents of `dist/` and upload as an HTML5 game (index.html at zip root).
- **Vercel / Netlify**: point at the repo, build command `npm run build`, output dir `dist`.
- **GitHub Pages**: push `dist/` to a `gh-pages` branch (or use an action).

No server, no accounts, works offline after first load. Saves live in localStorage.

## Quality gates

```bash
npm test           # 200+ deterministic sim tests incl. balance gates for all 40 levels
npm run smoke      # headless boot, fails on console errors
npm run shot       # Playwright screenshot sweep to shots/
npm run balance    # scripted par-player difficulty report
```

The sim is a fixed-timestep (30 Hz) deterministic core — seeded RNG, no wall-clock — so
replays, ghosts, and future multiplayer netcode bolt on cleanly.

Design law lives in `GAME-PROMPT.md`; build status in `BUILDLOG.md`; conscious cuts in `CUTS.md`.
