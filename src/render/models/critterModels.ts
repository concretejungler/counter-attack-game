import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PAL } from '../palette';
import { box, colorize, cone, cyl, eyes, sphere, toonMat, toonRamp, vertexToonMat } from '../build';

/**
 * Each species = ONE merged vertex-colored geometry, drawn via ONE InstancedMesh.
 * 300 critters ≈ 14 draw calls. Eyes are baked-in geometry — googly at any distance.
 */

function part(geom: THREE.BufferGeometry, color: number, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1): THREE.BufferGeometry {
  const g = geom.clone();
  const m = new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );
  g.applyMatrix4(m);
  return colorize(g, color);
}

const SPH = new THREE.SphereGeometry(1, 9, 7);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 7);
const CONE = new THREE.ConeGeometry(1, 1, 8);
const BOX = new THREE.BoxGeometry(1, 1, 1);

function eyesGeo(spacing: number, r: number, y: number, z: number): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (const s of [-1, 1]) {
    out.push(part(SPH, 0xffffff, s * spacing, y, z, 0, 0, 0, r, r, r));
    out.push(part(SPH, 0x1a1410, s * spacing, y, z + r * 0.7, 0, 0, 0, r * 0.5, r * 0.5, r * 0.5));
  }
  return out;
}

function legsGeo(color: number, bodyR: number, count = 3): THREE.BufferGeometry[] {
  const out: THREE.BufferGeometry[] = [];
  for (let i = 0; i < count; i++) {
    const z = (i - (count - 1) / 2) * bodyR * 0.8;
    for (const s of [-1, 1]) {
      out.push(part(CYL, color, s * bodyR * 0.9, bodyR * 0.4, z, 0, 0, s * 0.9, 0.04, bodyR * 0.9, 0.04));
    }
  }
  return out;
}

function antGeo(color: number, scale: number, helmet = false, stretched = false): THREE.BufferGeometry {
  const zs = stretched ? 1.15 : 1;
  const parts = [
    part(SPH, color, 0, 0.22, -0.26 * zs, 0, 0, 0, 0.21, 0.19, 0.26 * zs),   // abdomen
    part(SPH, color, 0, 0.22, 0.0, 0, 0, 0, 0.13, 0.13, 0.14),               // thorax
    part(SPH, color, 0, 0.26, 0.19 * zs, 0, 0, 0, 0.14, 0.14, 0.14),         // head
    ...eyesGeo(0.08, 0.05, 0.31, 0.29 * zs),
    ...legsGeo(color, 0.22),
    part(CYL, color, -0.05, 0.4, 0.27 * zs, 0.6, 0, 0.3, 0.015, 0.14, 0.015), // antennae
    part(CYL, color, 0.05, 0.4, 0.27 * zs, 0.6, 0, -0.3, 0.015, 0.14, 0.015),
  ];
  if (helmet) parts.push(part(SPH, 0x3a3a40, 0, 0.33, 0.19, 0, 0, 0, 0.16, 0.12, 0.16));
  const merged = mergeGeometries(parts)!;
  merged.scale(scale, scale, scale);
  return merged;
}

function flyGeo(big: boolean): THREE.BufferGeometry {
  const s = big ? 1 : 0.55;
  const body = big ? PAL.flyBody : PAL.fruitFly;
  const parts = [
    part(SPH, body, 0, 0.3, 0, 0, 0, 0, 0.18, 0.16, 0.22),
    part(SPH, 0xa83232, -0.09, 0.38, 0.14, 0, 0, 0, 0.07, 0.07, 0.07), // big red eyes
    part(SPH, 0xa83232, 0.09, 0.38, 0.14, 0, 0, 0, 0.07, 0.07, 0.07),
    part(SPH, PAL.flyWing, -0.2, 0.42, -0.08, 0.2, 0.5, 0.4, 0.18, 0.02, 0.1), // wings
    part(SPH, PAL.flyWing, 0.2, 0.42, -0.08, 0.2, -0.5, -0.4, 0.18, 0.02, 0.1),
    ...legsGeo(body, 0.14, 2),
  ];
  const merged = mergeGeometries(parts)!;
  merged.scale(s, s, s);
  return merged;
}

function roachGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, PAL.roach, 0, 0.18, 0, 0, 0, 0, 0.3, 0.14, 0.42),               // flat oval body
    part(SPH, 0x4a2818, 0, 0.2, 0.34, 0, 0, 0, 0.13, 0.1, 0.12),              // head
    ...eyesGeo(0.07, 0.04, 0.26, 0.42),
    part(CYL, 0x4a2818, -0.06, 0.3, 0.46, 1.1, 0, 0.35, 0.012, 0.3, 0.012),   // long antennae
    part(CYL, 0x4a2818, 0.06, 0.3, 0.46, 1.1, 0, -0.35, 0.012, 0.3, 0.012),
    ...legsGeo(0x4a2818, 0.3),
  ])!;
}

function mouseGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, PAL.mouse, 0, 0.3, 0, 0, 0, 0, 0.3, 0.28, 0.4),                  // egg body
    part(SPH, PAL.mouse, 0, 0.38, 0.36, 0, 0, 0, 0.18, 0.17, 0.2),             // head
    part(CONE, PAL.mousePink, 0, 0.34, 0.56, 1.57, 0, 0, 0.05, 0.12, 0.05),    // snout
    part(SPH, PAL.mouse, -0.14, 0.58, 0.3, 0, 0, 0, 0.11, 0.12, 0.03),         // ears
    part(SPH, PAL.mouse, 0.14, 0.58, 0.3, 0, 0, 0, 0.11, 0.12, 0.03),
    part(SPH, PAL.mousePink, -0.14, 0.58, 0.32, 0, 0, 0, 0.07, 0.08, 0.02),
    part(SPH, PAL.mousePink, 0.14, 0.58, 0.32, 0, 0, 0, 0.07, 0.08, 0.02),
    ...eyesGeo(0.09, 0.05, 0.45, 0.48),
    part(CYL, PAL.mousePink, 0, 0.22, -0.45, 1.2, 0, 0, 0.03, 0.35, 0.03),     // tail
    part(CYL, PAL.mousePink, 0, 0.14, -0.66, 1.9, 0, 0, 0.025, 0.25, 0.025),
  ])!;
}

function slugGeo(shell: boolean): THREE.BufferGeometry {
  const parts = [
    part(SPH, PAL.slug, 0, 0.16, -0.08, 0, 0, 0, 0.2, 0.16, 0.34),            // body
    part(SPH, PAL.slug, 0, 0.2, 0.22, 0, 0, 0, 0.14, 0.13, 0.16),             // front
    part(CYL, PAL.slug, -0.06, 0.4, 0.28, 0.25, 0, 0.15, 0.02, 0.18, 0.02),   // eye stalks
    part(CYL, PAL.slug, 0.06, 0.4, 0.28, 0.25, 0, -0.15, 0.02, 0.18, 0.02),
    part(SPH, 0xffffff, -0.09, 0.5, 0.31, 0, 0, 0, 0.045, 0.045, 0.045),
    part(SPH, 0xffffff, 0.09, 0.5, 0.31, 0, 0, 0, 0.045, 0.045, 0.045),
    part(SPH, 0x1a1410, -0.09, 0.5, 0.34, 0, 0, 0, 0.022, 0.022, 0.022),
    part(SPH, 0x1a1410, 0.09, 0.5, 0.34, 0, 0, 0, 0.022, 0.022, 0.022),
  ];
  if (shell) {
    parts.push(part(SPH, PAL.snailShell, 0, 0.38, -0.12, 0, 0, 0.3, 0.22, 0.22, 0.22));
    parts.push(part(new THREE.TorusGeometry(0.13, 0.05, 6, 12), 0x6e4426, 0, 0.38, -0.12, 0, 1.57, 0, 1, 1, 1));
  }
  return mergeGeometries(parts)!;
}

function mothGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, 0x9a8a70, 0, 0.3, 0, 0, 0, 0, 0.1, 0.1, 0.2),                  // fuzzy body
    ...eyesGeo(0.06, 0.04, 0.36, 0.16),
    part(SPH, PAL.moth, -0.24, 0.34, 0.02, 0.1, 0.25, 0.15, 0.26, 0.02, 0.18), // big wings
    part(SPH, PAL.moth, 0.24, 0.34, 0.02, 0.1, -0.25, -0.15, 0.26, 0.02, 0.18),
    part(SPH, 0xb8a88a, -0.16, 0.3, -0.14, 0.1, 0.4, 0.1, 0.14, 0.015, 0.12),  // hind wings
    part(SPH, 0xb8a88a, 0.16, 0.3, -0.14, 0.1, -0.4, -0.1, 0.14, 0.015, 0.12),
    part(SPH, 0x6e5a3c, -0.24, 0.345, 0.02, 0, 0.25, 0, 0.08, 0.025, 0.06),    // wing spots
    part(SPH, 0x6e5a3c, 0.24, 0.345, 0.02, 0, -0.25, 0, 0.08, 0.025, 0.06),
  ])!;
}

function dustBunnyGeo(small: boolean): THREE.BufferGeometry {
  const s = small ? 0.55 : 1;
  const parts = [
    part(SPH, PAL.dustBunny, 0, 0.3, 0, 0, 0, 0, 0.3, 0.28, 0.3),
    part(SPH, 0xa8a29c, -0.18, 0.42, 0.08, 0, 0, 0, 0.16, 0.15, 0.16),
    part(SPH, 0xc8c2bc, 0.16, 0.2, 0.14, 0, 0, 0, 0.17, 0.16, 0.17),
    part(SPH, 0xa8a29c, 0.06, 0.46, -0.12, 0, 0, 0, 0.14, 0.13, 0.14),
    ...eyesGeo(0.13, 0.085, 0.34, 0.26), // comically big eyes
  ];
  const merged = mergeGeometries(parts)!;
  merged.scale(s, s, s);
  return merged;
}

function stinkbugGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(CONE, PAL.stinkbug, 0, 0.2, -0.04, 0, 0.785, 3.14159, 0.34, 0.16, 0.4), // shield body (inverted cone, diamond rotated)
    part(SPH, 0x4a5e2e, 0, 0.24, 0.28, 0, 0, 0, 0.11, 0.09, 0.1),
    ...eyesGeo(0.06, 0.04, 0.3, 0.36),
    ...legsGeo(0x3c4a26, 0.26),
    part(SPH, 0x76914c, 0, 0.3, -0.05, 0, 0, 0, 0.18, 0.05, 0.26), // shell sheen plate
  ])!;
}

// ---------------------------------------------------------------------------
// Phase 2 species geometry
// ---------------------------------------------------------------------------

const FIRE_ANT = 0xe8481c;
const CARPENTER_ANT = 0x2a1c14;
const TERMITE_PALE = 0xe8dcc0;
const MAGGOT_PALE = 0xf2e8d4;
const ROACH_WING = 0x4a2818;
const ROACH_NUKE = 0x3fdc5a;
const POSSUM_FUR = 0xd8d0c4;
const BEDBUG_PURPLE = 0x5c3a5c;
const CRICKET_BODY = 0x8fae4a;
const CENTIPEDE_BODY = 0xc03a3a;
const BEETLE_SHELL = 0x2a4a8a;
const RAT_FUR = 0x8a7a6a;
const BOTTLECAP = 0xc83a3a;
const PILLBUG_GREY = 0x7a8078;
const EARWIG_BODY = 0x3a2818;
const TICK_BODY = 0x6a1414;
const SILVERFISH_BODY = 0xc8d0d8;
const MOSQUITO_BODY = 0x4a4a52;
const WASP_YELLOW = 0xf0c020;
const WASP_BLACK = 0x1c1810;
const HORNET_BODY = 0xd89c1c;
const PIGEON_GREY = 0x8a92a0;
const SNAIL_SHAMAN_SHELL = 0x7a5a9a;

/** Fire/carpenter/termite share the ant chassis via antGeo(); just new colors/scales, already covered by GEO_BUILDERS below. */

function maggotGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, MAGGOT_PALE, 0, 0.14, -0.1, 0, 0, 0, 0.14, 0.12, 0.24),   // segmented pale body
    part(SPH, MAGGOT_PALE, 0, 0.15, 0.08, 0, 0, 0, 0.15, 0.13, 0.15),
    part(SPH, MAGGOT_PALE, 0, 0.14, 0.24, 0, 0, 0, 0.1, 0.09, 0.1),     // pinched head
    part(SPH, 0x2a1c14, -0.045, 0.17, 0.31, 0, 0, 0, 0.018, 0.018, 0.018), // tiny dot eyes
    part(SPH, 0x2a1c14, 0.045, 0.17, 0.31, 0, 0, 0, 0.018, 0.018, 0.018),
  ])!;
}

function bedbugGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, BEDBUG_PURPLE, 0, 0.09, 0, 0, 0, 0, 0.26, 0.07, 0.32),    // flat oval body
    part(SPH, 0x4a2c4a, 0, 0.1, 0.24, 0, 0, 0, 0.1, 0.06, 0.09),        // head
    ...eyesGeo(0.055, 0.028, 0.13, 0.28),
    ...legsGeo(0x3a2242, 0.2, 3),
  ])!;
}

function cricketBardGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, CRICKET_BODY, 0, 0.22, -0.16, 0, 0, 0, 0.16, 0.16, 0.24),   // body
    part(SPH, CRICKET_BODY, 0, 0.25, 0.14, 0, 0, 0, 0.12, 0.12, 0.13),    // head
    ...eyesGeo(0.07, 0.045, 0.3, 0.22),
    part(CYL, 0x5c7a2e, -0.16, 0.14, -0.32, 1.1, 0, 0.5, 0.03, 0.34, 0.03), // big jump legs
    part(CYL, 0x5c7a2e, 0.16, 0.14, -0.32, 1.1, 0, -0.5, 0.03, 0.34, 0.03),
    ...legsGeo(CRICKET_BODY, 0.18, 2),
    part(CYL, 0x3a4a1e, -0.04, 0.42, 0.2, 0.5, 0, 0.25, 0.012, 0.16, 0.012), // antennae
    part(CYL, 0x3a4a1e, 0.04, 0.42, 0.2, 0.5, 0, -0.25, 0.012, 0.16, 0.012),
    // tiny lute on its back
    part(SPH, 0x8a5a2c, 0, 0.34, -0.14, 0, 0, 0, 0.1, 0.13, 0.04),
    part(CYL, 0xc89858, 0, 0.4, -0.28, 1.4, 0, 0, 0.012, 0.14, 0.012),
  ])!;
}

/** One centipede segment (reused to build trains of varying length). */
function centipedeSeg(color: number, z: number, r: number): THREE.BufferGeometry[] {
  return [
    part(SPH, color, 0, 0.16, z, 0, 0, 0, r, r * 0.85, r * 0.9),
    part(CYL, 0x2a1c14, -r * 0.9, r * 0.55, z, 0, 0, 1.1, 0.02, r * 0.75, 0.02),
    part(CYL, 0x2a1c14, r * 0.9, r * 0.55, z, 0, 0, -1.1, 0.02, r * 0.75, 0.02),
  ];
}

function centipedeGeo(segments: number, scale: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const spacing = 0.16;
  const total = (segments - 1) * spacing;
  for (let i = 0; i < segments; i++) {
    const z = -total / 2 + i * spacing;
    parts.push(...centipedeSeg(i === segments - 1 ? 0xd85a3a : CENTIPEDE_BODY, z, 0.11));
  }
  // head + antennae + eyes at the front-most segment
  const headZ = total / 2 + 0.06;
  parts.push(part(SPH, 0xd85a3a, 0, 0.17, headZ, 0, 0, 0, 0.09, 0.08, 0.09));
  parts.push(...eyesGeo(0.05, 0.03, 0.2, headZ + 0.02));
  parts.push(part(CYL, 0x2a1c14, -0.03, 0.28, headZ + 0.06, 0.7, 0, 0.3, 0.012, 0.16, 0.012));
  parts.push(part(CYL, 0x2a1c14, 0.03, 0.28, headZ + 0.06, 0.7, 0, -0.3, 0.012, 0.16, 0.012));
  const merged = mergeGeometries(parts)!;
  merged.scale(scale, scale, scale);
  return merged;
}

function beetleGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, BEETLE_SHELL, 0, 0.24, 0, 0, 0, 0, 0.32, 0.24, 0.42),        // domed tank shell
    part(CYL, 0x1c2c54, 0, 0.24, 0, 1.57, 0, 0, 0.012, 0.42, 0.012),       // shell seam
    part(SPH, 0x1c2c54, 0, 0.22, 0.36, 0, 0, 0, 0.15, 0.13, 0.14),         // head
    ...eyesGeo(0.075, 0.045, 0.28, 0.42),
    part(CYL, 0x1c2c54, -0.06, 0.42, 0.44, 0.8, 0, 0.3, 0.015, 0.14, 0.015), // mandibles
    part(CYL, 0x1c2c54, 0.06, 0.42, 0.44, 0.8, 0, -0.3, 0.015, 0.14, 0.015),
    ...legsGeo(0x1c2c54, 0.3),
  ])!;
}

function pillbugGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 5; i++) {
    const z = (i - 2) * 0.1;
    const r = 0.22 - Math.abs(i - 2) * 0.02;
    parts.push(part(SPH, i % 2 === 0 ? PILLBUG_GREY : 0x666e68, 0, 0.2, z, 0, 0, 0, r, 0.19, 0.11));
  }
  parts.push(...eyesGeo(0.06, 0.03, 0.18, -0.24));
  parts.push(...legsGeo(0x555a54, 0.2, 4));
  return mergeGeometries(parts)!;
}

function earwigGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, EARWIG_BODY, 0, 0.16, -0.1, 0, 0, 0, 0.14, 0.1, 0.32),      // long slim body
    part(SPH, EARWIG_BODY, 0, 0.18, 0.2, 0, 0, 0, 0.1, 0.09, 0.12),       // head
    ...eyesGeo(0.055, 0.03, 0.24, 0.26),
    ...legsGeo(0x241408, 0.2),
    // pincers (cerci)
    part(CYL, 0x1c1008, -0.05, 0.16, -0.38, 1.6, 0, 0.5, 0.018, 0.16, 0.018),
    part(CYL, 0x1c1008, 0.05, 0.16, -0.38, 1.6, 0, -0.5, 0.018, 0.16, 0.018),
    part(CYL, 0x1c1008, -0.04, 0.42, 0.3, 0.6, 0, 0.3, 0.01, 0.14, 0.01), // antennae
    part(CYL, 0x1c1008, 0.04, 0.42, 0.3, 0.6, 0, -0.3, 0.01, 0.14, 0.01),
  ])!;
}

function tickGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, TICK_BODY, 0, 0.16, 0, 0, 0, 0, 0.16, 0.15, 0.17),  // tiny round latcher
    ...eyesGeo(0.05, 0.025, 0.22, 0.13),
    ...legsGeo(0x3a0a0a, 0.15, 3),
  ])!;
}

function silverfishGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, SILVERFISH_BODY, 0, 0.14, -0.05, 0, 0, 0, 0.1, 0.09, 0.34), // sleek teardrop
    part(SPH, SILVERFISH_BODY, 0, 0.14, 0.24, 0, 0, 0, 0.06, 0.06, 0.1),
    ...eyesGeo(0.04, 0.022, 0.19, 0.28),
    ...legsGeo(0xa8b0b8, 0.14, 3),
    // three tail bristles
    part(CYL, 0xd8e0e6, -0.05, 0.12, -0.42, 1.5, 0, 0.15, 0.008, 0.2, 0.008),
    part(CYL, 0xd8e0e6, 0, 0.12, -0.45, 1.57, 0, 0, 0.008, 0.22, 0.008),
    part(CYL, 0xd8e0e6, 0.05, 0.12, -0.42, 1.5, 0, -0.15, 0.008, 0.2, 0.008),
    part(CYL, 0xa8b0b8, -0.03, 0.4, 0.32, 0.5, 0, 0.2, 0.008, 0.14, 0.008), // antennae
    part(CYL, 0xa8b0b8, 0.03, 0.4, 0.32, 0.5, 0, -0.2, 0.008, 0.14, 0.008),
  ])!;
}

function mosquitoGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, MOSQUITO_BODY, 0, 0.3, 0, 0, 0, 0, 0.06, 0.06, 0.22),        // thin body
    part(CYL, 0x2c2c32, 0, 0.29, 0.32, 1.57, 0, 0, 0.012, 0.24, 0.012),    // long proboscis
    ...eyesGeo(0.04, 0.03, 0.34, 0.1),
    part(SPH, 0xcfe3ee, -0.14, 0.35, -0.02, 0.15, 0.4, 0.3, 0.16, 0.012, 0.08), // thin wings
    part(SPH, 0xcfe3ee, 0.14, 0.35, -0.02, 0.15, -0.4, -0.3, 0.16, 0.012, 0.08),
    ...legsGeo(0x38383e, 0.1, 3),
  ])!;
}

function waspGeo(hornet: boolean): THREE.BufferGeometry {
  const s = hornet ? 1.25 : 1;
  const bodyColor = hornet ? HORNET_BODY : WASP_YELLOW;
  const parts = [
    part(SPH, WASP_BLACK, 0, 0.3, -0.2, 0, 0, 0, 0.13, 0.12, 0.2),          // striped abdomen (black base)
    part(SPH, bodyColor, 0, 0.3, -0.12, 0, 0, 0, 0.135, 0.125, 0.1),        // yellow stripe band
    part(SPH, WASP_BLACK, 0, 0.31, 0.02, 0, 0, 0, 0.11, 0.1, 0.09),         // thorax
    part(SPH, bodyColor, 0, 0.32, 0.18, 0, 0, 0, 0.1, 0.1, 0.11),           // head
    ...eyesGeo(0.06, 0.04, 0.37, 0.2),
    part(SPH, 0xe8eef2, -0.2, 0.4, -0.02, 0.1, 0.35, 0.2, 0.2, 0.015, 0.12), // wings
    part(SPH, 0xe8eef2, 0.2, 0.4, -0.02, 0.1, -0.35, -0.2, 0.2, 0.015, 0.12),
    part(CYL, WASP_BLACK, 0, 0.24, -0.36, 1.57, 0, 0, 0.02, 0.06, 0.02),    // stinger
    ...legsGeo(WASP_BLACK, 0.16, 2),
  ];
  if (!hornet) {
    // tiny scarf for the Baron
    parts.push(part(CYL, 0xc83a4a, 0, 0.3, 0.06, 1.57, 0, 0, 0.09, 0.05, 0.09));
    parts.push(part(BOX, 0xc83a4a, 0.08, 0.2, 0.02, 0.3, 0, 0.2, 0.04, 0.12, 0.02));
  }
  const merged = mergeGeometries(parts)!;
  merged.scale(s, s, s);
  return merged;
}

function pigeonGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, PIGEON_GREY, 0, 0.36, 0, 0, 0, 0, 0.32, 0.3, 0.44),          // chunky body
    part(SPH, 0x6a7280, 0, 0.5, 0.34, 0, 0, 0, 0.18, 0.17, 0.2),           // head
    part(CONE, 0xe89c2c, 0, 0.46, 0.56, 1.35, 0, 0, 0.05, 0.14, 0.05),     // beak
    ...eyesGeo(0.11, 0.055, 0.55, 0.42),
    part(SPH, 0xcfe3ee, -0.3, 0.36, -0.05, 0.1, 0.3, 0.15, 0.28, 0.05, 0.3), // wings
    part(SPH, 0xcfe3ee, 0.3, 0.36, -0.05, 0.1, -0.3, -0.15, 0.28, 0.05, 0.3),
    part(CYL, 0xe85a3a, -0.1, 0.06, 0.1, 0, 0, 0, 0.02, 0.24, 0.02),       // legs
    part(CYL, 0xe85a3a, 0.1, 0.06, 0.1, 0, 0, 0, 0.02, 0.24, 0.02),
  ])!;
}

function roachWingedGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, 0x7a4228, 0, 0.18, 0, 0, 0, 0, 0.3, 0.14, 0.42),               // flat oval body
    part(SPH, 0x4a2818, 0, 0.2, 0.34, 0, 0, 0, 0.13, 0.1, 0.12),              // head
    ...eyesGeo(0.07, 0.04, 0.26, 0.42),
    part(CYL, 0x4a2818, -0.06, 0.3, 0.46, 1.1, 0, 0.35, 0.012, 0.3, 0.012),   // long antennae
    part(CYL, 0x4a2818, 0.06, 0.3, 0.46, 1.1, 0, -0.35, 0.012, 0.3, 0.012),
    ...legsGeo(0x4a2818, 0.3),
    // wing cases — the villain cape
    part(SPH, 0x5c3018, -0.16, 0.28, -0.06, 0.1, 0.15, 0.1, 0.14, 0.03, 0.3),
    part(SPH, 0x5c3018, 0.16, 0.28, -0.06, 0.1, -0.15, -0.1, 0.14, 0.03, 0.3),
  ])!;
}

function roachNuclearGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, ROACH_NUKE, 0, 0.2, 0, 0, 0, 0, 0.36, 0.17, 0.5),              // bigger glowing oval body
    part(SPH, 0x1c5a28, 0, 0.23, 0.4, 0, 0, 0, 0.15, 0.12, 0.14),            // head
    ...eyesGeo(0.08, 0.045, 0.3, 0.5),
    part(CYL, 0x1c5a28, -0.07, 0.34, 0.54, 1.1, 0, 0.35, 0.014, 0.34, 0.014), // long antennae
    part(CYL, 0x1c5a28, 0.07, 0.34, 0.54, 1.1, 0, -0.35, 0.014, 0.34, 0.014),
    ...legsGeo(0x1c5a28, 0.35),
    part(SPH, 0x9dffb0, 0, 0.22, -0.05, 0, 0, 0, 0.2, 0.06, 0.3),            // radioactive sheen stripe
  ])!;
}

function possumJrGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, POSSUM_FUR, 0, 0.24, 0, 0, 0, 0, 0.24, 0.22, 0.32),           // small round body
    part(SPH, 0xe8e0d4, 0, 0.3, 0.3, 0, 0, 0, 0.15, 0.14, 0.16),            // head
    part(CONE, 0xd88898, 0, 0.26, 0.46, 1.57, 0, 0, 0.045, 0.12, 0.045),    // pink pointy snout
    part(SPH, 0x3a3028, -0.12, 0.44, 0.26, 0, 0, 0, 0.08, 0.1, 0.02),       // ears
    part(SPH, 0x3a3028, 0.12, 0.44, 0.26, 0, 0, 0, 0.08, 0.1, 0.02),
    ...eyesGeo(0.08, 0.042, 0.36, 0.4),
    // curled prehensile tail
    part(CYL, 0xd8a898, 0, 0.18, -0.3, 1.1, 0, 0, 0.025, 0.22, 0.025),
    part(CYL, 0xd8a898, -0.08, 0.08, -0.44, 2.1, 0, 0, 0.02, 0.16, 0.02),
    part(SPH, 0xd8a898, -0.14, 0.05, -0.38, 0, 0, 0, 0.05, 0.05, 0.05),
    ...legsGeo(POSSUM_FUR, 0.22),
  ])!;
}

function ratKnightGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, RAT_FUR, 0, 0.3, 0, 0, 0, 0, 0.3, 0.28, 0.4),                  // egg body
    part(SPH, RAT_FUR, 0, 0.38, 0.36, 0, 0, 0, 0.18, 0.17, 0.2),             // head
    part(CONE, PAL.mousePink, 0, 0.34, 0.56, 1.57, 0, 0, 0.05, 0.12, 0.05),  // snout
    part(SPH, RAT_FUR, -0.14, 0.58, 0.3, 0, 0, 0, 0.11, 0.12, 0.03),         // ears
    part(SPH, RAT_FUR, 0.14, 0.58, 0.3, 0, 0, 0, 0.11, 0.12, 0.03),
    ...eyesGeo(0.09, 0.05, 0.45, 0.48),
    part(CYL, PAL.mousePink, 0, 0.22, -0.45, 1.2, 0, 0, 0.03, 0.35, 0.03),   // tail
    // bottle-cap shield
    part(CYL, BOTTLECAP, -0.32, 0.06, 0.02, 0, 0, 1.57, 0.22, 0.05, 0.22),
    part(SPH, 0xe8e8ee, -0.32, 0.06, 0.02, 0, 0, 0, 0.06, 0.03, 0.06),
    // tiny toothpick lance
    part(CYL, 0xc89858, 0.1, 0.4, 0.5, 1.57, 0, 0, 0.012, 0.32, 0.012),
  ])!;
}

function snailShamanGeo(): THREE.BufferGeometry {
  return mergeGeometries([
    part(SPH, PAL.slug, 0, 0.16, -0.08, 0, 0, 0, 0.22, 0.18, 0.36),          // body (bigger — shaman)
    part(SPH, PAL.slug, 0, 0.2, 0.24, 0, 0, 0, 0.15, 0.14, 0.17),            // front
    part(CYL, PAL.slug, -0.07, 0.42, 0.3, 0.25, 0, 0.15, 0.02, 0.2, 0.02),   // eye stalks
    part(CYL, PAL.slug, 0.07, 0.42, 0.3, 0.25, 0, -0.15, 0.02, 0.2, 0.02),
    part(SPH, 0xffffff, -0.1, 0.54, 0.33, 0, 0, 0, 0.05, 0.05, 0.05),
    part(SPH, 0xffffff, 0.1, 0.54, 0.33, 0, 0, 0, 0.05, 0.05, 0.05),
    part(SPH, 0x1a1410, -0.1, 0.54, 0.36, 0, 0, 0, 0.024, 0.024, 0.024),
    part(SPH, 0x1a1410, 0.1, 0.54, 0.36, 0, 0, 0, 0.024, 0.024, 0.024),
    // painted shell with markings + tiny conical hat
    part(SPH, SNAIL_SHAMAN_SHELL, 0, 0.42, -0.13, 0, 0, 0.3, 0.26, 0.26, 0.26),
    part(new THREE.TorusGeometry(0.15, 0.055, 6, 12), 0xffd97a, 0, 0.42, -0.13, 0, 1.57, 0, 1, 1, 1),
    part(SPH, 0xffd97a, 0.04, 0.5, -0.06, 0, 0, 0, 0.05, 0.05, 0.05),         // shell rune dot
    part(CONE, 0x6e4426, 0, 0.62, -0.14, 0, 0, 0, 0.1, 0.16, 0.1),            // tiny hat
    // little staff held out front
    part(CYL, 0x8a5a2c, 0.18, 0.3, 0.2, 0, 0, 0.3, 0.014, 0.3, 0.014),
    part(SPH, 0x7dcf5a, 0.18, 0.46, 0.24, 0, 0, 0, 0.045, 0.045, 0.045),
  ])!;
}

/** GEO_BUILDERS below reuse antGeo/mouseGeo/slugGeo with new colors for fire ant, carpenter ant, termite. */

