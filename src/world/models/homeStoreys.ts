import * as THREE from 'three';
import type { Ctx, Footprint } from '../architecture';
import { LAND_STYLE, landRoof, win } from '../buildings';
import { TRADITION } from '../instituteFronts';
import { M, box, cyl, dome, sphere } from '../kit';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §3): add `floors` storeys on top
 * of a home already built by `buildHouse` (whose footprint and top height are `base`), in the
 * land's style, with windows that glow at night and the roof raised to the new top. While a floor
 * is being built (`scaffold`), show scaffolding, ladders and stacked materials round the new
 * storey. Return the new footprint.
 *
 * Each storey in the land's own manner: its walls, its windows, a string course, and a balcony
 * over the door in the land's tradition — an iron balcony in the European towns, a timber gallery
 * in the East Asian, Kerala and Balinese lands, a jharokha in India, a mashrabiya in the Arab
 * lands, a timber balcony in the north, a rail of light in the sky — and the land's roof on top.
 * Building: the next storey's walls half up inside real scaffolding (standards, ledgers, plank
 * decks, braces, a ladder), a pulley with its bucket, bricks and timber stacked below.
 */
const STOREY = 3.2;

function balcony(c: Ctx, y: number, z: number): void {
  const g = c.g, id = c.s.id, tr = TRADITION[id], trim = c.s.trims[0];
  switch (tr) {
    case 'classic':
      box(g, 2.4, 0.15, 0.9, '#d8cfbd', 0, y, z + 0.45);
      for (let i = 0; i < 9; i++) box(g, 0.03, 0.9, 0.03, '#1f1f24', -1.1 + i * 0.275, y + 0.15, z + 0.88);
      box(g, 2.4, 0.05, 0.06, '#1f1f24', 0, y + 1.05, z + 0.88);
      for (let i = 0; i < 3; i++) box(g, 0.14, 0.3, 0.7, '#d8cfbd', -0.9 + i * 0.9, y - 0.3, z + 0.35); // brackets
      break;
    case 'timber': {
      const post = id === 'korea' || id === 'china' ? '#9a2f2a' : '#4a3426';
      box(g, 3.4, 0.15, 1, post, 0, y, z + 0.5);
      for (let i = 0; i < 8; i++) box(g, 0.05, 0.8, 0.05, post, -1.6 + i * 0.46, y + 0.15, z + 0.98);
      box(g, 3.4, 0.08, 0.08, post, 0, y + 0.95, z + 0.98);
      for (let i = 0; i < 16; i++) box(g, 0.02, 0.5, 0.02, post, -1.6 + i * 0.21, y + 0.3, z + 0.97);
      break;
    }
    case 'masonry':
      if (id === 'indianorth' || id === 'mughal') {
        // A jharokha: a projecting balcony window on brackets, a curved eave and a little dome.
        box(g, 1.8, 0.2, 0.9, trim, 0, y, z + 0.45);
        for (const s of [-1, 1]) g.add(new THREE.ConeGeometry(0.2, 0.7, 4), trim, M(s * 0.6, y - 0.35, z + 0.4, 0, 1, 1, 1, Math.PI, 0));
        box(g, 1.6, 1.1, 0.06, trim, 0, y + 0.2, z + 0.9);
        box(c.glow, 1.1, 0.7, 0.02, c.s.glow, 0, y + 0.4, z + 0.94);
        c.g.add(new THREE.CylinderGeometry(1.1, 1.1, 0.1, 8, 1, false, 0, Math.PI).rotateY(-Math.PI / 2), '#fbf7ee', M(0, y + 1.4, z + 0.4));
        dome(g, 0.5, trim, 0, y + 1.5, z + 0.45, 8);
      } else {
        // A mashrabiya: a boxed oriel of turned-wood lattice with its little roof.
        box(g, 1.8, 1.6, 0.8, '#6b4a2a', 0, y - 0.1, z + 0.4);
        for (let r = 0; r < 4; r++) for (let q = 0; q < 5; q++) sphere(g, 0.05, '#a8784a', -0.6 + q * 0.3, y + 0.2 + r * 0.3, z + 0.82, 4);
        box(g, 2, 0.12, 1, '#5a3a22', 0, y + 1.5, z + 0.45);
      }
      break;
    case 'nordic':
      box(g, 2.6, 0.12, 0.9, '#8a6444', 0, y, z + 0.45);
      for (let i = 0; i < 7; i++) box(g, 0.08, 0.9, 0.04, id === 'aurora' ? '#6a4a30' : '#fbf7ee', -1.2 + i * 0.4, y + 0.12, z + 0.88);
      box(g, 2.6, 0.08, 0.08, id === 'aurora' ? '#6a4a30' : '#fbf7ee', 0, y + 1, z + 0.88);
      break;
    case 'sky':
      box(g, 2.4, 0.1, 0.9, '#f4f0ff', 0, y, z + 0.45);
      box(c.glow, 2.4, 0.04, 0.04, '#fff0c8', 0, y + 0.95, z + 0.88);
      break;
  }
}

