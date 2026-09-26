import * as THREE from 'three';
import { CharacterModel, HERO_SCALE } from '../characters/CharacterModel';
import { OUTFITS } from '../characters/outfits';

/**
 * The castle's glamorous wardrobe: pink silk walls, gold mirrors, rails of gowns, a chandelier.
 * On a pedestal a gown is made from threads of light; a curtain closes; when it opens she is
 * wearing it. He waits across the room, a respectful distance away.
 *
 * `update(k)` is driven by the cinematic with k = seconds since the room appeared.
 */
const m = (c: string, glow = false) => glow
  ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.6), toneMapped: false })
  : new THREE.MeshStandardMaterial({ color: c, roughness: 0.7, flatShading: true, side: THREE.DoubleSide });

export class Wardrobe {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(50, 1, 0.05, 60);
  private gown = new THREE.Group();
  private curtain: THREE.Mesh;
  private sparks: THREE.Points;
  private girl: CharacterModel;
  private boy: CharacterModel;

  constructor(skin: { girl: string; boy: string }) {
    this.scene.background = new THREE.Color('#2b1a2e');
    this.scene.add(new THREE.HemisphereLight('#fff0f6', '#6a4a6a', 1.4));
    const key = new THREE.PointLight('#ffe0f0', 40, 20);
    key.position.set(0, 4.2, 1);
    this.scene.add(key);
    const add = (geo: THREE.BufferGeometry, c: string, x: number, y: number, z: number, glow = false) => {
      const me = new THREE.Mesh(geo, m(c, glow));
      me.position.set(x, y, z);
      this.scene.add(me);
      return me;
    };
    // Room.
    add(new THREE.BoxGeometry(12, 0.1, 10), '#f7e4ec', 0, 0, 0);
    add(new THREE.CircleGeometry(2.6, 40).rotateX(-Math.PI / 2), '#e8588c', 0, 0.06, -1.5);
    add(new THREE.BoxGeometry(12, 5, 0.1), '#f5c6d8', 0, 2.5, -5);
    for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.1, 5, 10), '#f7d3e2', s * 6, 2.5, 0);
    // Gold-framed mirrors along the back wall, glowing softly.
    for (const x of [-4, 4]) {
      add(new THREE.BoxGeometry(1.8, 3.2, 0.08), '#f5c451', x, 2.1, -4.9);
      add(new THREE.PlaneGeometry(1.5, 2.9), '#b9d6ea', x, 2.1, -4.84);
    }
    // Rails of gowns in many colours down both sides.
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.03, 0.03, 7, 6).rotateX(Math.PI / 2), '#f5c451', s * 5.2, 2.6, -0.5);
      for (let i = 0; i < 9; i++) {
        const col = ['#ffb3d1', '#b3e6ff', '#fff2a8', '#d9c2ff', '#c8f5d0', '#ffd1b3'][i % 6];
        const d = add(new THREE.ConeGeometry(0.42, 1.9, 10, 1, true), col, s * 5.2, 1.55, -3.6 + i * 0.8);
        d.rotation.x = Math.PI;
        d.position.y = 1.62;
      }
    }
    // Chandelier.
    add(new THREE.TorusGeometry(0.8, 0.05, 6, 30).rotateX(Math.PI / 2), '#f5c451', 0, 4.3, -1);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      add(new THREE.SphereGeometry(0.07, 6, 5), '#fff2c8', Math.cos(a) * 0.8, 4.2, -1 + Math.sin(a) * 0.8, true);
    }
    // Pedestal where the gown is made, and a curtain that closes around it.
    add(new THREE.CylinderGeometry(0.9, 1, 0.3, 24), '#fbf1f4', 0, 0.2, -1.5);
    add(new THREE.TorusGeometry(0.95, 0.03, 6, 30).rotateX(Math.PI / 2), '#f5c451', 0, 0.36, -1.5, true);
    this.buildGown();
    this.gown.position.set(0, 0.35, -1.5);
    this.scene.add(this.gown);
    this.curtain = add(new THREE.CylinderGeometry(1.25, 1.25, 3.4, 24, 1, true), '#e8588c', 0, 2.05, -1.5);
    this.curtain.scale.y = 0.001;
    // Spiral of sparkles that weaves the gown.
    const n = 500;
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      c.setHSL((i / n) % 1, 0.8, 0.75);
      col.set([c.r, c.g, c.b], i * 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.sparks = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    this.scene.add(this.sparks);

    // The travellers: she steps from behind the curtain in the gown; he waits across the room.
    this.girl = new CharacterModel(OUTFITS['g-starlight-gown'], skin.girl, HERO_SCALE.girl, 1, 'girl');
    this.girl.root.position.set(0, 0.35, -1.5);
    this.girl.root.visible = false;
    this.boy = new CharacterModel(OUTFITS['b-celebration'], skin.boy, HERO_SCALE.boy, -1, 'boy');
    this.boy.root.position.set(2.5, 0.05, 0.4);
    this.boy.root.rotation.y = -2.2;
    this.scene.add(this.girl.root, this.boy.root);
    this.camera.position.set(0, 2.1, 5.2);
    this.camera.lookAt(0, 1.4, -1.5);
  }

  /** The gown on its stand: bodice, a wide starry skirt with rainbow hem, bell sleeves on a form. */
  private buildGown(): void {
    const g = this.gown;
    const pink = m('#f7a6cf'), star = m('#fff3b0', true);
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.75, 1.3, 20, 1, true), pink);
    skirt.position.y = 0.7;
    g.add(skirt);
    const bodice = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.5, 14), pink);
    bodice.position.y = 1.6;
    g.add(bodice);
    ['#ff6b8b', '#ffb347', '#fff27a', '#7dffa8', '#6bc8ff', '#b99bff'].forEach((c, i) => {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.74 - i * 0.02, 0.012, 4, 36), m(c, true));
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.1 + i * 0.03;
      g.add(ring);
    });
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), star);
      const a = i * 2.4, y = 0.2 + (i % 9) * 0.13, r = 0.72 - y * 0.38 + 0.01;
      s.position.set(Math.cos(a) * r, y, Math.sin(a) * r);
      g.add(s);
    }
    g.scale.setScalar(0.001);
  }

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  /**
   * 0–5 s: threads of light spiral up and the gown grows on its stand.
   * 5–6.2 s: the curtain closes. 6.2–7.4 s: it opens — she is wearing it.
   */
  update(dt: number, k: number): void {
    const weave = THREE.MathUtils.smoothstep(k, 0.4, 5);
    this.gown.scale.setScalar(Math.max(0.001, weave));
    this.gown.rotation.y = k * 0.4;
    const pos = this.sparks.geometry.attributes.position as THREE.BufferAttribute;
    const n = pos.count;
    for (let i = 0; i < n; i++) {
      const f = (i / n + k * 0.25) % 1;
      const a = f * Math.PI * 14 + k * 2, r = 1.1 - f * 0.6;
      pos.setXYZ(i, Math.cos(a) * r, 0.35 + f * 2.3, -1.5 + Math.sin(a) * r);
    }
    pos.needsUpdate = true;
    (this.sparks.material as THREE.PointsMaterial).opacity = 1 - THREE.MathUtils.smoothstep(k, 5, 6);
    const close = THREE.MathUtils.smoothstep(k, 5, 6) * (1 - THREE.MathUtils.smoothstep(k, 6.4, 7.4));
    this.curtain.scale.y = Math.max(0.001, close);
    if (k > 6.2) {
      this.gown.visible = false;
      this.girl.root.visible = true;
    }
    this.girl.root.rotation.y = Math.sin(k * 0.8) * 0.35;
    this.girl.update(dt, { speed: 0, airborne: false, riding: false, t: k });
    this.boy.update(dt, { speed: 0, airborne: false, riding: false, t: k + 1 });
    this.camera.position.set(Math.sin(k * 0.12) * 0.8, 2 - k * 0.03, 5.2 - k * 0.12);
    this.camera.lookAt(0, 1.3, -1.5);
  }
}