/** Species id → merged geometry factory. Bosses are NOT here (they get rich Group views). */
const GEO_BUILDERS: Record<string, () => THREE.BufferGeometry> = {
  'ant-worker': () => antGeo(PAL.antWorker, 1),
  'ant-soldier': () => antGeo(PAL.antSoldier, 1.3, true),
  'ant-bullet': () => antGeo(PAL.antBullet, 0.9, false, true),
  'fly-house': () => flyGeo(true),
  'fly-fruit': () => flyGeo(false),
  'roach': () => roachGeo(),
  'mouse-thief': () => mouseGeo(),
  'slug': () => slugGeo(false),
  'snail': () => slugGeo(true),
  'moth': () => mothGeo(),
  'dust-bunny': () => dustBunnyGeo(false),
  'dust-bunnette': () => dustBunnyGeo(true),
  'stinkbug': () => stinkbugGeo(),

  // Phase 2 species
  'ant-fire': () => antGeo(FIRE_ANT, 1.05),
  'ant-carpenter': () => antGeo(CARPENTER_ANT, 1.4, true),
  'termite': () => antGeo(TERMITE_PALE, 1.15),
  'maggot': () => maggotGeo(),
  'roach-winged': () => roachWingedGeo(),
  'roach-nuclear': () => roachNuclearGeo(),
  'possum-jr': () => possumJrGeo(),
  'bedbug': () => bedbugGeo(),
  'cricket-bard': () => cricketBardGeo(),
  'centipede': () => centipedeGeo(9, 1.05),
  'centipede-half': () => centipedeGeo(5, 1),
  'centipede-bit': () => centipedeGeo(3, 0.95),
  'beetle': () => beetleGeo(),
  'rat-knight': () => ratKnightGeo(),
  'pillbug': () => pillbugGeo(),
  'earwig': () => earwigGeo(),
  'tick': () => tickGeo(),
  'silverfish': () => silverfishGeo(),
  'mosquito': () => mosquitoGeo(),
  'wasp-baron': () => waspGeo(false),
  'hornet': () => waspGeo(true),
  'pigeon': () => pigeonGeo(),
  'snail-shaman': () => snailShamanGeo(),

  // test fixtures render as ants so the demo tools work with any content
  'test-ant': () => antGeo(PAL.antWorker, 1),
};

// ---------------------------------------------------------------------------
// Bosses — bespoke, non-instanced Group views (same contract as buildCrumbKing
// in towerModels.ts). One tick per boss on screen is cheap; readability matters more.
// ---------------------------------------------------------------------------

export interface BossView {
  group: THREE.Group;
  animate(dt: number, time: number): void;
}

function buildMoadb(): BossView {
  const group = new THREE.Group();
  const core = sphere(0.95, 0xb8b2ac, 12);
  core.position.y = 1.0;
  const fluffs: THREE.Mesh[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const r = 0.7 + (i % 3) * 0.14;
    const tuft = sphere(0.28 + (i % 3) * 0.08, i % 2 === 0 ? 0xa8a29c : 0xc8c2bc, 7);
    tuft.position.set(Math.sin(a) * r, 1.0 + Math.cos(a * 1.6) * 0.5, Math.cos(a) * r);
    fluffs.push(tuft);
    group.add(tuft);
  }
  // eyes buried deep inside the fluff — a dark socket recess with glints
  const socketL = sphere(0.16, 0x1a1614, 8);
  socketL.position.set(-0.32, 1.05, 0.75);
  const socketR = sphere(0.16, 0x1a1614, 8);
  socketR.position.set(0.32, 1.05, 0.75);
  const pupilL = sphere(0.06, 0xffffff, 6);
  pupilL.position.set(-0.32, 1.05, 0.86);
  const pupilR = sphere(0.06, 0xffffff, 6);
  pupilR.position.set(0.32, 1.05, 0.86);
  group.add(core, socketL, socketR, pupilL, pupilR);
  return {
    group,
    animate: (dt, time) => {
      void dt;
      const wobble = 1 + Math.sin(time * 2.2) * 0.03;
      group.scale.set(wobble, 1 / wobble, wobble);
      fluffs.forEach((f, i) => { f.position.y += Math.sin(time * 2.5 + i) * 0.001; });
      pupilL.position.z = 0.82 + Math.sin(time * 3) * 0.03;
      pupilR.position.z = 0.82 + Math.cos(time * 2.6) * 0.03;
    },
  };
}

function buildSirClogsworth(): BossView {
  const group = new THREE.Group();
  // a proper drain-snake S-curve: segments wind side-to-side along a mostly-
  // horizontal body (reads as a snake, not a totem pole) with hair-clump texture.
  const segCount = 9;
  const segBaseX: number[] = [];
  const segBaseZ: number[] = [];
  const segs: THREE.Mesh[] = [];
  for (let i = 0; i < segCount; i++) {
    const t = i / (segCount - 1);
    const r = 0.3 * (1 - t * 0.5);
    const bx = -1.5 + t * 3.0;
    const bz = Math.sin(t * Math.PI * 1.6) * 0.55;
    segBaseX.push(bx);
    segBaseZ.push(bz);
    const seg = sphere(r, i % 2 === 0 ? 0xe8e2d8 : 0xd8d0c0, 8);
    seg.position.set(bx, 0.35 + Math.sin(t * 5) * 0.05, bz);
    segs.push(seg);
    group.add(seg);
  }
  // hair-clump tufts poking off the body for a soap-hair read
  for (let i = 0; i < segCount; i += 2) {
    const tuft = sphere(0.09, 0xf2eee2, 6);
    tuft.position.set(segBaseX[i] + 0.1, 0.55, segBaseZ[i] + 0.1);
    group.add(tuft);
  }
  const head = sphere(0.34, 0xf0ead8, 10);
  head.position.set(1.5, 0.4, segBaseZ[segCount - 1]);
  const face = eyes(0.19, 0.07);
  face.position.set(1.78, 0.44, segBaseZ[segCount - 1]);
  const mouth = box(0.06, 0.05, 0.22, 0x4a3a30);
  mouth.position.set(1.84, 0.28, segBaseZ[segCount - 1]);
  const bubbles: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + (i % 3) * 0.02, 8, 6), new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.5 }));
    b.position.set(1.9 + Math.sin(i * 2) * 0.15, 0.5 + i * 0.22, segBaseZ[segCount - 1] + Math.cos(i * 1.5) * 0.15);
    bubbles.push(b);
    group.add(b);
  }
  group.add(head, face, mouth);
  return {
    group,
    animate: (dt, time) => {
      void dt;
      segs.forEach((s, i) => {
        const t = i / (segCount - 1);
        s.position.z = segBaseZ[i] + Math.sin(time * 2.2 - t * 4) * 0.12;
        s.position.y = 0.35 + Math.sin(time * 3 + i) * 0.03;
      });
      head.position.z = segBaseZ[segCount - 1] + Math.sin(time * 2.2 - 4) * 0.12;
      face.position.z = head.position.z;
      mouth.position.z = head.position.z;
      group.rotation.y = Math.sin(time * 0.5) * 0.08;
      bubbles.forEach((b, i) => {
        b.position.y = 0.4 + ((time * 0.5 + i * 0.3) % 1.4);
        b.scale.setScalar(1 + Math.sin(time * 3 + i) * 0.15);
      });
    },
  };
}

function buildBedbugBaron(): BossView {
  const group = new THREE.Group();
  const body = sphere(0.62, BEDBUG_PURPLE, 10);
  body.scale.set(1.1, 0.6, 1.3);
  body.position.y = 0.58;
  const head = sphere(0.34, 0x4a2c4a, 9);
  head.position.set(0, 0.64, 0.66);
  const face = eyes(0.19, 0.075);
  face.position.set(0, 0.7, 0.94);
  // monocle
  const monocleRing = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.018, 6, 16), toonMat(0xffd97a));
  monocleRing.position.set(0.11, 0.7, 0.96);
  const monocleChain = cyl(0.007, 0.007, 0.22, 0xffd97a, 4);
  monocleChain.position.set(0.24, 0.58, 0.88);
  monocleChain.rotation.z = 0.6;
  // tiny cane
  const cane = new THREE.Group();
  const caneRod = cyl(0.024, 0.024, 0.65, 0x2a1a10, 6);
  const caneHook = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.024, 6, 10, Math.PI), toonMat(0xc89858));
  caneHook.rotation.z = Math.PI / 2;
  caneHook.position.y = 0.33;
  cane.add(caneRod, caneHook);
  cane.position.set(-0.55, 0.4, 0.35);
  cane.rotation.z = 0.3;
  const legs = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const z = (i - 1) * 0.34;
    for (const s of [-1, 1]) {
      const leg = cyl(0.035, 0.035, 0.52, 0x3a2242, 6);
      leg.rotation.z = s * 0.85;
      leg.position.set(s * 0.58, 0.28, z);
      legs.add(leg);
    }
  }
  group.add(body, head, face, monocleRing, monocleChain, cane, legs);
  return {
    group,
    animate: (dt, time) => {
      void dt;
      group.position.y = Math.sin(time * 2) * 0.03;
      cane.rotation.x = Math.sin(time * 1.5) * 0.1;
      group.rotation.y = Math.sin(time * 0.8) * 0.1;
    },
  };
}

