// Hero artifacts and planting kit shared by the palace, the terraces and the
// causeway (owner sheets 07, 08, 09, 13 and 16). Every piece is built once with
// vertex colours and drawn as instances, so hundreds of them cost a draw call each.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, glowBasic } from './materials.js';
import { lathe } from './kit.js';

export const IVORY = '#f8f0e8', PEARL = '#fbf6f2', ROSE = '#f0c2c6', GOLD = '#e2b44c', PURPLE = '#6a3a8c', INDIGO = '#3a3ca8';

// a geometry with a flat vertex colour (optionally darkened towards its foot)
export function paint(g, hex, foot = 0) {
  g = g.index ? g.toNonIndexed() : g;
  const c = new THREE.Color(hex), p = g.attributes.position, n = p.count, a = new Float32Array(n * 3);
  let y0 = Infinity, y1 = -Infinity;
  if (foot) for (let i = 0; i < n; i++) { y0 = Math.min(y0, p.getY(i)); y1 = Math.max(y1, p.getY(i)); }
  for (let i = 0; i < n; i++) {
    const k = foot ? 1 - foot * (1 - (p.getY(i) - y0) / (y1 - y0 || 1)) : 1;
    a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}
export const merge = (list) => mergeGeometries(list.map((g) => (g.index ? g.toNonIndexed() : g)));

// an eight-point star finial (stars, never crosses), size s, standing on y = 0
export function starGeo(s, hex = GOLD) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? s * 0.42 : s;
    i ? sh.lineTo(Math.cos(a) * r, Math.sin(a) * r) : sh.moveTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  const g = new THREE.ExtrudeGeometry(sh, { depth: s * 0.2, bevelEnabled: false }).translate(0, s * 1.1, -s * 0.1);
  return paint(merge([g, g.clone().rotateY(Math.PI / 2)]), hex);
}
// a gold finial: ball, needle and star, total height about 3.2 s
export function finialGeo(s) {
  return merge([
    paint(new THREE.SphereGeometry(s * 0.35, 8, 6).translate(0, s * 0.35, 0), GOLD),
    paint(new THREE.ConeGeometry(s * 0.12, s * 1.2, 6).translate(0, s * 1.2, 0), GOLD),
    starGeo(s * 0.55).translate(0, s * 1.5, 0),
  ]);
}

// Gothic spirelet (pinnacle): square shaft, crocketed spire, gold ball and star. Unit
// width 1, height about 12; scale per instance.
export function spireletGeo() {
  const parts = [paint(new THREE.BoxGeometry(1, 6, 1).translate(0, 3, 0), IVORY)];
  parts.push(paint(new THREE.CylinderGeometry(0.02, 0.85, 4.6, 4, 1, true).rotateY(Math.PI / 4).translate(0, 8.3, 0), IVORY));
  for (let k = 0; k < 2; k++) for (let i = 0; i < 4; i++) {           // crockets up the four edges
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4, r = 0.56 - k * 0.22;
    parts.push(paint(new THREE.OctahedronGeometry(0.2, 0).translate(Math.cos(a) * r, 6.9 + k * 1.4, Math.sin(a) * r), GOLD));
  }
  parts.push(paint(new THREE.BoxGeometry(1.25, 0.35, 1.25).translate(0, 6, 0), GOLD));
  parts.push(paint(new THREE.OctahedronGeometry(0.3, 0).translate(0, 10.7, 0), GOLD), paint(new THREE.ConeGeometry(0.08, 1.2, 4, 1, true).translate(0, 11.5, 0), GOLD));
  return merge(parts);
}

