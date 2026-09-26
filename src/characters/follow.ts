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
}

export interface FollowOutput {
  pos: V3;
  /** Horizontal speed he moved at, for the walk animation. */
  speed: number;
  /** 0 = relaxed, 1 = at the leash. Drives thread tautness. */
  tension: number;
}

const dist = (a: V3, b: V3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);

/** Where he wants to be: beside her, a half-step behind — walking together, never blocking the view. */
export function followTarget(girl: V3, heading: number): V3 {
  const back = -0.35, side = 1;
  const fx = Math.sin(heading), fz = Math.cos(heading);
  const rx = Math.cos(heading), rz = -Math.sin(heading);
  const k = IDEAL_GAP / Math.hypot(back, side);
  return { x: girl.x + (fx * back + rx * side) * k, y: girl.y, z: girl.z + (fz * back + rz * side) * k };
}

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

  if (d0 > SNAP) {
    const t = enforceGap(followTarget(girl, i.heading), girl);
    const pos = i.airborne || !i.groundAt ? t : { ...t, y: i.groundAt(t.x, t.z) };
    return { pos: enforceGap(pos, girl), speed: 0, tension: 0 };
  }

  const target = followTarget(girl, i.heading);
  const dx = target.x - boy.x, dz = target.z - boy.z;
  const dh = Math.hypot(dx, dz);

  // Match her speed, plus a correction toward his place beside her, so he keeps pace at a walk,
  // in flight and on a unicorn alike without trailing behind.
  const hurry = d0 > LEASH ? 2.2 : 1;
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
    pos = enforceGap({ x, y, z }, girl);
  } else {
    // On the ground the gap is kept horizontally, so it never lifts him off the ground. The 3D
    // distance is always at least the horizontal one, so the invariant still holds.
    const flat = enforceGap({ x, y: girl.y, z }, girl);
    pos = { x: flat.x, y: i.groundAt ? i.groundAt(flat.x, flat.z) : girl.y, z: flat.z };
  }
  const moved = Math.hypot(pos.x - boy.x, pos.z - boy.z);
  return {
    pos,
    speed: dt > 0 ? moved / dt : 0,
    tension: Math.min(1, Math.max(0, (dist(pos, girl) - IDEAL_GAP) / (LEASH - IDEAL_GAP))),
  };
}
