import { fusionOutfits } from '../fusion/fusion';
import type { Outfit } from './modesty';
import { OUTFITS } from './outfits';

/**
 * The full wardrobe: the researched outfits plus the permutation fusions (fx-g-N / fx-b-N).
 * Fusions register into OUTFITS so saved choices resolve like any other outfit. Their ids are
 * deterministic (fixed seed), so a save that wears one keeps wearing the same one.
 */
export const FUSION: Record<string, Outfit> = fusionOutfits(24);
Object.assign(OUTFITS, FUSION);

export type DressGroup = 'all' | 'east' | 'south' | 'west-asia' | 'europe' | 'fantasy' | 'fusion';

export const DRESS_GROUPS: Array<[DressGroup, string]> = [
  ['all', 'All'],
  ['east', 'East Asia'],
  ['south', 'South & SE Asia'],
  ['west-asia', 'Middle East & Africa'],
  ['europe', 'Europe & Americas'],
  ['fantasy', 'Fantasy & Sci-fi'],
  ['fusion', 'Fusion'],
];

const BY_CULTURE: Record<string, DressGroup> = {
  Japan: 'east', Korea: 'east', China: 'east',
  'North India': 'south', 'South India': 'south', Mughal: 'south', 'South Asia': 'south', Indonesia: 'south',
  Egypt: 'west-asia', 'Middle East': 'west-asia', 'Desert Tribes': 'west-asia', Persia: 'west-asia', Morocco: 'west-asia',
  Levant: 'west-asia', Ottoman: 'west-asia', 'Central Asia': 'west-asia', Andalusia: 'west-asia',
  Fantasy: 'fantasy', 'Sci-fi': 'fantasy',
};

/** Which shelf of the dressing room an outfit sits on. */
export function dressGroup(o: Outfit): DressGroup {
  if (o.id.startsWith('fx-')) return 'fusion';
  const c = o.culture.split(' · ')[0];
  return BY_CULTURE[c] ?? 'europe';
}
