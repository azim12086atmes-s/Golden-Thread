import * as THREE from 'three';
import { smoothstep } from '../core/rng';
import { REGIONS, type RegionId } from './regions';
import { SKIES, SKY_KINDS, fireworkRate, type SkyKind } from './skies';
import { auroraMaterial } from './Sky';

/**
 * Draws each land's own sky (skies.ts): clouds, kites, birds, sunbeams, rainbows, alpenglow,
 * aurora, the Milky Way, nebulae, shooting stars, fireworks, searchlights, a moon halo and a
 * crescent. Every effect eases in and out as you cross from one land to the next, and each knows
 * its hour — kites by day, alpenglow at dusk, fireworks after dark. At the celebration every
 * effect is on at once, and the fireworks and searchlights gather over the castle.
 */

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const tmpC = new THREE.Color(), tmpD = new THREE.Color();
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpE = new THREE.Euler(), tmpS = new THREE.Vector3(), tmpP = new THREE.Vector3();

function canvasTex(size: number, draw: (x: CanvasRenderingContext2D, s: number) => void): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function blob(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, stops: Array<[number, string]>): void {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  for (const [o, c] of stops) g.addColorStop(o, c);
  x.fillStyle = g;
  x.fillRect(0, 0, x.canvas.width, x.canvas.height);
}

const cloudTex = () => canvasTex(256, (x, s) => {
  for (const [cx, cy, r] of [[0.3, 0.6, 0.22], [0.5, 0.52, 0.28], [0.7, 0.6, 0.22], [0.42, 0.42, 0.2], [0.6, 0.42, 0.18], [0.18, 0.66, 0.14], [0.84, 0.66, 0.14]]) {
    blob(x, cx * s, cy * s, r * s, [[0, 'rgba(255,255,255,0.85)'], [0.55, 'rgba(255,255,255,0.45)'], [1, 'rgba(255,255,255,0)']]);
  }
});

const haloTex = () => canvasTex(256, (x, s) => blob(x, s / 2, s / 2, s / 2, [[0, 'rgba(255,255,255,0.6)'], [0.22, 'rgba(255,255,255,0.22)'], [0.6, 'rgba(255,255,255,0.05)'], [0.7, 'rgba(255,255,255,0.24)'], [0.78, 'rgba(255,255,255,0.04)'], [1, 'rgba(255,255,255,0)']]));

const crescentTex = () => canvasTex(256, (x, s) => {
  blob(x, s / 2, s / 2, s / 2, [[0, 'rgba(255,248,220,0.5)'], [0.45, 'rgba(255,248,220,0.12)'], [1, 'rgba(255,248,220,0)']]);
  x.fillStyle = '#fffaf0';
  x.beginPath();
  x.arc(s / 2, s / 2, s * 0.24, 0, Math.PI * 2);
  x.fill();
  x.globalCompositeOperation = 'destination-out';
  x.beginPath();
  x.arc(s / 2 + s * 0.11, s / 2 - s * 0.05, s * 0.22, 0, Math.PI * 2);
  x.fill();
  x.globalCompositeOperation = 'source-over';
});

