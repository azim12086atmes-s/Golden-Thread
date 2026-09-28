import * as THREE from 'three';
import type { Ctx } from './architecture';
import { M, archPanel, box, cone, cyl, sphere } from './kit';

/**
 * The parts monuments are made of, at monument scale — the same care the houses get (their tiled
 * dados, carved bands, grilled windows, studded doors), gathered as components so every monument
 * can be dressed in its own place's craft: zellige star fields, alternating-stone arches,
 * muqarnas hoods, sebka nets, carved stucco, merlons, star-panelled doors, pierced lanterns,
 * trees in tiled planters. Each draws on the +z face of the current frame unless it says so.
 */

/** A field of eight-point zellige stars on a ground colour, w × h, bottom centre (x, y) on the plane z. */
export function zellige(c: Ctx, x: number, y: number, z: number, w: number, h: number, cols: string[], cell = 0.5): void {
  box(c.g, w, h, 0.03, cols[0], x, y, z);
  const nx = Math.max(1, Math.floor(w / cell)), ny = Math.max(1, Math.floor(h / cell));
  const cw = w / nx, ch = h / ny, s = Math.min(cw, ch) * 0.52;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const cx = x - w / 2 + cw * (i + 0.5), cy = y + ch * (j + 0.5), col = cols[1 + ((i + j) % (cols.length - 1))];
    for (const rz of [0, Math.PI / 4]) c.g.add(new THREE.BoxGeometry(s, s, 0.02), col, M(cx, cy, z + 0.025, 0, 1, 1, 1, 0, rz));
    c.g.add(new THREE.BoxGeometry(s * 0.34, s * 0.34, 0.02), cols[0], M(cx, cy, z + 0.04, 0, 1, 1, 1, 0, Math.PI / 4));
    // The little crosses where four stars meet.
    if (i < nx - 1 && j < ny - 1) c.g.add(new THREE.BoxGeometry(s * 0.28, s * 0.28, 0.02), cols[cols.length - 1], M(cx + cw / 2, cy + ch / 2, z + 0.03, 0, 1, 1, 1, 0, Math.PI / 4));
  }
}

/** A band of zellige along x (a dado or frieze), `len` long, `h` tall. */
export function zelligeBand(c: Ctx, len: number, y: number, z: number, h: number, cols: string[]): void {
  zellige(c, 0, y, z, len, h, cols, h * 0.9);
  box(c.g, len, 0.08, 0.08, cols[cols.length - 1], 0, y + h, z + 0.02);
}

/**
 * An arch of voussoirs in alternating colours (as at Córdoba), a horseshoe when `horseshoe` — the
 * ring turning in below the springing. Centre (x, spring), radius r, on the plane z.
 */
export function voussoirs(c: Ctx, x: number, spring: number, z: number, r: number, depth: number, cols: [string, string], horseshoe = true, n = 17): void {
  const a0 = horseshoe ? -0.35 : 0, a1 = Math.PI - a0, t = r * 0.28;
  for (let i = 0; i < n; i++) {
    const a = a0 + ((i + 0.5) / n) * (a1 - a0), len = ((a1 - a0) / n) * (r + t / 2) * 0.96;
    c.g.add(new THREE.BoxGeometry(len, t, depth), cols[i % 2], M(x + Math.cos(a) * (r + t / 2), spring + Math.sin(a) * (r + t / 2), z, 0, 1, 1, 1, 0, a - Math.PI / 2));
  }
}

/** A muqarnas hood over a niche: tiers of little pointed cells stepping out and up, w wide at the bottom, at (x, y) on the plane z. */
export function muqarnas(c: Ctx, x: number, y: number, z: number, w: number, tiers: number, cols: string[]): void {
  for (let t = 0; t < tiers; t++) {
    const n = Math.max(1, Math.round((w / 0.9) * (1 - t / (tiers + 1)))), tw = w * (1 - (t * 0.55) / tiers), cw = tw / n;
    for (let i = 0; i < n; i++) {
      const cx = x - tw / 2 + cw * (i + 0.5);
      archPanel(c.g, cw * 0.86, 0.62, cols[(t + i) % cols.length], cx, y + t * 0.52, z + t * 0.22, 0, 0.18, true);
      box(c.g, cw, 0.08, 0.26, cols[0], cx, y + t * 0.52 - 0.04, z + t * 0.22 + 0.04);
    }
  }
}

/** A sebka net: a panel of interlaced lozenges in relief, w × h at bottom centre (x, y) on the plane z. */
export function sebka(c: Ctx, x: number, y: number, z: number, w: number, h: number, col: string, cell = 1.1): void {
  const nx = Math.max(1, Math.round(w / cell)), ny = Math.max(1, Math.round(h / (cell * 1.4)));
  const cw = w / nx, ch = h / ny, side = Math.hypot(cw / 2, ch / 2), ang = Math.atan2(ch, cw);
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const cx = x - w / 2 + cw * (i + 0.5), cy = y + ch * (j + 0.5);
    for (const [sx, sy] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
      c.g.add(new THREE.BoxGeometry(side, 0.09, 0.08), col, M(cx + (sx * cw) / 4, cy + (sy * ch) / 4, z + 0.04, 0, 1, 1, 1, 0, sx * sy > 0 ? -ang : ang));
    }
  }
}

