import * as THREE from 'three';
import { animalHeadGap, type Part } from '../characters/anatomy';

/**
 * Real structure for every animal, not blobs: a chest, a barrel and hindquarters; legs that are
 * jointed (shoulder or thigh, knee or hock, then paw, hoof or pad) and bend as they walk; a neck
 * of the right length and angle; a head shaped for its kind (a cat's round skull, a dog's muzzle,
 * a horse's long face, a cow's broad nose, a deer's fine one, an elephant's dome and trunk); and
 * each one's own ears, horns and tail. Birds get a tapered body, folded feathered wings, a fanned
 * tail and jointed legs.
 *
 * The rules hold: no eyes or facial features, and every head floats clear of its neck
 * (animalHeadGap: in proportion to the head) — tests/anatomy.test.ts measures the gap on every species.
 */

export type DetailedId =
  | 'cat' | 'dog' | 'horse' | 'unicorn' | 'donkey' | 'fox' | 'sheep' | 'goat' | 'deer' | 'reindeer'
  | 'cow' | 'buffalo' | 'camel' | 'panda' | 'elephant' | 'rabbit' | 'monkey' | 'orangutan' | 'komodo';
export const DETAILED: readonly DetailedId[] = ['cat', 'dog', 'horse', 'unicorn', 'donkey', 'fox', 'sheep', 'goat', 'deer', 'reindeer', 'cow', 'buffalo', 'camel', 'panda', 'elephant', 'rabbit', 'monkey', 'orangutan', 'komodo'];
export type BirdId = 'duck' | 'crane' | 'peacock' | 'dove' | 'lightbird' | 'eagle';
export const BIRDS: readonly BirdId[] = ['duck', 'crane', 'peacock', 'dove', 'lightbird', 'eagle'];

export interface Built {
  legs: THREE.Group[];
  knees: THREE.Group[];
  tail: THREE.Group;
  headBase: THREE.Vector3;
}

type PartFn = (geo: THREE.BufferGeometry, c: string, p: Part, glow?: boolean) => THREE.Mesh;

type Head = 'equine' | 'feline' | 'canine' | 'vulpine' | 'bovine' | 'cervine' | 'ovine' | 'caprine' | 'camelid' | 'ursine' | 'elephant' | 'leporine' | 'simian' | 'saurian';
type Tail = 'curl' | 'plume' | 'strands' | 'brush' | 'tuft' | 'puff' | 'stub' | 'rope' | 'long' | 'lizard' | 'none';
type Foot = 'paw' | 'hoof' | 'cloven' | 'pad' | 'column';
type Ears = 'pointy' | 'tall' | 'soft' | 'long' | 'round' | 'small' | 'side' | 'fan' | 'cup' | 'none';
type Horns = 'none' | 'unicorn' | 'antlers' | 'spike' | 'curve' | 'bovine' | 'sweep';

interface Profile {
  head: Head; ears: Ears; horns: Horns; tail: Tail; foot: Foot;
  /** Leg thickness (× body width) and resting knee/hock angles. */
  legR: number; knee: [number, number];
  /** Neck: length (m, unscaled; defaults from SPECIES), tilt from vertical, and thickness (× width). */
  neckLen?: number; tilt: number; neckR: number;
  /** Chest, barrel, hips as fractions of the body ellipsoid, and how high the hips sit. */
  hips: number; chest: number;
  mane?: boolean; bib?: boolean; hump?: boolean; wool?: boolean; trunk?: boolean;
  /** Legs splayed out to the sides (a lizard's sprawl), radians. */
  sprawl?: number;
  /** Long shaggy hair hanging from the flanks and forelegs (an orangutan's). */
  shag?: boolean;
}

