import { DAY_MINUTES, type GameState } from '../core/state';
import { count, removeItems } from '../economy/economy';
import { ITEMS, type SkillId } from '../economy/items';
import { PLOT_BY_ID } from '../housing/housing';
import { folkOf } from '../npc/folk';
import { REGION_BY_ID, REGIONS, regionCenter, type RegionId } from '../world/regions';

/**
 * Caring for people: the heart of the owner's brief (docs/team/handoffs/NEXT_WORK_2026-09-27.md,
 * C1). In every land live people who need someone — an orphan, an elder, someone without a home,
 * a family that has fallen on hard times. The travellers can sponsor them: pay for their days in
 * coins or in kind (meals, blankets, balms, lamps — whatever they need), and take them to live in
 * a home they own, building more floors to make room for more. Sponsored people who are cared
 * for grow in wellbeing; each has a hope (to learn a craft, to go to school, to work again) that
 * later systems — teaching, courses, institutes (C4, C7) — will let the travellers fulfil.
 *
 * Pure rules over GameState, unit-tested (tests/charity.test.ts). The UI and the home interior read them.
 */

export type NeedKind = 'orphan' | 'elder' | 'homeless' | 'family';

export interface Person {
  id: string;
  land: RegionId;
  name: string;
  kind: NeedKind;
  /** What they hope for, in their own words. */
  hope: string;
  /** The craft they would love to learn (the seed of teaching and institutes). */
  learn: SkillId;
}

export const NEED_LABEL: Record<NeedKind, { name: string; icon: string; needs: string }> = {
  orphan: { name: 'Orphan', icon: '🧒', needs: 'meals, a warm place, schooling' },
  elder: { name: 'Elder', icon: '🧓', needs: 'meals, medicine, company' },
  homeless: { name: 'Without a home', icon: '🛖', needs: 'shelter, meals, blankets' },
  family: { name: 'Family in hardship', icon: '👪', needs: 'rations, work' },
};

const HOPES: Record<NeedKind, Array<[string, SkillId]>> = {
  orphan: [['I want to go to school and learn to write beautifully.', 'calligraphy'], ['I would like to learn to cook, like my mother did.', 'cooking'], ['Could I learn to make lanterns one day?', 'lampcraft']],
  elder: [['I only wish for company and a garden to tend.', 'gardening'], ['I could teach the young ones to weave, if I had a loom.', 'weaving'], ['My hands still remember pottery.', 'pottery']],
  homeless: [['A roof, and then I can work again — I was a carpenter.', 'carpentry'], ['I used to mend engines. Somewhere to sleep, and I can mend them again.', 'mechanics'], ['Somewhere warm, and a chance to learn a trade.', 'weaving']],
  family: [['Rations until the harvest, and work for my husband.', 'gardening'], ['Our children want to study; we can barely feed them.', 'calligraphy'], ['If we had a stall we could sell what we cook.', 'cooking']],
};
const KINDS: NeedKind[] = ['orphan', 'elder', 'homeless', 'family'];

/** Four people in need in every land (one of each kind), with stable names and hopes. */
export const PEOPLE_IN_NEED: Person[] = REGIONS.flatMap((r, ri) => KINDS.map((kind, k) => {
  const [hope, learn] = HOPES[kind][(ri + k) % HOPES[kind].length];
  return { id: `need-${r.id}-${kind}`, land: r.id, name: folkOf(r.id, 700 + k * 13 + ri, 0).name, kind, hope, learn };
}));
export const PERSON_BY_ID: Record<string, Person> = Object.fromEntries(PEOPLE_IN_NEED.map((p) => [p.id, p]));

/**
 * Where each person in need can be found in their town (world coordinates): on the pavement of one
 * of the four avenues (a different one for each), clear of the road, the lamps and the houses —
 * in the Sky Isles, on the islands round the plaza. The people finder shows the way here.
 */
export function needSpot(p: Person): { x: number; z: number } {
  const c = regionCenter(REGION_BY_ID[p.land]), k = KINDS.indexOf(p.kind);
  if (p.land === 'skyisles') { const a = Math.PI / 4 + (k * Math.PI) / 2; return { x: c.x + Math.cos(a) * 40, z: c.z + Math.sin(a) * 40 }; }
  const [ax, az] = ([[0, 1], [1, 0], [0, -1], [-1, 0]] as const)[k], d = 118, side = 13;
  return { x: c.x + ax * d + az * side, z: c.z + az * d - ax * side };
}

/** You have met them (talked with them in their town), or they are in your care already. */
export const hasMet = (st: GameState, id: string): boolean => st.met.includes(id) || st.sponsored.some((s) => s.id === id);

