import { Rng } from '../core/rng';
import { reservedAt } from './reserved';
import { PLOTS, PLOT_SIZE } from './plots';
import { CITY_RADIUS, REGIONS, REGION_SIZE, regionCenter, type RegionId } from './regions';
import { CASTLE_SITE, terrainHeight, WATER_Y } from './terrain';
import { waterEdge } from './waters';
import { INSTITUTE_SITES, SITE_SIZE } from '../institutions/sites';

/**
 * Caves in the wild lands: rocky caves in the sandstone of the desert and the Nile, rock caves in
 * the Gulf hills, sea caves in the fjord cliffs, and caverns of ice in the Arctic and the Alps. They
 * stand out in the countryside, their mouths turned towards the town, and fill the open spaces
 * with somewhere to explore; each can be explored once a day for what the cave holds.
 *
 * Pure data (placement is deterministic and tested — tests/nature.test.ts). The cave itself is
 * modelled by the 3D side (world/models/caves.ts).
 */

export type CaveStyle = 'sandstone' | 'rock' | 'ice' | 'crystal';

export interface Cave {
  id: string;
  land: RegionId;
  /** World position of the cave's centre, its mouth facing `facing` (radians; the mouth is along +z rotated by it). */
  x: number;
  z: number;
  facing: number;
  style: CaveStyle;
  /** Size (m): the mound's radius. */
  r: number;
}

export const CAVE_LANDS: Partial<Record<RegionId, { style: CaveStyle; count: number; finds: string[] }>> = {
  desert: { style: 'sandstone', count: 5, finds: ['sand', 'cavecrystal', 'dates'] },
  egypt: { style: 'sandstone', count: 4, finds: ['sand', 'cavecrystal', 'papyrus'] },
  middleeast: { style: 'rock', count: 4, finds: ['cavecrystal', 'incense', 'sand'] },
  aurora: { style: 'ice', count: 5, finds: ['ice', 'cavecrystal', 'pinecone'] },
  switzerland: { style: 'ice', count: 3, finds: ['ice', 'cavecrystal', 'edelweiss'] },
  norway: { style: 'rock', count: 3, finds: ['cavecrystal', 'birch', 'fleece'] },
  skyisles: { style: 'crystal', count: 4, finds: ['stardust', 'cavecrystal', 'cloud'] },
};

/** What a cave is called in the game's words. */
export const CAVE_NAME: Record<CaveStyle, string> = { sandstone: 'cave', rock: 'cave', ice: 'ice cavern', crystal: 'crystal grotto' };

function place(land: RegionId): Cave[] {
  const cfg = CAVE_LANDS[land];
  if (!cfg) return [];
  const r0 = REGIONS.find((r) => r.id === land)!, c = regionCenter(r0), rng = new Rng(`caves:${land}`), out: Cave[] = [];
  const half = REGION_SIZE / 2;
  for (let tries = 0; tries < 200 && out.length < cfg.count; tries++) {
    const a = rng.range(0, Math.PI * 2), d = rng.range(CITY_RADIUS + 70, half - 50), r = rng.range(11, 16); // grand enough to walk into, and seen from afar
    const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
    // Keep off the four avenue lines where they run out of town.
    const lx = x - c.x, lz = z - c.z;
    if (Math.abs(lx) < r + 14 || Math.abs(lz) < r + 14) continue;
    if (waterEdge(x, z).d < r + 12) continue;
    if (terrainHeight(x, z) < WATER_Y + 1) continue;
    if (PLOTS.some((p) => Math.abs(p.x - x) < PLOT_SIZE / 2 + r + 6 && Math.abs(p.z - z) < PLOT_SIZE / 2 + r + 6)) continue;
    if (INSTITUTE_SITES.some((s) => Math.abs(s.x - x) < SITE_SIZE / 2 + r + 6 && Math.abs(s.z - z) < SITE_SIZE / 2 + r + 6)) continue;
    if (Math.hypot(x - CASTLE_SITE.x, z - CASTLE_SITE.z) < CASTLE_SITE.r + r + 20) continue;
    if (reservedAt(land, lx, lz, r + 12)) continue; // the pyramids' plateau
    if (out.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r + 40)) continue;
    // The mouth faces the town.
    out.push({ id: `cave-${land}-${out.length}`, land, x, z, facing: Math.atan2(c.x - x, c.z - z), style: cfg.style, r });
  }
  return out;
}

export const CAVES: Cave[] = REGIONS.flatMap((r) => place(r.id));

/** Where to stand to explore a cave: just outside its mouth. */
export function caveMouth(cv: Cave): { x: number; z: number } {
  return { x: cv.x + Math.sin(cv.facing) * (cv.r + 1.5), z: cv.z + Math.cos(cv.facing) * (cv.r + 1.5) };
}
