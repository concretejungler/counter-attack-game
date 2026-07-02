# CUTS.md — consciously deferred, per GAME-PROMPT §0.2

Nothing here is abandoned; each entry has a reason and a natural return point.

## Cut from Phase 2 scope (this build reaches "all 40 levels playable, all 24 towers, full bestiary")

| Feature | Reason | Return point |
|---|---|---|
| Pets: loyalty meta-progression, treat bribes (lane blocker), hairball AoE, Betrayal ender, 30s-stare unlock, K.O.I. THE DESTROYER form, cosmetics | Core cat/dog/goldfish behaviors landed this pass (see dedicated section below); these are the meta/cosmetic/escalation layers on top | P3 (meta-progression pass) for loyalty/cosmetics; P4 for Betrayal loss vignette + K.O.I. form |
| Jarring + shinies + Critterdex | Capture flow needs dedicated Hand UX + meta screens | P3 (pairs with meta-progression) |
| Grudge system (named elites) | Needs escape tracking + wave-preview taunts UI | P2 back-half |
| Mutation drafts in versus form | Multiplayer-only rule | P5 |
| Prof. Scorch window-LOS power scaling | Needs per-level window metadata; flat beam ships instead | Polish pass |
| Mike Rowave overclock explosion risk | Push-your-luck death needs its own UX warning; branch ships as plain +dmg | Polish pass |
| Static balloon hand-rub reload | Tactile reload needs a bespoke gesture; auto-recharge ships | Polish pass |
| Cricket Bard weeping-angel (moves only off-screen) | Camera-coupled sim breaks determinism contract; ships as speed-aura buffer | Needs design rework, maybe never |
| Lux Interior flier-aggro magnetism | Steering override conflicts with flow-field pathing; reveal+zap ships | P2 back-half |
| Boss set-pieces (Rat King tower-steal, Bedbug Baron light-swipe, Clogsworth drain-plug puzzle, Grandma web-tear Hand verb, Possum fake-loot bombs, Trash Panda pet-bribe) | Bosses ship with trait-driven mechanics (submerge/stealth/splits/spawner/webber/towerSmash + playDeadTimes); set-pieces need scripted phases | Boss polish pass, one boss at a time |
| ~~EXTERMINATOR alliance finale (critters fight alongside towers)~~ LANDED | Sim-side mechanic shipped this pass (see dedicated section below) — the vignette VISUALS (render/ui/game.ts side: camera punch, defection VFX, recap beat) are still a later pass | render/ui pass, sim contract (allied flag + alliance/allianceKill events) is ready for it |
| ~~Exterminated loss vignette wiring~~ LANDED (sim-side) · Condemned/Betrayal loss reasons | `exterminated` now fires correctly (see dedicated section below); `condemned` and `betrayal` remain investigated-and-skipped — see dedicated section below for why | Condemned needs a furniture-integrity system; Betrayal needs a way to actually hit the cat. Loss vignette ART (all three) is P4 with enders art regardless |
| Vroomba bag-burst (full bag ambush) | Suck is instant-kill for now; bag economy adds bookkeeping | Polish pass |
| Title-screen live 3D backdrop | Title is a DOM overlay above an empty canvas; needs game.ts restructure | P4 polish |
| 3-star challenge tracking for new worlds' bespoke challenge ids | Kitchen challenge ids are wired; worlds 2-9 challenge ids defined in content but evaluators not yet implemented (3rd star falls back to unearned) | P3 meta pass |
| Photo Mode GIF export ("one-click GIF export of the last 10 seconds", §18) | Static PNG snap shipped this pass (`GameRenderer.snapPhoto()` + download link). A rolling 10s GIF needs either an in-browser frame-ring-buffer + encoder (gif.js or similar, pure-JS to keep the zero-asset/legally-clean deploy contract) or a MediaRecorder canvas-capture pipeline — meaningfully bigger scope than the slider/snap work in this pass | P4 polish continuation, or P5 alongside other capture/sharing features |
| Fridge poetry magnets: the other 10 secret-word combos ("12 words total, other secret words do other things", §20.4) | This pass ships OPEN+SESAME (the one explicitly spec'd reward) plus 8 flavor-only tiles with no behavior; a full secret-word table (CAKE/DOOM/MOM/etc. each doing something) is its own content-design pass | P4 polish continuation |

## EXTERMINATOR alliance finale + loss reasons (landed this pass, GAME-PROMPT §8.9/§19)

Sim-side only, per this pass's file ownership (`src/sim/types.ts`, `critters.ts`, `sim.ts`,
`towers.ts`; `pets.ts` and `content/levels/sewer.ts` were in-scope but needed no changes). No
render/ui/game.ts touched — the vignette VISUALS (defection VFX, camera beat, recap screen) are a
later pass, same as every other loss-vignette item already in this file.

