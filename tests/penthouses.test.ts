import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/core/state';
import { deserialize, serialize } from '../src/core/save';
import { PENTHOUSE_PRICE, buyPenthouse, ownsPenthouse } from '../src/housing/penthouses';
import { buildInterior } from '../src/world/models/interiors';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGION_BY_ID, REGIONS } from '../src/world/regions';

describe('penthouses', () => {
  it("a few of New Yonder's tallest towers carry one, entered by the lift from the lobby; no other land has any", () => {
    const solid = new THREE.MeshStandardMaterial(), glow = new THREE.MeshBasicMaterial();
    const ny = buildRegion(REGION_BY_ID.newyork, solid, glow).doors.filter((d) => d.kind === 'penthouse');
    expect(ny.length).toBeGreaterThanOrEqual(2);
    expect(ny.length).toBeLessThanOrEqual(8);
    // The lift door is at street level, at the tower's foot.
    for (const d of ny) expect(d.y).toBeLessThan(20);
    for (const r of REGIONS.filter((q) => q.id !== 'newyork').slice(0, 4)) expect(buildRegion(r, solid, glow).doors.some((d) => d.kind === 'penthouse'), r.id).toBe(false);
  }, 120_000);

  it('can be bought once, for its price, and is kept in the save', () => {
    const st = newGame();
    st.coins = PENTHOUSE_PRICE - 1;
    expect(buyPenthouse(st, 'newyork:7')).toBe('coins');
    st.coins = PENTHOUSE_PRICE + 50;
    expect(buyPenthouse(st, 'newyork:7')).toBe('ok');
    expect(st.coins).toBe(50);
    expect(buyPenthouse(st, 'newyork:7')).toBe('owned');
    expect(ownsPenthouse(deserialize(serialize(st))!, 'newyork:7')).toBe(true);
    const old = JSON.parse(serialize(newGame()));
    delete old.penthouses;
    expect(deserialize(JSON.stringify(old))!.penthouses).toEqual([]);
  });

  it('inside, the two sit in separate armchairs well apart, by day and by night', () => {
    for (const night of [0, 1]) {
      const b = buildInterior({ kind: 'penthouse', land: 'newyork', night, seed: 'p' })!;
      expect(b).not.toBeNull();
      const [g, y] = b.seats;
      expect(Math.hypot(g[0] - y[0], g[2] - y[2])).toBeGreaterThanOrEqual(2.2);
      for (const [x, z] of b.spots) for (const s of b.seats) expect(Math.hypot(x - s[0], z - s[2])).toBeGreaterThanOrEqual(1.5);
    }
  });
});
