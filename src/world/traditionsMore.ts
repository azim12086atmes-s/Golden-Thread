import * as THREE from 'three';
import type { Ctx, Footprint } from './architecture';
import { M, archPanel, box, cone, cyl, dome, gable, hip, onion, sphere, sweptRoof } from './kit';
import { SURF } from './surfaces';
import { barjeel, chhatriKiosk, doorLeaf, glass, jharokha, lattice, merlons, surf } from './traditions';

/**
 * More of each land's own houses (owner: "Have you done for all places??"), so no land's streets
 * are one house repeated — each from the real building tradition of its place:
 *
 *  - Madinat an-Nur: an earthen kasbah with corner towers and brick lattice, and a whitewashed
 *    Andalusian house under green-glazed tiles with iron grilles and flowerpots.
 *  - Souq al-Qamar: a Hijazi coral-stone house stacked with wooden rawasheen, and a palm-frond barasti.
 *  - Nile Crossing: a Cairene house with ablaq stone, mashrabiya bays and a malqaf wind catcher, and a
 *    mud-brick fellah farmhouse with a bread oven and a pigeon tower.
 *  - Gulabi Nagar: a narrow Pink City townhouse with a shop arch and a jharokha stack, and round
 *    thatched Rajasthani huts in a painted, walled yard.
 *  - Kaveri Coast: a Chettinad mansion with a long pillared verandah, and an agraharam row house with
 *    its thinnai seats and a kolam on the step.
 *  - Bagh-e-Noor: a Kashmiri house of brick and timber under a pyramid roof with a dab balcony, and a
 *    baradari — a pavilion of twelve arches under chhatris.
 *  - Sakura Hollow: a gassho-zukuri farmhouse under steep thatch, and a tea house with its roji path.
 *  - Hanok Village: a neowajip mountain house roofed in bark shingles, and a jeongja scholar's pavilion.
 *  - Jade Terraces: a white Huizhou house with horse-head gables, and a diaojiaolou on stilts.
 *  - Nusa Rinjani: a Javanese joglo under its stepped pyramid roof, and a Minangkabau rumah gadang with
 *    buffalo-horn gables.
 *  - Tents of Rimal: a mud-brick oasis house with palm-trunk beams, and an open majlis tent on carpets.
 *  - The Sky Isles: a round cottage resting on its own cloud, and a moon house under a crescent roof.
 *
 * Local frame: origin at the base centre, the street front facing +z.
 */
const pick = <T>(c: Ctx, a: readonly T[]) => c.rng.pick(a);
const WOOD = '#5a3a26';

// ───────────── Madinat an-Nur ─────────────

export function kasbah(c: Ctx): Footprint {
  const earth = pick(c, ['#c8875a', '#b8784a', '#d49a68']), w = c.rng.range(8, 9.5), d = w, h = c.rng.range(8, 10);
  surf(c, SURF.adobe, () => {
    box(c.g, w, h, d, earth);
    // Four corner towers, a little taller, tapering, with stepped crowns.
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.g.add(new THREE.CylinderGeometry(1.1, 1.5, h + 2.4, 4).rotateY(Math.PI / 4).translate(0, (h + 2.4) / 2, 0), earth, M(sx * w / 2, 0, sz * d / 2));
  });
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) merlons(c, 2, 2, h + 2.4, earth, true), void [sx, sz];
  // A band of brick lattice relief high on the front (the kasbah's signature), small high windows.
  for (let i = 0; i < 9; i++) for (let j = 0; j < 3; j++) if ((i + j) % 2 === 0) box(c.g, 0.35, 0.35, 0.08, '#a86a42', -w / 2 + 1 + i * (w - 2) / 8, h - 2.6 + j * 0.5, d / 2 + 0.04);
  for (const x of [-w / 4, w / 4]) { glass(c, x, h - 4.2, d / 2 + 0.02, 0.5, 0.8, true); for (let k = 0; k < 3; k++) box(c.g, 0.03, 0.85, 0.04, '#1f1f24', x - 0.14 + k * 0.14, h - 4.2, d / 2 + 0.06); }
  archPanel(c.g, 1.8, 2.8, '#8a4a2a', 0, 0, d / 2 + 0.05, 0, 0.1);
  doorLeaf(c, 0, d / 2 + 0.12, 1.3, 2.3, '#5a3a22', true);
  merlons(c, w, d, h, earth, true);
  return { r: w / 2 + 1.6, h: h + 3.4 };
}

export function andalusian(c: Ctx): Footprint {
  const white = '#fbf8f0', tile = pick(c, ['#2f7a4a', '#3a8a5a']), w = c.rng.range(8, 9.5), d = 8, h = 6.2;
  surf(c, SURF.plaster, () => box(c.g, w, h, d, white));
  box(c.g, w + 0.06, 0.8, d + 0.06, pick(c, ['#2f6f9a', '#e2b43a']), 0, 0, 0); // the painted plinth
  // A glazed-tile hip roof with a deep eave, and a tiled door surround with a horseshoe arch.
  surf(c, SURF.glazed, () => hip(c.g, w + 1, d + 1, 2, tile, 0, h, 0));
  surf(c, SURF.glazed, () => box(c.g, 2.2, 3.2, 0.08, '#2f6f9a', 0, 0, d / 2 + 0.02));
  archPanel(c.g, 1.5, 2.6, '#6b3a22', 0, 0, d / 2 + 0.08, 0, 0.06);
  // Windows behind wrought-iron grilles, pots of geraniums on their sills and hung on the wall.
  for (const x of [-w / 3, w / 3]) for (const y of [1.2, 3.8]) {
    glass(c, x, y, d / 2 + 0.02, 0.9, 1.2);
    for (let k = 0; k < 5; k++) box(c.g, 0.03, 1.3, 0.05, '#1f1f24', x - 0.4 + k * 0.2, y - 0.05, d / 2 + 0.2);
    box(c.g, 1.1, 0.05, 0.3, '#1f1f24', x, y - 0.1, d / 2 + 0.15);
    for (let k = 0; k < 3; k++) { cyl(c.g, 0.1, 0.08, 0.18, '#b5654a', x - 0.3 + k * 0.3, y - 0.05, d / 2 + 0.2, 6); sphere(c.g, 0.1, '#e8243a', x - 0.3 + k * 0.3, y + 0.2, d / 2 + 0.2, 5); }
  }
  // A wooden balcony over the door.
  box(c.g, 2.4, 0.12, 0.8, WOOD, 0, 3.6, d / 2 + 0.4);
  for (let i = 0; i < 9; i++) box(c.g, 0.06, 0.8, 0.06, WOOD, -1.1 + i * 0.275, 3.7, d / 2 + 0.78);
  return { r: Math.max(w, d) / 2 + 0.9, h: h + 2 };
}

