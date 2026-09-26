/**
 * Atlas schema — the continent of Safar as data (OPUS_002 proposal for Codex integration).
 *
 * All coordinates in this data are KILOMETRES, x = east, z = south, Wanderers' Meadow at (0, 0).
 * `km()` converts to world metres. Source: docs/research/map-design.md §2–3.
 * Self-contained on purpose: nothing here imports rendering code.
 */

export type LandId =
  | 'meadow' | 'japan' | 'korea' | 'china' | 'norway' | 'switzerland' | 'london' | 'newyork'
  | 'renaissance' | 'vintage' | 'islamic' | 'middleeast' | 'desert' | 'egypt' | 'indianorth'
  | 'indiasouth' | 'mughal' | 'indonesia' | 'aurora' | 'skyisles';

/** 1 = the full ~13 × 10 km continent. Everything scales linearly. */
export const WORLD_SCALE = 1;
export const km = (v: number) => v * 1000 * WORLD_SCALE;

export type Pt = [number, number];

export interface CityDef {
  id: LandId;
  name: string;
  x: number;
  z: number;
  /** Flattened, built footprint (metres). */
  radius: number;
  /** World height of the city core (metres). */
  coreY: number;
  /** Hill amplitude of the countryside around the city (metres). */
  relief: number;
  terrain: string;
  districts: string[];
  landmarkHeight: number;
}

export type RangeCharacter = 'alpine' | 'fells' | 'crags' | 'karst' | 'volcano' | 'needles' | 'ridge' | 'hills' | 'dunes' | 'sandstone';

export interface RangeDef {
  id: string;
  name: string;
  crest: Pt[];
  /** Half-width at the base (metres). */
  width: number;
  /** Peak height above the surrounding land (metres). */
  height: number;
  character: RangeCharacter;
}

export interface RiverDef {
  id: string;
  name: string;
  /** Source → mouth. */
  path: Pt[];
  /** Channel width (metres). */
  width: number;
}

export interface LakeDef {
  id: string;
  name: string;
  outline: Pt[];
  /** Salt flats and frozen lakes are walkable surfaces. Sea-level water joins the ocean. */
  surface: 'water' | 'salt' | 'ice';
  /** Surface height (metres). Sea-connected water uses 'sea'. */
  level: number | 'sea';
}

export type SightingKind =
  | 'waterfall' | 'falls-valley' | 'lake' | 'frozen-lake' | 'glacier' | 'iceberg-lagoon' | 'geyser'
  | 'hot-springs' | 'sea-stacks' | 'sea-arch' | 'cliffs' | 'volcano' | 'crater' | 'terraces'
  | 'blossom-grove' | 'autumn-gorge' | 'karst' | 'bamboo-forest' | 'mangrove' | 'dunes'
  | 'salt-flat' | 'oasis' | 'rock-arch' | 'canyon' | 'lotus-lake' | 'flower-field' | 'cypress-hills'
  | 'quarry' | 'lighthouse' | 'bridge' | 'viewpoint' | 'herd' | 'windmills' | 'palm-coast'
  | 'backwaters' | 'pillars' | 'forest' | 'marsh' | 'meadow' | 'aurora-sky' | 'stepwell';

/** Sightings that legitimately stand in or over water. */
export const WATER_SIGHTINGS: readonly SightingKind[] = ['sea-stacks', 'sea-arch', 'iceberg-lagoon', 'bridge', 'backwaters', 'mangrove', 'marsh', 'lake', 'lotus-lake', 'palm-coast', 'lighthouse', 'salt-flat', 'frozen-lake', 'oasis', 'crater', 'waterfall', 'viewpoint'];

export interface SightingDef {
  id: string;
  name: string;
  kind: SightingKind;
  /** Along the segment, 0 = `from`, 1 = `to`. */
  t: number;
  /** -1 left, 1 right (facing from → to), 0 on/over the road. */
  side: -1 | 0 | 1;
  /** Distance from the road centreline (metres). */
  offset: number;
  variant?: string;
  blurb: string;
}

export type SettlementKind =
  | 'cottages' | 'hut-camp' | 'tent-camp' | 'fishing' | 'monastery' | 'caravanserai' | 'farm-village'
  | 'turf-hamlet' | 'lighthouse' | 'hot-spring' | 'stilt-village' | 'kasbah' | 'river-village'
  | 'oasis-camp' | 'mountain-village' | 'weavers' | 'orchard';

export type BeaconKind = 'smoke' | 'lanterns' | 'rainbow' | 'aurora-dome' | 'windmill' | 'fire' | 'lighthouse' | 'bells';

export interface SettlementDef {
  id: string;
  name: string;
  kind: SettlementKind;
  /** Whose architecture it borrows. */
  style: LandId;
  /** Where its branch road leaves the highway. */
  t: number;
  side: -1 | 1;
  /** Branch road length (metres). */
  distance: number;
  beacon: BeaconKind;
  blurb: string;
}

export interface SegmentDef {
  id: number;
  name: string;
  from: LandId;
  to: LandId;
  /** H = highway, S = scenic mountain pass road. */
  cls: 'H' | 'S';
  via: Pt[];
  terrain: string;
  sightings: SightingDef[];
  settlements: SettlementDef[];
}

export interface Continent {
  coast: Pt[];
  islands: Array<{ name: string; outline: Pt[] }>;
  lakes: LakeDef[];
  ranges: RangeDef[];
  rivers: RiverDef[];
  cities: CityDef[];
  segments: SegmentDef[];
}
