import * as THREE from 'three';
import { animalHeadGap, type Part } from '../characters/anatomy';
import { Shaper, type V3 } from './shaper';

/**
 * Creatures that travel with the traffic: draught animals and caravans on the roads, swans on
 * the water, winged horses, birds, whales and koi in the sky. They follow the same rules as every
 * animal in the game: no eyes, nose or mouth, and the head floats a little way off the neck
 * (animalHeadGap, bigger heads float further). Each is a few instanced pieces — the body, the
 * floating head, and the parts that move: legs that trot, wings that beat, a tail that sweeps.
 */

/** How a piece moves (about its pivot) as the creature or vehicle goes. */
export type Anim = 'none' | 'swingA' | 'swingB' | 'flapL' | 'flapR' | 'spinX' | 'spinY' | 'spinZ' | 'tail' | 'fluke';

export interface Piece {
  solid: THREE.BufferGeometry | null;
  glow: THREE.BufferGeometry | null;
  anim: Anim;
  pivot: V3;
  /** Swing, flap or sweep in radians (spin: turns per second). */
  amp: number;
  /** What it is (creatures: an anatomy part; machines: 'vehicle'). */
  part: Part | 'vehicle';
}

export function piece(fn: (s: Shaper) => void, part: Piece['part'] = 'vehicle', anim: Anim = 'none', pivot: V3 = [0, 0, 0], amp = 0): Piece {
  const s = new Shaper();
  fn(s);
  const { solid, glow } = s.build();
  return { solid, glow, anim, pivot, amp, part };
}

/** A tapered limb from a to b. */
export function limb(s: Shaper, a: V3, b: V3, ra: number, rb: number, c: THREE.ColorRepresentation, seg = 8): void {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), d = vb.clone().sub(va), len = d.length();
  const geo = new THREE.CylinderGeometry(rb, ra, len, seg);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()));
  const m = va.add(vb).multiplyScalar(0.5);
  s.add(geo, c, [m.x, m.y, m.z]);
}

export interface Quad {
  /** Body length, height at the withers, body radius. */
  len: number; h: number; girth: number;
  col: string; col2: string; hoof?: string;
  neckLen: number; neckUp: number; headR: number;
  snout?: number;
  hump?: 1 | 2;
  horns?: 'unicorn' | 'antlers' | 'ox' | 'ram';
  ears?: 'pointed' | 'round' | 'big';
  tail?: 'hair' | 'thin' | 'tuft';
  mane?: boolean;
  trunk?: boolean;
  wings?: string;
  /** Things on its back (a saddle blanket, a howdah, packs). */
  load?: (s: Shaper, top: number) => void;
}

