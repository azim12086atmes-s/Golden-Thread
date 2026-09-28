import * as THREE from 'three';
import { Rng } from '../core/rng';
import { LAND_STYLE } from './buildings';
import { CRYSTAL_PAL, crystalCluster } from './islands';
import { GeoBuilder, M, archPanel, box, cone, cyl, dome, sphere } from './kit';
import { dressRoom } from './interiorDress';
import type { InteriorBuild, InteriorSpec } from './models/interiors';
import { REGION_BY_ID, type RegionId } from './regions';
import { rockGeometry, shardGeometry } from './rocks';

/**
 * Built interiors (the contract in models/interiors.ts): the caverns you walk into — rock, ice and
 * crystal chambers with stalactites, glittering crystals and a glowing pool; the institutes' rooms
 * by kind — the kitchen hall, the clinic ward (green crescent), the classroom, the library stacks,
 * and the sciences' workshops; the celebration castle's great hall of floating candles with its
 * library alcove and tower stair; and each land's landmark hall in its own colours and arches.
 * Institute rooms and landmark halls are dressed as their land's own interiors are (interiorDress.ts):
 * the floor, the walls, the ceiling and the lamps.
 *
 * Every room: floor at y = 0, the way in at +z, the two seats ≥ 2.2 m apart (they never touch).
 */

let solidMat: THREE.MeshStandardMaterial | null = null, glowMat: THREE.MeshBasicMaterial | null = null;
const mats = () => ({
  solid: (solidMat ??= new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 })),
  glow: (glowMat ??= new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })),
});

interface R { g: GeoBuilder; glow: GeoBuilder; rng: Rng; land: RegionId; night: number }

function finish(r: R, room: InteriorBuild['room'], seats: InteriorBuild['seats'], spots: InteriorBuild['spots'], camera: InteriorBuild['camera'], gather?: InteriorBuild['gather']): InteriorBuild {
  const group = new THREE.Group(), m = mats();
  const a = r.g.build(m.solid), b = r.glow.build(m.glow);
  if (a) group.add(a);
  if (b) group.add(b);
  return { group, room, seats, spots, camera, gather };
}

/** Turn a closed geometry inside out (winding and normals), to be seen from within. */
function insideOut(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const idx = geo.getIndex();
  if (idx) for (let i = 0; i < idx.count; i += 3) { const t = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, t); }
  geo.computeVertexNormals();
  return geo;
}