// ───────────── Souq al-Qamar ─────────────

export function coralHouse(c: Ctx): Footprint {
  const coral = '#efe6d4', wood = pick(c, ['#2f8a8a', '#6b4a2a', '#3a6a8a']), w = c.rng.range(7, 8.5), d = 7.5, floors = c.rng.int(3, 4), fh = 3.2, H = floors * fh;
  surf(c, SURF.adobe, () => box(c.g, w, H, d, coral));
  for (let f = 1; f < floors; f++) box(c.g, w + 0.14, 0.18, d + 0.14, '#d8ccb4', 0, f * fh - 0.1, 0);
  // Rawasheen: tall wooden bay windows of lattice stacked up the front, each on carved brackets.
  for (let f = 1; f < floors; f++) for (const x of [-w / 4, w / 4]) {
    box(c.g, 1.8, fh - 0.5, 0.7, wood, x, f * fh + 0.2, d / 2 + 0.35);
    lattice(c, x, f * fh + 0.5, d / 2 + 0.72, 1.5, fh - 1.2, '#e8dcc0', 'jali');
    glass(c, x, f * fh + 0.6, d / 2 + 0.68, 1.3, fh - 1.4);
    for (let k = 0; k < 3; k++) box(c.g, 0.16, 0.3, 0.7 - k * 0.2, wood, x - 0.7 + k * 0.7, f * fh - 0.1, d / 2 + 0.35);
    box(c.g, 2, 0.15, 0.9, wood, x, f * fh + fh - 0.3, d / 2 + 0.45);
  }
  archPanel(c.g, 1.8, 2.8, '#e8dcc0', 0, 0, d / 2 + 0.03, 0, 0.08);
  doorLeaf(c, 0, d / 2 + 0.1, 1.3, 2.3, wood, true);
  merlons(c, w, d, H, coral, false);
  return { r: Math.max(w, d) / 2 + 1, h: H + 1 };
}

export function barasti(c: Ctx): Footprint {
  const frond = pick(c, ['#b8905a', '#a8804a']), w = 7, d = 5.5, h = 2.6;
  // Walls of palm-frond panels lashed to a frame of palm trunks; a gabled frond roof; a cloth wind catcher.
  surf(c, SURF.thatch, () => {
    box(c.g, w, h, d, frond);
    gable(c.g, w + 0.6, d + 0.6, 1.8, '#9a7a42', 0, h, 0);
  });
  for (let i = 0; i <= 6; i++) box(c.g, 0.04, h, 0.06, '#7a5a30', -w / 2 + i * (w / 6), 0, d / 2 + 0.03);
  for (const y of [0.8, 1.8]) box(c.g, w, 0.06, 0.06, '#7a5a30', 0, y, d / 2 + 0.04);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.12, 0.14, h + 0.3, '#6b4a2a', sx * w / 2, 0, sz * d / 2, 6);
  box(c.g, 1.2, 2, 0.06, '#5a3a22', 0, 0, d / 2 + 0.05);
  for (const s of [-1, 1]) box(c.g, 0.04, 1.4, 1.2, '#f4ecd8', w / 4 + s * 0.6, h + 1.4, 0);
  box(c.g, 1.24, 0.06, 1.24, '#6b4a2a', w / 4, h + 2.8, 0);
  return { r: w / 2 + 0.8, h: h + 3 };
}

// ───────────── Nile Crossing ─────────────

export function cairene(c: Ctx): Footprint {
  const stone = '#e0cfa8', w = c.rng.range(8, 9.5), d = 8, h = 8.5;
  surf(c, SURF.ashlar, () => box(c.g, w, 3.2, d, stone));
  // Ablaq: alternating courses of red and pale stone on the ground floor.
  for (let y = 0.3; y < 3; y += 0.6) box(c.g, w + 0.04, 0.3, d + 0.04, '#b5553e', 0, y, 0);
  surf(c, SURF.plaster, () => box(c.g, w - 0.4, h - 3.2, d - 0.4, '#e8dcc0', 0, 3.2, 0));
  // The upper floor jettied out in mashrabiya bays on corbels.
  for (const x of [-w / 4, w / 4]) {
    for (let k = 0; k < 4; k++) box(c.g, 2, 0.14, 0.2 + k * 0.18, '#8a6a4a', x, 3.0 + k * 0.14, d / 2 + 0.1 + k * 0.09);
    box(c.g, 2.2, 2.6, 0.8, '#6b4a2a', x, 3.6, d / 2 + 0.35);
    lattice(c, x, 3.9, d / 2 + 0.77, 1.9, 2, '#a8784a', 'jali');
    glass(c, x, 4.0, d / 2 + 0.72, 1.6, 1.8);
  }
  // A studded door under a stone arch with a muqarnas hood.
  archPanel(c.g, 2.2, 3, stone, 0, 0, d / 2 + 0.05, 0, 0.1);
  for (let k = 0; k < 4; k++) box(c.g, 1.8 - k * 0.3, 0.2, 0.3, '#d8c8a0', 0, 3 + k * 0.2, d / 2 + 0.2);
  doorLeaf(c, 0, d / 2 + 0.14, 1.5, 2.4, '#5a3a22', true);
  // The malqaf: a slanted wind catcher on the roof, open to the north breeze.
  surf(c, SURF.plaster, () => { box(c.g, 1.6, 2.4, 1.6, '#e8dcc0', -w / 4, h, -d / 4); c.g.add(new THREE.BoxGeometry(1.8, 0.12, 2.2), '#8a6a4a', M(-w / 4, h + 2.5, -d / 4, 0, 1, 1, 1, -0.5)); });
  merlons(c, w - 0.4, d - 0.4, h, '#e8dcc0', false);
  return { r: Math.max(w, d) / 2 + 1, h: h + 3 };
}

