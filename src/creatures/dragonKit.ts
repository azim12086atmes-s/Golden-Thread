import * as THREE from 'three';
import { ANIMAL_HEAD_GAP, type Part } from '../characters/anatomy';

/**
 * The dragon kit (docs/team/handoffs/DRAGONS_FANTASY_SCIFI_PLAN.md). Every dragon is one
 * continuous body — a tube swept along its flight path and bent there every frame, so each part
 * follows where the head has been — with its parts laid along it in the body's own frame: a crest
 * down the back, a mane at the neck, jointed legs with claws, a tail, fins; wings of finger bones
 * and membrane riding at the shoulders; and a head floating just ahead of the neck (as every
 * creature's does), with no face.
 *
 * Body plans: 'lung' (the long serpent dragon of the East, four short legs, no wings), 'wyrm'
 * (winged, four legs, a long neck), 'wyvern' (winged, two legs), 'naga' (a limbless serpent of the
 * sea or the sky, finned). The rest is chosen per dragon: head, crest, tail, wings, scale pattern,
 * palette, ornaments (a pearl, glowing runes).
 */

export type Plan = 'lung' | 'wyrm' | 'wyvern' | 'naga';
export type HeadKind = 'lung' | 'drake' | 'frost' | 'sea' | 'mech' | 'brass' | 'cloud' | 'night' | 'light';
export type Crest = 'fins' | 'spines' | 'flame' | 'crystal' | 'plates' | 'frond' | 'none';
export type TailKind = 'flame' | 'spade' | 'fins' | 'crystal' | 'frond' | 'plume' | 'twin' | 'heart';
export type ScaleStyle = 'shingle' | 'plate' | 'hex' | 'cloud' | 'silk' | 'smooth';

export interface DragonSpec {
  id: string;
  name: string;
  plan: Plan;
  /** Body length (m, neck to tail tip) and girth at its fullest (radius, m). */
  length: number;
  girth: number;
  /** Back, flank and belly colours; the scales' rim; the crest's two colours; the mane's colours. */
  back: string; side: string; belly: string; rim: string;
  crest: [string, string]; mane: string[];
  /** Claws, horns, whiskers. */
  claw: string; horn: string;
  head: HeadKind;
  crestKind: Crest;
  tail: TailKind;
  scales: ScaleStyle;
  /** Claws on each foot (the lung of China five, of Korea four, of Japan three). */
  claws?: 3 | 4 | 5;
  /**
   * Membrane wings: span (m), membrane and bone colours; `panels` draws them as canvas or plates;
   * `hind`, a second, smaller pair over the hips (that share of the main span).
   */
  wings?: { span: number; membrane: string; bone: string; panels?: boolean; hind?: number; ribs?: number };
  /** A glowing pearl it chases (colour), and glowing runes along its back (colour). */
  pearl?: string;
  runes?: string;
  /** A faint inner light, and see-through (the cloud dragon). */
  emissive?: string;
  translucent?: boolean;
  /** Winged plans: where the neck ends, as a share of the length (0.26; less for a short neck). */
  neck?: number;
  /** Little star-scales scattered down each flank (glowing colours). */
  stars?: string[];
  /**
   * 'cat': a sleek, cat-like build (the Night Dragon) — a short thick neck, a deep compact body,
   * sturdy legs, and a thick tail that tapers slowly to its fins.
   */
  build?: 'cat';
  /** A twin tail's left fin is a prosthetic of leather and steel, this colour (the Night Dragon's red). */
  prosthetic?: string;
  /** The soft light round its silhouette (by default its rim colour, or a pale tint of its flank when that is dark). */
  aura?: string;
}

// ───── the body's girth along its length (s: 0 at the neck … 1 at the tail tip) ─────

export function girthAt(plan: Plan, s: number, nk = 0.26, cat = false): number {
  if (cat) {
    // Rounding in from the head end, a thick neck swelling into a deep chest and belly, then a
    // thick tail tapering slowly to the fins at its tip.
    const e = nk + 0.3;
    // The neck's end rounds closed (the head floats just ahead of it).
    const cap = s < 0.03 ? Math.sqrt(Math.max(0, 1 - ((0.03 - s) / 0.03) ** 2)) : 1;
    if (s < nk) return (0.64 + 0.3 * Math.sin((s / nk) * Math.PI * 0.5)) * cap;
    if (s < e) return 0.94 + 0.06 * Math.sin(((s - nk) / 0.3) * Math.PI);
    return 0.15 + 0.79 * Math.pow(1 - (s - e) / (1 - e), 1.35);
  }
  if (plan === 'lung' || plan === 'naga') {
    // Thin at the neck, full by an eighth of the way, then a long taper to the tail.
    return s < 0.015 ? 0.7 * Math.sqrt(s / 0.015) + 0.05 : s < 0.12 ? 0.7 + 0.3 * (s / 0.12) : 1 - 0.85 * Math.pow((s - 0.12) / 0.88, 1.6);
  }
  // Winged dragons: a slender neck, a deep chest and belly, a long tapering tail.
  if (s < nk) return 0.32 + 0.18 * Math.sin((s / nk) * Math.PI * 0.5) + (s < 0.02 ? -0.1 * (1 - s / 0.02) : 0);
  if (s < nk + 0.26) return 0.5 + 0.5 * Math.sin(((s - nk) / 0.26) * Math.PI);
  const e = nk + 0.26;
  return 0.5 * Math.pow(1 - (s - e) / (1 - e), 1.3) + 0.04;
}
const neckOf = (d: DragonSpec) => d.neck ?? 0.26;
const girth = (d: DragonSpec, s: number) => girthAt(d.plan, s, neckOf(d), d.build === 'cat');
/** Where the shoulders (wings, forelegs) and hips (hind legs) sit along the body. */
const SHOULDER = (d: DragonSpec) => (d.plan === 'lung' ? 0.14 : neckOf(d) + 0.04);
const HIP = (d: DragonSpec) => (d.plan === 'lung' ? 0.58 : neckOf(d) + (d.build === 'cat' ? 0.26 : 0.2));

// ───── the painted hide ─────

