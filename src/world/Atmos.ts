import * as THREE from 'three';
import { ATMOS, atmosWeights, type AtmosSpec } from './atmosphere';
import type { RegionId } from './regions';
import { WATER_Y, terrainHeight } from './terrain';
import { currentWind } from './wind';

/**
 * The living air (atmosphere.ts says what each land has): butterflies and dragonflies with
 * beating wings, blinking fireflies and rising spores, chimney smoke, dawn ground mist and
 * golden-hour sunbeams. Everything lives in a small bubble round the travellers and is re-seeded
 * ahead of them as they move; it all cross-fades when they pass from one land to the next.
 *
 * Nothing here ever fills the view: mist, smoke and beams fade out as the camera nears them.
 */

const BUTTERFLIES = 28, DRAGONFLIES = 12, MOTES = 180, PUFFS_PER = 8, CHIMNEYS = 22, MISTS = 34, BEAMS = 10;

const MIST_WHITE = new THREE.Color('#ffffff');
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ground = (x: number, z: number) => terrainHeight(x, z);

// ---------------------------------------------------------------------------------------------
// Wings: butterflies and dragonflies, one instanced draw each. A creature is a body (two crossed
// slivers) and its wings, hinged along the body; the vertex shader beats them.

interface WingDef { side: number; z: number; len: number; wid: number }
function wingGeometry(wings: WingDef[], bodyLen: number, bodyW: number): THREE.InstancedBufferGeometry {
  const pos: number[] = [], uv: number[] = [], side: number[] = [];
  const quad = (a: number[], b: number[], c: number[], d: number[], s: number) => {
    for (const [p, t] of [[a, [0, 0]], [b, [1, 0]], [c, [1, 1]], [a, [0, 0]], [c, [1, 1]], [d, [0, 1]]] as const) {
      pos.push(p[0], p[1], p[2]); uv.push(t[0], t[1]); side.push(s);
    }
  };
  for (const w of wings) {
    const s = w.side;
    // u runs out from the body, v along it (tail to head).
    quad([0, 0, w.z - w.wid / 2], [s * w.len, 0, w.z - w.wid / 2], [s * w.len, 0, w.z + w.wid / 2], [0, 0, w.z + w.wid / 2], s);
  }
  // The body: crossed slivers along z (side 0: never beats).
  quad([-bodyW, 0, -bodyLen / 2], [bodyW, 0, -bodyLen / 2], [bodyW, 0, bodyLen / 2], [-bodyW, 0, bodyLen / 2], 0);
  quad([0, -bodyW, -bodyLen / 2], [0, bodyW, -bodyLen / 2], [0, bodyW, bodyLen / 2], [0, -bodyW, bodyLen / 2], 0);
  const g = new THREE.InstancedBufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('side', new THREE.Float32BufferAttribute(side, 1));
  return g;
}

