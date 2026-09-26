import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { HEAD_GAP } from '../src/characters/anatomy';
import { isModest } from '../src/characters/modesty';
import { deserialize, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';
import { ITEMS } from '../src/economy/items';
import { CROWD_GEOS } from '../src/npc/Crowd';
import { CITY_PEOPLE, FAVOURS, LAND_FAVOURS, folkOf, talkToFolk } from '../src/npc/folk';
import { FULL_FIGURES, HERO_ONLY, PER_TOWN, Townsfolk, townPeople } from '../src/npc/Townsfolk';
import { REGIONS, REGION_BY_ID, regionCenter } from '../src/world/regions';
import type { RegionInstance } from '../src/world/RegionBuilder';

const yRange = (g: THREE.BufferGeometry) => { g.computeBoundingBox(); return [g.boundingBox!.min.y, g.boundingBox!.max.y]; };

describe('a city of 300', () => {
  it('every town has 300 people, each dressed modestly in their own land’s clothes', () => {
    expect(CITY_PEOPLE).toBe(300);
    expect(PER_TOWN).toBe(300);
    for (const r of REGIONS) {
      const people = townPeople(r.id, [{ x: 70, z: 20 }]);
      expect(people.length, r.id).toBe(300);
      expect(new Set(people.map((p) => p.idx)).size).toBe(300);
      for (const p of people) {
        expect(isModest(p.outfit)).toBe(true);
        expect(HERO_ONLY.has(p.outfit.id)).toBe(false);
        expect(p.outfit.who).toBe(p.who);
      }
    }
  });

  it('walkers keep to the roads and the plaza, never through houses', () => {
    for (const p of townPeople('london', [])) {
      const w = p.path;
      if (w.kind === 'avenue') expect(Math.abs(w.lane)).toBeLessThanOrEqual(6); // avenues are 14.4 m wide
      if (w.kind === 'ring') expect(Math.abs(w.lane)).toBeLessThanOrEqual(4.5); // the ring road is 13 m wide
      if (w.kind === 'plaza') expect(w.r).toBeLessThan(50); // the plaza is 50 m round
    }
  });

  it('crowd figures keep the rules: a floating head clear of the collar, covered to wrist and ankle', () => {
    const [headLo] = yRange(CROWD_GEOS.skin.clone().translate(0, 0, 0)) as [number, number];
    // The head is the part of the skin mesh above the shoulders.
    const pos = CROWD_GEOS.skin.getAttribute('position');
    let headBottom = Infinity;
    for (let i = 0; i < pos.count; i++) if (pos.getY(i) > 1.2) headBottom = Math.min(headBottom, pos.getY(i));
    const bodyTop = Math.max(yRange(CROWD_GEOS.upper)[1], yRange(CROWD_GEOS.trim)[1], yRange(CROWD_GEOS.lower)[1]);
    expect(headBottom - bodyTop).toBeGreaterThanOrEqual(HEAD_GAP - 0.03);
    // Hair or headwear sits on the head only — never down onto the shoulders.
    expect(yRange(CROWD_GEOS.crown)[0]).toBeGreaterThan(bodyTop + 0.1);
    // The robe reaches the shoes; the hands are the only skin below the head.
    expect(yRange(CROWD_GEOS.lower)[0]).toBeLessThanOrEqual(0.01);
    expect(headLo).toBeGreaterThan(0.6);
  });

  it('everyone in a loaded town can be talked to, and only the nearest few are full figures', () => {
    const scene = new THREE.Scene();
    const tf = new Townsfolk(scene);
    const spec = REGION_BY_ID.japan;
    tf.onRegionLoaded({ spec, spots: [{ x: 70, z: 20 }] } as unknown as RegionInstance);
    expect(tf.count('japan')).toBe(300);
    const c = regionCenter(spec);
    const player = new THREE.Vector3(c.x, 0, c.z + 140);
    tf.update(1 / 60, 1, player);
    expect(tf.fullFigures).toBeGreaterThan(0);
    expect(tf.fullFigures).toBeLessThanOrEqual(FULL_FIGURES);
    // Stand next to people well beyond the first 60 — they answer too.
    const far = tf.list.filter((w) => w.land === 'japan' && w.idx > 200 && w.path.kind === 'avenue')[0];
    const who = tf.nearest(new THREE.Vector3(far.x + 0.5, far.y, far.z), 2.6);
    expect(who).not.toBeNull();
    expect(who!.idx).toBeGreaterThan(60);
    tf.onRegionUnloaded({ spec } as unknown as RegionInstance);
    expect(tf.count('japan')).toBe(0);
    expect(tf.list.length).toBe(0);
  });
});

describe('favours in town', () => {
  it('every land has its own favours, and what they ask for is a real item', () => {
    for (const r of REGIONS) {
      expect(LAND_FAVOURS[r.id].length, r.id).toBeGreaterThanOrEqual(2);
      for (const f of LAND_FAVOURS[r.id]) if (f.needs) expect(ITEMS[f.needs.item], `${r.id} ${f.needs.item}`).toBeDefined();
    }
    for (const f of FAVOURS) if (f.needs) expect(ITEMS[f.needs.item]).toBeDefined();
  });

  it('ask first, help second; a favour that needs something uses it; one reward a day, even after a reload', () => {
    const st = newGame();
    const day = Math.floor(st.minutes / 1440);
    // Find someone who needs an item today, and someone who needs only a hand.
    let needy = -1, hand = -1;
    for (let i = 0; i < 300 && (needy < 0 || hand < 0); i++) {
      const f = folkOf('japan', i, day).favour;
      if (f?.needs && needy < 0) needy = i;
      if (f && !f.needs && hand < 0) hand = i;
    }
    expect(needy).toBeGreaterThanOrEqual(0);
    expect(hand).toBeGreaterThanOrEqual(0);

    expect(talkToFolk(st, 'japan', hand).kind).toBe('ask');
    const coins = st.coins;
    const r = talkToFolk(st, 'japan', hand);
    expect(r.kind).toBe('helped');
    expect(st.coins).toBeGreaterThan(coins);

    const f = folkOf('japan', needy, day).favour!;
    talkToFolk(st, 'japan', needy);
    st.inventory = {};
    expect(talkToFolk(st, 'japan', needy).kind).toBe('need');
    st.inventory[f.needs!.item] = f.needs!.qty;
    expect(talkToFolk(st, 'japan', needy).kind).toBe('helped');
    expect(st.inventory[f.needs!.item] ?? 0).toBe(0);

    // Reload: the day's help is remembered, so no second reward.
    const back = deserialize(serialize(st))!;
    const before = back.coins;
    expect(talkToFolk(back, 'japan', hand).kind).toBe('line');
    expect(back.coins).toBe(before);
    // A new day, new needs.
    back.minutes += 1440;
    talkToFolk(back, 'japan', hand);
    expect(back.folk.day).toBe(day + 1);
    expect(back.folk.helped).not.toContain(`japan:${hand}`);
  });

  it('old saves without the day’s record load with an empty one', () => {
    const old = JSON.parse(serialize(newGame()));
    delete old.folk;
    expect(deserialize(JSON.stringify(old))!.folk).toEqual({ day: 0, asked: [], helped: [] });
  });
});
