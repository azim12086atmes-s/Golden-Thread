import * as THREE from 'three';
import type { Ctx, Footprint } from './architecture';
import { LAND_STYLE, doorway, frieze, landRoof, win, type LandStyle } from './buildings';
import { waterBasin } from './flowWater';
import { M, archPanel, box, cone, cyl, dome, sphere } from './kit';

/**
 * The care-and-learning institutes, built for real in every land's own architecture (its wall,
 * trim and roof colours, its roof form and its arch): the soup kitchen, the clinic, the school
 * and the library, each in four stages that grow from a stall to a great institution.
 *
 * Local frame: origin at the base centre, the entrance facing +z and kept clear; everything within
 * the stage's radius (5, 8, 12, 16 m). Windows and lamps in the glow builder.
 *
 * Medicine is marked with a green crescent (and the pharmacy with a green herb leaf), never a cross.
 */

const STOREY = 3.3;
interface K { c: Ctx; st: LandStyle; wall: string; wall2: string; trim: string; roof: string }

function kit(c: Ctx): K {
  const walls = c.s.walls;
  return { c, st: LAND_STYLE[c.s.id], wall: walls[0], wall2: walls[1 % walls.length], trim: c.s.trims[0], roof: c.s.roofs[0] };
}

/** Draw fn in both builders' frames at (x, y, z) turned by ry. */
function at(k: K, x: number, y: number, z: number, ry: number, fn: () => void): void {
  k.c.g.frame(x, y, z, ry, 1, () => k.c.glow.frame(x, y, z, ry, 1, fn));
}

/**
 * A building block w × d, `storeys` high, its front facing +z (in its own frame at x, z turned by
 * ry): walls, a plinth, a cornice and frieze, rows of windows on front, back and sides, a doorway
 * when asked, and the land's roof. Returns its full height.
 */
function block(k: K, x: number, z: number, w: number, d: number, storeys: number, o: { ry?: number; door?: boolean; wall?: string; roof?: boolean } = {}): number {
  const h = storeys * STOREY, wall = o.wall ?? k.wall;
  let top = h;
  at(k, x, 0, z, o.ry ?? 0, () => {
    const { c, st } = k;
    box(c.g, w + 0.3, 0.45, d + 0.3, '#d8cfbd', 0, 0, 0); // plinth
    box(c.g, w, h, d, wall, 0, 0.45, 0);
    box(c.g, w + 0.35, 0.3, d + 0.35, k.trim, 0, h + 0.45, 0); // cornice
    frieze(c, st, w * 0.94, h - 0.2, d / 2 + 0.02);
    for (let s = 0; s < storeys; s++) {
      const y = 0.45 + s * STOREY + 1.0;
      const nf = Math.max(1, Math.floor(w / 2.6)), ns = Math.max(1, Math.floor(d / 2.8));
      for (let i = 0; i < nf; i++) {
        const wx = -w / 2 + (w / nf) * (i + 0.5);
        if (o.door && s === 0 && Math.abs(wx) < 1.4) continue;
        win(c, st, wx, y, d / 2 + 0.02);
        win(c, st, wx, y, -d / 2 - 0.02, Math.PI);
      }
      for (let i = 0; i < ns; i++) {
        const wz = -d / 2 + (d / ns) * (i + 0.5);
        for (const sx of [-1, 1]) win(c, st, sx * (w / 2 + 0.02), y, wz, sx * Math.PI / 2);
      }
    }
    if (o.door) doorway(c, st, 0, d / 2 + 0.02, k.trim);
    // Round roof forms (cones, domes, onions, pyramids) suit square blocks; a long block takes a hip roof.
    const round = st.roof === 'cone' || st.roof === 'pyramid' || st.roof === 'dome' || st.roof === 'onion';
    const rs = round && Math.max(w, d) / Math.min(w, d) > 1.3 ? { ...st, roof: 'hip' as const } : st;
    if (o.roof !== false) top = h + 0.75 + landRoof(c, rs, w, d, h + 0.75, k.roof);
  });
  return top;
}

