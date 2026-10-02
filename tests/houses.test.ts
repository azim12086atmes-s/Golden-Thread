import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { OUTFITS } from '../src/characters/outfits';
import { FAMILY, HOUSE_NAME, HOUSE_SHAPE, HouseInterior, LANDMARK_NAME, ROOM, ROOM_SEATS, doorLabel, roomTitle } from '../src/housing/HouseInterior';
import { buildHouse } from '../src/world/architecture';
import { buildLandmark } from '../src/world/architecture';
import { GeoBuilder } from '../src/world/kit';
import { landmarkDoor } from '../src/world/World';
import { Rng } from '../src/core/rng';
import { PEOPLE_IN_NEED, needSpot } from '../src/charity/charity';
import { buildRegion } from '../src/world/RegionBuilder';
import { REGIONS, regionCenter } from '../src/world/regions';
import { reservedAt } from '../src/world/reserved';
import { waterEdge } from '../src/world/waters';
import { WATER_Y, terrainHeight } from '../src/world/terrain';

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
      // Nothing small — trees, lamps, fountains, props — stands inside a building, and no building
      // stands on a landmark's grounds (the pyramids' plateau, Bagh-e-Noor's garden) or a river bank.
      const c = regionCenter(r);
      const small = inst.colliders.filter((q) => q.r <= 2);
      for (const h of houses) {
        for (const q of small) expect(Math.hypot(q.x - h.x, q.z - h.z), `${r.id} house at ${h.x},${h.z}`).toBeGreaterThan(h.r + q.r * 0.5);
        if (Math.hypot(h.x - c.x, h.z - c.z) > 62) expect(reservedAt(r.id, h.x - c.x, h.z - c.z, 0), `${r.id} house on reserved ground`).toBe(false);
        expect(waterEdge(h.x, h.z).d, `${r.id} house by the water`).toBeGreaterThan(h.r);
      }
      // The people in need stand in the open, clear of every building, lamp and prop, on dry ground.
      for (const p of PEOPLE_IN_NEED.filter((q) => q.land === r.id)) {
        const at = needSpot(p);
        for (const col of inst.colliders) expect(Math.hypot(at.x - col.x, at.z - col.z), `${p.id}`).toBeGreaterThan(col.r + 0.6);
        expect(terrainHeight(at.x, at.z), p.id).toBeGreaterThan(WATER_Y + 0.3);
      }
      inst.dispose();
    }, 60_000); // builds a whole land: slow when the whole suite runs in parallel
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
  }, 60_000);
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
  }, 60_000);

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

  it('people who live in your home stand apart from the two and from each other', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    const door = { id: 'home:meadow-a', land: 'meadow', x: 0, z: 0, y: 0, facing: 0, kind: 'home', r: 5 };
    room.enter(door, 0.2, false, { rug: 'plain', curtains: 'plain', quilt: 'plain', lights: 'none', plant: 'none', art: 'none', lamp: 'none', cushions: 'plain' }, PEOPLE_IN_NEED.slice(0, 8));
    const s = room as unknown as { girl: { root: THREE.Object3D }; boy: { root: THREE.Object3D }; residents: Array<{ root: THREE.Object3D }> };
    expect(s.residents.length).toBe(8);
    for (const r of s.residents) {
      expect(r.root.position.distanceTo(s.girl.root.position)).toBeGreaterThan(1.5);
      expect(r.root.position.distanceTo(s.boy.root.position)).toBeGreaterThan(1.5);
      expect(Math.abs(r.root.position.x)).toBeLessThan(ROOM.halfW);
      for (const o of s.residents) if (o !== r) expect(r.root.position.distanceTo(o.root.position)).toBeGreaterThan(1);
    }
  });

  it('shapes the room like its building: domes, cones, tents, pitched roofs, vaults and open courts', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    const land: Record<string, string> = { igloo: 'aurora', glassigloo: 'aurora', lavvu: 'aurora', goahti: 'aurora', roundtent: 'desert', bedouintent: 'desert', logcabin: 'aurora', glasscabin: 'aurora', tongkonan: 'indonesia', nubian: 'egypt', riad: 'islamic', rorbu: 'norway', chalet: 'switzerland' };
    for (const [kind, id] of Object.entries(land)) {
      const door = { id: `${id}:3`, land: id, x: 0, z: 0, y: 0, facing: 0, kind, r: 5 };
      room.enter(door, 0.9, false);
      expect(roomTitle(door), kind).toContain(HOUSE_NAME[kind]);
      const box = new THREE.Box3().setFromObject((room as unknown as { room: THREE.Group }).room);
      // Round rooms reach a little wider than the square one; pitched roofs rise above it.
      expect(box.max.x, kind).toBeLessThanOrEqual(ROOM.halfW + 1.2);
      expect(box.max.y, kind).toBeLessThanOrEqual(ROOM.height + 3.6);
      expect(box.max.y, kind).toBeGreaterThan(ROOM.height - 0.5);
      const s = room as unknown as { girl: { root: THREE.Object3D }; boy: { root: THREE.Object3D } };
      expect(s.girl.root.position.distanceTo(s.boy.root.position)).toBeGreaterThanOrEqual(2.2);
    }
  });

  it('names each house by its kind, so the room inside can take its shape', () => {
    const seen = new Set<string>();
    for (const r of REGIONS) for (let i = 0; i < 16; i++) {
      const fp = buildHouse({ g: new GeoBuilder(), glow: new GeoBuilder(), rng: new Rng(`${r.id}:${i}`), s: r }) as { kind?: string };
      if (fp.kind) seen.add(fp.kind);
    }
    for (const k of ['igloo', 'lavvu', 'riad', 'nubian', 'rorbu', 'chalet', 'tongkonan', 'bedouintent', 'shop']) expect(seen, k).toContain(k);
    for (const k of seen) if (k !== 'shop') expect(HOUSE_NAME[k] ?? HOUSE_SHAPE[k], k).toBeTruthy();
  }, 60_000);
});
