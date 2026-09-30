import { COMPANION_BY_ID } from '../caravan/caravan';
import type { GameState } from '../core/state';
import { REGION_BY_ID, type RegionId } from '../world/regions';

/**
 * The story of the game, told as a cinematic over real places in the world. Her new job is how
 * she and her beloved enter the world — a doorway, not the destination. Through it they learn, build
 * and contribute to the society they join, while their love for each other grows as a couple who
 * intend to marry. They become part of the people they meet: adopting everyone as family, easing
 * hardships, giving opportunities and making new ones, and never stopping learning and helping.
 * As they bond with each other they bond with everyone else: each makes the other part of
 * themselves, and together they make others part of them both. Pure data: the scene plays it,
 * the journal prints it, tests check it.
 */

export type Focus = 'landmark' | 'castle' | 'travellers' | 'market' | 'noor' | 'siblings' | 'children' | 'pets';

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

/** Bumped when the story changes, so everyone sees the new opening once. */
export const STORY_FLAG = 'story-5';

/** "Aasima and Maryam", "Aasima, Suvaibia and Maryam". */
const names = (list: string[]) => list.length <= 1 ? list.join('') : `${list.slice(0, -1).join(', ')} and ${list[list.length - 1]}`;

export function storyline(st: GameState): Shot[] {
  const { girl, boy } = st.names;
  const partyWaits = !st.flags.includes('celebration-done');
  const pals = st.caravan.map((id) => COMPANION_BY_ID[id]).filter(Boolean);
  const kids = pals.filter((c) => c.kind === 'child');
  const sibs = pals.filter((c) => c.kind === 'sibling');
  const sisters = sibs.filter((c) => c.who === 'girl').map((c) => c.name), brothers = sibs.filter((c) => c.who === 'boy').map((c) => c.name);
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
      lines: [`${girl} has just secured her new job — and with it, she and her beloved are entering the world.`, 'Through it, both of you will learn, build and contribute to the people around you. It is a proud step, but only a step: the job is not the destination. The life you build together is.'],
    },
    {
      land: 'meadow', focus: 'travellers', hour: 8.5, dur: 12, radius: 9, height: 2.6, spin: 0.5,
      lines: [
        `${girl} and ${boy} are committed to each other and intend to marry. A golden thread joins them, and their love grows brighter with every kindness they share.`,
        'Together, both of you will keep learning while you live: making a home of your own, earning by helping, learning new skills in every land and giving back to the society you join.',
      ],
    },
    {
      land: 'islamic', focus: 'landmark', hour: 10.5, dur: 11, radius: 75, height: 26, spin: 0.3,
      lines: [
        'Both of you will adopt everyone you meet as family: the orphan, the elder, the homeless and the family in need. You will ease hardships and open doors, giving opportunities and making new ones where there were none.',
        'And as you bond with each other, you bond with everyone else. Each of you makes the other part of yourself; together, both of you make everyone you meet part of you both.',
      ],
    },
  ];
  if (sibs.length) shots.push({
    land: 'meadow', focus: 'siblings', hour: 8.6, dur: 12, radius: 6, height: 2, spin: 0.45,
    lines: [
      `You do not travel alone. Your family comes with you: ${names([...(sisters.length ? [`your sisters ${names(sisters)}`] : []), ...(brothers.length ? [`your brother${brothers.length > 1 ? 's' : ''} ${names(brothers)}`] : [])])}.`,
      `${sibs.map((c) => `${c.name} ${c.blurb.charAt(0).toLowerCase()}${c.blurb.slice(1)}`).join(' ')} Wherever the road goes, they go too — on foot beside you, on their own carpet when you fly, and at every celebration.`,
    ],
  });
  if (kids.length) shots.push({
    land: 'meadow', focus: 'children', hour: 8.7, dur: 10, radius: 4.5, height: 1.6, spin: 0.4,
    lines: [
      `Meet ${names(kids.map((k) => k.name))}, travelling with the caravan with their families' blessing.`,
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
        sibs.length
          ? `Grandmother Sarvatara: "There you all are. Shumaela, my dear, come here. ${names(sibs.map((c) => c.name))} — look after these two, and let them look after you. Everyone you meet on the road is carrying something. Help them carry it."`
          : 'Grandmother Sarvatara: "There you both are. Shumaela, my dear, come here. Everyone you meet on the road is carrying something. Help them carry it."',
        'Grandmother Sarvatara: "Go and become part of the people out there. But stay connected to home: write to me, and come back to tell me everything."',
      ],
    },
    {
      land: 'mughal', focus: 'landmark', hour: 19.3, dur: 9, radius: 90, height: 30, spin: -0.35,
      lines: ['In every land a great lantern has dimmed, because people grew too busy to notice one another.', 'Every honest day\'s work, every skill learned and shared, and every kindness lights one again.'],
    },
    {
      land: 'meadow', focus: 'landmark', hour: 9.5, dur: 12, radius: 55, height: 18, spin: 0.3,
      lines: [
        `Your journey: live life together and keep exploring${sibs.length ? ', with your family beside you' : ''}. Learn, build and contribute; earn by helping, adopt everyone as family, own a home, and light all twenty lanterns.`,
        partyWaits
          ? 'A lifelong journey of bonding: with each other, with the people you meet, and with home. But first, tonight, there is something to celebrate.'
          : 'A lifelong journey of bonding: with each other, with the people you meet, and with home.',
      ],
    },
  );
  return shots;
}