const WING_VERT = /* glsl */ `
  attribute float side; attribute vec4 aPos; attribute vec4 aMisc; attribute vec3 aCol;
  uniform float uTime, uFreq, uAmp, uBias;
  varying vec2 vUv; varying float vSide; varying vec3 vCol;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv; vSide = side; vCol = aCol;
    vec3 p = position * aMisc.y * aMisc.z;
    if (side != 0.0) {
      // Beat the wing about the body's axis: both wings rise together.
      float a = sin(uTime * uFreq + aMisc.x) * uAmp + uBias;
      float r = abs(p.x);
      p = vec3(side * r * cos(a), p.y + r * sin(a), p.z);
    }
    float cy = cos(aPos.w), sy = sin(aPos.w);
    p = vec3(p.x * cy + p.z * sy, p.y, -p.x * sy + p.z * cy) + aPos.xyz;
    vec4 mvPosition = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;

const BUTTERFLY_FRAG = /* glsl */ `
  uniform float uLight;
  varying vec2 vUv; varying float vSide; varying vec3 vCol;
  #include <fog_pars_fragment>
  float ell(vec2 p, vec2 c, vec2 r) { vec2 d = (p - c) / r; return dot(d, d); }
  void main() {
    vec3 col;
    if (vSide == 0.0) col = vec3(0.12, 0.1, 0.09);
    else {
      // A forewing and a hindwing, rounded; a dark border and pale spots near the tip.
      float f = ell(vUv, vec2(0.52, 0.64), vec2(0.5, 0.36)), h = ell(vUv, vec2(0.42, 0.28), vec2(0.4, 0.3));
      float m = min(f, h);
      if (m > 1.0) discard;
      col = vCol;
      col *= mix(1.0, 0.25, smoothstep(0.62, 0.9, m));
      col = mix(col, vec3(1.0), step(ell(vUv, vec2(0.82, 0.72), vec2(0.07, 0.06)), 1.0) * 0.8);
      col *= 0.85 + 0.15 * vUv.x;
    }
    gl_FragColor = vec4(col * uLight, 1.0);
    #include <fog_fragment>
  }`;

const DRAGONFLY_FRAG = /* glsl */ `
  uniform float uLight;
  varying vec2 vUv; varying float vSide; varying vec3 vCol;
  #include <fog_pars_fragment>
  void main() {
    vec4 c;
    if (vSide == 0.0) {
      // The long body, banded, darker toward the tail.
      c = vec4(vCol * (0.7 + 0.3 * step(0.5, fract(vUv.y * 9.0))) * (0.6 + 0.5 * vUv.y), 1.0);
    } else {
      // A long, clear wing with fine veins and a dark spot at its tip.
      vec2 d = (vUv - vec2(0.5)) / vec2(0.5, 0.5);
      if (dot(d, d) > 1.0) discard;
      float vein = step(0.9, fract(vUv.x * 7.0)) + step(0.92, fract(vUv.y * 5.0));
      c = vec4(mix(vec3(0.85, 0.95, 1.0), vec3(0.3), vein * 0.4), 0.35 + vein * 0.2);
      if (vUv.x > 0.86 && abs(vUv.y - 0.5) < 0.2) c = vec4(0.15, 0.12, 0.1, 0.9);
    }
    gl_FragColor = vec4(c.rgb * uLight, c.a);
    #include <fog_fragment>
  }`;

interface Flyer { x: number; y: number; z: number; yaw: number; hx: number; hz: number; tx: number; ty: number; tz: number; timer: number; phase: number; alive: boolean }

class Wings {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private pos: Float32Array;
  private misc: Float32Array;
  private col: Float32Array;
  readonly flyers: Flyer[] = [];

  constructor(n: number, geo: THREE.InstancedBufferGeometry, frag: string, freq: number, amp: number, bias: number, transparent: boolean) {
    this.pos = new Float32Array(n * 4);
    this.misc = new Float32Array(n * 4);
    this.col = new Float32Array(n * 3);
    geo.setAttribute('aPos', new THREE.InstancedBufferAttribute(this.pos, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aMisc', new THREE.InstancedBufferAttribute(this.misc, 4).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aCol', new THREE.InstancedBufferAttribute(this.col, 3));
    geo.instanceCount = n;
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uFreq: { value: freq }, uAmp: { value: amp }, uBias: { value: bias }, uLight: { value: 1 } }]),
      vertexShader: WING_VERT, fragmentShader: frag, side: THREE.DoubleSide, fog: true, transparent, depthWrite: !transparent,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.frustumCulled = false;
    for (let i = 0; i < n; i++) {
      this.flyers.push({ x: 0, y: -1e4, z: 0, yaw: 0, hx: 0, hz: 0, tx: 0, ty: 0, tz: 0, timer: 0, phase: Math.random() * 100, alive: false });
      this.misc[i * 4] = this.flyers[i].phase;
    }
  }

  colour(i: number, c: THREE.Color): void {
    this.col.set([c.r, c.g, c.b], i * 3);
    (this.mesh.geometry.getAttribute('aCol') as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  write(i: number, size: number, vis: number): void {
    const f = this.flyers[i];
    this.pos.set([f.x, f.y, f.z, f.yaw], i * 4);
    this.misc[i * 4 + 1] = size;
    this.misc[i * 4 + 2] = vis;
  }

  flush(t: number, light: number): void {
    (this.mesh.geometry.getAttribute('aPos') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.mesh.geometry.getAttribute('aMisc') as THREE.InstancedBufferAttribute).needsUpdate = true;
    this.mesh.material.uniforms.uTime.value = t;
    this.mesh.material.uniforms.uLight.value = light;
  }
}

// ---------------------------------------------------------------------------------------------
// Motes: fireflies (wandering low, blinking) and spores (rising slowly, twinkling). The shader
// moves them about their seeds, so the CPU only re-seeds the ones left behind.

const MOTE_VERT = /* glsl */ `
  attribute float aPhase; attribute vec3 aCol;
  uniform float uTime, uRise, uSize, uAmt;
  varying vec3 vCol; varying float vA;
  void main() {
    float t = uTime + aPhase * 10.0;
    vec3 p = position;
    if (uRise > 0.5) {
      // Spores: up and up, swaying, fading in at the bottom and out at the top.
      float k = fract(t * 0.035 + aPhase);
      p += vec3(sin(t * 0.5) * 0.8, k * 14.0, cos(t * 0.4) * 0.8);
      vA = sin(k * 3.14159) * (0.6 + 0.4 * sin(t * 3.0 + aPhase * 7.0));
    } else {
      // Fireflies: a slow wander, and a blink every few seconds.
      p += vec3(sin(t * 0.37) * 1.4 + sin(t * 0.9) * 0.3, sin(t * 0.53) * 0.45, cos(t * 0.31) * 1.4 + cos(t * 1.1) * 0.3);
      vA = pow(max(sin(t * 0.9 + aPhase * 3.0), 0.0), 5.0);
    }
    vA *= uAmt; vCol = aCol;
    vec4 mv = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * (300.0 / max(-mv.z, 0.5)) * (0.5 + 0.5 * vA);
  }`;
const MOTE_FRAG = /* glsl */ `
  varying vec3 vCol; varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = (1.0 - smoothstep(0.1, 0.5, d)) * vA;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vCol * (1.0 + (1.0 - smoothstep(0.0, 0.18, d)) * 1.5), a);
  }`;

// ---------------------------------------------------------------------------------------------
// Soft puffs: smoke and mist, camera-facing, soft-edged, fading as the camera nears them and
// toward their bottom edge, so they never cut a hard line against the ground or fill the view.

const PUFF_VERT = /* glsl */ `
  attribute vec4 aP; attribute vec2 aA;
  varying vec2 vUv; varying float vAlpha; varying float vSeed;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv; vSeed = aA.y;
    vec3 right = vec3(viewMatrix[0][0], viewMatrix[1][0], viewMatrix[2][0]);
    vec3 up = vec3(viewMatrix[0][1], viewMatrix[1][1], viewMatrix[2][1]);
    vec3 p = aP.xyz + (right * (uv.x - 0.5) + up * (uv.y - 0.5)) * aP.w;
    // Near the camera, fade away: never a sheet across the view.
    float near = smoothstep(aP.w * 0.35 + 1.0, aP.w * 0.9 + 4.0, length(aP.xyz - cameraPosition));
    vAlpha = aA.x * near;
    vec4 mvPosition = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const PUFF_FRAG = /* glsl */ `
  uniform vec3 uColor; uniform float uBottom;
  varying vec2 vUv; varying float vAlpha; varying float vSeed;
  #include <fog_pars_fragment>
  float h(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(h(i), h(i + vec2(1.0, 0.0)), f.x), mix(h(i + vec2(0.0, 1.0)), h(i + vec2(1.0, 1.0)), f.x), f.y); }
  void main() {
    vec2 q = vUv - 0.5;
    float d = length(q) * 2.0;
    // A billowing, uneven edge.
    float b = n(q * 4.0 + vSeed * 17.0) * 0.5 + n(q * 9.0 - vSeed * 5.0) * 0.25;
    float a = (1.0 - smoothstep(0.2, 1.0, d + (b - 0.37) * 0.7)) * vAlpha;
    a *= mix(1.0, smoothstep(0.0, 0.45, vUv.y), uBottom);
    if (a < 0.004) discard;
    gl_FragColor = vec4(uColor * (0.9 + b * 0.25), a);
    #include <fog_fragment>
  }`;

