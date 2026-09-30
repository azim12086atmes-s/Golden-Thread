import { SPECIES } from '../animals/AnimalModel';
import { PETS } from '../caravan/caravan';
import { DRAGON_HOMES } from '../creatures/Dragons';
import { ITEMS, SKILLS } from '../economy/items';
import { CROPS, SEED_SHOP } from '../housing/housing';
import { LANDMARK_NAME } from '../housing/HouseInterior';
import { INSTITUTE_BY_KIND } from '../institutions/catalogue';
import { landScience } from '../institutions/institutions';
import { keeperOf } from '../npc/people';
import { REGIONS, REGION_BY_ID, type RegionId } from '../world/regions';

/**
 * The guidebook's page for each land (owner, 2026-09-30: "show them the different places they can
 * discover, what all they can do in these lands and what they can learn"), drawn from the game's
 * own data so it always matches the world: its Keeper and the craft they teach, the science of its
 * institute, its monument, the dragon in its sky, the pets waiting at its plaza, its animals, what
 * its fields grow and what its people are glad to receive.
 */
export interface LandPage {
  id: RegionId;
  name: string;
  subtitle: string;
  keeper: { name: string; role: string; craft: string };
  science: string;
  monument: string;
  dragon: string | null;
  pets: string[];
  animals: string[];
  crops: string[];
  wanted: string[];
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function landPage(id: RegionId): LandPage {
  const r = REGION_BY_ID[id], k = keeperOf(id), skill = SKILLS[r.skill];
  const dragons = DRAGON_HOMES.filter((h) => h.land === id).map((h) => h.spec.name);
  return {
    id, name: r.name, subtitle: r.subtitle,
    keeper: { name: k.name, role: k.role, craft: `${skill.icon} ${skill.name}` },
    science: INSTITUTE_BY_KIND[landScience(id)].name,
    monument: cap(LANDMARK_NAME[id]),
    dragon: dragons.length ? dragons.map(cap).join(' and ') : null,
    pets: PETS.filter((p) => p.origin === id).map((p) => `${p.name} the ${p.species}`),
    animals: r.fauna.map((f) => SPECIES[f as keyof typeof SPECIES]?.name ?? f),
    crops: (SEED_SHOP[id] ?? []).map((s) => ITEMS[CROPS[s]?.out]?.name ?? s).filter(Boolean),
    wanted: r.wanted.map((w) => ITEMS[w]?.name ?? w),
  };
}

export const LAND_PAGES: LandPage[] = REGIONS.map((r) => landPage(r.id));
