import * as THREE from 'three';
import type { Rng } from '../core/rng';
import { GeoBuilder, M, box, cone, cyl, sphere } from './kit';
import { REGION_BY_ID, type RegionId } from './regions';

/**
 * The inside of a big room in its land's own manner (owner: "decorate the institute interiors
 * similar to their place's interior … maintaining the architecture"): the floor, the walls, the
 * ceiling and the lamps each land's own buildings have inside —
 *   tatami and shoji under dark beams (Japan); an ondol floor of oiled paper under dancheong-painted
 *   beams (Korea); grey brick tiles, lattice and red lanterns (China); zellige dados, carved plaster
 *   and a muqarnas dome with pierced brass lamps (Madinat an-Nur, the Gulf, the Nile); rugs on the
 *   sand under a striped tent roof (Rimal); white marble inlaid with pietra dura (Bagh-e-Noor);
 *   mirror-work and painted niches (Gulabi Nagar); a red oxide floor, carved pillars and brass lamps
 *   (Kaveri); teak boards and carved screens (Nusa Rinjani); log walls under a pitched roof with an
 *   iron candle wheel (the north); herringbone parquet, panelling and a coffered ceiling (London);
 *   art-deco terrazzo and sunbursts (New Yonder); cotto tiles, frescoes and a barrel vault (Firenzia);
 *   checkered boards and beadboard (Maple Row); moss and living wood (the Meadow); cloud marble
 *   and starry glass (the Sky Isles).
 *
 * Local frame: floor at y = 0, the room from `back` to `front` in z and ±halfW in x, walls h high,
 * the front left open for the camera. Returns how far in from the side walls windows should sit.
 */
type Floor = 'tatami' | 'ondol' | 'brick' | 'zellige' | 'rugs' | 'marble' | 'mirror' | 'oxide' | 'teak' | 'boards' | 'parquet' | 'terrazzo' | 'cotto' | 'checker' | 'moss' | 'cloud';
type Dado = 'shoji' | 'lattice' | 'zellige' | 'jali' | 'mirror' | 'pillars' | 'carved' | 'logs' | 'panel' | 'deco' | 'fresco' | 'bead' | 'roots' | 'glass';
type Ceiling = 'beams' | 'dancheong' | 'dome' | 'tent' | 'gable' | 'coffer' | 'vault' | 'flat' | 'stars';
type Lamp = 'paper' | 'red' | 'brass' | 'oil' | 'wheel' | 'chandelier' | 'deco' | 'glass' | 'star' | 'lotus';

interface Dress { floor: Floor; fc: [string, string]; wall: string; dado: Dado; dc: [string, string]; ceiling: Ceiling; cc: [string, string]; lamp: Lamp; lc: string }

const D = (floor: Floor, fc: [string, string], wall: string, dado: Dado, dc: [string, string], ceiling: Ceiling, cc: [string, string], lamp: Lamp, lc: string): Dress => ({ floor, fc, wall, dado, dc, ceiling, cc, lamp, lc });

