import * as THREE from 'three';

/**
 * Her stained-glass butterfly wings (owner's brief, OWNER_REQUESTS_SPEC §6.2 and §12): a giant
 * swallowtail — great pointed forewings sweeping up above her, smaller scalloped hindwings below,
 * each ending in a long tail with a jewelled eyespot beside it — vast and expansive, over three times her
 * height and broad, reaching up far above her and down to her feet. The glass is one flowing colour, not patches: pink in the middle at her back, turning
 * outward through the rainbow to the edges. It is fragmented by thick black leading with gold in it,
 * and by curved veins sweeping out from the root. It shines, a light moves over it, glitter twinkles
 * in it, and glitter drifts off it as they beat. They spread wide and flap heavily, slowly, and
 * curve as they flap — the tips lag the root.
 *
 * They are wide, so on the ground the boy stands in front of them (they only ever reach behind
 * her back), and in flight he keeps behind her, beyond their reach (`WING_REACH`, Travellers,
 * tests/wings.test.ts). Riding, they are folded away.
 */

/** Her height on the unscaled body (floating head included). */
const HER_HEIGHT = 1.78;
/** One wing: 4.3 times her height tall and 0.8 as broad — the forewing tall and vast, the hindwing vast and of middling height. */
export const WING_H = 4.3 * HER_HEIGHT, WING_W = WING_H * 0.8;
/** Across the pair, open flat. */
export const WING_SPAN = 2 * WING_W;
/** How far back the wings sweep from straight out sideways (radians): spread wide ... folded back. */
export const MIN_BACK = 0.3, MAX_BACK = 1.35;
/** The root: one point set into her back (HINGE_Z, just inside its surface, under the clasp), at mid-back height (ROOT_Y). */
export const HINGE_Z = -0.12, ROOT_Y = 1.2;
/** Where the root is up the wing (0 = the tails' tips, 1 = the forewing's apex): the tails then just reach the ground. */
export const ROOT_V = (ROOT_Y + 0.06) / WING_H;
/** How far from her centre any part of a wing can reach, in any direction (model units). */
export const WING_REACH = WING_W + Math.abs(HINGE_Z);

// ───── the picture: leading, veins and rim (the glass colour is painted by the shader) ─────

let cached: THREE.Texture | null | undefined;
let sparkTex: THREE.Texture | null | undefined;

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

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

/**
 * One swallowtail wing, in (out, up) from 0 to 1: everything grows from one point at her back
 * (out = 0, up = ROOT_V). The forewing's leading edge arches up and out from it to the pointed apex
 * high above, the outer edge falls back a little hollowed, then the smaller hindwing, scalloped,
 * sweeps down to a long tail whose tip reaches the ground, and its inner edge returns to the root.
 */
const R0 = ROOT_V;
const KEY: Array<[number, number]> = [
  [0, R0],
  // The leading edge leaves her back sideways, over her shoulder-blade, before it arches up — clear of her floating head.
  [0.035, R0 + 0.008], [0.065, R0 + 0.025], [0.1, 0.3], [0.14, 0.43], [0.22, 0.59], [0.36, 0.74], [0.53, 0.87], [0.7, 0.955], [0.84, 0.995], [0.94, 0.99], [0.99, 0.94],
  [0.97, 0.84], [0.9, 0.72], [0.82, 0.62], [0.73, 0.54], [0.66, 0.48],
  [0.62, 0.45],
  [0.72, 0.42], [0.83, 0.37], [0.9, 0.29], [0.91, 0.21], [0.86, 0.14], [0.77, 0.09], [0.68, 0.065],
  [0.63, 0.035], [0.6, 0.005], [0.57, 0.0], [0.55, 0.03], [0.53, 0.07],
  [0.42, 0.085], [0.29, 0.1], [0.17, 0.12], [0.07, R0 - 0.022], [0.02, R0 - 0.01],
];
/** Where the hindwing's scalloped edge runs (indices into KEY). */
const SCALLOP: [number, number] = [17, 24];

