import { describe, expect, it } from 'vitest';
import { CHILDREN, COMPANIONS, MAX_CHILDREN, MAX_PETS, MEMBER_CLEARANCE, PETS, TRAVELLER_CLEARANCE, canJoin, caravanStep, type Member } from '../src/caravan/caravan';
import { Rng } from '../src/core/rng';
import { ITEMS } from '../src/economy/items';
import { SPECIES } from '../src/animals/AnimalModel';
import { OUTFITS } from '../src/characters/outfits';

const d = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);

describe('caravan roster', () => {
  it('has children and pets from many lands, each with valid data', () => {
    expect(new Set(COMPANIONS.map((c) => c.origin)).size).toBeGreaterThanOrEqual(10);
    expect(new Set(COMPANIONS.map((c) => c.id)).size).toBe(COMPANIONS.length);
    for (const p of PETS) {
      expect(SPECIES[p.species], p.id).toBeTruthy();
      expect(ITEMS[p.likes], p.id).toBeTruthy();
      expect(p.tint).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const c of CHILDREN) {
      expect(c.tradition.length).toBeGreaterThan(10); // each child's own tradition is named
      expect(c.journey).toMatch(/blessing|asked|sent|parents|father|mother|nephew|grandmother/i);
    }
    // Dogs, cats and birds, as the owner asked.
    expect(new Set(PETS.map((p) => p.species))).toEqual(new Set(['dog', 'cat', 'dove']));
    expect(Object.keys(OUTFITS).length).toBeGreaterThan(0);
  });
});

describe('caravan movement', () => {
  it('never crowds the travellers and keeps members apart, over thousands of random steps', () => {
    const rng = new Rng(7);
    let girl = { x: 0, z: 0 };
    let heading = 0;
    let members: Member[] = [
      { id: 'a', kind: 'child', x: -1, z: -3, speed: 0 },
      { id: 'b', kind: 'child', x: 1, z: -3, speed: 0 },
      { id: 'c', kind: 'pet', x: 0, z: -5, speed: 0 },
      { id: 'd', kind: 'pet', x: 2, z: -5, speed: 0 },
      { id: 'e', kind: 'pet', x: -2, z: -5, speed: 0 },
    ];
    for (let i = 0; i < 5000; i++) {
      const dt = 1 / 60;
      if (rng.chance(0.02)) heading += rng.range(-2, 2);
      const speed = rng.pick([0, 0, 6.5, 11, 20]);
      girl = { x: girl.x + Math.sin(heading) * speed * dt, z: girl.z + Math.cos(heading) * speed * dt };
      const boy = { x: girl.x + Math.cos(heading) * 2.4, z: girl.z - Math.sin(heading) * 2.4 };
      members = caravanStep(members, girl, boy, heading, speed, dt);
      for (const m of members) {
        expect(d(m, girl)).toBeGreaterThanOrEqual(TRAVELLER_CLEARANCE - 1e-9);
        expect(d(m, boy)).toBeGreaterThanOrEqual(TRAVELLER_CLEARANCE - 1e-9);
      }
    }
    for (let i = 0; i < members.length; i++) for (let j = i + 1; j < members.length; j++) {
      expect(d(members[i], members[j])).toBeGreaterThan(MEMBER_CLEARANCE * 0.5);
    }
  });

  it('keeps up at travelling speed instead of trailing', () => {
    let members: Member[] = [{ id: 'a', kind: 'child', x: 0, z: -3, speed: 0 }];
    let girl = { x: 0, z: 0 };
    for (let i = 0; i < 600; i++) {
      girl = { x: 0, z: girl.z + 20 / 60 };
      members = caravanStep(members, girl, { x: 2.4, z: girl.z }, 0, 20, 1 / 60);
    }
    expect(d(members[0], girl)).toBeLessThan(6);
  });
});

describe('who can join', () => {
  it('children join after their land\'s chapter, four at a time; pets once befriended, four at a time', () => {
    const [kavya, tomas, hana, seoah, mina] = [CHILDREN[0], CHILDREN[1], CHILDREN[2], CHILDREN[3], CHILDREN[4]];
    expect(canJoin(kavya, [], [], []).ok).toBe(false);
    expect(canJoin(kavya, [], [kavya.joinsAfter], []).ok).toBe(true);
    expect(canJoin(mina, [kavya, tomas, hana], [mina.joinsAfter], []).ok).toBe(true);
    expect(canJoin(mina, [kavya, tomas, hana, seoah], [mina.joinsAfter], []).ok).toBe(false);
    expect(MAX_CHILDREN).toBe(4);
    const [p1, p2, p3, p4, p5] = PETS;
    expect(canJoin(p1, [], [], []).ok).toBe(false);
    expect(canJoin(p1, [], [], [p1.id]).ok).toBe(true);
    expect(canJoin(p5, [p1, p2, p3, p4], [], [p5.id]).ok).toBe(false);
    expect(MAX_PETS).toBe(4);
    expect(canJoin(p1, [p1], [], [p1.id]).ok).toBe(false);
  });
});
