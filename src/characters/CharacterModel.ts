import * as THREE from 'three';
import { HEAD_GAP, type Part } from './anatomy';
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
      : new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, side: THREE.DoubleSide });
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

const HEM_Y: Record<Hem, number> = { floor: 0.03, ankle: 0.09, midi: 0.42, knee: 0.52, mini: 0.72 };

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

export interface AnimState {
  speed: number;
  airborne: boolean;
  riding: boolean;
  t: number;
}

export class CharacterModel {
  readonly root = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private body = new THREE.Group();
  readonly head = new THREE.Group();
  private cape?: THREE.Object3D;
  private phase = 0;
  /** World-space anchor for the golden thread (the hand). */
  readonly handAnchor = new THREE.Object3D();

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

  setOutfit(o: Outfit): void {
    this.outfit = o;
    this.body.clear();
    this.legL.clear(); this.legR.clear(); this.armL.clear(); this.armR.clear(); this.head.clear();
    this.cape = undefined;
    this.build();
  }

  private build(): void {
    const o = this.outfit, D = DIMS, info = TOP[o.top];
    const b = this.body;
    b.scale.setScalar(this.scale);

    // Legs — always covered to the ankle (modesty invariant): trousers are the base layer.
    const legGeo = new THREE.CylinderGeometry(o.lower === 'salwar' ? 0.1 : 0.075, o.lower === 'salwar' ? 0.06 : 0.07, D.hip, 7);
    legGeo.translate(0, -D.hip / 2, 0);
    for (const [leg, x] of [[this.legL, -0.1], [this.legR, 0.1]] as const) {
      leg.position.set(x, D.hip, 0);
      leg.add(mesh(legGeo.clone(), o.underTrousers, 'leg'));
      const foot = mesh(new THREE.BoxGeometry(0.11, 0.07, 0.2), '#3a2a22', 'foot');
      foot.position.set(0, -D.hip + 0.035, 0.04);
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
    }

    // Torso, and the long body of the top if it has one.
    const torso = new THREE.CylinderGeometry(0.19, 0.17, D.shoulder - D.waist + 0.06, 10);
    torso.translate(0, (D.shoulder + D.waist) / 2, 0);
    b.add(mesh(torso, o.topColor, 'torso'));
    const shoulders = new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    shoulders.scale(1.1, 0.35, 0.8);
    shoulders.translate(0, D.shoulder, 0);
    b.add(mesh(shoulders, o.topColor, 'torso'));

    if (info.long) {
      const longHem = o.lower === 'none' ? HEM_Y[o.hem] : Math.max(hemY, o.lower === 'skirt' ? 0.5 : hemY);
      const rb = 0.18 + info.flare * (1 - longHem / D.waist) * 0.8;
      const body = new THREE.CylinderGeometry(0.17, rb, D.waist - longHem, 12, 1, true);
      body.translate(0, (D.waist + longHem) / 2, 0);
      b.add(mesh(body, o.topColor, 'garment'));
      this.hemTrim(b, rb, longHem, o.trim);
      if (o.lower === 'none') this.decorate(b, rb, longHem, D.waist, o.topColor);
    }

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
      const sleeve = new THREE.CylinderGeometry(0.075, rEnd, len, 8, 1, o.sleeveShape !== 'fitted');
      sleeve.translate(0, -len / 2, 0);
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
      const hand = mesh(new THREE.SphereGeometry(0.05, 6, 5), this.skin, 'hand');
      hand.position.y = -len - 0.03;
      arm.add(hand);
      arm.rotation.z = s * 0.12;
      b.add(arm);
    }
    this.handAnchor.position.set(0, -0.63, 0);
    (this.threadHand > 0 ? this.armR : this.armL).add(this.handAnchor);

    this.buildOuter(b);
    this.buildHead(b);
    this.buildIdentity();
  }

  private hemTrim(b: THREE.Group, r: number, y: number, color: string): void {
    const t = new THREE.CylinderGeometry(r + 0.006, r + 0.01, 0.05, 12, 1, true);
    t.translate(0, y + 0.025, 0);
    b.add(mesh(t, color, 'trim', this.outfit.pattern === 'glow' || this.outfit.pattern === 'stars'));
    if (this.outfit.pattern === 'bands' || this.outfit.pattern === 'stripes') {
      const t2 = new THREE.CylinderGeometry(r * 0.9, r * 0.94, 0.03, 12, 1, true);
      t2.translate(0, y + 0.12, 0);
      b.add(mesh(t2, color, 'trim'));
    }
  }

  /** Small surface motifs — florals, dots, stars — scattered on a skirt or robe. */
  private decorate(b: THREE.Group, rb: number, y0: number, y1: number, base: string): void {
    const p = this.outfit.pattern;
    if (p === 'none' || p === 'bands' || p === 'glow') return;
    const n = p === 'stars' ? 14 : 10;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 2) * 0.3;
      const t = 0.2 + ((i * 37) % 10) / 16;
      const y = y0 + (y1 - y0) * t * 0.7;
      const r = rb + (0.19 - rb) * t * 0.7 + 0.012;
      const col = p === 'stars' ? '#fff3b0' : this.outfit.trim;
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
        const geo = new THREE.CylinderGeometry(0.21, w, len, 10, 3, true, Math.PI * 0.62, Math.PI * 0.76);
        geo.translate(0, -len / 2, 0);
        const cape = mesh(geo, c, 'cape');
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

  /** The head floats HEAD_GAP above the neck. It has no face, ever. */
  private buildHead(b: THREE.Group): void {
    const o = this.outfit, D = DIMS, r = D.headR;
    this.head.position.y = D.neck + HEAD_GAP + r;
    b.add(this.head);
    const skin = mesh(new THREE.SphereGeometry(r, 14, 10), this.skin, 'head');
    skin.scale.set(1, 1.08, 1);
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
      add(openShell(r * 1.14, 0.95)).scale.set(1, 1.1, 1.05);
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
      add(openShell(r * 1.05, 1.15, Math.PI * 0.62)).scale.set(1.02, 1.12, 1.04);
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

    // Angular jaw silhouette with a pointed chin. No nose, mouth, pupils or lenses painted as eyes.
    const beard = new THREE.BufferGeometry();
    beard.setAttribute('position', new THREE.Float32BufferAttribute([
      -0.125,-0.038,0.08, -0.08,-0.12,0.145, 0,-0.205,0.115,
      -0.125,-0.038,0.08, 0,-0.205,0.115, 0,-0.066,0.152,
      0,-0.066,0.152, 0,-0.205,0.115, 0.125,-0.038,0.08,
      0.125,-0.038,0.08, 0,-0.205,0.115, 0.08,-0.12,0.145,
      -0.125,-0.038,0.08, -0.13,-0.07,-0.015, 0,-0.205,0.115,
      0.125,-0.038,0.08, 0,-0.205,0.115, 0.13,-0.07,-0.015,
    ], 3));
    beard.computeVertexNormals();
    this.head.add(mesh(beard, '#30251f', 'beard'));

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
    // The floating head bobs gently on its own — never touching the body.
    this.head.position.y = (DIMS.neck + HEAD_GAP + DIMS.headR) + Math.sin(s.t * 2.2) * 0.012 + (moving ? Math.abs(Math.cos(this.phase)) * 0.015 : 0);
    this.body.position.y = moving ? Math.abs(Math.sin(this.phase)) * 0.03 : 0;
    if (this.cape) this.cape.rotation.x = -0.12 - Math.min(0.9, s.speed * 0.05) - (s.airborne ? 0.4 : 0) + Math.sin(s.t * 3) * 0.04;
  }
}
