import { describe, expect, it } from 'vitest';
import { PEOPLE_IN_NEED, give, sponsorOf } from '../src/charity/charity';
import { DAY_MINUTES, newGame } from '../src/core/state';
import { level } from '../src/economy/economy';
import { LEVEL_XP } from '../src/economy/items';
import { JOBS, workShift } from '../src/economy/services';
import { certLevel, rankCap } from '../src/institutions/certificates';
import { EXPERTS, employ, hireOf, takeCourse } from '../src/institutions/institutions';
import { COURSE_CARE_DAYS, COURSE_WAGE_DAYS, courseCost, payWithCourse } from '../src/institutions/opportunities';

describe('certificates open doors', () => {
  it('a course earns a certificate; an employer ranks you no higher than Associate without one', () => {
    const st = newGame();
    st.coins = 1000;
    const job = JOBS.find((j) => j.land === 'switzerland' && j.skill === 'mechanics')!;
    st.skills.mechanics = LEVEL_XP[5];
    expect(rankCap(st, 'mechanics')).toBe(2);
    const r = workShift(st, job.id);
    expect(r).toMatchObject({ title: 'Associate Mechanic' });
    expect(takeCourse(st, 'switzerland-inst', 'you')).toBeNull();
    expect(certLevel(st, 'you', 'mechanics')).toBe(level(st, 'mechanics'));
    expect(rankCap(st, 'mechanics')).toBeGreaterThan(5);
    st.minutes += DAY_MINUTES;
    expect(workShift(st, job.id)).toMatchObject({ title: expect.stringMatching(/^(Principal|Master) Mechanic/) });
  });
});

describe('paying in opportunities', () => {
  it('a sponsored person can be paid with a course: care days and a certificate', () => {
    const st = newGame();
    st.coins = 500;
    const p = PEOPLE_IN_NEED.find((q) => q.land === 'switzerland') ?? PEOPLE_IN_NEED[0];
    expect(payWithCourse(st, p.id, 'switzerland-inst')).toContain('Sponsor');
    expect(give(st, p.id, { coins: 20 })).toBeNull();
    const before = sponsorOf(st, p.id)!.paidUntil, coins = st.coins;
    expect(payWithCourse(st, p.id, 'switzerland-inst')).toBeNull();
    expect(sponsorOf(st, p.id)!.paidUntil).toBeGreaterThanOrEqual(before + COURSE_CARE_DAYS * DAY_MINUTES);
    expect(st.coins).toBe(coins - courseCost(st, 'switzerland-inst')!);
    expect(Object.keys(st.certificates).some((k) => k.startsWith(`${p.id}:`))).toBe(true);
  });

  it('a hired expert can be paid in training', () => {
    const st = newGame();
    st.coins = 2000;
    const e = EXPERTS.find((x) => x.land === 'switzerland')!;
    expect(payWithCourse(st, e.id, 'switzerland-inst')).toContain('Employ');
    expect(employ(st, e.id, 1, 'coins')).toBeNull();
    const before = hireOf(st, e.id)!.paidUntil;
    expect(payWithCourse(st, e.id, 'switzerland-inst')).toBeNull();
    expect(hireOf(st, e.id)!.paidUntil).toBe(before + COURSE_WAGE_DAYS * DAY_MINUTES);
  });
});
