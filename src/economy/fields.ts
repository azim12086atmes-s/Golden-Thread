import { bonus } from './inventions';
import { bagRoom } from './economy';
import { DAY_MINUTES, type GameState } from '../core/state';
import { CROPS, SEED_SHOP, WATER_BOOST } from '../housing/housing';
import { staffLevel } from '../institutions/institutions';
import { PERSON_BY_ID } from '../charity/charity';
import { FIELD_BY_ID } from '../world/plots';
import { REGION_BY_ID } from '../world/regions';
import { addItem, level } from './economy';
import { ITEMS, LEVEL_XP } from './items';
import { WORKER_BY_ID } from './workers';

export { FIELD_BY_ID, FIELD_SITES, FIELD_SIZE, type FieldSite } from '../world/plots';

/**
 * Agriculture land (owner's brief — NEXT_WORK C5: "agriculture land … bigger than farm beds, farm
 * workers, grow and sell"). A field is eight rows of one crop; it grows what its land grows (the
 * seeds its market sells), and the harvest goes into the field's barn. You can farm it yourselves —
 * plant, water once, harvest — or employ the land's farmhand (or a person you sponsor who has
 * learned gardening) to tend it: they water, bring in each harvest, save seed and sow again, so the
 * field keeps producing while you travel. The barn is where couriers collect (economy/supply.ts).
 *
 * Pure rules over GameState (tests/supply.test.ts).
 */
export const FIELD_ROWS = 8;
export const FIELD_HOURS = { plant: 2, water: 1, harvest: 2 } as const;
export type Field = GameState['fields'][string];
export type Hand = NonNullable<Field['hand']>;

/** A big field takes a little longer than a bed. */
export const fieldGrowTime = (seed: string): number => CROPS[seed].grow * 1.25;
/** What a field yields: eight rows, a tenth more for every level of the one who harvests. */
export const fieldYield = (seed: string, lvl: number): number => Math.round(CROPS[seed].qty * FIELD_ROWS * (1 + 0.1 * lvl));
export const fieldOf = (st: GameState, id: string): Field | undefined => st.fields[id];

function addXp(st: GameState, xp: number): void {
  st.skills.gardening = Math.min(LEVEL_XP[LEVEL_XP.length - 1], st.skills.gardening + xp);
}

export function buyField(st: GameState, id: string): string | null {
  const site = FIELD_BY_ID[id];
  if (!site) return 'There is no field there.';
  if (st.fields[id]) return 'This field is already yours.';
  if (st.coins < site.price) return `The field costs ${site.price} coins.`;
  st.coins -= site.price;
  st.fields[id] = { store: {}, at: st.minutes };
  return null;
}

export function plantField(st: GameState, id: string, seed: string): string | null {
  const f = st.fields[id], site = FIELD_BY_ID[id];
  if (!f || !site) return 'You need to own the field first.';
  if (f.crop) return 'Something is already growing here.';
  if (!CROPS[seed] || !SEED_SHOP[site.land].includes(seed)) return `A field in ${REGION_BY_ID[site.land].name} grows what the land grows: ${SEED_SHOP[site.land].map((s) => ITEMS[s]?.name ?? s).join(', ')}.`;
  if ((st.inventory[seed] ?? 0) < FIELD_ROWS) return `Eight rows need ${FIELD_ROWS} ${ITEMS[seed]?.name ?? seed} — buy them at the market.`;
  st.inventory[seed] -= FIELD_ROWS;
  if (st.inventory[seed] <= 0) delete st.inventory[seed];
  f.crop = { seed, plantedAt: st.minutes };
  addXp(st, 6);
  st.minutes += FIELD_HOURS.plant * 60;
  return null;
}

export function fieldGrowth(st: GameState, id: string): number {
  const c = st.fields[id]?.crop;
  // A pump or water screw built in the field (economy/inventions.ts) makes it grow faster.
  return c ? Math.min(1, ((st.minutes - c.plantedAt) * (1 + bonus(st, 'growth', id))) / fieldGrowTime(c.seed)) : 0;
}

/** Water the whole field once a planting: the harvest comes sooner. */
export function waterField(st: GameState, id: string): string | null {
  const c = st.fields[id]?.crop;
  if (!c) return 'Nothing is planted.';
  if (c.watered) return 'It has had its water — let it grow.';
  if (fieldGrowth(st, id) >= 1) return 'It is ready to harvest.';
  c.plantedAt -= fieldGrowTime(c.seed) * WATER_BOOST;
  c.watered = true;
  addXp(st, 3);
  st.minutes += FIELD_HOURS.water * 60;
  return null;
}

