import type { RoomTheme } from '../sim/types';

/** The warm-domestic palette. Critters get sickly greens/browns; the house gets golden hour. */
export const PAL = {
  // room (kitchen defaults — kept for any code that references PAL.* directly)
  wallCream: 0xf2e2c4,
  wallTrim: 0xd9b98a,
  floorTileA: 0xe7d2ac,
  floorTileB: 0xd4b285,
  wood: 0xb07b4f,
  woodDark: 0x8a5a36,
  counterTop: 0xead9bd,
  cabinet: 0xc98f5e,
  metal: 0xb8c0c8,
  metalDark: 0x7e8890,
  windowSky: 0xbfe3f7,
  sunbeam: 0xffe9b8,

  // UI-ish accents
  butter: 0xffd97a,
  cherry: 0xe8504f,
  mint: 0x9fd8c0,
  denim: 0x3f5d7d,
  ink: 0x2e2620,

  // cake
  cakeSponge: 0xf7d9a8,
  cakeFrosting: 0xf9b8c8,
  cakeCherry: 0xd8344f,
  candle: 0x9fd8e8,
  flame: 0xffb347,

  // critters
  antWorker: 0xc05838,
  antSoldier: 0x8a3c28,
  antBullet: 0xe8923a,
  flyBody: 0x5a6b78,
  flyWing: 0xcfe3ee,
  fruitFly: 0x7d8a3c,
  roach: 0x6b3a24,
  mouse: 0x9a9aa2,
  mousePink: 0xe8a8b8,
  slug: 0x8a9a4c,
  snailShell: 0x8a5a36,
  moth: 0xcebfa3,
  dustBunny: 0xb8b2ac,
  stinkbug: 0x5f7a3d,
  crumbGold: 0xd8a44c,

  // fx
  splash: 0x9fc8e8,
  poof: 0xf2e2c4,
  spark: 0xffe27a,
  goo: 0xa8c83c,
} as const;

/**
 * Per-theme room dressing. Every RoomTheme gets its own wall/floor/surface/window/light-rig
 * palette so buildRoom() can re-skin the diorama without touching structural code.
 * Unknown/未-implemented themes should fall back to THEME_PALETTES.kitchen.
 */
export interface ThemePalette {
  // structure
  wallCream: number;       // primary wall color
  wallTrim: number;        // baseboard/trim
  floorTileA: number;
  floorTileB: number;
  groutAlpha: string;      // rgba() string for floor grout lines
  // surfaces (counter/table/shelf/stove/sink tops)
  counterTop: number;
  cabinet: number;
  wood: number;
  woodDark: number;
  metal: number;
  metalDark: number;
  // window
  windowSky: number;
  sunbeam: number;
  sunbeamOpacity: number;
  hasWindow: boolean;      // false = no back-wall window punched (e.g. sewer)
  hasCeiling: boolean;     // false = exterior (backyard) — no fog-dark ceiling implied
  // lighting rig (consumed only inside room.ts via a Group of THREE lights)
  ambient: number;         // hemisphere sky color
  ambientGround: number;   // hemisphere ground color
  ambientIntensity: number;
  keyColor: number;        // sun/moon/window-shaft directional-ish point light color
  keyIntensity: number;
  practicalColor: number;  // lamp/bulb/glow accent color
  fogColor: number;
  bgColor: number;         // scene background tint for this room (applied via fog-matched plane, not scene.background)
  // backdrop dome ("the diorama is on display, not floating in the void")
  domeTop: number;         // dusk sky color at the top of the backdrop dome
  domeBottom: number;      // deep plum/shadow color at the horizon/base
  tableColor: number;      // display-table disc under the whole room
  tableRimColor: number;   // subtle rim-light color on the table edge
}

