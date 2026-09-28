import type { RegionId } from './regions';

/**
 * The living air of each land, beyond its drifting particles (locale.ts) — what Atmos.ts draws:
 *
 *  - butterflies by day over the grass and flowers, in the land's own kinds (monarchs in Maple
 *    Row, blue morphos and birdwings in Nusa Rinjani, cabbage whites in London);
 *  - dragonflies darting over its waters by day;
 *  - fireflies blinking low over the grass after dusk (the hotaru of Sakura Hollow, the lucciole
 *    of Firenzia), and in the Sky Isles glowing spores rising slowly into the night;
 *  - smoke from its chimneys, smoke-holes and tent fires: morning and evening, and all day in
 *    the cold lands;
 *  - ground mist lying in the hollows and over the water at dawn (the London fog, the fjords,
 *    the misty tea terraces), a little at night where the land is damp;
 *  - sunbeams slanting through the air at the golden hours in the wooded lands.
 *
 * Every weight is 0..1; the times of day are the game's hours.
 */
export interface AtmosSpec {
  /** Wing colours of the land's butterflies, and how many (0..1 of the most). */
  butterflies?: { colors: string[]; share: number };
  /** Dragonfly body colours, if they dart over this land's waters. */
  dragonflies?: string[];
  /** Firefly colour, if they blink here after dusk. */
  fireflies?: string;
  /** Colours of the spores rising at night (the Sky Isles). */
  spores?: string[];
  /** 'cold': chimneys smoke all day; 'hearth': mornings and evenings. */
  smoke?: 'cold' | 'hearth';
  /** How thick the dawn ground mist lies (0 none). */
  mist?: number;
  /** How strong the golden-hour sunbeams are (0 none). */
  beams?: number;
}

const WHITE = '#ffffff', LEMON = '#f2d14e', ORANGE = '#f2a13a';

export const ATMOS: Record<RegionId, AtmosSpec> = {
  aurora: { smoke: 'cold', mist: 0.4 },
  norway: { butterflies: { colors: [WHITE, LEMON], share: 0.5 }, dragonflies: ['#3a7ad9', '#2f9a8a'], smoke: 'cold', mist: 0.8, beams: 0.6 },
  switzerland: { butterflies: { colors: ['#3f7fd9', WHITE, ORANGE], share: 0.8 }, fireflies: '#d9ff8a', smoke: 'cold', mist: 0.6, beams: 0.8 },
  london: { butterflies: { colors: [WHITE, LEMON], share: 0.5 }, dragonflies: ['#3a7ad9'], smoke: 'hearth', mist: 0.9, beams: 0.5 },
  newyork: { butterflies: { colors: [ORANGE], share: 0.3 }, beams: 0.3 },
  korea: { butterflies: { colors: [LEMON, WHITE, '#3a3a44'], share: 0.7 }, dragonflies: ['#d9402a', '#e8702a'], fireflies: '#c8ff7a', mist: 0.7, beams: 0.7 },
  japan: { butterflies: { colors: [WHITE, LEMON, '#2a2a3a'], share: 0.7 }, dragonflies: ['#d9402a', '#3a7ad9'], fireflies: '#c8ff7a', mist: 0.5, beams: 0.8 },
  meadow: { butterflies: { colors: ['#ff8fb8', '#9fd4ff', '#ffd966', '#b58ad9', WHITE], share: 1 }, dragonflies: ['#3fb6c9', '#b58ad9'], smoke: 'hearth', mist: 0.4, beams: 0.9 },
  renaissance: { butterflies: { colors: [LEMON, WHITE, ORANGE], share: 0.7 }, fireflies: '#e8ff8a', smoke: 'hearth', mist: 0.3, beams: 0.8 },
  vintage: { butterflies: { colors: [ORANGE, ORANGE, LEMON], share: 0.7 }, dragonflies: ['#3fb6c9'], fireflies: '#e8ff6a', smoke: 'hearth', beams: 0.7 },
  china: { butterflies: { colors: ['#3a8ad9', WHITE, LEMON], share: 0.8 }, dragonflies: ['#d9402a', '#2f9a8a'], fireflies: '#c8ff7a', mist: 0.9, beams: 0.8 },
  indonesia: { butterflies: { colors: ['#2fd9a8', '#3a5ad9', ORANGE], share: 1 }, dragonflies: ['#d9402a', '#3fb6c9'], mist: 0.8, beams: 0.9 },
  skyisles: { butterflies: { colors: ['#ffd6f0', '#b8e6ff', '#fff4c0'], share: 0.6 }, spores: ['#ffd6f0', '#b8a4ff', '#fff0b0', '#b8fff0'] },
  islamic: { butterflies: { colors: [WHITE, LEMON], share: 0.5 }, dragonflies: ['#3fb6c9'], beams: 0.4 },
  middleeast: {},
  indiasouth: { butterflies: { colors: ['#2f6fd9', ORANGE, WHITE], share: 0.9 }, dragonflies: ['#d9402a', '#3fb6c9'], mist: 0.6, beams: 0.8 },
  indianorth: { butterflies: { colors: [ORANGE, LEMON], share: 0.4 } },
  mughal: { butterflies: { colors: [WHITE, LEMON, ORANGE], share: 0.8 }, dragonflies: ['#3fb6c9', '#d9402a'], fireflies: '#d8ff8a', mist: 0.3, beams: 0.5 },
  egypt: { butterflies: { colors: [ORANGE], share: 0.3 }, dragonflies: ['#d9402a', '#3a7ad9'], mist: 0.5 },
  desert: { smoke: 'hearth' },
};

const ss = (x: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Rises from a to b, falls from c to d. */
const bump = (h: number, a: number, b: number, c: number, d: number) => ss(h, a, b) * (1 - ss(h, c, d));

/** The day's weights: how much of each is in the air at hour `h` (0–24) in land `land`. */
export function atmosWeights(land: RegionId, h: number): { flyers: number; fireflies: number; spores: number; smoke: number; mist: number; beams: number } {
  const s = ATMOS[land] ?? {};
  const day = bump(h, 6.5, 8.5, 17.5, 19.5);
  const dark = Math.max(1 - ss(h, 4.5, 6), ss(h, 19.5, 21));
  return {
    flyers: day,
    fireflies: s.fireflies ? Math.max(bump(h, 19, 20.5, 23.5, 24), 1 - ss(h, 0, 1.5)) : 0,
    spores: s.spores ? dark : 0,
    smoke: s.smoke === 'cold' ? 1 : s.smoke === 'hearth' ? Math.max(bump(h, 5.5, 6.5, 8.5, 10), bump(h, 16.5, 18, 22, 23.5)) : 0,
    mist: (s.mist ?? 0) * Math.max(bump(h, 4, 5.5, 7.5, 9.5), dark * 0.35),
    beams: (s.beams ?? 0) * Math.max(bump(h, 6.2, 7, 8, 9.2), bump(h, 16.3, 17.3, 18.4, 19.1)),
  };
}
