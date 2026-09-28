import * as THREE from 'three';
import type { RegionId } from './regions';
import { doorway } from './buildings';
import { M, archPanel, box, cone, cyl, dome, gable, onion, sphere, sweptRoof } from './kit';
import type { K } from './institutes3d';

/**
 * What makes an institute read as a public institution rather than a big house, in each land's
 * own building tradition:
 *  - the walls (`dressWalls`): a stone base, and the tradition's way of articulating a public
 *    façade — pilasters, string courses, quoins and window hoods in the European lands; exposed
 *    posts and beams on a stone base in the timber lands of East Asia, Kerala and Bali; recessed
 *    arched panels, tile bands and chhajja eaves in the Islamic and Indian lands; battens in the
 *    north; lines of light in the sky;
 *  - the entrance (`entrance`): every land its own — a pedimented portico in London, an arcaded
 *    loggia with roundels in Firenzia, a karahafu porch in Sakura Hollow, a pishtaq in Bagh-e-Noor,
 *    a pylon gate on the Nile, a Kerala gabled porch, a joglo pendopo in Nusa Rinjani, and so on —
 *    always with the institute's name board over the door.
 *
 * All in a block's own frame: its base centre at the origin, the front face on the plane z = f.
 */

export type Tradition = 'classic' | 'timber' | 'masonry' | 'nordic' | 'sky';

export const TRADITION: Record<RegionId, Tradition> = {
  meadow: 'classic', london: 'classic', renaissance: 'classic', vintage: 'classic', switzerland: 'classic', newyork: 'classic',
  japan: 'timber', korea: 'timber', china: 'timber', indonesia: 'timber', indiasouth: 'timber',
  islamic: 'masonry', middleeast: 'masonry', desert: 'masonry', egypt: 'masonry', indianorth: 'masonry', mughal: 'masonry',
  norway: 'nordic', aurora: 'nordic', skyisles: 'sky',
};

const STONE = '#d8cfbd', STONE_D = '#b8ad98', GOLD = '#d4af37', IRON = '#2a2a30', WHITE = '#fbf7ee', DARK = '#3a2a22';

/** The colour posts are painted in each timber land. */
const POST: Partial<Record<RegionId, string>> = { japan: '#3a2a22', korea: '#9a2f2a', china: '#b0322a', indonesia: '#5a3a22', indiasouth: '#5a3422' };

/** Shade a colour lighter (k > 0) or darker (k < 0). */
function shade(col: string, k: number): string {
  const c = new THREE.Color(col);
  return '#' + (k > 0 ? c.lerp(new THREE.Color('#ffffff'), k) : c.multiplyScalar(1 + k)).getHexString();
}

/** Window centres along a face `len` long, as the block lays them out. */
export function bays(len: number, step: number): number[] {
  const n = Math.max(1, Math.floor(len / step));
  return Array.from({ length: n }, (_, i) => -len / 2 + (len / n) * (i + 0.5));
}

/**
 * The public façade over a block w × d whose walls rise from 0.45 (the plinth) to top: storey
 * lines, bays and corners in the land's tradition. `door`: the front's middle bay is the entrance.
 */
export function dressWalls(k: K, w: number, d: number, top: number, storeys: number, storey: number, door: boolean): void {
  const { c } = k, g = c.g, id = c.s.id, tr = TRADITION[id];
  const fronts = bays(w, 2.6), sides = bays(d, 2.8);
  const gaps = (xs: number[], len: number) => { const s = [-len / 2, ...xs.slice(0, -1).map((x, i) => (x + xs[i + 1]) / 2), len / 2]; return s; };
  const skipDoor = (x: number) => door && Math.abs(x) < 1.8;
  // A stone base course all round, taller than a house's.
  box(g, w + 0.12, 0.9, d + 0.12, tr === 'masonry' && (id === 'desert' || id === 'egypt') ? shade(k.wall, -0.12) : STONE_D, 0, 0.45, 0);
  switch (tr) {
    case 'classic': {
      const pil = id === 'newyork' ? shade(k.wall, 0.25) : shade(k.trim, 0.35);
      // Rusticated ground storey: deep horizontal joints.
      for (let y = 1.5; y < 0.45 + storey; y += 0.55) box(g, w + 0.05, 0.06, d + 0.05, shade(k.wall, -0.25), 0, y, 0);
      // A string course at every storey, and a heavier cornice-band under the roof.
      for (let s = 1; s < storeys; s++) box(g, w + 0.24, 0.2, d + 0.24, pil, 0, 0.45 + s * storey - 0.1, 0);
      // Pilasters between the bays of the front and back, with capitals; quoins up the corners.
      for (const z of [d / 2 + 0.06, -d / 2 - 0.06]) for (const x of gaps(fronts, w)) {
        if (skipDoor(x) && z > 0) continue;
        box(g, 0.36, top - 0.45 - storey, 0.12, pil, x, 0.45 + storey, z);
        box(g, 0.52, 0.22, 0.2, pil, x, top - 0.3, z);
      }
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let i = 0; (i + 1) * 0.6 < top - 0.45; i++) {
        box(g, i % 2 ? 0.7 : 0.45, 0.5, i % 2 ? 0.45 : 0.7, STONE, sx * (w / 2 - 0.16), 0.5 + i * 0.6, sz * (d / 2 - 0.16));
      }
      // Hoods over the upper windows: a little cornice on brackets, a pediment on alternate bays.
      for (let s = 1; s < storeys; s++) for (const [i, x] of fronts.entries()) {
        const y = 0.45 + s * storey + 1.0 + 1.45;
        box(g, 1.35, 0.14, 0.24, STONE, x, y, d / 2 + 0.1);
        if (i % 2 === 0) gable(g, 0.22, 1.35, 0.35, STONE, x, y + 0.14, d / 2 + 0.1, Math.PI / 2);
      }
      break;
    }
    case 'timber': {
      const post = POST[id] ?? DARK, beam = id === 'korea' ? '#2f8a5a' : id === 'china' ? '#2f5a9a' : shade(post, 0.15);
      // Posts at every bay line round the building, a beam at each floor and under the eaves.
      const ring: Array<[number, number, number]> = [];
      for (const x of gaps(fronts, w)) ring.push([x, d / 2 + 0.07, 0], [x, -d / 2 - 0.07, 0]);
      for (const z of gaps(sides, d)) ring.push([w / 2 + 0.07, z, 1], [-w / 2 - 0.07, z, 1]);
      for (const [x, z] of ring) box(g, 0.3, top - 1.35, 0.3, post, x, 1.35, z);
      for (let s = 1; s <= storeys; s++) box(g, w + 0.3, 0.32, d + 0.3, beam, 0, 0.45 + s * storey - 0.34, 0);
      // Latticed panels under the upper windows, as balustrades.
      for (let s = 1; s < storeys; s++) for (const x of fronts) {
        const y = 0.45 + s * storey + 0.15;
        box(g, 1.6, 0.08, 0.12, post, x, y + 0.7, d / 2 + 0.1);
        for (let q = 0; q < 6; q++) box(g, 0.05, 0.7, 0.1, post, x - 0.7 + q * 0.28, y, d / 2 + 0.1);
      }
      break;
    }
    case 'masonry': {
      const [a, b] = k.st.frieze;
      const pointed = k.st.arch === 'pointed';
      // Each window set in a tall recessed arched panel.
      for (let s = 0; s < storeys; s++) for (const x of fronts) {
        if (s === 0 && skipDoor(x)) continue;
        archPanel(g, 1.7, 2.3, shade(k.wall, -0.1), x, 0.45 + s * storey + 0.55, d / 2 + 0.01, 0, 0.04, pointed);
      }
      // A band of tiles at each storey line: little diamonds in the land's two colours.
      for (let s = 1; s <= storeys; s++) {
        const y = 0.45 + s * storey - 0.45;
        box(g, w + 0.06, 0.34, d + 0.06, b, 0, y, 0);
        for (let i = 0; i < Math.floor(w / 0.5); i++) g.add(new THREE.BoxGeometry(0.2, 0.2, 0.04), a, M(-w / 2 + 0.25 + i * 0.5, y + 0.17, d / 2 + 0.04, 0, 1, 1, 1, 0, Math.PI / 4));
      }
      if (id === 'indianorth' || id === 'mughal') {
        // Chhajjas: thin sloping eaves over every storey.
        for (let s = 1; s <= storeys; s++) g.add(new THREE.BoxGeometry(w + 0.9, 0.1, 0.9), WHITE, M(0, 0.45 + s * storey - 0.05, d / 2 + 0.4, 0, 1, 1, 1, 0.25, 0));
      }
      if (id === 'egypt') for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.16, 0.16, top - 0.45, shade(k.trim, 0.2), sx * w / 2, 0.45, sz * d / 2, 8); // torus moulding
      if (id === 'desert' || id === 'middleeast') for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        cyl(g, 0.45, 0.7, top - 0.45, shade(k.wall, -0.06), sx * (w / 2 - 0.1), 0.45, sz * (d / 2 - 0.1), 8); // tapered corner buttresses
        dome(g, 0.46, shade(k.wall, -0.06), sx * (w / 2 - 0.1), top, sz * (d / 2 - 0.1), 8);
      }
      break;
    }
    case 'nordic': {
      if (id === 'aurora') {
        // Log ends crossing at the corners.
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let y = 0.7; y < top; y += 0.45) cyl(g, 0.16, 0.16, 0.5, '#8a6a4a', sx * (w / 2 + 0.1), y, sz * (d / 2 + 0.1), 6);
      } else {
        // Board-and-batten walls and white-framed windows.
        for (const z of [d / 2 + 0.03, -d / 2 - 0.03]) for (let x = -w / 2 + 0.2; x < w / 2; x += 0.45) if (!(z > 0 && skipDoor(x))) box(g, 0.07, top - 1.35, 0.06, shade(k.wall, -0.18), x, 1.35, z);
      }
      for (let s = 1; s <= storeys; s++) box(g, w + 0.2, 0.2, d + 0.2, WHITE, 0, 0.45 + s * storey - 0.2, 0);
      break;
    }
    case 'sky':
      // Lines of light round every storey, crystals at the corners.
      for (let s = 1; s <= storeys; s++) box(c.glow, w + 0.1, 0.07, d + 0.1, '#fff0c8', 0, 0.45 + s * storey - 0.3, 0);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.glow.add(new THREE.OctahedronGeometry(0.35).scale(0.6, 1.8, 0.6), '#bfe8ff', M(sx * (w / 2 + 0.5), top + 0.8, sz * (d / 2 + 0.5)));
      break;
  }
}

