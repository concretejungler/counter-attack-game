/**
 * VFX layer (STUB — plan §3.2). OWNED BY: P3-V "VFX & Juice".
 *
 * renderer2d.ts already calls this hook API every frame; the bodies are no-ops
 * until P3-V lands. This is the documented seam so the VFX packet can add
 * projectiles' impact bursts, beams, chain arcs, cones, auras, traps, spell VFX
 * (slipper sweep, MOOOOM hand, timestop wash), scent/swarm vignette, and on-board
 * wave banners WITHOUT editing renderer2d.ts.
 *
 * Contract renderer2d relies on:
 *   - reset(): drop all live effects (called on loadLevel).
 *   - handleEvents(events): ingest a tick's SimEvent[] to spawn effects.
 *   - frame(ctx, cam, dt, time): draw the VFX pass (called AFTER entities, BEFORE
 *     the hand). ctx is at the dpr base transform; draw in CSS px via cam.worldToScreen*.
 *   - vignette(ctx, w, h, scent): full-screen scent/swarm tint hook.
 *
 * Keep the hot path allocation-free (pool effect objects) per the §2 perf budget.
 */

import type { SimEvent } from '../sim/types';
import type { Camera2D } from './camera2d';

export class Vfx2D {
  /** Clear all live effects. */
  reset(): void {
    // no-op stub (P3-V)
  }

  /** Ingest a tick's events to spawn effects (fire/hit/die/spellCast/eventStart/...). */
  handleEvents(_events: SimEvent[]): void {
    // no-op stub (P3-V)
  }

  /** Draw + advance the VFX pass. Called after entities, before the hand. */
  frame(_ctx: CanvasRenderingContext2D, _cam: Camera2D, _dt: number, _time: number): void {
    // no-op stub (P3-V)
  }

  /** Full-screen scent/swarm vignette (0..100). Drawn last of the VFX pass. */
  vignette(_ctx: CanvasRenderingContext2D, _cssW: number, _cssH: number, _scent: number): void {
    // no-op stub (P3-V)
  }
}
