/**
 * ALL shared simulation types. The contract spine of COUNTER ATTACK!
 * sim/ and content/ may import only from core/ and this file's siblings — never from render/ui/audio.
 */

// ---------- primitives ----------
export interface Vec3 { x: number; y: number; z: number }
export interface Vec2 { x: number; z: number }
/** Tile reference: surface index, column, row. */
export interface TileRef { s: number; c: number; r: number }

export type DamageType = 'spray' | 'swat' | 'zap' | 'heat' | 'cold' | 'gas' | 'sonic' | 'light';
export type StatusId =
  | 'burnt' | 'soaked' | 'frozen' | 'sticky' | 'stunned'
  | 'confused' | 'feared' | 'buttered' | 'shrunk';
export type DifficultyId = 'houseguest' | 'homeowner' | 'landlord' | 'condemned';
export type RoomTheme =
  | 'kitchen' | 'living' | 'bathroom' | 'bedroom' | 'garage'
  | 'basement' | 'attic' | 'backyard' | 'sewer' | 'secret';

// ---------- level definition ----------
export interface SurfaceDef {
  id: string;
  kind: 'floor' | 'counter' | 'table' | 'shelf' | 'sink' | 'stove';
  origin: Vec3;          // min-corner; origin.y = walking height of the surface top
  cols: number;
  rows: number;
  /** Statically impassable tiles (walls, appliances) — never chewable. [c, r] pairs. */
  blocked?: [number, number][];
}

export interface ClimbDef {
  from: TileRef;
  to: TileRef;
  kind: 'climb' | 'ramp';  // visual hint; both walkable links
}

export interface SpawnDef {
  id: string;
  tile: TileRef;
  kind: 'door' | 'vent' | 'drain' | 'window' | 'crack' | 'couch';
}

export interface WaveEntry {
  critter: string;
  count: number;
  interval: number;       // seconds between spawns
  spawn: string;          // SpawnDef id
  delay: number;          // seconds after wave start
}
export interface WaveDef { entries: WaveEntry[] }

export interface LevelDef {
  id: string;
  name: string;
  world: number;
  index: number;
  blurb: string;
  theme: RoomTheme;
  surfaces: SurfaceDef[];
  climbs: ClimbDef[];
  spawns: SpawnDef[];
  cakeTile: TileRef;
  cakeSlices: number;
  startCrumbs: number;
  /** Clutter shape ids available in the draft deck for this level. */
  clutterDeck: string[];
  /** Clutter pieces dealt per build phase. */
  clutterPerWave: number;
  waves: WaveDef[];
  allowedTowers?: string[];        // tutorial gating; undefined = all unlocked
  mutationWaves?: number[];        // waves after which a mutation draft triggers
  challenge?: { text: string; id: string };  // 3rd star condition id
  tutorial?: { wave: number; text: string }[];
}

// ---------- critters ----------
export type CritterTrait =
  | 'playDead'      // fakes death once at low hp, revives
  | 'thief'         // sprints to cake, steals a slice, runs for exit
  | 'dodgeFirst'    // dodges first hit from each tower
  | 'deathGas'      // disables nearby towers on death
  | 'multiplier'    // duplicates itself periodically if not killed
  | 'slimeTrail'    // leaves trail speeding up followers
  | 'pheromone'     // ants: trail buffs followers
  | 'glueImmune'
  | 'scatter'       // changes direction erratically
  | 'lampMoth'      // detours to disable lamp towers
  | 'crumbShed'     // boss: constantly drops crumbs (scent pressure)
  | 'crumbHeal';    // boss: eats board crumbs to heal

export interface CritterDef {
  id: string;
  name: string;
  tier: 1 | 2 | 3 | 4 | 5;
  hp: number;
  speed: number;            // tiles/sec
  size: number;             // radius in tiles; <=0.35 is Hand-squashable
  bounty: number;           // crumb value dropped on death
  bites: number;            // cake slices eaten when it reaches cake (usually 1)
  resist: DamageType | null;
  weak: DamageType | null;
  flying?: boolean;
  armor?: number;           // flat damage reduction
  traits?: CritterTrait[];
  /** eats this many crumb-value to evolve into evolveTo */
  crumbHunger?: number;
  evolveTo?: string;
  splitInto?: { def: string; count: number };  // spawned on death
  chewDps?: number;         // clutter damage per second (default 4)
  boss?: boolean;
  desc: string;             // Critterdex blurb, kid-journal voice
}