/** A band of carved stucco: a row of little pointed niches over a line of dentils, `len` long along x. */
export function stucco(c: Ctx, len: number, y: number, z: number, col: string, shade: string): void {
  box(c.g, len, 0.9, 0.08, col, 0, y, z);
  const n = Math.round(len / 0.45);
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    archPanel(c.g, 0.26, 0.5, shade, x, y + 0.3, z + 0.05, 0, 0.04, true);
    box(c.g, 0.16, 0.14, 0.1, col, x, y + 0.08, z + 0.06);
  }
  box(c.g, len, 0.1, 0.14, col, 0, y + 0.86, z + 0.05);
}

/** A row of stepped merlons along x on top of a wall at height y (the wall face at z). */
export function merlonRow(c: Ctx, len: number, y: number, z: number, col: string, step = 1.1, stepped = true): void {
  const n = Math.max(1, Math.round(len / step));
  for (let i = 0; i < n; i++) {
    const x = -len / 2 + (i + 0.5) * (len / n);
    box(c.g, step * 0.55, 0.7, 0.5, col, x, y, z);
    if (stepped) { box(c.g, step * 0.34, 0.35, 0.5, col, x, y + 0.7, z); cone(c.g, step * 0.12, 0.3, col, x, y + 1.05, z, 4, Math.PI / 4); }
  }
}

/** A great door: two leaves covered in a star pattern of applied battens, bronze studs, a frame, bottom centre (x, y) on the plane z. */
export function starDoor(c: Ctx, x: number, y: number, z: number, w: number, h: number, wood: string, bronze = '#b8923a'): void {
  box(c.g, w + 0.3, h + 0.2, 0.12, '#3a2418', x, y, z);
  for (const s of [-1, 1]) {
    const lx = x + (s * w) / 4;
    box(c.g, w / 2 - 0.06, h, 0.1, wood, lx, y, z + 0.08);
    const n = Math.max(2, Math.round(w / 1.1)), m = Math.max(3, Math.round(h / 1.1)), cw = (w / 2 - 0.2) / n, ch = (h - 0.4) / m;
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
      const cx = lx - (w / 2 - 0.2) / 2 + cw * (i + 0.5), cy = y + 0.2 + ch * (j + 0.5), st = Math.min(cw, ch) * 0.5;
      for (const rz of [0, Math.PI / 4]) c.g.add(new THREE.BoxGeometry(st, st, 0.03), '#5a3a26', M(cx, cy, z + 0.15, 0, 1, 1, 1, 0, rz));
      sphere(c.g, st * 0.16, bronze, cx, cy, z + 0.18, 5);
    }
    box(c.g, 0.1, 0.34, 0.1, bronze, x + s * 0.2, y + h * 0.45, z + 0.2); // the knocker plates
  }
}

/** A pierced brass lantern (Moroccan) hanging from a chain: cap, glowing star-pierced body, drip finial. */
export function brassLantern(c: Ctx, x: number, y: number, z: number, s = 1, glowCol = '#ffcf7a'): void {
  const brass = '#c9a24a';
  cyl(c.g, 0.015 * s, 0.015 * s, 0.6 * s, '#5a4a2a', x, y - 0.6 * s, z, 3);
  cone(c.g, 0.2 * s, 0.3 * s, brass, x, y - 0.9 * s, z, 8);
  cyl(c.glow, 0.17 * s, 0.14 * s, 0.5 * s, glowCol, x, y - 1.4 * s, z, 8);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; cyl(c.g, 0.012 * s, 0.012 * s, 0.5 * s, brass, x + Math.cos(a) * 0.175 * s, y - 1.4 * s, z + Math.sin(a) * 0.175 * s, 3); }
  cone(c.g, 0.14 * s, 0.25 * s, brass, x, y - 1.62 * s, z, 8);
  c.g.add(new THREE.ConeGeometry(0.05 * s, 0.2 * s, 6).rotateX(Math.PI), brass, M(x, y - 1.72 * s, z));
}

