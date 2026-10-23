// Night sky: gradient, stars, milky way, aurora, moon, a supernova, a moonbow,
// a painterly sea of clouds below the islands and drifting cloud puffs.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { glowTexture, sparkleTexture, cloudTexture, rng } from './textures.js';

export const FOG_COLOR = new THREE.Color('#2b2466');
// 0 = golden-hour dusk (before the celebration), 1 = aurora night.
export const MOOD = { night: { value: 1 } };
// sun and moon in the south-west, so they light the palace's south front and the sky bridge
// (look pass, Oct 17: they used to sit behind the palace and left its face in shade all day)
// beauty slice (Oct 18): the sun stood 6° up, so flat ground got a tenth of its light and every
// meadow read as grey-green shade; at about 19° the fields are sunlit and shadows still run long
export const SUN_DIR = new THREE.Vector3(-560, 235, 420).normalize();
export const MOON_DIR = new THREE.Vector3(-300, 330, 470).normalize();
const FOG_DUSK = new THREE.Color('#e4dcea'), FOG_NIGHT = new THREE.Color('#2b2466');

const NOISE = /* glsl */`
  float hash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
  float hash13(vec3 p3){ p3 = fract(p3 * .1031); p3 += dot(p3, p3.zyx + 31.32); return fract((p3.x + p3.y) * p3.z); }
  float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
    return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x), mix(hash12(i+vec2(0,1)), hash12(i+vec2(1,1)), f.x), f.y); }
  float fbm(vec2 p){ float a = .5, s = 0.; for (int i = 0; i < OCT; i++){ s += a * vnoise(p); p = p * 2.03 + 17.1; a *= .5; } return s; }
`;

