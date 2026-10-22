import { PEOPLE, type NpcDef } from '../npc/people';
import { REGIONS } from '../world/regions';
import { CASTLE_SITE } from '../world/terrain';

/** The castle faces south (+z), towards the heart of the meadow. All positions are world metres. */
export const CASTLE = {
  keep: { x: CASTLE_SITE.x, z: CASTLE_SITE.z - 30, w: 34, d: 24 },
  /** The courtyard where the party is held. */
  venue: { x: CASTLE_SITE.x, z: CASTLE_SITE.z + 20, r: 27 },
  /** The rose-arched aisle runs from the chariot's landing up to the cake. */
  aisle: { x: CASTLE_SITE.x, from: CASTLE_SITE.z + 50, to: CASTLE_SITE.z + 8 },
  landing: { x: CASTLE_SITE.x, z: CASTLE_SITE.z + 56 },
} as const;

/** Where the travellers stand for the cake: at the head of the aisle, facing the castle. */
export const CAKE_SPOT = { x: CASTLE.aisle.x, z: CASTLE.aisle.to + 3 } as const;

/**
 * Guests: people from every land, three from the meadow where the travellers began. Only the two
 * travellers are Muslim; every guest comes as themselves, in their own land's clothes.
 */
export function guests(): NpcDef[] {
  const out: NpcDef[] = [];
  for (const r of REGIONS) {
    if (r.id === 'skyisles') continue;
    const here = PEOPLE.filter((p) => p.region === r.id);
    out.push(...here.slice(0, r.id === 'meadow' ? 3 : 1));
  }
  return out;
}

/** A guest's place: facing the aisle in two rows, then a crescent behind the cake. */
export function guestSpot(i: number, n: number): { x: number; z: number; face: number } {
  const rows = Math.min(n, 24);
  if (i < rows) {
    const side = i % 2 ? 1 : -1, k = Math.floor(i / 2);
    const z = CASTLE.aisle.from - 4 - k * 3.1;
    const x = CASTLE.aisle.x + side * (4.2 + (k % 2) * 1.2);
    return { x, z, face: side > 0 ? -Math.PI / 2 : Math.PI / 2 };
  }
  const j = i - rows, m = Math.max(1, n - rows);
  const a = Math.PI * (0.25 + (0.5 * (j + 0.5)) / m);
  return { x: CAKE_SPOT.x + Math.cos(a) * 7, z: CAKE_SPOT.z - 1 - Math.sin(a) * 5, face: 0 };
}

