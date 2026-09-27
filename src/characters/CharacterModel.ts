import * as THREE from 'three';
import { heldBalloon } from '../world/models/balloons';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { HEAD_GAP, type Part } from './anatomy';
import { fabricMaterial, tileUVs } from './fabric';
import { Jetpack } from './jetpack';
import { JET_REACH } from './jetpack';
import { WING_REACH, Wings } from './wings';
import type { Hem, Outfit, TopStyle } from './modesty';

/**
 * A traveller: soft rounded forms, a floating head with no face, fully covering clothing.
 * Every mesh is tagged with `userData.part` (see anatomy.ts); eyes, nose and mouth are never built; hero identity follows GT-CHAR-001.
 */

const matCache = new Map<string, THREE.Material>();
function mat(color: string, glow = false): THREE.Material {
  const key = color + (glow ? ':g' : '');
  let m = matCache.get(key);
  if (!m) {
    m = glow
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.6), toneMapped: false })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.85, side: THREE.DoubleSide });
    matCache.set(key, m);
  }
  return m;
}

/** Fabric that glows softly from within (for a gown that should shine at night). */
function glowingFabric(color: string, k: number): THREE.Material {
  const key = `${color}:e${k}`;
  let m = matCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, side: THREE.DoubleSide, emissive: new THREE.Color(color), emissiveIntensity: k });
    matCache.set(key, m);
  }
  return m;
}

function mesh(geo: THREE.BufferGeometry, color: string, part: Part, glow = false): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(color, glow));
  m.userData.part = part;
  m.castShadow = true;
  return m;
}

const SKIRTS: string[] = ['skirt', 'straight-skirt', 'hakama', 'wrap'];

/** A turned shape from (radius, y) pairs, bottom to top. */
const lathe = (prof: number[][], seg = 12) => new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), seg);

/**
 * A trouser leg shaped like a leg inside loose cloth: full through the thigh, easing in at the
 * knee, a rounded calf and a narrow ankle (salwar stays full to a gathered cuff). Top at y = 0.
 */
function trouserLeg(hip: number, loose: boolean): THREE.BufferGeometry {
  return lathe(loose
    ? [[0.058, -hip], [0.07, -hip + 0.05], [0.108, -hip + 0.26], [0.118, -hip * 0.45], [0.112, -0.1], [0.104, 0]]
    : [[0.056, -hip], [0.06, -hip + 0.07], [0.072, -hip + 0.26], [0.066, -hip * 0.52], [0.082, -hip * 0.34], [0.094, -0.08], [0.09, 0]]);
}

/**
 * A head with a real shape rather than a ball: the crown and the back of the skull flatter, meeting
 * in a rounded curve; the lower face narrowing into a jaw and a chin that comes a little forward
 * (squarer for him). Built from a sphere by moving its points, so it stays smooth. Front is +z.
 * `grow` makes a slightly larger shell of the same shape (hair, scarf, beard), `keep` drops the
 * triangles whose sphere direction it rejects (to open a face in a scarf, or cut a beard).
 */
export function headGeometry(r: number, square: boolean, grow = 1, keep?: (nx: number, ny: number, nz: number) => boolean, seg: [number, number] = [28, 20]): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r * grow, seg[0], seg[1]).toNonIndexed();
  const p = g.getAttribute('position');
  const dirs = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const R = r * grow;
    let nx = p.getX(i) / R, ny = p.getY(i) / R, nz = p.getZ(i) / R;
    dirs[i * 3] = nx; dirs[i * 3 + 1] = ny; dirs[i * 3 + 2] = nz;
    let x = nx, y = ny, z = nz;
    // A flatter crown and a flatter back of the head, with a rounded meeting between them.
    if (y > 0.5) y = 0.5 + (y - 0.5) * 0.62;
    if (z < -0.45) z = -0.45 + (z + 0.45) * 0.55;
    // The lower face: narrower towards the chin, a little longer, the chin forward.
    if (ny < 0) {
      const k = -ny;
      const taper = square ? 1 - 0.2 * Math.pow(k, 2.2) : 1 - 0.3 * Math.pow(k, 1.5);
      x *= taper;
      y *= 1 + 0.14 * k;
      if (nz > 0) z += 0.1 * k * nz;
      // The jaw's corner: a squarer line under the ears for him.
      if (square && nz < 0.4 && nz > -0.3) x *= 1 + 0.06 * k;
    }
    p.setXYZ(i, x * R, y * R, z * R);
  }
  if (keep) {
    const pos: number[] = [];
    for (let t = 0; t < p.count; t += 3) {
      let ok = true;
      for (let k = 0; k < 3 && ok; k++) ok = keep(dirs[(t + k) * 3], dirs[(t + k) * 3 + 1], dirs[(t + k) * 3 + 2]);
      if (ok) for (let k = 0; k < 3; k++) pos.push(p.getX(t + k), p.getY(t + k), p.getZ(t + k));
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    out.computeVertexNormals();
    return out;
  }
  g.deleteAttribute('normal');
  const merged = mergeVertices(g);
  merged.computeVertexNormals();
  return merged;
}

/** Hair: over the crown, down the back to the nape and over the ears, a hairline above the brow. */
const inHair = (nx: number, ny: number, nz: number) =>
  nz > 0.3 ? ny > 0.52 : nz < -0.2 ? ny > -0.62 : Math.abs(nx) > 0.6 ? ny > -0.08 : ny > 0.2;
/** A beard: jaw, chin and the lower cheeks, round to below the ears. */
const inBeard = (_nx: number, ny: number, nz: number) => nz > -0.35 && ny < (nz > 0.55 ? -0.3 : -0.14);

/** The face: an oval from the brow down to just under the chin, inside a scarf's opening. */
const inFace = (nx: number, ny: number, nz: number) => nz > 0.15 && (nx / 0.7) ** 2 + ((ny + 0.12) / 0.74) ** 2 < 1;

/** A fitted sleeve that follows the arm: shoulder, upper arm, elbow, forearm, wrist. Top at y = 0. */
function fittedSleeve(len: number): THREE.BufferGeometry {
  return lathe([[0.047, -len], [0.052, -len + 0.08], [0.06, -len * 0.62], [0.058, -len * 0.5], [0.07, -len * 0.3], [0.077, -0.06], [0.068, 0]], 10);
}
const RAINBOW = ['#ff6b8b', '#ffb347', '#fff27a', '#7dffa8', '#6bc8ff', '#b99bff'];

