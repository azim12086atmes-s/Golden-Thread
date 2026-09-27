import { describe, expect, it } from 'vitest';
import { PEOPLE_IN_NEED, buildFloor, give, sponsorOf, takeHome } from '../src/charity/charity';
import { DAY_MINUTES, newGame, type GameState } from '../src/core/state';
import { fieldGrowth } from '../src/economy/fields';
import { CAP, USES, bonus, placesFor, putToUse, tickInventions } from '../src/economy/inventions';
import { productPrice } from '../src/economy/manufacture';
import { TOPICS } from '../src/institutions/research';

const invent = (st: GameState, inv: string, n = 1) => { st.inventions.push(inv); st.products[inv] = n; };

describe('inventions have real effects', () => {
  it('every invention of every thesis has a use', () => {
    for (const t of TOPICS) expect(USES[t.invention], t.invention).toBeTruthy();
  });

  it('it must be invented and made before it is put to use; each use takes one made', () => {
    const st = newGame();
    expect(putToUse(st, 'Star compass', 'you')).toContain('invented');
    st.inventions.push('Star compass');
    expect(putToUse(st, 'Star compass', 'you')).toContain('Make');
    st.products['Star compass'] = 2;
    expect(putToUse(st, 'Star compass', 'you')).toBeNull();
    expect(st.products['Star compass']).toBe(1);
    expect(putToUse(st, 'Star compass', 'you')).toContain('already');
    expect(bonus(st, 'travel')).toBeCloseTo(0.15);
  });

  it('a pump built in a field makes the crop grow faster', () => {
    const st = newGame();
    st.fields['meadow-f1'] = { store: {}, at: 0, crop: { seed: 'seed_herb', plantedAt: 0 } };
    st.minutes = 60;
    const before = fieldGrowth(st, 'meadow-f1');
    invent(st, 'Efficient pump');
    expect(putToUse(st, 'Efficient pump', 'you')).toContain('field');
    expect(placesFor(st, 'Efficient pump', 'meadow')).toEqual(['meadow-f1']);
    expect(putToUse(st, 'Efficient pump', 'meadow-f1')).toBeNull();
    expect(fieldGrowth(st, 'meadow-f1')).toBeGreaterThan(before);
  });

  it('things built at a home: residents thrive more, and solar skins earn every day', () => {
    const st = newGame();
    st.plots['meadow-a'] = { decor: [{ id: 'h', kind: 'house-meadow', x: 0, z: -5, rot: 0 }] };
    const p = PEOPLE_IN_NEED.find((q) => q.land === 'meadow')!;
    st.coins = 500;
    give(st, p.id, { coins: 120 });
    takeHome(st, p.id, 'meadow-a');
    invent(st, 'Everlight'); invent(st, 'Solar skin panel');
    expect(putToUse(st, 'Everlight', 'meadow-a')).toBeNull();
    expect(putToUse(st, 'Solar skin panel', 'meadow-a')).toBeNull();
    expect(bonus(st, 'comfort', 'meadow-a')).toBe(5);
    expect(bonus(st, 'comfort', 'meadow-b')).toBe(0);
    const coins = st.coins;
    st.minutes += DAY_MINUTES;
    expect(tickInventions(st).length).toBe(1);
    expect(st.coins).toBe(coins + USES['Solar skin panel'].amount);
    expect(tickInventions(st).length).toBe(0); // once a day
    expect(sponsorOf(st, p.id)).toBeTruthy();
  });

  it('carried goods reach their systems: products sell for more, floors go up faster, and goods stack only so far', () => {
    const st = newGame();
    const inv = TOPICS[0].invention;
    const before = productPrice(st, inv, 'meadow');
    invent(st, 'Jade glaze recipe');
    putToUse(st, 'Jade glaze recipe', 'you');
    expect(productPrice(st, inv, 'meadow')).toBeGreaterThan(before);

    st.plots['meadow-a'] = { decor: [{ id: 'h', kind: 'house-meadow', x: 0, z: -5, rot: 0 }] };
    st.coins = 500; st.inventory.wood = 20;
    invent(st, 'Iron truss design');
    putToUse(st, 'Iron truss design', 'you');
    buildFloor(st, 'meadow-a', 'coins');
    expect(st.homeFloors['meadow-a'].buildingUntil! - st.minutes).toBeLessThan(DAY_MINUTES);

    for (const inv2 of ['Star compass', 'Clinker hull design', 'Traveller’s astrolabe', 'Cloud-thread bridge']) { invent(st, inv2); putToUse(st, inv2, 'you'); }
    expect(bonus(st, 'travel')).toBe(CAP.travel);
  });
});
