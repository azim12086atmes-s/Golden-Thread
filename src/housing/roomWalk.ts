import { MIN_GAP } from '../characters/follow';
import { MEMBER_CLEARANCE, clearOfTravellers } from '../caravan/caravan';

/** Indoors the two keep further apart than outside: the gap the rooms' seats keep (2.2 m). */
export const INDOOR_GAP = Math.max(MIN_GAP, 2.2);

/**
 * Walking inside (owner: "walk-around rooms", "walkable houses based on house structures"). In
 * every room — a home, a house you visit, an institute, a cavern, a landmark's hall, a penthouse —
 * the two walk where they like: she is steered, he keeps beside her, never nearer than MIN_GAP.
 * The room's own shape bounds them: a round room (an igloo, a lavvu, a yurt-like tent) by its
 * circle, the rest by their walls, a step in from the furniture along them. The people in the
 * room are left room to stand. By their seats they can sit down together; at the door, step out.
 *
 * Pure rules (tests/roomWalk.test.ts); HouseInterior moves the figures and the camera by them.
 */

export interface Room { halfW: number; back: number; front: number; height: number }
export interface Area { round: boolean; halfW: number; back: number; front: number; cx: number; cz: number; r: number }
export interface P2 { x: number; z: number }

/** How far in from the walls they keep (the furniture stands along them). */
export const WALL_KEEP = 0.9;
/** Room left round each person standing in the room. */
export const PERSON_KEEP = 0.75;
/** How near a seat to sit down, and how near the door to step out. */
export const SEAT_REACH = 1.5, DOOR_REACH = 1.3;
/** Walking pace indoors (m/s). */
export const INDOOR_PACE = 2.2;
/** How far back from the open front they keep: the camera stands there, and nothing may crowd it. */
export const FRONT_KEEP = 1.8;

/** Where they may walk in a room of this size and shape. */
export function walkArea(room: Room, round: boolean): Area {
  const cz = (room.back + room.front) / 2;
  return { round, halfW: room.halfW - WALL_KEEP, back: room.back + WALL_KEEP, front: room.front - FRONT_KEEP, cx: 0, cz, r: Math.min(room.halfW, (room.front - room.back) / 2) - WALL_KEEP };
}

/** Keep a point inside the area, and clear of the people standing in the room. */
export function keepInside(p: P2, a: Area, people: readonly P2[] = []): P2 {
  let { x, z } = p;
  if (a.round) {
    const dx = x - a.cx, dz = z - a.cz, d = Math.hypot(dx, dz);
    if (d > a.r) { x = a.cx + (dx / d) * a.r; z = a.cz + (dz / d) * a.r; }
  } else {
    x = Math.max(-a.halfW, Math.min(a.halfW, x));
    z = Math.max(a.back, Math.min(a.front, z));
  }
  for (const q of people) {
    const dx = x - q.x, dz = z - q.z, d = Math.hypot(dx, dz);
    if (d < PERSON_KEEP) {
      const s = d < 1e-6 ? 1 : PERSON_KEEP / d;
      x = q.x + (d < 1e-6 ? PERSON_KEEP : dx * s);
      z = q.z + (d < 1e-6 ? 0 : dz * s);
    }
  }
  return { x, z };
}

/** Where they stand when they come in: just inside the door, side by side, INDOOR_GAP and more apart. */
export function entryPoints(a: Area): { girl: P2; boy: P2 } {
  const z = a.round ? a.cz + a.r * 0.5 : a.front - 0.3, half = (INDOOR_GAP + 0.3) / 2;
  return { girl: { x: -half, z }, boy: { x: half, z } };
}

/** The door: the middle of the front wall (where they came in). */
export const doorOf = (room: Room): P2 => ({ x: 0, z: room.front });

/** Is she near enough to their seats to sit down? (Either seat will do.) */
export const nearSeats = (p: P2, seats: readonly P2[]): boolean => seats.some((s) => Math.hypot(p.x - s.x, p.z - s.z) < SEAT_REACH);

/** Is she at the door? */
export const atDoor = (p: P2, room: Room): boolean => Math.abs(p.x) < DOOR_REACH && p.z > room.front - FRONT_KEEP - 0.6;

