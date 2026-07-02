import * as THREE from 'three';

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

  orbit(dx: number, dy: number): void {
    this.yaw -= dx * 0.005;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.004, 0.45, 1.25);
  }

  spin(velocity: number): void {
    this.yawV = velocity;
  }

  zoom(delta: number): void {
    this.targetDist = THREE.MathUtils.clamp(this.targetDist * (delta > 0 ? 1.1 : 0.9), 7, 34);
  }

  /** Current target distance — pinch gestures snapshot this at gesture start. */
  getTargetDist(): number {
    return this.targetDist;
  }

  /** Pinch-to-zoom: baseDist is targetDist snapshotted at gesture start, spanRatio is current/start finger span (>1 = fingers apart = zoom in). */
  pinchZoom(baseDist: number, spanRatio: number): void {
    this.targetDist = THREE.MathUtils.clamp(baseDist / Math.max(0.1, spanRatio), 7, 34);
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
