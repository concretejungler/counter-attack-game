import type { LevelDef, SurfaceDef, TileRef, Vec3 } from './types';

/** Cost to chew through one clutter tile, in walk-tile equivalents. Mazing buys time, never safety. */
export const CHEW_COST = 15;
/** Extra traversal cost of a climb link (beyond entering the destination tile). */
export const CLIMB_COST = 1;

interface SurfaceData {
  def: SurfaceDef;
  statBlocked: Uint8Array;   // 1 = impassable forever
  clutterId: Int32Array;     // -1 = none
  dist: Float64Array;        // cost to cake
  distExit: Float64Array;    // cost to nearest spawn/exit (flee field)
}

/** Min-heap of [cost, key] pairs. */
class Heap {
  private a: number[] = [];  // interleaved cost,key
  get size() { return this.a.length / 2; }
  push(cost: number, key: number) {
    const a = this.a;
    a.push(cost, key);
    let i = a.length / 2 - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p * 2] <= a[i * 2]) break;
      this.swap(i, p);
      i = p;
    }
  }
  pop(): [number, number] {
    const a = this.a;
    const top: [number, number] = [a[0], a[1]];
    const lastKey = a.pop()!;
    const lastCost = a.pop()!;
    if (a.length > 0) {
      a[0] = lastCost;
      a[1] = lastKey;
      let i = 0;
      const n = a.length / 2;
      for (;;) {
        const l = i * 2 + 1, r = i * 2 + 2;
        let m = i;
        if (l < n && a[l * 2] < a[m * 2]) m = l;
        if (r < n && a[r * 2] < a[m * 2]) m = r;
        if (m === i) break;
        this.swap(i, m);
        i = m;
      }
    }
    return top;
  }
  private swap(i: number, j: number) {
    const a = this.a;
    const c = a[i * 2], k = a[i * 2 + 1];
    a[i * 2] = a[j * 2]; a[i * 2 + 1] = a[j * 2 + 1];
    a[j * 2] = c; a[j * 2 + 1] = k;
  }
}

const key = (t: TileRef) => (t.s << 16) | (t.r << 8) | t.c;
const unkey = (k: number): TileRef => ({ s: k >> 16, r: (k >> 8) & 0xff, c: k & 0xff });

export class Grid {
  readonly surfaces: SurfaceData[];
  /** Bumped every time the cake cost-field is recomputed (i.e. whenever the route can change).
   *  The render layer watches this to know when to re-trace the on-board enemy-path preview,
   *  instead of retracing every frame. */
  pathVersion = 0;
  private climbLinks = new Map<number, number[]>();  // tileKey -> linked tileKeys
  private clutterCells = new Map<number, TileRef[]>(); // clutterId -> cells

  constructor(level: LevelDef) {
    this.surfaces = level.surfaces.map((def) => {
      const n = def.cols * def.rows;
      const statBlocked = new Uint8Array(n);
      for (const [c, r] of def.blocked ?? []) statBlocked[r * def.cols + c] = 1;
      return {
        def,
        statBlocked,
        clutterId: new Int32Array(n).fill(-1),
        dist: new Float64Array(n).fill(Infinity),
        distExit: new Float64Array(n).fill(Infinity),
      };
    });
    for (const climb of level.climbs) {
      this.link(key(climb.from), key(climb.to));
      this.link(key(climb.to), key(climb.from));
    }

    // cabinet-bodied furniture blocks the floor beneath it (wall shelves stay open underneath)
    const floorS = this.surfaces[0];
    for (let i = 1; i < this.surfaces.length; i++) {
      const s = this.surfaces[i].def;
      if (s.kind === 'shelf') continue;
      for (let c = 0; c < s.cols; c++) {
        for (let r = 0; r < s.rows; r++) {
          const ft = this.tileOfWorld(0, s.origin.x + c + 0.5, s.origin.z + r + 0.5);
          if (ft) floorS.statBlocked[ft.r * floorS.def.cols + ft.c] = 1;
        }
      }
    }
  }

