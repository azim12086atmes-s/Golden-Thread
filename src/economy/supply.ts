import { DAY_MINUTES, type GameState } from '../core/state';
import { INSTITUTE_BY_KIND } from '../institutions/catalogue';
import { SITE_BY_ID, instituteAt, isEmployed, pantryOf, servesWith } from '../institutions/institutions';
import { hasHarbour } from '../world/harbours';
import { FIELD_BY_ID } from '../world/plots';
import { REGION_BY_ID, REGIONS, type RegionId } from '../world/regions';
import { logisticsBonus } from './business';
import { removeItems, sellPrice } from './economy';
import { ITEMS } from './items';
import { WORKER_BY_ID, type Worker } from './workers';

/**
 * The supply chain (owner's brief — NEXT_WORK C5: "supply chain logic … producers → couriers →
 * markets and institutions … hired delivery workers carrying goods on the traffic vehicles").
 *
 * A route is a standing order: one courier, from one of your fields' barns, to a land's market or
 * to the pantry of a soup kitchen or clinic you run. While the courier is employed they load up to
 * their vehicle's capacity, travel (slower by cart and camel, faster by truck, hover-car or sky
 * ship, and longer the further apart the lands are), deliver, and come back for the next load.
 *
 * Markets fill up: every unit your couriers sell into a land lowers what the next one fetches
 * there, and the glut fades a fifth each day — so it pays to spread goods across the lands, and to
 * carry them where they are wanted and far from where they grow (economy.ts `sellPrice`).
 *
 * Pure rules over GameState (tests/supply.test.ts).
 */
export type Route = GameState['routes'][number];
export type Shipment = GameState['shipments'][number];

/** Where a route delivers: `market:<land>` or `pantry:<site id>`. */
export const marketDest = (land: RegionId) => `market:${land}`;
export const pantryDest = (siteId: string) => `pantry:${siteId}`;

export function destLand(to: string): RegionId | null {
  const [kind, id] = to.split(':');
  if (kind === 'market') return REGION_BY_ID[id as RegionId] ? (id as RegionId) : null;
  if (kind === 'pantry') return SITE_BY_ID[id]?.land ?? null;
  return null;
}

export function destLabel(st: GameState, to: string): string {
  const [kind, id] = to.split(':');
  if (kind === 'market') return `the market in ${REGION_BY_ID[id as RegionId]?.name ?? id}`;
  const inst = instituteAt(st, id), land = SITE_BY_ID[id]?.land;
  return `your ${inst ? INSTITUTE_BY_KIND[inst.kind].stages[Math.max(0, inst.stage)].name.toLowerCase() : 'pantry'} in ${land ? REGION_BY_ID[land].name : id}`;
}

/** How far apart two lands are on the island (in lands). */
export function landDistance(a: RegionId, b: RegionId): number {
  const A = REGION_BY_ID[a], B = REGION_BY_ID[b];
  return Math.hypot(A.col - B.col, A.row - B.row);
}

/** Minutes a courier takes from one land to another: loading and unloading, then the road. */
export const tripMinutes = (w: Worker, from: RegionId, to: RegionId): number =>
  Math.round((w.role === 'ship' ? 240 : 120) + (landDistance(from, to) * 360) / (w.speed ?? 1));

/** How much of an item has been sold into a land lately (fading a fifth a day). */
export function glutOf(st: GameState, land: RegionId, item: string): number {
  const g = st.glut[land]?.[item];
  return g ? g.n * Math.pow(0.8, (st.minutes - g.at) / DAY_MINUTES) : 0;
}

/** What a land's market pays your couriers for one more unit today. */
export function marketPrice(st: GameState, item: string, land: RegionId): number {
  return Math.max(1, Math.round(sellPrice(item, land, REGION_BY_ID[land].wanted) / (1 + glutOf(st, land, item) / 20)));
}

/**
 * Sell one of an item at a land's market yourself. Like the couriers' sales, each one fills the
 * market a little (the next pays less) and the glut fades a fifth a day.
 */
export function sellHere(st: GameState, item: string, land: RegionId): number {
  if (!removeItems(st, { [item]: 1 })) return 0;
  return sellInto(st, land, item, 1);
}

function sellInto(st: GameState, land: RegionId, item: string, n: number): number {
  let coins = 0;
  for (let k = 0; k < n; k++) {
    coins += marketPrice(st, item, land);
    (st.glut[land] ??= {})[item] = { n: glutOf(st, land, item) + 1, at: st.minutes };
  }
  st.coins += coins;
  return coins;
}

