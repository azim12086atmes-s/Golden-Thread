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

export interface Locale {
  grade: Grade;
  particles: ParticleTheme;
  sky: SkyTint;
  /** Colours of the land's lanterns and night lights. */
  lights: string[];
  /** Things that decorate the town: set round the plaza and along the avenues. */
  artifacts: Artifact[];
}

const G = (sat: number, vib: number, tint: string, amt: number): Grade => ({ sat, vib, tint, amt });

export const LOCALES: Record<RegionId, Locale> = {
  meadow: { grade: G(1.18, 0.35, '#fff1d6', 0.12), particles: { what: 'dandelion seeds and butterflies', colors: ['#ffffff', '#fff6cf', '#ff9ec7', '#9fd4ff', '#ffd966'], motion: 'flutter', size: 0.2, count: 260, speed: 0.8, glow: false }, sky: { day: '#8fd2ff', dusk: '#ffa0b8', night: '#2a2a6e' }, lights: ['#ffd98a', '#ffb3d9', '#b3e6ff'], artifacts: ['flowerCart', 'bunting', 'lanternPole', 'flowerBox', 'bench'] },
  japan: { grade: G(1.2, 0.3, '#ffd6e6', 0.16), particles: { what: 'drifting sakura petals', colors: ['#ffc4dc', '#ffe1ec', '#ffffff', '#f7a8c8'], motion: 'fall', size: 0.24, count: 420, speed: 0.7, glow: false, petal: true }, sky: { day: '#ffd6e8', dusk: '#ff9ab8', night: '#2a1f4e' }, lights: ['#ffb24a', '#ff4a5a', '#fff2e0'], artifacts: ['toro', 'lanternPole', 'parasol', 'bench', 'toro'] },
  korea: { grade: G(1.18, 0.3, '#ffe0c8', 0.12), particles: { what: 'red and gold maple leaves', colors: ['#d9432a', '#f08a3a', '#f2c14e', '#b8321f'], motion: 'fall', size: 0.28, count: 220, speed: 0.9, glow: false, petal: true }, sky: { day: '#d8ecff', dusk: '#ffb080', night: '#232a52' }, lights: ['#ff9ab8', '#fff27a', '#9ae8a0', '#8ac8ff'], artifacts: ['jar', 'lanternPole', 'flowerBox', 'jar', 'bench'] },
  china: { grade: G(1.22, 0.3, '#ffd8c8', 0.12), particles: { what: 'red paper sparks from lanterns', colors: ['#ff4a3a', '#ffb43a', '#ffd966', '#ff7a5a'], motion: 'rise', size: 0.16, count: 260, speed: 0.6, glow: true }, sky: { day: '#ffe0d0', dusk: '#ff7a5a', night: '#2e1f3e' }, lights: ['#ff3a3a', '#ffb43a', '#ffd966'], artifacts: ['lanternPole', 'parasol', 'jar', 'bunting', 'lanternPole'] },
  norway: { grade: G(1.1, 0.25, '#d8ecff', 0.14), particles: { what: 'sea mist and a few light flakes', colors: ['#ffffff', '#e6f3ff', '#cfe6ff'], motion: 'drift', size: 0.18, count: 260, speed: 0.6, glow: false }, sky: { day: '#cfe6ff', dusk: '#ffb89a', night: '#1a2a4e' }, lights: ['#ffd9a8', '#fff2c8'], artifacts: ['boat', 'lanternPole', 'flowerBox', 'bench', 'boat'] },
  switzerland: { grade: G(1.15, 0.3, '#eaf6ff', 0.1), particles: { what: 'alpine sparkles in the clear air', colors: ['#ffffff', '#fff8e0', '#e6f3ff'], motion: 'hover', size: 0.12, count: 260, speed: 0.4, glow: true }, sky: { day: '#d6ecff', dusk: '#ffc0a0', night: '#1f2a52' }, lights: ['#fff2c8', '#ffd98a'], artifacts: ['flowerBox', 'bunting', 'fountain', 'bench', 'flowerBox'] },
  london: { grade: G(1.05, 0.3, '#d6e2ff', 0.12), particles: { what: 'soft drizzle', colors: ['#cfe0ff', '#e6eeff', '#b8ccf0'], motion: 'rain', size: 0.14, count: 520, speed: 9, glow: false }, sky: { day: '#d6deea', dusk: '#e8a080', night: '#1f2440' }, lights: ['#ffd98a', '#ffe8b0'], artifacts: ['booth', 'lanternPole', 'bench', 'flowerBox', 'booth'] },
  newyork: { grade: G(1.2, 0.3, '#ffe8c8', 0.1), particles: { what: 'golden city-light bokeh and confetti', colors: ['#ffd27a', '#ff8fb8', '#7ad7ff', '#fff2a8', '#b5ff9a'], motion: 'hover', size: 0.22, count: 220, speed: 0.4, glow: true }, sky: { day: '#d0e6ff', dusk: '#ff9a6a', night: '#1a1f3e' }, lights: ['#ff4ad0', '#4ad8ff', '#ffe04a', '#7aff7a'], artifacts: ['neon', 'booth', 'bench', 'lanternPole', 'neon'] },
  renaissance: { grade: G(1.18, 0.3, '#ffe2b0', 0.16), particles: { what: 'golden motes in the sunbeams', colors: ['#ffe0a0', '#fff2c8', '#ffd27a'], motion: 'hover', size: 0.1, count: 360, speed: 0.3, glow: true }, sky: { day: '#ffe8c8', dusk: '#ff9a5a', night: '#2a2045' }, lights: ['#ffd08a', '#fff2c8'], artifacts: ['fountain', 'statue', 'flowerBox', 'lanternPole', 'statue'] },
  vintage: { grade: G(1.15, 0.3, '#ffe4ec', 0.12), particles: { what: 'soap bubbles and autumn leaves', colors: ['#bfefff', '#ffd1f0', '#fff7c2', '#e8a04a'], motion: 'rise', size: 0.3, count: 160, speed: 0.5, glow: true }, sky: { day: '#ffe0ec', dusk: '#ffa0b0', night: '#2a2050' }, lights: ['#fff2a8', '#ffb3d9', '#b3e6ff'], artifacts: ['bunting', 'lanternPole', 'flowerCart', 'bench', 'bunting'] },
  islamic: { grade: G(1.15, 0.3, '#fff4e0', 0.1), particles: { what: 'orange-blossom petals and fountain spray', colors: ['#ffffff', '#fff6e6', '#ffe0a8', '#bfe8ff'], motion: 'fall', size: 0.18, count: 280, speed: 0.6, glow: false, petal: true }, sky: { day: '#fff0d8', dusk: '#ffb07a', night: '#1f2450' }, lights: ['#ffd27a', '#3ac8ff', '#ff6b8b'], artifacts: ['fountain', 'lanternPole', 'jar', 'carpet', 'fountain'] },
  middleeast: { grade: G(1.18, 0.3, '#ffd9a8', 0.16), particles: { what: 'lantern embers and incense glints', colors: ['#ffb84a', '#ff8a3a', '#ffe0a0'], motion: 'rise', size: 0.12, count: 260, speed: 0.5, glow: true }, sky: { day: '#ffe4c0', dusk: '#ff9048', night: '#2a1f40' }, lights: ['#ffb84a', '#ff5a8a', '#3ae0c8', '#b86bff'], artifacts: ['carpet', 'dallah', 'lanternPole', 'jar', 'carpet'] },
  desert: { grade: G(1.2, 0.3, '#ffcf9a', 0.18), particles: { what: 'blown sand, and stars that seem close enough to touch', colors: ['#f2d6a0', '#ffe8c0', '#fff6d6'], motion: 'swirl', size: 0.1, count: 420, speed: 3.5, glow: false }, sky: { day: '#ffe0b0', dusk: '#ff7a38', night: '#1f1838' }, lights: ['#ff9a3a', '#ffd27a'], artifacts: ['carpet', 'dallah', 'lanternPole', 'jar', 'dallah'] },
  egypt: { grade: G(1.2, 0.3, '#ffd8a0', 0.16), particles: { what: 'golden river dust', colors: ['#ffe0a0', '#f2c77a', '#fff0c8'], motion: 'drift', size: 0.1, count: 380, speed: 1.2, glow: true }, sky: { day: '#ffe6b8', dusk: '#ff8a48', night: '#1f1f42' }, lights: ['#ffc06a', '#fff2c8'], artifacts: ['obelisk', 'jar', 'lanternPole', 'carpet', 'obelisk'] },
  indianorth: { grade: G(1.28, 0.35, '#ffd0b8', 0.14), particles: { what: 'marigold petals and bright colour-powder specks', colors: ['#ff9a1f', '#ffc83a', '#ff5a8a', '#b86bff', '#3ac8ff'], motion: 'fall', size: 0.2, count: 360, speed: 0.8, glow: false, petal: true }, sky: { day: '#ffe0d0', dusk: '#ff8a5a', night: '#2a1a48' }, lights: ['#ff9a1f', '#ff4a8a', '#ffd966', '#b86bff'], artifacts: ['diya', 'lanternPole', 'bunting', 'flowerCart', 'diya'] },
  indiasouth: { grade: G(1.28, 0.35, '#d8ffd8', 0.1), particles: { what: 'jasmine petals by day, fireflies by night', colors: ['#ffffff', '#fffbe8', '#f2ffe0'], motion: 'fall', size: 0.18, count: 300, speed: 0.6, glow: false, petal: true }, sky: { day: '#d8ffe0', dusk: '#ffa060', night: '#1a2a48' }, lights: ['#ffb84a', '#fff2c8', '#ff6b8b'], artifacts: ['kolam', 'lanternPole', 'parasol', 'flowerBox', 'kolam'] },
  mughal: { grade: G(1.22, 0.3, '#ffe0e6', 0.14), particles: { what: 'rose petals', colors: ['#d1284a', '#ff6b8b', '#ff9ab0', '#ffffff'], motion: 'fall', size: 0.22, count: 340, speed: 0.7, glow: false, petal: true }, sky: { day: '#ffe8ec', dusk: '#ff9a8a', night: '#241f4e' }, lights: ['#ffe0a0', '#ff8fb8', '#fff2c8'], artifacts: ['chhatri', 'fountain', 'lanternPole', 'flowerBox', 'chhatri'] },
  indonesia: { grade: G(1.3, 0.35, '#d0ffd8', 0.12), particles: { what: 'green fireflies over the terraces', colors: ['#b8ff7a', '#e6ff9a', '#7affc8'], motion: 'hover', size: 0.18, count: 280, speed: 0.6, glow: true, night: true }, sky: { day: '#d8ffe8', dusk: '#ff9a60', night: '#18284a' }, lights: ['#ffb86a', '#b8ff7a', '#ff6b6b'], artifacts: ['penjor', 'parasol', 'jar', 'lanternPole', 'penjor'] },
  aurora: { grade: G(1.15, 0.3, '#d0e6ff', 0.2), particles: { what: 'aurora-lit sparkles in the frost', colors: ['#7affc0', '#b99bff', '#ffffff', '#9fd8ff'], motion: 'hover', size: 0.14, count: 340, speed: 0.4, glow: true }, sky: { day: '#d0e6ff', dusk: '#c8a0ff', night: '#10204a' }, lights: ['#7affc0', '#b99bff', '#ffcf7a'], artifacts: ['ice', 'lanternPole', 'crystal', 'bench', 'ice'] },
  skyisles: { grade: G(1.18, 0.3, '#e6dcff', 0.2), particles: { what: 'star dust and cloud wisps', colors: ['#fff4c0', '#e6dcff', '#ffffff', '#ffd6f0'], motion: 'rise', size: 0.2, count: 360, speed: 0.4, glow: true }, sky: { day: '#ece0ff', dusk: '#ffb8e0', night: '#2a1f5e' }, lights: ['#fff0b0', '#e6dcff', '#ffd6f0'], artifacts: ['crystal', 'lanternPole', 'fountain', 'crystal', 'crystal'] },
};
