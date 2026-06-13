import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PAL } from '../palette';
import { colorize, vertexToonMat } from '../build';

/**
 * Each species = ONE merged vertex-colored geometry, drawn via ONE InstancedMesh.
 * 300 critters ≈ 14 draw calls. Eyes are baked-in geometry — googly at any distance.
 */

function part(geom: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
  const g = geom.clone();
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  g.applyMatrix4(m);
  return colorize(g, color);
}

const SPH = new THREE.SphereGeometry(1, 9, 7);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 7);
const CONE = new THREE.ConeGeometry(1, 1, 8);
const BOX = new THREE.BoxGeometry(1, 1, 1);

function eyesGeo(spacing: number, r: number, y: number, z: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    out.push(part(SPH, 0xffffff, s * spacing, y, z, 0, 0, 0, r, r, r));
    out.push(part(SPH, 0x1a1410, s * spacing, y, z + r * 0.7, 0, 0, 0, r * 0.5, r * 0.5, r * 0.5));
  }
  return out;
}

function legsGeo(color: number, bodyR: number, count = 3): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const z = (i - (count - 1) / 2) * bodyR * 0.8;
    for (const s of [-1, 1]) {
      out.push(part(CYL, color, s * bodyR * 0.9, bodyR * 0.4, z, 0, 0, s * 0.9, 0.04, bodyR * 0.9, 0.04));
    }
  }
  return out;
}

function antGeo(color: number, scale: number, helmet = false, stretched = false): THREE.BufferGeometry {
  const zs = stretched ? 1.15 : 1;
  const parts = [
    part(SPH, color, 0, 0.22, -0.26 * zs, 0, 0, 0, 0.21, 0.19, 0.26 * zs),   // abdomen
    part(SPH, color, 0, 0.22, 0.0, 0, 0, 0, 0.13, 0.13, 0.14),               // thorax
    part(SPH, color, 0, 0.26, 0.19 * zs, 0, 0, 0, 0.14, 0.14, 0.14),         // head
    ...eyesGeo(0.08, 0.05, 0.31, 0.29 * zs),
    ...legsGeo(color, 0.22),
    part(CYL, color, -0.05, 0.4, 0.27 * zs, 0.6, 0, 0.3, 0.015, 0.14, 0.015), // antennae
    part(CYL, color, 0.05, 0.4, 0.27 * zs, 0.6, 0, -0.3, 0.015, 0.14, 0.015),
  ];
  if (helmet) parts.push(part(SPH, 0x3a3a40, 0, 0.33, 0.19, 0, 0, 0, 0.16, 0.12, 0.16));
  const merged = mergeGeometries(parts)!;
  merged.scale(scale, scale, scale);
  return merged;
}

function flyGeo(big: boolean): THREE.BufferGeometry {
  const s = big ? 1 : 0.55;
  const body = big ? PAL.flyBody : PAL.fruitFly;
  const parts = [
    part(SPH, body, 0, 0.3, 0, 0, 0, 0, 0.18, 0.16, 0.22),
    part(SPH, 0xa83232, -0.09, 0.38, 0.14, 0, 0, 0, 0.07, 0.07, 0.07), // big red eyes
    part(SPH, 0xa83232, 0.09, 0.38, 0.14, 0, 0, 0, 0.07, 0.07, 0.07),
    part(SPH, PAL.flyWing, -0.2, 0.42, -0.08, 0.2, 0.5, 0.4, 0.18, 0.02, 0.1), // wings
    part(SPH, PAL.flyWing, 0.2, 0.42, -0.08, 0.2, -0.5, -0.4, 0.18, 0.02, 0.1),
    ...legsGeo(body, 0.14, 2),
  ];
  const merged = mergeGeometries(parts)!;
  merged.scale(s, s, s);
  return merged;
}

function roachGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, PAL.roach, 0, 0.18, 0, 0, 0, 0, 0.3, 0.14, 0.42),               // flat oval body
    part(SPH, 0x4a2818, 0, 0.2, 0.34, 0, 0, 0, 0.13, 0.1, 0.12),              // head
    ...eyesGeo(0.07, 0.04, 0.26, 0.42),
    part(CYL, 0x4a2818, -0.06, 0.3, 0.46, 1.1, 0, 0.35, 0.012, 0.3, 0.012),   // long antennae
    part(CYL, 0x4a2818, 0.06, 0.3, 0.46, 1.1, 0, -0.35, 0.012, 0.3, 0.012),
    ...legsGeo(0x4a2818, 0.3),
  ])!;
}

function mouseGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, PAL.mouse, 0, 0.3, 0, 0, 0, 0, 0.3, 0.28, 0.4),                  // egg body
    part(SPH, PAL.mouse, 0, 0.38, 0.36, 0, 0, 0, 0.18, 0.17, 0.2),             // head
    part(CONE, PAL.mousePink, 0, 0.34, 0.56, 1.57, 0, 0, 0.05, 0.12, 0.05),    // snout
    part(SPH, PAL.mouse, -0.14, 0.58, 0.3, 0, 0, 0, 0.11, 0.12, 0.03),         // ears
    part(SPH, PAL.mouse, 0.14, 0.58, 0.3, 0, 0, 0, 0.11, 0.12, 0.03),
    part(SPH, PAL.mousePink, -0.14, 0.58, 0.32, 0, 0, 0, 0.07, 0.08, 0.02),
    part(SPH, PAL.mousePink, 0.14, 0.58, 0.32, 0, 0, 0, 0.07, 0.08, 0.02),
    ...eyesGeo(0.09, 0.05, 0.45, 0.48),
    part(CYL, PAL.mousePink, 0, 0.22, -0.45, 1.2, 0, 0, 0.03, 0.35, 0.03),     // tail
    part(CYL, PAL.mousePink, 0, 0.14, -0.66, 1.9, 0, 0, 0.025, 0.25, 0.025),
  ])!;
}

function slugGeo(shell: boolean): THREE.BufferGeometry {
  const parts = [
    part(SPH, PAL.slug, 0, 0.16, -0.08, 0, 0, 0, 0.2, 0.16, 0.34),            // body
    part(SPH, PAL.slug, 0, 0.2, 0.22, 0, 0, 0, 0.14, 0.13, 0.16),             // front
    part(CYL, PAL.slug, -0.06, 0.4, 0.28, 0.25, 0, 0.15, 0.02, 0.18, 0.02),   // eye stalks
    part(CYL, PAL.slug, 0.06, 0.4, 0.28, 0.25, 0, -0.15, 0.02, 0.18, 0.02),
    part(SPH, 0xffffff, -0.09, 0.5, 0.31, 0, 0, 0, 0.045, 0.045, 0.045),
    part(SPH, 0xffffff, 0.09, 0.5, 0.31, 0, 0, 0, 0.045, 0.045, 0.045),
    part(SPH, 0x1a1410, -0.09, 0.5, 0.34, 0, 0, 0, 0.022, 0.022, 0.022),
    part(SPH, 0x1a1410, 0.09, 0.5, 0.34, 0, 0, 0, 0.022, 0.022, 0.022),
  ];
  if (shell) {
    parts.push(part(SPH, PAL.snailShell, 0, 0.38, -0.12, 0, 0, 0.3, 0.22, 0.22, 0.22));
    parts.push(part(new THREE.TorusGeometry(0.13, 0.05, 6, 12), 0x6e4426, 0, 0.38, -0.12, 0, 1.57, 0, 1, 1, 1));
  }
  return mergeGeometries(parts)!;
}

function mothGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, 0x9a8a70, 0, 0.3, 0, 0, 0, 0, 0.1, 0.1, 0.2),                  // fuzzy body
    ...eyesGeo(0.06, 0.04, 0.36, 0.16),
    part(SPH, PAL.moth, -0.24, 0.34, 0.02, 0.1, 0.25, 0.15, 0.26, 0.02, 0.18), // big wings
    part(SPH, PAL.moth, 0.24, 0.34, 0.02, 0.1, -0.25, -0.15, 0.26, 0.02, 0.18),
    part(SPH, 0xb8a88a, -0.16, 0.3, -0.14, 0.1, 0.4, 0.1, 0.14, 0.015, 0.12),  // hind wings
    part(SPH, 0xb8a88a, 0.16, 0.3, -0.14, 0.1, -0.4, -0.1, 0.14, 0.015, 0.12),
    part(SPH, 0x6e5a3c, -0.24, 0.345, 0.02, 0, 0.25, 0, 0.08, 0.025, 0.06),    // wing spots
    part(SPH, 0x6e5a3c, 0.24, 0.345, 0.02, 0, -0.25, 0, 0.08, 0.025, 0.06),
  ])!;
}

function dustBunnyGeo(small: boolean): THREE.BufferGeometry {
  const s = small ? 0.55 : 1;
  const parts = [
    part(SPH, PAL.dustBunny, 0, 0.3, 0, 0, 0, 0, 0.3, 0.28, 0.3),
    part(SPH, 0xa8a29c, -0.18, 0.42, 0.08, 0, 0, 0, 0.16, 0.15, 0.16),
    part(SPH, 0xc8c2bc, 0.16, 0.2, 0.14, 0, 0, 0, 0.17, 0.16, 0.17),
    part(SPH, 0xa8a29c, 0.06, 0.46, -0.12, 0, 0, 0, 0.14, 0.13, 0.14),
    ...eyesGeo(0.13, 0.085, 0.34, 0.26), // comically big eyes
  ];
  const merged = mergeGeometries(parts)!;
  merged.scale(s, s, s);
  return merged;
}

function stinkbugGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(CONE, PAL.stinkbug, 0, 0.2, -0.04, 0, 0.785, 3.14159, 0.34, 0.16, 0.4), // shield body (inverted cone, diamond rotated)
    part(SPH, 0x4a5e2e, 0, 0.24, 0.28, 0, 0, 0, 0.11, 0.09, 0.1),
    ...eyesGeo(0.06, 0.04, 0.3, 0.36),
    ...legsGeo(0x3c4a26, 0.26),
    part(SPH, 0x76914c, 0, 0.3, -0.05, 0, 0, 0, 0.18, 0.05, 0.26), // shell sheen plate
  ])!;
}

/** Species id → merged geometry factory. Bosses are NOT here (they get rich Group views). */
const GEO_BUILDERS: Record<string, () => THREE.BufferGeometry> = {
  'ant-worker': () => antGeo(PAL.antWorker, 1),
  'ant-soldier': () => antGeo(PAL.antSoldier, 1.3, true),
  'ant-bullet': () => antGeo(PAL.antBullet, 0.9, false, true),
  'fly-house': () => flyGeo(true),
  'fly-fruit': () => flyGeo(false),
  'roach': () => roachGeo(),
  'mouse-thief': () => mouseGeo(),
  'slug': () => slugGeo(false),
  'snail': () => slugGeo(true),
  'moth': () => mothGeo(),
  'dust-bunny': () => dustBunnyGeo(false),
  'dust-bunnette': () => dustBunnyGeo(true),
  'stinkbug': () => stinkbugGeo(),
  // test fixtures render as ants so the demo tools work with any content
  'test-ant': () => antGeo(PAL.antWorker, 1),
};

export interface CritterRenderState {
  x: number; y: number; z: number;
  facing: number;
  wobble: number;
  state: string;
  flash: number;       // 0..1 white flash
  shiny: boolean;
  tumble: number;      // spin while flung
  scale: number;
}

