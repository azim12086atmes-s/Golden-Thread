import type { SkillId } from '../economy/items';
import type { RegionId } from '../world/regions';

/**
 * Every institute the travellers can found, join or grow (owner's brief — NEXT_WORK C2 and C7):
 * each land's own science, and the institutions of care and learning found everywhere. Each
 * grows in four stages, and every stage is a real building of its own (modelled in
 * src/world/institutes.ts from docs/team/handoffs/3D_BUILDS_HANDOFF.md §3.7): the Swiss watchmaker
 * begins as a boutique and grows to a school of watchmaking.
 *
 * Pure data; the rules (founding, building stage by stage, staffing, services) live in
 * institutions.ts.
 */

export type InstituteKind =
  // Each land's own science.
  | 'magic' | 'tea' | 'celadon' | 'tcm' | 'shipwright' | 'watchmaking' | 'engineering' | 'tech' | 'anatomy' | 'radio'
  | 'islamicsciences' | 'navigation' | 'irrigation' | 'starlore' | 'ayurveda' | 'siddha' | 'gardens' | 'subak' | 'polar' | 'lightcraft'
  // Care and learning, in every land.
  | 'kitchen' | 'clinic' | 'school' | 'library';

export interface Stage {
  name: string;
  /** What it looks like and does (for the modeller and the player). */
  what: string;
  /** Build cost: coins, or goods (in kind), and days to build. */
  coins: number;
  goods: Record<string, number>;
  days: number;
  /** Skill level the person running it needs (the player, a hire, or someone sponsored and taught). */
  level: number;
  /** Largest footprint radius of the building at this stage (m). */
  radius: number;
}

export interface InstituteDef {
  kind: InstituteKind;
  name: string;
  /** Land whose science it is (null: found in every land, built in that land's style). */
  land: RegionId | null;
  skill: SkillId;
  /** A line for the player about what this science is. */
  blurb: string;
  stages: [Stage, Stage, Stage, Stage];
}

const RADII = [5, 8, 12, 16] as const;
const S = (i: 0 | 1 | 2 | 3, name: string, what: string, coins: number, goods: Record<string, number>): Stage =>
  ({ name, what, coins, goods, days: [1, 2, 3, 5][i], level: [1, 2, 3, 4][i], radius: RADII[i] });
const D = (kind: InstituteKind, name: string, land: RegionId | null, skill: SkillId, blurb: string, st: [string, string][], goods: string): InstituteDef => ({
  kind, name, land, skill, blurb,
  stages: st.map(([n, w], i) => S(i as 0 | 1 | 2 | 3, n, w, [80, 220, 520, 1100][i], { wood: [6, 14, 24, 40][i], [goods]: [2, 4, 8, 12][i] })) as InstituteDef['stages'],
});

