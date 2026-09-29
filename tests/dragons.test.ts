import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { isAllowedPart } from '../src/characters/anatomy';
import { DragonModel, fly } from '../src/creatures/dragonKit';
import { DRAGON_HOMES, flightOf, homeCentre } from '../src/creatures/Dragons';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGION_BY_ID, regionCenter } from '../src/world/regions';
import { WATER_Y, terrainHeight } from '../src/world/terrain';

const solid = new THREE.MeshStandardMaterial(), glow = new THREE.MeshBasicMaterial();

function verts(o: THREE.Object3D): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  o.updateMatrixWorld(true);
  o.traverse((m) => {
    const g = (m as THREE.Mesh).geometry;
    if (!(m as THREE.Mesh).isMesh || !g) return;
    const p = g.getAttribute('position');
    for (let i = 0; i < p.count; i += 3) out.push(new THREE.Vector3().fromBufferAttribute(p, i).applyMatrix4(m.matrixWorld));
  });
  return out;
}

describe('the dragon kit and every land\'s dragon', () => {
  it('builds each dragon of allowed parts only, its head floating clear of its neck, wings where it has them', () => {
    for (const h of DRAGON_HOMES) {
      const d = new DragonModel(h.spec);
      fly(d, flightOf(h), 5);
      d.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) expect(isAllowedPart(o.userData.part), `${h.spec.id}: ${o.userData.part}`).toBe(true); });
      // The head never touches the body: every head vertex is clear of every body vertex.
      const head = verts(d.head), body = verts(d.body).concat(verts(d.group.children[1]));
      let min = Infinity;
      for (const a of head) for (const b of body) min = Math.min(min, a.distanceToSquared(b));
      expect(Math.sqrt(min), h.spec.id).toBeGreaterThan(0.3);
      let wings = 0;
      d.group.traverse((o) => { if (o.userData.part === 'wing') wings++; });
      expect(wings > 0, h.spec.id).toBe(!!h.spec.wings);
    }
  });

  it('the great lung circles the Jade temple well clear of it, and is long', () => {
    const h = DRAGON_HOMES.find((x) => x.spec.id === 'jade-lung')!, d = new DragonModel(h.spec), f = flightOf(h), c = regionCenter(REGION_BY_ID.china);
    for (let t = 0; t < 60; t += 3) {
      fly(d, f, t);
      const pos = d.body.geometry.getAttribute('position');
      for (let i = 0; i < pos.count; i += 37) expect(Math.hypot(pos.getX(i) - c.x, pos.getZ(i) - c.z) > 23 || pos.getY(i) > 30).toBe(true);
    }
    d.body.geometry.computeBoundingBox();
    const s = new THREE.Vector3(); d.body.geometry.boundingBox!.getSize(s);
    expect(Math.max(s.x, s.z)).toBeGreaterThan(30);
  });

  it('flies clear over every house, tower and landmark of its land', () => {
    for (const h of DRAGON_HOMES) {
      if (h.dives) continue;
      const inst = buildRegion(REGION_BY_ID[h.land], solid, glow), f = flightOf(h), g = h.spec.girth;
      const p = new THREE.Vector3();
      for (let phi = 0; phi < Math.PI * 4; phi += 0.05) {
        f.path(phi, p);
        expect(p.y - terrainHeight(p.x, p.z), `${h.spec.id} over the ground`).toBeGreaterThan(g * 3 + 4);
        for (const col of inst.colliders) {
          if (Math.hypot(p.x - col.x, p.z - col.z) < col.r + g * 3 + 6) expect(p.y, `${h.spec.id} over a building`).toBeGreaterThan(col.h + g * 3 + 3);
        }
      }
    }
  }, 300_000);

  it('the sand wyrm arcs in and out of the dunes; the sea naga keeps to deep water', () => {
    const p = new THREE.Vector3();
    const sand = DRAGON_HOMES.find((x) => x.dives === 'sand')!, fs = flightOf(sand);
    let above = 0, below = 0;
    for (let phi = 0; phi < Math.PI * 2; phi += 0.05) { fs.path(phi, p); if (p.y > terrainHeight(p.x, p.z)) above++; else below++; }
    expect(above).toBeGreaterThan(10);
    expect(below).toBeGreaterThan(10);
    const sea = DRAGON_HOMES.find((x) => x.dives === 'sea')!, fw = flightOf(sea), c = homeCentre(sea);
    for (let phi = 0; phi < Math.PI * 2; phi += 0.05) {
      fw.path(phi, p);
      expect(terrainHeight(p.x, p.z), `sea naga at ${Math.round(p.x - c.x)},${Math.round(p.z - c.z)}`).toBeLessThan(WATER_Y - 2);
    }
  });
});
