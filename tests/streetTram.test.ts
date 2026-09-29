import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { SEAT_GAP, buildStreetTram } from '../src/vehicles/vehicles';
import { REGIONS, REGION_BY_ID, regionCenter } from '../src/world/regions';
import { busStops } from '../src/travel/bus';
import { STREET_TRAM, STREET_TRAM_FAMILY_SEATS, STREET_TRAM_SEATS, TRAM_TOWNS, tramPath, tramStops } from '../src/travel/streetTram';
import { buildRegion } from '../src/world/RegionBuilder';

describe('city trams', () => {
  it('the tram towns have a stop on each avenue, beside it and clear of the bus stop, lamps and people in need; others have none', () => {
    for (const r of REGIONS) {
      const s = tramStops(r.id);
      if (!TRAM_TOWNS[r.id]) { expect(s, r.id).toHaveLength(0); continue; }
      expect(s).toHaveLength(4);
      const c = regionCenter(r);
      for (const q of s) {
        const along = (q.x - c.x) * q.dir[0] + (q.z - c.z) * q.dir[1];
        const across = Math.abs((q.x - c.x) * q.dir[1] - (q.z - c.z) * q.dir[0]);
        expect(along).toBeGreaterThan(80);
        expect(along).toBeLessThan(130);
        expect(across).toBeGreaterThan(11);
        // Clear of the street lamps (every 22 m from 60 m out) and of the bus stop.
        expect(Math.min(...[60, 82, 104, 126].map((d) => Math.abs(d - along)))).toBeGreaterThan(6);
        for (const b of busStops(r.id)) expect(Math.hypot(b.x - q.x, b.z - q.z)).toBeGreaterThan(10);
        // People in need wait 118 m out, 13 m to the side (charity.ts).
        for (const [ax, az] of [[0, 1], [1, 0], [0, -1], [-1, 0]]) expect(Math.hypot(c.x + ax * 118 + az * 13 - q.x, c.z + az * 118 - ax * 13 - q.z)).toBeGreaterThan(8);
      }
    }
  });

  it('from every stop to every other the tram keeps to the avenues and the ring road, never the plaza', () => {
    for (const land of Object.keys(TRAM_TOWNS) as Array<keyof typeof TRAM_TOWNS>) {
      const c = regionCenter(REGION_BY_ID[land]), stops = tramStops(land);
      for (const a of stops) for (const b of stops) {
        const pts = tramPath(a, b);
        if (a === b) { expect(pts).toHaveLength(0); continue; }
        expect(pts[0]).toEqual([a.kerbX, a.kerbZ]);
        expect(pts[pts.length - 1]).toEqual([b.kerbX, b.kerbZ]);
        for (let i = 1; i < pts.length; i++) {
          const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
          expect(Math.hypot(bx - ax, bz - az)).toBeLessThan(10);
          const lx = bx - c.x, lz = bz - c.z, d = Math.hypot(lx, lz);
          expect(d).toBeGreaterThan(60);
          expect(Math.min(Math.abs(lx), Math.abs(lz)) < 15 || Math.abs(d - 140) < 8, `${a.id}→${b.id} off road`).toBe(true);
        }
      }
    }
  });

  it('on the tram the two sit apart across the aisle, the family behind, all inside', () => {
    const [g, b] = [STREET_TRAM_SEATS.girl, STREET_TRAM_SEATS.boy];
    expect(Math.hypot(g[0] - b[0], g[2] - b[2])).toBeGreaterThanOrEqual(SEAT_GAP);
    expect(Math.sign(g[0])).toBe(-Math.sign(b[0]));
    for (const s of STREET_TRAM_FAMILY_SEATS) {
      expect(s[2]).toBeLessThan(g[2]);
      expect(Math.abs(s[0])).toBeLessThan(STREET_TRAM.halfW);
      expect(Math.abs(s[2])).toBeLessThan(STREET_TRAM.len / 2);
    }
    for (const style of ['streetcar', 'solar', 'cable'] as const) {
      const box = new THREE.Box3().setFromObject(buildStreetTram(style));
      expect(box.max.z - box.min.z).toBeGreaterThan(STREET_TRAM.len - 0.5);
    }
  });

  it('no house stands on a tram stop', () => {
    const solid = new THREE.MeshStandardMaterial(), glow = new THREE.MeshBasicMaterial();
    for (const land of Object.keys(TRAM_TOWNS) as Array<keyof typeof TRAM_TOWNS>) {
      const inst = buildRegion(REGION_BY_ID[land], solid, glow), c = regionCenter(REGION_BY_ID[land]);
      for (const q of tramStops(land)) {
        const near = inst.colliders.filter((k) => Math.hypot(k.x - q.x, k.z - q.z) < k.r + 2.5 && k.r > 2);
        expect(near.map((k) => [Math.round(k.x - c.x), Math.round(k.z - c.z), k.r]), `${q.id}`).toEqual([]);
      }
    }
  }, 120_000);
});
