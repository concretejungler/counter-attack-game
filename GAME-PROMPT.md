# COUNTER ATTACK!
### *Critters vs. Housewares — a tower defense of household proportions*
**Master Build Prompt — v1.0**

---

## 0. PRIME DIRECTIVES (read before anything else)

1. **Build autonomously.** Do not ask the user questions. Make every creative and technical decision yourself using this document as law. If something is ambiguous, pick the more fun, more challenging option.
2. **No placeholder anything.** Every tower, critter, effect, menu, and sound described here ships finished. If a feature must be cut for scope, log it in `CUTS.md` with a reason — never ship it half-done.
3. **Hard but fair.** Tune above genre norms. The player should lose often, understand exactly why, and immediately want one more try.
4. **Desktop first, deployable always.** The game must run locally on a Windows desktop today and deploy to a public URL with one command later. Web-first tech stack (Section 29).
5. **100% original assets.** All models, textures, audio, and names are generated/built from scratch. Homages to other games are parody-level winks (renamed, redesigned) — nothing copyrightable is copied.
6. **Juice is mandatory.** Every click, kill, coin, and crit must feel tactile: squash-and-stretch, particles, screen feedback, sound. If an interaction feels dry, it isn't done.

---

## 1. VISION

**The pitch:** During a thunderstorm, a kid makes a birthday wish — *"I wish my house could fight back!"* — at the exact moment lightning hits the smart-home hub while the microwave runs the popcorn setting with a fork inside. The house wakes up. Every gadget, utensil, and unwashed sock now has eyes, a personality, and a grudge. The critters of the neighborhood, organized by a shadowy "Lord Beneath the Fridge," march on the one thing that matters: **the birthday cake**. The cake's candles hold the wish. If the cake is fully eaten, the wish ends — and so do your living towers.

**Your health bar is literally the cake.** Ten slices. Every critter that reaches it takes a visible bite. The game-over screen is critters throwing a party on an empty cake plate.

**Genre fusion (the "popular game" combination):**
- **Slay the Spire** → the flagship roguelike mode: branching house-map runs, tower-card drafting, relics, curses, permadeath. The "one more run" engine.
- **Tetris** → maze-building: walls are tetromino-shaped household clutter you draft and place — and your towers mount on top of them.
- **Bloons TD Battles** → versus multiplayer: spend your economy to send critters at your opponent.
- **Pokémon** → the capture system: weaken rare critters and **jar them** to convert them into one-of-a-kind living towers. Shiny variants exist. Shiny hunting is real.
- **Left 4 Dead** → the Director AI: the infestation studies your build and adapts.

**Tone:** Saturday-morning cartoon meets Pixar short. Slapstick, never gross-out. Critters die in cartoon poofs with little halo float-ups. The sock is unionizing. The toaster and the fridge are exes. Everything is played for laughs except the difficulty, which is dead serious.

---

## 2. THE TWIST STACK (what makes this unlike any other TD)

These six systems interlock. All six ship.

### 2.1 The Crumb Economy (currency that fights back)
Kills drop **physical crumb particles** on the board. Crumbs are the only in-run currency — but they don't bank themselves. You must **sweep** them (drag the cursor through them toward a dustpan, or let a vacuum tower collect). Unbanked crumbs:
- Fill the **Scent Meter** (a literal nose gauge). Wave size and aggression scale with it.
- Can be **eaten by critters mid-wave** — an ant that eats 5 crumbs molts into a Soldier on the spot.

Scent thresholds: **25%** = +10% wave size · **50%** = scout critters spawn *between* waves · **75%** = elite raid party klaxon · **100% held for 60s** = THE SWARM (a near-unsurvivable megawave; see Game Enders). Greed is a dial the player holds: bait builds deliberately farm high scent into kill-zones for jackpot rewards.

### 2.2 Clutter Mazing (Tetris walls that are also real estate)
Each build phase deals a **Clutter Hand**: 3 tetromino-shaped junk pieces (cereal box L, book-stack I, Tupperware S, shoe T...). Clutter is simultaneously **maze wall** and **tower foundation** — towers mount on top of it. Clutter is destructible: termites and mice chew it; collapsing clutter drops the tower on it (stunned, must be re-stood by hand). Full path-blocking is **legal but futile**: blocked critters chew through the shortest wall. Mazing buys *time*, never *safety*.

### 2.3 The Mutation Draft (you choose how the enemy evolves)
After every boss and every 5th wave, the infestation evolves — and **you pick its mutation** from 3 cards (e.g., "All ants +20% speed" vs. "Roaches play dead twice" vs. "Flies become bubble-immune"). The horde always gets stronger; the player steers the damage around their build. In versus multiplayer, **your opponent picks for you**.

### 2.4 The Hand of the Homeowner (you are physically present)
The cursor is a 3D hand — the player's avatar. It can:
- **Flick** — slingshot-gesture a critter across the room (3 charges, recharge over time)
- **Squash** — thimble-press small critters (cooldown; bosses laugh at you)
- **Sweep** — drag crumbs to the dustpan
- **Carry** — pick up and relocate one tower mid-wave (8s cooldown; tower is offline while held)
- **Pet** the pet (loyalty up), **high-five** towers after a boss (morale buff; whiffing the high-five makes the tower visibly sad)

There is never an idle moment: sweep, flick, carry, and build all compete for your attention. That contention IS the skill ceiling.

