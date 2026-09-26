import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/**
 * GeoBuilder collects coloured primitives in a local frame stack and merges them into ONE mesh.
 * A whole land is a handful of draw calls: solid (lit), glow (lanterns/windows, bright at night),
 * and a few instanced/animated extras. Every primitive is authored with its base at y = 0.
 */
export class GeoBuilder {
  private parts: THREE.BufferGeometry[] = [];
  private stack: THREE.Matrix4[] = [new THREE.Matrix4()];
  private tmpColor = new THREE.Color();

  get size(): number {
    return this.parts.length;
  }

  /** Run `fn` with an extra local transform applied to everything it adds. */
  frame(x: number, y: number, z: number, ry = 0, s = 1, fn: () => void): void {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x, y, z),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)),
      new THREE.Vector3(s, s, s),
    );
    this.stack.push(this.top.clone().multiply(m));
    try {
      fn();
    } finally {
      this.stack.pop();
    }
  }

  private get top(): THREE.Matrix4 {
    return this.stack[this.stack.length - 1];
  }

  add(geo: THREE.BufferGeometry, color: THREE.ColorRepresentation, local?: THREE.Matrix4): this {
    let g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.deleteAttribute('uv');
    g.deleteAttribute('uv1');
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    const m = local ? this.top.clone().multiply(local) : this.top;
    g.applyMatrix4(m);
    this.tmpColor.set(color);
    const n = g.getAttribute('position').count;
    const cols = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      cols[i * 3] = this.tmpColor.r;
      cols[i * 3 + 1] = this.tmpColor.g;
      cols[i * 3 + 2] = this.tmpColor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    this.parts.push(g);
    return this;
  }

  build(material: THREE.Material): THREE.Mesh | null {
    if (!this.parts.length) return null;
    const merged = mergeGeometries(this.parts, false);
    for (const p of this.parts) p.dispose();
    this.parts = [];
    if (!merged) return null;
    merged.computeBoundingSphere();
    return new THREE.Mesh(merged, material);
  }
}

export const M = (x = 0, y = 0, z = 0, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
    new THREE.Vector3(sx, sy, sz),
  );

type C = THREE.ColorRepresentation;

// ───────────────────────── primitives ─────────────────────────

export function box(g: GeoBuilder, w: number, h: number, d: number, c: C, x = 0, y = 0, z = 0, ry = 0): void {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(0, h / 2, 0);
  g.add(geo, c, M(x, y, z, ry));
}

export function cyl(g: GeoBuilder, rTop: number, rBot: number, h: number, c: C, x = 0, y = 0, z = 0, seg = 8): void {
  const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg);
  geo.translate(0, h / 2, 0);
  g.add(geo, c, M(x, y, z));
}

export function cone(g: GeoBuilder, r: number, h: number, c: C, x = 0, y = 0, z = 0, seg = 8, ry = 0): void {
  const geo = new THREE.ConeGeometry(r, h, seg);
  geo.translate(0, h / 2, 0);
  g.add(geo, c, M(x, y, z, ry));
}

export function sphere(g: GeoBuilder, r: number, c: C, x = 0, y = 0, z = 0, seg = 8, sy = 1): void {
  const geo = new THREE.SphereGeometry(r, seg, Math.max(4, seg * 0.6));
  g.add(geo, c, M(x, y, z, 0, 1, sy, 1));
}

export function dome(g: GeoBuilder, r: number, c: C, x = 0, y = 0, z = 0, seg = 12, sy = 1): void {
  const geo = new THREE.SphereGeometry(r, seg, Math.max(3, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);
  g.add(geo, c, M(x, y, z, 0, 1, sy, 1));
}

/** Onion dome (Mughal, Islamic, Russian-adjacent silhouettes) with a finial. */
export function onion(g: GeoBuilder, r: number, c: C, x = 0, y = 0, z = 0, finial: C = '#d4af37'): void {
  const pts = [
    [0, 0], [r * 0.95, 0.05 * r], [r * 1.12, 0.45 * r], [r * 0.95, 0.9 * r],
    [r * 0.55, 1.25 * r], [r * 0.18, 1.55 * r], [0, 1.75 * r],
  ].map(([a, b]) => new THREE.Vector2(a, b));
  g.add(new THREE.LatheGeometry(pts, 12), c, M(x, y, z));
  cyl(g, 0.04 * r, 0.06 * r, 0.5 * r, finial, x, y + 1.7 * r, z, 5);
  sphere(g, 0.1 * r, finial, x, y + 2.2 * r, z, 5);
}

/** Gabled roof: ridge along X. Base w×d, rises h. */
export function gable(g: GeoBuilder, w: number, d: number, h: number, c: C, x = 0, y = 0, z = 0, ry = 0): void {
  const s = new THREE.Shape();
  s.moveTo(-d / 2, 0);
  s.lineTo(d / 2, 0);
  s.lineTo(0, h);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: w, bevelEnabled: false });
  geo.translate(0, 0, -w / 2);
  geo.rotateY(Math.PI / 2);
  g.add(geo, c, M(x, y, z, ry));
}

