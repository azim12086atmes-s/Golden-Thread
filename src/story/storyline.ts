import { COMPANION_BY_ID } from '../caravan/caravan';
import type { GameState } from '../core/state';
import { REGION_BY_ID, type RegionId } from '../world/regions';

/**
 * The story of the game, told as a cinematic over real places in the world. It is about living:
 * going places, doing honest work, solving problems for people. Her new job is only a step: the
 * story is the life they live together afterwards — exploring while they live and own a home,
 * earning by helping, learning new skills, becoming part of the people they meet (the children
 * and animals who travel with them too), and staying connected to home. Pure data: the scene plays
 * it, the journal prints it, tests check it.
 */

export type Focus = 'landmark' | 'castle' | 'travellers' | 'market' | 'noor' | 'children' | 'pets';

export interface Shot {
  land: RegionId;
  focus: Focus;
  /** Hour of day for the shot. */
  hour: number;
  /** Seconds on screen. */
  dur: number;
  /** Camera orbit radius and height (metres), and how far it turns (radians over the shot). */
  radius: number;
  height: number;
  spin: number;
  lines: string[];
}

export const STORY_FLAG = 'story-2';

/** "Rosie and Teo", "Rosie, Teo and Mina". */
const names = (list: string[]) => list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;

export function storyline(st: GameState): Shot[] {
  const { girl, boy } = st.names;
  const partyWaits = !st.flags.includes('celebration-done');
  const pals = st.caravan.map((id) => COMPANION_BY_ID[id]).filter(Boolean);
  const kids = pals.filter((c) => c.kind === 'child');
  const pets = pals.filter((c) => c.kind === 'pet');
  const shots: Shot[] = [
    {
      land: 'meadow', focus: 'landmark', hour: 6.6, dur: 9, radius: 70, height: 24, spin: 0.35,
      lines: ['Every life is a journey.', 'We go to new places. We work. We solve problems. And we meet people who change us.'],
    },
    {
      land: 'indianorth', focus: 'market', hour: 10.5, dur: 10, radius: 10, height: 3.2, spin: 0.3,
      lines: ['In every town the market is waking. Fruit is weighed, cloth unrolled, tea poured for the first customers.', 'Every stall is somebody\'s livelihood, and everyone carries a problem that someone could help to solve. That is how an honest living is earned.'],
    },
    {
      land: 'london', focus: 'landmark', hour: 15, dur: 10, radius: 80, height: 28, spin: 0.3,
      lines: ['Work is one of the ways we care for each other:', 'a clock repaired, a meal cooked, a letter carried home. And every task we take on teaches us a new skill.'],
    },
    {
      land: 'meadow', focus: 'castle', hour: 18.6, dur: 10, radius: 110, height: 36, spin: 0.4,
      lines: [`${girl} has just secured her new job.`, 'It is a proud step, but it is only a step. The job is not the destination. The life they live together is.'],
    },
    {
      land: 'meadow', focus: 'travellers', hour: 8.5, dur: 12, radius: 9, height: 2.6, spin: 0.5,
      lines: [
        `${girl} and ${boy} are committed to each other. A golden thread joins them, and it glows brighter with every kindness they share.`,
        'Together they will keep exploring while they live: making a home of their own, earning by helping, learning new skills in every land.',
      ],
    },
  ];
  if (kids.length) shots.push({
    land: 'meadow', focus: 'children', hour: 8.7, dur: 10, radius: 4.5, height: 1.6, spin: 0.4,
    lines: [
      `They do not travel alone. Meet ${names(kids.map((k) => k.name))}, travelling with the caravan with their families' blessing.`,
      kids.map((k) => `${k.name}, off to ${REGION_BY_ID[k.destination].name}, ${k.blurb.charAt(0).toLowerCase()}${k.blurb.slice(1)}`).join(' '),
    ],
  });
  if (pets.length) shots.push({
    land: 'meadow', focus: 'pets', hour: 8.9, dur: 9, radius: 3.4, height: 1.1, spin: -0.4,
    lines: [
      `And ${names(pets.map((p) => `${p.name} the ${p.species === 'dove' ? 'bird' : p.species}`))}.`,
      pets.map((p) => p.blurb).join(' '),
    ],
  });
  shots.push(
    {
      land: 'meadow', focus: 'noor', hour: 9.2, dur: 11, radius: 7, height: 2.2, spin: 0.3,
      lines: [
        'Grandmother Noor: "There you both are. Everyone you meet on the road is carrying something. Help them carry it."',
        'Grandmother Noor: "Go and become part of the people out there. But stay connected to home: write to me, and come back to tell me everything."',
      ],
    },
    {
      land: 'mughal', focus: 'landmark', hour: 19.3, dur: 9, radius: 90, height: 30, spin: -0.35,
      lines: ['In every land a great lantern has dimmed, because people grew too busy to notice one another.', 'Every honest day\'s work, every skill learned and shared, and every kindness lights one again.'],
    },
    {
      land: 'meadow', focus: 'landmark', hour: 9.5, dur: 12, radius: 55, height: 18, spin: 0.3,
      lines: [
        'Your journey: live life together and keep exploring. Earn by helping, learn from every land, own a home, and light all twenty lanterns.',
        partyWaits
          ? 'A lifelong journey of bonding: with each other, with the people you meet, and with home. But first, tonight, there is something to celebrate.'
          : 'A lifelong journey of bonding: with each other, with the people you meet, and with home.',
      ],
    },
  );
  return shots;
}
