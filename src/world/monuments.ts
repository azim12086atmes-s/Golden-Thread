import * as THREE from 'three';
import type { Ctx, LandmarkOut } from './architecture';
import { floatingIsland, pyramidGeometry } from './architecture';
import { regionCenter } from './regions';
import { PYRAMIDS } from './reserved';
import { terrainHeight } from './terrain';
import { waterBasin, waterChannel, waterPool } from './flowWater';
import { mashrabiya, banana, kolam, kuthuvilakku, ratha, bambooFence, brassLantern, bronzeLantern, deumeu, guardianLion, headstone, ironHinges, ironLantern, stabbur, rankStone, redLantern, redPine, emaRack, maple, merlonRow, muqarnas, offeringBox, plantedTree, sebka, shimenawa, starDoor, starWindow, stoneGroup, stucco, tsukubai, voussoirs, zellige, zelligeBand } from './monumentKit';
import { ANIMAL_HEAD_GAP, HEAD_GAP } from '../characters/anatomy';
import { rangoli } from './gulabi';
import { saduBand } from './traditions';
import { M, archPanel, box, cone, cyl, flowers, gable, sphere, sweptRoof, tree } from './kit';
import { HABITS, growTree, type Habit } from './trees';
import { lanternGeometry } from './lanterns';
import type { RegionId } from './regions';
import { SURF } from './surfaces';
import { PAD_OUT, PAD_R, skyPad } from '../travel/air';
import { TRAM_HANG, TRAM_TRACK, tramCourse, tramLine } from '../travel/gondola';

/**
 * Monuments rebuilt from the ground up (owner: "the monuments still need detailing, and perhaps
 * even changing the complete structure — go slow"), one land at a time, each after the real
 * thing's structure: how it stands, what holds up its roofs, what it is made of, and the small
 * things round it. A land listed here replaces its first-draft landmark (architecture.ts) and that
 * landmark's overlay of detail (landmarkDetail.ts).
 *
 * Local frame: the monument's centre at the origin, the town's southern avenue towards +z (the
 * way in is kept clear along +z). Everything within ~45 m. Lit things in `glow`, kept small.
 */
export type Monument = (c: Ctx, o: LandmarkOut) => void;

/** Draw fn in a frame at (x, y, z) turned by ry — for the solid parts and the lit ones alike, so the two never part company. */
function both(c: Ctx, x: number, y: number, z: number, ry: number, fn: () => void): void {
  c.g.frame(x, y, z, ry, 1, () => c.glow.frame(x, y, z, ry, 1, fn));
}

/** Draw fn with every part it adds given surface `s` (the procedural texture: tiles, boards…). */
function surf(c: Ctx, s: number, fn: () => void): void {
  const prev = c.g.surface;
  c.g.surface = s;
  try { fn(); } finally { c.g.surface = prev; }
}

/** A mesh from triangles given as flat xyz triples, flipped if needed so its first face points along `want`. */
function tris(pos: number[], want: THREE.Vector3): THREE.BufferGeometry {
  const a = new THREE.Vector3(pos[0], pos[1], pos[2]), b = new THREE.Vector3(pos[3], pos[4], pos[5]), cc = new THREE.Vector3(pos[6], pos[7], pos[8]);
  const n = b.clone().sub(a).cross(cc.clone().sub(a));
  if (n.dot(want) < 0) for (let i = 0; i < pos.length; i += 9) for (let k = 0; k < 3; k++) { const t = pos[i + 3 + k]; pos[i + 3 + k] = pos[i + 6 + k]; pos[i + 6 + k] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return g;
}

/** A rod (thin cylinder) from a to b. */
function rod(g: Ctx['g'], a: THREE.Vector3, b: THREE.Vector3, r: number, col: string, seg = 5): void {
  const d = b.clone().sub(a), len = d.length();
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  const m = a.clone().add(b).multiplyScalar(0.5);
  g.add(geo, col, M(m.x, m.y, m.z));
}

// ───────────────────────────── Japan ─────────────────────────────

/** Half-widths across x and along z (a number for a square). */
type Half = number | [number, number];
const hx = (h: Half) => (typeof h === 'number' ? h : h[0]), hz = (h: Half) => (typeof h === 'number' ? h : h[1]);

/**
 * An East-Asian hipped roof over a square or oblong plan: a concave slope from the eave (`eave`
 * half-widths) up to `top` (the half-widths of its upper edge — a ridge when one is near 0), the
 * eave line sagging between corners that lift (sori), a thick eave with its underside running back
 * to the wall (`wall`), rows of round tiles down the slopes, hip ridges down the corners and a line
 * of tile-ends along the eave. `at(side, p, t)` is a point on the top surface (side 0 faces +z, 1
 * +x, 2 −z, 3 −x; p −1…1 along it; t 0 eave … 1 top).
 */
function eastRoof(c: Ctx, y: number, eave: Half, top: Half, wall: Half, rise: number, lift: number, tile: string, ridge: string, gable?: { at: number; col: string; trim: string }): { corner: (i: number) => THREE.Vector3; at: (side: number, p: number, t: number) => THREE.Vector3 } {
  const N = 10, J = 8, thick = 0.42;
  // For a side: its half-length along, and its distance out, at the eave, the top and the wall.
  const dims = (side: number, h: Half) => (side % 2 === 0 ? [hx(h), hz(h)] : [hz(h), hx(h)]);
  // Hip-and-gable (paljak, irimoya): the end hips stop at `gable.at` of the way up, where a
  // vertical gable (in the plane x = ±top's x) rises to the ridge; the long slopes run on up to it.
  const tg = gable?.at ?? 1;
  const at = (side: number, p: number, t: number, under = false) => {
    let along: number, out: number, tf = t;
    if (gable) {
      const ends = side % 2 === 1;
      tf = ends ? t * tg : t;
      const toGable = Math.min(tf, tg) / tg;
      const x = hx(eave) + (hx(top) - hx(eave)) * toGable, z = hz(eave) + (hz(top) - hz(eave)) * tf;
      [along, out] = ends ? [z, x] : [x, z];
    } else {
      const [ae, oe] = dims(side, eave), [at_, ot] = dims(side, top);
      along = ae + (at_ - ae) * t; out = oe + (ot - oe) * t;
    }
    t = tf;
    const corner = Math.pow(Math.abs(p), 5);
    let h = rise * Math.pow(t, 1.8) + lift * corner * Math.pow(1 - t, 2.2);
    if (under) h = rise * 0.18 * t + lift * corner * Math.pow(1 - t, 2.2) - thick * (1 - 0.4 * t);
    // Along the side, then turned to face its way out.
    const lx = p * along, lz = out, a = (side * Math.PI) / 2;
    return new THREE.Vector3(lx * Math.cos(a) + lz * Math.sin(a), y + h, -lx * Math.sin(a) + lz * Math.cos(a));
  };
  const topPos: number[] = [], underPos: number[] = [], edgePos: number[] = [];
  const push = (arr: number[], ...v: THREE.Vector3[]) => { for (const q of v) arr.push(q.x, q.y, q.z); };
  for (let side = 0; side < 4; side++) {
    for (let i = 0; i < N; i++) {
      const p0 = -1 + (2 * i) / N, p1 = -1 + (2 * (i + 1)) / N;
      for (let j = 0; j < J; j++) {
        const t0 = j / J, t1 = (j + 1) / J;
        const a = at(side, p0, t0), b = at(side, p1, t0), cc = at(side, p1, t1), d = at(side, p0, t1);
        push(topPos, a, b, cc, a, cc, d);
      }
      // The underside, from the eave back to the wall.
      const oe = dims(side, eave)[1], tw = (oe - dims(side, wall)[1]) / Math.max(0.01, oe - dims(side, top)[1]);
      for (let j = 0; j < 3; j++) {
        const t0 = (j / 3) * tw, t1 = ((j + 1) / 3) * tw;
        const a = at(side, p0, t0, true), b = at(side, p1, t0, true), cc = at(side, p1, t1, true), d = at(side, p0, t1, true);
        push(underPos, a, b, cc, a, cc, d);
      }
      // The eave's edge, between top and underside.
      const a = at(side, p0, 0), b = at(side, p1, 0), cc = at(side, p1, 0, true), d = at(side, p0, 0, true);
      push(edgePos, a, b, cc, a, cc, d);
    }
  }
  const out = (side: number) => new THREE.Vector3(Math.sin((side * Math.PI) / 2), 0, Math.cos((side * Math.PI) / 2));
  surf(c, SURF.clayTile, () => {
    // Each side separately so each gets its own facing check.
    for (let side = 0; side < 4; side++) {
      const n = topPos.length / 4;
      c.g.add(tris(topPos.slice(side * n, (side + 1) * n), out(side).add(new THREE.Vector3(0, 1.5, 0))), tile);
    }
  });
  for (let side = 0; side < 4; side++) {
    const n = underPos.length / 4, e = edgePos.length / 4;
    c.g.add(tris(underPos.slice(side * n, (side + 1) * n), new THREE.Vector3(0, -1, 0)), '#6a4a36');
    c.g.add(tris(edgePos.slice(side * e, (side + 1) * e), out(side)), ridge);
  }
  // Rows of round tiles down each slope, and the tile-ends along the eave.
  for (let side = 0; side < 4; side++) {
    const rows = Math.max(6, Math.round(dims(side, eave)[0] * 1.6));
    for (let k = 1; k < rows; k++) {
      const p = -1 + (2 * k) / rows;
      const pts: THREE.Vector3[] = [];
      for (let j = 0; j <= 6; j++) pts.push(at(side, p * (1 - 0.1 * (j / 6)), (j / 6) * 0.97).add(new THREE.Vector3(0, 0.07, 0)));
      c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 6, 0.075, 3), ridge);
    }
    const eaveLine: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) eaveLine.push(at(side, -1 + i / 6, 0).add(new THREE.Vector3(0, 0.02, 0)));
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(eaveLine), 16, 0.13, 5), ridge);
  }
  // The gables, boarded and framed; and the main ridge along the top.
  if (gable) for (const sx of [-1, 1]) {
    const x = sx * hx(top), yg = y + rise * Math.pow(tg, 1.8), zg = hz(eave) + (hz(top) - hz(eave)) * tg, zt = hz(top);
    const q = [new THREE.Vector3(x, yg, -zg), new THREE.Vector3(x, yg, zg), new THREE.Vector3(x, y + rise, zt), new THREE.Vector3(x, y + rise, -zt)];
    const pos: number[] = [];
    for (const v of [q[0], q[1], q[2], q[0], q[2], q[3]]) pos.push(v.x - sx * 0.05, v.y, v.z);
    surf(c, SURF.boards, () => c.g.add(tris(pos, new THREE.Vector3(sx, 0, 0)), gable.col));
    for (const [a, b] of [[q[0], q[1]], [q[1], q[2]], [q[3], q[0]]] as const) rod(c.g, a, b, 0.09, gable.trim, 5);
  }
  if (hx(top) - hz(top) > 1) c.g.add(new THREE.BoxGeometry(2 * hx(top) + 0.6, 0.55, 0.6), ridge, M(0, y + rise + 0.2, 0));
  // Hip ridges down the four corners, an end-tile at the foot of each.
  for (let side = 0; side < 4; side++) {
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 6; j++) pts.push(at(side, 1, 1 - j / 6).add(new THREE.Vector3(0, 0.16, 0)));
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.2, 5), ridge);
    const foot = pts[pts.length - 1];
    box(c.g, 0.5, 0.55, 0.5, ridge, foot.x, foot.y - 0.1, foot.z);
  }
  return { corner: (i: number) => at(i, 1, 0), at: (side, p, t) => at(side, p, t) };
}

/** A fūtaku: a small bronze wind-bell hung from a roof corner on a short chain. */
function windBell(c: Ctx, p: THREE.Vector3): void {
  cyl(c.g, 0.02, 0.02, 0.5, '#3a3228', p.x, p.y - 0.5, p.z, 3);
  cone(c.g, 0.2, 0.42, '#5a6a4a', p.x, p.y - 0.95, p.z, 8);
  box(c.g, 0.16, 0.24, 0.02, '#c9a24a', p.x, p.y - 1.25, p.z);
}

/** A Kasuga stone lantern: hexagonal base, round shaft, platform, a glowing fire-box, a curling roof and a jewel. */
function kasuga(c: Ctx, x: number, z: number, s = 1): void {
  const stone = '#9a968c', dark = '#86827a';
  surf(c, SURF.ashlar, () => {
    cyl(c.g, 0.55 * s, 0.62 * s, 0.35 * s, stone, x, 0, z, 6);
    cyl(c.g, 0.36 * s, 0.5 * s, 0.2 * s, dark, x, 0.35 * s, z, 6);
    cyl(c.g, 0.17 * s, 0.2 * s, 1.3 * s, stone, x, 0.55 * s, z, 10);
    cyl(c.g, 0.23 * s, 0.23 * s, 0.1 * s, dark, x, 1.15 * s, z, 10);
    cyl(c.g, 0.52 * s, 0.3 * s, 0.3 * s, stone, x, 1.85 * s, z, 6);
  });
  // The fire-box: six stone posts round a lit core, the light showing through its windows.
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + Math.PI / 6; box(c.g, 0.1 * s, 0.55 * s, 0.1 * s, stone, x + Math.cos(a) * 0.36 * s, 2.15 * s, z + Math.sin(a) * 0.36 * s); }
  cyl(c.glow, 0.28 * s, 0.28 * s, 0.45 * s, '#ffd08a', x, 2.2 * s, z, 6);
  surf(c, SURF.ashlar, () => {
    cone(c.g, 0.78 * s, 0.5 * s, stone, x, 2.7 * s, z, 6);
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; sphere(c.g, 0.1 * s, dark, x + Math.cos(a) * 0.74 * s, 2.78 * s, z + Math.sin(a) * 0.74 * s, 5); } // the curls (warabide)
    sphere(c.g, 0.16 * s, stone, x, 3.3 * s, z, 8);
    cone(c.g, 0.1 * s, 0.22 * s, stone, x, 3.4 * s, z, 8);
  });
}

/** A Myōjin torii: two leaning pillars on stone feet, the tie-beam through them, a plaque, and the black lintel curving up at its ends. */
function torii(c: Ctx, z: number, span: number, h: number): void {
  const red = '#d23a26', black = '#1f1c1c';
  for (const sx of [-1, 1]) {
    const x = sx * span / 2;
    surf(c, SURF.ashlar, () => cyl(c.g, 0.72, 0.8, 0.5, '#9a968c', x, 0, z, 12));
    cyl(c.g, 0.6, 0.62, 0.9, black, x, 0.5, z, 14); // the black foot band (nemaki)
    c.g.add(new THREE.CylinderGeometry(0.44, 0.52, h - 1.4, 14).translate(0, (h - 1.4) / 2, 0), red, M(x, 1.4, z, 0, 1, 1, 1, 0, sx * 0.025)); // leaning in (uchikorobi)
    box(c.g, 0.2, 0.5, 0.95, black, x - sx * 0.62, h * 0.74, z); // wedges (kusabi)
  }
  box(c.g, span + 2.2, 0.62, 0.62, red, 0, h * 0.74, z); // the tie-beam (nuki)
  const y0 = h * 0.74 + 0.62;
  box(c.g, 0.5, h - y0, 0.5, red, 0, y0, z); // the strut (gakuzuka)…
  box(c.g, 1.4, h - y0 - 0.2, 0.16, black, 0, y0 + 0.1, z + 0.3); // …and the plaque (gaku) on it, gold-edged
  for (const yy of [y0 + 0.05, h - 0.15]) box(c.g, 1.54, 0.1, 0.2, '#d4af37', 0, yy, z + 0.3);
  box(c.g, span + 3.4, 0.7, 0.9, red, 0, h, z); // the lower lintel (shimaki)
  // The black upper lintel (kasagi), in pieces rising towards its upswept ends.
  const L = span + 5.6, n = 9;
  for (let i = 0; i < n; i++) {
    const x0 = -L / 2 + (i / n) * L, x1 = -L / 2 + ((i + 1) / n) * L;
    const y = (xx: number) => h + 0.7 + 1.3 * Math.pow(Math.abs(xx) / (L / 2), 2.6);
    const len = Math.hypot(x1 - x0, y(x1) - y(x0));
    c.g.add(new THREE.BoxGeometry(len + 0.04, 0.8, 1.25), black, M((x0 + x1) / 2, (y(x0) + y(x1)) / 2 + 0.4, z, 0, 1, 1, 1, 0, Math.atan2(y(x1) - y(x0), x1 - x0)));
  }
}

/** A carp streamer on the wind: a tapered cloth tube with scale bands and a forked tail (no eyes). */
function koi(c: Ctx, x: number, y: number, z: number, len: number, body: string, belly: string): void {
  const geo = new THREE.CylinderGeometry(len * 0.16, len * 0.1, len, 10, 1, true);
  geo.rotateZ(Math.PI / 2);
  c.g.add(geo, body, M(x + len / 2, y, z, 0, 1, 1, 1, 0, -0.08));
  for (let i = 1; i < 5; i++) c.g.add(new THREE.TorusGeometry(len * (0.16 - i * 0.012), len * 0.012, 4, 12).rotateY(Math.PI / 2), belly, M(x + (i / 5) * len, y - (i / 5) * len * 0.08, z));
  c.g.add(new THREE.TorusGeometry(len * 0.165, len * 0.02, 4, 14).rotateY(Math.PI / 2), '#f4efe6', M(x, y + 0.02, z)); // the mouth hoop
  for (const s of [-1, 1]) c.g.add(new THREE.BoxGeometry(len * 0.3, 0.02, len * 0.14), body, M(x + len * 1.08, y - len * 0.08 + s * len * 0.06, z, 0, 1, 1, 1, 0, s * 0.5));
}

const japan: Monument = (c, o) => {
  const red = '#c8412e', white = '#f2ecdc', dark = '#3a2a22', tile = '#4a4e58', ridge = '#3a3e48', ochre = '#e2b43a', bronze = '#5a5a4a', stone = '#a8a298';
  // ── The precinct: raked white gravel, rings raked round the pagoda, a flagstone path to the gate.
  // (Raised clear of the town's plaza paving, which lies just over the ground.)
  box(c.g, 44, 0.16, 44, '#e2ded2', 0, 0, 0);
  for (let r = 11; r < 20; r += 0.8) c.g.add(new THREE.TorusGeometry(r, 0.035, 3, 72), '#d2ccbc', M(0, 0.16, 0, 0, 1, 1, 1, Math.PI / 2, 0));
  surf(c, SURF.flagstone, () => box(c.g, 3.4, 0.2, 26, '#b8b2a4', 0, 0, 21));
  // ── The podium (kidan): dressed granite, a coping band, steps up on all four sides.
  const P = 1.1, pw = 15;
  surf(c, SURF.ashlar, () => { box(c.g, pw, P, pw, stone); box(c.g, pw + 0.4, 0.22, pw + 0.4, '#b8b2a6', 0, P - 0.22, 0); });
  for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
    surf(c, SURF.ashlar, () => { for (let k = 0; k < 4; k++) box(c.g, 3.6, P - k * (P / 4), 0.45, '#b0aa9e', 0, 0, pw / 2 + 0.22 + (3 - k) * 0.45); });
    for (const sx of [-1, 1]) box(c.g, 0.35, P + 0.3, 1.9, '#a09a8e', sx * 2, 0, pw / 2 + 0.95); // side walls of the stair
  });

  // ── Five storeys: each a little narrower, its roof deep-eaved on brackets, a balcony round the upper four.
  const W = [7.8, 6.9, 6.1, 5.3, 4.5];
  let y = P;
  const bells: THREE.Vector3[] = [];
  for (let i = 0; i < 5; i++) {
    const w = W[i], hw = w / 2, body = i === 0 ? 3.9 : 2.6;
    // Posts at the four corners and between three bays, white plaster between them, rails top and bottom.
    surf(c, SURF.plaster, () => box(c.g, w - 0.3, body, w - 0.3, white, 0, y, 0));
    for (let side = 0; side < 4; side++) both(c, 0, y, 0, (side * Math.PI) / 2, () => {
      for (let k = 0; k < 4; k++) cyl(c.g, 0.2, 0.22, body, red, -hw + (k * w) / 3, 0, hw - 0.12, 10);
      for (const yy of [0.25, body - 0.35]) box(c.g, w + 0.1, 0.32, 0.26, red, 0, yy, hw - 0.05); // nageshi
      // The middle bay: studded double doors below, a panel above.
      box(c.g, w / 3 - 0.5, body - 0.9, 0.08, i === 0 ? '#7a2a1e' : '#8a5a3a', 0, 0.55, hw - 0.1);
      if (i === 0) for (let r = 0; r < 5; r++) for (let q = 0; q < 4; q++) sphere(c.g, 0.05, '#d4af37', -0.6 + q * 0.4, 0.95 + r * 0.55, hw - 0.04, 4);
      box(c.g, 0.04, body - 0.9, 0.1, dark, 0, 0.55, hw - 0.06);
      // The side bays: green lattice windows (renji-mado).
      for (const sx of [-1, 1]) {
        const cx = sx * w / 3;
        box(c.g, w / 3 - 0.6, body * 0.5, 0.06, '#2f5a44', cx, body * 0.28, hw - 0.12); // the frame
        box(c.glow, w / 3 - 0.9, body * 0.42, 0.02, '#ffd9a0', cx, body * 0.32, hw - 0.07); // lamplight behind the bars
        for (let b = 0; b < 7; b++) box(c.g, 0.06, body * 0.45, 0.08, '#3f7a5a', cx - (w / 3 - 0.9) / 2 + (b * (w / 3 - 0.9)) / 6, body * 0.3, hw - 0.02);
      }
      // Brackets (tokyō): three stepped blocks at each post, carrying the rafters out.
      for (let k = 0; k < 4; k++) {
        const x = -hw + (k * w) / 3;
        for (let s = 0; s < 3; s++) {
          box(c.g, 0.42, 0.22, 0.42, ochre, x, body + s * 0.3, hw + s * 0.42);
          box(c.g, 0.34, 0.1, 0.6 + s * 0.42, red, x, body + s * 0.3 + 0.22, hw + (s * 0.42) / 2);
        }
      }
      for (let s = 0; s < 3; s++) box(c.g, w + s * 0.84, 0.14, 0.2, red, 0, body + s * 0.3 + 0.22, hw + s * 0.42);
      // Rafters under the eave, their ends painted.
      const n = Math.round(w / 0.42);
      for (let k = 0; k <= n; k++) {
        const x = -hw - 0.6 + (k * (w + 1.2)) / n;
        // Sloping down and out just under the eave's soffit.
        c.g.add(new THREE.BoxGeometry(0.14, 0.16, 2.4), '#8a5a36', M(x, body + 0.72, hw + 1.25, 0, 1, 1, 1, 0.14, 0));
        c.g.add(new THREE.BoxGeometry(0.15, 0.17, 0.04), white, M(x, body + 0.55, hw + 2.45, 0, 1, 1, 1, 0.14, 0));
      }
    });
    const eaveY = y + body + 1.05;
    // The roof: deep eaves, corners lifting; the top roof steep, rising to the spire.
    const last = i === 4;
    const roof = eastRoof(c, eaveY, hw + 2.9, last ? 0.5 : W[i + 1] / 2 * 0.95, hw + 0.5, last ? 3 : 1.7, 0.75, tile, ridge);
    for (let k = 0; k < 4; k++) bells.push(roof.corner(k));
    if (!last) {
      // The balcony of the storey above: a deck on the roof, a railing with gilded caps.
      const ny = eaveY + 1.25, bw = W[i + 1] + 1.3;
      surf(c, SURF.boards, () => box(c.g, bw, 0.18, bw, '#8a5a36', 0, ny - 0.18, 0));
      for (let side = 0; side < 4; side++) c.g.frame(0, ny, 0, (side * Math.PI) / 2, 1, () => {
        for (const yy of [0.35, 0.72]) box(c.g, bw, 0.08, 0.08, red, 0, yy, bw / 2 - 0.05);
        for (let k = 0; k <= 6; k++) box(c.g, 0.1, 0.72, 0.1, red, -bw / 2 + (k * bw) / 6, 0, bw / 2 - 0.05);
        sphere(c.g, 0.1, '#d4af37', bw / 2 - 0.05, 0.84, bw / 2 - 0.05, 6);
      });
      y = ny;
    } else y = eaveY + 3;
  }
  for (const b of bells) windBell(c, b);
  // Bronze lanterns hanging under the ground storey's eaves, and at the corners above.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) bronzeLantern(c, sx * 5.4, P + 4.8, sz * 5.4, 1.2);
  for (const x of [-2.2, 2.2]) bronzeLantern(c, x, P + 4.8, 5.6, 1.1);
  // At the pagoda's door: the offering box and the bell on its rope; a rope of straw over the door.
  offeringBox(c, 0, 5.1, P + 3.6);
  shimenawa(c, 3.4, P + 3.55, 4.05, 0.1);

  // ── The spire (sōrin): dew basin, inverted bowl, lotus, nine rings, water-flame, dragon-car, jewel.
  const sy = y - 0.2;
  box(c.g, 1.5, 0.55, 1.5, bronze, 0, sy, 0);
  c.g.add(new THREE.SphereGeometry(0.72, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), bronze, M(0, sy + 0.55, 0));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.g.add(new THREE.SphereGeometry(0.3, 6, 4).scale(0.6, 1, 0.3), bronze, M(Math.cos(a) * 0.42, sy + 1.45, Math.sin(a) * 0.42, -a + Math.PI / 2, 1, 1, 1, 0.3, 0)); }
  cyl(c.g, 0.13, 0.16, 7.8, bronze, 0, sy + 1.2, 0, 8);
  for (let i = 0; i < 9; i++) c.g.add(new THREE.TorusGeometry(0.62 - i * 0.025, 0.07, 5, 18), bronze, M(0, sy + 2 + i * 0.52, 0, 0, 1, 1, 1, Math.PI / 2, 0));
  const flame = new THREE.Shape();
  flame.moveTo(0, 0); flame.bezierCurveTo(0.9, 0.3, 0.2, 0.9, 0.7, 1.5); flame.bezierCurveTo(0.1, 1.2, 0.3, 1.9, 0, 2.2);
  flame.bezierCurveTo(-0.3, 1.9, -0.1, 1.2, -0.7, 1.5); flame.bezierCurveTo(-0.2, 0.9, -0.9, 0.3, 0, 0);
  const fg = new THREE.ExtrudeGeometry(flame, { depth: 0.05, bevelEnabled: false, curveSegments: 6 });
  for (let k = 0; k < 2; k++) c.g.add(fg.clone(), '#6a6a52', M(0, sy + 6.8, 0, (k * Math.PI) / 2));
  sphere(c.g, 0.22, bronze, 0, sy + 9.1, 0, 8);
  sphere(c.g, 0.3, '#d4af37', 0, sy + 9.5, 0, 10, 1.2);
  cone(c.g, 0.12, 0.35, '#d4af37', 0, sy + 9.8, 0, 8);
  // Chains from the rings down to the top roof's corners, bells along them.
  for (let k = 0; k < 4; k++) {
    const a = new THREE.Vector3(0, sy + 5.8, 0), b = bells[16 + k].clone().add(new THREE.Vector3(0, 0.3, 0));
    rod(c.g, a, b, 0.025, '#3a3228', 4);
    for (const f of [0.35, 0.65]) { const p = a.clone().lerp(b, f); cone(c.g, 0.1, 0.2, bronze, p.x, p.y - 0.25, p.z, 6); }
  }
  const height = sy + 10.2;
  // You can climb the podium and walk round the pagoda under its eaves.
  o.colliders.push({ x: 0, z: 0, r: 4.6, h: height });
  o.platforms.push({ x: 0, z: 0, r: 9.8, y: P });

  // ── The torii at the gate of the precinct, on the path.
  torii(c, 30, 8, 8.4);
  shimenawa(c, 7.6, 6.1, 30.35, 0.16);
  o.colliders.push({ x: -4, z: 30, r: 0.9, h: 10 }, { x: 4, z: 30, r: 0.9, h: 10 });
  // ── Kasuga lanterns lining the path.
  for (const z of [11, 16, 21, 26]) for (const x of [-3.4, 3.4]) kasuga(c, x, z);

  // ── The bell tower (shōrō): splayed posts on a stone base, a hip-and-gable roof, the bronze bell and its striking log.
  c.g.frame(15, 0, 12, -0.3, 1, () => c.glow.frame(15, 0, 12, -0.3, 1, () => {
    surf(c, SURF.ashlar, () => box(c.g, 6, 1, 6, stone));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) c.g.add(new THREE.CylinderGeometry(0.2, 0.24, 5, 8).translate(0, 2.5, 0), red, M(sx * 1.9, 1, sz * 1.9, 0, 1, 1, 1, sz * -0.05, sx * 0.05));
    for (const yy of [2.6, 5.6]) for (let s = 0; s < 4; s++) c.g.frame(0, 0, 0, (s * Math.PI) / 2, 1, () => box(c.g, 4.3, 0.26, 0.26, red, 0, yy, 1.9));
    surf(c, SURF.clayTile, () => sweptRoof(c.g, 8.4, 8.4, 2.6, tile, 0, 5.9, 0, 0, 0.5));
    const bell = new THREE.LatheGeometry([[0, 0], [0.95, 0], [0.9, 0.3], [0.82, 1.2], [0.78, 1.7], [0.6, 1.95], [0.2, 2.05], [0, 2.1]].map(([a, b]) => new THREE.Vector2(a, b)), 16);
    c.g.add(bell, '#4a5a44', M(0, 2.9, 0));
    for (let r = 0; r < 3; r++) for (let q = 0; q < 8; q++) { const a = (q / 8) * Math.PI * 2; sphere(c.g, 0.07, '#5a6a52', Math.cos(a) * 0.82, 4.1 + r * 0.25, Math.sin(a) * 0.82, 4); } // bosses
    cyl(c.g, 0.1, 0.1, 0.9, dark, 0, 5, 0, 5);
    c.g.add(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 8).rotateZ(Math.PI / 2), '#b08a5a', M(1.2, 3.8, 0));
    for (const x of [0.4, 2]) cyl(c.g, 0.02, 0.02, 1.9, '#d8c8a0', x, 3.8, 0, 3);
  }));
  o.colliders.push({ x: 15, z: 12, r: 3.4, h: 9 });

  // ── The purification pavilion (chōzuya): four posts, a tiled roof, a stone basin fed from a bamboo pipe, ladles laid across.
  c.g.frame(-15, 0, 18, 0.3, 1, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.16, 0.18, 3.2, dark, sx * 1.8, 0, sz * 1.2, 8);
    surf(c, SURF.clayTile, () => sweptRoof(c.g, 6.4, 5, 1.7, tile, 0, 3.2, 0, 0, 0.45));
    surf(c, SURF.ashlar, () => box(c.g, 2.6, 0.9, 1.3, '#9a968c'));
    box(c.g, 2.3, 0.04, 1.0, '#3a6a7a', 0, 0.88, 0);
    c.g.add(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 6).rotateZ(Math.PI / 2 - 0.3), '#b8c070', M(-1.4, 1.35, 0));
    for (let i = 0; i < 4; i++) { c.g.add(new THREE.CylinderGeometry(0.02, 0.02, 1.1, 4).rotateX(Math.PI / 2), '#c8b070', M(-0.8 + i * 0.5, 0.95, 0.1)); cyl(c.g, 0.07, 0.06, 0.1, '#c8b070', -0.8 + i * 0.5, 0.92, -0.45, 8); }
  });
  o.colliders.push({ x: -15, z: 18, r: 2.4, h: 5 });

  // ── A koi pond with a stone rim and stepping stones, a stone lantern at its edge.
  waterPool(c, -14, 0, -8, 9, 7, 0.4, { stone: '#9a968c', kerb: 0.35, speed: 0.04 });
  for (let i = 0; i < 5; i++) cyl(c.g, 0.45, 0.5, 0.4, '#8a8680', -18 + i * 1.8, 0, -3.2 + Math.sin(i) * 0.5, 7);
  for (let i = 0; i < 7; i++) { const a = i * 0.9; sphere(c.g, 0.35 + (i % 3) * 0.15, '#7a766e', -14 + Math.cos(a) * 5.4, 0.1, -8 + Math.sin(a) * 4.4, 6, 0.6); }
  // The carp in the pond: orange and white, drawn as simple shapes under the surface (no eyes).
  for (let i = 0; i < 5; i++) c.g.add(new THREE.SphereGeometry(0.28, 8, 5).scale(1, 0.35, 0.4), i % 2 ? '#ff7a2a' : '#f4efe6', M(-14 + Math.cos(i * 1.3) * 2.4, 0.18, -8 + Math.sin(i * 1.3) * 1.8, i * 1.3));
  kasuga(c, -9, -12, 0.8);

  // ── Koinobori: a tall pole with a pinwheel, a five-colour streamer and three carp on the wind.
  c.g.frame(15, 0, -12, 0, 1, () => {
    cyl(c.g, 0.12, 0.18, 14, '#c8b070', 0, 0, 0, 8);
    for (let i = 0; i < 6; i++) c.g.add(new THREE.BoxGeometry(0.08, 0.7, 0.04).translate(0, 0.35, 0), '#d4af37', M(0, 14, 0, 0, 1, 1, 1, 0, (i / 6) * Math.PI * 2));
    for (let i = 0; i < 5; i++) c.g.add(new THREE.BoxGeometry(3.6, 0.14, 0.02), ['#3a6aa8', '#f4efe6', '#c23b2a', '#e2b43a', '#2f8a6a'][i], M(1.9, 13.4 - i * 0.15, 0, 0, 1, 1, 1, 0, -0.1));
    koi(c, 0.1, 11.4, 0, 4.2, '#2a2a30', '#e2b43a');
    koi(c, 0.1, 9.6, 0, 3.4, '#c23b2a', '#f4efe6');
    koi(c, 0.1, 8.0, 0, 2.6, '#3a6aa8', '#f4efe6');
  });
  o.colliders.push({ x: 15, z: -12, r: 0.5, h: 14 });

  // ── Gravel stone groups, moss and maples, an ema rack by the bell tower, bamboo fences, a tsukubai.
  stoneGroup(c, -11, 6, 1, () => c.rng.next());
  stoneGroup(c, 12, -4, 0.8, () => c.rng.next());
  stoneGroup(c, -6, -15, 0.9, () => c.rng.next());
  for (const [x, z] of [[-17.5, -3], [18, 2], [-9, 14], [10, 20]] as const) maple(c, x, z, 1);
  emaRack(c, 9.5, 17, -0.3, () => c.rng.next());
  o.colliders.push({ x: 9.5, z: 17, r: 1.6, h: 2.2 });
  for (const [x, z, ry] of [[-21, 10, Math.PI / 2], [21, 10, Math.PI / 2], [-21, -10, Math.PI / 2], [21, -10, Math.PI / 2]] as const) c.g.frame(x, 0.16, z, ry, 1, () => bambooFence(c, 12, 1.4));
  tsukubai(c, -18.5, -12);
  // ── Cherry trees at the precinct's corners, and a low clipped hedge along its sides.
  for (const [x, z] of [[-19, -19], [19, -19], [-20, 8], [20, 26], [-20, 28]] as const) tree(c.g, 'sakura', x, 0, z, 1.25, () => c.rng.next());
  for (const sx of [-1, 1]) for (let i = 0; i < 9; i++) sphere(c.g, 0.9, '#3f6a3a', sx * 22, 0.5, -18 + i * 4.4, 7, 0.7);
  o.height = height;
};

// ───────────────────────────── Korea ─────────────────────────────

const DAN = ['#2f7a5a', '#3a6aa8', '#c23b2a', '#f4efe4', '#e2b43a'];

/** A band of dancheong: short blocks of green, blue, red, white and ochre along x, w wide at (y, z). */
function dancheong(c: Ctx, w: number, y: number, z: number, h = 0.5, step = 0.55): void {
  const n = Math.floor(w / step);
  for (let i = 0; i < n; i++) box(c.g, step, h, 0.06, DAN[(i * 3) % DAN.length], -w / 2 + step / 2 + i * step, y, z);
}

/**
 * One storey of a Korean timber hall, `w` × `d` (x × z) and `h` tall at height y: round red posts on
 * a bay grid, lattice doors papered in every bay, green lintels painted with dancheong, and bracket
 * sets (dapo gongpo) at and between the posts stepping out under the eaves; round rafters with
 * painted ends. Returns the height the eave sits at.
 */
function koreanStorey(c: Ctx, y: number, w: number, d: number, h: number, bay: number): number {
  const red = '#8e3a2d', green = '#2f7a5a', paper = '#efe4c8';
  const nx = Math.round(w / bay), nz = Math.round(d / bay);
  surf(c, SURF.boards, () => box(c.g, w + 0.8, 0.4, d + 0.8, '#6a4a32', 0, y, 0));
  const y0 = y + 0.4;
  for (let side = 0; side < 4; side++) {
    const long = side % 2 === 0, len = long ? w : d, half = long ? d / 2 : w / 2, n = long ? nx : nz;
    both(c, 0, y0, 0, (side * Math.PI) / 2, () => {
      for (let k = 0; k <= n; k++) cyl(c.g, 0.3, 0.33, h, red, -len / 2 + (k * len) / n, 0, half, 12);
      // Lattice doors in every bay: a red frame, papered panels, a green grid over them.
      for (let k = 0; k < n; k++) {
        const x = -len / 2 + ((k + 0.5) * len) / n, bw = len / n - 0.7;
        box(c.g, bw, h - 1.1, 0.12, red, x, 0.25, half - 0.05);
        box(c.glow, bw - 0.3, h - 1.5, 0.04, paper, x, 0.45, half + 0.02); // hanji paper: cream by day, lamplit at night
        for (let q = 1; q < 4; q++) box(c.g, 0.07, h - 1.5, 0.06, green, x - bw / 2 + (q * bw) / 4, 0.45, half + 0.05);
        for (let q = 1; q < 6; q++) box(c.g, bw - 0.3, 0.06, 0.06, green, x, 0.45 + (q * (h - 1.5)) / 6, half + 0.05);
      }
      // Lintels: green, with dancheong bands; the bracket sets above them.
      box(c.g, len + 0.6, 0.45, 0.4, green, 0, h - 0.5, half);
      dancheong(c, len, h - 0.45, half + 0.22, 0.35);
      box(c.g, len + 0.8, 0.3, 0.7, '#3a6aa8', 0, h - 0.05, half);
      const sets = n * 3;
      for (let k = 0; k <= sets; k++) {
        const x = -len / 2 + (k * len) / sets;
        for (let t = 0; t < 3; t++) {
          box(c.g, 0.34, 0.24, 0.34, t === 1 ? '#c23b2a' : '#3a6aa8', x, h + 0.25 + t * 0.32, half + t * 0.4);
          box(c.g, 0.26, 0.12, 0.5 + t * 0.4, green, x, h + 0.49 + t * 0.32, half + t * 0.2);
        }
      }
      for (let t = 0; t < 3; t++) box(c.g, len + t * 0.8, 0.12, 0.18, green, 0, h + 0.49 + t * 0.32, half + t * 0.4);
      // Round rafters, sloping out and down, their ends painted green and blue.
      const nr = Math.round((len + 2.4) / 0.5);
      for (let k = 0; k <= nr; k++) {
        const x = -len / 2 - 1.2 + (k * (len + 2.4)) / nr;
        c.g.add(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6).rotateX(Math.PI / 2 + 0.16), '#6a4a32', M(x, h + 1.45, half + 1.35));
        c.g.add(new THREE.CylinderGeometry(0.105, 0.105, 0.04, 8).rotateX(Math.PI / 2 + 0.16), k % 2 ? '#2f7a5a' : '#3a6aa8', M(x, h + 1.25, half + 2.64));
      }
    });
  }
  return y0 + h + 1.75;
}

/** A haetae: a crouched guardian beast on a plinth — a maned body, curled tail, its head floating just clear (no face). */
function haetae(c: Ctx, x: number, z: number, ry: number): void {
  const stone = '#b8b0a4';
  c.g.frame(x, 0, z, ry, 1, () => {
    surf(c, SURF.ashlar, () => { box(c.g, 2.6, 1.4, 3.4, '#a8a094'); box(c.g, 2.8, 0.25, 3.6, '#b0a89c', 0, 1.4, 0); });
    c.g.add(new THREE.SphereGeometry(0.9, 12, 8).scale(0.9, 0.8, 1.3), stone, M(0, 2.4, -0.3));
    for (const sx of [-1, 1]) { cyl(c.g, 0.22, 0.26, 1.2, stone, sx * 0.55, 1.65, 0.7, 8); sphere(c.g, 0.28, stone, sx * 0.55, 1.75, 0.95, 8, 0.6); cyl(c.g, 0.28, 0.3, 0.8, stone, sx * 0.6, 1.65, -1.2, 8); }
    for (let i = 0; i < 5; i++) sphere(c.g, 0.22 - i * 0.02, stone, 0, 2.4 + i * 0.22, -1.5 - Math.sin(i * 0.8) * 0.4, 6); // the curling tail
    c.g.add(new THREE.TorusGeometry(0.62, 0.2, 6, 14), '#a8a094', M(0, 3.25, 0.55, 0, 1, 1, 1, 0.3, 0)); // the mane
    sphere(c.g, 0.55, stone, 0, 3.55 + 0.25, 1.0, 10); // the head, floating free of the mane
    for (const sx of [-1, 1]) cone(c.g, 0.1, 0.35, '#a8a094', sx * 0.25, 4.25, 0.9, 5);
  });
}

const korea: Monument = (c, o) => {
  const granite = '#bdb5a6', tile = '#3f434c', ridge = '#2f333a', white = '#f4efe4';
  // ── The forecourt of rough granite slabs.
  surf(c, SURF.flagstone, () => box(c.g, 46, 0.18, 26, '#b8b0a4', 0, 0, 20));
  // ── The stone base (seokchuk): three arched passages right through it.
  const W = 34, H = 7.5, D = 13;
  const arches: Array<[number, number, number]> = [[-9, 4.2, 3.4], [0, 5.2, 4.0], [9, 4.2, 3.4]];
  const sh = new THREE.Shape();
  sh.moveTo(-W / 2, 0);
  for (const [x, w, spring] of arches) { sh.lineTo(x - w / 2, 0); sh.lineTo(x - w / 2, spring); sh.absarc(x, spring, w / 2, Math.PI, 0, true); sh.lineTo(x + w / 2, 0); }
  sh.lineTo(W / 2, 0); sh.lineTo(W / 2, H); sh.lineTo(-W / 2, H); sh.lineTo(-W / 2, 0);
  const base = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 14 });
  base.translate(0, 0, -D / 2);
  surf(c, SURF.ashlar, () => {
    c.g.add(base, granite);
    box(c.g, W + 0.7, 0.45, D + 0.7, '#c8c0b0', 0, H, 0); // the cornice
    // The parapet round the top, capped with tiles.
    for (const sz of [-1, 1]) { box(c.g, W + 0.5, 1.0, 0.55, granite, 0, H + 0.45, sz * (D / 2 + 0.05)); box(c.g, W + 0.8, 0.22, 0.8, tile, 0, H + 1.45, sz * (D / 2 + 0.05)); }
    for (const sx of [-1, 1]) { box(c.g, 0.55, 1.0, D, granite, sx * (W / 2 + 0.05), H + 0.45, 0); box(c.g, 0.8, 0.22, D + 0.3, tile, sx * (W / 2 + 0.05), H + 1.45, 0); }
  });
  for (const [x, w, spring] of arches) for (const sz of [-1, 1]) {
    // Voussoirs round each arch face, and a keystone.
    c.g.add(new THREE.TorusGeometry(w / 2 + 0.28, 0.28, 4, 18, Math.PI), '#d0c8b8', M(x, spring, sz * (D / 2 + 0.06)));
    box(c.g, 0.6, 0.8, 0.2, '#d8d0c0', x, spring + w / 2 + 0.1, sz * (D / 2 + 0.1));
  }
  // The great doors, folded open against the passage walls, studded with iron.
  for (const [x, w, spring] of arches) for (const sx of [-1, 1]) {
    const lh = spring + w * 0.3, lz = D / 2 - 1.2 - w / 4;
    box(c.g, 0.2, lh, w / 2, '#7a2a1e', x + sx * (w / 2 - 0.14), 0, lz);
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) sphere(c.g, 0.05, '#2a2a2a', x + sx * (w / 2 - 0.26), 0.6 + r * (lh - 1) / 4, lz - w / 4 + 0.3 + q * (w / 2 - 0.6) / 2, 4);
  }
  // Colliders on the piers only, so the passages stay open underfoot.
  for (const [px, r] of [[-14.1, 2.9], [-4.75, 2.1], [4.75, 2.1], [14.1, 2.9]] as const) for (const z of [-4.2, 0, 4.2]) o.colliders.push({ x: px, z, r, h: H + 1.5 });

  // ── The pavilion (mullu): two storeys on the base, the lower under a skirt roof, the upper under a hip-and-gable roof.
  const e1 = koreanStorey(c, H + 0.45, 21, 8.4, 4.4, 4.2);
  eastRoof(c, e1, [13.8, 7.4], [8.8, 3.6], [11, 4.6], 1.9, 0.9, tile, ridge);
  const e2 = koreanStorey(c, e1 + 1.1, 16.8, 6.4, 3.4, 4.2);
  eastRoof(c, e2, [12.4, 6.9], [7.6, 0.35], [8.9, 3.7], 4.6, 1.05, tile, ridge, { at: 0.5, col: '#6a3a26', trim: white });
  // White mortar along the ridge, ridge-end ornaments rising at either end.
  for (const sz of [-1, 1]) box(c.g, 15.4, 0.18, 0.05, white, 0, e2 + 4.72, sz * 0.31);
  for (const sx of [-1, 1]) { box(c.g, 0.7, 1.2, 0.7, ridge, sx * 7.9, e2 + 4.5, 0); c.g.add(new THREE.ConeGeometry(0.35, 1, 6), ridge, M(sx * 8.1, e2 + 6.1, 0, 0, 1, 1, 1, 0, -sx * 0.4)); }
  const height = e2 + 6.6;

  // ── The forecourt's rank stones in two rows, bronze fire-water cauldrons, red pines.
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) { rankStone(c, sx * 3.6, 12 + k * 2.6); }
  for (const sx of [-1, 1]) { deumeu(c, sx * 9, 8.2); o.colliders.push({ x: sx * 9, z: 8.2, r: 1.1, h: 2 }); }
  for (const [x, z] of [[-24, 12], [26, 16], [-30, 22], [31, 8]] as const) redPine(c, x, z, 1.1, () => c.rng.next());
  // A moat channel along the front, crossed by a stone footbridge on the gate's axis.
  for (const sx of [-1, 1]) waterChannel(c, sx * 13.5, 0, 31, 23, 2.2, Math.PI / 2, { speed: 0.3, flow: null });
  surf(c, SURF.ashlar, () => { box(c.g, 4.6, 0.5, 3.4, '#b8b0a4', 0, 0, 31); for (const sx of [-1, 1]) box(c.g, 0.3, 0.7, 3.4, '#a8a094', sx * 2.2, 0.5, 31); });
  // ── Haetae guardians before the gate, facing out.
  haetae(c, -13, 13, 0); haetae(c, 13, 13, 0);
  o.colliders.push({ x: -13, z: 13, r: 1.9, h: 4.5 }, { x: 13, z: 13, r: 1.9, h: 4.5 });
  // ── The palace wall running off either side: a stone footing, plastered wall, a tiled cap.
  for (const sx of [-1, 1]) {
    const x0 = sx * (W / 2), x1 = sx * 40, mid = (x0 + x1) / 2, len = Math.abs(x1 - x0);
    surf(c, SURF.ashlar, () => box(c.g, len, 1.6, 1.4, granite, mid, 0, 0));
    surf(c, SURF.plaster, () => box(c.g, len, 2, 1.1, '#d8c8a8', mid, 1.6, 0));
    c.g.add(new THREE.CylinderGeometry(0.9, 0.9, len, 3, 1).rotateZ(Math.PI / 2), tile, M(mid, 3.7, 0, 0, 1, 0.5, 1));
    for (let k = 0; k < len; k += 4) o.colliders.push({ x: x0 + sx * (k + 2), z: 0, r: 2.1, h: 4 });
  }
  // ── Banners of the five colours on tall poles either side of the forecourt.
  const five = ['#3a6aa8', '#c23b2a', '#f4efe4', '#1f1f24', '#e2b43a'];
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const x = sx * (19 + i * 3.2), z = 15;
    cyl(c.g, 0.1, 0.13, 9, '#6a4a32', x, 0, z, 6);
    cone(c.g, 0.2, 0.6, '#d4af37', x, 9, z, 6);
    box(c.g, 1.3, 4.2, 0.04, five[(i + (sx > 0 ? 2 : 0)) % 5], x + 0.7, 4.4, z);
    box(c.g, 1.3, 0.3, 0.05, five[(i + 3) % 5], x + 0.7, 8.4, z);
    o.colliders.push({ x, z, r: 0.3, h: 9 });
  }
  o.height = height;
};

// ───────────────────────────── China ─────────────────────────────

/** A round roof: a concave cone of glazed tiles from the eave (radius `eave`) up to `top`, rows of tiles and a tile-end ring. */
function roundRoof(c: Ctx, y: number, eave: number, top: number, rise: number, tile: string, ridge: string, under: string): void {
  const N = 40, J = 8, thick = 0.38;
  const pt = (a: number, t: number, low = false) => {
    const r = eave + (top - eave) * t, h = low ? -thick + rise * 0.15 * t : rise * Math.pow(t, 1.7);
    return new THREE.Vector3(Math.cos(a) * r, y + h, Math.sin(a) * r);
  };
  const up: number[] = [], dn: number[] = [], edge: number[] = [];
  const push = (arr: number[], ...v: THREE.Vector3[]) => { for (const q of v) arr.push(q.x, q.y, q.z); };
  for (let i = 0; i < N; i++) {
    const a0 = (i / N) * Math.PI * 2, a1 = ((i + 1) / N) * Math.PI * 2;
    for (let j = 0; j < J; j++) push(up, pt(a0, j / J), pt(a1, j / J), pt(a1, (j + 1) / J), pt(a0, j / J), pt(a1, (j + 1) / J), pt(a0, (j + 1) / J));
    push(dn, pt(a0, 0, true), pt(a1, 0, true), pt(a1, 0.7, true), pt(a0, 0, true), pt(a1, 0.7, true), pt(a0, 0.7, true));
    push(edge, pt(a0, 0), pt(a1, 0), pt(a1, 0, true), pt(a0, 0), pt(a1, 0, true), pt(a0, 0, true));
  }
  // Each face checked for its own facing: split into quarters so "outward" holds for each.
  const quarter = (arr: number[], per: number, want: (a: number) => THREE.Vector3, col: string, sf = 0) => {
    for (let q = 0; q < 4; q++) {
      const slice = arr.slice(q * per * (N / 4), (q + 1) * per * (N / 4)), a = ((q + 0.5) / 4) * Math.PI * 2;
      surf(c, sf, () => c.g.add(tris(slice, want(a)), col));
    }
  };
  quarter(up, J * 18, (a) => new THREE.Vector3(Math.cos(a), 1.5, Math.sin(a)), tile, SURF.glazed);
  quarter(dn, 18, () => new THREE.Vector3(0, -1, 0), under);
  quarter(edge, 18, (a) => new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), ridge);
  const rows = Math.round(eave * 2.2);
  for (let k = 0; k < rows; k++) {
    const a = (k / rows) * Math.PI * 2, pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 5; j++) pts.push(pt(a, (j / 5) * 0.96).add(new THREE.Vector3(0, 0.07, 0)));
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 5, 0.07, 3), ridge);
  }
  c.g.add(new THREE.TorusGeometry(eave, 0.12, 5, 64), ridge, M(0, y + 0.02, 0, 0, 1, 1, 1, Math.PI / 2, 0));
}

/**
 * A round drum of the hall: red columns round it, lattice doors between them (gold lattice on
 * red), green-and-blue painted beams with gold, and a ring of bracket sets carrying the eave.
 * Returns the eave height.
 */
function roundDrum(c: Ctx, y: number, r: number, h: number, n: number, doors: boolean): number {
  const red = '#b3262a', green = '#2f7a5a', blue = '#2a4a9a', gold = '#d4af37';
  surf(c, SURF.boards, () => cyl(c.g, r - 0.25, r - 0.25, h, '#8a2a22', 0, y, 0, n * 2));
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, a2 = ((i + 0.5) / n) * Math.PI * 2;
    cyl(c.g, 0.34, 0.36, h, red, Math.cos(a) * r, y, Math.sin(a) * r, 12);
    const bw = 2 * r * Math.sin(Math.PI / n) - 0.9;
    c.g.frame(Math.cos(a2) * (r - 0.18), y, Math.sin(a2) * (r - 0.18), Math.PI / 2 - a2, 1, () => c.glow.frame(Math.cos(a2) * (r - 0.18), y, Math.sin(a2) * (r - 0.18), Math.PI / 2 - a2, 1, () => {
      if (doors) {
        box(c.g, bw, h - 1.2, 0.1, red, 0, 0.3, 0);
        for (let q = 1; q < 6; q++) box(c.g, 0.05, h - 1.8, 0.12, gold, -bw / 2 + (q * bw) / 6, 0.6, 0.02);
        for (let q = 1; q < 8; q++) box(c.g, bw - 0.2, 0.05, 0.12, gold, 0, 0.6 + (q * (h - 1.8)) / 8, 0.02);
        box(c.glow, bw - 0.3, h - 1.9, 0.02, '#ffd9a0', 0, 0.65, 0.06); // papered, lit from within at night
      } else {
        box(c.g, bw, h * 0.4, 0.1, red, 0, h * 0.3, 0);
        for (let q = 1; q < 6; q++) box(c.g, 0.05, h * 0.36, 0.12, gold, -bw / 2 + (q * bw) / 6, h * 0.32, 0.02);
      }
      // The painted beam above: blue and green panels framed in gold.
      box(c.g, bw + 0.9, 0.55, 0.3, green, 0, h - 0.7, 0.05);
      for (let q = 0; q < 3; q++) box(c.g, (bw + 0.9) / 4, 0.4, 0.05, q === 1 ? blue : '#3a8a6a', -(bw + 0.9) / 3 + q * (bw + 0.9) / 3, h - 0.63, 0.22);
      box(c.g, bw + 0.9, 0.06, 0.34, gold, 0, h - 0.18, 0.05);
    }));
  }
  // Bracket sets all round, stepping out, blue and green with red blocks.
  const sets = n * 4;
  for (let i = 0; i < sets; i++) {
    const a = (i / sets) * Math.PI * 2;
    for (let t = 0; t < 3; t++) {
      const rr = r + 0.1 + t * 0.4;
      box(c.g, 0.3, 0.22, 0.3, t === 1 ? '#c23b2a' : blue, Math.cos(a) * rr, y + h + t * 0.3, Math.sin(a) * rr, Math.PI / 2 - a);
      box(c.g, 0.24, 0.1, 0.5, green, Math.cos(a) * (rr - 0.2), y + h + 0.22 + t * 0.3, Math.sin(a) * (rr - 0.2), Math.PI / 2 - a);
    }
  }
  for (let t = 0; t < 3; t++) c.g.add(new THREE.TorusGeometry(r + 0.1 + t * 0.4, 0.08, 4, 64), green, M(0, y + h + 0.27 + t * 0.3, 0, 0, 1, 1, 1, Math.PI / 2, 0));
  // Round rafters fanning out under the eave.
  const nr = Math.round(r * 5);
  for (let i = 0; i < nr; i++) {
    const a = (i / nr) * Math.PI * 2;
    c.g.add(new THREE.CylinderGeometry(0.09, 0.09, 2.6, 5).rotateX(Math.PI / 2 + 0.15), '#5a3a26', M(Math.cos(a) * (r + 1.5), y + h + 1.2, Math.sin(a) * (r + 1.5), Math.PI / 2 - a));
  }
  return y + h + 1.55;
}

/** A marble balustrade round a circle of radius r at height y: posts with cloud caps, panels between. */
function balustrade(c: Ctx, r: number, y: number, gaps: number[] = []): void {
  const marble = '#f4f0e6', n = Math.round((r * Math.PI * 2) / 1.6);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (gaps.some((g) => Math.abs(Math.atan2(Math.sin(a - g), Math.cos(a - g))) < 3.4 / r)) continue;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    box(c.g, 0.22, 1.05, 0.22, marble, x, y, z, Math.PI / 2 - a);
    cyl(c.g, 0.14, 0.12, 0.28, '#e8e4da', x, y + 1.05, z, 8);
    const a2 = ((i + 0.5) / n) * Math.PI * 2;
    box(c.g, 2 * r * Math.sin(Math.PI / n) - 0.2, 0.62, 0.12, marble, Math.cos(a2) * r, y + 0.12, Math.sin(a2) * r, Math.PI / 2 - a2);
  }
}

const china: Monument = (c, o) => {
  const marble = '#f4f0e6', blueTile = '#2a4a9a', ridgeC = '#1f3a7a', red = '#b3262a', gold = '#d4af37';
  // ── The square enclosure (heaven round within earth square): red walls, blue-tiled caps, a gate each side.
  for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
    for (const sx of [-1, 1]) {
      const x0 = sx * 5, x1 = sx * 31, mid = (x0 + x1) / 2, len = Math.abs(x1 - x0);
      surf(c, SURF.plaster, () => box(c.g, len, 3.6, 1, red, mid, 0, 31));
      c.g.add(new THREE.CylinderGeometry(0.9, 0.9, len + 0.4, 3, 1).rotateZ(Math.PI / 2), blueTile, M(mid, 3.9, 31, 0, 1, 0.45, 1));
    }
    // The lingxing gate: white marble posts with cloud caps, a lintel between them; open.
    for (const x of [-4.4, -1.6, 1.6, 4.4]) { cyl(c.g, 0.3, 0.34, 5.2, marble, x, 0, 31, 10); cyl(c.g, 0.45, 0.3, 0.5, marble, x, 5.2, 31, 10); }
    for (const [x, w] of [[-3, 2.4], [3, 2.4], [0, 2.8]] as const) { box(c.g, w + 0.6, 0.55, 0.5, marble, x, 4.2, 31); box(c.g, w + 0.2, 0.25, 0.55, gold, x, 3.9, 31); }
  });
  for (let side = 0; side < 4; side++) for (const x of [-4.4, -1.6, 1.6, 4.4]) {
    const a = (side * Math.PI) / 2;
    o.colliders.push({ x: x * Math.cos(a) + 31 * Math.sin(a), z: -x * Math.sin(a) + 31 * Math.cos(a), r: 0.45, h: 5.6 });
  }
  for (let side = 0; side < 4; side++) for (const sx of [-1, 1]) for (let k = 7; k < 31; k += 4.2) {
    const a = (side * Math.PI) / 2, lx = sx * k, lz = 31;
    o.colliders.push({ x: lx * Math.cos(a) + lz * Math.sin(a), z: -lx * Math.sin(a) + lz * Math.cos(a), r: 2.2, h: 4.4 });
  }
  // ── The Altar of Prayer: three white marble terraces, balustrades round each, stairs at the four points.
  const T = [23, 19.5, 16], step = 1.15;
  const gaps = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
  surf(c, SURF.marble, () => { for (let i = 0; i < 3; i++) cyl(c.g, T[i], T[i] + 0.2, step, marble, 0, i * step, 0, 48); });
  for (let i = 0; i < 3; i++) {
    balustrade(c, T[i] - 0.3, (i + 1) * step, gaps);
    o.platforms.push({ x: 0, z: 0, r: T[i], y: (i + 1) * step });
    // Rainspouts round the terrace's lip.
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2 + 0.13; c.g.add(new THREE.CylinderGeometry(0.1, 0.16, 0.8, 6).rotateX(Math.PI / 2), '#e8e4da', M(Math.cos(a) * (T[i] + 0.3), (i + 1) * step - 0.3, Math.sin(a) * (T[i] + 0.3), Math.PI / 2 - a)); }
  }
  for (const g of gaps) c.g.frame(0, 0, 0, Math.PI / 2 - g, 1, () => {
    for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) surf(c, SURF.marble, () => box(c.g, 6.4, (k + 1) * (step / 4) + i * step, 0.9, '#ece8de', 0, 0, T[i] + 0.2 + (3 - k) * 0.9 - 3.6 + 3.6));
    // The carved ramp up the middle of the south stair: clouds in relief.
    for (let k = 0; k < 6; k++) sphere(c.g, 0.35, '#e0dccf', (k % 2 ? 0.5 : -0.5), 0.6 + k * 0.5, T[0] + 2.8 - k * 1.1, 6, 0.5);
  });
  // ── The Hall of Prayer for Good Harvests: three drums, three round blue roofs, a gilded crown.
  const y0 = 3 * step;
  surf(c, SURF.marble, () => cyl(c.g, 12.6, 12.8, 0.4, marble, 0, y0, 0, 40));
  let e = roundDrum(c, y0 + 0.4, 10.4, 5.6, 12, true);
  roundRoof(c, e, 13.8, 8.6, 2.2, blueTile, ridgeC, '#2f6a5a');
  e = roundDrum(c, e + 1.9, 8.2, 3.4, 12, false);
  roundRoof(c, e, 11.2, 6.2, 2.0, blueTile, ridgeC, '#2f6a5a');
  e = roundDrum(c, e + 1.7, 5.9, 3.0, 8, false);
  roundRoof(c, e, 8.4, 0.35, 5.6, blueTile, ridgeC, '#2f6a5a');
  const tip = e + 5.6;
  // The gilded crown: a stem of rings and a great golden ball.
  cyl(c.g, 0.35, 0.5, 1.4, gold, 0, tip - 0.3, 0, 12);
  for (let k = 0; k < 3; k++) c.g.add(new THREE.TorusGeometry(0.45 - k * 0.06, 0.08, 5, 16), gold, M(0, tip + 0.6 + k * 0.35, 0, 0, 1, 1, 1, Math.PI / 2, 0));
  sphere(c.g, 1.1, gold, 0, tip + 2.6, 0, 16);
  // The name board under the top eave, blue framed in gold (no writing).
  box(c.g, 1.8, 2.6, 0.2, gold, 0, e - 3.2, 6.05);
  box(c.g, 1.5, 2.3, 0.22, '#1f3a7a', 0, e - 3.05, 6.08);
  // Bronze incense burners on the upper terrace, before the doors.
  for (const sx of [-1, 1]) both(c, sx * 6, y0, 14, 0, () => {
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; cyl(c.g, 0.1, 0.14, 0.9, '#4a4a3a', Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6, 6); }
    c.g.add(new THREE.SphereGeometry(0.9, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#5a5a44', M(0, 1.6, 0));
    c.g.add(new THREE.TorusGeometry(0.9, 0.08, 5, 18), '#6a6a52', M(0, 1.6, 0, 0, 1, 1, 1, Math.PI / 2, 0));
    for (const sz of [-1, 1]) c.g.add(new THREE.TorusGeometry(0.25, 0.06, 4, 10), '#6a6a52', M(0, 1.9, sz * 0.9));
    cyl(c.g, 0.5, 0.7, 0.8, '#5a5a44', 0, 1.6, 0, 12); cone(c.g, 0.55, 0.7, '#6a6a52', 0, 2.4, 0, 12);
    sphere(c.glow, 0.2, '#ff9a4a', 0, 1.75, 0, 6);
  });
  o.colliders.push({ x: 0, z: 0, r: 11, h: tip + 4 }, { x: -6, z: 14, r: 1, h: y0 + 3 }, { x: 6, z: 14, r: 1, h: y0 + 3 });
  // Red silk lanterns hung all round under each of the three eaves.
  for (const [r, yy, n] of [[12.6, y0 + 0.4 + 5.6 + 1.2, 16], [10.4, y0 + 13.4, 12], [7.6, y0 + 19.3, 8]] as const) for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + 0.2; redLantern(c, Math.cos(a) * r, yy, Math.sin(a) * r, 1.1); }
  // Guardian lions either side of the south stair, on the ground before the terraces.
  for (const sx of [-1, 1]) guardianLion(c, sx * 5.4, 26.6, Math.PI / 2 - Math.PI / 2, 1.2, '#c8c0b0', ANIMAL_HEAD_GAP);
  o.colliders.push({ x: -5.4, z: 26.6, r: 1.6, h: 4 }, { x: 5.4, z: 26.6, r: 1.6, h: 4 });
  // The processional way from the south gate: white marble slabs, red lanterns on posts along it.
  surf(c, SURF.marble, () => box(c.g, 6, 0.24, 6, '#f4f0e6', 0, 0, 28));
  for (const sx of [-1, 1]) for (const z of [26, 29.5]) { cyl(c.g, 0.1, 0.12, 3.2, '#b3262a', sx * 3.6, 0, z, 8); box(c.g, 1, 0.1, 0.1, '#b3262a', sx * 3.6 - sx * 0.4, 3.2, z); redLantern(c, sx * 3.6 - sx * 0.8, 3.2, z, 0.9); }
  // Groves of old cypresses in the enclosure's four corners.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    const x = sx * (24.5 + i * 2.4), z = sz * (18 + j * 3.6);
    if (Math.hypot(x, z) < 24.5) continue;
    tree(c.g, 'cypress', x, 0, z, 1 + ((i + j) % 2) * 0.15, () => c.rng.next());
  }
  o.height = tip + 4;
};

// ───────────────────────────── Norway ─────────────────────────────

/** A steep pitched roof: a triangular prism `w` wide, `len` long (along z), `rise` high at y, with bargeboards and a ridge. */
function pitched(c: Ctx, w: number, len: number, rise: number, col: string, trim: string, x: number, y: number, z: number, ry = 0): void {
  const sh = new THREE.Shape([new THREE.Vector2(-w / 2, 0), new THREE.Vector2(w / 2, 0), new THREE.Vector2(0, rise)]);
  const geo = new THREE.ExtrudeGeometry(sh, { depth: len, bevelEnabled: false });
  geo.translate(0, 0, -len / 2);
  c.g.frame(x, y, z, ry, 1, () => {
    surf(c, SURF.slate, () => c.g.add(geo, col));
    for (const sz of [-1, 1]) for (const sx of [-1, 1]) rod(c.g, new THREE.Vector3(sx * (w / 2 + 0.1), -0.05, sz * (len / 2 + 0.06)), new THREE.Vector3(0, rise + 0.05, sz * (len / 2 + 0.06)), 0.1, trim, 5);
    box(c.g, 0.22, 0.22, len + 0.3, trim, 0, rise - 0.08, 0);
  });
}

/** A carved finial rising from a gable's peak and curling back over (the stave churches' dragons, here plain scrolls). */
function scroll(c: Ctx, x: number, y: number, z: number, dir: number, s: number, col: string): void {
  const pts = [[0, 0, 0], [0, 0.7, 0.5], [0, 1.5, 0.75], [0, 2.0, 0.45], [0, 1.9, 0.05], [0, 1.6, 0.15]].map(([a, b, cc]) => new THREE.Vector3(x + a * s, y + b * s, z + dir * cc * s));
  c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.13 * s, 6), col);
}

const norway: Monument = (c, o) => {
  const tar = '#3a2a22', shingle = '#4a3a2e', trim = '#2a1f1a', light = '#8a6a4a', stone = '#8a8680';
  // ── The stone sill and the ambulatory (svalgang): a low boarded wall, an arcade of little round arches, a lean-to roof.
  surf(c, SURF.ashlar, () => box(c.g, 13.4, 0.6, 20.4, stone));
  const gx = 6.3, gz = 9.6, y0 = 0.6;
  for (let side = 0; side < 4; side++) {
    const alongX = side % 2 === 0, len = alongX ? 2 * gx : 2 * gz, out = alongX ? gz : gx;
    c.g.frame(0, y0, 0, (side * Math.PI) / 2, 1, () => {
      const door = side === 0;
      surf(c, SURF.boards, () => { for (const sx of [-1, 1]) box(c.g, door ? len / 2 - 1.2 : len / 2, 0.95, 0.18, tar, sx * (door ? len / 4 + 0.6 : len / 4), 0, out); });
      const n = Math.round(len / 0.9);
      for (let k = 0; k <= n; k++) {
        const x = -len / 2 + (k * len) / n;
        if (door && Math.abs(x) < 1.1) continue;
        box(c.g, 0.12, 1.5, 0.14, tar, x, 0.95, out);
        if (k < n && !(door && Math.abs(x + len / (2 * n)) < 1.2)) c.g.add(new THREE.TorusGeometry(len / (2 * n) - 0.06, 0.05, 4, 10, Math.PI), tar, M(x + len / (2 * n), 2.2, out));
      }
      box(c.g, len + 0.3, 0.2, 0.2, tar, 0, 2.45, out);
      // The lean-to: from the aisle wall down and out over the arcade.
      surf(c, SURF.slate, () => c.g.add(new THREE.BoxGeometry(len + 1.2, 0.14, 2.8), shingle, M(0, 2.95, out - 0.75, 0, 1, 1, 1, 0.36, 0)));
    });
  }
  // ── The aisles: boarded walls to 5 m, a hipped roof over them that the tall nave rises through.
  surf(c, SURF.boards, () => box(c.g, 9.2, 4.4, 16.4, tar, 0, y0, 0));
  surf(c, SURF.slate, () => { c.g.add(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), shingle, M(0, y0 + 4.4, 0, 0, 10.8, 5, 18)); });
  // ── The nave: tall and narrow, round windows high up, a steep roof, a carved finial on each gable.
  const ny = y0 + 4.4, nh = 6.4;
  surf(c, SURF.boards, () => box(c.g, 5.8, nh, 11.6, tar, 0, ny, 0));
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) c.glow.add(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12).rotateZ(Math.PI / 2), '#ffcf7a', M(sx * 2.92, ny + nh - 1.2, -4 + k * 2.7));
  pitched(c, 7.2, 12.6, 5.6, shingle, trim, 0, ny + nh, 0);
  const ridge = ny + nh + 5.6;
  for (const sz of [-1, 1]) {
    scroll(c, 0, ridge - 0.1, sz * 6.3, sz, 1.1, trim);
    // Crossed bargeboards at the peak.
    for (const sx of [-1, 1]) rod(c.g, new THREE.Vector3(0, ridge - 0.3, sz * 6.35), new THREE.Vector3(sx * 0.8, ridge + 0.9, sz * 6.35), 0.09, trim, 5);
  }
  // ── The tower over the crossing: three shrinking tiers, each with its little roof, then the spire.
  let ty = ridge - 1.4;
  for (let t = 0; t < 3; t++) {
    const tw = 3.2 - t * 0.6, th = 1.8 - t * 0.2;
    surf(c, SURF.boards, () => box(c.g, tw, th, tw, tar, 0, ty, 0));
    for (let side = 0; side < 4; side++) c.g.frame(0, ty, 0, (side * Math.PI) / 2, 1, () => { for (let k = -1; k <= 1; k++) box(c.g, 0.12, th * 0.6, 0.06, light, k * tw * 0.25, th * 0.2, tw / 2 + 0.02); });
    surf(c, SURF.slate, () => c.g.add(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), shingle, M(0, ty + th, 0, 0, tw + 1.6, 1.3, tw + 1.6)));
    for (const sz of [-1, 1]) scroll(c, 0, ty + th + 0.9, sz * (tw / 2 + 0.3), sz, 0.55, trim);
    ty += th + 0.6;
  }
  surf(c, SURF.slate, () => cone(c.g, 1.2, 7.5, shingle, 0, ty - 0.2, 0, 8));
  sphere(c.g, 0.22, '#c9a24a', 0, ty + 7.4, 0, 8);
  cyl(c.g, 0.03, 0.03, 1.3, '#2a2a2a', 0, ty + 7.5, 0, 4);
  box(c.g, 0.6, 0.3, 0.03, '#c9a24a', 0.25, ty + 8.3, 0); // a weather vane
  const height = ty + 8.8;
  // ── The apse at the east end: round, with a conical roof and a little round tower of its own.
  surf(c, SURF.boards, () => cyl(c.g, 2.6, 2.6, 5, tar, 0, y0, -9.8, 14));
  surf(c, SURF.slate, () => cone(c.g, 3.3, 2.6, shingle, 0, y0 + 5, -9.8, 14));
  surf(c, SURF.boards, () => cyl(c.g, 1.1, 1.1, 2.2, tar, 0, y0 + 6.4, -9.8, 10));
  surf(c, SURF.slate, () => cone(c.g, 1.5, 4, shingle, 0, y0 + 8.6, -9.8, 10));
  // ── The west portal: a round-headed door framed by two carved columns and a panel of interlaced ribbon-work.
  const pz = 8.25;
  c.g.add(new THREE.BoxGeometry(3.6, 4.2, 0.2), '#5a4230', M(0, y0 + 2.1, pz));
  for (const sx of [-1, 1]) { cyl(c.g, 0.2, 0.22, 3.4, light, sx * 1.35, y0, pz + 0.15, 10); sphere(c.g, 0.3, light, sx * 1.35, y0 + 3.5, pz + 0.15, 8); }
  box(c.g, 1.8, 2.8, 0.1, trim, 0, y0, pz + 0.12);
  c.g.add(new THREE.CylinderGeometry(0.9, 0.9, 0.1, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), trim, M(0, y0 + 2.8, pz + 0.12));
  for (let k = 0; k < 7; k++) {
    // Ribbon-work: long looping bands winding up both sides of the door.
    const pts: THREE.Vector3[] = [];
    for (let j = 0; j <= 12; j++) { const t = j / 12; pts.push(new THREE.Vector3((k % 2 ? 1 : -1) * (1.25 + 0.35 * Math.sin(t * Math.PI * 3 + k)), y0 + 0.3 + t * 3.6, pz + 0.24)); }
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.05, 4), light);
  }
  box(c.glow, 0.5, 0.5, 0.04, '#ffcf7a', 0, y0 + 3.3, pz + 0.14);
  o.colliders.push({ x: 0, z: -4.5, r: 6.6, h: height }, { x: 0, z: 4, r: 6.6, h: height }, { x: 0, z: -9.8, r: 3, h: 12 });
  for (const [x, z] of [[-5.5, 8.6], [5.5, 8.6], [-5.5, -8.6], [5.5, -8.6]] as const) o.colliders.push({ x, z, r: 1.4, h: 4 });

  // ── The bell tower (klokketårn) in the churchyard: a tapering boarded tower, open louvres, a shingled cap.
  c.g.frame(11, 0, 9, -0.2, 1, () => {
    surf(c, SURF.boards, () => c.g.add(new THREE.CylinderGeometry(1.6, 2.4, 7, 4).rotateY(Math.PI / 4).translate(0, 3.5, 0), tar));
    for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => { for (let k = 0; k < 4; k++) box(c.g, 1.6, 0.08, 0.1, light, 0, 5.2 + k * 0.35, 1.25); });
    surf(c, SURF.slate, () => c.g.add(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), shingle, M(0, 7, 0, 0, 4.4, 4, 4.4)));
    sphere(c.g, 0.16, '#c9a24a', 0, 11.1, 0, 6);
  });
  o.colliders.push({ x: 11, z: 9, r: 2.2, h: 11 });
  // ── The churchyard's stave fence, and a roofed lych-gate on the path.
  for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
    const out = side % 2 === 0 ? 17 : 15, len = side % 2 === 0 ? 30 : 34;
    for (let k = 0; k <= len / 0.3; k++) {
      const x = -len / 2 + k * 0.3;
      if (side === 0 && Math.abs(x) < 1.6) continue;
      box(c.g, 0.24, 1.1 + (k % 2) * 0.12, 0.06, '#6a4e36', x, 0, out);
    }
    box(c.g, len, 0.1, 0.1, '#5a4230', 0, 0.8, out - 0.05);
  });
  c.g.frame(0, 0, 17, 0, 1, () => {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(c.g, 0.12, 0.14, 2.6, tar, sx * 1.5, 0, sz * 0.8, 6);
    pitched(c, 4, 2.6, 1.6, shingle, trim, 0, 2.6, 0, Math.PI / 2);
    scroll(c, 1.4, 4.1, 0, 1, 0.4, trim);
  });
  // ── Iron hinges on the portal, a stone path from the lych-gate lit by iron lanterns, headstones, a stabbur.
  ironHinges(c, 0, y0, pz + 0.18, 1.8, 2.8);
  surf(c, SURF.flagstone, () => box(c.g, 2.2, 0.08, 7.5, '#8a8680', 0, 0, 13));
  for (const sx of [-1, 1]) for (const z of [11, 15]) ironLantern(c, sx * 1.7, z);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) headstone(c, -12.5 + i * 1.6, -7 + j * 2.4, 0.9 + ((i + j) % 3) * 0.1);
  stabbur(c, 10, -10, 0.3, tar);
  o.colliders.push({ x: 10, z: -10, r: 2.4, h: 6 });
  // ── Pines and birches round the yard.
  for (const [x, z, k] of [[-13, -12, 'pine'], [13, -13, 'pine'], [-14, 4, 'pine'], [-12, 13, 'oak'], [14, -2, 'pine']] as const) tree(c.g, k, x, 0, z, 1.1, () => c.rng.next());
  o.height = height;
};

// ───────────────────────────── Switzerland ─────────────────────────────

/** A clock face on the +z plane at (x, y, z): a dark dial, a gold ring, hour marks, a sun-tipped hand and a short hand. */
function dial(c: Ctx, x: number, y: number, z: number, r: number, face: string, ry = 0): void {
  c.g.frame(x, y, z, ry, 1, () => c.glow.frame(x, y, z, ry, 1, () => {
    c.g.add(new THREE.CylinderGeometry(r, r, 0.12, 32).rotateX(Math.PI / 2), face);
    c.g.add(new THREE.TorusGeometry(r, r * 0.07, 5, 40), '#d4af37', M(0, 0, 0.06));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; box(c.g, r * 0.06, r * 0.18, 0.04, '#d4af37', Math.sin(a) * r * 0.8, Math.cos(a) * r * 0.8 - r * 0.09, 0.07, 0); }
    c.g.add(new THREE.BoxGeometry(r * 0.06, r * 0.75, 0.04).translate(0, r * 0.37, 0), '#d4af37', M(0, 0, 0.1, 0, 1, 1, 1, 0, -0.8));
    c.g.add(new THREE.BoxGeometry(r * 0.08, r * 0.5, 0.04).translate(0, r * 0.25, 0), '#d4af37', M(0, 0, 0.12, 0, 1, 1, 1, 0, 2.1));
    sphere(c.g, r * 0.1, '#d4af37', Math.sin(0.8) * r * 0.72, Math.cos(0.8) * r * 0.72, 0.12, 8);
    c.glow.add(new THREE.CylinderGeometry(r * 0.12, r * 0.12, 0.04, 12).rotateX(Math.PI / 2), '#fff0b0', M(0, 0, 0.13));
  }));
}

const switzerland: Monument = (c, o) => {
  const sand = '#c8b68a', quoin = '#b0a078', red = '#c23b2a', roofC = '#6a3a2a', gold = '#d4af37', white = '#f4efe4';
  const W = 11, H = 32, P = 9;
  // ── The gate: an arched passage through the tower's foot.
  const sh = new THREE.Shape();
  sh.moveTo(-W / 2, 0); sh.lineTo(-2.3, 0); sh.lineTo(-2.3, 4.2); sh.absarc(0, 4.2, 2.3, Math.PI, 0, true); sh.lineTo(2.3, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, P); sh.lineTo(-W / 2, P); sh.lineTo(-W / 2, 0);
  const foot = new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: false, curveSegments: 14 });
  foot.translate(0, 0, -W / 2);
  surf(c, SURF.ashlar, () => { c.g.add(foot, sand); box(c.g, W, H - P, W, sand, 0, P, 0); });
  for (const sz of [-1, 1]) c.g.add(new THREE.TorusGeometry(2.55, 0.25, 4, 18, Math.PI), quoin, M(0, 4.2, sz * (W / 2 + 0.05)));
  // Rusticated corner quoins, long and short in turn; string courses between the storeys.
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) for (let k = 0; k * 0.9 < H; k++) {
    const long = k % 2 === 0;
    box(c.g, long ? 1.3 : 0.8, 0.85, 0.2, quoin, sx * (W / 2 - (long ? 0.65 : 0.4)), k * 0.9, sz * (W / 2 + 0.06));
    box(c.g, 0.2, 0.85, long ? 0.8 : 1.3, quoin, sx * (W / 2 + 0.06), k * 0.9, sz * (W / 2 - (long ? 0.4 : 0.65)));
  }
  for (const y of [P, 16, 24, H]) box(c.g, W + 0.5, 0.4, W + 0.5, quoin, 0, y - 0.2, 0);
  // Windows with red-and-white chevron shutters on every face, a flower box under each.
  for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
    for (const y of [10.5, 18, 26]) for (const x of side % 2 === 0 ? [-3, 3] : [-2.6, 0, 2.6]) {
      if (side % 2 === 0 && y === 18) continue; // the great clock is there
      box(c.glow, 1.1, 1.8, 0.05, '#ffd9a0', x, y, W / 2 + 0.01);
      box(c.g, 1.4, 0.18, 0.2, quoin, x, y - 0.18, W / 2 + 0.05);
      for (const sx of [-1, 1]) {
        box(c.g, 0.6, 1.8, 0.06, white, x + sx * 0.9, y, W / 2 + 0.06);
        for (let k = 0; k < 4; k++) c.g.add(new THREE.BoxGeometry(0.62, 0.12, 0.03), red, M(x + sx * 0.9, y + 0.25 + k * 0.4, W / 2 + 0.1, 0, 1, 1, 1, 0, sx * 0.5));
      }
      box(c.g, 1.3, 0.3, 0.35, '#6a4a32', x, y - 0.5, W / 2 + 0.25);
      for (let k = 0; k < 5; k++) sphere(c.g, 0.12, k % 2 ? '#e8242a' : '#ff5a6a', x - 0.5 + k * 0.25, y - 0.12, W / 2 + 0.3, 5);
    }
  }));
  // ── The astronomical clock over the arch on the town side: a square dial with the zodiac ring, astrolabe rings and the moon ball.
  const az = W / 2 + 0.08;
  box(c.g, 5.2, 5, 0.12, '#1f2f6a', 0, 9.8, az);
  box(c.g, 5.6, 0.3, 0.3, gold, 0, 9.6, az + 0.05); box(c.g, 5.6, 0.3, 0.3, gold, 0, 14.8, az + 0.05);
  c.g.add(new THREE.TorusGeometry(2.1, 0.28, 5, 48), '#e2b43a', M(0, 12.3, az + 0.1));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.g.add(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 10).rotateX(Math.PI / 2), ['#c23b2a', '#2f7a5a', '#3a6aa8'][i % 3], M(Math.cos(a) * 2.1, 12.3 + Math.sin(a) * 2.1, az + 0.3)); }
  for (const [r, off] of [[1.4, 0.3], [0.9, -0.2]] as const) c.g.add(new THREE.TorusGeometry(r, 0.05, 4, 36), gold, M(off, 12.3 + off * 0.5, az + 0.2));
  sphere(c.g, 0.3, '#e8e8f0', 0.9, 12.9, az + 0.3, 12); sphere(c.g, 0.3, '#1f1f24', 0.95, 12.9, az + 0.34, 12, 1); // the moon, half dark
  // Above it, the little stage where the procession turns: an arched opening and a gilded cockerel on a perch (no face).
  archPanel(c.g, 3, 1.8, '#3a2a22', 0, 15.2, az, 0, 0.1);
  c.g.add(new THREE.SphereGeometry(0.35, 10, 8).scale(1.2, 1, 0.8), gold, M(1.2, 16.9, az + 0.3)); cone(c.g, 0.2, 0.5, '#c23b2a', 1.55, 17.1, az + 0.3, 6);
  // ── The great clock on the upper faces, north and south.
  dial(c, 0, 19.2, W / 2 + 0.1, 2.5, '#1f2f6a');
  dial(c, 0, 19.2, -W / 2 - 0.1, 2.5, '#1f2f6a', Math.PI);
  // ── The steep helm roof, dormers on it, and the bell lantern (dachreiter) on its ridge with its bell.
  surf(c, SURF.clayTile, () => c.g.add(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), roofC, M(0, H, 0, 0, W + 1.6, 13, W + 1.6)));
  for (let side = 0; side < 4; side++) c.g.frame(0, H, 0, (side * Math.PI) / 2, 1, () => { box(c.g, 1.2, 1.4, 1.2, sand, 0, 2, 4.2); surf(c, SURF.clayTile, () => c.g.add(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), roofC, M(0, 3.4, 4.2, 0, 1.6, 1, 1.6))); });
  const ly = H + 9.5;
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cyl(c.g, 0.1, 0.1, 2.6, white, Math.cos(a) * 0.95, ly, Math.sin(a) * 0.95, 6); }
  c.g.add(new THREE.LatheGeometry([[0, 0], [0.7, 0], [0.62, 0.3], [0.5, 0.9], [0.2, 1.1], [0, 1.15]].map(([a, b]) => new THREE.Vector2(a, b)), 14), '#8a7a4a', M(0, ly + 0.8, 0));
  surf(c, SURF.clayTile, () => cone(c.g, 1.3, 4.6, roofC, 0, ly + 2.6, 0, 8));
  sphere(c.g, 0.3, gold, 0, ly + 7.3, 0, 10);
  cyl(c.g, 0.03, 0.03, 1.4, '#2a2a2a', 0, ly + 7.5, 0, 4);
  box(c.g, 0.7, 0.35, 0.03, gold, 0.3, ly + 8.5, 0);
  const height = ly + 9;
  // The gilded bell-striker beside the bell, hammer raised (a robed figure; its head floats free).
  cone(c.g, 0.35, 1.2, gold, 0.55, ly, 0, 8); sphere(c.g, 0.16, gold, 0.55, ly + 1.2 + HEAD_GAP + 0.18, 0, 8);
  c.g.add(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 5), gold, M(0.3, ly + 1.1, 0, 0, 1, 1, 1, 0, 0.8)); box(c.g, 0.25, 0.14, 0.14, gold, 0.02, ly + 1.4, 0);
  // A painted band of heraldic shields round the tower at the string course.
  for (let side = 0; side < 4; side++) c.g.frame(0, 16.4, 0, (side * Math.PI) / 2, 1, () => {
    for (let k = -2; k <= 2; k++) {
      const sh = new THREE.Shape([new THREE.Vector2(-0.45, 0.5), new THREE.Vector2(0.45, 0.5), new THREE.Vector2(0.45, 0), new THREE.Vector2(0, -0.55), new THREE.Vector2(-0.45, 0)]);
      c.g.add(new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false }), ['#c23b2a', '#e2b43a', '#1f1f24', '#2f5a9a', '#2f7a4a'][(k + 2 + side) % 5], M(k * 2, 0.7, W / 2 + 0.26));
      box(c.g, 0.2, 0.7, 0.03, '#f4efe4', k * 2, 0.4, W / 2 + 0.33);
    }
  });
  // ── The square round the tower: a cobbled rosette, geranium planters, benches, Bernese lamp standards.
  for (let ring = 0; ring < 4; ring++) c.g.add(new THREE.TorusGeometry(10 + ring * 3, 0.12, 3, 64), '#8a8278', M(0, 0.04, 0, 0, 1, 1, 1, Math.PI / 2, 0));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.g.add(new THREE.BoxGeometry(0.16, 0.04, 9), '#8a8278', M(Math.cos(a) * 14.5, 0.04, Math.sin(a) * 14.5, Math.PI / 2 - a)); }
  for (const [x, z] of [[-9, 10], [9, 10], [-9, -10], [9, -10]] as const) {
    box(c.g, 2.4, 0.7, 1, '#6a4a32', x, 0, z);
    for (let k = 0; k < 7; k++) { sphere(c.g, 0.2, k % 2 ? '#e8242a' : '#ff5a6a', x - 0.9 + k * 0.3, 0.85, z, 5); sphere(c.g, 0.18, '#3f7a3a', x - 0.9 + k * 0.3, 0.7, z + 0.3, 4); }
    box(c.g, 2.2, 0.1, 0.6, '#8a5a36', x, 0.45, z + 1.4); box(c.g, 2.2, 0.6, 0.08, '#8a5a36', x, 0.5, z + 1.72); for (const sx of [-1, 1]) box(c.g, 0.08, 0.45, 0.5, '#2a2a2a', x + sx, 0, z + 1.4);
  }
  for (const [x, z] of [[-13, 4], [13, 4], [-13, -6], [13, -6]] as const) {
    cyl(c.g, 0.1, 0.16, 4, '#2a3a2a', x, 0, z, 8);
    for (const sx of [-1, 1]) { box(c.g, 0.6, 0.05, 0.05, '#2a3a2a', x + sx * 0.3, 3.9, z); box(c.glow, 0.3, 0.42, 0.3, '#ffe6a0', x + sx * 0.6, 3.4, z); cone(c.g, 0.24, 0.3, '#2a3a2a', x + sx * 0.6, 3.82, z, 4, Math.PI / 4); }
    o.colliders.push({ x, z, r: 0.4, h: 4 });
  }
  // Colliders on the two walls beside the passage, so the gate can be walked through.
  for (const sx of [-1, 1]) for (const z of [-3.8, 0, 3.8]) o.colliders.push({ x: sx * 3.9, z, r: 1.75, h: height });
  // ── A column fountain before the tower: an octagonal trough, a spouting column, a gilded crown and flowers.
  c.g.frame(0, 0, 17, 0, 1, () => c.glow.frame(0, 0, 17, 0, 1, () => {
    surf(c, SURF.ashlar, () => cyl(c.g, 2.4, 2.5, 0.9, '#a8a098', 0, 0, 0, 8));
    cyl(c.g, 2.2, 2.2, 0.05, '#3a7a9a', 0, 0.82, 0, 8);
    surf(c, SURF.ashlar, () => cyl(c.g, 0.3, 0.38, 4.2, '#b8b0a4', 0, 0.9, 0, 10));
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; c.g.add(new THREE.CylinderGeometry(0.04, 0.04, 0.8, 5).rotateZ(Math.PI / 2), '#8a8a7a', M(Math.cos(a) * 0.5, 1.8, Math.sin(a) * 0.5, -a)); cyl(c.glow, 0.03, 0.05, 0.9, '#dff6ff', Math.cos(a) * 0.95, 0.9, Math.sin(a) * 0.95, 4); }
    cyl(c.g, 0.6, 0.4, 0.4, gold, 0, 5.1, 0, 10);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cone(c.g, 0.12, 0.5, gold, Math.cos(a) * 0.45, 5.5, Math.sin(a) * 0.45, 5); }
    sphere(c.g, 0.25, gold, 0, 5.9, 0, 8);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; sphere(c.g, 0.16, i % 2 ? '#e8242a' : '#ffffff', Math.cos(a) * 2.35, 0.95, Math.sin(a) * 2.35, 5); }
  }));
  o.colliders.push({ x: 0, z: 17, r: 2.6, h: 6 });
  o.height = height;
};

// ───────────────────────────── London ─────────────────────────────

/** A Gothic pinnacle: a slender shaft, a crocketed spirelet and a gilded tip. */
function pinnacle(c: Ctx, x: number, y: number, z: number, h: number, stone: string): void {
  box(c.g, h * 0.16, h * 0.35, h * 0.16, stone, x, y, z);
  cone(c.g, h * 0.1, h * 0.65, stone, x, y + h * 0.35, z, 4, Math.PI / 4);
  for (let k = 0; k < 3; k++) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; sphere(c.g, h * 0.03, stone, x + Math.cos(a) * h * (0.08 - k * 0.022), y + h * (0.45 + k * 0.15), z + Math.sin(a) * h * (0.08 - k * 0.022), 4); }
  sphere(c.g, h * 0.035, '#d4af37', x, y + h, z, 5);
}

/** A Perpendicular window on the +z plane: a pointed glow, stone mullions and a transom, a hood-mould over it. */
function gothicWindow(c: Ctx, x: number, y: number, z: number, w: number, h: number, stone: string): void {
  archPanelPointed(c, x, y, z, w, h);
  for (let k = 1; k < 3; k++) box(c.g, 0.08, h * 0.8, 0.1, stone, x - w / 2 + (k * w) / 3, y, z + 0.04);
  box(c.g, w, 0.08, 0.1, stone, x, y + h * 0.5, z + 0.04);
  c.g.add(new THREE.TorusGeometry(w / 2 + 0.12, 0.07, 4, 12, Math.PI), stone, M(x, y + h - w / 2, z + 0.06));
}
function archPanelPointed(c: Ctx, x: number, y: number, z: number, w: number, h: number): void {
  archPanel(c.glow, w, h, '#ffd9a0', x, y, z, 0, 0.04, true);
}

const london: Monument = (c, o) => {
  const stone = '#d9c9a0', dark = '#c4b184', slate = '#3f4450', iron = '#2a2e36', gold = '#d4af37';
  // ═══ The palace: a long Perpendicular front behind the yard, facing +z at z = −3. ═══
  const x0 = -15, x1 = 30, zf = -3, depth = 14, ph = 16;
  surf(c, SURF.ashlar, () => box(c.g, x1 - x0, ph, depth, stone, (x0 + x1) / 2, 0, zf - depth / 2));
  // Every face of the palace is dressed the same: the river front and the yard front, the two
  // gable ends — buttresses and pinnacles, three tiers of traceried windows, Perpendicular
  // panelling, string courses and a band of shields. (`porch`: leave the middle for St Stephen's.)
  const dress = (w: number, z: number, porch: boolean) => {
    const xa = -w / 2, xb = w / 2, bays = Math.max(2, Math.round(w / 3.75));
    for (let b = 0; b <= bays; b++) {
      const x = xa + (b * w) / bays;
      box(c.g, 0.7, ph + 1, 0.6, dark, x, 0, z + 0.3); // buttress
      pinnacle(c, x, ph + 1, z + 0.3, 3, dark);
      if (b < bays) {
        const cx = x + w / bays / 2;
        if (porch && Math.abs(cx - pc) < 2.5) continue; // the porch stands there
        for (const [y, h] of [[1.4, 3.4], [6.4, 3.6], [11.4, 3.4]] as const) gothicWindow(c, cx, y, z + 0.02, 1.7, h, dark);
        // A band of blind tracery between the storeys.
        for (const y of [5.3, 10.3]) for (let k = -2; k <= 2; k++) archPanel(c.g, 0.45, 0.8, dark, cx + k * 0.6, y, z + 0.04, 0, 0.05, true);
      }
    }
    // Perpendicular panelling: fine vertical ribs of stone over the whole face, ogee heads at each tier.
    for (let x = xa + 0.3; x < xb; x += 0.55) {
      if (porch && Math.abs(x - pc) < 3.6) continue;
      box(c.g, 0.07, ph - 1.4, 0.08, dark, x, 0.8, z + 0.05);
    }
    for (const y of [5.1, 10.1, 15.1]) box(c.g, w, 0.14, 0.12, dark, 0, y, z + 0.06);
    // A band of heraldic shields below the parapet.
    for (let x = xa + 1.9; x < xb; x += 3.75) {
      if (porch && Math.abs(x - pc) < 3.6) continue;
      const shp = new THREE.Shape([new THREE.Vector2(-0.35, 0.4), new THREE.Vector2(0.35, 0.4), new THREE.Vector2(0.35, 0), new THREE.Vector2(0, -0.45), new THREE.Vector2(-0.35, 0)]);
      c.g.add(new THREE.ExtrudeGeometry(shp, { depth: 0.06, bevelEnabled: false }), ['#c8102e', '#012169', '#d4af37'][((Math.round(x) % 3) + 3) % 3], M(x, 15.5, z + 0.1));
    }
  };
  const mx = (x0 + x1) / 2, mz = zf - depth / 2, pc = -mx; // the porch, at x = 0, in the front face's frame
  const face = (ry: number, w: number, reach: number, porch: boolean) =>
    c.g.frame(mx, 0, mz, ry, 1, () => c.glow.frame(mx, 0, mz, ry, 1, () => dress(w, reach, porch)));
  face(0, x1 - x0, depth / 2, true); // the yard front
  face(Math.PI, x1 - x0, depth / 2, false); // the river front
  face(Math.PI / 2, depth, (x1 - x0) / 2, false); // the east end
  face(-Math.PI / 2, depth, (x1 - x0) / 2, false); // the west end
  // Openwork parapet and battlements along the top.
  box(c.g, x1 - x0 + 0.6, 0.35, 0.5, dark, (x0 + x1) / 2, ph, zf);
  for (let x = x0; x <= x1; x += 0.9) box(c.g, 0.45, 0.7, 0.4, dark, x, ph + 0.35, zf);
  // The steep slate roof with iron cresting along its ridge.
  pitched(c, depth + 0.6, x1 - x0 + 0.6, 7, slate, iron, (x0 + x1) / 2, ph, zf - depth / 2, Math.PI / 2);
  for (let x = x0 + 0.5; x < x1; x += 0.6) { cone(c.g, 0.07, 0.6, iron, x, ph + 7.1, zf - depth / 2, 4); if (Math.round(x * 10) % 12 === 0) sphere(c.g, 0.07, gold, x, ph + 7.7, zf - depth / 2, 4); }
  // ── St Stephen's Porch: a projecting gabled porch, a deep pointed doorway, a great window above.
  c.g.frame(0, 0, zf, 0, 1, () => c.glow.frame(0, 0, zf, 0, 1, () => {
    surf(c, SURF.ashlar, () => box(c.g, 7, 13, 3, stone, 0, 0, 1.5));
    archPanel(c.g, 3, 5.2, '#2a2224', 0, 0, 3.02, 0, 0.1, true);
    for (let k = 0; k < 3; k++) c.g.add(new THREE.TorusGeometry(1.7 + k * 0.22, 0.09, 4, 14, Math.PI), dark, M(0, 3.5, 3.05 + k * 0.02)); // receding arch mouldings
    gothicWindow(c, 0, 6.2, 3.02, 3.6, 5.6, dark);
    const sh = new THREE.Shape([new THREE.Vector2(-3.5, 0), new THREE.Vector2(3.5, 0), new THREE.Vector2(0, 3.2)]);
    surf(c, SURF.ashlar, () => c.g.add(new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false }), stone, M(0, 13, 0)));
    for (const sx of [-1, 1]) { box(c.g, 0.9, 15, 0.9, dark, sx * 3.7, 0, 3); pinnacle(c, sx * 3.7, 15, 3, 3.4, dark); }
    pinnacle(c, 0, 16.2, 1.5, 2.2, dark);
  }));
  // ── The Central Tower: an octagonal lantern and spire over the middle of the palace.
  c.g.frame(10, ph, -10, 0, 1, () => c.glow.frame(10, ph, -10, 0, 1, () => {
    surf(c, SURF.ashlar, () => cyl(c.g, 4.2, 4.4, 11, stone, 0, 0, 0, 8));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; c.g.frame(0, 0, 0, Math.PI / 2 - a, 1, () => c.glow.frame(0, 0, 0, Math.PI / 2 - a, 1, () => gothicWindow(c, 0, 3.4, 4.0, 1.4, 5, dark))); const ca = (i / 8) * Math.PI * 2; pinnacle(c, Math.cos(ca) * 4.4, 11, Math.sin(ca) * 4.4, 3.2, dark); }
    surf(c, SURF.slate, () => cone(c.g, 4.2, 15, slate, 0, 11, 0, 8));
    for (let k = 0; k < 4; k++) c.g.add(new THREE.TorusGeometry(3.4 - k * 0.8, 0.06, 4, 8), gold, M(0, 13 + k * 3, 0, Math.PI / 8, 1, 1, 1, Math.PI / 2, 0));
    sphere(c.g, 0.35, gold, 0, 26.3, 0, 8);
  }));
  // ── The Victoria Tower at the far end: tall and square, corner turrets, the royal arch at its foot, a flag.
  c.g.frame(34, 0, -10, 0, 1, () => c.glow.frame(34, 0, -10, 0, 1, () => {
    surf(c, SURF.ashlar, () => box(c.g, 11, 44, 11, stone));
    archPanel(c.g, 5.4, 9, '#2a2224', 0, 0, 5.52, 0, 0.12, true);
    for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
      for (let y = 12; y < 42; y += 6.5) for (const x of [-2.6, 0, 2.6]) gothicWindow(c, x, y, 5.51, 1.2, 4, dark);
    }));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { box(c.g, 1.8, 48, 1.8, dark, sx * 5.5, 0, sz * 5.5); cyl(c.g, 0.9, 0.9, 2, dark, sx * 5.5, 48, sz * 5.5, 8); pinnacle(c, sx * 5.5, 50, sz * 5.5, 4.5, dark); }
    for (let x = -5; x <= 5; x += 1) for (const sz of [-1, 1]) box(c.g, 0.5, 0.8, 0.5, dark, x, 44, sz * 5.3);
    cyl(c.g, 0.12, 0.14, 12, iron, 0, 44, 0, 6);
    box(c.g, 4, 2.4, 0.05, '#c8102e', 2, 53, 0); box(c.g, 4, 0.5, 0.06, '#ffffff', 2, 54, 0); box(c.g, 4, 0.25, 0.07, '#012169', 2, 54.1, 0); // a pennant in red, white and blue
  }));
  // ═══ The Elizabeth Tower, at the yard's corner. ═══
  c.g.frame(-24, 0, 6, 0, 1, () => c.glow.frame(-24, 0, 6, 0, 1, () => {
    const T = 11;
    surf(c, SURF.ashlar, () => { box(c.g, T + 1.6, 2.2, T + 1.6, '#b8b0a0'); box(c.g, T, 56, T, stone, 0, 2.2, 0); });
    for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
      // Tall panelled faces: slim traceried windows in three columns, string courses of quatrefoils.
      for (let y = 4; y < 54; y += 4.5) for (const x of [-3, 0, 3]) { archPanel(c.glow, 0.8, 2.6, '#ffd9a0', x, y, T / 2 + 0.01, 0, 0.04, true); box(c.g, 1.1, 0.12, 0.08, dark, x, y - 0.1, T / 2 + 0.04); }
      for (let y = 8.6; y < 56; y += 9) { box(c.g, T + 0.3, 0.35, 0.3, dark, 0, y, T / 2); for (let k = -4; k <= 4; k++) c.g.add(new THREE.TorusGeometry(0.22, 0.05, 4, 10), dark, M(k * 1.2, y + 0.65, T / 2 + 0.1)); }
    }));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(c.g, 1.4, 58, 1.4, dark, sx * (T / 2), 0, sz * (T / 2));
    // The clock stage: wider, a great dial on each face — white glass in iron tracery, a gold rim, gilt above.
    surf(c, SURF.ashlar, () => box(c.g, T + 1.6, 11, T + 1.6, stone, 0, 58, 0));
    for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
      const z = (T + 1.6) / 2 + 0.05, y = 63.2, R = 3.7;
      box(c.g, 8.8, 8.8, 0.12, gold, 0, y - 4.4, z - 0.02);
      box(c.g, 8.2, 8.2, 0.14, '#2a3a2a', 0, y - 4.1, z - 0.01);
      c.glow.add(new THREE.CylinderGeometry(R, R, 0.1, 40).rotateX(Math.PI / 2), '#fff8e8', M(0, y, z + 0.06));
      c.g.add(new THREE.TorusGeometry(R, 0.14, 5, 48), iron, M(0, y, z + 0.12));
      c.g.add(new THREE.TorusGeometry(R * 0.55, 0.08, 4, 36), iron, M(0, y, z + 0.12));
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.g.add(new THREE.BoxGeometry(0.07, R * 0.9, 0.05).translate(0, R * 0.45, 0), iron, M(0, y, z + 0.13, 0, 1, 1, 1, 0, a)); box(c.g, 0.22, 0.6, 0.06, iron, Math.sin(a) * R * 0.85, y + Math.cos(a) * R * 0.85 - 0.3, z + 0.14); }
      c.g.add(new THREE.BoxGeometry(0.2, R * 0.85, 0.06).translate(0, R * 0.42, 0), iron, M(0, y, z + 0.2, 0, 1, 1, 1, 0, -0.6));
      c.g.add(new THREE.BoxGeometry(0.28, R * 0.55, 0.06).translate(0, R * 0.27, 0), iron, M(0, y, z + 0.22, 0, 1, 1, 1, 0, 2.3));
      box(c.g, 7, 0.5, 0.1, gold, 0, y + 4.5, z + 0.05); // the gilded band above the dial
    }));
    // The belfry: tall pointed openings, gilded tracery, pinnacles at the corners.
    surf(c, SURF.ashlar, () => box(c.g, T, 8, T, stone, 0, 69, 0));
    for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => { for (const x of [-3, 0, 3]) { archPanel(c.g, 2, 6, '#1f1f24', x, 69.8, T / 2 + 0.02, 0, 0.06, true); c.g.add(new THREE.TorusGeometry(1.05, 0.07, 4, 12, Math.PI), gold, M(x, 69.8 + 5, T / 2 + 0.08)); } });
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pinnacle(c, sx * (T / 2), 77, sz * (T / 2), 5, dark);
    // The spire: steep iron-and-slate, tiers of lucarnes, the lantern (the Ayrton light) and the gilt finial.
    surf(c, SURF.slate, () => c.g.add(new THREE.ConeGeometry(Math.SQRT1_2, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), slate, M(0, 77, 0, 0, T - 0.4, 12, T - 0.4)));
    for (let k = 0; k < 2; k++) for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => { const hw = (T - 0.4) / 2 * (1 - (1.8 + k * 3.6) / 12); box(c.g, 1, 1.2, 0.6, gold, 0, 78.8 + k * 3.6, hw); cone(c.g, 0.72, 0.9, gold, 0, 80 + k * 3.6, hw, 4, Math.PI / 4); });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cyl(c.g, 0.07, 0.07, 1.4, gold, Math.cos(a) * 0.9, 89, Math.sin(a) * 0.9, 4); }
    cyl(c.glow, 0.7, 0.7, 1.3, '#fff2c0', 0, 89, 0, 8);
    cone(c.g, 1.1, 2.6, slate, 0, 90.4, 0, 8);
    sphere(c.g, 0.35, gold, 0, 93.2, 0, 10);
    cone(c.g, 0.1, 1.6, gold, 0, 93.5, 0, 6);
  }));
  // ═══ The yard: railings with gilded spear-tips along the front, Gothic lamp standards, plane trees. ═══
  for (let x = -16; x <= 30; x += 0.5) {
    if (Math.abs(x) < 3) continue;
    cyl(c.g, 0.03, 0.03, 1.8, iron, x, 0, 15, 4);
    cone(c.g, 0.06, 0.2, gold, x, 1.8, 15, 4);
  }
  box(c.g, 46, 0.06, 0.06, iron, 7, 1.5, 15); box(c.g, 46, 0.06, 0.06, iron, 7, 0.3, 15);
  for (const x of [-12, 12, 22]) {
    cyl(c.g, 0.12, 0.18, 4.6, iron, x, 0, 12, 8);
    for (const sx of [-1, 1]) { box(c.g, 0.7, 0.06, 0.06, iron, x + sx * 0.35, 4.3, 12); box(c.glow, 0.36, 0.5, 0.36, '#ffe6a0', x + sx * 0.7, 3.8, 12); cone(c.g, 0.3, 0.4, iron, x + sx * 0.7, 4.3, 12, 4, Math.PI / 4); }
  }
  for (const [x, z] of [[-8, 9], [16, 9], [26, 7]] as const) tree(c.g, 'oak', x, 0, z, 1.1, () => c.rng.next());
  // A red telephone box and a pillar box by the railings, benches, and a statue on a plinth.
  c.g.frame(-14, 0, 13, 0, 1, () => c.glow.frame(-14, 0, 13, 0, 1, () => {
    box(c.g, 1, 2.5, 1, '#c8102e'); box(c.g, 1.1, 0.25, 1.1, '#c8102e', 0, 2.5, 0);
    c.g.add(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2), '#c8102e', M(0, 2.75, 0));
    for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => { for (let r = 0; r < 6; r++) for (let q = 0; q < 3; q++) box(c.glow, 0.2, 0.22, 0.02, '#fff4d0', -0.25 + q * 0.25, 0.9 + r * 0.26, 0.51); box(c.glow, 0.7, 0.14, 0.02, '#ffffff', 0, 2.3, 0.52); }));
  }));
  c.g.frame(-11.5, 0, 13.4, 0, 1, () => { cyl(c.g, 0.3, 0.32, 1.3, '#c8102e', 0, 0, 0, 12); sphere(c.g, 0.32, '#c8102e', 0, 1.3, 0, 12, 0.5); box(c.g, 0.3, 0.05, 0.05, '#1f1f24', 0, 1.1, 0.31); });
  for (const x of [4, 8, 20]) { box(c.g, 2, 0.1, 0.6, '#5a3a26', x, 0.45, 13.6); box(c.g, 2, 0.5, 0.08, '#5a3a26', x, 0.55, 13.9); for (const sx of [-1, 1]) box(c.g, 0.08, 0.5, 0.6, iron, x + sx * 0.9, 0, 13.6); }
  c.g.frame(-6, 0, 6, 0, 1, () => {
    box(c.g, 2.4, 2.4, 2.4, '#b8b0a0'); box(c.g, 2.7, 0.3, 2.7, '#a8a090', 0, 2.4, 0);
    cone(c.g, 0.5, 1.9, '#4a5a4a', 0, 2.7, 0, 8); sphere(c.g, 0.24, '#4a5a4a', 0, 2.7 + 1.9 + HEAD_GAP * 1.4 + 0.24, 0, 10);
    c.g.add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 5), '#4a5a4a', M(0.45, 4.2, 0, 0, 1, 1, 1, 0, -0.3));
  });
  o.colliders.push({ x: -14, z: 13, r: 0.8, h: 3 }, { x: -11.5, z: 13.4, r: 0.4, h: 1.7 }, { x: -6, z: 6, r: 1.8, h: 5 });
  // Colliders: the palace, the porch, the two towers.
  for (const x of [-10, 0, 10, 20, 27]) o.colliders.push({ x, z: -10, r: 7.3, h: ph + 8 });
  o.colliders.push({ x: 0, z: -1.5, r: 2.2, h: 17 }, { x: 10, z: -10, r: 4.6, h: 43 }, { x: 34, z: -10, r: 7.2, h: 55 }, { x: -24, z: 6, r: 7.4, h: 94 });
  for (const x of [-12, 12, 22]) o.colliders.push({ x, z: 12, r: 0.4, h: 5 });
  o.height = 94;
};

// ───────────────────────────── New Yonder ─────────────────────────────

/** A small wind turbine on a mast, blades facing +z. */
function windMill(c: Ctx, x: number, y: number, z: number, h: number, ry = 0): void {
  c.g.frame(x, y, z, ry, 1, () => {
    cyl(c.g, 0.08, 0.14, h, '#f2f4f6', 0, 0, 0, 6);
    box(c.g, 0.3, 0.3, 0.8, '#e8eef4', 0, h - 0.15, 0);
    for (let i = 0; i < 3; i++) c.g.add(new THREE.BoxGeometry(0.14, h * 0.42, 0.04).translate(0, h * 0.21, 0), '#f8f8fa', M(0, h, 0.45, 0, 1, 1, 1, 0, (i / 3) * Math.PI * 2 + 0.4));
  });
}

const newyork: Monument = (c, o) => {
  const lime = '#c9c2b5', pier = '#d8d2c6', spandrel = '#4a4a52', steel = '#d8dce4', gold = '#d4af37', leaf = '#4f9a4a';
  const tiers: Array<[number, number]> = [[36, 24], [28, 40], [22, 40], [16, 30], [12, 24]];
  let y = 0;
  tiers.forEach(([w, h], ti) => {
    surf(c, SURF.ashlar, () => box(c.g, w, h, w, lime, 0, y, 0));
    for (let side = 0; side < 4; side++) c.g.frame(0, y, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, y, 0, (side * Math.PI) / 2, 1, () => {
      const n = Math.round(w / 2.4);
      // Piers running the full height, window strips between them, dark metal spandrels at each floor.
      for (let k = 0; k <= n; k++) box(c.g, 0.55, h, 0.45, pier, -w / 2 + (k * w) / n, 0, w / 2 + 0.1);
      for (let f = 1.2; f < h - 1; f += 3.6) {
        box(c.glow, w - 0.4, 2.1, 0.04, '#ffe6b0', 0, f, w / 2 + 0.02);
        box(c.g, w - 0.2, 0.9, 0.08, spandrel, 0, f + 2.3, w / 2 + 0.05);
      }
      // Solar fins down the south faces, a strip of green wall at each corner.
      if (side === 0 && ti > 0) for (let k = 1; k < n; k += 2) c.g.add(new THREE.BoxGeometry(0.08, h - 2, 1.1), '#1d3566', M(-w / 2 + (k * w) / n, h / 2, w / 2 + 0.65, 0.5));
      box(c.g, 1.2, h - 1, 0.3, leaf, w / 2 - 0.9, 0.5, w / 2 + 0.25);
      for (let k = 0; k < h / 2.2; k++) sphere(c.g, 0.35, k % 2 ? '#5aa84f' : '#3f8a3a', w / 2 - 0.9 + Math.sin(k) * 0.4, 1 + k * 2.2, w / 2 + 0.4, 5, 0.7);
    }));
    // A Deco chevron frieze of gold on black round the top of the tier.
    for (let side = 0; side < 4; side++) c.g.frame(0, y + h - 1.1, 0, (side * Math.PI) / 2, 1, () => {
      box(c.g, w + 0.1, 1, 0.1, '#1f1f24', 0, 0, w / 2 + 0.12);
      for (let k = 0; k < Math.floor(w / 0.8); k++) for (const sgn of [-1, 1]) c.g.add(new THREE.BoxGeometry(0.5, 0.08, 0.06), gold, M(-w / 2 + 0.4 + k * 0.8 + sgn * 0.17, 0.5, w / 2 + 0.19, 0, 1, 1, 1, 0, sgn * 0.9));
    });
    y += h;
    // The setback above this tier: a roof garden with trees and planters, a glass balustrade, turbines at its corners.
    const next = tiers[ti + 1];
    if (next) {
      const ring = (w - next[0]) / 2;
      box(c.g, w, 0.4, w, '#6aa84f', 0, y, 0);
      for (let side = 0; side < 4; side++) c.g.frame(0, y + 0.4, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, y + 0.4, 0, (side * Math.PI) / 2, 1, () => {
        box(c.glow, w - 0.4, 1.1, 0.06, '#bfe8ff', 0, 0, w / 2 - 0.1);
        for (let k = -1; k <= 1; k += 2) { cyl(c.g, 0.12, 0.16, 1.4, '#6b5540', k * w * 0.25, 0, w / 2 - ring / 2, 5); sphere(c.g, 1.1, leaf, k * w * 0.25, 2.1, w / 2 - ring / 2, 7, 0.9); }
        box(c.g, w * 0.3, 0.6, 0.8, '#8a7a6a', 0, 0, w / 2 - ring / 2);
        for (let k = 0; k < 6; k++) sphere(c.g, 0.2, ['#ff8fb8', '#ffd24a', '#ffffff'][k % 3], -w * 0.13 + k * w * 0.05, 0.7, w / 2 - ring / 2, 5);
      }));
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) windMill(c, sx * (w / 2 - ring / 2), y + 0.4, sz * (w / 2 - ring / 2), 4.4, Math.atan2(sx, sz));
    }
  });
  // ── The deco portal on the plaza side: a stepped (ziggurat) frame of gold round a sunburst grille, revolving doors, a canopy.
  const pz = tiers[0][0] / 2 + 0.15;
  for (let k = 0; k < 4; k++) box(c.g, 12 - k * 2, 14 - k * 2.5, 0.3 + k * 0.1, k % 2 ? gold : '#b8b0a0', 0, 0, pz + k * 0.1);
  box(c.g, 4.4, 6.4, 0.2, '#1f1f24', 0, 0.2, pz + 0.5);
  for (let i = 0; i < 9; i++) { const a = (i / 8) * Math.PI; c.g.add(new THREE.BoxGeometry(0.1, 2.8, 0.05).translate(0, 1.4, 0), gold, M(0, 6.6, pz + 0.62, 0, 1, 1, 1, 0, Math.PI / 2 - a)); }
  c.glow.add(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16).rotateX(Math.PI / 2), '#fff2c0', M(0, 6.6, pz + 0.66));
  for (const x of [-1.2, 1.2]) { cyl(c.glow, 0.9, 0.9, 3.2, '#ffe6b0', x, 0.2, pz + 0.8, 12); cyl(c.g, 0.95, 0.95, 0.12, gold, x, 3.4, pz + 0.8, 12); }
  box(c.g, 8, 0.3, 3.4, steel, 0, 7.4, pz + 1.9); box(c.glow, 7.6, 0.1, 3.2, '#fff0c0', 0, 7.35, pz + 1.9);
  // Sunburst spandrels between the lower floors' windows on the plaza face.
  for (let f = 0; f < 5; f++) for (let k = -6; k <= 6; k += 2) {
    if (Math.abs(k) < 3 && f < 3) continue;
    const bx = k * 1.2, by = 3.5 + f * 3.6;
    for (let i = 0; i < 7; i++) c.g.add(new THREE.BoxGeometry(0.05, 0.5, 0.04).translate(0, 0.25, 0), gold, M(bx, by, tiers[0][0] / 2 + 0.16, 0, 1, 1, 1, 0, -Math.PI / 2 + (i / 6) * Math.PI));
  }
  // ── The crown: terraced steel arches, each set with sunburst windows that glow at night, then the needle.
  let cw = tiers[4][0];
  for (let k = 0; k < 6; k++) {
    const r = cw / 2 - 0.2;
    for (let side = 0; side < 4; side++) c.g.frame(0, y, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, y, 0, (side * Math.PI) / 2, 1, () => {
      c.g.add(new THREE.CylinderGeometry(r, r, 0.3, 20, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), steel, M(0, 0, cw / 2));
      for (let i = 0; i < 7; i++) { const a = ((i + 0.5) / 7) * Math.PI; c.glow.add(new THREE.ConeGeometry(0.28, r * 0.5, 3).translate(0, r * 0.25, 0), '#fff4d0', M(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5, cw / 2 + 0.12, 0, 1, 1, 1, 0, a - Math.PI / 2)); }
    }));
    surf(c, SURF.steel, () => box(c.g, cw - 0.2, cw * 0.25, cw - 0.2, steel, 0, y, 0));
    y += cw * 0.25 + 0.2;
    cw *= 0.8;
  }
  cyl(c.g, 0.3, 0.9, 30, steel, 0, y, 0, 8);
  sphere(c.glow, 0.35, '#ff3a3a', 0, y + 30.2, 0, 6);
  const height = y + 31;
  // ── An air-taxi pad on the third setback, its ring lit.
  const padY = tiers[0][1] + tiers[1][1] + 0.4;
  c.glow.add(new THREE.TorusGeometry(2.4, 0.08, 4, 40), '#7affc8', M(-9.5, padY + 0.45, 0, 0, 1, 1, 1, Math.PI / 2, 0));
  box(c.g, 6, 0.1, 6, '#3a3a44', -9.5, padY + 0.4, 0);
  // ── The plaza: a long pool with jets, benches, trees in planters, deco lamp standards.
  waterPool(c, 0, 0, 30, 18, 5, 0, { stone: '#d8d2c6', kerb: 0.5, speed: 0.08, jets: 1, jetHeight: 1.6 });
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) { box(c.g, 2.6, 0.45, 0.6, '#8a7a6a', sx * (12 + k * 4), 0, 30); tree(c.g, 'oak', sx * (14 + k * 4), 0, 25, 0.9, () => c.rng.next()); }
    for (const z of [22, 36]) { cyl(c.g, 0.1, 0.16, 5, '#2a2a30', sx * 10, 0, z, 8); for (let k = 0; k < 3; k++) cyl(c.glow, 0.28 - k * 0.06, 0.28 - k * 0.06, 0.3, '#fff0c0', sx * 10, 5 + k * 0.4, z, 8); cone(c.g, 0.12, 0.6, gold, sx * 10, 6.2, z, 6); }
  }
  // A subway entrance in green iron with globe lamps, and a newsstand kiosk.
  c.g.frame(-16, 0, 38, 0, 1, () => c.glow.frame(-16, 0, 38, 0, 1, () => {
    for (const sx of [-1, 1]) { box(c.g, 0.12, 1.1, 3.4, '#2f5a3a', sx * 1.3, 0, 0); cyl(c.g, 0.08, 0.1, 2.6, '#2f5a3a', sx * 1.3, 0, 1.7, 8); sphere(c.glow, 0.24, '#fff0c0', sx * 1.3, 2.8, 1.7, 10); }
    box(c.g, 2.6, 0.3, 0.08, '#2f5a3a', 0, 2.3, 1.7); box(c.glow, 2.2, 0.2, 0.02, '#7affc8', 0, 2.35, 1.75);
    for (let k = 0; k < 8; k++) box(c.g, 2.4, 0.12, 0.35, '#8a8a90', 0, -0.1 - k * 0.2, 1.5 - k * 0.35);
  }));
  c.g.frame(16, 0, 38, 0, 1, () => c.glow.frame(16, 0, 38, 0, 1, () => {
    box(c.g, 2.6, 2.4, 1.8, '#2a4a3a'); box(c.g, 3, 0.2, 2.4, '#2a4a3a', 0, 2.4, 0.2);
    for (let r = 0; r < 3; r++) for (let q = 0; q < 6; q++) box(c.g, 0.34, 0.44, 0.04, ['#e8342a', '#ffd23a', '#3a9aff', '#ffffff'][(r + q) % 4], -1 + q * 0.4, 0.5 + r * 0.55, 0.92);
    box(c.glow, 2.4, 0.3, 0.03, '#ffd23a', 0, 2.05, 0.93);
  }));
  o.colliders.push({ x: -16, z: 38.8, r: 1.6, h: 3 }, { x: 16, z: 38, r: 1.7, h: 3 });
  o.colliders.push({ x: 0, z: 0, r: 25.4, h: height }, { x: 0, z: 30, r: 3.4, h: 2 });
  for (const sx of [-1, 1]) for (const z of [22, 36]) o.colliders.push({ x: sx * 10, z, r: 0.4, h: 6 });
  o.height = height;
};

// ───────────────────────────── Gulabi Nagar ─────────────────────────────

/** A jharokha oriel on the +z face at (x, y, z): a half-octagon bay of jali screens, a curved eave and a little domed roof. */
function jharokha(c: Ctx, x: number, y: number, z: number, w: number, h: number, pink: string, white: string, dome = true): void {
  const d = w * 0.42;
  for (const [ox, oz, ry, pw] of [[0, d, 0, w * 0.5], [-w * 0.39, d * 0.5, -Math.PI / 4, w * 0.42], [w * 0.39, d * 0.5, Math.PI / 4, w * 0.42]] as const) {
    c.g.frame(x + ox, y, z + oz, ry, 1, () => c.glow.frame(x + ox, y, z + oz, ry, 1, () => {
      box(c.g, pw, h, 0.12, pink, 0, 0, 0);
      box(c.glow, pw * 0.72, h * 0.62, 0.02, '#ffcf9a', 0, h * 0.2, 0.07);
      for (let k = 1; k < 4; k++) box(c.g, 0.04, h * 0.62, 0.05, '#c86a5a', -pw * 0.36 + (k * pw * 0.72) / 4, h * 0.2, 0.09); // the jali's bars
      for (let k = 1; k < 5; k++) box(c.g, pw * 0.72, 0.04, 0.05, '#c86a5a', 0, h * 0.2 + (k * h * 0.62) / 5, 0.09);
      box(c.g, pw + 0.04, 0.06, 0.06, white, 0, h * 0.86, 0.08); // a white line above
    }));
  }
  box(c.g, w * 1.05, h * 0.18, 0.1, white, x, y - 0.02, z + d + 0.06); // the bracketed sill
  // The curved eave (chhajja) and the little roof over the bay.
  c.g.add(new THREE.CylinderGeometry(w * 0.62, w * 0.62, 0.12, 8, 1, false, 0, Math.PI).rotateY(-Math.PI / 2), white, M(x, y + h + 0.02, z + d * 0.4));
  if (dome) { c.g.add(new THREE.SphereGeometry(w * 0.42, 8, 5, 0, Math.PI, 0, Math.PI / 2).rotateY(-Math.PI / 2), pink, M(x, y + h + 0.1, z + d * 0.35)); cone(c.g, 0.05, 0.3, '#d4af37', x, y + h + 0.1 + w * 0.42, z + d * 0.35, 5); }
}

const indianorth: Monument = (c, o) => {
  const pink = '#e8917a', pinkD = '#d27466', white = '#fbf7ee', gold = '#d4af37';
  // ── The ground storeys: an arcade of cusped arches, the great gate (pol) open through the middle.
  const W = 56, D = 12, H = 8.5;
  const sh = new THREE.Shape();
  sh.moveTo(-W / 2, 0); sh.lineTo(-2.6, 0); sh.lineTo(-2.6, 4.6);
  sh.quadraticCurveTo(-2.4, 6.8, 0, 7.4); sh.quadraticCurveTo(2.4, 6.8, 2.6, 4.6);
  sh.lineTo(2.6, 0); sh.lineTo(W / 2, 0); sh.lineTo(W / 2, H); sh.lineTo(-W / 2, H); sh.lineTo(-W / 2, 0);
  const base = new THREE.ExtrudeGeometry(sh, { depth: D, bevelEnabled: false, curveSegments: 10 });
  base.translate(0, 0, -D / 2);
  surf(c, SURF.ashlar, () => c.g.add(base, pink));
  for (const sz of [-1, 1]) {
    // The gate's frame: cusps round the arch, a white outline, a band of painted flowers over it.
    for (let k = 0; k < 7; k++) { const a = Math.PI * (0.1 + (k / 6) * 0.8); sphere(c.g, 0.32, white, Math.cos(a) * 2.7, 4.6 + Math.sin(a) * 2.8, sz * (D / 2 + 0.05), 6, 0.6); }
    box(c.g, 7.4, 0.3, 0.12, white, 0, 8, sz * (D / 2 + 0.06));
    for (const sx of [-1, 1]) box(c.g, 0.3, 8, 0.12, white, sx * 3.55, 0, sz * (D / 2 + 0.06));
    for (let k = 0; k < 9; k++) sphere(c.g, 0.18, ['#ff9a1f', '#ffd23a', '#e8347a'][k % 3], -3 + k * 0.75, 7.55, sz * (D / 2 + 0.1), 5);
  }
  // The doors of the gate, folded open against the passage walls, studded brass.
  for (const sx of [-1, 1]) {
    box(c.g, 0.2, 6.2, 2.4, '#6a3a22', sx * 2.48, 0, D / 2 - 2.2);
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) sphere(c.g, 0.07, gold, sx * 2.36, 0.8 + r * 1.2, D / 2 - 3 + q * 0.8, 4);
  }
  // The arcade along the front either side: cusped arches, shops glowing inside.
  for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) {
    const x = sx * (6 + k * 3.1);
    c.g.frame(x, 0, D / 2 + 0.02, 0, 1, () => c.glow.frame(x, 0, D / 2 + 0.02, 0, 1, () => {
      box(c.glow, 2.1, 3.2, 0.03, '#ffcf9a', 0, 0.2, 0);
      for (let q = 0; q < 5; q++) { const a = Math.PI * (0.1 + (q / 4) * 0.8); sphere(c.g, 0.16, white, Math.cos(a) * 1.15, 3.2 + Math.sin(a) * 0.9, 0.03, 5, 0.6); }
      for (const s2 of [-1, 1]) box(c.g, 0.22, 3.6, 0.1, white, s2 * 1.25, 0, 0.04);
      jharokha(c, 0, 5, 0, 1.6, 2.2, pink, white);
    }));
  }
  box(c.g, W + 0.4, 0.35, D + 0.4, white, 0, H, 0); // the white string course
  // White line-painting on the pink: a vine of dots and little flowers wandering along the base front.
  for (let i = 0; i < 90; i++) {
    const x = -W / 2 + 0.6 + i * ((W - 1.2) / 89);
    if (Math.abs(x) < 3.8) continue;
    const y = 4.4 + Math.sin(i * 0.7) * 0.25;
    sphere(c.g, 0.05, white, x, y, D / 2 + 0.05, 4);
    if (i % 6 === 0) for (let p2 = 0; p2 < 5; p2++) { const a = (p2 / 5) * Math.PI * 2; sphere(c.g, 0.07, white, x + Math.cos(a) * 0.13, y + 0.25 + Math.sin(a) * 0.13, D / 2 + 0.05, 4); }
  }
  // Diyas along the arcade's ledge.
  for (let x = -W / 2 + 1; x < W / 2; x += 1.1) if (Math.abs(x) > 3.8) { cyl(c.g, 0.1, 0.06, 0.08, '#b0553a', x, 4.05, D / 2 + 0.25, 8); cone(c.glow, 0.03, 0.1, '#ffb84a', x, 4.13, D / 2 + 0.25, 5); }
  box(c.g, W, 0.12, 0.4, white, 0, 3.95, D / 2 + 0.2);
  // A rangoli before the gate, and bazaar stalls either side: bangles on poles, bolts of bright cloth.
  c.g.frame(0, 0, D / 2 + 4, 0, 1, () => c.glow.frame(0, 0, D / 2 + 4, 0, 1, () => rangoli(c, 2.2, true)));
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) c.g.frame(sx * (10 + k * 6), 0, D / 2 + 5, 0, 1, () => {
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.05, 0.05, 2.6, '#6a4a2a', a * 1.4, 0, b * 0.9, 5);
    c.g.add(new THREE.BoxGeometry(3.2, 0.06, 2.4), ['#e8347a', '#ff9a1f', '#2a7ad8'][k + (sx > 0 ? 1 : 0)], M(0, 2.65, 0, 0, 1, 1, 1, 0.12, 0));
    box(c.g, 2.8, 0.9, 1.4, '#8a5a36', 0, 0, 0);
    for (let q = 0; q < 6; q++) box(c.g, 0.4, 0.14, 1, ['#e8347a', '#ffd23a', '#3aa84a', '#2a7ad8', '#9a4ad8', '#ff5a5a'][q], -1.1 + q * 0.44, 0.9 + (q % 2) * 0.14, 0);
    for (let q = 0; q < 3; q++) { cyl(c.g, 0.02, 0.02, 1.2, '#d4af37', -0.8 + q * 0.8, 0.9, -0.5, 4); for (let b = 0; b < 8; b++) c.g.add(new THREE.TorusGeometry(0.1, 0.018, 4, 10), ['#e8347a', '#ffd23a', '#3aa84a', '#2a7ad8'][(b + q) % 4], M(-0.8 + q * 0.8, 1.2 + b * 0.1, -0.5, 0, 1, 1, 1, Math.PI / 2, 0)); }
  });
  for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) o.colliders.push({ x: sx * (10 + k * 6), z: D / 2 + 5, r: 1.7, h: 2.8 });
  // ── The honeycomb: five tiers stepping in and up like a crown, faced with tier upon tier of jharokhas.
  let y = H + 0.35, w = 48;
  const bayW = 2.2;
  for (let t = 0; t < 5; t++) {
    const th = 4, dz = D / 2 - 1.2 - t * 0.7;
    surf(c, SURF.ashlar, () => box(c.g, w, th, 6, pink, 0, y, dz - 3));
    const n = Math.floor(w / bayW);
    for (let k = 0; k < n; k++) jharokha(c, -w / 2 + bayW / 2 + k * bayW, y + 0.6, dz, bayW * 0.9, th - 1.3, k % 2 ? pink : pinkD, white, t === 4 || k % 3 === 1);
    box(c.g, w + 0.3, 0.25, 0.4, white, 0, y + th, dz);
    // The crest of each tier: little arched parapets with finials.
    for (let k = 0; k < n; k++) { archPanel(c.g, bayW * 0.6, 0.8, pinkD, -w / 2 + bayW / 2 + k * bayW, y + th + 0.25, dz - 0.1, 0, 0.1, true); cone(c.g, 0.06, 0.35, gold, -w / 2 + bayW / 2 + k * bayW, y + th + 1.05, dz - 0.1, 4); }
    y += th + 0.25;
    w -= t < 2 ? 9 : 8;
  }
  // The top: three domed pavilions, the middle one highest, gilded finials.
  for (const [x, s2, dy] of [[-3, 0.8, 0], [3, 0.8, 0], [0, 1.1, 0.8]] as const) {
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.12 * s2, 0.14 * s2, 2 * s2, white, x + a * 0.9 * s2, y + dy, D / 2 - 5.2 + b * 0.9 * s2, 6);
    box(c.g, 2.4 * s2, 0.2, 2.4 * s2, white, x, y + dy + 2 * s2, D / 2 - 5.2);
    c.g.add(new THREE.SphereGeometry(1.1 * s2, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), pink, M(x, y + dy + 2 * s2 + 0.2, D / 2 - 5.2));
    cone(c.g, 0.08, 0.7 * s2, gold, x, y + dy + 3.2 * s2 + 0.2, D / 2 - 5.2, 6);
    cyl(c.g, 0.025, 0.025, 2.2, '#3a2a22', x, y + dy + 3.2 * s2 + 0.9, D / 2 - 5.2, 4);
    c.g.add(new THREE.ConeGeometry(0.4, 1.4, 3).rotateZ(-Math.PI / 2), ['#ff9a1f', '#e8347a', '#ffd23a'][Math.round(x + 3) % 3], M(x + 0.7, y + dy + 3.2 * s2 + 2.8, D / 2 - 5.2, 0, 1, 0.5, 0.05));
  }
  const height = y + 5;
  // ── Behind the gate, the courtyard: arcaded walls, a fountain, and flowerbeds.
  const cz = -D / 2 - 11;
  for (const [x, z, bw, bd] of [[0, cz - 11, 40, 2], [-20, cz, 2, 22], [20, cz, 2, 22]] as const) surf(c, SURF.ashlar, () => box(c.g, bw, 6, bd, pink, x, 0, z));
  for (let k = -5; k <= 5; k++) archPanel(c.g, 2.4, 3.6, white, k * 3.4, 0.4, cz - 9.95, 0, 0.08, true);
  c.g.frame(0, 0, cz, 0, 1, () => c.glow.frame(0, 0, cz, 0, 1, () => {
    surf(c, SURF.marble, () => cyl(c.g, 3.2, 3.3, 0.7, white, 0, 0, 0, 8));
    cyl(c.g, 3.0, 3.0, 0.05, '#4aa0c0', 0, 0.62, 0, 8);
    cyl(c.g, 0.5, 0.6, 1.4, white, 0, 0.6, 0, 8); cyl(c.g, 1.2, 0.5, 0.3, white, 0, 2, 0, 8);
    cyl(c.glow, 0.05, 0.08, 1.2, '#dff6ff', 0, 2.3, 0, 6); sphere(c.glow, 0.14, '#f4fdff', 0, 3.5, 0, 6);
  }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) { box(c.g, 5, 0.3, 5, '#6aa84f', sx * 9, 0, cz + sz * 5); for (let k = 0; k < 8; k++) sphere(c.g, 0.22, ['#ff9a1f', '#e8347a', '#ffd23a'][k % 3], sx * 9 - 1.8 + (k % 4) * 1.2, 0.45, cz + sz * 5 - 0.8 + Math.floor(k / 4) * 1.6, 5); }
  // Colliders: the base either side of the gate, the courtyard walls.
  for (const sx of [-1, 1]) {
    for (const z of [-3.5, 0, 3.5]) o.colliders.push({ x: sx * 5, z, r: 2.4, h: height });
    for (const x of [9.5, 15.5, 21.5, 26]) o.colliders.push({ x: sx * x, z: 0, r: D / 2, h: height });
    for (let z = cz - 10; z <= cz + 10; z += 4) o.colliders.push({ x: sx * 20, z, r: 1.6, h: 6 });
  }
  for (let x = -18; x <= 18; x += 4) o.colliders.push({ x, z: cz - 11, r: 1.6, h: 6 });
  o.colliders.push({ x: 0, z: cz, r: 3.4, h: 3 });
  o.height = height;
};

// ───────────────────────────── Firenzia ─────────────────────────────

const MARBLE = '#f2ede0', PRATO = '#2f5a4a', ROSA = '#d99a8a';

/** A panel of polychrome marble on the +z plane: a green frame, a pink inset, white round it. */
function marblePanel(c: Ctx, x: number, y: number, z: number, w: number, h: number): void {
  box(c.g, w, 0.12, 0.06, PRATO, x, y, z); box(c.g, w, 0.12, 0.06, PRATO, x, y + h - 0.12, z);
  box(c.g, 0.12, h, 0.06, PRATO, x - w / 2 + 0.06, y, z); box(c.g, 0.12, h, 0.06, PRATO, x + w / 2 - 0.06, y, z);
  box(c.g, w * 0.55, h * 0.55, 0.05, ROSA, x, y + h * 0.22, z);
}

const renaissance: Monument = (c, o) => {
  const tile = '#b5552e', gold = '#d4af37';
  // ── The piazza, paved in grey pietra serena.
  surf(c, SURF.flagstone, () => box(c.g, 64, 0.18, 16, '#9a9a94', 0, 0, 47));
  // ── The nave: side walls clad in polychrome marble, tall pointed windows, a clerestory above, red roofs.
  const z0 = -2, z1 = 40, L = z1 - z0, zc = (z0 + z1) / 2;
  surf(c, SURF.marble, () => { box(c.g, 20, 18, L, MARBLE, 0, 0, zc); box(c.g, 12, 8, L, MARBLE, 0, 18, zc); });
  for (const sx of [-1, 1]) c.g.frame(sx * 10, 0, zc, sx * Math.PI / 2, 1, () => c.glow.frame(sx * 10, 0, zc, sx * Math.PI / 2, 1, () => {
    for (let b = 0; b < 6; b++) {
      const x = -L / 2 + 3.5 + b * 7;
      marblePanel(c, x, 1, 0.03, 5.4, 5);
      archPanel(c.glow, 1.6, 6.2, '#ffd9a0', x, 7.4, 0.02, 0, 0.04, true);
      c.g.add(new THREE.TorusGeometry(0.95, 0.14, 4, 12, Math.PI), PRATO, M(x, 7.4 + 6.2 - 0.8, 0.06));
      marblePanel(c, x, 14.4, 0.03, 5.4, 3.2);
      box(c.g, 0.7, 18.4, 0.3, MARBLE, x + 3.5, 0, 0.15); // pilaster
    }
    box(c.g, L, 0.5, 0.5, PRATO, 0, 17.6, 0.2);
  }));
  for (const sx of [-1, 1]) for (let b = 0; b < 6; b++) c.glow.add(new THREE.CylinderGeometry(0.9, 0.9, 0.06, 16).rotateZ(Math.PI / 2), '#ffd9a0', M(sx * 6.02, 22, z0 + 3.5 + b * 7));
  surf(c, SURF.clayTile, () => {
    pitched(c, 13.2, L, 5, tile, MARBLE, 0, 26, zc);
    for (const sx of [-1, 1]) c.g.add(new THREE.BoxGeometry(4.8, 0.3, L), tile, M(sx * 8.1, 19.1, zc, 0, 1, 1, 1, 0, sx * -0.36));
  });
  // ── The façade: three portals, a rose window, polychrome bands, pinnacles, a pediment.
  const fz = z1 + 0.6;
  c.g.frame(0, 0, fz, 0, 1, () => c.glow.frame(0, 0, fz, 0, 1, () => {
    surf(c, SURF.marble, () => box(c.g, 22, 30, 1.2, MARBLE, 0, 0, 0));
    for (const y of [8.5, 16, 23]) box(c.g, 22.2, 0.5, 1.3, PRATO, 0, y, 0);
    for (let k = -3; k <= 3; k++) box(c.g, 0.35, 30, 1.26, k % 2 ? ROSA : PRATO, k * 3.4, 0, 0);
    for (const [x, w, h] of [[0, 4, 7], [-7, 2.6, 5.2], [7, 2.6, 5.2]] as const) {
      archPanel(c.g, w, h, '#3a2a22', x, 0, 0.62, 0, 0.1, true);
      for (let k = 0; k < 3; k++) c.g.add(new THREE.TorusGeometry(w / 2 + 0.2 + k * 0.22, 0.1, 4, 14, Math.PI), k === 1 ? ROSA : MARBLE, M(x, h - w / 2, 0.66 + k * 0.03));
      c.g.add(new THREE.CylinderGeometry(w / 2 - 0.1, w / 2 - 0.1, 0.05, 14, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), gold, M(x, h - w / 2, 0.7)); // a gold mosaic lunette
      c.g.add(new THREE.ConeGeometry(w * 0.7, 2.2, 3).rotateY(Math.PI / 6), MARBLE, M(x, h + 0.9, 0.6, 0, 1, 1, 0.2)); // a gable over the portal
    }
    // The rose window: a glowing wheel ringed in marble, its tracery like spokes.
    c.glow.add(new THREE.CylinderGeometry(3.2, 3.2, 0.06, 32).rotateX(Math.PI / 2), '#ffd9a0', M(0, 19.4, 0.62));
    c.g.add(new THREE.TorusGeometry(3.3, 0.35, 6, 40), MARBLE, M(0, 19.4, 0.68));
    c.g.add(new THREE.TorusGeometry(1.2, 0.14, 5, 24), PRATO, M(0, 19.4, 0.7));
    for (let i = 0; i < 12; i++) c.g.add(new THREE.BoxGeometry(0.1, 2.1, 0.06).translate(0, 2.25, 0), MARBLE, M(0, 19.4, 0.7, 0, 1, 1, 1, 0, (i / 12) * Math.PI * 2));
    const ped = new THREE.Shape([new THREE.Vector2(-6.5, 0), new THREE.Vector2(6.5, 0), new THREE.Vector2(0, 4.5)]);
    c.g.add(new THREE.ExtrudeGeometry(ped, { depth: 1.2, bevelEnabled: false }), MARBLE, M(0, 30, -0.6));
    c.glow.add(new THREE.CylinderGeometry(0.9, 0.9, 0.05, 16).rotateX(Math.PI / 2), '#ffd9a0', M(0, 31.8, 0.63));
    for (const x of [-11, -6.8, 6.8, 11]) { box(c.g, 1.2, 31.5, 1.6, MARBLE, x, 0, 0); pinnacle(c, x, 31.5, 0, 3.5, MARBLE); }
    // A row of niches along the façade, a robed statue in each (heads floating free), gabled over.
    for (const x of [-9, -4.6, 4.6, 9]) for (const y of [9.4, 16.8]) {
      archPanel(c.g, 1.3, 2.9, '#e0d8c4', x, y, 0.62, 0, 0.1, true);
      cone(c.g, 0.34, 1.9, '#f2ede0', x, y + 0.2, 0.9, 8); sphere(c.g, 0.17, '#f2ede0', x, y + 0.2 + 1.9 + HEAD_GAP + 0.17, 0.9, 8);
      c.g.add(new THREE.ConeGeometry(0.95, 0.9, 3).rotateY(Math.PI / 6), PRATO, M(x, y + 3.35, 0.66, 0, 1, 1, 0.15));
    }
  }));
  // ── The octagonal drum over the crossing, the three tribunes round it, the dome, the lantern.
  const dz = -14, DR = 13, DY = 18, DH = 12;
  for (const [x, z, ry] of [[-DR, dz, -Math.PI / 2], [DR, dz, Math.PI / 2], [0, dz - DR, Math.PI]] as const) c.g.frame(x, 0, z, ry, 1, () => c.glow.frame(x, 0, z, ry, 1, () => {
    surf(c, SURF.marble, () => c.g.add(new THREE.CylinderGeometry(7, 7, 18, 8, 1, false, -Math.PI / 2, Math.PI).translate(0, 9, 0), MARBLE));
    for (let k = 0; k < 4; k++) { const a = -Math.PI / 2 + ((k + 0.5) / 4) * Math.PI; archPanel(c.glow, 1.3, 4.6, '#ffd9a0', Math.sin(a) * 6.95, 8, Math.cos(a) * 6.95, a, 0.04, true); }
    surf(c, SURF.clayTile, () => c.g.add(new THREE.SphereGeometry(7.2, 8, 6, 0, Math.PI, 0, Math.PI / 2), tile, M(0, 18, 0)));
    box(c.g, 14.2, 0.5, 0.6, PRATO, 0, 17.6, 0);
  }));
  surf(c, SURF.marble, () => { box(c.g, 26, DY, 26, MARBLE, 0, 0, dz); c.g.add(new THREE.CylinderGeometry(DR, DR, DH, 8).rotateY(Math.PI / 8).translate(0, DH / 2, 0), MARBLE, M(0, DY, dz)); });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, fx = Math.sin(a) * DR * 0.925, fz2 = Math.cos(a) * DR * 0.925;
    c.g.frame(fx, DY, dz + fz2, a, 1, () => c.glow.frame(fx, DY, dz + fz2, a, 1, () => {
      c.glow.add(new THREE.CylinderGeometry(1.6, 1.6, 0.05, 20).rotateX(Math.PI / 2), '#ffd9a0', M(0, DH * 0.55, 0.05)); // the oculus
      c.g.add(new THREE.TorusGeometry(1.75, 0.28, 5, 24), MARBLE, M(0, DH * 0.55, 0.1));
      c.g.add(new THREE.TorusGeometry(2.1, 0.12, 4, 24), PRATO, M(0, DH * 0.55, 0.12));
      for (const sx of [-1, 1]) marblePanel(c, sx * 3.1, 1, 0.08, 2.4, DH - 2);
    }));
  }
  // Brunelleschi's dome: eight pointed sails of red tile, eight white marble ribs.
  const prof: Array<[number, number]> = [[DR, 0], [12.7, 4], [11.8, 8], [10.1, 12], [7.6, 15.5], [4.6, 18], [2.4, 19.2], [0.01, 19.6]];
  surf(c, SURF.clayTile, () => c.g.add(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 8).rotateY(Math.PI / 8), tile, M(0, DY + DH, dz)));
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    const pts = prof.slice(0, 7).map(([r, y]) => new THREE.Vector3(Math.sin(a) * (r + 0.1), DY + DH + y + 0.08, dz + Math.cos(a) * (r + 0.1)));
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.38, 5), MARBLE);
  }
  // The lantern: an octagonal marble temple with buttresses, a conical cap, a gilded ball.
  const ly = DY + DH + 19.2;
  surf(c, SURF.marble, () => cyl(c.g, 2.3, 2.5, 5, MARBLE, 0, ly, dz, 8));
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.g.add(new THREE.BoxGeometry(0.5, 4.4, 1.2), MARBLE, M(Math.sin(a) * 2.6, ly + 2.2, dz + Math.cos(a) * 2.6, a)); archPanel(c.glow, 0.8, 2.6, '#ffd9a0', Math.sin(a + Math.PI / 8) * 2.3, ly + 1, dz + Math.cos(a + Math.PI / 8) * 2.3, a + Math.PI / 8, 0.04, true); }
  cone(c.g, 2.4, 4.4, MARBLE, 0, ly + 5, dz, 8);
  sphere(c.g, 0.7, gold, 0, ly + 10.1, dz, 12);
  cone(c.g, 0.12, 1.4, gold, 0, ly + 10.6, dz, 6);
  const height = ly + 12;
  // ── Giotto's campanile beside the façade: storeys banded in white, green and pink, ever-larger windows, a crowning cornice.
  c.g.frame(22, 0, 34, 0, 1, () => c.glow.frame(22, 0, 34, 0, 1, () => {
    const T = 8, stages = [[0, 12, 0], [12, 10, 0], [22, 12, 1], [34, 12, 2], [46, 14, 3]] as const;
    for (const [y, h, win] of stages) {
      surf(c, SURF.marble, () => box(c.g, T, h, T, MARBLE, 0, y, 0));
      for (let side = 0; side < 4; side++) c.g.frame(0, y, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, y, 0, (side * Math.PI) / 2, 1, () => {
        box(c.g, T + 0.1, 0.4, 0.1, PRATO, 0, 0.2, T / 2 + 0.02); box(c.g, T + 0.1, 0.25, 0.1, ROSA, 0, h - 0.6, T / 2 + 0.02);
        if (win === 0) for (let k = -1; k <= 1; k++) marblePanel(c, k * 2.4, 2, T / 2 + 0.02, 1.9, h - 4);
        else { const n = win === 3 ? 1 : 2, ww = win === 3 ? 3.4 : 1.5; for (let k = 0; k < n; k++) { const x = n === 1 ? 0 : (k - 0.5) * 3; archPanel(c.glow, ww, h - 4, '#ffd9a0', x, 1.8, T / 2 + 0.02, 0, 0.04, true); for (let q = 1; q <= win; q++) box(c.g, 0.1, h - 5, 0.08, MARBLE, x - ww / 2 + (q * ww) / (win + 1), 1.8, T / 2 + 0.05); } }
      }));
    }
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.6, 0.6, 60, MARBLE, sx * (T / 2), 0, sz * (T / 2), 8);
    box(c.g, T + 2.4, 1, T + 2.4, MARBLE, 0, 60, 0);
    for (let k = 0; k < 24; k++) { const side = Math.floor(k / 6), q = (k % 6) / 5 - 0.5; c.g.frame(0, 59.2, 0, (side * Math.PI) / 2, 1, () => box(c.g, 0.4, 0.8, 1.2, MARBLE, q * T, 0, T / 2 + 0.6)); }
    for (let x = -T / 2 - 1; x <= T / 2 + 1; x += 0.8) for (const sz of [-1, 1]) { box(c.g, 0.2, 1, 0.2, MARBLE, x, 61, sz * (T / 2 + 1)); box(c.g, 0.2, 1, 0.2, MARBLE, sz * (T / 2 + 1), 61, x); }
  }));
  // ── The Baptistery: octagonal, striped white and green, a low pyramid roof and a little lantern, gilded doors.
  c.g.frame(-22, 0, 28, 0, 1, () => c.glow.frame(-22, 0, 28, 0, 1, () => {
    surf(c, SURF.marble, () => c.g.add(new THREE.CylinderGeometry(7, 7, 14, 8).rotateY(Math.PI / 8).translate(0, 7, 0), MARBLE));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      c.g.frame(Math.sin(a) * 6.5, 0, Math.cos(a) * 6.5, a, 1, () => c.glow.frame(Math.sin(a) * 6.5, 0, Math.cos(a) * 6.5, a, 1, () => {
        for (const y of [0.4, 5, 9.6]) box(c.g, 5.4, 0.3, 0.06, PRATO, 0, y, 0.02);
        for (const x of [-1.8, 0, 1.8]) box(c.g, 0.25, 13.4, 0.06, PRATO, x, 0.4, 0.02);
        for (const x of [-0.9, 0.9]) archPanel(c.glow, 0.9, 2.2, '#ffd9a0', x, 6.3, 0.03, 0, 0.04, false);
        if (i === 2) { box(c.g, 2.6, 4.6, 0.1, gold, 0, 0, 0.05); for (let q = 0; q < 10; q++) box(c.g, 1, 0.8, 0.04, '#b8942a', (q % 2 ? 0.6 : -0.6), 0.3 + Math.floor(q / 2) * 0.86, 0.1); } // the gilded doors
        if (i === 2) { box(c.g, 3.2, 0.3, 0.3, MARBLE, 0, 4.6, 0.1); for (const sx of [-1, 1]) box(c.g, 0.3, 4.6, 0.3, PRATO, sx * 1.45, 0, 0.1); }
      }));
    }
    c.g.add(new THREE.ConeGeometry(7.6, 3.2, 8).rotateY(Math.PI / 8), MARBLE, M(0, 15.6, 0));
    cyl(c.g, 1.1, 1.2, 1.6, MARBLE, 0, 17, 0, 8); cone(c.g, 1.2, 1.4, MARBLE, 0, 18.6, 0, 8); sphere(c.g, 0.3, gold, 0, 20.2, 0, 8);
  }));
  // Florentine iron lanterns round the piazza, a café with umbrellas at its edge.
  for (const x of [-26, -14, 14]) { cyl(c.g, 0.1, 0.14, 4.4, '#1f1f24', x, 0, 50, 8); box(c.g, 0.7, 0.06, 0.06, '#1f1f24', x + 0.3, 4.2, 50); c.glow.add(new THREE.CylinderGeometry(0.22, 0.14, 0.5, 6), '#ffe0a0', M(x + 0.6, 3.75, 50)); cone(c.g, 0.26, 0.3, '#1f1f24', x + 0.6, 4, 50, 6); o.colliders.push({ x, z: 50, r: 0.4, h: 5 }); }
  for (let k = 0; k < 3; k++) {
    const x = -22 + k * 4.2, z = 44;
    cyl(c.g, 0.04, 0.04, 2.4, '#e8e0d0', x, 0, z, 5); cone(c.g, 1.5, 0.6, k % 2 ? '#b5552e' : '#f2ede0', x, 2.2, z, 8);
    cyl(c.g, 0.45, 0.45, 0.05, '#e8e0d0', x, 0.75, z, 12); cyl(c.g, 0.04, 0.06, 0.75, '#1f1f24', x, 0, z, 5);
    for (const sx of [-1, 1]) { box(c.g, 0.4, 0.45, 0.4, '#1f1f24', x + sx * 0.8, 0, z); box(c.g, 0.4, 0.5, 0.05, '#1f1f24', x + sx * 1.0, 0.45, z); }
    o.colliders.push({ x, z, r: 1.1, h: 2.4 });
  }
  // Colliders.
  for (const z of [0, 10, 20, 30, 37]) o.colliders.push({ x: 0, z, r: 10.5, h: 32 });
  o.colliders.push({ x: 0, z: dz, r: 14, h: height }, { x: -13, z: dz, r: 7, h: 25 }, { x: 13, z: dz, r: 7, h: 25 }, { x: 0, z: dz - 13, r: 7, h: 25 });
  o.colliders.push({ x: 22, z: 34, r: 5.9, h: 62 }, { x: -22, z: 28, r: 7.4, h: 21 });
  o.height = height;
};

// ───────────────────────────── Kaveri Coast ─────────────────────────────

/** A little robed figure with its head floating free (no face). */
function statuette(c: Ctx, x: number, y: number, z: number, h: number, col: string): void {
  cone(c.g, h * 0.22, h * 0.7, col, x, y, z, 6);
  sphere(c.g, h * 0.1, '#e8b890', x, y + h * 0.7 + 0.04 * h + h * 0.12, z, 6);
}
/** A kalasha: the golden pot-finial of a temple roof. */
function kalasha(c: Ctx, x: number, y: number, z: number, s: number): void {
  const gold = '#d4af37';
  cyl(c.g, 0.16 * s, 0.22 * s, 0.14 * s, gold, x, y, z, 8);
  sphere(c.g, 0.26 * s, gold, x, y + 0.36 * s, z, 10, 1.1);
  cyl(c.g, 0.1 * s, 0.14 * s, 0.2 * s, gold, x, y + 0.62 * s, z, 8);
  cone(c.g, 0.1 * s, 0.4 * s, gold, x, y + 0.8 * s, z, 8);
}

const indiasouth: Monument = (c, o) => {
  const granite = '#b8ad96', gold = '#d4af37';
  const TIER = ['#e8a86a', '#2f7a5a', '#c23b2a', '#e2b43a', '#5a8ab5', '#e8a86a', '#c23b2a', '#2f7a5a', '#e2b43a'];
  // ── The gopuram: a granite base with the gateway right through it, nine painted tiers above, the vaulted crown.
  const gz = 10, GW = 24, GD = 14, GH = 9;
  const sh = new THREE.Shape();
  sh.moveTo(-GW / 2, 0); sh.lineTo(-2.4, 0); sh.lineTo(-2.4, 7); sh.lineTo(2.4, 7); sh.lineTo(2.4, 0); sh.lineTo(GW / 2, 0); sh.lineTo(GW / 2, GH); sh.lineTo(-GW / 2, GH); sh.lineTo(-GW / 2, 0);
  const base = new THREE.ExtrudeGeometry(sh, { depth: GD, bevelEnabled: false });
  base.translate(0, 0, gz - GD / 2);
  surf(c, SURF.ashlar, () => c.g.add(base, granite));
  for (const sz of [-1, 1]) {
    const fz = gz + sz * (GD / 2 + 0.05);
    for (let k = -5; k <= 5; k++) if (Math.abs(k) > 1) box(c.g, 0.7, GH, 0.2, '#c8bda6', k * 2.1, 0, fz); // pilasters
    for (const y of [3, 6.5]) box(c.g, GW + 0.3, 0.35, 0.3, '#a89c84', 0, y, fz);
    box(c.g, 5.6, 0.5, 0.3, gold, 0, 7, fz); // the lintel, gilded
    for (let k = 0; k < 9; k++) sphere(c.g, 0.2, ['#ff9a1f', '#ffd23a', '#ffffff'][k % 3], -2.2 + k * 0.55, 6.8, fz + sz * 0.2, 5); // a toran of flowers
  }
  let y = GH, w = GW - 1, d = GD - 1;
  for (let t = 0; t < TIER.length; t++) {
    const th = 2.8, col = TIER[t];
    box(c.g, w, th, d, col, 0, y, gz);
    box(c.g, w + 0.6, 0.35, d + 0.6, '#f4efe4', 0, y + th - 0.2, gz); // the cornice (kapota)
    for (const sz of [-1, 1]) {
      const fz = gz + sz * (d / 2 + 0.25);
      // Miniature shrines along the tier: square domed kutas at the ends, barrel-roofed salas between, figures in the niches.
      const n = Math.max(3, Math.floor(w / 2.2));
      for (let k = 0; k < n; k++) {
        const x = -w / 2 + w * (k + 0.5) / n, end = k === 0 || k === n - 1, c2 = TIER[(t + k + 1) % TIER.length];
        box(c.g, 1.6, 1.2, 0.6, c2, x, y + th + 0.15, fz - sz * 0.2);
        if (end) sphere(c.g, 0.55, c2, x, y + th + 1.35, fz - sz * 0.2, 8, 0.8);
        else c.g.add(new THREE.CylinderGeometry(0.55, 0.55, 1.6, 8, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), c2, M(x, y + th + 1.35, fz - sz * 0.2));
        archPanel(c.g, 0.9, 1.6, '#3a2a22', x, y + 0.5, fz + sz * 0.02, sz > 0 ? 0 : Math.PI, 0.05, false);
        statuette(c, x, y + 0.55, fz + sz * 0.1, 1.3, TIER[(t + k + 3) % TIER.length]);
      }
    }
    for (const sx of [-1, 1]) statuette(c, sx * (w / 2 + 0.2), y + 0.3, gz, 1.5, TIER[(t + 2) % TIER.length]);
    y += th;
    w *= 0.9; d *= 0.86;
  }
  // The crown (shala): a barrel vault along the gopuram, arched gable windows, a row of golden kalashas.
  c.g.add(new THREE.CylinderGeometry(d * 0.62, d * 0.62, w, 16, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), '#e2b43a', M(0, y + 0.4, gz));
  for (const sx of [-1, 1]) { c.g.add(new THREE.CylinderGeometry(d * 0.64, d * 0.64, 0.3, 16, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), '#c23b2a', M(sx * w / 2, y + 0.4, gz)); archPanel(c.glow, 1, 1.4, '#ffd9a0', sx * (w / 2 + 0.16), y + 0.5, gz, sx * Math.PI / 2, 0.04, false); }
  for (let k = 0; k < 7; k++) kalasha(c, -w * 0.42 + (k * w * 0.84) / 6, y + 0.4 + d * 0.6, gz, 1.8);
  const gh = y + d * 0.6 + 2.2;
  // At the gateway: brass lamps, guardian figures in the niches either side, a kolam on the ground, bells overhead.
  for (const sx of [-1, 1]) { kuthuvilakku(c, sx * 3.3, gz + GD / 2 + 1, 1.2); statuette(c, sx * 3.6, 0, gz + GD / 2 + 0.25, 3.2, sx < 0 ? '#2f7a5a' : '#c23b2a'); }
  kolam(c, 0, gz + GD / 2 + 3.6, 2.2, 0.2);
  for (let k = 0; k < 5; k++) { cyl(c.g, 0.012, 0.012, 0.5, '#3a2a22', -1.6 + k * 0.8, 6.5, gz + GD / 2 + 0.2, 3); cone(c.g, 0.12, 0.22, '#c9a24a', -1.6 + k * 0.8, 6.28, gz + GD / 2 + 0.2, 8); }
  for (const sx of [-1, 1]) for (const z of [gz - 4.5, gz, gz + 4.5]) o.colliders.push({ x: sx * 7.2, z, r: 4.8, h: gh });
  // ── The enclosure wall (prakara), stripes of red and white, a pillared hall and the sanctum's own tower within.
  for (const sx of [-1, 1]) {
    surf(c, SURF.plaster, () => { box(c.g, 1.2, 5, 36, '#f4efe4', sx * 22, 0, gz - 18 - GD / 2); box(c.g, 22 - GW / 2, 5, 1.2, '#f4efe4', sx * (GW / 2 + (22 - GW / 2) / 2), 0, gz - GD / 2 + 0.6); });
    for (let k = 0; k < 8; k++) box(c.g, 1.25, 0.5, 36, k % 2 ? '#c23b2a' : '#f4efe4', sx * 22, 0.6 + k * 0.55, gz - 18 - GD / 2);
    for (let z = gz - 40; z < gz - 4; z += 4) o.colliders.push({ x: sx * 22, z, r: 2.1, h: 5 });
  }
  surf(c, SURF.plaster, () => box(c.g, 44, 5, 1.2, '#f4efe4', 0, 0, gz - 36 - GD / 2));
  for (let x = -20; x <= 20; x += 4) o.colliders.push({ x, z: gz - 36 - GD / 2, r: 2.1, h: 5 });
  // The mandapa: a flat-roofed hall on rows of carved pillars, open all round.
  const mz = -12;
  surf(c, SURF.ashlar, () => box(c.g, 16, 1, 12, granite, 0, 0, mz));
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) {
    const x = -6.5 + i * 2.6, z = mz - 4.5 + j * 3;
    cyl(c.g, 0.34, 0.34, 4.2, '#c8bda6', x, 1, z, 8);
    box(c.g, 0.9, 0.5, 0.9, '#a89c84', x, 1, z); box(c.g, 1.1, 0.4, 1.1, '#a89c84', x, 4.8, z); // base and bracket-capital
    for (let q = 0; q < 3; q++) box(c.g, 0.78, 0.3, 0.78, '#d8ccb4', x, 2 + q * 0.9, z);
  }
  surf(c, SURF.ashlar, () => box(c.g, 17, 0.8, 13, granite, 0, 5.2, mz));
  box(c.g, 17.4, 0.25, 13.4, '#c23b2a', 0, 6, mz);
  for (let i = 0; i < 6; i++) for (let j = 0; j < 4; j++) o.colliders.push({ x: -6.5 + i * 2.6, z: mz - 4.5 + j * 3, r: 0.5, h: 5 });
  // The vimana over the sanctum: a stepped pyramid of storeys with shrine-rows, an octagonal dome and one kalasha.
  const vz = mz - 14;
  let vy = 0, vw = 10;
  surf(c, SURF.ashlar, () => box(c.g, vw, 6, vw, granite, 0, 0, vz));
  vy = 6;
  for (let t = 0; t < 4; t++) {
    box(c.g, vw * 0.9, 2.2, vw * 0.9, TIER[(t + 4) % TIER.length], 0, vy, vz);
    for (let k = 0; k < 4; k++) for (let side = 0; side < 4; side++) c.g.frame(0, vy + 2.2, vz, (side * Math.PI) / 2, 1, () => { box(c.g, 1, 0.8, 0.6, TIER[(t + k) % TIER.length], -vw * 0.33 + k * vw * 0.22, 0, vw * 0.42); sphere(c.g, 0.35, TIER[(t + k + 2) % TIER.length], -vw * 0.33 + k * vw * 0.22, 1.05, vw * 0.42, 6, 0.8); });
    vy += 2.2; vw *= 0.78;
  }
  c.g.add(new THREE.SphereGeometry(vw * 0.62, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2).rotateY(Math.PI / 8), '#e2b43a', M(0, vy + 0.3, vz));
  kalasha(c, 0, vy + 0.3 + vw * 0.6, vz, 2.2);
  o.colliders.push({ x: 0, z: vz, r: 7.2, h: vy + 4 });
  // The temple chariot in the court, banana plants and coconut palms along the walls.
  ratha(c, -13, -2, 0.4);
  o.colliders.push({ x: -13, z: -2, r: 3, h: 10 });
  for (const [x, z] of [[14, -2], [16, -8], [-17, -20], [17, -24]] as const) banana(c, x, z, 1.1);
  for (const [x, z, i] of [[-26, 14, 0], [26, 16, 1], [-28, -6, 2], [28, -14, 1]] as const) tree(c.g, 'coconut', x, 0, z, 1.1 + i * 0.1, () => c.rng.next());
  // The flagstaff (dhvajastambha) in the court, gilded, with its bells.
  cyl(c.g, 0.25, 0.4, 12, gold, 0, 0, -2, 10);
  for (let k = 0; k < 6; k++) cyl(c.g, 0.45 - k * 0.03, 0.45 - k * 0.03, 0.18, gold, 0, 1 + k * 1.7, -2, 10);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; cone(c.g, 0.12, 0.24, '#c9a24a', Math.cos(a) * 0.5, 11.2, -2 + Math.sin(a) * 0.5, 6); }
  o.colliders.push({ x: 0, z: -2, r: 0.8, h: 12 });
  // ── The temple tank before the gopuram: steps down on all four sides to the pool, a little pavilion in its middle.
  c.g.frame(0, 0, 36, 0, 1, () => {
    for (let k = 0; k < 3; k++) {
      const outer = 11.4 - k * 0.7, inner = 8.6, hgt = 0.2 * (k + 1), wd = outer - inner;
      for (const sgn of [-1, 1]) {
        surf(c, SURF.ashlar, () => { box(c.g, outer * 2, hgt, wd, '#c9bfa8', 0, 0, sgn * (inner + wd / 2)); box(c.g, wd, hgt, inner * 2, '#c9bfa8', sgn * (inner + wd / 2), 0, 0); });
      }
    }
    for (const [a, b] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.18, 0.2, 3, '#c8bda6', a * 1.2, 0.3, b * 1.2, 8);
    box(c.g, 3.2, 0.3, 3.2, '#c8bda6', 0, 0, 0);
    c.g.add(new THREE.ConeGeometry(2.4, 1.6, 4).rotateY(Math.PI / 4), '#c23b2a', M(0, 4.1, 0));
    kalasha(c, 0, 4.9, 0, 0.8);
  });
  waterPool(c, 0, 0, 36, 17, 17, 0, { stone: '#bdb39c', kerb: 0.75, speed: 0.1 });
  o.colliders.push({ x: 0, z: 36, r: 1.8, h: 5 });
  o.height = gh + 2;
};

// ───────────────────────────── Madinat an-Nur ─────────────────────────────

/** A gilded crescent finial on a rod, at (x, y, z). */
function crescent(c: Ctx, x: number, y: number, z: number, s: number): void {
  const gold = '#d4af37';
  cyl(c.g, 0.05 * s, 0.07 * s, 1.2 * s, gold, x, y, z, 6);
  for (let k = 0; k < 3; k++) sphere(c.g, (0.2 - k * 0.04) * s, gold, x, y + (0.3 + k * 0.3) * s, z, 8);
  c.g.add(new THREE.TorusGeometry(0.42 * s, 0.07 * s, 6, 18, Math.PI * 1.45), gold, M(x, y + 1.6 * s, z, 0, 1, 1, 1, 0, -Math.PI * 0.225 + Math.PI / 2));
}

/**
 * An arcade: a wall `len` long (along x) and `h` high with pointed arches opening right through it
 * every `bay` metres, `depth` thick; drawn on the frame's +z side. Returns the arch centres.
 */
function arcade(c: Ctx, len: number, h: number, depth: number, bay: number, open: number, spring: number, col: string, horseshoe = false): number[] {
  const n = Math.floor(len / bay), xs: number[] = [];
  const sh = new THREE.Shape();
  sh.moveTo(-len / 2, 0);
  for (let k = 0; k < n; k++) {
    const x = -len / 2 + (len / n) * (k + 0.5);
    xs.push(x);
    if (horseshoe) {
      // The Maghrebi horseshoe: the circle runs on below its centre, narrowing the opening at the jambs.
      const R = open / 2 / Math.cos(0.35);
      sh.lineTo(x - open / 2, 0); sh.lineTo(x - open / 2, spring - R * Math.sin(0.35));
      sh.absarc(x, spring, R, Math.PI + 0.35, -0.35, true);
      sh.lineTo(x + open / 2, 0);
      continue;
    }
    sh.lineTo(x - open / 2, 0); sh.lineTo(x - open / 2, spring);
    sh.quadraticCurveTo(x - open / 2, spring + open * 0.55, x, spring + open * 0.72);
    sh.quadraticCurveTo(x + open / 2, spring + open * 0.55, x + open / 2, spring);
    sh.lineTo(x + open / 2, 0);
  }
  sh.lineTo(len / 2, 0); sh.lineTo(len / 2, h); sh.lineTo(-len / 2, h); sh.lineTo(-len / 2, 0);
  const geo = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 6 });
  geo.translate(0, 0, -depth / 2);
  surf(c, SURF.plaster, () => c.g.add(geo, col));
  return xs;
}

/** A zellige dado on an arcade's piers only — the arch openings stay clear to walk through. */
function pierDado(c: Ctx, len: number, xs: number[], open: number, z: number, h: number, cols: string[]): void {
  const edges = [-len / 2, ...xs.flatMap((x) => [x - open / 2, x + open / 2]), len / 2];
  for (let i = 0; i < edges.length; i += 2) {
    const a = edges[i], b = edges[i + 1];
    if (b - a > 0.2) zellige(c, (a + b) / 2, 0, z, b - a, h, cols, h * 0.9);
  }
}

const islamic: Monument = (c, o) => {
  const white = '#f4efe4', stuccoC = '#ece2cc', shade = '#d8c8a8', green = '#2f7a4a', gold = '#d4af37', cedar = '#6b3a22';
  const ZEL = ['#f4efe4', '#2f7f9f', '#3a9a6a', '#1f4f7a', '#e8b84a', '#c23b2a'];
  const RED: [string, string] = ['#b8483a', '#f4efe4'];
  const E = 26, S = 30, N = -3.5, BACK = 5;
  // ═══ The courtyard (sahn) ═══
  // Marble paving with a zellige border round a long pool, two basins bubbling at its ends.
  surf(c, SURF.marble, () => box(c.g, 2 * E, 0.2, S - N, '#efe8da', 0, 0, (S + N) / 2));
  for (const sx of [-1, 1]) c.g.frame(sx * 5.2, 0.2, 11, Math.PI / 2, 1, () => c.g.frame(0, 0, 0, 0, 1, () => { for (let k = 0; k < 22; k++) { box(c.g, 0.7, 0.03, 0.7, ZEL[1 + (k % 4)], -10.5 + k, 0, 0, Math.PI / 4); } }));
  waterPool(c, 0, 0.2, 11, 7, 15, 0, { stone: '#e8dcc6', kerb: 0.5, speed: 0.05 });
  for (const sx of [-1, 1]) zellige(c, sx * 3.75, 0.2, 11, 0.4, 0.5, ZEL, 0.4);
  for (const z of [4.2, 17.8]) { waterBasin(c, 0, 0.2, z, 1.1, { kerb: 0.5, jetHeight: 0.8 }); }
  // Orange trees in zellige planters down both sides; brass lanterns on posts between them.
  for (const sx of [-1, 1]) for (const z of [2, 8, 14, 20]) plantedTree(c, sx * 10, z, 'orange', ZEL);
  for (const sx of [-1, 1]) for (const z of [5, 11, 17]) { cyl(c.g, 0.08, 0.12, 3.4, '#3a3228', sx * 10, 0.2, z, 6); box(c.g, 0.9, 0.08, 0.08, '#3a3228', sx * 10 - sx * 0.4, 3.5, z); brassLantern(c, sx * 10 - sx * 0.8, 3.6, z, 1.1); }
  // The ablution fountain (a qubba): an octagon of columns on a zellige base, a green-tiled dome.
  c.g.frame(0, 0.2, 24.5, 0, 1, () => c.glow.frame(0, 0.2, 24.5, 0, 1, () => {
    surf(c, SURF.marble, () => cyl(c.g, 2.7, 2.8, 0.8, white, 0, 0, 0, 8));
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; c.g.frame(Math.sin(a) * 2.55, 0, Math.cos(a) * 2.55, a, 1, () => zellige(c, 0, 0.08, 0.02, 1.9, 0.6, ZEL, 0.3)); }
    cyl(c.g, 2.5, 2.5, 0.05, '#4aa0c0', 0, 0.72, 0, 8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cyl(c.g, 0.16, 0.18, 4, white, Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3, 10); box(c.g, 0.4, 0.3, 0.4, gold, Math.cos(a) * 3.3, 4, Math.sin(a) * 3.3); cyl(c.glow, 0.03, 0.05, 0.6, '#dff6ff', Math.cos(a) * 1.4, 0.8, Math.sin(a) * 1.4, 4); }
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; c.g.frame(Math.sin(a) * 3.2, 0, Math.cos(a) * 3.2, a, 1, () => { voussoirs(c, 0, 3.4, 0, 1.1, 0.3, RED, true, 11); stucco(c, 2.6, 4.3, 0, stuccoC, shade); }); }
    surf(c, SURF.glazed, () => { cyl(c.g, 3.7, 3.7, 0.4, green, 0, 5.2, 0, 8); c.g.add(new THREE.SphereGeometry(3.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), green, M(0, 5.6, 0)); });
    crescent(c, 0, 9, 0, 0.8);
    brassLantern(c, 0, 5.2, 0, 1.2);
  }));
  o.colliders.push({ x: 0, z: 24.5, r: 3.6, h: 10 });

  // ═══ The riwaq: arcades of horseshoe arches round three sides, red-and-white voussoirs, domed bays. ═══
  const riwaq = (len: number, gate: boolean) => c.glow.frame(0, 0, 0, 0, 1, () => {
    const xs = arcade(c, len, 7, 0.9, 4, 2.8, 3.6, white, true);
    pierDado(c, len, xs, 2.8, 0.47, 1.1, ZEL);
    for (const bx of xs) {
      voussoirs(c, bx, 3.6, 0.5, 1.49, 0.3, RED, true, 13);
      for (const sx of [-1, 1]) { cyl(c.g, 0.2, 0.2, 2.9, '#e8e0d0', bx + sx * 1.6, 1.1, 0.55, 10); box(c.g, 0.55, 0.35, 0.55, gold, bx + sx * 1.6, 3.9, 0.55); }
      brassLantern(c, bx, 6.3, -2.4, 1);
      c.g.add(new THREE.SphereGeometry(1.6, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), white, M(bx, 7.5, -2.5));
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.g.add(new THREE.TorusGeometry(1.6, 0.05, 3, 12, Math.PI / 2), gold, M(bx, 7.5, -2.5, a, 1, 1, 1, 0, 0)); }
      cone(c.g, 0.06, 0.5, gold, bx, 9.1, -2.5, 5);
      if (!(gate && Math.abs(bx) < 1)) { starDoor(c, bx, 0, -BACK + 0.45, 1.6, 2.6, cedar); box(c.glow, 1.4, 0.9, 0.04, '#ffe6b0', bx, 3, -BACK + 0.42); }
    }
    stucco(c, len, 5.7, 0.47, stuccoC, shade);
    merlonRow(c, len, 7, 0.2, white);
    // Behind the arches: the back wall (open at the gate), the roof.
    surf(c, SURF.plaster, () => {
      if (gate) for (const sx of [-1, 1]) box(c.g, len / 2 - 2.4, 8.5, 0.9, white, sx * (len / 4 + 1.2), 0, -BACK);
      else box(c.g, len, 8.5, 0.9, white, 0, 0, -BACK);
      box(c.g, len, 0.5, BACK - 0.4, white, 0, 7, -BACK / 2 - 0.2);
    });
    zelligeBand(c, len, 0, -BACK + 0.46, 1.1, ZEL);
  });
  const sides: Array<[number, number, number, number, boolean]> = [[0, S, Math.PI, 2 * E + 2 * BACK, true], [-E, (S + N) / 2, Math.PI / 2, S - N, false], [E, (S + N) / 2, -Math.PI / 2, S - N, false]];
  for (const [x, z, ry, len, gate] of sides) c.g.frame(x, 0.2, z, ry, 1, () => c.glow.frame(x, 0.2, z, ry, 1, () => riwaq(len, gate)));
  // The outer faces of the precinct: blind sebka nets, a zellige band, merlons; corner towers.
  for (const [x, z, ry, len] of [[0, S + BACK + 0.46, 0, 2 * E + 2 * BACK], [-(E + BACK + 0.46), (S + N) / 2, -Math.PI / 2, S - N], [E + BACK + 0.46, (S + N) / 2, Math.PI / 2, S - N]] as const) c.g.frame(x, 0, z, ry, 1, () => {
    for (let k = 0; k < Math.floor(len / 5); k++) { const bx = -len / 2 + 2.5 + k * 5; if (Math.abs(bx) > 9) sebka(c, bx, 3, 0, 3.4, 4.6, stuccoC, 0.85); }
    box(c.g, len, 0.4, 0.2, green, 0, 8.1, 0.05);
  });
  for (const [x, z] of [[-E - BACK, S + BACK], [E + BACK, S + BACK], [-E - BACK, N - 1], [E + BACK, N - 1]] as const) {
    surf(c, SURF.plaster, () => box(c.g, 5.4, 12, 5.4, white, x, 0, z));
    for (let side = 0; side < 4; side++) c.g.frame(x, 0, z, (side * Math.PI) / 2, 1, () => { sebka(c, 0, 6, 2.72, 3.6, 4.4, stuccoC, 0.9); box(c.g, 5.5, 0.4, 0.2, green, 0, 11, 2.72); merlonRow(c, 5.4, 12, 2.5, white, 1.1); });
    o.colliders.push({ x, z, r: 3.6, h: 14 });
  }
  for (let x = -E - 2; x <= E + 2; x += 4) if (Math.abs(x) > 3) o.colliders.push({ x, z: S + 0.2, r: 0.8, h: 8 }, { x, z: S + BACK, r: 1.2, h: 9 });
  for (const sx of [-1, 1]) for (let z = N + 2; z <= S - 2; z += 4) o.colliders.push({ x: sx * (E + 0.2), z, r: 0.8, h: 8 }, { x: sx * (E + BACK), z, r: 1.2, h: 9 });

  // ═══ The gatehouse (bab): a horseshoe passage right through, zellige and carved stucco, a cedar canopy, towers. ═══
  c.g.frame(0, 0, S + BACK - 0.45, 0, 1, () => c.glow.frame(0, 0, S + BACK - 0.45, 0, 1, () => {
    const GW = 16, GH = 15, GD = 9, j = 2.2, R = j / Math.cos(0.35), sp = 5.8;
    const g2 = new THREE.Shape();
    g2.moveTo(-GW / 2, 0); g2.lineTo(-j, 0); g2.lineTo(-j, sp - R * Math.sin(0.35)); g2.absarc(0, sp, R, Math.PI + 0.35, -0.35, true); g2.lineTo(j, 0); g2.lineTo(GW / 2, 0); g2.lineTo(GW / 2, GH); g2.lineTo(-GW / 2, GH); g2.lineTo(-GW / 2, 0);
    surf(c, SURF.plaster, () => c.g.add(new THREE.ExtrudeGeometry(g2, { depth: GD, bevelEnabled: false, curveSegments: 16 }), white));
    const fz = GD + 0.02;
    // The alfiz: a raised frame round the arch, zellige in its spandrels.
    for (const sx of [-1, 1]) { zellige(c, sx * 4.1, 0.2, fz, 3, 8.4, ZEL, 0.5); box(c.g, 0.35, 10.6, 0.3, gold, sx * 5.8, 0, fz + 0.05); }
    box(c.g, 11.95, 0.35, 0.3, gold, 0, 10.4, fz + 0.05);
    voussoirs(c, 0, sp, fz + 0.1, R, 0.3, RED, true, 19);
    for (const sx of [-1, 1]) zellige(c, sx * (j + 1.7), 0.2, fz - 0.01, 3.4, 0.9, ZEL, 0.45); // the dado, stopping at the jambs
    stucco(c, 11.2, 8.9, fz + 0.03, stuccoC, shade);
    // The carved band and the cedar canopy on its brackets, green tiles on top.
    box(c.g, 14, 1.2, 0.3, gold, 0, 11, fz + 0.1);
    for (let k = 0; k < 16; k++) box(c.g, 0.5, 0.5, 0.06, ZEL[1 + (k % 5)], -6.8 + k * 0.9, 11.35, fz + 0.28, Math.PI / 4);
    for (let k = 0; k < 9; k++) { box(c.g, 0.35, 0.6, 2.2, cedar, -6 + k * 1.5, 12.2, fz + 1.1); }
    surf(c, SURF.glazed, () => c.g.add(new THREE.BoxGeometry(15, 0.25, 2.8), green, M(0, 13.2, fz + 1.2, 0, 1, 1, 1, 0.35, 0)));
    merlonRow(c, GW, GH, fz - 0.3, white);
    // The great doors, folded back against the passage walls.
    for (const sx of [-1, 1]) c.g.frame(sx * (j - 0.1), 0, GD - 3.4, sx * Math.PI / 2, 1, () => starDoor(c, 0, 0, 0, 3.8, 6.4, cedar));
    for (const sx of [-1, 1]) brassLantern(c, sx * 3.2, 7.6, fz + 0.8, 1.4);
    // The flanking towers, taller, sebka on their faces, green-tiled pyramid caps.
    for (const sx of [-1, 1]) {
      const tx = sx * (GW / 2 + 2.4);
      surf(c, SURF.plaster, () => box(c.g, 4.8, 19, 6, white, tx, 0, GD / 2 + 1));
      c.g.frame(tx, 0, GD / 2 + 4.02, 0, 1, () => c.glow.frame(tx, 0, GD / 2 + 4.02, 0, 1, () => { sebka(c, 0, 9, 0, 3.4, 6, stuccoC, 0.85); starWindow(c, 0, 3.4, 0, 1, 2.4, white, ['#ffcf7a', '#7ac8ff', '#ff8a8a']); box(c.g, 4.9, 0.5, 0.2, green, 0, 17, 0.05); }));
      merlonRow(c, 4.8, 19, GD / 2 + 4, white, 1.2);
      surf(c, SURF.glazed, () => c.g.add(new THREE.ConeGeometry(2.8, 2.6, 4).rotateY(Math.PI / 4), green, M(tx, 20.3, GD / 2 + 1)));
      sphere(c.g, 0.25, gold, tx, 21.8, GD / 2 + 1, 8);
    }
  }));
  for (const sx of [-1, 1]) { for (const dz of [1.5, 4.5, 7.5]) o.colliders.push({ x: sx * 5.1, z: S + BACK - 0.45 + dz, r: 2.9, h: 16 }); o.colliders.push({ x: sx * 10.4, z: S + BACK + 4, r: 3.6, h: 22 }); }

  // ═══ The prayer hall: a portico of horseshoe arches, the great pishtaq with its muqarnas hood, star windows. ═══
  const hz0 = -40, hz1 = -8, HH = 20;
  surf(c, SURF.plaster, () => box(c.g, 64, HH, hz1 - hz0, white, 0, 0, (hz0 + hz1) / 2));
  c.g.frame(0, 0.2, N, 0, 1, () => c.glow.frame(0, 0.2, N, 0, 1, () => {
    const xs = arcade(c, 64, 10.5, 1, 5.8, 3.8, 5.4, white, true);
    pierDado(c, 64, xs, 3.8, 0.52, 1.3, ZEL);
    for (const bx of xs) {
      if (Math.abs(bx) < 1) continue;
      voussoirs(c, bx, 5.4, 0.55, 2.02, 0.3, RED, true, 15);
      brassLantern(c, bx, 9.5, -2, 1.3);
    }
    stucco(c, 64, 8.6, 0.52, stuccoC, shade);
    surf(c, SURF.plaster, () => box(c.g, 64, 0.6, hz1 - N, white, 0, 10.5, -(hz1 - N) / 2 - 0.5));
    merlonRow(c, 64, 11.1, 0.2, white);
    // On the hall wall inside the portico: doors, star windows over them, a zellige dado.
    c.g.frame(0, 0, hz1 - N + 0.02, 0, 1, () => c.glow.frame(0, 0, hz1 - N + 0.02, 0, 1, () => {
      zelligeBand(c, 64, 0, 0, 1.3, ZEL);
      for (const bx of xs) { starDoor(c, bx, 0, 0.05, 2, 4, cedar); starWindow(c, bx, 5.4, 0.02, 1.4, 2.6, white, ['#ffcf7a', '#7ac8ff', '#7affb0', '#ff8a8a']); }
    }));
    // The pishtaq: a tall frame, a deep niche hooded with muqarnas, the bronze doors glowing at its foot.
    const PW = 15, PH = 27;
    surf(c, SURF.plaster, () => { for (const sx of [-1, 1]) box(c.g, 3.2, PH, 3, white, sx * (PW / 2 - 1.6), 0, 0.5); box(c.g, PW, PH - 17, 3, white, 0, 17, 0.5); });
    muqarnas(c, 0, 12.6, -0.6, PW - 6.4, 7, [white, stuccoC, '#2f7f9f', gold]);
    starDoor(c, 0, 0, -1.2, 5, 9, cedar);
    starWindow(c, 0, 9.6, -1.1, 3, 2.6, white, ['#ffcf7a', '#7ac8ff', '#7affb0']);
    for (const sx of [-1, 1]) zellige(c, sx * (PW / 2 - 1.6), 0.2, 2.02, 2.8, 14, ZEL, 0.55);
    box(c.g, PW - 5.8, 1.1, 0.2, gold, 0, 20.4, 2.05);
    zellige(c, 0, 21.8, 2.02, PW, 2.8, ZEL, 0.7);
    stucco(c, PW, 25, 2.05, stuccoC, shade);
    merlonRow(c, PW, PH, 1.6, white);
    for (const sx of [-1, 1]) { box(c.g, 1, PH + 3, 1, white, sx * PW / 2, 0, 2); cone(c.g, 0.7, 2.4, green, sx * PW / 2, PH + 3, 2, 4, Math.PI / 4); sphere(c.g, 0.2, gold, sx * PW / 2, PH + 5.5, 2, 6); }
  }));
  // The upper hall walls: rows of star windows, a green band; green-tiled gabled roofs over the aisles.
  for (const [x, z, ry, len] of [[0, hz0 - 0.02, Math.PI, 64], [-32.02, (hz0 + hz1) / 2, -Math.PI / 2, hz1 - hz0], [32.02, (hz0 + hz1) / 2, Math.PI / 2, hz1 - hz0]] as const) c.g.frame(x, 0, z, ry, 1, () => c.glow.frame(x, 0, z, ry, 1, () => {
    for (let k = 0; k < Math.floor(len / 5); k++) { const bx = -len / 2 + 2.5 + k * 5; starWindow(c, bx, 12, 0, 1.2, 2.8, white, ['#ffcf7a', '#7ac8ff', '#7affb0']); sebka(c, bx, 3, 0, 3.4, 6.4, stuccoC, 0.9); }
    zelligeBand(c, len, 0, 0.01, 1.3, ZEL);
    box(c.g, len, 0.5, 0.25, green, 0, HH - 1.4, 0.1);
  }));
  merlonRow(c, 64, HH, hz0, white);
  for (const x of [-28, -20, 20, 28]) surf(c, SURF.glazed, () => pitched(c, 8, hz1 - hz0, 3.2, green, '#1f5a36', x, HH, (hz0 + hz1) / 2));
  // ═══ The great dome on its drum, half-domes east and west, domes at the corners. ═══
  const dz = -24, DR = 12;
  surf(c, SURF.plaster, () => cyl(c.g, DR + 0.6, DR + 0.6, 7, white, 0, HH, dz, 16));
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 16;
    c.g.frame(Math.sin(a) * (DR + 0.62), HH, dz + Math.cos(a) * (DR + 0.62), a, 1, () => c.glow.frame(Math.sin(a) * (DR + 0.62), HH, dz + Math.cos(a) * (DR + 0.62), a, 1, () => {
      starWindow(c, 0, 1.4, 0, 1.3, 3.4, white, ['#ffcf7a', '#7ac8ff', '#7affb0', '#ff8a8a']);
      for (const sx of [-1, 1]) cyl(c.g, 0.13, 0.13, 5.2, gold, sx * 1.5, 0.6, 0.15, 8);
    }));
  }
  for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; box(c.g, 0.6, 0.6, 0.4, i % 2 ? green : white, Math.sin(a) * (DR + 0.5), HH + 6.4, dz + Math.cos(a) * (DR + 0.5), a); }
  surf(c, SURF.glazed, () => c.g.add(new THREE.SphereGeometry(DR, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), green, M(0, HH + 7, dz, 0, 1, 1.15, 1)));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const pts: THREE.Vector3[] = []; for (let k = 0; k <= 10; k++) { const t = (k / 10) * (Math.PI / 2) * 0.96; pts.push(new THREE.Vector3(Math.sin(a) * Math.cos(t) * (DR + 0.06), HH + 7 + Math.sin(t) * DR * 1.15 + 0.05, dz + Math.cos(a) * Math.cos(t) * (DR + 0.06))); } c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.12, 4), gold); }
  c.g.add(new THREE.TorusGeometry(2.2, 0.2, 5, 24), gold, M(0, HH + 7 + DR * 1.1, dz, 0, 1, 1, 1, Math.PI / 2, 0));
  crescent(c, 0, HH + 7 + DR * 1.15, dz, 2.4);
  for (const sx of [-1, 1]) {
    surf(c, SURF.glazed, () => c.g.add(new THREE.SphereGeometry(7.5, 20, 10, 0, Math.PI, 0, Math.PI / 2).rotateY(sx > 0 ? 0 : Math.PI), green, M(sx * (DR + 0.6), HH, dz)));
    for (const z of [hz0 + 6, hz1 - 6]) { cyl(c.g, 3.4, 3.4, 2, white, sx * 20, HH, z, 12); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; archPanel(c.glow, 0.6, 1.2, '#ffcf7a', sx * 20 + Math.sin(a) * 3.42, HH + 0.4, z + Math.cos(a) * 3.42, a, 0.03, true); } surf(c, SURF.glazed, () => c.g.add(new THREE.SphereGeometry(3.2, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), green, M(sx * 20, HH + 2, z))); crescent(c, sx * 20, HH + 5.2, z, 0.8); }
  }
  // ═══ The minaret: a great square tower of Koutoubia's kind — sebka panels, stacked windows, a band
  //     of green tiles, merlons, and the lantern tower with its three golden balls. ═══
  c.g.frame(-38, 0, -18, 0, 1, () => c.glow.frame(-38, 0, -18, 0, 1, () => {
    const MW = 8, MH = 52;
    surf(c, SURF.plaster, () => box(c.g, MW, MH, MW, '#ecdcc0'));
    for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
      const f = MW / 2 + 0.02;
      for (const [y, w, h] of [[4, 1, 2.6], [11, 1.2, 3], [18, 1.4, 3.2]] as const) { starWindow(c, 0, y, f, w, h, '#ecdcc0', ['#ffcf7a']); voussoirs(c, 0, y + h - w * 0.3, f + 0.05, w * 0.6, 0.2, RED, true, 9); }
      sebka(c, 0, 24, f, MW - 1.6, 12, '#d8c8a8', 1.1);
      for (const x of [-1.8, 0, 1.8]) { archPanel(c.glow, 0.8, 2.4, '#ffcf7a', x, 38.5, f, 0, 0.03, true); archPanel(c.g, 1.1, 2.7, '#d8c8a8', x, 38.3, f - 0.02, 0, 0.05, true); }
      zellige(c, 0, 45, f, MW, 2.4, ZEL, 0.6);
      box(c.g, MW + 0.2, 0.4, 0.3, green, 0, 48, f);
      merlonRow(c, MW, MH, f - 0.25, '#ecdcc0', 1.3);
    }));
    surf(c, SURF.plaster, () => box(c.g, 3.6, 9, 3.6, '#ecdcc0', 0, MH, 0));
    for (let side = 0; side < 4; side++) c.g.frame(0, MH, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, MH, 0, (side * Math.PI) / 2, 1, () => { archPanel(c.glow, 1, 2.6, '#ffcf7a', 0, 3.4, 1.82, 0, 0.03, true); sebka(c, 0, 0.6, 1.82, 3, 2.4, '#d8c8a8', 0.8); zellige(c, 0, 7.2, 1.82, 3.6, 1, ZEL, 0.5); }));
    merlonRow(c, 3.6, MH + 9, 1.6, '#ecdcc0', 0.9);
    surf(c, SURF.glazed, () => c.g.add(new THREE.SphereGeometry(1.6, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), green, M(0, MH + 9, 0)));
    cyl(c.g, 0.06, 0.06, 4.6, gold, 0, MH + 10.4, 0, 6);
    for (const [y, r] of [[MH + 11.2, 0.55], [MH + 12.5, 0.45], [MH + 13.6, 0.35]] as const) sphere(c.g, r, gold, 0, y, 0, 12);
    crescent(c, 0, MH + 14.2, 0, 0.7);
  }));
  o.colliders.push({ x: -38, z: -18, r: 5.4, h: 70 });
  // Colliders for the hall and its portico piers.
  for (const x of [-24, -12, 0, 12, 24]) for (const z of [-17, -31]) o.colliders.push({ x, z, r: 8.8, h: HH + 22 });
  for (let k = 0; k <= 11; k++) { const x = -32 + k * (64 / 11); if (Math.abs(x) > 3) o.colliders.push({ x, z: N, r: 0.9, h: 11 }); }
  for (const sx of [-1, 1]) o.colliders.push({ x: sx * 6, z: N + 0.5, r: 1.8, h: 28 });
  o.height = 70;
};

// ───────────────────────────── Maple Row ─────────────────────────────

/** A carousel horse mid-gallop on its twisted brass pole: carved body, saddle, flowing tail; its head floats free. */
function carouselHorse(c: Ctx, x: number, y: number, z: number, ry: number, col: string, trim: string): void {
  c.g.frame(x, y, z, ry, 1, () => {
    c.g.add(new THREE.SphereGeometry(0.42, 12, 8).scale(0.75, 0.8, 1.6), col, M(0, 0, 0));
    c.g.add(new THREE.CylinderGeometry(0.2, 0.26, 0.8, 8).rotateX(-0.7), col, M(0, 0.45, 0.62));
    for (const [lx, lz, rx] of [[-0.18, 0.5, -0.9], [0.18, 0.45, -0.5], [-0.18, -0.5, 0.7], [0.18, -0.55, 0.4]] as const) c.g.add(new THREE.CylinderGeometry(0.07, 0.06, 0.8, 6).translate(0, -0.4, 0), col, M(lx, -0.15, lz, 0, 1, 1, 1, rx, 0));
    box(c.g, 0.55, 0.1, 0.7, trim, 0, 0.3, 0);
    c.g.add(new THREE.BoxGeometry(0.6, 0.35, 0.05), '#c23b2a', M(0, 0.2, 0.38));
    for (let k = 0; k < 5; k++) sphere(c.g, 0.07, trim, 0, 0.55 - k * 0.05, 0.8 + k * 0.06, 5); // the mane
    c.g.add(new THREE.ConeGeometry(0.12, 0.8, 6).rotateX(-2.3), '#f4efe4', M(0, 0.05, -0.85));
    sphere(c.g, 0.24, col, 0, 0.95 + ANIMAL_HEAD_GAP + 0.1, 1.0, 10);
  });
}

const vintage: Monument = (c, o) => {
  const cream = '#f4f1de', coral = '#e07a5f', blue = '#5a8ab5', gold = '#e2b43a', pink = '#ffb8d0', mint = '#bfe3d9';
  // ═══ The carousel ═══
  surf(c, SURF.boards, () => { cyl(c.g, 10.2, 10.6, 0.5, '#8a5a36', 0, 0, 0, 32); cyl(c.g, 9.8, 9.8, 0.5, '#a8744a', 0, 0.5, 0, 32); });
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2 + Math.PI / 2; box(c.g, 2, 0.25, 0.8, '#8a5a36', Math.cos(a) * 10.9, 0, Math.sin(a) * 10.9, Math.PI / 2 - a); }
  // The centre: a column of mirrors in gilded frames, and the band organ facing out.
  cyl(c.g, 2.2, 2.2, 6.5, cream, 0, 1, 0, 12);
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.glow.add(new THREE.BoxGeometry(0.9, 1.4, 0.04), '#dff0ff', M(Math.cos(a) * 2.22, 3.2, Math.sin(a) * 2.22, Math.PI / 2 - a)); c.g.add(new THREE.BoxGeometry(1.1, 1.6, 0.03), gold, M(Math.cos(a) * 2.21, 3.2, Math.sin(a) * 2.21, Math.PI / 2 - a)); for (const y of [1.6, 5.2]) sphere(c.glow, 0.1, '#fff0b3', Math.cos(a) * 2.25, y, Math.sin(a) * 2.25, 5); }
  both(c, 0, 1, 2.3, 0, () => { box(c.g, 2.4, 2.6, 0.6, coral); for (let k = 0; k < 9; k++) cyl(c.g, 0.07, 0.07, 0.8 + (4 - Math.abs(k - 4)) * 0.18, gold, -1 + k * 0.25, 1.4, 0.35, 8); box(c.g, 2.4, 0.3, 0.7, gold, 0, 2.6, 0); for (let k = 0; k < 3; k++) sphere(c.glow, 0.12, '#fff0b3', -0.8 + k * 0.8, 0.5, 0.33, 6); });
  // Twisted brass poles, horses rising and falling in two rings, a chariot bench between.
  const colsH = ['#ffffff', pink, mint, '#fff0c0', '#d8c8ff'];
  for (const [ring, n, off] of [[7.8, 16, 0], [5.4, 12, 0.13]] as const) for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + off, x = Math.cos(a) * ring, z = Math.sin(a) * ring;
    const pts: THREE.Vector3[] = [];
    for (let k = 0; k <= 16; k++) pts.push(new THREE.Vector3(x + Math.cos(k * 1.3) * 0.04, 1 + (k / 16) * 6.4, z + Math.sin(k * 1.3) * 0.04));
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.06, 5), gold);
    if (ring < 6 && i % 4 === 2) { c.g.frame(x, 1, z, -a, 1, () => { box(c.g, 1.6, 0.6, 0.9, coral, 0, 0, 0); box(c.g, 1.6, 1, 0.12, coral, 0, 0.6, -0.4); sphere(c.g, 0.25, gold, 0, 1.6, -0.4, 8); }); continue; }
    carouselHorse(c, x, 2.4 + ((i % 2) * 0.7), z, -a + Math.PI, colsH[i % colsH.length], gold);
  }
  // The canopy: a rounding board of painted panels ringed with bulbs, a scalloped valance, a striped roof, a crown.
  cyl(c.g, 10.3, 10.3, 1.6, cream, 0, 7.4, 0, 32);
  for (let i = 0; i < 16; i++) { const a = ((i + 0.5) / 16) * Math.PI * 2; c.g.add(new THREE.BoxGeometry(3, 1, 0.05), [coral, blue, pink, mint][i % 4], M(Math.cos(a) * 10.33, 8.2, Math.sin(a) * 10.33, Math.PI / 2 - a)); c.g.add(new THREE.CylinderGeometry(0.36, 0.36, 0.06, 12).rotateX(Math.PI / 2), gold, M(Math.cos(a) * 10.38, 8.2, Math.sin(a) * 10.38, Math.PI / 2 - a)); }
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; for (const y of [7.5, 8.95]) sphere(c.glow, 0.08, '#fff0b3', Math.cos(a) * 10.36, y, Math.sin(a) * 10.36, 5); }
  for (let i = 0; i < 32; i++) { const a = (i / 32) * Math.PI * 2; c.g.add(new THREE.CylinderGeometry(0.55, 0.55, 0.05, 10, 1, false, 0, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI), i % 2 ? coral : cream, M(Math.cos(a) * 10.45, 7.4, Math.sin(a) * 10.45, Math.PI / 2 - a)); }
  for (let i = 0; i < 16; i++) c.g.add(new THREE.ConeGeometry(10.8, 4.6, 16, 1, true, (i / 16) * Math.PI * 2, Math.PI / 8), i % 2 ? coral : cream, M(0, 9 + 2.3, 0));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; cone(c.g, 0.3, 0.9, gold, Math.cos(a) * 10.4, 9, Math.sin(a) * 10.4, 6); sphere(c.glow, 0.12, '#fff0b3', Math.cos(a) * 10.4, 9.95, Math.sin(a) * 10.4, 5); }
  cyl(c.g, 1.2, 1.2, 1.2, cream, 0, 13.4, 0, 12); cone(c.g, 1.6, 1.8, coral, 0, 14.6, 0, 12); sphere(c.g, 0.4, gold, 0, 16.6, 0, 10);
  cyl(c.g, 0.03, 0.03, 1.6, '#3a2a22', 0, 16.8, 0, 4); c.g.add(new THREE.ConeGeometry(0.4, 1.2, 3).rotateZ(-Math.PI / 2), pink, M(0.6, 18.1, 0, 0, 1, 0.5, 0.05));
  o.colliders.push({ x: 0, z: 0, r: 2.4, h: 17 });
  o.platforms.push({ x: 0, z: 0, r: 10, y: 1 });
  // ═══ The bandstand: an octagon of cast-iron columns and lacework, a scalloped roof, a lantern on top. ═══
  c.g.frame(26, 0, -16, 0, 1, () => c.glow.frame(26, 0, -16, 0, 1, () => {
    surf(c, SURF.ashlar, () => cyl(c.g, 6, 6.2, 1.2, cream, 0, 0, 0, 8));
    for (let k = 0; k < 4; k++) box(c.g, 2.4, 0.3, 0.6, cream, 0, k * 0.3, 6.1 + (3 - k) * 0.55);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, a2 = ((i + 0.5) / 8) * Math.PI * 2;
      cyl(c.g, 0.14, 0.18, 4, '#2f5a4a', Math.cos(a) * 5.4, 1.2, Math.sin(a) * 5.4, 8);
      c.g.frame(Math.cos(a2) * 5.0, 4.6, Math.sin(a2) * 5.0, Math.PI / 2 - a2, 1, () => { for (let k = 0; k < 7; k++) c.g.add(new THREE.TorusGeometry(0.22, 0.03, 3, 10), '#ffffff', M(-1.35 + k * 0.45, 0, 0)); box(c.g, 3.9, 0.06, 0.06, '#ffffff', 0, 0.3, 0); });
      if (i % 8 !== 2) c.g.frame(Math.cos(a2) * 5.1, 1.2, Math.sin(a2) * 5.1, Math.PI / 2 - a2, 1, () => { box(c.g, 3.8, 0.06, 0.06, '#ffffff', 0, 0.9, 0); for (let k = 0; k < 12; k++) box(c.g, 0.04, 0.9, 0.04, '#ffffff', -1.8 + k * 0.33, 0, 0); });
    }
    c.g.add(new THREE.ConeGeometry(6.8, 3, 8, 1, true), blue, M(0, 6.7, 0));
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; sphere(c.g, 0.22, '#ffffff', Math.cos(a) * 6.6, 5.2, Math.sin(a) * 6.6, 6, 0.6); }
    cyl(c.g, 0.6, 0.6, 1, '#ffffff', 0, 8.2, 0, 8); cone(c.g, 0.8, 1, blue, 0, 9.2, 0, 8); sphere(c.glow, 0.25, '#fff0b3', 0, 8.7, 0, 6);
    for (let k = 0; k < 4; k++) { const a = k * 1.3; box(c.g, 0.4, 0.8, 0.02, '#2a2a30', Math.cos(a) * 2, 1.2, Math.sin(a) * 2); cyl(c.g, 0.02, 0.02, 1, '#2a2a30', Math.cos(a) * 2, 1.2, Math.sin(a) * 2 - 0.05, 3); } // music stands
  }));
  o.colliders.push({ x: 26, z: -16, r: 6.3, h: 10 });
  // ═══ The Ferris wheel behind: a lattice rim on two A-frames, spokes, pastel gondolas, bulbs. ═══
  c.g.frame(-24, 0, -22, 0.5, 1, () => c.glow.frame(-24, 0, -22, 0.5, 1, () => {
    const R = 12, hub = R + 2;
    for (const sz of [-1, 1]) { for (const sx of [-1, 1]) rod(c.g, new THREE.Vector3(sx * 5, 0, sz * 1.4), new THREE.Vector3(0, hub, sz * 1.1), 0.25, '#ffffff', 6); box(c.g, 10.4, 0.3, 0.3, '#ffffff', 0, 0.4, sz * 1.4); }
    c.g.add(new THREE.CylinderGeometry(0.5, 0.5, 2.6, 12).rotateX(Math.PI / 2), gold, M(0, hub, 0));
    for (const sz of [-1, 1]) {
      c.g.add(new THREE.TorusGeometry(R, 0.14, 5, 64), '#ffffff', M(0, hub, sz * 1));
      c.g.add(new THREE.TorusGeometry(R - 1, 0.08, 4, 64), '#ffffff', M(0, hub, sz * 1));
      for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; rod(c.g, new THREE.Vector3(0, hub, sz * 0.9), new THREE.Vector3(Math.cos(a) * R, hub + Math.sin(a) * R, sz * 1), 0.06, '#ffffff', 4); }
      for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; sphere(c.glow, 0.1, ['#fff0b3', '#ffc4dc', '#bfe8ff'][i % 3], Math.cos(a) * R, hub + Math.sin(a) * R, sz * 1.2, 4); }
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2, gx = Math.cos(a) * R, gy = hub + Math.sin(a) * R;
      box(c.g, 0.1, 0.9, 0.1, '#ffffff', gx, gy - 0.9, 0);
      c.g.add(new THREE.CylinderGeometry(0.75, 0.6, 1.1, 10, 1, true), [coral, blue, pink, mint, gold][i % 5], M(gx, gy - 1.5, 0));
      c.g.add(new THREE.SphereGeometry(0.8, 10, 5, 0, Math.PI * 2, 0, Math.PI / 2), cream, M(gx, gy - 0.95, 0));
    }
  }));
  o.colliders.push({ x: -24, z: -22, r: 5.6, h: 28 });
  // ═══ Festoons of bulbs from the carousel crown out to lamp posts, an ice-cream cart, the entrance arch. ═══
  const posts: Array<[number, number]> = [[-15, 10], [15, 10], [-15, -10], [15, -10], [0, 17]];
  for (const [x, z] of posts) {
    cyl(c.g, 0.1, 0.14, 5, '#2f5a4a', x, 0, z, 8); sphere(c.glow, 0.3, '#fff0b3', x, 5.2, z, 8); cone(c.g, 0.3, 0.3, '#2f5a4a', x, 5.4, z, 8);
    const a = new THREE.Vector3(0, 16, 0), b = new THREE.Vector3(x, 5, z);
    for (let k = 1; k < 12; k++) { const t = k / 12, p = a.clone().lerp(b, t); p.y -= Math.sin(t * Math.PI) * 1.4; sphere(c.glow, 0.12, ['#fff0b3', '#ffc4dc', '#bfe8ff', '#c8ffd8'][k % 4], p.x, p.y, p.z, 5); }
    o.colliders.push({ x, z, r: 0.4, h: 5 });
  }
  c.g.frame(12, 0, 15, -0.4, 1, () => c.glow.frame(12, 0, 15, -0.4, 1, () => {
    for (const sx of [-1, 1]) c.g.add(new THREE.CylinderGeometry(0.45, 0.45, 0.12, 14).rotateZ(Math.PI / 2), '#2a2a30', M(sx * 0.8, 0.45, 0));
    box(c.g, 1.8, 1.1, 1, pink, 0, 0.45, 0); box(c.g, 1.9, 0.1, 1.1, cream, 0, 1.55, 0);
    for (let k = 0; k < 3; k++) { cone(c.g, 0.1, 0.3, '#e8c890', -0.5 + k * 0.5, 1.65, 0.2, 6); sphere(c.g, 0.12, ['#ffc4dc', '#fff0c0', '#bfe3d9'][k], -0.5 + k * 0.5, 2.05, 0.2, 6); }
    for (const sx of [-1, 1]) cyl(c.g, 0.03, 0.03, 1.4, '#ffffff', sx * 0.85, 1.65, 0, 4);
    for (let i = 0; i < 8; i++) c.g.add(new THREE.ConeGeometry(1.3, 0.5, 8, 1, true, (i / 8) * Math.PI * 2, Math.PI / 4), i % 2 ? pink : cream, M(0, 3.3, 0));
  }));
  o.colliders.push({ x: 12, z: 15, r: 1.2, h: 3 });
  c.g.frame(0, 0, 38, 0, 1, () => c.glow.frame(0, 0, 38, 0, 1, () => {
    for (const sx of [-1, 1]) { box(c.g, 1, 5.5, 1, '#2f5a4a', sx * 4, 0, 0); sphere(c.glow, 0.35, '#fff0b3', sx * 4, 5.9, 0, 8); }
    c.g.add(new THREE.TorusGeometry(4, 0.12, 5, 32, Math.PI), '#2f5a4a', M(0, 5, 0));
    c.g.add(new THREE.TorusGeometry(3.6, 0.06, 4, 32, Math.PI), gold, M(0, 5, 0));
    for (let i = 0; i < 11; i++) { const a = (i / 10) * Math.PI; for (let k = 0; k < 3; k++) c.g.add(new THREE.TorusGeometry(0.25, 0.03, 3, 10), '#2f5a4a', M(Math.cos(a) * (3.1 - k * 0.5), 5 + Math.sin(a) * (3.1 - k * 0.5), 0)); sphere(c.glow, 0.1, '#fff0b3', Math.cos(a) * 4, 5 + Math.sin(a) * 4, 0.1, 5); }
  }));
  o.colliders.push({ x: -4, z: 38, r: 0.8, h: 6 }, { x: 4, z: 38, r: 0.8, h: 6 });
  o.height = 28;
};

// ───────────────────────────── Souq al-Qamar ─────────────────────────────

/** Najdi crenellations: a row of little stepped triangles along a wall top, `len` along x at height y. */
function najdi(c: Ctx, len: number, y: number, z: number, col: string): void {
  const n = Math.max(2, Math.round(len / 0.9));
  for (let i = 0; i < n; i++) c.g.add(new THREE.ConeGeometry(0.42, 0.9, 3).translate(0, 0.45, 0), col, M(-len / 2 + (i + 0.5) * (len / n), y, z, 0, 1, 1, 0.35));
}
/** Palm-log beam ends poking out of a mud wall in a row. */
function beamEnds(c: Ctx, len: number, y: number, z: number): void {
  for (let x = -len / 2 + 0.5; x < len / 2; x += 0.9) c.g.add(new THREE.CylinderGeometry(0.08, 0.09, 0.6, 6).rotateX(Math.PI / 2), '#6b4a2a', M(x, y, z + 0.2));
}

const middleeast: Monument = (c, o) => {
  const mud = '#d9b98a', mudD = '#c9a473', wood = '#6b3a22', brass = '#d4a83a';
  const R = 22, WH = 9;
  // ═══ The fort's walls, crenellated, beam-ended, a gatehouse in the south wall. ═══
  for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
    const gate = side === 0;
    surf(c, SURF.adobe, () => {
      if (gate) for (const sx of [-1, 1]) box(c.g, R - 3, WH, 2.4, mud, sx * (R / 2 + 1.5), 0, R);
      else box(c.g, 2 * R, WH, 2.4, mud, 0, 0, R);
    });
    najdi(c, 2 * R, WH, R + 1.1, mud);
    beamEnds(c, 2 * R, WH - 1.4, R + 1.2);
    for (let k = -3; k <= 3; k++) if (!gate || Math.abs(k) > 1) box(c.g, 0.25, 1.4, 0.1, '#2a2018', k * 5.5, WH - 4.4, R + 1.22); // slit windows
    for (let k = 0; k < 9; k++) box(c.g, 0.5, WH - 1.2, 0.08, mudD, -R + 2.4 + k * 5.2, 0.6, R + 1.22); // recessed wall panels
  });
  for (let side = 0; side < 4; side++) for (let t = -R + 3; t <= R - 3; t += 4.2) {
    const a = (side * Math.PI) / 2;
    if (side === 0 && Math.abs(t) < 4) continue;
    o.colliders.push({ x: t * Math.cos(a) + R * Math.sin(a), z: -t * Math.sin(a) + R * Math.cos(a), r: 2.2, h: WH + 1 });
  }
  // Round towers at three corners, a tall square watchtower at the fourth.
  for (const [sx, sz] of [[-1, 1], [1, 1], [1, -1]] as const) {
    const x = sx * R, z = sz * R;
    surf(c, SURF.adobe, () => cyl(c.g, 4, 4.6, 13, mud, x, 0, z, 18));
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.g.add(new THREE.ConeGeometry(0.45, 1, 3).translate(0, 0.5, 0), mud, M(x + Math.cos(a) * 3.8, 13, z + Math.sin(a) * 3.8, Math.PI / 2 - a, 1, 1, 0.35)); box(c.g, 0.22, 1.2, 0.1, '#2a2018', x + Math.cos(a) * 4.32, 8, z + Math.sin(a) * 4.32, Math.PI / 2 - a); }
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; c.g.add(new THREE.CylinderGeometry(0.08, 0.09, 0.7, 6).rotateX(Math.PI / 2), '#6b4a2a', M(x + Math.cos(a) * 4.1, 11.4, z + Math.sin(a) * 4.1, Math.PI / 2 - a)); }
    o.colliders.push({ x, z, r: 4.7, h: 14 });
  }
  c.g.frame(-R, 0, -R, 0, 1, () => c.glow.frame(-R, 0, -R, 0, 1, () => {
    surf(c, SURF.adobe, () => c.g.add(new THREE.CylinderGeometry(3.4, 4.4, 18, 4).rotateY(Math.PI / 4).translate(0, 9, 0), mud));
    for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => c.glow.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => { for (const y of [6, 11, 15]) { box(c.glow, 0.5, 0.9, 0.05, '#ffcf7a', 0, y, 3.6 - y * 0.04); box(c.g, 0.8, 0.12, 0.3, wood, 0, y - 0.1, 3.7 - y * 0.04); } najdi(c, 6.6, 18, 2.4, mud); }));
    o.colliders.push({ x: -R, z: -R, r: 4.6, h: 20 });
  }));
  // The gatehouse: a pointed passage through, the studded door folded open, a mashrabiya over it, a flag.
  c.g.frame(0, 0, R, 0, 1, () => c.glow.frame(0, 0, R, 0, 1, () => {
    const g2 = new THREE.Shape();
    g2.moveTo(-4, 0); g2.lineTo(-1.8, 0); g2.lineTo(-1.8, 3.8); g2.quadraticCurveTo(-1.8, 5.4, 0, 6); g2.quadraticCurveTo(1.8, 5.4, 1.8, 3.8); g2.lineTo(1.8, 0); g2.lineTo(4, 0); g2.lineTo(4, 12); g2.lineTo(-4, 12); g2.lineTo(-4, 0);
    surf(c, SURF.adobe, () => c.g.add(new THREE.ExtrudeGeometry(g2, { depth: 3.4, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -1.7), mud));
    najdi(c, 8, 12, 1.2, mud);
    starDoor(c, -1.7, 0, 1.2, 1.8, 4.4, wood); // one leaf open against the jamb
    mashrabiya(c, 0, 7.6, 1.72, 2.6, 2.2, wood);
    beamEnds(c, 8, 10.6, 1.72);
    cyl(c.g, 0.06, 0.08, 5, '#3a2a22', 3.4, 12, 0, 6); box(c.g, 2, 1.2, 0.03, '#2f7a4a', 4.4, 15.6, 0); box(c.g, 2, 0.4, 0.035, '#ffffff', 4.4, 15.6, 0);
    for (const sx of [-1, 1]) brassLantern(c, sx * 2.6, 5.2, 2.2, 1.2);
  }));
  for (const sx of [-1, 1]) o.colliders.push({ x: sx * 3, z: R, r: 1.4, h: 13 });
  // ═══ Inside: the well, a date palm, the majlis with carpets, wind towers on its roof. ═══
  surf(c, SURF.flagstone, () => box(c.g, 2 * R - 3, 0.16, 2 * R - 3, '#d8c4a0', 0, 0, 0));
  c.g.frame(-8, 0, 6, 0, 1, () => {
    cyl(c.g, 1.4, 1.5, 1, '#c9a473', 0, 0, 0, 14); cyl(c.g, 1.1, 1.1, 0.05, '#2f5a6a', 0, 0.9, 0, 12);
    for (const sx of [-1, 1]) cyl(c.g, 0.1, 0.12, 3, wood, sx * 1.3, 0, 0, 6);
    c.g.add(new THREE.CylinderGeometry(0.1, 0.1, 2.8, 6).rotateZ(Math.PI / 2), wood, M(0, 3, 0));
    c.g.add(new THREE.TorusGeometry(0.3, 0.06, 5, 12), wood, M(0, 2.9, 0));
    cyl(c.g, 0.01, 0.01, 2, '#c9b08a', 0, 0.9, 0.3, 3); cyl(c.g, 0.2, 0.16, 0.3, '#6a4a2a', 0, 1.1, 0.3, 8);
  });
  o.colliders.push({ x: -8, z: 6, r: 1.7, h: 3 });
  plantedTree(c, 8, 6, 'palm', ['#d8c4a0', '#c23b2a', '#2f6f9a', '#e2b43a']);
  o.colliders.push({ x: 8, z: 6, r: 1, h: 6 });
  c.g.frame(0, 0, -R + 6, 0, 1, () => c.glow.frame(0, 0, -R + 6, 0, 1, () => {
    surf(c, SURF.adobe, () => { box(c.g, 26, 6.4, 7, mud, 0, 0, -1.5); box(c.g, 26, 0.6, 4, mud, 0, 6, 3.5); });
    for (let k = 0; k < 7; k++) { const x = -12 + k * 4; cyl(c.g, 0.3, 0.34, 6, '#f4efe4', x, 0, 5.2, 10); box(c.g, 0.8, 0.4, 0.8, wood, x, 5.6, 5.2); }
    for (let k = 0; k < 6; k++) { box(c.g, 3.2, 0.05, 2.4, ['#8a1f2a', '#1f3a6a', '#8a4a1a'][k % 3], -10 + k * 4, 0.02, 3.4); box(c.g, 3.2, 0.4, 0.6, ['#c23b2a', '#2f6f9a', '#e2b43a'][k % 3], -10 + k * 4, 0, 2); }
    for (let k = 0; k < 6; k++) { box(c.glow, 1.4, 2.2, 0.04, '#ffcf7a', -10 + k * 4, 1.2, 2.02); mashrabiya(c, -10 + k * 4, 3.6, 1.98, 1.6, 1.2, wood); }
    for (const x of [-8, 8]) barjeelTower(c, x, 6.4, -1.5, mud, wood);
    najdi(c, 26, 6.4, 2, mud);
  }));
  o.colliders.push({ x: -8, z: -R + 4.5, r: 4.5, h: 7 }, { x: 0, z: -R + 4.5, r: 4.5, h: 7 }, { x: 8, z: -R + 4.5, r: 4.5, h: 7 });
  // ═══ Outside the gate: the souq lane, stalls either side under a roof of palm fronds, lanterns strung along. ═══
  for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
    const x = sx * 6, z = R + 5 + k * 4.4;
    c.g.frame(x, 0, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 1, () => c.glow.frame(x, 0, z, sx > 0 ? -Math.PI / 2 : Math.PI / 2, 1, () => {
      for (const [a, b] of [[-1.8, -1.4], [1.8, -1.4], [-1.8, 1.4], [1.8, 1.4]]) cyl(c.g, 0.07, 0.08, 3, wood, a, 0, b, 5);
      c.g.add(new THREE.BoxGeometry(4, 0.12, 3.4), '#b8a060', M(0, 3.05, 0, 0, 1, 1, 1, 0.1, 0));
      for (let q = 0; q < 12; q++) box(c.g, 0.25, 0.05, 3.6, '#8a7a40', -1.8 + q * 0.33, 3.12, 0);
      box(c.g, 3.6, 0.9, 1, '#8a5a36', 0, 0, 0.8);
      if (k % 2 === 0) for (let q = 0; q < 5; q++) cone(c.g, 0.26, 0.4, ['#e8a030', '#c8401a', '#f2d14e', '#8a4a2a', '#3a7a3a'][q], -1.4 + q * 0.7, 0.9, 0.8, 10); // spice mounds
      else { for (let q = 0; q < 3; q++) { cyl(c.g, 0.14, 0.2, 0.36, brass, -1 + q, 0.9, 0.8, 10); cone(c.g, 0.1, 0.25, brass, -1 + q, 1.26, 0.8, 8); c.g.add(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 4).rotateZ(1), brass, M(-0.82 + q, 1.15, 0.8)); } }
      box(c.g, 3.4, 2.2, 0.04, ['#8a1f2a', '#1f3a6a', '#2f6a4a', '#8a4a1a'][k], 0, 0.6, -1.4); // a carpet hung at the back
      for (let q = 0; q < 6; q++) box(c.g, 0.3, 0.3, 0.05, ['#e2b43a', '#f4efe4'][q % 2], -1.25 + q * 0.5, 1.6, -1.37, Math.PI / 4);
      brassLantern(c, 0, 3, 0.8, 0.9);
    }));
    o.colliders.push({ x, z, r: 1.9, h: 3 });
  }
  // A falcon on its perch by the gate (its head floats free).
  c.g.frame(4.6, 0, R + 3.2, 0, 1, () => { cyl(c.g, 0.05, 0.07, 1.4, wood, 0, 0, 0, 6); box(c.g, 0.6, 0.06, 0.1, wood, 0, 1.4, 0); c.g.add(new THREE.SphereGeometry(0.2, 8, 6).scale(0.8, 1.2, 0.9), '#8a6a4a', M(0, 1.66, 0)); sphere(c.g, 0.1, '#6a4a2a', 0, 1.98 + ANIMAL_HEAD_GAP, 0.04, 6); c.g.add(new THREE.ConeGeometry(0.1, 0.4, 5).rotateX(Math.PI), '#6a4a2a', M(0, 1.45, -0.12)); });
  o.height = 20;
};

/** A barjeel for the monument: taller, four-sided, louvred, on a roof at height y. */
function barjeelTower(c: Ctx, x: number, y: number, z: number, mud: string, wood: string): void {
  surf(c, SURF.adobe, () => { box(c.g, 2.6, 5, 2.6, mud, x, y, z); box(c.g, 3, 0.4, 3, mud, x, y + 5, z); });
  for (let side = 0; side < 4; side++) c.g.frame(x, y, z, (side * Math.PI) / 2, 1, () => { box(c.g, 1.8, 2.6, 0.05, '#2a2018', 0, 2, 1.31); for (let k = 0; k < 5; k++) box(c.g, 0.08, 2.6, 0.1, wood, -0.8 + k * 0.4, 2, 1.36); });
  najdi(c, 2.6, y + 5.4, z + 1.3, mud); najdi(c, 2.6, y + 5.4, z - 1.3, mud);
}

// ───────────────────────────── Nile Crossing ─────────────────────────────

/** A band of carved, painted glyphs on the +z plane: rows of small abstract signs (discs, reeds, waves, blocks). */
function glyphBand(c: Ctx, x: number, y: number, z: number, w: number, h: number, rng: () => number): void {
  const cols = ['#2f6f9a', '#c23b2a', '#3f8a3a', '#1f1f24', '#d4af37'];
  const nx = Math.max(1, Math.floor(w / 0.5)), ny = Math.max(1, Math.floor(h / 0.6));
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const gx = x - w / 2 + (i + 0.5) * (w / nx), gy = y + (j + 0.5) * (h / ny), col = cols[Math.floor(rng() * cols.length)], k = rng();
    if (k < 0.25) c.g.add(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 10).rotateX(Math.PI / 2), col, M(gx, gy, z));
    else if (k < 0.5) box(c.g, 0.08, 0.4, 0.04, col, gx, gy - 0.2, z);
    else if (k < 0.7) for (let q = 0; q < 3; q++) box(c.g, 0.12, 0.04, 0.04, col, gx - 0.14 + q * 0.14, gy + (q % 2) * 0.05, z);
    else box(c.g, 0.26, 0.18, 0.04, col, gx, gy - 0.09, z);
  }
  for (const yy of [y, y + h]) box(c.g, w, 0.06, 0.05, '#7a5a30', x, yy, z);
}

/** A papyrus-bundle column: a swelling shaft with bands and a closed-bud capital, painted, `h` tall. */
function papyrusColumn(c: Ctx, x: number, z: number, h: number, r: number, open = false): void {
  cyl(c.g, r * 1.3, r * 1.4, 0.4, '#d8c090', x, 0, z, 12);
  c.g.add(new THREE.CylinderGeometry(r * 0.85, r, h * 0.78, 8), '#e0c48a', M(x, 0.4 + h * 0.39, z));
  for (let k = 0; k < 5; k++) cyl(c.g, r * 0.9, r * 0.9, 0.12, ['#2f6f9a', '#c23b2a', '#3f8a3a'][k % 3], x, 0.4 + h * 0.62 + k * 0.16, z, 12);
  if (open) c.g.add(new THREE.CylinderGeometry(r * 1.9, r * 0.9, h * 0.18, 12), '#3f8a3a', M(x, 0.4 + h * 0.87, z));
  else c.g.add(new THREE.SphereGeometry(r * 1.15, 12, 8).scale(1, 1.3, 1), '#3f8a3a', M(x, 0.4 + h * 0.86, z));
  box(c.g, r * 2.2, h * 0.06, r * 2.2, '#d8c090', x, 0.4 + h * 0.94, z);
}

const egypt: Monument = (c, o) => {
  const stone = '#e0c48a', dark = '#c8a86a', granite = '#c89a7a', gold = '#d4af37', blue = '#2f6f9a';
  const rng = () => c.rng.next();
  // ═══ The pyramids in the quarters beyond the plaza (reserved.ts), as before. ═══
  const cc = regionCenter(c.s);
  for (const pyr of PYRAMIDS) {
    const half = pyr.s * 0.5, h = pyr.s * 0.64;
    let y = Infinity;
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, 0]]) y = Math.min(y, terrainHeight(cc.x + pyr.x + sx * half, cc.z + pyr.z + sz * half));
    c.g.add(pyramidGeometry(half, h), stone, M(pyr.x, y - 0.6, pyr.z));
    c.g.add(pyramidGeometry(half * 0.07, h * 0.07), gold, M(pyr.x, y - 0.6 + h * 0.93, pyr.z));
    o.colliders.push({ x: pyr.x, z: pyr.z, r: half * 0.95, h: y + h });
  }
  // ═══ The pylon: two battered towers, a cavetto cornice, relief bands, flag-poles, the open portal. ═══
  const pz = 18;
  for (const sx of [-1, 1]) c.g.frame(sx * 11, 0, pz, 0, 1, () => {
    surf(c, SURF.ashlar, () => c.g.add(new THREE.CylinderGeometry(Math.SQRT1_2, 1, 1, 4).rotateY(Math.PI / 4).translate(0, 0.5, 0), stone, M(0, 0, 0, 0, 14, 21, 7)));
    c.g.add(new THREE.CylinderGeometry(0.4, 0.4, 11.2, 8).rotateZ(Math.PI / 2), dark, M(0, 20.6, 3.55)); // torus moulding
    c.g.add(new THREE.BoxGeometry(11.4, 1.4, 1.2).translate(0, 0.7, 0), stone, M(0, 20.9, 3.2, 0, 1, 1, 1, -0.35, 0)); // the cavetto, flaring out
    for (let k = 0; k < 14; k++) box(c.g, 0.6, 1.1, 0.06, ['#2f6f9a', '#c23b2a', '#3f8a3a'][k % 3], -5.2 + k * 0.8, 21, 3.83);
    glyphBand(c, 0, 3, 3.62, 8, 5, rng);
    glyphBand(c, 0, 10, 3.35, 6.4, 6, rng);
    for (const x of [-3.6, -1.2]) { box(c.g, 0.8, 18, 0.5, dark, sx < 0 ? -x : x, 0, 3.4); cyl(c.g, 0.12, 0.18, 26, '#6b4a2a', sx < 0 ? -x : x, 0, 3.9, 6); c.g.add(new THREE.BoxGeometry(2, 1.2, 0.03), ['#c23b2a', '#2f6f9a'][Math.abs(x) < 2 ? 0 : 1], M((sx < 0 ? -x : x) + 1, 24.8, 3.9)); }
  });
  // The portal between the towers, its lintel with the winged sun-disc.
  surf(c, SURF.ashlar, () => { for (const sx of [-1, 1]) box(c.g, 1.8, 13, 5, stone, sx * 4, 0, pz); box(c.g, 9.8, 2.4, 5, stone, 0, 13, pz); });
  c.g.add(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 20).rotateX(Math.PI / 2), gold, M(0, 14.2, pz + 2.6));
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) box(c.g, 3.2 - k * 0.5, 0.24, 0.1, k % 2 ? blue : gold, sx * (1 + (3.2 - k * 0.5) / 2), 14.5 - k * 0.3, pz + 2.6);
  for (const sx of [-1, 1]) for (let k = 0; k < 9; k++) box(c.g, 1.2, 0.3, 0.06, ['#2f6f9a', '#c23b2a', '#d4af37'][k % 3], sx * 4, 1 + k * 1.3, pz + 2.53);
  for (const sx of [-1, 1]) for (const z of [-2, 0, 2]) o.colliders.push({ x: sx * 11, z: pz + z, r: 5.4, h: 22 });
  for (const sx of [-1, 1]) o.colliders.push({ x: sx * 4.4, z: pz, r: 1.4, h: 16 });
  // Seated colossi before the pylon, and the pair of obelisks.
  for (const sx of [-1, 1]) c.g.frame(sx * 6.4, 0, pz + 5.5, 0, 1, () => {
    box(c.g, 3, 1, 3.8, dark); box(c.g, 2.6, 4, 3.2, granite, 0, 1, -0.2); box(c.g, 2.4, 0.9, 2.4, granite, 0, 5, 0.4);
    for (const lx of [-0.6, 0.6]) box(c.g, 0.7, 3.2, 0.8, granite, lx, 1, 1.6);
    box(c.g, 2, 3.6, 1.8, granite, 0, 5.9, -0.3);
    sphere(c.g, 0.85, granite, 0, 9.5 + 0.3 + HEAD_GAP * 3, -0.2, 12);
    box(c.g, 2.3, 2.2, 0.4, blue, 0, 9 + HEAD_GAP * 3, -0.9); for (let k = 0; k < 6; k++) box(c.g, 2.32, 0.14, 0.42, gold, 0, 9.2 + HEAD_GAP * 3 + k * 0.33, -0.9); // the striped nemes behind
  });
  for (const sx of [-1, 1]) o.colliders.push({ x: sx * 6.4, z: pz + 5.5, r: 2.2, h: 11 });
  for (const sx of [-1, 1]) c.g.frame(sx * 10, 0, pz + 9, 0, 1, () => {
    box(c.g, 3, 1.2, 3, dark);
    surf(c, SURF.marble, () => c.g.add(new THREE.CylinderGeometry(0.75 * Math.SQRT1_2, 1.25 * Math.SQRT1_2, 22, 4).rotateY(Math.PI / 4).translate(0, 12.2, 0), granite));
    for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => glyphBand(c, 0, 3, 0.63, 0.6, 16, rng));
    c.g.add(new THREE.ConeGeometry(0.75 * Math.SQRT1_2 * 1.4, 1.6, 4).rotateY(Math.PI / 4), gold, M(0, 24, 0));
  });
  for (const sx of [-1, 1]) o.colliders.push({ x: sx * 10, z: pz + 9, r: 1.8, h: 25 });
  // ═══ The avenue of sphinxes, lions couchant on plinths facing the way (their heads floating free). ═══
  for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) c.g.frame(sx * 6.4, 0, pz + 14 + k * 3.8, sx * -Math.PI / 2, 1, () => {
    box(c.g, 1.6, 0.8, 3.4, dark);
    c.g.add(new THREE.SphereGeometry(0.7, 10, 6).scale(0.8, 0.7, 1.7), stone, M(0, 1.3, -0.1));
    for (const lx of [-0.35, 0.35]) box(c.g, 0.3, 0.3, 1.2, stone, lx, 0.8, 1.2);
    box(c.g, 0.8, 0.9, 0.8, stone, 0, 1.4, 0.95);
    sphere(c.g, 0.45, stone, 0, 2.6 + ANIMAL_HEAD_GAP * 3, 1, 10);
    box(c.g, 1, 0.9, 0.2, blue, 0, 2.2 + ANIMAL_HEAD_GAP * 3, 0.6);
  });
  for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) o.colliders.push({ x: sx * 6.4, z: pz + 14 + k * 3.8, r: 1.6, h: 3 });
  // ═══ The court: double rows of papyrus columns round three sides, painted walls behind. ═══
  surf(c, SURF.flagstone, () => box(c.g, 34, 0.16, 30, '#e8d6b0', 0, 0, 1));
  for (const sx of [-1, 1]) {
    surf(c, SURF.ashlar, () => box(c.g, 1.4, 11, 28, stone, sx * 16.8, 0, 2));
    c.g.frame(sx * 16.1, 0, 2, sx * -Math.PI / 2, 1, () => { glyphBand(c, 0, 1, 0, 26, 2.2, rng); glyphBand(c, 0, 6, 0, 26, 1.8, rng); });
    for (let k = 0; k < 6; k++) for (const col of [12.5, 9.5]) { papyrusColumn(c, sx * col, -8 + k * 4, 8.5, 0.6); o.colliders.push({ x: sx * col, z: -8 + k * 4, r: 0.8, h: 9 }); }
    box(c.g, 5, 0.9, 25, stone, sx * 12.5, 8.6, 2);
  }
  for (let z = -10; z <= 14; z += 4) for (const sx of [-1, 1]) o.colliders.push({ x: sx * 16.8, z, r: 1.4, h: 11 });
  // ═══ The hypostyle hall: a forest of columns, the middle aisle taller with open-flower capitals, a starred ceiling. ═══
  const hz = -20;
  surf(c, SURF.ashlar, () => { for (const sx of [-1, 1]) box(c.g, 1.6, 14, 18, stone, sx * 16.8, 0, hz); box(c.g, 35, 14, 1.6, stone, 0, 0, hz - 9.5); });
  for (let i = 0; i < 6; i++) for (const zz of [-6, -2, 2, 6]) {
    const x = -12.5 + i * 5, mid = Math.abs(x) < 3;
    papyrusColumn(c, x, hz + zz, mid ? 12.5 : 9.5, mid ? 1.1 : 0.9, mid);
    o.colliders.push({ x, z: hz + zz, r: mid ? 1.4 : 1.1, h: 14 });
  }
  box(c.g, 34, 0.8, 18, stone, 0, 10, hz);
  box(c.g, 10, 0.8, 18, stone, 0, 13.2, hz);
  for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) box(c.g, 0.2, 2.4, 1.6, '#3a2a1a', sx * 5, 10.8, hz - 7.5 + k * 3); // clerestory grilles
  for (let k = 0; k < 40; k++) { const x = -15 + (k % 10) * 3.3, z = hz - 7 + Math.floor(k / 10) * 4.5; box(c.g, 3, 0.05, 4, '#1f3a7a', x, 9.96, z); cone(c.glow, 0.12, 0.05, '#ffd24a', x, 9.9, z, 5); }
  for (const sx of [-1, 1]) o.colliders.push({ x: sx * 16.8, z: hz - 4, r: 1.6, h: 14 }, { x: sx * 16.8, z: hz + 4, r: 1.6, h: 14 });
  // ═══ The sacred lake among palms, stone steps down its edges. ═══
  c.g.frame(28, 0, -2, 0, 1, () => { for (let k = 0; k < 3; k++) { const hw = 6 - k * 0.5, hd = 9 - k * 0.5; for (const sz of [-1, 1]) { box(c.g, hw * 2 + 1, 0.2 * (k + 1), 1, '#d8c090', 0, 0, sz * (hd + 0.5)); box(c.g, 1, 0.2 * (k + 1), hd * 2, '#d8c090', sz * (hw + 0.5), 0, 0); } } });
  waterPool(c, 28, 0, -2, 10, 16, 0, { stone: '#d8c090', kerb: 0.5, speed: 0.04 });
  for (const [x, z] of [[20, -14], [36, -14], [20, 10], [36, 10], [-26, 8], [-28, -14]] as const) tree(c.g, 'palm', x, 0, z, 1.2, rng);
  for (let k = 0; k < 8; k++) { const a = k * 0.8; c.g.add(new THREE.CylinderGeometry(0.3, 0.3, 0.02, 8), '#f4d0e0', M(28 + Math.cos(a) * 3, 0.44, -2 + Math.sin(a) * 5)); }
  o.height = 42;
};

// ───────────────────────────── Tents of Rimal ─────────────────────────────

/** A camel kneeling at rest: folded legs, the hump under a tasselled saddle-cloth, its head floating free. */
function kneelingCamel(c: Ctx, x: number, z: number, ry: number, cloth: string): void {
  const hide = '#c9a06a';
  c.g.frame(x, 0, z, ry, 1, () => {
    c.g.add(new THREE.SphereGeometry(0.7, 12, 8).scale(0.8, 0.7, 1.4), hide, M(0, 0.75, 0));
    sphere(c.g, 0.45, hide, 0, 1.3, -0.1, 10, 0.9);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) c.g.add(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 6).rotateX(Math.PI / 2), hide, M(sx * 0.45, 0.15, sz * 0.5));
    c.g.add(new THREE.CylinderGeometry(0.15, 0.2, 1.1, 8).rotateX(-0.9), hide, M(0, 1.15, 1.05));
    sphere(c.g, 0.22, hide, 0, 1.6 + ANIMAL_HEAD_GAP * 3 + 0.2, 1.55, 10);
    box(c.g, 1.3, 0.06, 1.4, cloth, 0, 1.55, -0.1);
    for (let k = 0; k < 8; k++) { cyl(c.g, 0.012, 0.012, 0.35, '#f4efe6', -0.6 + k * 0.17, 1.2, 0.6, 3); sphere(c.g, 0.05, k % 2 ? '#e2b43a' : '#f4efe6', -0.6 + k * 0.17, 1.2, 0.6, 4); }
  });
}

const desert: Monument = (c, o) => {
  const black = '#2a2220', qata = '#8c3b2a', sand = '#e8d6a0', brass = '#c9a24a';
  const rng = () => c.rng.next();
  // ═══ The oasis: a spring-fed pool with sandy banks, reeds and lilies, a ring of date palms. ═══
  surf(c, SURF.adobe, () => cyl(c.g, 16, 17, 0.3, sand, 0, 0, -2, 28));
  waterPool(c, 0, 0.3, -2, 20, 13, 0, { stone: '#c9a878', kerb: 0.25, speed: 0.04 });
  for (let k = 0; k < 40; k++) { const a = rng() * Math.PI * 2, r = 9 + rng() * 2; cone(c.g, 0.05, 1 + rng() * 0.8, k % 3 ? '#6a8a3a' : '#8aa84a', Math.cos(a) * r * 1.1, 0.3, -2 + Math.sin(a) * r * 0.7, 4); }
  for (let k = 0; k < 10; k++) c.g.add(new THREE.CylinderGeometry(0.35, 0.35, 0.02, 8), '#4f8a3a', M(-6 + rng() * 12, 0.62, -5 + rng() * 6));
  for (const x of [-5, 0, 5]) o.colliders.push({ x, z: -2, r: 6.4, h: 0.6 }); // the water: walk its banks
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + 0.1; tree(c.g, 'palm', Math.cos(a) * (17 + (i % 3)), 0, -2 + Math.sin(a) * (15 + (i % 2) * 2), 1.2 + (i % 3) * 0.15, rng); }
  // ═══ The great majlis tent behind the oasis: black goat-hair on rows of poles, sadu bands, its front open. ═══
  c.g.frame(0, 0, -30, 0, 1, () => c.glow.frame(0, 0, -30, 0, 1, () => {
    const w = 26, d = 10, h = 4;
    for (const z of [-d * 0.4, 0, d * 0.4]) for (let i = 0; i < 7; i++) cyl(c.g, 0.1, 0.12, z === 0 ? h : h * 0.72, '#8a6444', -w / 2 + 1 + i * (w - 2) / 6, 0, z, 6);
    surf(c, SURF.cloth, () => {
      for (const sz of [-1, 1]) c.g.add(new THREE.BoxGeometry(w, 0.06, d * 0.56), black, M(0, h - 0.55, sz * d * 0.25, 0, 1, 1, 1, sz * 0.26, 0));
      box(c.g, w, h * 0.72, 0.06, black, 0, 0, -d / 2 + 0.1);
      for (const sx of [-1, 1]) box(c.g, 0.06, h * 0.72, d * 0.8, black, sx * w / 2, 0, -0.5);
    });
    c.g.frame(0, h - 1.05, d * 0.52, 0, 1, () => saduBand(c, w, 0.5));
    c.g.frame(0, 0.9, -d / 2 + 0.16, Math.PI, 1, () => saduBand(c, w, 0.6, '#f4efe6', qata));
    for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { const x = sx * (w / 2 - 1 - i * 2.8); c.g.add(new THREE.CylinderGeometry(0.015, 0.015, 5.4, 3).translate(0, 2.7, 0), '#c9b08a', M(x, 0, d * 0.42, 0, 1, 1, 1, 1.0, 0)); c.g.add(new THREE.CylinderGeometry(0.015, 0.015, 5.4, 3).translate(0, 2.7, 0), '#c9b08a', M(x, 0, -d * 0.42, 0, 1, 1, 1, -1.0, 0)); }
    // Inside: carpets, bolsters along the walls, a coffee hearth with dallahs, brass lanterns.
    for (let k = 0; k < 5; k++) { surf(c, SURF.cloth, () => box(c.g, 4.6, 0.04, 6, ['#8a1f2a', '#1f3a6a', '#8a4a1a', '#2f5a3a', '#6a1f4a'][k], -10 + k * 5, 0.02, 0)); }
    for (let k = 0; k < 12; k++) box(c.g, 1.8, 0.5, 0.6, ['#c23b2a', '#e2b43a', '#2f6f9a'][k % 3], -11 + k * 2, 0, -d / 2 + 0.6);
    cyl(c.g, 0.8, 0.6, 0.35, '#6a5a44', 0, 0, 2, 10); cone(c.glow, 0.35, 0.6, '#ff8a2a', 0, 0.35, 2, 6);
    for (let k = 0; k < 3; k++) { const x = -0.8 + k * 0.8; cyl(c.g, 0.16, 0.24, 0.4, brass, x, 0, 3.2, 10); cone(c.g, 0.14, 0.3, brass, x, 0.4, 3.2, 8); c.g.add(new THREE.CylinderGeometry(0.03, 0.03, 0.36, 4).rotateZ(1), brass, M(x + 0.2, 0.36, 3.2)); }
    for (let k = 0; k < 6; k++) cyl(c.g, 0.05, 0.04, 0.08, '#f4efe6', -1.2 + k * 0.5, 0.06, 3.9, 8);
    for (let k = 0; k < 4; k++) brassLantern(c, -9 + k * 6, h - 0.4, 0, 1);
  }));
  o.colliders.push({ x: -8, z: -30, r: 5.2, h: 5 }, { x: 0, z: -30, r: 5.2, h: 5 }, { x: 8, z: -30, r: 5.2, h: 5 });
  // ═══ Round guest tents, campfires with log seats, kneeling camels, lantern poles. ═══
  for (const [x, z, band] of [[-24, 10, '#2f6f9a'], [24, 10, '#8c3b2a'], [-26, -14, '#e2b43a']] as const) c.g.frame(x, 0, z, 0, 1, () => c.glow.frame(x, 0, z, 0, 1, () => {
    surf(c, SURF.cloth, () => { cyl(c.g, 3.4, 3.4, 2, '#f1e6d0', 0, 0, 0, 16); cone(c.g, 3.8, 2.6, '#f1e6d0', 0, 2, 0, 16); });
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; c.g.add(new THREE.BoxGeometry(0.36, 0.36, 0.03), i % 2 ? '#2a2220' : band, M(Math.cos(a) * 3.43, 0.8, Math.sin(a) * 3.43, Math.PI / 2 - a, 1, 1, 1, 0, Math.PI / 4)); c.g.add(new THREE.ConeGeometry(0.3, 0.32, 3).rotateZ(Math.PI), i % 2 ? band : '#2a2220', M(Math.cos(a) * 3.7, 1.85, Math.sin(a) * 3.7, Math.PI / 2 - a, 1, 1, 0.1)); }
    box(c.g, 1.4, 1.8, 0.08, band, 0, 0, 3.42); sphere(c.glow, 0.16, '#ffcf7a', 0, 2.3, 3.6, 6); sphere(c.g, 0.14, '#d4af37', 0, 4.8, 0, 6);
  }));
  o.colliders.push({ x: -24, z: 10, r: 3.6, h: 5 }, { x: 24, z: 10, r: 3.6, h: 5 }, { x: -26, z: -14, r: 3.6, h: 5 });
  for (const [x, z] of [[-12, 16], [12, 18], [22, -16]] as const) {
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; sphere(c.g, 0.22, '#6b6b6b', x + Math.cos(a) * 0.8, 0, z + Math.sin(a) * 0.8, 5); }
    cone(c.glow, 0.45, 1, '#ff8a2a', x, 0.1, z, 6); cone(c.glow, 0.25, 0.7, '#ffd24a', x, 0.1, z, 5);
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.4; c.g.add(new THREE.CylinderGeometry(0.2, 0.22, 1.8, 7).rotateZ(Math.PI / 2), '#6b4a2a', M(x + Math.cos(a) * 2.2, 0.22, z + Math.sin(a) * 2.2, -a)); }
  }
  for (const [x, z, ry, col] of [[-16, 26, 0.6, '#c23b2a'], [-12.5, 28, 0.3, '#2f6f9a'], [16, 26, -0.5, '#e2b43a']] as const) { kneelingCamel(c, x, z, ry, col); o.colliders.push({ x, z, r: 1.6, h: 2 }); }
  for (const [x, z] of [[-6, 14], [6, 14], [-6, 24], [6, 24]] as const) { cyl(c.g, 0.07, 0.09, 3, '#6b4a2a', x, 0, z, 6); box(c.g, 0.8, 0.06, 0.06, '#6b4a2a', x + 0.3, 3, z); brassLantern(c, x + 0.6, 3, z, 1); o.colliders.push({ x, z, r: 0.3, h: 3 }); }
  // ═══ The star deck: a raised platform of boards on the dune, rugs, an armillary sphere and a brass telescope. ═══
  c.g.frame(24, 0, -34, -0.6, 1, () => c.glow.frame(24, 0, -34, -0.6, 1, () => {
    for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) cyl(c.g, 0.14, 0.16, 1.4, '#6b4a2a', a, 0, b, 6);
    surf(c, SURF.boards, () => box(c.g, 7, 0.2, 7, '#8a6444', 0, 1.4, 0));
    for (let k = 0; k < 4; k++) box(c.g, 1.6, 0.2, 0.4, '#6b4a2a', 0, k * 0.35, 3.6 + (3 - k) * 0.4);
    box(c.g, 4, 0.04, 3, '#1f3a6a', -1, 1.62, 0.6);
    cyl(c.g, 0.06, 0.1, 1.2, brass, -1.6, 1.6, -1.4, 6);
    for (const [rx, ry2] of [[0, 0], [Math.PI / 2, 0], [0, Math.PI / 2], [1.1, 0.4]]) c.g.add(new THREE.TorusGeometry(0.6, 0.03, 4, 24), brass, M(-1.6, 3.4, -1.4, ry2, 1, 1, 1, rx, 0));
    sphere(c.glow, 0.1, '#fff4c0', -1.6, 3.4, -1.4, 6);
    for (const sx of [-1, 1]) c.g.add(new THREE.CylinderGeometry(0.03, 0.03, 1.4, 4).translate(0, 0.7, 0), '#4a3a2a', M(1.6, 1.6, 0.2, 0, 1, 1, 1, 0, sx * 0.3));
    c.g.add(new THREE.CylinderGeometry(0.1, 0.16, 1.8, 10).rotateX(-1.1), brass, M(1.6, 3.2, 0));
  }));
  o.colliders.push({ x: 24, z: -34, r: 4.4, h: 4 });
  o.height = 12;
};

// ───────────────────────────── Nusa Rinjani ─────────────────────────────

/** A small stupa: a bell on a lotus base, a square harmika, a spire of parasols — s is its height. */
function stupa(c: Ctx, x: number, y: number, z: number, s: number, col: string, lattice = false): void {
  cyl(c.g, s * 0.34, s * 0.4, s * 0.1, col, x, y, z, 12);
  c.g.add(new THREE.LatheGeometry([[0, 0], [s * 0.3, 0], [s * 0.34, s * 0.12], [s * 0.3, s * 0.36], [s * 0.18, s * 0.5], [0.001, s * 0.54]].map(([a, b]) => new THREE.Vector2(a, b)), 12), col, M(x, y + s * 0.1, z));
  if (lattice) for (let r = 0; r < 2; r++) for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + r * 0.39, rr = s * (0.33 - r * 0.07); c.g.add(new THREE.BoxGeometry(s * 0.08, s * 0.08, 0.02), '#2a2622', M(x + Math.cos(a) * rr, y + s * (0.22 + r * 0.14), z + Math.sin(a) * rr, Math.PI / 2 - a, 1, 1, 1, 0, Math.PI / 4)); }
  box(c.g, s * 0.14, s * 0.1, s * 0.14, col, x, y + s * 0.62, z);
  cone(c.g, s * 0.05, s * 0.36, col, x, y + s * 0.72, z, 8);
}
/** A kala gate: an arch with a crowning mask-shape (plain, no face) and curling makara scrolls at its feet. */
function kalaGate(c: Ctx, w: number, h: number, col: string, dark: string): void {
  for (const sx of [-1, 1]) box(c.g, 0.9, h, 1.2, col, sx * (w / 2 + 0.45), 0, 0);
  c.g.add(new THREE.CylinderGeometry(w / 2 + 0.9, w / 2 + 0.9, 1.2, 16, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateZ(Math.PI / 2), col, M(0, h, 0));
  archPanel(c.g, w, h + w / 2 - 0.1, dark, 0, 0, 0.61, 0, 0.04);
  box(c.g, 2.2, 1.1, 0.5, col, 0, h + w / 2 + 0.6, 0.5); // the crowning block
  for (let k = 0; k < 5; k++) sphere(c.g, 0.18, col, -0.8 + k * 0.4, h + w / 2 + 1.1, 0.8, 6);
  for (const sx of [-1, 1]) { const pts: THREE.Vector3[] = []; for (let k = 0; k <= 10; k++) { const a = (k / 10) * Math.PI * 1.6; pts.push(new THREE.Vector3(sx * (w / 2 + 1.1 + Math.sin(a) * 0.5 * (1 - k / 14)), 0.4 + (1 - Math.cos(a)) * 0.5, 0.7)); } c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.14, 5), col); }
}

const indonesia: Monument = (c, o) => {
  const stone = '#8a8478', light = '#9a948a', dark = '#5a544a';
  const TER = [64, 55, 46, 37, 28];
  let y = 0;
  // ═══ Five square terraces: moulded bases, relief panels along the walls, balustrades of niches and little stupas. ═══
  TER.forEach((sz, i) => {
    surf(c, SURF.ashlar, () => { box(c.g, sz, 3.4, sz, stone, 0, y, 0); box(c.g, sz + 0.8, 0.4, sz + 0.8, light, 0, y, 0); box(c.g, sz + 0.6, 0.5, sz + 0.6, light, 0, y + 3.4, 0); });
    for (let side = 0; side < 4; side++) c.g.frame(0, y, 0, (side * Math.PI) / 2, 1, () => {
      const n = Math.floor(sz / 3.2);
      for (let k = 0; k < n; k++) {
        const x = -sz / 2 + 1.6 + k * 3.2;
        if (Math.abs(x) < 2.6) continue;
        box(c.g, 2.4, 1.8, 0.1, '#7a746a', x, 1.1, sz / 2 + 0.05);
        box(c.g, 2.1, 1.5, 0.06, '#6e685e', x, 1.25, sz / 2 + 0.12);
        for (let q = 0; q < 3; q++) sphere(c.g, 0.18, '#7a746a', x - 0.6 + q * 0.6, 2.0 - (q % 2) * 0.3, sz / 2 + 0.16, 6, 1.4); // figures of the reliefs, abstracted
      }
      // The balustrade: a low wall with niches, and a little stupa over every other bay.
      const bl = sz - 5;
      box(c.g, bl, 1.3, 0.8, light, 0, 3.9, sz / 2 - 4.2);
      for (let k = 0; k < Math.floor(bl / 2.4); k++) {
        const x = -bl / 2 + 1.2 + k * 2.4;
        if (Math.abs(x) < 2.8) continue;
        archPanel(c.g, 0.9, 1, dark, x, 4.05, sz / 2 - 3.78, 0, 0.05);
        if (k % 2 === 0) stupa(c, x, 5.2, sz / 2 - 4.2, 1.6, light);
      }
    });
    y += 4;
    o.platforms.push({ x: 0, z: 0, r: sz / 2 - 1, y });
    if (i === TER.length - 1) return;
    // A kala gate at the head of every stair.
    const next = TER[i + 1];
    for (let side = 0; side < 4; side++) c.g.frame(0, y, 0, (side * Math.PI) / 2, 1, () => c.g.frame(0, 0, next / 2 + 1.2, 0, 1, () => kalaGate(c, 2.6, 2.6, light, dark)));
  });
  // ═══ Three round terraces ringed with lattice stupas, the great stupa at the crown. ═══
  let r = TER[4] / 2 - 1;
  for (let i = 0; i < 3; i++) {
    const rr = r - i * 3.2;
    surf(c, SURF.ashlar, () => cyl(c.g, rr, rr + 0.4, 2.6, stone, 0, y, 0, 32));
    y += 2.6;
    o.platforms.push({ x: 0, z: 0, r: rr - 0.5, y });
    const n = [32, 24, 16][i];
    for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + 0.06; stupa(c, Math.cos(a) * (rr - 1.4), y, Math.sin(a) * (rr - 1.4), 2.6, light, true); }
  }
  r -= 6.4;
  cyl(c.g, 5.6, 5.8, 1, light, 0, y, 0, 24);
  c.g.add(new THREE.LatheGeometry([[0, 0], [5.2, 0], [5.4, 1.5], [5, 4.2], [3.4, 6], [0.001, 6.4]].map(([a, b]) => new THREE.Vector2(a, b)), 24), light, M(0, y + 1, 0));
  box(c.g, 2, 1.4, 2, light, 0, y + 7.2, 0);
  for (let k = 0; k < 6; k++) cyl(c.g, 0.9 - k * 0.13, 0.95 - k * 0.13, 0.4, light, 0, y + 8.6 + k * 0.5, 0, 8);
  cone(c.g, 0.2, 2, light, 0, y + 11.6, 0, 8);
  const top = y + 13.6;
  // ═══ Walkable stairs up the middle of each side, 1 m risers, all the way to the round terraces. ═══
  for (let side = 0; side < 4; side++) c.g.frame(0, 0, 0, (side * Math.PI) / 2, 1, () => {
    for (let k = 0; k < 21; k++) { const d = 36 - k * 1.1; surf(c, SURF.ashlar, () => box(c.g, 3.2, k + 1, 1.15, '#9a948a', 0, 0, d)); }
    for (const sx of [-1, 1]) for (let k = 0; k < 21; k += 3) box(c.g, 0.4, k + 1.8, 1.1, stone, sx * 1.8, 0, 36 - k * 1.1);
  });
  for (let k = 0; k < 21; k++) for (const [dx, dz] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) o.platforms.push({ x: dx * (36 - k * 1.1), z: dz * (36 - k * 1.1), r: 1.5, y: k + 1 });
  o.colliders.push({ x: 0, z: 0, r: 4.2, h: top }); // the great stupa
  // Round the base, so you climb the stairs rather than walk into the stone.
  for (let side = 0; side < 4; side++) for (let t = -30; t <= 30; t += 3.2) {
    if (Math.abs(t) < 3.4) continue;
    const a = (side * Math.PI) / 2;
    o.colliders.push({ x: t * Math.cos(a) + 31 * Math.sin(a), z: -t * Math.sin(a) + 31 * Math.cos(a), r: 1.9, h: 3.8 });
  }
  // ═══ Round about: a split gate on the approach, frangipani trees, a lotus pond, offering baskets. ═══
  c.g.frame(0, 0, 44, 0, 1, () => {
    for (const sx of [-1, 1]) for (let k = 0; k < 7; k++) { const w = 2.8 - k * 0.3; box(c.g, w, 1.4, 2.4 - k * 0.2, k % 2 ? '#a8584a' : stone, sx * (1.6 + w / 2), k * 1.4, 0); }
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) stupa(c, sx * (1.6 + 1.2), 9.8 + k * 0.01, 0, 1.2 - k * 0.1, light);
  });
  o.colliders.push({ x: -3.2, z: 44, r: 1.8, h: 10 }, { x: 3.2, z: 44, r: 1.8, h: 10 });
  for (const [x, z] of [[-40, 30], [40, 30], [-40, -34], [40, -34], [-38, 0], [38, 4]] as const) {
    cyl(c.g, 0.22, 0.3, 2.4, '#8a7a6a', x, 0, z, 7);
    for (let k = 0; k < 4; k++) { const a = k * 1.6; cyl(c.g, 0.1, 0.14, 1.4, '#8a7a6a', x + Math.cos(a) * 0.4, 2.2, z + Math.sin(a) * 0.4, 5); sphere(c.g, 0.9, '#3f7a3a', x + Math.cos(a) * 0.9, 3.6, z + Math.sin(a) * 0.9, 7, 0.6); for (let f = 0; f < 5; f++) sphere(c.g, 0.12, f % 2 ? '#ffffff' : '#ffe08a', x + Math.cos(a + f) * 1.1, 4.1, z + Math.sin(a + f) * 1.1, 5); }
    o.colliders.push({ x, z, r: 0.6, h: 4 });
  }
  waterPool(c, 26, 0, 40, 14, 8, 0, { stone: stone, kerb: 0.4, speed: 0.03 });
  for (let k = 0; k < 12; k++) { const a = k * 0.9; c.g.add(new THREE.CylinderGeometry(0.45, 0.45, 0.02, 10), '#4f8a3a', M(26 + Math.cos(a) * 4, 0.34, 40 + Math.sin(a) * 2.4)); if (k % 3 === 0) cone(c.g, 0.25, 0.5, '#ff8fb8', 26 + Math.cos(a) * 4, 0.36, 40 + Math.sin(a) * 2.4, 6); }
  for (let k = 0; k < 6; k++) { const x = -6 + k * 2.4; box(c.g, 0.5, 0.12, 0.5, '#6a9a3a', x, 0.02, 38.6); for (let f = 0; f < 3; f++) sphere(c.g, 0.07, ['#ff8fb8', '#ffd24a', '#ffffff'][f], x - 0.12 + f * 0.12, 0.18, 38.6, 4); }
  o.height = top;
};

// ───────────────────────────── Aurora Huts ─────────────────────────────

/**
 * A triangle of panes on the +z plane: base 2b at y0, apex at height h, between mullions. Only
 * `lit` of the panes glow (a window here and there lit from within); the rest are ice-blue glass,
 * so a great glazed wall reads as glass at night rather than one blaze of light.
 */
function glassTriangle(c: Ctx, b: number, h: number, z: number, cols: string[], rng: () => number, frame: string, lit = 0.22): void {
  const rows = Math.round(h / 1.4);
  for (let r = 0; r < rows; r++) {
    const y = (r / rows) * h, y1 = ((r + 1) / rows) * h, half = b * (1 - y1 / h);
    const n = Math.max(1, Math.round((2 * half) / 1.2));
    for (let k = 0; k < n; k++) {
      const x = -half + ((k + 0.5) * 2 * half) / n;
      const col = cols[Math.floor(rng() * cols.length)], on = rng() < lit;
      box(on ? c.glow : c.g, (2 * half) / n - 0.12, y1 - y - 0.12, 0.04, on ? col : '#' + new THREE.Color(col).lerp(new THREE.Color('#6a8aa8'), 0.55).getHexString(), x, y + 0.06, z);
    }
    box(c.g, 2 * b * (1 - y / h), 0.1, 0.12, frame, 0, y, z + 0.03);
  }
  for (const sx of [-1, 1]) rod(c.g, new THREE.Vector3(sx * b, 0, z + 0.03), new THREE.Vector3(0, h, z + 0.03), 0.14, frame, 5);
}

/** A snow lantern (lykta): a cone of stacked snowballs with a candle glowing inside. */
function snowLantern(c: Ctx, x: number, z: number): void {
  for (let row = 0; row < 4; row++) { const n = 8 - row * 2, r = 0.6 - row * 0.14; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + row; sphere(c.g, 0.16, '#f4f8fc', x + Math.cos(a) * r, 0.14 + row * 0.26, z + Math.sin(a) * r, 6); } }
  sphere(c.glow, 0.16, '#ffcf7a', x, 0.35, z, 6);
}

const aurora: Monument = (c, o) => {
  const alu = '#e8eef5', edge = '#9aa8b8', rng = () => c.rng.next();
  const AUR = ['#7affd0', '#3ae8b0', '#b86bff', '#ff8ad8', '#3ac8ff', '#c8ffe8'];
  // ═══ The Arctic cathedral: eleven stepped triangular frames, glass strips between them, glazed front and mosaic back. ═══
  const zf = 18, step = 3.3, N = 11;
  for (let k = 0; k < N; k++) {
    const H = 30 - k * 1.8, b = 13 - k * 0.5, zc = zf - k * step - step / 2;
    const sh = new THREE.Shape([new THREE.Vector2(-b, 0), new THREE.Vector2(b, 0), new THREE.Vector2(0, H)]);
    surf(c, SURF.steel, () => c.g.add(new THREE.ExtrudeGeometry(sh, { depth: step - 0.25, bevelEnabled: false }).translate(0, 0, -(step - 0.25) / 2), alu, M(0, 0, zc)));
    // The glass strip in the step between this frame and the next.
    for (const sx of [-1, 1]) rod(c.glow, new THREE.Vector3(sx * b * 0.98, 0.4, zc - step / 2 + 0.1), new THREE.Vector3(0, H - 0.4, zc - step / 2 + 0.1), 0.1, '#bfe8ff', 4);
    for (const sx of [-1, 1]) rod(c.g, new THREE.Vector3(sx * b, 0, zc + step / 2 - 0.12), new THREE.Vector3(0, H, zc + step / 2 - 0.12), 0.12, edge, 4);
  }
  // The glazed front, the entrance porch at its foot.
  glassTriangle(c, 12.4, 29, zf + 0.02, ['#dff0ff', '#e8f4ff', '#fff4d8'], rng, edge);
  c.g.frame(0, 0, zf + 3, 0, 1, () => c.glow.frame(0, 0, zf + 3, 0, 1, () => {
    const sh = new THREE.Shape([new THREE.Vector2(-5, 0), new THREE.Vector2(5, 0), new THREE.Vector2(0, 5.6)]);
    surf(c, SURF.steel, () => c.g.add(new THREE.ExtrudeGeometry(sh, { depth: 6, bevelEnabled: false }).translate(0, 0, -3), alu));
    glassTriangle(c, 4.6, 5.2, 3.02, ['#fff0c8'], rng, edge, 0.6);
    box(c.g, 2.2, 2.6, 0.1, '#5a6a7a', 0, 0, 3.05);
  }));
  // The mosaic window at the back: the aurora in coloured glass.
  const zb = zf - N * step - 0.02;
  c.g.frame(0, 0, zb, Math.PI, 1, () => c.glow.frame(0, 0, zb, Math.PI, 1, () => glassTriangle(c, 7.9, 12, 0, AUR, rng, edge, 0.55)));
  for (const z of [14, 6, -2, -10]) o.colliders.push({ x: 0, z, r: 10.8, h: 30 });
  o.colliders.push({ x: 0, z: zf + 3, r: 4.4, h: 6 });
  // ═══ The approach: an arch of ice blocks, snow lanterns lining the way, ice sculptures. ═══
  c.g.frame(0, 0, 40, 0, 1, () => c.glow.frame(0, 0, 40, 0, 1, () => {
    for (let i = 0; i <= 12; i++) { const a = (i / 12) * Math.PI; c.g.add(new THREE.BoxGeometry(1.2, 0.9, 1.4), '#dcecf8', M(Math.cos(a) * 4, Math.sin(a) * 5.2 + 0.45, 0, 0, 1, 1, 1, 0, a - Math.PI / 2)); }
    for (let i = 0; i < 6; i++) sphere(c.glow, 0.12, AUR[i], -2.5 + i, 5.2 + Math.sin(i) * 0.2, 0.7, 5);
  }));
  o.colliders.push({ x: -4, z: 40, r: 0.9, h: 6 }, { x: 4, z: 40, r: 0.9, h: 6 });
  for (const sx of [-1, 1]) for (let k = 0; k < 5; k++) snowLantern(c, sx * 3.4, 23 + k * 3.2);
  for (const [x, z, h] of [[-14, 28, 3.4], [16, 30, 4], [-20, 16, 2.8]] as const) {
    c.glow.add(new THREE.OctahedronGeometry(1).scale(0.6, h * 0.5, 0.6), '#cfeaff', M(x, h * 0.5, z));
    for (let k = 0; k < 4; k++) { const a = k * 1.6; c.glow.add(new THREE.OctahedronGeometry(0.5).scale(0.5, 1.6, 0.5), AUR[k % AUR.length], M(x + Math.cos(a) * 1, 0.8, z + Math.sin(a) * 1, 0, 1, 1, 1, Math.cos(a) * 0.4, Math.sin(a) * 0.4)); }
    o.colliders.push({ x, z, r: 1.4, h });
  }
  // ═══ Lavvu tents, kick sleds, a frozen pond for skating, the glass aurora igloos on a ring. ═══
  for (const [x, z] of [[-24, -6], [-26, 4]] as const) c.g.frame(x, 0, z, 0, 1, () => c.glow.frame(x, 0, z, 0, 1, () => {
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.g.add(new THREE.CylinderGeometry(0.05, 0.05, 6.4, 4).translate(0, 3.2, 0), '#8a6a4a', M(Math.cos(a) * 1.9, 0, Math.sin(a) * 1.9, 0, 1, 1, 1, Math.sin(a) * 0.36, -Math.cos(a) * 0.36)); }
    surf(c, SURF.cloth, () => cone(c.g, 2.7, 5, '#8a7a6a', 0, 0, 0, 12));
    for (const y of [0.8, 1.2]) cyl(c.g, 2.3 - y * 0.35, 2.3 - y * 0.35, 0.12, ['#c23b2a', '#2f5a9a'][y > 1 ? 1 : 0], 0, y, 0, 12);
    box(c.g, 1, 1.6, 0.05, '#5a4a3a', 0, 0, 2.3); sphere(c.glow, 0.3, '#ff9a3a', 0, 0.4, 2.8, 6);
  }));
  o.colliders.push({ x: -24, z: -6, r: 2.8, h: 6 }, { x: -26, z: 4, r: 2.8, h: 6 });
  for (const [x, z, ry] of [[-10, 30, 0.3], [-8, 31, 0.1]] as const) c.g.frame(x, 0, z, ry, 1, () => { for (const sx of [-1, 1]) box(c.g, 0.05, 0.05, 2.4, '#3a3a44', sx * 0.3, 0.02, 0); box(c.g, 0.6, 0.06, 0.5, '#8a5a36', 0, 0.5, 0.3); box(c.g, 0.6, 0.6, 0.06, '#8a5a36', 0, 0.5, 0.05); for (const sx of [-1, 1]) cyl(c.g, 0.025, 0.025, 1.3, '#3a3a44', sx * 0.3, 0.05, -0.3, 4); box(c.g, 0.7, 0.05, 0.05, '#3a3a44', 0, 1.35, -0.3); });
  c.g.add(new THREE.CylinderGeometry(9, 9, 0.2, 36), '#bfe0f0', M(24, 0.1, 18, 0, 1, 1, 0.7)); // the frozen pond: ice, not a light
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; sphere(c.g, 0.4, '#f4f8fc', 24 + Math.cos(a) * 9.2, 0.1, 18 + Math.sin(a) * 6.5, 6, 0.5); }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.3, x = Math.cos(a) * 36, z = Math.sin(a) * 36;
    c.g.frame(x, 0, z, 0, 1, () => c.glow.frame(x, 0, z, 0, 1, () => {
      box(c.g, 6.4, 0.4, 6.4, '#8a5a3c');
      c.g.add(new THREE.SphereGeometry(3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), '#cfe8ff', M(0, 0.4, 0));
      for (let k = 0; k < 8; k++) { const b = (k / 8) * Math.PI * 2; c.g.add(new THREE.TorusGeometry(3.02, 0.04, 3, 16, Math.PI / 2), '#8a9aaa', M(0, 0.4, 0, b, 1, 1, 1, 0, 0)); }
      sphere(c.glow, 1, '#ffcf7a', 0, 1, 0, 8, 0.6);
    }));
    o.colliders.push({ x, z, r: 3.2, h: 3.4 });
  }
  o.height = 32;
};

// ───────────────────────────── The Sky Isles ─────────────────────────────

/** A bridge of light between two points: glowing planks, rope rails sagging on little posts. */
function lightBridge(c: Ctx, a: THREE.Vector3, b: THREE.Vector3): void {
  const d = b.clone().sub(a), len = d.length(), n = Math.max(4, Math.round(len / 0.8));
  const side = new THREE.Vector3(-d.z, 0, d.x).normalize();
  const ry = Math.atan2(d.x, d.z);
  for (let i = 0; i <= n; i++) {
    const t = i / n, p = a.clone().lerp(b, t);
    p.y -= Math.sin(t * Math.PI) * len * 0.05;
    c.glow.add(new THREE.BoxGeometry(1.6, 0.08, 0.5), i % 2 ? '#e0d0ff' : '#fff0c8', M(p.x, p.y, p.z, ry));
    if (i % 3 === 0) for (const s of [-1, 1]) { cyl(c.g, 0.03, 0.03, 0.9, '#b8a4ff', p.x + side.x * s * 0.8, p.y, p.z + side.z * s * 0.8, 4); sphere(c.glow, 0.07, '#fff0b0', p.x + side.x * s * 0.8, p.y + 0.95, p.z + side.z * s * 0.8, 5); }
  }
  for (const s of [-1, 1]) {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, p = a.clone().lerp(b, t); p.y += 0.85 - Math.sin(t * Math.PI) * len * 0.05; p.addScaledVector(side, s * 0.8); pts.push(p); }
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.03, 4), '#d8c8ff');
  }
}

/** A moon pavilion: a ring of slender moonstone columns, a lilac dome, a crystal hanging inside. */
function moonPavilion(c: Ctx, x: number, y: number, z: number, s: number): void {
  const moon = '#f4f0ff';
  for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; cyl(c.g, 0.12 * s, 0.14 * s, 3 * s, moon, x + Math.cos(a) * 1.6 * s, y, z + Math.sin(a) * 1.6 * s, 8); }
  cyl(c.g, 1.9 * s, 1.9 * s, 0.25 * s, moon, x, y + 3 * s, z, 12);
  c.g.add(new THREE.SphereGeometry(1.7 * s, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), '#c8b8ff', M(x, y + 3.25 * s, z));
  cone(c.g, 0.1 * s, 0.8 * s, '#d4af37', x, y + 4.9 * s, z, 6);
  c.glow.add(new THREE.OctahedronGeometry(0.4 * s).scale(0.6, 1.4, 0.6), '#bfe8ff', M(x, y + 1.9 * s, z));
}

const skyisles: Monument = (c, o) => {
  const moon = '#f4f0ff', lilac = '#b8a4ff', gold = '#d4af37';
  const tops: THREE.Vector3[] = [];
  // ═══ The spiral of floating isles, each joined to the next by a bridge of light. ═══
  for (let i = 0; i < 16; i++) {
    const a = i * 0.9, r = 70 - i * 3.2;
    const x = Math.cos(a) * r, z = Math.sin(a) * r, y = 18 + i * 9;
    const size = i === 15 ? 26 : c.rng.range(9, 15);
    floatingIsland(c, x, y, z, size);
    o.platforms.push({ x, z, r: size - 0.8, y: y + 0.6 });
    tops.push(new THREE.Vector3(x, y + 0.6, z));
    if (i < 15 && i % 4 === 2) moonPavilion(c, x + 2, y + 0.6, z - 2, 1);
    if (i < 15) { cyl(c.g, 0.06, 0.08, 2.6, moon, x - 2.5, y + 0.6, z + 2.5, 6); c.glow.add(new THREE.OctahedronGeometry(0.3).scale(0.7, 1.3, 0.7), ['#bfe8ff', '#ffc8f0', '#fff0b0'][i % 3], M(x - 2.5, y + 3.5, z + 2.5)); }
  }
  for (let i = 0; i < 15; i++) {
    const a = tops[i], b = tops[i + 1], d = b.clone().sub(a).setY(0).normalize();
    const rb = i + 1 === 15 ? 20 : 8;
    lightBridge(c, a.clone().addScaledVector(d, 8).setY(a.y + 0.2), b.clone().addScaledVector(d, -rb).setY(b.y + 0.2));
  }
  // Across each isle, a path of moonstone stepping stones from where one bridge lands to where the
  // next sets off, curving by the isle's middle; pastel flowers in beds on the lawn either side.
  const pastel = ['#ffc8f0', '#bfe8ff', '#fff0b0', '#d8c8ff', '#c8ffe0'];
  for (let i = 1; i < 15; i++) {
    const T0 = tops[i], din = T0.clone().sub(tops[i - 1]).setY(0).normalize(), dout = tops[i + 1].clone().sub(T0).setY(0).normalize();
    const p0 = T0.clone().addScaledVector(din, -8), p2 = T0.clone().addScaledVector(dout, 8), p1 = T0.clone().lerp(p0.clone().lerp(p2, 0.5), 0.3);
    const len = p0.distanceTo(p1) + p1.distanceTo(p2), n = Math.max(4, Math.round(len / 1.35));
    for (let k = 0; k <= n; k++) {
      const t = k / n, q = p0.clone().multiplyScalar((1 - t) ** 2).addScaledVector(p1, 2 * t * (1 - t)).addScaledVector(p2, t * t);
      surf(c, SURF.marble, () => cyl(c.g, 0.5 + c.rng.next() * 0.12, 0.55, 0.12, moon, q.x + c.rng.range(-0.15, 0.15), T0.y - 0.02, q.z + c.rng.range(-0.15, 0.15), 8));
    }
    // Two flower beds, off the path to either side (not where a moon pavilion stands).
    if (i % 4 === 2) continue;
    const side = new THREE.Vector3(-(dout.z + din.z), 0, dout.x + din.x).normalize();
    for (const sd of [-1, 1]) {
      const f = T0.clone().addScaledVector(side, sd * c.rng.range(3.2, 4.4));
      flowers(c.g, f.x, T0.y - 0.05, f.z, pastel, () => c.rng.next(), 9);
    }
  }
  // ═══ The Temple of the Great Lantern on the highest isle. ═══
  const T = tops[15];
  c.g.frame(T.x, T.y, T.z, 0, 1, () => c.glow.frame(T.x, T.y, T.z, 0, 1, () => {
    // A stepped moonstone platform, twelve columns with crystal capitals and arches between them.
    // Set down into the lawn so no grass shows through its floor.
    for (let k = 0; k < 3; k++) surf(c, SURF.marble, () => cyl(c.g, 15 - k * 0.8, 15.2 - k * 0.8, k === 0 ? 1.2 : 0.4, moon, 0, k === 0 ? -0.8 : k * 0.4, 0, 36));
    const R = 12.5, H = 13;
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
      cyl(c.g, 0.75, 0.85, 0.5, moon, x, 1.2, z, 12);
      cyl(c.g, 0.55, 0.62, H, moon, x, 1.7, z, 14);
      for (let q = 0; q < 6; q++) c.glow.add(new THREE.OctahedronGeometry(0.35).scale(0.5, 1.5, 0.5), ['#bfe8ff', '#ffc8f0', '#fff0b0', '#c8ffe0'][q % 4], M(x + Math.cos(q) * 0.45, 1.7 + H + 0.2, z + Math.sin(q) * 0.45, 0, 1, 1, 1, Math.cos(q) * 0.4, Math.sin(q) * 0.4));
      const a2 = ((k + 0.5) / 12) * Math.PI * 2, span = 2 * R * Math.sin(Math.PI / 12);
      c.g.add(new THREE.TorusGeometry(span / 2 - 0.5, 0.2, 5, 16, Math.PI), lilac, M(Math.cos(a2) * R * 0.99, 1.7 + H - span / 2 + 0.6, Math.sin(a2) * R * 0.99, Math.PI / 2 - a2));
      c.glow.add(new THREE.TorusGeometry(span / 2 - 0.8, 0.05, 4, 16, Math.PI), '#fff0c8', M(Math.cos(a2) * R * 0.99, 1.7 + H - span / 2 + 0.6, Math.sin(a2) * R * 0.99, Math.PI / 2 - a2));
    }
    // The entablature ring, a band of little stars, the ribbed dome of lilac glass.
    cyl(c.g, R + 1, R + 1, 1.2, moon, 0, 1.7 + H, 0, 36);
    for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2; sphere(c.glow, 0.12, k % 2 ? '#fff0b0' : '#bfe8ff', Math.cos(a) * (R + 1.02), 1.7 + H + 0.6, Math.sin(a) * (R + 1.02), 5); }
    c.g.add(new THREE.SphereGeometry(R, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2), lilac, M(0, 2.9 + H, 0, 0, 1, 0.75, 1));
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2, pts: THREE.Vector3[] = []; for (let q = 0; q <= 8; q++) { const t = (q / 8) * (Math.PI / 2) * 0.95; pts.push(new THREE.Vector3(Math.cos(a) * Math.cos(t) * (R + 0.08), 2.9 + H + Math.sin(t) * R * 0.75 + 0.06, Math.sin(a) * Math.cos(t) * (R + 0.08))); } c.glow.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.1, 4), '#fff0c8'); }
    // The Great Lantern within: a glowing heart, armillary rings about it, a beam rising through the dome.
    sphere(c.glow, 3, '#fff0b0', 0, 7.5, 0, 16, 1.2);
    for (const [rx, ry] of [[0, 0], [Math.PI / 2, 0], [0.9, 0.6], [2.1, 1.2]]) c.g.add(new THREE.TorusGeometry(4.4, 0.12, 5, 40), gold, M(0, 7.5, 0, ry, 1, 1, 1, rx, 0));
    cyl(c.g, 0.4, 0.6, 1.4, gold, 0, 1.2, 0, 10); cyl(c.g, 0.2, 0.2, 2.6, gold, 0, 2.6, 0, 8);
    cyl(c.glow, 0.3, 0.3, 30, '#fff0b0', 0, 2.9 + H + R * 0.75, 0, 6);
    cone(c.g, 0.6, 3, gold, 0, 2.9 + H + R * 0.75, 0, 8);
    // Crystals floating round the temple, and banners of light between some columns.
    for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2 + 0.3; c.glow.add(new THREE.OctahedronGeometry(0.7).scale(0.6, 1.6, 0.6), ['#bfe8ff', '#ffc8f0', '#fff0b0', '#c8ffe0', '#d8c8ff'][k % 5], M(Math.cos(a) * 19, 8 + Math.sin(k * 1.7) * 3, Math.sin(a) * 19, a)); }
    for (let k = 0; k < 12; k += 3) { const a = ((k + 0.5) / 12) * Math.PI * 2; box(c.glow, 1.2, 5, 0.04, ['#ffc8f0', '#bfe8ff', '#fff0b0', '#c8ffe0'][k / 3], Math.cos(a) * (R - 0.4), 8, Math.sin(a) * (R - 0.4), Math.PI / 2 - a); }
  }));
  // Its steps are walkable, one tread at a time; its columns, the lantern's stand and the rim of the
  // isle stop you — standing on the isle only (y0), never walling off the meadow beneath it.
  for (let k = 0; k < 3; k++) o.platforms.push({ x: T.x, z: T.z, r: 15.1 - k * 0.8, y: T.y + 0.4 * (k + 1) });
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; o.colliders.push({ x: T.x + Math.cos(a) * 12.5, z: T.z + Math.sin(a) * 12.5, r: 0.8, h: T.y + 16, y0: T.y }); }
  o.colliders.push({ x: T.x, z: T.z, r: 0.9, h: T.y + 4, y0: T.y });
  // ═══ The air-taxi stage (travel/air.ts): a round moonstone landing stage floating off the temple's
  // isle, a bridge of light across to it, a glowing ring to land in, a lamp either side. ═══
  const P = skyPad(), u = new THREE.Vector3(P.ux, 0, P.uz);
  cyl(c.g, PAD_R + 0.2, PAD_R + 0.2, 0.4, moon, P.x, P.y - 0.4, P.z, 36);
  cyl(c.g, PAD_R + 0.2, 1.6, 4.5, '#c8b8f0', P.x, P.y - 4.9, P.z, 24);
  cyl(c.g, 1.6, 0.1, 3, lilac, P.x, P.y - 7.9, P.z, 12);
  c.glow.add(new THREE.TorusGeometry(PAD_R - 1.2, 0.08, 4, 48).rotateX(Math.PI / 2), '#bfe8ff', M(P.x, P.y + 0.03, P.z));
  c.glow.add(new THREE.TorusGeometry(PAD_R - 3.4, 0.05, 4, 32).rotateX(Math.PI / 2), '#ffc8f0', M(P.x, P.y + 0.03, P.z));
  const b0 = T.clone().addScaledVector(u, 23.5).setY(T.y + 0.1), b1 = T.clone().addScaledVector(u, PAD_OUT - PAD_R + 0.3).setY(T.y + 0.1);
  lightBridge(c, b0, b1);
  for (let d = 15; d <= PAD_OUT - PAD_R + 0.5; d += 1) {
    const t = Math.min(1, Math.max(0, (d - 23.5) / b0.distanceTo(b1)));
    o.platforms.push({ x: T.x + u.x * d, z: T.z + u.z * d, r: 1.1, y: T.y + (d < 23.5 ? 0 : 0.1 - Math.sin(t * Math.PI) * b0.distanceTo(b1) * 0.05) });
  }
  for (const s of [-1, 1]) {
    const lx = P.x - u.x * (PAD_R - 0.5) - u.z * s * 1.4, lz = P.z - u.z * (PAD_R - 0.5) + u.x * s * 1.4;
    cyl(c.g, 0.07, 0.09, 2.2, moon, lx, P.y, lz, 6);
    c.glow.add(new THREE.OctahedronGeometry(0.28).scale(0.7, 1.3, 0.7), s < 0 ? '#bfe8ff' : '#ffc8f0', M(lx, P.y + 2.5, lz));
  }
  o.platforms.push({ x: P.x, z: P.z, r: PAD_R, y: P.y });
  // ═══ The cable car (travel/gondola.ts): a valley station on the meadow, a mountain station built
  // out from the rim of the temple's isle, two cables between, each station a moonstone deck under
  // a lilac canopy with the bullwheel the cables turn round. ═══
  const L = tramLine(), ry = Math.atan2(L.ux, L.uz);
  const station = (sx: number, sy: number, sz: number, back: number, fore: number, wheelZ: number, valley: boolean) => {
    c.g.frame(sx, sy, sz, ry, 1, () => c.glow.frame(sx, sy, sz, ry, 1, () => {
      const len = fore - back, mid = (fore + back) / 2;
      box(c.g, 8, valley ? 1.2 : 0.45, len, moon, 0, valley ? -1.2 : -0.45, mid);
      for (const x of [-4.05, 4.05]) box(c.g, 0.1, 0.12, len, gold, x, -0.12, mid);
      // Slender columns and the canopy.
      for (const x of [-3.9, 3.9]) for (const z of [back + 0.6, mid, fore - 0.6]) {
        cyl(c.g, 0.16, 0.2, 5.6, moon, x, 0, z, 10);
        c.glow.add(new THREE.OctahedronGeometry(0.16).scale(0.7, 1.4, 0.7), '#fff0b0', M(x, 5.9, z));
      }
      box(c.g, 8.8, 0.3, len + 0.8, lilac, 0, 5.6, mid);
      box(c.g, 9, 0.1, len + 1, gold, 0, 5.55, mid);
      c.g.add(new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), moon, M(0, 5.9, mid));
      // The bullwheel the cables turn round, on its post.
      c.g.add(new THREE.TorusGeometry(TRAM_TRACK, 0.14, 8, 32).rotateX(Math.PI / 2), '#c8ccd4', M(0, TRAM_HANG, wheelZ));
      for (let k = 0; k < 6; k++) box(c.g, 0.08, 0.08, TRAM_TRACK * 2, '#9a9eb0', 0, TRAM_HANG - 0.04, wheelZ, (k / 6) * Math.PI);
      cyl(c.g, 0.25, 0.3, TRAM_HANG, '#8a8ea0', 0, 0, wheelZ, 10);
      // A rail round the open end over the drop, or low kerbs on the meadow.
      if (!valley) {
        for (const x of [-4, 4]) box(c.g, 0.08, 1, 0.08, gold, x, 0, back + 0.1);
        box(c.g, 8, 0.08, 0.08, gold, 0, 1, back + 0.1);
      }
    }));
  };
  const tp = L.top, gp = L.ground;
  station(tp.x, tp.y, tp.z, -4, 9, 8, false);
  station(gp.x, gp.y, gp.z, -9, 4, -8, true);
  // The mountain station's brace down to the isle's rock.
  rod(c.g, new THREE.Vector3(tp.x - L.ux * 3, tp.y - 0.45, tp.z - L.uz * 3), new THREE.Vector3(tp.x + L.ux * 7, tp.y - 9, tp.z + L.uz * 7), 0.35, '#c8b8f0', 8);
  // Two cables, each with its haul rope just above, following the cabins' course.
  for (const side of [1, -1] as const) {
    const course = tramCourse(side, true), step = Math.max(1, Math.floor(course.length / 60));
    for (const lift of [TRAM_HANG, TRAM_HANG + 0.35]) {
      const pts = course.filter((_, i) => i % step === 0 || i === course.length - 1).map(([x, y, z]) => new THREE.Vector3(x, y + lift, z));
      // On round the bullwheels at either end.
      pts.unshift(pts[0].clone().add(new THREE.Vector3(-L.ux * 3, 0, -L.uz * 3)));
      pts.push(pts[pts.length - 1].clone().add(new THREE.Vector3(L.ux * 3, 0, L.uz * 3)));
      c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, lift === TRAM_HANG ? 0.045 : 0.025, 4), '#3a3a48');
    }
  }
  // The decks are walkable.
  for (const [s0, y, a, b] of [[tp, tp.y, -4, 9], [gp, gp.y, -9, 4]] as const) {
    for (let z = a + 1; z <= b - 1; z += 1.5) o.platforms.push({ x: s0.x + L.ux * z, z: s0.z + L.uz * z, r: 3.9, y });
  }
  o.height = T.y + 60;
};

// ───────────────────────────── Wanderers' Meadow ─────────────────────────────

/** The Great Tree's growth habit: an ancient oak, 30 m, forking into great limbs. */
const GREAT_OAK: Habit = { ...HABITS.oak!, h: 30, trunk: 0.26, r: 2.6, forks: 5, spread: 0.85, lift: 0.18, limb: 0.42, shrink: 0.66, depth: 3, blob: 0.1, squash: 0.72, gnarl: 0.3 };

/** A ring platform of planks round a trunk from r0 to r1 at height y (over the arc a0..a1), with a rail of posts and rope. */
function treeDeck(c: Ctx, y: number, r0: number, r1: number, a0 = 0, a1 = Math.PI * 2, cx = 0, cz = 0): void {
  const n = Math.round(((a1 - a0) * r1) / 0.45);
  surf(c, SURF.boards, () => { for (let i = 0; i < n; i++) {
    const a = a0 + ((i + 0.5) / n) * (a1 - a0);
    c.g.add(new THREE.BoxGeometry(r1 - r0, 0.12, 0.42), i % 3 ? '#a8784a' : '#9a6a3e', M(cx + Math.cos(a) * (r0 + r1) / 2, y, cz + Math.sin(a) * (r0 + r1) / 2, -a));
  } });
  // Brackets under the deck, posts and a rope rail round its edge.
  for (let i = 0; i < 8; i++) { const a = a0 + ((i + 0.5) / 8) * (a1 - a0); rod(c.g, new THREE.Vector3(cx + Math.cos(a) * r0, y - 1.6, cz + Math.sin(a) * r0), new THREE.Vector3(cx + Math.cos(a) * r1 * 0.9, y - 0.05, cz + Math.sin(a) * r1 * 0.9), 0.08, '#6b4a2a', 5); }
  const m = Math.max(6, Math.round(((a1 - a0) * r1) / 1.3)), rail: THREE.Vector3[] = [];
  for (let i = 0; i <= m; i++) { const a = a0 + (i / m) * (a1 - a0); cyl(c.g, 0.05, 0.05, 1, '#6b4a2a', cx + Math.cos(a) * (r1 - 0.1), y, cz + Math.sin(a) * (r1 - 0.1), 4); rail.push(new THREE.Vector3(cx + Math.cos(a) * (r1 - 0.1), y + 0.95 - (i % 2) * 0.08, cz + Math.sin(a) * (r1 - 0.1))); }
  c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rail), m * 3, 0.03, 4), '#d8c8a0');
}

/** A little pod house on a deck: round walls, a round door, a lit round window, a conical cap with a curl. */
function treePod(c: Ctx, x: number, y: number, z: number, face: number, roof: string): void {
  c.g.frame(x, y, z, face, 1, () => c.glow.frame(x, y, z, face, 1, () => {
    surf(c, SURF.plaster, () => cyl(c.g, 1.05, 1.15, 2, '#f4e6c8', 0, 0, 0, 14));
    for (let i = 0; i < 5; i++) c.g.add(new THREE.CylinderGeometry(1.17, 1.17, 0.06, 14, 1, true), '#c8a878', M(0, 0.3 + i * 0.4, 0));
    c.g.add(new THREE.CylinderGeometry(0.45, 0.45, 0.1, 16).rotateX(Math.PI / 2), '#8a4a2a', M(0, 0.7, 1.12));
    box(c.g, 0.9, 0.7, 0.1, '#8a4a2a', 0, 0, 1.12);
    sphere(c.g, 0.05, '#d4af37', 0.25, 0.6, 1.2, 5);
    c.glow.add(new THREE.CylinderGeometry(0.22, 0.22, 0.06, 12).rotateX(Math.PI / 2), '#ffd27a', M(0.75, 1.3, 0.85, Math.PI / 4));
    surf(c, SURF.slate, () => cone(c.g, 1.55, 1.9, roof, 0, 2, 0, 14)); // a cap of shingles
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) { const a = (i / 8) * Math.PI * 1.4; pts.push(new THREE.Vector3(Math.sin(a) * 0.25 * (1 - i / 12), 3.8 + (1 - Math.cos(a)) * 0.25, 0)); }
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.07, 5), roof);
    for (let i = 0; i < 5; i++) sphere(c.g, 0.1, ['#ff8fb8', '#ffd24a', '#b8ff9a'][i % 3], -0.7 + i * 0.35, 0.05, 1.18, 5); // a flower box
  }));
}

const meadow: Monument = (c, o) => {
  const bark = '#6b4a30', rnd = () => c.rng.next();
  // ═══ The Great Tree: an ancient oak grown branch by branch, buttress roots arching into the grass. ═══
  c.g.leafy = true;
  try { growTree(c.g, GREAT_OAK, 0, 0, 0, 1, rnd); } finally { c.g.leafy = false; }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + c.rng.range(-0.2, 0.2), len = c.rng.range(5, 8);
    c.g.add(new THREE.CylinderGeometry(0.25, 1.1, len, 7).translate(0, len / 2, 0), bark, M(Math.cos(a) * 1.6, 1.4, Math.sin(a) * 1.6, -a + Math.PI / 2, 1, 1, 1, 0, 0).multiply(new THREE.Matrix4().makeRotationZ(-1.3)));
    // Moss and little flowers along each root.
    for (let q = 0; q < 4; q++) sphere(c.g, 0.35, '#5a9a4a', Math.cos(a) * (3 + q * 1.1), 0.4 + (3 - q) * 0.25, Math.sin(a) * (3 + q * 1.1), 6, 0.4);
    sphere(c.g, 0.1, ['#ff8fb8', '#ffffff', '#ffd24a'][i % 3], Math.cos(a) * 4.5, 0.75, Math.sin(a) * 4.5, 5);
  }
  // The door into the trunk, carved round, a lit round window above, a name board beside.
  archPanel(c.g, 1.3, 2.2, '#4a2e1a', 0, 0, 2.95, 0, 0.12, true);
  for (let i = 0; i < 7; i++) { const a = Math.PI * (0.1 + (i / 6) * 0.8); sphere(c.g, 0.1, '#8a5a36', Math.cos(a) * 0.72, 1.55 + Math.sin(a) * 0.72, 3.1, 5); }
  box(c.glow, 0.12, 0.12, 0.05, '#ffd27a', 0.35, 1.1, 3.08);
  sphere(c.glow, 0.32, c.s.glow, 0, 3.4, 2.9, 10);
  c.g.frame(1.6, 0, 4.2, -0.3, 1, () => { box(c.g, 0.12, 1.5, 0.12, '#6b4a2a', 0, 0, 0); box(c.g, 1.8, 0.55, 0.08, '#e8c48a', 0, 1.2, 0.06); for (let i = 0; i < 7; i++) box(c.g, 0.12, 0.26, 0.03, '#6b4a2a', -0.6 + i * 0.2, 1.33, 0.11); });
  // ═══ A spiral stair of planks winding up the trunk to the first deck, then on to the second. ═══
  const stairR = 4.1;
  for (let i = 0; i < 64; i++) {
    const a = Math.PI * 0.62 + i * 0.16, y = 0.25 + i * (12 / 64);
    c.g.add(new THREE.BoxGeometry(1.5, 0.12, 0.55), i % 2 ? '#a8784a' : '#9a6a3e', M(Math.cos(a) * stairR, y, Math.sin(a) * stairR, -a));
    if (i % 4 === 0) rod(c.g, new THREE.Vector3(Math.cos(a) * 3, y - 1.2, Math.sin(a) * 3), new THREE.Vector3(Math.cos(a) * stairR, y - 0.05, Math.sin(a) * stairR), 0.06, '#6b4a2a', 4);
  }
  const rope: THREE.Vector3[] = [];
  for (let i = 0; i <= 64; i += 2) { const a = Math.PI * 0.62 + i * 0.16; rope.push(new THREE.Vector3(Math.cos(a) * (stairR + 0.75), 1.2 + i * (12 / 64), Math.sin(a) * (stairR + 0.75))); }
  c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rope), 96, 0.035, 4), '#d8c8a0');
  // ═══ Two decks round the trunk with pod houses, lanterns strung between their posts. ═══
  treeDeck(c, 7, 3, 7, -Math.PI * 0.3, Math.PI * 1.3);
  treeDeck(c, 12.2, 2.6, 5.6, Math.PI * 0.2, Math.PI * 1.7);
  for (const [a, y, r, roof] of [[Math.PI * 1.1, 7.06, 5.3, '#e07a5f'], [Math.PI * 0.05, 7.06, 5.3, '#8a6ad8'], [Math.PI * 0.95, 12.26, 4.3, '#5aa84f']] as const) treePod(c, Math.cos(a) * r, y, Math.sin(a) * r, Math.PI / 2 - a, roof);
  for (let i = 0; i < 18; i++) { const a = -Math.PI * 0.3 + (i / 18) * Math.PI * 1.6; sphere(c.glow, 0.09, ['#ffe98a', '#ffd6f0', '#c8f0ff'][i % 3], Math.cos(a) * 6.9, 8.1, Math.sin(a) * 6.9, 5); }
  // ═══ A rope bridge from the first deck to a lookout in a companion oak. ═══
  const ox = 15, oz = -9;
  c.g.leafy = true;
  try { growTree(c.g, { ...GREAT_OAK, h: 16, r: 1.6, forks: 4 }, ox, 0, oz, 1, rnd); } finally { c.g.leafy = false; }
  treeDeck(c, 7, 1.2, 3.4, 0, Math.PI * 2, ox, oz);
  const from = new THREE.Vector3(Math.cos(-Math.PI * 0.25) * 6.8, 7, Math.sin(-Math.PI * 0.25) * 6.8), to = new THREE.Vector3(ox - 3.2, 7, oz + 0.8);
  const dir = to.clone().sub(from), len = dir.length(), side = new THREE.Vector3(-dir.z, 0, dir.x).normalize(), ry = Math.atan2(dir.x, dir.z);
  for (let i = 0; i <= 16; i++) { const u = i / 16, p = from.clone().lerp(to, u); p.y -= Math.sin(u * Math.PI) * 0.9; c.g.add(new THREE.BoxGeometry(1.2, 0.08, 0.4), '#a8784a', M(p.x, p.y, p.z, ry + Math.PI / 2)); }
  for (const s of [-1, 1]) { const pts: THREE.Vector3[] = []; for (let i = 0; i <= 12; i++) { const u = i / 12, p = from.clone().lerp(to, u).addScaledVector(side, s * 0.65); p.y += 1 - Math.sin(u * Math.PI) * 0.7; pts.push(p); } c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.04, 4), '#d8c8a0'); }
  void len;
  // ═══ Round its foot: a fairy ring of glowing mushrooms, birdhouses, the wishing ribbons, a reading nook, a swing. ═══
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2, r = 9.5 + Math.sin(i * 2.3) * 0.4, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (z > 7 && Math.abs(x) < 2) continue; // the path to the door
    cyl(c.g, 0.07, 0.1, 0.35, '#f4efe4', x, 0, z, 6);
    c.glow.add(new THREE.SphereGeometry(0.28, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), ['#ff8fb8', '#b8a4ff', '#8fd0ff', '#ffd24a'][i % 4], M(x, 0.35, z, 0, 1, 0.7, 1));
  }
  for (const [x, y, z] of [[-4.5, 5.2, -3.2], [3.6, 4.4, -4.4], [-2.6, 9.4, 3.8]] as const) {
    box(c.g, 0.02, 0.8, 0.02, '#d8c8a0', x, y + 0.6, z);
    box(c.g, 0.45, 0.5, 0.45, ['#ffd24a', '#8fd0ff', '#ff8fb8'][Math.abs(Math.round(x)) % 3], x, y, z);
    c.g.add(new THREE.ConeGeometry(0.42, 0.3, 4).rotateY(Math.PI / 4), '#8a4a2a', M(x, y + 0.65, z));
    box(c.g, 0.12, 0.12, 0.02, '#2a2a2e', x, y + 0.25, z + 0.23);
  }
  // The wishing limb: ribbons of every colour tied along a low branch, lifting in the wind.
  rod(c.g, new THREE.Vector3(-2, 4.6, 1.5), new THREE.Vector3(-8.5, 5.4, 4.2), 0.28, bark, 7);
  for (let i = 0; i < 16; i++) { const u = i / 16, x = -2 - u * 6.5, y = 4.6 + u * 0.8, z = 1.5 + u * 2.7; box(c.g, 0.1, 0.9 + (i % 3) * 0.3, 0.02, ['#ff5a8a', '#ffd24a', '#5ac8ff', '#8aff8a', '#b86bff', '#ff9a4a'][i % 6], x, y - 1.1 - (i % 3) * 0.3, z, u); }
  // A reading nook in the roots: a curved bench, a little shelf of books.
  c.g.frame(-5.5, 0, 3.5, 0.9, 1, () => { box(c.g, 2.2, 0.45, 0.6, '#8a5a36', 0, 0, 0); box(c.g, 2.2, 0.6, 0.1, '#8a5a36', 0, 0.45, -0.3); box(c.g, 0.9, 0.9, 0.3, '#6b4a2a', 1.6, 0, -0.1); for (let i = 0; i < 6; i++) box(c.g, 0.1, 0.3, 0.2, ['#8a2a3a', '#2f4a8a', '#3a7a4a'][i % 3], 1.3 + i * 0.11, 0.5, -0.1); });
  for (const x of [-0.5, 0.5]) box(c.g, 0.04, 6.5, 0.04, '#d8c8a0', 5.6 + x, 1.2, 1.2);
  box(c.g, 1.3, 0.1, 0.45, '#8a5a36', 5.6, 1.1, 1.2);
  for (let i = 0; i < 26; i++) {
    const a = c.rng.range(0, Math.PI * 2), rr = c.rng.range(5, 14), y = c.rng.range(13.5, 18), drop = c.rng.range(1, 2.5);
    box(c.g, 0.03, drop, 0.03, '#d8c8a0', Math.cos(a) * rr, y, Math.sin(a) * rr);
    c.glow.add(lanternGeometry('fairy').scale(0.9, 0.9, 0.9), c.rng.pick(['#ffe98a', '#ffd6f0', '#c8f0ff', '#fff4c0']), M(Math.cos(a) * rr, y - 0.9, Math.sin(a) * rr));
  }
  // ═══ The old well and the windmill, as before. ═══
  c.g.frame(18, 0, 6, 0, 1, () => {
    cyl(c.g, 1.8, 1.9, 1.2, '#a8a098', 0, 0, 0, 10);
    cyl(c.g, 1.5, 1.5, 0.1, '#5ab4e0', 0, 1.1, 0, 10);
    for (const x of [-1.5, 1.5]) box(c.g, 0.2, 2.8, 0.2, '#6b4a2a', x, 0, 0);
    gable(c.g, 3.6, 3, 1.2, '#e07a5f', 0, 2.8, 0);
  });
  c.g.frame(-26, 0, -14, 0.4, 1, () => c.glow.frame(-26, 0, -14, 0.4, 1, () => {
    cyl(c.g, 2.4, 3.4, 12, '#fff4e0', 0, 0, 0, 8);
    cone(c.g, 3, 3, '#e07a5f', 0, 12, 0, 8);
    for (let i = 0; i < 4; i++) c.g.add(new THREE.BoxGeometry(1.1, 8, 0.15).translate(0, 4.2, 0), '#f4ead8', M(0, 11, 3.5, 0, 1, 1, 1, 0, (i * Math.PI) / 2 + 0.4));
    box(c.glow, 1, 1.4, 0.1, c.s.glow, 0, 5, 3.25);
  }));
  o.colliders.push({ x: 0, z: 0, r: 3.6, h: 32 }, { x: 18, z: 6, r: 2, h: 3 }, { x: -26, z: -14, r: 3.4, h: 15 }, { x: ox, z: oz, r: 1.4, h: 16 });
  o.height = 32;
};

// ───────────────────────────── Bagh-e-Noor ─────────────────────────────

const TAJ = '#fbf7ee', TAJ_SHADE = '#e6dccb', SANDSTONE = '#b5552e', SAND_LIGHT = '#c8704a';
const INLAY_G = '#2f7a5a', INLAY_R = '#b83a3a', INLAY_K = '#2a2622', GILT = '#d4af37';

/** Trace a pointed Mughal arch into a path: `ow` wide at cx, from its sill y0 up the jambs to the springing `sh`, then to the apex `ah`. */
function archPath(p: THREE.Path, ow: number, y0: number, sh: number, ah: number, cx = 0): THREE.Path {
  const k = sh + (ah - sh) * 0.8;
  p.moveTo(cx - ow / 2, y0); p.lineTo(cx + ow / 2, y0); p.lineTo(cx + ow / 2, sh);
  p.quadraticCurveTo(cx + ow / 2, k, cx, ah); p.quadraticCurveTo(cx - ow / 2, k, cx - ow / 2, sh);
  p.lineTo(cx - ow / 2, y0);
  return p;
}

/** Points along a pointed arch, springing to springing, on the plane z (f: how full its shoulders are). */
function archLine(ow: number, sh: number, ah: number, z: number, cx = 0, n = 10, f = 0.8): THREE.Vector3[] {
  const k = sh + (ah - sh) * f, q = (t: number, a: number, b: number, e: number) => (1 - t) * (1 - t) * a + 2 * (1 - t) * t * b + t * t * e;
  const half: THREE.Vector3[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n; half.push(new THREE.Vector3(cx + q(t, -ow / 2, -ow / 2, 0), q(t, sh, k, ah), z)); }
  return [...half, ...half.slice(0, -1).reverse().map((p) => new THREE.Vector3(2 * cx - p.x, p.y, z))];
}

/** A moulding (a round bead) along a line of points. */
function moulding(g: Ctx['g'], pts: THREE.Vector3[], r: number, col: string): void {
  g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), pts.length * 2, r, 4), col);
}

/** An arch moulding with its jambs, from the ground line y0 on both sides. */
function archBead(g: Ctx['g'], ow: number, y0: number, sh: number, ah: number, z: number, r: number, col: string, cx = 0, f = 0.8): void {
  moulding(g, [new THREE.Vector3(cx - ow / 2, y0, z), ...archLine(ow, sh, ah, z, cx, 10, f), new THREE.Vector3(cx + ow / 2, y0, z)], r, col);
}

/** Extrude a facing shape `depth` thick, centred on z = 0. */
function slab(sh: THREE.Shape, depth: number): THREE.ExtrudeGeometry {
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false, curveSegments: 8 });
  g.translate(0, 0, -depth / 2);
  return g;
}

/** A wall 2·hw wide and h high (a raised middle 2·pw wide up to ph, if ph > h) with an arch `ow` wide opening from the ground through it. */
function iwanShape(hw: number, h: number, pw: number, ph: number, ow: number, sh: number, ah: number): THREE.Shape {
  const s = new THREE.Shape(), k = sh + (ah - sh) * 0.8;
  s.moveTo(-hw, 0); s.lineTo(-ow / 2, 0); s.lineTo(-ow / 2, sh);
  s.quadraticCurveTo(-ow / 2, k, 0, ah); s.quadraticCurveTo(ow / 2, k, ow / 2, sh);
  s.lineTo(ow / 2, 0); s.lineTo(hw, 0); s.lineTo(hw, h);
  if (ph > h) { s.lineTo(pw, h); s.lineTo(pw, ph); s.lineTo(-pw, ph); s.lineTo(-pw, h); }
  s.lineTo(-hw, h); s.lineTo(-hw, 0);
  return s;
}

/** A band of black-marble calligraphy set in white, `len` along x (or up, if `up`) and h across, bottom centre (x, y) on the plane z. */
function callig(c: Ctx, x: number, y: number, z: number, len: number, h: number, up: boolean, rnd: () => number): void {
  const rot = up ? Math.PI / 2 : 0;
  const P = (t: number, v: number): [number, number] => (up ? [x + h / 2 - v, y + t] : [x - len / 2 + t, y + v]);
  if (up) box(c.g, h, len, 0.05, TAJ, x, y, z); else box(c.g, len, h, 0.05, TAJ, x, y, z);
  const put = (geo: THREE.BufferGeometry, t: number, v: number, rz = 0) => { const [px, py] = P(t, v); c.g.add(geo, INLAY_K, M(px, py, z + 0.04, 0, 1, 1, 1, 0, rot + rz)); };
  put(new THREE.BoxGeometry(len, 0.04, 0.03), len / 2, 0.06);
  put(new THREE.BoxGeometry(len, 0.04, 0.03), len / 2, h - 0.06);
  for (let t = 0.2 * h; t < len - 0.2 * h;) {
    const r = rnd();
    if (r < 0.45) { const s = h * (0.3 + rnd() * 0.42); put(new THREE.BoxGeometry(0.045 * h + 0.01, s, 0.03), t, 0.16 * h + s / 2, (rnd() - 0.5) * 0.25); t += 0.13 * h; }
    else if (r < 0.8) { const rr = h * (0.09 + rnd() * 0.08); put(new THREE.TorusGeometry(rr, 0.022 * h + 0.005, 3, 10, Math.PI * 1.25), t + rr, 0.18 * h + rr, Math.PI * 0.95); t += rr * 2 + 0.07 * h; }
    else { put(new THREE.BoxGeometry(0.05 * h, 0.05 * h, 0.03), t, (0.68 + rnd() * 0.12) * h, Math.PI / 4); t += 0.1 * h; }
  }
}

/** A flowering plant in pietra dura — or, given one colour, carved in relief: stem, leaves, a five-petalled flower; bottom at (x, y) on the plane z. */
function inlayFlower(c: Ctx, x: number, y: number, z: number, s: number, carved?: string): void {
  const stem = carved ?? INLAY_G, petal = carved ?? INLAY_R;
  c.g.add(new THREE.BoxGeometry(0.04 * s, 0.9 * s, 0.03), stem, M(x, y + 0.45 * s, z));
  for (const [sx, h] of [[-1, 0.3], [1, 0.5], [-1, 0.65]] as const) c.g.add(new THREE.SphereGeometry(0.16 * s, 6, 4), stem, M(x + sx * 0.13 * s, y + h * s, z, 0, 1, 0.4, 0.15, 0, sx * 0.6));
  for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2 + Math.PI / 2; c.g.add(new THREE.SphereGeometry(0.1 * s, 6, 4), petal, M(x + Math.cos(a) * 0.12 * s, y + 0.98 * s + Math.sin(a) * 0.12 * s, z, 0, 0.55, 1, 0.15, 0, a - Math.PI / 2)); }
  sphere(c.g, 0.05 * s, carved ?? GILT, x, y + 0.98 * s, z + 0.02, 5);
}

/** A pietra-dura rosette: a green roundel ringed in black, eight red petals, a gilt heart; on the plane z. */
function rosette(c: Ctx, x: number, y: number, z: number, r: number): void {
  c.g.add(new THREE.CylinderGeometry(r, r, 0.04, 20).rotateX(Math.PI / 2), INLAY_G, M(x, y, z + 0.02));
  c.g.add(new THREE.TorusGeometry(r, r * 0.07, 3, 24), INLAY_K, M(x, y, z + 0.04));
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; c.g.add(new THREE.SphereGeometry(r * 0.3, 6, 4), INLAY_R, M(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5, z + 0.05, 0, 0.45, 1, 0.12, 0, a - Math.PI / 2)); }
  sphere(c.g, r * 0.16, GILT, x, y, z + 0.06, 6);
}

/** A jali: a lit pointed window behind a lattice of marble octagons, beaded round; bottom centre (x, y) on the plane z. */
function jali(c: Ctx, x: number, y: number, z: number, w: number, h: number): void {
  archPanel(c.glow, w, h, '#ffcf9a', x, y, z, 0, 0.04, true);
  const n = 5, cell = w / n, r = w / 2;
  for (let i = 0; i < n; i++) for (let j = 0; (j + 0.5) * cell < h; j++) {
    const px = x - r + cell * (i + 0.5), py = y + cell * (j + 0.5), up = py - (y + h - r);
    if (up > 0 && Math.hypot(px - x, up) > r * 0.8) continue;
    c.g.add(new THREE.TorusGeometry(cell * 0.4, cell * 0.08, 3, 8), TAJ, M(px, py, z + 0.07, 0, 1, 1, 1, 0, Math.PI / 8));
  }
  archBead(c.g, w + 0.12, y, y + h - r, y + h + r * 0.15, z + 0.08, 0.06, TAJ_SHADE, x, 0.7);
}

/** A Mughal parapet: little blind-arched merlons (kanguras) from x0 to x1 at height y, on the wall face z. */
function kanguras(c: Ctx, x0: number, x1: number, y: number, z: number, col: string): void {
  const n = Math.max(1, Math.round((x1 - x0) / 0.9));
  for (let k = 0; k < n; k++) archPanel(c.g, 0.62, 0.55, col, x0 + ((x1 - x0) * (k + 0.5)) / n, y, z - 0.16, 0, 0.16, true);
  box(c.g, x1 - x0, 0.12, 0.3, col, (x0 + x1) / 2, y - 0.06, z - 0.15);
}

/** A bulbous Mughal dome, r at its widest, rising from y, with a ring of lotus petals round its crown. */
function bulb(c: Ctx, x: number, y: number, z: number, r: number, col: string, seg = 20): void {
  const prof = [[0.001, 0], [0.9, 0], [1, 0.22], [1.06, 0.5], [1.0, 0.8], [0.82, 1.08], [0.55, 1.32], [0.28, 1.5], [0.1, 1.6], [0.001, 1.64]];
  c.g.add(new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a * r, b * r)), seg), col, M(x, y, z));
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.g.add(new THREE.SphereGeometry(r * 0.1, 6, 4), col, M(x + Math.cos(a) * r * 0.3, y + r * 1.47, z + Math.sin(a) * r * 0.3, Math.PI / 2 - a, 1, 1.9, 0.4)); }
}

/** A chhatri: an octagonal kiosk of eight slim columns, a sloping chhajja eave, a lotus-crowned bulb and a gilt finial; r its radius. */
function chhatri8(c: Ctx, x: number, y: number, z: number, r: number, col = TAJ, domeCol = TAJ): void {
  cyl(c.g, r * 1.05, r * 1.12, r * 0.22, col, x, y, z, 8);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8; cyl(c.g, r * 0.07, r * 0.08, r * 1.05, col, x + Math.cos(a) * r * 0.86, y + r * 0.22, z + Math.sin(a) * r * 0.86, 6); }
  cyl(c.g, r * 0.95, r * 0.95, r * 0.2, col, x, y + r * 1.27, z, 8);
  cyl(c.g, r * 0.95, r * 1.3, r * 0.16, col, x, y + r * 1.3, z, 8);
  cyl(c.g, r * 0.72, r * 0.72, r * 0.2, domeCol, x, y + r * 1.47, z, 12);
  bulb(c, x, y + r * 1.67, z, r * 0.7, domeCol, 12);
  cone(c.g, r * 0.06, r * 0.5, GILT, x, y + r * 1.67 + r * 0.7 * 1.6, z, 5);
}

/** A guldasta: a slender engaged pinnacle up a corner, ringed, ending above the parapet in a lotus bud. */
function guldasta(c: Ctx, x: number, z: number, y0: number, h: number, r: number, col = TAJ): void {
  cyl(c.g, r, r * 1.1, h, col, x, y0, z, 8);
  for (let y = y0 + 2; y < y0 + h - 1; y += 3) cyl(c.g, r * 1.25, r * 1.25, 0.2, TAJ_SHADE, x, y, z, 8);
  cyl(c.g, r * 1.5, r * 1.2, 0.3, col, x, y0 + h, z, 8);
  c.g.add(new THREE.LatheGeometry([[0.001, 0], [r * 1.1, 0.2], [r * 1.2, r * 1.5], [r * 0.6, r * 2.6], [0.001, r * 3.2]].map(([a, b]) => new THREE.Vector2(a, b)), 10), TAJ, M(x, y0 + h + 0.3, z));
  cone(c.g, r * 0.2, r * 1.4, GILT, x, y0 + h + 0.3 + r * 3.1, z, 5);
}

/** A minaret: an octagonal foot, a shaft tapering in three stages lined in black inlay, a bracketed balcony on each, a chhatri on top. */
function minaret(c: Ctx, x: number, y: number, z: number, h: number, r: number): void {
  surf(c, SURF.marble, () => cyl(c.g, r * 1.55, r * 1.65, 2.4, TAJ, x, y, z, 8));
  cyl(c.g, r * 1.75, r * 1.75, 0.3, TAJ_SHADE, x, y + 2.4, z, 8);
  const stage = (h - 2.7) / 3;
  let yy = y + 2.7, rr = r * 1.3;
  for (let s = 0; s < 3; s++) {
    const r2 = rr * 0.88, base = yy, bot = rr;
    surf(c, SURF.marble, () => cyl(c.g, r2, bot, stage, TAJ, x, base, z, 16));
    // Black inlay between the blocks: lines up the shaft, rings round it.
    for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; rod(c.g, new THREE.Vector3(x + Math.cos(a) * (rr + 0.01), yy, z + Math.sin(a) * (rr + 0.01)), new THREE.Vector3(x + Math.cos(a) * (r2 + 0.01), yy + stage, z + Math.sin(a) * (r2 + 0.01)), 0.035, INLAY_K, 3); }
    for (let q = 1; q < 4; q++) { const t = q / 4, rq = rr + (r2 - rr) * t + 0.015; c.g.add(new THREE.CylinderGeometry(rq, rq, 0.07, 16, 1, true), INLAY_K, M(x, yy + stage * t, z)); }
    yy += stage;
    // The balcony: corbels under a ring floor, a low parapet of posts round it.
    const rb = r2 + 0.75;
    for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; c.g.add(new THREE.BoxGeometry(0.22, 0.7, 0.8), TAJ, M(x + Math.cos(a) * (r2 + 0.35), yy - 0.45, z + Math.sin(a) * (r2 + 0.35), Math.PI / 2 - a)); }
    cyl(c.g, rb, rb - 0.2, 0.3, TAJ, x, yy - 0.1, z, 16);
    c.g.add(new THREE.CylinderGeometry(rb, rb, 0.2, 16, 1, true), TAJ, M(x, yy + 1.0, z));
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; cyl(c.g, 0.06, 0.06, 0.9, TAJ_SHADE, x + Math.cos(a) * rb, yy + 0.2, z + Math.sin(a) * rb, 4); }
    rr = r2 * 0.97;
  }
  chhatri8(c, x, yy + 0.2, z, r * 1.6);
}

/**
 * One main face of the tomb, on the plane z = s: a marble facing `d` proud of the core with the great
 * iwan opening through it and two stacked niches either side, the pishtaq's frame standing prouder
 * still round the iwan — calligraphy round the arch, rosettes in the spandrels, a jali and a door
 * at the back of the iwan under a muqarnas hood, carved flowers along the dado, kanguras along the top.
 */
function tajFace(c: Ctx, s: number, hw: number, d: number, wh: number, rnd: () => number): void {
  const PW = 8.3, PH = wh + 4, OW = 10, SH = 13, AH = 20;
  const NICHES = [[2.2, 6.5, 8.2], [11, 16.5, 18.2]] as const;
  const sh = iwanShape(hw, wh, PW, PH, OW, SH, AH);
  for (const sx of [-1, 1]) for (const [y0, s1, a1] of NICHES) sh.holes.push(archPath(new THREE.Path(), 2, y0, s1, a1, sx * 9.75));
  const f = slab(sh, d); f.translate(0, 0, s + d / 2);
  surf(c, SURF.marble, () => c.g.add(f, TAJ));
  const p = slab(iwanShape(PW, PH, 0, 0, OW, SH, AH), 0.3); p.translate(0, 0, s + d + 0.15);
  surf(c, SURF.marble, () => c.g.add(p, TAJ));
  const fz = s + d + 0.3;
  // The arch: a bead round it, a black line outside that; the calligraphy framing it; rosettes; a frieze above.
  archBead(c.g, OW + 0.3, 0, SH, AH + 0.2, fz, 0.14, TAJ_SHADE);
  moulding(c.g, archLine(OW + 1.2, SH, AH + 0.8, fz + 0.01), 0.05, INLAY_K);
  for (const sx of [-1, 1]) callig(c, sx * 6.5, 0.6, fz, 21.7, 0.9, true, rnd);
  callig(c, 0, 21.4, fz, 13.9, 0.9, false, rnd);
  for (const sx of [-1, 1]) rosette(c, sx * 4.5, 19.3, fz, 0.75);
  for (let x = -6; x <= 6; x += 2) rosette(c, x, 23.9, fz, 0.5);
  for (const sx of [-1, 1]) box(c.g, 0.08, 25.2, 0.04, INLAY_K, sx * 7.9, 0.4, fz + 0.02);
  box(c.g, 15.88, 0.08, 0.04, INLAY_K, 0, 25.6, fz + 0.02);
  kanguras(c, -PW, PW, PH, fz, TAJ);
  for (const sx of [-1, 1]) guldasta(c, sx * PW, s + d + 0.15, 0, PH, 0.35);
  // At the back of the iwan: the door, niches beside it, the jali over it, the muqarnas hood.
  archPanel(c.g, 3.6, 5.6, '#4a3222', 0, 0, s, 0, 0.1, true);
  for (let r = 0; r < 5; r++) for (let q = -1; q <= 1; q++) sphere(c.g, 0.06, GILT, q * 0.9, 0.8 + r * 1.0, s + 0.12, 4);
  archBead(c.g, 3.9, 0, 3.8, 5.9, s + 0.12, 0.1, TAJ_SHADE, 0, 0.7);
  for (const sx of [-1, 1]) for (const y of [0.8, 4.2]) { archPanel(c.g, 1.4, 2.6, TAJ_SHADE, sx * 3.4, y, s, 0, 0.05, true); inlayFlower(c, sx * 3.4, y + 0.3, s + 0.07, 1.6, TAJ); }
  jali(c, 0, 7, s, 3.4, 4.6);
  c.g.frame(0, SH + 0.1, s, 0, 1.6, () => muqarnas(c, 0, 0, 0, 5.6, 4, [TAJ, TAJ_SHADE]));
  // Either side of the pishtaq: the stacked niches (a jali in the upper, a carved plant in the lower), a dado of carved flowers.
  for (const sx of [-1, 1]) {
    const nx = sx * 9.75;
    jali(c, nx, 12.2, s, 1.2, 3.2);
    inlayFlower(c, nx, 2.8, s + 0.02, 2.4, TAJ_SHADE);
    for (const [y0, s1, a1] of NICHES) archBead(c.g, 2.2, y0, s1, a1 + 0.1, s + d + 0.02, 0.07, TAJ_SHADE, nx);
    inlayFlower(c, nx, 0.4, s + d + 0.02, 1.4, TAJ_SHADE);
    box(c.g, 3.5, 0.08, 0.06, INLAY_G, sx * 10.05, 2.0, s + d + 0.02);
    kanguras(c, Math.min(sx * PW, sx * hw), Math.max(sx * PW, sx * hw), wh, s + d, TAJ);
    guldasta(c, sx * hw, s + d, 0, wh, 0.45);
  }
}

/** A chamfered face of the tomb on the plane z = b: two great niches stacked, each with a jali under a muqarnas hood. */
function tajChamfer(c: Ctx, b: number, hw: number, d: number, wh: number): void {
  const NICHES = [[2.2, 7.8, 10.4], [12, 17.6, 20.2]] as const;
  const sh = new THREE.Shape();
  sh.moveTo(-hw, 0); sh.lineTo(hw, 0); sh.lineTo(hw, wh); sh.lineTo(-hw, wh); sh.lineTo(-hw, 0);
  for (const [y0, s1, a1] of NICHES) sh.holes.push(archPath(new THREE.Path(), 6, y0, s1, a1));
  const f = slab(sh, d); f.translate(0, 0, b + d / 2);
  surf(c, SURF.marble, () => c.g.add(f, TAJ));
  const fz = b + d;
  for (const [y0, s1, a1] of NICHES) {
    archBead(c.g, 6.3, y0, s1, a1 + 0.15, fz + 0.02, 0.1, TAJ_SHADE);
    jali(c, 0, y0 + 1.4, b, 2.4, 3.8);
    c.g.frame(0, s1 + 0.1, b, 0, 1.1, () => muqarnas(c, 0, 0, 0, 5, 3, [TAJ, TAJ_SHADE]));
    for (const sx of [-1, 1]) { rosette(c, sx * 3.7, a1 - 0.6, fz, 0.55); box(c.g, 0.06, a1 - y0 + 0.6, 0.04, INLAY_K, sx * 3.55, y0 - 0.25, fz + 0.02); }
    box(c.g, 7.16, 0.06, 0.04, INLAY_K, 0, a1 + 0.35, fz + 0.02);
  }
  for (const x of [-2.4, 0, 2.4]) inlayFlower(c, x, 0.3, fz + 0.02, 1.5, TAJ_SHADE);
  kanguras(c, -hw, hw, wh, fz, TAJ);
}

/** A red sandstone hall (the mosque, or its twin the jawab) facing +z: an arcade under three marble domes, a pishtaq in the middle, towers at the corners. */
function sandstoneHall(c: Ctx, rnd: () => number): void {
  const L = 26, H = 10;
  surf(c, SURF.ashlar, () => box(c.g, L, H, 6, SANDSTONE, 0, 0, -1.5));
  surf(c, SURF.flagstone, () => box(c.g, L, 0.22, 2.6, SAND_LIGHT, 0, 0, 2.7));
  box(c.g, L, 0.4, 2.8, SANDSTONE, 0, H - 0.4, 2.3); // the veranda's ceiling
  let xs: number[] = [];
  c.g.frame(0, 0, 3.5, 0, 1, () => { xs = arcade(c, L, H, 1, 5.2, 3.2, 5, SANDSTONE); });
  for (const x of xs) {
    archBead(c.g, 3.5, 0.2, 5, 5 + 3.2 * 0.72 + 0.15, 4.02, 0.1, TAJ, x);
    archPanel(c.g, 1.8, 3.6, '#8e3f22', x, 0.22, 1.5, 0, 0.06, true); // a niche on the back wall
    cyl(c.g, 0.02, 0.02, H - 0.4 - 4.2, '#3a2a22', x, 4.2, 2.3, 4);
    sphere(c.glow, 0.24, '#ffcf7a', x, 4.0, 2.3, 6, 1.3);
  }
  box(c.g, L, 0.18, 0.08, TAJ, 0, H - 0.8, 4.02);
  kanguras(c, -L / 2, L / 2, H, 4, TAJ);
  // The pishtaq, framed in white marble and calligraphy.
  const pg = slab(iwanShape(4.4, 13.5, 0, 0, 5.4, 7, 11), 0.8); pg.translate(0, 0, 4.4);
  surf(c, SURF.ashlar, () => c.g.add(pg, SANDSTONE));
  archBead(c.g, 5.7, 0.2, 7, 11.2, 4.82, 0.14, TAJ);
  for (const sx of [-1, 1]) callig(c, sx * 3.6, 0.6, 4.82, 12.1, 0.7, true, rnd);
  callig(c, 0, 11.9, 4.82, 7.9, 0.7, false, rnd);
  for (const sx of [-1, 1]) { rosette(c, sx * 2.9, 10.9, 4.82, 0.45); guldasta(c, sx * 4.4, 4.8, 0, 13.5, 0.3); }
  kanguras(c, -4.4, 4.4, 13.5, 4.8, TAJ);
  // Three marble domes on drums, a crescent on the middle one.
  for (const [x, r] of [[-8.5, 2.6], [0, 3.4], [8.5, 2.6]] as const) {
    cyl(c.g, r * 0.92, r * 0.92, 1.6, TAJ, x, H, -1.5, 20);
    c.g.add(new THREE.CylinderGeometry(r * 0.93, r * 0.93, 0.12, 20, 1, true), INLAY_K, M(x, H + 0.8, -1.5));
    bulb(c, x, H + 1.6, -1.5, r, TAJ, 24);
    if (x === 0) crescent(c, x, H + 1.6 + r * 1.6, -1.5, 0.9); else cone(c.g, 0.1, 1, GILT, x, H + 1.6 + r * 1.6, -1.5, 5);
  }
  // Octagonal towers at the corners, each crowned with a chhatri.
  for (const sx of [-1, 1]) for (const z of [-4.5, 4]) {
    cyl(c.g, 0.85, 0.95, H + 2, SANDSTONE, sx * 13.2, 0, z, 8);
    for (const y of [4, 8]) cyl(c.g, 1, 1, 0.2, TAJ, sx * 13.2, y, z, 8);
    chhatri8(c, sx * 13.2, H + 2, z, 1.1, SANDSTONE, TAJ);
  }
}

/** One face of the great gate, on the plane z0: the pishtaq with its iwan, stacked niches either side, eleven chhatris on top, a corner tower each end. */
function gateFace(c: Ctx, z0: number, gw: number, gh: number, rnd: () => number): void {
  const p = slab(iwanShape(8, gh + 2, 0, 0, 10, 9.5, 15.5), 1.2); p.translate(0, 0, z0 + 0.6);
  surf(c, SURF.ashlar, () => c.g.add(p, SANDSTONE));
  const fz = z0 + 1.22;
  archBead(c.g, 10.3, 0, 9.5, 15.7, fz, 0.15, TAJ);
  moulding(c.g, archLine(11.4, 9.5, 16.4, fz), 0.06, TAJ);
  for (const sx of [-1, 1]) { callig(c, sx * 6.3, 0.6, fz, 18, 0.9, true, rnd); rosette(c, sx * 4.4, 15.6, fz, 0.8); box(c.g, 0.25, 21.4, 0.06, TAJ, sx * 7.75, 0, fz); }
  callig(c, 0, 17.7, fz, 13.5, 0.9, false, rnd);
  box(c.g, 15.75, 0.25, 0.06, TAJ, 0, 21.3, fz);
  for (let k = 0; k < 11; k++) chhatri8(c, -7 + k * 1.4, gh + 2, z0 + 0.6, 0.6);
  // At the back of the iwan: a bead round the passage, a jali above it.
  archBead(c.g, 6.3, 0, 7, 11.2, z0 + 0.02, 0.12, TAJ);
  jali(c, 0, 11.6, z0, 2.4, 2.4);
  // The flanking bays: two storeys of arched niches outlined in white, string courses, a tower at the corner.
  for (const sx of [-1, 1]) {
    for (const y of [1, 10]) {
      const x = sx * 12.5;
      archPanel(c.g, 3.6, 6, '#8e3f22', x, y, z0, 0, 0.05, true);
      archBead(c.g, 3.8, y, y + 4.2, y + 6.35, z0 + 0.06, 0.09, TAJ, x, 0.7);
      inlayFlower(c, x, y + 0.6, z0 + 0.07, 2.2, TAJ);
    }
    for (const y of [9.3, gh - 0.5]) box(c.g, 9, 0.2, 0.2, TAJ, sx * 12.5, y, z0 + 0.05);
    kanguras(c, Math.min(sx * 8, sx * gw), Math.max(sx * 8, sx * gw), gh, z0, TAJ);
    cyl(c.g, 1.6, 1.8, gh + 2, SANDSTONE, sx * gw, 0, z0, 8);
    for (let y = 4; y < gh; y += 4) cyl(c.g, 1.85, 1.85, 0.2, TAJ, sx * gw, y, z0, 8);
    chhatri8(c, sx * gw, gh + 2, z0, 2.2, SANDSTONE, TAJ);
    // The gate's great doors, folded back against the passage walls, studded.
    box(c.g, 0.2, 6.5, 2.6, '#5a3a22', sx * 2.85, 0, z0 - 1.5);
    for (let r = 0; r < 5; r++) for (let q = 0; q < 3; q++) sphere(c.g, 0.07, GILT, sx * 2.72, 0.8 + r * 1.2, z0 - 2.4 + q * 0.8, 4);
  }
}

const mughal: Monument = (c, o) => {
  const rnd = () => c.rng.next();
  const TZ = -30, PH = 4; // the tomb's centre and the height of its marble plinth
  const at = (lx: number, lz: number, ry: number) => ({ x: lx * Math.cos(ry) + lz * Math.sin(ry), z: TZ - lx * Math.sin(ry) + lz * Math.cos(ry) });
  // ═══ The red sandstone forecourt, and on it the marble plinth: a blind arcade round its sides, a stair up the front. ═══
  surf(c, SURF.flagstone, () => box(c.g, 106, 0.2, 76, SAND_LIGHT, 0, 0, TZ));
  surf(c, SURF.marble, () => box(c.g, 70, PH, 70, TAJ, 0, 0, TZ));
  box(c.g, 71, 0.5, 71, TAJ_SHADE, 0, 0, TZ);
  box(c.g, 70.8, 0.35, 70.8, TAJ_SHADE, 0, PH - 0.35, TZ);
  for (let side = 0; side < 4; side++) c.g.frame(0, 0, TZ, (side * Math.PI) / 2, 1, () => {
    for (let k = 0; k < 20; k++) {
      const x = -33.25 + k * 3.5;
      if (side === 0 && Math.abs(x) < 5.5) continue;
      archPanel(c.g, 2.4, 2.4, TAJ_SHADE, x, 0.7, 35, 0, 0.06, true);
      inlayFlower(c, x, 0.95, 35.08, 1.2, TAJ);
    }
    for (const [y, col] of [[0.55, INLAY_G], [PH - 0.5, INLAY_R]] as const) box(c.g, 70.1, 0.1, 0.1, col, 0, y, 35.01);
  });
  for (let k = 0; k < 4; k++) {
    const y = (k + 1) * 0.8, z = TZ + 35 + 0.55 + (3 - k) * 1.1;
    surf(c, SURF.marble, () => box(c.g, 8.8, y, 1.1, TAJ, 0, 0, z));
    for (const sx of [-1, 1]) box(c.g, 0.6, y + 0.6, 1.1, TAJ_SHADE, sx * 4.7, 0, z);
    for (const x of [-2.8, 0, 2.8]) o.platforms.push({ x, z, r: 1.45, y });
  }
  o.platforms.push({ x: 0, z: TZ, r: 34, y: PH });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.platforms.push({ x: sx * 24, z: TZ + sz * 24, r: 11, y: PH });
  for (let side = 0; side < 4; side++) for (let t = -33; t <= 33; t += 3) {
    if (side === 0 && Math.abs(t) < 5) continue;
    o.colliders.push({ ...at(t, 33.1, (side * Math.PI) / 2), r: 1.9, h: PH - 0.2 });
  }
  for (const sx of [-1, 1]) for (const z of [6.2, 8.4]) o.colliders.push({ x: sx * 4.9, z, r: 0.6, h: PH + 0.6 });

  // ═══ The tomb: a chamfered square core, faced in marble with a great iwan on each face and stacked niches on each chamfer. ═══
  const S = 17.8, K = 6.5, WH = 22, D = 1.2;
  const B = (2 * S - K) / Math.SQRT2, MF = S - K + D * (Math.SQRT2 - 1), CF = (K * Math.SQRT2) / 2 + D * (Math.SQRT2 - 1);
  both(c, 0, PH, TZ, 0, () => {
    const core = new THREE.Shape();
    ([[-S + K, -S], [S - K, -S], [S, -S + K], [S, S - K], [S - K, S], [-S + K, S], [-S, S - K], [-S, -S + K]] as const).forEach(([x, y], i) => (i ? core.lineTo(x, y) : core.moveTo(x, y)));
    const cg = new THREE.ExtrudeGeometry(core, { depth: WH, bevelEnabled: false });
    cg.rotateX(-Math.PI / 2);
    surf(c, SURF.marble, () => c.g.add(cg, TAJ));
    for (let side = 0; side < 4; side++) both(c, 0, 0, 0, (side * Math.PI) / 2, () => {
      tajFace(c, S, MF, D, WH, rnd);
      both(c, 0, 0, 0, Math.PI / 4, () => tajChamfer(c, B, CF, D, WH));
    });
    // The drum, ringed with blind arches and black inlay, and the great bulb dome with its lotus and crescent.
    const DR = 10.4;
    surf(c, SURF.marble, () => cyl(c.g, DR, DR, 6.5, TAJ, 0, WH, 0, 32));
    cyl(c.g, DR + 0.6, DR + 0.6, 0.4, TAJ_SHADE, 0, WH, 0, 32);
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; c.g.frame(Math.cos(a) * DR, WH, Math.sin(a) * DR, Math.PI / 2 - a, 1, () => archPanel(c.g, 1.4, 3.2, TAJ_SHADE, 0, 1.3, -0.05, 0, 0.1, true)); }
    for (const y of [WH + 0.9, WH + 5.4]) c.g.add(new THREE.CylinderGeometry(DR + 0.02, DR + 0.02, 0.12, 32, 1, true), INLAY_K, M(0, y, 0));
    cyl(c.g, DR + 0.3, DR + 0.5, 0.5, TAJ_SHADE, 0, WH + 6.5, 0, 32);
    bulb(c, 0, WH + 7, 0, 11.2, TAJ, 40);
    crescent(c, 0, WH + 7 + 11.2 * 1.62, 0, 3.5);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) chhatri8(c, sx * 11.8, WH, sz * 11.8, 3);
    // Four minarets at the plinth's corners.
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) minaret(c, sx * 31, 0, sz * 31, 36, 1.4);
  });
  o.colliders.push({ x: 0, z: TZ, r: 18.2, h: 60 });
  for (let side = 0; side < 4; side++) {
    const a = (side * Math.PI) / 2;
    for (const lx of [-10.2, -7.1, 7.1, 10.2]) o.colliders.push({ ...at(lx, 18.6, a), r: 1.6, h: 60 });
    for (const lx of [-3, 0, 3]) o.colliders.push({ ...at(lx, B + D - 1.7, a + Math.PI / 4), r: 1.7, h: 60 });
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.colliders.push({ x: sx * 31, z: TZ + sz * 31, r: 2.4, h: 50 });

  // ═══ The mosque and its twin, the jawab, either side of the plinth, facing the tomb. ═══
  for (const sx of [-1, 1]) {
    both(c, sx * 46, 0, TZ, -sx * Math.PI / 2, () => sandstoneHall(c, rnd));
    for (let t = -12; t <= 12; t += 4) o.colliders.push({ x: sx * 46, z: TZ + t, r: 4.8, h: 13 });
  }

  // ═══ The charbagh: four channels from a raised marble tank, walks of red sandstone, sunken beds of roses. ═══
  waterPool(c, 0, 0, 44, 11, 11, 0, { stone: TAJ, kerb: 0.9, speed: 0.12, jets: 1, jetHeight: 2.4 });
  o.colliders.push({ x: 0, z: 44, r: 6.2, h: 1 });
  for (const [x, z, len, ry, jets] of [[0, 25, 27, 0, 2], [0, 68.5, 38, Math.PI, 3], [27, 44, 43, -Math.PI / 2, 0], [-27, 44, 43, Math.PI / 2, 0]] as const) {
    waterChannel(c, x, 0, z, len, 3.2, ry, { stone: TAJ, flow: [0, -1], speed: 0.55, jets, jetHeight: 1.2 });
  }
  const walk = (x: number, z: number, w: number, d: number) => {
    surf(c, SURF.flagstone, () => box(c.g, w, 0.18, d, SAND_LIGHT, x, 0, z));
    const n = Math.floor(Math.max(w, d) / 3);
    for (let k = 0; k < n; k++) { const t = -Math.max(w, d) / 2 + 1.5 + k * 3; cyl(c.g, 0.35, 0.35, 0.03, TAJ, x + (w > d ? t : 0), 0.18, z + (w > d ? 0 : t), 8); }
  };
  for (const sx of [-1, 1]) { walk(sx * 3.5, 24, 2.6, 27); walk(sx * 3.5, 70, 2.6, 39); }
  for (const sz of [-1, 1]) for (const sx of [-1, 1]) walk(sx * 27.5, 44 + sz * 3.5, 41, 2.6);
  // Sixteen beds: a clipped hedge round a lawn, rose bushes in rows, an orange tree in the middle.
  const bed = (bx: number, bz: number, w: number, d: number) => {
    box(c.g, w, 0.2, d, '#5f9a44', bx, 0, bz);
    for (const [x, z, bw, bd] of [[bx, bz - d / 2, w, 0.4], [bx, bz + d / 2, w, 0.4], [bx - w / 2, bz, 0.4, d], [bx + w / 2, bz, 0.4, d]]) box(c.g, bw, 0.6, bd, '#2f6a32', x, 0, z);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 3; j++) {
      if (i === 2 && j === 1) continue;
      const x = bx - w / 2 + 1.6 + i * ((w - 3.2) / 4), z = bz - d / 2 + 1.6 + j * ((d - 3.2) / 2);
      sphere(c.g, 0.45, '#3f7a3a', x, 0.4, z, 6, 0.8);
      for (let f = 0; f < 4; f++) sphere(c.g, 0.13, ['#d1284a', '#ff6b8b', '#ffffff', '#ff9ab0'][(i + j + f) % 4], x + Math.cos(f * 1.6) * 0.35, 0.72, z + Math.sin(f * 1.6) * 0.35, 5);
    }
    tree(c.g, 'orange', bx, 0.2, bz, 1.0, rnd);
  };
  for (const sx of [-1, 1]) for (const bx of [16, 36]) {
    for (const bz of [17, 32]) bed(sx * bx, bz, 17, 13);
    for (const bz of [57, 75]) bed(sx * bx, bz, 17, 15);
  }
  // Cypresses down the long walk, marble lamp pillars at the tank's corners, lamps afloat on the channel.
  for (let z = 12; z < 88; z += 6.5) {
    if (Math.abs(z - 44) < 8) continue;
    for (const x of [-5.8, 5.8]) tree(c.g, 'cypress', x, 0, z, 1.2, rnd);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const x = sx * 7.8, z = 44 + sz * 7.8;
    box(c.g, 0.9, 0.3, 0.9, TAJ_SHADE, x, 0, z);
    cyl(c.g, 0.25, 0.3, 1.5, TAJ, x, 0.3, z, 8);
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; cyl(c.g, 0.04, 0.04, 0.5, TAJ, x + Math.cos(a) * 0.22, 1.8, z + Math.sin(a) * 0.22, 4); }
    sphere(c.glow, 0.14, '#ffcf7a', x, 2.0, z, 6, 1.4);
    bulb(c, x, 2.3, z, 0.3, TAJ, 10);
  }
  for (const z of [14, 21, 30, 35, 55, 62, 72, 80]) sphere(c.glow, 0.25, '#fff0c0', 0, 0.55, z, 5);

  // ═══ The great gate: red sandstone framed in white marble, an iwan on each face, a passage right through. ═══
  const GZ = 96, GW = 17, GH = 20, GD = 12;
  both(c, 0, 0, GZ, 0, () => {
    const body = slab(iwanShape(GW, GH, 0, 0, 6, 7, 11), GD);
    surf(c, SURF.ashlar, () => c.g.add(body, SANDSTONE));
    for (const ry of [0, Math.PI]) both(c, 0, 0, 0, ry, () => gateFace(c, GD / 2, GW, GH, rnd));
    cyl(c.g, 0.03, 0.03, 1.6, '#3a2a22', 0, 9.4, 0, 4);
    sphere(c.glow, 0.4, '#ffcf7a', 0, 9.1, 0, 8, 1.3);
  });
  for (const sx of [-1, 1]) {
    for (const x of [5.2, 9, 13]) for (const dz of [-4.5, 0, 4.5]) o.colliders.push({ x: sx * x, z: GZ + dz, r: 2.2, h: GH + 2 });
    for (const sz of [-1, 1]) { o.colliders.push({ x: sx * 6.6, z: GZ + sz * 6.6, r: 1.5, h: GH + 2 }, { x: sx * GW, z: GZ + sz * GD / 2, r: 2.2, h: GH + 4 }); }
  }
  o.height = PH + WH + 7 + 11.2 * 1.64 + 7;
};

// ───────────────────────────── the rebuilt monuments ─────────────────────────────

export const MONUMENTS: Partial<Record<RegionId, Monument>> = { japan, korea, china, norway, switzerland, london, newyork, indianorth, renaissance, indiasouth, islamic, vintage, middleeast, egypt, desert, indonesia, aurora, skyisles, mughal, meadow };
