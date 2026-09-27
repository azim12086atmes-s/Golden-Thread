import { PERSON_BY_ID } from '../charity/charity';
import { DAY_MINUTES, type GameState } from '../core/state';
import { certLevel } from '../institutions/certificates';
import { EXPERT_BY_ID, hireOf } from '../institutions/institutions';
import { REGION_BY_ID, type RegionId } from '../world/regions';
import { level } from './economy';
import { SKILLS, type SkillId } from './items';

/**
 * Businesses you run (owner's brief: "healthcare, tech and logistics as businesses you run").
 * Open one in any land with the know-how (a certificate or level 2 in its skill), staff it with
 * the experts you employ, and grow it through four levels — each level needs a certificate of that
 * level in its skill, so learning and business go together. Every day it earns (more with each
 * level and each member of staff, less its upkeep), and each sector does good in its own way:
 * a healthcare practice cares for the people in need you sponsor in its land (their wellbeing
 * rises every day); a tech company makes your inventions sell for more; a logistics company
 * speeds your couriers. Pure rules (tests/business.test.ts).
 */
export type Sector = 'healthcare' | 'tech' | 'logistics';

export interface SectorDef { name: string; icon: string; skill: SkillId; open: number; upgrade: [number, number, number]; ranks: [string, string, string, string]; revenue: number; good: string }

export const SECTORS: Record<Sector, SectorDef> = {
  healthcare: { name: 'Healthcare practice', icon: '🩺', skill: 'medicine', open: 120, upgrade: [220, 480, 950], ranks: ['Practice', 'Health centre', 'Health group', 'Health network'], revenue: 16, good: 'cares for the people you sponsor in this land — their wellbeing rises every day' },
  tech: { name: 'Tech company', icon: '💻', skill: 'software', open: 150, upgrade: [260, 520, 1000], ranks: ['Studio', 'Company', 'Tech house', 'Tech group'], revenue: 20, good: 'makes and sells software, and your inventions sell for more everywhere' },
  logistics: { name: 'Logistics company', icon: '🚚', skill: 'logistics', open: 130, upgrade: [240, 500, 980], ranks: ['Depot', 'Carrier', 'Freight line', 'Logistics network'], revenue: 18, good: 'speeds your couriers and ships on every route' },
};

export interface Business { id: string; sector: Sector; land: RegionId; level: number; staff: string[]; day: number; earned: number }

const today = (st: GameState) => Math.floor(st.minutes / DAY_MINUTES);
export const businessOf = (st: GameState, id: string): Business | undefined => st.businesses.find((b) => b.id === id);
export const businessTitle = (b: Business): string => `${SECTORS[b.sector].ranks[b.level - 1]} in ${REGION_BY_ID[b.land].name}`;

/** Whether you know enough to run a business in this sector (a certificate, or level 2 in its skill). */
export const knowHow = (st: GameState, sector: Sector): boolean => certLevel(st, 'you', SECTORS[sector].skill) >= 1 || level(st, SECTORS[sector].skill) >= 2;

export function openBusiness(st: GameState, sector: Sector, land: RegionId): string | null {
  const d = SECTORS[sector];
  if (st.businesses.some((b) => b.sector === sector && b.land === land)) return `You already run a ${d.name.toLowerCase()} here.`;
  if (!knowHow(st, sector)) return `To run a ${d.name.toLowerCase()} you need ${SKILLS[d.skill].name} level 2 or a certificate in it.`;
  if (st.coins < d.open) return `Opening costs ${d.open} coins.`;
  st.coins -= d.open;
  st.businesses.push({ id: `${sector}-${land}`, sector, land, level: 1, staff: [], day: today(st), earned: 0 });
  return null;
}

/** Grow a business a level: its cost, and a certificate in its skill at the new level. */
export function growBusiness(st: GameState, id: string): string | null {
  const b = businessOf(st, id);
  if (!b) return 'No such business.';
  if (b.level >= 4) return 'It is as large as it can be.';
  const d = SECTORS[b.sector], cost = d.upgrade[b.level - 1];
  if (certLevel(st, 'you', d.skill) < b.level + 1) return `To grow to a ${d.ranks[b.level].toLowerCase()} you need a ${SKILLS[d.skill].name} certificate of level ${b.level + 1}.`;
  if (st.coins < cost) return `Growing costs ${cost} coins.`;
  st.coins -= cost;
  b.level++;
  return null;
}

/** Staff a business with an expert you employ (in its skill); two places per level. */
export function staffBusiness(st: GameState, id: string, expertId: string): string | null {
  const b = businessOf(st, id), e = EXPERT_BY_ID[expertId];
  if (!b || !e) return 'No one by that name.';
  if (e.skill !== SECTORS[b.sector].skill) return `${e.name} works in ${SKILLS[e.skill].name}, not ${SKILLS[SECTORS[b.sector].skill].name}.`;
  if (!hireOf(st, expertId)) return `Employ ${e.name} first.`;
  if (b.staff.includes(expertId)) return `${e.name} already works there.`;
  if (b.staff.length >= b.level * 2) return 'Every place is filled — grow the business for more.';
  if (st.businesses.some((o) => o.staff.includes(expertId))) return `${e.name} already works at another of your businesses.`;
  b.staff.push(expertId);
  return null;
}

/** Staff whose wages are paid up to now. */
const working = (st: GameState, b: Business) => b.staff.filter((id) => { const h = hireOf(st, id); return !!h && st.minutes < h.paidUntil; }).length;

/** A day's earnings of a business (after upkeep). */
export const dailyNet = (st: GameState, b: Business): number => Math.round(SECTORS[b.sector].revenue * b.level * (1 + 0.4 * working(st, b)) - 5 * b.level);

/** Each new day: businesses earn, and do their good. Returns news for the day. */
export function tickBusinesses(st: GameState): Array<{ text: string }> {
  const out: Array<{ text: string }> = [], d = today(st);
  for (const b of st.businesses) {
    const days = d - b.day;
    if (days <= 0) continue;
    b.day = d;
    const net = dailyNet(st, b) * Math.min(days, 7);
    st.coins += net;
    b.earned += net;
    if (b.sector === 'healthcare') for (const s of st.sponsored) {
      if (PERSON_BY_ID[s.id]?.land === b.land) s.wellbeing = Math.min(100, s.wellbeing + 2 * b.level * Math.min(days, 7));
    }
    out.push({ text: `${SECTORS[b.sector].icon} Your ${businessTitle(b).toLowerCase()} earned ${net} coins.` });
  }
  return out;
}

/** How much more your inventions sell for, from your tech companies (0.15 per level, up to 0.6). */
export const techBonus = (st: GameState): number => Math.min(0.6, st.businesses.filter((b) => b.sector === 'tech').reduce((a, b) => a + b.level * 0.15, 0));
/** How much faster your couriers travel, from your logistics companies (up to 40% faster). */
export const logisticsBonus = (st: GameState): number => Math.min(0.4, st.businesses.filter((b) => b.sector === 'logistics').reduce((a, b) => a + b.level * 0.1, 0));
