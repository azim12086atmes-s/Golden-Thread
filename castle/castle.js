// The Birthday Castle v3 (world-layout.md section 5, after U402): three towering
// arcaded levels with white ring walkways climb from the stair foot to a 200 m
// front wall and a 100 m opening gate of fractured blue, gold and violet glass.
// Behind it an uneven princess-castle crown: a wide tower under a 30 m onion
// dome joined to a taller gothic cone tower, more joined towers stepping down on
// both sides, and four different courtyard towers rising from the crag top.
// Everything static is merged into one mesh per material.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, glowBasic, additive } from './materials.js';
import { glowTexture, rng } from './textures.js';
import { CASTLE, TERRACES, TERRACE_REAR, TERRACE_R, STAIR, stairHW, COURT_TOWERS, addCollider } from './layout.js';
import { MOOD } from './sky.js';

const GX = CASTLE.x, GZ = CASTLE.z, SILL = CASTLE.y, BASE = CASTLE.base;
const GATE_W = 56, GATE_H = 100;
// v4 crown (Oct 11): a 308 m front wall 125 m tall, with great pointed windows at
// 75% of the gate (42 m by 75 m), two each side of the gate
export const CROWN = { wallHW: 154, wallH: 125, frameHW: 40, gableSide: 145, gableTop: 172, winW: 42, winH: 75, winY: 18, winX: [74, 126] };

// --- shared shape helpers (also used by the island arches) -----------------------
export function pointedArchShape(w, h, shape = new THREE.Shape()) {
  const hw = w / 2;
  const hs = Math.max(0, h - w * 0.866);
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, hs);
  shape.absarc(-hw, hs, w, 0, Math.PI / 3, false);
  shape.absarc(hw, hs, w, (2 * Math.PI) / 3, Math.PI, false);
  shape.lineTo(-hw, 0);
  return shape;
}

export function pointedArchPath(w, h) {
  const hw = w / 2, hs = Math.max(0, h - w * 0.866);
  const pts = [new THREE.Vector3(-hw, 0, 0), new THREE.Vector3(-hw, hs, 0)];
  for (let i = 1; i <= 12; i++) { const a = Math.PI - (i / 12) * (Math.PI / 3); pts.push(new THREE.Vector3(hw + Math.cos(a) * w, hs + Math.sin(a) * w, 0)); }
  for (let i = 1; i <= 12; i++) { const a = Math.PI / 3 - (i / 12) * (Math.PI / 3); pts.push(new THREE.Vector3(-hw + Math.cos(a) * w, hs + Math.sin(a) * w, 0)); }
  pts.push(new THREE.Vector3(hw, 0, 0));
  return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
}

export function archFrameGeometry(w, h, thick, depth) {
  const outer = pointedArchShape(w + thick * 2, h + thick * 1.2);
  outer.holes.push(new THREE.Path(pointedArchShape(w, h).getPoints(24)));
  const g = new THREE.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, -depth / 2);
  return g;
}

