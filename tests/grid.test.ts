import { describe, it, expect } from 'vitest';
import { Grid, CHEW_COST } from '../src/sim/grid';
import { tinyLevel, twoSurfaceLevel } from './fixtures';

describe('Grid flow field', () => {
  it('distance decreases monotonically along flow toward the cake', () => {
    const g = new Grid(tinyLevel());
    g.recompute({ s: 0, c: 6, r: 6 });
    let t = { s: 0, c: 1, r: 1 };
    let prev = g.distOf(t);
    expect(prev).toBeGreaterThan(0);
    for (let i = 0; i < 64; i++) {
      const next = g.flowOf(t);
      if (!next) break;
      const d = g.distOf(next);
      expect(d).toBeLessThan(prev);
      prev = d;
      t = next;
      if (t.c === 6 && t.r === 6) break;
    }
    expect(t).toEqual({ s: 0, c: 6, r: 6 });
  });

  it('cake tile has distance 0', () => {
    const g = new Grid(tinyLevel());
    g.recompute({ s: 0, c: 6, r: 6 });
    expect(g.distOf({ s: 0, c: 6, r: 6 })).toBe(0);
  });

  it('clutter makes paths longer (routing around)', () => {
    const g = new Grid(tinyLevel());
    g.recompute({ s: 0, c: 6, r: 6 });
    const before = g.distOf({ s: 0, c: 1, r: 6 });
    // wall across row 6 between spawnish side and cake: cells (3,4..7) leaves a gap up top
    g.setClutter([
      { s: 0, c: 3, r: 4 }, { s: 0, c: 3, r: 5 }, { s: 0, c: 3, r: 6 }, { s: 0, c: 3, r: 7 },
    ], 1);
    g.recompute({ s: 0, c: 6, r: 6 });
    const after = g.distOf({ s: 0, c: 1, r: 6 });
    expect(after).toBeGreaterThan(before);
    // flow should route AROUND (no clutter tile on path) since detour is cheap
    let t = { s: 0, c: 1, r: 6 };
    for (let i = 0; i < 64; i++) {
      const next = g.flowOf(t);
      if (!next) break;
      expect(g.isClutter(next)).toBe(false);
      t = next;
      if (t.c === 6 && t.r === 6) break;
    }
  });

  it('fully walled cake: flow goes THROUGH cheapest clutter (chew), field stays reachable', () => {
    const g = new Grid(tinyLevel());
    // box the cake at (6,6) completely with clutter ring
    const ring = [
      { s: 0, c: 5, r: 5 }, { s: 0, c: 6, r: 5 }, { s: 0, c: 7, r: 5 },
      { s: 0, c: 5, r: 6 }, { s: 0, c: 7, r: 6 },
      { s: 0, c: 5, r: 7 }, { s: 0, c: 6, r: 7 }, { s: 0, c: 7, r: 7 },
    ];
    g.setClutter(ring, 1);
    g.recompute({ s: 0, c: 6, r: 6 });
    const d = g.distOf({ s: 0, c: 1, r: 1 });
    expect(Number.isFinite(d)).toBe(true);
    expect(d).toBeGreaterThan(CHEW_COST); // path must pay at least one chew
    // walk flow until we hit a clutter tile -> that is the chew target
    let t = { s: 0, c: 1, r: 1 };
    let sawClutter = false;
    for (let i = 0; i < 64; i++) {
      const next = g.flowOf(t);
      if (!next) break;
      if (g.isClutter(next)) { sawClutter = true; break; }
      t = next;
    }
    expect(sawClutter).toBe(true);
  });

  it('statically blocked tiles are never pathed through nor chewed', () => {
    const lvl = tinyLevel();
    lvl.surfaces[0].blocked = [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [4, 6]];
    const g = new Grid(lvl);
    g.recompute({ s: 0, c: 6, r: 6 });
    // only opening is row 7 — every path from left side must pass (4,7)
    let t = { s: 0, c: 0, r: 0 };
    const visited: string[] = [];
    for (let i = 0; i < 64; i++) {
      const next = g.flowOf(t);
      if (!next) break;
      expect(lvl.surfaces[0].blocked).not.toContainEqual([next.c, next.r]);
      visited.push(`${next.c},${next.r}`);
      t = next;
      if (t.c === 6 && t.r === 6) break;
    }
    expect(visited).toContain('4,7');
  });

  it('climb edges connect surfaces: floor spawn reaches counter cake', () => {
    const g = new Grid(twoSurfaceLevel());
    g.recompute({ s: 1, c: 3, r: 3 });
    const d = g.distOf({ s: 0, c: 0, r: 9 });
    expect(Number.isFinite(d)).toBe(true);
    // following flow eventually lands on surface 1
    let t = { s: 0, c: 0, r: 9 };
    let reachedCounter = false;
    for (let i = 0; i < 200; i++) {
      const next = g.flowOf(t);
      if (!next) break;
      t = next;
      if (t.s === 1) { reachedCounter = true; break; }
    }
    expect(reachedCounter).toBe(true);
  });

  it('worldOf maps tiles to surface-relative world centers', () => {
    const g = new Grid(twoSurfaceLevel());
    expect(g.worldOf({ s: 0, c: 0, r: 0 })).toEqual({ x: 0.5, y: 0, z: 0.5 });
    expect(g.worldOf({ s: 1, c: 1, r: 2 })).toEqual({ x: 3.5, y: 3, z: 14.5 });
  });

  it('detects edge tiles on elevated surfaces only', () => {
    const g = new Grid(twoSurfaceLevel());
    expect(g.isEdgeTile({ s: 1, c: 0, r: 0 })).toBe(true);   // counter rim
    expect(g.isEdgeTile({ s: 1, c: 1, r: 1 })).toBe(false);  // counter inner
    expect(g.isEdgeTile({ s: 0, c: 0, r: 0 })).toBe(false);  // floor never an edge
  });

  it('clearClutter restores walkability', () => {
    const g = new Grid(tinyLevel());
    g.setClutter([{ s: 0, c: 3, r: 3 }], 9);
    expect(g.isClutter({ s: 0, c: 3, r: 3 })).toBe(true);
    g.clearClutter(9);
    expect(g.isClutter({ s: 0, c: 3, r: 3 })).toBe(false);
  });

  it('clutterIdAt returns the occupying piece id', () => {
    const g = new Grid(tinyLevel());
    g.setClutter([{ s: 0, c: 2, r: 2 }, { s: 0, c: 3, r: 2 }], 42);
    expect(g.clutterIdAt({ s: 0, c: 2, r: 2 })).toBe(42);
    expect(g.clutterIdAt({ s: 0, c: 5, r: 5 })).toBe(null);
  });
});
