import { describe, expect, it } from 'vitest';
import { DAY_MINUTES, newGame } from '../src/core/state';
import { deserialize } from '../src/core/save';
import { level } from '../src/economy/economy';
import { LEVEL_XP } from '../src/economy/items';
import { JOBS, doGig, gigsFor, jobsIn, shiftPay, titleAt, workShift } from '../src/economy/services';
import { REGIONS } from '../src/world/regions';

const morning = (st: ReturnType<typeof newGame>, day: number) => { st.minutes = day * DAY_MINUTES + 8 * 60; };

describe('service jobs', () => {
  it('every land has employers in its own line of work, and New Yonder has software and hardware', () => {
    for (const r of REGIONS) expect(jobsIn(r.id).length, r.id).toBeGreaterThanOrEqual(2);
    expect(jobsIn('newyork').map((j) => j.skill).sort()).toEqual(['hardware', 'software']);
    expect(new Set(JOBS.map((j) => j.id)).size).toBe(JOBS.length);
  });

  it('anyone starts as an apprentice; a shift a day grows the skill, and the title and pay rise with it', () => {
    const st = newGame();
    const job = jobsIn('newyork').find((j) => j.skill === 'software')!;
    morning(st, 1);
    const first = workShift(st, job.id);
    expect(first).toMatchObject({ pay: shiftPay(0), title: 'Apprentice Developer' });
    expect(workShift(st, job.id)).toMatchObject({ error: expect.stringContaining('today') });
    let promoted: string | null = null;
    for (let d = 2; d < 8 && !promoted; d++) { morning(st, d); const r = workShift(st, job.id); if ('promoted' in r) promoted = r.promoted; }
    expect(promoted).toBe('Junior Developer');
    expect(level(st, 'software')).toBe(1);
    expect(shiftPay(4)).toBeGreaterThan(shiftPay(1) * 2);
    expect(titleAt(job, 6)).toBe('Master Developer');
    expect(st.work.worked[job.id]).toBeGreaterThanOrEqual(2);
  });

  it('the freelance board changes daily; gigs need a skill level, hardware needs parts, each is done once', () => {
    const st = newGame();
    morning(st, 3);
    const board = gigsFor('newyork', 3);
    expect(board).toEqual(gigsFor('newyork', 3)); // the same all day
    expect(board.some((g) => g.skill === 'software' && g.remote)).toBe(true);
    expect(board.some((g) => g.skill === 'hardware')).toBe(true);
    for (const r of REGIONS) for (const g of gigsFor(r.id, 3)) expect(g.pay, g.title).toBeGreaterThan(0);
    const hw = board.find((g) => g.skill === 'hardware')!;
    st.skills.hardware = LEVEL_XP[6];
    st.certificates['you:hardware'] = { skill: 'hardware', level: 6, land: 'london', day: 1 };
    for (const k of Object.keys(hw.needs)) delete st.inventory[k];
    if (Object.keys(hw.needs).length) {
      expect(doGig(st, hw)).toMatchObject({ error: expect.stringContaining('You need') });
      for (const [k, n] of Object.entries(hw.needs)) st.inventory[k] = n;
    }
    const coins = st.coins;
    expect(doGig(st, hw)).toMatchObject({ pay: hw.pay });
    expect(st.coins).toBe(coins + hw.pay);
    for (const k of Object.keys(hw.needs)) expect(st.inventory[k] ?? 0).toBe(0);
    expect(doGig(st, hw)).toMatchObject({ error: expect.stringContaining('done') });
    // A gig that needs more skill than you have.
    const fresh = newGame();
    morning(fresh, 3);
    const hard = [...REGIONS.flatMap((r) => gigsFor(r.id, 3))].find((g) => g.min >= 2)!;
    expect(doGig(fresh, hard)).toMatchObject({ error: expect.stringContaining('level') });
    // Yesterday's board is gone.
    morning(fresh, 4);
    expect(doGig(fresh, gigsFor('newyork', 3)[0])).toMatchObject({ error: expect.stringContaining('taken') });
  });

  it('old saves gain the new skills and a work record', () => {
    const old = newGame() as unknown as Record<string, unknown>;
    delete old.work;
    old.skills = { weaving: 5, carpentry: 0, cooking: 0, pottery: 0, calligraphy: 0, gardening: 0, mechanics: 0, lampcraft: 0 };
    const st = deserialize(JSON.stringify(old))!;
    expect(st.skills.software).toBe(0);
    expect(st.skills.weaving).toBe(5);
    expect(st.work).toEqual({ shifts: {}, worked: {}, done: [] });
  });
});
