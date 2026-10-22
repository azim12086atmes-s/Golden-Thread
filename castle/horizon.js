// Painted distant mountains (reference T2): three silhouette bands around the
// horizon, each paler and bluer than the one in front, rising out of the sea of
// clouds. Three draw calls give the "vast world" feeling of Ghibli backdrops.
import * as THREE from 'three';
import { rng } from './textures.js';
import { MOOD } from './sky.js';

function ridgeTexture(seed, roughness, peaks) {
  const W = 2048, H = 256;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const r = rng(seed);
  // midpoint-displacement ridge line that wraps seamlessly
  let pts = [0.55, 0.55];
  let amp = 0.35;
  while (pts.length < 513) {
    const next = [];
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(pts[i], (pts[i] + pts[i + 1]) / 2 + (r() - 0.5) * amp);
    }
    next.push(pts[pts.length - 1]);
    pts = next; amp *= roughness;
  }
  // a few taller peaks
  for (let k = 0; k < peaks; k++) {
    const at = Math.floor(r() * pts.length), w = 20 + r() * 40, hgt = 0.15 + r() * 0.25;
    for (let i = -w; i <= w; i++) {
      const j = (at + i + pts.length) % pts.length;
      pts[j] -= hgt * Math.pow(1 - Math.abs(i) / w, 1.6);
    }
  }
  const y = (i) => Math.min(0.92, Math.max(0.05, pts[i])) * H;
  // red channel: brightness (sunlit near the ridge, cooler lower down)
  const grd = g.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.45, '#9a9a9a'); grd.addColorStop(1, '#555555');
  g.fillStyle = grd;
  g.beginPath(); g.moveTo(0, H);
  for (let i = 0; i < pts.length; i++) g.lineTo((i / (pts.length - 1)) * W, y(i));
  g.lineTo(W, H); g.closePath(); g.fill();
  // painterly vertical strokes for gullies and forest texture
  g.globalCompositeOperation = 'source-atop';
  for (let i = 0; i < 900; i++) {
    const x = r() * W, yy = H * (0.2 + r() * 0.8);
    g.strokeStyle = `rgba(${r() < 0.5 ? '255,255,255' : '40,40,40'},0.12)`;
    g.lineWidth = 2 + r() * 5;
    g.beginPath(); g.moveTo(x, yy); g.lineTo(x + (r() - 0.5) * 20, yy + 20 + r() * 50); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

const LAYERS = [
  { R: 860, H: 260, y: -110, seed: 3, rough: 0.55, peaks: 6, dusk: [0.93, 0.74, 0.80], night: [0.19, 0.17, 0.38], repeat: 2 },
  { R: 760, H: 210, y: -110, seed: 9, rough: 0.6, peaks: 5, dusk: [0.80, 0.60, 0.74], night: [0.14, 0.13, 0.31], repeat: 3 },
  { R: 660, H: 160, y: -105, seed: 21, rough: 0.62, peaks: 4, dusk: [0.64, 0.48, 0.66], night: [0.10, 0.10, 0.25], repeat: 3 },
];

export function createHorizon(scene) {
  const group = new THREE.Group();
  LAYERS.forEach((L, i) => {
    const map = ridgeTexture(L.seed, L.rough, L.peaks);
    map.repeat.x = L.repeat;
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
      uniforms: { uMap: { value: map }, uNight: MOOD.night, uDusk: { value: new THREE.Vector3(...L.dusk) }, uNightCol: { value: new THREE.Vector3(...L.night) }, uRepeat: { value: L.repeat } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: /* glsl */`
        uniform sampler2D uMap; uniform float uNight; uniform vec3 uDusk; uniform vec3 uNightCol; uniform float uRepeat; varying vec2 vUv;
        void main(){
          vec4 t = texture2D(uMap, vec2(vUv.x * uRepeat, vUv.y));
          if (t.a < 0.02) discard;
          vec3 base = mix(uDusk, uNightCol, uNight);
          vec3 lit = mix(vec3(1.0, 0.86, 0.72), vec3(0.75, 0.82, 1.0), uNight);   // sun- or moon-lit ridges
          vec3 col = base * (0.78 + 0.32 * t.r) + lit * pow(t.r, 6.) * 0.12;
          float fade = smoothstep(0.0, 0.35, vUv.y);                               // dissolve into the clouds
          gl_FragColor = vec4(col, t.a * fade);
        }
      `,
    });
    const geo = new THREE.CylinderGeometry(L.R, L.R, L.H, 96, 1, true);
    const m = new THREE.Mesh(geo, mat);
    m.position.y = L.y + L.H / 2;
    m.rotation.y = i * 1.3;
    m.renderOrder = -9 + i;
    m.frustumCulled = false;
    group.add(m);
  });
  // painted ranges far beyond the walkable land and its mountain rim
  group.scale.set(3.6, 4, 3.6);
  scene.add(group);
  return group;
}

