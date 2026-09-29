import * as THREE from 'three';
import { animalHeadGap, type Part } from '../characters/anatomy';
import { type Skin, featherGeometry, skinMaterial } from './skins';
import { BIRDS, DETAILED, buildBird, buildDetailed, type BirdId, type DetailedId } from './detailed';

/**
 * Animals share the travellers' rules: no eyes or facial features, and a floating head that
 * never touches the body. Everything is tagged with userData.part for tests/anatomy.test.ts.
 */

export type SpeciesId =
  | 'sheep' | 'rabbit' | 'unicorn' | 'duck' | 'cat' | 'crane' | 'deer' | 'panda' | 'dog' | 'horse'
  | 'reindeer' | 'fox' | 'goat' | 'cow' | 'camel' | 'buffalo' | 'elephant' | 'peacock' | 'dove'
  | 'donkey' | 'lightbird'
  // Each land's own (VEHICLES_ANIMALS_PLAN.md), built from the kit's body plans below (`form`).
  | 'husky' | 'arcticfox' | 'snowhare' | 'muskox' | 'elk' | 'lynx' | 'ibex' | 'stbernard' | 'marmot'
  | 'corgi' | 'squirrel' | 'raccoon' | 'streetcat' | 'cybercat' | 'cyberdog' | 'jindo' | 'shiba' | 'tanuki'
  | 'greyhound' | 'redpanda' | 'fennec' | 'oryx' | 'saluki' | 'mau' | 'nilgai' | 'starcat' | 'cloudsheep'
  | 'puffin' | 'magpie' | 'ibis' | 'hornbill' | 'parakeet' | 'cormorant' | 'raven';

interface Species {
  name: string;
  kind: 'quad' | 'bird';
  body: [number, number, number]; // length, height, width of the body ellipsoid
  color: string;
  accent: string;
  leg: number;
  headR: number;
  neck?: number; // neck length (part of the body; the head floats past its end)
  ears?: 'pointy' | 'long' | 'round' | 'small';
  horn?: 'unicorn' | 'antlers' | 'curved' | 'small';
  tail?: 'fluffy' | 'long' | 'fan' | 'tuft' | 'short';
  extra?: 'hump' | 'trunk' | 'wool' | 'mane' | 'rainbow' | 'glow';
  snout?: number;
  diet: string; // item that befriends them
  produce?: string; // item they give daily when kept
  /** The body plan it is built on (the kit): a detailed beast's or a bird's. Default: its own id. */
  form?: DetailedId | BirdId;
  /** Its size relative to the form's dimensions above. */
  scale?: number;
  /** Coat colours it may wear (strays, breeds); one is chosen per animal. */
  tints?: string[];
  /** An overlay: 'cyber' (glowing seams, chrome plates, an antenna — New Yonder's pets) or 'starry' (Sky Isles). */
  overlay?: 'cyber' | 'starry';
}

const D = SPECIES_BASE();
/** A new species on an existing body plan: the plan's dimensions, its own look. */
function on(form: DetailedId | BirdId, o: Partial<Species> & { name: string; color: string; accent: string; diet: string }): Species {
  return { ...D[form as SpeciesId], ...o, form };
}

