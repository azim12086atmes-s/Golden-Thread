import { describe, expect, it } from 'vitest';
import { newGame, DAY_MINUTES } from '../src/core/state';
import { EventBus } from '../src/core/events';
import { Housing } from '../src/housing/housing';
import { PLOTS } from '../src/world/plots';
import { LETTER_DAYS, familyName, giveToParents, lastLetter, moveOut, parentsHome, parentsIn, tickParents, visit } from '../src/housing/parents';
import { currentStep, later, setTour, TOUR, tourProgress } from '../src/guide/tour';
import { deserialize, serialize } from '../src/core/save';

const withHomes = (n: number) => {
  const st = newGame();
  st.coins = 100000;
  const h = new Housing(st, new EventBus());
  const ids = PLOTS.slice(0, n).map((p) => p.id);
  for (const id of ids) expect(h.buyHome(id)).toBe('ok');
  return { st, h, ids };
};

describe('a home for their parents', () => {
  it('gives a home they own to her parents and another to his; never the same one, never land without a house', () => {
    const { st, h, ids } = withHomes(2);
    const bare = PLOTS[5].id;
    expect(h.buy(bare)).toBe('ok');
    expect(giveToParents(st, bare, 'hers')).not.toBeNull();
    expect(giveToParents(st, ids[0], 'hers')).toBeNull();
    expect(parentsHome(st, 'hers')).toBe(ids[0]);
    expect(parentsIn(st, ids[0])).toBe('hers');
    expect(giveToParents(st, ids[0], 'his')).not.toBeNull();
    expect(giveToParents(st, ids[1], 'his')).toBeNull();
    expect(familyName(st, 'his')).toContain(st.names.boy);
    // Moving them to another home, and moving out.
    moveOut(st, 'his');
    expect(parentsHome(st, 'his')).toBeUndefined();
  });

  it('a visit brings them there and, once a day, something their mother cooked; they write every few days', () => {
    const { st, ids } = withHomes(1);
    expect('error' in visit(st, 'hers')).toBe(true);
    giveToParents(st, ids[0], 'hers');
    const first = visit(st, 'hers');
    expect('plotId' in first && first.plotId).toBe(ids[0]);
    expect('gift' in first && first.gift).toBeTruthy();
    const got = Object.values(st.inventory).reduce((a, b) => a + b, 0);
    const again = visit(st, 'hers');
    expect('gift' in again && again.gift).toBeNull();
    expect(Object.values(st.inventory).reduce((a, b) => a + b, 0)).toBe(got);
    // Letters: none on moving in, then one every LETTER_DAYS days.
    expect(tickParents(st)).toHaveLength(0);
    let letters = 0;
    for (let d = 1; d <= LETTER_DAYS * 3; d++) { st.minutes += DAY_MINUTES; letters += tickParents(st).length; }
    expect(letters).toBe(3);
    expect(lastLetter(st, 'hers')).toBeTruthy();
    expect(lastLetter(st, 'his')).toBeNull();
  });

  it('survives a save; old saves load with nobody moved in', () => {
    const { st, ids } = withHomes(1);
    giveToParents(st, ids[0], 'his');
    expect(parentsHome(deserialize(serialize(st))!, 'his')).toBe(ids[0]);
    const raw = JSON.parse(serialize(newGame()));
    delete raw.parents; delete raw.tour;
    const old = deserialize(JSON.stringify(raw))!;
    expect(old.parents).toEqual({});
    expect(old.tour).toEqual({ off: false, later: [] });
  });
});

describe('Grandmother Sarvatara\'s guided tour', () => {
  it('offers one letter at a time, ticks each off when it is really done, and can be set aside', () => {
    const st = newGame();
    expect(currentStep(st)!.id).toBe('dress');
    st.companionOutfits['sib-aasima'] = 'x';
    expect(currentStep(st)!.id).toBe('keeper');
    later(st, 'keeper');
    expect(currentStep(st)!.id).toBe('pet');
    // Business and parents wait until they make sense (a craft learnt; a home owned).
    expect(TOUR.find((s) => s.id === 'business')!.ready!(st)).toBe(false);
    expect(TOUR.find((s) => s.id === 'parents')!.ready!(st)).toBe(false);
    st.caravan.push('pet-shiba');
    st.animals.a = { species: 'deer', name: 'Dew', befriended: true, happiness: 50, lastFedAt: 0 };
    expect(currentStep(st)!.id).toBe('friend');
    setTour(st, false);
    expect(currentStep(st)).toBeNull();
    setTour(st, true);
    expect(currentStep(st)!.id).toBe('keeper');
    expect(tourProgress(st)).toEqual({ done: 3, of: TOUR.length });
  });

  it('every letter is written warmly and says how; every step has a unique id', () => {
    const ids = new Set<string>();
    for (const s of TOUR) {
      expect(ids.has(s.id)).toBe(false); ids.add(s.id);
      expect(s.letter.length).toBeGreaterThan(80);
      expect(s.how.length).toBeGreaterThan(30);
    }
  });
});
