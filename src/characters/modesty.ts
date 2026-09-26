/**
 * Modesty rules for every outfit (brief: "No revealing clothing … if you find dresses that are not
 * fully covering, merge them with pant and sleeve and headscarf designs to make the dresses
 * covering").
 *
 * Outfits are authored as *design references* — faithful to the inspiration, which may not be
 * covering — and `modestify()` merges in what is missing. The game only ever sees the result, and
 * `isModest()` is asserted over the whole wardrobe in tests/modesty.test.ts.
 */

export type Who = 'girl' | 'boy';
export type Sleeve = 'none' | 'cap' | 'short' | 'elbow' | 'three-quarter' | 'full';
export type Hem = 'mini' | 'thigh' | 'knee' | 'midi' | 'ankle' | 'floor';
export type Neckline = 'high' | 'modest' | 'open';
export type Fit = 'fitted' | 'loose';

export type TopStyle =
  | 'tunic' | 'kimono' | 'jeogori' | 'hanfu' | 'anarkali' | 'kurta' | 'sherwani' | 'abaya'
  | 'thobe' | 'bodice' | 'coat' | 'hoodie' | 'gown' | 'doublet' | 'parka' | 'robe' | 'suit'
  | 'angrakha' | 'kebaya' | 'blouse';
export type LowerStyle = 'skirt' | 'straight-skirt' | 'hakama' | 'trousers' | 'salwar' | 'churidar' | 'wrap' | 'none';
export type SleeveShape = 'fitted' | 'wide' | 'bell';
export type HeadStyle =
  | 'none' | 'hijab' | 'hijab-wrap' | 'hood' | 'hijab-hat'
  | 'kufi' | 'turban' | 'cap' | 'wide-hat' | 'gat' | 'songkok' | 'ghutra' | 'beanie' | 'hair';
export type OuterStyle = 'cape' | 'dupatta' | 'vest' | 'shawl' | 'haori' | 'cloak' | 'sash' | 'apron' | 'bisht';
export type Pattern = 'none' | 'bands' | 'stripes' | 'dots' | 'stars' | 'floral' | 'glow' | 'geometric';

/** A reference garment as seen in the inspiration, before merging. */
export interface Design {
  id: string;
  name: string;
  culture: string;
  who: Who;
  top: TopStyle;
  topColor: string;
  trim: string;
  sleeve: Sleeve;
  sleeveShape?: SleeveShape;
  hem: Hem;
  lower: LowerStyle;
  lowerColor: string;
  neckline?: Neckline;
  fit?: Fit;
  head?: { style: HeadStyle; color: string };
  outer?: { style: OuterStyle; color: string };
  pattern?: Pattern;
  /** Colour to use for anything modestify adds (under-trousers, under-sleeves, scarf). */
  layer?: string;
  note?: string;
  /** Tailoring touches that do not change coverage. */
  detail?: Detail;
}

export interface Detail {
  /** Trouser leg shape: bell-bottoms, or a gentle flare at the ankle. Both stay ankle-length. */
  legs?: 'bell' | 'flared';
  /** Overrides how far a long top flares at its hem (the style's own value when absent). */
  hemFlare?: number;
  /** A ribbon tied under the bust with a bow at the front. */
  ribbon?: string;
  /** Deep turned-back sleeve cuffs with buttons. */
  cuffs?: string;
  /** Button colour for the cuffs (defaults to the cuff colour). */
  buttons?: string;
  /** Glowing rainbow bands above the hem. */
  rainbow?: boolean;
  /** The fabric itself glows softly (0..1). */
  glow?: number;
  /** Rainbow branches with little blossoms winding down the skirt. */
  vines?: boolean;
}

/** The covering outfit the game renders. */
export interface Outfit extends Required<Omit<Design, 'outer' | 'note' | 'layer' | 'detail'>> {
  outer?: { style: OuterStyle; color: string };
  detail?: Detail;
  /** Always 'full' after merging. */
  sleeve: 'full';
  /** Coverage: always reaches the ankle, by the garment or by trousers beneath it. */
  hem: 'ankle' | 'floor';
  /** The reference garment's own length, for rendering the outer layer. */
  length: Hem;
  neckline: 'high' | 'modest';
  fit: 'loose';
  /** Always present: the ankle is always covered, by trousers if not by the hem. */
  underTrousers: string;
  /** Colour of the under-sleeve layer when the reference had short sleeves (else = topColor). */
  underSleeve: string;
  /** What was merged in, for the wardrobe card ("+ full sleeves, + headscarf"). */
  merged: string[];
  note?: string;
}

const GIRL_COVERINGS: HeadStyle[] = ['hijab', 'hijab-wrap', 'hood', 'hijab-hat'];
const TROUSERS: LowerStyle[] = ['trousers', 'salwar', 'churidar', 'hakama'];

export function modestify(d: Design): Outfit {
  const merged: string[] = [];
  const layer = d.layer ?? d.lowerColor;

  let underSleeve = d.topColor;
  if (d.sleeve !== 'full') {
    underSleeve = layer;
    merged.push('full sleeves');
  }

  const hem: 'ankle' | 'floor' = d.hem === 'floor' ? 'floor' : 'ankle';
  let lower = d.lower;
  const hasTrousers = TROUSERS.includes(d.lower);
  if (d.hem !== 'ankle' && d.hem !== 'floor' && !hasTrousers) {
    // Keep the reference's length on the top/skirt but add trousers to the ankle beneath it.
    merged.push('trousers');
    if (lower === 'none') lower = 'trousers';
  }

  const neckline: 'high' | 'modest' = d.neckline === 'high' ? 'high' : 'modest';
  if (d.neckline === 'open') merged.push('high neckline');

  if (d.fit === 'fitted') merged.push('looser cut');

  let head = d.head ?? { style: 'none' as HeadStyle, color: layer };
  if (d.who === 'girl' && !GIRL_COVERINGS.includes(head.style)) {
    head = { style: head.style === 'wide-hat' ? 'hijab-hat' : 'hijab', color: head.style === 'none' ? layer : head.color };
    merged.push('headscarf');
  }

  return {
    id: d.id,
    name: d.name,
    culture: d.culture,
    who: d.who,
    top: d.top,
    topColor: d.topColor,
    trim: d.trim,
    sleeve: 'full',
    sleeveShape: d.sleeveShape ?? 'fitted',
    hem,
    length: d.hem,
    lower,
    lowerColor: d.lowerColor,
    neckline,
    fit: 'loose',
    head,
    outer: d.outer,
    pattern: d.pattern ?? 'none',
    underTrousers: hasTrousers ? d.lowerColor : layer,
    underSleeve,
    merged,
    note: d.note,
    detail: d.detail,
  };
}

/** The invariant. Every outfit in the wardrobe must satisfy this. */
export function isModest(o: Outfit): boolean {
  if (o.sleeve !== 'full') return false;
  if (o.hem !== 'ankle' && o.hem !== 'floor') return false;
  if (!o.underTrousers) return false;
  if (o.neckline !== 'high' && o.neckline !== 'modest') return false;
  if (o.fit !== 'loose') return false;
  if (o.who === 'girl' && !GIRL_COVERINGS.includes(o.head.style)) return false;
  return true;
}