/** The institute's name board: a dark board with gold lettering (horizontal, or vertical as in East Asia). */
export function plaque(k: K, x: number, y: number, z: number, w: number, vertical = false, board = '#2a2a30', letters = GOLD): void {
  const g = k.c.g, h = vertical ? w * 2.6 : w * 0.28, bw = vertical ? w * 0.42 : w;
  box(g, bw + 0.14, h + 0.14, 0.08, GOLD, x, y - 0.07, z);
  box(g, bw, h, 0.1, board, x, y, z + 0.02);
  const n = vertical ? 4 : Math.max(4, Math.round(w / 0.32));
  for (let i = 0; i < n; i++) {
    const cx = vertical ? x : x - bw / 2 + (bw / n) * (i + 0.5), cy = vertical ? y + h - (h / n) * (i + 0.5) : y + h / 2;
    const s = vertical ? bw * 0.5 : Math.min(0.2, (bw / n) * 0.7);
    box(g, s * 0.8, s * 0.12, 0.03, letters, cx, cy + s * 0.25, z + 0.08);
    box(g, s * 0.12, s * 0.9, 0.03, letters, cx - s * 0.2 + (i % 3) * s * 0.2, cy - s * 0.4, z + 0.08);
    if (i % 2) box(g, s * 0.6, s * 0.1, 0.03, letters, cx, cy - s * 0.35, z + 0.08);
  }
}

/** Steps up to the door, `w` wide, from the ground to the plinth, starting at the front face z = f. */
function steps(k: K, w: number, f: number, n = 3, rise = 0.15, tread = 0.4, col = STONE): void {
  for (let i = 0; i < n; i++) box(k.c.g, w - i * 0.2, rise * (n - i), tread, col, 0, 0, f + tread * (n - i - 0.5));
}

/** A column with base and capital, `h` tall from y0. */
function column(k: K, x: number, y0: number, z: number, h: number, r: number, col = WHITE, cap = col): void {
  const g = k.c.g;
  box(g, r * 2.6, 0.2, r * 2.6, cap, x, y0, z);
  cyl(g, r * 0.88, r, h - 0.45, col, x, y0 + 0.2, z, 12);
  cyl(g, r * 1.35, r * 0.95, 0.25, cap, x, y0 + h - 0.25, z, 12);
}

/** A hanging or standing lamp that glows at night, in the land's manner. */
function lamp(k: K, x: number, y: number, z: number, kind: 'iron' | 'paper' | 'brass' | 'diya' | 'crystal'): void {
  const { g, glow } = k.c, lit = k.c.s.glow;
  if (kind === 'iron') { box(g, 0.34, 0.08, 0.34, IRON, x, y + 0.55, z); box(glow, 0.26, 0.5, 0.26, '#ffe2a0', x, y + 0.05, z); cone(g, 0.26, 0.25, IRON, x, y + 0.63, z, 4, Math.PI / 4); }
  else if (kind === 'paper') { sphere(glow, 0.3, '#ffcf8a', x, y + 0.2, z, 10, 1.3); cyl(g, 0.2, 0.2, 0.06, IRON, x, y + 0.58, z, 10); cyl(g, 0.2, 0.2, 0.06, IRON, x, y - 0.18, z, 10); }
  else if (kind === 'brass') { sphere(glow, 0.22, '#ffcf7a', x, y + 0.2, z, 8); dome(g, 0.24, GOLD, x, y + 0.38, z, 8); cone(g, 0.05, 0.2, GOLD, x, y - 0.08, z, 6, Math.PI); }
  else if (kind === 'diya') { cyl(g, 0.16, 0.08, 0.1, '#b0553a', x, y, z, 10); cone(glow, 0.05, 0.16, '#ffb84a', x, y + 0.1, z, 5); }
  else glow.add(new THREE.OctahedronGeometry(0.28).scale(0.6, 1.5, 0.6), lit, M(x, y + 0.3, z));
}

type Porch = (k: K, w: number, f: number) => void;

