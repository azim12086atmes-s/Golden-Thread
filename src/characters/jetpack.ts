import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * His sci-fi jetpack (owner's brief): mostly glass. Inside the glass, rainbow fuel glows in a
 * flowing gradient with particles floating up through it. On the glass an intricate motherboard
 * is etched — rainbow-glowing traces, gold vias and pads, black chips with gold pins — over faint
 * honeycomb. The encasing is minimal: thin gold rings and black end caps. Two thrusters, swept
 * aerodynamic glass wings with gold leading edges, black fins, and rainbow fire from the nozzles —
 * a flicker at rest, a roar in flight. Its wings are short, so it never reaches the girl
 * (`JET_REACH`, tests/wings.test.ts).
 */

/** How far from his centre any part of the pack reaches, in any direction (model units). */
export const JET_REACH = 0.46;

let boardTex: THREE.Texture | null | undefined;

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const rainbow = (k: number, l = 62) => `hsl(${Math.round((((k % 1) + 1) % 1) * 360)}, 100%, ${l}%)`;

/** The etched motherboard on clear glass: honeycomb, rainbow traces fading along a gradient, gold vias and pads, black chips. */
export function boardTexture(): THREE.Texture | null {
  if (boardTex !== undefined) return boardTex;
  if (typeof document === 'undefined') return (boardTex = null);
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const x = cv.getContext('2d')!, r = rng(4242);
  // Faint honeycomb, gold.
  const R = 13, dx = R * Math.sqrt(3), dy = R * 1.5;
  x.strokeStyle = 'rgba(224,182,74,0.28)'; x.lineWidth = 1.2;
  for (let row = -1; row * dy < S + R; row++) for (let col = -1; col * dx < S + R; col++) {
    const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy;
    x.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; x.lineTo(cx + Math.cos(a) * R * 0.92, cy + Math.sin(a) * R * 0.92); }
    x.closePath(); x.stroke();
  }
  // Rainbow traces: a gradient of colour across the board, glowing.
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (let i = 0; i < 110; i++) {
    let px = Math.round(r() * 42) * 12, py = Math.round(r() * 42) * 12;
    const col = rainbow(px / S * 0.6 + py / S * 0.4);
    x.strokeStyle = col; x.lineWidth = 1.2 + r() * 2.2;
    x.shadowColor = col; x.shadowBlur = 8;
    x.beginPath(); x.moveTo(px, py);
    let dir = Math.floor(r() * 8);
    for (let k = 0; k < 3 + Math.floor(r() * 6); k++) {
      const L = 12 * (1 + Math.floor(r() * 5)), a = (dir * Math.PI) / 4;
      px += Math.round(Math.cos(a)) * L; py += Math.round(Math.sin(a)) * L;
      x.lineTo(px, py);
      dir = (dir + (r() < 0.5 ? 1 : 7)) % 8;
    }
    x.stroke();
    x.shadowBlur = 0;
    x.beginPath(); x.arc(px, py, 4, 0, Math.PI * 2); x.fillStyle = '#e8c35c'; x.fill();
    x.beginPath(); x.arc(px, py, 1.8, 0, Math.PI * 2); x.fillStyle = col; x.fill();
  }
  // A few chips: black, gold pins, a glint of colour.
  for (let i = 0; i < 7; i++) {
    const w = 26 + r() * 40, h = 18 + r() * 28, cx = r() * (S - w), cy = r() * (S - h);
    x.fillStyle = 'rgba(12,12,16,0.92)'; x.fillRect(cx, cy, w, h);
    x.strokeStyle = '#e6c15a'; x.lineWidth = 1.6; x.strokeRect(cx, cy, w, h);
    x.fillStyle = '#e6c15a';
    for (let p = 4; p < w - 3; p += 6) { x.fillRect(cx + p, cy - 4, 2, 4); x.fillRect(cx + p, cy + h, 2, 4); }
    x.fillStyle = rainbow(r(), 65); x.fillRect(cx + 4, cy + 4, w * 0.35, 2.5);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (boardTex = t);
}

const cache = new Map<string, THREE.Material>();
const once = <T extends THREE.Material>(k: string, f: () => T): T => (cache.get(k) as T) ?? (cache.set(k, f()), cache.get(k) as T);
/** Clear glass: a faint cool tint, glossy. */
const GLASS = () => once('glass', () => new THREE.MeshStandardMaterial({ color: '#dff2ff', transparent: true, opacity: 0.22, roughness: 0.04, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide }));
/** The etched board on the glass: it glows. */
const ETCH = () => once('etch', () => {
  const map = boardTexture();
  return new THREE.MeshBasicMaterial({ map, color: map ? '#ffffff' : '#8ff', transparent: true, opacity: map ? 1 : 0.3, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
});
const GOLD = () => once('gold', () => new THREE.MeshStandardMaterial({ color: '#e0b64a', metalness: 1, roughness: 0.25, emissive: '#6b4a10', emissiveIntensity: 0.4 }));
const BLACK = () => once('black', () => new THREE.MeshStandardMaterial({ color: '#0c0c10', metalness: 0.6, roughness: 0.3 }));

/** Rainbow fuel: a gradient up the tank that flows slowly, brightest in the middle, gently bubbling. */
const FUEL_VERT = /* glsl */ `
  varying vec3 vP;
  void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FUEL_FRAG = /* glsl */ `
  uniform float uTime, uH;
  varying vec3 vP;
  vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
  void main() {
    float k = vP.y / uH + 0.5;
    vec3 c = hue(fract(k * 0.85 - uTime * 0.08 + 0.02 * sin(vP.x * 60.0 + uTime * 3.0)));
    float swirl = 0.85 + 0.15 * sin(vP.y * 40.0 - uTime * 4.0 + vP.x * 30.0);
    gl_FragColor = vec4(mix(c, vec3(1.0), 0.18) * 1.25 * swirl, 0.82);
  }
`;
const FLAME_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FLAME_FRAG = /* glsl */ `
  uniform float uTime, uPower;
  varying vec2 vUv;
  vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
  float n(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  void main() {
    float along = 1.0 - vUv.y;
    float flick = 0.75 + 0.25 * sin(uTime * 38.0 + vUv.x * 25.0) * sin(uTime * 23.0 + along * 9.0);
    float grain = n(floor(vec2(vUv.x * 18.0, vUv.y * 24.0 + uTime * 30.0)));
    vec3 c = mix(vec3(1.0), hue(fract(along * 0.9 - uTime * 0.6)), smoothstep(0.02, 0.28, along));
    float a = (1.0 - along) * flick * (0.7 + 0.3 * grain) * uPower;
    gl_FragColor = vec4(c * (1.3 + 0.6 * (1.0 - along)), a);
  }
`;

/** Particles floating up through one tank of fuel (box: half sizes). */
interface Tank { pts: THREE.Points; hx: number; hy: number; hz: number; speeds: Float32Array }

/** The jetpack, sitting on his back. Call `update` every frame. */
export class Jetpack {
  readonly group = new THREE.Group();
  private flames: THREE.Mesh[] = [];
  private flameMat: THREE.ShaderMaterial;
  private fuelMats: THREE.ShaderMaterial[] = [];
  private tanks: Tank[] = [];

  constructor() {
    const g = this.group, add = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0, order = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.userData.part = 'accessory';
      mesh.renderOrder = order;
      g.add(mesh);
      return mesh;
    };
    const fuel = (h: number) => {
      const m = new THREE.ShaderMaterial({ vertexShader: FUEL_VERT, fragmentShader: FUEL_FRAG, transparent: true, depthWrite: false, toneMapped: false, uniforms: { uTime: { value: 0 }, uH: { value: h } } });
      this.fuelMats.push(m);
      return m;
    };
    const r = rng(91);
    const tank = (hx: number, hy: number, hz: number, x: number, y: number, z: number) => {
      const n = 26, pos = new Float32Array(n * 3), col = new Float32Array(n * 3), speeds = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        pos.set([(r() - 0.5) * 2 * hx, (r() - 0.5) * 2 * hy, (r() - 0.5) * 2 * hz], i * 3);
        const c = new THREE.Color().setHSL(r(), 1, 0.8);
        col.set([c.r, c.g, c.b], i * 3);
        speeds[i] = 0.03 + r() * 0.08;
      }
      const pg = new THREE.BufferGeometry();
      pg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.014, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      pts.position.set(x, y, z);
      pts.userData.part = 'accessory';
      pts.renderOrder = 4;
      g.add(pts);
      this.tanks.push({ pts, hx, hy, hz, speeds });
    };

    // The pack: a glass case holding a core of glowing fuel, the board etched on its glass.
    const PW = 0.3, PH = 0.44, PD = 0.12, py = 1.1, pz = -0.27;
    add(new RoundedBoxGeometry(PW * 0.78, PH * 0.84, PD * 0.6, 2, 0.03), fuel(PH * 0.84), 0, py, pz, 1);
    tank(PW * 0.36, PH * 0.4, PD * 0.26, 0, py, pz);
    add(new RoundedBoxGeometry(PW, PH, PD, 3, 0.04), GLASS(), 0, py, pz, 3);
    add(new RoundedBoxGeometry(PW + 0.004, PH + 0.004, PD + 0.004, 3, 0.042), ETCH(), 0, py, pz, 5);
    // Minimal encasing: a thin gold band top and bottom, black caps.
    add(new RoundedBoxGeometry(PW + 0.02, 0.022, PD + 0.02, 2, 0.01), GOLD(), 0, py + PH / 2, pz);
    add(new RoundedBoxGeometry(PW + 0.02, 0.022, PD + 0.02, 2, 0.01), GOLD(), 0, py - PH / 2, pz);
    add(new RoundedBoxGeometry(PW * 0.6, 0.03, PD * 0.7, 2, 0.012), BLACK(), 0, py + PH / 2 + 0.022, pz);
    // Straps over the shoulders: black.
    for (const s of [-1, 1]) {
      const strap = add(new THREE.TorusGeometry(0.16, 0.012, 6, 16, Math.PI * 0.9), BLACK(), s * 0.11, 1.2, -0.06);
      strap.rotation.set(0, Math.PI / 2, Math.PI * 0.55);
    }

    // Two thrusters: glass tubes of fuel with particles, etched glass, gold rings, black nozzles.
    const TH = 0.26, TR = 0.066;
    const nozzle = new THREE.LatheGeometry([[0.05, 0.0], [0.056, -0.03], [0.07, -0.07], [0.082, -0.1], [0.078, -0.1], [0.064, -0.07], [0.05, -0.03]].map(([rr, yy]) => new THREE.Vector2(rr, yy)), 18);
    for (const s of [-1, 1]) {
      const x = s * 0.155, z = -0.31, y0 = 0.9, yc = y0 + TH / 2;
      add(new THREE.CylinderGeometry(TR * 0.72, TR * 0.72, TH * 0.9, 16), fuel(TH * 0.9), x, yc, z, 1);
      tank(TR * 0.5, TH * 0.42, TR * 0.5, x, yc, z);
      add(new THREE.CylinderGeometry(TR, TR, TH, 20, 1, true), GLASS(), x, yc, z, 3);
      add(new THREE.CylinderGeometry(TR + 0.002, TR + 0.002, TH, 20, 1, true), ETCH(), x, yc, z, 5);
      add(new THREE.SphereGeometry(TR, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), GLASS(), x, y0 + TH, z, 3);
      add(nozzle, BLACK(), x, y0, z);
      for (const dy of [0.0, TH]) { const ring = add(new THREE.TorusGeometry(TR + 0.002, 0.006, 6, 24), GOLD(), x, y0 + dy, z); ring.rotation.x = Math.PI / 2; }
      add(new THREE.ConeGeometry(0.018, 0.04, 10), GOLD(), x, y0 + TH + TR + 0.012, z);
      // Swept glass wing, etched, with a gold leading edge.
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(0.25, -0.1); shape.quadraticCurveTo(0.28, -0.12, 0.26, -0.15); shape.lineTo(0.02, -0.16); shape.lineTo(0, -0.12);
      const wing = new THREE.ExtrudeGeometry(shape, { depth: 0.01, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2 });
      const uv = wing.getAttribute('uv') as THREE.BufferAttribute, pos = wing.getAttribute('position');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 0.28, 1 + pos.getY(i) / 0.18);
      for (const [m, order] of [[GLASS(), 3], [ETCH(), 5]] as const) {
        const w = add(wing, m, x + s * 0.05, y0 + 0.2, z + 0.01, order);
        w.scale.x = s; w.rotation.x = -0.25; w.rotation.y = s * 0.35;
      }
      const edge = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0.005), new THREE.Vector3(0.25, -0.1, 0.005)), 4, 0.005, 5);
      const e = add(edge, GOLD(), x + s * 0.05, y0 + 0.2, z + 0.01);
      e.scale.x = s; e.rotation.x = -0.25; e.rotation.y = s * 0.35;
      // A small black tail fin.
      const fin = new THREE.Shape();
      fin.moveTo(0, 0); fin.lineTo(-0.1, 0.0); fin.quadraticCurveTo(-0.12, 0.1, -0.02, 0.13); fin.lineTo(0, 0);
      const f = add(new THREE.ExtrudeGeometry(fin, { depth: 0.006, bevelEnabled: true, bevelSize: 0.003, bevelThickness: 0.003, bevelSegments: 1 }), BLACK(), x, y0 + 0.16, z - 0.07);
      f.rotation.y = Math.PI / 2;
    }
    // Rainbow fire below each nozzle.
    this.flameMat = new THREE.ShaderMaterial({
      vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uPower: { value: 0.4 } },
    });
    const flameGeo = new THREE.ConeGeometry(0.055, 0.5, 16, 6, true);
    flameGeo.rotateX(Math.PI);
    flameGeo.translate(0, -0.25, 0);
    for (const s of [-1, 1]) {
      const f = new THREE.Mesh(flameGeo, this.flameMat);
      f.position.set(s * 0.155, 0.8, -0.31);
      f.userData.part = 'accessory';
      f.frustumCulled = false;
      this.flames.push(f);
      g.add(f);
    }
  }

  /** Fire: a flicker at rest, a steady burn walking, a roar in flight. Fuel flows, particles rise. */
  update(t: number, dt: number, speed: number, airborne: boolean, riding: boolean): void {
    const power = riding ? 0.15 : airborne ? 1 : Math.min(0.6, 0.25 + speed * 0.05);
    this.flameMat.uniforms.uTime.value = t;
    this.flameMat.uniforms.uPower.value = power;
    for (const f of this.flames) f.scale.set(0.7 + power * 0.5, 0.35 + power * 1.6 + Math.sin(t * 31 + f.position.x * 40) * 0.05, 0.7 + power * 0.5);
    for (const m of this.fuelMats) m.uniforms.uTime.value = t;
    for (const tk of this.tanks) {
      const pos = tk.pts.geometry.getAttribute('position') as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + tk.speeds[i] * dt * (1 + power);
        if (y > tk.hy) y = -tk.hy;
        pos.setY(i, y);
        pos.setX(i, pos.getX(i) + Math.sin(t * 2 + i) * 0.0004);
      }
      pos.needsUpdate = true;
    }
  }
}
