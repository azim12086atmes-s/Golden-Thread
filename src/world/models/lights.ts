import * as THREE from 'three';
import type { Ctx, Footprint } from '../architecture';
import { M, box, cone, cyl, dome, hip, sphere } from '../kit';
import type { RegionId } from '../regions';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §4): each land's own house and street
 * lighting, added round a house (`houseLights`, called for every house after it is built) and along the
 * streets (`streetLight`, a light standard at (x, y, z)). Glow geometry goes in `c.glow`; keep area small.
 *
 * Wired: `houseLights` runs inside each house's own frame (origin at its base, front door facing +z) right after
 * it is built; `streetLight` is asked for every avenue lamp (land frame) and the land's lamp post stands there
 * whenever it returns false.
 *
 * Each land lights its evening in its own way (owner: "every land its own evening lighting"):
 *  - London's cast-iron gas lamps with a ladder bar; New Yonder's bishop's-crook lampposts; Maple
 *    Row's acorn globes; Firenzia's wrought-iron lanterns on scrolled brackets; the Meadow's flower
 *    stems; the Alps' roofed bracket lanterns; the fjords' and the Aurora's candle lanterns on posts;
 *  - Sakura Hollow's stone tōrō; Hanok Village's octagonal stone lanterns; Jade Terraces' strings
 *    of red lanterns between poles;
 *  - Madinat an-Nur's pierced brass lanterns hanging from curled brackets; Souq al-Qamar's clusters
 *    of coloured glass lamps; the Tents of Rimal's lamps on crossed tent-poles; the Nile's papyrus
 *    columns carrying a bowl of fire;
 *  - Gulabi Nagar's deepastambha, a pillar of tiers of diyas; Kaveri Coast's tall brass
 *    nilavilakku; Bagh-e-Noor's marble chiragh-dan; Nusa Rinjani's bamboo penjor with a woven lantern;
 *  - the Sky Isles' floating crystals.
 * And at each house door a small light of the same tradition.
 */

const IRON = '#1f1f24', BRASS = '#c8a040', GOLD = '#d4af37', STONE = '#9a948a';
const FLAME = '#ffcf7a', WARM = '#ffe2a0';

type Light = (c: Ctx, x: number, y: number, z: number) => void;

/** Four glazed panes and a crown: the lantern of a gas lamp, base at y. */
function glassLantern(c: Ctx, x: number, y: number, z: number, s: number, frame = IRON): void {
  cone(c.g, 0.16 * s, 0.14 * s, frame, x, y - 0.14 * s, z, 4, Math.PI / 4);
  box(c.glow, 0.34 * s, 0.5 * s, 0.34 * s, WARM, x, y, z);
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(c.g, 0.03 * s, 0.52 * s, 0.03 * s, frame, x + dx * 0.18 * s, y, z + dz * 0.18 * s);
  cone(c.g, 0.32 * s, 0.3 * s, frame, x, y + 0.5 * s, z, 4, Math.PI / 4);
  sphere(c.g, 0.05 * s, frame, x, y + 0.85 * s, z, 5);
}
/** A pierced brass star lantern with a domed cap, hanging with its top at y. */
function brassLantern(c: Ctx, x: number, y: number, z: number, s = 1, col = FLAME): void {
  cyl(c.g, 0.01, 0.01, 0.3 * s, BRASS, x, y - 0.3 * s, z, 3);
  dome(c.g, 0.18 * s, BRASS, x, y - 0.38 * s, z, 8);
  c.glow.add(new THREE.OctahedronGeometry(0.2 * s).scale(1, 1.4, 1), col, M(x, y - 0.62 * s, z));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(c.g, 0.02, 0.4 * s, 0.02, BRASS, x + Math.cos(a) * 0.17 * s, y - 0.8 * s, z + Math.sin(a) * 0.17 * s); }
  cone(c.g, 0.12 * s, 0.24 * s, BRASS, x, y - 1.1 * s, z, 6);
}
/** A diya: a little clay lamp with its flame. */
function diya(c: Ctx, x: number, y: number, z: number, s = 1): void {
  cyl(c.g, 0.1 * s, 0.05 * s, 0.07 * s, '#b0553a', x, y, z, 8);
  cone(c.glow, 0.035 * s, 0.12 * s, '#ffb84a', x, y + 0.07 * s, z, 5);
}