/** Set a courier's standing route (one each; a new one replaces the old). */
export function addRoute(st: GameState, courierId: string, from: string, to: string): string | null {
  const w = WORKER_BY_ID[courierId];
  if (!w || (w.role !== 'courier' && w.role !== 'ship')) return 'Only a courier or a ship can carry goods.';
  if (!isEmployed(st, courierId)) return `Employ ${w.name} first.`;
  if (!st.fields[from] || !FIELD_BY_ID[from]) return 'Couriers collect from the barn of a field you own.';
  const land = destLand(to);
  if (!land) return 'There is nowhere like that to deliver.';
  if (w.role === 'ship' && (!hasHarbour(FIELD_BY_ID[from].land) || !hasHarbour(land))) return 'Ships sail from harbour to harbour — both lands must be on the coast.';
  if (to.startsWith('pantry:')) {
    const inst = instituteAt(st, to.slice(7));
    if (!inst || (inst.kind !== 'kitchen' && inst.kind !== 'clinic')) return 'Deliveries go to a soup kitchen or clinic you run.';
  }
  st.routes = st.routes.filter((r) => r.courier !== courierId);
  st.routes.push({ id: `route-${courierId}`, courier: courierId, from, to });
  return null;
}

export function removeRoute(st: GameState, courierId: string): void {
  st.routes = st.routes.filter((r) => r.courier !== courierId);
}

export const shipmentOf = (st: GameState, courierId: string): Shipment | undefined => st.shipments.find((s) => s.courier === courierId);

/** What a load for this destination may hold from the barn: all of it for a market, what it can use for a pantry. */
function usable(st: GameState, to: string, item: string): boolean {
  if (!to.startsWith('pantry:')) return true;
  const inst = instituteAt(st, to.slice(7));
  return !!inst && servesWith(inst.kind, item);
}

export interface SupplyNews { courier: string; text: string }

/** Deliver what has arrived, then send every idle courier off with their next load. */
export function tickSupply(st: GameState): SupplyNews[] {
  const out: SupplyNews[] = [];
  for (const s of st.shipments.filter((x) => st.minutes >= x.arrive)) {
    const w = WORKER_BY_ID[s.courier], land = destLand(s.to);
    const n = Object.values(s.items).reduce((a, b) => a + b, 0);
    const what = Object.entries(s.items).map(([id, k]) => `${k}× ${ITEMS[id]?.name ?? id}`).join(', ');
    if (land && s.to.startsWith('market:')) {
      const coins = Object.entries(s.items).reduce((a, [id, k]) => a + sellInto(st, land, id, k), 0);
      out.push({ courier: s.courier, text: `${w?.name ?? 'Your courier'} sold ${what} at ${destLabel(st, s.to)} for ${coins} coins.` });
    } else if (land) {
      const p = pantryOf(st, s.to.slice(7));
      for (const [id, k] of Object.entries(s.items)) p[id] = (p[id] ?? 0) + k;
      out.push({ courier: s.courier, text: `${w?.name ?? 'Your courier'} stocked ${destLabel(st, s.to)} with ${n} ${n > 1 ? 'goods' : 'good'}: ${what}.` });
    }
  }
  st.shipments = st.shipments.filter((x) => st.minutes < x.arrive);
  for (const r of st.routes) {
    const w = WORKER_BY_ID[r.courier], f = st.fields[r.from], land = destLand(r.to);
    if (!w || !f || !land || shipmentOf(st, r.courier) || !isEmployed(st, r.courier)) continue;
    const items: Record<string, number> = {};
    let room = w.capacity ?? 10;
    for (const [id, k] of Object.entries(f.store)) {
      if (room <= 0 || !usable(st, r.to, id)) continue;
      const take = Math.min(k, room);
      items[id] = take; room -= take;
      f.store[id] -= take;
      if (f.store[id] <= 0) delete f.store[id];
    }
    if (!Object.keys(items).length) continue;
    const from = FIELD_BY_ID[r.from].land;
    // A logistics company of yours speeds every trip (business.ts).
    st.shipments.push({ route: r.id, courier: r.courier, from: r.from, to: r.to, items, left: st.minutes, arrive: st.minutes + Math.round(tripMinutes(w, from, land) * (1 - logisticsBonus(st))) });
  }
  return out;
}

/** Every market a courier can deliver to, with today's price for an item (best first). */
export function bestMarkets(st: GameState, item: string): Array<{ land: RegionId; price: number }> {
  return REGIONS.map((r) => ({ land: r.id, price: marketPrice(st, item, r.id) })).sort((a, b) => b.price - a.price);
}

/** Your couriers on the road in a land — leaving from a field there, or delivering there — for the traffic to show. */
export function couriersIn(st: GameState, land: RegionId): Array<{ vehicle: string; standIn?: string; side: 1 | -1 }> {
  const out: Array<{ vehicle: string; standIn?: string; side: 1 | -1 }> = [];
  for (const s of st.shipments) {
    const f = FIELD_BY_ID[s.from], w = WORKER_BY_ID[s.courier];
    if (!f || !w?.vehicle || (f.land !== land && destLand(s.to) !== land)) continue;
    out.push({ vehicle: w.wants ?? w.vehicle, standIn: w.vehicle, side: f.land === land && f.id.endsWith('-f2') ? -1 : 1 });
  }
  return out;
}
