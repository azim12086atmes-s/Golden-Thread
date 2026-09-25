# Art Bible

## 0. Look

Soft low-poly, flat-shaded, saturated but warm — closer to *Sky: Children of the Light* and cozy
isometric dioramas than to realism. Everything is built procedurally from primitives in code
(`src/world/kit.ts`), so every land stays small in download and consistent in style.

- **Light is the hero.** Bloom picks up only the thread, lanterns, windows at night, stars and
  magic. Everything else stays under the bloom threshold.
- **Silhouette over detail.** Each land is recognised from far away by its landmark and roofline.
- **Characters** are soft rounded forms: robe, sleeves, trousers, a floating head with no face.
  Personality comes from clothing colour, headwear and movement, never from facial features.

## 1. Research method

Searches run 2026-09-25 across Pinterest boards/idea pages, Sketchfab/CGTrader/ArtStation asset
listings, and reference sources for garments. Pinterest pages render client-side and could not be
read pin-by-pin, so board and idea-page titles were used to map the visual vocabulary, and garment
structure was confirmed against written sources. Nothing was copied; these are design notes in our
own words, and every model is original procedural geometry.

Keyword sets used: *modest fashion · hanfu · hanbok · anarkali · pavadai davani / langa voni ·
pathani · kurta · baju kurung · kebaya · galabeya · thobe · abaya · bunad · dirndl · modest
fantasy outfits · fantasy cloak · sci-fi robes · Mughal architecture low poly · isometric
Japanese village · Islamic courtyard design · Islamic geometric lantern · fantasy cottage ·
rainbow cottage · Bedouin tent · tent village concept art · oasis camp.*

Sources consulted:
- Pinterest idea pages and boards: Modest Chinese Fashion, Hanfu Inspired Fashion, Modern Hanbok
  Pattern, Women Traditional Outfit, South Indian Traditional Dress, Pathani Suit, Kurung & Abaya,
  Modern Kebaya & Abaya, Modest Fantasy Outfits, Fantasy Cloak Design, Sci Fi Robes, Islamic
  Courtyard Design, Islamic Geometric Lantern, Low Poly 3D Isometric, Isometric Village, Fantasy
  Cottage Concept Art, Rainbow Cottage, Bedouin Tent, Tent Village Concept Art, Oasis Camp.
- Wikipedia: Langa voni, Kurta, Pathani suit, Hardangerbunad, Malaysian cultural outfits, Engare.
- Visit Norway (bunad), Folkwear (bunad pattern notes), High Latitude Style (dirndl vs bunad).
- Game references: Sky: Children of the Light wiki and GDC 2020 social-design coverage.

## 2. Wardrobe notes

The rule: **if a reference is not fully covering, merge it** — add full sleeves, trousers under
the hem, and a headscarf — rather than drop it (`modestify()` in `src/characters/modesty.ts`).

| Culture / era | Structure we take | Girl | Boy |
|---|---|---|---|
| Japan | Wrapped front, wide sleeves, obi band, pleated hakama | Kimono + hakama, hijab | Kimono + hakama, haori |
| Korea | Short jacket (jeogori) with ribbon over a high full skirt (chima); baji trousers | Hanbok, long chima, hood-scarf | Baji-jeogori, vest, gat-style brimmed hat |
| China | Hanfu layered wrap, very wide sleeves, waist sash; Tang/Song/Ming silhouettes | Ruqun with long skirt | Wide-sleeved robe, sash |
| North India | Anarkali flared frock, churidar trousers, dupatta; sherwani, kurta-pyjama | Anarkali + churidar + dupatta-hijab | Sherwani, kurta pyjama |
| South India | Pavadai davani / langa voni — long silk skirt, blouse, draped half-sari; zari borders | Pavadai with full-sleeve blouse and draped davani over a hijab | Kurta + veshti-style wrap over trousers |
| Mughal | Angrakha side-tied robe, farshi pajama, jama with flared skirt, sash, turban | Angrakha, farshi pajama | Jama, patka sash, turban |
| Indonesia / Malay | Baju kurung (long tunic over long skirt), kebaya over batik/songket | Baju kurung, batik skirt | Baju melayu + songkok |
| Egypt | Galabeya — long loose robe with embroidered neck and cuffs | Embroidered galabeya | Galabeya + shawl |
| Middle East | Abaya and khaleeji thobe with embroidery; bisht cloak | Embroidered abaya | Thobe, ghutra, bisht |
| Norway | Bunad — wool, floral embroidery on skirt and bodice, silver brooch, belt bag | Bunad with long sleeves and headscarf | Bunad vest, knee breeches → full trousers |
| Switzerland | Dirndl — fitted bodice, apron with stripes/florals — merged | Dirndl + long-sleeve blouse + trousers + scarf | Alpine jacket, trousers |
| London | Trench coat, wide trousers, knitwear | Long trench, wide trousers | Wool coat, flat cap |
| New York | Modern layered streetwear | Long hoodie dress + cargo trousers | Long jacket, cargo |
| Vintage | 1950s tea dress, cardigan — merged | Long tea dress + trousers | Suit with waistcoat |
| Renaissance | Gown with cape; doublet and cloak — doublet+hose merged into robe | Gown and cape | Long doublet-robe and cloak |
| Nomad / desert | Layered wraps, sashes, sand tones | Layered wrap | Layered wrap, turban |
| Arctic | Fur-lined parka, patterned trims | Parka dress | Parka |
| Fantasy | Star cloaks, flowing capes, light trims | Starlight cloak | Moon cloak |
| Sci-fi | Clean panels, luminous seams, high collar | Luminous robe-suit | Luminous coat |