// --- textures ---------------------------------------------------------------------
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function lancet(g, x, y, w, h) {
  g.beginPath();
  g.moveTo(x, y + h); g.lineTo(x, y + w * 0.6);
  g.quadraticCurveTo(x, y, x + w / 2, y - w * 0.25);
  g.quadraticCurveTo(x + w, y, x + w, y + w * 0.6);
  g.lineTo(x + w, y + h); g.closePath();
}
// flowing multicolour glass: rose, gold, teal, violet and blue melting together, wavy lead lines
function flowingGlass(g, x, y, w, h, seed) {
  const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h);
  const cols = ['#ff6fa8', '#ffcf5a', '#4fe0cf', '#a46cff', '#5c8cff', '#ff7fd0'];
  for (let i = 0; i < 6; i++) gr.addColorStop(i / 5, cols[(i + seed) % 6]);
  g.fillStyle = gr; g.fill();
  g.save(); g.clip();
  g.strokeStyle = 'rgba(40,10,50,0.55)'; g.lineWidth = 2;
  for (let k = 0; k < 9; k++) {
    g.beginPath();
    for (let j = 0; j <= 20; j++) { const yy = y + (k / 8) * h + Math.sin(j * 0.6 + k + seed) * 6, xx = x + (j / 20) * w; j ? g.lineTo(xx, yy) : g.moveTo(xx, yy); }
    g.stroke();
  }
  g.restore();
}
// blush walls with one tall lancet window per tile; a matching glow map
function windowWall() {
  const [c, g] = canvas(256, 512), [e, ge] = canvas(256, 512);
  const bg = g.createLinearGradient(0, 0, 256, 0);
  bg.addColorStop(0, '#d99ab3'); bg.addColorStop(0.5, '#eebfd0'); bg.addColorStop(1, '#d99ab3');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = 'rgba(150,70,110,0.18)'; g.lineWidth = 2;
  for (let y = 16; y < 512; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); }
  ge.fillStyle = '#000'; ge.fillRect(0, 0, 256, 512);
  for (const [gg, glow] of [[g, false], [ge, true]]) {
    lancet(gg, 84, 70, 88, 380);
    flowingGlass(gg, 84, 50, 88, 400, 1);
    lancet(gg, 84, 70, 88, 380); gg.lineWidth = 7; gg.strokeStyle = glow ? '#000' : '#e2b24c'; gg.stroke();
  }
  return { map: tex(c), glow: tex(e) };
}
// blush ashlar with a faint girih lattice, for the front wall between its great windows
function ashlarWall() {
  const [c, g] = canvas(256, 256), [e, ge] = canvas(8, 8);
  const bg = g.createLinearGradient(0, 0, 256, 0);
  bg.addColorStop(0, '#dc9fb7'); bg.addColorStop(0.5, '#ecbccd'); bg.addColorStop(1, '#dc9fb7');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(150,70,110,0.2)'; g.lineWidth = 2;
  for (let y = 0; y < 256; y += 32) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke();
    for (let x = (y / 32) % 2 ? 0 : 64; x < 256; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
  }
  g.strokeStyle = 'rgba(255,235,245,0.22)'; g.lineWidth = 3;
  for (let k = -256; k < 512; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 256); g.stroke(); g.beginPath(); g.moveTo(k + 256, 0); g.lineTo(k, 256); g.stroke(); }
  ge.fillStyle = '#000'; ge.fillRect(0, 0, 8, 8);
  return { map: tex(c), glow: tex(e) };
}
// one great window's glass: flowing colour behind a tracery of two lights and a rose
export function greatGlass() {
  const [c, g] = canvas(256, 512);
  g.beginPath(); g.rect(0, 0, 256, 512);
  flowingGlass(g, 0, 0, 256, 512, 3);
  g.strokeStyle = 'rgba(40,10,50,0.5)'; g.lineWidth = 3;
  for (let x = 0; x < 256; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 512); g.stroke(); }
  return tex(c);
}
// one level's arcade: a tall round-headed arch lit peach from within
function arcadeWall() {
  const [c, g] = canvas(128, 256), [e, ge] = canvas(128, 256);
  g.fillStyle = '#e3a6bd'; g.fillRect(0, 0, 128, 256);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, 0, 128, 14);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, 128, 256);
  for (const gg of [g, ge]) {
    gg.beginPath(); gg.moveTo(30, 236); gg.lineTo(30, 92); gg.arc(64, 92, 34, Math.PI, 0); gg.lineTo(98, 236); gg.closePath();
    const lg = gg.createLinearGradient(0, 60, 0, 236); lg.addColorStop(0, '#ffe2c8'); lg.addColorStop(1, '#ffa98a');
    gg.fillStyle = lg; gg.fill();
  }
  g.strokeStyle = '#fff1f6'; g.lineWidth = 5; g.beginPath(); g.moveTo(26, 238); g.lineTo(26, 92); g.arc(64, 92, 38, Math.PI, 0); g.lineTo(102, 238); g.stroke();
  return { map: tex(c), glow: tex(e) };
}
// the gate glass: a broken-glass mosaic of blue, yellow and violet triangles
function gateGlass() {
  const W = 512, H = 1024, [c, g] = canvas(W, H), r = rng(402);
  const cols = ['#2440d8', '#3a66ff', '#1b2a9a', '#ffd84a', '#f2b22a', '#ffe98a', '#7d3fe0', '#a77bff', '#5a2cb8', '#4b8bff'];
  const nx = 12, ny = 26, P = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) {
    const edge = i === 0 || j === 0 || i === nx || j === ny;
    P.push([(i + (edge ? 0 : (r() - 0.5) * 0.8)) * W / nx, (j + (edge ? 0 : (r() - 0.5) * 0.8)) * H / ny]);
  }
  const at = (i, j) => P[j * (nx + 1) + i];
  g.lineWidth = 3; g.strokeStyle = '#1a0f2e';
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const a = at(i, j), b = at(i + 1, j), d = at(i, j + 1), e = at(i + 1, j + 1);
    for (const t of r() < 0.5 ? [[a, b, e], [a, e, d]] : [[a, b, d], [b, e, d]]) {
      g.beginPath(); g.moveTo(...t[0]); g.lineTo(...t[1]); g.lineTo(...t[2]); g.closePath();
      g.fillStyle = cols[Math.floor(r() * cols.length)]; g.fill(); g.stroke();
    }
  }
  // warm light from the hall brightens the middle
  g.globalCompositeOperation = 'lighter';
  const rg = g.createRadialGradient(W / 2, H * 0.62, 10, W / 2, H * 0.62, W * 0.7);
  rg.addColorStop(0, 'rgba(255,200,110,0.55)'); rg.addColorStop(1, 'rgba(255,200,110,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, H);
  return tex(c);
}
// plum roofs with gold ribs running up them
function roofTexture() {
  const [c, g] = canvas(256, 256);
  const lg = g.createLinearGradient(0, 256, 0, 0); lg.addColorStop(0, '#5e1f4c'); lg.addColorStop(1, '#a03a78');
  g.fillStyle = lg; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(255,255,255,0.06)';
  for (let y = 8; y < 256; y += 12) for (let x = (y / 12) % 2 ? 0 : 8; x < 256; x += 16) { g.beginPath(); g.arc(x, y, 7, 0, Math.PI); g.stroke(); }
  g.fillStyle = '#e8b84a';
  for (let i = 0; i < 8; i++) g.fillRect(i * 32 - 1.5, 0, 3, 256);
  return tex(c);
}