export const DRESS: Record<RegionId, Dress> = {
  japan: D('tatami', ['#c8d49a', '#2a3a2e'], '#efe6d2', 'shoji', ['#fff6e0', '#3a2a22'], 'beams', ['#3a2a22', '#efe6d2'], 'paper', '#fff0d0'),
  korea: D('ondol', ['#d8b870', '#b8944a'], '#f2eadb', 'lattice', ['#fbf3e0', '#7a4a2a'], 'dancheong', ['#2f8a6a', '#c23b2a'], 'lotus', '#ffb8c8'),
  china: D('brick', ['#8a8a88', '#6a6a6a'], '#efe2cc', 'lattice', ['#fff0d0', '#b3262a'], 'beams', ['#b3262a', '#2f5a9a'], 'red', '#ff4a2a'),
  islamic: D('zellige', ['#2f6f9a', '#f2efe6'], '#f4ecd8', 'zellige', ['#2f8a6a', '#2f6f9a'], 'dome', ['#f4ecd8', '#d4af37'], 'brass', '#ffd27a'),
  middleeast: D('zellige', ['#c8a060', '#f2efe6'], '#efe4cc', 'carved', ['#e8dcc0', '#8a6a3a'], 'dome', ['#efe4cc', '#c9a24a'], 'brass', '#ffcf7a'),
  egypt: D('zellige', ['#b5553e', '#f2e8d8'], '#e8d8b8', 'carved', ['#d8c8a0', '#2f6f9a'], 'dome', ['#e8d8b8', '#b5553e'], 'brass', '#ffc070'),
  desert: D('rugs', ['#c23b2a', '#e2b43a'], '#2a2622', 'carved', ['#c23b2a', '#e2b43a'], 'tent', ['#2a2622', '#e8dcc6'], 'brass', '#ffb84a'),
  mughal: D('marble', ['#fbf7ee', '#2f7a5a'], '#fbf7ee', 'jali', ['#fbf7ee', '#b5552e'], 'dome', ['#fbf7ee', '#d4af37'], 'brass', '#ffe0a0'),
  indianorth: D('mirror', ['#f2d8c0', '#e8917a'], '#f4c6a8', 'mirror', ['#e8917a', '#2f6f9a'], 'dome', ['#f4c6a8', '#d4af37'], 'glass', '#ff8a5a'),
  indiasouth: D('oxide', ['#9a2a1e', '#d4a84a'], '#f4ead8', 'pillars', ['#6b4a2a', '#d4a84a'], 'beams', ['#5a3a22', '#f4ead8'], 'oil', '#ffb84a'),
  indonesia: D('teak', ['#8a5a36', '#6b4a2a'], '#f0e2c8', 'carved', ['#8a5a36', '#c9a24a'], 'beams', ['#6b4a2a', '#c9a24a'], 'oil', '#ffc070'),
  norway: D('boards', ['#b8905a', '#a07a4a'], '#8a6444', 'logs', ['#8a6444', '#6b4a2e'], 'gable', ['#6b4a2e', '#8a6444'], 'wheel', '#ffd88a'),
  switzerland: D('boards', ['#c8a070', '#b08a5a'], '#c8a070', 'panel', ['#a87a4a', '#c23b3b'], 'gable', ['#8a5a36', '#c8a070'], 'wheel', '#ffd88a'),
  aurora: D('boards', ['#a88a6a', '#8a6a4a'], '#7a5a3a', 'logs', ['#7a5a3a', '#5a402a'], 'gable', ['#5a402a', '#7a5a3a'], 'wheel', '#ffcf7a'),
  london: D('parquet', ['#8a5a36', '#a8703f'], '#e8dcc6', 'panel', ['#4a3426', '#6b4a2a'], 'coffer', ['#f4eee2', '#d4af37'], 'chandelier', '#ffe0a8'),
  newyork: D('terrazzo', ['#e8e4da', '#2a2a30'], '#d8d0c0', 'deco', ['#2a2a30', '#d4af37'], 'coffer', ['#e8e4da', '#d4af37'], 'deco', '#ffe08a'),
  renaissance: D('cotto', ['#c8703f', '#b5603a'], '#f2e2c4', 'fresco', ['#e8c89a', '#6a8aa8'], 'vault', ['#f2e2c4', '#3a6aa8'], 'chandelier', '#ffd88a'),
  vintage: D('checker', ['#f4efe6', '#2a2a30'], '#f4efe0', 'bead', ['#ffffff', '#5a8ab5'], 'flat', ['#ffffff', '#e8e0d0'], 'glass', '#fff0c8'),
  meadow: D('moss', ['#6a9a4a', '#8a6444'], '#f4e8d8', 'roots', ['#6b4a30', '#ffc4dc'], 'beams', ['#6b4a30', '#f4e8d8'], 'paper', '#ffe8a0'),
  skyisles: D('cloud', ['#fbf8ff', '#d4af37'], '#f4f0ff', 'glass', ['#c9a0ff', '#8ae8ff'], 'stars', ['#2a2a5a', '#fff4c0'], 'star', '#fff4c0'),
};

interface Ctx { g: GeoBuilder; glow: GeoBuilder; rng: Rng; land: RegionId; night: number }

/** Dress a room in the land's manner. `floor: false` leaves the floor to the caller. Returns the windows' inset. */
export function dressRoom(r: Ctx, halfW: number, back: number, front: number, h: number, opts: { floor?: boolean } = {}): number {
  const d = DRESS[r.land], s = REGION_BY_ID[r.land], len = front - back, cz = (front + back) / 2, g = r.g;
  // The shell: a plain base floor, the walls, and (for flat-topped rooms) the ceiling.
  box(g, halfW * 2, 0.1, len, d.fc[1], 0, -0.1, cz);
  box(g, halfW * 2, h, 0.2, d.wall, 0, 0, back - 0.1);
  for (const sx of [-1, 1]) box(g, 0.2, h, len, d.wall, sx * (halfW + 0.1), 0, cz);
  if (opts.floor !== false) floor(r, d, halfW, back, front);
  const inset = walls(r, d, halfW, back, front, h);
  ceiling(r, d, halfW, back, front, h);
  lamps(r, d, halfW, back, front, h);
  void s;
  return inset;
}

