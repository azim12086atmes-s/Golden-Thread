import type { RegionId } from './regions';

/**
 * Surfaces: what walls, roofs and roads are made of, drawn procedurally in the shader (no image
 * files). Every GeoBuilder part carries a `surf` id (0 = plain paint); the solid material draws
 * the pattern in world space on whichever face it is: bricks and their mortar, cut stone, cobbles,
 * plaster, clapboard and boards, thatch, clay and glazed tiles, slate, steel panels, glass curtain
 * walls, asphalt, marble, adobe, flagstones, woven cloth, snow blocks. Each brick, tile or stone has
 * its own shade; the grooves between them are darker; far away the pattern fades to the plain
 * colour so it never shimmers.
 */
export const SURF = {
  plain: 0, brick: 1, ashlar: 2, cobble: 3, plaster: 4, clapboard: 5, boards: 6, thatch: 7, clayTile: 8,
  slate: 9, steel: 10, glass: 11, asphalt: 12, marble: 13, adobe: 14, flagstone: 15, glazed: 16, cloth: 17, snow: 18,
} as const;
export type SurfName = keyof typeof SURF;

interface LandSurfaces { walls: SurfName[]; roofs: SurfName[]; road: SurfName }
const L = (walls: SurfName[], roofs: SurfName[], road: SurfName): LandSurfaces => ({ walls, roofs, road });

/** Per land: a surface for each of its wall colours and roof colours (regions.ts order), and its road. */
export const LAND_SURFACES: Record<RegionId, LandSurfaces> = {
  aurora: L(['clapboard', 'clapboard', 'boards'], ['snow', 'snow'], 'snow'),
  norway: L(['clapboard', 'clapboard', 'clapboard', 'clapboard'], ['slate', 'boards', 'thatch'], 'cobble'),
  switzerland: L(['boards', 'plaster', 'boards'], ['slate', 'slate'], 'cobble'),
  london: L(['brick', 'brick', 'ashlar', 'brick'], ['slate', 'slate'], 'asphalt'),
  newyork: L(['ashlar', 'ashlar', 'steel', 'glass', 'brick'], ['steel'], 'asphalt'),
  korea: L(['plaster', 'plaster'], ['clayTile', 'clayTile'], 'flagstone'),
  japan: L(['plaster', 'boards', 'plaster'], ['clayTile', 'clayTile', 'clayTile'], 'flagstone'),
  meadow: L(['ashlar', 'plaster', 'ashlar', 'ashlar'], ['slate', 'slate', 'slate', 'slate'], 'cobble'),
  renaissance: L(['plaster', 'plaster', 'ashlar', 'brick'], ['clayTile', 'clayTile'], 'flagstone'),
  vintage: L(['clapboard', 'clapboard', 'clapboard', 'clapboard', 'clapboard'], ['slate', 'slate', 'slate'], 'asphalt'),
  china: L(['boards', 'plaster', 'boards'], ['glazed', 'glazed', 'clayTile'], 'flagstone'),
  indonesia: L(['boards', 'boards', 'thatch'], ['thatch', 'thatch', 'thatch'], 'plain'),
  skyisles: L(['marble', 'marble', 'marble'], ['glazed', 'glazed', 'glazed'], 'marble'),
  islamic: L(['plaster', 'plaster', 'plaster'], ['glazed', 'glazed', 'glazed'], 'flagstone'),
  middleeast: L(['adobe', 'adobe', 'adobe'], ['adobe', 'adobe'], 'flagstone'),
  indiasouth: L(['plaster', 'brick', 'ashlar'], ['clayTile', 'clayTile'], 'plain'),
  indianorth: L(['ashlar', 'ashlar', 'ashlar', 'plaster'], ['ashlar', 'plaster'], 'cobble'),
  mughal: L(['ashlar', 'marble', 'ashlar'], ['marble', 'marble'], 'flagstone'),
  egypt: L(['ashlar', 'adobe', 'ashlar'], ['adobe'], 'flagstone'),
  desert: L(['cloth', 'cloth', 'adobe'], ['cloth', 'cloth', 'cloth'], 'plain'),
};

