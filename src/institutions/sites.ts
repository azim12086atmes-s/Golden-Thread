import { REGIONS, REGION_BY_ID, regionCenter, type RegionId } from '../world/regions';

/** Where institutes stand (institutions.ts): pure data, kept apart so the world builder can keep them clear. */
export interface Site {
  id: string;
  land: RegionId;
  /** World position of the site's centre (SITE_SIZE square). */
  x: number;
  z: number;
  /** The land's own institute (already running), or open ground to found one. */
  established: boolean;
}
/** A site holds a full institution (radius 25 m) with its railings and forecourt. */
export const SITE_SIZE = 56;

/** Where institutes stand in each land: clear of the avenues, the ring road, the plots and the castle. */
export const INSTITUTE_SITES: Site[] = REGIONS.filter((r) => r.id !== 'skyisles').flatMap((r) => {
  const c = regionCenter(r);
  return [
    { id: `${r.id}-inst`, land: r.id, x: c.x - 150, z: c.z - 150, established: true },
    { id: `${r.id}-s1`, land: r.id, x: c.x + 150, z: c.z - 150, established: false },
    { id: `${r.id}-s2`, land: r.id, x: c.x + 205, z: c.z - 62, established: false },
    { id: `${r.id}-s3`, land: r.id, x: c.x - 205, z: c.z - 62, established: false },
  ];
}).concat((() => {
  // The Sky Isles are islands in the air: their sites stand close to the heart of the town.
  const c = regionCenter(REGION_BY_ID.skyisles);
  return [
    { id: 'skyisles-inst', land: 'skyisles' as RegionId, x: c.x - 90, z: c.z - 90, established: true },
    { id: 'skyisles-s1', land: 'skyisles' as RegionId, x: c.x + 90, z: c.z - 90, established: false },
    { id: 'skyisles-s2', land: 'skyisles' as RegionId, x: c.x + 110, z: c.z + 40, established: false },
    { id: 'skyisles-s3', land: 'skyisles' as RegionId, x: c.x - 110, z: c.z + 40, established: false },
  ];
})());
export const SITE_BY_ID: Record<string, Site> = Object.fromEntries(INSTITUTE_SITES.map((s) => [s.id, s]));

