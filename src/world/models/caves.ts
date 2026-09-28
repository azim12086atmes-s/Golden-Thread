import * as THREE from 'three';
import type { Ctx, Footprint } from '../architecture';
import type { CaveStyle } from '../caves';
import { CRYSTAL_PAL } from '../islands';
import { M, archPanel, sphere } from '../kit';
import { hoodooGeometry, rockGeometry, shardGeometry } from '../rocks';

/**
 * MODEL CONTRACT (docs/team/handoffs/CHATGPT_3D_MODELS.md §13): a cave `r` metres in radius with
 * its mouth facing +z at z ≈ r, the ground at y = 0; the mouth reads as a dark opening a person
 * could walk into. Returns the footprint (the game keeps the mouth clear to stand in).
 *
 * Built by Claude from organic rock (rocks.ts), shaped by where it is:
 * - sandstone (the deserts, Egypt): a layered mound with wind-cut ledges and undercuts, the mouth
 *   an alcove in its face, hoodoos standing round it and fallen blocks at its foot;
 * - rock (the fjords, the Middle East): a craggy, ridged outcrop with boulders;
 * - ice (Aurora, the Alps): a faceted mound of blue ice, great shards breaking out of it at
 *   angles, icicles over the mouth, a blue glow inside;
 * - crystal (the Sky Isles): a pale stone mound burst open by giant crystals growing outward in
 *   every colour, their tips sparkling;
 * - den (the green lands): a grassy knoll dug into, its mouth ringed with stones and roots, a
 *   little lantern hung by the door, wildflowers on its turf.
 */
const LOOK: Record<CaveStyle, { rock: string; dark: string; accent: string }> = {
  sandstone: { rock: '#c98a5a', dark: '#a86a42', accent: '#e0b07a' },
  rock: { rock: '#7a7064', dark: '#5e5750', accent: '#8a8276' },
  ice: { rock: '#cfe8ff', dark: '#9cc8ec', accent: '#e8f6ff' },
  crystal: { rock: '#dcd6ee', dark: '#bcb4dc', accent: '#f4f0ff' },
  den: { rock: '#6f9a4a', dark: '#6a4a30', accent: '#9a9486' },
};

