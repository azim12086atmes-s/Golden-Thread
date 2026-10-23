import * as THREE from 'three';

const GOLD = '#f5c451', WEDGE = Math.PI / 4;
const PALETTE = Object.freeze({ sponge: '#5a3322', cream: '#f3e2cf', icing: '#4a2718', top: '#3b1f14', rose: '#e0344f', bead: '#f5c451' });

function sector(r, h, start, len, outside, palette, material) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 40, 1, false, start, len), material(outside));
  shell.castShadow = true; g.add(shell);
  for (const a of [start, start + len]) {
    const face = new THREE.Group();
    const sponge = new THREE.Mesh(new THREE.PlaneGeometry(r, h), material(palette.sponge));
    sponge.position.x = r / 2;
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.98, h * 0.14), material(palette.cream));
    stripe.position.set(r / 2, 0, 0.001);
    const backStripe = stripe.clone(); backStripe.position.z = -0.001;
    face.add(sponge, stripe, backStripe); face.rotation.y = a - Math.PI / 2; g.add(face);
  }
  return g;
}

function cakeGeometry(material) {
  const cake = new THREE.Group(), r1 = 0.27, h1 = 0.17, r2 = 0.18, h2 = 0.14;
  const rest = sector(r1, h1, WEDGE, Math.PI * 2 - WEDGE, PALETTE.icing, PALETTE, material);
  rest.position.y = h1 / 2; cake.add(rest);
  const slice = sector(r1, h1, 0, WEDGE, PALETTE.icing, PALETTE, material);
  const roseOnSlice = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), material(PALETTE.rose));
  roseOnSlice.position.set(Math.sin(WEDGE / 2) * r1 * 0.7, h1 / 2 + 0.02, Math.cos(WEDGE / 2) * r1 * 0.7);
  slice.add(roseOnSlice); slice.position.y = h1 / 2; cake.add(slice);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(r2, r2, h2, 36), material(PALETTE.top));
  upper.position.y = h1 + h2 / 2; cake.add(upper);
  cake.add(new THREE.Mesh(new THREE.TorusGeometry(r2 + 0.004, 0.012, 6, 40).rotateX(Math.PI / 2).translate(0, h1 + 0.03, 0), material(GOLD, true)));
  for (let i = 0; i < 14; i++) {
    const a = i / 14 * Math.PI * 2, bead = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 5), material(PALETTE.bead));
    bead.position.set(Math.sin(a) * r2, h1 + h2, Math.cos(a) * r2); cake.add(bead);
    if (i % 2) continue;
    const rose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 7, 5), material(i % 4 ? PALETTE.rose : '#ffffff'));
    rose.position.set(Math.sin(a + 0.2) * (r1 - 0.02), h1 + 0.01, Math.cos(a + 0.2) * (r1 - 0.02));
    if (a > WEDGE) cake.add(rose);
  }
  const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.045), material(GOLD, true));
  star.position.y = h1 + h2 + 0.09; star.name = 'star'; star.userData.y = star.position.y; cake.add(star);
  cake.scale.setScalar(12); cake.position.y = 0.35;
  return { cake, slice, h1, h2 };
}

function bannerFor(group, position) {
  const g = new THREE.Group(); g.position.set(position.x - 12, position.y, position.z - 14);
  const poleMaterial = new THREE.MeshStandardMaterial({ color: '#d9ad5a', metalness: 0.4, roughness: 0.4 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 8, 8), poleMaterial); pole.position.y = 4;
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 256;
  const context = canvas.getContext('2d'), texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.4), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true }));
  flag.position.set(4.1, 6.1, 0); g.add(pole, flag); group.add(g);
  function paint(name = '') {
    context.clearRect(0, 0, canvas.width, canvas.height);
    const grad = context.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, '#8c4c90'); grad.addColorStop(0.5, '#d985a8'); grad.addColorStop(1, '#8c4c90');
    context.fillStyle = grad; context.beginPath(); context.roundRect(12, 10, 1000, 236, 34); context.fill();
    context.strokeStyle = '#f9d785'; context.lineWidth = 8; context.stroke();
    context.fillStyle = '#fff5df'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.font = 'bold 84px Georgia, serif';
    context.fillText(name ? `Happy Birthday, ${name}!` : 'Happy Birthday!', 512, 128, 930); texture.needsUpdate = true;
  }
  paint();
  return { group: g, flag, texture, paint };
}