const texCache = new Map<string, THREE.Texture | null>();
/** Round the body: the back (u 0.25), the flanks, the belly (u 0.75) — scales by the dragon's style. */
export function hideTexture(d: DragonSpec): THREE.Texture | null {
  if (texCache.has(d.id)) return texCache.get(d.id)!;
  if (typeof document === 'undefined') { texCache.set(d.id, null); return null; }
  const W = 512, H = 256, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d')!;
  const g = x.createLinearGradient(0, 0, W, 0);
  g.addColorStop(0, d.side); g.addColorStop(0.25, d.back); g.addColorStop(0.5, d.side);
  g.addColorStop(0.64, d.side); g.addColorStop(0.69, d.belly); g.addColorStop(0.81, d.belly); g.addColorStop(0.86, d.side); g.addColorStop(1, d.side);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const belly = (u: number) => u > 0.65 && u < 0.85;
  if (d.scales === 'shingle') {
    // Overlapping rounded shingles, rimmed, offset row by row.
    const s = 18;
    for (let row = 0; row < H / (s * 0.55) + 1; row++) for (let col = -1; col < W / s + 1; col++) {
      const cx = col * s + (row % 2) * s * 0.5, cy = row * s * 0.55;
      if (belly(cx / W)) continue;
      x.beginPath(); x.arc(cx, cy, s * 0.55, 0, Math.PI);
      x.strokeStyle = d.rim; x.globalAlpha = 0.85; x.lineWidth = 2; x.stroke();
      x.globalAlpha = 0.12; x.fillStyle = '#000'; x.fill(); x.globalAlpha = 1;
    }
  } else if (d.scales === 'hex') {
    // Armour panels: a hex grid with lit seams.
    const s = 22, h = s * Math.sqrt(3) / 2;
    x.strokeStyle = d.rim; x.lineWidth = 2;
    for (let row = -1; row < H / h + 1; row++) for (let col = -1; col < W / (s * 1.5) + 1; col++) {
      const cx = col * s * 1.5, cy = row * h * 2 + (col % 2) * h;
      x.beginPath();
      for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI * 2; x.lineTo(cx + Math.cos(a) * s * 0.95, cy + Math.sin(a) * s * 0.95); }
      x.stroke();
    }
  } else if (d.scales === 'plate') {
    // Riveted bands (brass): broad plates across, rivets along their edges.
    for (let y = 0; y < H; y += 26) {
      x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, y, W, 3);
      x.fillStyle = d.rim;
      for (let c = 6; c < W; c += 16) { x.beginPath(); x.arc(c, y + 8, 2.2, 0, Math.PI * 2); x.fill(); }
    }
  } else if (d.scales === 'smooth') {
    // Smooth, pearly skin: no scales, only soft clouds of its rim colour (a lilac or blue sheen).
    for (let i = 0; i < 90; i++) {
      const cx = (i * 97.3) % W, cy = (i * 53.7) % H, rr = 14 + (i % 7) * 6;
      const gr = x.createRadialGradient(cx, cy, 0, cx, cy, rr);
      gr.addColorStop(0, d.rim); gr.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalAlpha = 0.16; x.fillStyle = gr; x.fillRect(cx - rr, cy - rr, rr * 2, rr * 2);
    }
    x.globalAlpha = 1;
  } else if (d.scales === 'silk') {
    // The festival dragon's silk: embroidered scales in gold thread, a hoop of the lantern frame
    // every so often round the body, and a fringe down the belly.
    const s = 20;
    x.lineWidth = 1.5; x.strokeStyle = d.rim; x.globalAlpha = 0.7;
    for (let row = 0; row < H / (s * 0.6) + 1; row++) for (let col = -1; col < W / s + 1; col++) {
      const cx = col * s + (row % 2) * s * 0.5, cy = row * s * 0.6;
      if (belly(cx / W)) continue;
      x.beginPath(); x.arc(cx, cy, s * 0.42, 0.15, Math.PI - 0.15); x.stroke();
    }
    x.globalAlpha = 1;
    for (const y of [0, H / 2]) { x.fillStyle = d.rim; x.fillRect(0, y, W, 6); x.fillStyle = 'rgba(0,0,0,0.25)'; x.fillRect(0, y + 6, W, 2); }
    x.fillStyle = d.crest[1];
    for (let y = 0; y < H; y += 6) for (const u of [0.655, 0.845]) x.fillRect(W * u, y, 3, 4);
  } else {
    // Cloud: soft billows, lighter at their crowns.
    for (let i = 0; i < 160; i++) {
      const cx = Math.random() * W, cy = Math.random() * H, r = 10 + Math.random() * 26;
      const rg = x.createRadialGradient(cx, cy - r * 0.3, 1, cx, cy, r);
      rg.addColorStop(0, 'rgba(255,255,255,0.35)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = rg; x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill();
    }
  }
  // Belly plates for every style but the cloud.
  if (d.scales !== 'cloud' && d.scales !== 'silk' && d.scales !== 'smooth') for (let y = 0; y < H; y += 22) { x.fillStyle = 'rgba(90,60,20,0.4)'; x.fillRect(W * 0.66, y, W * 0.18, 3); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  texCache.set(d.id, t);
  return t;
}

// ───── parts laid out along the body (s, and side/up/forward offsets in its frame) ─────

interface Layout { s: Float32Array; o: Float32Array }

class Parts {
  pos: number[] = []; col: number[] = []; s: number[] = []; idx: number[] = [];
  tri(s: number, a: number[], b: number[], c: number[], colour: THREE.Color): void {
    const i = this.pos.length / 3;
    for (const p of [a, b, c]) { this.pos.push(p[0], p[1], p[2]); this.col.push(colour.r, colour.g, colour.b); this.s.push(s); }
    this.idx.push(i, i + 1, i + 2);
  }
  /** A tapered cone from p to q (local), n sides. */
  cone(s: number, p: number[], q: number[], r0: number, r1: number, colour: THREE.Color, n = 5): void {
    const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]), len = d.length();
    d.normalize();
    const a = Math.abs(d.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(d, a).normalize(), v = new THREE.Vector3().crossVectors(d, u);
    const base = this.pos.length / 3;
    for (let k = 0; k <= 1; k++) for (let j = 0; j < n; j++) {
      const ang = (j / n) * Math.PI * 2, r = k ? r1 : r0;
      this.pos.push(
        p[0] + d.x * len * k + (u.x * Math.cos(ang) + v.x * Math.sin(ang)) * r,
        p[1] + d.y * len * k + (u.y * Math.cos(ang) + v.y * Math.sin(ang)) * r,
        p[2] + d.z * len * k + (u.z * Math.cos(ang) + v.z * Math.sin(ang)) * r);
      this.col.push(colour.r, colour.g, colour.b); this.s.push(s);
    }
    for (let j = 0; j < n; j++) {
      const a0 = base + j, a1 = base + ((j + 1) % n), b0 = a0 + n, b1 = a1 + n;
      this.idx.push(a0, b0, a1, a1, b0, b1);
    }
  }
  /**
   * A rounded limb from p to q (local): a closed tube of `n` sides, rounded at both ends, its
   * radius running from r0 to r1 and swelling by `bulge` in the middle (a muscle). Its rings share
   * vertices, so it shades smoothly once normals are computed.
   */
  capsule(s: number, p: number[], q: number[], r0: number, r1: number, colour: THREE.Color, bulge = 0, n = 10): void {
    const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]), len = d.length();
    d.normalize();
    const a = Math.abs(d.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const u = new THREE.Vector3().crossVectors(d, a).normalize(), v = new THREE.Vector3().crossVectors(d, u);
    // Rings: along the length from a rounded start to a rounded end ([distance along, radius]).
    const rings: Array<[number, number]> = [];
    for (let k = 1; k <= 3; k++) { const t = (k / 3) * Math.PI * 0.5; rings.push([-r0 * Math.cos(t), r0 * Math.sin(t)]); }
    for (let k = 1; k < 6; k++) { const t = k / 6; rings.push([len * t, (r0 + (r1 - r0) * t) * (1 + bulge * Math.sin(t * Math.PI))]); }
    for (let k = 0; k < 3; k++) { const t = (k / 3) * Math.PI * 0.5; rings.push([len + r1 * Math.sin(t), r1 * Math.cos(t)]); }
    const push = (x: number, y: number, z: number) => { this.pos.push(x, y, z); this.col.push(colour.r, colour.g, colour.b); this.s.push(s); };
    const tip0 = this.pos.length / 3;
    push(p[0] - d.x * r0, p[1] - d.y * r0, p[2] - d.z * r0);
    const base = this.pos.length / 3;
    for (const [along, r] of rings) for (let j = 0; j < n; j++) {
      const ang = (j / n) * Math.PI * 2;
      push(p[0] + d.x * along + (u.x * Math.cos(ang) + v.x * Math.sin(ang)) * r,
        p[1] + d.y * along + (u.y * Math.cos(ang) + v.y * Math.sin(ang)) * r,
        p[2] + d.z * along + (u.z * Math.cos(ang) + v.z * Math.sin(ang)) * r);
    }
    const tip1 = this.pos.length / 3;
    push(q[0] + d.x * r1, q[1] + d.y * r1, q[2] + d.z * r1);
    for (let j = 0; j < n; j++) this.idx.push(tip0, base + ((j + 1) % n), base + j);
    for (let k = 0; k < rings.length - 1; k++) for (let j = 0; j < n; j++) {
      const a0 = base + k * n + j, a1 = base + k * n + ((j + 1) % n), b0 = a0 + n, b1 = a1 + n;
      this.idx.push(a0, a1, b0, a1, b1, b0);
    }
    const last = base + (rings.length - 1) * n;
    for (let j = 0; j < n; j++) this.idx.push(tip1, last + j, last + ((j + 1) % n));
  }
  /** A flattened ball (a plate, a pad) at p, radii rx, ry, rz. */
  blob(s: number, p: number[], rx: number, ry: number, rz: number, colour: THREE.Color): void {
    const g = new THREE.SphereGeometry(1, 7, 5), pa = g.getAttribute('position'), base = this.pos.length / 3;
    for (let i = 0; i < pa.count; i++) { this.pos.push(p[0] + pa.getX(i) * rx, p[1] + pa.getY(i) * ry, p[2] + pa.getZ(i) * rz); this.col.push(colour.r, colour.g, colour.b); this.s.push(s); }
    const ix = g.getIndex()!;
    for (let i = 0; i < ix.count; i++) this.idx.push(base + ix.getX(i));
    g.dispose();
  }
  geometry(): { geo: THREE.BufferGeometry; lay: Layout } {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(new Array(this.pos.length).fill(0), 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    geo.setIndex(this.idx);
    return { geo, lay: { s: new Float32Array(this.s), o: new Float32Array(this.pos) } };
  }
}

