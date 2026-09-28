import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { Rng } from '../src/core/rng';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGIONS, CITY_RADIUS } from '../src/world/regions';
import { GRID_TOWNS, LANE_W, laneDistance, laneLots, townLanes } from '../src/world/townLayout';

const solid = new THREE.MeshStandardMaterial(), glow = new THREE.MeshBasicMaterial();

describe('towns that grew', () => {
  it('lanes wander off the avenues into every quarter, never back onto a road or out of town', () => {
    const road = (x: number, z: number, pad: number) => Math.abs(x) < 9 + pad || Math.abs(z) < 9 + pad || Math.abs(Math.hypot(x, z) - 140) < 6 + pad;
    const lanes = townLanes(new Rng(7), CITY_RADIUS, 9, 140, () => false, road);
    expect(lanes.length).toBeGreaterThan(12);
    const quarters = new Set<string>();
    let bent = 0;
    for (const l of lanes) {
      for (const [x, z] of l.pts) {
        expect(Math.hypot(x, z)).toBeLessThan(CITY_RADIUS);
        quarters.add(`${Math.sign(x)},${Math.sign(z)}`);
      }
      // Past its first few metres it keeps off the roads.
      for (const [x, z] of l.pts.slice(6)) expect(road(x, z, 0)).toBe(false);
      // It bends: its heading at the end differs from its heading at the start.
      const [a, b] = [l.pts[0], l.pts[2]], [c, d] = [l.pts[l.pts.length - 3], l.pts[l.pts.length - 1]];
      const h0 = Math.atan2(b[0] - a[0], b[1] - a[1]), h1 = Math.atan2(d[0] - c[0], d[1] - c[1]);
      if (Math.abs(Math.atan2(Math.sin(h1 - h0), Math.cos(h1 - h0))) > 0.15) bent++;
    }
    expect(quarters.size).toBeGreaterThanOrEqual(4);
    expect(bent / lanes.length).toBeGreaterThan(0.5);
    // Houses stand back from their lane and face it.
    for (const q of laneLots(new Rng(3), lanes, 13, 6)) {
      expect(laneDistance(lanes, q.x, q.z)).toBeGreaterThan(LANE_W / 2 + 3);
      const fx = q.x + Math.sin(q.ry) * 4, fz = q.z + Math.cos(q.ry) * 4;
      expect(laneDistance(lanes, fx, fz)).toBeLessThan(laneDistance(lanes, q.x, q.z));
    }
  });

  it('every town but New Yonder is laid along lanes, its houses turned every which way, and still full', () => {
    for (const r of REGIONS) {
      if (r.id === 'skyisles') continue;
      const inst = buildRegion(r, solid, glow);
      const houses = inst.doors.filter((d) => d.id.startsWith(`${r.id}:`) && /^\w+:\d+$/.test(d.id));
      // New Yonder's towers are wide: its blocks hold fewer than its count without overlapping.
      expect(houses.length, r.id).toBeGreaterThanOrEqual(Math.floor(r.houses * (GRID_TOWNS.has(r.id) ? 0.6 : 0.95)));
      const square = houses.filter((d) => Math.abs(Math.sin(d.facing * 2)) < 0.05).length;
      if (GRID_TOWNS.has(r.id)) expect(square, r.id).toBe(houses.length);
      else expect(square / houses.length, r.id).toBeLessThan(0.55);
      inst.dispose();
    }
  }, 240_000);
});
