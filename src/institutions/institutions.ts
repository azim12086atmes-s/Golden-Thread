import { DAY_MINUTES, type GameState } from '../core/state';
import { addItem, count, level, removeItems } from '../economy/economy';
import { ITEMS, LEVEL_XP, SKILLS, skillLevel, type SkillId } from '../economy/items';
import { PERSON_BY_ID, homeCapacity, occupantsOf, ownsHome, sponsorOf } from '../charity/charity';
import { folkOf } from '../npc/folk';
import { REGIONS, REGION_BY_ID, type RegionId } from '../world/regions';
import { INSTITUTE_BY_KIND, INSTITUTES, institutesOf, type InstituteKind, type Stage } from './catalogue';

/**
 * Institutes you found, grow and staff (owner's brief — NEXT_WORK C2, C4, C7). Every land has one
 * institute of its own science already running in town, where the travellers (and the people
 * they sponsor) can take a course, intern or teach; and three open sites where the travellers can
 * found their own institute and grow it stage by stage — a watch boutique becomes an atelier, a
 * manufacture, then a school of watchmaking.
 *
 * Building a stage costs coins or goods (paid in kind: wood, the land's material and food for the
 * builders), takes days, and needs someone with the skill to run it: the travellers themselves,
 * someone they sponsor and have taught, or a local expert they pay — employed by the day, or as a
 * freelancer for one build. A running institute that is staffed earns its keep, and kitchens and
 * clinics care for the people the travellers sponsor in that land. Skills grow only by doing:
 * courses, interning, teaching and running institutes all add to them.
 *
 * Pure rules over GameState, unit-tested (tests/institutions.test.ts).
 */

export { INSTITUTE_SITES, SITE_BY_ID, SITE_SIZE, type Site } from './sites';
import { INSTITUTE_SITES, SITE_BY_ID, SITE_SIZE, type Site } from './sites';

/** The science a land's established institute teaches. */
export function landScience(land: RegionId): InstituteKind {
  return (INSTITUTES.find((d) => d.land === land) ?? INSTITUTES[0]).kind;
}

/** The site within `pad` metres of (x, z), if any. */
export function siteAt(x: number, z: number, pad = 0): Site | null {
  return INSTITUTE_SITES.find((s) => Math.abs(x - s.x) < SITE_SIZE / 2 + pad && Math.abs(z - s.z) < SITE_SIZE / 2 + pad) ?? null;
}

// ───────────────────────── people with skills ─────────────────────────

export interface Expert { id: string; land: RegionId; name: string; skill: SkillId; level: number }

/** Skilled people in every land who can be hired: one for each skill its institutes need. */
export const EXPERTS: Expert[] = REGIONS.flatMap((r, ri) => {
  const skills = [...new Set(institutesOf(r.id).map((d) => d.skill))];
  return skills.map((skill, k) => ({ id: `expert-${r.id}-${skill}`, land: r.id, name: folkOf(r.id, 500 + ri * 7 + k * 11, 0).name, skill, level: 3 + ((ri + k) % 3) }));
});
export const EXPERT_BY_ID: Record<string, Expert> = Object.fromEntries(EXPERTS.map((e) => [e.id, e]));

/** An employee's daily wage, and a freelancer's fee for one build. */
export const wage = (e: Expert): number => 8 + e.level * 3;
export const freelanceFee = (e: Expert, stage: number): number => 20 * e.level + stage * 25;

export type Staff = { who: 'you' } | { who: 'learner'; id: string } | { who: 'hire'; id: string } | { who: 'freelance'; id: string };

/** A sponsored person's skill level in `skill` (they learn from you and from courses). */
export function learnerLevel(st: GameState, personId: string, skill: SkillId): number {
  return skillLevel(st.learners[personId]?.[skill] ?? 0);
}

function addLearnerXp(st: GameState, personId: string, skill: SkillId, xp: number): void {
  const rec = (st.learners[personId] ??= {});
  rec[skill] = Math.min(LEVEL_XP[LEVEL_XP.length - 1], (rec[skill] ?? 0) + xp);
}

function addXp(st: GameState, skill: SkillId, xp: number): void {
  st.skills[skill] = Math.min(LEVEL_XP[LEVEL_XP.length - 1], st.skills[skill] + xp);
}

export const hireOf = (st: GameState, expertId: string) => st.hires.find((h) => h.id === expertId);