const kitchen: ThemePalette = {
  wallCream: 0xf2e2c4,
  wallTrim: 0xd9b98a,
  floorTileA: 0xe7d2ac,
  floorTileB: 0xd4b285,
  groutAlpha: 'rgba(120,90,60,0.35)',
  counterTop: 0xead9bd,
  cabinet: 0xc98f5e,
  wood: 0xb07b4f,
  woodDark: 0x8a5a36,
  metal: 0xb8c0c8,
  metalDark: 0x7e8890,
  windowSky: 0xbfe3f7,
  sunbeam: 0xffe9b8,
  sunbeamOpacity: 0.1,
  hasWindow: true,
  hasCeiling: true,
  ambient: 0xfff2dc,
  ambientGround: 0x7a5a3c,
  ambientIntensity: 0.82,
  keyColor: 0xffe2b0,
  keyIntensity: 1.4,
  practicalColor: 0xffd9a0,
  fogColor: 0x33261a,
  bgColor: 0x33261a,
  domeTop: 0xf7b98a,
  domeBottom: 0x3a2340,
  tableColor: 0x2a1c28,
  tableRimColor: 0xffb870,
};

const living: ThemePalette = {
  wallCream: 0xe8c9a0,
  wallTrim: 0xa8703f,
  floorTileA: 0xc99a5e,
  floorTileB: 0xb8873f, // warm hardwood planks instead of tile grid
  groutAlpha: 'rgba(90,58,26,0.28)',
  counterTop: 0x9c6b3e, // bookshelf-wood tabletop
  cabinet: 0x7a4f2c,
  wood: 0x9c6b3e,
  woodDark: 0x6b4423,
  metal: 0xb0a488,
  metalDark: 0x746a54,
  windowSky: 0xf3c98a, // warm afternoon sky
  sunbeam: 0xffcf8c,
  sunbeamOpacity: 0.12,
  hasWindow: true,
  hasCeiling: true,
  ambient: 0xffdcb0,
  ambientGround: 0x6b4423,
  ambientIntensity: 0.78,
  keyColor: 0xffb870,
  keyIntensity: 1.5,
  practicalColor: 0x8fc6ff, // TV glow accent
  fogColor: 0x3a2a1c,
  bgColor: 0x3a2a1c,
  domeTop: 0xf0a875,
  domeBottom: 0x35223a,
  tableColor: 0x2c1e26,
  tableRimColor: 0xffab6a,
};

const bathroom: ThemePalette = {
  wallCream: 0xdcedf0,
  wallTrim: 0xaad0d6,
  floorTileA: 0xe8f4f5,
  floorTileB: 0xc7e4e8,
  groutAlpha: 'rgba(70,120,130,0.3)',
  counterTop: 0xf3fafb, // porcelain
  cabinet: 0xcfe6e8,
  wood: 0xb8d4d8,
  woodDark: 0x7fa8ac,
  metal: 0xd4e8ec,
  metalDark: 0x8fa8ac, // mirror-sheen chrome
  windowSky: 0xcdeef2,
  sunbeam: 0xd8f4ff,
  sunbeamOpacity: 0.08,
  hasWindow: true,
  hasCeiling: true,
  ambient: 0xdff6f8,
  ambientGround: 0x5c8488,
  ambientIntensity: 0.85,
  keyColor: 0xcdeef7,
  keyIntensity: 1.3,
  practicalColor: 0xbfeaff,
  fogColor: 0x1e3438,
  bgColor: 0x1e3438,
  domeTop: 0xbfe2e8,
  domeBottom: 0x1c3438,
  tableColor: 0x18292c,
  tableRimColor: 0x9fe0ec,
};

