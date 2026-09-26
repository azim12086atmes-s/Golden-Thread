import type { RegionId } from './regions';

/**
 * Every land's own sky. On top of its sky colours (locale.ts), each land has a few effects that
 * belong to it: Diwali fireworks and Sankranti kites over the North Indian towns, the Milky Way
 * over the desert, searchlights over New York, alpenglow on the Swiss peaks, a crescent over the
 * Middle East, a nebula over the Sky Isles. Wanderers' Meadow, where the castle stands and the
 * celebration is held, has every one of them. Pure data: SkyFX draws it, tests check it.
 */

export type SkyKind =
  /** Soft clouds tinted by the land and the hour. */
  | 'clouds'
  /** Kites of many colours, flying by day. */
  | 'kites'
  /** Flocks of birds wheeling by day and at dusk. */
  | 'birds'
  /** Rays of sunlight fanning out from the sun. */
  | 'sunbeams'
  /** Rainbow arcs by day. */
  | 'rainbow'
  /** A glowing band all round the horizon at dawn and dusk. */
  | 'alpenglow'
  /** Aurora curtains overhead at night. */
  | 'aurora'
  /** The Milky Way across the night sky. */
  | 'milkyway'
  /** Coloured nebula clouds among the stars. */
  | 'nebula'
  /** Stars that streak across the night. */
  | 'shootingStars'
  /** Fireworks bursting after dusk. */
  | 'fireworks'
  /** Beams of light sweeping the night sky. */
  | 'searchlights'
  /** A great glowing halo round the moon. */
  | 'moonHalo'
  /** The moon as a bright crescent. */
  | 'crescent';

export const SKY_KINDS: SkyKind[] = ['clouds', 'kites', 'birds', 'sunbeams', 'rainbow', 'alpenglow', 'aurora', 'milkyway', 'nebula', 'shootingStars', 'fireworks', 'searchlights', 'moonHalo', 'crescent'];

export interface SkyDesign {
  /** What the sky is like, for tests and anyone reading. */
  what: string;
  effects: SkyKind[];
  /** Colours of the land's sky effects: firework bursts, kites, beams, halo, nebula. */
  palette: string[];
  /** Cloud colour by day. */
  cloud: string;
}

const S = (what: string, effects: SkyKind[], palette: string[], cloud: string): SkyDesign => ({ what, effects, palette, cloud });

