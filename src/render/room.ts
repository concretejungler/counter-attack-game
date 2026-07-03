import * as THREE from 'three';
import type { LevelDef, RoomTheme, SurfaceDef } from '../sim/types';
import { PAL, themePalette, type ThemePalette } from './palette';
import { at, box, canvasTexture, cyl, rot, toonMat } from './build';

/** Builds the whole diorama environment for a level: floor, walls, furniture, light shafts, spawn props.
 *  onSunflower (§20.2 easter egg): called with the windowsill sunflower's mesh group, if this
 *  theme has a window to put one on — renderer.ts wires it to EggsController.registerSunflower(). */
export function buildRoom(level: LevelDef, onSunflower?: (g: THREE.Group) => void): THREE.Group {
  const room = new THREE.Group();
  const TP = themePalette(level.theme);
  const floor = level.surfaces[0];
  const W = floor.cols;
  const D = floor.rows;

  room.add(buildBackdrop(W, D, TP));
  room.add(buildLighting(TP, W, D));
  room.add(buildFloor(floor, TP));
  room.add(buildWalls(W, D, TP));
  for (let i = 1; i < level.surfaces.length; i++) {
    room.add(buildElevatedSurface(level.surfaces[i], TP));
  }
  for (const climb of level.climbs) {
    if (climb.from.s === 0) room.add(buildStool(level, climb.from.c, climb.from.r, TP));
  }
  for (const spawn of level.spawns) {
    room.add(buildSpawnProp(level, spawn.kind, spawn.tile.s, spawn.tile.c, spawn.tile.r, TP));
  }
  room.add(buildSunbeams(W, D, TP));
  room.add(buildDecor(W, D, TP, level.theme));
  if (TP.hasWindow) {
    const sunflower = buildSunflower(W, TP);
    room.add(sunflower);
    onSunflower?.(sunflower);
  }
  return room;
}

/** The windowsill sunflower (§20.2, "a PvZ wink") — sits on the sill just below the window, a
 *  friendly cluster of petals that sways idly and reacts to clicks (click handling lives in
 *  EggsController; this only builds the mesh). Kept as its own top-level room child (not baked
 *  into buildWalls' window block) so EggsController can rotate it in isolation for the sway anim. */
function buildSunflower(W: number, TP: ThemePalette): THREE.Group {
  const g = new THREE.Group();
  const stem = cyl(0.045, 0.06, 0.55, 0x4a7a34, 6);
  stem.position.y = 0.28;
  g.add(stem);
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), toonMat(0x5a9a44));
  leaf.scale.set(1.6, 0.3, 0.9);
  leaf.position.set(0.1, 0.35, 0);
  leaf.rotation.z = 0.5;
  g.add(leaf);

  const head = new THREE.Group();
  head.position.y = 0.58;
  const center = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), toonMat(0x6b3a1c));
  center.scale.set(1, 0.6, 1);
  head.add(center);
  const petalMat = toonMat(0xffd23c);
  for (let i = 0; i < 10; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 5), petalMat);
    petal.scale.set(1.8, 0.5, 0.7);
    const a = (i / 10) * Math.PI * 2;
    petal.position.set(Math.cos(a) * 0.2, 0.02, Math.sin(a) * 0.2);
    petal.rotation.y = -a;
    head.add(petal);
  }
  g.add(head);

  // little terracotta pot, sitting on the sill
  const pot = cyl(0.16, 0.12, 0.22, 0xc06a3c, 8);
  pot.position.y = 0.11;
  g.add(pot);

  g.position.set(W * 0.62 - 1.3, 2.42, 0.32); // just below/left of the window frame, on the sill
  g.scale.setScalar(0.62);
  return g;
}

/**
 * "It's a diorama on display, not floating in the void." A big gradient-sky dome (dusk peach
 * top → deep plum bottom, per-theme tinted) plus a soft circular display-table disc beneath the
 * room, plus a very subtle darkening ring beyond the room's own floor. Cheap: one dome mesh with
 * a tiny canvas-gradient texture (unlit, so it costs nothing per-pixel beyond a texture sample),
 * one flat disc, one soft shadow ring. No lights, no shadow casters — background dressing only.
 */