/** A four-legged animal walking forward (+z): body, floating head, four trotting legs (and wings). */
export function quadruped(q: Quad, at: V3 = [0, 0, 0]): Piece[] {
  const [ox, oy, oz] = at, R = q.girth, yc = q.h - R + oy, L = q.len, hipY = yc - R * 0.55;
  const dir = new THREE.Vector3(0, Math.sin(q.neckUp), Math.cos(q.neckUp));
  const neckBase = new THREE.Vector3(ox, yc + R * 0.35, oz + L * 0.36);
  const neckEnd = neckBase.clone().addScaledVector(dir, q.neckLen);
  const rn = R * (q.trunk ? 0.55 : 0.34);
  // The head floats clear of the neck by the gap its size asks for.
  const hc = neckEnd.clone().addScaledVector(dir, animalHeadGap(q.headR) + q.headR * 1.05 + rn * 0.3);
  const out: Piece[] = [];
  out.push(piece((s) => {
    s.ball(R, q.col, [ox, yc, oz], { s: [0.88, 1, L / (2 * R)], seg: 16 });
    s.ball(R * 1.02, q.col, [ox, yc + R * 0.05, oz + L * 0.3], { s: [0.9, 1, 0.9], seg: 12 });
    s.ball(R * 0.98, q.col, [ox, yc + R * 0.02, oz - L * 0.3], { s: [0.92, 1, 0.9], seg: 12 });
    s.ball(R * 0.8, q.col2, [ox, yc - R * 0.35, oz], { s: [0.8, 0.5, L / (2.2 * R)], seg: 12 });
    limb(s, [neckBase.x, neckBase.y, neckBase.z], [neckEnd.x, neckEnd.y, neckEnd.z], R * 0.5, rn, q.col, 10);
    if (q.mane) for (let i = 0; i < 7; i++) {
      const p = neckBase.clone().lerp(neckEnd, i / 7).add(new THREE.Vector3(0, R * 0.36, -R * 0.18));
      s.box(R * 0.12, R * 0.34, R * 0.3, q.col2, [p.x, p.y, p.z], { r: [q.neckUp - Math.PI / 2, 0, 0] });
    }
    if (q.hump) for (let i = 0; i < q.hump; i++) s.ball(R * 0.55, q.col, [ox, yc + R * 0.85, oz + (q.hump === 2 ? (i ? -0.22 : 0.22) * L : 0)], { s: [0.8, 1, 1.1] });
    const tb: V3 = [ox, yc + R * 0.3, oz - L * 0.5];
    if (q.tail === 'hair') limb(s, tb, [ox, yc - R * 1.1, oz - L * 0.62], R * 0.16, R * 0.26, q.col2);
    else if (q.tail) {
      limb(s, tb, [ox, yc - R * 0.9, oz - L * 0.56], R * 0.06, R * 0.05, q.col);
      if (q.tail === 'tuft') s.ball(R * 0.14, q.col2, [ox, yc - R * 0.95, oz - L * 0.57]);
    }
    if (q.load) q.load(s, yc + R);
  }, 'body'));
  out.push(piece((s) => {
    const f = dir.clone(), up = new THREE.Vector3(0, 1, 0);
    const pitch = -Math.atan2(f.y, f.z) + 0.7;
    s.ball(q.headR, q.col, [hc.x, hc.y, hc.z], { s: [0.85, 0.9, 1.1], r: [pitch, 0, 0], seg: 14 });
    const sn = q.snout ?? 1;
    const snoutAt = hc.clone().add(new THREE.Vector3(0, -q.headR * 0.45, q.headR * 0.85 * sn));
    s.ball(q.headR * 0.62, q.col, [snoutAt.x, snoutAt.y, snoutAt.z], { s: [0.8, 0.75, 1.25 * sn] });
    if (q.trunk) for (let i = 0; i < 6; i++) s.ball(q.headR * (0.36 - i * 0.035), q.col, [hc.x, snoutAt.y - i * q.headR * 0.32, snoutAt.z + q.headR * 0.25 + Math.sin(i * 0.4) * q.headR * 0.2]);
    const ear = q.ears ?? 'pointed';
    for (const sx of [-1, 1]) {
      if (ear === 'big') s.ball(q.headR * 0.8, q.col2, [hc.x + sx * q.headR * 1.0, hc.y + q.headR * 0.1, hc.z - q.headR * 0.3], { s: [0.25, 1.1, 0.9] });
      else if (ear === 'round') s.ball(q.headR * 0.28, q.col, [hc.x + sx * q.headR * 0.7, hc.y + q.headR * 0.75, hc.z - q.headR * 0.2]);
      else s.cone(q.headR * 0.2, q.headR * 0.6, q.col, [hc.x + sx * q.headR * 0.55, hc.y + q.headR * 0.95, hc.z - q.headR * 0.3], { r: [-0.2, 0, -sx * 0.25], seg: 5 });
      if (q.horns === 'ox') s.cone(q.headR * 0.14, q.headR * 0.9, '#efe6d2', [hc.x + sx * q.headR * 0.95, hc.y + q.headR * 0.55, hc.z - q.headR * 0.1], { r: [0, 0, -sx * 1.0], seg: 6 });
      if (q.horns === 'ram') s.add(new THREE.TorusGeometry(q.headR * 0.4, q.headR * 0.12, 5, 10, Math.PI * 1.4), '#d8cbb0', [hc.x + sx * q.headR * 0.8, hc.y + q.headR * 0.4, hc.z - q.headR * 0.2], { r: [0, Math.PI / 2, 0] });
      if (q.horns === 'antlers') {
        const b: V3 = [hc.x + sx * q.headR * 0.4, hc.y + q.headR * 0.8, hc.z - q.headR * 0.3], t: V3 = [b[0] + sx * q.headR * 1.1, b[1] + q.headR * 2.0, b[2] - q.headR * 0.6];
        limb(s, b, t, q.headR * 0.08, q.headR * 0.05, '#e8dcc0', 5);
        for (let k = 1; k <= 3; k++) {
          const p: V3 = [b[0] + (t[0] - b[0]) * k / 4, b[1] + (t[1] - b[1]) * k / 4, b[2] + (t[2] - b[2]) * k / 4];
          limb(s, p, [p[0] + sx * q.headR * 0.15, p[1] + q.headR * 0.6, p[2] + q.headR * 0.45], q.headR * 0.05, q.headR * 0.03, '#e8dcc0', 5);
        }
      }
    }
    if (q.horns === 'unicorn') s.cone(q.headR * 0.14, q.headR * 1.9, '#ffe9a8', [hc.x, hc.y + q.headR * 1.3, hc.z + q.headR * 0.45], { r: [0.55, 0, 0], seg: 8 });
    void up;
  }, 'head'));
  // Legs: front-left with back-right, front-right with back-left, like a trot.
  for (const [sx, sz, anim] of [[1, 1, 'swingA'], [-1, 1, 'swingB'], [1, -1, 'swingB'], [-1, -1, 'swingA']] as const) {
    const x = ox + sx * R * 0.52, z = oz + sz * L * 0.3;
    out.push(piece((s) => {
      limb(s, [x, hipY + R * 0.2, z], [x, oy + hipY * 0.45, z + sz * 0.02], R * 0.26, R * 0.17, q.col);
      limb(s, [x, oy + hipY * 0.45, z + sz * 0.02], [x, oy + 0.08, z], R * 0.16, R * 0.13, q.col);
      s.cyl(R * 0.17, R * 0.19, 0.12, q.hoof ?? '#3a2f28', [x, oy + 0.06, z]);
    }, 'leg', anim, [x, hipY + R * 0.2, z], 0.4));
  }
  if (q.wings) for (const sx of [1, -1]) out.push(featheredWing(q.wings, sx, [ox + sx * R * 0.6, yc + R * 0.7, oz + L * 0.18], L * 1.3, L * 0.45));
  return out;
}