/** The outline, smoothed (Catmull-Rom through KEY), scalloped along the hindwing. Closed. */
export const OUTLINE: Array<[number, number]> = (() => {
  const out: Array<[number, number]> = [], n = KEY.length, STEPS = 10;
  for (let i = 0; i < n; i++) {
    const p0 = KEY[(i - 1 + n) % n], p1 = KEY[i], p2 = KEY[(i + 1) % n], p3 = KEY[(i + 2) % n];
    for (let k = 0; k < STEPS; k++) {
      const t = k / STEPS, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      let x = f(p0[0], p1[0], p2[0], p3[0]), y = f(p0[1], p1[1], p2[1], p3[1]);
      if (i >= SCALLOP[0] && i < SCALLOP[1]) {
        // Scallops: the edge dips in between little lobes.
        const dip = 0.011 * Math.pow(Math.abs(Math.sin(((i - SCALLOP[0]) + t) * Math.PI)), 0.5);
        x -= dip;
      }
      out.push([Math.max(0, x), Math.max(0, y)]);
    }
  }
  return out;
})();

/** Whether (out, up) is on the wing. */
export function onWing(u: number, v: number): boolean {
  let inside = false;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const [xi, yi] = OUTLINE[i], [xj, yj] = OUTLINE[j];
    if ((yi > v) !== (yj > v) && u < ((xj - xi) * (v - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * One wing's picture: white where the glass is (the shader colours it), black leading with a thread
 * of gold, and transparent outside. Null where there is no canvas (tests).
 */
export function wingTexture(): THREE.Texture | null {
  if (cached !== undefined) return cached;
  if (typeof document === 'undefined') return (cached = null);
  // The canvas has the wing's own proportions, so nothing is stretched.
  const W = 640, H = Math.round((W * WING_H) / WING_W);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const px = (u: number) => 8 + u * (W - 16);
  const py = (v: number) => 8 + (1 - v) * (H - 16);
  const shape = new Path2D();
  OUTLINE.forEach(([u, v], i) => (i ? shape.lineTo(px(u), py(v)) : shape.moveTo(px(u), py(v))));
  shape.closePath();

  // Fragments of every size: broad panes across the wing, clusters of small shards here and there,
  // and finer pieces crowding towards the root.
  const r = rng(9173), n1 = noise2(31), n2 = noise2(77);
  const inside = new Uint8Array(W * H);
  {
    const m = document.createElement('canvas');
    m.width = W; m.height = H;
    const mc = m.getContext('2d')!;
    mc.fill(shape);
    const md = mc.getImageData(0, 0, W, H).data;
    for (let i = 0; i < W * H; i++) inside[i] = md[i * 4 + 3] > 127 ? 1 : 0;
  }
  const seeds: Array<[number, number]> = [];
  const put = (x: number, y: number) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < W && y < H && inside[y * W + x]) seeds.push([x, y]); };
  for (let k = 0; k < 4000 && seeds.length < 46; k++) put(r() * W, r() * H); // broad panes
  for (let k = 0, n = 0; k < 4000 && n < 26; k++) {
    const x = r() * W, y = r() * H;
    if (!inside[Math.floor(y) * W + Math.floor(x)]) continue;
    n++;
    const rad = 16 + r() * 46, m = 4 + Math.floor(r() * 9);
    for (let i = 0; i < m; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * rad; put(x + Math.cos(a) * d, y + Math.sin(a) * d); }
  }
  const rx = px(0), ry = py(R0);
  for (let k = 0; k < 40; k++) { const a = -Math.PI / 2 + r() * Math.PI, d = 20 + r() * r() * W * 0.45; put(rx + Math.cos(a) * d, ry + Math.sin(a) * d); }
  const G = 48, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
  const grid: number[][] = Array.from({ length: gw * gh }, () => []);
  seeds.forEach(([x, y], i) => grid[Math.floor(y / G) * gw + Math.floor(x / G)].push(i));

  const img = ctx.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const o = y * W + x;
    if (!inside[o]) { d[o * 4 + 3] = 0; continue; }
    const bend = Math.max(0, n2(x / 170, y / 170) - 0.35) * 50;
    const wx = x + (n1(x / 50 + 9, y / 50) - 0.5) * bend, wy = y + (n1(x / 50, y / 50 + 5) - 0.5) * bend;
    let b1 = 1e9, b2 = 1e9;
    const cx = Math.floor(wx / G), cy = Math.floor(wy / G);
    for (let gy = cy - 3; gy <= cy + 3; gy++) for (let gx = cx - 3; gx <= cx + 3; gx++) {
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
      for (const i of grid[gy * gw + gx]) {
        const dd = (seeds[i][0] - wx) ** 2 + (seeds[i][1] - wy) ** 2;
        if (dd < b1) { b2 = b1; b1 = dd; } else if (dd < b2) b2 = dd;
      }
    }
    const edge = Math.sqrt(b2) - Math.sqrt(b1);
    // Thick leading, uneven in width: black, with gold down its middle.
    const lw = 5 + n1(x / 34, y / 34) * 4;
    let c: number[];
    if (edge < lw * 0.22) c = [238, 196, 88, 255];
    else if (edge < lw) c = [8, 6, 10, 255];
    else { const g = 238 + n1(x / 60 + 3, y / 60 + 7) * 17; c = [g, g, g, 150]; } // glass: white, a gentle ripple
    d[o * 4] = c[0]; d[o * 4 + 1] = c[1]; d[o * 4 + 2] = c[2]; d[o * 4 + 3] = c[3];
  }
  ctx.putImageData(img, 0, 0);

  // Veins: thick curved strokes from the root, and a few straight shards.
  ctx.save();
  ctx.clip(shape);
  ctx.lineCap = 'round';
  const root: [number, number] = [px(0), py(R0)];
  const stroke = (path: Path2D, w: number) => {
    ctx.strokeStyle = '#08060a'; ctx.lineWidth = w; ctx.stroke(path);
    ctx.strokeStyle = '#f0c95e'; ctx.lineWidth = w * 0.24; ctx.stroke(path);
  };
  // Veins to the edge all round, from the leading edge over the apex to the tail.
  const from = 3 * 10, to = 27 * 10;
  for (let i = 0; i < 14; i++) {
    const [u, v] = OUTLINE[Math.round(from + (i / 13) * (to - from))];
    const end: [number, number] = [px(u), py(v)];
    const bow = (i % 2 ? 1 : -1) * (30 + r() * 50);
    const mx = (root[0] + end[0]) / 2, my = (root[1] + end[1]) / 2;
    const nx = -(end[1] - root[1]), ny = end[0] - root[0], nl = Math.hypot(nx, ny) || 1;
    const p = new Path2D();
    p.moveTo(...root);
    p.quadraticCurveTo(mx + (nx / nl) * bow, my + (ny / nl) * bow, ...end);
    stroke(p, 18 + r() * 6);
  }
  for (let i = 0; i < 8; i++) {
    const p = new Path2D(), a = r() * Math.PI, x0 = r() * W * 0.8 + W * 0.1, y0 = r() * H;
    const L = 50 + r() * 110;
    p.moveTo(x0 - Math.cos(a) * L, y0 - Math.sin(a) * L); p.lineTo(x0 + Math.cos(a) * L, y0 + Math.sin(a) * L);
    stroke(p, 7 + r() * 3);
  }
  ctx.restore();
  // The rim: thick black with gold inside it, and gold beads along the edge.
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#08060a'; ctx.lineWidth = 24; ctx.stroke(shape);
  ctx.strokeStyle = '#f2cf6a'; ctx.lineWidth = 5; ctx.stroke(shape);
  ctx.fillStyle = '#ffe49a';
  for (let i = 4; i < OUTLINE.length - 4; i += 7) {
    const [u, v] = OUTLINE[i];
    // Beads just inside the rim, pulled a little toward the root.
    ctx.beginPath(); ctx.arc(px(u * 0.965), py(R0 + (v - R0) * 0.965), 3.6, 0, Math.PI * 2); ctx.fill();
  }
  // The swallowtail's eyespot beside the tail: a jewel of pink and blue ringed in black and gold.
  const ex = px(0.5), ey = py(0.13), er = 0.035 * (W - 16);
  for (const [rr, c] of [[1, '#08060a'], [0.82, '#f2cf6a'], [0.7, '#4fa8ff'], [0.42, '#ff5fa8'], [0.16, '#fff4fa']] as const) {
    ctx.beginPath(); ctx.arc(ex, ey, er * rr, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  return (cached = tex);
}

/** A soft round spark for the drifting glitter. */
function sparkTexture(): THREE.Texture | null {
  if (sparkTex !== undefined) return sparkTex;
  if (typeof document === 'undefined') return (sparkTex = null);
  const S = 64, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const x = cv.getContext('2d')!, g = x.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,230,245,0.8)'); g.addColorStop(1, 'rgba(255,200,230,0)');
  x.fillStyle = g; x.fillRect(0, 0, S, S);
  // A four-point glint.
  x.strokeStyle = 'rgba(255,255,255,0.9)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(S / 2, 4); x.lineTo(S / 2, S - 4); x.moveTo(4, S / 2); x.lineTo(S - 4, S / 2); x.stroke();
  return (sparkTex = new THREE.CanvasTexture(cv));
}

// ───── the wings ─────

/** Where a point of the wing (distance out from the hinge, height) is as the wing beats. Shared by the shader and the glitter. */
const BEND_GLSL = /* glsl */ `
  vec3 bendWing(float x, float y, float side) {
    float s = x / ${WING_W.toFixed(3)};
    float th = uBack + uCurl * s * s + 0.05 * sin(uTime * 1.7 + y * 1.1) * s;
    return vec3(side * x * cos(th), y + uLift * s * s, -x * sin(th));
  }
`;
const VERT = /* glsl */ `
  uniform float uBack, uCurl, uSide, uTime, uLift;
  varying vec2 vUv;
  varying float vShade;
  ${BEND_GLSL}
  void main() {
    vUv = uv;
    vec3 p = bendWing(position.x, position.y, uSide);
    float s = position.x / ${WING_W.toFixed(3)};
    vShade = 0.84 + 0.16 * cos(uBack + uCurl * s * s - 0.7);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;
const FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uTime, uHasMap, uPass;
  varying vec2 vUv;
  varying float vShade;
  vec3 hsl(float h, float s, float l) {
    vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
    return l + s * (k - 0.5) * (1.0 - abs(2.0 * l - 1.0));
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(41.3, 289.1))) * 43758.5453); }
  void main() {
    vec4 c = uHasMap > 0.5 ? texture2D(uMap, vUv) : vec4(1.0, 1.0, 1.0, 0.6);
    if (c.a < 0.05) discard;
    // Two passes: the leading (solid, it hides what is behind it), then the glass.
    if ((uPass < 0.5) != (c.a >= 0.9)) discard;
    vec3 col;
    float a;
    if (c.a < 0.9) {
      // Glass: pink at her back, flowing outward through the rainbow — one colour, no patches.
      float r = length((vUv - vec2(0.0, ${ROOT_V.toFixed(3)})) * vec2(1.0, ${(WING_H / WING_W).toFixed(3)}));
      float t = smoothstep(0.08, 1.6, r);
      float h = mod(330.0 + 310.0 * t, 360.0) / 360.0;
      col = hsl(h, 1.0, mix(0.6, 0.5, t)) * c.r;
      // Glitter twinkling in the glass.
      vec2 cell = floor(vUv * vec2(70.0, 160.0));
      float g = hash(cell), tw = pow(max(0.0, sin(uTime * 2.6 + g * 40.0)), 18.0) * step(0.9, g);
      col += vec3(1.0, 0.85, 0.95) * tw * 1.3;
      a = 0.68;
    } else {
      col = c.rgb;
      a = 1.0;
    }
    // A soft light slides slowly across.
    float band = fract(vUv.x * 0.5 + vUv.y * 0.8 - uTime * 0.06);
    col += col * smoothstep(0.1, 0.0, abs(band - 0.5)) * 0.35;
    gl_FragColor = vec4(col * vShade, a);
  }
`;

const GLITTER = 150;

/** The wing's sheet cut to its outline: only the cells that touch the wing are kept (no hidden sheet round it). */
function trimmed(plane: THREE.PlaneGeometry): THREE.BufferGeometry {
  const uv = plane.getAttribute('uv'), idx = plane.getIndex()!, keep: number[] = [];
  const on = (i: number) => onWing(uv.getX(i), uv.getY(i));
  for (let t = 0; t < idx.count; t += 3) {
    const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
    const cu = (uv.getX(a) + uv.getX(b) + uv.getX(c)) / 3, cv = (uv.getY(a) + uv.getY(b) + uv.getY(c)) / 3;
    if (on(a) || on(b) || on(c) || onWing(cu, cv)) keep.push(a, b, c);
  }
  plane.setIndex(keep);
  const out = plane.toNonIndexed();
  plane.dispose();
  return out;
}

/** The pair of wings, hinged at her back, with glitter drifting off them. Call `update` every frame. */
export class Wings {
  readonly group = new THREE.Group();
  private mats: THREE.ShaderMaterial[] = [];
  private glass: THREE.Mesh[] = [];
  private glitter: THREE.Points;
  /** Each grain: where on a wing it started (out, up, side), its age and how long it lives. */
  private grains: Array<{ x: number; y: number; side: number; age: number; life: number; vy: number; vo: number }> = [];
  private back = MIN_BACK; private curl = 0; private lift = 0;

  constructor() {
    const map = wingTexture();
    const geo = trimmed(new THREE.PlaneGeometry(WING_W, WING_H, 32, 48));
    geo.translate(WING_W / 2, WING_H / 2 - ROOT_V * WING_H, 0); // the root point at the origin
    const _c = new THREE.Vector3();
    for (const side of [1, -1]) {
      for (const pass of [0, 1]) {
        const m = new THREE.ShaderMaterial({
          vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
          // The leading is solid and writes depth; the glass is see-through and does not.
          transparent: pass === 1, depthWrite: pass === 0,
          uniforms: {
            uMap: { value: map }, uHasMap: { value: map ? 1 : 0 }, uTime: { value: 0 }, uPass: { value: pass },
            uBack: { value: MIN_BACK }, uCurl: { value: 0 }, uSide: { value: side }, uLift: { value: 0 },
          },
        });
        const w = new THREE.Mesh(geo, m);
        w.userData.part = 'wing';
        w.frustumCulled = false;
        if (pass === 1) {
          // The glass of the farther wing is drawn first, so the nearer wing's glass lies over it.
          w.onBeforeRender = (_r, _s, camera) => {
            const half = WING_W * 0.5;
            _c.set(side * half * Math.cos(this.back), WING_H * (0.55 - ROOT_V), -half * Math.sin(this.back));
            this.group.localToWorld(_c);
            // Farther → smaller order → drawn first (takes effect from the next frame).
            w.renderOrder = 3 - Math.min(0.9, _c.distanceTo(camera.position) / 1000);
          };
          this.glass.push(w);
        }
        this.mats.push(m);
        this.group.add(w);
      }
    }
    // Glitter: pink, gold and white sparks shed from the glass, drifting down and away.
    const pos = new Float32Array(GLITTER * 3), col = new Float32Array(GLITTER * 3);
    const tints = [[0.8, 0.35, 0.6], [0.8, 0.65, 0.3], [0.75, 0.75, 0.75], [0.65, 0.4, 0.8]];
    const r = rng(501);
    for (let i = 0; i < GLITTER; i++) {
      const tnt = tints[i % tints.length];
      col.set(tnt, i * 3);
      this.grains.push(this.newGrain(r, r() * 3));
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const spark = sparkTexture();
    this.glitter = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.065, map: spark, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    this.glitter.userData.part = 'wing';
    this.glitter.frustumCulled = false;
    this.group.add(this.glitter);
    // The clasp where both wings join her back: a gold setting round a dark jewel, with a pink glint.
    const clasp = new THREE.Group();
    const gold = new THREE.MeshStandardMaterial({ color: '#e0b64a', metalness: 1, roughness: 0.25, emissive: '#6b4a10', emissiveIntensity: 0.4 });
    const jewel = new THREE.MeshStandardMaterial({ color: '#1a0c14', metalness: 0.3, roughness: 0.15, emissive: '#ff5fa8', emissiveIntensity: 0.35 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.018, 8, 20), gold);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.06, 14, 10), jewel);
    gem.scale.set(1, 1.3, 0.55);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 8), gold);
    stem.position.y = -0.1;
    for (const m of [ring, gem, stem]) { m.userData.part = 'wing'; clasp.add(m); }
    clasp.position.z = -0.02;
    this.group.add(clasp);
    this.group.position.set(0, ROOT_Y, HINGE_Z);
  }

  private rnd = rng(733);
  private newGrain(r: () => number, age = 0) {
    let u = 0.5, v = 0.6;
    for (let k = 0; k < 30; k++) { u = 0.3 + r() * 0.7; v = r(); if (onWing(u, v)) break; }
    return { x: u * WING_W, y: (v - ROOT_V) * WING_H, side: r() < 0.5 ? 1 : -1, age, life: 2 + r() * 2.5, vy: -0.15 - r() * 0.3, vo: 0.05 + r() * 0.15 };
  }

  /** Heavy, slow beats — spread wide, then swept back — the tips lagging; glitter shed as they go. Hidden when riding. */
  update(t: number, dt: number, airborne: boolean, riding: boolean): void {
    this.group.visible = !riding;
    if (riding) return;
    const period = airborne ? 2.0 : 3.0, ph = (t / period) * Math.PI * 2;
    // A heavy beat: the downstroke (spreading) is quicker than the recovery.
    const beat = Math.sin(ph + 0.45 * Math.sin(ph));
    const mid = (MIN_BACK + MAX_BACK) / 2, amp = (MAX_BACK - MIN_BACK) / 2;
    this.back = Math.min(MAX_BACK, Math.max(MIN_BACK, mid - beat * amp));
    this.curl = Math.max(0, Math.cos(ph) * 0.45 + 0.12);
    this.lift = Math.sin(ph + 0.6) * 0.3;
    for (const m of this.mats) {
      m.uniforms.uTime.value = t;
      m.uniforms.uBack.value = this.back;
      m.uniforms.uCurl.value = this.curl;
      m.uniforms.uLift.value = this.lift;
    }
    // Glitter rides the wing surface where it was shed, then drifts off, down and outward.
    const pos = this.glitter.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < this.grains.length; i++) {
      let g = this.grains[i];
      g.age += dt;
      if (g.age > g.life) g = this.grains[i] = this.newGrain(this.rnd);
      const s = g.x / WING_W, th = this.back + this.curl * s * s;
      const off = g.age * g.vo;
      pos.setXYZ(i, g.side * g.x * Math.cos(th) + g.side * off, g.y + this.lift * s * s + g.age * g.vy, -g.x * Math.sin(th) - off * 0.5);
    }
    pos.needsUpdate = true;
  }
}
