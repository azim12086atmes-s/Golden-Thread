import { describe, expect, it } from 'vitest';
import { DAY_MINUTES, newGame } from '../src/core/state';
import { PEOPLE_IN_NEED, give } from '../src/charity/charity';
import { INSTITUTES, INSTITUTE_BY_KIND, institutesOf } from '../src/institutions/catalogue';
import { EXPERTS, INSTITUTE_SITES, buildStage, employ, instituteAt, learnerLevel, standingStage, takeCourse, teachClass, teachLearner, tickInstitutes } from '../src/institutions/institutions';
import { PLOTS, PLOT_SIZE } from '../src/world/plots';
import { REGIONS, regionCenter } from '../src/world/regions';
import { LEVEL_XP } from '../src/economy/items';

describe('institutes of every land', () => {
  it('each land has its own science and the four found everywhere, each in four stages that grow', () => {
    for (const r of REGIONS) {
      const own = institutesOf(r.id);
      expect(own.filter((d) => d.land === r.id).length, r.id).toBe(1);
      expect(own.length).toBe(5);
    }
    for (const d of INSTITUTES) for (let i = 1; i < 4; i++) {
      expect(d.stages[i].radius).toBeGreaterThan(d.stages[i - 1].radius);
      expect(d.stages[i].level).toBeGreaterThanOrEqual(d.stages[i - 1].level);
    }
  });

  it('sites stand clear of the avenues, the ring road and the plots, one established and three open per land', () => {
    for (const r of REGIONS) {
      const c = regionCenter(r), sites = INSTITUTE_SITES.filter((s) => s.land === r.id);
      expect(sites.filter((s) => s.established).length, r.id).toBe(1);
      expect(sites.filter((s) => !s.established).length, r.id).toBe(3);
      for (const s of sites) {
        const x = s.x - c.x, z = s.z - c.z;
        expect(Math.abs(x) - 20, s.id).toBeGreaterThan(8);
        expect(Math.abs(z) - 20, s.id).toBeGreaterThan(8);
        if (r.id !== 'skyisles') expect(Math.abs(Math.hypot(x, z) - 140), s.id).toBeGreaterThan(30);
        for (const p of PLOTS) expect(Math.abs(p.x - s.x) > 20 + PLOT_SIZE / 2 || Math.abs(p.z - s.z) > 20 + PLOT_SIZE / 2, s.id).toBe(true);
      }
    }
  });
});

describe('founding and growing an institute', () => {
  it('a watch boutique needs a skilled person: an expert, or someone you sponsor and teach', () => {
    const st = newGame();
    st.coins = 5000; st.inventory = { wood: 200, gear: 50, bread: 60 };
    const site = 'switzerland-s1';
    // No skill yet: refused.
    expect(buildStage(st, site, 'watchmaking', 'coins', { who: 'you' })).not.toBeNull();
    // A hired expert can run it.
    const expert = EXPERTS.find((e) => e.land === 'switzerland' && e.skill === 'mechanics')!;
    expect(employ(st, expert.id, 5)).toBeNull();
    expect(buildStage(st, site, 'watchmaking', 'coins', { who: 'hire', id: expert.id })).toBeNull();
    const inst = instituteAt(st, site)!;
    expect(standingStage(st, inst)).toBe(-1);
    st.minutes += DAY_MINUTES;
    tickInstitutes(st);
    expect(standingStage(st, inst)).toBe(0);
    const before = st.coins;
    st.minutes += DAY_MINUTES;
    tickInstitutes(st);
    expect(st.coins).toBeGreaterThan(before);
    // Paid in kind: the next stage with wood, gears and food for the builders.
    expect(buildStage(st, site, 'watchmaking', 'kind', { who: 'hire', id: expert.id })).toBeNull();
    expect(inst.stage).toBe(1);
  });

  it('someone you sponsor learns from you and from courses, and can then run an institute', () => {
    const st = newGame(), p = PEOPLE_IN_NEED.find((x) => x.land === 'switzerland')!;
    st.coins = 5000; st.inventory = { wood: 100 };
    give(st, p.id, { coins: 60 });
    st.skills.mechanics = LEVEL_XP[3];
    for (let d = 0; d < 3; d++) { expect(teachLearner(st, p.id, 'mechanics')).toBeNull(); expect(teachLearner(st, p.id, 'mechanics')).not.toBeNull(); st.minutes += DAY_MINUTES; }
    expect(takeCourse(st, 'switzerland-inst', p.id)).toBeNull();
    expect(learnerLevel(st, p.id, 'mechanics')).toBeGreaterThanOrEqual(1);
    expect(buildStage(st, 'switzerland-s2', 'watchmaking', 'coins', { who: 'learner', id: p.id })).toBeNull();
  });

  it('you can teach at the town’s institute once skilled, and courses cost coins or goods', () => {
    const st = newGame();
    st.coins = 100;
    expect(teachClass(st, 'switzerland-inst')).not.toBeNull();
    expect(takeCourse(st, 'switzerland-inst', 'you')).toBeNull();
    st.skills.mechanics = LEVEL_XP[3];
    const c = st.coins;
    expect(teachClass(st, 'switzerland-inst')).toBeNull();
    expect(st.coins).toBeGreaterThan(c);
    expect(buildStage(st, 'switzerland-inst', 'watchmaking', 'coins', { who: 'you' })).not.toBeNull();
    expect(buildStage(st, 'japan-s1', 'watchmaking', 'coins', { who: 'you' })).not.toBeNull();
    expect(INSTITUTE_BY_KIND.watchmaking.stages[0].name).toBe('Watch boutique');
  });
});
