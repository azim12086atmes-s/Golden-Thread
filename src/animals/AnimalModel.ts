import * as THREE from 'three';
import { mergeStaticMeshes, referencedObjects } from '../characters/merge';
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
  | 'donkey' | 'lightbird' | 'eagle'
  // Each land's own (VEHICLES_ANIMALS_PLAN.md), built from the kit's body plans below (`form`).
  | 'husky' | 'arcticfox' | 'snowhare' | 'muskox' | 'elk' | 'lynx' | 'ibex' | 'stbernard' | 'marmot'
  | 'corgi' | 'squirrel' | 'raccoon' | 'streetcat' | 'cybercat' | 'cyberdog' | 'jindo' | 'shiba' | 'tanuki'
  | 'greyhound' | 'redpanda' | 'fennec' | 'oryx' | 'saluki' | 'mau' | 'nilgai' | 'starcat' | 'cloudsheep'
  | 'puffin' | 'magpie' | 'ibis' | 'hornbill' | 'parakeet' | 'cormorant' | 'raven'
  // The kit, part two: primates, a great lizard, big cats, and the rest of each land's own.
  | 'monkey' | 'orangutan' | 'komodo' | 'goldenmonkey' | 'macaque' | 'langur' | 'tiger' | 'lion'
  | 'hedgehog' | 'fawn' | 'fairyfox' | 'cardinal' | 'deserthare' | 'kankrej'
  // Creatures of legend and machines (the fantasy and mech kits).
  | 'qilin' | 'haetae' | 'kitsune' | 'griffin' | 'pegasus' | 'thunderbird' | 'simurgh' | 'lotusswan'
  | 'moonrabbit' | 'fairydeer' | 'crystalstag' | 'aurorafox'
  | 'robopigeon' | 'mechahorse' | 'hoverhound' | 'clockbird' | 'clockraven' | 'brasshorse';

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
  /**
   * An overlay (the kit's coats): 'cyber' (glowing seams, chrome plates, an antenna — New Yonder's
   * pets), 'starry' (Sky Isles), 'stripes' (a tiger's), 'mane' (a lion's ruff), 'spines' (a
   * hedgehog's), 'spots' (a fawn's), 'fairy' (glowing wisps and a lit tail tip).
   */
  overlay?: Overlay;
  /** Built without the form's horns (a fawn on the deer's plan). */
  noHorns?: boolean;
  /** The fantasy and machine kit's parts laid over the body (creatures of legend, clockwork, mechs). */
  fantasy?: Fantasy;
}

type Overlay = 'cyber' | 'starry' | 'stripes' | 'mane' | 'spines' | 'spots' | 'fairy';

/**
 * The fantasy and sci-fi creature kit (DRAGONS_FANTASY_SCIFI_PLAN.md): parts for creatures of
 * legend and of machines, laid over any body plan.
 */