/** Each land's entrance to a public building. */
const PORCH: Record<RegionId, Porch> = {
  // A Palladian portico: steps, four columns, an entablature carrying the name, a pediment, iron lamps.
  london(k, w, f) {
    const g = k.c.g;
    steps(k, 7, f + 2.2, 4);
    box(g, 6.4, 0.45, 2.4, STONE, 0, 0, f + 1.2);
    for (const x of [-2.4, -0.8, 0.8, 2.4]) column(k, x, 0.45, f + 2.1, 4.2, 0.24, WHITE, STONE);
    box(g, 6.2, 0.55, 2.5, WHITE, 0, 4.65, f + 1.2);
    gable(g, 2.6, 6.6, 1.3, WHITE, 0, 5.2, f + 1.2, Math.PI / 2);
    gable(g, 2.2, 5.6, 0.95, shade(k.wall, 0.15), 0, 5.28, f + 1.28, Math.PI / 2);
    plaque(k, 0, 4.72, f + 2.46, 3.4);
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
    for (const s of [-1, 1]) { cyl(g, 0.06, 0.08, 2.4, IRON, s * 3.2, 0, f + 3.6, 6); lamp(k, s * 3.2, 2.4, f + 3.6, 'iron'); }
    void w;
  },
  // Brunelleschi's loggia: a row of round arches on slender columns, blue roundels in the spandrels.
  renaissance(k, w, f) {
    const g = k.c.g, span = Math.min(w - 1, 10), n = 5, bay = span / n;
    steps(k, span + 0.6, f + 2.6, 3);
    box(g, span + 0.4, 0.45, 2.6, STONE, 0, 0, f + 1.3);
    for (let i = 0; i <= n; i++) column(k, -span / 2 + i * bay, 0.45, f + 2.4, 3.2, 0.14, '#9a9a94', '#9a9a94');
    for (let i = 0; i < n; i++) {
      const x = -span / 2 + bay * (i + 0.5);
      g.add(new THREE.TorusGeometry(bay / 2 - 0.05, 0.1, 5, 14, Math.PI), '#9a9a94', M(x, 3.65, f + 2.45));
      k.c.g.add(new THREE.CylinderGeometry(0.34, 0.34, 0.06, 16).rotateX(Math.PI / 2), '#3a6ab8', M(x + bay / 2, 4.15, f + 2.5));
      k.c.g.add(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 12).rotateX(Math.PI / 2), WHITE, M(x + bay / 2, 4.15, f + 2.52));
    }
    box(g, span + 0.3, 0.9, 0.4, WHITE, 0, 3.75 + bay / 2 - 0.4, f + 2.4);
    box(g, span + 0.8, 0.2, 2.9, k.roof, 0, 4.25 + bay / 2, f + 1.3);
    plaque(k, 0, 4.0 + bay / 2 - 0.4, f + 2.62, 3);
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
  },
  // A storybook portal: a round-arched door between two little turrets with pink cone roofs, fairy lights.
  meadow(k, w, f) {
    const g = k.c.g;
    steps(k, 5, f + 1.4, 3);
    for (const s of [-1, 1]) {
      cyl(g, 0.75, 0.8, 5.4, shade(k.wall, 0.1), s * 2.1, 0, f + 0.6, 14);
      cyl(g, 0.9, 0.9, 0.25, k.trim, s * 2.1, 5.4, f + 0.6, 14);
      cone(g, 1.05, 2.2, '#ff8fb8', s * 2.1, 5.65, f + 0.6, 14);
      sphere(g, 0.12, GOLD, s * 2.1, 7.9, f + 0.6, 6);
      archPanel(k.c.glow, 0.45, 0.8, k.c.s.glow, s * 2.1, 3.2, f + 1.38, 0, 0.04);
    }
    archPanel(g, 3.2, 4.4, k.trim, 0, 0.45, f + 0.02, 0, 0.2);
    for (let i = 0; i < 11; i++) { const a = Math.PI * (i / 10); sphere(k.c.glow, 0.07, ['#fff4c0', '#ff8fb8', '#b3e6ff'][i % 3], Math.cos(a) * 1.75, 0.45 + 2.8 + Math.sin(a) * 1.75, f + 0.26, 5); }
    plaque(k, 0, 5.0, f + 0.3, 2.6, false, '#fff4c0', '#c8508a');
    doorway(k.c, k.st, 0, f + 0.24, k.trim);
    void w;
  },
  // A colonial portico: tall white columns through two storeys, a fanlight in the pediment.
  vintage(k, w, f) {
    const g = k.c.g;
    steps(k, 6.6, f + 2.3, 3);
    box(g, 6.2, 0.45, 2.5, WHITE, 0, 0, f + 1.25);
    for (const x of [-2.4, -0.8, 0.8, 2.4]) column(k, x, 0.45, f + 2.2, 6.2, 0.22);
    box(g, 6.2, 0.5, 2.6, WHITE, 0, 6.65, f + 1.25);
    gable(g, 2.7, 6.6, 1.4, WHITE, 0, 7.15, f + 1.25, Math.PI / 2);
    k.c.glow.add(new THREE.CircleGeometry(0.6, 16, 0, Math.PI), '#ffe2a0', M(0, 7.3, f + 2.62));
    for (let i = 0; i < 5; i++) box(g, 0.04, 0.6, 0.03, WHITE, Math.cos((i + 1) * Math.PI / 6) * 0.3, 7.3 + Math.sin((i + 1) * Math.PI / 6) * 0.3, f + 2.64, 0);
    plaque(k, 0, 5.4, f + 0.12, 2.8, false, '#1f3a5a');
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
    void w;
  },
  // Bernese Lauben: an arcade of low round arches before the door, a clock and plain shields over it.
  switzerland(k, w, f) {
    const g = k.c.g, span = Math.min(w - 0.5, 9);
    at3(k, 0, 0, f + 1.3, () => {
      box(g, span, 0.9, 2.6, STONE, 0, 2.9, 0);
      for (let i = 0; i < 3; i++) { const x = -span / 3 + i * (span / 3); for (const s of [-1, 1]) box(g, 0.6, 2.9, 2.6, STONE, x + s * (span / 6 - 0.3), 0, 0); archPanel(g, span / 3 - 1.2, 2.9, STONE_D, x, 0, 1.28, 0, 0.04); }
    });
    box(g, span, 0.12, 2.8, k.roof, 0, 3.85, f + 1.3);
    k.c.glow.add(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 24).rotateX(Math.PI / 2), '#fff4d0', M(0, 5.6, f + 0.1));
    k.c.g.add(new THREE.TorusGeometry(0.75, 0.07, 5, 24), GOLD, M(0, 5.6, f + 0.14));
    box(g, 0.06, 0.55, 0.04, IRON, 0, 5.4, f + 0.18); k.c.g.add(new THREE.BoxGeometry(0.06, 0.4, 0.04).translate(0, 0.2, 0), IRON, M(0, 5.6, f + 0.2, 0, 1, 1, 1, 0, -2));
    for (const s of [-1, 1]) { box(g, 0.7, 0.8, 0.08, '#c8202a', s * 1.6, 5.3, f + 0.08); g.add(new THREE.ConeGeometry(0.35, 0.3, 3).rotateZ(Math.PI), '#c8202a', M(s * 1.6, 5.15, f + 0.08)); }
    plaque(k, 0, 4.1, f + 2.62, 3.4);
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
  },
  // Art-deco: a stepped portal in three setbacks, a golden sunburst over tall doors, a bronze marquee.
  newyork(k, w, f) {
    const g = k.c.g;
    steps(k, 6, f + 2, 3);
    for (let i = 0; i < 3; i++) box(g, 5.6 - i * 1.1, 8 - i * 1.2, 0.3, shade(k.wall, 0.12 + i * 0.06), 0, 0.45, f + 0.15 + i * 0.3);
    box(g, 2.2, 3.4, 0.12, '#2a2a30', 0, 0.45, f + 1.0);
    for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; k.c.glow.add(new THREE.BoxGeometry(0.06, 1, 0.03).translate(0, 0.5, 0), GOLD, M(0, 4.3, f + 1.02, 0, 1, 1, 1, 0, a - Math.PI / 2)); }
    box(g, 4.6, 0.3, 1.6, '#8a6a3a', 0, 4.1, f + 1.6);
    box(k.c.glow, 4.4, 0.06, 1.4, '#fff4d0', 0, 4.06, f + 1.6);
    plaque(k, 0, 5.6, f + 1.05, 3.2, false, '#1a1a20');
    for (const s of [-1, 1]) lamp(k, s * 2.6, 2.4, f + 1.05, 'iron');
    void w;
  },
  // Stave-church carpentry: a gabled porch on posts, carved scrolls at the gable tips, interlace round the door.
  norway(k, w, f) {
    const g = k.c.g, tar = '#3a2418';
    steps(k, 4, f + 2.4, 2);
    for (const [x, z] of [[-1.5, 0.6], [1.5, 0.6], [-1.5, 2.2], [1.5, 2.2]]) box(g, 0.24, 3.2, 0.24, tar, x, 0.45, f + z);
    gable(g, 2.6, 4, 1.8, tar, 0, 3.65, f + 1.4, Math.PI / 2);
    for (const s of [-1, 1]) {
      const pts: THREE.Vector3[] = []; for (let i = 0; i <= 10; i++) { const a = (i / 10) * Math.PI * 1.5; pts.push(new THREE.Vector3(s * (0.2 + Math.sin(a) * 0.35 * (1 - i / 14)), 5.3 + (1 - Math.cos(a)) * 0.35, f + 2.7)); }
      g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.07, 4), tar);
    }
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; g.add(new THREE.TorusGeometry(0.2, 0.03, 3, 8), '#c8a060', M(Math.cos(a) * 1.1, 1.6 + Math.sin(a) * 1.4, f + 0.08)); }
    plaque(k, 0, 3.0, f + 0.1, 2, false, tar, '#e8c48a');
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
    void w;
  },
  // Karahafu: a porch whose gable curves up in a cusped wave, on two posts; a noren over the door.
  japan(k, w, f) {
    const g = k.c.g, post = POST.japan!;
    steps(k, 4.4, f + 2.6, 2, 0.22, 0.5, '#9a948a');
    for (const [x, z] of [[-1.7, 2.3], [1.7, 2.3]]) { box(g, 0.28, 3.6, 0.28, post, x, 0.45, f + z); box(g, 0.5, 0.3, 0.5, '#9a948a', x, 0, f + z); }
    box(g, 4, 0.34, 0.34, post, 0, 3.9, f + 2.3);
    box(g, 4, 0.3, 2.4, post, 0, 4.1, f + 1.2);
    sweptRoof(g, 4.8, 3.6, 1.2, k.roof, 0, 4.35, f + 1.3, 0, 0.5);
    g.add(new THREE.TorusGeometry(1.3, 0.14, 5, 18, Math.PI), k.roof, M(0, 4.35, f + 2.8, 0, 1, 0.45, 1));
    g.add(new THREE.TorusGeometry(1.3, 0.06, 4, 18, Math.PI), GOLD, M(0, 4.33, f + 2.9, 0, 1, 0.45, 1));
    for (let i = 0; i < 3; i++) box(g, 0.44, 1.2, 0.03, '#2a3a6a', -0.46 + i * 0.46, 1.95, f + 0.14);
    plaque(k, 0, 3.0, f + 2.46, 0.7, true, '#3a2a22', '#f7f1e3');
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
    for (const s of [-1, 1]) lamp(k, s * 1.7, 3.1, f + 2.6, 'paper');
    void w;
  },
  // A Korean gate-porch: red pillars on stone bases, dancheong-painted beams, a tiled roof, a hyeonpan board.
  korea(k, w, f) {
    const g = k.c.g, red = POST.korea!;
    steps(k, 5, f + 2.6, 3, 0.15, 0.4, '#a8a498');
    for (const x of [-1.9, 1.9]) for (const z of [0.6, 2.3]) { cyl(g, 0.2, 0.22, 3.4, red, x, 0.45, f + z, 10); box(g, 0.55, 0.3, 0.55, '#a8a498', x, 0.15, f + z); }
    for (const [y, col] of [[3.8, '#2f8a5a'], [4.1, '#3a6aa8'], [4.35, '#c23b2a']] as const) box(g, 4.5, 0.25, 2.2, col, 0, y, f + 1.45);
    for (let i = 0; i < 10; i++) box(g, 0.2, 0.2, 0.06, ['#f4efe4', '#e2b43a'][i % 2], -2 + i * 0.44, 3.95, f + 2.58);
    sweptRoof(g, 5.6, 3.8, 1.5, k.roof, 0, 4.6, f + 1.45, 0, 0.5);
    plaque(k, 0, 3.0, f + 2.46, 2.2, false, '#2f3a4a', '#f4efe4');
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
    void w;
  },
  // A Chinese hall porch: four red columns, a two-tier roof, a gold-on-blue name board, red lanterns.
  china(k, w, f) {
    const g = k.c.g, red = POST.china!;
    steps(k, 6, f + 2.8, 3, 0.15, 0.4, '#b8b0a0');
    for (const x of [-2.4, -0.9, 0.9, 2.4]) cyl(g, 0.2, 0.22, 3.6, red, x, 0.45, f + 2.3, 10);
    box(g, 5.6, 0.4, 2.8, '#2f5a9a', 0, 4.05, f + 1.4);
    sweptRoof(g, 6.8, 4, 1.1, k.roof, 0, 4.45, f + 1.4, 0, 0.55);
    sweptRoof(g, 4.4, 2.8, 1.1, k.roof, 0, 5.55, f + 1.2, 0, 0.55);
    plaque(k, 0, 3.4, f + 2.5, 2.4, false, '#2f4a8a', GOLD);
    for (const s of [-1, 1]) { cyl(g, 0.01, 0.01, 0.4, IRON, s * 1.6, 3.6, f + 2.4, 3); sphere(k.c.glow, 0.34, '#ff3a2a', s * 1.6, 3.3, f + 2.4, 10, 1.2); }
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
    void w;
  },
  // A Moroccan medersa gate: a horseshoe arch in a zellige frame under a carved cedar canopy with green tiles.
  islamic(k, w, f) {
    const g = k.c.g, [a, b] = k.st.frieze;
    steps(k, 4.6, f + 0.9, 2);
    box(g, 4.4, 5.4, 0.5, shade(k.wall, 0.12), 0, 0, f + 0.25);
    for (let r = 0; r < 12; r++) for (let q = 0; q < 10; q++) {
      const x = -1.95 + q * 0.43, y = 0.3 + r * 0.43;
      if (Math.abs(x) < 1.3 && y < 3.9) continue;
      box(g, 0.38, 0.38, 0.04, (r + q) % 2 ? a : b, x, y, f + 0.52);
    }
    archPanel(g, 2.4, 3.4, '#3a2a22', 0, 0.3, f + 0.5, 0, 0.1);
    k.c.g.add(new THREE.TorusGeometry(1.25, 0.1, 5, 18, Math.PI * 1.25), WHITE, M(0, 2.5, f + 0.6, 0, 1, 1, 1, 0, -Math.PI * 0.125));
    for (let i = 0; i < 9; i++) box(g, 0.14, 0.4, 0.8, '#8a5a36', -2.1 + i * 0.52, 5.1, f + 0.9);
    box(g, 5, 0.2, 1.5, '#8a5a36', 0, 5.45, f + 0.75);
    gable(g, 5.2, 1.7, 0.7, '#2f8a5a', 0, 5.65, f + 0.75);
    plaque(k, 0, 4.35, f + 0.56, 2.6, false, '#f2d27a', '#1f3a5a');
    lamp(k, 0, 4.0, f + 1.6, 'brass');
    void w;
  },
  // A Gulf entrance: a pointed arch, a turned-wood mashrabiya above it, crenellations with triangles.
  middleeast(k, w, f) {
    const g = k.c.g;
    steps(k, 4.2, f + 1, 2);
    box(g, 4.2, 6.6, 0.6, shade(k.wall, 0.08), 0, 0, f + 0.3);
    archPanel(g, 2.2, 3.4, '#6b4a2a', 0, 0.3, f + 0.6, 0, 0.1, true);
    box(g, 2.4, 1.6, 0.9, '#6b4a2a', 0, 4.4, f + 0.9);
    for (let r = 0; r < 4; r++) for (let q = 0; q < 6; q++) sphere(g, 0.06, '#a8784a', -1 + q * 0.4, 4.6 + r * 0.35, f + 1.36, 4);
    box(g, 2.6, 0.2, 1.1, '#5a3a22', 0, 6, f + 0.9);
    for (let i = 0; i < 5; i++) g.add(new THREE.ConeGeometry(0.34, 0.6, 3), shade(k.wall, 0.08), M(-1.6 + i * 0.8, 6.9, f + 0.3));
    plaque(k, 0, 3.95, f + 0.62, 2, false, '#3ac8b8', '#fbf7ee');
    void w;
  },
  // A Najdi portal: a thick mud frame, a studded palm-wood door, a band of white triangles, crenellations.
  desert(k, w, f) {
    const g = k.c.g, mud = shade(k.wall, -0.05);
    box(g, 4.6, 5.8, 0.9, mud, 0, 0, f + 0.45);
    box(g, 2, 3, 0.1, '#6b4a2a', 0, 0.2, f + 0.92);
    for (let r = 0; r < 6; r++) for (let q = 0; q < 4; q++) sphere(g, 0.05, GOLD, -0.6 + q * 0.4, 0.5 + r * 0.45, f + 0.98, 4);
    for (let i = 0; i < 8; i++) g.add(new THREE.ConeGeometry(0.22, 0.4, 3), WHITE, M(-1.9 + i * 0.54, 3.9, f + 0.92, 0, 1, 1, 0.2));
    for (let i = 0; i < 6; i++) g.add(new THREE.ConeGeometry(0.3, 0.7, 3), mud, M(-1.9 + i * 0.76, 6.15, f + 0.45));
    plaque(k, 0, 4.4, f + 0.92, 2.2, false, '#c8483a', '#f2d6a0');
    lamp(k, -1.6, 3.2, f + 1.1, 'brass'); lamp(k, 1.6, 3.2, f + 1.1, 'brass');
    void w;
  },
  // A pylon gate: two battered towers either side of the door, cavetto cornices, a gilded sun disc.
  egypt(k, w, f) {
    const g = k.c.g, sand = shade(k.wall, 0.05);
    for (const s of [-1, 1]) {
      g.add(new THREE.CylinderGeometry(1.35, 1.75, 7, 4, 1).rotateY(Math.PI / 4), sand, M(s * 2.5, 3.5, f + 0.9, 0, 1, 1, 0.6));
      box(g, 3.2, 0.5, 1.9, shade(k.trim, 0.1), s * 2.5, 7, f + 0.9);
      for (let i = 0; i < 4; i++) box(g, 1.6, 0.08, 0.04, ['#2f6fb8', '#e8b84a'][i % 2], s * 2.5, 5.2 - i * 0.5, f + 1.6);
    }
    box(g, 2.2, 4.6, 1.4, sand, 0, 0, f + 0.7);
    box(g, 1.3, 2.6, 0.1, '#4a3426', 0, 0.2, f + 1.42);
    box(g, 2.6, 0.45, 1.6, shade(k.trim, 0.1), 0, 4.6, f + 0.7);
    k.c.g.add(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 20).rotateX(Math.PI / 2), GOLD, M(0, 3.8, f + 1.44));
    for (const s of [-1, 1]) g.add(new THREE.BoxGeometry(0.9, 0.18, 0.04), '#2f6fb8', M(s * 0.8, 3.85, f + 1.44, 0, 1, 1, 1, 0, s * 0.12));
    plaque(k, 0, 3.0, f + 1.44, 1.2, false, '#e8b84a', '#2f3a6a');
    void w;
  },
  // A Rajput gate: a cusped arch, a jharokha balcony over it with its little dome, brass lamps.
  indianorth(k, w, f) {
    const g = k.c.g;
    steps(k, 4.6, f + 1.1, 3);
    box(g, 4.4, 5.2, 0.7, shade(k.wall, 0.08), 0, 0, f + 0.35);
    archPanel(g, 2.2, 3.4, '#5a2a1a', 0, 0.3, f + 0.7, 0, 0.1, true);
    for (let i = 0; i < 7; i++) { const a = Math.PI * (0.1 + (i / 6) * 0.8); sphere(g, 0.14, WHITE, Math.cos(a) * 1.15, 2.6 + Math.sin(a) * 1.2, f + 0.82, 6, 0.6); }
    box(g, 2.4, 0.3, 1.2, WHITE, 0, 5.2, f + 1.0);
    box(g, 2, 1.4, 1, shade(k.wall, 0.08), 0, 5.5, f + 1.0);
    archPanel(k.c.glow, 0.9, 0.9, k.c.s.glow, 0, 5.7, f + 1.52, 0, 0.04, true);
    g.add(new THREE.SphereGeometry(1.0, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), shade(k.wall, 0.08), M(0, 6.9, f + 1.0));
    cone(g, 0.06, 0.4, GOLD, 0, 7.9, f + 1.0, 5);
    plaque(k, 0, 4.1, f + 0.72, 2, false, '#d1284a', GOLD);
    for (const s of [-1, 1]) lamp(k, s * 1.9, 3.3, f + 1.0, 'diya');
    void w;
  },
  // A pishtaq: a tall frame standing proud, a pointed arch recessed in it outlined in white, finials and chhatris.
  mughal(k, w, f) {
    const g = k.c.g, sand = '#b5552e';
    steps(k, 5.2, f + 1.4, 3);
    box(g, 5.2, 8, 1.1, sand, 0, 0, f + 0.55);
    archPanel(g, 3.4, 5.2, shade(sand, -0.3), 0, 0.3, f + 1.1, 0, 0.06, true);
    archPanel(g, 3.8, 5.6, WHITE, 0, 0.3, f + 1.08, 0, 0.04, true);
    for (const s of [-1, 1]) { box(g, 0.22, 7.2, 0.06, WHITE, s * 2.3, 0.4, f + 1.12); cyl(g, 0.18, 0.2, 8.6, WHITE, s * 2.6, 0, f + 1.1, 8); sphere(g, 0.25, WHITE, s * 2.6, 8.8, f + 1.1, 8); cone(g, 0.05, 0.4, GOLD, s * 2.6, 9.0, f + 1.1, 5); }
    box(g, 4.6, 0.22, 0.06, WHITE, 0, 7.5, f + 1.12);
    for (const s of [-1, 1]) { for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.06, 0.06, 0.9, WHITE, s * 1.6 + dx * 0.4, 8, f + 0.55 + dz * 0.3, 5); box(g, 1.1, 0.1, 0.9, WHITE, s * 1.6, 8.9, f + 0.55); onion(g, 0.35, WHITE, s * 1.6, 9.0, f + 0.55); }
    plaque(k, 0, 6.3, f + 1.12, 2.4, false, WHITE, '#2a2622');
    doorway(k.c, k.st, 0, f + 1.1, k.trim);
    void w;
  },
  // A Kerala porch: a steep tiled gable on turned wooden posts, a latticed gable face, tall brass lamps.
  indiasouth(k, w, f) {
    const g = k.c.g, wood = POST.indiasouth!;
    steps(k, 4.4, f + 2.8, 3, 0.15, 0.4, '#8a5a3a');
    for (const [x, z] of [[-1.8, 0.8], [1.8, 0.8], [-1.8, 2.4], [1.8, 2.4]]) { cyl(g, 0.14, 0.16, 3.2, wood, x, 0.45, f + z, 8); for (const y of [1, 2.6]) cyl(g, 0.2, 0.2, 0.2, wood, x, 0.45 + y, f + z, 8); }
    gable(g, 3.4, 5, 2.6, '#a8503a', 0, 3.65, f + 1.6, Math.PI / 2);
    for (let r = 0; r < 4; r++) for (let q = 0; q < 5 - r; q++) box(g, 0.34, 0.34, 0.04, wood, -0.34 * (4 - r) / 2 + q * 0.34 + 0.17 - 0.17 * 0, 3.9 + r * 0.42, f + 3.32);
    plaque(k, 0, 2.95, f + 2.5, 2, false, '#5a3422', '#f2d27a');
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
    for (const s of [-1, 1]) { const x = s * 2.6, z = f + 3.2; cyl(g, 0.22, 0.3, 0.12, GOLD, x, 0, z, 10); cyl(g, 0.04, 0.05, 1.3, GOLD, x, 0.12, z, 6); cyl(g, 0.3, 0.12, 0.08, GOLD, x, 1.4, z, 10); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cone(k.c.glow, 0.035, 0.12, '#ffb84a', x + Math.cos(a) * 0.24, 1.48, z + Math.sin(a) * 0.24, 4); } }
    void w;
  },
  // A pendopo porch: a stepped joglo roof on four carved posts, gilded brackets.
  indonesia(k, w, f) {
    const g = k.c.g, post = POST.indonesia!;
    steps(k, 5.4, f + 3, 3, 0.15, 0.4, '#8a8478');
    for (const x of [-2, 2]) for (const z of [0.8, 2.8]) { box(g, 0.26, 3.2, 0.26, post, x, 0.45, f + z); box(g, 0.5, 0.2, 0.5, GOLD, x, 3.4, f + z); }
    cone(g, 3.9, 1.1, k.roof, 0, 3.65, f + 1.8, 4, Math.PI / 4);
    box(g, 2.2, 0.8, 2.2, k.roof, 0, 4.5, f + 1.8);
    cone(g, 1.8, 1.8, k.roof, 0, 5.3, f + 1.8, 4, Math.PI / 4);
    plaque(k, 0, 2.9, f + 2.96, 2.2, false, '#5a3a22', GOLD);
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
    for (const s of [-1, 1]) lamp(k, s * 2, 2.6, f + 3.1, 'paper');
    void w;
  },
  // An A-frame vestibule of glass in a timber frame, snow on its ridge, candle lanterns.
  aurora(k, w, f) {
    const g = k.c.g, timber = '#6a4a30';
    for (const z of [0.2, 1.4, 2.6]) for (const s of [-1, 1]) g.add(new THREE.BoxGeometry(0.16, 4.6, 0.16), timber, M(s * 1.1, 2.1, f + z, 0, 1, 1, 1, 0, s * 0.5));
    for (const s of [-1, 1]) k.c.glow.add(new THREE.PlaneGeometry(2.6, 4.2), '#bfe0ff', M(s * 1.05, 2.0, f + 1.4, s * Math.PI / 2, 1, 1, 1, 0, s * 0.5));
    k.c.glow.add(new THREE.CircleGeometry(2.1, 3), '#cfe8ff', M(0, 1.5, f + 2.64, 0, 1, 1, 1, 0, Math.PI / 2));
    box(g, 0.5, 0.3, 2.8, '#f4f8ff', 0, 4.2, f + 1.4);
    plaque(k, 0, 4.5, f + 2.7, 1.6, false, timber, '#ffd27a');
    for (const s of [-1, 1]) lamp(k, s * 2, 0.6, f + 2.8, 'iron');
    void w;
  },
  // A portal of light: concentric arches of crystal and glow, a crystal hanging in the doorway.
  skyisles(k, w, f) {
    const g = k.c.g;
    steps(k, 5, f + 1.2, 3, 0.15, 0.4, '#f4f0ff');
    for (let i = 0; i < 3; i++) {
      g.add(new THREE.TorusGeometry(1.8 + i * 0.45, 0.12, 6, 24, Math.PI), i % 2 ? '#b8a4ff' : '#f4f0ff', M(0, 2.8, f + 0.3 + i * 0.3));
      for (const s of [-1, 1]) cyl(g, 0.12, 0.12, 2.35, i % 2 ? '#b8a4ff' : '#f4f0ff', s * (1.8 + i * 0.45), 0.45, f + 0.3 + i * 0.3, 8);
    }
    k.c.glow.add(new THREE.TorusGeometry(2.1, 0.04, 4, 24, Math.PI), '#fff0c8', M(0, 2.8, f + 0.46));
    lamp(k, 0, 4.4, f + 0.9, 'crystal');
    plaque(k, 0, 5.3, f + 1.05, 2.4, false, '#f4f0ff', '#8a6ad8');
    doorway(k.c, k.st, 0, f + 0.02, k.trim);
    void w;
  },
};