/** Is this staff member able (and still engaged) to run work needing `skill` at `lvl`? */
export function staffLevel(st: GameState, staff: Staff | undefined, skill: SkillId): number {
  if (!staff) return 0;
  if (staff.who === 'you') return level(st, skill);
  if (staff.who === 'learner') return sponsorOf(st, staff.id) ? learnerLevel(st, staff.id, skill) : 0;
  const e = EXPERT_BY_ID[staff.id];
  if (!e || e.skill !== skill) return 0;
  if (staff.who === 'hire') { const h = hireOf(st, e.id); return h && st.minutes < h.paidUntil ? e.level : 0; }
  return e.level;
}

/** Who could run a stage needing `skill` at `lvl`: you, any sponsored learner, any expert of this land. */
export function candidates(st: GameState, land: RegionId, skill: SkillId): Array<{ staff: Staff; name: string; level: number; note: string }> {
  const out: Array<{ staff: Staff; name: string; level: number; note: string }> = [];
  out.push({ staff: { who: 'you' }, name: 'You both', level: level(st, skill), note: 'your own skill' });
  for (const s of st.sponsored) {
    const p = PERSON_BY_ID[s.id];
    if (p) out.push({ staff: { who: 'learner', id: s.id }, name: p.name, level: learnerLevel(st, s.id, skill), note: 'someone you sponsor' });
  }
  for (const e of EXPERTS.filter((x) => x.land === land && x.skill === skill)) {
    const h = hireOf(st, e.id);
    out.push({ staff: { who: 'hire', id: e.id }, name: e.name, level: e.level, note: h && st.minutes < h.paidUntil ? 'employed' : `employ · ${wage(e)}🪙 a day` });
    out.push({ staff: { who: 'freelance', id: e.id }, name: e.name, level: e.level, note: 'freelance for this build' });
  }
  return out;
}

/** Employ an expert: pay `days` of wages up front (coins, or food as their keep: one food a day). */
/**
 * Employ an expert for `days`: paid in coins (their wage), in kind (their keep: one food a day), or
 * with a home — they live in a home you own (it needs room; build floors for more), which is their pay.
 */
export function employ(st: GameState, expertId: string, days: number, how: 'coins' | 'kind' | 'home' = 'coins', plotId?: string): string | null {
  const e = EXPERT_BY_ID[expertId];
  if (!e) return 'No one by that name.';
  let h = hireOf(st, e.id);
  if (how === 'home') {
    if (!plotId || !ownsHome(st, plotId)) return 'You need a home to offer them.';
    if (h?.home !== plotId && occupantsOf(st, plotId) >= homeCapacity(st, plotId)) return 'Your home is full — build another floor to make room.';
  } else if (how === 'coins') {
    if (st.coins < wage(e) * days) return `You need ${wage(e) * days} coins.`;
    st.coins -= wage(e) * days;
  } else if (!takeFood(st, days)) return `You need ${days} food for their keep.`;
  if (!h) { h = { id: e.id, since: st.minutes, paidUntil: st.minutes }; st.hires.push(h); }
  h.paidUntil = Math.max(h.paidUntil, st.minutes) + days * DAY_MINUTES;
  if (how === 'home') h.home = plotId;
  return null;
}

// ───────────────────────── kitchens and clinics that serve ─────────────────────────

/** What a kitchen cooks from (any food or crop) and a clinic treats with (herbal medicines). */
export const CLINIC_SUPPLIES = ['balm', 'herbs', 'attar', 'ginseng', 'saffron', 'jasmine'];
export function servesWith(kind: InstituteKind, itemId: string): boolean {
  if (kind === 'kitchen') return ITEMS[itemId]?.kind === 'food' || ITEMS[itemId]?.kind === 'crop';
  if (kind === 'clinic') return CLINIC_SUPPLIES.includes(itemId);
  return false;
}
/** People a kitchen feeds (or a clinic treats) a day, by stage. */
export const SERVE_PER_DAY = [4, 8, 16, 30];

export const pantryOf = (st: GameState, siteId: string): Record<string, number> => (st.pantry[siteId] ??= {});
export const pantryCount = (st: GameState, siteId: string): number => Object.values(st.pantry[siteId] ?? {}).reduce((a, b) => a + b, 0);

