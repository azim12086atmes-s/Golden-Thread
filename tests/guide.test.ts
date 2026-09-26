import { describe, expect, it } from 'vitest';
import { EventBus } from '../src/core/events';
import { deserialize } from '../src/core/save';
import { newGame, type GameState } from '../src/core/state';
import { craft } from '../src/economy/economy';
import { currentObjective, cycleTracked, direction, obtain, targetAnchor, trackedQuest, type Where } from '../src/guide/objectives';
import { PEOPLE_BY_ID } from '../src/npc/people';
import { QUESTS, QUEST_BY_ID } from '../src/quests/quests';
import { QuestSystem } from '../src/quests/QuestSystem';
import { REGION_BY_ID, regionCenter, type RegionId } from '../src/world/regions';

const at = (region: RegionId): Where => ({ region, ...regionCenter(REGION_BY_ID[region]) });
const MEADOW = at('meadow');

function started(id: string, patch: (st: GameState) => void = () => {}): GameState {
  const st = newGame();
  st.quests['main-meadow'] = { status: 'done', step: 3, count: 0 };
  patch(st);
  st.quests[id] = { status: 'active', step: 0, count: 0 };
  return st;
}

describe('guide: where to begin', () => {
  it('a new journey points at Grandmother Noor in the meadow', () => {
    const o = currentObjective(newGame(), MEADOW);
    expect(o.questId).toBeNull();
    expect(o.title).toContain('Two Wanderers');
    expect(o.next?.target).toEqual({ kind: 'npc', npc: 'noor', region: 'meadow' });
    // Already in the meadow: the travel task is checked off.
    expect(o.tasks[0].done).toBe(true);
  });

  it('with nothing underway it suggests the nearest next chapter', () => {
    const st = newGame();
    st.quests['main-meadow'] = { status: 'done', step: 3, count: 0 };
    const o = currentObjective(st, at('japan'));
    expect(o.main).toBe(true);
    expect(o.title).toContain('Tea for the Lantern');
  });
});

describe('guide: the first chapter, step by step', () => {
  it('breaks "bring Noor a scarf" into gather → make → give, and checks each off', () => {
    const st = newGame();
    const bus = new EventBus();
    const qs = new QuestSystem(st, bus);
    qs.start('main-meadow'); // talking to Noor completes the "meet" step
    let o = currentObjective(st, MEADOW);
    expect(o.questId).toBe('main-meadow');
    expect(o.step).toEqual([2, 3]);
    expect(o.tasks.map((t) => t.id)).toEqual(['get:scarf>wool', 'craft:scarf', 'go', 'give:noor']);
    expect(o.next?.id).toBe('get:scarf>wool');
    expect(o.next?.text).toContain('(1/2)'); // a new game starts with one wool
    expect(o.next?.target).toEqual({ kind: 'resource', item: 'wool', region: 'meadow' });

    st.inventory.wool = 2;
    o = currentObjective(st, MEADOW);
    expect(o.next?.id).toBe('craft:scarf');
    expect(o.next?.hint).toContain('(I)');
    expect(o.next?.hint).toContain('Make');

    expect(craft(st, 'scarf').ok).toBe(true);
    o = currentObjective(st, MEADOW);
    expect(o.tasks.find((t) => t.id === 'get:scarf>wool')?.done).toBe(true);
    expect(o.next?.id).toBe('give:noor');
    expect(o.next?.target).toMatchObject({ kind: 'npc', npc: 'noor' });

    qs.deliver('main-meadow');
    o = currentObjective(st, MEADOW);
    expect(o.next?.target).toEqual({ kind: 'lantern', region: 'meadow' });
  });
});

