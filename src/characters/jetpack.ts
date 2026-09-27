import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

/**
 * His sci-fi jetpack (owner's brief): a sleek pack on his back with two thrusters, swept
 * aerodynamic wings and fins; black with gold outlining; covered in an intricate rainbow
 * motherboard — traces, vias and chips — over honeycomb hexagons; and rainbow fire from the
 * nozzles, small while he walks and roaring when he flies. The pictures are canvas textures.
 * The wings are short so they never reach the girl (`JET_REACH`, tests/wings.test.ts).
 */

/** How far to the side any part of the pack reaches from his centre (model units). */
export const JET_REACH = 0.44;

let boardTex: THREE.Texture | null | undefined;
let hexTex: THREE.Texture | null | undefined;

function rng(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const rainbow = (k: number, l = 60) => `hsl(${Math.round(((k % 1) + 1) % 1 * 360)}, 95%, ${l}%)`;

/** Honeycomb hexagons: gold rims on black, some cells lit in rainbow colours. */
function hexes(x: CanvasRenderingContext2D, W: number, H: number, R: number, r: () => number, lit = 0.12): void {
  const dx = R * Math.sqrt(3), dy = R * 1.5;
  for (let row = -1; row * dy < H + R; row++) for (let col = -1; col * dx < W + R; col++) {
    const cx = col * dx + (row % 2 ? dx / 2 : 0), cy = row * dy;
    x.beginPath();
    for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * Math.PI) / 3; x.lineTo(cx + Math.cos(a) * R * 0.9, cy + Math.sin(a) * R * 0.9); }
    x.closePath();
    if (r() < lit) { x.fillStyle = rainbow(cx / W * 0.8 + cy / H * 0.3, 55); x.globalAlpha = 0.55; x.fill(); x.globalAlpha = 1; }
    x.strokeStyle = 'rgba(212,169,58,0.55)'; x.lineWidth = 1.4; x.stroke();
  }
}

/** The rainbow motherboard: black board, honeycomb underlay, rainbow traces with vias, chips with gold pins, gold border. */
export function boardTexture(): THREE.Texture | null {
  if (boardTex !== undefined) return boardTex;
  if (typeof document === 'undefined') return (boardTex = null);
  const S = 512, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const x = cv.getContext('2d')!, r = rng(4242);
  x.fillStyle = '#07070b'; x.fillRect(0, 0, S, S);
  x.save(); x.globalAlpha = 0.5; hexes(x, S, S, 14, r, 0.06); x.restore();
  // Traces: runs along the grid and at 45°, each a colour of the rainbow by where it starts.
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (let i = 0; i < 70; i++) {
    let px = Math.round(r() * 32) * 16, py = Math.round(r() * 32) * 16;
    const col = rainbow(px / S * 0.7 + py / S * 0.3);
    x.strokeStyle = col; x.lineWidth = 1.5 + r() * 2.5;
    x.shadowColor = col; x.shadowBlur = 6;
    x.beginPath(); x.moveTo(px, py);
    let dir = Math.floor(r() * 8);
    for (let k = 0; k < 3 + Math.floor(r() * 5); k++) {
      const L = 16 * (1 + Math.floor(r() * 5)), a = (dir * Math.PI) / 4;
      px += Math.round(Math.cos(a)) * L; py += Math.round(Math.sin(a)) * L;
      x.lineTo(px, py);
      dir = (dir + (r() < 0.5 ? 1 : 7)) % 8;
    }
    x.stroke();
    x.shadowBlur = 0;
    // A via at the end: a gold ring round a lit hole.
    x.beginPath(); x.arc(px, py, 4.5, 0, Math.PI * 2); x.fillStyle = '#d4a93a'; x.fill();
    x.beginPath(); x.arc(px, py, 2, 0, Math.PI * 2); x.fillStyle = col; x.fill();
  }
  // Chips: black with gold pins and a rainbow glint.
  for (let i = 0; i < 9; i++) {
    const w = 30 + r() * 50, h = 22 + r() * 36, cx = r() * (S - w), cy = r() * (S - h);
    x.fillStyle = '#111116'; x.fillRect(cx, cy, w, h);
    x.strokeStyle = '#e6c15a'; x.lineWidth = 2; x.strokeRect(cx, cy, w, h);
    x.fillStyle = '#e6c15a';
    for (let p = 5; p < w - 3; p += 7) { x.fillRect(cx + p, cy - 5, 2.5, 5); x.fillRect(cx + p, cy + h, 2.5, 5); }
    x.fillStyle = rainbow(r(), 62); x.fillRect(cx + 5, cy + 5, w * 0.3, 3);
  }
  // Gold outline, with black beside it.
  x.strokeStyle = '#000'; x.lineWidth = 16; x.strokeRect(0, 0, S, S);
  x.strokeStyle = '#e8c35c'; x.lineWidth = 5; x.strokeRect(6, 6, S - 12, S - 12);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return (boardTex = t);
}

