import * as THREE from 'three';
import type { Ctx } from '../architecture';
import { M, box, cone, cyl, gable, sphere } from '../kit';
import type { RegionId } from '../regions';

/**
 * Each land farms in its own way (owner: "fields and barns in each land's farming style"):
 * how the field is bounded and watered, and what its barn or store is.
 */
type Bound = 'hedge' | 'drystone' | 'skigard' | 'picket' | 'bund' | 'channel' | 'mudridge' | 'snow' | 'glass';
type Barn = 'redbarn' | 'stonebarn' | 'hayloft' | 'stabbur' | 'lumbung' | 'kura' | 'choga' | 'granary' | 'dovecote' | 'mudstore' | 'thatch' | 'kerala' | 'greenhouse' | 'vertical';
const FARM: Record<RegionId, { bound: Bound; barn: Barn; paddy?: boolean; palms?: boolean }> = {
  meadow: { bound: 'picket', barn: 'redbarn' }, vintage: { bound: 'picket', barn: 'redbarn' },
  london: { bound: 'hedge', barn: 'stonebarn' }, renaissance: { bound: 'hedge', barn: 'stonebarn' },
  switzerland: { bound: 'drystone', barn: 'hayloft' }, norway: { bound: 'skigard', barn: 'stabbur' },
  newyork: { bound: 'glass', barn: 'vertical' }, aurora: { bound: 'snow', barn: 'greenhouse' },
  japan: { bound: 'bund', barn: 'kura', paddy: true }, korea: { bound: 'bund', barn: 'choga', paddy: true },
  china: { bound: 'bund', barn: 'granary', paddy: true }, indonesia: { bound: 'bund', barn: 'lumbung', paddy: true },
  indiasouth: { bound: 'bund', barn: 'kerala', paddy: true }, indianorth: { bound: 'mudridge', barn: 'thatch' },
  mughal: { bound: 'channel', barn: 'thatch' }, egypt: { bound: 'channel', barn: 'dovecote', palms: true },
  desert: { bound: 'channel', barn: 'mudstore', palms: true }, middleeast: { bound: 'channel', barn: 'mudstore', palms: true },
  islamic: { bound: 'channel', barn: 'mudstore', palms: true }, skyisles: { bound: 'glass', barn: 'greenhouse' },
};

