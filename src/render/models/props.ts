import * as THREE from 'three';
import { PAL } from '../palette';
import { box, canvasTexture, cone, cyl, sphere, toonMat } from '../build';

/** The birthday cake — the actual HP bar. Wedges vanish bite by bite. */
export class CakeView {
  readonly group = new THREE.Group();
  private wedges: THREE.Group[] = [];
  private flames: THREE.Mesh[] = [];
  private maxSlices: number;

  constructor(maxSlices: number) {
    this.maxSlices = maxSlices;
    // cake stand
    const plate = cyl(1.0, 1.0, 0.08, 0xffffff, 24);
    plate.position.y = 0.04;
    const stem = cyl(0.16, 0.22, 0.3, 0xffffff, 12);
    stem.position.y = -0.15;
    this.group.add(plate, stem);

    const arc = (Math.PI * 2) / maxSlices;
    for (let i = 0; i < maxSlices; i++) {
      const wedge = new THREE.Group();
      const start = i * arc;
      const sponge = new THREE.Mesh(
        new THREE.CylinderGeometry(0.85, 0.85, 0.55, 6, 1, false, start, arc * 0.96),
        toonMat(PAL.cakeSponge),
      );
      sponge.castShadow = true;
      sponge.position.y = 0.36;
      const frosting = new THREE.Mesh(
        new THREE.CylinderGeometry(0.87, 0.84, 0.18, 6, 1, false, start, arc * 0.96),
        toonMat(PAL.cakeFrosting),
      );
      frosting.position.y = 0.72;
      const mid = start + arc / 2;
      const cherry = sphere(0.09, PAL.cakeCherry, 8);
      cherry.position.set(Math.cos(mid) * 0.62, 0.86, -Math.sin(mid) * 0.62);
      wedge.add(sponge, frosting, cherry);
      this.wedges.push(wedge);
      this.group.add(wedge);
    }

    // candles in the center — the wish itself
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const candle = cyl(0.045, 0.045, 0.42, PAL.candle, 8);
      candle.position.set(Math.sin(a) * 0.16, 1.0, Math.cos(a) * 0.16);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.05, 0.16, 7),
        new THREE.MeshBasicMaterial({ color: PAL.flame }),
      );
      flame.position.set(Math.sin(a) * 0.16, 1.28, Math.cos(a) * 0.16);
      this.flames.push(flame);
      this.group.add(candle, flame);
    }
    const glow = new THREE.PointLight(0xffc86a, 3.2, 4.5, 1.6);
    glow.position.y = 1.5;
    this.group.add(glow);
  }

  /** Show exactly n slices remaining. */
  setSlices(n: number): void {
    for (let i = 0; i < this.maxSlices; i++) {
      this.wedges[i].visible = i < n;
    }
  }

  animate(time: number): void {
    this.flames.forEach((f, i) => {
      f.scale.y = 1 + Math.sin(time * 11 + i * 2.1) * 0.25;
      f.scale.x = f.scale.z = 1 + Math.sin(time * 13 + i) * 0.12;
    });
  }
}

/** A single detached wedge — rides on a thieving mouse. */
export function buildSliceProp(): THREE.Group {
  const g = new THREE.Group();
  const sponge = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.4, 0.3, 5, 1, false, 0, 0.9),
    toonMat(PAL.cakeSponge),
  );
  const frosting = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.39, 0.1, 5, 1, false, 0, 0.9),
    toonMat(PAL.cakeFrosting),
  );
  frosting.position.y = 0.18;
  g.add(sponge, frosting);
  return g;
}

// ---------- clutter ----------

function cerealBox(): THREE.Group {
  const g = new THREE.Group();
  const tex = canvasTexture(96, 128, (ctx) => {
    ctx.fillStyle = '#e8504f';
    ctx.fillRect(0, 0, 96, 128);
    ctx.fillStyle = '#fff4e0';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('CRUNCH', 4, 36);
    ctx.fillText('-O\'s', 24, 64);
    ctx.fillStyle = '#ffd97a';
    ctx.beginPath();
    ctx.arc(48, 96, 22, 0, Math.PI * 2);
    ctx.fill();
  });
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.95, 0.92),
    [
      toonMat(0xc84040), toonMat(0xc84040),
      toonMat(0xd84848), toonMat(0xd84848),
      new THREE.MeshToonMaterial({ map: tex }), toonMat(0xc84040),
    ],
  );
  body.castShadow = true;
  body.receiveShadow = true;
  body.position.y = 0.45;
  g.add(body);
  return g;
}

