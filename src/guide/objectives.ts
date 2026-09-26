import { SPECIES, type SpeciesId } from '../animals/AnimalModel';
import type { GameState } from '../core/state';
import { count, level } from '../economy/economy';
import { ITEMS, LEVEL_XP, RECIPES, SKILLS, type SkillId } from '../economy/items';
import { PEOPLE_BY_ID, keeperOf } from '../npc/people';
import { QUESTS, QUEST_BY_ID, type QuestDef, type Step } from '../quests/quests';
import { REGIONS, REGION_BY_ID, regionCenter, type RegionId } from '../world/regions';

/**
 * The guide: turns "what the story wants" into small, concrete things to do next, each with a
 * place to go. Pure — state in, plan out — so it is recomputed whenever anything changes and never
 * drifts from the real quest state. Game code resolves a Target to a live world position.
 */

export type Target =
  | { kind: 'npc'; npc: string; region: RegionId }
  | { kind: 'region'; region: RegionId }
  | { kind: 'resource'; item: string; region: RegionId }
  | { kind: 'lantern'; region: RegionId }
  | { kind: 'animal'; species: SpeciesId; region: RegionId };

export interface Task {
  /** Stable within a plan, so the UI can notice when the next task changes. */
  id: string;
  text: string;
  done: boolean;
  /** Indent level: 0 for the step's own tasks, 1+ for what a craft needs. */
  depth: number;
  target?: Target;
  /** How to do it, e.g. which key to press. */
  hint?: string;
}

export interface Objective {
  /** Null when nothing is underway and the guide is suggesting where to begin. */
  questId: string | null;
  title: string;
  /** The current quest step, in the story's words. */
  goal: string;
  main: boolean;
  tasks: Task[];
  next: Task | null;
  /** Quest step number (1-based) and total steps; [0, 0] for suggestions. */
  step: [number, number];
}

export interface Where {
  region: RegionId;
  x: number;
  z: number;
}

const MAX_DEPTH = 3;

// ───────────────────────── where things are ─────────────────────────

const dist = (w: Where, r: RegionId) => {
  const c = regionCenter(REGION_BY_ID[r]);
  return Math.hypot(c.x - w.x, c.z - w.z);
};

/** The nearest of some lands, preferring the one the travellers stand in. */
export function nearestLand(ids: readonly RegionId[], w: Where): RegionId | undefined {
  if (ids.includes(w.region)) return w.region;
  return [...ids].sort((a, b) => dist(w, a) - dist(w, b))[0];
}

/** Lands where an item can be gathered. */
export function landsWith(item: string): RegionId[] {
  return REGIONS.filter((r) => r.materials.includes(item)).map((r) => r.id);
}

/** Lands where a species lives in the wild. */
export function landsWithAnimal(species: string): RegionId[] {
  return REGIONS.filter((r) => r.fauna.includes(species)).map((r) => r.id);
}

/** Compass words from one land towards another: "north-east", or "" if they are the same. */
export function direction(from: { x: number; z: number }, to: { x: number; z: number }): string {
  const dx = to.x - from.x, dz = to.z - from.z;
  if (Math.hypot(dx, dz) < 1) return '';
  // North is -z (row 0 is the north), east is +x.
  const a = Math.atan2(dx, -dz);
  const names = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];
  return names[(Math.round(a / (Math.PI / 4)) + 8) % 8];
}

const landName = (r: RegionId) => REGION_BY_ID[r].name;
const itemName = (i: string) => ITEMS[i]?.name ?? i;
const itemIcon = (i: string) => ITEMS[i]?.icon ?? '';
const qtyText = (have: number, need: number) => ` (${Math.min(have, need)}/${need})`;

function travelTask(id: string, to: RegionId, st: GameState, w: Where, depth: number): Task {
  const here = w.region === to;
  const known = st.discovered.includes(to);
  const dir = direction(w, regionCenter(REGION_BY_ID[to]));
  return {
    id,
    text: `Travel to ${landName(to)}`,
    done: here,
    depth,
    target: { kind: 'region', region: to },
    hint: known ? 'Follow the golden motes, fly with F, or open the map (M) to ride there.' : `It lies to the ${dir}. Follow the golden motes; fly with F.`,
  };
}

// ───────────────────────── what an item needs ─────────────────────────

/** The Keeper nearest to the travellers who teaches a skill. */
function teacher(skill: SkillId, w: Where): RegionId | undefined {
  return nearestLand(REGIONS.filter((r) => r.skill === skill && r.id !== 'skyisles').map((r) => r.id), w);
}

/**
 * Tasks that end with `qty` of `item` in the bag. Checks off as the bag fills: if the item is
 * already there, its whole sub-tree reads as done.
 */
