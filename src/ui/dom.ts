/** The UI's two little DOM helpers: an element with attributes and children, and a button. */
export const h = (tag: string, attrs: Record<string, string> = {}, ...kids: Array<Node | string | null | false>): HTMLElement => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else el.setAttribute(k, v);
  }
  for (const k of kids) if (k !== null && k !== false) el.append(k);
  return el;
};

export const btn = (label: string, on: () => void, cls = '', disabled = false): HTMLButtonElement => {
  const b = h('button', { class: `btn ${cls}`, type: 'button' }, label) as HTMLButtonElement;
  b.disabled = disabled;
  b.addEventListener('click', (e) => { e.stopPropagation(); on(); });
  return b;
};
