import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CharacterModel, HERO_SCALE } from '../src/characters/CharacterModel';
import { OUTFITS } from '../src/characters/outfits';

/** The lowest ring of the skirt: its mean position and mean radius (in the body's frame). */
function hem(m: CharacterModel): { x: number; z: number; r: number } {
  let lo = Infinity; const pts: THREE.Vector3[] = [];
  m.root.traverse((o) => {
    const mm = o as THREE.Mesh;
    if (!mm.isMesh || mm.userData.part !== 'garment') return;
    const p = mm.geometry.getAttribute('position');
    for (let i = 0; i < p.count; i++) { const v = new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)); if (v.y < lo - 1e-4) { lo = v.y; pts.length = 0; } if (Math.abs(v.y - lo) < 1e-4) pts.push(v); }
  });
  const c = pts.reduce((a, v) => a.add(v), new THREE.Vector3()).divideScalar(pts.length);
  return { x: c.x, z: c.z, r: pts.reduce((a, v) => a + Math.hypot(v.x - c.x, v.z - c.z), 0) / pts.length };
}

describe('cloth that moves', () => {
  it('the skirt trails back as she walks, settles when she stops, and flares when she twirls', () => {
    const girl = new CharacterModel(OUTFITS['g-meadow'], '#e3b58f', HERO_SCALE.girl, 1, 'girl');
    const still = () => { for (let i = 0; i < 60; i++) girl.update(1 / 60, { speed: 0, airborne: false, riding: false, t: 0 }); };
    still();
    const rest = hem(girl);
    for (let i = 0; i < 60; i++) girl.update(1 / 60, { speed: 6, airborne: false, riding: false, t: i / 60 });
    expect(hem(girl).z).toBeLessThan(rest.z - 0.03); // forward is +z; the hem trails behind
    still();
    expect(Math.abs(hem(girl).z - rest.z)).toBeLessThan(0.02);
    girl.twirl = 1;
    still();
    expect(hem(girl).r).toBeGreaterThan(rest.r * 1.2);
    // The hem never rises: the cloth only swings, it is never lifted.
    let minY = Infinity;
    girl.root.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh && mm.userData.part === 'garment') { const p = mm.geometry.getAttribute('position'); for (let i = 0; i < p.count; i++) minY = Math.min(minY, p.getY(i)); } });
    girl.twirl = 0; still();
    let restY = Infinity;
    girl.root.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh && mm.userData.part === 'garment') { const p = mm.geometry.getAttribute('position'); for (let i = 0; i < p.count; i++) restY = Math.min(restY, p.getY(i)); } });
    expect(minY).toBeCloseTo(restY, 5);
  });
});