/** The barn or store at BARN, in the land's own manner, its door facing +z, a lamp by the door. */
function landBarn(c: Ctx, kind: Barn, by: number): void {
  const g = c.g, { x, z, w, d, h } = BARN, front = z + d / 2;
  const lamp = (lx: number, ly: number) => sphere(c.glow, 0.18, c.s.glow, lx, ly, front + 0.2, 6);
  switch (kind) {
    case 'redbarn': // A red gambrel barn with white trim, a hay door high in the gable.
      box(g, w, h, d, '#b83a2a', x, by, z);
      for (const s of [-1, 1]) g.add(new THREE.BoxGeometry(w + 0.5, 0.2, d * 0.62), '#4a3a3a', M(x, by + h + 0.55, z + s * d * 0.3, 0, 1, 1, 1, s * -0.9, 0));
      gable(g, w + 0.5, d * 0.62, 1.2, '#4a3a3a', x, by + h + 1.0, z);
      box(g, 2.6, 2.6, 0.08, '#fbf7ee', x, by, front + 0.02); box(g, 2.3, 2.3, 0.1, '#b83a2a', x, by + 0.15, front + 0.03);
      for (const r of [-1, 1]) g.add(new THREE.BoxGeometry(0.1, 3.2, 0.12), '#fbf7ee', M(x, by + 1.3, front + 0.08, 0, 1, 1, 1, 0, r * 0.68));
      box(g, 1, 1, 0.08, '#fbf7ee', x, by + h - 0.2, front + 0.02);
      lamp(x + 1.8, by + 2.8); break;
    case 'stonebarn': // A long stone barn under clay tiles, a cart door with a timber lintel.
      box(g, w, h, d, '#b8ad98', x, by, z);
      for (let i = 0; i < 6; i++) box(g, w + 0.04, 0.06, d + 0.04, '#a89a84', x, by + 0.5 + i * 0.5, z);
      gable(g, w + 0.8, d + 0.8, 1.8, '#b5654a', x, by + h, z);
      box(g, 2.6, 2.6, 0.12, '#5a3a26', x, by, front + 0.03); box(g, 3, 0.35, 0.3, '#6b4a2a', x, by + 2.6, front + 0.1);
      lamp(x + 1.9, by + 2.8); break;
    case 'hayloft': // A Swiss hay barn: a stone byre below, a timber loft above under broad eaves.
      box(g, w, 1.6, d, '#a8a498', x, by, z); box(g, w, h - 1.6, d, '#a8784a', x, by + 1.6, z);
      for (let i = 0; i < 14; i++) box(g, 0.06, h - 1.6, 0.04, '#8a5a36', x - w / 2 + 0.25 + i * 0.5, by + 1.6, front + 0.02);
      gable(g, w + 2, d + 2.4, 1.6, '#8a5a3a', x, by + h, z);
      box(g, 2.2, 1.5, 0.1, '#5a3a26', x, by, front + 0.03); lamp(x + 1.8, by + 2.2); break;
    case 'stabbur': // A log storehouse raised on stone legs, its upper storey jutting out, turf on the roof.
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { cyl(g, 0.3, 0.35, 0.9, '#8a8478', x + dx * (w / 2 - 0.6), by, z + dz * (d / 2 - 0.5), 6); box(g, 0.5, 0.25, 0.5, '#8a8478', x + dx * (w / 2 - 0.6), by + 0.9, z + dz * (d / 2 - 0.5)); }
      for (let i = 0; i < 8; i++) box(g, w, 0.3, d, i % 2 ? '#7a4a2a' : '#6a3e22', x, by + 1.15 + i * 0.3, z);
      box(g, w + 0.8, 0.9, d + 0.8, '#6a3e22', x, by + 3.55, z);
      gable(g, w + 1.2, d + 1.4, 1.4, '#5a8a3a', x, by + 4.45, z);
      box(g, 1.1, 1.7, 0.1, '#4a2e1a', x, by + 1.2, front + 0.02); for (let i = 0; i < 3; i++) box(g, 1.2, 0.18, 0.4, '#8a6a4a', x, by + i * 0.4, front + 0.6 + (2 - i) * 0.35);
      lamp(x + 1, by + 2.6); break;
    case 'lumbung': // A Balinese rice barn: a saddle roof of thatch on four posts with rat-guard discs.
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { cyl(g, 0.15, 0.16, 2.2, '#5a3a22', x + dx * 1.6, by, z + dz * 1.2, 6); cyl(g, 0.45, 0.45, 0.06, '#8a8478', x + dx * 1.6, by + 1.6, z + dz * 1.2, 10); }
      box(g, 3.8, 0.3, 3, '#6a4a2a', x, by + 2.2, z);
      g.add(new THREE.CylinderGeometry(2.2, 2.2, 4.4, 12, 1, false, 0, Math.PI).rotateZ(Math.PI / 2), '#8a7a4a', M(x, by + 2.5, z, 0, 1, 1.6, 0.9));
      for (let i = 0; i < 3; i++) box(g, 1.4, 0.4, 0.05, ['#e8b84a', '#c8483a', '#2a2a2a'][i], x, by + 3.2 + i * 0.4, z + 1.35);
      lamp(x + 2.2, by + 1.8); break;
    case 'kura': // A kura: thick white plaster walls, a dark tiled base in a diamond grid, a tiled roof.
      box(g, w * 0.8, h, d, '#f2ede2', x, by, z);
      for (let i = 0; i < 10; i++) for (let j = 0; j < 3; j++) g.add(new THREE.BoxGeometry(0.4, 0.4, 0.04), '#3a3a40', M(x - w * 0.36 + i * 0.64, by + 0.4 + j * 0.5, front + 0.02, 0, 1, 1, 1, 0, Math.PI / 4));
      gable(g, w * 0.8 + 1, d + 1, 1.6, '#3a3a44', x, by + h, z);
      box(g, 1.4, 2, 0.12, '#2a2a30', x, by, front + 0.04); box(g, 1.6, 0.2, 0.3, '#f2ede2', x, by + 2.1, front + 0.1);
      lamp(x + 1.4, by + 2.4); break;
    case 'choga': // A Korean thatched barn: mud walls, a rounded straw roof roped down.
      box(g, w, h - 0.6, d, '#d8c8a8', x, by, z);
      g.add(new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(w * 0.62, 1.4, d * 0.72), '#c8b078', M(x, by + h - 0.7, z));
      for (let i = 0; i < 5; i++) g.add(new THREE.TorusGeometry(w * 0.5, 0.03, 3, 20, Math.PI).rotateY(Math.PI / 2), '#8a7a4a', M(x - w * 0.4 + i * w * 0.2, by + h - 0.7, z, 0, 1, 1.1, 1));
      box(g, 1.4, 1.9, 0.1, '#6b4a2a', x, by, front + 0.02); lamp(x + 1.6, by + 2.2); break;
    case 'granary': // A Chinese granary: rammed-earth walls, a tiled roof with upturned ends, raised vents.
      box(g, w, h, d, '#c8a878', x, by, z);
      for (let i = 0; i < 6; i++) box(g, w + 0.02, 0.05, d + 0.02, '#b8986a', x, by + 0.5 + i * 0.5, z);
      gable(g, w + 1, d + 1, 1.6, '#4a4a52', x, by + h, z);
      for (const s of [-1, 1]) cone(g, 0.2, 0.7, '#4a4a52', x + s * (w / 2 + 0.4), by + h + 0.1, z, 4);
      box(g, 1.6, 2.2, 0.1, '#b0322a', x, by, front + 0.02); lamp(x + 1.8, by + 2.6); break;
    case 'dovecote': // A Nile dovecote: a mud-brick store with a tall tapering pigeon tower studded with pots.
      box(g, w, h, d, '#c8a878', x, by, z); box(g, w + 0.2, 0.3, d + 0.2, '#d8b888', x, by + h, z);
      g.add(new THREE.CylinderGeometry(0.9, 1.6, 6, 10), '#d8b888', M(x - w / 2 + 1.4, by + h + 3, z));
      for (let i = 0; i < 24; i++) { const a = (i / 8) * Math.PI * 2, y = by + h + 0.8 + Math.floor(i / 8) * 1.6, r = 1.5 - Math.floor(i / 8) * 0.22; cyl(g, 0.1, 0.1, 0.25, '#8a5a3a', x - w / 2 + 1.4 + Math.cos(a) * r, y, z + Math.sin(a) * r, 6); }
      box(g, 1.4, 2, 0.1, '#4a3426', x + 1, by, front + 0.02); lamp(x + 2.4, by + 2.4); break;
    case 'mudstore': // A mud-brick store with rounded parapet crenels, palm-trunk beam ends, a studded door.
      box(g, w, h, d, '#d8b888', x, by, z);
      for (let i = 0; i < 8; i++) { box(g, 0.45, 0.4, 0.45, '#d8b888', x - w / 2 + 0.4 + i * 0.89, by + h, front - 0.25); sphere(g, 0.22, '#d8b888', x - w / 2 + 0.4 + i * 0.89, by + h + 0.4, front - 0.25, 6); }
      for (let i = 0; i < 6; i++) cyl(g, 0.1, 0.1, 0.4, '#6b4a2a', x - w / 2 + 0.8 + i * 1.1, by + h - 0.4, front + 0.1, 5);
      box(g, 1.6, 2.2, 0.1, '#6b4a2a', x, by, front + 0.02); for (let i = 0; i < 9; i++) sphere(g, 0.04, '#d4af37', x - 0.5 + (i % 3) * 0.5, by + 0.5 + Math.floor(i / 3) * 0.6, front + 0.08, 4);
      lamp(x + 1.6, by + 2.5); break;
    case 'thatch': // A mud-walled store under a thatched roof, painted with a white border, a veranda of posts.
      box(g, w, h - 0.6, d, '#c8906a', x, by, z); box(g, w + 0.02, 0.3, d + 0.02, '#fbf7ee', x, by + 0.3, z);
      g.add(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 0.8, 2, 4).rotateY(Math.PI / 4), '#b89a5a', M(x, by + h - 0.6 + 1, z, 0, 1, 1, d / w));
      for (const s of [-1, 1]) cyl(g, 0.1, 0.1, 2.2, '#6b4a2a', x + s * 2.2, by, front + 1, 5);
      box(g, 1.4, 1.9, 0.1, '#5a3a22', x, by, front + 0.02); lamp(x + 1.4, by + 2.2); break;
    case 'kerala': // A Kerala granary (pathayam) in timber under a steep tiled roof on a laterite plinth.
      box(g, w + 0.4, 0.7, d + 0.4, '#a8503a', x, by, z); box(g, w, h - 0.7, d, '#7a4a2a', x, by + 0.7, z);
      for (let i = 0; i < 12; i++) box(g, 0.06, h - 0.7, 0.04, '#5a3422', x - w / 2 + 0.3 + i * 0.58, by + 0.7, front + 0.02);
      g.add(new THREE.ConeGeometry(Math.hypot(w, d) / 2 + 1, 2.6, 4).rotateY(Math.PI / 4), '#a8503a', M(x, by + h + 1.3, z, 0, 1, 1, d / w));
      box(g, 1.2, 1.8, 0.1, '#4a2a1a', x, by + 0.7, front + 0.03); lamp(x + 1.5, by + 2.4); break;
    case 'greenhouse': // A glasshouse: a timber frame, glass lit warm from within, snow along the ridge.
      box(g, w, 0.4, d, '#6a4a30', x, by, z);
      for (let i = 0; i <= 6; i++) { const px = x - w / 2 + (i / 6) * w; for (const s of [-1, 1]) g.add(new THREE.BoxGeometry(0.1, 3.2, 0.1), '#6a4a30', M(px, by + 1.8, z + s * d * 0.25, 0, 1, 1, 1, s * 0.55, 0)); }
      for (const s of [-1, 1]) c.glow.add(new THREE.PlaneGeometry(w - 0.2, 3), '#cfe8d8', M(x, by + 1.8, z + s * d * 0.24, 0, 1, 1, 1, s * 0.55 - Math.PI / 2 * 0, 0));
      box(g, w, 0.2, 0.4, '#f4f8ff', x, by + 3.3, z);
      for (let i = 0; i < 6; i++) sphere(g, 0.25, '#5aa84f', x - w / 2 + 0.8 + i * 1.1, by + 0.6, z, 6);
      break;
    case 'vertical': // A vertical farm: a glass tower of growing trays, solar panels on top.
      box(g, 5, 9, 4, '#dfe8ee', x, by, z);
      for (let i = 0; i < 7; i++) { c.glow.add(new THREE.BoxGeometry(4.6, 0.06, 0.06), '#e0b8ff', M(x, by + 1 + i * 1.2, z + 2.05)); box(g, 4.6, 0.3, 3.6, '#4f9a4a', x, by + 0.7 + i * 1.2, z); }
      for (let i = 0; i < 3; i++) g.add(new THREE.BoxGeometry(1.5, 0.08, 3.6), '#2a3a6a', M(x - 1.6 + i * 1.6, by + 9.3, z, 0, 1, 1, 1, 0.35, 0));
      break;
  }
}

