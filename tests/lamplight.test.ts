import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LAMP_MAX, LAMP_UNIFORMS, setLamps, type Lamp } from '../src/world/lamplight';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGIONS, regionCenter } from '../src/world/regions';

const solid = new THREE.MeshStandardMaterial(), glow = new THREE.MeshBasicMaterial();

describe('lamplight', () => {
  it('every town records its street, door and gate lamps, each lit in one of its lantern colours', () => {
    for (const r of REGIONS) {
      const inst = buildRegion(r, solid, glow);
      const c = regionCenter(r);
      // Door lamps at least, and street lamps along the avenues everywhere but the Sky Isles.
      expect(inst.lamps.length, r.id).toBeGreaterThan(r.id === 'skyisles' ? 20 : 60);
      for (const l of inst.lamps) {
        expect(Math.hypot(l.x - c.x, l.z - c.z), r.id).toBeLessThan(600);
        expect(l.r).toBeGreaterThan(3);
        expect(l.r).toBeLessThan(10);
        expect(l.color).toMatch(/^#[0-9a-f]{6}$/i);
      }
    }
  }, 300_000);

  it('lights only after dusk, the nearest lamps first, the farthest chosen fading so none pops', () => {
    const lamps: Lamp[] = Array.from({ length: 60 }, (_, i) => ({ x: i * 2, y: 3, z: 0, r: 8, color: '#ffcc88' }));
    const p = new THREE.Vector3(0, 0, 0);
    setLamps(lamps, p, 0);
    expect(LAMP_UNIFORMS.uLampOn.value).toBe(0);
    setLamps(lamps, p, 1);
    expect(LAMP_UNIFORMS.uLampOn.value).toBe(1);
    const U = LAMP_UNIFORMS.uLamps.value, C = LAMP_UNIFORMS.uLampCol.value;
    for (let i = 0; i < LAMP_MAX; i++) expect(U[i].x).toBe(i * 2);
    // The nearest shines fully; the last of the set is all but faded out.
    expect(C[0].r).toBeGreaterThan(1);
    expect(C[LAMP_MAX - 1].r).toBeLessThan(C[0].r * 0.1);
    // Fewer lamps than slots: the rest are parked far below the world, dark.
    setLamps(lamps.slice(0, 3), p, 1);
    expect(U[5].y).toBeLessThan(-1000);
    expect(C[5].r).toBe(0);
  });
});
