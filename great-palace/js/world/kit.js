// A small building kit for the landmark areas: one merged mesh per material, with
// per-vertex colour so walls, roofs and rock of many styles share a few draw calls.
// Window walls use a light grey texture tinted by the vertex colour, with a glow
// map so the windows light up at night.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, glowBasic, additive } from './materials.js';
import { glowTexture, rng } from './textures.js';
import { MOOD } from './sky.js';

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function wallBase(g, w, h, course) {
  g.fillStyle = '#e9e6ea'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(80,60,90,0.16)'; g.lineWidth = 2;
  for (let y = course; y < h; y += course) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    for (let x = ((y / course) % 2) * course; x < w; x += course * 2) { g.beginPath(); g.moveTo(x, y - course); g.lineTo(x, y); g.stroke(); }
  }
}
// a round-headed window per tile, warm glass, stone surround
function roundWindows() {
  const [c, g] = canvas(128, 256), [e, ge] = canvas(128, 256);
  wallBase(g, 128, 256, 16);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, 128, 256);
  const win = (gg) => { gg.beginPath(); gg.moveTo(40, 200); gg.lineTo(40, 110); gg.arc(64, 110, 24, Math.PI, 0); gg.lineTo(88, 200); gg.closePath(); };
  win(g); g.fillStyle = '#5a3b4a'; g.fill();
  win(g); const lg = g.createLinearGradient(0, 86, 0, 200); lg.addColorStop(0, '#ffe7b8'); lg.addColorStop(1, '#ffae6a'); g.fillStyle = lg; g.save(); g.scale(1, 1); g.fill(); g.restore();
  g.strokeStyle = '#fafafa'; g.lineWidth = 6; win(g); g.stroke();
  g.fillStyle = '#d8d0d8'; g.fillRect(34, 200, 60, 8);
  g.strokeStyle = 'rgba(90,50,40,0.6)'; g.lineWidth = 2; g.beginPath(); g.moveTo(64, 88); g.lineTo(64, 200); g.moveTo(40, 150); g.lineTo(88, 150); g.stroke();
  win(ge); ge.fillStyle = '#ffffff'; ge.fill();
  return { map: tex(c), glow: tex(e) };
}
// tall pointed lancets with blue-violet glass (gothic)
function lancetWindows() {
  const [c, g] = canvas(128, 512), [e, ge] = canvas(128, 512);
  wallBase(g, 128, 512, 20);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, 128, 512);
  const win = (gg) => { gg.beginPath(); gg.moveTo(42, 440); gg.lineTo(42, 150); gg.quadraticCurveTo(42, 96, 64, 76); gg.quadraticCurveTo(86, 96, 86, 150); gg.lineTo(86, 440); gg.closePath(); };
  for (const [gg, glow] of [[g, false], [ge, true]]) {
    win(gg);
    const lg = gg.createLinearGradient(0, 76, 0, 440);
    lg.addColorStop(0, glow ? '#b9a8ff' : '#7f6cff'); lg.addColorStop(0.5, glow ? '#8fb0ff' : '#5c7cff'); lg.addColorStop(1, glow ? '#ffc8f0' : '#c86cd8');
    gg.fillStyle = lg; gg.fill();
    gg.strokeStyle = glow ? '#000' : '#2a1f3c'; gg.lineWidth = 3;
    for (let y = 120; y < 440; y += 40) { gg.beginPath(); gg.moveTo(42, y); gg.lineTo(86, y); gg.stroke(); }
    gg.beginPath(); gg.moveTo(64, 80); gg.lineTo(64, 440); gg.stroke();
  }
  g.strokeStyle = '#f4f0f8'; g.lineWidth = 6; win(g); g.stroke();
  return { map: tex(c), glow: tex(e) };
}
// cream plaster between dark timber frames, with a warm window (storybook, longhouse)
function timberWindows() {
  const [c, g] = canvas(128, 128), [e, ge] = canvas(128, 128);
  g.fillStyle = '#f2e6d4'; g.fillRect(0, 0, 128, 128);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, 128, 128);
  g.fillStyle = '#5a3a2c';
  g.fillRect(0, 0, 128, 8); g.fillRect(0, 120, 128, 8); g.fillRect(0, 0, 8, 128); g.fillRect(120, 0, 8, 128);
  g.save(); g.translate(64, 64);
  for (const s of [-1, 1]) { g.save(); g.rotate(s * 0.78); g.fillRect(-4, -84, 8, 168); g.restore(); }
  g.restore();
  for (const gg of [g, ge]) { gg.fillStyle = gg === g ? '#ffcf86' : '#fff'; gg.fillRect(40, 36, 48, 52); }
  g.fillStyle = '#5a3a2c'; g.fillRect(62, 36, 4, 52); g.fillRect(40, 60, 48, 4);
  g.strokeStyle = '#5a3a2c'; g.lineWidth = 6; g.strokeRect(40, 36, 48, 52);
  return { map: tex(c), glow: tex(e) };
}
// three arcade orders and an attic: the colosseum facade, one bay per tile
function arcadeOrders() {
  const [c, g] = canvas(128, 512), [e, ge] = canvas(128, 512);
  g.fillStyle = '#e6d2b0'; g.fillRect(0, 0, 128, 512);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, 128, 512);
  g.fillStyle = 'rgba(120,90,60,0.25)';
  for (let y = 0; y < 512; y += 8) g.fillRect(0, y, 128, 1);
  // attic at the top (v 1) with small windows; three arcade tiers below
  for (let k = 0; k < 3; k++) {
    const y0 = 128 + k * 128;
    const arch = (gg) => { gg.beginPath(); gg.moveTo(30, y0 + 120); gg.lineTo(30, y0 + 52); gg.arc(64, y0 + 52, 34, Math.PI, 0); gg.lineTo(98, y0 + 120); gg.closePath(); };
    arch(g);
    if (k === 2) { const lg = g.createLinearGradient(0, y0 + 20, 0, y0 + 120); lg.addColorStop(0, '#ffd9a0'); lg.addColorStop(1, '#ff9c5a'); g.fillStyle = lg; }
    else g.fillStyle = '#2a1d33';
    g.fill();
    if (k === 2) { arch(ge); ge.fillStyle = '#fff'; ge.fill(); }
    g.fillStyle = '#d9c19a'; g.fillRect(0, y0 + 2, 128, 10); g.fillRect(4, y0, 14, 128); g.fillRect(110, y0, 14, 128);
  }
  for (const gg of [g, ge]) { gg.fillStyle = gg === g ? '#ffc98a' : '#fff'; gg.fillRect(52, 50, 24, 30); }
  g.fillStyle = '#d0b48a'; g.fillRect(0, 0, 128, 12); g.fillRect(0, 116, 128, 10);
  return { map: tex(c), glow: tex(e) };
}
// clay tiles in grey, tinted by the vertex colour
function tileRoof() {
  const [c, g] = canvas(128, 128);
  g.fillStyle = '#d8d8d8'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = 'rgba(0,0,0,0.22)'; g.lineWidth = 2;
  for (let y = 6; y < 128; y += 10) for (let x = (y / 10) % 2 ? 0 : 6; x < 128 + 12; x += 12) { g.beginPath(); g.arc(x, y, 6, 0, Math.PI); g.stroke(); }
  return tex(c);
}
// a round rose window of blue-violet glass with gold tracery
export function roseWindowTexture() {
  const S = 256, [c, g] = canvas(S, S);
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  g.translate(S / 2, S / 2);
  const cols = ['#5b6cff', '#8f6cff', '#3b48d8', '#c58cff', '#6fb4ff', '#ff9ad8'];
  for (let ring = 4; ring >= 1; ring--) {
    const n = ring * 8, r = ring * 30;
    for (let i = 0; i < n; i++) {
      g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, r, (i / n) * Math.PI * 2, ((i + 1) / n) * Math.PI * 2); g.closePath();
      g.fillStyle = cols[(i + ring) % cols.length]; g.fill();
    }
  }
  g.strokeStyle = '#ffd36a'; g.lineWidth = 4;
  for (let ring = 1; ring <= 4; ring++) { g.beginPath(); g.arc(0, 0, ring * 30, 0, Math.PI * 2); g.stroke(); }
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); g.lineTo(Math.cos(a) * 120, Math.sin(a) * 120); g.stroke(); }
  g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(0, 0, 14, 0, Math.PI * 2); g.fill();
  const t = tex(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}

