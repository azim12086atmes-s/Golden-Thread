import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { fbm3 } from './rocks';
import type { Flora, GeoBuilder } from './kit';
import { LeafKind } from './foliage';

/**
 * Trees that grow the way real ones do. Each species has a habit (how tall, how much bare trunk,
 * whether a leader runs up the middle or the trunk splits into limbs, how steeply the limbs
 * rise, how often they fork), and the tree is grown from it: trunk, limbs, branches, twigs,
 * tapering as they go. At the twig ends the crown gathers as smooth blobs of foliage, each covered
 * with leaf cards (foliage.ts).
 *
 *  - Oak: short massive trunk; heavy limbs spreading wide; a crown broader than tall.
 *  - London plane: tall straight trunk with patchy bark; a leader with ascending limbs; high dome.
 *  - Birch, aspen: slender pale trunk with a leader; many short upswept branches; narrow crown.
 *  - Maple: forks low into a few steep limbs; dense rounded crown.
 *  - Cherry (sakura): low fork; near-horizontal limbs; a wide umbrella of blossom.
 *  - Olive: gnarled, twisting trunk; open, irregular silver crown.
 *  - Orange: small and compact, round crown, fruit.
 *  - Magnolia: low-branched and broad; blossom.
 *  - Jacaranda: a vase: limbs climb, then spread into a flat, feathery violet crown.
 *  - Flame tree (gulmohar): a wide umbrella of long, near-horizontal limbs, red flowers on top.
 *  - Ginkgo: a leader with irregular, ascending tiers; gold fan leaves.
 *  - Willow: short trunk, arching limbs, curtains of foliage hanging from the tips.
 *  - Rainbow gum: very tall, bare, many-coloured trunk; high, irregular crown.
 *  - Dragon blood tree: forks again and again under a dense umbrella cap.
 *  - Wisteria: a twisting vine-trunk with cascades of violet blossom.
 */

export interface Habit {
  /** Height at scale 1 (metres). */
  h: number;
  /** Bare trunk, as a share of the height. */
  trunk: number;
  /** Trunk radius at the base (scale 1). */
  r: number;
  /** A leader runs up through the crown, sending out tiers of limbs (else the trunk splits). */
  leader: boolean;
  /** Tiers along the leader (leader trees). */
  tiers: number;
  /** Children at each fork. */
  forks: number;
  /** Angle of a child from its parent (radians). */
  spread: number;
  /** How the branches bend towards their tips: up (+) or down (−). */
  lift: number;
  /** Length of a first limb, as a share of the height. */
  limb: number;
  /** Each generation's length relative to its parent. */
  shrink: number;
  /** Generations of branching after the trunk. */
  depth: number;
  /** Blob radius, as a share of the height. */
  blob: number;
  /** Blob height relative to its width (umbrellas are flat, weeping blobs long). */
  squash: number;
  /** Random kinks in the wood (olive, wisteria). */
  gnarl: number;
  /** Weeping: blobs hang below the tips. */
  weep?: boolean;
  /** Curtains of long leafy strands hanging from the crown (the willow). */
  curtain?: boolean;
  /** Keep the crown as one smooth blob per branch (the Sky Isles' owner-approved trees). */
  classic?: boolean;
  bark: string;
  /** Bark marks or bands (birch, plane). */
  marks?: string;
  /** Colours of the foliage. */
  leaves: string[];
  /** Which leaf picture covers the crown. */
  card: number;
  /** Blossom colours mixed among the leaves (flame tree, magnolia). */
  flowers?: string[];
  /** The trunk in coloured bands (rainbow gum). */
  bands?: string[];
}

const H = (o: Partial<Habit> & Pick<Habit, 'h' | 'bark' | 'leaves'>): Habit => ({
  trunk: 0.3, r: 0.22, leader: false, tiers: 3, forks: 3, spread: 0.7, lift: 0.15, limb: 0.4, shrink: 0.7, depth: 2,
  blob: 0.17, squash: 0.85, gnarl: 0.15, card: LeafKind.Broad, ...o,
});

