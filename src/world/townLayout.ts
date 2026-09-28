import type { Rng } from '../core/rng';
import type { RegionId } from './regions';

/**
 * Towns that grew rather than were ruled out: winding lanes branch off the avenues and the ring
 * road and wander into each quarter, bending with the lie of the land, now and then ending at
 * another lane (a junction) or at the fields. Houses line them on both sides at uneven setbacks,
 * each turned to face its own lane, so streets curve, corners are never square and no two
 * frontages line up. New Yonder alone keeps its grid (it is a grid city).
 *
 * Coordinates are region-local (the land's centre at 0, 0).
 */
export interface Lane {
  pts: Array<[number, number]>;
  /** Paved width, metres. */
  width: number;
}

/** Lands laid out as a grid of blocks, not lanes. */
export const GRID_TOWNS: ReadonlySet<RegionId> = new Set(['newyork']);

export const LANE_W = 4.2;
const STEP = 2.5;

/** Distance from (x, z) to the nearest point of any lane in `lanes` (skipping `skip`). */
export function laneDistance(lanes: readonly Lane[], x: number, z: number, skip?: Lane): number {
  let best = Infinity;
  for (const l of lanes) {
    if (l === skip) continue;
    for (let i = 1; i < l.pts.length; i++) {
      const [ax, az] = l.pts[i - 1], [bx, bz] = l.pts[i];
      const dx = bx - ax, dz = bz - az, len2 = dx * dx + dz * dz || 1;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
      best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
    }
  }
  return best;
}

/**
 * Lay out a town's lanes. `blocked(x, z, pad)`: ground that is not the town's to pave (plots,
 * squares, the castle, water, reserved grounds); `road(x, z, pad)`: the avenues and ring road.
 */
export function townLanes(rng: Rng, cityR: number, avenue: number, ring: number, blocked: (x: number, z: number, pad: number) => boolean, road: (x: number, z: number, pad: number) => boolean): Lane[] {
  const lanes: Lane[] = [];
  const starts: Array<{ x: number; z: number; hx: number; hz: number }> = [];
  // Off both sides of each avenue, into each quarter.
  for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
    for (const side of [-1, 1]) {
      const n = 3 + (rng.chance(0.5) ? 1 : 0);
      for (let k = 0; k < n; k++) {
        const d = rng.range(66, cityR - 40);
        // Along the avenue (ax, az); out to one side of it.
        const ox = az !== 0 ? side : 0, oz = ax !== 0 ? side : 0;
        starts.push({ x: ax * d + ox * (avenue + 1), z: az * d + oz * (avenue + 1), hx: ox, hz: oz });
      }
    }
  }
  // Off the ring road, inward and outward.
  for (let k = 0; k < 14; k++) {
    const a = rng.range(0, Math.PI * 2), out = rng.chance(0.55) ? 1 : -1;
    starts.push({ x: Math.cos(a) * (ring + out * 6.5), z: Math.sin(a) * (ring + out * 6.5), hx: Math.cos(a) * out, hz: Math.sin(a) * out });
  }
  const walk = (st: { x: number; z: number; hx: number; hz: number }, lenLo: number, lenHi: number) => {
    let x = st.x, z = st.z, h = Math.atan2(st.hx, st.hz);
    const pts: Array<[number, number]> = [[x, z]];
    const bend = rng.range(-0.05, 0.05), wob = rng.range(0.02, 0.06), ph = rng.range(0, 10), len = rng.range(lenLo, lenHi);
    for (let i = 1; i * STEP < len; i++) {
      // Wander: a steady bend, a slow wobble.
      h += bend + Math.sin(i * 0.23 + ph) * wob;
      const nx = x + Math.sin(h) * STEP, nz = z + Math.cos(h) * STEP, d = Math.hypot(nx, nz);
      if (d > cityR - 8 || d < 58) break;
      if (blocked(nx, nz, LANE_W)) break;
      // Off the road it left, it never runs along or back onto a road: it ends there instead.
      if (i > 4 && road(nx, nz, LANE_W / 2)) break;
      x = nx; z = nz;
      pts.push([x, z]);
      // Meeting another lane: join it and end (a junction).
      if (i > 4 && laneDistance(lanes, x, z) < LANE_W * 1.5) break;
    }
    if (pts.length * STEP >= 28) lanes.push({ pts, width: LANE_W });
  };
  for (const st of starts) walk(st, 60, 170);
  // Side lanes branching off the long ones, left or right, shorter and narrower in reach.
  for (const l of lanes.slice()) {
    if (l.pts.length * STEP < 60) continue;
    for (let b = 0; b < 2; b++) {
      if (!rng.chance(0.7)) continue;
      const i = Math.floor(rng.range(8, l.pts.length - 8));
      const [ax, az] = l.pts[i - 1], [bx, bz] = l.pts[i + 1], len = Math.hypot(bx - ax, bz - az) || 1, side = rng.chance(0.5) ? 1 : -1;
      const hx = (-(bz - az) / len) * side, hz = ((bx - ax) / len) * side;
      // Start clear of the parent lane, so the junction test does not end it at once.
      walk({ x: l.pts[i][0] + hx * LANE_W, z: l.pts[i][1] + hz * LANE_W, hx, hz }, 30, 90);
    }
  }
  return lanes;
}

/**
 * Where houses stand along the lanes: every so often on each side, set back by a varying depth,
 * each facing the lane (`ry` turns a house's front, +z, toward it). `spacing` and `setback` come
 * from the size of the land's houses.
 */
export function laneLots(rng: Rng, lanes: readonly Lane[], spacing: number, setback: number): Array<{ x: number; z: number; ry: number }> {
  const lots: Array<{ x: number; z: number; ry: number }> = [];
  for (const l of lanes) {
    let next = rng.range(3, spacing);
    let run = 0;
    for (let i = 1; i < l.pts.length; i++) {
      const [ax, az] = l.pts[i - 1], [bx, bz] = l.pts[i];
      const seg = Math.hypot(bx - ax, bz - az);
      run += seg;
      while (run >= next) {
        const t = 1 - (run - next) / seg, px = ax + (bx - ax) * t, pz = az + (bz - az) * t;
        const tx = (bx - ax) / seg, tz = (bz - az) / seg;
        for (const side of [-1, 1]) {
          if (!rng.chance(0.88)) continue;
          // The lane's normal on this side; the house stands out along it and faces back.
          const nx = -tz * side, nz = tx * side, back = l.width / 2 + setback + rng.range(0, 3);
          const x = px + nx * back, z = pz + nz * back;
          // Not where it would stand in another lane's way (a corner lot belongs to one lane).
          if (laneDistance(lanes, x, z, l) < l.width / 2 + setback * 0.8) continue;
          lots.push({ x, z, ry: Math.atan2(-nx, -nz) + rng.range(-0.08, 0.08) });
        }
        next += spacing * rng.range(0.85, 1.25);
      }
    }
  }
  return lots;
}