/** One step of hers: from the stick (x right, y forward) turned by the camera's yaw. */
export function stepGirl(p: P2, axis: { x: number; y: number }, camYaw: number, dt: number): { pos: P2; heading: number | null; speed: number } {
  const len = Math.hypot(axis.x, axis.y);
  if (len < 0.05) return { pos: p, heading: null, speed: 0 };
  // Forward is away from the camera.
  const fx = -Math.sin(camYaw), fz = -Math.cos(camYaw), rx = Math.cos(camYaw), rz = -Math.sin(camYaw);
  const mx = fx * axis.y + rx * axis.x, mz = fz * axis.y + rz * axis.x, ml = Math.hypot(mx, mz) || 1;
  const v = INDOOR_PACE * Math.min(1, len);
  return { pos: { x: p.x + (mx / ml) * v * dt, z: p.z + (mz / ml) * v * dt }, heading: Math.atan2(mx, mz), speed: v };
}

/**
 * The camera indoors: it keeps to the room's own viewpoint at its open front (where the room is
 * composed to be seen, with nothing lit close to the lens), sliding a little to her side and
 * turning to keep her in view as she walks about.
 */
export function indoorCamera(girl: P2, base: readonly [number, number, number], look: readonly [number, number, number]): { pos: [number, number, number]; look: [number, number, number] } {
  const slide = Math.max(-1.2, Math.min(1.2, (girl.x - base[0]) * 0.35));
  return {
    pos: [base[0] + slide, base[1], base[2]],
    look: [look[0] + (girl.x - look[0]) * 0.6, look[1] + (1.0 - look[1]) * 0.6, look[2] + (girl.z - look[2]) * 0.6],
  };
}

/** The yaw of a camera at `pos` looking at `look` (for steering: forward is away from it). */
export const yawOf = (pos: readonly [number, number, number], look: readonly [number, number, number]): number => Math.atan2(pos[0] - look[0], pos[2] - look[2]);

/**
 * Their brothers, sisters and the children travelling with them come in too (owner: "all children
 * accompany us indoors as well"). Indoors they gather round the two, a little to the sides and
 * behind — never between the two, nor in front of the camera — each a clear step from everyone
 * (MEMBER_CLEARANCE) and from the two travellers (TRAVELLER_CLEARANCE), inside the room.
 */
export interface Folk { x: number; z: number; speed: number }
export const FOLK_RING = 2.5;

/** Where each of n companions stands round the pair (heading: her facing, 0 = +z). */
export function folkSlots(girl: P2, boy: P2, heading: number, n: number): P2[] {
  const cx = (girl.x + boy.x) / 2, cz = (girl.z + boy.z) / 2;
  // Off to the sides and a little behind, alternating left and right, the second ring wider.
  const angles = [1.75, -1.75, 2.35, -2.35, 1.2, -1.2, 2.8, -2.8];
  return Array.from({ length: n }, (_, i) => {
    const a = heading + angles[i % angles.length], r = FOLK_RING + Math.floor(i / angles.length) * 1.4;
    return { x: cx + Math.sin(a) * r, z: cz + Math.cos(a) * r };
  });
}

/** One step of the companions indoors: toward their places, clear of each other and of the two, inside the room. */
export function folkStep(folk: readonly Folk[], girl: P2, boy: P2, heading: number, area: Area, room: Room, dt: number, people: readonly P2[] = []): Folk[] {
  const slots = folkSlots(girl, boy, heading, folk.length);
  const next = folk.map((f, i) => {
    const s = keepInside(slots[i], area, people), dx = s.x - f.x, dz = s.z - f.z, d = Math.hypot(dx, dz);
    const step = Math.min(d, (INDOOR_PACE * 1.1 + d) * dt);
    return { x: d > 1e-6 ? f.x + (dx / d) * step : f.x, z: d > 1e-6 ? f.z + (dz / d) * step : f.z, speed: dt > 0 ? step / dt : 0 };
  });
  for (let pass = 0; pass < 3; pass++) for (let i = 0; i < next.length; i++) for (let j = i + 1; j < next.length; j++) {
    const a = next[i], b = next[j], dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz);
    if (d >= MEMBER_CLEARANCE) continue;
    const push = (MEMBER_CLEARANCE - d) / 2, ux = d > 1e-6 ? dx / d : 1, uz = d > 1e-6 ? dz / d : 0;
    a.x -= ux * push; a.z -= uz * push; b.x += ux * push; b.z += uz * push;
  }
  for (const m of next) {
    const k = keepInside(m, area, people);
    m.x = k.x; m.z = k.z;
    clearOfTravellers(m, girl, boy);
    // Never through a wall, even when stepping clear of the two.
    m.x = Math.max(-room.halfW + 0.3, Math.min(room.halfW - 0.3, m.x));
    m.z = Math.max(room.back + 0.3, Math.min(room.front - 0.3, m.z));
  }
  return next;
}
