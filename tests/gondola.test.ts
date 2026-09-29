import { describe, expect, it } from 'vitest';
import { SEAT_GAP } from '../src/vehicles/vehicles';
import { buildLandmark } from '../src/world/architecture';
import { GeoBuilder } from '../src/world/kit';
import { Rng } from '../src/core/rng';
import { REGION_BY_ID, regionCenter } from '../src/world/regions';
import { reservedAt } from '../src/world/reserved';
import { terrainHeight } from '../src/world/terrain';
import { skyPad } from '../src/travel/air';
import { TRAM, TRAM_FAMILY_SEATS, TRAM_FLOOR, TRAM_HANG, TRAM_SEATS, tramAlight, tramBoarding, tramCourse, tramLine } from '../src/travel/gondola';

/** The spiral of isles (monuments.ts skyisles), each at its largest possible size. */
const isles = Array.from({ length: 16 }, (_, i) => {
  const a = i * 0.9, r = 70 - i * 3.2;
  return { x: Math.cos(a) * r, z: Math.sin(a) * r, y: 18 + i * 9 + 0.6, s: i === 15 ? 26 : 15 };
});

describe('the Sky Isles cable car', () => {
  it('runs clear of every isle, bridge of light, crystal and the taxi stage', () => {
    const T = isles[15], stage = skyPad(), L = tramLine();
    for (const side of [1, -1] as const) for (const [x, y, z] of tramCourse(side, true)) {
      // The cabin hangs from floor y to its grip TRAM_HANG above.
      for (const h of [0, TRAM_HANG / 2, TRAM_HANG]) {
        const py = y + h;
        for (let i = 0; i < 15; i++) {
          const q = isles[i];
          if (py < q.y + 8 && py > q.y - q.s * 1.2) {
            const rr = py >= q.y ? q.s : q.s * (1 - (q.y - py) / (q.s * 1.2));
            expect(Math.hypot(x - q.x, z - q.z) - rr, `isle ${i}`).toBeGreaterThan(TRAM.halfW + 1);
          }
          const b = isles[i + 1], bx = b.x - q.x, bz = b.z - q.z;
          const s = Math.max(0, Math.min(1, ((x - q.x) * bx + (z - q.z) * bz) / (bx * bx + bz * bz)));
          expect(Math.hypot(x - q.x - bx * s, py - (q.y + (b.y - q.y) * s), z - q.z - bz * s), `bridge ${i}`).toBeGreaterThan(3);
        }
        // Under the temple's isle only where it runs level into the mountain station.
        const dT = Math.hypot(x - T.x, z - T.z);
        if (py < T.y - 0.5 && py > T.y - T.s * 1.2) expect(dT - T.s * (1 - (T.y - py) / (T.s * 1.2)), 'temple isle').toBeGreaterThan(1.5);
        if (py > stage.y - 12 && py < stage.y + 10) expect(Math.hypot(x - stage.x, z - stage.z)).toBeGreaterThan(9);
      }
    }
    // It climbs steadily, and no steeper than a real aerial tramway.
    expect(L.top.y - L.ground.y).toBeGreaterThan(140);
    expect(Math.atan2(L.top.y - L.ground.y, L.span)).toBeLessThan((45 * Math.PI) / 180);
  });

  it('is a continuous course from station to station, each way', () => {
    const L = tramLine();
    for (const side of [1, -1] as const) for (const up of [true, false]) {
      const c = tramCourse(side, up);
      for (let i = 1; i < c.length; i++) expect(Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1], c[i][2] - c[i - 1][2])).toBeLessThan(4);
      const [first, last] = up ? [L.ground, L.top] : [L.top, L.ground];
      expect(c[0][1]).toBeCloseTo(first.y + TRAM_FLOOR, 5);
      expect(c[c.length - 1][1]).toBeCloseTo(last.y + TRAM_FLOOR, 5);
    }
  });

  it('has walkable station decks where you board and where you step off, and clear ground below', () => {
    const r = REGION_BY_ID.skyisles, c = regionCenter(r), L = tramLine();
    const lm = buildLandmark({ g: new GeoBuilder(), glow: new GeoBuilder(), rng: new Rng('skyisles'), s: r });
    const standAt = (x: number, z: number) => Math.max(-Infinity, ...lm.platforms.filter((q) => (x - q.x) ** 2 + (z - q.z) ** 2 < q.r * q.r).map((q) => q.y));
    for (const up of [true, false]) {
      const b = tramBoarding(up), a = tramAlight(up);
      expect(standAt(b.x - c.x, b.z - c.z)).toBeCloseTo(b.y, 5);
      expect(standAt(a.x - c.x, a.z - c.z)).toBeCloseTo(a.y, 5);
      expect(standAt(a.bx - c.x, a.bz - c.z)).toBeCloseTo(a.y, 5);
      expect(Math.hypot(a.bx - a.x, a.bz - a.z)).toBeGreaterThanOrEqual(SEAT_GAP);
    }
    // The valley station sits on reserved, level ground: no house or tree beneath it.
    expect(reservedAt('skyisles', L.ground.x, L.ground.z)).toBe(true);
    const hs: number[] = [];
    for (let d = -9; d <= 4; d += 1) for (const s of [-4, 0, 4]) hs.push(terrainHeight(c.x + L.ground.x + L.ux * d - L.uz * s, c.z + L.ground.z + L.uz * d + L.ux * s));
    expect(Math.max(...hs) - Math.min(...hs)).toBeLessThan(1.2);
  });

  it('seats the two on the front bench either side of the divider, the family behind', () => {
    const { girl: g, boy: b } = TRAM_SEATS;
    expect(Math.hypot(g[0] - b[0], g[2] - b[2])).toBeGreaterThanOrEqual(SEAT_GAP);
    expect(g[0]).toBeLessThan(0);
    expect(b[0]).toBeGreaterThan(0);
    for (const s of TRAM_FAMILY_SEATS) {
      expect(s[2]).toBeLessThan(g[2]);
      expect(Math.abs(s[0])).toBeLessThan(TRAM.halfW);
    }
  });
});
