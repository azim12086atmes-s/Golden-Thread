import * as THREE from 'three';
import { LeafKind } from './foliage';
import { M, sphere, type GeoBuilder } from './kit';
import { fbm3 } from './rocks';

/**
 * Tree species that do not grow by forking limbs (trees.ts `growTree`): palms, conifers, bamboo,
 * banana, baobab and the Sky Isles' fantasy trees. Each is built as the real plant is formed —
 * a ringed, curving palm trunk with pinnate fronds of leaf cards; tiered conifers with needle
 * sprays (snow on the spruce's tiers); jointed bamboo culms arching under leaf sprays; banana
 * paddles; a bottle-shaped baobab — and every leaf is a textured leaf card (foliage.ts), so no
 * crown is a bare blob.
 */

const UP = new THREE.Vector3(0, 1, 0), X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1);
const _q = new THREE.Quaternion(), _m = new THREE.Matrix4(), ONE = new THREE.Vector3(1, 1, 1);

/** A length of trunk or stem from p0 to p1 (a cylinder: wood, never leaves). */
function stem(g: GeoBuilder, p0: THREE.Vector3, p1: THREE.Vector3, r0: number, r1: number, col: THREE.ColorRepresentation, seg = 7): void {
  const d = new THREE.Vector3().subVectors(p1, p0), L = d.length();
  if (L < 1e-3) return;
  d.divideScalar(L);
  const geo = new THREE.CylinderGeometry(r1, r0, L + r0 * 0.3, seg, 1, true);
  geo.translate(0, (L + r0 * 0.3) / 2, 0);
  g.add(geo, col, _m.compose(p0.clone().addScaledVector(d, -r0 * 0.3), _q.setFromUnitVectors(UP, d), ONE).clone());
}

/** A leaf card at p facing n, its picture's long axis along t (e.g. a frond's spine). */
function cardAlong(g: GeoBuilder, p: THREE.Vector3, n: THREE.Vector3, t: THREE.Vector3, size: number, col: THREE.ColorRepresentation, kind: number, sway: number): void {
  const q = new THREE.Quaternion().setFromUnitVectors(Z, n);
  const u = X.clone().applyQuaternion(q), v = Y.clone().applyQuaternion(q);
  g.card(p.x, p.y, p.z, n.x, n.y, n.z, size, col, kind, sway, Math.atan2(-t.dot(u), t.dot(v)), 0);
}

const col = new THREE.Color();
const jitter = (c: string, rng: () => number, h = 0.03, l = 0.1) => col.set(c).offsetHSL((rng() - 0.5) * h, 0, (rng() - 0.5) * l).clone();

/** A curve through points (Catmull-Rom), sampled. */
function curve(pts: THREE.Vector3[], n: number): THREE.Vector3[] {
  return new THREE.CatmullRomCurve3(pts).getPoints(n);
}

// ─────────────────────────── palms ───────────────────────────

