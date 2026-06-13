import * as THREE from 'three';
import { PAL } from '../palette';
import { at, box, capsule, cone, cyl, eyes, rot, sphere, toonMat } from '../build';

export interface TowerView {
  group: THREE.Group;
  /** continuous personality animation */
  animate(dt: number, time: number): void;
  /** triggered when the sim says this tower fired */
  onFire(): void;
  setTier(tier: number): void;
  setDisabled(disabled: boolean): void;
}

function tierStars(tier: number): THREE.Group {
  const g = new THREE.Group();
  for (let i = 0; i < tier - 1; i++) {
    const star = sphere(0.07, PAL.butter, 6);
    star.position.set((i - (tier - 2) / 2) * 0.2, 0, 0);
    star.castShadow = false;
    g.add(star);
  }
  return g;
}

abstract class BaseView implements TowerView {
  group = new THREE.Group();
  protected fireT = 0;
  protected stars = new THREE.Group();
  protected zzz: THREE.Mesh | null = null;

  constructor() {
    this.stars.position.y = 1.6;
    this.group.add(this.stars);
  }

  onFire(): void {
    this.fireT = 1;
  }

  setTier(tier: number): void {
    this.group.remove(this.stars);
    this.stars = tierStars(tier);
    this.stars.position.y = 1.7;
    this.group.add(this.stars);
    const s = 1.28 * (1 + (tier - 1) * 0.09); // base boost: towers must read at gameplay zoom
    this.group.scale.set(s, s, s);
  }

  setDisabled(disabled: boolean): void {
    if (disabled && !this.zzz) {
      this.zzz = sphere(0.12, 0x9a9aa2, 6);
      this.zzz.position.set(0.3, 1.5, 0);
      this.group.add(this.zzz);
    } else if (!disabled && this.zzz) {
      this.group.remove(this.zzz);
      this.zzz = null;
    }
  }

  animate(dt: number, time: number): void {
    this.fireT = Math.max(0, this.fireT - dt * 4);
    this.stars.rotation.y = time * 1.5;
    if (this.zzz) this.zzz.position.y = 1.5 + Math.sin(time * 2) * 0.1;
  }
}

class SpritzView extends BaseView {
  private body: THREE.Mesh;
  private nozzle: THREE.Group;

  constructor() {
    super();
    this.body = cyl(0.28, 0.34, 0.85, 0x58aae8, 12);
    this.body.position.y = 0.42;
    const neck = cyl(0.12, 0.14, 0.25, 0x4090d0, 10);
    neck.position.y = 0.95;
    this.nozzle = new THREE.Group();
    const head = box(0.26, 0.3, 0.42, 0xe8e8f0);
    head.position.set(0, 0, 0.05);
    const tip = cyl(0.05, 0.05, 0.16, 0x2e2620, 8);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(0, 0.02, 0.3);
    const trigger = box(0.08, 0.22, 0.1, 0xd84848);
    trigger.position.set(0, -0.18, 0.18);
    this.nozzle.add(head, tip, trigger);
    this.nozzle.position.y = 1.18;
    const face = eyes(0.22, 0.085);
    face.position.set(0, 0.62, 0.3);
    const helmetBrim = cyl(0.36, 0.36, 0.06, 0x3c5a2e, 12);
    helmetBrim.position.y = 0.86;
    const helmet = sphere(0.3, 0x3c5a2e, 10);
    helmet.scale.y = 0.5;
    helmet.position.y = 0.9;
    this.group.add(this.body, neck, this.nozzle, face, helmetBrim, helmet);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    const breathe = 1 + Math.sin(time * 2.4) * 0.02;
    this.body.scale.set(breathe, 1, breathe);
    this.nozzle.position.y = 1.18 - this.fireT * 0.08;
    this.nozzle.rotation.x = -this.fireT * 0.18;
  }
}

class SmackyView extends BaseView {
  private arm: THREE.Group;

