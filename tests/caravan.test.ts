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

describe('the flying carpet', () => {
  it('seats four children and four pets, apart from each other', async () => {
    const { CARPET_SEATS, carpetSeats, MEMBER_CLEARANCE: MC } = await import('../src/caravan/caravan');
    expect(CARPET_SEATS.child.length).toBe(4);
    expect(CARPET_SEATS.pet.length).toBe(4);
    const s = carpetSeats(0, 0, 0.7);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) expect(Math.hypot(s[i].x - s[j].x, s[i].z - s[j].z)).toBeGreaterThanOrEqual(MC * 0.75);
  });

  it('flies beside them in every flight mode, clear of both of them and of any wings', async () => {
    const { carpetTarget, carpetSeats, TRAVELLER_CLEARANCE: TC } = await import('../src/caravan/caravan');
    // Half-wingspans (measured from the models): biplane 4.5 m, dragon 4.8 m; the cape and unicorns fold close.
    const wing = { fly: 0.8, unicorn: 1.3, plane: 4.5, dragon: 4.8 } as const;
    for (const mode of ['fly', 'unicorn', 'plane', 'dragon'] as const) {
      for (let k = 0; k < 24; k++) {
        const heading = k * 0.53, girl = { x: 10, y: 50, z: -4 };
        const rx = Math.cos(heading), rz = -Math.sin(heading);
        // He flies beside her (on the cape/unicorns), or sits behind her (plane, dragon).
        const side = k % 2 ? 1 : -1, gap = mode === 'unicorn' ? 2.6 : mode === 'fly' ? 1.95 : 0;
        const boy = { x: girl.x + rx * side * gap - Math.sin(heading) * (gap ? 0 : 1.5), z: girl.z + rz * side * gap - Math.cos(heading) * (gap ? 0 : 1.5) };
        const c = carpetTarget(mode, girl, boy, heading);
        for (const s of carpetSeats(c.x, c.z, heading)) {
          expect(Math.hypot(s.x - girl.x, s.z - girl.z), `${mode} girl`).toBeGreaterThanOrEqual(TC + 1);
          expect(Math.hypot(s.x - boy.x, s.z - boy.z), `${mode} boy`).toBeGreaterThanOrEqual(TC + 1);
          // Sideways distance from her line of flight must clear the wing tip.
          const lateral = Math.abs((s.x - girl.x) * rx + (s.z - girl.z) * rz);
          expect(lateral, `${mode} wing`).toBeGreaterThan(wing[mode] + 0.3);
        }
        // Always on the side away from him.
        if (gap) expect(Math.sign((c.x - girl.x) * rx + (c.z - girl.z) * rz)).toBe(-side);
      }
    }
  });
});

describe('meeting the pets', () => {
  it('each pet waits at its own land’s plaza; its favourite food wins it over, four pets at most', async () => {
    const { PETS, COMPANION_BY_ID, offerFood, strayHome, MAX_PETS } = await import('../src/caravan/caravan');
    const { newGame } = await import('../src/core/state');
    const st = newGame();
    const waiting = PETS.filter((p) => !st.caravan.includes(p.id));
    expect(waiting.length).toBe(11);
    for (const p of PETS) { const h = strayHome(p); expect(Math.hypot(h.x, h.z)).toBeLessThan(50); expect(Math.min(Math.abs(h.x), Math.abs(h.z))).toBeGreaterThan(5); }
    const [a, b, c] = waiting;
    st.inventory = {};
    expect(offerFood(st, a).ok).toBe(false); // nothing to offer
    st.inventory[a.likes] = 1;
    expect(offerFood(st, a).ok).toBe(true);
    expect(st.caravan).toContain(a.id);
    expect(st.inventory[a.likes] ?? 0).toBe(0);
    st.inventory[b.likes] = (st.inventory[b.likes] ?? 0) + 1;
    expect(offerFood(st, b).ok).toBe(true);
    // Four pets now (Pip, Clover and two more): the fifth has to wait, and keeps your food.
    expect(st.caravan.filter((id) => COMPANION_BY_ID[id].kind === 'pet').length).toBe(MAX_PETS);
    st.inventory[c.likes] = 1;
    expect(offerFood(st, c).ok).toBe(false);
    expect(st.inventory[c.likes]).toBe(1);
  });
});

describe('children go home at their destination', () => {
  it('a child whose destination is reached leaves the caravan, the bunk freed, and is remembered', async () => {
    const { arrivalsIn, bringHome } = await import('../src/caravan/caravan');
    const { newGame } = await import('../src/core/state');
    const st = newGame();
    expect(arrivalsIn(st.caravan, 'meadow')).toEqual([]);
    const kids = arrivalsIn(st.caravan, 'renaissance');
    expect(kids.map((k) => k.id)).toEqual(['child-rosie']);
    const line = bringHome(st, 'child-rosie', 'Firenzia');
    expect(line).toContain('Rosie');
    expect(st.caravan).not.toContain('child-rosie');
    expect(st.homecomings['child-rosie'].land).toBe('renaissance');
    // Pets and other children stay; a child who is not travelling cannot be brought home.
    expect(st.caravan).toContain('child-teo');
    expect(bringHome(st, 'child-rosie', 'Firenzia')).toBeNull();
  });
});