export function fellah(c: Ctx): Footprint {
  const mud = pick(c, ['#b89060', '#a8804e']), w = c.rng.range(8, 9), d = 7, h = 3.2;
  surf(c, SURF.adobe, () => box(c.g, w, h, d, mud));
  // A roof of palm-trunk beams and stored fodder, a mastaba bench, a blue-painted door.
  for (let i = 0; i < 8; i++) cyl(c.g, 0.07, 0.07, 0.5, '#6b4a2a', -w / 2 + 0.5 + i * (w - 1) / 7, h - 0.3, d / 2 + 0.2, 4);
  for (let i = 0; i < 5; i++) box(c.g, 1.2, 0.4, 0.8, '#d8c080', -w / 3 + (i % 3) * 1.3, h, -1 + Math.floor(i / 3) * 1.1);
  surf(c, SURF.adobe, () => box(c.g, 3, 0.45, 0.6, mud, -w / 4, 0, d / 2 + 0.3));
  box(c.g, 1.1, 2.1, 0.08, '#3a8ad8', w / 6, 0, d / 2 + 0.04);
  glass(c, -w / 3, 1.5, d / 2 + 0.02, 0.6, 0.6);
  // The bread oven: a clay dome in the yard with its mouth glowing.
  surf(c, SURF.adobe, () => dome(c.g, 0.8, '#a8703f', w / 2 + 1, 0, d / 2 - 0.5, 10));
  archPanel(c.glow, 0.5, 0.4, '#ff8a3a', w / 2 + 1, 0.05, d / 2 + 0.28, 0, 0.03);
  // The pigeon tower: a tall mud cone studded with clay pots.
  surf(c, SURF.adobe, () => cone(c.g, 1.5, 5.5, mud, -w / 2 - 0.4, h, -d / 2 + 1.2, 10));
  for (let i = 0; i < 24; i++) { const a = i * 1.1, y = h + 0.6 + (i % 8) * 0.55, r = 1.5 * (1 - (y - h) / 5.5); cyl(c.g, 0.08, 0.08, 0.12, '#8a5a3a', -w / 2 - 0.4 + Math.cos(a) * r, y, -d / 2 + 1.2 + Math.sin(a) * r, 5); }
  return { r: w / 2 + 1.8, h: h + 5.8 };
}

// ───────────── Gulabi Nagar ─────────────

export function pinkTownhouse(c: Ctx): Footprint {
  const pink = pick(c, c.s.walls), white = '#fbf3e8', w = c.rng.range(5.2, 6.4), d = 8, floors = 3, fh = 3.1, H = floors * fh;
  surf(c, SURF.ashlar, () => box(c.g, w, H, d, pink));
  for (let f = 1; f <= floors; f++) box(c.g, w + 0.2, 0.18, d + 0.2, white, 0, f * fh - 0.1, 0);
  // A shop arch on the street, shutters up; a stack of jharokhas above; white outlines everywhere.
  archPanel(c.g, w - 1.2, 2.8, white, 0, 0, d / 2 + 0.02, 0, 0.06);
  archPanel(c.g, w - 1.6, 2.5, '#6b3a2a', 0, 0, d / 2 + 0.06, 0, 0.05);
  for (let i = 0; i < 5; i++) box(c.g, 0.4, 0.3, 0.4, ['#ff9a1f', '#e8347a', '#ffd23a'][i % 3], -1 + i * 0.5, 0.9, d / 2 + 0.3);
  for (let f = 1; f < floors; f++) jharokha(c, 0, f * fh + 0.5, d / 2, 1.7, white, white, f === floors - 1 ? 'dome' : 'bangla');
  for (let f = 1; f < floors; f++) for (const s of [-1, 1]) archPanel(c.g, 0.5, 1.2, white, s * (w / 2 - 0.7), f * fh + 0.8, d / 2 + 0.02, 0, 0.04, true);
  for (let i = 0; i < Math.round(w / 0.6); i++) box(c.g, 0.3, 0.45, 0.2, white, -w / 2 + 0.3 + i * 0.6, H, d / 2 - 0.1);
  chhatriKiosk(c, 0, H, -d / 4, 0.9, white, pink);
  return { r: d / 2 + 1.1, h: H + 2.6 };
}

export function rajHut(c: Ctx): Footprint {
  const mud = pick(c, ['#c8875a', '#d4a070']), white = '#fbf7ee';
  // A low painted wall round the yard, two round huts under thatched cones, mandana patterns in white.
  surf(c, SURF.adobe, () => {
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; if (Math.abs(Math.sin(a) - 1) < 0.08) continue; box(c.g, 1.4, 1.1, 0.4, mud, Math.cos(a) * 5.2, 0, Math.sin(a) * 5.2, -a + Math.PI / 2); }
  });
  for (const [x, z, r] of [[-1.6, -0.8, 2], [2, -1.2, 1.6]] as const) {
    surf(c, SURF.adobe, () => cyl(c.g, r, r * 1.05, 2.4, mud, x, 0, z, 16));
    surf(c, SURF.thatch, () => cone(c.g, r * 1.35, 2.4, '#b8904a', x, 2.3, z, 16));
    for (let k = 0; k < 10; k++) { const a = -0.8 + k * 0.16; box(c.g, 0.12, 0.12, 0.02, white, x + Math.sin(a) * (r + 0.02), 1.5 + (k % 2) * 0.3, z + Math.cos(a) * (r + 0.02), a); }
    box(c.g, 0.8, 1.7, 0.08, '#5a3a22', x, 0, z + r + 0.02);
    cone(c.g, 0.12, 0.5, '#e8347a', x, 4.6, z, 5);
  }
  return { r: 5.8, h: 5.2 };
}