**The flip.** `Critter.allied?: boolean` (additive). `sim.ts`'s wave-spawn tick loop watches for
`req.critter === 'the-exterminator'`; the instant he spawns, `Sim.triggerAlliance()` flips every
critter that was *already alive* at that tick to `allied: true` and emits `{ t: 'alliance'; count }`
— the boss himself and any other co-occurring boss are excluded. A flipped critter's in-flight
state (mid-bite, fleeing, chewing clutter, latched onto a tower) is reset to a clean `walk` so
`critters.ts`'s new `alliedBrain` takes over immediately — the flip needed to read instantly, not
finish out a stale action first. A defector caught mid-heist (a thief carrying a stolen slice)
drops it back (same "slice recovered" treatment a kill would give it). Escort entries authored to
spawn *after* the boss (his own reinforcements) are untouched and stay hostile — this was an
explicit design call from the brief ("alive-at-spawn defect" only, keep it simple).

**Allied behavior.** `alliedBrain` ignores the cake/flow-field entirely, steers toward
`the-exterminator`, and swings at him once in range on a 0.5s per-swing cooldown (`meleeT`, a
dedicated field — NOT reusing `pulseT`, which several existing traits like `healPulse`/
`towerSmash`/`spawner` already use for their own per-critter cadence and could collide with).
Per-swing damage is `def.chewDps ?? max(1, def.bounty / 4)` — the design call the brief invited
("pick something sane"). **Balance finding during implementation:** the first version applied
`dps * dt` to `damageCritter` every single tick; `damageCritter`'s armor reduction floors to a
minimum of 1 damage per *call*, so calling it 30x/sec let even a trivial-dps ally punch through the
boss's armor-10 at 30x the intended rate (a handful of ants "chipping" him for hundreds of DPS
combined). Switched to one real swing every `ALLY_MELEE_PERIOD` (0.5s) so armor stays meaningful —
this is the same reason towers gate their own damage behind a `1/rate` cooldown instead of a
per-tick dribble. If an ally lands the killing blow, `killCritter` emits
`{ t: 'allianceKill'; by: <critter def id> }` — the recap/story beat the brief asked for.

**Towers ignore allies.** `towers.ts`'s shared `candidates()` (used by direct-target, aura, and
splash/cone/slam damage alike) skips `cr.allied`, plus the two call sites that iterate
`ctx.state.critters` directly instead of through `candidates()` (Vroomba's `suckSize` insta-kill
loop, and trap-tower triggering) — both needed the same explicit skip since they bypass the shared
helper. Hand verbs (`squash`/`flick`, in `hand.ts`, out of this pass's file ownership and not asked
for) were deliberately left untouched — the brief only specified tower targeting, and it's a
plausible bit of chaos for the player to still be able to flick/squash a newly-defected ally by
mistake; that's a UI/design nuance for the vignette pass, not a sim bug.

**Wave-clear logic changed.** Was `waveRt.done && critters.size === 0`; is now `waveRt.done && no
non-allied critter remains` — allied critters (fighting the boss, or idling harmlessly after he's
already dead) never block a wave from clearing, matching the brief's spec precisely.

**Loss reasons.**
- `exterminated`: the cake-zero check now also scans for a living `the-exterminator`; if he's still
  up when the last slice goes, `lose('exterminated')` fires instead of `'cakeDevoured'`. Verified
  both against a test fixture and against the real sewer-3 content/waves (a scratch probe run
  against `content/levels/sewer.ts`'s actual finale wave, since deleted — the mechanic and loss
  reason both fired correctly through the real production spawn path).