export const HABITS: Partial<Record<Flora, Habit>> = {
  oak: H({ h: 5.6, trunk: 0.3, r: 0.3, forks: 4, spread: 0.8, lift: 0.1, limb: 0.42, shrink: 0.68, blob: 0.19, squash: 0.78, gnarl: 0.25, bark: '#6b5540', leaves: ['#4f8c42', '#5c9c4a', '#467f3c'] }),
  plane: H({ h: 7.2, trunk: 0.36, r: 0.27, leader: true, tiers: 4, forks: 3, spread: 0.95, lift: 0.35, limb: 0.3, shrink: 0.62, blob: 0.15, squash: 0.9, bark: '#b3a98c', marks: '#8a9876', leaves: ['#6aa84f', '#5d9a46', '#77b55a'] }),
  birch: H({ h: 7, trunk: 0.28, r: 0.15, leader: true, tiers: 5, forks: 3, spread: 0.7, lift: 0.5, limb: 0.2, shrink: 0.6, depth: 1, blob: 0.11, squash: 1.3, bark: '#ece8de', marks: '#2a2a2a', leaves: ['#9cc85a', '#b5d86a', '#8fbf52'], card: LeafKind.Small }),
  aspen: H({ h: 7.6, trunk: 0.34, r: 0.14, leader: true, tiers: 5, forks: 3, spread: 0.6, lift: 0.55, limb: 0.18, shrink: 0.6, depth: 1, blob: 0.1, squash: 1.45, bark: '#efeae0', marks: '#3a3a3a', leaves: ['#ffd84a', '#f2b830', '#ffe27a'], card: LeafKind.Small }),
  maple: H({ h: 5.8, trunk: 0.26, r: 0.24, forks: 3, spread: 0.55, lift: 0.25, limb: 0.42, shrink: 0.72, blob: 0.2, squash: 0.95, bark: '#6b5a4a', leaves: ['#e4572e', '#f29e4c', '#d1495b'] }),
  sakura: H({ h: 4.6, trunk: 0.24, r: 0.23, forks: 5, spread: 1.05, lift: 0.05, limb: 0.5, shrink: 0.66, blob: 0.17, squash: 0.6, gnarl: 0.3, bark: '#5a4038', leaves: ['#ffc4dc', '#ffb0cf', '#ffd6e6'], card: LeafKind.Blossom }),
  olive: H({ h: 3.9, trunk: 0.3, r: 0.26, forks: 4, spread: 0.8, lift: 0.2, limb: 0.42, shrink: 0.7, blob: 0.19, squash: 0.75, gnarl: 0.65, bark: '#7a705e', leaves: ['#8a9a5b', '#9aab6a', '#a4b07a'], card: LeafKind.Small }),
  orange: H({ h: 3.5, trunk: 0.22, r: 0.15, forks: 4, spread: 0.6, lift: 0.25, limb: 0.34, shrink: 0.66, blob: 0.22, squash: 0.9, bark: '#6b5a44', leaves: ['#3f8a3a', '#4a9a44'], flowers: ['#ff9a1f'] }),
  magnolia: H({ h: 5, trunk: 0.2, r: 0.2, forks: 5, spread: 0.8, lift: 0.2, limb: 0.42, shrink: 0.68, blob: 0.16, squash: 0.85, bark: '#6b5a4a', leaves: ['#5a8a4a', '#679a52'], flowers: ['#ffd6e6', '#ffffff', '#ffc0d8'] }),
  jacaranda: H({ h: 5.8, trunk: 0.3, r: 0.21, forks: 4, spread: 0.5, lift: 0.02, limb: 0.46, shrink: 0.78, blob: 0.17, squash: 0.58, bark: '#6b5040', leaves: ['#9a7ae0', '#b08aef', '#8a6ad6'], card: LeafKind.Blossom }),
  flame: H({ h: 5.2, trunk: 0.36, r: 0.25, forks: 5, spread: 1.15, lift: 0.04, limb: 0.46, shrink: 0.7, blob: 0.16, squash: 0.46, bark: '#6b5040', leaves: ['#3f8a3a', '#4a9a44'], flowers: ['#ff4a1f', '#ff9a1f', '#ff6a2a'] }),
  ginkgo: H({ h: 6.6, trunk: 0.3, r: 0.2, leader: true, tiers: 4, forks: 3, spread: 0.9, lift: 0.3, limb: 0.28, shrink: 0.6, blob: 0.14, squash: 1, bark: '#7a6a52', leaves: ['#f2c230', '#ffd84a', '#e8b422'], card: LeafKind.Small }),
  willow: H({ curtain: true, h: 5.8, trunk: 0.3, r: 0.31, forks: 5, spread: 0.72, lift: -0.12, limb: 0.42, shrink: 0.7, blob: 0.14, squash: 1.9, weep: true, bark: '#6b5a44', leaves: ['#9cc56a', '#a8d078', '#8ab85c'], card: LeafKind.Small }),
  rainbowgum: H({ h: 9.5, trunk: 0.55, r: 0.34, leader: true, tiers: 3, forks: 3, spread: 0.8, lift: 0.3, limb: 0.24, shrink: 0.6, blob: 0.12, squash: 0.8, bark: '#5aa05a', leaves: ['#4f9a4a', '#62ae52'], card: LeafKind.Small, bands: ['#5aa05a', '#ff9a4a', '#4a7ad0', '#9a3a5a', '#e8d05a'] }),
  dragonblood: H({ h: 4.8, trunk: 0.44, r: 0.24, forks: 3, spread: 0.5, lift: 0.1, limb: 0.26, shrink: 0.8, depth: 3, blob: 0.13, squash: 0.36, bark: '#8a7a6a', leaves: ['#3f6a3a', '#4a7a42'], card: LeafKind.Needles }),
  // The Sky Isles: cloud willows trailing pale foliage, candy-blossom trees, glow trees.
  cloud: H({ classic: true, h: 6.2, trunk: 0.32, r: 0.22, forks: 5, spread: 0.8, lift: -0.1, limb: 0.42, shrink: 0.7, blob: 0.15, squash: 1.8, gnarl: 0.4, weep: true, bark: '#e8e4f4', leaves: ['#f4f4ff', '#e8f0ff', '#fff4fa'], card: LeafKind.Small }),
  candy: H({ classic: true, h: 5, trunk: 0.26, r: 0.22, forks: 5, spread: 1, lift: 0.08, limb: 0.46, shrink: 0.68, blob: 0.18, squash: 0.7, gnarl: 0.3, bark: '#e8d0e8', leaves: ['#ffb8d8', '#b8d8ff', '#d8b8ff', '#fff0a8', '#b8ffd8'], card: LeafKind.Blossom }),
  glowtree: H({ classic: true, h: 5.6, trunk: 0.3, r: 0.2, leader: true, tiers: 4, forks: 3, spread: 0.85, lift: 0.2, limb: 0.34, shrink: 0.62, blob: 0.16, squash: 0.8, bark: '#4a4a6a', leaves: ['#7affd0', '#9ad8ff', '#c8a8ff'], card: LeafKind.Crystal }),
  wisteria: H({ h: 4.6, trunk: 0.34, r: 0.2, forks: 4, spread: 0.9, lift: -0.05, limb: 0.4, shrink: 0.7, blob: 0.15, squash: 1.5, gnarl: 0.7, weep: true, bark: '#6b5040', leaves: ['#b58ae0', '#d9b8ff', '#a47ad6'], card: LeafKind.Blossom }),
};