export function buildCave(c: Ctx, style: CaveStyle, r: number): Footprint {
  const L = LOOK[style], seed = Math.floor(c.rng.next() * 1000);
  const mound = rockGeometry(r, {
    style: style === 'sandstone' ? 'sandstone' : style === 'ice' ? 'ice' : style === 'den' ? 'pebble' : 'crag',
    tall: style === 'sandstone' ? 0.72 : style === 'crystal' ? 0.6 : style === 'den' ? 0.55 : 0.85, mouth: { w: 0.3, h: 0.42 }, seed, noSquash: true,
  });
  c.g.add(mound, L.rock);
  // The dark inside, seen through the alcove.
  archPanel(c.g, r * 0.5, r * 0.5, '#15110f', 0, 0, r * 0.58, 0, 0.3);
  // A second, darker skin of strata/rock low down, for colour variety.
  c.g.add(rockGeometry(r * 0.55, { style: style === 'sandstone' ? 'sandstone' : 'crag', seed: seed + 3, tall: 0.6 }), L.dark, M(-r * 0.55, 0, -r * 0.35));

  const around = (k: number, n: number, rr: number) => {
    const a = Math.PI * 0.35 + (k / Math.max(1, n - 1)) * Math.PI * 1.3 + c.rng.range(-0.15, 0.15); // round the back and sides, not the mouth
    return { x: Math.sin(a) * rr, z: Math.cos(a) * rr, a };
  };
  switch (style) {
    case 'sandstone': {
      const n = 2 + Math.floor(c.rng.next() * 3);
      for (let k = 0; k < n; k++) {
        const p = around(k, n, r * c.rng.range(1.15, 1.5)), h = r * c.rng.range(0.7, 1.3);
        c.g.add(hoodooGeometry(h, seed + k), k % 2 ? L.rock : L.accent, M(p.x, -0.3, p.z, c.rng.range(0, 6)));
      }
      for (let k = 0; k < 5; k++) {
        const p = around(k, 5, r * c.rng.range(0.95, 1.2));
        c.g.add(rockGeometry(c.rng.range(0.6, 1.6), { style: 'sandstone', seed: seed + 10 + k }), L.dark, M(p.x, 0, p.z, c.rng.range(0, 6)));
      }
      sphere(c.glow, 0.3, '#e8c48a', r * 0.12, r * 0.12, r * 0.6, 6);
      break;
    }
    case 'rock':
      for (let k = 0; k < 6; k++) {
        const p = around(k, 6, r * c.rng.range(0.9, 1.25));
        c.g.add(rockGeometry(c.rng.range(0.8, 2.2), { style: 'crag', seed: seed + 10 + k }), k % 2 ? L.rock : L.dark, M(p.x, 0, p.z, c.rng.range(0, 6)));
      }
      sphere(c.glow, 0.3, '#e8c48a', r * 0.12, r * 0.12, r * 0.6, 6);
      break;
    case 'ice': {
      // Shards breaking out of the ice at angles, and more standing round it.
      for (let k = 0; k < 11; k++) {
        const a = c.rng.range(0, Math.PI * 2), onTop = k < 6, rr = onTop ? r * c.rng.range(0.2, 0.6) : r * c.rng.range(0.95, 1.4);
        if (Math.cos(a) > 0.8 && rr > r * 0.5) continue; // keep the mouth clear
        const h = onTop ? r * c.rng.range(0.6, 1.1) : r * c.rng.range(0.4, 0.9), tilt = c.rng.range(0.2, 0.6);
        const y = onTop ? r * 0.35 : -0.2;
        c.g.add(shardGeometry(h, h * c.rng.range(0.14, 0.22), seed + k), k % 3 ? L.rock : L.accent,
          M(Math.sin(a) * rr, y, Math.cos(a) * rr, 0, 1, 1, 1, Math.cos(a) * tilt, -Math.sin(a) * tilt));
      }
      // Icicles hanging over the mouth.
      for (let k = -3; k <= 3; k++) {
        const h = c.rng.range(0.4, 1.1);
        c.g.add(shardGeometry(h, 0.1, seed + 30 + k), L.accent, M(k * r * 0.07, r * 0.46, r * 0.72, 0, 1, 1, 1, Math.PI, 0));
      }
      sphere(c.glow, r * 0.14, '#6ac8ff', 0, r * 0.18, r * 0.5, 8);
      break;
    }
    case 'den': {
      // Stones ringing the mouth, roots trailing over it, turf and wildflowers, a lantern by the door.
      for (let k = 0; k < 9; k++) {
        const a = -0.9 + (k / 8) * 1.8;
        c.g.add(rockGeometry(c.rng.range(0.35, 0.7), { style: 'pebble', seed: seed + 40 + k }), L.accent, M(Math.sin(a) * r * 0.36, r * 0.02 + Math.cos(a * 1.6) * r * 0.22, r * 0.62 + Math.cos(a) * 0.3));
      }
      for (let k = 0; k < 7; k++) {
        const x = (k - 3) * r * 0.06, len = c.rng.range(0.8, 1.8);
        c.g.add(new THREE.CylinderGeometry(0.04, 0.02, len, 4).translate(0, -len / 2, 0), '#5a3e28', M(x, r * 0.46, r * 0.66, 0, 1, 1, 1, c.rng.range(-0.2, 0.2), c.rng.range(-0.2, 0.2)));
      }
      for (let k = 0; k < 24; k++) {
        const a = c.rng.range(0, Math.PI * 2), rr = r * c.rng.range(0.2, 0.9);
        if (Math.cos(a) > 0.7 && rr > r * 0.5) continue;
        sphere(c.g, 0.12, ['#ff8fb8', '#f2d14e', '#ffffff', '#b58ad9'][k % 4], Math.sin(a) * rr, r * 0.5 * (1 - (rr / r) ** 2) + 0.1, Math.cos(a) * rr, 5);
      }
      c.g.add(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 5).translate(0, 0.8, 0), '#6b4a2a', M(r * 0.3, 0, r * 0.72));
      sphere(c.glow, 0.18, '#ffcf7a', r * 0.3, 1.5, r * 0.72, 6);
      break;
    }
    case 'crystal': {
      // Giant crystals bursting outward from the mound, every colour, their tips alight.
      for (let k = 0; k < 16; k++) {
        const a = c.rng.range(0, Math.PI * 2), rr = r * c.rng.range(0.15, 0.75);
        if (Math.cos(a) > 0.75 && rr > r * 0.45) continue; // keep the mouth clear
        const h = r * c.rng.range(0.6, 1.5), w = h * c.rng.range(0.12, 0.2), tilt = 0.25 + (rr / r) * 0.9;
        const col = CRYSTAL_PAL[k % CRYSTAL_PAL.length], y = r * 0.3 * (1 - rr / r);
        const rx = Math.cos(a) * tilt, rz = -Math.sin(a) * tilt;
        c.g.add(shardGeometry(h, w, seed + k), col, M(Math.sin(a) * rr, y, Math.cos(a) * rr, 0, 1, 1, 1, rx, rz));
        // A spark at the tip: the tip is at h along the tilted axis.
        const tip = new THREE.Vector3(0, h, 0).applyEuler(new THREE.Euler(rx, 0, rz));
        sphere(c.glow, w * 0.35, col, Math.sin(a) * rr + tip.x, y + tip.y, Math.cos(a) * rr + tip.z, 5, 1.6);
      }
      // Smaller crystals round the foot.
      for (let k = 0; k < 10; k++) {
        const p = around(k, 10, r * c.rng.range(0.9, 1.3)), h = c.rng.range(1, 3);
        c.g.add(shardGeometry(h, h * 0.2, seed + 50 + k), CRYSTAL_PAL[(k + 2) % CRYSTAL_PAL.length], M(p.x, -0.1, p.z, 0, 1, 1, 1, Math.cos(p.a) * 0.4, -Math.sin(p.a) * 0.4));
      }
      sphere(c.glow, r * 0.12, '#e0c8ff', 0, r * 0.18, r * 0.5, 8);
      break;
    }
  }
  return { r, h: r * 0.8 };
}
