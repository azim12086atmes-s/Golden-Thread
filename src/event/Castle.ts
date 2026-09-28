import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { Collider } from '../world/RegionBuilder';
import { GeoBuilder, M, archPanel, box, cone, cyl, flowers, gable, sphere } from '../world/kit';
import { SURF } from '../world/surfaces';
import { castleBase } from '../world/terrain';
import { CASTLE } from './site';

/**
 * The celebration castle: an ivory keep with rose-pink spires and gold finials, a grand stair,
 * a round courtyard with a rose-arched aisle, fairy lights and a meadow of flowers all around.
 * Built once into two merged meshes (solid + glow) like the rest of the world.
 */

const IVORY = '#fbf1f4', STONE = '#eadfe6', PINK = '#f49ac1', ROSE = '#e8588c', GOLD = '#f5c451', LILAC = '#c9b3f0';
const FLOWERS = ['#ff8fb8', '#ffffff', '#f2d14e', '#b58ad9', '#ff6b6b', '#8fd3ff'];

/**
 * A fairy-tale spire: a steep roof that flares out at its eaves like a bell (a lathe, not a plain
 * cone), a gold ring at its foot, a gold finial and a rose pennant on top.
 */
function spire(g: GeoBuilder, x: number, y: number, z: number, r: number, h: number, col: string, pennant = true): void {
  const prof: Array<[number, number]> = [[r * 1.22, 0], [r * 1.08, h * 0.05], [r * 0.86, h * 0.18], [r * 0.6, h * 0.4], [r * 0.34, h * 0.65], [r * 0.14, h * 0.88], [0.001, h]];
  g.add(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), 16), col, M(x, y, z));
  g.add(new THREE.TorusGeometry(r * 1.2, 0.08, 4, 20).rotateX(Math.PI / 2), GOLD, M(x, y + 0.04, z));
  cyl(g, 0.05 * Math.max(1, r / 2), 0.05 * Math.max(1, r / 2), 1.2 + r * 0.3, GOLD, x, y + h - 0.2, z, 5);
  sphere(g, 0.18 + r * 0.05, GOLD, x, y + h + 0.2, z, 8);
  if (pennant) g.add(new THREE.ConeGeometry(0.3 + r * 0.08, 1.4 + r * 0.3, 3).rotateZ(-Math.PI / 2), ROSE, M(x + 0.7 + r * 0.15, y + h + 0.8 + r * 0.25, z, 0, 1, 1, 0.12));
}

export interface CastleBuild {
  group: THREE.Group;
  colliders: Collider[];
  /** Ground height of the castle grounds. */
  y: number;
}