const P: Record<DetailedId, Profile> = {
  cat: { head: 'feline', ears: 'pointy', horns: 'none', tail: 'curl', foot: 'paw', legR: 0.15, knee: [0.06, 0.78], neckLen: 0.1, tilt: 0.85, neckR: 0.34, hips: 0.08, chest: 0.98, bib: true },
  dog: { head: 'canine', ears: 'soft', horns: 'none', tail: 'plume', foot: 'paw', legR: 0.15, knee: [0.06, 0.78], neckLen: 0.16, tilt: 0.85, neckR: 0.36, hips: 0, chest: 1, bib: true },
  fox: { head: 'vulpine', ears: 'tall', horns: 'none', tail: 'brush', foot: 'paw', legR: 0.13, knee: [0.06, 0.8], neckLen: 0.14, tilt: 0.8, neckR: 0.34, hips: 0.02, chest: 0.95, bib: true },
  horse: { head: 'equine', ears: 'pointy', horns: 'none', tail: 'strands', foot: 'hoof', legR: 0.12, knee: [0.06, 0.78], tilt: 0.5, neckR: 0.3, hips: 0.01, chest: 0.98, mane: true },
  unicorn: { head: 'equine', ears: 'pointy', horns: 'unicorn', tail: 'strands', foot: 'hoof', legR: 0.12, knee: [0.06, 0.78], tilt: 0.5, neckR: 0.3, hips: 0.01, chest: 0.98, mane: true },
  donkey: { head: 'equine', ears: 'long', horns: 'none', tail: 'tuft', foot: 'hoof', legR: 0.13, knee: [0.05, 0.7], tilt: 0.6, neckR: 0.32, hips: 0.03, chest: 0.95, mane: true },
  sheep: { head: 'ovine', ears: 'side', horns: 'none', tail: 'stub', foot: 'cloven', legR: 0.1, knee: [0.04, 0.6], neckLen: 0.14, tilt: 0.9, neckR: 0.34, hips: 0, chest: 1, wool: true },
  goat: { head: 'caprine', ears: 'side', horns: 'sweep', tail: 'stub', foot: 'cloven', legR: 0.1, knee: [0.05, 0.7], neckLen: 0.2, tilt: 0.7, neckR: 0.3, hips: 0.04, chest: 0.95 },
  deer: { head: 'cervine', ears: 'tall', horns: 'spike', tail: 'stub', foot: 'cloven', legR: 0.09, knee: [0.06, 0.82], tilt: 0.45, neckR: 0.28, hips: 0.05, chest: 0.95, bib: true },
  reindeer: { head: 'cervine', ears: 'small', horns: 'antlers', tail: 'stub', foot: 'cloven', legR: 0.11, knee: [0.06, 0.75], tilt: 0.55, neckR: 0.32, hips: 0.02, chest: 1, bib: true },
  cow: { head: 'bovine', ears: 'side', horns: 'bovine', tail: 'rope', foot: 'cloven', legR: 0.12, knee: [0.04, 0.6], neckLen: 0.22, tilt: 1.1, neckR: 0.38, hips: 0.02, chest: 1 },
  buffalo: { head: 'bovine', ears: 'side', horns: 'curve', tail: 'rope', foot: 'cloven', legR: 0.13, knee: [0.04, 0.55], neckLen: 0.2, tilt: 1.15, neckR: 0.4, hips: 0, chest: 1.05 },
  camel: { head: 'camelid', ears: 'small', horns: 'none', tail: 'rope', foot: 'pad', legR: 0.1, knee: [0.05, 0.7], tilt: 0.35, neckR: 0.22, hips: 0.02, chest: 0.95, hump: true },
  panda: { head: 'ursine', ears: 'round', horns: 'none', tail: 'stub', foot: 'column', legR: 0.2, knee: [0.02, 0.2], neckLen: 0.12, tilt: 1.0, neckR: 0.4, hips: 0.02, chest: 1 },
  elephant: { head: 'elephant', ears: 'fan', horns: 'none', tail: 'rope', foot: 'column', legR: 0.16, knee: [0.02, 0.15], neckLen: 0.2, tilt: 1.2, neckR: 0.36, hips: 0.02, chest: 1, trunk: true },
  rabbit: { head: 'leporine', ears: 'long', horns: 'none', tail: 'puff', foot: 'paw', legR: 0.16, knee: [0.1, 1.2], neckLen: 0.06, tilt: 0.6, neckR: 0.4, hips: 0.12, chest: 0.9 },
  // Monkeys go on all fours with the tail curled up behind; the great ape leans on long arms under a
  // shaggy coat; the Komodo dragon sprawls low with its long tail along the ground.
  monkey: { head: 'simian', ears: 'cup', horns: 'none', tail: 'long', foot: 'paw', legR: 0.14, knee: [0.1, 0.85], neckLen: 0.06, tilt: 0.75, neckR: 0.4, hips: 0.1, chest: 0.95 },
  orangutan: { head: 'simian', ears: 'none', horns: 'none', tail: 'none', foot: 'paw', legR: 0.2, knee: [0.04, 0.45], neckLen: 0.08, tilt: 0.9, neckR: 0.45, hips: -0.08, chest: 1.08, shag: true },
  komodo: { head: 'saurian', ears: 'none', horns: 'none', tail: 'lizard', foot: 'paw', legR: 0.22, knee: [0.35, 1.0], neckLen: 0.14, tilt: 1.25, neckR: 0.46, hips: 0, chest: 0.92, sprawl: 0.75 },
};

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

const tone = (c: string, to: string, k: number) => '#' + new THREE.Color(c).lerp(new THREE.Color(to), k).getHexString();