/** A feathered wing out to the side `sx` from the shoulder: arm coverts and splayed primaries. */
export function featheredWing(col: string, sx: number, at: V3, span: number, chord: number, tip = '#ffffff'): Piece {
  return piece((s) => {
    const [x, y, z] = at;
    s.ball(span * 0.3, col, [x + sx * span * 0.28, y, z - chord * 0.2], { s: [1, 0.08, chord / (span * 0.6)] });
    for (let i = 0; i < 7; i++) {
      const t = i / 6, fx = x + sx * span * (0.45 + t * 0.45), fz = z - chord * (0.05 + t * 0.35);
      s.ball(span * 0.2, i > 3 ? tip : col, [fx, y + 0.01 * i, fz - chord * 0.25], { s: [0.3, 0.05, 1.6], r: [0, -sx * (0.2 + t * 0.7), 0], seg: 8 });
    }
  }, 'wing', sx > 0 ? 'flapL' : 'flapR', at, 0.75);
}

export interface Bird {
  len: number; col: string; col2: string; beak: string;
  span: number; neckLen: number; neckUp: number; headR: number;
  tail?: 'fan' | 'long' | 'short';
  crest?: string;
  /** Floats on water: body at the waterline, wings folded. */
  swims?: boolean;
  tip?: string;
}

