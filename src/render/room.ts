import * as THREE from 'three';
import type { LevelDef, SurfaceDef } from '../sim/types';
import { PAL } from './palette';
import { at, box, canvasTexture, cyl, rot, toonMat } from './build';

/** Builds the whole diorama environment for a level: floor, walls, furniture, light shafts, spawn props. */
export function buildRoom(level: LevelDef): THREE.Group {
  const room = new THREE.Group();
  const floor = level.surfaces[0];
  const W = floor.cols;
  const D = floor.rows;

  room.add(buildFloor(floor));
  room.add(buildWalls(W, D));
  for (let i = 1; i < level.surfaces.length; i++) {
    room.add(buildElevatedSurface(level.surfaces[i]));
  }
  for (const climb of level.climbs) {
    if (climb.from.s === 0) room.add(buildStool(level, climb.from.c, climb.from.r));
  }
  for (const spawn of level.spawns) {
    room.add(buildSpawnProp(level, spawn.kind, spawn.tile.s, spawn.tile.c, spawn.tile.r));
  }
  room.add(buildSunbeams(W, D));
  room.add(buildDecor(W, D));
  return room;
}

function buildFloor(floor: SurfaceDef): THREE.Group {
  const g = new THREE.Group();
  const tex = canvasTexture(256, 256, (ctx) => {
    const a = '#' + PAL.floorTileA.toString(16).padStart(6, '0');
    const b = '#' + PAL.floorTileB.toString(16).padStart(6, '0');
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 2; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? a : b;
        ctx.fillRect(x * 128, y * 128, 128, 128);
        // grout lines + subtle speckle
        ctx.strokeStyle = 'rgba(120,90,60,0.35)';
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

function buildWalls(W: number, D: number): THREE.Group {
  const g = new THREE.Group();
  const wallH = 7.5;
  const wallMat = toonMat(PAL.wallCream);
  const trimMat = toonMat(PAL.wallTrim);

  // back wall (north, z=0) and left wall (west, x=0) — diorama style, two walls only
  const back = new THREE.Mesh(new THREE.BoxGeometry(W + 1, wallH, 0.4), wallMat);
  back.position.set(W / 2, wallH / 2, -0.2);
  back.receiveShadow = true;
  const left = new THREE.Mesh(new THREE.BoxGeometry(0.4, wallH, D + 1), wallMat);
  left.position.set(-0.2, wallH / 2, D / 2);
  left.receiveShadow = true;
  g.add(back, left);

  // baseboards
  const bb1 = new THREE.Mesh(new THREE.BoxGeometry(W + 1, 0.5, 0.18), trimMat);
  bb1.position.set(W / 2, 0.25, 0.1);
  const bb2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.5, D + 1), trimMat);
  bb2.position.set(0.1, 0.25, D / 2);
  g.add(bb1, bb2);

  // window on the back wall with sky
  const winW = Math.min(5, W * 0.4);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(winW + 0.5, 4, 0.5), toonMat(0xffffff));
  frame.position.set(W * 0.62, 4.4, -0.18);
  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(winW, 3.4),
    new THREE.MeshBasicMaterial({ color: PAL.windowSky }),
  );
  sky.position.set(W * 0.62, 4.4, 0.13);
  const bar1 = new THREE.Mesh(new THREE.BoxGeometry(winW, 0.12, 0.1), toonMat(0xffffff));
  bar1.position.set(W * 0.62, 4.4, 0.16);
  const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 3.4, 0.1), toonMat(0xffffff));
  bar2.position.set(W * 0.62, 4.4, 0.16);
  g.add(frame, sky, bar1, bar2);

  // curtains
  const curtain = toonMat(PAL.cherry);
  for (const side of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.5, 4.2, 0.3), curtain);
    c.position.set(W * 0.62 + side * (winW / 2 + 0.45), 4.5, 0.05);
    g.add(c);
  }
  return g;
}

