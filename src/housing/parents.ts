import { ownsHome, type Person } from '../charity/charity';
import { DAY_MINUTES, type GameState } from '../core/state';
import { addItem } from '../economy/economy';
import { ITEMS } from '../economy/items';
import { PLOT_BY_ID } from '../world/plots';
import { REGION_BY_ID } from '../world/regions';

/**
 * A home for their parents (owner, 2026-09-30): the travellers can give a home they own to her
 * parents and one to his, and visit them there whenever they pass. Each family has its own home
 * (never the same one), and the travellers can move them to another home they own at any time.
 * A visit is a blessing: once a day, her mother or his sends them off with something she cooked;
 * and while they live in a home of their children's, they write every few days.
 *
 * Pure rules over GameState (tests/parents.test.ts). The homes view seats them in the garden and
 * the house interior; the Homes & land panel gives the home and offers the visit.
 */

export type Whose = 'hers' | 'his';
export const WHOSE: Whose[] = ['hers', 'his'];

/** How the families are called in the game: by the traveller whose parents they are. */
export function familyName(st: GameState, whose: Whose): string {
  return `${whose === 'hers' ? st.names.girl : st.names.boy}'s Ammi and Abbu`;
}

/** What each mother cooks for them when they visit. */
export const HOME_COOKING: Record<Whose, string> = { hers: 'curry', his: 'ricepudding' };
/** Days between their letters. */
export const LETTER_DAYS = 3;

const day = (st: GameState) => Math.floor(st.minutes / DAY_MINUTES);

/** The home a family lives in, if they have one. */
export const parentsHome = (st: GameState, whose: Whose): string | undefined => {
  const id = st.parents[whose];
  return id && ownsHome(st, id) ? id : undefined;
};

/** Who lives in a home: her parents, his, or nobody. */
export const parentsIn = (st: GameState, plotId: string): Whose | null => WHOSE.find((w) => parentsHome(st, w) === plotId) ?? null;

/** Give a home you own to her parents or to his (moving them there if they already had one). */
export function giveToParents(st: GameState, plotId: string, whose: Whose): string | null {
  if (!ownsHome(st, plotId)) return 'Build or buy a home on this land first.';
  const other: Whose = whose === 'hers' ? 'his' : 'hers';
  if (parentsHome(st, other) === plotId) return `${familyName(st, other)} live here — give ${familyName(st, whose)} a home of their own.`;
  st.parents[whose] = plotId;
  return null;
}

/** They move out (the home stays yours). */
export function moveOut(st: GameState, whose: Whose): void {
  delete st.parents[whose];
}

export const visitedToday = (st: GameState, whose: Whose): boolean => (st.parents.visited?.[whose] ?? -1) === day(st);

/**
 * Visit them: returns where they live (to travel there) and, the first visit each day, what the
 * mother sends them off with — added to the bag (or the van, when the bag is full).
 */
export function visit(st: GameState, whose: Whose): { error: string } | { plotId: string; gift: string | null; text: string } {
  const plotId = parentsHome(st, whose);
  if (!plotId) return { error: `${familyName(st, whose)} have no home of yours yet.` };
  const land = REGION_BY_ID[PLOT_BY_ID[plotId].region].name;
  if (visitedToday(st, whose)) return { plotId, gift: null, text: `You sit with ${familyName(st, whose)} in ${land} a while longer.` };
  (st.parents.visited ??= {})[whose] = day(st);
  const gift = HOME_COOKING[whose];
  addItem(st, gift, 2);
  return { plotId, gift, text: `${familyName(st, whose)} are overjoyed to see you both in ${land}. You leave with their duas and 2 × ${ITEMS[gift].name}.` };
}

/** What they write: a few gentle letters, chosen by the day. */
const LETTERS: Record<Whose, string[]> = {
  hers: [
    'We planted jasmine by the door. It already smells like you.',
    'Eat properly, both of you. And send us a photo from the next land.',
    'Your Abbu tells everyone about the lanterns you light. We are proud of you.',
    'The neighbours asked after you today. Come home for a meal soon.',
  ],
  his: [
    'The house is quiet without you. Ammi made your favourite and set two extra plates, just in case.',
    'Look after each other on the road. May every door open for you.',
    'We heard about the people you are helping. That is the best news a parent can hear.',
    'Abbu fixed the garden gate. Come and see it — and stay the night.',
  ],
};

/** Each new day: parents living in a home of yours write every few days. Returns the letters. */
export function tickParents(st: GameState): Array<{ whose: Whose; text: string }> {
  const out: Array<{ whose: Whose; text: string }> = [], d = day(st);
  for (const w of WHOSE) {
    if (!parentsHome(st, w)) continue;
    const key = `parents-letter:${w}`, last = st.work.shifts[key];
    if (last !== undefined && d - last < LETTER_DAYS) continue;
    if (last === undefined) { st.work.shifts[key] = d; continue; } // their first letter comes a few days after moving in
    st.work.shifts[key] = d;
    st.work.shifts[`parents-sent:${w}`] = d;
    const list = LETTERS[w];
    out.push({ whose: w, text: `💌 ${familyName(st, w)}: “${list[d % list.length]}”` });
  }
  return out;
}

/** Her parents or his as the people at home (for the house interior): her or his mother and father, elders. */
export function parentsAsResidents(st: GameState, plotId: string): Person[] {
  const w = parentsIn(st, plotId);
  if (!w) return [];
  const land = w === 'hers' ? 'indianorth' : 'mughal';
  return [
    { id: `parents-${w}-ammi`, land, name: 'Ammi', kind: 'elder', hope: '', learn: 'cooking', who: 'girl' },
    { id: `parents-${w}-abbu`, land, name: 'Abbu', kind: 'elder', hope: '', learn: 'gardening', who: 'boy' },
  ];
}

/** The latest letter they sent (for the home's card). */
export function lastLetter(st: GameState, whose: Whose): string | null {
  const last = st.work.shifts[`parents-sent:${whose}`];
  return last === undefined ? null : LETTERS[whose][last % LETTERS[whose].length];
}
