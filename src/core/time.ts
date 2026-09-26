import { DAY_MINUTES } from './state';

/**
 * Choosing the time of day. The clock only ever moves forward — like resting until dusk — so
 * crops keep growing and friends' letters keep arriving; nothing that happened is undone.
 */

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export const TIMES: TimeOfDay[] = ['dawn', 'day', 'dusk', 'night'];
export const TIME_HOURS: Record<TimeOfDay, number> = { dawn: 6, day: 12, dusk: 18.5, night: 22 };
export const TIME_LABEL: Record<TimeOfDay, string> = { dawn: '🌅 Dawn', day: '☀️ Day', dusk: '🌇 Dusk', night: '🌙 Night' };
/** A flag in the save: the sky stays at the chosen hour. */
export const SKY_PAUSED = 'sky-paused';

/** The next time the clock reads this hour (today if still ahead, else tomorrow). */
export function jumpTo(minutes: number, which: TimeOfDay): number {
  const dayStart = Math.floor(minutes / DAY_MINUTES) * DAY_MINUTES;
  const want = dayStart + TIME_HOURS[which] * 60;
  return want > minutes + 1 ? want : want + DAY_MINUTES;
}

/** Which part of the day it is now. */
export function timeOfDay(minutes: number): TimeOfDay {
  const h = (minutes % DAY_MINUTES) / 60;
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 17.5) return 'day';
  if (h >= 17.5 && h < 20.5) return 'dusk';
  return 'night';
}

/** The next part of the day after this one (T cycles through them). */
export function nextTime(minutes: number): TimeOfDay {
  return TIMES[(TIMES.indexOf(timeOfDay(minutes)) + 1) % TIMES.length];
}