/** A trouser leg that is looser through the thigh and opens below the knee. Top at y = 0. */
function flaredLeg(kind: 'bell' | 'flared', hip: number): THREE.BufferGeometry {
  const prof = kind === 'bell'
    ? [[0.14, -hip], [0.112, -hip + 0.2], [0.082, -hip + 0.36], [0.088, -0.22], [0.094, 0]]
    : [[0.118, -hip], [0.098, -hip + 0.16], [0.083, -hip + 0.32], [0.088, -0.22], [0.093, 0]];
  return new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 10);
}

const HEM_Y: Record<Hem, number> = { floor: 0.03, ankle: 0.09, midi: 0.42, knee: 0.52, thigh: 0.66, mini: 0.72 };

interface TopInfo { long: boolean; flare: number; band?: 'obi' | 'sash' | 'belt' | 'ribbon'; collar: 'cross' | 'round' | 'high' | 'hood' | 'fur' }
const TOP: Record<TopStyle, TopInfo> = {
  tunic: { long: true, flare: 0.3, collar: 'round' },
  kimono: { long: true, flare: 0.26, band: 'obi', collar: 'cross' },
  jeogori: { long: false, flare: 0, band: 'ribbon', collar: 'cross' },
  hanfu: { long: true, flare: 0.44, band: 'sash', collar: 'cross' },
  anarkali: { long: true, flare: 0.56, collar: 'round' },
  kurta: { long: true, flare: 0.25, collar: 'high' },
  sherwani: { long: true, flare: 0.27, collar: 'high' },
  abaya: { long: true, flare: 0.42, collar: 'round' },
  thobe: { long: true, flare: 0.3, collar: 'high' },
  bodice: { long: false, flare: 0, band: 'belt', collar: 'round' },
  coat: { long: true, flare: 0.3, band: 'belt', collar: 'high' },
  hoodie: { long: true, flare: 0.24, collar: 'hood' },
  gown: { long: true, flare: 0.52, band: 'belt', collar: 'round' },
  doublet: { long: true, flare: 0.3, band: 'belt', collar: 'high' },
  parka: { long: true, flare: 0.32, collar: 'fur' },
  robe: { long: true, flare: 0.46, band: 'sash', collar: 'cross' },
  suit: { long: true, flare: 0.22, band: 'belt', collar: 'high' },
  angrakha: { long: true, flare: 0.46, band: 'sash', collar: 'cross' },
  kebaya: { long: false, flare: 0, collar: 'round' },
  blouse: { long: false, flare: 0, collar: 'round' },
};

export interface Dimensions {
  hip: number;
  waist: number;
  shoulder: number;
  neck: number;
  headR: number;
}

export const DIMS: Dimensions = { hip: 0.82, waist: 0.95, shoulder: 1.36, neck: 1.4, headR: 0.155 };

/** Mid-chest height on the unscaled body: 60% of the way from the waist to the shoulder line. */
export const CHEST_MID = DIMS.waist + 0.6 * (DIMS.shoulder - DIMS.waist);
/** Eye line on the unscaled body. There are no eyes, ever; this is the floating head's centre. */
export const EYE_LINE = DIMS.neck + HEAD_GAP + DIMS.headR;
/** Forehead height on the unscaled body: the upper part of the floating head. */
export const FOREHEAD = EYE_LINE + 0.45 * DIMS.headR;
/** Top of the shoulder line on the unscaled body. */
export const SHOULDER_TOP = DIMS.shoulder + 0.05;
/**
 * The travellers' sizes (owner's proportion): standing together, her forehead comes to just
 * below his shoulder, 2 cm under it. girl × FOREHEAD = boy × SHOULDER_TOP − 0.02.
 */
export const HERO_SCALE = { boy: 1.08, girl: (1.08 * SHOULDER_TOP - 0.02) / FOREHEAD } as const;

export interface AnimState {
  speed: number;
  airborne: boolean;
  riding: boolean;
  t: number;
}

const _bq = new THREE.Quaternion(), _sway = new THREE.Quaternion(), _se = new THREE.Euler();

export class CharacterModel {
  readonly root = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private body = new THREE.Group();
  readonly head = new THREE.Group();
  private cape?: THREE.Object3D;
  /** Her stained-glass wings, or his jetpack, when the outfit has them. */
  private wings?: Wings;
  private jetpack?: Jetpack;
  private phase = 0;
  /** World-space anchor for the golden thread (the hand). */
  readonly handAnchor = new THREE.Object3D();
  /** The cape's cloth, rippled every frame (base = rest positions). */
  private capeCloth?: { mesh: THREE.Mesh; base: Float32Array; len: number };
  /** 0..1: raises the free hand (the one not holding the thread) forward, palm up, to offer something. */
  offer = 0;
  /** A balloon held in the free hand (children on festive days), kept upright as they move. */
  private balloon: THREE.Group | null = null;
  private balloonColour: string | null = null;
  /** Added to the offering arm's forward angle: negative lifts it higher, positive lowers it. */
  offerLift = 0;

  constructor(
    public outfit: Outfit,
    private skin: string,
    private scale = 1,
    /** Which hand holds the thread: +1 = the +X hand, -1 = the -X hand. */
    private threadHand: 1 | -1 = 1,
    private identity: 'girl' | 'boy' | null = null,
  ) {
    this.root.add(this.body);
    this.build();
  }

  /** Whether wings or a jetpack are worn (indoors they are left at the door). */
  private backShown = true;

  /** Leave the wings or jetpack off (rooms are too small for them). */
  hideBack(): void {
    if (!this.backShown) return;
    this.backShown = false;
    this.setOutfit(this.outfit);
  }

  /** Fold the wings in to reach no further than `room` metres (safety whenever the two come close). */
  setBackRoom(room: number): void {
    if (!this.wings) return;
    this.wings.group.scale.setScalar(THREE.MathUtils.clamp(room / (WING_REACH * this.scale), 0.15, 1));
  }

  /** How far from this person's centre their wings or jetpack reach, in metres (0 without them). */
  backReach(): number {
    if (!this.backShown) return 0;
    const back = this.outfit.detail?.back;
    return (back === 'wings' ? WING_REACH : back === 'jetpack' ? JET_REACH : 0) * this.scale;
  }

  setOutfit(o: Outfit): void {
    this.outfit = o;
    this.body.clear();
    this.legL.clear(); this.legR.clear(); this.armL.clear(); this.armR.clear(); this.head.clear();
    this.cape = undefined;
    this.capeCloth = undefined;
    this.wings = undefined;
    this.jetpack = undefined;
    this.build();
  }

