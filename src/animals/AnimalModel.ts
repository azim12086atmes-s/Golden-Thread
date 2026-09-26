import * as THREE from 'three';
import { ANIMAL_HEAD_GAP, type Part } from '../characters/anatomy';

/**
 * Animals share the travellers' rules: no eyes or facial features, and a floating head that
 * never touches the body. Everything is tagged with userData.part for tests/anatomy.test.ts.
 */

export type SpeciesId =
  | 'sheep' | 'rabbit' | 'unicorn' | 'duck' | 'cat' | 'crane' | 'deer' | 'panda' | 'dog' | 'horse'
  | 'reindeer' | 'fox' | 'goat' | 'cow' | 'camel' | 'buffalo' | 'elephant' | 'peacock' | 'dove'
  | 'donkey' | 'lightbird';

interface Species {
  name: string;
  kind: 'quad' | 'bird';
  body: [number, number, number]; // length, height, width of the body ellipsoid
  color: string;
  accent: string;
  leg: number;
  headR: number;
  neck?: number; // neck length (part of the body; the head floats past its end)
  ears?: 'pointy' | 'long' | 'round' | 'small';
  horn?: 'unicorn' | 'antlers' | 'curved' | 'small';
  tail?: 'fluffy' | 'long' | 'fan' | 'tuft' | 'short';
  extra?: 'hump' | 'trunk' | 'wool' | 'mane' | 'rainbow' | 'glow';
  snout?: number;
  diet: string; // item that befriends them
  produce?: string; // item they give daily when kept
}

