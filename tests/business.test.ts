import { describe, expect, it } from 'vitest';
import { PEOPLE_IN_NEED, give, sponsorOf } from '../src/charity/charity';
import { DAY_MINUTES, newGame } from '../src/core/state';
import { LEVEL_XP } from '../src/economy/items';
import { SECTORS, businessOf, dailyNet, growBusiness, logisticsBonus, openBusiness, staffBusiness, techBonus, tickBusinesses } from '../src/economy/business';
import { PRODUCTS, PRODUCT_BY_INVENTION, manufacture, productPrice, sellProduct, workshopAt } from '../src/economy/manufacture';
import { EXPERTS, employ } from '../src/institutions/institutions';

describe('making and selling your inventions', () => {
  it('every thesis invention can be made from its land’s materials and sold', () => {
    expect(PRODUCTS.length).toBeGreaterThan(30);
    for (const p of PRODUCTS) { expect(p.value).toBeGreaterThan(0); expect(Object.keys(p.needs).length).toBeGreaterThan(0); expect(p.wantedIn.length).toBeGreaterThan(0); }
  });

  it('you make an invention only once invented, at an institute of its science; each sale fills the market', () => {
    const st = newGame();
    const p = PRODUCTS.find((q) => q.topic.science === 'watchmaking')!;
    expect(manufacture(st, p.invention, 'switzerland-inst')).toContain('invented');
    st.inventions.push(p.invention);
    expect(workshopAt(st, p.invention, 'switzerland-inst')).toBe('bench');
    expect(manufacture(st, p.invention, 'switzerland-inst', 2)).toContain('needs');
    st.coins = 100;
    for (const [k, v] of Object.entries(p.needs)) st.inventory[k] = v * 2;
    expect(manufacture(st, p.invention, 'switzerland-inst', 2)).toBeNull();
    expect(st.products[p.invention]).toBe(2);
    const land = p.wantedIn[0], first = productPrice(st, p.invention, land);
    expect(first).toBeGreaterThan(p.value); // wanted here
    const got = sellProduct(st, p.invention, land);
    expect(got).toBe(first);
    expect(productPrice(st, p.invention, land)).toBeLessThan(first);
    sellProduct(st, p.invention, land);
    expect(sellProduct(st, p.invention, land)).toBe(0); // none left
    expect(PRODUCT_BY_INVENTION[p.invention]).toBe(p);
  });
});

describe('businesses you run', () => {
  it('opening needs know-how and coins; growing needs a certificate of the new level', () => {
    const st = newGame();
    st.coins = 5000;
    expect(openBusiness(st, 'healthcare', 'china')).toContain('Medicine');
    st.skills.medicine = LEVEL_XP[2];
    expect(openBusiness(st, 'healthcare', 'china')).toBeNull();
    expect(openBusiness(st, 'healthcare', 'china')).toContain('already');
    const b = businessOf(st, 'healthcare-china')!;
    expect(growBusiness(st, b.id)).toContain('certificate');
    st.certificates['you:medicine'] = { skill: 'medicine', level: 2, land: 'china', day: 1 };
    expect(growBusiness(st, b.id)).toBeNull();
    expect(b.level).toBe(2);
  });

  it('it earns each day, more with staff; healthcare raises the wellbeing of those you sponsor there', () => {
    const st = newGame();
    st.coins = 5000;
    st.skills.medicine = LEVEL_XP[2];
    openBusiness(st, 'healthcare', 'china');
    const b = businessOf(st, 'healthcare-china')!;
    const p = PEOPLE_IN_NEED.find((q) => q.land === 'china')!;
    give(st, p.id, { coins: 60 });
    const wb = sponsorOf(st, p.id)!.wellbeing, bare = dailyNet(st, b);
    const e = EXPERTS.find((x) => x.skill === 'medicine')!;
    expect(staffBusiness(st, b.id, e.id)).toContain('Employ');
    employ(st, e.id, 5, 'coins');
    expect(staffBusiness(st, b.id, e.id)).toBeNull();
    expect(dailyNet(st, b)).toBeGreaterThan(bare);
    const coins = st.coins;
    st.minutes += DAY_MINUTES;
    expect(tickBusinesses(st).length).toBe(1);
    expect(st.coins).toBeGreaterThan(coins);
    expect(sponsorOf(st, p.id)!.wellbeing).toBeGreaterThan(wb);
    expect(tickBusinesses(st).length).toBe(0); // once a day
  });

  it('a tech company lifts your inventions’ prices; a logistics company speeds your couriers', () => {
    const st = newGame();
    st.coins = 5000;
    st.skills.software = LEVEL_XP[2]; st.skills.logistics = LEVEL_XP[2];
    const p = PRODUCTS[0], before = productPrice(st, p.invention, 'meadow');
    expect(techBonus(st)).toBe(0);
    openBusiness(st, 'tech', 'newyork');
    expect(productPrice(st, p.invention, 'meadow')).toBeGreaterThan(before);
    openBusiness(st, 'logistics', 'desert');
    expect(logisticsBonus(st)).toBeGreaterThan(0);
    expect(Object.keys(SECTORS)).toEqual(['healthcare', 'tech', 'logistics']);
  });
});
