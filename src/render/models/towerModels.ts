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

class VroombaView extends BaseView {
  private body: THREE.Group;
  private ledL: THREE.Mesh;
  private ledR: THREE.Mesh;

  constructor() {
    super();
    this.body = new THREE.Group();
    const disc = cyl(0.34, 0.36, 0.14, 0xe8e8ee, 16);
    disc.position.y = 0.09;
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.035, 6, 20), toonMat(0x3a3a42));
    bumper.rotation.x = Math.PI / 2;
    bumper.position.y = 0.09;
    const dome = sphere(0.13, 0x3a3a42, 10);
    dome.scale.y = 0.5;
    dome.position.y = 0.19;
    this.ledL = sphere(0.03, 0xff5a5a, 6);
    this.ledL.castShadow = false;
    (this.ledL.material as THREE.MeshToonMaterial).emissive = new THREE.Color(0xff2020);
    this.ledL.position.set(-0.08, 0.13, 0.34);
    this.ledR = sphere(0.03, 0xff5a5a, 6);
    this.ledR.castShadow = false;
    (this.ledR.material as THREE.MeshToonMaterial).emissive = new THREE.Color(0xff2020);
    this.ledR.position.set(0.08, 0.13, 0.34);
    const brushGuard = cyl(0.06, 0.06, 0.32, 0x2e2620, 8);
    brushGuard.rotation.z = Math.PI / 2;
    brushGuard.position.set(0, 0.03, 0.3);
    this.body.add(disc, bumper, dome, this.ledL, this.ledR, brushGuard);
    this.group.add(this.body);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.body.rotation.y = time * 0.6 + Math.sin(time * 3) * 0.3;
    this.body.position.x = Math.sin(time * 1.3) * 0.12;
    this.body.position.z = Math.cos(time * 0.9) * 0.1;
    const pulse = 0.6 + Math.sin(time * 10) * 0.4 + this.fireT * 1.5;
    (this.ledL.material as THREE.MeshToonMaterial).emissiveIntensity = pulse;
    (this.ledR.material as THREE.MeshToonMaterial).emissiveIntensity = pulse;
  }
}

class ScorchView extends BaseView {
  private arm: THREE.Group;
  private lens: THREE.Mesh;

  constructor() {
    super();
    const base = cyl(0.28, 0.34, 0.2, PAL.woodDark, 10);
    base.position.y = 0.1;
    const stand = cyl(0.05, 0.06, 0.7, 0x4a4e58, 8);
    stand.position.y = 0.55;
    this.arm = new THREE.Group();
    const joint = sphere(0.08, 0x4a4e58, 8);
    const handle = cyl(0.035, 0.04, 0.4, 0x8a5a36, 8);
    handle.rotation.z = Math.PI / 2;
    handle.position.x = -0.22;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.04, 8, 18), toonMat(0xc89858));
    ring.position.x = 0.1;
    this.lens = new THREE.Mesh(new THREE.CircleGeometry(0.19, 16), new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.55 }));
    this.lens.position.x = 0.1;
    this.lens.rotation.y = Math.PI / 2;
    const face = eyes(0.13, 0.045);
    face.position.set(-0.05, 0.16, 0);
    face.rotation.y = Math.PI / 2;
    this.arm.add(joint, handle, ring, this.lens, face);
    this.arm.position.y = 0.95;
    this.group.add(base, stand, this.arm);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.arm.rotation.z = Math.sin(time * 0.9) * 0.25 - this.fireT * 0.3;
    this.arm.rotation.y = Math.sin(time * 0.5) * 0.35;
    const mat = this.lens.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.4 + Math.sin(time * 3) * 0.1 + this.fireT * 0.5;
  }
}

class RowaveView extends BaseView {
  private door: THREE.Group;
  private windowGlow: THREE.Mesh;