/** Meet someone in need: they join the people finder. Returns true the first time. */
export function meet(st: GameState, id: string): boolean {
  if (!PERSON_BY_ID[id] || hasMet(st, id)) return false;
  st.met.push(id);
  return true;
}

export type Sponsorship = GameState['sponsored'][number];

/** A day of care costs this many coins… */
export const DAY_COINS = 6;
/** …or can be given in kind: how many days each kind of gift covers (food feeds; goods clothe and heal). */
export function daysOf(itemId: string, kind: NeedKind): number {
  const it = ITEMS[itemId];
  if (!it) return 0;
  if (it.kind === 'food') return 1;
  if (it.kind === 'crop') return 0.5;
  if (['blanket', 'scarf', 'shawl', 'rug'].includes(itemId)) return kind === 'homeless' || kind === 'elder' ? 3 : 2;
  if (itemId === 'balm' || itemId === 'attar') return kind === 'elder' ? 3 : 1;
  if (itemId === 'lantern' || itemId === 'starlamp') return 2;
  if (itemId === 'letter' || itemId === 'verse' || itemId === 'scroll') return kind === 'orphan' ? 2 : 1;
  return 0;
}

/** What the travellers could give this person in kind, from what they carry now. */
export function giftsFor(st: GameState, personId: string): Array<{ item: string; days: number }> {
  const p = PERSON_BY_ID[personId];
  if (!p) return [];
  return Object.keys(st.inventory).filter((id) => count(st, id) > 0 && daysOf(id, p.kind) > 0)
    .map((item) => ({ item, days: daysOf(item, p.kind) })).sort((a, b) => b.days - a.days);
}

export const sponsorOf = (st: GameState, id: string): Sponsorship | undefined => st.sponsored.find((s) => s.id === id);

/**
 * Give days of care: `coins` pays DAY_COINS a day; an `item` pays in kind. Starts the
 * sponsorship if it is new. Returns an error message, or null when done.
 */
export function give(st: GameState, personId: string, pay: { coins: number } | { item: string }): string | null {
  const p = PERSON_BY_ID[personId];
  if (!p) return 'No one by that name.';
  let days: number;
  if ('coins' in pay) {
    if (pay.coins <= 0) return 'Nothing given.';
    if (st.coins < pay.coins) return `You need ${pay.coins} coins.`;
    st.coins -= pay.coins;
    days = pay.coins / DAY_COINS;
  } else {
    days = daysOf(pay.item, p.kind);
    if (days <= 0) return `${p.name} has no use for that.`;
    if (!removeItems(st, { [pay.item]: 1 })) return 'You have none to give.';
  }
  let s = sponsorOf(st, personId);
  if (!s) { s = { id: personId, since: st.minutes, paidUntil: st.minutes, wellbeing: 30, at: st.minutes }; st.sponsored.push(s); }
  settle(st, s);
  s.paidUntil = Math.max(s.paidUntil, st.minutes) + days * DAY_MINUTES;
  return null;
}

/** Days of care still paid for (0 when they are waiting on you). */
export function daysLeft(st: GameState, s: Sponsorship): number {
  return Math.max(0, (s.paidUntil - st.minutes) / DAY_MINUTES);
}

/** Bring wellbeing up to date: +12 a day while cared for (+8 more living in your home), −10 a day while not. */
function settle(st: GameState, s: Sponsorship): void {
  const now = st.minutes;
  if (now <= s.at) return;
  const paidPart = Math.max(0, Math.min(now, s.paidUntil) - s.at), unpaid = (now - s.at) - paidPart;
  s.wellbeing = Math.max(0, Math.min(100, s.wellbeing + (paidPart / DAY_MINUTES) * (12 + (s.home ? 8 : 0)) - (unpaid / DAY_MINUTES) * 10));
  s.at = now;
}

export interface CharityNews { personId: string; text: string }

/** Moments worth telling: crossing into good wellbeing, and running out of paid days. */
export function tickCharity(st: GameState): CharityNews[] {
  const out: CharityNews[] = [];
  for (const s of st.sponsored) {
    const before = s.wellbeing, wasPaid = s.at < s.paidUntil;
    settle(st, s);
    const p = PERSON_BY_ID[s.id];
    if (!p) continue;
    if (before < 70 && s.wellbeing >= 70) out.push({ personId: s.id, text: `${p.name} is thriving in your care. "${p.hope}"` });
    if (wasPaid && st.minutes >= s.paidUntil) out.push({ personId: s.id, text: `${p.name}'s days of care have run out — give coins, food or goods to continue.` });
  }
  return out;
}

