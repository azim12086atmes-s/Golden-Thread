import * as THREE from 'three';
import { ANIMAL_HEAD_GAP, HEAD_GAP } from '../characters/anatomy';
import type { Ctx } from './architecture';
import { M, archPanel, box, cone, cyl, sphere, tree } from './kit';
import type { RegionId } from './regions';

/**
 * The finer detail on each land's monument (owner: "detailing the external architecture look and
 * texturing the monuments"), laid over the landmark's main forms (architecture.ts): the carved,
 * painted and inlaid things that make each one itself — bells and stone lanterns at the pagoda,
 * painted dancheong under the palace gate's eaves, marble balustrades and bracket bands on the
 * Temple of Heaven, buttresses and tracery on the clock tower, polychrome marble on the Duomo,
 * pietra-dura bands on the tomb, statuettes on the gopuram, and so on. Figures follow the brief:
 * no faces, heads floating free.
 */
type Detail = (c: Ctx, o: { colliders: Array<{ x: number; z: number; r: number; h: number }> }) => void;

const ring = (n: number, f: (a: number, i: number) => void) => { for (let i = 0; i < n; i++) f((i / n) * Math.PI * 2, i); };

/** A flat ring (a torus lying down) at height y. */
function flatRing(c: Ctx, r: number, tube: number, col: string, y: number, glow = false): void {
  (glow ? c.glow : c.g).add(new THREE.TorusGeometry(r, tube, 5, Math.max(24, Math.round(r * 6))), col, M(0, y, 0, 0, 1, 1, 1, Math.PI / 2, 0));
}

/** A little statuette: a robed figure with its head floating free (no face). */
function figure(c: Ctx, x: number, y: number, z: number, h: number, col: string, headCol: string): void {
  cone(c.g, h * 0.22, h * 0.7, col, x, y, z, 6);
  sphere(c.g, h * 0.1, headCol, x, y + h * 0.7 + HEAD_GAP * h + h * 0.1, z, 6);
}

/** A seated guardian beast (a haetae, a sphinx): a crouched body, and its head floating just ahead. */
function beast(c: Ctx, x: number, y: number, z: number, s: number, ry: number, col: string, headCol = col): void {
  c.g.frame(x, y, z, ry, 1, () => {
    box(c.g, s * 0.8, s * 0.5, s * 1.4, col, 0, 0.4 * s, 0);
    box(c.g, s * 1, s * 0.4, s * 1.6, col, 0, 0, 0.1 * s);
    for (const sx of [-1, 1]) box(c.g, s * 0.22, s * 0.25, s * 0.5, col, sx * s * 0.3, 0, s * 0.95);
    sphere(c.g, s * 0.32, headCol, 0, s * 1.25, s * 0.55 + ANIMAL_HEAD_GAP * s * 4 + s * 0.3, 8);
  });
}

