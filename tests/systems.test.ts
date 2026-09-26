import { describe, expect, it } from 'vitest';
import { SPECIES } from '../src/animals/AnimalModel';
import { EventBus } from '../src/core/events';
import { deserialize, loadGame, saveGame, serialize, type Store } from '../src/core/save';
import { newGame } from '../src/core/state';
import { addItem, craft, count, sellPrice, teach } from '../src/economy/economy';
import { ITEMS, RECIPES, skillLevel } from '../src/economy/items';
import { DECOR_BY_ID, Housing, PLOTS, PLOT_SIZE } from '../src/housing/housing';
import { PEOPLE_BY_ID } from '../src/npc/people';
import { QUESTS } from '../src/quests/quests';
import { QuestSystem } from '../src/quests/QuestSystem';
import { Messages } from '../src/social/Messages';
import { REGION_BY_ID } from '../src/world/regions';

describe('economy', () => {
  it('crafting consumes materials, produces goods, and grants xp', () => {
    const st = newGame();
    st.inventory = { wool: 2 };
    const r = craft(st, 'scarf');
    expect(r.ok).toBe(true);
    expect(count(st, 'scarf')).toBe(1);
    expect(count(st, 'wool')).toBe(0);
    expect(st.skills.weaving).toBeGreaterThan(0);
  });

  it('crafting is gated by skill level', () => {
    const st = newGame();
    st.inventory = { silk: 3, spool: 1 };
    expect(craft(st, 'shawl')).toEqual({ ok: false, reason: 'skill' });
  });

  it('goods sell for more far from where they come from', () => {
    expect(sellPrice('tea', 'london')).toBeGreaterThan(sellPrice('tea', 'japan'));
    expect(sellPrice('minttea', 'aurora', ['minttea'])).toBe(2 * sellPrice('minttea', 'aurora'));
  });

  it('every recipe uses real items', () => {
    for (const r of RECIPES) {
      expect(ITEMS[r.out], r.id).toBeTruthy();
      for (const k of Object.keys(r.needs)) expect(ITEMS[k], `${r.id} needs ${k}`).toBeTruthy();
    }
  });
});

/** Can `item` be made with only `mats`, at `maxLevel` in `skill` (and level 0 elsewhere)? */
function makeable(item: string, mats: Set<string>, skill: string, maxLevel: number, depth = 0): boolean {
  if (mats.has(item)) return true;
  if (depth > 4) return false;
  return RECIPES.some((r) => r.out === item
    && r.level <= (r.skill === skill ? maxLevel : 0)
    && Object.keys(r.needs).every((k) => makeable(k, mats, skill, maxLevel, depth + 1)));
}

describe('quests', () => {
  it('every quest references real people, items, lands and animals', () => {
    for (const q of QUESTS) {
      expect(PEOPLE_BY_ID[q.giver], `${q.id} giver`).toBeTruthy();
      expect(REGION_BY_ID[q.region], q.id).toBeTruthy();
      for (const s of q.steps) {
        if ('npc' in s) expect(PEOPLE_BY_ID[s.npc], `${q.id} → ${s.npc}`).toBeTruthy();
        if ('item' in s) expect(ITEMS[s.item], `${q.id} → ${s.item}`).toBeTruthy();
        if ('species' in s) expect(SPECIES[s.species], `${q.id} → ${s.species}`).toBeTruthy();
      }
    }
  });

  it('every land\'s chapter can be finished from that land\'s own materials and the skill its Keeper teaches', () => {
    for (const q of QUESTS.filter((x) => x.main && x.region !== 'skyisles')) {
      const r = REGION_BY_ID[q.region];
      const deliver = q.steps.find((s) => s.kind === 'deliver')!;
      expect('item' in deliver && makeable(deliver.item, new Set([...r.materials]), r.skill, 1), `${q.id}: ${'item' in deliver ? deliver.item : ''}`).toBe(true);
    }
  });

  it('every befriend step names an animal that lives in that land, with food found there', () => {
    for (const q of QUESTS) for (const s of q.steps) if (s.kind === 'befriend') {
      const r = REGION_BY_ID[q.region];
      expect(r.fauna, q.id).toContain(s.species);
      expect(r.materials, `${q.id}: diet ${SPECIES[s.species].diet}`).toContain(SPECIES[s.species].diet);
    }
  });

  it('plays the meadow chapter end to end', () => {
    const st = newGame();
    const bus = new EventBus();
    const qs = new QuestSystem(st, bus);
    expect(qs.offeredBy('noor').map((q) => q.id)).toContain('main-meadow');
    expect(qs.start('main-meadow')).toBe(true);
    expect(qs.step('main-meadow')?.kind).toBe('deliver'); // talking to Noor to start it counted as meeting her
    teach(st, 'weaving');
    addItem(st, 'wool', 2);
    expect(craft(st, 'scarf').ok).toBe(true);
    expect(qs.deliverable('noor').map((q) => q.id)).toEqual(['main-meadow']);
    const coins = st.coins;
    expect(qs.deliver('main-meadow')).toBe(true);
    expect(qs.lanternReady('meadow')?.id).toBe('main-meadow');
    expect(qs.lightLantern('meadow')).toBe(true);
    expect(qs.status('main-meadow')).toBe('done');
    expect(st.lanterns).toContain('meadow');
    expect(st.coins).toBe(coins + 40);
    expect(st.light).toBe(2);
    expect(st.friends.noor.befriended).toBe(true);
  });

  it('the finale waits for eight lanterns', () => {
    const st = newGame();
    const qs = new QuestSystem(st, new EventBus());
    expect(qs.offeredBy('lamplighter')).toEqual([]);
    st.lanterns = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    expect(qs.offeredBy('lamplighter').map((q) => q.id)).toEqual(['main-skyisles']);
  });

  it('a truck is earned, not bought, by helping Marcus', () => {
    const st = newGame();
    const qs = new QuestSystem(st, new EventBus());
    qs.start('side-marcus');
    addItem(st, 'gearkit', 1);
    qs.deliver('side-marcus');
    expect(st.vehicles).toContain('truck');
  });
});

