import { PERSON_BY_ID, sponsorOf } from '../charity/charity';
import { DAY_MINUTES, type GameState } from '../core/state';
import { SKILLS } from '../economy/items';
import { INSTITUTE_BY_KIND } from './catalogue';
import { certify } from './certificates';
import { COURSE_FEE, EXPERT_BY_ID, SITE_BY_ID, addLearnerXp, hireOf, instituteAt, landScience, learnerLevel, standingStage } from './institutions';

/**
 * Paying in opportunities: instead of coins, give someone a place on a course at an institute —
 * a sponsored person learns the institute's craft (and earns its certificate), which counts as
 * days of their care; a hired expert takes further training, which counts as days of their wages.
 * A course at an institute you founded costs you nothing; at the town's own institute it costs
 * part of the fee. Pure rules (tests/opportunities.test.ts).
 */
export const COURSE_CARE_DAYS = 3, COURSE_WAGE_DAYS = 3;

/** What a course place costs you at a site: nothing at your own institute, part of the fee at the town's. */
export function courseCost(st: GameState, siteId: string): number | null {
  const site = SITE_BY_ID[siteId];
  if (!site) return null;
  const own = instituteAt(st, siteId);
  if (own && standingStage(st, own) >= 1) return 0;
  return site.established ? Math.round(COURSE_FEE * 0.6) : null;
}

/** The skill an institute site teaches (your own institute's kind, else the land's science). */
function taughtAt(st: GameState, siteId: string) {
  const site = SITE_BY_ID[siteId], own = instituteAt(st, siteId);
  return INSTITUTE_BY_KIND[own ? own.kind : landScience(site.land)];
}

/**
 * Pay someone with a course at `siteId`. For a sponsored person: they learn, earn a certificate at
 * their new level, and are cared for COURSE_CARE_DAYS days. For a hired expert: COURSE_WAGE_DAYS
 * days of wages. Returns an error, or null.
 */
export function payWithCourse(st: GameState, personId: string, siteId: string): string | null {
  const cost = courseCost(st, siteId);
  if (cost === null) return 'There is no institute there to teach a course.';
  if (st.coins < cost) return `A place on the course costs ${cost} coins.`;
  const def = taughtAt(st, siteId), site = SITE_BY_ID[siteId];
  const person = PERSON_BY_ID[personId], expert = EXPERT_BY_ID[personId];
  if (person) {
    const s = sponsorOf(st, personId);
    if (!s) return `Sponsor ${person.name} first — then a course can be part of their care.`;
    st.coins -= cost;
    addLearnerXp(st, personId, def.skill, 35);
    certify(st, personId, def.skill, learnerLevel(st, personId, def.skill), site.land);
    s.paidUntil = Math.max(s.paidUntil, st.minutes) + COURSE_CARE_DAYS * DAY_MINUTES;
    return null;
  }
  if (expert) {
    const h = hireOf(st, personId);
    if (!h) return `Employ ${expert.name} first — then training can be part of their pay.`;
    st.coins -= cost;
    h.paidUntil = Math.max(h.paidUntil, st.minutes) + COURSE_WAGE_DAYS * DAY_MINUTES;
    return null;
  }
  return 'No one by that name.';
}

/** A line for the UI: what paying this person with a course here would give them. */
export function courseOffer(st: GameState, personId: string, siteId: string): string {
  const def = taughtAt(st, siteId), cost = courseCost(st, siteId) ?? 0;
  const what = PERSON_BY_ID[personId] ? `${COURSE_CARE_DAYS} days of care and a ${SKILLS[def.skill].name} certificate` : `${COURSE_WAGE_DAYS} days' wages in training`;
  return `🎓 A ${def.name} course · ${what}${cost ? ` · ${cost}🪙` : ' · free at your institute'}`;
}
