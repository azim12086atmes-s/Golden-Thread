import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { GameState, PlacedDecor } from '../core/state';
import { buildHouse, lampPost } from '../world/architecture';
import { GeoBuilder, box, cyl, flowers, sphere, tent, tree } from '../world/kit';
import { REGION_BY_ID, type RegionId } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import type { World } from '../world/World';
import { CROPS, DECOR_BY_ID, PLOT_BY_ID, PLOT_SIZE } from './housing';

/** Builds the look of a piece of decor. Used for placed decor and for the build-mode ghost. */
export function buildDecor(kind: string, region: RegionId, seed: string, growth = 0, crop?: string): { g: GeoBuilder; glow: GeoBuilder } {
  const g = new GeoBuilder(), glow = new GeoBuilder();
  const rng = new Rng(seed);
  const spec = REGION_BY_ID[region];
  const ctx = { g, glow, rng, s: spec };
  const def = DECOR_BY_ID[kind];
  if (def?.style) {
    buildHouse({ ...ctx, s: REGION_BY_ID[def.style] });
    return { g, glow };
  }
  switch (kind) {
    case 'fence':
      for (const x of [-1.2, 1.2]) box(g, 0.15, 1.1, 0.15, '#8a5a36', x, 0, 0);
      for (const y of [0.4, 0.85]) box(g, 2.5, 0.1, 0.08, '#a8703f', 0, y, 0);
      break;
    case 'bench':
      box(g, 1.8, 0.1, 0.5, '#a8703f', 0, 0.45, 0);
      box(g, 1.8, 0.5, 0.08, '#a8703f', 0, 0.5, -0.22);
      for (const x of [-0.75, 0.75]) box(g, 0.1, 0.45, 0.45, '#6b4a2a', x, 0, 0);
      break;
    case 'flowerbed':
      box(g, 2.2, 0.25, 1.2, '#6b4a2a');
      flowers(g, 0, 0.25, 0, spec.flowers, () => rng.next(), 10);
      break;
    case 'farmbed': {
      box(g, 2.4, 0.28, 2.4, '#5a3a26');
      for (let i = 0; i < 5; i++) box(g, 2.2, 0.06, 0.18, '#4a2e1e', 0, 0.28, -0.9 + i * 0.45);
      if (crop && CROPS[crop]) {
        const cd = CROPS[crop], col = cd.leaf, ripe = cd.ripe, g1 = Math.min(1, growth);
        for (let i = 0; i < 9; i++) {
          const x = -0.8 + (i % 3) * 0.8, z = -0.8 + Math.floor(i / 3) * 0.8;
          if (cd.shape === 'stalk') {
            // Wheat and rice: a clump of tall stalks, heads turning gold as they ripen.
            for (let k = 0; k < 4; k++) {
              const h = 0.15 + g1 * (0.7 + (k % 2) * 0.15), ox = x + (k % 2 - 0.5) * 0.18, oz = z + (Math.floor(k / 2) - 0.5) * 0.18;
              cyl(g, 0.015, 0.02, h, col, ox, 0.3, oz, 3);
              if (g1 > 0.5) cyl(g, 0.035, 0.02, 0.18, g1 >= 1 ? ripe : col, ox, 0.3 + h, oz, 4);
            }
          } else if (cd.shape === 'vine') {
            // Pumpkins and strawberries: leaves spreading low, fruit sitting among them.
            sphere(g, 0.12 + g1 * 0.2, col, x, 0.33, z, 6, 0.45);
            if (g1 > 0.6) sphere(g, crop === 'seed_pumpkin' ? 0.1 + (g1 - 0.6) * 0.45 : 0.06, g1 >= 1 ? ripe : '#9ac85a', x + 0.15, 0.36, z + 0.1, 7, crop === 'seed_pumpkin' ? 0.75 : 1);
          } else if (cd.shape === 'flower') {
            const h = 0.15 + g1 * (crop === 'seed_sunflower' ? 1.3 : 0.5);
            cyl(g, 0.025, 0.03, h, col, x, 0.3, z, 4);
            sphere(g, 0.07, col, x + 0.08, 0.3 + h * 0.5, z, 4, 0.5);
            if (g1 >= 0.8) sphere(g, crop === 'seed_sunflower' ? 0.2 : 0.12, ripe, x, 0.3 + h, z, 7, crop === 'seed_sunflower' ? 0.35 : 1);
          } else {
            // Bushes: tomatoes, chillies, carrots, herbs, cotton, tea.
            const h = 0.12 + g1 * 0.45;
            cyl(g, 0.03, 0.04, h, '#5a7a3a', x, 0.3, z, 4);
            sphere(g, 0.1 + g1 * 0.18, col, x, 0.3 + h, z, 6, 0.9);
            if (g1 >= 1) for (let k = 0; k < 4; k++) sphere(g, crop === 'seed_carrot' ? 0.05 : 0.055, ripe, x + Math.cos(k * 1.6) * 0.18, 0.3 + h - 0.05 + (k % 2) * 0.1, z + Math.sin(k * 1.6) * 0.18, 4);
          }
        }
      }
      break;
    }
    case 'lamp-post':
      lampPost(ctx, 0, 0, 0);
      break;
    case 'tree':
      tree(g, spec.flora[0], 0, 0, 0, 1, () => rng.next());
      break;
    case 'tent':
      tent(g, 2.6, 3.2, spec.id === 'desert' ? '#2a2220' : '#f1d3a2', '#c23b2a');
      break;
    case 'pen':
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        cyl(g, 0.1, 0.1, 1, '#8a5a36', Math.cos(a) * 3.3, 0, Math.sin(a) * 3.3, 5);
      }
      cyl(g, 3.35, 3.35, 0.08, '#a8703f', 0, 0.8, 0, 12);
      cyl(g, 3.2, 3.2, 0.04, '#c9b06a', 0, 0.01, 0, 12);
      break;
    case 'cottage':
      buildHouse({ ...ctx, s: REGION_BY_ID.meadow });
      break;
    case 'torii':
      for (const x of [-1.6, 1.6]) cyl(g, 0.16, 0.2, 3.4, '#d42a2a', x, 0, 0, 8);
      box(g, 4.4, 0.3, 0.35, '#d42a2a', 0, 2.8, 0);
      box(g, 5, 0.3, 0.45, '#2a2a2a', 0, 3.4, 0);
      break;
    case 'flowerarch':
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * Math.PI;
        sphere(g, 0.35, spec.flowers[i % spec.flowers.length], Math.cos(a) * 1.4, Math.sin(a) * 2.2, 0, 5);
      }
      for (const x of [-1.4, 1.4]) cyl(g, 0.06, 0.06, 1, '#4a8a3a', x, 0, 0, 4);
      break;
    case 'fountain':
      cyl(g, 2.2, 2.4, 0.6, '#e8e2d4', 0, 0, 0, 14);
      cyl(g, 1.9, 1.9, 0.08, '#6ac8e8', 0, 0.56, 0, 14);
      cyl(g, 0.25, 0.35, 1.4, '#e8e2d4', 0, 0, 0, 8);
      cyl(g, 0.8, 0.4, 0.25, '#e8e2d4', 0, 1.4, 0, 10);
      sphere(glow, 0.18, '#bfe8ff', 0, 1.8, 0, 5);
      break;
    case 'rangoli':
      for (let r = 0; r < 4; r++) {
        const n = 6 + r * 4;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          cyl(g, 0.18, 0.18, 0.03, ['#e8364a', '#f2a13a', '#f2d14e', '#2f7a5a', '#5a8ab5'][(r + i) % 5], Math.cos(a) * r * 0.45, 0.01, Math.sin(a) * r * 0.45, 5);
        }
      }
      break;
    case 'star-arch':
      for (let i = 0; i <= 14; i++) {
        const a = (i / 14) * Math.PI;
        sphere(glow, 0.2, i % 2 ? '#fff4c0' : '#c8b8ff', Math.cos(a) * 1.8, Math.sin(a) * 2.8, 0, 5);
      }
      break;
    default:
      box(g, 1, 1, 1, '#ff00ff');
  }
  return { g, glow };
}