/** Four-sided hip roof. */
export function hip(g: GeoBuilder, w: number, d: number, h: number, c: C, x = 0, y = 0, z = 0, ry = 0): void {
  const geo = new THREE.ConeGeometry(Math.SQRT1_2, 1, 4);
  geo.rotateY(Math.PI / 4);
  geo.translate(0, 0.5, 0);
  g.add(geo, c, M(x, y, z, ry, w, h, d));
}

/**
 * East-Asian roof: a four-sided roof whose eaves sweep up at the corners. Built as a lathe with
 * four segments, so the profile's upturn becomes the corner lift.
 */
export function sweptRoof(g: GeoBuilder, w: number, d: number, h: number, c: C, x = 0, y = 0, z = 0, ry = 0, lift = 0.22): void {
  // Underside from the centre out to the eave tip, then the concave top surface up to the ridge.
  const tip = 0.14 + lift * 0.4;
  const pts = [
    [0, 0], [0.5, 0], [0.62, h * 0.05], [0.76, h * 0.12], [0.8, h * tip],
    [0.7, h * 0.14], [0.58, h * 0.22], [0.4, h * 0.42], [0.2, h * 0.7], [0.001, h],
  ].map(([a, b]) => new THREE.Vector2(a, b));
  const geo = new THREE.LatheGeometry(pts, 4);
  geo.rotateY(Math.PI / 4);
  g.add(geo, c, M(x, y, z, ry, w, 1, d));
}

/** Flat-faced arch panel (a doorway or window silhouette) — rectangle topped by a semicircle. */
export function archPanel(g: GeoBuilder, w: number, h: number, c: C, x = 0, y = 0, z = 0, ry = 0, depth = 0.12, pointed = false): void {
  const r = w / 2;
  const s = new THREE.Shape();
  s.moveTo(-r, 0);
  s.lineTo(-r, h - r);
  if (pointed) {
    s.quadraticCurveTo(-r, h - r * 0.2, 0, h + r * 0.15);
    s.quadraticCurveTo(r, h - r * 0.2, r, h - r);
  } else {
    s.absarc(0, h - r, r, Math.PI, 0, true);
  }
  s.lineTo(r, 0);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 6 });
  g.add(geo, c, M(x, y, z, ry));
}

/** A tent: n-sided cone, optionally with a striped second layer. */
export function tent(g: GeoBuilder, r: number, h: number, c: C, c2: C, x = 0, y = 0, z = 0, ry = 0): void {
  cone(g, r, h, c, x, y, z, 6, ry);
  cone(g, r * 1.02, h * 0.35, c2, x, y + h * 0.18, z, 6, ry);
}

/** A tree of the given species. Returns nothing: trees are merged into the land's mesh. */
export type Flora =
  | 'oak' | 'pine' | 'birch' | 'sakura' | 'palm' | 'cypress' | 'bamboo' | 'willow' | 'maple'
  | 'coconut' | 'olive' | 'orange' | 'snowpine' | 'cloud' | 'crystal' | 'banana' | 'plane'
  /** Hanging purple blossom (Japan, Korea). */
  | 'wisteria'
  /** Fan-leaved and gold (Korea, China). */
  | 'ginkgo'
  /** Gulmohar: a flat crown of flame-red flowers (India). */
  | 'flame'
  /** Violet blossom on a wide crown (South India, Mughal gardens). */
  | 'jacaranda'
  /** Rainbow eucalyptus: a trunk striped green, orange, blue and maroon (Indonesia). */
  | 'rainbowgum'
  /** A fat bottle trunk with a small crown (the desert, Egypt). */
  | 'baobab'
  /** Dragon's blood tree: an umbrella of branches (Middle East, desert). */
  | 'dragonblood'
  /** Pastel candy-floss trees (the Meadow, the Sky Isles). */
  | 'candy'
  /** Leaves that glow softly (the Aurora huts, the Sky Isles). */
  | 'glowtree'
  /** Pink-and-white saucer blossom (London, New York). */
  | 'magnolia'
  /** Quivering gold leaves (Norway, Switzerland). */
  | 'aspen';