export const SKIES: Record<RegionId, SkyDesign> = {
  meadow: S('everything at once: rainbows and kites by day, then the Milky Way, a nebula, aurora, shooting stars, fireworks and castle searchlights by night', [...SKY_KINDS], ['#ff6fb8', '#ffd24a', '#5ac8ff', '#a67bff', '#5affa0', '#ff8a5a'], '#fff4fa'),
  japan: S('pink-tinted clouds, cranes at dusk, summer hanabi fireworks and a pale moon', ['clouds', 'birds', 'sunbeams', 'fireworks', 'moonHalo', 'shootingStars'], ['#ffb3d1', '#ffffff', '#ffd966', '#ff5a7a'], '#ffe0ee'),
  korea: S('autumn alpenglow, flying yeon kites and the great Chuseok moon', ['alpenglow', 'kites', 'birds', 'moonHalo', 'clouds'], ['#ff9a4a', '#d9432a', '#f2c14e', '#4a8aff'], '#fff0e0'),
  china: S('red and gold fireworks, dragon kites, and the Mid-Autumn moon', ['fireworks', 'kites', 'moonHalo', 'clouds', 'sunbeams'], ['#ff3a3a', '#ffb43a', '#ffd966', '#ff7a5a'], '#ffe6dc'),
  norway: S('aurora over the fjords, pink midnight-sun alpenglow, the Milky Way', ['aurora', 'alpenglow', 'milkyway', 'shootingStars', 'clouds'], ['#7affc0', '#ff9ab8', '#b99bff', '#ffffff'], '#eef6ff'),
  switzerland: S('fiery alpenglow on the peaks, a crystal-clear Milky Way, bright shooting stars', ['alpenglow', 'milkyway', 'shootingStars', 'sunbeams', 'clouds'], ['#ff8a6a', '#ffd0b0', '#ffffff', '#9fd8ff'], '#ffffff'),
  london: S('lilac clouds with golden edges, sunbeams breaking through, fireworks over the river, a misty moon', ['clouds', 'sunbeams', 'birds', 'fireworks', 'moonHalo'], ['#ffd98a', '#ff5a8a', '#7ab8ff', '#ffffff'], '#e6e0f4'),
  newyork: S('neon searchlights sweeping the night, New Year fireworks, sunset clouds and the city-grid sunbeam', ['searchlights', 'fireworks', 'clouds', 'sunbeams', 'birds'], ['#ff4ad0', '#4ad8ff', '#ffe04a', '#7aff7a'], '#ffe6ee'),
  renaissance: S('painted-ceiling skies: golden sunbeams, cream and rose clouds, swallows, a haloed moon', ['sunbeams', 'clouds', 'birds', 'moonHalo', 'milkyway'], ['#ffd08a', '#fff2c8', '#ffb3a0', '#b3d4ff'], '#fff0e0'),
  vintage: S('pastel clouds, fairground fireworks, kites and a rainbow after the shower', ['clouds', 'fireworks', 'kites', 'rainbow', 'birds', 'moonHalo'], ['#fff2a8', '#ffb3d9', '#b3e6ff', '#b5ff9a'], '#fff4f8'),
  islamic: S('a bright crescent over the courtyards, the Milky Way, doves at dusk, golden evening clouds', ['crescent', 'milkyway', 'shootingStars', 'birds', 'clouds'], ['#ffd27a', '#3ac8ff', '#ffffff', '#ff6b8b'], '#fff4e4'),
  middleeast: S('a crescent above the domes, shooting stars, the Milky Way and golden sunbeams', ['crescent', 'shootingStars', 'milkyway', 'sunbeams', 'alpenglow'], ['#ffb84a', '#3ae0c8', '#b86bff', '#ffffff'], '#ffe8cc'),
  desert: S('the brightest Milky Way in the world, a faint nebula, shooting stars and burning-orange dusk', ['milkyway', 'nebula', 'shootingStars', 'alpenglow', 'sunbeams'], ['#ff9a3a', '#ffd27a', '#b99bff', '#ffffff'], '#ffe4c0'),
  egypt: S('golden sunbeams, ibis flocks over the Nile, a gold-haloed moon and the Milky Way', ['sunbeams', 'birds', 'moonHalo', 'milkyway', 'alpenglow'], ['#ffc06a', '#fff2c8', '#3ac8ff', '#ffffff'], '#ffe8c4'),
  indianorth: S('Sankranti kites by day, Diwali fireworks by night, parakeet flocks and a warm moon', ['kites', 'fireworks', 'birds', 'moonHalo', 'clouds'], ['#ff9a1f', '#ff4a8a', '#ffd966', '#b86bff', '#3ac8ff'], '#ffe8dc'),
  indiasouth: S('monsoon clouds and rainbows, egrets over the paddy, temple-festival fireworks', ['rainbow', 'clouds', 'birds', 'fireworks', 'moonHalo'], ['#ffb84a', '#ff6b8b', '#fff2c8', '#7affb0'], '#f4fff4'),
  mughal: S('the Taj moonlight halo, rose-tinted clouds, kites over the gardens and falling stars', ['moonHalo', 'clouds', 'kites', 'birds', 'sunbeams', 'shootingStars'], ['#ff8fb8', '#ffe0a0', '#ffffff', '#b99bff'], '#fff0f4'),
  indonesia: S('Bali kite festival, towering tropical clouds, rainbows over the terraces and the Milky Way', ['kites', 'clouds', 'rainbow', 'birds', 'sunbeams', 'milkyway'], ['#ff6b6b', '#ffb86a', '#b8ff7a', '#4ad8ff'], '#f0fff4'),
  aurora: S('the whole sky alive: aurora, nebula, Milky Way, shooting stars and violet alpenglow', ['aurora', 'nebula', 'milkyway', 'shootingStars', 'alpenglow'], ['#7affc0', '#b99bff', '#9fd8ff', '#ffcf7a'], '#eaf2ff'),
  skyisles: S('above the clouds: a nebula, the Milky Way, rainbows, soft aurora and pastel cloud islands', ['nebula', 'milkyway', 'shootingStars', 'rainbow', 'clouds', 'aurora', 'sunbeams'], ['#fff0b0', '#e6dcff', '#ffd6f0', '#9fd8ff'], '#f4ecff'),
};

/** Fireworks per second at full strength; the celebration makes it a proper display. */
export function fireworkRate(strength: number, party: number): number {
  return strength * (0.6 + party * 1.2);
}