function buildRatKing(): BossView {
  const group = new THREE.Group();
  const coat = cone(0.55, 1.5, 0x3a3028, 12);
  coat.position.y = 0.85;
  const collar = cyl(0.3, 0.34, 0.14, 0x2a2420, 12);
  collar.position.y = 1.5;
  const heads: THREE.Group[] = [];
  const offsets = [-0.4, 0, 0.4];
  for (const ox of offsets) {
    const h = new THREE.Group();
    const skull = sphere(0.19, RAT_FUR, 9);
    const snout = cone(0.06, 0.16, PAL.mousePink, 7);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.2);
    const earL = sphere(0.075, RAT_FUR, 7);
    earL.position.set(-0.13, 0.15, 0.02);
    const earR = sphere(0.075, RAT_FUR, 7);
    earR.position.set(0.13, 0.15, 0.02);
    const face = eyes(0.09, 0.04);
    face.position.set(0, 0.02, 0.16);
    h.add(skull, snout, earL, earR, face);
    h.position.set(ox, 1.55, ox === 0 ? 0.1 : -0.1);
    heads.push(h);
    group.add(h);
  }
  // one small crooked crown instead of a hat wide enough to hide the heads
  const hatBrim = cyl(0.13, 0.13, 0.03, 0x1c1814, 10);
  hatBrim.position.set(0, 1.78, -0.1);
  const hatTop = cyl(0.08, 0.1, 0.13, 0x1c1814, 10);
  hatTop.position.set(0, 1.86, -0.1);
  hatTop.rotation.z = 0.15;
  const tails: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const tail = cyl(0.025, 0.04, 0.5, PAL.mousePink, 6);
    tail.position.set((i - 1) * 0.2, 0.3, -0.4);
    tail.rotation.x = 1.2;
    tails.push(tail);
    group.add(tail);
  }
  group.add(coat, collar, hatBrim, hatTop);
  return {
    group,
    animate: (dt, time) => {
      void dt;
      heads.forEach((h, i) => { h.rotation.y = Math.sin(time * 1.1 + i * 1.5) * 0.25; });
      tails.forEach((t, i) => { t.rotation.z = Math.sin(time * 2.5 + i) * 0.2; });
      group.position.y = Math.sin(time * 1.6) * 0.02;
    },
  };
}

function buildGrandmaLonglegs(): BossView {
  const group = new THREE.Group();
  const abdomen = sphere(0.42, 0x3a2c30, 10);
  abdomen.scale.set(1, 0.8, 1.05);
  abdomen.position.set(0, 0.85, -0.32);
  const cephalothorax = sphere(0.26, 0x2c2024, 9);
  cephalothorax.position.set(0, 0.85, 0.2);
  // eight long spidery legs, splayed radially so the silhouette reads instantly
  const legs: THREE.Group[] = [];
  for (let i = 0; i < 4; i++) {
    for (const s of [-1, 1]) {
      const leg = new THREE.Group();
      const spread = (i - 1.5) * 0.55; // fan front-to-back
      const thigh = cyl(0.035, 0.045, 0.6, 0x2c2024, 6);
      thigh.rotation.z = s * 1.0;
      thigh.rotation.x = spread * 0.5;
      thigh.position.set(s * 0.32, 0.05, spread * 0.12);
      const shin = cyl(0.028, 0.035, 0.55, 0x2c2024, 6);
      shin.rotation.z = s * 0.55;
      shin.rotation.x = spread * 0.5;
      shin.position.set(s * 0.72, -0.28, spread * 0.24);
      leg.add(thigh, shin);
      leg.position.set(0, 0.85, 0);
      legs.push(leg);
      group.add(leg);
    }
  }
  // granny shawl — smaller than the body so it drapes without swallowing the silhouette
  const shawl = cone(0.36, 0.34, 0x8a3c4a, 10);
  shawl.position.set(0, 0.92, -0.18);
  shawl.rotation.x = 0.15;
  const face = eyes(0.17, 0.06);
  face.position.set(0, 0.9, 0.42);
  // tiny granny glasses
  const glassL = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.013, 6, 12), toonMat(0xd0d0d0));
  glassL.position.set(-0.085, 0.9, 0.46);
  const glassR = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.013, 6, 12), toonMat(0xd0d0d0));
  glassR.position.set(0.085, 0.9, 0.46);
  const glassBridge = cyl(0.01, 0.01, 0.08, 0xd0d0d0, 4);
  glassBridge.rotation.z = Math.PI / 2;
  glassBridge.position.set(0, 0.9, 0.46);
  group.add(abdomen, cephalothorax, shawl, face, glassL, glassR, glassBridge);
  return {
    group,
    animate: (dt, time) => {
      void dt;
      legs.forEach((l, i) => { l.rotation.y = Math.sin(time * 3 + i * 0.8) * 0.1; });
      group.position.y = Math.sin(time * 2.2) * 0.025;
      shawl.rotation.z = Math.sin(time * 1.3) * 0.05;
    },
  };
}

/**
 * ARACHNOPHOBIA MODE (GAME-PROMPT §20.15 + §23 — "ship it with love"). Grandma Longlegs'
 * spider-boss model swaps for a big googly-eyed roomba: same footprint/silhouette scale as
 * buildGrandmaLonglegs (so the boss arena framing/camera bossIntro() dolly still reads right),
 * zero spider anatomy — a friendly disc chassis, a bump-sensor bumper ring, a happy dome, and
 * a pair of enormous googly eyes that wobble as it scoots. Charming, not scary, on purpose.
 */
