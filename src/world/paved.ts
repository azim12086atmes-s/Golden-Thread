/**
 * Ground that is built on or paved — houses and their forecourts, squares, sebils, fields,
 * institute sites, quays, caves, landmark grounds — so the meadow (Meadow.ts) never grows through
 * it. Each land registers its shapes (world coordinates) when it is built and clears them when it
 * is unloaded; the meadow replants whatever ground changed (`takeDirty`).
 */
export type Paved = { x: number; z: number; r: number } | { x: number; z: number; hw: number; hd: number };

const CELL = 8;
const grid = new Map<string, Paved[]>();
const byLand = new Map<string, Array<[string, Paved]>>();
const dirty: Array<{ x0: number; z0: number; x1: number; z1: number }> = [];

const half = (p: Paved): [number, number] => ('r' in p ? [p.r, p.r] : [p.hw, p.hd]);

export function setPaved(land: string, shapes: Paved[]): void {
  clearPaved(land);
  const mine: Array<[string, Paved]> = [];
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const p of shapes) {
    const [hw, hd] = half(p);
    x0 = Math.min(x0, p.x - hw); x1 = Math.max(x1, p.x + hw); z0 = Math.min(z0, p.z - hd); z1 = Math.max(z1, p.z + hd);
    for (let i = Math.floor((p.x - hw) / CELL); i <= Math.floor((p.x + hw) / CELL); i++) {
      for (let j = Math.floor((p.z - hd) / CELL); j <= Math.floor((p.z + hd) / CELL); j++) {
        const k = `${i},${j}`;
        (grid.get(k) ?? grid.set(k, []).get(k)!).push(p);
        mine.push([k, p]);
      }
    }
  }
  byLand.set(land, mine);
  if (shapes.length) dirty.push({ x0, z0, x1, z1 });
}

export function clearPaved(land: string): void {
  const mine = byLand.get(land);
  if (!mine) return;
  for (const [k, p] of mine) {
    const list = grid.get(k);
    if (!list) continue;
    const i = list.indexOf(p);
    if (i >= 0) list.splice(i, 1);
    if (!list.length) grid.delete(k);
  }
  byLand.delete(land);
}

/** Is (x, z) on built or paved ground? */
export function pavedAt(x: number, z: number): boolean {
  const list = grid.get(`${Math.floor(x / CELL)},${Math.floor(z / CELL)}`);
  if (!list) return false;
  for (const p of list) {
    if ('r' in p) { if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) return true; }
    else if (Math.abs(x - p.x) < p.hw && Math.abs(z - p.z) < p.hd) return true;
  }
  return false;
}

/** The areas whose paving changed since the last call (the meadow replants them). */
export function takeDirty(): Array<{ x0: number; z0: number; x1: number; z1: number }> {
  return dirty.splice(0, dirty.length);
}