const bedroom: ThemePalette = {
  // NIGHT — stealth world. Ambient is near-dark; lamp pools do the real lighting work.
  wallCream: 0x2c2a44,
  wallTrim: 0x1c1a30,
  floorTileA: 0x332f4e,
  floorTileB: 0x2a2740,
  groutAlpha: 'rgba(10,8,24,0.4)',
  counterTop: 0x4a3f5c, // nightstand/dresser top
  cabinet: 0x372f4a,
  wood: 0x4a3f5c,
  woodDark: 0x2e2740,
  metal: 0x5a5a70,
  metalDark: 0x3a3a4c,
  windowSky: 0x1a1e3c, // moonlit night sky
  sunbeam: 0xb8c4ff,   // cool moonbeam instead of golden sunbeam
  sunbeamOpacity: 0.07,
  hasWindow: true,
  hasCeiling: true,
  ambient: 0x2a2a48,
  ambientGround: 0x0c0a1a,
  ambientIntensity: 0.22,       // near-dark — darkness is a mechanic here
  keyColor: 0xaeb8ff,           // pale moonlight
  keyIntensity: 0.35,
  practicalColor: 0xffb870,     // warm lamp pools are the *main* light source
  fogColor: 0x0e0c1c,
  bgColor: 0x0e0c1c,
  domeTop: 0x2e2c58,
  domeBottom: 0x0a0816,
  tableColor: 0x0e0c1a,
  tableRimColor: 0x8f9cff,
};

const garage: ThemePalette = {
  wallCream: 0x9a9a96,
  wallTrim: 0x6e6e6a,
  floorTileA: 0x8c8c88, // bare concrete
  floorTileB: 0x7e7e78,
  groutAlpha: 'rgba(40,40,38,0.4)',
  counterTop: 0x8a6a45, // workbench wood
  cabinet: 0x5c5c58,    // metal shelving
  wood: 0x8a6a45,
  woodDark: 0x5c4529,
  metal: 0xa8adb2,
  metalDark: 0x62666a,
  windowSky: 0x9fb8c4,
  sunbeam: 0xe8dcc0,
  sunbeamOpacity: 0.06,
  hasWindow: true,
  hasCeiling: true,
  ambient: 0xc4c8c8,
  ambientGround: 0x3c3c3a,
  ambientIntensity: 0.5,
  keyColor: 0xd8d0b8,
  keyIntensity: 0.9,
  practicalColor: 0xfff2c8,     // hanging bulb cones
  fogColor: 0x1c1c1c,
  bgColor: 0x1c1c1c,
  domeTop: 0x8a8478,
  domeBottom: 0x161614,
  tableColor: 0x1a1a18,
  tableRimColor: 0xe8dcb8,
};

const basement: ThemePalette = {
  wallCream: 0x4a4844,
  wallTrim: 0x322f2c,
  floorTileA: 0x3e3c3a, // dim + cool
  floorTileB: 0x35332f,
  groutAlpha: 'rgba(10,10,10,0.5)',
  counterTop: 0x5a5650, // stacked-box-adjacent worktop
  cabinet: 0x413e38,
  wood: 0x5c4f3e,
  woodDark: 0x372e22,
  metal: 0x767a78,
  metalDark: 0x484c4a,
  windowSky: 0x263038, // small egress window, barely lit
  sunbeam: 0xa8c0c8,
  sunbeamOpacity: 0.05,
  hasWindow: true,
  hasCeiling: true,
  ambient: 0x394048,
  ambientGround: 0x0a0a0c,
  ambientIntensity: 0.28,
  keyColor: 0x8fa8b0,
  keyIntensity: 0.4,
  practicalColor: 0xffe9a8,     // bare bulb / string lights
  fogColor: 0x0c0e10,
  bgColor: 0x0c0e10,
  domeTop: 0x262c30,
  domeBottom: 0x08090a,
  tableColor: 0x0a0c0c,
  tableRimColor: 0xffe0a0,
};

