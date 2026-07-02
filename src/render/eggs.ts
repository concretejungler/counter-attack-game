import * as THREE from 'three';
import type { LevelDef } from '../sim/types';
import { cyl, sphere, toonMat, canvasTexture } from './build';

/**
 * EASTER EGGS (GAME-PROMPT §20) — render-side one-shot/ambient props that don't belong to any
 * single sim system: the red balloon (§20.3), idle campfire (§20.13), and the Wave-42 towel
 * drape (§20.6). The windowsill sunflower (§20.2) is built inline in room.ts's buildDecor (it's
 * genuinely per-theme decor) but its click/hum/sway *state* lives here for one shared home.
 *
 * Owned + driven entirely by GameRenderer: constructed once, `loadLevel()` resets per-level
 * state, `frame(dt)` advances animation, `pickBalloon`/`pickSunflower` are raycast helpers game.ts
 * calls from its existing pointer-pick path (mirrors pickCritter/pickTower).
 */
export class EggsController {
  private scene: THREE.Scene;
  // ---- red balloon (§20.3) ----
  private balloon: THREE.Group | null = null;
  private balloonT = 0;
  private balloonDir = 1;
  private balloonZ = 0;
  private balloonCenterX = 7;
  private balloonHalfSpan = 4.5;
  // ---- idle campfire (§20.13) ----
  private campfire: THREE.Group | null = null;
  private campfireFlicker: THREE.PointLight | null = null;
  // ---- wave-42 towel drape (§20.6) ----
  private towels: THREE.Group[] = [];
  // ---- sunflower sway (§20.2) — position set by room.ts via registerSunflower() ----
  private sunflower: THREE.Group | null = null;
  private sunflowerSwayT = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Called from GameRenderer.loadLevel() — clears any prior level's balloon/campfire/towels. */
  reset(level: LevelDef): void {
    if (this.balloon) { this.scene.remove(this.balloon); this.balloon = null; }
    this.clearCampfire();
    this.clearTowels();
    this.sunflower = null;
    const floor = level.surfaces[0];
    // Window is built at x = W*0.62 (see room.ts buildWalls) — the balloon drifts back and forth
    // through a modest span centered there, so "drifts past the window" is always literally true
    // and it stays within the default camera's normal framing (not lost off in open space beyond
    // the room's un-walled right edge).
    this.balloonCenterX = floor.cols * 0.62;
    this.balloonHalfSpan = Math.min(4.5, floor.cols * 0.4);
    // Room windows are opaque sky-colored panes (no glass transparency in this renderer), so a
    // balloon drifting "past the window" has to sit just in FRONT of the glass, room-side, at
    // window height — reads as glimpsed drifting by right at the sill, not hidden behind a wall.
    this.balloonZ = 0.5;
  }

  // ---------- red balloon (§20.3) ----------

