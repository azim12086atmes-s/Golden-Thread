import * as THREE from 'three';

/**
 * Her stained-glass butterfly wings (owner's brief, OWNER_REQUESTS_SPEC §6.2): heart-shaped — the
 * pair together makes a heart — and large, twice her height across. An intricate, delicate mosaic of
 * glass: small and large panes, geometric and fragmented and uneven, with straight and curved lines;
 * each pane an even patch of colour, mostly bright and in a slight rainbow drift across the wing,
 * with black and gold panes as accents; the panes partitioned by black leading with gold running in
 * it, and curved veins sweeping out from the root. It shines from within and a soft light moves over
 * it. The wings flap slowly, as large wings do, and curve as they flap — the tips lag the root.
 *
 * They are drawn as a picture (a canvas texture) on a bending surface. They sweep back behind her so
 * they never reach the boy beside her (tests/wings.test.ts): see `WING_REACH`.
 */

/** Across the pair, open flat (model units — about twice her height). */
export const WING_SPAN = 3.6;
/** One wing is half a heart: 16 wide to 29 tall in the heart curve's own units. */
export const WING_W = WING_SPAN / 2, WING_H = WING_W * (29 / 16);
/** How far back the wings sweep from straight out sideways (radians): never flatter than MIN_BACK. */
export const MIN_BACK = 1.02, MAX_BACK = 1.42;
/** The hinge: behind her back, and the height of the heart's point above the ground. */
export const HINGE_Z = -0.34, TIP_Y = 0.22;
/** How far to the side any part of a wing can reach from her centre (model units). */
export const WING_REACH = WING_W * Math.cos(MIN_BACK);

// ───── the picture ─────

let cached: THREE.Texture | null | undefined;

/** A small seeded random. */
function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

/** Smooth value noise for bending the leading into curves here and there. */
function noise2(seed: number) {
  const r = rng(seed), P = Array.from({ length: 256 }, () => r());
  const h = (x: number, y: number) => P[(x * 73 + y * 151) & 255];
  return (x: number, y: number) => {
    const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };
}

/** A point on the outline of the half heart (t from 0 at the top dip to π at the point), with the butterfly notch. */
function outline(t: number): [number, number] {
  const X = 16 * Math.sin(t) ** 3;
  const Y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
  // Between fore- and hind-wing the edge dips in; a fine scallop runs all round.
  const k = 1 - 0.1 * Math.exp(-(((t - 1.95) / 0.13) ** 2)) + 0.012 * Math.sin(t * 46);
  const cy = -3;
  return [X * k, cy + (Y - cy) * k];
}