class Puffs {
  readonly mesh: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private p: Float32Array;
  private a: Float32Array;
  n = 0;

  constructor(readonly max: number, bottom: number) {
    const g = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);
    g.index = base.index;
    g.setAttribute('position', base.getAttribute('position'));
    g.setAttribute('uv', base.getAttribute('uv'));
    this.p = new Float32Array(max * 4);
    this.a = new Float32Array(max * 2);
    g.setAttribute('aP', new THREE.InstancedBufferAttribute(this.p, 4).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aA', new THREE.InstancedBufferAttribute(this.a, 2).setUsage(THREE.DynamicDrawUsage));
    g.instanceCount = 0;
    const mat = new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uColor: { value: new THREE.Color('#ffffff') }, uBottom: { value: bottom } }]),
      vertexShader: PUFF_VERT, fragmentShader: PUFF_FRAG, transparent: true, depthWrite: false, fog: true, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(g, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }

  begin(): void { this.n = 0; }
  push(x: number, y: number, z: number, size: number, alpha: number, seed: number): void {
    if (this.n >= this.max || alpha < 0.003) return;
    this.p.set([x, y, z, size], this.n * 4);
    this.a.set([alpha, seed], this.n * 2);
    this.n++;
  }
  end(color: THREE.Color): void {
    const g = this.mesh.geometry;
    g.instanceCount = this.n;
    (g.getAttribute('aP') as THREE.InstancedBufferAttribute).needsUpdate = true;
    (g.getAttribute('aA') as THREE.InstancedBufferAttribute).needsUpdate = true;
    this.mesh.material.uniforms.uColor.value.copy(color);
    this.mesh.visible = this.n > 0;
  }
}

