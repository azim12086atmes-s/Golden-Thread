// B01 the Princess Palace, measured off owner sheet 03 (south elevation and roof plan,
// with crops 01-10 of build sheet B01) and built in drawn metres, then scaled by the
// world scale S = 2.75 so the spires reach their labelled 840 to 1100 m and the plan
// spans about 2.3 x 1.9 km. Four stepped garden tiers: the arcaded rose podium cut by
// the cascade court, the great-lancet storey with the Rose Gate, the dome terrace and
// the crown garden. Domed corner pavilions, the great purple onion dome west of the
// gate, the needle-spire cluster behind it and the tall glass spires to the east,
// conservatories, wheel parterres and water channels on the roofs, and the human-scale
// G02 roof court on the crown garden.
//
// Laptop plan: the massing is one merged mesh per material; the instanced detail
// (spirelets, trees, lanterns, garlands) shows within about 5 km.
import * as THREE from 'three';
import { glowBasic, additive, nightGrade } from './materials.js';
import { palaceStone as toon, gardenPavingTexture } from './palace-gardens.js';
import { glowTexture, rng } from './textures.js';
import { Kit, box, cyl, lathe, cap, scaleUV, wallBox, waterMaterial, haloPoints, roseWindowTexture } from './kit.js';
import { pointedArchShape, pointedArchPath, archFrameGeometry } from './arch.js';
import { archWallGeometry, fanlightGeometry, spandrelGeometry, rectangularPortalFrame, subtractEntrance } from './palace-entrance.js';
import { S, PAL, PALACE_TIERS, PALACE_PLANS, PALACE_BLOCKS, inPlan, tierContains, palaceTop, GATE, CASTLE, CASCADE, PLAZA, PORTALS, PALACE_ENTRANCE, COLLIDERS, addCollider, addPad } from './layout.js';
import {
  IVORY, PEARL, ROSE, GOLD, paint, merge, finialGeo, spireletGeo, cypressGeo, blossomGeo, orangeTreeGeo, roseClumpGeo,
  postLampGeo, hangingLanternGeo, lotusFountainGeo, benchGeo, artifactMaterials, instances, tiledInstances,
} from './artifacts.js';
import { MOOD } from './sky.js';

const BY = PAL.y;

