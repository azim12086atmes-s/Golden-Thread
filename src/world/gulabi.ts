import * as THREE from 'three';
import type { Ctx } from './architecture';
import { M, archPanel, box, cone, cyl, dome, sphere, type GeoBuilder } from './kit';

/**
 * Gulabi Nagar, the pink city, dressed as a Rajasthani town in festival season: pink city gates
 * (pols) where the avenues enter, rangolis at every doorstep and along the streets, Holi stalls
 * piled with pichkaris and heaps of gulal, kite sellers, marigold torans strung across the
 * avenues, charpais under the trees, piaos (free water stalls of clay pots), little jharokha
 * kiosks with jali screens, and dupattas drying on lines in bandhani and leheriya colours.
 * Out in the country, stone chhatris (cenotaphs) stand on the rises.
 *
 * All in the land's local frame; every piece faces +z and stands at y = 0 (callers frame it).
 */

const PINK = '#e8917a', PINK_D = '#d27466', WHITE = '#fbf7ee', GOLD = '#d4af37', WOOD = '#7a4a2a', CLAY = '#b0553a';
export const HOLI = ['#e8347a', '#ff8a1f', '#ffd23a', '#3aa84a', '#2a7ad8', '#9a4ad8', '#ff5a5a'];

/** Where the city gates stand (local): astride each avenue at the edge of town. */
export const GATE_D = 229, GATE_X = 14;
export function gateSpots(): Array<{ x: number; z: number; ry: number }> {
  return [
    { x: 0, z: GATE_D, ry: 0 }, { x: 0, z: -GATE_D, ry: Math.PI },
    { x: GATE_D, z: 0, ry: Math.PI / 2 }, { x: -GATE_D, z: 0, ry: -Math.PI / 2 },
  ];
}
/** The gate towers' footprints (local circles), kept clear of houses and made solid. */
export function gateTowers(): Array<{ x: number; z: number; r: number }> {
  const out: Array<{ x: number; z: number; r: number }> = [];
  for (const g of gateSpots()) for (const s of [-1, 1]) {
    out.push({ x: g.x + Math.cos(g.ry) * s * GATE_X, z: g.z - Math.sin(g.ry) * s * GATE_X, r: 3.6 });
  }
  return out;
}

/** A pol: two pink towers crowned with chhatris, joined by a painted arch over the avenue. */
export function cityGate(c: Ctx): void {
  const { g, glow } = c;
  for (const s of [-1, 1]) {
    const x = s * GATE_X;
    box(g, 5, 9, 5, PINK, x, 0, 0);
    box(g, 5.4, 0.4, 5.4, WHITE, x, 9, 0);
    // Painted white panels and a little jharokha on each tower's face.
    for (const zf of [-1, 1]) {
      for (let k = 0; k < 3; k++) archPanel(g, 1, 1.8, WHITE, x, 1.2 + k * 2.6, zf * 2.52, zf < 0 ? Math.PI : 0, 0.05, true);
      box(g, 1.8, 1.4, 0.7, PINK_D, x, 5.6, zf * 2.8);
      dome(g, 0.9, WHITE, x, 7, zf * 2.8, 10, 0.6);
      box(glow, 1.2, 0.8, 0.05, '#ffb84a', x, 5.9, zf * 3.16);
    }
    // Crenellations and a chhatri on top.
    for (let k = -2; k <= 2; k++) for (const zf of [-1, 1]) box(g, 0.6, 0.6, 0.4, PINK_D, x + k * 1, 9.4, zf * 2.4);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.12, 0.14, 1.8, WHITE, x + dx * 1, 9.4, dz * 1, 6);
    box(g, 2.6, 0.2, 2.6, WHITE, x, 11.2, 0);
    dome(g, 1.2, WHITE, x, 11.4, 0, 12);
    cyl(g, 0.05, 0.08, 0.7, GOLD, x, 12.5, 0, 5);
  }
  // The arch: a deep beam with a cusped arch cut in paint, a row of little jharokhas above.
  const span = GATE_X * 2 - 5;
  box(g, span, 2.8, 4, PINK, 0, 6.2, 0);
  box(g, span + 0.2, 0.3, 4.2, WHITE, 0, 9, 0);
  for (const zf of [-1, 1]) {
    archPanel(g, span - 3, 2.4, WHITE, 0, 6.3, zf * 2.03, zf < 0 ? Math.PI : 0, 0.06, true);
    for (let k = -3; k <= 3; k++) {
      box(g, 1.2, 1, 0.5, PINK_D, k * 2.6, 9.3, zf * 1.8);
      dome(g, 0.6, WHITE, k * 2.6, 10.3, zf * 1.8, 8, 0.6);
    }
  }
  // Lanterns hanging in the arch, and a marigold toran along its edge.
  for (let k = -2; k <= 2; k++) {
    cyl(g, 0.02, 0.02, 0.9, '#3a2a22', k * 3.5, 5.3, 0, 3);
    sphere(glow, 0.35, k % 2 ? '#ffb84a' : '#ff5a8a', k * 3.5, 5, 0, 8, 1.3);
  }
  for (let k = 0; k <= 20; k++) {
    const f = k / 20 - 0.5;
    sphere(g, 0.16, k % 3 ? '#ff9a1f' : '#ffd23a', f * span, 6.1 - Math.cos(f * Math.PI) * 0.4, 2.2, 6);
  }
}

