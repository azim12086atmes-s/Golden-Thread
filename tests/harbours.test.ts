import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { newGame } from '../src/core/state';
import { FIELD_SITES } from '../src/economy/fields';
import { addRoute, marketDest, tickSupply, tripMinutes } from '../src/economy/supply';
import { workersOf } from '../src/economy/workers';
import { employ } from '../src/institutions/institutions';
import { hasDesign } from '../src/traffic/designs';
import { SEA_TRAFFIC, SHIP_LINE, resolveShip } from '../src/traffic/roster';
import { landRoutes } from '../src/traffic/Traffic';
import { harbours, hasHarbour, LANE_HALF } from '../src/world/harbours';
import { REGIONS, regionCenter } from '../src/world/regions';
import { WATER_Y, terrainHeight } from '../src/world/terrain';

describe('harbours and sea lanes', () => {
  it('every land on the coast has a harbour; inland lands and the Sky Isles do not', () => {
    const hs = harbours();
    expect(hs.length).toBe(14);
    for (const r of REGIONS) expect(hs.some((h) => h.land === r.id), r.id).toBe(hasHarbour(r.id));
    for (const id of ['meadow', 'japan', 'renaissance', 'indonesia', 'islamic', 'skyisles'] as const) expect(hasHarbour(id), id).toBe(false);
  });

  it('the quay is on the shore, the pier head in water deep enough for ships, the lane deep all along', () => {
    for (const h of harbours()) {
      expect(terrainHeight(h.x, h.z), h.id).toBeGreaterThan(WATER_Y - 1.5);
      expect(terrainHeight(h.x, h.z), h.id).toBeLessThan(WATER_Y + 4);
      expect(terrainHeight(h.headX, h.headZ), h.id).toBeLessThan(WATER_Y - 1.5);
      expect(h.pier, h.id).toBeGreaterThan(8);
      expect(h.pier, h.id).toBeLessThan(160);
      const c = regionCenter(REGIONS.find((r) => r.id === h.land)!), [dx, dz] = h.dir;
      for (let s = -h.reach; s <= h.reach; s += 20) for (const o of [-LANE_HALF, LANE_HALF]) {
        const x = c.x + dx * (h.lane + o) - dz * s, z = c.z + dz * (h.lane + o) + dx * s;
        expect(terrainHeight(x, z), `${h.id} ${s} ${o}`).toBeLessThan(WATER_Y - 1.5);
      }
    }
  });

  it('each harbour land has a sea lane that passes the pier head, sailed by ships that exist (or their stand-ins)', () => {
    const v = new THREE.Vector3();
    for (const h of harbours()) {
      const { sea } = landRoutes(h.land);
      expect(sea.length, h.id).toBe(1);
      const r = sea[0];
      r.at(r.dock!, v);
      expect(Math.hypot(v.x - h.headX, v.z - h.headZ), h.id).toBeLessThan(8);
      for (let u = 0; u < r.len; u += 25) { r.at(u, v); expect(terrainHeight(v.x, v.z), `${h.id} u=${u}`).toBeLessThan(WATER_Y - 1.5); }
      for (const [want, stand] of SEA_TRAFFIC[h.land]!) expect(hasDesign(resolveShip(want, stand, hasDesign)), `${h.land} ${want}`).toBe(true);
      expect(SHIP_LINE[h.land], h.land).toBeTruthy();
    }
    expect(landRoutes('meadow').sea.length).toBe(0);
  });

  it('a chartered ship carries a big load harbour to harbour, and only between coastal lands', () => {
    const st = newGame();
    st.coins = 5000;
    const field = FIELD_SITES.find((f) => f.land === 'indiasouth')!, inland = FIELD_SITES.find((f) => f.land === 'japan')!;
    st.fields[field.id] = { store: { rice: 200 }, at: st.minutes };
    st.fields[inland.id] = { store: { rice: 200 }, at: st.minutes };
    const [ship] = workersOf('indiasouth', 'ship'), [courier] = workersOf('indiasouth', 'courier');
    expect(ship.capacity!).toBeGreaterThan(courier.capacity! * 2);
    expect(employ(st, ship.id, 5)).toBeNull();
    expect(addRoute(st, ship.id, inland.id, marketDest('london'))).toMatch(/harbour to harbour/);
    expect(addRoute(st, ship.id, field.id, marketDest('meadow'))).toMatch(/harbour to harbour/);
    expect(addRoute(st, ship.id, field.id, marketDest('london'))).toBeNull();
    tickSupply(st);
    expect(st.shipments[0].items.rice).toBe(ship.capacity);
    const coins = st.coins;
    st.minutes += tripMinutes(ship, 'indiasouth', 'london');
    expect(tickSupply(st)[0].text).toContain('Old London');
    expect(st.coins).toBeGreaterThan(coins);
  });
});
