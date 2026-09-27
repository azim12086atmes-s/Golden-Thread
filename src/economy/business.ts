import { PERSON_BY_ID, homeCapacity, occupantsOf, ownsHome, sponsorOf } from '../charity/charity';
import { DAY_MINUTES, type GameState } from '../core/state';
import { EXPERTS, addLearnerXp, isEmployed, learnerLevel } from '../institutions/institutions';
import { folkOf } from '../npc/folk';
import { FIELD_SITES, PLOT_BY_ID } from '../world/plots';
import { REGION_BY_ID, REGIONS, type RegionId } from '../world/regions';
import { addXpTo, count, level, removeItems } from './economy';
import { bonus } from './inventions';
import { ITEMS, SKILLS, type SkillId } from './items';
import { WORKERS, WORKER_BY_ID } from './workers';

/**
 * Businesses grown the way real ones are (owner's brief): nobody buys a company. You begin by
 * taking the orders yourself — deliveries, a dress to sew, a patient to see — in one town. The
 * people you serve come back and tell others, so more orders come in every day. When there is more
 * than you can do, you teach the trade to someone: a person you sponsor who wants to learn it, or
 * someone in the town looking for work — or, if you do not know the trade, you hire someone who
 * does from the start. Then you take the orders and hand them out to your people. When the team is
 * big enough, one of them who knows the trade well becomes your manager and hands out the orders
 * every day, and the business runs without you.
 *
 * Everyone who works is paid: the people you sponsor by your care; everyone else with a monthly
 * wage in coins, or with their keep — a room in a home you own in that town and food each day from
 * your fields' barns there (or what you carry). Keep needs a home and land for food; without the
 * food, they stop working until it comes. Someone who knows the trade well (level 3) teaches the
 * apprentices each day, so the team grows on its own.
 *
 * A business stays in its own town. Clinics care for the people you sponsor there; software studios
 * make your inventions sell for more; delivery firms speed your couriers. Pure rules
 * (tests/business.test.ts).
 */
export type TradeId =
  | 'delivery' | 'boutique' | 'clinic' | 'software' | 'repair' | 'kitchen' | 'joinery'
  | 'pottery' | 'signs' | 'garden' | 'lanterns' | 'builders' | 'tuition' | 'mechanic';

export interface TradeDef { name: string; icon: string; skill: SkillId; order: string; pay: number; hours: number; good?: string }

export const TRADES: Record<TradeId, TradeDef> = {
  delivery: { name: 'Delivery service', icon: '📦', skill: 'logistics', order: 'a parcel to carry across town', pay: 9, hours: 2, good: 'speeds your couriers and ships on every route' },
  boutique: { name: 'Boutique', icon: '👗', skill: 'weaving', order: 'a dress or shawl to make', pay: 14, hours: 3 },
  clinic: { name: 'Clinic', icon: '🩺', skill: 'medicine', order: 'a patient to see', pay: 12, hours: 2, good: 'cares for the people you sponsor in this town — their wellbeing rises every day' },
  software: { name: 'Software studio', icon: '💻', skill: 'software', order: 'an app or website for a shop', pay: 16, hours: 3, good: 'your inventions sell for more everywhere' },
  repair: { name: 'Repair shop', icon: '🔌', skill: 'hardware', order: 'a radio, lamp or pump to mend', pay: 11, hours: 2 },
  kitchen: { name: 'Kitchen', icon: '🍲', skill: 'cooking', order: 'a meal to cook for a family', pay: 8, hours: 2 },
  joinery: { name: 'Joinery', icon: '🪚', skill: 'carpentry', order: 'a stool, shelf or frame to make', pay: 11, hours: 3 },
  pottery: { name: 'Pottery', icon: '🏺', skill: 'pottery', order: 'a set of pots to throw', pay: 10, hours: 3 },
  signs: { name: 'Sign-writer', icon: '🖋️', skill: 'calligraphy', order: 'a shop sign or a letter to write', pay: 10, hours: 2 },
  garden: { name: 'Garden care', icon: '🌱', skill: 'gardening', order: 'a garden to tend', pay: 8, hours: 2 },
  lanterns: { name: 'Lantern shop', icon: '🏮', skill: 'lampcraft', order: 'a lantern to make', pay: 10, hours: 2 },
  builders: { name: 'Builders', icon: '🧱', skill: 'building', order: 'a wall or roof to mend', pay: 13, hours: 3 },
  tuition: { name: 'Tuition', icon: '🧑‍🏫', skill: 'teaching', order: 'a child to tutor', pay: 9, hours: 2 },
  mechanic: { name: 'Mechanic', icon: '⚙️', skill: 'mechanics', order: 'an engine or clock to fix', pay: 12, hours: 2 },
};
export const TRADE_IDS = Object.keys(TRADES) as TradeId[];

