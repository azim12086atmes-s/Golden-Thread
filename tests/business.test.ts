import { describe, expect, it } from 'vitest';
import { PEOPLE_IN_NEED, give, occupantsOf, sponsorOf } from '../src/charity/charity';
import { DAY_MINUTES, newGame, type GameState } from '../src/core/state';
import { deserialize, serialize } from '../src/core/save';
import { LEVEL_XP } from '../src/economy/items';
import {
  MANAGER, MONTH_DAYS, SEEKERS, TRADES, TRADE_IDS, appoint, businessOf, candidatesFor, clientsOf, handOut, logisticsBonus,
  managerBlock, memberLevel, monthlyWage, stageOf, startBusiness, takeOn, takeOrder, teachMember, techBonus, tickBusinesses, workers,
} from '../src/economy/business';
import { PRODUCTS, PRODUCT_BY_INVENTION, manufacture, productPrice, sellProduct, workshopAt } from '../src/economy/manufacture';
import { EXPERTS } from '../src/institutions/institutions';
import { WORKERS } from '../src/economy/workers';

const nextDay = (st: GameState) => { st.minutes = (Math.floor(st.minutes / DAY_MINUTES) + 1) * DAY_MINUTES + 6 * 60; return tickBusinesses(st); };

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

describe('businesses grown from the ground up', () => {
  it('there is a trade for every craft, and people looking for work in every town', () => {
    expect(TRADE_IDS.length).toBeGreaterThanOrEqual(14);
    expect(new Set(TRADE_IDS.map((t) => TRADES[t].skill)).size).toBe(TRADE_IDS.length);
    expect(SEEKERS.filter((s) => s.land === 'london').length).toBeGreaterThanOrEqual(3);
  });

  it('you begin by taking orders yourself, in its own town; each order done well brings more clients', () => {
    const st = newGame();
    expect(startBusiness(st, 'delivery', 'london')).toContain('know');
    st.skills.logistics = LEVEL_XP[1];
    expect(startBusiness(st, 'delivery', 'london')).toBeNull();
    const b = businessOf(st, 'delivery-london')!;
    expect(stageOf(st, b)).toBe('solo');
    expect(takeOrder(st, b.id, 'japan')).toContain('London');
    const clients = clientsOf(b), coins = st.coins;
    for (let i = 0; i < clients; i++) expect(takeOrder(st, b.id, 'london')).toBeNull();
    expect(takeOrder(st, b.id, 'london')).toContain('No orders');
    expect(st.coins).toBeGreaterThan(coins);
    for (let d = 0; d < 6; d++) { nextDay(st); while (!takeOrder(st, b.id, 'london')); }
    expect(clientsOf(b)).toBeGreaterThan(clients);
  });

  it('without the trade you begin by hiring someone who knows it', () => {
    const st = newGame();
    st.coins = 1000;
    const courier = WORKERS.find((w) => w.land === 'london' && w.role === 'courier')!;
    expect(startBusiness(st, 'delivery', 'london', courier.id)).toBeNull();
    const b = businessOf(st, 'delivery-london')!;
    expect(b.team[0].id).toBe(courier.id);
    expect(stageOf(st, b)).toBe('team');
    const r = handOut(st, b.id, 'london');
    expect('n' in r && r.n).toBeGreaterThan(0);
  });

  it('you teach an apprentice — someone you sponsor who wants the trade, or someone looking for work', () => {
    const st = newGame();
    st.coins = 2000;
    const p = PEOPLE_IN_NEED.find((q) => q.learn === 'cooking')!;
    st.skills.cooking = LEVEL_XP[3];
    startBusiness(st, 'kitchen', p.land);
    const b = businessOf(st, `kitchen-${p.land}`)!;
    expect(candidatesFor(st, b).some((c) => c.id === p.id)).toBe(false); // not sponsored yet
    give(st, p.id, { coins: 120 });
    expect(takeOn(st, b.id, p.id, 'wage')).toContain('cared for');
    expect(takeOn(st, b.id, p.id, 'care')).toBeNull();
    expect(workers(st, b).length).toBe(0); // an apprentice until taught
    expect(teachMember(st, b.id, p.id, p.land)).toBeNull();
    expect(teachMember(st, b.id, p.id, p.land)).toContain('today');
    expect(memberLevel(st, b, p.id)).toBe(1);
    expect(workers(st, b).length).toBe(1);
    // Someone looking for work, on a monthly wage.
    const k = SEEKERS.find((x) => x.land === p.land)!;
    const coins = st.coins;
    expect(takeOn(st, b.id, k.id, 'wage')).toBeNull();
    expect(st.coins).toBe(coins - monthlyWage(0));
    expect(b.team.find((m) => m.id === k.id)!.paidUntil).toBe(st.minutes + MONTH_DAYS * DAY_MINUTES);
  });

  it('keep needs a home of yours in the town with room, and food each day; without food they stop', () => {
    const st = newGame();
    st.coins = 1000; st.skills.weaving = LEVEL_XP[2];
    startBusiness(st, 'boutique', 'meadow');
    const b = businessOf(st, 'boutique-meadow')!, k = SEEKERS.find((x) => x.land === 'meadow')!;
    expect(takeOn(st, b.id, k.id, 'keep')).toContain('home');
    st.plots['meadow-a'] = { decor: [{ id: 'h', kind: 'house-meadow', x: 0, z: -5, rot: 0 }] };
    expect(takeOn(st, b.id, k.id, 'keep')).toContain('food');
    st.inventory.bread = 2;
    expect(takeOn(st, b.id, k.id, 'keep')).toBeNull();
    expect(occupantsOf(st, 'meadow-a')).toBe(1);
    st.learners[k.id] = { weaving: LEVEL_XP[1] };
    expect(workers(st, b).length).toBe(1);
    nextDay(st); // eats the last bread
    expect(workers(st, b).length).toBe(1);
    const news = nextDay(st); // nothing left
    expect(news.some((n) => n.text.includes('no food'))).toBe(true);
    expect(workers(st, b).length).toBe(0);
  });

  it('a manager who knows the trade, over a team of two, runs the day without you', () => {
    const st = newGame();
    st.coins = 5000; st.skills.logistics = LEVEL_XP[3];
    startBusiness(st, 'delivery', 'london');
    const b = businessOf(st, 'delivery-london')!;
    b.rep = 30;
    const [a, c, d] = SEEKERS.filter((x) => x.land === 'london');
    for (const s of [a, c, d]) { takeOn(st, b.id, s.id, 'wage'); st.learners[s.id] = { logistics: LEVEL_XP[1] }; }
    expect(managerBlock(st, b, a.id)).toContain(`level ${MANAGER.level}`);
    st.learners[a.id] = { logistics: LEVEL_XP[2] };
    expect(appoint(st, b.id, a.id)).toBeNull();
    expect(stageOf(st, b)).toBe('managed');
    const coins = st.coins;
    const news = nextDay(st);
    expect(news.some((n) => n.text.includes('orders today'))).toBe(true);
    expect(st.coins).toBeGreaterThan(coins);
    expect(b.done).toBeGreaterThan(0);
  });

  it('those who know the trade well teach the apprentices each day', () => {
    const st = newGame();
    st.coins = 5000;
    const expert = EXPERTS.find((e) => e.level >= 3 && TRADE_IDS.some((t) => TRADES[t].skill === e.skill))!;
    const trade = TRADE_IDS.find((t) => TRADES[t].skill === expert.skill)!;
    expect(startBusiness(st, trade, expert.land, expert.id)).toBeNull();
    const b = businessOf(st, `${trade}-${expert.land}`)!, k = SEEKERS.find((x) => x.land === expert.land)!;
    takeOn(st, b.id, k.id, 'wage');
    expect(memberLevel(st, b, k.id)).toBe(0);
    nextDay(st); nextDay(st);
    expect(memberLevel(st, b, k.id)).toBeGreaterThanOrEqual(1);
  });

  it('clinics care for those you sponsor; software sells your inventions for more; delivery speeds couriers', () => {
    const st = newGame();
    st.coins = 5000;
    st.skills.medicine = LEVEL_XP[2]; st.skills.software = LEVEL_XP[2]; st.skills.logistics = LEVEL_XP[2];
    const p = PEOPLE_IN_NEED.find((q) => q.land === 'china')!;
    give(st, p.id, { coins: 60 });
    startBusiness(st, 'clinic', 'china');
    const cl = businessOf(st, 'clinic-china')!, k = SEEKERS.find((x) => x.land === 'china')!;
    takeOn(st, cl.id, k.id, 'wage'); st.learners[k.id] = { medicine: LEVEL_XP[1] };
    const wb = sponsorOf(st, p.id)!.wellbeing;
    nextDay(st);
    expect(sponsorOf(st, p.id)!.wellbeing).toBeGreaterThan(wb);

    const before = productPrice(st, PRODUCTS[0].invention, 'meadow');
    startBusiness(st, 'software', 'newyork');
    const sw = businessOf(st, 'software-newyork')!, s2 = SEEKERS.find((x) => x.land === 'newyork')!;
    takeOn(st, sw.id, s2.id, 'wage'); st.learners[s2.id] = { software: LEVEL_XP[1] };
    expect(techBonus(st)).toBeGreaterThan(0);
    expect(productPrice(st, PRODUCTS[0].invention, 'meadow')).toBeGreaterThan(before);
    startBusiness(st, 'delivery', 'desert');
    const dl = businessOf(st, 'delivery-desert')!, s3 = SEEKERS.find((x) => x.land === 'desert')!;
    takeOn(st, dl.id, s3.id, 'wage'); st.learners[s3.id] = { logistics: LEVEL_XP[1] };
    expect(logisticsBonus(st)).toBeGreaterThan(0);
  });

  it('businesses from older saves carry over', () => {
    const st = newGame();
    const raw = JSON.parse(serialize(st));
    raw.businesses = [{ id: 'tech-newyork', sector: 'tech', land: 'newyork', level: 2, staff: [], day: 0, earned: 40 }];
    const back = deserialize(JSON.stringify(raw))!;
    expect(back.businesses[0].trade).toBe('software');
    expect(back.businesses[0].team).toEqual([]);
  });
});
