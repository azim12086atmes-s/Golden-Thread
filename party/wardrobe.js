import * as THREE from 'three';
import { CharacterModel, HERO_SCALE } from '../src/characters/CharacterModel.js';
import { OUTFITS } from '../src/characters/outfits.js';
import { DRESS_GROUPS, dressGroup } from '../src/characters/wardrobe.js';

const PAGE_SIZE = 24;
const SKINS = { girl: '#e3b58f', boy: '#c99a74' };
let preview = null;
let previewObserver = null;

function node(tag, label, className) {
  const n = document.createElement(tag);
  if (label !== undefined) n.textContent = label;
  if (className) n.className = className;
  return n;
}

function button(label, onClick, className = 'subtle-button') {
  const b = node('button', label, className);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function releasePreview() {
  if (previewObserver) {
    previewObserver.disconnect();
    previewObserver = null;
  }
  if (!preview) return;
  cancelAnimationFrame(preview.frame);
  preview.renderer.dispose();
  preview.renderer.forceContextLoss();
  preview.model.root.traverse(object => {
    if (object.geometry) object.geometry.dispose();
  });
  preview.model.root.clear();
  preview.scene.clear();
  preview = null;
}

function ensurePreview(canvas, outfit, who, content, root) {
  if (canvas.dataset.previewUnavailable === 'true') return;
  if (!preview) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' });
    } catch {
      canvas.dataset.previewUnavailable = 'true';
      canvas.hidden = true;
      canvas.insertAdjacentElement('afterend', node('p', 'A rotating preview is unavailable here; the outfit swatches and details are still ready.', 'fine'));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const scene = new THREE.Scene();
    scene.background = null;
    scene.add(new THREE.HemisphereLight(0xffebcf, 0x403451, 2.1));
    const key = new THREE.DirectionalLight(0xffe6bd, 2.5);
    key.position.set(-3, 5, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xb4c5ff, 1.2);
    fill.position.set(4, 2, -3);
    scene.add(fill);
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
    camera.position.set(0, 1.52, 5.3);
    camera.lookAt(0, 1.3, 0);
    const model = new CharacterModel(outfit, SKINS[who], who === 'girl' ? HERO_SCALE.girl : HERO_SCALE.boy, 1, who);
    scene.add(model.root);
    preview = { renderer, scene, camera, model, frame: 0, last: 0, canvas, who };
  } else if (preview.canvas !== canvas) {
    canvas.replaceWith(preview.canvas);
  }
  if (preview.who !== who) {
    const next = new CharacterModel(outfit, SKINS[who], who === 'girl' ? HERO_SCALE.girl : HERO_SCALE.boy, 1, who);
    preview.scene.remove(preview.model.root);
    preview.model.root.traverse(object => { if (object.geometry) object.geometry.dispose(); });
    preview.model.root.clear();
    preview.model = next;
    preview.scene.add(next.root);
    preview.who = who;
  } else if (preview.model.outfit.id !== outfit.id) preview.model.setOutfit(outfit);

  const resize = () => {
    if (!preview || !preview.canvas.isConnected) return;
    const rect = preview.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    preview.renderer.setSize(width, height, false);
    preview.camera.aspect = width / height;
    preview.camera.updateProjectionMatrix();
  };
  resize();
  const render = now => {
    if (!preview || !preview.canvas.isConnected) return;
    const dt = Math.min(0.05, (now - preview.last) / 1000 || 0);
    preview.last = now;
    preview.model.root.rotation.y += dt * 0.35;
    preview.model.update(dt, { speed: 0, airborne: false, riding: false, t: now / 1000 });
    resize();
    preview.renderer.render(preview.scene, preview.camera);
    preview.frame = requestAnimationFrame(render);
  };
  if (!preview.frame) preview.frame = requestAnimationFrame(render);

  const dialog = content.closest('dialog');
  if (dialog && !dialog.dataset.wardrobeCloseBound) {
    dialog.dataset.wardrobeCloseBound = 'true';
    dialog.addEventListener('close', releasePreview);
  }
  if (previewObserver) previewObserver.disconnect();
  previewObserver = new MutationObserver(() => queueMicrotask(() => {
    if (!document.getElementById('party-wardrobe-root')) releasePreview();
  }));
  previewObserver.observe(content, { childList: true, subtree: true });
}

/** Dispose the single preview renderer when the panel is replaced or closed. */
export function closeWardrobePreview() { releasePreview(); }