export interface Fantasy {
  /** Feathered wings from the shoulders (a pegasus's, a griffin's), and the colour of their tips. */
  wings?: { color: string; tip: string; size?: number };
  /** Brush tails fanned out behind (a kitsune's nine), glowing at the tips. */
  tails?: number;
  /** A single spiralled horn on the brow. */
  horn?: string;
  /** A mane of glowing flame down the neck and back (the qilin's). */
  flame?: string;
  /** Antlers of glowing crystal. */
  crystal?: string;
  /** An eagle's hooked beak on the floating head, with a feathered crest (the griffin's). */
  beak?: string;
  /** Glowing tips: on the ears, the tail and the feet. */
  glowTips?: string;
  /** Its coat: scales or feathers instead of fur. */
  skin?: Skin;
  /** Armour plates, lit joint rings and a lit crest strip (New Yonder's mechs). */
  mech?: string;
  /** Clockwork: brass gears on the flanks, rivets, a wind-up key on the back. */
  brass?: boolean;
  /** Glowing hover pads under the feet. */
  hover?: string;
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
  eagle: { name: 'Golden Eagle', kind: 'bird', body: [0.75, 0.32, 0.34], color: '#6a4a2a', accent: '#d8b070', leg: 0.16, headR: 0.1, neck: 0.1, tail: 'fan', diet: 'dates' },
  lightbird: { name: 'Light Bird', kind: 'bird', body: [0.4, 0.25, 0.25], color: '#fff4c0', accent: '#b8a4ff', leg: 0.1, headR: 0.1, tail: 'fan', extra: 'glow', diet: 'stardust' },
  monkey: { name: 'Monkey', kind: 'quad', body: [0.55, 0.3, 0.26], color: '#8a6a4a', accent: '#d8c0a0', leg: 0.3, headR: 0.12, tail: 'long', diet: 'coconut' },
  orangutan: { name: 'Orangutan', kind: 'quad', body: [0.85, 0.7, 0.62], color: '#b8521e', accent: '#6a3a24', leg: 0.42, headR: 0.2, diet: 'coconut' },
  komodo: { name: 'Komodo Dragon', kind: 'quad', body: [1.6, 0.34, 0.5], color: '#6a6450', accent: '#9a9078', leg: 0.2, headR: 0.13, snout: 0.16, diet: 'rice' },
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
  // Primates: Jade's golden monkeys, Bali's and Jaipur's macaques, Kerala's grey langurs.
  goldenmonkey: on('monkey', { name: 'Golden Monkey', color: '#e0a040', accent: '#f4dca8', diet: 'bamboo', scale: 1.2 }),
  macaque: on('monkey', { name: 'Macaque', color: '#9a8a70', accent: '#d8c4a8', diet: 'rice', tints: ['#9a8a70', '#8a7a60', '#aa9a80'] }),
  langur: on('monkey', { name: 'Grey Langur', color: '#c8c4bc', accent: '#3a3a40', diet: 'coconut', scale: 1.15 }),
  // Big cats: Hanok's mountain tiger of the old tales, Firenzia's Marzocco lion.
  tiger: on('cat', { name: 'Horangi Tiger', color: '#e8872a', accent: '#faf2e6', diet: 'ginseng', scale: 3.3, overlay: 'stripes' }),
  lion: on('cat', { name: 'Marzocco Lion', color: '#d4a560', accent: '#8a5a2a', diet: 'olive', scale: 3.5, overlay: 'mane' }),
  // Wanderers' Meadow: hedgehogs in the hedges, spotted fawns, a fairy fox with a lantern tail.
  hedgehog: on('panda', { name: 'Hedgehog', color: '#9a8468', accent: '#7a6450', diet: 'wildflower', scale: 0.26, overlay: 'spines' }),
  fawn: on('deer', { name: 'Fawn', color: '#c8905a', accent: '#fbf6ee', diet: 'wildflower', scale: 0.62, overlay: 'spots', noHorns: true }),
  fairyfox: on('fox', { name: 'Fairy Fox', color: '#ffd6e8', accent: '#fff4c0', diet: 'wildflower', scale: 0.85, overlay: 'fairy' }),
  // Maple Row's cardinals, Rimal's desert hares, Gulabi Nagar's grey Kankrej cattle.
  cardinal: on('dove', { name: 'Cardinal', color: '#d8262a', accent: '#3a1a1a', diet: 'rice', scale: 0.9 }),
  deserthare: on('rabbit', { name: 'Desert Hare', color: '#d8b88a', accent: '#f4e8d4', diet: 'dates', scale: 1.25 }),
  kankrej: on('cow', { name: 'Kankrej Cow', color: '#cfcac2', accent: '#3a3230', diet: 'marigold', scale: 1.05, produce: 'milk' }),
  // ── Creatures of legend (the fantasy kit), one or two to a land ──
  qilin: on('deer', { name: 'Qilin', color: '#d8a040', accent: '#2fae6a', diet: 'bamboo', scale: 1.3, noHorns: true, fantasy: { flame: '#ff8a3a', horn: '#fff4c0', skin: 'scale', glowTips: '#ffd27a' } }),
  haetae: on('cat', { name: 'Haetae', color: '#8ab8a8', accent: '#e8e0c8', diet: 'ginseng', scale: 2.6, overlay: 'mane', fantasy: { horn: '#f2c24a', skin: 'scale' } }),
  kitsune: on('fox', { name: 'Kitsune', color: '#fbf6ee', accent: '#ffc890', diet: 'rice', fantasy: { tails: 9, glowTips: '#ffd8a0' } }),
  griffin: on('cat', { name: 'Griffin', color: '#c8964a', accent: '#f4f0ea', diet: 'olive', scale: 2.8, fantasy: { wings: { color: '#8a5a2a', tip: '#f4f0ea', size: 2.4 }, beak: '#f2c24a' } }),
  pegasus: on('horse', { name: 'Pegasus', color: '#ffffff', accent: '#e8e8f0', diet: 'feed', fantasy: { wings: { color: '#ffffff', tip: '#dfe8ff', size: 1.5 } } }),
  thunderbird: on('eagle', { name: 'Thunderbird', color: '#2a3a6a', accent: '#f2e14e', diet: 'rice', scale: 4, fantasy: { glowTips: '#fff08a' } }),
  simurgh: on('peacock', { name: 'Simurgh', color: '#2a8a8a', accent: '#e8a040', diet: 'rice', scale: 2.2, fantasy: { glowTips: '#ffd27a' } }),
  lotusswan: on('duck', { name: 'Lotus Swan', color: '#fffaf4', accent: '#ff9ac8', diet: 'rice', scale: 2.2, fantasy: { glowTips: '#ffb8d8' } }),
  moonrabbit: on('rabbit', { name: 'Moon Rabbit', color: '#f4f4ff', accent: '#fff4c0', diet: 'wildflower', overlay: 'starry', fantasy: { glowTips: '#fff4c0' } }),
  fairydeer: on('deer', { name: 'Fairy Deer', color: '#f4e8ff', accent: '#fff4c0', diet: 'wildflower', noHorns: true, fantasy: { crystal: '#ffd6f0', glowTips: '#ffd6f0' } }),
  crystalstag: on('reindeer', { name: 'Crystal Stag', color: '#e8e0ff', accent: '#bfe8ff', diet: 'stardust', scale: 1.3, noHorns: true, overlay: 'starry', fantasy: { crystal: '#bfe8ff' } }),
  aurorafox: on('fox', { name: 'Aurora Fox', color: '#e8f4fa', accent: '#8affc8', diet: 'dates', fantasy: { tails: 3, glowTips: '#8affc8' } }),
  // ── Machines (the mech kit): New Yonder's mechs, Firenzia's and London's clockwork ──
  robopigeon: on('dove', { name: 'Robo-pigeon', color: '#c8ccd4', accent: '#3a3e4a', diet: 'bread', overlay: 'cyber', fantasy: { mech: '#5af0ff' } }),
  mechahorse: on('horse', { name: 'Mecha-horse', color: '#e8ecf2', accent: '#3a3e4a', diet: 'feed', overlay: 'cyber', fantasy: { mech: '#5af0ff' } }),
  hoverhound: on('dog', { name: 'Hover-hound', color: '#3a3e4a', accent: '#c8ccd4', diet: 'bread', overlay: 'cyber', fantasy: { mech: '#ff5ad8', hover: '#ff5ad8' } }),
  clockbird: on('dove', { name: 'Clockwork Songbird', color: '#c8963a', accent: '#6a4a2a', diet: 'rice', fantasy: { brass: true } }),
  clockraven: on('dove', { name: 'Clockwork Raven', color: '#5a4a32', accent: '#c8963a', diet: 'bread', scale: 1.4, fantasy: { brass: true } }),
  brasshorse: on('horse', { name: 'Brass Automaton Horse', color: '#c8963a', accent: '#6a4a2a', diet: 'feed', fantasy: { brass: true } }),
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
function dress(kind: Overlay, body: THREE.Group, head: THREE.Group, legs: THREE.Group[], tail: THREE.Object3D | undefined, d: { L: number; H: number; W: number; bodyY: number; headR: number }, accent: string): void {
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
  } else if (kind === 'stripes') {
    // Narrow dark bands arching over the back and down the flanks, rings round the legs and tail.
    const ink = '#1f1a18';
    for (let i = 0; i < 7; i++) {
      const band = part(new THREE.TorusGeometry(0.5, i % 2 ? 0.011 : 0.016, 4, 20, Math.PI), ink, 'body');
      band.scale.set(W * 0.92, H * 0.92, 1);
      band.position.set(0, bodyY - H * 0.02, L * 0.32 - (i / 6) * L * 0.66);
      band.rotation.set(0, 0, (i % 3 - 1) * 0.08);
      body.add(band);
    }
    for (const leg of legs) {
      const r = part(new THREE.TorusGeometry(W * 0.12, 0.007, 4, 12), ink, 'leg');
      r.rotation.x = Math.PI / 2;
      r.position.y = -0.14;
      leg.add(r);
    }
    if (tail) tail.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.userData.part === 'tail' && Math.round(o.position.length() * 40) % 3 === 0) (o as THREE.Mesh).material = mat(ink); });
  } else if (kind === 'mane') {
    // A lion's mane framing the (floating) head: two rings of tufts round it, darker behind.
    for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + ring * 0.2;
      const tuft = part(new THREE.SphereGeometry(headR * (0.36 - ring * 0.04), 7, 5), ring ? '#8a5a2a' : accent, 'mane');
      tuft.scale.set(1, 1.2, 0.8);
      const R = headR * (1.0 + ring * 0.12);
      tuft.position.set(Math.cos(a) * R, Math.sin(a) * R * 1.05 + headR * 0.05, -headR * (0.25 + ring * 0.22));
      head.add(tuft);
    }
    if (tail) { const t = part(new THREE.SphereGeometry(0.035, 6, 5), '#8a5a2a', 'tail'); t.position.set(0, 0.2, -0.55); tail.add(t); }
  } else if (kind === 'spines') {
    // A coat of spines over the back and flanks, fanning out from head to rump, pale-tipped.
    for (let i = 0; i < 160; i++) {
      const u = (i + 0.5) / 160, a = i * 2.39996, up = 0.15 + 0.85 * Math.sqrt((i % 23) / 22);
      const side = Math.sqrt(1 - up * up);
      const dir = new THREE.Vector3(Math.cos(a) * side, up, (0.25 - u) * 1.5).normalize();
      if (dir.z * L * 0.5 > L * 0.16) continue; // clear of the neck: the head floats free
      const sp = part(new THREE.ConeGeometry(W * 0.07, H * 0.7, 4), i % 5 ? '#4a3a2c' : '#efe4d0', 'body');
      sp.position.set(dir.x * W * 0.48, bodyY + dir.y * H * 0.48, dir.z * L * 0.5);
      sp.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      body.add(sp);
    }
  } else if (kind === 'spots') {
    // A fawn's white dapples along the back.
    for (let i = 0; i < 18; i++) {
      const sd = i % 2 ? 1 : -1, row = Math.floor(i / 2) % 3;
      const sp = part(new THREE.SphereGeometry(W * 0.07, 6, 4), '#fbf6ee', 'body');
      sp.scale.set(1, 0.35, 1);
      sp.position.set(sd * W * (0.16 + row * 0.1), bodyY + H * (0.46 - row * 0.07), L * 0.3 - (Math.floor(i / 6) / 2) * L * 0.55 - row * 0.04);
      body.add(sp);
    }
  } else if (kind === 'fairy') {
    // Glowing wisps about the flanks and a lantern-lit tail tip.
    for (let i = 0; i < 7; i++) {
      const w = part(new THREE.SphereGeometry(0.02 + (i % 3) * 0.008, 6, 5), ['#fff4c0', '#ffd6f0', '#bfe8ff'][i % 3], 'body', true);
      const a = (i / 7) * Math.PI * 2;
      w.position.set(Math.cos(a) * W * 0.62, bodyY + H * 0.3 + Math.sin(a * 2) * H * 0.2, Math.sin(a) * L * 0.4);
      body.add(w);
    }
    if (tail) { const t = part(new THREE.SphereGeometry(0.06, 8, 6), '#fff4c0', 'tail', true); t.position.set(0, 0.1, -0.5); tail.add(t); }
  } else {
    for (let i = 0; i < 14; i++) {
      const st = part(new THREE.OctahedronGeometry(0.02 + (i % 3) * 0.008), i % 3 ? '#fff4c0' : '#ffd6f0', 'body', true);
      const a = (i / 14) * Math.PI * 2;
      st.position.set(Math.cos(a) * W * 0.5, bodyY + Math.sin(a * 1.7) * H * 0.35, ((i % 7) / 6 - 0.5) * L * 0.8);
      body.add(st);
    }
  }
}