  constructor() {
    super();
    const base = cyl(0.3, 0.36, 0.25, PAL.woodDark, 10);
    base.position.y = 0.12;
    this.arm = new THREE.Group();
    const handle = cyl(0.07, 0.08, 1.1, PAL.wood, 8);
    handle.position.y = 0.55;
    const paddle = box(0.55, 0.75, 0.07, 0xd87f2e);
    paddle.position.y = 1.35;
    const mesh = box(0.42, 0.6, 0.085, 0xc06a20);
    mesh.position.y = 1.35;
    const face = eyes(0.18, 0.07);
    face.position.set(0, 1.45, 0.06);
    this.arm.add(handle, paddle, mesh, face);
    this.arm.position.y = 0.2;
    this.group.add(base, this.arm);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    // coiled lean back at rest; SLAM arc while fireT decays 1 → 0
    const rest = Math.sin(time * 1.8) * 0.06 - 0.15;
    this.arm.rotation.x = rest + Math.sin(this.fireT * Math.PI) * 1.5;
  }
}

class ToastView extends BaseView {
  private lever: THREE.Mesh;
  private slotsGlow: THREE.Mesh;

  constructor() {
    super();
    const body = box(0.85, 0.62, 0.55, 0xc8ccd4);
    body.position.y = 0.36;
    const top = cyl(0.28, 0.28, 0.85, 0xb8bcc4, 12);
    top.rotation.z = Math.PI / 2;
    top.position.y = 0.68;
    top.scale.set(1, 1, 0.62);
    this.slotsGlow = box(0.6, 0.05, 0.3, 0xff8c3c);
    (this.slotsGlow.material as THREE.MeshToonMaterial).emissive = new THREE.Color(0xff5a1c);
    this.slotsGlow.position.y = 0.79;
    this.lever = box(0.1, 0.08, 0.14, PAL.cherry);
    this.lever.position.set(0.5, 0.55, 0);
    const face = eyes(0.26, 0.09);
    face.position.set(0, 0.42, 0.29);
    const visor = box(0.7, 0.16, 0.06, 0x8a8e96);
    visor.position.set(0, 0.56, 0.28);
    const dial = cyl(0.09, 0.09, 0.06, PAL.cherry, 10);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0.28, 0.25, 0.29);
    this.group.add(body, top, this.slotsGlow, this.lever, face, visor, dial);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.lever.position.y = 0.55 - (this.fireT > 0.7 ? (1 - this.fireT) * 1.2 : this.fireT * 0.25);
    const mat = this.slotsGlow.material as THREE.MeshToonMaterial;
    mat.emissiveIntensity = 0.5 + Math.sin(time * 5) * 0.25 + this.fireT * 2;
    this.group.rotation.z = Math.sin(Math.min(this.fireT * 3, 1) * Math.PI) * 0.07;
  }
}

class FanView extends BaseView {
  private blades: THREE.Group;
  private head: THREE.Group;

  constructor() {
    super();
    const base = cyl(0.3, 0.38, 0.16, PAL.denim, 12);
    base.position.y = 0.08;
    const pole = cyl(0.06, 0.06, 0.7, PAL.metalDark, 8);
    pole.position.y = 0.5;
    this.head = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.05, 8, 20), toonMat(PAL.denim));
    this.blades = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const blade = box(0.13, 0.34, 0.02, 0x9fd8e8);
      blade.position.y = 0.2;
      const holder = new THREE.Group();
      holder.add(blade);
      holder.rotation.z = (i / 3) * Math.PI * 2;
      this.blades.add(holder);
    }
    const hub = sphere(0.09, PAL.metalDark, 8);
    const face = eyes(0.2, 0.07);
    face.position.set(0, -0.18, 0.34);
    this.head.add(ring, this.blades, hub, face);
    this.head.position.y = 1.0;
    this.group.add(base, pole, this.head);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.blades.rotation.z += dt * (8 + this.fireT * 22);
    this.head.rotation.y = Math.sin(time * 0.8) * 0.5;
  }
}

class RickView extends BaseView {
  private tongue: THREE.Mesh;

  constructor() {
    super();
    const body = box(0.6, 0.42, 0.34, 0x4a4e58);
    body.position.y = 0.22;
    const roll = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.1, 8, 18), toonMat(0xe8e0d0));
    roll.position.set(-0.1, 0.55, 0);
    const face = eyes(0.18, 0.07);
    face.position.set(0.1, 0.34, 0.18);
    this.tongue = box(0.3, 0.02, 0.5, 0xfff4e0);
    this.tongue.position.set(0.25, 0.02, 0.3);
    const zone = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff4e0, transparent: true, opacity: 0.14, depthWrite: false }),
    );
    zone.rotation.x = -Math.PI / 2;
    zone.position.y = 0.015;
    this.group.add(body, roll, face, this.tongue, zone);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.tongue.scale.z = 1 + Math.sin(time * 1.2) * 0.12;
  }
}

