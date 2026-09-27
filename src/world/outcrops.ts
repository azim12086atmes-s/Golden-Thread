import type { Ctx } from './architecture';
import { CRYSTAL_PAL } from './islands';
import { M, sphere } from './kit';
import type { RegionId } from './regions';
import { hoodooGeometry, rockGeometry, shardGeometry } from './rocks';

/**
 * Rock outcrops out in each land's country, of the land's own kind (rocks.ts), `s` metres across.
 * Built at the builder's current frame on the ground.
 */
export type OutcropStyle = 'sandstone' | 'crag' | 'ice' | 'crystal';

export const OUTCROPS: Partial<Record<RegionId, { style: OutcropStyle; n: number; size: number }>> = {
  desert: { style: 'sandstone', n: 26, size: 1.2 },
  egypt: { style: 'sandstone', n: 14, size: 1 },
  middleeast: { style: 'sandstone', n: 16, size: 1 },
  indianorth: { style: 'sandstone', n: 10, size: 0.8 },
  aurora: { style: 'ice', n: 22, size: 1 },
  switzerland: { style: 'crag', n: 16, size: 1.1 },
  norway: { style: 'crag', n: 18, size: 1.1 },
  skyisles: { style: 'crystal', n: 18, size: 1 },
  korea: { style: 'crag', n: 8, size: 0.8 },
  china: { style: 'crag', n: 10, size: 0.9 },
};

const COL: Record<OutcropStyle, [string, string, string]> = {
  sandstone: ['#c98a5a', '#b5764a', '#e0b07a'],
  crag: ['#7a7470', '#5e5854', '#9a948c'],
  ice: ['#cfe8ff', '#a8d0f0', '#eef8ff'],
  crystal: ['#dcd6ee', '#bcb4dc', '#f4f0ff'],
};

export function outcrop(c: Ctx, style: OutcropStyle, s: number, seed: number): void {
  const [a, b, hi] = COL[style], r = () => c.rng.next();
  switch (style) {
    case 'sandstone':
      // A layered mesa or a group of hoodoos, with fallen blocks round the foot.
      if (r() < 0.45) {
        const n = 2 + Math.floor(r() * 4);
        for (let k = 0; k < n; k++) {
          const ang = r() * Math.PI * 2, d = k ? s * (0.4 + r() * 0.6) : 0;
          c.g.add(hoodooGeometry(s * (1.2 + r() * 1.4), seed + k), k % 2 ? a : hi, M(Math.cos(ang) * d, -0.3, Math.sin(ang) * d, r() * 6));
        }
      } else {
        c.g.add(rockGeometry(s, { style: 'sandstone', seed, tall: 0.5 + r() * 0.6 }), a);
      }
      for (let k = 0; k < 4; k++) {
        const ang = r() * Math.PI * 2, d = s * (0.9 + r() * 0.5);
        c.g.add(rockGeometry(s * (0.12 + r() * 0.18), { style: 'sandstone', seed: seed + 20 + k, detail: 2 }), b, M(Math.cos(ang) * d, 0, Math.sin(ang) * d, r() * 6));
      }
      break;
    case 'crag':
      c.g.add(rockGeometry(s, { style: 'crag', seed }), a);
      for (let k = 0; k < 3; k++) {
        const ang = r() * Math.PI * 2, d = s * (0.8 + r() * 0.5);
        c.g.add(rockGeometry(s * (0.25 + r() * 0.25), { style: 'crag', seed: seed + 10 + k, detail: 2 }), k % 2 ? b : hi, M(Math.cos(ang) * d, 0, Math.sin(ang) * d, r() * 6));
      }
      break;
    case 'ice': {
      // A low mound of ice with shards of blue ice breaking out of it at every angle.
      c.g.add(rockGeometry(s * 0.7, { style: 'ice', seed, tall: 0.5 }), b);
      const n = 5 + Math.floor(r() * 6);
      for (let k = 0; k < n; k++) {
        const ang = r() * Math.PI * 2, d = s * r() * 0.6, h = s * (0.6 + r() * 1.3), tilt = 0.15 + r() * 0.5;
        c.g.add(shardGeometry(h, h * (0.12 + r() * 0.1), seed + k), k % 3 ? a : hi,
          M(Math.cos(ang) * d, -0.2, Math.sin(ang) * d, 0, 1, 1, 1, Math.sin(ang) * tilt, -Math.cos(ang) * tilt));
      }
      break;
    }
    case 'crystal': {
      // A giant crystal spray: great pastel crystals growing outward from a pale stone, tips alight.
      c.g.add(rockGeometry(s * 0.5, { style: 'crag', seed, tall: 0.5 }), a);
      const n = 6 + Math.floor(r() * 6);
      for (let k = 0; k < n; k++) {
        const ang = (k / n) * Math.PI * 2 + r() * 0.5, h = s * (0.8 + r() * 1.8), w = h * (0.12 + r() * 0.08), tilt = k === 0 ? 0.05 : 0.3 + r() * 0.6;
        const col = CRYSTAL_PAL[(k + seed) % CRYSTAL_PAL.length];
        const rx = Math.sin(ang) * tilt, rz = -Math.cos(ang) * tilt, x = Math.cos(ang) * s * 0.2, z = Math.sin(ang) * s * 0.2;
        c.g.add(shardGeometry(h, w, seed + k), col, M(x, 0, z, 0, 1, 1, 1, rx, rz));
        // The tip: h along the tilted axis (Euler x then z, as M builds it).
        const tx = -Math.sin(rz) * h, ty = Math.cos(rz) * Math.cos(rx) * h, tz = Math.cos(rz) * Math.sin(rx) * h;
        sphere(c.glow, w * 0.3, col, x + tx, ty, z + tz, 5, 1.6);
      }
      break;
    }
  }
}
