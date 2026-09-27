import { describe, expect, it } from 'vitest';
import { DAY_MINUTES, newGame } from '../src/core/state';
import { serialize, deserialize } from '../src/core/save';
import { LEVEL_XP } from '../src/economy/items';
import { INSTITUTES } from '../src/institutions/catalogue';
import { PROFESSORS, TOPICS, assist, startThesis, topicsAt, workOnThesis } from '../src/institutions/research';
import { REGIONS } from '../src/world/regions';

describe('research under a professor', () => {
  it('every land science has thesis topics and every land a professor; magic theses in the Meadow and the Sky Isles', () => {
    for (const d of INSTITUTES.filter((x) => x.land)) expect(TOPICS.some((t) => t.science === d.kind), d.kind).toBe(true);
    for (const r of REGIONS) expect(PROFESSORS[r.id]).toMatch(/^Professor /);
    expect(topicsAt('meadow-inst').every((t) => t.magic)).toBe(true);
    expect(topicsAt('switzerland-inst').every((t) => !t.magic)).toBe(true);
  });

  it('assist the professor, take on a thesis once skilled, work on it day by day, earn a degree and an invention', () => {
    const st = newGame();
    st.inventory = { edelweiss: 20 };
    expect(assist(st, 'switzerland-inst')).not.toBeNull();
    st.skills.mechanics = LEVEL_XP[1];
    expect(assist(st, 'switzerland-inst')).toBeNull();
    const topic = topicsAt('switzerland-inst')[0].id;
    st.skills.mechanics = LEVEL_XP[1];
    expect(startThesis(st, 'switzerland-inst', topic)).not.toBeNull();
    st.skills.mechanics = LEVEL_XP[3];
    expect(startThesis(st, 'switzerland-inst', topic)).toBeNull();
    expect(startThesis(st, 'switzerland-inst', topic)).not.toBeNull();
    let done = null, days = 0;
    while (!done && days < 20) {
      st.minutes = Math.floor(st.minutes / DAY_MINUTES) * DAY_MINUTES + 9 * 60;
      const r = workOnThesis(st, 'switzerland-inst');
      expect('error' in r).toBe(false);
      if ('done' in r) done = r.done;
      expect('error' in workOnThesis(st, 'switzerland-inst')).toBe(true);
      st.minutes += DAY_MINUTES;
      days++;
    }
    expect(done?.id).toBe(topic);
    expect(st.degrees).toContain(topic);
    expect(st.inventions.length).toBe(1);
    expect(st.thesis).toBeNull();
    // Saves keep it.
    const back = deserialize(serialize(st))!;
    expect(back.degrees).toContain(topic);
  });
});
