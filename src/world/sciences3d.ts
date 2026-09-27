import * as THREE from 'three';
import type { Ctx, Footprint } from './architecture';
import { waterBasin, waterChannel, waterPool } from './flowWater';
import { STOREY, at, block, canopy, courtGarden, herbLeaf, kit, shelves, type K } from './institutes3d';
import { floatingIsland } from './islands';
import { M, archPanel, box, cone, cyl, dome, gable, hip, onion, sphere, sweptRoof } from './kit';

/**
 * Each land's own science, built as a real institution in four stages (institutions/catalogue.ts):
 * from a stall to an academy, in the land's architecture and with the tools of its craft — a
 * wand-maker's kiln and a castle school, a tea house and a pagoda gate, a climbing kiln and a
 * seowon, an apothecary of herb drawers, a slipway with a half-built hull and a lighthouse, a
 * watchmakers' atelier under a turret clock, a Victorian engine works, a glass research campus,
 * a Renaissance bottega and loggia, a broadcasting mast, al-Qarawiyyin with its observatory, a
 * wind-tower house of navigators, a nilometer and shadufs, an oasis academy under the stars,
 * the Jantar Mantar's giant instruments, a Kerala nalukettu, a Mughal atelier behind jali and a
 * charbagh academy, Balinese bales on terraces behind a split gate, a polar observatory on
 * stilts, and a college of light on floating isles.
 *
 * Local frame: base centre at the origin, the entrance facing +z and kept clear; within the
 * stage's radius (5, 8, 12, 16 m). Lit things in the glow builder. No faces, no idols.
 */

type Stage = 0 | 1 | 2 | 3;
const WOOD = '#8a5a36', DARK = '#4a3426', STONE = '#d8cfbd', WHITE = '#fbf7ee', GOLD = '#d4af37';

// ─────────────────────────── the parts ───────────────────────────

/** A square tower w wide and h tall at (x, z), crowned by `top`. Returns its top height. */
function tower(k: K, x: number, z: number, w: number, h: number, top: 'cone' | 'pyramid' | 'dome' | 'spire' | 'flat' | 'onion' | 'swept', wall = k.wall2, roof = k.roof): number {
  const { g, glow } = k.c;
  box(g, w, h, w, wall, x, 0, z);
  box(g, w + 0.3, 0.3, w + 0.3, k.trim, x, h, z);
  for (let s = 1; s * STOREY < h - 1; s++) for (const [dx, dz, ry] of [[0, w / 2 + 0.02, 0], [0, -w / 2 - 0.02, Math.PI], [w / 2 + 0.02, 0, Math.PI / 2], [-w / 2 - 0.02, 0, -Math.PI / 2]] as const) {
    archPanel(glow, Math.min(0.9, w * 0.3), 1.3, k.c.s.glow, x + dx, s * STOREY - 1.8, z + dz, ry, 0.06, k.st.arch === 'pointed');
  }
  const y = h + 0.3;
  switch (top) {
    case 'cone': cone(g, w * 0.72, w * 1.1, roof, x, y, z, 10); return y + w * 1.1;
    case 'pyramid': cone(g, w * 0.76, w * 0.8, roof, x, y, z, 4, Math.PI / 4); return y + w * 0.8;
    case 'dome': dome(g, w * 0.48, roof, x, y, z, 14); return y + w * 0.48;
    case 'onion': onion(g, w * 0.34, roof, x, y, z); return y + w * 0.8;
    case 'spire': cone(g, w * 0.4, w * 2.4, roof, x, y, z, 8); sphere(glow, 0.2, k.c.s.glow, x, y + w * 2.4 + 0.1, z, 6); return y + w * 2.4;
    case 'swept': sweptRoof(g, w + 1.6, w + 1.6, 1.4, roof, x, y, z, 0, 0.45); return y + 1.4;
    default: for (let i = -1; i <= 1; i++) for (const s of [-1, 1]) box(g, 0.4, 0.5, 0.3, wall, x + i * w * 0.33, y, z + s * w * 0.45); return y + 0.5;
  }
}

