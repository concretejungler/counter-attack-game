/**
 * Pure top-down affine camera for the 2D view (plan §2).
 *
 *   screenX = (worldX - centerX) * scale + viewW/2
 *   screenY = (worldZ - centerZ) * scale + viewH/2
 *
 * No rotation, no perspective — world Y (elevation) never shifts the base position;
 * it is communicated by the board layer (platform islands + shadows) instead.
 *
 * Default framing = fit the whole board with a 24px margin. Zoom is expressed as a
 * multiplier of the fit scale, clamped 1.0x .. 2.5x. Panning is a world-space offset
 * added to the fit center and clamped so the board can't be lost off-screen.
 *
 * All public coordinates are CSS pixels; the renderer bakes `dpr` into its draw
 * transforms separately (so this math stays resolution-independent).
 */

export interface WorldBox {
  minX: number;
  minZ: number;
  maxX: number;
  maxZ: number;
}

export const ZOOM_MIN = 1.0;
export const ZOOM_MAX = 2.5;

export class Camera2D {
  /** Viewport in CSS px. */
  viewW = 1;
  viewH = 1;
  /** Margin (CSS px) kept around the board at fit. */
  margin = 24;

  /** px-per-world-unit at zoom 1 (recomputed by fit()). */
  fitScale = 64;
  /** current zoom multiplier of fitScale, in [ZOOM_MIN, ZOOM_MAX]. */
  zoom = 1;

  /** Board center in world space (set by fit()). */
  private centerX = 0;
  private centerZ = 0;
  /** Manual pan offset in world units, added to the board center. */
  panX = 0;
  panZ = 0;

  /** Transient screen-shake offset in WORLD units (set/decayed by the renderer). */
  shakeWX = 0;
  shakeWZ = 0;

  private box: WorldBox = { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };

  /** px-per-world-unit currently in effect. */
  get scale(): number {
    return this.fitScale * this.zoom;
  }

  /** Effective camera center (board center + manual pan + shake). */
  get eyeX(): number { return this.centerX + this.panX + this.shakeWX; }
  get eyeZ(): number { return this.centerZ + this.panZ + this.shakeWZ; }

  setViewport(cssW: number, cssH: number): void {
    this.viewW = Math.max(1, cssW);
    this.viewH = Math.max(1, cssH);
  }

  setBoard(box: WorldBox): void {
    this.box = box;
  }

  /** Fit the whole board with `margin` px of breathing room; recenter, reset zoom+pan. */
  fit(): void {
    const worldW = Math.max(0.001, this.box.maxX - this.box.minX);
    const worldH = Math.max(0.001, this.box.maxZ - this.box.minZ);
    const usableW = Math.max(1, this.viewW - this.margin * 2);
    const usableH = Math.max(1, this.viewH - this.margin * 2);
    this.fitScale = Math.min(usableW / worldW, usableH / worldH);
    this.centerX = (this.box.minX + this.box.maxX) / 2;
    this.centerZ = (this.box.minZ + this.box.maxZ) / 2;
    this.zoom = 1;
    this.panX = 0;
    this.panZ = 0;
  }

  worldToScreenX(wx: number): number {
    return (wx - this.eyeX) * this.scale + this.viewW / 2;
  }
  worldToScreenY(wz: number): number {
    return (wz - this.eyeZ) * this.scale + this.viewH / 2;
  }

  screenToWorldX(sx: number): number {
    return (sx - this.viewW / 2) / this.scale + this.eyeX;
  }
  screenToWorldZ(sy: number): number {
    return (sy - this.viewH / 2) / this.scale + this.eyeZ;
  }