/** A little tree in a tiled square planter: an orange tree (fruit among the leaves) or a clipped cypress. */
export function plantedTree(c: Ctx, x: number, z: number, kind: 'orange' | 'cypress' | 'palm', tiles: string[]): void {
  zelligeBox(c, x, z, 1.5, 0.7, tiles);
  box(c.g, 1.3, 0.05, 1.3, '#5a4030', x, 0.7, z);
  if (kind === 'orange') {
    cyl(c.g, 0.1, 0.14, 1.4, '#6b5540', x, 0.7, z, 6);
    sphere(c.g, 1.15, '#2f6a32', x, 2.7, z, 10, 0.9);
    for (let i = 0; i < 12; i++) { const a = i * 2.4, e = (i % 4) * 0.3 - 0.4; sphere(c.g, 0.1, '#ff9a1f', x + Math.cos(a) * 0.95, 2.7 + e, z + Math.sin(a) * 0.95, 5); }
  } else if (kind === 'cypress') {
    cyl(c.g, 0.08, 0.1, 0.6, '#6b5540', x, 0.7, z, 5);
    c.g.add(new THREE.SphereGeometry(0.6, 8, 8).scale(1, 4, 1), '#2f5a32', M(x, 3.4, z));
  } else {
    for (let i = 0; i < 5; i++) cyl(c.g, 0.16 - i * 0.015, 0.18 - i * 0.015, 0.9, i % 2 ? '#8a6a4a' : '#7a5a3a', x, 0.7 + i * 0.9, z, 6);
    for (let i = 0; i < 8; i++) c.g.add(new THREE.BoxGeometry(0.35, 0.03, 1.8).translate(0, 0, 0.9).rotateX(0.55), '#4f8c42', M(x, 5.2, z, (i / 8) * Math.PI * 2));
  }
}

/** A square planter or plinth faced with zellige on all four sides. */
export function zelligeBox(c: Ctx, x: number, z: number, w: number, h: number, tiles: string[]): void {
  box(c.g, w, h, w, '#e8e0d0', x, 0, z);
  for (let side = 0; side < 4; side++) c.g.frame(x, 0, z, (side * Math.PI) / 2, 1, () => zellige(c, 0, 0.08, w / 2 + 0.01, w - 0.16, h - 0.2, tiles, (h - 0.2) / 2));
  box(c.g, w + 0.14, 0.1, w + 0.14, '#f4efe4', x, h, z);
}

/** A window of star-pierced plaster (a qamariya): a glowing arch behind a grid of stars, framed. */
export function starWindow(c: Ctx, x: number, y: number, z: number, w: number, h: number, frame: string, glassCols: string[]): void {
  archPanel(c.g, w + 0.3, h + 0.2, frame, x, y - 0.1, z, 0, 0.06, true);
  const n = Math.max(2, Math.round(w / 0.35)), m = Math.max(3, Math.round(h / 0.35));
  for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) {
    const cx = x - w / 2 + (w / n) * (i + 0.5), cy = y + (h * 0.8 / m) * (j + 0.5);
    for (const rz of [0, Math.PI / 4]) c.glow.add(new THREE.BoxGeometry(w / n * 0.5, w / n * 0.5, 0.02), glassCols[(i + j) % glassCols.length], M(cx, cy, z + 0.07, 0, 1, 1, 1, 0, rz));
  }
  archPanel(c.glow, w * 0.4, h * 0.25, glassCols[0], x, y + h * 0.78, z + 0.07, 0, 0.02, true);
}

/** A mashrabiya: a boxed oriel of turned-wood lattice (beads on rods) with a hood, projecting from the wall at (x, y). */
export function mashrabiya(c: Ctx, x: number, y: number, z: number, w: number, h: number, wood: string): void {
  box(c.g, w + 0.2, 0.2, 0.9, wood, x, y - 0.2, z + 0.45);
  box(c.glow, w - 0.1, h - 0.1, 0.02, '#ffcf9a', x, y, z + 0.8);
  const n = Math.round(w / 0.16), m = Math.round(h / 0.16);
  for (let i = 0; i <= n; i++) box(c.g, 0.03, h, 0.03, wood, x - w / 2 + (i * w) / n, y, z + 0.86);
  for (let j = 0; j <= m; j++) box(c.g, w, 0.03, 0.03, wood, x, y + (j * h) / m, z + 0.86);
  for (let i = 0; i < n; i += 2) for (let j = 0; j < m; j += 2) sphere(c.g, 0.045, wood, x - w / 2 + ((i + 0.5) * w) / n, y + ((j + 0.5) * h) / m, z + 0.88, 4);
  box(c.g, w + 0.4, 0.16, 1.1, wood, x, y + h, z + 0.45);
  for (let i = 0; i < 5; i++) box(c.g, 0.12, 0.3, 0.9, wood, x - w / 2 + (i * w) / 4, y - 0.5, z + 0.45); // brackets
}

// ───────────────────────────── East Asian parts ─────────────────────────────

