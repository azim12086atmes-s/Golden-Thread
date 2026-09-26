import type { RegionId } from './regions';

/**
 * Each land's own look and air: a colour grade (how rich the colours are, and a gentle tint that
 * sets the mood) and a layer of particles only that land has. Pure data — RegionFX and the grade
 * pass read it, tests check it.
 */

export type Motion = 'fall' | 'flutter' | 'rise' | 'drift' | 'rain' | 'swirl' | 'hover';

export interface ParticleTheme {
  /** What they are, for the tests and anyone reading. */
  what: string;
  colors: string[];
  motion: Motion;
  size: number;
  count: number;
  speed: number;
  /** Additive glow (lights, embers, sparkles) rather than solid (petals, leaves, rain). */
  glow: boolean;
  /** Petal-shaped sprite rather than a round one. */
  petal?: boolean;
  /** Only after dusk. */
  night?: boolean;
}

export interface Grade {
  /** Saturation multiplier (1 = unchanged). */
  sat: number;
  /** Vibrance: extra saturation for dull colours only. */
  vib: number;
  /** Mood tint and how much of it. */
  tint: string;
  amt: number;
}

export type Artifact =
  | 'toro' | 'lanternPole' | 'fountain' | 'obelisk' | 'jar' | 'flowerCart' | 'bunting' | 'neon' | 'booth'
  | 'ice' | 'crystal' | 'diya' | 'kolam' | 'penjor' | 'parasol' | 'carpet' | 'dallah' | 'boat' | 'statue'
  | 'chhatri' | 'flowerBox' | 'bench';

/** The land's own sky: colours blended into the sky dome by day, at dusk and at night. */
export interface SkyTint { day: string; dusk: string; night: string }

/**
 * The land's air: the haze that softens its distances by day (and at night), how deep that haze
 * is, the colour of its sunlight and how bright, and the hue its nights take on — a faint blue
 * over the ice, a sandy warmth over the desert, a white, misty glow over the Sky Isles.
 */
export interface Atmos {
  haze: string;
  hazeNight: string;
  /** Fog distances (m): where the haze starts and where it closes in. */
  near: number;
  far: number;
  sun: string;
  /** Sunlight strength relative to the standard day. */
  light: number;
  /** The colour grade's hue after dark. */
  night: string;
}

export interface Locale {
  atmos: Atmos;
  grade: Grade;
  particles: ParticleTheme;
  sky: SkyTint;
  /** Colours of the land's lanterns and night lights. */
  lights: string[];
  /** Things that decorate the town: set round the plaza and along the avenues. */
  artifacts: Artifact[];
}

const G = (sat: number, vib: number, tint: string, amt: number): Grade => ({ sat, vib, tint, amt });
const A = (haze: string, hazeNight: string, near: number, far: number, sun: string, light: number, night: string): Atmos => ({ haze, hazeNight, near, far, sun, light, night });

