import * as THREE from 'three';
import { ANIMAL_HEAD_GAP, type Part } from '../characters/anatomy';

/**
 * Structurally accurate cats, dogs, horses and unicorns: a chest, barrel and hindquarters rather
 * than one egg; jointed legs (shoulder or thigh, knee or hock, paw or hoof) that bend as they
 * walk; an arched neck with a mane; a shaped head (a cat's round skull and short muzzle, a dog's
 * muzzle and soft ears, a horse's long face); and a proper tail (a cat's curl, a dog's plume, a
 * horse's flowing strands). Still no eyes or facial features, and the head still floats clear
 * of the neck — the game's rule for every creature.
 */

export type DetailedId = 'cat' | 'dog' | 'horse' | 'unicorn';
export const DETAILED: readonly DetailedId[] = ['cat', 'dog', 'horse', 'unicorn'];

export interface Built {
  legs: THREE.Group[];
  knees: THREE.Group[];
  tail: THREE.Group;
  headBase: THREE.Vector3;
}

type PartFn = (geo: THREE.BufferGeometry, c: string, p: Part, glow?: boolean) => THREE.Mesh;

const UP = new THREE.Vector3(0, 1, 0);
const RAINBOW = ['#ff8a8a', '#ffc27a', '#fff08a', '#9ae8a0', '#8ac8ff', '#c8a4ff'];

/** A tapered limb segment from a to b. */
function segment(part: PartFn, a: THREE.Vector3, b: THREE.Vector3, r1: number, r2: number, c: string, p: Part, glow = false): THREE.Mesh {
  const d = b.clone().sub(a), len = d.length();
  const g = new THREE.CylinderGeometry(r2, r1, len, 7);
  const m = part(g, c, p, glow);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(UP, d.normalize());
  return m;
}

