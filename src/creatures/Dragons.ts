import * as THREE from 'three';
import { REGION_BY_ID, regionCenter, type RegionId } from '../world/regions';
import { WATER_Y, terrainHeight } from '../world/terrain';
import { harbourOf } from '../world/harbours';
import { DragonModel, fly, type DragonSpec, type Flight } from './dragonKit';

/**
 * Each land's dragon, built from the kit (dragonKit.ts), and where it flies: the great lung
 * circling the Jade Terraces' temple chasing its pearl, Sakura Hollow's three-clawed ryū, Hanok's
 * azure yong with its jade pearl, Aurora's frost wyrm with an aurora-green glow down its back,
 * Alpenrose's mountain drake, Old London's red wyvern, Firenzia's clockwork dragon of brass and
 * canvas, New Yonder's armoured drone dragon, the Sky Isles' cloud dragon, Rimal's sand wyrm
 * arcing out of the dunes, and the Kaveri Coast's sea serpent rising and diving in the bay. Over
 * the Jade Terraces, besides the great lung, the festival dragon of red and gold silk on its
 * lantern hoops flies a wide circle after its pearl; over Wanderers' Meadow three little mint
 * dragons play together.
 */

export interface DragonHome {
  land: RegionId;
  spec: DragonSpec;
  /** Circle centre (region-local), radius, height above the ground there, rise and fall, speed. */
  at: [number, number];
  radius: number;
  alt: number;
  bob: number;
  speed: number;
  /** Dives through the sand or the sea (its path goes under and out again). */
  dives?: 'sand' | 'sea';
  /** Several that fly together (the little meadow dragons), each on its own wider, higher circle. */
  flock?: number;
  /**
   * How far the circle swings in and out (1: by about a quarter of its radius). The dragons that
   * circle close round their monument keep a steadier circle (0.35), threading between the monument
   * and the town round it (owner, 2026-09-30: "easy to see near the monuments").
   */
  wobble?: number;
}

const lung = (o: Partial<DragonSpec> & Pick<DragonSpec, 'id' | 'name' | 'back' | 'side' | 'belly' | 'rim' | 'crest' | 'mane' | 'claw' | 'horn'>): DragonSpec =>
  ({ plan: 'lung', length: 50, girth: 1.6, head: 'lung', crestKind: 'fins', tail: 'flame', scales: 'shingle', ...o });