  /** ~1/6 chance per level (rolled by game.ts with Math.random — fine outside the sim), spawns a
   *  red balloon that drifts slowly past the window for a while then despawns on its own. */
  maybeSpawnBalloon(level: LevelDef, chance = 1 / 6): void {
    if (this.balloon || Math.random() >= chance) return;
    void level; // spawn geometry (center/span) is precomputed once in reset(), not per-spawn
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 14, 12), toonMat(0xe8504f));
    body.scale.set(0.86, 1.05, 0.86);
    const knot = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 8), toonMat(0xc83c3c));
    knot.position.y = -0.5;
    knot.rotation.x = Math.PI;
    const string = new THREE.Mesh(
      new THREE.CylinderGeometry(0.012, 0.012, 1.6, 4),
      new THREE.MeshBasicMaterial({ color: 0x8a7a68 }),
    );
    string.position.y = -1.3;
    const highlight = new THREE.Mesh(
      new THREE.SphereGeometry(0.1, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, toneMapped: false }),
    );
    highlight.position.set(-0.14, 0.2, 0.32);
    g.add(body, knot, string, highlight);
    g.userData.isBalloon = true;
    this.balloonDir = Math.random() < 0.5 ? 1 : -1;
    const startX = this.balloonCenterX - this.balloonDir * this.balloonHalfSpan;
    g.position.set(startX, 4.6, this.balloonZ);
    this.balloonT = 0;
    this.balloon = g;
    this.scene.add(g);
  }

  /** Raycast pick against the live balloon, if any. Returns true + despawns it (with a pop
   *  callback for VFX/sfx/save-counter, left to the caller) on a hit. */
  pickBalloon(raycaster: THREE.Raycaster): boolean {
    if (!this.balloon) return false;
    const hits = raycaster.intersectObject(this.balloon, true);
    if (hits.length === 0) return false;
    this.scene.remove(this.balloon);
    this.balloon = null;
    return true;
  }

  get balloonActive(): boolean {
    return this.balloon !== null;
  }

  private updateBalloon(dt: number): void {
    if (!this.balloon) return;
    this.balloonT += dt;
    this.balloon.position.x += this.balloonDir * dt * 0.45;
    this.balloon.position.y = 4.6 + Math.sin(this.balloonT * 0.8) * 0.25;
    this.balloon.rotation.z = Math.sin(this.balloonT * 0.6) * 0.08;
    const edge = this.balloonCenterX + this.balloonDir * this.balloonHalfSpan;
    const past = this.balloonDir > 0 ? this.balloon.position.x > edge : this.balloon.position.x < edge;
    if (past || this.balloonT > 40) {
      this.scene.remove(this.balloon);
      this.balloon = null;
    }
  }

  // ---------- idle campfire (§20.13) ----------

  /** 3+ minutes of zero input during a build phase (game.ts tracks the idle timer) → a tiny
   *  campfire + marshmallow sticks near the towers. Any input clears it. */
  spawnCampfire(at: THREE.Vector3Like): void {
    if (this.campfire) return;
    const g = new THREE.Group();
    const logs = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const log = cyl(0.05, 0.05, 0.5, 0x6b4226, 6);
      log.rotation.z = Math.PI / 2;
      log.rotation.y = (i / 3) * Math.PI;
      log.position.y = 0.06;
      logs.add(log);
    }
    g.add(logs);
    const flameTex = canvasTexture(32, 32, (ctx) => {
      const grad = ctx.createRadialGradient(16, 22, 1, 16, 16, 15);
      grad.addColorStop(0, 'rgba(255,244,190,0.95)');
      grad.addColorStop(0.5, 'rgba(255,160,60,0.85)');
      grad.addColorStop(1, 'rgba(220,60,30,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    });
    const flame = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.7),
      new THREE.MeshBasicMaterial({ map: flameTex, transparent: true, depthWrite: false, toneMapped: false }),
    );
    flame.position.y = 0.32;
    g.add(flame);
    const light = new THREE.PointLight(0xffa53c, 1.4, 3.5, 2);
    light.position.y = 0.4;
    g.add(light);
    this.campfireFlicker = light;

    // two marshmallow sticks leaned toward the fire
    for (const side of [-1, 1]) {
      const stick = cyl(0.02, 0.02, 0.9, 0x8a6a45, 5);
      stick.position.set(side * 0.55, 0.35, side * 0.1);
      stick.rotation.z = side * 0.9;
      stick.rotation.x = 0.3;
      const marsh = sphere(0.08, 0xfff4e0, 8);
      marsh.position.set(side * 0.18, 0.28, 0.05);
      g.add(stick, marsh);
    }

    g.position.set(at.x, at.y, at.z);
    g.userData.t = 0;
    this.campfire = g;
    this.scene.add(g);
  }

  clearCampfire(): void {
    if (this.campfire) {
      this.scene.remove(this.campfire);
      this.campfire = null;
      this.campfireFlicker = null;
    }
  }

  get campfireActive(): boolean {
    return this.campfire !== null;
  }

  private updateCampfire(dt: number, time: number): void {
    if (!this.campfire || !this.campfireFlicker) return;
    this.campfireFlicker.intensity = 1.2 + Math.sin(time * 9) * 0.25 + Math.sin(time * 23) * 0.12;
    const flame = this.campfire.children.find((c) => c instanceof THREE.Mesh && (c as THREE.Mesh).geometry.type === 'PlaneGeometry');
    if (flame) {
      flame.scale.set(1 + Math.sin(time * 11) * 0.08, 1 + Math.sin(time * 13 + 1) * 0.1, 1);
      flame.rotation.y = time * 0.4;
    }
  }

  // ---------- wave-42 towel drape (§20.6) ----------

  /** Endless mode, state.endlessDepth === 42: drapes a tiny towel prop on each live tower for
   *  one wave. towerGroups are the current TowerViewData.view.group instances (renderer.ts owns
   *  the map; this stays purely additive-prop so it never touches tower view internals). */
  drapeTowels(towerGroups: THREE.Group[]): void {
    this.clearTowels();
    for (const tg of towerGroups) {
      const towel = new THREE.Group();
      const cloth = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.32, 4, 3),
        new THREE.MeshBasicMaterial({ color: 0x6ec8d8, side: THREE.DoubleSide }),
      );
      cloth.position.set(0, 0.55, 0.18);
      cloth.rotation.x = -0.5;
      const stripe = new THREE.Mesh(
        new THREE.PlaneGeometry(0.5, 0.06, 4, 1),
        new THREE.MeshBasicMaterial({ color: 0xfff4e0, side: THREE.DoubleSide }),
      );
      stripe.position.set(0, 0.5, 0.24);
      stripe.rotation.x = -0.5;
      towel.add(cloth, stripe);
      tg.add(towel);
      this.towels.push(towel);
    }
  }

  clearTowels(): void {
    for (const t of this.towels) t.parent?.remove(t);
    this.towels = [];
  }

  // ---------- sunflower hum (§20.2) — registered by room.ts, click state lives here ----------

  /** room.ts calls this once per level load with the sunflower's mesh group so pickSunflower()
   *  and the sway animation have something to act on. Purely additive — the mesh itself, its
   *  geometry, and its base position are entirely owned/built by buildThemeDecor(). */
  registerSunflower(group: THREE.Group): void {
    this.sunflower = group;
    this.sunflowerSwayT = 0;
  }

  pickSunflower(raycaster: THREE.Raycaster): boolean {
    if (!this.sunflower) return false;
    return raycaster.intersectObject(this.sunflower, true).length > 0;
  }

  /** Triggers a brief happy sway — called by game.ts after a click lands (regardless of whether
   *  it was the "5th click" hum-triggering one; a small sway reads as "acknowledged" every time). */
  swaySunflower(): void {
    this.sunflowerSwayT = 1;
  }

  private updateSunflower(dt: number, time: number): void {
    if (!this.sunflower) return;
    if (this.sunflowerSwayT > 0) {
      this.sunflowerSwayT = Math.max(0, this.sunflowerSwayT - dt * 1.4);
      this.sunflower.rotation.z = Math.sin(this.sunflowerSwayT * Math.PI * 3) * 0.22 * this.sunflowerSwayT;
    } else {
      // idle: a slow, tiny ambient sway so it reads as alive even before it's ever clicked
      this.sunflower.rotation.z = Math.sin(time * 0.7) * 0.025;
    }
  }

  // ---------- per-frame ----------

  update(dt: number, time: number): void {
    this.updateBalloon(dt);
    this.updateCampfire(dt, time);
    this.updateSunflower(dt, time);
  }
}