export function buildDetailed(
  id: DetailedId, part: PartFn, body: THREE.Group, head: THREE.Group,
  dims: { L: number; H: number; W: number; bodyY: number; headR: number; neck?: number; snout?: number },
  c: string, accent: string, opts: { noHorns?: boolean } = {},
): Built {
  const pf = P[id];
  const { L, H, W, bodyY, headR } = dims;
  const equine = pf.head === 'equine', uni = id === 'unicorn';
  const light = tone(c, '#fbf6ee', 0.72), dark = tone(c, '#1a1410', 0.45);
  const ell = (sc: [number, number, number], p: [number, number, number], col = c, pt: Part = 'body') => {
    const m = part(new THREE.SphereGeometry(0.5, 14, 10), col, pt);
    m.scale.set(...sc);
    m.position.set(...p);
    body.add(m);
    return m;
  };

  // Torso: chest, barrel and hindquarters.
  ell([W * 0.92 * pf.chest, H * 0.98, L * 0.5], [0, bodyY + (equine ? 0.03 : 0), L * 0.22]);
  ell([W * 0.86, H * 0.86, L * 0.64], [0, bodyY - H * 0.03, 0]);
  ell([W * 0.98, H * 0.95, L * 0.48], [0, bodyY + H * pf.hips, -L * 0.25]);
  if (equine || pf.head === 'cervine') ell([W * 0.5, H * 0.32, L * 0.24], [0, bodyY + H * 0.4, L * 0.18]); // withers
  if (pf.bib) ell([W * 0.72, H * 0.72, L * 0.26], [0, bodyY - H * 0.06, L * 0.39], id === 'fox' || id === 'deer' || id === 'reindeer' ? light : light);
  if (pf.head === 'bovine') ell([W * 0.4, H * 0.5, L * 0.3], [0, bodyY - H * 0.42, L * 0.33], c); // dewlap and brisket
  if (pf.hump) {
    ell([W * 0.6, H * 0.62, L * 0.34], [0, bodyY + H * 0.52, -L * 0.02]);
    ell([W * 0.35, H * 0.3, L * 0.2], [0, bodyY + H * 0.82, -L * 0.02], tone(c, '#ffffff', 0.1));
  }
  if (pf.wool) for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2, row = i % 2;
    ell([H * 0.4, H * 0.38, H * 0.4], [Math.cos(a) * W * 0.36, bodyY + H * (0.18 + row * 0.18) + Math.sin(a) * H * 0.12, ((i % 7) / 6 - 0.5) * L * 0.8], tone(c, '#ffffff', 0.25));
  }
  if (id === 'panda') {
    // Black shoulders and legs: pandas get their colour from the body, never eye patches.
    ell([W * 1.02, H * 0.5, L * 0.3], [0, bodyY + H * 0.1, L * 0.2], accent);
  }

  // Legs: hip → upper leg → knee (hock behind) → lower leg → foot.
  const legs: THREE.Group[] = [], knees: THREE.Group[] = [];
  const hipY = bodyY - H * 0.2, legR = W * pf.legR;
  const legCol = id === 'panda' ? accent : id === 'deer' || id === 'reindeer' ? tone(c, '#3a2a1a', 0.15) : c;
  for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]] as const) {
    const front = z > 0;
    const hop = id === 'rabbit' && !front;
    const a0 = front ? pf.knee[0] : -pf.knee[1] * 0.55, a1 = front ? -pf.knee[0] * 1.6 : pf.knee[1];
    const spr = pf.sprawl ?? 0;
    const seg = hipY / ((Math.cos(a0) + Math.cos(a0 + a1)) * Math.cos(spr));
    const hip = new THREE.Group();
    hip.position.set(x * W * (spr ? 0.42 : 0.3), hipY, z * L * (front ? 0.33 : 0.3));
    hip.rotation.x = a0;
    hip.rotation.z = x * spr;
    hip.userData.base = a0;
    const up = new THREE.CylinderGeometry(legR * 0.8, legR * (front ? 1.25 : 1.55), seg, 7);
    up.translate(0, -seg / 2, 0);
    hip.add(part(up, legCol, 'leg'));
    if (!front) {
      const thigh = part(new THREE.SphereGeometry(legR * (hop ? 2.4 : 1.7), 8, 6), c, 'leg');
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
    knee.add(part(new THREE.SphereGeometry(legR * 0.85, 7, 5), legCol, 'leg'));
    const lo = new THREE.CylinderGeometry(legR * (pf.foot === 'column' ? 0.95 : 0.6), legR * 0.8, seg, 7);
    lo.translate(0, -seg / 2, 0);
    knee.add(part(lo, legCol, 'leg'));
    const foot = new THREE.Group();
    foot.position.y = -seg;
    foot.rotation.x = -(a0 + a1);
    foot.rotation.z = -x * (pf.sprawl ?? 0);
    knee.add(foot);
    if (pf.foot === 'hoof' || pf.foot === 'cloven') {
      if (uni) {
        const tuft = part(new THREE.SphereGeometry(legR * 1.2, 7, 5), '#ffffff', 'leg');
        tuft.scale.set(1, 1.35, 1);
        tuft.position.y = 0.13;
        foot.add(tuft);
      }
      if (pf.foot === 'cloven') {
        for (const s of [-1, 1]) {
          const h = part(new THREE.CylinderGeometry(legR * 0.4, legR * 0.5, 0.07, 6), dark, 'hoof');
          h.position.set(s * legR * 0.35, 0.035, legR * 0.1);
          foot.add(h);
        }
      } else {
        const hoof = part(new THREE.CylinderGeometry(legR * 0.78, legR * 1.0, 0.1, 8), uni ? '#e2c46a' : accent, 'hoof', uni);
        hoof.position.y = 0.05;
        foot.add(hoof);
      }
    } else if (pf.foot === 'column' || pf.foot === 'pad') {
      const pad = part(new THREE.CylinderGeometry(legR * 1.0, legR * 1.15, 0.08, 9), pf.foot === 'pad' ? tone(c, '#3a2a1a', 0.3) : tone(c, '#ffffff', 0.15), 'foot');
      pad.position.y = 0.04;
      foot.add(pad);
    } else {
      const paw = part(new THREE.SphereGeometry(legR * 1.05, 8, 6), pf.bib ? light : c, 'foot');
      paw.scale.set(1, 0.55, hop ? 2.2 : 1.35);
      paw.position.set(0, legR * 0.45, legR * (hop ? 1.2 : 0.35));
      foot.add(paw);
    }
    if (pf.shag && front) for (let k = 0; k < 4; k++) {
      // Long hair hanging from the forearm.
      const len = seg * (0.5 + (k % 2) * 0.15), g = new THREE.BoxGeometry(legR * 0.5, len, legR * 0.35);
      g.translate(0, -len / 2, 0);
      const h = part(g, tone(c, '#3a1a0a', 0.15), 'leg');
      h.position.set(x * legR * 0.9, -seg * 0.15, (k - 1.5) * legR * 0.5);
      h.rotation.z = x * 0.18;
      hip.add(h);
    }
    body.add(hip);
    legs.push(hip);
    knees.push(knee);
  }
  if (pf.shag) for (let k = 0; k < 18; k++) {
    // The flanks' long coat, in hanging locks.
    const x = k % 2 ? 1 : -1, zz = (Math.floor(k / 2) / 8 - 0.5) * L * 0.8, len = H * (0.55 + (k % 3) * 0.12);
    const g = new THREE.BoxGeometry(W * 0.08, len, L * 0.09);
    g.translate(0, -len / 2, 0);
    const h = part(g, k % 3 ? c : tone(c, '#3a1a0a', 0.2), 'body');
    h.position.set(x * W * 0.4, bodyY + H * 0.05, zz);
    h.rotation.z = x * 0.22;
    body.add(h);
  }

  // Neck.
  const neckLen = pf.neckLen ?? dims.neck ?? 0.3;
  const tilt = pf.tilt;
  const ng = new THREE.CylinderGeometry(W * pf.neckR * 0.7, W * pf.neckR * 1.2, neckLen, 9);
  ng.translate(0, neckLen / 2, 0);
  const neck = part(ng, c, 'neck');
  neck.position.set(0, bodyY + H * (equine || id === 'camel' ? 0.22 : 0.18), L * (equine ? 0.36 : 0.4));
  neck.rotation.x = tilt;
  body.add(neck);
  if (id === 'camel') {
    // The camel's neck dips down and curves up again: a second bend below the head.
    const bend = part(new THREE.SphereGeometry(W * pf.neckR * 0.8, 8, 6), c, 'neck');
    bend.position.copy(new THREE.Vector3(0, neckLen * 0.5, 0).applyEuler(neck.rotation).add(neck.position));
    body.add(bend);
  }
  if (pf.mane) {
    const crest = part(new THREE.SphereGeometry(0.5, 10, 8), c, 'neck');
    crest.scale.set(W * 0.34, neckLen * 0.78, W * 0.42);
    crest.position.copy(new THREE.Vector3(0, neckLen * 0.42, -W * 0.08).applyEuler(neck.rotation).add(neck.position));
    crest.rotation.x = tilt;
    body.add(crest);
    for (let i = 0; i < 10; i++) {
      const col = uni ? RAINBOW[i % RAINBOW.length] : id === 'donkey' ? dark : accent;
      const m = part(new THREE.BoxGeometry(0.05, (id === 'donkey' ? 0.12 : 0.22) + (i % 3) * 0.04, 0.11), col, 'mane', uni && i % 2 === 0);
      m.position.copy(new THREE.Vector3(Math.sin(i * 1.7) * 0.02, neckLen * (i / 11) - 0.05, -W * 0.3).applyEuler(neck.rotation).add(neck.position));
      m.rotation.set(tilt + 0.25, 0, Math.sin(i * 2.1) * 0.25);
      body.add(m);
    }
  }
  if (id === 'reindeer' || id === 'goat' || id === 'buffalo') {
    // A shaggy ruff under the neck (reindeer), a goat's neck tassels, a buffalo's heavy crest.
    const r = part(new THREE.SphereGeometry(0.5, 8, 6), id === 'reindeer' ? light : c, 'neck');
    r.scale.set(W * 0.5, neckLen * 0.7, W * 0.45);
    r.position.copy(new THREE.Vector3(0, neckLen * 0.35, W * 0.1).applyEuler(neck.rotation).add(neck.position));
    body.add(r);
  }
  const anchor = new THREE.Vector3(0, neckLen, 0).applyEuler(neck.rotation).add(neck.position);
  const dir = new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt));
  // The head floats clear of the neck: out along it and lifted a little, so there is air under the jaw too.
  const headBase = anchor.clone().addScaledVector(dir, animalHeadGap(headR) + headR).add(new THREE.Vector3(0, headR * 0.15, 0));

  buildHead(pf, id, part, head, headR, c, accent, light, dims.snout ?? 0.12, opts.noHorns);

  // Tails.
  const tail = new THREE.Group();
  tail.position.set(0, bodyY + H * (id === 'cat' ? 0.2 : 0.15), -L * 0.47);
  const chain = (n: number, segLen: number, r0: number, angle: (k: number) => number, tip: string, fluff = 0) => {
    let p = new THREE.Vector3();
    for (let i = 0; i < n; i++) {
      const a = angle(i / (n - 1));
      const q = p.clone().add(new THREE.Vector3(0, Math.sin(a) * segLen, -Math.cos(a) * segLen));
      const r1 = r0 * (1 - i / (n * 1.6)), r2 = r1 * 0.9;
      tail.add(segment(part, p, q, r1, r2, i >= n - 2 ? tip : c, 'tail'));
      if (fluff) {
        const f = part(new THREE.SphereGeometry(r1 * fluff, 6, 5), i >= n - 2 ? tip : c, 'tail');
        f.position.copy(q);
        tail.add(f);
      }
      p = q;
    }
  };
  switch (pf.tail) {
    case 'strands':
    case 'tuft': {
      tail.add(segment(part, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, -0.12, -0.16), 0.07, 0.05, c, 'tail'));
      const n = pf.tail === 'tuft' ? 4 : 7;
      for (let i = 0; i < n; i++) {
        const col = uni ? RAINBOW[i % RAINBOW.length] : id === 'donkey' ? dark : accent;
        const len = (pf.tail === 'tuft' ? 0.45 : 0.75) + (i % 3) * 0.12;
        const g = new THREE.BoxGeometry(0.045, len, 0.06);
        g.translate(0, -len / 2, 0);
        const s = part(g, col, 'tail', uni && i % 2 === 1);
        s.position.set((i - n / 2) * 0.022, -0.1, -0.16);
        s.rotation.set(-0.35 - (i % 2) * 0.1, 0, (i - n / 2) * 0.05);
        tail.add(s);
      }
      break;
    }
    case 'curl': chain(9, 0.075, 0.034, (k) => -0.7 + k * 2.3, light); break;
    case 'plume': chain(6, 0.07, 0.05, (k) => 0.5 + k * 1.6, light, 1.3); break;
    case 'brush': chain(7, 0.085, 0.07, (k) => -0.9 + k * 0.9, '#ffffff', 1.6); break;
    case 'rope': {
      chain(5, (id === 'elephant' ? 0.14 : 0.1), 0.03, () => -1.4, c);
      const tuft = part(new THREE.SphereGeometry(0.06, 6, 5), accent, 'tail');
      tuft.scale.set(1, 1.6, 1);
      tuft.position.set(0, -(id === 'elephant' ? 0.68 : 0.49), -0.08);
      tail.add(tuft);
      break;
    }
    case 'long': chain(12, 0.085, 0.032, (k) => -0.35 + k * 2.9, c); break; // curling up in a question mark
    case 'lizard': chain(10, L * 0.11, W * 0.3, (k) => -0.28 + k * 0.22, c); break; // thick, low, tapering
    case 'none': break;
    case 'puff': {
      const puff = part(new THREE.SphereGeometry(0.08, 7, 6), '#ffffff', 'tail');
      puff.position.set(0, 0.04, -0.04);
      tail.add(puff);
      break;
    }
    case 'stub':
    default: {
      const stub = part(new THREE.SphereGeometry(0.06, 6, 5), id === 'deer' ? '#ffffff' : c, 'tail');
      stub.scale.set(0.8, 1.3, 1);
      stub.position.set(0, -0.02, -0.03);
      tail.add(stub);
    }
  }
  body.add(tail);
  return { legs, knees, tail, headBase };
}