export function tree(g: GeoBuilder, kind: Flora, x: number, y: number, z: number, s: number, rng: () => number): void {
  const trunk = '#7a5a3c';
  const v = rng();
  switch (kind) {
    case 'pine':
    case 'snowpine': {
      cyl(g, 0.18 * s, 0.25 * s, 1.2 * s, trunk, x, y, z, 5);
      const col = v > 0.5 ? '#2f6b4a' : '#3b7d55';
      for (let i = 0; i < 3; i++) {
        cone(g, (1.6 - i * 0.4) * s, 1.8 * s, col, x, y + (1 + i * 1.1) * s, z, 7);
        if (kind === 'snowpine') cone(g, (0.8 - i * 0.2) * s, 0.8 * s, '#f4f8ff', x, y + (2 + i * 1.1) * s, z, 7);
      }
      break;
    }
    case 'cypress':
      cyl(g, 0.12 * s, 0.18 * s, 0.8 * s, trunk, x, y, z, 5);
      sphere(g, 0.7 * s, '#44805a', x, y + 3 * s, z, 7, 3.4);
      break;
    case 'palm':
    case 'coconut': {
      const h = 5 * s;
      cyl(g, 0.14 * s, 0.24 * s, h, '#9b7a52', x, y, z, 6);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + v;
        const geo = new THREE.ConeGeometry(0.35 * s, 2.6 * s, 3);
        geo.translate(0, 1.3 * s, 0);
        g.add(geo, i % 2 ? '#3f9a4a' : '#52b25a', M(x, y + h, z, a, 1, 1, 1, 0, 1.9));
      }
      if (kind === 'coconut') sphere(g, 0.35 * s, '#6b4a2a', x, y + h - 0.3 * s, z, 5);
      break;
    }
    case 'bamboo':
      for (let i = 0; i < 5; i++) {
        const ox = (rng() - 0.5) * 1.4 * s, oz = (rng() - 0.5) * 1.4 * s;
        const h = (4 + rng() * 3) * s;
        cyl(g, 0.08 * s, 0.1 * s, h, '#7fb35a', x + ox, y, z + oz, 5);
        sphere(g, 0.6 * s, '#8ccf62', x + ox, y + h, z + oz, 5, 1.6);
      }
      break;
    case 'willow':
      cyl(g, 0.25 * s, 0.35 * s, 2.6 * s, trunk, x, y, z, 6);
      cone(g, 2.4 * s, 3.6 * s, '#9cc56a', x, y + 0.8 * s, z, 9);
      break;
    case 'crystal':
      for (let i = 0; i < 3; i++) cone(g, 0.4 * s, (2 + i) * s, i % 2 ? '#b8e8ff' : '#d8c8ff', x + i * 0.5 * s - 0.5 * s, y, z + (i % 2) * 0.4 * s, 5);
      break;
    case 'banana':
      cyl(g, 0.15 * s, 0.2 * s, 2.2 * s, '#8aa35a', x, y, z, 6);
      for (let i = 0; i < 5; i++) {
        const geo = new THREE.BoxGeometry(0.5 * s, 0.05 * s, 2 * s);
        geo.translate(0, 0, 1 * s);
        g.add(geo, '#4fa04a', M(x, y + 2.2 * s, z, (i / 5) * Math.PI * 2, 1, 1, 1, -0.5, 0));
      }
      break;
    case 'wisteria': {
      trunkWithBark(g, 0.2 * s, 0.32 * s, 2.4 * s, '#6b5040', x, y, z);
      sphere(g, 1.6 * s, '#6fa04a', x, y + 3 * s, z, 7, 0.7);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2 + v, r = (0.6 + (i % 3) * 0.4) * s;
        cone(g, 0.22 * s, (0.9 + (i % 4) * 0.25) * s, i % 3 ? '#b58ae0' : '#d9b8ff', x + Math.cos(a) * r, y + 2.1 * s, z + Math.sin(a) * r, 5);
      }
      break;
    }
    case 'ginkgo':
      trunkWithBark(g, 0.18 * s, 0.28 * s, 3 * s, '#7a6a52', x, y, z);
      for (let i = 0; i < 4; i++) cone(g, (1.4 - i * 0.25) * s, 1.4 * s, i % 2 ? '#f2c230' : '#ffd84a', x, y + (2.2 + i * 0.9) * s, z, 8);
      break;
    case 'flame':
      trunkWithBark(g, 0.2 * s, 0.34 * s, 2.6 * s, '#6b5040', x, y, z);
      sphere(g, 2.4 * s, '#3f8a3a', x, y + 3.1 * s, z, 8, 0.45);
      for (let i = 0; i < 16; i++) {
        const a = i * 2.4 + v * 6, r = (0.4 + ((i * 7) % 10) / 5) * s;
        sphere(g, 0.42 * s, i % 3 ? '#ff4a1f' : '#ff9a1f', x + Math.cos(a) * r, y + 3.5 * s + (i % 2) * 0.2 * s, z + Math.sin(a) * r, 5, 0.6);
      }
      break;
    case 'jacaranda':
      trunkWithBark(g, 0.18 * s, 0.3 * s, 2.4 * s, '#6b5040', x, y, z);
      for (const [dx, dy, dz, r] of [[0, 3.2, 0, 1.7], [1.2, 2.8, 0.4, 1.2], [-1.1, 2.9, -0.5, 1.2], [0.2, 3.9, -0.6, 1.0]] as const) sphere(g, r * s, v > 0.5 ? '#9a7ae0' : '#b08aef', x + dx * s, y + dy * s, z + dz * s, 7, 0.8);
      break;
    case 'rainbowgum': {
      const cols = ['#5aa05a', '#ff9a4a', '#4a7ad0', '#9a3a5a', '#e8d05a'];
      for (let i = 0; i < 6; i++) cyl(g, (0.34 - i * 0.03) * s, (0.36 - i * 0.03) * s, 0.9 * s, cols[(i + Math.floor(v * 5)) % 5], x, y + i * 0.9 * s, z, 7);
      sphere(g, 2.0 * s, '#4f9a4a', x, y + 6.2 * s, z, 7, 0.8);
      sphere(g, 1.4 * s, '#62ae52', x + 1.2 * s, y + 5.6 * s, z, 6, 0.8);
      break;
    }
    case 'baobab':
      cyl(g, 0.7 * s, 1.0 * s, 3.2 * s, '#a88a6a', x, y, z, 9);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2 + v;
        const geo = new THREE.CylinderGeometry(0.08 * s, 0.16 * s, 1.4 * s, 5);
        geo.translate(0, 0.7 * s, 0);
        g.add(geo, '#9a7a5a', M(x, y + 3.1 * s, z, a, 1, 1, 1, 0.9, 0));
        sphere(g, 0.5 * s, '#6a9a4a', x + Math.cos(a) * 1.2 * s, y + 4.2 * s, z + Math.sin(a) * 1.2 * s, 5, 0.6);
      }
      break;
    case 'dragonblood':
      cyl(g, 0.22 * s, 0.3 * s, 2.2 * s, '#8a7a6a', x, y, z, 6);
      for (let i = 0; i < 5; i++) {
        const geo = new THREE.CylinderGeometry(0.07 * s, 0.1 * s, 1.2 * s, 4);
        geo.translate(0, 0.6 * s, 0);
        g.add(geo, '#8a7a6a', M(x, y + 2.2 * s, z, (i / 5) * Math.PI * 2, 1, 1, 1, 0.6, 0));
      }
      sphere(g, 2.2 * s, '#3f6a3a', x, y + 3.3 * s, z, 9, 0.32);
      break;
    case 'candy': {
      trunkWithBark(g, 0.14 * s, 0.22 * s, 2.2 * s, '#e8d0e8', x, y, z);
      const pastel = ['#ffb8d8', '#b8d8ff', '#d8b8ff', '#fff0a8', '#b8ffd8'];
      for (const [dx, dy, dz, r] of [[0, 3, 0, 1.4], [0.9, 2.6, 0.3, 1.0], [-0.8, 2.7, -0.4, 1.0], [0, 3.9, 0, 0.9]] as const) sphere(g, r * s, pastel[Math.floor((v * 5 + dx + dy) * 7) % 5], x + dx * s, y + dy * s, z + dz * s, 7);
      break;
    }
    case 'glowtree':
      trunkWithBark(g, 0.14 * s, 0.24 * s, 2.6 * s, '#4a4a6a', x, y, z);
      for (let i = 0; i < 5; i++) cone(g, (1.3 - i * 0.2) * s, 1.2 * s, i % 2 ? '#7affd0' : '#9ad8ff', x, y + (2 + i * 0.75) * s, z, 7);
      break;
    case 'magnolia':
      trunkWithBark(g, 0.16 * s, 0.26 * s, 2.2 * s, '#6b5a4a', x, y, z);
      sphere(g, 1.6 * s, '#5a8a4a', x, y + 3 * s, z, 7, 0.9);
      for (let i = 0; i < 18; i++) {
        const a = i * 2.4 + v * 6, e = ((i * 5) % 9) / 9;
        sphere(g, 0.24 * s, i % 3 ? '#ffd6e6' : '#ffffff', x + Math.cos(a) * 1.55 * s * Math.cos(e), y + 3 * s + Math.sin(e) * 1.4 * s, z + Math.sin(a) * 1.55 * s * Math.cos(e), 5, 0.7);
      }
      break;
    case 'aspen':
      trunkWithBark(g, 0.1 * s, 0.16 * s, 3.4 * s, '#efeae0', x, y, z, '#3a3a3a');
      sphere(g, 1.0 * s, v > 0.5 ? '#ffd84a' : '#f2b830', x, y + 3.8 * s, z, 7, 1.6);
      break;
    default: {
      const leaf: Record<string, string[]> = {
        oak: ['#5c9c4a', '#6aab52', '#4f8c42'],
        birch: ['#9cc85a', '#b5d86a'],
        sakura: ['#ffc4dc', '#ffb0cf', '#ffd6e6'],
        maple: ['#e4572e', '#f29e4c', '#d1495b'],
        olive: ['#8a9a5b', '#9aab6a'],
        orange: ['#3f8a3a', '#4a9a44'],
        plane: ['#6aa84f', '#7cba5f'],
        cloud: ['#ffffff', '#f2f0ff'],
      };
      const cols = leaf[kind] ?? leaf.oak;
      const col = cols[Math.floor(v * cols.length)];
      trunkWithBark(g, 0.16 * s, 0.26 * s, 2 * s, kind === 'birch' ? '#e8e4da' : trunk, x, y, z, kind === 'birch' ? '#2a2a2a' : undefined);
      sphere(g, 1.5 * s, col, x, y + 2.8 * s, z, 7);
      // A lighter crown where the sun catches it.
      sphere(g, 0.9 * s, lighten(col), x + 0.3 * s, y + 3.6 * s, z + 0.2 * s, 6);
      sphere(g, 1.1 * s, col, x + 0.9 * s, y + 2.4 * s, z + 0.3 * s, 6);
      sphere(g, 1.0 * s, col, x - 0.7 * s, y + 2.6 * s, z - 0.5 * s, 6);
      if (kind === 'orange') for (let i = 0; i < 4; i++) sphere(g, 0.16 * s, '#ff9a1f', x + (rng() - 0.5) * 2 * s, y + (2.2 + rng()) * s, z + (rng() - 0.5) * 2 * s, 4);
    }
  }
}

