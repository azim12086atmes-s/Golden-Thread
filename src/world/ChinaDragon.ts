import * as THREE from 'three';
import { ANIMAL_HEAD_GAP } from '../characters/anatomy';
import { REGION_BY_ID, regionCenter } from './regions';
import { terrainHeight } from './terrain';

/**
 * The great dragon of the Jade Terraces (owner's brief): a long, serpentine Chinese lung dragon
 * circling the temple at the heart of the town, rising and falling as it goes, chasing a flaming
 * pearl. Its body is one continuous, flowing form — painted scales in red and gold with a pale gold
 * belly of plates, a crest of fins down its back, a flowing mane at the neck, four legs with golden
 * claws, and a tail ending in a fan of flame. Its head floats just ahead of its neck (never joined,
 * as every creature's is), with golden antlers and a mane; no face.
 *
 * The body is bent every frame along the dragon's path (a CPU deformation of one mesh), so it
 * moves like a real serpent: each part following where the head has been, with a gentle ripple.
 */
const L = 72;                 // body length (m)
const SEG = 150, RAD = 14;     // lengthwise and round segments
const R0 = 2.1;                // girth at its fullest
/** Girth along the body (s: 0 at the neck … 1 at the tail tip). */
const girth = (s: number) => R0 * (s < 0.015 ? 0.7 * Math.sqrt(s / 0.015) + 0.05 : s < 0.12 ? 0.7 + 0.3 * (s / 0.12) : 1 - 0.85 * Math.pow((s - 0.12) / 0.88, 1.6));

/** Parts of the dragon are laid out in its body's frame: s along it, and (side, up, fwd) offsets. */
interface Layout { s: Float32Array; o: Float32Array }

// ───── pictures ─────

let scaleTex: THREE.Texture | null | undefined;
function scales(): THREE.Texture | null {
  if (scaleTex !== undefined) return scaleTex;
  if (typeof document === 'undefined') return (scaleTex = null);
  const W = 512, H = 256, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d')!;
  // Round the body: back (u 0.25) deep red, sides red, belly (u 0.75) pale gold plates.
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, '#c81e1e'); g.addColorStop(0.25, '#8e1010'); g.addColorStop(0.5, '#c81e1e');
  g.addColorStop(0.62, '#e0521e'); g.addColorStop(0.68, '#f2c24a'); g.addColorStop(0.75, '#f7dc8a'); g.addColorStop(0.82, '#f2c24a'); g.addColorStop(0.88, '#e0521e'); g.addColorStop(1, '#c81e1e');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  // Scales: overlapping rounded shingles, gold-rimmed, offset row by row.
  const s = 18;
  for (let row = 0; row < H / (s * 0.55) + 1; row++) for (let col = -1; col < W / s + 1; col++) {
    const cx = col * s + (row % 2) * s * 0.5, cy = row * s * 0.55;
    const u = cx / W;
    if (u > 0.64 && u < 0.86) continue; // the belly has plates instead
    x.beginPath(); x.arc(cx, cy, s * 0.55, 0, Math.PI);
    x.strokeStyle = 'rgba(255,210,90,0.85)'; x.lineWidth = 2; x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.12)'; x.fill();
  }
  // Belly plates: broad bands across.
  for (let y = 0; y < H; y += 22) {
    x.fillStyle = 'rgba(170,110,30,0.55)'; x.fillRect(W * 0.645, y, W * 0.21, 3);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return (scaleTex = t);
}

// ───── building blocks laid out along the body ─────

