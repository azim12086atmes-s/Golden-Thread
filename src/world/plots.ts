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
