import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Collider } from '../world/RegionBuilder';
import { GeoBuilder, archPanel, box, cone, cyl, flowers, sphere } from '../world/kit';
import { castleBase } from '../world/terrain';
import { CASTLE } from './site';

/**
 * The celebration castle: an ivory keep with rose-pink spires and gold finials, a grand stair,
 * a round courtyard with a rose-arched aisle, fairy lights and a meadow of flowers all around.
 * Built once into two merged meshes (solid + glow) like the rest of the world.
 */

const IVORY = '#fbf1f4', STONE = '#eadfe6', PINK = '#f49ac1', ROSE = '#e8588c', GOLD = '#f5c451', LILAC = '#c9b3f0';
const FLOWERS = ['#ff8fb8', '#ffffff', '#f2d14e', '#b58ad9', '#ff6b6b', '#8fd3ff'];

export interface CastleBuild {
  group: THREE.Group;
  colliders: Collider[];
  /** Ground height of the castle grounds. */
  y: number;
}

export function buildCastle(solid: THREE.Material, glowMat: THREE.Material): CastleBuild {
  const g = new GeoBuilder(), glow = new GeoBuilder();
  const rng = new Rng('castle');
  const y = castleBase();
  const K = CASTLE.keep, V = CASTLE.venue, A = CASTLE.aisle;
  const colliders: Collider[] = [];

  // ── The keep ──
  const front = K.z + K.d / 2;
  box(g, K.w, 18, K.d, IVORY, K.x, y, K.z);
  box(g, K.w + 1, 1.2, K.d + 1, STONE, K.x, y + 18, K.z);
  for (let i = 0; i < 17; i++) {
    const x = K.x - K.w / 2 + 1 + i * 2;
    box(g, 1.1, 1.3, 1.1, IVORY, x, y + 19.2, front + 0.2);
    box(g, 1.1, 1.3, 1.1, IVORY, x, y + 19.2, K.z - K.d / 2 - 0.2);
  }
  // Great hall roof and the central tower with its spire.
  box(g, K.w - 8, 6, K.d - 8, PINK, K.x, y + 19.2, K.z);
  cyl(g, 5, 5.5, 36, IVORY, K.x, y, K.z - 2, 16);
  cone(g, 6.4, 16, PINK, K.x, y + 36, K.z - 2, 16);
  cyl(g, 0.25, 0.25, 3, GOLD, K.x, y + 52, K.z - 2, 6);
  sphere(g, 0.6, GOLD, K.x, y + 55.4, K.z - 2, 8);
  // Four corner towers and two slender gate towers.
  for (const [dx, dz, r, h] of [[-1, 1, 3.6, 26], [1, 1, 3.6, 26], [-1, -1, 3.2, 24], [1, -1, 3.2, 24]] as const) {
    const x = K.x + dx * K.w / 2, z = K.z + dz * K.d / 2;
    cyl(g, r, r + 0.4, h, IVORY, x, y, z, 14);
    cyl(g, r + 0.5, r + 0.5, 1, STONE, x, y + h, z, 14);
    cone(g, r + 0.9, r * 3.2, PINK, x, y + h + 1, z, 14);
    sphere(g, 0.35, GOLD, x, y + h + 1 + r * 3.2 + 0.3, z, 6);
    colliders.push({ x, z, r: r + 0.4, h: y + h });
    // Tall arched windows, lit from within.
    for (let k = 0; k < 3; k++) archPanel(glow, 1.2, 2.4, '#ffd9a8', x, y + 6 + k * 6, z + r + 0.05, 0, 0.08, true);
  }
  for (const s of [-1, 1]) {
    const x = K.x + s * 5.5;
    cyl(g, 2, 2.2, 24, IVORY, x, y, front + 1, 12);
    cone(g, 2.6, 8, ROSE, x, y + 24, front + 1, 12);
    sphere(g, 0.3, GOLD, x, y + 32.3, front + 1, 6);
    colliders.push({ x, z: front + 1, r: 2.2, h: y + 24 });
  }
  // The great doors under a pointed arch, and rows of glowing windows along the front.
  archPanel(g, 7, 10, '#b56a8a', K.x, y, front + 0.1, 0, 0.3, true);
  archPanel(glow, 5.6, 8.6, '#ffe2b8', K.x, y + 0.3, front + 0.2, 0, 0.1, true);
  for (let i = 0; i < 6; i++) {
    const x = K.x - 14 + i * 5.6;
    if (Math.abs(x - K.x) < 7) continue;
    archPanel(glow, 1.6, 3.2, '#ffd9a8', x, y + 5, front + 0.05, 0, 0.06, true);
    archPanel(glow, 1.6, 3.2, '#ffd9a8', x, y + 11.5, front + 0.05, 0, 0.06, true);
  }
  // Banners.
  for (const s of [-1, 1]) {
    box(g, 2, 7, 0.15, ROSE, K.x + s * 10, y + 9, front + 0.2);
    box(g, 2, 0.4, 0.2, GOLD, K.x + s * 10, y + 16, front + 0.25);
  }
  // Keep colliders along the walls (circles in a row).
  for (let x = -K.w / 2 + 3; x <= K.w / 2 - 3; x += 5) {
    for (const z of [front - 2.5, K.z, K.z - K.d / 2 + 2.5]) colliders.push({ x: K.x + x, z, r: 3.2, h: y + 18 });
  }

  // ── The grand stair down to the courtyard ──
  for (let i = 0; i < 6; i++) box(g, 14 - i * 0.6, 0.25, 1.6, STONE, K.x, y + 0.25 * (5 - i) - 0.2, front + 1.6 + (5 - i) * 1.4);

  // ── Courtyard, aisle and rose arches ──
  cyl(g, V.r, V.r + 0.4, 0.2, STONE, V.x, y - 0.12, V.z, 48);
  cyl(g, V.r - 1, V.r - 1, 0.21, '#f6e9ef', V.x, y - 0.11, V.z, 48);
  box(g, 3.2, 0.24, A.from - A.to + 8, '#e8588c', A.x, y - 0.1, (A.from + A.to) / 2);
  for (let z = A.to + 2; z <= A.from; z += 6) {
    for (const s of [-1, 1]) cyl(g, 0.12, 0.12, 3.6, '#ffffff', A.x + s * 2.2, y, z, 6);
    // Arch of roses: a half ring of blossoms.
    for (let k = 0; k <= 10; k++) {
      const a = (k / 10) * Math.PI;
      sphere(g, 0.32, k % 3 ? ROSE : '#ffffff', A.x + Math.cos(a) * 2.2, y + 3.6 + Math.sin(a) * 1.6, z, 6);
    }
    sphere(glow, 0.14, '#fff2c8', A.x, y + 5.3, z, 6);
  }
  // Fairy lights strung across the courtyard.
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const x = V.x + Math.cos(a) * (V.r - 1.5), z = V.z + Math.sin(a) * (V.r - 1.5);
    cyl(g, 0.12, 0.16, 5.5, GOLD, x, y, z, 6);
    sphere(glow, 0.3, '#fff2c8', x, y + 5.7, z, 8);
    for (let j = 1; j < 12; j++) {
      const t = j / 12, xx = x + (V.x - x) * t, zz = z + (V.z - z) * t;
      sphere(glow, 0.09, ['#ffb3d9', '#fff2c8', '#b3e6ff', '#d9c2ff'][j % 4], xx, y + 5.5 + Math.sin(t * Math.PI) * 1.8, zz, 5);
    }
  }
  sphere(glow, 0.5, '#fff2c8', V.x, y + 7.3, V.z, 10);
  // Paper lanterns: strung round the courtyard, hanging over the aisle and on tall posts.
  const LANTERN = ['#ff6b8b', '#ffb347', '#ffd9a8', '#ff8fb8', '#e8588c', '#fff27a'];
  const lantern = (x: number, ly: number, z: number, i: number, s = 1) => {
    sphere(glow, 0.36 * s, LANTERN[i % LANTERN.length], x, ly, z, 8, 1.25);
    cyl(g, 0.16 * s, 0.2 * s, 0.1 * s, GOLD, x, ly + 0.4 * s, z, 6);
    cyl(g, 0.2 * s, 0.16 * s, 0.1 * s, GOLD, x, ly - 0.5 * s, z, 6);
  };
  for (let k = 0; k < 28; k++) {
    const a = (k / 28) * Math.PI * 2;
    lantern(V.x + Math.cos(a) * (V.r - 3.5), y + 4.4 + Math.sin(k * 1.3) * 0.3, V.z + Math.sin(a) * (V.r - 3.5), k);
  }
  for (let z = A.to + 5; z <= A.from; z += 6) lantern(A.x, y + 4.1, z, Math.round(z), 0.8);
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2 + 0.13;
    const x = V.x + Math.cos(a) * (V.r + 3), z = V.z + Math.sin(a) * (V.r + 3);
    if (z < front + 8 && Math.abs(x - K.x) < K.w / 2 + 4) continue;
    cyl(g, 0.1, 0.14, 3.6, '#fbf1f4', x, y, z, 6);
    lantern(x, y + 4.1, z, k + 2, 1.1);
  }

  // ── A meadow of flowers all around, and lilac trees ──
  for (let i = 0; i < 520; i++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(V.r + 1, 68);
    const x = V.x + Math.cos(a) * r, z = V.z + Math.sin(a) * r;
    if (z < front + 10 && Math.abs(x - K.x) < K.w / 2 + 6) continue;
    if (Math.abs(x - A.x) < 3 && z > V.z) continue;
    flowers(g, x, y, z, FLOWERS, () => rng.next(), 4);
  }
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + 0.2, r = 44 + (i % 3) * 7;
    const x = V.x + Math.cos(a) * r, z = V.z + Math.sin(a) * r;
    if (z < front + 6 && Math.abs(x - K.x) < K.w / 2 + 6) continue;
    cyl(g, 0.3, 0.4, 3, '#8a5a3a', x, y, z, 6);
    sphere(g, 2.4, i % 2 ? LILAC : '#ffc4dc', x, y + 4.2, z, 8, 0.85);
  }

  const group = new THREE.Group();
  const m = g.build(solid), gm = glow.build(glowMat);
  if (m) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
  if (gm) group.add(gm);
  return { group, colliders, y };
}
