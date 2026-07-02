import * as THREE from 'three';
import { at, box, cone, cyl, eyes, rot, sphere } from '../build';

/**
 * Pets (GAME-PROMPT §9), procedural toy-box style matching critterModels.ts/towerModels.ts —
 * primitives + canvas-free vertex/toon materials, no external assets. Pets are singular
 * non-instanced entities (there's only ever one on the board), so they use the same
 * individually-animated THREE.Group pattern as towers rather than critters' InstancedMesh.
 */
export interface PetView {
  group: THREE.Group;
  /** continuous idle/personality animation */
  animate(dt: number, time: number): void;
  /** triggered on petSwat/petBark/petPounce — a quick scale-punch "gotcha" beat */
  punch(): void;
  setMood(mood: 'idle' | 'active'): void;
}

abstract class BasePetView implements PetView {
  group = new THREE.Group();
  protected punchT = 0;
  protected mood: 'idle' | 'active' = 'idle';

  punch(): void {
    this.punchT = 1;
  }

  setMood(mood: 'idle' | 'active'): void {
    this.mood = mood;
  }

  animate(dt: number, _time: number): void {
    this.punchT = Math.max(0, this.punchT - dt * 3.2);
    const punch = 1 + Math.sin(this.punchT * Math.PI) * 0.32;
    this.group.scale.setScalar(punch);
  }
}

const CAT_FUR = 0xe8923a;
const CAT_FUR_DARK = 0xc0722a;
const CAT_CREAM = 0xf7e2c4;

/** Princess Destructo — loaf pose (paws tucked, tail free to flick), pounce anim hook via punch(). */
class CatView extends BasePetView {
  private tail: THREE.Group;
  private ears: THREE.Mesh[] = [];
  private body: THREE.Mesh;

  constructor() {
    super();
    // loaf body: a squashed sphere sitting low, paws implied (tucked, no visible legs)
    this.body = sphere(0.34, CAT_FUR, 12);
    this.body.scale.set(1.25, 0.78, 1.5);
    this.body.position.y = 0.28;

    const chest = sphere(0.2, CAT_CREAM, 10);
    chest.scale.set(0.9, 0.85, 0.7);
    chest.position.set(0, 0.24, 0.34);

    const head = sphere(0.24, CAT_FUR, 10);
    head.position.set(0, 0.5, 0.4);

    const muzzle = sphere(0.11, CAT_CREAM, 8);
    muzzle.position.set(0, 0.44, 0.58);

    const nose = sphere(0.035, 0xd8687c, 6);
    nose.position.set(0, 0.48, 0.62);

    const face = eyes(0.13, 0.06);
    face.position.set(0, 0.53, 0.56);

    for (const s of [-1, 1]) {
      const ear = cone(0.09, 0.16, CAT_FUR, 6);
      ear.position.set(s * 0.15, 0.68, 0.36);
      this.ears.push(ear);
      this.group.add(ear);
    }

    const stripe1 = box(0.3, 0.05, 0.05, CAT_FUR_DARK);
    at(stripe1, 0, 0.5, 0.06);
    const stripe2 = box(0.26, 0.05, 0.05, CAT_FUR_DARK);
    at(stripe2, 0, 0.5, -0.1);

    this.tail = new THREE.Group();
    const tailSeg = cyl(0.055, 0.07, 0.55, CAT_FUR, 8);
    rot(tailSeg, 0, 0, -0.9);
    at(tailSeg, -0.4, 0.32, -0.55);
    this.tail.add(tailSeg);

    this.group.add(this.body, chest, head, muzzle, nose, face, stripe1, stripe2, this.tail);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    // idle: slow tail flick, occasional breathing
    this.tail.rotation.z = Math.sin(time * 1.6) * 0.3;
    const breathe = 1 + Math.sin(time * 1.1) * 0.015;
    this.body.scale.set(1.25 * breathe, 0.78, 1.5 * breathe);
    // active mood (mid-swat/pounce beat): faster tail lash + ears back
    const activeFlick = this.mood === 'active' ? Math.sin(time * 9) * 0.5 : 0;
    this.tail.rotation.z += activeFlick;
    const earPin = this.mood === 'active' ? -0.3 : 0;
    for (const ear of this.ears) ear.rotation.x = earPin;
    // pounce/swat punch: a crouch-then-lunge squash
    if (this.punchT > 0.01) {
      const crouch = Math.sin(this.punchT * Math.PI);
      this.group.position.y = -crouch * 0.06;
      this.group.rotation.x = crouch * 0.12;
    } else {
      this.group.position.y = 0;
      this.group.rotation.x = 0;
    }
  }
}

const DOG_FUR = 0xc9975a;
const DOG_FUR_DARK = 0x8a6236;

/** Sir Barksalot — sitting pose, ear perk + bark bounce via punch(). */
class DogView extends BasePetView {
  private ears: THREE.Mesh[] = [];
  private head: THREE.Group;
  private tail: THREE.Group;