function buildHead(pf: Profile, id: DetailedId, part: PartFn, head: THREE.Group, headR: number, c: string, accent: string, light: string, snout: number, noHorns = false): void {
  const add = (m: THREE.Mesh) => { head.add(m); return m; };
  const sph = (r: number, col: string, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, p: Part = 'head') => {
    const m = part(new THREE.SphereGeometry(r, 10, 8), col, p);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    return add(m);
  };
  const face = (dirY: number, len: number, r0: number, r1: number, col = c) => {
    const d = new THREE.Vector3(0, -Math.sin(dirY), Math.cos(dirY));
    add(segment(part, new THREE.Vector3(0, 0, headR * 0.2), d.clone().multiplyScalar(len), r0, r1, col, 'head'));
    return d;
  };
  switch (pf.head) {
    case 'equine': {
      sph(headR, c, 0, 0, 0, 0.9, 0.95, 1);
      const d = face(0.95, 0.42 * (id === 'donkey' ? 0.85 : 1), headR * 0.8, headR * 0.55);
      sph(headR * 0.6, id === 'donkey' ? light : c, d.x * 0.44, d.y * 0.44, d.z * 0.44, 1, 0.85, 1.12);
      if (id !== 'donkey') {
        const fl = part(new THREE.BoxGeometry(0.1, 0.05, 0.16), id === 'unicorn' ? RAINBOW[5] : accent, 'mane', id === 'unicorn');
        fl.position.set(0, headR * 0.82, headR * 0.35);
        fl.rotation.x = 0.5;
        add(fl);
      }
      break;
    }
    case 'feline':
      sph(headR, c, 0, 0, 0, 1.06, 0.9, 0.92);
      for (const x of [-1, 1]) sph(headR * 0.46, c, x * headR * 0.42, -headR * 0.28, headR * 0.34);
      sph(headR * 0.42, light, 0, -headR * 0.32, headR * 0.72, 1.25, 0.8, 0.85);
      break;
    case 'canine':
    case 'vulpine': {
      sph(headR, c, 0, 0, 0, 0.95, 0.9, 1);
      const len = snout + (pf.head === 'vulpine' ? 0.1 : 0.05);
      add(segment(part, new THREE.Vector3(0, -headR * 0.18, headR * 0.45), new THREE.Vector3(0, -headR * 0.34, headR * 0.45 + len), headR * 0.55, headR * (pf.head === 'vulpine' ? 0.28 : 0.42), c, 'head'));
      sph(headR * (pf.head === 'vulpine' ? 0.3 : 0.44), pf.head === 'vulpine' ? '#2a2020' : light, 0, -headR * 0.36, headR * 0.45 + len, 1, 0.8, 0.9);
      if (pf.head === 'vulpine') for (const x of [-1, 1]) sph(headR * 0.4, light, x * headR * 0.45, -headR * 0.35, headR * 0.3);
      break;
    }
    case 'bovine': {
      sph(headR, c, 0, 0, 0, 1, 0.95, 1.05);
      const d = face(1.05, headR * 1.3, headR * 0.85, headR * 0.72);
      sph(headR * 0.62, tone(c, '#f2c8b8', 0.55), d.x * headR * 1.35, d.y * headR * 1.35, d.z * headR * 1.35, 1.25, 0.8, 0.8);
      sph(headR * 0.35, accent, 0, headR * 0.75, -headR * 0.1, 1.4, 0.6, 0.9); // the poll tuft
      break;
    }
    case 'cervine': {
      sph(headR, c, 0, 0, 0, 0.85, 0.9, 1);
      const d = face(0.85, headR * 1.8, headR * 0.7, headR * 0.35);
      sph(headR * 0.36, '#2a2020', d.x * headR * 1.85, d.y * headR * 1.85, d.z * headR * 1.85, 1, 0.8, 1);
      sph(headR * 0.4, light, 0, -headR * 0.5, headR * 0.3, 1, 0.6, 1.2); // pale throat patch
      break;
    }
    case 'ovine':
    case 'caprine': {
      sph(headR, pf.head === 'ovine' ? accent : c, 0, 0, 0, 0.8, 0.95, 1.05);
      const d = face(0.95, headR * 1.3, headR * 0.6, headR * 0.4, pf.head === 'ovine' ? accent : c);
      sph(headR * 0.4, pf.head === 'ovine' ? accent : light, d.x * headR * 1.3, d.y * headR * 1.3, d.z * headR * 1.3);
      if (pf.head === 'ovine') sph(headR * 0.7, tone(c, '#ffffff', 0.3), 0, headR * 0.65, -headR * 0.1, 1.2, 0.7, 1.1); // a woolly topknot
      break;
    }
    case 'camelid': {
      sph(headR, c, 0, 0, 0, 0.85, 0.9, 1.05);
      const d = face(0.35, headR * 2, headR * 0.7, headR * 0.55);
      sph(headR * 0.62, tone(c, '#ffffff', 0.1), d.x * headR * 2, d.y * headR * 2, d.z * headR * 2, 1, 0.9, 1.1);
      break;
    }
    case 'ursine':
      sph(headR, c, 0, 0, 0, 1.08, 0.95, 0.95);
      sph(headR * 0.5, c, 0, -headR * 0.3, headR * 0.72, 1.1, 0.8, 0.9);
      sph(headR * 0.15, '#1f1f24', 0, -headR * 0.2, headR * 1.12, 1.3, 0.8, 0.8, 'head'); // the nose leather (not a face)
      break;
    case 'elephant': {
      sph(headR, c, 0, 0, 0, 0.95, 1.05, 0.9);
      sph(headR * 0.5, c, 0, headR * 0.5, headR * 0.1, 1.5, 0.8, 1); // the domed brow
      // A trunk in segments, curling forward at the tip; tusks either side.
      let p = new THREE.Vector3(0, -headR * 0.35, headR * 0.7);
      for (let i = 0; i < 7; i++) {
        const a = 0.15 + i * 0.12 - (i > 4 ? (i - 4) * 0.5 : 0);
        const q = p.clone().add(new THREE.Vector3(0, -Math.cos(a) * 0.2, Math.sin(a) * 0.2));
        add(segment(part, p, q, 0.13 - i * 0.012, 0.12 - i * 0.012, c, 'head'));
        p = q;
      }
      for (const x of [-1, 1]) {
        const t = part(new THREE.ConeGeometry(0.05, 0.45, 6), '#fbf6ea', 'horn');
        t.position.set(x * headR * 0.38, -headR * 0.6, headR * 0.75);
        t.rotation.x = 2.1;
        add(t);
      }
      break;
    }
    case 'leporine':
      sph(headR, c, 0, 0, 0, 0.9, 0.95, 1.1);
      sph(headR * 0.5, light, 0, -headR * 0.35, headR * 0.72, 1.2, 0.8, 0.8);
      break;
    case 'simian':
      // A round cranium and a short, rounded muzzle (no brow line: nothing that reads as eyes);
      // the great ape's broad crown and heavy jowl.
      sph(headR, c, 0, 0, 0, 1, 1.02, 0.95);
      sph(headR * 0.52, tone(accent, c, 0.35), 0, -headR * 0.3, headR * 0.62, 1.15, 0.85, 0.75);
      if (id === 'orangutan') {
        sph(headR * 0.7, c, 0, headR * 0.5, -headR * 0.1, 1.4, 0.5, 1.1);
        sph(headR * 0.6, c, 0, -headR * 0.62, headR * 0.2, 1.3, 0.6, 1);
      }
      break;
    case 'saurian': {
      // A long, flat reptile skull tapering to a blunt snout, a heavy jowl under it.
      sph(headR, c, 0, 0, 0, 0.9, 0.62, 1.25);
      add(segment(part, new THREE.Vector3(0, -headR * 0.05, headR * 0.6), new THREE.Vector3(0, -headR * 0.18, headR * 0.6 + snout + headR), headR * 0.62, headR * 0.34, c, 'head'));
      sph(headR * 0.7, tone(c, '#d8d0b0', 0.2), 0, -headR * 0.42, headR * 0.35, 0.95, 0.5, 1.2);
      break;
    }
  }

  // Ears.
  for (const x of [-1, 1]) {
    let e: THREE.Mesh;
    switch (pf.ears) {
      case 'pointy':
        e = part(new THREE.ConeGeometry(headR * (pf.head === 'feline' ? 0.36 : 0.2), headR * (pf.head === 'feline' ? 0.8 : 0.85), pf.head === 'feline' ? 3 : 5), c, 'ear');
        e.position.set(x * headR * (pf.head === 'feline' ? 0.56 : 0.42), headR * 0.9, pf.head === 'feline' ? -headR * 0.05 : -headR * 0.15);
        e.rotation.set(-0.15, pf.head === 'feline' ? x * 0.5 : 0, -x * 0.22);
        if (pf.head === 'feline') {
          const inner = part(new THREE.ConeGeometry(headR * 0.2, headR * 0.5, 3), '#f2b8c0', 'ear');
          inner.position.set(x * headR * 0.54, headR * 0.76, headR * 0.1);
          inner.rotation.set(0, x * 0.5, -x * 0.25);
          add(inner);
        }
        break;
      case 'tall':
        e = part(new THREE.ConeGeometry(headR * 0.3, headR * 1.3, 4), pf.head === 'vulpine' ? c : c, 'ear');
        e.position.set(x * headR * 0.5, headR * 1.05, -headR * 0.1);
        e.rotation.set(-0.1, 0, -x * 0.35);
        if (pf.head === 'vulpine') { const tip = part(new THREE.ConeGeometry(headR * 0.12, headR * 0.4, 4), '#2a2020', 'ear'); tip.position.set(x * headR * 0.65, headR * 1.6, -headR * 0.1); tip.rotation.z = -x * 0.35; add(tip); }
        break;
      case 'soft': {
        const base = part(new THREE.BoxGeometry(headR * 0.18, headR * 0.55, headR * 0.5), c, 'ear');
        base.position.set(x * headR * 0.62, headR * 0.62, -headR * 0.08);
        base.rotation.z = -x * 0.3;
        add(base);
        e = part(new THREE.BoxGeometry(headR * 0.16, headR * 0.45, headR * 0.44), accent, 'ear');
        e.position.set(x * headR * 0.86, headR * 0.5, -headR * 0.02);
        e.rotation.z = x * 1.1;
        break;
      }
      case 'long':
        e = part(new THREE.CapsuleGeometry(headR * 0.16, headR * (id === 'rabbit' ? 1.6 : 1.2), 3, 6), c, 'ear');
        e.position.set(x * headR * 0.35, headR * (id === 'rabbit' ? 1.45 : 1.15), -headR * 0.2);
        e.rotation.set(-0.2, 0, -x * 0.18);
        e.scale.set(1.3, 1, 0.55);
        break;
      case 'round':
        e = part(new THREE.SphereGeometry(headR * 0.3, 7, 5), id === 'panda' ? accent : c, 'ear');
        e.position.set(x * headR * 0.62, headR * 0.78, -headR * 0.1);
        e.scale.set(1, 1, 0.55);
        break;
      case 'fan':
        e = part(new THREE.SphereGeometry(headR * 0.95, 9, 7), tone(c, '#ffffff', 0.08), 'ear');
        e.scale.set(0.16, 1.05, 0.9);
        e.position.set(x * headR * 1.05, 0.02, -headR * 0.2);
        e.rotation.y = x * 0.35;
        break;
      case 'side':
        e = part(new THREE.SphereGeometry(headR * 0.3, 7, 5), c, 'ear');
        e.scale.set(1.6, 0.45, 0.8);
        e.position.set(x * headR * 0.9, headR * 0.35, -headR * 0.1);
        e.rotation.z = -x * 0.35;
        break;
      case 'cup':
        e = part(new THREE.SphereGeometry(headR * 0.3, 7, 5), accent, 'ear');
        e.scale.set(0.4, 1, 0.85);
        e.position.set(x * headR * 0.98, headR * 0.1, -headR * 0.08);
        break;
      case 'none':
        continue;
      case 'small':
      default:
        e = part(new THREE.SphereGeometry(headR * 0.22, 5, 4), c, 'ear');
        e.position.set(x * headR * 0.55, headR * 0.8, -headR * 0.1);
    }
    add(e);
  }

  // Horns and antlers.
  const horn = (col: string, from: THREE.Vector3, pts: Array<[number, number, number]>, r: number) => {
    let a = from.clone();
    pts.forEach(([dx, dy, dz], i) => {
      const b = a.clone().add(new THREE.Vector3(dx, dy, dz));
      add(segment(part, a, b, r * (1 - i * 0.2), r * (1 - (i + 1) * 0.2), col, 'horn'));
      a = b;
    });
  };
  if (noHorns) return;
  for (const x of [-1, 1]) {
    const base = new THREE.Vector3(x * headR * 0.45, headR * 0.8, -headR * 0.15);
    if (pf.horns === 'spike') horn('#c9b08a', base, [[x * 0.02, 0.1, 0], [0, 0.08, 0.02]], 0.02);
    if (pf.horns === 'sweep') horn('#d9d0bc', base, [[x * 0.03, 0.12, -0.04], [x * 0.05, 0.08, -0.1], [x * 0.04, -0.02, -0.1]], 0.03);
    if (pf.horns === 'bovine') horn('#e8e0cc', base, [[x * 0.12, 0.04, 0], [x * 0.06, 0.08, 0.02]], 0.035);
    if (pf.horns === 'curve') horn('#3a3a3a', base, [[x * 0.18, 0.02, -0.05], [x * 0.1, 0.1, -0.12], [x * -0.04, 0.08, -0.1]], 0.05);
    if (pf.horns === 'antlers') {
      horn('#c9b08a', base, [[x * 0.08, 0.2, -0.05], [x * 0.08, 0.2, 0], [x * 0.05, 0.18, 0.06]], 0.03);
      for (let i = 0; i < 3; i++) horn('#c9b08a', base.clone().add(new THREE.Vector3(x * (0.06 + i * 0.07), 0.16 + i * 0.18, -0.03)), [[x * 0.02, 0.1, 0.1]], 0.018);
    }
  }
  if (pf.horns === 'unicorn') {
    // A spiralled horn: a glowing cone wound with a golden thread.
    const h = part(new THREE.ConeGeometry(0.05, 0.5, 8), '#ffe89a', 'horn', true);
    h.position.set(0, headR * 1.25, headR * 0.55);
    h.rotation.x = 0.45;
    add(h);
    for (let i = 0; i < 5; i++) {
      const ring = part(new THREE.TorusGeometry(0.045 - i * 0.008, 0.008, 4, 10), '#fff6d0', 'horn', true);
      ring.position.set(0, headR * 1.25 + Math.cos(0.45) * (-0.18 + i * 0.09), headR * 0.55 + Math.sin(0.45) * (-0.18 + i * 0.09));
      ring.rotation.x = 0.45 + Math.PI / 2;
      add(ring);
    }
  }
}