/** Colour (lower-case #rrggbb) → surface id, for a land's walls, roofs and road. */
export function surfacesByColour(spec: { id: RegionId; walls: readonly string[]; roofs: readonly string[]; road: string }): Map<string, number> {
  const m = new Map<string, number>(), ls = LAND_SURFACES[spec.id];
  spec.walls.forEach((c, i) => m.set(c.toLowerCase(), SURF[ls.walls[i % ls.walls.length]]));
  spec.roofs.forEach((c, i) => { if (!m.has(c.toLowerCase())) m.set(c.toLowerCase(), SURF[ls.roofs[i % ls.roofs.length]]); });
  if (!m.has(spec.road.toLowerCase())) m.set(spec.road.toLowerCase(), SURF[ls.road]);
  return m;
}

/**
 * GLSL: `vec2 surface(float id, vec3 wp, vec3 wn)` → (shade, groove). The colour is multiplied by
 * `shade` and darkened in the grooves. `wp` world position, `wn` world normal.
 */
export const SURFACE_GLSL = /* glsl */ `
  float sh1(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float sn2(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(sh1(i), sh1(i + vec2(1, 0)), f.x), mix(sh1(i + vec2(0, 1)), sh1(i + vec2(1, 1)), f.x), f.y); }
  float sfbm(vec2 p) { return sn2(p) * 0.5 + sn2(p * 2.1 + 3.7) * 0.3 + sn2(p * 4.3 - 1.3) * 0.2; }
  // Courses of blocks w × h with a running bond; returns (block shade, groove).
  vec2 courses(vec2 st, vec2 size, float bond, float mortar, float vary) {
    float row = floor(st.y / size.y);
    vec2 q = vec2(st.x / size.x + bond * mod(row, 2.0) + sh1(vec2(row, 3.0)) * 0.13 * step(0.5, vary), st.y / size.y);
    vec2 id = floor(q), f = fract(q);
    float edge = min(min(f.x, 1.0 - f.x) * size.x, min(f.y, 1.0 - f.y) * size.y);
    float groove = 1.0 - smoothstep(mortar * 0.5, mortar, edge);
    return vec2(1.0 + (sh1(id) - 0.5) * vary, groove);
  }
  vec2 cells(vec2 p, float jitter) {
    vec2 i = floor(p), f = fract(p); float d1 = 8.0, d2 = 8.0; vec2 best = vec2(0.0);
    for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
      vec2 g = vec2(float(x), float(y)), o = vec2(sh1(i + g), sh1(i + g + 7.1)) * jitter;
      float d = length(g + o - f);
      if (d < d1) { d2 = d1; d1 = d; best = i + g; } else if (d < d2) d2 = d;
    }
    return vec2(sh1(best), d2 - d1);
  }
  vec2 surface(float id, vec3 wp, vec3 wn) {
    vec3 an = abs(wn);
    bool level = an.y > max(an.x, an.z);
    // Walls: along the wall and up; flat and sloping faces: across the ground.
    vec2 st = level ? wp.xz : (an.x > an.z ? vec2(wp.z, wp.y) : vec2(wp.x, wp.y));
    float n = sfbm(st * 3.0);
    if (id < 0.5) return vec2(1.0, 0.0);
    if (id < 1.5) { vec2 b = courses(st, vec2(0.24, 0.075), 0.5, 0.012, 0.3); return vec2(b.x * (0.94 + n * 0.1), b.y); }        // brick
    if (id < 2.5) { vec2 b = courses(st, vec2(0.62, 0.31), 0.35, 0.014, 0.14); return vec2(b.x * (0.93 + n * 0.12), b.y * 0.8); } // ashlar
    if (id < 3.5) { vec2 c = cells(st * 5.2, 0.9); return vec2(0.82 + c.x * 0.3, 1.0 - smoothstep(0.02, 0.1, c.y)); }             // cobble
    if (id < 4.5) return vec2(0.95 + sfbm(st * 6.0) * 0.08 + sn2(st * 40.0) * 0.03, 0.0);                                          // plaster
    if (id < 5.5) { float r = fract(st.y / 0.17); float lap = smoothstep(0.0, 0.25, r); return vec2((0.88 + lap * 0.14) * (0.95 + sn2(vec2(st.x * 3.0, st.y * 40.0)) * 0.08), 1.0 - smoothstep(0.0, 0.07, r)); } // clapboard
    if (id < 6.5) { float c = fract(st.x / 0.19); float grain = sn2(vec2(st.x * 30.0, st.y * 2.5)); return vec2((0.86 + grain * 0.2) * (0.94 + sh1(vec2(floor(st.x / 0.19), 1.0)) * 0.12), 1.0 - smoothstep(0.0, 0.05, min(c, 1.0 - c))); } // boards
    if (id < 7.5) { float strands = sn2(vec2(st.x * 55.0, st.y * 4.0)) * 0.6 + sn2(vec2(st.x * 120.0, st.y * 9.0)) * 0.4; float rowL = fract(st.y / 0.28); return vec2(0.78 + strands * 0.36, (1.0 - smoothstep(0.0, 0.14, rowL)) * 0.7); } // thatch
    if (id < 8.5) { float row = floor(st.y / 0.24), x = st.x / 0.19 + 0.5 * mod(row, 2.0); float barrel = 0.5 + 0.5 * cos(fract(x) * 6.2832); float rowL = fract(st.y / 0.24);
      return vec2((0.8 + barrel * 0.28) * (0.93 + sh1(vec2(floor(x), row)) * 0.14), (1.0 - smoothstep(0.0, 0.12, rowL)) * 0.8); } // clay tiles
    if (id < 9.5) { vec2 b = courses(st, vec2(0.32, 0.19), 0.5, 0.018, 0.22); float rowL = fract(st.y / 0.19); return vec2(b.x * (0.9 + rowL * 0.12), max(b.y * 0.7, 1.0 - smoothstep(0.0, 0.1, rowL))); } // slate
    if (id < 10.5) { vec2 b = courses(st, vec2(1.2, 0.6), 0.0, 0.02, 0.06); float brushed = sn2(vec2(st.x * 2.0, st.y * 80.0)); vec2 rv = fract(st / vec2(0.3, 0.6)); float rivet = step(length((rv - vec2(0.5, 0.06)) * vec2(0.3, 0.6)), 0.012);
      return vec2(b.x * (0.92 + brushed * 0.12) + rivet * 0.25, b.y * 0.8); } // steel panels
    if (id < 11.5) { vec2 g = fract(st / vec2(1.5, 1.2)); float mull = 1.0 - smoothstep(0.0, 0.03, min(min(g.x, 1.0 - g.x) * 1.5, min(g.y, 1.0 - g.y) * 1.2));
      return vec2(0.75 + (1.0 - g.y) * 0.5 + sh1(floor(st / vec2(1.5, 1.2))) * 0.15, mull * 0.6); } // glass curtain wall
    if (id < 12.5) return vec2(0.86 + sn2(st * 30.0) * 0.12 + step(0.97, sh1(floor(st * 40.0))) * 0.2, 0.0); // asphalt
    if (id < 13.5) { float v = abs(sin(st.x * 2.3 + st.y * 1.1 + sfbm(st * 1.6) * 7.0)); return vec2(1.02 - (1.0 - smoothstep(0.0, 0.06, v)) * 0.16, 0.0); } // marble
    if (id < 14.5) { float fleck = step(0.985, sh1(floor(st * vec2(90.0, 30.0)))); return vec2(0.93 + sfbm(st * 2.5) * 0.12 + fleck * 0.12, 0.0); } // adobe
    if (id < 15.5) { vec2 b = courses(st, vec2(0.58, 0.44), 0.42, 0.02, 0.2); return vec2(b.x * (0.93 + n * 0.1), b.y); } // flagstones
    if (id < 16.5) { vec2 g = fract(st / 0.15); float gl = 0.5 + 0.5 * sin(fract(st.x / 0.15) * 3.1416); float edge = 1.0 - smoothstep(0.0, 0.06, min(min(g.x, 1.0 - g.x), min(g.y, 1.0 - g.y)));
      return vec2((0.86 + gl * 0.24) * (0.92 + sh1(floor(st / 0.15)) * 0.16), edge * 0.7); } // glazed tiles
    if (id < 17.5) { float w = step(0.5, fract(st.x * 25.0)) * step(0.5, fract(st.y * 25.0)) + step(fract(st.x * 25.0), 0.5) * step(fract(st.y * 25.0), 0.5); float stripe = step(0.82, fract(st.y / 0.45));
      return vec2((0.9 + w * 0.1) * (1.0 - stripe * 0.35), 0.0); } // woven cloth with stripes
    vec2 b = courses(st, vec2(0.55, 0.32), 0.5, 0.02, 0.06); return vec2(b.x, b.y * 0.5); // snow blocks
  }`;
