import { describe, expect, it } from 'vitest';
import { parkingNear } from '../src/player/Travellers';
import { harbours } from '../src/world/harbours';
import { WATER_Y, terrainHeight } from '../src/world/terrain';

describe('Safar parks on dry ground', () => {
  it('arriving on a pier over the sea, Safar parks on the nearest dry land, never on the water', () => {
    expect(harbours().length).toBeGreaterThan(5);
    for (const hb of harbours()) {
      // Where the old rule parked it: seven metres to the side of the pier head.
      const want = { x: hb.headX - 7, z: hb.headZ + 3 };
      const p = parkingNear(want.x, want.z);
      for (const [dx, dz] of [[0, 0], [3.5, 0], [-3.5, 0], [0, 3.5], [0, -3.5]]) expect(terrainHeight(p.x + dx, p.z + dz), hb.land).toBeGreaterThan(WATER_Y + 0.39);
      expect(Math.hypot(p.x - want.x, p.z - want.z), hb.land).toBeLessThan(160);
    }
  });

  it('on dry ground it parks just where it was asked', () => {
    let x = 0, z = 0;
    while (terrainHeight(x, z) < WATER_Y + 3) x += 10;
    expect(parkingNear(x, z)).toEqual({ x, z });
  });
});