function floor(r: Ctx, d: Dress, W: number, back: number, front: number): void {
  const g = r.g, [a, b] = d.fc, L = front - back;
  /** Tiles about `size` across, fitted exactly to the floor: fn(centre x, centre z, tile w, tile d, column, row). */
  const tiles = (size: number, fn: (x: number, z: number, w: number, dd: number, i: number, j: number) => void) => {
    const nx = Math.max(1, Math.round((W * 2) / size)), nz = Math.max(1, Math.round(L / size)), w = (W * 2) / nx, dd = L / nz;
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) fn(-W + (i + 0.5) * w, back + (j + 0.5) * dd, w, dd, i, j);
  };
  switch (d.floor) {
    case 'tatami':
      // Mats two by one, their black borders showing, laid in the auspicious pattern.
      {
        const nx = Math.max(1, Math.round((W * 2) / 0.9)), nz = Math.max(1, Math.round(L / 1.8)), w = (W * 2) / nx, dd = L / nz;
        for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) { const x = -W + (i + 0.5) * w, z = back + (j + 0.5) * dd; box(g, w - 0.02, 0.04, dd - 0.02, a, x, 0, z); box(g, w, 0.045, 0.05, b, x, 0, z - dd / 2 + 0.03); }
      }
      break;
    case 'ondol':
      tiles(0.9, (x, z, w, dd, i, j) => box(g, w - 0.02, 0.02, dd - 0.02, (i + j) % 3 ? a : b, x, 0, z));
      break;
    case 'brick':
      tiles(0.6, (x, z, w, dd, i, j) => box(g, w - 0.03, 0.03, dd - 0.03, (i + j) % 2 ? a : b, x, 0, z));
      break;
    case 'zellige':
      // A field of small tiles with an eight-pointed star in the middle and a border band.
      tiles(0.5, (x, z, w, dd, i, j) => box(g, w - 0.02, 0.02, dd - 0.02, (i + j) % 2 ? a : b, x, 0, z));
      for (let k = 0; k < 2; k++) g.add(new THREE.BoxGeometry(2.2, 0.03, 2.2), k ? a : '#e2b43a', M(0, 0.01, cz0(back, front), (k * Math.PI) / 4));
      break;
    case 'rugs':
      box(g, W * 2, 0.02, L, '#c8b088', 0, 0, (front + back) / 2);
      for (let i = 0; i < Math.floor(L / 2.6); i++) for (const x of [-W / 2, W / 2]) {
        const z = back + 1.4 + i * 2.6;
        box(g, W * 0.9, 0.025, 2.2, i % 2 ? a : '#2f5a9a', x, 0.01, z);
        box(g, W * 0.7, 0.03, 1.6, b, x, 0.01, z);
        box(g, W * 0.4, 0.035, 0.9, i % 2 ? '#2f5a9a' : a, x, 0.01, z);
      }
      break;
    case 'marble':
      box(g, W * 2, 0.02, L, a, 0, 0, (front + back) / 2);
      // Inlaid borders and a central flower of pietra dura.
      for (const sx of [-1, 1]) box(g, 0.14, 0.025, L - 0.4, b, sx * (W - 0.4), 0, (front + back) / 2);
      for (let k = 0; k < 8; k++) g.add(new THREE.BoxGeometry(0.16, 0.03, 0.9).translate(0, 0, 0.45), k % 2 ? b : '#b5552e', M(0, 0, cz0(back, front), (k * Math.PI) / 4));
      break;
    case 'mirror':
      box(g, W * 2, 0.02, L, a, 0, 0, (front + back) / 2);
      tiles(1.2, (x, z) => g.add(new THREE.BoxGeometry(0.5, 0.025, 0.5), b, M(x, 0, z, Math.PI / 4)));
      break;
    case 'oxide':
      box(g, W * 2, 0.02, L, a, 0, 0, (front + back) / 2);
      for (const sx of [-1, 1]) box(g, 0.2, 0.025, L, '#1a1a1a', sx * (W - 0.1), 0, (front + back) / 2);
      // A kolam in the middle.
      for (let rr = 1; rr <= 3; rr++) for (let i = 0; i < 8 * rr; i++) { const t = (i / (8 * rr)) * Math.PI * 2; sphere(r.glow, 0.03, '#fbf7ee', Math.cos(t) * rr * 0.35, 0.03, cz0(back, front) + Math.sin(t) * rr * 0.35, 3); }
      break;
    case 'teak':
    case 'boards':
      tiles(0.3, (x, _z, w, _dd, i, j) => { if (j === 0) box(g, w - 0.02, 0.03, L, i % 2 ? a : b, x, 0, (front + back) / 2); });
      break;
    case 'parquet':
      // Herringbone: blocks at ±45° in rows.
      tiles(0.7, (x, z, _w, _dd, i, j) => g.add(new THREE.BoxGeometry(0.6, 0.03, 0.2), (i + j) % 2 ? a : b, M(x, 0, z, (j % 2 ? 1 : -1) * Math.PI / 4)));
      break;
    case 'terrazzo':
      box(g, W * 2, 0.02, L, a, 0, 0, (front + back) / 2);
      for (let i = 0; i < 90; i++) box(g, 0.05, 0.022, 0.05, ['#8a8a88', '#c8b8a0', '#2a2a30'][i % 3], r.rng.range(-W, W), 0, r.rng.range(back, front));
      for (let k = 0; k < 9; k++) g.add(new THREE.BoxGeometry(0.04, 0.025, 3), '#d4af37', M(0, 0, cz0(back, front), 0, 1, 1, 1, 0, 0).multiply(new THREE.Matrix4().makeRotationY(-Math.PI / 2 + (k * Math.PI) / 8)).multiply(new THREE.Matrix4().makeTranslation(0, 0, 1.5)));
      break;
    case 'cotto':
      tiles(0.4, (x, z, w, dd, i, j) => box(g, w - 0.02, 0.03, dd - 0.02, (i * 7 + j * 3) % 4 ? a : b, x, 0, z));
      break;
    case 'checker':
      tiles(0.6, (x, z, w, dd, i, j) => box(g, w, 0.02, dd, (i + j) % 2 ? a : b, x, 0, z));
      break;
    case 'moss':
      box(g, W * 2, 0.02, L, a, 0, 0, (front + back) / 2);
      for (let k = 1; k < 5; k++) g.add(new THREE.TorusGeometry(k * 0.6, 0.06, 4, 28), b, M(0, 0.02, cz0(back, front), 0, 1, 1, 1, Math.PI / 2, 0)); // a cut trunk's rings
      for (let i = 0; i < 30; i++) sphere(g, 0.06, ['#ffc4dc', '#ffd24a', '#ffffff'][i % 3], r.rng.range(-W + 0.5, W - 0.5), 0.03, r.rng.range(back + 0.5, front - 0.5), 4);
      break;
    case 'cloud':
      box(g, W * 2, 0.02, L, a, 0, 0, (front + back) / 2);
      for (let k = 1; k < 4; k++) r.glow.add(new THREE.TorusGeometry(k * 0.9, 0.025, 3, 32), b, M(0, 0.02, cz0(back, front), 0, 1, 1, 1, Math.PI / 2, 0));
      break;
  }
}

