import * as THREE from 'three';
import { Rng } from '../core/rng';
import type { RegionInstance } from '../world/RegionBuilder';
import { regionCenter, type RegionId } from '../world/regions';
import { surfaceAt } from '../world/terrain';
import { wardrobeFor } from './Townsfolk';

/**
 * The wider crowd that fills each town's streets: hundreds of people drawn cheaply (a few shared
 * instanced meshes per town) so a city can hold 300 at once. They walk the avenues and the ring
 * road on their own lanes, stroll round the plaza, and stand talking in little groups. Like
 * everyone in the game they have no faces and their heads float; they wear their land's colours
 * (taken from its own wardrobe), fully covered, many with headscarves, hats or caps.
 */

type Route =
  | { kind: 'avenue'; axis: 'x' | 'z'; lane: number; s: number; dir: number }
  | { kind: 'ring'; lane: number; a: number; dir: number }
  | { kind: 'plaza'; r: number; a: number; dir: number }
  | { kind: 'stand'; x: number; z: number; face: number };

interface Person { route: Route; speed: number; ph: number; scale: number }

interface Town { land: RegionId; cx: number; cz: number; meshes: THREE.InstancedMesh[]; people: Person[] }

const SKINS = ['#f1c9a5', '#e0ac85', '#c68b62', '#a8704a', '#8a5a3a', '#6b4630'];
const HAIR = ['#2a1f1a', '#4a3226', '#6b4a2a', '#1f1a1a', '#8a6a4a'];

function robeGeo(): THREE.BufferGeometry {
  // Long garment to the ankle (with a hint of shoes below).
  const g = new THREE.CylinderGeometry(0.17, 0.3, 1.05, 9);
  g.translate(0, 0.62, 0);
  return g;
}
function torsoGeo(): THREE.BufferGeometry {
  // Shoulders and two sleeves, hanging a little forward.
  const parts = [new THREE.CylinderGeometry(0.2, 0.17, 0.48, 9).translate(0, 1.38, 0)];
  for (const x of [-1, 1]) {
    const s = new THREE.CylinderGeometry(0.055, 0.07, 0.6, 6);
    s.rotateZ(x * 0.12);
    s.translate(x * 0.25, 1.3, 0.02);
    parts.push(s);
  }
  return mergeGeos(parts);
}
function headGeo(): THREE.BufferGeometry {
  return new THREE.SphereGeometry(0.13, 10, 8).translate(0, 1.8, 0);
}
function crownGeo(): THREE.BufferGeometry {
  // Hair, a cap or a headscarf: a shell over the top and back of the head.
  const g = new THREE.SphereGeometry(0.145, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
  g.translate(0, 1.82, -0.01);
  return g;
}

function mergeGeos(list: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const pos: number[] = [], nor: number[] = [], idx: number[] = [];
  let base = 0;
  for (const g of list) {
    const ng = g.index ? g.toNonIndexed() : g;
    const p = ng.getAttribute('position'), n = ng.getAttribute('normal');
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      idx.push(base + i);
    }
    base += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setIndex(idx);
  return out;
}

const GEOS = { robe: robeGeo(), torso: torsoGeo(), head: headGeo(), crown: crownGeo() };
const MAT = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 });

export class Crowd {
  private towns = new Map<RegionId, Town>();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private e = new THREE.Euler();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();

  constructor(private scene: THREE.Scene, readonly size: number) {}