// ---------- towers ----------
export type TargetMode = 'first' | 'close' | 'strong' | 'air';
export type AttackKind = 'projectile' | 'beam' | 'cone' | 'slam' | 'aura' | 'trap' | 'push' | 'none';

export interface TowerTier {
  cost: number;             // tier1 = purchase price; tier2/3 = upgrade price
  dmg: number;
  rate: number;             // attacks/sec (aura: pulses/sec)
  range: number;            // tiles
  extra?: Record<string, number>;
}
export interface TowerBranch {
  id: string;
  name: string;
  desc: string;
  cost: number;
  /** numeric modifiers consumed by systems, e.g. { chainCount: 3, slowPct: 0.4, burnDps: 6 } */
  mod: Record<string, number>;
}
export interface TowerDef {
  id: string;
  name: string;             // "Sgt. Spritz"
  item: string;             // "Spray Bottle"
  role: string;             // short tactical descriptor for the card
  dmgType: DamageType;
  attack: AttackKind;
  targeting: TargetMode;
  tiers: [TowerTier, TowerTier, TowerTier];
  branches: TowerBranch[];  // choose ONE at tier 3
  hitsAir?: boolean;
  groundOnly?: boolean;     // cannot hit fliers (default: can hit both unless set)
  floorMount?: boolean;     // places on walkable floor like a trap (tape strips, decoys)
  knockback?: number;       // tiles of shove on hit
  aoe?: number;             // splash radius in tiles
  status?: { id: StatusId; dur: number; chance?: number };
  projSpeed?: number;       // tiles/sec for 'projectile'
  arc?: boolean;            // mortar lob
  desc: string;
  barks: string[];          // personality lines
}

// ---------- clutter ----------
export interface ClutterShape {
  id: string;
  name: string;             // "Cereal Box", "Book Stack"
  cells: [number, number][];// tetromino cells relative to anchor, [c, r]
  hp: number;
  mountSlots: number;       // how many towers fit on top (usually 1)
  look: string;             // render hint
}

// ---------- spells ----------
export interface SpellDef {
  id: string;
  name: string;
  cost: number;             // mana (Static Charge)
  cooldown: number;         // seconds
  kind: 'bolt' | 'lane' | 'timestop' | 'cleanse' | 'gamble' | 'repair' | 'handBuff' | 'momHand';
  power: number;
  radius?: number;
  desc: string;
}

// ---------- mutations ----------
export interface MutationDef {
  id: string;
  name: string;
  desc: string;             // phrased as a threat
  /** numeric swarm modifiers, e.g. { antSpeed: 0.2, roachPlayDead: 1, flierHp: 0.3 } */
  mod: Record<string, number>;
}

// ---------- content registry ----------
export interface ContentDB {
  critters: Record<string, CritterDef>;
  towers: Record<string, TowerDef>;
  shapes: Record<string, ClutterShape>;
  spells: Record<string, SpellDef>;
  mutations: Record<string, MutationDef>;
}

// ---------- runtime entities ----------
export interface Critter {
  id: number;
  def: string;
  hp: number;
  maxHp: number;
  pos: Vec3;
  facing: number;           // yaw radians (render)
  surface: number;          // current surface index (-1 while airborne between surfaces)
  state: 'walk' | 'climb' | 'fall' | 'chew' | 'eatCake' | 'eatCrumb' | 'flee' | 'playDead' | 'flung';
  statuses: Partial<Record<StatusId, number>>;  // seconds remaining
  slowPct: number;          // recomputed each tick from statuses/auras
  bitesDone: number;
  carriedSlice: boolean;
  playedDead: boolean;
  dodged: Record<number, boolean>;  // towerId -> already dodged
  crumbsEaten: number;
  elite: boolean;
  shiny: boolean;
  crowned?: string;         // grudge name
  flying: boolean;
  vel: Vec3;                // used in fall/flung
  climbT?: number;
  climbDur?: number;
  climbFrom?: Vec3;
  climbTo?: Vec3;
  climbToSurface?: number;
  actionT?: number;         // generic channel timer (eating, chewing windup)
  fallFromY?: number;       // height where the fall began (damage calc)
  extraPlaysUsed?: number;  // mutation-granted extra playDead uses consumed
  burnDps?: number;         // damage/sec while 'burnt' status active
  chewTarget?: number;      // clutter id
  decoyTarget?: number;     // tower id being attacked (gnomes)
  shedT?: number;           // crumbShed accumulator
  wobble: number;           // render phase
  spawnedAt: number;        // tick
}