const C = (c: string) => new THREE.Color(c);

/** The crest down the back, the mane at the neck, legs and claws, the tail, fins and runes. */
function layParts(d: DragonSpec, solid: Parts, glow: Parts): void {
  const L = d.length, R0 = d.girth, r = (s: number) => girth(d, s) * R0;
  const c1 = C(d.crest[0]), c2 = C(d.crest[1]), claw = C(d.claw), side = C(d.side);
  const scale = R0 / 2.1; // parts were designed on the great lung (girth 2.1)
  // The crest: from just behind the neck to near the tail.
  const step = 0.018 * (72 / L) * scale * 2;
  for (let s = 0.04; s < 0.93; s += Math.max(0.008, step)) {
    const rr = r(s), up = rr * 0.86, alt = Math.round(s / step) % 2 ? c1 : c2;
    switch (d.crestKind) {
      case 'fins': { const h = rr * (0.55 + 0.35 * Math.sin(s * 40)); solid.tri(s, [0, up, 0.7 * scale], [0, up + h, -0.2 * scale], [0, up, -0.9 * scale], alt); break; }
      case 'flame': { const h = rr * (0.8 + 0.5 * Math.abs(Math.sin(s * 57))); solid.tri(s, [0, up, 0.5 * scale], [0, up + h, -0.6 * scale], [0, up, -0.7 * scale], alt); break; }
      case 'spines': solid.cone(s, [0, up * 0.95, 0], [0, up + rr * 0.7, -rr * 0.5], rr * 0.14, 0.01, alt, 5); break;
      case 'plates': solid.blob(s, [0, up, 0], rr * 0.28, rr * 0.34, rr * 0.4, alt); break;
      case 'crystal': glow.cone(s, [0, up * 0.95, 0], [0, up + rr * (0.6 + 0.4 * Math.abs(Math.sin(s * 31))), -rr * 0.2], rr * 0.13, 0.01, alt, 4); break;
      case 'frond': solid.cone(s, [0, up, 0], [Math.sin(s * 90) * rr * 0.3, up + rr * 0.9, -rr * 0.9], rr * 0.1, 0.01, alt, 4); break;
    }
    if (d.runes && Math.round(s / step) % 3 === 0) glow.blob(s, [0, up * 0.98, 0.1], rr * 0.07, rr * 0.03, rr * 0.07, C(d.runes));
  }
  // The mane at the neck (lung and naga): flowing tufts streaming back; a ruff for the others.
  const mane = d.mane.map(C);
  for (let k = 0; k < 26; k++) {
    const s = 0.005 + (k / 26) * 0.07, rr = r(s), a = (k * 2.4) % (Math.PI * 1.2) - 0.1;
    const sx = Math.cos(a) * rr * 0.9, up = Math.sin(a) * rr * 0.9 + rr * 0.2;
    if (d.plan === 'lung' || d.plan === 'naga') solid.cone(s, [sx, up, 0], [sx * 1.3, up + 0.45 * scale, -(3.6 + (k % 4) * 0.8) * scale], 0.2 * scale, 0.01, mane[k % mane.length], 4);
    else if (k % 2 === 0 && d.build !== 'cat') solid.cone(s, [sx, up, 0], [sx * 1.4, up + rr * 0.4, -rr * 1.4], rr * 0.18, 0.01, mane[k % mane.length], 4);
  }
  // Legs with claws: the lung's four stride out; a winged dragon's tuck back in flight.
  const legs: Array<[number, number]> = d.plan === 'naga' ? [] : d.plan === 'wyvern' ? [[HIP(d), 1], [HIP(d), -1]]
    : [[SHOULDER(d), 1], [SHOULDER(d), -1], [HIP(d), 1], [HIP(d), -1]];
  const nClaws = d.claws ?? 4;
  for (const [s, sx] of legs) {
    const rr = r(s), k = rr / 2.1 * (d.plan === 'lung' ? 1 : d.build === 'cat' ? 1.1 : 1.2);
    const tuck = d.plan === 'lung' ? 0 : 1;
    const hip = [sx * rr * 0.8, -rr * 0.25, 0];
    const knee = [sx * (rr + 1.6 * k), -rr - 0.6 * k, (0.8 - tuck * 2.2) * k];
    const foot = [sx * (rr + 1.4 * k), -rr - (2.2 - tuck * 0.6) * k, (1.6 - tuck * 4.4) * k];
    if (d.build === 'cat') {
      // Rounded, muscled limbs: a thick thigh or shoulder swelling out of the body, a shorter shin,
      // and a broad padded paw with short claws.
      solid.capsule(s, hip, knee, rr * 0.5, rr * 0.3, side, 0.25);
      solid.capsule(s, knee, foot, rr * 0.3, rr * 0.22, side, 0.1);
      const pawTip = [foot[0] + sx * 0.08 * k, foot[1] - 0.25 * k, foot[2] + (0.9 - tuck * 1.6) * 0.55 * k];
      solid.capsule(s, foot, pawTip, rr * 0.26, rr * 0.2, side, 0.15);
      // The broad paw, and its toes, each with a claw.
      solid.blob(s, pawTip, rr * 0.3, rr * 0.14, rr * 0.3, side);
      for (let c = 0; c < nClaws; c++) {
        const f = c / (nClaws - 1) - 0.5;
        const toe = [pawTip[0] + f * rr * 0.5, pawTip[1] - rr * 0.04, pawTip[2] + rr * 0.24 * Math.sign(0.9 - tuck * 1.6)];
        solid.blob(s, toe, rr * 0.09, rr * 0.08, rr * 0.11, side);
        solid.cone(s, toe, [toe[0] + f * 0.12 * k, toe[1] - 0.12 * k, toe[2] + (0.9 - tuck * 1.6) * 0.3 * k], 0.06 * k, 0.005, claw, 5);
      }
      continue;
    }
    solid.cone(s, hip, knee, rr * 0.36, rr * 0.25, side, 7);
    solid.cone(s, knee, foot, rr * 0.25, rr * 0.16, side, 7);
    for (let c = 0; c < nClaws; c++) {
      const f = c / (nClaws - 1) - 0.5;
      solid.cone(s, foot, [foot[0] + sx * 0.25 * k + f * 0.8 * k, foot[1] - 0.45 * k, foot[2] + (0.9 - tuck * 1.6) * k], 0.12 * k, 0.01, claw, 4);
    }
    if (d.plan === 'lung') solid.cone(s, knee, [knee[0] + sx * 0.4 * k, knee[1] + 0.6 * k, knee[2] - 1.4 * k], 0.25 * k, 0.01, c1, 4); // a flame tuft
  }
  // The sea naga's paired side fins.
  if (d.plan === 'naga') for (let s = 0.08; s < 0.9; s += 0.11) for (const sx of [1, -1]) {
    const rr = r(s);
    solid.tri(s, [sx * rr * 0.9, 0, 0.6 * rr], [sx * rr * 2.2, rr * 0.2, -rr * 0.8], [sx * rr * 0.9, 0, -rr * 0.9], c1);
  }
  // Star-scales: little constellations of light down each flank.
  if (d.stars) for (const sx of [1, -1]) for (let k = 0; k < 14; k++) {
    const s = 0.06 + k * 0.035, rr = r(s), a = Math.sin(k * 1.9) * 0.45;
    glow.blob(s, [sx * Math.cos(a) * rr * 0.97, Math.sin(a) * rr * 0.85, 0], rr * (0.05 + (k % 3) * 0.015), rr * 0.03, rr * 0.07, C(d.stars[k % d.stars.length]));
  }
  // The tail.
  const ts = 0.985, tr = Math.max(r(0.9), 0.3 * scale), T = 2.2 * scale * (d.plan === 'lung' ? 1 : 0.8);
  switch (d.tail) {
    case 'flame':
      for (let k = 0; k < 7; k++) { const a = -0.9 + (k / 6) * 1.8; solid.cone(ts, [0, 0, 0], [Math.sin(a) * T, Math.cos(a) * T * 0.55 + 0.3 * scale, -T * 1.45 - Math.cos(a) * T * 0.6], 0.4 * scale, 0.02, k % 2 ? c1 : c2, 4); }
      break;
    case 'spade':
      solid.tri(ts, [0, 0, 0], [T * 0.7, 0, -T * 0.4], [0, 0, -T * 1.3], c1);
      solid.tri(ts, [0, 0, 0], [0, 0, -T * 1.3], [-T * 0.7, 0, -T * 0.4], c1);
      solid.tri(ts, [0, 0.01, 0], [0, T * 0.35, -T * 0.6], [0, 0.01, -T * 1.2], c2);
      break;
    case 'fins':
      for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) solid.tri(ts, [0, 0, 0], [a * T * 0.9, b * T * 0.9, -T * 1.1], [a * T * 0.2, b * T * 0.2, -T * 1.6], (a + b) > 0 ? c1 : c2);
      break;
    case 'crystal':
      for (let k = 0; k < 5; k++) { const a = -0.7 + (k / 4) * 1.4; glow.cone(ts, [0, 0, 0], [Math.sin(a) * T * 0.8, Math.cos(a) * T * 0.4, -T * 1.4], 0.28 * scale, 0.01, k % 2 ? c1 : c2, 4); }
      break;
    case 'frond':
      for (let k = 0; k < 9; k++) { const a = -1 + (k / 8) * 2; solid.cone(ts, [0, 0, 0], [Math.sin(a) * T * 0.9, Math.cos(a * 1.3) * T * 0.3, -T * 1.6], 0.2 * scale, 0.01, k % 2 ? c1 : c2, 4); }
      break;
    case 'twin':
      // A small pair of fins spread flat a little way up the tail.
      for (const sx of [1, -1]) {
        const s0 = 0.86, rr = r(s0);
        solid.tri(s0, [sx * rr * 0.8, 0, 0.15 * T], [sx * (rr + T * 0.42), 0, -T * 0.12], [sx * rr * 0.8, 0, -T * 0.34], c1);
      }
      // Then a pair of broad fins spread flat at the tip, each a fan of ribs with a scalloped edge:
      // both its own, or one of them a leather-and-steel prosthetic.
      for (const sx of [1, -1]) {
        const fake = sx < 0 && !!d.prosthetic;
        const fin = fake ? C(d.prosthetic!) : c1, ribC = fake ? C('#8a8a96') : C(d.rim);
        const F = T * (d.build === 'cat' ? 1.9 : 1), n = 5;
        const ray = (i: number, l: number) => { const a = 0.35 + (i / (n - 1)) * 1.05; return [sx * Math.cos(a) * F * l, 0, -Math.sin(a) * F * l - F * 0.05]; };
        for (let i = 0; i < n - 1; i++) {
          const a = ray(i, i === 0 ? 0.8 : 1), b = ray(i + 1, 1), m = ray(i + 0.5, 0.78);
          solid.tri(ts, [0, 0, 0], a, m, fin);
          solid.tri(ts, [0, 0, 0], m, b, fin);
        }
        for (let i = 0; i < n; i++) solid.cone(ts, [0, 0.015, 0], ((p) => [p[0], 0.015, p[2]])(ray(i, i === 0 ? 0.8 : 1)), 0.03 * F, 0.008 * F, ribC, 4);
      }
      break;
    case 'heart': {
      // A small pair of fins a little way up the tail, then two broad rounded lobes at the tip,
      // spread in a heart and tipped a little up, each ribbed like a fan.
      for (const sx of [1, -1]) {
        const s0 = 0.8, rr = r(s0);
        solid.tri(s0, [sx * rr * 0.8, 0, 0.12 * T], [sx * (rr + T * 0.3), 0, -T * 0.1], [sx * rr * 0.8, 0, -T * 0.3], c1);
      }
      const rib = C(d.rim);
      for (const sx of [1, -1]) {
        const H = T * (d.build === 'cat' ? 1.9 : 1), cx = sx * H * 0.42, cz = -H * 0.62, ax = H * 0.4, az = H * 0.72, n = 10;
        const arc: number[][] = [];
        for (let i = 0; i <= n; i++) {
          // Round the lobe from its inner root, out along the back, to its outer edge.
          const a = -Math.PI * 0.55 + (i / n) * Math.PI * 1.25;
          const x = cx + sx * Math.sin(a) * ax, z = cz - Math.cos(a) * az;
          arc.push([x, Math.abs(x) * 0.3, z]);
        }
        for (let i = 0; i < n; i++) solid.tri(ts, [0, 0, 0], arc[i], arc[i + 1], c1);
        for (let i = 1; i < n; i += 2) solid.cone(ts, [0, 0.01, 0], [arc[i][0], arc[i][1] + 0.01, arc[i][2]], 0.02 * H, 0.008 * H, rib, 4);
      }
      break;
    }
    case 'plume':
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; solid.cone(ts, [0, 0, 0], [Math.cos(a) * T * 0.5, Math.sin(a) * T * 0.5, -T * 1.8], 0.22 * scale, 0.01, k % 3 ? c2 : c1, 4); }
      break;
  }
  void tr;
}

