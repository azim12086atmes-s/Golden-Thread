import { describe, expect, it } from 'vitest';
import { PEOPLE_IN_NEED, give, meet } from '../src/charity/charity';
import { newGame } from '../src/core/state';
import { EventBus } from '../src/core/events';
import { Messages } from '../src/social/Messages';
import { befriend, befriendMet, friendDef, lettersOf } from '../src/social/friends';

describe('people in need become your friends', () => {
  it('meeting someone in need makes them a friend who writes to you', () => {
    const st = newGame(), p = PEOPLE_IN_NEED[0];
    expect(meet(st, p.id)).toBe(true);
    expect(befriend(st, p.id)).toBe(true);
    expect(befriend(st, p.id)).toBe(false);
    const m = new Messages(st, new EventBus());
    expect(m.friends()).toContain(p.id);
    expect(friendDef(p.id)!.name).toBe(p.name);
    st.minutes += 20 * 60;
    m.tick();
    const letter = m.thread(p.id).find((x) => x.from === 'them');
    expect(letter).toBeTruthy();
    expect(letter!.request).toBeUndefined(); // they write; they do not ask favours
  });

  it('people you care for thank you in their letters; older journeys catch up', () => {
    const st = newGame(), p = PEOPLE_IN_NEED[1];
    const before = lettersOf(st, p.id).length;
    st.coins = 100; give(st, p.id, { coins: 30 });
    expect(lettersOf(st, p.id).length).toBeGreaterThan(before);
    const old = newGame(); old.met.push(PEOPLE_IN_NEED[2].id);
    befriendMet(old);
    expect(old.friends[PEOPLE_IN_NEED[2].id].befriended).toBe(true);
  });
});
