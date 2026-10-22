// Lush painterly trees with glowing trunk patterns, bioluminescent pools of
// light beneath them, glowing flowers and grass tufts. All instanced: one draw
// call per kind no matter how many there are.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { toon, additive, nightGrade } from './materials.js';
import { trunkTexture, glowTexture, leafTexture, leafClumpTexture, flowerTexture, rng } from './textures.js';
import { ISLANDS, isClearOfBuildings, addCollider, groundAt, islandAt, terrainHeight, groundHSL, randomOnIsland, MAIN_SHARE_R } from './layout.js';
import { MOOD } from './sky.js';

const BLOBS = [[0, 0, 0, 1], [0.9, -0.35, 0.3, 0.72], [-0.8, -0.3, -0.4, 0.75], [0.2, 0.55, -0.5, 0.65], [-0.3, -0.25, 0.9, 0.6],
    [0.55, 0.3, 0.6, 0.55], [-0.6, 0.35, 0.3, 0.55], [0.1, -0.55, -0.85, 0.55], [0.7, 0.1, -0.7, 0.5]];

// detail 0 is the light Low-quality crown (a fifth of the triangles)
export function canopyGeometry(r, detail = 1) {
  const parts = [];
  for (const [x, y, z, s] of BLOBS) {
    const g = new THREE.IcosahedronGeometry(s, detail);
    const p = g.attributes.position;
    const seed = r() * 10;
    // displacement is a function of position, so neighbouring triangles stay stitched together
    for (let i = 0; i < p.count; i++) {
      const x0 = p.getX(i), y0 = p.getY(i), z0 = p.getZ(i);
      const k = 1 + (Math.sin(x0 * 5.1 + seed) + Math.sin(y0 * 4.3 + z0 * 3.7 + seed)) * 0.05;
      p.setXYZ(i, x0 * k, y0 * k * 0.85, z0 * k);
    }
    g.translate(x, y, z);
    parts.push(g);
  }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)));
  g.computeVertexNormals();
  // The Genshin / Ghibli tree trick: bend every normal towards "away from the
  // canopy centre" so the many blobs shade like one soft, fluffy cloud.
  const p = g.attributes.position, n = g.attributes.normal, v = new THREE.Vector3(), f = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.set(p.getX(i), p.getY(i) + 0.2, p.getZ(i)).normalize();
    f.set(n.getX(i), n.getY(i), n.getZ(i)).multiplyScalar(0.1).add(v.multiplyScalar(0.9)).normalize();
    n.setXYZ(i, f.x, f.y, f.z);
  }
  return g;
}

