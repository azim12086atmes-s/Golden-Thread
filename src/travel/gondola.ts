import { REGION_BY_ID, regionCenter } from '../world/regions';
import { SKY_TRAM } from '../world/reserved';
import { terrainHeight } from '../world/terrain';
import { skyPad } from './air';

/**
 * The Sky Isles cable car (pure rules; tests/gondola.test.ts). From a valley station on the
 * meadow below the spiral, two cabins run on their own cables up to a mountain station built out
 * from the rim of the temple's isle — one going up while the other comes down, passing in the
 * middle, as on a real aerial tramway. The cable rises at about 40° and clears every isle, bridge
 * of light and crystal on the way.
 *
 * In the cabin the two sit on the front bench either side of a little divider, the family on the
 * bench behind; everyone faces the way it travels, out through the big windows.
 */

type P3 = [number, number, number];

/** How far out from the isle's centre the mountain station stands; cable height over the decks. */
export const TRAM_OUT = 30, TRAM_HANG = 3.4;
/** Half the spacing between the two tracks, and how deep the cable sags per metre of span. */
export const TRAM_TRACK = 2.4, TRAM_SAG = 0.02;
/** How far each cabin runs level into its station, and how high its floor rides over the deck. */
export const TRAM_LEVEL = 5, TRAM_FLOOR = 0.3;

export interface TramLine {
  /** The valley and mountain stations (region-local x, z; deck height y). */
  ground: { x: number; y: number; z: number };
  top: { x: number; y: number; z: number };
  /** Unit direction from the valley up to the mountain (horizontal), and the horizontal span. */
  ux: number;
  uz: number;
  span: number;
}

let line: TramLine | null = null;
export function tramLine(): TramLine {
  if (line) return line;
  const p = skyPad(), [ix, iz] = p.isle, c = regionCenter(REGION_BY_ID.skyisles);
  const dx = SKY_TRAM.x - ix, dz = SKY_TRAM.z - iz, d = Math.hypot(dx, dz);
  const top = { x: ix + (dx / d) * TRAM_OUT, y: p.y, z: iz + (dz / d) * TRAM_OUT };
  const ground = { x: SKY_TRAM.x, y: terrainHeight(c.x + SKY_TRAM.x, c.z + SKY_TRAM.z) + 0.5, z: SKY_TRAM.z };
  return (line = { ground, top, ux: -dx / d, uz: -dz / d, span: d - TRAM_OUT });
}

/** Height of a cabin's floor `t` of the way along its span (0 valley … 1 mountain), sag included. */
export function tramHeight(t: number): number {
  const L = tramLine(), s = Math.min(1, Math.max(0, t));
  return L.ground.y + (L.top.y - L.ground.y) * s - Math.sin(s * Math.PI) * L.span * TRAM_SAG;
}

/**
 * A cabin's course on track `side` (+1 / -1: right / left of the way up), region-local x, y, z
 * every ~2 m: level out of the station, up (or down) the span, level into the other station.
 */
export function tramCourse(side: 1 | -1, up: boolean): P3[] {
  const L = tramLine(), ox = -L.uz * TRAM_TRACK * side, oz = L.ux * TRAM_TRACK * side;
  const at = (d: number, y: number): P3 => [L.ground.x + L.ux * d + ox, y + TRAM_FLOOR, L.ground.z + L.uz * d + oz];
  const out: P3[] = [];
  for (let d = -TRAM_LEVEL; d < 0; d += 1) out.push(at(d, L.ground.y));
  const n = Math.round(L.span / 2);
  for (let i = 0; i <= n; i++) out.push(at((L.span * i) / n, tramHeight(i / n)));
  for (let d = 1; d <= TRAM_LEVEL; d += 1) out.push(at(L.span + d, L.top.y));
  return up ? out : out.reverse();
}

/** The same course in world coordinates. */
export function tramCourseWorld(side: 1 | -1, up: boolean): P3[] {
  const c = regionCenter(REGION_BY_ID.skyisles);
  return tramCourse(side, up).map(([x, y, z]) => [c.x + x, y, c.z + z]);
}

/** Where you board at either station (world): on the deck beside the track going your way. */
export function tramBoarding(up: boolean): { x: number; y: number; z: number } {
  const L = tramLine(), c = regionCenter(REGION_BY_ID.skyisles), s = up ? L.ground : L.top;
  return { x: c.x + s.x, y: s.y, z: c.z + s.z };
}

/** Where you step off at the far station (world) — toward the isle up top, the meadow below — and which way you face. */
export function tramAlight(up: boolean): { x: number; y: number; z: number; bx: number; bz: number; facing: number } {
  const L = tramLine(), c = regionCenter(REGION_BY_ID.skyisles), s = up ? L.top : L.ground;
  const f = up ? 1 : -1, x = c.x + s.x + L.ux * f * 3, z = c.z + s.z + L.uz * f * 3;
  // He a pace to her right.
  return { x, y: s.y, z, bx: x - L.uz * f * 1.9, bz: z + L.ux * f * 1.9, facing: Math.atan2(L.ux * f, L.uz * f) };
}

// ───── the cabin ─────

/** The cabin (its own frame: +z the way it travels); the floor is at y = 0 on the course. */
export const TRAM = { halfW: 1.15, len: 2.9, floorY: 0.05 };
export const TRAM_SEATS: { girl: P3; boy: P3 } = {
  girl: [-0.58, TRAM.floorY + 0.45, 0.45],
  boy: [0.58, TRAM.floorY + 0.45, 0.45],
};
export const TRAM_FAMILY_SEATS: P3[] = [[-0.58, TRAM.floorY + 0.45, -0.7], [0.58, TRAM.floorY + 0.45, -0.7]];
