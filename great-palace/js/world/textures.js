// All textures are painted at load time on small canvases: nothing to download,
// tiny GPU memory, and the hand-drawn look suits the painterly style.
import * as THREE from 'three';

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, repeat = false) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  t.anisotropy = 2;
  return t;
}

// Seeded random so every player paints identical textures and layouts.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const cache = {};
function once(key, fn) { return cache[key] || (cache[key] = fn()); }

// Soft round glow used by every particle and halo.
export const glowTexture = () => once('glow', () => {
  const [c, g] = canvas(64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return tex(c);
});

// Four-pointed sparkle for stardust and collectibles.
export const sparkleTexture = () => once('sparkle', () => {
  const [c, g] = canvas(64);
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 14);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,255,255,0.9)';
  for (const r of [0, Math.PI / 2]) {
    g.save(); g.translate(32, 32); g.rotate(r);
    g.beginPath(); g.moveTo(-32, 0); g.quadraticCurveTo(0, 2.5, 32, 0); g.quadraticCurveTo(0, -2.5, -32, 0); g.fill();
    g.restore();
  }
  return tex(c);
});

// Islamic eight-pointed-star lattice in jewel tones with dark "lead" lines:
// the stained glass for every window in the castle.
export const stainedGlassTexture = (variant = 0) => once('glass' + variant, () => {
  const S = 256;
  const [c, g] = canvas(S);
  const palettes = [
    // pink-led palettes (the owner asked for pink stained glass)
    ['#8a1f5c', '#d23c78', '#ffc94a', '#ff8cc6', '#f2d0ff', '#b02a6e'],
    ['#6e1a6a', '#e04b8a', '#ffd36b', '#ff9fd0', '#9b5cff', '#c23a84'],
    ['#9a2d6a', '#ff6fb6', '#f2c14e', '#ffc2e0', '#6f3ad6', '#d8548f'],
  ][variant % 3];
  const r = rng(11 + variant);
  g.fillStyle = palettes[0]; g.fillRect(0, 0, S, S);
  const cell = S / 4;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const cx = x * cell + cell / 2, cy = y * cell + cell / 2;
    // background diamonds
    g.fillStyle = palettes[(x + y) % 2 ? 1 : 5];
    g.beginPath(); g.moveTo(cx, cy - cell / 2); g.lineTo(cx + cell / 2, cy); g.lineTo(cx, cy + cell / 2); g.lineTo(cx - cell / 2, cy); g.closePath(); g.fill();
    // eight-pointed star = two overlapping squares
    const s = cell * 0.36;
    g.fillStyle = palettes[2 + Math.floor(r() * 2)];
    for (const rot of [0, Math.PI / 4]) {
      g.save(); g.translate(cx, cy); g.rotate(rot); g.fillRect(-s, -s, s * 2, s * 2); g.restore();
    }
    g.fillStyle = palettes[4];
    g.beginPath(); g.arc(cx, cy, s * 0.55, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath(); g.arc(cx, cy, s * 0.18, 0, Math.PI * 2); g.fill();
  }
  // lead lines
  g.strokeStyle = 'rgba(10,8,25,0.9)'; g.lineWidth = 3;
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const cx = x * cell + cell / 2, cy = y * cell + cell / 2, s = cell * 0.36;
    for (const rot of [0, Math.PI / 4]) {
      g.save(); g.translate(cx, cy); g.rotate(rot); g.strokeRect(-s, -s, s * 2, s * 2); g.restore();
    }
    g.beginPath(); g.arc(cx, cy, s * 0.55, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(cx, cy - cell / 2); g.lineTo(cx + cell / 2, cy); g.lineTo(cx, cy + cell / 2); g.lineTo(cx - cell / 2, cy); g.closePath(); g.stroke();
  }
  // gentle light falloff so panes glow from the centre
  const grd = g.createRadialGradient(S / 2, S / 2, S * 0.1, S / 2, S / 2, S * 0.75);
  grd.addColorStop(0, 'rgba(255,255,255,0.18)');
  grd.addColorStop(1, 'rgba(0,0,20,0.35)');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  return tex(c);
});