export const INSTITUTES: InstituteDef[] = [
  D('magic', 'Wizardry', 'meadow', 'lampcraft', 'The gentle magic of the Meadow: light, growth and flight.', [
    ['Potion stall', 'A striped stall of bottled light and herbs under a pennant.'],
    ['Wand-maker’s workshop', 'A crooked timber workshop with a glowing kiln and shelves of wands.'],
    ['Guild hall of magic', 'A tall fairy-tale hall with a turret, stained-glass windows and floating lanterns.'],
    ['Castle school of wizardry', 'A castle school with towers, a great hall of floating candles, a library tower and an observatory.'],
  ], 'wildflower'),
  D('tea', 'Tea and joinery', 'japan', 'carpentry', 'The Way of Tea and the joiner’s art of wood without nails.', [
    ['Tea stall', 'A small wooden tea stall with a noren curtain and a bench.'],
    ['Tea house', 'A sukiya tea house with a garden path of stepping stones.'],
    ['Joinery workshop', 'A long timber workshop showing interlocking joints, with a tiled roof.'],
    ['Academy of craft', 'A courtyard academy of halls and a pagoda-roofed gate.'],
  ], 'cedar'),
  D('celadon', 'Celadon and printing', 'korea', 'pottery', 'Jade-green celadon and the movable-type printing of old Korea.', [
    ['Potter’s stall', 'A stall of jade-green pots on a stone base.'],
    ['Kiln house', 'A climbing kiln (a long sloping chamber) beside a hanok workshop.'],
    ['Printing house', 'A hanok hall with type cases, presses and hanji drying racks.'],
    ['Royal academy', 'A courtyard academy (seowon) of hanok halls with a lecture hall.'],
  ], 'hanji'),
  D('tcm', 'Chinese medicine', 'china', 'medicine', 'Herbal medicine, acupuncture and the balance of the body.', [
    ['Herb stall', 'A red-pillared stall of drawers and jars of herbs.'],
    ['Apothecary', 'A shophouse with a wall of wooden herb drawers and a gallery above.'],
    ['Clinic of medicine', 'A courtyard clinic with treatment rooms and a herb garden.'],
    ['Academy of medicine', 'A hall on a stone terrace with a library, herb gardens and lecture halls.'],
  ], 'ginseng'),
  D('shipwright', 'Shipbuilding and fisheries', 'norway', 'carpentry', 'Clinker-built boats, fisheries and the sea.', [
    ['Boat shed', 'A small timber boat shed on the water with a boat on trestles.'],
    ['Boatyard', 'A slipway with a half-built hull and a sail loft.'],
    ['Shipyard', 'A large timber shipyard hall and a harbour crane.'],
    ['Maritime school', 'A Bryggen-style school with a model-ship hall and a lighthouse.'],
  ], 'birch'),
  D('watchmaking', 'Watchmaking', 'switzerland', 'mechanics', 'Precision watches and clocks from the Alps.', [
    ['Watch boutique', 'A small chalet-front shop with a clock sign and a display window of watches.'],
    ['Atelier', 'A workshop of benches under big windows, a turret clock on the roof.'],
    ['Manufacture', 'A long factory with many windows, a clock tower and a courtyard.'],
    ['School of watchmaking', 'A stately stone school with a great clock face and an observatory dome.'],
  ], 'gear'),
  D('engineering', 'Engineering', 'london', 'mechanics', 'Engines, clocks, bridges and the Royal Institution.', [
    ['Repair shop', 'A shopfront with gears in the window and a hanging sign.'],
    ['Workshop', 'A brick workshop with a skylight roof and a chimney.'],
    ['Engine works', 'A brick works hall with arched windows, a chimney and a crane.'],
    ['Institution of engineers', 'A columned Victorian institution with a lecture theatre dome.'],
  ], 'gear'),
  D('tech', 'Technology', 'newyork', 'software', 'Computing, renewable energy and biotech.', [
    ['Garage start-up', 'A garage with a roll-up door, desks and a neon sign.'],
    ['Studio', 'A loft studio with solar panels and a green wall.'],
    ['Company tower', 'A glass tower with sky gardens and a display screen crown.'],
    ['Research campus', 'A campus of glass labs, a solar dome and a sky bridge.'],
  ], 'scrap'),
  D('anatomy', 'Art and anatomy', 'renaissance', 'calligraphy', 'Drawing from life, optics and architecture.', [
    ['Painter’s bottega', 'A small shop with easels at the open front.'],
    ['Workshop of the masters', 'A palazzo ground floor workshop with a courtyard.'],
    ['Academy of drawing', 'A palazzo with a loggia and a skylit drawing hall.'],
    ['University', 'An arcaded courtyard university with a dome and a tower.'],
  ], 'marble'),
  D('radio', 'Radio and electronics', 'vintage', 'hardware', 'Valve radios, telephones and early electronics.', [
    ['Radio repair stall', 'A booth with radios on shelves and an aerial.'],
    ['Radio shop', 'A Painted-Lady shopfront with a tall aerial mast.'],
    ['Broadcasting house', 'A deco broadcasting house with a transmitter mast.'],
    ['Institute of electronics', 'A campus with a dish antenna and labs.'],
  ], 'spool'),
  D('islamicsciences', 'Islamic sciences', 'islamic', 'research', 'Astronomy, optics, algebra, medicine and great libraries (the House of Wisdom).', [
    ['Bookseller', 'A small arched shop of books and calligraphy.'],
    ['Library', 'A riad library with a courtyard fountain and shelves of books.'],
    ['Madrasa', 'A madrasa courtyard with arcades, a prayer hall and students’ rooms.'],
    ['University and observatory', 'A great courtyard university (like al-Qarawiyyin) with an observatory tower.'],
  ], 'clay'),
  D('navigation', 'Navigation and water', 'middleeast', 'mechanics', 'Star navigation, wind towers, falconry and desalination.', [
    ['Chart-maker’s stall', 'A stall of maps and astrolabes under an awning.'],
    ['Navigators’ house', 'A coral-stone house with a wind tower and a roof terrace of instruments.'],
    ['Water works', 'A cistern and falaj channel works with a wind tower.'],
    ['School of the sea and stars', 'A courtyard school with an observatory and a harbour.'],
  ], 'incense'),
  D('irrigation', 'Surveying and irrigation', 'egypt', 'building', 'The Nile’s gift: surveying, irrigation and papyrus.', [
    ['Papyrus stall', 'A reed stall of papyrus sheets.'],
    ['Scribes’ house', 'A Nubian house of scribes with painted walls.'],
    ['Nilometer and water works', 'A stepped nilometer well and shaduf water lifts.'],
    ['House of life', 'A temple-like school of columns, a library and gardens.'],
  ], 'papyrus'),
  D('starlore', 'Star lore and water finding', 'desert', 'research', 'Finding water and the way by the stars.', [
    ['Storyteller’s rug', 'A rug under a shade cloth where the stars are taught.'],
    ['Tent school', 'A long open tent with a board and cushions.'],
    ['Well house', 'A stone well house with a windlass and troughs.'],
    ['Oasis academy', 'Tents and mud-brick halls round an oasis with a star-watching tower.'],
  ], 'dates'),
  D('ayurveda', 'Ayurveda and astronomy', 'indianorth', 'medicine', 'Ayurvedic healing, textiles and the Jantar Mantar instruments.', [
    ['Herb garden', 'A walled herb garden with a small shrine-like pavilion (no idols) and a well.'],
    ['Vaidya’s dispensary', 'A haveli shop with jars of remedies and a jharokha above.'],
    ['Ayurvedic clinic', 'A courtyard haveli clinic with treatment rooms.'],
    ['College and observatory', 'A college with Jantar Mantar–style giant instruments.'],
  ], 'spice'),
  D('siddha', 'Siddha and spices', 'indiasouth', 'medicine', 'Siddha medicine, spice agronomy and temple engineering.', [
    ['Spice stall', 'A stall of spice baskets under a palm-leaf roof.'],
    ['Spice house', 'A Kerala trading house with a tiled roof and drying yard.'],
    ['Siddha clinic', 'A nalukettu courtyard clinic.'],
    ['College', 'A college of tiled halls round a tank.'],
  ], 'coconut'),
  D('gardens', 'Garden hydraulics and miniature art', 'mughal', 'gardening', 'Water gardens, miniature painting and fine architecture.', [
    ['Painter’s kiosk', 'A small chhatri kiosk with a painter’s table.'],
    ['Atelier', 'A sandstone atelier with jali windows.'],
    ['Water garden works', 'Fountains, a pumping pavilion and channels.'],
    ['Academy of arts', 'A marble academy round a charbagh with a pishtaq portal.'],
  ], 'rose'),
  D('subak', 'Rice terraces and batik', 'indonesia', 'weaving', 'The subak water temples of the terraces, batik and boat building.', [
    ['Batik stall', 'A bale stall hung with batik cloths.'],
    ['Batik house', 'A workshop bale with wax pots and dye vats.'],
    ['Water temple works', 'A subak water-sharing works of channels and a meeting pavilion.'],
    ['Academy of the terraces', 'Bale halls on stepped terraces with a split gate.'],
  ], 'rattan'),
  D('polar', 'Polar science', 'aurora', 'research', 'Weather, the aurora and reindeer herding.', [
    ['Weather hut', 'A small hut with a wind vane and instruments.'],
    ['Reindeer station', 'A log station with pens and sledges.'],
    ['Aurora observatory', 'A domed observatory on stilts.'],
    ['Polar institute', 'Glass-roofed halls for watching the sky.'],
  ], 'ice'),
  D('lightcraft', 'Lightcraft', 'skyisles', 'lampcraft', 'The science of light and the Great Lantern.', [
    ['Lamp kiosk', 'A moonstone kiosk of glowing lamps.'],
    ['Light workshop', 'A spire workshop with prisms in its windows.'],
    ['Prism hall', 'A domed hall splitting light into rainbows.'],
    ['College of light', 'Spires on floating isles joined by bridges.'],
  ], 'stardust'),
  // Care and learning, found in every land, built in that land's style.
  D('kitchen', 'Soup kitchen', null, 'cooking', 'Meals for anyone who is hungry.', [
    ['Soup stall', 'A stall with a big pot and a queue.'],
    ['Soup kitchen', 'A kitchen with long tables inside and at the door.'],
    ['Community kitchen', 'A large kitchen hall with a dining hall and a pantry.'],
    ['Food bank and kitchen', 'A kitchen, dining hall and a food bank warehouse.'],
  ], 'wheat'),
  D('clinic', 'Clinic', null, 'medicine', 'Care for the sick: a clinic that grows into a hospital.', [
    ['First-aid post', 'A small post with a bed and a medicine cupboard.'],
    ['Clinic', 'A clinic with a waiting room and treatment rooms.'],
    ['Health centre', 'A health centre with wards and a pharmacy.'],
    ['Hospital', 'A hospital of wards, a garden courtyard and an entrance for carts and vehicles.'],
  ], 'herbs'),
  D('school', 'School', null, 'teaching', 'Learning for children and grown-ups alike — from a tent school to a university.', [
    ['Tent school', 'An open tent with a board, mats and cushions.'],
    ['School', 'A schoolhouse with classrooms and a yard.'],
    ['Madrasa / college', 'A courtyard college of classrooms, a library and a hall.'],
    ['University', 'A campus of halls, a library and a quadrangle.'],
  ], 'hanji'),
  D('library', 'Library', null, 'research', 'Books for everyone: knowledge kept and shared.', [
    ['Reading corner', 'A small kiosk of shelves and benches.'],
    ['Library', 'A library room with tall shelves and reading tables.'],
    ['Great library', 'A domed reading hall with galleries.'],
    ['House of wisdom', 'A great library with archives, a translation hall and an observatory.'],
  ], 'papyrus'),
];

export const INSTITUTE_BY_KIND: Record<InstituteKind, InstituteDef> = Object.fromEntries(INSTITUTES.map((d) => [d.kind, d])) as Record<InstituteKind, InstituteDef>;

/** The institutes a land offers: its own science and the four found everywhere. */
export const institutesOf = (land: RegionId): InstituteDef[] => INSTITUTES.filter((d) => d.land === land || d.land === null);
