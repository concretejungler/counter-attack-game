/**
 * Hand cursor + friends layer (STUB — plan §3.2). OWNED BY: P3-H "Hand & Friends".
 *
 * renderer2d.ts already calls this hook API every frame (topmost draw pass); the
 * bodies are no-ops until P3-H lands. This is the documented seam so the Hand
 * packet can add the Hand cursor (idle / point / flick slingshot band / squash
 * press / sweep trail / carry grab), pets (cat / dog / goldfish bowl), eggs and
 * gnome props WITHOUT editing renderer2d.ts.
 *
 * Contract renderer2d relies on:
 *   - reset(): reset to idle (called on loadLevel).
 *   - setPose(pose): current gesture state from game.ts input.
 *   - setWorldTarget(x, z): where the hand points, in sim world space.
 *   - frame(ctx, cam, dt, time, state?): draw the topmost pass. ctx is at the dpr
 *     base transform; draw in CSS px via cam.worldToScreen*.
 *
 * Keep the hot path allocation-free per the §2 perf budget.
 */

import type { SimState } from '../sim/types';
import type { Camera2D } from './camera2d';

export type HandPose = 'idle' | 'point' | 'flick' | 'press' | 'sweep' | 'carry';

export class Hand2D {
  pose: HandPose = 'idle';
  targetX = 0;
  targetZ = 0;

  reset(): void {
    this.pose = 'idle';
    this.targetX = 0;
    this.targetZ = 0;
  }

  setPose(pose: HandPose): void {
    this.pose = pose;
  }

  setWorldTarget(x: number, z: number): void {
    this.targetX = x;
    this.targetZ = z;
  }

  /** Draw the hand + pets/eggs. Called last, on top of everything. */
  frame(_ctx: CanvasRenderingContext2D, _cam: Camera2D, _dt: number, _time: number, _state?: SimState): void {
    // no-op stub (P3-H)
  }
}