// ───── the floating head ─────

function std(c: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.2, ...o });
}
function glowMat(c: string): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.4), toneMapped: false });
}
function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, part: Part, x = 0, y = 0, z = 0): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.userData.part = part;
  m.castShadow = true;
  return m;
}
/** A tapered horn/antler/whisker from a base, pointing along (rx, rz) tilts. */
function prong(parent: THREE.Object3D, mat: THREE.Material, part: Part, len: number, r0: number, r1: number, at: [number, number, number], rot: [number, number, number]): THREE.Mesh {
  const m = mesh(new THREE.CylinderGeometry(r1, r0, len, 6).translate(0, len / 2, 0), mat, part, ...at);
  m.rotation.set(...rot);
  parent.add(m);
  return m;
}

/**
 * The head, built in its own frame (+z forward), scaled to the body. Returns how far the skull
 * reaches back from its centre (the head floats that far plus the gap ahead of the neck).
 */
function buildHead(d: DragonSpec, head: THREE.Group): number {
  const k = d.girth / 2.1 * (d.plan === 'lung' || d.plan === 'naga' ? 1 : 0.95);
  const skinM = std(d.side, { emissive: d.emissive ?? '#000000', emissiveIntensity: d.emissive ? 0.35 : 0, transparent: !!d.translucent, opacity: d.translucent ? 0.8 : 1 });
  const hornM = std(d.horn, { roughness: 0.3, metalness: d.head === 'brass' || d.head === 'lung' ? 0.8 : 0.2 });
  const g = new THREE.Group();
  g.scale.setScalar(k);
  head.add(g);
  let back = 2.4;
  switch (d.head) {
    case 'lung':
    case 'cloud': {
      // A long snout, a golden brow, branching antlers, streaming whiskers, cheek manes.
      g.add(mesh(new THREE.SphereGeometry(1.9, 18, 12).scale(1, 0.85, 1.25), skinM, 'head'));
      g.add(mesh(new THREE.SphereGeometry(1.3, 16, 10).scale(0.85, 0.55, 1.6), skinM, 'head', 0, -0.35, 2.2));
      g.add(mesh(new THREE.SphereGeometry(0.8, 12, 8).scale(1.6, 0.4, 0.8), hornM, 'head', 0, 0.9, 1.1));
      for (const sx of [1, -1]) {
        const main = prong(g, hornM, 'horn', 3.4, 0.22, 0.1, [sx * 0.7, 1.2, -0.4], [-0.7, 0, -sx * 0.45]);
        prong(main, hornM, 'horn', 1.4, 0.14, 0.06, [0, 1.8, 0], [0.6, 0, sx * 0.5]);
        prong(main, hornM, 'horn', 1.0, 0.1, 0.04, [0, 2.7, 0], [0.4, 0, -sx * 0.6]);
        prong(g, hornM, 'mane', 4.5, 0.05, 0.02, [sx * 0.9, -0.5, 2.6], [-1.9, 0, sx * 0.6]);
        // Cheek manes: locks streaming back from the jaw.
        for (let i = 0; i < 4; i++) {
          const lock = mesh(new THREE.ConeGeometry(0.16, 2.6 - i * 0.3, 5).translate(0, -(2.6 - i * 0.3) / 2, 0), std(d.mane[i % d.mane.length]), 'mane', sx * 1.35, -0.3 - i * 0.15, 0.2 - i * 0.25);
          lock.rotation.set(-1.75 - i * 0.08, 0, sx * (0.55 + i * 0.12));
          g.add(lock);
        }
      }
      break;
    }
    case 'drake':
    case 'frost': {
      // A wedge skull, a heavy jaw line, swept-back horns and a frill of spines behind.
      g.add(mesh(new THREE.SphereGeometry(1.5, 16, 10).scale(1, 0.8, 1.3), skinM, 'head'));
      g.add(mesh(new THREE.SphereGeometry(1.1, 14, 8).scale(0.8, 0.55, 1.7), skinM, 'head', 0, -0.25, 1.9));
      g.add(mesh(new THREE.SphereGeometry(0.9, 12, 8).scale(1.1, 0.4, 1.3), skinM, 'head', 0, -0.75, 0.8));
      const hornC = d.head === 'frost' ? glowMat(d.horn) : hornM;
      for (const sx of [1, -1]) {
        const h = prong(g, hornC, 'horn', 2.8, 0.26, 0.04, [sx * 0.7, 0.8, -0.6], [-1.9, 0, -sx * 0.3]);
        prong(h, hornC, 'horn', 1.0, 0.1, 0.02, [0, 1.2, 0], [0.5, 0, sx * 0.4]);
        for (let i = 0; i < 3; i++) prong(g, hornC, 'horn', 0.9 - i * 0.2, 0.12, 0.01, [sx * (1.1 + i * 0.1), 0.1 - i * 0.35, -0.9], [-2.2, 0, -sx * (0.9 + i * 0.2)]);
      }
      back = 2.2;
      break;
    }
    case 'sea': {
      // A long, smooth head with a crown of fins swept back.
      g.add(mesh(new THREE.SphereGeometry(1.6, 16, 10).scale(0.95, 0.75, 1.5), skinM, 'head'));
      g.add(mesh(new THREE.SphereGeometry(1.1, 14, 8).scale(0.75, 0.5, 1.6), skinM, 'head', 0, -0.3, 2.3));
      const finM = std(d.crest[0], { side: THREE.DoubleSide });
      for (let i = 0; i < 5; i++) {
        const f = mesh(new THREE.ConeGeometry(0.5, 2.6 - i * 0.3, 3).scale(0.25, 1, 1).translate(0, 1.3, 0), finM, 'head', 0, 1.0, -0.2 - i * 0.2);
        f.rotation.set(-1.1 - i * 0.15, 0, (i % 2 ? 1 : -1) * i * 0.18);
        g.add(f);
      }
      back = 2.5;
      break;
    }
    case 'night': {
      // Big, broad and cat-like, flatter than it is wide: a rounded skull, a wide blunt snout, a
      // soft brow; two large ear flaps swept back from the crown, two smaller ones below them,
      // and little flaps along the jaw. The same scaled hide as the body, matte, so its shape reads.
      const map = hideTexture(d);
      const hide = std(map ? '#ffffff' : d.side, { map, roughness: 0.62, metalness: 0.18 });
      g.add(mesh(new THREE.SphereGeometry(1.9, 24, 16).scale(1.2, 0.74, 1.08), hide, 'head'));
      g.add(mesh(new THREE.SphereGeometry(1.4, 20, 12).scale(1.12, 0.56, 0.95), hide, 'head', 0, -0.32, 1.35));
      g.add(mesh(new THREE.SphereGeometry(1.2, 18, 10).scale(1.05, 0.34, 0.85), hide, 'head', 0, -0.78, 1.0));
      g.add(mesh(new THREE.SphereGeometry(0.9, 14, 8).scale(1.7, 0.36, 0.8), hide, 'head', 0, 0.62, 0.72));
      // The ear flaps: thick, rounded and horn-like, tapering to a soft tip and flattened a little,
      // rising up and back from the crown; smaller ones behind the cheeks and along the jaw.
      const earM = std(d.side, { map, color: map ? '#ffffff' : d.side, roughness: 0.6, metalness: 0.15 });
      const ear = (len: number, r: number) => {
        const geo = new THREE.CapsuleGeometry(r, len, 6, 12);
        const pa = geo.getAttribute('position') as THREE.BufferAttribute, half = len / 2 + r;
        for (let i = 0; i < pa.count; i++) {
          const t = (pa.getY(i) + half) / (2 * half), taper = 1 - 0.55 * t;
          pa.setXYZ(i, pa.getX(i) * taper, pa.getY(i) + half, pa.getZ(i) * taper * 0.62 - t * t * len * 0.18);
        }
        geo.computeVertexNormals();
        return geo;
      };
      for (const sx of [1, -1]) {
        // [length, radius, x, y, z, tilt back, lean out]
        const set: Array<[number, number, number, number, number, number, number]> = [
          [1.9, 0.42, 0.8, 1.05, -0.8, -0.72, 0.28],
          [1.3, 0.3, 1.45, 0.6, -0.75, -1.0, 0.75],
          [0.8, 0.2, 1.85, -0.1, -0.35, -1.25, 1.2],
          [0.55, 0.15, 1.6, -0.75, 0.15, -1.45, 1.6],
        ];
        for (const [len, rad, x, y, z, rx, rz] of set) {
          const m = mesh(ear(len, rad), earM, 'ear', sx * x, y, z);
          m.rotation.set(rx, 0, -sx * rz);
          g.add(m);
        }
      }
      back = 2.3;
      break;
    }
    case 'light': {
      // Smaller and rounder than the Night Dragon's, smooth, a soft muzzle; two short rounded ear
      // nubs rising back from the crown and two smaller ones below them.
      g.add(mesh(new THREE.SphereGeometry(1.6, 24, 16).scale(1.0, 0.84, 1.2), skinM, 'head'));
      g.add(mesh(new THREE.SphereGeometry(1.15, 20, 12).scale(0.95, 0.62, 1.1), skinM, 'head', 0, -0.32, 1.3));
      g.add(mesh(new THREE.SphereGeometry(1.0, 18, 10).scale(0.95, 0.36, 0.9), skinM, 'head', 0, -0.72, 0.9));
      for (const sx of [1, -1]) {
        // Swept well back, so from any side they read as smooth nubs along the crown.
        const big = mesh(new THREE.CapsuleGeometry(0.26, 1.1, 6, 10), skinM, 'ear', sx * 0.55, 1.1, -0.75);
        big.rotation.set(-1.2, 0, -sx * 0.2);
        const small = mesh(new THREE.CapsuleGeometry(0.17, 0.55, 5, 8), skinM, 'ear', sx * 1.05, 0.45, -0.75);
        small.rotation.set(-1.3, 0, -sx * 0.7);
        g.add(big, small);
      }
      back = 2.0;
      break;
    }
    case 'mech':
    case 'brass': {
      // Sculpted armour over a skull frame: a tapered hexagonal muzzle, a crown plate, cheek
      // plates and a jaw, a fan of collar plates behind. No face: the only light is a strip along
      // the crown (and, on the drone dragon, seams along the jaw line).
      const brass = d.head === 'brass';
      const plate = std(d.side, { metalness: brass ? 0.85 : 0.6, roughness: brass ? 0.35 : 0.3 });
      const frame = std(brass ? '#5a3a1a' : '#2a2e38', { metalness: 0.7, roughness: 0.4 });
      const trim = std(d.rim, { metalness: 0.85, roughness: 0.25 });
      const lit = glowMat(d.runes ?? (brass ? '#ffb84a' : '#5af0ff'));
      const hex = (r0: number, r1: number, len: number, m: THREE.Material, at: [number, number, number], sc: [number, number, number], rx = Math.PI / 2) => {
        const o = mesh(new THREE.CylinderGeometry(r1, r0, len, 6).scale(...sc), m, 'head', ...at);
        o.rotation.x = rx;
        g.add(o);
        return o;
      };
      g.add(mesh(new THREE.SphereGeometry(1.4, 14, 10).scale(1, 0.85, 1.15), frame, 'head'));
      hex(1.25, 0.6, 3.0, plate, [0, -0.2, 1.7], [1, 1, 0.62]);            // the muzzle, tapering forward
      hex(0.95, 0.45, 2.4, frame, [0, -0.72, 1.35], [0.9, 1, 0.45]);         // the jaw below it
      hex(1.3, 1.0, 2.6, plate, [0, 0.62, 0.35], [1.05, 1, 0.3], Math.PI / 2 + 0.12); // the crown plate
      hex(1.34, 1.04, 2.4, trim, [0, 0.72, 0.25], [1.06, 1, 0.08], Math.PI / 2 + 0.12); // its gilt edge
      g.add(mesh(new THREE.BoxGeometry(0.22, 0.1, 3.4), lit, 'head', 0, 0.98, 0.7));
      for (const sx of [1, -1]) {
        // Cheek plates angled back, a collar fan, and swept horns.
        const cheek = hex(0.9, 0.55, 1.8, plate, [sx * 1.05, -0.25, 0.2], [0.35, 1, 1]);
        cheek.rotation.set(Math.PI / 2, sx * 0.35, 0);
        for (let f = 0; f < 3; f++) {
          const fan = mesh(new THREE.BoxGeometry(0.12, 0.9 - f * 0.15, 1.9 - f * 0.3), f % 2 ? trim : plate, 'head', sx * (0.7 + f * 0.25), 0.25 - f * 0.35, -1.35);
          fan.rotation.set(0.5 + f * 0.3, sx * 0.5, sx * (0.5 + f * 0.25));
          g.add(fan);
        }
        prong(g, trim, 'horn', 2.4, 0.2, 0.05, [sx * 0.75, 0.75, -0.8], [-2.0, 0, -sx * 0.28]);
        if (brass) {
          // A gear on each cheek, riveted, and rivets down the muzzle.
          const gear = mesh(new THREE.TorusGeometry(0.42, 0.1, 5, 14), trim, 'head', sx * 1.32, -0.25, 0.1);
          gear.rotation.y = Math.PI / 2;
          g.add(gear);
          for (let t = 0; t < 10; t++) {
            const a = (t / 10) * Math.PI * 2;
            g.add(mesh(new THREE.BoxGeometry(0.1, 0.14, 0.14), trim, 'head', sx * 1.32, -0.25 + Math.sin(a) * 0.54, 0.1 + Math.cos(a) * 0.54));
          }
          for (let r = 0; r < 5; r++) g.add(mesh(new THREE.SphereGeometry(0.07, 6, 4), trim, 'head', sx * (0.62 - r * 0.07), 0.12, 0.9 + r * 0.45));
        } else {
          // Lit seams along the jaw line.
          const seam = mesh(new THREE.BoxGeometry(0.06, 0.06, 2.3), lit, 'head', sx * 0.72, -0.5, 1.5);
          seam.rotation.y = -sx * 0.16;
          g.add(seam);
        }
      }
      back = 2.2;
      break;
    }
  }
  return back * k;
}