export function buildDetailed(
  id: DetailedId, part: PartFn, body: THREE.Group, head: THREE.Group,
  dims: { L: number; H: number; W: number; bodyY: number; headR: number; neck?: number; snout?: number },
  c: string, accent: string,
): Built {
  const { L, H, W, bodyY, headR } = dims;
  const cat = id === 'cat', dog = id === 'dog', equine = id === 'horse' || id === 'unicorn', uni = id === 'unicorn';
  // Markings: a lighter bib, socks and tail tip for cats and dogs.
  const light = '#' + new THREE.Color(c).lerp(new THREE.Color('#fbf6ee'), 0.72).getHexString();
  const ell = (sc: [number, number, number], p: [number, number, number], col = c, pt: Part = 'body') => {
    const m = part(new THREE.SphereGeometry(0.5, 14, 10), col, pt);
    m.scale.set(...sc);
    m.position.set(...p);
    body.add(m);
    return m;
  };

  // Torso: chest, barrel and hindquarters (a cat's back arches a little higher at the hips).
  ell([W * 0.92, H * 0.98, L * 0.5], [0, bodyY + (equine ? 0.03 : 0), L * 0.22]);
  ell([W * 0.86, H * 0.86, L * 0.64], [0, bodyY - H * 0.03, 0]);
  ell([W * 0.98, H * 0.95, L * 0.48], [0, bodyY + (cat ? H * 0.08 : 0.01), -L * 0.25]);
  if (equine) ell([W * 0.5, H * 0.32, L * 0.24], [0, bodyY + H * 0.4, L * 0.18]);
  if (cat || dog) ell([W * 0.72, H * 0.72, L * 0.26], [0, bodyY - H * 0.06, L * 0.39], light);

  // Legs: hip → upper leg → knee (hock behind) → lower leg → paw or hoof.
  const legs: THREE.Group[] = [], knees: THREE.Group[] = [];
  const hipY = bodyY - H * 0.2, legR = equine ? W * 0.12 : W * 0.15;
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
    const front = z > 0;
    const a0 = front ? 0.06 : -0.42, a1 = front ? -0.1 : 0.78;
    const seg = hipY / (Math.cos(a0) + Math.cos(a0 + a1));
    const hip = new THREE.Group();
    hip.position.set(x * W * 0.3, hipY, z * L * (front ? 0.33 : 0.3));
    hip.rotation.x = a0;
    hip.userData.base = a0;
    const up = new THREE.CylinderGeometry(legR * 0.8, legR * (front ? 1.25 : 1.55), seg, 7);
    up.translate(0, -seg / 2, 0);
    hip.add(part(up, c, 'leg'));
    if (!front) {
      const thigh = part(new THREE.SphereGeometry(legR * 1.7, 8, 6), c, 'leg');
      thigh.scale.set(0.8, 1.25, 1.1);
      thigh.position.y = -seg * 0.12;
      hip.add(thigh);
    }
    const knee = new THREE.Group();
    knee.position.y = -seg;
    knee.rotation.x = a1;
    knee.userData.base = a1;
    knee.userData.front = front;
    hip.add(knee);
    knee.add(part(new THREE.SphereGeometry(legR * 0.85, 7, 5), c, 'leg'));
    const lo = new THREE.CylinderGeometry(legR * 0.6, legR * 0.8, seg, 7);
    lo.translate(0, -seg / 2, 0);
    knee.add(part(lo, cat || dog ? (front ? c : c) : c, 'leg'));
    const foot = new THREE.Group();
    foot.position.y = -seg;
    foot.rotation.x = -(a0 + a1);
    knee.add(foot);
    if (equine) {
      if (uni) {
        const tuft = part(new THREE.SphereGeometry(legR * 1.2, 7, 5), '#ffffff', 'leg');
        tuft.scale.set(1, 1.35, 1);
        tuft.position.y = 0.13;
        foot.add(tuft);
      }
      const hoof = part(new THREE.CylinderGeometry(legR * 0.78, legR * 1.0, 0.1, 8), uni ? '#e2c46a' : accent, 'hoof', uni);
      hoof.position.y = 0.05;
      foot.add(hoof);
    } else {
      const paw = part(new THREE.SphereGeometry(legR * 1.05, 8, 6), light, 'foot');
      paw.scale.set(1, 0.55, 1.35);
      paw.position.set(0, legR * 0.45, legR * 0.35);
      foot.add(paw);
    }
    body.add(hip);
    legs.push(hip);
    knees.push(knee);
  }

  // Neck: an arched, tapering neck for the horse; short and sturdy for cats and dogs.
  const neckLen = equine ? dims.neck ?? 0.6 : cat ? 0.1 : 0.16;
  const tilt = equine ? 0.5 : 0.85;
  const ng = new THREE.CylinderGeometry(equine ? W * 0.2 : W * 0.28, equine ? W * 0.36 : W * 0.38, neckLen, 9);
  ng.translate(0, neckLen / 2, 0);
  const neck = part(ng, c, 'neck');
  neck.position.set(0, bodyY + H * (equine ? 0.22 : 0.18), L * (equine ? 0.36 : 0.4));
  neck.rotation.x = tilt;
  body.add(neck);
  if (equine) {
    // The crest: the arch along the top of the neck.
    const crest = part(new THREE.SphereGeometry(0.5, 10, 8), c, 'neck');
    crest.scale.set(W * 0.34, neckLen * 0.78, W * 0.42);
    crest.position.copy(new THREE.Vector3(0, neckLen * 0.42, -W * 0.08).applyEuler(neck.rotation).add(neck.position));
    crest.rotation.x = tilt;
    body.add(crest);
    // Mane: along the crest and down onto the withers (rainbow on a unicorn).
    for (let i = 0; i < 10; i++) {
      const col = uni ? RAINBOW[i % RAINBOW.length] : accent;
      const m = part(new THREE.BoxGeometry(0.05, 0.22 + (i % 3) * 0.04, 0.11), col, 'mane', uni && i % 2 === 0);
      m.position.copy(new THREE.Vector3(Math.sin(i * 1.7) * 0.02, neckLen * (i / 11) - 0.05, -W * 0.3).applyEuler(neck.rotation).add(neck.position));
      m.rotation.set(tilt + 0.25, 0, Math.sin(i * 2.1) * 0.25);
      body.add(m);
    }
  }
  const anchor = new THREE.Vector3(0, neckLen, 0).applyEuler(neck.rotation).add(neck.position);
  const dir = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  const headBase = anchor.clone().addScaledVector(dir, ANIMAL_HEAD_GAP + headR);

  // The head (floating clear of the neck).
  if (equine) {
    const skull = part(new THREE.SphereGeometry(headR, 12, 9), c, 'head', false);
    skull.scale.set(0.9, 0.95, 1);
    head.add(skull);
    // The long face, sloping down to a soft muzzle.
    const faceDir = new THREE.Vector3(0, -Math.sin(0.95), Math.cos(0.95));
    head.add(segment(part, new THREE.Vector3(0, 0, headR * 0.2), faceDir.clone().multiplyScalar(0.42), headR * 0.8, headR * 0.55, c, 'head'));
    const muzzle = part(new THREE.SphereGeometry(headR * 0.6, 10, 8), c, 'head');
    muzzle.scale.set(1, 0.85, 1.12);
    muzzle.position.copy(faceDir).multiplyScalar(0.44);
    head.add(muzzle);
    for (const x of [-1, 1]) {
      const ear = part(new THREE.ConeGeometry(headR * 0.2, headR * 0.85, 5), c, 'ear');
      ear.position.set(x * headR * 0.42, headR * 0.95, -headR * 0.15);
      ear.rotation.set(-0.15, 0, -x * 0.18);
      head.add(ear);
    }
    // Forelock.
    const fl = part(new THREE.BoxGeometry(0.1, 0.05, 0.16), uni ? RAINBOW[5] : accent, 'mane', uni);
    fl.position.set(0, headR * 0.82, headR * 0.35);
    fl.rotation.x = 0.5;
    head.add(fl);
  } else {
    const skull = part(new THREE.SphereGeometry(headR, 12, 9), c, 'head');
    skull.scale.set(cat ? 1.06 : 0.95, cat ? 0.9 : 0.9, cat ? 0.92 : 1);
    head.add(skull);
    if (cat) {
      // Round cheeks and a small, neat muzzle.
      for (const x of [-1, 1]) {
        const ch = part(new THREE.SphereGeometry(headR * 0.46, 8, 6), c, 'head');
        ch.position.set(x * headR * 0.42, -headR * 0.28, headR * 0.34);
        head.add(ch);
      }
      const mz = part(new THREE.SphereGeometry(headR * 0.42, 8, 6), light, 'head');
      mz.scale.set(1.25, 0.8, 0.85);
      mz.position.set(0, -headR * 0.32, headR * 0.72);
      head.add(mz);
      for (const x of [-1, 1]) {
        const ear = part(new THREE.ConeGeometry(headR * 0.36, headR * 0.8, 3), c, 'ear');
        ear.position.set(x * headR * 0.56, headR * 0.8, -headR * 0.05);
        ear.rotation.set(0, x * 0.5, -x * 0.25);
        head.add(ear);
        const inner = part(new THREE.ConeGeometry(headR * 0.2, headR * 0.5, 3), '#f2b8c0', 'ear');
        inner.position.set(x * headR * 0.54, headR * 0.76, headR * 0.1);
        inner.rotation.set(0, x * 0.5, -x * 0.25);
        head.add(inner);
      }
    } else {
      // A dog's muzzle with a gentle stop, and soft ears that fold at the tips.
      const len = (dims.snout ?? 0.12) + 0.05;
      head.add(segment(part, new THREE.Vector3(0, -headR * 0.18, headR * 0.45), new THREE.Vector3(0, -headR * 0.34, headR * 0.45 + len), headR * 0.55, headR * 0.42, c, 'head'));
      const tip = part(new THREE.SphereGeometry(headR * 0.44, 8, 6), light, 'head');
      tip.scale.set(1, 0.8, 0.9);
      tip.position.set(0, -headR * 0.36, headR * 0.45 + len);
      head.add(tip);
      for (const x of [-1, 1]) {
        const base = part(new THREE.BoxGeometry(headR * 0.18, headR * 0.55, headR * 0.5), c, 'ear');
        base.position.set(x * headR * 0.62, headR * 0.62, -headR * 0.08);
        base.rotation.z = -x * 0.3;
        head.add(base);
        const fold = part(new THREE.BoxGeometry(headR * 0.16, headR * 0.45, headR * 0.44), accent, 'ear');
        fold.position.set(x * headR * 0.86, headR * 0.5, -headR * 0.02);
        fold.rotation.z = x * 1.1;
        head.add(fold);
      }
    }
  }

  // Tails: a cat's long curl, a dog's plume over the back, a horse's flowing strands.
  const tail = new THREE.Group();
  tail.position.set(0, bodyY + H * (cat ? 0.2 : 0.15), -L * 0.47);
  if (equine) {
    tail.add(segment(part, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.12, -0.16), 0.07, 0.05, c, 'tail'));
    for (let i = 0; i < 7; i++) {
      const col = uni ? RAINBOW[i % RAINBOW.length] : accent;
      const len = 0.75 + (i % 3) * 0.12;
      const g = new THREE.BoxGeometry(0.045, len, 0.06);
      g.translate(0, -len / 2, 0);
      const s = part(g, col, 'tail', uni && i % 2 === 1);
      s.position.set((i - 3) * 0.022, -0.1, -0.16);
      s.rotation.set(-0.35 - (i % 2) * 0.1, 0, (i - 3) * 0.05);
      tail.add(s);
    }
  } else {
    const n = cat ? 9 : 6, segLen = cat ? 0.075 : 0.07;
    let p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      // Cats: back and down, then curling up. Dogs: up and forward over the back.
      const a = cat ? -0.7 + (i / (n - 1)) * 2.3 : 0.5 + (i / (n - 1)) * 1.6;
      const q = p.clone().add(new THREE.Vector3(0, Math.sin(a) * segLen, -Math.cos(a) * segLen));
      const r1 = (cat ? 0.034 : 0.05) * (1 - i / (n * 1.6)), r2 = r1 * 0.9;
      tail.add(segment(part, p, q, r1, r2, i === n - 1 ? light : c, 'tail'));
      if (dog) {
        const fluff = part(new THREE.SphereGeometry(r1 * 1.3, 6, 5), i === n - 1 ? light : c, 'tail');
        fluff.position.copy(q);
        tail.add(fluff);
      }
      p = q;
    }
  }
  body.add(tail);
  return { legs, knees, tail, headBase };
}