/** Draw fn in both builders' frames. */
function at3(k: K, x: number, y: number, z: number, fn: () => void): void {
  k.c.g.frame(x, y, z, 0, 1, () => k.c.glow.frame(x, y, z, 0, 1, fn));
}

/** The land's institutional entrance on the front face (z = f) of a block `w` wide. */
export function entrance(k: K, w: number, f: number): void {
  PORCH[k.c.s.id](k, w, f);
}

/** How deep each entrance stands forward of the front (for keeping stages within their radius). */
export const PORCH_DEPTH = 3.6;

// ─────────────────────────── the grounds ───────────────────────────

type Fence = 'railings' | 'picket' | 'skigard' | 'swiss' | 'snow' | 'tsuiji' | 'kkotdam' | 'redwall' | 'mud' | 'coral' | 'whitewash' | 'mudbrick' | 'jali' | 'sandstone' | 'laterite' | 'brick' | 'crystal';
const FENCE: Record<RegionId, Fence> = {
  london: 'railings', newyork: 'railings', renaissance: 'railings', vintage: 'picket', meadow: 'picket', switzerland: 'swiss',
  norway: 'skigard', aurora: 'snow', japan: 'tsuiji', korea: 'kkotdam', china: 'redwall', desert: 'mud', middleeast: 'coral',
  islamic: 'whitewash', egypt: 'mudbrick', indianorth: 'jali', mughal: 'sandstone', indiasouth: 'laterite', indonesia: 'brick', skyisles: 'crystal',
};
const LAMP: Record<Tradition, 'iron' | 'paper' | 'brass' | 'crystal'> = { classic: 'iron', nordic: 'iron', timber: 'paper', masonry: 'brass', sky: 'crystal' };