// ───────────── Kaveri Coast ─────────────

export function chettinad(c: Ctx): Footprint {
  const wall = pick(c, ['#f4ead8', '#f2e2c4']), roof = '#a84a2a', w = c.rng.range(11, 12.5), d = 8, H = 6.2;
  surf(c, SURF.plaster, () => box(c.g, w, H, d, wall, 0, 0, -0.6));
  // The raised verandah (thinnai) along the whole front on granite pillars, Athangudi tiles on its floor.
  surf(c, SURF.ashlar, () => box(c.g, w + 0.6, 0.8, 2.4, '#a8a094', 0, 0, d / 2 + 0.6));
  for (let i = 0; i < Math.round(w / 0.6); i++) box(c.g, 0.55, 0.03, 2.2, ['#c23b2a', '#e2b43a', '#2f6f9a'][i % 3], -w / 2 + 0.3 + i * 0.6, 0.8, d / 2 + 0.6);
  for (let i = 0; i < 8; i++) { const x = -w / 2 + 0.4 + i * (w - 0.8) / 7; cyl(c.g, 0.16, 0.18, 2.6, '#8a8278', x, 0.8, d / 2 + 1.6, 8); box(c.g, 0.4, 0.2, 0.4, '#8a8278', x, 3.4, d / 2 + 1.6); }
  surf(c, SURF.clayTile, () => { c.g.add(new THREE.BoxGeometry(w + 0.8, 0.14, 2.8), roof, M(0, 3.8, d / 2 + 0.9, 0, 1, 1, 1, 0.28)); });
  // The great carved teak door, an upper floor with shuttered windows, a parapet of stucco figures.
  box(c.g, 1.8, 2.6, 0.14, '#5a3a22', 0, 0.8, d / 2 - 0.55);
  for (let k = 0; k < 6; k++) box(c.g, 0.25, 0.25, 0.05, '#d4af37', -0.5 + (k % 3) * 0.5, 1.4 + Math.floor(k / 3) * 1, d / 2 - 0.45);
  for (let i = 0; i < 5; i++) { const x = -w / 2 + 1.3 + i * (w - 2.6) / 4; glass(c, x, 4.3, d / 2 - 0.58, 0.8, 1.1); for (const s of [-1, 1]) box(c.g, 0.4, 1.1, 0.05, '#2f7a5a', x + s * 0.62, 4.3, d / 2 - 0.55); }
  for (let i = 0; i < Math.round(w / 1.2); i++) { box(c.g, 0.5, 0.6, 0.4, wall, -w / 2 + 0.6 + i * 1.2, H, d / 2 - 0.8); sphere(c.g, 0.18, ['#e2b43a', '#c23b2a', '#2f6f9a'][i % 3], -w / 2 + 0.6 + i * 1.2, H + 0.8, d / 2 - 0.8, 6); }
  surf(c, SURF.clayTile, () => hip(c.g, w * 0.7, d * 0.6, 1.8, roof, 0, H, -1.2));
  return { r: w / 2 + 1, h: H + 2 };
}

export function agraharam(c: Ctx): Footprint {
  const wall = pick(c, ['#f4e2c4', '#e8d0a8', '#d8e8d0']), roof = '#b0503a', w = c.rng.range(5.5, 6.5), d = 10, H = 3.6;
  surf(c, SURF.plaster, () => box(c.g, w, H, d, wall));
  // Thinnai: raised stone seats either side of the door under a sloping tiled porch on wooden posts.
  for (const s of [-1, 1]) surf(c, SURF.ashlar, () => box(c.g, w / 2 - 0.8, 0.7, 1.4, '#9a9488', s * (w / 4 + 0.4), 0, d / 2 + 0.7));
  for (const s of [-1, 1]) cyl(c.g, 0.1, 0.12, 2.6, WOOD, s * (w / 2 - 0.2), 0, d / 2 + 1.3, 6);
  surf(c, SURF.clayTile, () => c.g.add(new THREE.BoxGeometry(w + 0.4, 0.12, 1.9), roof, M(0, 2.7, d / 2 + 0.8, 0, 1, 1, 1, 0.3)));
  box(c.g, 1.1, 2.1, 0.08, '#6b3a22', 0, 0, d / 2 + 0.03);
  // A kolam in rice flour on the step, and the tiled roof above.
  for (let rr = 1; rr <= 2; rr++) for (let i = 0; i < 8 * rr; i++) { const t = (i / (8 * rr)) * Math.PI * 2; sphere(c.g, 0.035, '#fbf7ee', Math.cos(t) * rr * 0.3, 0.02, d / 2 + 2.2 + Math.sin(t) * rr * 0.3, 3); }
  surf(c, SURF.clayTile, () => gable(c.g, d + 0.6, w + 1, 2.2, roof, 0, H, 0, Math.PI / 2));
  glass(c, 0, 4.2, d / 2 + 0.3, 0.6, 0.6);
  return { r: d / 2 + 2.4, h: H + 2.4 };
}

// ───────────── Bagh-e-Noor ─────────────