/** A rangoli: rings of coloured powder, a lotus of petals, a border of dots; diyas round it. */
export function rangoli(c: Ctx, R: number, lamps: boolean): void {
  const { g, glow, rng } = c;
  const pal = [...HOLI].sort(() => rng.next() - 0.5);
  let y = 0.012;
  cyl(g, R, R, 0.02, WHITE, 0, y, 0, 28); y += 0.006;
  cyl(g, R * 0.94, R * 0.94, 0.02, pal[0], 0, y, 0, 28); y += 0.006;
  // Scalloped border: little discs round the rim.
  const nb = Math.round(R * 14);
  for (let i = 0; i < nb; i++) {
    const a = (i / nb) * Math.PI * 2;
    cyl(g, R * 0.07, R * 0.07, 0.02, i % 2 ? pal[1] : WHITE, Math.cos(a) * R * 0.86, y, Math.sin(a) * R * 0.86, 8);
  }
  y += 0.006;
  cyl(g, R * 0.72, R * 0.72, 0.02, pal[2], 0, y, 0, 24); y += 0.006;
  // The lotus: two rings of pointed petals.
  for (const [n, r0, len, col, off] of [[8, 0.2, 0.52, pal[3], 0], [8, 0.14, 0.36, pal[4], Math.PI / 8]] as const) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + off, rr = R * (r0 + len / 2);
      const geo = new THREE.SphereGeometry(1, 10, 5);
      g.add(geo, col, M(Math.cos(a) * rr, y, Math.sin(a) * rr, -a, R * len / 2, 0.02, R * 0.12));
    }
    y += 0.006;
  }
  cyl(g, R * 0.16, R * 0.16, 0.02, pal[5], 0, y, 0, 16); y += 0.006;
  cyl(g, R * 0.07, R * 0.07, 0.02, WHITE, 0, y, 0, 12);
  // Dots between the petals.
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    cyl(g, R * 0.03, R * 0.03, 0.02, WHITE, Math.cos(a) * R * 0.64, y, Math.sin(a) * R * 0.64, 6);
  }
  if (lamps) for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    cyl(g, 0.1, 0.07, 0.08, CLAY, Math.cos(a) * (R + 0.25), 0, Math.sin(a) * (R + 0.25), 6);
    sphere(glow, 0.06, '#ffb84a', Math.cos(a) * (R + 0.25), 0.13, Math.sin(a) * (R + 0.25), 5, 1.5);
  }
}

