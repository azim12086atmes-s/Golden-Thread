import { describe, expect, it } from 'vitest';
import { OUTFITS } from '../src/characters/outfits';
import { PEOPLE_IN_NEED } from '../src/charity/charity';
import type { Input } from '../src/core/Input';
import { HouseInterior, ROOM } from '../src/housing/HouseInterior';
import { INDOOR_GAP, atDoor, entryPoints, folkStep, keepInside, stepGirl, walkArea } from '../src/housing/roomWalk';
import { CHILDREN, MEMBER_CLEARANCE, SIBLINGS, TRAVELLER_CLEARANCE } from '../src/caravan/caravan';
import { REGIONS } from '../src/world/regions';

/** A stick held in one direction (x right, y forward), and no drag. */
const stick = (x: number, y: number) => ({ dx: 0, axis: () => ({ x, y }), held: () => false, hit: () => false }) as unknown as Input;

describe('walking about inside', () => {
  it('the room\'s own shape bounds them: its walls, or its circle in a round room', () => {
    const box = walkArea(ROOM, false), round = walkArea(ROOM, true);
    const far = { x: 50, z: -50 };
    const a = keepInside(far, box), b = keepInside(far, round);
    expect(Math.abs(a.x)).toBeLessThanOrEqual(ROOM.halfW);
    expect(a.z).toBeGreaterThanOrEqual(ROOM.back);
    expect(Math.hypot(b.x - round.cx, b.z - round.cz)).toBeLessThanOrEqual(round.r + 1e-9);
    // The people standing in the room are left room.
    const c = keepInside({ x: 0.1, z: 0 }, box, [{ x: 0, z: 0 }]);
    expect(Math.hypot(c.x, c.z)).toBeGreaterThanOrEqual(0.74);
  });

  it('they come in side by side, a full gap apart, and walk away from the camera when pushed forward', () => {
    const e = entryPoints(walkArea(ROOM, false));
    expect(Math.hypot(e.girl.x - e.boy.x, e.girl.z - e.boy.z)).toBeGreaterThanOrEqual(INDOOR_GAP);
    const s = stepGirl({ x: 0, z: 2 }, { x: 0, y: 1 }, 0, 0.5);
    expect(s.pos.z).toBeLessThan(2); // camera behind at +z: forward is −z, into the room
    expect(atDoor({ x: 0, z: ROOM.front - 0.5 }, ROOM)).toBe(true);
    expect(atDoor({ x: 0, z: 0 }, ROOM)).toBe(false);
  });

  it('in every land\'s rooms they walk all round and never come nearer than the indoor gap, and stay inside', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    const s = room as unknown as { gp: { x: number; z: number }; bp: { x: number; z: number } };
    for (const r of REGIONS) {
      room.enter({ id: `home:${r.id}-w`, land: r.id, x: 0, z: 0, y: 0, facing: 0, kind: 'home', r: 5 }, 0.3, false,
        { rug: 'plain', curtains: 'plain', quilt: 'plain', lights: 'none', plant: 'none', art: 'none', lamp: 'none', cushions: 'plain' }, PEOPLE_IN_NEED.slice(0, 4));
      expect(room.walking).toBe(true);
      // Round and round the room: forward, then turning, then back.
      const moves: Array<[number, number]> = [[0, 1], [1, 1], [1, 0], [0, -1], [-1, -1], [-1, 0], [0, 1]];
      for (const [x, y] of moves) for (let i = 0; i < 40; i++) {
        room.update(1 / 30, stick(x, y));
        expect(Math.hypot(s.gp.x - s.bp.x, s.gp.z - s.bp.z), r.id).toBeGreaterThanOrEqual(INDOOR_GAP - 1e-6);
        for (const p of [s.gp, s.bp]) {
          expect(Math.abs(p.x), r.id).toBeLessThanOrEqual(ROOM.halfW);
          expect(p.z, r.id).toBeGreaterThanOrEqual(ROOM.back);
          expect(p.z, r.id).toBeLessThanOrEqual(ROOM.front);
        }
      }
    }
  }, 120_000);

  it('by their seats they sit down together, stand again, and leave by the door', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    room.enter({ id: 'meadow:3', land: 'meadow', x: 0, z: 0, y: 0, facing: 0, kind: 'house', r: 5 }, 0.3, false);
    const s = room as unknown as { gp: { x: number; z: number }; camYaw: number; seatPose: Array<{ x: number; z: number }> };
    /** Steer her toward a point, relative to the camera: forward is away from it, right is to its right. */
    const walkTo = (to: { x: number; z: number }, near: number) => {
      for (let i = 0; i < 300 && Math.hypot(s.gp.x - to.x, s.gp.z - to.z) > near; i++) {
        const dx = to.x - s.gp.x, dz = to.z - s.gp.z, l = Math.hypot(dx, dz), yaw = s.camYaw;
        room.update(1 / 30, stick((dx * Math.cos(yaw) - dz * Math.sin(yaw)) / l, (-dx * Math.sin(yaw) - dz * Math.cos(yaw)) / l));
      }
    };
    walkTo(s.seatPose[0], 1.2);
    expect(room.interact()).toBe('sit');
    expect(room.walking).toBe(false);
    expect(room.interact()).toBe('stand');
    expect(room.walking).toBe(true);
    // Away from the seats, nothing; at the door, E steps out.
    walkTo({ x: 0, z: -3 }, 0.3);
    expect(room.interact()).toBe(null);
    walkTo({ x: 0, z: ROOM.front }, 0.1);
    expect(atDoor(s.gp, ROOM)).toBe(true);
    expect(room.interact()).toBe('exit');
  });

  it('their brothers, sisters and the children come in too, and keep clear of the two and of each other, inside the room', () => {
    const room = new HouseInterior(OUTFITS['g-kurti-jeans'], OUTFITS['b-kurta-jeans']);
    const folk = [...SIBLINGS, ...CHILDREN.slice(0, 4)].map((d, i) => ({ id: d.id, outfit: OUTFITS[i % 2 ? 'b-kurta-jeans' : 'g-kurti-jeans'], skin: '#e0ac85', scale: i < 4 ? 0.98 : 0.62 }));
    room.setCompanions(folk);
    const s = room as unknown as { gp: { x: number; z: number }; bp: { x: number; z: number }; folk: Array<{ at: { x: number; z: number } }> };
    for (const [id, land, kind] of [['meadow:3', 'meadow', 'house'], ['aurora:3', 'aurora', 'igloo'], ['newyork:2', 'newyork', 'penthouse']] as const) {
      room.enter({ id, land, x: 0, z: 0, y: 0, facing: 0, kind, r: 5 }, 0.3, false);
      expect(s.folk.length).toBe(folk.length);
      const moves: Array<[number, number]> = [[0, 1], [1, 1], [1, 0], [0, -1], [-1, 0]];
      for (const [x, y] of moves) for (let i = 0; i < 30; i++) {
        room.update(1 / 30, stick(x, y));
        expect(Math.hypot(s.gp.x - s.bp.x, s.gp.z - s.bp.z)).toBeGreaterThanOrEqual(INDOOR_GAP - 1e-6);
        for (const f of s.folk) for (const t of [s.gp, s.bp]) expect(Math.hypot(f.at.x - t.x, f.at.z - t.z), id).toBeGreaterThanOrEqual(TRAVELLER_CLEARANCE * 0.75);
      }
    }
  }, 120_000);

  it('companions step toward their places and stay within the walls', () => {
    const area = walkArea(ROOM, false), girl = { x: -1.25, z: 1.9 }, boy = { x: 1.25, z: 1.9 };
    let f = Array.from({ length: 8 }, () => ({ x: 0, z: 0, speed: 0 }));
    for (let i = 0; i < 120; i++) f = folkStep(f, girl, boy, Math.PI, area, ROOM, 1 / 30);
    for (const m of f) {
      expect(Math.abs(m.x)).toBeLessThanOrEqual(ROOM.halfW);
      expect(m.z).toBeGreaterThanOrEqual(ROOM.back);
      expect(m.z).toBeLessThanOrEqual(ROOM.front);
      for (const t of [girl, boy]) expect(Math.hypot(m.x - t.x, m.z - t.z)).toBeGreaterThanOrEqual(TRAVELLER_CLEARANCE - 1e-6);
    }
    for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) expect(Math.hypot(f[i].x - f[j].x, f[i].z - f[j].z)).toBeGreaterThan(MEMBER_CLEARANCE * 0.5);
  });
});
