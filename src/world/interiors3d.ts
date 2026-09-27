import * as THREE from 'three';
import { Rng } from '../core/rng';
import { LAND_STYLE } from './buildings';
import { CRYSTAL_PAL, crystalCluster } from './islands';
import { GeoBuilder, M, archPanel, box, cone, cyl, dome, sphere } from './kit';
import type { InteriorBuild, InteriorSpec } from './models/interiors';
import { REGION_BY_ID, type RegionId } from './regions';
import { rockGeometry, shardGeometry } from './rocks';

/**
 * Built interiors (the contract in models/interiors.ts): the caverns you walk into — rock, ice and
 * crystal chambers with stalactites, glittering crystals and a glowing pool; the institutes' rooms
 * by kind — the kitchen hall, the clinic ward (green crescent), the classroom, the library stacks,
 * and the sciences' workshops; the celebration castle's great hall of floating candles with its
 * library alcove and tower stair; and each land's landmark hall in its own colours and arches.
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
  const look = style === 'ice' ? { rock: '#bfe0f4', dark: '#8ab8dc', glow: '#6ac8ff' } : style === 'crystal' ? { rock: '#d8d0ec', dark: '#b0a8d0', glow: '#e0c8ff' } : style === 'sandstone' ? { rock: '#c98a5a', dark: '#9a6a42', glow: '#ffb84a' } : { rock: '#7a7064', dark: '#5a534c', glow: '#9ae8ff' };
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
  shell(r, halfW, back, 4, h, s.walls[0], '#a88a6a', '#f4eee2');
  // Windows along the walls in the land's arch, bright by day, warm at night.
  for (const sx of [-1, 1]) for (let i = 0; i < 2 + stage; i++) archPanel(r.glow, 1, 1.6, r.night > 0.5 ? s.glow : '#e8f4ff', sx * (halfW - 0.01), 1.2, back + 1.5 + i * 2.6, sx * -Math.PI / 2, 0.05, st.arch === 'pointed');
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
  shell(r, halfW, back, 5, h, s.walls[0], '#c8bca8', s.walls[1 % s.walls.length]);
  // Columns down both sides, arches between, a lit dome of the land's colour overhead.
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
    const z = back + 1.5 + i * 3;
    cyl(r.g, 0.3, 0.34, h - 0.4, s.trims[0], sx * (halfW - 1.6), 0, z, 10);
    archPanel(r.glow, 1.2, 2.6, r.night > 0.5 ? s.glow : '#e8f4ff', sx * (halfW - 0.01), 1.6, z + 1.5, sx * -Math.PI / 2, 0.05, st.arch === 'pointed');
  }
  dome(r.glow, 2.6, s.glow, 0, h - 1.6, back + 5, 16, 0.4);
  // A patterned carpet down the middle in the land's frieze colours; a fountain or brazier at the heart.
  const [fa, fb] = st.frieze;
  for (let i = 0; i < 12; i++) box(r.g, 2.2, 0.03, 1.2, i % 2 ? fa : fb, 0, 0, back + 1 + i * 1.3);
  cyl(r.g, 1.4, 1.5, 0.6, s.trims[0], 0, 0, back + 3.5, 16);
  r.glow.add(new THREE.CircleGeometry(1.25, 18).rotateX(-Math.PI / 2), '#7affe0', M(0, 0.62, back + 3.5));
  cone(r.glow, 0.15, 1.2, '#dff6ff', 0, 0.6, back + 3.5, 6);
  for (const sx of [-1, 1]) bench(r, sx * 3.2, 0.6, 1.8, Math.PI / 2);
  return finish(r, { halfW, back, front: 5, height: h }, [[-3.2, 0.45, 0.6], [3.2, 0.45, 0.6]], [[0, back + 6.5], [-4, back + 3], [4, back + 3]], { pos: [0, 2.6, 7], look: [0, 2, back + 3] }, [4.5, 0, back + 1.5]);
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
