import { DAY_MINUTES, type GameState } from '../core/state';
import { SKILLS, type SkillId } from '../economy/items';
import { addLearnerXp, learnerLevel } from '../institutions/institutions';
import { PERSON_BY_ID, sponsorOf, type Sponsorship } from './charity';

/**
 * Sponsorship is more than keep (owner's brief): you take their contact and stay in touch, and
 * your sponsorship pays for them to learn a trade — the one they choose (their hope). Every day their care is paid they study it; living in your home they learn faster,
 * and if you have not been in touch for a week they lose heart and learn at half the pace. Visiting
 * them, writing back to them, or giving to them keeps you in touch. What they learn opens work for
 * them — in your businesses, your institutes, and as teachers. Pure rules (tests/upskill.test.ts).
 */
export const LEARN_PER_DAY = 10;
/** Out of touch after this many days without a visit, a letter or a gift. */
export const TOUCH_DAYS = 7;

/** The trade someone you sponsor is learning: their own choice, never yours. */
export const trainingOf = (s: Sponsorship): SkillId => PERSON_BY_ID[s.id]?.learn ?? 'cooking';

/** Days since you were last in touch (a visit, a letter, a gift). */
export const daysOutOfTouch = (st: GameState, s: Sponsorship): number => (st.minutes - (s.contactAt ?? s.since)) / DAY_MINUTES;
export const inTouch = (st: GameState, s: Sponsorship): boolean => daysOutOfTouch(st, s) < TOUCH_DAYS;

/** You were in touch with someone you sponsor (visited them, wrote back, gave). */
export function keepInTouch(st: GameState, id: string): void {
  const s = sponsorOf(st, id);
  if (s) s.contactAt = st.minutes;
}

/** A day's learning for someone: nothing unless their care is paid; faster at home; slower out of touch. */
export const dayLearning = (st: GameState, s: Sponsorship): number =>
  st.minutes >= s.paidUntil ? 0 : Math.round(LEARN_PER_DAY * (s.home ? 1.5 : 1) * (inTouch(st, s) ? 1 : 0.5));

/** Each new day: everyone in your care studies their trade. Returns news of those who reach a new level. */
export function tickLearning(st: GameState): Array<{ text: string }> {
  const out: Array<{ text: string }> = [], d = Math.floor(st.minutes / DAY_MINUTES);
  for (const s of st.sponsored) {
    const key = `learn:${s.id}`, last = st.work.shifts[key];
    if (last !== undefined && last >= d) continue;
    st.work.shifts[key] = d;
    if (last === undefined) continue; // their first day: learning starts tomorrow
    const skill = trainingOf(s), before = learnerLevel(st, s.id, skill), xp = dayLearning(st, s) * Math.min(7, d - last);
    if (xp <= 0) continue;
    addLearnerXp(st, s.id, skill, xp);
    const after = learnerLevel(st, s.id, skill);
    if (after > before) out.push({ text: `📚 ${PERSON_BY_ID[s.id]?.name ?? 'Someone you sponsor'} has learnt ${SKILLS[skill].name.toLowerCase()} to level ${after}, thanks to your sponsorship.` });
  }
  return out;
}