export const LOCALES: Record<RegionId, Locale> = {
  meadow: { atmos: A('#ffe8f0', '#3a3a7a', 140, 1500, '#fff0d0', 1.12, '#cfc6ff'), grade: G(1.18, 0.35, '#fff1d6', 0.12), particles: { what: 'dandelion seeds and butterflies', colors: ['#ffffff', '#fff6cf', '#ff9ec7', '#9fd4ff', '#ffd966'], motion: 'flutter', size: 0.2, count: 260, speed: 0.8, glow: false }, sky: { day: '#8fd2ff', dusk: '#ffa0b8', night: '#2a2a6e' }, lights: ['#ffd98a', '#ffb3d9', '#b3e6ff'], artifacts: ['flowerCart', 'bunting', 'lanternPole', 'flowerBox', 'bench'] },
  japan: { atmos: A('#ffd8ea', '#3a2a5e', 120, 1350, '#fff0f4', 1.08, '#dcc4ff'), grade: G(1.2, 0.3, '#ffd6e6', 0.16), particles: { what: 'drifting sakura petals', colors: ['#ffc4dc', '#ffe1ec', '#ffffff', '#f7a8c8'], motion: 'fall', size: 0.24, count: 420, speed: 0.7, glow: false, petal: true }, sky: { day: '#ffd6e8', dusk: '#ff9ab8', night: '#2a1f4e' }, lights: ['#ffb24a', '#ff4a5a', '#fff2e0'], artifacts: ['toro', 'lanternPole', 'parasol', 'bench', 'toro'] },
  korea: { atmos: A('#ffe4cc', '#2e3260', 130, 1400, '#fff0dc', 1.08, '#c8ccff'), grade: G(1.18, 0.3, '#ffe0c8', 0.12), particles: { what: 'red and gold maple leaves', colors: ['#d9432a', '#f08a3a', '#f2c14e', '#b8321f'], motion: 'fall', size: 0.28, count: 220, speed: 0.9, glow: false, petal: true }, sky: { day: '#d8ecff', dusk: '#ffb080', night: '#232a52' }, lights: ['#ff9ab8', '#fff27a', '#9ae8a0', '#8ac8ff'], artifacts: ['jar', 'lanternPole', 'flowerBox', 'jar', 'bench'] },
  china: { atmos: A('#ffd2bc', '#4a2238', 110, 1300, '#ffe8cc', 1.1, '#ffc8c4'), grade: G(1.22, 0.3, '#ffd8c8', 0.12), particles: { what: 'red paper sparks from lanterns', colors: ['#ff4a3a', '#ffb43a', '#ffd966', '#ff7a5a'], motion: 'rise', size: 0.16, count: 260, speed: 0.6, glow: true }, sky: { day: '#ffe0d0', dusk: '#ff7a5a', night: '#2e1f3e' }, lights: ['#ff3a3a', '#ffb43a', '#ffd966'], artifacts: ['lanternPole', 'parasol', 'jar', 'bunting', 'lanternPole'] },
  norway: { atmos: A('#d8ecff', '#1e2c58', 150, 1600, '#f6f8ff', 1.02, '#a8c4ff'), grade: G(1.1, 0.25, '#d8ecff', 0.14), particles: { what: 'sea mist and a few light flakes', colors: ['#ffffff', '#e6f3ff', '#cfe6ff'], motion: 'drift', size: 0.18, count: 260, speed: 0.6, glow: false }, sky: { day: '#cfe6ff', dusk: '#ffb89a', night: '#1a2a4e' }, lights: ['#ffd9a8', '#fff2c8'], artifacts: ['boat', 'lanternPole', 'flowerBox', 'bench', 'boat'] },
  switzerland: { atmos: A('#e6f4ff', '#22305a', 170, 1800, '#fffaf0', 1.12, '#b8ccff'), grade: G(1.15, 0.3, '#eaf6ff', 0.1), particles: { what: 'alpine sparkles in the clear air', colors: ['#ffffff', '#fff8e0', '#e6f3ff'], motion: 'hover', size: 0.12, count: 260, speed: 0.4, glow: true }, sky: { day: '#d6ecff', dusk: '#ffc0a0', night: '#1f2a52' }, lights: ['#fff2c8', '#ffd98a'], artifacts: ['flowerBox', 'bunting', 'fountain', 'bench', 'flowerBox'] },
  london: { atmos: A('#dadeee', '#262a4a', 80, 1000, '#fff2dc', 0.98, '#c4caee'), grade: G(1.05, 0.3, '#d6e2ff', 0.12), particles: { what: 'soft drizzle', colors: ['#cfe0ff', '#e6eeff', '#b8ccf0'], motion: 'rain', size: 0.14, count: 520, speed: 9, glow: false }, sky: { day: '#d6deea', dusk: '#e8a080', night: '#1f2440' }, lights: ['#ffd98a', '#ffe8b0'], artifacts: ['booth', 'lanternPole', 'bench', 'flowerBox', 'booth'] },
  newyork: { atmos: A('#ffe2cc', '#2a1e46', 120, 1400, '#fff0dc', 1.08, '#e2baff'), grade: G(1.2, 0.3, '#ffe8c8', 0.1), particles: { what: 'golden city-light bokeh and confetti', colors: ['#ffd27a', '#ff8fb8', '#7ad7ff', '#fff2a8', '#b5ff9a'], motion: 'hover', size: 0.22, count: 220, speed: 0.4, glow: true }, sky: { day: '#d0e6ff', dusk: '#ff9a6a', night: '#1a1f3e' }, lights: ['#ff4ad0', '#4ad8ff', '#ffe04a', '#7aff7a'], artifacts: ['neon', 'booth', 'bench', 'lanternPole', 'neon'] },
  renaissance: { atmos: A('#ffe6bc', '#302448', 130, 1450, '#ffe8c0', 1.14, '#e8caff'), grade: G(1.18, 0.3, '#ffe2b0', 0.16), particles: { what: 'golden motes in the sunbeams', colors: ['#ffe0a0', '#fff2c8', '#ffd27a'], motion: 'hover', size: 0.1, count: 360, speed: 0.3, glow: true }, sky: { day: '#ffe8c8', dusk: '#ff9a5a', night: '#2a2045' }, lights: ['#ffd08a', '#fff2c8'], artifacts: ['fountain', 'statue', 'flowerBox', 'lanternPole', 'statue'] },
  vintage: { atmos: A('#ffe2ee', '#34264e', 130, 1400, '#fff0e4', 1.08, '#f0c8ea'), grade: G(1.15, 0.3, '#ffe4ec', 0.12), particles: { what: 'soap bubbles and autumn leaves', colors: ['#bfefff', '#ffd1f0', '#fff7c2', '#e8a04a'], motion: 'rise', size: 0.3, count: 160, speed: 0.5, glow: true }, sky: { day: '#ffe0ec', dusk: '#ffa0b0', night: '#2a2050' }, lights: ['#fff2a8', '#ffb3d9', '#b3e6ff'], artifacts: ['bunting', 'lanternPole', 'flowerCart', 'bench', 'bunting'] },
  islamic: { atmos: A('#fff0d8', '#1e2654', 140, 1500, '#fff0d8', 1.12, '#c8d6ff'), grade: G(1.15, 0.3, '#fff4e0', 0.1), particles: { what: 'orange-blossom petals and fountain spray', colors: ['#ffffff', '#fff6e6', '#ffe0a8', '#bfe8ff'], motion: 'fall', size: 0.18, count: 280, speed: 0.6, glow: false, petal: true }, sky: { day: '#fff0d8', dusk: '#ffb07a', night: '#1f2450' }, lights: ['#ffd27a', '#3ac8ff', '#ff6b8b'], artifacts: ['fountain', 'lanternPole', 'jar', 'carpet', 'fountain'] },
  middleeast: { atmos: A('#ffdcae', '#2e2240', 100, 1250, '#ffe6b8', 1.14, '#ffd6b8'), grade: G(1.18, 0.3, '#ffd9a8', 0.16), particles: { what: 'lantern embers and incense glints', colors: ['#ffb84a', '#ff8a3a', '#ffe0a0'], motion: 'rise', size: 0.12, count: 260, speed: 0.5, glow: true }, sky: { day: '#ffe4c0', dusk: '#ff9048', night: '#2a1f40' }, lights: ['#ffb84a', '#ff5a8a', '#3ae0c8', '#b86bff'], artifacts: ['carpet', 'dallah', 'lanternPole', 'jar', 'carpet'] },
  desert: { atmos: A('#f0c486', '#3a2a3a', 100, 1100, '#ffe2a8', 1.18, '#ffd4a4'), grade: G(1.2, 0.3, '#ffcf9a', 0.18), particles: { what: 'blown sand, and stars that seem close enough to touch', colors: ['#f2d6a0', '#ffe8c0', '#fff6d6'], motion: 'swirl', size: 0.1, count: 420, speed: 3.5, glow: false }, sky: { day: '#ffe0b0', dusk: '#ff7a38', night: '#1f1838' }, lights: ['#ff9a3a', '#ffd27a'], artifacts: ['carpet', 'dallah', 'lanternPole', 'jar', 'dallah'] },
  egypt: { atmos: A('#ffe0a8', '#2c2440', 90, 1150, '#ffe8b8', 1.16, '#ffdcbc'), grade: G(1.2, 0.3, '#ffd8a0', 0.16), particles: { what: 'golden river dust', colors: ['#ffe0a0', '#f2c77a', '#fff0c8'], motion: 'drift', size: 0.1, count: 380, speed: 1.2, glow: true }, sky: { day: '#ffe6b8', dusk: '#ff8a48', night: '#1f1f42' }, lights: ['#ffc06a', '#fff2c8'], artifacts: ['obelisk', 'jar', 'lanternPole', 'carpet', 'obelisk'] },
  indianorth: { atmos: A('#ffd2c4', '#3a2046', 100, 1250, '#ffe6cc', 1.12, '#ffc6de'), grade: G(1.28, 0.35, '#ffd0b8', 0.14), particles: { what: 'marigold petals and bright colour-powder specks', colors: ['#ff9a1f', '#ffc83a', '#ff5a8a', '#b86bff', '#3ac8ff'], motion: 'fall', size: 0.2, count: 360, speed: 0.8, glow: false, petal: true }, sky: { day: '#ffe0d0', dusk: '#ff8a5a', night: '#2a1a48' }, lights: ['#ff9a1f', '#ff4a8a', '#ffd966', '#b86bff'], artifacts: ['diya', 'lanternPole', 'bunting', 'flowerCart', 'diya'] },
  indiasouth: { atmos: A('#e2ffd8', '#1c2e4a', 90, 1150, '#fff6d8', 1.1, '#c4ffe6'), grade: G(1.28, 0.35, '#d8ffd8', 0.1), particles: { what: 'jasmine petals by day, fireflies by night', colors: ['#ffffff', '#fffbe8', '#f2ffe0'], motion: 'fall', size: 0.18, count: 300, speed: 0.6, glow: false, petal: true }, sky: { day: '#d8ffe0', dusk: '#ffa060', night: '#1a2a48' }, lights: ['#ffb84a', '#fff2c8', '#ff6b8b'], artifacts: ['kolam', 'lanternPole', 'parasol', 'flowerBox', 'kolam'] },
  mughal: { atmos: A('#ffe2ea', '#2c2450', 110, 1300, '#fff0e0', 1.1, '#ffd6f0'), grade: G(1.22, 0.3, '#ffe0e6', 0.14), particles: { what: 'rose petals', colors: ['#d1284a', '#ff6b8b', '#ff9ab0', '#ffffff'], motion: 'fall', size: 0.22, count: 340, speed: 0.7, glow: false, petal: true }, sky: { day: '#ffe8ec', dusk: '#ff9a8a', night: '#241f4e' }, lights: ['#ffe0a0', '#ff8fb8', '#fff2c8'], artifacts: ['chhatri', 'fountain', 'lanternPole', 'flowerBox', 'chhatri'] },
  indonesia: { atmos: A('#d8ffe2', '#16304a', 80, 1050, '#fff6dc', 1.08, '#b4ffd6'), grade: G(1.3, 0.35, '#d0ffd8', 0.12), particles: { what: 'green fireflies over the terraces', colors: ['#b8ff7a', '#e6ff9a', '#7affc8'], motion: 'hover', size: 0.18, count: 280, speed: 0.6, glow: true, night: true }, sky: { day: '#d8ffe8', dusk: '#ff9a60', night: '#18284a' }, lights: ['#ffb86a', '#b8ff7a', '#ff6b6b'], artifacts: ['penjor', 'parasol', 'jar', 'lanternPole', 'penjor'] },
  aurora: { atmos: A('#dcecff', '#10224c', 110, 1400, '#eef6ff', 1.04, '#9cb8ff'), grade: G(1.15, 0.3, '#d0e6ff', 0.2), particles: { what: 'aurora-lit sparkles in the frost', colors: ['#7affc0', '#b99bff', '#ffffff', '#9fd8ff'], motion: 'hover', size: 0.14, count: 340, speed: 0.4, glow: true }, sky: { day: '#d0e6ff', dusk: '#c8a0ff', night: '#10204a' }, lights: ['#7affc0', '#b99bff', '#ffcf7a'], artifacts: ['ice', 'lanternPole', 'crystal', 'bench', 'ice'] },
  skyisles: { atmos: A('#eee4ff', '#4a3a8e', 120, 1150, '#fff6f4', 1.1, '#dccaff'), grade: G(1.18, 0.3, '#e6dcff', 0.2), particles: { what: 'star dust and cloud wisps', colors: ['#fff4c0', '#e6dcff', '#ffffff', '#ffd6f0'], motion: 'rise', size: 0.2, count: 360, speed: 0.4, glow: true }, sky: { day: '#ece0ff', dusk: '#ffb8e0', night: '#2a1f5e' }, lights: ['#fff0b0', '#e6dcff', '#ffd6f0'], artifacts: ['crystal', 'lanternPole', 'fountain', 'crystal', 'crystal'] },
};
