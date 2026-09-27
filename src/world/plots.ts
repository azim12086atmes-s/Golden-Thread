import { REGIONS, regionCenter, type RegionId } from './regions';

/** Plots of land for sale: two per land, just inside the town edge, clear of the avenues. */
export const PLOT_SIZE = 30;

export interface PlotSite {
  id: string;
  region: RegionId;
  x: number;
  z: number;
  price: number;
}

export const PLOTS: PlotSite[] = REGIONS.flatMap((r, i) => {
  const c = regionCenter(r);
  const base = r.id === 'meadow' ? 60 : 90 + (i % 5) * 10;
  return [
    { id: `${r.id}-a`, region: r.id, x: c.x + 150, z: c.z + 150, price: base },
    { id: `${r.id}-b`, region: r.id, x: c.x - 150, z: c.z + 150, price: base + 60 },
  ];
});
export const PLOT_BY_ID: Record<string, PlotSite> = Object.fromEntries(PLOTS.map((p) => [p.id, p]));

/**
 * Farmland for sale (economy/fields.ts): two big fields a land, at the town's edge on either side
 * of the east–west avenue — much bigger than a farm bed. Not in the Sky Isles, which buy their
 * food from the lands below.
 */
export const FIELD_SIZE = 40;
export interface FieldSite { id: string; land: RegionId; x: number; z: number; price: number }
export const FIELD_SITES: FieldSite[] = REGIONS.filter((r) => r.id !== 'skyisles').flatMap((r, i) => {
  const c = regionCenter(r);
  const base = 180 + (i % 5) * 20;
  return [
    { id: `${r.id}-f1`, land: r.id, x: c.x + 205, z: c.z + 62, price: base },
    { id: `${r.id}-f2`, land: r.id, x: c.x - 205, z: c.z + 62, price: base + 80 },
  ];
});
export const FIELD_BY_ID: Record<string, FieldSite> = Object.fromEntries(FIELD_SITES.map((f) => [f.id, f]));
