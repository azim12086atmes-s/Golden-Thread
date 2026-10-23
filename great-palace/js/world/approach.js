// The grand approach (sheets 04, 10, 15): the G04 terrace gardens stepping down
// from the palace to Lantern Lake, the lake ghats and willow grove, and the
// 3.8 km golden causeway lined with 100 m white-bark avenue trees, crystal post
// lamps and carved see-through rails, from the Bridge Pavilions (B20, where
// everyone arrives) to the palace. Arched bridges branch off to the two lake
// islands, and every footstep on the causeway sends out a ring of neon light.
import * as THREE from 'three';
import { glowBasic, additive, nightGrade } from './materials.js';
import { palaceStone as toon, gardenPavingTexture } from './palace-gardens.js';
import { glowTexture, rng } from './textures.js';
import { Kit, box, cyl, lathe, cap, scaleUV, waterMaterial, haloPoints } from './kit.js';
import { S, TERRACES, STAIRS, CAUSEWAY, B20, BRANCHES, LAKE, PAL, PLAZA, causewayY, branchY, addCollider, lakeDistance } from './layout.js';
import {
  IVORY, PEARL, ROSE, GOLD, paint, merge, finialGeo, cypressGeo, blossomGeo, willowGeo, avenueTreeGeo, roseClumpGeo,
  postLampGeo, lotusFountainGeo, benchGeo, artifactMaterials, instances, tiledInstances,
} from './artifacts.js';
import { MOOD } from './sky.js';

function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }
function tex(c) { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const R = rng(515);
function star8(g, x, y, r, fill) {
  g.beginPath();
  for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 - Math.PI / 2, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); }
  g.closePath(); g.fillStyle = fill; g.fill();
}
// causeway paving (one 15 m tile): pearl slabs, a gold border, a rose and indigo medallion (sheet 15 paving)
function deckTex() {
  const [c, g] = cv(256, 256);
  g.fillStyle = '#f7eee8'; g.fillRect(0, 0, 256, 256);
  g.strokeStyle = 'rgba(190,160,150,0.5)'; g.lineWidth = 2;
  for (let k = 0; k <= 256; k += 32) { g.beginPath(); g.moveTo(k, 0); g.lineTo(k, 256); g.moveTo(0, k); g.lineTo(256, k); g.stroke(); }
  g.fillStyle = '#d9b25a'; g.fillRect(0, 0, 10, 256); g.fillRect(246, 0, 10, 256);
  g.fillStyle = '#f0c6cc'; g.fillRect(14, 0, 8, 256); g.fillRect(234, 0, 8, 256);
  g.save(); g.translate(128, 128); g.rotate(Math.PI / 4); g.fillStyle = '#f0c6cc'; g.fillRect(-46, -46, 92, 92); g.strokeStyle = '#d9b25a'; g.lineWidth = 4; g.strokeRect(-46, -46, 92, 92); g.restore();
  g.fillStyle = '#3a44c8'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; g.lineTo(128 + Math.cos(a) * 34, 128 + Math.sin(a) * 34); } g.fill();
  star8(g, 128, 128, 26, '#f0c860');
  return tex(c);
}
// terrace garden (40 m tile): lawn beds edged with 600 mm stone, 3 to 6 m walks, rose borders
function terraceTex() { return gardenPavingTexture(); }
// retaining wall: a carved arcade with grotto fountains glowing blue (sheet 15 middle terrace)
function arcadeTex() {
  const [c, g] = cv(256, 128), [e, ge] = cv(256, 128);
  g.fillStyle = '#f6ede6'; g.fillRect(0, 0, 256, 128); ge.fillStyle = '#000'; ge.fillRect(0, 0, 256, 128);
  for (const [gg, glow] of [[g, false], [ge, true]]) {
    gg.beginPath(); gg.moveTo(64, 120); gg.lineTo(64, 56); gg.quadraticCurveTo(64, 18, 128, 12); gg.quadraticCurveTo(192, 18, 192, 56); gg.lineTo(192, 120); gg.closePath();
    const lg = gg.createLinearGradient(0, 12, 0, 120); lg.addColorStop(0, glow ? '#203060' : '#33405e'); lg.addColorStop(1, glow ? '#60c0ff' : '#7fd0ff');
    gg.fillStyle = lg; gg.fill();
    if (!glow) { gg.strokeStyle = '#d9b25a'; gg.lineWidth = 4; gg.stroke(); }
  }
  g.fillStyle = '#f0c6cc'; g.fillRect(0, 0, 256, 8); g.fillRect(0, 120, 256, 8);
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#ff9cc4' : '#5f9a52'; g.beginPath(); g.arc(8 + i * 16, 6, 7, 0, Math.PI * 2); g.fill(); }
  return { map: tex(c), glow: tex(e) };
}
// A023 bridge rail: pearl rail with gold roundels and quatrefoil openings (alpha cut)
function railTex() {
  const [c, g] = cv(128, 64);
  g.fillStyle = '#fbf6f2'; g.fillRect(0, 0, 128, 64);
  g.globalCompositeOperation = 'destination-out';
  for (const x of [32, 96]) { g.beginPath(); g.arc(x, 34, 20, 0, Math.PI * 2); g.fill(); }
  g.globalCompositeOperation = 'source-over';
  for (const x of [32, 96]) {
    g.strokeStyle = '#d9b25a'; g.lineWidth = 4; g.beginPath(); g.arc(x, 34, 20, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2 + Math.PI / 4; g.beginPath(); g.arc(x + Math.cos(a) * 9, 34 + Math.sin(a) * 9, 8, 0, Math.PI * 2); g.stroke(); }
    star8(g, x, 34, 6, '#e2b44c');
  }
  g.fillStyle = '#d9b25a'; g.fillRect(0, 0, 128, 6); g.fillRect(0, 58, 128, 6);
  g.fillStyle = '#8a7ad8'; g.fillRect(62, 8, 4, 50);
  return tex(c);
}
function flight(x, hw, z0, y0, z1, y1) {
  const len = Math.hypot(z1 - z0, y1 - y0), steps = Math.max(1, Math.round(Math.abs(y1 - y0) / 0.45));
  const g = new THREE.BoxGeometry(hw * 2, 1, len);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * steps);
  return g.rotateX(-Math.atan2(y1 - y0, z1 - z0)).translate(x, (y0 + y1) / 2 - 0.5, (z0 + z1) / 2);
}

