import * as THREE from 'three';
import { PAL } from './palette';

interface Particle {
  alive: boolean;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; maxLife: number;
  size: number;
  gravity: number;
  color: THREE.Color;
  spin: number;
}

const MAX = 420;
const tmpM = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpS = new THREE.Vector3();
const tmpP = new THREE.Vector3();

/** One pooled InstancedMesh of chunky toon particles + floating halos. Cartoon deaths only. */
export class Vfx {
  readonly root = new THREE.Group();
  private mesh: THREE.InstancedMesh;
  private pool: Particle[] = [];
  private halos: { mesh: THREE.Mesh; t: number }[] = [];
  private rings: { mesh: THREE.Mesh; t: number }[] = [];
  private flashes: { mesh: THREE.Mesh; t: number; maxT: number }[] = [];
  private glints: { group: THREE.Group; t: number; maxT: number }[] = [];
  private arcs: { line: THREE.Line; t: number; maxT: number }[] = [];

  constructor() {
    const geo = new THREE.BoxGeometry(0.1, 0.1, 0.1);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95, toneMapped: false });
    this.mesh = new THREE.InstancedMesh(geo, mat, MAX);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.root.add(this.mesh);
    for (let i = 0; i < MAX; i++) {
      this.pool.push({
        alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        life: 0, maxLife: 1, size: 1, gravity: 0, color: new THREE.Color(), spin: 0,
      });
    }
  }

  private emit(n: number, at: THREE.Vector3Like, opts: {
    color: number | number[];
    speed?: number;
    up?: number;
    life?: number;
    size?: number;
    gravity?: number;
  }): void {
    let emitted = 0;
    for (const p of this.pool) {
      if (emitted >= n) break;
      if (p.alive) continue;
      p.alive = true;
      emitted++;
      p.x = at.x; p.y = at.y + 0.15; p.z = at.z;
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 2) * (0.4 + Math.random() * 0.8);
      p.vx = Math.sin(a) * sp;
      p.vz = Math.cos(a) * sp;
      p.vy = (opts.up ?? 2.2) * (0.5 + Math.random() * 0.7);
      p.maxLife = p.life = (opts.life ?? 0.6) * (0.7 + Math.random() * 0.6);
      p.size = (opts.size ?? 1) * (0.6 + Math.random() * 0.8);
      p.gravity = opts.gravity ?? 7;
      p.spin = (Math.random() - 0.5) * 12;
      const c = Array.isArray(opts.color) ? opts.color[Math.floor(Math.random() * opts.color.length)] : opts.color;
      p.color.set(c);
    }
  }

  // ---- the vocabulary of cartoon violence ----
  poof(at: THREE.Vector3Like): void {
    this.emit(10, at, { color: [PAL.poof, 0xe8d5b0, 0xffffff], speed: 1.6, up: 1.6, life: 0.55, size: 1.6, gravity: 1.5 });
    this.halo(at);
  }

  splat(at: THREE.Vector3Like, color: number = PAL.goo): void {
    this.emit(8, at, { color, speed: 2.4, up: 1.2, life: 0.4, size: 1.0, gravity: 9 });
  }

  splash(at: THREE.Vector3Like): void {
    this.emit(6, at, { color: [PAL.splash, 0xcfe8f7], speed: 1.4, up: 2.4, life: 0.45, size: 0.8 });
  }

  sparks(at: THREE.Vector3Like): void {
    this.emit(7, at, { color: [PAL.spark, 0xffffff], speed: 3, up: 2.5, life: 0.3, size: 0.6, gravity: 4 });
  }

  fire(at: THREE.Vector3Like): void {
    this.emit(9, at, { color: [0xff8c3c, 0xffb347, 0xff5a1c], speed: 1.2, up: 2.8, life: 0.5, size: 1.1, gravity: -1.5 });
  }

  crumbs(at: THREE.Vector3Like, n = 6): void {
    this.emit(n, at, { color: [PAL.crumbGold, 0xc8943c, 0xead9a0], speed: 2, up: 3, life: 0.8, size: 0.7, gravity: 10 });
  }

  confetti(at: THREE.Vector3Like): void {
    this.emit(24, at, { color: [PAL.cherry, PAL.butter, PAL.mint, PAL.denim, 0xffffff], speed: 2.6, up: 4.5, life: 1.4, size: 0.9, gravity: 4 });
  }

  ceramicBurst(at: THREE.Vector3Like): void {
    this.emit(16, at, { color: [0xf0c8a0, PAL.cherry, 0xffffff, 0x3f5d7d], speed: 4, up: 3.5, life: 0.8, size: 1.3, gravity: 9 });
    this.ring(at, 0xffb347);
  }

  gasCloud(at: THREE.Vector3Like): void {
    this.emit(12, at, { color: [0x9aa84c, 0x76914c, 0xbac86a], speed: 0.9, up: 0.9, life: 1.6, size: 2.2, gravity: -0.6 });
  }

  // ---- per-damage-type hit vocabulary (GAME-PROMPT §22: VFX stylized and readable) ----

  /** cold: brittle ice shards, barely arc, shatter-fast */
  iceShards(at: THREE.Vector3Like): void {
    this.emit(7, at, { color: [0xbfe8f7, 0xe8f7ff, 0x9fd8e8], speed: 2.6, up: 1.8, life: 0.35, size: 0.7, gravity: 6 });
  }

  /** gas: small green puffs (lighter/faster than the big gasCloud used for area denial) */
  gasPuff(at: THREE.Vector3Like): void {
    this.emit(6, at, { color: [0x9aa84c, 0x76914c, 0xbac86a], speed: 1.0, up: 1.4, life: 0.6, size: 0.9, gravity: 0.5 });
  }

  /** swat: a cartoon "star pop" burst — impact stars, mickey-moused */
  starPop(at: THREE.Vector3Like): void {
    this.emit(6, at, { color: [0xffe27a, 0xffffff, PAL.butter], speed: 3.4, up: 2.6, life: 0.32, size: 0.9, gravity: 5 });
  }

  /** sonic: a fast double-ring shockwave */
  sonicPulse(at: THREE.Vector3Like): void {
    this.ring(at, 0xcfe3ee);
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.05, 6, 22),
      new THREE.MeshBasicMaterial({ color: 0xcfe3ee, transparent: true, toneMapped: false }),
    );
    mesh.position.set(at.x, at.y + 0.12, at.z);
    mesh.rotation.x = Math.PI / 2;
    this.root.add(mesh);
    this.rings.push({ mesh, t: 0.7 });
  }

  /** light: a tiny lens-glint cross-flare */
  lensGlint(at: THREE.Vector3Like): void {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.06),
      new THREE.MeshBasicMaterial({ color: 0xfff8d8, transparent: true, toneMapped: false, depthWrite: false }),
    );
    mesh.position.set(at.x, at.y + 0.3, at.z);
    const mesh2 = mesh.clone();
    mesh2.rotation.z = Math.PI / 2;
    const g = new THREE.Group();
    g.add(mesh, mesh2);
    this.root.add(g);
    this.glints.push({ group: g, t: 0.4, maxT: 0.4 });
  }

  /** a bright, near-instant flash at a tower's muzzle when it fires — sells the "shot" */
  muzzleFlash(at: THREE.Vector3Like, color = 0xfff2b8): void {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }),
    );
    mesh.position.set(at.x, at.y, at.z);
    this.root.add(mesh);
    this.flashes.push({ mesh, t: 0.14, maxT: 0.14 });
  }

  /** chain lightning: a jagged line between two points, gone in a blink */
  chainArc(from: THREE.Vector3Like, to: THREE.Vector3Like): void {
    const segs = 6;
    const pts: THREE.Vector3[] = [];
    const dir = new THREE.Vector3(to.x - from.x, to.y - from.y, to.z - from.z);
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const p = new THREE.Vector3(from.x + dir.x * t, from.y + dir.y * t + 0.4, from.z + dir.z * t);
      if (i > 0 && i < segs) {
        p.x += (Math.random() - 0.5) * 0.3;
        p.y += (Math.random() - 0.5) * 0.3;
        p.z += (Math.random() - 0.5) * 0.3;
      }
      pts.push(p);
    }
    const geom = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({ color: 0xcfe8ff, transparent: true, toneMapped: false, linewidth: 2 });
    const line = new THREE.Line(geom, mat);
    this.root.add(line);
    this.arcs.push({ line, t: 0.22, maxT: 0.22 });
    this.sparks(from);
    this.sparks(to);
  }

  /** a soap-bubble popping — expanding translucent ring + a couple of droplets */
  bubblePop(at: THREE.Vector3Like): void {
    this.ring(at, 0xdfefff);
    this.emit(5, at, { color: [0xdfefff, 0xffffff, 0xbfe3f7], speed: 1.2, up: 1.6, life: 0.4, size: 0.5, gravity: 3 });
  }

  /** Cartoon soul ascending. Mandatory. */
  private halo(at: THREE.Vector3Like): void {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.035, 6, 14),
      new THREE.MeshBasicMaterial({ color: 0xfff2b8, transparent: true, toneMapped: false }),
    );
    mesh.position.set(at.x, at.y + 0.4, at.z);
    mesh.rotation.x = Math.PI / 2.3;
    this.root.add(mesh);
    this.halos.push({ mesh, t: 1.1 });
  }

  ring(at: THREE.Vector3Like, color = 0xffe27a): void {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.05, 6, 22),
      new THREE.MeshBasicMaterial({ color, transparent: true, toneMapped: false }),
    );
    mesh.position.set(at.x, at.y + 0.12, at.z);
    mesh.rotation.x = Math.PI / 2;
    this.root.add(mesh);
    this.rings.push({ mesh, t: 1 });
  }

  update(dt: number): void {
    let i = 0;
    for (const p of this.pool) {
      if (!p.alive) continue;
      p.life -= dt;
      if (p.life <= 0) {
        p.alive = false;
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < 0.04 && p.gravity > 0) {
        p.y = 0.04;
        p.vy *= -0.3;
        p.vx *= 0.8;
        p.vz *= 0.8;
      }
      const k = p.life / p.maxLife;
      tmpP.set(p.x, p.y, p.z);
      tmpE.set(p.spin * p.life, p.spin * 0.7 * p.life, 0);
      tmpQ.setFromEuler(tmpE);
      const s = p.size * (0.4 + k * 0.8);
      tmpS.set(s, s, s);
      tmpM.compose(tmpP, tmpQ, tmpS);
      this.mesh.setMatrixAt(i, tmpM);
      this.mesh.setColorAt(i, p.color);
      i++;
    }
    this.mesh.count = i;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    for (let h = this.halos.length - 1; h >= 0; h--) {
      const halo = this.halos[h];
      halo.t -= dt;
      halo.mesh.position.y += dt * 0.9;
      (halo.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, halo.t);
      if (halo.t <= 0) {
        this.root.remove(halo.mesh);
        halo.mesh.geometry.dispose();
        this.halos.splice(h, 1);
      }
    }
    for (let r = this.rings.length - 1; r >= 0; r--) {
      const ring = this.rings[r];
      ring.t -= dt * 1.8;
      const s = 1 + (1 - ring.t) * 3.5;
      ring.mesh.scale.set(s, s, 1);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = Math.max(0, ring.t);
      if (ring.t <= 0) {
        this.root.remove(ring.mesh);
        ring.mesh.geometry.dispose();
        this.rings.splice(r, 1);
      }
    }
    for (let f = this.flashes.length - 1; f >= 0; f--) {
      const fl = this.flashes[f];
      fl.t -= dt;
      const k = Math.max(0, fl.t / fl.maxT);
      fl.mesh.scale.setScalar(1.4 - k * 0.6);
      (fl.mesh.material as THREE.MeshBasicMaterial).opacity = k;
      if (fl.t <= 0) {
        this.root.remove(fl.mesh);
        fl.mesh.geometry.dispose();
        this.flashes.splice(f, 1);
      }
    }
    for (let g = this.glints.length - 1; g >= 0; g--) {
      const gl = this.glints[g];
      gl.t -= dt;
      const k = Math.max(0, gl.t / gl.maxT);
      gl.group.scale.setScalar(0.6 + (1 - k) * 1.4);
      for (const child of gl.group.children) {
        ((child as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = k;
      }
      if (gl.t <= 0) {
        this.root.remove(gl.group);
        gl.group.traverse((o) => { if (o instanceof THREE.Mesh) o.geometry.dispose(); });
        this.glints.splice(g, 1);
      }
    }
    for (let a = this.arcs.length - 1; a >= 0; a--) {
      const arc = this.arcs[a];
      arc.t -= dt;
      const k = Math.max(0, arc.t / arc.maxT);
      (arc.line.material as THREE.LineBasicMaterial).opacity = k;
      if (arc.t <= 0) {
        this.root.remove(arc.line);
        arc.line.geometry.dispose();
        this.arcs.splice(a, 1);
      }
    }
  }
}