/** How someone who works for you is paid: your care (people you sponsor), a monthly wage, or their keep. */
export type Pay = 'care' | 'wage' | 'keep';
export interface Member { id: string; pay: Pay; home?: string; paidUntil: number }

export interface Business {
  id: string; trade: TradeId; land: RegionId;
  /** Word of mouth: each order done well brings it up; it sets how many clients come. */
  rep: number;
  /** Orders waiting today, and how many your people have taken today. */
  orders: number; handed: number;
  day: number;
  team: Member[];
  manager?: string;
  done: number; earned: number;
}

/** A month, for wages. */
export const MONTH_DAYS = 30;
/** People in each town looking for work: anyone can learn a trade if you teach it. */
export interface Seeker { id: string; land: RegionId; name: string; hope: string }
const HOPES = [
  'I am looking for work — any trade, if someone will teach me.',
  'I lost my job at the mill. I learn quickly.',
  'I have just finished school and want to learn a trade.',
  'My children need me to earn. I will work hard.',
];
export const SEEKERS: Seeker[] = REGIONS.flatMap((r, ri) => HOPES.map((hope, k) => ({ id: `seek-${r.id}-${k}`, land: r.id, name: folkOf(r.id, 950 + ri * 9 + k * 17, 0).name, hope })));
export const SEEKER_BY_ID: Record<string, Seeker> = Object.fromEntries(SEEKERS.map((s) => [s.id, s]));

export const MAX_CLIENTS = 24;
/** Clients: two to begin with (neighbours and friends), and one more for every five orders done well. */
export const clientsOf = (b: Business, st?: GameState): number => Math.min(MAX_CLIENTS, Math.round((2 + Math.floor(b.rep / 5)) * (1 + (st ? bonus(st, 'clients') : 0))));
/** What an order pays, done at a skill level. */
export const orderPay = (t: TradeId, lvl: number): number => Math.round(TRADES[t].pay * (1 + 0.1 * lvl));
/** Orders a person does in a day at their level. */
export const perDay = (lvl: number): number => (lvl <= 0 ? 0 : 1 + Math.floor(lvl / 2));
/** A month's wage for someone at a level. */
export const monthlyWage = (lvl: number): number => 90 + 30 * Math.max(1, lvl);
/** Who can become manager: level 2 in the trade, with two others working, and four clients. */
export const MANAGER = { level: 2, crew: 2, clients: 4 } as const;
/** Level at which a member teaches the apprentices each day. */
export const TEACHER_LEVEL = 3;

const today = (st: GameState) => Math.floor(st.minutes / DAY_MINUTES);
export const businessOf = (st: GameState, id: string): Business | undefined => st.businesses.find((b) => b.id === id);
export const businessTitle = (b: Business): string => `${TRADES[b.trade].name} in ${REGION_BY_ID[b.land].name}`;

/** Someone's name, whoever they are. */
export function personName(id: string): string {
  return PERSON_BY_ID[id]?.name ?? SEEKER_BY_ID[id]?.name ?? EXPERTS.find((e) => e.id === id)?.name ?? WORKER_BY_ID[id]?.name ?? id;
}

/** A skilled hire's own level in a skill (experts and everyday workers), or null if they are not one. */
function hireLevel(id: string, skill: SkillId): number | null {
  const e = EXPERTS.find((x) => x.id === id);
  if (e) return e.skill === skill ? e.level : 0;
  const w = WORKER_BY_ID[id];
  if (w) return (w.skill ?? (w.role === 'courier' ? 'logistics' : undefined)) === skill ? w.level : 0;
  return null;
}

/** Someone's level in the trade: skilled hires bring theirs; everyone else learns it from you. */
export function memberLevel(st: GameState, b: Business, id: string): number {
  return hireLevel(id, TRADES[b.trade].skill) ?? learnerLevel(st, id, TRADES[b.trade].skill);
}