export const DRAGON_HOMES: DragonHome[] = [
  {
    land: 'china', at: [0, 0], radius: 34, alt: 34, bob: 12, speed: 11,
    spec: lung({ id: 'jade-lung', name: 'the great dragon of the Jade Terraces', length: 72, girth: 2.1, claws: 5,
      back: '#8e1010', side: '#c81e1e', belly: '#f7dc8a', rim: '#ffd25a', crest: ['#ff7a2a', '#f2c24a'], mane: ['#2fae6a', '#f2c24a', '#ff7a2a'],
      claw: '#f2c24a', horn: '#f2c24a', pearl: '#fff4c8', emissive: '#5a0a0a' }),
  },
  {
    land: 'china', at: [0, 0], radius: 105, alt: 36, bob: 8, speed: 10, wobble: 0.35,
    spec: lung({ id: 'festival-dragon', name: 'the festival dragon', length: 40, girth: 1.3, claws: 5, scales: 'silk',
      back: '#b81e1e', side: '#e8342a', belly: '#ffd23a', rim: '#ffd23a', crest: ['#ffd23a', '#2fae6a'], mane: ['#ffd23a', '#2fae6a', '#ffffff'],
      claw: '#ffd23a', horn: '#ffd23a', pearl: '#ffe6a0', emissive: '#6a1a08' }),
  },
  {
    land: 'meadow', at: [0, 0], radius: 45, alt: 37, bob: 5, speed: 9, flock: 3, wobble: 0.35,
    spec: { id: 'little-dragon', name: 'the little dragons of the Meadow', plan: 'wyrm', length: 5, girth: 0.38, head: 'lung', crestKind: 'fins', tail: 'frond', scales: 'shingle', claws: 3,
      back: '#3a9a78', side: '#5ac8a0', belly: '#fff0b8', rim: '#bff4dc', crest: ['#ffd23a', '#8affc8'], mane: ['#ffd23a', '#fff0b8'], claw: '#fff0b8', horn: '#ffd23a',
      wings: { span: 6.5, membrane: '#8affc8', bone: '#3a9a78' } },
  },
  {
    land: 'japan', at: [0, 0], radius: 50, alt: 31, bob: 9, speed: 10, wobble: 0.35,
    spec: lung({ id: 'sakura-ryu', name: 'the ryū of Sakura Hollow', length: 48, girth: 1.5, claws: 3, tail: 'frond',
      back: '#1f5a5a', side: '#2f8a7a', belly: '#ece4cc', rim: '#bfe8d8', crest: ['#e8f4f0', '#9fd4c8'], mane: ['#ffffff', '#e8f4f0', '#9fd4c8'],
      claw: '#ece4cc', horn: '#ece4cc', pearl: '#dff4ff' }),
  },
  {
    land: 'korea', at: [0, 0], radius: 55, alt: 27, bob: 8, speed: 10, wobble: 0.35,
    spec: lung({ id: 'hanok-yong', name: 'the azure yong of Hanok Village', length: 52, girth: 1.6, claws: 4,
      back: '#1f3f8a', side: '#2f5fb8', belly: '#f4f0e0', rim: '#e8f0ff', crest: ['#ffffff', '#8fb8ff'], mane: ['#ffffff', '#2fae8a'],
      claw: '#f2c24a', horn: '#f2c24a', pearl: '#8affd0' }),
  },
  {
    land: 'skyisles', at: [0, 0], radius: 120, alt: 175, bob: 14, speed: 9,
    spec: lung({ id: 'cloud-dragon', name: 'the cloud dragon of the Sky Isles', length: 56, girth: 1.7, head: 'cloud', crestKind: 'frond', tail: 'plume', scales: 'cloud',
      back: '#e8e0ff', side: '#fff4ff', belly: '#ffffff', rim: '#ffd6f0', crest: ['#ffd6f0', '#bfe8ff'], mane: ['#ffd6f0', '#bfe8ff', '#fff4c0'],
      claw: '#fff4c0', horn: '#fff4c0', pearl: '#fff4c0', runes: '#fff4c0', emissive: '#6a5a8a', translucent: true }),
  },
  {
    land: 'aurora', at: [0, 0], radius: 55, alt: 34, bob: 7, speed: 12, wobble: 0.35,
    spec: { id: 'frost-wyrm', name: 'the frost wyrm of Aurora Huts', plan: 'wyrm', length: 26, girth: 1.65, head: 'frost', crestKind: 'crystal', tail: 'crystal', scales: 'shingle',
      back: '#bcd8ea', side: '#e8f4fa', belly: '#ffffff', rim: '#9fd0ff', crest: ['#bfe8ff', '#8affc8'], mane: ['#e8f4fa'], claw: '#9fd0ff', horn: '#bfe8ff',
      wings: { span: 28, membrane: '#d8ecf8', bone: '#e8f4fa' }, runes: '#8affc8' },
  },
  {
    land: 'switzerland', at: [0, 0], radius: 45, alt: 51, bob: 8, speed: 11, wobble: 0.35,
    spec: { id: 'alpine-drake', name: 'the mountain drake of Alpenrose', plan: 'wyrm', length: 24, girth: 1.55, head: 'drake', crestKind: 'spines', tail: 'spade', scales: 'shingle',
      back: '#4a5058', side: '#6a7078', belly: '#b8b09a', rim: '#8a9a6a', crest: ['#5a6a4a', '#8a9a6a'], mane: ['#5a6a4a'], claw: '#d8d0c0', horn: '#d8d0c0',
      wings: { span: 28, membrane: '#5a6068', bone: '#4a5058' } },
  },
  {
    land: 'london', at: [0, 0], radius: 75, alt: 47, bob: 7, speed: 12, wobble: 0.35,
    spec: { id: 'red-wyvern', name: 'the red wyvern of Old London', plan: 'wyvern', length: 20, girth: 1.3, head: 'drake', crestKind: 'spines', tail: 'spade', scales: 'shingle',
      back: '#8e1a1a', side: '#c8282a', belly: '#f2c24a', rim: '#f2c24a', crest: ['#f2c24a', '#c8282a'], mane: ['#8e1a1a'], claw: '#f2c24a', horn: '#f2c24a',
      wings: { span: 24, membrane: '#b82428', bone: '#8e1a1a' } },
  },
  {
    land: 'renaissance', at: [0, 0], radius: 85, alt: 51, bob: 8, speed: 11, wobble: 0.35,
    spec: { id: 'clockwork-dragon', name: "Leonardo's clockwork dragon", plan: 'wyrm', length: 22, girth: 1.35, head: 'brass', crestKind: 'plates', tail: 'fins', scales: 'plate',
      back: '#a8782a', side: '#c8963a', belly: '#8a5a2a', rim: '#f2d27a', crest: ['#8a5a2a', '#c8963a'], mane: ['#8a5a2a'], claw: '#6a4a2a', horn: '#c8963a',
      wings: { span: 26, membrane: '#efe4c8', bone: '#6a4a2a', panels: true } },
  },
  {
    land: 'newyork', at: [0, 0], radius: 80, alt: 133, bob: 8, speed: 14, wobble: 0.35,
    spec: { id: 'drone-dragon', name: 'the drone dragon of New Yonder', plan: 'wyvern', length: 22, girth: 1.3, head: 'mech', crestKind: 'plates', tail: 'fins', scales: 'hex',
      back: '#d8dce4', side: '#eef0f4', belly: '#9aa0aa', rim: '#5af0ff', crest: ['#3a3e4a', '#c8ccd4'], mane: ['#3a3e4a'], claw: '#3a3e4a', horn: '#3a3e4a',
      wings: { span: 24, membrane: '#c8ccd4', bone: '#3a3e4a', panels: true }, runes: '#5af0ff' },
  },
  {
    land: 'desert', at: [150, -150], radius: 70, alt: 0, bob: 16, speed: 9, dives: 'sand',
    spec: { id: 'sand-wyrm', name: 'the sand wyrm of Rimal', plan: 'naga', length: 60, girth: 2.4, head: 'drake', crestKind: 'spines', tail: 'spade', scales: 'shingle',
      back: '#a8743a', side: '#c8964a', belly: '#e8d0a0', rim: '#6a4a2a', crest: ['#8a5a2a', '#c8964a'], mane: ['#8a5a2a'], claw: '#e8d0a0', horn: '#e8d0a0' },
  },
  {
    land: 'indiasouth', at: [0, 0], radius: 45, alt: 0, bob: 7, speed: 8, dives: 'sea',
    spec: { id: 'sea-naga', name: 'the sea serpent of Kaveri Coast', plan: 'naga', length: 50, girth: 1.8, head: 'sea', crestKind: 'fins', tail: 'fins', scales: 'shingle',
      back: '#0f5a5a', side: '#1f8a8a', belly: '#e8e0b0', rim: '#f2c24a', crest: ['#f2c24a', '#2fc8b8'], mane: ['#f2c24a', '#2fc8b8'], claw: '#f2c24a', horn: '#f2c24a' },
  },
];

