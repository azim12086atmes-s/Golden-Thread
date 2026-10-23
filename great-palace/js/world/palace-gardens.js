// Garden rooms for the complete 3fcc2b4 palace. World metres, unchanged walkable layout.
// The near-field plant geometry and painted atlases come from Golden Thread a6c20a4.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PAL, S, TERRACES, STAIRS, PORTALS, PLAZA, PALACE_TIERS, palaceRoofY, COLLIDERS } from './layout.js';
import { MOOD } from './sky.js';
import { MEADOW_TIME, nightGrade } from './materials.js';
import { tuftGeo, tuftTexture, flowerGeo, flowerTexture, leafAtlas } from './golden-garden-plants.js';

const TAU = Math.PI * 2;
const hash = (x, z, seed = 0) => {
  let n = Math.imul(x | 0, 374761393) ^ Math.imul(z | 0, 668265263) ^ Math.imul(seed + 1, 1442695041);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
let stoneGrain, paving;
function grain() {
  if (stoneGrain) return stoneGrain;
  const n = 128, d = new Uint8Array(n * n * 4);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const v = 112 + Math.floor(hash(i, j, 5) * 60 + Math.sin(i * .17 + j * .09) * 10), at = (j * n + i) * 4;
    d.set([v, v, v, 255], at);
  }
  stoneGrain = new THREE.DataTexture(d, n, n); stoneGrain.wrapS = stoneGrain.wrapT = THREE.RepeatWrapping;
  stoneGrain.magFilter = THREE.LinearFilter; stoneGrain.minFilter = THREE.LinearMipmapLinearFilter;
  stoneGrain.generateMipmaps = true; stoneGrain.needsUpdate = true;
  return stoneGrain;
}

// Rough, lightly veined stone; window artwork remains intact and glows only after dusk.
export function palaceStone(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .87, metalness: .025,
    bumpMap: grain(), bumpScale: .065, ...opts });
}
export function gardenPavingTexture() {
  if (paving) return paving;
  const c = document.createElement('canvas'); c.width = c.height = 512;
  const x = c.getContext('2d');
  x.fillStyle = '#b7ab96'; x.fillRect(0, 0, 512, 512);
  // Large staggered limestone slabs; no painted flowers or painted pools.
  for (let j = 0; j < 8; j++) for (let i = -1; i < 9; i++) {
    const px = i * 64 + (j % 2) * 32, y = j * 64, v = Math.floor(hash(i, j, 3) * 14);
    x.fillStyle = `rgb(${213 + v},${204 + v},${185 + v})`; x.fillRect(px + 1, y + 1, 62, 62);
    x.strokeStyle = 'rgba(255,250,230,.34)'; x.strokeRect(px + 2, y + 2, 60, 60);
    for (let k = 0; k < 13; k++) {
      x.strokeStyle = 'rgba(120,100,80,.055)'; x.beginPath();
      const yy = y + hash(i * 19 + k, j, 10) * 62;
      x.moveTo(px, yy); x.bezierCurveTo(px + 20, yy - 5, px + 43, yy + 7, px + 64, yy + 2); x.stroke();
    }
  }
  paving = new THREE.CanvasTexture(c); paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
  paving.colorSpace = THREE.SRGBColorSpace; paving.anisotropy = 8;
  return paving;
}

function plantMaterial(map, flower = false) {
  const m = nightGrade(new THREE.MeshLambertMaterial({ map, alphaTest: .42, side: THREE.DoubleSide }), flower ? 'palace-flower' : 'palace-grass');
  const prev = m.onBeforeCompile;
  m.onBeforeCompile = (sh, renderer) => {
    prev(sh, renderer); sh.uniforms.uGardenTime = MEADOW_TIME;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uGardenTime; attribute float tip;')
      .replace('#include <project_vertex>', `
        vec4 gw = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        float gust = sin(gw.x * .037 + gw.z * .051 - uGardenTime * 1.6);
        transformed.x += (gust * .12 + sin(gw.z * .8 + uGardenTime * 2.) * .025) * tip * tip;
        transformed.z += cos(gw.x * .04 - uGardenTime * 1.2) * .065 * tip * tip;
        #include <project_vertex>`);
    if (flower) sh.fragmentShader = sh.fragmentShader.replace('#include <color_fragment>', `
      #ifdef USE_COLOR
        float petal = smoothstep(.7, .88, min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b)));
        diffuseColor.rgb *= mix(vec3(1.), vColor.rgb, petal);
      #endif`);
  };
  m.customProgramCacheKey = () => 'palace-authored-plants-' + flower;
  return m;
}

