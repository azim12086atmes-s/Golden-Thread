import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { AnimalModel, SPECIES, type SpeciesId } from '../src/animals/AnimalModel';
import { FORBIDDEN_PARTS, isAllowedPart } from '../src/characters/anatomy';
import { CharacterModel } from '../src/characters/CharacterModel';
import { OUTFITS } from '../src/characters/outfits';

function meshes(root: THREE.Object3D): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  root.updateMatrixWorld(true);
  root.traverse((o) => { if ((o as THREE.Mesh).isMesh) out.push(o as THREE.Mesh); });
  return out;
}

function inside(o: THREE.Object3D, ancestor: THREE.Object3D): boolean {
  for (let p: THREE.Object3D | null = o; p; p = p.parent) if (p === ancestor) return true;
  return false;
}

function worldVerts(m: THREE.Mesh): THREE.Vector3[] {
  const pos = m.geometry.getAttribute('position');
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) out.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
  return out;
}

describe('no eyes, no faces, floating heads (brief)', () => {
  it('forbids facial parts by name', () => {
    for (const p of FORBIDDEN_PARTS) expect(isAllowedPart(p)).toBe(false);
  });

  for (const o of Object.values(OUTFITS)) {
    it(`traveller in "${o.id}" is built only from allowed parts, with a floating head`, () => {
      const c = new CharacterModel(o, '#e0ac85', 1, 1, o.who);
      const ms = meshes(c.root);
      expect(ms.filter(m => m.userData.part === 'glasses')).toHaveLength(5);
      expect(ms.some(m => m.userData.part === 'beard')).toBe(o.who === 'boy');
      expect(ms.some(m => m.name === 'curled-side-quiff')).toBe(o.who === 'boy' && ['hair', 'none'].includes(o.head.style));
      for (const m of ms) expect(isAllowedPart(m.userData.part), `${o.id}: ${m.userData.part}`).toBe(true);
      const head = ms.filter((m) => inside(m, c.head));
      const body = ms.filter((m) => !inside(m, c.head));
      expect(head.some((m) => m.userData.part === 'head')).toBe(true);
      const headBottom = Math.min(...head.flatMap(worldVerts).map((v) => v.y));
      // Only what is under the head counts — a cape's far hem or an outstretched hand is not "the neck".
      const bodyTop = Math.max(...body.flatMap(worldVerts).filter((v) => Math.hypot(v.x, v.z) < 0.3).map((v) => v.y));
      expect(headBottom - bodyTop, `${o.id} head gap`).toBeGreaterThanOrEqual(0.04);
    });
  }

  it('GT-CHAR-001 preserves identity across wardrobe changes and head bobbing', () => {
    const c = new CharacterModel(OUTFITS['b-meadow'], '#c99a74', 1, -1, 'boy');
    for (const outfit of Object.values(OUTFITS).filter(o => o.who === 'boy')) {
      c.setOutfit(outfit);
      for (let t = 0; t < 6; t += 0.25) {
        c.update(1/60, { speed: 0, airborne: false, riding: false, t });
        const ms = meshes(c.root);
        const head = ms.filter(m => inside(m, c.head)).flatMap(worldVerts);
        const body = ms.filter(m => !inside(m, c.head)).flatMap(worldVerts).filter(v => Math.hypot(v.x,v.z) < 0.3);
        expect(Math.min(...head.map(v=>v.y)) - Math.max(...body.map(v=>v.y))).toBeGreaterThan(0.03);
        expect(ms.filter(m => m.userData.part === 'beard')).toHaveLength(1);
        expect(ms.filter(m => m.userData.part === 'glasses')).toHaveLength(5);
      }
    }
  }, 60_000);

  for (const id of Object.keys(SPECIES) as SpeciesId[]) {
    it(`animal "${id}" has a detached head and no face`, () => {
      const a = new AnimalModel(id);
      const ms = meshes(a.root);
      for (const m of ms) expect(isAllowedPart(m.userData.part), `${id}: ${m.userData.part}`).toBe(true);
      const head = ms.filter((m) => inside(m, a.head)).flatMap(worldVerts);
      const body = ms.filter((m) => !inside(m, a.head)).flatMap(worldVerts);
      let min = Infinity;
      for (const h of head) for (const b of body) min = Math.min(min, h.distanceTo(b));
      expect(min, `${id} head clearance`).toBeGreaterThanOrEqual(0.03);
      // Real structure, not a blob: jointed legs (a knee or hock on each), a head built of parts.
      const legs = (a as unknown as { legs: THREE.Group[]; knees: THREE.Group[] }).legs;
      expect(legs.length, id).toBe(SPECIES[id].kind === 'quad' ? 4 : 2);
      for (const l of legs) expect(l.getObjectsByProperty('type', 'Group').length, `${id} jointed leg`).toBeGreaterThanOrEqual(2);
      expect(ms.filter((m) => inside(m, a.head)).length, `${id} head parts`).toBeGreaterThanOrEqual(3);
      expect(ms.filter((m) => m.userData.part === 'body').length, `${id} torso parts`).toBeGreaterThanOrEqual(3);
    });
  }
});