  constructor() {
    super();
    const body = box(0.9, 0.6, 0.6, 0xd8dade);
    body.position.y = 0.4;
    this.door = new THREE.Group();
    const doorPanel = box(0.55, 0.5, 0.05, 0x2a2a30);
    this.windowGlow = box(0.4, 0.36, 0.02, 0x1a3a2e);
    (this.windowGlow.material as THREE.MeshToonMaterial).emissive = new THREE.Color(0x2adc7a);
    this.windowGlow.position.z = 0.03;
    // menacing slit eyes glowing through the window
    const eyeL = box(0.09, 0.05, 0.02, 0x8affc0);
    eyeL.position.set(-0.09, 0.03, 0.05);
    (eyeL.material as THREE.MeshToonMaterial).emissive = new THREE.Color(0x8affc0);
    const eyeR = box(0.09, 0.05, 0.02, 0x8affc0);
    eyeR.position.set(0.09, 0.03, 0.05);
    (eyeR.material as THREE.MeshToonMaterial).emissive = new THREE.Color(0x8affc0);
    this.door.add(doorPanel, this.windowGlow, eyeL, eyeR);
    this.door.position.set(-0.42, 0.42, 0.31);
    const handle = box(0.04, 0.3, 0.05, 0x8a8e96);
    handle.position.set(-0.16, 0.42, 0.34);
    const panel = box(0.18, 0.5, 0.04, 0x3a3a42);
    panel.position.set(0.32, 0.42, 0.31);
    const dial = cyl(0.06, 0.06, 0.04, PAL.cherry, 10);
    dial.rotation.x = Math.PI / 2;
    dial.position.set(0.32, 0.6, 0.34);
    this.group.add(body, this.door, handle, panel, dial);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    const hum = 0.5 + Math.sin(time * 14) * 0.3 + this.fireT * 2;
    (this.windowGlow.material as THREE.MeshToonMaterial).emissiveIntensity = hum;
    this.group.position.y = Math.sin(time * 20) * this.fireT * 0.015;
  }
}

class BubblesView extends BaseView {
  private wand: THREE.Group;
  private motes: THREE.Mesh[] = [];

  constructor() {
    super();
    const stand = cyl(0.26, 0.32, 0.18, 0xe8b8d8, 12);
    stand.position.y = 0.09;
    const pillar = cyl(0.06, 0.08, 0.55, 0xf0d0e8, 10);
    pillar.position.y = 0.42;
    this.wand = new THREE.Group();
    const handle = cyl(0.03, 0.035, 0.28, 0xf7c8e0, 8);
    handle.position.y = -0.1;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 18), toonMat(0xffe27a));
    ring.position.y = 0.14;
    const film = new THREE.Mesh(new THREE.CircleGeometry(0.15, 16), new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.35 }));
    film.position.y = 0.14;
    const face = eyes(0.17, 0.06);
    face.position.set(0, 0.75, 0.16);
    this.wand.add(handle, ring, film);
    this.wand.position.y = 0.75;
    for (let i = 0; i < 5; i++) {
      const bubble = new THREE.Mesh(
        new THREE.SphereGeometry(0.045 + (i % 3) * 0.015, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.5 }),
      );
      bubble.position.set((Math.sin(i * 2) * 0.3), 0.9 + i * 0.12, Math.cos(i * 1.7) * 0.25);
      this.motes.push(bubble);
      this.group.add(bubble);
    }
    this.group.add(stand, pillar, this.wand, face);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.wand.rotation.z = Math.sin(time * 1.4) * 0.15 + this.fireT * 0.4;
    this.motes.forEach((m, i) => {
      m.position.y = 0.9 + ((time * 0.3 + i * 0.5) % 1.0) * 0.8;
      m.position.x = Math.sin(time * 0.8 + i * 2) * 0.32;
      m.position.z = Math.cos(time * 0.6 + i * 1.7) * 0.28;
      m.scale.setScalar(1 + Math.sin(time * 4 + i) * 0.15);
    });
  }
}