/** Whether a member is paid up (and so working). */
export function isPaid(st: GameState, m: Member): boolean {
  if (m.pay === 'care') { const s = sponsorOf(st, m.id); return !!s && st.minutes < s.paidUntil; }
  return st.minutes < m.paidUntil;
}
/** Members working today: paid, and knowing the trade. */
export const workers = (st: GameState, b: Business): Member[] => b.team.filter((m) => isPaid(st, m) && memberLevel(st, b, m.id) >= 1);
const managerOf = (st: GameState, b: Business): Member | undefined => b.team.find((m) => m.id === b.manager && isPaid(st, m));

export type Stage = 'solo' | 'team' | 'managed';
/** How far it has grown: you do the orders; your team does them and you hand them out; a manager runs it. */
export function stageOf(st: GameState, b: Business): Stage {
  if (managerOf(st, b)) return 'managed';
  return workers(st, b).length ? 'team' : 'solo';
}

/** People who could join: skilled hires of the trade in its town, people you sponsor who want to learn it, and those looking for work. */
export function candidatesFor(st: GameState, b: Business): Array<{ id: string; name: string; level: number; note: string; pays: Pay[] }> {
  const skill = TRADES[b.trade].skill, out: Array<{ id: string; name: string; level: number; note: string; pays: Pay[] }> = [];
  const free = (id: string) => !st.businesses.some((o) => o.team.some((m) => m.id === id)) && !isEmployed(st, id);
  for (const s of st.sponsored) {
    const p = PERSON_BY_ID[s.id];
    if (p && p.learn === skill && free(p.id)) out.push({ id: p.id, name: p.name, level: learnerLevel(st, p.id, skill), note: `wants to learn ${SKILLS[skill].name.toLowerCase()}`, pays: ['care'] });
  }
  for (const k of SEEKERS.filter((x) => x.land === b.land)) if (free(k.id)) out.push({ id: k.id, name: k.name, level: learnerLevel(st, k.id, skill), note: 'looking for work', pays: ['wage', 'keep'] });
  const hires = [...EXPERTS.filter((e) => e.land === b.land), ...WORKERS.filter((w) => w.land === b.land)];
  for (const e of hires) {
    const lvl = hireLevel(e.id, skill) ?? 0;
    if (lvl > 0 && free(e.id)) out.push({ id: e.id, name: e.name, level: lvl, note: `knows ${SKILLS[skill].name.toLowerCase()}`, pays: ['wage', 'keep'] });
  }
  return out;
}

/** Your homes in a town that have room for one more. */
export const homesWithRoom = (st: GameState, land: RegionId): string[] =>
  Object.keys(st.plots).filter((id) => PLOT_BY_ID[id]?.region === land && ownsHome(st, id) && occupantsOf(st, id) < homeCapacity(st, id));

/** Food for keep, from your barns in this town first, then what you carry. */
function takeFood(st: GameState, land: RegionId, n: number): boolean {
  const edible = (id: string) => ITEMS[id]?.kind === 'food' || ITEMS[id]?.kind === 'crop';
  const barns = FIELD_SITES.filter((f) => f.land === land).map((f) => st.fields[f.id]?.store).filter((s): s is Record<string, number> => !!s);
  const have = barns.reduce((a, s) => a + Object.entries(s).filter(([k]) => edible(k)).reduce((x, [, v]) => x + v, 0), 0)
    + Object.keys(st.inventory).filter(edible).reduce((a, k) => a + count(st, k), 0);
  if (have < n) return false;
  for (const s of barns) for (const k of Object.keys(s)) {
    if (!n || !edible(k)) continue;
    const t = Math.min(n, s[k]); s[k] -= t; n -= t;
    if (!s[k]) delete s[k];
  }
  for (const k of Object.keys(st.inventory)) { if (!n || !edible(k)) continue; const t = Math.min(n, count(st, k)); removeItems(st, { [k]: t }); n -= t; }
  return true;
}

/** Bring a business's day up to date: new orders from its clients. */
function refresh(st: GameState, b: Business): void {
  const d = today(st);
  if (b.day === d) return;
  b.day = d;
  b.orders = clientsOf(b, st);
  b.handed = 0;
}

/**
 * Begin a business in a town. You need to know the trade (level 1) to take its orders yourself —
 * or, if you do not, begin by hiring someone who knows it (`first`, paid a month's wage).
 */