/** A green crescent on a round plaque — the sign of care for the sick. */
function crescent(k: K, x: number, y: number, z: number, s: number, ry = 0): void {
  at(k, x, y, z, ry, () => {
    k.c.g.add(new THREE.CylinderGeometry(s, s, 0.08, 24).rotateX(Math.PI / 2), '#fbf7ee', M(0, 0, 0));
    k.c.glow.add(new THREE.TorusGeometry(s * 0.55, s * 0.16, 6, 20, Math.PI * 1.25), '#2fbf6a', M(0, 0, 0.06, 0, 1, 1, 1, 0, Math.PI * 0.62));
    k.c.glow.add(new THREE.SphereGeometry(s * 0.1, 6, 4), '#2fbf6a', M(s * 0.32, s * 0.18, 0.06));
  });
}
/** A green herb leaf — the pharmacy's sign. */
function herbLeaf(k: K, x: number, y: number, z: number, s: number): void {
  at(k, x, y, z, 0, () => {
    k.c.g.add(new THREE.CylinderGeometry(s, s, 0.08, 20).rotateX(Math.PI / 2), '#fbf7ee', M(0, 0, 0));
    k.c.glow.add(new THREE.SphereGeometry(s * 0.6, 10, 6), '#3ac870', M(0, 0, 0.05, 0, 0.5, 1, 0.12, 0, 0.5));
    k.c.glow.add(new THREE.BoxGeometry(0.03, s * 1.1, 0.02), '#1f8a4a', M(0, 0, 0.1, 0, 1, 1, 1, 0, 0.5));
  });
}
/** A long table with benches either side. */
function tableRow(k: K, x: number, z: number, len: number, ry = 0): void {
  at(k, x, 0, z, ry, () => {
    const g = k.c.g;
    box(g, len, 0.08, 0.9, '#8a5a36', 0, 0.74, 0);
    for (const s of [-1, 1]) {
      box(g, len, 0.06, 0.35, '#7a4a2a', 0, 0.45, s * 0.8);
      for (const e of [-1, 1]) box(g, 0.08, 0.45, 0.3, '#5a3a22', e * (len / 2 - 0.2), 0, s * 0.8);
    }
    for (const e of [-1, 1]) box(g, 0.1, 0.74, 0.7, '#5a3a22', e * (len / 2 - 0.25), 0, 0);
    for (let i = 0; i < Math.floor(len / 0.9); i++) cyl(g, 0.14, 0.1, 0.1, '#e8dcc6', -len / 2 + 0.45 + i * 0.9, 0.82, 0.2 * (i % 2 ? 1 : -1), 8); // bowls
  });
}
/** A cooking pot on a fire, steaming. */
function pot(k: K, x: number, z: number, s = 1): void {
  const { g, glow } = k.c;
  for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2; cyl(g, 0.04, 0.04, 0.7 * s, '#3a3a3a', x + Math.cos(a) * 0.45 * s, 0, z + Math.sin(a) * 0.45 * s, 4); }
  cyl(glow, 0.3 * s, 0.4 * s, 0.25, '#ff8a3a', x, 0, z, 8);
  cyl(g, 0.5 * s, 0.4 * s, 0.6 * s, '#5a5a60', x, 0.45 * s, z, 12);
  for (let i = 0; i < 4; i++) sphere(g, (0.2 + i * 0.08) * s, '#f4f4f4', x + Math.sin(i * 1.7) * 0.15, 1.3 * s + i * 0.35 * s, z, 6);
}
/** A striped awning over a front, at height y, reaching `out` metres forward. */
function awning(k: K, w: number, y: number, z: number, out: number): void {
  const [a, b] = k.st.frieze;
  const n = Math.max(3, Math.round(w / 0.7));
  for (let i = 0; i < n; i++) {
    k.c.g.add(new THREE.BoxGeometry(w / n, 0.06, out), i % 2 ? a : b, M(-w / 2 + (w / n) * (i + 0.5), y, z + out / 2, 0, 1, 1, 1, 0.28, 0));
  }
}
/** Shelves of books (coloured spines). */
function shelves(k: K, x: number, z: number, w: number, h: number, ry = 0): void {
  at(k, x, 0, z, ry, () => {
    const g = k.c.g, cols = ['#8a2a3a', '#2f4a8a', '#3a7a4a', '#c8a040', '#6a3a7a', '#a8502a'];
    box(g, w, h, 0.45, '#6a4a30', 0, 0, 0);
    for (let r = 0; r < Math.floor(h / 0.45); r++) for (let i = 0; i < Math.floor(w / 0.12); i++) {
      box(g, 0.1, 0.3 + ((i * 7) % 3) * 0.04, 0.05, cols[(i + r * 2) % cols.length], -w / 2 + 0.08 + i * 0.12, 0.1 + r * 0.45, 0.23);
    }
  });
}
/** A little bell cupola on a roof ridge. */
function cupola(k: K, x: number, y: number, z: number): void {
  const { g, glow } = k.c;
  for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) cyl(g, 0.07, 0.07, 1.4, '#fbf7ee', x + dx, y, z + dz, 5);
  box(g, 1.6, 0.2, 1.6, k.trim, x, y + 1.4, z);
  cone(g, 1.1, 1.1, k.roof, x, y + 1.6, z, 4, Math.PI / 4);
  sphere(g, 0.25, '#d4af37', x, y + 0.9, z, 8);
  sphere(glow, 0.08, '#fff2c8', x, y + 2.8, z, 5);
}
/** A tent: an open canopy on four poles (a stall, a tent school). */
function canopy(k: K, w: number, d: number, h: number, col: string): void {
  const g = k.c.g;
  for (const [x, z] of [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2]]) cyl(g, 0.06, 0.07, h, '#6b4a2a', x, 0, z, 5);
  g.add(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.3, 1.2, 4).rotateY(Math.PI / 4).translate(0, 0.6, 0), col, M(0, h, 0, 0, w / Math.hypot(w, d) * 1.414, 1, d / Math.hypot(w, d) * 1.414));
  box(g, w + 0.2, 0.25, 0.04, k.st.frieze[0], 0, h - 0.25, d / 2);
}
/** A walled courtyard garden with a fountain. */
function courtGarden(k: K, x: number, z: number, w: number, d: number): void {
  const g = k.c.g;
  box(g, w, 0.06, d, '#cfc4a8', x, 0.02, z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    box(g, w * 0.36, 0.12, d * 0.36, '#6aa84f', x + sx * w * 0.24, 0.05, z + sz * d * 0.24);
    cyl(g, 0.1, 0.12, 1.4, '#6b5540', x + sx * w * 0.24, 0.1, z + sz * d * 0.24, 5);
    sphere(g, 0.8, '#4f8c42', x + sx * w * 0.24, 1.9, z + sz * d * 0.24, 7, 0.9);
  }
  waterBasin(k.c, x, 0, z, Math.min(w, d) * 0.12, { kerb: 0.5, jetHeight: 1 });
}