/** Stock your kitchen or clinic with `n` of an item you carry. */
export function stockPantry(st: GameState, siteId: string, itemId: string, n = 1): string | null {
  const inst = instituteAt(st, siteId);
  if (!inst || (inst.kind !== 'kitchen' && inst.kind !== 'clinic')) return 'Only your kitchens and clinics keep a pantry.';
  if (!servesWith(inst.kind, itemId)) return inst.kind === 'kitchen' ? 'A kitchen cooks food and crops.' : 'A clinic needs herbal medicines — balms, herbs, ginseng.';
  if (!removeItems(st, { [itemId]: n })) return 'You do not have that many.';
  const p = pantryOf(st, siteId);
  p[itemId] = (p[itemId] ?? 0) + n;
  return null;
}

function takeFromPantry(st: GameState, siteId: string, n: number): number {
  const p = pantryOf(st, siteId);
  let got = 0;
  for (const id of Object.keys(p).sort((a, b) => p[b] - p[a])) {
    const t = Math.min(n - got, p[id]);
    p[id] -= t; got += t;
    if (!p[id]) delete p[id];
    if (got >= n) break;
  }
  return got;
}

function takeFood(st: GameState, n: number): boolean {
  const foods = Object.keys(st.inventory).filter((id) => ITEMS[id]?.kind === 'food').sort((a, b) => count(st, b) - count(st, a));
  if (foods.reduce((k, id) => k + count(st, id), 0) < n) return false;
  for (const id of foods) { const take = Math.min(n, count(st, id)); removeItems(st, { [id]: take }); n -= take; if (!n) break; }
  return true;
}

// ───────────────────────── institutes ─────────────────────────

export type Institute = GameState['institutes'][number];
export const instituteAt = (st: GameState, siteId: string): Institute | undefined => st.institutes.find((i) => i.site === siteId);

/** The stage standing now (a stage being built still shows the one before, under scaffolding). −1: nothing yet. */
export function standingStage(st: GameState, inst: Institute): number {
  return inst.buildingUntil !== undefined && st.minutes < inst.buildingUntil ? inst.stage - 1 : inst.stage;
}
export const isBuilding = (st: GameState, inst: Institute): boolean => inst.buildingUntil !== undefined && st.minutes < inst.buildingUntil;

/** Food the builders take when a stage is paid in kind. */
export const kindFood = (s: Stage): number => Math.ceil(s.coins / 20);

function payStage(st: GameState, s: Stage, how: 'coins' | 'kind'): string | null {
  if (how === 'coins') {
    const wood = { wood: s.goods.wood ?? 0 };
    if (st.coins < s.coins) return `You need ${s.coins} coins.`;
    if (!removeItems(st, wood)) return `You need ${wood.wood} wood.`;
    st.coins -= s.coins;
    return null;
  }
  const foods = Object.keys(st.inventory).filter((id) => ITEMS[id]?.kind === 'food').reduce((k, id) => k + count(st, id), 0);
  const missing = Object.entries(s.goods).find(([id, n]) => count(st, id) < n);
  if (missing) return `You need ${missing[1]}× ${ITEMS[missing[0]]?.name ?? missing[0]}.`;
  if (foods < kindFood(s)) return `You need ${kindFood(s)} food for the builders.`;
  removeItems(st, s.goods);
  takeFood(st, kindFood(s));
  return null;
}

function checkStaff(st: GameState, land: RegionId, skill: SkillId, lvl: number, staff: Staff): string | null {
  if (staff.who === 'freelance') {
    const e = EXPERT_BY_ID[staff.id];
    if (!e || e.land !== land || e.skill !== skill) return 'They cannot do this work.';
    if (e.level < lvl) return `${e.name} is not skilled enough (needs level ${lvl}).`;
    return null;
  }
  const have = staffLevel(st, staff, skill);
  if (have < lvl) return `Needs someone with ${SKILLS[skill].name} level ${lvl} — you, someone you sponsor and teach, or a hired expert.`;
  return null;
}

/**
 * Found an institute of `kind` on an open site (stage 0), or build its next stage. `staff` runs it
 * (a freelancer is paid now and leaves when the build is done; the institute then needs staff to run).
 */