  onRegionLoaded(inst: RegionInstance): void {
    const land = inst.spec.id;
    if (land === 'skyisles' || this.towns.has(land) || this.size <= 0) return;
    const rng = new Rng(`crowd:${land}`);
    const c = regionCenter(inst.spec);
    const n = this.size;
    const meshes = [GEOS.robe, GEOS.torso, GEOS.head, GEOS.crown].map((g) => {
      const im = new THREE.InstancedMesh(g, MAT, n);
      im.castShadow = false;
      im.frustumCulled = false;
      this.scene.add(im);
      return im;
    });
    const people: Person[] = [];
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const who = i % 2 ? 'boy' : 'girl';
      const pool = wardrobeFor(land, who);
      const o = pool[rng.int(0, pool.length - 1)];
      meshes[0].setColorAt(i, col.set(o.lowerColor === o.topColor ? o.topColor : rng.chance(0.5) ? o.topColor : o.lowerColor));
      meshes[1].setColorAt(i, col.set(o.outer?.color ?? o.topColor));
      meshes[2].setColorAt(i, col.set(SKINS[rng.int(0, SKINS.length - 1)]));
      meshes[3].setColorAt(i, col.set(o.head?.color ?? HAIR[rng.int(0, HAIR.length - 1)]));
      const f = i / n;
      let route: Route;
      if (f < 0.45) route = { kind: 'avenue', axis: i % 2 ? 'x' : 'z', lane: (rng.chance(0.5) ? 1 : -1) * rng.range(1.2, 7.5), s: rng.range(-230, 230), dir: rng.chance(0.5) ? 1 : -1 };
      else if (f < 0.7) route = { kind: 'ring', lane: rng.range(-5, 5), a: rng.range(0, Math.PI * 2), dir: rng.chance(0.5) ? 1 : -1 };
      else if (f < 0.86) route = { kind: 'plaza', r: rng.range(32, 48), a: rng.range(0, Math.PI * 2), dir: rng.chance(0.5) ? 1 : -1 };
      else {
        // Little groups standing and talking: between the avenues, just off the plaza and the ring.
        const g = Math.floor((i - n * 0.86) / 3), k = i % 3;
        let ga = 0.78 + g * 1.9;
        // Never on an avenue: keep well away from the two axes.
        if (Math.min(Math.abs(Math.cos(ga)), Math.abs(Math.sin(ga))) < 0.3) ga += 0.45;
        const gr = g % 2 ? 58 : 122;
        const gx = Math.cos(ga) * gr, gz = Math.sin(ga) * gr, a = (k / 3) * Math.PI * 2;
        route = { kind: 'stand', x: gx + Math.cos(a) * 1.1, z: gz + Math.sin(a) * 1.1, face: Math.atan2(-Math.cos(a), -Math.sin(a)) };
      }
      people.push({ route, speed: rng.range(0.9, 1.5), ph: rng.range(0, 10), scale: who === 'girl' ? rng.range(0.9, 0.98) : rng.range(0.98, 1.06) });
    }
    for (const im of meshes) if (im.instanceColor) im.instanceColor.needsUpdate = true;
    this.towns.set(land, { land, cx: c.x, cz: c.z, meshes, people });
  }

  onRegionUnloaded(inst: RegionInstance): void {
    const t = this.towns.get(inst.spec.id);
    if (!t) return;
    for (const im of t.meshes) {
      this.scene.remove(im);
      im.dispose();
    }
    this.towns.delete(inst.spec.id);
  }

  /** How many people are in town right now (for the tests and the journal). */
  count(land: RegionId): number {
    return this.towns.get(land)?.people.length ?? 0;
  }

  update(dt: number, t: number, player: THREE.Vector3): void {
    for (const town of this.towns.values()) {
      const near = Math.hypot(town.cx - player.x, town.cz - player.z) < 420;
      for (const im of town.meshes) im.visible = near;
      if (!near) continue;
      town.people.forEach((p, i) => {
        const r = p.route;
        let x: number, z: number, h: number, moving = true;
        if (r.kind === 'avenue') {
          r.s += r.dir * p.speed * dt;
          if (Math.abs(r.s) > 232) r.dir *= -1;
          const around = Math.abs(r.s) < 52 ? Math.sqrt(52 * 52 - r.s * r.s) * Math.sign(r.lane) + r.lane * 0.3 : r.lane;
          if (r.axis === 'z') { x = around; z = r.s; h = r.dir > 0 ? 0 : Math.PI; } else { x = r.s; z = around; h = r.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
        } else if (r.kind === 'ring') {
          const rad = 140 + r.lane;
          r.a += (r.dir * p.speed * dt) / rad;
          x = Math.cos(r.a) * rad; z = Math.sin(r.a) * rad;
          h = Math.atan2(-Math.sin(r.a) * r.dir, Math.cos(r.a) * r.dir);
        } else if (r.kind === 'plaza') {
          r.a += (r.dir * p.speed * 0.8 * dt) / r.r;
          x = Math.cos(r.a) * r.r; z = Math.sin(r.a) * r.r;
          h = Math.atan2(-Math.sin(r.a) * r.dir, Math.cos(r.a) * r.dir);
        } else {
          x = r.x; z = r.z; h = r.face; moving = false;
        }
        const wx = town.cx + x, wz = town.cz + z;
        const step = moving ? Math.abs(Math.sin(t * p.speed * 5 + p.ph)) * 0.05 : Math.sin(t * 1.3 + p.ph) * 0.01;
        const y = surfaceAt(wx, wz, 1e9) + step;
        const sway = moving ? Math.sin(t * p.speed * 5 + p.ph) * 0.05 : Math.sin(t * 0.7 + p.ph) * 0.06;
        this.q.setFromEuler(this.e.set(0, h, sway));
        this.m.compose(this.v.set(wx, y, wz), this.q, this.s.setScalar(p.scale));
        for (const im of town.meshes) im.setMatrixAt(i, this.m);
      });
      for (const im of town.meshes) im.instanceMatrix.needsUpdate = true;
    }
  }
}