// ---------------------------------------------------------------------------------------------
// Sunbeams: long soft shafts along the sun's direction, each turned to face the camera about its
// own axis, glowing brightest in their middles and fading into the ground and the sky.

const BEAM_VERT = /* glsl */ `
  attribute vec4 aB; attribute float aW;
  uniform vec3 uSun; uniform float uLen;
  varying vec2 vUv; varying float vA;
  #include <fog_pars_vertex>
  void main() {
    vUv = uv;
    vec3 axis = normalize(uSun);
    vec3 c = aB.xyz + axis * uLen * 0.5;
    vec3 side = normalize(cross(axis, cameraPosition - c));
    vec3 p = c + axis * (uv.y - 0.5) * uLen + side * (uv.x - 0.5) * aB.w;
    vA = aW * smoothstep(8.0, 22.0, length(aB.xyz - cameraPosition));
    vec4 mvPosition = viewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }`;
const BEAM_FRAG = /* glsl */ `
  uniform vec3 uColor;
  varying vec2 vUv; varying float vA;
  #include <fog_pars_fragment>
  void main() {
    float across = pow(sin(vUv.x * 3.14159), 2.0);
    float along = smoothstep(0.0, 0.25, vUv.y) * (1.0 - smoothstep(0.55, 1.0, vUv.y));
    float a = across * along * vA;
    if (a < 0.002) discard;
    gl_FragColor = vec4(uColor * a, 1.0);
    #include <fog_fragment>
  }`;

