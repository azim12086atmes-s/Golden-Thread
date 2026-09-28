import * as THREE from 'three';
import { CITY_RADIUS, REGION_BY_ID, regionCenter, type RegionId } from '../world/regions';
import { WATER_Y, terrainHeight } from '../world/terrain';
import { bridgeDeckAt } from '../world/bridges';
import { WATERS } from '../world/waters';
import type { Anim, Piece } from './creatures';
import { type Design, makeDesign } from './designs';
import { harbourOf } from '../world/harbours';
import { LAND_TRAFFIC, SEA_TRAFFIC, resolveShip } from './roster';
import { HIGHWAY_TRAFFIC, RING_R, STOP_BACK, activeShare, highwayU, isOut, lights, neighbours, type Light } from './schedule';
import { hasDesign } from './designs';

/**
 * The land's traffic, alive: vehicles and carts going up and down the avenues and round the ring
 * road (keeping their lane and their distance, and stopping for the travellers), boats circling
 * the lakes and ponds and plying the river, and craft and creatures crossing the sky. Each design
 * is drawn as a few instanced meshes — one per piece — so a whole land's traffic is a few dozen
 * draw calls. Only the land you are in moves; the rest wait.
 */

/** A route, measured in metres along it: where you are at `u`, and which way you face. */
export interface Route {
  len: number;
  at(u: number, out: THREE.Vector3): THREE.Vector3;
  /** Road routes follow the ground; water sits on the water; sky flies at its own height. */
  realm: Design['realm'];
  /** Sea lanes: where along the route ships stop at the harbour's pier head. */
  dock?: number;
  /** Road routes through a junction: metres to the next stop line, and whose lights govern it (schedule.ts). */
  stopAhead?(u: number): { d: number; by: 'avenue' | 'ring' } | null;
}

/** Lands whose traffic keeps to the left. */
const LEFT: RegionId[] = ['london', 'japan', 'indonesia', 'indianorth', 'indiasouth', 'mughal'];

/** Up an avenue and back: out along one lane, round at the end, back along the other. */
export function avenueRoute(cx: number, cz: number, ax: number, az: number, d0: number, d1: number, lane: number): Route {
  // A negative lane keeps to the left: the same loop, mirrored across the avenue.
  const side = Math.sign(lane) || 1, R = Math.abs(lane);
  const straight = d1 - d0, turn = Math.PI * R, len = 2 * straight + 2 * turn;
  // (px, pz) is the lane's side as you drive out.
  const px = az * side, pz = -ax * side;
  lane = R;
  return {
    len, realm: 'road',
    // Crossing the ring road: stop before it going out, and before it coming back.
    stopAhead(u) {
      if (d0 > RING_R || d1 < RING_R) return null;
      u = ((u % len) + len) % len;
      if (u < straight) { const a = d0 + u, line = RING_R - STOP_BACK; return a < line ? { d: line - a, by: 'avenue' } : null; }
      if (u >= straight + turn && u < 2 * straight + turn) { const a = d1 - (u - straight - turn), line = RING_R + STOP_BACK; return a > line ? { d: a - line, by: 'avenue' } : null; }
      return null;
    },
    at(u, out) {
      u = ((u % len) + len) % len;
      let a: number, b: number;
      if (u < straight) { a = d0 + u; b = lane; }
      else if (u < straight + turn) { const th = (u - straight) / lane; a = d1 + Math.sin(th) * lane; b = Math.cos(th) * lane; }
      else if (u < 2 * straight + turn) { a = d1 - (u - straight - turn); b = -lane; }
      else { const th = (u - 2 * straight - turn) / lane; a = d0 - Math.sin(th) * lane; b = -Math.cos(th) * lane; }
      return out.set(cx + ax * a + px * b, 0, cz + az * a + pz * b);
    },
  };
}

export function circleRoute(cx: number, cz: number, r: number, dir: 1 | -1, realm: Design['realm']): Route {
  const len = Math.PI * 2 * r;
  const route: Route = { len, realm, at(u, out) { const a = (u / r) * dir; return out.set(cx + Math.cos(a) * r, 0, cz + Math.sin(a) * r); } };
  // The ring road meets an avenue every quarter turn: stop before each crossing.
  if (realm === 'road') route.stopAhead = (u) => {
    // The crossings lie at every quarter of the way round, whichever way the ring runs.
    const q = (Math.PI / 2) * r, pos = ((u % len) + len) % len;
    const toNext = q - (pos % q) - STOP_BACK;
    return toNext > 0 ? { d: toNext, by: 'ring' } : null;
  };
  return route;
}