// Rose window: radial twelve-fold rosette.
export const roseWindowTexture = () => once('rose', () => {
  const S = 512;
  const [c, g] = canvas(S);
  g.translate(S / 2, S / 2);
  const ring = (rad, n, colA, colB, petal) => {
    for (let i = 0; i < n; i++) {
      g.save(); g.rotate((i / n) * Math.PI * 2);
      g.fillStyle = i % 2 ? colA : colB;
      g.beginPath(); g.moveTo(0, 0);
      g.quadraticCurveTo(petal, -rad * 0.5, 0, -rad);
      g.quadraticCurveTo(-petal, -rad * 0.5, 0, 0);
      g.fill();
      g.strokeStyle = 'rgba(12,8,30,0.9)'; g.lineWidth = 3; g.stroke();
      g.restore();
    }
  };
  g.fillStyle = '#140c33'; g.beginPath(); g.arc(0, 0, S / 2, 0, Math.PI * 2); g.fill();
  ring(250, 24, '#3a4fd8', '#7b2fd0', 40);
  ring(200, 12, '#e5577a', '#ffc94a', 60);
  ring(130, 8, '#2bc4c4', '#1f9dff', 50);
  g.fillStyle = '#ffd86b'; g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(12,8,30,0.9)'; g.lineWidth = 6;
  for (const r of [40, 130, 200, 250]) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); }
  return tex(c);
});

// Painterly stone: soft mottled lavender-white with faint geometric engraving.
export const stoneTexture = () => once('stone', () => {
  const S = 256;
  const [c, g] = canvas(S);
  const r = rng(3);
  g.fillStyle = '#f5f2f9'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 260; i++) {
    const x = r() * S, y = r() * S, rad = 6 + r() * 30;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    const tone = r() < 0.5 ? '215,208,235' : '255,250,255';
    grd.addColorStop(0, `rgba(${tone},0.25)`); grd.addColorStop(1, `rgba(${tone},0)`);
    g.fillStyle = grd; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // brick courses
  g.strokeStyle = 'rgba(120,105,170,0.25)'; g.lineWidth = 1.5;
  for (let y = 0; y < S; y += 32) {
    g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke();
    for (let x = (y / 32) % 2 ? 0 : 32; x < S; x += 64) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 32); g.stroke(); }
  }
  return tex(c, true);
});

// Glass cobblestone for the plaza: rounded cells with gem highlights.
export const cobbleTexture = () => once('cobble', () => {
  const S = 256;
  const [c, g] = canvas(S);
  const r = rng(5);
  g.fillStyle = '#1b2448'; g.fillRect(0, 0, S, S);
  const cols = ['#2c4a8a', '#3c3a8f', '#245e7a', '#4a3a92', '#2d6a8c'];
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const cx = x * 32 + 16 + (y % 2) * 16 + (r() - 0.5) * 4, cy = y * 32 + 16 + (r() - 0.5) * 4;
    for (const dx of [-S, 0, S]) {
      const grd = g.createRadialGradient(cx + dx - 5, cy - 5, 1, cx + dx, cy, 15);
      grd.addColorStop(0, '#9fd8ff'); grd.addColorStop(0.35, cols[Math.floor(r() * cols.length)]); grd.addColorStop(1, '#141a38');
      g.fillStyle = grd; g.beginPath(); g.ellipse(cx + dx, cy, 14, 13, 0, 0, Math.PI * 2); g.fill();
    }
  }
  return tex(c, true);
});

// Grass meadow: a pale, low-contrast stroke pattern. The colour itself comes
// from the terrain's vertex colours, so this only adds a painted grain.
export const grassTexture = () => once('grass', () => {
  const S = 256;
  const [c, g] = canvas(S);
  const r = rng(9);
  g.fillStyle = '#e8f0e0'; g.fillRect(0, 0, S, S);
  const tones = ['#ffffff', '#d2e2c8', '#f4fbe8', '#c4d6c4', '#fafff0'];
  for (let i = 0; i < 1100; i++) {
    g.strokeStyle = tones[Math.floor(r() * tones.length)];
    g.globalAlpha = 0.4; g.lineWidth = 2 + r() * 3;
    const x = r() * S, y = r() * S, a = -Math.PI / 2 + (r() - 0.5) * 0.8, l = 6 + r() * 10;
    for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) {
      g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx + Math.cos(a) * l, y + dy + Math.sin(a) * l); g.stroke();
    }
  }
  g.globalAlpha = 1;
  return tex(c, true);
});