/** A pichkari: a coloured barrel with a nozzle and a plunger, lying along x. */
function pichkari(g: GeoBuilder, x: number, y: number, z: number, col: string, ry = 0): void {
  g.add(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8).rotateZ(Math.PI / 2), col, M(x, y, z, ry));
  g.add(new THREE.ConeGeometry(0.06, 0.18, 8).rotateZ(-Math.PI / 2), '#e8e8e8', M(x + Math.cos(ry) * 0.33, y, z - Math.sin(ry) * 0.33, ry));
  g.add(new THREE.CylinderGeometry(0.02, 0.02, 0.28, 5).rotateZ(Math.PI / 2), GOLD, M(x - Math.cos(ry) * 0.36, y, z + Math.sin(ry) * 0.36, ry));
  g.add(new THREE.BoxGeometry(0.04, 0.16, 0.04), GOLD, M(x - Math.cos(ry) * 0.5, y, z + Math.sin(ry) * 0.5, ry));
}

/** A heap of gulal on a brass thali. */
function gulal(g: GeoBuilder, x: number, y: number, z: number, col: string, r = 0.28): void {
  cyl(g, r + 0.08, r + 0.1, 0.04, GOLD, x, y, z, 12);
  cone(g, r, r * 0.9, col, x, y + 0.04, z, 12);
}

/** A Holi stall: a striped canopy over a table of pichkaris and heaps of gulal. */
export function holiStall(c: Ctx): void {
  const { g, rng } = c;
  for (const [x, z] of [[-1.3, -0.7], [1.3, -0.7], [-1.3, 0.7], [1.3, 0.7]]) cyl(g, 0.05, 0.05, 2.4, WOOD, x, 0, z, 5);
  for (let k = 0; k < 6; k++) box(g, 0.46, 0.06, 1.8, HOLI[k % HOLI.length], -1.15 + k * 0.46, 2.4, 0);
  for (let k = 0; k < 6; k++) cone(g, 0.12, 0.25, HOLI[(k + 3) % HOLI.length], -1.15 + k * 0.46, 2.15, 0.95, 3, Math.PI);
  box(g, 2.4, 0.08, 1.2, WOOD, 0, 0.8, 0);
  for (const x of [-1.1, 1.1]) box(g, 0.08, 0.8, 1.1, WOOD, x, 0, 0);
  for (let k = 0; k < 5; k++) pichkari(g, -0.8 + k * 0.4, 0.95, 0.35, HOLI[k], Math.PI / 2 + rng.range(-0.2, 0.2));
  for (let k = 0; k < 4; k++) gulal(g, -0.9 + k * 0.6, 0.88, -0.25, HOLI[(k + 2) % HOLI.length], 0.2);
  // A bucket of upright pichkaris beside it, and gulal heaps on the ground.
  cyl(g, 0.3, 0.25, 0.5, '#5a7ab0', 1.9, 0, 0.3, 10);
  for (let k = 0; k < 4; k++) cyl(g, 0.05, 0.05, 0.6, HOLI[k + 1], 1.8 + (k % 2) * 0.18, 0.3, 0.2 + Math.floor(k / 2) * 0.18, 6);
  for (let k = 0; k < 3; k++) gulal(g, -1.9 + k * 0.1, 0, 0.9 - k * 0.7, HOLI[(k + 4) % HOLI.length], 0.35);
}

/** A kite seller: kites hung on a frame, and charkhis (spools) of string. */
export function kiteStall(c: Ctx): void {
  const { g } = c;
  for (const x of [-1.4, 1.4]) cyl(g, 0.05, 0.06, 2.6, WOOD, x, 0, 0, 5);
  box(g, 3, 0.06, 0.06, WOOD, 0, 2.5, 0);
  for (let k = 0; k < 7; k++) {
    const x = -1.2 + k * 0.4, y = 1.3 + (k % 2) * 0.55, col = HOLI[k % HOLI.length];
    g.add(new THREE.BoxGeometry(0.42, 0.42, 0.01), col, M(x, y, 0.05, 0, 1, 1, 1, 0, Math.PI / 4));
    g.add(new THREE.BoxGeometry(0.2, 0.2, 0.012), HOLI[(k + 3) % HOLI.length], M(x, y, 0.06, 0, 1, 1, 1, 0, Math.PI / 4));
    cone(g, 0.06, 0.14, col, x, y - 0.44, 0.05, 3, Math.PI);
  }
  box(g, 2, 0.7, 0.8, WOOD, 0, 0, 0.9);
  for (let k = 0; k < 4; k++) {
    g.add(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 10).rotateZ(Math.PI / 2), HOLI[(k + 1) % HOLI.length], M(-0.7 + k * 0.45, 0.82, 0.9));
  }
}