const cz0 = (back: number, front: number) => back + (front - back) * 0.4;

/** Turn a surface to be seen from within (a dome or a vault overhead). */
function inward(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const idx = geo.getIndex();
  if (idx) for (let i = 0; i < idx.count; i += 3) { const t = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, t); }
  geo.computeVertexNormals();
  return geo;
}

/** Along both side walls and the back wall, in the land's manner. Returns the window inset. */
function walls(r: Ctx, d: Dress, W: number, back: number, front: number, h: number): number {
  const g = r.g, [a, b] = d.dc, L = front - back;
  // Every wall: a skirting at the foot and a cornice band at the top.
  const along = (fn: (u: number, at: (u: number, y: number, inset: number) => [number, number, number], ry: number, span: number) => void) => {
    for (const sx of [-1, 1]) fn(0, (u, y, inset) => [sx * (W - inset), y, back + u], sx * -Math.PI / 2, L);
    fn(0, (u, y, inset) => [-W + u, y, back + inset], 0, W * 2);
  };
  const panel = (w: number, hh: number, dd: number, col: string, p: [number, number, number], ry: number, dst = r.g) => dst.add(new THREE.BoxGeometry(w, hh, dd).translate(0, hh / 2, 0), col, M(p[0], p[1], p[2], ry));
  along((_, at, ry, span) => {
    panel(span, 0.15, 0.06, b, at(span / 2, 0, 0.03), ry);
    panel(span, 0.24, 0.12, b, at(span / 2, h - 0.24, 0.06), ry);
  });
  let inset = 0.02;
  switch (d.dado) {
    case 'shoji':
      // Sliding paper screens in dark frames, glowing softly.
      along((_, at, ry, span) => { for (let u = 0.5; u < span - 0.4; u += 1) { panel(0.92, 2.2, 0.03, a, at(u, 0.15, 0.05), ry, r.glow); for (let k = 0; k < 5; k++) panel(0.96, 0.03, 0.05, b, at(u, 0.4 + k * 0.45, 0.08), ry); panel(0.04, 2.2, 0.05, b, at(u + 0.48, 0.15, 0.08), ry); } });
      inset = 0.12; break;
    case 'lattice':
      along((_, at, ry, span) => { for (let u = 0.6; u < span - 0.5; u += 1.4) { panel(1.1, 1.5, 0.04, a, at(u, 0.8, 0.04), ry); for (let k = 0; k < 6; k++) { panel(1.14, 0.035, 0.06, b, at(u, 0.85 + k * 0.28, 0.07), ry); panel(0.035, 1.5, 0.06, b, at(u - 0.5 + k * 0.2, 0.8, 0.07), ry); } } });
      inset = 0.1; break;
    case 'zellige':
      // A dado of tiles in a diamond pattern, a band of carved plaster above it.
      along((_, at, ry, span) => {
        for (let u = 0.15; u < span; u += 0.3) for (let y = 0.2; y < 1.3; y += 0.3) panel(0.28, 0.28, 0.03, (Math.round(u / 0.3) + Math.round(y / 0.3)) % 2 ? a : b, at(u, y, 0.03), ry);
        panel(span, 0.35, 0.06, '#e8dcc0', at(span / 2, 1.35, 0.04), ry);
        for (let u = 0.2; u < span; u += 0.4) panel(0.16, 0.16, 0.08, '#d8c8a0', at(u, 1.44, 0.07), ry);
      });
      inset = 0.08; break;
    case 'carved':
      along((_, at, ry, span) => {
        panel(span, 1.1, 0.05, a, at(span / 2, 0.15, 0.04), ry);
        for (let u = 0.4; u < span; u += 0.8) { panel(0.5, 0.7, 0.07, b, at(u, 0.35, 0.06), ry); panel(0.3, 0.3, 0.09, a, at(u, 0.55, 0.08), ry); }
        for (let u = 0.3; u < span; u += 0.6) panel(0.12, 0.3, 0.1, b, at(u, h - 0.54, 0.08), ry); // a row of muqarnas-like corbels
      });
      inset = 0.1; break;
    case 'jali':
      // White marble dado with inlaid flowers (pietra dura), a pierced screen band above.
      along((_, at, ry, span) => {
        panel(span, 1.1, 0.05, a, at(span / 2, 0.15, 0.04), ry);
        for (let u = 0.6; u < span; u += 1.2) { const [x, y, z] = at(u, 0.7, 0.08); for (let k = 0; k < 5; k++) sphere(r.g, 0.05, ['#b5552e', '#2f7a5a', '#d4af37'][k % 3], x + Math.cos(k * 1.26) * (ry === 0 ? 0.14 : 0), y + Math.sin(k * 1.26) * 0.14, z + Math.cos(k * 1.26) * (ry === 0 ? 0 : 0.14), 4); }
      });
      inset = 0.08; break;
    case 'mirror':
      // Painted niches outlined in colour, with mirror-work glinting.
      along((_, at, ry, span) => {
        panel(span, 1.0, 0.05, a, at(span / 2, 0.15, 0.04), ry);
        for (let u = 0.5; u < span; u += 1) { panel(0.6, 0.8, 0.06, b, at(u, 0.25, 0.06), ry); panel(0.08, 0.08, 0.08, '#e8f4ff', at(u, 0.6, 0.09), ry, r.glow); }
      });
      inset = 0.08; break;
    case 'pillars':
      for (const sx of [-1, 1]) for (let z = back + 1; z < front - 0.5; z += 2.2) { cyl(g, 0.16, 0.2, h, a, sx * (W - 0.35), 0, z, 8); for (let k = 0; k < 4; k++) cyl(g, 0.22, 0.22, 0.08, b, sx * (W - 0.35), 0.4 + k * (h / 4.5), z, 8); }
      inset = 0.02; break;
    case 'logs':
      along((_, at, ry, span) => { for (let y = 0.12; y < h; y += 0.26) { const [x, yy, z] = at(span / 2, y, 0.12); g.add(new THREE.CylinderGeometry(0.13, 0.13, span, 6).rotateZ(Math.PI / 2).rotateY(ry), Math.round(y / 0.26) % 2 ? a : b, M(x, yy, z)); } });
      inset = 0.26; break;
    case 'panel':
      along((_, at, ry, span) => { panel(span, 1.1, 0.05, a, at(span / 2, 0.15, 0.04), ry); for (let u = 0.4; u < span; u += 0.8) panel(0.6, 0.7, 0.07, b, at(u, 0.35, 0.05), ry); panel(span, 0.06, 0.1, b, at(span / 2, 1.25, 0.06), ry); });
      inset = 0.08; break;
    case 'deco':
      along((_, at, ry, span) => { panel(span, 1.2, 0.05, a, at(span / 2, 0.15, 0.04), ry); for (let u = 0.5; u < span; u += 1) { panel(0.04, h - 0.6, 0.06, b, at(u, 0.3, 0.06), ry); for (let k = -2; k <= 2; k++) panel(0.03, 0.6, 0.06, b, at(u + k * 0.1, h - 1.1 + Math.abs(k) * 0.08, 0.07), ry); } });
      inset = 0.08; break;
    case 'fresco':
      along((_, at, ry, span) => { panel(span, 1.0, 0.05, '#c8b898', at(span / 2, 0.15, 0.04), ry); for (let u = 1; u < span - 0.5; u += 2.2) panel(1.8, 1.6, 0.04, u % 4.4 < 2.2 ? a : b, at(u, 1.9, 0.04), ry); });
      inset = 0.06; break;
    case 'bead':
      along((_, at, ry, span) => { for (let u = 0.08; u < span; u += 0.16) panel(0.14, 1.1, 0.03, a, at(u, 0.15, 0.03), ry); panel(span, 0.08, 0.08, b, at(span / 2, 1.25, 0.05), ry); });
      inset = 0.06; break;
    case 'roots':
      for (const sx of [-1, 1]) for (let z = back + 1; z < front - 0.5; z += 1.6) r.g.add(new THREE.CylinderGeometry(0.08, 0.22, h * 0.9, 5), a, M(sx * (W - 0.3), h * 0.45, z, 0, 1, 1, 1, 0.2 * Math.sin(z), 0.25 * sx));
      for (let i = 0; i < 24; i++) sphere(r.g, 0.12, b, (i % 2 ? -1 : 1) * (W - 0.35), r.rng.range(1, h - 0.5), r.rng.range(back + 0.5, front - 0.5), 5);
      inset = 0.3; break;
    case 'glass':
      along((_, at, ry, span) => { for (let u = 0.5; u < span; u += 1) panel(0.6, 0.6, 0.03, u % 2 < 1 ? a : b, at(u, 0.4, 0.04), ry, r.glow); });
      inset = 0.06; break;
  }
  return inset;
}

