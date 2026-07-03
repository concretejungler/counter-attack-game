import * as THREE from 'three';

/** A frozen camera pose, for save/restore around the top-down "see everything" toggle. */
export interface CamSnapshot { yaw: number; pitch: number; dist: number; tx: number; ty: number; tz: number; }

/** Orbitable diorama camera: constrained polar angle, smooth zoom, gentle inertia. */
export class CameraRig {
  readonly camera: THREE.PerspectiveCamera;
  target = new THREE.Vector3();
  private yaw = -Math.PI * 0.22;
  private pitch = 0.92;        // radians from vertical-ish; clamped
  private dist = 16;
  private yawV = 0;
  private targetDist = 16;
  private shakeT = 0;
  private shakeAmp = 0;
  private punchT = 0;
  private bossIntroT = 0;
  /** PHOTO MODE (§18): relaxes orbit/zoom limits for free-camera framing while active. */
  private freeOrbit = false;

  constructor(aspect: number) {
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 200);
  }

  setBounds(center: THREE.Vector3, radius: number): void {
    this.target.copy(center);
    this.dist = radius * 1.5;
    this.targetDist = this.dist;
  }

  /** Direct pose for staged shots / cinematics. */
  pose(yaw: number, pitch: number, dist: number): void {
    this.yaw = yaw;
    this.pitch = THREE.MathUtils.clamp(pitch, 0.3, 1.3);
    this.dist = dist;
    this.targetDist = dist;
  }

  /** Snapshot the current framing (used to restore after the top-down "see everything" view). */
  snapshot(): CamSnapshot {
    return { yaw: this.yaw, pitch: this.pitch, dist: this.targetDist, tx: this.target.x, ty: this.target.y, tz: this.target.z };
  }

  /** Restore a snapshot, easing the distance in via the normal update lerp. */
  restore(s: CamSnapshot): void {
    this.yaw = s.yaw;
    this.pitch = s.pitch;
    this.targetDist = s.dist;
    this.target.set(s.tx, s.ty, s.tz);
    this.yawV = 0;
  }

  /** Snap to a near-overhead "see everything" framing. Bypasses the orbit pitch clamp so it can
   *  go steeper than dragging allows; the next orbit()/zoom() re-enters the normal clamped range. */
  overview(center: THREE.Vector3, pitch: number, dist: number, yaw: number): void {
    this.target.copy(center);
    this.yaw = yaw;
    this.pitch = pitch;
    this.dist = dist;
    this.targetDist = dist;
    this.yawV = 0;
  }

  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.005;
    const [lo, hi] = this.freeOrbit ? [0.08, 1.5] : [0.45, 1.25];
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.004, lo, hi);
  }

  spin(velocity: number): void {
    this.yawV = velocity;
  }

  zoom(delta: number): void {
    const [lo, hi] = this.freeOrbit ? [2.5, 55] : [7, 34];
    this.targetDist = THREE.MathUtils.clamp(this.targetDist * (delta > 0 ? 1.1 : 0.9), lo, hi);
  }

  /** PHOTO MODE (§18): expanded orbit-pitch and zoom limits for free-camera framing. */
  setFreeOrbit(on: boolean): void {
    this.freeOrbit = on;
  }

  /** Current target distance — pinch gestures snapshot this at gesture start. */
  getTargetDist(): number {
    return this.targetDist;
  }

  /** Pinch-to-zoom: baseDist is targetDist snapshotted at gesture start, spanRatio is current/start finger span (>1 = fingers apart = zoom in). */
  pinchZoom(baseDist: number, spanRatio: number): void {
    const [lo, hi] = this.freeOrbit ? [2.5, 55] : [7, 34];
    this.targetDist = THREE.MathUtils.clamp(baseDist / Math.max(0.1, spanRatio), lo, hi);
  }

  shake(amp = 0.3, dur = 0.4): void {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
    this.shakeT = Math.max(this.shakeT, dur);
  }

  /** Quick zoom-punch for wave starts / jar moments. */
  punch(): void {
    this.punchT = 1;
  }

  /** Slower, deeper dolly-in-then-settle punch for boss spawns — a beat longer and heavier than
   *  the plain wave-start punch() so a boss entrance actually reads as an entrance. */
  bossIntro(): void {
    this.bossIntroT = 1;
    this.shake(0.22, 0.35);
  }

  update(dt: number): void {
    this.yaw += this.yawV * dt;
    this.yawV *= 1 - Math.min(1, dt * 3);
    this.dist += (this.targetDist - this.dist) * Math.min(1, dt * 8);
    let d = this.dist;
    if (this.punchT > 0) {
      this.punchT = Math.max(0, this.punchT - dt * 2.2);
      d *= 1 - 0.18 * Math.sin(this.punchT * Math.PI);
    }
    if (this.bossIntroT > 0) {
      // ~1.4s dolly-in-then-settle: quick punch in over the first ~30%, hold close, ease back
      // out to normal framing over the remaining ~70%. Triangular envelope, 0 at both ends.
      this.bossIntroT = Math.max(0, this.bossIntroT - dt * 0.72);
      const k = 1 - this.bossIntroT; // progresses 0 -> 1 across the intro
      const dipIn = Math.min(1, k / 0.3);
      const dipOut = k < 0.55 ? 0 : Math.min(1, (k - 0.55) / 0.45);
      const envelope = dipIn * (1 - dipOut);
      d *= 1 - 0.3 * envelope;
    }
    const sp = Math.sin(this.pitch);
    const cp = Math.cos(this.pitch);
    const pos = new THREE.Vector3(
      this.target.x + d * sp * Math.sin(this.yaw),
      this.target.y + d * cp,
      this.target.z + d * sp * Math.cos(this.yaw),
    );
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const a = this.shakeAmp * (this.shakeT > 0 ? this.shakeT : 0);
      pos.x += (Math.random() - 0.5) * a;
      pos.y += (Math.random() - 0.5) * a;
      pos.z += (Math.random() - 0.5) * a;
      if (this.shakeT <= 0) this.shakeAmp = 0;
    }
    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