/** A marigold toran: poles either side of the street and garlands of marigolds and mango leaves. */
export function toran(c: Ctx, span: number): void {
  const { g, glow } = c;
  for (const s of [-1, 1]) {
    cyl(g, 0.1, 0.13, 5.4, WHITE, s * span / 2, 0, 0, 6);
    sphere(g, 0.2, GOLD, s * span / 2, 5.5, 0, 6);
  }
  const n = Math.round(span * 2.4);
  for (let k = 0; k <= n; k++) {
    const f = k / n - 0.5, y = 5 - Math.cos(f * Math.PI) * 0.7;
    sphere(g, 0.14, k % 4 === 0 ? '#ffd23a' : '#ff8a1f', f * span, y, 0, 6);
    if (k % 2) cone(g, 0.07, 0.34, '#3a8a3a', f * span, y - 0.44, 0, 3, Math.PI);
    // Strands of marigolds hanging down.
    if (k % 6 === 3) for (let j = 1; j <= 5; j++) sphere(g, 0.1, j % 2 ? '#ff8a1f' : '#ffd23a', f * span, y - j * 0.2, 0, 5);
    if (k % 10 === 5) sphere(glow, 0.1, '#ffb84a', f * span, y + 0.18, 0, 5);
  }
}

/** A charpai (rope bed) with a matka of water on a stand beside it. */
export function charpai(c: Ctx): void {
  const { g } = c;
  for (const [x, z] of [[-0.9, -0.45], [0.9, -0.45], [-0.9, 0.45], [0.9, 0.45]]) cyl(g, 0.06, 0.05, 0.45, WOOD, x, 0, z, 6);
  for (const z of [-0.45, 0.45]) box(g, 1.9, 0.08, 0.08, WOOD, 0, 0.42, z);
  for (const x of [-0.9, 0.9]) box(g, 0.08, 0.08, 0.98, WOOD, x, 0.42, 0);
  box(g, 1.72, 0.03, 0.84, '#e6d6a8', 0, 0.44, 0);
  for (let k = -3; k <= 3; k++) box(g, 0.02, 0.035, 0.84, '#c8b27a', k * 0.24, 0.45, 0);
  box(g, 0.5, 0.06, 0.8, '#c8233a', -0.55, 0.49, 0);
  cyl(g, 0.2, 0.22, 0.5, WOOD, 1.5, 0, 0, 6);
  sphere(g, 0.24, CLAY, 1.5, 0.72, 0, 10, 1.05);
  cyl(g, 0.08, 0.1, 0.1, CLAY, 1.5, 0.94, 0, 8);
}

/** A piao: a free water stall — clay matkas on a wooden stand under a thatch, with a brass lota. */
export function piao(c: Ctx): void {
  const { g, glow } = c;
  for (const [x, z] of [[-1.3, -0.8], [1.3, -0.8], [-1.3, 0.8], [1.3, 0.8]]) cyl(g, 0.06, 0.07, 2.3, WOOD, x, 0, z, 5);
  cone(g, 2, 0.9, '#c8a860', 0, 2.3, 0, 4, Math.PI / 4);
  box(g, 2.4, 0.1, 0.9, WOOD, 0, 0.7, -0.2);
  for (let k = 0; k < 4; k++) {
    sphere(g, 0.3, k % 2 ? CLAY : '#9a4a30', -0.9 + k * 0.6, 1.08, -0.2, 10, 1.1);
    cyl(g, 0.1, 0.13, 0.12, '#8a3a26', -0.9 + k * 0.6, 1.38, -0.2, 8);
    cyl(g, 0.15, 0.15, 0.03, '#e6d6a8', -0.9 + k * 0.6, 1.5, -0.2, 8); // a cloth over its mouth
  }
  sphere(g, 0.12, GOLD, 1.0, 0.86, 0.3, 8);
  box(g, 1.2, 0.3, 0.05, WHITE, 0, 1.9, 0.82);
  sphere(glow, 0.12, '#ffb84a', 0, 2.1, 0, 6, 1.3);
}