export function kashmiri(c: Ctx): Footprint {
  const brick = '#a0543a', timber = '#5a3a26', w = c.rng.range(8, 9.5), d = 8, floors = 3, fh = 2.9, H = floors * fh;
  surf(c, SURF.brick, () => box(c.g, w, H, d, brick));
  // Taq: timber bands laced through the brick at every floor, a projecting dab balcony of lattice.
  for (let f = 0; f <= floors; f++) box(c.g, w + 0.16, 0.2, d + 0.16, timber, 0, f * fh - 0.1, 0);
  for (let f = 0; f < floors; f++) for (const x of [-w / 3, 0, w / 3]) { if (f === 1 && x === 0) continue; glass(c, x, f * fh + 0.8, d / 2 + 0.02, 0.8, 1.2); lattice(c, x, f * fh + 0.8, d / 2 + 0.06, 0.8, 1.2, timber, 'grid'); }
  box(c.g, 3, 2.4, 1, timber, 0, fh + 0.2, d / 2 + 0.5);
  lattice(c, 0, fh + 0.5, d / 2 + 1.02, 2.6, 1.7, '#8a5a36', 'jali');
  glass(c, 0, fh + 0.6, d / 2 + 0.98, 2.4, 1.5);
  box(c.g, 1.2, 2.2, 0.08, timber, 0, 0, d / 2 + 0.04);
  // The steep pyramid roof in painted tin, with an attic window.
  const roof = pick(c, ['#2f7a4a', '#b0322a', '#3a3a44']);
  surf(c, SURF.steel, () => hip(c.g, w + 1.2, d + 1.2, 4, roof, 0, H, 0));
  box(c.g, 1.4, 1.2, 1.2, timber, 0, H + 1, d / 2 - 0.4); gable(c.g, 1.8, 1.6, 0.7, roof, 0, H + 2.2, d / 2 - 0.4, Math.PI / 2);
  glass(c, 0, H + 1.2, d / 2 + 0.22, 0.7, 0.7);
  return { r: Math.max(w, d) / 2 + 1.4, h: H + 4.2 };
}

export function baradari(c: Ctx): Footprint {
  const red = '#b5552e', white = '#fbf7ee', W = c.rng.range(9, 10), h = 4.4;
  surf(c, SURF.marble, () => box(c.g, W + 1.2, 0.7, W + 1.2, white));
  // Three arches on each side — twelve doors — framed in white on red sandstone, a chhajja eave.
  surf(c, SURF.ashlar, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(c.g, 1.2, h, 1.2, red, sx * (W / 2 - 0.6), 0.7, sz * (W / 2 - 0.6));
    for (const s of [-1, 1]) for (const k of [-1, 1]) { box(c.g, 0.7, h, 0.7, red, k * (W / 6), 0.7, s * (W / 2 - 0.35)); box(c.g, 0.7, h, 0.7, red, s * (W / 2 - 0.35), 0.7, k * (W / 6)); }
    box(c.g, W, 1.2, W, red, 0, 0.7 + h - 1.2, 0);
  });
  for (let i = 0; i < 3; i++) for (const [ry] of [[0], [Math.PI / 2], [Math.PI], [-Math.PI / 2]] as const) {
    const t = (i - 1) * (W / 3);
    c.g.frame(Math.sin(ry) * (W / 2), 0.7, Math.cos(ry) * (W / 2), ry, 1, () => archPanel(c.g, W / 3 - 0.9, h - 1.3, white, t, 0, 0.02, 0, 0.04, true));
  }
  c.g.add(new THREE.BoxGeometry(W + 1.6, 0.14, W + 1.6), white, M(0, 0.7 + h, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) chhatriKiosk(c, sx * (W / 2 - 0.8), 0.84 + h, sz * (W / 2 - 0.8), 0.8, white, white);
  onion(c.g, 1.6, white, 0, 0.84 + h, 0);
  for (let k = 0; k < 6; k++) sphere(c.glow, 0.12, '#ffd9a0', -2 + k * 0.8, 2.6, 0, 6);
  return { r: W / 2 + 1.4, h: h + 5 };
}

// ───────────── Sakura Hollow ─────────────

export function gassho(c: Ctx): Footprint {
  const w = c.rng.range(8, 9), d = 10;
  surf(c, SURF.boards, () => box(c.g, w, 2.8, d, '#6b4a2e'));
  // The great steep thatch like hands pressed in prayer, gable end to the street with its windows.
  surf(c, SURF.thatch, () => gable(c.g, d + 1, w + 1.2, 7.5, '#8a7048', 0, 2.8, 0, Math.PI / 2));
  const tri = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, 7.2)]);
  c.g.add(new THREE.ShapeGeometry(tri), '#e8dcc0', M(0, 2.8, d / 2 + 0.02));
  for (let f = 0; f < 3; f++) for (let i = -1; i <= 1; i++) { if (Math.abs(i) * 2.2 > (w / 2) * (1 - f / 3)) continue; glass(c, i * 1.6 * (1 - f * 0.3), 3.4 + f * 1.9, d / 2 + 0.04, 0.8, 0.9); lattice(c, i * 1.6 * (1 - f * 0.3), 3.4 + f * 1.9, d / 2 + 0.08, 0.8, 0.9, '#3a2a22', 'grid'); }
  for (let i = 0; i < 4; i++) box(c.g, 0.18, 0.18, w + 1.3, '#4a3426', 0, 3.2 + i * 1.8, 0, Math.PI / 2);
  box(c.g, 1.8, 2.2, 0.08, '#3a2a22', 0, 0, d / 2 + 0.04);
  return { r: d / 2 + 1, h: 10.5 };
}