/** Along a river and back, keeping to one side each way. */
export function riverRoute(pts: Array<[number, number]>, off: number): Route {
  const seg: number[] = [0];
  for (let i = 1; i < pts.length; i++) seg.push(seg[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const L = seg[seg.length - 1], len = 2 * L;
  const along = (s: number, side: number, out: THREE.Vector3) => {
    let i = 1;
    while (i < seg.length - 1 && seg[i] < s) i++;
    const t = (s - seg[i - 1]) / Math.max(1e-6, seg[i] - seg[i - 1]);
    const [ax, az] = pts[i - 1], [bx, bz] = pts[i], dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz) || 1;
    return out.set(ax + dx * t + (dz / l) * side, 0, az + dz * t - (dx / l) * side);
  };
  return {
    len, realm: 'water',
    at(u, out) {
      u = ((u % len) + len) % len;
      return u < L ? along(u, off, out) : along(2 * L - u, -off, out);
    },
  };
}

interface Mover {
  design: Design;
  route: Route;
  u: number;
  speed: number;
  /** Distance travelled (drives the legs' stride). */
  odo: number;
  alt: number;
  phase: number;
  /** Where each member of the group sits: along (behind the leader) and across. */
  members: Array<[number, number]>;
  /** Ships: seconds left tied up at the pier, and whether they have stopped on this pass. */
  wait?: number;
  docked?: boolean;
  /** Out at this hour (schedule.ts); the rest are parked out of sight. */
  out?: boolean;
  /** Its place in its kind's line-up (who stays out at night). */
  index?: number;
  /** Highway traffic: placed by the clock, so crossing a border never moves it (schedule.ts). */
  hw?: { u0: number };
}

interface Drawn {
  design: Design;
  meshes: Array<{ piece: Piece; solid: THREE.InstancedMesh | null; glow: THREE.InstancedMesh | null }>;
  chain: { solid: THREE.InstancedMesh | null; glow: THREE.InstancedMesh | null } | null;
  movers: Mover[];
}

const designCache = new Map<string, Design>();
const design = (id: string) => { let d = designCache.get(id); if (!d) { d = makeDesign(id); designCache.set(id, d); } return d; };

const _p = new THREE.Vector3(), _q = new THREE.Vector3(), _f = new THREE.Vector3(), _m = new THREE.Matrix4(), _a = new THREE.Matrix4(), _b = new THREE.Matrix4();
const _quat = new THREE.Quaternion(), _e = new THREE.Euler(0, 0, 0, 'YXZ'), _one = new THREE.Vector3(1, 1, 1), _c = new THREE.Color();

/** The routes a land offers each realm. */
export function landRoutes(land: RegionId): { road: Route[]; water: Array<{ route: Route; room: number }>; sea: Route[] } {
  const c = regionCenter(REGION_BY_ID[land]);
  const road: Route[] = [], water: Array<{ route: Route; room: number }> = [], sea: Route[] = [];
  // The sea lane along the coast (world/harbours.ts): out on the far lane, back on the near one,
  // stopping at the pier head on the way back.
  const hb = harbourOf(land);
  if (hb) {
    const [dx, dz] = hb.dir, R = hb.laneHalfWidth;
    const route = avenueRoute(c.x + dx * hb.lane, c.z + dz * hb.lane, -dz, dx, -hb.reach, hb.reach, R);
    sea.push({ ...route, realm: 'water', dock: 3 * hb.reach + Math.PI * R });
  }
  if (land !== 'skyisles') {
    const lane = LEFT.includes(land) ? -2.8 : 2.8;
    for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) {
      // Inner stretch (plaza to the ring road) and outer stretch (the ring road to the fields),
      // turning back before the crossing so nothing meets at the junction.
      // From the plaza out to the fields and back, through the ring-road crossing (with lights).
      road.push(avenueRoute(c.x, c.z, ax, az, 60, CITY_RADIUS + 34, lane));
    }
    const ring = LEFT.includes(land) ? -1 : 1;
    road.push(circleRoute(c.x, c.z, 140 + 2.3, ring as 1 | -1, 'road'), circleRoute(c.x, c.z, 140 - 2.3, (-ring) as 1 | -1, 'road'));
  }
  for (const w of WATERS) {
    if (w.land !== land) continue;
    if (w.kind === 'river') { water.push({ route: riverRoute(w.pts, w.w * 0.22), room: w.w * 0.5 }); continue; }
    water.push({ route: circleRoute(w.x, w.z, w.r * 0.58, 1, 'water'), room: w.r * 0.8 });
    if (w.kind === 'lake') water.push({ route: circleRoute(w.x, w.z, w.r * 0.3, -1, 'water'), room: w.r * 0.35 });
  }
  return { road, water, sea };
}