export function obtain(st: GameState, item: string, qty: number, w: Where, depth = 0, key = item): Task[] {
  const have = count(st, item);
  const satisfied = have >= qty;
  const recipe = RECIPES.find((r) => r.out === item);

  if (!recipe || depth >= MAX_DEPTH) {
    const lands = landsWith(item);
    const land = nearestLand(lands, w);
    if (!land) {
      // Nothing to gather: crops come from a farm, everything else from friends and markets.
      const farm = ITEMS[item]?.kind === 'crop';
      return [{ id: `get:${key}`, text: `${farm ? 'Grow' : 'Find'} ${itemIcon(item)} ${itemName(item)}${qtyText(have, qty)}`, done: satisfied, depth, hint: farm ? 'Plant seeds in a farm bed on land you own (B).' : 'Friends and markets may have some.' }];
    }
    return [{
      id: `get:${key}`,
      text: `Gather ${itemIcon(item)} ${itemName(item)}${qtyText(have, qty)}${land === w.region ? '' : ` in ${landName(land)}`}`,
      done: satisfied,
      depth,
      target: { kind: 'resource', item, region: land },
      hint: 'Walk up to the glowing mote and press E. Keepers also sell their land\'s materials.',
    }];
  }

  const crafts = Math.max(1, Math.ceil((satisfied ? qty : qty - have) / recipe.qty));
  const tasks: Task[] = [];
  for (const [need, n] of Object.entries(recipe.needs)) {
    const sub = obtain(st, need, n * crafts, w, depth + 1, `${key}>${need}`);
    tasks.push(...(satisfied ? sub.map((t) => ({ ...t, done: true })) : sub));
  }

  const lvl = level(st, recipe.skill);
  if (lvl < recipe.level) {
    const skill = SKILLS[recipe.skill];
    if (lvl === 0 && recipe.level <= 1) {
      const land = teacher(recipe.skill, w);
      const k = land ? keeperOf(land) : undefined;
      tasks.push({
        id: `learn:${recipe.skill}`,
        text: k ? `Learn ${skill.icon} ${skill.name} from ${k.name} in ${landName(land!)}` : `Learn ${skill.name}`,
        done: satisfied,
        depth: depth + 1,
        target: k && land ? { kind: 'npc', npc: k.id, region: land } : undefined,
        hint: 'Every Keeper teaches their craft the first time you talk.',
      });
    } else {
      const xp = st.skills[recipe.skill], goal = LEVEL_XP[recipe.level];
      tasks.push({
        id: `practise:${recipe.skill}:${recipe.level}`,
        text: `Practise ${skill.icon} ${skill.name} to level ${recipe.level} (${xp}/${goal} xp)`,
        done: satisfied,
        depth: depth + 1,
        hint: `Craft simpler ${skill.name.toLowerCase()} goods in your bag (I). Each one teaches you more.`,
      });
    }
  }

  tasks.push({
    id: `craft:${key}`,
    text: `Make ${itemIcon(item)} ${itemName(item)}${qtyText(have, qty)}`,
    done: satisfied,
    depth,
    hint: `Open your bag (I) and press Make beside ${itemName(item)} — it is marked ✦.`,
  });
  return tasks;
}

// ───────────────────────── one quest step → tasks ─────────────────────────

function stepTasks(st: GameState, q: QuestDef, s: Step, w: Where): Task[] {
  switch (s.kind) {
    case 'talk': {
      const p = PEOPLE_BY_ID[s.npc];
      const land = p?.region ?? q.region;
      return [
        travelTask('go', land, st, w, 0),
        { id: `talk:${s.npc}`, text: `Talk to ${p?.name ?? s.npc}`, done: false, depth: 0, target: { kind: 'npc', npc: s.npc, region: land }, hint: 'Walk up to them and press E.' },
      ];
    }
    case 'deliver': {
      const p = PEOPLE_BY_ID[s.npc];
      const land = p?.region ?? q.region;
      return [
        ...obtain(st, s.item, s.qty, w),
        travelTask('go', land, st, w, 0),
        { id: `give:${s.npc}`, text: `Give ${p?.name ?? s.npc} ${s.qty > 1 ? `${s.qty}× ` : ''}${itemIcon(s.item)} ${itemName(s.item)}`, done: false, depth: 0, target: { kind: 'npc', npc: s.npc, region: land }, hint: 'Talk to them (E) and choose Give.' },
      ];
    }
    case 'gather':
    case 'craft':
      return obtain(st, s.item, s.qty, w);
    case 'visit':
      return [travelTask('go', s.region, st, w, 0)];
    case 'befriend': {
      const sp = SPECIES[s.species];
      const lands = landsWithAnimal(s.species);
      const land = (lands.includes(q.region) ? q.region : nearestLand(lands, w)) ?? q.region;
      return [
        ...obtain(st, sp.diet, 1, w),
        travelTask('go', land, st, w, 0),
        { id: `befriend:${s.species}`, text: `Offer ${itemIcon(sp.diet)} ${itemName(sp.diet)} to a ${sp.name}`, done: false, depth: 0, target: { kind: 'animal', species: s.species, region: land }, hint: 'Walk up gently and press E.' },
      ];
    }
    case 'lantern':
      return [
        travelTask('go', s.region, st, w, 0),
        { id: `lantern:${s.region}`, text: `Light the lantern of ${landName(s.region)} together`, done: false, depth: 0, target: { kind: 'lantern', region: s.region }, hint: 'Walk to the great landmark at the heart of the land and press E.' },
      ];
  }
}