/** Honeycomb for the thruster casings: gold-rimmed black hexagons, some lit. */
function hexTexture(): THREE.Texture | null {
  if (hexTex !== undefined) return hexTex;
  if (typeof document === 'undefined') return (hexTex = null);
  const S = 256, cv = document.createElement('canvas');
  cv.width = cv.height = S;
  const x = cv.getContext('2d')!;
  x.fillStyle = '#0a0a0e'; x.fillRect(0, 0, S, S);
  hexes(x, S, S, 16, rng(77), 0.22);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return (hexTex = t);
}

const matCache = new Map<string, THREE.Material>();
function board(): THREE.Material {
  let m = matCache.get('board');
  if (!m) {
    const map = boardTexture();
    m = new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : '#1a1a22', map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: map ? 0.55 : 0, metalness: 0.5, roughness: 0.35 });
    matCache.set('board', m);
  }
  return m;
}
function hexMat(): THREE.Material {
  let m = matCache.get('hex');
  if (!m) {
    const map = hexTexture();
    m = new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : '#121218', map, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: map ? 0.4 : 0, metalness: 0.6, roughness: 0.3 });
    matCache.set('hex', m);
  }
  return m;
}
const GOLD = () => matCache.get('gold') ?? matCache.set('gold', new THREE.MeshStandardMaterial({ color: '#e0b64a', metalness: 1, roughness: 0.25, emissive: '#6b4a10', emissiveIntensity: 0.4 })).get('gold')!;
const BLACK = () => matCache.get('black') ?? matCache.set('black', new THREE.MeshStandardMaterial({ color: '#0c0c10', metalness: 0.6, roughness: 0.3 })).get('black')!;

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
    // v = 1 at the nozzle, 0 at the tip: the flame runs through the rainbow as it leaves.
    float along = 1.0 - vUv.y;
    float flick = 0.75 + 0.25 * sin(uTime * 38.0 + vUv.x * 25.0) * sin(uTime * 23.0 + along * 9.0);
    float grain = n(floor(vec2(vUv.x * 18.0, vUv.y * 24.0 + uTime * 30.0)));
    vec3 c = mix(vec3(1.0), hue(fract(along * 0.9 - uTime * 0.6)), smoothstep(0.02, 0.28, along));
    float a = (1.0 - along) * flick * (0.7 + 0.3 * grain) * uPower;
    gl_FragColor = vec4(c * (1.3 + 0.6 * (1.0 - along)), a);
  }
