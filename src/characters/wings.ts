import * as THREE from 'three';

/**
 * Her stained-glass butterfly wings (owner's brief, OWNER_REQUESTS_SPEC §6.2 and §12): a giant
 * swallowtail — great pointed forewings sweeping up above her, smaller scalloped hindwings below,
 * each ending in a long tail with a jewelled eyespot beside it — vast and expansive, three times her
 * height, reaching up far above her and down to her feet. The glass is one flowing colour, not patches: pink in the middle at her back, turning
 * outward through the rainbow to the edges. It is fragmented by thick black leading with gold in it,
 * and by curved veins sweeping out from the root. It shines, a light moves over it, glitter twinkles
 * in it, and glitter drifts off it as they beat. They spread wide and flap heavily, slowly, and
 * curve as they flap — the tips lag the root.
 *
 * They are wide, so when she wears them the boy keeps further away (`WING_REACH`, Travellers,
 * tests/wings.test.ts). Riding, they are folded away.
 */

/** Her height on the unscaled body (floating head included). */
const HER_HEIGHT = 1.78;
/** One wing: three times her height tall, half as wide. */
export const WING_H = 3 * HER_HEIGHT, WING_W = WING_H * 0.5;
/** Across the pair, open flat. */
export const WING_SPAN = 2 * WING_W;
/** How far back the wings sweep from straight out sideways (radians): spread wide ... folded back. */
export const MIN_BACK = 0.3, MAX_BACK = 1.35;
/** The hinge: behind her back; the tails' tips just reach the ground (the root is then at her back). */
export const HINGE_Z = -0.34, TIP_Y = -0.08;
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
 * One swallowtail wing, in (out, up) from 0 to 1: the root at her back (out = 0, up ≈ 0.22–0.37),
 * the forewing's pointed apex high and outward, its outer edge a little hollowed, then the smaller
 * hindwing, scalloped, ending in a long tail that reaches the ground.
 */
const KEY: Array<[number, number]> = [
  [0, 0.37], [0.1, 0.5], [0.28, 0.66], [0.52, 0.82], [0.76, 0.94], [0.93, 1.0], [0.99, 0.95],
  [0.95, 0.82], [0.88, 0.68], [0.8, 0.56], [0.72, 0.47], [0.62, 0.43],
  [0.72, 0.39], [0.76, 0.3], [0.72, 0.21], [0.65, 0.15], [0.58, 0.11],
  [0.55, 0.06], [0.53, 0.015], [0.51, 0.0], [0.48, 0.01], [0.47, 0.06], [0.44, 0.1],
  [0.32, 0.1], [0.19, 0.13], [0.09, 0.17], [0.03, 0.2], [0, 0.22],
];
/** Where the hindwing's scalloped edge runs (indices into KEY). */
const SCALLOP: [number, number] = [12, 17];

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
  const W = 600, H = Math.round(W / 0.5);
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d')!;
  const px = (u: number) => 8 + u * (W - 16);
  const py = (v: number) => 8 + (1 - v) * (H - 16);
  const shape = new Path2D();
  OUTLINE.forEach(([u, v], i) => (i ? shape.lineTo(px(u), py(v)) : shape.moveTo(px(u), py(v))));
  shape.closePath();

  // Fragments: small and large, uneven — denser near the root and in clusters.
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
  for (let tries = 0; seeds.length < 300 && tries < 30000; tries++) {
    const x = Math.floor(r() * W), y = Math.floor(r() * H);
    if (!inside[y * W + x]) continue;
    const root = Math.exp(-((x / W) ** 2) * 9), clump = n1(x / 80, y / 80);
    if (r() < 0.14 + 0.5 * root + 0.5 * clump * clump) seeds.push([x, y]);
  }
  const G = 40, gw = Math.ceil(W / G), gh = Math.ceil(H / G);
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
    for (let gy = cy - 2; gy <= cy + 2; gy++) for (let gx = cx - 2; gx <= cx + 2; gx++) {
      if (gx < 0 || gy < 0 || gx >= gw || gy >= gh) continue;
      for (const i of grid[gy * gw + gx]) {
        const dd = (seeds[i][0] - wx) ** 2 + (seeds[i][1] - wy) ** 2;
        if (dd < b1) { b2 = b1; b1 = dd; } else if (dd < b2) b2 = dd;
      }
    }
    const edge = Math.sqrt(b2) - Math.sqrt(b1);
    // Thick leading, uneven in width: black, with gold down its middle.
    const lw = 3.6 + n1(x / 34, y / 34) * 3.2;
    let c: number[];
    if (edge < lw * 0.36) c = [238, 196, 88, 255];
    else if (edge < lw) c = [8, 6, 10, 255];
    else { const g = 238 + n1(x / 60 + 3, y / 60 + 7) * 17; c = [g, g, g, 150]; } // glass: white, a gentle ripple
    d[o * 4] = c[0]; d[o * 4 + 1] = c[1]; d[o * 4 + 2] = c[2]; d[o * 4 + 3] = c[3];
  }
  ctx.putImageData(img, 0, 0);

  // Veins: thick curved strokes from the root, and a few straight shards.
  ctx.save();
  ctx.clip(shape);
  ctx.lineCap = 'round';
  const root: [number, number] = [px(0.01), py(0.3)];
  const stroke = (path: Path2D, w: number) => {
    ctx.strokeStyle = '#08060a'; ctx.lineWidth = w; ctx.stroke(path);
    ctx.strokeStyle = '#f0c95e'; ctx.lineWidth = w * 0.38; ctx.stroke(path);
  };
  // Veins to the edge all round, from the leading edge over the apex to the tail.
  const from = 30, to = 21 * 10;
  for (let i = 0; i < 12; i++) {
    const [u, v] = OUTLINE[Math.round(from + (i / 11) * (to - from))];
    const end: [number, number] = [px(u), py(v)];
    const bow = (i % 2 ? 1 : -1) * (30 + r() * 50);
    const mx = (root[0] + end[0]) / 2, my = (root[1] + end[1]) / 2;
    const nx = -(end[1] - root[1]), ny = end[0] - root[0], nl = Math.hypot(nx, ny) || 1;
    const p = new Path2D();
    p.moveTo(...root);
    p.quadraticCurveTo(mx + (nx / nl) * bow, my + (ny / nl) * bow, ...end);
    stroke(p, 13 + r() * 5);
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
  ctx.strokeStyle = '#08060a'; ctx.lineWidth = 18; ctx.stroke(shape);
  ctx.strokeStyle = '#f2cf6a'; ctx.lineWidth = 6; ctx.stroke(shape);
  ctx.fillStyle = '#ffe49a';
  for (let i = 4; i < OUTLINE.length - 4; i += 7) {
    const [u, v] = OUTLINE[i];
    // Beads just inside the rim, pulled a little toward the root.
    ctx.beginPath(); ctx.arc(px(u * 0.965), py(0.3 + (v - 0.3) * 0.965), 3.6, 0, Math.PI * 2); ctx.fill();
  }
  // The swallowtail's eyespot beside the tail: a jewel of pink and blue ringed in black and gold.
  const ex = px(0.4), ey = py(0.15), er = 0.045 * (W - 16);
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
  uniform float uTime, uHasMap;
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
    vec3 col;
    float a;
    if (c.a < 0.9) {
      // Glass: pink at her back, flowing outward through the rainbow — one colour, no patches.
      float r = length((vUv - vec2(0.0, 0.3)) * vec2(1.0, 2.0));
      float t = smoothstep(0.08, 1.6, r);
      float h = mod(330.0 + 310.0 * t, 360.0) / 360.0;
      col = hsl(h, 0.85, mix(0.72, 0.58, t)) * c.r;
      // Glitter twinkling in the glass.
      vec2 cell = floor(vUv * vec2(70.0, 160.0));
      float g = hash(cell), tw = pow(max(0.0, sin(uTime * 2.6 + g * 40.0)), 18.0) * step(0.9, g);
      col += vec3(1.0, 0.85, 0.95) * tw * 1.3;
      a = 0.55;
    } else {
      col = c.rgb;
      a = 1.0;
    }
    // A soft light slides slowly across.
    float band = fract(vUv.x * 0.5 + vUv.y * 0.8 - uTime * 0.06);
    col += col * smoothstep(0.1, 0.0, abs(band - 0.5)) * 0.35;
    gl_FragColor = vec4(col * vShade * 1.12, a);
  }