class SaltimusView extends BaseView {
  private chest: THREE.Mesh;
  private cap: THREE.Group;

  constructor() {
    super();
    const base = cyl(0.24, 0.28, 0.14, 0xc8ccd4, 12);
    base.position.y = 0.07;
    const body = cyl(0.22, 0.24, 0.62, 0xf0f2f6, 12);
    body.position.y = 0.45;
    this.chest = box(0.22, 0.18, 0.06, PAL.cherry);
    this.chest.position.set(0, 0.5, 0.2);
    const chestStar = sphere(0.045, PAL.butter, 6);
    chestStar.position.set(0, 0.5, 0.24);
    this.cap = new THREE.Group();
    const capBody = cyl(0.2, 0.22, 0.1, 0x8a8e96, 12);
    const holes = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const h = sphere(0.015, 0x2e2620, 4);
      h.castShadow = false;
      h.position.set(Math.sin(a) * 0.1, 0.06, Math.cos(a) * 0.1);
      holes.add(h);
    }
    this.cap.add(capBody, holes);
    this.cap.position.y = 0.81;
    const face = eyes(0.11, 0.045);
    face.position.set(0, 0.5, 0.24);
    face.position.y = 0.62;
    const cape = cone(0.16, 0.28, 0x8a2434, 8);
    cape.position.set(0, 0.4, -0.15);
    this.group.add(base, body, this.chest, chestStar, this.cap, face, cape);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    const shake = Math.sin(Math.min(this.fireT * 3, 1) * Math.PI) * 0.12;
    this.cap.rotation.z = shake;
    this.chest.scale.set(1 + Math.sin(time * 2) * 0.02, 1, 1);
  }
}

class DailySmackView extends BaseView {
  private roll: THREE.Group;

  constructor() {
    super();
    const stand = cyl(0.24, 0.3, 0.5, PAL.woodDark, 10);
    stand.position.y = 0.25;
    this.roll = new THREE.Group();
    const paper = cyl(0.16, 0.16, 0.6, 0xf0ead8, 12);
    paper.rotation.z = Math.PI / 2;
    const band = cyl(0.165, 0.165, 0.08, PAL.cherry, 12);
    band.rotation.z = Math.PI / 2;
    // printed headline lines (thin dark boxes)
    for (let i = 0; i < 3; i++) {
      const line = box(0.5, 0.02, 0.01, 0x3a3a42);
      line.position.set(0, 0.08 - i * 0.05, 0.16);
      this.roll.add(line);
    }
    const face = eyes(0.16, 0.055);
    face.position.set(0.24, 0, 0.16);
    face.rotation.y = 0;
    this.roll.add(paper, band, face);
    this.roll.position.y = 0.66;
    this.group.add(stand, this.roll);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.roll.rotation.z = Math.sin(time * 2) * 0.08 - this.fireT * 0.6;
    this.roll.position.z = -this.fireT * 0.1;
  }
}

class LuxView extends BaseView {
  private shade: THREE.Group;
  private cone: THREE.Mesh;

  constructor() {
    super();
    const base = cyl(0.22, 0.28, 0.1, 0x8a5a36, 10);
    base.position.y = 0.05;
    const pole = cyl(0.035, 0.045, 0.75, 0xc89858, 8);
    pole.position.y = 0.48;
    this.shade = new THREE.Group();
    const shadeMesh = cyl(0.28, 0.2, 0.34, PAL.butter, 12);
    this.shade.add(shadeMesh);
    const face = eyes(0.15, 0.055);
    face.position.set(0, -0.05, 0.19);
    this.shade.add(face);
    this.shade.position.y = 1.05;
    // the reveal light cone — the whole point of this tower
    this.cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 1.5, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
    );
    this.cone.position.y = 0.35;
    this.cone.rotation.x = Math.PI;
    this.group.add(base, pole, this.shade, this.cone);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.shade.rotation.y = Math.sin(time * 0.7) * 0.2;
    const mat = this.cone.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.1 + Math.sin(time * 1.5) * 0.03 + this.fireT * 0.25;
  }
}