### 2.5 Jarring (catch 'em all)
Rare **shiny critters** (1-in-100 spawns, announced by a Pavlovian chime) can be *captured instead of killed*: weaken below 20% HP, then slam a jar over them (Hand interaction, 2s channel — risky mid-wave). Jarred critters become **unique living towers**: Wasp-in-a-Jar (turret), Firefly Lantern (reveals stealth), Stag Buddy (blocker tank), Queen Ant Jar (spawns friendly worker ants that sweep crumbs FOR you). The Critterdex tracks every species killed *and* jarred. Completion is a long-haul addiction.

### 2.6 The Grudge System (your failures get names)
Any critter that bites the cake and **escapes alive** returns next wave as a named, crowned mini-elite with a bounty — "Greg the Glutton," "Janet the Unkillable." Grudges persist across the level, stack buffs each escape, and taunt you on the wave-preview screen. Killing one is a celebration event. (Shadow-of-Mordor for bugs.)

---

## 3. CORE LOOP & FUNDAMENTALS

- **View:** orbitable 3/4 diorama camera (rotate, zoom, tilt) with tilt-shift depth of field. Each level is a handcrafted room diorama.
- **Maps are vertical:** floor → chair → counter → shelf. Counters and tables have **edges** — knockback can shove critters off (fall damage; small critters splat, big ones rejoin the path below). Edge-play is a core tactic.
- **Wave rhythm:** Build phase (draft clutter, place/move towers, sweep) → Assault phase. Calling the next wave early banks bonus crumbs (Kingdom Rush rule). Speeds: 1×/2×/3×. Pause-and-place allowed on the two easier difficulties only.
- **Entries/exits:** doors, vents, drains, windows, under-couch portals — multiple simultaneous fronts are standard from world 2 on.
- **Anti-frustration valves:** free repositioning during build phase; sell at 90%; **Juice Box rewinds** — 2 per level, rewind game state 10 seconds. Losing a level shows a **Death Recap**: leak sources, scent-history graph, and "what the Director noticed about you."

---

## 4. ECONOMY SUMMARY

| Currency | Earned | Spent on | Twist |
|---|---|---|---|
| **Crumbs** (in-run) | kills (must sweep), early-wave bonus, bounties, honey | towers, upgrades, spell charges, bribes | uncollected crumbs strengthen the enemy |
| **Brownie Points** (meta) | level stars, achievements, quests, Critterdex milestones | Junk Drawer permanent unlocks, cosmetics, cake flavors | bonus BP for self-imposed House Rules |
| **Cake slices** (HP) | start with 10 | — | mice can STEAL slices — kill the thief before it exits to get the slice back |

**Cake flavor loadouts** (meta-unlocked): Classic Vanilla (10 slices) · Carrot (regrows 1 slice every 5 waves, start with 8) · Ice Cream Cake (12 slices but melts one per heatwave event) · Fruitcake (16 slices; all towers -10% fire rate because morale) · The Cupcake (1 slice — Nightmare loadout, massive BP multiplier).

---

## 5. TOWERS — THE HOUSEHOLD DEFENSE FORCE (24 + jarred uniques)

Every tower has: a name, a face, an idle personality loop, voice barks, 3 upgrade tiers, a choice of 2–3 branch paths at tier 3, and a max-level **Ascension** form with a new model. Damage types: Spray(wet) / Swat(physical) / Zap / Heat / Cold / Gas / Sonic / Light.

