# Owner requests — full audit (2026-09-27, updated 2026-09-28)

Every request the owner made in this session, from the first message to the last, checked against the
code on `claudes-current-work` (live build `3e49c71`). ✅ done · 🟡 partly done · ⬜ still to do · 🔎 needs
checking. Detailed specifications for the open items are in `OWNER_REQUESTS_SPEC.md`.

## 1. Rules and questions
| Request | Status |
|---|---|
| Keep the rules: the two never touch or share a seat/mount; no eyes; floating heads; modest dress; halal content | ✅ enforced by tests throughout |
| Answer: skies and particles at the celebration; objective panel close/reopen; which pets, how many children/pets | ✅ answered |
| Screenshots of all the skies | ✅ given |
| Push as the hosted version, keeping earlier versions | ✅ `scripts/deploy-pages.sh` keeps every build under `versions/` |
| When/where each transport spawns; what is left to build; the 12 lands needing polish | ✅ answered |
| Where the changes can be seen, and what is being rendered | ✅ answered; every batch now deployed |

## 2. Caravan, characters and animals
| Request | Status |
|---|---|
| Larger, beautiful van with room for children and pets | ✅ |
| Flying carpet carrying the children and pets beside you in every flight mode | ✅ |
| Accurate cat, dog and unicorn forms; true structure for all animals | ✅ |
| Animal heads float by a distance that suits their size | ✅ |
| People's faces: jawline; headscarf wrapped under the chin; angular beard; flat back and top of head; hair | ✅ |
| Fur on animals, feathered unicorn wings, Toothless-like scaled dragon | ✅ |
| Her crown bigger than his | ✅ |
| Children going home at their destination | ✅ (3e49c71) |
| Balloons: house decor, children holding them, in the skies | ✅ |
| Starry dress: large glowing stained-glass butterfly wings — heart-shaped, twice her height, slow curving flap, intricate uneven mosaic | ✅ (wings.ts; Fathima's alone) |
| All dresses: more colour and pattern from images | ✅ |
| Safar (the van) and your own vehicles rebuilt in steel / painted metal | ✅ Safar: a split-screen bus in painted steel; the other vehicles have clear-coat paint and chrome |

## 3. Story and interface
| Request | Status |
|---|---|
| Intro wording: "she and her beloved", "both of you" | ✅ |
| Objective panel closes and reopens | ✅ |
| People finder: people in need found in the crowds, a finder tab | ✅ |
| Hide button for the UI inside houses | ✅ |
| Land and homes panels show everything you can build | ✅ |
| Caves listed on the map with the way there | ✅ |
| A plot being chosen shows green; owned land blends into the land | ✅ |

## 4. Skies, weather and atmosphere
| Request | Status |
|---|---|
| Rich day skies with each land's accents and colours, not plain sunny | ✅ |
| Particles for every land; atmospheric hues; night hues (blue arctic, sandy desert, misty white Sky Isles) | ✅ |
| Dusty desert winds, snowy winds, a little sun | ✅ |
| Rainbows like the aurora (texture, not a tube), more visible | ✅ |
| Stars visible with other celestial bodies by day | ✅ |
| China's festival dragon in the sky; each land's own sky artifacts | ✅ (sky traffic creatures and sky ornaments per land) |
| Sky tiles (golden hexagon canopy) brought down to be seen | ✅ |
| Sky traffic: air vehicles, creatures, balloons, airships | ✅ |

## 5. Ground, grass, water and nature
| Request | Status |
|---|---|
| Smooth curving terrain; blended terrains with rockiness | ✅ |
| Grass: dense, even, image tufts to the horizon; flowers; leaf images, not blades | ✅ |
| Desert dunes and snow patterns, lit | ✅ |
| Patterns not uniform, not quick: sand grain, ripples, snow sastrugi, snow and water shine, grass | ✅ (36d842f) |
| More lakes, rivers, ponds; animated glowing patterns and foam | ✅ |
| Wind moving grass, foliage, cloth | ✅ |
| All water flowing; foam glowing; banked like fountains | ✅ |
| Water in Egypt and Madinat an-Nur; fountains in all 20 lands | ✅ |
| The Nile flowing, not overlapping the path; banks, towpaths, channels | ✅ |
| Sky Isles waterfall | ✅ |
| Rougher sea waves at the harbours | ✅ choppy open sea with whitecaps beyond the lands (Water.ts) |
| Water lotus ponds | ✅ formal lotus gardens in the six lotus lands (fd9a4b8) |
| Trees: textured, translucent leafy crowns → now opaque, leaf-painted, ragged outlines, more foliage, colourful foliage | ✅ (c88521c) |
| Pine and palm revamped; new real species (palms, conifers, bamboo, banana, baobab, fantasy trees) | ✅ |
| Nature by terrain; heights by land (small trees in deserts and Sky Isles raised) | ✅ |
| Sky Isles: more and larger trees, texturing, real floating islands, crystal meadow | ✅ |
| Caves in deserts and snow; organic; giant crystals in the Sky Isles; bigger | ✅ |
| Caves enterable | ✅ (3e49c71) · textured surfaces 🟡 |
| Multi-coloured crystals in the Sky Isles | ✅ each crystal its own hue, root-to-tip gradients, some two-coloured |
| Materials on tree trunks (bark by species) | ✅ furrowed, plated, lenticelled, smooth and ringed bark (surfaces.ts) |
| Some trees look inverted; Aurora huts/tents inverted | 🔎 to check and fix |
| Mountains and plateaus by geography (muddy desert mesas, blue-white arctic, light-grey rocky highlands) | ✅ (landforms.ts) |
| Aurora snow ground texture beyond ripples | ✅ crust and powder drifts, blue hollows, animal tracks |
| Desert pebbles and small rocks scattered like the grass | ✅ pebble field on sandy ground (Meadow.ts) |

## 5b. Atmosphere (2026-09-28)
| Request | Status |
|---|---|
| Atmospheric particles beyond drifting motes | ✅ butterflies and dragonflies by day, fireflies after dusk, Sky Isles spores, chimney and tent-fire smoke, dawn ground mist, golden-hour sunbeams (atmosphere.ts, Atmos.ts) |
| Interiors: no glowing sheet across the view | ✅ tested (interiorGlow.test.ts) |

## 6. Towns, architecture and lighting
| Request | Status |
|---|---|
| Textured, detailed buildings from real architecture; New Yonder cyber-solarpunk; fantasy Meadow with castles | ✅ |
| Materials: cobbles, straw, brick, plaster, steel, tiles, asphalt… | ✅ (surface shader) |
| Balconies, cornices, shutters; facade kits for every land | ✅ |
| Taj Mahal windows aligned | ✅ |
| Houses clear of fountains, water, pyramids; Bagh-e-Noor not clumped; grass off paths | ✅ |
| Pyramids with level brick courses, back in the town centre | ✅ |
| Gulabi Nagar: relief, grainy sand, rangolis, pichkaris, gates, artifacts | ✅ |
| Houses less monotonous: more types, colours, textures (grainy plaster, timber, bamboo) | ✅ 3–4 traditional kinds per land (traditions.ts, traditionsMore.ts, facade.ts) |
| Town layouts organic, not a grid | ✅ winding lanes and side lanes, houses facing them (townLayout.ts); New Yonder keeps its grid |
| Roads, paths and canals following the terrain; no overlap or chunking | ⬜ |
| Bridges larger and fancier in each land's architecture; boats under, vehicles over | ✅ each land's own lit bridge (645e452); wider two-way decks ⬜ |
| Real lighting: lamps and lanterns that light the ground round them; London gas lamps, tent lamps, Gulabi Nagar diyas, Madinat an-Nur hanging lanterns, Chinese sky lanterns; lit bridges | ✅ street, lane, bank, door, gate lamps and tent fires light pools round them (lamplight.ts); lit bridges 🟡 |
| TV panels and more cyber/solar-punk artifacts in New Yonder | ✅ screen towers, avenue panels, pylon screen (ed6168b) |
| Monuments: external detail and texturing | ✅ |
| Interiors shaped like their building (igloo, tent, courtyard, London house…) | ✅ house rooms by kind; institutes dressed in each land's style |

## 7. Economy, charity, learning and building
| Request | Status |
|---|---|
| Buy land; plant, grow, harvest, use or sell crops | ✅ |
| Service jobs: company employee, freelance software, hardware | ✅ |
| Sponsor orphans, elders, the homeless and poor; house them in your homes; see them there | ✅ |
| New floors in homes to house more | ✅ |
| Soup kitchens, clinics → hospitals, libraries, schools, madrasas, tent schools, universities, Hogwarts | ✅ logic and all 96 buildings |
| Each land's own science institute, built in stages (e.g. Swiss watchmaking from a boutique) | ✅ |
| Found by skill, by someone you pay, or by someone you sponsor and teach | ✅ |
| Teaching as a service, interning, research, theses (magic and science), working under professors, courses | ✅ |
| Pay in food, rations, necessities, housing — not only coins | ✅ |
| Employ chefs, builders, tent-layers, weavers; freelance or hired | ✅ |
| Pay in opportunities (courses); certificates unlock ranks | ✅ (3e49c71) |
| Agriculture land, supply chains, delivery workers, harbours and ships | ✅ |
| Markets fill up for your own sales | ✅ |
| Making and selling inventions from theses; healthcare, tech, logistics as businesses you run | ⬜ |
| Penthouses in New Yonder | ⬜ (after Codex's model) |

## 8. Traffic and travel
| Request | Status |
|---|---|
| Living traffic on roads, waters and skies per land | ✅ |
| Travel between lands without popping in; couriers, ships, buses and ferries across borders | ✅ highways between neighbouring towns, placed by the clock (traffic/schedule.ts); sea lanes |
| Stops (bus stops, piers, airfields) and riding buses, ferries, gondolas, air taxis in separate seats | 🟡 bus stops and intercity coaches ✅; ferries, gondolas, air taxis ⬜ |
| Junctions, traffic lights or roundabouts, people crossing, far traffic hidden | 🟡 lights at every avenue/ring junction, vehicles stop at the line; people crossing ⬜ |
| Traffic by time of day: quiet nights, lantern boats at dusk, kites by day, Sky Isles gondolas | ✅ roads quiet at night, lantern boats at dusk, day and night birds, fewer aircraft at night |

## 9. Team and documents
| Request | Status |
|---|---|
| Handoffs for Codex/ChatGPT (3D) with every intent; gaps filled; terrain changes flagged | ✅ |
| Specification of all requests | ✅ `OWNER_REQUESTS_SPEC.md` |
| Claude to take over detailed 3D architecture | ✅ taken over (institutes, caves, trees, islands, banks, Gulabi Nagar) |
| Performance work; real sources for each land's science | ⬜ |

## The order agreed for what is left
1. Game logic: inventions and businesses, then traffic (travel between lands, stops and riding, junctions, time of day).
2. The butterfly wings and dress patterns.
3. Monument detail and texturing; house variety, textures and organic layouts; roads on the terrain; bridges; lighting.
4. Mountains and plateaus; snow and desert ground detail; trunk bark; multi-coloured crystals; inverted trees; harbour waves.
5. Performance; research sources; Codex's models as they arrive (penthouses, screens, lotus ponds).