export function startBusiness(st: GameState, trade: TradeId, land: RegionId, first?: string): string | null {
  const t = TRADES[trade];
  if (!t) return 'No such trade.';
  if (st.businesses.some((b) => b.trade === trade && b.land === land)) return `You already have a ${t.name.toLowerCase()} here.`;
  if (level(st, t.skill) < 1 && !first) return `To begin you need to know ${SKILLS[t.skill].name.toLowerCase()} yourself — or hire someone who does.`;
  const b: Business = { id: `${trade}-${land}`, trade, land, rep: 0, orders: 0, handed: 0, day: -1, team: [], done: 0, earned: 0 };
  if (first) {
    if ((hireLevel(first, t.skill) ?? 0) < 1) return `${personName(first)} does not know ${SKILLS[t.skill].name.toLowerCase()}.`;
    st.businesses.push(b);
    const e = takeOn(st, b.id, first, 'wage');
    if (e) { st.businesses.pop(); return e; }
  } else st.businesses.push(b);
  refresh(st, b);
  return null;
}

/** Take one of today's orders yourself (you must be in its town and know the trade). */
export function takeOrder(st: GameState, id: string, here: RegionId): string | null {
  const b = businessOf(st, id);
  if (!b) return 'No such business.';
  if (here !== b.land) return `Your ${TRADES[b.trade].name.toLowerCase()} is in ${REGION_BY_ID[b.land].name} — its orders are taken there.`;
  refresh(st, b);
  const t = TRADES[b.trade], lvl = level(st, t.skill);
  if (lvl < 1) return `You do not know ${SKILLS[t.skill].name.toLowerCase()} — hand the orders to someone who does.`;
  if (b.orders <= 0) return 'No orders are waiting — more come tomorrow.';
  const pay = orderPay(b.trade, lvl);
  b.orders--; b.rep++; b.done++; b.earned += pay;
  st.coins += pay;
  addXpTo(st, t.skill, 8);
  st.minutes += t.hours * 60;
  return null;
}

/** Hand today's orders to the people who work for you, each as many as they can do. Returns what they earned. */
function dispatch(st: GameState, b: Business): { n: number; coins: number } {
  refresh(st, b);
  let n = 0, coins = 0;
  const crew = workers(st, b).filter((m) => m.id !== b.manager);
  let room = crew.reduce((a, m) => a + perDay(memberLevel(st, b, m.id)), 0) - b.handed;
  for (const m of crew) {
    const lvl = memberLevel(st, b, m.id);
    for (let k = 0; k < perDay(lvl) && b.orders > 0 && room > 0; k++) { b.orders--; b.handed++; room--; n++; coins += orderPay(b.trade, lvl); }
  }
  b.rep += n; b.done += n; b.earned += coins;
  st.coins += coins;
  return { n, coins };
}

/** Take the orders and hand them out to your people (in its town; an hour's work). */
export function handOut(st: GameState, id: string, here: RegionId): { error: string } | { n: number; coins: number } {
  const b = businessOf(st, id);
  if (!b) return { error: 'No such business.' };
  if (here !== b.land) return { error: `Your ${TRADES[b.trade].name.toLowerCase()} is in ${REGION_BY_ID[b.land].name}.` };
  if (!workers(st, b).some((m) => m.id !== b.manager)) return { error: 'No one works for you yet — teach someone or hire them.' };
  const r = dispatch(st, b);
  if (!r.n) return { error: b.orders ? 'Your people have done all they can today.' : 'No orders are waiting — more come tomorrow.' };
  st.minutes += 60;
  return r;
}

/**
 * Take someone on. People you sponsor are paid by your care; anyone else by a monthly wage (paid a
 * month ahead) or their keep (a room in your home in this town, and food each day).
 */
