import { describe, expect, it } from 'vitest';
import { SEAT_GAP } from '../src/vehicles/vehicles';
import { WATER_Y, terrainHeight } from '../src/world/terrain';
import { harbours } from '../src/world/harbours';
import { GRID_COLS, GRID_ROWS, HOME_COL, HOME_ROW, REGIONS, REGION_SIZE } from '../src/world/regions';
import { FERRY, FERRY_FAMILY_SEATS, FERRY_SEATS, courseLength, ferryFare, ferryOffset, ferryRing, ferryRoute, mooring } from '../src/travel/ferry';
import { AIR, AIR_FAMILY_SEATS, AIR_SEATS, airArrival, airCourse, airDestinations, airFare, airPointAtStop, skyPadPoint } from '../src/travel/air';
import { busStops } from '../src/travel/bus';
import { buildLandmark } from '../src/world/architecture';
import { GeoBuilder } from '../src/world/kit';
import { Rng } from '../src/core/rng';
import { REGION_BY_ID, regionCenter } from '../src/world/regions';
import { PAD_R, skyPad } from '../src/travel/air';

const S = REGION_SIZE;
/** How far a point lies outside the grid of lands (0 inside). */
const outside = (x: number, z: number) => {
  const X0 = -HOME_COL * S - S / 2, X1 = (GRID_COLS - 1 - HOME_COL) * S + S / 2;
  const Z0 = -HOME_ROW * S - S / 2, Z1 = (GRID_ROWS - 1 - HOME_ROW) * S + S / 2;
  return Math.hypot(Math.max(X0 - x, 0, x - X1), Math.max(Z0 - z, 0, z - Z1));
};

describe('the coastal ferry', () => {
  it('sails from every harbour to every other, a continuous course from mooring to mooring', () => {
    const hs = harbours();
    expect(hs.length).toBeGreaterThan(8);
    for (const a of hs) for (const b of hs) {
      if (a === b) { expect(ferryRoute(a.land, b.land)).toBeNull(); continue; }
      const pts = ferryRoute(a.land, b.land)!;
      const ma = mooring(a), mb = mooring(b);
      expect(pts[0]).toEqual([ma.x, ma.z]);
      expect(pts[pts.length - 1]).toEqual([mb.x, mb.z]);
      for (let i = 1; i < pts.length; i++) expect(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]), `${a.land}→${b.land} ${i}`).toBeLessThan(10);
      const f = ferryFare(a.land, b.land)!;
      expect(f.coins).toBeGreaterThan(0);
      expect(f.km).toBeCloseTo(courseLength(pts) / 1000, 5);
    }
    expect(ferryRoute('skyisles', 'london')).toBeNull();
  });

  it('runs round the island clear outside every ship lane, and always on water', () => {
    const o = ferryOffset();
    for (const h of harbours()) expect(o).toBeGreaterThan(h.lane - S / 2 + h.laneHalfWidth + 10);
    for (const [x, z] of ferryRing()) {
      expect(outside(x, z)).toBeGreaterThan(o - 1);
      expect(terrainHeight(x, z)).toBeLessThan(WATER_Y - 1.5);
    }
    // In and out of the harbours too, alongside the pier and across the lanes.
    const hs = harbours(), n = hs.length;
    for (const [from, to] of [[hs[0].land, hs[n >> 1].land], [hs[1].land, hs[n - 1].land], [hs[n >> 2].land, hs[(3 * n) >> 2].land]]) {
      const pts = ferryRoute(from, to)!;
      for (const [x, z] of pts) expect(terrainHeight(x, z), `${from}→${to} at ${x.toFixed(0)},${z.toFixed(0)}`).toBeLessThan(WATER_Y - 0.5);
    }
  });

  it('seats the two on separate benches either side of the planter, the family behind', () => {
    const { girl: g, boy: b } = FERRY_SEATS;
    expect(Math.hypot(g[0] - b[0], g[2] - b[2])).toBeGreaterThanOrEqual(SEAT_GAP);
    expect(g[0]).toBeLessThan(-0.3);
    expect(b[0]).toBeGreaterThan(0.3);
    for (const s of [g, b, ...FERRY_FAMILY_SEATS]) {
      expect(s[1]).toBeGreaterThan(FERRY.deckY);
      expect(Math.abs(s[0])).toBeLessThan(FERRY.halfW - 0.5);
    }
    for (const s of FERRY_FAMILY_SEATS) expect(s[2]).toBeLessThan(g[2]);
  });
});