export function buildCastle(solid: THREE.Material, glowMat: THREE.Material): CastleBuild {
  const g = new GeoBuilder(), glow = new GeoBuilder();
  // Dressed ivory stone and rose slate, read from their colours as a land's buildings are.
  g.surfaces = new Map([[IVORY, SURF.ashlar], [STONE, SURF.ashlar], [PINK, SURF.slate], [ROSE, SURF.slate], ['#f6e9ef', SURF.marble]]);
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
  // The upper hall, set back behind the parapet, under a steep rose roof with dormers and gold cresting.
  const uw = K.w - 8, ud = K.d - 8, uf = K.z + ud / 2;
  box(g, uw, 6, ud, IVORY, K.x, y + 19.2, K.z);
  gable(g, uw + 1, ud + 1.2, 9, PINK, K.x, y + 25.2, K.z);
  for (let i = 0; i < 14; i++) cone(g, 0.18, 0.7, GOLD, K.x - uw / 2 + 1 + i * (uw - 2) / 13, y + 34.1, K.z, 5);
  for (const side of [1, -1]) for (let i = 0; i < 4; i++) {
    const x = K.x - uw / 2 + 3.5 + i * (uw - 7) / 3, z = K.z + side * (ud / 2 - 1.1);
    box(g, 1.6, 2, 1.8, IVORY, x, y + 26.4, z);
    gable(g, 1.9, 2.1, 1.2, ROSE, x, y + 28.4, z, Math.PI / 2);
    archPanel(glow, 0.9, 1.4, '#ffd9a8', x, y + 26.6, z + side * 0.92, side > 0 ? 0 : Math.PI, 0.04, true);
  }
  // An arcaded gallery along the upper hall's front, lit from within: where the two may step out.
  for (let i = 0; i < 9; i++) {
    const x = K.x - 8 + i * 2;
    cyl(g, 0.16, 0.18, 3, STONE, x, y + 19.2, uf + 0.1, 8);
    if (i < 8) { archPanel(glow, 1.4, 2.6, '#ffe2b8', x + 1, y + 19.3, uf + 0.02, 0, 0.04, true); g.add(new THREE.TorusGeometry(0.9, 0.1, 4, 12, Math.PI), STONE, M(x + 1, y + 21.4, uf + 0.12)); }
  }
  box(g, 17, 0.25, 0.6, STONE, K.x, y + 22.3, uf + 0.2);
  cyl(g, 5, 5.5, 36, IVORY, K.x, y, K.z - 2, 16);
  spire(g, K.x, y + 36, K.z - 2, 5.3, 17, PINK);
  // Four turrets clustered round the great tower's gallery.
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4, tx = K.x + Math.cos(a) * 5.6, tz = K.z - 2 + Math.sin(a) * 5.6;
    cyl(g, 1, 1, 6, IVORY, tx, y + 30.6, tz, 10);
    for (const h of [32, 34.2]) archPanel(glow, 0.4, 0.9, '#ffd9a8', tx + Math.cos(a) * 1.01, y + h, tz + Math.sin(a) * 1.01, Math.PI / 2 - a, 0.03, true);
    spire(g, tx, y + 36.6, tz, 1.1, 4.6, ROSE, false);
  }
  // Four corner towers and two slender gate towers.
  for (const [dx, dz, r, h] of [[-1, 1, 3.6, 26], [1, 1, 3.6, 26], [-1, -1, 3.2, 24], [1, -1, 3.2, 24]] as const) {
    const x = K.x + dx * K.w / 2, z = K.z + dz * K.d / 2;
    cyl(g, r, r + 0.4, h, IVORY, x, y, z, 14);
    cyl(g, r + 0.5, r + 0.5, 1, STONE, x, y + h, z, 14);
    spire(g, x, y + h + 1, z, r, r * 3.4, PINK);
    colliders.push({ x, z, r: r + 0.4, h: y + h });
    // Tall arched windows, lit from within.
    for (let k = 0; k < 3; k++) archPanel(glow, 1.2, 2.4, '#ffd9a8', x, y + 6 + k * 6, z + r + 0.05, 0, 0.08, true);
  }
  for (const s of [-1, 1]) {
    const x = K.x + s * 5.5;
    cyl(g, 2, 2.2, 24, IVORY, x, y, front + 1, 12);
    cyl(g, 2.4, 2.2, 0.6, STONE, x, y + 24, front + 1, 12);
    spire(g, x, y + 24.6, front + 1, 2.1, 8.5, ROSE);
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


  // ── The keep's architecture (owner: revamp, keep the ivory, rose and gold) ──
  // Buttresses between the bays, string courses, a gallery of pinnacles along the roofline.
  for (const z of [front + 0.3, K.z - K.d / 2 - 0.3]) {
    for (let x = K.x - K.w / 2 + 2.8; x < K.x + K.w / 2 - 2; x += 5.6) {
      if (z > K.z && Math.abs(x - K.x) < 5) continue;
      box(g, 1, 17, 1.2, STONE, x, y, z);
      cone(g, 0.5, 1.6, IVORY, x, y + 18.6, z, 4, Math.PI / 4);
      sphere(g, 0.16, GOLD, x, y + 20.3, z, 5);
    }
  }
  for (const h of [6.2, 12.4]) box(g, K.w + 0.5, 0.35, K.d + 0.5, STONE, K.x, y + h, K.z);
  // Tracery in every lit window of the front: a mullion, a transom, and a hood-mould over the arch.
  for (let i = 0; i < 6; i++) {
    const x = K.x - 14 + i * 5.6;
    if (Math.abs(x - K.x) < 7) continue;
    for (const wy of [5, 11.5]) {
      box(g, 0.1, 3.4, 0.1, STONE, x, y + wy, front + 0.16);
      box(g, 1.6, 0.1, 0.1, STONE, x, y + wy + 1.8, front + 0.16);
      g.add(new THREE.TorusGeometry(0.95, 0.09, 4, 12, Math.PI), STONE, new THREE.Matrix4().makeTranslation(x, y + wy + 2.4, front + 0.18));
      box(g, 2.1, 0.18, 0.3, STONE, x, y + wy - 0.1, front + 0.2);
    }
  }
  // The rose window over the great doors: petals of glass round a heart, tracery radiating from it.
  const rz = front + 0.22, ry = y + 13.6;
  g.add(new THREE.CylinderGeometry(2.3, 2.3, 0.06, 32).rotateX(Math.PI / 2), '#d98ab0', new THREE.Matrix4().makeTranslation(K.x, ry, rz));
  g.add(new THREE.TorusGeometry(2.4, 0.2, 5, 32), STONE, new THREE.Matrix4().makeTranslation(K.x, ry, rz + 0.05));
  g.add(new THREE.TorusGeometry(0.8, 0.12, 5, 20), STONE, new THREE.Matrix4().makeTranslation(K.x, ry, rz + 0.06));
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    g.add(new THREE.BoxGeometry(0.09, 1.6, 0.1), STONE, new THREE.Matrix4().makeRotationZ(a).setPosition(K.x + Math.sin(-a) * 1.6, ry + Math.cos(a) * 1.6, rz + 0.07));
    g.add(new THREE.TorusGeometry(0.4, 0.05, 4, 10), STONE, new THREE.Matrix4().makeTranslation(K.x + Math.cos(a) * 1.75, ry + Math.sin(a) * 1.75, rz + 0.07));
    sphere(glow, 0.2, i % 2 ? '#ffc4dc' : '#fff2c8', K.x + Math.cos(a + 0.26) * 1.2, ry + Math.sin(a + 0.26) * 1.2, rz + 0.05, 5, 0.3);
  }
  sphere(glow, 0.35, '#ff6b8b', K.x, ry, rz + 0.1, 8);
  // The portal: arches receding in three orders round the doors, a gold portcullis raised above them.
  for (let k = 0; k < 3; k++) archPanel(g, 8.6 + k * 1.2, 11 + k * 0.7, k % 2 ? STONE : IVORY, K.x, y, front + 0.05 - k * 0.02, 0, 0.35 + k * 0.1, true);
  for (let i = 0; i < 7; i++) box(g, 0.14, 2.6, 0.14, GOLD, K.x - 2.4 + i * 0.8, y + 8.4, front + 0.5);
  for (let j = 0; j < 4; j++) box(g, 5.2, 0.12, 0.14, GOLD, K.x, y + 8.6 + j * 0.65, front + 0.5);
  for (let i = 0; i < 7; i++) cone(g, 0.1, 0.35, GOLD, K.x - 2.4 + i * 0.8, y + 8.1, front + 0.5, 4, Math.PI);
  // Bartizans: little corbelled turrets clinging to the keep's upper corners of the front.
  for (const s of [-1, 1]) {
    const x = K.x + s * (K.w / 2 - 5.6), z = front + 0.9;
    cone(g, 1.2, 2.2, STONE, x, y + 13.8, z, 12, 0);
    g.add(new THREE.ConeGeometry(1.2, 2.2, 12).rotateX(Math.PI), STONE, new THREE.Matrix4().makeTranslation(x, y + 15.9, z));
    cyl(g, 1.2, 1.2, 4, IVORY, x, y + 17, z, 12);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; archPanel(glow, 0.45, 1, '#ffd9a8', x + Math.sin(a) * 1.21, y + 18.2, z + Math.cos(a) * 1.21, a, 0.04, true); }
    spire(g, x, y + 21, z, 1.25, 4.6, ROSE, false);
  }
  // The great tower: a gallery round it, lit lancets up its height, dormers on its spire.
  cyl(g, 6.4, 6, 0.6, STONE, K.x, y + 30, K.z - 2, 20);
  for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; cyl(g, 0.07, 0.07, 1.1, GOLD, K.x + Math.cos(a) * 6.2, y + 30.6, K.z - 2 + Math.sin(a) * 6.2, 4); }
  g.add(new THREE.TorusGeometry(6.2, 0.07, 4, 40).rotateX(Math.PI / 2), GOLD, new THREE.Matrix4().makeTranslation(K.x, y + 31.7, K.z - 2));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; for (const h of [22, 26]) archPanel(glow, 0.9, 2.2, '#ffd9a8', K.x + Math.sin(a) * 5.05, y + h, K.z - 2 + Math.cos(a) * 5.05, a, 0.05, true); }
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4, dx = Math.sin(a) * 4.4, dz = Math.cos(a) * 4.4;
    box(g, 1.4, 1.8, 1.4, IVORY, K.x + dx, y + 39, K.z - 2 + dz, a);
    archPanel(glow, 0.6, 1.1, '#ffd9a8', K.x + Math.sin(a) * 5.12, y + 39.3, K.z - 2 + Math.cos(a) * 5.12, a, 0.04, true);
    cone(g, 1.1, 1.4, ROSE, K.x + dx, y + 40.8, K.z - 2 + dz, 4, a + Math.PI / 4);
  }
  // Machicolations and pennants on the four corner towers.
  for (const [dx, dz, r, h] of [[-1, 1, 3.6, 26], [1, 1, 3.6, 26], [-1, -1, 3.2, 24], [1, -1, 3.2, 24]] as const) {
    const x = K.x + dx * K.w / 2, z = K.z + dz * K.d / 2;
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; box(g, 0.45, 0.8, 0.5, STONE, x + Math.cos(a) * (r + 0.3), y + h - 0.8, z + Math.sin(a) * (r + 0.3), Math.PI / 2 - a); }
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + (dx > 0 ? 0.5 : 2.6); box(g, 0.9, 1.2, 0.9, IVORY, x + Math.cos(a) * r * 0.7, y + h + 2.2, z + Math.sin(a) * r * 0.7, Math.PI / 2 - a); cone(g, 0.75, 1, PINK, x + Math.cos(a) * r * 0.7, y + h + 3.4, z + Math.sin(a) * r * 0.7, 4, Math.PI / 4 - a); }
  }
  // ── The wings: lower halls either side of the keep, stepped gables to the front, a stair turret each ──
  for (const s of [-1, 1]) {
    const wx = K.x + s * (K.w / 2 + 8), ww = 12, wd = 16, wh = 12, wz = K.z + 2;
    box(g, ww, wh, wd, IVORY, wx, y, wz);
    box(g, ww + 0.5, 0.35, wd + 0.5, STONE, wx, y + 6, wz);
    gable(g, wd + 0.8, ww + 1, 7, PINK, wx, y + wh, wz, Math.PI / 2);
    // The stepped gable to the courtyard, its windows in two rows with tracery.
    for (let k = 0; k < 5; k++) box(g, ww - k * 2.3, 1.4, 0.8, IVORY, wx, y + wh + k * 1.4, wz + wd / 2 - 0.2);
    for (let k = 0; k < 5; k++) sphere(g, 0.16, GOLD, wx - (ww - k * 2.3) / 2 + 0.1, y + wh + k * 1.4 + 1.55, wz + wd / 2 - 0.2, 5);
    for (const row of [2.2, 7.6]) for (const dx of [-3.2, 0, 3.2]) {
      archPanel(glow, 1.3, 2.8, '#ffd9a8', wx + dx, y + row, wz + wd / 2 + 0.03, 0, 0.05, true);
      box(g, 0.08, 2.9, 0.08, STONE, wx + dx, y + row, wz + wd / 2 + 0.1);
      box(g, 1.8, 0.16, 0.3, STONE, wx + dx, y + row - 0.12, wz + wd / 2 + 0.15);
    }
    archPanel(glow, 1.4, 1.8, '#ffc4dc', wx, y + wh + 2, wz + wd / 2 + 0.2, 0, 0.04, true);
    // Its round stair turret on the outer corner, windows winding up it.
    const tx = wx + s * (ww / 2), tz = wz + wd / 2 - 1.5;
    cyl(g, 1.8, 2, 20, IVORY, tx, y, tz, 12);
    for (let k = 0; k < 6; k++) { const a = k * 0.9; archPanel(glow, 0.4, 0.9, '#ffd9a8', tx + Math.sin(a) * 1.82, y + 3 + k * 2.6, tz + Math.cos(a) * 1.82, a, 0.03, true); }
    spire(g, tx, y + 20, tz, 1.8, 7.5, ROSE);
    for (let x = -ww / 2 + 2; x <= ww / 2 - 2; x += 4) for (const z of [wz - wd / 2 + 2.5, wz, wz + wd / 2 - 2.5]) colliders.push({ x: wx + x, z, r: 2.8, h: y + wh });
    colliders.push({ x: tx, z: tz, r: 2.1, h: y + 20 });
  }
  // ── Curtain walls: crenellated walls closing the back, from tower to wing ──
  for (const s of [-1, 1]) {
    const x0 = K.x + s * (K.w / 2), z0 = K.z - K.d / 2, x1 = K.x + s * (K.w / 2 + 8), z1 = K.z + 2 - 8;
    const len = Math.hypot(x1 - x0, z1 - z0), mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, ang = Math.atan2(x1 - x0, z1 - z0);
    g.add(new THREE.BoxGeometry(1.2, 9, len).translate(0, 4.5, 0), IVORY, M(mx, y, mz, ang));
    for (let k = 0; k < Math.floor(len / 1.4); k++) { const t = (k + 0.5) / Math.floor(len / 1.4) - 0.5; box(g, 1.3, 0.9, 0.7, IVORY, mx + Math.sin(ang) * t * len, y + 9, mz + Math.cos(ang) * t * len, ang); }
  }
  // ── The grand stair: balustrades of little columns, urns of roses at the foot, heart-shaped topiaries ──
  for (const s of [-1, 1]) {
    const x = K.x + s * 7.2;
    for (let i = 0; i < 6; i++) {
      const zz = front + 1.6 + (5 - i) * 1.4, yy = y + 0.25 * (5 - i) - 0.2 + 0.25;
      for (let q = 0; q < 3; q++) cyl(g, 0.09, 0.12, 0.8, IVORY, x, yy, zz - 0.45 + q * 0.45, 8);
      box(g, 0.35, 0.14, 1.45, STONE, x, yy + 0.8, zz);
    }
    const ux = x, uz = front + 10.3;
    cyl(g, 0.5, 0.35, 0.8, IVORY, ux, y, uz, 10); cyl(g, 0.7, 0.5, 0.5, IVORY, ux, y + 0.8, uz, 10);
    for (let q = 0; q < 7; q++) sphere(g, 0.22, q % 2 ? ROSE : '#ffffff', ux + Math.cos(q) * 0.35, y + 1.45 + (q % 3) * 0.12, uz + Math.sin(q) * 0.35, 6);
    const heart = new THREE.Shape();
    heart.moveTo(0, -1.4); heart.bezierCurveTo(-2.2, 0.2, -1.1, 1.8, 0, 0.8); heart.bezierCurveTo(1.1, 1.8, 2.2, 0.2, 0, -1.4);
    const hx = K.x + s * 11, hz = front + 8;
    g.add(new THREE.ExtrudeGeometry(heart, { depth: 0.9, bevelEnabled: true, bevelSize: 0.2, bevelThickness: 0.2, bevelSegments: 2 }).translate(0, 0, -0.45), '#3f7a3a', new THREE.Matrix4().makeTranslation(hx, y + 2.1, hz));
    cyl(g, 0.12, 0.14, 0.9, '#6b4a2a', hx, y, hz, 5);
    box(g, 1.4, 0.5, 1.4, IVORY, hx, y, hz);
    for (let q = 0; q < 10; q++) sphere(g, 0.12, q % 3 ? ROSE : '#ffffff', hx + Math.sin(q * 2.1) * 1.2, y + 2.1 + Math.cos(q * 1.7) * 0.9, hz + 0.6, 5);
    colliders.push({ x: hx, z: hz, r: 1.5, h: y + 3.5 });
  }

  // ── The grand stair down to the courtyard ──
  for (let i = 0; i < 6; i++) box(g, 14 - i * 0.6, 0.25, 1.6, STONE, K.x, y + 0.25 * (5 - i) - 0.2, front + 1.6 + (5 - i) * 1.4);

  // ── Courtyard, aisle and rose arches ──
  cyl(g, V.r, V.r + 0.4, 0.2, STONE, V.x, y - 0.12, V.z, 48);
  cyl(g, V.r - 1, V.r - 1, 0.21, '#f6e9ef', V.x, y - 0.11, V.z, 48);
  box(g, 3.2, 0.24, A.from - A.to + 8, '#e8588c', A.x, y - 0.1, (A.from + A.to) / 2);
  // Arches start well down the aisle, so no post stands between the camera and the cake.
  for (let z = A.to + 10; z <= A.from; z += 6) {
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
  for (let z = A.to + 13; z <= A.from; z += 6) lantern(A.x, y + 4.1, z, Math.round(z), 0.8);
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
