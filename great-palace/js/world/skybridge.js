// The sky bridge (look pass, Oct 17): the 8 km marble way at 688 m from the palace's south
// terraces to the mountain gate. It replaces the 34 stacked arcade segments (744 m towers of
// pointed arches, hundreds of arches in all), which the owner found "very bad with too many
// arcs". Now it is eight grand spans: each a single long, shallow bow under the deck, carried by
// seven slender spire piers that rise from the lake and the hills, with pinnacles and lanterns
// above the deck, carved parapets with a gold rail, and a line of starlight under the keel at night.
import * as THREE from 'three';
import { crescentH } from './crescent.js';
import { MOOD } from './sky.js';

// the walkable deck (data/world/viaducts.json "SkyBridge"): centre, half length, rotY, deck height
const B = { x: -355.0, z: 6420.0, L: 4019.7, hw: 11, a: -1.65931, y: 688.0 };
const SPANS = 8;
const STEP = 20;                 // metres per segment along the bridge

function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')]; }

// pearl paving: big slabs with fine joints, a gold seam down each edge and an eight-point star
// inlaid every 44 m; slab tone varies so the run never reads as one stamp repeated
function deckTexture() {
  const [c, g] = canvas(256, 512);
  for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) {
    const t = 236 + ((i * 7 + j * 13) % 9) - 4;
    g.fillStyle = `rgb(${t + 6},${t},${t - 4})`; g.fillRect(i * 64, j * 64, 64, 64);
  }
  g.strokeStyle = 'rgba(160,140,150,0.45)'; g.lineWidth = 2;
  for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, 512); g.stroke(); }
  for (let j = 0; j <= 8; j++) { g.beginPath(); g.moveTo(0, j * 64); g.lineTo(256, j * 64); g.stroke(); }
  g.fillStyle = '#d6b060'; g.fillRect(0, 0, 10, 512); g.fillRect(246, 0, 10, 512);
  g.fillStyle = '#c99a4a';
  g.beginPath();
  for (let k = 0; k < 16; k++) { const ang = (k / 16) * Math.PI * 2, r = k % 2 ? 26 : 58; g.lineTo(128 + Math.cos(ang) * r, 256 + Math.sin(ang) * r); }
  g.closePath(); g.fill();
  g.fillStyle = '#5a6fd0'; g.beginPath(); g.arc(128, 256, 18, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// the underside of the deck: a shallow bow per span, deepest at the piers
function keel(u) {
  const span = (2 * B.L) / SPANS;
  const s = ((u + B.L) / span) % 1;
  const k = 2 * s - 1;
  return -5 - 70 * k * k * k * k - 18 * k * k;
}

function deckGeometry() {
  const n = Math.ceil((2 * B.L) / STEP);
  const pos = [], nrm = [], uv = [], idx = [];
  const quad = (a, b, c, d) => idx.push(a, b, c, a, c, d);
  // four strips: top, left side, right side, underside
  for (let i = 0; i <= n; i++) {
    const u = -B.L + (2 * B.L * i) / n, yb = keel(u);
    const v = u / 44;
    pos.push(u, 0, -B.hw, u, 0, B.hw); nrm.push(0, 1, 0, 0, 1, 0); uv.push(0, v, 1, v);                       // top
    pos.push(u, 0, -B.hw, u, yb, -B.hw); nrm.push(0, 0, -1, 0, 0, -1); uv.push(v * 4, 1, v * 4, 1 + yb / 22); // left
    pos.push(u, 0, B.hw, u, yb, B.hw); nrm.push(0, 0, 1, 0, 0, 1); uv.push(v * 4, 1, v * 4, 1 + yb / 22);    // right
    pos.push(u, yb, -B.hw, u, yb, B.hw); nrm.push(0, -1, 0, 0, -1, 0); uv.push(0, v, 1, v);                  // underside
  }
  for (let i = 0; i < n; i++) {
    const a = i * 8, b = a + 8;
    quad(a, a + 1, b + 1, b);                 // top
    quad(a + 2, b + 2, b + 3, a + 3);         // left
    quad(a + 4, a + 5, b + 5, b + 4);         // right
    quad(a + 6, b + 6, b + 7, a + 7);         // underside
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// a thin strip that follows the keel, for the night glow
function keelLine() {
  const n = Math.ceil((2 * B.L) / STEP), pos = [], idx = [];
  for (let i = 0; i <= n; i++) { const u = -B.L + (2 * B.L * i) / n, y = keel(u) - 0.3; pos.push(u, y, -1.2, u, y, 1.2); }
  for (let i = 0; i < n; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}

export function createSkyBridge(scene, quality) {
  const group = new THREE.Group();
  group.name = 'sky-bridge';
  group.position.set(B.x, B.y, B.z);
  group.rotation.y = B.a;
  const ax = new THREE.Vector3(Math.cos(B.a), 0, -Math.sin(B.a));       // local +x (u) in the world
  const world = (u) => new THREE.Vector3(B.x + ax.x * u, 0, B.z + ax.z * u);

  const marble = new THREE.MeshStandardMaterial({ color: '#f4eee9', map: deckTexture(), roughness: 0.55, metalness: 0 });
  const stone = new THREE.MeshStandardMaterial({ color: '#eadde3', roughness: 0.7 });
  const gold = new THREE.MeshStandardMaterial({ color: '#e0b860', roughness: 0.35, metalness: 0.45, emissive: '#3a2608' });
  const deck = new THREE.Mesh(deckGeometry(), marble);
  deck.receiveShadow = true;
  group.add(deck);

  // carved parapets with a gold rail, both sides, the whole way
  const len = 2 * B.L;
  for (const sd of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, 1.15, 0.7), stone);
    wall.position.set(0, 0.58, sd * (B.hw - 0.35)); group.add(wall);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(len, 0.22, 0.95), gold);
    rail.position.set(0, 1.26, sd * (B.hw - 0.35)); group.add(rail);
    const band = new THREE.Mesh(new THREE.BoxGeometry(len, 0.5, 0.2), gold);       // a gold band along the outer face
    band.position.set(0, -1.2, sd * (B.hw + 0.08)); group.add(band);
  }

  // seven spire piers from the ground to the keel, with pinnacles above the parapet over each one
  const span = len / SPANS;
  const pierGeos = [], spireGeos = [], orbs = [];
  for (let k = 1; k < SPANS; k++) {
    const u = -B.L + k * span;
    const w = world(u);
    const ground = Math.max(crescentH(w.x, w.z), 0) - 8;
    const top = B.y + keel(u) + 2;
    const h = top - ground;
    if (h > 30) {
      const g = new THREE.CylinderGeometry(10, 17, h, 4, 1).rotateY(Math.PI / 4).translate(u, ground - B.y + h / 2, 0);
      pierGeos.push(g);
      // a buttress fin on each side, so the pier reads as carved stone, not a post
      for (const sd of [-1, 1]) pierGeos.push(new THREE.CylinderGeometry(2.5, 6, h * 0.85, 4, 1).rotateY(Math.PI / 4).translate(u, ground - B.y + h * 0.425, sd * 15));
      // a gold collar where the pier meets the bow
      spireGeos.push(new THREE.CylinderGeometry(15, 13, 4, 4, 1).rotateY(Math.PI / 4).translate(u, keel(u) - 1, 0));
    }
    for (const sd of [-1, 1]) {
      spireGeos.push(new THREE.CylinderGeometry(0.1, 2.2, 22, 4, 1).rotateY(Math.PI / 4).translate(u, 12.5, sd * (B.hw + 0.4)));
      pierGeos.push(new THREE.BoxGeometry(4.2, 2.2, 4.2).translate(u, 1.1, sd * (B.hw + 0.4)));
      orbs.push([u, 24.5, sd * (B.hw + 0.4), 1.6]);
    }
  }
  const merge = (geos) => {
    // these are plain geometries with the same attributes: merge by hand to stay dependency-light
    const out = new THREE.BufferGeometry(), P = [], N = [], I = [];
    let base = 0;
    for (const g of geos) {
      const p = g.attributes.position.array, nn = g.attributes.normal.array;
      for (let i = 0; i < p.length; i++) { P.push(p[i]); N.push(nn[i]); }
      if (g.index) for (const i of g.index.array) I.push(i + base);
      base += p.length / 3;
    }
    out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    out.setIndex(I);
    return out;
  };
  const piers = new THREE.Mesh(merge(pierGeos), stone);
  piers.castShadow = piers.receiveShadow = true;
  group.add(piers, new THREE.Mesh(merge(spireGeos), gold));

  // lanterns along both parapets every 44 m (on the star medallions), plus the pinnacle orbs
  const step = 44;
  const per = Math.floor(len / step);
  for (let i = 0; i <= per; i++) for (const sd of [-1, 1]) orbs.push([-B.L + i * step, 3.2, sd * (B.hw - 0.35), 0.55]);
  const postGeo = new THREE.CylinderGeometry(0.14, 0.2, 2.0, 6).translate(0, -1.0, 0);
  const posts = new THREE.InstancedMesh(postGeo, gold, orbs.length);
  const orbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffe2a8') });
  const lamp = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), orbMat, orbs.length);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  orbs.forEach(([u, y, v, r], i) => {
    lamp.setMatrixAt(i, m.compose(new THREE.Vector3(u, y, v), q, sc.setScalar(r)));
    posts.setMatrixAt(i, m.compose(new THREE.Vector3(u, y, v), q, sc.set(1, r > 1 ? 0.01 : 1, 1)));
  });
  group.add(posts, lamp);

  // a fine line of starlight under the keel, which wakes at dusk
  const keelMat = new THREE.MeshBasicMaterial({ color: new THREE.Color('#7fe8ff'), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  group.add(new THREE.Mesh(keelLine(), keelMat));

  scene.add(group);
  const lampDay = new THREE.Color('#ffe9c4'), lampNight = new THREE.Color('#ffc46a').multiplyScalar(3.2);
  return {
    group,
    update() {
      const n = MOOD.night.value;
      orbMat.color.copy(lampDay).lerp(lampNight, n);
      keelMat.opacity = 0.15 + 0.85 * n;
      keelMat.color.setRGB(0.5 + 1.5 * n, 0.9 + 2.0 * n, 1.0 + 2.6 * n);
    },
  };
}
