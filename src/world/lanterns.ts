import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { RegionId } from './regions';

/**
 * Each land's own lantern, after a real tradition:
 *  - kongming: the tall paper sky lantern of China, open at the bottom.
 *  - chochin: the round, ribbed paper lantern of Japan and Korea, dark bands top and bottom.
 *  - moroccan: a pierced brass star lantern with a domed cap (the Islamic lands, the Middle East,
 *    Egypt, the desert): light spills through its holes.
 *  - kandil: the star-shaped akash kandil of India's festival nights, with tassels.
 *  - victorian: a glass lantern in a black iron frame with a pyramid cap (London, New Yonder,
 *    the vintage town, the Renaissance city).
 *  - nordic: a six-sided iron candle lantern with a pointed roof (the fjords, the Alps, the Aurora).
 *  - crystal: a floating crystal of light (the Sky Isles).
 *  - fairy: a glowing blossom with petals (the Meadow).
 *  - woven: a woven palm-leaf cone lantern (Indonesia).
 * Each is one geometry whose `color` attribute is 1 where light shines (paper, glass, holes) and
 * dark on frames and caps, so a single glowing material draws the whole lantern.
 */
export type LanternDesign = 'kongming' | 'chochin' | 'moroccan' | 'kandil' | 'victorian' | 'nordic' | 'crystal' | 'fairy' | 'woven';
export const LANTERN_DESIGNS: LanternDesign[] = ['kongming', 'chochin', 'moroccan', 'kandil', 'victorian', 'nordic', 'crystal', 'fairy', 'woven'];

export const LAND_LANTERN: Record<RegionId, LanternDesign> = {
  china: 'kongming', japan: 'chochin', korea: 'chochin', islamic: 'moroccan', middleeast: 'moroccan', egypt: 'moroccan',
  desert: 'moroccan', indianorth: 'kandil', indiasouth: 'kandil', mughal: 'kandil', london: 'victorian', newyork: 'victorian',
  vintage: 'victorian', renaissance: 'victorian', norway: 'nordic', switzerland: 'nordic', aurora: 'nordic', skyisles: 'crystal',
  meadow: 'fairy', indonesia: 'woven',
};

/** How brightly each kind shines through (paper glows softly, pierced brass in bright points). */
export const LANTERN_INTENSITY: Record<LanternDesign, number> = {
  kongming: 1, chochin: 0.9, moroccan: 1.25, kandil: 1.1, victorian: 1.15, nordic: 0.95, crystal: 1.3, fairy: 1.05, woven: 0.85,
};

function tint(g: THREE.BufferGeometry, k: number): THREE.BufferGeometry {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute('uv');
  const c = new Float32Array(n.getAttribute('position').count * 3).fill(k);
  n.setAttribute('color', new THREE.BufferAttribute(c, 3));
  if (!n.getAttribute('normal')) n.computeVertexNormals();
  return n;
}

const LIGHT = 1, DARK = 0.12;