/** A date or coconut palm: a ringed curving trunk, a crown of arching pinnate fronds, fruit clusters. */
export function palm(g: GeoBuilder, x: number, y: number, z: number, s: number, rng: () => number, coconut: boolean): void {
  const h = (coconut ? 7 : 8) * s * (0.85 + rng() * 0.3), lean = rng() * Math.PI * 2, bend = (coconut ? 0.22 : 0.08) * h;
  const dir = new THREE.Vector3(Math.cos(lean), 0, Math.sin(lean));
  const spine = curve([
    new THREE.Vector3(x, y - 0.2, z),
    new THREE.Vector3(x, y + h * 0.35, z).addScaledVector(dir, bend * 0.25),
    new THREE.Vector3(x, y + h * 0.7, z).addScaledVector(dir, bend * 0.7),
    new THREE.Vector3(x, y + h, z).addScaledVector(dir, bend),
  ], 14);
  const bark = coconut ? ['#9a8266', '#86705a'] : ['#8a6a4a', '#7a5a3c'];
  const r0 = 0.24 * s, r1 = 0.16 * s;
  g.leafy = false;
  for (let i = 0; i < spine.length - 1; i++) {
    const f = i / (spine.length - 1), r = r0 + (r1 - r0) * f;
    stem(g, spine[i], spine[i + 1], r * 1.06, r, bark[i % 2]);
    // The leaf-scar rings: a slightly wider band at each segment's foot.
    stem(g, spine[i], spine[i].clone().lerp(spine[i + 1], 0.18), r * 1.14, r * 1.1, bark[(i + 1) % 2]);
  }
  // A flared foot.
  stem(g, new THREE.Vector3(x, y - 0.2, z), new THREE.Vector3(x, y + 0.5 * s, z), r0 * 1.7, r0 * 1.08, bark[0]);
  const top = spine[spine.length - 1];
  sphere(g, r1 * 1.8, coconut ? '#7a6a3a' : '#8a6a3a', top.x, top.y, top.z, 7);
  g.leafy = true;
  // Fronds: long arching spines with leaflet cards down their length.
  const nF = coconut ? 14 + Math.floor(rng() * 5) : 18 + Math.floor(rng() * 7);
  const leaf = coconut ? '#4f9a46' : '#6a9a4a';
  for (let k = 0; k < nF; k++) {
    const a = k * 2.39996 + rng() * 0.3, up = 0.55 - rng() * 0.9 - (k / nF) * 0.15; // some rise, most arch out and down
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const L = (coconut ? 4.2 : 3.8) * s * (0.8 + rng() * 0.35);
    const pts = curve([
      top.clone(),
      top.clone().addScaledVector(out, L * 0.35).add(new THREE.Vector3(0, L * (0.25 + up * 0.35), 0)),
      top.clone().addScaledVector(out, L * 0.75).add(new THREE.Vector3(0, L * (0.1 + up * 0.3), 0)),
      top.clone().addScaledVector(out, L).add(new THREE.Vector3(0, L * (-0.25 + up * 0.25), 0)),
    ], 6);
    g.leafy = false;
    for (let i = 0; i < pts.length - 1; i++) stem(g, pts[i], pts[i + 1], 0.05 * s * (1 - i / 7), 0.04 * s * (1 - i / 7), '#8a8a4a', 4);
    g.leafy = true;
    const c = jitter(leaf, rng);
    for (let i = 1; i < pts.length; i++) {
      const t = new THREE.Vector3().subVectors(pts[i], pts[i - 1]).normalize();
      const side = new THREE.Vector3().crossVectors(t, UP).normalize();
      const n = new THREE.Vector3().crossVectors(side, t).normalize();
      const size = L * 0.3 * (1 - (i / pts.length) * 0.45);
      cardAlong(g, pts[i - 1].clone().lerp(pts[i], 0.5), n, t, size, c, LeafKind.Frond, 0.6 + (i / pts.length) * 0.4);
    }
  }
  // A skirt of dead fronds hanging under the crown (date palms), and the fruit.
  if (!coconut) for (let k = 0; k < 7; k++) {
    const a = k * 0.9 + rng(), out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const p = top.clone().addScaledVector(out, 0.5 * s).add(new THREE.Vector3(0, -0.9 * s, 0));
    cardAlong(g, p, out.clone().multiplyScalar(-1).add(new THREE.Vector3(0, 0.2, 0)).normalize(), new THREE.Vector3(0, -1, 0).addScaledVector(out, 0.4).normalize(), 1.6 * s, '#a88a52', LeafKind.Frond, 0.3);
  }
  for (let k = 0; k < (coconut ? 5 : 4); k++) {
    const a = k * 1.7 + rng(), p = top.clone().add(new THREE.Vector3(Math.cos(a) * 0.35 * s, -0.35 * s, Math.sin(a) * 0.35 * s));
    if (coconut) sphere(g, 0.2 * s, '#6a7a3a', p.x, p.y, p.z, 6);
    else for (let j = 0; j < 6; j++) sphere(g, 0.1 * s, j % 2 ? '#e08a2a' : '#c86a1a', p.x + (rng() - 0.5) * 0.3 * s, p.y - j * 0.12 * s, p.z + (rng() - 0.5) * 0.3 * s, 4);
  }
}

// ─────────────────────────── conifers ───────────────────────────

/**
 * A conifer: a straight trunk with a leader, and whorls of branches, each a sweep of needle
 * cards. `form`: pine (open tiers, orange-brown upper bark, a rounded top), spruce (a dense cone
 * of drooping tiers to the ground, snow on each), cypress (a tall narrow flame).
 */
