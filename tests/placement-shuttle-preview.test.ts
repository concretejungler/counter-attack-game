import { describe, it, expect } from 'vitest';
import { Sim, SIM_DT } from '../src/sim/sim';
import type { ContentDB, LevelDef, SimEvent } from '../src/sim/types';
import { tinyLevel, testContent } from './fixtures';

const opts = (content: ContentDB, seed = 42) => ({ seed, difficulty: 'houseguest' as const, content });
const run = (sim: Sim, n: number): SimEvent[] => {
  const all: SimEvent[] = [];
  for (let i = 0; i < n; i++) all.push(...sim.tick());
  return all;
};

// ---- content with a shuttle block (a 1x2 that patrols 2 tiles along its long axis) ----
function shuttleContent(): ContentDB {
  const c = testContent();
  c.shapes['t-shuttle'] = {
    id: 't-shuttle', name: 'Test Shuttle', cells: [[0, 0], [1, 0]],
    hp: 200, mountSlots: 1, look: 'x', patrol: { range: 2, speed: 0.8, pause: 0.5 },
  };
  return c;
}
function shuttleLevel(overrides: Partial<LevelDef> = {}): LevelDef {
  return tinyLevel({ clutterDeck: ['t-shuttle'], clutterPerWave: 3, startCrumbs: 600, ...overrides });
}

// ================= Addendum 2 §1: placement rule =================
describe('Placement rule — towers on any standable tile', () => {
  it('a bare-floor tower is NON-BLOCKING: critter route is byte-identical with or without it', () => {
    const base = new Sim(tinyLevel(), opts(testContent()));
    const before = JSON.stringify(base.grid.previewPathWith([]));
    const withTower = new Sim(tinyLevel({ startCrumbs: 500 }), opts(testContent()));
    withTower.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 4 } }); // bare floor
    run(withTower, 1);
    const floorTw = [...withTower.state.towers.values()][0];
    expect(floorTw).toBeTruthy();
    expect(floorTw.mountClutter).toBe(null);
    // the flow field is untouched: the same route the sim would trace
    expect(JSON.stringify(withTower.grid.previewPathWith([]))).toBe(before);
  });

  it('rejects the cake tile, walls, and an already-occupied cell', () => {
    const lvl = tinyLevel({ startCrumbs: 500 });
    lvl.surfaces[0].blocked = [[4, 4]];
    const sim = new Sim(lvl, opts(testContent()));
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 6, r: 6 } }); // cake → reject
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 4, r: 4 } }); // wall → reject
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 2, r: 2 } }); // ok (floor)
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 2, r: 2 } }); // occupied → reject
    run(sim, 1);
    expect(sim.state.towers.size).toBe(1);
  });
});

// ================= Addendum 2 §3: shuttle block =================
function snapshot(sim: Sim): string {
  const pieces = [...sim.state.clutter.values()].map((p) => ({
    cells: p.cells, sh: p.shuttle,
  }));
  const towers = [...sim.state.towers.values()].sort((a, b) => a.id - b.id).map((t) => ({ x: t.pos.x, z: t.pos.z, tile: t.tile }));
  return JSON.stringify({ pieces, towers, pv: sim.grid.pathVersion });
}

