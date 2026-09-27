import { describe, expect, it } from 'vitest';
import { DAY_MINUTES, newGame } from '../src/core/state';
import { deserialize, serialize } from '../src/core/save';
import { CROPS, SEED_SHOP } from '../src/housing/housing';
import { FIELD_ROWS, FIELD_SITES, FIELD_SIZE, buyField, fieldGrowTime, fieldYield, harvestField, plantField, setHand, takeFromBarn, tickFields, waterField } from '../src/economy/fields';
import { addRoute, glutOf, marketDest, marketPrice, pantryDest, sellHere, tickSupply, tripMinutes } from '../src/economy/supply';
import { WORKERS, WORKER_BY_ID, workersOf } from '../src/economy/workers';
import { INSTITUTE_SITES, SITE_SIZE, employ } from '../src/institutions/institutions';
import { PLOTS, PLOT_SIZE } from '../src/world/plots';
import { REGIONS, regionCenter } from '../src/world/regions';
import { WATER_Y, terrainHeight } from '../src/world/terrain';

const field = FIELD_SITES.find((f) => f.land === 'indonesia')!;
const seed = SEED_SHOP.indonesia[0];

function farmer() {
  const st = newGame();
  st.coins = 5000;
  st.inventory[seed] = FIELD_ROWS * 2;
  expect(buyField(st, field.id)).toBeNull();
  return st;
}

describe('agriculture land', () => {
  it('two big fields in every land below the clouds, on dry, even ground clear of roads, plots and institutes', () => {
    for (const r of REGIONS) {
      const mine = FIELD_SITES.filter((f) => f.land === r.id);
      expect(mine.length, r.id).toBe(r.id === 'skyisles' ? 0 : 2);
      const c = regionCenter(r);
      for (const f of mine) {
        const x = f.x - c.x, z = f.z - c.z;
        expect(Math.abs(z) - FIELD_SIZE / 2, f.id).toBeGreaterThan(12); // off the east–west avenue
        expect(Math.abs(Math.hypot(x, z) - 140), f.id).toBeGreaterThan(30); // off the ring road
        for (const p of PLOTS) expect(Math.abs(p.x - f.x) > (FIELD_SIZE + PLOT_SIZE) / 2 || Math.abs(p.z - f.z) > (FIELD_SIZE + PLOT_SIZE) / 2, f.id).toBe(true);
        for (const s of INSTITUTE_SITES) expect(Math.abs(s.x - f.x) > (FIELD_SIZE + SITE_SIZE) / 2 || Math.abs(s.z - f.z) > (FIELD_SIZE + SITE_SIZE) / 2, f.id).toBe(true);
        const hs = [[0, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]].map(([i, j]) => terrainHeight(f.x + i * FIELD_SIZE * 0.45, f.z + j * FIELD_SIZE * 0.45));
        for (const h of hs) expect(h, f.id).toBeGreaterThan(WATER_Y + 0.3);
        expect(Math.max(...hs) - Math.min(...hs), f.id).toBeLessThan(6);
      }
    }
  });

  it('a field is bought, grows only its own land\'s crops, and yields eight rows — more for a skilled farmer', () => {
    const st = farmer();
    expect(buyField(st, field.id)).toMatch(/already/);
    const foreign = Object.keys(CROPS).find((s) => !SEED_SHOP.indonesia.includes(s))!;
    st.inventory[foreign] = FIELD_ROWS;
    expect(plantField(st, field.id, foreign)).toMatch(/grows what the land grows/);
    expect(plantField(st, field.id, seed)).toBeNull();
    expect(st.inventory[seed]).toBe(FIELD_ROWS);
    expect(harvestField(st, field.id)).toEqual({ error: 'It is not ripe yet.' });
    expect(waterField(st, field.id)).toBeNull();
    expect(waterField(st, field.id)).toMatch(/had its water/);
    st.minutes += fieldGrowTime(seed);
    const got = harvestField(st, field.id);
    expect('n' in got && got.n).toBe(fieldYield(seed, 0));
    expect(fieldYield(seed, 0)).toBe(CROPS[seed].qty * FIELD_ROWS);
    expect(fieldYield(seed, 5)).toBeGreaterThan(fieldYield(seed, 0));
    const out = CROPS[seed].out;
    expect(takeFromBarn(st, field.id, out, 3)).toBe(3);
    expect(st.fields[field.id].store[out]).toBe(fieldYield(seed, 0) - 3);
  });

  it('an employed farmhand of the land waters, harvests, saves seed and sows again while you are away', () => {
    const st = farmer();
    const hand = workersOf('indonesia', 'farmhand')[0];
    expect(setHand(st, field.id, { who: 'hire', id: hand.id })).toMatch(/Employ/);
    expect(setHand(st, field.id, { who: 'hire', id: workersOf('japan', 'farmhand')[0].id })).toMatch(/farms in/);
    expect(employ(st, hand.id, 10)).toBeNull();
    expect(setHand(st, field.id, { who: 'hire', id: hand.id })).toBeNull();
    expect(plantField(st, field.id, seed)).toBeNull();
    st.minutes += fieldGrowTime(seed) * 3;
    const news = tickFields(st);
    expect(news.length).toBe(1);
    expect(news[0].text).toContain(hand.name);
    const store = st.fields[field.id].store[CROPS[seed].out];
    expect(store).toBeGreaterThanOrEqual(fieldYield(seed, hand.level) * 3);
    expect(st.fields[field.id].crop?.seed).toBe(seed); // sown again
    // Once their pay runs out, the field waits for you.
    st.minutes += 12 * DAY_MINUTES;
    tickFields(st);
    const before = st.fields[field.id].store[CROPS[seed].out];
    st.minutes += fieldGrowTime(seed) * 2;
    expect(tickFields(st)).toEqual([]);
    expect(st.fields[field.id].store[CROPS[seed].out]).toBe(before);
  });
});

