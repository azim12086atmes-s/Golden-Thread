# Architecture research: what each land's buildings are made of

Reference for building the world's houses from real traditions rather than generic boxes. Each
land lists the features its buildings should carry, and how the game draws them (`src/world/facade.ts`
for the shared facade kit, `src/world/architecture.ts` for each land's builders, `src/world/surfaces.ts`
for materials).

## Shared facade vocabulary

From architectural glossaries: **cornice** (projecting crown of a wall, often with **dentils** — small
square blocks — or **brackets/modillions**), **corbels** (stepped supports), **quoins** (dressed blocks at
the corners), **pilasters** (flat engaged columns), **string course** (horizontal band at each floor),
**lintel** and **sill** (above and below an opening), **shutters**, **balustrade** (row of balusters under
a rail), **parapet**, **pediment** (triangular or segmental hood over a window or door), **keystone**,
**fanlight** (half-round light over a door), **dormer**, **bay window**, **stoop**.
Sources: [Glossary of architecture](https://en.wikipedia.org/wiki/Glossary_of_architecture),
[Classic Architecture Today: 15 classical details](https://classicarchitecturetoday.com/classical-details/),
[Cornice](https://en.wikipedia.org/wiki/Cornice).

## Europe and America

- **Old London — Georgian and Victorian terraces.** Symmetrical brick fronts, evenly spaced sash windows
  (flat gauged-brick lintels, keystones), a white stucco ground floor, a panelled door between pilasters
  under a fanlight, iron railings to the front area, a parapet or cornice hiding the roof, chimney stacks
  with pots; Victorian: canted bay windows, ornate cornicing, polychrome brick.
  [Londonist](https://londonist.com/london/history/georgian-or-victorian-how-to-tell-london-s-architecture-eras),
  [Architecture for London](https://architectureforlondon.com/news/period-homes-guide-georgian-victorian-or-edwardian/).
- **New Yonder — New York brownstones, Art Deco towers, solarpunk.** Brownstones: a high stoop to the
  parlour floor, heavy bracketed cornice, carved lintels, arched Italianate windows, bay windows. Art Deco:
  ziggurat setbacks required by the 1916 zoning, ornament on each ledge, crowned spires, chrome, steel,
  terracotta. Solarpunk: vertical forests (Bosco Verticale), green roofs, solar skins, biophilic design.
  [Brownstone field guide](https://thebrownstoneboys.substack.com/p/a-field-guide-to-brownstone-architecture),
  [Downtown Alliance: Art Deco](https://downtownny.com/news/art-deco-guide-downtown-nyc/),
  [Solarpunk in architecture](https://arkiste.com/blog/solarpunk-in-architecture-the-intersection-of-art-technology-and-sustainability).
- **Renaissance — Italian palazzo.** Rusticated ground floor, a *piano nobile* with the largest windows under
  alternating triangular and segmental pediments, balconies with balustrades, string courses between floors,
  a boldly projecting cornice, loggias of columns, low hipped terracotta roofs.
  [Piano nobile](https://en.wikipedia.org/wiki/Piano_nobile), [Rustication](https://en.wikipedia.org/wiki/Rustication_(architecture)).
- **Vintage town — San Francisco "Painted Ladies" (Queen Anne).** Steep multi-angled roofs, corner turrets,
  canted bay windows, ornamented gables with patterned shingles, spindlework and gingerbread brackets,
  porches, several pastel paint colours per house.
  [Dunn-Edwards](https://www.dunnedwards.com/pros/blog/the-painted-ladies-of-san-francisco/).
- **Fjordhavn — Norwegian wood (Bryggen).** Narrow gable-fronted timber houses in rows, horizontal painted
  cladding (red, ochre, white), white window frames, galleries, turf roofs on rural houses.
  [Riksantikvaren: Bryggen](https://www.riksantikvaren.no/en/world-heritage/bryggen-in-bergen/),
  [Anatomy of a Norwegian wooden house](https://uhortistroget.no/post/anatomy-norwegian-wooden-house-architecture).
- **Alpenrose — Swiss chalet.** A stone base storey, timber above, a low front gable with very deep eaves on
  large brackets, exposed carved rafter ends and bargeboards, balconies on each upper floor with flat
  cut-out balusters, flower boxes, shutters.
  [Swiss chalet style](https://en.wikipedia.org/wiki/Swiss_chalet_style),
  [DAHP style guide](https://dahp.wa.gov/historic-preservation/historic-buildings/architectural-style-guide/swiss-chalet-revival).
- **Wanderers' Meadow — fairy-tale castles (Neuschwanstein).** White limestone with red-brick accents,
  towers and turrets with tall conical roofs, arched Romanesque windows, Gothic pinnacles, battlements,
  banners. [Neuschwanstein](https://www.neuschwansteincastle.bayern/en/bavaria-neuschwanstein/culture/neuschwanstein-architecture-and-romanticism).

## East Asia

- **Sakura Hollow — Kyoto machiya.** Narrow two-storey wooden townhouses, dark *koshi* lattices of close
  vertical slats over the windows, a small tiled pent roof (*hisashi*) between the floors, grey *kawara*
  tile roofs, *noren* curtains at the door. [Nippon.com](https://www.nippon.com/en/guide-to-japan/gu900011/),
  [Machiya](https://en.wikipedia.org/wiki/Machiya).
- **Korea — hanok.** A stone base, exposed timber columns set on cornerstones, white plaster between a
  timber grid, *hanji* paper lattice windows, dark *giwa* tile roofs with strongly up-curved eaves.
  [Hanok](https://en.wikipedia.org/wiki/Hanok).
- **China — traditional halls.** A white stone base, red columns, *dougong* bracket clusters holding deep
  flying eaves, blue-and-green painted beams, glazed tile roofs (yellow for imperial), lattice windows,
  courtyard houses (*siheyuan*). [Dougong](https://en.wikipedia.org/wiki/Dougong),
  [Traditional elements](https://architecturecourses.org/learn/traditional-elements-chinese-architecture).

## Islamic world, Middle East, Egypt, desert

- **Islamic courts — Moorish / Moroccan riad.** Plain outer walls with few small windows, horseshoe and
  multifoil arches, *zellige* tile dadoes and door surrounds, carved stucco, *muqarnas*, square minarets,
  inner courtyard with fountain. [Moorish architecture](https://en.wikipedia.org/wiki/Moorish_architecture).
- **Middle East — Gulf coral-stone houses.** *Barjeel* wind towers open on four sides, *mashrabiya*
  lattice screens, parapets, heavy studded wooden doors, coral and limestone walls.
  [Arab America](https://www.arabamerica.com/the-traditional-architecture-of-the-united-arab-emirates/),
  [Matador: barjeel](https://matadornetwork.com/read/dubais-wind-towers-citys-traditional-beautiful-way-beat-heat/).
- **Egypt — Nubian houses and temples.** Barrel vaults and domes behind high parapets, facades painted
  blue, yellow, pink and white with geometric patterns round the doors; temples with pylon gateways
  (tapered towers with a cornice) and papyrus columns. [Nubian vault](https://en.wikipedia.org/wiki/Nubian_vault),
  [Pylon](https://en.wikipedia.org/wiki/Pylon_(architecture)).
- **Tents of Rimal — Bedouin tents.** Long, low black goat-hair tents of woven strips, a row of poles,
  long guy ropes, one side open to guests, a decorated curtain (*qata*) dividing the inside.
  [Penn Museum](https://www.penn.museum/sites/expedition/portable-architecture/),
  [Wadi Rum Nomads](https://www.wadirumnomads.com/bedouin-house-of-hair/).

## South Asia

- **Gulabi Nagar — Rajasthani haveli (Jaipur, Hawa Mahal).** Pink sandstone, rows of projecting
  *jharokha* balconied windows under little domed roofs, *jali* lattices, *chhatri* kiosks on the roof,
  inner courtyards. [Hawa Mahal](https://en.wikipedia.org/wiki/Hawa_Mahal).
- **South India — Kerala nalukettu and gopurams.** Steep clay-tile roofs with deep eaves and gable vents
  (*mukhappu*), timber verandah pillars, a central open courtyard; temple gateways (*gopuram*) rising in
  diminishing storeys to a barrel-vaulted crown. [Nālukettu](https://en.wikipedia.org/wiki/N%C4%81lukettu),
  [Gopura](https://www.britannica.com/technology/gopura).
- **Bagh-e-Noor — Mughal.** Red sandstone and white marble, bulbous onion domes flanked by *chhatris*,
  the *pishtaq* (tall framed arched portal) and *iwan*, minarets, *jali* screens, *pietra dura* inlay,
  the *charbagh* four-part garden. [Mughal architecture](https://chapterofdesign.com/post/mughal-architecture-design/).

## Southeast Asia, the north, the sky

- **Indonesia — Bali and Toraja.** Open pavilions (*bale*) on carved stone bases under steep
  *alang-alang* thatch, split gates (*candi bentar*), and Toraja *tongkonan* houses on piles under huge
  boat-shaped saddle roofs. [Candi bentar](https://en.wikipedia.org/wiki/Candi_bentar),
  [Tongkonan](https://en.wikipedia.org/wiki/Tongkonan).
- **Aurora Huts — Sámi and Arctic.** The *lavvu* (conical pole tent), the *goahti* (low turf-and-birch-bark
  hut), log cabins, and glass "aurora" cabins shaped like a lavvu. [Goahti](https://en.wikipedia.org/wiki/Goahti).
- **The Sky Isles — floating fantasy.** Floating islands joined by bridges, waterfalls pouring off their
  edges into cloud, slender spires and arched windows of glowing moonstone.
  [ArchDaily: Floating Islands of Sky](https://www.archdaily.com/971013/floating-islands-of-sky-unarchitecte).

## Vehicles and sky traffic

- **The van — VW Type 2 bus.** A loaf-shaped body, a V-shaped front panel with a split (two-pane) windscreen
  under a peak, two-tone paint with a white top. [Just Kampers](https://www.justkampers.com/vehicles/vw-t2-split-screen/).
- **Airships.** A streamlined envelope with cruciform tail fins (rudders and elevators), a gondola hung
  beneath on cables, engines on outriggers; steampunk sky ships add sails and brass.
  [Airship](https://en.wikipedia.org/wiki/Airship), [Skyship 500](https://en.wikipedia.org/wiki/Airship_Industries_Skyship_500).