function buildBackdrop(W: number, D: number, TP: ThemePalette): THREE.Group {
  const g = new THREE.Group();
  const cx = W / 2;
  const cz = D / 2;
  const radius = Math.max(W, D) * 3 + 20;

  // gradient sky dome — vertical canvas gradient mapped onto the inside of a big sphere.
  // Near-full sphere (phi 0..~0.97*PI) centered at floor level so it fully surrounds the camera
  // regardless of orbit/pitch — no risk of a gap showing raw scene-background black through a cap edge.
  const domeTex = canvasTexture(8, 128, (ctx) => {
    const grad = ctx.createLinearGradient(0, 0, 0, 128);
    const top = '#' + TP.domeTop.toString(16).padStart(6, '0');
    const mid = '#' + mixHex(TP.domeTop, TP.domeBottom, 0.55).toString(16).padStart(6, '0');
    const bottom = '#' + TP.domeBottom.toString(16).padStart(6, '0');
    grad.addColorStop(0, top);
    grad.addColorStop(0.55, mid);
    grad.addColorStop(1, bottom);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 8, 128);
  });
  domeTex.wrapS = THREE.ClampToEdgeWrapping;
  domeTex.wrapT = THREE.ClampToEdgeWrapping;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.97),
    new THREE.MeshBasicMaterial({ map: domeTex, side: THREE.BackSide, fog: false, depthWrite: false, toneMapped: false }),
  );
  dome.position.set(cx, 0, cz);
  dome.renderOrder = -10;
  g.add(dome);

  // soft circular display-table disc under the whole room — reads as "a toy on a shelf/table"
  const tableR = Math.max(W, D) * 1.35 + 6;
  const tableTex = canvasTexture(128, 128, (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 64);
    const rim = '#' + TP.tableRimColor.toString(16).padStart(6, '0');
    const base = '#' + TP.tableColor.toString(16).padStart(6, '0');
    grad.addColorStop(0, base);
    grad.addColorStop(0.78, base);
    grad.addColorStop(0.92, rim);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  });
  const table = new THREE.Mesh(
    new THREE.CircleGeometry(tableR, 40),
    new THREE.MeshBasicMaterial({ map: tableTex, transparent: true, fog: false, depthWrite: false, toneMapped: false }),
  );
  table.rotation.x = -Math.PI / 2;
  table.position.set(cx, -0.42, cz);
  table.renderOrder = -9;
  g.add(table);

  // subtle darker vignette shadow on the floor plane just beyond the room bounds — grounds the
  // room into the table without a hard edge.
  const shadowTex = canvasTexture(128, 128, (ctx) => {
    const grad = ctx.createRadialGradient(64, 64, 40, 64, 64, 64);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  });
  const shadowR = Math.max(W, D) * 0.95 + 5;
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(shadowR, 40),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, fog: false, depthWrite: false, toneMapped: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(cx, -0.28, cz);
  shadow.renderOrder = -8;
  g.add(shadow);

  return g;
}

function mixHex(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  const r = Math.round(ar + (br - ar) * t);
  const gc = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gc << 8) | bl;
}

/** Per-theme practical light rig — hemisphere fill + a key light standing in for sun/moon/glow. */
function buildLighting(TP: ThemePalette, W: number, D: number): THREE.Group {
  const g = new THREE.Group();
  const hemi = new THREE.HemisphereLight(TP.ambient, TP.ambientGround, TP.ambientIntensity);
  g.add(hemi);

  const key = new THREE.PointLight(TP.keyColor, TP.keyIntensity, Math.max(W, D) * 3.2, 1.8);
  key.position.set(W * 0.62, 6.5, 3.2);
  g.add(key);

  return g;
}

function buildFloor(floor: SurfaceDef, TP: ThemePalette): THREE.Group {
  const g = new THREE.Group();
  const tex = canvasTexture(256, 256, (ctx) => {
    const a = '#' + TP.floorTileA.toString(16).padStart(6, '0');
    const b = '#' + TP.floorTileB.toString(16).padStart(6, '0');
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? a : b;
        ctx.fillRect(x * 128, y * 128, 128, 128);
        // grout lines + subtle speckle
        ctx.strokeStyle = TP.groutAlpha;
        ctx.lineWidth = 3;
        ctx.strokeRect(x * 128 + 1, y * 128 + 1, 126, 126);
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        for (let i = 0; i < 14; i++) {
          ctx.fillRect(x * 128 + ((i * 37) % 120), y * 128 + ((i * 53) % 120), 3, 3);
        }
      }
    }
  });
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(floor.cols / 2, floor.rows / 2);
  const mat = new THREE.MeshToonMaterial({ map: tex });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(floor.cols, 0.3, floor.rows), mat);
  mesh.receiveShadow = true;
  mesh.position.set(floor.origin.x + floor.cols / 2, -0.15, floor.origin.z + floor.rows / 2);
  g.add(mesh);
  return g;
}

