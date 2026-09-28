import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { DRESS, dressRoom } from '../src/world/interiorDress';
import { buildInterior3d } from '../src/world/interiors3d';
import { GeoBuilder } from '../src/world/kit';
import { REGIONS } from '../src/world/regions';

describe("rooms dressed as their land's interiors", () => {
  it("gives every land its own floor, walls, ceiling and lamps (not one generic room)", () => {
    const looks = new Set(REGIONS.map((r) => { const d = DRESS[r.id]; return `${d.floor}/${d.dado}/${d.ceiling}/${d.lamp}`; }));
    expect(looks.size).toBeGreaterThanOrEqual(18);
    expect(new Set(REGIONS.map((r) => DRESS[r.id].floor)).size).toBeGreaterThanOrEqual(14);
  });

  it('builds every land inside its walls, with something lit', () => {
    for (const r of REGIONS) {
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const inset = dressRoom({ g, glow, rng: new Rng(r.id), land: r.id, night: 1 }, 6, -8, 4, 4.4);
      expect(inset, r.id).toBeGreaterThan(0);
      const box = new THREE.Box3().setFromObject(g.build(new THREE.MeshStandardMaterial())!);
      expect(box.min.x, r.id).toBeGreaterThan(-6.5);
      expect(box.max.x, r.id).toBeLessThan(6.5);
      expect(box.min.z, r.id).toBeGreaterThan(-8.5);
      expect(box.max.z, r.id).toBeLessThan(4.5);
      expect(box.max.y, r.id).toBeLessThan(4.4 + 3.6); // a pitched roof, a vault or a dome at most
      expect(glow.build(new THREE.MeshBasicMaterial()), r.id).not.toBeNull();
    }
  });

  it("dresses each land's institutes and monument halls, the two still seated apart", () => {
    for (const r of REGIONS) for (const spec of [{ kind: 'institute' as const, ref: 'school', stage: 2 }, { kind: 'landmark' as const }]) {
      const b = buildInterior3d({ ...spec, land: r.id, night: 0, seed: r.id })!;
      expect(b, r.id).not.toBeNull();
      const [p, q] = b.seats;
      expect(Math.hypot(p[0] - q[0], p[2] - q[2]), r.id).toBeGreaterThanOrEqual(2.2);
    }
  });
});
