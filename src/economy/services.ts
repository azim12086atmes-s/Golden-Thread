import { Rng } from '../core/rng';
import { DAY_MINUTES, type GameState } from '../core/state';
import { REGION_BY_ID, REGIONS, type RegionId } from '../world/regions';
import { hasItems, level, removeItems } from './economy';
import { ITEMS, LEVEL_XP, SKILLS, type SkillId } from './items';

/**
 * Service work (owner's brief — NEXT_WORK C4: "being able to sell a service with a required skill
 * level, to grow skill you have to do it … service jobs: company employee, freelance software,
 * hardware building … health care, tech, logistics, supply, agriculture, research").
 *
 * Every land has employers in its own line of work — New Yonder's software studio and robotics
 * works, the Swiss watch house, Jade Terraces' pharmacy, the House of Wisdom, the caravan company.
 * Anyone can start as an apprentice; a shift a day grows the skill, and the title and the pay rise
 * with it (apprentice → junior → … → master). Freelance gigs are posted fresh each day: software
 * can be done from anywhere, hardware builds need parts, and every gig asks for a skill level.
 *
 * Pure rules over GameState (tests/services.test.ts).
 */
export interface Job { id: string; land: RegionId; employer: string; role: string; skill: SkillId; hours: number }

/** What the work is called in each skill (the rank goes before it). */
export const ROLE: Record<SkillId, string> = {
  software: 'Developer', hardware: 'Hardware Engineer', teaching: 'Teacher', medicine: 'Healer', building: 'Builder',
  logistics: 'Dispatcher', research: 'Researcher', cooking: 'Cook', weaving: 'Weaver', carpentry: 'Carpenter',
  pottery: 'Potter', calligraphy: 'Scribe', gardening: 'Gardener', mechanics: 'Mechanic', lampcraft: 'Lampwright',
};
export const RANKS = ['Apprentice', 'Junior', 'Associate', 'Senior', 'Lead', 'Principal', 'Master'];
export const SHIFT_HOURS = 6, SHIFT_XP = 12;

/** Each land's employers: [name, skill]. */
const EMPLOYERS: Record<RegionId, Array<[string, SkillId]>> = {
  newyork: [['Solar Loom Studios', 'software'], ['Skyline Robotics', 'hardware']],
  london: [['Brass & Steam Works', 'hardware'], ['Thames Clinic', 'medicine']],
  switzerland: [['Alpenrose Watch House', 'mechanics'], ['Mountain Rescue Station', 'medicine']],
  japan: [['Kumo Games', 'software'], ['Sakura Tea House', 'cooking']],
  korea: [['Hanji Press', 'calligraphy'], ['Hanok Builders', 'building']],
  china: [['Jade Pharmacy', 'medicine'], ['Silk Road Logistics', 'logistics']],
  norway: [['Fjord Boatyard', 'carpentry'], ['Harbour Office', 'logistics']],
  renaissance: [['Bottega del Vaso', 'pottery'], ['The Accademia', 'teaching']],
  vintage: [['Maple Row Radio', 'hardware'], ['The Corner Diner', 'cooking']],
  islamic: [['House of Wisdom', 'research'], ['Tilemakers’ Workshop', 'pottery']],
  middleeast: [['Souq Traders', 'logistics'], ['Lantern Makers', 'lampcraft']],
  egypt: [['Nile Waterworks', 'building'], ['Papyrus Library', 'research']],
  desert: [['The Caravan Company', 'logistics'], ['Oasis Tent School', 'teaching']],
  indianorth: [['Block Printers of Gulabi Nagar', 'weaving'], ['Jantar Observatory', 'research']],
  indiasouth: [['Kaveri Ayurveda', 'medicine'], ['Spice Exporters', 'logistics']],
  mughal: [['Garden Builders', 'gardening'], ['The Karkhana', 'building']],
  indonesia: [['Subak Cooperative', 'gardening'], ['Batik House', 'weaving']],
  aurora: [['Polar Station', 'research'], ['Ice Hall Builders', 'building']],
  meadow: [['Meadow School', 'teaching'], ['Village Clinic', 'medicine']],
  skyisles: [['Lantern Guild', 'lampcraft'], ['Star Observatory', 'research']],
};

export const JOBS: Job[] = REGIONS.flatMap((r) => EMPLOYERS[r.id].map(([employer, skill], k) => ({ id: `job-${r.id}-${k}`, land: r.id, employer, role: ROLE[skill], skill, hours: SHIFT_HOURS })));
export const JOB_BY_ID: Record<string, Job> = Object.fromEntries(JOBS.map((j) => [j.id, j]));
export const jobsIn = (land: RegionId): Job[] => JOBS.filter((j) => j.land === land);

/** Your title at a job, by your level in its skill. */
export const titleAt = (job: Job, lvl: number): string => `${RANKS[Math.min(lvl, RANKS.length - 1)]} ${job.role}`;
/** What a shift pays at a level — skilled work pays much more. */
export const shiftPay = (lvl: number): number => 10 + lvl * 7;

const today = (st: GameState) => Math.floor(st.minutes / DAY_MINUTES);

function addXp(st: GameState, skill: SkillId, xp: number): { from: number; to: number } {
  const from = level(st, skill);
  st.skills[skill] = Math.min(LEVEL_XP[LEVEL_XP.length - 1], st.skills[skill] + xp);
  return { from, to: level(st, skill) };
}

export const workedToday = (st: GameState, jobId: string): boolean => st.work.shifts[jobId] === today(st);