`;

const GLITTER = 220;

/** The pair of wings, hinged at her back, with glitter drifting off them. Call `update` every frame. */
export class Wings {
  readonly group = new THREE.Group();
  private mats: THREE.ShaderMaterial[] = [];
  private glitter: THREE.Points;
  /** Each grain: where on a wing it started (out, up, side), its age and how long it lives. */
  private grains: Array<{ x: number; y: number; side: number; age: number; life: number; vy: number; vo: number }> = [];
  private back = MIN_BACK; private curl = 0; private lift = 0;

  constructor() {
    const map = wingTexture();
    const geo = new THREE.PlaneGeometry(WING_W, WING_H, 24, 40);
    geo.translate(WING_W / 2, WING_H / 2, 0);
    for (const side of [1, -1]) {
      const m = new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide, transparent: true, depthWrite: false,
        uniforms: {
          uMap: { value: map }, uHasMap: { value: map ? 1 : 0 }, uTime: { value: 0 },
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
    // Glitter: pink, gold and white sparks shed from the glass, drifting down and away.
    const pos = new Float32Array(GLITTER * 3), col = new Float32Array(GLITTER * 3);
    const tints = [[1, 0.55, 0.8], [1, 0.85, 0.45], [1, 1, 1], [0.9, 0.6, 1]];
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
    this.glitter = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.09, map: spark, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
    this.glitter.userData.part = 'wing';
    this.glitter.frustumCulled = false;
    this.group.add(this.glitter);
    this.group.position.set(0, TIP_Y, HINGE_Z);
  }

  private rnd = rng(733);
  private newGrain(r: () => number, age = 0) {
    let u = 0.5, v = 0.6;
    for (let k = 0; k < 20; k++) { u = r(); v = r(); if (onWing(u, v)) break; }
    return { x: u * WING_W, y: v * WING_H, side: r() < 0.5 ? 1 : -1, age, life: 2 + r() * 2.5, vy: -0.15 - r() * 0.3, vo: 0.05 + r() * 0.15 };
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