function buildWalls(W: number, D: number, TP: ThemePalette): THREE.Group {
  const g = new THREE.Group();
  const wallH = 7.5;

  if (!TP.hasCeiling) {
    // exterior (backyard): sky backdrop instead of solid walls, low fence line instead
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(120, 60),
      new THREE.MeshBasicMaterial({ color: TP.windowSky, fog: false }),
    );
    sky.position.set(W / 2, 24, -20);
    g.add(sky);

    const fenceMat = toonMat(TP.wallTrim);
    const fenceH = 3.2;
    for (let x = -1; x <= W + 1; x += 1.4) {
      const post = box(0.18, fenceH, 0.18, TP.wallTrim);
      post.position.set(x, fenceH / 2, -0.3);
      g.add(post);
    }
    const rail1 = new THREE.Mesh(new THREE.BoxGeometry(W + 2, 0.25, 0.12), fenceMat);
    rail1.position.set(W / 2, fenceH * 0.65, -0.3);
    const rail2 = new THREE.Mesh(new THREE.BoxGeometry(W + 2, 0.25, 0.12), fenceMat);
    rail2.position.set(W / 2, fenceH * 0.25, -0.3);
    g.add(rail1, rail2);

    // left-side hedge line stands in for the west wall
    const hedge = box(0.6, 2.2, D + 1, TP.wallCream);
    hedge.position.set(-0.3, 1.1, D / 2);
    g.add(hedge);
    return g;
  }

  const wallMat = toonMat(TP.wallCream);
  const trimMat = toonMat(TP.wallTrim);

  // back wall (north, z=0) and left wall (west, x=0) — diorama style, two walls only.
  // Each gets its OWN cloned material + a fadeWall tag so renderer.ts can turn it translucent when
  // the camera orbits around to its outside (where it would otherwise block the whole board). The
  // interior of both walls is on the +axis side, so "camera coord > wall coord" == looking from
  // inside == solid. Kept transparent-flagged always so no per-frame material recompile is needed.
  const back = new THREE.Mesh(new THREE.BoxGeometry(W + 1, wallH, 0.4), wallMat.clone());
  back.position.set(W / 2, wallH / 2, -0.2);
  back.receiveShadow = true;
  back.material.transparent = true;
  back.userData.fadeWall = { axis: 'z', coord: back.position.z };
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallH, D + 1), wallMat.clone());
  left.position.set(-0.2, wallH / 2, D / 2);
  left.receiveShadow = true;
  left.material.transparent = true;
  left.userData.fadeWall = { axis: 'x', coord: left.position.x };
  g.add(back, left);

  // baseboards
  const bb1 = new THREE.Mesh(new THREE.BoxGeometry(W + 1, 0.5, 0.18), trimMat);
  bb1.position.set(W / 2, 0.25, 0.1);
  const bb2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, D + 1), trimMat);
  bb2.position.set(0.1, 0.25, D / 2);
  g.add(bb1, bb2);

  if (TP.hasWindow) {
    // window on the back wall with sky (moon for bedroom, vent-round for attic handled below)
    const winW = Math.min(5, W * 0.4);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.5, 4, 0.5), toonMat(0xffffff));
    frame.position.set(W * 0.62, 4.4, -0.18);
    const sky = new THREE.Mesh(
      new THREE.PlaneGeometry(winW, 3.4),
      new THREE.MeshBasicMaterial({ color: TP.windowSky }),
    );
    sky.position.set(W * 0.62, 4.4, 0.13);
    const bar1 = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.12, 0.1), toonMat(0xffffff));
    bar1.position.set(W * 0.62, 4.4, 0.16);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 0.1), toonMat(0xffffff));
    bar2.position.set(W * 0.62, 4.4, 0.16);
    g.add(frame, sky, bar1, bar2);

    // curtains
    const curtain = toonMat(TP.wallTrim);
    for (const side of [-1, 1]) {
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.2, 0.3), curtain);
      c.position.set(W * 0.62 + side * (winW / 2 + 0.45), 4.5, 0.05);
      g.add(c);
    }

    if (TP.keyIntensity < 0.5) {
      // bedroom-at-night / basement-dim: a faint moon/glow disc behind the glass
      const moon = new THREE.Mesh(new THREE.CircleGeometry(0.9, 20), new THREE.MeshBasicMaterial({ color: 0xf0f0ff }));
      moon.position.set(W * 0.62 + 0.6, 5.0, 0.14);
      g.add(moon);
    }
  }

  return g;
}

/** Soft dark contact-shadow decal on the floor beneath a furniture footprint — grounds cabinets/
 *  shelves/stoves into the tile instead of them looking like they hover just above it. Shelves
 *  (which have open space underneath, not a solid cabinet body) get a fainter, tighter version. */