export function conifer(g: GeoBuilder, x: number, y: number, z: number, s: number, rng: () => number, form: 'pine' | 'spruce' | 'cypress', snow = false): void {
  const h = (form === 'cypress' ? 9 : form === 'spruce' ? 8 : 9) * s * (0.85 + rng() * 0.3);
  const r0 = (form === 'cypress' ? 0.18 : 0.26) * s;
  g.leafy = false;
  stem(g, new THREE.Vector3(x, y - 0.2, z), new THREE.Vector3(x, y + h * 0.55, z), r0 * 1.4, r0 * 0.8, '#6a4a32');
  stem(g, new THREE.Vector3(x, y + h * 0.55, z), new THREE.Vector3(x, y + h, z), r0 * 0.8, r0 * 0.15, form === 'pine' ? '#b0683a' : '#6a4a32');
  const needle = form === 'cypress' ? '#2f5a3a' : form === 'spruce' ? '#2a5a3e' : '#3a6a42';
  const tiers = form === 'cypress' ? 14 : form === 'spruce' ? 11 : 7;
  const bottom = form === 'spruce' ? 0.08 : form === 'cypress' ? 0.1 : 0.4;
  for (let t = 0; t < tiers; t++) {
    const f = t / (tiers - 1), ty = y + h * (bottom + (1 - bottom) * f * 0.94);
    // Crown radius at this height.
    const R = form === 'cypress' ? h * 0.13 * Math.sin(Math.min(1, f * 1.3 + 0.15) * Math.PI) * (1 - f * 0.4)
      : form === 'spruce' ? h * 0.36 * (1 - f) + 0.3 * s
        : h * 0.3 * Math.sin((0.25 + f * 0.75) * Math.PI) * 0.9 + 0.3 * s;
    const n = form === 'cypress' ? 5 : Math.max(4, Math.round(R * 2.6));
    const droop = form === 'spruce' ? 0.35 : form === 'pine' ? -0.1 : 0.05;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + t * 0.7 + rng() * 0.4, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const tip = new THREE.Vector3(x, ty - R * droop, z).addScaledVector(out, R * (0.8 + rng() * 0.3));
      if (form !== 'cypress') { g.leafy = false; stem(g, new THREE.Vector3(x, ty, z), tip, 0.06 * s, 0.02 * s, '#5a3a26', 4); }
      g.leafy = true;
      // Needle sprays along the branch, facing up and out.
      const sprays = form === 'cypress' ? 2 : 3;
      for (let j = 1; j <= sprays; j++) {
        const p = new THREE.Vector3(x, ty, z).lerp(tip, j / sprays);
        const nrm = out.clone().multiplyScalar(form === 'cypress' ? 1 : 0.55).add(new THREE.Vector3(0, form === 'cypress' ? 0.2 : 0.8, 0)).normalize();
        cardAlong(g, p, nrm, out, (form === 'cypress' ? 1.3 : 1.6) * s * (1.1 - f * 0.4), jitter(needle, rng, 0.02, 0.12), LeafKind.Needles, 0.3 + f * 0.6);
      }
      if (snow && form === 'spruce' && k % 2 === 0) {
        g.leafy = false;
        const p = new THREE.Vector3(x, ty, z).lerp(tip, 0.6);
        sphere(g, R * 0.28 + 0.2 * s, '#f4f8ff', p.x, p.y + 0.18 * s, p.z, 6, 0.3);
      }
    }
  }
  g.leafy = true;
  // A small clump at the very top.
  cardAlong(g, new THREE.Vector3(x, y + h, z), new THREE.Vector3(0.3, 1, 0).normalize(), UP, 1.1 * s, jitter(needle, rng), LeafKind.Needles, 1);
}

// ─────────────────────────── bamboo, banana, baobab ───────────────────────────