// T02a cypress, 1 m tall (scale per instance)
export function cypressGeo() {
  const crown = lathe([[0.03, 0.06], [0.12, 0.2], [0.12, 0.5], [0.06, 0.85], [0, 1]], 6);
  return merge([paint(new THREE.CylinderGeometry(0.012, 0.018, 0.12, 4).translate(0, 0.06, 0), '#6a4a3a'), paint(crown, '#2f6e44', 0.35)]);
}
// T01 royal rose-blossom tree, 25 m tall, 18 m canopy (sheet 08)
export function blossomGeo() {
  const parts = [paint(new THREE.CylinderGeometry(0.7, 1.3, 11, 6).translate(0, 5.5, 0), '#7a5560')];
  for (const [x, z, a] of [[1, 0, 0.5], [-1, 0.4, -0.5], [0, -1, 0.3]]) parts.push(paint(new THREE.CylinderGeometry(0.35, 0.6, 8, 5).rotateZ(a).rotateY(x + z).translate(x * 2, 12, z * 2), '#7a5560'));
  const blobs = [[0, 18, 0, 7, '#f6a8c8'], [5.5, 15.5, 2, 5, '#f9bfd8'], [-5.2, 16, -1.5, 5.2, '#f19bc0'], [1.5, 15, -5, 4.8, '#ffd3e6'], [-2, 15.4, 5, 4.6, '#f6a8c8'], [0, 21.5, 0.5, 4.2, '#ffd8ea']];
  for (const [x, y, z, r, c] of blobs) { const g = new THREE.IcosahedronGeometry(r, 0); g.scale(1, 0.82, 1).translate(x, y, z); parts.push(paint(g, c, 0.25)); }
  return merge(parts);
}
// T02c lake willow, 22 m, weeping
export function willowGeo() {
  const parts = [paint(new THREE.CylinderGeometry(0.8, 1.4, 12, 6).translate(0, 6, 0), '#6a5a48')];
  const dome = new THREE.SphereGeometry(9, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2); dome.scale(1, 0.75, 1).translate(0, 13, 0);
  parts.push(paint(dome, '#8fbf4a', 0.2));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, r = 7.5 + (i % 3);
    parts.push(paint(new THREE.ConeGeometry(1.6, 10 + (i % 4) * 1.5, 4).rotateX(Math.PI).translate(Math.cos(a) * r, 9.5 - (i % 4) * 0.7, Math.sin(a) * r), i % 2 ? '#a6cf5a' : '#7fb44a'));
  }
  return merge(parts);
}
// T02e white-bark avenue tree, 100 m tall with a wide lush crown
export function avenueTreeGeo() {
  const parts = [paint(new THREE.CylinderGeometry(1.8, 3.6, 62, 8).translate(0, 31, 0), '#f3eee8', 0.25)];
  for (const [a, tilt, y, l] of [[0, 0.55, 40, 30], [2.1, 0.6, 44, 28], [4.2, 0.5, 38, 30], [1.0, 0.35, 54, 22], [3.3, 0.4, 56, 22], [5.3, 0.45, 50, 24]]) {
    const b = new THREE.CylinderGeometry(0.6, 1.4, l, 6).translate(0, l / 2, 0).rotateZ(tilt).rotateY(a).translate(0, y, 0);
    parts.push(paint(b, '#eee8e2'));
  }
  const greens = ['#3f9a4e', '#4fae58', '#5bbd62', '#46a352', '#6cc66a'];
  const blobs = [[0, 84, 0, 20], [17, 74, 6, 15], [-16, 75, -5, 16], [5, 72, -18, 14], [-6, 72, 17, 14], [12, 88, -8, 12], [-11, 90, 8, 12], [0, 96, 0, 10], [22, 66, -10, 10], [-22, 66, 10, 10]];
  blobs.forEach(([x, y, z, r], i) => { const g = new THREE.IcosahedronGeometry(r, i < 3 ? 1 : 0); g.scale(1, 0.8, 1).translate(x, y, z); parts.push(paint(g, greens[i % greens.length], 0.3)); });
  return merge(parts);
}
// small orange tree for the conservatories, 4 m
export function orangeTreeGeo() {
  const parts = [paint(new THREE.CylinderGeometry(0.12, 0.2, 1.8, 5).translate(0, 0.9, 0), '#6a4a3a'), paint(new THREE.IcosahedronGeometry(1.4, 1).translate(0, 2.6, 0), '#3e8a3e', 0.25)];
  for (let i = 0; i < 9; i++) { const a = i * 2.4, y = 2.1 + (i % 3) * 0.5; parts.push(paint(new THREE.SphereGeometry(0.16, 5, 4).translate(Math.cos(a) * 1.3, y, Math.sin(a) * 1.3), '#ffa630')); }
  return merge(parts);
}
// a clump of roses for garlands, parterres and parapets, 1 m across
export function roseClumpGeo() {
  const parts = [paint(new THREE.OctahedronGeometry(0.5, 0).scale(1, 0.7, 1), '#3f7a3f')];
  for (let i = 0; i < 5; i++) { const a = i * 1.26; parts.push(paint(new THREE.OctahedronGeometry(0.19, 0).translate(Math.cos(a) * 0.36, 0.2 + (i % 2) * 0.12, Math.sin(a) * 0.36), i % 3 ? '#ff8fbf' : '#ffe0ec')); }
  return merge(parts);
}