let floorContactTex: THREE.CanvasTexture | null = null;
function floorContactTexture(): THREE.CanvasTexture {
  if (!floorContactTex) {
    floorContactTex = canvasTexture(64, 64, (ctx) => {
      ctx.clearRect(0, 0, 64, 64);
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(6, 6, 52, 52);
      const grad = ctx.createLinearGradient(0, 0, 0, 12);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 64, 14);
      ctx.save();
      ctx.translate(64, 0);
      ctx.rotate(Math.PI / 2);
      ctx.fillRect(0, 0, 64, 14);
      ctx.restore();
      ctx.save();
      ctx.translate(64, 64);
      ctx.rotate(Math.PI);
      ctx.fillRect(0, 0, 64, 14);
      ctx.restore();
      ctx.save();
      ctx.translate(0, 64);
      ctx.rotate(-Math.PI / 2);
      ctx.fillRect(0, 0, 64, 14);
      ctx.restore();
    });
  }
  return floorContactTex;
}

function buildElevatedSurface(surf: SurfaceDef, TP: ThemePalette): THREE.Group {
  const g = new THREE.Group();
  const { origin, cols, rows } = surf;
  const h = origin.y;
  const cx = origin.x + cols / 2;
  const cz = origin.z + rows / 2;

  // floor-contact darkening beneath the footprint — grounds it into the tile
  const contact = new THREE.Mesh(
    new THREE.PlaneGeometry(cols + 0.3, rows + 0.3),
    new THREE.MeshBasicMaterial({
      map: floorContactTexture(),
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      opacity: surf.kind === 'shelf' ? 0.45 : 0.85,
    }),
  );
  contact.rotation.x = -Math.PI / 2;
  contact.position.set(cx, 0.012, cz);
  contact.renderOrder = -1;
  g.add(contact);

  // top slab — tint/texture per surface kind and theme (garage shelf = metal, bathroom counter = porcelain, etc.)
  const topColor = surf.kind === 'stove' ? TP.metal : surf.kind === 'shelf' ? TP.wood : TP.counterTop;
  const slab = box(cols, 0.35, rows, topColor);
  slab.position.set(cx, h - 0.175, cz);
  g.add(slab);

  if (surf.kind === 'shelf') {
    // bracket legs at the wall side
    for (const lx of [origin.x + 0.4, origin.x + cols - 0.4]) {
      const leg = box(0.25, h, 0.25, TP.woodDark);
      leg.position.set(lx, h / 2, origin.z + 0.3);
      g.add(leg);
    }
  } else {
    // cabinet body under counters/stoves
    const body = box(cols - 0.3, h - 0.4, rows - 0.3, TP.cabinet);
    body.position.set(cx, (h - 0.4) / 2, cz);
    g.add(body);
    // cabinet doors + knobs
    const doorCount = Math.max(1, Math.floor(cols / 2));
    for (let i = 0; i < doorCount; i++) {
      const dw = (cols - 0.8) / doorCount;
      const door = box(dw - 0.15, h - 1.0, 0.08, TP.wood);
      door.position.set(origin.x + 0.4 + dw * (i + 0.5), (h - 0.6) / 2, origin.z + rows - 0.1);
      g.add(door);
      const knob = box(0.1, 0.1, 0.1, PAL.butter);
      knob.position.set(origin.x + 0.4 + dw * (i + 0.5) + dw * 0.3, (h - 0.6) / 2, origin.z + rows - 0.04);
      g.add(knob);
    }
  }

  // special blocked-tile props
  for (const [c, r] of surf.blocked ?? []) {
    const px = origin.x + c + 0.5;
    const pz = origin.z + r + 0.5;
    if (surf.kind === 'stove') {
      const burner = cyl(0.42, 0.42, 0.08, 0x2a2a2e, 16);
      burner.position.set(px, h + 0.05, pz);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.05, 8, 18),
        new THREE.MeshBasicMaterial({ color: 0xff6a3c }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(px, 0.1 + h, pz);
      const g2 = new THREE.Group();
      g2.add(burner, ring);
      g2.userData.burner = true;
      g.add(g2);
    } else {
      // sink basin
      const basin = box(0.95, 0.5, 0.95, TP.metalDark);
      basin.position.set(px, h + 0.1, pz);
      g.add(basin);
    }
  }
  return g;
}

function buildStool(level: LevelDef, c: number, r: number, TP: ThemePalette): THREE.Group {
  const g = new THREE.Group();
  const x = level.surfaces[0].origin.x + c + 0.5;
  const z = level.surfaces[0].origin.z + r + 0.5;
  const seat = cyl(0.45, 0.4, 0.15, TP.wallTrim, 12);
  seat.position.set(x, 1.1, z);
  g.add(seat);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(0.06, 0.06, 1.05, TP.woodDark, 6);
    leg.position.set(x + Math.sin(a) * 0.28, 0.52, z + Math.cos(a) * 0.28);
    leg.rotation.z = Math.sin(a) * 0.12;
    leg.rotation.x = -Math.cos(a) * 0.12;
    g.add(leg);
  }
  return g;
}

