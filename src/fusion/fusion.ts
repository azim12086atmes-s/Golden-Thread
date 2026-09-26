import { DESIGN_REFERENCES } from '../characters/outfits';
import { isModest, modestify, type Design, type Outfit, type Who } from '../characters/modesty';
import { Rng } from '../core/rng';

/**
 * Fusion wardrobe (OPUS_002). Owner request: blend clothing styles "by permutations and
 * combinations apart from traditional clothing style". A fusion design takes its top, lower,
 * outer layer, headwear and palette from different source designs in the existing wardrobe,
 * follows compatibility rules so the result reads as one outfit, credits every source, and then
 * goes through the same modestify() as everything else. Pure and deterministic.
 */

export interface FusionSources { top: Design; lower: Design; outer: Design | null; head: Design; palette: Design }

/** Tops that are already a full-length robe: nothing is worn over them below the waist. */
const ROBES = new Set<Design['top']>(['abaya', 'thobe', 'robe', 'gown']);
/** Girls' head coverings only; boys may take any headwear from a boy's design. */
const GIRL_HEAD = new Set(['hijab', 'hijab-wrap', 'hood', 'hijab-hat']);

const hex = (c: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(c.trim());
  const n = m ? parseInt(m[1], 16) : 0x808080;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb: number[]) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
/** Pull a colour part of the way toward a key colour so borrowed pieces look like one outfit. */
export function harmonise(c: string, key: string, amount = 0.3): string {
  const a = hex(c), b = hex(key);
  return toHex(a.map((v, i) => v + (b[i] - v) * amount));
}

function cultureOf(d: Design): string {
  return d.culture.replace(/\s*[·(].*$/, '').trim();
}

const isRobe = (d: Design) => ROBES.has(d.top) && d.lower === 'none';

/** The source designs actually visible in a fusion (a robe hides the lower donor). */
export function usedSources(s: FusionSources): Design[] {
  const parts = [s.top, isRobe(s.top) ? null : s.lower, s.outer, s.head, s.palette].filter((d): d is Design => !!d);
  return parts.filter((d, i) => parts.findIndex((x) => x.id === d.id) === i);
}

export function fuse(who: Who, s: FusionSources, id: string): Design {
  const key = s.palette.topColor;
  const robe = isRobe(s.top);
  const lower = robe ? s.top : s.lower;
  const head = s.head.head ?? { style: who === 'girl' ? 'hijab' : 'hair', color: s.head.topColor };
  const used = usedSources(s);
  const cultures = [...new Set(used.map(cultureOf))];
  return {
    id,
    who,
    name: `${s.top.name} × ${robe ? s.head.name : s.lower.name}`,
    culture: `Fusion · ${cultures.join(' × ')}`,
    top: s.top.top,
    topColor: harmonise(s.top.topColor, key, 0.25),
    trim: s.palette.trim,
    sleeve: s.top.sleeve,
    sleeveShape: s.top.sleeveShape,
    hem: robe ? s.top.hem : s.lower.hem,
    lower: lower.lower,
    lowerColor: harmonise(lower.lowerColor, key, 0.3),
    neckline: s.top.neckline,
    fit: s.top.fit,
    head: { style: head.style, color: harmonise(head.color, key, 0.2) },
    ...(s.outer?.outer ? { outer: { style: s.outer.outer.style, color: harmonise(s.outer.outer.color, key, 0.3) } } : {}),
    pattern: s.palette.pattern ?? 'none',
    layer: harmonise(s.palette.layer ?? s.palette.lowerColor, key, 0.2),
    note: `Fusion of ${used.map((d) => `${d.name} (${d.culture})`).join(', ')}.`,
  };
}

/**
 * A deterministic set of fusion designs for one traveller. Each draws on at least three cultures,
 * no two share the same five sources, and every one is modest after modestify().
 */
export function fusionDesigns(who: Who, count: number, seed = 'golden-thread'): Design[] {
  const pool = DESIGN_REFERENCES.filter((d) => d.who === who && !d.culture.startsWith('Fusion'));
  const heads = pool.filter((d) => d.head && (who === 'boy' || GIRL_HEAD.has(d.head.style) || d.head.style === 'wide-hat'));
  const outers = pool.filter((d) => d.outer);
  const rng = new Rng(`${seed}:${who}`);
  const out: Design[] = [];
  const seen = new Set<string>();
  let tries = 0;
  while (out.length < count && tries++ < count * 60 && pool.length >= 3) {
    const top = rng.pick(pool);
    const lower = rng.pick(pool);
    const outer = outers.length && rng.chance(0.7) ? rng.pick(outers) : null;
    const head = heads.length ? rng.pick(heads) : top;
    const palette = rng.pick(pool);
    const cultures = new Set(usedSources({ top, lower, outer, head, palette }).map(cultureOf));
    if (cultures.size < 3) continue;
    if (lower.top === top.top && lower.lower === top.lower) continue; // no fusion if the halves are the same garment
    const sig = [top.id, lower.id, outer?.id ?? '-', head.id, palette.id].join('|');
    if (seen.has(sig)) continue;
    seen.add(sig);
    const d = fuse(who, { top, lower, outer, head, palette }, `fx-${who[0]}-${out.length + 1}`);
    if (!isModest(modestify(d))) continue; // cannot happen by construction; kept as a guard
    out.push(d);
  }
  return out;
}

/** Ready-to-wear fusion outfits, keyed by id, for the wardrobe. */
export function fusionOutfits(perTraveller = 24, seed?: string): Record<string, Outfit> {
  const designs = [...fusionDesigns('girl', perTraveller, seed), ...fusionDesigns('boy', perTraveller, seed)];
  return Object.fromEntries(designs.map((d) => [d.id, modestify(d)]));
}
