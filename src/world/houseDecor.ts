import type { Ctx, Footprint } from './architecture';
import { archPanel, box, cone, cyl, sphere } from './kit';
import type { RegionId } from './regions';

/**
 * Every home dressed in its own land's way, on its street face: the craft and ornament people
 * there actually put on their houses. Pure description first (tests check every land has its
 * own), then the builder.
 */
export const HOUSE_STYLE: Record<RegionId, string> = {
  meadow: 'a climbing-rose arch over the door, a bird house and a painted bench',
  japan: 'an indigo noren curtain in the doorway, red and white paper lanterns, a bamboo fence',
  korea: 'dancheong colour bands under the eaves and onggi jars by the door',
  china: 'red lanterns, red-and-gold door couplets and a round moon window',
  norway: 'white carved trim, a rosemaling panel and a stacked woodpile',
  switzerland: 'a carved balcony of red geraniums with heart cut-outs',
  london: 'black iron railings, a blue plaque and a hanging flower basket',
  newyork: 'a black fire escape, a striped awning and a little neon sign',
  renaissance: 'stone pilasters round the door and lemon trees in terracotta pots',
  vintage: 'a striped awning, bunting and a bicycle by the wall',
  islamic: 'a zellige tile band, a pointed arch round the door and brass lanterns',
  middleeast: 'a carved mashrabiya screen, a hanging carpet and a brass lantern',
  desert: 'a woven carpet at the tent mouth, floor cushions and lanterns',
  egypt: 'a painted band of symbols in gold and blue, and lotus columns by the door',
  indianorth: 'a marigold toran over the door, a jharokha balcony and a row of diyas',
  indiasouth: 'a white kolam at the threshold, banana stems and a mango-leaf toran',
  mughal: 'a white jaali screen, a pietra-dura inlay band and pots of roses',
  indonesia: 'a split gate of carved pillars, a batik banner and a penjor pole',
  aurora: 'ice lanterns, a carved snowflake panel and a fur rug',
  skyisles: 'glowing crystals by the door and little floating lanterns',
};

