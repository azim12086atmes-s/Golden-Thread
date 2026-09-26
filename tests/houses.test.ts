import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { OUTFITS } from '../src/characters/outfits';
import { FAMILY, HouseInterior, ROOM, ROOM_SEATS, roomTitle } from '../src/housing/HouseInterior';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGIONS } from '../src/world/regions';
import { WATER_Y } from '../src/world/terrain';

const solid = new THREE.MeshStandardMaterial(), glow = new THREE.MeshBasicMaterial();

describe('every building can be entered', () => {
  for (const r of REGIONS) {
    it(`${r.id}: front doors stand outside the walls, and nothing to gather is inside a building`, () => {
      const inst = buildRegion(r, solid, glow);
      const houses = inst.colliders.filter((c) => c.r > 2);
      if (!['skyisles', 'desert', 'aurora'].includes(r.id)) expect(inst.doors.length, r.id).toBeGreaterThan(10);
      for (const d of inst.doors) {
        for (const h of houses) expect(Math.hypot(d.x - h.x, d.z - h.z), `${d.id}`).toBeGreaterThan(h.r * 0.9);
        expect(d.y).toBeGreaterThan(WATER_Y);
      }
      for (const n of inst.nodes) for (const h of houses) expect(Math.hypot(n.x - h.x, n.z - h.z), `${n.id}`).toBeGreaterThan(h.r);
      inst.dispose();
    });
  }
});

describe('the rooms inside', () => {
  it('every land has its own kind of room, and the two sit well apart', () => {
    expect(Math.hypot(ROOM_SEATS[0][0] - ROOM_SEATS[1][0], ROOM_SEATS[0][2] - ROOM_SEATS[1][2])).toBeGreaterThanOrEqual(2.2);
    for (const r of REGIONS) expect(FAMILY[r.id], r.id).toBeDefined();
    expect(new Set(Object.values(FAMILY)).size).toBe(5);
  });

  it('builds a furnished room for every land and kind of building, inside its walls', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    for (const r of REGIONS) for (const kind of ['house', 'shop', 'courtyard', 'tower']) {
      const door = { id: `${r.id}:7`, land: r.id, x: 0, z: 0, y: 0, facing: 0, kind, r: 5 };
      room.enter(door, 0.8, false);
      expect(roomTitle(door)).toContain(r.name);
      const box = new THREE.Box3().setFromObject((room as unknown as { room: THREE.Group }).room);
      expect(box.min.x, `${r.id} ${kind}`).toBeGreaterThanOrEqual(-ROOM.halfW - 0.2);
      expect(box.max.x).toBeLessThanOrEqual(ROOM.halfW + 0.2);
      expect(box.min.z).toBeGreaterThanOrEqual(ROOM.back - 0.2);
      expect(box.max.y).toBeLessThanOrEqual(ROOM.height + 0.5);
      // The two, and the host, never touch.
      const s = room as unknown as { girl: { root: THREE.Object3D }; boy: { root: THREE.Object3D }; host: { root: THREE.Object3D } };
      expect(s.girl.root.position.distanceTo(s.boy.root.position)).toBeGreaterThanOrEqual(2.2);
      expect(s.host.root.position.distanceTo(s.girl.root.position)).toBeGreaterThan(1.5);
      expect(s.host.root.position.distanceTo(s.boy.root.position)).toBeGreaterThan(1.5);
    }
  });
});