function SPECIES_BASE(): Record<string, Species> { return {
  sheep: { name: 'Sheep', kind: 'quad', body: [0.9, 0.6, 0.6], color: '#f7f3ea', accent: '#3a3230', leg: 0.4, headR: 0.17, ears: 'small', tail: 'short', extra: 'wool', diet: 'wildflower', produce: 'wool' },
  rabbit: { name: 'Rabbit', kind: 'quad', body: [0.4, 0.3, 0.3], color: '#e8dcc8', accent: '#f7f0e6', leg: 0.1, headR: 0.12, ears: 'long', tail: 'fluffy', diet: 'wildflower' },
  unicorn: { name: 'Unicorn', kind: 'quad', body: [1.6, 0.8, 0.6], color: '#fbf8ff', accent: '#ffd6f0', leg: 0.95, headR: 0.2, neck: 0.6, ears: 'pointy', horn: 'unicorn', tail: 'long', extra: 'rainbow', snout: 0.22, diet: 'wildflower' },
  duck: { name: 'Duck', kind: 'bird', body: [0.4, 0.3, 0.3], color: '#f7f3ea', accent: '#f2a13a', leg: 0.12, headR: 0.11, tail: 'short', diet: 'rice', produce: 'feed' },
  cat: { name: 'Cat', kind: 'quad', body: [0.55, 0.3, 0.26], color: '#e8a86a', accent: '#f7f0e6', leg: 0.22, headR: 0.13, ears: 'pointy', tail: 'long', diet: 'milk' },
  crane: { name: 'Crane', kind: 'bird', body: [0.6, 0.35, 0.3], color: '#fbfbfb', accent: '#1f1f24', leg: 0.7, headR: 0.09, neck: 0.5, tail: 'short', diet: 'rice' },
  deer: { name: 'Deer', kind: 'quad', body: [1.0, 0.55, 0.4], color: '#c08a5a', accent: '#f7f0e6', leg: 0.75, headR: 0.15, neck: 0.4, ears: 'pointy', horn: 'small', tail: 'short', snout: 0.14, diet: 'wildflower' },
  panda: { name: 'Panda', kind: 'quad', body: [1.0, 0.75, 0.7], color: '#f7f7f2', accent: '#1f1f24', leg: 0.35, headR: 0.3, ears: 'round', tail: 'short', diet: 'bamboo' },
  dog: { name: 'Dog', kind: 'quad', body: [0.75, 0.4, 0.32], color: '#c9a06a', accent: '#6b4a2a', leg: 0.35, headR: 0.16, ears: 'round', tail: 'long', snout: 0.12, diet: 'bread' },
  horse: { name: 'Horse', kind: 'quad', body: [1.6, 0.8, 0.6], color: '#8a5a3a', accent: '#3a2a22', leg: 0.95, headR: 0.2, neck: 0.6, ears: 'pointy', tail: 'long', extra: 'mane', snout: 0.22, diet: 'feed' },
  reindeer: { name: 'Reindeer', kind: 'quad', body: [1.2, 0.65, 0.5], color: '#8a6a4a', accent: '#f4f1ea', leg: 0.8, headR: 0.17, neck: 0.4, ears: 'pointy', horn: 'antlers', tail: 'short', snout: 0.16, diet: 'pinecone' },
  fox: { name: 'Fox', kind: 'quad', body: [0.65, 0.32, 0.28], color: '#e0763a', accent: '#f7f0e6', leg: 0.28, headR: 0.14, ears: 'pointy', tail: 'fluffy', snout: 0.14, diet: 'dates' },
  goat: { name: 'Goat', kind: 'quad', body: [0.85, 0.5, 0.4], color: '#efe6d8', accent: '#6b5a4a', leg: 0.5, headR: 0.15, ears: 'small', horn: 'curved', tail: 'tuft', snout: 0.1, diet: 'feed', produce: 'milk' },
  cow: { name: 'Cow', kind: 'quad', body: [1.5, 0.85, 0.75], color: '#f7f3ea', accent: '#3a3230', leg: 0.7, headR: 0.24, ears: 'small', horn: 'small', tail: 'tuft', snout: 0.15, diet: 'feed', produce: 'milk' },
  camel: { name: 'Camel', kind: 'quad', body: [1.5, 0.8, 0.6], color: '#d4a86a', accent: '#b08050', leg: 1.2, headR: 0.18, neck: 0.8, ears: 'small', tail: 'tuft', extra: 'hump', snout: 0.22, diet: 'dates', produce: 'camelwool' },
  buffalo: { name: 'Water Buffalo', kind: 'quad', body: [1.5, 0.85, 0.8], color: '#4a4a52', accent: '#2a2a30', leg: 0.6, headR: 0.25, ears: 'small', horn: 'curved', tail: 'tuft', snout: 0.14, diet: 'rice' },
  elephant: { name: 'Elephant', kind: 'quad', body: [2.6, 1.9, 1.7], color: '#8a8a94', accent: '#e8a86a', leg: 1.3, headR: 0.55, ears: 'round', tail: 'tuft', extra: 'trunk', diet: 'coconut' },
  peacock: { name: 'Peacock', kind: 'bird', body: [0.5, 0.35, 0.3], color: '#1f5a9a', accent: '#2f8a6a', leg: 0.3, headR: 0.09, neck: 0.3, tail: 'fan', diet: 'rice' },
  dove: { name: 'Dove', kind: 'bird', body: [0.3, 0.2, 0.2], color: '#f4f4f8', accent: '#c8c8d8', leg: 0.06, headR: 0.08, tail: 'short', diet: 'rice' },
  donkey: { name: 'Donkey', kind: 'quad', body: [1.1, 0.6, 0.45], color: '#8a847a', accent: '#f4f1ea', leg: 0.7, headR: 0.17, neck: 0.35, ears: 'long', tail: 'tuft', extra: 'mane', snout: 0.18, diet: 'feed' },
  lightbird: { name: 'Light Bird', kind: 'bird', body: [0.4, 0.25, 0.25], color: '#fff4c0', accent: '#b8a4ff', leg: 0.1, headR: 0.1, tail: 'fan', extra: 'glow', diet: 'stardust' },
}; }