export class Atmos {
  readonly group = new THREE.Group();
  private butterflies = new Wings(BUTTERFLIES, wingGeometry([
    { side: -1, z: 0, len: 1, wid: 1 }, { side: 1, z: 0, len: 1, wid: 1 },
  ], 0.9, 0.06), BUTTERFLY_FRAG, 11, 0.9, 0.35, false);
  private dragonflies = new Wings(DRAGONFLIES, wingGeometry([
    { side: -1, z: 0.12, len: 1, wid: 0.22 }, { side: 1, z: 0.12, len: 1, wid: 0.22 },
    { side: -1, z: -0.1, len: 0.9, wid: 0.22 }, { side: 1, z: -0.1, len: 0.9, wid: 0.22 },
  ], 1.5, 0.05), DRAGONFLY_FRAG, 38, 0.3, 0.05, true);
  private motes: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private motePos = new Float32Array(MOTES * 3);
  private moteCol = new Float32Array(MOTES * 3);
  private moteAlive = new Uint8Array(MOTES);
  private smoke = new Puffs(PUFFS_PER * CHIMNEYS, 0);
  private mist = new Puffs(MISTS, 1);
  private mistSeeds = Array.from({ length: MISTS }, () => ({ x: 0, z: 0, y: 0, size: 0, seed: Math.random(), alive: false }));
  private beams: THREE.Mesh<THREE.InstancedBufferGeometry, THREE.ShaderMaterial>;
  private beamB = new Float32Array(BEAMS * 4);
  private beamW = new Float32Array(BEAMS);
  private beamAlive = new Uint8Array(BEAMS);

  private land: RegionId | null = null;
  private want: RegionId = 'meadow';
  private fade = 0;
  private spec: AtmosSpec = {};
  private tmp = new THREE.Color();
  private smokeCol = new THREE.Color();