// ─────────────────────────── the four kinds, four stages each ───────────────────────────

function kitchen(k: K, s: 0 | 1 | 2 | 3): Footprint {
  const { g, glow } = k.c;
  switch (s) {
    case 0: // A soup stall: a counter under a canopy, a big pot, a bench for the queue.
      canopy(k, 3.4, 2.4, 2.4, k.st.frieze[0]);
      box(g, 3, 0.95, 0.7, '#8a5a36', 0, 0, 0.3);
      pot(k, -0.8, -0.5, 0.9);
      for (let i = 0; i < 3; i++) cyl(g, 0.14, 0.1, 0.12, '#e8dcc6', 0.4 + i * 0.35, 0.95, 0.3, 8);
      box(g, 2.6, 0.08, 0.4, '#7a4a2a', 0, 0.45, 2.8);
      sphere(glow, 0.14, '#ffb84a', 0, 2.2, 1.1, 6);
      return { r: 2.6, h: 3.8 };
    case 1: { // A soup kitchen: a hall with a steaming chimney, long tables under a pergola beside it.
      const top = block(k, -1.2, -0.5, 7, 6, 1, { door: true });
      box(g, 0.9, 3, 0.9, k.wall2, -3.4, top - 1, -2.2);
      for (let i = 0; i < 4; i++) sphere(g, 0.35 + i * 0.1, '#f2f2f2', -3.4 + i * 0.2, top + 2.2 + i * 0.5, -2.2, 6);
      awning(k, 5, 3, 2.5, 1.4);
      for (let i = 0; i < 4; i++) cyl(g, 0.07, 0.07, 2.6, '#6b4a2a', 3.8 + (i % 2) * 2.4, 0, -2 + Math.floor(i / 2) * 4, 5);
      for (let i = 0; i < 5; i++) box(g, 0.12, 0.12, 4.4, '#6b4a2a', 3.4 + i * 0.7, 2.6, 0);
      tableRow(k, 5, 0, 3.4, Math.PI / 2);
      return { r: 5.4, h: top + 1 };
    }
    case 2: { // A community kitchen: the kitchen, a taller dining hall, a pantry, tables outside.
      const t1 = block(k, -4.5, -1, 6, 7, 1, { wall: k.wall2 });
      const t2 = block(k, 2.2, -1, 8, 9, 2, { door: true });
      block(k, -4.5, 5, 4, 3, 1, { wall: k.wall2 });
      box(g, 1, 3.5, 1, k.wall2, -6.4, t1 - 1.5, -3.5);
      for (let i = 0; i < 4; i++) sphere(g, 0.4 + i * 0.1, '#f2f2f2', -6.4 + i * 0.2, t1 + 2.3 + i * 0.5, -3.5, 6);
      awning(k, 6, 3, 3.6, 1.6);
      tableRow(k, 8.5, 4, 3.6, Math.PI / 2);
      tableRow(k, -8.5, 1, 3.6, Math.PI / 2);
      pot(k, -3, 5.2 + 2.2, 0.8);
      return { r: 8.5, h: Math.max(t1, t2) + 1 };
    }
    default: { // A food bank and kitchen: kitchen and dining hall, a warehouse with a loading bay, crates.
      const t1 = block(k, -6, -2, 8, 10, 2, { wall: k.wall2 });
      const t2 = block(k, 3.5, -2, 9, 11, 2, { door: true });
      // The warehouse: a long shed with roll-up doors and a loading bay.
      at(k, 0, 0, -10.2, 0, () => {
        box(g, 16, 5.2, 5, '#b8b0a0', 0, 0, 0);
        k.c.g.add(new THREE.CylinderGeometry(2.7, 2.7, 16.4, 16, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), k.roof, M(0, 5.2, 0, 0, 1, 0.45, 1));
        for (let i = 0; i < 3; i++) box(g, 3, 3.4, 0.1, '#7a7a80', -5 + i * 5, 0, -2.52);
        box(g, 16, 1, 1.2, '#a8a090', 0, 0, -3.1);
      });
      for (let i = 0; i < 8; i++) box(g, 1, 0.8, 1, '#b08a5a', -12 + (i % 4) * 1.2, Math.floor(i / 4) * 0.8, 6);
      awning(k, 7, 3.2, 3.5, 1.8);
      tableRow(k, 11, 5, 4, Math.PI / 2);
      tableRow(k, 13.5, 5, 4, Math.PI / 2);
      for (let i = 0; i < 4; i++) sphere(g, 0.45 + i * 0.1, '#f2f2f2', -9 + i * 0.2, t1 + 1 + i * 0.5, -5, 6);
      sphere(glow, 0.2, '#ffb84a', 0, 3.3, 5.2, 6);
      return { r: 13, h: Math.max(t1, t2) + 1 };
    }
  }
}