export const SPECIES: Record<SpeciesId, Species> = {
  ...(D as Record<string, Species>),
  // Aurora Huts
  husky: on('dog', { name: 'Husky', color: '#8f969e', accent: '#f4f6f8', diet: 'bread', scale: 1.15 }),
  arcticfox: on('fox', { name: 'Arctic Fox', color: '#f4f6fa', accent: '#dfe6ee', diet: 'dates' }),
  snowhare: on('rabbit', { name: 'Snowshoe Hare', color: '#f8f8fa', accent: '#e8ecf2', diet: 'wildflower', scale: 1.3 }),
  muskox: on('buffalo', { name: 'Musk Ox', color: '#4a3a2c', accent: '#d8ccb8', diet: 'feed', scale: 0.85 }),
  // Fjordhavn
  elk: on('reindeer', { name: 'Elk', color: '#5a4030', accent: '#c8b090', diet: 'pinecone', scale: 1.35 }),
  lynx: on('cat', { name: 'Lynx', color: '#c8a878', accent: '#f4ece0', diet: 'milk', scale: 1.7 }),
  // Alpenrose
  ibex: on('goat', { name: 'Alpine Ibex', color: '#9a8064', accent: '#4a3a2a', diet: 'feed', scale: 1.1 }),
  stbernard: on('dog', { name: 'St Bernard', color: '#b8642a', accent: '#faf6f0', diet: 'bread', scale: 1.45, tints: ['#b8642a', '#9a4a22'] }),
  marmot: on('panda', { name: 'Marmot', color: '#9a7a54', accent: '#6a5238', diet: 'wildflower', scale: 0.32 }),
  // Old London and Maple Row
  corgi: on('dog', { name: 'Corgi', color: '#e0943a', accent: '#faf6f0', diet: 'bread', scale: 0.8, leg: 0.2 }),
  squirrel: on('fox', { name: 'Squirrel', color: '#8a8a8e', accent: '#e8e4de', diet: 'pinecone', scale: 0.45, tints: ['#8a8a8e', '#b0562a'] }),
  raccoon: on('fox', { name: 'Raccoon', color: '#7a7a80', accent: '#2a2a2e', diet: 'bread', scale: 0.8 }),
  // New Yonder: strays and cyborg pets with glowing seams
  streetcat: on('cat', { name: 'Street Cat', color: '#8a8a8e', accent: '#f4f0ea', diet: 'milk', tints: ['#8a8a8e', '#2a2a2e', '#e8a86a', '#f4f0ea', '#c8a070', '#5a4a3a'] }),
  cybercat: on('cat', { name: 'Cyber Cat', color: '#3a3e4a', accent: '#c8ccd4', diet: 'milk', overlay: 'cyber', tints: ['#3a3e4a', '#e8e4f0', '#2a2a32'] }),
  cyberdog: on('dog', { name: 'Cyber Dog', color: '#c8ccd4', accent: '#3a3e4a', diet: 'bread', overlay: 'cyber', tints: ['#c8ccd4', '#3a3e4a', '#f4f0ea'] }),
  // Hanok Village and Sakura Hollow
  jindo: on('dog', { name: 'Jindo Dog', color: '#f0e6d4', accent: '#faf6f0', diet: 'bread', tints: ['#f0e6d4', '#c8864a'] }),
  shiba: on('dog', { name: 'Shiba Inu', color: '#d88a3a', accent: '#faf2e6', diet: 'bread', scale: 0.85 }),
  tanuki: on('fox', { name: 'Tanuki', color: '#7a6a52', accent: '#3a2e24', diet: 'rice', scale: 0.9 }),
  // Firenzia, Jade Terraces
  greyhound: on('dog', { name: 'Italian Greyhound', color: '#b8b0a8', accent: '#f4f0ea', diet: 'bread', scale: 0.9, leg: 0.42 }),
  redpanda: on('fox', { name: 'Red Panda', color: '#c0502a', accent: '#3a2420', diet: 'bamboo', scale: 0.75 }),
  // Souq al-Qamar, Tents of Rimal, Nile Crossing, Bagh-e-Noor
  fennec: on('fox', { name: 'Fennec Fox', color: '#ecd4a4', accent: '#faf2e2', diet: 'dates', scale: 0.6 }),
  oryx: on('goat', { name: 'Arabian Oryx', color: '#f0ece0', accent: '#3a3230', diet: 'dates', scale: 1.3 }),
  saluki: on('dog', { name: 'Saluki', color: '#d8c0a0', accent: '#f4ece0', diet: 'bread', leg: 0.45, tints: ['#d8c0a0', '#f0e8dc', '#a8784a'] }),
  mau: on('cat', { name: 'Egyptian Mau', color: '#c8c0b0', accent: '#5a5048', diet: 'milk', tints: ['#c8c0b0', '#b8a888'] }),
  nilgai: on('deer', { name: 'Nilgai', color: '#8a8a90', accent: '#f4f0ea', diet: 'wildflower', scale: 1.25 }),
  // The Sky Isles
  starcat: on('cat', { name: 'Star Cat', color: '#b8a4ff', accent: '#fff4c0', diet: 'stardust', overlay: 'starry', tints: ['#b8a4ff', '#ffd6f0', '#bfe8ff'] }),
  cloudsheep: on('sheep', { name: 'Cloud Sheep', color: '#ffffff', accent: '#e0e4ff', diet: 'stardust', overlay: 'starry', produce: 'wool' }),
  // Birds of the lands
  puffin: on('duck', { name: 'Puffin', color: '#1f1f24', accent: '#f2a13a', diet: 'rice', scale: 0.8 }),
  magpie: on('dove', { name: 'Magpie', color: '#1f2230', accent: '#f4f6fa', diet: 'rice', scale: 1.3 }),
  ibis: on('crane', { name: 'Sacred Ibis', color: '#f4f4f0', accent: '#1f1f24', diet: 'rice', scale: 0.8 }),
  hornbill: on('dove', { name: 'Hornbill', color: '#2a2a30', accent: '#f2c14e', diet: 'rice', scale: 1.8 }),
  parakeet: on('dove', { name: 'Parakeet', color: '#5ac85a', accent: '#e8403a', diet: 'rice', scale: 0.8 }),
  cormorant: on('duck', { name: 'Cormorant', color: '#2a2e2a', accent: '#f2c14e', diet: 'rice', scale: 1.2 }),
  raven: on('dove', { name: 'Raven', color: '#1a1a22', accent: '#3a3a48', diet: 'bread', scale: 1.4 }),
} as Record<SpeciesId, Species>;

