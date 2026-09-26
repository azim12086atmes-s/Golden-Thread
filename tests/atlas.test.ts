import { describe, expect, it } from 'vitest';
import {
  CITIES, CITY, MAX_GRADE, SEA_LEVEL, continentHeight, isLand, landAt, naturalHeight, pointAt, roadById, roads,
  routeBetween, settlements, sightings, validateAtlas, waterAt,
} from '../src/atlas/atlas';
import { CONTINENT } from '../src/atlas/continent';
import type { LandId } from '../src/atlas/schema';

const LANDS: LandId[] = ['meadow', 'japan', 'korea', 'china', 'norway', 'switzerland', 'london', 'newyork', 'renaissance', 'vintage', 'islamic', 'middleeast', 'desert', 'egypt', 'indianorth', 'indiasouth', 'mughal', 'indonesia', 'aurora', 'skyisles'];

describe('the continent of Safar', () => {
  it('has all twenty lands, 27 highways, and the settlements the brief asked for', () => {
    expect(CONTINENT.cities.map((c) => c.id).sort()).toEqual([...LANDS].sort());
    expect(CONTINENT.segments).toHaveLength(27);
    expect(sightings().length).toBeGreaterThanOrEqual(100);
    expect(settlements().length).toBe(55);
    const kinds = new Set(settlements().map((s) => s.def.kind));
    for (const k of ['cottages', 'tent-camp', 'hut-camp'] as const) expect(kinds).toContain(k);
    // The owner's settlement: cottages in high grassland with rainbows and stars.
    expect(settlements().find((s) => s.def.beacon === 'rainbow')?.def.kind).toBe('cottages');
  });

  it('passes validation with no hard errors', () => {
    const { errors, warnings } = validateAtlas();
    expect(errors).toEqual([]);
    // Warnings are placement notes for visual review; surface them in the test log.
    if (warnings.length) console.info(`atlas warnings (${warnings.length}):\n${warnings.join('\n')}`);
  });

  it('every land except the Sky Isles is reachable by road from the Meadow', () => {
    for (const id of LANDS) {
      if (id === 'meadow' || id === 'skyisles') continue;
      const r = routeBetween('meadow', id);
      expect(r, id).not.toBeNull();
      expect(r!.lands[0]).toBe('meadow');
      expect(r!.lands[r!.lands.length - 1]).toBe(id);
    }
    expect(routeBetween('meadow', 'skyisles')).toBeNull(); // no road: reached by flight
  });

  it('finds a sensible route across the world', () => {
    const r = routeBetween('aurora', 'desert')!;
    expect(r.segments.length).toBeGreaterThanOrEqual(3);
    expect(r.length).toBeGreaterThan(8000);
    expect(r.length).toBeLessThan(30000);
  });

  it('city centres sit on land at their core height', () => {
    for (const c of CITIES) {
      if (c.id === 'skyisles') continue;
      expect(isLand(c.x, c.z), c.id).toBe(true);
      expect(landAt(c.x, c.z), c.id).toBe(c.id);
    }
    for (const id of ['meadow', 'switzerland', 'mughal', 'japan'] as const) {
      expect(Math.abs(naturalHeight(CITY[id].x, CITY[id].z) - CITY[id].coreY), id).toBeLessThan(2);
    }
  });

  it('the sea is below sea level and the Middle Sea is open water', () => {
    expect(waterAt(8000, 0)).toBe('sea');
    expect(naturalHeight(8000, 0)).toBeLessThan(SEA_LEVEL);
    expect(waterAt(4100, 1000)).toBe('sea'); // the Middle Sea
    expect(naturalHeight(4100, 1000)).toBeLessThan(SEA_LEVEL);
  });
});

describe('highways', () => {
  it('are sampled finely and continuously', () => {
    for (const r of roads()) {
      for (let i = 1; i < r.samples.length; i++) {
        const a = r.samples[i - 1], b = r.samples[i];
        expect(Math.hypot(b.x - a.x, b.z - a.z), `road ${r.seg.id}`).toBeLessThan(16);
      }
    }
  });

  it('never exceed their grade limit', () => {
    for (const r of roads()) {
      const g = MAX_GRADE[r.cls];
      for (let i = 1; i < r.samples.length; i++) {
        const a = r.samples[i - 1], b = r.samples[i];
        expect(Math.abs(b.y - a.y), `road ${r.seg.id} at ${Math.round(a.s)} m`).toBeLessThanOrEqual(g * (b.s - a.s) + 1e-6);
      }
    }
  });

  it('bridge the strait and the island causeways, above the water', () => {
    for (const id of [16, 9, 10]) {
      const r = roadById(id);
      expect(r.bridges.length, `segment ${id}`).toBeGreaterThan(0);
      for (const s of r.samples) if (s.bridge && waterAt(s.x, s.z) === 'sea') expect(s.y).toBeGreaterThan(SEA_LEVEL + 2);
    }
  });

  it('grade the terrain into a level road corridor', () => {
    const r = roadById(25);
    const p = pointAt(r, 0.5);
    expect(Math.abs(continentHeight(p.x, p.z) - p.y)).toBeLessThan(0.5);
  });

  it('places sightings and settlements off the road on the named side', () => {
    const r = roadById(23);
    const hill = settlements().find((s) => s.def.id === 'v23-1')!;
    const p = pointAt(r, hill.def.t);
    const d = Math.hypot(hill.x - p.x, hill.z - p.z);
    expect(Math.abs(d - hill.def.distance)).toBeLessThan(1);
    expect(hill.branch).toHaveLength(3);
    for (const s of sightings()) expect(Number.isFinite(s.x) && Number.isFinite(s.z), s.def.id).toBe(true);
  });
});

describe('height field', () => {
  it('is finite everywhere across the continent', () => {
    for (let x = -7000; x <= 7000; x += 700) {
      for (let z = -5000; z <= 6000; z += 700) {
        expect(Number.isFinite(continentHeight(x, z)), `${x},${z}`).toBe(true);
      }
    }
  });

  it('raises real mountains where the ranges are', () => {
    // A point on the Crown Range crest, away from any city core.
    expect(naturalHeight(-1400, -3350)).toBeGreaterThan(120);
  });
});