export function teaHouse(c: Ctx): Footprint {
  const w = 5, d = 5;
  surf(c, SURF.plaster, () => box(c.g, w, 2.6, d, '#e8dcc0', 0, 0.4, 0));
  surf(c, SURF.boards, () => box(c.g, w + 1.6, 0.4, d + 1.6, '#6b4a2e'));
  // Shoji walls, a small nijiriguchi crawl-in door, a thatched hip roof, the roji stepping-stone path.
  for (let i = 0; i < 4; i++) { glass(c, -1.8 + i * 1.2, 0.8, d / 2 + 0.02, 1, 1.8); lattice(c, -1.8 + i * 1.2, 0.8, d / 2 + 0.05, 1, 1.8, '#4a3426', 'grid'); }
  box(c.g, 0.7, 0.7, 0.06, '#4a3426', w / 2 - 0.6, 0.4, d / 2 + 0.06);
  surf(c, SURF.thatch, () => hip(c.g, w + 2.2, d + 2.2, 2.2, '#8a7048', 0, 3, 0));
  box(c.g, 0.6, 0.4, 0.6, '#4a3426', 0, 5.2, 0);
  for (let i = 0; i < 5; i++) c.g.add(new THREE.CylinderGeometry(0.32, 0.36, 0.1, 8), '#8a8478', M(Math.sin(i * 0.8) * 0.6, 0.02, d / 2 + 1.2 + i * 0.6));
  box(c.g, 0.9, 0.7, 0.9, '#8a8478', -2.8, 0, d / 2 + 2); cyl(c.glow, 0.25, 0.25, 0.3, '#ffcf7a', -2.8, 0.7, d / 2 + 2, 6); // a stone lantern
  return { r: d / 2 + 3, h: 5.6 };
}

// ───────────── Hanok Village ─────────────

export function neowajip(c: Ctx): Footprint {
  const w = c.rng.range(7.5, 8.5), d = 5.5;
  surf(c, SURF.ashlar, () => box(c.g, w + 0.6, 0.6, d + 0.6, '#9a948a'));
  surf(c, SURF.plaster, () => box(c.g, w, 2.6, d, '#e8dcc0', 0, 0.6, 0));
  for (const x of [-w / 2, -w / 6, w / 6, w / 2]) box(c.g, 0.22, 2.6, 0.22, '#6b4a2a', x, 0.6, d / 2);
  for (const x of [-w / 3, w / 3]) { glass(c, x, 1.4, d / 2 + 0.02, 1.2, 1.2); lattice(c, x, 1.4, d / 2 + 0.05, 1.2, 1.2, '#6b4a2a', 'grid'); }
  // Roofed in thick shingles of pine bark, held down with stones and logs.
  surf(c, SURF.boards, () => gable(c.g, w + 1.6, d + 2, 2.6, '#5a4a3a', 0, 3.2, 0));
  for (let i = 0; i < 8; i++) sphere(c.g, 0.2, '#8a8478', -w / 2 + 0.5 + i * (w / 7.5), 4.1 + (i % 2) * 0.3, (i % 2 ? 1 : -1) * 1.1, 5);
  for (const s of [-1, 1]) cyl(c.g, 0.08, 0.08, w + 1.2, '#6b4a2a', 0, 3.9, s * 1.4, 5), void s;
  box(c.g, 1, 2, 0.08, '#6b4a2a', 0, 0.6, d / 2 + 0.03);
  return { r: w / 2 + 1.2, h: 6 };
}

export function jeongja(c: Ctx): Footprint {
  const W = 5.5, red = '#9a2f2a';
  surf(c, SURF.ashlar, () => box(c.g, W + 1.2, 1, W + 1.2, '#a8a498'));
  // An open pavilion for reading and poems: a raised wooden floor, painted columns, a railing,
  // dancheong-painted beams and a sweeping tiled roof.
  surf(c, SURF.boards, () => box(c.g, W, 0.2, W, '#8a6a4a', 0, 1.6, 0));
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]]) cyl(c.g, 0.16, 0.18, 3.2, red, sx * (W / 2 - 0.2), 1, sz * (W / 2 - 0.2), 10);
  for (const [len, x, z, ry] of [[W, 0, W / 2, 0], [W, 0, -W / 2, 0], [W, W / 2, 0, Math.PI / 2], [W, -W / 2, 0, Math.PI / 2]] as const) {
    box(c.g, len, 0.08, 0.08, '#6b4a2a', x, 2.3, z, ry);
    for (const [k, col] of ['#2f8a6a', '#3a6aa8', '#c23b2a'].entries()) box(c.g, len + 0.2, 0.12, 0.2, col, x, 3.6 + k * 0.12, z, ry);
  }
  sweptRoof(c.g, W + 3, W + 3, 2.2, '#4a4a52', 0, 4, 0, 0, 0.55);
  for (let i = 0; i < 5; i++) box(c.g, 0.5, 0.3, 0.3, '#6b4a2a', -1 + i * 0.5, 1, W / 2 + 0.8); // steps up
  return { r: W / 2 + 2, h: 6.5 };
}

// ───────────── Jade Terraces ─────────────

export function huizhou(c: Ctx): Footprint {
  const w = c.rng.range(8, 9.5), d = 8, h = 7;
  surf(c, SURF.plaster, () => box(c.g, w, h, d, '#f4f2ec'));
  // Horse-head walls: stepped firewall gables along each side, capped in black tiles.
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) {
    box(c.g, 0.4, 1.2, d * (1 - k * 0.28), '#f4f2ec', s * (w / 2 - 0.2), h + k * 1.1, 0);
    box(c.g, 0.7, 0.2, d * (1 - k * 0.28) + 0.4, '#2a2a30', s * (w / 2 - 0.2), h + 1.2 + k * 1.1, 0);
    for (const e of [-1, 1]) box(c.g, 0.5, 0.25, 0.4, '#2a2a30', s * (w / 2 - 0.2), h + 1.4 + k * 1.1, e * (d * (1 - k * 0.28) / 2 + 0.1));
  }
  surf(c, SURF.clayTile, () => gable(c.g, w - 0.6, d + 0.4, 2.2, '#3a3a40', 0, h, 0));
  // A carved stone door frame with a little tiled hood, small high windows.
  box(c.g, 2.2, 3.2, 0.12, '#8a8a88', 0, 0, d / 2 + 0.02);
  box(c.g, 1.4, 2.4, 0.08, '#3a2a22', 0, 0, d / 2 + 0.1);
  c.g.add(new THREE.BoxGeometry(2.8, 0.12, 0.8), '#2a2a30', M(0, 3.5, d / 2 + 0.3, 0, 1, 1, 1, 0.3));
  for (const x of [-w / 3, w / 3]) { glass(c, x, 4.6, d / 2 + 0.02, 0.7, 0.7); lattice(c, x, 4.6, d / 2 + 0.05, 0.7, 0.7, '#3a2a22', 'grid'); }
  return { r: Math.max(w, d) / 2 + 0.8, h: h + 4.2 };
}