1. **Sgt. Spritz** (spray bottle) — rapid water shots. Paths: *Vinegar Vendetta* (acid DoT) / *Arctic Mist* (slow) / *Power Washer* (pierce knockback). Ascension: **The Hose Boss**.
2. **Old Smacky** (fly swatter) — melee arc slam, big knockback (edge-shove king). Paths: *Electro-Swat* (chain zap) / *Grand Slam* (AoE crater) / *Multi-Smack* (triple hit).
3. **Vroomba** (robot vacuum) — MOBILE tower; draw its patrol loop. Sucks small critters into its bag (full bag must be emptied at the trash or it bursts into a bug ambush). Also auto-sweeps crumbs on its path. Paths: *Turbo* / *Mega-Bag* / *DJ Roomba* (mounts a speaker, mobile buff aura).
4. **Sir Toastsalot** (toaster) — mortar that lobs flaming toast; applies *Buttered* (enemies slip on turns). Paths: *Bagel Barrage* / *Pop-Tart Napalm* / *Artisan Sourdough* (siege slabs). Renaming him "Talkie" unlocks chipper extra voice lines.
5. **Professor Scorch** (magnifying glass) — sunbeam laser; needs line-of-sight to a window; power scales with time-of-day/weather. Crits *Shrink* enemies. Paths: *Twin Lens* / *Greenhouse* (buffs plant towers) / *Death Ray*.
6. **Big Blow** (desk fan) — pushes critters, redirects fliers, **carries gas/spray clouds from other towers downwind** (combo enabler). Paths: *Cyclone* / *Crosswind* / *Ceiling Fan* (global gentle push).
7. **Stick Rick** (tape dispenser) — glue strips and flypaper. Paths: *Double-Sided* / *Flypaper Banners* (anti-air) / *Industrial Epoxy* (permanent snare zones).
8. **Snappy & Sons** (mousetrap family) — cheap one-shot traps, huge damage, manual re-arm. Paths: *Chain Reaction* / *Big Game* / *Humane Catch* (traps capture instead of kill — jarring synergy).
9. **The Coldfather** (mini-fridge) — slow aura; periodically swings his door open for a cold-blast AoE. Paths: *Deep Freeze* / *Open Door Policy* (constant weaker aura) / *Ice Maker* (ice floor patches — slide critters off edges).
10. **Mike Rowave** (microwave) — charge-up radiation beam. **Overclock** path: 2× power, 10%/sec chance to explode while overclocked (push-your-luck tower). Other paths: *Defrost* (strips cold-immunity) / *Popcorn Flak* (anti-air burst).
11. **Bubbles LaRoux** (bubble wand) — traps fliers in floating bubbles; popped bubbles splash slow. Paths: *Bubble Stream* / *Heavy Suds* (grounds fliers) / *The Big Bubble* (boss-slow).
12. **Saltimus Prime** (salt shaker) — shreds slugs/snails (type counter), lays temporary salt-line walls critters won't cross. Paths: *Sea Salt Cannon* / *The Rim* (circle zones) / *Pepper Twin* (adds sneeze-stun).
13. **The Daily Smack** (newspaper turret) — cheap mid DPS; each in-game day prints a random "headline" buff. Paths: *Tabloid* (fast) / *Broadsheet* (AoE slam) / *Subscription* (buff stacks daily).
14. **Gnomeo** (garden gnome) — taunt decoy; explodes into ceramic shrapnel on death; cheap to rebuild. Paths: *Gnome Wall* / *Martyrdom* (bigger boom) / *Creepy Stare* (feared critters path away).
15. **Lux Interior** (lamp) — attracts fliers/moths to itself (aggro magnet), then *Bug Zapper* path electrifies; *Disco Ball* path splits Professor Scorch's beam into 4; *Blacklight* reveals stealth.
16. **DJ Decibel** (boombox) — sonic AoE stun on the beat; aura buffs nearby tower attack speed (battle music). Paths: *Bass Drop* (ultimate slam) / *Lullaby* (sleep) / *Hype Track* (bigger buffs).
17. **Bandolero** (rubber-band ballista) — cross-room sniper, massive single-target. Paths: *Ricochet* / *Tripwire* / *The Long Goodbye* (charge-up one-shots).
18. **Eau de NO** (perfume bottle) — gas clouds that *Confuse* (critters fight each other); also masks Scent Meter locally. Paths: *Toxic Romance* / *Fog of Pew* / *Aromatherapy* (tower buff mist).
19. **Old Stinky** (the sock) — biohazard aura: poison DoT + fear. **Gets stronger every wave it is never moved.** Paths: *Gym Sock* / *The Pair* (deploy its lost twin anywhere; auras link in a corridor) / *Hazmat Zone*.
20. **Count Blendula** (blender) — short-range shredder; converts kills into Smoothie (chance to drop bonus crumbs pre-swept). Paths: *Frappé* (faster) / *Chunky Mode* (bigger gibs, AoE splash) / *Protein Shake* (smoothie heals 1 cake bite per 50 kills).
21. **Herr Tick-Tock** (cuckoo clock) — time magic: every 20s the cuckoo rewinds all critters in radius 3 seconds backward along their path. Paths: *Overwound* / *Time Zone* (slow field) / *Midnight Chime* (mass rewind, long cooldown).
22. **A.L.E.X.I.S.** (smart speaker) — command tower: buffs, marks priority targets, and calls **delivery-drone airstrikes** (parody cardboard boxes crush a tile). Paths: *Smart Home* (auto-casts your cheapest spell) / *Drone Prime* / *Firmware Overlord* (buffs all electronics).
23. **Audrey the Third** (houseplant) — bites adjacent critters; grows permanently with every Professor Scorch beam that passes through her pot. A loving PvZ wink. Paths: *Venus Classtrap* / *Pollen Burst* / *Jungle Gym* (spreads vines = bonus clutter).
24. **Static** (balloon) — chain lightning; discharges after N shots and must be **re-rubbed on the carpet by the Hand** to recharge (tactile reload). Paths: *Van de Graaff* / *Balloon Animal* (splits into 3 minis) / *Thunderhead*.

**Jarred Uniques** (capture-only, one of each per level): Wasp-in-a-Jar, Firefly Lantern, Stag Buddy, Queen Ant Jar, Pillbug Paperweight (thrown by the Hand as a bowling ball), Shiny variants of each with double stats and sparkle trails.

**Explicit combo systems** (discoverable, tracked in the Combo Journal with rewards): Fan+Perfume = roomwide confusion drift · Fridge ice floor + Swatter knockback = edge-wipe bowling · Magnifier + Disco Ball = beam quartet · Toast butter + ice floor = critters physically cannot corner · Lamp aggro + Zapper = flier furnace · Blender + Vroomba patrol = mobile feeding tube.

---

## 6. STATUS EFFECTS

Burnt (DoT) · Soaked (slow; takes 2× Zap) · Frozen · Sticky · Stunned · Confused (attacks allies) · Feared (paths backward) · **Buttered** (slips on turns; flies off edges) · **Shrunk** (squashable by Hand regardless of size) · Jarred (captured) · Crowned (grudge elite). Every critter carries **one resistance and one weakness** — the matrix forces build diversity and gives the Director levers to counter spam.

---

## 7. THE CRITTERS (30 species + variants; every silhouette unique)

**Swarmers:** Worker Ant · Soldier Ant · Bullet Ant (sprinter) · Fire Ant (leaves burning trail that hurts TOWERS) · Carpenter Ant (chews clutter). Ants leave **pheromone trails** that speed up followers — break the trail (kill the leader, sweep the trail with the Hand) to slow the conga line. · Fruit-Fly Cloud (one HP each, hundreds) · Maggots (evolve into flies if they survive 15s).