/** Full dress registry with culture shelves, gender and text filters, and one live model preview. */
export function renderWardrobe({ state, action, toast, beginPanel, content }) {
  beginPanel('wardrobe', 'DRESS FOR A LITTLE WONDER', 'The dressing room.', 'Explore the full collection of carefully covered designs, from cultural dress to starlit fusions.');
  if (state.self.role === 'observer') {
    content.append(node('p', 'Your character follows the birthday guest automatically. This role observes and cannot change outfits.', 'privacy-note'));
    return;
  }

  const root = node('section');
  root.id = 'party-wardrobe-root';
  root.setAttribute('aria-label', 'Wardrobe collection');
  const current = OUTFITS[state.self.avatar];
  const initialWho = current?.who || (String(state.self.avatar).startsWith('b-') ? 'boy' : 'girl');
  let group = 'all', gender = 'all', query = '', page = 0;
  const controls = node('div');
  controls.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0';
  const groupLabel = node('label', 'Culture shelf', 'field');
  const groupSelect = node('select');
  for (const [id, label] of DRESS_GROUPS) {
    const option = node('option', label); option.value = id; groupSelect.append(option);
  }
  groupLabel.append(groupSelect);
  const genderLabel = node('label', 'Design', 'field');
  const genderSelect = node('select');
  for (const [id, label] of [['all', 'All designs'], ['girl', 'Girl designs'], ['boy', 'Boy designs']]) {
    const option = node('option', label); option.value = id; genderSelect.append(option);
  }
  genderLabel.append(genderSelect);
  controls.append(groupLabel, genderLabel);
  const search = node('label', 'Find an outfit', 'field');
  const searchInput = node('input');
  searchInput.type = 'search'; searchInput.placeholder = 'Name, culture, or colour'; searchInput.autocomplete = 'off';
  search.append(searchInput);
  root.append(controls, search);

  const previewCard = node('section');
  previewCard.style.cssText = 'display:grid;grid-template-columns:minmax(140px,38%) 1fr;gap:16px;align-items:center;padding:12px;border:1px solid #ffffff24;border-radius:10px;background:#ffffff08';
  const canvas = node('canvas'); canvas.setAttribute('aria-label', 'Rotating outfit preview');
  canvas.style.cssText = 'display:block;width:100%;height:210px;min-height:170px';
  const details = node('div');
  const previewName = node('h3'); previewName.style.marginBottom = '7px';
  const previewCulture = node('p'); previewCulture.style.marginBottom = '7px';
  const previewPalette = node('p', undefined, 'fine');
  let wearing = state.self.avatar;
  const wearButton = button('Wear this outfit', async () => {
    if (!previewCard.dataset.outfit) return;
    const outfit = OUTFITS[previewCard.dataset.outfit];
    try {
      await action({ type: 'outfit', avatar: outfit.id });
      wearing = outfit.id;
      wearButton.disabled = true;
      grid.querySelectorAll('[data-outfit-current]').forEach(item => item.remove());
      const selected = [...grid.querySelectorAll('button')].find(item => item.getAttribute('aria-label') === `${outfit.name}, ${outfit.culture}`);
      if (selected) {
        const mark = node('small', 'Currently worn'); mark.dataset.outfitCurrent = 'true'; selected.append(mark);
      }
      toast(`${outfit.name} selected.`);
    } catch (error) {
      toast(error.message || 'That outfit could not be selected.');
    }
  }, 'gold-button');
  details.append(previewName, previewCulture, previewPalette, wearButton);
  previewCard.append(canvas, details);
  root.append(previewCard);

  const count = node('p', undefined, 'fine'); count.setAttribute('aria-live', 'polite');
  const grid = node('div', undefined, 'card-grid');
  const paging = node('div', undefined, 'button-row');
  const previous = button('Previous', () => { page = Math.max(0, page - 1); draw(); });
  const pageLabel = node('span', undefined, 'fine'); pageLabel.style.cssText = 'align-self:center;padding:0 8px';
  const next = button('Next', () => { page++; draw(); });
  paging.append(previous, pageLabel, next);
  root.append(count, grid, paging);
  content.append(root);

  const eligible = Object.values(OUTFITS).filter(o => o && o.id && o.name && o.who && o.topColor && o.culture);
  function draw() {
    const filtered = eligible.filter(o => (group === 'all' || dressGroup(o) === group)
      && (gender === 'all' || o.who === gender)
      && (!query || `${o.name} ${o.culture} ${o.id} ${o.topColor} ${o.lowerColor}`.toLowerCase().includes(query))
    ).sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
    const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    page = Math.min(page, pages - 1);
    const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
    count.textContent = `${filtered.length} outfits · ${visible.length ? page * PAGE_SIZE + 1 : 0}–${page * PAGE_SIZE + visible.length} shown`;
    pageLabel.textContent = `Page ${page + 1} of ${pages}`;
    previous.disabled = page === 0;
    next.disabled = page + 1 >= pages;
    grid.replaceChildren();
    for (const outfit of visible) {
      const b = button('', () => select(outfit), 'destination');
      b.setAttribute('aria-label', `${outfit.name}, ${outfit.culture}`);
      const swatch = node('span', '● '); swatch.style.color = outfit.topColor;
      b.append(swatch, node('strong', outfit.name), node('small', `${outfit.culture} · ${outfit.who === 'girl' ? 'Girl' : 'Boy'} design`));
      if (outfit.id === wearing) { const mark = node('small', 'Currently worn'); mark.dataset.outfitCurrent = 'true'; b.append(mark); }
      grid.append(b);
    }
    const selected = visible.find(o => o.id === previewCard.dataset.outfit)
      || filtered.find(o => o.id === state.self.avatar) || filtered[0] || eligible[0];
    if (selected) select(selected, false);
  }
  function select(outfit, updatePage = false) {
    if (!outfit) return;
    previewCard.dataset.outfit = outfit.id;
    previewName.textContent = outfit.name;
    previewCulture.textContent = `${outfit.culture} · ${outfit.who === 'girl' ? 'Girl' : 'Boy'} design`;
    previewPalette.textContent = `Palette: ${outfit.topColor} · ${outfit.trim} · ${outfit.lowerColor}`;
    wearButton.disabled = wearing === outfit.id;
    if (updatePage) {
      const i = eligible.indexOf(outfit);
      if (i >= 0) page = Math.floor(i / PAGE_SIZE);
    }
    ensurePreview(canvas, outfit, outfit.who, content, root);
  }
  groupSelect.addEventListener('change', () => { group = groupSelect.value; page = 0; draw(); });
  genderSelect.addEventListener('change', () => { gender = genderSelect.value; page = 0; draw(); });
  searchInput.addEventListener('input', () => { query = searchInput.value.trim().toLocaleLowerCase(); page = 0; draw(); });
  draw();
}

export default renderWardrobe;
