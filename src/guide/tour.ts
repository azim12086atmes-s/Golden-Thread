import type { GameState } from '../core/state';
import { LEVEL_XP } from '../economy/items';
import { COMPANION_BY_ID, STARTING_CARAVAN } from '../caravan/caravan';

/**
 * The guided tour (owner, 2026-09-30): letters from Grandmother Noor that walk the travellers
 * through everything the journey holds, one thing at a time — dressing the family, meeting a pet,
 * befriending an animal and a person, caring for someone, working, starting a business, making a
 * home, finding their parents a home, and going further afield. Each letter says why it matters
 * and how to do it; "Show me" opens the right panel or lights the golden trail to the right place,
 * and the letter is ticked off the moment they have really done it (so the tour never asks for
 * anything twice). They can put a letter aside for later, or put the whole tour away.
 *
 * Pure rules over GameState (tests/tour.test.ts); the UI draws the letter and the guide the trail.
 */

/** Where "Show me" points: a panel to open, or a place to light the way to. */
export type ShowMe =
  | { panel: 'wardrobe' | 'care' | 'finder' | 'work' | 'homes' | 'map' | 'vehicles' | 'journal' }
  | { place: 'stray' | 'needy' | 'animal' | 'friend' | 'plot' | 'keeper' };

export interface TourStep {
  id: string;
  icon: string;
  title: string;
  /** Grandmother Noor's letter: why this matters. */
  letter: string;
  /** Plainly, how to do it. */
  how: string;
  show?: ShowMe;
  /** Only once this is true is the letter sent (a step that needs something first). */
  ready?: (st: GameState) => boolean;
  done: (st: GameState) => boolean;
}

const learnt = (st: GameState) => Object.values(st.skills).some((xp) => xp >= LEVEL_XP[1]);
const newPet = (st: GameState) => st.caravan.some((id) => COMPANION_BY_ID[id]?.kind === 'pet' && !STARTING_CARAVAN.includes(id));