export function houseDecor(c: Ctx, fp: Footprint): void {
  const z = fp.r * 0.86, id = c.s.id, r = () => c.rng.next();
  const flower = () => c.s.flowers[Math.floor(r() * c.s.flowers.length)];
  const side = r() < 0.5 ? -1 : 1, wx = side * fp.r * 0.45;
  switch (id) {
    case 'meadow':
      for (let i = 0; i <= 10; i++) {
        const a = (i / 10) * Math.PI;
        sphere(c.g, 0.16, '#4f9a44', Math.cos(a) * 0.85, 1.1 + Math.sin(a) * 1.4, z + 0.45, 5);
        if (i % 2 === 0) sphere(c.g, 0.1, ['#ff8fb8', '#ffffff', '#ff6b8b'][i % 3], Math.cos(a) * 0.85, 1.2 + Math.sin(a) * 1.4, z + 0.55, 4);
      }
      cyl(c.g, 0.05, 0.05, 1.8, '#8a5a36', -side * fp.r * 0.75, 0, z + 1.2, 5);
      box(c.g, 0.4, 0.4, 0.4, '#ffd6a0', -side * fp.r * 0.75, 1.8, z + 1.2);
      cone(c.g, 0.35, 0.3, '#c8483a', -side * fp.r * 0.75, 2.2, z + 1.2, 4);
      break;
    case 'japan':
      for (let i = 0; i < 3; i++) {
        box(c.g, 0.36, 0.8, 0.03, '#27336b', -0.38 + i * 0.38, 1.3, z + 0.12);
        box(c.g, 0.34, 0.06, 0.035, '#ffffff', -0.38 + i * 0.38, 1.7, z + 0.12);
      }
      for (const x of [-1.05, 1.05]) sphere(c.glow, 0.2, x < 0 ? '#ff4a3a' : '#fff2e0', x, 2.0, z + 0.25, 8, 1.3);
      for (let i = 0; i < 7; i++) cyl(c.g, 0.04, 0.04, 1.1, '#c9b47a', wx - 0.6 + i * 0.2, 0, z + 0.9, 5);
      box(c.g, 1.4, 0.06, 0.06, '#8a7a4a', wx, 0.8, z + 0.9);
      break;
    case 'korea': {
      const band = ['#2f8a5a', '#c8202a', '#2f6fb8', '#f2c14e'];
      const y = Math.min(fp.h * 0.7, 3.4);
      for (let i = 0; i < 12; i++) box(c.g, fp.r * 1.6 / 12, 0.22, 0.05, band[i % 4], -fp.r * 0.8 + (i + 0.5) * fp.r * 1.6 / 12, y, z + 0.06);
      for (const x of [-1.2, 1.2]) {
        sphere(c.g, 0.32, '#5a3a2a', x, 0.3, z + 0.6, 7, 1.1);
        cyl(c.g, 0.16, 0.2, 0.1, '#4a2a1a', x, 0.62, z + 0.6, 7);
      }
      break;
    }
    case 'china':
      for (const x of [-0.95, 0.95]) {
        box(c.g, 0.22, 1.7, 0.04, '#c8202a', x, 0.3, z + 0.1);
        for (let i = 0; i < 4; i++) box(c.g, 0.1, 0.1, 0.045, '#e8b84a', x, 0.55 + i * 0.35, z + 0.11);
        sphere(c.glow, 0.24, '#ff4a2a', x * 1.2, 2.3, z + 0.35, 8, 1.2);
        box(c.g, 0.1, 0.08, 0.1, '#e8b84a', x * 1.2, 2.55, z + 0.35);
      }
      cyl(c.glow, 0.45, 0.45, 0.04, '#ffd08a', wx, 1.6, z + 0.06, 16);
      break;
    case 'norway':
      for (let i = 0; i < 10; i++) cone(c.g, 0.12, 0.25, '#ffffff', -fp.r * 0.75 + i * fp.r * 0.167, Math.min(fp.h * 0.62, 3.0), z + 0.08, 3);
      box(c.g, 0.9, 0.6, 0.04, '#2f5a9a', wx, 1.6, z + 0.08);
      for (let i = 0; i < 5; i++) sphere(c.g, 0.07, ['#ffffff', '#c8483a', '#f2c14e'][i % 3], wx - 0.3 + i * 0.15, 1.9 - (i % 2) * 0.15, z + 0.11, 4);
      for (let i = 0; i < 9; i++) cyl(c.g, 0.1, 0.1, 1.1, '#9a6a3a', -side * fp.r * 0.6 + (i % 3) * 0.22 - 0.22, 0.1 + Math.floor(i / 3) * 0.2, z + 0.7, 6);
      break;
    case 'switzerland': {
      const y = Math.min(fp.h * 0.45, 2.6);
      box(c.g, fp.r * 1.4, 0.1, 0.6, '#8a5a36', 0, y, z + 0.3);
      for (let i = 0; i < 9; i++) {
        const x = -fp.r * 0.65 + i * fp.r * 0.162;
        box(c.g, 0.1, 0.6, 0.05, '#a8703f', x, y + 0.1, z + 0.6);
        sphere(c.g, 0.14, i % 2 ? '#e0283a' : '#ff5a6a', x, y + 0.85, z + 0.5, 5);
        if (i % 3 === 1) box(c.g, 0.12, 0.12, 0.06, '#ff9ab0', x + 0.08, y + 0.4, z + 0.62, 0.785);
      }
      box(c.g, fp.r * 1.4, 0.08, 0.08, '#6b4a2a', 0, y + 0.7, z + 0.62);
      break;
    }
    case 'london':
      for (let i = 0; i < 12; i++) cyl(c.g, 0.02, 0.02, 0.95, '#1f1f24', -fp.r * 0.8 + i * fp.r * 0.145, 0, z + 1.1, 4);
      box(c.g, fp.r * 1.6, 0.05, 0.05, '#1f1f24', 0, 0.9, z + 1.1);
      cyl(c.g, 0.26, 0.26, 0.04, '#2f5aa8', wx, 2.2, z + 0.06, 16);
      cyl(c.g, 0.02, 0.02, 0.5, '#1f1f24', -wx, 2.4, z + 0.4, 4);
      sphere(c.g, 0.3, '#4f9a44', -wx, 2.2, z + 0.4, 6, 0.8);
      for (let i = 0; i < 6; i++) sphere(c.g, 0.07, flower(), -wx + Math.cos(i) * 0.22, 2.25 - (i % 2) * 0.1, z + 0.45 + Math.sin(i) * 0.1, 4);
      break;
    case 'newyork': {
      const h = Math.min(fp.h * 0.8, 9);
      for (let y = 3; y < h; y += 2.8) {
        box(c.g, 2.4, 0.06, 0.8, '#1f1f24', wx, y, z + 0.4);
        for (let i = 0; i < 7; i++) box(c.g, 0.03, 0.9, 0.03, '#1f1f24', wx - 1.2 + i * 0.4, y, z + 0.8);
      }
      for (let i = 0; i < 6; i++) box(c.g, 0.4, 0.06, 0.9, i % 2 ? '#ffffff' : '#c8202a', -0.8 + i * 0.32, 2.5, z + 0.45);
      box(c.glow, 0.9, 0.3, 0.05, ['#ff4ad0', '#4ad8ff', '#ffe04a'][Math.floor(r() * 3)], -wx, 2.9, z + 0.08);
      break;
    }
    case 'renaissance':
      for (const x of [-0.95, 0.95]) {
        cyl(c.g, 0.13, 0.15, 2.5, '#efe2c4', x, 0, z + 0.12, 8);
        box(c.g, 0.4, 0.14, 0.4, '#efe2c4', x, 2.5, z + 0.12);
      }
      box(c.g, 2.3, 0.2, 0.3, '#efe2c4', 0, 2.64, z + 0.12);
      for (const x of [-1.6, 1.6]) {
        cyl(c.g, 0.26, 0.18, 0.45, '#c8703a', x, 0, z + 0.7, 7);
        sphere(c.g, 0.4, '#3f7a3a', x, 1.05, z + 0.7, 6);
        for (let i = 0; i < 4; i++) sphere(c.g, 0.07, '#ffe03a', x + Math.cos(i * 1.6) * 0.3, 1.05 + Math.sin(i) * 0.2, z + 0.7 + Math.sin(i * 1.6) * 0.3, 4);
      }
      break;
    case 'vintage':
      for (let i = 0; i < 7; i++) box(c.g, 0.34, 0.06, 0.9, i % 2 ? '#ffffff' : ['#ff8fb8', '#8ac8ff', '#9ae8a0'][Math.floor(i / 2) % 3], -1.0 + i * 0.33, 2.45, z + 0.45);
      for (let i = 0; i < 10; i++) cone(c.g, 0.1, 0.2, ['#ff8fb8', '#fff2a8', '#8ac8ff', '#b5ff9a'][i % 4], -fp.r * 0.7 + i * fp.r * 0.155, Math.min(fp.h * 0.7, 3.4) - 0.2, z + 0.1, 3);
      for (const dz of [-0.45, 0.45]) cyl(c.g, 0.32, 0.32, 0.04, '#2a2a2a', wx + dz, 0.32, z + 0.35, 12);
      box(c.g, 0.9, 0.05, 0.05, '#c8483a', wx, 0.55, z + 0.35);
      break;
    case 'islamic': {
      const tiles = ['#2f6fb8', '#ffffff', '#2f9a8a', '#e8b84a'];
      for (let i = 0; i < 16; i++) box(c.g, fp.r * 1.6 / 16, 0.2, 0.04, tiles[i % 4], -fp.r * 0.8 + (i + 0.5) * fp.r * 1.6 / 16, 0.55, z + 0.08);
      for (let i = 0; i < 16; i++) box(c.g, fp.r * 1.6 / 16, 0.2, 0.04, tiles[(i + 2) % 4], -fp.r * 0.8 + (i + 0.5) * fp.r * 1.6 / 16, 0.75, z + 0.08);
      archPanel(c.g, 1.7, 2.7, '#2f6fb8', 0, 0, z + 0.05, 0, 0.06, true);
      for (const x of [-1.2, 1.2]) sphere(c.glow, 0.18, '#ffd27a', x, 2.2, z + 0.35, 6, 1.4);
      break;
    }
    case 'middleeast':
      box(c.g, 1.3, 1.4, 0.06, '#6b4a2a', wx, 1.3, z + 0.1);
      for (let i = 0; i < 7; i++) box(c.g, 0.04, 1.35, 0.08, '#8a6a4a', wx - 0.6 + i * 0.2, 1.32, z + 0.12);
      for (let i = 0; i < 7; i++) box(c.g, 1.25, 0.04, 0.08, '#8a6a4a', wx, 1.35 + i * 0.2, z + 0.12);
      box(c.g, 1.0, 1.5, 0.03, '#a8322a', -wx, 1.0, z + 0.06);
      for (let i = 0; i < 4; i++) box(c.g, 0.8, 0.08, 0.035, ['#e8b84a', '#2f6fb8'][i % 2], -wx, 1.3 + i * 0.3, z + 0.07);
      sphere(c.glow, 0.18, '#ffb84a', 0, 2.5, z + 0.35, 6, 1.4);
      break;
    case 'desert':
      box(c.g, 1.8, 0.03, 2.0, '#a8322a', 0, 0, z + 1.2);
      for (let i = 0; i < 5; i++) box(c.g, 1.6, 0.032, 0.12, ['#e8b84a', '#2a2220', '#f1d3a2'][i % 3], 0, 0, z + 0.4 + i * 0.4);
      for (const x of [-1.3, 1.3]) {
        box(c.g, 0.6, 0.22, 0.6, '#d9a066', x, 0, z + 1.2);
        sphere(c.glow, 0.16, '#ff9a3a', x, 0.45, z + 2.1, 6, 1.3);
      }
      break;
    case 'egypt': {
      const y = Math.min(fp.h * 0.72, 3.4);
      box(c.g, fp.r * 1.6, 0.35, 0.05, '#1f4f9a', 0, y, z + 0.07);
      for (let i = 0; i < 12; i++) box(c.g, 0.12, 0.22 - (i % 3) * 0.05, 0.06, '#e8b84a', -fp.r * 0.75 + i * fp.r * 0.136, y + 0.06, z + 0.08);
      for (const x of [-1.0, 1.0]) {
        cyl(c.g, 0.16, 0.2, 2.4, '#e8d6a0', x, 0, z + 0.3, 8);
        cone(c.g, 0.3, 0.35, '#4f9a44', x, 2.4, z + 0.3, 6);
      }
      break;
    }
    case 'indianorth':
      for (let i = 0; i <= 12; i++) {
        const x = -0.8 + i * (1.6 / 12);
        sphere(c.g, 0.07, i % 2 ? '#ff9a1f' : '#ffc83a', x, 2.25 - Math.sin((i / 12) * Math.PI) * 0.18, z + 0.14, 4);
        if (i % 3 === 0) cone(c.g, 0.06, 0.22, '#3f8a3a', x, 1.95, z + 0.14, 3);
      }
      box(c.g, 1.3, 0.1, 0.55, '#d97a5a', wx, 2.2, z + 0.3);
      for (const x of [-0.55, 0.55]) cone(c.g, 0.08, 0.3, '#b8522a', wx + x, 1.9, z + 0.5, 4);
      cone(c.g, 0.75, 0.45, '#d97a5a', wx, 2.3, z + 0.3, 4, Math.PI / 4);
      for (let i = 0; i < 5; i++) sphere(c.glow, 0.05, '#ffb84a', -0.8 + i * 0.4, 0.26, z + 0.55, 4);
      break;
    case 'indiasouth':
      for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 8 + ring * 6; i++) {
        const a = (i / (8 + ring * 6)) * Math.PI * 2, rr = 0.25 + ring * 0.25;
        box(c.g, 0.08, 0.012, 0.08, '#ffffff', Math.cos(a) * rr, 0.01, z + 1.4 + Math.sin(a) * rr, a);
      }
      for (const x of [-1.0, 1.0]) {
        cyl(c.g, 0.08, 0.1, 2.0, '#6aa84f', x, 0, z + 0.3, 6);
        for (let i = 0; i < 3; i++) box(c.g, 0.12, 0.7, 0.03, '#4f9a44', x + (i - 1) * 0.15, 1.8, z + 0.3, (i - 1) * 0.5);
      }
      for (let i = 0; i < 9; i++) cone(c.g, 0.06, 0.24, '#3f8a3a', -0.8 + i * 0.2, 2.0, z + 0.14, 3);
      break;
    case 'mughal':
      box(c.g, 1.2, 1.3, 0.05, '#fbf6ea', wx, 1.1, z + 0.08);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) sphere(c.g, 0.07, '#e8dcc6', wx - 0.4 + i * 0.2, 1.3 + j * 0.22, z + 0.11, 4);
      box(c.g, fp.r * 1.6, 0.18, 0.04, '#ffffff', 0, 0.7, z + 0.08);
      for (let i = 0; i < 10; i++) sphere(c.g, 0.05, ['#c8202a', '#2f8a5a', '#2f6fb8'][i % 3], -fp.r * 0.72 + i * fp.r * 0.16, 0.79, z + 0.1, 4);
      for (const x of [-1.5, 1.5]) {
        cyl(c.g, 0.2, 0.15, 0.4, '#e8dcc6', x, 0, z + 0.7, 7);
        sphere(c.g, 0.3, '#3f7a3a', x, 0.62, z + 0.7, 6);
        for (let i = 0; i < 5; i++) sphere(c.g, 0.07, '#d1284a', x + Math.cos(i * 1.3) * 0.22, 0.75, z + 0.7 + Math.sin(i * 1.3) * 0.22, 4);
      }
      break;
    case 'indonesia':
      for (const x of [-1.25, 1.25]) for (let i = 0; i < 4; i++) box(c.g, 0.6 - i * 0.12, 0.7, 0.6 - i * 0.12, i % 2 ? '#8a3a2a' : '#6b4a3a', x, i * 0.7, z + 0.9);
      box(c.g, 0.7, 1.2, 0.03, '#2a3a6b', wx, 1.3, z + 0.06);
      for (let i = 0; i < 5; i++) box(c.g, 0.6, 0.08, 0.035, i % 2 ? '#e8b84a' : '#ffffff', wx, 1.4 + i * 0.2, z + 0.07);
      for (let i = 0; i < 8; i++) {
        const a = (i / 7) * 1.2;
        sphere(c.g, 0.06, '#e8d6a0', -side * fp.r * 0.8 + Math.sin(a) * 1.2, 1 + Math.cos(a) * 3.5 - 0.5, z + 1.4, 4);
      }
      cyl(c.g, 0.04, 0.06, 4.2, '#c9b47a', -side * fp.r * 0.8, 0, z + 1.4, 5);
      break;
    case 'aurora':
      for (const x of [-1.0, 1.0]) {
        box(c.g, 0.3, 0.5, 0.3, '#e6f3ff', x, 0, z + 0.6);
        sphere(c.glow, 0.12, '#7affc0', x, 0.3, z + 0.6, 6);
      }
      for (let i = 0; i < 6; i++) box(c.g, 0.5, 0.05, 0.04, '#bfe3ff', 0, 2.4, z + 0.1, (i / 6) * Math.PI);
      box(c.g, 1.4, 0.03, 1.0, '#e8dcc6', 0, 0, z + 0.8);
      break;
    case 'skyisles':
      for (const x of [-1.1, 1.1]) {
        cone(c.glow, 0.14, 0.6, '#c8a4ff', x, 0, z + 0.5, 5);
        cone(c.glow, 0.09, 0.4, '#9fd8ff', x + 0.18, 0, z + 0.6, 5);
      }
      for (let i = 0; i < 3; i++) sphere(c.glow, 0.12, ['#fff0b0', '#ffd6f0', '#e6dcff'][i], -0.6 + i * 0.6, 2.6 + (i % 2) * 0.3, z + 0.6, 6, 1.3);
      break;
  }
}