// Leaf clump card (reference T1 / C08 foliage atlas): a rounded cluster of
// painted leaves on transparent ground, lighter towards the top. Dozens of
// these on a sphere make a canopy read as real foliage, not a blob.
export const leafClumpTexture = () => once('leafClump', () => {
  const S = 256;
  const [c, g] = canvas(S);
  const r = rng(77);
  for (let i = 0; i < 150; i++) {
    const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 92;
    const x = S / 2 + Math.cos(a) * d, y = S / 2 + Math.sin(a) * d * 0.9;
    const l = 15 + r() * 13, ang = Math.atan2(y - S / 2, x - S / 2) + (r() - 0.5) * 1.2;
    const v = Math.round(130 + (1 - y / S) * 95 + (r() - 0.5) * 40);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.save(); g.translate(x, y); g.rotate(ang);
    g.beginPath(); g.moveTo(-l, 0); g.quadraticCurveTo(0, -l * 0.55, l, 0); g.quadraticCurveTo(0, l * 0.55, -l, 0); g.fill();
    g.strokeStyle = `rgba(255,255,255,0.25)`; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(-l * 0.8, 0); g.lineTo(l * 0.8, 0); g.stroke();
    g.restore();
  }
  const t = tex(c);
  t.generateMipmaps = true;
  return t;
});

// A little five-petal flower with a golden heart, white so instances tint it.
export const flowerTexture = () => once('flower', () => {
  const S = 64;
  const [c, g] = canvas(S);
  g.translate(S / 2, S / 2);
  for (let i = 0; i < 5; i++) {
    g.rotate((Math.PI * 2) / 5);
    const grd = g.createLinearGradient(0, 0, 0, -28);
    grd.addColorStop(0, '#dddddd'); grd.addColorStop(1, '#ffffff');
    g.fillStyle = grd;
    g.beginPath(); g.ellipse(0, -15, 9, 14, 0, 0, Math.PI * 2); g.fill();
  }
  g.fillStyle = '#ffd36b'; g.beginPath(); g.arc(0, 0, 6, 0, Math.PI * 2); g.fill();
  return tex(c);
});

// Warm pale flagstones for the plaza, laid in rings like a real piazza.
export const flagstoneTexture = () => once('flagstone', () => {
  const S = 512;
  const [c, g] = canvas(S);
  const r = rng(15);
  g.fillStyle = '#9d8f96'; g.fillRect(0, 0, S, S);
  const tones = ['#f2e8da', '#e9dccb', '#f7efe2', '#e3d3c6', '#efe2d8', '#ddd2c8'];
  let y = 0;
  while (y < S) {
    const hgt = 40 + Math.floor(r() * 3) * 12;
    let x = -r() * 60;
    while (x < S) {
      const w = 50 + r() * 70;
      g.fillStyle = tones[Math.floor(r() * tones.length)];
      g.beginPath(); g.roundRect(x + 2, y + 2, w - 4, Math.min(hgt, S - y) - 4, 6); g.fill();
      const grd = g.createLinearGradient(0, y, 0, y + hgt);
      grd.addColorStop(0, 'rgba(255,255,255,0.18)'); grd.addColorStop(1, 'rgba(120,100,110,0.12)');
      g.fillStyle = grd; g.fill();
      x += w;
    }
    y += hgt;
  }
  return tex(c, true);
});

