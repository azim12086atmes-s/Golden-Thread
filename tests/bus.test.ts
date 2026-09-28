import { describe, expect, it } from 'vitest';
import { SEAT_GAP } from '../src/vehicles/vehicles';
import { REGIONS, REGION_BY_ID, regionCenter, REGION_SIZE } from '../src/world/regions';
import { COACH, COACH_FAMILY_SEATS, COACH_SEATS, busFare, busLegs, busPath, busStops, keepSide } from '../src/travel/bus';
import { neighbours } from '../src/traffic/schedule';

describe('intercity buses', () => {
  it('every town on the ground has a stop on each avenue; the Sky Isles have none', () => {
    for (const r of REGIONS) {
      const s = busStops(r.id);
      if (r.id === 'skyisles') { expect(s).toHaveLength(0); continue; }
      expect(s).toHaveLength(4);
      const c = regionCenter(r);
      for (const q of s) {
        // Beside its avenue, not on it; the kerb between the shelter and the road.
        const along = Math.abs((q.x - c.x) * q.dir[0] + (q.z - c.z) * q.dir[1]);
        const across = Math.abs((q.x - c.x) * q.dir[1] - (q.z - c.z) * q.dir[0]);
        expect(along).toBeGreaterThan(60);
        expect(across).toBeGreaterThan(11);
        expect(Math.hypot(q.kerbX - q.x, q.kerbZ - q.z)).toBeGreaterThan(4);
      }
    }
  });

  it('a coach reaches every town on the ground from every other, along the highways', () => {
    const ground = REGIONS.filter((r) => r.id !== 'skyisles');
    for (const a of ground) for (const b of ground) {
      const legs = busLegs(a.id, b.id)!;
      expect(legs, `${a.id}→${b.id}`).not.toBeNull();
      expect(legs[0]).toBe(a.id);
      expect(legs[legs.length - 1]).toBe(b.id);
      for (let i = 1; i < legs.length; i++) expect(neighbours(legs[i - 1]).map((n) => n.land)).toContain(legs[i]);
    }
    expect(busLegs('meadow', 'skyisles')).toBeNull();
    expect(busFare('meadow', 'meadow')).toBeNull();
    const f = busFare('aurora', 'desert')!;
    expect(f.towns).toBe(busLegs('aurora', 'desert')!.length - 1);
    expect(f.coins).toBeGreaterThan(0);
  });

  it("the coach's road is continuous, stays on the roads and never crosses a plaza", () => {
    for (const [from, to] of [['aurora', 'desert'], ['london', 'japan'], ['meadow', 'china'], ['norway', 'switzerland']] as const) {
      for (const start of busStops(from)) {
        const r = busPath(start, to)!;
        expect(r).not.toBeNull();
        const pts = keepSide(r.pts, 3.5);
        expect(pts[0]).toEqual([start.kerbX, start.kerbZ]);
        expect(pts[pts.length - 1]).toEqual([r.stop.kerbX, r.stop.kerbZ]);
        expect(r.stop.land).toBe(to);
        for (let i = 1; i < pts.length; i++) {
          const [ax, az] = pts[i - 1], [bx, bz] = pts[i];
          expect(Math.hypot(bx - ax, bz - az), `${from}→${to} step ${i}`).toBeLessThan(10);
          // Never through a town's plaza and landmark.
          for (const q of REGIONS) {
            const c = regionCenter(q);
            expect(Math.hypot(bx - c.x, bz - c.z), `${from}→${to} past ${q.id}`).toBeGreaterThan(60);
          }
          // On an avenue, a ring road or a highway: near an axis of the town it is in, or on the ring.
          const cx = Math.round(bx / REGION_SIZE) * REGION_SIZE, cz = Math.round(bz / REGION_SIZE) * REGION_SIZE;
          const lx = bx - cx, lz = bz - cz, d = Math.hypot(lx, lz);
          const onRoad = Math.min(Math.abs(lx), Math.abs(lz)) < 15 || Math.abs(d - 140) < 8;
          expect(onRoad, `${from}→${to} off road at ${bx},${bz}`).toBe(true);
        }
      }
    }
    void REGION_BY_ID;
  }, 60_000);

  it('on the coach the two sit apart, either side of the aisle, and the family behind them', () => {
    const [g, b] = [COACH_SEATS.girl, COACH_SEATS.boy];
    expect(Math.hypot(g[0] - b[0], g[2] - b[2])).toBeGreaterThanOrEqual(SEAT_GAP);
    expect(Math.sign(g[0])).toBe(-Math.sign(b[0]));
    for (const s of COACH_FAMILY_SEATS) {
      expect(s[2]).toBeLessThan(g[2]);
      expect(Math.abs(s[0])).toBeLessThan(COACH.halfW);
      expect(Math.abs(s[2])).toBeLessThan(COACH.len / 2);
    }
  });
});
