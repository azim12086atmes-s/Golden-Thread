import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { GeoBuilder, tree } from '../src/world/kit';
import { rainbowGeometry } from '../src/world/Sky';

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