  private build(): void {
    const o = this.outfit, D = DIMS, info = TOP[o.top];
    const b = this.body;
    b.scale.setScalar(this.scale);

    // Legs — always covered to the ankle (modesty invariant): trousers are the base layer.
    const legGeo = o.detail?.legs ? flaredLeg(o.detail.legs, D.hip) : trouserLeg(D.hip, o.lower === 'salwar');
    for (const [leg, x] of [[this.legL, -0.1], [this.legR, 0.1]] as const) {
      leg.position.set(x, D.hip, 0);
      leg.add(mesh(legGeo.clone(), o.underTrousers, 'leg'));
      // A rounded shoe: toe cap and heel.
      const shoe = new THREE.SphereGeometry(0.06, 10, 6);
      shoe.scale(0.95, 0.62, 1.9);
      const foot = mesh(shoe, '#3a2a22', 'foot');
      foot.position.set(0, -D.hip + 0.036, 0.045);
      leg.add(foot);
      b.add(leg);
    }

    // Lower garment.
    const hemY = HEM_Y[o.length];
    if (o.lower === 'skirt' || o.lower === 'hakama' || o.lower === 'straight-skirt' || o.lower === 'wrap') {
      const top = o.top === 'jeogori' ? D.shoulder - 0.2 : D.waist;
      const rb = o.lower === 'skirt' ? 0.42 : o.lower === 'hakama' ? 0.34 : 0.25;
      const skirt = new THREE.CylinderGeometry(0.19, rb, top - hemY, 12, 1, true);
      skirt.translate(0, (top + hemY) / 2, 0);
      b.add(mesh(skirt, o.lowerColor, 'garment'));
      this.hemTrim(b, rb, hemY, o.trim);
      this.decorate(b, rb, hemY, top, o.lowerColor);
      if (o.detail?.vines) this.vines(b, 0.19, rb, top, hemY);
    }

    // Torso, and the long body of the top if it has one.
    // A body shape under the cloth: waist, ribs, a fuller chest and rounded shoulders, oval in section.
    const w = D.waist, sh = D.shoulder;
    const torso = lathe([[0.168, w - 0.03], [0.16, w + 0.05], [0.172, w + 0.18], [0.19, sh - 0.14], [0.196, sh - 0.06], [0.175, sh + 0.01], [0.1, sh + 0.05]], 14);
    torso.scale(1, 1, 0.8);
    b.add(mesh(torso, o.topColor, 'torso'));
    const shoulders = new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    shoulders.scale(1.1, 0.35, 0.8);
    shoulders.translate(0, D.shoulder, 0);
    b.add(mesh(shoulders, o.topColor, 'torso'));

    if (info.long) {
      const longHem = o.lower === 'none' ? HEM_Y[o.hem] : Math.max(hemY, o.lower === 'skirt' ? 0.5 : hemY);
      const rb = 0.18 + (o.detail?.hemFlare ?? info.flare) * (1 - longHem / D.waist) * 0.8;
      const body = new THREE.CylinderGeometry(0.17, rb, D.waist - longHem, 12, 1, true);
      body.translate(0, (D.waist + longHem) / 2, 0);
      b.add(mesh(body, o.topColor, 'garment'));
      this.hemTrim(b, rb, longHem, o.trim);
      // Motifs go on the long top unless a decorated skirt shows below it.
      if (o.lower === 'none' || !SKIRTS.includes(o.lower)) this.decorate(b, rb, longHem, D.waist, o.topColor);
    }
    if (o.detail?.ribbon) this.ribbon(b, o.detail.ribbon);

    // Waist band.
    if (info.band) {
      const h = info.band === 'obi' ? 0.14 : 0.05;
      const band = new THREE.CylinderGeometry(0.182, 0.182, h, 10);
      band.translate(0, info.band === 'ribbon' ? D.shoulder - 0.2 : D.waist + 0.02, 0);
      b.add(mesh(band, info.band === 'obi' ? o.trim : o.outer?.style === 'sash' ? o.outer.color : o.trim, 'trim', o.pattern === 'glow'));
      if (info.band === 'ribbon' || info.band === 'sash') {
        const tail = new THREE.BoxGeometry(0.05, 0.36, 0.02);
        tail.translate(0.05, (info.band === 'ribbon' ? D.shoulder - 0.2 : D.waist) - 0.18, 0.19);
        b.add(mesh(tail, o.trim, 'trim'));
      }
    }

    // Collar.
    const collarGeo = info.collar === 'fur'
      ? new THREE.TorusGeometry(0.13, 0.05, 6, 12)
      : new THREE.CylinderGeometry(0.1, 0.13, info.collar === 'high' ? 0.06 : 0.03, 10);
    if (info.collar === 'fur') collarGeo.rotateX(Math.PI / 2);
    collarGeo.translate(0, D.shoulder + (info.collar === 'fur' ? 0.03 : 0), 0);
    b.add(mesh(collarGeo, info.collar === 'fur' ? '#f4f1ea' : o.trim, 'trim', o.pattern === 'glow'));
    if (info.collar === 'cross') {
      const lapel = new THREE.BoxGeometry(0.05, 0.36, 0.02);
      lapel.rotateZ(0.5);
      lapel.translate(0, D.shoulder - 0.14, 0.18);
      b.add(mesh(lapel, o.trim, 'trim'));
    }

    // Arms — full sleeves always; merged under-sleeves when the reference was short-sleeved.
    for (const [arm, s] of [[this.armL, -1], [this.armR, 1]] as const) {
      arm.position.set(s * 0.24, D.shoulder - 0.02, 0);
      const len = 0.58;
      const rEnd = o.sleeveShape === 'wide' ? 0.17 : o.sleeveShape === 'bell' ? 0.12 : 0.065;
      let sleeve: THREE.BufferGeometry;
      if (o.sleeveShape === 'fitted') sleeve = fittedSleeve(len);
      else { sleeve = new THREE.CylinderGeometry(0.075, rEnd, len, 10, 1, true); sleeve.translate(0, -len / 2, 0); }
      const outerColor = o.merged.includes('full sleeves') ? o.topColor : o.topColor;
      arm.add(mesh(sleeve, outerColor, 'sleeve'));
      if (o.merged.includes('full sleeves')) {
        // The reference's short sleeve stays visible over a covering under-sleeve.
        const under = new THREE.CylinderGeometry(0.066, 0.062, len, 8);
        under.translate(0, -len / 2, 0);
        arm.children[0].scale.set(1.05, 0.35, 1.05);
        arm.add(mesh(under, o.underSleeve, 'sleeve'));
      }
      const cuff = new THREE.CylinderGeometry(rEnd + 0.008, rEnd + 0.008, 0.04, 8, 1, true);
      cuff.translate(0, -len + 0.02, 0);
      arm.add(mesh(cuff, o.trim, 'trim', o.pattern === 'glow'));
      if (o.detail?.cuffs) {
        // A deep turned-back cuff, slightly flared, with two buttons on the outer side.
        const deep = new THREE.CylinderGeometry(rEnd + 0.016, rEnd + 0.024, 0.11, 10, 1, true);
        deep.translate(0, -len + 0.06, 0);
        arm.add(mesh(deep, o.detail.cuffs, 'trim'));
        for (const dy of [0.035, 0.08]) {
          const bt = mesh(new THREE.SphereGeometry(0.011, 5, 4), o.detail.buttons ?? o.detail.cuffs, 'trim');
          bt.position.set(s * (rEnd + 0.026), -len + dy, 0);
          arm.add(bt);
        }
      }
      // A hand: a flattened palm with the fingers together, and a thumb.
      const palm = new THREE.SphereGeometry(0.05, 10, 8);
      palm.scale(0.78, 1.45, 0.5);
      const hand = mesh(palm, this.skin, 'hand');
      hand.position.y = -len - 0.05;
      arm.add(hand);
      const thumb = mesh(new THREE.SphereGeometry(0.018, 8, 6).scale(1, 1.8, 1), this.skin, 'hand');
      thumb.position.set(-s * 0.012, -len - 0.035, 0.03);
      thumb.rotation.x = 0.5;
      arm.add(thumb);
      arm.rotation.z = s * 0.12;
      b.add(arm);
    }
    this.handAnchor.position.set(0, -0.63, 0);
    (this.threadHand > 0 ? this.armR : this.armL).add(this.handAnchor);

    this.buildOuter(b);
    if (o.detail?.back === 'wings' && this.backShown) { this.wings = new Wings(); b.add(this.wings.group); }
    if (o.detail?.back === 'jetpack' && this.backShown) { this.jetpack = new Jetpack(); b.add(this.jetpack.group); }
    this.buildHead(b);
    this.buildCrown();
    const shine = o.detail?.glow;
    if (typeof document !== 'undefined') {
      // The cloth as a picture: the outfit's pattern painted in its colours, glowing where it should.
      const glow = shine ?? (o.pattern === 'glow' ? 0.35 : o.pattern === 'stars' ? 0.12 : 0);
      b.traverse((x) => {
        const mm = x as THREE.Mesh, part = mm.userData.part;
        if (!mm.isMesh || !['garment', 'torso', 'sleeve', 'cape', 'leg'].includes(part)) return;
        const c = (mm.material as THREE.MeshStandardMaterial).color;
        if (!c) return;
        const hex = `#${c.getHexString()}`;
        const m = fabricMaterial(part === 'leg' ? 'none' : o.pattern, hex, o.trim, part === 'leg' ? 0 : glow);
        if (!m) return;
        tileUVs(mm.geometry, 0.34, o.pattern === 'bands' && part !== 'leg');
        mm.material = m;
      });
    } else if (shine) b.traverse((x) => {
      const mm = x as THREE.Mesh;
      if (!mm.isMesh || !['garment', 'torso', 'sleeve'].includes(mm.userData.part)) return;
      const c = (mm.material as THREE.MeshStandardMaterial).color;
      if (c) mm.material = glowingFabric(`#${c.getHexString()}`, shine);
    });
    this.buildIdentity();
  }

