import { floorsOf, ownsHome, residentsOf, sponsorOf } from '../charity/charity';
import { DAY_MINUTES, type GameState } from '../core/state';
import { CROPS } from '../housing/housing';
import { KITCHEN_STAPLES, learnerLevel } from '../institutions/institutions';
import { PLOT_BY_ID } from '../world/plots';
import { REGION_BY_ID } from '../world/regions';
import { VAN_CAP, bagRoom, count, loadOf, removeItems } from './economy';
import { ITEMS } from './items';

/**
 * Where things are kept (owner's brief). The bag holds only so much (economy.ts `BAG_CAP`); the
 * van has a store (limited too) that travels with you; and each home you own has a larder and
 * store room, bigger with every floor. You put things away and take them out when you are there.
 *
 * The people you sponsor who live in a home eat from its store — only what has been brought
 * there, by you or by a courier from your fields. Each day they cook: a prepared dish is a meal,
 * or two of the raw produce cooked into one (one, if they have learnt to cook). A meal is a day of
 * their care; without food the store is empty and they go hungry until you bring some.
 * Pure rules (tests/storage.test.ts).
 */
export const HOME_CAP = 120, HOME_FLOOR_CAP = 60;

/** The van, or a home you own. */
export const storeCap = (st: GameState, id: string): number => (id === 'van' ? VAN_CAP : HOME_CAP + floorsOf(st, id) * HOME_FLOOR_CAP);
export const storeOf = (st: GameState, id: string): Record<string, number> => (st.stores[id] ??= {});
export const storeRoom = (st: GameState, id: string): number => Math.max(0, storeCap(st, id) - loadOf(storeOf(st, id)));
export const storeName = (id: string): string => (id === 'van' ? 'the van' : `your home in ${REGION_BY_ID[PLOT_BY_ID[id]?.region]?.name ?? id}`);
const validStore = (st: GameState, id: string) => id === 'van' || ownsHome(st, id);

/** Put things from the bag into a store. */
export function putAway(st: GameState, id: string, item: string, n = 1): string | null {
  if (!validStore(st, id)) return 'You have no home there.';
  if (count(st, item) < n) return 'You are not carrying that many.';
  if (storeRoom(st, id) < n) return `There is no room left in ${storeName(id)}.`;
  removeItems(st, { [item]: n });
  const s = storeOf(st, id);
  s[item] = (s[item] ?? 0) + n;
  return null;
}

/** Take things from a store into the bag. */
export function takeOut(st: GameState, id: string, item: string, n = 1): string | null {
  const s = storeOf(st, id);
  if ((s[item] ?? 0) < n) return 'There are not that many there.';
  if (bagRoom(st) < n) return 'Your bag is full — put something away first.';
  s[item] -= n;
  if (s[item] <= 0) delete s[item];
  st.inventory[item] = count(st, item) + n;
  return null;
}

/** Raw produce that can be cooked: every field's harvest, every crop, and the kitchen staples. */
const RAW = new Set<string>([...Object.values(CROPS).map((c) => c.out), ...KITCHEN_STAPLES]);
const isRaw = (id: string) => ITEMS[id]?.kind === 'crop' || RAW.has(id);
const isDish = (id: string) => ITEMS[id]?.kind === 'food' && id !== 'feed';
const edible = (id: string) => isDish(id) || isRaw(id);
/** Food in a home's store, counted as meals: prepared dishes one each, raw produce two to a meal. */
export function mealsIn(st: GameState, plotId: string): number {
  const s = st.stores[plotId] ?? {};
  let dishes = 0, raw = 0;
  for (const [k, n] of Object.entries(s)) { if (isDish(k)) dishes += n; else if (isRaw(k)) raw += n; }
  return dishes + Math.floor(raw / 2);
}

/** Take one meal from a home's store for someone: a dish, or raw produce they cook (two, or one if they can cook). */
function eat(st: GameState, plotId: string, personId: string): string | null {
  const s = st.stores[plotId];
  if (!s) return null;
  const dish = Object.keys(s).find((k) => isDish(k) && s[k] > 0);
  const take = (k: string, n: number) => { s[k] -= n; if (s[k] <= 0) delete s[k]; };
  if (dish) { take(dish, 1); return ITEMS[dish].name; }
  const need = learnerLevel(st, personId, 'cooking') >= 2 ? 1 : 2;
  const raw = Object.keys(s).filter((k) => isRaw(k) && s[k] > 0).sort((a, b) => s[b] - s[a]);
  if (raw.reduce((a, k) => a + s[k], 0) < need) return null;
  let left = need;
  const used: string[] = [];
  for (const k of raw) { const n = Math.min(left, s[k]); take(k, n); used.push(ITEMS[k].name.toLowerCase()); left -= n; if (!left) break; }
  return `a meal of ${used.join(' and ')}`;
}

/** Each new day: everyone living in your homes eats from that home's store. */
export function tickHomes(st: GameState): Array<{ text: string }> {
  const out: Array<{ text: string }> = [], d = Math.floor(st.minutes / DAY_MINUTES);
  for (const plotId of Object.keys(st.plots)) {
    if (!ownsHome(st, plotId)) continue;
    const key = `home:${plotId}`;
    if ((st.work.shifts[key] ?? -1) >= d) continue;
    st.work.shifts[key] = d;
    const hungry: string[] = [];
    for (const s of residentsOf(st, plotId)) {
      const ate = eat(st, plotId, s.id);
      // A meal at home is a day of their care.
      if (ate) s.paidUntil = Math.max(s.paidUntil, (d + 1) * DAY_MINUTES);
      else hungry.push(s.id);
    }
    if (hungry.length) out.push({ text: `🍲 There is no food left at ${storeName(plotId)} — ${hungry.length} ${hungry.length > 1 ? 'people go' : 'person goes'} hungry. Bring produce, or send a courier from your fields.` });
  }
  return out;
}

/** Whether someone you sponsor lives in a home (so they eat from its store). */
export const eatsAtHome = (st: GameState, personId: string): string | undefined => sponsorOf(st, personId)?.home;
export { edible };