// ───── wings: finger bones with a membrane between, a scalloped trailing edge ─────

/** A wing that can fold: its group, and how to set it from spread (0) to folded along the flank (1). */
interface Wing { g: THREE.Group; fold(f: number): void }

function buildWing(d: DragonSpec, sx: number, share = 1): Wing {
  const w = d.wings!, span = (w.span / 2) * share, grp = new THREE.Group();
  const bone = std(w.bone, { roughness: 0.4, metalness: w.panels ? 0.6 : 0.1 });
  const mem = std(w.membrane, { side: THREE.DoubleSide, transparent: true, opacity: w.panels ? 1 : 0.82, depthWrite: !!w.panels, roughness: 0.65, emissive: d.emissive ?? '#000000', emissiveIntensity: d.emissive ? 0.2 : 0 });
  const V = (x: number, y: number, z: number) => new THREE.Vector3(sx * span * x, span * y, span * z);
  // The arm: shoulder → elbow → wrist; four fingers splay back from the wrist, fanned like a bat's
  // (the first straight out, the last swept back along the flank). Folded, the elbow tucks back,
  // the wrist comes forward beside the shoulder and the fingers lie back along the flank.
  const sh = new THREE.Vector3(0, 0, 0);
  const spread = { el: V(0.35, 0.08, 0.12), wr: V(0.55, 0.12, 0.05), fingers: [V(1.0, 0.05, 0.02), V(0.9, 0.02, -0.22), V(0.75, -0.01, -0.42), V(0.55, -0.04, -0.58)] };
  // Folded, it lies along the flank just above the back line, as a cat-like dragon's does at rest.
  const folded = { el: V(0.12, 0.07, -0.16), wr: V(0.15, 0.09, 0.12), fingers: [V(0.2, 0.05, -0.62), V(0.19, 0.03, -0.6), V(0.17, 0.0, -0.56), V(0.15, -0.03, -0.5)] };
  const el = spread.el.clone(), wr = spread.wr.clone(), fingers = spread.fingers.map((f) => f.clone());
  const R = span * 0.026;
  // Bones are unit-length rods, stretched and turned to their joints on every pose.
  const rods: Array<{ m: THREE.Mesh; a: THREE.Vector3; b: THREE.Vector3 }> = [];
  const rod = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const m = mesh(new THREE.CylinderGeometry(r * 0.6, r, 1, 6), bone, 'wing');
    grp.add(m);
    rods.push({ m, a, b });
  };
  rod(sh, el, R); rod(el, wr, R * 0.8);
  for (const f of fingers) rod(wr, f, R * 0.55);
  // The thumb claw at the wrist, and a claw at each finger's tip.
  const thumb = mesh(new THREE.ConeGeometry(R * 0.7, span * 0.08, 5), bone, 'wing');
  thumb.rotation.x = -0.6;
  grp.add(thumb);
  const tips = fingers.map(() => { const t = mesh(new THREE.ConeGeometry(R * 0.4, span * 0.05, 5), bone, 'wing'); t.rotation.z = -sx * Math.PI / 2; grp.add(t); return t; });
  // The membrane: fans from the wrist between the fingers, and back to the body along the flank;
  // the trailing edge scallops in between each pair.
  const root = new THREE.Vector3(0, 0, -span * 0.42);
  const tris = (): THREE.Vector3[] => {
    const out: THREE.Vector3[] = [sh, el, root, el, wr, root];
    for (let i = 0; i < 3; i++) {
      const a = fingers[i], b = fingers[i + 1], mid = a.clone().lerp(b, 0.5).lerp(wr, 0.42); // scallop in
      out.push(wr, a, mid, wr, mid, b);
    }
    out.push(wr, fingers[3], root);
    return out;
  };
  const mg = new THREE.BufferGeometry();
  mg.setAttribute('position', new THREE.Float32BufferAttribute(new Array(tris().length * 3).fill(0), 3));
  const membrane = mesh(mg, mem, 'wing');
  grp.add(membrane);
  // Veins (or panel seams) from the wrist: one between each pair of fingers, or `ribs` of them,
  // fanned (the Light Fury's ribbed wings).
  const perGap = w.ribs ?? 1;
  const veins: Array<{ m: THREE.Mesh; gap: number; f: number }> = [];
  for (let i = 0; i < 3; i++) for (let k = 0; k < perGap; k++) {
    const m = mesh(new THREE.CylinderGeometry(R * 0.12, R * 0.2, 1, 4), w.panels && d.runes ? glowMat(d.runes) : bone, 'wing');
    grp.add(m);
    veins.push({ m, gap: i, f: (k + 1) / (perGap + 1) });
  }
  const Y = new THREE.Vector3(0, 1, 0), dd = new THREE.Vector3();
  const place = (m: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3) => {
    dd.subVectors(b, a);
    const len = Math.max(1e-4, dd.length());
    m.position.copy(a).addScaledVector(dd, 0.5);
    m.scale.set(1, len, 1);
    m.quaternion.setFromUnitVectors(Y, dd.divideScalar(len));
  };
  let last = -1;
  const fold = (f: number) => {
    f = Math.min(1, Math.max(0, f));
    if (Math.abs(f - last) < 1e-3) return;
    last = f;
    // Ease the fold so the wing sweeps in smoothly.
    const e = f * f * (3 - 2 * f);
    el.lerpVectors(spread.el, folded.el, e);
    wr.lerpVectors(spread.wr, folded.wr, e);
    fingers.forEach((p, i) => p.lerpVectors(spread.fingers[i], folded.fingers[i], e));
    for (const r of rods) place(r.m, r.a, r.b);
    thumb.position.set(wr.x, wr.y + span * 0.03, wr.z + span * 0.02);
    tips.forEach((t, i) => t.position.copy(fingers[i]));
    const pa = mg.getAttribute('position') as THREE.BufferAttribute;
    tris().forEach((p, i) => pa.setXYZ(i, p.x, p.y, p.z));
    pa.needsUpdate = true;
    mg.computeVertexNormals();
    mg.computeBoundingSphere();
    // Each vein runs to the scalloped edge between its two fingers (deepest at the middle).
    for (const v of veins) place(v.m, wr, fingers[v.gap].clone().lerp(fingers[v.gap + 1], v.f).lerp(wr, 0.42 * Math.sin(v.f * Math.PI) * 0.72));
  };
  fold(0);
  return { g: grp, fold };
}

