/**
 * CRITTER PAINTER REGISTRY (extension point — plan §3.2).
 *
 * OWNED BY: P3-P (4 reference painters) then P3-C (Codex critter batch).
 *
 * This barrel is imported ONCE by renderer2d.ts. Painters self-register at import
 * time so they win over the day-one fallbacks (fallback.ts, registered in
 * renderer2d.loadLevel only when no real painter exists for an id).
 *
 * TO REGISTER a real critter painter, add a file in THIS folder and one import
 * line below — never edit renderer2d.ts or any file outside painters/critters/:
 *
 *   // src/render2d/painters/critters/worker-ant.ts
 *   import { registerCritterPainter } from '../../spriteCache';
 *   registerCritterPainter('ant-worker', (ctx, size, frame, opts) => { ... });
 *
 *   // then here:
 *   import './worker-ant';
 *
 * Painter signature (locked): (ctx, size, frame, opts) => void — draw centered in
 * a size x size box, transparent background, dark-cocoa outlines included. Use
 * opts.variant === 'boss' for boss-scale framing, opts.shiny for the golden treatment.
 */

export {};
