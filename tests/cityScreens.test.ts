import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { CityScreens } from '../src/world/CityScreens';

describe("New Yonder's screens", () => {
  it('stand only in New Yonder, every screen with its own programme', () => {
    const s = new CityScreens(new THREE.MeshStandardMaterial());
    s.update(0, 'london', 0);
    expect(s.group.children.length).toBe(0);
    s.update(1, 'newyork', 0.5);
    const screens = s.group.children.find((m) => (m as THREE.Mesh).material === s.material) as THREE.Mesh;
    expect(screens).toBeTruthy();
    const prog = screens.geometry.getAttribute('prog');
    const programmes = new Set<number>(); for (let i = 0; i < prog.count; i++) programmes.add(prog.getX(i));
    expect(programmes.size).toBeGreaterThan(40);
    s.update(2, 'meadow', 0);
    expect(s.group.children.length).toBe(0);
  });
});
