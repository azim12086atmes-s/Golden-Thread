import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { buildCastle } from '../src/event/Castle';
import { CASTLE } from '../src/event/site';

describe('the celebration castle', () => {
  it('builds its keep, towers, portal and gardens, with colliders, within its grounds', () => {
    const b = buildCastle(new THREE.MeshStandardMaterial(), new THREE.MeshBasicMaterial());
    expect(b.group.children.length).toBeGreaterThan(0);
    expect(b.colliders.length).toBeGreaterThan(20);
    const box = new THREE.Box3().setFromObject(b.group);
    expect(box.max.y - b.y).toBeGreaterThan(50); // the great tower's spire
    expect(Math.abs((box.min.x + box.max.x) / 2 - CASTLE.venue.x)).toBeLessThan(40);
  });
});