describe('guide: breaking things down', () => {
  it('sends the travellers to the right land for materials', () => {
    const st = started('main-norway', (s) => { s.quests['main-norway'] = undefined as never; });
    st.quests['main-norway'] = { status: 'active', step: 1, count: 0 };
    const o = currentObjective(st, MEADOW);
    const birch = o.tasks.find((t) => t.id.endsWith('>birch'));
    expect(birch?.target).toEqual({ kind: 'resource', item: 'birch', region: 'norway' });
    expect(birch?.text).toContain('Fjordhavn');
  });

  it('asks the player to practise when a recipe needs a higher skill', () => {
    const st = newGame();
    const tasks = obtain(st, 'shawl', 1, MEADOW);
    expect(tasks.some((t) => t.id === 'practise:weaving:2' && !t.done)).toBe(true);
  });

  it('sends the player to a Keeper to learn a craft they have never tried', () => {
    const st = newGame();
    const tasks = obtain(st, 'rug', 1, MEADOW); // weaving level 1; the meadow teaches weaving
    const learn = tasks.find((t) => t.id === 'learn:weaving');
    expect(learn?.target).toEqual({ kind: 'npc', npc: 'noor', region: 'meadow' });
  });

  it('follows a recipe inside a recipe (the Star Lamp needs a lantern)', () => {
    const tasks = obtain(newGame(), 'starlamp', 1, MEADOW);
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('get:starlamp>lantern>sand');
    expect(ids).toContain('craft:starlamp>lantern');
    expect(ids).toContain('get:starlamp>stardust');
    expect(tasks.find((t) => t.id === 'get:starlamp>stardust')?.target).toMatchObject({ region: 'skyisles' });
    expect(ids[ids.length - 1]).toBe('craft:starlamp');
  });

  it('befriending first finds the food, then the animal where it lives', () => {
    const st = started('side-panda');
    const o = currentObjective(st, MEADOW);
    expect(o.tasks.map((t) => t.id)).toEqual(['get:bamboo', 'go', 'befriend:panda']);
    expect(o.tasks[1].target).toEqual({ kind: 'region', region: 'china' });
    expect(o.tasks[2].target).toEqual({ kind: 'animal', species: 'panda', region: 'china' });
  });
});

describe('guide: completeness', () => {
  it('every step of every quest has a next task with a place to go or a way to do it', () => {
    for (const q of QUESTS) {
      q.steps.forEach((_, i) => {
        const st = newGame();
        st.quests[q.id] = { status: 'active', step: i, count: 0 };
        const o = currentObjective(st, MEADOW);
        expect(o.questId, `${q.id} step ${i}`).toBe(q.id);
        expect(o.tasks.length, `${q.id} step ${i}`).toBeGreaterThan(0);
        const next = o.next;
        expect(next, `${q.id} step ${i} has a next task`).toBeTruthy();
        expect(!!next!.target || !!next!.hint, `${q.id} step ${i}: ${next!.text}`).toBe(true);
      });
    }
  });

  it('every target resolves to a finite point inside its land', () => {
    for (const q of QUESTS) q.steps.forEach((_, i) => {
      const st = newGame();
      st.quests[q.id] = { status: 'active', step: i, count: 0 };
      for (const t of currentObjective(st, MEADOW).tasks) {
        if (!t.target) continue;
        const p = targetAnchor(t.target), c = regionCenter(REGION_BY_ID[t.target.region]);
        expect(Number.isFinite(p.x) && Number.isFinite(p.z)).toBe(true);
        expect(Math.hypot(p.x - c.x, p.z - c.z), `${q.id}: ${t.text}`).toBeLessThan(350);
      }
    });
  });

  it('every quest giver and delivery target is a real person', () => {
    for (const q of QUESTS) {
      expect(PEOPLE_BY_ID[q.giver], q.id).toBeTruthy();
      for (const s of q.steps) if ('npc' in s) expect(PEOPLE_BY_ID[s.npc], `${q.id} → ${s.npc}`).toBeTruthy();
    }
  });
});

describe('guide: tracking', () => {
  it('follows the main story unless the player chooses another journey', () => {
    const st = started('side-lamb');
    st.quests['main-japan'] = { status: 'active', step: 0, count: 0 };
    expect(trackedQuest(st)?.id).toBe('main-japan');
    st.tracked = 'side-lamb';
    expect(currentObjective(st, MEADOW).questId).toBe('side-lamb');
    expect(cycleTracked(st)).not.toBe('side-lamb');
    // A finished tracked quest falls back to the main story.
    st.tracked = 'side-lamb';
    st.quests['side-lamb'] = { status: 'done', step: 2, count: 0 };
    expect(trackedQuest(st)?.id).toBe('main-japan');
  });

  it('older saves without a tracked quest load with the guide choosing', () => {
    const old = newGame() as unknown as Record<string, unknown>;
    delete old.tracked;
    const st = deserialize(JSON.stringify(old))!;
    expect(st.tracked).toBe('');
    expect(QUEST_BY_ID['main-meadow']).toBeTruthy();
  });

  it('names compass directions with north at the top of the map', () => {
    const c = (r: RegionId) => regionCenter(REGION_BY_ID[r]);
    expect(direction(c('meadow'), c('switzerland'))).toBe('north');
    expect(direction(c('meadow'), c('renaissance'))).toBe('east');
    expect(direction(c('meadow'), c('mughal'))).toBe('south');
    expect(direction(c('meadow'), c('aurora'))).toBe('north-west');
  });
});