export const TOUR: TourStep[] = [
  {
    id: 'dress', icon: '👗', title: 'Dress the family',
    letter: 'Before you go far, look after one another. Choose what you wear together, and dress your brothers and sisters too. Every land has its own clothes; wear them with respect and people will feel you belong.',
    how: 'Open the dressing room (C). Choose a name at the top, then an outfit from the shelves. Drag the view to turn around.',
    show: { panel: 'wardrobe' },
    done: (st) => Object.keys(st.companionOutfits).length > 0 || st.outfits.girl !== 'g-kurti-jeans' || st.outfits.boy !== 'b-kurta-jeans',
  },
  {
    id: 'keeper', icon: '🏮', title: 'Learn a craft from a Keeper',
    letter: 'In every land there is a Keeper who knows its craft. Sit with them and listen. What they teach you is how you will earn your bread and help others on the road.',
    how: 'Follow the golden trail to the Keeper and press E to talk. They teach you their craft when you first meet.',
    show: { place: 'keeper' },
    done: learnt,
  },
  {
    id: 'pet', icon: '🐾', title: 'Meet a pet who needs a home',
    letter: 'Round every town square waits an animal hoping for a family. Bring them the food they love, and they will come along with you — and keep you company on long roads.',
    how: 'Follow the trail to a pet at the plaza, press E, and offer the food it likes (you can buy food at the market). Four pets can travel with you.',
    show: { place: 'stray' },
    done: newPet,
  },
  {
    id: 'animal', icon: '🦌', title: 'Befriend an animal',
    letter: 'The creatures of each land are shy at first. Be gentle, bring what they eat, and they will trust you. Friends can later live on land you own.',
    how: 'Walk up to an animal and press E to offer it its food. The panel tells you what it eats.',
    show: { place: 'animal' },
    done: (st) => Object.values(st.animals).some((a) => a.befriended),
  },
  {
    id: 'friend', icon: '💛', title: 'Make a friend',
    letter: 'Everyone you meet on the road is carrying something. Stop and ask. Help them carry it, and they will remember you, write to you, and one day help you too.',
    how: 'Talk to the people in town (E). Help with what they need and they become friends; their letters arrive under Messages (N).',
    show: { place: 'friend' },
    done: (st) => Object.values(st.friends).some((f) => f.befriended),
  },
  {
    id: 'care', icon: '🤲', title: 'Care for someone in need',
    letter: 'In each town there is someone who has nobody — a child, an elder, someone without a roof. Find them. Pay for their days in coins or in kind, and give them a home when you can. This is the heart of the journey.',
    how: 'The People finder (Y) shows who needs help. Talk to them, then give days of care from Care & sponsorship (K).',
    show: { place: 'needy' },
    done: (st) => st.sponsored.length > 0,
  },
  {
    id: 'work', icon: '💼', title: 'Work with your hands',
    letter: 'Honest work is a gift to others and to yourselves. Every land has employers and people with small jobs to be done. The more you do, the more you can do.',
    how: 'Open Work & services (U): work a shift at an employer, or take a freelance job that fits your skills.',
    show: { panel: 'work' },
    done: (st) => Object.keys(st.work.worked).length > 0 || st.work.done.length > 0,
  },
  {
    id: 'business', icon: '🏪', title: 'Grow something of your own',
    letter: 'A business begins with your own two hands. Take the orders yourself; as people come back, teach the trade to someone who needs work, and one day let a trusted one manage it.',
    how: 'In Work & services (U), under Your businesses, begin a trade you know in this town and take its first orders.',
    show: { panel: 'work' },
    ready: learnt,
    done: (st) => st.businesses.length > 0,
  },
  {
    id: 'home', icon: '🏡', title: 'Make a home',
    letter: 'Travellers need somewhere to come back to. Buy a little land, build, grow food, and make room for the people you care for.',
    how: 'Homes & land (L) lists plots for sale; the trail leads to one. Buy the land, or a home already built in the land\'s own style.',
    show: { place: 'plot' },
    done: (st) => Object.keys(st.plots).length > 0,
  },
  {
    id: 'parents', icon: '👪', title: 'A home for your parents',
    letter: 'Do not forget where you came from. Give your mother and father a home — and his — and visit them whenever you pass. A parent\'s blessing makes every road lighter.',
    how: 'In Homes & land (L), choose a home you own and give it to your parents or to his. Then Visit them from there whenever you like.',
    show: { panel: 'homes' },
    ready: (st) => Object.keys(st.plots).length > 0,
    done: (st) => !!(st.parents?.hers || st.parents?.his),
  },
  {
    id: 'discover', icon: '🗺️', title: 'Go beyond the hills',
    letter: 'There are twenty lands on this island, each with its own sky, its own science, its own people. Each has a Keeper, a lantern to light, and something to learn. Go and see.',
    how: 'Walk, fly on the cape (F), or choose a way to travel (V): the coach and air taxi from any bus stop, ferries from the harbours. The map (M) shows the lands you know.',
    show: { panel: 'map' },
    done: (st) => st.discovered.length >= 3,
  },
  {
    id: 'lantern', icon: '✨', title: 'Light a land\'s lantern',
    letter: 'When you have helped a Keeper with what their land needs, you light its lantern together. Every lantern lit brings the island closer, and brings you closer too.',
    how: 'Follow the objective panel (O): it always shows the next step of the land\'s story.',
    show: { panel: 'journal' },
    done: (st) => st.lanterns.length > 0,
  },
];

export const TOUR_BY_ID: Record<string, TourStep> = Object.fromEntries(TOUR.map((s) => [s.id, s]));

/** The letter to show now: the first step not yet done, not put aside and ready to send; null when the tour is away or over. */
export function currentStep(st: GameState): TourStep | null {
  if (st.tour.off) return null;
  return TOUR.find((s) => !s.done(st) && !st.tour.later.includes(s.id) && (!s.ready || s.ready(st))) ?? null;
}

/** How far along: letters done, of all. */
export function tourProgress(st: GameState): { done: number; of: number } {
  return { done: TOUR.filter((s) => s.done(st)).length, of: TOUR.length };
}

/** Put one letter aside (it comes back when "Show all letters" is chosen in the guidebook). */
export function later(st: GameState, id: string): void {
  if (TOUR_BY_ID[id] && !st.tour.later.includes(id)) st.tour.later.push(id);
}

/** Put the tour away, or bring it back with every letter that was put aside. */
export function setTour(st: GameState, on: boolean): void {
  st.tour.off = !on;
  if (on) st.tour.later = [];
}