// ───── the dragon ─────

/**
 * Night, shared by every dragon (0 by day … 1 at night; the game sets it from the sky). Each
 * dragon's body carries a soft light round its silhouette, its aura — faint by day, so a dark
 * dragon still reads against the sky and the monument it circles, and brighter at night, when the
 * Night Dragon's edges glow his plasma blue and the Light Fury's shimmer pearl and lilac (owner,
 * 2026-09-30: "make the dragons better and easy to see near the monuments").
 */
export const DRAGON_NIGHT = { value: 0 };

/** The aura's colour: its own, else its rim colour, or a pale tint of its flank when the rim is dark. */
export function auraOf(d: DragonSpec): THREE.Color {
  if (d.aura) return new THREE.Color(d.aura);
  const rim = new THREE.Color(d.rim), hsl = { h: 0, s: 0, l: 0 };
  rim.getHSL(hsl);
  return hsl.l > 0.45 ? rim : new THREE.Color(d.side).lerp(new THREE.Color('#ffffff'), 0.6);
}

/** Light the edges of a material that faces away from the eye (a Fresnel rim), by day and more by night. */
function withAura(mat: THREE.MeshStandardMaterial, colour: THREE.Color, day = 0.22, night = 0.85): void {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.auraC = { value: colour };
    sh.uniforms.auraNight = DRAGON_NIGHT;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 auraC;
uniform float auraNight;`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
{
  float rimF = 1.0 - abs(dot(normalize(normal), normalize(vViewPosition)));
  totalEmissiveRadiance += auraC * pow(rimF, 2.6) * mix(${day.toFixed(3)}, ${night.toFixed(3)}, auraNight);
}`);
  };
  mat.customProgramCacheKey = () => `dragon-aura-${day}-${night}`;
}