describe('homes, farms and animals', () => {
  const setup = () => {
    const st = newGame();
    st.coins = 1000;
    return { st, h: new Housing(st, new EventBus()) };
  };

  it('plots are bought once and cost coins', () => {
    const { st, h } = setup();
    expect(h.buy('meadow-a')).toBe('ok');
    expect(h.buy('meadow-a')).toBe('owned');
    expect(st.coins).toBe(1000 - PLOTS.find((p) => p.id === 'meadow-a')!.price);
  });

  it('decor stays in bounds and never overlaps', () => {
    const { h } = setup();
    h.buy('meadow-a');
    expect(h.place('meadow-a', 'bench', 0, 0, 0)).toBeTruthy();
    expect(h.canPlace('meadow-a', 'bench', 0.5, 0)).toBe('overlap');
    expect(h.canPlace('meadow-a', 'bench', PLOT_SIZE / 2, 0)).toBe('bounds');
    expect(h.canPlace('meadow-a', 'house-japan', 8, 8)).toBe('locked');
  });

  it('lighting a land\'s lantern unlocks its house style', () => {
    const { st, h } = setup();
    h.buy('meadow-a');
    st.lanterns.push('japan');
    expect(h.canPlace('meadow-a', 'house-japan', 7, 7)).toBe('ok');
  });

  it('removing decor refunds half', () => {
    const { st, h } = setup();
    h.buy('meadow-a');
    const before = st.coins;
    const d = h.place('meadow-a', 'cottage', 5, 5, 0)!;
    h.remove('meadow-a', d.id);
    expect(st.coins).toBe(before - DECOR_BY_ID.cottage.price + Math.floor(DECOR_BY_ID.cottage.price / 2));
  });

  it('crops grow over a day and are harvested once', () => {
    const { st, h } = setup();
    h.buy('meadow-a');
    const bed = h.place('meadow-a', 'farmbed', 0, 0, 0)!;
    addItem(st, 'seed_rice', 1);
    expect(h.plant('meadow-a', bed.id, 'seed_rice')).toBe(true);
    expect(h.harvest('meadow-a', bed.id)).toBeNull();
    st.minutes += 1440;
    expect(h.harvest('meadow-a', bed.id)).toBe('rice');
    expect(h.harvest('meadow-a', bed.id)).toBeNull();
  });

  it('befriended animals come home, and happy ones share once a day', () => {
    const { st, h } = setup();
    h.buy('meadow-a');
    addItem(st, 'wildflower', 3);
    expect(h.befriendAnimal('sheep-1', 'sheep', 'Cloud')).toBe('ok');
    expect(h.adopt('sheep-1', 'meadow-a')).toBe(true);
    expect(h.collect('sheep-1')).toBe('wool');
    expect(h.collect('sheep-1')).toBeNull();
    st.minutes += 1440 * 3; // neglected for three days
    expect(h.collect('sheep-1')).toBeNull();
    h.feed('sheep-1');
    expect(h.happiness('sheep-1')).toBeGreaterThanOrEqual(30);
  });
});

describe('friends write in', () => {
  it('a friend eventually sends a message; requests can be fulfilled for coins', () => {
    const st = newGame();
    const bus = new EventBus();
    const got: string[] = [];
    bus.on('message:received', (m) => got.push(m.text));
    st.friends.haruka = { hearts: 2, befriended: true, lastMessageAt: st.minutes };
    const msgs = new Messages(st, bus);
    for (let i = 0; i < 200; i++) {
      st.minutes += 60;
      msgs.tick();
    }
    expect(got.length).toBeGreaterThan(5);
    const req = st.messages.find((m) => m.request);
    if (req?.request) {
      addItem(st, req.request.item, req.request.qty);
      const c = st.coins;
      expect(msgs.fulfil(req.id)).toBe(true);
      expect(st.coins).toBe(c + req.request.reward);
    }
  });

  it('gifts grow friendship', () => {
    const st = newGame();
    const msgs = new Messages(st, new EventBus());
    addItem(st, 'curry', 1);
    expect(msgs.gift('haruka', 'curry')).toBe(true);
    expect(st.friends.haruka.hearts).toBe(2); // curry is wanted in Sakura Hollow
  });
});