/** The field's edge in the land's manner. */
function boundary(c: Ctx, kind: Bound, half: number, ground: (x: number, z: number) => number): void {
  const g = c.g;
  const run = (fn: (x: number, z: number, along: 'x' | 'z') => void, step: number) => {
    for (let t = -half; t <= half; t += step) { fn(t, -half, 'x'); fn(t, half, 'x'); fn(-half, t, 'z'); fn(half, t, 'z'); }
  };
  switch (kind) {
    case 'hedge': run((x, z) => sphere(g, 0.8, '#3f6a32', x, ground(x, z) + 0.5, z, 6, 0.8), 1.2); break;
    case 'drystone': run((x, z, a) => box(g, a === 'x' ? 1.3 : 0.7, 0.9, a === 'x' ? 0.7 : 1.3, (Math.round(x + z) % 2) ? '#a8a498' : '#9a968a', x, ground(x, z), z), 1.2); break;
    case 'skigard': run((x, z, a) => g.add(new THREE.CylinderGeometry(0.04, 0.04, 1.6, 4), '#9a7a52', M(x, ground(x, z) + 0.7, z, a === 'x' ? 0 : Math.PI / 2, 1, 1, 1, 0, 0.7)), 0.45); break;
    case 'picket': run((x, z) => { box(g, 0.1, 1, 0.1, '#fbf7ee', x, ground(x, z), z); }, 0.5); break;
    case 'bund': run((x, z, a) => box(g, a === 'x' ? 2.1 : 0.6, 0.35, a === 'x' ? 0.6 : 2.1, '#6a5a3a', x, ground(x, z), z), 2); break;
    case 'channel': run((x, z, a) => { box(g, a === 'x' ? 2.05 : 0.9, 0.3, a === 'x' ? 0.9 : 2.05, '#b8a888', x, ground(x, z) - 0.05, z); box(g, a === 'x' ? 2.05 : 0.5, 0.05, a === 'x' ? 0.5 : 2.05, '#4a8aa8', x, ground(x, z) + 0.22, z); }, 2); break;
    case 'mudridge': run((x, z, a) => box(g, a === 'x' ? 2.05 : 0.8, 0.45, a === 'x' ? 0.8 : 2.05, '#9a6a4a', x, ground(x, z), z), 2); break;
    case 'snow': run((x, z) => sphere(g, 0.7, '#f4f8ff', x, ground(x, z), z, 6, 0.5), 1.3); break;
    case 'glass': run((x, z, a) => { box(g, a === 'x' ? 2 : 0.08, 1, a === 'x' ? 0.08 : 2, '#cfe0ea', x, ground(x, z), z); }, 2); break;
  }
}

