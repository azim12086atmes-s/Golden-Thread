import { castleBase } from '../world/terrain';
import type { GameState } from '../core/state';
import type { Objective } from '../guide/objectives';
import { PEOPLE, type NpcDef } from '../npc/people';
import { REGIONS } from '../world/regions';
import { CASTLE_SITE } from '../world/terrain';

/**
 * The celebration evening — the special event of this release. He has planned it for her: a
 * unicorn chariot, a castle no one has seen before, a gown made just for her in its wardrobe, and
 * a party where people from every land gather to celebrate her new job.
 *
 * Pure layout and state here; the castle, the effects and the cinematic live beside it.
 */

export const DONE_FLAG = 'celebration-done';

/** The castle faces south (+z), towards the heart of the meadow. All positions are world metres. */
export const CASTLE = {
  keep: { x: CASTLE_SITE.x, z: CASTLE_SITE.z - 30, w: 34, d: 24 },
  /** The courtyard where the party is held. */
  venue: { x: CASTLE_SITE.x, z: CASTLE_SITE.z + 20, r: 27 },
  /** The rose-arched aisle runs from the chariot's landing up to the cake. */
  aisle: { x: CASTLE_SITE.x, from: CASTLE_SITE.z + 50, to: CASTLE_SITE.z + 8 },
  landing: { x: CASTLE_SITE.x, z: CASTLE_SITE.z + 56 },
} as const;

/** Where the travellers stand for the cake: at the head of the aisle, facing the castle. */
export const CAKE_SPOT = { x: CASTLE.aisle.x, z: CASTLE.aisle.to + 3 } as const;

export type Stage = 'invite' | 'done';
export const stageOf = (st: GameState): Stage => (st.flags.includes(DONE_FLAG) ? 'done' : 'invite');

/**
 * Guests: people from every land, three from the meadow where the travellers began. Only the two
 * travellers are Muslim; every guest comes as themselves, in their own land's clothes.
 */
export function guests(): NpcDef[] {
  const out: NpcDef[] = [];
  for (const r of REGIONS) {
    if (r.id === 'skyisles') continue;
    const here = PEOPLE.filter((p) => p.region === r.id);
    out.push(...here.slice(0, r.id === 'meadow' ? 3 : 1));
  }
  return out;
}

/** A guest's place: facing the aisle in two rows, then a crescent behind the cake. */
export function guestSpot(i: number, n: number): { x: number; z: number; face: number } {
  const rows = Math.min(n, 24);
  if (i < rows) {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    const z = CASTLE.aisle.from - 4 - k * 3.1;
    const x = CASTLE.aisle.x + side * (4.2 + (k % 2) * 1.2);
    return { x, z, face: side > 0 ? -Math.PI / 2 : Math.PI / 2 };
  }
  const j = i - rows, m = Math.max(1, n - rows);
  const a = Math.PI * (0.25 + (0.5 * (j + 0.5)) / m);
  return { x: CAKE_SPOT.x + Math.cos(a) * 7, z: CAKE_SPOT.z - 1 - Math.sin(a) * 5, face: 0 };
}

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

export interface Lines { ride: string[]; wardrobe: string[]; venue: string[]; cake: [string, string, string, string]; joy: string }

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
      `A chocolate cake as tall as a lantern — and her friends, Musadiq, Farzan, Zaid, Zidane, Varna, Srushti, the twins Shruti and Smruti, and Shifa, with Aasima, Suvaibia, Maryam and Abdur Rahim, circling ${girl} as though she were the bride.`,
      `From across the table, ${boy} cuts it with the thread's light.`,
      `${boy} offers ${girl} the first piece…`,
      '…and everyone cheers, under the aurora and the rainbows.',
    ],
    joy: `${girl} tastes it — and twirls, round and round, amazed and laughing, as her friends circle and the sparks rise.`,
  };
}

/** The castle's great doors (front of the keep): step inside to its great hall (world/interiors3d.ts). */
export const CASTLE_DOOR = {
  id: 'castle:hall', land: 'meadow', kind: 'castle', r: 1, facing: 0, name: 'the celebration castle',
  x: CASTLE.keep.x, z: CASTLE.keep.z + CASTLE.keep.d / 2 + 1.4, get y(): number { return castleBase(); },
};