// Leaf-card shell (reference T1): clumps of painted leaves scattered over the
// blobs, each card lit with the canopy's spherical normal so the whole crown
// shades as one soft volume while its edge breaks up into real leaves.
export function leafCardGeometry(r, count) {
  const pos = [], nor = [], uv = [], idx = [];
  const n = new THREE.Vector3(), u = new THREE.Vector3(), v = new THREE.Vector3(), c = new THREE.Vector3(), sn = new THREE.Vector3();
  const total = BLOBS.reduce((a, b) => a + b[3] * b[3], 0);
  for (let k = 0; k < count; k++) {
    let pick = r() * total, b = BLOBS[0];
    for (const bb of BLOBS) { pick -= bb[3] * bb[3]; if (pick <= 0) { b = bb; break; } }
    n.set(r() * 2 - 1, r() * 1.6 - 0.45, r() * 2 - 1).normalize();
    c.set(b[0], b[1], b[2]).addScaledVector(n, b[3] * 0.92);
    const size = 0.42 + r() * 0.3;
    u.set(0, 1, 0).cross(n); if (u.lengthSq() < 0.01) u.set(1, 0, 0); u.normalize();
    v.crossVectors(n, u);
    const roll = r() * Math.PI * 2, cr = Math.cos(roll), srr = Math.sin(roll);
    const uu = u.clone().multiplyScalar(cr).addScaledVector(v, srr), vv = v.clone().multiplyScalar(cr).addScaledVector(u, -srr);
    const base = pos.length / 3;
    for (const [a, bq, s, t] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
      const px = c.x + (uu.x * a + vv.x * bq) * size, py = c.y + (uu.y * a + vv.y * bq) * size, pz = c.z + (uu.z * a + vv.z * bq) * size;
      pos.push(px, py * 0.85, pz);
      sn.set(px, py + 0.2, pz).normalize();
      nor.push(sn.x, sn.y, sn.z);
      uv.push(s, t);
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Height-mask tint (reference F2): crowns lighter and warmer on top, cooler
// and darker underneath. The inner blob is the dark core, the leaf cards the
// bright rim (reference T2), and leaves glow when backlit (T3).
export function canopyMaterial(core) {
  const m = new THREE.MeshLambertMaterial({
    color: '#ffffff', map: core ? leafTexture() : leafClumpTexture(), emissive: '#10283a', emissiveIntensity: 0.8,
    ...(core ? {} : { alphaTest: 0.45, side: THREE.DoubleSide }),
  });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uNight = MOOD.night;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vCanopyY;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvCanopyY = position.y;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vCanopyY;\nuniform float uNight;')
      // both faces of a leaf card share the outward canopy normal
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(vNormal);')
      .replace('#include <opaque_fragment>', `
        float hm = smoothstep(-0.9, 1.1, vCanopyY);
        outgoingLight *= mix(vec3(0.55, 0.62, 0.82), vec3(1.15, 1.1, 0.92), hm) * ${core ? '0.62' : '1.0'};
        vec3 rimView = normalize(vViewPosition);
        float edge = pow(1.0 - clamp(abs(dot(normal, rimView)), 0.0, 1.0), 3.0);
        vec3 backlit = mix(vec3(1.0, 0.72, 0.35), vec3(0.45, 0.95, 1.0), uNight);
        outgoingLight += diffuseColor.rgb * backlit * edge * ${core ? '0.15' : '0.55'};
        #include <opaque_fragment>`);
  };
  return nightGrade(m, core ? 'canopy-core' : 'canopy-cards');
}

function scatter(count, r, minEdge = 4, margin = 0) {
  const share = (i) => (i.main ? MAIN_SHARE_R : i.r) ** 2;
  const total = ISLANDS.reduce((s, i) => s + share(i), 0);
  const pts = [];
  for (const isl of ISLANDS) {
    const n = Math.round((count * share(isl)) / total);
    let tries = 0, made = 0;
    while (made < n && tries++ < n * 20) {
      const [x, z] = randomOnIsland(isl, r, minEdge);
      if (!isClearOfBuildings(x, z, margin, isl.y)) continue;
      if (isl.id === 'lake' && Math.hypot(x - (isl.x + 26), z - (isl.z - 10)) < 8) continue;
      if (isl.id === 'aurora' && Math.hypot(x - isl.x, z - isl.z) < 9) continue;
      if (pts.some((p) => margin > 0 && Math.hypot(p.x - x, p.z - z) < margin)) continue;
      const y = groundAt(x, z, isl.y);
      if (y == null) continue;
      pts.push({ x, z, y, isl });
      made++;
    }
  }
  return pts;
}

export function createNature(scene, preset) {
  const r = rng(7);
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();

  // --- trees ---
  const spots = scatter(preset.trees, r, 5, 3.2);
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.6, 1, 7);
  trunkGeo.translate(0, 0.5, 0);
  const tTex = trunkTexture(); tTex.repeat.set(1, 2);
  const trunks = new THREE.InstancedMesh(trunkGeo, toon('#ffffff', { map: tTex, emissive: '#ffffff', emissiveMap: tTex, emissiveIntensity: 0.9 }), spots.length);
  const canopyGeo = canopyGeometry(r, preset.grass < 4000 ? 0 : 1);
  const cardGeo = leafCardGeometry(r, preset.leafCards ?? 60);
  const coreMat = canopyMaterial(true), cardMat = canopyMaterial(false);
  const canopy = new THREE.InstancedMesh(canopyGeo, coreMat, spots.length);
  const cards = new THREE.InstancedMesh(cardGeo, cardMat, spots.length);
  const pools = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), additive('#ffffff', { map: glowTexture(), opacity: 0.55 }), spots.length);
  // lush saturated greens with complementary accent trees (reference T14):
  // pink blossom, gold and teal against the green
  const palette = [
    [0.32, 0.68, 0.40], [0.29, 0.72, 0.42], [0.36, 0.62, 0.36], [0.27, 0.68, 0.44],
    [0.94, 0.68, 0.78], [0.11, 0.95, 0.68], [0.48, 0.62, 0.44], [0.82, 0.5, 0.72],
  ];
  spots.forEach((s, i) => {
    const h = 4 + r() * 5, scale = 2.2 + r() * 2.2;
    dummy.position.set(s.x, s.y, s.z); dummy.rotation.set(0, r() * 6.28, 0); dummy.scale.set(1 + r() * 0.4, h, 1 + r() * 0.4);
    dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = s.y + h + scale * 0.35; dummy.scale.setScalar(scale);
    dummy.updateMatrix(); canopy.setMatrixAt(i, dummy.matrix); cards.setMatrixAt(i, dummy.matrix);
    const p = palette[r() < (s.isl.main ? 0.72 : 0.55) ? Math.floor(r() * 4) : 4 + Math.floor(r() * 4)];
    color.setHSL(p[0] + (r() - 0.5) * 0.04, p[1], p[2] + (r() - 0.5) * 0.08);
    canopy.setColorAt(i, color); cards.setColorAt(i, color);
    dummy.position.set(s.x, s.y + 0.06, s.z); dummy.rotation.set(0, 0, 0); dummy.scale.setScalar(scale * 3.4);
    dummy.updateMatrix(); pools.setMatrixAt(i, dummy.matrix);
    pools.setColorAt(i, color.setHSL(r() < 0.5 ? 0.5 : 0.8, 0.9, 0.55));
    addCollider({ x: s.x, z: s.z, r: 0.75, y0: s.y, y1: s.y + h });
  });
  trunks.castShadow = canopy.castShadow = true;
  group.add(trunks, canopy, cards, pools);

  // --- round shrubs: small copies of the tree crowns sitting on the ground ---
  const bspots = scatter(Math.round(preset.flowers * 0.45), r, 3, 0);
  const bushCore = new THREE.InstancedMesh(canopyGeo, coreMat, bspots.length);
  const bushCards = new THREE.InstancedMesh(cardGeo, cardMat, bspots.length);
  bspots.forEach((s, i) => {
    const sc = 0.6 + r() * 0.8;
    dummy.position.set(s.x, s.y + sc * 0.45, s.z); dummy.rotation.set(0, r() * 6.28, 0); dummy.scale.set(sc * 1.2, sc, sc * 1.2);
    dummy.updateMatrix(); bushCore.setMatrixAt(i, dummy.matrix); bushCards.setMatrixAt(i, dummy.matrix);
    const p = palette[r() < 0.8 ? Math.floor(r() * 4) : 4 + Math.floor(r() * 4)];
    color.setHSL(p[0], p[1], p[2] - 0.04);
    bushCore.setColorAt(i, color); bushCards.setColorAt(i, color);
  });
  bushCore.castShadow = true;
  group.add(bushCore, bushCards);

  // --- flower patches (U05 / U13): specks of colour in clusters ---
  const centres = scatter(Math.round(preset.flowers / 7), r, 3, 0);
  const fl = [];
  const fcols = ['#ffd84a', '#ffffff', '#ff9bd6', '#ff8a4a', '#c9a6ff', '#7ff3ff'];
  for (const c of centres) {
    const col = fcols[Math.floor(r() * fcols.length)];
    const k = 6 + Math.floor(r() * 9);
    for (let j = 0; j < k; j++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * 2.6;
      const x = c.x + Math.cos(a) * d, z = c.z + Math.sin(a) * d;
      if (!isClearOfBuildings(x, z, 0, c.y)) continue;
      const y = groundAt(x, z, c.y);
      if (y == null) continue;
      fl.push({ x, y, z, col });
    }
  }
  const petal = new THREE.PlaneGeometry(0.42, 0.42).rotateX(-Math.PI / 2);
  const flowers = new THREE.InstancedMesh(petal, new THREE.MeshBasicMaterial({ color: '#ffffff', map: flowerTexture(), alphaTest: 0.5, side: THREE.DoubleSide, toneMapped: false }), fl.length);
  fl.forEach((f, i) => {
    dummy.position.set(f.x, f.y + 0.25 + r() * 0.3, f.z); dummy.rotation.set((r() - 0.5) * 0.7, r() * 6, (r() - 0.5) * 0.7); dummy.scale.setScalar(0.7 + r() * 0.7);
    dummy.updateMatrix(); flowers.setMatrixAt(i, dummy.matrix);
    flowers.setColorAt(i, color.set(f.col).multiplyScalar(0.85));
  });
  group.add(flowers);

  // --- wind-swept grass tufts: Genshin / Ghibli meadows ---
  // Each tuft is a fan of blades coloured from the ground beneath it and lit
  // with the ground's own upward normal, so grass and terrain read as one.
  const gspots = scatter(preset.grass, r, 1.5, 0);
  const blades = preset.grassBlades ?? 4;
  const n = gspots.length * blades;
  const gp = new Float32Array(n * 9), gc = new Float32Array(n * 9), gw = new Float32Array(n * 3), gn = new Float32Array(n * 9);
  const base = new THREE.Color(), tip = new THREE.Color();
  let bi = 0;
  gspots.forEach((s) => {
    const isl = islandAt(s.x, s.z, s.y) || s.isl;
    const hsl = groundHSL(isl, s.x, s.z, terrainHeight(isl, s.x, s.z));
    for (let k = 0; k < blades; k++, bi++) {
      const ox = s.x + (r() - 0.5) * 0.7, oz = s.z + (r() - 0.5) * 0.7;
      const a = r() * Math.PI, w = 0.06 + r() * 0.06, h = 0.35 + r() * 0.5;
      const dx = Math.cos(a) * w, dz = Math.sin(a) * w, lx = (r() - 0.5) * 0.35, lz = (r() - 0.5) * 0.35;
      gp.set([ox - dx, s.y - 0.05, oz - dz, ox + dx, s.y - 0.05, oz + dz, ox + lx, s.y + h, oz + lz], bi * 9);
      base.setHSL(hsl[0] + 0.01, hsl[1], hsl[2] * 0.72);
      tip.setHSL(hsl[0] - 0.035 - r() * 0.02, Math.min(1, hsl[1] + 0.08), Math.min(0.8, hsl[2] * 1.35 + r() * 0.04));
      gc.set([base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b], bi * 9);
      gn.set([0, 1, 0, 0, 1, 0, 0, 1, 0], bi * 9);
      gw.set([0, 0, 1], bi * 3);
    }
  });
  const gg = new THREE.BufferGeometry();
  gg.setAttribute('position', new THREE.BufferAttribute(gp, 3));
  gg.setAttribute('normal', new THREE.BufferAttribute(gn, 3));
  gg.setAttribute('color', new THREE.BufferAttribute(gc, 3));
  gg.setAttribute('aTip', new THREE.BufferAttribute(gw, 1));
  const grassTime = { value: 0 };
  const grassMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, emissive: '#10283a', emissiveIntensity: 0.5 });
  grassMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = grassTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime; attribute float aTip;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float gust = sin(transformed.x * .08 + uTime * 1.3) * .5 + sin(transformed.z * .11 + uTime * .9) * .5;
        transformed.x += aTip * (.12 + .2 * gust); transformed.z += aTip * .08 * sin(uTime * 2. + transformed.x);`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nnormal = normalize(vNormal);');
  };
  nightGrade(grassMat, 'grass-wind');
  const grass = new THREE.Mesh(gg, grassMat);
  grass.receiveShadow = true;
  group.add(grass);

  scene.add(group);
  return {
    update(t) {
      grassTime.value = t;
      // canopies breathe with a soft bioluminescent pulse
      trunks.material.emissiveIntensity = 0.2 + 0.7 * MOOD.night.value;
      coreMat.emissiveIntensity = cardMat.emissiveIntensity = 0.7 + Math.sin(t * 0.8) * 0.1;
      // bioluminescent pools only really show after dark
      pools.material.opacity = (0.08 + 0.4 * MOOD.night.value) * (1 + Math.sin(t * 1.1) * 0.25);
    },
  };
}

// Giant trees lining the grand approach (owner's request: "pathways to the castle
// filled with lush giant trees"): the same leafy crowns, three times the size,
// with tall trunks. Positions are given by the caller.
export function giantTrees(scene, spots, preset) {
  const r = rng(808);
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const color = new THREE.Color();
  const trunkGeo = new THREE.CylinderGeometry(0.35, 0.75, 1, 9);
  trunkGeo.translate(0, 0.5, 0);
  const tTex = trunkTexture(); 
  const trunks = new THREE.InstancedMesh(trunkGeo, toon('#ffffff', { map: tTex, emissive: '#ffffff', emissiveMap: tTex, emissiveIntensity: 0.4 }), spots.length);
  const coreMat = canopyMaterial(true), cardMat = canopyMaterial(false);
  const crowns = new THREE.InstancedMesh(canopyGeometry(r, preset.grass < 4000 ? 0 : 1), coreMat, spots.length);
  const cards = new THREE.InstancedMesh(leafCardGeometry(r, (preset.leafCards ?? 60) + 24), cardMat, spots.length);
  const greens = [[0.31, 0.62, 0.36], [0.28, 0.66, 0.4], [0.34, 0.55, 0.34], [0.94, 0.6, 0.74]];
  spots.forEach((s, i) => {
    const h = s.h ?? 13 + r() * 5, sc = s.sc ?? 7 + r() * 2.5, w = s.w ?? 2.4;
    dummy.position.set(s.x, s.y, s.z); dummy.rotation.set(0, r() * 6.28, 0); dummy.scale.set(w, h, w);
    dummy.updateMatrix(); trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.y = s.y + h + sc * 0.2; dummy.scale.setScalar(sc);
    dummy.updateMatrix(); crowns.setMatrixAt(i, dummy.matrix); cards.setMatrixAt(i, dummy.matrix);
    const p = greens[s.pink ? 3 : Math.floor(r() * 3)];
    color.setHSL(p[0], p[1], p[2] + (r() - 0.5) * 0.05);
    crowns.setColorAt(i, color); cards.setColorAt(i, color);
    addCollider({ x: s.x, z: s.z, r: w * 0.67, y0: s.y, y1: s.y + h });
  });
  trunks.castShadow = crowns.castShadow = true;
  group.add(trunks, crowns, cards);
  scene.add(group);
  return group;
}

