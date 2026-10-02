/**
 * The diary (owner: "a feature called diary where the player can write whatever happened in their
 * day to day life to vent out, express joy. Make the feature appealing and inviting … wanting to
 * write down every day"). It is the player's own diary — their real days, not the game's — kept
 * with their journey on this device: a page for each day, a mood, a gentle question to start
 * from, a row of lanterns lit for the days written, and a kind word back after each page.
 *
 * Pure rules over the save (tests/diary.test.ts); the page itself is in the UI.
 */

export type MoodId = 'joyful' | 'grateful' | 'calm' | 'proud' | 'tired' | 'anxious' | 'sad' | 'angry';

export interface Mood { id: MoodId; icon: string; name: string; color: string }

export const MOODS: Mood[] = [
  { id: 'joyful', icon: '☀️', name: 'Joyful', color: '#f5c451' },
  { id: 'grateful', icon: '🌸', name: 'Grateful', color: '#ff8fb8' },
  { id: 'calm', icon: '🍃', name: 'Calm', color: '#8fd6a8' },
  { id: 'proud', icon: '⭐', name: 'Proud', color: '#ffd98a' },
  { id: 'tired', icon: '🌙', name: 'Tired', color: '#a8a4e0' },
  { id: 'anxious', icon: '🌧️', name: 'Worried', color: '#8ab4d8' },
  { id: 'sad', icon: '💧', name: 'Sad', color: '#7fa0e8' },
  { id: 'angry', icon: '🔥', name: 'Frustrated', color: '#ff9a7a' },
];
export const MOOD_BY_ID = Object.fromEntries(MOODS.map((m) => [m.id, m])) as Record<MoodId, Mood>;

export interface DiaryEntry {
  /** The real day it is about, `YYYY-MM-DD` in the player's own time zone. */
  date: string;
  text: string;
  mood: MoodId | '';
  /** When it was last written (ms since 1970). */
  at: number;
}

/** The longest page kept (a long letter's worth). */
export const MAX_ENTRY = 8000;

/** Today's date key in local time. */
export function dayKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** The date key `n` days before `key`. */
export function daysBefore(key: string, n: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - n, 12));
}

/** A question to begin from, the same all day (and another, if she asks for one). */
export const PROMPTS = [
  'What made you smile today, even a little?',
  'What is weighing on you? Put it down here — the page can hold it.',
  'Who were you glad to see today?',
  'What did you do today that took courage?',
  'Something small that went right today…',
  'If today had a colour, what would it be, and why?',
  'What would you like to tell someone, but haven\'t yet?',
  'What are you looking forward to?',
  'What tired you out today? What would rest look like?',
  'Write about a moment you want to remember.',
  'What did you learn today — about anything, or about yourself?',
  'What are three things you are thankful for right now?',
  'What frustrated you today? Let it all out.',
  'Who helped you lately? Who did you help?',
  'What is a worry you can let go of tonight?',
  'Describe where you are right now: the sounds, the light, the air.',
  'What would make tomorrow a good day?',
  'What did you eat today that you enjoyed?',
  'What made you laugh recently?',
  'Is there something you are proud of this week?',
  'What do you wish someone had said to you today? Say it to yourself here.',
  'A kindness you noticed today — given, received or seen.',
  'What is on your mind as you write this?',
  'What did your heart need today?',
  'Write a letter to yourself one year from now.',
  'What surprised you today?',
  'What is one thing you would like to do differently tomorrow?',
  'Something beautiful you saw today…',
  'What do you miss? Who do you miss?',
  'If you could replay one minute of today, which would it be?',
];

/** The day's question; `turn` steps to another when she asks. */
export function promptFor(date: string, turn = 0): string {
  let h = 0;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PROMPTS[(h + turn) % PROMPTS.length];
}

export function entryOn(entries: readonly DiaryEntry[], date: string): DiaryEntry | undefined {
  return entries.find((e) => e.date === date);
}

/**
 * Write (or rewrite) the page for a day. Returns whether this is the first page written that day
 * (the day's lantern is lit). Empty pages are not kept.
 */
export function writeEntry(diary: DiaryEntry[], date: string, text: string, mood: MoodId | '', at: number): { first: boolean; entry: DiaryEntry | null } {
  const body = text.slice(0, MAX_ENTRY);
  const i = diary.findIndex((e) => e.date === date);
  if (!body.trim() && !mood) {
    if (i >= 0) diary.splice(i, 1);
    return { first: false, entry: null };
  }
  const entry: DiaryEntry = { date, text: body, mood, at };
  if (i >= 0) { diary[i] = entry; return { first: false, entry }; }
  diary.push(entry);
  diary.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return { first: true, entry };
}