/** A courier on the road in this land (economy/supply.ts `couriersIn`): their vehicle, and which side of town their field is. */
export interface CourierRide { vehicle: string; standIn?: string; side: 1 | -1 }

/** Beyond this, traffic is not drawn (m). */
const FAR = 520;

export class Traffic {
  readonly group = new THREE.Group();
  private focus = new THREE.Vector3();
  private sig = '';
  private drawn: Drawn[] = [];
  private solidMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.12, side: THREE.DoubleSide, envMapIntensity: 0.35 });
  private glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });

  setEnvironment(tex: THREE.Texture): void {
    this.solidMat.envMap = tex;
    this.solidMat.needsUpdate = true;
  }

  /** How many things are travelling now (for tests and the dev harness). */
  get count(): number {
    return this.drawn.reduce((n, d) => n + d.movers.length * (d.design.group?.n ?? 1), 0);
  }

  private clear(): void {
    for (const d of this.drawn) for (const m of [...d.meshes, ...(d.chain ? [d.chain] : [])]) for (const im of [m.solid, m.glow]) if (im) { this.group.remove(im); im.dispose(); }
    this.drawn = [];
    if (this.lightPosts) { this.group.remove(this.lightPosts); this.lightPosts.traverse((o) => { if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose(); }); this.lightPosts = null; }
  }

  // ───── traffic lights at the ring-road crossings (schedule.ts) ─────
  private lightPosts: THREE.Group | null = null;
  private lamp = { avenue: this.lampMats(), ring: this.lampMats() };
  private lampMats(): Record<Light, THREE.MeshBasicMaterial> {
    return { red: new THREE.MeshBasicMaterial({ color: '#3a0a0a', toneMapped: false }), amber: new THREE.MeshBasicMaterial({ color: '#3a2a0a', toneMapped: false }), green: new THREE.MeshBasicMaterial({ color: '#0a3a14', toneMapped: false }) };
  }
  /** A post with three lamps at each corner of the four crossings: two face the avenue, two the ring road. */
  private buildLights(cx: number, cz: number): void {
    const g = new THREE.Group(), pole = new THREE.MeshStandardMaterial({ color: '#3a3a44', roughness: 0.5, metalness: 0.4 });
    const post = new THREE.CylinderGeometry(0.08, 0.1, 3.4, 6), head = new THREE.BoxGeometry(0.34, 1.05, 0.3), lampG = new THREE.SphereGeometry(0.11, 8, 6);
    for (const [ax, az] of [[0, 1], [0, -1], [1, 0], [-1, 0]] as const) for (const [sa, sb, faces] of [[-1, -1, 'avenue'], [1, 1, 'avenue'], [-1, 1, 'ring'], [1, -1, 'ring']] as const) {
      // Corner of the crossing: along the avenue (a) and across it (b).
      const a = RING_R + sa * 8.5, b = sb * 8.5;
      const x = cx + ax * a + az * b, z = cz + az * a - ax * b, y = terrainHeight(x, z);
      const m = new THREE.Mesh(post, pole); m.position.set(x, y + 1.7, z); g.add(m);
      const h = new THREE.Mesh(head, pole); h.position.set(x, y + 3.2, z);
      // Face the traffic it governs: along the avenue, or along the ring road.
      h.rotation.y = faces === 'avenue' ? Math.atan2(ax, az) : Math.atan2(az, -ax);
      g.add(h);
      (['red', 'amber', 'green'] as Light[]).forEach((c, i) => {
        const l = new THREE.Mesh(lampG, this.lamp[faces][c]);
        l.position.set(0, 0.32 - i * 0.32, 0.16);
        h.add(l);
      });
    }
    this.lightPosts = g;
    this.group.add(g);
  }
  private setLights(t: number): { avenue: Light; ring: Light } {
    const now = lights(t);
    for (const who of ['avenue', 'ring'] as const) for (const c of ['red', 'amber', 'green'] as Light[]) {
      const on = now[who] === c, m = this.lamp[who][c];
      m.color.set(on ? (c === 'red' ? '#ff3a2a' : c === 'amber' ? '#ffb02a' : '#3aff6a') : (c === 'red' ? '#3a0a0a' : c === 'amber' ? '#3a2a0a' : '#0a3a14'));
      if (on) m.color.multiplyScalar(1.6);
    }
    return now;
  }

  /** Put this land's traffic on its roads, waters and skies. */
  setLand(land: RegionId, couriers: CourierRide[] = []): void {
    const sig = `${land}|${couriers.map((c) => `${c.vehicle}${c.side}`).join(',')}`;
    if (this.sig === sig) return;
    this.sig = sig;
    this.clear();
    const roster = LAND_TRAFFIC[land], routes = landRoutes(land), c = regionCenter(REGION_BY_ID[land]);
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const ground = Math.max(WATER_Y, terrainHeight(c.x, c.z));

    // Road: share the vehicles out among the lanes, evenly spaced along each.
    const roadList: string[] = [];
    for (const [id, n] of roster.road) for (let i = 0; i < n; i++) roadList.push(id);
    roadList.sort(() => rnd() - 0.5);
    const perRoute = new Map<Route, number>();
    const roadMovers: Array<{ id: string; route: Route }> = roadList.map((id, i) => ({ id, route: routes.road[i % Math.max(1, routes.road.length)] }));
    for (const m of roadMovers) perRoute.set(m.route, (perRoute.get(m.route) ?? 0) + 1);
    const placed = new Map<Route, number>();
    const add = new Map<string, Mover[]>();
    const push = (id: string, m: Omit<Mover, 'design' | 'members' | 'odo' | 'phase'>) => {
      const d = design(id), n = d.group?.n ?? 1, sp = d.group?.spacing ?? 0;
      const members: Array<[number, number]> = [];
      for (let k = 0; k < n; k++) members.push(d.realm === 'road' ? [k * sp, 0] : [k * sp * 0.8, k === 0 ? 0 : (k % 2 ? 1 : -1) * Math.ceil(k / 2) * sp * 0.6]);
      const list = add.get(id) ?? [];
      list.push({ ...m, design: d, members, odo: 0, phase: rnd() * 10 });
      add.set(id, list);
    };
    if (routes.road.length) for (const { id, route } of roadMovers) {
      const k = placed.get(route) ?? 0;
      placed.set(route, k + 1);
      push(id, { route, u: (route.len * k) / (perRoute.get(route) ?? 1) + rnd() * 6, speed: 0, alt: 0 });
    }
    // Your couriers, on the outer avenue between their field and the town (east avenue for the
    // east field, west for the west; in the sky for sky-borne couriers).
    for (const [i, c0] of couriers.entries()) {
      const cr = { ...c0, vehicle: hasDesign(c0.vehicle) ? c0.vehicle : c0.standIn ?? c0.vehicle };
      const d = design(cr.vehicle);
      if (d.realm === 'road' && routes.road.length) {
        const route = routes.road[cr.side > 0 ? 2 : 3];
        push(cr.vehicle, { route, u: route.len * (0.25 + 0.37 * i) % route.len, speed: 0, alt: 0 });
      } else if (d.realm === 'water' && routes.sea[0]) {
        const route = routes.sea[0];
        push(cr.vehicle, { route, u: route.len * (0.1 + 0.29 * i) % route.len, speed: d.speed, alt: 0 });
      } else if (d.realm === 'sky') {
        const route = circleRoute(c.x, c.z, 120 + i * 25, 1, 'sky');
        push(cr.vehicle, { route, u: rnd() * route.len, speed: d.speed, alt: ground + 30 + i * 6 });
      }
    }
    // Ships on the sea lane, spread evenly along it.
    const seaRoute = routes.sea[0];
    if (seaRoute) {
      const ships = (SEA_TRAFFIC[land] ?? []).flatMap(([want, stand, n]) => Array.from({ length: n }, () => resolveShip(want, stand, hasDesign)));
      ships.forEach((id, k) => push(id, { route: seaRoute, u: (seaRoute.len * k) / ships.length + rnd() * 10, speed: design(id).speed, alt: 0 }));
    }
    // Water: big boats on the lakes, small craft anywhere there is room.
    for (const [id, n] of roster.water) {
      const d = design(id);
      const fits = routes.water.filter((w) => w.room > d.len * 0.45);
      for (let i = 0; i < n && fits.length; i++) {
        const w = fits[(i + Math.floor(rnd() * fits.length)) % fits.length];
        push(id, { route: w.route, u: rnd() * w.route.len, speed: d.speed, alt: 0 });
      }
    }
    // Sky: each on its own circle round the town, at its own height, some one way, some the other.
    for (const [id, n] of roster.sky) {
      const d = design(id), [r0, r1] = d.radius ?? [100, 300], [h0, h1] = d.alt ?? [40, 90];
      for (let i = 0; i < n; i++) {
        const route = circleRoute(c.x + (rnd() - 0.5) * 80, c.z + (rnd() - 0.5) * 80, r0 + rnd() * (r1 - r0), rnd() < 0.5 ? 1 : -1, 'sky');
        push(id, { route, u: rnd() * route.len, speed: d.speed, alt: ground + h0 + rnd() * (h1 - h0) });
      }
    }

    // Highways to the neighbouring lands: intercity buses, lorries and cars, placed by the clock
    // on a loop that runs from this town's ring road to the next town's (the same loop in both lands).
    for (const n of neighbours(land)) {
      const [a, b] = n.dir[0] > 0 || n.dir[1] > 0 ? [land, n.land] : [n.land, land];
      const ca = regionCenter(REGION_BY_ID[a]), [dx, dz] = n.dir[0] > 0 || n.dir[1] > 0 ? n.dir : [-n.dir[0], -n.dir[1]];
      const route = avenueRoute(ca.x, ca.z, dx, dz, 152, 700 - 152, LEFT.includes(a) ? -5.6 : 5.6);
      let k = 0;
      const key = `${a}~${b}`;
      for (const [id, count] of HIGHWAY_TRAFFIC) for (let i = 0; i < count; i++, k++) {
        if (!hasDesign(id)) continue;
        const u0 = (route.len * (k + ((key.length * 7) % 10) / 10)) / 8;
        push(id, { route, u: u0, speed: design(id).speed, alt: 0, hw: { u0 } });
      }
    }
    if (land !== 'skyisles') this.buildLights(c.x, c.z);

    for (const [id, movers] of add) {
      const d = design(id), members = movers.reduce((n, m) => n + m.members.length, 0);
      const inst = (g: THREE.BufferGeometry | null, mat: THREE.Material, count: number) => {
        if (!g || !count) return null;
        const im = new THREE.InstancedMesh(g, mat, count);
        im.frustumCulled = false;
        im.castShadow = mat === this.solidMat && d.realm !== 'sky';
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.group.add(im);
        return im;
      };
      const meshes = d.pieces.map((p) => ({ piece: p, solid: inst(p.solid, this.solidMat, members), glow: inst(p.glow, this.glowMat, members) }));
      let chain: Drawn['chain'] = null;
      if (d.chain) {
        const n = d.chain.n * members;
        chain = { solid: inst(d.chain.piece.solid, this.solidMat, n), glow: inst(d.chain.piece.glow, this.glowMat, n) };
        if (chain.solid) for (let i = 0; i < n; i++) chain.solid.setColorAt(i, _c.set(d.chain.palette[i % d.chain.palette.length]));
      }
      this.drawn.push({ design: d, meshes, chain, movers });
    }
  }

  update(dt: number, t: number, land: RegionId, travellers: THREE.Vector3, night: number, couriers: CourierRide[] = [], hour = 12): void {
    this.setLand(land, couriers);
    this.glowMat.color.setScalar(0.06 + night * 1.5);
    this.focus.copy(travellers);
    const lit = this.lightPosts ? this.setLights(t) : null;
    for (const dr of this.drawn) {
      const d = dr.design;
      // Who is out at this hour (the same ones every night).
      const share = activeShare(d.id, d.realm, hour);
      dr.movers.forEach((m, i) => { m.out = isOut(m.index ?? i, share); });
      // Highway traffic keeps to the clock.
      for (const m of dr.movers) if (m.hw) { m.u = highwayU(m.hw.u0, d.speed, t, m.route.len); m.speed = d.speed; }
      // Keep their distance on the road: the one ahead sets the pace.
      if (d.realm === 'road') for (const m of dr.movers) {
        let want = d.speed;
        m.route.at(m.u, _p);
        m.route.at(m.u + 2, _q);
        _f.subVectors(_q, _p).normalize();
        _q.subVectors(travellers, _p);
        const ahead = _q.x * _f.x + _q.z * _f.z, side = Math.abs(_q.x * _f.z - _q.z * _f.x);
        // Look far enough ahead to stop in time (braking at 8 m/s²).
        const reach = d.len / 2 + 4 + (m.speed * m.speed) / 16 + m.members.length * (d.group?.spacing ?? 0);
        if (ahead > -1 && ahead < reach && side < 2.6 && Math.abs(travellers.y - (terrainHeight(_p.x, _p.z))) < 4) want = 0;
        // The lights at the ring-road crossing: stop at the line on red (and on amber, if there is room to).
        const stop = lit ? m.route.stopAhead?.(m.u + d.len / 2) : null;
        if (stop && lit) {
          const light = lit[stop.by];
          if (light !== 'green' && stop.d < 3 + (m.speed * m.speed) / 12 && !(light === 'amber' && stop.d < 3)) want = Math.min(want, stop.d < 0.8 ? 0 : Math.min(want, stop.d * 0.8));
        }
        for (const o of this.roadMovers()) {
          if (o === m || o.route !== m.route) continue;
          const gap = (((o.u - m.u) % m.route.len) + m.route.len) % m.route.len;
          const need = d.len / 2 + o.design.len / 2 + 3 + (o.design.group ? o.design.group.spacing * (o.members.length - 1) : 0);
          if (gap < need + 4 + (m.speed * m.speed) / 16) want = Math.min(want, gap < need ? 0 : o.speed);
        }
        m.speed += Math.max(-8 * dt, Math.min(3 * dt, want - m.speed));
      }
      // Ships on a sea lane ease into the pier head, tie up a while, and keep their distance.
      if (d.realm === 'water') for (const m of dr.movers) {
        const dock = m.route.dock;
        if (dock === undefined) continue;
        if ((m.wait ?? 0) > 0) { m.wait! -= dt; m.speed = 0; continue; }
        const L = m.route.len, toDock = (((dock - m.u) % L) + L) % L;
        if (toDock > 5 && toDock < L - 5) m.docked = false;
        if (!m.docked && toDock < 0.6) { m.wait = 20; m.docked = true; m.speed = 0; continue; }
        let want = m.docked ? d.speed : Math.min(d.speed, Math.max(0.5, (d.speed * toDock) / 40));
        for (const o of this.seaMovers(m.route)) {
          if (o === m) continue;
          const gap = (((o.u - m.u) % L) + L) % L, need = d.len / 2 + o.design.len / 2 + 6;
          if (gap < need + 20) want = Math.min(want, gap < need ? 0 : o.speed);
        }
        m.speed += Math.max(-2 * dt, Math.min(1 * dt, want - m.speed));
      }
      for (const m of dr.movers) {
        const step = m.speed * dt;
        if (!m.hw) m.u += step;
        m.odo += step;
      }
      this.draw(dr, t);
    }
  }

  private *seaMovers(route: Route): Generator<Mover> {
    for (const d of this.drawn) if (d.design.realm === 'water') for (const m of d.movers) if (m.route === route) yield m;
  }

  private *roadMovers(): Generator<Mover> {
    for (const d of this.drawn) if (d.design.realm === 'road') yield* d.movers;
  }

  /** Where a member of a mover is, facing along its route, tilted with the ground or banking. */
  private place(m: Mover, du: number, across: number, t: number, out: THREE.Matrix4): void {
    const d = m.design, r = m.route;
    r.at(m.u - du, _p);
    r.at(m.u - du + 1.5, _q);
    _f.subVectors(_q, _p);
    const yaw = Math.atan2(_f.x, _f.z);
    let pitch = 0, roll = 0;
    const len = Math.hypot(_f.x, _f.z) || 1;
    _p.x += (_f.z / len) * across;
    _p.z -= (_f.x / len) * across;
    if (d.realm === 'road') {
      // Over a river the road runs on the bridge's deck.
      const h0 = bridgeDeckAt(_p.x, _p.z) ?? terrainHeight(_p.x, _p.z), h1 = bridgeDeckAt(_q.x, _q.z) ?? terrainHeight(_q.x, _q.z);
      _p.y = h0 + 0.07 + (d.bob ? Math.sin(t * 2 + m.phase) * d.bob : 0);
      pitch = -Math.atan2(h1 - h0, 1.5) * 0.8;
    } else if (d.realm === 'water') {
      _p.y = WATER_Y + Math.sin(t * 1.3 + m.phase + du) * (d.bob ?? 0.05);
      roll = Math.sin(t * 0.9 + m.phase) * 0.03;
    } else {
      _p.y = m.alt + Math.sin(t * 0.4 + m.phase + du * 0.05) * (d.bob ?? 1);
      // Bank into the turn.
      roll = (d.bank ?? 0) * turnSign(r, m.u - du);
      pitch = Math.sin(t * 0.4 + m.phase) * 0.03;
    }
    _e.set(pitch, yaw, roll);
    _quat.setFromEuler(_e);
    out.compose(_p, _quat, _one);
  }

  private draw(dr: Drawn, t: number): void {
    const d = dr.design;
    let k = 0;
    for (const m of dr.movers) {
      for (const [du, across] of m.members) {
        this.place(m, du, across, t, _m);
        // Parked for the night, or too far away to see: out of sight.
        _p.setFromMatrixPosition(_m);
        if (m.out === false || _p.distanceToSquared(this.focus) > FAR * FAR) _m.makeScale(0, 0, 0);
        const stride = d.realm === 'road' ? m.odo * 2.2 : t * 6 + m.phase;
        for (const pm of dr.meshes) {
          animate(pm.piece, t + m.phase + du, stride + du, _a);
          _b.multiplyMatrices(_m, _a);
          pm.solid?.setMatrixAt(k, _b);
          pm.glow?.setMatrixAt(k, _b);
        }
        if (d.chain && dr.chain) {
          for (let i = 0; i < d.chain.n; i++) {
            const j = k * d.chain.n + i, back = du + (i + 1) * d.chain.spacing;
            this.place(m, back, across, t, _b);
            // A ripple runs down the body.
            _a.makeTranslation(0, Math.sin(t * 2.4 - i * 0.55 + m.phase) * 1.4, 0);
            _b.multiply(_a);
            dr.chain.solid?.setMatrixAt(j, _b);
            dr.chain.glow?.setMatrixAt(j, _b);
          }
        }
        k++;
      }
    }
    for (const pm of dr.meshes) for (const im of [pm.solid, pm.glow]) if (im) im.instanceMatrix.needsUpdate = true;
    if (dr.chain) for (const im of [dr.chain.solid, dr.chain.glow]) if (im) im.instanceMatrix.needsUpdate = true;
  }
}