describe('the supply chain', () => {
  it('every land has a farmhand and a courier riding a vehicle from its own traffic', async () => {
    const { LAND_TRAFFIC } = await import('../src/traffic/roster');
    for (const r of REGIONS) {
      expect(workersOf(r.id, 'farmhand').length, r.id).toBe(1);
      const [c] = workersOf(r.id, 'courier');
      const rides = [...LAND_TRAFFIC[r.id].road, ...LAND_TRAFFIC[r.id].water, ...LAND_TRAFFIC[r.id].sky].map(([d]) => d);
      expect(rides, r.id).toContain(c.vehicle);
      expect(c.capacity).toBeGreaterThan(0);
    }
    expect(new Set(WORKERS.map((w) => w.id)).size).toBe(WORKERS.length);
  });

  it('a courier carries a load from the barn to a far market, sells it, and markets fill up', () => {
    const st = farmer();
    const out = CROPS[seed].out;
    st.fields[field.id].store[out] = 100;
    const courier = workersOf('indonesia', 'courier')[0];
    expect(addRoute(st, courier.id, field.id, marketDest('london'))).toMatch(/Employ/);
    expect(employ(st, courier.id, 10)).toBeNull();
    expect(addRoute(st, courier.id, field.id, marketDest('london'))).toBeNull();
    tickSupply(st);
    expect(st.shipments.length).toBe(1);
    expect(st.fields[field.id].store[out]).toBe(100 - courier.capacity!);
    const trip = tripMinutes(courier, 'indonesia', 'london');
    expect(trip).toBeGreaterThan(tripMinutes(courier, 'indonesia', 'indonesia'));
    expect(tripMinutes(WORKER_BY_ID['courier-newyork'], 'indonesia', 'london')).toBeLessThan(trip); // hover-cars beat bemos
    const first = marketPrice(st, out, 'london'), coins = st.coins;
    st.minutes += trip;
    const news = tickSupply(st);
    expect(news[0].text).toContain('Old London');
    expect(st.coins).toBeGreaterThan(coins);
    expect(st.coins - coins).toBeLessThan(first * courier.capacity!); // each unit fetched a little less
    expect(marketPrice(st, out, 'london')).toBeLessThan(first);
    expect(glutOf(st, 'london', out)).toBeCloseTo(courier.capacity!, 5);
    // The courier sets off again at once with the next load; the glut fades over days.
    expect(st.shipments.length).toBe(1);
    st.minutes += 10 * DAY_MINUTES;
    expect(marketPrice(st, out, 'london')).toBeGreaterThan(first * 0.8);
  });

  it('a courier can keep your soup kitchen stocked from your field', () => {
    const st = farmer();
    const site = INSTITUTE_SITES.find((s) => s.land === 'indonesia' && !s.established)!;
    st.institutes.push({ site: site.id, kind: 'kitchen', stage: 0, at: st.minutes });
    const out = CROPS[seed].out;
    st.fields[field.id].store = { [out]: 10, cotton: 5 };
    const courier = workersOf('indonesia', 'courier')[0];
    employ(st, courier.id, 5);
    expect(addRoute(st, courier.id, field.id, pantryDest('nowhere'))).toBeTruthy();
    expect(addRoute(st, courier.id, field.id, pantryDest(site.id))).toBeNull();
    tickSupply(st);
    st.minutes += DAY_MINUTES;
    tickSupply(st);
    expect(st.pantry[site.id][out]).toBe(10);
    expect(st.pantry[site.id].cotton).toBeUndefined(); // only what a kitchen can cook
    expect(st.fields[field.id].store.cotton).toBe(5);
  });

  it('fields, routes, loads and markets survive a save, and old saves gain them', () => {
    const st = farmer();
    const back = deserialize(serialize(st))!;
    expect(back.fields[field.id]).toBeTruthy();
    const old = newGame() as unknown as Record<string, unknown>;
    for (const k of ['fields', 'routes', 'shipments', 'glut']) delete old[k];
    const loaded = deserialize(JSON.stringify(old))!;
    expect(loaded.fields).toEqual({});
    expect(loaded.routes).toEqual([]);
    expect(loaded.shipments).toEqual([]);
    expect(loaded.glut).toEqual({});
  });
});

describe('your own sales fill a market too', () => {
  it('each sale pays a little less, and the market recovers day by day', () => {
    const st = newGame();
    st.inventory.silk = 30;
    const first = marketPrice(st, 'silk', 'london');
    let got = 0;
    for (let i = 0; i < 20; i++) got += sellHere(st, 'silk', 'london');
    expect(got).toBeGreaterThan(0);
    expect(marketPrice(st, 'silk', 'london')).toBeLessThan(first);
    expect(glutOf(st, 'london', 'silk')).toBeGreaterThan(19);
    st.minutes += DAY_MINUTES * 10;
    expect(marketPrice(st, 'silk', 'london')).toBeGreaterThan(first * 0.8);
    // Nothing to sell, nothing sold.
    st.inventory.silk = 0;
    expect(sellHere(st, 'silk', 'london')).toBe(0);
  });
});