  private link(a: number, b: number) {
    const arr = this.climbLinks.get(a) ?? [];
    arr.push(b);
    this.climbLinks.set(a, arr);
  }

  inBounds(t: TileRef): boolean {
    const s = this.surfaces[t.s];
    return !!s && t.c >= 0 && t.r >= 0 && t.c < s.def.cols && t.r < s.def.rows;
  }

  private idx(t: TileRef): number {
    return t.r * this.surfaces[t.s].def.cols + t.c;
  }

  isStaticBlocked(t: TileRef): boolean {
    return !this.inBounds(t) || this.surfaces[t.s].statBlocked[this.idx(t)] === 1;
  }

  isClutter(t: TileRef): boolean {
    return this.inBounds(t) && this.surfaces[t.s].clutterId[this.idx(t)] !== -1;
  }

  clutterIdAt(t: TileRef): number | null {
    if (!this.inBounds(t)) return null;
    const id = this.surfaces[t.s].clutterId[this.idx(t)];
    return id === -1 ? null : id;
  }

  setClutter(cells: TileRef[], clutterId: number): void {
    for (const t of cells) {
      if (this.inBounds(t)) this.surfaces[t.s].clutterId[this.idx(t)] = clutterId;
    }
    this.clutterCells.set(clutterId, cells.slice());
  }

  clearClutter(clutterId: number): void {
    const cells = this.clutterCells.get(clutterId);
    if (!cells) return;
    for (const t of cells) {
      if (this.inBounds(t) && this.surfaces[t.s].clutterId[this.idx(t)] === clutterId) {
        this.surfaces[t.s].clutterId[this.idx(t)] = -1;
      }
    }
    this.clutterCells.delete(clutterId);
  }

  /** Cost to step INTO a tile. Infinity = never. */
  enterCost(t: TileRef): number {
    if (this.isStaticBlocked(t)) return Infinity;
    return this.isClutter(t) ? CHEW_COST : 1;
  }

  /** Neighbors in deterministic order: +c, -c, +r, -r, then climb links in def order. */
  neighbors(t: TileRef): TileRef[] {
    const out: TileRef[] = [];
    const candidates: TileRef[] = [
      { s: t.s, c: t.c + 1, r: t.r },
      { s: t.s, c: t.c - 1, r: t.r },
      { s: t.s, c: t.c, r: t.r + 1 },
      { s: t.s, c: t.c, r: t.r - 1 },
    ];
    for (const n of candidates) if (this.inBounds(n)) out.push(n);
    const links = this.climbLinks.get(key(t));
    if (links) for (const k of links) out.push(unkey(k));
    return out;
  }

  private isClimbStep(a: TileRef, b: TileRef): boolean {
    return a.s !== b.s;
  }

  private dijkstra(sources: TileRef[], field: 'dist' | 'distExit'): void {
    for (const s of this.surfaces) s[field].fill(Infinity);
    const heap = new Heap();
    for (const src of sources) {
      if (!this.inBounds(src)) continue;
      this.surfaces[src.s][field][this.idx(src)] = 0;
      heap.push(0, key(src));
    }
    while (heap.size > 0) {
      const [cost, k] = heap.pop();
      const u = unkey(k);
      if (cost > this.surfaces[u.s][field][this.idx(u)]) continue;
      const stepIntoU = this.enterCost(u); // walking toward a source, a neighbor pays to enter u
      for (const n of this.neighbors(u)) {
        if (this.isStaticBlocked(n)) continue;
        const w = stepIntoU + (this.isClimbStep(u, n) ? CLIMB_COST : 0);
        const nd = cost + w;
        const ni = this.idx(n);
        if (nd < this.surfaces[n.s][field][ni]) {
          this.surfaces[n.s][field][ni] = nd;
          heap.push(nd, key(n));
        }
      }
    }
  }

  /** Dijkstra cost field from the cake outward. Call after any clutter change. */
  recompute(cake: TileRef): void {
    this.dijkstra([cake], 'dist');
    this.pathVersion++;
  }

