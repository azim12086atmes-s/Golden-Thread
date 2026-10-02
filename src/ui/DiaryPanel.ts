import type { Game } from '../Game';
import { MOODS, MOOD_BY_ID, bestStreak, brightMemory, dayKey, entryOn, lastDays, onThisDay, promptFor, removeEntry, streak, wordCount, MAX_ENTRY, type DiaryEntry, type MoodId } from '../diary/diary';
import { btn, h } from './dom';

/**
 * The diary page (diary/diary.ts): a paper page for today with a question to begin from and a
 * mood, a row of lanterns lit for the days written, a kind word back, and every page kept before.
 */

const pretty = (key: string, long = true): string => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, long ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short', year: 'numeric' });
};
const weekday = (key: string): string => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString(undefined, { weekday: 'narrow' });
};
const greeting = (): string => {
  const hr = new Date().getHours();
  return hr < 5 ? 'Up late? The page is listening.' : hr < 12 ? 'Good morning. A fresh page.' : hr < 17 ? 'Good afternoon. How is the day going?' : hr < 21 ? 'Good evening. How was your day?' : 'The day is winding down. Let it out here.';
};

export class DiaryPanel {
  /** Today's page while it is being written (kept if the panel closes). */
  private draft: string | null = null;
  private mood: MoodId | '' | null = null;
  private turn = 0;
  private note: { reply: string; gift: string; memory: DiaryEntry | null } | null = null;
  private query = '';
  private draftKey = '';

  constructor(private g: Game, private rerender: () => void) {}

  private loadDraft(today: string): void {
    const key = `golden-thread/diary-draft/${this.g.saveKey}`;
    if (this.draftKey === key + today) return;
    this.draftKey = key + today;
    const kept = entryOn(this.g.st.diary, today);
    this.draft = kept?.text ?? null;
    this.mood = kept?.mood ?? null;
    if (this.draft === null) try {
      const d = JSON.parse(localStorage.getItem(key) ?? 'null') as { day: string; text: string } | null;
      if (d && d.day === today) this.draft = d.text;
    } catch { /* drafts are a nicety */ }
  }

  private keepDraft(today: string, text: string): void {
    try { localStorage.setItem(`golden-thread/diary-draft/${this.g.saveKey}`, JSON.stringify({ day: today, text })); } catch { /* fine */ }
  }

