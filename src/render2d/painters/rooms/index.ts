/**
 * ROOM TREATMENT REGISTRY (extension point — plan §3.2).
 *
 * OWNED BY: P3-R (Room Painter).
 *
 * Imported ONCE by renderer2d.ts (and by board.ts for the delegation hook). Each
 * theme file below calls `registerRoom(theme, treatment)` at import time; board.ts
 * looks the treatment up by `LevelDef.theme` in build() and delegates its cached
 * floor / tint / decor / platform-dressing / spawn-marker drawing to it, falling
 * back to the generic palette-driven look for any theme without a treatment.
 *
 * The registry state + the public types/functions live in ./registry (a leaf
 * module) so these side-effecting theme imports can't trip a circular-import TDZ.
 *
 * TO ADD a theme treatment: create a file in THIS folder that calls
 * `registerRoom(...)`, then add one `import './<file>'` line below.
 */

import './kitchen';   // + 'secret' (dessert/kitchen treatment)
import './living';
import './bathroom';
import './bedroom';    // "Lights Out" — dark, legibility-tested
import './garage';
import './basement';   // dark
import './attic';
import './backyard';   // exterior
import './sewer';      // dark

export {
  getRoomTreatment,
  registerRoom,
  type RoomTreatment,
  type RoomCtx,
  type ScreenRect,
} from './registry';
