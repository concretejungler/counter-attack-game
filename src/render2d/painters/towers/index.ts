/**
 * TOWER PAINTER REGISTRY (extension point — plan §3.2).
 *
 * OWNED BY: P3-T (Codex tower batch).
 *
 * Imported ONCE by renderer2d.ts. Painters self-register at import time and win
 * over the day-one fallbacks in fallback.ts.
 *
 * TO REGISTER a real tower painter, add a file in THIS folder and one import line
 * below — never edit renderer2d.ts or any file outside painters/towers/:
 *
 *   // src/render2d/painters/towers/sgt-spritz.ts
 *   import { registerTowerPainter } from '../../spriteCache';
 *   registerTowerPainter('sgt-spritz', (ctx, size, frame, opts) => { ... });
 *
 *   // then here:
 *   import './sgt-spritz';
 *
 * Painter signature (locked): (ctx, size, frame, opts) => void — centered, size x
 * size, transparent bg, outlines included. opts.tier (1..3) drives tier pips;
 * opts.variant includes 'ascend' when a tier-3 branch has been chosen (golden rim).
 * Every tower must have a FACE (eyes/personality) per plan §2.
 */

export {};
