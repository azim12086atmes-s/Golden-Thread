import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Split an axis-aligned collider around a clear rectangular passage. Coordinates share units. */
export function subtractEntrance(c, v) {
  if (![c.minX, c.maxX, c.minZ, c.maxZ].every(Number.isFinite)) return [c];
  const cy0 = c.y0 ?? -Infinity, cy1 = c.y1 ?? Infinity;
  const x0 = Math.max(c.minX, v.minX), x1 = Math.min(c.maxX, v.maxX);
  const z0 = Math.max(c.minZ, v.minZ), z1 = Math.min(c.maxZ, v.maxZ);
  const y0 = Math.max(cy0, v.y0), y1 = Math.min(cy1, v.y1);
  if (x0 >= x1 || z0 >= z1 || y0 >= y1) return [c];
  const out = [];
  const add = (minX, maxX, minZ, maxZ, lo, hi) => {
    if (minX < maxX && minZ < maxZ && lo < hi) out.push({ ...c, minX, maxX, minZ, maxZ, y0: lo, y1: hi });
  };
  // Six disjoint slabs leave the passage volume empty without changing the rest of the box.
  add(c.minX, x0, c.minZ, c.maxZ, cy0, cy1);
  add(x1, c.maxX, c.minZ, c.maxZ, cy0, cy1);
  add(x0, x1, c.minZ, z0, cy0, cy1);
  add(x0, x1, z1, c.maxZ, cy0, cy1);
  add(x0, x1, z0, z1, cy0, y0);
  add(x0, x1, z0, z1, y1, cy1);
  return out;
}

/** Solid rectangle with a pointed-arch void, in the local x/y plane and +z extrusion. */
export function archWallGeometry(width, yBottom, yTop, archWidth, archHeight, archBottom, depth) {
  const sideWidth = (width - archWidth) / 2, geoms = [];
  if (sideWidth > 0) for (const side of [-1, 1]) {
    geoms.push(new THREE.BoxGeometry(sideWidth, yTop - yBottom, depth)
      .translate(side * (archWidth / 2 + sideWidth / 2), (yBottom + yTop) / 2, depth / 2));
  }
  const spring = archHeight - archWidth * 0.866, cap = new THREE.Shape();
  cap.moveTo(-archWidth / 2, archHeight); cap.lineTo(archWidth / 2, archHeight);
  cap.lineTo(archWidth / 2, spring);
  cap.absarc(-archWidth / 2, spring, archWidth, 0, Math.PI / 3, false);
  cap.absarc(archWidth / 2, spring, archWidth, 2 * Math.PI / 3, Math.PI, false);
  cap.lineTo(-archWidth / 2, archHeight); cap.closePath();
  geoms.push(new THREE.ExtrudeGeometry(cap, { depth, bevelEnabled: false, curveSegments: 24 }).translate(0, archBottom, 0));
  const headerY = archBottom + archHeight;
  if (yTop > headerY) geoms.push(new THREE.BoxGeometry(width, yTop - headerY, depth)
    .translate(0, (headerY + yTop) / 2, depth / 2));
  return mergeGeometries(geoms.map(g=>g.index?g.toNonIndexed():g), false);
}

/** Rectangular aperture through the short inner portal framing the gallery entrance. */
export function rectangularPortalFrame(width, yBottom, yTop, apertureWidth, apertureBottom, apertureTop, depth) {
  const side = (width - apertureWidth) / 2, geoms = [];
  if (side > 0) for (const sign of [-1, 1]) geoms.push(new THREE.BoxGeometry(side, yTop - yBottom, depth)
    .translate(sign * (apertureWidth / 2 + side / 2), (yBottom + yTop) / 2, depth / 2));
  if (yTop > apertureTop) geoms.push(new THREE.BoxGeometry(width, yTop - apertureTop, depth)
    .translate(0, (apertureTop + yTop) / 2, depth / 2));
  if (apertureBottom > yBottom) geoms.push(new THREE.BoxGeometry(width, apertureBottom - yBottom, depth)
    .translate(0, (yBottom + apertureBottom) / 2, depth / 2));
  return mergeGeometries(geoms.map(g=>g.index?g.toNonIndexed():g), false);
}

/** Upper fanlight cut from the same arch and UV range as the complete gate panel. */
export function fanlightGeometry(width, height) {
  const spring = height - width * 0.866, hw = width / 2;
  const s = new THREE.Shape();
  s.moveTo(-hw, spring);
  s.absarc(-hw, spring, width, 0, Math.PI / 3, false);
  s.absarc(hw, spring, width, 2 * Math.PI / 3, Math.PI, false);
  s.closePath();
  const g = new THREE.ShapeGeometry(s, 16), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + hw) / width, p.getY(i) / height);
  return g;
}

/** Relief field above the pointed arch; its lower boundary follows the arch, not a rectangle. */
export function spandrelGeometry(width, height, top, archWidth = width, archHeight = height) {
  const spring = archHeight - archWidth * 0.866, hw = width / 2, ahw = archWidth / 2;
  if (top <= spring) return new THREE.BufferGeometry();
  const s = new THREE.Shape();
  s.moveTo(-hw, top); s.lineTo(hw, top); s.lineTo(hw, spring); s.lineTo(ahw, spring);
  s.absarc(-ahw, spring, archWidth, 0, Math.PI / 3, false);
  s.absarc(ahw, spring, archWidth, 2 * Math.PI / 3, Math.PI, false);
  s.lineTo(-hw, spring); s.lineTo(-hw, top); s.closePath();
  return new THREE.ShapeGeometry(s, 16);
}