function buildGooglyRoomba(): BossView {
  const group = new THREE.Group();
  const disc = cyl(0.5, 0.54, 0.22, 0xe8e8ee, 20);
  disc.position.y = 0.5;
  const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.52, 0.05, 8, 24), toonMat(0x3a3a42));
  bumper.rotation.x = Math.PI / 2;
  bumper.position.y = 0.5;
  const topPlate = cyl(0.46, 0.46, 0.04, 0xd0d0d8, 20);
  topPlate.position.y = 0.62;
  // face panel mounted flush on the front rim (not a small dome up top) — big, unmissable,
  // impossible to lose from any camera angle. A rounded plate the eyes and cheeks sit on.
  const facePanel = new THREE.Mesh(new THREE.CircleGeometry(0.24, 16), toonMat(0xfff2d8));
  facePanel.position.set(0, 0.5, 0.51);
  facePanel.rotation.x = -0.15; // tilt to face slightly upward/outward, not straight down
  // one enormous shared googly-eye pair — the whole point of the swap, sized to dominate the
  // face panel so it reads instantly even at gameplay zoom or an off-angle camera.
  const face = eyes(0.26, 0.115, 0.5);
  face.position.set(0, 0.56, 0.54);
  // small yellow dome up top for silhouette (roomba-shaped, not spider-shaped) — no longer
  // carries the eyes, so it can stay modest.
  const dome = sphere(0.16, 0xffd97a, 12);
  dome.scale.y = 0.55;
  dome.position.y = 0.7;
  // little brush-guard "feet" nubs so it still reads as scooting, not floating
  const nubs: THREE.Mesh[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const nub = sphere(0.05, 0x9a9aa4, 6);
    nub.position.set(Math.sin(a) * 0.5, 0.4, Math.cos(a) * 0.5);
    nubs.push(nub);
    group.add(nub);
  }
  // twin LED "cheeks" flanking the eyes, on the same face panel — a blush of personality
  const cheekMat = toonMat(0xff9ab0, { emissive: 0xff6a90 });
  const cheekL = new THREE.Mesh(new THREE.CircleGeometry(0.05, 10), cheekMat);
  cheekL.position.set(-0.18, 0.46, 0.53);
  const cheekR = cheekL.clone();
  cheekR.position.x = 0.18;
  // wobble/bump sub-group carries the local jitter animation — the renderer overwrites the
  // OUTER group's position every frame with the boss's real world position (see renderer.ts
  // syncTick: `v.bossView.group.position.copy(v.pos)` runs immediately before animate()), so
  // this inner group is the only safe place to apply a relative scoot wobble without fighting
  // that assignment (a bug caught by screenshot review: an earlier version wrote directly to
  // group.position and made the boss render near the origin instead of at its sim position).
  const wobble = new THREE.Group();
  wobble.add(disc, bumper, topPlate, dome, facePanel, face, cheekL, cheekR);
  group.add(wobble);
  return {
    group,
    animate: (dt, time) => {
      void dt;
      // scoot-and-spin like a real roomba working a room, plus a happy bob — all relative to
      // the group's real world position, which the renderer sets before calling animate().
      group.rotation.y = time * 0.7 + Math.sin(time * 2.2) * 0.35;
      wobble.position.x = Math.sin(time * 1.1) * 0.15;
      wobble.position.z = Math.cos(time * 0.8) * 0.12;
      wobble.position.y = Math.sin(time * 2.8) * 0.03;
      face.rotation.z = Math.sin(time * 3.5) * 0.06;
    },
  };
}

function buildPossumPhantom(): BossView {
  const group = new THREE.Group();
  // pale blue-white ghost tint reads against the warm kitchen palette much better
  // than a near-white — and it's a boss, so scaled up from the regular possum-jr.
  const mat = new THREE.MeshToonMaterial({ color: 0xd8ecf2, transparent: true, opacity: 0.6, gradientMap: toonRamp() });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 8), mat);
  body.scale.set(1, 0.85, 1.3);
  body.position.y = 0.75;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 9, 7), mat);
  head.position.set(0, 0.98, 0.68);
  const snout = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.34, 7), mat);
  snout.rotation.x = Math.PI / 2;
  snout.position.set(0, 0.88, 1.04);
  const earL = new THREE.Mesh(new THREE.SphereGeometry(0.16, 7, 6), mat);
  earL.scale.set(0.6, 1, 0.15);
  earL.position.set(-0.26, 1.26, 0.6);
  const earR = earL.clone();
  earR.position.x = 0.26;
  const face = eyes(0.19, 0.075);
  face.position.set(0, 0.95, 1.0);
  // a wisp-trail of shrinking spheres instead of a solid tail — sells "phantom"
  const tailSegs: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.SphereGeometry(0.09 - i * 0.014, 6, 5), mat);
    seg.position.set(0, 0.5 - i * 0.06, -0.65 - i * 0.16);
    tailSegs.push(seg);
    group.add(seg);
  }
  group.add(body, head, snout, earL, earR, face);
  return {
    group,
    animate: (dt, time) => {
      void dt;
      const flicker = 0.5 + Math.sin(time * 3) * 0.16 + Math.sin(time * 11) * 0.06;
      mat.opacity = Math.max(0.25, flicker);
      group.position.y = 0.1 + Math.sin(time * 1.4) * 0.05;
      tailSegs.forEach((s, i) => {
        s.position.x = Math.sin(time * 2.5 - i * 0.6) * 0.12;
      });
    },
  };
}

function buildTrashPandaDon(): BossView {
  const group = new THREE.Group();
  const body = sphere(0.62, 0x5a5a5c, 11);
  body.scale.set(1, 0.95, 1.15);
  body.position.y = 0.85;
  const belly = sphere(0.4, 0xd8d4cc, 9);
  belly.scale.set(0.9, 0.85, 0.5);
  belly.position.set(0, 0.78, 0.4);
  const head = sphere(0.32, 0x6a6a6c, 10);
  head.position.set(0, 1.35, 0.4);
  const mask = box(0.32, 0.14, 0.06, 0x1c1c1e);
  mask.position.set(0, 1.4, 0.62);
  const earL = sphere(0.09, 0x4a4a4c, 7);
  earL.position.set(-0.24, 1.58, 0.32);
  const earR = sphere(0.09, 0x4a4a4c, 7);
  earR.position.set(0.24, 1.58, 0.32);
  const face = eyes(0.15, 0.055);
  face.position.set(0, 1.38, 0.66);
  const tailG = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const ring = cyl(0.13 - i * 0.01, 0.13 - i * 0.01, 0.16, i % 2 === 0 ? 0x3a3a3c : 0xc8c4bc, 8);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0.5 - i * 0.13, -0.55 - i * 0.1);
    tailG.add(ring);
  }
  group.add(tailG);
  // garbage-lid shield
  const shield = new THREE.Group();
  const lid = cyl(0.42, 0.42, 0.05, 0xb0b4b8, 16);
  const lidRim = cyl(0.44, 0.44, 0.03, 0x8a8e92, 16);
  lidRim.position.y = -0.02;
  const lidHandle = box(0.05, 0.05, 0.16, 0x8a8e92);
  lidHandle.position.z = 0.06;
  shield.add(lid, lidRim, lidHandle);
  shield.rotation.z = Math.PI / 2;
  shield.position.set(-0.75, 0.9, 0.1);
  // tiny boss suit bowtie
  const bowtie = box(0.16, 0.08, 0.04, 0x2a1420);
  bowtie.position.set(0, 1.12, 0.62);
  group.add(body, belly, head, mask, earL, earR, face, shield, bowtie);
  return {
    group,
    animate: (dt, time) => {
      void dt;
      group.position.y = Math.sin(time * 1.8) * 0.03;
      shield.rotation.y = Math.sin(time * 1.2) * 0.2;
      tailG.rotation.z = Math.sin(time * 1.5) * 0.1;
    },
  };
}

