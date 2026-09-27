import * as THREE from 'three';
import { smoothstep } from '../core/rng';
import { GeoBuilder, cone, cyl, sphere, tree } from './kit';
import type { SkyKind } from './skies';
import { rainbowGeometry, rainbowMaterial } from './Sky';

/**
 * The sky's ornaments (skies.ts lists which land has which): sister moons in other colours and
 * phases, a great ringed planet with two small ones, extra rainbows (moonbows at night), a dome
 * of translucent golden hexagon tiles that shimmers in slow waves, the stars joined into glowing
 * figures, a comet with a dust tail and an ion tail, a halo round the sun with two sundogs,
 * floating islands far off with waterfalls, a vast eight-pointed girih star turning overhead,
 * hot-air balloons, and electric-blue night-shining clouds low on the horizon after dusk.
 *
 * Each is a handful of draw calls; SkyFX eases their levels in and out by land and by hour.
 */

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const tmpC = new THREE.Color(), tmpV = new THREE.Vector3(), tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpS = new THREE.Vector3();
const UP = new THREE.Vector3(0, 1, 0);
const GOLD = new THREE.Color('#ffd27a');

function tex(w: number, h: number, draw: (x: CanvasRenderingContext2D) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** A direction in the sky from azimuth and elevation (radians). */
function dir(az: number, el: number): THREE.Vector3 {
  return new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el));
}

/** A moon: a softly shaded disc with seas, in a given phase (0 new … 0.5 full … 1 new). */
function moonTex(phase: number, seed: number): THREE.CanvasTexture {
  return tex(256, 256, (x) => {
    const g = x.createRadialGradient(118, 112, 10, 128, 128, 100);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.8, '#e6e6ee'); g.addColorStop(1, '#c8c8d8');
    x.fillStyle = g;
    x.beginPath(); x.arc(128, 128, 100, 0, Math.PI * 2); x.fill();
    x.fillStyle = 'rgba(150,150,175,0.35)';
    for (let i = 0; i < 7; i++) {
      const a = seed * 3.1 + i * 2.3, r = 20 + ((seed * 7 + i * 13) % 50);
      x.beginPath(); x.arc(128 + Math.cos(a) * r, 128 + Math.sin(a) * r, 10 + ((i * 11 + seed) % 16), 0, Math.PI * 2); x.fill();
    }
    // The shadowed part of the phase.
    const off = (phase - 0.5) * 2 * 210;
    if (Math.abs(off) > 2) {
      x.globalCompositeOperation = 'destination-out';
      x.beginPath(); x.arc(128 + off, 128 - off * 0.1, 104, 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = 'source-over';
    }
    // A soft glow round it.
    x.globalCompositeOperation = 'destination-over';
    const h = x.createRadialGradient(128, 128, 96, 128, 128, 128);
    h.addColorStop(0, 'rgba(255,255,255,0.35)'); h.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = h; x.fillRect(0, 0, 256, 256);
  });
}

const PLAIN_VERT = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';