/** A plain rectangular room shell: floor, three walls and a ceiling, the front open to the camera. */
function shell(r: R, halfW: number, back: number, front: number, h: number, wall: string, floor: string, ceiling = wall): void {
  const d = front - back, cz = (front + back) / 2;
  box(r.g, halfW * 2, 0.1, d, floor, 0, -0.1, cz);
  box(r.g, halfW * 2, h, 0.2, wall, 0, 0, back - 0.1);
  for (const s of [-1, 1]) box(r.g, 0.2, h, d, wall, s * (halfW + 0.1), 0, cz);
  box(r.g, halfW * 2, 0.2, d, ceiling, 0, h, cz);
}
function bench(r: R, x: number, z: number, w: number, ry = 0): void { box(r.g, w, 0.45, 0.5, '#8a5a36', x, 0, z, ry); }
function table(r: R, x: number, z: number, w: number, d: number, col = '#8a5a36'): void {
  box(r.g, w, 0.08, d, col, x, 0.74, z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(r.g, 0.08, 0.74, 0.08, '#5a3a22', x + sx * (w / 2 - 0.1), 0, z + sz * (d / 2 - 0.1));
}
function shelfWall(r: R, x: number, z: number, w: number, h: number, ry = 0): void {
  const cols = ['#8a2a3a', '#2f4a8a', '#3a7a4a', '#c8a040', '#6a3a7a', '#a8502a'];
  r.g.frame(x, 0, z, ry, 1, () => {
    box(r.g, w, h, 0.45, '#5a3a22', 0, 0, 0);
    for (let row = 0; row < Math.floor(h / 0.45); row++) for (let i = 0; i < Math.floor(w / 0.12); i++) {
      box(r.g, 0.1, 0.3 + ((i * 7 + row) % 3) * 0.04, 0.05, cols[(i + row * 2) % cols.length], -w / 2 + 0.08 + i * 0.12, 0.08 + row * 0.45, 0.23);
    }
  });
}

// ─────────────────────────── caverns ───────────────────────────

function cavern(r: R, style: string): InteriorBuild {
  const look = style === 'den' ? { rock: '#7a5a3a', dark: '#5a402a', glow: '#ffcf7a' } : style === 'ice' ? { rock: '#bfe0f4', dark: '#8ab8dc', glow: '#6ac8ff' } : style === 'crystal' ? { rock: '#d8d0ec', dark: '#b0a8d0', glow: '#e0c8ff' } : style === 'sandstone' ? { rock: '#c98a5a', dark: '#9a6a42', glow: '#ffb84a' } : { rock: '#7a7064', dark: '#5a534c', glow: '#9ae8ff' };
  const W = 9, H = 7;
  // The chamber: a great hollow of rock, seen from inside, its floor worn flat.
  const hollow = insideOut(rockGeometry(W, { style: style === 'ice' ? 'ice' : style === 'sandstone' ? 'sandstone' : 'crag', tall: H / W, seed: r.rng.int(1, 900), detail: 4 }));
  r.g.add(hollow, look.rock, M(0, -0.6, -2));
  box(r.g, W * 2, 0.2, W * 2, look.dark, 0, -0.2, -2);
  // Stalactites from the roof, stalagmites from the floor.
  for (let i = 0; i < 26; i++) {
    const a = r.rng.range(0, Math.PI * 2), d = r.rng.range(1.5, W * 0.75), x = Math.cos(a) * d, z = -2 + Math.sin(a) * d * 0.8;
    if (z > 2.5) continue;
    const h = r.rng.range(0.6, 2.4);
    if (i % 2) r.g.add(shardGeometry(h, h * 0.2, i), look.rock, M(x, H * 0.8 - (d / W) * 2.5, z, 0, 1, 1, 1, Math.PI, 0));
    else if (d > 3) r.g.add(shardGeometry(h * 0.8, h * 0.22, i), look.dark, M(x, 0, z));
  }
  // Crystals glittering along the walls; a glowing pool at the back.
  const nc = style === 'crystal' ? 18 : style === 'ice' ? 10 : 6;
  for (let i = 0; i < nc; i++) {
    const a = r.rng.range(Math.PI * 0.9, Math.PI * 2.1), d = W * r.rng.range(0.6, 0.85);
    crystalCluster(r.g, r.glow, Math.cos(a) * d, 0, -2 + Math.sin(a) * d * 0.8, r.rng.range(0.6, 1.8), () => r.rng.next(), style === 'ice' ? ['#cfeaff', '#a8d8f8', '#e8f6ff'] : CRYSTAL_PAL);
  }
  r.glow.add(new THREE.CircleGeometry(2.4, 24).rotateX(-Math.PI / 2), look.glow, M(0, 0.03, -6));
  for (let i = 0; i < 12; i++) sphere(r.glow, 0.06, look.glow, r.rng.range(-5, 5), r.rng.range(1, 4), r.rng.range(-7, 1), 4);
  // Seats: two flat stones either side of the chamber.
  r.g.add(rockGeometry(0.7, { style: 'pebble', seed: 3, tall: 0.5 }), look.dark, M(-1.8, 0, 0.8));
  r.g.add(rockGeometry(0.7, { style: 'pebble', seed: 7, tall: 0.5 }), look.dark, M(1.8, 0, 0.8));
  return finish(r, { halfW: 7, back: -9, front: 4, height: H }, [[-1.8, 0.4, 0.8], [1.8, 0.4, 0.8]], [], { pos: [0, 2.2, 6.5], look: [0, 1.4, -3] }, [0, 0, -5.2]);
}

// ─────────────────────────── institutes ───────────────────────────

const MEDICINE = ['clinic', 'tcm', 'ayurveda', 'siddha'];
const LEARNING = ['school', 'islamicsciences', 'anatomy', 'starlore'];
const BOOKS = ['library'];

function institute(r: R, kind: string, stage: number): InteriorBuild {
  const s = REGION_BY_ID[r.land], st = LAND_STYLE[r.land];
  const halfW = 4.5 + stage * 1.2, back = -5 - stage * 1.5, h = 3.6 + stage * 0.8;
  // The room as its land builds rooms inside: floor, walls, ceiling and lamps (interiorDress.ts).
  const inset = dressRoom(r, halfW, back, 4, h);
  // Windows along the walls in the land's arch, bright by day, warm at night.
  for (const sx of [-1, 1]) for (let i = 0; i < 2 + stage; i++) archPanel(r.glow, 1, 1.6, r.night > 0.5 ? s.glow : '#e8f4ff', sx * (halfW - inset - 0.01), 1.4, back + 1.5 + i * 2.6, sx * -Math.PI / 2, 0.05, st.arch === 'pointed');
  const spots: Array<[number, number]> = [[0, back + 1.4]];
  if (kind === 'kitchen') {
    box(r.g, halfW * 1.4, 0.95, 0.8, '#b8b0a0', 0, 0, back + 0.6); // the counter
    for (let i = 0; i < 3; i++) { cyl(r.g, 0.35, 0.3, 0.45, '#7a7a80', -1.5 + i * 1.5, 0.95, back + 0.6, 10); for (let k = 0; k < 3; k++) sphere(r.g, 0.12 + k * 0.05, '#f2f2f2', -1.5 + i * 1.5, 1.6 + k * 0.3, back + 0.6, 5); }
    for (let row = 0; row < 1 + stage; row++) { table(r, 0, back + 3 + row * 2.2, halfW * 1.2, 0.9); for (const sz of [-1, 1]) bench(r, 0, back + 3 + row * 2.2 + sz * 0.8, halfW * 1.2); }
    for (let i = 0; i < 2 + stage; i++) spots.push([-halfW + 1 + i * 1.6, back + 3.9]);
  } else if (MEDICINE.includes(kind)) {
    for (let i = 0; i < 2 + stage; i++) for (const sx of [-1, 1]) {
      const z = back + 1.4 + i * 2;
      if (z > 0) continue;
      box(r.g, 0.9, 0.55, 2, '#e8e8f0', sx * (halfW - 1), 0, z); box(r.g, 0.8, 0.12, 0.5, '#ffffff', sx * (halfW - 1), 0.55, z - 0.7);
      box(r.g, 0.04, 1.8, 1.8, '#dff3e6', sx * (halfW - 1.7), 0, z); // a curtain
    }
    // The green crescent over the back wall; shelves of remedies.
    r.glow.add(new THREE.TorusGeometry(0.45, 0.13, 6, 20, Math.PI * 1.25), '#2fbf6a', M(0, h - 1.1, back + 0.05, 0, 1, 1, 1, 0, Math.PI * 0.62));
    for (let i = 0; i < 12; i++) cyl(r.g, 0.08, 0.08, 0.22, ['#c89a5a', '#3a7a4a', '#b8b0a0'][i % 3], -1.6 + (i % 6) * 0.6, 1 + Math.floor(i / 6) * 0.5, back + 0.3, 6);
    box(r.g, 3.8, 1.8, 0.3, '#6a4a30', 0, 0.6, back + 0.2);
    spots.push([halfW - 1.2, back + 2.4], [-(halfW - 1.2), back + 2.4]);
  } else if (BOOKS.includes(kind) || kind === 'islamicsciences') {
    for (let i = 0; i < 3 + stage; i++) for (const sx of [-1, 1]) shelfWall(r, sx * (halfW - 0.3), back + 1 + i * 1.8, 1.6, Math.min(h - 0.4, 2.6 + stage * 0.6), sx * -Math.PI / 2);
    shelfWall(r, 0, back + 0.3, halfW * 1.6, h - 0.4);
    table(r, 0, back + 2.6, 3, 1.2, '#6a4a30');
    for (let i = 0; i < 4; i++) sphere(r.glow, 0.12, '#ffd08a', -1 + (i % 2) * 2, 1.05, back + 2.3 + Math.floor(i / 2) * 0.6, 6, 1.2);
    spots.push([2, back + 3.6]);
  } else if (LEARNING.includes(kind)) {
    box(r.g, 3.2, 1.3, 0.08, '#2a3a2e', 0, 1, back + 0.1); box(r.g, 3.4, 0.08, 0.2, '#8a5a36', 0, 0.95, back + 0.2);
    for (let row = 0; row < 2 + Math.min(stage, 2); row++) for (let i = -1; i <= 1; i++) { table(r, i * 2.2, back + 2.2 + row * 1.6, 1.4, 0.6); box(r.g, 0.5, 0.45, 0.45, '#8a5a36', i * 2.2, 0, back + 2.8 + row * 1.6); spots.push([i * 2.2, back + 3 + row * 1.6]); }
  } else {
    // A workshop of the land's craft: benches along the walls, tools and work in progress, a lamp over each.
    for (let i = 0; i < 2 + stage; i++) for (const sx of [-1, 1]) {
      const z = back + 1.4 + i * 1.9;
      if (z > 0.2) continue;
      table(r, sx * (halfW - 0.9), z, 1.2, 1.5, '#7a5a3a');
      box(r.g, 0.4, 0.3, 0.4, ['#c8a060', '#7fb8a0', '#b0322a', '#6a8aa8'][i % 4], sx * (halfW - 0.9), 0.82, z);
      sphere(r.glow, 0.1, '#ffd08a', sx * (halfW - 0.9), h - 0.6, z, 6, 1.3);
    }
    scienceRoom(r, kind, halfW, back, h);
    if (kind === 'magic') for (let i = 0; i < 20; i++) sphere(r.glow, 0.08, '#ffe8a0', r.rng.range(-halfW + 1, halfW - 1), r.rng.range(2.2, h - 0.4), r.rng.range(back + 1, 1), 5, 1.6);
    if (kind === 'lightcraft') for (let i = 0; i < 7; i++) box(r.glow, 0.25, 2.4, 0.05, ['#ff5a5a', '#ff9a3a', '#ffd23a', '#5ad85a', '#3a9aff', '#5a5aff', '#b86bff'][i], -1.5 + i * 0.5, 0.5, back + 0.2);
    if (kind === 'polar' || kind === 'starlore' || kind === 'navigation') { cyl(r.g, 0.15, 0.2, 1.2, '#3a3a44', 0, 0, back + 1.6, 8); r.g.add(new THREE.CylinderGeometry(0.18, 0.25, 1.8, 10), GOLD, M(0, 1.6, back + 1.6, 0, 1, 1, 1, -0.7, 0)); }
    for (let i = 0; i < 3; i++) spots.push([-halfW + 1.3 + i * (halfW - 1.3), back + 2.2]);
  }
  return finish(r, { halfW, back, front: 4, height: h }, [[-1.7, 0.45, 1.6], [1.7, 0.45, 1.6]], spots, { pos: [0, 2.3, 5.8], look: [0, 1.3, back + 1] }, [halfW - 1.4, 0, back + 1]);
}
const GOLD = '#d4af37';

// ─────────────────────────── the castle's great hall ───────────────────────────

function castle(r: R): InteriorBuild {
  const halfW = 8, back = -16, h = 12, ivory = '#f4ecf0', rose = '#e8588c';
  shell(r, halfW, back, 5, h, ivory, '#c8b8c0', '#3a2a5a');
  // A vaulted ceiling of stars; tall pointed windows; banners.
  for (let i = 0; i < 40; i++) sphere(r.glow, 0.05, '#fff4c0', r.rng.range(-halfW, halfW), h - 0.15, r.rng.range(back, 4), 4);
  for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
    archPanel(r.glow, 1.6, 5, r.night > 0.5 ? '#b89aff' : '#dff0ff', sx * (halfW - 0.01), 3, back + 3 + i * 4.5, sx * -Math.PI / 2, 0.06, true);
    box(r.g, 0.05, 3.6, 1.2, i % 2 ? rose : '#6a3a8a', sx * (halfW - 0.1), 6.5, back + 5.2 + i * 4.5, 0);
  }
  // The high table on a dais, long tables down the hall, floating candles.
  box(r.g, 10, 0.5, 3, '#d8c8d0', 0, 0, back + 2);
  table(r, 0, back + 2.2, 8, 1.2, '#6a3a22');
  for (const x of [-3.5, 3.5]) { table(r, x, back + 9, 1.2, 12, '#7a4a2a'); for (const s of [-1, 1]) bench(r, x + s * 0.9, back + 9, 12, Math.PI / 2); }
  for (let i = 0; i < 60; i++) {
    const x = r.rng.range(-halfW + 1, halfW - 1), y = r.rng.range(4.5, 9), z = r.rng.range(back + 1, 2);
    cyl(r.g, 0.05, 0.05, 0.3, '#fbf7ee', x, y, z, 5); sphere(r.glow, 0.06, '#ffd88a', x, y + 0.36, z, 4, 1.5);
  }
  // The library alcove and the stair up to the tower.
  for (let i = 0; i < 3; i++) shelfWall(r, -halfW + 0.3, back + 2 + i * 1.8, 1.6, 4, Math.PI / 2);
  for (let i = 0; i < 12; i++) box(r.g, 1.6, 0.25, 0.5, '#d8c8d0', halfW - 1, i * 0.35, back + 3 + i * 0.5);
  archPanel(r.g, 1.8, 3, '#2a1a3a', halfW - 1, 4.2, back + 9.2, 0, 0.1, true);
  return finish(r, { halfW, back, front: 5, height: h }, [[-1.6, 0.45, 1.8], [1.6, 0.45, 1.8]], [[0, back + 2.8], [-4.5, back + 6], [4.5, back + 6]], { pos: [0, 3, 7.5], look: [0, 3.4, back + 4] });
}

