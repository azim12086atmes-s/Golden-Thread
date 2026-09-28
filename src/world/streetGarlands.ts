import * as THREE from 'three';
import type { Ctx } from './architecture';
import { M, box, cone, cyl, sphere } from './kit';
import type { RegionId } from './regions';

/**
 * What each land hangs across its streets (docs/team/handoffs/AIR_AND_SKY.md): strings between
 * slender poles at the pavement edges, sagging a little, high enough for buses to pass beneath, hung
 * with the land's own things — fanous lanterns in the Arab lands, red lanterns in China, paper
 * chōchin in Japan, lotus lanterns in Korea, marigold garlands in India, bunting in the north, palio
 * banners in Firenzia, fairy lights in the Meadow, brass lanterns in the desert, ice chimes in the
 * Arctic, neon light-bars in New Yonder; in Bali tall penjor poles arch over the road instead. Lit things glow at night (small, so
 * the bloom stays soft).
 */
export type GarlandStyle = 'fanous' | 'redlantern' | 'chochin' | 'lotus' | 'marigold' | 'bunting' | 'palio' | 'fairy' | 'brass' | 'icechimes' | 'penjor' | 'neon';

export const GARLANDS: Partial<Record<RegionId, { style: GarlandStyle; colours: string[] }>> = {
  islamic: { style: 'fanous', colours: ['#ffb84a', '#3ac8ff', '#ff6b8b', '#7aff9a'] },
  middleeast: { style: 'fanous', colours: ['#ffb84a', '#ff7a3a', '#3ae0c8', '#b86bff'] },
  egypt: { style: 'fanous', colours: ['#ffc06a', '#3a9aff', '#ff5a5a', '#ffe08a'] },
  china: { style: 'redlantern', colours: ['#e8242a', '#d81e2a'] },
  japan: { style: 'chochin', colours: ['#ffffff', '#e8342a', '#ffe0a0'] },
  korea: { style: 'lotus', colours: ['#ff8fb8', '#ffd24a', '#8fd0ff', '#b8ff9a', '#ffffff'] },
  indianorth: { style: 'marigold', colours: ['#ff9a1f', '#ffc21f', '#ff6a1f'] },
  indiasouth: { style: 'marigold', colours: ['#ffc21f', '#ff9a1f', '#ffffff'] },
  mughal: { style: 'marigold', colours: ['#ff8fb8', '#ffffff', '#ff4a6a'] },
  london: { style: 'bunting', colours: ['#c8102e', '#ffffff', '#012169'] },
  norway: { style: 'bunting', colours: ['#ba0c2f', '#ffffff', '#00205b'] },
  switzerland: { style: 'bunting', colours: ['#d52b1e', '#ffffff'] },
  vintage: { style: 'bunting', colours: ['#ff8fb8', '#ffd24a', '#8fd0ff', '#b8ff9a', '#ffb86a'] },
  renaissance: { style: 'palio', colours: ['#b5552e', '#e2b43a', '#2f4a8a', '#2f7a5a', '#fbf3e0'] },
  meadow: { style: 'fairy', colours: ['#ff8fb8', '#ffd24a', '#8fd0ff', '#b8ff9a', '#c9a0ff'] },
  desert: { style: 'brass', colours: ['#ff9a3a', '#ffc06a'] },
  aurora: { style: 'icechimes', colours: ['#bfe8ff', '#e0f4ff', '#a8d8ff'] },
  indonesia: { style: 'penjor', colours: ['#f2e2a8', '#e2b43a', '#ffffff'] },
  newyork: { style: 'neon', colours: ['#ff4ad0', '#4ad8ff', '#b8ff4a', '#ffe04a'] },
};

/** A string across a street, `w` wide, at height `y`, sagging `sag` at the middle; items every `step`. */
function string(c: Ctx, w: number, y: number, sag: number, step: number, item: (x: number, y: number, k: number) => void): void {
  const n = Math.max(2, Math.round(w / 1.2));
  // The rope: short straight pieces along the catenary.
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + (i / n) * w, x1 = -w / 2 + ((i + 1) / n) * w;
    const y0 = y - sag * (1 - (2 * x0 / w) ** 2), y1 = y - sag * (1 - (2 * x1 / w) ** 2);
    const len = Math.hypot(x1 - x0, y1 - y0);
    // A thin cylinder (along y) turned to lie along the piece.
    c.g.add(new THREE.CylinderGeometry(0.018, 0.018, len, 3), '#3a2a22', M((x0 + x1) / 2, (y0 + y1) / 2, 0, 0, 1, 1, 1, 0, Math.atan2(y1 - y0, x1 - x0) - Math.PI / 2));
  }
  let k = 0;
  for (let x = -w / 2 + step; x < w / 2 - step * 0.5; x += step, k++) item(x, y - sag * (1 - (2 * x / w) ** 2), k);
}