/** The height a species grows to at scale 1 (for sizing giants). */
export function speciesHeight(kind: Flora): number {
  return HABITS[kind]?.h ?? 5;
}

const UP = new THREE.Vector3(0, 1, 0);
const tmpQ = new THREE.Quaternion(), tmpM = new THREE.Matrix4(), ONE = new THREE.Vector3(1, 1, 1);

/** A tapering length of wood from p0 to p1 (cylinders are wood, never leaves). */
function wood(g: GeoBuilder, p0: THREE.Vector3, p1: THREE.Vector3, r0: number, r1: number, col: THREE.ColorRepresentation): void {
  const d = new THREE.Vector3().subVectors(p1, p0), L = d.length();
  if (L < 1e-3) return;
  d.divideScalar(L);
  // Start a little inside the parent so joints never show a gap.
  const start = p0.clone().addScaledVector(d, -r0 * 0.6);
  const geo = new THREE.CylinderGeometry(r1, r0, L + r0 * 0.6, 5, 1, true);
  geo.translate(0, (L + r0 * 0.6) / 2, 0);
  g.add(geo, col, tmpM.compose(start, tmpQ.setFromUnitVectors(UP, d), ONE).clone());
}

/** A direction `angle` away from `dir`, turned `az` round it. */
function deviate(dir: THREE.Vector3, angle: number, az: number): THREE.Vector3 {
  const side = Math.abs(dir.y) > 0.95 ? new THREE.Vector3(1, 0, 0) : UP;
  const a = new THREE.Vector3().crossVectors(dir, side).normalize();
  const b = new THREE.Vector3().crossVectors(dir, a).normalize();
  const perp = a.multiplyScalar(Math.cos(az)).addScaledVector(b, Math.sin(az));
  return dir.clone().multiplyScalar(Math.cos(angle)).addScaledVector(perp, Math.sin(angle)).normalize();
}