/** A bird flying (or swimming) forward: body, neck, floating head with beak, and wings. */
export function bird(b: Bird): Piece[] {
  const R = b.len * 0.22, y0 = b.swims ? R * 0.35 : 0;
  const dir = new THREE.Vector3(0, Math.sin(b.neckUp), Math.cos(b.neckUp));
  const base = new THREE.Vector3(0, y0 + R * 0.35, b.len * 0.32), end = base.clone().addScaledVector(dir, b.neckLen);
  const hc = end.clone().addScaledVector(dir, animalHeadGap(b.headR) + b.headR * 1.05 + R * 0.05);
  const out: Piece[] = [];
  out.push(piece((s) => {
    s.ball(R, b.col, [0, y0, 0], { s: [0.9, 0.85, b.len / (2 * R)], seg: 14 });
    s.ball(R * 0.8, b.col2, [0, y0 - R * 0.3, R * 0.2], { s: [0.8, 0.6, 1.6] });
    limb(s, [base.x, base.y, base.z], [end.x, end.y, end.z], R * 0.42, R * 0.26, b.col, 8);
    const tl = b.tail ?? 'short';
    if (tl === 'fan') for (let i = -3; i <= 3; i++) s.ball(R * 0.9, i % 2 ? b.col2 : b.col, [i * R * 0.25, y0 + R * 0.1, -b.len * 0.62], { s: [0.25, 0.06, 1.2], r: [0, i * 0.18, 0] });
    else s.ball(R * 0.7, b.col, [0, y0 + R * 0.1, -b.len * 0.5], { s: [0.6, 0.12, tl === 'long' ? 2.4 : 1.2] });
    if (b.swims) for (const sx of [1, -1]) s.ball(R * 0.9, b.col, [sx * R * 0.7, y0 + R * 0.25, -R * 0.2], { s: [0.3, 0.45, 1.5] });
  }, 'body'));
  out.push(piece((s) => {
    s.ball(b.headR, b.col, [hc.x, hc.y, hc.z], { s: [0.85, 0.9, 1.1] });
    s.cone(b.headR * 0.4, b.headR * 1.6, b.beak, [hc.x, hc.y - b.headR * 0.15, hc.z + b.headR * 1.4], { r: [Math.PI / 2 - 0.15, 0, 0], seg: 6 });
    if (b.crest) for (let i = 0; i < 4; i++) s.cone(b.headR * 0.12, b.headR * 1.2, b.crest, [hc.x + (i - 1.5) * b.headR * 0.18, hc.y + b.headR * 1.2, hc.z - b.headR * 0.2], { r: [-0.4, 0, (i - 1.5) * 0.15], seg: 4 });
  }, 'head'));
  if (!b.swims) for (const sx of [1, -1]) out.push(featheredWing(b.col, sx, [sx * R * 0.6, y0 + R * 0.3, R * 0.3], b.span / 2, b.len * 0.5, b.tip ?? b.col2));
  return out;
}

/** A great whale that swims through the sky: body, floating head, flippers and flukes. */
export function skyWhale(col: string, belly: string, len: number, glowCol: string): Piece[] {
  const R = len * 0.14, headR = R * 0.9;
  const gap = animalHeadGap(headR);
  return [
    piece((s) => {
      s.lathe([[0.02, -len * 0.5], [R * 0.35, -len * 0.42], [R * 0.7, -len * 0.25], [R, 0], [R * 0.95, len * 0.2], [R * 0.7, len * 0.3], [0.02, len * 0.32]], col, [0, 0, 0], { s: [1, 0.85, 1], seg: 18 });
      s.ball(R * 0.9, belly, [0, -R * 0.35, 0], { s: [0.85, 0.5, len * 0.35 / R] });
      for (let i = 0; i < 9; i++) s.ball(R * 0.08, glowCol, [(i % 2 ? 1 : -1) * R * 0.5, R * 0.55, -len * 0.3 + i * len * 0.07], { glow: true, seg: 6 });
    }, 'body'),
    piece((s) => {
      s.ball(headR, col, [0, R * 0.05, len * 0.32 + gap + headR], { s: [0.95, 0.8, 1.3], seg: 16 });
      s.ball(headR * 0.85, belly, [0, -R * 0.35, len * 0.32 + gap + headR * 1.1], { s: [0.8, 0.45, 1.15] });
    }, 'head'),
    ...[1, -1].map((sx) => piece((s) => {
      s.ball(R * 0.9, col, [sx * R * 1.4, -R * 0.35, len * 0.08], { s: [1, 0.12, 0.45], r: [0, -sx * 0.4, sx * 0.3] });
    }, 'wing', sx > 0 ? 'flapL' : 'flapR', [sx * R * 0.8, -R * 0.3, len * 0.08], 0.35)),
    piece((s) => {
      for (const sx of [1, -1]) s.ball(R * 0.9, col, [sx * R * 0.7, 0, -len * 0.56], { s: [1, 0.1, 0.5], r: [0, sx * 0.5, 0] });
    }, 'tail', 'fluke', [0, 0, -len * 0.48], 0.3),
  ];
}