// A027 crystal post lamp, 6 m: carved plinth, gold post, hexagonal crystal lantern. Two parts:
// the stone and gold (lit) and the crystal (glowing).
export function postLampGeo() {
  const body = merge([
    paint(new THREE.BoxGeometry(0.9, 1.4, 0.9).translate(0, 0.7, 0), PEARL),
    paint(new THREE.BoxGeometry(1.05, 0.2, 1.05).translate(0, 1.45, 0), GOLD),
    paint(new THREE.CylinderGeometry(0.12, 0.2, 2.8, 6).translate(0, 2.95, 0), GOLD),
    paint(new THREE.OctahedronGeometry(0.24, 0).translate(0, 4.4, 0), GOLD),
    paint(new THREE.CylinderGeometry(0.62, 0.5, 0.22, 6).translate(0, 4.6, 0), GOLD),
    paint(new THREE.ConeGeometry(0.62, 0.7, 6).translate(0, 5.95, 0), GOLD),
    paint(new THREE.OctahedronGeometry(0.16, 0).translate(0, 6.45, 0), GOLD),
  ]);
  const glass = paint(new THREE.CylinderGeometry(0.55, 0.42, 1.1, 6).translate(0, 5.25, 0), '#d6e4ff');
  return { body, glass };
}
// a hanging crystal lantern (sheet 16, 1.7 m), hanging from its top at y = 0
export function hangingLanternGeo() {
  const body = merge([
    paint(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4).translate(0, -0.25, 0), GOLD),
    paint(new THREE.ConeGeometry(0.4, 0.35, 6).translate(0, -0.65, 0), GOLD),
    paint(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 6).translate(0, -1.55, 0), GOLD),
    paint(new THREE.ConeGeometry(0.12, 0.25, 6).rotateX(Math.PI).translate(0, -1.72, 0), GOLD),
  ]);
  const glass = paint(new THREE.CylinderGeometry(0.36, 0.3, 0.7, 6).translate(0, -1.15, 0), '#d6e4ff');
  return { body, glass };
}

// A035 lotus fountain (18 m across at scale 1): basin with a 1.2 m wall, three tiered
// lotus bowls on a carved stem, a crystal bud on top. Returns geometries for the
// stone, the gold and the water, plus the spray points.
export function lotusFountainGeo(R = 9, lobes = 8) {
  const stone = [], gold = [], water = [];
  const rim = new THREE.Shape(), hole = new THREE.Path();
  for (let i = 0; i <= 96; i++) {
    const a = (i / 96) * Math.PI * 2, r = R * (1 + 0.08 * Math.cos(a * lobes));
    i ? rim.lineTo(Math.cos(a) * r, Math.sin(a) * r) : rim.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    const ri = r - R * 0.07;
    i ? hole.lineTo(Math.cos(a) * ri, Math.sin(a) * ri) : hole.moveTo(Math.cos(a) * ri, Math.sin(a) * ri);
  }
  rim.holes.push(hole);
  stone.push(paint(new THREE.ExtrudeGeometry(rim, { depth: R * 0.133, bevelEnabled: false, curveSegments: 4 }).rotateX(-Math.PI / 2), PEARL));
  gold.push(paint(new THREE.TorusGeometry(R * 1.02, R * 0.012, 4, 64).rotateX(Math.PI / 2).translate(0, R * 0.133, 0), GOLD));
  water.push(new THREE.CircleGeometry(R * 0.95, 40).rotateX(-Math.PI / 2).translate(0, R * 0.1, 0));
  const S = R / 9;
  stone.push(paint(lathe([[1.6, 0], [1.2, 0.6], [0.8, 1.6], [1.0, 3.0], [0.55, 4.2], [0.75, 6.4], [0.4, 7.6], [0.5, 9.4], [0.25, 10.6]].map(([x, y]) => [x * S, y * S]), 12), PEARL));
  const bowls = [[3.4, 4.6, 4.2], [6.8, 3.2, 2.9], [9.6, 1.9, 1.8]];
  const sprays = [];
  for (const [y, r, d] of bowls) {
    stone.push(paint(lathe([[0.3, -d * 0.35], [r * 0.6, -d * 0.3], [r * 0.95, -0.05], [r, 0.1], [r * 0.92, 0.12]].map(([x, yy]) => [x * S, (y + yy) * S]), 18), PEARL));
    gold.push(paint(new THREE.TorusGeometry(r * S, 0.06 * S, 4, 36).rotateX(Math.PI / 2).translate(0, (y + 0.1) * S, 0), GOLD));
    water.push(new THREE.CircleGeometry(r * 0.88 * S, 24).rotateX(-Math.PI / 2).translate(0, (y + 0.06) * S, 0));
    for (let i = 0; i < 8; i++) {                                   // lotus petals round each bowl
      const a = (i / 8) * Math.PI * 2;
      gold.push(paint(new THREE.SphereGeometry(r * 0.22 * S, 6, 4).scale(0.5, 0.25, 1).rotateY(-a).translate(Math.cos(a) * r * 0.95 * S, (y - 0.2) * S, Math.sin(a) * r * 0.95 * S), i % 2 ? GOLD : '#f6d58a'));
    }
    sprays.push([0, (y + 0.1) * S, 0, r * S]);
  }
  const bud = paint(lathe([[0, 0], [0.5, 0.3], [0.6, 0.8], [0.3, 1.4], [0, 1.8]].map(([x, y]) => [x * S, (10.6 + y) * S]), 8), '#e6dcff');
  return { stone: merge(stone), gold: merge(gold), water: merge(water), bud, sprays, top: 12.4 * S };
}

