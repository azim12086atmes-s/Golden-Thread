import { DAY_MINUTES, type GameState } from '../core/state';
import { PLOT_BY_ID } from '../housing/housing';
import { SITE_BY_ID, instituteAt, isEmployed } from '../institutions/institutions';
import type { RegionId } from '../world/regions';
import { addItem, level } from './economy';
import { ITEMS, LEVEL_XP } from './items';
import { WORKERS, WORKER_BY_ID, roleTitle } from './workers';

/**
 * Crews (owner's brief — NEXT_WORK C3: "builders: constructing a home or institution takes time;
 * hiring a builder speeds it up … hire people to lay tents, weave fabric"). A builder or tent-layer
 * you employ in a land can be put to work on something being built there — an institute's next
 * stage or a new floor on your home — and cuts what is left of the time, more the more skilled
 * they are. You can lend a hand yourselves too: slower, but it is how your Building grows. Each
 * helper works on each project once a day. A weaver you employ turns the raw fibre you carry into
 * cloth each day: silk into shawls, fleece into rugs, wool and cotton into scarves.
 *
 * Pure rules over GameState (tests/crews.test.ts).
 */
export type Project = { kind: 'institute'; site: string } | { kind: 'floor'; plot: string };

const key = (p: Project) => (p.kind === 'institute' ? `inst:${p.site}` : `floor:${p.plot}`);
const today = (st: GameState) => Math.floor(st.minutes / DAY_MINUTES);
export const HAND_HOURS = 4;

/** Where a project is and when it will be finished (undefined when nothing is being built). */
export function projectOf(st: GameState, p: Project): { land: RegionId; until: number | undefined; set(v: number): void } | null {
  if (p.kind === 'institute') {
    const inst = instituteAt(st, p.site), site = SITE_BY_ID[p.site];
    if (!inst || !site) return null;
    return { land: site.land, until: inst.buildingUntil, set: (v) => { inst.buildingUntil = v; } };
  }
  const plot = PLOT_BY_ID[p.plot], h = st.homeFloors[p.plot];
  if (!plot || !h) return null;
  return { land: plot.region, until: h.buildingUntil, set: (v) => { h.buildingUntil = v; } };
}

/** The share of the remaining time a helper saves: a builder much more than a willing pair of hands. */
export const hurryShare = (who: 'you' | 'builder', lvl: number): number => who === 'builder' ? Math.min(0.75, 0.4 + lvl * 0.05) : Math.min(0.5, 0.15 + lvl * 0.05);

export const helpedToday = (st: GameState, p: Project, who: string): boolean => st.work.shifts[`hurry:${key(p)}:${who}`] === today(st);

/** Put a builder you employ — or yourselves (`'you'`) — to work on something being built. */
export function hurry(st: GameState, p: Project, who: 'you' | string): string | null {
  const pr = projectOf(st, p);
  if (!pr || pr.until === undefined || st.minutes >= pr.until) return 'Nothing is being built there.';
  if (helpedToday(st, p, who)) return who === 'you' ? 'You have lent a hand today — rest your backs.' : 'They have worked on it today.';
  let share: number;
  if (who === 'you') {
    share = hurryShare('you', level(st, 'building'));
    st.skills.building = Math.min(LEVEL_XP[LEVEL_XP.length - 1], st.skills.building + 10);
    st.minutes += HAND_HOURS * 60;
  } else {
    const w = WORKER_BY_ID[who];
    if (!w || w.role !== 'builder') return 'Only a builder can do that.';
    if (w.land !== pr.land) return `${w.name} works in another land.`;
    if (!isEmployed(st, w.id)) return `Employ ${w.name} first.`;
    share = hurryShare('builder', w.level);
  }
  const left = Math.max(0, pr.until - st.minutes);
  pr.set(st.minutes + Math.max(60, Math.round(left * (1 - share))));
  st.work.shifts[`hurry:${key(p)}:${who}`] = today(st);
  return null;
}

/** What a weaver makes from each fibre: [fibre, how many, cloth]. */
export const LOOM: Array<[string, number, string]> = [['silk', 2, 'shawl'], ['fleece', 2, 'rug'], ['wool', 2, 'scarf'], ['cotton', 2, 'scarf']];

export interface CrewNews { worker: string; text: string }

/** Each weaver you employ weaves once a day from the fibre you carry: a piece, or two when skilled. */
export function tickWeavers(st: GameState): CrewNews[] {
  const out: CrewNews[] = [];
  for (const w of WORKERS) {
    if (w.role !== 'weaver' || !isEmployed(st, w.id)) continue;
    const k = `weave:${w.id}`;
    if (st.work.shifts[k] === today(st)) continue;
    const made: string[] = [];
    for (let n = 0; n < 1 + Math.floor(w.level / 3); n++) {
      const r = LOOM.find(([fibre, need]) => (st.inventory[fibre] ?? 0) >= need);
      if (!r) break;
      st.inventory[r[0]] -= r[1];
      if (st.inventory[r[0]] <= 0) delete st.inventory[r[0]];
      addItem(st, r[2], 1);
      made.push(ITEMS[r[2]]?.name ?? r[2]);
    }
    if (!made.length) continue; // nothing to weave yet: they weave when you bring fibre
    st.work.shifts[k] = today(st);
    out.push({ worker: w.id, text: `${w.name} the ${roleTitle(w)} wove ${made.join(' and ')} for you.` });
  }
  return out;
}