const STREET: Record<RegionId, Light> = {
  london(c, x, y, z) {
    // A fluted cast-iron base, a tapering column, the ladder bar, the glazed lantern and its crown.
    cyl(c.g, 0.22, 0.28, 0.8, IRON, x, y, z, 12);
    cyl(c.g, 0.17, 0.22, 0.15, IRON, x, y + 0.8, z, 12);
    cyl(c.g, 0.07, 0.11, 3, IRON, x, y + 0.95, z, 10);
    for (let i = 0; i < 3; i++) cyl(c.g, 0.13, 0.13, 0.06, IRON, x, y + 1.4 + i * 1.1, z, 10);
    box(c.g, 0.9, 0.06, 0.06, IRON, x, y + 3.6, z);
    for (const s of [-1, 1]) sphere(c.g, 0.05, IRON, x + s * 0.45, y + 3.6, z, 5);
    glassLantern(c, x, y + 4.15, z, 1.2);
  },
  newyork(c, x, y, z) {
    // The bishop's crook: a tall post curling over, a teardrop lamp hanging from the crook.
    cyl(c.g, 0.2, 0.26, 1.2, '#2a3a2e', x, y, z, 10);
    cyl(c.g, 0.07, 0.1, 5.2, '#2a3a2e', x, y + 1.2, z, 8);
    c.g.add(new THREE.TorusGeometry(0.55, 0.06, 6, 14, Math.PI), '#2a3a2e', M(x + 0.55, y + 6.4, z));
    c.g.add(new THREE.TorusGeometry(0.16, 0.04, 5, 10, Math.PI * 1.5), '#2a3a2e', M(x - 0.14, y + 6.1, z, 0, 1, 1, 1, 0, -Math.PI * 0.2));
    cone(c.g, 0.26, 0.24, '#2a3a2e', x + 1.1, y + 6.0, z, 10, 0);
    c.glow.add(new THREE.SphereGeometry(0.22, 10, 8).scale(1, 1.35, 1), WARM, M(x + 1.1, y + 5.72, z));
  },
  vintage(c, x, y, z) {
    // A fluted post with an acorn globe.
    cyl(c.g, 0.18, 0.22, 0.6, '#1f3a2a', x, y, z, 12);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; box(c.g, 0.03, 2.6, 0.03, '#2a4a36', x + Math.cos(a) * 0.09, y + 0.6, z + Math.sin(a) * 0.09); }
    cyl(c.g, 0.08, 0.1, 2.6, '#1f3a2a', x, y + 0.6, z, 8);
    cyl(c.g, 0.16, 0.12, 0.2, '#1f3a2a', x, y + 3.2, z, 10);
    c.glow.add(new THREE.SphereGeometry(0.26, 12, 8).scale(1, 1.4, 1), '#fff0d0', M(x, y + 3.7, z));
    cone(c.g, 0.12, 0.3, '#1f3a2a', x, y + 4.06, z, 8);
  },
  renaissance(c, x, y, z) {
    // A wrought-iron post, scrolls under a hexagonal lantern on its bracket.
    cyl(c.g, 0.06, 0.09, 3.6, IRON, x, y, z, 6);
    box(c.g, 0.9, 0.05, 0.05, IRON, x + 0.4, y + 3.5, z);
    for (const s of [0, 1]) c.g.add(new THREE.TorusGeometry(0.2, 0.025, 4, 10, Math.PI * 1.5), IRON, M(x + 0.2 + s * 0.35, y + 3.25, z, 0, 1, 1, 1, 0, s * Math.PI));
    cyl(c.g, 0.01, 0.01, 0.3, IRON, x + 0.8, y + 3.2, z, 3);
    cyl(c.g, 0.2, 0.14, 0.5, IRON, x + 0.8, y + 2.55, z, 6);
    cyl(c.glow, 0.17, 0.12, 0.42, '#ffd890', x + 0.8, y + 2.59, z, 6);
    cone(c.g, 0.24, 0.25, IRON, x + 0.8, y + 3.05, z, 6);
  },
  meadow(c, x, y, z) {
    // A flower on its stalk: a curled stem, leaves, a glowing bell-flower.
    cyl(c.g, 0.05, 0.08, 2.6, '#4f8a4a', x, y, z, 6);
    c.g.add(new THREE.TorusGeometry(0.35, 0.05, 6, 12, Math.PI), '#4f8a4a', M(x + 0.35, y + 2.6, z));
    for (const [h, s] of [[0.8, 1], [1.5, -1]] as const) c.g.add(new THREE.SphereGeometry(0.22, 6, 4).scale(1.6, 0.3, 0.7), '#5aa84f', M(x + s * 0.25, y + h, z, 0, 1, 1, 1, 0, s * 0.5));
    c.glow.add(new THREE.ConeGeometry(0.24, 0.45, 8, 1, true), '#ffd0e8', M(x + 0.7, y + 2.1, z));
    sphere(c.glow, 0.08, '#fff4c0', x + 0.7, y + 1.95, z, 6);
  },
  switzerland(c, x, y, z) {
    // A timber post, a scrolled iron bracket, a lantern under its own little shingled roof.
    box(c.g, 0.18, 3.4, 0.18, '#6b4a2a', x, y, z);
    box(c.g, 0.8, 0.06, 0.06, IRON, x + 0.4, y + 3.2, z);
    c.g.add(new THREE.TorusGeometry(0.22, 0.025, 4, 10, Math.PI), IRON, M(x + 0.3, y + 2.98, z, 0, 1, 1, 1, 0, Math.PI));
    glassLantern(c, x + 0.75, y + 2.45, z, 0.9, IRON);
    hip(c.g, 0.7, 0.7, 0.3, '#8a5a3a', x + 0.75, y + 3.25, z);
  },
  norway(c, x, y, z) {
    // A tarred post, a candle lantern hanging from an arm.
    box(c.g, 0.2, 2.9, 0.2, '#3a2418', x, y, z);
    box(c.g, 0.7, 0.08, 0.08, '#3a2418', x + 0.3, y + 2.8, z);
    cyl(c.g, 0.01, 0.01, 0.25, IRON, x + 0.6, y + 2.55, z, 3);
    cyl(c.g, 0.16, 0.16, 0.42, IRON, x + 0.6, y + 2.05, z, 6);
    cyl(c.glow, 0.13, 0.13, 0.36, FLAME, x + 0.6, y + 2.08, z, 6);
    cone(c.g, 0.2, 0.28, IRON, x + 0.6, y + 2.47, z, 6);
  },
  aurora(c, x, y, z) {
    // A short post in a heap of snow, a candle lantern with a cap of snow; a snow lantern at its foot.
    sphere(c.g, 0.55, '#f4f8ff', x, y, z, 8, 0.45);
    box(c.g, 0.16, 1.9, 0.16, '#6a4a30', x, y, z);
    cyl(c.g, 0.16, 0.16, 0.4, IRON, x, y + 1.9, z, 6);
    cyl(c.glow, 0.13, 0.13, 0.34, FLAME, x, y + 1.93, z, 6);
    cone(c.g, 0.2, 0.26, IRON, x, y + 2.3, z, 6);
    sphere(c.g, 0.17, '#f4f8ff', x, y + 2.5, z, 6, 0.5);
    for (let r = 0; r < 3; r++) for (let i = 0; i < 6 - r * 2; i++) { const a = (i / (6 - r * 2)) * Math.PI * 2; sphere(c.g, 0.11, '#f4f8fc', x + 0.8 + Math.cos(a) * (0.35 - r * 0.1), y + 0.1 + r * 0.18, z + Math.sin(a) * (0.35 - r * 0.1), 5); }
    sphere(c.glow, 0.09, FLAME, x + 0.8, y + 0.22, z, 5);
  },
  japan(c, x, y, z) {
    // A stone tōrō: base, pillar, the fire box with its windows lit, the curving roof, the jewel.
    cyl(c.g, 0.45, 0.5, 0.25, STONE, x, y, z, 6);
    cyl(c.g, 0.16, 0.18, 1.2, STONE, x, y + 0.25, z, 8);
    cyl(c.g, 0.42, 0.36, 0.18, STONE, x, y + 1.45, z, 6);
    cyl(c.g, 0.3, 0.3, 0.45, STONE, x, y + 1.63, z, 6);
    for (const ry of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) box(c.glow, 0.2, 0.26, 0.04, FLAME, x + Math.sin(ry) * 0.3, y + 1.72, z + Math.cos(ry) * 0.3, ry);
    c.g.add(new THREE.ConeGeometry(0.62, 0.36, 6), STONE, M(x, y + 2.26, z));
    sphere(c.g, 0.12, STONE, x, y + 2.52, z, 6);
  },
  korea(c, x, y, z) {
    // An octagonal stone lantern (seokdeung) on a lotus-carved column.
    box(c.g, 0.8, 0.2, 0.8, STONE, x, y, z);
    cyl(c.g, 0.34, 0.4, 0.2, STONE, x, y + 0.2, z, 8);
    cyl(c.g, 0.13, 0.13, 1.1, STONE, x, y + 0.4, z, 8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; c.g.add(new THREE.SphereGeometry(0.12, 5, 4).scale(1, 0.5, 1.4), STONE, M(x + Math.cos(a) * 0.26, y + 1.52, z + Math.sin(a) * 0.26, Math.PI / 2 - a)); }
    cyl(c.g, 0.32, 0.32, 0.5, STONE, x, y + 1.6, z, 8);
    cyl(c.glow, 0.27, 0.27, 0.36, FLAME, x, y + 1.67, z, 8);
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; box(c.g, 0.07, 0.5, 0.07, STONE, x + Math.cos(a) * 0.3, y + 1.6, z + Math.sin(a) * 0.3); }
    c.g.add(new THREE.ConeGeometry(0.55, 0.3, 8), STONE, M(x, y + 2.25, z));
    sphere(c.g, 0.1, STONE, x, y + 2.45, z, 6);
  },
  china(c, x, y, z) {
    // Two red poles with a string of red silk lanterns swinging between them.
    for (const s of [-1, 1]) { cyl(c.g, 0.07, 0.08, 4, '#b3262a', x + s * 2, y, z, 6); sphere(c.g, 0.1, GOLD, x + s * 2, y + 4.05, z, 6); }
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector3(x - 2 + t * 4, y + 3.9 - Math.sin(t * Math.PI) * 0.5, z)); }
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 12, 0.015, 3), IRON);
    for (let i = 1; i < 6; i++) {
      const t = i / 6, lx = x - 2 + t * 4, ly = y + 3.9 - Math.sin(t * Math.PI) * 0.5 - 0.35;
      sphere(c.glow, 0.2, i % 2 ? '#ff3a2a' : '#ff5a3a', lx, ly, z, 8, 1.25);
      cyl(c.g, 0.1, 0.1, 0.05, GOLD, lx, ly + 0.23, z, 8); cyl(c.g, 0.1, 0.1, 0.05, GOLD, lx, ly - 0.28, z, 8);
      cyl(c.g, 0.012, 0.012, 0.25, '#e8b84a', lx, ly - 0.55, z, 3);
    }
  },
  islamic(c, x, y, z) {
    // A slender bronze post curling into a bracket, a pierced brass lantern hanging from it.
    cyl(c.g, 0.16, 0.2, 0.5, BRASS, x, y, z, 8);
    cyl(c.g, 0.06, 0.08, 3.2, '#6a5030', x, y + 0.5, z, 8);
    c.g.add(new THREE.TorusGeometry(0.4, 0.04, 5, 12, Math.PI), '#6a5030', M(x + 0.4, y + 3.7, z));
    c.g.add(new THREE.TorusGeometry(0.12, 0.03, 4, 8, Math.PI * 1.5), '#6a5030', M(x + 0.12, y + 3.5, z));
    brassLantern(c, x + 0.8, y + 3.6, z, 1.1);
  },
  middleeast(c, x, y, z) {
    // A lamp-lit souq: a post with a crossbar, three coloured glass lamps hanging at different heights.
    box(c.g, 0.16, 3.8, 0.16, '#5a3a22', x, y, z);
    box(c.g, 1.8, 0.1, 0.1, '#5a3a22', x, y + 3.7, z);
    for (const [dx, h, col] of [[-0.8, 0.7, '#3ac8b8'], [0, 1.0, '#ffb04a'], [0.8, 0.6, '#e85a8a']] as const) {
      cyl(c.g, 0.01, 0.01, h, BRASS, x + dx, y + 3.7 - h, z, 3);
      c.glow.add(new THREE.SphereGeometry(0.17, 8, 6).scale(1, 1.3, 1), col, M(x + dx, y + 3.7 - h - 0.2, z));
      dome(c.g, 0.13, BRASS, x + dx, y + 3.7 - h, z, 6);
    }
  },
  desert(c, x, y, z) {
    // Two tent-poles crossed and lashed, a lamp hanging where they cross, a tassel of wool.
    for (const s of [-1, 1]) c.g.add(new THREE.CylinderGeometry(0.05, 0.06, 3.6, 5), '#7a5a3a', M(x + s * 0.4, y + 1.7, z, 0, 1, 1, 1, 0, s * 0.25));
    box(c.g, 0.2, 0.1, 0.1, '#c8483a', x, y + 3.2, z);
    brassLantern(c, x, y + 3.15, z, 0.9, '#ffb86a');
    for (let i = 0; i < 3; i++) cyl(c.g, 0.012, 0.012, 0.5, ['#c8483a', '#f2d6a0', '#2f5a9a'][i], x + 0.08 + i * 0.05, y + 2.7, z + 0.05, 3);
  },
  egypt(c, x, y, z) {
    // A papyrus column: a bundled shaft, the open papyrus flower, a bowl of fire on top.
    cyl(c.g, 0.26, 0.3, 0.3, '#c8b088', x, y, z, 10);
    cyl(c.g, 0.13, 0.17, 2.6, '#d8c08a', x, y + 0.3, z, 10);
    for (let i = 0; i < 5; i++) cyl(c.g, 0.18, 0.18, 0.05, ['#2f6fb8', '#e8b84a'][i % 2], x, y + 0.5 + i * 0.1, z, 10);
    c.g.add(new THREE.CylinderGeometry(0.42, 0.14, 0.55, 12, 1, true), '#5aa05a', M(x, y + 3.18, z));
    cyl(c.g, 0.3, 0.2, 0.14, '#6a5a4a', x, y + 3.45, z, 10);
    cone(c.glow, 0.22, 0.42, '#ffa84a', x, y + 3.58, z, 6);
  },
  indianorth(c, x, y, z) {
    // A deepastambha: a stone pillar ringed with tiers of little diyas, a pot of flame on top.
    cyl(c.g, 0.4, 0.45, 0.4, '#e8917a', x, y, z, 8);
    cyl(c.g, 0.14, 0.2, 2.6, '#e8917a', x, y + 0.4, z, 8);
    for (let t = 0; t < 4; t++) {
      const yy = y + 0.9 + t * 0.55, r = 0.36 - t * 0.05;
      cyl(c.g, r + 0.05, r + 0.05, 0.06, '#d27466', x, yy, z, 10);
      const n = 8 - t;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; diya(c, x + Math.cos(a) * r, yy + 0.06, z + Math.sin(a) * r, 0.9); }
    }
    cyl(c.g, 0.16, 0.1, 0.18, '#b0553a', x, y + 3, z, 8);
    cone(c.glow, 0.08, 0.26, '#ffb84a', x, y + 3.18, z, 6);
  },
  indiasouth(c, x, y, z) {
    // A nilavilakku: a tall brass lamp on a stone base, wicks all round its dish, a finial of a bird-less spire.
    box(c.g, 0.7, 0.35, 0.7, '#8a7a6a', x, y, z);
    cyl(c.g, 0.3, 0.38, 0.14, GOLD, x, y + 0.35, z, 12);
    cyl(c.g, 0.05, 0.07, 1.9, GOLD, x, y + 0.49, z, 8);
    for (const h of [0.9, 1.5]) sphere(c.g, 0.1, GOLD, x, y + 0.49 + h, z, 8);
    cyl(c.g, 0.34, 0.12, 0.1, GOLD, x, y + 2.4, z, 12);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; cone(c.glow, 0.04, 0.16, '#ffb84a', x + Math.cos(a) * 0.3, y + 2.5, z + Math.sin(a) * 0.3, 4); }
    cone(c.g, 0.06, 0.45, GOLD, x, y + 2.5, z, 6);
  },
  mughal(c, x, y, z) {
    // A marble chiragh-dan: a pillar of niches each holding a lamp, a pierced lantern crowning it.
    box(c.g, 0.7, 0.3, 0.7, '#e6dccb', x, y, z);
    box(c.g, 0.5, 2.4, 0.5, '#fbf7ee', x, y + 0.3, z);
    for (let t = 0; t < 3; t++) for (const [dx, dz, ry] of [[0, 0.26, 0], [0.26, 0, Math.PI / 2], [0, -0.26, Math.PI], [-0.26, 0, -Math.PI / 2]] as const) {
      box(c.g, 0.22, 0.34, 0.02, '#c8b8a0', x + dx, y + 0.6 + t * 0.7, z + dz, ry);
      if ((t + (dx > 0 ? 1 : 0)) % 2 === 0) diya(c, x + dx * 1.05, y + 0.62 + t * 0.7, z + dz * 1.05, 0.7);
    }
    box(c.g, 0.64, 0.1, 0.64, '#fbf7ee', x, y + 2.7, z);
    c.glow.add(new THREE.OctahedronGeometry(0.2).scale(1, 1.3, 1), FLAME, M(x, y + 3.0, z));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(c.g, 0.03, 0.4, 0.03, '#fbf7ee', x + Math.cos(a) * 0.2, y + 2.8, z + Math.sin(a) * 0.2); }
    dome(c.g, 0.24, '#fbf7ee', x, y + 3.2, z, 8);
    cone(c.g, 0.04, 0.25, GOLD, x, y + 3.42, z, 5);
  },
  indonesia(c, x, y, z) {
    // A penjor: a tall bamboo pole arching over, palm-leaf fringes down it, a woven lantern at its tip.
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(x + Math.pow(t, 2.2) * 1.4, y + t * 5, z)); }
    c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.06, 5), '#c8a86a');
    for (let i = 3; i < 10; i++) { const p = pts[i]; c.g.add(new THREE.BoxGeometry(0.03, 0.5, 0.18), i % 2 ? '#e8d890' : '#8ab84a', M(p.x + 0.05, p.y - 0.25, z, 0, 1, 1, 1, 0, 0.2)); }
    const tip = pts[10];
    c.glow.add(new THREE.ConeGeometry(0.2, 0.5, 8), '#ffd88a', M(tip.x, tip.y - 0.55, z, 0, 1, 1, 1, Math.PI, 0));
    for (let i = 0; i < 6; i++) cyl(c.g, 0.01, 0.01, 0.45, '#e8d890', tip.x - 0.12 + i * 0.05, tip.y - 1.2, z, 3);
  },
  skyisles(c, x, y, z) {
    // A floating crystal of light over a moonstone base.
    cyl(c.g, 0.25, 0.35, 0.5, '#f4f0ff', x, y, z, 8);
    c.glow.add(new THREE.OctahedronGeometry(0.35).scale(0.6, 1.5, 0.6), '#bfe8ff', M(x, y + 1.4, z));
    c.g.add(new THREE.TorusGeometry(0.4, 0.03, 4, 16), '#b8a4ff', M(x, y + 1.4, z, 0, 1, 1, 1, Math.PI / 2, 0));
  },
};

