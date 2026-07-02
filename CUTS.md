# CUTS.md — consciously deferred, per GAME-PROMPT §0.2

Nothing here is abandoned; each entry has a reason and a natural return point.

## Cut from Phase 2 scope (this build reaches "all 40 levels playable, all 24 towers, full bestiary")

| Feature | Reason | Return point |
|---|---|---|
| Pets (cat/dog/goldfish) | Whole subsystem (loyalty, bribes, betrayal ender) — no level depends on it | P2 back-half pass |
| Jarring + shinies + Critterdex | Capture flow needs dedicated Hand UX + meta screens | P3 (pairs with meta-progression) |
| Grudge system (named elites) | Needs escape tracking + wave-preview taunts UI | P2 back-half |
| Director AI | Levels are hand-tuned; Director replaces static waves later | P2 back-half |
| Random events (14) + Oh-Crap scenarios (10) | Scripted-moment engine not built | P2 back-half |
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