function clinic(k: K, s: 0 | 1 | 2 | 3): Footprint {
  const { g } = k.c;
  switch (s) {
    case 0: { // A first-aid post: a small cabin, a bed under a canopy, the crescent sign.
      const top = block(k, -0.6, -0.8, 3.6, 3, 1, { door: true, wall: '#fbf7ee' });
      at(k, 1.9, 0, 1.4, 0, () => canopy(k, 2.2, 2, 2.2, '#dff3e6'));
      box(g, 1.8, 0.5, 0.8, '#e8e8f0', 1.9, 0, 1.4); box(g, 0.5, 0.15, 0.7, '#ffffff', 1.3, 0.5, 1.4);
      crescent(k, -0.6, 2.9, 0.9, 0.5);
      return { r: 3.2, h: top + 0.5 };
    }
    case 1: { // A clinic: a waiting porch with benches, treatment rooms, the crescent over the door.
      const top = block(k, 0, -1, 10, 7, 1, { door: true, wall: '#fbf7ee' });
      for (const x of [-4, -1.3, 1.3, 4]) cyl(g, 0.14, 0.16, 3, k.trim, x, 0, 3.4, 8);
      box(g, 9, 0.25, 2.4, k.roof, 0, 3, 3.4);
      for (const x of [-3, 3]) box(g, 1.8, 0.45, 0.45, '#8a5a36', x, 0, 3.8);
      crescent(k, 0, 3.8, 4.7, 0.6);
      return { r: 7.2, h: top + 0.5 };
    }
    case 2: { // A health centre: two storeys with wings, a pharmacy with the herb leaf, a garden.
      const top = block(k, 0, -2, 12, 8, 2, { door: true, wall: '#fbf7ee' });
      block(k, -8.2, 0, 4.4, 9, 1, { wall: k.wall });
      block(k, 8.2, 0, 4.4, 9, 1, { wall: k.wall });
      crescent(k, 0, top - 1.2, 2.1, 0.9);
      herbLeaf(k, 8.2, 3.2, 4.6, 0.5);
      for (const x of [-4, 4]) { box(g, 3, 0.4, 2, '#6aa84f', x, 0, 6.5); sphere(g, 0.7, '#4f8c42', x, 1.1, 6.5, 7); }
      return { r: 11, h: top + 0.5 };
    }
    default: { // A hospital: a main block and two wards round a garden courtyard, a carriage porch.
      const top = block(k, 0, -8, 16, 8, 3, { door: true, wall: '#fbf7ee' });
      block(k, -10, 1, 6, 14, 2, { ry: 0, wall: k.wall });
      block(k, 10, 1, 6, 14, 2, { ry: 0, wall: k.wall });
      courtGarden(k, 0, 1.5, 12, 9);
      // The porte-cochère: a canopy over the drive at the main door, on columns.
      for (const [x, z] of [[-3.5, -1.5], [3.5, -1.5], [-3.5, 0.8], [3.5, 0.8]]) cyl(g, 0.2, 0.22, 3.6, k.trim, x, 0, z - 2.2, 8);
      box(g, 8.6, 0.35, 3.8, k.roof, 0, 3.6, -2.6);
      crescent(k, 0, top - 1.5, -3.9, 1.3);
      herbLeaf(k, -10, 3.4, 8.1, 0.55);
      return { r: 15.5, h: top + 0.5 };
    }
  }
}