// --- textures (one tile each; the vertex colour tints them) -----------------------------
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c, wrap = true) {
  const t = new THREE.CanvasTexture(c);
  if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const R = rng(303);
function marble(g, w, h, base, vein = 'rgba(190,150,160,0.18)') {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = vein; g.lineWidth = 1;
  for (let i = 0; i < 18; i++) { g.beginPath(); const x = R() * w, y = R() * h; g.moveTo(x, y); g.bezierCurveTo(x + R() * 60 - 30, y + R() * 60, x + R() * 80 - 40, y + R() * 120, x + R() * 60 - 30, y + R() * 200); g.stroke(); }
}
// a pointed lancet from its bottom (y1) to its tip (y0)
function lancetPath(g, x, w, y0, y1) {
  const ys = y0 + w * 0.95;
  g.beginPath(); g.moveTo(x, y1); g.lineTo(x, ys);
  g.quadraticCurveTo(x, y0 + w * 0.3, x + w / 2, y0); g.quadraticCurveTo(x + w, y0 + w * 0.3, x + w, ys);
  g.lineTo(x + w, y1); g.closePath();
}
// indigo stained glass with multicolour accents
function glassFill(g, x, y, w, h, glow) {
  const lg = g.createLinearGradient(0, y, 0, y + h);
  lg.addColorStop(0, glow ? '#7078d0' : '#1c2478'); lg.addColorStop(0.55, glow ? '#6080e0' : '#22309c'); lg.addColorStop(1, glow ? '#c0a0f0' : '#3a3aa8');
  g.fillStyle = lg; g.fill();
  if (glow) return;
  g.save(); g.clip();
  const cols = ['#3a5ad8', '#5a4ac8', '#ff9ad8', '#ffd36a', '#2a70d0', '#141c6a'];
  for (let i = 0; i < w * h / 90; i++) { g.fillStyle = cols[Math.floor(R() * cols.length)]; g.globalAlpha = 0.35; g.fillRect(x + R() * w, y + R() * h, 3 + R() * 6, 3 + R() * 8); }
  g.globalAlpha = 1; g.restore();
}
function star8(g, x, y, r, fill) {
  g.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath(); g.fillStyle = fill; g.fill();
}
function pair(draw, w, h) {
  const [c, g] = cv(w, h), [e, ge] = cv(w, h);
  ge.fillStyle = '#000'; ge.fillRect(0, 0, w, h);
  draw(g, false); draw(ge, true);
  return { map: tex(c), glow: tex(e) };
}
// wing wall bay (25 m x 100 m): slim twin lancets with a quatrefoil, gold string courses
const wingTex = () => pair((g, glow) => {
  if (!glow) {
    marble(g, 256, 1024, '#f8efe9');
    g.fillStyle = '#efc4c8'; g.fillRect(0, 0, 256, 34); g.fillRect(0, 984, 256, 40);
    g.fillStyle = '#d9b25a'; g.fillRect(0, 34, 256, 6); g.fillRect(0, 978, 256, 6);
    g.fillStyle = 'rgba(200,150,160,0.25)'; g.fillRect(0, 40, 14, 938); g.fillRect(242, 40, 14, 938);
  }
  for (const x of [56, 140]) { lancetPath(g, x, 60, 250, 900); glassFill(g, x, 250, 60, 650, glow); if (!glow) { g.strokeStyle = '#d9b25a'; g.lineWidth = 5; g.stroke(); g.lineWidth = 2; g.beginPath(); g.moveTo(x + 30, 290); g.lineTo(x + 30, 900); g.stroke(); for (let y = 380; y < 900; y += 130) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 60, y); g.stroke(); } } }
  g.beginPath(); g.arc(128, 160, 40, 0, Math.PI * 2); glassFill(g, 88, 120, 80, 80, glow);
  if (!glow) { g.strokeStyle = '#d9b25a'; g.lineWidth = 5; g.stroke(); star8(g, 128, 160, 24, '#e8c060'); g.fillStyle = '#efc4c8'; g.fillRect(40, 905, 176, 22); for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#ff9cc4' : '#5f9a52'; g.beginPath(); g.arc(50 + i * 20, 902, 9, 0, Math.PI * 2); g.fill(); } }
}, 256, 1024);
// podium (24 m x 124 m): two storeys of round-arched arcades with rose planters on every sill
const podiumTex = () => pair((g, glow) => {
  if (!glow) marble(g, 256, 512, '#f2c7c9', 'rgba(255,255,255,0.25)');
  for (const y0 of [0, 256]) {
    const arch = () => { g.beginPath(); g.moveTo(52, y0 + 226); g.lineTo(52, y0 + 108); g.arc(128, y0 + 108, 76, Math.PI, 0); g.lineTo(204, y0 + 226); g.closePath(); };
    arch();
    if (glow) { g.fillStyle = y0 ? '#a07040' : '#604030'; g.fill(); continue; }
    const lg = g.createLinearGradient(0, y0 + 32, 0, y0 + 226); lg.addColorStop(0, '#3a2648'); lg.addColorStop(1, '#a8706a'); g.fillStyle = lg; g.fill();
    g.strokeStyle = '#fbf4ee'; g.lineWidth = 12; g.stroke(); g.strokeStyle = '#d9b25a'; g.lineWidth = 3; arch(); g.stroke();
    g.fillStyle = '#fbf4ee'; g.fillRect(0, y0 + 226, 256, 22); g.fillRect(0, y0, 18, 256); g.fillRect(238, y0, 18, 256);
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 3 ? '#ff9cc4' : (i % 2 ? '#ffe2ee' : '#4f8a46'); g.beginPath(); g.arc(46 + i * 15, y0 + 222, 8, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#d9b25a'; g.fillRect(0, y0 + 248, 256, 5);
  }
}, 256, 512);
// corner pavilion face (one octagon face, the whole shaft): banner panel with a gold star
const towerTex = () => pair((g, glow) => {
  if (!glow) {
    marble(g, 128, 1024, '#f8f0ea');
    g.fillStyle = '#efc4c8'; g.fillRect(0, 0, 10, 1024); g.fillRect(118, 0, 10, 1024); g.fillRect(0, 950, 128, 74);
    g.fillStyle = '#d9b25a'; for (const y of [40, 300, 700, 944]) g.fillRect(0, y, 128, 8);
  }
  g.beginPath(); g.moveTo(64, 340); g.lineTo(98, 380); g.lineTo(98, 640); g.lineTo(64, 680); g.lineTo(30, 640); g.lineTo(30, 380); g.closePath();
  g.fillStyle = glow ? '#202060' : '#2e2f96'; g.fill();
  if (!glow) { g.strokeStyle = '#d9b25a'; g.lineWidth = 5; g.stroke(); }
  star8(g, 64, 510, 26, glow ? '#ffe9a0' : '#f0c860');
  for (const x of [34, 70]) { lancetPath(g, x, 24, 110, 250); glassFill(g, x, 110, 24, 140, glow); }
}, 128, 1024);
// needle spire face (owner's hi-res elevation): a tall pointed light of violet-blue glass strung
// with gold lozenges and pink diamonds, in a pearl frame with gold fillets
const spireTex = () => pair((g, glow) => {
  if (!glow) { marble(g, 64, 512, '#faf3ee'); g.fillStyle = '#d9b25a'; g.fillRect(0, 0, 64, 6); g.fillRect(0, 506, 64, 6); g.fillRect(9, 6, 3, 500); g.fillRect(52, 6, 3, 500); }
  lancetPath(g, 15, 34, 14, 500);
  if (glow) { g.fillStyle = '#5a58c8'; g.fill(); }
  else {
    const lg = g.createLinearGradient(0, 14, 0, 500); lg.addColorStop(0, '#2a2a9a'); lg.addColorStop(0.5, '#4a3ab8'); lg.addColorStop(0.8, '#7a5ad0'); lg.addColorStop(1, '#c87ad8');
    g.fillStyle = lg; g.fill(); g.strokeStyle = '#e2b44c'; g.lineWidth = 3; g.stroke();
  }
  for (let y = 70; y < 480; y += 64) {                                         // lozenges down the light
    g.beginPath(); g.moveTo(32, y - 22); g.lineTo(44, y); g.lineTo(32, y + 22); g.lineTo(20, y); g.closePath();
    g.fillStyle = glow ? '#c088e0' : (y / 64) % 2 < 1 ? '#ff8ec8' : '#f0b860'; g.fill();
    if (!glow) { g.strokeStyle = '#f0d070'; g.lineWidth = 2; g.stroke(); g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(32, y, 3, 0, Math.PI * 2); g.fill(); }
  }
}, 64, 512);
// the corner towers' great star window: a tall pointed light of cobalt shards, a gold lozenge
// frame round a gold eight-point star, a rose glow at the foot and a gold lotus sill
const starWinTex = () => pair((g, glow) => {
  lancetPath(g, 4, 120, 4, 508);
  if (glow) { g.fillStyle = '#2a2a80'; g.fill(); }
  else {
    const lg = g.createLinearGradient(0, 0, 0, 512); lg.addColorStop(0, '#16206e'); lg.addColorStop(0.45, '#2438a8'); lg.addColorStop(0.8, '#5a48c0'); lg.addColorStop(1, '#d880c8');
    g.fillStyle = lg; g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 260; i++) { g.fillStyle = ['#3a5ad8', '#5a4ac8', '#2a70d0', '#141c6a', '#7a8af0'][i % 5]; g.globalAlpha = 0.45; g.beginPath(); const x = R() * 128, y = R() * 512; g.moveTo(x, y); g.lineTo(x + 4 + R() * 9, y + R() * 6); g.lineTo(x + R() * 5, y + 6 + R() * 12); g.fill(); }
    g.globalAlpha = 1; g.strokeStyle = 'rgba(226,180,76,0.55)'; g.lineWidth = 1.5;
    for (let k = -512; k < 640; k += 22) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 256, 512); g.stroke(); g.beginPath(); g.moveTo(k + 256, 0); g.lineTo(k, 512); g.stroke(); }
    g.restore();
    lancetPath(g, 4, 120, 4, 508); g.strokeStyle = '#e2b44c'; g.lineWidth = 6; g.stroke();
  }
  g.beginPath(); g.moveTo(64, 150); g.lineTo(108, 256); g.lineTo(64, 362); g.lineTo(20, 256); g.closePath();   // the lozenge
  if (!glow) { g.strokeStyle = '#f0c860'; g.lineWidth = 5; g.stroke(); }
  star8(g, 64, 256, 46, glow ? '#ffe9a0' : '#f4c850');
  star8(g, 64, 256, 16, glow ? '#ffffff' : '#fff2c0');
  if (!glow) {
    g.fillStyle = '#e2b44c'; g.beginPath(); g.moveTo(64, 470); g.quadraticCurveTo(30, 470, 24, 500); g.lineTo(104, 500); g.quadraticCurveTo(98, 470, 64, 470); g.fill();   // lotus sill
    for (const x of [64, 40, 88]) { g.beginPath(); g.ellipse(x, 470, 7, 18, 0, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e2b44c'; g.fillRect(60, 362, 8, 108); g.fillRect(60, 40, 8, 110);       // gold stem through the light
  }
}, 128, 512);
// drum: two rings of arched indigo windows with a gold ring between
const drumTex = () => pair((g, glow) => {
  if (!glow) { marble(g, 128, 256, '#f8efe9'); g.fillStyle = '#d9b25a'; g.fillRect(0, 124, 128, 8); g.fillRect(0, 248, 128, 8); g.fillRect(0, 0, 128, 5); }
  for (const y of [18, 140]) { lancetPath(g, 34, 60, y, y + 98); glassFill(g, 34, y, 60, 98, glow); if (!glow) { g.strokeStyle = '#d9b25a'; g.lineWidth = 4; g.stroke(); } }
}, 128, 256);
// purple dome with a gold rib on each tile edge and a gold neck ring at the foot
function domeTex() {
  // plain dark pink (owner, 12 Oct): a deep rose bulb, darker at the gore edges, a soft sheen
  const [c, g] = cv(64, 256);
  const lg = g.createLinearGradient(0, 0, 64, 0); lg.addColorStop(0, '#6a1638'); lg.addColorStop(0.35, '#a02a5a'); lg.addColorStop(0.5, '#b8386a'); lg.addColorStop(0.65, '#a02a5a'); lg.addColorStop(1, '#6a1638');
  g.fillStyle = lg; g.fillRect(0, 0, 64, 256);
  const vg = g.createLinearGradient(0, 0, 0, 256); vg.addColorStop(0, 'rgba(255,220,235,0.12)'); vg.addColorStop(0.55, 'rgba(255,255,255,0)'); vg.addColorStop(1, 'rgba(40,0,20,0.28)');
  g.fillStyle = vg; g.fillRect(0, 0, 64, 256);
  return tex(c);
}
// roof garden (64 m tile): square beds framed by 3 m paths with gold star inlays
function gardenTex() { return gardenPavingTexture(); }
// court floor: rose and ivory pavers, gold eight-point star inlays (sheet 16)
function courtFloorTex() {
  const [c, g] = cv(256, 256);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) { g.fillStyle = (i + j) % 2 ? '#f6e6de' : '#f0cfd0'; g.fillRect(i * 64, j * 64, 64, 64); }
  g.strokeStyle = 'rgba(200,160,150,0.6)'; g.lineWidth = 2; for (let k = 0; k <= 256; k += 64) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); }
  for (const [x, y] of [[0, 0], [128, 128], [256, 0], [0, 256], [256, 256]]) star8(g, x, y, 22, '#e2b44c');
  return tex(c);
}
// A001 great lancet (35 x 69 m drawn), zoomed off sheet 03, A001 and P01-01: three cusped
// lancet lights of fine cobalt shards under a twelve-petal rose, trefoils in the spandrels, gold
// leading with lozenges and fleurons up each light, and a rose-violet glow rising in the middle
// light (the figure of light in the sheet 03 windows). Also dresses the small lancets.
const lancetTex = () => pair((g, glow) => {
  const W = 160, Hh = 316, Wm = 35, Hm = 69, X = (m) => (m + Wm / 2) * W / Wm, Y = (m) => Hh - m * Hh / Hm, k = W / Wm;
  const R3 = rng(41);
  const nx = 18, ny = 36, pts = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pts.push([i * W / nx + (i % nx ? (R3() - 0.5) * 6 : 0), j * Hh / ny + (j % ny ? (R3() - 0.5) * 6 : 0)]);
  const blues = ['#16207a', '#1c2a8e', '#2236a4', '#2a44b8', '#3450c4', '#3a3aa8', '#2a58c8'];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const A = pts[j * (nx + 1) + i], B = pts[j * (nx + 1) + i + 1], C = pts[(j + 1) * (nx + 1) + i], D = pts[(j + 1) * (nx + 1) + i + 1];
    for (const tri of (R3() < 0.5 ? [[A, B, D], [A, D, C]] : [[A, B, C], [B, D, C]])) {
      g.beginPath(); g.moveTo(...tri[0]); g.lineTo(...tri[1]); g.lineTo(...tri[2]); g.closePath();
      g.fillStyle = glow ? '#141c58' : blues[Math.floor(R3() * blues.length)]; g.fill();
      if (!glow) { g.strokeStyle = 'rgba(10,14,50,0.5)'; g.lineWidth = 0.7; g.stroke(); }
    }
  }
  g.save(); g.globalCompositeOperation = 'lighter';                       // the glow rising in the middle light
  const rg = g.createRadialGradient(X(0), Y(16), 0, X(0), Y(16), 26 * k);
  rg.addColorStop(0, glow ? 'rgba(255,200,240,0.9)' : 'rgba(255,190,236,0.55)'); rg.addColorStop(0.5, 'rgba(170,120,240,0.3)'); rg.addColorStop(1, 'rgba(80,60,200,0)');
  g.fillStyle = rg; g.fillRect(0, 0, W, Hh); g.restore();
  const gold = glow ? '#806020' : '#e2b44c', stone = glow ? '#302838' : '#f6ece6';
  g.lineCap = 'round'; g.lineJoin = 'round';
  // stone mullions between the lights, up to the shoulders
  g.fillStyle = stone; for (const c of [-5.6, 5.6]) g.fillRect(X(c) - 0.8 * k, Y(37), 1.6 * k, Y(0) - Y(37));
  // the three cusped lights: gold outline, stem with lozenges and fleurons
  for (const c of [-11.2, 0, 11.2]) {
    const lw = 9.6, x0 = X(c - lw / 2), x1 = X(c + lw / 2), ys = Y(33), yt = Y(41);
    g.strokeStyle = gold; g.lineWidth = 3;
    g.beginPath(); g.moveTo(x0, Y(0)); g.lineTo(x0, ys); g.quadraticCurveTo(x0, yt + 8, X(c), yt); g.quadraticCurveTo(x1, yt + 8, x1, ys); g.lineTo(x1, Y(0)); g.stroke();
    g.lineWidth = 2; for (const sd of [-1, 1]) { g.beginPath(); g.arc(X(c + sd * 2.2), Y(35.5), 2 * k, 0, Math.PI * 2); g.stroke(); }   // cusps
    g.beginPath(); g.moveTo(X(c), Y(1)); g.lineTo(X(c), Y(32)); g.stroke();
    for (let y = 5; y < 31; y += 6.5) {
      g.lineWidth = 2; g.beginPath(); g.moveTo(X(c), Y(y + 2.4)); g.lineTo(X(c + 2.6), Y(y)); g.lineTo(X(c), Y(y - 2.4)); g.lineTo(X(c - 2.6), Y(y)); g.closePath(); g.stroke();
      g.fillStyle = glow ? '#ffd890' : (c ? '#ff9ad8' : '#ffd36a'); g.beginPath(); g.arc(X(c), Y(y), 0.9 * k, 0, Math.PI * 2); g.fill();
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(X(c), Y(y + 3.4)); g.quadraticCurveTo(X(c + sd * 3.6), Y(y + 3.6), X(c + sd * 3.2), Y(y + 5.6)); g.stroke(); }
    }
  }
  // the twelve-petal rose in the head, trefoils either side
  const cx = X(0), cy = Y(52), rr = 10.4 * k;
  g.fillStyle = stone; g.beginPath(); g.arc(cx, cy, rr + 1.2 * k, 0, Math.PI * 2); g.fill();
  for (let i = 0; i < 12; i++) {
    g.save(); g.translate(cx, cy); g.rotate((i / 12) * Math.PI * 2);
    g.beginPath(); g.moveTo(0, -rr * 0.24); g.quadraticCurveTo(-rr * 0.3, -rr * 0.6, 0, -rr * 0.96); g.quadraticCurveTo(rr * 0.3, -rr * 0.6, 0, -rr * 0.24);
    g.fillStyle = glow ? '#6050c0' : (i % 2 ? '#5a6cff' : '#7a5cf0'); g.fill(); g.strokeStyle = gold; g.lineWidth = 2.2; g.stroke(); g.restore();
  }
  g.strokeStyle = gold; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, rr, 0, Math.PI * 2); g.stroke();
  star8(g, cx, cy, rr * 0.22, glow ? '#ffe9a0' : '#f0c860');
  for (const sd of [-1, 1]) { const tx = X(sd * 12.2), ty = Y(44.5); g.lineWidth = 2; for (let q = 0; q < 3; q++) { const a = -Math.PI / 2 + (q - 1) * 2.1; g.beginPath(); g.arc(tx + Math.cos(a) * 1.4 * k, ty + Math.sin(a) * 1.4 * k, 1.3 * k, 0, Math.PI * 2); g.stroke(); } }
}, 160, 316);
// The Rose Gate door, zoomed off sheet 03 and sheet 02: tiny fractured shards of deep cobalt
// glass with gold leading and constellations picked out in light; a slender gold arch set
// inside the opening with narrow side lights and a crossbar at the springing; a gold tree up
// the centre with a diamond medallion of gold petals and a lower diamond round a glowing
// core; pale rose light trunks rising at the foot. `head` paints the lit hall below the
// springing for the panel behind the leaves.
function drawDoor(g, glow, W, Hh, head = 0) {
  const GWm = 54, GHm = 93, kx = W / GWm, ky = Hh / GHm;
  const X = (m) => W / 2 + m * kx, Y = (m) => Hh - m * ky;               // door metres to canvas
  const sp = Y(GHm - GWm * 0.866);
  const R2 = rng(77);                                                    // same shards on the map and the glow map
  // fractured glass: a jittered grid split into shards, cobalt to violet, rose light at the foot
  const nx = 26, ny = 46, pts = [];
  for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx; i++) pts.push([i * W / nx + (i % nx ? (R2() - 0.5) * 7 : 0), j * Hh / ny + (j % ny ? (R2() - 0.5) * 7 : 0)]);
  const blues = ['#0c0f4a', '#12185e', '#161e70', '#1a2482', '#202c94', '#24247e', '#141e6c', '#28349e'];   // indigo, dark blue (owner, 12 Oct)
  const roses = ['#5a4ab8', '#6a54c0', '#7a60c8', '#4a44a8', '#8a6ad0', '#3c3a9c'];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const A = pts[j * (nx + 1) + i], B = pts[j * (nx + 1) + i + 1], C = pts[(j + 1) * (nx + 1) + i], D = pts[(j + 1) * (nx + 1) + i + 1];
    const foot = Math.max(0, (j / ny - 0.72) / 0.28) * 0.6;
    for (const tri of (R2() < 0.5 ? [[A, B, D], [A, D, C]] : [[A, B, C], [B, D, C]])) {
      const useRose = R2() < foot * 1.1, pal = useRose ? roses : blues, col = pal[Math.floor(R2() * pal.length)];
      g.beginPath(); g.moveTo(...tri[0]); g.lineTo(...tri[1]); g.lineTo(...tri[2]); g.closePath();
      g.fillStyle = glow ? (useRose ? '#4a3c90' : '#080c38') : col; g.fill();
      if (!glow) { g.strokeStyle = 'rgba(12,16,60,0.55)'; g.lineWidth = 0.8; g.stroke(); }
    }
  }
  // the rose light trunks at the foot, branching into the tree
  for (const [x, w] of [[-17, 3], [-10, 2.4], [-4, 2], [4, 2], [10, 2.4], [17, 3]]) {
    const lg = g.createLinearGradient(0, Y(0), 0, Y(34)); lg.addColorStop(0, glow ? '#ffd8f0' : 'rgba(255,236,246,0.85)'); lg.addColorStop(1, 'rgba(255,220,240,0)');
    g.fillStyle = lg; g.fillRect(X(x) - w * kx / 2, Y(34), w * kx, 34 * ky);
  }
  // constellations: bright stars joined by fine lines, and a dust of small stars
  const cons = [[[-18, 70], [-12, 74], [-8, 69], [-14, 64], [-20, 61]], [[10, 76], [15, 72], [19, 75], [16, 66]], [[-19, 40], [-15, 46], [-11, 43], [-9, 50]], [[12, 44], [16, 49], [20, 45], [18, 39], [13, 37]], [[-6, 84], [0, 87], [6, 84]], [[-20, 22], [-16, 27], [-19, 31]], [[16, 23], [20, 28], [15, 31]]];
  g.lineWidth = 1.1; g.strokeStyle = glow ? '#8090d0' : 'rgba(220,230,255,0.75)';
  for (const c of cons) { g.beginPath(); c.forEach(([x, y], i) => (i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)))); g.stroke(); }
  const star = (x, y, r) => { const rg = g.createRadialGradient(x, y, 0, x, y, r * 3); rg.addColorStop(0, '#ffffff'); rg.addColorStop(0.3, glow ? '#c8d8ff' : 'rgba(210,225,255,0.9)'); rg.addColorStop(1, 'rgba(160,180,255,0)'); g.fillStyle = rg; g.beginPath(); g.arc(x, y, r * 3, 0, Math.PI * 2); g.fill(); };
  for (const c of cons) for (const [x, y] of c) star(X(x), Y(y), 2.2);
  for (let i = 0; i < 160; i++) { const x = R2() * W, y = R2() * Hh * 0.7; g.fillStyle = `rgba(230,236,255,${0.35 + R2() * 0.5})`; g.fillRect(x, y, 1.4, 1.4); }
  // the light from the centre: a warm rose-white bloom at the foot of the tree, spreading up and
  // out through the glass and fading toward the edges
  {
    const cx = X(0), cy = Y(22), r = 38 * kx;
    g.save(); g.globalCompositeOperation = 'lighter';
    const rg = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    rg.addColorStop(0, glow ? 'rgba(255,240,250,0.8)' : 'rgba(255,236,246,0.5)'); rg.addColorStop(0.18, glow ? 'rgba(220,190,255,0.4)' : 'rgba(220,200,255,0.25)');
    rg.addColorStop(0.45, glow ? 'rgba(90,90,220,0.2)' : 'rgba(80,80,200,0.12)'); rg.addColorStop(1, 'rgba(30,30,140,0)');
    g.fillStyle = rg; g.fillRect(0, 0, W, Hh);
    for (let i = 0; i < 26; i++) {                                         // rays fanning up from the bloom
      const a = -Math.PI / 2 + (i / 25 - 0.5) * 2.6, len = (0.55 + R2() * 0.45) * r;
      const lg = g.createLinearGradient(cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len);
      lg.addColorStop(0, 'rgba(230,220,255,0.18)'); lg.addColorStop(1, 'rgba(230,220,255,0)');
      g.strokeStyle = lg; g.lineWidth = 2 + R2() * 3; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * len, cy + Math.sin(a) * len); g.stroke();
    }
    g.restore();
  }
  const gold = glow ? '#806020' : '#e2b44c', goldHi = glow ? '#a08040' : '#ffe08a';
  // fine gold leading in a diamond lattice over all the glass
  g.save(); g.strokeStyle = glow ? 'rgba(128,96,32,0.5)' : 'rgba(226,180,76,0.38)'; g.lineWidth = 1;
  for (let k = -Hh; k < W + Hh; k += 4 * kx) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k - Hh * 0.55, Hh); g.stroke(); g.beginPath(); g.moveTo(k, 0); g.lineTo(k + Hh * 0.55, Hh); g.stroke(); }
  g.restore();
  g.strokeStyle = gold; g.lineCap = 'round'; g.lineJoin = 'round';
  const curve = (wd, pts2) => { g.lineWidth = wd; g.beginPath(); g.moveTo(...pts2[0]); for (let i = 1; i < pts2.length; i += 3) g.bezierCurveTo(...pts2[i], ...pts2[i + 1], ...pts2[i + 2]); g.stroke(); };
  const petal = (x, y, a, l, w) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-w, -l * 0.5, 0, -l); g.quadraticCurveTo(w, -l * 0.5, 0, 0); g.fillStyle = gold; g.fill(); g.fillStyle = goldHi; g.beginPath(); g.ellipse(0, -l * 0.45, w * 0.3, l * 0.25, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
  // the gold arch set inside the opening, side lights and the springing crossbar
  const archLine = (wi, hi, wd) => {
    const hs = hi - wi * 0.866; g.lineWidth = wd; g.beginPath(); g.moveTo(X(-wi / 2), Y(0)); g.lineTo(X(-wi / 2), Y(hs));
    for (let i = 1; i <= 16; i++) { const t = Math.PI - (i / 16) * (Math.PI / 3); g.lineTo(X(wi / 2 + Math.cos(t) * wi), Y(hs + Math.sin(t) * wi)); }
    for (let i = 1; i <= 16; i++) { const t = Math.PI / 3 - (i / 16) * (Math.PI / 3); g.lineTo(X(-wi / 2 + Math.cos(t) * wi), Y(hs + Math.sin(t) * wi)); }
    g.lineTo(X(wi / 2), Y(0)); g.stroke();
  };
  archLine(42, 84, 5); archLine(39, 80, 2);
  for (const sd of [-1, 1]) { curve(3.5, [[X(sd * 24), Y(0)], [X(sd * 24), Y(15)], [X(sd * 24), Y(35)], [X(sd * 24), Y(46)]]); }
  g.lineWidth = 3.5; g.beginPath(); g.moveTo(X(-25), Y(46)); g.lineTo(X(25), Y(46)); g.stroke();
  for (const sd of [-1, 1]) { petal(X(sd * 25), Y(46), sd * Math.PI / 2, 9, 3.5); petal(X(sd * 21), Y(46) + 1, Math.PI, 8, 3); }
  // the side lights: a chain of gold quatrefoils and diamonds up each one
  for (const sd of [-1, 1]) for (let y = 4, i = 0; y < 44; y += 5, i++) {
    const x = X(sd * 25.2), yy = Y(y);
    if (i % 2) { g.lineWidth = 1.6; for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 3.2, yy + Math.sin(a) * 3.2, 3, 0, Math.PI * 2); g.stroke(); } }
    else { g.lineWidth = 2; g.beginPath(); g.moveTo(x, yy - 9); g.lineTo(x + 4.5, yy); g.lineTo(x, yy + 9); g.lineTo(x - 4.5, yy); g.closePath(); g.stroke(); }
  }
  // the head between the inner arch and the tree: curling sprigs of gold petals
  for (const sd of [-1, 1]) for (const [y0, x0, x1, y1] of [[50, 4, 14, 58], [58, 6, 12, 70], [70, 3, 8, 78], [36, 6, 16, 30], [24, 5, 15, 16]]) {
    curve(2.4, [[X(sd * x0), Y(y0)], [X(sd * (x0 + 6)), Y(y0 + 3)], [X(sd * x1), Y((y0 + y1) / 2)], [X(sd * x1), Y(y1)]]);
    g.save(); g.lineWidth = 2; g.beginPath(); g.arc(X(sd * x1) - sd * 4, Y(y1), 4, 0, Math.PI * 1.6); g.stroke(); g.restore();
  }
  // the gold tree: central stem, branches fanning out, the petal diamond and the lower diamond
  curve(5, [[X(0), Y(0)], [X(0), Y(20)], [X(0), Y(55)], [X(0), Y(80)]]);
  for (const sd of [-1, 1]) {
    curve(3.5, [[X(0), Y(30)], [X(sd * 4), Y(34)], [X(sd * 12), Y(36)], [X(sd * 18), Y(44)]]);
    curve(3, [[X(0), Y(40)], [X(sd * 6), Y(46)], [X(sd * 14), Y(48)], [X(sd * 17), Y(58)]]);
    curve(3, [[X(0), Y(56)], [X(sd * 5), Y(62)], [X(sd * 12), Y(64)], [X(sd * 14), Y(72)]]);
    for (const [x, y, a] of [[18, 44, 0.3], [17, 58, 0.2], [14, 72, 0.1], [9, 36, 1.2], [11, 49, 1.1]]) petal(X(sd * x), Y(y), sd * a, 10, 3.6);
  }
  const diamond = (cy, hw, hh, wd) => { g.lineWidth = wd; g.beginPath(); g.moveTo(X(0), Y(cy + hh)); g.lineTo(X(hw), Y(cy)); g.lineTo(X(0), Y(cy - hh)); g.lineTo(X(-hw), Y(cy)); g.closePath(); g.stroke(); };
  diamond(64, 8, 10, 4.5); diamond(64, 5, 6.5, 2);
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; petal(X(0), Y(64), a, 11, 3.4); }
  g.fillStyle = goldHi; g.beginPath(); g.arc(X(0), Y(64), 5, 0, Math.PI * 2); g.fill();
  diamond(44, 5, 6.5, 3.5);
  { const rg = g.createRadialGradient(X(0), Y(44), 0, X(0), Y(44), 14); rg.addColorStop(0, '#fff6c0'); rg.addColorStop(0.5, glow ? '#ffd870' : '#ffd86a'); rg.addColorStop(1, 'rgba(255,200,90,0)'); g.fillStyle = rg; g.beginPath(); g.arc(X(0), Y(44), 14, 0, Math.PI * 2); g.fill(); }
  for (const sd of [-1, 1]) petal(X(0), Y(80), sd * 0.5, 10, 3.4);
  if (head) {                                                          // below the springing: the lit hall behind the leaves
    const hall = g.createLinearGradient(0, sp, 0, Hh); hall.addColorStop(0, '#ffd890'); hall.addColorStop(1, glow ? '#ffb070' : '#ff9a68');
    g.fillStyle = hall; g.fillRect(0, sp + 2, W, Hh - sp);
    g.fillStyle = glow ? '#c09060' : '#f4d7c0'; for (const x of [36, 100, 156, 220]) g.fillRect(x - 5, sp + 30, 10, Hh - sp);
  } else { g.fillStyle = gold; g.fillRect(W / 2 - 3, sp, 6, Hh - sp); }  // the meeting stile, on the leaves only
}
// P01-02 rose window, twelve petals: pointed petals of indigo and violet glass in gold
// tracery, an inner gold flower, a ring of small foils round the rim
function rose12Tex() {
  const [c, g] = cv(256, 256);
  g.translate(128, 128);
  g.fillStyle = '#f4e6dc'; g.beginPath(); g.arc(0, 0, 128, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#2c34a8'; g.beginPath(); g.arc(0, 0, 112, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#e2b44c'; g.lineJoin = 'round';
  for (let i = 0; i < 12; i++) {
    g.save(); g.rotate((i / 12) * Math.PI * 2);
    g.beginPath(); g.moveTo(0, -30); g.quadraticCurveTo(-30, -62, 0, -104); g.quadraticCurveTo(30, -62, 0, -30);
    const pg = g.createLinearGradient(0, -30, 0, -104); pg.addColorStop(0, '#ff9ad8'); pg.addColorStop(0.4, i % 2 ? '#7a6cff' : '#5a7cff'); pg.addColorStop(1, '#3a44c8');
    g.fillStyle = pg; g.fill(); g.lineWidth = 5; g.stroke();
    g.beginPath(); g.arc(0, -118, 7, 0, Math.PI * 2); g.fillStyle = '#6f8cff'; g.fill(); g.lineWidth = 3; g.stroke();   // rim foils
    g.restore();
  }
  for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2 + Math.PI / 12; g.lineWidth = 3; g.beginPath(); g.moveTo(Math.cos(a) * 30, Math.sin(a) * 30); g.lineTo(Math.cos(a) * 110, Math.sin(a) * 110); g.stroke(); }
  g.lineWidth = 6; g.beginPath(); g.arc(0, 0, 112, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#e2b44c'; for (let i = 0; i < 8; i++) { g.save(); g.rotate((i / 8) * Math.PI * 2); g.beginPath(); g.ellipse(0, -16, 6, 14, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  g.fillStyle = '#fff2c0'; g.beginPath(); g.arc(0, 0, 9, 0, Math.PI * 2); g.fill();
  const t = tex(c, false); return t;
}
// A003 lotus keystone: pearl petals in two rings over a gold cup, unit height about 1
function lotusGeo() {
  const parts = [];
  for (const [n, tilt, l, off] of [[8, 1.0, 1, 0], [6, 0.45, 1.1, 0.5], [1, 0, 1.15, 0]]) for (let i = 0; i < n; i++) {
    const petal = new THREE.SphereGeometry(1, 8, 5).scale(0.3, 0.5 * l, 0.12).translate(0, 0.5 * l, 0).rotateX(n === 1 ? 0 : tilt).rotateY(((i + off) / n) * Math.PI * 2);
    parts.push(paint(petal, '#fbe8e2'));
  }
  return merge(parts);
}
const gateTex = () => pair((g, glow) => drawDoor(g, glow, 256, 448, 1), 256, 448);
const doorTex = () => pair((g, glow) => drawDoor(g, glow, 256, 448), 256, 448);
// archivolt band (one 4.5 m tile along the arch), zoomed off sheet 03: a cobalt band between
// gold rails carrying a running vine of gold petals and small four-petal gold flowers
function archBandTex() {
  const [c, g] = cv(128, 64);
  g.fillStyle = '#f6ece6'; g.fillRect(0, 0, 128, 64);
  g.fillStyle = '#22309a'; g.fillRect(0, 10, 128, 44);
  g.fillStyle = '#e2b44c'; g.fillRect(0, 5, 128, 6); g.fillRect(0, 53, 128, 6);
  g.strokeStyle = '#e2b44c'; g.lineWidth = 3; g.beginPath();
  for (let x = 0; x <= 128; x += 2) g.lineTo(x, 32 + Math.sin((x / 128) * Math.PI * 4) * 9);
  g.stroke();
  const petal = (x, y, a, l, w) => { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(-w, -l * 0.5, 0, -l); g.quadraticCurveTo(w, -l * 0.5, 0, 0); g.fillStyle = '#e8bc52'; g.fill(); g.fillStyle = '#ffe9a6'; g.beginPath(); g.ellipse(0, -l * 0.45, w * 0.3, l * 0.22, 0, 0, Math.PI * 2); g.fill(); g.restore(); };
  for (let k = 0; k < 4; k++) {
    const x = 16 + k * 32, up = k % 2 === 0, y = 32 + (up ? -9 : 9);
    petal(x, y, up ? -0.5 : Math.PI + 0.5, 15, 5); petal(x, y, up ? 0.5 : Math.PI - 0.5, 15, 5);
    const fx = x + 16, fy = 32 + (up ? 12 : -12);
    for (let i = 0; i < 4; i++) petal(fx, fy, (i / 4) * Math.PI * 2, 7, 3);
    g.fillStyle = '#ff9ad8'; g.beginPath(); g.arc(fx, fy, 2, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}
// gate pier face (one tile, 15 x 78 m), zoomed off sheets 03, 02 and P01 close-up C: rose and
// ivory flutes with gold inlay between them, a gold scroll pair and gem at the head, a girih
// star panel at mid height, a frieze of trefoil gothic arcading and a lotus dado at the foot
function pierTex() {
  const [c, g] = cv(128, 640);
  for (let x = 0; x < 128; x += 16) {                                   // the flutes, shaded round
    const lg = g.createLinearGradient(x, 0, x + 16, 0); lg.addColorStop(0, '#e9c4c6'); lg.addColorStop(0.5, (x / 16) % 2 ? '#fbf1ec' : '#f6dcdc'); lg.addColorStop(1, '#e9c4c6');
    g.fillStyle = lg; g.fillRect(x, 0, 16, 640);
  }
  g.fillStyle = '#d9b25a'; for (let x = 0; x <= 128; x += 16) g.fillRect(x - 1, 130, 2, 400);
  g.fillStyle = '#e2b44c'; g.fillRect(0, 0, 6, 640); g.fillRect(122, 0, 6, 640);
  // head: a frame with a pair of gold scrolls round a blue gem
  g.fillStyle = '#f8efe9'; g.fillRect(8, 20, 112, 100); g.strokeStyle = '#e2b44c'; g.lineWidth = 3; g.strokeRect(10, 22, 108, 96);
  for (const sd of [-1, 1]) { g.lineWidth = 3; g.beginPath(); for (let a = 0; a < Math.PI * 3.4; a += 0.12) { const q = 24 * (1 - a / (Math.PI * 3.8)); g.lineTo(64 + sd * (20 + Math.cos(a) * q), 70 + Math.sin(a) * q); } g.stroke(); }
  g.fillStyle = '#3a48c0'; g.beginPath(); g.moveTo(64, 52); g.lineTo(74, 70); g.lineTo(64, 88); g.lineTo(54, 70); g.closePath(); g.fill(); g.stroke();
  // girih star panel
  g.fillStyle = '#f8efe9'; g.fillRect(14, 270, 100, 100); g.lineWidth = 3; g.strokeRect(16, 272, 96, 96);
  g.save(); g.translate(64, 320);
  g.beginPath(); for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, q = i % 2 ? 22 : 40; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fillStyle = '#2c3aa8'; g.fill(); g.stroke();
  g.lineWidth = 2; for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); g.lineTo(Math.cos(a + 0.9) * 46, Math.sin(a + 0.9) * 46); g.stroke(); }
  star8(g, 0, 0, 14, '#f0c860'); g.restore();
  // trefoil gothic arcading at the foot
  g.fillStyle = '#f8efe9'; g.fillRect(0, 540, 128, 70);
  for (let i = 0; i < 4; i++) {
    const x = 6 + i * 29;
    lancetPath(g, x, 26, 548, 606); g.fillStyle = '#c8b0e0'; g.fill(); g.strokeStyle = '#e2b44c'; g.lineWidth = 2.5; g.stroke();
    g.lineWidth = 1.8; for (let k = 0; k < 3; k++) { const a = -Math.PI / 2 + (k - 1) * 2.1; g.beginPath(); g.arc(x + 13 + Math.cos(a) * 4, 566 + Math.sin(a) * 4, 3.6, 0, Math.PI * 2); g.stroke(); }
  }
  // lotus dado
  g.fillStyle = '#e2b44c'; g.fillRect(0, 610, 128, 30);
  for (let i = 0; i < 8; i++) { const x = 8 + i * 16; g.fillStyle = '#fbeee6'; g.beginPath(); g.moveTo(x, 636); g.quadraticCurveTo(x - 7, 624, x, 614); g.quadraticCurveTo(x + 7, 624, x, 636); g.fill(); }
  g.fillStyle = '#c9963a'; g.fillRect(0, 606, 128, 4);
  return tex(c);
}
// shaft carving (A003 jambs, P01-C): a lace diaper of fine gold and rose lines with a small
// rosette in each lozenge, one tile per 7 m of shaft and half its girth
function shaftTex() {
  const [c, g] = cv(64, 128);
  g.fillStyle = '#fbf1ec'; g.fillRect(0, 0, 64, 128);
  g.strokeStyle = 'rgba(214,150,160,0.8)'; g.lineWidth = 2;
  for (let k = -128; k < 192; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k + 64, 128); g.stroke(); g.beginPath(); g.moveTo(k + 64, 0); g.lineTo(k, 128); g.stroke(); }
  g.strokeStyle = '#e2b44c'; g.lineWidth = 1;
  for (let k = -128; k < 192; k += 32) { g.beginPath(); g.moveTo(k + 3, 0); g.lineTo(k + 67, 128); g.stroke(); }
  for (let y = 0; y <= 128; y += 32) for (let x = 0; x <= 64; x += 32) for (const [dx, dy] of [[0, 0], [16, 16]]) {
    const px = x + dx, py = y + dy; g.fillStyle = '#e8a6b8'; for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; g.beginPath(); g.arc(px + Math.cos(a) * 3, py + Math.sin(a) * 3, 2.6, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#e2b44c'; g.beginPath(); g.arc(px, py, 1.6, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
}
// rose-marble ashlar walling (one tile, 12 x 12 m): veined marble in courses, a tall recessed
// panel with a gold fillet and a rose inner frame, a girih star roundel over it, a gold string line
// carved rose relief (owner's hi-res elevation): pink rosettes cut into the marble, lit from the upper
// left, joined by a leaf scroll, between gold fillets; 17.6 m x 4.4 m a tile
function carvedRose(g, x, y, r) {
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, px = x + Math.cos(a) * r * 0.55, py = y + Math.sin(a) * r * 0.55;
    g.save(); g.translate(px, py); g.rotate(a);
    g.fillStyle = '#c98a96'; g.beginPath(); g.ellipse(1.5, 1.5, r * 0.5, r * 0.3, 0, 0, Math.PI * 2); g.fill();     // shadow
    g.fillStyle = '#eaa8b6'; g.beginPath(); g.ellipse(0, 0, r * 0.5, r * 0.3, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,240,242,0.7)'; g.beginPath(); g.ellipse(-r * 0.12, -r * 0.08, r * 0.28, r * 0.12, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2 + 0.3; g.fillStyle = i % 2 ? '#d88a9c' : '#f4b8c4'; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.22, y + Math.sin(a) * r * 0.22, r * 0.24, r * 0.16, a, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#e2b44c'; g.beginPath(); g.arc(x, y, r * 0.13, 0, Math.PI * 2); g.fill();
}
function carveTex() {
  const [c, g] = cv(256, 64);
  g.fillStyle = '#f4d6d6'; g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#d29aa4'; g.lineWidth = 3;
  for (let x = 0; x < 256; x += 64) {                                        // the leaf scroll between the roses
    g.beginPath(); g.moveTo(x + 18, 32); g.bezierCurveTo(x + 28, 10, x + 36, 54, x + 46, 32); g.stroke();
    for (const [lx, ly, a] of [[x + 26, 20, -0.6], [x + 38, 44, 0.6]]) { g.fillStyle = '#c9a07a'; g.beginPath(); g.ellipse(lx, ly, 5, 2.4, a, 0, Math.PI * 2); g.fill(); }
    carvedRose(g, x, 32, 22); carvedRose(g, x + 256, 32, 22);
  }
  g.fillStyle = '#e2b44c'; g.fillRect(0, 0, 256, 4); g.fillRect(0, 60, 256, 4);
  g.fillStyle = '#fbf1ec'; g.fillRect(0, 4, 256, 2); g.fillRect(0, 58, 256, 2);
  return tex(c);
}
// gold brocade (owner, 12 Oct): an embroidered band of gold arabesques, fleurons and seed pearls,
// with small rose and cobalt jewels; 8 m x 2 m a tile
function brocadeTex() {
  const [c, g] = cv(256, 64);
  const lg = g.createLinearGradient(0, 0, 0, 64); lg.addColorStop(0, '#a87a28'); lg.addColorStop(0.5, '#d9a842'); lg.addColorStop(1, '#a87a28');
  g.fillStyle = lg; g.fillRect(0, 0, 256, 64);
  g.strokeStyle = '#ffe9a8'; g.lineWidth = 2.4; g.lineCap = 'round';
  for (let x = 0; x < 256; x += 32) {
    g.beginPath(); g.moveTo(x, 32); g.bezierCurveTo(x + 8, 12, x + 24, 12, x + 32, 32); g.bezierCurveTo(x + 24, 52, x + 8, 52, x, 32); g.stroke();   // linked ogee cartouches
    g.beginPath(); g.arc(x + 16, 32, 5, 0, Math.PI * 2); g.fillStyle = (x / 32) % 2 ? '#d0406e' : '#2a3ab0'; g.fill(); g.strokeStyle = '#fff2c0'; g.lineWidth = 1.6; g.stroke(); g.strokeStyle = '#ffe9a8'; g.lineWidth = 2.4;
    for (const [dx, dy] of [[16, 15], [16, 49]]) { g.beginPath(); g.moveTo(x + dx, dy - 5); g.lineTo(x + dx + 3, dy); g.lineTo(x + dx, dy + 5); g.lineTo(x + dx - 3, dy); g.closePath(); g.fillStyle = '#fff2c0'; g.fill(); }
  }
  g.fillStyle = '#fff6dc'; for (let x = 2; x < 256; x += 6) { g.beginPath(); g.arc(x, 4, 1.6, 0, Math.PI * 2); g.arc(x, 60, 1.6, 0, Math.PI * 2); g.fill(); }   // seed pearls
  g.fillStyle = '#8a5e1a'; g.fillRect(0, 0, 256, 1.5); g.fillRect(0, 62.5, 256, 1.5);
  return tex(c);
}
// rose petal relief for the spandrels (owner, 12 Oct): full carved roses in pink, scattered petals
// and gold tendrils on blush marble; 10 m a tile
function petalTex() {
  const [c, g] = cv(256, 256);
  marble(g, 256, 256, '#f6dcdc', 'rgba(200,130,150,0.18)');
  const P = rng(41);
  g.strokeStyle = '#e2b44c'; g.lineWidth = 1.6;
  for (let i = 0; i < 9; i++) { const x = P() * 256, y = P() * 256; g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 30, y - 20, x + 40, y + 30, x + 70, y + 8); g.stroke(); }
  for (let i = 0; i < 70; i++) { const x = P() * 256, y = P() * 256, a = P() * 6.3; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = ['#e89aaa', '#f4b4c2', '#d97f94'][i % 3]; g.beginPath(); g.ellipse(0, 0, 5, 2.6, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
  for (const [x, y, r] of [[64, 64, 26], [192, 64, 20], [128, 160, 30], [36, 200, 18], [220, 200, 24]]) for (const ox of [-256, 0, 256]) for (const oy of [-256, 0, 256]) carvedRose(g, x + ox, y + oy, r);
  return tex(c);
}
// the gable medallion: a cobalt quatrefoil with a gold eight-point star, gold rim
function medallionTex() {
  const [c, g] = cv(256, 256);
  const rg = g.createRadialGradient(128, 128, 0, 128, 128, 128); rg.addColorStop(0, '#3a52d8'); rg.addColorStop(0.7, '#1c2a96'); rg.addColorStop(1, '#121c6a');
  g.fillStyle = rg; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(226,180,76,0.5)'; g.lineWidth = 2; for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 128, 128 + Math.sin(a) * 128); g.stroke(); }
  star8(g, 128, 128, 92, '#e8b84a'); star8(g, 128, 128, 80, '#ffd86a'); star8(g, 128, 128, 26, '#fff2c0');
  return tex(c);
}
function ashlarTex() {
  const [c, g] = cv(256, 256);
  marble(g, 256, 256, '#f8ebe6', 'rgba(200,140,150,0.22)');
  g.strokeStyle = 'rgba(214,170,170,0.55)'; g.lineWidth = 1.2;
  for (let y = 0; y < 256; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(256, y); g.stroke(); for (let x = (y / 32) % 2 ? 0 : 48; x < 256; x += 96) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); } }
  g.fillStyle = '#f2d2d0'; g.fillRect(70, 96, 116, 148);                   // the recessed panel
  g.strokeStyle = '#e2b44c'; g.lineWidth = 4; g.strokeRect(70, 96, 116, 148);
  g.strokeStyle = '#e7b7bd'; g.lineWidth = 6; g.strokeRect(82, 108, 92, 124);
  carvedRose(g, 128, 170, 40);                                               // a carved rose in the panel
  g.strokeStyle = '#e2b44c'; g.lineWidth = 2; g.beginPath(); g.arc(128, 170, 42, 0, Math.PI * 2); g.stroke();
  g.save(); g.translate(128, 52);                                          // girih roundel
  g.fillStyle = '#2c3aa8'; g.beginPath(); for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2, q = i % 2 ? 12 : 24; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill();
  g.strokeStyle = '#e2b44c'; g.lineWidth = 3; g.stroke(); g.beginPath(); g.arc(0, 0, 30, 0, Math.PI * 2); g.stroke(); star8(g, 0, 0, 8, '#f0c860'); g.restore();
  g.fillStyle = '#e2b44c'; g.fillRect(0, 250, 256, 6);
  return tex(c);
}
// gable face (one tile over the whole gable): ivory with a border of blue cusped panels down
// both rakes, gold scroll filigree and a gold quatrefoil medallion over the arch
function gableTex(W = 88, H = 56) {
  const [c, g] = cv(512, 326), sx = 512 / W, sy = 326 / H;
  const P = (x, y) => [(x + W / 2) * sx, 326 - y * sy];                // gable metres to canvas
  marble(g, 512, 326, '#f8efe9');
  g.strokeStyle = '#e2b44c'; g.lineCap = 'round';
  for (const sd of [-1, 1]) {
    const q = (t, ins) => { const ax = sd * (W / 2 - ins), ay = 2, bx = sd * (W / 2 - ins) * 0.96, by = 2 + (H - ins * 1.6) * 0.62, cx2 = 0, cy2 = H - ins * 1.6, u = 1 - t;
      return [u * u * ax + 2 * u * t * bx + t * t * cx2, u * u * ay + 2 * u * t * by + t * t * cy2]; };   // the curved rake, inset
    g.strokeStyle = '#e2b44c'; g.lineWidth = 3; g.beginPath(); for (let t = 0; t <= 1.001; t += 0.05) g.lineTo(...P(...q(t, 10))); g.stroke();   // inner gold line
    for (let t = 0.06; t < 0.94; t += 0.07) {                          // cusped panels following the curved rake
      const [x, y] = q(t, 6), [cx, cy] = P(x, y);
      g.fillStyle = '#3440a8'; g.beginPath(); for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; g.moveTo(cx + Math.cos(a) * 9 + 8, cy + Math.sin(a) * 9); g.arc(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, 8, 0, Math.PI * 2); } g.fill();
      g.lineWidth = 2; g.stroke(); star8(g, cx, cy, 5, '#ffe08a');
    }
    g.lineWidth = 3; g.strokeStyle = '#e2b44c';                         // gold filigree scrolls filling the tympanum
    for (const [x0, y0, r] of [[13, 17, 5], [22, 9, 4.5], [10, 30, 4.4], [27, 20, 3.4], [5, 38, 3], [18, 30, 3.2], [32, 8, 3.4]]) {
      const [cx, cy] = P(sd * x0, y0);
      g.beginPath(); for (let a = 0; a < Math.PI * 3.2; a += 0.15) { const q = r * sx * (1 - a / (Math.PI * 3.6)); g.lineTo(cx + sd * Math.cos(a) * q, cy + Math.sin(a) * q); } g.stroke();
    }
  }
  return tex(c, false);
}
// jali rail: gold-framed quatrefoils with a gold star (alpha cut)
function jaliTex() {
  const [c, g] = cv(128, 64);
  g.clearRect(0, 0, 128, 64);
  g.fillStyle = '#fbf4ee'; g.fillRect(0, 0, 128, 64);
  g.globalCompositeOperation = 'destination-out';
  for (const x of [32, 96]) for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 9, 32 + Math.sin(a) * 9, 9, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  for (const x of [32, 96]) { g.strokeStyle = '#d9b25a'; g.lineWidth = 3; g.beginPath(); g.arc(x, 32, 22, 0, Math.PI * 2); g.stroke(); star8(g, x, 32, 7, '#e2b44c'); }
  g.fillStyle = '#d9b25a'; g.fillRect(0, 0, 128, 5); g.fillRect(0, 59, 128, 5);
  return tex(c);
}