class Parts {
  pos: number[] = []; col: number[] = []; s: number[] = []; idx: number[] = [];
  /** A triangle fan/strip piece given as local (side, up, fwd) points at body position s. */
  tri(s: number, a: number[], b: number[], c: number[], colour: THREE.Color): void {
    const i = this.pos.length / 3;
    for (const p of [a, b, c]) { this.pos.push(p[0], p[1], p[2]); this.col.push(colour.r, colour.g, colour.b); this.s.push(s); }
    this.idx.push(i, i + 1, i + 2);
  }
  /** A tapered cone from p to q (local), n sides, at body position s. */
  cone(s: number, p: number[], q: number[], r0: number, r1: number, colour: THREE.Color, n = 5): void {
    const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]), len = d.length();
    d.normalize();
    const a = new THREE.Vector3(1, 0, 0);
    if (Math.abs(d.dot(a)) > 0.9) a.set(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(d, a).normalize(), v = new THREE.Vector3().crossVectors(d, u);
    const base = this.pos.length / 3;
    for (let k = 0; k <= 1; k++) for (let j = 0; j < n; j++) {
      const ang = (j / n) * Math.PI * 2, r = k ? r1 : r0;
      const x = p[0] + d.x * len * k + (u.x * Math.cos(ang) + v.x * Math.sin(ang)) * r;
      const y = p[1] + d.y * len * k + (u.y * Math.cos(ang) + v.y * Math.sin(ang)) * r;
      const z = p[2] + d.z * len * k + (u.z * Math.cos(ang) + v.z * Math.sin(ang)) * r;
      this.pos.push(x, y, z); this.col.push(colour.r, colour.g, colour.b); this.s.push(s);
    }
    for (let j = 0; j < n; j++) {
      const a0 = base + j, a1 = base + ((j + 1) % n), b0 = a0 + n, b1 = a1 + n;
      this.idx.push(a0, b0, a1, a1, b0, b1);
    }
  }
}

export class ChinaDragon {
  readonly group = new THREE.Group();
  private body: THREE.Mesh;
  private bits: THREE.Mesh;
  private head = new THREE.Group();
  private pearl: THREE.Mesh;
  private bodyLay: Layout; private bitsLay: Layout;
  private centre: THREE.Vector3;
  private samples = 200;
  private P: THREE.Vector3[] = []; private T: THREE.Vector3[] = []; private N: THREE.Vector3[] = []; private B: THREE.Vector3[] = [];