export class HousingView {
  private groups = new Map<string, THREE.Group>();
  private ghost: THREE.Group | null = null;
  private ghostKind = '';

  constructor(private scene: THREE.Scene, private st: GameState, private world: World) {}

  /** Rebuild the decor of every owned plot whose land is loaded. */
  refresh(growthOf: (d: PlacedDecor) => number): void {
    for (const [id, grp] of this.groups) {
      this.scene.remove(grp);
      grp.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); });
      this.groups.delete(id);
    }
    for (const [plotId, plot] of Object.entries(this.st.plots)) {
      const site = PLOT_BY_ID[plotId];
      if (!site || !this.world.isLoaded(site.region)) continue;
      const grp = new THREE.Group();
      const g = new GeoBuilder();
      // A soft lawn marks land you own.
      const y0 = surfaceAt(site.x, site.z);
      box(g, PLOT_SIZE, 0.06, PLOT_SIZE, '#8fc86a', 0, y0 - 0.02, 0);
      for (const d of plot.decor) {
        const y = surfaceAt(site.x + d.x, site.z + d.z);
        const built = buildDecor(d.kind, site.region, d.id, growthOf(d), d.crop?.seed);
        const m1 = built.g.build(this.world.solid), m2 = built.glow.build(this.world.glow);
        for (const m of [m1, m2]) {
          if (!m) continue;
          m.position.set(d.x, y, d.z);
          m.rotation.y = d.rot;
          m.castShadow = m === m1;
          m.receiveShadow = true;
          grp.add(m);
        }
      }
      const lawn = g.build(this.world.solid);
      if (lawn) { lawn.receiveShadow = true; grp.add(lawn); }
      // The group sits at the plot centre at y = 0; children carry absolute heights.
      grp.position.set(site.x, 0, site.z);
      this.scene.add(grp);
      this.groups.set(plotId, grp);
    }
  }

  setGhost(kind: string | null, region: RegionId): void {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost = null;
    }
    this.ghostKind = kind ?? '';
    if (!kind) return;
    const built = buildDecor(kind, region, 'ghost');
    const mat = new THREE.MeshBasicMaterial({ color: '#8affc0', transparent: true, opacity: 0.45, depthWrite: false });
    const grp = new THREE.Group();
    for (const b of [built.g, built.glow]) {
      const m = b.build(mat);
      if (m) grp.add(m);
    }
    this.ghost = grp;
    this.scene.add(grp);
  }

  moveGhost(x: number, y: number, z: number, rot: number, ok: boolean): void {
    if (!this.ghost) return;
    this.ghost.position.set(x, y, z);
    this.ghost.rotation.y = rot;
    this.ghost.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial | undefined;
      if (m?.color) m.color.set(ok ? '#8affc0' : '#ff8a8a');
    });
  }

  get ghostActive(): string {
    return this.ghostKind;
  }
}

