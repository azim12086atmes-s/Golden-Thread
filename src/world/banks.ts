import type { Ctx } from './architecture';
import { lampPost } from './architecture';
import { bridgesOf } from './bridges';
import { LAND_STYLE } from './buildings';
import { box, sphere } from './kit';
import { streetLight } from './models/lights';
import type { RegionId } from './regions';
import { WATERS, BANK } from './waters';

/**
 * The banks of a land's waters, built rather than left raw.
 *
 * Rivers run between stone embankments: a quay wall rising from the water with a pale coping
 * along its top, and up on the bank a paved towpath in the land's road colour, edged in its
 * frieze colours, lit by the land's lanterns every forty metres. Every so often a flight of steps
 * (a ghat) goes down to the water. Ponds and the lake are edged with flat stones of every size.
 * Nothing is built where a bridge lands or on ground set aside for a landmark.
 *
 * Built in the land's local frame (x, z relative to its centre). Returns the lamp spots.
 */
const STEP = 3;
const STONE: Partial<Record<RegionId, string>> = {
  egypt: '#d9c08a', desert: '#d9b77a', middleeast: '#d8c29a', islamic: '#e6dcc8', mughal: '#efe6d6',
  norway: '#8e9296', switzerland: '#a0a4a8', aurora: '#c8d4dc', london: '#b8b0a0', newyork: '#a8a8a8',
  japan: '#9a968c', korea: '#a09a90', china: '#a8a090', indonesia: '#8a8272', indiasouth: '#b8a080',
};

export function buildBanks(c: Ctx, land: RegionId, cx: number, cz: number, H: (x: number, z: number) => number, waterY: number): { lamps: Array<{ x: number; z: number }>; paths: Array<{ x: number; z: number }> } {
  const stone = STONE[land] ?? '#c8bca8', coping = '#efe8da', path = c.s.road, [fa, fb] = LAND_STYLE[land].frieze;
  const bridges = bridgesOf(land).map((b) => ({ x: b.x - cx, z: b.z - cz, r: b.length / 2 + 6 }));
  const nearBridge = (x: number, z: number) => bridges.some((b) => Math.hypot(x - b.x, z - b.z) < b.r);
  const lamps: Array<{ x: number; z: number }> = [], paths: Array<{ x: number; z: number }> = [];

  for (const body of WATERS.filter((b) => b.land === land)) {
    if (body.kind !== 'river') {
      // Flat stones round the pond or lake, a few steps out from the edge.
      const bx = body.x - cx, bz = body.z - cz, n = Math.round((body.r * Math.PI * 2) / 1.6);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + c.rng.range(-0.05, 0.05), r = body.r + c.rng.range(0.6, 1.8);
        const x = bx + Math.cos(a) * r, z = bz + Math.sin(a) * r, y = H(x, z);
        if (y < waterY - 0.2) continue;
        sphere(c.g, c.rng.range(0.35, 0.9), c.rng.chance(0.3) ? coping : stone, x, y - 0.05, z, 6, 0.35);
      }
      continue;
    }
    const pts = body.pts.map(([x, z]) => [x - cx, z - cz] as [number, number]);
    let run = 0, ghat = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const L = Math.hypot(bx - ax, bz - az), tx = (bx - ax) / L, tz = (bz - az) / L, nx = -tz, nz = tx;
      const ry = Math.atan2(tx, tz);
      for (let s = 0; s < L; s += STEP) {
        const mx = ax + tx * (s + STEP / 2), mz = az + tz * (s + STEP / 2);
        run += STEP;
        if (nearBridge(mx, mz)) continue;
        for (const side of [-1, 1]) {
          const ex = mx + nx * side * (body.w / 2 + 0.3), ez = mz + nz * side * (body.w / 2 + 0.3);
          const px = mx + nx * side * (body.w / 2 + BANK + 1.4), pz = mz + nz * side * (body.w / 2 + BANK + 1.4), py = H(px, pz);
          // Every ninety metres on one bank, a ghat: a flight of steps from the path down to the water.
          const isGhat = side === -1 && (ghat += STEP) >= 90 && py > waterY + 0.2;
          if (isGhat) {
            ghat = 0;
            for (let k = 0; k < 8; k++) {
              const f = k / 8, sx = px + (ex - px) * f, sz = pz + (ez - pz) * f;
              const y = py + (waterY - 0.2 - py) * f;
              box(c.g, 1.3, Math.max(0.2, y - (waterY - 1.6)), STEP + 0.4, coping, sx, waterY - 1.6, sz, ry);
            }
          } else {
            // The quay wall at the water's edge, its top level with the bank a little way in.
            const top = Math.max(waterY + 0.7, H(mx + nx * side * (body.w / 2 + 2.2), mz + nz * side * (body.w / 2 + 2.2)) + 0.25);
            box(c.g, 0.7, top - (waterY - 1.6), STEP + 0.05, stone, ex, waterY - 1.6, ez, ry);
            box(c.g, 0.95, 0.16, STEP + 0.05, coping, ex, top, ez, ry);
          }
          // The towpath on the bank, where the ground has levelled out.
          if (py > waterY + 0.2) {
            box(c.g, 2.6, 0.1, STEP + 0.05, path, px, py - 0.02, pz, ry);
            for (const e of [-1, 1]) box(c.g, 0.22, 0.12, STEP + 0.05, Math.floor(run / STEP) % 2 ? fa : fb, px + nx * e * 1.35, py - 0.02, pz + nz * e * 1.35, ry);
            paths.push({ x: px, z: pz });
            // Lanterns along the outer edge of the path.
            if (run % 42 < STEP && side === 1) {
              const lx = px + nx * 1.9, lz = pz + nz * 1.9;
              if (!streetLight(c, lx, H(lx, lz), lz)) lampPost(c, lx, H(lx, lz), lz);
              lamps.push({ x: lx, z: lz });
            }
          }
        }
      }
    }
  }
  return { lamps, paths };
}
