import type { GameState } from '../core/state';
import { REGION_BY_ID } from '../world/regions';
import { storyline } from './storyline';

/**
 * The story told before the journey begins, and kept in the journal: what happened to the world,
 * who the two travellers are, what they set out to do, how to live on the road, and what there
 * is to find. Plain words; the page shows it as a storybook.
 */
export interface Page { eyebrow: string; title: string; lines: string[] }

export function prologue(st: GameState): Page[] {
  const film: Page[] = storyline(st).map((shot, i, all) => ({
    eyebrow: i === all.length - 1 ? 'The main objective' : `Chapter ${i + 1} · ${REGION_BY_ID[shot.land].name}`,
    title: shot.lines[0],
    lines: shot.lines.slice(1),
  }));
  return [
    ...film,
    {
      eyebrow: 'The way of the thread',
      title: 'How to live on the road',
      lines: [
        'Be kind first, and help whoever you meet — a small errand can change someone\'s whole day.',
        'Do honest work, and do it well. Make things with your hands, and give them away. Share what you have. Keep your commitments.',
        'Keep learning: every Keeper, stallholder and neighbour can teach you a skill, and every skill lets you help someone new.',
        'Care for animals and the land. Be patient, be honest, and be grateful for each day. Write back to your friends, and never lose the way home.',
      ],
    },
    {
      eyebrow: 'The world is wide',
      title: 'Things to find and do',
      lines: [
        'Nineteen hidden wonders lie off the roads, one in every land below the clouds — look for a faint rising sparkle in the hills.',
        'Earn your way by making and trading. Buy land or a ready-made home (Homes, L), build, farm and keep animals. Decorate Safar, your van.',
      ],
    },
  ];
}