class GnomeView extends BaseView {
  private head: THREE.Group;
  hpPct = 1;

  constructor() {
    super();
    const boots = box(0.3, 0.12, 0.2, 0x2e2620);
    boots.position.y = 0.06;
    const body = cone(0.32, 0.62, 0x3f5d7d, 10);
    body.position.y = 0.42;
    this.head = new THREE.Group();
    const skull = sphere(0.18, 0xf0c8a0, 10);
    const beard = cone(0.2, 0.32, 0xffffff, 9);
    beard.position.set(0, -0.16, 0.07);
    beard.rotation.x = 0.5;
    const hat = cone(0.2, 0.5, PAL.cherry, 10);
    hat.position.y = 0.3;
    const face = eyes(0.13, 0.05);
    face.position.set(0, 0.03, 0.15);
    // THE SMILE
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 10, Math.PI), toonMat(0x8a4a3c));
    smile.position.set(0, -0.04, 0.17);
    smile.rotation.z = Math.PI;
    this.head.add(skull, beard, hat, face, smile);
    this.head.position.y = 0.82;
    this.group.add(boots, body, this.head);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    // ceramic stillness… with the occasional unsettling eye-dart
    const dart = Math.floor(time * 0.4) % 5 === 0 ? Math.sin(time * 3) * 0.15 : 0;
    this.head.rotation.y = dart;
    // shake harder as he cracks
    if (this.hpPct < 0.6) {
      this.group.position.x = (Math.random() - 0.5) * (0.6 - this.hpPct) * 0.06;
    }
  }
}

class FridgeView extends BaseView {
  private door: THREE.Group;

  constructor() {
    super();
    const body = box(0.62, 1.05, 0.55, 0xeef0f2);
    body.position.y = 0.55;
    this.door = new THREE.Group();
    const doorMesh = box(0.6, 0.48, 0.06, 0xe4e8ec);
    doorMesh.position.set(0.3, 0, 0.03);
    this.door.add(doorMesh);
    this.door.position.set(-0.3, 0.78, 0.28);
    const handle = box(0.05, 0.3, 0.05, PAL.metalDark);
    handle.position.set(0.22, 0.8, 0.34);
    const face = eyes(0.22, 0.08);
    face.position.set(0, 0.42, 0.3);
    // the tiny fedora of the Coldfather
    const brim = cyl(0.26, 0.26, 0.04, 0x2e2620, 12);
    brim.position.y = 1.12;
    const crown = cyl(0.16, 0.18, 0.18, 0x2e2620, 12);
    crown.position.y = 1.2;
    const band = cyl(0.165, 0.185, 0.05, PAL.cherry, 12);
    band.position.y = 1.14;
    // fridge magnet: a tiny letter A
    const magnet = box(0.1, 0.12, 0.03, PAL.mint);
    magnet.position.set(-0.15, 0.35, 0.3);
    this.group.add(body, this.door, handle, face, brim, crown, band, magnet);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.door.rotation.y = -Math.sin(Math.min(1, this.fireT) * Math.PI) * 0.9;
  }
}

class BandoleroView extends BaseView {
  private band: THREE.Mesh;
  private arm: THREE.Group;

  constructor() {
    super();
    const base = box(0.55, 0.14, 0.55, PAL.wood);
    base.position.y = 0.07;
    this.arm = new THREE.Group();
    for (const s of [-1, 1]) {
      const post = cyl(0.05, 0.06, 0.7, 0xc89058, 7);
      post.position.set(s * 0.26, 0.35, 0);
      post.rotation.z = -s * 0.18;
      this.arm.add(post);
    }
    this.band = new THREE.Mesh(
      new THREE.TorusGeometry(0.26, 0.03, 6, 16),
      toonMat(0xd8a44c),
    );
    this.band.position.y = 0.68;
    this.band.scale.set(1, 0.5, 1);
    this.arm.add(this.band);
    // poncho + squinty hat block
    const poncho = cone(0.3, 0.4, 0xa84a3c, 8);
    poncho.position.y = 0.32;
    const hatBrim = cyl(0.24, 0.24, 0.04, 0x6e4426, 10);
    hatBrim.position.y = 0.56;
    const hatTop = cyl(0.12, 0.14, 0.16, 0x6e4426, 10);
    hatTop.position.y = 0.65;
    const squint1 = box(0.09, 0.025, 0.02, 0x1a1410);
    squint1.position.set(-0.08, 0.47, 0.27);
    const squint2 = box(0.09, 0.025, 0.02, 0x1a1410);
    squint2.position.set(0.08, 0.47, 0.27);
    const body = new THREE.Group();
    body.add(poncho, hatBrim, hatTop, squint1, squint2);
    body.position.set(0, 0.05, -0.32);
    this.arm.position.z = 0.1;
    this.group.add(base, this.arm, body);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    // slow draw… then TWANG
    const draw = this.fireT > 0.6 ? 1 - (this.fireT - 0.6) * 2.5 : Math.min(1, (0.6 - this.fireT) * 0.4 + 0.3);
    this.band.scale.set(1, 0.5 + (1 - draw) * 0.0 + this.fireT * 0.7, 1 + this.fireT * 0.6);
    this.arm.rotation.x = -0.12 - this.fireT * 0.15;
  }
}