// --- geometry --------------------------------------------------------------------
const WHITE = new THREE.Color(1, 1, 1);
const tmpC = new THREE.Color();
export class Kit {
  constructor() { this.parts = {}; this.m = new THREE.Matrix4(); this.ry = 0; this.o = new THREE.Vector3(); this.glows = []; }
  // the local frame that following parts are placed in
  frame(x = 0, y = 0, z = 0, ry = 0) {
    this.m.makeRotationY(ry).setPosition(x, y, z); this.ry = ry; this.o.set(x, y, z);
    return this;
  }
  world(lx, ly, lz) { return new THREE.Vector3(lx, ly, lz).applyMatrix4(this.m); }
  // `grad`: a colour for the foot of the piece, blending up to `color` at its head (rose marble)
  add(key, g, color = WHITE, grad = null) {
    g = g.index ? g.toNonIndexed() : g;
    const shade = g.attributes.shade;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    tmpC.set(color);
    if (grad) {
      const lo = new THREE.Color(grad), pos = g.attributes.position;
      let y0 = Infinity, y1 = -Infinity; for (let i = 0; i < n; i++) { const y = pos.getY(i); if (y < y0) y0 = y; if (y > y1) y1 = y; }
      for (let i = 0; i < n; i++) {
        const t = Math.pow(Math.min(1, (pos.getY(i) - y0) / Math.max(1e-6, y1 - y0)), 0.7), k = shade ? shade.getX(i) : 1;
        col[i * 3] = (lo.r + (tmpC.r - lo.r) * t) * k; col[i * 3 + 1] = (lo.g + (tmpC.g - lo.g) * t) * k; col[i * 3 + 2] = (lo.b + (tmpC.b - lo.b) * t) * k;
      }
    } else for (let i = 0; i < n; i++) { const k = shade ? shade.getX(i) : 1; col[i * 3] = tmpC.r * k; col[i * 3 + 1] = tmpC.g * k; col[i * 3 + 2] = tmpC.b * k; }
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.applyMatrix4(this.m);
    (this.parts[key] ||= []).push(g);
    return g;
  }
  glow(lx, ly, lz, size) { const p = this.world(lx, ly, lz); this.glows.push([p.x, p.y, p.z, size]); }
  build(materials, group, prefix = 'kit') {
    for (const [key, list] of Object.entries(this.parts)) {
      const mesh = new THREE.Mesh(mergeGeometries(list), materials[key]);
      mesh.name = prefix + '-' + key;
      mesh.castShadow = mesh.receiveShadow = key !== 'glow';
      group.add(mesh);
    }
  }
}
export const scaleUV = (g, su, sv) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; };
export function box(w, h, d, x = 0, y = 0, z = 0) { return new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z); }
export function cyl(rt, rb, h, seg, x = 0, y = 0, z = 0, open = false) { return new THREE.CylinderGeometry(rt, rb, h, seg, 1, open).translate(x, y + h / 2, z); }
// an open tower body whose window texture tiles every tileW by tileH metres
export function body(r, h, seg, x = 0, y = 0, z = 0, tileW = 7, tileH = 10, rb = r) {
  const g = new THREE.CylinderGeometry(r, rb, h, seg, 1, true).translate(x, y + h / 2, z);
  return scaleUV(g, Math.max(1, Math.round((Math.PI * 2 * r) / tileW)), Math.max(1, Math.round(h / tileH)));
}
// a box with window-tiled sides and blank top and bottom
export function wallBox(w, h, d, x = 0, y = 0, z = 0, tileW = 7, tileH = 10) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    if (f === 2 || f === 3) { uv.setXY(i, 0.02, 0.02); continue; }
    const across = f < 2 ? d : w;
    uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(across / tileW)), uv.getY(i) * Math.max(1, Math.round(h / tileH)));
  }
  return g.translate(x, y + h / 2, z);
}
export const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
export function cap(kind, r, h, seg = 16) {
  if (kind === 'onion') return lathe([[r * 0.82, 0], [r * 1.0, h * 0.12], [r * 1.08, h * 0.3], [r * 0.95, h * 0.5], [r * 0.6, h * 0.7], [r * 0.25, h * 0.86], [r * 0.08, h * 0.95], [0, h]], seg);
  if (kind === 'witch') return lathe([[r * 1.18, 0], [r * 0.95, h * 0.08], [r * 0.6, h * 0.3], [r * 0.32, h * 0.58], [r * 0.12, h * 0.84], [0, h]], seg);
  if (kind === 'dome') return lathe([[r, 0], [r * 0.97, h * 0.25], [r * 0.87, h * 0.5], [r * 0.66, h * 0.75], [r * 0.36, h * 0.93], [0, h]], seg);
  return lathe([[r * 1.1, 0], [0, h]], seg);
}
// an East-Asian roof: square in plan, concave, with upturned eaves
export function curvedRoof(half, h) {
  const R = half * Math.SQRT2;
  return lathe([[R * 1.06, h * 0.1], [R, 0], [R * 0.82, h * 0.1], [R * 0.6, h * 0.36], [R * 0.42, h * 0.7], [R * 0.3, h], [0, h]], 4).rotateY(Math.PI / 4);
}
// a gable roof: ridge along local z, span w, rise h, length d
export function gable(w, h, d, x = 0, y = 0, z = 0, overhang = 0.6) {
  const s = new THREE.Shape([new THREE.Vector2(-w / 2 - overhang, -overhang * h / w * 2), new THREE.Vector2(w / 2 + overhang, -overhang * h / w * 2), new THREE.Vector2(0, h)]);
  const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false });
  return scaleUV(g.translate(0, 0, -d / 2), 0.15, 0.15).translate(x, y, z);
}
// a pointed or round arch shape
export function archShape(w, h, pointed = true) {
  const s = new THREE.Shape(), hw = w / 2;
  s.moveTo(-hw, 0); s.lineTo(hw, 0);
  if (pointed) {
    const hs = Math.max(0, h - w * 0.866);
    s.lineTo(hw, hs); s.absarc(-hw, hs, w, 0, Math.PI / 3, false); s.absarc(hw, hs, w, (2 * Math.PI) / 3, Math.PI, false);
  } else {
    const hs = Math.max(0, h - hw);
    s.lineTo(hw, hs); s.absarc(0, hs, hw, 0, Math.PI, false);
  }
  s.lineTo(-hw, 0);
  return s;
}
// rough rock along a curve: a tube with lumps, thicker towards its feet
export function rockArch(curve, radius, seg = 48, radial = 10, seed = 1) {
  const g = new THREE.TubeGeometry(curve, seg, radius, radial, false), p = g.attributes.position;
  const c = new THREE.Vector3(), r = rng(seed);
  const bumps = Array.from({ length: 9 }, () => [r() * 6, r() * 6, r() * 6]);
  for (let i = 0; i < p.count; i++) {
    const t = Math.floor(i / (radial + 1)) / seg;
    curve.getPointAt(Math.min(1, t), c);
    const dx = p.getX(i) - c.x, dy = p.getY(i) - c.y, dz = p.getZ(i) - c.z;
    const foot = 1 + 0.9 * Math.pow(Math.abs(t - 0.5) * 2, 4);
    let f = 1;
    const X = p.getX(i), Y = p.getY(i), Z = p.getZ(i);
    for (const [a, b, q] of bumps) f += 0.06 * Math.sin((X + Z) * 0.07 * (1 + a * 0.3) + b) * Math.sin(Y * 0.08 * (1 + q * 0.2) + a);
    f += 0.05 * Math.sin(Y * 0.9 + X * 0.3);                  // rock strata
    p.setXYZ(i, c.x + dx * foot * f, c.y + dy * foot * f * 1.25, c.z + dz * foot * f);
  }
  g.computeVertexNormals();
  // band the rock in lighter and darker strata, read through the vertex colour
  const n = p.count, col = new Float32Array(n * 3), cc = new THREE.Color();
  for (let i = 0; i < n; i++) { const k = 0.82 + 0.18 * Math.sin(p.getY(i) * 0.45 + Math.sin(p.getX(i) * 0.05) * 2); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = k; }
  g.setAttribute('shade', new THREE.Float32BufferAttribute(col, 3));
  return g;
}