const cache = new Map<string, THREE.Material>();
function mat(c: string, glow = false): THREE.Material {
  const k = c + (glow ? 'g' : '');
  if (!cache.has(k)) {
    cache.set(k, glow
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5), toneMapped: false })
      : new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
  }
  return cache.get(k)!;
}
/** The skin of the animal being built: fur for beasts, feathers for birds. */
let coat: Skin = 'fur';
const FURRY: Part[] = ['body', 'leg', 'neck', 'head', 'ear', 'tail', 'mane'];
function part(geo: THREE.BufferGeometry, c: string, p: Part, glow = false): THREE.Mesh {
  // Fur (or feathers) on the body, feathers on wings; hooves and horns stay smooth.
  const skin: Skin | null = glow ? null : p === 'wing' ? 'feather' : FURRY.includes(p) ? coat : null;
  const m = new THREE.Mesh(geo, skin ? skinMaterial(c, skin, { side: p === 'wing' ? THREE.DoubleSide : THREE.FrontSide }) : mat(c, glow));
  m.userData.part = p;
  m.castShadow = true;
  return m;
}

const RAINBOW = ['#ff8a8a', '#ffc27a', '#fff08a', '#9ae8a0', '#8ac8ff', '#c8a4ff'];

/** A coat colour for this animal, fixed by its id: strays and breeds come in their colours. */
export function tintFor(species: SpeciesId, id: string): string | undefined {
  const t = SPECIES[species].tints;
  if (!t) return undefined;
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return t[h % t.length];
}

/**
 * The kit's overlays, laid over a built body. 'cyber' — New Yonder's cyborg pets: glowing seams
 * round the barrel and the legs, a lit strip down the spine, chrome plates on the flanks, a
 * little antenna with a light on the (floating) head, the tail tipped with light. 'starry' — the
 * Sky Isles' creatures: a scatter of small glowing stars in their coats.
 */
function dress(kind: 'cyber' | 'starry', body: THREE.Group, head: THREE.Group, legs: THREE.Group[], tail: THREE.Object3D | undefined, d: { L: number; H: number; W: number; bodyY: number; headR: number }, accent: string): void {
  const { L, H, W, bodyY, headR } = d;
  if (kind === 'cyber') {
    const neon = ['#5af0ff', '#ff5ad8'][Math.floor(Math.random() * 2)];
    for (const z of [L * 0.18, -L * 0.12]) {
      const ring = part(new THREE.TorusGeometry(0.5, 0.012, 4, 24), neon, 'body', true);
      ring.scale.set(W * 0.92, H * 0.92, 1);
      ring.position.set(0, bodyY, z);
      body.add(ring);
    }
    for (let i = 0; i < 6; i++) {
      const dot = part(new THREE.BoxGeometry(W * 0.12, 0.012, L * 0.06), neon, 'body', true);
      dot.position.set(0, bodyY + H * 0.49, L * 0.3 - i * L * 0.12);
      body.add(dot);
    }
    for (const x of [-1, 1]) {
      const plate = part(new THREE.BoxGeometry(0.01, H * 0.34, L * 0.3), '#c8ccd4', 'body');
      plate.position.set(x * W * 0.46, bodyY + H * 0.05, 0);
      body.add(plate);
    }
    for (const leg of legs) {
      const band = part(new THREE.TorusGeometry(W * 0.12, 0.008, 4, 12), neon, 'leg', true);
      band.rotation.x = Math.PI / 2;
      band.position.y = -0.08;
      leg.add(band);
    }
    const ant = part(new THREE.CylinderGeometry(0.006, 0.008, headR * 1.2, 4), accent, 'accessory');
    ant.position.set(headR * 0.3, headR * 1.3, -headR * 0.2);
    ant.rotation.z = -0.3;
    head.add(ant);
    const bulb = part(new THREE.SphereGeometry(headR * 0.12, 6, 5), neon, 'accessory', true);
    bulb.position.set(headR * 0.48, headR * 1.85, -headR * 0.2);
    head.add(bulb);
    if (tail) {
      const tip = part(new THREE.SphereGeometry(0.025, 6, 5), neon, 'tail', true);
      tip.position.set(0, 0.05, -0.05);
      tail.add(tip);
    }
  } else {
    for (let i = 0; i < 14; i++) {
      const st = part(new THREE.OctahedronGeometry(0.02 + (i % 3) * 0.008), i % 3 ? '#fff4c0' : '#ffd6f0', 'body', true);
      const a = (i / 14) * Math.PI * 2;
      st.position.set(Math.cos(a) * W * 0.5, bodyY + Math.sin(a * 1.7) * H * 0.35, ((i % 7) / 6 - 0.5) * L * 0.8);
      body.add(st);
    }
  }
}