// corbel table: one little pointed arch per 6 m tile with a gilded drop between (alpha cut)
function corbelTex() {
  const [c, g] = cv(64, 64);
  g.fillStyle = '#fbf4ee'; g.fillRect(0, 0, 64, 64);
  g.globalCompositeOperation = 'destination-out';
  g.beginPath(); g.moveTo(10, 64); g.lineTo(10, 34); g.quadraticCurveTo(12, 14, 32, 8); g.quadraticCurveTo(52, 14, 54, 34); g.lineTo(54, 64); g.closePath(); g.fill();
  g.globalCompositeOperation = 'source-over';
  g.strokeStyle = '#d9b25a'; g.lineWidth = 3; g.beginPath(); g.moveTo(10, 64); g.lineTo(10, 34); g.quadraticCurveTo(12, 14, 32, 8); g.quadraticCurveTo(52, 14, 54, 34); g.lineTo(54, 64); g.stroke();
  g.fillStyle = '#e2b44c'; g.beginPath(); g.arc(0, 30, 5, 0, Math.PI * 2); g.arc(64, 30, 5, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#efc4c8'; g.fillRect(0, 0, 64, 5);
  return tex(c);
}

// --- geometry helpers ------------------------------------------------------------------
// a pointed-arch panel with UVs spanning its box (0..1)
function archPanel(w, h) {
  const g = new THREE.ShapeGeometry(pointedArchShape(w, h), 12), p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + w / 2) / w, p.getY(i) / h);
  return g;
}
// a flat band following a pointed arch, inner width w and height h, band width bw; the
// texture runs along it, one tile per `tile` metres
function archRibbon(w, h, bw, tile, n = 64) {
  const a = pointedArchPath(w, h).getSpacedPoints(n), b = pointedArchPath(w + bw * 2, h + bw * 1.2).getSpacedPoints(n);
  const pos = [], uv = [], idx = [];
  let u = 0;
  for (let i = 0; i <= n; i++) {
    if (i) u += a[i].distanceTo(a[i - 1]) / tile;
    pos.push(a[i].x, a[i].y, 0, b[i].x, b[i].y, 0); uv.push(u, 1, u, 0);
    if (i) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// octagonal shaft, flat face forward, one texture tile per face
const oct = (r, h, y = 0) => scaleUV(new THREE.CylinderGeometry(r, r, h, 8, 1, true).rotateY(Math.PI / 8).translate(0, y + h / 2, 0), 8, 1);
const ring = (r, h, y, seg = 24) => new THREE.CylinderGeometry(r, r, h, seg).translate(0, y + h / 2, 0);
const onion = (r, h, seg = 24, ribs = 8) => scaleUV(cap('onion', r, h, seg), ribs, 1);
const tent = (r, h, seg = 24, ribs = 12) => scaleUV(lathe([[r, 0], [r * 0.82, h * 0.12], [r * 0.5, h * 0.42], [r * 0.22, h * 0.75], [0, h]], seg), ribs, 1);
const needle = (r, h, seg = 8) => scaleUV(lathe([[r, 0], [r * 0.6, h * 0.3], [r * 0.25, h * 0.7], [0, h]], seg), seg, 1);
// a sloped flight of stairs: a wedge top from (z0, y0) to (z1, y1), half width hw, centred on x;
// `rise` is one step's height in these units
function flight(x, hw, z0, y0, z1, y1, rise = 0.45) {
  const len = Math.hypot(z1 - z0, y1 - y0), steps = Math.max(1, Math.round(Math.abs(y1 - y0) / rise));
  const g = new THREE.BoxGeometry(hw * 2, 1, len, 1, 1, 1);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * steps);
  g.rotateX(-Math.atan2(y1 - y0, z1 - z0)).translate(x, (y0 + y1) / 2 - 0.5, (z0 + z1) / 2);
  return g;
}
// world metres from the palace's drawn metres
const wx = (x) => x * S, wz = (z) => z * S, wy = (y) => BY + y * S;

// --- the palace ----------------------------------------------------------------------------
// Everything below is in drawn metres off sheet 03 (gate axis x = 0, podium front z = 340),
// built into `body`, which is scaled by S. Human-scale things (stair lamps, the roof court)
// go straight into `group` in world metres.
export function createPalace(scene, preset, { makePortal } = {}) {
  const colliderStart = COLLIDERS.length;
  const group = new THREE.Group(); group.name = 'palace';
  const body = new THREE.Group(); body.name = 'palace-body'; body.position.set(0, BY, 0); body.scale.setScalar(S);
  const detail = new THREE.Group(); detail.name = 'palace-detail';
  body.add(detail); group.add(body);
  const kit = new Kit();
  const am = artifactMaterials();
  // Physical roughness and metal response replace the fixed camera-space shine.
  const glossy = (m, k) => { m.roughness = .55 - k * .14; m.metalness = .15 + k * .3; return m; };
  const tile = (t, emissive, opts = {}) => toon('#ffffff', { map: t.map, emissiveMap: t.glow, emissive, emissiveIntensity: 0.5, vertexColors: true, ...opts });
  const steps = (() => { const [c, g] = cv(64, 64); g.fillStyle = '#fbf3ee'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#e8c9c6'; g.fillRect(0, 50, 64, 14); g.fillStyle = '#d9b25a'; g.fillRect(0, 48, 64, 2); return tex(c); })();
  const garden = gardenTex(), dome = domeTex(), jali = jaliTex(), lancetT = lancetTex(), starWin = starWinTex();
  const mats = {
    ivory: toon('#ffffff', { vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    podium: tile(podiumTex(), '#ffb070'),
    wing: tile(wingTex(), '#a99bff'),
    tower: tile(towerTex(), '#ffd36a'),
    spire: tile(spireTex(), '#9fa8ff'),
    drum: tile(drumTex(), '#a99bff'),
    lancet: tile(lancetT, '#b0a8ff', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    lancetDark: tile(lancetT, '#3a46c8', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    starwin: tile(starWin, '#8a90ff', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),     // the small arched windows: dark cobalt
    gate: tile(gateTex(), '#9a9cff', { side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    dome: glossy(toon('#ffffff', { map: dome, vertexColors: true, emissive: '#2a1040', emissiveIntensity: 0.04 }), 1),
    gold: glossy(toon('#ffffff', { vertexColors: true, emissive: '#6a4a10', emissiveIntensity: 0.08 }), 0.7),
    garden: toon('#ffffff', { map: garden, vertexColors: true, roughness: .95 }),
    paving: toon('#ffffff', { map: courtFloorTex(), vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    steps: toon('#ffffff', { map: steps, vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    rose: new THREE.MeshBasicMaterial({ map: roseWindowTexture(), toneMapped: false }),
    rose12: toon('#ffffff', { map: rose12Tex(), emissive: '#8a7cff', emissiveIntensity: 0.5, vertexColors: true }),
    crystal: am.crystal,
    brocade: glossy(toon('#ffffff', { map: brocadeTex(), vertexColors: true, emissive: '#5a3a10', emissiveIntensity: 0.5 }), 0.6),
    petal: toon('#ffffff', { map: petalTex(), vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 }),
    medallion: toon('#ffffff', { map: medallionTex(), vertexColors: true, emissive: '#3040c0', emissiveIntensity: 0.045 }),
    carve: toon('#ffffff', { map: carveTex(), vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    band: toon('#ffffff', { map: archBandTex(), vertexColors: true, emissive: '#2a2050', emissiveIntensity: 0.0255 }),
    ashlar: toon('#ffffff', { map: ashlarTex(), vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    shaft: toon('#ffffff', { map: shaftTex(), vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    pier: toon('#ffffff', { map: pierTex(), vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    gable: toon('#ffffff', { map: gableTex(88, 48), vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    corbel: toon('#ffffff', { map: corbelTex(), alphaTest: 0.5, vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    jali: toon('#ffffff', { map: jali, alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    water: waterMaterial(0.3, false, true),
    fall: waterMaterial(1, true, true),
    glass: additive('#bfe4ff', { opacity: 0.32, side: THREE.DoubleSide }),
  };
  // drawn-metre lists (inside the scaled body)
  const water = [], falls = [], sprays = [], fountains = [], foam = [];
  const spirelets = [], cypress = [], blossoms = [], clumps = [], hanging = [], oranges = [], halosD = [];
  const solids = [];                                                  // colliders in drawn metres
  const taken = [];                                                   // [x, z, r] kept clear of trees and turrets
  const clear = (x, z, r) => taken.every(([tx, tz, tr]) => Math.hypot(x - tx, z - tz) > tr + r);
  const roofAt = palaceTop;
  // world-metre lists (human scale)
  const lamps = [], nearFountains = [];
  const GW = GATE.w / S, GH = GATE.h / S, SILL = GATE.sill / S, GZ = GATE.z / S, FRONT = 191;
  const CZ0 = CASCADE.z0 / S, CZ1 = CASCADE.z1 / S, CW = CASCADE.water / S, CHW = CASCADE.hw / S;

  // ---- landmarks first, so the garden planting keeps clear of them ----
  const CORNERS = [[-398, 258], [451, 262]];                                   // the two front corner towers          // purple-domed corner pavilions
  const FRONT_TOWERS = [[232, 214, 25, 178, 36], [-224, 212, 12, 146, 18], [-302, 230, 13, 132, 20]];     // [x, z, r, dome base, dome height]
  const GREAT_DOME = { x: -200, z: 30, r: 44 };
  // needle spires [x, z, top, width]: the cluster behind the gate, the slim western spires, the tall glass spires east
  // (the gate cluster stands at the back, on the crown garden, as the owner's elevation shows)
  const SPIRES = [[-26, 18, 394, 26], [-52, 30, 345, 16], [22, 22, 347, 16], [-78, 34, 316, 12],
    [155, 60, 258, 8], [-322, 120, 297, 15], [-285, 100, 257, 10],
    [206, -120, 316, 16], [228, -60, 278, 12], [281, -200, 287, 18], [322, -215, 333, 22], [351, -190, 353, 26], [380, -210, 295, 18]];
  const DOME_TOWERS = [[35, 60, 16, 258, 23], [113, 0, 17, 252, 20]];           // [x, z, r, dome base, dome height]
  const CONE = { x: 0, z: -280, r: 22, top: 255 };
  // taller crown (owner, 18 Oct: "the palace height is still low"): the spires rise half as high again
  // above their roofs, the dome towers and the north cone by a third, so the silhouette soars
  for (const sp of SPIRES) sp[2] = Math.round(palaceTop(sp[0], sp[1]) + (sp[2] - palaceTop(sp[0], sp[1])) * 1.6);
  for (const t of DOME_TOWERS) t[3] = Math.round(palaceTop(t[0], t[1]) + (t[3] - palaceTop(t[0], t[1])) * 1.35);
  CONE.top = Math.round(palaceTop(CONE.x, CONE.z) + (CONE.top - palaceTop(CONE.x, CONE.z)) * 1.35);
  const COURT = { x: -70, z: -150, r: 30 };                                      // the human-scale roof court on the crown garden
  const CONSERVATORIES = [[290, -100, 90], [290, 40, 90]];
  const WHEELS = [[176, -160], [176, 75]];
  for (const [x, z] of CORNERS) taken.push([x, z, 36]);
  for (const [x, z, r] of FRONT_TOWERS) taken.push([x, z, r + 3]);
  taken.push([GREAT_DOME.x, GREAT_DOME.z, GREAT_DOME.r + 18], [CONE.x, CONE.z, CONE.r + 4], [COURT.x, COURT.z, COURT.r]);
  for (const [x, z, , w] of SPIRES) taken.push([x, z, w * 0.75 + 3]);
  for (const [x, z, r] of DOME_TOWERS) taken.push([x, z, r + 3]);
  for (const [x, z, L] of CONSERVATORIES) taken.push([x, z - L / 4, 26], [x, z + L / 4, 26]);
  for (const [x, z] of WHEELS) taken.push([x, z, 32]);
  taken.push([0, 120, 32], [-198, 62, 26], [-295, -184, 26]);
                 // forecourt fountains                  // channel pool, west pool, glass pavilion

  // ---- wall dressing: real mouldings, pilasters, windows and arcades rather than painted walls
  // (owner, 11 Oct; P01-06 cornice set, A001/P01-01 lancets, P02-3 bastions; see palace-detail-map.md).
  // It is merged into its own meshes, shown within about 4 km of the palace.
  const dress = new Kit();
  const dressed = new THREE.Group(); dressed.name = 'palace-dressing'; body.add(dressed);
  // an outline's edges, each with its outward normal and the frame that puts local x along it, +z out
  const edgesOf = (pts) => pts.map((a, i) => {
    let b = pts[(i + 1) % pts.length], A = a, B = b;
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2, len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    let nx = (b[1] - a[1]) / len, nz = -(b[0] - a[0]) / len;
    if (inPlan(pts, mx + nx * 0.5, mz + nz * 0.5)) { nx = -nx; nz = -nz; }
    // so that local +z (= (-sin a, cos a)) points out, run the edge the right way round
    let ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
    if (-Math.sin(ang) * nx + Math.cos(ang) * nz < 0) { [A, B] = [B, A]; ang = Math.atan2(B[1] - A[1], B[0] - A[0]); }
    return { a: A, b: B, mx, mz, len, nx, nz, ang };
  });
  const onEdge = (k, e) => k.frame(e.mx, 0, e.mz, -e.ang);
  // prism walls round an outline, textured in whole tiles per edge
  const prism = (pts, y0, y1, tileW, tileH, doorway = null) => {
    const pos = [], uv = [], h = y1 - y0, vr = Math.max(1, Math.round(h / tileH));
    for (const e of edgesOf(pts)) {
      const [ax, az] = e.a, [bx, bz] = e.b, ur = Math.max(1, Math.round(e.len / tileW));
      if (doorway && doorway.zs.some((z) => Math.abs(az - z) < 1e-6 && Math.abs(bz - z) < 1e-6)) {
        // A true rectangular aperture through the T2 front face, not a texture over a solid wall.
        const x0 = Math.min(ax, bx), x1 = Math.max(ax, bx), sh = new THREE.Shape();
        sh.moveTo(x0, y0); sh.lineTo(x1, y0); sh.lineTo(x1, y1); sh.lineTo(x0, y1); sh.closePath();
        const hole = new THREE.Path();
        hole.moveTo(doorway.minX, doorway.y0); hole.lineTo(doorway.maxX, doorway.y0);
        hole.lineTo(doorway.maxX, doorway.y1); hole.lineTo(doorway.minX, doorway.y1); hole.closePath(); sh.holes.push(hole);
        const g = new THREE.ShapeGeometry(sh, 1), p = g.attributes.position, guv = g.attributes.uv;
        for (let i = 0; i < p.count; i++) guv.setXY(i, (p.getX(i) - x0) / tileW, (p.getY(i) - y0) / tileH);
        if(e.nz<0)g.rotateY(Math.PI);
        kit.add('ashlar', g.translate(0, 0, az), '#fff4f0', '#f0b8c0');
        continue;
      }
      pos.push(ax, y0, az, bx, y0, bz, bx, y1, bz, ax, y0, az, bx, y1, bz, ax, y1, az);
      uv.push(0, 0, ur, 0, ur, vr, 0, 0, ur, vr, 0, vr);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.computeVertexNormals();
    return g;
  };
  const roofPlane = (pts, y) => scaleUV(new THREE.ShapeGeometry(new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)))).rotateX(-Math.PI / 2).translate(0, y, 0), 1 / 64, 1 / 64);
  // jali parapet with a gold rail and rose garlands along one edge
  const parapet = (e, t, garland = true) => {
    onEdge(kit, e);
    kit.add('jali', scaleUV(new THREE.PlaneGeometry(e.len, 3).translate(0, t + 1.5, -0.6), e.len / 3, 1), IVORY);
    kit.add('gold', box(e.len, 0.6, 0.8, 0, t + 3, -0.6), GOLD);
    if (garland) for (let u = -e.len / 2 + 4; u < e.len / 2; u += 8) { const p = kit.world(u, 0, -0.6); clumps.push([p.x, t + 3.3, p.z, 5 + R() * 2, R() * 6]); }
    kit.frame();
  };
  // P01-01 / A001 lancet window, small: glass, a stepped frame, a gold hood and a sill
  const lancet = (k, u, y, w, h) => {
    k.add('lancetDark', archPanel(w, h).translate(u, y, 0.15), '#7480f4');
    k.add('ivory', new THREE.TubeGeometry(pointedArchPath(w + w * 0.12, h + w * 0.06), 12, Math.max(0.35, w * 0.08), 4, false).translate(u, y, 0.5), PEARL);   // roll frame
    k.add('gold', new THREE.TubeGeometry(pointedArchPath(w + w * 0.36, h + w * 0.2), 12, Math.max(0.16, w * 0.035), 3, false).translate(u, y - 0.2, 0.9), GOLD);   // gold hood
    k.add('ivory', box(w + 1.4, 0.7, 1.6, u, y - 0.7, 0.8), PEARL);
  };
  // the P01-06 moulding set on one wall: lotus dado at the foot; vine-scroll frieze, dentils and
  // a crown cornice with a gold lip at the head; pilasters with gold capitals; lancet windows
  const dressEdge = (e, y0, y1, o = {}) => {
    const { bay = 22, win = null, skip = () => false, tint = PEARL, pil = true, z0 = 0 } = o;
    onEdge(dress, e);
    const L = e.len, h = y1 - y0;
    dress.add('ivory', box(L, Math.min(2, h * 0.08), 1.2, 0, y0, z0 + 0.6), ROSE);                         // dado
    dress.add('gold', box(L, 0.35, 1.4, 0, y0 + Math.min(2, h * 0.08), z0 + 0.6), GOLD);
    if (h > 24) dress.add('carve', scaleUV(new THREE.PlaneGeometry(L, 4.4).translate(0, y1 - 12.4, z0 + 0.2), Math.max(1, Math.round(L / 17.6)), 1), '#ffffff');   // carved rose band
    if (h > 14) {
      dress.add('band', scaleUV(new THREE.PlaneGeometry(L, 2.4).translate(0, y1 - 7.6, z0 + 0.25), Math.max(1, Math.round(L / 4.5)), 1), '#ffffff');   // vine-scroll frieze
      dress.add('corbel', scaleUV(new THREE.PlaneGeometry(L, 2).translate(0, y1 - 4.4, z0 + 0.35), Math.max(1, Math.round(L / 2.4)), 1), '#ffffff');    // dentils
    }
    dress.add('ivory', box(L + 0.6, 1.2, 2, 0, y1 - 3.2, z0 + 1), tint);                                    // crown cornice, two steps
    dress.add('ivory', box(L + 1.2, 1.4, 2.8, 0, y1 - 2, z0 + 1.4), PEARL);
    dress.add('gold', box(L + 1.4, 0.4, 3, 0, y1 - 0.6, z0 + 1.5), GOLD);
    const n = Math.max(1, Math.round(L / bay)), step = L / n;
    if (pil && h > 10) for (let i = 0; i <= n; i++) {                                                      // pilasters
      const u = -L / 2 + i * step, p = dress.world(u, 0, 0);
      if (skip(p.x, p.z, true)) continue;
      dress.add('ivory', box(2.4, h - 6, 1.3, u, y0 + 1.5, z0 + 0.65), PEARL);
      dress.add('gold', box(3, 0.9, 1.8, u, y1 - 9.3, z0 + 0.9), GOLD);
      dress.add('ivory', box(3, 1.2, 1.8, u, y0 + 1.2, z0 + 0.9), ROSE);
    }
    if (win) for (let i = 0; i < n; i++) {                                                                  // a lancet in each bay
      const u = -L / 2 + (i + 0.5) * step, p = dress.world(u, 0, 0);
      if (skip(p.x, p.z, false)) continue;
      const w = Math.min(win[0], step * 0.55);
      lancet(dress, u, y0 + win[2], w, Math.min(win[1], h - win[2] - (h > 24 ? 15.5 : h > 14 ? 10 : 5)));
    }
    dress.frame();
  };
  // an open pointed arcade across one wall, 4 m in front of the recessed back wall: an arch-pierced
  // screen, lotus-capital columns at the piers, gold hoods, twelve-petal roundels in the spandrels,
  // a crystal lantern in every arch
  const arcadeFront = (e, y0, y1, bay = 12) => {
    const L = e.len, n = Math.max(2, Math.round(L / bay)), step = L / n, h = y1 - y0;
    const aw = step * 0.68, ah = Math.min(h - 9.5, aw * 2.6), spring = ah - aw * 0.866;
    const sh = new THREE.Shape(); sh.moveTo(-L / 2, 0); sh.lineTo(L / 2, 0); sh.lineTo(L / 2, h - 3.2); sh.lineTo(-L / 2, h - 3.2); sh.lineTo(-L / 2, 0);
    for (let i = 0; i < n; i++) { const u = -L / 2 + (i + 0.5) * step; sh.holes.push(new THREE.Path(pointedArchShape(aw, ah).getPoints(10).map((q) => new THREE.Vector2(q.x + u, q.y + 1.8)))); }
    onEdge(dress, e);
    dress.add('ivory', new THREE.ExtrudeGeometry(sh, { depth: 1.6, bevelEnabled: false, curveSegments: 8 }).translate(0, y0, 2.4), PEARL);
    for (let i = 0; i < n; i++) {
      const u = -L / 2 + (i + 0.5) * step;
      dress.add('gold', new THREE.TubeGeometry(pointedArchPath(aw + 1.2, ah + 0.8), 16, 0.28, 4, false).translate(u, y0 + 1.6, 4.1), GOLD);
      const p = dress.world(u, 0, 1.2); hanging.push([p.x, y0 + 1.8 + ah - 3.5, p.z, 1.5, 0]);
    }
    for (let i = 0; i <= n; i++) {
      const u = -L / 2 + i * step;
      dress.add('ivory', cyl(0.9, 0.9, spring, 8, u, y0 + 1.8, 4.6), ROSE);
      dress.add('gold', lathe([[0.9, 0], [1.3, 0.6], [1.9, 1.4], [2, 1.8], [0, 1.8]], 8).translate(u, y0 + 1.8 + spring - 1.6, 4.6), GOLD);
      dress.add('ivory', box(2.4, 1.8, 2.4, u, y0, 4.6), PEARL);
      if (i > 0 && i < n) dress.add('rose12', new THREE.CircleGeometry(Math.min(1.8, step * 0.15), 12).translate(u, y0 + 1.8 + ah - 1.2, 4.05), '#ffffff');
    }
    dress.frame();
    dressEdge(e, y0, y1, { pil: false, z0: 4 });
  };
  // P02-3 octagonal wall bastion: lancets in two stages, a corbelled balcony with a jali ring,
  // gold rings, a purple onion dome on a drum, pinnacles round the parapet
  const bastion = (x, z, h, r = 10, y0 = 0) => {
    kit.frame(x, y0, z);
    kit.add('ivory', oct(r + 2, 6, -4), ROSE);
    kit.add('ivory', oct(r, h, 0), PEARL, '#eeaab6');
    for (const y of [2, h * 0.45, h - 1]) kit.add('gold', ring(r + 0.6, 0.9, y, 8).rotateY(Math.PI / 8), GOLD);
    for (let i = 0; i < 8; i += 2) {
      const a = (i / 8) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), d = r * 0.924;
      kit.frame(x + sn * d, y0, z + c * d, a);
      for (const [y, hh] of [[h * 0.14, h * 0.24], [h * 0.58, h * 0.26]]) lancet(kit, 0, y, r * 0.38, hh);
      kit.frame(x, y0, z);
    }
    const by = h * 0.47;                                                                                   // the balcony on corbels
    kit.add('ivory', ring(r + 3.2, 1.2, by, 16), PEARL);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; kit.add('ivory', box(1.2, 3, 3, 0, by - 3, 0).translate(0, 0, r + 1.2).rotateY(a).translate(0, 0, 0), PEARL); }
    kit.add('jali', scaleUV(new THREE.CylinderGeometry(r + 3, r + 3, 2.6, 16, 1, true).translate(0, by + 2.5, 0), 10, 1), IVORY);
    kit.add('gold', ring(r + 3.2, 0.4, by + 3.8, 16), GOLD);
    kit.add('ivory', ring(r + 1.6, 1.8, h, 8).rotateY(Math.PI / 8), PEARL);
    kit.add('drum', scaleUV(new THREE.CylinderGeometry(r * 0.78, r * 0.82, 7, 16, 1, true).translate(0, h + 5.3, 0), 6, 0.5), IVORY);
    kit.add('gold', ring(r * 0.86, 0.8, h + 8.6, 16), GOLD);
    kit.add('dome', onion(r * 0.9, r * 1.5, 16).translate(0, h + 9, 0), '#ffffff');
    kit.add('gold', finialGeo(r * 0.16).translate(0, h + 9 + r * 1.5 - 1, 0), GOLD);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, p = kit.world(Math.cos(a) * (r + 1.3), 0, Math.sin(a) * (r + 1.3)); spirelets.push([p.x, y0 + h + 1.8, p.z, 0.45, 0]); }
    kit.frame();
    solids.push({ x, z, r: r + 1, y0: y0 - 10, y1: y0 + h + 30 });
    taken.push([x, z, r + 4]);
  };
  // colliders for an outline: vertical strips, each the span of the outline across it
  const outlineSolids = (pts, y1, step = 10) => {
    const xs = pts.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
    for (let x = x0; x < x1; x += step) {
      const xm = Math.min(x + step / 2, x1 - 0.01); let lo = Infinity, hi = -Infinity;
      for (let i = 0; i < pts.length; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[(i + 1) % pts.length];
        if ((ax - xm) * (bx - xm) > 0 || ax === bx) continue;
        const zz = az + ((xm - ax) / (bx - ax)) * (bz - az); lo = Math.min(lo, zz); hi = Math.max(hi, zz);
      }
      if (hi > lo) solids.push({ minX: x, maxX: Math.min(x + step, x1), minZ: lo, maxZ: hi, y0: -10, y1, tier: true });
    }
  };

  // ---- the four stepped garden tiers ----
  const LOOK = [['podium', PEARL, 24, 52], ['wing', IVORY, 25, 76], ['podium', IVORY, 24, 69], ['wing', PEARL, 25, 33]];
  const BASE = [-4, 50, 152, 184];
  PALACE_TIERS.forEach(([x0, x1, z0, z1, t], k) => {
    const [key, tint, tw, th] = LOOK[k], w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    if (PALACE_PLANS[k]) {                                       // a planned tier: rounded wings, walls dressed in real detail
      const pts = PALACE_PLANS[k];
      const gateCut = k === 1 ? { zs: [FRONT], minX: -GW / 2, maxX: GW / 2, y0: SILL, y1: SILL + GH - GW * 0.866 } : null;
      kit.add('ashlar', prism(pts, BASE[k], t, 12, 12, gateCut), '#fff4f0', '#f0b8c0');             // rose marble, deepening toward the foot
      kit.add('garden', roofPlane(pts, t + 0.015), '#ffffff');
      const great = (x) => [-168, -92, 92, 168].some((c) => Math.abs(x - c) < 29) || Math.abs(x) < 62;
      edgesOf(pts).forEach((e) => {
        const back = e.nz < -0.7;
        if (!back) parapet(e, t);
        if (e.nz > 0.15) {
          dressEdge(e, BASE[k], t, { bay: k === 1 ? 24 : 15, win: k === 1 ? [11, 50, 14] : [10, 20, 5], skip: (x, z, pil) => (k === 1 && e.nz > 0.99 && (great(x) || (pil && Math.abs(x) < 70))) || (k === 2 && Math.abs(x) < 13), tint });
          for (let u = -e.len / 2 + 5, i = 0; u < e.len / 2 - 3; u += 10, i++) {          // planting along the front, inset 7 m
            const x = e.mx + Math.cos(e.ang) * u - e.nx * 7, z = e.mz + Math.sin(e.ang) * u - e.nz * 7;
            if (roofAt(x, z) !== t || !clear(x, z, 4) || (Math.abs(x) < 64 && z > 100)) continue;
            if (i % 3 === 1) { kit.add('ivory', box(7, 2, 7, x, t, z), PEARL); blossoms.push([x, t + 2, z, 1 + R() * 0.3, R() * 6]); } else cypress.push([x, t, z, 26 + R() * 12, 0]);
          }
        } else dressEdge(e, BASE[k], t, { bay: 40, pil: false, tint });
      });
      outlineSolids(pts, t - 3 / S);
      return;
    }
    kit.add(key, wallBox(w, t - BASE[k], d, cx, BASE[k], cz, tw, th), tint);
    kit.add('garden', scaleUV(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2).translate(cx, t + 0.015, cz), w / 64, d / 64), '#ffffff');
    kit.add('ivory', box(w + 2, 2.2, d + 2, cx, t - 2.2, cz), PEARL);                                  // cornice
    kit.add('gold', box(w + 2.4, 0.5, d + 2.4, cx, t - 2.9, cz), GOLD);
    // jali parapet with a gold rail and rose garlands; none where a tier meets the one beside it
    for (const [px, pz, len, ry, side] of [[cx, z1 - 0.6, w, 0, 'front'], [cx, z0 + 0.6, w, 0, 'back'], [x0 + 0.6, cz, d, Math.PI / 2, 'side'], [x1 - 0.6, cz, d, Math.PI / 2, 'side']]) {
      if (k === 0 && side === 'front') {                                     // open where the cascade arrives
        for (const sd of [-1, 1]) { const l = (sd > 0 ? x1 : -x0) - CHW, c = sd * (CHW + l / 2); kit.add('jali', scaleUV(new THREE.PlaneGeometry(l, 3).translate(c, t + 1.5, pz), l / 3, 1), IVORY); kit.add('gold', box(l, 0.6, 0.8, c, t + 3, pz), GOLD); }
        continue;
      }
      kit.add('jali', scaleUV(new THREE.PlaneGeometry(len, 3).rotateY(ry).translate(px, t + 1.5, pz), len / 3, 1), IVORY);
      kit.add('gold', box(ry ? 0.8 : len, 0.6, ry ? len : 0.8, px, t + 3, pz), GOLD);
      if (side === 'back') continue;
      for (let u = -len / 2 + 7; u < len / 2; u += 14) clumps.push([ry ? px : px + u, t + 3.3, ry ? pz + u : pz, 5 + R() * 2, R() * 6]);   // rose garlands on the parapet
    }
    // along every terrace front, as drawn: tall cypresses with pink blossom trees between them, set in carved planters
    for (let x = x0 + 8, i = 0; x < x1 - 6; x += 10, i++) {
      const z = z1 - 7;
      if ((k === 0 && Math.abs(x) < CHW + 6) || roofAt(x, z) !== t || !clear(x, z, 4)) continue;
      if (i % 3 === 1) { kit.add('ivory', box(7, 2, 7, x, t, z), PEARL); blossoms.push([x, t + 2, z, 1 + R() * 0.3, R() * 6]); }
      else cypress.push([x, t, z, 26 + R() * 12, 0]);
    }
    for (const sx of [x0 + 7, x1 - 7]) for (let z = z0 + 14, i = 0; z < z1 - 10; z += 14, i++) {
      if (roofAt(sx, z) !== t || !clear(sx, z, 4)) continue;
      if (i % 3 === 1) blossoms.push([sx, t, z, 0.9 + R() * 0.3, R() * 6]); else cypress.push([sx, t, z, 22 + R() * 10, 0]);
    }
  });
  // ---- the stepped ground-storey front (owner's colour notes on sheet 03): landings, slanted stair
  // flanks, projecting pavilions, set-back two-storey arcades and the returns to the corners ----
  for (const b of PALACE_BLOCKS) {
    if (b.kind === 'wing') {                                                  // a stepped wing on the ground-storey roof
      const h = b.top - 52;
      kit.add('ashlar', prism(b.pts, 48, b.top, 12, 12), '#fff4f0', '#f0b8c0');
      kit.add('garden', roofPlane(b.pts, b.top + 0.015), '#ffffff');
      edgesOf(b.pts).forEach((e) => {
        if (e.nz < -0.7) return;
        parapet(e, b.top);
        if (e.nz > 0.15 && e.len > 6) {
          dressEdge(e, 52, b.top, { bay: 14, win: [10, 22, h - 33] });
          for (let u = -e.len / 2 + 4; u < e.len / 2 - 2; u += 9) {                                       // roses and cypress along the balustrade
            const x = e.mx + Math.cos(e.ang) * u - e.nx * 5, z = e.mz + Math.sin(e.ang) * u - e.nz * 5;
            if (roofAt(x, z) !== b.top || !clear(x, z, 3)) continue;
            if (R() < 0.6) blossoms.push([x, b.top, z, 0.8 + R() * 0.3, R() * 6]); else cypress.push([x, b.top, z, 16 + R() * 8, 0]);
          }
        } else dressEdge(e, 52, b.top, { bay: 24 });
      });
      outlineSolids(b.pts, b.top - 3 / S, 6);
      continue;
    }
    const recess = b.kind === 'arcade' || b.kind === 'return' ? 4 : 0;
    const front = edgesOf(b.pts)[0];
    const pts = b.pts.map((q, i) => (i < 2 ? [q[0] - front.nx * recess, q[1] - front.nz * recess] : q));
    const hallCut = b.kind === 'hall' ? { zs: [191, 179], minX: -GW / 2, maxX: GW / 2, y0: SILL, y1: SILL + GH - GW * 0.866 } : null;
    kit.add(recess ? 'ivory' : 'ashlar', prism(pts, -4, b.top, 12, 12, hallCut), recess ? '#eebcc4' : '#fff4f0', recess ? null : '#f0b8c0');
    kit.add('garden', roofPlane(b.pts, b.top + 0.015), '#ffffff');
    const es = edgesOf(pts), ef = es[0];
    edgesOf(b.pts).forEach((e) => { if (e.nz > -0.7) parapet(e, b.top); });
    if (recess) arcadeFront(ef, 0, b.top, b.kind === 'return' ? 14 : 16);
    else if (b.kind === 'upper') dressEdge(ef, b.top - 12, b.top, { bay: 12, win: [4, 7, 1.2] });
    else if (b.kind === 'pavilion') {
      dressEdge(ef, 0, b.top, { bay: ef.len, win: [9, 30, 7] });
      onEdge(kit, ef);
      for (const u of [-ef.len / 2 + 1.5, ef.len / 2 - 1.5]) kit.add('gold', lathe([[0, 0], [1.6, 0.8], [1, 2.4], [1.9, 3.6], [0, 4.6]], 10).translate(u, b.top + 3.6, -1), GOLD);   // urns
      kit.frame();
    }
    else if (b.kind === 'flank') dressEdge(ef, 0, b.top, { bay: 12, win: [4, 11, 5] });
    else if (b.kind === 'hall') {                                             // two arcaded storeys over the gate block
      dressEdge(ef, 154, 186, { bay: 10.7, win: [6, 18, 5] });
      onEdge(kit, ef);
      for (let u = -ef.len / 2 + 4; u < ef.len / 2; u += 12) kit.add('gold', lathe([[0, 0], [1.4, 0.8], [0.9, 2.2], [1.7, 3.4], [0, 4.4]], 10).translate(u, b.top + 3.6, -0.6), GOLD);   // urns on the balustrade
      kit.frame();
    }
    else {                                                                    // the landing: urns on posts, crystal lamps
      dressEdge(ef, 0, b.top, { bay: 60, pil: false });
      onEdge(kit, ef);
      for (const u of [-ef.len / 2 + 2, 0, ef.len / 2 - 2]) { kit.add('ivory', box(3, 4, 3, u, b.top, -1.6), PEARL); kit.add('gold', lathe([[0, 0], [1.6, 1], [1, 2.6], [1.9, 4], [0, 5.2]], 10).translate(u, b.top + 4, -1.6), GOLD); }
      for (const u of [-ef.len / 4, ef.len / 4]) { const p = kit.world(u, 0, -1.6); lamps.push([wx(p.x), wy(b.top), wz(p.z), 1, 0]); }
      kit.frame();
    }
    es.slice(1).forEach((e) => { if (e.nz > -0.7 && e.len > 3) dressEdge(e, 0, b.top, { bay: 24 }); });
    outlineSolids(b.pts, b.top - 3 / S, 6);
  }
  // the podium face (T1 front, z 235) above the stepped blocks: real pilasters, lancets, cornice set
  for (const [xa, xb] of [[-385, -110], [110, 450]]) dressEdge(edgesOf([[xa, 235], [xb, 235], [xb, 200], [xa, 200]])[0], 0, 52, { bay: 18, win: [7, 20, 26] });
  // bastions where the steps meet, and before the curved wings of the lancet storey
  for (const [x, z, h, r] of [[-330, 296, 62, 9], [-468, 262, 64, 6], [-196, 312, 58, 7], [400, 300, 66, 9], [484, 266, 50, 5], [200, 318, 60, 7]]) bastion(x, z, h, r);
  // the dome terrace folds round two towers either side of the gate gable (owner's elevation)
  for (const [x, h, r] of [[-66, 40, 11], [96, 36, 10]]) bastion(x, 113, h, r, 152);
  // the crown garden's front: a storey of dark-blue arched windows under its balustrade
  dressEdge(edgesOf([[-130, 40], [260, 40], [260, 0], [-130, 0]])[0], 184, 216, { bay: 13, win: [8, 17, 5] });
  // cypress and blossom before the arcades, as drawn
  for (const b of PALACE_BLOCKS) if (b.kind === 'arcade') {
    const [[ax, az], [bx]] = b.pts;
    for (let x = Math.min(ax, bx) + 6, i = 0; x < Math.max(ax, bx) - 4; x += 12, i++) { const z = az + 8; if (!clear(x, z, 3)) continue; if (i % 2) blossoms.push([x, 0, z, 0.6 + R() * 0.2, R() * 6]); else cypress.push([x, 0, z, 11 + R() * 4, 0]); }
  }

  // the gate landing: rose and ivory paving with gold stars
  kit.add('paving', scaleUV(new THREE.PlaneGeometry(CHW * 2, CZ0 - FRONT).rotateX(-Math.PI / 2).translate(0, SILL + 0.25, (FRONT + CZ0) / 2), CHW / 4, (CZ0 - FRONT) / 8), '#ffffff');

  // ---- the great-lancet front: buttress pinnacles, four great lancets (A001) ----
  for (let x = -192.5; x <= 265; x += 25) {
    if (Math.abs(x) < 62 || [92, 168].some((c) => Math.abs(Math.abs(x) - c) < 28) || !clear(x, FRONT + 3, 2)) continue;
    kit.add('ivory', box(4, 100, 6, x, 50, FRONT + 3), IVORY);
    spirelets.push([x, 150, FRONT + 3, 1.1, 0]);
  }
  // A001: flowing glass in a deep rose-gold reveal, stepped white and rose orders, a gold hood
  // mould, a central mullion with gilded transoms, jamb colonnettes with gold capitals, a sill
  const greatWindow = (x, y, z, w, h) => {
    const hs = h - w * 0.866, kq = w / 35;
    kit.add('lancet', archPanel(w, h).translate(x, y, z - 1.2), '#ffffff');
    kit.add('ivory', archFrameGeometry(w, h, 0.9, 2.4).translate(x, y, z - 1.4), '#e0a888');                // the rose-gold reveal
    kit.add('ivory', archFrameGeometry(w + 1.8, h + 1.4, 1.4, 1.6).translate(x, y - 0.2, z), PEARL);       // first order
    kit.add('ivory', archFrameGeometry(w + 4.6, h + 3.4, 1.3, 1.2).translate(x, y - 0.4, z + 0.4), ROSE);  // second order
    kit.add('gold', new THREE.TubeGeometry(pointedArchPath(w + 7.4, h + 5), 40, 0.55, 5, false).translate(x, y - 0.6, z + 1.4), GOLD);   // hood mould
    kit.add('gold', new THREE.TubeGeometry(pointedArchPath(w - 0.3, h - 0.2), 40, 0.32, 4, false).translate(x, y, z - 0.7), GOLD);      // gold trim
    for (const sd of [-1, 1]) kit.add('ivory', box(1.6 * kq, 37 * kq, 1.2, x + sd * 5.6 * kq, y, z - 0.8), PEARL);   // stone mullions between the three lights
    kit.add('ivory', new THREE.TorusGeometry(11.4 * kq, 0.9 * kq, 5, 28).translate(x, y + 52 * (h / 69), z - 0.7), PEARL);   // the rose's stone ring
    kit.add('gold', new THREE.TorusGeometry(10.4 * kq, 0.35, 4, 28).translate(x, y + 52 * (h / 69), z - 0.3), GOLD);
    // (no gable over these in the owner's hi-res elevation: the arch rises into carved rose spandrels)
    const spandrel = spandrelGeometry(w + 9.6, 136.4 - y, 136.4 - y, w, h);
    const spuv = spandrel.attributes.uv, spp = spandrel.attributes.position;
    for (let i = 0; i < spp.count; i++) spuv.setXY(i, (spp.getX(i) + (w + 9.6) / 2) / 10, spp.getY(i) / 10);
    kit.add('petal', spandrel.translate(x, y, z - 1.3), '#ffffff');                                    // rose relief outside the pane's arch
    kit.add('gold', finialGeo(1.4).translate(x, y + h + 5.6, z + 1.4), GOLD);                           // a gold fleuron at the apex
    for (const sd of [-1, 1]) {
      kit.add('ivory', cyl(0.8, 0.8, hs, 8, x + sd * (w / 2 + 2.6), y, z + 0.8), PEARL);                  // colonnette
      kit.add('gold', box(2.4, 1, 2.4, x + sd * (w / 2 + 2.6), y + hs, z + 0.8), GOLD);                   // capital
      kit.add('ivory', box(2.4, 1.4, 2.4, x + sd * (w / 2 + 2.6), y - 1.4, z + 0.8), PEARL);              // base
    }
    kit.add('ivory', box(w + 8, 1.6, 3.4, x, y - 2.4, z + 0.8), PEARL);                                   // sill
  };
  // P01-05 girih relief panels in the piers between the great windows: a recessed gold-framed
  // square of the ten-point star over a lancet niche, set in a moulded surround
  for (const x of [-130, 130]) for (const [y, kind] of [[100, 'girih'], [64, 'niche']]) {
    const z = FRONT + 0.2;
    kit.add('ivory', box(12, 1.2, 1.6, x, y - 1, z + 0.8), PEARL); kit.add('ivory', box(12, 1.2, 1.6, x, y + (kind === 'girih' ? 12 : 30), z + 0.8), PEARL);
    for (const sd of [-1, 1]) kit.add('ivory', box(1.2, kind === 'girih' ? 14 : 32, 1.6, x + sd * 5.4, y - 1, z + 0.8), PEARL);
    if (kind === 'girih') { kit.add('pier', scaleUV(new THREE.PlaneGeometry(9.6, 11).translate(x, y + 5.5, z + 0.1), 1, 1).translate(0, 0, 0), '#ffffff'); kit.add('rose12', new THREE.CircleGeometry(3.6, 20).translate(x, y + 5.5, z + 0.5), '#ffffff'); kit.add('gold', new THREE.TorusGeometry(3.9, 0.3, 4, 20).translate(x, y + 5.5, z + 0.7), GOLD); }
    else lancet(kit, x, y + 1, 6, 26);
  }
  // the carved cobalt band under the lancet storey's cornice, with carved rose roundels in the spandrels
  kit.add('band', scaleUV(new THREE.PlaneGeometry(400, 5.4).translate(0, 145.5, FRONT + 0.35), 89, 1), '#ffffff');
  kit.add('carve', scaleUV(new THREE.PlaneGeometry(400, 5.6).translate(0, 139.4, FRONT + 0.3), 18, 1), '#ffffff');
  for (const y of [142.6, 148.4]) kit.add('gold', box(400, 0.6, 0.9, 0, y - 0.3, FRONT + 0.4), GOLD);
  for (const x of [-130, 130]) {
    kit.add('rose12', new THREE.CircleGeometry(4.2, 20).translate(x, 133, FRONT + 0.5), '#ffffff');
    kit.add('gold', new THREE.TorusGeometry(4.5, 0.35, 4, 20).translate(x, 133, FRONT + 0.7), GOLD);
  }
  for (const x of [-168, -92, 92, 168]) {
    greatWindow(x, 54, FRONT + 1.6, 39, 74);
    for (const sd of [-1, 1]) {                                                                         // slender gold-capped piers
      const px = x + sd * (39 / 2 + 6.5);
      kit.add('ivory', box(3.4, 84, 3.4, px, 54, FRONT + 2), IVORY);
      for (const y of [86, 112, 137]) kit.add('gold', box(3.9, 0.7, 3.9, px, y, FRONT + 2), GOLD);
      spirelets.push([px, 138, FRONT + 2, 0.9, 0]);
    }
  }
  for (const x of [-208, -130, 130, 208]) {                                                             // crystal lanterns on brackets between the windows
    kit.add('gold', box(1, 1, 5, x, 118, FRONT + 3), GOLD);
    hanging.push([x, 116, FRONT + 6, 2.4, 0]);
  }

  // ---- the Rose Gate (A003), part by part off sheets 03 and 02 (map: castle-previews/v7/front-elevation-map.md) ----
  // G1 a deep porch: the gable slab stands 9 m proud of the door, five archivolt orders stepping in to it
  // G2 the orders: ivory reveal, gold roll, the carved blue band of curved gold strokes, ivory roll, rose order
  // G3 the steep gable: gold raking mouldings with crockets, carved tympanum (cusped panels, scrolls,
  //    quatrefoil medallion), a tall gold finial
  // G4 jamb shafts (one per order) with gold annulets and lotus capitals
  // G5 buttress piers: twin colonnettes, a glass niche, a crystal lantern, gold capital band,
  //    a niche stage and a gold pinnacle cluster
  // G6 rose-glass lancet strips beside the piers; G7 the stained-glass door: lights, tracery tree, star medallion
  const PF = GZ + 9, PW = 44, GB = 148, GA = 196;                           // porch front, gable half width, base, apex
  const ORD = [0, 1, 2, 3, 4].map((k) => ({ w: GW + 3 + k * 3.2, h: GH + 2 + k * 2, z: GZ + 0.6 + k * 1.6 }));
  // The old backing box and fixed full-height pane made this look like a closed gate even
  // after its lower leaves swung away. Keep the 14 m deep masonry, but cut a real arch through it.
  const gateWall = new THREE.Mesh(paint(archWallGeometry(110, SILL, GB, GW, GH, SILL, GZ - FRONT).translate(0, 0, FRONT), PEARL), mats.wing);
  gateWall.name = 'palace-gate-arch-wall'; gateWall.castShadow = gateWall.receiveShadow = true; body.add(gateWall);
  const spring = GH - GW * 0.866, ceiling = SILL + spring;
  const fanlight = new THREE.Mesh(paint(fanlightGeometry(GW, GH).translate(0, SILL, GZ + 0.2), '#ffffff'), mats.gate);
  fanlight.name = 'palace-gate-fanlight'; fanlight.castShadow = false; body.add(fanlight);
  // A level gallery, 34 drawn metres deep, continuing through the central arcaded hall.
  const galleryFloor = new THREE.Mesh(paint(scaleUV(new THREE.PlaneGeometry(GW, GZ - 171).rotateX(-Math.PI / 2).translate(0, SILL + 0.015, (171 + GZ) / 2), 1.5, 1.5), '#ffffff'), mats.paving);
  galleryFloor.name = 'palace-gate-vestibule-floor'; galleryFloor.receiveShadow = true; body.add(galleryFloor);
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(paint(box(1.1, spring, GZ - 171, side * (GW / 2 + 0.55), SILL, (171 + GZ) / 2), PEARL), mats.ivory);
    wall.name = `palace-gate-vestibule-side-${side}`; wall.castShadow = wall.receiveShadow = true; body.add(wall);
  }
  const galleryCeiling = new THREE.Mesh(paint(box(GW + 2.2, 1.1, GZ - 171, 0, ceiling, (171 + GZ) / 2), PEARL), mats.wing);
  galleryCeiling.name = 'palace-gate-vestibule-ceiling'; galleryCeiling.castShadow = galleryCeiling.receiveShadow = true; body.add(galleryCeiling);
  const backFrame = new THREE.Mesh(paint(rectangularPortalFrame(60, SILL, ceiling + 1.65, GW, SILL, ceiling, 1.2).translate(0, 0, 171), PEARL), mats.wing);
  backFrame.name = 'palace-gate-vestibule-inner-arch'; backFrame.castShadow = backFrame.receiveShadow = true; body.add(backFrame);
  const backWall = new THREE.Mesh(paint(box(GW + 2.2, spring, 0.6, 0, SILL, 170.7), PEARL), mats.ivory);
  backWall.name = 'palace-gate-vestibule-back-wall'; backWall.castShadow = backWall.receiveShadow = true; body.add(backWall);
  ORD.forEach(({ w, h, z }, k) => {
    kit.add('ivory', archFrameGeometry(w, h, 1.8, 1.6).translate(0, SILL - 0.4, z), k === 4 ? ROSE : (k % 2 ? IVORY : PEARL));
    if (k === 1 || k === 3) kit.add('gold', new THREE.TubeGeometry(pointedArchPath(w + 0.2, h + 0.4), 48, k === 1 ? 0.7 : 0.5, 6, false).translate(0, SILL - 0.4, z + 0.8), GOLD);   // gold rolls
    if (k === 3) kit.add('ivory', new THREE.TubeGeometry(pointedArchPath(w + 2.2, h + 1.6), 48, 1.1, 6, false).translate(0, SILL - 0.4, z + 0.9), PEARL);                           // ivory roll
  });
  kit.add('gold', new THREE.TubeGeometry(pointedArchPath(GW - 0.2, GH - 0.1), 48, 0.45, 5, false).translate(0, SILL, GZ + 0.5), GOLD);   // gold edge on the glass
  // G3 the porch slab: gable over the arch, carved tympanum
  {
    const hw = ORD[4].w / 2 + 1.8, hh = ORD[4].h + 2.2;
    // the gable rises as a tall pointed arch, its sides swelling out before they meet (owner's hi-res elevation)
    const sh = new THREE.Shape(); sh.moveTo(-PW, SILL - 2); sh.lineTo(PW, SILL - 2); sh.lineTo(PW, GB);
    const GH2 = GA - GB;                                                                                 // an ogee: swelling out, then drawn in to a fine point
    sh.bezierCurveTo(PW * 0.98, GB + GH2 * 0.55, PW * 0.12, GA - GH2 * 0.25, 0, GA); sh.bezierCurveTo(-PW * 0.12, GA - GH2 * 0.25, -PW * 0.98, GB + GH2 * 0.55, -PW, GB); sh.lineTo(-PW, SILL - 2);
    sh.holes.push(new THREE.Path(pointedArchShape(hw * 2, hh).getPoints(24).map((p) => new THREE.Vector2(p.x, p.y + SILL - 0.4))));
    const slab = new THREE.ExtrudeGeometry(sh, { depth: 3, bevelEnabled: false, curveSegments: 16 });
    const p = slab.attributes.position, uv = slab.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + PW) / (PW * 2), (p.getY(i) - GB) / (GA - GB));
    kit.add('gable', slab.translate(0, 0, PF - 3), '#ffffff');
    {                                                                                                   // rose petal relief filling the tympanum (owner, 12 Oct: "still detailing required")
      const ins = new THREE.Shape(), IW = PW - 7, y0 = GB - 3, y1 = GA - 10;
      ins.moveTo(-IW, y0); ins.lineTo(IW, y0);
      ins.bezierCurveTo(IW * 0.98, y0 + (y1 - y0) * 0.55, IW * 0.12, y1 - (y1 - y0) * 0.25, 0, y1); ins.bezierCurveTo(-IW * 0.12, y1 - (y1 - y0) * 0.25, -IW * 0.98, y0 + (y1 - y0) * 0.55, -IW, y0);
      const pg = new THREE.ShapeGeometry(ins, 20), pp = pg.attributes.position, pu = pg.attributes.uv;
      for (let i = 0; i < pp.count; i++) pu.setXY(i, pp.getX(i) / 10, pp.getY(i) / 10);
      kit.add('petal', pg.translate(0, 0, PF + 0.08), '#ffffff');
    }
    kit.add('band', archRibbon(hw * 2, hh, 3.6, 4.5).translate(0, SILL - 0.4, PF + 0.06), '#ffffff');                                      // the carved band of curved gold strokes
    kit.add('gold', new THREE.TubeGeometry(pointedArchPath(hw * 2 - 0.2, hh - 0.2), 48, 0.6, 6, false).translate(0, SILL - 0.4, PF + 0.3), GOLD);   // inner gold edge
    kit.add('gold', new THREE.TubeGeometry(pointedArchPath(hw * 2 + 7.4, hh + 4.6), 48, 0.85, 6, false).translate(0, SILL - 0.6, PF + 0.4), GOLD);   // hood mould
    for (const sd of [-1, 1]) kit.add('gold', box(6.5, 1.4, 4, sd * 42.5, GB - 1.4, PF - 1.6), GOLD);                                              // string course at the gable foot
    const rake = (sd, inset, z) => new THREE.CubicBezierCurve3(new THREE.Vector3(sd * (PW - inset), GB - 1, z), new THREE.Vector3(sd * (PW * 0.98 - inset), GB + GH2 * 0.55 - inset * 0.3, z), new THREE.Vector3(sd * Math.max(0, PW * 0.12 - inset * 0.6), GA - GH2 * 0.25 - inset * 1.2, z), new THREE.Vector3(0, GA - inset * 1.6, z));
    for (const sd of [-1, 1]) {
      kit.add('gold', new THREE.TubeGeometry(rake(sd, -1.6, PF + 0.3), 32, 0.45, 5, false), GOLD);             // outer gold edge
      kit.add('gold', new THREE.TubeGeometry(rake(sd, 0, PF + 0.4), 32, 1.4, 6, false), GOLD);                 // gold raking moulding
      kit.add('ivory', new THREE.TubeGeometry(rake(sd, 3.2, PF + 0.6), 32, 1.7, 6, false), PEARL);            // the thick ivory moulding
      kit.add('gold', new THREE.TubeGeometry(rake(sd, 5.6, PF + 0.5), 32, 0.4, 4, false), GOLD);             // inner gold edge
      const c = rake(sd, -2.8, PF + 0.2);
      for (let t = 0.05; t < 0.95; t += 0.06) {                                                          // gold leaf crockets up the rakes
        const q = c.getPoint(t), tg = c.getTangent(t), a = Math.atan2(tg.y, tg.x);
        kit.add('gold', new THREE.OctahedronGeometry(1.5, 0).scale(1.7, 0.8, 0.7).rotateZ(a + sd * 0.5).translate(q.x, q.y, q.z + 0.4), GOLD);
        kit.add('gold', new THREE.SphereGeometry(0.55, 5, 3).translate(q.x - tg.y * sd * 1.2, q.y + Math.abs(tg.x) * 1.2, q.z + 0.4), GOLD);
      }
    }
    for (const sd of [-1, 1]) for (const [t, r] of [[0.32, 2.2], [0.62, 1.8]]) {                        // carved gold scrolls in the tympanum
      const q = rake(sd, 9, PF + 0.3).getPoint(t);
      kit.add('gold', new THREE.TorusGeometry(r, 0.3, 4, 14, Math.PI * 1.5).rotateZ(sd > 0 ? 0 : Math.PI).translate(q.x, q.y, PF + 0.3), GOLD);
    }
    kit.add('gold', ring(2.8, 1.6, GA - 1, 12), GOLD);                                                    // the tall crocketed gold finial
    kit.add('gold', needle(2.4, 22, 8).translate(0, GA + 0.6, PF - 0.6), GOLD);
    for (const [dy, r] of [[5, 2.4], [10, 1.8], [15, 1.2]]) for (const sd of [-1, 1]) kit.add('gold', new THREE.OctahedronGeometry(0.8, 0).scale(1.6, 0.8, 0.7).rotateZ(sd * 0.5).translate(sd * r, GA + dy, PF - 0.6), GOLD);
    kit.add('gold', finialGeo(4).translate(0, GA + 20, PF - 0.6), GOLD);
    for (const sd of [-1, 1]) {                                                                           // P02-5C: crystal pendants off the star's arms
      kit.add('gold', box(0.25, 2.4, 0.25, sd * 2.2, GA + 22.4, PF - 0.6), GOLD);
      kit.add('crystal', new THREE.OctahedronGeometry(0.7, 0).scale(0.7, 1.5, 0.7).translate(sd * 2.2, GA + 21.6, PF - 0.6), '#b8c8ff');
    }
    kit.add('ivory', lotusGeo().scale(4.2, 4.6, 3).translate(0, SILL - 0.6 + hh + 4.6 - 1.4, PF + 1.2), '#fbe8e2');   // A003 lotus keystone
    kit.add('gold', lathe([[0, -0.2], [0.55, -0.12], [0.75, 0.08], [0, 0.12]], 12).scale(4.2, 4.6, 3).translate(0, SILL - 0.6 + hh + 4.6 - 1.4, PF + 1.2), GOLD);
    {                                                                                                   // P01-02 twelve-petal rose in the tympanum
      let ry = GB + 23, rr = 9.6;                                                                        // the cobalt medallion with its gold star, in a lobed ivory frame
      kit.add('medallion', new THREE.CircleGeometry(rr, 40).translate(0, ry, PF + 0.15), '#ffffff');
      kit.add('gold', new THREE.TorusGeometry(rr + 0.2, 0.45, 6, 40).translate(0, ry, PF + 0.4), GOLD);
      kit.add('ivory', new THREE.TorusGeometry(rr + 1.3, 0.9, 6, 40).translate(0, ry, PF + 0.4), PEARL);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; kit.add('ivory', new THREE.TorusGeometry(2.4, 0.7, 4, 14).translate(Math.cos(a) * (rr + 3.6), ry + Math.sin(a) * (rr + 3.6), PF + 0.3), PEARL); kit.add('gold', new THREE.SphereGeometry(0.6, 5, 3).translate(Math.cos(a) * (rr + 3.6), ry + Math.sin(a) * (rr + 3.6), PF + 0.6), GOLD); }
      kit.add('gold', new THREE.TorusGeometry(rr + 6.4, 0.35, 4, 48).translate(0, ry, PF + 0.3), GOLD);
      rr += 4.6;
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) kit.add('gold', new THREE.OctahedronGeometry(0.9, 0).scale(dx ? 1.3 : 0.7, dy ? 1.3 : 0.7, 0.4).translate(dx * (rr + 1.4), ry + dy * (rr + 1.4), PF + 0.3), GOLD);
    }
    for (const sd of [-1, 1]) kit.add('gold', lathe([[0, 0], [0.9, 0.6], [0.5, 2.6], [0, 3.6]], 6).translate(sd * 2.6, GA + 3, PF - 0.6), GOLD);
  }
  const roseY = GB + 17;
  // G4 jamb shafts, one per order, gold annulets and lotus capitals at the springing
  // A010 / P01-C lotus capital: gold sawtooth necking, an ivory bell ringed by gold-edged petals, a gold abacus
  const lotusCapital = (x, y, z, r) => {
    kit.add('gold', cyl(r * 1.12, r * 1.12, r * 0.7, 10, x, y, z), GOLD);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; kit.add('gold', new THREE.ConeGeometry(r * 0.28, r * 0.55, 3).translate(Math.cos(a) * r * 1.14, y + r * 0.42, Math.sin(a) * r * 1.14).translate(x, 0, z), GOLD); }   // sawtooth
    kit.add('ivory', lathe([[r, 0], [r * 1.25, r * 0.7], [r * 1.75, r * 1.7], [r * 2.05, r * 2.3], [0, r * 2.3]], 10).translate(x, y + r * 0.7, z), PEARL);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, petal = new THREE.SphereGeometry(1, 5, 4).scale(r * 0.55, r * 1.05, r * 0.2).translate(0, r * 1.05, 0).rotateX(0.38).translate(0, 0, r * 1.05).rotateY(a).translate(x, y + r * 0.7, z);
      kit.add(i % 2 ? 'gold' : 'ivory', petal, i % 2 ? GOLD : '#fbeee6');
    }
    kit.add('gold', box(r * 4.6, r * 0.5, r * 4.6, x, y + r * 3, z), GOLD);
  };
  const hsp = GH - GW * 0.866;
  ORD.forEach(({ w, z }, k) => {
    for (const sd of [-1, 1]) {
      const x = sd * (w / 2 + 0.9), zz = z + 0.6, top = SILL + hsp + k * 2 - 3;
      kit.add('shaft', scaleUV(cyl(0.75, 0.75, top - SILL, 8, x, SILL, zz, true), 2, (top - SILL) / 7), k % 2 ? ROSE : PEARL);
      for (const f of [0.25, 0.5, 0.75]) kit.add('gold', ring(1, 0.6, SILL + (top - SILL) * f, 8).translate(x, 0, zz), GOLD);
      lotusCapital(x, top, zz, 0.72);
      kit.add('ivory', box(2.2, 1.6, 2.2, x, SILL, zz), PEARL); kit.add('gold', ring(1.05, 0.5, SILL + 1.6, 8).translate(x, 0, zz), GOLD);
    }
  });
  // G5 buttress piers either side of the porch: carved fluted faces, clustered shafts, a great crystal lantern
  for (const sd of [-1, 1]) {
    const cx = sd * 46.5, z1 = PF + 4, d = z1 - FRONT, cz = (FRONT + z1) / 2;
    kit.add('pier', wallBox(15, GB - 50, d, cx, 50, cz, 15, GB - 50), '#ffffff', '#f4c4cc');
    kit.add('ivory', box(16.4, 3, d + 1.4, cx, 50, cz), ROSE);                                               // plinth
    kit.add('gold', box(16.6, 0.6, d + 1.6, cx, 53, cz), GOLD);
    for (const dx of [-5, 5]) {                                                                             // clustered shafts on the face
      for (const [ox, oz, tint] of [[-1.3, 0.3, PEARL], [1.3, 0.3, PEARL], [0, 1.5, ROSE]]) {
        kit.add('shaft', scaleUV(cyl(0.8, 0.8, GB - 62, 8, cx + dx + ox, 54, z1 + oz, true), 2, (GB - 62) / 7), tint);
        for (const y of [66, 82, 98, 114, 130]) kit.add('gold', ring(1.05, 0.7, y, 8).translate(cx + dx + ox, 0, z1 + oz), GOLD);
      }
      kit.add('ivory', box(5, 2.2, 4, cx + dx, 53, z1 + 0.8), PEARL);
      lotusCapital(cx + dx, GB - 8, z1 + 0.8, 1.15);
    }
    kit.add('lancet', archPanel(5, 14).translate(cx, 98, z1 + 0.15), '#ffffff');                           // glass niche over the girih panel
    kit.add('gold', new THREE.TubeGeometry(pointedArchPath(6, 14.6), 24, 0.35, 4, false).translate(cx, 98, z1 + 0.3), GOLD);
    kit.add('gold', box(1.2, 1.2, 8, cx, 83, z1 + 4), GOLD); kit.add('gold', new THREE.TorusGeometry(1.6, 0.35, 4, 10, Math.PI).rotateY(Math.PI / 2).translate(cx, 81.4, z1 + 1.6), GOLD);
    hanging.push([cx, 82, z1 + 7.6, 7.5, 0]);                                                               // a great crystal lantern on a scrolled bracket
    kit.add('gold', box(16.8, 1.6, d + 1.8, cx, GB - 1.6, cz), GOLD);                                       // gold capital band
    kit.add('ivory', box(11, 22, 11, cx, GB, z1 - 7), PEARL);                                               // the niche stage
    kit.add('lancet', archPanel(4, 15).translate(cx, GB + 3, z1 - 1.4), '#ffffff');
    kit.add('gold', new THREE.TubeGeometry(pointedArchPath(5, 15.8), 20, 0.3, 4, false).translate(cx, GB + 3, z1 - 1.3), GOLD);
    for (const ex of [-4.6, 4.6]) { kit.add('ivory', cyl(0.5, 0.5, 18, 6, cx + ex, GB + 2, z1 - 1.2), ROSE); kit.add('gold', ring(0.75, 0.6, GB + 19, 6).translate(cx + ex, 0, z1 - 1.2), GOLD); }
    kit.add('gold', box(12, 1, 12, cx, GB + 22, z1 - 7), GOLD);
    kit.add('gold', needle(3.4, 24, 8).translate(cx, GB + 23, z1 - 7), GOLD);                                // gold pinnacle cluster
    kit.add('gold', finialGeo(2).translate(cx, GB + 46, z1 - 7), GOLD);
    for (const [ex, ez] of [[-5, -5], [5, -5], [-5, 5], [5, 5]]) spirelets.push([cx + ex, GB + 23, z1 - 7 + ez, 0.8, 0]);
    solids.push({ minX: cx - 8, maxX: cx + 8, minZ: FRONT, maxZ: z1 + 1, y0: 40, y1: GB + 50 });
    // G6 rose-glass lancet strip beside the pier
    kit.add('ivory', box(9, GB - 54, 3, sd * 59.5, 52, FRONT + 1.5), IVORY);
    kit.add('lancet', archPanel(4.6, 84).translate(sd * 59.5, 58, FRONT + 3.1), '#ffb0c8');
    kit.add('gold', new THREE.TubeGeometry(pointedArchPath(5.6, 84.6), 24, 0.3, 4, false).translate(sd * 59.5, 58, FRONT + 3.2), GOLD);
    cypress.push([sd * 47, SILL, PF + 12, 16, 0]);                                                       // the topiary cones before the piers
  }
  // the light from the door spilling out over the jambs and the landing, fading as it spreads
  {
    const spill = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), additive('#c8c0ff', { map: glowTexture(), opacity: 0.12, depthWrite: false }));
    spill.scale.set(GW * 1.9, GH * 1.25, 1); spill.position.set(0, SILL + 26, GZ + 2.2); spill.name = 'gate-light'; body.add(spill);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), additive('#ffd0ec', { map: glowTexture(), opacity: 0.5, depthWrite: false }));
    pool.scale.set(GW * 1.6, 1, 30); pool.position.set(0, SILL + 0.5, GZ + 12); body.add(pool);
  }
  // G7 the door leaves: the lower half of the stained-glass door, each swinging on its jamb
  const lt = doorTex(), leafMat = toon('#ffffff', { map: lt.map, emissiveMap: lt.glow, emissive: '#b0a0ff', emissiveIntensity: 0.6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2 });
  const hs = hsp;
  const leaves = [-1, 1].map((sd) => {
    const pivot = new THREE.Group(); pivot.position.set(sd * GW / 2, SILL, GZ + 0.4);
    const geo = new THREE.PlaneGeometry(GW / 2, hs).translate(-sd * GW / 4, hs / 2, 0), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (sd < 0 ? 0 : 0.5) + uv.getX(i) * 0.5, uv.getY(i) * (hs / GH));
    const leaf = new THREE.Mesh(geo, leafMat);
    leaf.name = sd < 0 ? 'palace-gate-leaf-left' : 'palace-gate-leaf-right';
    pivot.add(leaf); body.add(pivot);
    return { pivot, leaf, s: sd };
  });
  let gateOpen = 0, gateTarget = 0, gateHold = 0;
  const leafColliders = leaves.map(() => ({ minX: 0, maxX: 0, minZ: 0, maxZ: 0, y0: CASTLE.y, y1: CASTLE.y + hs * S, gateLeaf: true }));
  const updateLeafColliders = () => leaves.forEach(({ s }, i) => {
    const c = leafColliders[i], a = s * gateOpen * 1.45, ca = Math.cos(a), sa = Math.sin(a);
    const x0 = s < 0 ? 0 : -GW / 2, x1 = s < 0 ? GW / 2 : 0;
    const px = s * GW / 2, pz = GZ + 0.4;
    const xa = px + x0 * ca, xb = px + x1 * ca;
    const za = pz - x0 * sa, zb = pz - x1 * sa;
    c.minX = Math.min(xa, xb) * S - 0.4; c.maxX = Math.max(xa, xb) * S + 0.4;
    c.minZ = Math.min(za, zb) * S - 0.4; c.maxZ = Math.max(za, zb) * S + 0.4;
  });

  // ---- the cascade court: a three-basin water stair between curved sideways stairs (owner, 12 Oct):
  // from the gate landing each flight sweeps outward and down to the upper terrace between carved
  // balustrades with gold-urned newels and lamps; planted rose slopes fill the ground in between ----
  const flightLen = Math.hypot(CZ1 - CZ0, SILL), flightA = Math.atan2(SILL, CZ1 - CZ0);
  const rampY = (z) => SILL * (1 - THREE.MathUtils.clamp((z - CZ0) / (CZ1 - CZ0), 0, 1));
  const SHW = 13, NSEG = 44;
  const baluster = lathe([[0.5, 0], [0.3, 0.6], [0.62, 1.6], [0.25, 2.6], [0.45, 3.1], [0, 3.15]], 6);
  for (const sd of [-1, 1]) {
    const c = new THREE.QuadraticBezierCurve3(new THREE.Vector3(sd * 42, 0, CZ0 + 2), new THREE.Vector3(sd * 104, 0, CZ0 + 14), new THREE.Vector3(sd * 106, 0, CZ1 + 2));
    const pts = c.getSpacedPoints(NSEG);
    for (let i = 0; i < NSEG; i++) {
      const a = pts[i], b = pts[i + 1], L = a.distanceTo(b), yaw = Math.atan2(b.x - a.x, b.z - a.z);
      const ya = rampY(a.z), yb = rampY(b.z), mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2, tilt = -Math.atan2(yb - ya, L);
      const n = Math.max(1, Math.round((ya - yb) / 0.16)), tread = new THREE.BoxGeometry(SHW * 2, 0.8, Math.hypot(L, ya - yb) + 0.3);
      const uv = tread.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, uv.getX(j), uv.getY(j) * n);
      kit.add('steps', tread.rotateX(tilt).rotateY(yaw).translate(mx, (ya + yb) / 2 - 0.4, mz), '#ffffff');
      kit.add('ivory', new THREE.BoxGeometry(SHW * 0.44, 0.1, Math.hypot(L, ya - yb) + 0.3).rotateX(tilt).rotateY(yaw).translate(mx, (ya + yb) / 2 + 0.04, mz), '#f4c6d0');   // the rose runner
      const h = Math.max(0.2, Math.min(ya, yb) - 0.6);
      kit.add('ivory', new THREE.BoxGeometry(SHW * 2 + 2.4, h, L + 0.2).rotateY(yaw).translate(mx, h / 2, mz), ROSE);                  // the carved stringer under the flight
      if (i % 4 === 2) kit.add('gold', new THREE.BoxGeometry(SHW * 2, 0.25, 0.4).rotateY(yaw).translate(mx, (ya + yb) / 2 + 0.1, mz), GOLD);
    }
    for (const side of [-1, 1]) {                                                              // carved balustrades on both edges
      const rail = [];
      for (let i = 0; i <= NSEG; i++) {
        const t = i / NSEG, p = c.getPointAt(t), tg = c.getTangentAt(t), o = side * (SHW + 0.6);
        const q = new THREE.Vector3(p.x + tg.z * o, rampY(p.z), p.z - tg.x * o);
        rail.push(q);
        kit.add('ivory', baluster.clone().translate(q.x, q.y + 0.6, q.z), PEARL);
        if (i % 11 === 0) {                                                                  // newels with gold urns and lamps
          kit.add('ivory', box(2.8, 5, 2.8, q.x, q.y, q.z), PEARL);
          kit.add('gold', box(3.2, 0.5, 3.2, q.x, q.y + 4.6, q.z), GOLD);
          kit.add('gold', lathe([[0, 0], [1.6, 1], [1, 2.6], [1.9, 4], [0, 5.2]], 10).translate(q.x, q.y + 5.1, q.z), GOLD);
          clumps.push([q.x, q.y + 9.6, q.z, 2.4, t * 9]);
        }
        if (i % 4 === 0) lamps.push([wx(q.x), wy(q.y), wz(q.z), 1, 0]);
      }
      const at = (dy) => new THREE.CatmullRomCurve3(rail.map((q) => new THREE.Vector3(q.x, q.y + dy, q.z)));
      kit.add('ivory', new THREE.TubeGeometry(at(0.5), NSEG * 2, 0.6, 5, false), PEARL);
      kit.add('ivory', new THREE.TubeGeometry(at(3.9), NSEG * 2, 0.62, 6, false), PEARL);
      kit.add('gold', new THREE.TubeGeometry(at(4.55), NSEG * 2, 0.2, 4, false), GOLD);
    }
    // the planted slope between the water stair and the flight, over the podium wedge
    const xa = sd > 0 ? CW : -CHW, xb = sd > 0 ? CHW : -CW;
    const wedge = new THREE.Shape([new THREE.Vector2(CZ0, 0), new THREE.Vector2(CZ1, 0), new THREE.Vector2(CZ0, SILL)]);
    kit.add('podium', scaleUV(new THREE.ExtrudeGeometry(wedge, { depth: xb - xa, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(xb, 0, 0), 0.04, 0.02), ROSE);
    kit.add('garden', scaleUV(new THREE.PlaneGeometry(CHW - CW, flightLen).rotateX(flightA - Math.PI / 2).translate((xa + xb) / 2, SILL / 2 + 0.2, (CZ0 + CZ1) / 2), (CHW - CW) / 10, flightLen / 10), '#ffffff');
    const rx = sd * (CW + 0.5);                                                               // the cascade's own balustrade
    const railG = new THREE.PlaneGeometry(flightLen, 1.2).rotateZ(-flightA).rotateY(-Math.PI / 2);
    kit.add('jali', scaleUV(railG, flightLen / 1.2, 1).translate(rx, SILL / 2 + 0.7, (CZ0 + CZ1) / 2), IVORY);
    for (let t = 0; t <= 1.001; t += 1 / 12) lamps.push([wx(rx), wy(SILL * (1 - t)), wz(CZ0 + (CZ1 - CZ0) * t), 1, 0]);
    for (let t = 0; t <= 1.001; t += 0.25) {
      const y = SILL * (1 - t), z = CZ0 + (CZ1 - CZ0) * t;
      kit.add('ivory', box(3, 4.5, 3, rx, y, z), PEARL);
      kit.add('gold', lathe([[0, 0], [1.6, 1], [1, 2.6], [1.9, 4], [0, 5.2]], 10).translate(rx, y + 4.5, z), GOLD);
      clumps.push([rx, y + 9, z, 3, t * 9]);
    }
    for (let k = 0; k < 26; k++) {                                                            // roses and cypress on the slope, clear of the flight
      const t = 0.04 + R() * 0.92, p = c.getPointAt(t), room = Math.abs(p.x) - SHW - 3 - CW - 4;
      if (room < 3) continue;
      const x = sd * (CW + 4 + R() * room), z = p.z + (R() - 0.5) * 6;
      if (k % 4 === 0) cypress.push([x, rampY(z), z, 8 + R() * 3, 0]); else clumps.push([x, rampY(z) + 0.4, z, 2.6 + R(), R() * 9]);
    }
  }
  {
    const basins = [[CZ0, 270, SILL * 2 / 3], [270, 305, SILL / 3], [305, CZ1, 1]];
    let yTop = SILL;
    for (const [z0, z1, y] of basins) {
      kit.add('podium', wallBox(CW * 2, y + 4, z1 - z0, 0, -4, (z0 + z1) / 2, 24, 52), ROSE);
      water.push(new THREE.PlaneGeometry(CW * 2 - 2, z1 - z0 - 1).rotateX(-Math.PI / 2).translate(0, y + 0.2, (z0 + z1) / 2));
      falls.push(new THREE.PlaneGeometry(CW * 2 - 4, yTop - y, 1, 8).translate(0, (yTop + y) / 2, z0 + 0.3));
      for (const x of [-18, -6, 6, 18]) sprays.push([x, y + 0.2, (z0 + z1) / 2, 1.4]);
      // L02-7 scalloped spillway lip over each fall, gold-edged; white foam where the fall lands
      if (z0 > CZ0 + 1) {
        const n = Math.floor((CW * 2 - 2) / 3.2);
        for (let i = 0; i < n; i++) kit.add('ivory', new THREE.CylinderGeometry(1.6, 1.6, 0.9, 10, 1, false, Math.PI / 2, Math.PI).translate(-CW + 1 + 1.6 + i * 3.2, yTop - 0.45, z0), PEARL);
        kit.add('gold', box(CW * 2, 0.35, 0.5, 0, yTop, z0 - 0.2), GOLD);
      }
      foam.push(new THREE.PlaneGeometry(CW * 2 - 3, 3.5).rotateX(-Math.PI / 2).translate(0, y + 0.3, z0 + 2.2));
      yTop = y;
    }
  }

  // ---- the corner towers, copied part by part from the owner's hi-res elevation (right tower x 415-488,
  // y -6 to 201): a stepped marble plinth with pilasters, gold-framed panels and a small blue arched light;
  // a gold brocade cornice; an octagonal shaft on moulded bases with gold spikes at the angles; on each
  // main face a great star window in a thick gold frame standing on a gold fleur; on the diagonals a tall
  // rose-violet light over a small blue window; gold-capped colonnettes; a brocade frieze, corbels and a
  // jali gallery with pinnacles; an arcaded drum of dark blue lights with gold crockets; a plain dark pink
  // onion dome on a gold crest; a gold knob and a gold cross; crystal lanterns on gold scroll brackets ----
  const band4 = (k, key, w, h, y, col) => k.add(key, scaleUV(new THREE.CylinderGeometry(w * Math.SQRT1_2, w * Math.SQRT1_2, h, 4, 1, true).rotateY(Math.PI / 4).translate(0, y + h / 2, 0), Math.max(1, Math.round(w / 2)), 1), col);
  const lantern = (k, lx, ly, lz, s, hang) => {                    // a hexagonal crystal lantern, s = the glass height
    const yb = hang ? ly - 1.05 * s - s : ly + 0.45 * s, yt = yb + s;
    k.add('crystal', cyl(0.46 * s, 0.38 * s, s, 6, lx, yb, lz), '#a8bcff');
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; k.add('gold', cyl(0.035 * s, 0.035 * s, s, 4, lx + Math.cos(a) * 0.43 * s, yb, lz + Math.sin(a) * 0.43 * s), GOLD); }
    k.add('gold', cyl(0.52 * s, 0.5 * s, 0.09 * s, 6, lx, yt, lz), GOLD);
    k.add('gold', new THREE.ConeGeometry(0.5 * s, 0.42 * s, 6).translate(lx, yt + 0.3 * s, lz), GOLD);
    k.add('gold', new THREE.SphereGeometry(0.1 * s, 6, 4).translate(lx, yt + 0.56 * s, lz), GOLD);
    k.add('gold', cyl(0.42 * s, 0.4 * s, 0.08 * s, 6, lx, yb - 0.08 * s, lz), GOLD);
    k.add('gold', new THREE.ConeGeometry(0.36 * s, 0.34 * s, 6).rotateX(Math.PI).translate(lx, yb - 0.25 * s, lz), GOLD);
    k.add('gold', new THREE.SphereGeometry(0.09 * s, 6, 4).translate(lx, yb - 0.46 * s, lz), GOLD);
    k.add('gold', new THREE.ConeGeometry(0.06 * s, 0.3 * s, 4).rotateX(Math.PI).translate(lx, yb - 0.66 * s, lz), GOLD);
    if (hang) k.add('gold', cyl(0.03 * s, 0.03 * s, 0.4 * s, 4, lx, yt + 0.62 * s, lz), GOLD);
    else { k.add('gold', new THREE.ConeGeometry(0.05 * s, 0.4 * s, 4).translate(lx, yt + 0.8 * s, lz), GOLD); k.add('gold', cyl(0.2 * s, 0.3 * s, 0.4 * s, 6, lx, ly, lz), GOLD); }
    const p = k.world(lx, 0, lz); halosD.push([p.x, yb + s / 2, p.z, 1.2 * s]);
  };
  for (const [x, z] of CORNERS) {
    const r = 33, ap = r * 0.924, fw = r * 0.765, out = Math.sign(x);
    kit.frame(x, 0, z);
    // the plinth: a base step, a body with pilasters and framed panels, a cornice and a brocade band
    kit.add('ashlar', wallBox(78, 6, 78, 0, -6, 0, 12, 12), '#fbe8e8', '#f0c4ca');
    kit.add('ivory', box(79, 1, 79, 0, 0, 0), PEARL); kit.add('gold', box(79.4, 0.4, 79.4, 0, 1, 0), GOLD);
    kit.add('ashlar', wallBox(72, 14, 72, 0, 1, 0, 12, 12), '#fff6f2', '#f4cdd2');
    for (let f = 0; f < 4; f++) {
      const a = f * Math.PI / 2;
      kit.frame(x + Math.sin(a) * 36, 0, z + Math.cos(a) * 36, a);
      for (const u of [-34, -12, 12, 34]) { kit.add('ivory', box(4, 13, 1.4, u, 1.4, 0.7), PEARL); kit.add('gold', box(4.8, 0.8, 1.8, u, 13.6, 0.9), GOLD); }
      for (const u of [-23, 23]) {                                          // gold-framed rose-marble panels
        kit.add('ivory', box(15, 9, 0.5, u, 3.4, 0.25), '#f6d2d8');
        for (const [w, h, du, y] of [[15.6, 0.5, 0, 3.1], [15.6, 0.5, 0, 12.4], [0.5, 9.8, -7.6, 3.1], [0.5, 9.8, 7.6, 3.1]]) kit.add('gold', box(w, h, 0.9, u + du, y, 0.5), GOLD);
        kit.add('gold', new THREE.OctahedronGeometry(1.6, 0).scale(1, 1.4, 0.4).translate(u, 7.9, 0.7), GOLD);
      }
      if (f === 0 || (f === 1 && out > 0) || (f === 3 && out < 0)) lancet(kit, 0, 1.8, 9, 12);            // the plinth's small blue arched light
      kit.frame(x, 0, z);
    }
    kit.add('ivory', box(76, 2.4, 76, 0, 15, 0), PEARL); kit.add('gold', box(76.4, 0.4, 76.4, 0, 17.2, 0), GOLD);
    band4(kit, 'brocade', 75, 3, 17.6, '#ffffff');                                                       // gold brocade
    kit.add('ivory', box(74, 1.2, 74, 0, 20.6, 0), PEARL);
    // the shaft's base mouldings, with gold spikes at the angles
    kit.add('ivory', ring(r + 4, 3, 21.8, 8).rotateY(Math.PI / 8), ROSE);
    kit.add('ivory', ring(r + 2.4, 3.2, 24.8, 8).rotateY(Math.PI / 8), PEARL);
    kit.add('gold', ring(r + 2.6, 0.6, 28, 8).rotateY(Math.PI / 8), GOLD);
    kit.add('ivory', ring(r + 1.2, 1.4, 28.6, 8).rotateY(Math.PI / 8), PEARL);
    kit.add('ivory', oct(r, 82, 30), PEARL, '#f6d6da');                                                 // the shaft
    kit.add('gold', ring(r + 0.6, 0.8, 30, 8).rotateY(Math.PI / 8), GOLD);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, ca = a + Math.PI / 8, cxx = Math.sin(ca) * (r + 0.8), czz = Math.cos(ca) * (r + 0.8);
      kit.add('ivory', cyl(1.3, 1.3, 76, 6, cxx, 31, czz), PEARL);                                         // angle colonnettes
      kit.add('gold', cyl(1.9, 2.3, 1.6, 6, cxx, 30.4, czz), GOLD);
      kit.add('gold', cyl(2.6, 1.4, 3.4, 6, cxx, 107, czz), GOLD);                                         // gold capitals
      kit.add('gold', new THREE.OctahedronGeometry(1.4, 0).scale(1, 1.6, 1).translate(cxx * 1.02, 105.4, czz * 1.02), GOLD);
      const sx = Math.sin(ca) * (r + 2.6), sz = Math.cos(ca) * (r + 2.6);                                  // gold spikes on the base
      kit.add('gold', new THREE.ConeGeometry(1.1, 7, 6).translate(sx, 33.5, sz), GOLD);
      kit.add('gold', new THREE.SphereGeometry(1.1, 6, 4).translate(sx, 30.6, sz), GOLD);
      kit.frame(x + Math.sin(a) * ap, 0, z + Math.cos(a) * ap, a);
      if (i % 2 === 0) {                                                                                  // the great star window
        const ww = fw * 0.8, wy0 = 44, wh = 66;
        kit.add('starwin', archPanel(ww, wh).translate(0, wy0, 0.2), '#ffffff');
        kit.add('gold', new THREE.TubeGeometry(pointedArchPath(ww + 1.6, wh + 0.8), 32, 0.9, 6, false).translate(0, wy0 - 0.2, 0.7), GOLD);     // the thick gold frame
        kit.add('ivory', new THREE.TubeGeometry(pointedArchPath(ww + 4.2, wh + 2.2), 32, 0.8, 5, false).translate(0, wy0 - 0.6, 0.6), PEARL);
        kit.add('gold', new THREE.TubeGeometry(pointedArchPath(ww + 6, wh + 3.4), 32, 0.35, 4, false).translate(0, wy0 - 0.8, 0.9), GOLD);
        kit.add('gold', box(ww + 3, 1.2, 1.8, 0, wy0 - 1.4, 0.9), GOLD);
        // the gold fleur at its foot
        kit.add('gold', box(15, 1, 1.4, 0, 37.6, 0.7), GOLD);
        kit.add('gold', new THREE.OctahedronGeometry(2.6, 0).scale(1, 1.8, 0.45).translate(0, 43, 1.2), GOLD);
        for (const sd of [-1, 1]) {
          kit.add('gold', new THREE.TorusGeometry(2.4, 0.45, 4, 10, Math.PI * 1.3).rotateZ(sd > 0 ? -0.3 : Math.PI + 0.3).translate(sd * 4.2, 41.2, 1), GOLD);
          kit.add('gold', new THREE.OctahedronGeometry(1.1, 0).scale(1, 1.5, 0.5).translate(sd * 7.4, 40, 1), GOLD);
        }
        kit.add('gold', new THREE.ConeGeometry(0.9, 3.4, 6).translate(0, 49.4, 1), GOLD);
      } else {                                                                                            // the diagonals
        kit.add('lancet', archPanel(fw * 0.44, 50).translate(0, 58, 0.2), '#ffc4e4');
        kit.add('gold', new THREE.TubeGeometry(pointedArchPath(fw * 0.44 + 0.8, 50.4), 24, 0.55, 5, false).translate(0, 57.8, 0.5), GOLD);
        lancet(kit, 0, 38, fw * 0.32, 16);
      }
      kit.frame(x, 0, z);
    }
    // the brocade frieze, corbels and the jali gallery
    kit.add('brocade', scaleUV(new THREE.CylinderGeometry(r + 1.4, r + 1.4, 3.6, 8, 1, true).rotateY(Math.PI / 8).translate(0, 113.8, 0), 26, 1), '#ffffff');
    kit.add('ivory', ring(r + 1.8, 0.8, 111.4, 8).rotateY(Math.PI / 8), PEARL); kit.add('gold', ring(r + 1.9, 0.4, 115.6, 8).rotateY(Math.PI / 8), GOLD);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; kit.add('ivory', box(1.8, 4.4, 3.8, 0, 116, 0).translate(0, 0, r + 1.6).rotateY(a), PEARL); kit.add('gold', box(1.9, 0.5, 0.5, 0, 116.8, 0).translate(0, 0, r + 3.4).rotateY(a), GOLD); }
    kit.add('ivory', ring(r + 5, 1.8, 120.4, 24), PEARL); kit.add('gold', ring(r + 5.1, 0.4, 122.2, 24), GOLD);
    kit.add('jali', scaleUV(new THREE.CylinderGeometry(r + 4.6, r + 4.6, 5.2, 24, 1, true).translate(0, 125.2, 0), 26, 1), IVORY);
    kit.add('gold', ring(r + 4.9, 0.7, 127.8, 24), GOLD);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, p = kit.world(Math.sin(a) * (r + 4.4), 0, Math.cos(a) * (r + 4.4)); spirelets.push([p.x, 122.6, p.z, 0.8, 0]); }
    // the drum: dark blue arched lights between pilasters, gold crockets at its head
    kit.add('ivory', oct(25, 18.6, 128.5), PEARL, '#f6dade');
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, ca = a + Math.PI / 8;
      kit.add('ivory', cyl(1, 1, 17, 6, Math.sin(ca) * 25.4, 129, Math.cos(ca) * 25.4), PEARL);
      kit.add('gold', new THREE.ConeGeometry(0.9, 4, 4).translate(Math.sin(ca) * 26.4, 148.6, Math.cos(ca) * 26.4), GOLD);
      kit.frame(x + Math.sin(a) * 23.1, 0, z + Math.cos(a) * 23.1, a);
      lancet(kit, 0, 131, 8, 12.6);
      kit.frame(x, 0, z);
    }
    kit.add('ivory', ring(27.4, 2.4, 146.4, 24), PEARL); kit.add('gold', ring(27.8, 1.4, 148.8, 24), GOLD);
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; kit.add('gold', new THREE.ConeGeometry(1, 2.8, 4).translate(Math.sin(a) * 27.2, 151.4, Math.cos(a) * 27.2), GOLD); kit.add('gold', new THREE.SphereGeometry(0.55, 5, 3).translate(Math.sin(a + 0.13) * 27.6, 150.6, Math.cos(a + 0.13) * 27.6), GOLD); }   // the gold crest
    kit.add('dome', onion(26.5, 26).translate(0, 150.2, 0), '#ffffff');                                    // plain dark pink, as asked
    // the gold knob and the gold cross
    kit.add('gold', new THREE.SphereGeometry(3.2, 10, 6).translate(0, 178.6, 0), GOLD);
    kit.add('gold', ring(2, 1, 181.2, 8), GOLD);
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; kit.add('gold', new THREE.ConeGeometry(0.7, 3, 4).rotateZ(-0.6).rotateY(a).translate(Math.cos(a) * 2.6, 176.6, -Math.sin(a) * 2.6), GOLD); }
    kit.add('gold', box(1.5, 19, 1.5, 0, 182, 0), GOLD);
    kit.add('gold', box(12.4, 1.5, 1.5, 0, 192.4, 0), GOLD);
    for (const [dx, dy] of [[-6.6, 193.15], [6.6, 193.15], [0, 201.6]]) { kit.add('gold', new THREE.SphereGeometry(1.1, 6, 4).translate(dx, dy, 0), GOLD); kit.add('gold', new THREE.OctahedronGeometry(1, 0).translate(dx + Math.sign(dx) * 1.4, dy + (dx ? 0 : 1.4), 0), GOLD); }
    kit.add('gold', new THREE.OctahedronGeometry(1.6, 0).scale(1, 1, 0.7).translate(0, 193.15, 0), GOLD);
    // crystal lanterns on gold scroll brackets: the outer side carries two, the inner side one,
    // and a standing lantern on each side of the gallery
    for (const sd of [-1, 1]) {
      const outer = sd === out, L = outer ? 24 : 18;
      kit.add('gold', box(L, 1.3, 1.3, sd * (ap + L / 2), 119, 0), GOLD);
      kit.add('gold', new THREE.TorusGeometry(2.8, 0.5, 4, 12, Math.PI * 1.4).rotateZ(sd > 0 ? -Math.PI / 2 : Math.PI * 0.1).translate(sd * (ap + L - 1), 122.4, 0), GOLD);
      kit.add('gold', box(Math.hypot(13, 10), 1, 1, 0, -0.5, 0).rotateZ(sd * Math.atan2(10, 13)).translate(sd * (ap + 6.5), 113.6, 0), GOLD);   // the brace
      kit.add('gold', new THREE.TorusGeometry(3, 0.45, 4, 10, Math.PI).rotateZ(sd > 0 ? Math.PI / 2 : -Math.PI / 2).translate(sd * (ap + 0.6), 112.6, 0), GOLD);
      lantern(kit, sd * 33.5, 128.4, 0, 12, false);
      if (outer) { lantern(kit, sd * 37.5, 119, 0, 10.5, true); lantern(kit, sd * 50.5, 119, 0, 12.5, true); }
      else lantern(kit, sd * 47, 119, 0, 12, true);
    }
    kit.frame();
    solids.push({ minX: x - 40, maxX: x + 40, minZ: z - 40, maxZ: z + 40, y0: -10, y1: 21 });
    solids.push({ x, z, r: r + 5, y0: 20, y1: 205 });
  }

  // the tall purple-domed towers standing against the lancet front
  // in stages, as drawn: each stage a ring of dark-blue pointed windows between angle colonnettes,
  // closed by a corbelled jali balcony with a gold rail
  for (const [x, z, r, yb, dh] of FRONT_TOWERS) {
    kit.frame(x, 0, z);
    kit.add('ivory', oct(r, yb + 4, -4), PEARL, '#efb6c0');
    const ap = r * 0.924, fw = r * 0.765, st = [52, 52 + (yb - 56) * 0.5, yb - 4];
    for (let k = 0; k < 2; k++) {
      const y0 = st[k], y1 = st[k + 1], hh = y1 - y0;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        if (Math.cos(a) < -0.1) continue;                                                                 // the faces that are seen
        kit.frame(x + Math.sin(a) * ap, 0, z + Math.cos(a) * ap, a);
        lancet(kit, 0, y0 + hh * 0.16, fw * (k ? 0.42 : 0.5), hh * 0.62);
        kit.frame(x, 0, z);
      }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; kit.add('ivory', cyl(0.8, 0.8, hh - 2, 6, Math.sin(a) * (r + 0.4), y0 + 1, Math.cos(a) * (r + 0.4)), PEARL); }
      for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; kit.add('ivory', box(1.2, 2.6, 2.4, 0, y1 - 2.6, 0).translate(0, 0, r + 0.8).rotateY(a), PEARL); }   // corbels
      kit.add('brocade', scaleUV(new THREE.CylinderGeometry(r + 0.6, r + 0.6, 2.6, 16, 1, true).translate(0, y1 - 4.2, 0), Math.round(r * 0.8), 1), '#ffffff');   // gold brocade band (owner, 12 Oct)
      kit.add('ivory', ring(r + 3, 1.2, y1, 16), PEARL);
      kit.add('jali', scaleUV(new THREE.CylinderGeometry(r + 2.8, r + 2.8, 2.6, 16, 1, true).translate(0, y1 + 2.5, 0), 12, 1), IVORY);
      kit.add('gold', ring(r + 3, 0.4, y1 + 3.8, 16), GOLD);
    }
    for (const y of [52, yb - 2]) kit.add('gold', ring(r + 1.2, 1.4, y, 8).rotateY(Math.PI / 8), GOLD);
    kit.add('ivory', ring(r + 3, 3, yb - 3, 8).rotateY(Math.PI / 8), PEARL);
    kit.add('brocade', scaleUV(new THREE.CylinderGeometry(r + 3.1, r + 3.1, 2, 8, 1, true).rotateY(Math.PI / 8).translate(0, yb - 1.5, 0), Math.round(r * 0.8), 1), '#ffffff');
    kit.add('drum', scaleUV(new THREE.CylinderGeometry(r * 0.86, r * 0.9, 10, 16, 1, true).translate(0, yb + 5, 0), 6, 0.5), IVORY);
    kit.add('dome', onion(r * 1.05, dh).translate(0, yb + 10, 0), '#ffffff');
    kit.add('gold', needle(r * 0.09, 16, 6).translate(0, yb + 10 + dh - 2, 0), GOLD);
    kit.add('gold', finialGeo(r * 0.14).translate(0, yb + 10 + dh + 13, 0), GOLD);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, p = kit.world(Math.cos(a) * (r + 3), 0, Math.sin(a) * (r + 3)); spirelets.push([p.x, yb, p.z, 0.55, 0]); }
    for (const dx of [-1, 1]) { const p = kit.world(dx * (r + 5), 0, 4); hanging.push([p.x, yb - 25, p.z, 2.6, 0]); }
    kit.frame();
    solids.push({ x, z, r: r + 1, y0: -10, y1: yb + dh + 20 });
  }

  // ---- the great onion dome, west of the gate: drum with window rings, gold-ribbed purple bulb ----
  {
    const { x, z, r } = GREAT_DOME, y0 = roofAt(x, z);
    kit.frame(x, 0, z);
    kit.add('ivory', ring(r + 6, 4, y0, 24), PEARL);
    kit.add('drum', scaleUV(new THREE.CylinderGeometry(r, r + 1, 66, 24, 1, true).translate(0, y0 + 33, 0), 14, 3), IVORY);
    for (const y of [y0 + 4, y0 + 34, y0 + 67]) kit.add('gold', ring(r + 1.2, 1.4, y - 0.7), GOLD);
    kit.add('ivory', ring(r + 4.4, 1.6, y0 + 33, 24), PEARL);                                  // the balcony ring between the window stages
    kit.add('jali', scaleUV(new THREE.CylinderGeometry(r + 4.2, r + 4.2, 2.6, 24, 1, true).translate(0, y0 + 35.9, 0), 24, 1), IVORY);
    kit.add('gold', ring(r + 4.4, 0.4, y0 + 37.2, 24), GOLD);
    kit.add('ivory', ring(r + 3, 3, y0 + 66, 24), PEARL);
    kit.add('dome', onion(r + 4, 58, 32, 12).translate(0, y0 + 68, 0), '#ffffff');
    kit.add('gold', ring(r * 0.86, 2, y0 + 67), GOLD);
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, p = kit.world(Math.cos(a) * (r + 3.4), 0, Math.sin(a) * (r + 3.4)); kit.add('gold', new THREE.ConeGeometry(1.4, 3.6, 4).translate(p.x - x, y0 + 70.4, p.z - z), GOLD); }   // gold crest round the foot of the bulb
    kit.add('gold', needle(2.2, 32, 8).translate(0, y0 + 124, 0), GOLD);
    kit.add('gold', finialGeo(4).translate(0, y0 + 154, 0), GOLD);
    for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2, p = kit.world(Math.cos(a) * (r + 5), 0, Math.sin(a) * (r + 5)); spirelets.push([p.x, y0 + 4, p.z, 0.9, 0]); }
    for (let i = 0; i < 4; i++) {                                               // four slim turrets round the drum
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      kit.frame(x + Math.cos(a) * (r + 12), 0, z + Math.sin(a) * (r + 12));
      kit.add('drum', scaleUV(new THREE.CylinderGeometry(5, 5, 60, 10, 1, true).translate(0, y0 + 30, 0), 3, 2), IVORY);
      kit.add('gold', ring(5.6, 1, y0 + 60, 10), GOLD);
      kit.add('dome', needle(5.5, 18, 10).translate(0, y0 + 61, 0), '#ffffff');
      kit.add('gold', finialGeo(1).translate(0, y0 + 78, 0), GOLD);
      solids.push({ x: x + Math.cos(a) * (r + 12), z: z + Math.sin(a) * (r + 12), r: 5.5, y0: y0 - 4, y1: y0 + 82 });
    }
    kit.frame();
    solids.push({ x, z, r: r + 6, y0: y0 - 4, y1: 350 });
  }

  // ---- needle spires: stacked glass-strip shafts with lantern balconies, an open lantern, a purple needle ----
  for (const [x, z, topY, w] of SPIRES) {
    const y0 = roofAt(x, z), needleH = Math.min(topY * 0.16, (topY - y0) * 0.32), lantH = 1.4 * w, shaftTop = topY - needleH - lantH;
    kit.frame(x, 0, z);
    const stages = Math.max(2, Math.min(6, Math.round((shaftTop - y0) / 55))), sh = (shaftTop - y0) / stages;
    for (let k = 0; k < stages; k++) {
      const ww = w * (1 - k * 0.12), yb = y0 + k * sh;
      const cr = ww / 2 / 0.924;                                                                          // eight-sided, a glass light on every face
      kit.add('spire', scaleUV(new THREE.CylinderGeometry(cr, cr, sh - 2, 8, 1, true).rotateY(Math.PI / 8).translate(0, yb + (sh - 2) / 2, 0), 8, 1), '#ffffff');   // one tall light per face, per stage
      kit.add('ivory', ring(cr + 1.4, 2, yb + sh - 2, 8).rotateY(Math.PI / 8), PEARL);
      kit.add('gold', ring(cr + 1.6, 0.5, yb + sh - 0.3, 8).rotateY(Math.PI / 8), GOLD);
      if (ww >= 10) { kit.add('jali', scaleUV(new THREE.CylinderGeometry(cr + 1.5, cr + 1.5, 2.2, 8, 1, true).rotateY(Math.PI / 8).translate(0, yb + sh + 1.1, 0), 8, 1), IVORY); kit.add('gold', ring(cr + 1.6, 0.3, yb + sh + 2.2, 8).rotateY(Math.PI / 8), GOLD); }   // the gallery
      for (const [cx, cz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) { const p = kit.world(cx * (ww / 2 + 0.8), 0, cz * (ww / 2 + 0.8)); spirelets.push([p.x, yb + sh, p.z, ww / 30, 0]); }
      if (w >= 12) for (const sd of [-1, 1]) {                                                       // crystal lanterns on gold brackets, both sides
        kit.add('gold', box(3.4, 0.6, 0.6, sd * (ww / 2 + 1.5), yb + sh - 3, 0), GOLD);
        hanging.push([x + sd * (ww / 2 + 3), yb + sh - 4, z, 1.6, 0]);
      }
    }
    const lw = w * 0.5;
    kit.add('drum', scaleUV(new THREE.CylinderGeometry(lw, lw, lantH, 8, 1, true).translate(0, shaftTop + lantH / 2, 0), 4, 1), IVORY);
    kit.add('gold', ring(lw + 0.4, 0.6, shaftTop + lantH - 0.6, 8), GOLD);
    kit.add('dome', needle(lw * 1.15, needleH, 8).translate(0, shaftTop + lantH, 0), '#ffffff');
    for (const [f, rf] of [[0.14, 0.82], [0.4, 0.5], [0.66, 0.27]]) for (let i = 0; i < 8; i++) {                  // gold crockets up the needle
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8, rr = lw * 1.15 * rf;
      kit.add('gold', new THREE.ConeGeometry(Math.max(0.25, lw * 0.1), Math.max(0.8, lw * 0.32), 4).rotateZ(-0.5).rotateY(-a + Math.PI / 2).translate(Math.cos(a) * rr, shaftTop + lantH + needleH * f, Math.sin(a) * rr), GOLD);
    }
    kit.add('gold', ring(lw * 1.2, Math.max(0.3, lw * 0.08), shaftTop + lantH - 0.2, 8), GOLD);
    if (w >= 12) for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4, p = kit.world(Math.cos(a) * lw * 1.25, 0, Math.sin(a) * lw * 1.25); spirelets.push([p.x, shaftTop + lantH, p.z, w / 36, 0]); }   // pinnacle crown
    kit.add('gold', finialGeo(Math.max(0.8, w * 0.12)).translate(0, topY - 1, 0), GOLD);
    kit.frame();
    solids.push({ x, z, r: w * 0.72, y0: y0 - 4, y1: topY });
  }
  // purple-domed towers on the dome terrace and the crown garden
  for (const [x, z, r, yb, dh] of DOME_TOWERS) {
    const y0 = roofAt(x, z);
    kit.frame(x, 0, z);
    kit.add('tower', oct(r, yb - y0, y0), IVORY);
    kit.add('ivory', ring(r + 2.5, 2.5, yb - 2.5, 8).rotateY(Math.PI / 8), PEARL);
    kit.add('gold', ring(r + 0.8, 1.2, yb, 16), GOLD);
    kit.add('dome', onion(r + 1, dh).translate(0, yb + 1, 0), '#ffffff');
    kit.add('gold', finialGeo(r * 0.2).translate(0, yb + dh, 0), GOLD);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, p = kit.world(Math.cos(a) * (r + 2), 0, Math.sin(a) * (r + 2)); spirelets.push([p.x, yb, p.z, 0.45, 0]); }
    kit.frame();
    solids.push({ x, z, r: r + 1, y0: y0 - 4, y1: yb + dh + 8 });
  }
  {  // the cone pavilion on the north axis: arcaded drum and a gold-ribbed purple tent cone
    const { x, z, r, top } = CONE, y0 = roofAt(x, z);
    kit.frame(x, 0, z);
    kit.add('podium', scaleUV(new THREE.CylinderGeometry(r, r + 1, 22, 24, 1, true).translate(0, y0 + 11, 0), 12, 0.42), PEARL);
    kit.add('gold', ring(r + 1.5, 1.4, y0 + 22), GOLD);
    kit.add('dome', tent(r + 2, top - y0 - 33, 32, 16).translate(0, y0 + 23, 0), '#ffffff');
    kit.add('gold', finialGeo(3.4).translate(0, top - 11, 0), GOLD);
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2, p = kit.world(Math.cos(a) * (r + 3), 0, Math.sin(a) * (r + 3)); spirelets.push([p.x, y0, p.z, 0.8, 0]); }
    kit.frame();
    solids.push({ x, z, r: r + 2, y0: y0 - 4, y1: top });
  }
  // drum turrets with small onion domes or slim cones at the tier corners and along the tier fronts
  {
    const spots = [];
    for (const k of [1, 2, 3]) {
      const [x0, x1, z0, z1] = PALACE_TIERS[k];
      for (const [x, z] of [[x0 + 5, z1 - 5], [x1 - 5, z1 - 5], [x0 + 5, z0 + 5], [x1 - 5, z0 + 5]]) if (tierContains(k, x, z)) spots.push([x, z]);
      for (let x = x0 + 55; x < x1 - 40; x += 70) if (tierContains(k, x, z1 - 5)) spots.push([x, z1 - 5]);
      if (PALACE_PLANS[k]) PALACE_PLANS[k].forEach(([x, z], i) => { if (i > 3 && i % 4 === 0 && z > z0 + 20) { const c = PALACE_TIERS[k]; spots.push([x + (x < (c[0] + c[1]) / 2 ? 6 : -6), z - 6]); } });
    }
    spots.forEach(([x, z], i) => {
      const r = 6 + (i % 3) * 1.5;
      if ((Math.abs(x) < 64 && z > 100) || !clear(x, z, r + 2)) return;
      const y0 = roofAt(x, z), h = r * 4.2, cone = i % 3 === 1;
      kit.frame(x, 0, z);
      kit.add('drum', scaleUV(new THREE.CylinderGeometry(r, r, h + 3, 12, 1, true).translate(0, y0 - 3 + (h + 3) / 2, 0), 4, 1), IVORY);
      kit.add('gold', ring(r + 0.8, 1, y0 + h - 1, 12), GOLD);
      if (cone) kit.add('dome', needle(r * 1.15, r * 3.6, 12).translate(0, y0 + h, 0), '#ffffff');
      else kit.add('dome', onion(r * 1.05, r * 2.4, 16).translate(0, y0 + h, 0), '#ffffff');
      kit.add('gold', finialGeo(r * 0.25).translate(0, y0 + h + (cone ? r * 3.6 : r * 2.4) - 1, 0), GOLD);
      kit.frame();
      taken.push([x, z, r + 1]);
      solids.push({ x, z, r: r + 0.5, y0: y0 - 4, y1: y0 + h + r * 4 });
    });
  }

  // ---- garden pavilions on the lancet storey and the dome terrace: arched loggias with small purple domes ----
  for (const [k, zf] of [[1, 150], [2, 75]]) {
    const [x0, x1, , , t] = PALACE_TIERS[k];
    for (let x = x0 + 30; x < x1 - 20; x += 46) {
      if (Math.abs(x) < 70 || !clear(x, zf, 14) || ![[-12, -9], [12, -9], [-12, 9], [12, 9]].every(([dx, dz]) => tierContains(k, x + dx, zf + dz))) continue;
      const w = 22, h = 24 + (Math.abs(x) % 3) * 4;
      kit.frame(x, 0, zf);
      kit.add('wing', wallBox(w, h, 16, 0, t, 0, w / 2, h), IVORY);
      kit.add('ivory', box(w + 3, 2, 19, 0, t + h, 0), PEARL);
      kit.add('gold', box(w + 3.4, 0.5, 19.4, 0, t + h + 2, 0), GOLD);
      kit.add('gold', ring(6.6, 1, t + h + 2.4, 12), GOLD);
      kit.add('dome', onion(7, 10, 16).translate(0, t + h + 3, 0), '#ffffff');
      kit.add('gold', finialGeo(1.2).translate(0, t + h + 12.5, 0), GOLD);
      for (const sd of [-1, 1]) for (const dz of [-9, 9]) spirelets.push([x + sd * (w / 2 + 1), t + h + 2, zf + dz, 0.6, 0]);
      kit.frame();
      taken.push([x, zf, 15]);
      solids.push({ minX: x - w / 2, maxX: x + w / 2, minZ: zf - 8, maxZ: zf + 8, y0: t - 4, y1: t + h + 14 });
    }
  }

  // ---- roof gardens (crop 08): the water channel down the axis, wheel parterres, conservatories, pools ----
  for (const [z0, z1, y] of [[-195, 38, 216], [42, 108, 186]]) {
    kit.add('ivory', box(24, 0.8, z1 - z0, 0, y, (z0 + z1) / 2), PEARL);
    water.push(new THREE.PlaneGeometry(20, z1 - z0 - 1).rotateX(-Math.PI / 2).translate(0, y + 0.9, (z0 + z1) / 2));
    for (let z = z0 + 12; z < z1; z += 26) sprays.push([0, y + 0.9, z, 1.6]);
  }
  falls.push(new THREE.PlaneGeometry(18, 30, 1, 6).translate(0, 201, 40.8), new THREE.PlaneGeometry(18, 32, 1, 8).translate(0, 170, 110.8));
  kit.add('ivory', box(64, 1, 26, 0, 154, 123), PEARL);                                  // the pool behind the gate gable
  water.push(new THREE.PlaneGeometry(60, 22).rotateX(-Math.PI / 2).translate(0, 155.1, 123));
  fountains.push([0, 155, 123, 0.55]);
  {  // eight-spoke wheel parterres
    const [c, g] = cv(256, 256);
    g.fillStyle = '#f3dfd8'; g.fillRect(0, 0, 256, 256);
    g.fillStyle = '#d9b25a'; g.beginPath(); g.arc(128, 128, 124, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#4f9a4f'; g.beginPath(); g.arc(128, 128, 116, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.strokeStyle = '#f3dfd8'; g.lineWidth = 12; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.cos(a) * 116, 128 + Math.sin(a) * 116); g.stroke(); }
    for (let i = 0; i < 160; i++) { const a = R() * 6.28, d = 30 + R() * 80; g.fillStyle = ['#f6a6c8', '#ff7fb0', '#ffe3ef'][i % 3]; g.beginPath(); g.arc(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 4, 0, Math.PI * 2); g.fill(); }
    g.fillStyle = '#fbf4ee'; g.beginPath(); g.arc(128, 128, 30, 0, Math.PI * 2); g.fill();
    const wheel = new THREE.MeshLambertMaterial({ map: tex(c, false), transparent: true, alphaTest: 0.1 });
    for (const [x, z] of WHEELS) {
      const m = new THREE.Mesh(new THREE.CircleGeometry(30, 48).rotateX(-Math.PI / 2), wheel);
      m.position.set(x, roofAt(x, z) + 0.4, z); body.add(m);
      fountains.push([x, roofAt(x, z), z, 0.4]);
    }
  }
  for (const [x, zc, L] of CONSERVATORIES) {                                   // glass barrel vaults with a cross gable, gold ribs, orange trees
    const y = roofAt(x, zc), r = 21;
    const vault = new THREE.CylinderGeometry(r, r, L, 20, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(x, y + 6, zc);
    const crossV = new THREE.CylinderGeometry(r * 0.8, r * 0.8, r * 2.6, 16, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).translate(x, y + 6, zc);
    detail.add(new THREE.Mesh(merge([vault, crossV]), mats.glass));
    kit.add('ivory', box(r * 2 + 2, 6, L + 2, x, y, zc), PEARL);
    for (let k = 0; k <= 10; k++) kit.add('gold', new THREE.TorusGeometry(r, 0.5, 4, 20, Math.PI).rotateY(Math.PI / 2).translate(x, y + 6, zc - L / 2 + (k * L) / 10), GOLD);
    kit.add('gold', box(1, 1, L, x, y + 6 + r - 0.5, zc), GOLD);
    for (let k = 0; k < 12; k++) oranges.push([x + ((k % 2) - 0.5) * 18, y + 6, zc - L / 2 + 8 + (k >> 1) * 14, 2.2, k]);
    solids.push({ minX: x - r, maxX: x + r, minZ: zc - L / 2, maxZ: zc + L / 2, y0: y - 4, y1: y + 6 + r });
  }
  {  // the hexagonal glass pavilion in the west garden
    const x = -295, z = -184, y = roofAt(x, z);
    detail.add(new THREE.Mesh(merge([new THREE.CylinderGeometry(20, 20, 24, 6, 1, true).translate(x, y + 12, z), new THREE.ConeGeometry(21, 14, 6, 1, true).translate(x, y + 31, z)]), mats.glass));
    for (const yy of [y, y + 23.5]) kit.add('gold', ring(20.5, 0.8, yy, 6), GOLD);
    kit.add('gold', finialGeo(1.6).translate(x, y + 37, z), GOLD);
    for (let k = 0; k < 5; k++) oranges.push([x + Math.cos(k * 1.26) * 9, y, z + Math.sin(k * 1.26) * 9, 2.4, k]);
    solids.push({ x, z, r: 21, y0: y - 4, y1: y + 40 });
  }
  {  // the west mirror pool
    const x = -198, z = 62, y = roofAt(x, z);
    kit.add('ivory', box(44, 1, 28, x, y, z), PEARL);
    water.push(new THREE.PlaneGeometry(40, 24).rotateX(-Math.PI / 2).translate(x, y + 1.1, z));
    fountains.push([x, y + 1, z, 0.5]);
    solids.push({ minX: x - 22, maxX: x + 22, minZ: z - 14, maxZ: z + 14, y0: y - 4, y1: y + 2 });
  }
  for (const [x, z] of [[-280, 262], [-214, 272], [300, 262], [219, 278], [100, 150], [-140, 150], [-70, 80], [40, -150]]) fountains.push([x, roofAt(x, z), z, 0.7]);
  // blossom trees in carved planters across every terrace
  for (let i = 0, tries = 0; i < 50 && tries < 900; tries++) {
    const x = -380 + R() * 825, z = -330 + R() * 665, t = roofAt(x, z);
    if (!t || Math.abs(x) < 18 || (Math.abs(x) < CHW + 6 && z > FRONT - 4) || !clear(x, z, 8)) continue;
    if ([[8, 0], [-8, 0], [0, 8], [0, -8]].some(([dx, dz]) => roofAt(x + dx, z + dz) !== t)) continue;   // well inside one roof
    kit.add('ivory', box(6, 1.6, 6, x, t, z), PEARL);
    blossoms.push([x, t + 1.6, z, 0.85 + R() * 0.3, R() * 6]);
    taken.push([x, z, 5]); i++;
  }

  // ---- the rear: waterfalls off the podium's north and east edges into pools ----
  for (const [x, w] of [[-150, 18], [60, 24], [220, 16]]) {
    falls.push(new THREE.PlaneGeometry(w, 52, 1, 12).rotateY(Math.PI).translate(x, 26, -338.6));
    water.push(new THREE.CircleGeometry(w * 1.1, 24).rotateX(-Math.PI / 2).translate(x, 0.2, -338 - w * 1.1));
    kit.add('ivory', new THREE.TorusGeometry(w * 1.1, 0.6, 4, 24).rotateX(Math.PI / 2).translate(x, 0.2, -338 - w * 1.1), PEARL);
  }
  for (const z of [-250, 100]) {
    falls.push(new THREE.PlaneGeometry(16, 52, 1, 12).rotateY(Math.PI / 2).translate(450.6, 26, z));
    water.push(new THREE.CircleGeometry(9, 24).rotateX(-Math.PI / 2).translate(460, 0.2, z));      // inside the mesa lip (x 470 drawn)
  }

  // ---- lotus fountains (A035) on the roofs ----
  {
    for (const [x, y, z, s] of fountains) {
      const f = lotusFountainGeo(9 * s), fg = new THREE.Group();
      fg.add(new THREE.Mesh(f.stone, am.lit), new THREE.Mesh(f.gold, mats.gold), new THREE.Mesh(f.water, mats.water), new THREE.Mesh(f.bud, am.crystal));
      fg.position.set(x, y, z); fg.name = 'fountain'; detail.add(fg); nearFountains.push(fg);
      for (const [sx, sy, sz, sr] of f.sprays) sprays.push([x + sx, y + sy, z + sz, sr]);
      solids.push({ x, z, r: 9 * s, y0: y - 4, y1: y + 12 * s });
    }
  }

  // ---- build the body ----
  kit.build(mats, body, 'palace');
  dress.build(mats, dressed, 'palace-dress');
  body.add(new THREE.Mesh(merge(water), mats.water), new THREE.Mesh(merge(falls), mats.fall));
  if (foam.length) body.add(new THREE.Mesh(merge(foam), additive('#ffffff', { map: glowTexture(), opacity: 0.55, depthWrite: false })));
  const spr = spireletGeo(), hang = hangingLanternGeo();
  // drawn-metre tiles, each hidden beyond its range (world metres) from the camera
  const tiled = [
    [tiledInstances(spr, am.lit, spirelets, 'spirelets', 120), 3000],
    [tiledInstances(cypressGeo(), am.leaf, cypress, 'cypress', 120), 7000],
    [tiledInstances(blossomGeo(), am.leaf, blossoms, 'blossoms', 120), 7000],
    [tiledInstances(roseClumpGeo(), am.leaf, clumps, 'rose-clumps', 120), 1800],
    [tiledInstances(orangeTreeGeo(), am.leaf, oranges, 'orange-trees', 120), 800],
    [tiledInstances(hang.body, am.lit, hanging, 'lantern-body', 120), 1200], [tiledInstances(hang.glass, am.crystal, hanging, 'lantern-glass', 120), 1200],
  ];
  for (const [g] of tiled) detail.add(g);
  const sprayMat = additive('#cfeaff', { opacity: 0.28, side: THREE.DoubleSide });
  detail.add(new THREE.Mesh(merge(sprays.map(([x, y, z, r]) => new THREE.ConeGeometry(r * 0.5, r * 1.6, 6, 1, true).translate(x, y + r * 0.8, z))), sprayMat));

  // ---- the lotus basin at the foot of the cascade (world metres) ----
  {
    const f = lotusFountainGeo(PLAZA.r);
    for (const [g, m] of [[f.stone, am.lit], [f.gold, mats.gold], [f.water, mats.water], [f.bud, am.crystal]]) group.add(new THREE.Mesh(g.translate(PLAZA.x, PLAZA.y, PLAZA.z), m));
    addCollider({ x: PLAZA.x, z: PLAZA.z, r: PLAZA.r * 0.95 });
  }

  // ---- G02 roof court (sheet 16) on the crown garden, at human scale ----
  const courtOut = { lamps, hanging: [], cypress: [], blossoms: [], clumps: [], fountains: [], oranges: [] };
  const court = buildRoofCourt(group, mats, am, courtOut, wx(COURT.x), wy(roofAt(COURT.x, COURT.z)), wz(COURT.z));
  {
    const fstone = [], fgold = [], fwater = [], fbud = [], csprays = [];
    for (const [x, y, z, s] of courtOut.fountains) {
      const f = lotusFountainGeo(9 * s);
      fstone.push(f.stone.translate(x, y, z)); fgold.push(f.gold.translate(x, y, z)); fwater.push(f.water.translate(x, y, z)); fbud.push(f.bud.translate(x, y, z));
      for (const [sx, sy, sz, sr] of f.sprays) csprays.push(new THREE.ConeGeometry(sr * 0.5, sr * 1.6, 6, 1, true).translate(x + sx, y + sy + sr * 0.8, z + sz));
    }
    group.add(new THREE.Mesh(merge(fstone), am.lit), new THREE.Mesh(merge(fgold), mats.gold), new THREE.Mesh(merge(fwater), mats.water), new THREE.Mesh(merge(fbud), am.crystal), new THREE.Mesh(merge(csprays), sprayMat));
  }
  const lamp = postLampGeo();
  group.add(
    instances(lamp.body, am.lit, lamps, 'lamp-body'), instances(lamp.glass, am.crystal, lamps, 'lamp-glass'),
    instances(cypressGeo(), am.leaf, courtOut.cypress, 'court-cypress'), instances(blossomGeo(), am.leaf, courtOut.blossoms, 'court-blossoms'),
    instances(roseClumpGeo(), am.leaf, courtOut.clumps, 'court-roses'), instances(orangeTreeGeo(), am.leaf, courtOut.oranges, 'court-oranges'),
    instances(hang.body, am.lit, courtOut.hanging, 'court-lantern-body'), instances(hang.glass, am.crystal, courtOut.hanging, 'court-lantern-glass'),
  );
  // glow halos in world metres
  const glows = [];
  for (const [x, y, z, s] of lamps) glows.push([x, y + 5.3 * s, z, 2.2 * s]);
  for (const [x, y, z, s] of courtOut.hanging) glows.push([x, y - 1.15 * s, z, 2.4 * s]);
  for (const [x, y, z, s] of hanging) glows.push([wx(x), wy(y - 1.15 * s), wz(z), 2.4 * s * S]);
  for (const [x, y, z, s] of halosD) glows.push([wx(x), wy(y), wz(z), s * S]);
  const halos = haloPoints(glows, [1, 0.85, 0.7]);
  group.add(halos);
  group.traverse((o) => { if (o.isMesh) { o.castShadow = !o.material.transparent && o.material !== mats.garden && o.material !== mats.glass; o.receiveShadow = o.material !== mats.glass; } });

  // ---- colliders, in world metres ----
  PALACE_TIERS.forEach(([x0, x1, z0, z1, t], k) => { if (!PALACE_PLANS[k]) addCollider({ minX: wx(x0), maxX: wx(x1), minZ: wz(z0), maxZ: wz(z1), y0: 0, y1: wy(t) - 3 }); });
  addCollider({ minX: wx(-55), maxX: wx(55), minZ: wz(FRONT), maxZ: wz(GZ), y0: 0, y1: wy(182) });                // the gate frame; aperture is carved below
  addCollider({ minX: -CASCADE.water, maxX: CASCADE.water, minZ: CASCADE.z0, maxZ: CASCADE.z1, y0: 0, y1: CASTLE.y - 2 });   // the water stair
  for (const c of solids) {
    if (c.r !== undefined) addCollider({ x: wx(c.x), z: wz(c.z), r: c.r * S, y0: wy(c.y0), y1: wy(c.y1) });
    else addCollider({ minX: wx(c.minX), maxX: wx(c.maxX), minZ: wz(c.minZ), maxZ: wz(c.maxZ), y0: wy(c.y0), y1: wy(c.y1) });
  }
  // Carve only this palace's colliders; other world structures retain their original bounds.
  const palaceColliders = COLLIDERS.splice(colliderStart);
  const portalCut = { ...PALACE_ENTRANCE, y0: PALACE_ENTRANCE.colliderY0 };
  COLLIDERS.push(...palaceColliders.flatMap((c) => subtractEntrance(c, portalCut)));
  updateLeafColliders();
  leafColliders.forEach(addCollider);
  scene.add(group);

  // portals: from the upper terrace up to the roof court and back down
  const portals = [];
  if (makePortal) {
    const up = { x: -150 * S, z: 505 * S, y: BY }, down = { x: court.x, z: court.returnZ, y: court.y };
    const a = makePortal(up.x, up.y, up.z, Math.PI, '#ff9bd6', '✦ Palace Roof Garden');
    const b = makePortal(down.x, down.y, down.z, 0, '#ffd47a', '✦ Down to the Terraces');
    group.add(a.group, b.group);
    portals.push(
      { ...up, kind: 'to', disk: a.disk, land: { x: court.x, y: court.y, z: court.returnZ - 10, name: 'Palace Roof Garden', facing: Math.PI } },
      { ...down, kind: 'back', disk: b.disk, land: { x: up.x, y: BY, z: up.z + 12, name: 'Upper Terrace', facing: Math.PI } },
    );
  }

  const centre = new THREE.Vector3(wx(30), wy(150), 0);
  // the gate stands closed, showing its glass, and swings open as someone walks up the cascade;
  // the celebration can hold it open or shut for a while
  return {
    group, portals,
    roofGardenClear: (x, z, r) => clear(x / S, z / S, r / S),
    gatePosition: new THREE.Vector3(0, CASTLE.y, GATE.z),
    rosePosition: new THREE.Vector3(0, wy(roseY), wz(GZ)),
    vestibule: { ...PALACE_ENTRANCE },
    gateOpening: () => gateOpen,
    gateLeaves: leaves.map(({ leaf, pivot }, i) => ({ leaf, pivot, collider: leafColliders[i] })),
    setGate(open, instant = false) { gateTarget = open ? 1 : 0; gateHold = 60; if (instant) gateOpen = gateTarget; updateLeafColliders(); },
    update(t, dt, camera) {
      if (gateHold > 0) gateHold -= dt || 0.016;
      else if (camera) gateTarget = Math.hypot(camera.position.x, camera.position.z - GATE.z) < 450 && camera.position.y < CASTLE.y + 300 ? 1 : 0;
      gateOpen += (gateTarget - gateOpen) * Math.min(1, (dt || 0.016) * 0.6);
      for (const { pivot, s } of leaves) pivot.rotation.y = s * gateOpen * 1.45;
      updateLeafColliders();
      mats.water.uniforms.uTime.value = t; mats.fall.uniforms.uTime.value = t;
      halos.material.uniforms.uTime.value = t;
      const n = MOOD.night.value;
      for (const k of ['podium', 'wing', 'tower', 'spire', 'drum', 'lancet', 'gate']) mats[k].emissiveIntensity = 0.035 + 0.48 * n;
      leafMat.emissiveIntensity = 0.015 + 0.08 * n;
      mats.rose.color.setScalar(0.65 + 0.45 * n);
      sprayMat.opacity = 0.22 + 0.06 * Math.sin(t * 3);
      for (const p of portals) p.disk.material.uniforms.uTime.value = t;
      if (camera) {
        detail.visible = camera.position.distanceTo(centre) < 5200;
        dressed.visible = camera.position.distanceTo(centre) < 7000;
        for (const [g, range] of tiled) g.userData.cull(camera.position.x / S, camera.position.z / S, range / S);
        for (const f of nearFountains) f.visible = Math.hypot(f.position.x * S - camera.position.x, f.position.z * S - camera.position.z) < 1400;
      }
      court.update(t);
    },
  };
}

// --- G02 the palace roof court ---------------------------------------------------------------
// About 120 x 90 m on the crown garden, at human scale: West Rose Terrace, North Fountain
// Loggia, East Conservatory Garden, with walks of rose and ivory paving and gold star inlays.
// X, Y, Z: the court's centre in world metres; everything it adds is in world metres.
function buildRoofCourt(group, mats, am, out, X, Y, Z) {
  const HX = 60, HZ = 45, top = Y + 0.5, low = Y - 30, high = Y + 400;
  const kit = new Kit().frame(X, Y, Z);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2).rotateX(-Math.PI / 2), toon('#ffffff', { map: (() => { const t = courtFloorTex(); t.repeat.set(HX / 8, HZ / 8); return t; })(), emissive: '#2a1838', emissiveIntensity: 0.025 }));
  floor.position.set(X, top, Z); group.add(floor);
  addPad({ x: X, z: Z, hw: HX, hd: HZ, y: top, y0: low });
  // lotus balustrade round the court, open on the south side
  for (const [x, z, w, d] of [[0, -HZ, HX * 2, 0.6], [-HX, 0, 0.6, HZ * 2], [HX, 0, 0.6, HZ * 2]]) {
    kit.add('ivory', box(w, 1.1, d, x, 0.5, z), PEARL);
    kit.add('gold', box(w + 0.2, 0.12, d + 0.2, x, 1.6, z), GOLD);
  }
  for (let x = -HX + 3; x <= HX - 3; x += 3) out.clumps.push([X + x, Y + 1.9, Z - HZ, 0.9, x]);
  // kiosks with purple domes at the four corners
  for (const [x, z] of [[-HX + 4, -HZ + 4], [HX - 4, -HZ + 4], [-HX + 4, HZ - 4], [HX - 4, HZ - 4]]) {
    kit.add('ivory', oct(2.8, 4.5, 0.5).translate(x, 0, z), IVORY);
    kit.add('gold', ring(3.1, 0.3, 5, 8).translate(x, 0, z), GOLD);
    kit.add('dome', onion(3, 4.2, 12, 8).translate(x, 5.3, z), '#ffffff');
    kit.add('gold', finialGeo(0.6).translate(x, 9.4, z), GOLD);
    addCollider({ x: X + x, z: Z + z, r: 3, y0: low, y1: high });
  }
  // cypresses round the edges
  for (let x = -HX + 10; x <= HX - 10; x += 10) out.cypress.push([X + x, top, Z - HZ + 2.5, 9 + (Math.abs(x) % 3), 0]);
  for (let z = -HZ + 12; z <= HZ - 8; z += 10) for (const s of [-1, 1]) out.cypress.push([X + s * (HX - 2.5), top, Z + z, 9, 0]);

  // West Rose Terrace: 18 m three-tier lotus fountain in an eight-lobed basin, round rose beds, blossom trees
  out.fountains.push([X - 35, top, Z + 2, 1]);
  addCollider({ x: X - 35, z: Z + 2, r: 9.5, y0: low, y1: high });
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, x = -35 + Math.cos(a) * 16, z = 2 + Math.sin(a) * 16;
    if (x > -20) continue;
    kit.add('ivory', cyl(2.6, 2.7, 0.6, 16, x, 0.5, z), PEARL);
    for (let k = 0; k < 5; k++) out.clumps.push([X + x + Math.cos(k * 1.3) * 1.4, Y + 1.2, Z + z + Math.sin(k * 1.3) * 1.4, 1.1, k]);
  }
  for (const [x, z] of [[-52, -30], [-52, 30], [-20, -30], [-20, 30]]) {
    kit.add('ivory', box(4, 1.4, 4, x, 0.5, z), PEARL);
    kit.add('gold', box(4.2, 0.2, 4.2, x, 1.9, z), GOLD);
    out.blossoms.push([X + x, Y + 1.9, Z + z, 0.5, x]);
  }
  // North Fountain Loggia: five pointed arches on lotus-capital columns, a wall fountain inside, roses draped over
  const lz = -HZ + 6, lw = 12;
  kit.add('ivory', box(lw * 5 + 4, 9, 1, 0, 0.5, lz - 5), PEARL);
  kit.add('ivory', box(lw * 5 + 4, 0.8, 7, 0, 9.5, lz - 2), PEARL);
  for (let i = 0; i <= 5; i++) {
    const x = -lw * 2.5 + i * lw;
    kit.add('ivory', cyl(0.45, 0.5, 6, 10, x, 0.5, lz + 1), PEARL);
    kit.add('gold', lathe([[0.45, 0], [0.9, 0.5], [1.1, 1.0], [0.8, 1.3]], 10).translate(x, 6.5, lz + 1), GOLD);
    addCollider({ x: X + x, z: Z + lz + 1, r: 0.7, y0: low, y1: high });
  }
  for (let i = 0; i < 5; i++) {
    const x = -lw * 2 + i * lw;
    kit.add('ivory', archFrameGeometry(lw - 1.6, 3.4, 0.6, 1).translate(x, 6.8, lz + 1), PEARL);
    kit.add('gold', archFrameGeometry(lw - 1.2, 3.6, 0.15, 1.1).translate(x, 6.8, lz + 1.2), GOLD);
    out.hanging.push([X + x, Y + 9.6, Z + lz + 1, 1, 0]);
    for (let k = 0; k < 4; k++) out.clumps.push([X + x - 4 + k * 2.6, Y + 10.2, Z + lz + 2.6, 1.2, k]);
  }
  out.fountains.push([X, top, Z + lz - 2.5, 0.22]);
  // East Conservatory Garden: a 30 x 12 m mirror pool with lotuses beside a long glass barrel vault
  kit.add('ivory', box(13, 0.5, 31, 25, 0.5, 0), PEARL);
  const pool = new THREE.Mesh(new THREE.PlaneGeometry(12, 30).rotateX(-Math.PI / 2), mats.water);
  pool.position.set(X + 25, Y + 0.85, Z); group.add(pool);
  for (let i = 0; i < 12; i++) { const pad = new THREE.Mesh(new THREE.CircleGeometry(0.7, 10).rotateX(-Math.PI / 2), toon(i % 3 ? '#4f9a4f' : '#ff9cc4')); pad.position.set(X + 25 + Math.sin(i * 7.1) * 4.5, Y + 0.9, Z + (i - 6) * 2.3); group.add(pad); }
  addCollider({ minX: X + 18.5, maxX: X + 31.5, minZ: Z - 15.5, maxZ: Z + 15.5, y0: low, y1: high });
  {
    const x = 47, L = 52, r = 7;
    const vault = new THREE.CylinderGeometry(r, r, L, 16, 1, true, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).translate(X + x, Y + 2.5, Z);
    group.add(new THREE.Mesh(vault, mats.glass));
    kit.add('ivory', box(r * 2, 2, L, x, 0.5, 0), PEARL);
    for (let k = 0; k <= 13; k++) kit.add('gold', new THREE.TorusGeometry(r, 0.12, 4, 16, Math.PI).rotateY(Math.PI / 2).translate(x, 2.5, -L / 2 + (k * L) / 13), GOLD);
    for (let k = 0; k <= 13; k += 13) kit.add('gold', new THREE.SphereGeometry(0.5, 8, 6).translate(x, 2.5 + r, -L / 2 + (k * L) / 13), GOLD);
    for (let k = 0; k < 8; k++) out.oranges.push([X + x, Y + 2.5, Z - L / 2 + 4 + k * 6.4, 1, k]);
    addCollider({ minX: X + x - r, maxX: X + x + r, minZ: Z - L / 2, maxZ: Z + L / 2, y0: low, y1: high });
  }
  // curved marble benches and crystal lamps along the walks
  const benches = [];
  for (const [x, z, a] of [[-35, -12, 0], [-35, 16, Math.PI], [-48, 2, Math.PI / 2], [10, -20, -Math.PI / 2], [10, 20, -Math.PI / 2]]) benches.push([X + x, top, Z + z, 1, a]);
  group.add(instances(benchGeo(), am.lit, benches, 'court-benches'));
  for (const [x, z] of [[-8, 40], [8, 40], [-8, 10], [8, 10], [-8, -20], [8, -20]]) out.lamps.push([X + x, top, Z + z, 0.6, 0]);
  kit.build(mats, group, 'court');
  return { x: X, y: top, returnZ: Z + HZ - 8, update() {} };
}