// --- materials ---------------------------------------------------------------------
export function kitMaterials() {
  const rw = roundWindows(), lw = lancetWindows(), tw = timberWindows(), ao = arcadeOrders();
  const win = (t, emissive) => toon('#ffffff', { map: t.map, emissiveMap: t.glow, emissive, emissiveIntensity: 0.6, vertexColors: true });
  const mats = {
    win: win(rw, '#ffb36a'),
    lancet: win(lw, '#a99bff'),
    timber: win(tw, '#ffb36a'),
    arcade: win(ao, '#ffae6a'),
    plain: toon('#ffffff', { vertexColors: true, emissive: '#2a1a3a', emissiveIntensity: 0.3 }),
    cloth: toon('#ffffff', { vertexColors: true, emissive: '#3a1a2a', emissiveIntensity: 0.4, side: THREE.DoubleSide }),
    roof: toon('#ffffff', { map: tileRoof(), vertexColors: true, emissive: '#2a1030', emissiveIntensity: 0.3 }),
    gold: toon('#e8b84a', { emissive: '#6a4a10', emissiveIntensity: 0.8 }),
    glow: glowBasic('#ffffff', { vertexColors: true }),
    rose: new THREE.MeshBasicMaterial({ map: roseWindowTexture(), toneMapped: false }),
    beam: additive('#8ff4ff', { opacity: 0.35, side: THREE.DoubleSide }),
  };
  mats.update = () => {
    const n = MOOD.night.value;
    for (const k of ['win', 'lancet', 'timber', 'arcade']) mats[k].emissiveIntensity = 0.3 + 0.75 * n;
    mats.rose.color.setScalar(0.6 + 0.45 * n);
  };
  return mats;
}

