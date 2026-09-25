import type { RegionId } from './regions';

/**
 * The continent of Safar, as data. Every coordinate here is in KILOMETRES, x = east, z = south,
 * with Wanderers' Meadow at (0, 0). `km()` converts to world metres (× WORLD_SCALE × 1000).
 * Source: docs/research/map-design.md §2–3. The engine (terrain, roads, sites) reads only this.
 */

/** Shrink or grow the whole world without touching the data. 1 = the full ~13 × 10 km continent. */
export const WORLD_SCALE = 1;
export const km = (v: number) => v * 1000 * WORLD_SCALE;

export type Pt = [number, number]; // [x, z] in km

export interface CityDef {
  id: RegionId;
  x: number;
  z: number;
  /** Flattened built footprint, metres. */
  radius: number;
  /** World height of the city core, metres. */
  coreY: number;
  /** Hill amplitude of the countryside around the city, metres. */
  relief: number;
  terrain: string;
  districts: string[];
  landmarkHeight: number;
}

export type RangeCharacter = 'alpine' | 'fells' | 'crags' | 'karst' | 'volcano' | 'needles' | 'ridge' | 'hills' | 'dunes' | 'sandstone';

export interface RangeDef {
  id: string;
  name: string;
  /** Crest line, km. */
  crest: Pt[];
  /** Half-width of the range at its base, metres. */
  width: number;
  /** Peak height above the surrounding land, metres. */
  height: number;
  character: RangeCharacter;
}

export interface RiverDef {
  id: string;
  name: string;
  /** Source → mouth, km. */
  path: Pt[];
  /** Channel width, metres. */
  width: number;
}

export interface LakeDef {
  id: string;
  name: string;
  /** Closed outline, km (clockwise or not). */
  outline: Pt[];
  /** Salt flats and frozen lakes are walkable surfaces, not water. */
  surface: 'water' | 'salt' | 'ice';
}

export type SightingKind =
  | 'waterfall' | 'falls-valley' | 'lake' | 'frozen-lake' | 'glacier' | 'iceberg-lagoon' | 'geyser'
  | 'hot-springs' | 'sea-stacks' | 'sea-arch' | 'cliffs' | 'volcano' | 'crater' | 'terraces'
  | 'blossom-grove' | 'autumn-gorge' | 'karst' | 'bamboo-forest' | 'mangrove' | 'dunes'
  | 'salt-flat' | 'oasis' | 'rock-arch' | 'canyon' | 'lotus-lake' | 'flower-field' | 'cypress-hills'
  | 'quarry' | 'lighthouse' | 'bridge' | 'viewpoint' | 'herd' | 'windmills' | 'standing-stones'
  | 'palm-coast' | 'backwaters' | 'pillars' | 'forest' | 'marsh' | 'meadow' | 'aurora-sky' | 'ruins';

export interface SightingDef {
  id: string;
  name: string;
  kind: SightingKind;
  /** Position along the segment's road, 0 = `from` city, 1 = `to` city. */
  t: number;
  /** Which side of the road: -1 left, 1 right (facing from → to), 0 = on/over the road. */
  side: -1 | 0 | 1;
  /** Distance from the road centreline, metres. */
  offset: number;
  /** Free-form flavour for the builder: colours, flora, e.g. 'lavender', 'tea', 'rice', 'cherry'. */
  variant?: string;
  blurb: string;
}

export type SettlementKind =
  | 'cottages' | 'hut-camp' | 'tent-camp' | 'fishing' | 'monastery' | 'caravanserai' | 'farm-village'
  | 'turf-hamlet' | 'lighthouse' | 'hot-spring' | 'stilt-village' | 'kasbah' | 'river-village'
  | 'oasis-camp' | 'mountain-village' | 'weavers' | 'orchard' | 'rest-stop';

export type BeaconKind = 'smoke' | 'lanterns' | 'rainbow' | 'aurora-dome' | 'windmill' | 'fire' | 'lighthouse' | 'bells';

export interface SettlementDef {
  id: string;
  name: string;
  kind: SettlementKind;
  /** Which land's architecture its buildings borrow. */
  style: RegionId;
  /** Where the branch road leaves the highway (0..1 along the segment). */
  t: number;
  side: -1 | 1;
  /** Length of the branch road, metres. */
  distance: number;
  beacon: BeaconKind;
  blurb: string;
}

export interface SegmentDef {
  id: number;
  name: string;
  from: RegionId;
  to: RegionId;
  cls: 'H' | 'S';
  /** Intermediate control points (km) that route the road around ranges, along coasts, over passes. */
  via: Pt[];
  /** Parts of the road that are a bridge over water (0..1 ranges along the segment). */
  bridges?: Array<[number, number]>;
  terrain: string;
  sightings: SightingDef[];
  settlements: SettlementDef[];
}

export interface Geography {
  /** Outline of the continent's coast, km, closed. Everything outside is ocean. */
  coast: Pt[];
  /** Islands (e.g. the Nusa archipelago, harbour islands), each a closed outline in km. */
  islands: Pt[][];
  /** Inland seas and lakes (the Middle Sea, Mirror Lake, fjord arms…). */
  lakes: LakeDef[];
  ranges: RangeDef[];
  rivers: RiverDef[];
  cities: CityDef[];
  segments: SegmentDef[];
}