  constructor() {
    const mg = new THREE.BufferGeometry();
    const phase = new Float32Array(MOTES).map(() => Math.random());
    mg.setAttribute('position', new THREE.BufferAttribute(this.motePos, 3).setUsage(THREE.DynamicDrawUsage));
    mg.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    mg.setAttribute('aCol', new THREE.BufferAttribute(this.moteCol, 3));
    this.motes = new THREE.Points(mg, new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uRise: { value: 0 }, uSize: { value: 0.16 }, uAmt: { value: 0 } },
      vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    this.motes.frustumCulled = false;
    for (let i = 0; i < MOTES; i++) this.motePos[i * 3 + 1] = -1e4;

    const bg = new THREE.InstancedBufferGeometry();
    const base = new THREE.PlaneGeometry(1, 1).translate(0.5, 0.5, 0);
    bg.index = base.index;
    bg.setAttribute('position', base.getAttribute('position'));
    bg.setAttribute('uv', base.getAttribute('uv'));
    bg.setAttribute('aB', new THREE.InstancedBufferAttribute(this.beamB, 4).setUsage(THREE.DynamicDrawUsage));
    bg.setAttribute('aW', new THREE.InstancedBufferAttribute(this.beamW, 1).setUsage(THREE.DynamicDrawUsage));
    bg.instanceCount = BEAMS;
    this.beams = new THREE.Mesh(bg, new THREE.ShaderMaterial({
      uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uSun: { value: new THREE.Vector3(0, 1, 0) }, uLen: { value: 38 }, uColor: { value: new THREE.Color('#ffd89a') } }]),
      vertexShader: BEAM_VERT, fragmentShader: BEAM_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: true, side: THREE.DoubleSide,
    }));
    this.beams.frustumCulled = false;
    this.beams.renderOrder = 3;

    this.group.add(this.butterflies.mesh, this.dragonflies.mesh, this.motes, this.smoke.mesh, this.mist.mesh, this.beams);
  }

  /**
   * One frame. `p`: where the travellers are; `hour`: the game's hour; `night` 0..1; `smoke`: the
   * chimney tops of the lands loaded; `fogColor`: the air's colour now (mist is made of it).
   */
  update(dt: number, t: number, p: THREE.Vector3, land: RegionId, hour: number, night: number, sunDir: THREE.Vector3, smoke: readonly THREE.Vector3[], fogColor: THREE.Color): void {
    // Cross-fade between lands: the old land's air thins away, then the new one's gathers.
    this.want = land;
    if (this.land !== this.want) {
      this.fade = Math.max(0, this.fade - dt * 0.8);
      if (this.fade === 0) { this.land = this.want; this.spec = ATMOS[this.want] ?? {}; this.reseedAll(); }
    } else this.fade = Math.min(1, this.fade + dt * 0.5);
    const cur = this.land ?? land;
    const w = atmosWeights(cur, hour);
    const f = this.fade;
    const light = 1 - night * 0.75;

    this.flyButterflies(dt, t, p, w.flyers * f, light);
    this.flyDragonflies(dt, t, p, w.flyers * f, light);
    this.moveMotes(t, p, Math.max(w.fireflies, w.spores) * f);
    this.puffSmoke(t, p, w.smoke * f, smoke, night);
    this.lieMist(dt, p, w.mist * f, fogColor);
    this.shineBeams(p, w.beams * f * THREE.MathUtils.smoothstep(sunDir.y, 0.02, 0.1) * (1 - THREE.MathUtils.smoothstep(sunDir.y, 0.35, 0.5)), sunDir);
  }

  private reseedAll(): void {
    for (const b of this.butterflies.flyers) b.alive = false;
    for (const d of this.dragonflies.flyers) d.alive = false;
    this.moteAlive.fill(0);
    for (const m of this.mistSeeds) m.alive = false;
    this.beamAlive.fill(0);
    // New colours for the land's own kinds.
    const bc = this.spec.butterflies?.colors ?? ['#ffffff'];
    this.butterflies.flyers.forEach((_, i) => this.butterflies.colour(i, this.tmp.set(bc[i % bc.length])));
    const dc = this.spec.dragonflies ?? ['#3fb6c9'];
    this.dragonflies.flyers.forEach((_, i) => this.dragonflies.colour(i, this.tmp.set(dc[i % dc.length])));
    const mc = this.spec.spores ?? [this.spec.fireflies ?? '#fff08a'];
    for (let i = 0; i < MOTES; i++) { this.tmp.set(mc[i % mc.length]); this.moteCol.set([this.tmp.r, this.tmp.g, this.tmp.b], i * 3); }
    this.motes.geometry.getAttribute('aCol').needsUpdate = true;
  }

  /** A spot on dry ground 8–34 m round `p`, or null after a few tries. */
  private dryGround(p: THREE.Vector3, r0 = 8, r1 = 34): { x: number; z: number; y: number } | null {
    for (let k = 0; k < 6; k++) {
      const a = Math.random() * Math.PI * 2, r = rnd(r0, r1);
      const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, y = ground(x, z);
      if (y > WATER_Y + 0.35) return { x, z, y };
    }
    return null;
  }

  private flyButterflies(dt: number, t: number, p: THREE.Vector3, amt: number, light: number): void {
    const W = this.butterflies, spec = this.spec.butterflies;
    const n = spec ? Math.round(BUTTERFLIES * spec.share) : 0;
    W.flyers.forEach((b, i) => {
      if (i >= n || amt <= 0.01) { W.write(i, 0, 0); return; }
      if (!b.alive || Math.hypot(b.x - p.x, b.z - p.z) > 42) {
        const g = this.dryGround(p);
        if (!g) { W.write(i, 0, 0); return; }
        Object.assign(b, { x: g.x, z: g.z, y: g.y + 1, hx: g.x, hz: g.z, yaw: Math.random() * 6.28, alive: true });
      }
      // A fluttering, wandering flight that turns back toward its patch of flowers.
      const ph = b.phase;
      b.yaw += (Math.sin(t * 1.3 + ph) + Math.sin(t * 2.9 + ph * 1.7) * 0.6) * dt * 2.2;
      const hx = b.hx - b.x, hz = b.hz - b.z;
      if (hx * hx + hz * hz > 36) {
        const want = Math.atan2(hx, hz);
        let d = want - b.yaw;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        b.yaw += d * Math.min(1, dt * 1.5);
      }
      const sp = 1.3 + Math.sin(t * 0.7 + ph) * 0.4;
      b.x += Math.sin(b.yaw) * sp * dt;
      b.z += Math.cos(b.yaw) * sp * dt;
      const gy = ground(b.x, b.z);
      b.y = Math.max(gy, WATER_Y) + 0.7 + 0.8 * (0.5 + 0.5 * Math.sin(t * 0.6 + ph)) + Math.sin(t * 11 + ph) * 0.06;
      W.write(i, 0.17, amt);
    });
    W.flush(t, light);
    W.mesh.visible = amt > 0.01 && n > 0;
  }

  private flyDragonflies(dt: number, t: number, p: THREE.Vector3, amt: number, light: number): void {
    const W = this.dragonflies, has = !!this.spec.dragonflies;
    W.flyers.forEach((d, i) => {
      if (!has || amt <= 0.01) { W.write(i, 0, 0); return; }
      if (!d.alive || Math.hypot(d.x - p.x, d.z - p.z) > 45) {
        // Only over water: look for it round the travellers.
        let found = false;
        for (let k = 0; k < 8 && !found; k++) {
          const a = Math.random() * Math.PI * 2, r = rnd(6, 36);
          const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r;
          if (ground(x, z) < WATER_Y - 0.1) { Object.assign(d, { x, z, y: WATER_Y + 0.8, hx: x, hz: z, tx: x, ty: WATER_Y + 0.8, tz: z, timer: 0, alive: true }); found = true; }
        }
        if (!found) { W.write(i, 0, 0); return; }
      }
      // Hover, then dart: a new spot every second or two, reached in a quick rush.
      d.timer -= dt;
      if (d.timer <= 0) {
        d.timer = rnd(0.6, 2.4);
        const x = d.hx + rnd(-5, 5), z = d.hz + rnd(-5, 5);
        if (ground(x, z) < WATER_Y + 0.2) { d.tx = x; d.tz = z; d.ty = WATER_Y + rnd(0.35, 1.3); }
      }
      const k = Math.min(1, dt * 5);
      const dx = (d.tx - d.x) * k, dz = (d.tz - d.z) * k;
      if (dx * dx + dz * dz > 1e-5) d.yaw = Math.atan2(dx, dz);
      d.x += dx; d.z += dz; d.y += (d.ty - d.y) * k + Math.sin(t * 7 + d.phase) * 0.004;
      W.write(i, 0.12, amt);
    });
    W.flush(t, light);
    W.mesh.visible = has && amt > 0.01;
  }

  private moveMotes(t: number, p: THREE.Vector3, amt: number): void {
    const rise = !!this.spec.spores;
    const m = this.motes.material.uniforms;
    m.uTime.value = t; m.uRise.value = rise ? 1 : 0; m.uAmt.value = amt; m.uSize.value = rise ? 0.2 : 0.14;
    this.motes.visible = amt > 0.01;
    if (!this.motes.visible) return;
    let moved = false;
    for (let i = 0; i < MOTES; i++) {
      const x = this.motePos[i * 3], z = this.motePos[i * 3 + 2];
      if (this.moteAlive[i] && Math.hypot(x - p.x, z - p.z) < 40) continue;
      const g = this.dryGround(p, 3, 36);
      if (!g) continue;
      this.motePos.set([g.x, g.y + (rise ? rnd(-0.5, 1) : rnd(0.3, 2.2)), g.z], i * 3);
      this.moteAlive[i] = 1;
      moved = true;
    }
    if (moved) this.motes.geometry.getAttribute('position').needsUpdate = true;
  }

  private puffSmoke(t: number, p: THREE.Vector3, amt: number, tops: readonly THREE.Vector3[], night: number): void {
    const S = this.smoke;
    S.begin();
    if (amt > 0.01 && tops.length) {
      // The nearest chimneys, each sending up a slow column of puffs that the wind leans over.
      const near = tops.filter((c) => Math.abs(c.x - p.x) < 110 && Math.abs(c.z - p.z) < 110)
        .sort((a, b) => (a.x - p.x) ** 2 + (a.z - p.z) ** 2 - ((b.x - p.x) ** 2 + (b.z - p.z) ** 2)).slice(0, CHIMNEYS);
      const wind = currentWind();
      near.forEach((c, k) => {
        const seed = (Math.abs(c.x * 0.37 + c.z * 0.71) % 1);
        // Not every hearth is lit: about two in three.
        if (seed > 0.68) return;
        for (let i = 0; i < PUFFS_PER; i++) {
          const age = (t / 9 + i / PUFFS_PER + seed) % 1;
          const lean = age * age * 7 * (0.4 + wind.strength);
          const curl = Math.sin(age * 5 + k) * 0.5 * age;
          S.push(c.x + wind.x * lean + curl, c.y + age * 6.5, c.z + wind.z * lean - curl, 0.6 + age * 3.2, amt * 0.42 * Math.pow(Math.sin(Math.PI * Math.min(1, age * 1.15)), 0.8) * (1 - age * 0.4), seed + i * 0.13);
        }
      });
    }
    // Smoke is pale grey by day, blue-grey in the dusk and at night.
    S.end(this.smokeCol.set('#d9d6d2').lerp(this.tmp.set('#5a5e70'), night));
  }

  private lieMist(dt: number, p: THREE.Vector3, amt: number, fogColor: THREE.Color): void {
    const S = this.mist;
    S.begin();
    if (amt > 0.01) {
      const wind = currentWind();
      for (const m of this.mistSeeds) {
        if (!m.alive || Math.hypot(m.x - p.x, m.z - p.z) > 70) {
          // Mist lies thickest in the hollows and over the water.
          let best: { x: number; z: number; y: number } | null = null;
          for (let k = 0; k < 4; k++) {
            const a = Math.random() * Math.PI * 2, r = rnd(12, 62);
            const x = p.x + Math.cos(a) * r, z = p.z + Math.sin(a) * r, y = Math.max(ground(x, z), WATER_Y);
            if (!best || y < best.y) best = { x, z, y };
          }
          Object.assign(m, best!, { size: rnd(9, 18), alive: true });
        }
        m.x += wind.x * dt * 0.6; m.z += wind.z * dt * 0.6;
        const low = 1 - THREE.MathUtils.smoothstep(m.y - p.y, 1, 8);
        S.push(m.x, m.y + m.size * 0.22, m.z, m.size, amt * 0.16 * (0.55 + 0.45 * low), m.seed);
      }
    }
    S.end(this.tmp.copy(fogColor).lerp(MIST_WHITE, 0.35));
  }

  private shineBeams(p: THREE.Vector3, amt: number, sunDir: THREE.Vector3): void {
    const m = this.beams.material.uniforms;
    this.beams.visible = amt > 0.01;
    if (!this.beams.visible) return;
    m.uSun.value.copy(sunDir);
    for (let i = 0; i < BEAMS; i++) {
      const x = this.beamB[i * 4], z = this.beamB[i * 4 + 2];
      if (!this.beamAlive[i] || Math.hypot(x - p.x, z - p.z) > 60) {
        const g = this.dryGround(p, 14, 48);
        if (!g) { this.beamW[i] = 0; continue; }
        this.beamB.set([g.x, g.y, g.z, rnd(1.2, 3.6)], i * 4);
        this.beamAlive[i] = 1;
        this.beamW[i] = rnd(0.4, 1);
      }
    }
    for (let i = 0; i < BEAMS; i++) this.beamW[i] = this.beamAlive[i] ? Math.abs(this.beamW[i]) : 0;
    const aW = this.beams.geometry.getAttribute('aW') as THREE.InstancedBufferAttribute;
    // The shared strength rides in the colour; each beam keeps its own share.
    m.uColor.value.set('#ffd89a').multiplyScalar(amt * 0.14);
    aW.needsUpdate = true;
    this.beams.geometry.getAttribute('aB').needsUpdate = true;
  }
}
