import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { CHUNK, buildTerrainChunk, duneShape, terrainHeight } from '../src/world/terrain';
import { REGION_BY_ID, regionCenter } from '../src/world/regions';

const mat = new THREE.MeshBasicMaterial();

/** Normal and world position of every vertex on a chunk's edge. */
function edge(cx: number, cz: number, side: 'east' | 'west') {
  const m = buildTerrainChunk(cx, cz, mat);
  const p = m.geometry.getAttribute('position'), n = m.geometry.getAttribute('normal');
  const out = new Map<number, THREE.Vector3>();
  const x = side === 'east' ? CHUNK / 2 : -CHUNK / 2;
  for (let i = 0; i < p.count; i++) if (Math.abs(p.getX(i) - x) < 1e-3) out.set(Math.round(p.getZ(i) + cz * CHUNK), new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)));
  return out;
}

describe('smooth ground', () => {
  it('neighbouring chunks share the same normals along their edge (no seams)', () => {
    const c = regionCenter(REGION_BY_ID.switzerland);
    const cx = Math.round((c.x + 400) / CHUNK), cz = Math.round((c.z + 300) / CHUNK);
    const a = edge(cx, cz, 'east'), b = edge(cx + 1, cz, 'west');
    expect(a.size).toBeGreaterThan(20);
    for (const [z, na] of a) expect(na.distanceTo(b.get(z)!), `z ${z}`).toBeLessThan(1e-4);
  });

  it('normals point up and are unit length', () => {
    const m = buildTerrainChunk(2, 1, mat), n = m.geometry.getAttribute('normal');
    for (let i = 0; i < n.count; i += 37) {
      expect(n.getY(i)).toBeGreaterThan(0);
      expect(Math.hypot(n.getX(i), n.getY(i), n.getZ(i))).toBeCloseTo(1, 4);
    }
  });
});

describe('dunes in the sand seas', () => {
  it('the dune profile rises gently and falls steeply', () => {
    let rises = 0, falls = 0;
    // Walk along the wind and count gentle and steep steps.
    for (let s = 0; s < 400; s++) {
      const d = duneShape(s * 0.92, s * 0.38) - duneShape((s - 1) * 0.92, (s - 1) * 0.38);
      if (d > 0.002) rises++; else if (d < -0.002) falls++;
    }
    expect(rises).toBeGreaterThan(falls * 2);
  });

  it('open desert rolls with dunes; the town core stays level', () => {
    const c = regionCenter(REGION_BY_ID.desert);
    const range = (x0: number, z0: number) => {
      let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < 60; i++) { const h = terrainHeight(x0 + i * 2.5, z0 + i * 1.1); lo = Math.min(lo, h); hi = Math.max(hi, h); }
      return hi - lo;
    };
    expect(range(c.x + 250, c.z - 330)).toBeGreaterThan(3);
    expect(range(c.x - 60, c.z - 10)).toBeLessThan(2);
  });
});