// --- geometry helpers ---------------------------------------------------------------
class Builder {
  constructor() { this.parts = {}; }
  add(key, g) {
    g = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    (this.parts[key] ||= []).push(g);
    return g;
  }
  build(materials, group) {
    for (const [key, list] of Object.entries(this.parts)) {
      const mesh = new THREE.Mesh(mergeGeometries(list), materials[key]);
      mesh.name = 'castle-' + key;
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    }
  }
}
const scaleUV = (g, su, sv) => { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; };
// an open cylinder whose texture tiles every tileW by tileH metres
function body(r, h, seg, tileW = 12, tileH = 34) {
  const g = new THREE.CylinderGeometry(r, r, h, seg, 1, true).translate(0, h / 2, 0);
  return scaleUV(g, Math.max(1, Math.round((Math.PI * 2 * r) / tileW)), Math.max(1, Math.round(h / tileH)));
}
// a box with tiled side faces and blank top and bottom
function wallBox(w, h, d, tileW = 12, tileH = 34) {
  const g = new THREE.BoxGeometry(w, h, d), uv = g.attributes.uv;
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    if (f === 2 || f === 3) { uv.setXY(i, 0.02, 0.02); continue; }
    const across = f < 2 ? d : w;
    uv.setXY(i, uv.getX(i) * Math.max(1, Math.round(across / tileW)), uv.getY(i) * Math.max(1, Math.round(h / tileH)));
  }
  return g;
}
const lathe = (pts, seg = 20) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
function capGeometry(kind, r, h) {
  if (kind === 'onion') {
    return lathe([[r * 0.82, 0], [r * 1.0, h * 0.12], [r * 1.08, h * 0.3], [r * 0.95, h * 0.5], [r * 0.6, h * 0.7], [r * 0.25, h * 0.86], [r * 0.08, h * 0.95], [0, h]]);
  }
  if (kind === 'witch') {
    return lathe([[r * 1.18, 0], [r * 0.95, h * 0.08], [r * 0.6, h * 0.3], [r * 0.32, h * 0.58], [r * 0.12, h * 0.84], [0, h]]);
  }
  return lathe([[r * 1.1, 0], [0, h]], 20);           // gothic cone
}