/** A hanging bronze lantern (tsuri-dōrō): a hexagonal cap and base, lit panels between, hung on a chain from (x, y, z). */
export function bronzeLantern(c: Ctx, x: number, y: number, z: number, s = 1): void {
  const bronze = '#5a5a44';
  cyl(c.g, 0.015 * s, 0.015 * s, 0.5 * s, '#3a3228', x, y - 0.5 * s, z, 3);
  cone(c.g, 0.34 * s, 0.26 * s, bronze, x, y - 0.76 * s, z, 6);
  sphere(c.g, 0.05 * s, bronze, x, y - 0.46 * s, z, 5);
  cyl(c.glow, 0.2 * s, 0.2 * s, 0.4 * s, '#ffcf7a', x, y - 1.16 * s, z, 6);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(c.g, 0.03 * s, 0.4 * s, 0.03 * s, bronze, x + Math.cos(a) * 0.22 * s, y - 1.16 * s, z + Math.sin(a) * 0.22 * s); }
  cyl(c.g, 0.26 * s, 0.2 * s, 0.08 * s, bronze, x, y - 1.24 * s, z, 6);
}

/** A shimenawa: a thick twisted straw rope `len` long along x at height y, zigzag paper shide hanging from it. */
export function shimenawa(c: Ctx, len: number, y: number, z: number, thick = 0.16): void {
  const sag = len * 0.05, pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 12; i++) { const t = i / 12; pts.push(new THREE.Vector3(-len / 2 + t * len, y - sag * Math.sin(t * Math.PI), z)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  c.g.add(new THREE.TubeGeometry(curve, 24, thick, 6), '#e2cf96');
  for (let i = 0; i < 24; i++) { const p = curve.getPoint(i / 24); box(c.g, thick * 0.4, thick * 0.4, thick * 2.2, '#c9b47a', p.x, p.y - thick * 0.2, p.z, (i % 2) * 0.6); } // the twist
  const n = Math.max(2, Math.round(len / 1.6));
  for (let k = 0; k < n; k++) {
    const p = curve.getPoint((k + 0.5) / n);
    for (let j = 0; j < 4; j++) box(c.g, 0.16, 0.2, 0.01, '#ffffff', p.x + (j % 2 ? 0.07 : -0.07), p.y - thick - 0.12 - j * 0.2, p.z + 0.02); // shide
    for (let j = 0; j < 5; j++) cyl(c.g, 0.012, 0.012, 0.25, '#e2cf96', p.x - 0.1 + j * 0.05, p.y - thick - 0.9, p.z, 3); // straw tassels
  }
}

/** An offering box (saisen-bako) with a slatted top, and above it a bell (suzu) on a striped rope. */
export function offeringBox(c: Ctx, x: number, z: number, bellY: number): void {
  box(c.g, 1.6, 0.9, 0.8, '#6a3a22', x, 0, z);
  for (let i = 0; i < 8; i++) c.g.add(new THREE.BoxGeometry(1.5, 0.05, 0.08), '#8a5a36', M(x, 0.92, z - 0.3 + i * 0.085, 0, 1, 1, 1, 0.4, 0));
  box(c.g, 1.7, 0.08, 0.9, '#3a2418', x, 0.9, z);
  sphere(c.g, 0.22, '#d4af37', x, bellY, z, 10);
  box(c.g, 0.3, 0.05, 0.02, '#8a6a2a', x, bellY - 0.08, z + 0.2);
  const pts = [new THREE.Vector3(x, bellY - 0.2, z), new THREE.Vector3(x + 0.08, bellY - 1.2, z + 0.05), new THREE.Vector3(x, 1.2, z + 0.1)];
  c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.045, 5), '#c23b2a');
  for (let k = 0; k < 6; k++) box(c.g, 0.1, 0.1, 0.1, k % 2 ? '#ffffff' : '#5a3a8a', x + 0.04, bellY - 0.4 - k * 0.22, z + 0.05);
}

/** A rack of ema — little wooden votive plaques, pentagonal, hung in rows under a tiny roof. */
export function emaRack(c: Ctx, x: number, z: number, ry: number, rng: () => number): void {
  c.g.frame(x, 0, z, ry, 1, () => {
    for (const sx of [-1, 1]) cyl(c.g, 0.07, 0.08, 2, '#5a3a26', sx * 1.4, 0, 0, 6);
    for (const y of [1.0, 1.55]) box(c.g, 2.9, 0.06, 0.06, '#5a3a26', 0, y, 0);
    c.g.add(new THREE.BoxGeometry(3.3, 0.06, 0.8), '#3a3a4a', M(0, 2.05, 0, 0, 1, 1, 1, 0, 0));
    for (const y of [1.0, 1.55]) for (let k = 0; k < 9; k++) {
      const px = -1.25 + k * 0.31 + (rng() - 0.5) * 0.04;
      box(c.g, 0.24, 0.18, 0.02, '#d8b07a', px, y - 0.24, 0.06);
      c.g.add(new THREE.ConeGeometry(0.17, 0.08, 4).rotateY(Math.PI / 4), '#d8b07a', M(px, y - 0.02, 0.06, 0, 1, 1, 0.12));
      box(c.g, 0.16, 0.08, 0.01, rng() < 0.5 ? '#c23b2a' : '#2a2a30', px, y - 0.18, 0.075);
    }
  });
}