/** Grow a tree of habit `hb` at (x, y, z), `s` times its natural size. */
export function growTree(g: GeoBuilder, hb: Habit, x: number, y: number, z: number, s: number, rng: () => number): void {
  const h = hb.h * s, base = new THREE.Vector3(x, y, z);
  const bark = (i: number) => hb.bands ? hb.bands[i % hb.bands.length] : hb.bark;
  const tips: Array<{ p: THREE.Vector3; r: number }> = [];

  // One branch: a gently kinked, tapering limb, then its children or, at the end, foliage.
  const branch = (p0: THREE.Vector3, dir: THREE.Vector3, len: number, r0: number, level: number) => {
    const mid = p0.clone().addScaledVector(dir, len * 0.5);
    const d2 = dir.clone().addScaledVector(UP, hb.lift).addScaledVector(new THREE.Vector3(rng() - 0.5, (rng() - 0.5) * 0.4, rng() - 0.5), hb.gnarl * 0.6).normalize();
    const end = mid.clone().addScaledVector(d2, len * 0.5);
    const rMid = r0 * 0.8, rEnd = r0 * 0.62;
    if (level >= hb.depth) wood(g, p0, end, r0, rEnd, bark(level));
    else { wood(g, p0, mid, r0, rMid, bark(level)); wood(g, mid, end, rMid, rEnd, bark(level + 1)); }
    if (level >= hb.depth) { tips.push({ p: end, r: hb.blob * h * (0.85 + rng() * 0.35) }); return; }
    const n = hb.forks + (rng() < 0.3 ? 1 : 0) - (level > 1 ? 1 : 0);
    const az0 = rng() * Math.PI * 2, first = tips.length;
    for (let i = 0; i < n; i++) {
      const cd = deviate(d2, hb.spread * (0.75 + rng() * 0.5), az0 + (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.6);
      branch(end, cd, len * hb.shrink * (0.85 + rng() * 0.3), rEnd * 0.78, level + 1);
    }
    // The twigs of one branch share one full blob of foliage.
    if (level === hb.depth - 1) mergeTips(first);
  };
  const mergeTips = (first: number) => {
    const group = tips.splice(first);
    if (!group.length) return;
    const cen = new THREE.Vector3();
    for (const t of group) cen.add(t.p);
    cen.divideScalar(group.length);
    let reach = 0, rr = 0;
    for (const t of group) { reach = Math.max(reach, t.p.distanceTo(cen)); rr += t.r; }
    tips.push({ p: cen, r: reach * 0.85 + (rr / group.length) * 0.9 });
  };

  const r0 = hb.r * s;
  const lean = new THREE.Vector3((rng() - 0.5) * 0.12, 1, (rng() - 0.5) * 0.12).normalize();
  if (hb.leader) {
    // Excurrent: a leader up the middle with tiers of limbs, longest at the bottom.
    let p = base.clone(), r = r0;
    const top = base.clone().addScaledVector(lean, h * 0.92);
    const bare = h * hb.trunk;
    const firstNode = base.clone().addScaledVector(lean, bare);
    wood(g, p, firstNode, r, r * 0.8, bark(0));
    p = firstNode; r *= 0.8;
    const step = (top.y - firstNode.y) / hb.tiers;
    for (let t = 0; t < hb.tiers; t++) {
      const next = p.clone().addScaledVector(lean, step).add(new THREE.Vector3((rng() - 0.5) * 0.2 * s, 0, (rng() - 0.5) * 0.2 * s));
      wood(g, p, next, r, r * 0.78, bark(t + 1));
      const k = 1 - t / hb.tiers, first = tips.length;
      for (let i = 0; i < hb.forks; i++) {
        const dir = deviate(lean, hb.spread * (0.85 + rng() * 0.3), (i / hb.forks) * Math.PI * 2 + t * 1.1 + rng() * 0.5);
        branch(p.clone().lerp(next, 0.4), dir, h * hb.limb * (0.55 + 0.45 * k), r * 0.5, 1);
      }
      // Each tier of a leader tree is one layer of foliage.
      if (hb.depth <= 1) mergeTips(first);
      p = next; r *= 0.78;
    }
    tips.push({ p: p.clone().addScaledVector(lean, h * 0.04), r: hb.blob * h * 0.9 });
  } else {
    // Decurrent: the trunk rises bare, then splits into limbs that fork and fork again.
    const fork = base.clone().addScaledVector(lean, h * hb.trunk);
    wood(g, base, fork, r0, r0 * 0.78, bark(0));
    // Root flare at the foot.
    wood(g, base.clone().add(new THREE.Vector3(0, -0.1 * s, 0)), base.clone().add(new THREE.Vector3(0, 0.35 * s, 0)), r0 * 1.5, r0, bark(0));
    const az0 = rng() * Math.PI * 2;
    for (let i = 0; i < hb.forks; i++) {
      const dir = deviate(lean, hb.spread * (0.8 + rng() * 0.4), az0 + (i / hb.forks) * Math.PI * 2 + (rng() - 0.5) * 0.5);
      branch(fork, dir, h * hb.limb * (0.85 + rng() * 0.3), r0 * 0.62, 1);
    }
  }
  if (hb.marks) {
    // Bark marks on the trunk: birch's dark bands, the plane's patches.
    for (let i = 1; i < 6; i++) {
      const k = i / 7, rr = r0 * (1 - k * 0.4);
      const geo = new THREE.CylinderGeometry(rr * 1.03, rr * 1.04, h * 0.02, 6, 1, true);
      g.add(geo, hb.marks, tmpM.compose(base.clone().addScaledVector(lean, h * hb.trunk * k * 1.2), tmpQ.setFromUnitVectors(UP, lean), ONE).clone());
    }
  }

  // The crown: a smooth blob of foliage at each tip, covered with leaf cards.
  const col = new THREE.Color();
  for (const t of tips) {
    const leafCol = hb.leaves[Math.floor(rng() * hb.leaves.length)];
    const c = t.p.clone();
    if (hb.curtain) { curtainCrown(g, hb, c, t.r, leafCol, y, h, rng); continue; }
    if (!hb.classic) { openCrown(g, hb, c, t.r, leafCol, y, h, rng); continue; }
    if (hb.weep) c.y -= t.r * hb.squash * 0.55;
    const geo = clumpGeometry(Math.floor(rng() * CLUMPS));
    g.add(geo, col.set(leafCol).multiplyScalar(0.86), tmpM.compose(c, tmpQ.setFromAxisAngle(UP, rng() * Math.PI * 2), new THREE.Vector3(t.r, t.r * hb.squash, t.r)).clone());
    leafCards(g, hb, c, t.r, leafCol, y, h, rng);
  }
}

/**
 * An open crown: a branch's foliage as three smaller leaf clusters set off-centre round its tip
 * (more of them up and out, towards the light), so the crown has lobes and gaps with the sky
 * showing through and a broken outline, not one round ball; leaves stand a little proud of each
 * cluster so its edge is ragged.
 */
function openCrown(g: GeoBuilder, hb: Habit, c: THREE.Vector3, r: number, leafCol: string, baseY: number, h: number, rng: () => number): void {
  const col = new THREE.Color();
  const cen = hb.weep ? c.clone().add(new THREE.Vector3(0, -r * hb.squash * 0.45, 0)) : c;
  const n = 3, a0 = rng() * Math.PI * 2;
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * Math.PI * 2 + (rng() - 0.5) * 0.8;
    const rr = r * (0.52 + rng() * 0.18), off = r * (0.42 + rng() * 0.18);
    const p = cen.clone().add(new THREE.Vector3(Math.cos(a) * off, (hb.weep ? -0.2 : 0.15 + rng() * 0.3) * r * hb.squash, Math.sin(a) * off));
    if (p.y - rr * hb.squash < baseY + 0.8) p.y = baseY + 0.8 + rr * hb.squash;
    const lc = hb.leaves[Math.floor(rng() * hb.leaves.length)];
    g.add(clumpGeometry(Math.floor(rng() * CLUMPS)), col.set(lc).multiplyScalar(0.86), tmpM.compose(p, tmpQ.setFromAxisAngle(UP, rng() * Math.PI * 2), new THREE.Vector3(rr, rr * hb.squash, rr)).clone());
    leafCards(g, hb, p, rr, lc, baseY, h, rng, 1.12);
  }
  void leafCol;
}