function skyDome(preset) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    defines: { OCT: preset.skyOctaves },
    uniforms: { uTime: { value: 0 }, uCelebrate: { value: 0 }, uReveal: { value: 0 }, uNight: MOOD.night, uSun: { value: SUN_DIR }, uCam: { value: new THREE.Vector3() }, uHaze: { value: FOG_COLOR } },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main(){ vDir = position; vec4 p = modelViewMatrix * vec4(position, 1.); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w * 0.9999; }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uCelebrate; uniform float uReveal; uniform float uNight; uniform vec3 uSun; uniform vec3 uCam; uniform vec3 uHaze; varying vec3 vDir;
      ${NOISE}
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 zenith = vec3(0.02, 0.02, 0.09);
        vec3 mid = vec3(0.09, 0.06, 0.26);
        vec3 horizon = vec3(0.24, 0.17, 0.46);
        vec3 col = mix(horizon, mid, smoothstep(-0.05, 0.25, h));
        col = mix(col, zenith, smoothstep(0.25, 0.9, h));
        col = mix(col, vec3(0.17, 0.14, 0.40), smoothstep(0.0, -0.3, h));

        // golden-hour dusk: warm peach horizon, lilac middle, deep blue top,
        // and a sun glow (Ghibli / BotW evening palette)
        float sunDot = max(dot(d, uSun), 0.);
        vec3 dz = vec3(0.16, 0.36, 0.86), dm = vec3(0.42, 0.62, 0.96), dh = vec3(0.92, 0.84, 0.86);   // clear blue day, lilac-pearl horizon (look pass)
        vec3 dusk = mix(dh, dm, smoothstep(-0.02, 0.22, h));
        dusk = mix(dusk, dz, smoothstep(0.12, 0.6, h));
        dusk = mix(dusk, vec3(0.74, 0.52, 0.62), smoothstep(0.0, -0.25, h));
        dusk += vec3(1.0, 0.55, 0.25) * pow(sunDot, 10.) * 0.35 + vec3(1., .8, .55) * pow(sunDot, 120.) * 0.3;
        dusk += vec3(1.0, 0.95, 0.8) * smoothstep(0.9993, 0.9997, sunDot) * 1.1;   // sun disk
        // soft high cirrus streaks catching the light
        float ci = fbm(vec2(atan(d.z, d.x) * 2.5, h * 9.) + uTime * 0.004);
        dusk += vec3(1.0, 0.7, 0.6) * smoothstep(0.55, 0.8, ci) * smoothstep(0.05, 0.3, h) * smoothstep(0.8, 0.4, h) * (0.25 + 0.4 * pow(sunDot, 2.));
        col = mix(dusk, col, uNight);

        // milky way band
        vec3 n = normalize(vec3(0.35, 0.25, 1.0));
        float band = dot(d, n);
        float mw = exp(-band * band * 18.) * smoothstep(-0.1, 0.15, h);
        float dust = fbm(vec2(atan(d.z, d.x) * 3., d.y * 6.) + 3.);
        col += mw * (vec3(0.35, 0.22, 0.55) * dust + vec3(0.25, 0.35, 0.6) * dust * dust) * 0.9 * uNight;
        col -= mw * smoothstep(0.55, 0.75, fbm(vec2(atan(d.z, d.x) * 9., d.y * 20.))) * 0.12 * uNight; // dark lanes

        // stars, denser inside the milky way
        vec3 sp = d * 220.;
        vec3 id = floor(sp); vec3 f = fract(sp) - .5;
        float rnd = hash13(id);
        float thresh = 0.975 - mw * 0.05;
        float star = step(thresh, rnd) * smoothstep(0.22, 0.0, length(f - (hash13(id + 7.) - .5) * .5));
        float tw = .6 + .4 * sin(uTime * (1. + rnd * 4.) + rnd * 60.);
        vec3 starCol = mix(vec3(1., .85, .7), vec3(.7, .85, 1.), hash13(id + 3.));
        col += star * tw * starCol * smoothstep(-0.02, 0.1, h) * 1.4 * mix(smoothstep(0.35, 0.8, h) * (1. - sunDot) * 0.5, 1., uNight);

        // aurora curtains
        if (h > 0.0) {
          vec2 uv = d.xz / (h + 0.12);
          float t = uTime * 0.03;
          float acc = 0.;
          vec3 aur = vec3(0.);
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            float wave = sin(uv.x * (0.35 + fi * 0.1) + t * (1. + fi) + fbm(uv * 0.25 + fi + t) * 3.) * 1.2;
            float rib = abs(uv.y - (1.6 + fi * 0.9) - wave);
            float curtain = exp(-rib * 2.2);
            float streak = 0.55 + 0.45 * vnoise(vec2(uv.x * 9. + t * 8. + fi * 13., fi));
            float a = curtain * streak;
            vec3 c = mix(vec3(0.1, 0.95, 0.6), vec3(0.2, 0.7, 1.0), fi * 0.5);
            c = mix(c, vec3(0.9, 0.35, 0.95), smoothstep(0.3, 0.9, fract(uv.x * 0.05 + fi * 0.33)) * 0.6);
            aur += c * a;
            acc += a;
          }
          col += aur * smoothstep(0.02, 0.25, h) * smoothstep(0.95, 0.5, h) * (0.8 + uCelebrate * 0.3) * mix(0.12, 1., uNight);
        }
        // high cloud deck (look pass, Oct 17): soft painted cumulus far above the peaks and the
        // sky palace, seen in true perspective, instead of toy puffs drifting at eye level
        if (h > 0.0) {
          float H = 4300. - uCam.y;
          if (H > 60.) {
            float t = H / max(h, 0.015);
            vec2 cp = (uCam.xz + d.xz * t) * 0.00011 + vec2(uTime * 0.0012, uTime * 0.0005);
            float n1 = fbm(cp), n2 = fbm(cp * 3.3 + 5.1);
            float cov = smoothstep(0.50, 0.74, n1 * 0.8 + n2 * 0.34);
            float dens = cov * exp(-t * 0.000028) * smoothstep(0.0, 0.06, h);
            float sl = pow(max(dot(d, uSun), 0.), 2.);
            vec3 cDay = mix(vec3(0.74, 0.78, 0.92), vec3(1.08, 1.06, 1.02), smoothstep(0.3, 0.8, n2)) * (0.85 + 0.3 * sl) + vec3(1., .72, .5) * pow(max(dot(d, uSun), 0.), 7.) * 0.45;
            vec3 cNight = mix(vec3(0.06, 0.06, 0.17), vec3(0.24, 0.24, 0.48), smoothstep(0.35, 0.85, n2));
            col = mix(col, mix(cDay, cNight, uNight), dens * 0.92);
          }
        }
        // the horizon melts into the same air as the land (look.js), so far ridges and sky meet
        col = mix(col, uHaze, smoothstep(0.14, -0.02, h) * mix(0.6, 0.35, uNight));
        // circular star trails after midnight (U129, technique T57): faint arcs
        // wheeling slowly round a pole above the castle, brightest at their heads
        if (uCelebrate > 0.) {
          vec3 P = normalize(vec3(0., 0.55, -1.));
          vec3 ax = normalize(cross(P, vec3(0., 1., 0.))), ay = cross(ax, P);
          float rr = acos(clamp(dot(d, P), -1., 1.));
          float ang = atan(dot(d, ay), dot(d, ax));
          float k = floor(rr * 240.), fr = fract(rr * 240.);
          float hk = fract(sin(k * 12.9898) * 43758.5453);
          float line = 1. - smoothstep(0.08, 0.38, abs(fr - .5));
          float ph = fract(ang / 6.28318 + hk * 7. + uTime * 0.006 * (0.6 + hk));
          float arcLen = 0.05 + hk * 0.14;
          float seg = ph < arcLen ? pow(ph / arcLen, 2.) : 0.;
          float trail = line * seg * step(0.5, hk) * smoothstep(0.02, 0.5, rr);
          col += vec3(0.78, 0.86, 1.) * trail * 0.5 * uCelebrate * uNight * smoothstep(0.03, 0.3, h);
        }
        // midnight reveal (U279): a giant Islamic eight-pointed star pattern
        // draws itself across the sky around the pole, then softly shimmers
        if (uReveal > 0.) {
          vec3 P2 = normalize(vec3(0., 0.55, -1.));
          vec3 bx = normalize(cross(P2, vec3(0., 1., 0.))), by = cross(bx, P2);
          vec2 q = vec2(dot(d, bx), dot(d, by)) / (1. + dot(d, P2)) * 2.2;
          float lines = 1e3;
          for (int i = 0; i < 3; i++) {
            float R = 0.22 + float(i) * 0.24;
            vec2 a = abs(q);
            vec2 r45 = abs(mat2(0.7071, -0.7071, 0.7071, 0.7071) * q);
            lines = min(lines, abs(max(a.x, a.y) - R));
            lines = min(lines, abs(max(r45.x, r45.y) - R));
            lines = min(lines, abs(length(q) - R * 1.307));
          }
          float ang = atan(q.y, q.x) / 6.28318 + 0.5;
          float drawn = smoothstep(ang, ang + 0.02, uReveal * 1.02);
          float glow = smoothstep(0.012, 0.0, lines) + smoothstep(0.06, 0.0, lines) * 0.12;
          float fade = smoothstep(0.95, 0.6, length(q));
          vec3 pc = mix(vec3(1.0, 0.8, 0.4), vec3(0.45, 0.95, 1.0), 0.5 + 0.5 * sin(length(q) * 9. - uTime * 0.8));
          col += pc * glow * drawn * fade * (0.55 + 0.15 * sin(uTime * 1.3)) * uNight;
        }
        gl_FragColor = vec4(col, 1.);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(5000, 48, 24), mat);
  mesh.renderOrder = -10;
  mesh.frustumCulled = false;
  return mesh;
}