export interface Tower {
  id: number;
  def: string;
  tier: 1 | 2 | 3;
  branch: string | null;
  tile: TileRef;
  pos: Vec3;
  cooldown: number;
  mountClutter: number | null;  // clutter id it sits on (null = buildSpot/surface)
  carried: boolean;             // offline while Hand carries it
  downed: boolean;              // clutter collapsed beneath it; offline until Hand re-mounts it
  armed: boolean;               // traps: false after triggering until re-armed
  invested: number;             // total crumbs spent (sell refunds 90%)
  disabled: number;             // seconds remaining (stink gas, outage...)
  kills: number;
  moraleT: number;              // high-five buff seconds remaining
  ageWaves: number;             // waves since placed/moved (Old Stinky scaling)
  aim: number;                  // yaw for render
  hp?: number;                  // decoys only — critters can break them
}

export interface Projectile {
  id: number;
  tower: number;
  def: string;              // tower def id (visual/dmg lookup)
  pos: Vec3;
  vel: Vec3;
  target: number | null;    // critter id for homing-ish
  ttl: number;
  arc: boolean;
  dmg: number;
  dmgType: DamageType;
  aoe: number;
  knockback: number;
  statusId?: StatusId;
  statusDur?: number;
  mods: Record<string, number>;
  arcStart?: Vec3;          // ballistic lob params
  arcDest?: Vec3;
  arcT?: number;
  arcDur?: number;
}

export interface CrumbEnt {
  id: number;
  pos: Vec3;
  surface: number;
  value: number;
  sweepT: number;           // 0 = resting; >0 animating toward dustpan
}

export interface ClutterPiece {
  id: number;
  shape: string;
  rot: 0 | 1 | 2 | 3;
  anchor: TileRef;
  cells: TileRef[];         // resolved world cells
  hp: number;
  maxHp: number;
  mounted: number[];        // tower ids on top
}

export interface HandState {
  flickCharges: number;
  flickMax: number;
  flickRecharge: number;    // seconds until next charge
  squashCd: number;
  carryCd: number;
  carrying: number | null;  // tower id
}

// ---------- commands in ----------
export type SimCommand =
  | { type: 'placeClutter'; shape: string; rot: 0 | 1 | 2 | 3; at: TileRef }
  | { type: 'placeTower'; def: string; at: TileRef }
  | { type: 'upgradeTower'; id: number }
  | { type: 'branchTower'; id: number; branch: string }
  | { type: 'sellTower'; id: number }
  | { type: 'callWave' }
  | { type: 'flick'; critterId: number; dir: Vec2; power: number }
  | { type: 'squash'; critterId: number }
  | { type: 'sweep'; surface: number; x: number; z: number; radius: number }
  | { type: 'carryStart'; towerId: number }
  | { type: 'carryDrop'; at: TileRef }
  | { type: 'carryCancel' }
  | { type: 'highFive'; towerId: number }
  | { type: 'rearmTrap'; towerId: number }
  | { type: 'castSpell'; spell: string; surface?: number; x?: number; z?: number }
  | { type: 'pickMutation'; id: string };

// ---------- events out ----------
export type LossReason = 'cakeDevoured' | 'theSwarm' | 'condemned' | 'betrayal' | 'exterminated';

