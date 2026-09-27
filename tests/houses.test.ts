import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { OUTFITS } from '../src/characters/outfits';
import { FAMILY, HouseInterior, LANDMARK_NAME, ROOM, ROOM_SEATS, doorLabel, roomTitle } from '../src/housing/HouseInterior';
import { buildLandmark } from '../src/world/architecture';
import { GeoBuilder } from '../src/world/kit';
import { landmarkDoor } from '../src/world/World';
import { Rng } from '../src/core/rng';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGIONS } from '../src/world/regions';
import { WATER_Y } from '../src/world/terrain';

const solid = new THREE.MeshStandardMaterial(), glow = new THREE.MeshBasicMaterial();

describe('every building can be entered', () => {
  for (const r of REGIONS) {
    it(`${r.id}: front doors stand outside the walls, and nothing to gather is inside a building`, () => {
      const inst = buildRegion(r, solid, glow);
      const houses = inst.colliders.filter((c) => c.r > 2);
      // Every building has a door: tents, turf huts and cloud houses too.
      expect(inst.doors.length, r.id).toBeGreaterThan(20);
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

describe('landmarks and your own home', () => {
  it('every landmark has a door outside all its walls', () => {
    for (const r of REGIONS) {
      const out = buildLandmark({ g: new GeoBuilder(), glow: new GeoBuilder(), rng: new Rng(`landmark:${r.id}`), s: r });
      const d = landmarkDoor(r.id, { x: 0, z: 0 }, out.colliders);
      for (const c of out.colliders) expect(Math.hypot(d.x - c.x, d.z - c.z), r.id).toBeGreaterThan(c.r);
      expect(d.z, r.id).toBeLessThan(80);
      expect(roomTitle(d)).toContain(LANDMARK_NAME[r.id]);
      expect(doorLabel(d)).toContain(LANDMARK_NAME[r.id]);
    }
  });

  it('your home is furnished with what you chose, inside its walls, with no host', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    const decor = { rug: 'woven', curtains: 'ribbon', quilt: 'patchwork', lights: 'rainbow', plant: 'flowers', art: 'verse', lamp: 'star', cushions: 'fan' };
    for (const r of REGIONS) {
      const door = { id: `home:${r.id}-a`, land: r.id, x: 0, z: 0, y: 0, facing: 0, kind: 'home', r: 5 };
      room.enter(door, 0.8, false, decor);
      expect(roomTitle(door)).toBe(`Your home in ${r.name}`);
      const box = new THREE.Box3().setFromObject((room as unknown as { room: THREE.Group }).room);
      expect(box.min.x, r.id).toBeGreaterThanOrEqual(-ROOM.halfW - 0.2);
      expect(box.max.x).toBeLessThanOrEqual(ROOM.halfW + 0.2);
      expect(box.min.z).toBeGreaterThanOrEqual(ROOM.back - 0.2);
      expect((room as unknown as { host: unknown }).host).toBeNull();
    }
  });
});