  /** Trace the steepest-descent route a critter would walk from `start` to the cake, following the
   *  same flow field the sim uses. Returns the tile sequence (start .. cake, chew-through tiles
   *  included); empty if the cake is unreachable from `start`. For the on-board path preview. */
  pathTo(start: TileRef, maxSteps = 500): TileRef[] {
    if (!Number.isFinite(this.distOf(start))) return [];
    const out: TileRef[] = [start];
    const seen = new Set<number>([key(start)]);
    let cur = start;
    for (let i = 0; i < maxSteps; i++) {
      const next = this.flowOf(cur);
      if (!next) break;            // at the cake (dist 0) or no downhill neighbor
      const k = key(next);
      if (seen.has(k)) break;      // safety: never loop
      seen.add(k);
      out.push(next);
      cur = next;
    }
    return out;
  }

  /** Flee field toward the nearest exit (multi-source). Call after any clutter change. */
  recomputeExit(exits: TileRef[]): void {
    this.dijkstra(exits, 'distExit');
  }

  distOf(t: TileRef): number {
    if (!this.inBounds(t)) return Infinity;
    return this.surfaces[t.s].dist[this.idx(t)];
  }

  distExitOf(t: TileRef): number {
    if (!this.inBounds(t)) return Infinity;
    return this.surfaces[t.s].distExit[this.idx(t)];
  }

  private flowGeneric(t: TileRef, field: 'dist' | 'distExit'): TileRef | null {
    if (!this.inBounds(t)) return null;
    if (this.surfaces[t.s][field][this.idx(t)] === 0) return null;
    let best: TileRef | null = null;
    let bestCost = Infinity;
    for (const n of this.neighbors(t)) {
      const ec = this.enterCost(n);
      if (!Number.isFinite(ec)) continue;
      const d = this.surfaces[n.s][field][this.idx(n)];
      if (!Number.isFinite(d)) continue;
      const total = ec + d + (this.isClimbStep(t, n) ? CLIMB_COST : 0);
      if (total < bestCost) {
        bestCost = total;
        best = n;
      }
    }
    return best;
  }

  /** Next tile toward the cake (may be a clutter tile = chew target). Null at cake or if unreachable. */
  flowOf(t: TileRef): TileRef | null {
    return this.flowGeneric(t, 'dist');
  }

  /** Next tile toward the nearest exit (flee path). */
  flowExitOf(t: TileRef): TileRef | null {
    return this.flowGeneric(t, 'distExit');
  }

  /** Center of a tile in world coordinates (y = surface walking height). */
  worldOf(t: TileRef): Vec3 {
    const o = this.surfaces[t.s].def.origin;
    return { x: o.x + t.c + 0.5, y: o.y, z: o.z + t.r + 0.5 };
  }

  /** Tile on surface s containing world (x, z), or null if outside. */
  tileOfWorld(s: number, x: number, z: number): TileRef | null {
    const surf = this.surfaces[s];
    if (!surf) return null;
    const c = Math.floor(x - surf.def.origin.x);
    const r = Math.floor(z - surf.def.origin.z);
    const t = { s, c, r };
    return this.inBounds(t) ? t : null;
  }

  /** Elevated-surface rim tiles — critters can be knocked off here. Floors have no edges. */
  isEdgeTile(t: TileRef): boolean {
    if (!this.inBounds(t)) return false;
    const surf = this.surfaces[t.s];
    if (surf.def.kind === 'floor') return false;
    return t.c === 0 || t.r === 0 || t.c === surf.def.cols - 1 || t.r === surf.def.rows - 1;
  }

  /** Highest surface strictly below y containing world (x, z); -1 if none. */
  surfaceBelow(x: number, z: number, belowY: number): number {
    let best = -1;
    let bestY = -Infinity;
    for (let i = 0; i < this.surfaces.length; i++) {
      const o = this.surfaces[i].def.origin;
      if (o.y >= belowY) continue;
      if (x < o.x || z < o.z || x >= o.x + this.surfaces[i].def.cols || z >= o.z + this.surfaces[i].def.rows) continue;
      if (o.y > bestY) {
        bestY = o.y;
        best = i;
      }
    }
    return best;
  }
}