export type SimEvent =
  | { t: 'spawn'; id: number; def: string; at: Vec3; shiny: boolean }
  | { t: 'die'; id: number; def: string; at: Vec3; cause: 'tower' | 'squash' | 'fall' | 'spell' | 'flick' | 'chain'; bounty: number }
  | { t: 'fire'; towerId: number; def: string; at: Vec3; target: Vec3 | null }
  | { t: 'hit'; critterId: number; at: Vec3; dmgType: DamageType; amount: number; kind: AttackKind }
  | { t: 'fakeDeath'; id: number; at: Vec3 }
  | { t: 'evolve'; id: number; from: string; into: string; at: Vec3 }
  | { t: 'cakeBite'; slicesLeft: number; by: string; at: Vec3 }
  | { t: 'sliceStolen'; critterId: number }
  | { t: 'sliceRecovered'; at: Vec3 }
  | { t: 'leak'; id: number; def: string }
  | { t: 'crumbDrop'; id: number; at: Vec3; value: number }
  | { t: 'crumbBank'; amount: number; total: number }
  | { t: 'crumbEaten'; critterId: number; at: Vec3 }
  | { t: 'scentThreshold'; threshold: 25 | 50 | 75 | 100; rising: boolean }
  | { t: 'scoutSpawn'; def: string }
  | { t: 'swarmWarning'; secondsLeft: number }
  | { t: 'waveStart'; index: number; total: number }
  | { t: 'waveClear'; index: number; earlyBonus: number }
  | { t: 'buildPhase'; index: number; clutterHand: string[] }
  | { t: 'won'; bitesTaken: number }
  | { t: 'lost'; reason: LossReason }
  | { t: 'towerPlace'; id: number; def: string; at: Vec3 }
  | { t: 'towerUpgrade'; id: number; tier: number }
  | { t: 'towerBranch'; id: number; branch: string }
  | { t: 'towerSell'; id: number }
  | { t: 'towerDisabled'; id: number; seconds: number }
  | { t: 'towerDropped'; id: number; at: Vec3 }   // clutter collapsed under it
  | { t: 'towerHit'; id: number; hpPct: number }  // decoy taking a beating
  | { t: 'towerGone'; id: number; at: Vec3 }      // decoy destroyed (explosion!)
  | { t: 'clutterPlace'; id: number; shape: string }
  | { t: 'clutterChew'; id: number; hpPct: number; at: Vec3 }
  | { t: 'clutterGone'; id: number }
  | { t: 'flick'; critterId: number }
  | { t: 'squash'; at: Vec3 }
  | { t: 'highFive'; towerId: number; hit: boolean }
  | { t: 'spellCast'; spell: string; at: Vec3 | null }
  | { t: 'manaFull' }
  | { t: 'mutationOffer'; options: string[] }
  | { t: 'mutationPicked'; id: string }
  | { t: 'fall'; id: number; from: number };

// ---------- recap / telemetry ----------
export interface RecapData {
  bitesBySource: Record<string, number>;
  leaksByWave: number[];
  scentHistory: number[];        // sampled per second
  crumbsBanked: number;
  crumbsWasted: number;          // eaten by critters
  kills: number;
  killsByTower: Record<string, number>;
  sweeps: number;
  directorNotes: string[];
}

// ---------- sim options/state ----------
export interface SimOptions {
  seed: number;
  difficulty: DifficultyId;
  content: ContentDB;
}

export interface DifficultyMods {
  critterHp: number;
  critterSpeed: number;
  bounty: number;
  scentDecay: number;       // passive decay/sec at zero crumbs (cleanliness drift)
  startCrumbs: number;      // multiplier
  pauseAllowed: boolean;
  cakeSlices: number;       // multiplier (condemned: cupcake handled per-mode)
}

export type SimPhase = 'build' | 'assault' | 'won' | 'lost';

export interface SimState {
  tick: number;
  time: number;
  phase: SimPhase;
  waveIndex: number;        // 0-based; -1 before first wave
  wavesTotal: number;
  buildTimer: number;       // seconds until auto-call (-1 = inactive, waiting for player)
  buildTimerMax: number;
  crumbs: number;
  mana: number;
  manaMax: number;
  scent: number;            // 0..100
  scentHoldT: number;       // seconds at 100 (Swarm timer)
  cakeSlices: number;
  cakeMax: number;
  critters: Map<number, Critter>;
  towers: Map<number, Tower>;
  projectiles: Projectile[];
  crumbEnts: Map<number, CrumbEnt>;
  clutter: Map<number, ClutterPiece>;
  clutterHand: string[];    // shapes available to place this build phase
  hand: HandState;
  spellCds: Record<string, number>;
  mutations: string[];
  mutationOffer: string[] | null;
  recap: RecapData;
  speedMult: number;        // shell-set; sim reads for nothing (kept for UI echo)
}
