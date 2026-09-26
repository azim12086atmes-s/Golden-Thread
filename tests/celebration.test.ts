import { describe, expect, it } from 'vitest';
import { isModest } from '../src/characters/modesty';
import { OUTFITS } from '../src/characters/outfits';
import { IDEAL_GAP, MIN_GAP } from '../src/characters/follow';
import { newGame } from '../src/core/state';
import { SEATS } from '../src/event/Chariot';
import { CAKE_SPOT, CASTLE, DONE_FLAG, celebrationObjective, guestSpot, guests, lines } from '../src/event/site';
import { PEOPLE_BY_ID } from '../src/npc/people';
import { SEAT_GAP } from '../src/vehicles/vehicles';
import { CASTLE_SITE, castleBase, terrainHeight } from '../src/world/terrain';
import { regionAt } from '../src/world/regions';

describe('the celebration evening', () => {
  it('the castle stands on levelled ground in Wanderers’ Meadow', () => {
    expect(regionAt(CASTLE_SITE.x, CASTLE_SITE.z).id).toBe('meadow');
    const y = castleBase();
    for (const [x, z] of [[CASTLE.venue.x, CASTLE.venue.z], [CASTLE.keep.x, CASTLE.keep.z], [CAKE_SPOT.x, CAKE_SPOT.z], [CASTLE.landing.x, CASTLE.landing.z]]) {
      expect(Math.abs(terrainHeight(x, z) - y), `${x},${z}`).toBeLessThan(0.05);
    }
  });

  it('guests come from every land (except the Sky Isles) and are real residents, apart from each other', () => {
    const list = guests();
    expect(new Set(list.map((p) => p.region)).size).toBe(19);
    for (const p of list) expect(PEOPLE_BY_ID[p.id]).toBe(p);
    const spots = list.map((_, i) => guestSpot(i, list.length));
    for (let i = 0; i < spots.length; i++) for (let j = i + 1; j < spots.length; j++) {
      expect(Math.hypot(spots[i].x - spots[j].x, spots[i].z - spots[j].z)).toBeGreaterThan(1);
    }
    // Nobody stands in the aisle.
    for (const s of spots) if (s.z > CAKE_SPOT.z) expect(Math.abs(s.x - CASTLE.aisle.x)).toBeGreaterThan(3);
  });

  it('the gown and the sherwani are modest, and the gown has its rainbow and stars', () => {
    const gown = OUTFITS['g-starlight-gown'], sher = OUTFITS['b-celebration'];
    expect(isModest(gown) && isModest(sher)).toBe(true);
    expect(gown.detail?.rainbow).toBe(true);
    expect(gown.pattern).toBe('stars');
    expect(gown.head.style).toBe('hijab');
  });

  it('the chariot has two separate seats, apart', () => {
    expect(SEATS.girl.distanceTo(SEATS.boy)).toBeGreaterThanOrEqual(SEAT_GAP);
  });

  it('the guide leads to the chariot until the evening has been celebrated', () => {
    const st = newGame();
    const o = celebrationObjective(st, { x: 5, z: 9 });
    expect(o?.next?.target).toEqual({ kind: 'point', x: 5, z: 9, region: 'meadow' });
    expect(o?.title).toContain(st.names.girl);
    st.flags.push(DONE_FLAG);
    expect(celebrationObjective(st, { x: 5, z: 9 })).toBeNull();
    expect(lines(st).venue[1]).toBe(`Congratulations, ${st.names.girl}, on your new job!`);
  });

  it('they walk 25% closer than before, and still never touch', () => {
    expect(IDEAL_GAP).toBeCloseTo(2.6 * 0.75);
    expect(IDEAL_GAP).toBeGreaterThan(MIN_GAP);
  });
});