export const SPECIES: Record<SpeciesId, Species> = {
  sheep: { name: 'Sheep', kind: 'quad', body: [0.9, 0.6, 0.6], color: '#f7f3ea', accent: '#3a3230', leg: 0.4, headR: 0.17, ears: 'small', tail: 'short', extra: 'wool', diet: 'wildflower', produce: 'wool' },
  rabbit: { name: 'Rabbit', kind: 'quad', body: [0.4, 0.3, 0.3], color: '#e8dcc8', accent: '#f7f0e6', leg: 0.1, headR: 0.12, ears: 'long', tail: 'fluffy', diet: 'wildflower' },
  unicorn: { name: 'Unicorn', kind: 'quad', body: [1.6, 0.8, 0.6], color: '#fbf8ff', accent: '#ffd6f0', leg: 0.95, headR: 0.2, neck: 0.6, ears: 'pointy', horn: 'unicorn', tail: 'long', extra: 'rainbow', snout: 0.22, diet: 'wildflower' },
  duck: { name: 'Duck', kind: 'bird', body: [0.4, 0.3, 0.3], color: '#f7f3ea', accent: '#f2a13a', leg: 0.12, headR: 0.11, tail: 'short', diet: 'rice', produce: 'feed' },
  cat: { name: 'Cat', kind: 'quad', body: [0.55, 0.3, 0.26], color: '#e8a86a', accent: '#f7f0e6', leg: 0.22, headR: 0.13, ears: 'pointy', tail: 'long', diet: 'milk' },
  crane: { name: 'Crane', kind: 'bird', body: [0.6, 0.35, 0.3], color: '#fbfbfb', accent: '#1f1f24', leg: 0.7, headR: 0.09, neck: 0.5, tail: 'short', diet: 'rice' },
  deer: { name: 'Deer', kind: 'quad', body: [1.0, 0.55, 0.4], color: '#c08a5a', accent: '#f7f0e6', leg: 0.75, headR: 0.15, neck: 0.4, ears: 'pointy', horn: 'small', tail: 'short', snout: 0.14, diet: 'wildflower' },
  panda: { name: 'Panda', kind: 'quad', body: [1.0, 0.75, 0.7], color: '#f7f7f2', accent: '#1f1f24', leg: 0.35, headR: 0.3, ears: 'round', tail: 'short', diet: 'bamboo' },
  dog: { name: 'Dog', kind: 'quad', body: [0.75, 0.4, 0.32], color: '#c9a06a', accent: '#6b4a2a', leg: 0.35, headR: 0.16, ears: 'round', tail: 'long', snout: 0.12, diet: 'bread' },
  horse: { name: 'Horse', kind: 'quad', body: [1.6, 0.8, 0.6], color: '#8a5a3a', accent: '#3a2a22', leg: 0.95, headR: 0.2, neck: 0.6, ears: 'pointy', tail: 'long', extra: 'mane', snout: 0.22, diet: 'feed' },
  reindeer: { name: 'Reindeer', kind: 'quad', body: [1.2, 0.65, 0.5], color: '#8a6a4a', accent: '#f4f1ea', leg: 0.8, headR: 0.17, neck: 0.4, ears: 'pointy', horn: 'antlers', tail: 'short', snout: 0.16, diet: 'pinecone' },
  fox: { name: 'Fox', kind: 'quad', body: [0.65, 0.32, 0.28], color: '#e0763a', accent: '#f7f0e6', leg: 0.28, headR: 0.14, ears: 'pointy', tail: 'fluffy', snout: 0.14, diet: 'dates' },
  goat: { name: 'Goat', kind: 'quad', body: [0.85, 0.5, 0.4], color: '#efe6d8', accent: '#6b5a4a', leg: 0.5, headR: 0.15, ears: 'small', horn: 'curved', tail: 'tuft', snout: 0.1, diet: 'feed', produce: 'milk' },
  cow: { name: 'Cow', kind: 'quad', body: [1.5, 0.85, 0.75], color: '#f7f3ea', accent: '#3a3230', leg: 0.7, headR: 0.24, ears: 'small', horn: 'small', tail: 'tuft', snout: 0.15, diet: 'feed', produce: 'milk' },
  camel: { name: 'Camel', kind: 'quad', body: [1.5, 0.8, 0.6], color: '#d4a86a', accent: '#b08050', leg: 1.2, headR: 0.18, neck: 0.8, ears: 'small', tail: 'tuft', extra: 'hump', snout: 0.22, diet: 'dates', produce: 'camelwool' },
  buffalo: { name: 'Water Buffalo', kind: 'quad', body: [1.5, 0.85, 0.8], color: '#4a4a52', accent: '#2a2a30', leg: 0.6, headR: 0.25, ears: 'small', horn: 'curved', tail: 'tuft', snout: 0.14, diet: 'rice' },
  elephant: { name: 'Elephant', kind: 'quad', body: [2.6, 1.9, 1.7], color: '#8a8a94', accent: '#e8a86a', leg: 1.3, headR: 0.55, ears: 'round', tail: 'tuft', extra: 'trunk', diet: 'coconut' },
  peacock: { name: 'Peacock', kind: 'bird', body: [0.5, 0.35, 0.3], color: '#1f5a9a', accent: '#2f8a6a', leg: 0.3, headR: 0.09, neck: 0.3, tail: 'fan', diet: 'rice' },
  dove: { name: 'Dove', kind: 'bird', body: [0.3, 0.2, 0.2], color: '#f4f4f8', accent: '#c8c8d8', leg: 0.06, headR: 0.08, tail: 'short', diet: 'rice' },
  donkey: { name: 'Donkey', kind: 'quad', body: [1.1, 0.6, 0.45], color: '#8a847a', accent: '#f4f1ea', leg: 0.7, headR: 0.17, neck: 0.35, ears: 'long', tail: 'tuft', extra: 'mane', snout: 0.18, diet: 'feed' },
  lightbird: { name: 'Light Bird', kind: 'bird', body: [0.4, 0.25, 0.25], color: '#fff4c0', accent: '#b8a4ff', leg: 0.1, headR: 0.1, tail: 'fan', extra: 'glow', diet: 'stardust' },
};

const cache = new Map<string, THREE.Material>();
function mat(c: string, glow = false): THREE.Material {
  const k = c + (glow ? 'g' : '');
  if (!cache.has(k)) {
    cache.set(k, glow
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.5), toneMapped: false })
      : new THREE.MeshStandardMaterial({ color: c, flatShading: true, roughness: 0.9 }));
  }
  return cache.get(k)!;
}
function part(geo: THREE.BufferGeometry, c: string, p: Part, glow = false): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat(c, glow));
  m.userData.part = p;
  m.castShadow = true;
  return m;
}

const RAINBOW = ['#ff8a8a', '#ffc27a', '#fff08a', '#9ae8a0', '#8ac8ff', '#c8a4ff'];

export class AnimalModel {
  readonly root = new THREE.Group();
  readonly head = new THREE.Group();
  private legs: THREE.Group[] = [];
  private tail?: THREE.Object3D;
  /** Feathered wings (unicorns): they beat slowly at rest and fast at a gallop or in the air. */
  private wings: THREE.Group[] = [];
  private phase = Math.random() * 10;
  private headBase = new THREE.Vector3();
  /** Seat height for rideable animals. */
  readonly saddleY: number;

