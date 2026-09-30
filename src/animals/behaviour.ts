import { SPECIES, type SpeciesId } from './AnimalModel';

/**
 * How the animals live their day (owner, 2026-09-30: "wildlife behaviour"). Grazers put their
 * heads down to crop the grass between wanders, and birds peck; herd animals keep together round
 * their herd; the day animals settle to rest at night while the night animals — foxes, cats,
 * the tanuki, the hedgehog, the kitsune, the moon rabbit — come out; and an animal the travellers
 * have befriended trots over to greet them when they come near, stopping a polite step away.
 * Machines (the clockwork, brass, robot and cyber animals) neither graze nor sleep.
 *
 * Pure rules (tests/behaviour.test.ts); Animals.ts moves the animals by them.
 */

export type Activity = 'wander' | 'graze' | 'rest' | 'greet';

const GRAZER_FORMS = new Set(['sheep', 'rabbit', 'deer', 'horse', 'reindeer', 'goat', 'cow', 'camel', 'buffalo', 'donkey', 'unicorn', 'panda']);
const HERD_FORMS = new Set(['sheep', 'deer', 'horse', 'reindeer', 'goat', 'cow', 'camel', 'buffalo', 'donkey', 'elephant']);
const PECKERS = new Set(['duck', 'dove', 'crane', 'peacock']);
const NOCTURNAL = new Set(['fox', 'arcticfox', 'fennec', 'aurorafox', 'fairyfox', 'kitsune', 'tanuki', 'raccoon', 'cat', 'lynx', 'streetcat', 'mau', 'starcat', 'hedgehog', 'moonrabbit']);
const MACHINE = /^(mecha|brass|robo|clock|cyber|hover)/;

const formOf = (id: SpeciesId): string => (SPECIES[id] as { form?: string }).form ?? id;

export const isMachine = (id: SpeciesId): boolean => MACHINE.test(id);
/** It lowers its head to the ground to feed (grazers crop grass, birds peck). */
export const grazes = (id: SpeciesId): boolean => !isMachine(id) && (GRAZER_FORMS.has(formOf(id)) || PECKERS.has(formOf(id)));
/** It keeps with its herd. */
export const herds = (id: SpeciesId): boolean => !isMachine(id) && HERD_FORMS.has(formOf(id));
/** It is about at night and rests by day. */
export const nocturnal = (id: SpeciesId): boolean => NOCTURNAL.has(id);

/** Is it awake at this hour (0–24)? Day animals from 6 to 20; night animals from 18 to 8. */
export function awake(id: SpeciesId, hour: number): boolean {
  if (isMachine(id)) return true;
  const h = ((hour % 24) + 24) % 24;
  return nocturnal(id) ? h >= 18 || h < 8 : h >= 6 && h < 20;
}

/** What it does next, and for how long (seconds). */
export function nextActivity(id: SpeciesId, hour: number, rnd: () => number): { act: Activity; secs: number } {
  if (!awake(id, hour)) return { act: 'rest', secs: 14 + rnd() * 16 };
  const r = rnd();
  if (grazes(id)) {
    if (r < 0.45) return { act: 'graze', secs: 5 + rnd() * 8 };
    if (r < 0.9) return { act: 'wander', secs: 4 + rnd() * 6 };
    return { act: 'rest', secs: 6 + rnd() * 8 };
  }
  if (r < 0.75) return { act: 'wander', secs: 3 + rnd() * 6 };
  return { act: 'rest', secs: 5 + rnd() * 8 };
}

/**
 * Where a wanderer heads next: a spot within `range` of home; a herd animal picks one near where
 * its herd is gathered (never more than a few body lengths out), so the herd drifts together.
 */
export function wanderTarget(home: { x: number; z: number }, range: number, herd: { x: number; z: number } | null, rnd: () => number): { x: number; z: number } {
  const a = rnd() * Math.PI * 2;
  if (herd) {
    const r = 2 + rnd() * 5;
    let x = herd.x + Math.cos(a) * r, z = herd.z + Math.sin(a) * r;
    // The herd still keeps to its home ground.
    const dx = x - home.x, dz = z - home.z, d = Math.hypot(dx, dz);
    if (d > range) { x = home.x + (dx / d) * range; z = home.z + (dz / d) * range; }
    return { x, z };
  }
  const r = rnd() * range;
  return { x: home.x + Math.cos(a) * r, z: home.z + Math.sin(a) * r };
}

/** How near a befriended animal comes to greet them, and from how far it notices them. */
export const GREET_STOP = 2.2, GREET_NOTICE = 14;

/**
 * A friend coming to greet them: the spot a polite step short of the traveller, on the line from
 * the animal; null when it is already there or too far away to notice.
 */
export function greetSpot(animal: { x: number; z: number }, traveller: { x: number; z: number }): { x: number; z: number } | null {
  const dx = animal.x - traveller.x, dz = animal.z - traveller.z, d = Math.hypot(dx, dz);
  if (d > GREET_NOTICE || d <= GREET_STOP + 0.3) return null;
  return { x: traveller.x + (dx / d) * GREET_STOP, z: traveller.z + (dz / d) * GREET_STOP };
}