class DjDecibelView extends BaseView {
  private coneL: THREE.Mesh;
  private coneR: THREE.Mesh;
  private antenna: THREE.Mesh;

  constructor() {
    super();
    const body = box(0.75, 0.42, 0.28, 0x3a3a42);
    body.position.y = 0.3;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.03, 6, 16, Math.PI), toonMat(0x2a2a30));
    handle.position.y = 0.62;
    this.coneL = cyl(0.13, 0.15, 0.1, 0x8a8e96, 14);
    this.coneL.rotation.x = Math.PI / 2;
    this.coneL.position.set(-0.2, 0.3, 0.15);
    this.coneR = cyl(0.13, 0.15, 0.1, 0x8a8e96, 14);
    this.coneR.rotation.x = Math.PI / 2;
    this.coneR.position.set(0.2, 0.3, 0.15);
    const faceStrip = box(0.7, 0.08, 0.02, PAL.cherry);
    faceStrip.position.set(0, 0.44, 0.15);
    this.antenna = cyl(0.008, 0.012, 0.3, 0x8a8e96, 6);
    this.antenna.position.set(0.34, 0.62, 0);
    const face = eyes(0.0, 0.04);
    face.position.set(0, 0.44, 0.17);
    this.group.add(body, handle, this.coneL, this.coneR, faceStrip, this.antenna, face);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    const beat = 1 + Math.abs(Math.sin(time * 6)) * 0.18 + this.fireT * 0.3;
    this.coneL.scale.set(beat, beat, 1);
    this.coneR.scale.set(beat, beat, 1);
    this.antenna.rotation.z = Math.sin(time * 3) * 0.15;
  }
}

class EauDeNoView extends BaseView {
  private bulb: THREE.Group;
  private puff: THREE.Mesh;

  constructor() {
    super();
    const base = cyl(0.16, 0.2, 0.16, 0xcf9fd8, 12);
    base.position.y = 0.08;
    const body = cyl(0.14, 0.16, 0.5, 0xe8c8f0, 12);
    body.position.y = 0.41;
    const neck = cyl(0.05, 0.07, 0.14, 0xd8a8e8, 10);
    neck.position.y = 0.73;
    this.bulb = new THREE.Group();
    const puffBulb = sphere(0.15, 0xe8a8c8, 10);
    this.puff = puffBulb;
    const tube = cyl(0.02, 0.02, 0.3, 0xd8a8c0, 6);
    tube.rotation.z = Math.PI / 2.4;
    tube.position.set(-0.15, 0.05, 0);
    this.bulb.add(puffBulb, tube);
    this.bulb.position.set(0.12, 0.95, 0);
    const face = eyes(0.09, 0.04);
    face.position.set(0, 0.82, 0.1);
    this.group.add(base, body, neck, this.bulb, face);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    const squeeze = 1 - Math.max(0, Math.sin(this.fireT * Math.PI)) * 0.3 + Math.sin(time * 1.6) * 0.02;
    this.puff.scale.set(squeeze, 1 / squeeze, squeeze);
  }
}

class OldStinkyView extends BaseView {
  private sock: THREE.Group;
  private haze: THREE.Mesh[] = [];