/** Scaffolding round a storey going up at y, w × d: standards, ledgers, plank decks, braces, a ladder, a pulley. */
function scaffolding(c: Ctx, w: number, d: number, y: number): void {
  const g = c.g, pole = '#8a6444', plank = '#b08a5a';
  const xs = [-w / 2 - 0.6, 0, w / 2 + 0.6], zs = [-d / 2 - 0.6, d / 2 + 0.6];
  for (const x of xs) for (const z of zs) cyl(g, 0.05, 0.05, y + STOREY + 1, pole, x, 0, z, 4);
  for (const x of [-w / 2 - 0.6, w / 2 + 0.6]) cyl(g, 0.05, 0.05, y + STOREY + 1, pole, x, 0, 0, 4);
  for (let ly = 1.6; ly < y + STOREY + 1; ly += 1.6) for (const z of zs) box(g, w + 1.3, 0.06, 0.06, pole, 0, ly, z);
  for (const z of zs) {
    box(g, w + 1.3, 0.06, 0.9, plank, 0, y - 0.05, z - Math.sign(z) * 0.1);
    box(g, w + 1.3, 0.06, 0.9, plank, 0, y + STOREY * 0.5, z - Math.sign(z) * 0.1);
    g.add(new THREE.CylinderGeometry(0.03, 0.03, Math.hypot(w / 2 + 0.6, y), 3), pole, M(-(w / 2 + 0.6) / 2, y / 2, z, 0, 1, 1, 1, 0, Math.atan2(w / 2 + 0.6, y)));
  }
  // A ladder up the front, a pulley beam with its rope and bucket.
  for (const s of [-1, 1]) cyl(g, 0.03, 0.03, y + 1, '#a8703f', w / 2 - 0.3 + s * 0.22, 0, d / 2 + 1.1, 4);
  for (let r = 0.3; r < y + 1; r += 0.35) box(g, 0.44, 0.03, 0.03, '#a8703f', w / 2 - 0.3, r, d / 2 + 1.1);
  box(g, 0.08, 0.08, 1.6, pole, -w / 2 + 0.6, y + STOREY + 0.9, d / 2 + 0.2);
  cyl(g, 0.12, 0.12, 0.06, '#5a5a60', -w / 2 + 0.6, y + STOREY + 0.8, d / 2 + 0.9, 8);
  cyl(g, 0.01, 0.01, 2.4, '#d8c8a0', -w / 2 + 0.6, y + STOREY - 1.6, d / 2 + 0.9, 3);
  cyl(g, 0.18, 0.14, 0.3, '#6a6a70', -w / 2 + 0.6, y + STOREY - 1.9, d / 2 + 0.9, 8);
  // Materials stacked below: bricks on a pallet, timber, a bag of lime.
  for (let i = 0; i < 12; i++) box(g, 0.4, 0.2, 0.2, '#b0553a', w / 2 + 1.6 + (i % 3) * 0.42, Math.floor(i / 3) * 0.2 + 0.1, d / 2 - 0.4 + (i % 2) * 0.21);
  box(g, 1.4, 0.1, 1, '#8a6444', w / 2 + 2, 0, d / 2 - 0.3);
  for (let i = 0; i < 5; i++) box(g, 2.6, 0.12, 0.2, plank, -w / 2 - 2, i * 0.12, d / 2 - 0.5 + (i % 2) * 0.1);
  sphere(g, 0.35, '#e8e0d0', -w / 2 - 2, 0.3, d / 2 + 0.6, 6, 0.7);
}

export function addStoreys(c: Ctx, base: Footprint, floors: number, scaffold: boolean): Footprint {
  const st = LAND_STYLE[c.s.id], w = base.r * 1.25, d = base.r * 1.1;
  const wall = c.s.walls[0], trim = c.s.trims[0], roof = c.s.roofs[0];
  const y0 = base.h - 1.2;
  for (let f = 0; f < floors; f++) {
    const y = y0 + f * STOREY;
    box(c.g, w, STOREY, d, wall, 0, y, 0);
    box(c.g, w + 0.25, 0.2, d + 0.25, trim, 0, y, 0); // the string course at the floor line
    const nf = Math.max(2, Math.floor(w / 2.4)), ns = Math.max(1, Math.floor(d / 2.6));
    for (let i = 0; i < nf; i++) {
      const x = -w / 2 + (w / nf) * (i + 0.5);
      if (Math.abs(x) > 1.4) win(c, st, x, y + 1.0, d / 2 + 0.02);
      win(c, st, x, y + 1.0, -d / 2 - 0.02, Math.PI);
    }
    for (let i = 0; i < ns; i++) { const z = -d / 2 + (d / ns) * (i + 0.5); for (const s of [-1, 1]) win(c, st, s * (w / 2 + 0.02), y + 1.0, z, s * Math.PI / 2); }
    // A door onto the balcony over the front door, and the balcony itself.
    box(c.glow, 1, 1.9, 0.06, c.s.glow, 0, y + 0.3, d / 2 + 0.02);
    balcony(c, y + 0.2, d / 2);
  }
  let top = y0 + floors * STOREY;
  if (scaffold) {
    // The next storey going up: walls half built, the new work a paler colour.
    box(c.g, w, STOREY * 0.5, d, '#' + new THREE.Color(wall).lerp(new THREE.Color('#e8dcc6'), 0.4).getHexString(), 0, top, 0);
    scaffolding(c, w, d, top);
    top += STOREY * 0.5;
  }
  // The land's roof raised to the new top.
  let roofH = 0;
  if (floors > 0 && !scaffold) {
    const round = st.roof === 'cone' || st.roof === 'pyramid' || st.roof === 'dome' || st.roof === 'onion';
    roofH = landRoof(c, round && Math.max(w, d) / Math.min(w, d) > 1.3 ? { ...st, roof: 'hip' } : st, w, d, top, roof);
  }
  return { r: base.r, h: top + roofH + (scaffold ? 1 : 0) };
}