const attic: ThemePalette = {
  wallCream: 0xc9a878,      // raw wood plank walls
  wallTrim: 0x8a6640,
  floorTileA: 0xb8935e,
  floorTileB: 0xa8804e,
  groutAlpha: 'rgba(80,55,25,0.3)',
  counterTop: 0xceac78,     // old trunk/crate top
  cabinet: 0x9c7748,
  wood: 0xac835a,
  woodDark: 0x6e4e2c,
  metal: 0x8a8068,
  metalDark: 0x5c5644,
  windowSky: 0xf7d896,      // golden dusty light through round vent window
  sunbeam: 0xffdf9c,
  sunbeamOpacity: 0.16,     // denser, more visible beams than kitchen
  hasWindow: true,
  hasCeiling: true,         // slanted wooden beams overhead
  ambient: 0xf0d5a0,
  ambientGround: 0x6e4e2c,
  ambientIntensity: 0.6,
  keyColor: 0xffcf7a,
  keyIntensity: 1.6,
  practicalColor: 0xffdf9c,
  fogColor: 0x3c2e18,
  bgColor: 0x3c2e18,
  domeTop: 0xf0b878,
  domeBottom: 0x3a2818,
  tableColor: 0x2c2014,
  tableRimColor: 0xffcf8a,
};

const backyard: ThemePalette = {
  // EXTERIOR — no ceiling, sky-blue background, sunlit grass.
  wallCream: 0xa8c47a,       // distant fence/hedge line stands in for "walls"
  wallTrim: 0x7d5a34,        // fence wood trim
  floorTileA: 0x6fa652,      // grass
  floorTileB: 0x5f9345,
  groutAlpha: 'rgba(40,60,20,0.25)',
  counterTop: 0x8a6a45,      // picnic-table-ish surfaces
  cabinet: 0x6b7a4a,
  wood: 0x8a6a45,
  woodDark: 0x5c4529,
  metal: 0xb8bcb0,
  metalDark: 0x767a70,
  windowSky: 0x8fd0f7,       // open sky, not a framed window
  sunbeam: 0xfff2c8,
  sunbeamOpacity: 0.05,      // sunlight is ambient outdoors, not shaft-y
  hasWindow: false,
  hasCeiling: false,
  ambient: 0xcdeeff,
  ambientGround: 0x6fa652,
  ambientIntensity: 1.0,
  keyColor: 0xfff2c8,
  keyIntensity: 2.2,         // full sunlight
  practicalColor: 0xfff2c8,
  fogColor: 0x8fd0f7,
  bgColor: 0x8fd0f7,
  domeTop: 0xa0d8f7,
  domeBottom: 0x6fa652,
  tableColor: 0x5f9345,
  tableRimColor: 0xfff2c8,
};

const sewer: ThemePalette = {
  wallCream: 0x2e3c30,       // green-dark
  wallTrim: 0x1c2620,
  floorTileA: 0x24302a,
  floorTileB: 0x1c2822,
  groutAlpha: 'rgba(6,14,8,0.5)',
  counterTop: 0x3a4a3e,      // walkway ledge
  cabinet: 0x28352c,
  wood: 0x3c4a3a,
  woodDark: 0x222e20,
  metal: 0x5a6e5e,           // pipe shapes
  metalDark: 0x384a3c,
  windowSky: 0x1a2620,
  sunbeam: 0x8fc89c,         // eerie drain glow instead of sunbeam
  sunbeamOpacity: 0.09,
  hasWindow: false,
  hasCeiling: true,
  ambient: 0x2a3c30,
  ambientGround: 0x040a06,
  ambientIntensity: 0.32,
  keyColor: 0x6fdc8a,        // sickly green drain-glow key light
  keyIntensity: 0.6,
  practicalColor: 0x7dffb0,
  fogColor: 0x08120a,
  bgColor: 0x08120a,
  domeTop: 0x1c3020,
  domeBottom: 0x040806,
  tableColor: 0x060a08,
  tableRimColor: 0x6fdc8a,
};

export const THEME_PALETTES: Record<RoomTheme, ThemePalette> = {
  kitchen,
  living,
  bathroom,
  bedroom,
  garage,
  basement,
  attic,
  backyard,
  sewer,
  secret: kitchen, // reuse kitchen for now, per design direction
};

/** Defensive lookup — unknown/future theme ids fall back to kitchen so nothing renders black. */
export function themePalette(theme: RoomTheme | string): ThemePalette {
  return THEME_PALETTES[theme as RoomTheme] ?? kitchen;
}