  constructor() {
    super();
    this.sock = new THREE.Group();
    const foot = sphere(0.24, 0x8a9a6c, 10);
    foot.scale.set(1, 0.85, 1.3);
    foot.position.set(0, 0.24, 0.06);
    const leg = cyl(0.15, 0.19, 0.5, 0x9caa7e, 10);
    leg.position.set(0, 0.55, -0.15);
    leg.rotation.x = -0.25;
    const cuff = cyl(0.19, 0.19, 0.08, 0xd8504f, 10);
    cuff.position.set(0, 0.82, -0.32);
    cuff.rotation.x = -0.25;
    // classic hole
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.05, 8), new THREE.MeshBasicMaterial({ color: 0x1a1410 }));
    hole.position.set(0.1, 0.28, 0.3);
    const face = eyes(0.13, 0.05);
    face.position.set(0, 0.24, 0.28);
    this.sock.add(foot, leg, cuff, hole, face);
    this.group.add(this.sock);
    for (let i = 0; i < 4; i++) {
      const wisp = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0x7dcf5a, transparent: true, opacity: 0.3 }),
      );
      wisp.position.set(Math.sin(i * 2) * 0.25, 0.5 + i * 0.15, Math.cos(i * 1.5) * 0.2);
      this.haze.push(wisp);
      this.group.add(wisp);
    }
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.sock.rotation.z = Math.sin(time * 1.1) * 0.06;
    this.haze.forEach((w, i) => {
      w.position.y = 0.45 + ((time * 0.4 + i * 0.4) % 1.0) * 0.6;
      w.position.x = Math.sin(time * 0.7 + i * 2) * 0.28;
      w.scale.setScalar(0.8 + Math.sin(time * 2 + i) * 0.25 + this.fireT * 0.4);
    });
  }
}

class BlendulaView extends BaseView {
  private blades: THREE.Mesh;
  private capeGroup: THREE.Group;

  constructor() {
    super();
    const base = cyl(0.24, 0.28, 0.16, 0x2a2a30, 12);
    base.position.y = 0.08;
    const jar = cyl(0.22, 0.26, 0.6, 0xcfe8ee, 12);
    (jar.material as THREE.MeshToonMaterial).transparent = true;
    (jar.material as THREE.MeshToonMaterial).opacity = 0.55;
    jar.position.y = 0.46;
    this.blades = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.02, 0.05),
      toonMat(0xb8bcc4),
    );
    this.blades.position.y = 0.2;
    const lid = cyl(0.2, 0.2, 0.06, 0x2a2a30, 12);
    lid.position.y = 0.79;
    this.capeGroup = new THREE.Group();
    const cape = cone(0.22, 0.4, 0x2a1420, 10);
    cape.position.set(0, 0.3, -0.2);
    cape.rotation.x = 0.35;
    const capeInner = cone(0.16, 0.32, 0x8a2434, 10);
    capeInner.position.set(0, 0.32, -0.16);
    capeInner.rotation.x = 0.35;
    this.capeGroup.add(cape, capeInner);
    const face = eyes(0.1, 0.045);
    face.position.set(0, 0.6, 0.24);
    const collar = box(0.3, 0.06, 0.06, 0xe8e8ee);
    collar.position.set(0, 0.7, 0.16);
    this.group.add(base, jar, this.blades, lid, this.capeGroup, face, collar);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.blades.rotation.y += dt * (4 + this.fireT * 40);
    this.capeGroup.rotation.y = Math.sin(time * 1.5) * 0.15;
  }
}

class TickTockView extends BaseView {
  private pendulum: THREE.Group;
  private door: THREE.Mesh;

  constructor() {
    super();
    const body = box(0.5, 0.85, 0.3, PAL.woodDark);
    body.position.y = 0.55;
    const roof = cone(0.36, 0.28, 0x6e4426, 4);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 1.1;
    const face = cyl(0.16, 0.16, 0.04, 0xf0ead8, 16);
    face.rotation.x = Math.PI / 2;
    face.position.set(0, 0.85, 0.16);
    this.door = box(0.16, 0.18, 0.04, 0x8a5a36);
    this.door.position.set(0, 0.55, 0.16);
    const eyesG = eyes(0.06, 0.028);
    eyesG.position.set(0, 0.6, 0.19);
    this.pendulum = new THREE.Group();
    const rod = cyl(0.012, 0.012, 0.45, 0xc89858, 6);
    rod.position.y = -0.22;
    const bob = sphere(0.08, 0xd8a44c, 10);
    bob.position.y = -0.45;
    this.pendulum.add(rod, bob);
    this.pendulum.position.set(0, 0.4, 0);
    this.group.add(body, roof, face, this.door, eyesG, this.pendulum);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.pendulum.rotation.z = Math.sin(time * 2.4) * 0.35;
    // door pops open on fire
    this.door.position.y = 0.55 + Math.max(0, Math.sin(this.fireT * Math.PI)) * 0.25;
  }
}