/** Constellations: little figures of stars (azimuth, elevation in degrees) and the lines between them. */
const FIGURES: Array<{ at: [number, number]; stars: Array<[number, number]>; lines: Array<[number, number]> }> = [
  // The Two Wanderers: two bright stars and the golden thread between them.
  { at: [20, 62], stars: [[-5, 0], [5, 0.5], [0, 3.5]], lines: [[0, 2], [2, 1]] },
  // The Dipper.
  { at: [140, 48], stars: [[0, 0], [5, 1], [9, 0], [13, -1], [14, 4], [19, 5], [19, 0]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
  // The Hunter: shoulders, a belt of three, feet.
  { at: [230, 38], stars: [[-5, 8], [5, 8], [-1.5, 0], [0, 0.4], [1.5, 0.8], [-5, -8], [5, -7]], lines: [[0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6], [0, 1]] },
  // The Swan (a cross).
  { at: [300, 58], stars: [[0, 8], [0, 3], [0, -3], [0, -7], [-7, 1], [7, 2]], lines: [[0, 1], [1, 2], [2, 3], [4, 1], [1, 5]] },
  // The Lantern: a diamond with a tassel.
  { at: [80, 34], stars: [[0, 6], [4, 2], [0, -2], [-4, 2], [0, -5]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [2, 4]] },
  // The Crescent Boat.
  { at: [185, 70], stars: [[-7, 2], [-4, -1], [0, -2], [4, -1], [7, 2], [0, 5]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]] },
  // The Southern Cross.
  { at: [350, 30], stars: [[0, 6], [0, -5], [-4, 1], [3.5, 0], [2, -2.5]], lines: [[0, 1], [2, 3]] },
  // The Scorpion's hook.
  { at: [260, 22], stars: [[-10, 4], [-6, 2], [-3, 0], [0, -2], [2, -5], [5, -6], [8, -4], [8, -1]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]] },
];

export class SkyOrnaments {
  readonly group = new THREE.Group();
  private moons: THREE.Sprite[] = [];
  private planets = new THREE.Group();
  private planetMats: THREE.Material[] = [];
  private arcs: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>[] = [];
  private hex: THREE.InstancedMesh;
  private hexDirs: THREE.Vector3[] = [];
  private cons: THREE.Group = new THREE.Group();
  private consLines: THREE.LineSegments<THREE.BufferGeometry, THREE.LineBasicMaterial>;
  private consStars: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  private comet = new THREE.Group();
  private cometMats: Array<THREE.MeshBasicMaterial | THREE.SpriteMaterial> = [];
  private halo: THREE.Sprite;
  private dogs: THREE.Sprite[] = [];
  private isles = new THREE.Group();
  private isleSolid: THREE.MeshStandardMaterial;
  private isleGlow: THREE.MeshBasicMaterial;
  private falls: THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>;
  private mandala: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  private balloons: THREE.InstancedMesh;
  private balloonState = new Float32Array(12 * 5);
  private nlc: THREE.Mesh<THREE.CylinderGeometry, THREE.ShaderMaterial>;

  constructor() {
    const dot = tex(32, 32, (x) => { const g = x.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 32, 32); });