/** Work a shift at an employer (one a day each): paid by your level, and your skill grows. */
export function workShift(st: GameState, jobId: string): { error: string } | { pay: number; title: string; promoted: string | null } {
  const job = JOB_BY_ID[jobId];
  if (!job) return { error: 'There is no such job.' };
  if (workedToday(st, jobId)) return { error: `You have worked your shift at ${job.employer} today — come back tomorrow.` };
  const lvl = level(st, job.skill), pay = shiftPay(lvl);
  st.coins += pay;
  st.minutes += job.hours * 60;
  st.work.shifts[jobId] = today(st);
  st.work.worked[jobId] = (st.work.worked[jobId] ?? 0) + 1;
  const { from, to } = addXp(st, job.skill, SHIFT_XP);
  return { pay, title: titleAt(job, from), promoted: to > from ? titleAt(job, to) : null };
}

// ───── freelance ─────

export interface Gig { id: string; land: RegionId; title: string; skill: SkillId; min: number; hours: number; pay: number; needs: Record<string, number>; remote: boolean }

type GigTemplate = [title: string, min: number, hours: number, needs?: Record<string, number>];
/** Freelance work by skill: [what, level needed, hours, parts]. `{land}` is the client's land. */
const GIGS: Partial<Record<SkillId, GigTemplate[]>> = {
  software: [['A booking page for a guesthouse in {land}', 0, 3], ['Fix a bug in a stall’s till app', 1, 3], ['A timetable program for a school in {land}', 1, 5],
    ['A map app for the caravan routes', 2, 6], ['An appointments system for a clinic in {land}', 3, 7], ['A learning game for the children of {land}', 4, 8]],
  hardware: [['Repair a radio', 0, 2, { gear: 1 }], ['Assemble a solar lamp', 1, 3, { scrap: 1, gear: 1 }], ['Wire a workshop in {land}', 2, 4, { scrap: 2 }],
    ['Build a water pump for a farm', 3, 5, { gear: 2, wood: 1 }], ['Build a weather station', 4, 6, { gear: 2, scrap: 2 }]],
  teaching: [['Tutor two children in reading', 0, 2], ['Teach an evening class for grown-ups', 2, 3], ['Coach students for their exams', 3, 4]],
  medicine: [['Help at the morning rounds', 0, 3], ['Run a health camp in a village of {land}', 2, 5, { herbs: 2 }], ['Care for a family through a fever', 3, 6, { balm: 1 }]],
  building: [['Mend a neighbour’s roof', 0, 3, { wood: 2 }], ['Raise a garden wall', 1, 4, { clay: 2 }], ['Build a shelter for a family in {land}', 3, 8, { wood: 4 }]],
  logistics: [['Plan a caravan’s route', 0, 2], ['Sort a warehouse in {land}', 1, 4], ['Run the harbour’s cargo for a day', 3, 6]],
  research: [['Survey the springs of {land}', 0, 3], ['Catalogue a library’s old books', 1, 4], ['Help write a paper on {land}’s science', 3, 6]],
  calligraphy: [['Write wedding invitations', 0, 2, { hanji: 1 }]], weaving: [['Mend a festival banner', 0, 2, { wool: 1 }]],
  carpentry: [['Make a bench for the square', 0, 3, { wood: 2 }]], pottery: [['Throw pots for a café', 0, 3, { clay: 2 }]],
  cooking: [['Cook for a wedding feast', 1, 4]], gardening: [['Plant a courtyard garden', 0, 3]], mechanics: [['Service a delivery van', 1, 3, { gear: 1 }]],
  lampcraft: [['Make lanterns for a festival', 1, 3]],
};
export const gigPay = (min: number, hours: number, parts: number): number => 12 + min * 16 + hours * 4 + parts * 6;

/** Today's freelance board in a land: its own trades and hardware, plus a software job that can be done from anywhere. */
export function gigsFor(land: RegionId, day: number): Gig[] {
  const rng = new Rng(`gigs:${land}:${day}`), name = REGION_BY_ID[land].name;
  const skills: SkillId[] = [...new Set<SkillId>(['software', ...EMPLOYERS[land].map(([, s]) => s), 'hardware'])];
  return skills.slice(0, 4).map((skill, k) => {
    const list = GIGS[skill] ?? GIGS.software!;
    const [title, min, hours, needs = {}] = list[Math.floor(rng.next() * list.length)];
    const parts = Object.values(needs).reduce((a, b) => a + b, 0);
    return { id: `${land}:${day}:${k}`, land, title: title.replace('{land}', name), skill, min, hours, pay: gigPay(min, hours, parts), needs, remote: skill === 'software' };
  });
}

/** Take on a freelance gig: it needs the skill level (and the parts, for a build); done once. */
export function doGig(st: GameState, gig: Gig): { error: string } | { pay: number; promoted: string | null } {
  if (st.work.done.includes(gig.id)) return { error: 'That one is done — the client is delighted.' };
  if (Number(gig.id.split(':')[1]) !== today(st)) return { error: 'That gig has been taken by someone else.' };
  if (level(st, gig.skill) < gig.min) return { error: `The client needs ${SKILLS[gig.skill].name} level ${gig.min}.` };
  if (!hasItems(st, gig.needs)) return { error: `You need ${Object.entries(gig.needs).map(([id, n]) => `${n}× ${ITEMS[id]?.name ?? id}`).join(' and ')}.` };
  removeItems(st, gig.needs);
  st.coins += gig.pay;
  st.minutes += gig.hours * 60;
  // Keep only today's and yesterday's records.
  const d = today(st);
  st.work.done = [...st.work.done.filter((id) => Number(id.split(':')[1]) >= d - 1), gig.id];
  const { from, to } = addXp(st, gig.skill, 6 + gig.hours * 3);
  return { pay: gig.pay, promoted: to > from ? `${SKILLS[gig.skill].name} level ${to}` : null };
}
