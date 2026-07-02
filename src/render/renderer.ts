import * as THREE from 'three';
import type { LevelDef, SimEvent, SimState } from '../sim/types';
import type { ContentDB } from '../sim/types';
import { CameraRig } from './camera';
import { Post } from './post';
import { buildRoom } from './room';
import { CritterInstances, type CritterRenderState } from './models/critterModels';
import { buildCrumbKing, buildTowerView, type TowerView } from './models/towerModels';
import { buildBossView } from './models/critterModels';
import { CakeView, buildClutterCell, buildSliceProp, projectileTemplate, PROJECTILE_LOOKS } from './models/props';
import { Vfx } from './vfx';
import { HandView, type HandPose } from './handView';
import { PAL } from './palette';
import { toonMat } from './build';
import { dprCap } from '../core/device';

interface CritterViewData {
  def: string;
  pos: THREE.Vector3;       // smoothed render position
  target: THREE.Vector3;
  facing: number;
  state: string;
  wobble: number;
  flash: number;
  tumble: number;
  shiny: boolean;
  scale: number;
  sliceProp: THREE.Group | null;
  bossView: { group: THREE.Group; animate: (dt: number, t: number) => void } | null;
}

interface TowerViewData {
  view: TowerView;
  basePos: THREE.Vector3;
  popT: number;
  downed: boolean;
  carried: boolean;
}

const CRUMB_CAP = 160;