export function createCastle(scene, preset = {}) {
  const low = (preset.grass ?? 9999) < 4000;
  const B = new Builder();
  const group = new THREE.Group();
  const glows = [];               // spire tips and lamps that get a halo
  const ww = windowWall(), aw = arcadeWall(), aw2 = ashlarWall();
  const tips = [], crowns = [];   // spire tips and parapet rings, for pennants and fairy lights

  // --- a tower with its band, parapet, cap, finial and optional sitout balconies
  function tower({ x, z, y, r, h, cap, capH, seg = 18, balconies = [], pinnacles = cap === 'gothic' }) {
    B.add('wall', body(r, h, seg).translate(x, y, z));
    B.add('gold', new THREE.CylinderGeometry(r + 0.7, r + 0.7, 1.6, seg).translate(x, y + h - 2.5, z));
    B.add('stone', new THREE.CylinderGeometry(r + 1.4, r + 0.9, 3, seg).translate(x, y + h - 0.5, z));
    // machicolations: a ring of corbels joined by little round arches under the parapet
    {
      const n = Math.max(10, Math.round((Math.PI * 2 * r) / 2.6)), rr = r + 0.55;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2, b = a + Math.PI / n;
        B.add('stone', new THREE.BoxGeometry(0.6, 2, 1.1).translate(0, 0, rr).rotateY(a).translate(x, y + h - 4.2, z));
        if (!low) B.add('white', new THREE.TorusGeometry(Math.PI * rr / n - 0.3, 0.16, 3, 6, Math.PI).translate(0, y + h - 5.2, rr + 0.2).rotateY(b).translate(x, 0, z));
      }
      B.add('white', new THREE.CylinderGeometry(r + 0.35, r + 0.35, 0.5, seg).translate(x, y + h - 6.8, z));
    }
    const capR = cap === 'onion' ? r * 1.15 : r;
    B.add('roof', capGeometry(cap, capR, capH).translate(x, y + h + 1, z));
    const tip = y + h + 1 + capH;
    B.add('gold', new THREE.ConeGeometry(Math.max(0.4, r * 0.05), capH * 0.18 + 3, 8).translate(x, tip + capH * 0.09 + 1, z));
    glows.push([x, tip + capH * 0.18 + 3, z, Math.max(6, r * 0.6)]);
    tips.push([x, tip + capH * 0.18 + 3, z]); crowns.push([x, y + h, z, r]);
    if (pinnacles) {
      for (let k = 0; k < 4; k++) {
        const a = k * Math.PI / 2 + Math.PI / 4, px = x + Math.cos(a) * (r + 0.6), pz = z + Math.sin(a) * (r + 0.6);
        B.add('roof', new THREE.ConeGeometry(r * 0.12, capH * 0.3, 8).translate(px, y + h + 1 + capH * 0.15, pz));
      }
    }
    for (const hb of balconies) {
      B.add('white', new THREE.CylinderGeometry(r + 4.5, r + 3.2, 1.2, seg * 2).translate(x, y + hb, z));
      B.add('white', new THREE.TorusGeometry(r + 4.3, 0.18, 4, seg * 2).rotateX(Math.PI / 2).translate(x, y + hb + 1.6, z));
    }
    addCollider({ x, z, r: r + 0.4, y0: y, y1: y + h });
    return tip;
  }

  // --- the three towering levels: arcaded walls, white tops, cornices, parapets
  const stadium = (T, off, n = 10) => {
    const hw = T.hw + off, fr = T.front + off, R = TERRACE_R + off, rear = TERRACE_REAR;
    const pts = [[-hw, rear], [-hw, fr - R]];
    for (let i = 1; i < n; i++) { const a = Math.PI - (i / n) * (Math.PI / 2); pts.push([-(hw - R) + Math.cos(a) * R, fr - R + Math.sin(a) * R]); }
    pts.push([-(hw - R), fr], [hw - R, fr]);
    for (let i = 1; i < n; i++) { const a = Math.PI / 2 - (i / n) * (Math.PI / 2); pts.push([(hw - R) + Math.cos(a) * R, fr - R + Math.sin(a) * R]); }
    pts.push([hw, fr - R], [hw, rear]);
    return pts;
  };
  // a vertical ribbon along a path, textured so one tile spans tileW metres
  const ribbon = (pts, y0, y1, tileW, vRepeat = 1) => {
    const pos = [], uv = [];
    let s = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1], l = Math.hypot(bx - ax, bz - az);
      const u0 = s / tileW, u1 = (s + l) / tileW; s += l;
      pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
      uv.push(u0, 0, u1, 0, u1, vRepeat, u0, 0, u1, vRepeat, u0, vRepeat);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  };
  let below = BASE - 2;
  TERRACES.forEach((T) => {
    B.add('arcade', ribbon(stadium(T, 0), below, T.y, 9));
    B.add('white', ribbon(stadium(T, 0.6), T.y - 1.4, T.y + 0.2, 9));                  // white cornice
    B.add('gold', ribbon(stadium(T, 0.7), T.y - 2.2, T.y - 1.8, 9));                    // gold string course
    // the walkway top, in white marble
    const sh = new THREE.Shape(stadium(T, 0).map(([x, z]) => new THREE.Vector2(x, -z)));
    B.add('floor', new THREE.ShapeGeometry(sh, 4).rotateX(-Math.PI / 2).translate(0, T.y + 0.02, 0));
    // balustrade along the outer edge, open where the stair arrives
    const gap = stairHW(T.front) + 1.5, edge = stadium(T, -0.4);
    const left = [...edge.filter(([x]) => x < 0), [-gap, T.front - 0.4]];
    const right = [[gap, T.front - 0.4], ...edge.filter(([x]) => x > 0)];
    for (const half of [left, right]) {
      B.add('white', ribbon(half, T.y, T.y + 1.1, 2));
      B.add('white', ribbon(half, T.y + 1.1, T.y + 1.3, 2));
    }
    for (const s of [-1, 1]) {
      const x1 = T.hw - TERRACE_R;
      addCollider({ minX: s < 0 ? -x1 : gap, maxX: s < 0 ? -gap : x1, minZ: T.front - 0.9, maxZ: T.front + 0.3, y0: T.y, y1: T.y + 3 });
    }
    below = T.y;
  });

  // --- the grand stair with its chadar water channel -----------------------------------
  const P = STAIR.profile;
  for (let i = 0; i < P.length - 1; i++) {
    const [z0, y0] = P[i], [z1, y1] = P[i + 1];
    const steps = Math.max(1, Math.round((y1 - y0) / 0.5));
    for (let k = 0; k < steps; k++) {
      const za = z0 - (z0 - z1) * (k / steps), zb = z0 - (z0 - z1) * ((k + 1) / steps), top = y0 + (y1 - y0) * ((k + 1) / steps);
      const hw = stairHW((za + zb) / 2), d = za - zb;
      B.add('floor', new THREE.BoxGeometry(hw * 2, top - BASE + 1, d + 0.02).translate(0, (top + BASE - 1) / 2, (za + zb) / 2));
    }
    // cheek walls either side, following the slope
    for (const s of [-1, 1]) {
      const hw = stairHW((z0 + z1) / 2);
      const cheek = new THREE.BoxGeometry(2, 1, z0 - z1), p = cheek.attributes.position;
      for (let v = 0; v < p.count; v++) {
        const zz = p.getZ(v) + (z0 + z1) / 2, t = (z0 - zz) / (z0 - z1 || 1);
        p.setY(v, p.getY(v) > 0 ? y0 + (y1 - y0) * t + 1.4 : BASE - 1);
      }
      cheek.computeVertexNormals();
      B.add('stone', cheek.translate(s * (hw + 1), 0, (z0 + z1) / 2));
    }
  }
  // the water ribbon down the middle and fountain jets on every landing
  let waterMat;
  {
    const pos = [], uv = [], w = 1.8;
    let s = 0;
    for (let i = 0; i < P.length - 1; i++) {
      const [z0, y0] = P[i], [z1, y1] = P[i + 1], l = Math.hypot(z0 - z1, y1 - y0);
      pos.push(-w, y0 + 0.12, z0, w, y0 + 0.12, z0, w, y1 + 0.12, z1, -w, y0 + 0.12, z0, w, y1 + 0.12, z1, -w, y1 + 0.12, z1);
      uv.push(0, s / 10, 1, s / 10, 1, (s + l) / 10, 0, s / 10, 1, (s + l) / 10, 0, (s + l) / 10);
      s += l;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    waterMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { uTime: { value: 0 }, uNight: MOOD.night },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: /* glsl */`
        uniform float uTime; uniform float uNight; varying vec2 vUv;
        void main(){
          float ch = sin(vUv.y * 40. + uTime * 6. + sin(vUv.x * 12.) * 1.5) * .5 + .5;
          float edge = smoothstep(0., .15, vUv.x) * smoothstep(1., .85, vUv.x);
          vec3 c = mix(vec3(.75, .92, 1.), vec3(.45, .85, 1.), uNight) * (.8 + .4 * ch);
          gl_FragColor = vec4(pow(c, vec3(2.2)), .75 * edge);
          #include <colorspace_fragment>
        }`,
    });
    group.add(new THREE.Mesh(g, waterMat));
    for (const [z, y] of P.slice(1)) {
      B.add('jet', new THREE.ConeGeometry(0.9, 6, 8, 1, true).translate(0, y + 3, z));
      glows.push([0, y + 5, z, 7]);
    }
  }

  // --- the 200 m front wall with flowing-glass lancets, girih band and pinnacles -------
  const WALL_TOP = SILL + CROWN.wallH, WALL_D = 12, FRAME_HW = CROWN.frameHW, WHW = CROWN.wallHW;
  for (const s of [-1, 1]) {
    const len = WHW - FRAME_HW, cx = GX + s * (FRAME_HW + len / 2);
    B.add('ashlar', wallBox(len, WALL_TOP - SILL, WALL_D, 16, 16).translate(cx, (SILL + WALL_TOP) / 2, GZ - WALL_D / 2));
    for (const yb of [SILL + 11, SILL + 100]) B.add('gold', new THREE.BoxGeometry(len + 0.4, 2.4, WALL_D + 0.6).translate(cx, yb, GZ - WALL_D / 2));  // girih bands
    B.add('stone', new THREE.BoxGeometry(len + 1, 3, WALL_D + 1.6).translate(cx, WALL_TOP + 1.5, GZ - WALL_D / 2));
    for (let x = FRAME_HW + 15; x <= WHW + 0.01; x += 18.3) {
      B.add('roof', new THREE.ConeGeometry(2.4, 18, 8).translate(GX + s * x, WALL_TOP + 12, GZ + 0.5));
      B.add('stone', new THREE.CylinderGeometry(2, 2, 6, 8).translate(GX + s * x, WALL_TOP + 3, GZ + 0.5));
    }
    // a corner tower closing each end of the wall
    tower({ x: GX + s * (WHW + 8), z: GZ - 6, y: SILL, r: 8.5, h: 150, cap: s < 0 ? 'onion' : 'gothic', capH: s < 0 ? 30 : 46, balconies: [70, 118] });
    addCollider({ minX: cx - len / 2, maxX: cx + len / 2, minZ: GZ - WALL_D, maxZ: GZ, y0: SILL, y1: WALL_TOP });
  }
  // the gate frame: a pale gable rising to 222 m round the 100 m pointed opening
  {
    const sh = new THREE.Shape();
    const GS = CROWN.gableSide, GT = CROWN.gableTop;
    sh.moveTo(-FRAME_HW, 0); sh.lineTo(FRAME_HW, 0); sh.lineTo(FRAME_HW, GS); sh.lineTo(0, GT); sh.lineTo(-FRAME_HW, GS); sh.lineTo(-FRAME_HW, 0);
    sh.holes.push(new THREE.Path(pointedArchShape(GATE_W, GATE_H).getPoints(32)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: WALL_D + 4, bevelEnabled: false, curveSegments: 24 });
    B.add('frame', g.translate(GX, SILL, GZ - WALL_D - 2));
    const trim = new THREE.TubeGeometry(pointedArchPath(GATE_W + 1, GATE_H + 0.6), 96, 1.1, 6, false);
    B.add('gold', trim.translate(GX, SILL, GZ + 2.2));
    for (const s of [-1, 1]) {
      const rise = GT - GS, edge = new THREE.CylinderGeometry(0.9, 0.9, Math.hypot(FRAME_HW, rise), 6);
      edge.rotateZ(s * (Math.PI / 2 - Math.atan2(rise, FRAME_HW))).translate(GX + s * FRAME_HW / 2, SILL + (GS + GT) / 2, GZ + 2.2);
      B.add('gold', edge);
      addCollider({ minX: s < 0 ? GX - FRAME_HW : GX + GATE_W / 2, maxX: s < 0 ? GX - GATE_W / 2 : GX + FRAME_HW, minZ: GZ - WALL_D - 2, maxZ: GZ + 2, y0: SILL, y1: SILL + GS });
    }
    // the two pinnacle turrets beside it, rising past the gable
    for (const s of [-1, 1]) tower({ x: GX + s * (FRAME_HW + 4), z: GZ - 2, y: SILL, r: 5.5, h: 168, cap: 'gothic', capH: 28, seg: 12, pinnacles: false });
  }

  // --- the crown: joined towers stepping up unevenly to the cone tower ------------------
  // a vestibule behind the gate, then the hall mass that ties every tower together
  const HALL_FRONT = GZ - 40, HALL_D = 100;
  const HALL_H = 132;
  B.add('wall', wallBox(290, HALL_H, HALL_D, 12, 37).translate(GX, SILL + HALL_H / 2, HALL_FRONT - HALL_D / 2));
  B.add('stone', new THREE.BoxGeometry(294, 3, HALL_D + 4).translate(GX, SILL + HALL_H + 1.5, HALL_FRONT - HALL_D / 2));
  addCollider({ minX: GX - 145, maxX: GX + 145, minZ: HALL_FRONT - HALL_D, maxZ: HALL_FRONT, y0: SILL, y1: SILL + HALL_H });
  for (const s of [-1, 1]) {   // vestibule side walls
    B.add('stone', new THREE.BoxGeometry(4, 60, 28).translate(GX + s * 42, SILL + 30, (HALL_FRONT + GZ - WALL_D) / 2));
    addCollider({ minX: GX + s * 42 - 2, maxX: GX + s * 42 + 2, minZ: HALL_FRONT, maxZ: GZ - WALL_D, y0: SILL, y1: SILL + 60 });
  }
  const ZC = GZ - 80;
  // central dome tower (the wider one) and the taller gothic cone tower beside it
  {
    const DX = GX - 14, DR = 48, DH = 236, DOME = 34;
    B.add('wall', body(DR, DH, 28).translate(DX, SILL, ZC));
    B.add('gold', new THREE.CylinderGeometry(DR + 1, DR + 1, 2, 28).translate(DX, SILL + DH, ZC));
    B.add('stone', new THREE.CylinderGeometry(DR + 2, DR + 0.5, 4, 28).translate(DX, SILL + DH + 2, ZC));
    B.add('wall', body(DOME + 1, 18, 28, 8, 14).translate(DX, SILL + DH + 4, ZC));                         // windowed drum
    B.add('gold', new THREE.CylinderGeometry(DOME + 2, DOME + 2, 1.8, 28).translate(DX, SILL + DH + 22, ZC));
    B.add('roof', capGeometry('onion', DOME / 1.08, 84).translate(DX, SILL + DH + 22, ZC));
    B.add('gold', new THREE.ConeGeometry(1.6, 28, 8).translate(DX, SILL + DH + 120, ZC));
    B.add('gold', new THREE.SphereGeometry(2.6, 10, 8).translate(DX, SILL + DH + 110, ZC));
    glows.push([DX, SILL + DH + 134, ZC, 24]);
    tips.push([DX, SILL + DH + 134, ZC]); crowns.push([DX, SILL + DH, ZC, DR]);
    addCollider({ x: DX, z: ZC, r: DR, y0: SILL, y1: SILL + DH });
  }
  const coneTip = tower({ x: GX + 66, z: ZC + 10, y: SILL, r: 28, h: 312, cap: 'gothic', capH: 112, seg: 24, balconies: [130, 230] });
  // back towers: witch-hat and gothic cones on the left, a gothic cone and a small onion on the right
  tower({ x: GX - 136, z: ZC - 8, y: SILL, r: 20, h: 168, cap: 'witch', capH: 50, balconies: [100] });
  tower({ x: GX - 98, z: ZC + 42, y: SILL, r: 16, h: 150, cap: 'onion', capH: 40, balconies: [96] });
  tower({ x: GX + 134, z: ZC - 10, y: SILL, r: 19, h: 176, cap: 'gothic', capH: 58 });
  tower({ x: GX + 150, z: ZC + 36, y: SILL, r: 15, h: 150, cap: 'onion', capH: 36, balconies: [92] });
  // small domes alongside on the hall roof
  for (const [dx, dz, r] of [[-66, 32, 11], [112, 52, 10], [-90, -26, 12], [20, 40, 9]]) {
    B.add('wall', body(r, 12, 16, 8, 10).translate(GX + dx, SILL + HALL_H + 3, ZC + dz));
    B.add('roof', capGeometry('onion', r, r * 2.3).translate(GX + dx, SILL + HALL_H + 15, ZC + dz));
    B.add('gold', new THREE.ConeGeometry(0.5, 5, 6).translate(GX + dx, SILL + HALL_H + 15 + r * 2.3 + 2.4, ZC + dz));
  }
  // the four courtyard towers on the crag top, each different, with sitout balconies
  const capFor = { witch: 0.24, onion: 0.22, gothic: 0.25 };
  for (const t of COURT_TOWERS) {
    const capH = t.h * capFor[t.cap], h = t.h - capH - 1;
    tower({ x: t.x, z: t.z, y: BASE, r: t.r, h, cap: t.cap, capH, balconies: [h * 0.38, h * 0.66] });
  }

  // --- walkway life: sitouts and planters on the upper walks, lantern posts on all -------
  const sitouts = [], shrubs = [], posts = [];
  TERRACES.forEach((T, k) => {
    const next = TERRACES[k + 1], zf = T.front - 3, zb = next ? next.front + 3 : GZ + 3;
    for (let x = stairHW(T.front) + 8; x < T.hw - TERRACE_R; x += 14) for (const s of [-1, 1]) {
      posts.push([s * x, T.y, zf]);
      if (k === 0) continue;                 // the lowest walk holds the parterre gardens
      sitouts.push([s * (x + 7), T.y, (zf + zb) / 2 + 2, s]);
      shrubs.push([s * (x + 3.5), T.y, zb], [s * (x + 10.5), T.y, zb]);
    }
  });
  const d = new THREE.Object3D();
  const inst = (geo, mat, list, fn) => {
    const m = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((p, i) => { d.rotation.set(0, 0, 0); d.scale.setScalar(1); fn(p, d); d.updateMatrix(); m.setMatrixAt(i, d.matrix); });
    m.castShadow = true; group.add(m); return m;
  };
  const white = toon('#fbf4f7', { emissive: '#3a2a4a', emissiveIntensity: 0.3 });
  const set = mergeGeometries([
    new THREE.CylinderGeometry(0.9, 0.9, 0.12, 14).translate(0, 0.8, 0), new THREE.CylinderGeometry(0.1, 0.25, 0.8, 6).translate(0, 0.4, 0),
    ...[-1, 1].flatMap((s) => [new THREE.BoxGeometry(0.6, 0.08, 0.6).translate(s * 1.5, 0.48, 0), new THREE.BoxGeometry(0.08, 0.7, 0.6).translate(s * 1.8, 0.85, 0)]),
  ].map((g) => g.toNonIndexed()));
  inst(set, white, sitouts, ([x, y, z, s]) => { d.position.set(x, y, z); d.rotation.set(0, s * 0.3, 0); });
  const shrubGeo = new THREE.IcosahedronGeometry(1.6, 1).scale(1, 0.8, 1).translate(0, 1.1, 0);
  const sm = inst(shrubGeo, toon('#ffffff', { emissive: '#18283a', emissiveIntensity: 0.4 }), shrubs, ([x, y, z]) => { d.position.set(x, y, z); d.rotation.set(0, x, 0); });
  const sc = new THREE.Color();
  shrubs.forEach((_, i) => sm.setColorAt(i, sc.set(i % 3 === 0 ? '#ff9bd0' : i % 3 === 1 ? '#4f9a62' : '#6fb07a')));
  const postGeo = mergeGeometries([new THREE.CylinderGeometry(0.12, 0.18, 3.6, 6).translate(0, 1.8, 0), new THREE.BoxGeometry(0.5, 0.15, 0.5).translate(0, 3.65, 0)].map((g) => g.toNonIndexed()));
  inst(postGeo, toon('#3a3358', { emissive: '#120e28', emissiveIntensity: 0.6 }), posts, ([x, y, z]) => d.position.set(x, y, z));
  inst(new THREE.SphereGeometry(0.35, 7, 5), glowBasic('#ffc65c'), posts, ([x, y, z]) => d.position.set(x, y + 4, z));
  for (const [x, y, z] of posts) glows.push([x, y + 4, z, 3]);

  // --- materials and the merged static castle ---------------------------------------------
  const mats = {
    wall: toon('#ffffff', { map: ww.map, emissive: '#ffffff', emissiveMap: ww.glow, emissiveIntensity: 0.5 }),
    ashlar: toon('#ffffff', { map: aw2.map, emissive: '#3a1a3a', emissiveIntensity: 0.3 }),
    arcade: toon('#ffffff', { map: aw.map, emissive: '#ffffff', emissiveMap: aw.glow, emissiveIntensity: 0.6 }),
    white: toon('#fbf2f6', { emissive: '#3a2a4a', emissiveIntensity: 0.3, side: THREE.DoubleSide }),
    floor: toon('#f4e8ee', { emissive: '#2a2040', emissiveIntensity: 0.3 }),
    frame: toon('#fbeef4', { emissive: '#4a2a50', emissiveIntensity: 0.35 }),
    stone: toon('#e7a9c0', { emissive: '#3a1a3a', emissiveIntensity: 0.3 }),
    roof: toon('#ffffff', { map: roofTexture(), emissive: '#3a0f30', emissiveIntensity: 0.35 }),
    gold: toon('#e8b84a', { emissive: '#6a4a10', emissiveIntensity: 0.8 }),
    jet: additive('#bff0ff', { opacity: 0.55, side: THREE.DoubleSide }),
  };
  B.build(mats, group);

  // --- the gate: two 28 m by 100 m glass leaves that swing inward ---------------------------
  const glassMat = new THREE.MeshBasicMaterial({ map: gateGlass(), side: THREE.DoubleSide, toneMapped: false });
  const arch = pointedArchPath(GATE_W, GATE_H).getPoints(64);
  const doors = [];
  for (const side of [-1, 1]) {
    const outline = side < 0
      ? [new THREE.Vector2(0, 0), ...arch.filter((p) => p.x <= 0.01).map((p) => new THREE.Vector2(p.x, p.y)).reverse()]
      : [new THREE.Vector2(0, 0), ...arch.filter((p) => p.x >= -0.01).map((p) => new THREE.Vector2(p.x, p.y))];
    const g = new THREE.ShapeGeometry(new THREE.Shape(outline), 1);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + GATE_W / 2) / GATE_W, p.getY(i) / GATE_H);
    g.translate(-side * GATE_W / 2, 0, 0);          // hinge at the jamb
    const pivot = new THREE.Group();
    pivot.position.set(GX + side * GATE_W / 2, SILL, GZ - 1);
    // gold ribs: the meeting seam, the hinge edge and three cross bars
    const ribs = mergeGeometries([
      new THREE.BoxGeometry(1.2, GATE_H * 0.98, 1).translate(-side * GATE_W / 2, GATE_H * 0.49, 0.3),
      new THREE.BoxGeometry(1.2, GATE_H * 0.5, 1).translate(0, GATE_H * 0.25, 0.3),
      ...[0.15, 0.35, 0.55].map((f) => new THREE.BoxGeometry(GATE_W / 2, 0.8, 0.8).translate(-side * GATE_W / 4, GATE_H * f, 0.3)),
    ].map((q) => q.toNonIndexed()));
    pivot.add(new THREE.Mesh(g, glassMat), new THREE.Mesh(ribs, mats.gold));
    pivot.userData.side = side;
    group.add(pivot);
    doors.push(pivot);
  }
  // the Great Hall's light, seen through the open gate
  const hallGlow = new THREE.Mesh(new THREE.ShapeGeometry(pointedArchShape(GATE_W, GATE_H), 12), additive('#ffcf8a', { opacity: 0 }));
  hallGlow.position.set(GX, SILL, HALL_FRONT + 0.5);
  group.add(hallGlow);
  const gateBlock = { minX: GX - GATE_W / 2, maxX: GX + GATE_W / 2, minZ: GZ - 3, maxZ: GZ + 1, y0: SILL, y1: SILL + GATE_H };
  addCollider(gateBlock);

  // halos on spire tips, fountain jets and lamps
  const hp = new THREE.BufferGeometry();
  hp.setAttribute('position', new THREE.Float32BufferAttribute(glows.flatMap(([x, y, z]) => [x, y, z]), 3));
  hp.setAttribute('size', new THREE.Float32BufferAttribute(glows.map((q) => q[3]), 1));
  const haloMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uMap: { value: glowTexture() }, uNight: MOOD.night, uTime: { value: 0 } },
    vertexShader: 'attribute float size; uniform float uTime; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); gl_PointSize = size * 700. * (1. + .08 * sin(uTime * 2. + position.y)) / -mv.z; gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform sampler2D uMap; uniform float uNight; void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(1., .78, .9) * a * (.3 + .6 * uNight), 1.); }',
  });
  const halos = new THREE.Points(hp, haloMat);
  halos.frustumCulled = false;
  group.add(halos);

  scene.add(group);
  let gateOpen = 0, gateTarget = 0;
  return {
    group,
    gatePosition: new THREE.Vector3(GX, SILL, GZ),
    rosePosition: new THREE.Vector3(GX, SILL + GATE_H * 0.6, GZ),
    spireTop: new THREE.Vector3(GX + 66, coneTip, ZC + 10),
    tips, crowns,
    dome: { x: GX - 14, z: ZC, r: 48 }, cone: { x: GX + 66, z: ZC + 10, r: 28 },
    setGate(open, instant = false) { gateTarget = open ? 1 : 0; if (instant) gateOpen = gateTarget; },
    update(t, dt) {
      haloMat.uniforms.uTime.value = t;
      waterMat.uniforms.uTime.value = t;
      const n = MOOD.night.value;
      mats.wall.emissiveIntensity = 0.35 + 0.65 * n;
      mats.arcade.emissiveIntensity = 0.45 + 0.6 * n;
      glassMat.color.setScalar(0.7 + 0.35 * n);
      gateOpen += (gateTarget - gateOpen) * Math.min(1, dt * 0.6);
      for (const q of doors) q.rotation.y = -q.userData.side * gateOpen * 1.5;
      hallGlow.material.opacity = 0.85 * gateOpen;
      gateBlock.y0 = gateOpen > 0.6 ? 1e9 : SILL;
    },
  };
}