function school(k: K, s: 0 | 1 | 2 | 3): Footprint {
  const { g, glow } = k.c;
  switch (s) {
    case 0: { // A tent school: an open tent, a blackboard, mats and cushions.
      canopy(k, 5, 4, 2.6, k.st.frieze[1]);
      box(g, 2.4, 1.3, 0.1, '#2a3a2e', 0, 0.9, -1.9); box(g, 2.6, 0.1, 0.12, '#8a5a36', 0, 0.85, -1.85);
      for (let i = 0; i < 6; i++) {
        const x = -1.8 + (i % 3) * 1.8, z = -0.4 + Math.floor(i / 3) * 1.4;
        box(g, 1.2, 0.04, 0.8, ['#c23b2a', '#2f6f9a', '#e2b43a'][i % 3], x, 0.02, z);
        box(g, 0.4, 0.14, 0.4, ['#e8576a', '#7fb35a', '#c38fd9'][i % 3], x, 0.06, z - 0.2);
      }
      sphere(glow, 0.12, '#fff2c8', 0, 2.4, 0, 6);
      return { r: 3.4, h: 4 };
    }
    case 1: { // A schoolhouse: classrooms, a bell cupola, a fenced yard with a swing.
      const top = block(k, 0, -1.5, 11, 7, 1, { door: true });
      cupola(k, 0, top - 0.4, -1.5);
      for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) box(g, 0.08, 0.9, 0.08, '#fbf7ee', sx * (2.6 + i * 0.8), 0, 5.6);
      for (const sx of [-1, 1]) box(g, 4.2, 0.08, 0.06, '#fbf7ee', sx * 4.6, 0.75, 5.6);
      for (const x of [-6.8, -4.4]) cyl(g, 0.07, 0.07, 2.4, '#8a5a36', x, 0, 4.2, 5);
      box(g, 2.6, 0.1, 0.1, '#8a5a36', -5.6, 2.4, 4.2);
      box(g, 0.6, 0.06, 0.25, '#c23b2a', -5.6, 0.6, 4.2);
      return { r: 7.6, h: top + 3 };
    }
    case 2: { // A madrasa / college: four ranges of classrooms round a court, a tall entrance arch.
      const top = block(k, 0, -7, 14, 4.5, 2);
      block(k, -7.5, -0.5, 4.5, 10, 2);
      block(k, 7.5, -0.5, 4.5, 10, 2);
      for (const x of [-6, 6]) block(k, x, 6.5, 4, 3, 1);
      // The iwan: a tall arched gateway in the front range's gap.
      at(k, 0, 0, 7.5, 0, () => {
        box(g, 7, 8, 3, k.wall2, 0, 0, 0);
        archPanel(g, 4.2, 6.2, '#3a2a22', 0, 0, 1.52, 0, 0.2, k.st.arch === 'pointed');
        archPanel(g, 5, 7, k.trim, 0, 0, 1.5, 0, 0.12, k.st.arch === 'pointed');
        box(g, 7.4, 0.4, 3.4, k.trim, 0, 8, 0);
      });
      courtGarden(k, 0, -0.5, 9, 7.5);
      return { r: 11.5, h: Math.max(top, 9) };
    }
    default: { // A university: halls round a quadrangle, a domed library, a clock tower.
      const top = block(k, 0, -10.5, 18, 5, 3);
      block(k, -10.5, 0, 5, 14, 2);
      block(k, 10.5, 0, 5, 14, 2);
      // The domed library on the quad's axis, the clock tower beside the gate.
      at(k, 0, 0, -1, 0, () => {
        cyl(g, 4, 4.2, 6, k.wall2, 0, 0, 0, 20);
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cyl(g, 0.22, 0.24, 5.4, k.trim, Math.cos(a) * 4.6, 0, Math.sin(a) * 4.6, 8); }
        cyl(g, 4.9, 4.9, 0.5, k.trim, 0, 5.6, 0, 20);
        dome(g, 3.8, k.roof, 0, 6.1, 0, 18);
        for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; archPanel(glow, 1, 2.2, k.c.s.glow, Math.sin(a) * 4.05, 1.4, Math.cos(a) * 4.05, a, 0.06, k.st.arch === 'pointed'); }
      });
      at(k, -7, 0, 10, 0, () => {
        box(g, 3.6, 15, 3.6, k.wall2, 0, 0, 0);
        for (const [x, z, ry] of [[0, 1.82, 0], [1.82, 0, Math.PI / 2], [0, -1.82, Math.PI], [-1.82, 0, -Math.PI / 2]] as const) {
          k.c.glow.add(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 20).rotateX(Math.PI / 2), '#fff4d0', M(x, 12.5, z, ry));
          box(g, 0.08, 0.8, 0.05, '#2a2a2a', x + (ry ? 0 : 0.02), 12.3, z + (ry ? 0.02 : 0.08), ry);
        }
        cone(g, 2.8, 5, k.roof, 0, 15, 0, 4, Math.PI / 4);
      });
      for (const x of [-4.5, 4.5]) box(g, 5, 0.1, 3, '#6aa84f', x, 0.02, 5.5);
      return { r: 15.5, h: Math.max(top, 20) };
    }
  }
}