export function buildStage(st: GameState, siteId: string, kind: InstituteKind, how: 'coins' | 'kind', staff: Staff): string | null {
  const site = SITE_BY_ID[siteId], def = INSTITUTE_BY_KIND[kind];
  if (!site || !def) return 'Nowhere to build.';
  if (site.established) return 'This institute belongs to the town — join it instead.';
  if (def.land !== null && def.land !== site.land) return `${def.name} belongs to ${REGION_BY_ID[def.land].name}.`;
  let inst = instituteAt(st, siteId);
  if (inst && inst.kind !== kind) return 'Another institute stands here.';
  if (inst && isBuilding(st, inst)) return 'A stage is already being built.';
  const next = inst ? inst.stage + 1 : 0;
  if (next > 3) return 'It has grown as far as it can.';
  const s = def.stages[next];
  const bad = checkStaff(st, site.land, def.skill, s.level, staff);
  if (bad) return bad;
  if (staff.who === 'freelance') {
    const fee = freelanceFee(EXPERT_BY_ID[staff.id], next);
    if (st.coins < fee) return `The freelancer's fee is ${fee} coins.`;
  }
  const paid = payStage(st, s, how);
  if (paid) return paid;
  if (staff.who === 'freelance') st.coins -= freelanceFee(EXPERT_BY_ID[staff.id], next);
  if (!inst) { inst = { site: siteId, kind, stage: 0, at: st.minutes }; st.institutes.push(inst); }
  else inst.stage = next;
  inst.buildingUntil = st.minutes + s.days * DAY_MINUTES;
  inst.staff = staff;
  // Building it teaches whoever leads the work.
  if (staff.who === 'you') addXp(st, def.skill, 10 + next * 10);
  if (staff.who === 'learner') addLearnerXp(st, staff.id, def.skill, 10 + next * 10);
  return null;
}

/** Put someone else in charge of a standing institute. */
export function assignStaff(st: GameState, siteId: string, staff: Staff): string | null {
  const inst = instituteAt(st, siteId), site = SITE_BY_ID[siteId];
  if (!inst || !site) return 'Nothing here yet.';
  const def = INSTITUTE_BY_KIND[inst.kind], s = def.stages[Math.max(0, standingStage(st, inst))];
  if (staff.who === 'freelance') return 'A freelancer only helps with a build; employ someone to run it.';
  const bad = checkStaff(st, site.land, def.skill, s.level, staff);
  if (bad) return bad;
  inst.staff = staff;
  return null;
}

/** What a staffed institute earns in a day at each stage. */
export const DAILY_INCOME = [5, 12, 26, 50];

export interface InstituteNews { site: string; text: string }

/**
 * A day's work: staffed institutes earn (and those who run them grow in skill); kitchens and
 * clinics care for the people you sponsor in their land (their wellbeing rises).
 */
export function tickInstitutes(st: GameState): InstituteNews[] {
  const out: InstituteNews[] = [];
  for (const inst of st.institutes) {
    const days = Math.floor((st.minutes - inst.at) / DAY_MINUTES);
    if (days <= 0) continue;
    const def = INSTITUTE_BY_KIND[inst.kind], site = SITE_BY_ID[inst.site];
    const stage = standingStage(st, inst);
    inst.at += days * DAY_MINUTES;
    if (inst.buildingUntil !== undefined && st.minutes >= inst.buildingUntil) {
      delete inst.buildingUntil;
      if (inst.staff?.who === 'freelance') delete inst.staff;
      out.push({ site: inst.site, text: `The ${def.stages[inst.stage].name} in ${REGION_BY_ID[site.land].name} is finished.` });
    }
    if (stage < 0) continue;
    const lvl = staffLevel(st, inst.staff, def.skill);
    if (lvl < def.stages[stage].level) continue;
    st.coins += DAILY_INCOME[stage] * days;
    if (inst.staff?.who === 'you') addXp(st, def.skill, 4 * days);
    if (inst.staff?.who === 'learner') addLearnerXp(st, inst.staff.id, def.skill, 6 * days);
    if (inst.kind === 'kitchen' || inst.kind === 'clinic') {
      const mine = st.sponsored.filter((s) => PERSON_BY_ID[s.id]?.land === site.land);
      for (const s of mine) s.wellbeing = Math.min(100, s.wellbeing + (3 + stage * 2) * days);
      // Serving from the pantry: the chef cooks for the people you sponsor first (each meal is a
      // day of their care), then for anyone who comes hungry; the clinic treats the sick.
      const n = takeFromPantry(st, inst.site, SERVE_PER_DAY[stage] * days);
      if (n > 0) {
        if (inst.kind === 'kitchen') {
          for (let i = 0; i < n && mine.length; i++) { const s = mine[i % mine.length]; s.paidUntil = Math.max(s.paidUntil, st.minutes) + (i < mine.length * days ? DAY_MINUTES : 0); }
          st.served.meals += n;
          out.push({ site: inst.site, text: `Your ${def.stages[stage].name.toLowerCase()} in ${REGION_BY_ID[site.land].name} served ${n} meal${n > 1 ? 's' : ''}.` });
        } else {
          for (const s of mine) s.wellbeing = Math.min(100, s.wellbeing + Math.min(n, 3) * 4);
          st.served.treated += n;
          out.push({ site: inst.site, text: `Your ${def.stages[stage].name.toLowerCase()} in ${REGION_BY_ID[site.land].name} treated ${n} ${n > 1 ? 'people' : 'person'}.` });
        }
      }
    }
  }
  return out;
}