`;

/** The jetpack, sitting on his back. Call `update` every frame. */
export class Jetpack {
  readonly group = new THREE.Group();
  private flames: THREE.Mesh[] = [];
  private flameMat: THREE.ShaderMaterial;

  constructor() {
    const g = this.group, add = (geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.userData.part = 'accessory';
      mesh.castShadow = true;
      g.add(mesh);
      return mesh;
    };
    // The pack: a rounded, board-covered body with a gold rim and a black spine.
    add(new RoundedBoxGeometry(0.3, 0.44, 0.12, 3, 0.04), board(), 0, 1.1, -0.27);
    add(new RoundedBoxGeometry(0.32, 0.03, 0.13, 2, 0.012), GOLD(), 0, 1.33, -0.27);
    add(new RoundedBoxGeometry(0.32, 0.03, 0.13, 2, 0.012), GOLD(), 0, 0.87, -0.27);
    add(new RoundedBoxGeometry(0.05, 0.4, 0.02, 2, 0.008), BLACK(), 0, 1.1, -0.337);
    // Straps over the shoulders (black with gold edges).
    for (const s of [-1, 1]) {
      const strap = add(new THREE.TorusGeometry(0.16, 0.014, 6, 16, Math.PI * 0.9), BLACK(), s * 0.11, 1.2, -0.06);
      strap.rotation.set(0, Math.PI / 2, Math.PI * 0.55);
    }
    // Two thrusters: a honeycomb casing, gold rings, a black flared nozzle, and a gold nose cone.
    const casing = new THREE.LatheGeometry([
      [0.0, 0.26], [0.04, 0.255], [0.062, 0.23], [0.068, 0.18], [0.068, 0.02], [0.06, 0.0],
    ].map(([r, y]) => new THREE.Vector2(r, y)), 18);
    const nozzle = new THREE.LatheGeometry([[0.05, 0.0], [0.056, -0.03], [0.07, -0.07], [0.082, -0.1], [0.078, -0.1], [0.064, -0.07], [0.05, -0.03]].map(([r, y]) => new THREE.Vector2(r, y)), 18);
    for (const s of [-1, 1]) {
      const x = s * 0.155, z = -0.31, y0 = 0.9;
      add(casing, hexMat(), x, y0, z);
      add(nozzle, BLACK(), x, y0, z);
      for (const dy of [0.03, 0.14, 0.215]) { const ring = add(new THREE.TorusGeometry(0.069, 0.007, 6, 20), GOLD(), x, y0 + dy, z); ring.rotation.x = Math.PI / 2; }
      add(new THREE.ConeGeometry(0.03, 0.05, 12), GOLD(), x, y0 + 0.28, z);
      // Swept wing: an airfoil planform out and back from the thruster, board on top, gold leading edge.
      const shape = new THREE.Shape();
      shape.moveTo(0, 0); shape.lineTo(0.24, -0.1); shape.quadraticCurveTo(0.27, -0.12, 0.25, -0.15); shape.lineTo(0.02, -0.16); shape.lineTo(0, -0.12);
      const wing = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
      // Planar UVs over the planform so the board picture covers it.
      const uv = wing.getAttribute('uv') as THREE.BufferAttribute, pos = wing.getAttribute('position');
      for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 0.28, 1 + pos.getY(i) / 0.18);
      const w = add(wing, board(), x + s * 0.05, y0 + 0.2, z + 0.01);
      w.scale.x = s;
      w.rotation.x = -0.25;
      w.rotation.y = s * 0.35;
      const edge = new THREE.TubeGeometry(new THREE.LineCurve3(new THREE.Vector3(0, 0, 0.006), new THREE.Vector3(0.24, -0.1, 0.006)), 4, 0.006, 5);
      const e = add(edge, GOLD(), x + s * 0.05, y0 + 0.2, z + 0.01);
      e.scale.x = s; e.rotation.x = -0.25; e.rotation.y = s * 0.35;
      // A tail fin above, and a small ventral fin below, black with gold rims.
      const fin = new THREE.Shape();
      fin.moveTo(0, 0); fin.lineTo(-0.1, 0.0); fin.quadraticCurveTo(-0.12, 0.1, -0.02, 0.13); fin.lineTo(0, 0);
      const fg = new THREE.ExtrudeGeometry(fin, { depth: 0.008, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 });
      const f = add(fg, BLACK(), x, y0 + 0.18, z - 0.02);
      f.rotation.y = Math.PI / 2;
      const f2 = add(new THREE.ConeGeometry(0.012, 0.09, 4), GOLD(), x, y0 - 0.02, z - 0.07);
      f2.rotation.x = Math.PI / 2;
    }
    // The rainbow fire: an open cone below each nozzle, hot white at the nozzle, cycling rainbow down it.
    this.flameMat = new THREE.ShaderMaterial({
      vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uPower: { value: 0.4 } },
    });
    const flameGeo = new THREE.ConeGeometry(0.055, 0.5, 16, 6, true);
    flameGeo.rotateX(Math.PI); // tip down
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

  /** Fire: a flicker at rest, a steady burn walking, a roar in flight. */
  update(t: number, speed: number, airborne: boolean, riding: boolean): void {
    const power = riding ? 0.15 : airborne ? 1 : Math.min(0.6, 0.25 + speed * 0.05);
    this.flameMat.uniforms.uTime.value = t;
    this.flameMat.uniforms.uPower.value = power;
    for (const f of this.flames) f.scale.set(0.7 + power * 0.5, 0.35 + power * 1.6 + Math.sin(t * 31 + f.position.x * 40) * 0.05, 0.7 + power * 0.5);
  }
}