/** A clock face (white disc, two hands) at height y on the plane z, facing +z (or turned by ry). */
function clockFace(k: K, x: number, y: number, z: number, r: number, ry = 0): void {
  at(k, x, y, z, ry, () => {
    k.c.glow.add(new THREE.CylinderGeometry(r, r, 0.08, 24).rotateX(Math.PI / 2), '#fff4d0', M(0, 0, 0));
    k.c.g.add(new THREE.TorusGeometry(r, r * 0.08, 5, 24), GOLD, M(0, 0, 0.02));
    box(k.c.g, r * 0.08, r * 0.7, 0.04, '#2a2a2a', 0, 0, 0.07);
    k.c.g.add(new THREE.BoxGeometry(r * 0.08, r * 0.5, 0.04).translate(0, r * 0.25, 0), '#2a2a2a', M(0, 0, 0.08, 0, 1, 1, 1, 0, -1.9));
  });
}
function chimney(k: K, x: number, z: number, y0: number, h: number, smoke = true): void {
  box(k.c.g, 1, h, 1, '#8a4a3a', x, y0, z);
  box(k.c.g, 1.3, 0.3, 1.3, '#6a3a2a', x, y0 + h, z);
  if (smoke) for (let i = 0; i < 3; i++) sphere(k.c.g, 0.4 + i * 0.15, '#e8e8ea', x + i * 0.3, y0 + h + 0.8 + i * 0.7, z, 6);
}
function mast(k: K, x: number, z: number, y0: number, h: number): void {
  const { g, glow } = k.c;
  for (let i = 0; i < 6; i++) {
    const f = i / 6, w = 1.4 * (1 - f) + 0.2;
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      g.add(new THREE.CylinderGeometry(0.04, 0.04, h / 6, 4).translate(0, h / 12, 0), '#c8323a', M(x + dx * w / 2, y0 + (h * i) / 6, z + dz * w / 2, 0, 1, 1, 1, dz * 0.1, -dx * 0.1));
    }
    box(g, w, 0.05, w, '#e8e8e8', x, y0 + (h * i) / 6, z);
  }
  sphere(glow, 0.25, '#ff3a3a', x, y0 + h + 0.2, z, 6);
}
function dish(k: K, x: number, y: number, z: number, r: number): void {
  cyl(k.c.g, 0.15, 0.25, 1.4, '#9a9aa4', x, y, z, 8);
  k.c.g.add(new THREE.SphereGeometry(r, 16, 6, 0, Math.PI * 2, Math.PI * 0.62, Math.PI * 0.38), '#e8e8f0', M(x, y + 1.4 + r * 0.8, z, 0, 1, 1, 1, -0.6, 0));
  cyl(k.c.g, 0.04, 0.04, r * 0.8, '#6a6a74', x, y + 1.4 + r * 0.25, z + r * 0.35, 4);
}
/** A colonnade of n columns along x from x0 to x1 at z, h tall, with capitals and a beam. */
function colonnade(k: K, x0: number, x1: number, z: number, h: number, n: number, col = WHITE, lotus = false): void {
  const { g } = k.c;
  for (let i = 0; i < n; i++) {
    const x = x0 + ((x1 - x0) * i) / Math.max(1, n - 1);
    cyl(g, 0.28, 0.32, h, col, x, 0.3, z, 10);
    if (lotus) cone(g, 0.55, 0.9, '#6aa84f', x, 0.3 + h - 0.9, z, 8, Math.PI); // papyrus-bud capital
    else box(g, 0.8, 0.25, 0.8, col, x, 0.3 + h, z);
  }
  box(g, Math.abs(x1 - x0) + 1, 0.6, 1, k.trim, (x0 + x1) / 2, 0.55 + h, z);
}
/** A stall with a counter, a canopy, and the goods of its trade. */
function stall(k: K, goods: 'jars' | 'books' | 'pots' | 'maps' | 'herbs' | 'papyrus' | 'spices' | 'batik' | 'lamps' | 'radios' | 'potions' | 'watches' | 'gears' | 'easels', cloth = k.st.frieze[0]): Footprint {
  const { g, glow } = k.c;
  canopy(k, 3.6, 2.6, 2.4, cloth);
  box(g, 3.2, 0.95, 0.8, WOOD, 0, 0, 0.4);
  const top = 0.95;
  const shelf = () => { box(g, 3.2, 1.8, 0.4, DARK, 0, 0, -1); for (const y of [0.6, 1.2]) box(g, 3.2, 0.05, 0.45, WOOD, 0, y, -0.95); };
  const row = (n: number, y: number, z: number, f: (x: number, y: number, z: number, i: number) => void) => { for (let i = 0; i < n; i++) f(-1.3 + (2.6 * i) / Math.max(1, n - 1), y, z, i); };
  switch (goods) {
    case 'jars': case 'herbs': case 'spices':
      shelf();
      row(6, top, 0.4, (x, y, z, i) => { cyl(g, 0.16, 0.14, 0.3, goods === 'spices' ? ['#e8a030', '#c8401a', '#f2d14e', '#8a4a2a'][i % 4] : '#c89a5a', x, y, z, 8); if (goods !== 'jars') cone(g, 0.15, 0.12, ['#e8a030', '#c8401a', '#3a8a3a', '#f2d14e'][i % 4], x, y + 0.3, z, 8); });
      for (const y of [0.65, 1.25]) row(7, y, -0.95, (x, yy, z, i) => cyl(g, 0.12, 0.12, 0.3, ['#9a6a3a', '#3a7a4a', '#b8b0a0'][i % 3], x, yy, z, 6));
      break;
    case 'pots':
      row(5, top, 0.4, (x, y, z, i) => { sphere(g, 0.22, i % 2 ? '#7fb8a0' : '#a8d0b8', x, y + 0.22, z, 10, 1.2); cyl(g, 0.1, 0.13, 0.12, '#7fb8a0', x, y + 0.48, z, 8); });
      break;
    case 'books': shelves(k, 0, -1, 3, 1.8); row(4, top, 0.4, (x, y, z, i) => box(g, 0.45, 0.12, 0.32, ['#8a2a3a', '#2f4a8a', '#3a7a4a', '#c8a040'][i], x, y, z)); break;
    case 'maps': case 'papyrus':
      row(3, top, 0.4, (x, y, z) => box(g, 0.8, 0.02, 0.55, '#ecdcb0', x, y, z));
      if (goods === 'maps') { cyl(g, 0.02, 0.02, 0.5, GOLD, 1.2, top, 0.4, 4); k.c.g.add(new THREE.TorusGeometry(0.28, 0.03, 4, 16), GOLD, M(1.2, top + 0.8, 0.4)); } // an astrolabe
      else for (let i = 0; i < 5; i++) cone(g, 0.12, 1.6, '#7aa85a', -1.5 + i * 0.12, 0, -1.1, 4); // papyrus reeds
      break;
    case 'batik': for (let i = 0; i < 4; i++) box(g, 0.7, 1.4, 0.03, ['#3a2a6a', '#8a3a1a', '#1a4a6a', '#6a1a3a'][i], -1.2 + i * 0.8, 0.8, -1.2); break;
    case 'lamps': row(5, top, 0.4, (x, y, z, i) => sphere(glow, 0.18, ['#fff0b0', '#b8e0ff', '#ffc8f0', '#c8ffd8'][i % 4], x, y + 0.25, z, 8, 1.3)); break;
    case 'radios': shelf(); for (const y of [0.65, 1.25]) row(4, y, -0.95, (x, yy, z, i) => { box(g, 0.5, 0.4, 0.3, i % 2 ? '#8a5a36' : '#c8a060', x, yy, z); cyl(glow, 0.08, 0.08, 0.02, '#ffb84a', x + 0.1, yy + 0.2, z + 0.16, 8); }); cyl(g, 0.03, 0.03, 3, '#9a9aa4', 1.7, 2.4, -1, 4); break;
    case 'potions': shelf(); for (const y of [0.65, 1.25]) row(8, y, -0.95, (x, yy, z, i) => sphere(glow, 0.1, ['#b86bff', '#3ac8ff', '#7affb0', '#ff8ac8'][i % 4], x, yy + 0.12, z, 6, 1.4)); break;
    case 'watches': case 'gears': box(glow, 2.6, 0.6, 0.05, '#fff4d0', 0, 1.1, 0.8); row(5, top, 0.4, (x, y, z) => k.c.g.add(new THREE.TorusGeometry(0.12, 0.04, 5, 12).rotateX(Math.PI / 2), GOLD, M(x, y + 0.05, z))); clockFace(k, 0, 2.1, 1.35, 0.35); break;
    case 'easels': for (let i = 0; i < 2; i++) { const x = -0.9 + i * 1.8; for (const d of [-0.3, 0.3]) cyl(g, 0.03, 0.03, 1.8, WOOD, x + d, 0, 0.9, 4); box(g, 0.8, 1, 0.05, i ? '#e8c8a0' : '#b8d8e8', x, 0.9, 0.95); } break;
  }
  return { r: 2.8, h: 3.6 };
}
/** A long open tent on poles (tent schools, the starlore school). */
function longTent(k: K, w: number, d: number, h: number, col: string, stripe: string): void {
  const { g } = k.c;
  for (let i = 0; i <= Math.round(w / 2.5); i++) for (const s of [-1, 1]) cyl(g, 0.06, 0.07, h * 0.75, '#6b4a2a', -w / 2 + (w * i) / Math.round(w / 2.5), 0, s * d / 2, 5);
  for (let i = 0; i <= Math.round(w / 2.5); i++) cyl(g, 0.07, 0.08, h, '#6b4a2a', -w / 2 + (w * i) / Math.round(w / 2.5), 0, 0, 5);
  for (const s of [-1, 1]) g.add(new THREE.BoxGeometry(w + 0.4, 0.06, d / 2 * 1.08), col, M(0, h * 0.875, s * d / 4, 0, 1, 1, 1, s * 0.24, 0));
  for (const s of [-1, 1]) box(g, w + 0.4, 0.3, 0.04, stripe, 0, h * 0.72, s * d / 2);
}
function rugs(k: K, x: number, z: number, n: number): void {
  for (let i = 0; i < n; i++) {
    box(k.c.g, 1.6, 0.04, 1.1, ['#8a2a3a', '#2f4a8a', '#c8883a'][i % 3], x + (i % 3) * 1.8 - 1.8, 0.02, z + Math.floor(i / 3) * 1.4);
    box(k.c.g, 0.45, 0.2, 0.45, ['#e8576a', '#f2c14e', '#3a9e8a'][i % 3], x + (i % 3) * 1.8 - 1.8, 0.05, z + Math.floor(i / 3) * 1.4 - 0.4);
  }
}
/** A climbing kiln: a long chamber stepping up a slope, with fire-holes glowing along its side. */
function kiln(k: K, x: number, z: number, len: number, ry: number): void {
  at(k, x, 0, z, ry, () => {
    const n = Math.round(len / 1.6);
    for (let i = 0; i < n; i++) {
      k.c.g.add(new THREE.CylinderGeometry(1.1, 1.1, 1.5, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), '#9a6a4a', M(-len / 2 + i * 1.6 + 0.8, i * 0.35, 0));
      box(k.c.g, 1.5, i * 0.35 + 0.02, 2.2, '#8a5a3a', -len / 2 + i * 1.6 + 0.8, 0, 0);
      sphere(k.c.glow, 0.14, '#ff8a3a', -len / 2 + i * 1.6 + 0.8, i * 0.35 + 0.5, 1.12, 5);
    }
    box(k.c.g, 0.8, 3, 0.8, '#8a5a3a', len / 2 + 0.2, n * 0.35, 0);
  });
}
/** A clinker-built hull on trestles (or on the slipway), `done` 0…1 planked. */
function hull(k: K, x: number, z: number, len: number, ry: number, done: number): void {
  at(k, x, 0, z, ry, () => {
    const { g } = k.c;
    for (const s of [-1, 1]) cyl(g, 0.12, 0.12, 1, DARK, 0, 0, s * len * 0.3, 5);
    g.add(new THREE.BoxGeometry(0.2, 0.3, len), DARK, M(0, 1, 0)); // keel
    const ribs = Math.round(len / 0.7);
    for (let i = 0; i < ribs; i++) {
      const f = i / (ribs - 1), zz = -len / 2 + f * len, w = Math.sin(f * Math.PI) * len * 0.16 + 0.1;
      g.add(new THREE.TorusGeometry(w, 0.05, 4, 10, Math.PI), '#9a6a3a', M(0, 1.1 + w, zz, 0, 1, 1, 1, 0, Math.PI));
    }
    const planks = Math.round(5 * done);
    for (let p = 0; p < planks; p++) for (const s of [-1, 1]) {
      const a = 0.25 + p * 0.28, geo = new THREE.BoxGeometry(0.05, 0.3, len * (0.95 - p * 0.08));
      g.add(geo, p % 2 ? '#b07a4a' : '#9a6a3a', M(s * Math.sin(a) * len * 0.15, 1.1 + len * 0.16 - Math.cos(a) * len * 0.15, 0, 0, 1, 1, 1, 0, s * (Math.PI / 2 - a)));
    }
  });
}
function crane(k: K, x: number, z: number, h: number, ry = 0): void {
  at(k, x, 0, z, ry, () => {
    const { g } = k.c;
    for (let i = 0; i < 4; i++) for (const [dx, dz] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) cyl(g, 0.06, 0.06, h / 4, '#c8a030', dx, (h * i) / 4, dz, 4);
    box(g, 1.2, 0.8, 1.2, '#c8a030', 0, h, 0);
    box(g, 0.3, 0.3, h * 0.8, '#c8a030', 0, h + 0.8, h * 0.25);
    cyl(g, 0.02, 0.02, h * 0.5, '#3a3a3a', 0, h * 0.4, h * 0.6, 3);
  });
}
/** A barjeel: a wind tower, open on four sides at the top. */
function windTower(k: K, x: number, z: number, y0: number, h: number, wall = k.wall): void {
  const { g } = k.c;
  box(g, 2.2, h, 2.2, wall, x, y0, z);
  for (const [dx, dz, ry] of [[0, 1.12, 0], [0, -1.12, Math.PI], [1.12, 0, Math.PI / 2], [-1.12, 0, -Math.PI / 2]] as const) {
    for (let i = -1; i <= 1; i++) box(g, 0.14, h * 0.45, 0.2, DARK, x + (ry === 0 || ry === Math.PI ? i * 0.5 : dx), y0 + h * 0.5, z + (ry === 0 || ry === Math.PI ? dz : i * 0.5), ry);
  }
  box(g, 2.5, 0.25, 2.5, wall, x, y0 + h, z);
}
/** Jantar Mantar instruments: the giant sundial (a stair-like gnomon with a quadrant each side) and a round yantra. */
function samrat(k: K, x: number, z: number, s: number): void {
  at(k, x, 0, z, 0, () => {
    const { g } = k.c;
    const pink = '#e8a08a';
    g.add(new THREE.ExtrudeGeometry(new THREE.Shape([new THREE.Vector2(-3 * s, 0), new THREE.Vector2(3 * s, 0), new THREE.Vector2(3 * s, 4.2 * s)]), { depth: 0.8 * s, bevelEnabled: false }).translate(0, 0, -0.4 * s), pink, M(0, 0, 0, Math.PI / 2));
    for (const sd of [-1, 1]) g.add(new THREE.CylinderGeometry(2.6 * s, 2.6 * s, 0.5 * s, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), WHITE, M(sd * 1.4 * s, 0, 0, 0, 1, 1, 1, 0, 0));
    for (let i = 0; i < 6; i++) box(g, 0.8 * s, 0.1, 0.4 * s, WHITE, 0, i * 0.7 * s + 0.3, -2.4 * s + i * 0.9 * s);
  });
}
function ramYantra(k: K, x: number, z: number, r: number): void {
  const { g } = k.c;
  const geo = new THREE.CylinderGeometry(r, r, 2.4, 24, 1, true);
  g.add(geo.translate(0, 1.2, 0), '#e8a08a', M(x, 0, z));
  cyl(g, 0.3, 0.3, 3, WHITE, x, 0, z, 10);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; box(g, 0.3, 0.8, r * 0.8, WHITE, x + Math.cos(a) * r * 0.5, 0, z + Math.sin(a) * r * 0.5, -a + Math.PI / 2); }
}
/** A Balinese bale: a raised platform, posts, and a steep thatched hip roof. */
function bale(k: K, x: number, z: number, w: number, d: number, ry = 0): void {
  at(k, x, 0, z, ry, () => {
    const { g } = k.c;
    box(g, w, 0.7, d, '#8a7a6a', 0, 0, 0);
    for (let i = 0; i < 3; i++) for (const s of [-1, 1]) cyl(g, 0.1, 0.12, 2.3, '#6a3a22', -w / 2 + 0.3 + ((w - 0.6) * i) / 2, 0.7, s * (d / 2 - 0.3), 6);
    hip(g, w + 1.6, d + 1.6, Math.min(w, d) * 0.7, '#6a5a3a', 0, 3, 0);
    box(g, w + 1.4, 0.18, d + 1.4, '#c8a060', 0, 2.95, 0);
  });
}
/** A candi bentar: a split gate, two halves of a stepped tower with a gap between. */
function splitGate(k: K, x: number, z: number, h: number): void {
  const { g } = k.c;
  for (const s of [-1, 1]) for (let i = 0; i < 6; i++) {
    const w = 2.6 - i * 0.35;
    box(g, w, h / 6, 2.2 - i * 0.25, i % 2 ? '#a8584a' : '#8a7a6a', x + s * (1.2 + w / 2), (h * i) / 6, z);
  }
}
/** A pishtaq: a tall rectangular portal framing a deep arch. */
function pishtaq(k: K, x: number, z: number, w: number, h: number, wall = WHITE, trim = k.trim): void {
  const { g } = k.c;
  box(g, w, h, 2, wall, x, 0, z);
  archPanel(g, w * 0.6, h * 0.7, '#3a2a22', x, 0, z + 1.02, 0, 0.2, true);
  archPanel(g, w * 0.72, h * 0.78, trim, x, 0, z + 1.01, 0, 0.12, true);
  box(g, w * 0.95, 0.3, 0.1, trim, x, h * 0.86, z + 1.02);
  for (const s of [-1, 1]) { cyl(g, 0.3, 0.35, h + 1.5, wall, x + s * w / 2, 0, z + 1, 10); dome(g, 0.45, wall, x + s * w / 2, h + 1.5, z + 1, 8); }
}
function glassTower(k: K, x: number, z: number, w: number, h: number): number {
  const { g, glow } = k.c;
  box(g, w, h, w, '#7aa8c8', x, 0, z);
  for (let y = 3; y < h; y += 3.2) box(g, w + 0.15, 0.25, w + 0.15, '#e8eef4', x, y, z);
  for (let y = 1.5; y < h; y += 3.2) for (const s of [-1, 1]) box(glow, w * 0.9, 1.6, 0.02, '#bfe8ff', x, y, z + s * (w / 2 + 0.01));
  // Sky gardens: green terraces cut in every few floors.
  for (let y = 9; y < h - 3; y += 9.6) { box(g, w + 0.8, 0.4, w + 0.8, '#6aa84f', x, y, z); sphere(g, 0.8, '#4f8c42', x + w / 3, y + 0.9, z + w / 3, 7); }
  return h;
}
function solar(k: K, x: number, y: number, z: number, w: number, d: number): void {
  for (let i = 0; i < Math.floor(w / 1.2); i++) for (let j = 0; j < Math.floor(d / 1.6); j++) {
    k.c.g.add(new THREE.BoxGeometry(1.1, 0.05, 1.5), '#2a3a6a', M(x - w / 2 + 0.6 + i * 1.2, y + 0.4, z - d / 2 + 0.8 + j * 1.6, 0, 1, 1, 1, 0.35, 0));
  }
}
function greenWall(k: K, x: number, y: number, z: number, w: number, h: number): void {
  box(k.c.g, w, h, 0.2, '#4f8c42', x, y, z);
  for (let i = 0; i < Math.floor(w * h / 1.5); i++) sphere(k.c.g, 0.35, i % 3 ? '#5a9c4a' : '#7ab85a', x - w / 2 + ((i * 1.37) % w), y + ((i * 0.83) % h), z + 0.15, 5, 0.6);
}
/** A lighthouse: a white tower with a red band, a lantern room glowing at the top. */
function lighthouse(k: K, x: number, z: number, h: number): void {
  const { g, glow } = k.c;
  cyl(g, 1, 1.5, h, WHITE, x, 0, z, 14);
  cyl(g, 1.05, 1.15, h * 0.18, '#c8323a', x, h * 0.45, z, 14);
  cyl(g, 1.3, 1.3, 0.3, DARK, x, h, z, 14);
  cyl(glow, 0.8, 0.8, 1.4, '#fff2b0', x, h + 0.3, z, 12);
  cone(g, 1.1, 1, '#c8323a', x, h + 1.7, z, 12);
}
/** A nilometer: a square stepped well going down, a measuring column in it. */
function nilometer(k: K, x: number, z: number, s: number): void {
  const { g } = k.c;
  for (let i = 0; i < 5; i++) box(g, s - i * 0.9, 0.5, s - i * 0.9, i % 2 ? '#d8c08a' : '#c8b07a', x, -i * 0.5 + 0.02, z);
  cyl(g, 0.3, 0.3, 3.5, '#e0c48a', x, -2, z, 10);
  for (let i = 0; i < 6; i++) box(g, 0.7, 0.06, 0.06, DARK, x, -1.6 + i * 0.5, z + 0.3);
  waterPool({ g, glow: k.c.glow, water: k.c.water }, x, -2.3, z, s - 4.2, s - 4.2, 0, { kerb: 0.2, speed: 0.05 });
}
function shaduf(k: K, x: number, z: number, ry: number): void {
  at(k, x, 0, z, ry, () => {
    const { g } = k.c;
    for (const s of [-1, 1]) cyl(g, 0.1, 0.12, 2.4, '#8a6a4a', s * 0.35, 0, 0, 5);
    g.add(new THREE.CylinderGeometry(0.06, 0.08, 5, 5), '#9a7a52', M(0, 2.3, 0, 0, 1, 1, 1, 0.9, 0));
    sphere(g, 0.35, '#a88a6a', 0, 0.6, -1.8, 6);
    cyl(g, 0.2, 0.15, 0.35, '#6a4a2a', 0, 1.4, 1.8, 8);
  });
}
function well(k: K, x: number, z: number): void {
  const { g } = k.c;
  cyl(g, 1.2, 1.3, 0.9, '#c8a878', x, 0, z, 14);
  cyl(g, 0.9, 0.9, 0.05, '#2f5a6a', x, 0.75, z, 12);
  for (const s of [-1, 1]) cyl(g, 0.08, 0.08, 2, '#8a6a4a', x + s * 1.1, 0.9, z, 5);
  g.add(new THREE.CylinderGeometry(0.15, 0.15, 2.4, 8).rotateZ(Math.PI / 2), '#8a6a4a', M(x, 2.5, z));
}
/** A chhatri kiosk: a small domed pavilion on four columns. */
function chhatri(k: K, x: number, z: number, s: number, col = WHITE): void {
  const { g } = k.c;
  box(g, 3 * s, 0.5, 3 * s, STONE, x, 0, z);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(g, 0.14 * s, 0.16 * s, 2.4 * s, col, x + dx * 1.2 * s, 0.5, z + dz * 1.2 * s, 8);
  box(g, 3.3 * s, 0.3, 3.3 * s, col, x, 0.5 + 2.4 * s, z);
  dome(g, 1.4 * s, col, x, 0.8 + 2.4 * s, z, 12);
  cyl(g, 0.05, 0.08, 0.6, GOLD, x, 0.8 + 3.8 * s, z, 5);
}
/** Stacked swept roofs, as on a pagoda gate. */
function pagodaGate(k: K, x: number, z: number, w: number): void {
  const { g } = k.c;
  for (const s of [-1, 1]) cyl(g, 0.3, 0.32, 4.2, '#b0322a', x + s * w * 0.35, 0, z, 10);
  box(g, w, 0.5, 2.4, '#b0322a', x, 4.2, z);
  sweptRoof(g, w + 2, 3.6, 1.4, k.roof, x, 4.7, z, 0, 0.5);
  box(g, w * 0.5, 1.2, 1.4, '#b0322a', x, 5.9, z);
  sweptRoof(g, w * 0.7, 2.6, 1.1, k.roof, x, 7.1, z, 0, 0.5);
}
/** An observatory: a round tower with a slit dome. */
function observatory(k: K, x: number, z: number, r: number, h: number, wall = k.wall2): number {
  const { g } = k.c;
  cyl(g, r, r * 1.08, h, wall, x, 0, z, 16);
  cyl(g, r * 1.15, r * 1.15, 0.35, k.trim, x, h, z, 16);
  dome(g, r, '#e8e8f0', x, h + 0.35, z, 16);
  box(g, r * 0.3, 0.2, r * 1.05, '#2a2a30', x + r * 0.2, h + r * 0.75, z + r * 0.15);
  return h + r + 0.35;
}