/** A karesansui stone group: three rocks on moss islands, gravel raked in rings round them. */
export function stoneGroup(c: Ctx, x: number, z: number, s: number, rng: () => number): void {
  for (let k = 0; k < 4; k++) c.g.add(new THREE.TorusGeometry(1.4 * s + k * 0.35, 0.03, 3, 40), '#d2ccbc', M(x, 0.17, z, 0, 1, 1, 1, Math.PI / 2, 0));
  c.g.add(new THREE.SphereGeometry(1.2 * s, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#4f7a3a', M(x, 0.12, z, 0, 1, 0.18, 1));
  for (let k = 0; k < 3; k++) {
    const a = k * 2.2 + rng(), r = k === 0 ? 0 : 0.6 * s;
    c.g.add(new THREE.DodecahedronGeometry((0.7 - k * 0.18) * s, 0), '#7a766e', M(x + Math.cos(a) * r, (0.5 - k * 0.12) * s, z + Math.sin(a) * r, rng() * 3, 1, 1.3 - k * 0.2, 0.9));
  }
}

/** A bamboo fence (takegaki) `len` long along x: posts, horizontal ties, close vertical canes. */
export function bambooFence(c: Ctx, len: number, h: number): void {
  for (let i = 0; i <= Math.round(len / 1.8); i++) cyl(c.g, 0.06, 0.06, h + 0.1, '#8a7a4a', -len / 2 + i * (len / Math.round(len / 1.8)), 0, 0, 6);
  for (let i = 0; i < Math.round(len / 0.07); i++) cyl(c.g, 0.025, 0.025, h, i % 3 ? '#b8b070' : '#a8a060', -len / 2 + i * 0.07, 0, 0.05, 4);
  for (const y of [h * 0.3, h * 0.8]) box(c.g, len, 0.07, 0.08, '#3a2a1e', 0, y, 0.1);
}

/** A tsukubai: a low stone basin with a bamboo spout trickling into it, stepping stones before it. */
export function tsukubai(c: Ctx, x: number, z: number): void {
  cyl(c.g, 0.45, 0.5, 0.45, '#8a867c', x, 0, z, 10);
  cyl(c.glow, 0.34, 0.34, 0.02, '#4a8aa0', x, 0.44, z, 10);
  c.g.add(new THREE.CylinderGeometry(0.04, 0.04, 1.1, 5).rotateZ(Math.PI / 2 - 0.15), '#b8c070', M(x - 0.6, 0.75, z));
  cyl(c.g, 0.05, 0.05, 0.9, '#b8c070', x - 1.1, 0, z, 5);
  cyl(c.glow, 0.012, 0.012, 0.28, '#dff6ff', x - 0.08, 0.46, z, 3);
  for (let k = 0; k < 3; k++) cyl(c.g, 0.3, 0.32, 0.12, '#9a968c', x + 0.4 + k * 0.7, 0, z + 0.9 + k * 0.4, 8);
}

/** A little Japanese maple: a slim trunk and layered red crowns. */
export function maple(c: Ctx, x: number, z: number, s: number): void {
  cyl(c.g, 0.08 * s, 0.12 * s, 1.6 * s, '#5a3a2a', x, 0, z, 6);
  for (let k = 0; k < 4; k++) { const a = k * 1.7; sphere(c.g, 0.7 * s, k % 2 ? '#d8442a' : '#e8783a', x + Math.cos(a) * 0.5 * s, (1.8 + (k % 2) * 0.4) * s, z + Math.sin(a) * 0.5 * s, 7, 0.55); }
}

/** A red silk lantern (Chinese): gold caps top and bottom, a glowing round body ribbed in red, a gold tassel. */
export function redLantern(c: Ctx, x: number, y: number, z: number, s = 1): void {
  cyl(c.g, 0.015 * s, 0.015 * s, 0.4 * s, '#3a2a22', x, y - 0.4 * s, z, 3);
  cyl(c.g, 0.16 * s, 0.16 * s, 0.07 * s, '#d4af37', x, y - 0.47 * s, z, 10);
  sphere(c.glow, 0.36 * s, '#e8242a', x, y - 0.86 * s, z, 12, 0.82);
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI; c.g.add(new THREE.TorusGeometry(0.36 * s, 0.01 * s, 3, 16), '#b3102a', M(x, y - 0.86 * s, z, a, 1, 0.82, 1)); }
  cyl(c.g, 0.16 * s, 0.16 * s, 0.07 * s, '#d4af37', x, y - 1.24 * s, z, 10);
  cyl(c.g, 0.04 * s, 0.015 * s, 0.4 * s, '#ffd24a', x, y - 1.64 * s, z, 6);
}

/**
 * A guardian lion on a plinth (shishi): a seated body with its mane in curls, a paw on a ball,
 * its head floating just clear (no face) — `ry` turns it.
 */
export function guardianLion(c: Ctx, x: number, z: number, ry: number, s: number, stone: string, headGap: number): void {
  c.g.frame(x, 0, z, ry, 1, () => {
    box(c.g, 1.8 * s, 1.2 * s, 2.4 * s, '#b8b0a4');
    for (let k = 0; k < 3; k++) box(c.g, (1.9 - k * 0.12) * s, 0.12 * s, (2.5 - k * 0.12) * s, '#a8a094', 0, (0.2 + k * 0.4) * s, 0);
    const y0 = 1.2 * s;
    c.g.add(new THREE.SphereGeometry(0.62 * s, 12, 8).scale(1, 1.3, 0.9), stone, M(0, y0 + 0.9 * s, -0.2 * s));
    for (const sx of [-1, 1]) { cyl(c.g, 0.16 * s, 0.2 * s, 1 * s, stone, sx * 0.38 * s, y0, 0.45 * s, 8); sphere(c.g, 0.2 * s, stone, sx * 0.38 * s, y0 + 0.08 * s, 0.6 * s, 8, 0.6); cyl(c.g, 0.24 * s, 0.28 * s, 0.5 * s, stone, sx * 0.45 * s, y0, -0.6 * s, 8); }
    sphere(c.g, 0.26 * s, stone, 0.38 * s, y0 + 0.2 * s, 0.9 * s, 10); // the ball under its paw
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; sphere(c.g, 0.13 * s, '#a8a094', Math.cos(a) * 0.45 * s, y0 + 1.55 * s + Math.sin(a) * 0.45 * s, 0.1 * s, 6); } // curls of the mane
    sphere(c.g, 0.42 * s, stone, 0, y0 + 1.55 * s + headGap * 4 * s + 0.2 * s, 0.35 * s, 12); // the head, floating free
    for (let i = 0; i < 5; i++) sphere(c.g, 0.1 * s, '#a8a094', -0.3 * s + i * 0.15 * s, y0 + 0.9 * s, -0.95 * s - (i % 2) * 0.05 * s, 5); // the curled tail
  });
}

