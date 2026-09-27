import type * as THREE from 'three';
import type { RegionId } from '../regions';

/**
 * MODEL CONTRACT (3D side — docs/team/handoffs/CHATGPT_3D_MODELS.md §20): the inside of a building,
 * as a scene the travellers step into (like the house rooms in housing/HouseInterior.ts).
 *
 * Return a group with the floor at y = 0 and the way in at +z, plus where the two travellers sit
 * (two seats at least 2.2 m apart — they never touch), where others stand (at least 1.5 m from both
 * seats), an optional spot for something to gather, and where the camera stands and looks.
 * Return null to fall back to the standard room (the game does, until a model exists).
 *
 * PLACEHOLDER: returns null for everything.
 */
export type InteriorKind = 'landmark' | 'castle' | 'institute' | 'penthouse' | 'cavern';

export interface InteriorSpec {
  kind: InteriorKind;
  land: RegionId;
  /** Which one: the institute kind, the cave style, … */
  ref?: string;
  /** Institute stage (0–3). */
  stage?: number;
  /** 0 by day … 1 at night (what the windows show, how lamps glow). */
  night: number;
  seed: string;
}

export interface InteriorBuild {
  group: THREE.Group;
  /** The room's extent (m), for the camera and for keeping people inside. */
  room: { halfW: number; back: number; front: number; height: number };
  /** Where the girl and the boy sit or stand: [x, y, z], at least 2.2 m apart. */
  seats: [[number, number, number], [number, number, number]];
  /** Where hosts, staff, students, patients or residents stand: [x, z]. */
  spots: Array<[number, number]>;
  gather?: [number, number, number];
  camera: { pos: [number, number, number]; look: [number, number, number] };
}

export function buildInterior(spec: InteriorSpec): InteriorBuild | null {
  void spec;
  return null;
}