class AlexisView extends BaseView {
  private ring: THREE.Mesh;

  constructor() {
    super();
    const body = cyl(0.22, 0.24, 0.85, 0xe8e8ee, 16);
    body.position.y = 0.45;
    const top = cyl(0.22, 0.22, 0.04, 0xd0d0d8, 16);
    top.position.y = 0.87;
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.02, 8, 24), toonMat(0x6fc8ff));
    (this.ring.material as THREE.MeshToonMaterial).emissive = new THREE.Color(0x6fc8ff);
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.y = 0.87;
    const grille = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const dot = sphere(0.012, 0x9a9aa2, 4);
      dot.castShadow = false;
      const a = (i / 8) * Math.PI * 2;
      dot.position.set(Math.sin(a) * 0.14, 0.5, Math.cos(a) * 0.14);
      grille.add(dot);
    }
    const face = eyes(0.1, 0.04);
    face.position.set(0, 0.62, 0.2);
    this.group.add(body, top, this.ring, grille, face);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.ring.rotation.y = time * 1.5;
    const mat = this.ring.material as THREE.MeshToonMaterial;
    mat.emissiveIntensity = 0.6 + Math.sin(time * 4) * 0.3 + this.fireT * 1.5;
  }
}

class AudreyView extends BaseView {
  private head: THREE.Group;
  private jawTop: THREE.Mesh;
  private jawBot: THREE.Mesh;

  constructor() {
    super();
    const pot = cyl(0.24, 0.19, 0.34, 0xc06a3c, 10);
    pot.position.y = 0.17;
    const stem = cyl(0.045, 0.06, 0.5, 0x4a7d3c, 8);
    stem.position.y = 0.58;
    this.head = new THREE.Group();
    const lipColor = 0xd8344f;
    this.jawTop = sphere(0.22, PAL.moth, 9);
    this.jawTop.scale.set(1, 0.5, 0.85);
    this.jawTop.position.y = 0.06;
    const lipTop = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 16, Math.PI), toonMat(lipColor));
    lipTop.rotation.x = Math.PI;
    lipTop.position.y = 0.02;
    this.jawBot = sphere(0.2, 0x5a8f3c, 9);
    this.jawBot.scale.set(0.95, 0.42, 0.8);
    this.jawBot.position.y = -0.1;
    const lipBot = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.03, 6, 16, Math.PI), toonMat(lipColor));
    lipBot.position.y = -0.1;
    // spots for teeth-ish texture read
    for (let i = 0; i < 4; i++) {
      const tooth = cone(0.02, 0.05, 0xfff4e0, 5);
      tooth.rotation.x = Math.PI;
      tooth.position.set((i - 1.5) * 0.08, 0.03, 0.16);
      this.head.add(tooth);
    }
    const face = eyes(0.13, 0.045);
    face.position.set(0, 0.28, 0.1);
    this.head.add(this.jawTop, lipTop, this.jawBot, lipBot, face);
    this.head.position.y = 0.95;
    this.group.add(pot, stem, this.head);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.head.rotation.z = Math.sin(time * 1.3) * 0.12;
    this.head.rotation.x = Math.sin(time * 0.9) * 0.06;
    const chomp = Math.max(0, Math.sin(this.fireT * Math.PI));
    this.jawTop.rotation.x = -chomp * 0.5;
    this.jawBot.rotation.x = chomp * 0.5;
  }
}

class StaticView extends BaseView {
  private balloon: THREE.Group;
  private arcs: THREE.Mesh[] = [];

