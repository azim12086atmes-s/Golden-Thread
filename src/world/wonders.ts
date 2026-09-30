import type { GameState } from '../core/state';
import { direction } from '../guide/objectives';
import { REGIONS, REGION_BY_ID, regionCenter, type RegionId } from './regions';
import { CASTLE_SITE, WATER_Y, terrainHeight } from './terrain';

/**
 * Hidden wonders: one secret place in every land, off the roads, for those who wander. Finding
 * one brings a little light and a few coins, and the journal remembers it. The journal only
 * ever gives a gentle hint — which way from the town, and what to look for.
 */
export type WonderKind = 'glade' | 'spring' | 'overlook' | 'grove' | 'ruin' | 'garden';

export interface WonderDef {
  id: string;
  land: RegionId;
  name: string;
  kind: WonderKind;
  /** What it is, shown once found. */
  story: string;
  /** What to look for, shown before. */
  hint: string;
}

const W = (land: RegionId, name: string, kind: WonderKind, hint: string, story: string): WonderDef =>
  ({ id: `wonder-${land}`, land, name, kind, hint, story });

export const WONDERS: WonderDef[] = [
  W('meadow', 'The Moonflower Ring', 'glade', 'A ring of pale flowers that only opens for travellers.', 'Grandmother Sarvatara says whoever finds it will never be lonely on the road.'),
  W('japan', 'The Hidden Hot Spring', 'spring', 'Steam rising among the pines, away from the town.', 'Warm water, cold air and a stone seat for two, a respectful step apart.'),
  W('korea', 'The Pavilion of Clear Wind', 'overlook', 'A high place where poets once wrote about the valley.', 'Someone has left a brush and ink, and a poem with half its lines still blank.'),
  W('china', 'The Bamboo Whispering Grove', 'grove', 'Where the bamboo is tallest, listen.', 'The wind in the stalks sounds like people laughing at a shared meal.'),
  W('norway', 'The Fjord Lookout', 'overlook', 'The cliff where fishermen wait for the boats to come home.', 'On a clear day you can see every lantern you have lit.'),
  W('switzerland', 'The Edelweiss Meadow', 'garden', 'The highest flowers grow where the snow has just melted.', 'Anneli picks one here each spring for whoever needs cheering most.'),
  W('london', 'The Secret Garden Square', 'garden', 'A walled garden that nobody seems to own.', 'Everybody tends it a little, and nobody takes the credit.'),
  W('newyork', 'The Rooftop Orchard', 'grove', 'Apple trees where you would least expect them.', 'Planted by the neighbours of three streets, for anyone who is hungry.'),
  W('renaissance', 'The Forgotten Frescoes', 'ruin', 'An old chapel ruin, open to the sky.', 'The painted birds on its walls are still bright after five hundred years.'),
  W('vintage', 'The Music Box Glade', 'glade', 'Follow the tinkling melody out of town.', 'A carousel horse, long retired, grazes here among the clover.'),
  W('islamic', 'The Garden of the Quiet Fountain', 'spring', 'Water that sings very softly, beyond the orange groves.', 'A place to sit, be grateful and say thank you for the day.'),
  W('middleeast', 'The Star-Reader\'s Terrace', 'overlook', 'Where the old astronomers mapped the night.', 'Their stone circle still points to the brightest stars.'),
  W('desert', 'The Singing Oasis', 'spring', 'Palms in a hollow of the dunes.', 'The sand here hums when the wind blows. Travellers leave water for the next ones.'),
  W('egypt', 'The Reed Library', 'ruin', 'Old walls among the reeds by the river.', 'Scrolls were once copied here for anyone who wished to read.'),
  W('indianorth', 'The Stepwell of Echoes', 'ruin', 'Steps that lead down to cool water.', 'Your voice comes back kinder than you sent it.'),
  W('indiasouth', 'The Lotus Lagoon', 'spring', 'A still pool deep in the palms.', 'Lotuses open at dawn. Children float paper boats with wishes on them.'),
  W('mughal', 'The Moonlit Pavilion', 'garden', 'A white pavilion in a garden gone wild.', 'Built by someone who wanted a place to watch the moon with the whole family.'),
  W('indonesia', 'The Waterfall Terrace', 'spring', 'Follow the sound of falling water up the hill.', 'The farmers rest here at noon and share their lunch with whoever comes.'),
  W('aurora', 'The Ice Cave of Colours', 'glade', 'Where the aurora seems to touch the ground.', 'The ice holds the northern lights all day long.'),
];

export const WONDER_BY_ID = Object.fromEntries(WONDERS.map((w) => [w.id, w])) as Record<string, WonderDef>;

/** How close you must come to find one. */
export const FIND_RADIUS = 9;

const cache = new Map<string, { x: number; z: number }>();

/**
 * Where a land's wonder lies: out in the hills beyond the town (270–310 m from its centre), on
 * dry ground and away from the castle grounds. Deterministic per land.
 */
export function wonderPos(w: WonderDef): { x: number; z: number } {
  const hit = cache.get(w.id);
  if (hit) return hit;
  const c = regionCenter(REGION_BY_ID[w.land]);
  const i = REGIONS.findIndex((r) => r.id === w.land);
  let best = { x: c.x + 290, z: c.z }, bestH = -Infinity;
  for (let k = 0; k < 24; k++) {
    const a = i * 2.39 + k * (Math.PI / 12);
    for (const r of [290, 270, 310]) {
      const x = c.x + Math.cos(a) * r, z = c.z + Math.sin(a) * r;
      if (Math.hypot(x - CASTLE_SITE.x, z - CASTLE_SITE.z) < CASTLE_SITE.r + 40) continue;
      const h = terrainHeight(x, z);
      if (h > WATER_Y + 1 && h < 60) { best = { x, z }; cache.set(w.id, best); return best; }
      if (h > bestH) { bestH = h; best = { x, z }; }
    }
  }
  cache.set(w.id, best);
  return best;
}

export const foundWonder = (st: GameState, id: string) => st.flags.includes(id);

/** "North-east of the town, out in the hills" — the only help the journal gives. */
export function wonderHint(w: WonderDef): string {
  const c = regionCenter(REGION_BY_ID[w.land]);
  return `${w.hint} Look ${direction(c, wonderPos(w))} of the town, out beyond the ring road.`;
}