/** A rank stone (pumgyeseok): a little stele on a stepped base where officials once stood in order. */
export function rankStone(c: Ctx, x: number, z: number): void {
  box(c.g, 0.7, 0.18, 0.5, '#a8a094', x, 0, z);
  box(c.g, 0.4, 0.9, 0.18, '#b8b0a4', x, 0.18, z);
  c.g.add(new THREE.ConeGeometry(0.28, 0.16, 4).rotateY(Math.PI / 4), '#b8b0a4', M(x, 1.16, z, 0, 1, 1, 0.5));
}

/** A deumeu: a great bronze cauldron of water kept against fire, on a carved stone base, handles like rings. */
export function deumeu(c: Ctx, x: number, z: number): void {
  box(c.g, 1.6, 0.5, 1.6, '#a8a094', x, 0, z);
  for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; cyl(c.g, 0.12, 0.16, 0.4, '#3a3a2e', x + Math.cos(a) * 0.5, 0.5, z + Math.sin(a) * 0.5, 6); }
  c.g.add(new THREE.LatheGeometry([[0.3, 0], [0.75, 0.15], [0.85, 0.6], [0.8, 0.9], [0.72, 0.92]].map(([a, b]) => new THREE.Vector2(a, b)), 16), '#4a4a3a', M(x, 0.85, z));
  cyl(c.g, 0.7, 0.7, 0.03, '#3a5a6a', x, 1.7, z, 16);
  for (const sx of [-1, 1]) c.g.add(new THREE.TorusGeometry(0.16, 0.04, 5, 12), '#5a5a44', M(x + sx * 0.86, 1.45, z, Math.PI / 2));
}

/** A Korean red pine: a leaning, twisting reddish trunk and flat layered crowns of dark needles. */
export function redPine(c: Ctx, x: number, z: number, s: number, rng: () => number): void {
  const pts: THREE.Vector3[] = [];
  let px = x, pz = z;
  for (let i = 0; i <= 5; i++) { pts.push(new THREE.Vector3(px, i * 1.3 * s, pz)); px += (rng() - 0.3) * 0.6 * s; pz += (rng() - 0.5) * 0.5 * s; }
  c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.2 * s, 6), '#9a4a2a');
  for (let k = 0; k < 4; k++) {
    const p = pts[2 + Math.min(3, k)], a = rng() * Math.PI * 2;
    c.g.add(new THREE.SphereGeometry(1.4 * s, 10, 5).scale(1, 0.32, 1), '#2f4a2a', M(p.x + Math.cos(a) * 0.8 * s, p.y + 0.4 * s, p.z + Math.sin(a) * 0.8 * s));
  }
}

// ───────────────────────────── Northern parts ─────────────────────────────