// ─────────────────────────── landmark halls ───────────────────────────

function landmarkHall(r: R): InteriorBuild {
  const s = REGION_BY_ID[r.land], st = LAND_STYLE[r.land];
  const halfW = 7, back = -12, h = 8;
  // The hall as its land builds halls inside (interiorDress.ts); Sakura Hollow and New Yonder lay their own floors below.
  const inset = dressRoom(r, halfW, back, 5, h, { floor: r.land !== 'japan' && r.land !== 'newyork' });
  // Columns down both sides, arches between, a lit dome of the land's colour overhead.
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
    const z = back + 1.5 + i * 3;
    cyl(r.g, 0.3, 0.34, h - 0.4, s.trims[0], sx * (halfW - 1.6), 0, z, 10);
    archPanel(r.glow, 1.2, 2.6, r.night > 0.5 ? s.glow : '#e8f4ff', sx * (halfW - inset - 0.01), 1.6, z + 1.5, sx * -Math.PI / 2, 0.05, st.arch === 'pointed');
  }
  // A runner down the middle in the land's frieze colours, over its floor.
  const [fa, fb] = st.frieze;
  for (let i = 0; i < 12; i++) box(r.g, 1.4, 0.05, 1.2, i % 2 ? fa : fb, 0, 0, back + 1 + i * 1.3);
  // What is inside this monument (monumentInside): each its own.
  if (!monumentInside(r, halfW, back, h)) {
    dome(r.glow, 2.6, s.glow, 0, h - 1.6, back + 5, 16, 0.4);
    cyl(r.g, 1.4, 1.5, 0.6, s.trims[0], 0, 0, back + 3.5, 16);
    r.glow.add(new THREE.CircleGeometry(1.25, 18).rotateX(-Math.PI / 2), '#7affe0', M(0, 0.62, back + 3.5));
    cone(r.glow, 0.15, 1.2, '#dff6ff', 0, 0.6, back + 3.5, 6);
  }
  for (const sx of [-1, 1]) bench(r, sx * 3.2, 0.6, 1.8, Math.PI / 2);
  return finish(r, { halfW, back, front: 5, height: h }, [[-3.2, 0.45, 0.6], [3.2, 0.45, 0.6]], [[0, back + 6.5], [-4, back + 3], [4, back + 3]], { pos: [0, 2.6, 7], look: [0, 2, back + 3] }, [4.5, 0, back + 1.5]);
}