/** A jharokha kiosk: a small pink sandstone pavilion with jali screens and a curved roof. */
export function jharokhaKiosk(c: Ctx): void {
  const { g, glow } = c;
  box(g, 3, 0.5, 3, PINK_D, 0, 0, 0);
  for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) cyl(g, 0.13, 0.15, 2.3, PINK, x, 0.5, z, 8);
  for (const s of [-1, 1]) {
    // Jali: a fine lattice screen on the two sides.
    box(g, 0.06, 1.4, 2.2, PINK, s * 1.25, 0.9, 0);
    for (let k = 0; k < 6; k++) box(g, 0.08, 1.4, 0.05, WHITE, s * 1.26, 0.9, -0.9 + k * 0.36);
    for (let k = 0; k < 4; k++) box(g, 0.08, 0.05, 2.2, WHITE, s * 1.26, 1.1 + k * 0.33, 0);
  }
  for (const zf of [-1, 1]) archPanel(g, 2.2, 1.6, WHITE, 0, 1.1, zf * 1.25, zf < 0 ? Math.PI : 0, 0.06, true);
  box(g, 3.2, 0.3, 3.2, WHITE, 0, 2.8, 0);
  // Bangaldar roof: a curved vault, eaves drooping at the ends.
  g.add(new THREE.CylinderGeometry(1.5, 1.5, 3, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), PINK, M(0, 3.1, 0, 0, 1, 0.5, 1));
  cyl(g, 0.05, 0.08, 0.6, GOLD, 0, 3.8, 0, 5);
  sphere(glow, 0.3, '#ffb84a', 0, 1.8, 0, 8, 1.2);
}

/** A line of dupattas drying: bandhani dots and leheriya waves in bright dye colours. */
export function dyeLine(c: Ctx): void {
  const { g } = c;
  for (const x of [-3, 3]) cyl(g, 0.05, 0.06, 2.6, WOOD, x, 0, 0, 5);
  box(g, 6, 0.02, 0.02, '#e6d6a8', 0, 2.5, 0);
  for (let k = 0; k < 6; k++) {
    const x = -2.5 + k, col = HOLI[k % HOLI.length], alt = HOLI[(k + 2) % HOLI.length];
    box(g, 0.85, 1.6, 0.02, col, x, 0.9, 0);
    if (k % 2) for (let j = 0; j < 5; j++) box(g, 0.85, 0.08, 0.025, alt, x, 1.05 + j * 0.3, 0); // leheriya
    else for (let j = 0; j < 9; j++) sphere(g, 0.035, WHITE, x - 0.3 + (j % 3) * 0.3, 1.1 + Math.floor(j / 3) * 0.45, 0.02, 4, 0.4); // bandhani
  }
}

/** A stone chhatri out in the country: a cenotaph pavilion on a stepped plinth. */
export function countryChhatri(c: Ctx, s: number): void {
  const { g } = c;
  const stone = '#d8c098';
  box(g, 5 * s, 0.6 * s, 5 * s, stone, 0, 0, 0);
  box(g, 4 * s, 0.6 * s, 4 * s, stone, 0, 0.6 * s, 0);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cyl(g, 0.16 * s, 0.18 * s, 2.4 * s, stone, Math.cos(a) * 1.6 * s, 1.2 * s, Math.sin(a) * 1.6 * s, 6);
  }
  cyl(g, 2.1 * s, 2.1 * s, 0.35 * s, stone, 0, 3.6 * s, 0, 16);
  dome(g, 1.6 * s, '#e6d4b0', 0, 3.95 * s, 0, 14);
  cyl(g, 0.06 * s, 0.1 * s, 0.8 * s, GOLD, 0, 5.5 * s, 0, 5);
}

interface Solid { x: number; z: number; r: number; h: number }

/**
 * Dress the town (after its houses, lamps and props are placed): gates, doorstep rangolis, and
 * stalls, charpais, piaos, kiosks, dye-lines and rangolis along the avenues where there is room,
 * torans across the avenues, and chhatris out on the rises. Pushes colliders (world) for what is solid.
 */