export class AnimalModel {
  readonly root = new THREE.Group();
  readonly head = new THREE.Group();
  private legs: THREE.Group[] = [];
  /** Knees and hocks (detailed animals): they bend as the leg swings. */
  private knees: THREE.Group[] = [];
  private tail?: THREE.Object3D;
  /** Feathered wings (unicorns): they beat slowly at rest and fast at a gallop or in the air. */
  private wings: THREE.Group[] = [];
  /** A bird's folded wings: they twitch and ruffle. */
  private folded: THREE.Group[] = [];
  private phase = Math.random() * 10;
  private headBase = new THREE.Vector3();
  /** Seat height for rideable animals. */
  readonly saddleY: number;

  constructor(readonly species: SpeciesId, scale = 1, tint?: string) {
    const s = SPECIES[species];
    const [L, H, W] = s.body;
    const c = tint ?? s.color, a = s.accent;
    // Built on its form's body plan (the kit), at its own size.
    const form = (s.form ?? species) as string;
    const detailed = (DETAILED as readonly string[]).includes(form), bird = (BIRDS as readonly string[]).includes(form);
    const body = new THREE.Group();
    scale *= s.scale ?? 1;
    body.scale.setScalar(scale);
    this.root.add(body);
    const glow = s.extra === 'glow';
    coat = bird || s.kind === 'bird' ? 'feather' : 'fur';

    const bodyY = s.leg + H / 2;
    const torso = part(new THREE.SphereGeometry(0.5, 12, 9), c, 'body', glow);
    torso.scale.set(W, H, L);
    torso.position.y = bodyY;
    if (!detailed && !bird) body.add(torso);
    this.saddleY = (bodyY + H / 2) * scale;

    if (species === 'unicorn') {
      // Real wings: three rows of tapered feathers (coverts, secondaries and long primaries)
      // fanned out from the shoulder, the primaries tipped with glowing rainbow colours.
      for (const sd of [-1, 1]) {
        const w = new THREE.Group();
        const rows: Array<[number, number, number, number, number]> = [
          // count, base length, length step, width, height offset
          [9, 0.62, 0.075, 0.2, 0],
          [8, 0.4, 0.05, 0.17, 0.025],
          [7, 0.22, 0.02, 0.14, 0.05],
        ];
        rows.forEach(([n, len0, step, wid, dy], r) => {
          for (let i = 0; i < n; i++) {
            const len = len0 + i * step, a = sd * (0.15 + i * (1.15 / n));
            const f = part(featherGeometry(len, wid), r === 2 ? '#fff6fb' : '#ffffff', 'wing');
            f.rotation.y = a;
            f.position.y = dy - i * 0.012;
            w.add(f);
            if (r === 0) {
              const tip = part(featherGeometry(0.16, wid * 0.8), RAINBOW[Math.min(RAINBOW.length - 1, Math.floor((i / n) * RAINBOW.length))], 'wing', true);
              tip.position.set(Math.sin(a) * -(len - 0.14), dy - i * 0.012 + 0.002, Math.cos(a) * -(len - 0.14));
              tip.rotation.y = a;
              w.add(tip);
            }
          }
        });
        w.position.set(sd * W * 0.42, bodyY + H * 0.32, L * 0.18);
        w.rotation.set(0.35, sd * 1.35, sd * 0.5);
        body.add(w);
        this.wings.push(w);
      }
      // A pattern of little gold stars sweeping along each flank, like a trail of stardust.
      for (const x of [-1, 1]) for (let i = 0; i < 7; i++) {
        const st = part(new THREE.OctahedronGeometry(0.028 + (i % 2) * 0.01), i % 3 ? '#ffe89a' : '#ffd6f0', 'body', true);
        st.scale.set(0.5, 1, 1);
        st.position.set(x * W * 0.47, bodyY + H * (0.05 + Math.sin(i * 0.9) * 0.18), L * 0.3 - i * L * 0.1);
        body.add(st);
      }
      RAINBOW.forEach((col, i) => {
        const band = part(new THREE.BoxGeometry(W * 1.02, 0.02, 0.07), col, 'body', i % 2 === 0);
        band.position.set(0, bodyY + H * 0.47, -0.2 + i * 0.07);
        body.add(band);
      });
    }

    if (s.extra === 'wool' && !detailed) {
      for (let i = 0; i < 7; i++) {
        const w = part(new THREE.SphereGeometry(H * 0.32, 7, 5), c, 'body');
        w.position.set(((i % 3) - 1) * W * 0.3, bodyY + H * 0.28, (Math.floor(i / 3) - 1) * L * 0.28);
        body.add(w);
      }
    }
    if (s.extra === 'hump' && !detailed) {
      const hump = part(new THREE.SphereGeometry(H * 0.4, 9, 7), c, 'body');
      hump.position.set(0, bodyY + H * 0.45, -L * 0.05);
      hump.scale.set(1, 0.9, 1.2);
      body.add(hump);
    }

    if (detailed) {
      const b = buildDetailed(form as DetailedId, part, body, this.head, { L, H, W, bodyY, headR: s.headR, neck: s.neck, snout: s.snout }, c, a);
      this.legs = b.legs;
      this.knees = b.knees;
      this.tail = b.tail;
      this.headBase.copy(b.headBase);
      this.head.position.copy(this.headBase);
      body.add(this.head);
      if (s.overlay) dress(s.overlay, body, this.head, this.legs, this.tail, { L, H, W, bodyY, headR: s.headR }, a);
      return;
    }
    if (bird) {
      const b = buildBird(form as BirdId, part, body, this.head, { L, H, W, bodyY, headR: s.headR, neck: s.neck, leg: s.leg }, c, a, glow);
      this.legs = b.legs;
      this.tail = b.tail;
      this.folded = b.wings;
      this.headBase.copy(b.headBase);
      this.head.position.copy(this.headBase);
      body.add(this.head);
      return;
    }

    // Legs.
    if (s.kind === 'quad') {
      for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const g = new THREE.Group();
        g.position.set(x * W * 0.3, s.leg + H * 0.1, z * L * 0.32);
        const r = Math.max(0.04, W * 0.12);
        const geo = new THREE.CylinderGeometry(r, r * 0.8, s.leg + H * 0.1, 6);
        geo.translate(0, -(s.leg + H * 0.1) / 2, 0);
        g.add(part(geo, species === 'panda' ? a : c, 'leg', glow));
        const hoof = part(new THREE.CylinderGeometry(r * 0.9, r * 1.0, 0.06, 6), species === 'unicorn' ? '#e2c46a' : a, 'hoof');
        hoof.position.y = -(s.leg + H * 0.1) + 0.03;
        g.add(hoof);
        body.add(g);
        this.legs.push(g);
      }
    } else {
      for (const x of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(x * W * 0.2, s.leg, 0);
        const geo = new THREE.CylinderGeometry(0.015, 0.015, s.leg, 4);
        geo.translate(0, -s.leg / 2, 0);
        g.add(part(geo, a === '#1f1f24' ? '#3a3a3a' : '#e0a040', 'leg'));
        body.add(g);
        this.legs.push(g);
      }
      for (const x of [-1, 1]) {
        const wing = part(new THREE.SphereGeometry(0.5, 8, 6), s.kind === 'bird' && species === 'peacock' ? '#2f6a9a' : c, 'wing', glow);
        wing.scale.set(0.08, H * 0.7, L * 0.8);
        wing.position.set(x * W * 0.5, bodyY + H * 0.05, -L * 0.05);
        body.add(wing);
      }
    }

