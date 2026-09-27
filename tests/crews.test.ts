import { describe, expect, it } from 'vitest';
import { DAY_MINUTES, newGame } from '../src/core/state';
import { hurry, hurryShare, projectOf, tickWeavers } from '../src/economy/crews';
import { WORKERS, roleTitle, workersOf } from '../src/economy/workers';
import { employ, INSTITUTE_SITES } from '../src/institutions/institutions';
import { REGIONS } from '../src/world/regions';

function building() {
  const st = newGame();
  st.coins = 5000;
  st.minutes = 2 * DAY_MINUTES + 8 * 60;
  const site = INSTITUTE_SITES.find((s) => s.land === 'london' && !s.established)!;
  st.institutes.push({ site: site.id, kind: 'kitchen', stage: 1, at: st.minutes, buildingUntil: st.minutes + 3 * DAY_MINUTES });
  return { st, p: { kind: 'institute' as const, site: site.id } };
}

describe('builders, tent-layers and weavers', () => {
  it('every land has a builder (tent-layers in the tent lands) and a weaver', () => {
    for (const r of REGIONS) {
      expect(workersOf(r.id, 'builder').length, r.id).toBe(1);
      expect(workersOf(r.id, 'weaver').length, r.id).toBe(1);
    }
    expect(roleTitle(workersOf('desert', 'builder')[0])).toBe('tent-layer');
    expect(roleTitle(workersOf('london', 'builder')[0])).toBe('builder');
    expect(new Set(WORKERS.map((w) => w.id)).size).toBe(WORKERS.length);
  });

  it('an employed builder of the land cuts what is left of the building time, once a day', () => {
    const { st, p } = building();
    const b = workersOf('london', 'builder')[0], far = workersOf('japan', 'builder')[0];
    expect(hurry(st, p, b.id)).toMatch(/Employ/);
    employ(st, b.id, 5); employ(st, far.id, 5);
    expect(hurry(st, p, far.id)).toMatch(/another land/);
    const left = projectOf(st, p)!.until! - st.minutes;
    expect(hurry(st, p, b.id)).toBeNull();
    const now = projectOf(st, p)!.until! - st.minutes;
    expect(now).toBeCloseTo(left * (1 - hurryShare('builder', b.level)), -1);
    expect(hurry(st, p, b.id)).toMatch(/today/);
    st.minutes += DAY_MINUTES;
    expect(hurry(st, p, b.id)).toBeNull();
  });

  it('you can lend a hand yourselves: slower than a builder, and your Building grows', () => {
    const { st, p } = building();
    expect(hurryShare('you', 0)).toBeLessThan(hurryShare('builder', 3));
    const until = projectOf(st, p)!.until!;
    expect(hurry(st, p, 'you')).toBeNull();
    expect(st.skills.building).toBeGreaterThan(0);
    expect(projectOf(st, p)!.until!).toBeLessThan(until);
    expect(hurry(st, p, 'you')).toMatch(/today/);
    // Nothing to hurry once it is finished.
    st.minutes = projectOf(st, p)!.until! + 1;
    expect(hurry(st, p, 'you')).toMatch(/Nothing is being built/);
  });

  it('a weaver you employ weaves your fibre into cloth once a day, and waits when you have none', () => {
    const st = newGame();
    st.coins = 500;
    const w = workersOf('china', 'weaver')[0];
    employ(st, w.id, 5);
    st.inventory = { silk: 2, wool: 1 };
    const news = tickWeavers(st);
    expect(news[0].text).toContain(w.name);
    expect(st.inventory.shawl).toBe(1);
    expect(st.inventory.silk).toBeUndefined();
    expect(tickWeavers(st)).toEqual([]); // once a day
    const fresh = newGame();
    fresh.coins = 500;
    employ(fresh, w.id, 5);
    fresh.inventory = {};
    expect(tickWeavers(fresh)).toEqual([]);
    fresh.inventory = { wool: 2 };
    expect(tickWeavers(fresh).length).toBe(1); // the day was not used up
    expect(fresh.inventory.scarf).toBe(1);
  });
});