/** One lantern about 0.9 m tall, base at y = 0 (shared by sky lanterns and street lamps). */
export function lanternGeometry(d: LanternDesign): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const P = (g: THREE.BufferGeometry, k: number) => parts.push(tint(g, k));
  switch (d) {
    case 'kongming':
      P(new THREE.CylinderGeometry(0.42, 0.3, 0.8, 10, 1, true).translate(0, 0.4, 0), LIGHT);
      P(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 10).translate(0, 0.8, 0), 0.8);
      break;
    case 'chochin':
      P(new THREE.SphereGeometry(0.35, 14, 10).scale(1, 1.25, 1).translate(0, 0.45, 0), LIGHT);
      for (let i = 1; i < 6; i++) P(new THREE.TorusGeometry(0.35 * Math.sin((i / 6) * Math.PI) + 0.005, 0.008, 4, 16).rotateX(Math.PI / 2).translate(0, 0.45 + Math.cos((i / 6) * Math.PI) * 0.43, 0), 0.55);
      for (const y of [0.03, 0.87]) P(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 12).translate(0, y, 0), DARK);
      break;
    case 'moroccan': {
      const body = new THREE.OctahedronGeometry(0.34, 0).scale(1, 1.3, 1).translate(0, 0.44, 0);
      P(body, 0.3);
      // The holes in the brass: little bright stars all over the body.
      for (let i = 0; i < 28; i++) {
        const y = 0.12 + ((i * 0.618) % 1) * 0.64, a = i * 2.4, r = 0.34 * (1 - Math.abs(y - 0.44) / 0.44) * 0.92;
        P(new THREE.OctahedronGeometry(0.035, 0).translate(Math.cos(a) * r, y, Math.sin(a) * r), LIGHT);
      }
      P(new THREE.SphereGeometry(0.16, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.86, 0), DARK);
      P(new THREE.ConeGeometry(0.05, 0.16, 6).translate(0, 1.0, 0), DARK);
      break;
    }
    case 'kandil': {
      const s = new THREE.Shape();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 0.17 : 0.4, a = (i / 10) * Math.PI * 2 + Math.PI / 2; (i ? s.lineTo : s.moveTo).call(s, Math.cos(a) * r, Math.sin(a) * r); }
      s.closePath();
      P(new THREE.ExtrudeGeometry(s, { depth: 0.22, bevelEnabled: false }).translate(0, 0, -0.11).translate(0, 0.5, 0), LIGHT);
      for (const x of [-0.12, 0, 0.12]) P(new THREE.CylinderGeometry(0.015, 0.03, 0.28, 4).translate(x, -0.02, 0), 0.8);
      break;
    }
    case 'victorian':
      P(new THREE.BoxGeometry(0.34, 0.5, 0.34).translate(0, 0.35, 0), LIGHT);
      for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) P(new THREE.BoxGeometry(0.03, 0.54, 0.03).translate(x, 0.35, z), DARK);
      P(new THREE.ConeGeometry(0.3, 0.26, 4).rotateY(Math.PI / 4).translate(0, 0.73, 0), DARK);
      P(new THREE.BoxGeometry(0.4, 0.06, 0.4).translate(0, 0.07, 0), DARK);
      break;
    case 'nordic':
      P(new THREE.CylinderGeometry(0.2, 0.2, 0.46, 6).translate(0, 0.33, 0), LIGHT);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; P(new THREE.BoxGeometry(0.025, 0.5, 0.025).translate(Math.cos(a) * 0.2, 0.33, Math.sin(a) * 0.2), DARK); }
      P(new THREE.ConeGeometry(0.26, 0.3, 6).translate(0, 0.71, 0), DARK);
      P(new THREE.TorusGeometry(0.07, 0.015, 4, 10).translate(0, 0.92, 0), DARK);
      break;
    case 'crystal':
      P(new THREE.OctahedronGeometry(0.3, 0).scale(0.8, 1.6, 0.8).translate(0, 0.48, 0), LIGHT);
      P(new THREE.OctahedronGeometry(0.12, 0).scale(1, 1.5, 1).translate(0.22, 0.3, 0.1), 0.85);
      break;
    case 'fairy':
      P(new THREE.SphereGeometry(0.2, 12, 8).translate(0, 0.42, 0), LIGHT);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; P(new THREE.SphereGeometry(0.16, 8, 6).scale(0.5, 0.22, 1).translate(0, 0, 0.16).rotateY(a).rotateX(0).translate(0, 0.5, 0), 0.75); }
      P(new THREE.ConeGeometry(0.05, 0.3, 5).translate(0, 0.72, 0), 0.4);
      break;
    case 'woven':
      P(new THREE.ConeGeometry(0.34, 0.7, 10, 3, true).rotateX(Math.PI).translate(0, 0.45, 0), LIGHT);
      for (let i = 1; i < 4; i++) P(new THREE.TorusGeometry(0.34 * (1 - i / 4) + 0.01, 0.012, 4, 14).rotateX(Math.PI / 2).translate(0, 0.8 - i * 0.175, 0), 0.4);
      break;
  }
  const g = mergeGeometries(parts, false)!;
  for (const p of parts) p.dispose();
  return g;
}
