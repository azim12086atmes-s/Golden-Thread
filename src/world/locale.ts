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

export interface Locale { grade: Grade; particles: ParticleTheme }

const G = (sat: number, vib: number, tint: string, amt: number): Grade => ({ sat, vib, tint, amt });

export const LOCALES: Record<RegionId, Locale> = {
  meadow: { grade: G(1.18, 0.35, '#fff1d6', 0.12), particles: { what: 'dandelion seeds and butterflies', colors: ['#ffffff', '#fff6cf', '#ff9ec7', '#9fd4ff', '#ffd966'], motion: 'flutter', size: 0.2, count: 260, speed: 0.8, glow: false } },
  japan: { grade: G(1.2, 0.3, '#ffd6e6', 0.16), particles: { what: 'drifting sakura petals', colors: ['#ffc4dc', '#ffe1ec', '#ffffff', '#f7a8c8'], motion: 'fall', size: 0.24, count: 420, speed: 0.7, glow: false, petal: true } },
  korea: { grade: G(1.18, 0.3, '#ffe0c8', 0.12), particles: { what: 'red and gold maple leaves', colors: ['#d9432a', '#f08a3a', '#f2c14e', '#b8321f'], motion: 'fall', size: 0.28, count: 220, speed: 0.9, glow: false, petal: true } },
  china: { grade: G(1.22, 0.3, '#ffd8c8', 0.12), particles: { what: 'red paper sparks from lanterns', colors: ['#ff4a3a', '#ffb43a', '#ffd966', '#ff7a5a'], motion: 'rise', size: 0.16, count: 260, speed: 0.6, glow: true } },
  norway: { grade: G(1.1, 0.25, '#d8ecff', 0.14), particles: { what: 'sea mist and a few light flakes', colors: ['#ffffff', '#e6f3ff', '#cfe6ff'], motion: 'drift', size: 0.18, count: 260, speed: 0.6, glow: false } },
  switzerland: { grade: G(1.15, 0.3, '#eaf6ff', 0.1), particles: { what: 'alpine sparkles in the clear air', colors: ['#ffffff', '#fff8e0', '#e6f3ff'], motion: 'hover', size: 0.12, count: 260, speed: 0.4, glow: true } },
  london: { grade: G(1.05, 0.3, '#d6e2ff', 0.12), particles: { what: 'soft drizzle', colors: ['#cfe0ff', '#e6eeff', '#b8ccf0'], motion: 'rain', size: 0.14, count: 520, speed: 9, glow: false } },
  newyork: { grade: G(1.2, 0.3, '#ffe8c8', 0.1), particles: { what: 'golden city-light bokeh and confetti', colors: ['#ffd27a', '#ff8fb8', '#7ad7ff', '#fff2a8', '#b5ff9a'], motion: 'hover', size: 0.22, count: 220, speed: 0.4, glow: true } },
  renaissance: { grade: G(1.18, 0.3, '#ffe2b0', 0.16), particles: { what: 'golden motes in the sunbeams', colors: ['#ffe0a0', '#fff2c8', '#ffd27a'], motion: 'hover', size: 0.1, count: 360, speed: 0.3, glow: true } },
  vintage: { grade: G(1.15, 0.3, '#ffe4ec', 0.12), particles: { what: 'soap bubbles and autumn leaves', colors: ['#bfefff', '#ffd1f0', '#fff7c2', '#e8a04a'], motion: 'rise', size: 0.3, count: 160, speed: 0.5, glow: true } },
  islamic: { grade: G(1.15, 0.3, '#fff4e0', 0.1), particles: { what: 'orange-blossom petals and fountain spray', colors: ['#ffffff', '#fff6e6', '#ffe0a8', '#bfe8ff'], motion: 'fall', size: 0.18, count: 280, speed: 0.6, glow: false, petal: true } },
  middleeast: { grade: G(1.18, 0.3, '#ffd9a8', 0.16), particles: { what: 'lantern embers and incense glints', colors: ['#ffb84a', '#ff8a3a', '#ffe0a0'], motion: 'rise', size: 0.12, count: 260, speed: 0.5, glow: true } },
  desert: { grade: G(1.2, 0.3, '#ffcf9a', 0.18), particles: { what: 'blown sand, and stars that seem close enough to touch', colors: ['#f2d6a0', '#ffe8c0', '#fff6d6'], motion: 'swirl', size: 0.1, count: 420, speed: 3.5, glow: false } },
  egypt: { grade: G(1.2, 0.3, '#ffd8a0', 0.16), particles: { what: 'golden river dust', colors: ['#ffe0a0', '#f2c77a', '#fff0c8'], motion: 'drift', size: 0.1, count: 380, speed: 1.2, glow: true } },
  indianorth: { grade: G(1.28, 0.35, '#ffd0b8', 0.14), particles: { what: 'marigold petals and bright colour-powder specks', colors: ['#ff9a1f', '#ffc83a', '#ff5a8a', '#b86bff', '#3ac8ff'], motion: 'fall', size: 0.2, count: 360, speed: 0.8, glow: false, petal: true } },
  indiasouth: { grade: G(1.28, 0.35, '#d8ffd8', 0.1), particles: { what: 'jasmine petals by day, fireflies by night', colors: ['#ffffff', '#fffbe8', '#f2ffe0'], motion: 'fall', size: 0.18, count: 300, speed: 0.6, glow: false, petal: true } },
  mughal: { grade: G(1.22, 0.3, '#ffe0e6', 0.14), particles: { what: 'rose petals', colors: ['#d1284a', '#ff6b8b', '#ff9ab0', '#ffffff'], motion: 'fall', size: 0.22, count: 340, speed: 0.7, glow: false, petal: true } },
  indonesia: { grade: G(1.3, 0.35, '#d0ffd8', 0.12), particles: { what: 'green fireflies over the terraces', colors: ['#b8ff7a', '#e6ff9a', '#7affc8'], motion: 'hover', size: 0.18, count: 280, speed: 0.6, glow: true, night: true } },
  aurora: { grade: G(1.15, 0.3, '#d0e6ff', 0.2), particles: { what: 'aurora-lit sparkles in the frost', colors: ['#7affc0', '#b99bff', '#ffffff', '#9fd8ff'], motion: 'hover', size: 0.14, count: 340, speed: 0.4, glow: true } },
  skyisles: { grade: G(1.18, 0.3, '#e6dcff', 0.2), particles: { what: 'star dust and cloud wisps', colors: ['#fff4c0', '#e6dcff', '#ffffff', '#ffd6f0'], motion: 'rise', size: 0.2, count: 360, speed: 0.4, glow: true } },
};