/**
 * The willow's crown: a low canopy over the branch tip and a curtain of long leafy strands
 * hanging from its rim nearly to the ground, each with leaves down its length that swing in the
 * wind.
 */
const strandGeo = new THREE.IcosahedronGeometry(1, 0);
function curtainCrown(g: GeoBuilder, hb: Habit, c: THREE.Vector3, r: number, leafCol: string, baseY: number, h: number, rng: () => number): void {
  const col = new THREE.Color(leafCol);
  g.add(clumpGeometry(Math.floor(rng() * CLUMPS)), col.clone().multiplyScalar(0.86), tmpM.compose(c, tmpQ.setFromAxisAngle(UP, rng() * Math.PI * 2), new THREE.Vector3(r * 0.8, r * 0.45, r * 0.8)).clone());
  leafCards(g, { ...hb, squash: 0.45, weep: false }, c, r * 0.8, leafCol, baseY, h, rng);
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rng() * 0.6, out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const rim = c.clone().addScaledVector(out, r * (0.6 + rng() * 0.25));
    const L = r * hb.squash * (0.9 + rng() * 0.7), bottom = Math.max(baseY + 0.7, rim.y - L), len = rim.y - bottom;
    if (len < 0.4) continue;
    const sc = col.clone().offsetHSL((rng() - 0.5) * 0.03, 0, (rng() - 0.5) * 0.1);
    g.add(strandGeo.clone(), sc.clone().multiplyScalar(0.86), tmpM.compose(new THREE.Vector3(rim.x, rim.y - len / 2, rim.z), tmpQ.setFromAxisAngle(UP, a), new THREE.Vector3(r * 0.16, len / 2, r * 0.12)).clone());
    if (!g.cards) continue;
    const m = Math.max(2, Math.round(len / (r * 0.4)));
    for (let j = 0; j < m; j++) {
      const p = rim.clone().add(new THREE.Vector3(0, -len * (j + 0.5) / m, 0)).addScaledVector(out, r * 0.08);
      const nrm = out.clone().add(new THREE.Vector3(0, -0.15, 0)).normalize();
      g.card(p.x, p.y, p.z, nrm.x, nrm.y, nrm.z, Math.min(1.6, r * 0.42) * (0.8 + rng() * 0.4), sc, hb.card, 0.8 + (j / m) * 0.2, Math.PI / 2 + (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.6);
    }
  }
}

