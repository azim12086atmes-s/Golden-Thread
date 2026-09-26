import * as THREE from 'three';
import { AnimalModel } from '../animals/AnimalModel';

/**
 * An open carriage of white and gold with two separate cushioned seats — one each, a hand's width
 * of carved rail between them — drawn by two unicorns. Its wheels turn on the ground and its
 * ribbons stream when it flies.
 */
const mat = (c: string, glow = false) => glow
  ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.7), toneMapped: false })
  : new THREE.MeshStandardMaterial({ color: c, roughness: 0.6, metalness: c === '#f5c451' ? 0.4 : 0, flatShading: true });

/** Seat centres in the chariot's local frame (x across, z along; +z is forward). */
export const SEATS = { girl: new THREE.Vector3(-0.72, 0.95, -0.2), boy: new THREE.Vector3(0.72, 0.95, -0.2) };

export class Chariot {
  readonly root = new THREE.Group();
  private wheels: THREE.Object3D[] = [];
  private unicorns: AnimalModel[] = [];
  private ribbons: THREE.Mesh[] = [];

  constructor() {
    const add = (geo: THREE.BufferGeometry, c: string, x = 0, y = 0, z = 0, glow = false) => {
      const m = new THREE.Mesh(geo, mat(c, glow));
      m.position.set(x, y, z);
      m.castShadow = !glow;
      this.root.add(m);
      return m;
    };
    // The body: a rounded shell, open at the front.
    const shell = new THREE.SphereGeometry(1.2, 18, 10, Math.PI * 0.15, Math.PI * 1.7, Math.PI * 0.35, Math.PI * 0.4);
    shell.scale(1.25, 1, 1.1);
    add(shell, '#fbf4f8', 0, 1.35, -0.3).rotation.y = Math.PI;
    add(new THREE.BoxGeometry(2.7, 0.18, 2.1), '#fbf4f8', 0, 0.62, -0.3);
    add(new THREE.TorusGeometry(1.45, 0.05, 6, 40, Math.PI * 1.1), '#f5c451', 0, 1.25, -0.3).rotation.set(Math.PI / 2, 0, Math.PI * 0.95);
    // Her cushioned seat; beside it, a basket of roses (he rides his own winged unicorn).
    add(new THREE.BoxGeometry(0.9, 0.2, 0.8), '#f49ac1', SEATS.girl.x, 0.82, SEATS.girl.z);
    add(new THREE.BoxGeometry(0.9, 0.7, 0.15), '#f49ac1', SEATS.girl.x, 1.15, SEATS.girl.z - 0.45);
    add(new THREE.CylinderGeometry(0.35, 0.28, 0.35, 12), '#c9a06a', SEATS.boy.x, 0.9, SEATS.boy.z);
    for (let i = 0; i < 9; i++) add(new THREE.SphereGeometry(0.1, 6, 5), i % 3 ? '#e0284f' : '#ffffff', SEATS.boy.x + Math.cos(i * 0.7) * 0.2, 1.12 + (i % 2) * 0.06, SEATS.boy.z + Math.sin(i * 0.7) * 0.2);
    add(new THREE.BoxGeometry(0.12, 0.55, 0.9), '#f5c451', 0, 1.0, -0.2);
    // Wheels.
    for (const [x, z] of [[-1.45, -0.9], [1.45, -0.9], [-1.4, 0.5], [1.4, 0.5]]) {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.06, 6, 20), mat('#f5c451')));
      for (let k = 0; k < 6; k++) {
        const sp = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.9, 0.04), mat('#fbf4f8'));
        sp.rotation.z = (k / 6) * Math.PI;
        w.add(sp);
      }
      w.rotation.y = Math.PI / 2;
      w.position.set(x, 0.52, z);
      this.root.add(w);
      this.wheels.push(w);
    }
    // Shaft and harness of light to the unicorns.
    add(new THREE.BoxGeometry(0.08, 0.08, 2.4), '#f5c451', 0, 0.9, 1.9);
    for (const s of [-1, 1]) {
      const u = new AnimalModel('unicorn', 1.05);
      u.root.position.set(s * 0.95, 0, 3.7);
      this.root.add(u.root);
      this.unicorns.push(u);
      add(new THREE.CylinderGeometry(0.02, 0.02, 2.6, 5).rotateX(Math.PI / 2), '#fff2c8', s * 0.5, 1.2, 2.3, true);
    }
    // Ribbons streaming from the back of the shell.
    for (let i = 0; i < 4; i++) {
      const r = add(new THREE.PlaneGeometry(0.12, 1.4).translate(0, -0.7, 0), ['#ff8fb8', '#b3e6ff', '#fff27a', '#d9c2ff'][i], -0.9 + i * 0.6, 1.9, -1.35);
      (r.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
      this.ribbons.push(r);
    }
  }

  /** `speed` in m/s along the ground; `flying` streams the ribbons back and tucks the legs. */
  update(dt: number, speed: number, t: number, flying: boolean): void {
    for (const w of this.wheels) w.rotation.x += (flying ? 0.3 : speed / 0.5) * dt;
    for (const u of this.unicorns) u.update(dt, flying ? 6 : speed, t);
    this.ribbons.forEach((r, i) => { r.rotation.x = -(flying ? 1.2 : 0.2) - Math.sin(t * 6 + i) * 0.15; });
  }

  /** World position of a seat. */
  seat(who: 'girl' | 'boy', out: THREE.Vector3): THREE.Vector3 {
    return this.root.localToWorld(out.copy(SEATS[who]));
  }
}