  private hemTrim(b: THREE.Group, r: number, y: number, color: string): void {
    const t = new THREE.CylinderGeometry(r + 0.006, r + 0.01, 0.05, 12, 1, true);
    t.translate(0, y + 0.025, 0);
    b.add(mesh(t, color, 'trim', this.outfit.pattern === 'glow' || this.outfit.pattern === 'stars'));
    if (this.outfit.detail?.rainbow) {
      RAINBOW.forEach((col, i) => {
        const ring = new THREE.CylinderGeometry(r * (0.985 - i * 0.012), r * (0.99 - i * 0.012), 0.018, 16, 1, true);
        ring.translate(0, y + 0.07 + i * 0.02, 0);
        b.add(mesh(ring, col, 'trim', true));
      });
    }
    if (this.outfit.pattern === 'bands' || this.outfit.pattern === 'stripes') {
      const t2 = new THREE.CylinderGeometry(r * 0.9, r * 0.94, 0.03, 12, 1, true);
      t2.translate(0, y + 0.12, 0);
      b.add(mesh(t2, color, 'trim'));
    }
  }

  /** Rainbow branches winding down a skirt, with side twigs ending in little blossoms. */
  private vines(b: THREE.Group, rTop: number, rBot: number, yTop: number, yBot: number): void {
    const at = (f: number, a: number, lift = 0.012) => {
      const r = rTop + (rBot - rTop) * f + lift;
      const y = yTop - (yTop - yBot) * f;
      return new THREE.Vector3(Math.sin(a) * r, y, Math.cos(a) * r);
    };
    for (let v = 0; v < 6; v++) {
      const a0 = (v / 6) * Math.PI * 2;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 10; k++) {
        const f = 0.08 + (k / 10) * 0.86;
        pts.push(at(f, a0 + f * 1.3 + Math.sin(f * 7 + v) * 0.12));
      }
      const col = RAINBOW[v % RAINBOW.length];
      b.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 28, 0.0055, 4), col, 'trim', true));
      // Twigs off the branch, each ending in a blossom.
      for (let k = 0; k < 4; k++) {
        const f = 0.2 + k * 0.2, a = a0 + f * 1.3 + Math.sin(f * 7 + v) * 0.12;
        const side = k % 2 ? 1 : -1;
        const tip = at(f + 0.05, a + side * 0.28, 0.014);
        b.add(mesh(new THREE.TubeGeometry(new THREE.LineCurve3(at(f, a), tip), 2, 0.004, 4), col, 'trim', true));
        // Mostly light blue blossoms, some pink, few white.
        this.blossom(b, tip, k % 5 === 0 ? '#ffffff' : k % 2 ? '#a8d8ff' : '#ffd1e3');
      }
    }
  }

  /** A little five-petal flower lying on the cloth, facing outwards. */
  private blossom(b: THREE.Group, at: THREE.Vector3, color: string): void {
    const flower = new THREE.Group();
    const petal = new THREE.SphereGeometry(0.014, 5, 4);
    for (let k = 0; k < 5; k++) {
      const pm = mesh(petal, color, 'trim');
      const pa = (k / 5) * Math.PI * 2;
      pm.position.set(Math.cos(pa) * 0.016, Math.sin(pa) * 0.016, 0);
      pm.scale.set(1, 1, 0.5);
      flower.add(pm);
    }
    flower.add(mesh(new THREE.SphereGeometry(0.009, 5, 4), '#fff27a', 'trim', true));
    flower.position.copy(at);
    flower.lookAt(at.x * 2, at.y, at.z * 2);
    b.add(flower);
  }

  /** A ribbon tied under the bust with a bow at the front. */
  private ribbon(b: THREE.Group, color: string): void {
    const y = DIMS.waist + 0.16;
    const band = new THREE.CylinderGeometry(0.188, 0.188, 0.03, 14, 1, true);
    band.translate(0, y, 0);
    b.add(mesh(band, color, 'trim'));
    const bow = new THREE.Group();
    for (const s of [-1, 1]) {
      const loop = mesh(new THREE.TorusGeometry(0.03, 0.009, 5, 10), color, 'trim');
      loop.scale.set(1.2, 0.8, 0.6);
      loop.position.x = s * 0.034;
      bow.add(loop);
      const tail = mesh(new THREE.BoxGeometry(0.018, 0.1, 0.006), color, 'trim');
      tail.position.set(s * 0.018, -0.055, 0);
      tail.rotation.z = s * 0.25;
      bow.add(tail);
    }
    bow.add(mesh(new THREE.SphereGeometry(0.013, 6, 5), color, 'trim'));
    bow.position.set(0, y, 0.2);
    b.add(bow);
  }

  /** Small surface motifs — florals, dots, stars — scattered on a skirt or robe. */
  private decorate(b: THREE.Group, rb: number, y0: number, y1: number, base: string): void {
    const p = this.outfit.pattern;
    if (p === 'none' || p === 'bands' || p === 'glow') return;
    // Where the cloth can be painted (fabric.ts) the motifs are in the picture instead.
    if (typeof document !== 'undefined') return;
    const n = (p === 'stars' ? 14 : 10) + (this.outfit.detail?.vines ? 12 : 0);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.3;
      const t = 0.2 + ((i * 37) % 10) / 16;
      const y = y0 + (y1 - y0) * t * 0.7;
      const r = rb + (0.19 - rb) * t * 0.7 + 0.012;
      const col = p === 'stars' ? '#fff3b0' : this.outfit.trim;
      if (p === 'floral') {
        // A little five-petal flower lying on the cloth.
        const flower = new THREE.Group();
        const petal = new THREE.SphereGeometry(0.016, 5, 4);
        for (let k = 0; k < 5; k++) {
          const pm = mesh(petal, col === base ? '#ffffff' : col, 'trim');
          const pa = (k / 5) * Math.PI * 2;
          pm.position.set(Math.cos(pa) * 0.018, Math.sin(pa) * 0.018, 0);
          pm.scale.set(1, 1, 0.5);
          flower.add(pm);
        }
        flower.add(mesh(new THREE.SphereGeometry(0.01, 5, 4), col === base ? '#ffffff' : col, 'trim'));
        flower.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
        flower.lookAt(Math.cos(a) * r * 2, y, Math.sin(a) * r * 2);
        b.add(flower);
        continue;
      }
      const g = p === 'geometric' ? new THREE.OctahedronGeometry(0.03) : new THREE.SphereGeometry(p === 'dots' ? 0.022 : 0.032, 5, 4);
      const m = mesh(g, col === base ? '#ffffff' : col, 'trim', p === 'stars');
      m.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      b.add(m);
    }
  }

  private buildOuter(b: THREE.Group): void {
    const o = this.outfit, D = DIMS;
    if (!o.outer) return;
    const c = o.outer.color;
    switch (o.outer.style) {
      case 'cape':
      case 'cloak':
      case 'bisht': {
        const len = o.outer.style === 'cape' ? 0.95 : 1.28;
        const w = o.outer.style === 'bisht' ? 0.62 : 0.5;
        const geo = new THREE.CylinderGeometry(0.21, w, len, 12, 8, true, Math.PI * 0.62, Math.PI * 0.76);
        geo.translate(0, -len / 2, 0);
        const cape = mesh(geo, c, 'cape');
        this.capeCloth = { mesh: cape, base: (geo.getAttribute('position').array as Float32Array).slice(), len };
        const pivot = new THREE.Group();
        pivot.position.set(0, D.shoulder + 0.03, -0.02);
        pivot.add(cape);
        b.add(pivot);
        this.cape = pivot;
        if (o.pattern === 'stars' || o.pattern === 'glow') {
          for (let i = 0; i < 7; i++) {
            const s = mesh(new THREE.OctahedronGeometry(0.025), '#fff3b0', 'trim', true);
            const a = Math.PI * 0.7 + (i / 7) * Math.PI * 0.6, t = 0.3 + (i % 3) * 0.22;
            s.position.set(Math.sin(a) * (0.22 + t * 0.3), -len * t, Math.cos(a) * (0.22 + t * 0.3) - 0.01);
            cape.add(s);
          }
        }
        break;
      }
      case 'dupatta':
      case 'sash': {
        const geo = new THREE.BoxGeometry(0.1, o.outer.style === 'dupatta' ? 0.75 : 0.5, 0.02);
        geo.rotateZ(0.62);
        geo.translate(0.02, D.shoulder - 0.28, 0.19);
        b.add(mesh(geo, c, 'garment'));
        if (o.outer.style === 'dupatta') {
          const back = new THREE.BoxGeometry(0.16, 0.9, 0.02);
          back.translate(-0.12, D.shoulder - 0.45, -0.2);
          b.add(mesh(back, c, 'garment'));
        }
        break;
      }
      case 'shawl': {
        const geo = new THREE.CylinderGeometry(0.2, 0.28, 0.3, 10, 1, true);
        geo.translate(0, D.shoulder - 0.1, 0);
        b.add(mesh(geo, c, 'garment'));
        break;
      }
      case 'vest':
      case 'haori': {
        const len = o.outer.style === 'vest' ? 0.46 : 0.8;
        const geo = new THREE.CylinderGeometry(0.2, 0.23, len, 10, 1, true, Math.PI * 0.62 - Math.PI, Math.PI * 1.76);
        geo.translate(0, D.shoulder - len / 2, 0);
        b.add(mesh(geo, c, 'garment'));
        break;
      }
      case 'apron': {
        const geo = new THREE.BoxGeometry(0.3, 0.6, 0.02);
        geo.translate(0, D.waist - 0.3, 0.21);
        geo.rotateX(-0.12);
        b.add(mesh(geo, c, 'garment'));
        break;
      }
    }
  }

  /** Hold a balloon of this colour in the free hand (null lets it go). The model is the 3D side's `heldBalloon`. */
  holdBalloon(colour: string | null): void {
    if (colour === this.balloonColour) return;
    if (this.balloon) {
      this.balloon.parent?.remove(this.balloon);
      this.balloon.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
    }
    this.balloon = null;
    this.balloonColour = colour;
    if (!colour) return;
    const b = heldBalloon(colour);
    b.position.set(0, -0.66, 0);
    // A balloon is the same size whoever holds it: the string rises well above a child's head.
    b.scale.setScalar(1 / this.scale);
    (this.threadHand > 0 ? this.armL : this.armR).add(b);
    this.balloon = b;
  }

  /** World position just above the free hand's palm. */
  freeHand(out: THREE.Vector3): THREE.Vector3 {
    const arm = this.threadHand > 0 ? this.armL : this.armR;
    return arm.localToWorld(out.set(0, -0.66, 0));
  }

  /** The head floats HEAD_GAP above the neck. It has no face, ever. */
  private buildHead(b: THREE.Group): void {
    const o = this.outfit, D = DIMS, r = D.headR;
    this.head.position.y = D.neck + HEAD_GAP + r;
    b.add(this.head);
    const square = this.identity === 'boy' || this.outfit.who === 'boy';
    const skin = mesh(headGeometry(r, square), this.skin, 'head');
    skin.scale.set(1, 1.06, 1);
    this.head.add(skin);

    const hc = o.head.color, style = o.head.style;
    // Front of the face is +Z. SphereGeometry: phi = π/2 points to +Z.
    const openShell = (rad: number, open: number, thetaLen = Math.PI) => {
      const g = new THREE.SphereGeometry(rad, 16, 12, Math.PI / 2 + open, Math.PI * 2 - open * 2, 0, thetaLen);
      return g;
    };
    const add = (g: THREE.BufferGeometry, color = hc, y = 0) => {
      const m = mesh(g, color, 'headwear');
      m.position.y = y;
      this.head.add(m);
      return m;
    };

    if (style === 'hijab' || style === 'hijab-wrap' || style === 'hijab-hat' || style === 'ghutra') {
      // The scarf follows the head and wraps beneath the chin: its opening frames the face down to
      // the chin line.
      add(headGeometry(r, false, 1.12, (x, y, z) => !inFace(x, y, z))).scale.set(1, 1.08, 1.02);
      // The drape falls from the head but stays attached to the head only — a gap remains above
      // the shoulders so the head still floats.
      const drape = new THREE.CylinderGeometry(r * 1.05, r * 1.5, r * 0.8, 14, 1, true);
      drape.translate(0, -r * 0.95, -0.01);
      add(drape);
      if (style === 'hijab-wrap') {
        const wrap = new THREE.TorusGeometry(r * 1.05, r * 0.2, 6, 14);
        wrap.rotateX(Math.PI / 2 - 0.3);
        add(wrap, o.trim, r * 0.5);
      }
      if (style === 'hijab-hat') {
        add(new THREE.CylinderGeometry(r * 2.4, r * 2.4, 0.02, 16), hc, r * 0.75);
        add(new THREE.CylinderGeometry(r * 0.9, r * 1.1, r * 0.8, 12), hc, r * 1.1);
        const band = new THREE.CylinderGeometry(r * 1.12, r * 1.12, r * 0.2, 12, 1, true);
        add(band, o.trim, r * 0.85);
      }
      if (style === 'ghutra') {
        const agal = new THREE.TorusGeometry(r * 0.95, r * 0.09, 5, 14);
        agal.rotateX(Math.PI / 2);
        add(agal, '#1b1b1b', r * 0.75);
        add(agal.clone(), '#1b1b1b', r * 0.62);
      }
    } else if (style === 'hood') {
      const hood = openShell(r * 1.28, 0.8);
      add(hood).scale.set(1, 1.18, 1.1);
      add(new THREE.ConeGeometry(r * 0.5, r * 0.8, 8), hc, r * 1.3).rotation.x = -0.5;
      const drape = new THREE.CylinderGeometry(r * 1.15, r * 1.6, r * 0.9, 14, 1, true);
      drape.translate(0, -r * 1.0, -0.01);
      add(drape);
    } else if (style === 'hair') {
      add(headGeometry(r, this.identity === 'boy' || this.outfit.who === 'boy', 1.07, inHair)).scale.set(1, 1.06, 1);
    } else if (style === 'kufi' || style === 'songkok') {
      add(new THREE.CylinderGeometry(r * 0.98, r * 1.02, r * (style === 'songkok' ? 0.75 : 0.55), 14), hc, r * 0.62);
      add(openShell(r * 1.04, 1.15, Math.PI * 0.55), '#1a1410');
    } else if (style === 'turban') {
      for (let i = 0; i < 3; i++) {
        const t = new THREE.TorusGeometry(r * (1.02 - i * 0.12), r * 0.3, 6, 14);
        t.rotateX(Math.PI / 2 + (i % 2 ? 0.2 : -0.2));
        add(t, hc, r * (0.35 + i * 0.3));
      }
      add(new THREE.SphereGeometry(r * 0.75, 10, 6), hc, r * 0.9);
      add(openShell(r * 1.03, 1.15, Math.PI * 0.55), '#1a1410');
    } else if (style === 'cap') {
      add(new THREE.SphereGeometry(r * 1.08, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hc, r * 0.2).scale.set(1, 0.7, 1.1);
      const brim = new THREE.BoxGeometry(r * 1.4, 0.015, r * 0.9);
      brim.translate(0, r * 0.3, r * 1.0);
      add(brim);
      add(openShell(r * 1.03, 1.15, Math.PI * 0.55), '#1a1410');
    } else if (style === 'wide-hat' || style === 'gat') {
      add(new THREE.CylinderGeometry(r * (style === 'gat' ? 2.6 : 2.1), r * (style === 'gat' ? 2.6 : 2.1), 0.015, 18), hc, r * 0.7);
      add(new THREE.CylinderGeometry(r * 0.8, r * 0.9, r * (style === 'gat' ? 1.4 : 0.9), 12), hc, r * (style === 'gat' ? 1.4 : 1.1));
      add(openShell(r * 1.03, 1.15, Math.PI * 0.55), '#1a1410');
    } else if (style === 'beanie') {
      add(new THREE.SphereGeometry(r * 1.1, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hc, r * 0.05);
      add(new THREE.SphereGeometry(r * 0.3, 6, 4), o.trim, r * 1.15);
    }
  }

  /**
   * The two travellers each wear a designer crown that floats above the head (never touching
   * it or the headwear), facing forward and still apart from a gentle float: hers the grand arched gold crown set with rose and ruby
   * gems under a star, the larger of the two; his a fine gold tiara of pearls round a sapphire.
   */
  crown: THREE.Group | null = null;
  private buildCrown(): void {
    if (!this.identity) return;
    const r = DIMS.headR, tall = ['gat', 'wide-hat', 'hijab-hat', 'turban', 'songkok'].includes(this.outfit.head.style);
    const g = new THREE.Group();
    g.position.y = r * (tall ? 2.5 : 1.85);
    const gold = '#e8b84a', girl = this.identity === 'girl';
    // Hers is the grand arched crown, the larger of the two; his is the fine pearl tiara.
    const grand = girl;
    const gemA = girl ? '#ff6fa8' : '#3a7aff', gemB = girl ? '#e8342a' : '#3a7aff';
    g.scale.setScalar(girl ? 2.1 : 1.35);
    const R = r * (grand ? 0.66 : 0.6), H = r * (grand ? 0.3 : 0.2);
    g.add(mesh(new THREE.CylinderGeometry(R, R * 0.96, H, 24, 1, true), gold, 'headwear'));
    g.add(mesh(new THREE.TorusGeometry(R, r * 0.03, 5, 24).rotateX(Math.PI / 2), gold, 'headwear'));
    const n = grand ? 6 : 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.sin(a) * R, z = Math.cos(a) * R;
      const tipH = grand ? r * 0.42 : r * (0.2 + (i % 2 ? 0 : 0.14) + (i === 0 ? 0.12 : 0));
      const spike = mesh(new THREE.ConeGeometry(r * (grand ? 0.09 : 0.05), tipH, 4), gold, 'headwear');
      spike.position.set(x, H / 2 + tipH / 2, z);
      g.add(spike);
      const bead = mesh(new THREE.SphereGeometry(r * (grand ? 0.07 : 0.05), 8, 6), grand ? gemA : '#fff4f0', 'headwear', grand);
      bead.position.set(x, H / 2 + tipH + r * 0.03, z);
      g.add(bead);
      if (grand) {
        const gem = mesh(new THREE.OctahedronGeometry(r * 0.07), i % 2 ? gemA : gemB, 'headwear', true);
        gem.position.set(x * 1.02, 0, z * 1.02);
        g.add(gem);
      }
    }
    // The centrepiece at the front, and on the grand crown two arches meeting under a star.
    const front = mesh(new THREE.OctahedronGeometry(r * (grand ? 0.09 : 0.11)).scale(1, 1.3, 0.6), gemA, 'headwear', true);
    front.position.set(0, grand ? 0 : H / 2 + r * 0.16, R * 1.03);
    g.add(front);
    if (grand) {
      for (const ry of [0, Math.PI / 2]) {
        const arch = mesh(new THREE.TorusGeometry(R * 0.95, r * 0.035, 5, 16, Math.PI), gold, 'headwear');
        arch.rotation.y = ry;
        arch.scale.y = 0.7;
        arch.position.y = H / 2;
        g.add(arch);
      }
      const star = mesh(new THREE.OctahedronGeometry(r * 0.12), '#fff0b0', 'headwear', true);
      star.position.y = H / 2 + R * 0.7 + r * 0.14;
      g.add(star);
      // Adornments: pearls along the rim, a band of rubies and emeralds, gold leaves between the
      // points, pearls strung along the arches, a cluster round the front gem, and short pearl drops.
      // Merged by colour so the many small pieces cost only a few draw calls.
      const pearl = '#fff4f0';
      const bits = new Map<string, THREE.BufferGeometry[]>();
      const bit = (geo: THREE.BufferGeometry, col: string, glow: boolean, x: number, y: number, z: number, ry = 0) => {
        if (ry) geo.rotateY(ry);
        geo.translate(x, y, z);
        const key = `${col}|${glow ? 1 : 0}`;
        (bits.get(key) ?? bits.set(key, []).get(key)!).push(geo.index ? geo.toNonIndexed() : geo);
      };
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2;
        bit(new THREE.SphereGeometry(r * 0.028, 6, 4), pearl, false, Math.sin(a) * R * 1.04, -H / 2 + r * 0.02, Math.cos(a) * R * 1.04);
      }
      for (let i = 0; i < 12; i++) {
        const a = ((i + 0.5) / 12) * Math.PI * 2;
        bit(new THREE.OctahedronGeometry(r * 0.045), i % 2 ? '#2fbf7a' : '#e8342a', true, Math.sin(a) * R * 1.05, r * 0.02, Math.cos(a) * R * 1.05);
      }
      for (let i = 0; i < n; i++) {
        const a = ((i + 0.5) / n) * Math.PI * 2;
        bit(new THREE.SphereGeometry(r * 0.09, 8, 6).scale(0.55, 1, 0.25), gold, false, Math.sin(a) * R * 1.01, H / 2 + r * 0.1, Math.cos(a) * R * 1.01, a);
        bit(new THREE.SphereGeometry(r * 0.035, 6, 4), gemA, true, Math.sin(a) * R * 1.03, H / 2 + r * 0.19, Math.cos(a) * R * 1.03);
      }
      for (const ry of [0, Math.PI / 2]) for (let k = 1; k < 10; k++) {
        const t = (k / 10) * Math.PI;
        bit(new THREE.SphereGeometry(r * 0.025, 6, 4), pearl, false, Math.cos(t) * R * 0.95 * Math.cos(ry), H / 2 + Math.sin(t) * R * 0.95 * 0.7 + r * 0.03, -Math.cos(t) * R * 0.95 * Math.sin(ry));
      }
      for (let k = 0; k < 6; k++) {
        const a = (k / 6) * Math.PI * 2;
        bit(new THREE.SphereGeometry(r * 0.03, 6, 4), k % 2 ? pearl : '#ffd6e8', k % 2 === 0, Math.cos(a) * r * 0.13, Math.sin(a) * r * 0.15, R * 1.05);
      }
      for (let i = 0; i < 10; i++) {
        const a = ((i + 0.25) / 10) * Math.PI * 2;
        bit(new THREE.SphereGeometry(r * 0.03, 6, 4).scale(1, 1.5, 1), pearl, false, Math.sin(a) * R * 1.03, -H / 2 - r * 0.05, Math.cos(a) * R * 1.03);
      }
      for (const [key, geos] of bits) {
        const [col, glow] = key.split('|');
        const merged = mergeGeometries(geos, false);
        for (const q of geos) q.dispose();
        if (merged) g.add(mesh(merged, col, 'headwear', glow === '1'));
      }
    }
    this.crown = g;
    this.head.add(g);
  }

  /** GT-CHAR-001: identity belongs to the floating head, independent of wardrobe. */
  private buildIdentity(): void {
    if (!this.identity) return;
    const frame = this.identity === 'girl' ? '#976822' : '#302b27';
    for (const side of [-1, 1]) {
      const rim = mesh(new THREE.TorusGeometry(0.046, 0.005, 5, 16), frame, 'glasses');
      rim.position.set(side * 0.056, 0.03, 0.159);
      rim.scale.set(1, 0.85, 1);
      this.head.add(rim);
      const arm = mesh(new THREE.BoxGeometry(0.006, 0.006, 0.1), frame, 'glasses');
      arm.position.set(side * 0.104, 0.032, 0.112);
      this.head.add(arm);
    }
    const bridge = mesh(new THREE.BoxGeometry(0.022, 0.006, 0.006), frame, 'glasses');
    bridge.position.set(0, 0.038, 0.16);
    this.head.add(bridge);
    if (this.identity !== 'boy') return;

    // An angular beard along the jaw and chin, cut in facets. No nose, mouth, pupils or lenses painted as eyes.
    const beard = mesh(headGeometry(DIMS.headR, true, 1.05, inBeard, [12, 10]), '#30251f', 'beard');
    beard.scale.set(1, 1.06, 1);
    this.head.add(beard);
    if (this.outfit.head.style === 'none') {
      // Bareheaded: a full head of hair.
      const hair = mesh(headGeometry(DIMS.headR, true, 1.07, inHair), '#30251f', 'hair');
      hair.scale.set(1, 1.06, 1);
      this.head.add(hair);
    }

    // Hats cover the quiff rather than letting it intersect the headwear.
    if (this.outfit.head.style === 'hair' || this.outfit.head.style === 'none') {
      const sweep = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.09,0.13,0.055), new THREE.Vector3(-0.045,0.185,0.105),
        new THREE.Vector3(0.045,0.20,0.115), new THREE.Vector3(0.10,0.165,0.13),
        new THREE.Vector3(0.078,0.135,0.151), new THREE.Vector3(0.052,0.151,0.152),
      ]);
      const quiff = mesh(new THREE.TubeGeometry(sweep, 18, 0.026, 6, false), '#30251f', 'hair');
      quiff.name = 'curled-side-quiff';
      this.head.add(quiff);
    }
  }

  update(dt: number, s: AnimState): void {
    if (this.balloon?.parent) {
      // The string stays upright whatever the arm does, with a gentle sway.
      this.balloon.parent.getWorldQuaternion(_bq);
      this.balloon.quaternion.copy(_bq).invert().multiply(_sway.setFromEuler(_se.set(Math.sin(s.t * 1.3) * 0.12, 0, Math.cos(s.t * 1.1) * 0.1)));
    }
    const moving = s.speed > 0.2 && !s.airborne && !s.riding;
    this.phase += dt * (moving ? Math.min(12, 3 + s.speed * 1.4) : 2);
    const swing = moving ? Math.min(0.7, 0.2 + s.speed * 0.06) : 0;
    const sw = Math.sin(this.phase) * swing;

    if (s.riding) {
      this.legL.rotation.x = this.legR.rotation.x = -1.35;
      this.armL.rotation.x = this.armR.rotation.x = -0.6;
      this.body.rotation.x = 0;
    } else if (s.airborne) {
      this.legL.rotation.x = 0.25 + Math.sin(s.t * 3) * 0.05;
      this.legR.rotation.x = 0.35 + Math.sin(s.t * 3 + 1) * 0.05;
      this.armL.rotation.x = this.armR.rotation.x = 0.5;
      this.armL.rotation.z = -0.6;
      this.armR.rotation.z = 0.6;
      this.body.rotation.x = Math.min(0.6, s.speed * 0.03);
    } else {
      this.legL.rotation.x = sw;
      this.legR.rotation.x = -sw;
      this.armL.rotation.x = -sw * 0.8;
      this.armR.rotation.x = sw * 0.8;
      this.armL.rotation.z = -0.12;
      this.armR.rotation.z = 0.12;
      this.body.rotation.x = 0;
    }
    if (this.offer > 0) {
      const arm = this.threadHand > 0 ? this.armL : this.armR;
      arm.rotation.x += (-1.25 + this.offerLift - arm.rotation.x) * this.offer;
      arm.rotation.z *= 1 - this.offer * 0.7;
    }
    // The floating head bobs gently on its own — never touching the body.
    this.head.position.y = (DIMS.neck + HEAD_GAP + DIMS.headR) + Math.sin(s.t * 2.2) * 0.012 + (moving ? Math.abs(Math.cos(this.phase)) * 0.015 : 0);
    this.body.position.y = moving ? Math.abs(Math.sin(this.phase)) * 0.03 : 0;
    if (this.crown) {
      this.crown.position.y = DIMS.headR * (['gat', 'wide-hat', 'hijab-hat', 'turban', 'songkok'].includes(this.outfit.head.style) ? 2.5 : 1.85) + Math.sin(s.t * 1.6) * 0.012;
    }
    this.wings?.update(s.t, dt, s.airborne, s.riding);
    this.jetpack?.update(s.t, dt, s.speed, s.airborne, s.riding);
    if (this.cape) {
      // The cape flies: it lifts and streams back with speed and in the air, and ripples always.
      // The cape hangs at her back (-z); a positive tilt swings its hem backwards, away from the
      // direction of travel — so it streams out behind her.
      this.cape.rotation.x = 0.08 + Math.min(1.15, s.speed * 0.075) + (s.airborne ? 0.55 : 0) + Math.sin(s.t * 3) * 0.06 + Math.sin(s.t * 7.3) * 0.025;
      this.cape.rotation.z = Math.sin(s.t * 1.7) * 0.05;
    }
    if (this.capeCloth) {
      const { mesh: cm, base, len } = this.capeCloth;
      const pos = cm.geometry.getAttribute('position') as THREE.BufferAttribute;
      const amp = 0.035 + Math.min(0.1, s.speed * 0.012) + (s.airborne ? 0.06 : 0);
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2];
        const k = Math.min(1, -y / len); // 0 at the shoulders, 1 at the hem
        const wave = Math.sin(s.t * 5.5 - k * 6 + x * 5) * amp * k * k;
        pos.setXYZ(i, x + Math.sin(s.t * 3.1 + k * 4) * amp * 0.4 * k, y, z - wave - k * k * amp * 0.8);
      }
      pos.needsUpdate = true;
      cm.geometry.computeVertexNormals();
    }
  }
}
