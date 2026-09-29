import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DESIGNS, makeDesign } from '../src/traffic/designs';
import { SHIP_DESIGNS } from '../src/traffic/ships';
import { SEA_TRAFFIC, SHIP_LINE } from '../src/traffic/roster';

const bounds = (id: string) => {
  const b = new THREE.Box3();
  for (const p of makeDesign(id).pieces) for (const g of [p.solid, p.glow]) if (g) { g.computeBoundingBox(); b.union(g.boundingBox!); }
  return b;
};

describe('ships', () => {
  it('every ship the sea lanes and shipping lines want now exists (no stand-ins sail)', () => {
    for (const list of Object.values(SEA_TRAFFIC)) for (const [wanted] of list!) expect(DESIGNS[wanted], wanted).toBeDefined();
    for (const [wanted] of Object.values(SHIP_LINE)) expect(DESIGNS[wanted!], wanted).toBeDefined();
  });

  it('each sits in the water at its waterline, fits the lanes, and is built to its size', () => {
    const want: Record<string, [number, number]> = {
      'cargo-ship': [60, 90], 'container-ship': [80, 120], 'ocean-liner': [90, 120], 'cruise-ship': [90, 120], 'ferry-large': [50, 70],
      'fishing-trawler': [20, 30], 'hurtigruten': [50, 70], 'dhow-large': [30, 40], 'junk-large': [40, 60], 'phinisi-large': [30, 50],
      'kettuvallam-large': [25, 30], 'full-rigger': [45, 55], 'hospital-ship': [70, 90], 'research-vessel': [50, 70], 'sky-galleon': [35, 45],
    };
    for (const id of Object.keys(SHIP_DESIGNS)) {
      const d = makeDesign(id), b = bounds(id);
      expect(d.len, id).toBeGreaterThanOrEqual(want[id][0]);
      expect(d.len, id).toBeLessThanOrEqual(want[id][1]);
      expect(b.max.z - b.min.z, id).toBeLessThan(125);
      if (d.realm === 'water') {
        expect(b.min.y, `${id} keel below the water`).toBeLessThan(-0.5);
        expect(b.max.y, `${id} above the water`).toBeGreaterThan(3);
        expect(d.speed).toBeGreaterThanOrEqual(2);
        expect(d.speed).toBeLessThanOrEqual(4);
      } else expect(d.realm).toBe('sky');
      // Within the handoff's budget of 12 k triangles.
      let tris = 0;
      for (const p of d.pieces) for (const g of [p.solid, p.glow]) if (g) tris += (g.index ? g.index.count : g.getAttribute('position').count) / 3;
      expect(tris, `${id} triangles`).toBeLessThan(12_000);
    }
  });
});
