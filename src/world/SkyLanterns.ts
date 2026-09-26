import * as THREE from 'three';
import { LOCALES } from './locale';
import { REGIONS, type RegionId } from './regions';

/**
 * Sky lanterns wherever you are: paper lanterns released somewhere nearby drift up into the
 * sky in the land's own colours — softly by day, glowing at night. One instanced mesh, recycled
 * round the travellers.
 */
export const SKY_LANTERNS = 110;
const RADIUS = 170, TOP = 170;

export class SkyLanterns {
  readonly mesh: THREE.InstancedMesh;
  private state = new Float32Array(SKY_LANTERNS * 5); // x, y, z offsets, speed, phase
  private land: RegionId | 'all' | null = null;
  /** At the celebration, lanterns rise in every land's colours at once. */
  everyLand = false;
  private tmp = new THREE.Matrix4();
  private col = new THREE.Color();

  constructor() {
    const geo = new THREE.CylinderGeometry(0.42, 0.3, 0.8, 8);
    this.mesh = new THREE.InstancedMesh(geo, new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false, transparent: true, opacity: 0.9 }), SKY_LANTERNS);
    this.mesh.frustumCulled = false;
  }

  private focus = new THREE.Vector3();

  /** Release a lantern somewhere around the travellers (world coordinates — you walk past them). */
  private respawn(i: number, anywhere: boolean): void {
    const a = Math.random() * Math.PI * 2, r = 30 + Math.random() * RADIUS;
    const f = this.focus;
    this.state.set([f.x + Math.cos(a) * r, f.y + (anywhere ? Math.random() * TOP : 4 + Math.random() * 10), f.z + Math.sin(a) * r, 0.9 + Math.random() * 0.9, Math.random() * 10], i * 5);
  }

  update(dt: number, t: number, focus: THREE.Vector3, land: RegionId, night: number): void {
    const first = this.focus.lengthSq() === 0 && focus.lengthSq() > 0;
    this.focus.copy(focus);
    if (first) for (let i = 0; i < SKY_LANTERNS; i++) this.respawn(i, true);
    const key = this.everyLand ? 'all' : land;
    if (key !== this.land) {
      this.land = key;
      const lights = this.everyLand ? REGIONS.flatMap((r) => LOCALES[r.id].lights) : LOCALES[land].lights;
      for (let i = 0; i < SKY_LANTERNS; i++) this.mesh.setColorAt(i, this.col.set(lights[i % lights.length]));
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
    const m = this.mesh.material as THREE.MeshBasicMaterial;
    m.color.setScalar(0.55 + night * 1.25);
    m.opacity = 0.55 + night * 0.4;
    for (let i = 0; i < SKY_LANTERNS; i++) {
      const s = i * 5;
      this.state[s + 1] += this.state[s + 3] * dt;
      const far = Math.hypot(this.state[s] - focus.x, this.state[s + 2] - focus.z) > RADIUS + 60;
      if (this.state[s + 1] > focus.y + TOP || far) this.respawn(i, far);
      const ph = this.state[s + 4], y = this.state[s + 1];
      const sway = Math.sin(t * 0.4 + ph) * (1 + (y - focus.y) * 0.03);
      this.tmp.makeTranslation(this.state[s] + sway, y, this.state[s + 2] + Math.cos(t * 0.3 + ph) * 0.8);
      this.mesh.setMatrixAt(i, this.tmp);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