export function dressGulabi(
  c: Ctx, cx: number, cz: number, H: (x: number, z: number) => number, colliders: Solid[],
  doors: Array<{ x: number; z: number; facing: number }>, blocked: (x: number, z: number, pad: number) => boolean,
): void {
  const { g, glow, rng } = c;
  const at = (x: number, z: number, ry: number, fn: () => void) => g.frame(x, H(x, z), z, ry, 1, () => glow.frame(x, H(x, z), z, ry, 1, fn));
  // Local colliders only, so the check stays quick.
  const solids = colliders.map((q) => ({ x: q.x - cx, z: q.z - cz, r: q.r }));
  const free = (x: number, z: number, r: number) => !blocked(x, z, r) && !solids.some((q) => Math.hypot(x - q.x, z - q.z) < q.r + r + 0.8);
  const solid = (x: number, z: number, r: number, h: number) => { solids.push({ x, z, r }); colliders.push({ x: cx + x, z: cz + z, r, h: H(x, z) + h }); };

  for (const s of gateSpots()) at(s.x, s.z, s.ry, () => cityGate(c));
  for (const t of gateTowers()) solid(t.x, t.z, t.r, 12);

  // A little rangoli before most front doors.
  for (const d of doors) {
    if (rng.chance(0.3)) continue;
    const x = d.x - cx + Math.sin(d.facing) * 1.8, z = d.z - cz + Math.cos(d.facing) * 1.8;
    if (blocked(x, z, 0.8)) continue;
    at(x, z, d.facing, () => rangoli(c, rng.range(0.7, 1.1), rng.chance(0.4)));
  }

  // Along the avenues, on both pavements: something every few metres where there is room.
  type Piece = { r: number; h: number; draw: () => void; flat?: boolean };
  const pieces: Piece[] = [
    { r: 2.2, h: 2.6, draw: () => holiStall(c) },
    { r: 1.8, h: 2.6, draw: () => kiteStall(c) },
    { r: 1.4, h: 1, draw: () => charpai(c) },
    { r: 1.8, h: 3, draw: () => piao(c) },
    { r: 2.2, h: 4, draw: () => jharokhaKiosk(c) },
    { r: 3.2, h: 2.6, draw: () => dyeLine(c) },
    { r: 2, h: 0, draw: () => rangoli(c, rng.range(1.4, 2), true), flat: true },
  ];
  for (let d = 66; d < 222; d += 9) {
    for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) for (const side of [-1, 1]) {
      if (rng.chance(0.35)) continue;
      const p = pieces[Math.floor(rng.next() * pieces.length)];
      const lat = 13.5 + p.r + rng.range(0, 2);
      // Across the avenue is (az, ax) (perpendicular); the piece faces the street.
      const x = ax * d + az * side * lat, z = az * d + ax * side * lat;
      if (!free(x, z, p.r)) continue;
      const face = Math.atan2(-az * side, -ax * side);
      at(x, z, face, p.draw);
      if (!p.flat) solid(x, z, p.r * 0.8, p.h); else solids.push({ x, z, r: p.r });
    }
  }
  // Marigold torans strung across each avenue.
  for (const d of [95, 135, 180, 205]) for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
    const x = ax * d, z = az * d;
    at(x, z, Math.atan2(ax, az), () => toran(c, 22)); // local x runs across the avenue
    for (const s of [-1, 1]) solid(x + az * s * 11, z + ax * s * 11, 0.3, 5.5);
  }
  // Chhatris out on the rises beyond the town.
  let placed = 0;
  for (let tries = 0; tries < 200 && placed < 7; tries++) {
    const a = rng.range(0, Math.PI * 2), r = rng.range(280, 460), x = Math.cos(a) * r, z = Math.sin(a) * r;
    const y = H(x, z);
    if (y < H(x + 20, z) || y < H(x - 20, z) || y < H(x, z + 20) || y < H(x, z - 20) || !free(x, z, 5)) continue;
    const s = rng.range(0.9, 1.4);
    at(x, z, rng.range(0, Math.PI), () => countryChhatri(c, s));
    solid(x, z, 3 * s, 6 * s);
    placed++;
  }
}
