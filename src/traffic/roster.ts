import type { RegionId } from '../world/regions';

/**
 * What travels in each land, and how many of each: its roads (the four avenues and the ring
 * road), its waters (lakes, ponds and river) and its skies. Every land mixes the modern and the
 * traditional with something of its own — the festival dragon over the Jade Terraces, sky koi
 * over Sakura Hollow, the golden sun-barque over the Nile, the Pushpaka vimana over Gulabi Nagar,
 * whales and sky ships above the clouds. Pure data: Traffic draws it, tests check it.
 */
export interface Roster {
  road: Array<[string, number]>;
  water: Array<[string, number]>;
  sky: Array<[string, number]>;
}

const R = (road: Array<[string, number]>, water: Array<[string, number]>, sky: Array<[string, number]>): Roster => ({ road, water, sky });

export const LAND_TRAFFIC: Record<RegionId, Roster> = {
  meadow: R([['pumpkin-coach', 2], ['flower-cart', 3], ['vardo', 2], ['carriage', 2], ['hatchback', 2], ['vintage-car-2', 2], ['hover-car-2', 2]],
    [['swan-boat', 3], ['swans', 2], ['ducks', 2], ['raft', 1], ['catboat', 1]],
    [['pegasi', 1], ['unicorns-flying', 1], ['little-dragons', 1], ['sky-ship', 1], ['phoenix', 1], ['airship', 1], ['biplane', 1], ['airliner', 1]]),
  japan: R([['streetcar', 2], ['kei-van', 4], ['taxi', 3], ['hatchback-2', 3], ['sedan', 3], ['future-ev-2', 2], ['city-bus', 1]],
    [['yakatabune', 2], ['sampan', 2], ['raft', 1], ['ducks', 1]],
    [['sky-koi', 1], ['sky-koi-2', 1], ['cranes', 2], ['light-plane', 1], ['airliner-2', 1], ['drone', 1]]),
  korea: R([['city-bus', 2], ['taxi', 4], ['sedan-2', 3], ['suv', 3], ['hatchback', 2], ['future-ev', 2]],
    [['turtle-ship', 1], ['sampan', 2], ['fishing-boat', 1], ['ducks', 1]],
    [['cranes', 2], ['light-plane', 1], ['airliner', 1], ['drone', 1], ['biplane-2', 1]]),
  china: R([['red-bus', 2], ['tuk-tuk-2', 3], ['taxi', 3], ['sedan', 3], ['future-ev', 3], ['hover-car', 2]],
    [['junk', 2], ['dragon-boat', 2], ['sampan', 2], ['raft', 1]],
    [['festival-dragon', 1], ['cranes', 1], ['airliner-2', 1], ['drone', 2], ['air-taxi-2', 1]]),
  norway: R([['nordic-car', 4], ['city-bus', 2], ['future-ev-2', 3], ['suv-2', 3], ['pickup', 2]],
    [['longship', 1], ['fishing-boat', 3], ['kayak', 2], ['ferry', 1]],
    [['seaplane', 1], ['eagle', 2], ['airliner', 1], ['light-plane', 1]]),
  switzerland: R([['post-bus', 3], ['nordic-car', 2], ['vintage-car', 2], ['suv', 3], ['future-ev', 2], ['hatchback-2', 2]],
    [['paddle-steamer', 1], ['catboat', 2], ['swans', 2], ['kayak', 1]],
    [['zeppelin', 1], ['eagle', 1], ['light-plane', 1], ['airliner-2', 1], ['biplane-2', 1]]),
  london: R([['double-decker', 5], ['black-cab', 6], ['sedan-2', 3], ['hatchback', 2], ['carriage', 1], ['future-ev', 2]],
    [['narrowboat', 3], ['punt', 2], ['swans', 2], ['ducks', 1]],
    [['airship', 1], ['pigeons', 2], ['airliner', 1], ['light-plane', 1], ['biplane', 1]]),
  newyork: R([['solar-tram', 3], ['solar-cab', 6], ['hover-car', 3], ['hover-car-2', 2], ['future-ev', 3], ['hover-bus', 2], ['suv', 2]],
    [['ferry', 2], ['yacht', 2], ['tall-ship', 1]],
    [['air-taxi', 3], ['air-taxi-2', 2], ['drone', 3], ['solar-blimp', 1], ['sky-jet', 1], ['airliner', 1]]),
  renaissance: R([['carriage', 3], ['caleche', 2], ['vintage-car', 2], ['hatchback', 4], ['sedan', 2]],
    [['gondola', 4], ['punt', 1], ['swans', 1]],
    [['ornithopter', 2], ['pigeons', 1], ['airship', 1], ['light-plane', 1]]),
  vintage: R([['cable-car', 3], ['vintage-car', 4], ['vintage-car-2', 4], ['pickup', 2], ['sedan', 2]],
    [['catboat', 2], ['yacht', 1], ['tall-ship', 1], ['ducks', 1]],
    [['biplane', 1], ['biplane-2', 1], ['zeppelin', 1], ['light-plane', 1], ['pigeons', 1]]),
  islamic: R([['petit-taxi', 5], ['caleche', 2], ['donkey-cart', 2], ['sedan', 3], ['hatchback-2', 2]],
    [['dhow', 2], ['abra', 1], ['raft', 1], ['ducks', 1]],
    [['flying-carpet', 2], ['flying-carpet-2', 1], ['pigeons', 2], ['airliner-2', 1]]),
  middleeast: R([['camel-caravan', 2], ['land-cruiser', 4], ['suv', 2], ['hover-car', 2], ['future-ev-2', 2], ['taxi', 2]],
    [['dhow', 2], ['abra', 2]],
    [['flying-carpet', 1], ['flying-carpet-2', 1], ['falcons', 2], ['airliner', 1], ['air-taxi', 1]]),
  egypt: R([['camel-caravan', 1], ['donkey-cart', 3], ['caleche', 2], ['taxi', 3], ['pickup', 2], ['sedan-2', 2]],
    [['felucca', 4], ['reed-boat', 2], ['raft', 1]],
    [['sun-barque', 1], ['falcons', 1], ['airliner-2', 1], ['light-plane', 1]]),
  desert: R([['camel-caravan', 3], ['dune-buggy', 4], ['land-cruiser', 3], ['pickup', 2], ['hover-car', 2]],
    [['reed-boat', 1], ['raft', 1]],
    [['roc', 1], ['falcons', 2], ['flying-carpet', 1], ['airliner', 1]]),
  indianorth: R([['auto-rickshaw', 5], ['auto-rickshaw-2', 3], ['painted-truck', 2], ['bullock-cart', 2], ['elephant', 1], ['hatchback', 3], ['suv-2', 2]],
    [['ganga-boat', 3], ['raft', 1], ['ducks', 1]],
    [['pushpaka', 1], ['pigeons', 2], ['airliner-2', 1], ['light-plane', 1]]),
  indiasouth: R([['auto-rickshaw', 5], ['bullock-cart', 3], ['painted-truck', 2], ['elephant', 1], ['sedan', 2], ['future-ev', 2]],
    [['kettuvallam', 2], ['snake-boat', 1], ['raft', 2], ['ducks', 1]],
    [['peacock-garuda', 1], ['cranes', 1], ['airliner', 1], ['light-plane', 1]]),
  mughal: R([['tonga', 3], ['elephant', 2], ['auto-rickshaw-2', 3], ['sedan-2', 3], ['hatchback', 2]],
    [['shikara', 4], ['swans', 1], ['ducks', 1]],
    [['pigeons', 3], ['flying-carpet', 1], ['phoenix', 1], ['airliner-2', 1]]),
  indonesia: R([['bemo', 3], ['tuk-tuk', 3], ['buffalo-cart', 2], ['hatchback-2', 3], ['suv-2', 2], ['future-ev-2', 1]],
    [['jukung', 4], ['phinisi', 1], ['raft', 2]],
    [['janggan', 2], ['peacock-garuda', 1], ['cranes', 1], ['airliner', 1]]),
  aurora: R([['reindeer-sled', 3], ['dog-sled', 3], ['snowmobile', 4], ['suv', 2], ['pickup', 1]],
    [['kayak', 3], ['fishing-boat', 1]],
    [['owls', 2], ['airship', 1], ['seaplane', 1], ['eagle', 1]]),
  skyisles: R([],
    [],
    [['sky-whale', 2], ['sky-ship', 2], ['crystal-skiff', 2], ['light-birds', 3], ['unicorns-flying', 1], ['pegasi', 1], ['solar-blimp', 1]]),
};