function ceiling(r: Ctx, d: Dress, W: number, back: number, front: number, h: number): void {
  const g = r.g, [a, b] = d.cc, L = front - back, cz = (front + back) / 2;
  const flat = () => box(g, W * 2, 0.2, L, b, 0, h, cz);
  switch (d.ceiling) {
    case 'beams': flat(); for (let z = back + 0.6; z < front; z += 1.4) box(g, W * 2, 0.24, 0.24, a, 0, h - 0.24, z); for (const x of [-W / 2, W / 2]) box(g, 0.2, 0.2, L, a, x, h - 0.44, cz); break;
    case 'dancheong':
      flat();
      for (let z = back + 0.6; z < front; z += 1.4) for (const [k, col] of [a, b, '#3a6aa8', '#e2b43a'].entries()) box(g, W * 2, 0.07, 0.26, col, 0, h - 0.07 * (k + 1), z);
      break;
    case 'coffer':
      flat();
      for (let z = back + 1; z < front; z += 1.2) box(g, W * 2, 0.2, 0.14, a, 0, h - 0.2, z);
      for (let x = -W + 1; x < W; x += 1.2) box(g, 0.14, 0.2, L, a, x, h - 0.2, cz);
      for (let z = back + 1.6; z < front; z += 1.2) for (let x = -W + 1.6; x < W; x += 1.2) sphere(g, 0.1, b, x, h - 0.1, z, 5, 0.5);
      break;
    case 'dome': {
      // A shallow dome in the middle on a ring of muqarnas, its oculus lit; the flat ceiling round it.
      const R = Math.min(W, L / 2) * 0.7, zc = cz0(back, front);
      box(g, W * 2, 0.2, zc - R - back, b, 0, h, (back + zc - R) / 2);
      box(g, W * 2, 0.2, front - zc - R, b, 0, h, (front + zc + R) / 2);
      for (const sx of [-1, 1]) box(g, W - R, 0.2, R * 2, b, sx * (W + R) / 2, h, zc);
      g.add(inward(new THREE.SphereGeometry(R, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.45, 1)), a, M(0, h, zc));
      for (let i = 0; i < 24; i++) { const t = (i / 24) * Math.PI * 2; box(g, 0.3, 0.25, 0.2, i % 2 ? a : b, Math.cos(t) * R, h - 0.25, zc + Math.sin(t) * R, -t); }
      r.glow.add(new THREE.CircleGeometry(R * 0.18, 16).rotateX(Math.PI / 2), r.night > 0.5 ? '#8aa0ff' : '#fff6e0', M(0, h + R * 0.44, zc));
      break;
    }
    case 'tent':
      // Striped cloth sloping down from a ridge pole, poles standing in the room.
      { const n = Math.max(1, Math.round(L / 0.6)), w = L / n;
        for (const sx of [-1, 1]) for (let i = 0; i < n; i++) g.add(new THREE.BoxGeometry(Math.hypot(W, 1.6), 0.05, w), i % 2 ? a : b, M(sx * W / 2, h + 0.8, back + (i + 0.5) * w, 0, 1, 1, 1, 0, sx * -Math.atan2(1.6, W))); }
      for (let z = back + 1.5; z < front - 1; z += 3.5) cyl(g, 0.08, 0.1, h + 1.6, '#6b4a2a', 0, 0, z, 6);
      break;
    case 'gable':
      // A pitched roof seen from inside: its boards, rafters and a ridge beam.
      for (const sx of [-1, 1]) {
        const slope = Math.hypot(W, 1.8);
        g.add(new THREE.BoxGeometry(slope, 0.08, L), b, M(sx * W / 2, h + 0.9, cz, 0, 1, 1, 1, 0, sx * -Math.atan2(1.8, W)));
        for (let z = back + 0.4; z < front; z += 1.1) g.add(new THREE.BoxGeometry(slope, 0.2, 0.16), a, M(sx * W / 2, h + 0.78, z, 0, 1, 1, 1, 0, sx * -Math.atan2(1.8, W)));
      }
      box(g, 0.3, 0.3, L, a, 0, h + 1.6, cz);
      for (let z = back + 1; z < front; z += 3) box(g, W * 2, 0.22, 0.22, a, 0, h - 0.1, z); // tie beams
      box(g, W * 2, 1.9, 0.2, d.wall, 0, h, back - 0.1); // the gable end
      break;
    case 'vault':
      g.add(inward(new THREE.CylinderGeometry(W, W, L, 20, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2)), b, M(0, h, cz, 0, 1, 0.5, 1));
      for (let z = back + 1; z < front; z += 2) g.add(new THREE.TorusGeometry(W, 0.12, 4, 20, Math.PI), a, M(0, h, z, 0, 1, 0.5, 1));
      box(g, W * 2, W * 0.5 + 0.2, 0.2, d.wall, 0, h, back - 0.1);
      break;
    case 'flat': flat(); box(g, W * 2 - 0.4, 0.06, L - 0.4, a, 0, h - 0.06, cz); break;
    case 'stars':
      flat(); box(g, W * 2, 0.02, L, a, 0, h - 0.02, cz);
      for (let i = 0; i < 60; i++) sphere(r.glow, 0.04, b, r.rng.range(-W, W), h - 0.05, r.rng.range(back, front), 4);
      break;
  }
}