/** Bring the harvest into the barn yourselves. */
export function harvestField(st: GameState, id: string): { error: string } | { item: string; n: number } {
  const f = st.fields[id];
  if (!f?.crop) return { error: 'Nothing is planted.' };
  if (fieldGrowth(st, id) < 1) return { error: 'It is not ripe yet.' };
  const item = CROPS[f.crop.seed].out, n = Math.round(fieldYield(f.crop.seed, level(st, 'gardening')) * (1 + bonus(st, 'harvest', id)));
  f.store[item] = (f.store[item] ?? 0) + n;
  f.crop = undefined;
  addXp(st, 10);
  st.minutes += FIELD_HOURS.harvest * 60;
  return { item, n };
}

/** Carry some of the barn's store into your bag. */
export function takeFromBarn(st: GameState, id: string, item: string, n: number): number {
  const f = st.fields[id];
  // Only what fits in the bag.
  const k = Math.min(n, f?.store[item] ?? 0, bagRoom(st));
  if (!f || k <= 0) return 0;
  f.store[item] -= k;
  if (f.store[item] <= 0) delete f.store[item];
  addItem(st, item, k);
  return k;
}
export const barnCount = (st: GameState, id: string): number => Object.values(st.fields[id]?.store ?? {}).reduce((a, b) => a + b, 0);

/** Who can tend a field: the land's farmhand (employed) or someone you sponsor there who knows gardening. */
export function setHand(st: GameState, id: string, hand: Hand | null): string | null {
  const f = st.fields[id], site = FIELD_BY_ID[id];
  if (!f || !site) return 'You need to own the field first.';
  if (!hand) { delete f.hand; return null; }
  if (hand.who === 'hire') {
    const w = WORKER_BY_ID[hand.id];
    if (!w || w.role !== 'farmhand') return 'Only a farmhand can tend a field.';
    if (w.land !== site.land) return `${w.name} farms in ${REGION_BY_ID[w.land].name}.`;
  } else if (PERSON_BY_ID[hand.id]?.land !== site.land) return 'They live in another land.';
  if (staffLevel(st, hand, 'gardening') < 1) return hand.who === 'hire' ? 'Employ them first.' : 'Teach them gardening first (level 1).';
  f.hand = hand;
  return null;
}

export interface FieldNews { field: string; text: string }

/**
 * A field with someone tending it looks after itself: watered as soon as it is sown, each harvest
 * brought into the barn, seed saved and the same crop sown again. A field left untended simply
 * waits, ripe, for you. Call regularly (the game does every two seconds).
 */
export function tickFields(st: GameState): FieldNews[] {
  const out: FieldNews[] = [];
  for (const [id, f] of Object.entries(st.fields)) {
    const days = (st.minutes - f.at) / DAY_MINUTES;
    f.at = st.minutes;
    if (!f.crop || !f.hand) continue;
    const lvl = staffLevel(st, f.hand, 'gardening');
    if (lvl < 1) continue;
    const c = f.crop, T = fieldGrowTime(c.seed), item = CROPS[c.seed].out;
    if (!c.watered) { c.plantedAt -= T * WATER_BOOST; c.watered = true; }
    let got = 0;
    for (let k = 0; k < 20 && st.minutes >= c.plantedAt + T; k++) {
      got += fieldYield(c.seed, lvl);
      // Sown again from saved seed the moment it is harvested, and watered at once.
      c.plantedAt = c.plantedAt + T - T * WATER_BOOST;
    }
    if (f.hand.who === 'learner' && days > 0) {
      const xp = (st.learners[f.hand.id] ??= {});
      xp.gardening = Math.min(LEVEL_XP[LEVEL_XP.length - 1], (xp.gardening ?? 0) + Math.round(5 * days));
    }
    if (got > 0) {
      f.store[item] = (f.store[item] ?? 0) + got;
      const who = f.hand.who === 'hire' ? WORKER_BY_ID[f.hand.id]?.name : PERSON_BY_ID[f.hand.id]?.name;
      out.push({ field: id, text: `${who} brought in ${got}× ${ITEMS[item]?.name ?? item} from your field in ${REGION_BY_ID[FIELD_BY_ID[id].land].name}.` });
    }
  }
  return out;
}