function buildSpawnProp(level: LevelDef, kind: string, s: number, c: number, r: number, TP: ThemePalette): THREE.Group {
  const g = new THREE.Group();
  const surf = level.surfaces[s];
  const x = surf.origin.x + c + 0.5;
  const y = surf.origin.y;
  const z = surf.origin.z + r + 0.5;

  switch (kind) {
    case 'door': {
      // a cracked-open door at the room edge
      const door = box(0.18, 4.2, 1.6, TP.wood);
      door.position.set(x - 0.4, 2.1, z + 0.4);
      door.rotation.y = 0.5;
      const knob = at(new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), toonMat(PAL.butter)), x - 0.1, 1.9, z + 0.9);
      const dark = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 4), new THREE.MeshBasicMaterial({ color: 0x140e08 }));
      dark.position.set(x - 0.55, 2, z - 0.3);
      dark.rotation.y = Math.PI / 2;
      g.add(door, knob, dark);
      break;
    }
    case 'vent': {
      const grate = box(1.1, 0.7, 0.12, TP.metalDark);
      grate.position.set(x, 0.4, z - 0.45);
      for (let i = 0; i < 3; i++) {
        const slot = box(0.85, 0.07, 0.05, 0x1a1410);
        slot.position.set(x, 0.22 + i * 0.18, z - 0.39);
        g.add(slot);
      }
      g.add(grate);
      break;
    }
    case 'drain': {
      const lid = cyl(0.5, 0.5, 0.06, TP.metalDark, 16);
      lid.position.set(x, y + 0.04, z);
      const hole = cyl(0.32, 0.32, 0.04, 0x140e08, 12);
      hole.position.set(x, y + 0.08, z);
      g.add(lid, hole);
      // eerie glow (sewer flavor; harmless dim point light elsewhere)
      const glow = new THREE.PointLight(TP.practicalColor, 1.4, 2.2, 2);
      glow.position.set(x, y + 0.2, z);
      g.add(glow);
      break;
    }
    case 'window': {
      const sill = box(1.4, 0.12, 0.5, 0xffffff);
      sill.position.set(x, y + 0.06, z - 0.3);
      g.add(sill);
      break;
    }
    case 'crack': {
      const dark = rot(new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.5), new THREE.MeshBasicMaterial({ color: 0x140e08 })), 0, Math.PI / 4, 0);
      dark.position.set(x - 0.2, 0.25, z - 0.2);
      g.add(dark);
      break;
    }
    case 'couch': {
      // living-room couch silhouette doubling as a spawn prop when used there
      const body = box(1.6, 0.6, 0.8, TP.wallTrim);
      body.position.set(x, y + 0.3, z);
      const back = box(1.6, 0.7, 0.2, TP.wallTrim);
      back.position.set(x, y + 0.65, z - 0.3);
      g.add(body, back);
      break;
    }
  }
  return g;
}

/** Volumetric-ish light shafts from the window/vent + drifting dust motes. Skipped for exteriors. */
function buildSunbeams(W: number, D: number, TP: ThemePalette): THREE.Group {
  const g = new THREE.Group();
  if (!TP.hasWindow) return g; // sewer: no window shafts, just the drain glow

  const beamMat = new THREE.MeshBasicMaterial({
    color: TP.sunbeam,
    transparent: true,
    opacity: TP.sunbeamOpacity,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  for (let i = 0; i < 3; i++) {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.3 - i * 0.25, 11), beamMat);
    beam.position.set(W * 0.62 + (i - 1) * 1.3, 3.4, 3.2);
    beam.rotation.set(0.62, -0.55 + 0.14 * i, 0.12);
    g.add(beam);
  }

  // dust motes — denser for the attic (dusty golden light)
  const count = TP.sunbeamOpacity > 0.14 ? 150 : 90;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = W * 0.4 + Math.random() * W * 0.45;
    pos[i * 3 + 1] = 0.5 + Math.random() * 5.5;
    pos[i * 3 + 2] = 0.5 + Math.random() * (D * 0.6);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(geom, new THREE.PointsMaterial({
    color: TP.sunbeam,
    size: 0.05,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  }));
  motes.userData.motes = true;
  g.add(motes);
  return g;
}