/** A clump of bamboo: jointed culms that arch at the top, with sprays of narrow leaves. */
export function bamboo(g: GeoBuilder, x: number, y: number, z: number, s: number, rng: () => number): void {
  const n = 9 + Math.floor(rng() * 10);
  for (let c = 0; c < n; c++) {
    const ox = (rng() - 0.5) * 1.8 * s, oz = (rng() - 0.5) * 1.8 * s, h = (6 + rng() * 5) * s;
    const a = Math.atan2(oz, ox) + (rng() - 0.5), arch = h * (0.12 + rng() * 0.15);
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const pts = curve([
      new THREE.Vector3(x + ox, y - 0.1, z + oz),
      new THREE.Vector3(x + ox, y + h * 0.5, z + oz).addScaledVector(out, arch * 0.15),
      new THREE.Vector3(x + ox, y + h * 0.85, z + oz).addScaledVector(out, arch * 0.55),
      new THREE.Vector3(x + ox, y + h * 0.97, z + oz).addScaledVector(out, arch),
    ], 12);
    const r = (0.05 + rng() * 0.04) * s, green = rng() < 0.2 ? '#c8b85a' : '#6aa04a';
    g.leafy = false;
    for (let i = 0; i < pts.length - 1; i++) {
      stem(g, pts[i], pts[i + 1], r, r * 0.96, green, 6);
      stem(g, pts[i + 1].clone().lerp(pts[i], 0.05), pts[i + 1], r * 1.2, r * 1.15, '#5a8a3a', 6); // the node ring
    }
    g.leafy = true;
    for (let i = Math.floor(pts.length * 0.45); i < pts.length; i++) {
      const t = new THREE.Vector3().subVectors(pts[i], pts[i - 1]).normalize();
      for (const sd of [-1, 1]) {
        const side = new THREE.Vector3().crossVectors(t, UP).normalize().multiplyScalar(sd);
        const nrm = side.clone().add(new THREE.Vector3(0, 0.6, 0)).normalize();
        cardAlong(g, pts[i].clone().addScaledVector(side, 0.35 * s), nrm, side.clone().add(new THREE.Vector3(0, -0.3, 0)).normalize(), 1.1 * s, jitter('#7ab85a', rng), LeafKind.Bamboo, 0.8);
      }
    }
  }
}

/** A banana plant: a fleshy pseudostem, huge paddle leaves (some torn), a hanging bunch with a purple bud. */
export function banana(g: GeoBuilder, x: number, y: number, z: number, s: number, rng: () => number): void {
  const h = (2.6 + rng() * 1.2) * s, top = new THREE.Vector3(x, y + h, z);
  g.leafy = false;
  stem(g, new THREE.Vector3(x, y - 0.1, z), top, 0.2 * s, 0.14 * s, '#8aa35a', 8);
  const n = 6 + Math.floor(rng() * 5);
  for (let k = 0; k < n; k++) {
    const a = k * 2.39996 + rng() * 0.4, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), up = 0.9 - (k / n) * 1.1;
    const L = (2 + rng()) * s;
    const pts = curve([top.clone(), top.clone().addScaledVector(out, L * 0.4).add(new THREE.Vector3(0, L * 0.35 * up + 0.3, 0)), top.clone().addScaledVector(out, L).add(new THREE.Vector3(0, L * 0.3 * up - 0.4 * s, 0))], 4);
    g.leafy = false;
    for (let i = 0; i < pts.length - 1; i++) stem(g, pts[i], pts[i + 1], 0.05 * s, 0.03 * s, '#7a9a4a', 4);
    g.leafy = true;
    for (let i = 1; i < pts.length; i++) {
      const t = new THREE.Vector3().subVectors(pts[i], pts[i - 1]).normalize();
      const side = new THREE.Vector3().crossVectors(t, UP).normalize(), nrm = new THREE.Vector3().crossVectors(side, t).normalize();
      cardAlong(g, pts[i - 1].clone().lerp(pts[i], 0.5), nrm, t, L * 0.5, jitter('#5aa84a', rng), LeafKind.Banana, 0.7);
    }
  }
  g.leafy = false;
  const b = top.clone().add(new THREE.Vector3(0.3 * s, -0.4 * s, 0));
  for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) {
    const a = (j / 4) * Math.PI * 2 + i;
    g.add(new THREE.CylinderGeometry(0.03 * s, 0.05 * s, 0.35 * s, 5), '#8ab83a', M(b.x + Math.cos(a) * 0.14 * s, b.y - i * 0.18 * s, b.z + Math.sin(a) * 0.14 * s, 0, 1, 1, 1, Math.sin(a) * 0.5, -Math.cos(a) * 0.5));
  }
  sphere(g, 0.14 * s, '#7a2a5a', b.x, b.y - 1.1 * s, b.z, 7, 1.5);
  g.leafy = true;
}

