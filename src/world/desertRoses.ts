import * as THREE from 'three';
import type { RegionId } from './regions';
import type { GeoBuilder } from './kit';

/**
 * Desert roses (owner: "add desert roses in deserts, and make them bigger"): gypsum and sand
 * crystallised into rosettes of thin, cupped blades, like the petals of a stone flower. A little
 * one is a single rosette half buried in the sand; a great one is a whole bouquet of them, taller
 * than the travellers, with rosettes growing out of rosettes. The sand colours run from pale
 * cream at the petal tips to a darker, dusted buff near the ground, with a blush of pink.
 */

/** How thickly desert roses grow in each land's sand (1: the Rimal desert itself). */
export const ROSE_LANDS: Partial<Record<RegionId, number>> = { desert: 1, middleeast: 0.5, egypt: 0.35 };

const SAND = ['#dcb892', '#e6c7a2', '#cfa47c', '#ebd3b4', '#d8ab8e', '#e2bca0'];

/** One blade: a thin lens, cupped upwards, 1 m across (made once, placed many times). */
let petalGeo: THREE.BufferGeometry | null = null;
function petal(): THREE.BufferGeometry {
  if (!petalGeo) {
    const g = new THREE.SphereGeometry(1, 7, 3);
    const p = g.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      p.setY(i, y * 0.07 + 0.2 * (x * x + z * z));
      // A wavy rim, as real blades have.
      const a = Math.atan2(z, x), w = 1 + 0.06 * Math.sin(a * 5);
      p.setX(i, x * w); p.setZ(i, z * w * 0.82);
    }
    g.deleteAttribute('uv');
    g.computeVertexNormals();
    petalGeo = g;
  }
  return petalGeo.clone();
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();
const _c = new THREE.Color();

/** One rosette, `r` across its widest petals, centred on (x, y, z): two or three tiers of blades opening outwards. */
function rosette(g: GeoBuilder, x: number, y: number, z: number, r: number, rng: () => number): void {
  const tiers = 2 + (rng() < 0.5 ? 1 : 0);
  for (let t = 0; t < tiers; t++) {
    const n = 6 + Math.floor(rng() * 4), k = t / tiers;
    const ty = y + r * (0.08 + k * 0.42), open = 1.25 - k * 0.55;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.6 + (rng() - 0.5) * 0.5;
      const pr = r * (0.55 - k * 0.2) * (0.8 + rng() * 0.4);
      _p.set(x + Math.cos(a) * pr * 0.45, ty + (rng() - 0.5) * r * 0.08, z + Math.sin(a) * pr * 0.45);
      // Each blade faces outwards, tipped up from lying flat by `open` (the inner ones stand taller).
      _e.set(0, -a + Math.PI / 2, 0, 'YXZ');
      _q.setFromEuler(_e).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -(Math.PI / 2 - open) + (rng() - 0.5) * 0.3));
      _s.set(pr, pr, pr);
      const low = Math.max(0, 1 - (ty - y) / r);
      _c.set(SAND[Math.floor(rng() * SAND.length)]).offsetHSL((rng() - 0.5) * 0.02, 0, (rng() - 0.5) * 0.06 - low * 0.08);
      g.add(petal(), _c, _m.compose(_p, _q, _s).clone());
    }
  }
  // The heart: a small upright blade or two.
  for (let i = 0; i < 2; i++) {
    _p.set(x, y + r * 0.45, z);
    _q.setFromEuler(_e.set(Math.PI / 2 - 0.2, rng() * Math.PI, 0));
    _s.setScalar(r * 0.22);
    g.add(petal(), _c.set(SAND[3]), _m.compose(_p, _q, _s).clone());
  }
}

/**
 * A desert rose `size` metres tall at (x, y, z) on the sand. Under a metre it is one rosette; a
 * great one is a bouquet: rosettes crowded round a tall one, some tipped on their sides, some
 * growing out higher up. Returns its footprint radius (for a collider).
 */
export function desertRose(g: GeoBuilder, x: number, y: number, z: number, size: number, rng: () => number): number {
  const base = y - size * 0.08;
  if (size < 1.2) { rosette(g, x, base, z, size, rng); return size * 0.45; }
  const n = 3 + Math.floor(size * 0.8);
  let reach = 0;
  for (let i = 0; i < n; i++) {
    const a = rng() * Math.PI * 2, d = i === 0 ? 0 : size * (0.2 + rng() * 0.35);
    const r = size * (i === 0 ? 0.62 : 0.3 + rng() * 0.25);
    // The later ones climb the pile: rosettes growing out of rosettes.
    const up = i === 0 ? 0 : size * rng() * 0.45;
    rosette(g, x + Math.cos(a) * d, base + up, z + Math.sin(a) * d, r, rng);
    reach = Math.max(reach, d + r * 0.5);
  }
  return reach;
}
