import type { GameState } from '../core/state';

/**
 * The story told before the journey begins, and kept in the journal: what happened to the world,
 * who the two travellers are, what they set out to do, how to live on the road, and what there
 * is to find. Plain words; the page shows it as a storybook.
 */
export interface Page { eyebrow: string; title: string; lines: string[] }

export function prologue(st: GameState): Page[] {
  const { girl, boy } = st.names;
  return [
    {
      eyebrow: 'Long ago',
      title: 'A world of twenty lanterns',
      lines: [
        'In every land, a great lantern burned. It did not run on oil or fire.',
        'It shone because people shared bread with strangers, wrote to faraway friends, and helped without being asked.',
      ],
    },
    {
      eyebrow: 'Then',
      title: 'The lanterns grew dim',
      lines: [
        'People grew busy. Neighbours stopped visiting, letters went unwritten, and nobody noticed the lonely.',
        'One by one the lanterns dimmed, and far above the clouds the Great Lantern fell asleep.',
      ],
    },
    {
      eyebrow: 'Our travellers',
      title: `${girl} and ${boy}`,
      lines: [
        `${girl} and ${boy} are promised to each other. A golden thread joins them that no one else can see.`,
        'It glows brighter with every kind thing they do together — and it gives them the light to fly.',
      ],
    },
    {
      eyebrow: 'The main objective',
      title: 'Relight the world',
      lines: [
        'Travel all twenty lands. In each, find its Keeper, learn their craft, and make something someone truly needs. Then light the land\'s lantern together.',
        'Light enough lanterns and climb to the Sky Isles to wake the Great Lantern. The golden motes and the objective card will always show you the next step.',
      ],
    },
    {
      eyebrow: 'The way of the thread',
      title: 'How to live on the road',
      lines: [
        'Be kind first, and help whoever you meet — a small errand can change someone\'s whole day.',
        'Make things with your hands, and give them away. Share what you have. Keep your promises.',
        'Care for animals and the land. Be patient, be honest, and be grateful for each day. Write back to your friends.',
      ],
    },
    {
      eyebrow: 'The world is wide',
      title: 'Things to find and do',
      lines: [
        'Nineteen hidden wonders lie off the roads, one in every land below the clouds — look for a faint rising sparkle in the hills.',
        'Earn your way by making and trading. Buy land or a ready-made home (Homes, L), build, farm and keep animals. Decorate Safar, your van.',
        'Ride unicorns, fly with the cape of light — and, one special evening, meet a dragon.',
      ],
    },
    {
      eyebrow: 'You will not travel alone',
      title: 'The caravan',
      lines: [
        'Rosie and Teo, two children from the meadow, travel with you with their families\' blessing — each going to family or to learn a craft far away. Pip the sheepdog and Clover the kitten come too.',
        'More children join as you help their lands; every one of them goes home safely at the end of their road.',
      ],
    },
  ];
}