export function makeBirthdayDecor(scene, cakePosition) {
  const group = new THREE.Group(); group.name = 'birthday-decor'; scene.add(group);
  const position = new THREE.Vector3(cakePosition.x, cakePosition.y, cakePosition.z), materials = new Map(), lanterns = [];
  function material(color, glow = false) {
    const key = `${color}:${glow}`;
    if (!materials.has(key)) materials.set(key, glow
      ? new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(1.8), toneMapped: false })
      : new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true, side: THREE.DoubleSide }));
    return materials.get(key);
  }
  const gold = new THREE.MeshStandardMaterial({ color: '#f7d77d', emissive: '#9b6a20', emissiveIntensity: 0.25 }); materials.set('birthday-gold', gold);
  const cake = new THREE.Group(); cake.position.copy(position);
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(5.1, 5.25, 0.3, 48), gold); plate.position.y = 0.15; plate.receiveShadow = true; cake.add(plate);
  const authored = cakeGeometry(material); cake.add(authored.cake);
  const flameMaterial = new THREE.MeshBasicMaterial({ color: '#ffd16b', toneMapped: false }); materials.set('birthday-flame', flameMaterial);
  const candles = [];
  for (let i = 0; i < 7; i++) {
    const a = i * Math.PI * 2 / 7;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 1.15, 5), gold);
    candle.position.set(Math.cos(a) * 1.65, 4.64, Math.sin(a) * 1.65); cake.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.2, 7, 5), flameMaterial);
    flame.position.set(candle.position.x, 5.34, candle.position.z); cake.add(flame); candles.push(flame);
  }
  group.add(cake);
  const banner = bannerFor(group, position);
  const fireworkCount = 100, positions = new Float32Array(fireworkCount * 3), colors = new Float32Array(fireworkCount * 3);
  const fireworksGeometry = new THREE.BufferGeometry();
  fireworksGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  fireworksGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const fireworks = new THREE.Points(fireworksGeometry, new THREE.PointsMaterial({ size: 1.25, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  fireworks.frustumCulled = false; group.add(fireworks);
  const sliceHome = authored.slice.position.clone();
  let cut = 0, party = 0, time = 0, burst = 0, fireworkClock = 0, disposed = false;
  const h1 = authored.h1, fireworkColor = new THREE.Color();

  function setSlice(progress) {
    cut = THREE.MathUtils.clamp(Number(progress) || 0, 0, 1);
    const k = cut;
    // Slice lives inside the 12x display scale; preserve the original 12 cm world-space travel.
    authored.slice.position.set(sliceHome.x + Math.sin(WEDGE / 2) * 0.01 * k, sliceHome.y + Math.sin(k * Math.PI) * 0.00625, sliceHome.z + Math.cos(WEDGE / 2) * 0.01 * k);
  }
  function updateFestival(festival = {}, dt = 0, t = time) {
    candles.forEach(flame => { flame.visible = !festival.candlesBlown; });
    const target = festival.cakeCut ? 1 : 0;
    setSlice(cut + (target - cut) * Math.min(1, dt * 2.2));
    fireworks.visible = Boolean(festival.fireworksReady);
  }
  function releaseLantern(x = position.x, z = position.z, label = '') {
    const g = new THREE.Group();
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.34, 0.9, 8), new THREE.MeshBasicMaterial({ color: '#ffc46b', toneMapped: false })); shell.position.y = 0.45;
    const light = new THREE.PointLight('#ffbd67', 1.2, 8); light.position.y = 0.5; g.add(shell, light);
    g.position.set(x, position.y + 0.4, z); g.userData.text = String(label).slice(0, 60); group.add(g);
    lanterns.push({ group: g, age: 0, startY: g.position.y }); return g;
  }
  function update(t, dt, celebrating = false) {
    if (disposed) return;
    time = t; party += ((celebrating ? 1 : 0) - party) * Math.min(1, dt * 1.5);
    const star = authored.cake.getObjectByName('star');
    if (star) { star.rotation.y = t * 0.7; star.position.y = star.userData.y + Math.sin(t * 1.8) * 0.012; }
    banner.flag.rotation.y = Math.sin(t * 1.4) * 0.035;
    fireworkClock += dt;
    if (party > 0.3 && fireworkClock > 2.4) { fireworkClock = 0; burst = 1; }
    burst = Math.max(0, burst - dt * 0.55);
    fireworks.material.opacity = party * 0.7;
    fireworks.visible = party > 0.02;
    for (let i = 0; i < fireworkCount; i++) {
      const a = i * 2.399963, r = (i % 11) * 0.55 + (1 - burst) * 14;
      positions[i * 3] = position.x + Math.cos(a) * r;
      positions[i * 3 + 1] = position.y + 55 + Math.sin(a * 2.1) * r + (1 - burst) * 7;
      positions[i * 3 + 2] = position.z + Math.sin(a) * r;
      fireworkColor.setHSL((i / fireworkCount + t * 0.025) % 1, 0.9, 0.68);
      colors[i * 3] = fireworkColor.r; colors[i * 3 + 1] = fireworkColor.g; colors[i * 3 + 2] = fireworkColor.b;
    }
    fireworksGeometry.attributes.position.needsUpdate = true; fireworksGeometry.attributes.color.needsUpdate = true;
    for (let i = lanterns.length - 1; i >= 0; i--) {
      const lantern = lanterns[i]; lantern.age += dt;
      lantern.group.position.y = lantern.startY + lantern.age * 1.7;
      lantern.group.position.x += Math.sin(t * 0.7 + i) * dt * 0.16;
      if (lantern.age > 42) { group.remove(lantern.group); lanterns.splice(i, 1); }
    }
  }
  function setCelebrationName(name = '') { banner.paint(String(name).trim().slice(0, 36)); }
  function dispose() {
    if (disposed) return; disposed = true; scene.remove(group);
    const geometries = new Set(), textures = new Set();
    group.traverse(o => {
      if (o.geometry) geometries.add(o.geometry);
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) { if (m.map) textures.add(m.map); m.dispose(); }
    });
    for (const g of geometries) g.dispose(); for (const texture of textures) texture.dispose();
  }
  return { group, cake, cakePosition: position, slice: authored.slice, candles, banner, fireworks, setSlice, updateFestival, releaseLantern, setCelebrationName, update, dispose };
}