/**
 * The heart of each science's workshop (owner: "interiors for institutional builds"): what that
 * science works with, set in the middle of the room, clear of the seats and the way in.
 */
function scienceRoom(r: R, kind: string, halfW: number, back: number, h: number): void {
  const z = back + 2.6, brass = '#c9a24a', wood = '#7a5a3a';
  switch (kind) {
    case 'tea':
      for (let i = 0; i < 4; i++) box(r.g, 1.8, 0.05, 0.9, '#c8d49a', -0.9 + (i % 2) * 1.8, 0, z - 0.45 + Math.floor(i / 2) * 0.9);
      cyl(r.g, 0.3, 0.25, 0.3, '#2a2a2a', 0, 0.05, z, 10); sphere(r.g, 0.28, '#3a3a3a', 0, 0.5, z, 10, 0.8);
      for (let i = 0; i < 4; i++) cyl(r.g, 0.09, 0.07, 0.1, '#6a8a5a', -0.6 + i * 0.4, 0.05, z + 0.6, 8);
      break;
    case 'celadon':
      // A kiln with a glowing mouth, a potter's wheel, shelves of jade-green ware.
      box(r.g, 1.6, 1.6, 1.4, '#8a6a5a', -2.2, 0, z); archPanel(r.glow, 0.6, 0.6, '#ff8a3a', -2.2, 0.3, z + 0.72);
      cyl(r.g, 0.4, 0.45, 0.6, '#6a5a4a', 1.4, 0, z, 12); cyl(r.g, 0.35, 0.35, 0.05, '#8a7a6a', 1.4, 0.6, z, 12);
      for (let i = 0; i < 10; i++) cyl(r.g, 0.12, 0.09, 0.3, '#9ac8b0', -halfW + 0.8 + (i % 5) * 0.4, 1.2 + Math.floor(i / 5) * 0.5, back + 0.35, 8);
      break;
    case 'watchmaking':
      for (let i = 0; i < 5; i++) { r.glow.add(new THREE.CircleGeometry(0.35, 16), '#fff4d8', M(-2.4 + i * 1.2, h - 1.3, back + 0.12)); box(r.g, 0.04, 0.28, 0.02, '#2a2a2a', -2.4 + i * 1.2, h - 1.4, back + 0.14); }
      for (let i = 0; i < 12; i++) cyl(r.g, 0.05 + (i % 3) * 0.03, 0.05 + (i % 3) * 0.03, 0.02, brass, -0.8 + (i % 6) * 0.3, 0.83, z + (i < 6 ? -0.15 : 0.15), 10);
      sphere(r.glow, 0.08, '#ffe8a0', 0, 1.5, z, 6);
      break;
    case 'engineering':
    case 'radio':
      // Gears and a drafting table with plans; a radio set with glowing valves for the radio lab.
      table(r, 0, z, 2.2, 1.2, '#6a4a30'); box(r.g, 1.8, 0.02, 1, '#dce8f4', 0, 0.83, z);
      for (let i = 0; i < 3; i++) r.g.add(new THREE.TorusGeometry(0.3 + i * 0.12, 0.05, 4, 16), brass, M(-2.8 + i * 0.3, 1.6 + i * 0.5, back + 0.15));
      if (kind === 'radio') { box(r.g, 1, 0.7, 0.5, wood, 2.3, 0.75, z); for (let i = 0; i < 4; i++) cyl(r.glow, 0.05, 0.05, 0.2, '#ff9a3a', 2.0 + i * 0.2, 1.45, z, 6); cyl(r.g, 0.02, 0.02, h - 1.6, '#3a3a3a', 2.7, 1.45, z, 3); }
      break;
    case 'tech':
      for (let i = 0; i < 3; i++) { table(r, -2.2 + i * 2.2, z, 1.6, 0.8, '#d8d8e0'); box(r.glow, 1, 0.6, 0.04, ['#4ad8ff', '#b86bff', '#7aff9a'][i], -2.2 + i * 2.2, 0.95, z - 0.25); }
      for (let i = 0; i < 6; i++) box(r.glow, 0.05, 0.05, 2, ['#ff4ad0', '#4ad8ff'][i % 2], -halfW + 0.2, 0.5 + i * 0.5, back + 2);
      break;
    case 'shipwright':
      // A boat's hull on its stocks, half planked.
      box(r.g, 0.6, 0.6, 3.4, '#6b4a2a', 0, 0, z);
      r.g.add(new THREE.SphereGeometry(0.8, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, 0.9, 2.6), '#a8783f', M(0, 1.3, z));
      break;
    case 'anatomy':
      for (let i = 0; i < 3; i++) { const x = -2.4 + i * 2.4; for (const sx of [-1, 1]) r.g.add(new THREE.BoxGeometry(0.05, 1.8, 0.05), wood, M(x + sx * 0.35, 0.9, z, 0, 1, 1, 1, -0.15, 0)); box(r.g, 0.9, 1.1, 0.04, '#f4eee2', x, 1, z - 0.15); }
      break;
    case 'navigation':
    case 'starlore':
    case 'polar':
      // A globe or an orrery on a map table.
      table(r, 0, z, 2.4, 1.4, '#6a4a30'); box(r.g, 2.2, 0.02, 1.2, '#e8d8a8', 0, 0.83, z);
      sphere(r.g, 0.35, '#3a6aa8', -0.7, 1.25, z, 12); r.g.add(new THREE.TorusGeometry(0.42, 0.02, 4, 20), brass, M(-0.7, 1.25, z, 0, 1, 1, 1, 0.4, 0));
      for (let i = 0; i < 4; i++) { r.g.add(new THREE.TorusGeometry(0.2 + i * 0.12, 0.012, 4, 20), brass, M(0.8, 1.2, z, 0, 1, 1, 1, Math.PI / 2, 0)); sphere(r.glow, 0.04 + i * 0.01, ['#ffd24a', '#8fd0ff', '#ff8a5a', '#c9a0ff'][i], 0.8 + 0.2 + i * 0.12, 1.2, z, 5); }
      break;
    case 'irrigation':
    case 'subak':
    case 'gardens':
      // A model of terraces or a garden with running water.
      for (let k = 0; k < 4; k++) box(r.g, 2.6 - k * 0.5, 0.2, 1.6 - k * 0.3, '#6a8a4a', 0, 0.5 + k * 0.2, z);
      r.glow.add(new THREE.PlaneGeometry(0.15, 1.2).rotateX(-Math.PI / 2), '#7ad8ff', M(0.9, 0.72, z));
      box(r.g, 2.8, 0.5, 1.8, '#8a7a6a', 0, 0, z);
      break;
    case 'lightcraft':
      for (let i = 0; i < 3; i++) r.glow.add(new THREE.OctahedronGeometry(0.25), ['#ff8fb8', '#8fd0ff', '#ffd24a'][i], M(-0.8 + i * 0.8, 1.6, z));
      break;
    case 'magic':
      table(r, 0, z, 1.8, 1, '#4a3a5a');
      for (let i = 0; i < 5; i++) box(r.g, 0.35, 0.08, 0.25, ['#8a2a3a', '#2f4a8a', '#3a7a4a'][i % 3], -0.6 + i * 0.3, 0.83 + (i % 2) * 0.08, z);
      sphere(r.glow, 0.2, '#c9a0ff', 0, 1.3, z, 10);
      break;
  }
}

