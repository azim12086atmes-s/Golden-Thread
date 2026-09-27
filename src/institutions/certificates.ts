import type { GameState } from '../core/state';
import type { SkillId } from '../economy/items';
import type { RegionId } from '../world/regions';

/**
 * Certificates: proof of a skill, awarded by an institute when a course is finished (to you, or to
 * someone you sponsor). They open doors: at an employer you rise only to Associate on skill alone,
 * and each certified level lifts that ceiling (`rankCap`); the demanding freelance gigs (level 3
 * and up) ask for a certificate too (`certNeeded`). Pure rules over GameState.
 */
export interface Certificate { skill: SkillId; level: number; land: RegionId; day: number }

const key = (who: string, skill: SkillId) => `${who}:${skill}`;

/** The highest level certified for someone ('you' or a person's id) in a skill (0: none). */
export function certLevel(st: GameState, who: string, skill: SkillId): number {
  return st.certificates[key(who, skill)]?.level ?? 0;
}

/** Award a certificate at `level` if it is higher than any held. Returns it, or null. */
export function certify(st: GameState, who: string, skill: SkillId, level: number, land: RegionId): Certificate | null {
  if (level <= certLevel(st, who, skill)) return null;
  const c: Certificate = { skill, level, land, day: Math.floor(st.minutes / 1440) + 1 };
  st.certificates[key(who, skill)] = c;
  return c;
}

/** Everyone's certificates of one holder, best first. */
export function certificatesOf(st: GameState, who: string): Certificate[] {
  return Object.entries(st.certificates).filter(([k]) => k.startsWith(`${who}:`)).map(([, c]) => c).sort((a, b) => b.level - a.level);
}

/** The highest rank you may hold at an employer in a skill: Associate (2) without a certificate, one more per certified level. */
export const rankCap = (st: GameState, skill: SkillId): number => 2 + certLevel(st, 'you', skill);

/** The certificate a freelance gig of level `min` asks for (0: none). */
export const certNeeded = (min: number): number => Math.max(0, min - 2);
