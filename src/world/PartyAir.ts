import * as THREE from 'three';
import { MODES as AMBIENT_MODES } from './Ambience';
import { LOCALES, type Motion, type ParticleTheme } from './locale';
import { REGIONS, type Ambient, type RegionId } from './regions';

/**
 * The air of every land at the celebration. Guests came from all over the world, and each land
 * brought its own air with it: sakura petals drift over one side of the courtyard, maple leaves
 * over the next, then lantern sparks, fjord mist, alpine sparkle, London drizzle, New York
 * bokeh, golden motes, soap bubbles, orange blossom, embers, desert sand, river dust, marigolds,
 * jasmine, rose petals, green fireflies, aurora frost and star dust — each in its own slice of a
 * great ring round the castle courtyard, so they never muddy into one colour. Above them all,
 * the lands' weather — snow, petals, leaves, sand, sparkles and fireflies — falls in a wider ring.
 *
 * Pure layout (`partyAirs`) is tested; `PartyAir` draws it in two draws (solid and glowing).
 */

export interface PartyAirDef {
  /** Which land's air (or which weather) this is. */
  source: RegionId | `ambient:${Ambient}`;
  theme: ParticleTheme;
  /** The slice of the ring it fills: centre angle and half-width (radians), radius range (m). */
  angle: number;
  spread: number;
  r0: number;
  r1: number;
  /** How many particles. */
  n: number;
}

function ambientTheme(a: Ambient): ParticleTheme {
  const m = AMBIENT_MODES[a];
  const motion: Motion = a === 'snow' || a === 'petals' || a === 'leaves' ? 'fall' : a === 'sand' ? 'swirl' : a === 'sparkles' ? 'rise' : 'hover';
  return { what: `${a} weather`, colors: [m.color], motion, size: m.size * 1.3, count: 0, speed: Math.max(0.4, Math.abs(m.fall) + m.drift * 0.3), glow: m.glow, petal: a === 'petals' || a === 'leaves', night: m.nightOnly };
}

/** Every land's air and every kind of weather, each with its own place round the courtyard. */
export function partyAirs(): PartyAirDef[] {
  const lands = REGIONS.map((r) => r.id);
  const out: PartyAirDef[] = lands.map((id, i) => ({
    source: id,
    theme: LOCALES[id].particles,
    angle: (i / lands.length) * Math.PI * 2,
    spread: (Math.PI / lands.length) * 0.95,
    r0: 12,
    r1: 46,
    n: 110,
  }));
  const weather = (Object.keys(AMBIENT_MODES) as Ambient[]).filter((a) => a !== 'none');
  weather.forEach((a, i) => out.push({
    source: `ambient:${a}`,
    theme: ambientTheme(a),
    angle: (i / weather.length) * Math.PI * 2 + 0.3,
    spread: (Math.PI / weather.length) * 0.9,
    r0: 48,
    r1: 90,
    n: 150,
  }));
  return out;
}

const VERT = `
  attribute float size; attribute float shape; attribute vec3 tint; attribute float bright;
  uniform float scale; varying vec3 vCol; varying float vShape; varying float vSpin; varying float vBright;
  void main(){
    vCol = tint; vShape = shape; vBright = bright;
    vSpin = position.x * 1.7 + position.z * 1.3;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * scale / max(1.0, -mv.z);
    gl_Position = projectionMatrix * mv;
  }`;
const FRAG = `
  uniform float opacity; uniform float glow; varying vec3 vCol; varying float vShape; varying float vSpin; varying float vBright;
  void main(){
    vec2 p = gl_PointCoord - 0.5;
    float a;
    if (vShape > 0.5) {
      // A petal or leaf: a tilted ellipse.
      float c = cos(vSpin), s = sin(vSpin);
      vec2 q = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
      a = 1.0 - smoothstep(0.34, 0.42, length(q * vec2(1.0, 2.1)));
    } else {
      float d = length(p) * 2.0;
      a = glow > 0.5 ? pow(max(0.0, 1.0 - d), 1.6) : 1.0 - smoothstep(0.55, 1.0, d);
    }
    a *= opacity * vBright;
    if (a < 0.01) discard;
    gl_FragColor = vec4(vCol * (glow > 0.5 ? 1.6 : 1.0), a);
  }`;

interface Layer {
  points: THREE.Points<THREE.BufferGeometry, THREE.ShaderMaterial>;
  pos: Float32Array;
  bright: Float32Array;
  /** Per particle: def index, seed. */
  def: Uint16Array;
  seed: Float32Array;
}

export class PartyAir {
  readonly group = new THREE.Group();
  readonly defs = partyAirs();
  /** 0..1: fades with the party. */
  level = 0;
  private layers: Layer[] = [];
  private centre = new THREE.Vector3();

