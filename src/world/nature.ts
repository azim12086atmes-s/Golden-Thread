import type { Flora } from './kit';
import type { RegionId, RegionSpec } from './regions';

/**
 * Nature by terrain: which trees grow where. Every spot outside town is read as a zone — dune
 * crests and slip faces, open sand, bare rocky slopes, snow above the snowline, the alpine band just
 * below it, water's edge, ordinary grassland, or cloud (the Sky Isles) — and each land says which of
 * its species grow in each zone, how thickly, and how large its trees stand. So the desert keeps its
 * dunes bare and its palms round the oases, the north puts snow pines on the heights, and the Sky
 * Isles grow tall fantasy trees rather than tiny ones.
 *
 * Pure data and pure functions; RegionBuilder places the trees, tests/nature.test.ts checks them.
 */

export type Zone = 'dune' | 'sand' | 'rock' | 'snow' | 'alpine' | 'waterside' | 'grass' | 'cloud';
export const ZONES: Zone[] = ['dune', 'sand', 'rock', 'snow', 'alpine', 'waterside', 'grass', 'cloud'];

export interface Growth {
  /** Species that grow in this zone (repeat one to make it commoner). Empty: nothing grows. */
  flora: Flora[];
  /** Chance a candidate spot in this zone gets a tree (0–1). */
  p: number;
}

export interface LandNature {
  zones: Partial<Record<Zone, Growth>>;
  /** Tree size multiplier for the land (deserts and the Sky Isles read small at 1). */
  size: number;
  /** Candidate spots tried outside town (more for lands that should be thick with trees). */
  count: number;
}

const G = (flora: Flora[], p: number): Growth => ({ flora, p });

/** Each land's nature. Zones a land leaves out fall back to its own flora list at full chance. */
export const NATURE: Record<RegionId, LandNature> = {
  desert: { size: 1.55, count: 300, zones: { dune: G(['dragonblood'], 0.05), sand: G(['baobab', 'dragonblood', 'palm'], 0.3), rock: G(['dragonblood', 'baobab'], 0.4), waterside: G(['palm', 'palm', 'coconut'], 1) } },
  egypt: { size: 1.35, count: 320, zones: { dune: G(['palm'], 0.08), sand: G(['palm', 'baobab'], 0.45), rock: G(['dragonblood'], 0.35), waterside: G(['palm', 'palm', 'banana', 'willow'], 1) } },
  middleeast: { size: 1.3, count: 320, zones: { dune: G(['dragonblood'], 0.06), sand: G(['palm', 'olive', 'dragonblood'], 0.5), rock: G(['dragonblood', 'olive'], 0.4), waterside: G(['palm', 'palm'], 1) } },
  aurora: { size: 1.25, count: 360, zones: { snow: G(['snowpine'], 0.75), alpine: G(['snowpine', 'snowpine', 'birch'], 0.7), rock: G(['snowpine'], 0.35), waterside: G(['birch', 'aspen'], 0.8), grass: G(['snowpine', 'birch', 'aspen', 'glowtree'], 0.9) } },
  norway: { size: 1.15, count: 360, zones: { snow: G(['snowpine'], 0.5), alpine: G(['pine', 'snowpine'], 0.7), rock: G(['pine'], 0.45), waterside: G(['birch', 'willow', 'aspen'], 0.9) } },
  switzerland: { size: 1.15, count: 360, zones: { snow: G(['snowpine'], 0.4), alpine: G(['pine', 'pine', 'snowpine'], 0.7), rock: G(['pine'], 0.4), waterside: G(['willow', 'aspen'], 0.9) } },
  skyisles: { size: 1.9, count: 280, zones: { cloud: G(['cloud', 'candy', 'glowtree', 'crystal', 'sakura', 'magnolia', 'wisteria', 'jacaranda'], 1) } },
  indonesia: { size: 1.25, count: 380, zones: { waterside: G(['coconut', 'coconut', 'palm', 'banana'], 1), rock: G(['rainbowgum', 'flame'], 0.6) } },
  indiasouth: { size: 1.2, count: 380, zones: { waterside: G(['coconut', 'coconut', 'palm'], 1) } },
  indianorth: { size: 1.1, count: 320, zones: { sand: G(['palm', 'olive', 'flame'], 0.6), waterside: G(['palm', 'flame'], 1) } },
  mughal: { size: 1.1, count: 340, zones: { waterside: G(['cypress', 'willow', 'orange'], 1) } },
  islamic: { size: 1.1, count: 340, zones: { waterside: G(['palm', 'orange'], 1), rock: G(['olive', 'cypress'], 0.5) } },
  renaissance: { size: 1, count: 340, zones: { rock: G(['cypress', 'olive'], 0.5), waterside: G(['willow', 'olive'], 1) } },
  meadow: { size: 1, count: 340, zones: { waterside: G(['willow', 'birch'], 1) } },
  japan: { size: 1, count: 340, zones: { rock: G(['pine'], 0.6), waterside: G(['willow', 'sakura'], 1) } },
  korea: { size: 1, count: 340, zones: { rock: G(['pine'], 0.6), waterside: G(['willow', 'ginkgo'], 1) } },
  china: { size: 1, count: 340, zones: { rock: G(['pine', 'pine'], 0.6), waterside: G(['willow', 'bamboo'], 1) } },
  london: { size: 1, count: 340, zones: { waterside: G(['willow', 'plane'], 1) } },
  newyork: { size: 1, count: 340, zones: { waterside: G(['willow', 'maple'], 1) } },
  vintage: { size: 1, count: 340, zones: { waterside: G(['willow', 'maple'], 1) } },
};

/** What the ground is like at a spot, from its height, steepness, nearness to water and dunes. */
export function zoneAt(spec: RegionSpec, h: number, slope: number, waterDist: number, dunes: number, crest: number): Zone {
  if (spec.id === 'skyisles') return 'cloud';
  if (waterDist < 14) return 'waterside';
  if (h > spec.snowline) return 'snow';
  if (h > spec.snowline - 14) return 'alpine';
  if (dunes > 0.5) return crest > 0.35 ? 'dune' : 'sand';
  if (slope > 0.45) return 'rock';
  if (dunes > 0.2) return 'sand';
  return 'grass';
}

/** What grows in this zone of this land (falls back to the land's own flora list). */
export function growthFor(spec: RegionSpec, zone: Zone): Growth {
  return NATURE[spec.id].zones[zone] ?? { flora: spec.flora, p: 1 };
}

/** Pick a tree for a spot, or null when nothing grows there (by the zone's chance). */
export function pickTree(spec: RegionSpec, zone: Zone, rnd: () => number): Flora | null {
  const g = growthFor(spec, zone);
  if (!g.flora.length || rnd() > g.p) return null;
  return g.flora[Math.floor(rnd() * g.flora.length) % g.flora.length];
}