/**
 * Birds: a tapered body, a breast, folded wings of layered feathers, a fanned or pointed tail,
 * jointed legs with feet, and a beak on the floating head (the beak is the bird's mouth-part of
 * the head shape, like a muzzle — no eyes).
 */
export function buildBird(
  id: BirdId, part: PartFn, body: THREE.Group, head: THREE.Group,
  dims: { L: number; H: number; W: number; bodyY: number; headR: number; neck?: number; leg: number },
  c: string, accent: string, glow: boolean,
): Built & { wings: THREE.Group[] } {
  const { L, H, W, bodyY, headR } = dims;
  const breast = tone(c, '#ffffff', id === 'dove' ? 0.25 : 0.12);
  const ell = (sc: [number, number, number], p: [number, number, number], col = c, pt: Part = 'body') => {
    const m = part(new THREE.SphereGeometry(0.5, 12, 9), col, pt, glow);
    m.scale.set(...sc);
    m.position.set(...p);
    body.add(m);
    return m;
  };
  ell([W, H, L * 0.7], [0, bodyY, 0]);
  ell([W * 0.85, H * 0.85, L * 0.45], [0, bodyY - H * 0.05, L * 0.22], breast);
  ell([W * 0.6, H * 0.5, L * 0.5], [0, bodyY + H * 0.05, -L * 0.3]);
  // Folded wings: three layers of feathers each side, primaries longest.
  const wings: THREE.Group[] = [];
  for (const x of [-1, 1]) {
    const w = new THREE.Group();
    w.position.set(x * W * 0.45, bodyY + H * 0.18, L * 0.15);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 4; i++) {
      const len = L * (0.35 + r * 0.18) * (id === 'eagle' ? 1 + r * 0.18 : 1) - i * 0.02;
      const f = part(new THREE.BoxGeometry(0.02, H * 0.2, len).translate(0, 0, -len / 2), r === 2 ? (id === 'peacock' ? '#2f6a9a' : accent) : r === 1 ? c : tone(c, '#ffffff', 0.15), 'wing', glow);
      f.position.set(x * 0.005 * r, -r * H * 0.12 - i * 0.01, -i * 0.02);
      f.rotation.set(-0.08 - r * 0.05, 0, x * (0.06 + i * 0.02));
      w.add(f);
    }
    body.add(w);
    wings.push(w);
  }
  // Legs: thigh, a backward-bending ankle, and three toes forward.
  const legs: THREE.Group[] = [], knees: THREE.Group[] = [];
  const legCol = id === 'crane' ? '#3a3a3a' : id === 'eagle' ? '#e8b83a' : '#e0a040';
  for (const x of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(x * W * 0.2, bodyY - H * 0.3, 0.02);
    const lh = Math.max(0.05, dims.leg * 0.55 + H * 0.2);
    hip.add(part(new THREE.CylinderGeometry(0.018, 0.022, lh, 5).translate(0, -lh / 2, 0), legCol, 'leg'));
    const knee = new THREE.Group();
    knee.position.y = -lh;
    knee.userData.base = 0;
    knee.userData.front = false;
    const low = Math.max(0.04, bodyY - H * 0.3 - lh);
    knee.add(part(new THREE.CylinderGeometry(0.014, 0.018, low, 5).translate(0, -low / 2, 0), legCol, 'leg'));
    for (const a of [-0.5, 0, 0.5]) {
      const toe = part(new THREE.BoxGeometry(0.015, 0.012, 0.09).translate(0, 0, 0.045), legCol, 'foot');
      toe.position.set(0, -low + 0.006, 0);
      toe.rotation.y = a;
      knee.add(toe);
      if (id === 'eagle') {
        // A dark curved talon at each toe's end.
        const talon = part(new THREE.ConeGeometry(0.01, 0.045, 4).translate(0, -0.02, 0), '#2a2622', 'foot');
        talon.position.set(Math.sin(a) * 0.09, -low + 0.004, Math.cos(a) * 0.09);
        talon.rotation.set(-2.3, a, 0);
        knee.add(talon);
      }
    }
    hip.add(knee);
    body.add(hip);
    legs.push(hip);
    knees.push(knee);
  }
  // Neck (cranes and peacocks), and the floating head with its beak and crest.
  const neckLen = dims.neck ?? 0.06, tilt = id === 'crane' ? 0.25 : 0.55;
  const ng = new THREE.CylinderGeometry(W * 0.12, W * 0.24, neckLen, 7);
  ng.translate(0, neckLen / 2, 0);
  const neck = part(ng, id === 'peacock' ? '#1f5a9a' : c, 'neck', glow);
  neck.position.set(0, bodyY + H * 0.3, L * 0.35);
  neck.rotation.x = tilt;
  body.add(neck);
  const anchor = new THREE.Vector3(0, neckLen, 0).applyEuler(neck.rotation).add(neck.position);
  const headBase = anchor.addScaledVector(new THREE.Vector3(0, Math.cos(tilt), Math.sin(tilt)), animalHeadGap(headR) + headR).add(new THREE.Vector3(0, headR * 0.15, 0));
  const skull = part(new THREE.SphereGeometry(headR, 10, 8), id === 'peacock' ? '#1f5a9a' : c, 'head', glow);
  skull.scale.set(0.9, 1, 1.1);
  head.add(skull);
  const beak = part(new THREE.ConeGeometry(headR * (id === 'duck' ? 0.45 : id === 'eagle' ? 0.42 : 0.3), headR * (id === 'crane' ? 2.4 : id === 'duck' ? 1.3 : 1.0), 5), id === 'crane' ? '#3a3a3a' : id === 'eagle' ? '#e8b83a' : '#f2a13a', 'head');
  if (id === 'duck') beak.scale.set(1.3, 0.45, 1);
  if (id === 'eagle') beak.scale.set(0.8, 1, 1.1);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, -headR * 0.1, headR * (id === 'crane' ? 1.9 : 1.2));
  head.add(beak);
  if (id === 'eagle') {
    // The raptor's hook: the beak's tip curls down.
    const hook = part(new THREE.ConeGeometry(headR * 0.14, headR * 0.5, 5), '#3a3026', 'head');
    hook.position.set(0, -headR * 0.28, headR * 1.72);
    hook.rotation.x = Math.PI * 0.85;
    head.add(hook);
  }
  // A pale throat and a sleek crown: every bird's head has its shape.
  const throat = part(new THREE.SphereGeometry(headR * 0.55, 7, 5), breast, 'head', glow);
  throat.position.set(0, -headR * 0.45, headR * 0.35);
  head.add(throat);
  const crown = part(new THREE.SphereGeometry(headR * 0.6, 7, 5), id === 'duck' ? tone(c, '#2f7a4a', 0.5) : tone(c, '#000000', 0.12), 'head', glow);
  crown.scale.set(0.9, 0.5, 1.2);
  crown.position.set(0, headR * 0.55, -headR * 0.05);
  head.add(crown);
  if (id === 'crane') { const cap = part(new THREE.SphereGeometry(headR * 0.45, 6, 4), '#d42a2a', 'head'); cap.position.y = headR * 0.75; head.add(cap); }
  if (id === 'peacock') for (let i = -1; i <= 1; i++) {
    const s = part(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 3), '#2f8a9a', 'head');
    s.position.set(i * 0.03, headR * 1.3, -headR * 0.1);
    head.add(s);
    const f = part(new THREE.SphereGeometry(0.02, 4, 3), '#2f8a9a', 'head');
    f.position.set(i * 0.03, headR * 1.3 + 0.07, -headR * 0.1);
    head.add(f);
  }
  // Tails: a peacock's great fan of patterned feathers, a light bird's glowing fan, a short tail for the rest.
  const tail = new THREE.Group();
  tail.position.set(0, bodyY + H * 0.1, -L * 0.45);
  const fan = id === 'peacock' || id === 'lightbird';
  const n = fan ? 11 : id === 'eagle' ? 9 : 5;
  const cols = id === 'peacock' ? ['#2f8a6a', '#1f5a9a', '#3aa08a', '#e2b43a'] : id === 'lightbird' ? ['#fff4c0', '#b8a4ff', '#ffd6f0'] : [c, accent];
  for (let i = 0; i < n; i++) {
    const len = id === 'peacock' ? 1.1 : fan ? 0.45 : L * 0.4;
    const wide = id === 'eagle';
    const f = part(new THREE.BoxGeometry(fan ? 0.09 : wide ? 0.09 : 0.06, 0.015, len).translate(0, 0, -len / 2), cols[i % cols.length], 'tail', glow || id === 'lightbird');
    f.rotation.set(fan ? -0.95 : -0.1, ((i - (n - 1) / 2) / ((n - 1) / 2)) * (fan ? 1.0 : wide ? 0.4 : 0.25), 0);
    tail.add(f);
    if (id === 'peacock') {
      // A gold diamond near each feather's end — a pattern on the plume, never a round "eye".
      const spot = part(new THREE.OctahedronGeometry(0.05), '#e2b43a', 'tail', true);
      spot.scale.set(1, 0.3, 1.4);
      spot.position.set(0, 0, -len * 0.9);
      f.add(spot);
    }
  }
  body.add(tail);
  return { legs, knees, tail, headBase, wings };
}
