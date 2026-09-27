import { REGION_BY_ID, regionCenter, type RegionId } from './regions';
import { WATER_Y, terrainHeight } from './terrain';
import { ROADS_END, WATERS, waterEdge } from './waters';

/**
 * Where bridges cross the rivers (owner's brief: "bridges … in each land's style"). Every land's
 * river winds round the town beyond the ends of its avenues; wherever it crosses the line of an
 * avenue, the way on out into the country crosses it by a bridge. Found from the water and the
 * terrain, so each spans the river from bank to dry bank. Drawn (and made walkable) by
 * world/BridgesView.ts with the 3D side's `buildBridge`. Pure data (tests/bridges.test.ts).
 */
export interface Bridge {
  id: string;
  land: RegionId;
  /** Centre (world), the bank height it rests on, and its turn (local +x runs along the crossing). */
  x: number;
  z: number;
  y: number;
  ry: number;
  /** Along the crossing (m), and across. */
  length: number;
  width: number;
  /** Unit direction of the crossing. */
  dir: [number, number];
}

export const BRIDGE_WIDTH = 4;

function find(land: RegionId): Bridge[] {
  const river = WATERS.find((w) => w.kind === 'river' && w.land === land);
  if (!river) return [];
  const c = regionCenter(REGION_BY_ID[land]), out: Bridge[] = [];
  for (const [k, [ax, az]] of ([[1, 0], [-1, 0], [0, 1], [0, -1]] as const).entries()) {
    const at = (d: number) => ({ x: c.x + ax * d, z: c.z + az * d });
    let d0 = -1, d1 = -1;
    for (let d = ROADS_END - 20; d < 350; d += 0.5) {
      const p = at(d), e = waterEdge(p.x, p.z);
      if (e.body === river && e.d < 0) { if (d0 < 0) d0 = d; d1 = d; } else if (d0 >= 0) break;
    }
    if (d0 < 0) continue;
    // Out to dry banks on both sides.
    let e0 = d0, e1 = d1;
    while (e0 > d0 - 14 && terrainHeight(at(e0).x, at(e0).z) < WATER_Y + 0.5) e0 -= 0.5;
    while (e1 < d1 + 14 && terrainHeight(at(e1).x, at(e1).z) < WATER_Y + 0.5) e1 += 0.5;
    const a = at(e0), b = at(e1);
    if (terrainHeight(a.x, a.z) < WATER_Y + 0.5 || terrainHeight(b.x, b.z) < WATER_Y + 0.5) continue;
    e0 -= 1; e1 += 1;
    const m = at((e0 + e1) / 2), p0 = at(e0), p1 = at(e1);
    out.push({
      id: `${land}-bridge-${k}`, land, x: m.x, z: m.z, y: Math.max(terrainHeight(p0.x, p0.z), terrainHeight(p1.x, p1.z)),
      ry: Math.atan2(-az, ax), length: e1 - e0, width: BRIDGE_WIDTH, dir: [ax, az],
    });
  }
  return out;
}

const cache = new Map<RegionId, Bridge[]>();
export const bridgesOf = (land: RegionId): Bridge[] => { let b = cache.get(land); if (!b) cache.set(land, (b = find(land))); return b; };