export function diaojiaolou(c: Ctx): Footprint {
  const w = c.rng.range(7, 8), d = 6, wood = '#7a5230';
  // Timber rooms raised on stilts over the slope, a gallery with a railing round the front, a tiled roof.
  for (let i = 0; i < 4; i++) for (const z of [-d / 2 + 0.3, d / 2 - 0.3]) cyl(c.g, 0.14, 0.16, 2.2, '#5a3a22', -w / 2 + 0.3 + i * (w - 0.6) / 3, 0, z, 6);
  surf(c, SURF.boards, () => { box(c.g, w, 0.3, d + 1.4, wood, 0, 2.2, 0.7); box(c.g, w, 3, d, wood, 0, 2.5, 0); });
  for (let i = 0; i < 13; i++) box(c.g, 0.05, 0.9, 0.05, '#5a3a22', -w / 2 + i * (w / 12), 2.5, d / 2 + 1.35);
  box(c.g, w, 0.08, 0.1, '#5a3a22', 0, 3.4, d / 2 + 1.35);
  for (const x of [-w / 4, w / 4]) { glass(c, x, 3.2, d / 2 + 0.02, 1.2, 1.3); lattice(c, x, 3.2, d / 2 + 0.05, 1.2, 1.3, '#4a3426', 'grid'); }
  sweptRoof(c.g, w + 2.4, d + 3, 2.4, '#3a3a40', 0, 5.5, 0.6, 0, 0.45);
  for (let i = 0; i < 6; i++) box(c.g, 0.5, 0.2, 0.4, wood, -w / 2 - 0.6, i * 0.37, d / 2 + 0.2 - i * 0.2); // the stair up
  sphere(c.glow, 0.3, '#ff4a2a', w / 3, 4.9, d / 2 + 1.2, 8, 1.2);
  return { r: Math.max(w, d) / 2 + 1.8, h: 8 };
}

// ───────────── Nusa Rinjani ─────────────

export function joglo(c: Ctx): Footprint {
  const W = c.rng.range(9, 10), teak = '#6b4a2a';
  surf(c, SURF.boards, () => box(c.g, W - 2, 3, W - 2.5, '#8a6444', 0, 0.5, -0.6));
  surf(c, SURF.ashlar, () => box(c.g, W + 0.4, 0.5, W + 0.4, '#8a847a'));
  // The pendopo in front: four great soko guru pillars, and the stepped pyramid roof rising steeply in the middle.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.2, 0.22, 4, teak, sx * 1.4, 0.5, 1.6 + sz * 1.4, 8);
  for (let i = 0; i < 6; i++) cyl(c.g, 0.14, 0.14, 2.6, teak, -W / 2 + 0.4 + i * (W - 0.8) / 5, 0.5, W / 2 - 0.3, 8);
  surf(c, SURF.clayTile, () => { hip(c.g, W + 1.6, W + 1.6, 1, '#8a3a2a', 0, 3.1, 0); hip(c.g, W * 0.5, W * 0.45, 3.2, '#8a3a2a', 0, 4.1, 0); });
  // Carved doors in the wall behind, batik hanging.
  box(c.g, 1.6, 2.2, 0.1, '#5a3a22', 0, 0.5, W / 2 - 1.85);
  for (let k = 0; k < 10; k++) sphere(c.g, 0.06, '#d4af37', -0.6 + (k % 5) * 0.3, 1 + Math.floor(k / 5) * 1, W / 2 - 1.78, 4);
  return { r: W / 2 + 1.2, h: 7.5 };
}

export function rumahGadang(c: Ctx): Footprint {
  const w = c.rng.range(10, 11.5), d = 6, wood = '#5a3a26';
  for (let i = 0; i < 5; i++) for (const z of [-d / 2 + 0.3, d / 2 - 0.3]) cyl(c.g, 0.16, 0.18, 1.6, '#4a3222', -w / 2 + 0.5 + i * (w - 1) / 4, 0, z, 6);
  surf(c, SURF.boards, () => box(c.g, w, 3, d, wood, 0, 1.6, 0));
  // Carved and painted panels along the front, and the roof sweeping up into buffalo-horn peaks.
  for (let i = 0; i < 8; i++) for (let j = 0; j < 2; j++) box(c.g, w / 8 - 0.12, 1.1, 0.05, ['#c23b2a', '#e2b43a', '#2a2a2a'][(i + j) % 3], -w / 2 + (i + 0.5) * (w / 8), 2 + j * 1.3, d / 2 + 0.03);
  const n = 4;
  for (let k = 0; k < n; k++) {
    const x = -w / 2 + (k + 0.5) * (w / n);
    surf(c, SURF.thatch, () => gable(c.g, w / n + 0.4, d + 1.6, 3.2, '#3a3228', x, 4.6, 0, Math.PI / 2));
    for (const s of [-1, 1]) c.g.add(new THREE.ConeGeometry(0.35, 3, 6).translate(0, 1.5, 0), '#3a3228', M(x, 7.2, s * (d / 2 + 0.5), 0, 1, 1, 1, s * 0.9, 0));
  }
  for (let i = 0; i < 6; i++) box(c.g, 0.6, 0.2, 0.5, wood, 0, i * 0.3, d / 2 + 0.4 + (5 - i) * 0.3);
  return { r: w / 2 + 1, h: 10 };
}

// ───────────── Tents of Rimal ─────────────