function lamps(r: Ctx, d: Dress, W: number, back: number, front: number, h: number): void {
  const g = r.g, glow = r.glow, c = d.lc;
  const spots: Array<[number, number]> = [];
  for (let z = back + 1.6; z < front - 1; z += 3.2) for (const x of W > 5 ? [-W / 2, W / 2] : [0]) spots.push([x, z]);
  for (const [x, z] of spots) {
    const top = h + (d.ceiling === 'gable' ? 0 : 0), y = top - 1.1;
    cyl(g, 0.012, 0.012, 1.0, '#2a2220', x, y + 0.1, z, 3);
    switch (d.lamp) {
      case 'paper': cyl(glow, 0.22, 0.22, 0.5, c, x, y - 0.4, z, 10); break;
      case 'lotus': sphere(glow, 0.26, c, x, y - 0.25, z, 8, 0.8); for (let k = 0; k < 6; k++) cone(g, 0.08, 0.2, '#ff9ab8', x + Math.cos(k) * 0.22, y - 0.35, z + Math.sin(k) * 0.22, 4); break;
      case 'red': sphere(glow, 0.3, c, x, y - 0.3, z, 10, 1.2); cyl(g, 0.12, 0.12, 0.06, '#d4af37', x, y + 0.02, z, 8); for (let k = 0; k < 5; k++) box(g, 0.02, 0.3, 0.02, '#ff2a1a', x - 0.1 + k * 0.05, y - 0.95, z); break;
      case 'brass': sphere(glow, 0.22, c, x, y - 0.3, z, 8, 1.3); for (let k = 0; k < 8; k++) cone(g, 0.04, 0.14, '#c9a24a', x + Math.cos(k * 0.79) * 0.24, y - 0.48, z + Math.sin(k * 0.79) * 0.24, 4); cone(g, 0.18, 0.25, '#c9a24a', x, y - 0.05, z, 8); break;
      case 'oil': cyl(g, 0.2, 0.14, 0.06, '#d4a84a', x, y - 0.3, z, 8); for (let k = 0; k < 5; k++) sphere(glow, 0.04, c, x + Math.cos(k * 1.26) * 0.17, y - 0.22, z + Math.sin(k * 1.26) * 0.17, 4); break;
      case 'wheel': g.add(new THREE.TorusGeometry(0.6, 0.04, 4, 20), '#2a2a2a', M(x, y - 0.3, z, 0, 1, 1, 1, Math.PI / 2, 0)); for (let k = 0; k < 8; k++) { const t = (k / 8) * Math.PI * 2; cyl(g, 0.035, 0.035, 0.18, '#fbf7ee', x + Math.cos(t) * 0.6, y - 0.28, z + Math.sin(t) * 0.6, 4); sphere(glow, 0.045, c, x + Math.cos(t) * 0.6, y - 0.06, z + Math.sin(t) * 0.6, 4); } break;
      case 'chandelier': for (let k = 0; k < 6; k++) { const t = (k / 6) * Math.PI * 2; cyl(g, 0.02, 0.02, 0.4, '#d4af37', x + Math.cos(t) * 0.35, y - 0.5, z + Math.sin(t) * 0.35, 3); sphere(glow, 0.05, c, x + Math.cos(t) * 0.35, y - 0.06, z + Math.sin(t) * 0.35, 4); } sphere(g, 0.1, '#d4af37', x, y - 0.5, z, 6); break;
      case 'deco': box(glow, 0.5, 0.2, 0.5, c, x, y - 0.3, z); for (let k = 0; k < 3; k++) box(g, 0.55 - k * 0.12, 0.03, 0.55 - k * 0.12, '#d4af37', x, y - 0.1 + k * 0.08, z); break;
      case 'glass': sphere(glow, 0.2, c, x, y - 0.3, z, 8); for (let k = 0; k < 6; k++) box(glow, 0.1, 0.18, 0.02, ['#ff5a8a', '#5ad8ff', '#ffd24a'][k % 3], x + Math.cos(k) * 0.24, y - 0.3, z + Math.sin(k) * 0.24, k); break;
      case 'star': glow.add(new THREE.OctahedronGeometry(0.22), c, M(x, y - 0.2, z)); break;
    }
  }
}
