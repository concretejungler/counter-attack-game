import * as THREE from 'three';

/** 3-step toon ramp shared by every toon material. */
let gradientMap: THREE.DataTexture | null = null;
export function toonRamp(): THREE.DataTexture {
  if (!gradientMap) {
    const data = new Uint8Array([110, 110, 110, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
    gradientMap = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    gradientMap.needsUpdate = true;
  }
  return gradientMap;
}

const matCache = new Map<string, THREE.MeshToonMaterial>();
export function toonMat(color: number, opts: { emissive?: number; transparent?: boolean; opacity?: number } = {}): THREE.MeshToonMaterial {
  const key = `${color}|${opts.emissive ?? 0}|${opts.opacity ?? 1}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: toonRamp(),
      emissive: opts.emissive ?? 0,
      transparent: opts.transparent ?? false,
      opacity: opts.opacity ?? 1,
    });
    matCache.set(key, m);
  }
  return m;
}

/** Shared vertex-colored toon material (instanced critters, merged geoms). */
let vcMat: THREE.MeshToonMaterial | null = null;
export function vertexToonMat(): THREE.MeshToonMaterial {
  if (!vcMat) {
    vcMat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: toonRamp() });
  }
  return vcMat;
}

// ---- primitive helpers (all cast/receive shadow by default) ----
export function box(w: number, h: number, d: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), toonMat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cyl(rTop: number, rBot: number, h: number, color: number, seg = 12): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), toonMat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function sphere(r: number, color: number, seg = 10): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(6, seg - 2)), toonMat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function cone(r: number, h: number, color: number, seg = 10): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), toonMat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function capsule(r: number, len: number, color: number): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), toonMat(color));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function at<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T {
  obj.position.set(x, y, z);
  return obj;
}

export function rot<T extends THREE.Object3D>(obj: T, x: number, y: number, z: number): T {
  obj.rotation.set(x, y, z);
  return obj;
}

/** Paint a flat vertex color over a geometry (for merged instanced models). */
export function colorize(geom: THREE.BufferGeometry, color: number): THREE.BufferGeometry {
  const c = new THREE.Color(color);
  const count = geom.getAttribute('position').count;
  const arr = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    arr[i * 3] = c.r;
    arr[i * 3 + 1] = c.g;
    arr[i * 3 + 2] = c.b;
  }
  geom.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return geom;
}

/** Canvas-texture helper for labels, tiles, faces. */
export function canvasTexture(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Simple googly eyes group — the soul of every appliance. */
export function eyes(spacing: number, r: number, pupil = 0.45): THREE.Group {
  const g = new THREE.Group();
  for (const side of [-1, 1]) {
    const white = sphere(r, 0xffffff, 10);
    white.castShadow = false;
    white.position.x = side * spacing * 0.5;
    const black = sphere(r * pupil, 0x1a1410, 8);
    black.castShadow = false;
    black.position.set(side * spacing * 0.5, 0, r * 0.72);
    g.add(white, black);
  }
  return g;
}