**Tricksters:** Housefly (dodges the first attack each tower makes) · Roach (plays dead once — fakes death, revives at 40%; **double-tap rule**) · Nuclear Roach (survives any one lethal hit per life) · Winged Roach (the betrayal: walks, then FLIES the last stretch) · Possum Jr. (plays dead on lethal, must be flicked off the table to confirm the kill) · Bedbug (invisible outside lamp light) · Cricket Bard (speed-aura buffer that only moves **while off-screen** — weeping-angel rules; control your camera or it teleports the swarm forward).

**Tanks & trains:** Snail (shell = armor; salt ignores it) · Slug (immune to glue; slime trail speeds followers) · Pillbug (rolls = invulnerable; must be hit during unroll, or bowled by the Hand) · **Centipede** (12-segment health-train; each segment dies separately; killing a middle segment SPLITS it into two faster centipedes) · Beetle (knockback-immune wall) · Rat Knight (bottle-cap shield blocks frontal damage — hit from behind or above).

**Saboteurs:** Mouse Thief (sprints past everything to steal a CAKE SLICE — recoverable if killed before exit) · Termite (ignores cake; eats your clutter/maze) · Earwig (tunnels UNDER your maze, surfaces near the cake) · Tick (latches onto a tower and drains its fire rate until plucked by the Hand) · Silverfish (in roguelike mode, eats a random card from your deck if it exits alive — kill on sight) · Stink Bug (death-burst gas disables towers 5s — do NOT splash it inside your kill-zone) · Moth (clings to lamp towers and disables them; dusty blind AoE).

**Fliers:** Mosquito (lifesteals from cake nibbles, heals the swarm) · Wasp "Red Baron" (dive-bomber elite; killing one enrages nearby wasps) · Hornet (armored flier) · Firefly (heals/shields the swarm with light pulses; jarrable into a top-tier tower — the kill/capture dilemma) · Pigeon (window-siege waves; second front).

**Neutrals & specials:** **Bee** (never attacks first; splash one and the hive declares war — or leave them alone and they pollinate Audrey for honey income) · **Gecko** (eats critters for you; every 10 eaten it grows; at 30 it becomes a hostile boss — kill your free pest control early, or ride the luck) · **Ladybug** (friendly tourist; if your splash damage kills one, lose 50 crumbs and every tower is Sad for 10s — collateral-damage check) · Dust Bunny (spawns from under-couch portals; doubles every 20s if ignored; vacuum instakills) · Snail Shaman (magic critter: shields others; priority target glow).

---

## 8. BOSSES (9 — each a puzzle, not a stat wall)

1. **The Crumb King** (W1 finale) — sentient ball of compacted crumbs riding a throne of ants. Sheds crumbs constantly (scent pressure); eating crumbs heals him — sweep DURING the fight. *"Let them eat cake? No. Let ME eat cake."*
2. **M.O.A.D.B. — Mother of All Dust Bunnies** (W2, secret-tier) — colossal dust bunny that pops layer by layer into smaller bunnies, layer by layer by layer. (A loving Bloons salute.) Vacuum towers are gold here.
3. **Sir Clogsworth** (W3) — the Drain Serpent, a hair-and-soap leviathan that surfaces from any unplugged drain. Manage drain-plugs (clutter pieces) to control where he can emerge.
4. **The Bedbug Baron** (W4) — stealth boss, visible only in lamp/blacklight cones; relocates your light sources with a cane swipe.
5. **The Rat King** (W5) — three rats in a trenchcoat (literally; they stack). Each death splits the coat. Final rat **steals one of your towers and uses it against you**.
6. **Grandma Longlegs** (W6) — webs entire tower clusters (Hand must tear webs free); ceiling phase where only anti-air lands; spawns zip-lining spiderlings.
7. **The Possum Phantom** (W7) — "dies" five times. Each fake death drops fake loot that detonates. The Critterdex hints at the tell (his tail twitches).
8. **The Trash Panda Don** (W8) — raccoon mafia finale: garbage-lid shield, dumpster-armor phases, possum hitmen, and at 30% HP he **bribes your pet** to switch sides for 30 seconds.
9. **THE EXTERMINATOR** (true final boss) — the twist: a human in a gas mask arrives to fumigate EVERYTHING, towers included. For one glorious finale, **critters and towers fight side by side** — the Mutation Drafts you chose all campaign now buff YOUR temporary critter allies. The lesson writes itself; the boss does not pull punches.

---

## 9. PETS (chaos agents — pick one per run)

- **Princess Destructo (cat):** 25%/wave chance to swat a random tower across the room; occasionally annihilates an entire wave then knocks your best tower off the counter, maintaining eye contact. Bribe with treats (consumable) to make her sit on a lane as an unkillable blocker. Hairball = random AoE. Hitting her with 10 stray shots triggers the Betrayal (see Game Enders).
- **Sir Barksalot (dog):** loyal, dim. Bark = global 2s slow on cooldown. Eats crumbs (your economy) and occasionally a mousetrap (sad yelp, trap disabled).
- **The Oracle (goldfish):** does nothing. Mostly. Stare at its bowl, camera unmoved, for 30 real seconds and it reveals the next wave's full composition. Feed it 100 crumbs across a run and for one wave it becomes **K.O.I. THE DESTROYER**.

Pets level via meta-progression; loyalty carries across a run; pet cosmetics exist and they are adorable.

---

## 10. HOUSEHOLD SORCERY (spells — mana = Static Charge, built by kills and sweeping)