/** A koi swimming through the air (Japan's carp streamers come alive). */
export function skyKoi(col: string, col2: string, len: number): Piece[] {
  const R = len * 0.17, headR = R * 0.85, gap = animalHeadGap(headR);
  return [
    piece((s) => {
      s.lathe([[0.02, -len * 0.45], [R * 0.4, -len * 0.35], [R * 0.9, -len * 0.1], [R, len * 0.1], [R * 0.8, len * 0.28], [0.02, len * 0.3]], col, [0, 0, 0], { s: [0.8, 1, 1], seg: 14 });
      for (let i = 0; i < 4; i++) s.ball(R * 0.45, col2, [0, R * (0.5 - i * 0.1), -len * 0.25 + i * len * 0.14], { s: [0.9, 0.5, 1] });
      s.shape([[0, 0], [R * 0.2, R * 0.9], [-R * 0.5, R * 0.7]], 0.02, col2, [0, R * 0.7, 0], { r: [0, Math.PI / 2, 0] });
    }, 'body'),
    piece((s) => s.ball(headR, col, [0, 0, len * 0.3 + gap + headR], { s: [0.8, 0.9, 1.1] }), 'head'),
    piece((s) => {
      for (const sy of [1, -1]) s.ball(R, col2, [0, sy * R * 0.5, -len * 0.6], { s: [0.06, 0.9, 0.8], r: [sy * 0.5, 0, 0] });
    }, 'tail', 'tail', [0, 0, -len * 0.45], 0.45),
    ...[1, -1].map((sx) => piece((s) => {
      s.ball(R * 0.6, col2, [sx * R * 1.0, -R * 0.4, len * 0.1], { s: [1, 0.08, 0.7] });
    }, 'wing', sx > 0 ? 'flapL' : 'flapR', [sx * R * 0.6, -R * 0.3, len * 0.12], 0.4)),
  ];
}

/**
 * China's festival dragon, flying free: a long body of segments (each drawn in the next colour
 * of its palette), led by a great floating head with antlers, a mane and long whiskers.
 */
export function dragonHead(col: string, mane: string, headR: number): Piece {
  return piece((s) => {
    s.ball(headR, col, [0, 0, 0], { s: [0.9, 0.8, 1.2], seg: 14 });
    s.ball(headR * 0.7, col, [0, -headR * 0.2, headR * 1.05], { s: [0.8, 0.55, 1.2] });
    for (const sx of [1, -1]) {
      limb(s, [sx * headR * 0.4, headR * 0.6, -headR * 0.3], [sx * headR * 1.1, headR * 2.0, -headR * 1.1], headR * 0.1, headR * 0.06, '#ffd23a', 6);
      limb(s, [sx * headR * 0.8, headR * 1.4, -headR * 0.7], [sx * headR * 1.5, headR * 1.8, -headR * 0.5], headR * 0.06, headR * 0.04, '#ffd23a', 5);
      limb(s, [sx * headR * 0.4, -headR * 0.35, headR * 1.8], [sx * headR * 1.8, -headR * 0.8, headR * 0.4], headR * 0.04, headR * 0.02, '#ffffff', 5);
      for (let i = 0; i < 4; i++) s.cone(headR * 0.22, headR * 0.9, mane, [sx * headR * 0.75, headR * (0.2 - i * 0.2), -headR * (0.6 + i * 0.15)], { r: [-1.2, 0, -sx * 0.9], seg: 5 });
    }
  }, 'head');
}

export function dragonSegment(R: number): Piece {
  return piece((s) => {
    s.ball(R, '#ffffff', [0, 0, 0], { s: [1, 0.95, 1.25], seg: 12 });
    s.cone(R * 0.3, R * 0.8, '#ffe9a8', [0, R * 1.05, 0], { r: [-0.4, 0, 0], seg: 4 });
    for (const sx of [1, -1]) s.ball(R * 0.35, '#fff4c0', [sx * R * 0.95, -R * 0.1, 0], { s: [0.3, 0.9, 1] });
  }, 'body');
}