// A039 scroll bench, 2.4 m long
export function benchGeo() {
  return merge([
    paint(new THREE.BoxGeometry(2.4, 0.18, 0.7).translate(0, 0.48, 0), PEARL),
    paint(new THREE.BoxGeometry(2.2, 0.12, 0.6).translate(0, 0.62, 0), '#b4466a'),
    paint(new THREE.BoxGeometry(2.4, 0.7, 0.14).translate(0, 0.95, -0.3), PEARL),
    ...[-1.05, 1.05].map((x) => paint(new THREE.TorusGeometry(0.28, 0.07, 4, 10, Math.PI * 1.4).rotateY(Math.PI / 2).translate(x, 0.75, 0), GOLD)),
    ...[-1, 1].flatMap((x) => [-0.22, 0.22].map((z) => paint(new THREE.CylinderGeometry(0.07, 0.1, 0.42, 5).translate(x, 0.2, z), PEARL))),
  ]);
}

// --- materials and instancing -------------------------------------------------------------
let mats = null;
export function artifactMaterials() {
  if (mats) return mats;
  mats = {
    lit: toon('#ffffff', { vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.35 }),
    leaf: toon('#ffffff', { vertexColors: true, emissive: '#10202a', emissiveIntensity: 0.4 }),
    crystal: glowBasic('#ffffff', { vertexColors: true }),
  };
  return mats;
}
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _up = new THREE.Vector3(0, 1, 0);
// list of [x, y, z, scale, rotY, scaleY?]
export function instances(geo, mat, list, name) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  mesh.count = list.length;
  list.forEach(([x, y, z, s = 1, ry = 0, sy = s], i) => {
    _q.setFromAxisAngle(_up, ry); _p.set(x, y, z); _s.set(s, sy, s);
    mesh.setMatrixAt(i, _m.compose(_p, _q, _s));
  });
  mesh.computeBoundingSphere();
  mesh.name = name || 'instances';
  return mesh;
}

// The same, split into square tiles of `tile` metres so that tiles beyond a range can be
// hidden: call group.userData.cull(x, z, range) each frame with the camera position in the
// list's own units.
export function tiledInstances(geo, mat, list, name, tile = 400) {
  const cells = new Map();
  for (const it of list) {
    const k = Math.floor(it[0] / tile) + ',' + Math.floor(it[2] / tile);
    if (!cells.has(k)) cells.set(k, []);
    cells.get(k).push(it);
  }
  const group = new THREE.Group(); group.name = name;
  const tiles = [];
  for (const items of cells.values()) {
    const m = instances(geo, mat, items, name);
    let cx = 0, cz = 0, r = 0;
    for (const it of items) { cx += it[0] / items.length; cz += it[2] / items.length; }
    for (const it of items) r = Math.max(r, Math.hypot(it[0] - cx, it[2] - cz));
    tiles.push({ m, cx, cz, r }); group.add(m);
  }
  group.userData.cull = (x, z, range) => { for (const t of tiles) t.m.visible = Math.hypot(t.cx - x, t.cz - z) - t.r < range; };
  return group;
}