  constructor() {
    super();
    const haunches = sphere(0.26, DOG_FUR, 10);
    haunches.scale.set(1.1, 1.0, 1.3);
    haunches.position.y = 0.26;

    const chest = cyl(0.16, 0.2, 0.4, DOG_FUR, 10);
    chest.rotation.x = -0.35;
    chest.position.set(0, 0.42, 0.22);

    this.head = new THREE.Group();
    const skull = sphere(0.19, DOG_FUR, 10);
    const muzzle = box(0.16, 0.13, 0.2, DOG_FUR);
    muzzle.position.set(0, -0.04, 0.2);
    const nose = sphere(0.035, 0x2e2620, 6);
    nose.position.set(0, -0.03, 0.31);
    const face = eyes(0.1, 0.05);
    face.position.set(0, 0.04, 0.15);
    this.head.add(skull, muzzle, nose, face);
    this.head.position.set(0, 0.72, 0.28);

    for (const s of [-1, 1]) {
      const ear = box(0.09, 0.2, 0.05, DOG_FUR_DARK);
      ear.position.set(s * 0.17, 0.06, -0.02);
      ear.rotation.z = s * 0.3;
      this.ears.push(ear);
      this.head.add(ear);
    }

    this.tail = new THREE.Group();
    const tailSeg = cyl(0.045, 0.06, 0.4, DOG_FUR, 8);
    rot(tailSeg, 0.6, 0, 0);
    at(tailSeg, 0, 0.32, -0.42);
    this.tail.add(tailSeg);

    const collar = cyl(0.19, 0.19, 0.05, 0xd8344f, 10);
    collar.position.set(0, 0.56, 0.24);

    this.group.add(haunches, chest, this.head, this.tail, collar);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    // idle: tail wag, occasional ear perk
    this.tail.rotation.y = Math.sin(time * 3.2) * 0.5;
    const perk = this.mood === 'active' ? 1 : (Math.sin(time * 0.7) > 0.85 ? 0.6 : 0);
    for (const ear of this.ears) ear.rotation.x = -perk * 0.5;
    // bark bounce: a quick head-forward + whole-body hop
    if (this.punchT > 0.01) {
      const t = this.punchT;
      this.head.rotation.x = -Math.sin(t * Math.PI) * 0.35;
      this.group.position.y = Math.sin(t * Math.PI) * 0.08;
    } else {
      this.head.rotation.x = 0;
      this.group.position.y = 0;
    }
  }
}

const BOWL_GLASS = 0xbfe3f7;
const FISH_ORANGE = 0xe8703a;

/** The Oracle — glass bowl, fish orbiting inside, water sheen. Passive; punch() still wired for consistency. */
class GoldfishView extends BasePetView {
  private fish: THREE.Group;
  private water: THREE.Mesh;
  private orbitR = 0.14;

  constructor() {
    super();
    const bowlMat = new THREE.MeshPhysicalMaterial({
      color: BOWL_GLASS, transparent: true, opacity: 0.35, roughness: 0.05,
      transmission: 0.6, thickness: 0.3,
    });
    const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.32, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), bowlMat);
    bowl.position.y = 0.36;
    bowl.rotation.x = Math.PI;

    const base = cyl(0.22, 0.26, 0.06, 0xd9b98a, 12);
    base.position.y = 0.06;

    this.water = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 16),
      new THREE.MeshToonMaterial({ color: 0x6fb6d9, transparent: true, opacity: 0.55 }),
    );
    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0.34;

    this.fish = new THREE.Group();
    const fishBody = sphere(0.06, FISH_ORANGE, 8);
    fishBody.scale.set(1.4, 0.9, 1);
    const fishTail = cone(0.05, 0.08, FISH_ORANGE, 6);
    fishTail.rotation.z = Math.PI / 2;
    fishTail.position.x = -0.09;
    const fishFace = eyes(0.05, 0.02);
    fishFace.position.set(0.05, 0, 0.02);
    this.fish.add(fishBody, fishTail, fishFace);
    this.fish.position.set(this.orbitR, 0.3, 0);

    const pebbles: THREE.Mesh[] = [];
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const pebble = sphere(0.02, i % 2 === 0 ? 0x9a9aa2 : 0xb8c0c8, 5);
      pebble.position.set(Math.cos(a) * 0.18, 0.1, Math.sin(a) * 0.18);
      pebbles.push(pebble);
    }

    this.group.add(base, this.water, bowl, this.fish, ...pebbles);
  }

  override animate(dt: number, time: number): void {
    super.animate(dt, time);
    // fish orbits the bowl; speeds up slightly on the passive "active" beat (prophecy emit)
    const speed = this.mood === 'active' ? 2.4 : 1.1;
    const a = time * speed;
    this.fish.position.set(Math.cos(a) * this.orbitR, 0.3 + Math.sin(time * 2.3) * 0.015, Math.sin(a) * this.orbitR);
    this.fish.rotation.y = -a + Math.PI / 2;
    // water sheen: gentle opacity shimmer
    (this.water.material as THREE.MeshToonMaterial).opacity = 0.5 + Math.sin(time * 1.7) * 0.08;
    if (this.punchT > 0.01) {
      this.water.position.y = 0.34 + Math.sin(this.punchT * Math.PI) * 0.015; // a little ripple, no violence — the Oracle is passive
    } else {
      this.water.position.y = 0.34;
    }
  }
}

export const PET_VIEW_BUILDERS: Record<'cat' | 'dog' | 'goldfish', () => PetView> = {
  cat: () => new CatView(),
  dog: () => new DogView(),
  goldfish: () => new GoldfishView(),
};

export function buildPetView(id: 'cat' | 'dog' | 'goldfish'): PetView {
  return PET_VIEW_BUILDERS[id]();
}