/** A trunk with a root flare and bark bands (birch gets its dark marks). */
function trunkWithBark(g: GeoBuilder, rTop: number, rBot: number, h: number, c: C, x: number, y: number, z: number, marks?: string): void {
  cyl(g, rTop, rBot, h, c, x, y, z, 6);
  cyl(g, rBot * 1.05, rBot * 1.6, h * 0.12, c, x, y, z, 6);
  const band = marks ?? '#' + new THREE.Color(c as THREE.ColorRepresentation).multiplyScalar(0.72).getHexString();
  for (let i = 1; i < 4; i++) {
    const k = i / 4, r = rBot + (rTop - rBot) * k;
    cyl(g, r * 1.04, r * 1.06, h * (marks ? 0.03 : 0.05), band, x, y + h * k, z, 6);
  }
}

const lighten = (c: string) => '#' + new THREE.Color(c).lerp(new THREE.Color('#fff6c8'), 0.28).getHexString();

export function rock(g: GeoBuilder, x: number, y: number, z: number, s: number, c: C): void {
  const geo = new THREE.DodecahedronGeometry(s, 0);
  g.add(geo, c, M(x, y + s * 0.4, z, s * 3, 1, 0.7, 1.2));
}

export function flowers(g: GeoBuilder, x: number, y: number, z: number, cols: readonly string[], rng: () => number, n = 6): void {
  for (let i = 0; i < n; i++) {
    const fx = x + (rng() - 0.5) * 3, fz = z + (rng() - 0.5) * 3;
    cyl(g, 0.02, 0.02, 0.4, '#4a8a3a', fx, y, fz, 3);
    sphere(g, 0.14, cols[Math.floor(rng() * cols.length)], fx, y + 0.45, fz, 4);
  }
}