/** Feathered wings from the shoulders, three rows of feathers each (as the unicorn's), sized to the body. */
function featherWings(body: THREE.Group, d: { L: number; H: number; W: number; bodyY: number }, col: string, tip: string, size = 1): THREE.Group[] {
  const k = (d.L / 1.6) * size, out: THREE.Group[] = [];
  for (const sd of [-1, 1]) {
    const w = new THREE.Group();
    const rows: Array<[number, number, number, number, number]> = [[9, 0.62, 0.075, 0.2, 0], [8, 0.4, 0.05, 0.17, 0.025], [7, 0.22, 0.02, 0.14, 0.05]];
    rows.forEach(([n, len0, step, wid, dy], r) => {
      for (let i = 0; i < n; i++) {
        const len = (len0 + i * step) * k, a = sd * (0.15 + i * (1.15 / n));
        const f = part(featherGeometry(len, wid * k), r === 0 && i > n - 4 ? tip : col, 'wing');
        f.rotation.y = a;
        f.position.y = (dy - i * 0.012) * k;
        w.add(f);
      }
    });
    w.position.set(sd * d.W * 0.42, d.bodyY + d.H * 0.32, d.L * 0.18);
    w.rotation.set(0.35, sd * 1.35, sd * 0.5);
    body.add(w);
    out.push(w);
  }
  return out;
}