/**
 * Ships on each coastal land's sea lane (world/harbours.ts), and the ship its shipping line
 * charters. Each entry names the ship wanted (CHATGPT_3D_MODELS.md §12.4) and what sails in its
 * place until the 3D side builds it: `resolveShip` picks whichever exists.
 */
export const SEA_TRAFFIC: Partial<Record<RegionId, Array<[string, string, number]>>> = {
  aurora: [['research-vessel', 'fishing-boat', 1], ['fishing-trawler', 'fishing-boat', 2], ['hurtigruten', 'ferry', 1]],
  norway: [['hurtigruten', 'ferry', 1], ['fishing-trawler', 'fishing-boat', 2], ['ferry-large', 'ferry', 1], ['longship', 'longship', 1]],
  switzerland: [['ferry-large', 'paddle-steamer', 1], ['cargo-ship', 'ferry', 1], ['yacht', 'yacht', 1]],
  london: [['ocean-liner', 'tall-ship', 1], ['cargo-ship', 'ferry', 1], ['ferry-large', 'ferry', 1], ['tall-ship', 'tall-ship', 1]],
  newyork: [['cruise-ship', 'ferry', 1], ['container-ship', 'ferry', 1], ['cargo-ship', 'ferry', 1], ['yacht', 'yacht', 2]],
  korea: [['cargo-ship', 'ferry', 1], ['turtle-ship', 'turtle-ship', 1], ['fishing-trawler', 'fishing-boat', 2]],
  vintage: [['ocean-liner', 'tall-ship', 1], ['tall-ship', 'tall-ship', 1], ['yacht', 'yacht', 1], ['catboat', 'catboat', 1]],
  china: [['junk-large', 'junk', 2], ['container-ship', 'ferry', 1], ['sampan', 'sampan', 1]],
  middleeast: [['dhow-large', 'dhow', 2], ['cargo-ship', 'ferry', 1], ['abra', 'abra', 1]],
  indiasouth: [['kettuvallam-large', 'kettuvallam', 1], ['ferry-large', 'ferry', 1], ['snake-boat', 'snake-boat', 1], ['fishing-trawler', 'fishing-boat', 1]],
  indianorth: [['cargo-ship', 'ferry', 1], ['dhow-large', 'dhow', 1], ['fishing-trawler', 'fishing-boat', 1]],
  mughal: [['hospital-ship', 'ferry', 1], ['dhow-large', 'dhow', 1], ['cargo-ship', 'ferry', 1]],
  egypt: [['cargo-ship', 'ferry', 1], ['felucca', 'felucca', 2], ['dhow-large', 'dhow', 1]],
  desert: [['dhow-large', 'dhow', 2], ['cargo-ship', 'ferry', 1]],
};

/** The shipping line's own ship in each harbour land (wanted, stand-in). */
export const SHIP_LINE: Partial<Record<RegionId, [string, string]>> = {
  aurora: ['research-vessel', 'fishing-boat'], norway: ['hurtigruten', 'ferry'], switzerland: ['cargo-ship', 'ferry'],
  london: ['cargo-ship', 'tall-ship'], newyork: ['container-ship', 'ferry'], korea: ['cargo-ship', 'ferry'],
  vintage: ['cargo-ship', 'tall-ship'], china: ['junk-large', 'junk'], middleeast: ['dhow-large', 'dhow'],
  indiasouth: ['kettuvallam-large', 'kettuvallam'], indianorth: ['cargo-ship', 'ferry'], mughal: ['cargo-ship', 'dhow'],
  egypt: ['cargo-ship', 'dhow'], desert: ['dhow-large', 'dhow'],
};

export const resolveShip = (wanted: string, standIn: string, exists: (id: string) => boolean): string => exists(wanted) ? wanted : standIn;