// ─────────────────────────── the sciences ───────────────────────────

const B: Record<string, (k: K, s: Stage) => Footprint> = {
  magic(k, s) {
    const { g, glow } = k.c;
    if (s === 0) return stall(k, 'potions', '#8a4ad8');
    if (s === 1) { // a crooked timber workshop with a glowing kiln
      const t = block(k, 0, -1, 7, 6, 1, { door: true, wall: '#e8d8b0' });
      for (const x of [-3.4, -1, 1.4, 3.4]) box(g, 0.25, 3.3, 0.2, DARK, x, 0.45, 2.05); // half-timbering
      box(g, 1.6, 2.2, 1.6, '#8a5a3a', -4.4, 0, 2.5); sphere(glow, 0.5, '#ff8a3a', -4.4, 1.2, 3.35, 6);
      cone(g, 1, 3, '#6a3a8a', 2.5, t - 1, -1, 6); // a witch-hat turret roof
      return { r: 5.8, h: t + 2 };
    }
    if (s === 2) { // a fairy-tale hall with a turret, stained glass and floating lanterns
      const t = block(k, 0, -2, 10, 8, 2, { door: true });
      at(k, 5.5, 0, -2, 0, () => { cyl(g, 1.8, 2, 9, k.wall2, 0, 0, 0, 12); cone(g, 2.3, 4.5, '#6a3a8a', 0, 9, 0, 12); });
      for (let i = 0; i < 4; i++) archPanel(glow, 1.2, 2.4, ['#b86bff', '#3ac8ff', '#ffd23a', '#ff5a8a'][i], -3.6 + i * 2.4, 3.8, 2.05, 0, 0.06, true);
      for (let i = 0; i < 6; i++) sphere(glow, 0.22, '#ffe8a0', -4 + i * 1.6, t + 1 + (i % 2) * 0.8, 2.5, 6, 1.3);
      return { r: 10.5, h: Math.max(t, 13.5) };
    }
    // a castle school: towers, a great hall of floating candles, a library tower and an observatory
    const t = block(k, 0, -3, 14, 9, 3, { door: true });
    for (const [x, z] of [[-8, -7], [8, -7], [-8, 3], [8, 3]] as const) at(k, x, 0, z, 0, () => { cyl(g, 2.2, 2.4, 14, k.wall2, 0, 0, 0, 14); cone(g, 2.8, 6, '#3a3a6a', 0, 14, 0, 14); });
    observatory(k, 0, -10.5, 2.4, 12);
    for (let i = 0; i < 16; i++) sphere(glow, 0.12, '#ffe8a0', -5 + (i % 8) * 1.4, 6 + Math.floor(i / 8) * 1.2, 1.9, 5, 1.6);
    return { r: 13.5, h: Math.max(t, 20) };
  },

  tea(k, s) {
    const { g, glow } = k.c;
    if (s === 0) { const f = stall(k, 'pots', '#2a3a5a'); for (let i = 0; i < 4; i++) box(g, 0.8, 1.1, 0.03, '#2a3a5a', -1.2 + i * 0.8, 1.3, 1.31); box(g, 2.4, 0.45, 0.45, WOOD, 0, 0, 2.4); return f; }
    if (s === 1) { // a sukiya tea house on a stone base, stepping stones to the door
      box(g, 6, 0.6, 5, STONE, 0, 0, -1);
      box(g, 5.2, 2.6, 4.2, '#e8dcc0', 0, 0.6, -1);
      for (let i = 0; i < 5; i++) box(g, 0.12, 2.6, 0.14, DARK, -2.5 + i * 1.25, 0.6, 1.12);
      sweptRoof(g, 7.6, 6.6, 1.8, k.roof, 0, 3.2, -1, 0, 0.3);
      for (let i = 0; i < 5; i++) cyl(g, 0.4, 0.45, 0.12, '#9a968c', (i % 2) * 0.6 - 0.3, 0, 2 + i * 1.1, 8);
      return { r: 5.4, h: 5.5 };
    }
    if (s === 2) { // a long timber joinery workshop under a tiled roof, joints on show
      box(g, 16, 0.5, 7, STONE, 0, 0, -1);
      for (let i = 0; i < 7; i++) for (const z of [-4, 2]) { cyl(g, 0.22, 0.22, 3.6, '#8a5a36', -7.2 + i * 2.4, 0.5, z, 8); box(g, 0.6, 0.35, 0.6, '#6a3a22', -7.2 + i * 2.4, 4, z); }
      box(g, 16, 0.4, 0.4, '#6a3a22', 0, 4.2, -4); box(g, 16, 0.4, 0.4, '#6a3a22', 0, 4.2, 2);
      box(g, 15.4, 3.4, 0.2, '#e8dcc0', 0, 0.5, -4);
      sweptRoof(g, 18, 9.4, 2.2, k.roof, 0, 4.6, -1, 0, 0.35);
      for (let i = 0; i < 5; i++) box(g, 2.2, 0.3, 0.3, '#b07a4a', -5 + i * 2.5, 0.6 + (i % 2) * 0.4, 0); // timbers being joined
      return { r: 10, h: 7.3 };
    }
    // a courtyard academy of halls with a pagoda-roofed gate
    for (const [x, z, w, d] of [[0, -10, 18, 5], [-10, -1, 5, 13], [10, -1, 5, 13]] as const) at(k, x, 0, z, 0, () => { box(g, w, 3.4, d, '#e8dcc0', 0, 0.6, 0); box(g, w + 0.4, 0.6, d + 0.4, STONE, 0, 0, 0); sweptRoof(g, w + 2, d + 2, 2, k.roof, 0, 4, 0, 0, 0.35); });
    pagodaGate(k, 0, 8, 6);
    courtGarden(k, 0, -1, 12, 9);
    sphere(glow, 0.3, '#ffb84a', 0, 3.6, 8, 6, 1.3);
    return { r: 14.5, h: 9 };
  },

  celadon(k, s) {
    const { g } = k.c;
    if (s === 0) { box(g, 3.4, 0.5, 2, STONE, 0, 0, 0); return stall(k, 'pots', '#5a8a7a'); }
    if (s === 1) { const t = block(k, -2.5, -2, 5, 5, 1, { door: true }); kiln(k, 3.2, 1, 7, Math.PI / 2 - 0.2); return { r: 6.8, h: t }; }
    if (s === 2) { // a hanok printing hall, type cases, presses and hanji racks
      const t = block(k, 0, -2, 12, 7, 1, { door: true });
      for (let i = 0; i < 4; i++) { for (const d of [-0.5, 0.5]) cyl(g, 0.05, 0.05, 1.8, WOOD, -7.5 + d, 0, 3.5 + i * 1.2, 4); box(g, 0.05, 1.2, 1, '#f4eedc', -7.5, 0.5, 3.5 + i * 1.2); }
      for (let i = 0; i < 3; i++) box(g, 1.2, 1.2, 0.8, DARK, 3 + i * 1.6, 0, 3.4);
      return { r: 10, h: t };
    }
    // a seowon: hanok halls round a court, a lecture hall raised on a stone terrace
    box(g, 14, 1.2, 7, STONE, 0, 0, -8);
    at(k, 0, 1.2, -8, 0, () => block(k, 0, 0, 12, 5.5, 1, { door: true }));
    block(k, -9.5, 1, 5, 10, 1); block(k, 9.5, 1, 5, 10, 1);
    at(k, 0, 0, 9, 0, () => { for (const s2 of [-1, 1]) cyl(g, 0.25, 0.28, 3.6, '#b0322a', s2 * 2, 0, 0, 10); sweptRoof(g, 6, 2.6, 1.2, k.roof, 0, 3.6, 0, 0, 0.45); });
    return { r: 14, h: 8 };
  },

  tcm(k, s) {
    const { g, glow } = k.c;
    if (s === 0) { const f = stall(k, 'herbs', '#b0322a'); for (const x of [-1.8, 1.8]) cyl(g, 0.12, 0.12, 2.4, '#b0322a', x, 0, 1.3, 8); return f; }
    if (s === 1) { // a shophouse: a wall of herb drawers, a gallery above
      const t = block(k, 0, -1, 7, 6, 2, { door: true });
      box(g, 7.4, 0.2, 1.4, '#b0322a', 0, 3.6, 2.7); for (const x of [-3.4, 3.4]) cyl(g, 0.1, 0.1, 3.6, '#b0322a', x, 0, 3.3, 6);
      for (let i = 0; i < 4; i++) sphere(glow, 0.3, '#ff3a2a', -2.4 + i * 1.6, 3.3, 3.3, 8, 1.3);
      return { r: 6.2, h: t };
    }
    if (s === 2) { const t = block(k, 0, -5, 12, 5, 1, { door: true }); block(k, -7.5, 1, 4, 8, 1); block(k, 7.5, 1, 4, 8, 1); for (let i = 0; i < 6; i++) box(g, 1.6, 0.25, 1, '#5a8a3a', -4 + (i % 3) * 4, 0, 1 + Math.floor(i / 3) * 3); herbLeaf(k, 0, 3.2, -2.4, 0.5); return { r: 10.5, h: t }; }
    box(g, 20, 1.5, 12, STONE, 0, 0, -5);
    const t = at2(k, 0, 1.5, -5, () => block(k, 0, 0, 14, 7, 2, { door: true }));
    block(k, -11, 3, 5, 9, 1); block(k, 11, 3, 5, 9, 1);
    for (let i = 0; i < 8; i++) box(g, 1.6, 0.25, 1.1, '#5a8a3a', -6 + (i % 4) * 4, 0, 5 + Math.floor(i / 4) * 2.4);
    herbLeaf(k, 0, 1.5 + 5, -1.3, 0.8);
    return { r: 15, h: t + 1.5 };
  },

  shipwright(k, s) {
    const { g } = k.c;
    if (s === 0) { box(g, 7, 4, 4.4, '#8a3a2a', 0, 0, -1); gable(g, 7.6, 5, 2, '#3a3a3a', 0, 4, -1); box(g, 3.2, 3, 0.1, '#2a2a2a', 0, 0, 1.25); hull(k, 0, 2.6, 4, Math.PI / 2, 1); return { r: 4.6, h: 6 }; }
    if (s === 1) { box(g, 3, 0.3, 11, '#7a6a5a', 3, 0, 0); hull(k, 3, 0, 7, 0, 0.5); const t = block(k, -4, -2, 5, 6, 2, { wall: '#c8a060' }); return { r: 7, h: t }; }
    if (s === 2) { box(g, 18, 8, 10, '#8a3a2a', 0, 0, -3); gable(g, 18.6, 10.6, 3.6, '#3a3a3a', 0, 8, -3); box(g, 7, 6.5, 0.1, '#2a2a2a', 0, 0, 2.05); hull(k, 0, 5.5, 7, Math.PI / 2, 0.8); crane(k, 9, 6, 9); return { r: 11.5, h: 12 }; }
    // a Bryggen-style row of gabled timber fronts, a model-ship hall and a lighthouse
    for (let i = 0; i < 4; i++) at(k, -9 + i * 5, 0, -6, 0, () => { box(g, 4.6, 8, 8, ['#8a3a2a', '#c8a060', '#f2e6cc', '#b0582a'][i], 0, 0, 0); gable(g, 8.6, 5, 3, '#3a3a3a', 0, 8, 0, Math.PI / 2); for (const y of [2, 5]) box(k.c.glow, 1, 1.2, 0.05, k.c.s.glow, 0, y, 4.02); });
    lighthouse(k, 11, 7, 14);
    hull(k, -4, 6, 6, 0, 1);
    return { r: 15, h: 17 };
  },

  watchmaking(k, s) {
    const { g } = k.c;
    if (s === 0) { const f = stall(k, 'watches', '#3a5a8a'); gable(g, 4, 3, 1.4, k.roof, 0, 2.5, 0); return f; }
    if (s === 1) { const t = block(k, 0, -1, 9, 6, 1, { door: true }); for (let i = 0; i < 3; i++) box(k.c.glow, 2, 1.8, 0.05, '#fff4d0', -3 + i * 3, 1.2, 2.06); at(k, 0, t - 1, -1, 0, () => { box(g, 1.8, 2.4, 1.8, k.wall2, 0, 0, 0); cone(g, 1.5, 2, k.roof, 0, 2.4, 0, 4, Math.PI / 4); }); clockFace(k, 0, t + 0.2, -0.05, 0.6); return { r: 6.4, h: t + 4 }; }
    if (s === 2) { block(k, -2, -2, 16, 6, 2, { door: true }); tower(k, 8, 1, 3, 12, 'pyramid'); clockFace(k, 8, 10, 2.55, 1); box(g, 8, 0.1, 5, '#cfc4a8', -2, 0.02, 4.5); return { r: 11.5, h: 15 }; }
    const t = block(k, 0, -6, 20, 7, 3, { door: true });
    clockFace(k, 0, t - 3, -2.45, 1.8);
    observatory(k, -8, 4, 2.8, 8);
    colonnade(k, -4, 4, -2, 6, 5);
    return { r: 15, h: t };
  },

  engineering(k, s) {
    const { g } = k.c;
    const brick = '#9a4a3a';
    if (s === 0) { const t = block(k, 0, 0, 6, 5, 1, { door: true, wall: brick }); box(k.c.glow, 3.4, 1.4, 0.05, '#fff2c8', 0, 1, 2.56); for (let i = 0; i < 4; i++) k.c.g.add(new THREE.TorusGeometry(0.3, 0.08, 5, 12), GOLD, M(-1.3 + i * 0.9, 1.7, 2.62)); box(g, 1.6, 0.8, 0.1, '#2a2a3a', 3.2, 3, 3); return { r: 4.4, h: t }; }
    if (s === 1) { const t = block(k, 0, -1, 10, 8, 1, { door: true, wall: brick, roof: false }); for (let i = 0; i < 4; i++) g.add(new THREE.BoxGeometry(2.2, 0.1, 8.4), '#bfe8ff', M(-3.75 + i * 2.5, t + 0.4, -1, 0, 1, 1, 1, 0, 0.5)); chimney(k, 4, -4, t, 5); return { r: 7.4, h: t + 6 }; }
    if (s === 2) { at(k, 0, 0, -2, 0, () => { box(g, 18, 9, 10, brick, 0, 0, 0); for (let i = 0; i < 5; i++) archPanel(k.c.glow, 2, 4, '#fff2c8', -7 + i * 3.5, 2, 5.02, 0, 0.06); gable(g, 18.6, 10.6, 3, '#4a4a52', 0, 9, 0); }); chimney(k, -7, -6, 0, 18); crane(k, 9, 6, 8, Math.PI); return { r: 11.5, h: 18 }; }
    // a columned Victorian institution with a lecture-theatre dome
    const t = block(k, 0, -4, 22, 9, 3, { wall: '#e8dcc6' });
    colonnade(k, -6, 6, 1.4, 8, 6);
    gable(g, 14, 3, 2.4, '#e8dcc6', 0, 8.9, 1.4, 0);
    at(k, 0, t - 0.5, -4, 0, () => { cyl(g, 4, 4, 2, '#e8dcc6', 0, 0, 0, 20); dome(g, 3.8, '#6a8a7a', 0, 2, 0, 18); });
    return { r: 15, h: t + 6 };
  },

  tech(k, s) {
    const { g, glow } = k.c;
    if (s === 0) { box(g, 7, 3.6, 6, '#b8b0a0', 0, 0, -1); box(g, 4, 2.8, 0.1, '#7a7a80', 0, 0.2, 2.05); box(glow, 3, 0.4, 0.08, '#ff3aa8', 0, 3.1, 2.1); box(g, 7.4, 0.3, 6.4, '#8a8a90', 0, 3.6, -1); return { r: 4.8, h: 4 }; }
    if (s === 1) { const t = block(k, 0, -1, 10, 7, 2, { door: true, roof: false }); solar(k, 0, t, -1, 9, 6); greenWall(k, -5.1, 0.5, 2.6, 3, 5); return { r: 7.2, h: t + 1 }; }
    if (s === 2) { const h = glassTower(k, 0, -2, 9, 38); box(glow, 9.4, 2, 9.4, '#6ad8ff', 0, h, -2); return { r: 7.5, h: h + 2 }; }
    glassTower(k, -7, -6, 7, 24); glassTower(k, 7, -6, 7, 18);
    box(g, 7, 1.2, 2.4, '#e8eef4', 0, 12, -6); box(glow, 6.8, 0.8, 2.5, '#bfe8ff', 0, 12.2, -6); // the sky bridge
    k.c.g.add(new THREE.SphereGeometry(5, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#9ad0f0', M(0, 0, 6)); // the solar dome
    solar(k, 0, 0, 12, 6, 2.4);
    return { r: 13.5, h: 26 };
  },

  anatomy(k, s) {
    const { g } = k.c;
    if (s === 0) return stall(k, 'easels', '#8a2a3a');
    if (s === 1) { const t = block(k, 0, -3, 12, 6, 2, { door: true }); courtGarden(k, 0, 3, 8, 4); return { r: 7.8, h: t }; }
    if (s === 2) { const t = block(k, 0, -3, 16, 8, 3, { door: true }); for (let i = 0; i < 5; i++) archPanel(g, 2.4, 3, k.trim, -6 + i * 3, 0.45, 1.05, 0, 0.12); colonnade(k, -7, 7, 2.4, 4.2, 6); return { r: 10, h: t }; }
    // an arcaded courtyard university with a dome and a tower
    for (const [x, z, w, d] of [[0, -10, 22, 5], [-10.5, 0, 5, 14], [10.5, 0, 5, 14]] as const) block(k, x, z, w, d, 2);
    colonnade(k, -7, 7, -6.5, 4, 7);
    at(k, 0, 0, -10, 0, () => { cyl(g, 4, 4, 3, k.wall2, 0, 8, 0, 18); dome(g, 3.8, '#c85a3a', 0, 11, 0, 18); });
    tower(k, 11, -10.5, 3, 18, 'pyramid');
    courtGarden(k, 0, 2, 12, 8);
    return { r: 15.5, h: 21 };
  },

  radio(k, s) {
    const { g, glow } = k.c;
    if (s === 0) return stall(k, 'radios', '#c8883a');
    if (s === 1) { const t = block(k, 0, -1, 7, 6, 2, { door: true }); mast(k, 2, -2, t, 8); return { r: 5.8, h: t + 8 }; }
    if (s === 2) { const t = block(k, 0, -2, 14, 8, 3, { door: true, roof: false }); box(g, 4, 3, 8.4, k.wall2, 0, t, -2); for (let i = 0; i < 3; i++) box(glow, 0.2, t - 1, 0.1, '#ffd23a', -3 + i * 3, 0.5, 2.06); mast(k, 5, -4, t, 14); return { r: 10, h: t + 14 }; }
    block(k, -6, -6, 10, 8, 2); block(k, 7, -5, 8, 10, 2);
    dish(k, -7, 0, 6, 4); mast(k, 9, 7, 0, 20);
    return { r: 14, h: 20 };
  },

  islamicsciences(k, s) {
    const { g } = k.c;
    if (s === 0) { const f = stall(k, 'books', '#2a6a8a'); archPanel(g, 3.6, 3, k.trim, 0, 0, 1.35, 0, 0.1, true); return f; }
    if (s === 1) { for (const [x, z, w, d] of [[0, -4, 10, 3], [-4, 1, 2.5, 7], [4, 1, 2.5, 7]] as const) block(k, x, z, w, d, 1); waterBasin(k.c, 0, 0, 1, 1.2, { kerb: 0.5, jetHeight: 0.8 }); shelves(k, 0, -2.2, 6, 2.4); return { r: 7.4, h: 5.5 }; }
    if (s === 2) { for (const [x, z, w, d] of [[0, -8, 16, 4], [-8, 0, 4, 12], [8, 0, 4, 12]] as const) block(k, x, z, w, d, 2); for (let i = 0; i < 5; i++) archPanel(g, 2, 2.8, k.trim, -5 + i * 2.5, 0.45, -5.9, 0, 0.12, true); pishtaq(k, 0, 6, 6, 8); courtGarden(k, 0, -1, 10, 7); return { r: 11.8, h: 10 }; }
    // al-Qarawiyyin: a great court of arcades, a green-tiled prayer hall roof, an observatory tower
    for (const [x, z, w, d] of [[0, -11, 24, 5], [-11, 0, 5, 16], [11, 0, 5, 16]] as const) block(k, x, z, w, d, 2);
    for (let i = 0; i < 7; i++) archPanel(g, 2.2, 3, k.trim, -7.5 + i * 2.5, 0.45, -8.4, 0, 0.12, true);
    pishtaq(k, 0, 7.5, 7, 10);
    at(k, -11, 0, -11, 0, () => { box(g, 3, 16, 3, k.wall2, 0, 0, 0); observatory(k, 0, 0, 1.9, 16.5, k.wall2); });
    courtGarden(k, 0, -2, 12, 9);
    return { r: 15.5, h: 20 };
  },

  navigation(k, s) {
    const { g } = k.c;
    if (s === 0) return stall(k, 'maps', '#c8a060');
    if (s === 1) { const t = block(k, 0, -1, 8, 7, 1, { door: true, roof: false }); windTower(k, -2.5, -3, t, 4); for (let i = 0; i < 2; i++) { cyl(g, 0.04, 0.04, 1.2, GOLD, 2 + i, t, 1, 4); k.c.g.add(new THREE.TorusGeometry(0.4, 0.04, 4, 16), GOLD, M(2 + i, t + 1.5, 1)); } return { r: 6.4, h: t + 4 }; }
    if (s === 2) { waterPool(k.c, 0, 0, -2, 8, 6, 0, { kerb: 0.8, speed: 0.05 }); windTower(k, -6, -6, 0, 8); windTower(k, 6, -6, 0, 8); waterChannel(k.c, 0, 0, 5, 6, 1.2, 0, { speed: 0.7 }); return { r: 10.5, h: 10 }; }
    for (const [x, z, w, d] of [[0, -10, 20, 5], [-10, 0, 5, 14], [10, 0, 5, 14]] as const) block(k, x, z, w, d, 2);
    observatory(k, -10, -10, 2.2, 11);
    windTower(k, 10, -10, 7, 5);
    courtGarden(k, 0, -1, 12, 9);
    return { r: 15.5, h: 17 };
  },

  irrigation(k, s) {
    const { g } = k.c;
    if (s === 0) return stall(k, 'papyrus', '#c8a060');
    if (s === 1) { const t = block(k, 0, -1, 9, 6, 1, { door: true, wall: '#e8d0a0' }); for (let i = 0; i < 6; i++) box(g, 1.2, 1.4, 0.05, ['#3a6a9a', '#c8401a', '#e8b030'][i % 3], -3.8 + i * 1.5, 2.4, 2.07); return { r: 6.4, h: t }; }
    if (s === 2) { nilometer(k, 0, -2, 9); shaduf(k, 6, 3, 0.5); shaduf(k, -6, 3, -0.5); waterChannel(k.c, 0, 0, 5.5, 5, 1, Math.PI / 2, { speed: 0.6 }); return { r: 9, h: 5 }; }
    // a House of Life: a temple-like hall of papyrus columns, a pylon gate, gardens
    at(k, 0, 0, 8, 0, () => { for (const s2 of [-1, 1]) g.add(new THREE.CylinderGeometry(2.6, 3.6, 10, 4).rotateY(Math.PI / 4), '#e0c48a', M(s2 * 4.5, 5, 0, 0, 1, 1, 0.5)); });
    colonnade(k, -8, 8, 0, 7, 7, '#e0c48a', true);
    colonnade(k, -8, 8, -4, 7, 7, '#e0c48a', true);
    box(g, 20, 8, 5, '#e0c48a', 0, 0, -10);
    for (let i = 0; i < 6; i++) box(g, 2.4, 5, 0.05, ['#3a6a9a', '#c8401a', '#e8b030'][i % 3], -7.5 + i * 3, 1.5, -7.47);
    return { r: 15, h: 10 };
  },

  starlore(k, s) {
    const { g, glow } = k.c;
    if (s === 0) { canopy(k, 4, 3.4, 2.2, '#c8a060'); rugs(k, 1.8, -0.8, 3); for (let i = 0; i < 8; i++) sphere(glow, 0.05, '#fff4c0', -1.6 + (i * 0.47) % 3, 2.2 + (i % 3) * 0.1, -1 + (i * 0.7) % 2, 4); return { r: 3.2, h: 3 }; }
    if (s === 1) { longTent(k, 11, 5, 3.4, '#3a2a22', '#c8401a'); rugs(k, 1.8, -1.4, 6); box(g, 2.4, 1.3, 0.1, '#2a3a2e', -4, 0.8, -2); return { r: 6.8, h: 4 }; }
    if (s === 2) { at(k, 0, 0, -1, 0, () => { box(g, 6, 3.4, 6, '#d8b890', 0, 0, 0); dome(g, 2.6, '#d8b890', 0, 3.4, 0, 12); archPanel(g, 1.6, 2.4, DARK, 0, 0, 3.02, 0, 0.1); }); well(k, 5, 3); for (let i = 0; i < 3; i++) box(g, 2.6, 0.5, 0.8, '#b8a078', -5, 0, 1 + i * 1.3); return { r: 9, h: 7 }; }
    waterPool(k.c, 0, 0, 0, 9, 7, 0, { kerb: 0.3, speed: 0.04 });
    for (const [x, z] of [[-10, -6], [10, -6], [-10, 7], [10, 7]] as const) at(k, x, 0, z, 0, () => { box(g, 5, 3.4, 4, '#d8b890', 0, 0, 0); box(g, 5.3, 0.4, 4.3, '#c8a878', 0, 3.4, 0); });
    longTent(k, 10, 4, 3, '#3a2a22', '#c8401a');
    at(k, 0, 0, -11, 0, () => { box(g, 3.4, 13, 3.4, '#d8b890', 0, 0, 0); box(g, 4, 0.5, 4, '#c8a878', 0, 13, 0); for (let i = 0; i < 12; i++) sphere(glow, 0.06, '#fff4c0', -1.5 + (i % 4), 13.6, -1.5 + Math.floor(i / 4), 4); });
    return { r: 15, h: 14 };
  },

  ayurveda(k, s) {
    const { g } = k.c;
    if (s === 0) { for (let i = 0; i < 4; i++) if (i !== 3) box(g, i % 2 ? 7 : 0.4, 1.4, i % 2 ? 0.4 : 7, '#e8917a', i === 0 ? -3.5 : i === 2 ? 3.5 : 0, 0, i === 1 ? -3.5 : 0); for (const x of [-2.4, 2.4]) box(g, 2.3, 1.4, 0.4, '#e8917a', x, 0, 3.5); chhatri(k, 0, -1.5, 0.8); well(k, 2, 1.8); for (let i = 0; i < 4; i++) box(g, 1.4, 0.25, 1, '#5a8a3a', -2.2 + (i % 2) * 4.4, 0, 0.5 + Math.floor(i / 2) * -2.6); return { r: 4.9, h: 4.5 }; }
    if (s === 1) { const t = block(k, 0, -1, 8, 6, 2, { door: true }); box(g, 2.4, 1.6, 1, '#d27466', 0, 4.4, 2.5); dome(g, 1, WHITE, 0, 6, 2.5, 10, 0.6); herbLeaf(k, 3, 3, 2.1, 0.45); return { r: 6.2, h: t }; }
    if (s === 2) { for (const [x, z, w, d] of [[0, -6, 14, 4], [-6, 1, 3.5, 10], [6, 1, 3.5, 10]] as const) block(k, x, z, w, d, 2); for (let i = 0; i < 4; i++) { box(g, 1.8, 1.2, 0.8, '#d27466', -4.5 + i * 3, 4, -3.6); dome(g, 0.6, WHITE, -4.5 + i * 3, 5.2, -3.6, 8, 0.6); } courtGarden(k, 0, 0, 8, 6); return { r: 10.5, h: 9 }; }
    const t = block(k, 0, -10, 18, 5, 2, { door: true });
    samrat(k, -6, 2, 1.5); ramYantra(k, 7, 5, 3); ramYantra(k, 7, -3, 2.2);
    return { r: 15, h: Math.max(t, 7) };
  },

  siddha(k, s) {
    const { g } = k.c;
    if (s === 0) return stall(k, 'spices', '#7a5a2a');
    if (s === 1) { const t = block(k, 0, -2, 9, 6, 2, { door: true }); for (let i = 0; i < 6; i++) box(g, 1.2, 0.08, 1.2, ['#c8401a', '#e8a030', '#6a4a2a'][i % 3], -3.5 + (i % 3) * 3.5, 0.03, 3 + Math.floor(i / 3) * 1.6); return { r: 6.8, h: t }; }
    if (s === 2) { for (const [x, z, w, d] of [[0, -6, 14, 4], [0, 6, 14, 4], [-6, 0, 3.5, 8], [6, 0, 3.5, 8]] as const) block(k, x, z, w, d, 1); waterPool(k.c, 0, 0, 0, 4, 4, 0, { kerb: 0.3, speed: 0.05 }); herbLeaf(k, 0, 3, 8.1, 0.5); return { r: 10.5, h: 7 }; }
    // tiled halls round a temple tank
    at(k, 0, -0.2, 0, 0, () => { for (let i = 0; i < 4; i++) box(g, 12 - i * 1.6, 0.4, 10 - i * 1.6, i % 2 ? '#c8a878' : '#b8987a', 0, -i * 0.4, 0); });
    waterPool(k.c, 0, -1.4, 0, 6, 4, 0, { kerb: 0.2, speed: 0.04 });
    for (const [x, z, w, d] of [[0, -10, 20, 5], [-11, 0, 5, 12], [11, 0, 5, 12]] as const) block(k, x, z, w, d, 1);
    return { r: 15, h: 7 };
  },

  gardens(k, s) {
    const { g } = k.c;
    const sand = '#c8744a';
    if (s === 0) { chhatri(k, 0, 0, 1); box(g, 1.4, 0.8, 0.8, WOOD, 0, 0.5, 0); return { r: 2.8, h: 5 }; }
    if (s === 1) { const t = block(k, 0, -1, 9, 7, 1, { door: true, wall: sand }); for (let i = 0; i < 3; i++) for (let a = 0; a < 5; a++) for (let b = 0; b < 4; b++) box(g, 0.05, 0.05, 0.05, WHITE, -3 + i * 3 - 0.5 + a * 0.25, 1.2 + b * 0.35, 2.56); return { r: 6.6, h: t }; }
    if (s === 2) { waterChannel(k.c, 0, 0, 0, 16, 1.6, 0, { jets: 2.5, speed: 0.6 }); waterChannel(k.c, 0, 0, 0, 12, 1.6, Math.PI / 2, { jets: 2.5, speed: 0.6 }); chhatri(k, 6, -6, 1.1, sand); return { r: 9.5, h: 5 }; }
    const t = block(k, 0, -11, 16, 5, 2, { wall: WHITE });
    pishtaq(k, 0, -8.5, 7, 12);
    waterChannel(k.c, 0, 0, 1, 16, 1.4, 0, { jets: 2.6, speed: 0.6 });
    waterChannel(k.c, 0, 0, 1, 16, 1.4, Math.PI / 2, { jets: 2.6, speed: 0.6 });
    for (const [x, z] of [[-5, -3], [5, -3], [-5, 5], [5, 5]] as const) box(g, 6, 0.15, 5, '#6aa84f', x, 0.02, z);
    for (const x of [-11, 11]) onion(g, 1.2, WHITE, x, t - 1.2, -11);
    return { r: 15.5, h: 14 };
  },

  subak(k, s) {
    const { g } = k.c;
    if (s === 0) { bale(k, 0, 0, 3.4, 2.6); for (let i = 0; i < 3; i++) box(g, 0.8, 1.6, 0.03, ['#3a2a6a', '#8a3a1a', '#1a4a6a'][i], -1 + i, 1.2, 1.3); return { r: 3.4, h: 5 }; }
    if (s === 1) { bale(k, 0, -1, 6, 4.5); for (let i = 0; i < 4; i++) cyl(g, 0.5, 0.45, 0.8, i % 2 ? '#1a3a6a' : '#6a2a1a', -3 + i * 2, 0, 3.5, 10); return { r: 6.4, h: 6.5 }; }
    if (s === 2) { for (let i = 0; i < 3; i++) waterPool(k.c, -3 + i * 3, i * 0.3, -2 + i * 0.4, 2.5, 5, 0, { kerb: 0.25, speed: 0.1 }); bale(k, 5, 4, 4.5, 3.5); waterChannel(k.c, 0, 0, 6, 8, 0.8, Math.PI / 2, { speed: 0.7 }); return { r: 9.5, h: 6.5 }; }
    for (let i = 0; i < 3; i++) box(g, 26 - i * 5, 1.2 + i * 1.2, 7, '#8a7a6a', 0, 0, -9 + i * 1.6);
    bale(k, -6, -9, 6, 4); bale(k, 6, -9, 6, 4); bale(k, 0, -3, 7, 4.5);
    splitGate(k, 0, 9, 8);
    return { r: 15.5, h: 10 };
  },

  polar(k, s) {
    const { g, glow } = k.c;
    const log = '#7a5a3c';
    if (s === 0) { box(g, 3, 2.6, 3, log, 0, 0, 0); gable(g, 3.4, 3.6, 1.2, '#e8f0f8', 0, 2.6, 0); cyl(g, 0.05, 0.05, 3, '#9a9aa4', 2.2, 0, 0, 4); cone(g, 0.3, 0.9, '#c8323a', 2.2, 3, 0, 3, Math.PI / 2); for (let i = 0; i < 3; i++) sphere(g, 0.12, '#e8e8f0', 2.2 + Math.cos(i * 2.1) * 0.4, 2.7, Math.sin(i * 2.1) * 0.4, 5); return { r: 3.2, h: 4 }; }
    if (s === 1) { box(g, 7, 3, 5, log, 0, 0, -1); gable(g, 7.4, 5.6, 2, '#e8f0f8', 0, 3, -1); for (let i = 0; i < 8; i++) box(g, 0.1, 1.1, 0.1, log, -5 + i * 1.4, 0, 3.8); box(g, 10, 0.1, 0.1, log, -0.1, 1, 3.8); box(g, 2.4, 0.3, 0.8, '#8a5a36', 5, 0.2, -3); return { r: 6.6, h: 5 }; }
    if (s === 2) { for (const [x, z] of [[-2.5, -2.5], [2.5, -2.5], [-2.5, 2.5], [2.5, 2.5]]) cyl(g, 0.25, 0.25, 4, '#6a6a74', x, 0, z, 8); box(g, 7, 0.4, 7, log, 0, 4, 0); cyl(g, 3.2, 3.2, 3, '#e8f0f8', 0, 4.4, 0, 18); dome(g, 3.2, '#c8d8e8', 0, 7.4, 0, 18); box(g, 1, 0.2, 3.4, '#2a2a30', 0.5, 9.8, 0.5); sphere(glow, 0.3, '#7affd0', 0, 6, 3.2, 6); return { r: 7, h: 10.6 }; }
    for (const x of [-7, 7]) at(k, x, 0, -3, 0, () => { box(g, 8, 4, 14, log, 0, 0, 0); gable(g, 8.4, 14.4, 3, '#bfe8ff', 0, 4, 0, Math.PI / 2); box(glow, 7.4, 2.4, 0.05, '#bfe8ff', 0, 5, 7.21); });
    at(k, 0, 0, -9, 0, () => { box(g, 6, 5, 6, '#e8f0f8', 0, 0, 0); observatory(k, 0, 0, 2.6, 5.2, '#e8f0f8'); });
    return { r: 15, h: 11 };
  },

  lightcraft(k, s) {
    const { g, glow } = k.c;
    const moon = '#f0ecff';
    if (s === 0) return stall(k, 'lamps', '#b8a4ff');
    if (s === 1) { const t = tower(k, 0, -1, 4, 9, 'spire', moon, '#b8a4ff'); for (let i = 0; i < 4; i++) g.add(new THREE.OctahedronGeometry(0.4), ['#9ae8ff', '#ffb8f0', '#fff08a', '#b8ffcc'][i], M(Math.cos(i * 1.57) * 2.4, 7, -1 + Math.sin(i * 1.57) * 2.4)); return { r: 5, h: t }; }
    if (s === 2) {
      at(k, 0, 0, -1, 0, () => { cyl(g, 6, 6.3, 5, moon, 0, 0, 0, 24); dome(g, 5.8, '#e0d8ff', 0, 5, 0, 22); cyl(glow, 0.6, 0.6, 1, '#fff0b0', 0, 10.8, 0, 10); });
      for (let i = 0; i < 7; i++) box(glow, 0.3, 4, 0.1, ['#ff5a5a', '#ff9a3a', '#ffd23a', '#5ad85a', '#3a9aff', '#5a5aff', '#b86bff'][i], -2.7 + i * 0.9, 0.5, 5.35);
      return { r: 8, h: 12 };
    }
    // spires on floating isles, joined by bridges of light
    tower(k, 0, -4, 5, 14, 'spire', moon, '#b8a4ff');
    const isles: Array<[number, number, number]> = [[-9, 5, 10], [9, 5, 12], [0, -12, 16]];
    for (const [x, z, y] of isles) {
      g.frame(x, y, z, 0, 1, () => glow.frame(x, y, z, 0, 1, () => { floatingIsland(g, glow, 3.2, () => k.c.rng.next()); cyl(g, 1, 1.2, 5, moon, 0, 0, 0, 10); cone(g, 1.3, 4, '#b8a4ff', 0, 5, 0, 10); sphere(glow, 0.3, '#fff0b0', 0, 9.2, 0, 6); }));
      const d = new THREE.Vector3(x, y, z).sub(new THREE.Vector3(0, 8, -4)), L = d.length();
      glow.add(new THREE.BoxGeometry(0.5, 0.12, L), '#e0d0ff', new THREE.Matrix4().lookAt(new THREE.Vector3(), d, new THREE.Vector3(0, 1, 0)).setPosition(new THREE.Vector3(0, 8, -4).addScaledVector(d, 0.5)));
    }
    return { r: 13, h: 26 };
  },
};

/** Draw fn at (x, y, z) in both builders and return its value. */
function at2<T>(k: K, x: number, y: number, z: number, fn: () => T): T {
  let out!: T;
  at(k, x, y, z, 0, () => { out = fn(); });
  return out;
}

/** The land sciences that have their own buildings here. */
export const SCIENCE_KINDS = Object.keys(B);

/** Build one stage of a land's own science institute. */
export function buildScience(c: Ctx, kind: string, stage: Stage): Footprint {
  const k = kit(c);
  return B[kind](k, stage);
}