const SEG = 150, RAD = 14;

export class DragonModel {
  readonly group = new THREE.Group();
  readonly body: THREE.Mesh;
  private bits: THREE.Mesh;
  private glowBits: THREE.Mesh;
  readonly head = new THREE.Group();
  /** Each wing, the side it is on and where along the body it grows (the main pair at the shoulders, a hind pair over the hips). */
  private wings: Array<{ w: Wing; sx: number; at: number; beat: number }> = [];
  readonly pearl: THREE.Mesh | null = null;
  private bodyLay: Layout; private bitsLay: Layout; private glowLay: Layout;
  /** How far ahead of the neck the head's centre floats. */
  readonly headAhead: number;
  readonly samples = 160;
  readonly P: THREE.Vector3[] = []; readonly T: THREE.Vector3[] = []; readonly N: THREE.Vector3[] = []; readonly B: THREE.Vector3[] = [];

  constructor(readonly spec: DragonSpec) {
    const d = spec, L = d.length, R0 = d.girth;
    for (let i = 0; i < this.samples; i++) { this.P.push(new THREE.Vector3()); this.T.push(new THREE.Vector3(0, 0, 1)); this.N.push(new THREE.Vector3(1, 0, 0)); this.B.push(new THREE.Vector3(0, 1, 0)); }
    // The body: a tube along s, round angle u (u 0.25 the back, 0.75 the belly), a little flattened.
    const bpos: number[] = [], buv: number[] = [], bs: number[] = [], bo: number[] = [], bidx: number[] = [];
    for (let i = 0; i <= SEG; i++) {
      const s = i / SEG, r = girth(d, s) * R0;
      for (let j = 0; j <= RAD; j++) {
        const u = j / RAD, a = u * Math.PI * 2;
        bo.push(Math.cos(a) * r, Math.sin(a) * r * 0.88, 0);
        bs.push(s); bpos.push(0, 0, 0);
        buv.push(u, (s * L) / (Math.PI * R0));
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
    const map = hideTexture(d);
    const metal = d.scales === 'plate' || d.scales === 'hex';
    this.body = new THREE.Mesh(bgeo, new THREE.MeshStandardMaterial({
      color: map ? '#ffffff' : d.side, map, roughness: metal ? 0.32 : 0.45, metalness: metal ? 0.7 : 0.25,
      emissive: d.emissive ?? '#000000', emissiveIntensity: d.emissive ? 0.3 : 0, side: THREE.DoubleSide,
      transparent: !!d.translucent, opacity: d.translucent ? 0.78 : 1, depthWrite: !d.translucent,
    }));

    const solid = new Parts(), glow = new Parts();
    layParts(d, solid, glow);
    const sb = solid.geometry(), gb = glow.geometry();
    this.bitsLay = sb.lay; this.glowLay = gb.lay;
    this.bits = new THREE.Mesh(sb.geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: metal ? 0.6 : 0.2, emissive: d.emissive ?? '#201000', emissiveIntensity: 0.3, side: THREE.DoubleSide, transparent: !!d.translucent, opacity: d.translucent ? 0.85 : 1 }));
    this.glowBits = new THREE.Mesh(gb.geo, new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide }));
    const aura = auraOf(d);
    withAura(this.body.material as THREE.MeshStandardMaterial, aura);
    withAura(this.bits.material as THREE.MeshStandardMaterial, aura, 0.12, 0.5);

    // Clear of the neck by a gap that shrinks with a small dragon (the big ones' half a metre).
    this.headAhead = buildHead(d, this.head) + 0.5 * Math.min(1, R0 / 1.3) + ANIMAL_HEAD_GAP * 4;
    if (d.wings) for (const sx of [1, -1]) {
      const w = buildWing(d, sx);
      this.wings.push({ w, sx, at: SHOULDER(d), beat: 1 });
      this.group.add(w.g);
      if (d.wings.hind) {
        const h = buildWing(d, sx, d.wings.hind);
        this.wings.push({ w: h, sx, at: HIP(d) + 0.04, beat: 0.6 });
        this.group.add(h.g);
      }
    }
    if (d.pearl) {
      this.pearl = mesh(new THREE.SphereGeometry(1.1 * (R0 / 2.1), 16, 12), glowMat(d.pearl), 'accessory');
      const halo = mesh(new THREE.SphereGeometry(1.8 * (R0 / 2.1), 16, 12), new THREE.MeshBasicMaterial({ color: d.pearl, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }), 'accessory');
      this.pearl.add(halo);
    }
    for (const m of [this.body, this.bits, this.glowBits]) { m.frustumCulled = false; m.castShadow = true; m.userData.part = 'body'; }
    this.glowBits.castShadow = false;
    this.group.add(this.body, this.bits, this.glowBits, this.head);
    if (this.pearl) this.group.add(this.pearl);
  }

  /**
   * Bend the dragon along its centre line: P (neck → tail, `samples` points), with the tangent T
   * pointing forward, N to its side and B up. Then place the head, beat the wings.
   */
  /** Where the head looks, relative to the way the neck points: turned (+ to its left) and raised (radians). */
  readonly look = { yaw: 0, pitch: 0 };

  pose(t: number, flap = 1, beat?: number, fold = 0): void {
    this.deform(this.body, this.bodyLay);
    this.deform(this.bits, this.bitsLay);
    this.deform(this.glowBits, this.glowLay);
    this.body.geometry.computeVertexNormals();
    // The cat build's rounded limbs shade smoothly.
    if (this.spec.build === 'cat') this.bits.geometry.computeVertexNormals();
    // As it turns its head, the head floats a little further forward, so its horns and frill never
    // swing in against the neck.
    this.head.position.copy(this.P[0]).addScaledVector(this.T[0], this.headAhead * (1 + 0.6 * Math.abs(this.look.yaw) + 0.3 * Math.abs(this.look.pitch)));
    this.head.lookAt(this.head.position.clone().add(this.T[0]));
    // The head leads into turns and looks about; it floats, so it turns freely.
    this.head.rotateY(this.look.yaw);
    this.head.rotateX(-this.look.pitch);
    const b = beat ?? Math.sin(t * 2.2) * 0.55 * flap + 0.1;
    for (const { w, sx, at, beat: k } of this.wings) {
      const i = Math.round(at * (this.samples - 1)), r = girth(this.spec, at) * this.spec.girth;
      const m = new THREE.Matrix4().makeBasis(this.N[i], this.B[i], this.T[i]);
      w.fold(fold);
      w.g.position.copy(this.P[i]).addScaledVector(this.N[i], sx * r * 0.7).addScaledVector(this.B[i], r * 0.55);
      // Folded, the wing lies against the flank and barely beats.
      w.g.quaternion.setFromRotationMatrix(m).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), sx * b * k * (1 - fold * 0.85)));
    }
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
  }
}