export class GameRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly rig: CameraRig;
  private post: Post;
  private level: LevelDef | null = null;
  private content: ContentDB | null = null;

  private roomGroup: THREE.Group | null = null;
  private cake: CakeView | null = null;
  private critters = new CritterInstances();
  private critterViews = new Map<number, CritterViewData>();
  private towerViews = new Map<number, TowerViewData>();
  private clutterViews = new Map<number, THREE.Group>();
  private clutterShake = new Map<number, number>();
  private projMeshes = new Map<string, THREE.InstancedMesh>();
  private crumbMesh: THREE.InstancedMesh;
  private vfx = new Vfx();
  readonly hand = new HandView();
  private pickPlanes: THREE.Mesh[] = [];
  private critterPickMap = new Map<THREE.InstancedMesh, number[]>();
  private oneShots: { obj: THREE.Object3D; t: number; anim: (obj: THREE.Object3D, t: number) => void }[] = [];
  private time = 0;
  private burnerRings: THREE.Object3D[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap()));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.info.autoReset = false; // accumulate full-frame stats (reset in frame())

    this.scene.background = new THREE.Color(0x33261a);
    this.scene.fog = new THREE.Fog(0x33261a, 26, 55);

    this.rig = new CameraRig(innerWidth / innerHeight);
    this.post = new Post(this.renderer, this.scene, this.rig.camera);

    // lights
    const hemi = new THREE.HemisphereLight(0xfff2dc, 0x7a5a3c, 0.82);
    this.scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffe2b0, 2.1);
    key.position.set(9, 12, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -14;
    key.shadow.camera.right = 14;
    key.shadow.camera.top = 14;
    key.shadow.camera.bottom = -14;
    key.shadow.camera.far = 40;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.025;
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xb8c8e8, 0.4);
    fill.position.set(-6, 5, -4);
    this.scene.add(fill);

    this.scene.add(this.critters.root, this.vfx.root, this.hand.group);

    // crumb instancing — little golden tetrahedra
    const crumbGeo = new THREE.TetrahedronGeometry(0.09);
    this.crumbMesh = new THREE.InstancedMesh(
      crumbGeo,
      new THREE.MeshToonMaterial({ color: PAL.crumbGold }),
      CRUMB_CAP,
    );
    this.crumbMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.crumbMesh.castShadow = true;
    this.crumbMesh.frustumCulled = false;
    this.crumbMesh.count = 0;
    this.scene.add(this.crumbMesh);

    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => {
      // orientation change can lag actual viewport dims by a frame on mobile browsers
      this.resize();
      setTimeout(() => this.resize(), 120);
    });
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', () => this.resize());
    }
    this.resize();
  }

  /** Current viewport size — prefers visualViewport (accounts for mobile browser chrome). */
  private viewportSize(): { w: number; h: number } {
    const vv = window.visualViewport;
    if (vv) return { w: Math.round(vv.width), h: Math.round(vv.height) };
    return { w: innerWidth, h: innerHeight };
  }

  resize(): void {
    const { w, h } = this.viewportSize();
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, dprCap()));
    this.renderer.setSize(w, h, false);
    this.rig.resize(w / h);
    this.post.resize(w, h);
  }

  loadLevel(level: LevelDef, content: ContentDB): void {
    this.level = level;
    this.content = content;
    if (this.roomGroup) this.scene.remove(this.roomGroup);
    for (const v of this.towerViews.values()) this.scene.remove(v.view.group);
    for (const g of this.clutterViews.values()) this.scene.remove(g);
    for (const v of this.critterViews.values()) {
      if (v.bossView) this.scene.remove(v.bossView.group);
      if (v.sliceProp) this.scene.remove(v.sliceProp);
    }
    this.towerViews.clear();
    this.clutterViews.clear();
    this.critterViews.clear();
    this.clutterShake.clear();
    this.oneShots.forEach((o) => this.scene.remove(o.obj));
    this.oneShots = [];

    this.roomGroup = buildRoom(level);
    this.scene.add(this.roomGroup);
    this.burnerRings = [];
    this.roomGroup.traverse((o) => {
      if (o.userData.burner) this.burnerRings.push(o);
    });

    if (this.cake) this.scene.remove(this.cake.group);
    this.cake = new CakeView(level.cakeSlices);
    const cakePos = this.tileWorld(level.cakeTile.s, level.cakeTile.c, level.cakeTile.r);
    this.cake.group.position.copy(cakePos);
    this.scene.add(this.cake.group);

    // invisible pick planes per surface
    this.pickPlanes.forEach((p) => this.scene.remove(p));
    this.pickPlanes = level.surfaces.map((s, i) => {
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(s.cols, s.rows),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      plane.rotation.x = -Math.PI / 2;
      plane.position.set(s.origin.x + s.cols / 2, s.origin.y + 0.01, s.origin.z + s.rows / 2);
      plane.userData.surface = i;
      this.scene.add(plane);
      return plane;
    });

    const floor = level.surfaces[0];
    const center = new THREE.Vector3(floor.origin.x + floor.cols / 2 + 0.5, 1.3, floor.origin.z + floor.rows / 2);
    this.rig.setBounds(center, Math.max(floor.cols, floor.rows) * 0.66);
  }

  private tileWorld(s: number, c: number, r: number): THREE.Vector3 {
    const surf = this.level!.surfaces[s];
    return new THREE.Vector3(surf.origin.x + c + 0.5, surf.origin.y, surf.origin.z + r + 0.5);
  }

  /** Feed one sim tick: update view bookkeeping + trigger event VFX. */
  syncTick(state: SimState, events: SimEvent[]): void {
    // critters
    for (const [id, cr] of state.critters) {
      let v = this.critterViews.get(id);
      if (!v) {
        const def = this.content?.critters[cr.def];
        v = {
          def: cr.def,
          pos: new THREE.Vector3(cr.pos.x, cr.pos.y, cr.pos.z),
          target: new THREE.Vector3(cr.pos.x, cr.pos.y, cr.pos.z),
          facing: cr.facing,
          state: cr.state,
          wobble: cr.wobble,
          flash: 0,
          tumble: 0,
          shiny: cr.shiny,
          scale: 0.01, // pop in
          sliceProp: null,
          bossView: def?.boss ? buildBossView(cr.def) ?? buildCrumbKing() : null,
        };
        if (v.bossView) this.scene.add(v.bossView.group);
        this.critterViews.set(id, v);
      }
      if (v.def !== cr.def) {
        v.def = cr.def; // evolved
        v.scale = 0.01;
      }
      v.target.set(cr.pos.x, cr.pos.y, cr.pos.z);
      v.facing = cr.facing;
      v.state = cr.state;
    }
    for (const [id, v] of this.critterViews) {
      if (!state.critters.has(id)) {
        if (v.bossView) this.scene.remove(v.bossView.group);
        if (v.sliceProp) this.scene.remove(v.sliceProp);
        this.critterViews.delete(id);
      }
    }

    // towers
    for (const [id, tw] of state.towers) {
      let v = this.towerViews.get(id);
      if (!v) {
        const view = buildTowerView(tw.def);
        view.group.position.set(tw.pos.x, tw.pos.y, tw.pos.z);
        view.setTier(tw.tier);
        this.scene.add(view.group);
        v = { view, basePos: new THREE.Vector3(tw.pos.x, tw.pos.y, tw.pos.z), popT: 1, downed: false, carried: false };
        this.towerViews.set(id, v);
      }
      v.basePos.set(tw.pos.x, tw.pos.y, tw.pos.z);
      v.carried = tw.carried;
      v.downed = tw.downed;
      v.view.setDisabled(tw.disabled > 0 || tw.downed);
    }
    for (const [id, v] of this.towerViews) {
      if (!state.towers.has(id)) {
        this.scene.remove(v.view.group);
        this.towerViews.delete(id);
      }
    }

    // clutter
    for (const [id, piece] of state.clutter) {
      if (!this.clutterViews.has(id)) {
        const shape = this.content?.shapes[piece.shape];
        const g = new THREE.Group();
        for (const cell of piece.cells) {
          const block = buildClutterCell(shape?.look ?? 'cereal');
          const p = this.tileWorld(cell.s, cell.c, cell.r);
          block.position.copy(p);
          g.add(block);
        }
        g.userData.popT = 1;
        this.scene.add(g);
        this.clutterViews.set(id, g);
      }
    }
    for (const [id, g] of this.clutterViews) {
      if (!state.clutter.has(id)) {
        this.scene.remove(g);
        this.clutterViews.delete(id);
      }
    }

    // crumbs (instanced rebuild)
    let ci = 0;
    const m = new THREE.Matrix4();
    for (const ent of state.crumbEnts.values()) {
      if (ci >= CRUMB_CAP) break;
      const pulse = 1 + Math.sin(this.time * 4 + ent.id) * 0.18;
      m.compose(
        new THREE.Vector3(ent.pos.x, ent.pos.y + 0.08, ent.pos.z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(ent.id, ent.id * 2.3, 0)),
        new THREE.Vector3(pulse * Math.min(2.2, 0.7 + ent.value * 0.06), pulse, pulse),
      );
      this.crumbMesh.setMatrixAt(ci++, m);
    }
    this.crumbMesh.count = ci;
    this.crumbMesh.instanceMatrix.needsUpdate = true;

    // cake
    this.cake?.setSlices(state.cakeSlices);

    // events
    for (const ev of events) this.handleEvent(ev, state);
  }

  private handleEvent(ev: SimEvent, state: SimState): void {
    switch (ev.t) {
      case 'die': {
        this.vfx.poof(ev.at);
        this.vfx.crumbs(ev.at, Math.min(10, 3 + Math.floor(ev.bounty / 5)));
        if (ev.cause === 'squash') this.vfx.splat(ev.at);
        break;
      }
      case 'fakeDeath':
        this.vfx.splat(ev.at, 0x6b3a24);
        break;
      case 'hit': {
        const v = this.critterViews.get(ev.critterId);
        if (v) v.flash = 1;
        if (ev.dmgType === 'spray') this.vfx.splash(ev.at);
        else if (ev.dmgType === 'heat') this.vfx.fire(ev.at);
        else if (ev.dmgType === 'zap') this.vfx.sparks(ev.at);
        break;
      }
      case 'fire': {
        const v = this.towerViews.get(ev.towerId);
        v?.view.onFire();
        break;
      }
      case 'cakeBite': {
        this.vfx.crumbs(ev.at, 8);
        this.rig.shake(0.12, 0.25);
        break;
      }
      case 'sliceStolen': {
        const v = this.critterViews.get(ev.critterId);
        if (v && !v.sliceProp) {
          v.sliceProp = buildSliceProp();
          this.scene.add(v.sliceProp);
        }
        this.rig.shake(0.18, 0.3);
        break;
      }
      case 'sliceRecovered':
        this.vfx.confetti(ev.at);
        break;
      case 'spawn': {
        if (ev.shiny) this.vfx.sparks(ev.at);
        break;
      }
      case 'evolve':
        this.vfx.poof(ev.at);
        break;
      case 'fall':
        if (ev.from > 0.5) this.vfx.poof({ x: 0, y: 0, z: 0 }); // softened below; landing pos comes via state
        break;
      case 'squash': {
        this.hand.press();
        this.vfx.splat(ev.at);
        this.rig.shake(0.15, 0.2);
        break;
      }
      case 'flick': {
        const v = this.critterViews.get(ev.critterId);
        if (v) v.tumble = 0.01;
        break;
      }
      case 'highFive': {
        const v = this.towerViews.get(ev.towerId);
        if (v) this.vfx.sparks(v.basePos);
        break;
      }
      case 'towerPlace': {
        const v = this.towerViews.get(ev.id);
        if (v) v.popT = 1;
        this.vfx.ring(ev.at, 0xfff2b8);
        break;
      }
      case 'towerUpgrade': {
        const v = this.towerViews.get(ev.id);
        if (v) {
          v.view.setTier(ev.tier);
          this.vfx.confetti(v.basePos);
        }
        break;
      }
      case 'towerGone':
        this.vfx.ceramicBurst(ev.at);
        this.rig.shake(0.25, 0.3);
        break;
      case 'towerDropped':
        this.vfx.poof(ev.at);
        break;
      case 'clutterChew': {
        for (const [id] of state.clutter) {
          // shake the chewed piece
          if (id === (ev as { id: number }).id) this.clutterShake.set(id, 0.3);
        }
        break;
      }
      case 'clutterGone': {
        const g = this.clutterViews.get(ev.id);
        if (g) {
          const p = new THREE.Vector3();
          g.children[0]?.getWorldPosition(p);
          this.vfx.crumbs(p, 10);
          this.vfx.poof(p);
        }
        break;
      }
      case 'crumbBank':
        this.vfx.sparks(this.hand.group.position);
        break;
      case 'spellCast': {
        if (ev.at) this.castSpellVfx(ev.spell, ev.at);
        break;
      }
      case 'waveStart':
        this.rig.punch();
        break;
      case 'lost':
        this.rig.shake(0.5, 0.8);
        break;
      case 'won':
        if (this.cake) this.vfx.confetti(this.cake.group.position);
        break;
      default:
        break;
    }
  }

  private castSpellVfx(spell: string, at: { x: number; y: number; z: number }): void {
    if (spell.includes('slipper')) {
      // the Forbidden Slipper sweeps down the lane
      const slipper = new THREE.Group();
      const sole = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 0.8, 4, 8), toonMat(0xd84a6a));
      sole.scale.set(1, 0.4, 1);
      sole.rotation.z = Math.PI / 2;
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.1, 6, 12, Math.PI), toonMat(0xb83a55));
      strap.position.y = 0.2;
      slipper.add(sole, strap);
      slipper.position.set(at.x, 2.5, -2);
      this.scene.add(slipper);
      this.oneShots.push({
        obj: slipper,
        t: 1,
        anim: (obj, t) => {
          const depth = this.level ? this.level.surfaces[0].rows + 4 : 16;
          obj.position.z = -2 + (1 - t) * depth;
          obj.position.y = 1.2 + Math.abs(Math.sin((1 - t) * Math.PI * 3)) * 1.4;
          obj.rotation.x = (1 - t) * 12;
        },
      });
      this.rig.shake(0.3, 0.5);
    } else if (spell.includes('moooom') || spell.includes('mom')) {
      // MOM'S HAND DESCENDS
      const hand = new THREE.Group();
      const palm = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 2.8), toonMat(0xf0c8a0));
      for (let i = 0; i < 4; i++) {
        const f = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.0, 4, 8), toonMat(0xf0c8a0));
        f.rotation.x = Math.PI / 2;
        f.position.set(-0.9 + i * 0.6, 0, -1.8);
        hand.add(f);
      }
      const nail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 0.5), toonMat(0xe8504f));
      nail.position.set(0, 0.3, 1.5);
      hand.add(palm, nail);
      hand.position.set(at.x, 14, (this.level?.surfaces[0].rows ?? 10) / 2);
      this.scene.add(hand);
      this.oneShots.push({
        obj: hand,
        t: 1,
        anim: (obj, t) => {
          const k = 1 - t;
          obj.position.y = k < 0.4 ? 14 - (k / 0.4) * 13.2 : k < 0.6 ? 0.8 : 0.8 + ((k - 0.6) / 0.4) * 13.2;
          if (k > 0.38 && k < 0.45) this.rig.shake(0.6, 0.2);
        },
      });
    } else {
      // lemon smite — citrus zap
      this.vfx.sparks(at);
      this.vfx.ring(at, 0xf7e85a);
      const bolt = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.18, 10, 6),
        new THREE.MeshBasicMaterial({ color: 0xf7f25a, transparent: true, toneMapped: false }),
      );
      bolt.position.set(at.x, 5, at.z);
      this.scene.add(bolt);
      this.oneShots.push({
        obj: bolt,
        t: 0.35,
        anim: (obj, t) => {
          ((obj as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = t / 0.35;
        },
      });
    }
  }

  /** Per-frame: smooth views, animate, draw. */
  frame(dt: number): void {
    this.renderer.info.reset();
    this.time += dt;
    const k = Math.min(1, dt * 16);

    // critter views → instanced states
    const byDef = new Map<string, CritterRenderState[]>();
    const pickRebuild = new Map<THREE.InstancedMesh, number[]>();
    for (const [id, v] of this.critterViews) {
      v.pos.lerp(v.target, k);
      v.flash = Math.max(0, v.flash - dt * 5);
      if (v.state === 'flung' || v.state === 'fall') v.tumble += dt * 9;
      else v.tumble = 0;
      v.scale = Math.min(1, v.scale + dt * 5);

      if (v.sliceProp) {
        v.sliceProp.position.set(v.pos.x, v.pos.y + 0.75, v.pos.z);
        v.sliceProp.rotation.y = v.facing;
      }
      if (v.bossView) {
        v.bossView.group.position.copy(v.pos);
        v.bossView.group.rotation.y = v.facing;
        v.bossView.animate(dt, this.time);
        continue;
      }
      let list = byDef.get(v.def);
      if (!list) {
        list = [];
        byDef.set(v.def, list);
      }
      list.push({
        x: v.pos.x, y: v.pos.y, z: v.pos.z,
        facing: v.facing,
        wobble: v.wobble,
        state: v.state,
        flash: v.flash,
        shiny: v.shiny,
        tumble: v.tumble,
        scale: v.scale * 1.35, // readability boost at gameplay zoom
      });
      void pickRebuild;
      void id;
    }
    this.critters.sync(byDef, this.time);

    // towers
    for (const v of this.towerViews.values()) {
      if (v.popT > 0) v.popT = Math.max(0, v.popT - dt * 3);
      const pop = 1 + Math.sin(v.popT * Math.PI) * 0.18;
      const base = v.view.group.scale.x / (v.view.group.scale.x || 1);
      void base;
      if (v.carried) {
        v.view.group.position.lerp(
          new THREE.Vector3(this.hand.group.position.x, this.hand.group.position.y + 0.4, this.hand.group.position.z),
          Math.min(1, dt * 12),
        );
      } else {
        v.view.group.position.lerp(v.basePos, Math.min(1, dt * 10));
      }
      v.view.group.rotation.z = v.downed ? 1.35 : 0;
      v.view.group.scale.multiplyScalar(1); // tier scale handled in setTier
      v.view.group.scale.setScalar(v.view.group.scale.x);
      void pop;
      v.view.animate(dt, this.time);
    }

    // clutter shake
    for (const [id, t] of this.clutterShake) {
      const g = this.clutterViews.get(id);
      const left = t - dt;
      if (g) {
        g.position.x = left > 0 ? (Math.random() - 0.5) * 0.06 : 0;
        g.position.z = left > 0 ? (Math.random() - 0.5) * 0.06 : 0;
      }
      if (left <= 0) this.clutterShake.delete(id);
      else this.clutterShake.set(id, left);
    }

    // one-shot anims
    for (let i = this.oneShots.length - 1; i >= 0; i--) {
      const o = this.oneShots[i];
      o.t -= dt;
      o.anim(o.obj, Math.max(0, o.t));
      if (o.t <= 0) {
        this.scene.remove(o.obj);
        this.oneShots.splice(i, 1);
      }
    }

    // burner glow pulse
    this.burnerRings.forEach((b, i) => {
      b.scale.setScalar(1 + Math.sin(this.time * 3 + i) * 0.05);
    });

    this.cake?.animate(this.time);
    this.vfx.update(dt);
    this.hand.update(dt, this.time);
    this.rig.update(dt);
    this.post.render();
  }

  /** Sync projectiles directly from state each frame-ish tick. */
  syncProjectiles(state: SimState): void {
    const byKind = new Map<string, { x: number; y: number; z: number; spin: number; color: number }[]>();
    for (const p of state.projectiles) {
      const look = PROJECTILE_LOOKS[p.def] ?? { kind: 'droplet' as const, color: 0xffffff };
      let list = byKind.get(look.kind);
      if (!list) {
        list = [];
        byKind.set(look.kind, list);
      }
      list.push({ x: p.pos.x, y: p.pos.y, z: p.pos.z, spin: (p.arcT ?? 0) * 9 + p.id, color: look.color });
    }
    for (const [kind, mesh] of this.projMeshes) {
      if (!byKind.has(kind)) mesh.count = 0;
    }
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (const [kind, list] of byKind) {
      let mesh = this.projMeshes.get(kind);
      if (!mesh) {
        mesh = new THREE.InstancedMesh(
          projectileTemplate(kind as 'droplet' | 'toast' | 'band'),
          new THREE.MeshToonMaterial({ color: 0xffffff }),
          80,
        );
        mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        mesh.frustumCulled = false;
        this.projMeshes.set(kind, mesh);
        this.scene.add(mesh);
      }
      let i = 0;
      for (const p of list) {
        if (i >= 80) break;
        e.set(p.spin, p.spin * 0.6, p.spin * 0.3);
        q.setFromEuler(e);
        m.compose(new THREE.Vector3(p.x, p.y + 0.3, p.z), q, new THREE.Vector3(1, 1, 1));
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, new THREE.Color(p.color));
        i++;
      }
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  // ---------- picking ----------
  private raycaster = new THREE.Raycaster();

  pickSurfacePoint(ndcX: number, ndcY: number): { surface: number; x: number; z: number } | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.rig.camera);
    const hits = this.raycaster.intersectObjects(this.pickPlanes, false);
    // prefer the highest surface hit (counters above floor)
    let best: { surface: number; x: number; z: number; y: number } | null = null;
    for (const h of hits) {
      const surface = h.object.userData.surface as number;
      if (!best || h.point.y > best.y) {
        best = { surface, x: h.point.x, z: h.point.z, y: h.point.y };
      }
    }
    return best ? { surface: best.surface, x: best.x, z: best.z } : null;
  }

  pickCritter(ndcX: number, ndcY: number, state: SimState): number | null {
    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.rig.camera);
    // cheap robust pick: project critter positions to screen, nearest within radius
    let bestId: number | null = null;
    let bestD = 0.06;
    const v = new THREE.Vector3();
    for (const [id, cr] of state.critters) {
      v.set(cr.pos.x, cr.pos.y + 0.3, cr.pos.z).project(this.rig.camera);
      const d = Math.hypot(v.x - ndcX, v.y - ndcY);
      if (d < bestD) {
        bestD = d;
        bestId = id;
      }
    }
    return bestId;
  }

  pickTower(ndcX: number, ndcY: number, state: SimState): number | null {
    let bestId: number | null = null;
    let bestD = 0.07;
    const v = new THREE.Vector3();
    for (const [id, tw] of state.towers) {
      v.set(tw.pos.x, tw.pos.y + 0.6, tw.pos.z).project(this.rig.camera);
      const d = Math.hypot(v.x - ndcX, v.y - ndcY);
      if (d < bestD) {
        bestD = d;
        bestId = id;
      }
    }
    return bestId;
  }

  // ---------- placement ghosts ----------
  private ghost: THREE.Group | null = null;
  private rangeRing: THREE.Mesh | null = null;

  showGhost(cells: { x: number; y: number; z: number }[], valid: boolean): void {
    this.hideGhost();
    this.ghost = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      color: valid ? 0x6ee87a : 0xe85050,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
    });
    for (const c of cells) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.9, 0.94), mat);
      m.position.set(c.x, c.y + 0.45, c.z);
      this.ghost.add(m);
    }
    this.scene.add(this.ghost);
  }

  showRange(x: number, y: number, z: number, range: number): void {
    if (!this.rangeRing) {
      this.rangeRing = new THREE.Mesh(
        new THREE.RingGeometry(0.95, 1, 48),
        new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }),
      );
      this.rangeRing.rotation.x = -Math.PI / 2;
      this.scene.add(this.rangeRing);
    }
    this.rangeRing.visible = true;
    this.rangeRing.position.set(x, y + 0.06, z);
    this.rangeRing.scale.setScalar(range);
  }

  hideGhost(): void {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost = null;
    }
    if (this.rangeRing) this.rangeRing.visible = false;
  }

  setHandPose(pose: HandPose): void {
    this.hand.setPose(pose);
  }

  drawCallCount(): number {
    return this.renderer.info.render.calls;
  }
}