function buildElevatedSurface(surf: SurfaceDef): THREE.Group {
  const g = new THREE.Group();
  const { origin, cols, rows } = surf;
  const h = origin.y;
  const cx = origin.x + cols / 2;
  const cz = origin.z + rows / 2;

  // top slab
  const topColor = surf.kind === 'stove' ? PAL.metal : surf.kind === 'shelf' ? PAL.wood : PAL.counterTop;
  const slab = box(cols, 0.35, rows, topColor);
  slab.position.set(cx, h - 0.175, cz);
  g.add(slab);

  if (surf.kind === 'shelf') {
    // bracket legs at the wall side
    for (const lx of [origin.x + 0.4, origin.x + cols - 0.4]) {
      const leg = box(0.25, h, 0.25, PAL.woodDark);
      leg.position.set(lx, h / 2, origin.z + 0.3);
      g.add(leg);
    }
  } else {
    // cabinet body under counters/stoves
    const body = box(cols - 0.3, h - 0.4, rows - 0.3, PAL.cabinet);
    body.position.set(cx, (h - 0.4) / 2, cz);
    g.add(body);
    // cabinet doors + knobs
    const doorCount = Math.max(1, Math.floor(cols / 2));
    for (let i = 0; i < doorCount; i++) {
      const dw = (cols - 0.8) / doorCount;
      const door = box(dw - 0.15, h - 1.0, 0.08, PAL.wood);
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
      const basin = box(0.95, 0.5, 0.95, PAL.metalDark);
      basin.position.set(px, h + 0.1, pz);
      g.add(basin);
    }
  }
  return g;
}

function buildStool(level: LevelDef, c: number, r: number): THREE.Group {
  const g = new THREE.Group();
  const x = level.surfaces[0].origin.x + c + 0.5;
  const z = level.surfaces[0].origin.z + r + 0.5;
  const seat = cyl(0.45, 0.4, 0.15, PAL.cherry, 12);
  seat.position.set(x, 1.1, z);
  g.add(seat);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const leg = cyl(0.06, 0.06, 1.05, PAL.woodDark, 6);
    leg.position.set(x + Math.sin(a) * 0.28, 0.52, z + Math.cos(a) * 0.28);
    leg.rotation.z = Math.sin(a) * 0.12;
    leg.rotation.x = -Math.cos(a) * 0.12;
    g.add(leg);
  }
  return g;
}

function buildSpawnProp(level: LevelDef, kind: string, s: number, c: number, r: number): THREE.Group {
  const g = new THREE.Group();
  const surf = level.surfaces[s];
  const x = surf.origin.x + c + 0.5;
  const y = surf.origin.y;
  const z = surf.origin.z + r + 0.5;

  switch (kind) {
    case 'door': {
      // a cracked-open door at the room edge
      const door = box(0.18, 4.2, 1.6, PAL.wood);
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
      const grate = box(1.1, 0.7, 0.12, PAL.metalDark);
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
      const lid = cyl(0.5, 0.5, 0.06, PAL.metalDark, 16);
      lid.position.set(x, y + 0.04, z);
      const hole = cyl(0.32, 0.32, 0.04, 0x140e08, 12);
      hole.position.set(x, y + 0.08, z);
      g.add(lid, hole);
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
  }
  return g;
}

/** Volumetric-ish sunbeams from the window + drifting dust motes. */
function buildSunbeams(W: number, D: number): THREE.Group {
  const g = new THREE.Group();
  const beamMat = new THREE.MeshBasicMaterial({
    color: PAL.sunbeam,
    transparent: true,
    opacity: 0.10,
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

  // dust motes
  const count = 90;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = W * 0.4 + Math.random() * W * 0.45;
    pos[i * 3 + 1] = 0.5 + Math.random() * 5.5;
    pos[i * 3 + 2] = 0.5 + Math.random() * (D * 0.6);
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const motes = new THREE.Points(geom, new THREE.PointsMaterial({
    color: 0xfff2d8,
    size: 0.05,
    transparent: true,
    opacity: 0.6,
    depthWrite: false,
  }));
  motes.userData.motes = true;
  g.add(motes);
  return g;
}

function buildDecor(W: number, D: number): THREE.Group {
  const g = new THREE.Group();

  // wall clock
  const face = cyl(0.55, 0.55, 0.1, 0xffffff, 20);
  face.rotation.x = Math.PI / 2;
  face.position.set(W * 0.2, 5.6, 0.12);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.07, 8, 24), toonMat(PAL.cherry));
  rim.position.copy(face.position);
  const hourHand = box(0.06, 0.3, 0.03, PAL.ink);
  hourHand.position.set(W * 0.2, 5.72, 0.2);
  const minHand = box(0.05, 0.42, 0.03, PAL.ink);
  minHand.position.set(W * 0.2, 5.6, 0.2);
  minHand.rotation.z = 1.2;
  g.add(face, rim, hourHand, minHand);

  // the kid's crayon drawing, taped to the wall — a house with a sword
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

  return g;
}