export const TOWER_VIEW_BUILDERS: Record<string, () => TowerView> = {
  'sgt-spritz': () => new SpritzView(),
  'old-smacky': () => new SmackyView(),
  'sir-toastsalot': () => new ToastView(),
  'big-blow': () => new FanView(),
  'stick-rick': () => new RickView(),
  'gnomeo': () => new GnomeView(),
  'the-coldfather': () => new FridgeView(),
  'bandolero': () => new BandoleroView(),
  // test fixtures fall back to a spritz so tooling demos render
  'test-gun': () => new SpritzView(),
  'test-swatter': () => new SmackyView(),
  'test-freezer': () => new FridgeView(),
  'test-trap': () => new RickView(),
};

export function buildTowerView(def: string): TowerView {
  const builder = TOWER_VIEW_BUILDERS[def] ?? TOWER_VIEW_BUILDERS['sgt-spritz'];
  return builder();
}

/** The Crumb King — bosses get bespoke, non-instanced bodies. */
export function buildCrumbKing(): { group: THREE.Group; animate: (dt: number, time: number) => void } {
  const group = new THREE.Group();
  const core = sphere(0.85, PAL.crumbGold, 12);
  core.position.y = 0.9;
  core.scale.set(1, 0.92, 1);
  // crusty lumps
  const lumps: THREE.Mesh[] = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const r = 0.65 + (i % 3) * 0.12;
    const lump = sphere(0.22 + (i % 3) * 0.06, i % 2 === 0 ? 0xc8943c : 0xe8b45c, 8);
    lump.position.set(Math.sin(a) * r, 0.9 + Math.cos(a * 1.7) * 0.45, Math.cos(a) * r);
    lumps.push(lump);
    group.add(lump);
  }
  // crown
  const crownBase = cyl(0.34, 0.38, 0.22, 0xffd230, 10);
  crownBase.position.y = 1.95;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const spike = cone(0.07, 0.2, 0xffd230, 6);
    spike.position.set(Math.sin(a) * 0.3, 2.13, Math.cos(a) * 0.3);
    group.add(spike);
  }
  // angry royal face
  const face = eyes(0.4, 0.14);
  face.position.set(0, 1.15, 0.72);
  const brow1 = rot(box(0.3, 0.06, 0.05, 0x6e4426), 0, 0, 0.5);
  brow1.position.set(-0.2, 1.36, 0.78);
  const brow2 = rot(box(0.3, 0.06, 0.05, 0x6e4426), 0, 0, -0.5);
  brow2.position.set(0.2, 1.36, 0.78);
  const mouth = box(0.4, 0.12, 0.06, 0x4a2818);
  mouth.position.set(0, 0.78, 0.8);
  // royal cape
  const cape = cone(0.7, 1.0, 0x8a2434, 10);
  cape.position.set(0, 0.7, -0.5);
  cape.rotation.x = 0.5;
  group.add(core, crownBase, face, brow1, brow2, mouth, cape);

  return {
    group,
    animate: (dt: number, time: number) => {
      void dt;
      const chew = 1 + Math.sin(time * 4) * 0.04;
      group.scale.set(chew, 2 - chew, chew);
      lumps.forEach((l, i) => {
        l.position.y += Math.sin(time * 3 + i) * 0.0015;
      });
      mouth.scale.y = 1 + Math.sin(time * 8) * 0.4;
    },
  };
}