/** How a field looks now: its crop (colours and habit from housing.ts `CROPS`), how grown, whose. */
export interface FieldLook {
  crop: { leaf: string; ripe: string; shape: 'stalk' | 'bush' | 'vine' | 'flower' } | null;
  /** 0..1; ripe at 1. */
  growth: number;
  /** Owned fields are tilled; open ones are grass with stakes and a sign. */
  owned: boolean;
}

/** Where the barn stands in the field's local frame (the side facing the avenue), and its size. */
export const BARN = { x: -13, z: -16, w: 7, d: 4.5, h: 3.4 } as const;

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §21): a field of `size` × `size`
 * metres centred on the origin, in the land `c.s`'s own farming style (paddy terraces and bunds in
 * Nusa Rinjani and Kaveri Coast, hedged strips in Old London, stone walls in Alpenrose, irrigation
 * channels and palms in the desert lands, …). Eight rows of the crop along x, drawn by habit and
 * growth; the barn or store at `BARN` in that land's style (a rice barn, a hay barn, a mud-brick
 * store, a tent store). `ground(x, z)` is the terrain height at a local point relative to the
 * origin — sit everything on it. Lit parts in `c.glow` (a lamp by the barn door).
 *
 * Built in each land's manner (FARM above): paddies flooded between bunds in the rice lands,
 * hedgerows in England, dry-stone walls in the Alps, a roundpole fence in Norway, irrigation
 * channels and date palms in the desert lands; a red gambrel barn, a stone barn, a Swiss hayloft,
 * a stabbur, a lumbung, a kura, a choga, a granary, a Nile dovecote, a mud store, a thatched store,
 * a Kerala pathayam, a glasshouse or a vertical farm.
 */
