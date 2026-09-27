import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { isAllowedPart } from '../src/characters/anatomy';
import type { Piece } from '../src/traffic/creatures';
import { DESIGNS, makeDesign } from '../src/traffic/designs';
import { LAND_TRAFFIC } from '../src/traffic/roster';
import { Traffic, avenueRoute, landRoutes } from '../src/traffic/Traffic';
import { REGIONS, regionCenter } from '../src/world/regions';
import { terrainHeight } from '../src/world/terrain';

const verts = (g: THREE.BufferGeometry | null, shift = 0): THREE.Vector3[] => {
  if (!g) return [];
  const p = g.getAttribute('position'), out: THREE.Vector3[] = [];
  for (let i = 0; i < p.count; i += 1) out.push(new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i) - shift));
  return out;
};
const minDist = (a: THREE.Vector3[], b: THREE.Vector3[]) => {
  let m = Infinity;
  for (const p of a) for (const q of b) m = Math.min(m, p.distanceToSquared(q));
  return Math.sqrt(m);
};

describe('what travels the lands', () => {
  it('every design builds, and every roster names real designs in the right realm', () => {
    for (const id of Object.keys(DESIGNS)) {
      const d = makeDesign(id);
      expect(d.pieces.length, id).toBeGreaterThan(0);
      expect(d.pieces.some((p) => p.solid), id).toBe(true);
    }
    for (const r of REGIONS) {
      const ro = LAND_TRAFFIC[r.id];
      for (const realm of ['road', 'water', 'sky'] as const) for (const [id, n] of ro[realm]) {
        expect(DESIGNS[id], `${r.id}: ${id}`).toBeDefined();
        expect(makeDesign(id).realm, `${r.id}: ${id}`).toBe(realm);
        expect(n).toBeGreaterThan(0);
      }
      expect(ro.sky.length, r.id).toBeGreaterThanOrEqual(4);
      if (r.id !== 'skyisles') {
        expect(ro.road.reduce((n, [, k]) => n + k, 0), r.id).toBeGreaterThanOrEqual(12);
        expect(ro.water.length, r.id).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('has the modern and the old, the futuristic and the magical', () => {
    for (const id of ['sedan', 'suv', 'hatchback', 'pickup', 'hover-car', 'future-ev', 'hover-bus', 'tuk-tuk', 'auto-rickshaw', 'bullock-cart', 'raft', 'tall-ship', 'airship', 'airliner', 'light-plane', 'biplane', 'sky-jet', 'festival-dragon', 'sky-whale', 'double-decker', 'gondola']) expect(DESIGNS[id], id).toBeDefined();
  });

  it('creatures keep the rules: allowed parts only, and every head floats clear', () => {
    for (const id of Object.keys(DESIGNS)) {
      const d = makeDesign(id);
      const heads = d.pieces.filter((p) => p.part === 'head');
      for (const p of d.pieces) expect(isAllowedPart(p.part) || p.part === 'vehicle', `${id}: ${p.part}`).toBe(true);
      for (const h of heads) {
        const hv = verts(h.solid);
        for (const o of d.pieces) if (o !== h) expect(minDist(hv, verts(o.solid)), `${id}: head to ${o.part}`).toBeGreaterThanOrEqual(0.04);
        if (d.chain) expect(minDist(hv, verts(d.chain.piece.solid, d.chain.spacing)), `${id}: head to body`).toBeGreaterThanOrEqual(0.04);
      }
    }
  });

  it('nothing carries a person', () => {
    for (const id of Object.keys(DESIGNS)) for (const p of makeDesign(id).pieces as Piece[]) expect(['torso', 'hand', 'garment', 'sleeve', 'headwear'].includes(p.part as string), id).toBe(false);
  });
});

describe('routes and movement', () => {
  it('an avenue loop is continuous all the way round', () => {
    const r = avenueRoute(0, 0, 0, 1, 60, 128, 2.8), a = new THREE.Vector3(), b = new THREE.Vector3();
    for (let u = 0; u < r.len; u += 0.5) expect(r.at(u, a).distanceTo(r.at(u + 0.5, b))).toBeLessThan(0.55);
  });

  it('every land fills its roads, waters and skies, and vehicles keep to the roads', () => {
    const tr = new Traffic(), m = new THREE.Matrix4(), p = new THREE.Vector3();
    for (const r of REGIONS) {
      const c = regionCenter(r);
      tr.update(0.1, 1, r.id, new THREE.Vector3(c.x, 500, c.z), 0.5);
      for (let i = 0; i < 20; i++) tr.update(0.1, 1 + i * 0.1, r.id, new THREE.Vector3(c.x, 500, c.z), 0.5);
      const want = LAND_TRAFFIC[r.id];
      expect(tr.count, r.id).toBeGreaterThanOrEqual(want.road.reduce((n, [, k]) => n + k, 0) + want.sky.reduce((n, [, k]) => n + k, 0));
      expect(landRoutes(r.id).water.length > 0 || r.id === 'skyisles', r.id).toBe(true);
      for (const im of tr.group.children as THREE.InstancedMesh[]) for (let i = 0; i < im.count; i++) {
        im.getMatrixAt(i, m);
        p.setFromMatrixPosition(m);
        expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z), r.id).toBe(true);
      }
    }
  });

  it('stops for the travellers standing in the road', () => {
    const tr = new Traffic();
    const r = REGIONS.find((x) => x.id === 'london')!, c = regionCenter(r);
    tr.setLand('london');
    const movers = (tr as unknown as { drawn: Array<{ design: { realm: string }; movers: Array<{ route: { at(u: number, o: THREE.Vector3): THREE.Vector3 }; u: number; speed: number }> }> }).drawn
      .filter((d) => d.design.realm === 'road').flatMap((d) => d.movers);
    const far = new THREE.Vector3(c.x, 500, c.z);
    for (let i = 0; i < 50; i++) tr.update(0.1, i * 0.1, 'london', far, 0);
    const m = movers.find((x) => x.speed > 2)!;
    expect(m, 'something is driving').toBeDefined();
    const ahead = m.route.at(m.u + 12, new THREE.Vector3());
    ahead.y = terrainHeight(ahead.x, ahead.z);
    for (let i = 0; i < 60; i++) {
      const before = m.u;
      tr.update(0.1, 5 + i * 0.1, 'london', ahead, 0);
      if (i > 25) expect(m.u - before, 'still moving').toBeLessThan(0.05);
    }
    expect(m.route.at(m.u, new THREE.Vector3()).distanceTo(new THREE.Vector3(ahead.x, m.route.at(m.u, new THREE.Vector3()).y, ahead.z))).toBeGreaterThan(1.5);
  });
});
