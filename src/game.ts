import { Vector3 } from 'three';
import { Sim, SIM_DT } from './sim/sim';
import type { DifficultyId, LevelDef, SimEvent } from './sim/types';
import { CONTENT, ALL_LEVELS, levelById } from './content';
import { GameRenderer } from './render/renderer';

/**
 * Game shell: owns the Sim + Renderer, runs the fixed-step loop.
 * (The diegetic UI layer mounts on top — src/ui — and drives commands.)
 */
export class Game {
  readonly renderer: GameRenderer;
  sim: Sim | null = null;
  level: LevelDef | null = null;
  speedMult = 1;
  paused = false;
  private acc = 0;
  private last = 0;
  private rafId = 0;
  /** UI hooks subscribe here. */
  onEvents: ((events: SimEvent[]) => void) | null = null;
  onFrame: ((dt: number) => void) | null = null;
  screenshotReady = false;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new GameRenderer(canvas);
    this.bindCamera(canvas);
    this.last = performance.now();
    const loop = (t: number) => {
      this.rafId = requestAnimationFrame(loop);
      const dt = Math.min(0.1, (t - this.last) / 1000);
      this.last = t;
      this.update(dt);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  loadLevel(id: string, difficulty: DifficultyId = 'houseguest', seed = 1337): void {
    this.level = levelById(id);
    this.sim = new Sim(this.level, { seed, difficulty, content: CONTENT });
    this.renderer.loadLevel(this.level, CONTENT);
    this.acc = 0;
  }

  private update(dt: number): void {
    if (this.sim && !this.paused) {
      this.acc += dt * this.speedMult;
      let guard = 0;
      while (this.acc >= SIM_DT && guard++ < 8) {
        const events = this.sim.tick();
        this.renderer.syncTick(this.sim.state, events);
        if (events.length && this.onEvents) this.onEvents(events);
        this.acc -= SIM_DT;
      }
      this.renderer.syncProjectiles(this.sim.state);
    }
    this.renderer.frame(dt);
    this.onFrame?.(dt);
    this.screenshotReady = true;
  }

  /** Run N sim ticks instantly (demo staging / debug). */
  fastForward(ticks: number): void {
    if (!this.sim) return;
    for (let i = 0; i < ticks; i++) {
      const events = this.sim.tick();
      if (i === ticks - 1) this.renderer.syncTick(this.sim.state, events);
    }
    // snap views to current positions
    this.renderer.syncTick(this.sim.state, []);
  }

  private bindCamera(canvas: HTMLCanvasElement): void {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    canvas.addEventListener('pointerdown', (e) => {
      if (e.button === 1 || e.button === 2) {
        dragging = true;
        lastX = e.clientX;
        lastY = e.clientY;
      }
    });
    addEventListener('pointermove', (e) => {
      if (dragging) {
        this.renderer.rig.orbit(e.clientX - lastX, e.clientY - lastY);
        lastX = e.clientX;
        lastY = e.clientY;
      }
      // hand follows pointer
      const ndcX = (e.clientX / innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / innerHeight) * 2 + 1;
      const hit = this.renderer.pickSurfacePoint(ndcX, ndcY);
      if (hit && this.level) {
        const y = this.level.surfaces[hit.surface].origin.y;
        this.renderer.hand.setTarget(new Vector3(hit.x, y, hit.z), y);
      }
    });
    addEventListener('pointerup', () => {
      dragging = false;
    });
    canvas.addEventListener('wheel', (e) => {
      this.renderer.rig.zoom(e.deltaY);
      e.preventDefault();
    }, { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  /** Deterministic staged scenes for screenshot evaluation. */
  demo(name: 'build' | 'battle' | 'boss' | 'towers' | 'critters'): void {
    if (name === 'towers') {
      // lineup of the full Phase 1 roster for art review
      this.loadLevel('kitchen-1');
      const sim = this.sim!;
      sim.state.crumbs = 99999;
      const roster = ['sgt-spritz', 'old-smacky', 'sir-toastsalot', 'big-blow', 'the-coldfather', 'bandolero'];
      sim.state.clutterHand = roster.map(() => 'tupper-o');
      roster.forEach((_def, i) => {
        const c = 1 + (i % 3) * 4;
        const r = i < 3 ? 0 : 7;
        sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c, r } });
      });
      this.fastForward(2);
      roster.forEach((def, i) => {
        const c = 1 + (i % 3) * 4;
        const r = i < 3 ? 0 : 7;
        sim.command({ type: 'placeTower', def, at: { s: 0, c, r } });
      });
      // floor-mounted personalities stand on the tile itself
      sim.command({ type: 'placeTower', def: 'gnomeo', at: { s: 0, c: 12, r: 2 } });
      sim.command({ type: 'placeTower', def: 'stick-rick', at: { s: 0, c: 12, r: 8 } });
      this.fastForward(4);
      this.renderer.rig.pose(0.05, 0.8, 11.5);
      this.renderer.rig.target.set(7, 1.0, 4);
      return;
    }
    if (name === 'critters') {
      this.loadLevel('kitchen-1');
      const sim = this.sim!;
      const species = ['ant-worker', 'ant-soldier', 'ant-bullet', 'fly-house', 'fly-fruit', 'roach', 'mouse-thief', 'slug', 'snail', 'moth', 'dust-bunny', 'dust-bunnette', 'stinkbug'];
      species.forEach((def, i) => {
        const c = 1 + (i % 7) * 2;
        const r = i < 7 ? 8 : 6;
        const cr = sim.debugSpawn(def, { s: 0, c, r });
        cr.pos.x = c + 0.5;
        cr.pos.z = (i < 7 ? 8 : 6) + 0.5;
      });
      // freeze them for the portrait
      for (const cr of sim.state.critters.values()) cr.statuses.frozen = 9999;
      this.fastForward(2);
      this.renderer.rig.pose(0.05, 0.85, 9);
      this.renderer.rig.target.set(7, 0.4, 7);
      return;
    }
    if (name === 'build') {
      this.loadLevel('kitchen-1');
      return;
    }
    if (name === 'battle') {
      this.loadLevel('kitchen-1');
      const sim = this.sim!;
      sim.state.crumbs = 900;
      sim.state.clutterHand = ['cereal-i', 'tupper-o', 'tupper-o'];
      sim.command({ type: 'placeClutter', shape: 'cereal-i', rot: 1, at: { s: 0, c: 2, r: 3 } });
      sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 11, r: 4 } });
      sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 1, r: 0 } });
      this.fastForward(2);
      sim.command({ type: 'placeTower', def: 'sgt-spritz', at: { s: 0, c: 2, r: 4 } });
      sim.command({ type: 'placeTower', def: 'old-smacky', at: { s: 0, c: 11, r: 4 } });
      sim.command({ type: 'placeTower', def: 'sir-toastsalot', at: { s: 0, c: 1, r: 0 } });
      sim.command({ type: 'placeTower', def: 'gnomeo', at: { s: 0, c: 3, r: 1 } });
      this.fastForward(2);
      sim.command({ type: 'callWave' });
      this.fastForward(Math.round(7 / SIM_DT)); // mid-wave chaos
      return;
    }
    if (name === 'boss') {
      this.loadLevel('kitchen-5');
      const sim = this.sim!;
      sim.state.crumbs = 2000;
      sim.state.clutterHand = ['tupper-o', 'tupper-o'];
      sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 1, r: 5 } });
      sim.command({ type: 'placeClutter', shape: 'tupper-o', rot: 0, at: { s: 0, c: 12, r: 6 } });
      this.fastForward(2);
      sim.command({ type: 'placeTower', def: 'the-coldfather', at: { s: 0, c: 1, r: 5 } });
      sim.command({ type: 'placeTower', def: 'bandolero', at: { s: 0, c: 12, r: 6 } });
      this.fastForward(2);
      sim.debugSpawn('crumb-king', { s: 0, c: 3, r: 8 });
      for (let i = 0; i < 8; i++) sim.debugSpawn('ant-worker', { s: 0, c: 2 + (i % 4), r: 9 });
      this.fastForward(Math.round(2.5 / SIM_DT));
      return;
    }
  }
}

export function exposeDebug(game: Game): void {
  (window as unknown as { __game: object }).__game = {
    loadLevel: (id: string) => game.loadLevel(id),
    demo: (name: 'build' | 'battle' | 'boss') => game.demo(name),
    state: () => game.sim?.state,
    grantCrumbs: (n: number) => {
      if (game.sim) game.sim.state.crumbs += n;
    },
    callWave: () => game.sim?.command({ type: 'callWave' }),
    setSpeed: (n: number) => {
      game.speedMult = n;
    },
    fastForward: (ticks: number) => game.fastForward(ticks),
    levels: () => ALL_LEVELS.map((l) => l.id),
    drawCalls: () => game.renderer.drawCallCount(),
    get screenshotReady() {
      return game.screenshotReady;
    },
  };
}
