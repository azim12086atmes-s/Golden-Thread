import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { GeoBuilder } from '../src/world/kit';
import { CIVIC_LABEL, CIVIC_R, buildMarket, buildWorship, civicColliders, civicDoor, civicOf } from '../src/world/neighbourhood';
import { reservedAt } from '../src/world/reserved';
import { squaresOf, SQUARE_R } from '../src/world/landWaters';
import { INSTITUTE_SITES, SITE_SIZE } from '../src/institutions/sites';
import { PLOTS, PLOT_SIZE } from '../src/world/plots';
import { REGIONS, regionCenter } from '../src/world/regions';

describe("each town's neighbourhood", () => {
  it('finds a place of worship and a market in every town on the ground, clear of everything kept', () => {
    for (const r of REGIONS) {
      const spots = civicOf(r.id);
      if (r.id === 'skyisles') { expect(spots).toEqual([]); continue; }
      expect(spots.map((q) => q.kind).sort(), r.id).toEqual(['market', 'worship']);
      const c = regionCenter(r);
      for (const q of spots) {
        expect(reservedAt(r.id, q.x, q.z, CIVIC_R), r.id).toBe(false);
        for (const s of squaresOf(r.id)) expect(Math.hypot(q.x - s.x, q.z - s.z), r.id).toBeGreaterThan(SQUARE_R + CIVIC_R);
        for (const s of INSTITUTE_SITES.filter((s) => s.land === r.id)) expect(Math.max(Math.abs(c.x + q.x - s.x), Math.abs(c.z + q.z - s.z)), r.id).toBeGreaterThan(SITE_SIZE / 2 + CIVIC_R);
        for (const p of PLOTS.filter((p) => p.region === r.id)) expect(Math.max(Math.abs(c.x + q.x - p.x), Math.abs(c.z + q.z - p.z)), r.id).toBeGreaterThan(PLOT_SIZE / 2 + CIVIC_R);
      }
    }
  });

  it("builds each land's own place of worship and market within their grounds", () => {
    const sizes = new Set<string>();
    for (const r of REGIONS) {
      if (r.id === 'skyisles') continue;
      for (const build of [buildWorship, buildMarket]) {
        const g = new GeoBuilder(), glow = new GeoBuilder();
        build({ g, glow, rng: new Rng(`n:${r.id}`), s: r });
        const m = g.build(new THREE.MeshStandardMaterial());
        expect(m, r.id).not.toBeNull();
        const box = new THREE.Box3().setFromObject(m!);
        for (const v of [box.min.x, box.max.x, box.min.z, box.max.z]) expect(Math.abs(v), `${r.id} ${build.name}`).toBeLessThanOrEqual(CIVIC_R + 0.5);
        expect(box.max.y, `${r.id} ${build.name}`).toBeGreaterThan(3);
        sizes.add(`${build.name}:${box.max.x.toFixed(1)}:${box.max.y.toFixed(1)}:${box.min.z.toFixed(1)}`);
      }
    }
    // Not one generic building repeated: the lands' buildings differ in their shapes.
    expect(sizes.size).toBeGreaterThan(24);
  });

  it('keeps the traveller out of the halls, towers and walls, and inside the grounds', () => {
    for (const r of REGIONS) {
      if (r.id === 'skyisles') continue;
      expect(civicColliders(r.id, 'worship').length, r.id).toBeGreaterThan(0);
      for (const kind of ['worship', 'market'] as const) for (const k of civicColliders(r.id, kind)) {
        expect(Math.hypot(k.x, k.z) + k.r, `${r.id} ${kind}`).toBeLessThanOrEqual(CIVIC_R * Math.SQRT2 + 1);
        expect(k.h, `${r.id} ${kind}`).toBeGreaterThan(0);
        // Circles wider than 2 m stand for houses; a civic building is a mass of small ones.
        expect(k.r, `${r.id} ${kind}`).toBeLessThanOrEqual(2);
      }
      // The way in from the town (the +z side) is open for the last few steps before the door.
      for (const kind of ['worship', 'market'] as const) expect(civicColliders(r.id, kind).some((k) => Math.hypot(k.x, k.z - (CIVIC_R - 0.5)) < k.r), `${r.id} ${kind}`).toBe(false);
    }
  });

  it('names and points the way to each, from the town side, never with a cross', () => {
    for (const r of REGIONS) for (const q of civicOf(r.id)) {
      const [icon, name] = CIVIC_LABEL[r.id][q.kind];
      expect(name.length, r.id).toBeGreaterThan(3);
      expect(icon).not.toMatch(/[⛪✝✞✟]/u);
      const door = civicDoor(q);
      // The way in lies between the building and the town, just outside its grounds.
      expect(Math.hypot(door.x, door.z)).toBeLessThan(Math.hypot(q.x, q.z));
      expect(Math.hypot(door.x - q.x, door.z - q.z)).toBeGreaterThan(CIVIC_R);
    }
  });
});