/** An iron lantern on a post: a square glowing box with a little pyramid cap, on a black post. */
export function ironLantern(c: Ctx, x: number, z: number, h = 2.4): void {
  cyl(c.g, 0.06, 0.08, h, '#1f1f24', x, 0, z, 6);
  box(c.g, 0.34, 0.04, 0.34, '#1f1f24', x, h, z);
  box(c.glow, 0.26, 0.4, 0.26, '#ffcf7a', x, h + 0.04, z);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(c.g, 0.03, 0.42, 0.03, '#1f1f24', x + sx * 0.14, h + 0.02, z + sz * 0.14);
  c.g.add(new THREE.ConeGeometry(0.26, 0.24, 4).rotateY(Math.PI / 4), '#1f1f24', M(x, h + 0.56, z));
}

/** Scrolling iron strap hinges and a ring on a door (on the plane z, the door's bottom centre (x, y), w × h). */
export function ironHinges(c: Ctx, x: number, y: number, z: number, w: number, h: number): void {
  for (const yy of [h * 0.22, h * 0.72]) {
    box(c.g, w * 0.9, 0.08, 0.04, '#1f1f24', x, y + yy, z);
    for (const sx of [-1, 1]) {
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI * 1.5; pts.push(new THREE.Vector3(x + sx * (w * 0.2 + Math.sin(a) * 0.18 * (1 - k / 10)), y + yy + 0.05 + (1 - Math.cos(a)) * 0.16, z + 0.02)); }
      c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.025, 4), '#1f1f24');
    }
  }
  c.g.add(new THREE.TorusGeometry(0.14, 0.025, 5, 14), '#1f1f24', M(x + w * 0.2, y + h * 0.48, z + 0.05));
}

/** A rounded headstone: a plain slab with a curved top on a low base. */
export function headstone(c: Ctx, x: number, z: number, s: number): void {
  box(c.g, 0.7 * s, 0.12, 0.4 * s, '#8a8680', x, 0, z);
  box(c.g, 0.55 * s, 0.7 * s, 0.14, '#9a968e', x, 0.12, z);
  c.g.add(new THREE.CylinderGeometry(0.275 * s, 0.275 * s, 0.14, 12, 1, false, -Math.PI / 2, Math.PI).rotateX(Math.PI / 2), '#9a968e', M(x, 0.12 + 0.7 * s, z));
}

/** A stabbur: a little log storehouse raised on posts on stones, a turf roof with grass. */
export function stabbur(c: Ctx, x: number, z: number, ry: number, tar: string): void {
  c.g.frame(x, 0, z, ry, 1, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1]]) { sphere(c.g, 0.3, '#8a8680', sx * 1.6, 0.1, sz * 1.3, 6, 0.6); cyl(c.g, 0.14, 0.16, 1.3, tar, sx * 1.6, 0.2, sz * 1.3, 6); }
    for (let k = 0; k < 9; k++) { c.g.add(new THREE.CylinderGeometry(0.14, 0.14, 3.8, 6).rotateZ(Math.PI / 2), tar, M(0, 1.6 + k * 0.28, 1.4)); c.g.add(new THREE.CylinderGeometry(0.14, 0.14, 3.8, 6).rotateZ(Math.PI / 2), tar, M(0, 1.6 + k * 0.28, -1.4)); c.g.add(new THREE.CylinderGeometry(0.14, 0.14, 3.0, 6).rotateX(Math.PI / 2), tar, M(1.8, 1.6 + k * 0.28, 0)); c.g.add(new THREE.CylinderGeometry(0.14, 0.14, 3.0, 6).rotateX(Math.PI / 2), tar, M(-1.8, 1.6 + k * 0.28, 0)); }
    box(c.g, 0.9, 1.7, 0.1, '#5a4230', 0, 1.6, 1.52);
    for (let k = 0; k < 4; k++) box(c.g, 1.1, 0.12, 0.35, '#6a4e36', 0, 0.25 + k * 0.35, 2.1 + (3 - k) * 0.3); // the steps up
    const sh = new THREE.Shape([new THREE.Vector2(-2.3, 0), new THREE.Vector2(2.3, 0), new THREE.Vector2(0, 1.6)]);
    c.g.add(new THREE.ExtrudeGeometry(sh, { depth: 4.4, bevelEnabled: false }).rotateY(Math.PI / 2).translate(-2.2, 0, 0), '#4f7a3a', M(0, 4.1, 0, Math.PI / 2));
    for (let k = 0; k < 14; k++) cone(c.g, 0.08, 0.35, '#5a9a44', -1.9 + (k % 7) * 0.62, 4.6 + Math.floor(k / 7) * 0.4, (k % 2 ? 0.6 : -0.6) * (1 - Math.floor(k / 7) * 0.5), 4);
  });
}

// ───────────────────────────── South Indian parts ─────────────────────────────

