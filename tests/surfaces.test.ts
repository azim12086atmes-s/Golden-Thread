import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { REGIONS } from '../src/world/regions';
import { LAND_SURFACES, SURF, surfacesByColour } from '../src/world/surfaces';
import { GeoBuilder, box } from '../src/world/kit';

describe('what buildings are made of', () => {
  it('every land names a surface for each of its wall colours, roof colours and its road', () => {
    for (const r of REGIONS) {
      const ls = LAND_SURFACES[r.id];
      expect(ls, r.id).toBeDefined();
      const m = surfacesByColour(r);
      for (const c of [...r.walls, ...r.roofs, r.road]) expect(m.has(c.toLowerCase()), `${r.id} ${c}`).toBe(true);
      for (const v of m.values()) expect(Object.values(SURF)).toContain(v);
    }
  });

  it('London is brick and slate on asphalt; New Yonder has glass; the Mughal gardens have marble', () => {
    const find = (id: string) => REGIONS.find((r) => r.id === id)!;
    const lon = surfacesByColour(find('london'));
    expect(lon.get(find('london').walls[0])).toBe(SURF.brick);
    expect(lon.get(find('london').roofs[0])).toBe(SURF.slate);
    expect(lon.get(find('london').road)).toBe(SURF.asphalt);
    expect([...surfacesByColour(find('newyork')).values()]).toContain(SURF.glass);
    expect([...surfacesByColour(find('mughal')).values()]).toContain(SURF.marble);
  });

  it('a GeoBuilder part takes the surface of its colour, and plain otherwise', () => {
    const g = new GeoBuilder();
    g.surfaces = new Map([['#9a4a3a', SURF.brick]]);
    box(g, 1, 1, 1, '#9a4a3a', 0, 0, 0);
    box(g, 1, 1, 1, '#123456', 3, 0, 0);
    const m = g.build(new THREE.MeshBasicMaterial())!;
    const s = m.geometry.getAttribute('surf'), p = m.geometry.getAttribute('position');
    for (let i = 0; i < s.count; i++) expect(s.getX(i)).toBe(p.getX(i) < 2 ? SURF.brick : SURF.plain);
  });
});
