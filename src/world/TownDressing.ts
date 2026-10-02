import * as THREE from 'three';
import { waterBasin } from './flowWater';
import { Rng } from '../core/rng';
import { GeoBuilder, archPanel, box, cone, cyl, dome, flowers, sphere } from './kit';
import { LOCALES, type Artifact } from './locale';
import type { RegionInstance } from './RegionBuilder';
import { regionCenter, type RegionId } from './regions';
import { surfaceAt } from './terrain';

/**
 * Dresses every town in its own glamour: the land's artifacts round the plaza and along the
 * avenues, lantern strings across the streets in the land's own colours, and warm light that
 * rises at dusk. Built once per town when it streams in (two merged meshes; four lamp lights, lit from a fixed pool).
 */

/** Where artifacts stand: just outside the plaza, in the four quarters between the avenues. */
export function artifactSpots(n: number): Array<{ x: number; z: number; face: number }> {
  const out: Array<{ x: number; z: number; face: number }> = [];
  for (let q = 0; q < 4; q++) {
    const mid = Math.PI / 4 + (q * Math.PI) / 2;
    for (let k = 0; k < n; k++) {
      const a = mid + (k - (n - 1) / 2) * 0.2;
      const r = 54 + (k % 2) * 4;
      out.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, face: Math.atan2(-Math.cos(a), -Math.sin(a)) });
    }
  }
  return out;
}

/** Lantern strings across the avenues (local z along the avenue, beyond the market street). */
export const STRING_AT = [110, 150, 190];

/**
 * How many town lights are ever in the scene. A fixed pool, moved to the nearest towns' lamps:
 * changing the number of lights in three.js recompiles every lit material (a stall each time a
 * land loaded or unloaded), so the count never changes.
 */
export const TOWN_LIGHT_POOL = 3;

export class TownDressing {
  private towns = new Map<string, { group: THREE.Group; lights: Array<{ pos: THREE.Vector3; color: string }> }>();
  private pool: THREE.PointLight[] = [];

  constructor(private scene: THREE.Scene, private solid: THREE.Material, private glowMat: THREE.Material, private waterMat?: THREE.Material) {
    for (let i = 0; i < TOWN_LIGHT_POOL; i++) {
      const l = new THREE.PointLight('#ffd9a0', 0, 60, 1.6);
      this.pool.push(l);
      scene.add(l);
    }
  }

  onRegionLoaded(inst: RegionInstance): void {
    const id = inst.spec.id;
    const L = LOCALES[id];
    const c = regionCenter(inst.spec);
    const g = new GeoBuilder(), glow = new GeoBuilder(), water = this.waterMat ? new GeoBuilder() : undefined;
    const rng = new Rng(`dressing:${id}`);
    const H = (x: number, z: number) => surfaceAt(c.x + x, c.z + z, 1e9);
    const light = (i: number) => L.lights[i % L.lights.length];

    // Artifacts round the plaza.
    const arts = L.artifacts;
    artifactSpots(arts.length).forEach((s, i) => {
      g.frame(c.x + s.x, H(s.x, s.z), c.z + s.z, s.face, 1, () => glow.frame(c.x + s.x, H(s.x, s.z), c.z + s.z, s.face, 1, () => {
        build(arts[i % arts.length], g, glow, light(i), light(i + 1), rng, water);
      }));
    });

    // Lantern strings across each avenue, and lantern posts at the plaza's four corners.
    if (id !== 'skyisles') {
      for (const d of STRING_AT) for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const cx = ax * d, cz = az * d;
        const px = az !== 0 ? 1 : 0, pz = ax !== 0 ? 1 : 0; // across the street
        const y0 = H(cx, cz);
        for (const sgn of [-1, 1]) cyl(g, 0.1, 0.12, 5.5, '#4a3a2a', c.x + cx + px * sgn * 9, y0, c.z + cz + pz * sgn * 9, 5);
        for (let k = 0; k <= 12; k++) {
          const f = k / 12 - 0.5;
          sphere(glow, 0.16, light(k), c.x + cx + px * f * 18, y0 + 5.2 - Math.cos(f * Math.PI) * 0.9, c.z + cz + pz * f * 18, 6, 1.2);
        }
      }
    }