// ───────────────────────── choosing what to show ─────────────────────────

export function isAvailable(st: GameState, q: QuestDef): boolean {
  if (st.quests[q.id]) return false;
  if (q.after?.some((a) => st.quests[a]?.status !== 'done')) return false;
  if (q.lanternsNeeded && st.lanterns.length < q.lanternsNeeded) return false;
  return true;
}

export function activeQuests(st: GameState): QuestDef[] {
  return QUESTS.filter((q) => st.quests[q.id]?.status === 'active');
}

/** The quest the guide follows: the one the player chose, else the main story, else any. */
export function trackedQuest(st: GameState): QuestDef | undefined {
  const act = activeQuests(st);
  return act.find((q) => q.id === st.tracked) ?? act.find((q) => q.main) ?? act[0];
}

function finish(o: Omit<Objective, 'next'>): Objective {
  return { ...o, next: o.tasks.find((t) => !t.done) ?? null };
}

/** When nothing is underway: point at the next chapter of the story, or at someone to help. */
function suggestion(st: GameState, w: Where): Objective {
  const open = QUESTS.filter((q) => isAvailable(st, q));
  const byNear = (a: QuestDef, b: QuestDef) => dist(w, a.region) - dist(w, b.region);
  const main = open.filter((q) => q.main).sort(byNear)[0];
  const pick = main ?? open.sort(byNear)[0];
  if (pick) {
    const p = PEOPLE_BY_ID[pick.giver];
    return finish({
      questId: null,
      title: main ? `Next chapter: ${pick.title}` : `Someone needs help: ${pick.title}`,
      goal: `${p?.name ?? 'Someone'} in ${landName(pick.region)} is waiting for you.`,
      main: !!main,
      step: [0, 0],
      tasks: [
        travelTask('go', pick.region, st, w, 0),
        { id: `meet:${pick.giver}`, text: `Meet ${p?.name ?? pick.giver} (look for ❗)`, done: false, depth: 0, target: { kind: 'npc', npc: pick.giver, region: p?.region ?? pick.region }, hint: 'Talk to them (E) and accept their request.' },
      ],
    });
  }
  const finale = QUEST_BY_ID['main-skyisles'];
  if (finale && !st.quests[finale.id] && finale.lanternsNeeded && st.lanterns.length < finale.lanternsNeeded) {
    const unlit = REGIONS.filter((r) => r.id !== 'skyisles' && !st.lanterns.includes(r.id)).map((r) => r.id);
    const land = nearestLand(unlit, w);
    return finish({
      questId: null,
      title: 'The Great Lantern waits',
      goal: `Light ${finale.lanternsNeeded - st.lanterns.length} more lanterns before climbing to the Sky Isles.`,
      main: true,
      step: [0, 0],
      tasks: land ? [travelTask('go', land, st, w, 0)] : [],
    });
  }
  return finish({ questId: null, title: 'Wander freely', goal: 'Every lantern you could light is lit. Visit friends, build, and explore.', main: false, step: [0, 0], tasks: [] });
}

/** The objective the guide shows right now. */
export function currentObjective(st: GameState, w: Where): Objective {
  const q = trackedQuest(st);
  if (!q) return suggestion(st, w);
  const p = st.quests[q.id];
  const s = q.steps[p.step];
  const goal = s.text.replace('{item}', 'item' in s ? itemName(s.item) : '');
  return finish({ questId: q.id, title: q.title, goal, main: !!q.main, step: [p.step + 1, q.steps.length], tasks: stepTasks(st, q, s, w) });
}

/** Where a target is when its person or thing is not streamed in yet. */
export function targetAnchor(t: Target): { x: number; z: number } {
  const c = regionCenter(REGION_BY_ID[t.region]);
  if (t.kind === 'npc') {
    const at = PEOPLE_BY_ID[t.npc]?.at;
    if (at) return { x: c.x + at[0], z: c.z + at[1] };
  }
  if (t.kind === 'lantern') return c;
  if (t.kind === 'npc' || t.kind === 'region') {
    const k = keeperOf(t.region).at ?? [0, 30];
    return { x: c.x + k[0], z: c.z + k[1] };
  }
  return c;
}

/** Items the current plan wants crafted, for highlighting in the bag. */
export function wantedCrafts(o: Objective): Set<string> {
  return new Set(o.tasks.filter((t) => !t.done && t.id.startsWith('craft:')).map((t) => t.id.slice(6).split('>').pop()!));
}

/** Cycle the tracked quest through everything underway. Returns the new id, or '' if none. */
export function cycleTracked(st: GameState): string {
  const act = activeQuests(st);
  if (!act.length) return (st.tracked = '');
  const cur = trackedQuest(st);
  const i = act.findIndex((q) => q.id === cur?.id);
  return (st.tracked = act[(i + 1) % act.length].id);
}
