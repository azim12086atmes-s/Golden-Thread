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
  | 'crescent'
  /** Extra moons of other colours, in other phases — pale by day, bright at night. */
  | 'moons'
  /** A great ringed planet and two small ones hanging in the sky. */
  | 'planets'
  /** More rainbows round the horizon by day, and pale moonbows at night. */
  | 'rainbowArcs'
  /** A dome of translucent golden hexagon tiles high overhead that shimmers in waves. */
  | 'hexCanopy'
  /** The stars joined into glowing figures at night. */
  | 'constellations'
  /** A great comet with a long curving tail. */
  | 'comet'
  /** A ring of light round the sun with two bright sundogs. */
  | 'sunHalo'
  /** Floating islands far off with waterfalls pouring off their edges. */
  | 'islands'
  /** A vast star-pattern (girih) turning slowly overhead. */
  | 'mandala'
  /** Hot-air balloons drifting by day. */
  | 'balloons'
  /** Electric-blue night-shining clouds low over the horizon after dusk. */
  | 'noctilucent';

export const SKY_KINDS: SkyKind[] = ['clouds', 'kites', 'birds', 'sunbeams', 'rainbow', 'alpenglow', 'aurora', 'milkyway', 'nebula', 'shootingStars', 'fireworks', 'searchlights', 'moonHalo', 'crescent',
  'moons', 'planets', 'rainbowArcs', 'hexCanopy', 'constellations', 'comet', 'sunHalo', 'islands', 'mandala', 'balloons', 'noctilucent'];

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
  meadow: S('everything at once: rainbows, kites, balloons, a sun halo and floating islands by day, then the Milky Way, a nebula, aurora, many moons, planets, a comet, constellations, a golden honeycomb dome, a turning star, shooting stars, fireworks and castle searchlights by night', [...SKY_KINDS], ['#ff6fb8', '#ffd24a', '#5ac8ff', '#a67bff', '#5affa0', '#ff8a5a'], '#fff4fa'),
  japan: S('pink-tinted clouds, cranes at dusk, summer hanabi fireworks and a pale moon, with two pale sister moons, the Tanabata star-lovers drawn in light, a sun halo and extra rainbows over the pagodas', ['clouds', 'birds', 'sunbeams', 'fireworks', 'moonHalo', 'shootingStars', 'moons', 'constellations', 'sunHalo', 'rainbowArcs'], ['#ffb3d1', '#ffffff', '#ffd966', '#ff5a7a'], '#ffe0ee'),
  korea: S('autumn alpenglow, flying yeon kites and the great Chuseok moon, with lantern-coloured moons, the Big Dipper in light, and hot-air balloons at the harvest festival', ['alpenglow', 'kites', 'birds', 'moonHalo', 'clouds', 'moons', 'constellations', 'balloons'], ['#ff9a4a', '#d9432a', '#f2c14e', '#4a8aff'], '#fff0e0'),
  china: S('red and gold fireworks, dragon kites, and the Mid-Autumn moon, with a jade and a rose moon, a turning star-lattice like a carved window, the zodiac drawn in stars and a comet', ['fireworks', 'kites', 'moonHalo', 'clouds', 'sunbeams', 'moons', 'mandala', 'constellations', 'comet'], ['#ff3a3a', '#ffb43a', '#ffd966', '#ff7a5a'], '#ffe6dc'),
  norway: S('aurora over the fjords, pink midnight-sun alpenglow, the Milky Way, with night-shining blue clouds, a comet over the fjord, a second silver moon and a sun halo with sundogs', ['aurora', 'alpenglow', 'milkyway', 'shootingStars', 'clouds', 'noctilucent', 'comet', 'moons', 'sunHalo'], ['#7affc0', '#ff9ab8', '#b99bff', '#ffffff'], '#eef6ff'),
  switzerland: S('fiery alpenglow on the peaks, a crystal-clear Milky Way, bright shooting stars, with balloons over the peaks, a sun halo, a ringed planet in the clear air and night-shining clouds', ['alpenglow', 'milkyway', 'shootingStars', 'sunbeams', 'clouds', 'balloons', 'sunHalo', 'planets', 'noctilucent'], ['#ff8a6a', '#ffd0b0', '#ffffff', '#9fd8ff'], '#ffffff'),
  london: S('lilac clouds with golden edges, sunbeams breaking through, fireworks over the river, a misty moon, with balloons over the river, double rainbows after rain, a sun halo and a pale second moon', ['clouds', 'sunbeams', 'birds', 'fireworks', 'moonHalo', 'balloons', 'rainbowArcs', 'sunHalo', 'moons'], ['#ffd98a', '#ff5a8a', '#7ab8ff', '#ffffff'], '#e6e0f4'),
  newyork: S('neon searchlights sweeping the night, New Year fireworks, sunset clouds and the city-grid sunbeam, with a ringed planet above the towers, a comet, balloons by day and a golden honeycomb canopy', ['searchlights', 'fireworks', 'clouds', 'sunbeams', 'birds', 'planets', 'comet', 'balloons', 'hexCanopy'], ['#ff4ad0', '#4ad8ff', '#ffe04a', '#7aff7a'], '#ffe6ee'),
  renaissance: S('painted-ceiling skies: golden sunbeams, cream and rose clouds, swallows, a haloed moon, with Galileo’s ringed planet, painted constellations, a turning star-rose like a ceiling fresco and balloons', ['sunbeams', 'clouds', 'birds', 'moonHalo', 'milkyway', 'planets', 'constellations', 'mandala', 'balloons'], ['#ffd08a', '#fff2c8', '#ffb3a0', '#b3d4ff'], '#fff0e0'),
  vintage: S('pastel clouds, fairground fireworks, kites and a rainbow after the shower, with fairground balloons, rainbow after rainbow, a pastel second moon and a comet like a postcard', ['clouds', 'fireworks', 'kites', 'rainbow', 'birds', 'moonHalo', 'balloons', 'rainbowArcs', 'moons', 'comet'], ['#fff2a8', '#ffb3d9', '#b3e6ff', '#b5ff9a'], '#fff4f8'),
  islamic: S('a bright crescent over the courtyards, the Milky Way, doves at dusk, golden evening clouds, with a turning eight-pointed girih star, a golden hex-tile canopy like a muqarnas dome, sister moons and the stars joined in light', ['crescent', 'milkyway', 'shootingStars', 'birds', 'clouds', 'mandala', 'hexCanopy', 'moons', 'constellations'], ['#ffd27a', '#3ac8ff', '#ffffff', '#ff6b8b'], '#fff4e4'),
  middleeast: S('a crescent above the domes, shooting stars, the Milky Way and golden sunbeams, with a turning star-lattice, three moons, the navigators’ constellations and a comet over the dunes', ['crescent', 'shootingStars', 'milkyway', 'sunbeams', 'alpenglow', 'mandala', 'moons', 'constellations', 'comet'], ['#ffb84a', '#3ae0c8', '#b86bff', '#ffffff'], '#ffe8cc'),
  desert: S('the brightest Milky Way in the world, a faint nebula, shooting stars and burning-orange dusk, with ringed planets, a great comet, the navigators’ star-figures and a rose-gold moon', ['milkyway', 'nebula', 'shootingStars', 'alpenglow', 'sunbeams', 'planets', 'comet', 'constellations', 'moons'], ['#ff9a3a', '#ffd27a', '#b99bff', '#ffffff'], '#ffe4c0'),
  egypt: S('golden sunbeams, ibis flocks over the Nile, a gold-haloed moon and the Milky Way, with the old star-figures over the pyramids, a ringed planet, a sun halo and dawn balloons over the Nile', ['sunbeams', 'birds', 'moonHalo', 'milkyway', 'alpenglow', 'constellations', 'planets', 'sunHalo', 'balloons'], ['#ffc06a', '#fff2c8', '#3ac8ff', '#ffffff'], '#ffe8c4'),
  indianorth: S('Sankranti kites by day, Diwali fireworks by night, parakeet flocks and a warm moon, with festival balloons, rainbow arcs, a marigold moon and a turning rangoli star', ['kites', 'fireworks', 'birds', 'moonHalo', 'clouds', 'balloons', 'rainbowArcs', 'moons', 'mandala'], ['#ff9a1f', '#ff4a8a', '#ffd966', '#b86bff', '#3ac8ff'], '#ffe8dc'),
  indiasouth: S('monsoon clouds and rainbows, egrets over the paddy, temple-festival fireworks, with monsoon rainbows and moonbows, a jasmine moon, kolam star-figures and far floating hills', ['rainbow', 'clouds', 'birds', 'fireworks', 'moonHalo', 'rainbowArcs', 'moons', 'constellations', 'islands'], ['#ffb84a', '#ff6b8b', '#fff2c8', '#7affb0'], '#f4fff4'),
  mughal: S('the Taj moonlight halo, rose-tinted clouds, kites over the gardens and falling stars, with a turning jaali star, a golden honeycomb canopy, a rose moon and rainbows over the gardens', ['moonHalo', 'clouds', 'kites', 'birds', 'sunbeams', 'shootingStars', 'mandala', 'hexCanopy', 'moons', 'rainbowArcs'], ['#ff8fb8', '#ffe0a0', '#ffffff', '#b99bff'], '#fff0f4'),
  indonesia: S('Bali kite festival, towering tropical clouds, rainbows over the terraces and the Milky Way, with rainbow arcs over the terraces, far floating islands with waterfalls, night-shining clouds and a green moon', ['kites', 'clouds', 'rainbow', 'birds', 'sunbeams', 'milkyway', 'rainbowArcs', 'islands', 'noctilucent', 'moons'], ['#ff6b6b', '#ffb86a', '#b8ff7a', '#4ad8ff'], '#f0fff4'),
  aurora: S('the whole sky alive: aurora, nebula, Milky Way, shooting stars and violet alpenglow, with night-shining clouds, a comet over the ice, violet and ice-blue moons, a ringed planet and a sun halo', ['aurora', 'nebula', 'milkyway', 'shootingStars', 'alpenglow', 'noctilucent', 'comet', 'moons', 'planets', 'sunHalo'], ['#7affc0', '#b99bff', '#9fd8ff', '#ffcf7a'], '#eaf2ff'),
  skyisles: S('above the clouds: a nebula, the Milky Way, rainbows, soft aurora and pastel cloud islands, with floating islands and waterfalls, a golden honeycomb dome, planets, many moons, moonbows, a comet and a turning star', ['nebula', 'milkyway', 'shootingStars', 'rainbow', 'clouds', 'aurora', 'sunbeams', 'islands', 'hexCanopy', 'planets', 'moons', 'rainbowArcs', 'comet', 'mandala'], ['#fff0b0', '#e6dcff', '#ffd6f0', '#9fd8ff'], '#f4ecff'),
};

/** Fireworks per second at full strength; the celebration makes it a proper display. */
export function fireworkRate(strength: number, party: number): number {
  return strength * (1.1 + party * 2.4);
}