export function removeEntry(diary: DiaryEntry[], date: string): void {
  const i = diary.findIndex((e) => e.date === date);
  if (i >= 0) diary.splice(i, 1);
}

/**
 * Days in a row written, counting back from today — or from yesterday, if today's page is still
 * to be written (the streak is not broken until the day is over).
 */
export function streak(diary: readonly DiaryEntry[], today: string): number {
  const days = new Set(diary.map((e) => e.date));
  let k = days.has(today) ? today : daysBefore(today, 1), n = 0;
  while (days.has(k)) { n++; k = daysBefore(k, 1); }
  return n;
}

/** The longest run of days in a row ever written. */
export function bestStreak(diary: readonly DiaryEntry[]): number {
  const days = [...new Set(diary.map((e) => e.date))].sort();
  let best = 0, run = 0, prev = '';
  for (const d of days) {
    run = prev && daysBefore(d, 1) === prev ? run + 1 : 1;
    best = Math.max(best, run);
    prev = d;
  }
  return best;
}

/** The last `n` days, oldest first: each day and its mood, if a page was written. */
export function lastDays(diary: readonly DiaryEntry[], today: string, n: number): Array<{ date: string; written: boolean; mood: MoodId | '' }> {
  const by = new Map(diary.map((e) => [e.date, e]));
  return Array.from({ length: n }, (_, i) => {
    const date = daysBefore(today, n - 1 - i), e = by.get(date);
    return { date, written: !!e, mood: e?.mood ?? '' };
  });
}

/** A kind word back after the page is written, by mood. */
const REPLIES: Record<MoodId | '', string[]> = {
  joyful: ['What a lovely day to keep. Read it again on a grey one.', 'Joy written down lasts longer. Thank you for sharing it.', 'This page is glowing.'],
  grateful: ['Gratitude makes small things big. Beautifully noticed.', 'A thankful heart is a lantern for others too.', 'Kept safe — every good thing on this page.'],
  calm: ['A quiet day is a gift. Rest in it.', 'Calm like still water. Lovely.', 'Kept — a peaceful page.'],
  proud: ['You did that. Be proud — truly.', 'Well done. Look back at this when you doubt yourself.', 'A page to remember your strength by.'],
  tired: ['You carried a lot today. Rest is not a reward — it is a need.', 'Be gentle with yourself tonight.', 'Tired is allowed. Tomorrow is a new page.'],
  anxious: ['Worries shrink a little once written down. You are not alone with them.', 'Breathe in slowly, and out slower. You have come through hard days before.', 'One step at a time. This page is holding some of it for you now.'],
  sad: ['Thank you for trusting the page with this. Heavy days pass.', 'It is alright to feel this. Be kind to yourself tonight.', 'Sadness written down is a little lighter to carry.'],
  angry: ['Let it out — the page does not mind. It will cool.', 'Anger means something mattered. Writing it is a good way through.', 'Said, and set down. Now breathe.'],
  '': ['Kept safe. Thank you for writing.', 'Another page in your story.', 'Written and kept.'],
};

export function replyFor(mood: MoodId | '', seed: number): string {
  const list = REPLIES[mood];
  return list[Math.abs(Math.floor(seed)) % list.length];
}

const HEAVY: ReadonlySet<MoodId | ''> = new Set(['tired', 'anxious', 'sad', 'angry']);

/** On a heavy day, a happy page from before to look back on (the newest of the bright ones). */
export function brightMemory(diary: readonly DiaryEntry[], today: string, mood: MoodId | ''): DiaryEntry | null {
  if (!HEAVY.has(mood)) return null;
  const bright = diary.filter((e) => e.date < today && (e.mood === 'joyful' || e.mood === 'grateful' || e.mood === 'proud') && e.text.trim());
  return bright.length ? bright[bright.length - 1] : null;
}

/** A page from this day in an earlier month or year ("on this day"). */
export function onThisDay(diary: readonly DiaryEntry[], today: string): DiaryEntry | null {
  const md = today.slice(5), d = today.slice(8);
  return diary.find((e) => e.date !== today && e.date.slice(5) === md && e.text.trim())
    ?? diary.find((e) => e.date < today && e.date.slice(8) === d && daysBefore(today, 25) > e.date && e.text.trim())
    ?? null;
}

/** Streak milestones that earn a gift in the journey. */
export const MILESTONES = [3, 7, 14, 30, 60, 100, 365];

export const wordCount = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);