// One reusable organic bed outline, modeled soil and a low, carved stone edge.
function bedGeometry(rim = false) {
  const p = [], uv = [], idx = [], N = 40;
  const radius = a => 1 + .07 * Math.sin(a * 3 + .6) + .035 * Math.sin(a * 5 - .7);
  if (!rim) {
    p.push(0, .12, 0); uv.push(.5, .5);
    for (let i = 0; i <= N; i++) { const a = i / N * TAU, r = radius(a); p.push(Math.cos(a) * r, .08, Math.sin(a) * r); uv.push(.5 + Math.cos(a) * .5, .5 + Math.sin(a) * .5); }
    for (let i = 1; i <= N; i++) idx.push(0, i + 1, i);
  } else {
    for (let i = 0; i <= N; i++) {
      const a = i / N * TAU, r = radius(a);
      for (const [rr, y] of [[r, 0], [r, .29], [r * .975, .29], [r * .975, .08]]) { p.push(Math.cos(a) * rr, y, Math.sin(a) * rr); uv.push(i / N * 16, y * 2); }
      if (i) for (let k = 0; k < 3; k++) { const b = (i - 1) * 4 + k; idx.push(b, b + 4, b + 5, b, b + 5, b + 1); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function createPalaceGardens(scene, preset, { clearRoof = () => true } = {}) {
  const group = new THREE.Group(); group.name = 'palace-living-gardens';
  const beds = [], index = new Map(), room = new THREE.Group(); room.name = 'garden-architecture'; group.add(room);
  const low = preset.key === 'low', high = preset.key === 'high';
  const dummy = new THREE.Object3D(), color = new THREE.Color();
  const stone = palaceStone('#ded2b9'), darkStone = palaceStone('#c1ae91');
  const bronze = palaceStone('#a88c54', { roughness: .42, metalness: .5 });
  const bark = palaceStone('#6e5540', { roughness: 1 });
  const green = nightGrade(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), 'garden-canopy');
  const earth = nightGrade(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1 }), 'garden-earth');
  const boxGeo = new THREE.BoxGeometry(1, 1, 1), trunkGeo = new THREE.CylinderGeometry(.7, 1, 1, 7);
  const crownGeo = new THREE.SphereGeometry(1, 9, 6);
  const trunks = [], crowns = [], hedges = [], lamps = [], branches = [];

  function blocked(x, z, y, radius) {
    for (const c of COLLIDERS) {
      // Tier solids end below their walkable roof; ignore those foundations.
      if (c.y1 !== undefined && c.y1 < y + .3) continue;
      if (c.y0 !== undefined && c.y0 > y + 7) continue;
      if (c.r !== undefined) { if (Math.hypot(x - c.x, z - c.z) < radius + c.r) return true; }
      else if (x + radius > c.minX && x - radius < c.maxX && z + radius > c.minZ && z - radius < c.maxZ) return true;
    }
    return false;
  }
  function addBed(x, y, z, a, b, angle, seed, roof = false, { trees = 2, hedge = true } = {}) {
    const cs = Math.cos(angle), sn = Math.sin(angle);
    if (blocked(x, z, y, Math.max(a, b) * 1.12)) return;
    // Bounds, existing architecture and the actual local roof are sampled, not guessed.
    for (let k = 0; k < 12; k++) {
      const u = Math.cos(k / 12 * TAU) * a * 1.12, v = Math.sin(k / 12 * TAU) * b * 1.12;
      const xx = x + u * cs - v * sn, zz = z + u * sn + v * cs;
      if (blocked(xx, zz, y, 1)) return;
      if (roof && (Math.abs((palaceRoofY(xx, zz) ?? -9999) - y) > .2 || !clearRoof(xx, zz, 4))) return;
    }
    const bed = { x, y, z, a, b, angle, cs, sn, seed }; beds.push(bed);
    const r = Math.max(a, b) * 1.15;
    for (let iz = Math.floor((z - r) / 64); iz <= Math.floor((z + r) / 64); iz++) for (let ix = Math.floor((x - r) / 64); ix <= Math.floor((x + r) / 64); ix++) {
      const key = ix + ',' + iz; if (!index.has(key)) index.set(key, []); index.get(key).push(bed);
    }
    // Clipped, rounded hedges and multi-crown trees produce depth even in long views.
    for (let k = 0; hedge && k < 18; k++) {
      const t = k / 18 * TAU, u = Math.cos(t) * a * .77, v = Math.sin(t) * b * .77;
      hedges.push([x + u * cs - v * sn, y + .75, z + u * sn + v * cs, 1.9 + hash(k, seed) * .8, .7 + hash(k, seed, 1) * .35, 1.4, '#526b3b']);
    }
    for (let k = 0; k < trees; k++) {
      const sign = k ? 1 : -1, u = a * .38 * sign, h = 6 + hash(seed, k, 7) * 6;
      const tx = x + u * cs, tz = z + u * sn;
      trunks.push([tx, y + h * .35, tz, .32, h * .7, .32]);
      for (let j = 0; j < 6; j++) {
        const t = j / 6 * TAU + seed, r = h * .19;
        crowns.push([tx + Math.cos(t) * r, y + h * (.74 + hash(seed, j, 9) * .18), tz + Math.sin(t) * r,
          h * .25, h * .2, h * .24, ['#66834b', '#7c9159', '#9ca56d', '#b79a9e'][seed % 4]]);
        branches.push([new THREE.Vector3(tx, y + h * .43, tz), new THREE.Vector3(tx + Math.cos(t) * r, y + h * .76, tz + Math.sin(t) * r)]);
      }
    }
  }
  function safeTerrace(x, z, T, radius) {
    if (Math.abs(x) < 125 || Math.abs(x) > T.hw - radius - 22 || z < T.z0 + radius + 24 || z > T.z1 - radius - 24) return false;
    if (PORTALS.some(p => Math.hypot(x - p.x, z - p.z) < radius + 22)) return false;
    if (Math.hypot(x - PLAZA.x, z - PLAZA.z) < radius + PLAZA.r + 15) return false;
    if (Math.hypot(x + 412.5, z - 1388.75) < radius + 24) return false;
    if (STAIRS.some(([za, zb, , , hw, cx = 0]) => z > za - radius - 18 && z < zb + radius + 18 && Math.abs(x - cx) < hw + radius + 20)) return false;
    // Existing mirror pools, fountain seats, tree planters and their promenades.
    if (T === TERRACES[0] && [-1, 1].some(s => Math.hypot(x - s * 825, z - 1292.5) < radius + 27 || (Math.abs(x - s * 412.5) < radius + 38 && Math.abs(z - 1292.5) < radius + 66))) return false;
    return true;
  }
  for (let k = 0; k < TERRACES.length; k++) {
    const T = TERRACES[k];
    for (let row = 0, z = T.z0 + 62; z < T.z1 - 48; z += 92, row++) for (let col = 0, x = -T.hw + 72; x < T.hw - 55; x += 110, col++) {
      const seed = k * 10000 + row * 101 + col, xx = x + Math.sin(row * 1.7) * 13, zz = z + Math.sin(col * .7) * 8;
      const a = 40 + hash(seed, 2) * 8, b = 28 + hash(seed, 3) * 7;
      if (safeTerrace(xx, zz, T, a * 1.13)) addBed(xx, T.y + .07, zz, a, b, (hash(seed, 4) - .5) * .6, seed);
    }
  }
  for (let k = 0; k < PALACE_TIERS.length; k++) {
    const [x0, x1, z0, z1, top] = PALACE_TIERS[k], y = PAL.y + top * S;
    for (let row = 0, z = z0 * S + 48; z < z1 * S - 35; z += 78, row++) for (let col = 0, x = x0 * S + 48; x < x1 * S - 35; x += 90, col++) {
      if (Math.abs(x) < 50 && z > 100 * S) continue;
      const seed = 50000 + k * 10000 + row * 107 + col;
      if (Math.abs((palaceRoofY(x, z) ?? -9999) - y) > .01 || !clearRoof(x, z, 30)) continue;
      addBed(x, y + .07, z, 27 + hash(seed, 3) * 5, 20 + hash(seed, 7) * 4, (hash(seed, 4) - .5) * .5, seed, true);
    }
  }

  // Human-scale planting inside the existing court: the central avenue, cake,
  // west fountain, east pool, conservatory and corner kiosks stay clear.
  for (const [i, [dx, dz, a, b]] of [[-37,33,9,3],[22,34,10,3],[-50,-18,3,7],[35,0,2,11],[-39,-25,9,3]].entries()) {
    addBed(-192.5+dx,1392.04,-412.5+dz,a,b,0,90000+i,false,{trees:0,hedge:false});
  }

  function batch(name, geometry, material, rows, colorAt = -1) {
    const mesh = new THREE.InstancedMesh(geometry, material, rows.length); mesh.name = name;
    rows.forEach((r, i) => { dummy.position.set(r[0], r[1], r[2]); dummy.rotation.set(0, 0, 0); dummy.scale.set(r[3], r[4], r[5]); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); if (colorAt >= 0) mesh.setColorAt(i, color.set(r[colorAt])); });
    mesh.castShadow = name === 'garden-tree-trunks'; mesh.receiveShadow = true; mesh.computeBoundingSphere(); group.add(mesh); return mesh;
  }
  const soilRows = beds.map(b => [b.x, b.y, b.z, b.a, 1, b.b, ['#657b46', '#778b54', '#667d4e'][b.seed % 3]]);
  const rims = batch('modeled-bed-curbs', bedGeometry(true), stone, soilRows);
  const soil = batch('planted-garden-beds', bedGeometry(), earth, soilRows, 6);
  // Rotate bed instances around their authored centre, preserving the same sampling transform.
  for (const mesh of [rims, soil]) beds.forEach((b, i) => { dummy.position.set(b.x, b.y, b.z); dummy.rotation.set(0, -b.angle, 0); dummy.scale.set(b.a, 1, b.b); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); });
  for (const mesh of [rims, soil]) { mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere(); }

  function block(mat, x, y, z, w, h, d) { const m = new THREE.Mesh(boxGeo, mat); m.position.set(x, y + h / 2, z); m.scale.set(w, h, d); m.castShadow = m.receiveShadow = true; room.add(m); }
  function pergola(x, y, z) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      block(stone, x + sx * 5, y, z + sz * 9, .65, 5.7, .65);
      block(darkStone, x + sx * 5, y, z + sz * 9, 1.2, .35, 1.2);
      block(stone, x + sx * 5, y + 5.4, z + sz * 9, 1.1, .4, 1.1);
    }
    for (const sx of [-1, 1]) block(darkStone, x + sx * 5, y + 5.8, z, .5, .38, 21);
    for (let zz = -10; zz <= 10; zz += 1.25) block(darkStone, x, y + 6.1, z + zz, 12, .22, .25);
    // Open middle; seats face the garden and never block the walking axis.
    for (const sx of [-1, 1]) { block(darkStone, x + sx * 4, y + .35, z, 1.2, .35, 6); block(stone, x + sx * 4, y, z - 2, .8, .35, .8); block(stone, x + sx * 4, y, z + 2, .8, .35, .8); }
    for (let k = 0; k < 6; k++) { const xx = x - 5 + k * 2; crowns.push([xx, y + 6.6, z - 9, 1.8, .7, 2.4, '#77854f']); }
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(.3, 1), new THREE.MeshStandardMaterial({ color: '#d6af70', emissive: '#ffbe66', emissiveIntensity: 0, roughness: .45 }));
    lamp.position.set(x, y + 4.8, z); room.add(lamp); lamps.push(lamp);
  }
  for (const T of TERRACES) for (const side of [-1, 1]) {
    const x = side * (T.hw - 54), z = (T.z0 + T.z1) / 2;
    if (safeTerrace(x, z, T, 15)) pergola(x, T.y + .08, z);
  }
  // The roof court remains the original 120 x 90 m celebration space, with clear entrances.
  const courtX = -192.5, courtZ = -412.5, courtY = 1392;
  for (const side of [-1, 1]) {
    const x = courtX + side * 76, z = courtZ - 15;
    if (!blocked(x, z, courtY, 8)) pergola(x, courtY, z);
  }


  batch('garden-tree-trunks', trunkGeo, bark, trunks);
  batch('garden-canopy-masses', crownGeo, green, crowns, 6);
  batch('garden-hedges', new THREE.SphereGeometry(1, 7, 4), green, hedges, 6);
  const branchMesh = new THREE.InstancedMesh(trunkGeo, bark, branches.length), up = new THREE.Vector3(0, 1, 0);
  branches.forEach(([a, b], i) => { const d = b.clone().sub(a); dummy.position.copy(a).add(b).multiplyScalar(.5); dummy.quaternion.setFromUnitVectors(up, d.clone().normalize()); dummy.scale.set(.12, d.length(), .12); dummy.updateMatrix(); branchMesh.setMatrixAt(i, dummy.matrix); });
  branchMesh.name = 'garden-tree-branches'; branchMesh.receiveShadow = true; branchMesh.computeBoundingSphere(); group.add(branchMesh);
  // All architectural beams of one finish merge; six pergolas do not add hundreds of draws.
  const beams = new Map();
  for (const child of [...room.children]) if (child.geometry === boxGeo) {
    child.updateMatrix();
    if (!beams.has(child.material)) beams.set(child.material, []);
    beams.get(child.material).push(child.geometry.clone().applyMatrix4(child.matrix));
    room.remove(child);
  }
  for (const [material, parts] of beams) {
    const mesh = new THREE.Mesh(mergeGeometries(parts), material);
    mesh.castShadow = mesh.receiveShadow = true; room.add(mesh);
    parts.forEach(g => g.dispose());
  }

  function bedAt(x, z, cameraY = Infinity) {
    for (const b of index.get(Math.floor(x / 64) + ',' + Math.floor(z / 64)) || []) {
      if (cameraY < b.y - 3 || cameraY > b.y + 65) continue;
      const dx = x - b.x, dz = z - b.z, u = (dx * b.cs + dz * b.sn) / b.a, v = (-dx * b.sn + dz * b.cs) / b.b;
      const a = Math.atan2(v, u), edge = (1 + .07 * Math.sin(a * 3 + .6) + .035 * Math.sin(a * 5 - .7)) * .9;
      if (u * u + v * v < edge * edge) return b;
    }
    return null;
  }
  const capacity = low ? 8500 : high ? 32000 : 19000;
  const grass = new THREE.InstancedMesh(tuftGeo(), plantMaterial(tuftTexture()), capacity);
  const flowers = new THREE.InstancedMesh(flowerGeo(), plantMaterial(flowerTexture(), true), Math.floor(capacity * .34));
  grass.name = 'palace-garden-grass';
  flowers.name = 'palace-garden-flowers';
  for (const m of [grass, flowers]) { m.count = 0; m.frustumCulled = false; m.receiveShadow = true; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); m.setColorAt(0, new THREE.Color()); group.add(m); }
  // Golden Thread's detailed leaf sprays sit over smooth canopy masses up close.
  const leafGeo = new THREE.PlaneGeometry(1, 1), luv = leafGeo.attributes.uv;
  const tips = []; for (let i = 0; i < luv.count; i++) { tips.push(luv.getY(i)); luv.setXY(i, luv.getX(i) * .25, .5 + luv.getY(i) * .5); }
  leafGeo.setAttribute('tip', new THREE.Float32BufferAttribute(tips, 1));
  const leaves = new THREE.InstancedMesh(leafGeo, plantMaterial(leafAtlas()), low ? 4500 : 18000);
  leaves.name = 'golden-thread-leaf-sprays'; leaves.count = 0; leaves.frustumCulled = false; leaves.receiveShadow = true; leaves.setColorAt(0, new THREE.Color()); group.add(leaves);
  function leafWindow(p) {
    let n = 0;
    for (let i = 0; i < crowns.length; i++) {
      const c = crowns[i]; if (Math.abs(p.y - c[1]) > 100 || Math.hypot(p.x - c[0], p.z - c[2]) > (low ? 120 : 260)) continue;
      for (let j = 0; j < 18 && n < leaves.instanceMatrix.count; j++) {
        const a = hash(i, j, 21) * TAU, v = hash(i, j, 22) * 1.8 - .9, r = Math.sqrt(1 - v * v);
        dummy.position.set(c[0] + Math.cos(a) * r * c[3] * .9, c[1] + v * c[4] * .9, c[2] + Math.sin(a) * r * c[5] * .9);
        dummy.rotation.set(v * -.65, a, (hash(i, j, 23) - .5) * .65); dummy.scale.setScalar(c[3] * (.65 + hash(i, j, 24) * .45)); dummy.updateMatrix();
        leaves.setMatrixAt(n, dummy.matrix); leaves.setColorAt(n++, color.set(c[6]));
      }
    }
    leaves.count = n; leaves.instanceMatrix.needsUpdate = true; if (leaves.instanceColor) leaves.instanceColor.needsUpdate = true;
  }
  const spacing = low ? .86 : .66, radius = low ? 40 : high ? 68 : 53, N = Math.ceil(radius * 2 / spacing);
  let bake = null, focusX = Infinity, focusY = Infinity, focusZ = Infinity;
  let cameraX = Infinity, cameraY = Infinity, cameraZ = Infinity, nearCamera = false;
  const flowerColors = ['#ead6d5', '#d29bb5', '#c5b7d6', '#eee1bd', '#b582a9'];
  function startBake(p) { bake = { ix: Math.floor(p.x / spacing) - (N >> 1), iz: Math.floor(p.z / spacing) - (N >> 1), row: 0, nt: 0, nf: 0, y: p.y }; focusX = p.x; focusY = p.y; focusZ = p.z; leafWindow(p); }
  function bakeRows(rows) {
    const b = bake; if (!b) return;
    for (let k = 0; k < rows && b.row < N; k++, b.row++) for (let col = 0; col < N; col++) {
      const i = b.ix + col, j = b.iz + b.row;
      const x = (i + .15 + hash(i, j, 2) * .7) * spacing, z = (j + .15 + hash(i, j, 3) * .7) * spacing;
      if (Math.hypot(x - focusX, z - focusZ) > radius) continue;
      const bed = bedAt(x, z, b.y); if (!bed) continue;
      if (b.nt < capacity) {
        dummy.position.set(x, bed.y + .1, z); dummy.rotation.set(0, hash(i, j, 5) * TAU, 0); dummy.scale.setScalar(.64 + hash(i, j, 7) * .38); dummy.updateMatrix();
        grass.setMatrixAt(b.nt, dummy.matrix); grass.setColorAt(b.nt++, color.setHSL(.22 + hash(i, j, 8) * .08, .33 + hash(i, j, 9) * .15, .29 + hash(i, j, 10) * .14));
      }
      if (hash(i, j, 13) < .3 && b.nf < flowers.instanceMatrix.count) {
        dummy.scale.setScalar(.85 + hash(i, j, 14) * .4); dummy.updateMatrix(); flowers.setMatrixAt(b.nf, dummy.matrix);
        flowers.setColorAt(b.nf++, color.set(flowerColors[(bed.seed + (i & 3)) % flowerColors.length]));
      }
    }
    // Only reveal a complete planted window; don't show partially written rows during movement.
    if (b.row >= N) { grass.count = b.nt; flowers.count = b.nf; for (const m of [grass, flowers]) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } bake = null; }
  }
  scene.add(group);
  group.userData.gardenStats = { beds: beds.length, trees: trunks.length, grassCapacity: capacity, flowerCapacity: flowers.instanceMatrix.count };
  return {
    group, beds, bedAt,
    update(t, camera) {
      MEADOW_TIME.value = t;
      for (const lamp of lamps) lamp.material.emissiveIntensity = MOOD.night.value * 1.8;
      if (!camera) return;
      const p = camera.position;
      cameraX = p.x; cameraY = p.y; cameraZ = p.z;
      const near = beds.some(b => Math.abs(p.y - b.y) < 65 && Math.hypot(p.x - b.x, p.z - b.z) < radius + Math.max(b.a, b.b));
      nearCamera = near;
      grass.visible = flowers.visible = leaves.visible = near;
      if (!near) return;
      const moved = Math.hypot(p.x - focusX, p.z - focusZ);
      const climbed = Math.abs(p.y - focusY);
      if (!bake && (moved > 8 || climbed > 8)) startBake(p);
      if (bake && (moved > radius * .6 || climbed > 8)) startBake(p);
      bakeRows(low ? 10 : 16);
    },
    get plantBakeStatus() {
      return {
        near: nearCamera,
        baking: !!bake,
        settled: nearCamera && !bake && Math.hypot(cameraX - focusX, cameraZ - focusZ) <= 8 && Math.abs(cameraY - focusY) <= 8,
        row: bake?.row ?? N,
        rows: N,
        focus: { x: focusX, y: focusY, z: focusZ },
        camera: { x: cameraX, y: cameraY, z: cameraZ },
        grass: grass.count,
        flowers: flowers.count,
        leaves: leaves.count,
      };
    },
    dispose() {
      const geos = new Set(), mats = new Set(); group.traverse(o => { if (o.geometry) geos.add(o.geometry); if (o.material) mats.add(o.material); });
      for (const g of geos) g.dispose(); for (const m of mats) m.dispose(); group.removeFromParent();
    },
  };
}
