import { COMPANION_BY_ID } from '../caravan/caravan';
import type { GameState } from '../core/state';
import { VEHICLES, type VehicleDef } from '../vehicles/vehicles';
import { WONDERS } from '../world/wonders';

/**
 * "Your journey": the objectives of the game and everything there is to do — shown after the
 * opening story and kept in Help. Pure data so it can never drift from the game: vehicles and
 * the caravan are read from their own tables.
 */
export interface Card { icon: string; title: string; text: string; how?: string }

export function objectives(st: GameState): Card[] {
  const { girl } = st.names;
  return [
    { icon: '🧭', title: 'Live life together', text: `${girl}'s new job is one step, not the destination. Keep exploring while you live: own a home, earn by helping, learn new skills, become part of the people you meet, and stay connected to home.`, how: 'Homes (L) · Messages (N) · every Keeper teaches a craft.' },
    { icon: '🏮', title: 'Relight the twenty lanterns', text: 'In every land, meet its Keeper, learn their craft, make what they need and light the lantern together. Then wake the Great Lantern above the clouds.', how: 'Follow the objective card and the golden motes.' },
    { icon: '🧰', title: 'Work and solve problems', text: 'People everywhere need help — a delivery, a repair, a meal, a letter. Earn your living by helping, and learn a new skill with every task.', how: 'Talk to anyone marked ❗ (E). Craft in your bag (I).' },
    { icon: '🎉', title: `Celebrate ${girl}'s new job`, text: 'A special evening at the castle in the meadow: a unicorn chariot, a gown from the wardrobe, guests from every land.', how: 'A chariot waits beside you — press E.' },
    { icon: '✨', title: 'Explore', text: `${WONDERS.length} hidden wonders lie off the roads, one in every land below the clouds. Every town has markets, people and stories.`, how: 'Look for a rising sparkle in the hills. The journal (J) has hints.' },
    { icon: '💛', title: 'Bond with everyone', text: 'Friends write to you, remember you and ask for help again. The golden thread shines brighter with every kindness.', how: 'Messages (N). Reply to your friends.' },
  ];
}

function unlock(v: VehicleDef): string {
  if (v.requires?.flag === 'celebration-done') return 'After the celebration evening';
  if (v.requires?.flag === 'unicorns') return 'Befriend the unicorns in the meadow';
  if (v.requires?.lanterns) return `Light ${v.requires.lanterns} lanterns, then ${v.price} coins`;
  if (v.price > 0) return `${v.price} coins`;
  return 'Yours from the start';
}

export function features(st: GameState): Card[] {
  const pals = st.caravan.map((id) => COMPANION_BY_ID[id]).filter(Boolean);
  const kids = pals.filter((c) => c.kind === 'child').map((c) => c.name);
  const pets = pals.filter((c) => c.kind === 'pet').map((c) => c.name);
  const cards: Card[] = [
    { icon: '🧒', title: 'Children', text: `${kids.join(' and ') || 'Children'} travel with you, with their families' blessing — each going to family or to learn a craft. More join as you help their lands.`, how: 'Walk up and press E to chat.' },
    { icon: '🐾', title: 'Pets', text: `${pets.join(' and ') || 'Pets'} come too. Befriend animals everywhere with the food they like; give them a home on your land.`, how: 'Press E near an animal.' },
  ];
  for (const v of Object.values(VEHICLES)) {
    if (v.id === 'walk') continue;
    cards.push({ icon: v.icon, title: v.name, text: v.blurb, how: unlock(v) });
  }
  cards.push(
    { icon: '🏡', title: 'Homes & land', text: 'Buy bare land or a ready-made home in any land. Build, farm, keep animals.', how: 'Homes (L) · build with B on your land.' },
    { icon: '👗', title: 'Dressing room', text: 'Outfits from every culture, plus fusion designs — all fully covering.', how: 'Press C.' },
    { icon: '🚐', title: 'Inside Safar', text: 'Decorate your van with things you make.', how: 'Walk to the van and press E.' },
  );
  return cards;
}