  render(body: HTMLElement): void {
    const st = this.g.st, today = dayKey(new Date());
    this.loadDraft(today);
    const kept = entryOn(st.diary, today), run = streak(st.diary, today), best = bestStreak(st.diary);

    // The lanterns: the last seven days, lit for each one written.
    const week = lastDays(st.diary, today, 7);
    body.append(h('div', { class: 'diary-lanterns', role: 'img', 'aria-label': `${week.filter((d) => d.written).length} of the last 7 days written` },
      ...week.map((d) => h('div', { class: `lantern${d.written ? ' lit' : ''}${d.date === today ? ' today' : ''}`, title: pretty(d.date), style: d.mood ? `--mood:${MOOD_BY_ID[d.mood].color}` : '' },
        h('span', { class: 'flame' }, d.written ? (d.mood ? MOOD_BY_ID[d.mood].icon : '🏮') : ''), h('small', {}, weekday(d.date))))),
      h('p', { class: 'diary-streak' }, run > 0
        ? `🔥 ${run} day${run > 1 ? 's' : ''} in a row${kept ? '' : ' — write today to keep it going'}${best > run ? ` · best ${best}` : ''}`
        : st.diary.length ? `Every page counts. Light today's lantern${best ? ` · best run ${best} days` : ''}.` : 'Your diary. A page a day — for the joys, the worries, everything in between.'));

    // Today's page.
    const prompt = promptFor(today, this.turn);
    const area = h('textarea', { class: 'diary-paper', rows: '8', maxlength: String(MAX_ENTRY), placeholder: `${prompt}\n\nWrite as much or as little as you like…`, 'aria-label': 'Today\'s page' }) as HTMLTextAreaElement;
    area.value = this.draft ?? '';
    const count = h('small', { class: 'dim' }, `${wordCount(area.value)} words`);
    area.addEventListener('input', () => { this.draft = area.value; count.textContent = `${wordCount(area.value)} words`; this.keepDraft(today, area.value); });
    const mood = this.mood ?? '';
    const moods = h('div', { class: 'diary-moods', role: 'radiogroup', 'aria-label': 'How do you feel?' },
      ...MOODS.map((m) => {
        const b = btn(`${m.icon} ${m.name}`, () => { this.mood = this.mood === m.id ? '' : m.id; this.draft = area.value; this.rerender(); }, `small mood${mood === m.id ? ' on' : ''}`);
        b.style.setProperty('--mood', m.color);
        b.setAttribute('role', 'radio');
        b.setAttribute('aria-checked', String(mood === m.id));
        return b;
      }));
    const keep = () => {
      const r = this.g.writeDiary(area.value, this.mood ?? '');
      this.draft = area.value;
      this.note = r.kept ? { reply: r.reply, gift: r.gift, memory: brightMemory(st.diary, today, this.mood ?? '') } : null;
      if (r.gift) this.g.toast(r.gift, 'reward');
      this.rerender();
    };
    body.append(h('section', { class: 'diary-today' },
      h('div', { class: 'diary-date' }, h('b', {}, pretty(today)), h('small', {}, greeting())),
      h('p', { class: 'diary-prompt' }, h('span', {}, `“${prompt}”`), btn('↻ another question', () => { this.turn++; this.draft = area.value; this.rerender(); }, 'small ghost')),
      h('small', { class: 'dim' }, 'How do you feel?'), moods,
      area,
      h('div', { class: 'acts' }, btn(kept ? '🖋️ Keep the changes' : '🖋️ Keep today\'s page', keep, 'primary'), count)));

    if (this.note) {
      body.append(h('p', { class: 'story' }, this.note.reply));
      if (this.note.memory) body.append(h('div', { class: 'diary-memory' }, h('small', {}, `A brighter page, from ${pretty(this.note.memory.date, false)}:`), h('blockquote', {}, this.note.memory.text.slice(0, 400))));
    }
    const back = onThisDay(st.diary, today);
    if (back && !this.note?.memory) body.append(h('div', { class: 'diary-memory' }, h('small', {}, `On this day, ${pretty(back.date, false)} ${back.mood ? MOOD_BY_ID[back.mood].icon : ''}`), h('blockquote', {}, back.text.slice(0, 400))));

    // The month in moods.
    const month = lastDays(st.diary, today, 30);
    if (st.diary.length) body.append(h('h3', {}, 'The last thirty days'), h('div', { class: 'diary-month' },
      ...month.map((d) => h('i', { title: `${pretty(d.date, false)}${d.mood ? ` · ${MOOD_BY_ID[d.mood].name}` : d.written ? '' : ' · no page'}`, class: d.written ? 'w' : '', style: d.mood ? `background:${MOOD_BY_ID[d.mood].color}` : '' }))));

    // Every page kept before.
    const past = st.diary.filter((e) => e.date !== today).reverse();
    if (past.length) {
      body.append(h('h3', {}, `Pages kept · ${st.diary.length}`));
      if (past.length > 5) {
        const search = h('input', { type: 'search', placeholder: 'Search your pages', 'aria-label': 'Search your pages', value: this.query }) as HTMLInputElement;
        search.addEventListener('input', () => { this.query = search.value; fill(); });
        body.append(search);
      }
      const list = h('div', { class: 'diary-pages' });
      const fill = () => {
        const q = this.query.trim().toLowerCase();
        list.replaceChildren(...past.filter((e) => !q || e.text.toLowerCase().includes(q)).slice(0, 120).map((e) => {
          const m = e.mood ? MOOD_BY_ID[e.mood] : null;
          return h('details', { class: 'diary-page', style: m ? `--mood:${m.color}` : '' },
            h('summary', {}, h('span', {}, m ? m.icon : '📄'), h('b', {}, pretty(e.date, false)), h('small', {}, e.text.split('\n')[0].slice(0, 60) || (m ? m.name : ''))),
            h('p', { class: 'diary-text' }, e.text),
            h('div', { class: 'acts' }, btn('Remove this page', () => { if (confirm(`Remove your page from ${pretty(e.date, false)}? It cannot be brought back.`)) { removeEntry(st.diary, e.date); this.g.save(); this.rerender(); } }, 'small ghost')));
        }));
      };
      fill();
      body.append(list);
    }
    body.append(h('p', { class: 'dim fine' }, `🔒 Your diary is kept with your journey on this device${this.g.player ? `, under ${this.g.player}` : ''} — and goes with it in a keepsake file. ${this.g.player ? '' : 'Sign in (👤) to keep it under your own name.'}`));
  }
}
