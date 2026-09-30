import { hashString } from '../core/rng';
import type { RegionId } from './regions';

/**
 * The turning year and the weather of the day (owner, 2026-09-30: "weather, seasons"). A year is
 * four seasons of a week each. In the temperate lands the leaves turn gold and russet in autumn
 * and are touched with frost in winter (evergreens, blossom and the fantasy trees never change);
 * the tropics, the deserts, the Aurora and the Sky Isles keep their own look all year.
 *
 * Each land has its own weather events, chosen by the day so everyone sees the same sky: showers
 * over London, Sakura Hollow and the monsoon coasts, sandstorms in the deserts, morning fog over
 * the fjords and the Sky Isles, snow flurries in the mountains and, in winter, in the northern
 * towns. An event lasts a few hours of the day, then clears.
 *
 * Pure rules (tests/seasons.test.ts); Weather.ts draws them, the foliage shaders tint the leaves.
 */

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_DAYS = 7;
export const SEASON_ICON: Record<Season, string> = { spring: '🌸', summer: '☀️', autumn: '🍂', winter: '❄️' };
export const SEASON_NAME: Record<Season, string> = { spring: 'Spring', summer: 'Summer', autumn: 'Autumn', winter: 'Winter' };

/** The season on day `day` (0 is the first day of spring). */
export const seasonOf = (day: number): Season => SEASONS[Math.floor(Math.max(0, day) / SEASON_DAYS) % 4];

/** Lands with four real seasons (their broadleaf trees turn in autumn). */
export const TEMPERATE = new Set<RegionId>(['meadow', 'japan', 'korea', 'china', 'norway', 'switzerland', 'london', 'newyork', 'renaissance', 'vintage']);
/** Lands whose winters bring snow flurries. */
const SNOWY_WINTER = new Set<RegionId>(['norway', 'switzerland', 'korea', 'newyork', 'vintage', 'japan', 'china', 'london']);

/**
 * How a land's broadleaf crowns are tinted this season: a colour the green leaves turn towards,
 * and how far (0: not at all). Only green leaves take it (see foliage.ts).
 */
export function leafSeason(land: RegionId, season: Season): { tint: [number, number, number]; amount: number } {
  if (!TEMPERATE.has(land)) return { tint: [1, 1, 1], amount: 0 };
  if (season === 'autumn') return { tint: [1.0, 0.55, 0.16], amount: 0.62 };
  if (season === 'winter') return { tint: [0.78, 0.74, 0.6], amount: 0.3 };
  return { tint: [1, 1, 1], amount: 0 };
}

export type WeatherEvent = 'none' | 'shower' | 'flurry' | 'sandstorm' | 'fog';
export const EVENT_TEXT: Record<Exclude<WeatherEvent, 'none'>, { icon: string; words: string }> = {
  shower: { icon: '🌧️', words: 'A shower passes over' },
  flurry: { icon: '🌨️', words: 'Snow is falling on' },
  sandstorm: { icon: '🌪️', words: 'A sandstorm sweeps across' },
  fog: { icon: '🌫️', words: 'Morning fog lies over' },
};

/** Each land's events and how likely one is on a given day (winter adds flurries where it snows). */
const EVENTS: Partial<Record<RegionId, Array<[Exclude<WeatherEvent, 'none'>, number]>>> = {
  london: [['shower', 0.55], ['fog', 0.3]],
  japan: [['shower', 0.35]],
  korea: [['shower', 0.3]],
  china: [['shower', 0.3]],
  norway: [['fog', 0.4], ['shower', 0.25]],
  switzerland: [['flurry', 0.3]],
  aurora: [['flurry', 0.6]],
  indiasouth: [['shower', 0.45]],
  indonesia: [['shower', 0.5], ['fog', 0.25]],
  vintage: [['shower', 0.3]],
  newyork: [['shower', 0.25]],
  desert: [['sandstorm', 0.35]],
  middleeast: [['sandstorm', 0.25]],
  egypt: [['sandstorm', 0.2]],
  skyisles: [['fog', 0.35]],
  meadow: [['shower', 0.15]],
};

const unit = (s: string) => (hashString(s) % 100000) / 100000;

/** The weather event in a land at an hour of a day, if any (the same for everyone). */
export function weatherEvent(land: RegionId, day: number, hour: number): WeatherEvent {
  const season = seasonOf(day);
  const list = [...(EVENTS[land] ?? [])];
  if (season === 'winter' && SNOWY_WINTER.has(land)) list.unshift(['flurry', 0.55]);
  for (const [kind, p] of list) {
    if (unit(`${land}:${day}:${kind}`) >= p) continue;
    // Fog lies in the early morning; the rest come at some hour of the day and last 2–4 hours.
    const start = kind === 'fog' ? 4 + unit(`${land}:${day}:${kind}:s`) * 2 : 7 + unit(`${land}:${day}:${kind}:s`) * 11;
    const len = kind === 'fog' ? 4 + unit(`${land}:${day}:${kind}:l`) * 2 : 2 + unit(`${land}:${day}:${kind}:l`) * 2;
    if (hour >= start && hour < start + len) return kind;
  }
  return 'none';
}