// ───────────────────────── learning at the town's institute ─────────────────────────

/** Fees and rewards at the land's established institute (each takes a few hours of the day). */
export const COURSE_FEE = 25;
export const LEARN_HOURS = { course: 4, intern: 4, teach: 3 } as const;

/** Take a course: you, or someone you sponsor. Paid in coins, or in the land's own material (3). */
export function takeCourse(st: GameState, siteId: string, who: 'you' | string, how: 'coins' | 'kind' = 'coins'): string | null {
  const site = SITE_BY_ID[siteId];
  if (!site?.established) return 'Courses are taught at the town’s institute.';
  const def = INSTITUTE_BY_KIND[landScience(site.land)];
  if (who !== 'you' && !sponsorOf(st, who)) return 'Only someone you sponsor can be enrolled.';
  if (how === 'coins') {
    if (st.coins < COURSE_FEE) return `The course costs ${COURSE_FEE} coins.`;
    st.coins -= COURSE_FEE;
  } else {
    const mat = REGION_BY_ID[site.land].materials[0];
    if (!removeItems(st, { [mat]: 3 })) return `The course costs 3× ${ITEMS[mat].name}.`;
  }
  if (who === 'you') addXp(st, def.skill, 30); else addLearnerXp(st, who, def.skill, 35);
  st.minutes += LEARN_HOURS.course * 60;
  return null;
}

/** Intern at the town's institute: learn by working under its masters, and earn a little. */
export function intern(st: GameState, siteId: string): string | null {
  const site = SITE_BY_ID[siteId];
  if (!site?.established) return 'Internships are at the town’s institute.';
  const def = INSTITUTE_BY_KIND[landScience(site.land)];
  addXp(st, def.skill, 18);
  st.coins += 6;
  st.minutes += LEARN_HOURS.intern * 60;
  return null;
}

/** Teach a class at the town's institute (level 3 and up): earn, and grow by teaching. */
export function teachClass(st: GameState, siteId: string): string | null {
  const site = SITE_BY_ID[siteId];
  if (!site?.established) return 'Classes are taught at the town’s institute.';
  const def = INSTITUTE_BY_KIND[landScience(site.land)], lvl = level(st, def.skill);
  if (lvl < 3) return `You need ${SKILLS[def.skill].name} level 3 to teach here.`;
  st.coins += 10 + lvl * 6;
  addXp(st, def.skill, 10);
  st.minutes += LEARN_HOURS.teach * 60;
  return null;
}

/** Teach someone you sponsor yourself (once a day each): they learn from your level, you grow too. */
export function teachLearner(st: GameState, personId: string, skill: SkillId): string | null {
  if (!sponsorOf(st, personId)) return 'Sponsor them first.';
  const mine = level(st, skill), theirs = learnerLevel(st, personId, skill);
  if (mine <= theirs) return `You need to be better at ${SKILLS[skill].name} than they are to teach them.`;
  const key = `${personId}:${skill}`, today = Math.floor(st.minutes / DAY_MINUTES);
  if (st.taught[key] === today) return 'You have taught them today — tomorrow again.';
  st.taught[key] = today;
  addLearnerXp(st, personId, skill, 25);
  addXp(st, skill, 6);
  return null;
}

/** A small thanks from a finished course or build, if the land's material is handy (flavour for the UI). */
export function giftFromTown(st: GameState, land: RegionId): string {
  const mat = REGION_BY_ID[land].materials[0];
  addItem(st, mat, 1);
  return ITEMS[mat].name;
}
