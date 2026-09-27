import { describe, expect, it } from 'vitest';
import { PEOPLE_IN_NEED, give, sponsorOf, takeHome } from '../src/charity/charity';
import { DAY_MINUTES, newGame, type GameState } from '../src/core/state';
import { BAG_CAP, VAN_CAP, addItem, carryNews, loadOf } from '../src/economy/economy';
import { HOME_CAP, mealsIn, putAway, storeOf, takeOut, tickHomes } from '../src/economy/storage';
import { addRoute, homeDest, tickSupply } from '../src/economy/supply';
import { employ } from '../src/institutions/institutions';
import { ERRAND_DAYS, expireErrands, folkOf, talkToFolk } from '../src/npc/folk';

const home = (st: GameState, id = 'meadow-a') => { st.plots[id] = { decor: [{ id: 'h', kind: 'house-meadow', x: 0, z: -5, rot: 0 }] }; };

describe('carrying: the bag, the van and your homes hold only so much', () => {
  it('what will not fit in the bag goes to the van, and beyond that is left behind', () => {
    const st = newGame();
    carryNews.length = 0;
    const room = BAG_CAP - loadOf(st.inventory);
    expect(addItem(st, 'wood', room + 10)).toBe(room);
    expect(loadOf(st.inventory)).toBe(BAG_CAP);
    expect(st.stores.van.wood).toBe(10);
    addItem(st, 'wood', VAN_CAP);
    expect(loadOf(st.stores.van)).toBe(VAN_CAP);
    expect(carryNews.some((n) => n.includes('left behind'))).toBe(true);
  });

  it('you put things away at a home and take them out, within its room', () => {
    const st = newGame();
    st.inventory.rice = 10;
    expect(putAway(st, 'meadow-a', 'rice', 2)).toContain('home');
    home(st);
    expect(putAway(st, 'meadow-a', 'rice', 4)).toBeNull();
    expect(storeOf(st, 'meadow-a').rice).toBe(4);
    expect(takeOut(st, 'meadow-a', 'rice', 1)).toBeNull();
    expect(st.inventory.rice).toBe(7);
    st.inventory.wood = HOME_CAP + 5;
    expect(putAway(st, 'meadow-a', 'wood', HOME_CAP)).toContain('room');
  });
});

describe('the people living in your homes eat from its store', () => {
  it('a dish is a meal; raw produce is cooked two to a meal; with none, they go hungry', () => {
    const st = newGame();
    home(st);
    const p = PEOPLE_IN_NEED.find((q) => q.land === 'meadow')!;
    st.coins = 100; give(st, p.id, { coins: 6 }); takeHome(st, p.id, 'meadow-a');
    const s = storeOf(st, 'meadow-a');
    s.curry = 1; s.rice = 3;
    expect(mealsIn(st, 'meadow-a')).toBe(2);
    st.minutes += DAY_MINUTES;
    tickHomes(st);
    expect(s.curry).toBeUndefined(); // ate the dish first
    const until = sponsorOf(st, p.id)!.paidUntil;
    expect(until).toBeGreaterThan(st.minutes); // a meal at home is a day of care
    st.minutes += DAY_MINUTES;
    tickHomes(st);
    expect(s.rice).toBe(1); // two raw, cooked into one meal
    st.minutes += DAY_MINUTES;
    const news = tickHomes(st);
    expect(news.some((n) => n.text.includes('hungry'))).toBe(true);
    expect(tickHomes(st)).toEqual([]); // once a day
  });

  it('a courier can carry the harvest from your barn to a home', () => {
    const st = newGame();
    home(st);
    st.coins = 500;
    st.fields['meadow-f1'] = { store: { rice: 6, wood: 3 }, at: 0 };
    employ(st, 'courier-meadow', 3);
    expect(addRoute(st, 'courier-meadow', 'meadow-f1', homeDest('meadow-a'))).toBeNull();
    tickSupply(st);
    st.minutes += 2 * DAY_MINUTES;
    tickSupply(st);
    expect(storeOf(st, 'meadow-a').rice).toBe(6);
    expect(storeOf(st, 'meadow-a').wood).toBeUndefined(); // only food for a home
  });
});

describe('townsfolk wait for what you said you would bring', () => {
  it('a favour needing something becomes an errand; they wait, then thank you — or give up after the days are gone', () => {
    const st = newGame();
    // Find someone asking today for something from the bag.
    let idx = 0;
    while (!folkOf('meadow', idx, 0).favour?.needs) idx++;
    const f = folkOf('meadow', idx, 0), need = f.favour!.needs!;
    talkToFolk(st, 'meadow', idx, { x: 5, z: 6 }); // they ask
    const r = talkToFolk(st, 'meadow', idx, { x: 5, z: 6 }); // you have none: they will wait
    expect(r.kind).toBe('need');
    expect(st.errands).toHaveLength(1);
    expect(st.errands[0]).toMatchObject({ x: 5, z: 6, item: need.item, qty: need.qty });
    // Even the next day, they are still waiting — bring it and they thank you.
    st.minutes += DAY_MINUTES;
    st.inventory[need.item] = need.qty;
    expect(talkToFolk(st, 'meadow', idx).kind).toBe('helped');
    expect(st.errands).toHaveLength(0);
    // Another who waits too long gives up.
    st.errands.push({ key: 'x', land: 'meadow', name: 'Ada', item: 'rice', qty: 1, coins: 5, done: '', x: 0, z: 0, until: st.minutes + 10 });
    st.minutes += ERRAND_DAYS * DAY_MINUTES;
    expect(expireErrands(st)).toEqual(['Ada']);
  });
});