// ───────────────────────── homes with room for more ─────────────────────────

/** Most floors a home can grow. */
export const MAX_FLOORS = 3;
/** People a home holds: its ground floor, and two more for every floor built. */
export const homeCapacity = (st: GameState, plotId: string): number => 2 + floorsOf(st, plotId) * 2;
/** A floor takes a day to build. */
export const FLOOR_MINUTES = DAY_MINUTES;
/**
 * A floor costs builders' wages and timber: in coins with wood, or paid in kind — rations for
 * the builders (food) with more wood — so a household without coins can still build.
 */
export const FLOOR_COST = {
  coins: { coins: 60, items: { wood: 6 } as Record<string, number> },
  kind: { coins: 0, items: { wood: 8 } as Record<string, number>, food: 4 },
};

export function ownsHome(st: GameState, plotId: string): boolean {
  return !!st.plots[plotId]?.decor.some((d) => d.kind.startsWith('house-'));
}

/** Floors finished (a floor under construction is not counted until its day is done). */
export function floorsOf(st: GameState, plotId: string): number {
  const h = st.homeFloors[plotId];
  if (!h) return 0;
  return h.floors + (h.buildingUntil !== undefined && st.minutes >= h.buildingUntil ? 1 : 0);
}

export function floorBuilding(st: GameState, plotId: string): number | null {
  const h = st.homeFloors[plotId];
  return h?.buildingUntil !== undefined && st.minutes < h.buildingUntil ? h.buildingUntil : null;
}

/** Take food to pay the builders: any food items, most plentiful first. */
function takeFood(st: GameState, n: number): boolean {
  const foods = Object.keys(st.inventory).filter((id) => ITEMS[id]?.kind === 'food').sort((a, b) => count(st, b) - count(st, a));
  if (foods.reduce((k, id) => k + count(st, id), 0) < n) return false;
  for (const id of foods) { const take = Math.min(n, count(st, id)); removeItems(st, { [id]: take }); n -= take; if (!n) break; }
  return true;
}

/** Start a new floor on a home you own, paid 'coins' (coins + wood) or 'kind' (wood + food for the builders). */
export function buildFloor(st: GameState, plotId: string, how: 'coins' | 'kind'): string | null {
  if (!PLOT_BY_ID[plotId] || !ownsHome(st, plotId)) return 'You need a home here first.';
  const h = (st.homeFloors[plotId] ??= { floors: 0 });
  if (h.buildingUntil !== undefined) {
    if (st.minutes < h.buildingUntil) return 'A floor is already being built.';
    h.floors++; delete h.buildingUntil;
  }
  if (h.floors >= MAX_FLOORS) return 'This home has all the floors it can take.';
  const c = FLOOR_COST[how];
  if (how === 'coins') {
    if (st.coins < c.coins) return `You need ${c.coins} coins.`;
    if (!removeItems(st, c.items)) return `You need ${c.items.wood} wood.`;
    st.coins -= c.coins;
  } else {
    const food = FLOOR_COST.kind.food;
    const foods = Object.keys(st.inventory).filter((id) => ITEMS[id]?.kind === 'food').reduce((k, id) => k + count(st, id), 0);
    if (count(st, 'wood') < c.items.wood) return `You need ${c.items.wood} wood.`;
    if (foods < food) return `You need ${food} food for the builders.`;
    removeItems(st, c.items);
    takeFood(st, food);
  }
  h.buildingUntil = st.minutes + FLOOR_MINUTES;
  return null;
}

export const residentsOf = (st: GameState, plotId: string): Sponsorship[] => st.sponsored.filter((s) => s.home === plotId);
/** Everyone living in a home: the people you sponsor there and the staff you house there. */
export const occupantsOf = (st: GameState, plotId: string): number => residentsOf(st, plotId).length + st.hires.filter((h) => h.home === plotId && st.minutes < h.paidUntil).length;

/** Invite someone you sponsor to live in a home you own (if it has room). */
export function takeHome(st: GameState, personId: string, plotId: string): string | null {
  const s = sponsorOf(st, personId);
  if (!s) return 'Sponsor them first.';
  if (!ownsHome(st, plotId)) return 'You need a home first.';
  if (s.home === plotId) return null;
  if (occupantsOf(st, plotId) >= homeCapacity(st, plotId)) return 'Your home is full — build another floor to make room.';
  settle(st, s);
  s.home = plotId;
  return null;
}

/** Homes the travellers own (plot ids), for choosing where someone lives. */
export const ownedHomes = (st: GameState): string[] => Object.keys(st.plots).filter((id) => ownsHome(st, id));
