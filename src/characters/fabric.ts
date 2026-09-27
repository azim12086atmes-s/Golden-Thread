import * as THREE from 'three';
import type { Pattern } from './modesty';

/**
 * Dress fabrics drawn as pictures (owner's brief: "designing dresses using image decals; if glowing,
 * a glow effect on them"). Each outfit's pattern — florals, stars, geometric tiles, dots, stripes,
 * borders, circuitry — is painted on a canvas in the garment's own colour with its trim and a second
 * accent, scattered unevenly (never a grid), over a fine woven grain so no cloth looks like plastic.
 * A glowing outfit gets a second picture of just its motifs as the glow, so the motifs shine and the
 * cloth only softly. Textures are cached per look; nothing is drawn where there is no canvas (tests).
 */

function rng(seed: number) {
  let s = seed || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}
const hash = (s: string) => { let h = 7; for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 2147483647; return h; };

function shift(hex: string, dh: number, dl = 0): string {
  const c = new THREE.Color(hex), hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return `#${new THREE.Color().setHSL((hsl.h + dh / 360 + 1) % 1, Math.min(1, hsl.s * 1.1 + 0.1), Math.min(0.92, Math.max(0.12, hsl.l + dl))).getHexString()}`;
}
const lum = (hex: string) => { const c = new THREE.Color(hex); return 0.3 * c.r + 0.59 * c.g + 0.11 * c.b; };

type Draw = (x: CanvasRenderingContext2D, S: number, r: () => number, col: { base: string; a: string; b: string; c: string }, glow: boolean) => void;

const star = (x: CanvasRenderingContext2D, cx: number, cy: number, R: number, points: number, inner: number, rot: number) => {
  x.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = rot + (i * Math.PI) / points, rr = i % 2 ? R * inner : R;
    x.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  x.closePath();
};
/** Scatter centres unevenly: jittered, with a minimum spacing, wrapping at the edges so the picture tiles. */
function scatter(S: number, n: number, minD: number, r: () => number): Array<[number, number, number]> {
  const out: Array<[number, number, number]> = [];
  for (let t = 0; out.length < n && t < n * 40; t++) {
    const p: [number, number, number] = [r() * S, r() * S, 0.55 + r() * 0.9];
    if (out.every(([x, y]) => { const dx = Math.min(Math.abs(x - p[0]), S - Math.abs(x - p[0])), dy = Math.min(Math.abs(y - p[1]), S - Math.abs(y - p[1])); return dx * dx + dy * dy > minD * minD; })) out.push(p);
  }
  return out;
}
/** Draw at a point and at its wrapped copies, so motifs cross the tile edges seamlessly. */
function wrapped(S: number, cx: number, cy: number, R: number, f: (x: number, y: number) => void) {
  for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
    const x = cx + dx, y = cy + dy;
    if (x > -R && x < S + R && y > -R && y < S + R) f(x, y);
  }
}