const DETAIL: Partial<Record<RegionId, Detail>> = {
  japan(c) {
    // Bells at every roof corner, railings round each tier's balcony.
    for (let i = 0; i < 5; i++) {
      const s = 8 * (1 - i * 0.12), y = 1 + i * 4.4, e = s * 0.85;
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        cyl(c.g, 0.02, 0.02, 0.5, '#3a2a22', sx * e, y + 3.2 - 0.3, sz * e, 3);
        cone(c.g, 0.16, 0.34, '#c9a24a', sx * e, y + 3.2 - 0.62, sz * e, 6);
      }
      if (i > 0) for (const [dx, dz, w, d] of [[0, s / 2 + 0.6, s + 1.2, 0.08], [0, -s / 2 - 0.6, s + 1.2, 0.08], [s / 2 + 0.6, 0, 0.08, s + 1.2], [-s / 2 - 0.6, 0, 0.08, s + 1.2]] as const) {
        box(c.g, w, 0.08, d, '#8a3a2a', dx, y + 0.8, dz);
        const n = Math.round(Math.max(w, d));
        for (let k = 0; k <= n; k++) box(c.g, 0.07, 0.8, 0.07, '#3a2a22', dx + (w > d ? -w / 2 + (k / n) * w : 0), y, dz + (d > w ? -d / 2 + (k / n) * d : 0));
      }
    }
    // Raked gravel round the pagoda, stepping stones to the torii, stone lanterns lining the way.
    box(c.g, 24, 0.04, 24, '#d8d2c4', 0, 0.01, 0);
    for (let z = 8; z < 26; z += 1.6) cyl(c.g, 0.55, 0.6, 0.08, '#8a8680', Math.sin(z) * 0.3, 0.03, z, 7);
    for (const x of [-3.6, 3.6]) for (const z of [10, 16, 22]) {
      box(c.g, 0.9, 0.3, 0.9, '#9a968e', x, 0, z);
      cyl(c.g, 0.16, 0.2, 1.1, '#9a968e', x, 0.3, z, 6);
      box(c.glow, 0.5, 0.45, 0.5, '#ffd08a', x, 1.4, z);
      cone(c.g, 0.6, 0.45, '#8a8680', x, 1.85, z, 4);
      sphere(c.g, 0.1, '#8a8680', x, 2.35, z, 5);
    }
    // The torii's sacred rope and its zigzag paper streamers.
    c.g.add(new THREE.CylinderGeometry(0.14, 0.14, 8.4, 6), '#e8d9a8', M(0, 5.7, 26, 0, 1, 1, 1, 0, Math.PI / 2));
    for (let i = 0; i < 4; i++) box(c.g, 0.25, 0.6, 0.02, '#ffffff', -2.4 + i * 1.6, 5, 26.1);
  },

  korea(c) {
    // Dancheong: bands of green, blue, red and white painted under both eaves, front and back.
    const DAN = ['#2f8a6a', '#3a6aa8', '#c23b2a', '#f4efe4', '#e2b43a'];
    for (const [y, half, z] of [[11.4, 15, 4.52], [18, 9, 3.02]] as const) for (const sz of [1, -1]) {
      for (let i = 0; i < Math.floor(half * 2 / 0.6); i++) box(c.g, 0.6, 0.5, 0.06, DAN[i % DAN.length], -half + 0.3 + i * 0.6, y, sz * z);
    }
    // Stone steps before each arch, and a pair of haetae guardians before the gate.
    for (const x of [-10, 0, 10]) for (let k = 0; k < 3; k++) box(c.g, 5.4, 0.25, 0.8, '#b8b0a4', x, k * 0.25 - 0.6, 6.4 + (2 - k) * 0.8);
    for (const x of [-15, 15]) { box(c.g, 3, 1.2, 3, '#a8a094', x, 0, 12); beast(c, x, 1.2, 12, 1.6, 0, '#b8b0a4'); }
    // Banner poles.
    for (const x of [-22, 22]) { cyl(c.g, 0.12, 0.15, 12, '#6b4a2a', x, 0, 10, 6); box(c.g, 0.05, 4, 1.6, x < 0 ? '#2f8a6a' : '#c23b2a', x, 7, 10.9); }
  },

  china(c) {
    // White marble balustrades round each terrace; a stair up on every side.
    for (let i = 0; i < 3; i++) {
      const R = 22 - i * 4 - 0.4, y = 1.4 * (i + 1);
      ring(Math.round(R * 2.2), (a) => cyl(c.g, 0.12, 0.14, 0.9, '#fbf8f0', Math.cos(a) * R, y, Math.sin(a) * R, 5));
      flatRing(c, R, 0.08, '#fbf8f0', y + 0.85);
    }
    ring(4, (a) => {
      for (let k = 0; k < 7; k++) {
        const r = 24 - k * 1.5;
        c.g.frame(Math.cos(a) * r, 0, Math.sin(a) * r, -a + Math.PI / 2, 1, () => box(c.g, 3.2, Math.min(4.2, 0.6 * (k + 1)), 1.6, '#f4f0e6', 0, 0, 0));
      }
    });
    // Painted bracket bands under each blue roof, gold rims round the eaves, a gilded finial.
    const DG = ['#2f8a6a', '#3a6aa8', '#e2b43a', '#c23b2a'];
    for (let i = 0; i < 3; i++) {
      const r = 7 - i * 1.8, y = 4.2 + i * 6.2 + 4;
      ring(Math.round(r * 7), (a, k) => box(c.g, 0.45, 0.4, 0.3, DG[k % DG.length], Math.cos(a) * (r + 0.15), y - 0.45, Math.sin(a) * (r + 0.15), -a + Math.PI / 2));
      flatRing(c, r + 2.2, 0.1, '#e2b43a', y + 0.05);
    }
    for (let k = 0; k < 4; k++) flatRing(c, 0.7 - k * 0.12, 0.08, '#e2b43a', 23 + k * 0.5);
    // Bronze incense burners on the top terrace, embers glowing.
    for (const x of [-9, 9]) {
      for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.4], [0, 0.5]]) cyl(c.g, 0.07, 0.07, 0.6, '#6a5a3a', x + dx, 4.2, 9 + dz, 4);
      cyl(c.g, 0.8, 0.6, 0.8, '#7a6a44', x, 4.8, 9, 10);
      cone(c.g, 0.7, 0.9, '#7a6a44', x, 5.6, 9, 10);
      sphere(c.glow, 0.25, '#ff7a3a', x, 5.55, 9, 6);
    }
  },

  norway(c) {
    // Tarred boards round the base, a carved portal of interlace round the door, iron lamps.
    for (let y = 0.4; y < 6; y += 0.5) for (const sz of [1, -1]) box(c.g, 14.1, 0.06, 0.05, '#2a1f1a', 0, y, sz * 5.02);
    for (let k = 0; k < 6; k++) c.g.add(new THREE.TorusGeometry(1.4 + k * 0.12, 0.05, 4, 16, Math.PI), k % 2 ? '#8a5a2a' : '#6a4424', M(0, 3, 5.1));
    for (const x of [-1.8, 1.8]) { cyl(c.g, 0.1, 0.1, 3, '#8a5a2a', x, 0, 5.12, 6); sphere(c.glow, 0.18, '#ffc46a', x, 3.4, 5.4, 6); }
  },

  switzerland(c) {
    // Stone quoins at the corners, an astronomical dial under the clock, flower boxes, a bell.
    for (let y = 0; y < 26; y += 1.2) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const big = Math.round(y / 1.2) % 2 === 0;
      box(c.g, big ? 1.4 : 0.9, 0.6, big ? 0.9 : 1.4, '#c9bca0', sx * 4.3, y, sz * 4.3);
    }
    c.glow.add(new THREE.CircleGeometry(2.2, 24), '#1f3f73', M(0, 15, 4.56));
    c.g.add(new THREE.TorusGeometry(2.2, 0.15, 5, 24), '#e2b43a', M(0, 15, 4.6));
    c.g.add(new THREE.TorusGeometry(1.3, 0.08, 5, 24), '#e2b43a', M(0, 15, 4.62));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; box(c.g, 0.12, 0.35, 0.05, '#e2b43a', Math.cos(a) * 1.8, 15 + Math.sin(a) * 1.8 - 0.17, 4.64); }
    for (const y of [7, 10]) {
      box(c.glow, 1.4, 1.8, 0.05, '#fff0c8', 0, y, 4.53);
      box(c.g, 1.8, 0.35, 0.5, '#8a5a36', 0, y - 0.35, 4.7);
      for (let k = 0; k < 6; k++) sphere(c.g, 0.13, k % 2 ? '#e8342a' : '#3f8a3a', -0.75 + k * 0.3, y, 4.8, 5);
    }
    cone(c.g, 0.5, 0.8, '#c9a24a', 0, 36.6, 0, 8);
  },

  london(c) {
    // Buttress ribs up the clock tower, gilded bands at the clock and belfry, tracery on the hall.
    ring(4, (a) => c.g.frame(0, 0, 0, a, 1, () => {
      for (const x of [-2.8, 2.8, -5.3, 5.3]) box(c.g, 0.45, 54, 0.35, '#cbb98c', x, 4, 5.6);
    }));
    for (const y of [57.6, 69.6]) box(c.g, 13, 0.45, 13, '#e2b43a', 0, y, 0);
    for (let i = 0; i < 36; i++) box(c.g, 0.14, 10.5, 0.08, '#c4b28a', -29 + i * 1.66, 2, 21.06);
    for (let i = 0; i < 12; i++) cone(c.g, 0.4, 2.4, '#d9c9a0', -27 + i * 5, 14, 7.2, 4);
    // Iron railings along the front, and gas lamps at the gate.
    for (let x = -30; x <= 30; x += 1) cyl(c.g, 0.04, 0.04, 1.3, '#1f1f24', x, 0, 24, 4);
    box(c.g, 61, 0.08, 0.08, '#1f1f24', 0, 1.2, 24);
    for (const x of [-6, 6]) { cyl(c.g, 0.1, 0.12, 3.6, '#1f1f24', x, 0, 24.6, 6); box(c.glow, 0.45, 0.6, 0.45, '#ffe0a0', x, 3.6, 24.6); }
  },

  newyork(c) {
    // Art-deco piers up each setback, glowing chevrons in the crown, a red light on the mast.
    let y = 0, w = 40;
    for (let i = 0; i < 5; i++) {
      const h = 50 - i * 8;
      ring(4, (a) => c.g.frame(0, y, 0, a, 1, () => {
        for (let x = -w / 2 + 2; x <= w / 2 - 2; x += w / 8) box(c.g, 0.6, h - 1, 0.4, '#b8b0a2', x, 0.5, w / 2 + 0.1);
      }));
      y += h; w *= 0.74;
    }
    const top = w / 0.74;
    ring(4, (a) => c.glow.frame(0, y - 6, 0, a, 1, () => {
      for (let k = 0; k < 3; k++) {
        const s = 3 - k * 0.8;
        c.glow.add(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-s, 0, 0), new THREE.Vector3(s, 0, 0), new THREE.Vector3(0, s * 0.9, 0)]).setIndex([0, 1, 2]).toNonIndexed(), ['#ffe04a', '#ff4ad0', '#4ad8ff'][k], M(0, k * 1.1, top / 2 + 0.15));
      }
    }));
    sphere(c.glow, 0.5, '#ff3a3a', 0, y + 56, 0, 6);
  },

  renaissance(c) {
    // Polychrome marble: green and rose panels on the front and the campanile, a rose window, portals.
    const G = '#3f6a52', ROSE = '#d88a8a';
    for (let row = 0; row < 5; row++) for (let i = 0; i < 6; i++) box(c.g, 2.2, 3, 0.06, (row + i) % 2 ? G : ROSE, -7.5 + i * 3, 2 + row * 4, 48.03);
    for (let i = 0; i < 6; i++) box(c.g, 0.25, 21, 0.08, '#fbf3e0', -9 + i * 3.6, 0.5, 48.06);
    c.glow.add(new THREE.CircleGeometry(2.8, 24), '#ffd08a', M(0, 16.5, 48.1));
    c.g.add(new THREE.TorusGeometry(3, 0.25, 5, 24), '#fbf3e0', M(0, 16.5, 48.12));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; box(c.g, 0.08, 2.8, 0.05, '#fbf3e0', Math.cos(a) * 1.4, 16.5 + Math.sin(a) * 1.4 - 1.4, 48.14); }
    for (const x of [-6, 0, 6]) archPanel(c.g, x === 0 ? 3.4 : 2.4, x === 0 ? 6 : 4.5, '#3a2a22', x, 0, 48.08);
    c.g.frame(26, 0, 30, 0, 1, () => ring(4, (a) => c.g.frame(0, 0, 0, a, 1, () => {
      for (let y = 2; y < 66; y += 4) box(c.g, 3.4, 2.6, 0.05, Math.round(y / 4) % 2 ? G : ROSE, 0, y, 4.03);
    })));
  },

  vintage(c) {
    // Horses on the carousel's poles, rising and falling in a ring (heads floating free), and bunting.
    ring(12, (a, i) => {
      const x = Math.cos(a) * 7, z = Math.sin(a) * 7, y = 2.4 + (i % 2) * 0.6;
      c.g.frame(x, y, z, -a, 1, () => {
        const col = ['#ffffff', '#ffc4dc', '#bfe3d9'][i % 3];
        box(c.g, 0.5, 0.55, 1.5, col, 0, 0, 0);
        for (const [lx, lz] of [[-0.18, 0.55], [0.18, 0.55], [-0.18, -0.55], [0.18, -0.55]]) box(c.g, 0.12, 0.7, 0.12, col, lx, -0.7, lz);
        box(c.g, 0.3, 0.7, 0.35, col, 0, 0.4, 0.85);
        sphere(c.g, 0.24, col, 0, 1.25 + ANIMAL_HEAD_GAP, 1.05, 7);
        box(c.g, 0.55, 0.12, 0.7, '#e2b43a', 0, 0.55, 0); // the saddle
        cone(c.g, 0.12, 0.8, '#e8c86a', 0, 0.1, -0.85, 5);
      });
    });
    ring(20, (a) => cone(c.g, 0.3, 0.6, ['#ff8fb8', '#ffd24a', '#8fd0ff', '#b8ff9a'][Math.round(a * 3) % 4], Math.cos(a) * 10.7, 6.4, Math.sin(a) * 10.7, 3));
  },

  islamic(c) {
    // Tile friezes along the prayer hall and round the drum; muqarnas steps under the dome; crescents.
    for (let i = 0; i < 80; i++) box(c.g, 0.6, 0.6, 0.05, i % 2 ? '#2f6f9a' : '#fbf7ee', -24 + i * 0.6 + 0.3, 12.4, 1.03);
    for (let i = 0; i < 80; i++) box(c.g, 0.6, 0.3, 0.05, i % 3 ? '#3a9a7a' : '#d4af37', -24 + i * 0.6 + 0.3, 13, 1.03);
    ring(48, (a, i) => box(c.g, 0.9, 0.5, 0.4, i % 2 ? '#2f6f9a' : '#fbf7ee', Math.cos(a) * 11.1, 15.2, -12 + Math.sin(a) * 11.1, -a + Math.PI / 2));
    ring(32, (a, i) => box(c.g, 0.7, 0.35, 0.5, i % 2 ? '#e8dcc0' : '#d4af37', Math.cos(a) * 11.3, 14.6, -12 + Math.sin(a) * 11.3, -a + Math.PI / 2));
    for (const [x, z] of [[-30, -28], [30, -28], [-30, 32], [30, 32]] as const) c.g.add(new THREE.TorusGeometry(0.5, 0.1, 4, 12, Math.PI * 1.4), '#d4af37', M(x, 53.2, z, 0, 1, 1, 1, 0, Math.PI * 0.8));
    // Columns carrying the courtyard arcade.
    for (let i = 0; i < 13; i++) cyl(c.g, 0.35, 0.4, 5.4, '#e8dcc0', -32.7 + i * 5.4, 0, 36, 8);
  },

  middleeast(c) {
    // Palm-trunk beams jutting from the mud walls in rows, studded doors, palms in the courtyard.
    for (let t = -24; t <= 24; t += 2.4) for (const y of [3, 6.5]) {
      c.g.add(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 5), '#6b4a2a', M(t, y, -27.2, 0, 1, 1, 1, Math.PI / 2, 0));
      c.g.add(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 5), '#6b4a2a', M(-27.2, y, t, 0, 1, 1, 1, 0, Math.PI / 2));
    }
    for (const [x, z, ry] of [[-26, -21.5, 0], [26, -21.5, 0]] as const) {
      box(c.g, 2.4, 3.6, 0.2, '#6b4424', x, 0, z, ry);
      for (let k = 0; k < 12; k++) sphere(c.g, 0.06, '#d4af37', x - 0.9 + (k % 4) * 0.6, 0.6 + Math.floor(k / 4) * 1.1, z + 0.12, 4);
    }
    for (const [x, z] of [[-14, 14], [14, 16], [-16, -14], [12, -16]] as const) tree(c.g, 'palm', x, 0, z, 1.1, () => c.rng.next());
  },

  desert(c) {
    // Before the great tent: rugs, cushions round a fire bowl, brass coffee pots.
    c.g.frame(0, 0, -40, 0, 1, () => c.glow.frame(0, 0, -40, 0, 1, () => {
      for (let i = 0; i < 3; i++) box(c.g, 4.5, 0.04, 3, ['#8c3b2a', '#2f4a6b', '#d9a066'][i], -5 + i * 5, 0.06, 20);
      ring(10, (a, i) => box(c.g, 1, 0.45, 0.8, ['#c23b2a', '#e2b43a', '#2f6f9a'][i % 3], Math.cos(a) * 4, 0, 22 + Math.sin(a) * 4, -a));
      cyl(c.g, 0.9, 0.6, 0.5, '#6a5a44', 0, 0, 22, 10);
      cone(c.glow, 0.5, 0.9, '#ff8a2a', 0, 0.5, 22, 6);
      for (const x of [-1.5, 1.5]) { cyl(c.g, 0.2, 0.28, 0.5, '#c9a24a', x, 0, 23.6, 8); cone(c.g, 0.18, 0.3, '#c9a24a', x, 0.5, 23.6, 8); }
    }));
  },

  egypt(c, o) {
    // Hieroglyph bands down the obelisk, a gilded tip; lintels and painted capitals on the colonnade.
    ring(4, (a) => c.g.frame(0, 1, 26, a + Math.PI / 4, 1, () => {
      for (let y = 2; y < 22; y += 0.9) box(c.g, 0.35, 0.5, 0.05, '#7a5a30', (y % 1.8 > 0.9 ? -0.2 : 0.2) * (1 - y / 26), y, 1.12 * (1 - y / 26) + 0.02);
    }));
    cone(c.g, 0.35, 1.5, '#d4af37', 0, 25.4, 26, 4);
    for (let i = 0; i < 10; i++) {
      const z = 44 + i * 5;
      box(c.g, 18, 1, 2.2, '#d9b878', 0, 11.2, z);
      for (const x of [-8, 8]) for (let k = 0; k < 3; k++) cyl(c.g, 1.12, 1.12, 0.18, ['#2f6f9a', '#c23b2a', '#3f8a3a'][k], x, 8.4 + k * 0.4, z, 10);
    }
    // A sphinx guarding the colonnade's head: a crouched lion, its head floating free, no face.
    c.g.frame(-26, 0, 34, Math.PI / 2, 1, () => {
      box(c.g, 5, 3.2, 12, '#e0c48a', 0, 0, 0);
      for (const sx of [-1, 1]) box(c.g, 1.4, 1.2, 4.6, '#e0c48a', sx * 1.6, 0, 7.4);
      box(c.g, 3.4, 3, 3, '#e0c48a', 0, 3, 4.2);
      sphere(c.g, 1.5, '#d9b878', 0, 6 + ANIMAL_HEAD_GAP * 6 + 1.5, 4.6, 8);
      box(c.g, 3.6, 2.4, 0.4, '#2f6f9a', 0, 5.4 + ANIMAL_HEAD_GAP * 6, 4.4); // the striped headdress behind
    });
    o.colliders.push({ x: -26, z: 34, r: 4, h: 9 }, { x: -20, z: 34, r: 3, h: 9 }, { x: -32, z: 34, r: 3, h: 5 });
  },

  indianorth(c) {
    // White trim framing every little window, and a finial on each dome.
    for (let r = 0; r < 9; r++) {
      const w = 60 - r * 5.2, y = r * 4.2, n = Math.floor(w / 3.4), z = 5 - r * 0.3 + 1.33;
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + 1.7 + i * 3.4;
        box(c.g, 1.5, 0.12, 0.05, '#ffffff', x, y + 2.9, z);
        for (const sx of [-1, 1]) box(c.g, 0.1, 1.8, 0.05, '#ffffff', x + sx * 0.7, y + 1.1, z);
        cone(c.g, 0.1, 0.4, '#e2b43a', x, y + 4.4, z - 0.7, 5);
      }
    }
  },

  indiasouth(c) {
    // Painted statuettes crowding each tier of the tower (heads floating free), a lamp pillar before it.
    let y = 8, w = 24, d = 16;
    for (let t = 0; t < 9; t++) {
      for (let i = 0; i < 8; i++) for (const sz of [1, -1]) figure(c, -w / 2 + w * (i + 0.5) / 8, y + 0.2, sz * (d / 2 + 0.5), 1.8, ['#e2b43a', '#2f7a5a', '#c23b2a', '#5a8ab5'][(i + t) % 4], '#e8b890');
      y += 3.2; w *= 0.87; d *= 0.86;
    }
    c.g.frame(0, 0, 20, 0, 1, () => c.glow.frame(0, 0, 20, 0, 1, () => {
      cyl(c.g, 0.4, 0.6, 9, '#c9a24a', 0, 0, 0, 10);
      for (let k = 0; k < 7; k++) {
        const r = 1.6 - k * 0.15, yy = 1.5 + k * 1.1;
        flatRing(c, r, 0.06, '#c9a24a', yy);
        ring(10, (a) => sphere(c.glow, 0.08, '#ffb84a', Math.cos(a) * r, yy + 0.08, Math.sin(a) * r, 4));
      }
    }));
  },

  mughal(c) {
    // Pietra-dura bands of green, red and black inlay round the tomb, and on the great platform's edge.
    c.g.frame(0, 4, -30, Math.PI / 8, 1, () => {
      for (const [y, col] of [[1, '#2f7a5a'], [1.4, '#b5552e'], [11, '#2f7a5a'], [21, '#b5552e'], [21.4, '#2a2a2a']] as const) {
        c.g.add(new THREE.CylinderGeometry(17.08, 17.08, 0.18, 8, 1, true), col, M(0, y, 0));
      }
    });
    for (const [x, z, w, dd] of [[0, 5.05, 70, 0.05], [0, -65.05, 70, 0.05], [35.05, -30, 0.05, 70], [-35.05, -30, 0.05, 70]] as const) {
      box(c.g, w, 0.3, dd, '#2f7a5a', x, 2.6, z);
      box(c.g, w, 0.2, dd, '#b5552e', x, 3.2, z);
    }
  },

  indonesia(c) {
    // Relief panels along every terrace wall; kala-arched gates at the top of each stair.
    let s = 64;
    for (let i = 0; i < 5; i++) {
      const y = i * 4 + 1.2;
      ring(4, (a) => c.g.frame(0, 0, 0, a, 1, () => {
        for (let k = 0; k < Math.floor(s / 3); k++) box(c.g, 2.2, 1.6, 0.08, '#7a746a', -s / 2 + 1.5 + k * 3, y, s / 2 + 0.3);
      }));
      s -= 9;
    }
    ring(4, (a) => c.g.frame(Math.sin(a) * 11, 20, Math.cos(a) * 11, a, 1, () => {
      archPanel(c.g, 3, 4.4, '#6a645a', 0, 0, 0, 0, 0.6);
      box(c.g, 4.2, 1.2, 0.8, '#8a8478', 0, 4.4, 0);
    }));
  },

  aurora(c) {
    // Ice sculptures round the observatory, snow lanterns glowing between them.
    ring(8, (a, i) => {
      const x = Math.cos(a) * 16, z = Math.sin(a) * 16;
      c.g.add(new THREE.OctahedronGeometry(1).scale(0.6, 1.8 + (i % 3) * 0.5, 0.6), '#cfe8ff', M(x, 1.6, z, a));
      box(c.g, 0.7, 0.7, 0.7, '#f4f8ff', x + 3, 0, z);
      sphere(c.glow, 0.2, '#ffcf7a', x + 3, 0.95, z, 5);
    });
  },
};

/** Lay the land's finer monument detail over its main forms. */
export function detailLandmark(c: Ctx, land: RegionId, o: { colliders: Array<{ x: number; z: number; r: number; h: number }> }): void {
  DETAIL[land]?.(c, o);
}
