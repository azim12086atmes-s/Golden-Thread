/**
 * Anatomy rules shared by every person and animal model.
 *
 * Two invariants from the brief, enforced here and tested in tests/anatomy.test.ts:
 *  1. No character or animal has eyes. Owner-approved glasses, beard and hair are permitted (GT-CHAR-001).
 *  2. Every head floats, detached from the body.
 *
 * Model builders tag each mesh with `userData.part`. Only parts listed in ALLOWED_PARTS may be
 * built; the test walks real models and fails on anything else.
 */

/** Vertical gap between the top of the neck/body and the bottom of the head, in metres. */
export const HEAD_GAP = 0.16;
/** Animals are wider; their floating gap is measured horizontally from the chest as well. */
export const ANIMAL_HEAD_GAP = 0.12;

export const ALLOWED_PARTS = [
  'head', 'headwear', 'torso', 'garment', 'sleeve', 'hand', 'leg', 'foot', 'trim',
  'glasses', 'beard', 'hair', 'cape', 'accessory', 'body', 'tail', 'ear', 'horn', 'mane', 'wing', 'hoof', 'neck',
] as const;
export type Part = (typeof ALLOWED_PARTS)[number];

/** Never build any of these. Listed so the test can name what it forbids. */
export const FORBIDDEN_PARTS = ['eye', 'pupil', 'iris', 'eyelid', 'eyebrow', 'lash', 'mouth', 'nose', 'face', 'lip'] as const;

export function isAllowedPart(p: unknown): p is Part {
  return typeof p === 'string' && (ALLOWED_PARTS as readonly string[]).includes(p);
}
