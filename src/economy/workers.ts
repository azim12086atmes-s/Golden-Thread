import { folkOf } from '../npc/folk';
import { REGIONS, type RegionId } from '../world/regions';
import type { SkillId } from './items';

/**
 * People the travellers can employ for everyday work (owner's brief — NEXT_WORK C3/C5: "hire
 * couriers … farm workers … as employees, paid in coins, food or housing"). Every land has a
 * farmhand who tends your fields and a courier who carries your goods on the land's own vehicle —
 * the same vehicles you see in its traffic (traffic/roster.ts). They are employed through
 * `employ` like any expert (institutions.ts), so their wage, keep or a room in your home work
 * the same way. Pure data (tests/supply.test.ts).
 */
export type Role = 'farmhand' | 'courier';

export interface Worker {
  id: string;
  land: RegionId;
  name: string;
  role: Role;
  level: number;
  /** The skill the work uses (farmhands: gardening). */
  skill?: SkillId;
  /** Couriers: the traffic design they ride, how much it carries, and how fast it goes (1 = a cart). */
  vehicle?: string;
  capacity?: number;
  speed?: number;
}

/** Each land's delivery vehicle: [traffic design, capacity, speed]. */
export const COURIER_RIDE: Record<RegionId, [string, number, number]> = {
  meadow: ['flower-cart', 12, 1], japan: ['kei-van', 20, 1.6], korea: ['hatchback', 16, 1.8], china: ['tuk-tuk-2', 14, 1.4],
  norway: ['pickup', 24, 1.7], switzerland: ['post-bus', 22, 1.6], london: ['hatchback', 16, 1.8], newyork: ['hover-car', 18, 2.4],
  renaissance: ['caleche', 12, 1], vintage: ['pickup', 24, 1.6], islamic: ['donkey-cart', 12, 0.9], middleeast: ['camel-caravan', 28, 0.9],
  egypt: ['donkey-cart', 12, 0.9], desert: ['camel-caravan', 28, 0.9], indianorth: ['painted-truck', 32, 1.5], indiasouth: ['bullock-cart', 16, 0.8],
  mughal: ['tonga', 12, 1.1], indonesia: ['bemo', 18, 1.4], aurora: ['reindeer-sled', 14, 1.2], skyisles: ['sky-ship', 20, 2.5],
};

export const WORKERS: Worker[] = REGIONS.flatMap((r, ri) => {
  const [vehicle, capacity, speed] = COURIER_RIDE[r.id];
  return [
    { id: `farmhand-${r.id}`, land: r.id, name: folkOf(r.id, 700 + ri * 7, 0).name, role: 'farmhand' as Role, level: 2 + (ri % 2), skill: 'gardening' as SkillId },
    { id: `courier-${r.id}`, land: r.id, name: folkOf(r.id, 800 + ri * 7, 0).name, role: 'courier' as Role, level: 2, vehicle, capacity, speed },
  ];
});
export const WORKER_BY_ID: Record<string, Worker> = Object.fromEntries(WORKERS.map((w) => [w.id, w]));
export const workersOf = (land: RegionId, role: Role): Worker[] => WORKERS.filter((w) => w.land === land && w.role === role);
