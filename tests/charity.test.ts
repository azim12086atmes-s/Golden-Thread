import { describe, expect, it } from 'vitest';
import { DAY_MINUTES, newGame } from '../src/core/state';
import { DAY_COINS, PEOPLE_IN_NEED, buildFloor, daysLeft, floorsOf, give, homeCapacity, sponsorOf, takeHome, tickCharity } from '../src/charity/charity';
import { REGIONS } from '../src/world/regions';

const homeAt = (st: ReturnType<typeof newGame>, plot: string) => { st.plots[plot] = { decor: [{ id: 'h', kind: 'house-meadow', x: 0, z: -5, rot: 0 }] }; };

describe('caring for people in need', () => {
  it('every land has an orphan, an elder, someone without a home and a family in hardship', () => {
    for (const r of REGIONS) expect(PEOPLE_IN_NEED.filter((p) => p.land === r.id).map((p) => p.kind).sort()).toEqual(['elder', 'family', 'homeless', 'orphan']);
  });

  it('sponsoring in coins or in kind pays for days; wellbeing grows while cared for and falls when not', () => {
    const st = newGame(), p = PEOPLE_IN_NEED[0];
    st.coins = 100; st.inventory = { bread: 2, blanket: 1 };
    expect(give(st, p.id, { coins: DAY_COINS * 2 })).toBeNull();
    expect(daysLeft(st, sponsorOf(st, p.id)!)).toBeCloseTo(2);
    expect(give(st, p.id, { item: 'bread' })).toBeNull();
    expect(daysLeft(st, sponsorOf(st, p.id)!)).toBeCloseTo(3);
    expect(give(st, p.id, { item: 'wood' })).not.toBeNull();
    const w0 = sponsorOf(st, p.id)!.wellbeing;
    st.minutes += 3 * DAY_MINUTES;
    tickCharity(st);
    expect(sponsorOf(st, p.id)!.wellbeing).toBeGreaterThan(w0);
    const w1 = sponsorOf(st, p.id)!.wellbeing;
    st.minutes += 2 * DAY_MINUTES;
    tickCharity(st);
    expect(sponsorOf(st, p.id)!.wellbeing).toBeLessThan(w1);
  });

  it('a home holds more people as floors are built (paid in coins or in food and wood), and takes a day per floor', () => {
    const st = newGame(), plot = 'meadow-a';
    homeAt(st, plot);
    st.coins = 500; st.inventory = { wood: 30, bread: 10 };
    for (const p of PEOPLE_IN_NEED.slice(0, 3)) give(st, p.id, { coins: DAY_COINS });
    expect(takeHome(st, PEOPLE_IN_NEED[0].id, plot)).toBeNull();
    expect(takeHome(st, PEOPLE_IN_NEED[1].id, plot)).toBeNull();
    expect(takeHome(st, PEOPLE_IN_NEED[2].id, plot)).not.toBeNull();
    expect(buildFloor(st, plot, 'kind')).toBeNull();
    expect(floorsOf(st, plot)).toBe(0);
    st.minutes += DAY_MINUTES;
    expect(floorsOf(st, plot)).toBe(1);
    expect(homeCapacity(st, plot)).toBe(4);
    expect(takeHome(st, PEOPLE_IN_NEED[2].id, plot)).toBeNull();
    expect(buildFloor(st, plot, 'coins')).toBeNull();
    expect(st.coins).toBeLessThan(500);
  });
});