// --- water ----------------------------------------------------------------------------
// still or flowing water for rivers, pools and falls; uFlow > 0 streams along v
export function waterMaterial(flow = 0, fall = false, pool = false) {
  return new THREE.ShaderMaterial({
    transparent: fall, depthWrite: !fall, side: THREE.DoubleSide,
    uniforms: { uTime: { value: 0 }, uNight: MOOD.night, uFlow: { value: flow } },
    vertexShader: 'varying vec2 vUv; varying vec3 vW; void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position,1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uNight; uniform float uFlow; varying vec2 vUv; varying vec3 vW;
      void main(){
        ${fall ? `
        float s = sin(vUv.x * 60. + sin(vUv.x * 13.) * 3.) * .5 + .5;
        float st = fract(vUv.y * .08 + uTime * 1.6 + s * .3);
        vec3 c = mix(vec3(.75, .9, 1.), vec3(.5, .78, 1.), uNight) * (.75 + .35 * smoothstep(.4, 1., st));
        ${pool ? 'c = mix(c, vec3(1.), .25 * smoothstep(.85, 1., st));' : ''}
        gl_FragColor = vec4(pow(c, vec3(2.2)), ${pool ? '.93' : '.78'});
        ` : `
        vec2 q = vW.xz;
        float rip = sin(q.x * .3 + vUv.y * 2. - uTime * uFlow * 3.) * sin(q.y * .27 + uTime * .7) * .5 + .5;
        vec3 v = normalize(vW - cameraPosition);
        float fres = pow(1. - abs(v.y), 2.);
        ${pool ? `
        // palace pools (L02-7, sheet 03): clear turquoise over pale marble, bright caustic ripples
        float rip2 = sin(q.x * .9 - uTime * 1.3 + sin(q.y * .7)) * sin(q.y * .8 + uTime * 1.1 + sin(q.x * .5)) * .5 + .5;
        vec3 deep = mix(vec3(.22, .6, .84), vec3(.1, .22, .5), uNight);
        vec3 sky = mix(vec3(.72, .92, 1.), vec3(.35, .4, .7), uNight);
        vec3 c = mix(deep, sky, .25 + .45 * fres) + vec3(1.) * (smoothstep(.8, 1., rip) * .18 + smoothstep(.86, 1., rip2) * .22);` : `
        vec3 deep = mix(vec3(.16, .2, .42), vec3(.07, .09, .26), uNight);
        vec3 sky = mix(vec3(.62, .45, .66), vec3(.3, .24, .55), uNight);
        vec3 c = mix(deep, sky, .3 + .5 * fres) + vec3(.8, .7, .95) * smoothstep(.75, 1., rip) * .12;`}
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.);
        `}
        #include <colorspace_fragment>
      }`,
  });
}
// a flat ribbon along line samples, y from each sample, half width hw
export function ribbonAlong(samples, hw, yOf, step = 1) {
  const pos = [], uv = [];
  let s = 0;
  for (let i = 0; i + step < samples.length; i += step) {
    const a = samples[i], b = samples[Math.min(samples.length - 1, i + step)];
    const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    const ya = yOf(a), yb = yOf(b);
    const A1 = [a.x + nx * hw, ya, a.z + nz * hw], A2 = [a.x - nx * hw, ya, a.z - nz * hw], B1 = [b.x + nx * hw, yb, b.z + nz * hw], B2 = [b.x - nx * hw, yb, b.z - nz * hw];
    pos.push(...A1, ...B2, ...A2, ...A1, ...B1, ...B2);
    uv.push(0, s, 1, s + l, 1, s, 0, s, 0, s + l, 1, s + l);
    s += l;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// halos over lamps and spire tips
export function haloPoints(glows, tint = [1, 0.8, 0.9]) {
  const hp = new THREE.BufferGeometry();
  hp.setAttribute('position', new THREE.Float32BufferAttribute(glows.flatMap(([x, y, z]) => [x, y, z]), 3));
  hp.setAttribute('size', new THREE.Float32BufferAttribute(glows.map((q) => q[3]), 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uMap: { value: glowTexture() }, uNight: MOOD.night, uTime: { value: 0 } },
    vertexShader: 'attribute float size; uniform float uTime; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * 700. * (1. + .08 * sin(uTime * 2. + position.y)) / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: `uniform sampler2D uMap; uniform float uNight; void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(${tint.join(',')}) * a * (.3 + .6 * uNight), 1.); }`,
  });
  const pts = new THREE.Points(hp, mat);
  pts.frustumCulled = false;
  return pts;
}