/**
 * A clump of foliage, 1 m across: a lumpy mass of smaller bulges (like a real crown's leaf
 * clusters), not a smooth ball. A few shapes are made once and reused, turned and scaled.
 */
const CLUMPS = 8;
const clumpCache: THREE.BufferGeometry[] = [];
function clumpGeometry(k: number): THREE.BufferGeometry {
  if (!clumpCache[k]) {
    const base = new THREE.IcosahedronGeometry(1, 1);
    base.deleteAttribute('normal'); base.deleteAttribute('uv');
    const geo = mergeVertices(base);
    base.dispose();
    const pos = geo.getAttribute('position') as THREE.BufferAttribute, v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const d = 1 + fbm3(v.x * 1.6, v.y * 1.6, v.z * 1.6, 40 + k, 3) * 0.55 + fbm3(v.x * 3.4, v.y * 3.4, v.z * 3.4, 60 + k, 2) * 0.22;
      v.multiplyScalar(d);
      if (v.y < -0.55) v.y = -0.55 + (v.y + 0.55) * 0.5; // a flatter underside
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    clumpCache[k] = geo;
  }
  return clumpCache[k].clone();
}

/** Cover one foliage blob with overlapping leaf cards, facing outwards. */
function leafCards(g: GeoBuilder, hb: Habit, c: THREE.Vector3, r: number, leafCol: string, baseY: number, h: number, rng: () => number, proud = 1): void {
  if (!g.cards) return;
  const size = Math.min(3, Math.max(0.6, r * 0.62));
  const n = Math.max(14, Math.min(52, Math.round((4 * Math.PI * r * r * (0.6 + hb.squash * 0.4)) / (size * size * 0.38))));
  // Colourful crowns (autumn, blossom, fantasy) mix neighbouring hues leaf by leaf.
  const base = new THREE.Color(leafCol), hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const hueSpread = hsl.s > 0.35 && !(hsl.h > 0.2 && hsl.h < 0.42) ? 0.07 : 0.03;
  const col = new THREE.Color();
  // How freely this part of the tree moves: the crown more than the lower branches.
  const k = Math.min(1, Math.max(0, (c.y - baseY - h * 0.3) / (h * 0.7)));
  const sway = k * k;
  for (let i = 0; i < n; i++) {
    const yk = 1 - (2 * (i + 0.5)) / n;
    if (yk < -0.8 && !hb.weep) continue;
    const rk = Math.sqrt(1 - yk * yk), ph = i * 2.39996 + rng() * 0.8;
    const dx = Math.cos(ph) * rk, dz = Math.sin(ph) * rk;
    const out = (0.88 + rng() * 0.24) * proud;
    const px = c.x + dx * r * out, py = c.y + yk * r * hb.squash * out, pz = c.z + dz * r * out;
    // The outward normal of the (squashed) blob.
    const nx = dx / r, ny = yk / (r * hb.squash), nz = dz / r, nl = Math.hypot(nx, ny, nz);
    const flower = hb.flowers && rng() < 0.35;
    col.set(flower ? hb.flowers![Math.floor(rng() * hb.flowers!.length)] : leafCol).offsetHSL((rng() - 0.5) * hueSpread * 2, (rng() - 0.5) * 0.1, (rng() - 0.5) * 0.14);
    g.card(px, py, pz, nx / nl, ny / nl, nz / nl, size * (0.8 + rng() * 0.4), col, flower ? LeafKind.Blossom : hb.card, sway, rng() * Math.PI * 2, (rng() - 0.5) * 1.1);
  }
}