/**
 * The fantasy and mech kit's parts laid over a built body. Returns any wings (they beat in update).
 * Everything keeps the rules: the head's parts go on the floating head and stay on it; nothing
 * makes a face — a beak is the bird's head shape, like a muzzle; the mechs' light runs along the
 * crest, never across where eyes would be.
 */
function enchant(f: Fantasy, body: THREE.Group, head: THREE.Group, legs: THREE.Group[], tail: THREE.Object3D | undefined, d: { L: number; H: number; W: number; bodyY: number; headR: number }, c: string, accent: string, folded: THREE.Group[] = []): THREE.Group[] {
  const { L, H, W, bodyY, headR } = d;
  const wings = f.wings ? featherWings(body, d, f.wings.color, f.wings.tip, f.wings.size) : [];
  if (f.horn) {
    // A spiralled horn: a cone wound with rings.
    const h = part(new THREE.ConeGeometry(headR * 0.22, headR * 2.2, 8), f.horn, 'horn', true);
    h.position.set(0, headR * 1.25, headR * 0.45);
    h.rotation.x = 0.5;
    head.add(h);
    for (let i = 0; i < 4; i++) {
      const ring = part(new THREE.TorusGeometry(headR * (0.17 - i * 0.03), headR * 0.03, 4, 10), f.horn, 'horn');
      ring.position.set(0, headR * (1.0 + i * 0.28), headR * (0.3 + i * 0.14));
      ring.rotation.x = 0.5 + Math.PI / 2;
      head.add(ring);
    }
  }
  if (f.flame) for (let i = 0; i < 12; i++) {
    // Flames licking up along the back from the shoulders to the rump.
    const fl = part(new THREE.ConeGeometry(W * 0.09, H * (0.5 + (i % 3) * 0.15), 5), f.flame, 'mane', true);
    fl.position.set(Math.sin(i * 2.1) * W * 0.08, bodyY + H * 0.55, L * 0.3 - (i / 11) * L * 0.7);
    fl.rotation.set(-0.5, 0, Math.sin(i * 1.7) * 0.3);
    body.add(fl);
  }
  if (f.crystal) for (const x of [-1, 1]) for (let i = 0; i < 5; i++) {
    const cr = part(new THREE.OctahedronGeometry(headR * (0.36 - i * 0.04)).scale(0.45, 2, 0.45), f.crystal, 'horn', true);
    cr.position.set(x * headR * (0.45 + i * 0.3), headR * (1.2 + i * 0.45), -headR * (0.1 + i * 0.15));
    cr.rotation.z = -x * (0.3 + i * 0.15);
    head.add(cr);
  }
  if (f.beak) {
    // An eagle's hooked beak and a white-feathered crown on the (floating) head.
    const beak = part(new THREE.ConeGeometry(headR * 0.36, headR * 1.3, 6), f.beak, 'head');
    beak.position.set(0, -headR * 0.2, headR * 1.15);
    beak.rotation.x = Math.PI / 2 + 0.35;
    head.add(beak);
    for (let i = 0; i < 7; i++) {
      const fe = part(featherGeometry(headR * 0.9, headR * 0.35), accent, 'head');
      fe.position.set((i - 3) * headR * 0.18, headR * 0.6, -headR * 0.4);
      fe.rotation.set(0.5, (i - 3) * 0.15, 0);
      head.add(fe);
    }
  }
  if (f.tails && tail) for (let i = 0; i < f.tails; i++) {
    // More brush tails fanned out behind, each tipped with light.
    // A great plume curving up and out, the fan of them spread wide behind.
    const a = f.tails === 1 ? 0 : (i / (f.tails - 1) - 0.5) * 2.4;
    const t = new THREE.Group();
    for (let k = 0; k < 6; k++) {
      const seg = part(new THREE.SphereGeometry(W * (0.2 + Math.sin((k / 5) * Math.PI) * 0.12), 7, 5), k === 5 ? accent : c, 'tail');
      seg.scale.set(1, 1, 1.5);
      seg.position.set(0, k * k * W * 0.05, -k * W * 0.36);
      t.add(seg);
    }
    if (f.glowTips) { const g = part(new THREE.SphereGeometry(W * 0.16, 6, 5), f.glowTips, 'tail', true); g.position.set(0, 36 * W * 0.05, -6 * W * 0.36); t.add(g); }
    t.position.set(0, 0.02, -0.03);
    t.rotation.set(-0.55, a, 0);
    tail.add(t);
  }
  if (f.glowTips) {
    if (tail && !f.tails) { const g = part(new THREE.SphereGeometry(0.035, 6, 5), f.glowTips, 'tail', true); g.position.set(0, 0.04, -0.12); tail.add(g); }
    for (const leg of legs) { const g = part(new THREE.SphereGeometry(W * 0.06, 6, 4), f.glowTips, 'leg', true); g.position.y = -0.02; leg.add(g); }
    for (const w of folded) { const g = part(new THREE.SphereGeometry(W * 0.08, 6, 4), f.glowTips, 'wing', true); g.scale.set(0.4, 0.3, 1.6); g.position.set(0, 0, -L * 0.45); w.add(g); }
  }
  if (f.mech) {
    // Armour plates on the flanks and shoulders, lit rings at the joints, a lit crest strip.
    for (const x of [-1, 1]) for (const z of [L * 0.22, -L * 0.2]) {
      const plate = part(new THREE.BoxGeometry(0.01 + W * 0.04, H * 0.4, L * 0.24), '#d8dce4', 'body');
      plate.position.set(x * W * 0.47, bodyY + H * 0.08, z);
      plate.rotation.z = x * 0.12;
      body.add(plate);
    }
    for (const leg of legs) for (const y of [-0.02, -0.18]) {
      const r = part(new THREE.TorusGeometry(W * 0.11, 0.01, 4, 12), f.mech, 'leg', true);
      r.rotation.x = Math.PI / 2;
      r.position.y = y;
      leg.add(r);
    }
    const crest = part(new THREE.BoxGeometry(headR * 0.18, headR * 0.08, headR * 1.6), f.mech, 'accessory', true);
    crest.position.set(0, headR * 0.98, 0);
    head.add(crest);
  }
  if (f.hover) for (const leg of legs) {
    const pad = part(new THREE.CylinderGeometry(W * 0.16, W * 0.2, 0.02, 12), f.hover, 'foot', true);
    pad.position.y = -0.06;
    leg.add(pad);
  }
  if (f.brass) {
    // Clockwork: a gear on each flank, rivet lines, and a wind-up key standing from the back.
    for (const x of [-1, 1]) {
      const gear = part(new THREE.TorusGeometry(H * 0.2, H * 0.05, 5, 12), '#8a6a2a', 'body');
      gear.rotation.y = Math.PI / 2;
      gear.position.set(x * W * 0.5, bodyY, 0);
      body.add(gear);
      for (let t = 0; t < 8; t++) {
        const tooth = part(new THREE.BoxGeometry(0.01, H * 0.06, H * 0.06), '#8a6a2a', 'body');
        const a = (t / 8) * Math.PI * 2;
        tooth.position.set(x * W * 0.5, bodyY + Math.sin(a) * H * 0.27, Math.cos(a) * H * 0.27);
        body.add(tooth);
      }
      for (let i = 0; i < 6; i++) {
        const rv = part(new THREE.SphereGeometry(0.012 + W * 0.015, 5, 4), '#f2d27a', 'body');
        rv.position.set(x * W * 0.49, bodyY + H * 0.3, L * 0.3 - i * L * 0.12);
        body.add(rv);
      }
    }
    const shaft = part(new THREE.CylinderGeometry(W * 0.03, W * 0.03, H * 0.35, 6), '#8a6a2a', 'accessory');
    shaft.position.set(0, bodyY + H * 0.62, -L * 0.05);
    body.add(shaft);
    const bow = part(new THREE.TorusGeometry(H * 0.12, H * 0.03, 5, 12), '#f2d27a', 'accessory');
    bow.position.set(0, bodyY + H * 0.85, -L * 0.05);
    body.add(bow);
  }
  return wings;
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
  /**
   * How far its head is down to graze (0 up … 1 down at the grass): the head drops forward and
   * dips its nose, still floating clear of the body (animals/behaviour.ts decides when).
   */
  graze = 0;
  private grazeDrop = -1;
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
    coat = s.fantasy?.skin ?? (bird || s.kind === 'bird' ? 'feather' : 'fur');

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
      const b = buildDetailed(form as DetailedId, part, body, this.head, { L, H, W, bodyY, headR: s.headR, neck: s.neck, snout: s.snout }, c, a, { noHorns: s.noHorns });
      this.legs = b.legs;
      this.knees = b.knees;
      this.tail = b.tail;
      this.headBase.copy(b.headBase);
      this.head.position.copy(this.headBase);
      body.add(this.head);
      if (s.overlay) dress(s.overlay, body, this.head, this.legs, this.tail, { L, H, W, bodyY, headR: s.headR }, a);
      if (s.fantasy) this.wings.push(...enchant(s.fantasy, body, this.head, this.legs, this.tail, { L, H, W, bodyY, headR: s.headR }, c, a));
      this.mergeStatic();
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
      if (s.overlay) dress(s.overlay, body, this.head, this.legs, this.tail, { L, H, W, bodyY, headR: s.headR }, a);
      if (s.fantasy) enchant(s.fantasy, body, this.head, this.legs, this.tail, { L, H, W, bodyY, headR: s.headR }, c, a, b.wings);
      this.mergeStatic();
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
    // Fewer draw calls: what never moves by itself is merged within each moving part.
    this.mergeStatic();
  }

  /**
   * Fewer draw calls: what never moves by itself is merged within each moving part (legs, tail,
   * feathers, trappings). The torso and head keep their pieces (their structure is checked).
   */
  private mergeStatic(): void {
    const headParts = new Set<THREE.Object3D>();
    this.head.traverse((o) => { headParts.add(o); });
    mergeStaticMeshes(this.root, referencedObjects(this), (m) => m.userData.part === 'body' || headParts.has(m), headParts);
  }

  /** How far the head can drop to graze: its lowest point, tipped nose-down, a few centimetres above the ground. */
  private lowestDrop(): number {
    const hr = SPECIES[this.species].headR, box = new THREE.Box3(), tmp = new THREE.Box3();
    const prev = this.head.position.clone(), prevR = this.head.rotation.x;
    this.head.position.set(0, 0, 0);
    this.head.rotation.set(0.7, 0, 0);
    this.head.updateMatrixWorld(true);
    // In the head's own frame (its parent's transform aside).
    const inv = new THREE.Matrix4().copy(this.head.parent ? this.head.parent.matrixWorld : new THREE.Matrix4()).invert();
    this.head.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.computeBoundingBox();
      tmp.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld).applyMatrix4(inv);
      box.union(tmp);
    });
    this.head.position.copy(prev);
    this.head.rotation.x = prevR;
    const low = box.isEmpty() ? -hr : box.min.y;
    return Math.max(0, this.headBase.y + low - 0.08) * 0.9;
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
    // Grazing, the head drops forward towards the grass and nods as it crops — down to just above
    // the ground, measured from the head's own lowest point once it is tipped (a snout, a beak).
    const hr = SPECIES[this.species].headR, g = this.graze;
    if (this.grazeDrop < 0) this.grazeDrop = this.lowestDrop();
    const drop = this.grazeDrop;
    this.head.position.set(this.headBase.x, this.headBase.y - drop * g + Math.sin(t * 2 + this.phase * 0.2) * 0.015 + (g > 0.5 ? Math.sin(t * 4.5 + this.phase) * 0.03 * g : 0), this.headBase.z + hr * 0.9 * g);
    this.head.rotation.x = 0.7 * g;
    if (this.tail) this.tail.rotation.y = Math.sin(t * 3 + this.phase) * 0.3;
    this.folded.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (Math.max(0, Math.sin(t * 1.3 + this.phase)) * 0.12 + (moving ? Math.abs(Math.sin(this.phase * 2)) * 0.2 : 0))));
    if (this.wings.length) {
      const beat = Math.sin(t * (speed > 8 ? 7 : 1.6)) * (speed > 8 ? 0.55 : 0.12);
      this.wings[0].rotation.z = -0.5 + beat;
      this.wings[1].rotation.z = 0.5 - beat;
    }
  }
}
