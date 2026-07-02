# CUTS.md — consciously deferred, per GAME-PROMPT §0.2

Nothing here is abandoned; each entry has a reason and a natural return point.

## Cut from Phase 2 scope (this build reaches "all 40 levels playable, all 24 towers, full bestiary")

| Feature | Reason | Return point |
|---|---|---|
| Pets (cat/dog/goldfish) | Whole subsystem (loyalty, bribes, betrayal ender) — no level depends on it | P2 back-half pass |
| Jarring + shinies + Critterdex | Capture flow needs dedicated Hand UX + meta screens | P3 (pairs with meta-progression) |
| Grudge system (named elites) | Needs escape tracking + wave-preview taunts UI | P2 back-half |
| Mutation drafts in versus form | Multiplayer-only rule | P5 |
| Prof. Scorch window-LOS power scaling | Needs per-level window metadata; flat beam ships instead | Polish pass |
| Mike Rowave overclock explosion risk | Push-your-luck death needs its own UX warning; branch ships as plain +dmg | Polish pass |
| Static balloon hand-rub reload | Tactile reload needs a bespoke gesture; auto-recharge ships | Polish pass |
| Cricket Bard weeping-angel (moves only off-screen) | Camera-coupled sim breaks determinism contract; ships as speed-aura buffer | Needs design rework, maybe never |
| Lux Interior flier-aggro magnetism | Steering override conflicts with flow-field pathing; reveal+zap ships | P2 back-half |
| Boss set-pieces (Rat King tower-steal, Bedbug Baron light-swipe, Clogsworth drain-plug puzzle, Grandma web-tear Hand verb, Possum fake-loot bombs, Trash Panda pet-bribe) | Bosses ship with trait-driven mechanics (submerge/stealth/splits/spawner/webber/towerSmash + playDeadTimes); set-pieces need scripted phases | Boss polish pass, one boss at a time |
| EXTERMINATOR alliance finale (critters fight alongside towers) | Faction-flip needs friendly-critter combat + AI; finale ships as hardest siege with towerSmash pressure | P4 (it's the story payoff — must return) |
| Condemned/Betrayal/Exterminated loss vignettes | Loss reasons exist in types; only cakeDevoured/theSwarm fully wired | P4 with enders art |
| Vroomba bag-burst (full bag ambush) | Suck is instant-kill for now; bag economy adds bookkeeping | Polish pass |
| Title-screen live 3D backdrop | Title is a DOM overlay above an empty canvas; needs game.ts restructure | P4 polish |
| 3-star challenge tracking for new worlds' bespoke challenge ids | Kitchen challenge ids are wired; worlds 2-9 challenge ids defined in content but evaluators not yet implemented (3rd star falls back to unearned) | P3 meta pass |

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
| Sunbeam Shift (the cat relocates to a new sunbeam, flattening whatever was there) | No "cat" pet/NPC entity exists yet (pets are their own cut system, see table above) — this event depends on that landing first | After pets land |
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