function library(k: K, s: 0 | 1 | 2 | 3): Footprint {
  const { g, glow } = k.c;
  switch (s) {
    case 0: { // A reading corner: a little kiosk of shelves, benches in its shade.
      canopy(k, 3.2, 2.6, 2.5, k.roof);
      shelves(k, 0, -1.1, 2.8, 1.8);
      for (const x of [-1.2, 1.2]) box(g, 1.4, 0.45, 0.45, '#8a5a36', x, 0, 1.6);
      sphere(glow, 0.14, '#fff2c8', 0, 2.3, 0, 6);
      return { r: 2.6, h: 3.8 };
    }
    case 1: { // A library: a tall reading hall behind a portico of columns, on steps.
      const top = block(k, 0, -1.5, 11, 8, 2, { door: true });
      for (let i = 0; i < 3; i++) box(g, 9 + i * 0.6, 0.2, 1.2 - i * 0.3, '#e8dcc6', 0, i * 0.2, 3.4 + i * 0.3);
      for (const x of [-3.6, -1.2, 1.2, 3.6]) cyl(g, 0.25, 0.28, 5.4, '#fbf7ee', x, 0.6, 3.4, 10);
      at(k, 0, 6, 3.4, 0, () => { box(g, 9, 0.5, 1.8, k.trim, 0, 0, 0); k.c.g.add(new THREE.CylinderGeometry(4.8, 4.8, 1.8, 3, 1).rotateX(-Math.PI / 2), k.roof, M(0, 1.2, 0, 0, 1, 0.3, 1)); });
      return { r: 7.4, h: top + 0.5 };
    }
    case 2: { // A great library: a domed rotunda in a colonnade, galleries glowing within.
      at(k, 0, 0, -1, 0, () => {
        cyl(g, 7, 7.3, 8, k.wall, 0, 0, 0, 28);
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          cyl(g, 0.3, 0.32, 7.2, '#fbf7ee', Math.cos(a) * 8.2, 0, Math.sin(a) * 8.2, 10);
          if (i % 2 === 0) archPanel(glow, 1.4, 3, k.c.s.glow, Math.sin(a) * 7.05, 2.4, Math.cos(a) * 7.05, a, 0.06, k.st.arch === 'pointed');
        }
        cyl(g, 8.8, 8.8, 0.6, k.trim, 0, 7.2, 0, 28);
        cyl(g, 6.6, 6.8, 2, k.wall2, 0, 7.8, 0, 28);
        dome(g, 6.4, k.roof, 0, 9.8, 0, 22);
        cyl(g, 0.9, 1, 1.4, '#fbf7ee', 0, 9.8 + 6.2, 0, 10);
        dome(g, 0.9, '#d4af37', 0, 9.8 + 7.6, 0, 10);
      });
      archPanel(g, 2.4, 3.6, '#3a2a22', 0, 0, 6.35, 0, 0.3, k.st.arch === 'pointed');
      return { r: 10, h: 19 };
    }
    default: { // A house of wisdom: the rotunda, two archive wings, a translation hall, an observatory.
      const r = library(k, 2);
      block(k, -10.5, 0, 5, 12, 2);
      block(k, 10.5, 0, 5, 12, 2);
      block(k, 0, -12, 11, 4, 2);
      at(k, 8.5, 0, -9.5, 0, () => {
        cyl(g, 2.6, 2.8, 10, k.wall2, 0, 0, 0, 16);
        cyl(g, 3, 3, 0.4, k.trim, 0, 10, 0, 16);
        dome(g, 2.6, '#e8e8f0', 0, 10.4, 0, 16);
        box(g, 0.8, 0.2, 2.8, '#2a2a30', 0.4, 12.2, 0.4); // the dome's opened slit
      });
      return { r: 15.5, h: Math.max(r.h, 16) };
    }
  }
}

export type CareKind = 'kitchen' | 'clinic' | 'school' | 'library';
export const CARE_KINDS: CareKind[] = ['kitchen', 'clinic', 'school', 'library'];

/** Build one stage of a care-and-learning institute in the land's architecture. */
export function buildCareInstitute(c: Ctx, kind: CareKind, stage: 0 | 1 | 2 | 3): Footprint {
  const k = kit(c);
  switch (kind) {
    case 'kitchen': return kitchen(k, stage);
    case 'clinic': return clinic(k, stage);
    case 'school': return school(k, stage);
    case 'library': return library(k, stage);
  }
}