const DRAW: Record<Pattern, Draw> = {
  none: () => {},
  floral: (x, S, r, col) => {
    for (const [cx, cy, k] of scatter(S, 26, 34, r)) {
      const R = 11 * k, petals = 5 + Math.floor(r() * 2), rot = r() * 6, fill = r() < 0.5 ? col.a : col.b;
      wrapped(S, cx, cy, R * 2, (px, py) => {
        // Two leaves, then the petals, then a bright centre.
        x.fillStyle = col.c;
        for (const s of [-1, 1]) {
          x.save(); x.translate(px, py); x.rotate(rot + s * 2.2);
          x.beginPath(); x.ellipse(R * 1.25, 0, R * 0.75, R * 0.3, 0, 0, Math.PI * 2); x.fill(); x.restore();
        }
        x.fillStyle = fill;
        for (let i = 0; i < petals; i++) {
          const a = rot + (i / petals) * Math.PI * 2;
          x.beginPath(); x.ellipse(px + Math.cos(a) * R * 0.55, py + Math.sin(a) * R * 0.55, R * 0.55, R * 0.34, a, 0, Math.PI * 2); x.fill();
        }
        x.fillStyle = '#ffe89a'; x.beginPath(); x.arc(px, py, R * 0.26, 0, Math.PI * 2); x.fill();
      });
    }
    // Tiny buds between.
    for (const [cx, cy] of scatter(S, 40, 14, r)) wrapped(S, cx, cy, 4, (px, py) => { x.fillStyle = r() < 0.85 ? col.a : '#ffffff'; x.beginPath(); x.arc(px, py, 2.2, 0, Math.PI * 2); x.fill(); });
  },
  stars: (x, S, r, col) => {
    for (const [cx, cy, k] of scatter(S, 30, 26, r)) {
      // Most stars in the outfit's own trim colour, some gold, a few white.
      const R = 7 * k, q = r(), mine = q < 0.68, gold = q < 0.88, pts = r() < 0.5 ? 4 : 5;
      wrapped(S, cx, cy, R * 2, (px, py) => {
        x.fillStyle = mine ? col.a : gold ? '#ffe07a' : '#ffffff';
        star(x, px, py, R, pts, pts === 4 ? 0.28 : 0.45, r() * 3); x.fill();
      });
    }
    for (let i = 0; i < 140; i++) { x.fillStyle = `rgba(255,248,220,${0.3 + r() * 0.6})`; x.fillRect(r() * S, r() * S, 1.5, 1.5); }
  },
  geometric: (x, S, _r, col) => {
    // An eight-pointed star tile with its interlace, the way Islamic geometry repeats.
    const n = 4, T = S / n;
    x.strokeStyle = col.a; x.lineWidth = 3;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const cx = i * T, cy = j * T;
      star(x, cx, cy, T * 0.42, 8, 0.72, Math.PI / 8); x.stroke();
      x.fillStyle = (i + j) % 2 ? col.b : col.a; star(x, cx, cy, T * 0.14, 8, 0.6, 0); x.fill();
      x.beginPath(); x.rect(cx + T * 0.5 - T * 0.12, cy + T * 0.5 - T * 0.12, T * 0.24, T * 0.24); x.stroke();
    }
  },
  dots: (x, S, r, col) => {
    for (const [cx, cy, k] of scatter(S, 34, 30, r)) wrapped(S, cx, cy, 10, (px, py) => { x.fillStyle = r() < 0.7 ? col.a : col.b; x.beginPath(); x.arc(px, py, 5.5 * k, 0, Math.PI * 2); x.fill(); });
  },
  stripes: (x, S, r, col) => {
    let px = 0;
    while (px < S) {
      const w = 6 + Math.floor(r() * 3) * 6;
      x.fillStyle = r() < 0.5 ? col.a : col.b; x.globalAlpha = 0.85; x.fillRect(px, 0, w, S); x.globalAlpha = 1;
      x.fillStyle = col.c; x.fillRect(px + w + 5, 0, 2, S);
      px += w + 18 + Math.floor(r() * 2) * 10;
    }
  },
  bands: (x, S, r, col) => {
    // Zari borders: a wide band with a running motif between two fine lines, and a narrow one.
    for (const [y, h] of [[S * 0.62, 26], [S * 0.88, 10]] as const) {
      x.fillStyle = col.a; x.fillRect(0, y, S, h);
      x.fillStyle = '#f2cf6a'; x.fillRect(0, y - 3, S, 2); x.fillRect(0, y + h + 1, S, 2);
      if (h > 20) for (let px = 8; px < S; px += 16) { x.fillStyle = r() < 0.5 ? col.b : '#fff4c8'; star(x, px, y + h / 2, 7, 4, 0.4, Math.PI / 4); x.fill(); }
    }
    for (let i = 0; i < 26; i++) { x.fillStyle = col.b; x.beginPath(); x.arc(r() * S, r() * S * 0.5, 2, 0, Math.PI * 2); x.fill(); }
  },
  glow: (x, _S, r) => {
    // Circuit lines in cyan and violet, with small nodes.
    x.lineWidth = 2; x.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      let px = Math.round(r() * 16) * 16, py = Math.round(r() * 16) * 16;
      x.strokeStyle = r() < 0.5 ? '#3ef0ff' : '#b58cff';
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 4; k++) { if (r() < 0.5) px += (r() < 0.5 ? -1 : 1) * 32; else py += (r() < 0.5 ? -1 : 1) * 32; x.lineTo(px, py); }
      x.stroke();
      x.fillStyle = '#e8feff'; x.beginPath(); x.arc(px, py, 3, 0, Math.PI * 2); x.fill();
    }
  },
};