describe('Shuttle block', () => {
  it('patrol is deterministic: two same-seed sims stay byte-identical over 300 ticks', () => {
    const mk = () => {
      const s = new Sim(shuttleLevel(), opts(shuttleContent()));
      s.command({ type: 'placeClutter', shape: 't-shuttle', rot: 0, at: { s: 0, c: 2, r: 4 } });
      return s;
    };
    const a = mk();
    const b = mk();
    for (let i = 0; i < 300; i++) { a.tick(); b.tick(); }
    expect(snapshot(a)).toBe(snapshot(b));
    // and it actually moved off its anchor at some point
    const piece = [...a.state.clutter.values()][0];
    expect(piece.shuttle!.intOffset).toBeGreaterThanOrEqual(0);
  });

  it('bumps pathVersion + shifts occupied cells on each cell transition', () => {
    const sim = new Sim(shuttleLevel(), opts(shuttleContent()));
    sim.command({ type: 'placeClutter', shape: 't-shuttle', rot: 0, at: { s: 0, c: 2, r: 4 } });
    run(sim, 1);
    const piece = [...sim.state.clutter.values()][0];
    const startCells = JSON.stringify(piece.cells);
    const pvAfterPlace = sim.grid.pathVersion;
    run(sim, 90); // ~3s: enough for at least one integer transition
    expect(sim.grid.pathVersion).toBeGreaterThan(pvAfterPlace);
    expect(JSON.stringify(piece.cells)).not.toBe(startCells);
    // cells still describe a horizontal 1x2 (moved along columns)
    expect(piece.cells).toHaveLength(2);
  });

  it('a tower mounted on the shuttle rides along with it', () => {
    const sim = new Sim(shuttleLevel(), opts(shuttleContent()));
    sim.command({ type: 'placeClutter', shape: 't-shuttle', rot: 0, at: { s: 0, c: 2, r: 4 } });
    run(sim, 1);
    const shuttleId = [...sim.state.clutter.values()][0].id;
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 4 } }); // on a shuttle cell
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    expect(tw.mountClutter).toBe(shuttleId);
    const startX = tw.pos.x;
    const startTileC = tw.tile.c;
    run(sim, 60); // ~2s of gliding
    expect(tw.pos.x).toBeGreaterThan(startX);      // rode along the +column axis
    expect(tw.tile.c).toBeGreaterThan(startTileC); // tile marker followed a transition
    expect(sim.state.clutter.get(shuttleId)!.mounted).toContain(tw.id);
  });

  it('chewing it destroys the piece and stops the patrol (tower drops)', () => {
    const sim = new Sim(shuttleLevel(), opts(shuttleContent()));
    sim.command({ type: 'placeClutter', shape: 't-shuttle', rot: 0, at: { s: 0, c: 2, r: 4 } });
    run(sim, 1);
    const shuttleId = [...sim.state.clutter.values()][0].id;
    sim.command({ type: 'placeTower', def: 'test-gun', at: { s: 0, c: 3, r: 4 } });
    run(sim, 1);
    const tw = [...sim.state.towers.values()][0];
    sim.destroyClutter(shuttleId, 'chewed'); // the exact path a completed chew takes
    const pvAfter = sim.grid.pathVersion;
    run(sim, 60);
    expect(sim.state.clutter.has(shuttleId)).toBe(false); // gone → no longer patrols
    expect(sim.grid.pathVersion).toBe(pvAfter);           // no more transition recomputes
    expect(tw.mountClutter).toBe(null);
    expect(tw.downed).toBe(true);                          // it came crashing down
  });

  it('inert without a shuttle: static clutter never gains patrol state nor churns pathVersion', () => {
    const sim = new Sim(tinyLevel({ clutterDeck: ['box-i'], clutterPerWave: 3, startCrumbs: 300 }), opts(testContent()));
    sim.command({ type: 'placeClutter', shape: 'box-i', rot: 0, at: { s: 0, c: 2, r: 4 } });
    run(sim, 1);
    const piece = [...sim.state.clutter.values()][0];
    expect(piece.shuttle).toBeUndefined();
    const pv = sim.grid.pathVersion;
    run(sim, 90);
    expect(sim.grid.pathVersion).toBe(pv); // updateShuttles did nothing
  });
});

// ================= Addendum 2 §4: pre-placement path preview =================
describe('previewPathWith — pure hypothetical route', () => {
  it('with no extra cells reproduces the live route', () => {
    const sim = new Sim(tinyLevel(), opts(testContent()));
    const preview = sim.grid.previewPathWith([]);
    const live = sim.level.spawns.map((sp) => sim.grid.pathTo(sp.tile).map((t) => sim.grid.worldOf(t)));
    expect(JSON.stringify(preview)).toBe(JSON.stringify(live));
  });

  it('a hypothetical wall reshapes the route without mutating the grid', () => {
    const sim = new Sim(tinyLevel(), opts(testContent()));
    const before = JSON.stringify(sim.grid.previewPathWith([]));
    const pvBefore = sim.grid.pathVersion;
    const distBefore = sim.grid.distOf({ s: 0, c: 1, r: 1 });
    // the live route runs right along row 1 then down column 6; a clutter plug on that row (col 3,
    // rows 0-2) makes chewing pricier than dropping to a lower row — so the route must detour.
    const wall = [0, 1, 2].map((r) => ({ s: 0, c: 3, r }));
    const withWall = JSON.stringify(sim.grid.previewPathWith(wall));
    expect(withWall).not.toBe(before);
    // grid was NOT mutated by the preview
    expect(sim.grid.pathVersion).toBe(pvBefore);
    expect(sim.grid.distOf({ s: 0, c: 1, r: 1 })).toBe(distBefore);
    expect(JSON.stringify(sim.grid.previewPathWith([]))).toBe(before);
  });
});