/** One straight run of the boundary, `len` long along local x, in the land's manner. */
function fenceRun(k: K, f: Fence, len: number): void {
  const g = k.c.g, n = (step: number) => Math.max(1, Math.floor(len / step));
  const along = (step: number, fn: (x: number, i: number) => void) => { const m = n(step); for (let i = 0; i <= m; i++) fn(-len / 2 + (len / m) * i, i); };
  switch (f) {
    case 'railings': // A stone kerb, iron bars with gilt spear tips, stone piers every ten metres.
      box(g, len, 0.45, 0.5, STONE, 0, 0, 0);
      box(g, len, 0.06, 0.06, IRON, 0, 0.75, 0); box(g, len, 0.06, 0.06, IRON, 0, 1.7, 0);
      along(0.22, (x) => { box(g, 0.04, 1.5, 0.04, IRON, x, 0.45, 0); cone(g, 0.04, 0.14, GOLD, x, 1.95, 0, 4); });
      along(10, (x) => { box(g, 0.7, 2.3, 0.7, STONE, x, 0, 0); sphere(g, 0.26, STONE, x, 2.55, 0, 8); });
      break;
    case 'picket': // White pickets with pointed tops on two rails; climbing roses in the Meadow.
      box(g, len, 0.08, 0.06, WHITE, 0, 0.35, -0.05); box(g, len, 0.08, 0.06, WHITE, 0, 0.85, -0.05);
      along(0.18, (x) => { box(g, 0.1, 1.05, 0.03, WHITE, x, 0, 0); g.add(new THREE.ConeGeometry(0.07, 0.12, 4).rotateY(Math.PI / 4), WHITE, M(x, 1.1, 0)); });
      if (k.c.s.id === 'meadow') along(1.1, (x, i) => sphere(g, 0.12, ['#ff8fb8', '#ffffff', '#ff5a8a'][i % 3], x, 0.95 + (i % 2) * 0.12, 0.08, 6));
      break;
    case 'skigard': // The Norwegian roundpole fence: slanted poles in pairs of uprights, bound with withies.
      along(1.2, (x) => { for (const s of [-1, 1]) box(g, 0.08, 1.5, 0.08, '#7a5a3a', x, 0, s * 0.1); });
      along(0.4, (x) => g.add(new THREE.CylinderGeometry(0.04, 0.04, 1.7, 5), '#9a7a52', M(x, 0.75, 0, 0, 1, 1, 1, 0, 0.7)));
      break;
    case 'swiss': // A dry-stone wall with a timber rail on posts.
      box(g, len, 0.8, 0.6, '#a8a498', 0, 0, 0);
      along(0.7, (x, i) => box(g, 0.6, 0.18, 0.62, i % 2 ? '#b8b4a8' : '#9a968a', x, 0.2 + (i % 3) * 0.2, 0));
      along(2.5, (x) => box(g, 0.14, 1.5, 0.14, '#6b4a2a', x, 0, 0));
      box(g, len, 0.12, 0.1, '#6b4a2a', 0, 1.35, 0);
      break;
    case 'snow': // A bank of snow, lantern posts along it.
      along(1.6, (x, i) => sphere(g, 0.8 + (i % 3) * 0.12, '#f4f8ff', x, 0.1, 0, 8, 0.6));
      along(8, (x) => { box(g, 0.12, 1.8, 0.12, '#6a4a30', x, 0, 0); lamp(k, x, 1.8, 0, 'iron'); });
      break;
    case 'tsuiji': // A plastered earthen wall, white with a dark base, capped with dark tiles.
      box(g, len, 0.5, 0.7, '#6a6258', 0, 0, 0); box(g, len, 1.7, 0.6, '#f2ede2', 0, 0.5, 0);
      for (const y of [1.0, 1.3, 1.6]) box(g, len, 0.05, 0.62, '#e2dccf', 0, y, 0);
      gable(g, len, 1.1, 0.45, k.roof, 0, 2.2, 0);
      break;
    case 'kkotdam': // A stone-and-tile flower wall: patterns in tile set in the mortar, a tiled cap.
      box(g, len, 1.9, 0.6, '#c8b8a0', 0, 0, 0);
      along(1.6, (x, i) => { box(g, 0.5, 0.5, 0.63, i % 2 ? '#8a4a3a' : '#b8a488', x, 0.8, 0); box(g, 0.2, 0.2, 0.66, '#f4efe4', x, 0.95, 0); });
      gable(g, len, 1.0, 0.4, k.roof, 0, 1.9, 0);
      break;
    case 'redwall': // A red wall capped with glazed yellow tiles.
      box(g, len, 0.4, 0.8, '#9a948a', 0, 0, 0); box(g, len, 2.0, 0.7, '#a8322a', 0, 0.4, 0);
      gable(g, len, 1.2, 0.45, '#e8b84a', 0, 2.4, 0);
      break;
    case 'mud': // A mud wall with rounded crenellations and a white band.
      box(g, len, 1.8, 0.7, shade(k.wall, -0.06), 0, 0, 0);
      box(g, len, 0.12, 0.72, WHITE, 0, 1.3, 0);
      along(0.9, (x) => { box(g, 0.45, 0.4, 0.6, shade(k.wall, -0.06), x, 1.8, 0); sphere(g, 0.23, shade(k.wall, -0.06), x, 2.2, 0, 6); });
      break;
    case 'coral': // Coral-stone wall with stepped triangular merlons.
      box(g, len, 1.9, 0.6, '#e2d6bc', 0, 0, 0);
      along(1.0, (x) => g.add(new THREE.ConeGeometry(0.35, 0.6, 3), '#e2d6bc', M(x, 2.2, 0)));
      break;
    case 'whitewash': // A whitewashed wall capped with green glazed tiles, a zellige band.
      box(g, len, 2.0, 0.6, '#f7f3ea', 0, 0, 0);
      along(0.4, (x, i) => box(g, 0.36, 0.3, 0.62, i % 2 ? k.st.frieze[0] : k.st.frieze[1], x, 0.2, 0));
      gable(g, len, 0.9, 0.35, '#2f8a5a', 0, 2.0, 0);
      break;
    case 'mudbrick': // Mudbrick in wavy courses, a cavetto cap.
      along(0.5, (x, i) => box(g, 0.5, 1.8, 0.6, i % 2 ? shade(k.wall, -0.05) : shade(k.wall, -0.12), x, Math.sin(i * 0.5) * 0.08, 0));
      box(g, len, 0.3, 0.8, shade(k.trim, 0.1), 0, 1.85, 0);
      break;
    case 'jali': // Pink sandstone: pillars and pierced jali screens between them.
      box(g, len, 0.4, 0.6, shade(k.wall, -0.05), 0, 0, 0);
      along(2, (x) => { box(g, 0.35, 1.7, 0.35, shade(k.wall, -0.05), x, 0.4, 0); sphere(g, 0.2, shade(k.wall, -0.05), x, 2.2, 0, 6); });
      along(0.25, (x, i) => box(g, 0.05, 1.1, 0.08, WHITE, x, 0.55 + (i % 2) * 0.05, 0));
      box(g, len, 0.12, 0.5, WHITE, 0, 1.75, 0);
      break;
    case 'sandstone': // Red sandstone with a white marble coping and blind arches.
      box(g, len, 2.0, 0.7, '#b5552e', 0, 0, 0);
      along(2.4, (x) => archPanel(g, 1.4, 1.4, '#9a4526', x, 0.3, 0.36, 0, 0.03, true));
      box(g, len, 0.18, 0.8, WHITE, 0, 2.0, 0);
      break;
    case 'laterite': // Rust-red laterite blocks under a little tiled roof.
      along(0.6, (x, i) => box(g, 0.58, 0.4, 0.5, i % 2 ? '#a8503a' : '#9a4632', x, 0, 0));
      box(g, len, 1.2, 0.5, '#a8503a', 0, 0.4, 0);
      gable(g, len, 0.9, 0.4, '#a8503a', 0, 1.6, 0);
      break;
    case 'brick': // Red brick with little capped piers every five metres.
      box(g, len, 1.8, 0.5, '#a8584a', 0, 0, 0);
      along(5, (x) => { box(g, 0.8, 2.3, 0.8, '#8a8478', x, 0, 0); cone(g, 0.5, 0.7, '#8a8478', x, 2.3, 0, 4, Math.PI / 4); });
      break;
    case 'crystal': // Crystal posts with a rope of light between them.
      along(5, (x) => { cyl(g, 0.08, 0.1, 1.2, '#f4f0ff', x, 0, 0, 6); lamp(k, x, 1.2, 0, 'crystal'); });
      box(k.c.glow, len, 0.04, 0.04, '#fff0c8', 0, 1.0, 0);
      break;
  }
}