/** A baobab: a vast bottle-shaped trunk, stubby branches like roots at the top, sparse small leaves. */
export function baobab(g: GeoBuilder, x: number, y: number, z: number, s: number, rng: () => number): void {
  const h = (6 + rng() * 2) * s, R = (1.2 + rng() * 0.4) * s, seed = Math.floor(rng() * 999);
  const prof: THREE.Vector2[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    prof.push(new THREE.Vector2(R * (1.15 - 0.35 * t + 0.25 * Math.sin(t * Math.PI) - (t > 0.85 ? (t - 0.85) * 3 : 0)), t * h - 0.3));
  }
  const trunk = new THREE.LatheGeometry(prof, 14);
  const pos = trunk.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const px = pos.getX(i), py = pos.getY(i), pz = pos.getZ(i), k = 1 + fbm3(px * 0.5, py * 0.3, pz * 0.5, seed, 3) * 0.25;
    pos.setXYZ(i, px * k, py, pz * k);
  }
  trunk.computeVertexNormals();
  g.leafy = false;
  g.add(trunk, '#a8927a', M(x, y, z));
  const crownY = y + h - 0.3;
  const nB = 6 + Math.floor(rng() * 4);
  g.leafy = true;
  for (let k = 0; k < nB; k++) {
    const a = (k / nB) * Math.PI * 2 + rng() * 0.4, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const p0 = new THREE.Vector3(x, crownY, z).addScaledVector(out, R * 0.4);
    const p1 = p0.clone().addScaledVector(out, (1.5 + rng()) * s).add(new THREE.Vector3(0, (0.8 + rng() * 0.8) * s, 0));
    const p2 = p1.clone().addScaledVector(out, 0.8 * s).add(new THREE.Vector3((rng() - 0.5) * s, 0.5 * s, (rng() - 0.5) * s));
    g.leafy = false;
    stem(g, p0, p1, 0.3 * s, 0.16 * s, '#a0886e', 6);
    stem(g, p1, p2, 0.16 * s, 0.06 * s, '#a0886e', 5);
    g.leafy = true;
    for (let j = 0; j < 2; j++) cardAlong(g, p2.clone().add(new THREE.Vector3((rng() - 0.5) * 0.6 * s, 0.2 * s, (rng() - 0.5) * 0.6 * s)), new THREE.Vector3(out.x * 0.5, 1, out.z * 0.5).normalize(), out, 1.2 * s, jitter('#6a9a4a', rng), LeafKind.Small, 0.5);
  }
}

// ─────────────────────────── the Sky Isles ───────────────────────────

/**
 * Crystal-fruit trees: silver bark, a spreading crown of crystal leaves (cards), small gem fruit.
 * (The branching of the other fantasy trees — cloud willows, candy blossom, glow trees — is in
 * trees.ts HABITS; this one needs its gem fruit.)
 */
export function crystalFruitTree(g: GeoBuilder, x: number, y: number, z: number, s: number, rng: () => number): void {
  const h = (4.5 + rng() * 1.5) * s, top = new THREE.Vector3(x, y + h * 0.55, z);
  g.leafy = false;
  stem(g, new THREE.Vector3(x, y - 0.2, z), top, 0.22 * s, 0.14 * s, '#d8dcec');
  const gems = ['#9ae8ff', '#ffb8f0', '#fff08a', '#b8ffcc', '#c8b8ff'];
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + rng() * 0.5, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const tip = top.clone().addScaledVector(out, (1.4 + rng() * 0.8) * s).add(new THREE.Vector3(0, (1.2 + rng()) * s, 0));
    g.leafy = false;
    stem(g, top, tip, 0.1 * s, 0.04 * s, '#c8cce0', 5);
    g.leafy = true;
    for (let j = 0; j < 4; j++) {
      const p = tip.clone().add(new THREE.Vector3((rng() - 0.5) * 1.2 * s, (rng() - 0.3) * 0.8 * s, (rng() - 0.5) * 1.2 * s));
      cardAlong(g, p, new THREE.Vector3().subVectors(p, top).normalize(), UP, 1.3 * s, jitter('#c8e8ff', rng, 0.1, 0.1), LeafKind.Crystal, 0.6);
    }
    g.leafy = false;
    for (let j = 0; j < 2; j++) {
      const p = tip.clone().add(new THREE.Vector3((rng() - 0.5) * s, -0.4 * s, (rng() - 0.5) * s));
      g.add(new THREE.OctahedronGeometry(0.12 * s), gems[(k + j) % gems.length], M(p.x, p.y, p.z, rng() * 3, 1, 1.5, 1));
    }
  }
  g.leafy = true;
}
