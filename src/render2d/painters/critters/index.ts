/**
 * CRITTER PAINTER REGISTRY (extension point â€” plan Â§3.2).
 *
 * OWNED BY: P3-P (4 reference painters) then P3-C (Codex critter batch).
 *
 * This barrel is imported ONCE by renderer2d.ts. Painters self-register at import
 * time so they win over the day-one fallbacks (fallback.ts, registered in
 * renderer2d.loadLevel only when no real painter exists for an id).
 *
 * TO REGISTER a real critter painter, add a file in THIS folder and one import
 * line below â€” never edit renderer2d.ts or any file outside painters/critters/:
 *
 *   // src/render2d/painters/critters/worker-ant.ts
 *   import { registerCritterPainter } from '../../spriteCache';
 *   registerCritterPainter('ant-worker', (ctx, size, frame, opts) => { ... });
 *
 *   // then here:
 *   import './worker-ant';
 *
 * Painter signature (locked): (ctx, size, frame, opts) => void â€” draw centered in
 * a size x size box, transparent background, dark-cocoa outlines included. Use
 * opts.variant === 'boss' for boss-scale framing, opts.shiny for the golden treatment.
 *
 * REFERENCE PAINTERS (P3-P) â€” the locked art pattern the batch copies. See
 * painters/GUIDE.md for the file template and rules.
 */

import './workerAnt'; // baseline swarmer reference
import './housefly';  // flier reference
import './crumbKing'; // boss (128 box) reference

import './antBullet';
import './antCarpenter';
import './antFire';
import './antSoldier';
import './bedbug';
import './bedbugBaron';
import './beetle';
import './centipede';
import './centipedeBit';
import './centipedeHalf';
import './cricketBard';
import './dustBunnette';
import './dustBunny';
import './earwig';
import './flyFruit';
import './googlyRoomba'; // arachnophobia-mode substitute (spider species → this sprite)
import './grandmaLonglegs';
import './hornet';
import './maggot';
import './moadb';
import './mosquito';
import './moth';
import './mouseThief';
import './pigeon';
import './pillbug';
import './possumJr';
import './possumPhantom';
import './ratKing';
import './ratKnight';
import './roach';
import './roachNuclear';
import './slug';
import './snail';
import './stinkbug';
import './roachWinged';
import './tick';
import './silverfish';
import './waspBaron';
import './termite';
import './snailShaman';
import './sirClogsworth';
import './trashPandaDon';
import './theExterminator';
export {};