  /**
   * World-space rect currently on screen, expanded by `marginPx` screen pixels — the cheap
   * off-screen cull test the entity layer applies before any per-entity transform/draw work.
   * Written into the caller's out object (no per-frame allocation in the hot loop).
   */
  visibleWorldRect(marginPx: number, out: WorldBox): WorldBox {
    const halfW = this.viewW / 2 / this.scale;
    const halfH = this.viewH / 2 / this.scale;
    const mx = marginPx / this.scale;
    out.minX = this.eyeX - halfW - mx;
    out.maxX = this.eyeX + halfW + mx;
    out.minZ = this.eyeZ - halfH - mx;
    out.maxZ = this.eyeZ + halfH + mx;
    return out;
  }

  /** Pan by a screen-pixel delta (drag). */
  panByScreen(dxPx: number, dyPx: number): void {
    this.panX -= dxPx / this.scale;
    this.panZ -= dyPx / this.scale;
    this.clampPan();
  }

  /**
   * Multiply zoom by `factor`, keeping the world point under (centerXpx, centerYpx)
   * fixed on screen. If no anchor is given, zooms about the viewport center.
   */
  zoomBy(factor: number, centerXpx?: number, centerYpx?: number): void {
    const cx = centerXpx ?? this.viewW / 2;
    const cy = centerYpx ?? this.viewH / 2;
    const beforeX = this.screenToWorldX(cx);
    const beforeZ = this.screenToWorldZ(cy);
    this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, this.zoom * factor));
    const afterX = this.screenToWorldX(cx);
    const afterZ = this.screenToWorldZ(cy);
    // shift pan so the anchor world point lands back under the cursor
    this.panX += beforeX - afterX;
    this.panZ += beforeZ - afterZ;
    this.clampPan();
  }

  /** Absolute zoom (clamped). Used by demo poses to map a 3D camera distance onto a fit multiple. */
  setZoom(z: number): void {
    this.zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
  }

  /** Center the eye on an arbitrary world point (demo framing). Bypasses the pan clamp so a demo
   *  can frame a board corner tightly; gameplay pans always go through panByScreen()/clampPan(). */
  centerOn(wx: number, wz: number): void {
    this.panX = wx - this.centerX;
    this.panZ = wz - this.centerZ;
  }

  /** True when framed at (near) fit with no manual pan — used for "top-down" vs "zoomed". */
  isAtFit(): boolean {
    return this.zoom <= ZOOM_MIN + 1e-3 && Math.abs(this.panX) < 1e-3 && Math.abs(this.panZ) < 1e-3;
  }

  /** Keep the board center within a half-viewport of the viewport center so it never fully leaves. */
  private clampPan(): void {
    const halfW = this.viewW / 2 / this.scale;
    const halfH = this.viewH / 2 / this.scale;
    const bx = (this.box.minX + this.box.maxX) / 2;
    const bz = (this.box.minZ + this.box.maxZ) / 2;
    const spanX = (this.box.maxX - this.box.minX) / 2 + halfW * 0.5;
    const spanZ = (this.box.maxZ - this.box.minZ) / 2 + halfH * 0.5;
    const eyeX = this.centerX + this.panX;
    const eyeZ = this.centerZ + this.panZ;
    const clampedX = Math.max(bx - spanX, Math.min(bx + spanX, eyeX));
    const clampedZ = Math.max(bz - spanZ, Math.min(bz + spanZ, eyeZ));
    this.panX = clampedX - this.centerX;
    this.panZ = clampedZ - this.centerZ;
  }
}

/** Union the world footprints of every surface into one board bounding box. */
export function boardBox(surfaces: { origin: { x: number; z: number }; cols: number; rows: number }[]): WorldBox {
  let minX = Infinity, minZ = Infinity, maxX = -Infinity, maxZ = -Infinity;
  for (const s of surfaces) {
    minX = Math.min(minX, s.origin.x);
    minZ = Math.min(minZ, s.origin.z);
    maxX = Math.max(maxX, s.origin.x + s.cols);
    maxZ = Math.max(maxZ, s.origin.z + s.rows);
  }
  if (!Number.isFinite(minX)) return { minX: 0, minZ: 0, maxX: 1, maxZ: 1 };
  return { minX, minZ, maxX, maxZ };
}
