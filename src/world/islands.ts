import * as THREE from 'three';
import { M, cyl, sphere, type GeoBuilder } from './kit';

/**
 * A floating island: a craggy mass of earth and rock, not a cone. The top is a lawn with a
 * ragged, overhanging edge; under it a band of dark earth with roots trailing out of it; then the
 * rock, bulging, lobed and uneven, narrowing to a heavy off-centre keel with smaller crags
 * hanging beside it. Built at the builder's current frame, top surface at y = 0, `R` across.
 */
export interface IslandLook { grass: string; earth: string; rock: string; rockDark: string; roots?: string; crystals?: string[] }

export const SKY_ISLAND: IslandLook = {
  grass: '#c8f0c0', earth: '#8a6a58', rock: '#cfc2ec', rockDark: '#a898d0', roots: '#6a5040', crystals: ['#9ae8ff', '#ffb8f0', '#fff08a'],
};

/** Returns the island's edge radius at each angle (so callers can put things on the edge, e.g. a waterfall). */
export function floatingIsland(g: GeoBuilder, glow: GeoBuilder | null, R: number, rnd: () => number, look: IslandLook = SKY_ISLAND): (a: number) => number {
  const ph = [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28, rnd() * 6.28];
  const lobes = 3 + Math.floor(rnd() * 3);
  // The outline: lobed, with a little roughness, the same all the way down so the island reads as one mass.
  const edge = (a: number) => 1 + 0.1 * Math.sin(lobes * a + ph[0]) + 0.06 * Math.sin((lobes + 2) * a + ph[1]) + 0.03 * Math.sin(11 * a + ph[2]);
  const depth = R * (1.05 + rnd() * 0.35);
  const keel = new THREE.Vector2(Math.cos(ph[3]), Math.sin(ph[3])).multiplyScalar(R * (0.12 + rnd() * 0.15));

  // Earth (t 0 … 0.2) and rock (t 0.2 … 1): rings of a lathe whose radius swells just under the
  // lawn, then falls away in a rounded belly with crags (a wobble that grows deeper down).
  const NS = 22;
  const ring = (t: number, i: number): THREE.Vector3 => {
    const a = (i / NS) * Math.PI * 2;
    const belly = t < 0.08 ? 1 + t * 0.6 : Math.pow(Math.max(0, 1 - Math.pow((t - 0.08) / 0.92, 1.5)), 0.72) * 1.05;
    const crag = 1 + t * (0.18 * Math.sin(a * (lobes + 1) + t * 7 + ph[2]) + 0.1 * Math.sin(a * 7 - t * 11 + ph[1]));
    const r = R * edge(a) * belly * crag;
    const k = t * t;
    return new THREE.Vector3(Math.cos(a) * r + keel.x * k, -t * depth + Math.sin(a * 3 + ph[0]) * R * 0.03 * t, Math.sin(a) * r + keel.y * k);
  };
  const band = (t0: number, t1: number, rows: number): THREE.BufferGeometry => {
    const pos: number[] = [], idx: number[] = [];
    for (let j = 0; j <= rows; j++) {
      const t = t0 + ((t1 - t0) * j) / rows;
      for (let i = 0; i < NS; i++) { const p = t >= 0.999 ? new THREE.Vector3(keel.x, -depth, keel.y) : ring(t, i); pos.push(p.x, p.y, p.z); }
    }
    for (let j = 0; j < rows; j++) for (let i = 0; i < NS; i++) {
      const a = j * NS + i, b = j * NS + ((i + 1) % NS), c = a + NS, d = b + NS;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    return geo;
  };
  g.add(band(0, 0.2, 2), look.earth);
  g.add(band(0.2, 0.55, 4), look.rock);
  g.add(band(0.55, 1, 5), look.rockDark);

  // The lawn: a gentle dome with a ragged lip that overhangs the earth a little.
  {
    const pos: number[] = [0, R * 0.08, 0], idx: number[] = [];
    const NR = 2;
    for (let j = 1; j <= NR; j++) for (let i = 0; i < NS; i++) {
      const a = (i / NS) * Math.PI * 2, f = j / NR, r = R * edge(a) * (j === NR ? 1.04 + 0.03 * Math.sin(a * 9 + ph[1]) : f);
      pos.push(Math.cos(a) * r, j === NR ? -0.12 : R * 0.08 * (1 - f * f), Math.sin(a) * r);
    }
    for (let i = 0; i < NS; i++) idx.push(0, 1 + ((i + 1) % NS), 1 + i);
    for (let i = 0; i < NS; i++) {
      const a = 1 + i, b = 1 + ((i + 1) % NS), c = a + NS, d = b + NS;
      idx.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    g.add(geo, look.grass);
  }

  // Smaller crags hanging off the underside, beside the keel.
  const crags = 2 + Math.floor(rnd() * 3);
  for (let k = 0; k < crags; k++) {
    const a = rnd() * Math.PI * 2, r = R * (0.35 + rnd() * 0.3), s = R * (0.18 + rnd() * 0.14), h = depth * (0.35 + rnd() * 0.35);
    const y = -depth * (0.25 + rnd() * 0.2);
    const geo = new THREE.ConeGeometry(s, h, 7, 2);
    const p = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const w = 1 + 0.2 * Math.sin(i * 1.7 + k);
      p.setX(i, p.getX(i) * w);
      p.setZ(i, p.getZ(i) * w);
    }
    geo.rotateX(Math.PI).translate(Math.cos(a) * r, y - h / 2 + s * 0.4, Math.sin(a) * r);
    geo.computeVertexNormals();
    g.add(geo, k % 2 ? look.rock : look.rockDark);
  }
  // Roots trailing out of the earth, and a few crystals glinting in the rock.
  if (look.roots) for (let k = 0; k < 7; k++) {
    const a = rnd() * Math.PI * 2, r = R * edge(a) * 0.98, len = R * (0.2 + rnd() * 0.35);
    cyl(g, 0.05, 0.12, len, look.roots, Math.cos(a) * r, -R * 0.1 - len / 2, Math.sin(a) * r, 4);
  }
  if (glow && look.crystals) for (let k = 0; k < 5; k++) {
    const t = 0.3 + rnd() * 0.5, i = Math.floor(rnd() * NS), p = ring(t, i);
    sphere(glow, R * 0.035 + 0.1, look.crystals[k % look.crystals.length], p.x * 0.98, p.y, p.z * 0.98, 5);
  }
  return (a: number) => R * edge(((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
}

/** Pastel crystal colours for the Sky Isles' crystal meadows. */
/** `c` with its hue turned by `dh` (0..1 of the wheel). */
function hueShift(c: string, dh: number): THREE.Color {
  const out = new THREE.Color(c), hsl = { h: 0, s: 0, l: 0 };
  out.getHSL(hsl);
  return out.setHSL((hsl.h + dh + 1) % 1, hsl.s, hsl.l);
}
export const CRYSTAL_PAL = ['#bfe8ff', '#e0c8ff', '#ffd6f0', '#c8fff0', '#fff4c0', '#d6d8ff'];

let crystalTemplate: THREE.BufferGeometry | null = null;
/** One crystal: a five-sided prism with a pointed tip, 1 m tall and 1 m across (scaled when placed). */
function crystalGeo(): THREE.BufferGeometry {
  if (!crystalTemplate) {
    const prism = new THREE.CylinderGeometry(0.5, 0.5, 1, 5, 1, true).translate(0, 0.5, 0);
    const tip = new THREE.ConeGeometry(0.5, 0.7, 5, 1, true).translate(0, 1.35, 0);
    const a = prism.toNonIndexed(), b = tip.toNonIndexed();
    const pos = new Float32Array(a.getAttribute('position').array.length + b.getAttribute('position').array.length);
    pos.set(a.getAttribute('position').array as Float32Array, 0);
    pos.set(b.getAttribute('position').array as Float32Array, a.getAttribute('position').array.length);
    crystalTemplate = new THREE.BufferGeometry();
    crystalTemplate.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    crystalTemplate.computeVertexNormals();
    prism.dispose(); tip.dispose(); a.dispose(); b.dispose();
  }
  return crystalTemplate.clone();
}

/**
 * A cluster of crystals growing out of the ground at (x, y, z), `size` metres tall at the most:
 * a few leaning prisms of different heights in pastel colours, the tallest with a faint glow at its tip.
 */
export function crystalCluster(g: GeoBuilder, glow: GeoBuilder | null, x: number, y: number, z: number, size: number, rnd: () => number, pal = CRYSTAL_PAL): void {
  const n = 3 + Math.floor(rnd() * 4), base = pal[Math.floor(rnd() * pal.length)];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + rnd(), lean = i === 0 ? rnd() * 0.15 : 0.25 + rnd() * 0.45;
    const h = size * (i === 0 ? 1 : 0.35 + rnd() * 0.5), w = h * (0.22 + rnd() * 0.1);
    // Each crystal its own hue, near its cluster's: deeper and cloudier at the root, paler and
    // clearer toward the tip; now and then a two-coloured one (like ametrine), root one colour, tip another.
    const own = hueShift(rnd() < 0.8 ? base : pal[Math.floor(rnd() * pal.length)], (rnd() - 0.5) * 0.14);
    const root = own.clone().offsetHSL(0, 0.12, -0.12), tip = rnd() < 0.2 ? hueShift(pal[Math.floor(rnd() * pal.length)], 0).offsetHSL(0, 0, 0.06) : own.clone().offsetHSL(0, -0.05, 0.08);
    const col = '#' + own.getHexString();
    const ox = Math.cos(a) * w * 0.5, oz = Math.sin(a) * w * 0.5;
    g.addGradient(crystalGeo(), root, tip, M(x + ox, y - 0.05, z + oz, rnd() * 6.28, w, h, w, Math.sin(a) * lean, -Math.cos(a) * lean));
    if (i === 0 && glow) sphere(glow, w * 0.35, col, x, y + h * 1.25, z, 5, 1.6);
  }
}
