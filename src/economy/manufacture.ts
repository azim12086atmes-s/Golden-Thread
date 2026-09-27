import { bonus } from './inventions';
import { DAY_MINUTES, type GameState } from '../core/state';
import { INSTITUTE_BY_KIND, type InstituteKind } from '../institutions/catalogue';
import { SITE_BY_ID, instituteAt, landScience, standingStage } from '../institutions/institutions';
import { TOPICS, type Topic } from '../institutions/research';
import { REGION_BY_ID, REGIONS, type RegionId } from '../world/regions';
import { techBonus } from './business';
import { hasItems, removeItems } from './economy';
import { ITEMS } from './items';

/**
 * Manufacturing the inventions of your theses (institutions/research.ts). Each invention can be
 * made — at a workshop in an institute you founded of its science (free), or on a rented bench at
 * the town's own institute of that science — from its land's materials, a few hours a batch, and
 * sold at any market. Each is wanted most where its use is: the solar still in the deserts, the
 * cold-proof escapement in the snow, the herbal cough syrup where winters bite. Like everything
 * sold, a market fills as you sell (the glut fades a fifth a day). Pure rules (tests/manufacture.test.ts).
 */
export interface Product { invention: string; topic: Topic; value: number; needs: Record<string, number>; hours: number; wantedIn: RegionId[] }

/** Where each science's inventions are most wanted. */
const WANTED: Partial<Record<InstituteKind, RegionId[]>> = {
  magic: ['meadow', 'skyisles', 'vintage'], lightcraft: ['skyisles', 'aurora', 'islamic'],
  tea: ['japan', 'korea', 'china'], celadon: ['korea', 'china', 'renaissance'], tcm: ['china', 'aurora', 'norway'],
  shipwright: ['norway', 'indonesia', 'indiasouth'], watchmaking: ['switzerland', 'london', 'newyork'],
  engineering: ['london', 'egypt', 'mughal'], tech: ['newyork', 'japan', 'korea'], anatomy: ['renaissance', 'islamic', 'london'],
  radio: ['vintage', 'aurora', 'desert'], islamicsciences: ['islamic', 'middleeast', 'egypt'], navigation: ['middleeast', 'norway', 'desert'],
  irrigation: ['egypt', 'indianorth', 'mughal'], starlore: ['desert', 'middleeast', 'egypt'], ayurveda: ['indianorth', 'indiasouth', 'meadow'],
  siddha: ['indiasouth', 'indonesia', 'china'], gardens: ['mughal', 'islamic', 'renaissance'], subak: ['indonesia', 'indiasouth', 'japan'],
  polar: ['aurora', 'norway', 'switzerland'],
};

export const PRODUCTS: Product[] = TOPICS.map((t, i) => {
  const land = (Object.keys(REGION_BY_ID) as RegionId[]).find((r) => landScience(r) === t.science) ?? 'meadow';
  const [m1, m2] = REGION_BY_ID[land].materials;
  return { invention: t.invention, topic: t, value: 36 + (i % 5) * 8, needs: { [m1]: 2, ...(m2 ? { [m2]: 1 } : {}) }, hours: 3, wantedIn: WANTED[t.science] ?? [land] };
});
export const PRODUCT_BY_INVENTION: Record<string, Product> = Object.fromEntries(PRODUCTS.map((p) => [p.invention, p]));

/** The rent for a bench at a town's institute; nothing at your own. */
export const BENCH_FEE = 15;

/** Where an invention can be made at a site: 'own' (your institute of its science), 'bench' (the town's), or null. */
export function workshopAt(st: GameState, invention: string, siteId: string): 'own' | 'bench' | null {
  const p = PRODUCT_BY_INVENTION[invention], site = SITE_BY_ID[siteId];
  if (!p || !site) return null;
  const inst = instituteAt(st, siteId);
  if (inst && inst.kind === p.topic.science && standingStage(st, inst) >= 1) return 'own';
  if (site.established && landScience(site.land) === p.topic.science) return 'bench';
  return null;
}

/** Make `n` of an invention at a site: its materials, a few hours a batch, and a bench's rent if not your own. */
export function manufacture(st: GameState, invention: string, siteId: string, n = 1): string | null {
  const p = PRODUCT_BY_INVENTION[invention];
  if (!p || !st.inventions.includes(invention)) return 'You have not invented that yet — finish a thesis first.';
  const where = workshopAt(st, invention, siteId);
  if (!where) return `The ${p.invention} is made at an institute of ${INSTITUTE_BY_KIND[p.topic.science].name}.`;
  const needs = Object.fromEntries(Object.entries(p.needs).map(([k, v]) => [k, v * n]));
  if (!hasItems(st, needs)) return `A batch of ${n} needs ${Object.entries(needs).map(([k, v]) => `${v}× ${ITEMS[k]?.name ?? k}`).join(' and ')}.`;
  const fee = where === 'own' ? 0 : BENCH_FEE;
  if (st.coins < fee) return `The bench costs ${fee} coins.`;
  removeItems(st, needs);
  st.coins -= fee;
  st.minutes += p.hours * 60 * Math.min(n, 3);
  st.products[invention] = (st.products[invention] ?? 0) + n;
  return null;
}

const glutKey = (inv: string) => `prod:${inv}`;
function glut(st: GameState, land: RegionId, inv: string): number {
  const g = st.glut[land]?.[glutKey(inv)];
  return g ? g.n * Math.pow(0.8, (st.minutes - g.at) / DAY_MINUTES) : 0;
}

/** What a land's market pays for one of your products today. */
export function productPrice(st: GameState, invention: string, land: RegionId): number {
  const p = PRODUCT_BY_INVENTION[invention];
  if (!p) return 0;
  const wanted = p.wantedIn.includes(land) ? 1.8 : 1;
  // A tech company of yours markets them better (business.ts).
  return Math.max(1, Math.round((p.value * wanted * (1 + techBonus(st) + bonus(st, 'craft'))) / (1 + glut(st, land, invention) / 12)));
}

/** Sell one of your products here. Returns the coins, or 0 if you have none. */
export function sellProduct(st: GameState, invention: string, land: RegionId): number {
  if (!(st.products[invention] > 0)) return 0;
  const price = productPrice(st, invention, land);
  st.products[invention]--;
  st.coins += price;
  (st.glut[land] ??= {})[glutKey(invention)] = { n: glut(st, land, invention) + 1, at: st.minutes };
  return price;
}

/** The best markets for a product today (for the UI). */
export const bestMarkets = (st: GameState, invention: string): Array<{ land: RegionId; price: number }> =>
  REGIONS.map((r) => ({ land: r.id, price: productPrice(st, invention, r.id) })).sort((a, b) => b.price - a.price).slice(0, 3);