function buildTheExterminator(): BossView {
  const group = new THREE.Group();
  const boots = new THREE.Group();
  for (const s of [-1, 1]) {
    const boot = box(0.28, 0.22, 0.42, 0x2a2a2c);
    boot.position.set(s * 0.24, 0.11, 0.06);
    boots.add(boot);
  }
  const legL = cyl(0.13, 0.15, 0.7, 0xc8a858, 8);
  legL.position.set(-0.24, 0.6, 0);
  const legR = cyl(0.13, 0.15, 0.7, 0xc8a858, 8);
  legR.position.set(0.24, 0.6, 0);
  const torso = box(0.7, 0.95, 0.42, 0xd8bc6c);
  torso.position.y = 1.42;
  const tank = cyl(0.16, 0.19, 0.75, 0x8a3c3c, 10);
  tank.position.set(0, 1.5, -0.32);
  const tankCap = cyl(0.08, 0.08, 0.08, 0x5c2424, 8);
  tankCap.position.set(0, 1.9, -0.32);
  const armL = cyl(0.09, 0.1, 0.6, 0xd8bc6c, 8);
  armL.position.set(-0.42, 1.35, 0.1);
  armL.rotation.z = 0.3;
  const armR = new THREE.Group();
  const armRUpper = cyl(0.09, 0.1, 0.5, 0xd8bc6c, 8);
  armRUpper.position.set(0, 0, 0);
  armR.add(armRUpper);
  armR.position.set(0.44, 1.4, 0.2);
  armR.rotation.z = -0.5;
  // spray nozzle wand
  const wand = cyl(0.03, 0.035, 0.45, 0x3a3a3c, 6);
  wand.position.set(0.62, 1.1, 0.4);
  wand.rotation.z = -0.6;
  const head = sphere(0.26, 0xd8bc6c, 10);
  head.position.set(0, 2.05, 0);
  // gas mask — the defining silhouette read
  const maskBody = sphere(0.24, 0x2a3a2c, 9);
  maskBody.scale.set(1, 1.1, 0.9);
  maskBody.position.set(0, 2.03, 0.08);
  const lensL = sphere(0.09, 0x1a2418, 8);
  lensL.position.set(-0.1, 2.08, 0.28);
  const lensR = sphere(0.09, 0x1a2418, 8);
  lensR.position.set(0.1, 2.08, 0.28);
  const glintMat = toonMat(0x8fffb0, { emissive: 0x2adc7a });
  const glintL = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), glintMat);
  glintL.castShadow = false;
  glintL.position.set(-0.08, 2.1, 0.35);
  const glintR = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), glintMat);
  glintR.castShadow = false;
  glintR.position.set(0.12, 2.1, 0.35);
  const filter = cyl(0.07, 0.08, 0.14, 0x3a4a3c, 8);
  filter.rotation.x = Math.PI / 2;
  filter.position.set(0, 1.95, 0.28);
  group.add(boots, legL, legR, torso, tank, tankCap, armL, armR, wand, head, maskBody, lensL, lensR, glintL, glintR, filter);
  return {
    group,
    animate: (dt, time) => {
      void dt;
      // looming — slow, heavy, deliberate breathing sway
      group.position.y = Math.sin(time * 0.9) * 0.02;
      armR.rotation.x = Math.sin(time * 0.7) * 0.08;
      wand.position.y = 1.1 + Math.sin(time * 0.7) * 0.03;
      glintMat.emissiveIntensity = 0.5 + Math.sin(time * 2.5) * 0.5;
    },
  };
}

const BOSS_BUILDERS: Record<string, () => BossView> = {
  'moadb': buildMoadb,
  'sir-clogsworth': buildSirClogsworth,
  'bedbug-baron': buildBedbugBaron,
  'rat-king': buildRatKing,
  'grandma-longlegs': buildGrandmaLonglegs,
  'possum-phantom': buildPossumPhantom,
  'trash-panda-don': buildTrashPandaDon,
  'the-exterminator': buildTheExterminator,
};

/** ARACHNOPHOBIA MODE (§20.15/§23): every def id in here has a spider silhouette and gets
 *  swapped for buildGooglyRoomba() when the mode is on. Currently just the one spider boss —
 *  add future spider-shaped critters here too, they'll pick up the swap for free. */
const SPIDER_SILHOUETTE_DEFS = new Set<string>(['grandma-longlegs']);

/** Module-level flag mirroring save.settings.arachnophobia. Set once from game.ts at boot and
 *  again on every settings change; boss views are built once per critter instance (see
 *  renderer.ts syncTick), so per GAME-PROMPT the swap is documented to take effect next level
 *  load rather than hot-swapping mid-fight. */
let arachnophobiaMode = false;

/** Called from game.ts whenever settings load/change. Deliberately does NOT retroactively
 *  rebuild any already-spawned boss view — see setArachnophobiaMode doc above. */
export function setArachnophobiaMode(on: boolean): void {
  arachnophobiaMode = on;
}

/** Dispatch a boss critter def to its bespoke Group view. Falls back to null for
 *  unknown/non-boss defs — callers (renderer.ts) should fall back to buildCrumbKing
 *  or skip entirely. */
export function buildBossView(def: string): BossView | null {
  if (arachnophobiaMode && SPIDER_SILHOUETTE_DEFS.has(def)) return buildGooglyRoomba();
  const builder = BOSS_BUILDERS[def];
  return builder ? builder() : null;
}

export interface CritterRenderState {
  x: number; y: number; z: number;
  facing: number;
  wobble: number;
  state: string;
  flash: number;       // 0..1 white flash
  shiny: boolean;
  tumble: number;      // spin while flung
  scale: number;
}

const CAP = 380;
const tmpM = new THREE.Matrix4();
const tmpP = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpS = new THREE.Vector3();
const tmpE = new THREE.Euler();
const tmpC = new THREE.Color();
const WHITE = new THREE.Color(0xffffff);
const GOLD = new THREE.Color(0xffe27a);

/** One InstancedMesh per species + one shared shadow-blob mesh. */
export class CritterInstances {
  readonly root = new THREE.Group();
  private meshes = new Map<string, THREE.InstancedMesh>();
  private shadows: THREE.InstancedMesh;

  constructor() {
    const shadowGeo = new THREE.CircleGeometry(0.32, 12);
    shadowGeo.rotateX(-Math.PI / 2);
    this.shadows = new THREE.InstancedMesh(
      shadowGeo,
      new THREE.MeshBasicMaterial({ color: 0x2a1c10, transparent: true, opacity: 0.28, depthWrite: false }),
      CAP * 2,
    );
    this.shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.root.add(this.shadows);
  }

  private meshFor(def: string): THREE.InstancedMesh {
    let mesh = this.meshes.get(def);
    if (!mesh) {
      const builder = GEO_BUILDERS[def] ?? GEO_BUILDERS['ant-worker'];
      mesh = new THREE.InstancedMesh(builder(), vertexToonMat(), CAP);
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.castShadow = true;
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.meshes.set(def, mesh);
      this.root.add(mesh);
    }
    return mesh;
  }

  /** Repaint all instances from grouped render states. */
  sync(byDef: Map<string, CritterRenderState[]>, time: number): void {
    for (const mesh of this.meshes.values()) mesh.count = 0;
    let shadowI = 0;

    for (const [def, list] of byDef) {
      const mesh = this.meshFor(def);
      let i = 0;
      for (const c of list) {
        if (i >= CAP) break;
        const bob = Math.sin(time * 9 + c.wobble) * 0.035;
        const sway = Math.sin(time * 7 + c.wobble) * 0.06;
        let y = c.y + bob;
        tmpE.set(0, c.facing, sway);
        if (c.state === 'playDead') {
          tmpE.set(Math.PI, c.facing, 0); // belly up!
          y = c.y + 0.25;
        } else if (c.state === 'flung' || c.state === 'fall') {
          tmpE.set(c.tumble, c.facing, c.tumble * 1.3);
        } else if (c.state === 'climb') {
          tmpE.set(-0.7, c.facing, 0);
        } else if (c.state === 'eatCake' || c.state === 'chew') {
          tmpE.set(Math.sin(time * 16) * 0.18 - 0.1, c.facing, 0); // nom nom
        }
        tmpP.set(c.x, y, c.z);
        tmpQ.setFromEuler(tmpE);
        const squash = c.state === 'walk' ? 1 + Math.sin(time * 9 + c.wobble) * 0.05 : 1;
        tmpS.set(c.scale, c.scale * squash, c.scale);
        tmpM.compose(tmpP, tmpQ, tmpS);
        mesh.setMatrixAt(i, tmpM);

        tmpC.copy(WHITE);
        if (c.shiny) tmpC.copy(GOLD);
        if (c.flash > 0) tmpC.lerp(new THREE.Color(8, 8, 8), Math.min(1, c.flash));
        mesh.setColorAt(i, tmpC);
        i++;

        // shadow blob (skip while airborne high)
        if (shadowI < CAP * 2 && c.state !== 'climb') {
          tmpP.set(c.x, Math.max(0.02, c.y - (c.state === 'flung' || c.state === 'fall' ? c.y : 0)) + 0.02, c.z);
          // shadows sit on the surface the critter walks on; cheap approx: directly under, at y of walk height
          tmpP.y = c.y + 0.02 - (c.state === 'fall' || c.state === 'flung' ? 0 : 0);
          tmpQ.identity();
          tmpS.set(c.scale, 1, c.scale);
          tmpM.compose(tmpP, tmpQ, tmpS);
          this.shadows.setMatrixAt(shadowI++, tmpM);
        }
      }
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    this.shadows.count = shadowI;
    this.shadows.instanceMatrix.needsUpdate = true;
  }
}