/** The gate piers at the front opening, `half` apart from the middle, in the land's manner. */
function gatePiers(k: K, f: Fence, gap: number): void {
  const g = k.c.g;
  for (const s of [-1, 1]) {
    const x = s * gap;
    switch (f) {
      case 'railings': box(g, 1.1, 3.2, 1.1, STONE, x, 0, 0); box(g, 1.3, 0.3, 1.3, STONE, x, 3.2, 0); sphere(g, 0.4, STONE, x, 3.9, 0, 10); lamp(k, x, 4.4, 0, 'iron');
        // The gate's leaf, swung open inward against the lawn.
        for (let i = 0; i < 8; i++) { box(g, 0.04, 2.2, 0.04, IRON, x - s * 0.75, 0.2, -0.7 - i * 0.25); cone(g, 0.04, 0.14, GOLD, x - s * 0.75, 2.4, -0.7 - i * 0.25, 4); }
        for (const y of [0.5, 2.2]) box(g, 0.05, 0.06, 1.9, IRON, x - s * 0.75, y, -1.6);
        break;
      case 'picket': case 'skigard': box(g, 0.3, 2.4, 0.3, WHITE, x, 0, 0); cone(g, 0.25, 0.4, WHITE, x, 2.4, 0, 4, Math.PI / 4); break;
      case 'snow': box(g, 0.3, 2.6, 0.3, '#6a4a30', x, 0, 0); lamp(k, x, 2.6, 0, 'iron'); break;
      case 'tsuiji': case 'kkotdam': case 'redwall': box(g, 0.5, 3, 0.5, POST[k.c.s.id] ?? DARK, x, 0, 0); break;
      case 'mud': case 'coral': case 'whitewash': case 'mudbrick': box(g, 1.2, 3.4, 1, shade(k.wall, -0.06), x, 0, 0); dome(g, 0.55, shade(k.wall, -0.06), x, 3.4, 0, 8); lamp(k, x, 2.4, 0.7, 'brass'); break;
      case 'jali': case 'sandstone': case 'laterite':
        box(g, 1.2, 3, 1.2, f === 'laterite' ? '#a8503a' : f === 'jali' ? shade(k.wall, -0.05) : '#b5552e', x, 0, 0);
        for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.05, 0.05, 0.8, WHITE, x + dx * 0.4, 3, dz * 0.4, 5);
        box(g, 1.2, 0.1, 1.2, WHITE, x, 3.8, 0); dome(g, 0.45, WHITE, x, 3.9, 0, 8); break;
      case 'brick': // Candi bentar: a split gate, each half a stepped tower cut sheer on the inner face.
        for (let i = 0; i < 6; i++) box(g, 2 - i * 0.28, 0.9, 1.6 - i * 0.2, i % 2 ? '#a8584a' : '#8a8478', x + s * (1 - i * 0.14), i * 0.9, 0);
        break;
      default: cyl(g, 0.12, 0.14, 2.6, '#f4f0ff', x, 0, 0, 8); lamp(k, x, 2.6, 0, 'crystal');
    }
  }
  // An East Asian roofed gate: a little roof on beams over the opening.
  if (f === 'tsuiji' || f === 'kkotdam' || f === 'redwall') {
    box(g, gap * 2 + 0.8, 0.3, 0.4, POST[k.c.s.id] ?? DARK, 0, 3, 0);
    sweptRoof(g, gap * 2 + 2, 2, 1, f === 'redwall' ? '#e8b84a' : k.roof, 0, 3.3, 0, 0, 0.5);
  }
  if (f === 'mud' || f === 'coral' || f === 'whitewash' || f === 'mudbrick') box(g, gap * 2 + 1.2, 0.9, 1, shade(k.wall, -0.06), 0, 3.4, 0);
}