  constructor(readonly species: SpeciesId, scale = 1) {
    const s = SPECIES[species];
    const [L, H, W] = s.body;
    const c = s.color, a = s.accent;
    const body = new THREE.Group();
    body.scale.setScalar(scale);
    this.root.add(body);
    const glow = s.extra === 'glow';

    const bodyY = s.leg + H / 2;
    const torso = part(new THREE.SphereGeometry(0.5, 12, 9), c, 'body', glow);
    torso.scale.set(W, H, L);
    torso.position.y = bodyY;
    body.add(torso);
    this.saddleY = (bodyY + H / 2) * scale;

    if (species === 'unicorn') {
      // Feathered wings with glowing rainbow tips, and a rainbow saddle-blanket.
      for (const sd of [-1, 1]) {
        const w = new THREE.Group();
        for (let i = 0; i < 6; i++) {
          const len = 0.55 + i * 0.12;
          const f = part(new THREE.BoxGeometry(0.03, 0.1, len).translate(0, 0, -len / 2), '#ffffff', 'wing');
          f.rotation.y = sd * (0.25 + i * 0.16);
          f.position.y = -i * 0.02;
          w.add(f);
          const tip = part(new THREE.BoxGeometry(0.034, 0.1, 0.14), RAINBOW[i], 'wing', true);
          tip.position.set(Math.sin(sd * (0.25 + i * 0.16)) * -len, -i * 0.02, Math.cos(sd * (0.25 + i * 0.16)) * -len);
          tip.rotation.y = sd * (0.25 + i * 0.16);
          w.add(tip);
        }
        w.position.set(sd * W * 0.42, bodyY + H * 0.32, L * 0.18);
        w.rotation.set(0.35, sd * 1.35, sd * 0.5);
        body.add(w);
        this.wings.push(w);
      }
      RAINBOW.forEach((col, i) => {
        const band = part(new THREE.BoxGeometry(W * 1.02, 0.02, 0.07), col, 'body', i % 2 === 0);
        band.position.set(0, bodyY + H * 0.47, -0.2 + i * 0.07);
        body.add(band);
      });
    }

    if (s.extra === 'wool') {
      for (let i = 0; i < 7; i++) {
        const w = part(new THREE.SphereGeometry(H * 0.32, 7, 5), c, 'body');
        w.position.set(((i % 3) - 1) * W * 0.3, bodyY + H * 0.28, (Math.floor(i / 3) - 1) * L * 0.28);
        body.add(w);
      }
    }
    if (s.extra === 'hump') {
      const hump = part(new THREE.SphereGeometry(H * 0.4, 9, 7), c, 'body');
      hump.position.set(0, bodyY + H * 0.45, -L * 0.05);
      hump.scale.set(1, 0.9, 1.2);
      body.add(hump);
    }

    // Legs.
    if (s.kind === 'quad') {
      for (const [x, z] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const g = new THREE.Group();
        g.position.set(x * W * 0.3, s.leg + H * 0.1, z * L * 0.32);
        const r = Math.max(0.04, W * 0.12);
        const geo = new THREE.CylinderGeometry(r, r * 0.8, s.leg + H * 0.1, 6);
        geo.translate(0, -(s.leg + H * 0.1) / 2, 0);
        g.add(part(geo, species === 'panda' ? a : c, 'leg', glow));
        const hoof = part(new THREE.CylinderGeometry(r * 0.9, r * 1.0, 0.06, 6), species === 'unicorn' ? '#e2c46a' : a, 'hoof');
        hoof.position.y = -(s.leg + H * 0.1) + 0.03;
        g.add(hoof);
        body.add(g);
        this.legs.push(g);
      }
    } else {
      for (const x of [-1, 1]) {
        const g = new THREE.Group();
        g.position.set(x * W * 0.2, s.leg, 0);
        const geo = new THREE.CylinderGeometry(0.015, 0.015, s.leg, 4);
        geo.translate(0, -s.leg / 2, 0);
        g.add(part(geo, a === '#1f1f24' ? '#3a3a3a' : '#e0a040', 'leg'));
        body.add(g);
        this.legs.push(g);
      }
      for (const x of [-1, 1]) {
        const wing = part(new THREE.SphereGeometry(0.5, 8, 6), s.kind === 'bird' && species === 'peacock' ? '#2f6a9a' : c, 'wing', glow);
        wing.scale.set(0.08, H * 0.7, L * 0.8);
        wing.position.set(x * W * 0.5, bodyY + H * 0.05, -L * 0.05);
        body.add(wing);
      }
    }

    // Neck — part of the body. The head floats beyond its tip.
    let headAnchor = new THREE.Vector3(0, bodyY + H * 0.3, L / 2 + s.headR * 0.4);
    if (s.neck) {
      const geo = new THREE.CylinderGeometry(W * 0.16, W * 0.26, s.neck, 7);
      geo.translate(0, s.neck / 2, 0);
      const neck = part(geo, c, 'neck', glow);
      neck.position.set(0, bodyY + H * 0.15, L * 0.38);
      neck.rotation.x = 0.55;
      body.add(neck);
      const tip = new THREE.Vector3(0, s.neck, 0).applyEuler(neck.rotation).add(neck.position);
      headAnchor = tip.clone();
      if (s.extra === 'mane' || s.extra === 'rainbow') {
        for (let i = 0; i < 6; i++) {
          const m = part(new THREE.BoxGeometry(0.05, 0.18, 0.12), s.extra === 'rainbow' ? RAINBOW[i] : a, 'mane');
          const t = new THREE.Vector3(0, (s.neck * i) / 6, -W * 0.2).applyEuler(neck.rotation).add(neck.position);
          m.position.copy(t);
          m.rotation.x = 0.55;
          body.add(m);
        }
      }
    }
    // The head: detached. Direction of detachment is along the neck (or forward).
    const dir = s.neck ? new THREE.Vector3(0, Math.cos(0.55), Math.sin(0.55)) : new THREE.Vector3(0, 0.35, 1).normalize();
    this.headBase.copy(headAnchor).addScaledVector(dir, ANIMAL_HEAD_GAP + s.headR);
    this.head.position.copy(this.headBase);
    body.add(this.head);

    const skull = part(new THREE.SphereGeometry(s.headR, 10, 8), species === 'panda' ? c : c, 'head', glow);
    this.head.add(skull);
    if (s.snout) {
      const sn = part(new THREE.CylinderGeometry(s.headR * 0.45, s.headR * 0.62, s.snout, 7), c, 'head', glow);
      sn.rotation.x = Math.PI / 2 + 0.3;
      sn.position.set(0, -s.headR * 0.2, s.headR * 0.55 + s.snout / 2);
      this.head.add(sn);
    }
    if (s.kind === 'bird') {
      const beak = part(new THREE.ConeGeometry(s.headR * 0.35, s.headR * 1.1, 5), species === 'crane' ? '#3a3a3a' : '#f2a13a', 'head');
      beak.rotation.x = Math.PI / 2;
      beak.position.z = s.headR * 1.3;
      this.head.add(beak);
      if (species === 'crane') {
        const crown = part(new THREE.SphereGeometry(s.headR * 0.4, 5, 4), '#d42a2a', 'head');
        crown.position.y = s.headR * 0.8;
        this.head.add(crown);
      }
      if (species === 'peacock') {
        for (let i = -1; i <= 1; i++) {
          const f = part(new THREE.SphereGeometry(0.02, 4, 3), '#2f8a9a', 'head');
          f.position.set(i * 0.03, s.headR * 1.5, 0);
          this.head.add(f);
        }
      }
    }
    if (s.extra === 'trunk') {
      const trunk = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const seg = part(new THREE.CylinderGeometry(0.1 - i * 0.012, 0.12 - i * 0.012, 0.3, 7), c, 'head');
        seg.position.set(0, -i * 0.26, s.headR * 0.8 + i * 0.05);
        seg.rotation.x = 0.15 * i;
        trunk.add(seg);
      }
      this.head.add(trunk);
      for (const x of [-1, 1]) {
        const tusk = part(new THREE.ConeGeometry(0.04, 0.35, 5), '#fbf6ea', 'horn');
        tusk.position.set(x * 0.2, -s.headR * 0.5, s.headR * 0.7);
        tusk.rotation.x = 1.9;
        this.head.add(tusk);
      }
    }
    if (species === 'panda') {
      for (const x of [-1, 1]) {
        // Ear patches only — pandas get their colour from the body and ears, never eye patches.
        const shoulder = part(new THREE.SphereGeometry(0.2, 7, 5), a, 'body');
        shoulder.position.set(x * W * 0.3, bodyY + H * 0.15, L * 0.25);
        body.add(shoulder);
      }
    }