/** Which way the route bends here (+1 left, −1 right), for banking. */
const _ta = new THREE.Vector3(), _tb = new THREE.Vector3(), _tc = new THREE.Vector3();
function turnSign(r: Route, u: number): number {
  const a = r.at(u, _ta), b = r.at(u + 3, _tb), c = r.at(u + 6, _tc);
  const cross = (b.x - a.x) * (c.z - b.z) - (b.z - a.z) * (c.x - b.x);
  return Math.abs(cross) < 1e-4 ? 0 : cross > 0 ? -1 : 1;
}

const _ae = new THREE.Euler(), _ar = new THREE.Matrix4(), _at = new THREE.Matrix4();
/** A piece's own motion about its pivot. */
export function animate(p: Piece, t: number, stride: number, out: THREE.Matrix4): THREE.Matrix4 {
  const a: Anim = p.anim;
  if (a === 'none') return out.identity();
  let rx = 0, ry = 0, rz = 0;
  switch (a) {
    case 'swingA': rx = Math.sin(stride) * p.amp; break;
    case 'swingB': rx = -Math.sin(stride) * p.amp; break;
    case 'flapL': rz = Math.sin(t * 5) * p.amp; break;
    case 'flapR': rz = -Math.sin(t * 5) * p.amp; break;
    case 'spinX': rx = t * p.amp * Math.PI * 2; break;
    case 'spinY': ry = t * p.amp * Math.PI * 2; break;
    case 'spinZ': rz = t * p.amp * Math.PI * 2; break;
    case 'tail': ry = Math.sin(t * 3) * p.amp; break;
    case 'fluke': rx = Math.sin(t * 1.2) * p.amp; break;
  }
  const [x, y, z] = p.pivot;
  _ae.set(rx, ry, rz);
  _ar.makeRotationFromEuler(_ae);
  return out.makeTranslation(x, y, z).multiply(_ar).multiply(_at.makeTranslation(-x, -y, -z));
}