    const group = new THREE.Group();
    const m = g.build(this.solid), gm = glow.build(this.glowMat);
    if (m) { m.castShadow = true; m.receiveShadow = true; group.add(m); }
    if (gm) group.add(gm);
    const wm = water && this.waterMat ? water.build(this.waterMat) : null;
    if (wm) { wm.renderOrder = 1; group.add(wm); }
    // Warm light over the plaza and the market that rises at dusk.
    const lights: Array<{ pos: THREE.Vector3; color: string }> = [];
    for (const [x, z, i] of [[0, 30, 0], [0, -30, 1], [30, 0, 2], [0, 80, 0]] as const) lights.push({ pos: new THREE.Vector3(c.x + x, H(x, z) + 9, c.z + z), color: light(i) });
    this.scene.add(group);
    this.towns.set(id, { group, lights });
  }

  onRegionUnloaded(inst: RegionInstance): void {
    const t = this.towns.get(inst.spec.id);
    if (!t) return;
    this.scene.remove(t.group);
    t.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
    this.towns.delete(inst.spec.id);
  }

  /** The pool's lights go to the town lamps nearest `focus`, lit by the night. */
  update(night: number, focus?: THREE.Vector3): void {
    const all = [...this.towns.values()].flatMap((t) => t.lights);
    if (focus) all.sort((a, b) => a.pos.distanceToSquared(focus) - b.pos.distanceToSquared(focus));
    this.pool.forEach((l, i) => {
      const spec = all[i];
      if (!spec) { l.intensity = 0; return; }
      l.position.copy(spec.pos);
      l.color.set(spec.color);
      l.intensity = night * 55;
    });
  }

  loaded(id: RegionId): boolean {
    return this.towns.has(id);
  }
}