  constructor() {
    super();
    const carpet = box(0.5, 0.04, 0.5, 0x9a6ab0);
    carpet.position.y = 0.02;
    this.balloon = new THREE.Group();
    const body = sphere(0.28, 0xe85a9a, 12);
    body.scale.set(1, 1.2, 1);
    const knot = cone(0.05, 0.08, 0xc83a7a, 6);
    knot.position.y = -0.34;
    const string = cyl(0.008, 0.008, 0.3, 0x8a8e96, 4);
    string.position.y = -0.5;
    const face = eyes(0.11, 0.045);
    face.position.set(0, 0.05, 0.24);
    this.balloon.add(body, knot, string, face);
    this.balloon.position.y = 0.85;
    for (let i = 0; i < 5; i++) {
      const arc = new THREE.Mesh(
        new THREE.TorusGeometry(0.12 + i * 0.02, 0.008, 4, 8, Math.PI * 0.6),
        new THREE.MeshBasicMaterial({ color: 0xcfe8ff, transparent: true, opacity: 0 }),
      );
      arc.position.set(Math.sin(i * 1.4) * 0.18, 0.55 + i * 0.05, Math.cos(i * 1.1) * 0.15);
      this.arcs.push(arc);
      this.group.add(arc);
    }
    this.group.add(carpet, this.balloon);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    this.balloon.position.y = 0.85 + Math.sin(time * 1.7) * 0.05;
    this.balloon.rotation.z = Math.sin(time * 1.1) * 0.08;
    this.arcs.forEach((a, i) => {
      const flick = (Math.sin(time * 9 + i * 3) + 1) / 2;
      const mat = a.material as THREE.MeshBasicMaterial;
      mat.opacity = flick > 0.85 ? 0.8 : 0 + this.fireT * 0.5;
      a.rotation.y = time * 2 + i;
    });
  }
}

class SnappyView extends BaseView {
  private bar: THREE.Group;

  constructor() {
    super();
    const board = box(0.55, 0.06, 0.32, PAL.wood);
    board.position.y = 0.03;
    this.bar = new THREE.Group();
    const armBar = box(0.5, 0.03, 0.03, 0x9a9aa2);
    armBar.position.set(0, 0.1, 0);
    const spring = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 10), toonMat(0x6e6e78));
    spring.rotation.x = Math.PI / 2;
    spring.position.set(-0.26, 0.06, 0);
    this.bar.add(armBar, spring);
    this.bar.position.set(0.02, 0, -0.02);
    this.bar.rotation.z = -1.3; // armed, cocked back
    const trigger = box(0.08, 0.03, 0.1, 0xc8ccd4);
    trigger.position.set(0.15, 0.08, 0);
    const face = eyes(0.1, 0.035);
    face.position.set(-0.1, 0.1, 0.14);
    this.group.add(board, this.bar, trigger, face);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    // stays armed (cocked) at rest; SNAPS flat when fireT decays
    const armed = -1.3;
    const snapped = 0.15;
    this.bar.rotation.z = armed + (snapped - armed) * Math.min(1, this.fireT * 3);
    void time;
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
  'vroomba': () => new VroombaView(),
  'professor-scorch': () => new ScorchView(),
  'mike-rowave': () => new RowaveView(),
  'bubbles-laroux': () => new BubblesView(),
  'saltimus-prime': () => new SaltimusView(),
  'the-daily-smack': () => new DailySmackView(),
  'lux-interior': () => new LuxView(),
  'dj-decibel': () => new DjDecibelView(),
  'eau-de-no': () => new EauDeNoView(),
  'old-stinky': () => new OldStinkyView(),
  'count-blendula': () => new BlendulaView(),
  'herr-tick-tock': () => new TickTockView(),
  'alexis': () => new AlexisView(),
  'audrey-the-third': () => new AudreyView(),
  'static': () => new StaticView(),
  'snappy-and-sons': () => new SnappyView(),
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