    // Ears.
    if (s.ears) {
      for (const x of [-1, 1]) {
        let geo: THREE.BufferGeometry;
        if (s.ears === 'long') geo = new THREE.CapsuleGeometry(s.headR * 0.18, s.headR * 1.4, 3, 6);
        else if (s.ears === 'round') geo = new THREE.SphereGeometry(s.headR * (species === 'elephant' ? 0.9 : 0.32), 7, 5);
        else if (s.ears === 'small') geo = new THREE.SphereGeometry(s.headR * 0.22, 5, 4);
        else geo = new THREE.ConeGeometry(s.headR * 0.3, s.headR * 0.7, 4);
        const e = part(geo, species === 'panda' ? a : species === 'elephant' ? '#9a9aa4' : c, 'ear', glow);
        if (species === 'elephant') {
          e.scale.set(0.2, 1, 1);
          e.position.set(x * s.headR * 1.0, 0, -s.headR * 0.1);
        } else {
          e.position.set(x * s.headR * 0.55, s.headR * (s.ears === 'long' ? 1.3 : 0.8), -s.headR * 0.1);
          e.rotation.z = -x * 0.25;
        }
        this.head.add(e);
      }
    }

    // Horns.
    if (s.horn === 'unicorn') {
      const horn = part(new THREE.ConeGeometry(0.05, 0.5, 6), '#ffe89a', 'horn', true);
      horn.position.set(0, s.headR * 1.3, s.headR * 0.5);
      horn.rotation.x = 0.4;
      this.head.add(horn);
    } else if (s.horn === 'antlers' || s.horn === 'small' || s.horn === 'curved') {
      for (const x of [-1, 1]) {
        const h = s.horn === 'antlers' ? 0.55 : s.horn === 'curved' ? 0.3 : 0.14;
        const g = part(new THREE.CylinderGeometry(0.015, 0.03, h, 4), s.horn === 'curved' ? '#d9d0bc' : '#c9b08a', 'horn');
        g.position.set(x * s.headR * 0.5, s.headR * 0.9 + h / 2, -s.headR * 0.1);
        g.rotation.z = -x * (s.horn === 'curved' ? 0.9 : 0.35);
        this.head.add(g);
        if (s.horn === 'antlers') for (let i = 0; i < 3; i++) {
          const tine = part(new THREE.CylinderGeometry(0.01, 0.02, 0.2, 4), '#c9b08a', 'horn');
          tine.position.set(x * (s.headR * 0.6 + i * 0.07), s.headR * 1.1 + i * 0.14, 0.05);
          tine.rotation.x = -0.6;
          this.head.add(tine);
        }
      }
    }