/** A gear: a wheel with teeth, facing +z. */
function gear(r: R, x: number, y: number, z: number, rad: number, col: string): void {
  r.g.add(new THREE.TorusGeometry(rad, rad * 0.12, 5, 24), col, M(x, y, z));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; box(r.g, rad * 0.18, rad * 0.22, 0.12, col, x + Math.cos(a) * rad * 1.1, y + Math.sin(a) * rad * 1.1 - rad * 0.11, z, 0); }
  for (let i = 0; i < 4; i++) r.g.add(new THREE.BoxGeometry(rad * 2, rad * 0.1, 0.08), col, M(x, y, z, 0, 1, 1, 1, 0, (i * Math.PI) / 4));
}

/** A robed statue on a plinth, its head floating free (no face). */
function statue(r: R, x: number, z: number, col: string): void {
  box(r.g, 0.9, 1, 0.9, '#d8d0c0', x, 0, z);
  cone(r.g, 0.35, 1.5, col, x, 1, z, 8);
  sphere(r.g, 0.17, col, x, 2.72, z, 8);
}

/**
 * Inside each monument (owner: "interiors for monuments"): the room of what the monument is —
 * a pagoda's central pillar over tatami, the Temple of Heaven's ring of pillars under a coffered
 * sky, the clockworks inside the clock towers, the prayer hall with its mihrab and lamps, the
 * tomb chamber behind jali screens, the burial chamber in the pyramid, the gopuram's pillared hall,
 * the hollow inside the Great Tree… Returns false for a land without its own (the plain hall).
 */