// Eight-fold star rosette (Islamic geometric inlay) for the plaza centre.
export const rosetteTexture = () => once('rosette', () => {
  const S = 1024;
  const [c, g] = canvas(S);
  g.translate(S / 2, S / 2);
  const star = (R, rIn, n = 8, rot = 0) => {
    g.beginPath();
    for (let i = 0; i < n * 2; i++) {
      const a = rot + (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? rIn : R;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
  };
  g.fillStyle = '#2f6f86'; g.beginPath(); g.arc(0, 0, 500, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#f2e8da'; g.beginPath(); g.arc(0, 0, 470, 0, Math.PI * 2); g.fill();
  // ring of small stars
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    g.save(); g.translate(Math.cos(a) * 400, Math.sin(a) * 400);
    g.fillStyle = i % 2 ? '#3b8fa3' : '#c9a24a'; star(52, 26, 8, a); g.fill();
    g.restore();
  }
  g.lineWidth = 10; g.strokeStyle = '#c9a24a';
  g.beginPath(); g.arc(0, 0, 330, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#2f6f86'; star(320, 200, 8, Math.PI / 8); g.fill();
  g.fillStyle = '#3b8fa3'; star(300, 210, 8, 0); g.fill();
  g.strokeStyle = '#e8c76a'; g.lineWidth = 8; star(300, 210, 8, 0); g.stroke();
  g.fillStyle = '#f2e8da'; star(205, 120, 8, Math.PI / 8); g.fill();
  g.fillStyle = '#c96f8a'; star(150, 100, 8, 0); g.fill();
  g.strokeStyle = '#e8c76a'; g.lineWidth = 6; star(150, 100, 8, 0); g.stroke();
  return tex(c);
});

// Rocky cliff underside of floating islands.
export const rockTexture = () => once('rock', () => {
  const S = 256;
  const [c, g] = canvas(S);
  const r = rng(21);
  const grd = g.createLinearGradient(0, 0, 0, S);
  grd.addColorStop(0, '#6a5a8a'); grd.addColorStop(1, '#2a2350');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 140; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '150,130,200' : '30,25,60'},0.25)`;
    const x = r() * S, y = r() * S;
    g.fillRect(x, y, 4 + r() * 30, 2 + r() * 8);
  }
  // glowing crystal veins
  g.strokeStyle = 'rgba(120,220,255,0.6)'; g.lineWidth = 2;
  for (let i = 0; i < 6; i++) {
    let x = r() * S, y = 0; g.beginPath(); g.moveTo(x, y);
    while (y < S) { x += (r() - 0.5) * 30; y += 10 + r() * 20; g.lineTo(x, y); }
    g.stroke();
  }
  return tex(c, true);
});

// Painterly cloud puff for cloud billboards.
export const cloudTexture = () => once('cloud', () => {
  const S = 256;
  const [c, g] = canvas(S);
  const r = rng(17);
  for (let i = 0; i < 26; i++) {
    const x = 50 + r() * 156, y = 90 + r() * 90 - Math.abs(x - 128) * 0.25, rad = 26 + r() * 40;
    const grd = g.createRadialGradient(x, y - rad * 0.3, rad * 0.1, x, y, rad);
    grd.addColorStop(0, 'rgba(255,255,255,0.95)');
    grd.addColorStop(0.6, 'rgba(225,220,255,0.6)');
    grd.addColorStop(1, 'rgba(200,190,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  }
  return tex(c);
});

// Text on a transparent canvas, for name tags and banners.
export function textTexture(text, { font = '600 48px Georgia, serif', color = '#fff', glow = '#9fd8ff', pad = 24 } = {}) {
  const [m, mg] = canvas(8);
  mg.font = font;
  const w = Math.ceil(mg.measureText(text).width) + pad * 2;
  const h = parseInt(font.match(/(\d+)px/)[1], 10) * 1.6;
  const [c, g] = canvas(w, h);
  g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = glow; g.shadowBlur = 16;
  g.fillStyle = color; g.fillText(text, w / 2, h / 2);
  g.shadowBlur = 0; g.fillText(text, w / 2, h / 2);
  const t = tex(c);
  t.userData = { aspect: w / h };
  return t;
}

// Repeating band of interlaced eight-pointed stars in gold, on transparency:
// wrapped around towers and arches as glowing Islamic-geometric friezes.
export const friezeTexture = () => once('frieze', () => {
  const [c, g] = canvas(256, 64);
  g.strokeStyle = 'rgba(255,214,120,1)'; g.lineWidth = 3;
  g.shadowColor = 'rgba(255,200,90,1)'; g.shadowBlur = 6;
  for (let i = 0; i < 4; i++) {
    const cx = i * 64 + 32, cy = 32, s = 17;
    for (const rot of [0, Math.PI / 4]) {
      g.save(); g.translate(cx, cy); g.rotate(rot); g.strokeRect(-s, -s, s * 2, s * 2); g.restore();
    }
    g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(cx + 24, cy); g.lineTo(cx + 40, cy); g.stroke();
  }
  g.beginPath(); g.moveTo(0, 3); g.lineTo(256, 3); g.moveTo(0, 61); g.lineTo(256, 61); g.stroke();
  return tex(c, true);
});

// Glowing vine/swirl pattern for tree trunks.
export const trunkTexture = () => once('trunk', () => {
  const [c, g] = canvas(128, 256);
  g.fillStyle = '#3b2a4f'; g.fillRect(0, 0, 128, 256);
  g.strokeStyle = 'rgba(70,50,90,1)'; g.lineWidth = 4;
  for (let x = 0; x < 128; x += 14) { g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 8, 80, x - 8, 170, x + 4, 256); g.stroke(); }
  g.strokeStyle = '#7ff3ff'; g.lineWidth = 2.5; g.shadowColor = '#7ff3ff'; g.shadowBlur = 8;
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    for (let y = 0; y <= 256; y += 4) {
      const x = 64 + Math.sin(y * 0.05 + i * 2.1) * 40 + (i - 1) * 10;
      y ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
  }
  for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(20 + (i * 37) % 100, 20 + i * 24, 3, 0, Math.PI * 2); g.fillStyle = '#c9a6ff'; g.fill(); }
  return tex(c, true);
});

// Painted foliage: overlapping leaf-shaped brush dabs, lighter towards the top,
// tinted per tree by instance colour. Ghibli-style canopies instead of flat blobs.
export const leafTexture = () => once('leaf', () => {
  const S = 256;
  const [c, g] = canvas(S);
  const r = rng(61);
  const grd = g.createLinearGradient(0, 0, 0, S);
  grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#9a9ab0');
  g.fillStyle = grd; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 700; i++) {
    const x = r() * S, y = r() * S, l = 6 + r() * 12, a = r() * Math.PI;
    const v = Math.round(150 + (1 - y / S) * 80 + (r() - 0.5) * 60);
    g.fillStyle = `rgba(${v},${v},${Math.min(255, v + 20)},0.55)`;
    g.save(); g.translate(x, y); g.rotate(a);
    g.beginPath(); g.ellipse(0, 0, l, l * 0.38, 0, 0, Math.PI * 2); g.fill();
    g.restore();
  }
  return tex(c, true);
});

// Turret crown (reference U129, technique T51): a band of pale stone pierced by
// pointed arches that glow pink from inside, like lanterns at the top of every tower.
export const crownTexture = () => once('crown', () => {
  const W = 512, H = 128;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#ddd3ea'; g.fillRect(0, 0, W, H);
  const n = 6, cw = W / n;
  for (let i = 0; i < n; i++) {
    const x = i * cw + cw / 2, w = cw * 0.5, top = 16, bottom = H - 14;
    const grd = g.createLinearGradient(0, top, 0, bottom);
    grd.addColorStop(0, '#ffe2f2'); grd.addColorStop(0.5, '#ff9fd0'); grd.addColorStop(1, '#ff6fb6');
    g.fillStyle = grd;
    g.beginPath();
    g.moveTo(x - w / 2, bottom); g.lineTo(x - w / 2, top + w * 0.6);
    g.quadraticCurveTo(x - w / 2, top, x, top - 6); g.quadraticCurveTo(x + w / 2, top, x + w / 2, top + w * 0.6);
    g.lineTo(x + w / 2, bottom); g.closePath(); g.fill();
    g.strokeStyle = '#e8c76a'; g.lineWidth = 3; g.stroke();
  }
  g.fillStyle = '#e8c76a'; g.fillRect(0, 0, W, 5); g.fillRect(0, H - 5, W, 5);
  const t = tex(c, true);
  return t;
});

// Blind arcade for terrace and bridge faces: pale marble with recessed pointed
// arches, a gold string course and a small pink lamp in every bay.
export const arcadeTexture = () => once('arcade', () => {
  const W = 256, H = 256;
  const [c, g] = canvas(W, H);
  g.fillStyle = '#f4e4ec'; g.fillRect(0, 0, W, H);
  const r = rng(23);
  for (let i = 0; i < 120; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '220,190,210' : '255,250,252'},0.25)`;
    g.fillRect(r() * W, r() * H, 10 + r() * 40, 4 + r() * 10);
  }
  g.fillStyle = '#d9b6c9';
  g.beginPath(); g.moveTo(48, H - 20); g.lineTo(48, 110); g.quadraticCurveTo(48, 50, 128, 36); g.quadraticCurveTo(208, 50, 208, 110); g.lineTo(208, H - 20); g.closePath(); g.fill();
  g.fillStyle = '#c99ab4';
  g.beginPath(); g.moveTo(64, H - 20); g.lineTo(64, 116); g.quadraticCurveTo(64, 66, 128, 54); g.quadraticCurveTo(192, 66, 192, 116); g.lineTo(192, H - 20); g.closePath(); g.fill();
  g.strokeStyle = '#e8c76a'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(48, H - 20); g.lineTo(48, 110); g.quadraticCurveTo(48, 50, 128, 36); g.quadraticCurveTo(208, 50, 208, 110); g.lineTo(208, H - 20); g.stroke();
  g.fillStyle = '#e8c76a'; g.fillRect(0, 8, W, 8); g.fillRect(0, H - 14, W, 6);
  // eight-point star in each spandrel
  for (const x of [0, W]) {
    g.save(); g.translate(x, 60); g.fillStyle = '#c23a84';
    for (const rot of [0, Math.PI / 4]) { g.save(); g.rotate(rot); g.fillRect(-12, -12, 24, 24); g.restore(); }
    g.restore();
  }
  return tex(c, true);
});
