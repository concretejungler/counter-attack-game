import * as THREE from 'three';
import { box, capsule, toonMat } from './build';

export type HandPose = 'point' | 'open' | 'fist' | 'flick' | 'sweep';

const SKIN = 0xf0c8a0;
const SLEEVE = 0x4a90c8;

/** The Hand of the Homeowner — a 3D cursor with a soul (and a cooldown). */
export class HandView {
  readonly group = new THREE.Group();
  private fingers: THREE.Group[] = [];
  private thumb: THREE.Group;
  private palm: THREE.Mesh;
  private target = new THREE.Vector3(5, 2, 5);
  private pose: HandPose = 'point';
  private poseT = 0;
  private pressT = 0;
  private shadow: THREE.Mesh;

  constructor() {
    this.palm = box(0.55, 0.16, 0.62, SKIN);
    this.palm.castShadow = true;
    const sleeve = box(0.6, 0.22, 0.3, SLEEVE);
    sleeve.position.set(0, 0.02, 0.46);
    this.group.add(this.palm, sleeve);

    for (let i = 0; i < 4; i++) {
      const f = new THREE.Group();
      const seg = capsule(0.07, 0.22, SKIN);
      seg.rotation.x = Math.PI / 2;
      seg.position.z = -0.18;
      f.add(seg);
      f.position.set(-0.2 + i * 0.135, 0.02, -0.28);
      this.fingers.push(f);
      this.group.add(f);
    }
    this.thumb = new THREE.Group();
    const tseg = capsule(0.075, 0.18, SKIN);
    tseg.rotation.z = Math.PI / 2.4;
    tseg.position.x = -0.14;
    this.thumb.add(tseg);
    this.thumb.position.set(-0.3, 0, 0.05);
    this.group.add(this.thumb);

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.4, 14),
      new THREE.MeshBasicMaterial({ color: 0x2a1c10, transparent: true, opacity: 0.2, depthWrite: false }),
    );
    this.shadow.rotation.x = -Math.PI / 2;
    this.group.add(this.shadow);

    this.group.rotation.x = 0.25;
  }

  setTarget(world: THREE.Vector3, surfaceY: number): void {
    this.target.set(world.x, surfaceY + 1.0, world.z);
    this.shadow.position.y = -(this.target.y - surfaceY) + 0.04;
  }

  setPose(pose: HandPose): void {
    if (this.pose !== pose) {
      this.pose = pose;
      this.poseT = 0;
    }
  }

  /** Squash press animation: slams to the surface and back. */
  press(): void {
    this.pressT = 1;
  }

  update(dt: number, time: number): void {
    this.poseT = Math.min(1, this.poseT + dt * 7);
    this.pressT = Math.max(0, this.pressT - dt * 3.2);

    // spring-follow
    const k = Math.min(1, dt * 14);
    this.group.position.lerp(this.target, k);
    // hover bob + press slam
    const slam = Math.sin(Math.min(1, this.pressT) * Math.PI);
    this.group.position.y = this.target.y + Math.sin(time * 2.2) * 0.05 - slam * 0.72;

    // finger poses. Negative curl tucks the fingers DOWNWARD toward the palm/board (palm-down
    // hand); a positive curl would fold them up and away from the surface, reading upside-down.
    const curl = { point: [0.15, 1.5, 1.6, 1.7], open: [0.1, 0.12, 0.1, 0.14], fist: [1.7, 1.7, 1.7, 1.7], flick: [0.1, 1.7, 1.7, 1.7], sweep: [0.5, 0.5, 0.5, 0.5] }[this.pose];
    this.fingers.forEach((f, i) => {
      f.rotation.x = THREE.MathUtils.lerp(f.rotation.x, -curl[i], this.poseT);
    });
    this.thumb.rotation.y = THREE.MathUtils.lerp(this.thumb.rotation.y, this.pose === 'fist' ? 0.9 : 0.2, this.poseT);

    // sweep tilt
    const tilt = this.pose === 'sweep' ? 0.7 : 0.25;
    this.group.rotation.x = THREE.MathUtils.lerp(this.group.rotation.x, tilt, k);
  }
}