export function streetLight(c: Ctx, x: number, y: number, z: number): boolean {
  STREET[c.s.id](c, x, y, z);
  return true;
}

/** Each land's small light at a house door (its own frame: base at the origin, door towards +z). */
const DOOR: Record<RegionId, (c: Ctx, z: number) => void> = {
  london: (c, z) => { cyl(c.g, 0.05, 0.06, 1.9, IRON, 1.3, 0, z, 6); glassLantern(c, 1.3, 1.95, z, 0.7); },
  newyork: (c, z) => { cyl(c.g, 0.05, 0.06, 1.9, '#2a3a2e', 1.3, 0, z, 6); c.glow.add(new THREE.SphereGeometry(0.16, 8, 6), WARM, M(1.3, 2.05, z)); },
  vintage: (c, z) => { cyl(c.g, 0.05, 0.06, 1.2, '#1f3a2a', -1.3, 0, z, 6); c.glow.add(new THREE.SphereGeometry(0.14, 8, 6).scale(1, 1.3, 1), '#fff0d0', M(-1.3, 1.35, z)); },
  renaissance: (c, z) => { cyl(c.g, 0.12, 0.14, 0.2, IRON, 1.2, 0, z, 6); cyl(c.glow, 0.1, 0.08, 0.3, '#ffd890', 1.2, 0.2, z, 6); },
  meadow: (c, z) => { cyl(c.g, 0.04, 0.05, 0.5, '#f4efe4', 1.1, 0, z, 6); dome(c.g, 0.26, '#ff6b8b', 1.1, 0.5, z, 10); for (let i = 0; i < 4; i++) sphere(c.g, 0.04, '#ffffff', 1.1 + Math.cos(i * 1.6) * 0.15, 0.68, z + Math.sin(i * 1.6) * 0.15, 4); sphere(c.glow, 0.08, '#fff4c0', 1.1, 0.42, z, 5); },
  switzerland: (c, z) => { box(c.g, 0.3, 0.3, 0.3, '#6b4a2a', 1.2, 0, z); cyl(c.glow, 0.1, 0.1, 0.25, FLAME, 1.2, 0.32, z, 6); },
  norway: (c, z) => { cyl(c.g, 0.13, 0.13, 0.32, IRON, 1.1, 0, z, 6); cyl(c.glow, 0.1, 0.1, 0.26, FLAME, 1.1, 0.03, z, 6); cone(c.g, 0.16, 0.2, IRON, 1.1, 0.32, z, 6); },
  aurora: (c, z) => { sphere(c.g, 0.3, '#f4f8ff', 1.1, 0, z, 8, 0.5); cyl(c.glow, 0.09, 0.09, 0.2, FLAME, 1.1, 0.12, z, 6); },
  japan: (c, z) => { box(c.g, 0.34, 0.08, 0.34, '#3a2a22', 1.1, 0, z); box(c.glow, 0.28, 0.6, 0.28, '#fff0d0', 1.1, 0.08, z); for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(c.g, 0.03, 0.64, 0.03, '#3a2a22', 1.1 + dx * 0.15, 0.08, z + dz * 0.15); }, // an andon
  korea: (c, z) => { box(c.g, 0.3, 0.5, 0.3, STONE, 1.1, 0, z); cyl(c.glow, 0.12, 0.12, 0.2, FLAME, 1.1, 0.5, z, 6); cone(c.g, 0.22, 0.14, STONE, 1.1, 0.7, z, 6); },
  china: (c, z) => { for (const s of [-1, 1]) { cyl(c.g, 0.03, 0.03, 1.6, '#b3262a', s * 1.2, 0, z, 4); sphere(c.glow, 0.17, '#ff3a2a', s * 1.2, 1.75, z, 8, 1.2); } },
  islamic: (c, z) => { cyl(c.g, 0.2, 0.24, 0.1, BRASS, 1.1, 0, z, 8); c.glow.add(new THREE.OctahedronGeometry(0.16).scale(1, 1.4, 1), FLAME, M(1.1, 0.35, z)); dome(c.g, 0.14, BRASS, 1.1, 0.55, z, 8); },
  middleeast: (c, z) => { cyl(c.g, 0.18, 0.22, 0.1, BRASS, 1.1, 0, z, 8); c.glow.add(new THREE.SphereGeometry(0.14, 8, 6).scale(1, 1.3, 1), '#3ac8b8', M(1.1, 0.3, z)); dome(c.g, 0.12, BRASS, 1.1, 0.47, z, 8); },
  desert: (c, z) => { cyl(c.g, 0.03, 0.04, 1.8, '#7a5a3a', 1.2, 0, z, 5); brassLantern(c, 1.2, 1.8, z, 0.6, '#ffb86a'); },
  egypt: (c, z) => { cyl(c.g, 0.16, 0.12, 0.3, '#b0553a', 1.1, 0, z, 8); cone(c.glow, 0.1, 0.24, '#ffa84a', 1.1, 0.3, z, 6); },
  indianorth: (c, z) => { for (let i = 0; i < 5; i++) diya(c, -0.8 + i * 0.4, 0.02, z + 0.2); },
  indiasouth: (c, z) => { cyl(c.g, 0.14, 0.18, 0.06, GOLD, 1.1, 0, z, 10); cyl(c.g, 0.03, 0.04, 0.8, GOLD, 1.1, 0.06, z, 6); cyl(c.g, 0.18, 0.08, 0.06, GOLD, 1.1, 0.86, z, 10); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; cone(c.glow, 0.025, 0.1, '#ffb84a', 1.1 + Math.cos(a) * 0.15, 0.92, z + Math.sin(a) * 0.15, 4); } },
  mughal: (c, z) => { for (const s of [-1, 1]) diya(c, s * 1.1, 0.02, z + 0.2); box(c.g, 0.3, 0.6, 0.3, '#fbf7ee', 1.5, 0, z); diya(c, 1.5, 0.6, z, 0.8); },
  indonesia: (c, z) => { cyl(c.g, 0.04, 0.05, 1.6, '#c8a86a', 1.2, 0, z, 5); cyl(c.g, 0.08, 0.06, 0.2, '#8a6a3a', 1.2, 1.6, z, 6); cone(c.glow, 0.07, 0.3, '#ffa84a', 1.2, 1.8, z, 5); }, // an obor torch
  skyisles: (c, z) => { c.glow.add(new THREE.OctahedronGeometry(0.18).scale(0.6, 1.5, 0.6), '#bfe8ff', M(1.1, 0.9, z)); },
};

export function houseLights(c: Ctx, fp: Footprint): void {
  // A little in front of the door, on the path: the house's own small light.
  DOOR[c.s.id](c, Math.max(2.4, fp.r * 0.85));
}
