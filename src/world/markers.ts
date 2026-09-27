import * as THREE from 'three';

/**
 * Markers that let you spot things from far away (owner's request): a round badge with an icon
 * floating high above an institute or a person in need, the same size on screen however far off it
 * is, and drawn over everything so a building or a crowd never hides it. It hides when you are
 * right beside it, and bobs gently. The badge is a picture drawn on a canvas.
 */
const texCache = new Map<string, THREE.Texture>();

function badge(icon: string, ring: string): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const key = `${icon}|${ring}`;
  const hit = texCache.get(key);
  if (hit) return hit;
  const W = 128, H = 160, cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d')!;
  // A pin: a round badge with a point below, a white rim inside a coloured ring, and the icon.
  x.shadowColor = 'rgba(0,0,0,0.45)'; x.shadowBlur = 10;
  x.fillStyle = ring;
  x.beginPath(); x.arc(W / 2, 62, 54, Math.PI * 0.8, Math.PI * 0.2); x.lineTo(W / 2, H - 6); x.closePath(); x.fill();
  x.shadowBlur = 0;
  x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(W / 2, 62, 42, 0, Math.PI * 2); x.fill();
  x.font = '52px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(icon, W / 2, 64);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

/** A marker sprite with an icon on a ring of colour. */
export function markerSprite(icon: string, ring: string): THREE.Sprite {
  const map = badge(icon, ring);
  const m = new THREE.SpriteMaterial({ map, color: map ? '#ffffff' : ring, depthTest: false, depthWrite: false, sizeAttenuation: false, transparent: true });
  const s = new THREE.Sprite(m);
  s.center.set(0.5, 0);
  s.scale.set(0.036, 0.045, 1);
  s.renderOrder = 10;
  s.userData.part = 'accessory';
  return s;
}

/** Hide a marker close up (it is plain to see then) and far beyond the town; pulse it if `call`. */
export function tendMarker(s: THREE.Sprite, from: THREE.Vector3, t: number, call = false, near = 14, far = 700): void {
  const d = s.position.distanceTo(from);
  s.visible = d > near && d < far;
  const k = call ? 1 + Math.sin(t * 4) * 0.12 : 1;
  s.scale.set(0.036 * k, 0.045 * k, 1);
  (s.material as THREE.SpriteMaterial).opacity = Math.min(1, (d - near) / 10);
}