/** One artifact, in local space facing +z. `a`/`b` are the land's light colours. */
function build(kind: Artifact, g: GeoBuilder, glow: GeoBuilder, a: string, b: string, rng: Rng, water?: GeoBuilder): void {
  const r = () => rng.next();
  switch (kind) {
    case 'toro': // Japanese stone lantern
      box(g, 1, 0.3, 1, '#9a9488', 0, 0, 0);
      cyl(g, 0.18, 0.22, 1.2, '#a8a298', 0, 0.3, 0, 6);
      box(g, 0.8, 0.6, 0.8, '#a8a298', 0, 1.5, 0);
      box(glow, 0.5, 0.4, 0.82, a, 0, 1.6, 0);
      cone(g, 0.8, 0.5, '#8a847a', 0, 2.1, 0, 4, Math.PI / 4);
      break;
    case 'lanternPole': // a tall pole hung with paper lanterns
      cyl(g, 0.1, 0.14, 5.5, '#4a3a2a', 0, 0, 0, 6);
      box(g, 2.4, 0.1, 0.1, '#4a3a2a', 0, 5.2, 0);
      for (const x of [-1, 0, 1]) {
        sphere(glow, 0.35, x ? a : b, x, 4.5, 0, 8, 1.3);
        cyl(g, 0.12, 0.16, 0.12, '#d4af37', x, 4.95, 0, 6);
      }
      break;
    case 'fountain':
      // A tiered fountain in a kerbed basin, its water turning and glowing (flowWater.ts).
      waterBasin({ g, glow, water }, 0, 0, 0, 2.2, { stone: '#e8dcc6', kerb: 0.65, tiers: true, jetHeight: 1.1 });
      break;
    case 'obelisk':
      box(g, 1.6, 0.6, 1.6, '#d4b070', 0, 0, 0);
      box(g, 0.9, 7, 0.9, '#e0c48a', 0, 0.6, 0);
      cone(g, 0.64, 0.9, '#d4af37', 0, 7.6, 0, 4, Math.PI / 4);
      sphere(glow, 0.2, a, 0, 8.6, 0, 6);
      break;
    case 'jar': // clay jars (onggi, amphorae, water pots)
      for (let i = 0; i < 4; i++) {
        const x = (i % 2) * 1.1 - 0.5, z = Math.floor(i / 2) * 1.1 - 0.5, s = 0.45 + r() * 0.25;
        sphere(g, s, i % 2 ? '#7a4a2a' : '#8a5a36', x, s * 1.1, z, 8, 1.2);
        cyl(g, s * 0.5, s * 0.55, 0.2, '#6b3a22', x, s * 2.1, z, 8);
      }
      break;
    case 'flowerCart':
      box(g, 2.2, 0.8, 1.2, '#a8703f', 0, 0.5, 0);
      for (const x of [-0.9, 0.9]) cyl(g, 0.45, 0.45, 0.1, '#6b4a2a', x, 0.45, 0.65, 10);
      flowers(g, 0, 1.3, 0, ['#ff8fb8', '#f2d14e', '#ffffff', '#b58ad9', '#ff6b6b'], r, 14);
      box(glow, 2.3, 0.08, 0.08, a, 0, 1.3, 0.62);
      break;
    case 'bunting':
      for (const x of [-4, 4]) cyl(g, 0.08, 0.1, 4.2, '#fbf7ee', x, 0, 0, 5);
      for (let k = 0; k < 11; k++) {
        const f = k / 10 - 0.5;
        cone(g, 0.28, 0.5, ['#e8576a', '#f2c14e', '#3a9ec8', '#7fb35a', '#c38fd9'][k % 5], f * 8, 3.3 - Math.cos(f * Math.PI) * 0.5, 0, 3);
        sphere(glow, 0.07, a, f * 8, 3.9 - Math.cos(f * Math.PI) * 0.5, 0, 5);
      }
      break;
    case 'neon': // a glowing shop sign
      for (const x of [-1.6, 1.6]) cyl(g, 0.08, 0.08, 3, '#3a3a44', x, 0, 0, 5);
      box(g, 3.6, 1.4, 0.2, '#1f1f28', 0, 3, 0);
      box(glow, 3.2, 0.14, 0.24, a, 0, 3.9, 0);
      box(glow, 3.2, 0.14, 0.24, b, 0, 3.2, 0);
      box(glow, 0.14, 0.9, 0.24, a, -1.5, 3.2, 0);
      box(glow, 0.14, 0.9, 0.24, b, 1.5, 3.2, 0);
      break;
    case 'booth': // a red telephone-style booth
      box(g, 1.1, 2.6, 1.1, '#c8232a', 0, 0, 0);
      box(glow, 0.8, 1.4, 1.12, '#fff2c8', 0, 0.9, 0);
      box(g, 1.2, 0.2, 1.2, '#a81d23', 0, 2.6, 0);
      break;
    case 'ice': // an ice sculpture, lit from inside
      for (let i = 0; i < 5; i++) cone(glow, 0.35 + r() * 0.25, 1.4 + r() * 1.6, i % 2 ? '#bfe8ff' : a, Math.cos(i * 1.3) * 0.6, 0, Math.sin(i * 1.3) * 0.6, 5);
      break;
    case 'crystal': // floating crystals
      for (let i = 0; i < 3; i++) {
        const y = 1.2 + i * 1.1;
        cone(glow, 0.3, 0.8, i % 2 ? a : b, Math.cos(i * 2) * 0.8, y, Math.sin(i * 2) * 0.8, 5);
        cone(glow, 0.3, 0.8, i % 2 ? a : b, Math.cos(i * 2) * 0.8, y, Math.sin(i * 2) * 0.8, 5, Math.PI);
      }
      cyl(g, 1, 1.2, 0.3, '#e6dcff', 0, 0, 0, 10);
      break;
    case 'diya': // a rangoli with a ring of little oil lamps
      cyl(g, 2, 2, 0.04, '#ff6b8b', 0, 0.01, 0, 20);
      cyl(g, 1.5, 1.5, 0.05, '#f2c14e', 0, 0.02, 0, 20);
      cyl(g, 1, 1, 0.06, '#3ac8ff', 0, 0.03, 0, 20);
      cyl(g, 0.5, 0.5, 0.07, '#7fb35a', 0, 0.04, 0, 12);
      for (let i = 0; i < 12; i++) {
        const t = (i / 12) * Math.PI * 2;
        cyl(g, 0.12, 0.08, 0.1, '#b5654a', Math.cos(t) * 2.3, 0, Math.sin(t) * 2.3, 6);
        sphere(glow, 0.07, '#ffb84a', Math.cos(t) * 2.3, 0.16, Math.sin(t) * 2.3, 5, 1.4);
      }
      break;
    case 'kolam': // a white kolam and a tall brass lamp
      cyl(g, 1.8, 1.8, 0.03, '#fbf8ef', 0, 0.01, 0, 8);
      cyl(g, 1.2, 1.2, 0.04, '#e8a86a', 0, 0.02, 0, 8);
      cyl(g, 0.5, 0.6, 0.15, '#d4af37', 0, 0.05, 0, 10);
      cyl(g, 0.08, 0.1, 1.4, '#d4af37', 0, 0.2, 0, 6);
      cyl(g, 0.45, 0.2, 0.15, '#d4af37', 0, 1.6, 0, 10);
      for (let i = 0; i < 5; i++) sphere(glow, 0.07, '#ffb84a', Math.cos(i * 1.26) * 0.4, 1.8, Math.sin(i * 1.26) * 0.4, 5);
      break;
    case 'penjor': // a tall curving bamboo pole with hanging ornaments
      for (let k = 0; k < 10; k++) cyl(g, 0.08, 0.09, 0.7, '#c9a86a', 0, k * 0.65, -k * k * 0.02, 5);
      for (let k = 0; k < 6; k++) cone(g, 0.18, 0.5, '#e8d0a8', 0, 5.8 - k * 0.2, -1.4 - k * 0.25, 5);
      sphere(glow, 0.2, a, 0, 5.2, -2.5, 6);
      break;
    case 'parasol': // tiered parasol (wagasa, temple umbrella, pajeng)
      cyl(g, 0.06, 0.06, 3.2, '#6b4a2a', 0, 0, 0, 5);
      cone(g, 1.6, 0.6, a, 0, 3.2, 0, 12);
      cone(g, 1.1, 0.4, b, 0, 3.6, 0, 12);
      sphere(glow, 0.12, '#fff2c8', 0, 3.1, 0, 6);
      break;
    case 'carpet': // rugs and cushions set out for guests
      box(g, 3, 0.05, 2.2, '#8a2a3a', 0, 0.01, 0);
      box(g, 2.6, 0.06, 1.8, '#d4af37', 0, 0.02, 0);
      box(g, 2.3, 0.07, 1.5, '#2f4a8a', 0, 0.03, 0);
      for (const x of [-1, 0, 1]) box(g, 0.6, 0.25, 0.4, ['#e8576a', '#f2c14e', '#3a9e8a'][x + 1], x, 0.05, -0.9);
      sphere(glow, 0.22, a, 1.2, 0.5, 0.8, 6, 1.3);
      break;
    case 'dallah': // a brass coffee pot on a low stand, beside a small fire bowl
      cyl(g, 0.5, 0.5, 0.4, '#6b4a2a', 0, 0, 0, 10);
      cyl(g, 0.22, 0.3, 0.5, '#d4af37', 0, 0.4, 0, 10);
      cone(g, 0.22, 0.3, '#d4af37', 0, 0.9, 0, 10);
      cyl(g, 0.4, 0.3, 0.3, '#3a2a22', 1.1, 0, 0, 10);
      sphere(glow, 0.2, '#ff9a3a', 1.1, 0.35, 0, 6);
      break;
    case 'boat':
      box(g, 1.2, 0.5, 3.4, '#8a5a36', 0, 0.2, 0);
      box(g, 1.3, 0.12, 3.5, '#b0322a', 0, 0.68, 0);
      cyl(g, 0.05, 0.05, 2.4, '#5a3a26', 0, 0.7, 0.3, 5);
      sphere(glow, 0.16, a, 0, 3.1, 0.3, 6);
      break;
    case 'statue': // a marble figure on a plinth — draped, abstract, without a face
      box(g, 1.4, 1.2, 1.4, '#e8dcc6', 0, 0, 0);
      cone(g, 0.5, 2.2, '#fbf7ee', 0, 1.2, 0, 10);
      sphere(g, 0.26, '#fbf7ee', 0, 3.7, 0, 8);
      box(glow, 1.42, 0.08, 1.42, a, 0, 1.2, 0);
      break;
    case 'chhatri': // a small domed pavilion
      box(g, 3, 0.4, 3, '#fbf7ee', 0, 0, 0);
      for (const [x, z] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) cyl(g, 0.14, 0.16, 2.6, '#fbf7ee', x, 0.4, z, 8);
      box(g, 3.2, 0.3, 3.2, '#fbf7ee', 0, 3, 0);
      dome(g, 1.4, '#fbf7ee', 0, 3.3, 0, 12);
      sphere(glow, 0.3, a, 0, 2, 0, 8);
      break;
    case 'flowerBox':
      box(g, 2.4, 0.6, 0.8, '#8a5a36', 0, 0, 0);
      flowers(g, 0, 0.6, 0, ['#ff8fb8', '#f2d14e', '#ffffff', '#d1495b'], r, 10);
      archPanel(glow, 0.5, 0.5, a, 1.4, 0.6, 0, 0, 0.05, false);
      break;
    case 'bench':
      box(g, 2.2, 0.12, 0.6, '#8a5a36', 0, 0.45, 0);
      box(g, 2.2, 0.5, 0.1, '#8a5a36', 0, 0.6, -0.28);
      for (const x of [-0.9, 0.9]) box(g, 0.1, 0.45, 0.5, '#3a3a44', x, 0, 0);
      cyl(g, 0.06, 0.08, 3, '#3a3a44', 1.4, 0, 0, 5);
      sphere(glow, 0.22, a, 1.4, 3.1, 0, 6);
      break;
  }
}
