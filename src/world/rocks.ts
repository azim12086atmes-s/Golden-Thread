import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Organic rock: a sphere pushed about by layered 3-D noise into a real shape — craggy ridges,
 * wind-carved ledges, overhangs and hollows — rather than a blob. The same generator makes the
 * lands' boulders and outcrops, desert hoodoos and the caves' mounds (models/caves.ts).
 *
 * Styles:
 * - `sandstone`: wide and layered — horizontal strata with ledges and undercuts where wind has
 *   worn the softer bands away.
 * - `crag`: taller, split by sharp ridges (granite, basalt).
 * - `ice`: smoother, sheared into facets, as if broken off a glacier.
 * - `pebble`: small, rounded, water-worn.
 */
export type RockStyle = 'sandstone' | 'crag' | 'ice' | 'pebble';

function hash3(x: number, y: number, z: number, seed: number): number {
  const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.3) * 43758.5453;
  return v - Math.floor(v);
}
function noise3(x: number, y: number, z: number, seed: number): number {
  const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
  const f = x - i, g = y - j, h = z - k;
  const u = f * f * (3 - 2 * f), v = g * g * (3 - 2 * g), w = h * h * (3 - 2 * h);
  const L = (a: number, b: number, t: number) => a + (b - a) * t;
  const c = (a: number, b: number, d: number) => hash3(i + a, j + b, k + d, seed);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v), L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}
/** Fractal noise −0.5 … 0.5, octaves rotated so no direction is favoured. */
export function fbm3(x: number, y: number, z: number, seed: number, oct = 4): number {
  let a = 0.5, s = 0, n = 0;
  for (let o = 0; o < oct; o++) {
    s += a * (noise3(x, y, z, seed + o) - 0.5);
    n += a;
    const nx = x * 0.8 + z * 0.6, nz = -x * 0.6 + z * 0.8;
    x = nx * 2.03; y = y * 2.03 + 1.7; z = nz * 2.03;
    a *= 0.5;
  }
  return s / n;
}

export interface RockOpts {
  style: RockStyle;
  /** Height over width (1: as tall as wide). */
  tall?: number;
  /** A cave mouth carved into the +z face: its half-width and height as fractions of the radius. */
  mouth?: { w: number; h: number };
  seed?: number;
  detail?: number;
  /** Keep it round in plan (a cave's mouth depth must be predictable). */
  noSquash?: boolean;
}

/**
 * A rock `r` metres in radius standing on y = 0 (sunk a little into the ground), with smooth
 * normals. Returns its geometry for GeoBuilder.add.
 */
export function rockGeometry(r: number, o: RockOpts): THREE.BufferGeometry {
  const seed = o.seed ?? 1, tall = o.tall ?? (o.style === 'crag' ? 0.9 : o.style === 'sandstone' ? 0.6 : o.style === 'pebble' ? 0.45 : 0.8);
  const base = new THREE.IcosahedronGeometry(1, o.detail ?? (r > 6 ? 5 : r > 2 ? 3 : 2));
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const geo = mergeVertices(base);
  base.dispose();
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  // A lean and a squash of its own, so no two rocks share a silhouette.
  const lean = new THREE.Vector2(hash3(seed, 1, 2, 3) - 0.5, hash3(seed, 4, 5, 6) - 0.5).multiplyScalar(0.5);
  const sx = o.noSquash ? 1 : 0.8 + hash3(seed, 7, 8, 9) * 0.45, sz = o.noSquash ? 1 : 0.8 + hash3(seed, 9, 8, 7) * 0.45;
  if (o.noSquash) lean.multiplyScalar(0.3);
  const bands = 5 + Math.floor(hash3(seed, 2, 2, 2) * 4);
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const up = v.y;
    let d = 1;
    switch (o.style) {
      case 'sandstone': {
        d += fbm3(v.x * 1.4, v.y * 1.4, v.z * 1.4, seed) * 0.55;
        // Strata: each band bulges out as a ledge and is undercut beneath (soft rock worn away).
        const t = (up * 0.5 + 0.5) * bands + fbm3(v.x * 2, 0, v.z * 2, seed + 5) * 0.8;
        const f = t - Math.floor(t);
        d *= 1 - 0.13 * Math.pow(1 - f, 3) + 0.03 * f;
        break;
      }
      case 'crag': {
        const n = fbm3(v.x * 1.7, v.y * 1.3, v.z * 1.7, seed);
        // Ridges: sharp creases where the noise turns over.
        d += n * 0.4 + (0.18 - Math.abs(fbm3(v.x * 2.6, v.y * 2.6, v.z * 2.6, seed + 3))) * 0.45;
        break;
      }
      case 'ice': {
        d += fbm3(v.x * 1.2, v.y * 1.2, v.z * 1.2, seed) * 0.35;
        // Shear planes: quantise the surface a little, so it breaks into facets.
        const q = Math.round(d * 7) / 7;
        d = d * 0.55 + q * 0.45;
        break;
      }
      case 'pebble':
        d += fbm3(v.x * 1.1, v.y * 1.1, v.z * 1.1, seed, 2) * 0.28;
        break;
    }
    // The cave mouth: an alcove pushed deep into the front face.
    if (o.mouth && v.z > 0.2) {
      const mx = Math.abs(v.x) / o.mouth.w, my = (up + 0.35) / (o.mouth.h + 0.35);
      const inMouth = Math.max(0, 1 - Math.hypot(mx, Math.max(0, my - 0.4) * 1.6));
      d *= 1 - 0.55 * Math.pow(inMouth, 0.6) * THREE.MathUtils.smoothstep(v.z, 0.2, 0.7);
    }
    let x = v.x * d * sx, y = v.y * d * tall, z = v.z * d * sz;
    // Lean with height, and sit it on the ground: the base flattens and sinks.
    const hgt = Math.max(0, y);
    x += lean.x * hgt; z += lean.y * hgt;
    if (y < -0.12) y = -0.12 - (y + 0.12) * 0.15;
    pos.setXYZ(i, x * r, (y + 0.08) * r, z * r);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A desert hoodoo: a column of layered rock, narrow in the middle, with a harder cap on top. */
export function hoodooGeometry(h: number, seed: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  const n = 18;
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    // Waisted: wide foot, narrow neck, a cap that overhangs.
    let r = 0.55 - 0.3 * Math.sin(t * Math.PI * 0.85) + (t > 0.82 ? 0.35 * Math.sin(((t - 0.82) / 0.18) * Math.PI) : 0);
    r *= 1 + 0.12 * Math.sin(t * 23 + seed) * (t < 0.8 ? 1 : 0);
    pts.push(new THREE.Vector2(Math.max(0.05, r) * h * 0.28, t * h));
  }
  pts.push(new THREE.Vector2(0, h));
  const geo = new THREE.LatheGeometry(pts, 11);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 1 + fbm3(x * 0.6, y * 0.3, z * 0.6, seed, 3) * 0.5;
    pos.setXYZ(i, x * k, y, z * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** A sharp shard (ice or crystal): a four- to six-sided spike, facets uneven, `h` tall. */
export function shardGeometry(h: number, w: number, seed: number): THREE.BufferGeometry {
  const sides = 4 + Math.floor(hash3(seed, 3, 1, 4) * 3);
  const geo = new THREE.ConeGeometry(w, h, sides, 3);
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const k = 1 + (hash3(Math.round(x * 50), Math.round(y * 50), Math.round(z * 50), seed) - 0.5) * 0.35;
    pos.setXYZ(i, x * k, y, z * k);
  }
  geo.translate(0, h / 2, 0);
  geo.computeVertexNormals();
  return geo;
}