describe('saving', () => {
  const mem = (): Store => {
    const m = new Map<string, string>();
    return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v), removeItem: (k) => void m.delete(k) };
  };

  it('round-trips', () => {
    const st = newGame();
    st.coins = 777;
    st.inventory.silk = 4;
    const store = mem();
    expect(saveGame(st, store)).toBe(true);
    expect(loadGame(store)).toEqual(st);
  });

  it('fills fields added by a newer build and survives corruption', () => {
    const st = newGame() as unknown as Record<string, unknown>;
    delete st.flags;
    const back = deserialize(JSON.stringify(st))!;
    expect(back.flags).toEqual([]);
    expect(deserialize('{nope')).toBeNull();
    expect(deserialize(serialize({ ...newGame(), version: 2 as 1 }))).toBeNull();
  });

  it('skill levels follow the xp table', () => {
    expect(skillLevel(0)).toBe(0);
    expect(skillLevel(20)).toBe(1);
    expect(skillLevel(139)).toBe(2);
  });
});

describe('farming: buy, plant, water, grow, harvest, cook, sell', () => {
  it('a full season, saved and reloaded half-way', async () => {
    const { Housing, CROPS, SEED_SHOP, buySeed, seedPrice, WATER_BOOST } = await import('../src/housing/housing');
    const { EventBus } = await import('../src/core/events');
    const { craft, sell, sellPrice } = await import('../src/economy/economy');
    const { serialize, deserialize } = await import('../src/core/save');
    const { ITEMS, RECIPES } = await import('../src/economy/items');
    let st = newGame();
    st.coins = 1000;
    const h = new Housing(st, new EventBus());
    expect(h.buy('meadow-a')).toBe('ok');
    const bed = h.place('meadow-a', 'farmbed', 0, 0, 0)!;
    // Buy seeds at a market stall: this land's own.
    expect(SEED_SHOP.meadow).toContain('seed_pumpkin');
    expect(buySeed(st, 'meadow', 'seed_tea')).toBe('unknown'); // not grown here
    const coins = st.coins;
    expect(buySeed(st, 'meadow', 'seed_wheat')).toBe('ok');
    expect(st.coins).toBe(coins - seedPrice('seed_wheat'));
    expect(h.plant('meadow-a', bed.id, 'seed_wheat')).toBe(true);
    expect(st.inventory.seed_wheat ?? 0).toBe(0);
    // Water once: closer to harvest, and only once.
    const before = h.growth(bed);
    expect(h.water('meadow-a', bed.id)).toBe(true);
    expect(h.growth(bed) - before).toBeCloseTo(WATER_BOOST, 5);
    expect(h.water('meadow-a', bed.id)).toBe(false);
    // Save and reload mid-season: the crop is still there.
    st = deserialize(serialize(st))!;
    const h2 = new Housing(st, new EventBus());
    const bed2 = st.plots['meadow-a'].decor.find((d) => d.id === bed.id)!;
    expect(bed2.crop?.seed).toBe('seed_wheat');
    expect(h2.harvest('meadow-a', bed.id)).toBeNull(); // not ripe
    st.minutes += CROPS.seed_wheat.grow;
    expect(h2.harvest('meadow-a', bed.id)).toBe('wheat');
    expect(st.inventory.wheat).toBe(CROPS.seed_wheat.qty);
    // Cook it, then sell the dish for more than the grain.
    const r = craft(st, 'roti');
    expect(r.ok).toBe(true);
    expect(sellPrice('roti', 'london', [])).toBeGreaterThan(sellPrice('wheat', 'london', []) * 2);
    expect(sell(st, 'roti', 'london', [])).toBeGreaterThan(0);
    // Every crop's harvest is a real item, and every farm crop goes into at least one recipe or favour.
    for (const [seed, c] of Object.entries(CROPS)) {
      expect(ITEMS[seed], seed).toBeDefined();
      expect(ITEMS[c.out], c.out).toBeDefined();
    }
    for (const out of ['wheat', 'tomato', 'carrot', 'pumpkin', 'strawberry', 'chilli', 'sunflower']) expect(RECIPES.some((rc) => out in rc.needs), out).toBe(true);
    for (const land of Object.keys(SEED_SHOP)) for (const sd of SEED_SHOP[land as keyof typeof SEED_SHOP]) expect(CROPS[sd], `${land} ${sd}`).toBeDefined();
  });
});