1. **Lemon Fresh Smite** — citrus lightning bolt, small AoE, cleans slime/webs on impact.
2. **The Forbidden Slipper** — a giant flying slipper slaps everything along a line. Screen shake mandatory. The universal mom-weapon.
3. **Five-Second Rule** — stop time for exactly 5 seconds. Towers keep firing.
4. **New Lemon Scent** — instantly cleanse board slime, webs, and 50% of the Scent Meter.
5. **Mystery Leftovers** — place a cursed Tupperware: random outcome (friendly gas, crumb jackpot, tower buff... or a critter ambush). Gambling, as a spell.
6. **Insurance Claim** — rebuild all destroyed clutter and revive one dead tower.
7. **Static Discharge** — the Hand becomes a taser for 8 seconds; everything you touch chains lightning.
8. **MOOOOM!** (ultimate) — Mom's hand descends through the ceiling with god-rays and wipes one full lane. 3-minute cooldown. Worth it every time.

Spells level up; each has one cosmetic skin per season.

---

## 11. RANDOM EVENTS (mid-wave curveballs; 1–2 per level, weighted by world)

Doorbell Package (open it: tower, crumbs, or spider ambush — porch roulette) · Power Outage (electronics offline; fix the breaker mini-task to restore early) · Mom's Sweep (a broom crosses one row — kills critters AND towers; 10s shadow warning) · Grease Fire (spreads; fans make it worse; water makes it MUCH worse — physics joke, real hazard) · Open Window Gust (fliers surge, gas drifts) · TV Time Truce (everyone — critters and towers — stops to watch TV for 5s, then resumes at 2× speed) · Door-to-Door Salesman (Faustian shop: one overpowered tower for one permanent extra Mutation) · Spin Cycle Quake (towers slide one tile, crumbs scatter) · Ant Diplomacy (envoy offers 3-wave ceasefire for 50% of your crumbs) · Roomba Firmware Update (Vroomba reboots… or comes back with a laser; 50/50) · **The Fly** (an immortal fly harasses your actual UI — buttons dodge slightly; click it 3 times for the "Wax On" achievement) · Sunbeam Shift (the cat relocates to the new sunbeam, flattening whatever was there) · Leftover Night (food spawns on the board = scent spike + bait opportunity) · Bug Bounty (a golden critter sprints the map; killing it = jackpot, missing it = it taunts you in the Critterdex).

---

## 12. "OH CRAP" SCENARIOS (scripted instant dilemmas — forced 5-second decisions)

1. **The Split Wave** — front door AND back vent breach simultaneously; one MOOOOM! charge. Choose.
2. **The Hostage Slice** — a Mouse Thief grabs your LAST slice while a boss is mid-lane. Chase or hold.
3. **The Jar Decision** — a shiny stag beetle at 15% HP. Jarring takes your Hand offline 2 seconds during a flood.
4. **The Overload Choice** — storm surge: overclock ALL electronics (2× fire rate, each tower 10%/sec explosion risk) for 20 seconds?
5. **Gecko's Last Supper** — the gecko is at 29/30 critters eaten. One more and he turns. He's currently eating your problem.
6. **The Bee Tribunal** — your splash damage hit the hive. The Queen demands one tower as tribute or declares war.
7. **Cat on the Counter** — Princess Destructo sat in your kill-zone. Towers refuse to shoot near her. The wave does not care.
8. **The Sock Strike** — Old Stinky unionizes mid-wave: all towers stop for 10s unless you pay 100 crumbs in "hazard pay."
9. **Double Boss Doorbell** — the doorbell rings during a boss. It's a package. It's ticking. Open it or guard it?
10. **The Crumb Avalanche** — a shelf tips: 500 crumbs spill at once. Sweep jackpot or instant 90% scent. The swarm smells it either way.

---

## 13. DIFFICULTY ENGINE (hard, fair, adaptive)

- **Tiers:** Houseguest (tuned at "hard" by genre norms) → Homeowner → Landlord (no pause, scent decays slower) → **Condemned** (cupcake HP, double mutations, Director unchained).
- **The Director AI** (L4D-style): tracks your build diversity, leak history, APM, and favorite combos; composes counter-waves (you spam splash → it sends spread runners; you mass slows → jumpers and tunnelers). It telegraphs through the **Critter Forecast** — a weather-report-style wave preview with deliberately partial information: *"60% chance of fliers. Scattered roaches. A 30% front of regret."*
- **Near-miss design:** at 1 cake slice, heartbeat audio + desaturated edges + **HOME FIELD ADVANTAGE** (all towers +50% while on the brink). Comebacks must feel legendary; clutch wins are the clips people share.
- **House Rules:** before any level, players may bet on themselves with self-imposed modifiers for multiplied Brownie Points ("No sprayers +25%", "Half cake +50%", "Director picks your mutations +75%").
- **Iron House mode:** permadeath towers, one save slot, for streamers and masochists.
- Losing always teaches: the Death Recap is actionable, specific, and one click from "Retry."

---

## 14. CAMPAIGN — RECLAIM THE HOUSE (9 worlds, 40 levels + 3 secret)

Every level: 3 stars (win / win with ≤2 bites / win a level-specific challenge) + a hidden 4th secret star. Star count gates nothing critical; it feeds Brownie Points and bragging.