function bookStack(): THREE.Group {
  const g = new THREE.Group();
  const colors = [PAL.denim, PAL.cherry, 0x6e8a4c];
  for (let i = 0; i < 3; i++) {
    const b = box(0.9 - i * 0.06, 0.26, 0.86 - i * 0.04, colors[i]);
    b.position.y = 0.14 + i * 0.27;
    b.rotation.y = (i - 1) * 0.12;
    const pages = box(0.84 - i * 0.06, 0.2, 0.78 - i * 0.04, 0xf6efdc);
    pages.position.copy(b.position);
    pages.position.z += 0.05;
    pages.rotation.y = b.rotation.y;
    g.add(b, pages);
  }
  return g;
}

function tupperware(): THREE.Group {
  const g = new THREE.Group();
  const tub = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.72, 0.92),
    new THREE.MeshToonMaterial({ color: 0xbfe3f7, transparent: true, opacity: 0.7 }),
  );
  tub.castShadow = true;
  tub.position.y = 0.38;
  const lid = box(0.97, 0.1, 0.97, 0x4a90c8);
  lid.position.y = 0.78;
  const mystery = box(0.6, 0.4, 0.6, 0x8a9a4c);
  mystery.position.y = 0.3;
  g.add(tub, lid, mystery);
  return g;
}

function spongeWall(): THREE.Group {
  const g = new THREE.Group();
  const body = box(0.92, 0.55, 0.92, 0xffd230);
  body.position.y = 0.28;
  const scrub = box(0.92, 0.2, 0.92, 0x3c8a5e);
  scrub.position.y = 0.65;
  g.add(body, scrub);
  return g;
}

function utensils(): THREE.Group {
  const g = new THREE.Group();
  const cup = cyl(0.3, 0.26, 0.5, 0xd9b98a, 10);
  cup.position.y = 0.25;
  const spat = box(0.16, 0.5, 0.04, PAL.cherry);
  spat.position.set(0.05, 0.7, 0);
  spat.rotation.z = 0.2;
  const spoon = cyl(0.04, 0.04, 0.55, PAL.metalDark, 6);
  spoon.position.set(-0.1, 0.7, 0.05);
  spoon.rotation.z = -0.15;
  const ball = sphere(0.09, PAL.metalDark, 8);
  ball.position.set(-0.14, 0.95, 0.05);
  g.add(cup, spat, spoon, ball);
  return g;
}

function pastaBox(): THREE.Group {
  const g = new THREE.Group();
  const body = box(0.85, 0.9, 0.5, 0x3c6e8a);
  body.position.y = 0.45;
  const label = box(0.7, 0.4, 0.04, 0xf6efdc);
  label.position.set(0, 0.5, 0.26);
  const window = box(0.5, 0.22, 0.05, 0xead9a0);
  window.position.set(0, 0.24, 0.26);
  g.add(body, label, window);
  return g;
}

const CLUTTER_BUILDERS: Record<string, () => THREE.Group> = {
  cereal: cerealBox,
  books: bookStack,
  tupper: tupperware,
  sponge: spongeWall,
  utensils,
  pasta: pastaBox,
};

/** One visual block per occupied cell, styled by the shape's look. */
export function buildClutterCell(look: string): THREE.Group {
  const builder = CLUTTER_BUILDERS[look] ?? cerealBox;
  return builder();
}

// ---------- projectiles ----------

export function projectileTemplate(kind: 'droplet' | 'toast' | 'band'): THREE.BufferGeometry {
  switch (kind) {
    case 'toast': {
      const geo = new THREE.BoxGeometry(0.34, 0.34, 0.09);
      return geo;
    }
    case 'band': {
      return new THREE.TorusGeometry(0.14, 0.035, 6, 12);
    }
    case 'droplet':
    default:
      return new THREE.SphereGeometry(0.1, 8, 6);
  }
}

export const PROJECTILE_LOOKS: Record<string, { kind: 'droplet' | 'toast' | 'band'; color: number }> = {
  'sgt-spritz': { kind: 'droplet', color: 0x9fc8e8 },
  'sir-toastsalot': { kind: 'toast', color: 0xd8a44c },
  'bandolero': { kind: 'band', color: 0xd8a44c },
  'test-gun': { kind: 'droplet', color: 0x9fc8e8 },
};