function buildDecor(W: number, D: number, TP: ThemePalette, theme: RoomTheme): THREE.Group {
  const g = new THREE.Group();

  // wall clock — every room keeps one except exteriors (no back wall to hang it on)
  if (TP.hasCeiling) {
    const face = cyl(0.55, 0.55, 0.1, 0xffffff, 20);
    face.rotation.x = Math.PI / 2;
    face.position.set(W * 0.2, 5.6, 0.12);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 24), toonMat(TP.wallTrim));
    rim.position.copy(face.position);
    const hourHand = box(0.06, 0.3, 0.03, PAL.ink);
    hourHand.position.set(W * 0.2, 5.72, 0.2);
    const minHand = box(0.05, 0.42, 0.03, PAL.ink);
    minHand.position.set(W * 0.2, 5.6, 0.2);
    minHand.rotation.z = 1.2;
    g.add(face, rim, hourHand, minHand);
  }

  // the kid's crayon drawing, taped to the wall — a house with a sword (kitchen/living/bedroom feel)
  if (TP.hasCeiling) {
    const drawing = canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = '#fdf6e7';
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = '#e8504f';
      ctx.lineWidth = 5;
      ctx.strokeRect(30, 56, 64, 48); // house body
      ctx.beginPath(); // roof
      ctx.moveTo(22, 58);
      ctx.lineTo(62, 26);
      ctx.lineTo(102, 58);
      ctx.stroke();
      ctx.strokeStyle = '#3f5d7d';
      ctx.lineWidth = 4;
      ctx.beginPath(); // sword arm!!
      ctx.moveTo(94, 80);
      ctx.lineTo(118, 56);
      ctx.moveTo(110, 70);
      ctx.lineTo(122, 60);
      ctx.stroke();
      ctx.fillStyle = '#2e2620';
      ctx.fillRect(46, 70, 8, 8);
      ctx.fillRect(70, 70, 8, 8); // windows = eyes
      ctx.beginPath();
      ctx.arc(62, 88, 8, 0, Math.PI); // smile
      ctx.stroke();
    });
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: drawing }));
    pic.position.set(0.22, 4.2, D * 0.35);
    pic.rotation.y = Math.PI / 2;
    pic.rotation.z = -0.06;
    const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.18), new THREE.MeshBasicMaterial({ color: 0xfff8e0, transparent: true, opacity: 0.7 }));
    tape.position.set(0.21, 4.95, D * 0.35);
    tape.rotation.y = Math.PI / 2;
    g.add(pic, tape);
  }

  g.add(buildThemeDecor(W, D, TP, theme));
  return g;
}