export function oasisHouse(c: Ctx): Footprint {
  const mud = pick(c, ['#c8a070', '#b88e5a']), w = c.rng.range(8, 9), d = 8, h = 4.4;
  surf(c, SURF.adobe, () => box(c.g, w, h, d, mud));
  // Palm-trunk beams through the walls, triangle vents, a wooden door, a palm-shaded yard wall.
  for (let i = 0; i < 7; i++) cyl(c.g, 0.08, 0.08, 0.5, '#6b4a2a', -w / 2 + 0.6 + i * (w - 1.2) / 6, h - 0.4, d / 2 + 0.2, 4);
  for (let i = 0; i < 6; i++) c.g.add(new THREE.ConeGeometry(0.2, 0.35, 3), '#5a4028', M(-w / 2 + 1 + i * (w - 2) / 5, h - 1.2, d / 2 + 0.02, 0, 1, 1, 0.2));
  box(c.g, 1.3, 2.3, 0.1, '#7a4a2a', 0, 0, d / 2 + 0.04);
  merlons(c, w, d, h, mud, true);
  surf(c, SURF.adobe, () => { box(c.g, 0.5, 1.6, 5, mud, w / 2 + 2.5, 0, 0.5); box(c.g, 2.5, 1.6, 0.5, mud, w / 2 + 1.25, 0, 3); });
  return { r: w / 2 + 3, h: h + 1 };
}

export function majlisTent(c: Ctx): Footprint {
  const w = 10, d = 6, black = '#2a2622';
  // A reception tent open on three sides: its roof on tall poles, carpets and cushions spread under it,
  // a coffee hearth with brass dallahs.
  surf(c, SURF.cloth, () => { for (const s of [-1, 1]) c.g.add(new THREE.BoxGeometry(w + 0.4, 0.06, d / 2 + 0.6), black, M(0, 3.1, s * d / 4, 0, 1, 1, 1, s * 0.22, 0)); });
  for (let i = 0; i < 4; i++) for (const z of [-d / 2, 0, d / 2]) cyl(c.g, 0.06, 0.08, z === 0 ? 3.5 : 2.4, '#6b4a2a', -w / 2 + i * (w / 3), 0, z, 5);
  surf(c, SURF.cloth, () => box(c.g, w, 2.4, 0.05, black, 0, 0, -d / 2));
  for (let i = 0; i < 4; i++) box(c.g, 2.3, 0.04, 2.8, ['#c23b2a', '#2f5a9a', '#e2b43a', '#8a2a4a'][i], -w / 2 + 1.25 + i * 2.5, 0.01, 0);
  for (let i = 0; i < 8; i++) box(c.g, 1, 0.3, 0.6, i % 2 ? '#c23b2a' : '#e2b43a', -w / 2 + 0.7 + i * 1.2, 0, -d / 2 + 0.5);
  cyl(c.g, 0.5, 0.6, 0.3, '#6a5a44', 0, 0, 1.4, 10); cone(c.glow, 0.25, 0.5, '#ff8a2a', 0, 0.3, 1.4, 6);
  for (const x of [-0.8, 0.8]) { cyl(c.g, 0.12, 0.18, 0.35, '#c9a24a', x, 0, 1.4, 8); cone(c.g, 0.12, 0.25, '#c9a24a', x, 0.35, 1.4, 8); }
  return { r: w / 2 + 0.8, h: 3.8 };
}

// ───────────── The Sky Isles ─────────────

export function cloudCottage(c: Ctx): Footprint {
  const r = 2.8, wall = pick(c, c.s.walls);
  // A round cottage sitting on its own soft cloud, a domed glassy roof, round windows lit within.
  for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; sphere(c.g, 1.3 + (i % 3) * 0.3, '#fbf8ff', Math.cos(a) * (r + 0.6), 0.3, Math.sin(a) * (r + 0.6), 8, 0.6); }
  surf(c, SURF.marble, () => cyl(c.g, r, r, 3, wall, 0, 0.5, 0, 18));
  surf(c, SURF.glazed, () => dome(c.g, r + 0.3, pick(c, c.s.roofs), 0, 3.5, 0, 18, 0.8));
  sphere(c.glow, 0.25, '#fff0b0', 0, 3.5 + (r + 0.3) * 0.8 + 0.3, 0, 8);
  for (const a of [0.9, -0.9, 2.6]) c.glow.add(new THREE.CircleGeometry(0.45, 14), c.s.glow, M(Math.sin(a) * (r + 0.02), 2, Math.cos(a) * (r + 0.02), a));
  archPanel(c.g, 1.1, 2, '#c9a0ff', 0, 0.5, r + 0.02, 0, 0.08, true);
  return { r: r + 2, h: 7.5 };
}

export function moonHouse(c: Ctx): Footprint {
  const w = 6, d = 5, wall = pick(c, c.s.walls), gold = '#d4af37';
  surf(c, SURF.marble, () => box(c.g, w, 3.4, d, wall));
  // A roof shaped like a crescent moon, stars hung from its horns, a moonstone door.
  const moon = new THREE.Shape();
  moon.absarc(0, 0, 3.4, 0, Math.PI, false);
  moon.absarc(0.9, 0.4, 2.7, Math.PI, 0, true);
  c.g.add(new THREE.ExtrudeGeometry(moon, { depth: d + 0.4, bevelEnabled: false, curveSegments: 20 }).translate(0, 0, -(d + 0.4) / 2), '#fff4c0', M(0, 3.4, 0));
  for (const x of [-3.2, 2.9]) { cyl(c.g, 0.01, 0.01, 1, gold, x, 2.6, d / 2 + 0.2, 3); c.glow.add(new THREE.OctahedronGeometry(0.18), '#fff4c0', M(x, 2.5, d / 2 + 0.2)); }
  archPanel(c.g, 1.2, 2.2, '#c9a0ff', 0, 0, d / 2 + 0.02, 0, 0.08, true);
  for (const x of [-w / 3, w / 3]) c.glow.add(new THREE.CircleGeometry(0.4, 14), c.s.glow, M(x, 2, d / 2 + 0.03));
  return { r: Math.max(w, d) / 2 + 1.6, h: 7.2 };
}

// Keep lint quiet about helpers some builders leave unused in some branches.
void barjeel; void cone;