// ───── flight: the head follows a path; the body is where the head has been ─────

const _dT = new THREE.Vector3();

export interface Flight {
  /** Where the head is at phase φ (world). */
  path(phi: number, out: THREE.Vector3): THREE.Vector3;
  /** Metres per unit of φ along the path (so the body spaces out by its length). */
  scale: number;
  /** Flying speed (m/s). */
  speed: number;
  /** Serpent ripple (up/down and side to side) — winged dragons ripple little. */
  ripple: number;
}

/** Sample the flight into the dragon's centre line and bend it there; the pearl flies ahead. */
export function fly(dm: DragonModel, f: Flight, t: number): void {
  const n = dm.samples, L = dm.spec.length, step = L / (n - 1), up = new THREE.Vector3(0, 1, 0);
  const phi0 = (t * f.speed) / f.scale;
  let phi = phi0;
  for (let i = 0; i < n; i++) {
    f.path(phi, dm.P[i]);
    const s = i / (n - 1), w = 2 * Math.PI * (s * 2.2 - t * 0.35);
    dm.P[i].y += Math.sin(w) * 1.6 * s * f.ripple;
    phi -= step / f.scale;
  }
  for (let i = 0; i < n; i++) {
    const a = dm.P[Math.max(0, i - 1)], b = dm.P[Math.min(n - 1, i + 1)];
    dm.T[i].subVectors(a, b).normalize();
    dm.N[i].crossVectors(up, dm.T[i]).normalize();
    const s = i / (n - 1);
    dm.P[i].addScaledVector(dm.N[i], Math.sin(2 * Math.PI * (s * 1.6 - t * 0.28)) * 2.2 * s * f.ripple);
    dm.B[i].crossVectors(dm.T[i], dm.N[i]).normalize();
  }
  // Banking: every part of the body leans into the curve it is flying round, as a bird or a plane
  // does — more in a tighter turn and at speed (tan bank = v²κ/g), never past about 43°.
  let lead = 0;
  for (let i = 0; i < n; i++) {
    const i0 = Math.max(0, i - 4), i1 = Math.min(n - 1, i + 4);
    _dT.subVectors(dm.T[i0], dm.T[i1]);
    _dT.y = 0;
    _dT.addScaledVector(dm.T[i], -_dT.dot(dm.T[i]));
    const k = _dT.length() / Math.max(1e-3, (i1 - i0) * step);
    const bank = Math.min(0.75, Math.atan((f.speed * f.speed * k) / 9.81));
    if (bank < 0.01) continue;
    _dT.normalize();
    dm.B[i].multiplyScalar(Math.cos(bank)).addScaledVector(_dT, Math.sin(bank)).normalize();
    dm.N[i].crossVectors(dm.B[i], dm.T[i]).normalize();
    dm.B[i].crossVectors(dm.T[i], dm.N[i]).normalize();
    if (i === 2) lead = Math.sign(_dT.dot(dm.N[i])) * Math.min(0.45, bank * 0.9);
  }
  // The head turns into the curve ahead of the body, and looks gently about as it flies.
  const ph = dm.spec.id.length * 1.7;
  dm.look.yaw = lead + Math.sin(t * 0.37 + ph) * 0.18;
  dm.look.pitch = Math.sin(t * 0.53 + ph) * 0.08;
  dm.pose(t);
  if (dm.pearl) {
    f.path(phi0 + (dm.headAhead + dm.spec.girth * 4) / f.scale, dm.pearl.position);
    dm.pearl.position.y += Math.sin(t * 1.3) * 1.5;
    dm.pearl.rotation.y = t;
  }
}

/**
 * Hold the dragon in its own frame, for a mount: the neck at (0, y, z0), the body straight back
 * along −z, only the tail (behind `still`) swaying from side to side; wings beat by `beat`;
 * `glance` turns the head (+ to its left) without bending the neck.
 * Forward is +z here, as for every vehicle.
 */
export function perch(dm: DragonModel, t: number, y: number, z0: number, beat: number, still = 0.45, lift = 0, fold = 0, steer = 0, climb = 0, glance = 0): void {
  const n = dm.samples, L = dm.spec.length, up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < n; i++) {
    const s = i / (n - 1), k = Math.max(0, (s - still) / (1 - still));
    // The neck arches up by `lift` towards the head, and bends into a turn (`steer`, + to its left);
    // the tail swings the other way.
    const arch = lift * Math.max(0, 1 - s / 0.16) ** 2, bend = Math.max(0, 1 - s / 0.22) ** 2;
    dm.P[i].set(Math.sin(t * 1.8 - s * 7) * k * k * L * 0.07 + steer * L * 0.09 * bend - steer * k * k * L * 0.06,
      y + arch + Math.sin(t * 1.3 - s * 5) * k * L * 0.015, z0 - s * L);
  }
  // The head leads the turn and lifts to climb or dips to dive; at rest it looks about (`glance`).
  dm.look.yaw = steer * 0.35 + glance;
  dm.look.pitch = climb * 0.3;
  for (let i = 0; i < n; i++) {
    const a = dm.P[Math.max(0, i - 1)], b = dm.P[Math.min(n - 1, i + 1)];
    dm.T[i].subVectors(a, b).normalize();
    dm.N[i].crossVectors(up, dm.T[i]).normalize();
    dm.B[i].crossVectors(dm.T[i], dm.N[i]).normalize();
  }
  dm.pose(t, 1, beat, fold);
}