export function takeOn(st: GameState, id: string, personId: string, pay: Pay, plotId?: string): string | null {
  const b = businessOf(st, id);
  if (!b) return 'No such business.';
  const c = candidatesFor(st, b).find((x) => x.id === personId);
  if (!c) return b.team.some((m) => m.id === personId) ? `${personName(personId)} already works here.` : `${personName(personId)} cannot join this business.`;
  if (!c.pays.includes(pay)) return pay === 'care' ? 'Only the people you sponsor are paid by your care.' : `${c.name} is already cared for by you.`;
  const m: Member = { id: personId, pay, paidUntil: st.minutes };
  if (pay === 'wage') {
    const w = monthlyWage(c.level);
    if (st.coins < w) return `A month's wage is ${w} coins.`;
    st.coins -= w;
    m.paidUntil = st.minutes + MONTH_DAYS * DAY_MINUTES;
  } else if (pay === 'keep') {
    const home = plotId ?? homesWithRoom(st, b.land)[0];
    if (!home || PLOT_BY_ID[home]?.region !== b.land || !ownsHome(st, home)) return `Keep needs a home of yours in ${REGION_BY_ID[b.land].name} for them to live in.`;
    if (occupantsOf(st, home) >= homeCapacity(st, home)) return 'Your home is full — build another floor to make room.';
    if (!takeFood(st, b.land, 1)) return 'Keep needs food each day — from your fields here, or what you carry.';
    m.home = home;
    m.paidUntil = (today(st) + 1) * DAY_MINUTES;
  }
  b.team.push(m);
  return null;
}

/** Pay a member another month's wage. */
export function payWage(st: GameState, id: string, personId: string): string | null {
  const b = businessOf(st, id), m = b?.team.find((x) => x.id === personId);
  if (!b || !m) return 'They do not work here.';
  if (m.pay !== 'wage') return 'They are not paid a wage.';
  const w = monthlyWage(memberLevel(st, b, m.id));
  if (st.coins < w) return `A month's wage is ${w} coins.`;
  st.coins -= w;
  m.paidUntil = Math.max(m.paidUntil, st.minutes) + MONTH_DAYS * DAY_MINUTES;
  return null;
}

/** Let someone go. */
export function letGo(st: GameState, id: string, personId: string): void {
  const b = businessOf(st, id);
  if (!b) return;
  b.team = b.team.filter((m) => m.id !== personId);
  if (b.manager === personId) delete b.manager;
}

/** Teach the trade to someone on your team (once a day each, in its town; you must know it better). */
export function teachMember(st: GameState, id: string, personId: string, here: RegionId): string | null {
  const b = businessOf(st, id), m = b?.team.find((x) => x.id === personId);
  if (!b || !m) return 'They do not work here.';
  if (here !== b.land) return `They are in ${REGION_BY_ID[b.land].name}.`;
  const skill = TRADES[b.trade].skill;
  if (hireLevel(personId, skill) !== null) return `${personName(personId)} learnt the trade before they came.`;
  if (level(st, skill) <= learnerLevel(st, personId, skill)) return `You need to know ${SKILLS[skill].name.toLowerCase()} better than they do to teach them.`;
  const key = `biz:${personId}`;
  if (st.taught[key] === today(st)) return 'You have taught them today — tomorrow again.';
  st.taught[key] = today(st);
  addLearnerXp(st, personId, skill, 25);
  addXpTo(st, 'teaching', 6);
  st.minutes += 2 * 60;
  return null;
}

/** Why someone cannot yet be manager, or null if they can. */
export function managerBlock(st: GameState, b: Business, personId: string): string | null {
  const m = b.team.find((x) => x.id === personId);
  if (!m || !isPaid(st, m)) return 'They need to be working here.';
  if (memberLevel(st, b, personId) < MANAGER.level) return `A manager needs ${SKILLS[TRADES[b.trade].skill].name} level ${MANAGER.level}.`;
  if (workers(st, b).filter((x) => x.id !== personId).length < MANAGER.crew) return `First have ${MANAGER.crew} others doing the orders for them to manage.`;
  if (clientsOf(b, st) < MANAGER.clients) return `First grow to ${MANAGER.clients} clients.`;
  return null;
}

/** Make someone the manager: they hand out the orders every day, and the business runs without you. */
export function appoint(st: GameState, id: string, personId: string): string | null {
  const b = businessOf(st, id);
  if (!b) return 'No such business.';
  const e = managerBlock(st, b, personId);
  if (e) return e;
  b.manager = personId;
  return null;
}

