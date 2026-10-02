import { describe, expect, it } from 'vitest';
import { bestStreak, brightMemory, dayKey, daysBefore, entryOn, lastDays, onThisDay, promptFor, PROMPTS, removeEntry, streak, writeEntry, type DiaryEntry } from '../src/diary/diary';
import { deserialize, serialize } from '../src/core/save';
import { newGame } from '../src/core/state';

describe('the diary', () => {
  it('keeps one page a day, rewritten in place; empty pages are not kept', () => {
    const d: DiaryEntry[] = [];
    expect(writeEntry(d, '2026-10-02', 'A good day.', 'joyful', 1).first).toBe(true);
    expect(writeEntry(d, '2026-10-02', 'A good day, and a long walk.', 'calm', 2).first).toBe(false);
    expect(d).toHaveLength(1);
    expect(entryOn(d, '2026-10-02')?.mood).toBe('calm');
    writeEntry(d, '2026-10-01', 'Before.', '', 3);
    expect(d.map((e) => e.date)).toEqual(['2026-10-01', '2026-10-02']);
    writeEntry(d, '2026-10-01', '   ', '', 4);
    expect(d.map((e) => e.date)).toEqual(['2026-10-02']);
    removeEntry(d, '2026-10-02');
    expect(d).toEqual([]);
  });

  it('counts the days in a row, not broken until today is over', () => {
    const d: DiaryEntry[] = [];
    for (const k of ['2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01']) writeEntry(d, k, 'x', '', 0);
    expect(streak(d, '2026-10-02')).toBe(4); // today not yet written: still a run
    writeEntry(d, '2026-10-02', 'y', '', 0);
    expect(streak(d, '2026-10-02')).toBe(5);
    expect(streak(d, '2026-10-04')).toBe(0);
    writeEntry(d, '2026-09-20', 'z', '', 0);
    expect(bestStreak(d)).toBe(5);
    // Across a month's end.
    expect(daysBefore('2026-03-01', 1)).toBe('2026-02-28');
    expect(dayKey(new Date(2026, 0, 5, 12))).toBe('2026-01-05');
  });

  it('lights the week\'s lanterns, asks a question a day, and looks back on brighter days', () => {
    const d: DiaryEntry[] = [];
    writeEntry(d, '2026-09-30', 'We laughed all evening.', 'joyful', 0);
    writeEntry(d, '2026-10-02', 'Hard day.', 'sad', 0);
    const week = lastDays(d, '2026-10-02', 7);
    expect(week).toHaveLength(7);
    expect(week[6]).toMatchObject({ date: '2026-10-02', written: true, mood: 'sad' });
    expect(week.filter((x) => x.written)).toHaveLength(2);
    expect(PROMPTS).toContain(promptFor('2026-10-02'));
    expect(promptFor('2026-10-02')).toBe(promptFor('2026-10-02'));
    expect(promptFor('2026-10-02', 1)).not.toBe(promptFor('2026-10-02'));
    expect(brightMemory(d, '2026-10-02', 'sad')?.date).toBe('2026-09-30');
    expect(brightMemory(d, '2026-10-02', 'joyful')).toBeNull();
    writeEntry(d, '2025-10-02', 'A year ago.', 'calm', 0);
    expect(onThisDay(d, '2026-10-02')?.date).toBe('2025-10-02');
  });

  it('is kept with the journey, and older saves open with an empty diary', () => {
    const st = newGame();
    writeEntry(st.diary, '2026-10-02', 'Kept.', 'grateful', 5);
    expect(deserialize(serialize(st))?.diary).toEqual(st.diary);
    const old = JSON.parse(serialize(newGame()));
    delete old.diary; delete old.diaryGifts; delete old.diaryNudged;
    const back = deserialize(JSON.stringify(old));
    expect(back?.diary).toEqual([]);
    expect(back?.diaryGifts).toEqual([]);
  });
});
