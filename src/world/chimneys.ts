import * as THREE from 'three';
import type { GeoBuilder } from './kit';

/**
 * Where smoke rises: every chimney pot, stovepipe and tent smoke-hole is recorded as it is built
 * (in the builder's frame, so it lands wherever the house stands and however it turns). The
 * region builder collects them for the land; Atmos.ts sends wisps of smoke up from them in the
 * morning and evening, and all day in the cold lands.
 */
let sink: THREE.Vector3[] | null = null;
let fires: THREE.Vector3[] | null = null;

/** Start collecting chimney tops and open fires (the region builder, before its houses). */
export function collectChimneys(): void {
  sink = [];
  fires = [];
}

/** Stop collecting and hand over what was recorded (region-local coordinates). */
export function takeChimneys(): { smoke: THREE.Vector3[]; fires: THREE.Vector3[] } {
  const out = { smoke: sink ?? [], fires: fires ?? [] };
  sink = fires = null;
  return out;
}

/** An open fire at (x, y, z) in `g`'s frame: it lights the ground round it, and (in the open) smoke rises from it. */
export function fireAt(g: GeoBuilder, x: number, y: number, z: number, smoke = true): void {
  if (!sink || !fires) return;
  const p = new THREE.Vector3(x, y, z).applyMatrix4(g.top);
  if (smoke) sink.push(p.clone().setY(p.y + 0.8));
  fires.push(p);
}

/** Record a chimney top at (x, y, z) in `g`'s current frame. */
export function chimneyTop(g: GeoBuilder, x: number, y: number, z: number): void {
  if (sink) sink.push(new THREE.Vector3(x, y, z).applyMatrix4(g.top));
}