    // Tail.
    if (s.tail) {
      const t = new THREE.Group();
      t.position.set(0, bodyY + H * 0.1, -L / 2);
      let m: THREE.Mesh;
      if (s.tail === 'fan') {
        const cols = species === 'peacock' ? ['#2f8a6a', '#1f5a9a', '#3aa08a', '#e2b43a'] : ['#fff4c0', '#b8a4ff', '#ffd6f0'];
        for (let i = 0; i < 9; i++) {
          const f = part(new THREE.BoxGeometry(0.08, 0.02, species === 'peacock' ? 1.0 : 0.4), cols[i % cols.length], 'tail', glow || species === 'lightbird');
          f.geometry.translate(0, 0, -(species === 'peacock' ? 0.5 : 0.2));
          f.rotation.set(-0.9, ((i - 4) / 4) * 0.9, 0);
          t.add(f);
        }
      } else {
        const long = s.tail === 'long';
        const geo = s.tail === 'fluffy' ? new THREE.SphereGeometry(0.12, 6, 5) : new THREE.CylinderGeometry(0.03, 0.05, long ? 0.6 : 0.25, 5);
        if (s.tail !== 'fluffy') geo.translate(0, -(long ? 0.3 : 0.12), 0);
        m = part(geo, s.tail === 'fluffy' && species === 'fox' ? '#e0763a' : s.extra === 'rainbow' ? RAINBOW[4] : s.tail === 'tuft' ? a : c, 'tail', s.extra === 'rainbow');
        if (s.tail === 'fluffy' && species === 'fox') m.scale.set(1, 1, 3);
        m.rotation.x = long ? 0.6 : 0.3;
        t.add(m);
      }
      body.add(t);
      this.tail = t;
    }
  }

  update(dt: number, speed: number, t: number): void {
    const moving = speed > 0.15;
    this.phase += dt * (moving ? 3 + speed * 1.5 : 1);
    const sw = moving ? Math.sin(this.phase) * Math.min(0.6, 0.15 + speed * 0.08) : 0;
    this.legs.forEach((l, i) => (l.rotation.x = i % 2 === (i < 2 ? 0 : 1) ? sw : -sw));
    this.head.position.y = this.headBase.y + Math.sin(t * 2 + this.phase * 0.2) * 0.015;
    if (this.tail) this.tail.rotation.y = Math.sin(t * 3 + this.phase) * 0.3;
    if (this.wings.length) {
      const beat = Math.sin(t * (speed > 8 ? 7 : 1.6)) * (speed > 8 ? 0.55 : 0.12);
      this.wings[0].rotation.z = -0.5 + beat;
      this.wings[1].rotation.z = 0.5 - beat;
    }
  }
}