    // Neck — part of the body. The head floats beyond its tip.
    let headAnchor = new THREE.Vector3(0, bodyY + H * 0.3, L / 2 + s.headR * 0.4);
    if (s.neck) {
      const geo = new THREE.CylinderGeometry(W * 0.16, W * 0.26, s.neck, 7);
      geo.translate(0, s.neck / 2, 0);
      const neck = part(geo, c, 'neck', glow);
      neck.position.set(0, bodyY + H * 0.15, L * 0.38);
      neck.rotation.x = 0.55;
      body.add(neck);
      const tip = new THREE.Vector3(0, s.neck, 0).applyEuler(neck.rotation).add(neck.position);
      headAnchor = tip.clone();
      if (s.extra === 'mane' || s.extra === 'rainbow') {
        for (let i = 0; i < 6; i++) {
          const m = part(new THREE.BoxGeometry(0.05, 0.18, 0.12), s.extra === 'rainbow' ? RAINBOW[i] : a, 'mane');
          const t = new THREE.Vector3(0, (s.neck * i) / 6, -W * 0.2).applyEuler(neck.rotation).add(neck.position);
          m.position.copy(t);
          m.rotation.x = 0.55;
          body.add(m);
        }
      }
    }
    // The head: detached. Direction of detachment is along the neck (or forward).
    const dir = s.neck ? new THREE.Vector3(0, Math.cos(0.55), Math.sin(0.55)) : new THREE.Vector3(0, 0.35, 1).normalize();
    // Floating clear of the neck, with air under the jaw.
    this.headBase.copy(headAnchor).addScaledVector(dir, animalHeadGap(s.headR) + s.headR).add(new THREE.Vector3(0, s.headR * 0.15, 0));
    this.head.position.copy(this.headBase);
    body.add(this.head);