export function buildField(c: Ctx, size: number, look: FieldLook, ground: (x: number, z: number) => number): void {
  const half = size / 2;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) cyl(c.g, 0.1, 0.12, 1.2, '#8a6444', sx * (half - 0.5), ground(sx * (half - 0.5), sz * (half - 0.5)), sz * (half - 0.5), 5);
  if (!look.owned) {
    // Open land for sale: a signpost by the barn's corner.
    const y = ground(BARN.x, BARN.z + 3);
    cyl(c.g, 0.08, 0.08, 2, '#6b4a2a', BARN.x, y, BARN.z + 3, 5);
    box(c.g, 1.8, 0.8, 0.1, '#e8c48a', BARN.x, y + 1.6, BARN.z + 3);
    return;
  }
  // The barn or store, the field's edge, flooded paddies and palms, in the land's own manner.
  const farm = FARM[c.s.id];
  landBarn(c, farm.barn, ground(BARN.x, BARN.z));
  boundary(c, farm.bound, half - 0.3, ground);
  if (farm.paddy) for (let i = 0; i < 4; i++) {
    const z = -half + 9 + (i + 0.5) * ((size - 12) / 4);
    box(c.g, size - 6, 0.04, (size - 12) / 4 - 0.8, '#6a9aa0', 0, ground(0, z) + 0.06, z);
    box(c.g, size - 6, 0.25, 0.5, '#6a5a3a', 0, ground(0, z), z + (size - 12) / 8);
  }
  if (farm.palms) for (const [px, pz] of [[half - 3, -half + 3], [half - 3, half - 3], [-half + 3, half - 3]] as const) {
    const y = ground(px, pz);
    for (let i = 0; i < 6; i++) cyl(c.g, 0.22 - i * 0.02, 0.24 - i * 0.02, 1.1, i % 2 ? '#8a6a4a' : '#7a5a3a', px + i * 0.06, y + i * 1.1, pz, 6);
    for (let i = 0; i < 8; i++) c.g.add(new THREE.BoxGeometry(0.45, 0.04, 2.4).translate(0, 0, 1.2).rotateX(0.5 + (i % 2) * 0.2), '#4f8c42', M(px + 0.36, y + 6.6, pz, (i / 8) * Math.PI * 2));
    for (let i = 0; i < 5; i++) sphere(c.g, 0.13, '#c8883a', px + 0.36 + Math.cos(i * 1.3) * 0.3, y + 6.3, pz + Math.sin(i * 1.3) * 0.3, 5);
  }
  // A scarecrow in the middle rows: a straw hat, a coat on a cross of sticks — no face.
  { const sy = ground(half - 8, 0); cyl(c.g, 0.05, 0.06, 2.2, '#8a6444', half - 8, sy, 0, 4); box(c.g, 1.6, 0.08, 0.08, '#8a6444', half - 8, sy + 1.7, 0); box(c.g, 0.7, 0.9, 0.3, c.s.trims[0], half - 8, sy + 1.05, 0); sphere(c.g, 0.2, '#e8d8a8', half - 8, sy + 2.2 + 0.16, 0, 6); cone(c.g, 0.45, 0.3, '#c8a860', half - 8, sy + 2.5, 0, 10); }
  // Eight tilled rows along x, each a ridge of soil with plants along it.
  const rows = 8, rowGap = (size - 12) / rows, x0 = -half + 3, x1 = half - 3;
  for (let i = 0; i < rows; i++) {
    const z = -half + 9 + (i + 0.5) * rowGap;
    for (let x = x0; x < x1; x += 4) box(c.g, 4, 0.18, 1.1, '#6b4a33', x + 2, ground(x + 2, z) - 0.04, z);
    const cr = look.crop;
    if (!cr) continue;
    const g = Math.max(0.08, Math.min(1, look.growth)), ripe = look.growth >= 1;
    for (let x = x0 + 1; x < x1; x += 1.6) {
      const y = ground(x, z) + 0.14, j = ((i * 7 + Math.round(x * 3)) % 5) * 0.06;
      switch (cr.shape) {
        case 'stalk':
          cyl(c.g, 0.03, 0.05, 0.3 + g * 1.0 + j, ripe ? cr.ripe : cr.leaf, x, y, z, 4);
          if (g > 0.6) cone(c.g, 0.09, 0.3, ripe ? cr.ripe : cr.leaf, x, y + 0.3 + g * 1.0 + j, z, 4);
          break;
        case 'bush':
          sphere(c.g, 0.14 + g * 0.3, cr.leaf, x, y + 0.1 + g * 0.2, z, 6, 0.8);
          if (ripe) sphere(c.g, 0.08, cr.ripe, x + 0.15, y + 0.3 + g * 0.25, z + 0.12, 5);
          break;
        case 'vine':
          sphere(c.g, 0.2 + g * 0.35, cr.leaf, x, y, z, 6, 0.35);
          if (g > 0.7) sphere(c.g, 0.1 + (ripe ? 0.12 : 0), ripe ? cr.ripe : '#9ac85a', x + 0.2, y + 0.08, z, 6, 0.8);
          break;
        case 'flower':
          cyl(c.g, 0.025, 0.03, 0.25 + g * 0.8, cr.leaf, x, y, z, 4);
          if (g > 0.5) sphere(c.g, 0.1 + g * 0.08, ripe ? cr.ripe : cr.leaf, x, y + 0.3 + g * 0.8, z, 6, 0.5);
          break;
      }
    }
  }
}