/** Each new day: keep is given, the ones who know the trade teach the apprentices, and managers run the day. */
export function tickBusinesses(st: GameState): Array<{ text: string }> {
  const out: Array<{ text: string }> = [], d = today(st);
  for (const b of st.businesses) {
    if (b.day >= d) continue;
    const name = businessTitle(b).toLowerCase(), skill = TRADES[b.trade].skill;
    // Orders left undone yesterday cost a little of your good name.
    if (b.day >= 0 && b.orders > 0) b.rep = Math.max(0, b.rep - Math.floor(b.orders / 2));
    // Keep: a meal each for everyone who lives in your home and works for their keep.
    for (const m of b.team) {
      if (m.pay !== 'keep') continue;
      if (takeFood(st, b.land, 1)) m.paidUntil = (d + 1) * DAY_MINUTES;
      else if (st.minutes >= m.paidUntil) out.push({ text: `🍞 ${personName(m.id)} at your ${name} has no food for their keep — bring food or harvest your fields there.` });
    }
    // Those who know the trade well teach the apprentices.
    const teachers = workers(st, b).filter((m) => memberLevel(st, b, m.id) >= TEACHER_LEVEL);
    if (teachers.length) for (const m of b.team) {
      if (hireLevel(m.id, skill) === null && isPaid(st, m) && learnerLevel(st, m.id, skill) < TEACHER_LEVEL) addLearnerXp(st, m.id, skill, 12 * teachers.length);
    }
    refresh(st, b);
    if (managerOf(st, b)) {
      const r = dispatch(st, b);
      if (r.n) out.push({ text: `${TRADES[b.trade].icon} Your ${name} did ${r.n} orders today and earned ${r.coins} coins.` });
    }
  }
  // Clinics care for the people you sponsor in their town.
  for (const b of st.businesses.filter((x) => x.trade === 'clinic')) {
    const care = Math.round(2 * (workers(st, b).length + (managerOf(st, b) ? 1 : 0)) * (1 + bonus(st, 'heal')));
    for (const s of st.sponsored) if (PERSON_BY_ID[s.id]?.land === b.land) s.wellbeing = Math.min(100, s.wellbeing + care);
  }
  return out;
}

/** How big a business has grown (its people at work, and a manager). */
const scale = (st: GameState, b: Business): number => workers(st, b).length + (managerOf(st, b) ? 2 : 0);
/** How much more your inventions sell for, from your software studios (up to 60%). */
export const techBonus = (st: GameState): number => Math.min(0.6, st.businesses.filter((b) => b.trade === 'software').reduce((a, b) => a + 0.05 * scale(st, b), 0));
/** How much faster your couriers travel, from your delivery services (up to 40%). */
export const logisticsBonus = (st: GameState): number => Math.min(0.4, st.businesses.filter((b) => b.trade === 'delivery').reduce((a, b) => a + 0.05 * scale(st, b), 0));

/** Carry businesses from older saves (a sector, levels and staff) into the new form. */
export function fromOldSave(raw: unknown): Business | null {
  const o = raw as Record<string, unknown>;
  if (!o || typeof o !== 'object') return null;
  if (typeof o.trade === 'string') return o as unknown as Business;
  const trade = ({ healthcare: 'clinic', tech: 'software', logistics: 'delivery' } as Record<string, TradeId>)[String(o.sector)];
  if (!trade || typeof o.land !== 'string') return null;
  const lvl = Number(o.level) || 1, staff = Array.isArray(o.staff) ? (o.staff as string[]) : [];
  return {
    id: `${trade}-${o.land}`, trade, land: o.land as RegionId, rep: lvl * 20, orders: 0, handed: 0, day: -1,
    team: staff.map((id) => ({ id, pay: 'wage' as Pay, paidUntil: 0 })), done: 0, earned: Number(o.earned) || 0,
  };
}

/** Whether you can begin a trade in this town, and how. */
export function canBegin(st: GameState, trade: TradeId, land: RegionId): 'yourself' | 'hire' | null {
  const skill = TRADES[trade].skill;
  if (st.businesses.some((b) => b.trade === trade && b.land === land)) return null;
  if (level(st, skill) >= 1) return 'yourself';
  return [...EXPERTS, ...WORKERS].some((e) => e.land === land && (hireLevel(e.id, skill) ?? 0) >= 1) ? 'hire' : null;
}

/** The first skilled hire of a trade in a town (to begin with, when you do not know it). */
export const firstHire = (land: RegionId, trade: TradeId): string | undefined =>
  [...EXPERTS, ...WORKERS].find((e) => e.land === land && (hireLevel(e.id, TRADES[trade].skill) ?? 0) >= 1)?.id;

