import { NEED_LABEL, PERSON_BY_ID, sponsorOf, type NeedKind } from '../charity/charity';
import type { GameState } from '../core/state';
import { PEOPLE_BY_ID } from '../npc/people';
import type { RegionId } from '../world/regions';

/**
 * Everyone who can be your friend: the residents of each town (npc/people.ts) and the people in
 * need you meet on its pavements (charity.ts). Meeting someone in need makes them a friend at once
 * — they write to you like any friend, about their days and their hopes, and thank you for your care.
 */
export interface FriendDef { id: string; name: string; region: RegionId; role: string; letters: string[]; inNeed: boolean }

/** What people in need write, by who they are. {g} = her name, {b} = his. */
const NEED_LETTERS: Record<NeedKind, string[]> = {
  orphan: [
    'I practised my letters today — I wrote both your names! {g} and {b}.',
    'The other children asked who my friends are. I told them about you.',
    'I drew a picture of your van. Will you come and see it?',
  ],
  elder: [
    'The mornings are quiet. It was good to have company the other day.',
    'I told the young ones stories of how this town used to be. They listened!',
    'Take care on the road, both of you. An old heart worries.',
  ],
  homeless: [
    'I slept well last night. It has been a long time since I could say that.',
    'I asked about work at the market today. Wish me luck.',
    'Thank you for stopping for me, when so many walk past.',
  ],
  family: [
    'The children laughed at supper tonight. It has been a while.',
    'We are managing, a day at a time. Your kindness helps more than you know.',
    'Our little one wants to know when {g} and {b} will visit again.',
  ],
};
const CARED_FOR = ['Because of you we ate well this week. Thank you, {g} and {b}.', 'Your care reached us today. May it return to you many times over.'];

export function friendDef(id: string): FriendDef | undefined {
  const p = PEOPLE_BY_ID[id];
  if (p) return { id, name: p.name, region: p.region, role: p.role, letters: p.letters, inNeed: false };
  const n = PERSON_BY_ID[id];
  if (n) return { id, name: n.name, region: n.land, role: NEED_LABEL[n.kind].name, letters: NEED_LETTERS[n.kind], inNeed: true };
  return undefined;
}

/** The letters someone writes now: people in your care also thank you for it. */
export function lettersOf(st: GameState, id: string): string[] {
  const f = friendDef(id);
  if (!f) return [];
  return f.inNeed && sponsorOf(st, id) ? [...f.letters, ...CARED_FOR] : f.letters;
}

/** Make someone a friend straight away (people in need, when you meet them). Returns true if new. */
export function befriend(st: GameState, id: string): boolean {
  const f = (st.friends[id] ??= { hearts: 0, befriended: false, lastMessageAt: st.minutes });
  if (f.befriended) return false;
  f.hearts = Math.max(f.hearts, 2);
  f.befriended = true;
  f.lastMessageAt = st.minutes;
  return true;
}

/** Older journeys: everyone in need you have already met (or care for) becomes a friend. */
export function befriendMet(st: GameState): void {
  for (const id of [...st.met, ...st.sponsored.map((s) => s.id)]) if (PERSON_BY_ID[id]) befriend(st, id);
}
