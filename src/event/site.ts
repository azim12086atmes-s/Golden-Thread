import type { GameState } from '../core/state';
import type { Objective } from '../guide/objectives';
import { CASTLE } from './layout';
export { CASTLE, CAKE_SPOT, guests, guestSpot } from './layout';

/**
 * The celebration evening — the special event of this release. He has planned it for her: a
 * unicorn chariot, a castle no one has seen before, a gown made just for her in its wardrobe, and
 * a party where people from every land gather to celebrate her new job.
 *
 * Pure layout and state here; the castle, the effects and the cinematic live beside it.
 */

export const DONE_FLAG = 'celebration-done';

export type Stage = 'invite' | 'done';
export const stageOf = (st: GameState): Stage => (st.flags.includes(DONE_FLAG) ? 'done' : 'invite');

/** The event's own objective while it waits for her; null once it has been celebrated. */
export function celebrationObjective(st: GameState, chariot: { x: number; z: number } | null): Objective | null {
  if (stageOf(st) === 'done' || !chariot) return null;
  const { girl, boy } = st.names;
  const tasks = [
    { id: 'chariot', text: 'Step into the unicorn chariot together', done: false, depth: 0, target: { kind: 'point' as const, x: chariot.x, z: chariot.z, region: 'meadow' as const }, hint: 'Walk up to the chariot and press E.' },
    { id: 'castle', text: 'Ride to the castle', done: false, depth: 0 },
    { id: 'dress', text: `Wear the dress made for ${girl}`, done: false, depth: 0 },
    { id: 'party', text: 'Celebrate with everyone', done: false, depth: 0 },
  ];
  return {
    questId: null,
    title: `A surprise for ${girl}`,
    goal: `${boy} has planned something special tonight. A unicorn chariot is waiting.`,
    main: true,
    tasks,
    next: tasks[0],
    step: [0, 0],
  };
}

export interface Lines { ride: string[]; wardrobe: string[]; venue: string[]; cake: [string, string, string, string] }

/** Every caption of the evening. */
export function lines(st: GameState): Lines {
  const { girl, boy } = st.names;
  return {
    ride: [
      `${boy} has planned something special.`,
      `${girl} rides in the chariot; ${boy} flies beside her on a winged unicorn, towards a castle no one has seen before.`,
    ],
    wardrobe: [
      `Inside, in a wardrobe of silk and starlight, a dress is being made just for ${girl}.`,
      'Thread by glowing thread — pink as the evening, scattered with stars, edged in rainbow.',
      `${girl} wears it, and it glows.`,
    ],
    venue: [
      `${boy} leads her out to the courtyard. People have come from every land.`,
      `Congratulations, ${girl}, on your new job!`,
    ],
    cake: [
      'A chocolate cake, as tall as a lantern.',
      `From across the table, ${boy} cuts it with the thread's light.`,
      `${boy} offers ${girl} the first piece…`,
      '…and everyone cheers, under the aurora and the rainbows.',
    ],
  };
}