function hsl(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s, hp = ((h % 360) + 360) % 360 / 60, x = c * (1 - Math.abs((hp % 2) - 1));
  const [r, g, b] = hp < 1 ? [c, x, 0] : hp < 2 ? [x, c, 0] : hp < 3 ? [0, c, x] : hp < 4 ? [0, x, c] : hp < 5 ? [x, 0, c] : [c, 0, x];
  const m = l - c / 2;
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Draw one wing (the right one; the left mirrors it). Null where there is no canvas (tests). */
export function wingTexture(): THREE.Texture | null {
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') return (cached = null);
  const W = 560, H = Math.round(W * 29 / 16);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  // Heart units → pixels: x 0..16 across, y 12 (top) .. -17 (point) down.
  const px = (X: number) => 4 + (X / 16) * (W - 10);
  const py = (Y: number) => 4 + ((12 - Y) / 29) * (H - 8);
  const shape = new Path2D();
  shape.moveTo(px(0), py(outline(0)[1]));
  for (let i = 1; i <= 240; i++) { const [X, Y] = outline((i / 240) * Math.PI); shape.lineTo(px(X), py(Y)); }
  shape.closePath();

  // Panes: seeds scattered unevenly — small panes near the root and the edges, large ones between.
  const r = rng(9173), n1 = noise2(31), n2 = noise2(77);
  const seeds: Array<[number, number]> = [];
  for (let tries = 0; seeds.length < 330 && tries < 20000; tries++) {
    const x = r() * W, y = r() * H;
    if (!ctx.isPointInPath(shape, x, y)) continue;
    const root = Math.exp(-((x / W) ** 2) * 9), clump = n1(x / 70, y / 70);
    const dens = 0.18 + 0.55 * root + 0.5 * clump * clump;
    if (r() < dens) seeds.push([x, y]);
  }
  // Each pane: an even patch of colour, drifting through the rainbow across the wing; some black, some gold.
  const col = seeds.map(([x, y]) => {
    const q = r();
    if (q < 0.07) return [18, 14, 22] as const;
    if (q < 0.15) return [212 + r() * 30, 164 + r() * 30, 58 + r() * 20] as const;
    const hue = (y / H) * 250 + (x / W) * 70 + (r() - 0.5) * 70 - 10;
    return hsl(hue, 0.72 + r() * 0.26, 0.5 + r() * 0.16);
  });
  // A grid over the seeds to find the nearest two quickly.
  const G = 36, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
  const grid: number[][] = Array.from({ length: gw * gh }, () => []);
  seeds.forEach(([x, y], i) => grid[Math.floor(y / G) * gw + Math.floor(x / G)].push(i));

  const img = ctx.createImageData(W, H), d = img.data;
  const inside = new Uint8Array(W * H);
  {
    const m = document.createElement('canvas');
    m.width = W; m.height = H;
    const mc = m.getContext('2d')!;
    mc.fill(shape);
    const md = mc.getImageData(0, 0, W, H).data;
    for (let i = 0; i < W * H; i++) inside[i] = md[i * 4 + 3] > 127 ? 1 : 0;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = y * W + x;
    if (!inside[o]) { d[o * 4 + 3] = 0; continue; }
    // Bend the lookup a little in some places: curved leading there, straight elsewhere.
    const bend = Math.max(0, n2(x / 160, y / 160) - 0.35) * 46;
    const wx = x + (n1(x / 48 + 9, y / 48) - 0.5) * bend, wy = y + (n1(x / 48, y / 48 + 5) - 0.5) * bend;
    let b1 = 1e9, b2 = 1e9, i1 = 0;
    const cx = Math.floor(wx / G), cy = Math.floor(wy / G);
    for (let gy = cy - 2; gy <= cy + 2; gy++) for (let gx = cx - 2; gx <= cx + 2; gx++) {
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
      for (const i of grid[gy * gw + gx]) {
        const dd = (seeds[i][0] - wx) ** 2 + (seeds[i][1] - wy) ** 2;
        if (dd < b1) { b2 = b1; b1 = dd; i1 = i; } else if (dd < b2) b2 = dd;
      }
    }
    const edge = Math.sqrt(b2) - Math.sqrt(b1);
    // Leading of uneven width: black, with a thread of gold inside it.
    const lw = 1.3 + n1(x / 30, y / 30) * 2.2;
    let c: readonly number[], a = 205;
    if (edge < lw * 0.42) { c = [236, 196, 92]; a = 255; }
    else if (edge < lw) { c = [10, 8, 12]; a = 255; }
    else {
      const base = col[i1], glass = 0.93 + 0.1 * Math.min(1, edge / 22);
      c = [base[0] * glass, base[1] * glass, base[2] * glass];
    }
    d[o * 4] = Math.min(255, c[0]); d[o * 4 + 1] = Math.min(255, c[1]); d[o * 4 + 2] = Math.min(255, c[2]); d[o * 4 + 3] = a;
  }
  ctx.putImageData(img, 0, 0);

  // Veins: curved strokes sweeping from the root to the edge, and a few straight shards across.
  ctx.save();
  ctx.clip(shape);
  ctx.lineCap = 'round';
  const root: [number, number] = [px(0.3), py(-3)];
  const stroke = (path: Path2D, w: number) => {
    ctx.strokeStyle = '#0a080c'; ctx.lineWidth = w; ctx.stroke(path);
    ctx.strokeStyle = '#f0c95e'; ctx.lineWidth = w * 0.34; ctx.stroke(path);
  };
  for (let i = 0; i < 9; i++) {
    const t = 0.18 + (i / 8) * (Math.PI - 0.36);
    const [X, Y] = outline(t), end: [number, number] = [px(X * 0.99), py(Y * 0.99)];
    const bow = (i % 2 ? 1 : -1) * (26 + r() * 40);
    const mx = (root[0] + end[0]) / 2, my = (root[1] + end[1]) / 2;
    const nx = -(end[1] - root[1]), ny = end[0] - root[0], nl = Math.hypot(nx, ny) || 1;
    const p = new Path2D();
    p.moveTo(...root);
    p.quadraticCurveTo(mx + (nx / nl) * bow, my + (ny / nl) * bow, ...end);
    stroke(p, 7 + r() * 3);
  }
  for (let i = 0; i < 7; i++) {
    const p = new Path2D(), a = r() * Math.PI, x0 = r() * W * 0.8 + W * 0.1, y0 = r() * H;
    const L = 40 + r() * 90;
    p.moveTo(x0 - Math.cos(a) * L, y0 - Math.sin(a) * L); p.lineTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L);
    stroke(p, 3.5 + r() * 2);
  }
  ctx.restore();
  // The rim: black with gold inside it, and small gold beads along the edge.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0a080c'; ctx.lineWidth = 11; ctx.stroke(shape);
  ctx.strokeStyle = '#f2cf6a'; ctx.lineWidth = 3.4; ctx.stroke(shape);
  ctx.fillStyle = '#ffe49a';
  for (let i = 1; i < 40; i++) {
    const [X, Y] = outline((i / 40) * Math.PI);
    ctx.beginPath(); ctx.arc(px(X * 0.955), py(-3 + (Y + 3) * 0.955), 2.6, 0, Math.PI * 2); ctx.fill();
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.generateMipmaps = true;
  return (cached = tex);
}

// ───── the wings ─────

const VERT = /* glsl */ `
  uniform float uBack, uCurl, uSide, uTime, uLift;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vUv = vec2(uv.x, uv.y);
    float s = position.x / ${WING_W.toFixed(3)};
    // Each point is turned back about the hinge; the further out, the more — so the wing curves.
    float th = uBack + uCurl * s * s + 0.05 * sin(uTime * 1.7 + position.y * 1.3) * s;
    vec3 p = vec3(uSide * position.x * cos(th), position.y + uLift * s * s, -position.x * sin(th));
    vShade = 0.82 + 0.18 * cos(th - 0.9);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime, uHasMap, uGlow;
  varying vec2 vUv;
  varying float vShade;
  void main() {
    vec4 c = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(0.8, 0.6, 1.0, 0.8);
    if (c.a < 0.05) discard;
    // A soft light slides slowly over the glass.
    float band = fract(vUv.x * 0.55 + vUv.y * 0.9 - uTime * 0.07);
    float sweep = smoothstep(0.1, 0.0, abs(band - 0.5));
    // Gold leading glints brighter; glass glows from within.
    float gold = step(0.62, c.r) * step(0.45, c.g) * step(c.b, 0.5) * step(0.99, c.a);
    vec3 col = c.rgb * vShade * (uGlow + 0.25 * gold) + c.rgb * sweep * 0.3;
    gl_FragColor = vec4(col, c.a < 0.99 ? 0.8 : 1.0);
  }
`;

/** The pair of wings, hinged at her back. Call `update` every frame. */
export class Wings {
  readonly group = new THREE.Group();
  private mats: THREE.ShaderMaterial[] = [];

  constructor() {
    const map = wingTexture();
    const geo = new THREE.PlaneGeometry(WING_W, WING_H, 22, 30);
    geo.translate(WING_W / 2, WING_H / 2, 0);
    for (const side of [1, -1]) {
      const m = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, transparent: true, depthWrite: false,
        uniforms: {
          uMap: { value: map }, uHasMap: { value: map ? 1 : 0 }, uTime: { value: 0 }, uGlow: { value: 1.08 },
          uBack: { value: MIN_BACK }, uCurl: { value: 0 }, uSide: { value: side }, uLift: { value: 0 },
        },
      });
      const w = new THREE.Mesh(geo, m);
      w.userData.part = 'wing';
      w.frustumCulled = false;
      w.renderOrder = 2;
      this.mats.push(m);
      this.group.add(w);
    }
    this.group.position.set(0, TIP_Y, HINGE_Z);
  }

  /** Slow, deep beats; the tips lag the root, so the wing curves as it moves. Folded close when riding. */
  update(t: number, airborne: boolean, riding: boolean): void {
    const period = airborne ? 2.4 : 3.8, ph = (t / period) * Math.PI * 2;
    const mid = riding ? MAX_BACK : (MIN_BACK + MAX_BACK) / 2, amp = riding ? 0 : (MAX_BACK - MIN_BACK) / 2;
    const back = mid - Math.sin(ph) * amp;
    // The tips trail the beat: curl toward where the wing has just been.
    const curl = riding ? 0.05 : Math.cos(ph) * 0.22 + 0.08;
    for (const m of this.mats) {
      m.uniforms.uTime.value = t;
      m.uniforms.uBack.value = Math.min(MAX_BACK + 0.12, Math.max(MIN_BACK, back));
      m.uniforms.uCurl.value = Math.max(0, curl);
      m.uniforms.uLift.value = Math.sin(ph + 0.6) * 0.1;
    }
  }
}
