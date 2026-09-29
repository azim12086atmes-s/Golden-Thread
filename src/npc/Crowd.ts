import * as THREE from 'three';
import { HEAD_GAP } from '../characters/anatomy';
import { DIMS } from '../characters/CharacterModel';
import type { Outfit } from '../characters/modesty';

/**
 * How a town's crowd is drawn: every person in town (up to 300) as five shared instanced meshes
 * — lower garment, upper garment, patterned trim, skin (the floating head and the hands) and
 * hair or headwear. A handful of draw calls for the whole city. The nearest people are shown as
 * full figures instead (Townsfolk swaps them), so up close everyone is properly dressed.
 *
 * The rules hold here too: no face on anyone, the head floats `HEAD_GAP` clear of the collar,
 * and everyone is covered from the wrists to the ankles (the robe reaches the shoes, sleeves the
 * hands), whatever their land's colours.
 */

/** Unscaled heights, matching CharacterModel so full figures and crowd figures line up. */
export const CROWD_DIMS = {
  hem: 0.07,
  waist: DIMS.waist,
  collar: DIMS.neck,
  headR: DIMS.headR,
  headY: DIMS.neck + HEAD_GAP + DIMS.headR,
};

type Tint = [number, number, number];

/** Merge geometries, painting each one's vertices with its own tint (multiplied by the instance colour). */
function merge(parts: Array<[THREE.BufferGeometry, Tint]>): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], col: number[] = [];
  for (const [g, tint] of parts) {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.getAttribute('position'), n = ng.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(...tint);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

const W: Tint = [1, 1, 1];
const D = CROWD_DIMS;

/** Long garment from the waist to the ankle, with shoes peeping out below. */
function lowerGeo(): THREE.BufferGeometry {
  const robe = new THREE.CylinderGeometry(0.2, 0.31, D.waist + 0.05 - D.hem, 10).translate(0, (D.waist + 0.05 + D.hem) / 2, 0);
  const shoes = [-0.09, 0.09].map((x) => [new THREE.BoxGeometry(0.11, 0.07, 0.2).translate(x, 0.035, 0.06), [0.22, 0.18, 0.16] as Tint] as [THREE.BufferGeometry, Tint]);
  return merge([[robe, W], ...shoes]);
}

/** Shoulders, chest and two long sleeves hanging a little forward. */
function upperGeo(): THREE.BufferGeometry {
  const chest = new THREE.CylinderGeometry(0.19, 0.2, D.collar - D.waist + 0.02, 10).translate(0, (D.collar + D.waist) / 2, 0);
  const parts: Array<[THREE.BufferGeometry, Tint]> = [[chest, W]];
  for (const x of [-1, 1]) {
    const s = new THREE.CylinderGeometry(0.06, 0.075, 0.62, 7);
    s.rotateZ(x * 0.1);
    s.rotateX(-0.08);
    s.translate(x * 0.25, 1.06, 0.03);
    parts.push([s, W]);
  }
  return merge(parts);
}

/** The pattern: a hem band, a collar band, cuffs and a sash in the outfit's trim colour. */
function trimGeo(): THREE.BufferGeometry {
  const hem = new THREE.CylinderGeometry(0.305, 0.315, 0.09, 10, 1, true).translate(0, D.hem + 0.08, 0);
  const band = new THREE.CylinderGeometry(0.275, 0.29, 0.04, 10, 1, true).translate(0, D.hem + 0.22, 0);
  const collar = new THREE.CylinderGeometry(0.15, 0.19, 0.06, 10, 1, true).translate(0, D.collar - 0.02, 0);
  const sash = new THREE.CylinderGeometry(0.205, 0.205, 0.07, 10, 1, true).translate(0, D.waist + 0.02, 0);
  const parts: Array<[THREE.BufferGeometry, Tint]> = [[hem, W], [band, [0.8, 0.8, 0.8]], [collar, W], [sash, [0.9, 0.9, 0.9]]];
  for (const x of [-1, 1]) parts.push([new THREE.CylinderGeometry(0.078, 0.078, 0.05, 7, 1, true).translate(x * 0.28, 0.76, 0.05), W]);
  return merge(parts);
}

/** The floating head and the two hands (skin). No face — ever. */
function skinGeo(): THREE.BufferGeometry {
  const head = new THREE.SphereGeometry(D.headR, 10, 8).translate(0, D.headY, 0);
  const hands = [-1, 1].map((x) => [new THREE.SphereGeometry(0.05, 6, 5).translate(x * 0.28, 0.71, 0.06), W] as [THREE.BufferGeometry, Tint]);
  return merge([[head, W], ...hands]);
}

/** Hair, a cap or a headscarf: a shell over the top and back of the floating head only. */
function crownGeo(): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(D.headR * 1.1, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.62);
  g.translate(0, D.headY + 0.01, -0.012);
  return merge([[g, W]]);
}

export const CROWD_GEOS = { lower: lowerGeo(), upper: upperGeo(), trim: trimGeo(), skin: skinGeo(), crown: crownGeo() };
export const CROWD_PARTS = ['lower', 'upper', 'trim', 'skin', 'crown'] as const;

const MAT = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.88 });

/** The colours a crowd figure wears, taken from a real (modest) outfit of their land. */
export function crowdColours(o: Outfit, skin: string, hair: string): Record<(typeof CROWD_PARTS)[number], string> {
  const covered = o.head.style !== 'none' && o.head.style !== 'hair';
  return {
    lower: o.lowerColor,
    upper: o.outer?.color ?? o.topColor,
    trim: o.trim,
    skin,
    crown: covered ? o.head.color : hair,
  };
}

/** One town's instanced figures. Hidden slots are scaled to zero. */
export class CrowdMeshes {
  readonly meshes: THREE.InstancedMesh[];
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private zero = new THREE.Matrix4().makeScale(0, 0, 0);

  constructor(private scene: THREE.Object3D, readonly count: number, centre: THREE.Vector3, radius: number) {
    this.meshes = CROWD_PARTS.map((k) => {
      const im = new THREE.InstancedMesh(CROWD_GEOS[k], MAT, count);
      im.castShadow = false;
      im.receiveShadow = true;
      // People move about the whole town: one sphere round it is enough for frustum culling.
      im.boundingSphere = new THREE.Sphere(centre.clone(), radius);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(im);
      return im;
    });
  }

  paint(i: number, cols: Record<(typeof CROWD_PARTS)[number], string>): void {
    const c = new THREE.Color();
    CROWD_PARTS.forEach((k, j) => this.meshes[j].setColorAt(i, c.set(cols[k])));
  }

  finishPaint(): void {
    for (const im of this.meshes) if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }

  place(i: number, x: number, y: number, z: number, heading: number, sway: number, scale: number): void {
    this.q.setFromEuler(this.e.set(0, heading, sway));
    this.m.compose(this.v.set(x, y, z), this.q, this.s.setScalar(scale));
    for (const im of this.meshes) im.setMatrixAt(i, this.m);
  }

  hide(i: number): void {
    for (const im of this.meshes) im.setMatrixAt(i, this.zero);
  }

  commit(): void {
    for (const im of this.meshes) im.instanceMatrix.needsUpdate = true;
  }

  set visible(v: boolean) {
    for (const im of this.meshes) im.visible = v;
  }

  dispose(): void {
    for (const im of this.meshes) {
      this.scene.remove(im);
      im.dispose();
    }
  }
}
