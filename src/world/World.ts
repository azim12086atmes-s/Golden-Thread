import * as THREE from 'three';
import { Rng } from '../core/rng';
import { buildLandmark } from './architecture';
import { GeoBuilder } from './kit';
import { buildRegion, type Collider, type RegionInstance, type ResourceNode } from './RegionBuilder';
import { REGIONS, REGION_SIZE, regionCenter, type RegionSpec } from './regions';
import { CHUNK, WATER_Y, addPlatform, buildTerrainChunk, terrainHeight } from './terrain';
import { GRASS_UNIFORMS, MeadowField, patternGround } from './Meadow';
import { foamMaterial, shoreGeometry, waterMaterial } from './Water';
import { swayMaterial } from './wind';
import { LOCALES } from './locale';

/**
 * The world around the player. Terrain streams in chunks; each land's town streams as a whole;
 * every land's landmark is always present so you can see where you are going from far away.
 */
export class World {
  readonly group = new THREE.Group();
  /** Walls, roofs, trees and flowers: leaves and petals carry a sway weight and move in the wind. */
  readonly solid = swayMaterial(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.9, side: THREE.DoubleSide }));
  readonly glow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  readonly terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  private waterMat = waterMaterial();
  private foamMat = foamMaterial();
  private foams = new Map<string, THREE.Mesh>();
  /** The dense meadow of grass and flowers round the travellers. */
  readonly meadow = new MeadowField();
  /** Low graphics turns the meadow grass off (the patterned ground stays). */
  set grass(on: boolean) { this.meadow.enabled = on; }
  private chunks = new Map<string, THREE.Mesh>();
  private regions = new Map<string, RegionInstance>();
  private landmarkColliders: Collider[] = [];
  readonly landmarkPos = new Map<string, THREE.Vector3>();
  private water: THREE.Mesh;
  private pending: RegionSpec[] = [];
  onRegionLoaded?: (r: RegionInstance) => void;
  onRegionUnloaded?: (r: RegionInstance) => void;

  constructor() {
    patternGround(this.terrainMat);
    this.water = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1).rotateX(-Math.PI / 2), this.waterMat);
    this.water.position.y = WATER_Y;
    this.water.receiveShadow = true;
    this.group.add(this.water, this.meadow.group);
    this.buildLandmarks();
  }

  private buildLandmarks(): void {
    for (const r of REGIONS) {
      const c = regionCenter(r);
      const g = new GeoBuilder(), glow = new GeoBuilder();
      const out = buildLandmark({ g, glow, rng: new Rng(`landmark:${r.id}`), s: r });
      const grp = new THREE.Group();
      grp.position.set(c.x, 0, c.z);
      const m = g.build(this.solid), gm = glow.build(this.glow);
      if (m) { m.castShadow = true; m.receiveShadow = true; grp.add(m); }
      if (gm) grp.add(gm);
      this.group.add(grp);
      for (const col of out.colliders) this.landmarkColliders.push({ x: c.x + col.x, z: c.z + col.z, r: col.r, h: col.h });
      for (const p of out.platforms) addPlatform({ x: c.x + p.x, z: c.z + p.z, r: p.r, y: p.y });
      this.landmarkPos.set(r.id, new THREE.Vector3(c.x, 0, c.z));
    }
  }

  /** Stream around a point. Call every frame; work is spread across frames. */
  /** The water's look: the hour, and the land's own lantern colour that it glows with at night. */
  setWaterLook(t: number, night: number, land: keyof typeof LOCALES): void {
    const glow = LOCALES[land].lights[0];
    for (const m of [this.waterMat, this.foamMat]) {
      m.uniforms.t.value = t;
      m.uniforms.night.value = night;
      (m.uniforms.glow.value as THREE.Color).lerp(new THREE.Color(glow), 0.02);
    }
    GRASS_UNIFORMS.uNight.value = night;
  }

  update(focus: THREE.Vector3, night: number): void {
    // Glow brightens at night: day windows read as warm glass, night windows as light.
    this.glow.color.setScalar(0.45 + night * 0.95);
    this.water.position.x = focus.x;
    this.water.position.z = focus.z;

    const R = 5;
    const fx = Math.round(focus.x / CHUNK), fz = Math.round(focus.z / CHUNK);
    let built = 0;
    const want = new Set<string>();
    const order: Array<[number, number, number]> = [];
    for (let dx = -R; dx <= R; dx++) for (let dz = -R; dz <= R; dz++) {
      if (dx * dx + dz * dz > R * R + 1) continue;
      order.push([fx + dx, fz + dz, dx * dx + dz * dz]);
    }
    order.sort((a, b) => a[2] - b[2]);
    for (const [cx, cz] of order) {
      const key = `${cx},${cz}`;
      want.add(key);
      if (!this.chunks.has(key) && built < 3) {
        const m = buildTerrainChunk(cx, cz, this.terrainMat);
        this.chunks.set(key, m);
        this.group.add(m);
        built++;
      }
    }
    for (const [key, m] of this.chunks) {
      if (!want.has(key)) {
        this.group.remove(m);
        m.geometry.dispose();
        this.chunks.delete(key);
      }
    }

    this.meadow.update(focus, terrainHeight(focus.x, focus.z));

    // Regions: load when near, unload with hysteresis. One build per frame.
    for (const r of REGIONS) {
      const c = regionCenter(r);
      const d = Math.max(Math.abs(focus.x - c.x), Math.abs(focus.z - c.z)) - REGION_SIZE / 2;
      const loaded = this.regions.get(r.id);
      if (!loaded && d < 260 && !this.pending.includes(r)) this.pending.push(r);
      if (loaded && d > 420) {
        this.group.remove(loaded.group);
        loaded.dispose();
        this.regions.delete(r.id);
        const foam = this.foams.get(r.id);
        if (foam) { this.group.remove(foam); foam.geometry.dispose(); this.foams.delete(r.id); }
        this.onRegionUnloaded?.(loaded);
      }
    }
    if (this.pending.length) {
      this.pending.sort((a, b) => dist(focus, a) - dist(focus, b));
      const next = this.pending.shift()!;
      if (!this.regions.has(next.id)) {
        const inst = buildRegion(next, this.solid, this.glow);
        this.regions.set(next.id, inst);
        this.group.add(inst.group);
        // Foam round the land's lakes, ponds and river.
        const fg = shoreGeometry(next.id, WATER_Y);
        if (fg) { const fm = new THREE.Mesh(fg, this.foamMat); fm.renderOrder = 1; this.foams.set(next.id, fm); this.group.add(fm); }
        this.onRegionLoaded?.(inst);
      }
    }
  }

  /** Static colliders for set pieces that are not a land's town (e.g. the castle). */
  addColliders(list: Collider[]): void {
    this.landmarkColliders.push(...list);
  }

  isLoaded(id: string): boolean {
    return this.regions.has(id);
  }

  loadedRegions(): RegionInstance[] {
    return [...this.regions.values()];
  }

  /** Colliders near a point, including landmarks. */
  collidersNear(x: number, z: number, radius: number): Collider[] {
    const out: Collider[] = [];
    const test = (c: Collider) => { if (Math.abs(c.x - x) < radius + c.r && Math.abs(c.z - z) < radius + c.r) out.push(c); };
    for (const c of this.landmarkColliders) test(c);
    for (const r of this.regions.values()) {
      const rc = regionCenter(r.spec);
      if (Math.abs(rc.x - x) > REGION_SIZE / 2 + radius + 20 || Math.abs(rc.z - z) > REGION_SIZE / 2 + radius + 20) continue;
      for (const c of r.colliders) test(c);
    }
    return out;
  }

  /** Push a circle of radius `r` at height `y` out of any collider it overlaps. */
  resolve(p: THREE.Vector3, r: number): void {
    for (const c of this.collidersNear(p.x, p.z, r + 2)) {
      if (p.y > c.h - 0.2) continue;
      const dx = p.x - c.x, dz = p.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + r;
      if (d < min) {
        if (d < 1e-4) { p.x += min; continue; }
        p.x = c.x + (dx / d) * min;
        p.z = c.z + (dz / d) * min;
      }
    }
  }

  nodesNear(x: number, z: number, radius: number): ResourceNode[] {
    const out: ResourceNode[] = [];
    for (const r of this.regions.values()) for (const n of r.nodes) {
      if (Math.hypot(n.x - x, n.z - z) < radius) out.push(n);
    }
    return out;
  }
}

function dist(f: THREE.Vector3, r: RegionSpec): number {
  const c = regionCenter(r);
  return Math.hypot(f.x - c.x, f.z - c.z);
}