  constructor(scene: THREE.Scene) {
    const c = regionCenter(REGION_BY_ID.china);
    this.centre = new THREE.Vector3(c.x, terrainHeight(c.x, c.z), c.z);
    for (let i = 0; i < this.samples; i++) { this.P.push(new THREE.Vector3()); this.T.push(new THREE.Vector3()); this.N.push(new THREE.Vector3()); this.B.push(new THREE.Vector3()); }

    // The body: a tube laid out along s, round angle u.
    const bpos: number[] = [], buv: number[] = [], bs: number[] = [], bo: number[] = [], bidx: number[] = [];
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG, r = girth(s);
      for (let j = 0; j <= RAD; j++) {
        const u = j / RAD, a = u * Math.PI * 2;
        // side = cos, up = sin (u 0.25 is the back, 0.75 the belly); a little flattened.
        bo.push(Math.cos(a) * r, Math.sin(a) * r * 0.88, 0);
        bs.push(s);
        bpos.push(0, 0, 0);
        buv.push(u, (s * L) / (Math.PI * 2 * R0 * 0.5));
      }
    }
    for (let i = 0; i < SEG; i++) for (let j = 0; j < RAD; j++) {
      const a = i * (RAD + 1) + j, b = a + RAD + 1;
      bidx.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const bgeo = new THREE.BufferGeometry();
    bgeo.setAttribute('position', new THREE.Float32BufferAttribute(bpos, 3));
    bgeo.setAttribute('uv', new THREE.Float32BufferAttribute(buv, 2));
    bgeo.setIndex(bidx);
    this.bodyLay = { s: new Float32Array(bs), o: new Float32Array(bo) };
    const map = scales();
    this.body = new THREE.Mesh(bgeo, new THREE.MeshStandardMaterial({ color: map ? '#ffffff' : '#c81e1e', map, roughness: 0.45, metalness: 0.25, emissive: '#5a0a0a', emissiveIntensity: 0.35, side: THREE.DoubleSide }));

    // Crest, mane, legs and claws, the tail's flame fan.
    const pt = new Parts(), gold = new THREE.Color('#f2c24a'), orange = new THREE.Color('#ff7a2a'), red = new THREE.Color('#d8281e'), green = new THREE.Color('#2fae6a');
    for (let s = 0.04; s < 0.93; s += 0.018) {
      const r = girth(s), h = r * (0.55 + 0.35 * Math.sin(s * 40)), up = r * 0.86;
      pt.tri(s, [0, up, 0.7], [0, up + h, -0.2], [0, up, -0.9], s % 0.036 < 0.018 ? orange : gold);
    }
    // The mane: flowing tufts at the neck, streaming back.
    for (let k = 0; k < 26; k++) {
      const s = 0.005 + (k / 26) * 0.07, r = girth(s), a = (k * 2.4) % (Math.PI * 1.2) - 0.1;
      const side = Math.cos(a) * r * 0.9, up = Math.sin(a) * r * 0.9 + r * 0.2;
      pt.cone(s, [side, up, 0], [side * 1.9, up + 0.8, -3.2 - (k % 3)], 0.35, 0.02, k % 3 === 0 ? green : k % 3 === 1 ? gold : orange, 4);
    }
    // Four legs, each with three golden claws.
    for (const [s, sx] of [[0.14, 1], [0.14, -1], [0.58, 1], [0.58, -1]] as const) {
      const r = girth(s);
      const hip = [sx * r * 0.8, -r * 0.2, 0], knee = [sx * (r + 1.6), -r - 0.6, 0.8], foot = [sx * (r + 1.9), -r - 2.2, 1.6];
      pt.cone(s, hip, knee, r * 0.34, r * 0.24, red, 7);
      pt.cone(s, knee, foot, r * 0.24, r * 0.16, red, 7);
      for (let k = -1; k <= 1; k++) pt.cone(s, foot, [foot[0] + sx * 0.3 + k * 0.35, foot[1] - 0.4, foot[2] + 0.9], 0.12, 0.01, gold, 4);
      // A tuft of flame at the elbow.
      pt.cone(s, knee, [knee[0] + sx * 0.4, knee[1] + 0.6, knee[2] - 1.4], 0.25, 0.01, orange, 4);
    }
    // The tail: a fan of flame blades.
    for (let k = 0; k < 7; k++) {
      const a = -0.9 + (k / 6) * 1.8;
      pt.cone(0.985, [0, 0, 0], [Math.sin(a) * 2.2, Math.cos(a) * 1.2 + 0.3, -3.2 - Math.cos(a) * 1.4], 0.4, 0.02, k % 2 ? orange : gold, 4);
    }
    const tgeo = new THREE.BufferGeometry();
    tgeo.setAttribute('position', new THREE.Float32BufferAttribute(new Array(pt.pos.length).fill(0), 3));
    tgeo.setAttribute('color', new THREE.Float32BufferAttribute(pt.col, 3));
    tgeo.setIndex(pt.idx);
    this.bitsLay = { s: new Float32Array(pt.s), o: new Float32Array(pt.pos) };
    this.bits = new THREE.Mesh(tgeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2, emissive: '#402000', emissiveIntensity: 0.4, side: THREE.DoubleSide }));

    // The head, floating just ahead of the neck: a long snout, antlers, a mane; no face.
    const headMat = new THREE.MeshStandardMaterial({ color: '#d8281e', roughness: 0.45, metalness: 0.2, emissive: '#5a0a0a', emissiveIntensity: 0.3 });
    const goldMat = new THREE.MeshStandardMaterial({ color: '#f2c24a', roughness: 0.3, metalness: 0.8, emissive: '#6a4a10', emissiveIntensity: 0.4 });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(1.9, 18, 12).scale(1, 0.85, 1.25), headMat);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(1.3, 16, 10).scale(0.85, 0.55, 1.6), headMat);
    snout.position.set(0, -0.35, 2.2);
    const brow = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8).scale(1.6, 0.4, 0.8), goldMat);
    brow.position.set(0, 0.9, 1.1);
    this.head.add(skull, snout, brow);
    for (const sx of [1, -1]) {
      // Branching golden antlers.
      const main = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.22, 3.4, 6).translate(0, 1.7, 0), goldMat);
      main.position.set(sx * 0.7, 1.2, -0.4); main.rotation.set(-0.7, 0, -sx * 0.45);
      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.14, 1.4, 5).translate(0, 0.7, 0), goldMat);
      tine.position.set(0, 1.8, 0); tine.rotation.set(0.6, 0, sx * 0.5);
      main.add(tine);
      // Streaming whiskers of flame-silk and a cheek mane.
      const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.02, 4.5, 4).translate(0, -2.25, 0), goldMat);
      whisker.position.set(sx * 0.9, -0.5, 2.6); whisker.rotation.set(-1.9, 0, sx * 0.6);
      const cheek = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.4, 5).translate(0, -1.2, 0), new THREE.MeshStandardMaterial({ color: '#2fae6a', roughness: 0.6 }));
      cheek.position.set(sx * 1.5, -0.2, -0.3); cheek.rotation.set(-1.9, 0, sx * 0.9);
      this.head.add(main, whisker, cheek);
    }
    // The flaming pearl it chases.
    this.pearl = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff4c8').multiplyScalar(1.5), toneMapped: false }));
    const halo = new THREE.Mesh(new THREE.SphereGeometry(1.8, 16, 12), new THREE.MeshBasicMaterial({ color: '#ffb84a', transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false }));
    this.pearl.add(halo);

    for (const m of [this.body, this.bits]) { m.frustumCulled = false; m.castShadow = true; m.userData.part = 'body'; }
    this.head.traverse((o) => { o.userData.part = (o as THREE.Mesh).isMesh ? 'head' : o.userData.part; });
    this.pearl.userData.part = 'accessory';
    halo.userData.part = 'accessory';
    this.group.add(this.body, this.bits, this.head, this.pearl);
    this.group.visible = false;
    scene.add(this.group);
  }

  /** Where the head is at phase φ along its flight round the temple (world). */
  private path(phi: number, out: THREE.Vector3): THREE.Vector3 {
    const r = 34 + 6 * Math.sin(phi * 0.5) + 3 * Math.sin(phi * 1.7);
    const y = this.centre.y + 30 + 12 * Math.sin(phi * 0.8) + 4 * Math.sin(phi * 2.3);
    return out.set(this.centre.x + Math.cos(phi) * r, y, this.centre.z + Math.sin(phi) * r);
  }

  /** Circle the temple (only while the Jade Terraces are near). */
  update(t: number, visible: boolean): void {
    this.group.visible = visible;
    if (!visible) return;
    const speed = 11, phi0 = (t * speed) / 36;
    // Sample the body's centre line: each point is where the head was a little while ago.
    const step = L / (this.samples - 1), up = new THREE.Vector3(0, 1, 0);
    let phi = phi0;
    for (let i = 0; i < this.samples; i++) {
      this.path(phi, this.P[i]);
      // A serpent's ripple: a gentle side-to-side and up-and-down wave travelling down the body.
      const s = i / (this.samples - 1), w = 2 * Math.PI * (s * 2.2 - t * 0.35);
      this.P[i].y += Math.sin(w) * 1.6 * s;
      if (i < this.samples - 1) phi -= step / 36;
    }
    for (let i = 0; i < this.samples; i++) {
      const a = this.P[Math.max(0, i - 1)], b = this.P[Math.min(this.samples - 1, i + 1)];
      this.T[i].subVectors(a, b).normalize(); // pointing forward (towards the head)
      this.N[i].crossVectors(up, this.T[i]).normalize(); // side
      // Lateral ripple along the side direction.
      const s = i / (this.samples - 1);
      this.P[i].addScaledVector(this.N[i], Math.sin(2 * Math.PI * (s * 1.6 - t * 0.28)) * 2.2 * s);
      this.B[i].crossVectors(this.T[i], this.N[i]).normalize(); // up
    }
    this.deform(this.body, this.bodyLay);
    this.deform(this.bits, this.bitsLay);
    // The head floats ahead of the neck; the pearl flies ahead of the head.
    // Clear of the neck by the head gap (skull reaches 2.4 m back from its centre).
    const gap = 2.4 + 0.5 + ANIMAL_HEAD_GAP * 4;
    this.head.position.copy(this.P[0]).addScaledVector(this.T[0], gap);
    this.head.lookAt(this.head.position.clone().add(this.T[0]));
    this.path(phi0 + 0.28, this.pearl.position);
    this.pearl.position.y += Math.sin(t * 1.3) * 1.5;
    this.pearl.rotation.y = t;
  }

  private deform(mesh: THREE.Mesh, lay: Layout): void {
    const pos = mesh.geometry.getAttribute('position') as THREE.BufferAttribute, n = lay.s.length, last = this.samples - 1;
    for (let v = 0; v < n; v++) {
      const f = lay.s[v] * last, i = Math.min(last - 1, Math.floor(f)), k = f - i;
      const P0 = this.P[i], P1 = this.P[i + 1], N = this.N[i], B = this.B[i], T = this.T[i];
      const ox = lay.o[v * 3], oy = lay.o[v * 3 + 1], oz = lay.o[v * 3 + 2];
      pos.setXYZ(v,
        P0.x + (P1.x - P0.x) * k + N.x * ox + B.x * oy + T.x * oz,
        P0.y + (P1.y - P0.y) * k + N.y * ox + B.y * oy + T.y * oz,
        P0.z + (P1.z - P0.z) * k + N.z * ox + B.z * oy + T.z * oz);
    }
    pos.needsUpdate = true;
    mesh.geometry.computeVertexNormals();
  }
}
