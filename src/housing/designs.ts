import type { GameState, PlacedDecor } from '../core/state';
import { Rng } from '../core/rng';
import { count, removeItems } from '../economy/economy';
import { buildHouse } from '../world/architecture';
import { GeoBuilder } from '../world/kit';
import { PLOT_BY_ID } from '../world/plots';
import { REGIONS, REGION_BY_ID, type RegionId } from '../world/regions';
import { HOUSE_NAME } from './HouseInterior';

/**
 * Build any house in the world on your land (owner, 2026-09-30: "give the ability to build any
 * house from the game that begins with a base level and can be updated"). Every kind of house the
 * lands build — the machiya and the minka, the hanok, the courtyard hall, the Bryggen house, the
 * chalet, the terraced house and the mews cottage, the palazzo, the Painted Lady, the riad, the
 * Nubian house, the Kerala home, the havelis, the Bedouin tent, the igloo and the lavvu, the
 * cloud cottages of the Sky Isles, New Yonder's brownstones and lofts — is in the catalogue, and
 * any of them can stand on land you own in any land.
 *
 * A house begins as its bare shell (level 1) and grows as you improve it: finished, with its door
 * step, pots, flower boxes and lanterns (2); a garden, with a stone path to the door, flower beds
 * and a low fence (3); and lit for the evening, lamps along the path and lights along the eaves
 * (4). Storeys are built on top separately (charity/charity.ts `buildFloor`).
 *
 * Pure rules over GameState (tests/designs.test.ts); HousingView draws a house by its design and level.
 */

export interface HouseDesign {
  /** `land:seed` — the house its land builds from this seed. */
  id: string;
  land: RegionId;
  seed: string;
  /** Its kind (the name at its door), where the builder names one. */
  kind?: string;
  name: string;
  /** Footprint radius and height (m). */
  r: number;
  h: number;
}

/** A house must fit its plot (30 m square, the house set 5 m back from the middle). */
export const MAX_HOUSE_R = 10;

/** A GeoBuilder that keeps nothing: for learning what a seed builds without building it. */
class Sketch extends GeoBuilder {
  override add(): this { return this; }
}

const cache = new Map<RegionId, HouseDesign[]>();

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const nameOf = (land: RegionId, kind?: string) => {
  const n = kind ? HOUSE_NAME[kind] : undefined;
  return n ? cap(n.replace(/^(a|an) /, '')) : `${REGION_BY_ID[land].name} house`;
};

/** Every different house a land builds (one design for each kind, up to eight), that fits a plot. */
export function designsOf(land: RegionId): HouseDesign[] {
  let list = cache.get(land);
  if (list) return list;
  list = [];
  const seen = new Set<string>();
  const spec = REGION_BY_ID[land];
  for (let i = 0; i < 40 && list.length < 8; i++) {
    const seed = `design:${land}:${i}`;
    const fp = buildHouse({ g: new Sketch(), glow: new Sketch(), rng: new Rng(seed), s: spec }) as { kind?: string; r: number; h: number };
    if (fp.r > MAX_HOUSE_R) continue;
    // Houses without a named kind are told apart by their size.
    const key = fp.kind ?? `~${Math.round(fp.r)}:${Math.round(fp.h / 4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const plain = list.filter((d) => !d.kind).length;
    list.push({ id: `${land}:${seed}`, land, seed, kind: fp.kind, name: fp.kind ? nameOf(land, fp.kind) : `${nameOf(land)}${plain ? ` ${plain + 1}` : ''}`, r: fp.r, h: fp.h });
  }
  cache.set(land, list);
  return list;
}

export function designById(id: string): HouseDesign | undefined {
  const land = id.slice(0, id.indexOf(':')) as RegionId;
  return REGION_BY_ID[land] ? designsOf(land).find((d) => d.id === id) : undefined;
}

/** All the lands whose houses you can choose from. */
export const DESIGN_LANDS: RegionId[] = REGIONS.map((r) => r.id);

export const LEVELS = [
  { level: 1, name: 'The shell', does: 'Walls, roof and door — a home to begin with.' },
  { level: 2, name: 'Finished', does: 'A door step, pots by the door, flower boxes and a lantern.' },
  { level: 3, name: 'The garden', does: 'A stone path to the door, flower beds either side and a low fence.' },
  { level: 4, name: 'Lit for the evening', does: 'Lamps along the path and lights along the eaves.' },
] as const;
export const MAX_LEVEL = LEVELS.length;

/** What building a design costs: builders' wages by its size, and timber. */
export function buildCost(d: HouseDesign): { coins: number; wood: number } {
  return { coins: 100 + Math.round(d.r * 8 + d.h * 2), wood: 6 };
}

/** What raising a house to `level` costs. */
export function upgradeCost(level: number): { coins: number; wood: number } {
  return level === 2 ? { coins: 70, wood: 3 } : level === 3 ? { coins: 110, wood: 4 } : { coins: 150, wood: 2 };
}

/** The house on a plot, if any. */
export const houseOn = (st: GameState, plotId: string): PlacedDecor | undefined => st.plots[plotId]?.decor.find((d) => d.kind.startsWith('house-'));

/** A house's level (homes from before levels are finished homes, level 2). */
export const levelOf = (d: PlacedDecor): number => d.level ?? 2;

/** The design a house was built from (a home bought ready-made has its land's house). */
export function designOf(d: PlacedDecor): HouseDesign | undefined {
  return d.design ? designById(d.design) : undefined;
}

/**
 * Build a design on a plot you own: it begins as its shell (level 1). A house already standing
 * there is taken down first (its storeys stay, and are built onto the new house).
 */
export function buildDesign(st: GameState, plotId: string, designId: string): string | null {
  const plot = st.plots[plotId], site = PLOT_BY_ID[plotId], d = designById(designId);
  if (!plot || !site) return 'Buy the land first.';
  if (!d) return 'Unknown design.';
  const cost = buildCost(d);
  if (st.coins < cost.coins) return `You need ${cost.coins} coins.`;
  if (count(st, 'wood') < cost.wood) return `You need ${cost.wood} wood.`;
  removeItems(st, { wood: cost.wood });
  st.coins -= cost.coins;
  const old = houseOn(st, plotId);
  if (old) plot.decor.splice(plot.decor.indexOf(old), 1);
  // Nothing else on the plot may stand where the house goes.
  plot.decor = plot.decor.filter((o) => Math.hypot(o.x - 0, o.z + 5) > d.r + 1);
  plot.decor.push({ id: `house-${d.land}-${Date.now().toString(36)}`, kind: `house-${d.land}`, x: 0, z: -5, rot: 0, design: d.id, level: 1 });
  return null;
}

/** Improve the house on a plot by one level. */
export function upgradeHouse(st: GameState, plotId: string): string | null {
  const h = houseOn(st, plotId);
  if (!h) return 'There is no house here yet.';
  const next = levelOf(h) + 1;
  if (next > MAX_LEVEL) return 'This house is as fine as it can be.';
  const cost = upgradeCost(next);
  if (st.coins < cost.coins) return `You need ${cost.coins} coins.`;
  if (count(st, 'wood') < cost.wood) return `You need ${cost.wood} wood.`;
  removeItems(st, { wood: cost.wood });
  st.coins -= cost.coins;
  h.level = next;
  return null;
}
