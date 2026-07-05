import type { ClutterPiece, TileRef } from './types';
import type { SimCtx } from './sim';

/**
 * SHUTTLE block (Addendum 2 §3): a clutter piece that PATROLS deterministically along its long
 * axis — 2 tiles out, 2 back, ~0.8 tiles/s, pausing 0.5s at each end. Everything here is seedless
 * float math on the fixed 30Hz dt, so two same-seed sims stay byte-identical. Towers mounted on a
 * shuttle ride along with it; whenever its integer cell displacement changes, its grid occupancy
 * shifts and the flow fields recompute (bumping pathVersion, exactly like a clutter place/chew).
 *
 * Inert unless a shuttle is actually placed: updateShuttles() only touches pieces with a `.shuttle`
 * runtime, so every level without one — and thus every existing test/balance run — is untouched.
 */

/** Axis unit step in (col, row). 0 = along columns (world +x), 1 = along rows (world +z). */
function axisStep(axis: 0 | 1): { c: number; r: number } {
  return axis === 0 ? { c: 1, r: 0 } : { c: 0, r: 1 };
}

/** Long axis of a resolved cell set: 0 if at least as wide as tall, else 1 (ties → columns). */
export function shuttleAxis(cells: readonly TileRef[]): 0 | 1 {
  let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
  for (const t of cells) {
    if (t.c < minC) minC = t.c;
    if (t.c > maxC) maxC = t.c;
    if (t.r < minR) minR = t.r;
    if (t.r > maxR) maxR = t.r;
  }
  return (maxC - minC) >= (maxR - minR) ? 0 : 1;
}

/**
 * Every distinct cell the shuttle sweeps across its FULL patrol (anchor..anchor+range along the
 * axis). Placement validates this whole runway so the block can never slide into a wall / another
 * block / off the board.
 */
export function shuttleSweptCells(baseCells: readonly TileRef[], axis: 0 | 1, range: number): TileRef[] {
  const step = axisStep(axis);
  const seen = new Set<number>();
  const out: TileRef[] = [];
  for (let o = 0; o <= range; o++) {
    for (const t of baseCells) {
      const cell: TileRef = { s: t.s, c: t.c + step.c * o, r: t.r + step.r * o };
      const k = (cell.s << 16) | (cell.r << 8) | cell.c;
      if (!seen.has(k)) {
        seen.add(k);
        out.push(cell);
      }
    }
  }
  return out;
}

/** Fresh patrol runtime for a newly placed shuttle piece (parked at its anchor, about to set off). */
export function initShuttleState(
  patrol: { range: number; speed: number; pause: number },
  axis: 0 | 1,
): NonNullable<ClutterPiece['shuttle']> {
  return {
    axis,
    range: patrol.range,
    speed: patrol.speed,
    pauseMax: patrol.pause,
    pos: 0,
    dir: 1,
    pauseT: 0,
    intOffset: 0,
  };
}

/**
 * Advance every shuttle one tick. Continuous `pos` carries mounted towers smoothly; a change in the
 * integer offset (round(pos)) shifts grid occupancy + the mounted towers' tile markers and triggers
 * a path recompute. No-op (and no state writes) for any piece without a `.shuttle` runtime.
 */
export function updateShuttles(ctx: SimCtx, dt: number): void {
  for (const piece of ctx.state.clutter.values()) {
    const sh = piece.shuttle;
    if (!sh) continue;

    const prevPos = sh.pos;
    if (sh.pauseT > 0) {
      sh.pauseT = Math.max(0, sh.pauseT - dt);
    } else {
      sh.pos += sh.dir * sh.speed * dt;
      if (sh.pos >= sh.range) {
        sh.pos = sh.range;
        sh.dir = -1;
        sh.pauseT = sh.pauseMax;
      } else if (sh.pos <= 0) {
        sh.pos = 0;
        sh.dir = 1;
        sh.pauseT = sh.pauseMax;
      }
    }

    const dPos = sh.pos - prevPos; // tiles glided this tick (signed)
    const step = axisStep(sh.axis);
    if (dPos !== 0) {
      // carry mounted towers along continuously (visual + firing position tracks the block)
      for (const twId of piece.mounted) {
        const tw = ctx.state.towers.get(twId);
        if (!tw || tw.carried) continue;
        tw.pos.x += step.c * dPos;
        tw.pos.z += step.r * dPos;
      }
    }

    const newInt = Math.round(sh.pos);
    if (newInt !== sh.intOffset) {
      const di = newInt - sh.intOffset;
      const newCells: TileRef[] = piece.cells.map((t) => ({
        s: t.s,
        c: t.c + step.c * di,
        r: t.r + step.r * di,
      }));
      ctx.grid.clearClutter(piece.id);
      ctx.grid.setClutter(newCells, piece.id);
      piece.cells = newCells;
      sh.intOffset = newInt;
      // shift each mounted tower's tile marker (its pos was already carried above)
      for (const twId of piece.mounted) {
        const tw = ctx.state.towers.get(twId);
        if (!tw) continue;
        tw.tile = { s: tw.tile.s, c: tw.tile.c + step.c * di, r: tw.tile.r + step.r * di };
      }
      ctx.recomputePaths(); // occupied cells shifted → flow fields + pathVersion bump
    }
  }
}