**W1 — The Kitchen (5):** 1-1 First Crumbs (tutorial via the kid's sticky notes) · 1-2 The Sink Strait (chokepoint + water) · 1-3 Stovetop Scramble (toggle burners as hazards) · 1-4 Pantry Raid (defend 3 shelves vertically) · 1-5 **The Crumb King's Feast**.
**W2 — The Living Room (5):** 2-1 Couch Country · 2-2 Cable Chaos (TV events constant) · 2-3 The Rug Pull (rug slides underfoot) · 2-4 Bookshelf Bastion (tallest map yet) · 2-5 **Dust to Dust** (M.O.A.D.B.).
**W3 — The Bathroom (4):** 3-1 Porcelain Throne · 3-2 Shower Hour (steam fog hides paths) · 3-3 Drain Brain (plug management) · 3-4 **Sir Clogsworth**.
**W4 — The Bedroom (4):** 4-1 Under Where? (under-bed fog of war) · 4-2 Closet Case (door breaches) · 4-3 Lights Out (permanent night; lamps are life) · 4-4 **The Bedbug Baron**.
**W5 — The Garage (5):** 5-1 Tool Time (unlock nailgun turret variant) · 5-2 Oil Slick City · 5-3 Car Alarm Calamity (sound aggro) · 5-4 Shelf Life (vertical sprawl) · 5-5 **The Rat King**.
**W6 — The Basement (5):** 6-1 Fuse Box Blues (power budget for electronics) · 6-2 Box Fort (lootable boxes mid-wave) · 6-3 Web Site (pre-webbed map) · 6-4 Wine Cellar (rolling barrel physics) · 6-5 **Grandma Longlegs**.
**W7 — The Attic (4):** 7-1 Heirloom Hold (vintage tower variants) · 7-2 Draft Dodgers (wind highways for fliers) · 7-3 Memory Lane (story level; photo-album vignettes between waves) · 7-4 **The Possum Phantom**.
**W8 — The Backyard (5):** 8-1 Lawn Order (open field; pure clutter mazing) · 8-2 BBQ Blitz (grease fire central) · 8-3 The Hive (bee diplomacy decides the boss's difficulty) · 8-4 Sandbox Showdown (terrain you can dig) · 8-5 **The Trash Panda Don**.
**W9 — The Sewers (3, finale):** 9-1 Down the Drain (ESCORT inversion: guard Vroomba carrying the Bug Bomb) · 9-2 The Nest (OFFENSE inversion: destroy spawners) · 9-3 **THE EXTERMINATOR** (alliance finale at the house).

**Secret levels:** The Crumb Dimension (collect 3 hidden golden crumbs across the campaign; dessert physics, everything bounces) · The Dev Room (knock-knock-pause-knock on the basement tiny door) · The Impossible Room (rotating weekly; sub-1% clear rate by design; global clear counter: *"273 humans have done this. Are you human?"*).

---

## 15. INFESTATION MODE (the Slay-the-Spire run — flagship replayability)

- Branching node map of a procedurally remixed house: Fight / Elite / **Garage Sale** (shop with a click-timing haggle minigame) / **The Weird Closet** (50+ written choose-your-outcome events) / Couch Nap (rest: heal cake or upgrade a card).
- **Deck = your tower arsenal.** Start with 3 basic tower cards; draft after every fight. Tower cards have rarities and foil (shiny) printings.
- **Appliance Relics** (passive run modifiers): *Lazy Susan* (all towers rotate 360°) · *Grandma's Cookbook* (toast applies double butter) · *The Good Scissors* (your Hand's flick instantly kills Sticky enemies) · *Expired Coupons* (shops cheaper, salesman meaner) · 40+ relics.
- **Curses** drafted from elite fights: *Open Window* (+1 flier per wave) · *Subscription Trap* (lose 10 crumbs per wave) · *Haunted Doorbell* (package events are always mimics).
- Bosses at each floor's end; mutations stack run-long; Silverfish can EAT YOUR CARDS — protect the deck.
- Run ends = full Critterdex/meta payout. 10 unlockable starting loadouts ("The Plumber," "The Cat Lady," "The Prepper"...).

---

## 16. OTHER MODES

- **Pantry Panic (Endless):** weekly seeded leaderboard; wave 50+ goes cosmic ("The Thing Under the Fridge" awakens). Global ladder.
- **Daily Chores:** one daily mutator challenge (*"Butterfingers: towers slide when placed"*, *"Ant Rave: 2× speed, disco floor"*). Streak rewards, no FOMO guilt — missed days never punish.
- **Sandbox / Room Editor:** build rooms from the full clutter/furniture kit, set waves, share as a code string (deploy-friendly community hook).

---

## 17. MULTIPLAYER (all modes both online and same-network)

1. **Block Party (co-op, 2–4):** one house, shared cake, split rooms; crumb gifting; combo towers that only exist when two players' towers are adjacent (e.g., your Fan + my Perfume = co-op gas). Revive downed rooms.
2. **Food Fight (versus, 1v1/2v2):** Bloons-Battles economy warfare — spend crumbs to SEND critters at the enemy house (send loadouts customizable); your opponent picks your Mutation Drafts; first cake eaten loses. Ranked ladder: **The Food Chain** (Crumb → Larva → Ant → Beetle → Roach → Mouse → Rat → Raccoon → Apex Predator → THE LANDLORD).
3. **King of the Crawl (asymmetric, 1 vs 1–3):** one player IS the infestation — RTS-style swarm commander: places spawn nests, times waves, drives bosses directly, picks mutations live. Defenders defend. The best trash-talk mode.
4. **Pass the Remote (couch co-op):** hot-swap control each wave on one machine; the bench player controls the pet.

Networking is host-authoritative over WebRTC (no server costs; share a link to play). Build order note: multiplayer is Phase 5 — design every system deterministically from day one (fixed-timestep sim, seeded RNG) so netcode bolts on cleanly.

---

## 18. META-PROGRESSION & COLLECTION

- **The Junk Drawer:** the permanent upgrade tree (every house has one). Spend Brownie Points on new towers, pet abilities, starting relics, cake flavors, Hand upgrades (4th flick charge, faster sweep).
- **The Critterdex:** a kid's field journal — crayon drawings, misspelled lore, kill/jar counts per species, shiny gallery. 100% completion = the **Golden Jar** (cosmetic Hand skin + true-ending stinger).
- **Tower Mastery:** per-tower XP → cosmetic evolutions + one bonus upgrade node at max.
- **Combo Journal:** discovered synergies get logged with rewards — discovery itself is content.
- **Achievements:** 150+, many with riddle names; every Game Over variant has one ("Collect all 5 ways to lose" = *Fail Spectacularly* title).
- **Photo Mode:** free camera, tilt-shift slider, sticker pack, one-click GIF export of the last 10 seconds (the MOOOOM! killcam shares itself).

---

## 19. GAME ENDERS (5 distinct ways to lose, each with a unique animated vignette)

1. **Cake Devoured** — classic; critters party on the empty plate; a kazoo plays taps.
2. **THE SWARM** — Scent at 100% for 60s; the walls go dark with bodies; the screen is consumed. Preventable, always your fault, unforgettable.
3. **Condemned** — termites ate 100% of clutter+furniture; the house is structurally yours no longer. A "CONDEMNED" sign nails over the screen.
4. **The Betrayal** — hit the cat 10 times; she defects; final shot is the cat in a tiny crown carried by ants, refusing to look at you.
5. **Exterminated** — lose the finale; the house goes gray and silent: "PEST FREE." The saddest ending. Players replay specifically to fix it.

---

## 20. EASTER EGGS & SURPRISES (ship at least all of these)

1. **Konami code** on the title screen → Retro Mode (8-bit sprites + chiptune for one level).
2. A **sunflower on the windowsill** hums a familiar-ish tune when clicked 5 times (PvZ wink).
3. A **red balloon** occasionally drifts by the window — pop 100 lifetime for the *Monkey Business* achievement + a dart-monkey plushie shelf cosmetic (Bloons wink).
4. **Fridge poetry magnets** are draggable; spelling OPEN SESAME opens the fridge for a rare relic; other secret words do other things (12 words total).
5. **The Oracle's prophecy** (goldfish stare, Section 9).
6. **Wave 42** in Endless: everything pauses; a towel descends; all towers wear tiny towels for one wave. Don't panic.
7. **The bathroom mirror:** towers' reflections occasionally wave at you. Click the mirror 3× at night → "Murray," a friendly mirror ghost, buffs your towers and tells dad jokes for the level.
8. **The Floor Is Lava:** click the kid's crayon drawing in the bedroom → hidden mutator where critters refuse the floor and the whole pathing flips to furniture-only, with a lava shader.
9. **The Dev Room** (basement, knock-knock-pause-knock): concept art, a thank-you note, and the legendary relic *The First Crumb*.
10. **Name your profile "Jorts"** → the cat spawns wearing tiny jean shorts. No explanation given.
11. **Seasonal (system clock):** December fairy lights + gingerbread critter skins · October costume waves (ants in ghost sheets) · April 1: Bizarro Day (towers make critter sounds, critters wear tower costumes).
12. **The Exterminator's van** drives past the window from World 3 onward. Click it 7 times across a campaign → secret pre-finale dialogue and a head start in the final fight.
13. **Idle 5 minutes** → towers light a campfire and roast marshmallows; critters sneak in to join; everyone scrambles back whistling when the mouse moves.
14. **Rename any tower** (right-click). Specific names unlock voice packs (the toaster has opinions).
15. **Arachnophobia mode** (accessibility setting) replaces all spiders with roombas wearing googly eyes — and unlocks an achievement for beating Grandma Longlegs that way.
16. **The credits** are a playable level: critters carry the credit letters across the screen; you may, of course, open fire.
17. **Click the Oracle's bowl during THE EXTERMINATOR fight** — the goldfish puts on a tiny army helmet. Purely moral support.
18. **Lose 10 times on one level** → a sticky note appears: a hand-drawn hint from the kid, plus one free Juice Box. The game notices struggle and responds with kindness, not pity stats.

---

## 21. RETENTION CALENDAR (why players come back)

- **Daily:** Daily Chores mutator + Grandma's cookie (small login gift, zero FOMO).
- **Weekly:** The Landlord's Challenge (fixed-seed gauntlet, leaderboard, exclusive cosmetic) + a fresh Impossible Room.
- **Monthly:** Infestation Season (themed mutator month — "Monsoon March": constant rain) with a free 30-goal season journal.
- **Always:** Critterdex completion, shiny hunting, grudge bounties, combo discovery, 4th-star secrets, Iron House, speedrun mode with ghost replays.

---

## 22. ART DIRECTION (this is half the product — budget time accordingly)

**Style: "Toy-Box Diorama."** Macro-photography scale — the camera lives at ant height looking up at a giant's world. Think Pixar short × *Grounded* × tilt-shift photography.

- **Lighting is the star:** warm volumetric sunbeams through window blinds, dust motes drifting, time-of-day color scripts (golden morning → cool blue night under lamp pools). Night levels are lit ONLY by practical sources (lamps, fridge glow, TV flicker).
- **Materials:** physically-based but stylized — glossy ceramic gnome, brushed-steel toaster with fingerprint smudges, fuzzy felt dust bunnies, subsurface-scattered gummy critters. Crumbs glint.
- **Characters:** towers get Pixar-lamp anthropomorphism — eyes, brows, posture. Five animations minimum each: idle, attack, upgrade-celebration, defeat, and a bored-idle (the sprayer does push-ups; the toaster sunbathes). Critters: cute-gross balance, readable unique silhouettes at gameplay zoom, slapstick deaths (poof + halo float-up; zero gore).
- **VFX:** stylized and readable — toast leaves butter shimmer, vinegar mist refracts tiny rainbows, MOOOOM! parts the ceiling with god-rays, frozen critters become ice-cube lollipops.
- **Camera:** orbitable diorama, tilt-shift DOF, dynamic zoom punches on boss intros and jar-captures, subtle handheld sway on THE SWARM.
- **Performance target:** 60fps on mid-range hardware with 300 concurrent critters — instanced rendering, LOD, pooled particles. Beauty never costs the frame budget.

## 23. UI/UX (diegetic everywhere)

Menus live in the world: main menu = the fridge door (saves are magnets) · settings = the thermostat · shop = a garage-sale lawn table · tower cards = polaroids pinned to a corkboard · wave timer = an egg timer that DINGS · health = the actual cake on its stand · loading screens = handwritten chore lists that check themselves off · the Critterdex = the kid's journal. Fonts: hand-lettered marker + label-maker tape. Every button has hover wiggle and a satisfying foley click. Full mouse+keyboard navigation; remappable keys; UI scale slider; colorblind-safe palettes with pattern overlays on team/status colors; screen-shake and flash-intensity sliders; arachnophobia mode (Section 20.15).

## 24. AUDIO

The **Kitchen-Sink Orchestra**: every instrument is a household object — pots brass, rubber-band bass, wine-glass strings, kazoo leads. Dynamic layers stack with wave intensity; each boss gets a leitmotif (the Rat King's theme is three melodies in a trenchcoat). Mickey-moused slapstick foley from real kitchen recordings. The shiny chime, the jar POP, the cake-bite crunch, the cat's purr through your subwoofer — these are the dopamine bells; obsess over them. Adaptive mix: at 1 cake slice the music thins to a heartbeat and a single brave kazoo.

## 25. STORY & CHARACTERS

Comic-strip vignettes between worlds (3–6 panels, no voiced cutscenes). Running sitcom threads: Toaster and Fridge are exes who must work adjacent; the Sock is unionizing; A.L.E.X.I.S. is sweetly passive-aggressive about the smart-home update that started all this; the kid's sticky notes are the tutorial voice. Mystery arc: who is the Lord Beneath the Fridge? (Mid-campaign reveal: the Trash Panda Don… who at the finale begs to ALLY with you against the Exterminator.) Tone bible: every line funny on its own, no meanness, no innuendo — an 8-year-old and a 38-year-old laugh at different jokes in the same scene.

---

## 26. TECH & DEPLOYMENT DIRECTIVES

- **Stack:** TypeScript + Three.js (WebGL2, WebGPU when available) + Vite. Audio via Howler or WebAudio direct. State: lightweight ECS-style architecture; **fixed-timestep deterministic simulation** decoupled from render (this enables replays, ghosts, and future netcode for free). Seeded RNG everywhere.
- **Runs today:** `npm run dev` opens it locally in the browser on the desktop. Optionally wrap with Tauri later for a double-clickable .exe — structure code so the wrapper is trivial.
- **Deploys later:** `npm run build` outputs a static bundle deployable to itch.io / Vercel / GitHub Pages unchanged. No server required for single-player. Multiplayer (Phase 5): WebRTC peer-to-peer, host-authoritative, join-by-link.
- **Saves:** localStorage with export/import-to-file (shareable save codes).
- **Assets:** all 3D built procedurally or hand-modeled in code (parametric primitives + vertex colors + toon/ramp shading). All audio synthesized or generated. Zero external paid/licensed assets — keeps deployment legally clean.
- **Quality gates:** 60fps with 300 critters; loads in <5s; zero console errors; playable entirely offline.

## 27. BUILD PHASES (each phase ends PLAYABLE)

- **Phase 1 — The Vertical Slice:** Kitchen world (5 levels), 8 towers, 12 critters, Crumb King boss, cake HP, crumb/scent economy, clutter mazing, the Hand (all 5 verbs), 2 spells, Death Recap, full diorama art pipeline + diegetic UI shell. *This alone must already be fun enough to lose an evening to.*
- **Phase 2 — The Full House:** Worlds 2–9, all 24 towers, full bestiary, all 9 bosses, all spells, pets, random events, Oh-Crap scenarios, Mutation Draft, Director AI, grudges, jarring, difficulty tiers, House Rules.
- **Phase 3 — The Hooks:** Infestation Mode (roguelike), Endless, Daily Chores, meta-progression (Junk Drawer, Critterdex, mastery, achievements), photo mode.
- **Phase 4 — The Soul:** all easter eggs, seasonal content, audio polish pass, the secret levels, accessibility suite, performance hardening.
- **Phase 5 — The Block Party:** all four multiplayer modes over WebRTC + sandbox editor with share codes.

## 28. ACCEPTANCE CRITERIA (definition of done, per phase)

✅ Every system in this document is implemented or consciously logged in `CUTS.md` · ✅ 60fps mid-range under max swarm · ✅ no placeholder art/sound/text anywhere · ✅ a new player loses level 1-3 at least once and retries without being told to · ✅ every tower/critter/boss/ender/easter-egg listed here is reachable in play · ✅ one command runs it, one command builds the deployable bundle · ✅ the game is funny when watched and stressful when played.

---

*Now go build the house that fights back.* 🏠🐜🍰