    // Sister moons.
    ([[0.9, 0.55, 330, 0.62], [2.6, 0.33, 210, 0.3], [4.3, 0.78, 150, 0.82]] as const).forEach(([az, el, size, ph], i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex(ph, i + 1), transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity: 0 }));
      s.scale.setScalar(size);
      s.position.copy(dir(az, el)).multiplyScalar(3050);
      s.renderOrder = -5;
      this.moons.push(s);
      this.group.add(s);
    });

    // Planets: a banded giant with rings, and two small worlds.
    const bands = (cols: string[]) => tex(64, 256, (x) => { for (let i = 0; i < 32; i++) { x.fillStyle = cols[(i * 7 + (i % 3)) % cols.length]; x.fillRect(0, i * 8, 64, 8 + (i % 2) * 3); } });
    const pm = (map: THREE.Texture) => { const m = new THREE.MeshLambertMaterial({ map, emissiveMap: map, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.45, fog: false, transparent: true, opacity: 0 }); this.planetMats.push(m); return m; };
    const giant = new THREE.Mesh(new THREE.SphereGeometry(150, 32, 20), pm(bands(['#f2d6a8', '#e0b27a', '#f7ecd6', '#c89a6a', '#e8c89a'])));
    const ringTex = tex(256, 256, (x) => { for (let r = 128; r > 70; r -= 2) { x.strokeStyle = `rgba(255,${230 - (r % 9) * 8},${190 - (r % 7) * 10},${0.25 + ((r * 37) % 10) / 20})`; x.lineWidth = 2; x.beginPath(); x.arc(128, 128, r, 0, Math.PI * 2); x.stroke(); } });
    const ringMat = new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, side: THREE.DoubleSide, depthWrite: false, fog: false, opacity: 0 });
    this.planetMats.push(ringMat);
    const ring = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), ringMat);
    ring.rotation.set(-1.2, 0.3, 0.2);
    const gp = new THREE.Group();
    gp.add(giant, ring);
    gp.position.copy(dir(5.2, 0.42)).multiplyScalar(2900);
    const small1 = new THREE.Mesh(new THREE.SphereGeometry(55, 20, 14), pm(bands(['#ff9ab8', '#ffc4d8', '#e87a9a'])));
    small1.position.copy(dir(5.75, 0.62)).multiplyScalar(2900);
    const small2 = new THREE.Mesh(new THREE.SphereGeometry(32, 16, 12), pm(bands(['#7ad8d0', '#4ab0c8', '#bff0e8'])));
    small2.position.copy(dir(4.75, 0.28)).multiplyScalar(2900);
    this.planets.add(gp, small1, small2);
    this.group.add(this.planets);

    // Extra rainbows round the horizon (moonbows at night).
    for (const [r, tube] of [[360, 16], [470, 18], [300, 12]] as const) {
      const m = new THREE.Mesh(rainbowGeometry(r, tube * 2.6), rainbowMaterial());
      m.frustumCulled = false;
      this.arcs.push(m);
      this.group.add(m);
    }

    // The golden hexagon canopy: a honeycomb of translucent tiles on a dome high above.
    const hexTex = tex(128, 128, (x) => {
      x.translate(64, 64);
      const path = (r: number) => { x.beginPath(); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; x.lineTo(Math.cos(a) * r, Math.sin(a) * r); } x.closePath(); };
      path(60); x.fillStyle = 'rgba(255,210,120,0.18)'; x.fill();
      x.lineWidth = 6; x.strokeStyle = 'rgba(255,225,150,0.95)'; path(58); x.stroke();
      x.lineWidth = 2; x.strokeStyle = 'rgba(255,245,210,0.6)'; path(44); x.stroke();
    });
    const tiles: THREE.Vector3[] = [];
    const N = 11, step = 0.105;
    for (let q = -N; q <= N; q++) for (let r = -N; r <= N; r++) {
      if (Math.abs(q + r) > N) continue;
      const u = (q + r / 2) * step, v = (r * Math.sqrt(3) / 2) * step;
      const d = Math.hypot(u, v);
      if (d > 0.95) continue;
      tiles.push(dir(Math.atan2(v, u), Math.PI / 2 - d));
    }
    this.hexDirs = tiles;
    this.hex = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 6), new THREE.MeshBasicMaterial({ map: hexTex, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, opacity: 0 }), tiles.length);
    tiles.forEach((d, i) => {
      const p = d.clone().multiplyScalar(1700);
      tmpQ.setFromRotationMatrix(tmpM.lookAt(p, new THREE.Vector3(), UP));
      this.hex.setMatrixAt(i, tmpM.compose(p, tmpQ, tmpS.setScalar(1700 * step * 0.56)));
      this.hex.setColorAt(i, tmpC.set('#ffd27a'));
    });
    this.hex.frustumCulled = false;
    this.group.add(this.hex);

    // Constellations.
    const lp: number[] = [], sp: number[] = [];
    for (const f of FIGURES) {
      const pts = f.stars.map(([dx, dy]) => dir(THREE.MathUtils.degToRad(f.at[0] + dx), THREE.MathUtils.degToRad(f.at[1] + dy)).multiplyScalar(3100));
      for (const p of pts) sp.push(p.x, p.y, p.z);
      for (const [a, b] of f.lines) lp.push(pts[a].x, pts[a].y, pts[a].z, pts[b].x, pts[b].y, pts[b].z);
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    this.consLines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: '#ffe6a8', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false }));
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
    this.consStars = new THREE.Points(sg, new THREE.PointsMaterial({ size: 34, map: dot, color: '#fff8e0', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, opacity: 0 }));
    this.cons.add(this.consLines, this.consStars);
    this.consLines.frustumCulled = this.consStars.frustumCulled = false;
    this.group.add(this.cons);

    // The comet: a bright head, a curving golden dust tail and a straight blue ion tail.
    const H = dir(3.6, 0.5).multiplyScalar(2800);
    const T = new THREE.Vector3().crossVectors(H.clone().normalize(), UP).normalize();
    const Nrm = new THREE.Vector3().crossVectors(T, H.clone().normalize()).normalize();
    const strip = (len: number, width: number, bend: number, col: string) => {
      const pos: number[] = [], uv: number[] = [], idx: number[] = [];
      const segs = 24;
      for (let i = 0; i <= segs; i++) {
        const k = i / segs;
        const c = H.clone().addScaledVector(T, len * k).addScaledVector(Nrm, bend * k * k * len);
        const w = width * (0.15 + k);
        for (const s of [-1, 1]) { const p = c.clone().addScaledVector(Nrm, s * w); pos.push(p.x, p.y, p.z); uv.push(s < 0 ? 0 : 1, k); }
        if (i < segs) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      g.setIndex(idx);
      const fade = tex(64, 256, (x) => { const gr = x.createLinearGradient(0, 0, 0, 256); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 256); const g2 = x.createLinearGradient(0, 0, 64, 0); g2.addColorStop(0, 'rgba(0,0,0,1)'); g2.addColorStop(0.5, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(0,0,0,1)'); x.globalCompositeOperation = 'destination-out'; x.fillStyle = g2; x.fillRect(0, 0, 64, 256); });
      fade.flipY = false;
      const mat = new THREE.MeshBasicMaterial({ map: fade, color: col, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, opacity: 0 });
      this.cometMats.push(mat);
      const mesh = new THREE.Mesh(g, mat);
      mesh.frustumCulled = false;
      return mesh;
    };
    const head = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot, color: '#eaf6ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, opacity: 0 }));
    this.cometMats.push(head.material);
    head.position.copy(H);
    head.scale.setScalar(110);
    this.comet.add(strip(900, 60, 0.18, '#ffe0a0'), strip(1100, 26, 0.02, '#8fd0ff'), head);
    this.group.add(this.comet);

    // The sun halo (22°) and its two sundogs.
    const ringT = tex(256, 256, (x) => { const g = x.createRadialGradient(128, 128, 96, 128, 128, 128); g.addColorStop(0, 'rgba(255,120,90,0)'); g.addColorStop(0.3, 'rgba(255,150,110,0.55)'); g.addColorStop(0.55, 'rgba(255,245,220,0.45)'); g.addColorStop(0.8, 'rgba(150,200,255,0.25)'); g.addColorStop(1, 'rgba(150,200,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); });
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
    this.halo.scale.setScalar(2 * 2500 * Math.tan(THREE.MathUtils.degToRad(22)) * 1.33);
    this.group.add(this.halo);
    const dogT = tex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,240,1)'); g.addColorStop(0.3, 'rgba(255,200,150,0.7)'); g.addColorStop(0.6, 'rgba(160,210,255,0.25)'); g.addColorStop(1, 'rgba(160,210,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
    for (let i = 0; i < 2; i++) {
      const d = new THREE.Sprite(new THREE.SpriteMaterial({ map: dogT, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, opacity: 0 }));
      d.scale.set(260, 200, 1);
      this.dogs.push(d);
      this.group.add(d);
    }

    // Floating islands with waterfalls, far off round the horizon.
    const g = new GeoBuilder(), glow = new GeoBuilder();
    const fallPos: number[] = [], fallUv: number[] = [], fallIdx: number[] = [];
    const places: Array<[number, number, number, number]> = [[0.4, 900, 230, 1], [2.1, 1100, 300, 1.4], [3.7, 800, 190, 0.8], [5.1, 1000, 270, 1.2]];
    places.forEach(([a, r, y, s], k) => {
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      g.frame(x, y, z, a, s * 5, () => {
        // A rocky root hanging beneath, with a ledge of earth under the grass.
        g.add(new THREE.ConeGeometry(8, 18, 9).rotateX(Math.PI).translate(0, -9.5, 0), '#6a4a7a');
        g.add(new THREE.ConeGeometry(4.5, 9, 7).rotateX(Math.PI).translate(2.5, -6, 1.5), '#7a5a8a');
        cyl(g, 8.2, 8.0, 1.5, '#8a6a4a', 0, -1.4, 0, 12);
        cyl(g, 8.3, 8, 1.2, '#7fcf6a', 0, 0, 0, 12);
        for (let i = 0; i < 5; i++) tree(g, (['pine', 'sakura', 'oak', 'crystal', 'cloud'] as const)[(i + k) % 5], Math.cos(i * 1.3) * 4.5, 1.2, Math.sin(i * 1.3) * 4.5, 1.1, () => (i * 0.37 + k * 0.21) % 1);
        cyl(g, 1.4, 1.8, 3, '#f2ecff', 2, 1.2, -2, 6);
        cone(g, 2.2, 2.4, '#e05a8a', 2, 4.2, -2, 6);
        for (let i = 0; i < 4; i++) sphere(glow, 0.7, ['#9ae8ff', '#ffb8f0', '#fff08a', '#b8ffb0'][i], Math.cos(i * 1.7 + 1) * 6, -8 - i * 3, Math.sin(i * 1.7 + 1) * 6, 5);
      });
      // A waterfall pouring off the edge, towards the camera side.
      const e = new THREE.Vector3(Math.cos(a) * (r - 8.3 * s * 5), y + 2, Math.sin(a) * (r - 8.3 * s * 5));
      const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(7 * s);
      const drop = 160 * s, base = fallPos.length / 3;
      for (const [sx, sy] of [[-1, 0], [1, 0], [-1.6, 1], [1.6, 1]] as const) {
        const p = e.clone().addScaledVector(side, sx).add(new THREE.Vector3(0, -drop * sy, 0));
        fallPos.push(p.x, p.y, p.z);
        fallUv.push(sx < 0 ? 0 : 1, sy);
      }
      fallIdx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    });
    this.isleSolid = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, fog: false, transparent: true, opacity: 0 });
    this.isleGlow = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false, transparent: true, opacity: 0 });
    const sm = g.build(this.isleSolid), gm = glow.build(this.isleGlow);
    if (sm) this.isles.add(sm);
    if (gm) this.isles.add(gm);
    const fg = new THREE.BufferGeometry();
    fg.setAttribute('position', new THREE.Float32BufferAttribute(fallPos, 3));
    fg.setAttribute('uv', new THREE.Float32BufferAttribute(fallUv, 2));
    fg.setIndex(fallIdx);
    this.falls = new THREE.Mesh(fg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false,
      uniforms: { t: { value: 0 }, strength: { value: 0 } }, vertexShader: PLAIN_VERT,
      fragmentShader: `uniform float t; uniform float strength; varying vec2 vUv;
        void main(){
          float streak = 0.55 + 0.45 * sin(vUv.x * 40.0 + sin(vUv.x * 13.0) * 2.0) * sin(vUv.y * 30.0 - t * 6.0 + vUv.x * 9.0);
          float edge = smoothstep(0.0, 0.2, vUv.x) * smoothstep(1.0, 0.8, vUv.x);
          float fade = 1.0 - smoothstep(0.55, 1.0, vUv.y);
          gl_FragColor = vec4(mix(vec3(0.75, 0.92, 1.0), vec3(1.0), streak), streak * edge * fade * strength * 0.85);
        }`,
    }));
    this.falls.frustumCulled = false;
    this.isles.add(this.falls);
    this.group.add(this.isles);

    // The girih: an eight-pointed star pattern in rings, gold and turquoise, turning overhead.
    const girih = tex(1024, 1024, (x) => {
      x.translate(512, 512);
      const star = (r: number, n: number, inner: number, col: string, w: number) => {
        x.beginPath();
        for (let i = 0; i <= n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * inner : r; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        x.strokeStyle = col; x.lineWidth = w; x.stroke();
      };
      for (const [r, inner, col] of [[500, 0.72, 'rgba(255,215,140,0.9)'], [420, 0.6, 'rgba(120,230,220,0.8)'], [330, 0.7, 'rgba(255,215,140,0.9)'], [230, 0.55, 'rgba(255,170,210,0.8)'], [140, 0.6, 'rgba(255,230,160,0.95)'], [70, 0.5, 'rgba(120,230,220,0.9)']] as const) star(r, 8, inner, col, 7);
      for (let k = 0; k < 16; k++) { x.save(); x.rotate((k / 16) * Math.PI * 2); x.translate(0, 380); star(38, 8, 0.55, 'rgba(255,225,160,0.85)', 4); x.restore(); }
      x.beginPath(); x.arc(0, 0, 505, 0, Math.PI * 2); x.strokeStyle = 'rgba(255,215,140,0.7)'; x.lineWidth = 6; x.stroke();
    });
    this.mandala = new THREE.Mesh(new THREE.PlaneGeometry(2600, 2600), new THREE.MeshBasicMaterial({ map: girih, transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false, toneMapped: false, opacity: 0 }));
    this.mandala.rotation.x = Math.PI / 2;
    this.mandala.position.y = 1500;
    this.mandala.frustumCulled = false;
    this.group.add(this.mandala);

    // Hot-air balloons: striped envelopes (the stripes are painted in vertex colours), skirt, basket.
    const env = new THREE.SphereGeometry(9, 16, 12).toNonIndexed();
    env.scale(1, 1.18, 1);
    const ep = env.getAttribute('position'), ec: number[] = [];
    for (let i = 0; i < ep.count; i++) { const a = Math.atan2(ep.getZ(i), ep.getX(i)); const s = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16) % 2 ? 1 : 0.62; ec.push(s, s, s); }
    env.setAttribute('color', new THREE.Float32BufferAttribute(ec, 3));
    const skirt = new THREE.CylinderGeometry(4, 2, 4, 12, 1, true).toNonIndexed().translate(0, -11.5, 0);
    const basket = new THREE.BoxGeometry(3, 2.2, 3).toNonIndexed().translate(0, -17, 0);
    const paint = (geo: THREE.BufferGeometry, c: number) => { geo.setAttribute('color', new THREE.Float32BufferAttribute(new Array(geo.getAttribute('position').count * 3).fill(c), 3)); return geo; };
    const merged = mergeAll([env, paint(skirt, 0.8), paint(basket, 0.28)]);
    this.balloons = new THREE.InstancedMesh(merged, new THREE.MeshLambertMaterial({ vertexColors: true, fog: false, transparent: true, opacity: 0 }), 12);
    for (let i = 0; i < 12; i++) this.balloonState.set([rnd(-450, 450), rnd(-450, 450), rnd(60, 190), rnd(0.8, 1.3), Math.random() * 10], i * 5);
    this.balloons.frustumCulled = false;
    this.group.add(this.balloons);

    // Night-shining clouds: electric-blue wisps in a band low round the horizon.
    const band = new THREE.CylinderGeometry(2750, 2750, 520, 72, 1, true);
    band.translate(0, 330, 0);
    this.nlc = new THREE.Mesh(band, new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { t: { value: 0 }, strength: { value: 0 } }, vertexShader: PLAIN_VERT,
      fragmentShader: `uniform float t; uniform float strength; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          vec2 p = vec2(vUv.x * 60.0 + t * 0.02, vUv.y * 5.0);
          float w = n(p) * 0.6 + n(p * 2.3 + 4.0) * 0.3 + n(vec2(p.x * 6.0, p.y * 14.0)) * 0.25;
          float ripples = 0.6 + 0.4 * sin(vUv.x * 900.0 + vUv.y * 40.0 + n(p * 3.0) * 6.0);
          float a = smoothstep(0.45, 0.85, w) * ripples * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.6, vUv.y);
          gl_FragColor = vec4(vec3(0.45, 0.8, 1.0) * a * strength * 0.6, 1.0);
        }`,
    }));
    this.nlc.frustumCulled = false;
    this.group.add(this.nlc);
  }

  update(dt: number, t: number, L: Record<SkyKind, number>, night: number, sunDir: THREE.Vector3, focus: THREE.Vector3, pal: THREE.Color[]): void {
    const day = 1 - night, dusk = 1 - smoothstep(0, 0.35, Math.abs(sunDir.y));
    this.group.position.set(focus.x, 0, focus.z);

    // Moons: bright at night, pale ghosts by day.
    this.moons.forEach((m, i) => {
      const s = L.moons * (0.55 + night * 0.45);
      m.visible = s > 0.01;
      m.material.opacity = s;
      m.material.color.copy(pal[(i + 1) % pal.length]).lerp(tmpC.set('#ffffff'), 0.55).multiplyScalar(1 + night * 0.4);
    });
    // Planets.
    {
      const s = L.planets * (0.6 + night * 0.4);
      this.planets.visible = s > 0.01;
      for (const m of this.planetMats) (m as THREE.MeshBasicMaterial).opacity = s;
      this.planets.children[0].rotation.y = t * 0.01;
    }
    // Rainbow arcs round the horizon: full colour by day, pale moonbows at night.
    {
      const s = L.rainbowArcs * (day * (1 - dusk * 0.5) + night * 0.8);
      const base = Math.atan2(-sunDir.z, -sunDir.x);
      this.arcs.forEach((m, i) => {
        m.visible = s > 0.01;
        m.material.uniforms.strength.value = s * (i === 0 ? 1 : 0.75);
        m.material.uniforms.pale.value = night;
        const a = base + [1.25, 2.6, -1.4][i], d = [1250, 1350, 1150][i];
        m.position.set(Math.cos(a) * d, focus.y - 70, Math.sin(a) * d);
        m.rotation.set(0, Math.atan2(-Math.cos(a), -Math.sin(a)), 0);
      });
    }
    // The hexagon canopy: a slow wave of light runs across the honeycomb.
    {
      const s = L.hexCanopy * (0.25 + night * 0.4);
      this.hex.visible = s > 0.01;
      (this.hex.material as THREE.MeshBasicMaterial).opacity = s * 0.9;
      if (this.hex.visible) {
        this.hexDirs.forEach((d, i) => {
          const w = 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin(t * 0.8 - (d.x * 3 + d.z * 2) * 4 + i * 0.02), 3);
          this.hex.setColorAt(i, tmpC.copy(pal[i % 2 ? 0 : 1]).lerp(GOLD, 0.6).multiplyScalar(w));
        });
        if (this.hex.instanceColor) this.hex.instanceColor.needsUpdate = true;
      }
    }
    // Constellations: the figures breathe softly after dark.
    {
      const s = L.constellations * Math.max(0.35, smoothstep(0.35, 0.85, night));
      this.cons.visible = s > 0.01;
      this.consLines.material.opacity = s * (0.45 + Math.sin(t * 0.7) * 0.15);
      this.consStars.material.opacity = s;
    }
    // The comet drifts across the night.
    {
      const s = L.comet * Math.max(0.4, smoothstep(0.3, 0.8, night));
      this.comet.visible = s > 0.01;
      for (const m of this.cometMats) m.opacity = s * 0.85;
      this.comet.rotation.y = t * 0.003;
    }
    // Sun halo and sundogs by day (strongest with the sun lower in the sky).
    {
      const s = L.sunHalo * day * (sunDir.y > 0 ? 1 : 0) * (0.5 + 0.5 * (1 - Math.min(1, sunDir.y * 1.4)));
      this.halo.visible = s > 0.01;
      this.halo.position.copy(sunDir).multiplyScalar(2500);
      this.halo.material.opacity = s * 0.8;
      const el = Math.asin(THREE.MathUtils.clamp(sunDir.y, -1, 1)), az = Math.atan2(sunDir.z, sunDir.x);
      this.dogs.forEach((d, i) => {
        d.visible = this.halo.visible;
        const off = THREE.MathUtils.degToRad(22) / Math.max(0.3, Math.cos(el)) * (i ? 1 : -1);
        d.position.copy(dir(az + off, el)).multiplyScalar(2450);
        d.material.opacity = s;
      });
    }
    // Islands bob on the air; their crystals glow at night; the waterfalls run.
    {
      const s = L.islands;
      this.isles.visible = s > 0.01;
      this.isleSolid.opacity = Math.min(1, s * 1.2);
      this.isleSolid.transparent = s < 0.99;
      this.isleGlow.opacity = s * (0.4 + night * 0.6);
      this.falls.material.uniforms.t.value = t;
      this.falls.material.uniforms.strength.value = s;
      this.isles.position.y = focus.y * 0.9 + Math.sin(t * 0.25) * 6;
    }
    // The girih turns slowly overhead: a whisper by day, glowing at night.
    {
      const s = L.mandala * (0.1 + night * 0.45);
      this.mandala.visible = s > 0.01;
      this.mandala.material.opacity = s;
      this.mandala.material.color.copy(pal[0]).lerp(tmpC.set('#ffffff'), 0.5);
      this.mandala.rotation.z = t * 0.01;
      this.mandala.position.y = focus.y + 1500;
    }
    // Balloons drift with the breeze by day, in the land's colours.
    {
      const s = L.balloons * smoothstep(0.2, 0.7, day);
      this.balloons.visible = s > 0.01;
      (this.balloons.material as THREE.MeshLambertMaterial).opacity = s;
      if (this.balloons.visible) {
        for (let i = 0; i < 12; i++) {
          const b = this.balloonState;
          b[i * 5] += dt * 1.6 * b[i * 5 + 3];
          b[i * 5 + 1] += dt * 0.7 * b[i * 5 + 3];
          for (const k of [0, 1]) { const f = k ? focus.z : focus.x; const v = b[i * 5 + k] - f; if (v > 460) b[i * 5 + k] -= 920; else if (v < -460) b[i * 5 + k] += 920; }
          const ph = b[i * 5 + 4];
          tmpV.set(b[i * 5] - focus.x, focus.y + b[i * 5 + 2] + Math.sin(t * 0.3 + ph) * 3, b[i * 5 + 1] - focus.z);
          tmpQ.setFromAxisAngle(UP, t * 0.05 + ph);
          this.balloons.setMatrixAt(i, tmpM.compose(tmpV, tmpQ, tmpS.setScalar(b[i * 5 + 3])));
          this.balloons.setColorAt(i, tmpC.copy(pal[i % pal.length]));
        }
        this.balloons.instanceMatrix.needsUpdate = true;
        if (this.balloons.instanceColor) this.balloons.instanceColor.needsUpdate = true;
      }
    }
    // Night-shining clouds: brightest in the deep blue after dusk.
    {
      const s = L.noctilucent * Math.max(dusk * (sunDir.y < 0.05 ? 1 : 0.2), night * 0.55);
      this.nlc.visible = s > 0.01;
      this.nlc.material.uniforms.t.value = t;
      this.nlc.material.uniforms.strength.value = s;
      this.nlc.position.y = focus.y - 90;
    }
  }
}

function mergeAll(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = [];
  for (const g of list) {
    g.computeVertexNormals();
    const p = g.getAttribute('position'), n = g.getAttribute('normal'), c = g.getAttribute('color');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.getX(i), c.getY(i), c.getZ(i));
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}
