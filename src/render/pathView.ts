import * as THREE from 'three';
import { canvasTexture } from './build';

/** On-board "danger route" preview: a soft glowing ribbon laid on the floor along the path the
 *  critters will actually walk to reach the cake, with chevrons that scroll toward the cake so the
 *  direction of travel reads at a glance. Rebuilt from world-space polylines only when the flow
 *  field changes (see Grid.pathVersion); animated (scroll + gentle pulse) every frame. */

const ARROW_CELL = 1.05;   // world units between chevrons
const RIBBON_WIDTH = 0.72; // world width of the ribbon
const Y_LIFT = 0.05;       // sit just above the floor to avoid z-fighting
const SCROLL_SPEED = 0.32; // texture units / second (arrows crawl toward the cake)

/** The tiling chevron+road texture, drawn once and cloned per ribbon (each ribbon needs its own
 *  repeat/offset). Canvas x = along the path (toward the cake is +x); y = across the ribbon. */
function makeArrowTexture(): THREE.CanvasTexture {
  const tex = canvasTexture(64, 64, (ctx) => {
    ctx.clearRect(0, 0, 64, 64);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    // continuous "road" band down the middle (constant along the path → tiles seamlessly), with a
    // faint dark edge so the ribbon stays legible on both light and dark floors.
    ctx.fillStyle = 'rgba(90, 40, 16, 0.22)';
    ctx.fillRect(0, 18, 64, 28);
    ctx.fillStyle = 'rgba(255, 150, 92, 0.34)';
    ctx.fillRect(0, 21, 64, 22);
    // one chevron per tile, apex pointing toward the cake (+x). Dark outline first, bright on top.
    const chevron = () => {
      ctx.beginPath();
      ctx.moveTo(19, 15);
      ctx.lineTo(41, 32);
      ctx.lineTo(19, 49);
      ctx.stroke();
    };
    ctx.strokeStyle = 'rgba(70, 30, 12, 0.55)';
    ctx.lineWidth = 14;
    chevron();
    ctx.strokeStyle = 'rgba(255, 236, 208, 0.98)';
    ctx.lineWidth = 8;
    chevron();
  });
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export class PathView {
  readonly group = new THREE.Group();
  private meshes: THREE.Mesh[] = [];
  private maps: THREE.Texture[] = [];
  private baseTex: THREE.CanvasTexture;
  private visible = true;

  constructor() {
    this.baseTex = makeArrowTexture();
    this.group.renderOrder = 2; // draw over the floor, under critters/VFX that write depth
  }

  /** Replace the shown routes with fresh world-space polylines (one per spawn). */
  rebuild(paths: THREE.Vector3[][]): void {
    this.clear();
    for (const pts of paths) {
      if (pts.length < 2) continue;
      const mesh = this.buildRibbon(pts);
      if (mesh) {
        this.group.add(mesh);
        this.meshes.push(mesh);
        this.maps.push((mesh.material as THREE.MeshBasicMaterial).map!);
      }
    }
    this.group.visible = this.visible && this.meshes.length > 0;
  }

  private buildRibbon(points: THREE.Vector3[]): THREE.Mesh | null {
    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    const length = curve.getLength();
    if (length < 0.5) return null;
    const n = Math.max(2, Math.round(length / 0.25));
    const samples = curve.getSpacedPoints(n); // n + 1 points, evenly spaced

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const up = new THREE.Vector3(0, 1, 0);
    const tangent = new THREE.Vector3();
    const side = new THREE.Vector3();
    const half = RIBBON_WIDTH / 2;
    let dist = 0;

    for (let i = 0; i <= n; i++) {
      const p = samples[i];
      const a = samples[Math.max(0, i - 1)];
      const b = samples[Math.min(n, i + 1)];
      tangent.subVectors(b, a);
      tangent.y = 0;
      if (tangent.lengthSq() < 1e-6) tangent.set(0, 0, 1);
      tangent.normalize();
      side.crossVectors(tangent, up).normalize().multiplyScalar(half);
      positions.push(p.x - side.x, p.y + Y_LIFT, p.z - side.z);
      positions.push(p.x + side.x, p.y + Y_LIFT, p.z + side.z);
      if (i > 0) dist += samples[i].distanceTo(samples[i - 1]);
      uvs.push(dist, 0, dist, 1); // u = cumulative world distance (scaled by texture.repeat)
      if (i < n) {
        const j = i * 2;
        indices.push(j, j + 2, j + 1, j + 1, j + 2, j + 3);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);

    const map = this.baseTex.clone();
    map.needsUpdate = true;
    map.repeat.set(1 / ARROW_CELL, 1);
    const mat = new THREE.MeshBasicMaterial({
      map,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      side: THREE.DoubleSide,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 2;
    return mesh;
  }

  setVisible(on: boolean): void {
    this.visible = on;
    this.group.visible = on && this.meshes.length > 0;
  }

  clear(): void {
    for (const m of this.meshes) {
      this.group.remove(m);
      m.geometry.dispose();
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.dispose();
    }
    this.meshes = [];
    this.maps = [];
  }

  update(dt: number, time: number): void {
    if (!this.group.visible) return;
    const pulse = 0.72 + Math.sin(time * 2.4) * 0.14;
    for (let i = 0; i < this.maps.length; i++) {
      this.maps[i].offset.x -= SCROLL_SPEED * dt; // arrows crawl toward the cake
      (this.meshes[i].material as THREE.MeshBasicMaterial).opacity = pulse;
    }
  }
}
