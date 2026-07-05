import type { ClutterPiece, TileRef } from './types';
import type { SimCtx } from './sim';
import { initShuttleState, shuttleAxis, shuttleSweptCells } from './shuttle';

/** Rotate tetromino cells 90° clockwise `rot` times, normalized to a non-negative anchor. */
export function rotateCells(cells: readonly [number, number][], rot: 0 | 1 | 2 | 3): [number, number][] {
  let cur = cells.map(([c, r]) => [c, r] as [number, number]);
  for (let i = 0; i < rot; i++) cur = cur.map(([c, r]) => [r, -c] as [number, number]);
  const minC = Math.min(...cur.map((x) => x[0]));
  const minR = Math.min(...cur.map((x) => x[1]));
  return cur.map(([c, r]) => [c - minC, r - minR] as [number, number]);
}

const same = (a: TileRef, b: TileRef) => a.s === b.s && a.c === b.c && a.r === b.r;

export function tryPlaceClutter(ctx: SimCtx, shape: string, rot: 0 | 1 | 2 | 3, at: TileRef): boolean {
  const def = ctx.content.shapes[shape];
  if (!def) return false;
  const handIdx = ctx.state.clutterHand.indexOf(shape);
  if (handIdx === -1) return false;

  const cells: TileRef[] = rotateCells(def.cells, rot).map(([c, r]) => ({ s: at.s, c: at.c + c, r: at.r + r }));

  // A SHUTTLE (Addendum 2 §3) must find its ENTIRE runway (anchor..anchor+range along its long axis)
  // clear, so it never slides into a wall/another block. Static blocks validate their footprint only.
  const axis = def.patrol ? shuttleAxis(cells) : 0;
  const staticCells = def.patrol ? shuttleSweptCells(cells, axis, def.patrol.range) : cells;
  for (const t of staticCells) {
    if (!ctx.grid.inBounds(t)) return false;
    if (ctx.grid.isStaticBlocked(t)) return false;
    if (ctx.grid.isClutter(t)) return false;
    if (same(t, ctx.level.cakeTile)) return false;
    if (ctx.level.spawns.some((sp) => same(sp.tile, t))) return false;
    for (const tw of ctx.state.towers.values()) {
      if (tw.mountClutter === null && same(tw.tile, t)) return false; // floor tower occupies the tile
    }
  }
  // Fairness: never DROP a block onto a live walker — but only on the footprint it lands on now
  // (a shuttle's future runway is the block's problem as it moves; critters simply reroute).
  for (const t of cells) {
    for (const cr of ctx.state.critters.values()) {
      if (cr.flying) continue;
      const ct = ctx.grid.tileOfWorld(cr.surface, cr.pos.x, cr.pos.z);
      if (ct && same(ct, t)) return false;
    }
  }

  const id = ctx.nextId();
  const piece: ClutterPiece = { id, shape, rot, anchor: at, cells, hp: def.hp, maxHp: def.hp, mounted: [] };
  if (def.patrol) piece.shuttle = initShuttleState(def.patrol, axis);
  ctx.state.clutter.set(id, piece);
  ctx.grid.setClutter(cells, id);
  ctx.state.clutterHand.splice(handIdx, 1);
  ctx.recomputePaths();
  ctx.emit({ t: 'clutterPlace', id, shape });
  return true;
}