    const skull = part(new THREE.SphereGeometry(s.headR, 10, 8), species === 'panda' ? c : c, 'head', glow);
    this.head.add(skull);
    if (s.snout) {
      const sn = part(new THREE.CylinderGeometry(s.headR * 0.45, s.headR * 0.62, s.snout, 7), c, 'head', glow);
      sn.rotation.x = Math.PI / 2 + 0.3;
      sn.position.set(0, -s.headR * 0.2, s.headR * 0.55 + s.snout / 2);
      this.head.add(sn);
    }
    if (s.kind === 'bird') {
      const beak = part(new THREE.ConeGeometry(s.headR * 0.35, s.headR * 1.1, 5), species === 'crane' ? '#3a3a3a' : '#f2a13a', 'head');
      beak.rotation.x = Math.PI / 2;
      beak.position.z = s.headR * 1.3;
      this.head.add(beak);
      if (species === 'crane') {
        const crown = part(new THREE.SphereGeometry(s.headR * 0.4, 5, 4), '#d42a2a', 'head');
        crown.position.y = s.headR * 0.8;
        this.head.add(crown);
      }
      if (species === 'peacock') {
        for (let i = -1; i <= 1; i++) {
          const f = part(new THREE.SphereGeometry(0.02, 4, 3), '#2f8a9a', 'head');
          f.position.set(i * 0.03, s.headR * 1.5, 0);
          this.head.add(f);
        }
      }
    }
    if (s.extra === 'trunk') {
      const trunk = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const seg = part(new THREE.CylinderGeometry(0.1 - i * 0.012, 0.12 - i * 0.012, 0.3, 7), c, 'head');
        seg.position.set(0, -i * 0.26, s.headR * 0.8 + i * 0.05);
        seg.rotation.x = 0.15 * i;
        trunk.add(seg);
      }
      this.head.add(trunk);
      for (const x of [-1, 1]) {
        const tusk = part(new THREE.ConeGeometry(0.04, 0.35, 5), '#fbf6ea', 'horn');
        tusk.position.set(x * 0.2, -s.headR * 0.5, s.headR * 0.7);
        tusk.rotation.x = 1.9;
        this.head.add(tusk);
      }
    }
    if (species === 'panda') {
      for (const x of [-1, 1]) {
        // Ear patches only — pandas get their colour from the body and ears, never eye patches.
        const shoulder = part(new THREE.SphereGeometry(0.2, 7, 5), a, 'body');
        shoulder.position.set(x * W * 0.3, bodyY + H * 0.15, L * 0.25);
        body.add(shoulder);
      }
    }

    // Ears.
    if (s.ears) {
      for (const x of [-1, 1]) {
        let geo: THREE.BufferGeometry;
        if (s.ears === 'long') geo = new THREE.CapsuleGeometry(s.headR * 0.18, s.headR * 1.4, 3, 6);
        else if (s.ears === 'round') geo = new THREE.SphereGeometry(s.headR * (species === 'elephant' ? 0.9 : 0.32), 7, 5);
        else if (s.ears === 'small') geo = new THREE.SphereGeometry(s.headR * 0.22, 5, 4);
        else geo = new THREE.ConeGeometry(s.headR * 0.3, s.headR * 0.7, 4);
        const e = part(geo, species === 'panda' ? a : species === 'elephant' ? '#9a9aa4' : c, 'ear', glow);
        if (species === 'elephant') {
          e.scale.set(0.2, 1, 1);
          e.position.set(x * s.headR * 1.0, 0, -s.headR * 0.1);
        } else {
          e.position.set(x * s.headR * 0.55, s.headR * (s.ears === 'long' ? 1.3 : 0.8), -s.headR * 0.1);
          e.rotation.z = -x * 0.25;
        }
        this.head.add(e);
      }
    }

    // Horns.
    if (s.horn === 'unicorn') {
      const horn = part(new THREE.ConeGeometry(0.05, 0.5, 6), '#ffe89a', 'horn', true);
      horn.position.set(0, s.headR * 1.3, s.headR * 0.5);
      horn.rotation.x = 0.4;
      this.head.add(horn);
    } else if (s.horn === 'antlers' || s.horn === 'small' || s.horn === 'curved') {
      for (const x of [-1, 1]) {
        const h = s.horn === 'antlers' ? 0.55 : s.horn === 'curved' ? 0.3 : 0.14;
        const g = part(new THREE.CylinderGeometry(0.015, 0.03, h, 4), s.horn === 'curved' ? '#d9d0bc' : '#c9b08a', 'horn');
        g.position.set(x * s.headR * 0.5, s.headR * 0.9 + h / 2, -s.headR * 0.1);
        g.rotation.z = -x * (s.horn === 'curved' ? 0.9 : 0.35);
        this.head.add(g);
        if (s.horn === 'antlers') for (let i = 0; i < 3; i++) {
          const tine = part(new THREE.CylinderGeometry(0.01, 0.02, 0.2, 4), '#c9b08a', 'horn');
          tine.position.set(x * (s.headR * 0.6 + i * 0.07), s.headR * 1.1 + i * 0.14, 0.05);
          tine.rotation.x = -0.6;
          this.head.add(tine);
        }
      }
    }

    // Tail.
    if (s.tail) {
      const t = new THREE.Group();
      t.position.set(0, bodyY + H * 0.1, -L / 2);
      let m: THREE.Mesh;
      if (s.tail === 'fan') {
        const cols = species === 'peacock' ? ['#2f8a6a', '#1f5a9a', '#3aa08a', '#e2b43a'] : ['#fff4c0', '#b8a4ff', '#ffd6f0'];
        for (let i = 0; i < 9; i++) {
          const f = part(new THREE.BoxGeometry(0.08, 0.02, species === 'peacock' ? 1.0 : 0.4), cols[i % cols.length], 'tail', glow || species === 'lightbird');
          f.geometry.translate(0, 0, -(species === 'peacock' ? 0.5 : 0.2));
          f.rotation.set(-0.9, ((i - 4) / 4) * 0.9, 0);
          t.add(f);
        }
      } else {
        const long = s.tail === 'long';
        const geo = s.tail === 'fluffy' ? new THREE.SphereGeometry(0.12, 6, 5) : new THREE.CylinderGeometry(0.03, 0.05, long ? 0.6 : 0.25, 5);
        if (s.tail !== 'fluffy') geo.translate(0, -(long ? 0.3 : 0.12), 0);
        m = part(geo, s.tail === 'fluffy' && species === 'fox' ? '#e0763a' : s.extra === 'rainbow' ? RAINBOW[4] : s.tail === 'tuft' ? a : c, 'tail', s.extra === 'rainbow');
        if (s.tail === 'fluffy' && species === 'fox') m.scale.set(1, 1, 3);
        m.rotation.x = long ? 0.6 : 0.3;
        t.add(m);
      }
      body.add(t);
      this.tail = t;
    }
  }

  update(dt: number, speed: number, t: number): void {
    const moving = speed > 0.15;
    this.phase += dt * (moving ? 3 + speed * 1.5 : 1);
    const sw = moving ? Math.sin(this.phase) * Math.min(0.6, 0.15 + speed * 0.08) : 0;
    this.legs.forEach((l, i) => (l.rotation.x = (l.userData.base ?? 0) + (i % 2 === (i < 2 ? 0 : 1) ? sw : -sw)));
    // Knees fold as the foot swings forward; hocks flex as the hind leg pushes off.
    this.knees.forEach((k, i) => {
      const leg = this.legs[i], swing = (leg.rotation.x - (leg.userData.base ?? 0));
      k.rotation.x = k.userData.base + (k.userData.front ? -Math.max(0, -swing) * 1.2 : Math.max(0, swing) * 0.9);
    });
    this.head.position.y = this.headBase.y + Math.sin(t * 2 + this.phase * 0.2) * 0.015;
    if (this.tail) this.tail.rotation.y = Math.sin(t * 3 + this.phase) * 0.3;
    this.folded.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (Math.max(0, Math.sin(t * 1.3 + this.phase)) * 0.12 + (moving ? Math.abs(Math.sin(this.phase * 2)) * 0.2 : 0))));
    if (this.wings.length) {
      const beat = Math.sin(t * (speed > 8 ? 7 : 1.6)) * (speed > 8 ? 0.55 : 0.12);
      this.wings[0].rotation.z = -0.5 + beat;
      this.wings[1].rotation.z = 0.5 - beat;
    }
  }
}
