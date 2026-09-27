import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { LAND_TRAFFIC } from '../src/traffic/roster';
import { HIGHWAY_TRAFFIC, RING_R, STOP_BACK, activeShare, highwayU, highways, isOut, lights, neighbours } from '../src/traffic/schedule';
import { avenueRoute, circleRoute } from '../src/traffic/Traffic';
import { hasDesign } from '../src/traffic/designs';
import { REGIONS } from '../src/world/regions';

describe('traffic by the time of day', () => {
  it('roads are quiet at night, lantern boats come out at dusk, day birds rest and owls fly after dark', () => {
    expect(activeShare('taxi', 'road', 12)).toBe(1);
    expect(activeShare('taxi', 'road', 2)).toBeLessThan(0.5);
    expect(activeShare('lantern-boat', 'water', 12)).toBe(0);
    expect(activeShare('lantern-boat', 'water', 19.5)).toBe(1);
    expect(activeShare('pigeons', 'sky', 23)).toBe(0);
    expect(activeShare('owls', 'sky', 23)).toBe(1);
    expect(activeShare('owls', 'sky', 12)).toBe(0);
    // A share keeps about that many out.
    const out = Array.from({ length: 100 }, (_, i) => isOut(i, 0.35)).filter(Boolean).length;
    expect(out).toBeGreaterThan(25); expect(out).toBeLessThan(45);
    expect(hasDesign('lantern-boat')).toBe(true);
    expect(REGIONS.filter((r) => LAND_TRAFFIC[r.id].water.some(([id]) => id === 'lantern-boat')).length).toBeGreaterThanOrEqual(10);
  });
});

describe('junctions', () => {
  it('the lights never give the avenue and the ring road green at once, and each gets its turn', () => {
    let avenue = 0, ring = 0;
    for (let t = 0; t < 60; t += 0.25) {
      const l = lights(t);
      expect(l.avenue === 'green' && l.ring === 'green').toBe(false);
      if (l.avenue === 'green') avenue++;
      if (l.ring === 'green') ring++;
    }
    expect(avenue).toBeGreaterThan(40); expect(ring).toBeGreaterThan(40);
  });

  it('avenue and ring-road vehicles have a stop line before each crossing', () => {
    const av = avenueRoute(0, 0, 1, 0, 60, 274, 2.8);
    expect(av.stopAhead!(10)).toEqual({ d: RING_R - STOP_BACK - 70, by: 'avenue' }); // going out
    expect(av.stopAhead!(RING_R)).toBeNull(); // past the crossing
    const ring = circleRoute(0, 0, RING_R + 2.3, 1, 'road');
    const s = ring.stopAhead!(1)!;
    expect(s.by).toBe('ring');
    expect(s.d).toBeGreaterThan(0);
    const p = ring.at(1 + s.d + STOP_BACK, new THREE.Vector3());
    expect(Math.min(Math.abs(p.x), Math.abs(p.z))).toBeLessThan(1.5); // the crossing is on an avenue
  });
});

describe('highways between the lands', () => {
  it('neighbours are mutual and every land but the Sky Isles is linked by road', () => {
    for (const r of REGIONS) for (const n of neighbours(r.id)) expect(neighbours(n.land).some((m) => m.land === r.id), `${r.id}→${n.land}`).toBe(true);
    const linked = new Set(highways().flatMap((h) => [h.a, h.b]));
    for (const r of REGIONS) if (r.id !== 'skyisles') expect(linked.has(r.id), r.id).toBe(true);
    expect(neighbours('skyisles')).toEqual([]);
    expect(HIGHWAY_TRAFFIC.every(([id]) => hasDesign(id))).toBe(true);
  });

  it('highway traffic is placed by the clock, so it is in the same place whichever land you are in', () => {
    expect(highwayU(10, 12, 100, 500)).toBe(highwayU(10, 12, 100, 500));
    expect(highwayU(10, 12, 100, 500)).toBeCloseTo((10 + 1200) % 500);
  });
});