- `condemned` (termite-family `clutterEater` critters destroying the last clutter piece): **skipped,
  per the brief's own instruction** — there is no furniture-integrity/structural-damage system in
  the sim at all (clutter destroyed by chewing just... clutters less; nothing tracks a
  level-wide "percent of furniture destroyed" or distinguishes player-placed clutter from anything
  else). Building a real one to make this loss condition *fair* (the brief explicitly says "do NOT
  lose, that'd be unfair" for the naive version) is a system, not a wire-up, and stays a return
  point for whenever that system lands.
- `betrayal` (10 stray hits on the cat): **skipped, confirmed unreachable by design** — the cat is a
  `PetState`, not a `Critter`; nothing in the damage pipeline can target it. Towers' `candidates()`
  and every splash/slam/aura loop iterate `ctx.state.critters` exclusively. The Hand's `squash`/
  `flick` (`hand.ts`) take a `critterId` and look it up in `ctx.state.critters` — a pet id would
  simply fail the lookup and no-op. There is no "stray shot" concept anywhere (towers pick one
  target and hit it; nothing rolls to miss onto an unrelated entity). This matches the existing
  Pets section below, which already flagged Betrayal as needing "a 'stray shot hit the cat'
  detection path in the projectile/damage pipeline" that doesn't exist yet — confirmed again this
  pass, still the right call to skip rather than bolt on a fake miss-mechanic just to wire an event.

**Tests:** `tests/finale.test.ts` (13 tests) — the flip (alive-at-spawn only, post-boss escorts stay
hostile, thief slice recovery), tower/splash/trap/roam immunity for allies, allies never reaching
`eatCake`, allies actually damaging + eventually killing the boss (`allianceKill` with correct
`by`), wave-clear gating (blocks on hostile stragglers, clears with a lone surviving ally),
`exterminated` vs `cakeDevoured` loss-reason selection, and two determinism guards (a normal level
byte-identical to a pre-feature run; a normal level never emits `alliance`/`allianceKill`). All 312
pre-existing tests plus these 13 are green (325/325), `tsc --noEmit` clean, and `sewer-3`'s
`tests/balance-w6789.test.ts` par entry needed NO retuning — byte-identical W(0b,w12) across all 3
seeds before and after (the par garrison is strong enough that the pre-boss escort is usually
already dead by the time the-exterminator spawns, so the flip's `count > 0` guard often doesn't even
fire on that specific script — verified separately with a weaker build that it does fire correctly
against the real content).

## Director AI + Random Events + Oh-Crap Scenarios (landed this pass)

Director AI (§13), Random Events (§11), and Oh-Crap Scenarios (§12) are now implemented in
`src/sim/director.ts` + `src/sim/events.ts` + `src/content/events.ts`, gated fully inert by
default (`SimOptions.director`/`SimOptions.events`, both default `false`; `LevelDef.director`/
`LevelDef.eventChance` are additive per-level overrides). Tests: `tests/director.test.ts`,
`tests/events.test.ts`. UI wiring (forecast panel, event banners, choice countdown prompt) is a
later pass — these systems currently only speak SimEvents/SimCommands.

11 EventDefs shipped in `src/content/events.ts`, mapped onto the small set of sim-consumable
effect keys the engine implements directly (`crumbRain`, `powerOutage`, `gust`, `tvTruce`,
`scentSpike`, `quake`, `leftoverNight`, plus the four Oh-Crap choice effects). Not every §11 gag
maps onto that effect set; the ones that don't are cut here rather than half-implemented:

| §11 event | Reason cut | Return point |
|---|---|---|
| Mom's Sweep (a broom crosses one row — kills critters AND towers, 10s shadow warning) | No existing effect key models "instant-kill a whole row of BOTH factions with a telegraphed warning phase"; would need its own bespoke sweep-hazard system, not a reuse of any existing damage path | Dedicated hazard-event pass |
| Grease Fire (spreads; fans make it worse; water makes it MUCH worse) | Needs a simulated spreading hazard with cross-tower-type interaction rules (a physics joke); out of scope for the fixed effect-key set | Dedicated hazard-event pass |
| Door-to-Door Salesman (Faustian shop: one overpowered tower for one permanent extra Mutation) | Needs a bespoke offer/accept UI flow distinct from the mutation draft and the Oh-Crap choice machinery (grants a TOWER, not an effect) | P3, alongside meta shop screens |
| Roomba Firmware Update (Vroomba reboots… or comes back with a laser; 50/50) | Targets a specific placed tower instance (Vroomba) rather than being a global board effect; needs per-tower-instance event targeting the current engine doesn't have | P2 polish, once tower-targeted events exist |
| The Fly (immortal fly harasses the actual UI — buttons dodge slightly; click it 3 times for an achievement) | Explicitly a UI/DOM gag (GAME-PROMPT flags this itself as UI-layer), not sim state — belongs in `src/ui/` + achievements, not the sim event engine | UI polish pass |
| Sunbeam Shift (the cat relocates to a new sunbeam, flattening whatever was there) | Pets (see dedicated section below) now give the cat a real seeded floor position that relocates every build phase already — Sunbeam Shift would just be this same relocation retargeted as a random-events roll with a "flattens whatever was there" clutter-clearing side effect, which needs events.ts's effect-key set extended (`petSunbeamShift` or similar) | P2 polish, small — the cat relocation primitive already exists in `pets.ts::relocateCat` |
| Bug Bounty (a golden critter sprints the map; kill it for a jackpot, miss it and it taunts you) | Needs a dedicated fast-timer critter-hunt mode with its own reward/taunt UI hook, not just a spawn — closest existing analog (shiny critters, §2.5) already covers "special critter with a reward," so this would be redundant without a bespoke taunt/Critterdex hook | P3, alongside Critterdex polish |

Everything else from §11 (Doorbell Package, Power Outage, Open Window Gust, TV Time Truce, Spin
Cycle Quake, Leftover Night) plus Ant Diplomacy (§11, implemented as a choice event per its own
description) shipped, along with the four required Oh-Crap choice scenarios (Ant Diplomacy, The
Overload Choice #4, The Crumb Avalanche #10, The Sock Strike #8). The other seven §12 scenarios
(#1 The Split Wave, #2 The Hostage Slice, #3 The Jar Decision, #5 Gecko's Last Supper, #6 The Bee
Tribunal, #7 Cat on the Counter, #9 Double Boss Doorbell) were not in this pass's required four
and remain future work for the same choice-machinery (`pendingChoice`/`choose` command are
general-purpose — adding a new scenario is just a new EventDef with a `choice` block plus a new
`EventEffectKind` case).

## Pets (landed this pass)

GAME-PROMPT §9's core cat/dog/goldfish behaviors are implemented in `src/sim/pets.ts`, wired into
`src/sim/sim.ts`, and rendered via `src/render/models/petModels.ts` + a `PetView` sync pass in
`src/render/renderer.ts`. Fully inert by default (`SimOptions.pet` is `undefined` unless a level
shell explicitly sets `'cat' | 'dog' | 'goldfish'`) — a dedicated determinism test proves omitting
`pet` and passing `pet: undefined` produce byte-identical sims, so the 253 pre-existing tests and
every balance par-script (which never sets `pet`) are unaffected. All pet randomness draws from a
dedicated `petRng` stream (seeded `seed ^ 'PETS'`, same XOR-mix convention as `shinyRng`/`grudgeRng`)
so a pet never perturbs the main gameplay RNG sequence. Tests: `tests/pets.test.ts` (16 tests).

Shipped:
- **Princess Destructo (cat):** lounges at a seeded floor spot, relocating every build phase
  (`petMove` event). 20% chance per `waveStart` to SWAT a seeded random tower — disables it 5s and,
  if a legal adjacent floor tile exists (reusing the same legality rules as carry-drop trap
  placement: in-bounds, not statically blocked, not clutter, not the cake/spawn tiles, not another
  floor tower), knocks it there off its clutter mount; if no legal tile exists it's just disabled in
  place. Once per LEVEL, if >=12 critters are alive: POUNCE — kills a seeded 30% of live critters
  (`petPounce`, shuffle-and-take-N on `petRng`), then swats whichever tower has the highest kill
  count ("eye contact").
- **Sir Barksalot (dog):** sits near the cake's climb base. Auto-BARKs (`petBark`) whenever >=8
  critters are alive and off a 30s cooldown: every currently-alive critter is stunned 2s (via the
  existing `stunned` status, same field towers/spells use). Downside: `Sim.dropCrumbs` routes every
  drop through `dogCrumbTax()`, which eats a floored 15% of the value (min 0) before the crumb entity
  is created — verified directly against the untaxed math (bounty 25 -> taxed 22) rather than via an
  aggregate before/after comparison, since the bark's stun side effect (critters held in a tower's
  range longer) legitimately changes total kill counts and would make an aggregate crumb-value
  comparison an unreliable signal for the tax in isolation.
- **The Oracle (goldfish):** bowl at a fixed seeded spot. Passive: every build phase, emits a
  `petProphecy` event carrying the FULL next-wave composition (species x counts, pre-aggregated) —
  no downside, no crumb tax. UI rendering of the prophecy text is out of this pass's file ownership
  (sim-only contract: the event carries structured data, not display copy).
- Render: `petModels.ts` ships three bespoke procedural models matching the toy-box style of
  `critterModels.ts`/`towerModels.ts` — cat (loaf pose, idle tail flick, ears-back + faster tail-lash
  "active" mood, crouch-lunge squash on punch()), dog (sitting pose, idle tail wag + periodic ear
  perk, head-dip + hop bounce on punch()), goldfish (glass bowl via `MeshPhysicalMaterial`
  transmission, orbiting fish, shimmering water-sheen opacity, pebbles). `renderer.ts` syncs
  `PetState.pos`/`.mood` every tick like a tower and plays a quick scale-punch beat on
  `petSwat`/`petBark`/`petPounce` via each view's `punch()` method, plus VFX/camera-shake hooks
  (poof on swat, sonic pulse on bark, confetti + bigger shake on pounce). Verified end-to-end by
  booting `GameRenderer` directly against a fabricated `Sim` for all three pet kinds and confirming
  clean render output with no console errors (scratch verification, not committed — game.ts owns the
  actual pet-picker UI wiring and was out of this pass's file ownership).

Deferred (see table above for the summary row):
- **Loyalty meta-progression** ("loyalty carries across a run") — needs a persistent save-file
  concept that doesn't exist until the Junk Drawer meta-progression system (§18) lands.
- **Treat bribes** ("bribe with treats (consumable) to make her sit on a lane as an unkillable
  blocker") — needs a consumable-item inventory concept and a new lane-blocker entity type distinct
  from towers/clutter; no such primitive exists yet.
- **Hairball AoE** — a distinct cat attack beyond the spec'd swat/pounce; the brief scoped pets down
  to "swat a tower" + "pounce kills %", so hairball wasn't part of the required simplified core.
- **The Betrayal** (hit the cat with 10 stray shots -> game-ender) — `LossReason` already has a
  `'betrayal'` case in `types.ts` (landed in the Director/Events pass) but nothing fires it yet; would
  need a "stray shot hit the cat" detection path in the projectile/damage pipeline plus the loss
  vignette itself, which is explicitly a P4-with-enders-art item per the existing cut table row.
  Wiring the trigger condition itself is a small addition once enders art exists.
- **The Oracle's 30-real-seconds-camera-stare unlock + K.O.I. THE DESTROYER form** — explicitly
  named in the brief as "go to CUTS.md": the stare mechanic is camera-input-coupled (needs the
  renderer/UI to detect "camera hasn't moved for 30 real seconds while looking at the bowl"), which
  is a UI/input concern outside the sim-only file ownership of this pass, and K.O.I.'s buffed-tower
  form needs a whole second tower-stat-override pathway. The Oracle's *passive* behavior (full
  next-wave prophecy every build phase) — the "does nothing, mostly" default state the spec
  describes — is what shipped; the escalation form is the return point.
- **Pet cosmetics** ("pet cosmetics exist and they are adorable") — a content/meta concern, not a
  sim/render mechanic; return point is the same Junk Drawer meta pass as loyalty.