const cache = new Map<string, THREE.Material>();

/**
 * The material for a garment: its colour with the outfit's pattern painted on (and woven grain),
 * glowing from the motifs when `glow` > 0. Null where there is no canvas.
 */
export function fabricMaterial(pattern: Pattern, base: string, trim: string, glow: number): THREE.Material | null {
  if (typeof document === 'undefined') return null;
  const key = `${pattern}|${base}|${trim}|${glow}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const S = 256;
  // Accents: the trim, a second colour a little round the colour wheel, and a leafy/neutral third.
  const a = trim.toLowerCase() === base.toLowerCase() ? shift(base, 0, lum(base) > 0.6 ? -0.3 : 0.3) : trim;
  const col = { base, a, b: shift(a, 48, 0.05), c: shift(base, -30, lum(base) > 0.55 ? -0.22 : 0.18) };
  const paint = (motifsOnly: boolean) => {
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const x = cv.getContext('2d')!;
    x.fillStyle = motifsOnly ? `rgb(${Math.round(new THREE.Color(base).r * 255 * glow * 0.6)},${Math.round(new THREE.Color(base).g * 255 * glow * 0.6)},${Math.round(new THREE.Color(base).b * 255 * glow * 0.6)})` : base;
    x.fillRect(0, 0, S, S);
    if (!motifsOnly) {
      // Woven grain: fine warp and weft lines and a little mottling.
      const g = rng(99);
      for (let i = 0; i < S; i += 2) {
        x.fillStyle = `rgba(0,0,0,${0.025 + g() * 0.03})`; x.fillRect(i, 0, 1, S);
        x.fillStyle = `rgba(255,255,255,${0.02 + g() * 0.03})`; x.fillRect(0, i, S, 1);
      }
      for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(${g() < 0.5 ? '0,0,0' : '255,255,255'},0.035)`; x.beginPath(); x.arc(g() * S, g() * S, 3 + g() * 9, 0, Math.PI * 2); x.fill(); }
    }
    DRAW[pattern](x, S, rng(hash(key) + 5), col, motifsOnly);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    return t;
  };
  const map = paint(false);
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', map, roughness: 0.82, side: THREE.DoubleSide });
  if (glow > 0) {
    m.emissive = new THREE.Color('#ffffff');
    m.emissiveMap = pattern === 'none' ? map : paint(true);
    m.emissiveIntensity = pattern === 'none' ? glow : 0.7;
  }
  cache.set(key, m);
  return m;
}

/** Scale a garment's UVs so the picture's motifs come out about the same size on every garment (once per geometry). */
export function tileUVs(geo: THREE.BufferGeometry, tile = 0.34, once = false): void {
  if (geo.userData.tiled) return;
  geo.userData.tiled = true;
  geo.computeBoundingBox();
  const b = geo.boundingBox!, size = new THREE.Vector3();
  b.getSize(size);
  const around = Math.PI * Math.max(size.x, size.z), high = size.y;
  const uv = geo.getAttribute('uv') as THREE.BufferAttribute | undefined;
  if (!uv) return;
  // Borders (`once`) run round the garment once, low on it, instead of repeating up it.
  const ru = Math.max(1, Math.round(around / tile)), rv = once ? 1 : Math.max(0.5, high / tile);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv);
  uv.needsUpdate = true;
}
