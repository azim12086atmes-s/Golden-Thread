import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GeoBuilder, tree } from '../src/world/kit';
import { rainbowGeometry } from '../src/world/Sky';
import { CARD_STRIDE } from '../src/world/foliage';
import { speciesHeight } from '../src/world/trees';

const leafShare = (kind: Parameters<typeof tree>[1]) => {
  const g = new GeoBuilder();
  let s = 3;
  tree(g, kind, 0, 0, 0, 1, () => ((s = (s * 16807) % 2147483647) / 2147483647));
  const m = g.build(new THREE.MeshBasicMaterial())!;
  const leaf = m.geometry.getAttribute('leaf'), pos = m.geometry.getAttribute('position');
  let on = 0, lowLeaf = 0;
  for (let i = 0; i < leaf.count; i++) if (leaf.getX(i) > 0.5) { on++; if (pos.getY(i) < 0.3) lowLeaf++; }
  return { share: on / leaf.count, lowLeaf };
};

describe('leafy crowns', () => {
  it('crowns are leaves and trunks are wood', () => {
    const oak = leafShare('oak');
    expect(oak.share).toBeGreaterThan(0.3);
    expect(oak.share).toBeLessThan(1);
    // Nothing at the foot of the trunk is drawn as leaves.
    expect(oak.lowLeaf).toBe(0);
  });

  it('crystals are never leaves', () => {
    expect(leafShare('crystal').share).toBe(0);
  });

  it('things that are not trees are never leaves', () => {
    const g = new GeoBuilder();
    g.add(new THREE.SphereGeometry(1, 6, 4), '#ffffff');
    const m = g.build(new THREE.MeshBasicMaterial())!;
    const leaf = m.geometry.getAttribute('leaf');
    for (let i = 0; i < leaf.count; i++) expect(leaf.getX(i)).toBe(0);
  });
});

describe('rainbows of light', () => {
  it('the ribbon runs foot to foot along uv.x and inner to outer along uv.y', () => {
    const g = rainbowGeometry(100, 20), uv = g.getAttribute('uv');
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    for (let i = 0; i < uv.count; i++) {
      minX = Math.min(minX, uv.getX(i)); maxX = Math.max(maxX, uv.getX(i));
      minY = Math.min(minY, uv.getY(i)); maxY = Math.max(maxY, uv.getY(i));
    }
    expect(minX).toBeCloseTo(0, 3); expect(maxX).toBeCloseTo(1, 3);
    expect(minY).toBeCloseTo(0, 3); expect(maxY).toBeCloseTo(1, 3);
  });
});

describe('trees that branch and grow', () => {
  const grow = (kind: Parameters<typeof tree>[1], s = 1) => {
    const g = new GeoBuilder();
    g.cards = [];
    let seed = 7;
    tree(g, kind, 0, 0, 0, s, () => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    const cards = g.cards.length / CARD_STRIDE;
    const leaves = g.buildLeaves(new THREE.MeshBasicMaterial());
    const wood = g.build(new THREE.MeshBasicMaterial())!;
    wood.geometry.computeBoundingBox();
    leaves!.geometry.computeBoundingBox();
    return { cards, wood: wood.geometry, top: leaves!.geometry.boundingBox!.max.y, spread: leaves!.geometry.boundingBox!.max.x - leaves!.geometry.boundingBox!.min.x };
  };

  it('a branching oak: many limbs of wood, crowned with leaf cards', () => {
    const oak = grow('oak');
    // Trunk, limbs, branches and twigs: far more wood than a single trunk.
    expect(oak.wood.getAttribute('position').count / 3).toBeGreaterThan(150);
    expect(oak.cards).toBeGreaterThan(60);
  });

  it('an oak spreads wider than a birch; a giant is as tall as a building', () => {
    expect(grow('oak').spread).toBeGreaterThan(grow('birch').spread);
    const giant = grow('plane', 22 / speciesHeight('plane'));
    expect(giant.top).toBeGreaterThan(16);
  });

  it('every leaf card has a unit facing direction', () => {
    const g = new GeoBuilder();
    g.cards = [];
    tree(g, 'maple', 0, 0, 0, 1, () => 0.4);
    for (let o = 0; o < g.cards.length; o += CARD_STRIDE) {
      const n = Math.hypot(g.cards[o + 3], g.cards[o + 4], g.cards[o + 5]);
      expect(n).toBeCloseTo(1, 3);
    }
  });
});
