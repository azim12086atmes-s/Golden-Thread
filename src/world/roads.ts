import * as THREE from 'three';
import type { GeoBuilder } from './kit';

/**
 * Roads that lie on the land (owner: "the roads do not match the terrain curve… no overlap or
 * chunking"): each road is one ribbon draped over the ground, its vertices a couple of metres
 * apart along it and across it, every one set just above the terrain beneath — so a road follows
 * each rise and dip without steps, gaps or slabs sticking out. The road's colour is its surface,
 * which the ground shader draws as asphalt, cobbles, flagstones or sand by land (surfaces.ts).
 */
type Height = (x: number, z: number) => number;

/** A ribbon `width` wide along the centre line `pts` (local x, z), `lift` above the ground. */
export function drapeStrip(g: GeoBuilder, pts: Array<[number, number]>, width: number, col: string, H: Height, lift = 0.07, across = 4): void {
  if (pts.length < 2) return;
  const pos: number[] = [], idx: number[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let tx = b[0] - a[0], tz = b[1] - a[1];
    const l = Math.hypot(tx, tz) || 1; tx /= l; tz /= l;
    const nx = -tz, nz = tx;
    for (let k = 0; k <= across; k++) {
      const o = (k / across - 0.5) * width, x = pts[i][0] + nx * o, z = pts[i][1] + nz * o;
      pos.push(x, H(x, z) + lift, z);
    }
  }
  const row = across + 1;
  for (let i = 0; i < pts.length - 1; i++) for (let k = 0; k < across; k++) {
    const p = i * row + k, q = p + row;
    idx.push(p, q, p + 1, p + 1, q, q + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  // Face up whichever way the strip was walked.
  geo.computeVertexNormals();
  const n = geo.getAttribute('normal');
  if (n.getY(0) < 0) { for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; } geo.setIndex(idx); geo.computeVertexNormals(); }
  g.add(geo, col);
}

/** A round plaza `r` across, draped over the ground. */
export function drapeDisc(g: GeoBuilder, r: number, col: string, H: Height, lift = 0.07): void {
  const rings = Math.ceil(r / 3), seg = 48, pos: number[] = [0, H(0, 0) + lift, 0], idx: number[] = [];
  for (let k = 1; k <= rings; k++) for (let j = 0; j < seg; j++) {
    const a = (j / seg) * Math.PI * 2, rr = (k / rings) * r, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    pos.push(x, H(x, z) + lift, z);
  }
  const at = (k: number, j: number) => (k === 0 ? 0 : 1 + (k - 1) * seg + (j % seg));
  for (let j = 0; j < seg; j++) idx.push(0, at(1, j + 1), at(1, j));
  for (let k = 1; k < rings; k++) for (let j = 0; j < seg; j++) {
    const a = at(k, j), b = at(k, j + 1), c2 = at(k + 1, j), d = at(k + 1, j + 1);
    idx.push(a, b, c2, b, d, c2);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  g.add(geo, col);
}
