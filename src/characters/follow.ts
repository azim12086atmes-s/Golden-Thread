/**
 * The companion follows the girl everywhere, and they never touch (brief; Islamic principles).
 *
 * Pure functions over plain vectors so the rule can be tested exhaustively without a renderer.
 * `MIN_GAP` is measured centre to centre; each body is ~0.3 m in radius, so the closest their
 * surfaces can come is MIN_GAP - 2 * BODY_RADIUS.
 */

export interface V3 { x: number; y: number; z: number }

export const BODY_RADIUS = 0.32;
export const MIN_GAP = 1.5;
/** Walking together: 1.95 m (owner: 25% closer than the first 2.6 m). MIN_GAP still holds. */
export const IDEAL_GAP = 1.95;
/** Beyond this the boy hurries; the thread grows taut. */
export const LEASH = 9;
/** Beyond this (fast travel, falling off a map edge) he is placed beside her instead. */
export const SNAP = 80;

export interface FollowInput {
  boy: V3;
  girl: V3;
  /** Girl's facing, radians, 0 = +Z. */
  heading: number;
  /** Girl's speed, m/s — used to lead the target a little. */
  speed: number;
  dt: number;
  /** When flying the boy may leave the ground freely. */
  airborne: boolean;
  groundAt?: (x: number, z: number) => number;
  /** A wider gap to keep (her wings, his jetpack); never less than MIN_GAP. */
  gap?: number;
  /** Where he stands in her frame (m forward, m to her right, m up), instead of the usual half-step behind. */
  stance?: Stance;
}

/** A place in her frame: forward of her, to her right, and up. */
export interface Stance { forward: number; side: number; up?: number }

export interface FollowOutput {
  pos: V3;
  /** Horizontal speed he moved at, for the walk animation. */
  speed: number;
  /** 0 = relaxed, 1 = at the leash. Drives thread tautness. */
  tension: number;
}

const dist = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Where he wants to be: beside her, a half-step behind — walking together, never blocking the view (or at `stance`). */
export function followTarget(girl: V3, heading: number, ideal = IDEAL_GAP, stance?: Stance): V3 {
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  if (stance) return { x: girl.x + fx * stance.forward + rx * stance.side, y: girl.y + (stance.up ?? 0), z: girl.z + fz * stance.forward + rz * stance.side };
  const back = -0.35, side = 1;
  const k = ideal / Math.hypot(back, side);
  return { x: girl.x + (fx * back + rx * side) * k, y: girl.y, z: girl.z + (fz * back + rz * side) * k };
}

/** How far forward of her (along her heading) a point is. */
export function aheadOf(p: V3, girl: V3, heading: number): number {
  return (p.x - girl.x) * Math.sin(heading) + (p.z - girl.z) * Math.cos(heading);
}

/**
 * The room her wings have. They only ever reach behind the plane of their hinge (`plane`, m forward
 * of her centre — negative, behind her back), and sweep back at least `sweep` radians from straight
 * out, so beside her, `L` metres out, the nearest glass is `L·tan(sweep)` further back still. While
 * all of him (his reach `own` about his centre, `half` his half-width) is in front of the glass
 * beside him, they open fully; otherwise they fold to fit the distance between them.
 */
export function wingRoom(boy: V3, girl: V3, heading: number, own: number, plane: number, sweep = 0, half = 0.45): number {
  const side = Math.abs((boy.x - girl.x) * Math.cos(heading) - (boy.z - girl.z) * Math.sin(heading));
  const glass = plane - Math.max(0, side - half) * Math.tan(sweep);
  if (aheadOf(boy, girl, heading) - own >= glass) return Infinity;
  return Math.hypot(boy.x - girl.x, boy.z - girl.z) - own;
}

/**
 * In flight with her wings on, he flies close beside her and below them (owner: "make the guy be
 * down near her so the wings do not touch him"): his head kept under the lowest any part of the
 * wings reaches (`floor` below her feet), whatever they do above him. `height` is his height.
 */
export function belowWings(floor: number, height: number): Stance {
  // Beside her and a step ahead of her back (the wings never reach forward of it), and below them.
  return { forward: 0.35, side: 2.1, up: -(floor + height + 0.35) };
}

/** Is he wholly below her wings (his head under the lowest they reach)? Then they open fully. */
export const clearBelow = (boy: V3, girl: V3, floor: number, height: number): boolean => boy.y + height <= girl.y - floor + 1e-6;

/** Push `p` directly away from `from` until it is at least `gap` away. */
export function enforceGap(p: V3, from: V3, gap = MIN_GAP): V3 {
  const dx = p.x - from.x, dy = p.y - from.y, dz = p.z - from.z;
  const d = Math.hypot(dx, dy, dz);
  if (d >= gap) return p;
  if (d < 1e-6) return { x: from.x + gap, y: from.y, z: from.z }; // exactly coincident: step aside
  const s = gap / d;
  return { x: from.x + dx * s, y: from.y + dy * s, z: from.z + dz * s };
}

export function followStep(i: FollowInput): FollowOutput {
  const { boy, girl, dt } = i;
  const d0 = dist(boy, girl);
  const gap = Math.max(MIN_GAP, i.gap ?? 0), ideal = Math.max(IDEAL_GAP, gap + 0.45);

  if (d0 > SNAP) {
    const t = enforceGap(followTarget(girl, i.heading, ideal, i.stance), girl, gap);
    const pos = i.airborne || !i.groundAt ? t : { ...t, y: i.groundAt(t.x, t.z) };
    return { pos: enforceGap(pos, girl, gap), speed: 0, tension: 0 };
  }

  const target = followTarget(girl, i.heading, ideal, i.stance);
  const dx = target.x - boy.x, dz = target.z - boy.z;
  const dh = Math.hypot(dx, dz);

  // Match her speed, plus a correction toward his place beside her, so he keeps pace at a walk,
  // in flight and on a unicorn alike without trailing behind.
  const hurry = d0 > LEASH + ideal - IDEAL_GAP ? 2.2 : 1;
  const want = Math.min(i.speed + dh * 2.4, Math.max(i.speed * 1.5, 5) * hurry);
  const step = Math.min(dh, want * dt);
  let x = boy.x, z = boy.z;
  if (dh > 1e-4) {
    x += (dx / dh) * step;
    z += (dz / dh) * step;
  }

  let pos: V3;
  if (i.airborne) {
    const y = boy.y + (target.y - boy.y) * Math.min(1, dt * 3);
    pos = enforceGap({ x, y, z }, girl, gap);
  } else {
    // On the ground the gap is kept horizontally, so it never lifts him off the ground. The 3D
    // distance is always at least the horizontal one, so the invariant still holds.
    const flat = enforceGap({ x, y: girl.y, z }, girl, gap);
    pos = { x: flat.x, y: i.groundAt ? i.groundAt(flat.x, flat.z) : girl.y, z: flat.z };
  }
  const moved = Math.hypot(pos.x - boy.x, pos.z - boy.z);
  return {
    pos,
    speed: dt > 0 ? moved / dt : 0,
    tension: Math.min(1, Math.max(0, (dist(pos, girl) - ideal) / (LEASH - IDEAL_GAP))),
  };
}
