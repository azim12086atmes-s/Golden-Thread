import { describe, expect, it } from 'vitest';
import { COMPANION_BY_ID, STARTING_CARAVAN, caravanStep, TRAVELLER_CLEARANCE } from '../src/caravan/caravan';
import { EventBus } from '../src/core/events';
import { deserialize } from '../src/core/save';
import { newGame } from '../src/core/state';
import { HOME_PRICE, Housing, PLOTS } from '../src/housing/housing';
import { prologue } from '../src/story/prologue';
import { REGIONS, regionAt } from '../src/world/regions';
import { CASTLE_SITE, WATER_Y, terrainHeight } from '../src/world/terrain';
import { WONDERS, foundWonder, wonderHint, wonderPos } from '../src/world/wonders';

describe('the story before the journey', () => {
  it('tells the world, the promise, the main objective, the way to live and what to explore', () => {
    const st = newGame();
    const pages = prologue(st);
    const text = pages.map((p) => `${p.title} ${p.lines.join(' ')}`).join(' ');
    expect(pages.length).toBeGreaterThanOrEqual(6);
    expect(text).toContain(st.names.girl);
    expect(pages.some((p) => p.eyebrow === 'The main objective')).toBe(true);
    for (const word of ['kind', 'Share', 'promises', 'grateful', 'hidden wonders', 'home']) expect(text).toContain(word);
  });
});

describe('the caravan from the first morning', () => {
  it('two children and two pets travel with you from the start, and old saves gain them too', () => {
    const st = newGame();
    expect([...st.caravan].sort()).toEqual([...STARTING_CARAVAN].sort());
    const defs = st.caravan.map((id) => COMPANION_BY_ID[id]);
    expect(defs.filter((d) => d.kind === 'child').length).toBe(2);
    expect(defs.filter((d) => d.kind === 'pet').length).toBe(2);
    const old = newGame() as unknown as Record<string, unknown>;
    delete old.caravan;
    expect([...deserialize(JSON.stringify(old))!.caravan].sort()).toEqual([...STARTING_CARAVAN].sort());
  });

  it('they keep clear of both travellers while walking', () => {
    let members = STARTING_CARAVAN.map((id, i) => ({ id, kind: COMPANION_BY_ID[id].kind, x: i * 0.3, z: -1, speed: 0 }));
    for (let f = 0; f < 120; f++) {
      const girl = { x: 0, z: f * 0.05 }, boy = { x: 1.95, z: f * 0.05 };
      members = caravanStep(members, girl, boy, 0, 3, 1 / 60);
      for (const m of members) {
        expect(Math.hypot(m.x - girl.x, m.z - girl.z)).toBeGreaterThanOrEqual(TRAVELLER_CLEARANCE - 1e-6);
        expect(Math.hypot(m.x - boy.x, m.z - boy.z)).toBeGreaterThanOrEqual(TRAVELLER_CLEARANCE - 1e-6);
      }
    }
  });
});

describe('hidden wonders', () => {
  it('one in every land below the clouds, on dry ground, in its own land, clear of the castle', () => {
    expect(WONDERS.length).toBe(REGIONS.length - 1);
    expect(new Set(WONDERS.map((w) => w.land)).size).toBe(WONDERS.length);
    for (const w of WONDERS) {
      const p = wonderPos(w);
      expect(terrainHeight(p.x, p.z), w.id).toBeGreaterThan(WATER_Y + 0.5);
      expect(regionAt(p.x, p.z).id, w.id).toBe(w.land);
      expect(Math.hypot(p.x - CASTLE_SITE.x, p.z - CASTLE_SITE.z)).toBeGreaterThan(CASTLE_SITE.r);
      expect(wonderHint(w)).toMatch(/Look (north|south|east|west)/);
    }
    const st = newGame();
    expect(foundWonder(st, WONDERS[0].id)).toBe(false);
  });
});

describe('homes and land', () => {
  it('a ready-made home costs the land plus a house, and stands on the land once bought', () => {
    const st = newGame();
    const hs = new Housing(st, new EventBus());
    const plot = PLOTS[0];
    expect(hs.homePrice(plot.id)).toBe(plot.price + HOME_PRICE);
    st.coins = hs.homePrice(plot.id) - 1;
    expect(hs.buyHome(plot.id)).toBe('coins');
    st.coins += 1;
    expect(hs.buyHome(plot.id)).toBe('ok');
    expect(st.coins).toBe(0);
    expect(st.plots[plot.id].decor.map((d) => d.kind)).toEqual([`house-${plot.region}`]);
    expect(hs.buyHome(plot.id)).toBe('owned');
  });
});