## 3. Lands

| Land | Roofline / materials | Landmark | Flora & fauna | Special light |
|---|---|---|---|---|
| Wanderers' Meadow | Round cottages, flower-painted roofs, windmills | The Great Oak & wishing well | Flower fields, rabbits, sheep | Rainbows by day, stars & fireflies by night |
| Japan | Dark curved tile roofs, timber, white plaster | Five-tier pagoda | Sakura, pine; cranes, cats | Stone lanterns, falling petals |
| Korea | Hanok: upturned roof tips, white walls, timber grid | Palace gate with stacked roofs | Pine, maple; magpies | Paper lanterns |
| China | Red columns, glazed yellow/green roofs, courtyards | Round three-tier hall with blue roof | Bamboo, willow; pandas | Red lanterns |
| Norway | Painted timber houses (red, ochre, white) | Stave church | Pine, birch; sheep, puffins | Long dusk, fjord water |
| Switzerland | Chalets with deep eaves, stone bases, balconies | Clock tower | Pine, meadow flowers; cows, goats | Snow on the peaks |
| London | Brick terraces, chimneys, black railings | Great clock tower | Plane trees; pigeons, dogs | Red phone boxes, gas lamps |
| New York | Towers of glass and brick, water tanks | Art-deco spire | Park trees; pigeons | Lit windows at night |
| Renaissance | Ochre stucco, terracotta, loggias | Dome cathedral & bell tower | Cypress, olive; doves | Warm golden hour |
| Vintage | Pastel shopfronts with awnings, diner | Carousel & bandstand | Street trees; dogs | Neon trim |
| Islamic | White walls, arcades, blue-tiled domes, courtyards | Great masjid with four minarets & pool | Orange trees, palms; doves | Geometric lanterns |
| Middle East | Mud-brick, wind towers, souq awnings | Fort-souq | Palms; camels | Hanging lanterns |
| Desert tents | Striped tents, rugs, fire pits | Oasis pool | Palms, dunes; camels | Campfires, deep stars |
| Egypt | Sandstone, flat roofs, columns | Pyramids and obelisk | Palms, papyrus; cats, camels | Golden sunset |
| North India | Sandstone havelis, jharokhas, chhatris | Pink palace of windows | Neem, marigold; elephants, peacocks | Diyas at dusk |
| South India | Stepped gopuram towers, sloping tiled roofs | Gopuram temple | Coconut palms, banana; elephants | Oil lamps, backwaters |
| Mughal | Red sandstone gates, white marble domes | White domed tomb in a charbagh | Cypress, roses; peacocks | Moonlit marble |
| Indonesia | Curved horn roofs (rumah gadang), joglo | Stepped stupa temple | Palms, rice terraces; water buffalo | Warm humid light |
| Aurora huts | A-frame cabins, glass domes, snow | Aurora observatory | Pine; reindeer, foxes | Aurora ribbons |
| Sky Isles | Floating islands, crystal spires | Temple of the Great Lantern | Cloud trees; light birds | Everything glows |

## 4. Palette tokens

Each land defines `ground`, `walls[]`, `roofs[]`, `trims[]` and `glow` in `src/world/regions.ts`.
Keep saturation high and value mid-to-high; night is achieved with light, not by darkening
materials.