/** A kuthuvilakku: a tall brass oil lamp — a round foot, a slender stem with collars, a dish of wick-flames, a finial. */
export function kuthuvilakku(c: Ctx, x: number, z: number, s = 1): void {
  const brass = '#d4a83a';
  cyl(c.g, 0.35 * s, 0.42 * s, 0.12 * s, brass, x, 0, z, 12);
  cyl(c.g, 0.05 * s, 0.07 * s, 1.4 * s, brass, x, 0.12 * s, z, 8);
  for (const y of [0.4, 0.8, 1.2]) sphere(c.g, 0.1 * s, brass, x, y * s, z, 8, 0.6);
  c.g.add(new THREE.CylinderGeometry(0.34 * s, 0.1 * s, 0.14 * s, 12), brass, M(x, 1.58 * s, z));
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cone(c.glow, 0.035 * s, 0.14 * s, '#ffb84a', x + Math.cos(a) * 0.28 * s, 1.66 * s, z + Math.sin(a) * 0.28 * s, 5); }
  cone(c.g, 0.06 * s, 0.4 * s, brass, x, 1.66 * s, z, 8);
}

/** A kolam: white rice-flour loops round a grid of dots, laid on the ground before a door, r across. */
export function kolam(c: Ctx, x: number, z: number, r: number, y = 0.02): void {
  const n = 5, step = (r * 2) / (n + 1);
  for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) cyl(c.g, 0.05, 0.05, 0.01, '#ffffff', x - r + i * step, y, z - r + j * step, 5);
  for (let i = 1; i < n; i++) for (let j = 1; j < n; j++) if ((i + j) % 2 === 0) c.g.add(new THREE.TorusGeometry(step * 0.5, 0.025, 3, 16), '#ffffff', M(x - r + (i + 0.5) * step, y + 0.005, z - r + (j + 0.5) * step, 0, 1, 1, 1, Math.PI / 2, 0));
  c.g.add(new THREE.TorusGeometry(r * 0.95, 0.03, 3, 40), '#ffffff', M(x, y + 0.005, z, 0, 1, 1, 1, Math.PI / 2, 0));
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; sphere(c.g, 0.07, i % 2 ? '#ff9a1f' : '#e8347a', x + Math.cos(a) * r * 0.95, y + 0.02, z + Math.sin(a) * r * 0.95, 4); }
}

/** A banana plant: a soft trunk and broad arching leaves. */
export function banana(c: Ctx, x: number, z: number, s = 1): void {
  cyl(c.g, 0.14 * s, 0.2 * s, 2 * s, '#7a9a4a', x, 0, z, 7);
  for (let i = 0; i < 7; i++) c.g.add(new THREE.BoxGeometry(0.55 * s, 0.02, 2 * s).translate(0, 0, s).rotateX(0.7 + (i % 2) * 0.3), i % 3 ? '#4f9a3a' : '#6ab44a', M(x, 2 * s, z, (i / 7) * Math.PI * 2));
}

/** A ratha: a wooden temple chariot on four great wheels, a carved platform, a tiered cloth-and-wood canopy, a kalasha. */
export function ratha(c: Ctx, x: number, z: number, ry: number): void {
  const wood = '#6a4a2a', gold = '#d4af37';
  c.g.frame(x, 0, z, ry, 1, () => {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.g.add(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 16).rotateZ(Math.PI / 2), '#4a3420', M(sx * 1.9, 1.1, sz * 1.6)); c.g.add(new THREE.TorusGeometry(1.1, 0.08, 4, 16), '#2a2018', M(sx * 2.1, 1.1, sz * 1.6, Math.PI / 2)); }
    for (let k = 0; k < 4; k++) box(c.g, 3.6 - k * 0.3, 0.55, 4 - k * 0.3, k % 2 ? '#8a5a36' : wood, 0, 1.1 + k * 0.55, 0);
    for (let k = 0; k < 8; k++) box(c.g, 0.3, 0.4, 0.06, gold, -1.4 + k * 0.4, 1.8, 2.02); // carved panels
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.1, 0.1, 2.4, gold, sx * 1.1, 3.3, sz * 1.2, 8);
    const cols = ['#c23b2a', '#f4efe4', '#e2b43a', '#2f7a5a', '#c23b2a'];
    for (let k = 0; k < 5; k++) cyl(c.g, 1.9 - k * 0.33, 1.7 - k * 0.33, 0.7, cols[k], 0, 5.7 + k * 0.7, 0, 8);
    cone(c.g, 0.3, 0.8, gold, 0, 9.2, 0, 8); sphere(c.g, 0.2, gold, 0, 10.1, 0, 8);
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; cyl(c.g, 0.02, 0.02, 0.6, '#e2b43a', Math.cos(a) * 1.9, 5.1, Math.sin(a) * 1.9, 3); sphere(c.g, 0.07, k % 2 ? '#ff9a1f' : '#ffffff', Math.cos(a) * 1.9, 5.05, Math.sin(a) * 1.9, 4); }
    for (const sx of [-1, 1]) c.g.add(new THREE.CylinderGeometry(0.06, 0.06, 5, 5).rotateX(Math.PI / 2 - 0.15), '#c9b08a', M(sx * 0.8, 0.6, 4.2)); // the pulling ropes
  });
}