const dotTex = () => canvasTex(32, (x, s) => blob(x, s / 2, s / 2, s / 2, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,0.8)'], [1, 'rgba(255,255,255,0)']]));

/** The night sky's own light: the Milky Way and coloured nebulae, drawn on a dome inside the sky. */
const NIGHT_FRAG = `
  uniform float milky; uniform float nebula; uniform float t; uniform vec3 colA; uniform vec3 colB; uniform vec3 colC; varying vec3 vDir;
  float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float noise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
  float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }
  void main(){
    vec3 d = normalize(vDir);
    float up = smoothstep(-0.02, 0.22, d.y);
    if (up <= 0.0) discard;
    vec3 col = vec3(0.0);
    if (milky > 0.001) {
      vec3 n = normalize(vec3(0.42, 0.55, 0.72));
      float x = dot(d, n);
      float band = exp(-x * x * 22.0), core = exp(-x * x * 90.0);
      float dust = fbm(d * 7.0);
      float lanes = smoothstep(0.35, 0.7, fbm(d * 14.0 + 3.1));
      vec3 glow = mix(colA, vec3(1.0, 0.96, 0.9), 0.55) * (band * (0.12 + dust * 0.26) + core * 0.24) * (1.0 - lanes * core * 0.8);
      float s = hash(floor(d * 520.0));
      float star = step(0.992 - band * 0.03, s) * (0.6 + 0.4 * sin(t * 3.0 + s * 60.0));
      col += (glow + vec3(star) * (0.5 + band)) * milky;
    }
    if (nebula > 0.001) {
      float a = fbm(d * 3.2 + vec3(0.0, t * 0.004, 0.0));
      float b = fbm(d * 5.5 - 7.3);
      col += mix(colB, colC, b) * smoothstep(0.5, 0.88, a) * 0.35 * nebula;
    }
    gl_FragColor = vec4(col * up, 1.0);
  }`;

/** Every land's sky colours, one after another: the celebration's palette. */
export const PARTY_PALETTE: string[] = REGIONS.flatMap((r) => SKIES[r.id].palette);
const REGION_IDS = REGIONS.map((r) => r.id);

const KITES = 22, FLOCKS = 4, PER_FLOCK = 9, SHOOTERS = 6, BURSTS = 12, SPARKS = 130, BEAMS = 6, CLOUDS = 34;
const KITE_R = 190, FLOCK_R = 280;

interface Burst { o: THREE.Vector3; age: number; rise: number; c1: THREE.Color; c2: THREE.Color; live: boolean }
interface Shooter { p: THREE.Vector3; d: THREE.Vector3; age: number; life: number; live: boolean }

export class SkyFX {
  /** Add to the scene once; it holds everything. */
  readonly group = new THREE.Group();
  /** 0..1: the celebration evening. Every effect comes on over the meadow, the fireworks and beams over the castle. */
  party = 0;
  readonly partyAt = new THREE.Vector3();
  /** True while the crescent stands in for the full moon (Sky hides its own moon). */
  hideMoon = false;
  /** Where the camera is looking (set each frame), so most fireworks burst where you can see them. */
  readonly lookDir = new THREE.Vector3(0, 0, -1);
  /** How strongly each effect is on right now (eased; before the hour of day). */
  readonly level = Object.fromEntries(SKY_KINDS.map((k) => [k, 0])) as Record<SkyKind, number>;

  private pal = Array.from({ length: 6 }, () => new THREE.Color('#ffffff'));
  private cloudTint = new THREE.Color('#ffffff');
  /** Follows the travellers at ground level: sky-sized things. */
  private dome = new THREE.Group();
  /** Follows the travellers including height: the cloud layer. */
  private near = new THREE.Group();

  private nightDome: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private clouds: THREE.Sprite[] = [];
  private cloudMat: THREE.SpriteMaterial;
  private kites: THREE.InstancedMesh;
  private kiteState = new Float32Array(KITES * 4);
  private strings: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private birds: THREE.InstancedMesh;
  private flocks = new Float32Array(FLOCKS * 5); // x, z, radius, height, phase
  private beams: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private rainbows: THREE.Mesh<THREE.TorusGeometry, THREE.ShaderMaterial>[] = [];
  private glow: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>;
  private auroras: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private shooters: Shooter[] = [];
  private shootMesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private shootClock = 0;
  private bursts: Burst[] = [];
  private sparks: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private sparkVel = new Float32Array(BURSTS * SPARKS * 3);
  private fwClock = 0;
  private lights: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>[] = [];
  private halo: THREE.Sprite;
  private crescent: THREE.Sprite;

  constructor() {
    this.group.add(this.dome, this.near);

    // The night dome: the Milky Way and nebulae, inside the sky dome and its stars.
    this.nightDome = new THREE.Mesh(new THREE.SphereGeometry(3400, 48, 24), new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { milky: { value: 0 }, nebula: { value: 0 }, t: { value: 0 }, colA: { value: new THREE.Color() }, colB: { value: new THREE.Color() }, colC: { value: new THREE.Color() } },
      vertexShader: 'varying vec3 vDir; void main(){ vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: NIGHT_FRAG,
    }));
    this.nightDome.renderOrder = -9;
    this.nightDome.frustumCulled = false;
    this.dome.add(this.nightDome);

    // Clouds.
    this.cloudMat = new THREE.SpriteMaterial({ map: cloudTex(), transparent: true, depthWrite: false, fog: false, opacity: 0 });
    for (let i = 0; i < CLOUDS; i++) {
      const s = new THREE.Sprite(this.cloudMat);
      const w = rnd(380, 780);
      s.scale.set(w, w * 0.48, 1);
      s.userData = { a: Math.random() * Math.PI * 2, r: rnd(650, 1750), y: rnd(240, 540), v: rnd(0.002, 0.006) };
      this.clouds.push(s);
      this.near.add(s);
    }

    // Kites: a diamond with a ribbon tail, on a string.
    const kg = new THREE.BufferGeometry();
    kg.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.1, 0, 0.75, 0, 0, 0, -1.2, 0, 0, 1.1, 0, 0, -1.2, 0, -0.75, 0, 0, -0.1, -1.2, 0, 0.1, -1.2, 0, 0, -4.4, 0], 3));
    kg.scale(3.2, 3.2, 3.2);
    this.kites = new THREE.InstancedMesh(kg, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, opacity: 0 }), KITES);
    this.kites.frustumCulled = false;
    for (let i = 0; i < KITES; i++) {
      this.kiteState.set([rnd(-KITE_R, KITE_R), rnd(-KITE_R, KITE_R), rnd(24, 70), Math.random() * 10], i * 4);
      this.kites.setColorAt(i, tmpC.set('#ffffff'));
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(KITES * 6), 3));
    this.strings = new THREE.LineSegments(sg, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }));
    this.strings.frustumCulled = false;
    this.group.add(this.kites, this.strings);

    // Birds: V-shaped wings that flap, flying in flocks.
    const bg = new THREE.BufferGeometry();
    bg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, -1.3, 0.2, -0.2, 0, 0, -0.35, 0, 0, 0.35, 0, 0, -0.35, 1.3, 0.2, -0.2], 3));
    bg.scale(1.3, 1.3, 1.3);
    this.birds = new THREE.InstancedMesh(bg, new THREE.MeshBasicMaterial({ color: '#2e2838', side: THREE.DoubleSide, transparent: true, opacity: 0 }), FLOCKS * PER_FLOCK);
    this.birds.frustumCulled = false;
    for (let f = 0; f < FLOCKS; f++) this.flocks.set([rnd(-FLOCK_R, FLOCK_R), rnd(-FLOCK_R, FLOCK_R), rnd(60, 130), rnd(50, 110), Math.random() * 10], f * 5);
    this.group.add(this.birds);

    // Sunbeams: a fan of rays round the sun.
    const pos: number[] = [], uv: number[] = [];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + rnd(-0.12, 0.12), w = rnd(0.018, 0.05), L = rnd(0.55, 1);
      pos.push(0, 0, 0, Math.cos(a - w) * L, Math.sin(a - w) * L, 0, Math.cos(a + w) * L, Math.sin(a + w) * L, 0);
      uv.push(0.5, 0, 0, 1, 1, 1);
    }
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    fg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    fg.scale(1500, 1500, 1);
    this.beams = new THREE.Mesh(fg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { strength: { value: 0 }, col: { value: new THREE.Color() } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float strength; uniform vec3 col; varying vec2 vUv;
        void main(){ float a = pow(1.0 - vUv.y, 1.3) * (1.0 - abs(vUv.x * 2.0 - 1.0) / max(vUv.y, 0.001)); gl_FragColor = vec4(col * clamp(a, 0.0, 1.0) * strength * 0.3, 1.0); }`,
    }));
    this.beams.frustumCulled = false;
    this.dome.add(this.beams);

    // Rainbows, always opposite the sun: a bright one and a fainter second bow with its colours reversed.
    for (const [r, tube, k, flip] of [[430, 20, 1, 0], [560, 16, 0.4, 1]] as const) {
      const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 10, 80, Math.PI), new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
        uniforms: { strength: { value: 0 }, k: { value: k }, flip: { value: flip } },
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float strength; uniform float k; uniform float flip; varying vec2 vUv;
          vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
          void main(){
            float v = vUv.y;
            float front = clamp(sin(v * 6.2832), 0.0, 1.0);
            float h = mix(v * 1.6, 0.8 - v * 1.6, flip);
            float ends = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
            gl_FragColor = vec4(hue(h) * 1.1, front * ends * strength * k * 0.5);
          }`,
      }));
      m.frustumCulled = false;
      this.rainbows.push(m);
      this.dome.add(m);
    }

    // Alpenglow: a glowing band all round the horizon.
    const cg = new THREE.CylinderGeometry(3000, 3000, 900, 64, 1, true);
    cg.translate(0, 350, 0);
    this.glow = new THREE.Mesh(cg, new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { strength: { value: 0 }, colA: { value: new THREE.Color() }, colB: { value: new THREE.Color() }, sun: { value: new THREE.Vector2(1, 0) } },
      vertexShader: 'varying vec2 vUv; varying vec3 vP; void main(){ vUv = uv; vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float strength; uniform vec3 colA; uniform vec3 colB; uniform vec2 sun; varying vec2 vUv; varying vec3 vP;
        void main(){
          float v = vUv.y;
          float a = pow(1.0 - v, 2.2) * smoothstep(0.0, 0.08, v);
          float side = 0.4 + 0.6 * max(0.0, dot(normalize(vP.xz), sun));
          gl_FragColor = vec4(mix(colA, colB, clamp(v * 1.6, 0.0, 1.0)) * a * side * strength * 0.75, 1.0);
        }`,
    }));
    this.glow.frustumCulled = false;
    this.dome.add(this.glow);

    // Aurora curtains overhead.
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1700, 300, 80, 1), auroraMaterial(2.3 + i * 1.9));
      m.position.set((i - 1) * 380, 330 + i * 45, -780 + i * 160);
      m.rotation.y = (i - 1) * 0.25;
      m.frustumCulled = false;
      this.auroras.push(m);
      this.dome.add(m);
    }

    // Shooting stars: streaks that fade from a bright head to nothing.
    const qg = new THREE.BufferGeometry();
    qg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SHOOTERS * 12), 3));
    qg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(SHOOTERS * 12), 3));
    const idx: number[] = [];
    for (let i = 0; i < SHOOTERS; i++) idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4 + 2, i * 4 + 1, i * 4 + 3);
    qg.setIndex(idx);
    this.shootMesh = new THREE.Mesh(qg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, toneMapped: false }));
    this.shootMesh.frustumCulled = false;
    for (let i = 0; i < SHOOTERS; i++) this.shooters.push({ p: new THREE.Vector3(), d: new THREE.Vector3(), age: 0, life: 1, live: false });
    this.dome.add(this.shootMesh);

    // Fireworks.
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BURSTS * SPARKS * 3), 3));
    pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(BURSTS * SPARKS * 3), 3));
    this.sparks = new THREE.Points(pg, new THREE.PointsMaterial({ size: 5.5, map: dotTex(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
    this.sparks.frustumCulled = false;
    for (let i = 0; i < BURSTS; i++) this.bursts.push({ o: new THREE.Vector3(), age: 0, rise: 1, c1: new THREE.Color(), c2: new THREE.Color(), live: false });
    this.group.add(this.sparks);

    // Searchlights: long soft cones sweeping the sky.
    const lg = new THREE.CylinderGeometry(30, 1, 1000, 24, 1, true);
    lg.translate(0, 500, 0);
    for (let i = 0; i < BEAMS; i++) {
      const m = new THREE.Mesh(lg, new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
        uniforms: { strength: { value: 0 }, col: { value: new THREE.Color() } },
        vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
        fragmentShader: `uniform float strength; uniform vec3 col; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
          void main(){ float edge = pow(abs(dot(normalize(vN), normalize(vV))), 2.0); gl_FragColor = vec4(col * pow(1.0 - vUv.y, 1.6) * edge * strength * 0.2, 1.0); }`,
      }));
      m.frustumCulled = false;
      this.lights.push(m);
      this.group.add(m);
    }

    // The moon: a great halo, and a crescent for the lands that watch for it.
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTex(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
    this.halo.scale.set(1150, 1150, 1);
    this.crescent = new THREE.Sprite(new THREE.SpriteMaterial({ map: crescentTex(), transparent: true, depthWrite: false, fog: false, opacity: 0, toneMapped: false }));
    this.crescent.material.color.setScalar(1.5);
    this.crescent.scale.set(520, 520, 1);
    this.dome.add(this.halo, this.crescent);
  }

  update(dt: number, t: number, focus: THREE.Vector3, land: RegionId, night: number, sunDir: THREE.Vector3): void {
    const design = SKIES[land];
    const e = Math.min(1, dt * 0.8);
    const party = land === 'meadow' ? this.party : 0;
    // At the celebration the sky wears every land's colours: fireworks, kites, beams and halos
    // cycle slowly through all twenty palettes.
    const palette = party > 0.3 ? PARTY_PALETTE : design.palette;
    const shift = party > 0.3 ? Math.floor(t / 6) * 6 : 0;
    this.pal.forEach((c, i) => c.lerp(tmpC.set(palette[(i + shift) % palette.length]), e));
    this.cloudTint.lerp(tmpC.set(design.cloud), e);
    const k = Math.min(1, dt * 0.5);
    for (const kind of SKY_KINDS) {
      const want = Math.max(design.effects.includes(kind) ? 1 : 0, party);
      this.level[kind] += (want - this.level[kind]) * k;
    }
    const L = this.level, day = 1 - night;
    const dusk = 1 - smoothstep(0, 0.35, Math.abs(sunDir.y));
    this.dome.position.set(focus.x, 0, focus.z);
    this.near.position.copy(focus);

    // Milky Way and nebula.
    {
      const u = this.nightDome.material.uniforms;
      u.milky.value = L.milkyway * night;
      u.nebula.value = L.nebula * night;
      u.t.value = t;
      u.colA.value.copy(this.pal[0]);
      u.colB.value.copy(this.pal[1]);
      u.colC.value.copy(this.pal[2]);
      this.nightDome.visible = u.milky.value + u.nebula.value > 0.01;
    }

    // Clouds drift slowly, coloured by the land, the sunset and the night.
    {
      const s = L.clouds * (0.15 + 0.85 * day);
      this.cloudMat.opacity = s * 0.8;
      this.cloudMat.color.copy(this.cloudTint).lerp(tmpD.set('#ffb08a'), dusk * 0.55).lerp(tmpD.set('#2a2858'), night * 0.85);
      for (const c of this.clouds) {
        const d = c.userData as { a: number; r: number; y: number; v: number };
        d.a += dt * d.v;
        c.position.set(Math.cos(d.a) * d.r, d.y, Math.sin(d.a) * d.r);
        c.visible = s > 0.01;
      }
    }

    // Kites fly by day; each has a string down to the ground.
    {
      const s = L.kites * smoothstep(0.25, 0.7, day);
      const m = this.kites.material as THREE.MeshBasicMaterial;
      m.opacity = s;
      this.kites.visible = this.strings.visible = s > 0.01;
      this.strings.material.opacity = s * 0.35;
      if (this.kites.visible) {
        const sp = this.strings.geometry.attributes.position as THREE.BufferAttribute;
        for (let i = 0; i < KITES; i++) {
          const st = this.kiteState;
          st[i * 4] = wrap(st[i * 4], focus.x, KITE_R);
          st[i * 4 + 1] = wrap(st[i * 4 + 1], focus.z, KITE_R);
          const ph = st[i * 4 + 3];
          tmpP.set(st[i * 4] + Math.sin(t * 0.7 + ph) * 3, focus.y + st[i * 4 + 2] + Math.sin(t * 1.1 + ph) * 2, st[i * 4 + 1] + Math.cos(t * 0.5 + ph) * 2);
          tmpQ.setFromEuler(tmpE.set(0.25 + Math.sin(t * 1.3 + ph) * 0.12, 0.6 + Math.sin(t * 0.4 + ph) * 0.3, Math.sin(t * 1.7 + ph) * 0.25));
          this.kites.setMatrixAt(i, tmpM.compose(tmpP, tmpQ, tmpS.setScalar(1)));
          this.kites.setColorAt(i, this.pal[i % this.pal.length]);
          sp.setXYZ(i * 2, tmpP.x, tmpP.y - 1.9, tmpP.z);
          sp.setXYZ(i * 2 + 1, tmpP.x - 45, focus.y + 1, tmpP.z - 30);
        }
        this.kites.instanceMatrix.needsUpdate = true;
        if (this.kites.instanceColor) this.kites.instanceColor.needsUpdate = true;
        sp.needsUpdate = true;
      }
    }

    // Birds wheel in V-shaped flocks by day and at dusk.
    {
      const s = L.birds * (1 - night * 0.9);
      (this.birds.material as THREE.MeshBasicMaterial).opacity = s * 0.9;
      this.birds.visible = s > 0.01;
      if (this.birds.visible) {
        for (let f = 0; f < FLOCKS; f++) {
          const F = this.flocks;
          F[f * 5] = wrap(F[f * 5], focus.x, FLOCK_R);
          F[f * 5 + 1] = wrap(F[f * 5 + 1], focus.z, FLOCK_R);
          const a = t * 0.12 * (f % 2 ? 1 : -1) + F[f * 5 + 4], r = F[f * 5 + 2];
          const cx = F[f * 5] + Math.cos(a) * r, cz = F[f * 5 + 1] + Math.sin(a) * r;
          const head = a + (f % 2 ? Math.PI / 2 : -Math.PI / 2);
          const fx = Math.cos(head), fz = Math.sin(head);
          for (let j = 0; j < PER_FLOCK; j++) {
            const rank = Math.ceil(j / 2), side = j === 0 ? 0 : (j % 2 ? 1 : -1) * rank * 2.4;
            const x = cx - fx * rank * 2.2 - fz * side, z = cz - fz * rank * 2.2 + fx * side;
            const flap = Math.sin(t * 9 + j * 0.7 + f);
            tmpQ.setFromEuler(tmpE.set(0, Math.atan2(fx, fz), 0));
            tmpP.set(x, focus.y + F[f * 5 + 3] + Math.sin(t * 0.8 + j) * 0.6, z);
            this.birds.setMatrixAt(f * PER_FLOCK + j, tmpM.compose(tmpP, tmpQ, tmpS.set(1, 0.4 + flap * 2.2, 1)));
          }
        }
        this.birds.instanceMatrix.needsUpdate = true;
      }
    }

    // Sunbeams round the sun, strongest in the golden hours.
    {
      const s = L.sunbeams * (sunDir.y > -0.02 ? 1 : 0) * (0.35 + dusk * 0.65) * day;
      this.beams.visible = s > 0.01;
      if (this.beams.visible) {
        this.beams.position.copy(sunDir).multiplyScalar(2600);
        this.beams.lookAt(this.dome.position);
        this.beams.rotateZ(t * 0.01);
        this.beams.material.uniforms.strength.value = s;
        this.beams.material.uniforms.col.value.copy(tmpC.set('#fff2d0').lerp(tmpD.set('#ffb070'), dusk));
      }
    }

    // Rainbows stand opposite the sun.
    {
      const s = L.rainbow * day * (1 - dusk * 0.6) * (sunDir.y > 0 ? 1 : 0);
      const h = tmpP.set(-sunDir.x, 0, -sunDir.z);
      if (h.lengthSq() < 1e-4) h.set(0, 0, -1);
      h.normalize();
      for (const r of this.rainbows) {
        r.visible = s > 0.01;
        r.material.uniforms.strength.value = s;
        r.position.set(h.x * 1150, focus.y - 90, h.z * 1150);
        r.rotation.set(0, Math.atan2(-h.x, -h.z), 0);
      }
    }

    // Alpenglow at dawn and dusk (a little lingers into the night).
    {
      const s = L.alpenglow * Math.min(1, dusk + night * 0.2);
      this.glow.visible = s > 0.01;
      const u = this.glow.material.uniforms;
      u.strength.value = s;
      u.colA.value.copy(this.pal[0]);
      u.colB.value.copy(this.pal[1]);
      (u.sun.value as THREE.Vector2).set(sunDir.x, sunDir.z).normalize();
      this.glow.position.y = focus.y - 100;
    }

    // Aurora.
    for (const a of this.auroras) {
      const s = L.aurora * night;
      a.visible = s > 0.01;
      a.material.uniforms.t.value = t;
      a.material.uniforms.strength.value = s;
      a.position.y = a.userData.y0 ?? (a.userData.y0 = a.position.y);
      a.position.y += focus.y;
    }

    this.updateShooters(dt, L.shootingStars * night * (1 + party));
    this.updateFireworks(dt, t, focus, L.fireworks * smoothstep(0.35, 0.8, night), party);

    // Searchlights sweep the night: round the town, or over the castle during the party.
    {
      const s = L.searchlights * smoothstep(0.4, 0.9, night);
      this.lights.forEach((m, i) => {
        m.visible = s > 0.01;
        if (!m.visible) return;
        const a = (i / BEAMS) * Math.PI * 2 + 0.4;
        // At the party the beams stand in an arc behind the castle, as seen from wherever you look.
        const behind = Math.atan2(this.lookDir.z, this.lookDir.x) + ((i / (BEAMS - 1)) - 0.5) * 2.2;
        if (party > 0.3) m.position.set(this.partyAt.x + Math.cos(behind) * 110, this.partyAt.y - 2, this.partyAt.z + Math.sin(behind) * 110);
        else m.position.set(focus.x + Math.cos(a) * 340, focus.y - 20, focus.z + Math.sin(a) * 340);
        m.rotation.set(Math.sin(t * 0.31 + i * 1.7) * 0.42, 0, Math.cos(t * 0.23 + i * 2.3) * 0.42);
        m.material.uniforms.strength.value = s;
        m.material.uniforms.col.value.copy(this.pal[i % this.pal.length]);
      });
    }

    // The moon's halo, and the crescent.
    {
      const up = sunDir.y < 0.1;
      const hs = L.moonHalo * night, cs = L.crescent * night;
      this.halo.visible = up && hs > 0.01;
      this.halo.position.copy(sunDir).multiplyScalar(-3000);
      this.halo.material.opacity = hs * 0.35;
      this.halo.material.color.copy(this.pal[0]).lerp(tmpC.set('#ffffff'), 0.5);
      this.crescent.visible = up && cs > 0.01;
      this.crescent.position.copy(sunDir).multiplyScalar(-3150);
      this.crescent.material.opacity = Math.min(1, cs * 1.4);
      this.hideMoon = cs > 0.5;
    }
  }

  private updateShooters(dt: number, s: number): void {
    this.shootMesh.visible = s > 0.01;
    if (!this.shootMesh.visible) return;
    this.shootClock += dt * s * 0.6;
    while (this.shootClock >= 1) {
      this.shootClock -= 1;
      const free = this.shooters.find((x) => !x.live);
      if (!free) break;
      const az = Math.random() * Math.PI * 2, el = rnd(0.45, 1.1);
      free.p.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).multiplyScalar(2000);
      free.d.set(rnd(-1, 1), rnd(-0.9, -0.3), rnd(-1, 1)).normalize();
      free.age = 0;
      free.life = rnd(0.6, 1.1);
      free.live = true;
    }
    const pos = this.shootMesh.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.shootMesh.geometry.attributes.color as THREE.BufferAttribute;
    this.shooters.forEach((x, i) => {
      if (x.live) x.age += dt;
      if (x.age > x.life) x.live = false;
      const f = x.live ? Math.sin(Math.PI * x.age / x.life) * Math.min(1, s) : 0;
      const head = tmpP.copy(x.p).addScaledVector(x.d, 1300 * x.age);
      const tail = tmpS.copy(head).addScaledVector(x.d, -260 * Math.min(1, x.age * 4));
      const sx = x.d.y * head.z - x.d.z * head.y, sy = x.d.z * head.x - x.d.x * head.z, sz = x.d.x * head.y - x.d.y * head.x;
      const n = Math.hypot(sx, sy, sz) || 1, w = 7 / n, wt = 1.5 / n;
      pos.setXYZ(i * 4, head.x + sx * w, head.y + sy * w, head.z + sz * w);
      pos.setXYZ(i * 4 + 1, head.x - sx * w, head.y - sy * w, head.z - sz * w);
      pos.setXYZ(i * 4 + 2, tail.x + sx * wt, tail.y + sy * wt, tail.z + sz * wt);
      pos.setXYZ(i * 4 + 3, tail.x - sx * wt, tail.y - sy * wt, tail.z - sz * wt);
      col.setXYZ(i * 4, f * 1.6, f * 1.55, f * 1.4);
      col.setXYZ(i * 4 + 1, f * 1.6, f * 1.55, f * 1.4);
      col.setXYZ(i * 4 + 2, 0, 0, 0);
      col.setXYZ(i * 4 + 3, 0, 0, 0);
    });
    pos.needsUpdate = col.needsUpdate = true;
  }

  private updateFireworks(dt: number, t: number, focus: THREE.Vector3, s: number, party: number): void {
    const live = this.bursts.some((b) => b.live);
    this.sparks.visible = s > 0.01 || live;
    if (!this.sparks.visible) return;
    this.fwClock += dt * fireworkRate(s, party);
    while (this.fwClock >= 1) {
      this.fwClock -= 1;
      const b = this.bursts.find((x) => !x.live);
      if (!b) break;
      if (party > 0.3) b.o.set(this.partyAt.x + rnd(-60, 60), this.partyAt.y + rnd(55, 100), this.partyAt.z + rnd(-70, 20));
      else {
        const ahead = Math.atan2(this.lookDir.z, this.lookDir.x);
        const a = Math.random() < 0.8 ? ahead + rnd(-0.7, 0.7) : Math.random() * Math.PI * 2, r = rnd(110, 250);
        b.o.set(focus.x + Math.cos(a) * r, focus.y + rnd(70, 140), focus.z + Math.sin(a) * r);
      }
      b.age = 0;
      b.rise = rnd(1, 1.6);
      // At the party each burst is one land's own firework colours.
      const src = party > 0.3 ? SKIES[REGION_IDS[Math.floor(Math.random() * REGION_IDS.length)]].palette.map((x) => tmpD.set(x).clone()) : this.pal;
      b.c1.copy(src[Math.floor(Math.random() * src.length)]);
      b.c2.copy(Math.random() < 0.12 ? tmpC.set('#ffffff') : src[Math.floor(Math.random() * src.length)]);
      b.live = true;
      const i0 = this.bursts.indexOf(b) * SPARKS, ring = Math.random() < 0.25, speed = rnd(34, 48);
      for (let p = 0; p < SPARKS; p++) {
        if (ring) {
          const a = (p / SPARKS) * Math.PI * 2;
          tmpP.set(Math.cos(a), Math.sin(a) * 0.35, Math.sin(a)).normalize();
        } else tmpP.set(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize();
        tmpP.multiplyScalar(speed * rnd(0.85, 1.05));
        this.sparkVel.set([tmpP.x, tmpP.y, tmpP.z], (i0 + p) * 3);
      }
    }
    const pos = this.sparks.geometry.attributes.position as THREE.BufferAttribute;
    const col = this.sparks.geometry.attributes.color as THREE.BufferAttribute;
    this.bursts.forEach((b, bi) => {
      const i0 = bi * SPARKS;
      if (b.live) b.age += dt;
      const tau = b.age - b.rise;
      if (tau > 2.8) b.live = false;
      for (let p = 0; p < SPARKS; p++) {
        const i = i0 + p;
        if (!b.live) { col.setXYZ(i, 0, 0, 0); continue; }
        if (tau < 0) {
          // The shell rising on its trail of sparks.
          const k = b.age / b.rise, y = b.o.y - (1 - k) * 70 - p * 0.35;
          pos.setXYZ(i, b.o.x + Math.sin(p) * 0.3, y, b.o.z);
          const f = p < 10 ? (1 - p / 10) * 0.9 : 0;
          col.setXYZ(i, f, f * 0.75, f * 0.4);
          continue;
        }
        const drag = (1 - Math.exp(-1.6 * tau)) / 1.6;
        const v = i * 3;
        pos.setXYZ(i, b.o.x + this.sparkVel[v] * drag, b.o.y + this.sparkVel[v + 1] * drag - 3.2 * tau * tau, b.o.z + this.sparkVel[v + 2] * drag);
        const fade = Math.pow(Math.max(0, 1 - tau / 2.6), 1.3) * (tau > 1.2 ? 0.6 + 0.4 * Math.sin(t * 30 + p) : 1);
        const c = p % 2 ? b.c1 : b.c2, f = fade * 2.0 * Math.max(0.35, Math.min(1, s + party));
        col.setXYZ(i, c.r * f, c.g * f, c.b * f);
      }
    });
    pos.needsUpdate = col.needsUpdate = true;
  }
}

/** Keep a world coordinate within ±r of the focus by wrapping it round (things you walk past). */
function wrap(v: number, focus: number, r: number): number {
  if (v - focus > r) return v - 2 * r;
  if (v - focus < -r) return v + 2 * r;
  return v;
}