/** Theme-specific charm props — kept lightweight (few merged/shared-material meshes each). */
function buildThemeDecor(W: number, D: number, TP: ThemePalette, theme: RoomTheme): THREE.Group {
  const g = new THREE.Group();

  switch (theme) {
    case 'living': {
      // rug
      const rug = new THREE.Mesh(new THREE.CircleGeometry(2.2, 24), toonMat(PAL.cherry));
      rug.rotation.x = -Math.PI / 2;
      rug.position.set(W * 0.35, 0.02, D * 0.4);
      g.add(rug);

      // couch silhouette against the back wall
      const couchSeat = box(3.2, 0.7, 1.1, TP.wallTrim);
      couchSeat.position.set(W * 0.28, 0.55, 0.9);
      const couchBack = box(3.2, 0.9, 0.25, TP.wallTrim);
      couchBack.position.set(W * 0.28, 1.0, 0.4);
      const armL = box(0.3, 0.8, 1.1, TP.woodDark);
      armL.position.set(W * 0.28 - 1.55, 0.7, 0.9);
      const armR = box(0.3, 0.8, 1.1, TP.woodDark);
      armR.position.set(W * 0.28 + 1.55, 0.7, 0.9);
      g.add(couchSeat, couchBack, armL, armR);

      // TV glow accent (screen + faint point light)
      const tv = box(1.6, 1.0, 0.1, 0x1a1a1e);
      tv.position.set(W * 0.75, 2.3, 0.15);
      const screen = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.82),
        new THREE.MeshBasicMaterial({ color: TP.practicalColor, toneMapped: false }),
      );
      screen.position.set(W * 0.75, 2.3, 0.21);
      const tvGlow = new THREE.PointLight(TP.practicalColor, 1.2, 3.5, 2);
      tvGlow.position.set(W * 0.75, 2.3, 0.6);
      g.add(tv, screen, tvGlow);

      // bookshelf wall
      const shelfCase = box(1.8, 3.2, 0.35, TP.woodDark);
      shelfCase.position.set(0.4, 1.6, D * 0.7);
      shelfCase.rotation.y = Math.PI / 2;
      g.add(shelfCase);
      const bookColors = [PAL.cherry, PAL.denim, PAL.mint, PAL.butter, 0x8a5a36];
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 7; i++) {
          const book = box(0.5, 0.16 + (i % 3) * 0.05, 0.14, bookColors[i % bookColors.length]);
          book.position.set(0.42, 0.5 + row * 1.0, D * 0.7 - 0.8 + i * 0.22);
          g.add(book);
        }
      }
      break;
    }
    case 'bathroom': {
      // tub rim
      const tub = box(2.4, 0.6, 1.3, TP.counterTop);
      tub.position.set(W * 0.72, 0.3, D * 0.75);
      const tubInner = box(2.0, 0.3, 0.95, 0xbfe8ec);
      tubInner.position.set(W * 0.72, 0.55, D * 0.75);
      g.add(tub, tubInner);

      // mirror sheen wall panel
      const mirror = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 2.0),
        new THREE.MeshPhysicalMaterial({ color: 0xdff4f6, metalness: 0.6, roughness: 0.15, envMapIntensity: 1.2 }),
      );
      mirror.position.set(W * 0.22, 3.4, 0.15);
      const mirrorFrame = box(1.75, 2.15, 0.08, TP.metalDark);
      mirrorFrame.position.set(W * 0.22, 3.4, 0.1);
      g.add(mirrorFrame, mirror);
      break;
    }
    case 'bedroom': {
      // warm lamp pools — the main light source in this near-dark room
      for (const [lx, lz] of [[W * 0.25, D * 0.3], [W * 0.75, D * 0.75]] as [number, number][]) {
        const base = cyl(0.22, 0.26, 0.5, TP.woodDark, 10);
        base.position.set(lx, 0.25, lz);
        const shade = cyl(0.32, 0.22, 0.4, PAL.butter, 12);
        shade.position.set(lx, 0.75, lz);
        const bulb = new THREE.PointLight(TP.practicalColor, 2.6, 5.5, 1.6);
        bulb.position.set(lx, 0.85, lz);
        g.add(base, shade, bulb);
      }
      // bed silhouette
      const bedFrame = box(2.6, 0.5, 3.4, TP.woodDark);
      bedFrame.position.set(W * 0.2, 0.25, D * 0.6);
      const mattress = box(2.3, 0.4, 3.1, 0x3a3660);
      mattress.position.set(W * 0.2, 0.65, D * 0.6);
      g.add(bedFrame, mattress);
      break;
    }
    case 'garage': {
      // workbench with hanging bulb above it
      const bench = box(2.6, 0.8, 1.0, TP.wood);
      bench.position.set(W * 0.7, 0.4, D * 0.85);
      const benchLeg1 = box(0.15, 0.8, 0.15, TP.woodDark);
      benchLeg1.position.set(W * 0.7 - 1.15, 0.4, D * 0.85 - 0.4);
      const benchLeg2 = box(0.15, 0.8, 0.15, TP.woodDark);
      benchLeg2.position.set(W * 0.7 + 1.15, 0.4, D * 0.85 - 0.4);
      g.add(bench, benchLeg1, benchLeg2);

      // hanging bulb light cone(s)
      for (const bx of [W * 0.3, W * 0.7]) {
        const cord = cyl(0.02, 0.02, 2.2, 0x2a2a2a, 6);
        cord.position.set(bx, 6.3, D * 0.4);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: TP.practicalColor }));
        bulb.position.set(bx, 5.2, D * 0.4);
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(1.4, 3.2, 16, 1, true),
          new THREE.MeshBasicMaterial({ color: TP.practicalColor, transparent: true, opacity: 0.06, depthWrite: false, side: THREE.DoubleSide }),
        );
        cone.position.set(bx, 3.6, D * 0.4);
        const bulbLight = new THREE.PointLight(TP.practicalColor, 1.8, 6, 1.8);
        bulbLight.position.set(bx, 5.2, D * 0.4);
        g.add(cord, bulb, cone, bulbLight);
      }

      // oil-stain floor decal (canvas texture on a thin plane, avoids extra draw-call-heavy geometry)
      const stainTex = canvasTexture(128, 128, (ctx) => {
        ctx.clearRect(0, 0, 128, 128);
        ctx.fillStyle = 'rgba(20,18,16,0.55)';
        ctx.beginPath();
        ctx.ellipse(64, 64, 40, 26, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(20,18,16,0.3)';
        ctx.beginPath();
        ctx.ellipse(80, 50, 18, 12, -0.3, 0, Math.PI * 2);
        ctx.fill();
      });
      const stain = new THREE.Mesh(
        new THREE.PlaneGeometry(2.2, 2.2),
        new THREE.MeshBasicMaterial({ map: stainTex, transparent: true, depthWrite: false }),
      );
      stain.rotation.x = -Math.PI / 2;
      stain.position.set(W * 0.4, 0.02, D * 0.5);
      g.add(stain);
      break;
    }
    case 'basement': {
      // bare-bulb practical, string-light style
      for (const bx of [W * 0.3, W * 0.6]) {
        const cord = cyl(0.015, 0.015, 2.8, 0x1a1a1a, 6);
        cord.position.set(bx, 6.1, D * 0.5);
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: TP.practicalColor }));
        bulb.position.set(bx, 4.7, D * 0.5);
        const bulbLight = new THREE.PointLight(TP.practicalColor, 1.6, 5, 2);
        bulbLight.position.set(bx, 4.7, D * 0.5);
        g.add(cord, bulb, bulbLight);
      }

      // stacked boxes
      const boxColors = [TP.wood, TP.woodDark, 0x8a6a45];
      for (let i = 0; i < 3; i++) {
        const b = box(0.7, 0.7, 0.7, boxColors[i % boxColors.length]);
        b.position.set(W * 0.15 + (i % 2) * 0.75, 0.35 + Math.floor(i / 2) * 0.72, D * 0.2 + Math.floor(i / 2) * 0.1);
        g.add(b);
      }

      // cobweb corners — simple alpha planes, cheap
      const webTex = canvasTexture(64, 64, (ctx) => {
        ctx.clearRect(0, 0, 64, 64);
        ctx.strokeStyle = 'rgba(220,225,220,0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos((i / 6) * Math.PI * 0.5) * 64, Math.sin((i / 6) * Math.PI * 0.5) * 64);
          ctx.stroke();
        }
        for (let r = 12; r < 64; r += 14) {
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 0.5);
          ctx.stroke();
        }
      });
      const webMat = new THREE.MeshBasicMaterial({ map: webTex, transparent: true, depthWrite: false });
      const web1 = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), webMat);
      web1.position.set(0.05, 7.0, 0.05);
      web1.rotation.y = Math.PI * 0.75;
      const web2 = web1.clone();
      web2.position.set(W - 0.05, 7.0, 0.05);
      web2.rotation.y = Math.PI * 1.25;
      g.add(web1, web2);
      break;
    }
    case 'attic': {
      // round vent window replacing the rectangular one, golden dusty shaft
      const ventRing = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.14, 10, 24), toonMat(TP.woodDark));
      ventRing.position.set(W * 0.62, 4.6, -0.15);
      const ventGlass = new THREE.Mesh(new THREE.CircleGeometry(1.05, 24), new THREE.MeshBasicMaterial({ color: TP.windowSky }));
      ventGlass.position.set(W * 0.62, 4.6, -0.05);
      const ventCross1 = box(2.1, 0.08, 0.06, TP.woodDark);
      ventCross1.position.set(W * 0.62, 4.6, 0.0);
      const ventCross2 = box(0.08, 2.1, 0.06, TP.woodDark);
      ventCross2.position.set(W * 0.62, 4.6, 0.0);
      g.add(ventRing, ventGlass, ventCross1, ventCross2);

      // wooden beams overhead (slanted roofline feel)
      for (let i = 0; i < 4; i++) {
        const beam = box(0.24, 0.24, D + 1, TP.woodDark);
        beam.position.set((i + 0.5) * (W / 4), 6.6, D / 2);
        beam.rotation.z = 0.12;
        g.add(beam);
      }
      const ridge = box(0.3, 0.3, D + 1, TP.woodDark);
      ridge.position.set(W / 2, 7.1, D / 2);
      g.add(ridge);
      break;
    }
    case 'backyard': {
      // no ceiling clock/drawing (handled above); add a garden hint — flower cluster + sunlight already via lighting rig
      const flowerColors = [PAL.cherry, PAL.butter, 0xffffff];
      for (let i = 0; i < 5; i++) {
        const stem = cyl(0.02, 0.02, 0.4, 0x4a7a34, 5);
        stem.position.set(W * 0.85 + i * 0.18, 0.2, D * 0.15);
        const bloom = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), toonMat(flowerColors[i % flowerColors.length]));
        bloom.position.set(W * 0.85 + i * 0.18, 0.42, D * 0.15);
        g.add(stem, bloom);
      }
      break;
    }
    case 'sewer': {
      // pipe shapes along the walls
      for (let i = 0; i < 3; i++) {
        const pipe = cyl(0.28, 0.28, D + 1, TP.metal, 12);
        pipe.rotation.x = Math.PI / 2;
        pipe.position.set(0.5 + i * 0.6, 1.2 + i * 0.9, D / 2);
        g.add(pipe);
      }
      // water-sheen strip away from the walkway (a low, glossy plane)
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(W * 0.4, D * 0.5),
        new THREE.MeshPhysicalMaterial({ color: 0x1c3a2c, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.85 }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.set(W * 0.68, 0.03, D * 0.55);
      g.add(water);
      break;
    }
    case 'kitchen':
    default:
      // kitchen keeps only the shared decor above (clock + crayon drawing); 'secret' reuses kitchen palette+decor.
      break;
  }

  return g;
}