/**
 * The grounds of an institution, in world metres around its site's centre: the boundary in the
 * land's manner with a gate at the front (+z), a paved way from the gate, lawns, lamps and flags.
 * Returns colliders along the boundary (local x/z, height above the ground).
 */
export function grounds(k: K, half: number): Array<{ x: number; z: number; r: number; h: number }> {
  const f = FENCE[k.c.s.id], gap = 3.6, g = k.c.g;
  const runs: Array<[number, number, number, number]> = [
    [0, -half, 2 * half, 0], [-half, 0, 2 * half, Math.PI / 2], [half, 0, 2 * half, Math.PI / 2],
    [-(half + gap) / 2, half, half - gap, 0], [(half + gap) / 2, half, half - gap, 0],
  ];
  for (const [x, z, len, ry] of runs) at3r(k, x, z, ry, () => fenceRun(k, f, len));
  at3r(k, 0, half, 0, () => gatePiers(k, f, gap));
  // The way in: a paved path from the gate, lawns either side, lamps along it, two flags.
  const [a, b] = k.st.frieze;
  box(g, 6, 0.2, 14, TRADITION[k.c.s.id] === 'timber' ? '#b8b0a0' : STONE, 0, 0, half - 7);
  for (let i = 0; i < 7; i++) box(g, 6.02, 0.03, 0.08, STONE_D, 0, 0.2, half - 1 - i * 2);
  for (const s of [-1, 1]) {
    box(g, 6, 0.18, 12, '#6aa84f', s * 6.2, 0, half - 7);
    for (const z of [half - 3, half - 10]) { cyl(g, 0.08, 0.1, 3.2, IRON, s * 3.5, 0, z, 6); lamp(k, s * 3.5, 3.2, z, LAMP[TRADITION[k.c.s.id]]); }
    const fx = s * 8, fz = half - 4;
    cyl(g, 0.08, 0.1, 11, '#e8e8ea', fx, 0, fz, 6);
    sphere(g, 0.16, GOLD, fx, 11.1, fz, 6);
    box(g, 2.4, 0.7, 0.04, a, fx + s * 1.2, 9.6, fz);
    box(g, 2.4, 0.7, 0.04, b, fx + s * 1.2, 8.9, fz);
  }
  // The institution's name on the gate pier.
  plaque(k, gap, 1.5, half + 0.68, 1.0);
  // Colliders along the boundary, leaving the gate open.
  if (f === 'crystal') return [];
  const out: Array<{ x: number; z: number; r: number; h: number }> = [];
  for (let t = -half; t <= half; t += 2) {
    out.push({ x: t, z: -half, r: 0.8, h: 2.4 }, { x: -half, z: t, r: 0.8, h: 2.4 }, { x: half, z: t, r: 0.8, h: 2.4 });
    if (Math.abs(t) > gap + 0.8) out.push({ x: t, z: half, r: 0.8, h: 2.4 });
  }
  return out;
}

/** Draw fn in both builders' frames at (x, 0, z) turned by ry. */
function at3r(k: K, x: number, z: number, ry: number, fn: () => void): void {
  k.c.g.frame(x, 0, z, ry, 1, () => k.c.glow.frame(x, 0, z, ry, 1, fn));
}
