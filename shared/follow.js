// Runtime copy of Golden Thread's original following rules, with types removed.
export const BODY_RADIUS = 0.32;
export const MIN_GAP = 1.5;
export const IDEAL_GAP = 1.95;
export const LEASH = 9;
export const SNAP = 80;
const dist = (a, b)=>Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export function followTarget(girl, heading) {
    const back = -0.35, side = 1;
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const rx = Math.cos(heading), rz = -Math.sin(heading);
    const k = IDEAL_GAP / Math.hypot(back, side);
    return {
        x: girl.x + (fx * back + rx * side) * k,
        y: girl.y,
        z: girl.z + (fz * back + rz * side) * k
    };
}
export function enforceGap(p, from, gap = MIN_GAP) {
    const dx = p.x - from.x, dy = p.y - from.y, dz = p.z - from.z;
    const d = Math.hypot(dx, dy, dz);
    if (d >= gap) return p;
    if (d < 1e-6) return {
        x: from.x + gap,
        y: from.y,
        z: from.z
    };
    const s = gap / d;
    return {
        x: from.x + dx * s,
        y: from.y + dy * s,
        z: from.z + dz * s
    };
}
export function followStep(i) {
    const { boy, girl, dt } = i;
    const d0 = dist(boy, girl);
    if (d0 > SNAP) {
        const t = enforceGap(followTarget(girl, i.heading), girl);
        const pos = i.airborne || !i.groundAt ? t : {
            ...t,
            y: i.groundAt(t.x, t.z)
        };
        return {
            pos: enforceGap(pos, girl),
            speed: 0,
            tension: 0
        };
    }
    const target = followTarget(girl, i.heading);
    const dx = target.x - boy.x, dz = target.z - boy.z;
    const dh = Math.hypot(dx, dz);
    const hurry = d0 > LEASH ? 2.2 : 1;
    const want = Math.min(i.speed + dh * 2.4, Math.max(i.speed * 1.5, 5) * hurry);
    const step = Math.min(dh, want * dt);
    let x = boy.x, z = boy.z;
    if (dh > 1e-4) {
        x += dx / dh * step;
        z += dz / dh * step;
    }
    let pos;
    if (i.airborne) {
        const y = boy.y + (target.y - boy.y) * Math.min(1, dt * 3);
        pos = enforceGap({
            x,
            y,
            z
        }, girl);
    } else {
        const flat = enforceGap({
            x,
            y: girl.y,
            z
        }, girl);
        pos = {
            x: flat.x,
            y: i.groundAt ? i.groundAt(flat.x, flat.z) : girl.y,
            z: flat.z
        };
    }
    const moved = Math.hypot(pos.x - boy.x, pos.z - boy.z);
    return {
        pos,
        speed: dt > 0 ? moved / dt : 0,
        tension: Math.min(1, Math.max(0, (dist(pos, girl) - IDEAL_GAP) / (LEASH - IDEAL_GAP)))
    };
}
