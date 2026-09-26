import { describe, expect, it } from 'vitest';
import { isModest } from '../src/characters/modesty';
import { OUTFITS } from '../src/characters/outfits';
import { IDEAL_GAP, MIN_GAP } from '../src/characters/follow';
import { newGame } from '../src/core/state';
import { SEATS } from '../src/event/Chariot';
import { CAKE_SPOT, CASTLE, DONE_FLAG, celebrationObjective, guestSpot, guests, lines } from '../src/event/site';
import { PEOPLE_BY_ID } from '../src/npc/people';
import { SEAT_GAP, VEHICLES } from '../src/vehicles/vehicles';
import { HERO_ONLY, LAND_SHELF, PER_TOWN, wardrobeFor } from '../src/npc/Townsfolk';
import { REGIONS } from '../src/world/regions';
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
    expect(gown.pattern).toBe('floral');
    expect(gown.detail?.vines).toBe(true);
    expect(gown.detail?.glow).toBeGreaterThan(0);
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

  it('the night dragon has two separate saddles, hers in front, a seat-gap apart, after the party', () => {
    const d = VEHICLES.dragon;
    expect(d.seats.length).toBe(2);
    const [g, b] = d.seats as [{ x: number; y: number; z: number }, { x: number; y: number; z: number }];
    expect(Math.hypot(g.x - b.x, g.y - b.y, g.z - b.z)).toBeGreaterThanOrEqual(SEAT_GAP);
    expect(g.z).toBeGreaterThan(b.z);
    expect(d.requires?.flag).toBe(DONE_FLAG);
  });

  it('townsfolk wear their own land’s clothes and never the travellers’ own', () => {
    expect(PER_TOWN).toBeGreaterThanOrEqual(10);
    for (const r of REGIONS) for (const who of ['girl', 'boy'] as const) {
      const pool = wardrobeFor(r.id, who);
      expect(pool.length, `${r.id} ${who}`).toBeGreaterThan(0);
      for (const o of pool) {
        expect(HERO_ONLY.has(o.id)).toBe(false);
        expect(o.who).toBe(who);
        expect(isModest(o)).toBe(true);
      }
    }
    expect(Object.keys(LAND_SHELF).length).toBe(REGIONS.length);
  });
});

describe('every land’s air at the celebration', () => {
  it('each land’s own particles and every kind of weather fill their own slice round the courtyard', async () => {
    const { partyAirs } = await import('../src/world/PartyAir');
    const { LOCALES } = await import('../src/world/locale');
    const { MODES } = await import('../src/world/Ambience');
    const airs = partyAirs();
    for (const r of REGIONS) {
      const a = airs.find((x) => x.source === r.id);
      expect(a, r.id).toBeDefined();
      expect(a!.theme).toBe(LOCALES[r.id].particles);
      expect(a!.n).toBeGreaterThan(50);
    }
    for (const m of Object.keys(MODES)) if (m !== 'none') expect(airs.some((x) => x.source === `ambient:${m}`), m).toBe(true);
    // Slices on the same ring never overlap, so the lands' colours never muddy together.
    const rings = new Map<number, typeof airs>();
    for (const a of airs) rings.set(a.r0, [...(rings.get(a.r0) ?? []), a]);
    for (const list of rings.values()) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const d = Math.abs(Math.atan2(Math.sin(list[i].angle - list[j].angle), Math.cos(list[i].angle - list[j].angle)));
      expect(d).toBeGreaterThanOrEqual(list[i].spread + list[j].spread - 1e-9);
    }
    // All of it stays out of the aisle-and-cake courtyard's middle and within the party grounds.
    for (const a of airs) { expect(a.r0).toBeGreaterThanOrEqual(10); expect(a.r1).toBeLessThanOrEqual(100); }
  });

  it('the meadow’s sky has every sky effect, so the party shows them all', async () => {
    const { SKIES, SKY_KINDS } = await import('../src/world/skies');
    expect([...SKIES.meadow.effects].sort()).toEqual([...SKY_KINDS].sort());
  });
});