/** Hang one string of the land's style across a street `w` wide (the builder's frame: street along z, across x). */
export function garland(c: Ctx, style: GarlandStyle, colours: string[], w: number, y: number, seed: number): void {
  const pick = (k: number) => colours[(k + seed) % colours.length];
  // The poles at either end.
  if (style !== 'penjor') for (const sx of [-1, 1]) {
    cyl(c.g, 0.07, 0.09, y + 0.4, '#4a3a2e', sx * w / 2, 0, 0, 6);
    sphere(c.g, 0.12, '#c9a24a', sx * w / 2, y + 0.45, 0, 6);
  }
  switch (style) {
    case 'fanous':
    case 'brass':
      string(c, w, y, 0.9, 1.6, (x, yy, k) => {
        // A lantern: a cap and finial, a glowing body with a brass frame.
        cyl(c.g, 0.012, 0.012, 0.3, '#3a2a22', x, yy - 0.3, 0, 3);
        cone(c.g, 0.16, 0.18, '#c9a24a', x, yy - 0.42, 0, 6);
        cyl(c.glow, 0.13, 0.1, 0.34, style === 'brass' ? '#ffb84a' : pick(k), x, yy - 0.78, 0, 6);
        cyl(c.g, 0.15, 0.15, 0.03, '#c9a24a', x, yy - 0.8, 0, 6);
        cone(c.g, 0.1, 0.12, '#c9a24a', x, yy - 0.92, 0, 6);
      });
      break;
    case 'redlantern':
      string(c, w, y, 0.8, 1.5, (x, yy) => {
        cyl(c.g, 0.012, 0.012, 0.25, '#3a2a22', x, yy - 0.25, 0, 3);
        cyl(c.g, 0.12, 0.12, 0.05, '#e2b43a', x, yy - 0.3, 0, 8);
        sphere(c.glow, 0.28, '#e8242a', x, yy - 0.62, 0, 10, 0.85);
        cyl(c.g, 0.12, 0.12, 0.05, '#e2b43a', x, yy - 0.95, 0, 8);
        cyl(c.g, 0.03, 0.01, 0.35, '#ffd24a', x, yy - 1.3, 0, 4); // tassel
      });
      break;
    case 'chochin':
      string(c, w, y, 0.7, 1.3, (x, yy, k) => {
        cyl(c.g, 0.11, 0.11, 0.05, '#2a2a2a', x, yy - 0.28, 0, 8);
        cyl(c.glow, 0.17, 0.17, 0.46, pick(k), x, yy - 0.76, 0, 10);
        cyl(c.g, 0.11, 0.11, 0.05, '#2a2a2a', x, yy - 0.8, 0, 8);
      });
      break;
    case 'lotus':
      string(c, w, y, 0.6, 1.1, (x, yy, k) => {
        const col = pick(k);
        for (let p = 0; p < 6; p++) {
          const a = (p / 6) * Math.PI * 2;
          c.glow.add(new THREE.SphereGeometry(0.14, 6, 4).scale(0.6, 1.2, 0.35), col, M(x + Math.cos(a) * 0.14, yy - 0.5, Math.sin(a) * 0.14, -a, 1, 1, 1, 0.5, 0));
        }
        sphere(c.g, 0.06, '#f2d14e', x, yy - 0.44, 0, 5);
      });
      break;
    case 'marigold':
      // Thick garlands of marigolds swagged across, and a mango-leaf toran fringe.
      string(c, w, y, 1.2, 0.22, (x, yy, k) => {
        sphere(c.g, 0.09, pick(k), x, yy, 0, 5);
        if (k % 5 === 0) {
          for (let j = 1; j < 5; j++) sphere(c.g, 0.08, pick(k + j), x, yy - j * 0.16, 0, 5);
          c.g.add(new THREE.SphereGeometry(0.1, 5, 3).scale(0.5, 1.6, 0.15), '#3f8a3a', M(x + 0.1, yy - 0.2, 0));
        }
      });
      break;
    case 'bunting':
      string(c, w, y, 0.6, 0.6, (x, yy, k) => {
        c.g.add(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.22, 0, 0), new THREE.Vector3(0.22, 0, 0), new THREE.Vector3(0, -0.5, 0)]).setIndex([0, 1, 2]).toNonIndexed(), pick(k), M(x, yy, 0));
      });
      break;
    case 'palio':
      string(c, w, y, 0.4, 2.2, (x, yy, k) => {
        box(c.g, 0.9, 1.6, 0.03, pick(k), x, yy - 1.7, 0);
        box(c.g, 0.9, 0.16, 0.04, pick(k + 1), x, yy - 0.5, 0);
        box(c.g, 1.1, 0.06, 0.06, '#6b4a2a', x, yy - 0.1, 0);
      });
      break;
    case 'neon':
      // Neon light-bars and rings strung across the avenue, in the city's colours.
      string(c, w, y, 0.3, 1.8, (x, yy, k) => {
        if (k % 2) box(c.glow, 1.1, 0.08, 0.08, pick(k), x, yy - 0.35, 0);
        else c.glow.add(new THREE.TorusGeometry(0.3, 0.04, 5, 16), pick(k), M(x, yy - 0.45, 0));
      });
      break;
    case 'fairy':
      string(c, w, y, 0.9, 0.5, (x, yy, k) => sphere(c.glow, 0.06, pick(k), x, yy - 0.08, 0, 5));
      break;
    case 'icechimes':
      string(c, w, y, 0.7, 0.8, (x, yy, k) => {
        c.glow.add(new THREE.OctahedronGeometry(0.12).scale(0.5, 2.2, 0.5), pick(k), M(x, yy - 0.45 - (k % 3) * 0.15, 0));
      });
      break;
    case 'penjor': {
      // A tall bamboo pole at the roadside curving over the street, a hanging ornament at its tip.
      const pts: THREE.Vector3[] = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        pts.push(new THREE.Vector3(-w / 2 + t * w * 0.55, y * 1.35 * Math.sin(t * Math.PI * 0.62) + t * 0.5, 0));
      }
      c.g.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.08, 5), '#c9b27a');
      const tip = pts[pts.length - 1];
      // Woven palm-leaf ornaments along it, and the lamak hanging at the tip.
      for (let i = 3; i < 12; i += 2) sphere(c.g, 0.16, pick(i), pts[i].x, pts[i].y - 0.15, 0, 5, 1.4);
      box(c.g, 0.5, 1.2, 0.03, '#f2e2a8', tip.x, tip.y - 1.3, 0);
      cone(c.g, 0.3, 0.6, '#e2b43a', tip.x, tip.y - 0.8, 0, 6);
      break;
    }
  }
}
