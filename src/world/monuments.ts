import * as THREE from 'three';
import type { Ctx, LandmarkOut } from './architecture';
import { fountainJet, waterPool } from './flowWater';
import { M, archPanel, box, cone, cyl, sphere, sweptRoof, tree } from './kit';
import type { RegionId } from './regions';
import { SURF } from './surfaces';

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
    for (let side = 0; side < 4; side++) c.g.frame(0, y, 0, (side * Math.PI) / 2, 1, () => {
      for (let k = 0; k < 4; k++) cyl(c.g, 0.2, 0.22, body, red, -hw + (k * w) / 3, 0, hw - 0.12, 10);
      for (const yy of [0.25, body - 0.35]) box(c.g, w + 0.1, 0.32, 0.26, red, 0, yy, hw - 0.05); // nageshi
      // The middle bay: studded double doors below, a panel above.
      box(c.g, w / 3 - 0.5, body - 0.9, 0.08, i === 0 ? '#7a2a1e' : '#8a5a3a', 0, 0.55, hw - 0.1);
      if (i === 0) for (let r = 0; r < 5; r++) for (let q = 0; q < 4; q++) sphere(c.g, 0.05, '#d4af37', -0.6 + q * 0.4, 0.95 + r * 0.55, hw - 0.04, 4);
      box(c.g, 0.04, body - 0.9, 0.1, dark, 0, 0.55, hw - 0.06);
      // The side bays: green lattice windows (renji-mado).
      for (const sx of [-1, 1]) {
        const cx = sx * w / 3;
        box(c.g, w / 3 - 0.8, body * 0.45, 0.06, '#2f5a44', cx, body * 0.3, hw - 0.11);
        for (let b = 0; b < 7; b++) box(c.g, 0.06, body * 0.45, 0.08, '#3f7a5a', cx - (w / 3 - 0.9) / 2 + (b * (w / 3 - 0.9)) / 6, body * 0.3, hw - 0.07);
        box(c.glow, w / 3 - 0.9, body * 0.4, 0.02, '#ffd9a0', cx, body * 0.32, hw - 0.14);
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
    c.g.frame(0, y0, 0, (side * Math.PI) / 2, 1, () => {
      for (let k = 0; k <= n; k++) cyl(c.g, 0.3, 0.33, h, red, -len / 2 + (k * len) / n, 0, half, 12);
      // Lattice doors in every bay: a red frame, papered panels, a green grid over them.
      for (let k = 0; k < n; k++) {
        const x = -len / 2 + ((k + 0.5) * len) / n, bw = len / n - 0.7;
        box(c.g, bw, h - 1.1, 0.12, red, x, 0.25, half - 0.05);
        box(c.g, bw - 0.3, h - 1.5, 0.04, paper, x, 0.45, half + 0.02);
        box(c.glow, bw - 0.4, h - 1.6, 0.02, '#ffe6b0', x, 0.5, half - 0.1);
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
  for (const sx of [-1, 1]) c.g.frame(sx * 6, y0, 14, 0, 1, () => {
    for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; cyl(c.g, 0.1, 0.14, 0.9, '#4a4a3a', Math.cos(a) * 0.6, 0, Math.sin(a) * 0.6, 6); }
    c.g.add(new THREE.SphereGeometry(0.9, 14, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#5a5a44', M(0, 1.6, 0));
    c.g.add(new THREE.TorusGeometry(0.9, 0.08, 5, 18), '#6a6a52', M(0, 1.6, 0, 0, 1, 1, 1, Math.PI / 2, 0));
    for (const sz of [-1, 1]) c.g.add(new THREE.TorusGeometry(0.25, 0.06, 4, 10), '#6a6a52', M(0, 1.9, sz * 0.9));
    cyl(c.g, 0.5, 0.7, 0.8, '#5a5a44', 0, 1.6, 0, 12); cone(c.g, 0.55, 0.7, '#6a6a52', 0, 2.4, 0, 12);
    sphere(c.glow, 0.2, '#ff9a4a', 0, 1.75, 0, 6);
  });
  o.colliders.push({ x: 0, z: 0, r: 11, h: tip + 4 }, { x: -6, z: 14, r: 1, h: y0 + 3 }, { x: 6, z: 14, r: 1, h: y0 + 3 });
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
  const bays = Math.round((x1 - x0) / 3.75);
  for (let b = 0; b <= bays; b++) {
    const x = x0 + (b * (x1 - x0)) / bays;
    box(c.g, 0.7, ph + 1, 0.6, dark, x, 0, zf + 0.3); // buttress
    pinnacle(c, x, ph + 1, zf + 0.3, 3, dark);
    if (b < bays) {
      const cx = x + (x1 - x0) / bays / 2;
      if (Math.abs(cx) < 2.5) continue; // the porch stands there
      for (const [y, h] of [[1.4, 3.4], [6.4, 3.6], [11.4, 3.4]] as const) gothicWindow(c, cx, y, zf + 0.02, 1.7, h, dark);
      // A band of blind tracery between the storeys.
      for (const y of [5.3, 10.3]) for (let k = -2; k <= 2; k++) archPanel(c.g, 0.45, 0.8, dark, cx + k * 0.6, y, zf + 0.04, 0, 0.05, true);
    }
  }
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
    for (let y = 12; y < 42; y += 6.5) for (const x of [-2.6, 0, 2.6]) gothicWindow(c, x, y, 5.51, 1.2, 4, dark);
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
      }));
    }
    c.g.add(new THREE.ConeGeometry(7.6, 3.2, 8).rotateY(Math.PI / 8), MARBLE, M(0, 15.6, 0));
    cyl(c.g, 1.1, 1.2, 1.6, MARBLE, 0, 17, 0, 8); cone(c.g, 1.2, 1.4, MARBLE, 0, 18.6, 0, 8); sphere(c.g, 0.3, gold, 0, 20.2, 0, 8);
  }));
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
function arcade(c: Ctx, len: number, h: number, depth: number, bay: number, open: number, spring: number, col: string): number[] {
  const n = Math.floor(len / bay), xs: number[] = [];
  const sh = new THREE.Shape();
  sh.moveTo(-len / 2, 0);
  for (let k = 0; k < n; k++) {
    const x = -len / 2 + bay * (k + 0.5);
    xs.push(x);
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

const islamic: Monument = (c, o) => {
  const white = '#f4efe4', blue = '#2f7f9f', deep = '#1f4f7a', gold = '#d4af37', zel = ['#2f7f9f', '#f4efe4', '#1f4f7a', '#3a9a7a'];
  // ── The courtyard (sahn): arcades on three sides under rows of small domes, the gateway in the south arcade.
  const S = 30, N = -4, E = 26;
  surf(c, SURF.flagstone, () => box(c.g, 2 * E, 0.18, S - N, '#e8e0d0', 0, 0, (S + N) / 2));
  const riwaq = (len: number, bayXs: (xs: number[]) => void) => { const xs = arcade(c, len, 6, 0.9, 4, 2.8, 3.2, white); bayXs(xs); };
  const sides: Array<[number, number, number, number]> = [[0, S, Math.PI, 2 * E], [-E, (S + N) / 2, Math.PI / 2, S - N], [E, (S + N) / 2, -Math.PI / 2, S - N]];
  for (const [x, z, ry, len] of sides) c.g.frame(x, 0, z, ry, 1, () => c.glow.frame(x, 0, z, ry, 1, () => riwaq(len, (xs) => {
    // Behind the arches: the back wall, the roof, and a little dome over every bay; zellige round the arch feet.
    surf(c, SURF.plaster, () => { box(c.g, len, 6.6, 0.8, white, 0, 0, -5); box(c.g, len, 0.5, 5.8, white, 0, 6, -2.4); });
    for (const bx of xs) {
      c.g.add(new THREE.SphereGeometry(1.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), white, M(bx, 6.5, -2.4));
      cone(c.g, 0.05, 0.5, gold, bx, 7.95, -2.4, 5);
      for (let q = 0; q < 6; q++) box(c.g, 0.34, 0.9, 0.05, zel[q % 4], bx - 1.4 - 0.18 + q * 0.035, 0, 0.47); // dado
      c.g.add(new THREE.TorusGeometry(1.45, 0.1, 4, 14, Math.PI), blue, M(bx, 3.2, 0.47));
      box(c.glow, 2.4, 3, 0.04, '#ffe6b0', bx, 0.4, -4.55); // lamplit back wall seen through the arch
    }
    box(c.g, len, 0.45, 0.2, blue, 0, 5.3, 0.5); // a tiled frieze
    for (let q = 0; q < len / 0.6; q++) box(c.g, 0.3, 0.5, 0.3, white, -len / 2 + 0.3 + q * 0.6, 6.5, 0.2); // merlons
  })));
  for (let x = -E + 2; x <= E - 2; x += 4) if (Math.abs(x) > 3) o.colliders.push({ x, z: S - 0.2, r: 0.8, h: 7 }, { x, z: S + 5, r: 0.8, h: 7 });
  for (const sx of [-1, 1]) for (let z = N + 2; z <= S - 2; z += 4) o.colliders.push({ x: sx * (E - 0.2), z, r: 0.8, h: 7 }, { x: sx * (E + 5), z, r: 0.8, h: 7 });
  // The gateway: a tall portal (pishtaq) on the outer side of the south arcade, its arch open through.
  c.g.frame(0, 0, S + 5.4, 0, 1, () => {
    const g2 = new THREE.Shape();
    g2.moveTo(-5, 0); g2.lineTo(-1.9, 0); g2.lineTo(-1.9, 4.4); g2.quadraticCurveTo(-1.9, 6.4, 0, 7.2); g2.quadraticCurveTo(1.9, 6.4, 1.9, 4.4); g2.lineTo(1.9, 0); g2.lineTo(5, 0); g2.lineTo(5, 11); g2.lineTo(-5, 11); g2.lineTo(-5, 0);
    surf(c, SURF.plaster, () => c.g.add(new THREE.ExtrudeGeometry(g2, { depth: 1.4, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.7), white));
    box(c.g, 8.8, 0.6, 0.2, gold, 0, 9, 0.72); // the gold band over the arch
    for (let k = 0; k < 12; k++) box(c.g, 0.6, 0.6, 0.06, zel[k % 4], -4.1 + (k % 6) * 1.64, 7.6 + Math.floor(k / 6) * 0.7, 0.72, Math.PI / 4);
    for (const sx of [-1, 1]) { cyl(c.g, 0.5, 0.6, 13, white, sx * 5, 0, 0.3, 12); c.g.add(new THREE.SphereGeometry(0.6, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), blue, M(sx * 5, 13, 0.3)); crescent(c, sx * 5, 13.5, 0.3, 0.6); }
    for (let k = 0; k < 11; k++) box(c.g, 0.5, 0.7, 0.4, white, -5 + k, 11, 0);
  });
  // ── The reflecting pool down the middle, and the ablution fountain (shadirvan) under its own dome.
  waterPool(c, 0, 0, 10, 7, 13, 0, { stone: '#e8dcc6', kerb: 0.5, speed: 0.06 });
  for (const z of [4.5, 15.5]) fountainJet(c, 0, 0.38, z, 0.7);
  c.g.frame(0, 0, 23, 0, 1, () => c.glow.frame(0, 0, 23, 0, 1, () => {
    surf(c, SURF.marble, () => cyl(c.g, 2.6, 2.7, 0.8, white, 0, 0, 0, 8));
    cyl(c.g, 2.4, 2.4, 0.05, '#4aa0c0', 0, 0.72, 0, 8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cyl(c.g, 0.16, 0.18, 4, white, Math.cos(a) * 3.2, 0, Math.sin(a) * 3.2, 8); cyl(c.glow, 0.03, 0.05, 0.6, '#dff6ff', Math.cos(a) * 1.4, 0.8, Math.sin(a) * 1.4, 4); }
    cyl(c.g, 3.6, 3.6, 0.5, white, 0, 4, 0, 8);
    c.g.add(new THREE.SphereGeometry(3.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), blue, M(0, 4.5, 0));
    crescent(c, 0, 7.8, 0, 0.8);
  }));
  o.colliders.push({ x: 0, z: 23, r: 3.8, h: 9 });
  // ── The prayer hall: a portico of domed bays across its front, the great pishtaq in the middle.
  const hz0 = -34, hz1 = N, HH = 16;
  surf(c, SURF.plaster, () => box(c.g, 60, HH, hz1 - hz0, white, 0, 0, (hz0 + hz1) / 2));
  c.g.frame(0, 0, hz1 + 0.5, 0, 1, () => c.glow.frame(0, 0, hz1 + 0.5, 0, 1, () => {
    const xs = arcade(c, 60, 8, 1, 5, 3.4, 3.8, white);
    for (const bx of xs) {
      if (Math.abs(bx) < 5) continue;
      archPanel(c.glow, 2, 3.4, '#ffe6b0', bx, 0.3, -0.52, 0, 0.04, true);
      c.g.add(new THREE.TorusGeometry(1.75, 0.12, 4, 14, Math.PI), blue, M(bx, 3.8, 0.52));
    }
    box(c.g, 60, 0.6, 0.3, blue, 0, 7.2, 0.55);
    box(c.g, 60, 0.18, 0.32, gold, 0, 7.9, 0.55);
    // The pishtaq: a tall frame round a deep pointed niche stepped in tiers (muqarnas), the doors glowing at its foot.
    box(c.g, 12, 22, 2.4, white, 0, 0, 0.8);
    archPanel(c.g, 8, 17, '#e8e0d0', 0, 0, 2.02, 0, 0.1, true);
    for (let k = 0; k < 6; k++) archPanel(c.g, 7.4 - k * 1.1, 16 - k * 1.3, k % 2 ? '#dcd2c0' : '#ece4d4', 0, 0, 2.06 + k * 0.03, 0, 0.1, true);
    archPanel(c.glow, 3.2, 5.4, '#ffe6b0', 0, 0, 2.3, 0, 0.05, true);
    box(c.g, 11.2, 0.7, 0.1, gold, 0, 19.2, 2.05);
    for (let k = 0; k < 14; k++) box(c.g, 0.7, 0.7, 0.06, zel[k % 4], -5.2 + k * 0.8, 20.4, 2.05, Math.PI / 4);
    for (const sx of [-1, 1]) { cyl(c.g, 0.4, 0.45, 24, white, sx * 6, 0, 2, 12); cone(c.g, 0.5, 1.6, blue, sx * 6, 24, 2, 12); }
  }));
  // The domes: the great dome on a windowed drum, half-domes cascading from it east and west, small domes at the corners.
  const dz = -19, DR = 11;
  cyl(c.g, DR + 0.4, DR + 0.4, 5, white, 0, HH, dz, 16);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; archPanel(c.glow, 1.3, 2.8, '#ffe6b0', Math.sin(a) * (DR + 0.42), HH + 1, dz + Math.cos(a) * (DR + 0.42), a, 0.04, true); box(c.g, 0.8, 5.4, 1, white, Math.sin(a + 0.2) * (DR + 0.6), HH, dz + Math.cos(a + 0.2) * (DR + 0.6), a); }
  surf(c, SURF.glazed, () => c.g.add(new THREE.SphereGeometry(DR, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), blue, M(0, HH + 5, dz, 0, 1, 1.1, 1)));
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; const pts: THREE.Vector3[] = []; for (let k = 0; k <= 8; k++) { const t = (k / 8) * (Math.PI / 2) * 0.95; pts.push(new THREE.Vector3(Math.sin(a) * Math.cos(t) * (DR + 0.06), HH + 5 + Math.sin(t) * DR * 1.1 + 0.05, dz + Math.cos(a) * Math.cos(t) * (DR + 0.06))); } c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.09, 3), gold); }
  crescent(c, 0, HH + 5 + DR * 1.1, dz, 2);
  for (const sx of [-1, 1]) {
    surf(c, SURF.glazed, () => c.g.add(new THREE.SphereGeometry(7, 20, 10, 0, Math.PI, 0, Math.PI / 2).rotateY(sx > 0 ? 0 : Math.PI), blue, M(sx * DR, HH, dz)));
    for (const z of [hz0 + 6, hz1 - 6]) { cyl(c.g, 3.4, 3.4, 1.6, white, sx * 22, HH, z, 12); c.g.add(new THREE.SphereGeometry(3.2, 14, 7, 0, Math.PI * 2, 0, Math.PI / 2), blue, M(sx * 22, HH + 1.6, z)); crescent(c, sx * 22, HH + 4.8, z, 0.7); }
  }
  // ── Four pencil minarets at the corners, each with two balconies on corbels and a pointed cap.
  for (const [x, z] of [[-33, -36], [33, -36], [-33, 34], [33, 34]] as const) {
    surf(c, SURF.plaster, () => box(c.g, 3.4, 7, 3.4, white, x, 0, z));
    cyl(c.g, 1.4, 1.6, 34, white, x, 7, z, 16);
    for (const by of [22, 33]) {
      for (let k = 0; k < 3; k++) cyl(c.g, 1.6 + k * 0.35, 1.5 + k * 0.35, 0.35, k % 2 ? blue : white, x, by - 1.2 + k * 0.35, z, 16);
      cyl(c.g, 2.7, 2.7, 0.25, white, x, by, z, 16);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; cyl(c.g, 0.05, 0.05, 1, gold, x + Math.cos(a) * 2.6, by + 0.25, z + Math.sin(a) * 2.6, 4); sphere(c.glow, 0.1, '#ffe6b0', x + Math.cos(a) * 2.6, by + 1.3, z + Math.sin(a) * 2.6, 4); }
      c.g.add(new THREE.TorusGeometry(2.6, 0.05, 4, 32), gold, M(x, by + 1.25, z, 0, 1, 1, 1, Math.PI / 2, 0));
    }
    cyl(c.g, 1.1, 1.3, 6, white, x, 41, z, 16);
    surf(c, SURF.glazed, () => cone(c.g, 1.4, 8, deep, x, 47, z, 16));
    crescent(c, x, 55, z, 0.9);
    o.colliders.push({ x, z, r: 2.6, h: 58 });
  }
  // Colliders for the hall.
  for (const x of [-22, -11, 0, 11, 22]) o.colliders.push({ x, z: -19, r: 10.5, h: HH + 17 });
  o.height = 58;
};

// ───────────────────────────── the rebuilt monuments ─────────────────────────────

export const MONUMENTS: Partial<Record<RegionId, Monument>> = { japan, korea, china, norway, switzerland, london, newyork, indianorth, renaissance, indiasouth, islamic };
