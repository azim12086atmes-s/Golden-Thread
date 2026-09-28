import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { FestivalAir } from '../src/world/FestivalAir';
import { REGIONS } from '../src/world/regions';

describe('each land flies its own festival in the air', () => {
  it('builds and moves in every land, with something aloft in the festival lands', () => {
    const air = new FestivalAir(new THREE.MeshStandardMaterial(), new THREE.MeshBasicMaterial());
    const quiet = ['london', 'aurora', 'china'];
    for (const r of REGIONS) {
      for (let i = 0; i < 3; i++) air.update(1 / 60, i * 0.5, r.id, 0.8);
      let meshes = 0;
      air.group.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes++; });
      if (!quiet.includes(r.id)) expect(meshes, r.id).toBeGreaterThan(0);
      air.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) expect(Number.isFinite(m.position.x + m.position.y + m.position.z), r.id).toBe(true); });
    }
  }, 60000);
});