export function createApproach(scene, preset, { makePortal } = {}) {
  const group = new THREE.Group(); group.name = 'approach';
  const kit = new Kit();
  const am = artifactMaterials();
  const stepsTex = (() => { const [c, g] = cv(64, 64); g.fillStyle = '#fbf3ee'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#e8c9c6'; g.fillRect(0, 50, 64, 14); g.fillStyle = '#d9b25a'; g.fillRect(0, 48, 64, 2); return tex(c); })();
  const arc = arcadeTex();
  const mats = {
    ivory: toon('#ffffff', { vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    gold: toon('#ffffff', { vertexColors: true, emissive: '#6a4a10', emissiveIntensity: 0.08 }),
    deck: toon('#ffffff', { map: deckTex(), vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    terrace: toon('#ffffff', { map: terraceTex(), vertexColors: true, roughness: .95 }),
    arcade: toon('#ffffff', { map: arc.map, emissiveMap: arc.glow, emissive: '#7fd0ff', emissiveIntensity: 0.5, vertexColors: true }),
    steps: toon('#ffffff', { map: stepsTex, vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    rail: toon('#ffffff', { map: railTex(), alphaTest: 0.5, side: THREE.DoubleSide, vertexColors: true, emissive: '#2a1838', emissiveIntensity: 0.025 }),
    dome: toon('#ffffff', { vertexColors: true, emissive: '#1a2a5a', emissiveIntensity: 0.4 }),
  };
  const water = [], falls = [], lamps = [], cypress = [], blossoms = [], willows = [], clumps = [], avenue = [], posts = [], fountains = [], benches = [];

  // ---- G04 terraces: garden tops, arcaded retaining walls, side walls ----
  TERRACES.forEach((T, k) => {
    const d = T.z1 - T.z0;
    kit.add('terrace', scaleUV(new THREE.PlaneGeometry(T.hw * 2, d).rotateX(-Math.PI / 2).translate(0, T.y + 0.03, (T.z0 + T.z1) / 2), T.hw / 60, d / 120), '#ffffff');
    const below = k < TERRACES.length - 1 ? TERRACES[k + 1].y : -1;
    const wallH = T.y - below;
    kit.add('arcade', scaleUV(new THREE.PlaneGeometry(T.hw * 2, wallH).translate(0, below + wallH / 2, T.z1 + 0.05), (T.hw * 2) / (wallH * 2), 1), '#ffffff');
    kit.add('ivory', box(T.hw * 2 + 2, 1.2, 2.4, 0, T.y, T.z1), PEARL);                            // flowering parapet
    kit.add('gold', box(T.hw * 2 + 2.2, 0.15, 2.6, 0, T.y + 1.2, T.z1), GOLD);
    for (let x = -T.hw + 3; x < T.hw; x += 13) if (Math.abs(x) > 90 && !STAIRS.some(([za, , , , hw, cx = 0]) => Math.abs(za - T.z1) < 2 && Math.abs(x - cx) < hw + 2)) clumps.push([x, T.y + 1.6, T.z1, 1.3, x]);
    for (const s of [-1, 1]) kit.add('ivory', box(2, T.y + 20, d, s * T.hw, -20, (T.z0 + T.z1) / 2), PEARL);
    // cypress rows along the walks and blossom trees in carved planters
    for (let x = -T.hw + 20; x < T.hw - 10; x += 30) if (Math.abs(x) > 100) cypress.push([x, T.y, T.z1 - 6, 16 + R() * 5, 0]);
  });
  // upper terrace: two round rose parterres with lotus fountains, and two mirror pools
  const up = TERRACES[0];
  for (const s of [-1, 1]) {
    const cx = s * 300 * S, cz = 470 * S;
    fountains.push([cx, up.y, cz, 0.8]);
    addCollider({ x: cx, z: cz, r: 7.5 });
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; for (const rr of [17]) clumps.push([cx + Math.cos(a) * rr, up.y + 0.4, cz + Math.sin(a) * rr, 1.6, a]); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + 0.3; benches.push([cx + Math.cos(a) * 12, up.y, cz + Math.sin(a) * 12, 1, -a - Math.PI / 2]); }
    const mx = s * 150 * S, mz = 470 * S;
    kit.add('ivory', box(14 * S, 0.6, 32 * S, mx, up.y, mz), PEARL);
    water.push(new THREE.PlaneGeometry(12 * S, 30 * S).rotateX(-Math.PI / 2).translate(mx, up.y + 0.65, mz));
    addCollider({ minX: mx - 7 * S, maxX: mx + 7 * S, minZ: mz - 16 * S, maxZ: mz + 16 * S });
    for (let z = mz - 44; z <= mz + 44; z += 22) for (const d of [-1, 1]) blossoms.push([mx + d * (7 * S + 8), up.y, z, 0.7, z]);
  }
  // middle terrace: fragrant gardens of blossom trees and roses
  const mid = TERRACES[1];
  for (let i = 0; i < 70; i++) {
    const s = i % 2 ? 1 : -1, x = s * (90 * S + R() * (mid.hw - 120 * S)), z = mid.z0 + 30 + R() * (mid.z1 - mid.z0 - 60);
    if (STAIRS.some(([za, zb, , , hw, cx = 0]) => Math.abs(x - cx) < hw + 14)) continue;
    kit.add('ivory', box(6, 1.6, 6, x, mid.y, z), PEARL);
    blossoms.push([x, mid.y + 1.6, z, 0.75 + R() * 0.25, R() * 6]);
  }
  // lower terrace: willow grove and the lake ghats
  const low = TERRACES[2];
  for (let i = 0; i < 60; i++) { const s = i % 2 ? 1 : -1, x = s * (120 * S + R() * (low.hw - 150 * S)), z = low.z0 + 25 + R() * (low.z1 - low.z0 - 40); willows.push([x, low.y, z, 0.8 + R() * 0.4, R() * 6]); }
  for (const s of [-1, 1]) {
    // ghats: broad steps from the lower terrace down into the lake, with domed kiosks on the landings
    kit.add('steps', flight(s * 290 * S, 240 * S, low.z1, low.y, low.z1 + 24 * S, -1.2), '#ffffff');
    for (const x of [s * 70 * S, s * 520 * S]) {
      kit.add('ivory', cyl(7, 7.5, 1, 8, x, low.y, low.z1 - 10), PEARL);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; kit.add('ivory', cyl(0.4, 0.45, 7, 8, x + Math.cos(a) * 5.5, low.y + 1, low.z1 - 10 + Math.sin(a) * 5.5), PEARL); }
      kit.add('gold', cap('onion', 6.5, 8, 16).translate(x, low.y + 8, low.z1 - 10), GOLD);
      kit.add('gold', finialGeo(1).translate(x, low.y + 16, low.z1 - 10), GOLD);
    }
  }
  // ---- the grand stair flights between the terraces, with balustrades and lamps; the water stair down the middle ----
  for (const [za, zb, ya, yb, hw, cx = 0] of STAIRS) {
    kit.add('steps', flight(cx, hw, za, ya, zb, yb), '#ffffff');
    const len = Math.hypot(zb - za, ya - yb);
    for (const s of [-1, 1]) {
      const x = cx + s * (hw + 0.5);
      const rail = new THREE.PlaneGeometry(len, 1.4).rotateZ(-Math.atan2(ya - yb, zb - za)).rotateY(-Math.PI / 2);
      kit.add('rail', scaleUV(rail, len / 2.8, 1).translate(x, (ya + yb) / 2 + 0.9, (za + zb) / 2), PEARL);
      lamps.push([x, ya, za - 1, 1, 0], [x, yb, zb + 1, 1, 0]);
    }
    if (!cx) {
      falls.push(new THREE.PlaneGeometry(20 * S, len).rotateX(-Math.PI / 2 + Math.atan2(ya - yb, zb - za)).translate(0, (ya + yb) / 2 + 0.15, (za + zb) / 2));
    }
  }
  // the water channel continues down every terrace to the lake
  for (const [z0, z1, y] of [[PLAZA.z + PLAZA.r + 6, 560 * S, up.y], [592 * S, 720 * S, mid.y], [752 * S, 880 * S, low.y]]) {
    kit.add('ivory', box(24 * S, 0.5, z1 - z0, 0, y, (z0 + z1) / 2), PEARL);
    water.push(new THREE.PlaneGeometry(20 * S, z1 - z0).rotateX(-Math.PI / 2).translate(0, y + 0.55, (z0 + z1) / 2));
  }
  falls.push(new THREE.PlaneGeometry(20 * S, low.y + 1, 1, 4).translate(0, low.y / 2, low.z1 + 0.3));

  // ---- the golden causeway ----
  const C = CAUSEWAY, zs = [];
  for (let z = C.z0; z <= C.z1 + 0.01; z += 16) zs.push(Math.min(z, C.z1));
  {
    // deck top as a strip following causewayY, then arched viaduct sides down to the water
    const pos = [], uv = [], idx = [];
    zs.forEach((z, i) => { const y = causewayY(z) + 0.02; pos.push(-C.hw, y, z, C.hw, y, z); uv.push(0, z / 15, 2, z / 15); if (i) { const a = (i - 1) * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    kit.add('deck', g, '#ffffff');
    for (const s of [-1, 1]) {
      const L = C.z1 - C.z0;
      kit.add('arcade', scaleUV(new THREE.PlaneGeometry(L, 8).rotateY(s * Math.PI / 2).translate(s * C.hw, 2, (C.z0 + C.z1) / 2), L / 16, 1), '#ffffff');
      kit.add('ivory', box(1.6, 1.2, L, s * (C.hw + 0.3), 5.4, (C.z0 + C.z1) / 2), PEARL);     // cornice
      const rail = new THREE.PlaneGeometry(L, 1.5).rotateY(s * Math.PI / 2);
      kit.add('rail', scaleUV(rail, L / 2.8, 1).translate(s * (C.hw - 0.4), C.y + 0.75, (C.z0 + C.z1) / 2), PEARL);
      kit.add('gold', box(0.35, 0.18, L, s * (C.hw - 0.4), C.y + 1.55, (C.z0 + C.z1) / 2), GOLD);
      for (let z = C.z0 + 30; z < C.z1 - 30; z += 8) posts.push([s * (C.hw - 0.4), C.y, z, 1, 0]);
      for (let z = C.z0 + 40; z < C.z1 - 20; z += 30) lamps.push([s * (C.hw - 2), C.y, z + (s > 0 ? 15 : 0), 1, 0]);
      // white-bark avenue trees about every 60 m in round planters
      for (let z = C.z0 + 50; z < C.z1 - 30; z += 60) {
        avenue.push([s * (C.hw - 5), C.y + 1, z, 0.95 + R() * 0.12, R() * 6]);
        kit.add('ivory', cyl(3.6, 3.8, 1, 16, s * (C.hw - 5), C.y, z), PEARL);
        kit.add('gold', cyl(3.75, 3.75, 0.15, 16, s * (C.hw - 5), C.y + 1, z), GOLD);
        addCollider({ x: s * (C.hw - 5), z, r: 3.8 });
      }
    }
    // piers under the deck every 24 m, so the viaduct reads as a row of arches over the lake
    for (let z = C.z0 + 12; z < C.z1; z += 24) for (const s of [-1, 1]) kit.add('ivory', box(2.4, 14, 3, s * (C.hw - 1), -10, z), PEARL);
  }
  // arched bridges to the lake islands
  for (const B of BRANCHES) {
    const [[x0, z0], [x1, z1]] = B.pts, n = 24, pos = [], uv = [], idx = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = x0 + (x1 - x0) * t, y = branchY(B, t) + 0.02;
      pos.push(x, y, z0 - B.hw, x, y, z0 + B.hw); uv.push(x / 15, 0, x / 15, 1);
      if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    kit.add('deck', g, '#ffffff');
    const L = Math.abs(x1 - x0);
    for (const s of [-1, 1]) {
      const span = new THREE.PlaneGeometry(L, 1.4, n, 1), p = span.attributes.position;
      for (let i = 0; i < p.count; i++) { const t = (p.getX(i) + L / 2) / L; p.setY(i, p.getY(i) + branchY(B, Math.sign(x1 - x0) > 0 ? t : 1 - t) + 0.7); }
      kit.add('rail', scaleUV(span, L / 2.8, 1).translate((x0 + x1) / 2, 0, z0 + s * (B.hw - 0.3)), PEARL);
      const side = new THREE.PlaneGeometry(L, 6, n, 1), q = side.attributes.position;
      for (let i = 0; i < q.count; i++) { const t = (q.getX(i) + L / 2) / L, top = branchY(B, Math.sign(x1 - x0) > 0 ? t : 1 - t); q.setY(i, q.getY(i) > 0 ? top : -1); }
      kit.add('arcade', scaleUV(side, L / 12, 1).translate((x0 + x1) / 2, 0, z0 + s * B.hw), '#ffffff');
    }
    const nl = Math.round(L / 60);
    for (let k = 1; k < nl; k++) { const t = k / nl, x = x0 + (x1 - x0) * t; lamps.push([x, branchY(B, t), z0 + B.hw - 1, 0.8, 0]); }
  }

  // ---- B20 Bridge Pavilions: the arrival plaza (detail pass to follow from its sheet-06 panel) ----
  {
    const g = new THREE.CircleGeometry(B20.r, 64).rotateX(-Math.PI / 2), uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 8, uv.getY(i) * 8);
    kit.add('deck', g.translate(B20.x, B20.y + 0.02, B20.z), '#ffffff');
    kit.add('gold', new THREE.TorusGeometry(B20.r, 0.4, 4, 96).rotateX(Math.PI / 2).translate(B20.x, B20.y + 0.1, B20.z), GOLD);
    for (const s of [-1, 1]) {                                     // the twin blue-domed pavilions, scaled with the world
      const x = B20.x + s * 46 * S, z = B20.z - 10 * S, k = S;
      kit.add('ivory', cyl(13 * k, 13.5 * k, 1.4 * k, 8, x, B20.y, z), PEARL);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; kit.add('ivory', cyl(0.7 * k, 0.8 * k, 12 * k, 10, x + Math.cos(a) * 10.5 * k, B20.y + 1.4 * k, z + Math.sin(a) * 10.5 * k), PEARL); addCollider({ x: x + Math.cos(a) * 10.5 * k, z: z + Math.sin(a) * 10.5 * k, r: 0.9 * k }); }
      kit.add('ivory', cyl(12 * k, 12 * k, 2 * k, 16, x, B20.y + 13.4 * k, z), PEARL);
      kit.add('gold', cyl(12.2 * k, 12.2 * k, 0.4 * k, 16, x, B20.y + 15.4 * k, z), GOLD);
      kit.add('dome', cap('dome', 11 * k, 12 * k, 24).translate(x, B20.y + 15.8 * k, z), '#7fb0ff');
      kit.add('gold', finialGeo(1.6 * k).translate(x, B20.y + 27.6 * k, z), GOLD);
      fountains.push([x, B20.y + 1.4 * k, z, 0.35 * k]);
    }
    // the gateway arch where the causeway begins
    const gz = C.z1 + 6;
    for (const s of [-1, 1]) { kit.add('ivory', box(5, 22, 5, s * (C.hw + 3), B20.y, gz), PEARL); kit.add('gold', finialGeo(1.5).translate(s * (C.hw + 3), B20.y + 22, gz), GOLD); addCollider({ x: s * (C.hw + 3), z: gz, r: 3.4 }); }
    const archS = new THREE.Shape(); archS.moveTo(-C.hw - 5.5, 0); archS.lineTo(C.hw + 5.5, 0); archS.lineTo(C.hw + 5.5, 6); archS.quadraticCurveTo(0, 14, -C.hw - 5.5, 6); archS.lineTo(-C.hw - 5.5, 0);
    const inner = new THREE.Path(); inner.moveTo(-C.hw - 0.5, -0.1); inner.lineTo(C.hw + 0.5, -0.1); inner.quadraticCurveTo(0, 8, -C.hw - 0.5, -0.1); archS.holes.push(inner);
    kit.add('ivory', new THREE.ExtrudeGeometry(archS, { depth: 3, bevelEnabled: false }).translate(0, B20.y + 16, gz - 1.5), PEARL);
    for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2 + Math.PI / 28, x = B20.x + Math.cos(a) * (B20.r - 4); if (Math.abs(x) > 22) lamps.push([x, B20.y, B20.z + Math.sin(a) * (B20.r - 4), 1, 0]); }
  }

  // ---- lotus fountains ----
  const fstone = [], fgold = [], fwater = [], fbud = [];
  for (const [x, y, z, s] of fountains) {
    const f = lotusFountainGeo(9 * s);
    fstone.push(f.stone.translate(x, y, z)); fgold.push(f.gold.translate(x, y, z)); fwater.push(f.water.translate(x, y, z)); fbud.push(f.bud.translate(x, y, z));
  }
  const watMat = waterMaterial(0.3), fallMat = waterMaterial(1, true);
  group.add(new THREE.Mesh(merge(fstone), am.lit), new THREE.Mesh(merge(fgold), mats.gold), new THREE.Mesh(merge(fwater), watMat), new THREE.Mesh(merge(fbud), am.crystal));
  kit.build(mats, group, 'approach');
  group.add(new THREE.Mesh(merge(water), watMat), new THREE.Mesh(merge(falls), fallMat));
  const lamp = postLampGeo();
  const railPost = merge([paint(new THREE.BoxGeometry(0.5, 1.7, 0.5).translate(0, 0.85, 0), PEARL), paint(new THREE.OctahedronGeometry(0.36, 0).translate(0, 2, 0), GOLD)]);
  // tiled so that only the stretch round the camera is drawn: [group, range in metres]
  const tiled = [
    [tiledInstances(lamp.body, am.lit, lamps, 'lamp-body'), 1100], [tiledInstances(lamp.glass, am.crystal, lamps, 'lamp-glass'), 1100],
    [tiledInstances(cypressGeo(), am.leaf, cypress, 'terrace-cypress'), 2600], [tiledInstances(blossomGeo(), am.leaf, blossoms, 'terrace-blossoms'), 2600],
    [tiledInstances(willowGeo(), am.leaf, willows, 'willows'), 2600], [tiledInstances(roseClumpGeo(), am.leaf, clumps, 'terrace-roses'), 1000],
    [tiledInstances(avenueTreeGeo(), am.leaf, avenue, 'avenue-trees'), 2200], [tiledInstances(railPost, am.lit, posts, 'rail-posts'), 700],
  ];
  for (const [g] of tiled) group.add(g);
  group.add(instances(benchGeo(), am.lit, benches, 'benches'));
  const halos = haloPoints(lamps.map(([x, y, z, s]) => [x, y + 5.3 * s, z, 2.2 * s]), [1, 0.85, 0.7]);
  group.add(halos);
  group.traverse((o) => { if (o.isMesh) { o.receiveShadow = true; o.castShadow = o.name === 'avenue-trees'; } });

  // ---- floating lanterns on Lantern Lake, lit at night ----
  const lanternCount = preset.particles > 1000 ? 900 : 450;
  const lp = new Float32Array(lanternCount * 3), lr = rng(9);
  for (let i = 0; i < lanternCount; i++) {
    let x, z, k = 0;
    do { x = LAKE.x + (lr() - 0.5) * LAKE.rx * 2; z = LAKE.z + (lr() - 0.5) * LAKE.rz * 2; } while (lakeDistance(x, z) > -20 && k++ < 30);
    lp[i * 3] = x; lp[i * 3 + 1] = 0.6; lp[i * 3 + 2] = z;
  }
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(lp, 3));
  const lanternMat = new THREE.PointsMaterial({ map: glowTexture(), color: '#ffc070', size: 14, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
  const lakeLanterns = new THREE.Points(lg, lanternMat);
  group.add(lakeLanterns);

  // ---- neon ripples: every step on the causeway, the bridges and the terraces sends out a ring ----
  const RIPPLE = ['#4dff9a', '#4dc8ff', '#b06cff', '#ffe066', '#ff7ad0'];
  const ripples = Array.from({ length: 24 }, (_, i) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 40).rotateX(-Math.PI / 2), additive(RIPPLE[i % 5], { opacity: 0 }));
    m.visible = false; group.add(m); return { m, t: 1 };
  });
  let rip = 0;
  scene.add(group);

  // a sky-boat station at each end of the golden route
  const portals = [];
  if (makePortal) {
    const a = { x: B20.x + 30 * S, z: B20.z + 34 * S, y: B20.y }, b = { x: 150 * S, z: 505 * S, y: PAL.y };
    const pa = makePortal(a.x, a.y, a.z, 0, '#ffd47a', '✦ Sky Boat to the Palace'), pb = makePortal(b.x, b.y, b.z, Math.PI, '#ffd47a', '✦ Sky Boat to the Bridge Pavilions');
    group.add(pa.group, pb.group);
    portals.push(
      { ...a, kind: 'to', disk: pa.disk, land: { x: b.x, y: b.y, z: b.z + 12, name: 'Princess Palace', facing: Math.PI } },
      { ...b, kind: 'to', disk: pb.disk, land: { x: a.x - 8, y: a.y, z: a.z - 14, name: 'Bridge Pavilions', facing: Math.PI } },
    );
  }

  return {
    portals, tapMesh: group.getObjectByName('approach-deck'),
    step(x, y, z, strength = 1) {
      const r = ripples[rip++ % ripples.length];
      r.m.position.set(x, y + 0.06, z); r.t = 0; r.s = strength; r.m.visible = true;
    },
    update(t, dt = 0.016, camera) {
      if (camera) for (const [g, range] of tiled) g.userData.cull(camera.position.x, camera.position.z, range);
      watMat.uniforms.uTime.value = t; fallMat.uniforms.uTime.value = t; halos.material.uniforms.uTime.value = t;
      lanternMat.opacity = 0.15 + 0.75 * MOOD.night.value;
      mats.arcade.emissiveIntensity = 0.35 + 0.6 * MOOD.night.value;
      lakeLanterns.position.y = Math.sin(t * 0.8) * 0.15;
      for (const p of portals) p.disk.material.uniforms.uTime.value = t;
      for (const r of ripples) {
        if (!r.m.visible) continue;
        r.t += dt / 1.6;
        if (r.t >= 1) { r.m.visible = false; continue; }
        const s = 1 + r.t * 7 * r.s;
        r.m.scale.set(s, 1, s);
        r.m.material.opacity = (1 - r.t) * 0.9;
      }
    },
  };
}