  constructor() {
    this.group.visible = false;
    for (const glow of [false, true]) {
      const idx: number[] = [];
      this.defs.forEach((d, i) => { if (!!d.theme.glow === glow) for (let k = 0; k < d.n; k++) idx.push(i); });
      const n = idx.length;
      const pos = new Float32Array(n * 3), tint = new Float32Array(n * 3), size = new Float32Array(n), shape = new Float32Array(n), bright = new Float32Array(n), seed = new Float32Array(n);
      const c = new THREE.Color();
      idx.forEach((di, i) => {
        const d = this.defs[di], th = d.theme;
        c.set(th.colors[i % th.colors.length]);
        tint.set([c.r, c.g, c.b], i * 3);
        size[i] = th.size * (0.8 + ((i * 37) % 10) / 25);
        shape[i] = th.petal ? 1 : 0;
        seed[i] = (i * 7.31) % 100;
        const a = d.angle + (((i * 0.618) % 1) * 2 - 1) * d.spread, r = d.r0 + ((i * 0.377) % 1) * (d.r1 - d.r0);
        pos.set([Math.cos(a) * r, ((i * 0.271) % 1) * 22, Math.sin(a) * r], i * 3);
      });
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('tint', new THREE.BufferAttribute(tint, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
      geo.setAttribute('shape', new THREE.BufferAttribute(shape, 1));
      geo.setAttribute('bright', new THREE.BufferAttribute(bright, 1));
      const mat = new THREE.ShaderMaterial({
        uniforms: { opacity: { value: 0 }, glow: { value: glow ? 1 : 0 }, scale: { value: 520 } },
        vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
        blending: glow ? THREE.AdditiveBlending : THREE.NormalBlending,
      });
      const points = new THREE.Points(geo, mat);
      points.frustumCulled = false;
      this.group.add(points);
      this.layers.push({ points, pos, bright, def: Uint16Array.from(idx), seed });
    }
  }

  /** How many particles of each land's air (and each weather) are in the air. */
  count(source: PartyAirDef['source']): number {
    const i = this.defs.findIndex((d) => d.source === source);
    return i < 0 ? 0 : this.layers.reduce((s, l) => s + l.def.filter((x) => x === i).length, 0);
  }

  /** `centre` is the courtyard (ground level); `pixelScale` keeps sizes right on any screen. */
  update(dt: number, t: number, centre: THREE.Vector3, night: number, pixelScale: number): void {
    this.group.visible = this.level > 0.01;
    if (!this.group.visible) return;
    this.centre.copy(centre);
    this.group.position.copy(centre);
    for (const L of this.layers) {
      const u = L.points.material.uniforms;
      u.opacity.value = this.level;
      u.scale.value = pixelScale;
      const n = L.def.length;
      for (let i = 0; i < n; i++) {
        const d = this.defs[L.def[i]], th = d.theme, s = L.seed[i], sp = th.speed;
        let x = L.pos[i * 3], y = L.pos[i * 3 + 1], z = L.pos[i * 3 + 2];
        switch (th.motion) {
          case 'fall': y -= sp * dt * (0.7 + (s % 1) * 0.6); x += Math.sin(t * 0.8 + s) * 0.9 * dt; z += Math.cos(t * 0.6 + s * 1.3) * 0.9 * dt; break;
          case 'flutter': x += Math.sin(t * 2.2 + s) * 1.2 * dt; y += Math.sin(t * 3.1 + s * 2) * 0.8 * dt + 0.05 * dt; z += Math.cos(t * 1.7 + s) * 1.2 * dt; break;
          case 'rise': y += sp * dt * (0.6 + (s % 1) * 0.8); x += Math.sin(t * 0.9 + s) * 0.5 * dt; z += Math.cos(t * 0.7 + s) * 0.5 * dt; break;
          case 'drift': x += Math.cos(d.angle + Math.PI / 2) * sp * dt; z += Math.sin(d.angle + Math.PI / 2) * sp * dt; y += Math.sin(t * 0.8 + s) * 0.2 * dt; break;
          case 'rain': y -= sp * dt * (0.85 + (s % 1) * 0.3); break;
          case 'swirl': { const a = t * 0.6 + s; x += Math.cos(a) * sp * dt; z += Math.sin(a * 1.3) * sp * 0.6 * dt; y += Math.sin(t + s) * 0.3 * dt; break; }
          case 'hover': x += Math.sin(t * 0.5 + s) * sp * dt; y += Math.sin(t * 1.1 + s * 2) * sp * 0.6 * dt; z += Math.cos(t * 0.45 + s) * sp * dt; break;
        }
        // Keep each air in its own slice of the ring: wrap round within it.
        const r = Math.hypot(x, z);
        let a = Math.atan2(z, x);
        const off = Math.atan2(Math.sin(a - d.angle), Math.cos(a - d.angle));
        if (Math.abs(off) > d.spread) a = d.angle - Math.sign(off) * d.spread * 0.98;
        const rr = r < d.r0 ? d.r1 - 0.5 : r > d.r1 ? d.r0 + 0.5 : r;
        if (rr !== r || a !== Math.atan2(z, x)) { x = Math.cos(a) * rr; z = Math.sin(a) * rr; }
        if (y < 0.2) y = 22;
        if (y > 24) y = 0.4;
        L.pos[i * 3] = x; L.pos[i * 3 + 1] = y; L.pos[i * 3 + 2] = z;
        // Night-only airs (fireflies) shine after dusk; glowing airs brighten at night.
        L.bright[i] = (th.night ? night : 1) * (th.glow ? 0.7 + night * 0.3 + Math.sin(t * 3 + s) * 0.15 : 1);
      }
      L.points.geometry.attributes.position.needsUpdate = true;
      L.points.geometry.attributes.bright.needsUpdate = true;
    }
  }
}
