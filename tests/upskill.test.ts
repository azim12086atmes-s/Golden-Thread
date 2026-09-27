import { describe, expect, it } from 'vitest';
import { PEOPLE_IN_NEED, give, sponsorOf, takeHome } from '../src/charity/charity';
import { LEARN_PER_DAY, TOUCH_DAYS, dayLearning, inTouch, keepInTouch, tickLearning, trainingOf } from '../src/charity/upskill';
import { DAY_MINUTES, newGame } from '../src/core/state';
import { learnerLevel } from '../src/institutions/institutions';

describe('sponsorship upskills the people you care for, and you stay in touch', () => {
  it('each day their care is paid they learn the trade they hope for, and reach new levels', () => {
    const st = newGame(), p = PEOPLE_IN_NEED[0];
    st.coins = 1000;
    give(st, p.id, { coins: 6 * 30 });
    const s = sponsorOf(st, p.id)!;
    expect(trainingOf(s)).toBe(p.learn);
    tickLearning(st); // their first day
    const news = [];
    for (let d = 0; d < 4; d++) { st.minutes += DAY_MINUTES; keepInTouch(st, p.id); news.push(...tickLearning(st)); }
    expect(learnerLevel(st, p.id, p.learn)).toBeGreaterThanOrEqual(1);
    expect(news.some((n) => n.text.includes('level 1'))).toBe(true);
    expect(tickLearning(st)).toEqual([]); // once a day
  });

  it('they learn faster in your home, at half pace out of touch, and not at all without care', () => {
    const st = newGame(), p = PEOPLE_IN_NEED[4];
    st.coins = 1000;
    give(st, p.id, { coins: 60 });
    const s = sponsorOf(st, p.id)!;
    expect(dayLearning(st, s)).toBe(LEARN_PER_DAY);
    st.plots['meadow-a'] = { decor: [{ id: 'h', kind: 'house-meadow', x: 0, z: -5, rot: 0 }] };
    takeHome(st, p.id, 'meadow-a');
    expect(dayLearning(st, s)).toBe(LEARN_PER_DAY * 1.5);
    st.minutes += (TOUCH_DAYS + 0.5) * DAY_MINUTES;
    s.paidUntil = st.minutes + DAY_MINUTES;
    expect(inTouch(st, s)).toBe(false);
    expect(dayLearning(st, s)).toBe(Math.round(LEARN_PER_DAY * 1.5 * 0.5));
    keepInTouch(st, p.id);
    expect(inTouch(st, s)).toBe(true);
    s.paidUntil = st.minutes;
    expect(dayLearning(st, s)).toBe(0);
    expect(trainingOf(s)).toBe(p.learn); // their choice, always
  });
});