/** The world centre of a dragon's circle. */
export function homeCentre(h: DragonHome): { x: number; z: number } {
  if (h.dives === 'sea') {
    // Out in the bay, beyond the pier head, in deep water.
    const hb = harbourOf(h.land)!;
    return { x: hb.headX + hb.dir[0] * 40, z: hb.headZ + hb.dir[1] * 40 };
  }
  const c = regionCenter(REGION_BY_ID[h.land]);
  return { x: c.x + h.at[0], z: c.z + h.at[1] };
}

/** A dragon's flight round its home. */
export function flightOf(h: DragonHome, member = 0): Flight {
  const c = homeCentre(h), g0 = terrainHeight(c.x, c.z), R = h.radius * (1 + member * 0.07), alt = h.alt + member * 5;
  const winged = !!h.spec.wings, wob = h.wobble ?? 1;
  return {
    scale: R, speed: h.speed, ripple: winged ? 0.25 : 1,
    path(phi, out) {
      const r = R + R * wob * (0.18 * Math.sin(phi * 0.5) + 0.08 * Math.sin(phi * 1.7));
      const x = c.x + Math.cos(phi) * r, z = c.z + Math.sin(phi) * r;
      let y: number;
      if (h.dives === 'sand') y = terrainHeight(x, z) + Math.sin(phi * 3) * h.bob - 3;
      else if (h.dives === 'sea') y = WATER_Y + Math.sin(phi * 2.5) * h.bob - 1.5;
      else y = g0 + alt + h.bob * Math.sin(phi * 0.8) + h.bob * 0.35 * Math.sin(phi * 2.3);
      return out.set(x, y, z);
    },
  };
}

/** Every land's dragon, built when its land is near and flown while it is in view. */
export class Dragons {
  readonly group = new THREE.Group();
  private built = new Map<string, { model: DragonModel; flight: Flight }>();

  constructor(scene: THREE.Scene) {
    scene.add(this.group);
  }

  private frustum = new THREE.Frustum();
  private viewM = new THREE.Matrix4();
  private ball = new THREE.Sphere();
  private frame = 0;

  /**
   * Fly each dragon whose land is near. Bending a dragon's body is the costly part, so a dragon
   * whose whole circle is out of view is not bent at all this frame, and a far one (over 450 m)
   * only every third frame; its flight is by the clock, so it is always where it should be.
   */
  update(t: number, camera: THREE.Camera, loaded: (land: RegionId) => boolean): void {
    const cam = camera.position;
    this.frame++;
    this.frustum.setFromProjectionMatrix(this.viewM.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse));
    for (const h of DRAGON_HOMES) {
      const c = homeCentre(h), dist = Math.hypot(cam.x - c.x, cam.z - c.z);
      const near = loaded(h.land) && dist < 1100;
      // Everywhere its circle (and its body trailing round it) could reach.
      this.ball.center.set(c.x, terrainHeight(c.x, c.z) + h.alt, c.z);
      this.ball.radius = h.radius * 1.45 + h.spec.length + h.bob + 30;
      const seen = this.frustum.intersectsSphere(this.ball);
      for (let k = 0; k < (h.flock ?? 1); k++) {
        const key = k ? `${h.spec.id}~${k}` : h.spec.id;
        let d = this.built.get(key);
        if (!near) { if (d) d.model.group.visible = false; continue; }
        if (!d) {
          d = { model: new DragonModel(h.spec), flight: flightOf(h, k) };
          this.built.set(key, d);
          this.group.add(d.model.group);
        }
        d.model.group.visible = true;
        if (!seen || (dist > 450 && (this.frame + k) % 3 !== 0)) continue;
        // The flock plays tag: each a little behind the one before.
        fly(d.model, d.flight, t - k * 2.2);
      }
    }
  }

  /** The dragon built for a land's home (tests, the probe). */
  model(id: string): DragonModel | undefined {
    return this.built.get(id)?.model;
  }
}
