import { describe, expect, it } from 'vitest';
import { meetingLines } from '../src/story/MeetScene';
import { PEOPLE } from '../src/npc/people';
import { newGame } from '../src/core/state';
import { REGIONS } from '../src/world/regions';

describe('meeting a Keeper', () => {
  it('every land has a Keeper and a four-part film: the land, their own words, their craft and lantern, the thread', () => {
    const st = newGame();
    for (const r of REGIONS) {
      const k = PEOPLE.find((p) => p.region === r.id && p.keeper);
      expect(k, r.id).toBeTruthy();
      const lines = meetingLines(st, k!);
      expect(lines).toHaveLength(4);
      expect(lines[0]).toContain(r.name);
      expect(lines[0]).toContain(st.names.girl);
      expect(lines[1].startsWith(`${k!.name}: "`)).toBe(true);
      expect(lines[2]).toContain('lantern');
    }
  });
});