function monumentInside(r: R, halfW: number, back: number, h: number): boolean {
  const mid = back + 3.5, gold = '#d4af37';
  switch (r.land) {
    case 'japan':
      cyl(r.g, 0.5, 0.55, h, '#6b4a2a', 0, 0, mid, 10); // the shinbashira, the pagoda's heart pillar
      for (let i = 0; i < 6; i++) for (const sx of [-1, 1]) { box(r.g, 1.8, 0.05, 0.9, '#c8d49a', sx * 1.4, 0, back + 1 + i * 1.8); box(r.g, 1.84, 0.06, 0.06, '#2a3a2e', sx * 1.4, 0, back + 0.55 + i * 1.8); }
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) box(r.glow, 0.05, 2.2, 1.4, '#fff6e0', sx * (halfW - 0.3), 0.8, back + 2 + i * 2.4);
      for (let i = 0; i < 6; i++) { cyl(r.glow, 0.22, 0.22, 0.5, '#ff6a4a', -3 + (i % 3) * 3, h - 1.6, back + 2 + Math.floor(i / 3) * 5, 8); }
      // The four vermilion inner posts round the heart pillar, tied by beams; a coffered ceiling
      // of lacquered squares; bronze lanterns hanging on chains at the corners of the inner bay.
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(r.g, 0.26, 0.28, h, '#c8412e', sx * 2.2, 0, mid + sz * 2.2, 10);
      for (const sz of [-1, 1]) box(r.g, 4.9, 0.3, 0.3, '#c8412e', 0, h - 1.1, mid + sz * 2.2);
      for (const sx of [-1, 1]) box(r.g, 0.3, 0.3, 4.9, '#c8412e', sx * 2.2, h - 1.1, mid);
      for (let i = -3; i <= 3; i++) { box(r.g, 0.12, 0.14, 7.2, '#3a2a22', i * 1.2, h - 0.3, mid); box(r.g, 7.2, 0.14, 0.12, '#3a2a22', 0, h - 0.3, mid + i * 1.2); }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { cyl(r.g, 0.02, 0.02, 1, '#3a3228', sx * 2.2, h - 1.8, mid + sz * 3.2, 3); cyl(r.g, 0.2, 0.26, 0.5, '#5a5a4a', sx * 2.2, h - 2.3, mid + sz * 3.2, 6); cyl(r.glow, 0.16, 0.16, 0.3, '#ffcf7a', sx * 2.2, h - 2.2, mid + sz * 3.2, 6); }
      return true;
    case 'korea':
      for (let k = 0; k < 3; k++) box(r.g, 5 - k * 1, 0.3, 3 - k * 0.6, '#b8b0a4', 0, k * 0.3, back + 1.8);
      box(r.g, 1.4, 1.2, 0.9, '#c23b2a', 0, 0.9, back + 1.8);
      // The sun, moon and five peaks screen.
      box(r.g, 5.6, 3, 0.1, '#2a4a8a', 0, 0.9, back + 0.15);
      for (let k = 0; k < 5; k++) cone(r.g, 0.55, 1.4 + (k % 2) * 0.5, '#2f8a6a', -2 + k, 1, back + 0.22, 3);
      sphere(r.glow, 0.3, '#ff5a3a', -1.8, 3.2, back + 0.25, 10); sphere(r.glow, 0.26, '#fff4d0', 1.8, 3.2, back + 0.25, 10);
      for (let i = 0; i < 30; i++) box(r.g, 0.5, 0.25, 0.1, ['#2f8a6a', '#3a6aa8', '#c23b2a', '#e2b43a'][i % 4], -halfW + 0.3 + i * 0.47, h - 0.4, back + 0.2);
      return true;
    case 'china':
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cyl(r.g, 0.28, 0.3, h - 0.3, '#b3262a', Math.cos(a) * 4.8, 0, mid + Math.sin(a) * 3.6, 10); }
      for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; cyl(r.g, 0.34, 0.36, h - 0.3, gold, Math.cos(a) * 2, 0, mid + Math.sin(a) * 1.6, 10); }
      for (let k = 0; k < 5; k++) r.glow.add(new THREE.TorusGeometry(1 + k * 0.9, 0.12, 5, 32), ['#3a6aa8', '#2f8a6a', gold, '#3a6aa8', '#c23b2a'][k], M(0, h - 0.25, mid, 0, 1, 1, 1, Math.PI / 2, 0));
      cyl(r.g, 1.2, 1.3, 0.5, '#fbf8f0', 0, 0, mid, 24);
      return true;
    case 'norway':
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) cyl(r.g, 0.35, 0.4, h, '#3a2a22', sx * 3.4, 0, back + 1.5 + i * 3, 8);
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; cyl(r.g, 0.04, 0.04, 0.25, '#fbf7ee', Math.cos(a) * 1.3, h - 2.2, mid + Math.sin(a) * 1.3, 4); sphere(r.glow, 0.06, '#ffd88a', Math.cos(a) * 1.3, h - 1.9, mid + Math.sin(a) * 1.3, 4); }
      r.g.add(new THREE.TorusGeometry(1.3, 0.05, 4, 24), '#3a3a3a', M(0, h - 2.2, mid, 0, 1, 1, 1, Math.PI / 2, 0));
      return true;
    case 'switzerland':
    case 'london': {
      // The clockworks: great gears on the back wall, a pendulum, the clock faces glowing on the walls.
      const brass = '#c9a24a';
      gear(r, -2.2, 4.2, back + 0.4, 1.4, brass); gear(r, 0.6, 5.4, back + 0.5, 0.9, '#a88a3a'); gear(r, 2.4, 3.6, back + 0.4, 1.1, brass);
      cyl(r.g, 0.04, 0.04, 4, '#3a3a3a', 0, 1.6, mid, 4); cyl(r.g, 0.5, 0.5, 0.12, brass, 0, 1.4, mid, 16);
      for (const [x, z, ry] of [[0, back + 0.12, 0], [-halfW + 0.12, back + 5, Math.PI / 2], [halfW - 0.12, back + 5, -Math.PI / 2]] as const) {
        r.glow.add(new THREE.CircleGeometry(1.5, 32), '#fff4d8', M(x, h - 2.2, z, ry));
        for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; r.g.add(new THREE.BoxGeometry(0.08, 0.3, 0.05), '#2a2a2a', M(x + Math.cos(ry) * Math.cos(a) * 1.25, h - 2.2 + Math.sin(a) * 1.25, z - Math.sin(ry) * Math.cos(a) * 1.25, ry, 1, 1, 1, 0, a)); }
      }
      return true;
    }
    case 'newyork':
      for (let i = 0; i < 12; i++) for (let j = 0; j < 7; j++) box(r.g, 1.2, 0.02, 1.2, (i + j) % 2 ? '#e8e4da' : '#2a2a30', -halfW + 0.6 + j * 2.1, 0.02, back + 0.6 + i * 1.3);
      for (const x of [-3, 0, 3]) box(r.g, 1.6, 3, 0.1, gold, x, 0, back + 0.15);
      for (let i = 0; i < 9; i++) { const a = Math.PI * (0.1 + i * 0.1); r.glow.add(new THREE.BoxGeometry(0.1, 2.4, 0.04), '#ffe08a', M(Math.cos(a) * 1.3, 4.6 + Math.sin(a) * 1.3, back + 0.2, 0, 1, 1, 1, 0, a - Math.PI / 2)); }
      return true;
    case 'renaissance':
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; r.glow.add(new THREE.CircleGeometry(1.4, 3, a, Math.PI / 4), ['#b5552e', '#3a6aa8', '#e2b43a', '#6a8a4a'][k % 4], M(0, h - 0.15, mid, 0, 1, 1, 1, Math.PI / 2, 0)); }
      for (const [x, z] of [[-4.6, back + 1.5], [4.6, back + 1.5]] as const) statue(r, x, z, '#f4eee2');
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) box(r.glow, 0.05, 1.8, 2.2, ['#d8a878', '#8ab0d0', '#c89aa0'][i], sx * (halfW - 0.08), 3.4, back + 2 + i * 3.2);
      for (let k = 0; k < 4; k++) r.g.add(new THREE.TorusGeometry(0.6 + k * 0.5, 0.05, 4, 24), k % 2 ? '#3a6a52' : '#d88a8a', M(0, 0.03, mid, 0, 1, 1, 1, Math.PI / 2, 0));
      return true;
    case 'vintage':
      box(r.g, 6, 0.6, 3, '#8a5a36', 0, 0, back + 1.6);
      box(r.g, 1.8, 1, 0.7, '#1f1f24', -1.5, 0.6, back + 1.2); box(r.g, 1.6, 0.05, 0.3, '#fbf7ee', -1.5, 1.6, back + 1.45);
      for (let i = 0; i < 30; i++) sphere(r.glow, 0.06, ['#ff8fb8', '#ffd24a', '#8fd0ff'][i % 3], -halfW + 0.5 + i * 0.47, h - 0.6 - Math.sin(i * 0.5) * 0.3, back + 0.3, 4);
      return true;
    case 'islamic':
      // The mihrab: a glowing gilded niche in the back wall; the minbar's steps; lamps hanging in rows.
      archPanel(r.glow, 1.6, 2.8, gold, 0, 0, back + 0.12, 0, 0.1, true);
      archPanel(r.g, 2.2, 3.4, '#2f6f9a', 0, 0, back + 0.08, 0, 0.05, true);
      for (let k = 0; k < 6; k++) box(r.g, 0.8, 0.3 * (k + 1), 0.45, '#8a5a36', 2.4, 0, back + 0.5 + k * 0.45);
      for (let i = 0; i < 12; i++) { const x = -4.5 + (i % 4) * 3, z = back + 2 + Math.floor(i / 4) * 3.2; cyl(r.g, 0.01, 0.01, 1.4, '#3a2a22', x, h - 1.4, z, 3); sphere(r.glow, 0.18, i % 2 ? '#ffd27a' : '#7affd0', x, h - 1.55, z, 6, 1.3); }
      return true;
    case 'middleeast':
    case 'desert':
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) box(r.g, 0.8, 0.45, 1.6, ['#c23b2a', '#e2b43a', '#2f6f9a'][i % 3], sx * (halfW - 0.6), 0, back + 1 + i * 2);
      cyl(r.g, 0.9, 0.7, 0.4, '#6a5a44', 0, 0, mid, 10); cone(r.glow, 0.45, 0.8, '#ff8a2a', 0, 0.4, mid, 6);
      for (const x of [-1.3, 1.3]) { cyl(r.g, 0.18, 0.25, 0.45, '#c9a24a', x, 0, mid + 1.3, 8); cone(r.g, 0.16, 0.3, '#c9a24a', x, 0.45, mid + 1.3, 8); }
      for (let i = 0; i < 6; i++) { cyl(r.g, 0.01, 0.01, 1, '#3a2a22', -4 + i * 1.6, h - 1, back + 4, 3); sphere(r.glow, 0.16, '#ffb84a', -4 + i * 1.6, h - 1.2, back + 4, 6, 1.3); }
      return true;
    case 'egypt':
      box(r.g, 2.4, 1.1, 1.2, '#c9a878', 0, 0, back + 2);
      box(r.g, 2.5, 0.2, 1.3, '#b8966a', 0, 1.1, back + 2);
      for (const sx of [-1, 1]) for (let y = 1; y < h - 1; y += 1.2) box(r.glow, 0.04, 0.35, halfW * 1.6, '#e8c46a', sx * (halfW - 0.08), y, back + 5);
      for (const sx of [-1, 1]) { box(r.g, 0.2, 0.5, 0.2, '#6b4a2a', sx * (halfW - 0.3), 2.2, back + 2); cone(r.glow, 0.15, 0.4, '#ff9a3a', sx * (halfW - 0.3), 2.7, back + 2, 5); }
      return true;
    case 'indianorth':
      for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) for (let j = 0; j < 2; j++) archPanel(r.glow, 0.7, 1.1, ['#ff5a8a', '#ffd24a', '#5ad8ff', '#7aff9a'][(i + j) % 4], sx * (halfW - 0.05), 2 + j * 2.2, back + 1.5 + i * 2.2, sx * -Math.PI / 2, 0.04, true);
      cyl(r.g, 1.2, 1.3, 0.5, '#e8917a', 0, 0, mid, 12); r.glow.add(new THREE.CircleGeometry(1.05, 16).rotateX(-Math.PI / 2), '#7affe0', M(0, 0.52, mid));
      return true;
    case 'indiasouth':
      for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
        const x = sx * 4.4, z = back + 1.5 + i * 3;
        for (let k = 0; k < 4; k++) box(r.g, 0.7 - (k % 2) * 0.15, h / 4, 0.7 - (k % 2) * 0.15, ['#c9bfa8', '#b8ae96'][k % 2], x, k * (h / 4), z);
      }
      for (const x of [-1.6, 1.6]) { cyl(r.g, 0.08, 0.3, 1.6, '#c9a24a', x, 0, mid, 8); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; sphere(r.glow, 0.07, '#ffb84a', x + Math.cos(a) * 0.3, 1.65, mid + Math.sin(a) * 0.3, 4); } }
      for (let i = 0; i < 40; i++) sphere(r.g, 0.05, '#fbf7ee', Math.cos(i * 0.9) * (0.6 + (i % 5) * 0.25), 0.03, mid + Math.sin(i * 0.9) * (0.6 + (i % 5) * 0.25), 4);
      return true;
    case 'mughal':
      // The cenotaph behind an octagon of pierced marble jali screens, glowing.
      box(r.g, 1.2, 0.8, 2.4, '#fbf7ee', 0, 0, mid);
      for (let k = 0; k < 3; k++) box(r.g, 1.25, 0.04, 2.45, ['#2f7a5a', '#b5552e', '#2a2a2a'][k], 0, 0.2 + k * 0.2, mid);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; r.glow.frame(Math.sin(a) * 3, 0, mid + Math.cos(a) * 2.6, a, 1, () => { for (let k = 0; k < 16; k++) box(r.glow, 0.12, 0.12, 0.03, '#fff0c8', -0.9 + (k % 4) * 0.6, 0.4 + Math.floor(k / 4) * 0.5, 0); }); box(r.g, 2.2, 2.4, 0.06, '#f2eee4', Math.sin(a) * 3.02, 0, mid + Math.cos(a) * 2.62, a); }
      return true;
    case 'indonesia':
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; dome(r.g, 0.8, '#8a8478', Math.cos(a) * 4, 0, mid + Math.sin(a) * 3.2, 10, 1.3); cone(r.g, 0.12, 0.6, '#8a8478', Math.cos(a) * 4, 1.05, mid + Math.sin(a) * 3.2, 5); }
      for (let i = 0; i < 6; i++) { cyl(r.g, 0.3, 0.25, 0.2, '#c9a86a', -2.5 + i, 0, mid + 1.5, 8); sphere(r.g, 0.12, ['#ff6b8b', '#f2d14e', '#ffffff'][i % 3], -2.5 + i, 0.25, mid + 1.5, 5); }
      return true;
    case 'aurora':
      cyl(r.g, 0.3, 0.4, 1.2, '#3a3a44', 0, 0, mid, 10);
      r.g.add(new THREE.CylinderGeometry(0.35, 0.5, 4, 14), '#6a7a8a', M(0, 2.6, mid, 0, 1, 1, 1, -0.7, 0));
      for (let i = 0; i < 80; i++) sphere(r.glow, 0.04, '#e8f4ff', r.rng.range(-halfW, halfW), h - 0.1, r.rng.range(back, 4), 4);
      return true;
    case 'meadow':
      // Inside the Great Tree: a trunk core with a stair winding round it, roots, shelves, lanterns.
      cyl(r.g, 1, 1.3, h, '#6b4a30', 0, 0, mid, 12);
      for (let k = 0; k < 16; k++) { const a = k * 0.55; box(r.g, 1, 0.12, 0.5, '#8a6a44', Math.cos(a) * 1.6, 0.4 + k * 0.42, mid + Math.sin(a) * 1.6, -a); }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; r.g.add(new THREE.CylinderGeometry(0.15, 0.3, 3, 5), '#5a3e28', M(Math.cos(a) * 2.2, 0.3, mid + Math.sin(a) * 2.2, 0, 1, 1, 1, Math.sin(a) * 1.2, -Math.cos(a) * 1.2)); }
      for (let i = 0; i < 6; i++) sphere(r.glow, 0.15, ['#ffd24a', '#ff8fb8', '#8fd0ff'][i % 3], -4 + i * 1.6, h - 1.4, back + 1.5, 6);
      return true;
    case 'skyisles':
      sphere(r.glow, 1.2, '#fff0b0', 0, 3.5, mid, 16, 1.3);
      for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; crystalCluster(r.g, r.glow, Math.cos(a) * 3.6, 0, mid + Math.sin(a) * 3, 0.9, () => r.rng.next(), CRYSTAL_PAL); }
      return true;
    default:
      return false;
  }
}

/** Build the interior asked for, or null (the game then uses the land's standard room). */
export function buildInterior3d(spec: InteriorSpec): InteriorBuild | null {
  const r: R = { g: new GeoBuilder(), glow: new GeoBuilder(), rng: new Rng(spec.seed), land: spec.land, night: spec.night };
  switch (spec.kind) {
    case 'cavern': return cavern(r, spec.ref ?? 'rock');
    case 'institute': return institute(r, spec.ref ?? 'kitchen', spec.stage ?? 0);
    case 'castle': return castle(r);
    case 'landmark': return landmarkHall(r);
    default: return null;
  }
}