function cloudSea(preset) {
  const mat = new THREE.ShaderMaterial({
    fog: false, depthWrite: true,
    defines: { OCT: Math.max(2, preset.skyOctaves) },
    uniforms: { uTime: { value: 0 }, uFog: { value: FOG_COLOR }, uNight: MOOD.night, uSun: { value: SUN_DIR } },
    vertexShader: /* glsl */`
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
    `,
    fragmentShader: /* glsl */`
      uniform float uTime; uniform vec3 uFog; uniform float uNight; uniform vec3 uSun; varying vec3 vW;
      ${NOISE}
      void main(){
        vec2 p = vW.xz * 0.006 + vec2(uTime * 0.004, uTime * 0.002);
        float n = fbm(p) + 0.35 * fbm(p * 2.7 - uTime * 0.01);
        // toon steps give the painted, Zelda-like cloud tops
        float s = smoothstep(0.45, 0.5, n) * 0.35 + smoothstep(0.62, 0.66, n) * 0.35 + smoothstep(0.78, 0.82, n) * 0.3;
        vec3 low = vec3(0.20, 0.16, 0.42);
        vec3 high = vec3(0.52, 0.48, 0.80);
        vec3 col = mix(low, high, s);
        col += vec3(0.25, 0.35, 0.6) * pow(s, 3.) * 0.4; // moonlit rims
        // dusk: cream-gold tops lit by the low sun, lavender-rose valleys
        float n2 = fbm(p + uSun.xz * 0.02);
        float lit = clamp((n - n2) * 4. + 0.5, 0., 1.);
        vec3 dcol = mix(vec3(0.62, 0.46, 0.66), vec3(1.0, 0.86, 0.78), s);
        dcol += vec3(1.0, 0.6, 0.35) * lit * s * 0.35;
        col = mix(dcol, col, uNight);
        float dist = length(vW.xz - cameraPosition.xz);
        col = mix(col, mix(vec3(0.82, 0.6, 0.68), vec3(0.24, 0.18, 0.46), uNight), smoothstep(250., 850., dist));
        gl_FragColor = vec4(col, 1.);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(14000, 14000, 1, 1).rotateX(-Math.PI / 2), mat);
  mesh.position.y = -75;
  return mesh;
}

function moonAndStars(group) {
  const moonPos = MOON_DIR.clone().multiplyScalar(Math.hypot(260, 330, 520));
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#b9c8ff', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  halo.position.copy(moonPos); halo.scale.setScalar(340);
  const disk = new THREE.Mesh(new THREE.CircleGeometry(38, 48), new THREE.MeshBasicMaterial({ color: '#fff6e0', fog: false }));
  disk.position.copy(moonPos); disk.lookAt(0, 0, 0);
  group.add(halo, disk);
  halo.material.transparent = disk.material.transparent = true;

  // a supernova that slowly breathes
  const nova = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkleTexture(), color: '#ffd4ff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  nova.position.set(420, 380, -260); nova.scale.setScalar(150);
  const novaGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff7ad9', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
  novaGlow.position.copy(nova.position); novaGlow.scale.setScalar(260);
  group.add(nova, novaGlow);

  // moonbow: a faint rainbow arc
  const bow = new THREE.Mesh(
    new THREE.RingGeometry(380, 430, 96, 1, 0, Math.PI),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
      uniforms: { uOpacity: { value: 0.14 } },
      vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }',
      fragmentShader: /* glsl */`
        uniform float uOpacity; varying vec2 vP;
        vec3 hue(float h){ return clamp(abs(mod(h * 6. + vec3(0., 4., 2.), 6.) - 3.) - 1., 0., 1.); }
        void main(){ float r = (length(vP) - 380.) / 50.; float edge = smoothstep(0., .15, r) * smoothstep(1., .85, r);
          gl_FragColor = vec4(hue(r * .8), edge * uOpacity * smoothstep(0., 60., vP.y)); }
      `,
    }),
  );
  bow.position.set(120, -60, -620);
  group.add(bow);
  return { nova, novaGlow, bow, halo, disk };
}

// Towering cumulus in the BotW / Ghibli manner: each cloud is a cluster of
// painted puffs, bright crowns on top and cooler, flatter bellies below.
function cloudPuffs(group, preset) {
  const r = rng(77);
  const map = cloudTexture();
  const puffs = [];
  const clusters = Math.max(5, Math.round(preset.clouds / 2.5));
  for (let c = 0; c < clusters; c++) {
    const a = r() * Math.PI * 2, d = 240 + r() * 380, y = 18 + r() * 60;
    const size = 70 + r() * 70;
    const parts = 5 + Math.floor(r() * 4);
    for (let i = 0; i < parts; i++) {
      const up = i / parts;                       // 0 = belly, 1 = crown
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, opacity: 0.92, depthWrite: false, fog: true }));
      const sc = size * (1 - up * 0.45) * (0.8 + r() * 0.4);
      s.scale.set(sc, sc * (0.55 + up * 0.25), 1);
      const off = { a: (r() - 0.5) * 0.12, dy: up * size * 0.55, dd: (r() - 0.5) * size * 0.4 };
      const shade = 0.55 + up * 0.45;
      s.userData = {
        a: a + off.a, d: d + off.dd, y: y + off.dy, speed: 0.006 * (c % 2 ? 1 : -1),
        night: new THREE.Color().setHSL(0.7, 0.45, 0.45 + shade * 0.3),
        dusk: new THREE.Color().setHSL(0.02 + (1 - up) * 0.06 + 0.9 * (1 - shade) * 0.1, 0.7, 0.62 + shade * 0.3),
      };
      s.position.set(Math.cos(s.userData.a) * s.userData.d, s.userData.y, Math.sin(s.userData.a) * s.userData.d);
      group.add(s); puffs.push(s);
    }
  }
  return puffs;
}

// Stylized 3D cumulus (BotW / Ghibli / Genshin): each cloud is a cluster of lumpy
// puffs with a flat belly, shaded in two soft toon steps with a warm sunlit crown,
// lilac shadows and a bright rim. All clouds share one mesh in a slow-turning ring.
function stylizedClouds(preset) {
  const r = rng(4242), detail = preset.clouds >= 40 ? 2 : 1;
  const count = Math.round(preset.clouds * 0.7) + 6;
  const geos = [];
  const lump = (x, y, z, s) => Math.sin(x * 0.9 + s) * Math.sin(y * 1.1 + s * 2) * Math.sin(z * 0.8 + s * 3);
  const puff = (px, py, pz, R, base, seed) => {
    const g = new THREE.IcosahedronGeometry(R, detail), p = g.attributes.position;
    const nrm = new Float32Array(p.count * 3);
    for (let k = 0; k < p.count; k++) {
      let x = p.getX(k), y = p.getY(k), z = p.getZ(k);
      const L = Math.hypot(x, y, z) || 1;
      nrm[k * 3] = x / L; nrm[k * 3 + 1] = y / L; nrm[k * 3 + 2] = z / L;
      const f = 1 + 0.1 * lump(x / R * 3, y / R * 3, z / R * 3, seed);
      x *= f; y *= f; z *= f;
      if (py + y < base) y = base - py + (py + y - base) * 0.15;         // flat belly
      p.setXYZ(k, px + x, py + y, pz + z);
    }
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.deleteAttribute('uv');
    geos.push(g.index ? g.toNonIndexed() : g);
  };
  for (let c = 0; c < count; c++) {
    // a cumulus heap: a broad row of puffs along a flat belly, then a smaller crown stacked on top
        const a = (c / count) * Math.PI * 2 + r() * 0.3, d = 6500 + r() * 4500;
    const base = 1700 + r() * 700;
    const cx = Math.cos(a) * d, cz = Math.sin(a) * d, W = 800 + r() * 900, ang = a + Math.PI / 2 + (r() - 0.5) * 0.8;
    const rows = [[5 + Math.floor(r() * 3), 1, 0], [3 + Math.floor(r() * 2), 0.62, 0.55], [1 + Math.floor(r() * 2), 0.4, 0.95]];
    rows.forEach(([n, sc, lift], ri) => {
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : i / (n - 1) - 0.5, mid = 1 - Math.abs(t) * 1.2;
        const R = W * sc * (0.2 + 0.16 * mid) * (0.85 + r() * 0.3);
        const ox = t * W * 1.5 * sc, oz = (r() - 0.5) * W * 0.35, oy = R * 0.45 + W * lift * 0.42;
        const px = cx + ox * Math.cos(ang) - oz * Math.sin(ang), pz = cz + ox * Math.sin(ang) + oz * Math.cos(ang);
        puff(px, base + oy, pz, R, base, i + c * 7 + ri * 3);
      }
    });
  }
  const mat = new THREE.ShaderMaterial({
    fog: false,
    uniforms: { uTime: { value: 0 }, uNight: MOOD.night, uSun: { value: SUN_DIR }, uMoon: { value: MOON_DIR } },
    vertexShader: /* glsl */`
      varying vec3 vN; varying vec3 vW;
      void main(){ vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */`
      uniform float uNight; uniform vec3 uSun; uniform vec3 uMoon; varying vec3 vN; varying vec3 vW;
      void main(){
        vec3 L = normalize(mix(uSun, uMoon, uNight) + vec3(0., 1.1, 0.));   // lit from above so the crowns glow
        float d = dot(normalize(vN), L) * .5 + .5;
        float lit = smoothstep(.36, .54, d) * .55 + smoothstep(.62, .82, d) * .45;   // two soft toon steps
        vec3 V = normalize(cameraPosition - vW);
        float rim = pow(1. - max(dot(normalize(vN), V), 0.), 3.);
        vec3 shadeD = vec3(.8, .74, .93), litD = vec3(1., .88, .9), topD = vec3(1., .99, .96);
        vec3 shadeN = vec3(.18, .17, .38), litN = vec3(.48, .46, .72), topN = vec3(.72, .72, .92);
        vec3 shade = mix(shadeD, shadeN, uNight), mid = mix(litD, litN, uNight), top = mix(topD, topN, uNight);
        vec3 c = mix(shade, mid, smoothstep(0., .55, lit));
        c = mix(c, top, smoothstep(.6, 1., lit) * smoothstep(-.2, .6, vN.y));
        c += mix(vec3(1., .75, .7), vec3(.6, .65, 1.), uNight) * rim * .22;
        c = mix(c, mix(vec3(.95, .82, .9), vec3(.2, .18, .4), uNight), .1);       // a breath of sky haze
        gl_FragColor = vec4(pow(c, vec3(2.2)), 1.);
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(mergeGeometries(geos), mat);
  mesh.frustumCulled = false;
  mesh.name = 'clouds';
  return mesh;
}

export function createSky(scene, preset) {
  const group = new THREE.Group();
  const dome = skyDome(preset);
  const sea = cloudSea(preset);
  sea.visible = false;                    // the Starlight Coast has a real sea now
  group.add(dome, sea);
  // the moon, nova, moonbow and towering clouds sit out beyond the mountain rim
  const far = new THREE.Group(); far.scale.setScalar(4.5); group.add(far);
  const extras = moonAndStars(far);
  const clouds = stylizedClouds(preset);
  clouds.visible = false;                 // replaced by the high cloud deck in the dome (look pass)
  scene.add(group);
  let revealing = false, lastT = null;

  return {
    dome, sea,
    update(t, camera) {
      const dt = lastT == null ? 0 : Math.min(0.5, t - lastT); lastT = t;
      const rv = dome.material.uniforms.uReveal;
      rv.value = revealing ? Math.min(1, rv.value + dt / 14) : 0;   // draws over about 14 seconds
      dome.material.uniforms.uTime.value = t;
      sea.material.uniforms.uTime.value = t;
      dome.position.copy(camera.position);
      dome.material.uniforms.uCam.value.copy(camera.position);
      far.position.set(camera.position.x, 0, camera.position.z);
      clouds.position.set(camera.position.x * 0.6, 0, camera.position.z * 0.6);
      const k = 1 + Math.sin(t * 0.7) * 0.15;
      extras.nova.scale.setScalar(150 * k);
      extras.novaGlow.material.opacity = 0.35 + Math.sin(t * 0.7) * 0.15;
      const n = MOOD.night.value;
      FOG_COLOR.copy(FOG_DUSK).lerp(FOG_NIGHT, n);
      extras.halo.material.opacity = 0.55 * n; extras.disk.material.opacity = 0.1 + 0.9 * n;
      extras.novaGlow.material.opacity *= n; extras.nova.material.opacity = n;
      // the rainbow belongs to the day (the celebration brings it back)
      extras.bow.material.uniforms.uOpacity.value = revealing ? 0.32 : 0.14 * (1 - n) * THREE.MathUtils.smoothstep(SUN_DIR.y, 0.15, 0.45);
      clouds.rotation.y = t * 0.0035;
      clouds.material.uniforms.uTime.value = t;
    },
    setCelebration(on) {
      dome.material.uniforms.uCelebrate.value = on ? 1 : 0;
      revealing = on;
      extras.bow.material.uniforms.uOpacity.value = on ? 0.32 : 0.14;
    },
  };
}