describe('the air taxi', () => {
  it('flies from every stop to every other land, the Sky Isles included, and back from their stage', () => {
    const from = airPointAtStop(busStops('meadow')[0]);
    const dests = airDestinations('meadow');
    expect(dests).toContain('skyisles');
    expect(dests).not.toContain('meadow');
    expect(dests.length).toBe(REGIONS.length - 1);
    const pad = skyPadPoint();
    expect(airArrival('skyisles', from.x, from.z)).toEqual(pad);
    expect(airFare(pad, 'london').coins).toBeGreaterThan(0);
    // It comes down at a stop of the land it flies to.
    for (const id of dests) if (id !== 'skyisles') {
      const b = airArrival(id, from.x, from.z);
      expect(b.land).toBe(id);
      expect(busStops(id).some((s) => s.kerbX === b.stepX && s.kerbZ === b.stepZ)).toBe(true);
    }
  });

  it('lifts straight up, cruises clear above the ground, and settles straight down', () => {
    for (const [a, to] of [[airPointAtStop(busStops('meadow')[1]), 'skyisles'], [skyPadPoint(), 'egypt'], [airPointAtStop(busStops('aurora')[2]), 'desert'], [airPointAtStop(busStops('london')[0]), 'switzerland']] as const) {
      const b = airArrival(to, a.x, a.z), c = airCourse(a, b);
      expect(c[0]).toEqual([a.x, a.y, a.z]);
      expect(c[c.length - 1]).toEqual([b.x, b.y, b.z]);
      for (let i = 1; i < c.length; i++) expect(Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1], c[i][2] - c[i - 1][2])).toBeLessThan(5);
      // Lift-off and landing are vertical: the first and last few points stand over the stop.
      expect(Math.hypot(c[3][0] - a.x, c[3][2] - a.z)).toBeLessThan(0.01);
      expect(Math.hypot(c[c.length - 4][0] - b.x, c[c.length - 4][2] - b.z)).toBeLessThan(0.01);
      for (const [x, y, z] of c) {
        const far = Math.min(Math.hypot(x - a.x, z - a.z), Math.hypot(x - b.x, z - b.z));
        if (far > 150) expect(y - terrainHeight(x, z), `${a.land}→${to}`).toBeGreaterThan(60);
      }
    }
  });

  it('lands on a walkable stage beside the Sky Isles temple, a bridge across to its isle', () => {
    const r = REGION_BY_ID.skyisles, c = regionCenter(r);
    const lm = buildLandmark({ g: new GeoBuilder(), glow: new GeoBuilder(), rng: new Rng('skyisles'), s: r });
    const p = skyPad(), pad = skyPadPoint();
    const standAt = (x: number, z: number) => Math.max(-Infinity, ...lm.platforms.filter((q) => (x - q.x) ** 2 + (z - q.z) ** 2 < q.r * q.r).map((q) => q.y));
    // The whole stage, where the taxi settles and where they step down.
    for (const [dx, dz] of [[0, 0], [PAD_R - 1, 0], [0, PAD_R - 1], [-(PAD_R - 1), 0], [0, -(PAD_R - 1)]]) expect(standAt(p.x + dx, p.z + dz)).toBeCloseTo(p.y, 5);
    expect(standAt(pad.stepX - c.x, pad.stepZ - c.z)).toBeCloseTo(pad.y, 5);
    // Every step of the way from the temple's isle to the stage.
    for (let d = 14; d <= 36; d += 0.5) {
      const x = p.isle[0] + p.ux * d, z = p.isle[1] + p.uz * d;
      expect(standAt(x, z), `at ${d} m`).toBeGreaterThan(p.y - 1);
    }
  });

  it('seats the two either side of the console, apart; the family behind', () => {
    const { girl: g, boy: b } = AIR_SEATS;
    expect(Math.hypot(g[0] - b[0], g[2] - b[2])).toBeGreaterThanOrEqual(SEAT_GAP);
    expect(g[0]).toBeLessThan(0);
    expect(b[0]).toBeGreaterThan(0);
    for (const s of AIR_FAMILY_SEATS) {
      expect(s[2]).toBeLessThan(g[2]);
      expect(Math.abs(s[0])).toBeLessThan(AIR.halfW);
    }
  });
});