const CAP = 380;
const tmpM = new THREE.Matrix4();
const tmpP = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpE = new THREE.Euler();
const tmpC = new THREE.Color();
const WHITE = new THREE.Color(0xffffff);
const GOLD = new THREE.Color(0xffe27a);

/** One InstancedMesh per species + one shared shadow-blob mesh. */
export class CritterInstances {
  readonly root = new THREE.Group();
  private meshes = new Map<string, THREE.InstancedMesh>();
  private shadows: THREE.InstancedMesh;

  constructor() {
    const shadowGeo = new THREE.CircleGeometry(0.32, 12);
    shadowGeo.rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ color: 0x2a1c10, transparent: true, opacity: 0.28, depthWrite: false }),
      CAP * 2,
    );
    this.shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.shadows);
  }

  private meshFor(def: string): THREE.InstancedMesh {
    let mesh = this.meshes.get(def);
    if (!mesh) {
      const builder = GEO_BUILDERS[def] ?? GEO_BUILDERS['ant-worker'];
      mesh = new THREE.InstancedMesh(builder(), vertexToonMat(), CAP);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.meshes.set(def, mesh);
      this.root.add(mesh);
    }
    return mesh;
  }

  /** Repaint all instances from grouped render states. */
  sync(byDef: Map<string, CritterRenderState[]>, time: number): void {
    for (const mesh of this.meshes.values()) mesh.count = 0;
    let shadowI = 0;

    for (const [def, list] of byDef) {
      const mesh = this.meshFor(def);
      let i = 0;
      for (const c of list) {
        if (i >= CAP) break;
        const bob = Math.sin(time * 9 + c.wobble) * 0.035;
        const sway = Math.sin(time * 7 + c.wobble) * 0.06;
        let y = c.y + bob;
        tmpE.set(0, c.facing, sway);
        if (c.state === 'playDead') {
          tmpE.set(Math.PI, c.facing, 0); // belly up!
          y = c.y + 0.25;
        } else if (c.state === 'flung' || c.state === 'fall') {
          tmpE.set(c.tumble, c.facing, c.tumble * 1.3);
        } else if (c.state === 'climb') {
          tmpE.set(-0.7, c.facing, 0);
        } else if (c.state === 'eatCake' || c.state === 'chew') {
          tmpE.set(Math.sin(time * 16) * 0.18 - 0.1, c.facing, 0); // nom nom
        }
        tmpP.set(c.x, y, c.z);
        tmpQ.setFromEuler(tmpE);
        const squash = c.state === 'walk' ? 1 + Math.sin(time * 9 + c.wobble) * 0.05 : 1;
        tmpS.set(c.scale, c.scale * squash, c.scale);
        tmpM.compose(tmpP, tmpQ, tmpS);
        mesh.setMatrixAt(i, tmpM);

        tmpC.copy(WHITE);
        if (c.shiny) tmpC.copy(GOLD);
        if (c.flash > 0) tmpC.lerp(new THREE.Color(8, 8, 8), Math.min(1, c.flash));
        mesh.setColorAt(i, tmpC);
        i++;

        // shadow blob (skip while airborne high)
        if (shadowI < CAP * 2 && c.state !== 'climb') {
          tmpP.set(c.x, Math.max(0.02, c.y - (c.state === 'flung' || c.state === 'fall' ? c.y : 0)) + 0.02, c.z);
          // shadows sit on the surface the critter walks on; cheap approx: directly under, at y of walk height
          tmpP.y = c.y + 0.02 - (c.state === 'fall' || c.state === 'flung' ? 0 : 0);
          tmpQ.identity();
          tmpS.set(c.scale, 1, c.scale);
          tmpM.compose(tmpP, tmpQ, tmpS);
          this.shadows.setMatrixAt(shadowI++, tmpM);
        }
      }
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.shadows.count = shadowI;
    this.shadows.instanceMatrix.needsUpdate = true;
  }
}
