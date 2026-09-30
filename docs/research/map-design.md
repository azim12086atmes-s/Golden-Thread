# Map design — one continent, vast cities, scenic highways

Research date: 2026-09-25. Scope: world layout, road network, roadside sightings, side-road
settlements and terrain for *The Golden Thread*. This is a **proposal**. No source file was changed.
It builds on `docs/GAME_DESIGN.md`, `docs/ART_BIBLE.md`, `src/world/regions.ts` (20 lands on a
5×4 grid, `REGION_SIZE = 700`, `CITY_RADIUS = 240`), `src/world/terrain.ts` (bilinear grid blend,
flattened city core, the island sloping to sea past the grid) and the vehicle speeds in
`src/vehicles/vehicles.ts` (walk 6.5 m/s, cape 20, unicorn 22, truck 24, van 28, car 36,
plane 70).

All real places below are used as **inspiration for shapes, colours and moods**. Everything in the
game stays original procedural geometry. In keeping with the game's content rules, religious sites
are shown only as architecture, never as statues or figures, and every figure stays faceless.

---

## 0. Summary

- **Scale:** replace the 700 m grid cells with **city anchors about 2.5–3 km apart** on a
  continent roughly **13 × 10 km**. At that size the van (28 m/s) drives from one city to the
  next in **2–3 minutes**, walking between them takes **8–11 minutes**, walking corner to corner
  takes about **40 minutes** (similar to *Breath of the Wild*'s 57 minutes), and the biplane
  reaches any city in **under 3 minutes**. If content runs thin, set `WORLD_SCALE = 0.75`;
  everything below scales linearly.
- **Cities:** city radius goes from 240 m to **300–650 m** depending on the land, each city with
  4–6 districts and one landmark tall enough to see from 1.5–2 km out.
- **Roads:** four classes: **Highway** (the Golden Road), **Scenic pass**, **Branch road** and
  **Path**. There are 27 highway segments. The loop around the coast plus the five spokes from
  the Meadow means every land has at least two ways in.
- **Sightings:** about **one natural sighting every ~500 m** of open highway (15–20 s by van,
  75 s on foot) and **one side-road settlement every ~1.2–1.5 km** (roughly the Silk Road rule of
  one caravanserai per day's travel, compressed).
- **Guidance:** a *weenie* hierarchy. The Great Lantern on the Sky Isles can be seen from
  everywhere, like *Journey*'s mountain. Each city landmark can be seen from its own approach
  roads, and each settlement has a beacon: smoke, lanterns, a rainbow or a glowing aurora dome.
  The golden thread's light motes can drift toward the chosen destination, the way *Ghost of
  Tsushima*'s Guiding Wind does.

---

## 1. Design principles, distilled

### 1.1 Scale and travel-time targets

The design starts from travel time, not from metres. The speeds come from `vehicles.ts`.

| Mode | Speed | City → neighbouring city (road ≈ 2.6–4.1 km) | Crossing a vast city (Ø ~1 km) | Whole continent |
|---|---|---|---|---|
| Walk | 6.5 m/s | 7–11 min | ~2.5 min | ~40 min corner to corner (straight line) |
| Cape of light | 20 m/s | ~2.5 min (flying straight, ~2.6 km) | 50 s | ~13 min |
| Unicorn | 22 m/s | ~2.5–3 min | 45 s | glides over water: shortcuts across the Middle Sea |
| Van *Safar* | 28 m/s | **2–3 min** (target 90–150 s of open country) | 40 s | the coast loop (~60 km) ≈ 40 min |
| Car | 36 m/s | 1.5–2 min | 30 s | — |
| Biplane | 70 m/s | 40 s | — | any city to any city ≤ 3 min |

Reference points that set these numbers:

- *The Crew* squeezed the continental US to about 2.4 % of real distance. *The Crew* and *The
  Crew 2* took roughly an hour to drive coast to coast; *Motorfest* shrank that to about 10 minutes. About 10 minutes of van
  coast to coast feels "big but visitable" for a cosy game.
- *Euro/American Truck Simulator* compress roads at about **1:19–1:20** and deliberately made
  roads *outside* cities longer (+75 %) to open space for vistas. Cities stay abstract ring roads.
  Our compression is harsher (~1:25 for a "day's journey"), and we do the reverse for cities: they
  are large and hand-crafted, while the country between them is the connective tissue.
- *Breath of the Wild*: about 57 minutes to cross Hyrule corner to corner. Our ~40-minute walk
  lands in the same comfortable range.

### 1.2 POI spacing and density

| What | Spacing | Why |
|---|---|---|
| Natural **sighting** (waterfall, glacier, dunes…) | every **400–700 m** of highway (~15–25 s by van, 60–110 s on foot) | Open-world pacing guidance puts 60–120 s of travel between POIs; every ~50 m reads as a checklist. The van and walk bands overlap at ~500 m, so one spacing serves both. |
| Small roadside **moment** (fruit stall, animal crossing, bench, well, flower bank) | every **200–300 m** | "Look any direction and see something interesting." These are cheap, procedural and mostly scattered from a kit. |
| **Side-road settlement** | every **1.2–1.5 km** of highway (1–2 per segment) | Caravanserais sat one day's caravan march (30–40 km) apart. Compressed, that gives one settlement per ~1.3 km. |
| **Viewpoint / rest stop** ("Thread Rest") | 1 per segment, at the best reveal | Norway's National Tourist Routes put architect-designed stops at the best views, and they became destinations in themselves. |
| Fast-travel point | each city's lantern, once relit | Guidance: fast travel every 3–5 minutes of walking. One per city is ~8–10 minutes of walking, which suits a journey game where the travelling *is* the content. |

Mix. About **80 % procedural** (vegetation, rocks, moments) and **20 % hand-placed** (sightings,
settlements, reveals). Each sighting type needs **3–5 variations** so the tenth waterfall does
not look like the first.

### 1.3 Landmarks and winding the player

1. **Weenies at three scales** (Disney's term for a landmark that pulls visitors onward).
   - **World weenie:** the **Great Lantern** above the Sky Isles, floating ~420 m up over the
     centre-south. It is visible from every city by day as a crystal spire and by night as a beam.
     It plays the role of the mountain that is always in view in *Journey*. It must ignore fog:
     draw it as an unfogged sprite or impostor.
   - **Land weenies:** each city's landmark (pagoda, clock tower, spire, minarets, pyramid,
     gopuram…) must be **≥ 40–120 m tall** and visible from **1.5–2 km** along every approach
     road. Provide low-poly silhouette impostors so they draw beyond the terrain streaming radius.
   - **Settlement beacons:** a smoke column, a lantern cluster, a rainbow, an aurora-lit glass dome
     or a windmill, visible from the junction where the side road leaves the highway.
2. **The triangle rule** (*Breath of the Wild*). Three sizes of triangular landform: *large* ones
   are landmarks, *medium* ones block the view to create "what's behind that?", and *small* ones
   change the pace. Put a medium hill between the highway and each sighting so it **reveals** as
   the road rounds the hill instead of being visible for a whole minute.
3. **Gravity.** Instead of marking paths, shape bowls and funnels so players orbit points of
   interest. Side-road beacons do this: they pull the eye first and the van second.
4. **Denial and reveal.** Hide a weenie briefly (forest, tunnel, cutting) just before it
   reappears larger. On highways, **tunnels and pass summits** are the natural denial points. They
   also make good streaming "valves" between two lands' assets.
5. **Diegetic guidance.** *Ghost of Tsushima* replaced the waypoint arrow with wind in the grass,
   plus foxes and golden birds that lead to places. The equivalent here: **the thread's motes
   drift toward the chosen destination**, while fireflies (Meadow), petals (Sakura) or sand
   curls (desert) blow along side roads toward settlements.
6. **Curves reveal.** Blue Ridge Parkway designer Stanley Abbott compared the road to a cameraman
   moving between angles: a winding alignment "unfolds" the landscape. Avoid long straights with
   unobstructed views, except where the straight *is* the sight: a salt-flat causeway, a dune
   road, or the strait bridge.

### 1.4 Road hierarchy

The model is the functional road hierarchy of freeway, arterial, collector and local roads,
arranged as a tree: trunk, branches, twigs. Two rules come with it: never connect roads that skip
a level, and (a lesson from the ATS rescale) avoid highway-to-highway junctions in open country.
Junctions happen at cities or at named crossroads.

| Class | Name in game | Width | Max grade | Min curve radius | Surface | Joins |
|---|---|---|---|---|---|---|
| **H** | *The Golden Road* (highway) | 10–12 m, two lanes + verges | 6 % | 80 m, banked | land's `road` colour; stone setts near cities | city gates, the Meadow hub, the strait bridge |
| **S** | *Pass road* (scenic byway) | 7 m | 10 % | hairpins 12–15 m | stone-walled asphalt, gravel above the snowline | H only, at its two ends |
| **B** | *Branch road* to settlements | 4–5 m | 14 % | 10 m | dirt / gravel / sand track / snow track / boardwalk / causeway | leaves H at a Y-junction, 30–60°, with a signpost |
| **P** | *Path* | 1.5–2 m | stairs allowed | — | footpath, stone stair, plank bridge, ice track | B or H, to waterfalls, viewpoints, retreats |
| city | Boulevard, lanes | 14 m / 5 m | — | — | per district | H ends at a city gate or roundabout on the city edge |

Construction notes:

- **H carves a corridor.** Flatten the terrain across the full width plus 6–8 m shoulders, then
  ease back to natural terrain over ~20 m. This is the same technique `terrainHeight` already
  uses for plots. Add cliff walls, bridges over rivers, and **short tunnels (≤ 150 m)** wherever
  the natural grade exceeds ~12 % for more than 100 m.
- **B never starts inside a city core.** Side roads leave the highway in open country so the
  settlement feels found, not listed.
- **Signposts show real names**, and the settlement beacon is visible from the junction.
- **Lamps** every ~40 m for 300 m outside each city gate, so the approach glows at night.
  This fits the art bible's "light is the hero".

### 1.5 Scenic-road craft

- **A segment is a three-act drive:**
  1. Leave the city through a gate, in the origin land's biome.
  2. The **transition gate**: a pass summit, river bridge, tunnel or forest edge where the
     biome visibly turns (see 1.6).
  3. The **arrival reveal**: the destination skyline framed by a bend, a cutting or a bridge.
- **One Thread Rest per segment**, at the best view. It is a small, distinctive structure:
  a cantilevered deck over a fjord (Stegastein juts about 30 m out, 650 m above the water),
  a stone bench ring, a tea pavilion, a shaded tent. Norway's tourist-route programme required
  each stop to answer its own site's atmosphere, and that is the brief here too. Rests hold a
  bench (the couple sit on separate seats), a mailbox for Messages, and sometimes a vendor.
- **Hairpin ladders** (Trollstigen has 11 bends; the Tichka and Furka passes are similar) belong
  on S-class roads only. From the top they are a sight in themselves.
- **Contrast inside minutes.** *Forza Horizon 5* split Mexico into 11 biomes and made jungle →
  canyon → volcano happen within minutes of driving. That is the right rhythm for the
  highway-level experience.
- **Borrowed views.** Most of a parkway's scenery lies *outside* the road corridor. Keep the
  corridor clear of buildings and let distant ridges, lakes and cities do the work.

### 1.6 Biome transitions

- **Gradual, but motivated.** *Red Dead Redemption 2* moves between regions through many small,
  almost unnoticed shifts: snow patchy at first, trees thinning, colour draining. *Forza
  Horizon 5* prefers visible contrast. Use both: a **400–600 m blend band** (today's smoothstep
  plateau is only ~200 m, 0.36–0.64 of a 700 m cell), **anchored to a physical gate** so the
  change feels caused by the landform.
- **Blend weights must sum to 1.** Bilinear or sigmoid weights, never hard cuts. For
  non-grid anchors (below), use **normalised inverse-distance weights with a sharpness
  exponent**, or a soft Voronoi. Optionally drive biome choice from **temperature × moisture ×
  height** fields, so the tundra → taiga → meadow order emerges on its own.
- **Transition flora:** in the band, mix the two lands' flora 70/30 → 30/70 and add one
  *ecotone species* (birch between pine and oak, olive between cypress and palm, tamarisk
  between palm and scrub).
- **Height is a biome too.** Rock above `snowline − 14 m` and snow above `snowline` already exist
  in `groundColor`. Add *slope* colouring: cliff faces get the rock colour whatever the height,
  which is the standard low-poly technique of combining a height gradient with a slope gradient.

### 1.7 Vistas

- Every city has **one grand reveal** on each approach road: the skyline appears whole, framed,
  from a raised point 800–1,500 m out.
- **Frame** with trees, rock arches, gateways and bridge trusses. A tunnel mouth is the perfect
  frame.
- **Sky events are vistas too.** Aurora (north of the Crown Range), rainbows (Meadow and the
  high grasslands), deep stars (deserts, salt flats), sea of clouds (pine crags), full moon on
  the salt flat. Tie some sightings to time of day so the same road shows something new at dusk.

### 1.8 The vertical layer

*Tears of the Kingdom* stacks a sky layer, about as big as the surface but sparsely filled, above
the ground. The Sky Isles do the same here. They stay floating, above the **Mirror Lake** caldera
in the Roof Range. There is no road up. They are reached by cape flight, and later by a
**Lantern Stair** of drifting stepping-stones, gated by the number of lanterns lit. Their
waterfalls pour into Mirror Lake ("cloud falls"), which links the two layers visually from the
highway.

---

## 2. Proposed world layout — the continent of *Safar*

### 2.1 Overview

Axes match the code: **x = east, z = south**, in **km**, with the Meadow at (0, 0) as home.
The continent spans about x −6.4…+6.4, z −4.4…+5.4.

```
                              ARCTIC SEA  (north)
  ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  ~ (AURORA)=======(FJORDHAVN)~fjords   ^^^^ CROWN RANGE ^^^^    (OLD LONDON)======(NEW YONDER) ~
  ~   tundra   \      ‖  \           ^(ALPENROSE)^ glaciers      estuary /         harbour   ~
J ~   /         \     ‖   \\          ‖   Glacier River         /       /          ‖         ~ E
A ~ (HANOK)      \    ‖    \\         ‖                        /       /     (MAPLE ROW)      ~ A
D ~  peninsula    `--(SAKURA HOLLOW)==(WANDERERS' MEADOW)==(FIRENZIA)          autumn     ~ S
E ~     \           /  cedar valley   ‖   hub    \\          \  ~~ MIDDLE ~~   ‖          ~ T
  ~   (JADE TERRACES)                  ‖           \\          \ ~~  SEA  ~~==bridge==      ~ E
S ~    karst river     ^^^^ ROOF RANGE ^^ [SKY ISLES above MIRROR LAKE] ~~~~~~~ strait    ~ R
E ~        \          (Roof Pass)  ‖                 \\     (MADINAT AN-NUR)    (SOUQ AL-QAMAR)~ N
A ~ (NUSA RINJANI)       (GULABI NAGAR)==(BAGH-E-NOOR)   \\     |  Long River    /   Hajar      ~
  ~  volcano isles==(KAVERI COAST)   salt flat      \=====(NILE CROSSING)===(TENTS OF RIMAL)  ~
  ~~~~~~~~~ backwaters ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Moon Hills ~~~~ dune sea ~~~~~~~~~
                              SOUTHERN OCEAN
   == highway (H)   ‖ spoke/pass road   ~ coast   ^ mountains
```

**Seas and coasts**

- **Arctic Sea** (north): cold, dark teal. Fjords cut 1 km inland at Fjordhavn. Sea stacks and
  black-sand beaches near Aurora.
- **Jade Sea** (west): a peninsula for Hanok, karst islets off Jade Terraces, and the volcanic
  **Nusa archipelago** in the south-west, joined by a causeway.
- **Southern Ocean**: palm coast, backwaters and the white **salt flat** coast below Gulabi
  Nagar, then the dune sea running into surf in the far south-east.
- **Eastern Ocean**: New Yonder's harbour and islands, and Maple Row's rocky coves.
- **The Middle Sea** (inland, x 3.0–5.2, z −0.1–2.2): the Mediterranean analogue, ringed by
  Firenzia, Maple Row, Souq al-Qamar and Madinat an-Nur, with Nile Crossing's delta on its
  southern shore. It opens east to the ocean through the **Lantern Strait**, crossed by the
  long **Strait Bridge**.

**Mountains**

| Range | Where | Character | Peak height (world y) |
|---|---|---|---|
| **Crown Range** | east–west along z ≈ −3, from Fjordhavn to Old London | Alpine: horns, glaciers, passes. Highest around Alpenrose. | 260–340 m |
| **Arctic fells** | around Aurora | Rounded, snow-smoothed domes | 80–120 m |
| **Karst & crag belt** | Hanok → Jade Terraces | Granite crags with cliff pines, then limestone towers | 60–160 m |
| **Nusa volcanoes** | SW islands | 2–3 cones, one with a sand-sea caldera | 180–240 m |
| **Roof Range** | east–west along z ≈ 1.8, x −2.2 → +1.4 | Karakoram and Kashmir: granite needles, turquoise lakes, the Mirror Lake caldera under the Sky Isles | 280–380 m |
| **Sierra** | behind Madinat an-Nur | Snowy ridge feeding water channels; white villages on terraces | 150–200 m |
| **Atlas / Hajar ridge** | between Madinat an-Nur and Nile Crossing, and behind Souq al-Qamar | Dry rock, gorges, kasbahs, rose terraces | 120–200 m |
| **Blue ridges** | between New Yonder and Maple Row | Low, forested, layered ridges that turn blue with distance | 60–100 m |
| **Moon Hills** | south of Nile Crossing | Bare sandstone; source of the Long River | 60–90 m |

**Rivers**

1. **Glacier River.** Flows from the Alpenrose glacier south through the Meadow (as Wanderers'
   Brook), fills Mirror Lake, then continues south-west as the **Kaveri** to the backwaters.
   It connects north, centre and south-west.
2. **Tamesis.** Flows from the Crown Range north-east to Old London's estuary.
3. **Jade River.** Winds between karst towers westward to the Jade Sea, with bamboo rafts.
4. **Long River** (the Nile analogue). Flows north from the Moon Hills through Nile Crossing to a
   delta on the Middle Sea. It runs as a green ribbon with desert cliffs on both sides.
5. **Palisade River.** Flows from the blue ridges to New Yonder's harbour.
6. **Snowmelt channels** off the Sierra run through Madinat an-Nur's gardens (acequia-style)
   and off the Roof Range into Bagh-e-Noor's lotus lake.

### 2.2 The 20 lands

Coordinates are in km. **City radius** is the flattened, built footprint in metres; today every
city is 240. Core elevation is world y in metres. Grouping follows today's layout.

#### North

**Aurora Huts** (aurora) — centre (−5.4, −3.6), **radius 350 m**, core y ≈ 8.
- *Terrain:* snowfield tundra on a frozen bay, arctic fells behind, snowpine and birch in
  sheltered hollows, sea stacks offshore.
- *Districts:*
  - **Observatory Knoll**: the landmark aurora observatory with a glass dome and a 40 m mast.
  - **Glass-Dome Row**: domed huts for watching the sky.
  - **Sled Yard & reindeer pens.**
  - **Ice Harbour**: frozen jetties and ice-fishing holes.
  - **Sauna Lane**: A-frame cabins and steam.
- *Special:* aurora on every clear night north of z = −2.8.

**Fjordhavn** (norway) — centre (−2.9, −3.5), **radius 450 m**, core y ≈ 4. The city is a
*linear* ribbon along the fjord head, 1.2 km long and 250 m deep.
- *Terrain:* deep fjord with 150–250 m cliff walls and ribbon waterfalls, pine and birch, sheep
  pastures on shelves.
- *Districts:*
  - **Painted Wharf**: red, ochre and white warehouses.
  - **Stave Church Hill**: the landmark, a 38 m stepped timber church roof, shown as
    architecture only.
  - **Ferry Quay.**
  - **Upper Shelf Farms.**
  - **Boatbuilders' Slip.**

**Alpenrose** (switzerland) — centre (−0.4, −2.9), **radius 400 m**, core y ≈ 110 in a high
valley.
- *Terrain:* U-shaped valley, horn peaks to 340 m, glacier tongue, wildflower pastures, pine
  belts, lakes.
- *Districts:*
  - **Clock Square**: the landmark clock tower, 45 m.
  - **Chalet Terraces**, stepped up both valley walls.
  - **Dairy Quarter & market.**
  - **Lakeside Promenade.**
  - **Cable-car Station** to the glacier viewpoint.

**Old London** (london) — centre (2.3, −3.3), **radius 600 m**, core y ≈ 3.
- *Terrain:* Tamesis estuary, chalk downs to the south, plane-tree parks, marsh.
- *Districts:*
  - **Clock Tower Embankment**: the landmark, 90 m.
  - **Brick Terraces** (residential rows).
  - **Covent Market.**
  - **Docklands & tower bridge.**
  - **Royal Park.**
  - **Railway Arches workshops**, for the mechanics skill.

**New Yonder** (newyork) — centre (5.2, −2.9), **radius 650 m**, the largest city. Core y ≈ 2 on
an island plus two banks.
- *Terrain:* harbour islands, Palisade cliffs across the river, parkland.
- *Districts:*
  - **Spire District**: the landmark art-deco spire, 120 m.
  - **Harbour & ferry piers.**
  - **Central Park**: lake, rocks, the city's one "wild" area.
  - **Brownstone Blocks.**
  - **Market Hall & Painted Walls**, for paint and scrap.
  - **The Bridge**: a suspension bridge that also carries the highway in.

#### West — East Asia

**Hanok Village** (korea) — centre (−5.3, −1.0), **radius 420 m**, core y ≈ 20.
- *Terrain:* peninsula of pine hills, granite crags, tea terraces on south slopes, rocky coast.
- *Districts:*
  - **Palace Gate Court**: the landmark, a 30 m stacked-roof gate on a raised platform.
  - **Hanok Lanes**: courtyards and tiled walls.
  - **Paper Makers' Quarter**, for hanji.
  - **Pine Shore Market.**
  - **Tea Terrace Slope.**

**Sakura Hollow** (japan) — centre (−2.8, −0.5), **radius 450 m**, core y ≈ 40.
- *Terrain:* Kiso-style cedar valley opening into a lake basin, cherry hills, bamboo, a
  Fuji-like snow cone visible to the north-west (a Crown Range outlier).
- *Districts:*
  - **Pagoda Hill**: the landmark five-tier pagoda, 42 m.
  - **Post-town Street**: inns and water wheels.
  - **Lantern Canal.**
  - **Cedar Market.**
  - **Lakeside Tea Houses.**

**Jade Terraces** (china) — centre (−5.0, 1.8), **radius 500 m**, a terraced city stepping down
to the river. Core y ≈ 15–45.
- *Terrain:* karst towers along the Jade River, bamboo, willow banks, rice terraces upstream.
- *Districts:*
  - **Hall of the Blue Roof**: the landmark round three-tier hall on the top terrace, 36 m.
  - **Red Pillar Courtyards.**
  - **Silk Street.**
  - **River Quay** with bamboo rafts.
  - **Willow Gardens** and a moon-gate pond.

**Nusa Rinjani** (indonesia) — centre (−5.6, 4.4), **radius 400 m**, on the largest island.
Core y ≈ 12.
- *Terrain:* volcanic archipelago, a smoking cone at y ≈ 240 behind the city, rice terraces on its
  flanks, black-sand beaches, coconut and banana, mangrove shores.
- *Districts:*
  - **Stupa Terrace**: the landmark stepped stone monument, 35 m. Plain bell forms only.
  - **Horn-roof Longhouses.**
  - **Terrace Rim village.**
  - **Outrigger Beach.**
  - **Rattan Market.**

#### Centre

**Wanderers' Meadow** (meadow) — centre (0, 0), **radius 380 m**. It is deliberately softer and
looser than the other cities, a garden town rather than a metropolis. Core y ≈ 25.
- *Terrain:* high rolling grassland with flower drifts, Wanderers' Brook, oak and birch copses,
  windmill ridge. The Roof Range and the Sky Isles are always in view to the south.
- *Districts:*
  - **Great Oak Green**: the landmark great oak and wishing well. The oak is 30 m, but it sits on
    a knoll so it reads from afar.
  - **Round Cottage Circles.**
  - **Windmill Ridge.**
  - **Sarvatara's Garage**, where the van lives.
  - **Brookside Market.**
- *Role:* the **hub**, where five highway spokes start.
- *Special:* rainbows by day, fireflies and stars by night.

**The Sky Isles** (skyisles) — floating above the Mirror Lake caldera at (0.2, 1.7), island
cluster **spread over 600 m**, base y ≈ 420.
- *Terrain:* cloud-meadow islands and crystal spires, with cloud falls pouring into Mirror Lake.
- *Districts:* **Temple of the Great Lantern** (the world landmark) and **Isle of Beginnings**,
  **Bridge of Light**, **Cloud Orchard** and **Star Library**, each on its own isle.
- *Access:* no road. Cape flight, the Lantern Stair, or the biplane.

#### East — the Middle Sea lands

**Firenzia** (renaissance) — centre (2.7, −0.6), **radius 550 m**, on hills above the Middle Sea's
north-west shore. Core y ≈ 30.
- *Terrain:* Val d'Orcia-style rolling wheat and cypress hills, olive terraces, a marble quarry
  ridge, a river through town.
- *Districts:*
  - **Duomo Hill**: the landmark dome, 70 m, and a bell tower, 80 m.
  - **Bridge of Shops** over the river.
  - **Loggia Square & market.**
  - **Potters' Quarter.**
  - **Hillside Gardens.**
  - **Old Harbour** on the sea.

**Maple Row** (vintage) — centre (5.4, −0.2), **radius 450 m**, on the Middle Sea's north-east
shore beside the strait. Core y ≈ 10.
- *Terrain:* autumn maple and oak forest, blue ridges inland, rocky coves, covered-bridge creeks.
- *Districts:*
  - **Carousel Pier**: the landmark carousel and a 30 m bandstand-lighthouse.
  - **Awning Main Street.**
  - **Diner & Jukebox Row.**
  - **Cider Orchard Edge.**
  - **Strait Bridgehead.**

**Madinat an-Nur** (islamic) — centre (2.6, 2.0), **radius 550 m**, on the south-west shore of
the Middle Sea, backed by the Sierra. Core y ≈ 20.
- *Terrain:* terraced orange groves, snowmelt channels, white hill villages, palms at the shore,
  Sierra snow behind.
- *Districts:*
  - **Great Masjid & Reflecting Pool**: the landmark, four 50 m minarets.
  - **Palace Gardens** on a ridge above: courtyards, water stairs.
  - **Tile Makers' Souq.**
  - **Orange Court Quarter.**
  - **Calligraphers' Library.**
  - **Sea Gate harbour.**

**Souq al-Qamar** (middleeast) — centre (5.3, 2.4), **radius 500 m**, on the south-east shore where
the Middle Sea meets the strait. Core y ≈ 8.
- *Terrain:* sand-coloured coastal plain, date palms, Hajar-style ridge behind, wadis.
- *Districts:*
  - **Fort-Souq**: the landmark fort, 35 m, with a wind-tower skyline.
  - **Covered Souq lanes.**
  - **Wind-Tower Quarter.**
  - **Dhow Harbour.**
  - **Date Gardens & falaj channel.**
  - **Lantern Alley.**

#### South — South Asia

**Kaveri Coast** (indiasouth) — centre (−3.4, 4.3), **radius 450 m**, on the backwaters. Core
y ≈ 2.
- *Terrain:* coconut coast, backwater canals and paddy, monsoon hills with waterfalls inland,
  tea hills higher up.
- *Districts:*
  - **Gopuram Gate**: the landmark stepped tower, 45 m.
  - **Canal Quarter** with houseboats.
  - **Spice Market.**
  - **Jasmine Lanes.**
  - **Elephant Grove.**

**Gulabi Nagar** (indianorth) — centre (−1.5, 3.4), **radius 550 m**, on the dry plain south of
the Roof Range. Core y ≈ 30.
- *Terrain:* Thar-style scrub and small dunes to the south-west, a lake with a palace island,
  stepwells, and the white salt flat on the coast to the south.
- *Districts:*
  - **Palace of Winds**: the landmark pink screen façade, 32 m, plus a hilltop fort on a 60 m
    ridge.
  - **Bazaar Walls.**
  - **Lake Palace Ghats.**
  - **Stepwell Square.**
  - **Potters' Gate.**

**Bagh-e-Noor** (mughal) — centre (0.6, 4.0), **radius 450 m**, in a Kashmir-like vale on the
Roof Range's south slope. Core y ≈ 50.
- *Terrain:* lotus lake with floating gardens, chinar-like plane trees (`plane` flora), terraced
  water gardens climbing the slope, cypress avenues, rose fields.
- *Districts:*
  - **White Tomb Charbagh**: the landmark white dome, 55 m, with four minarets.
  - **Terrace Water Garden**, twelve steps up the hill.
  - **Lotus Lake & boat ghats.**
  - **Red Gate bazaar.**
  - **Saffron Fields edge.**

#### South-east — Egypt and Arabia

**Nile Crossing** (egypt) — centre (3.1, 4.3), **radius 450 m** straddling both banks of the
Long River. Core y ≈ 4.
- *Terrain:* green ribbon ~300 m wide (date palms, sugar cane, papyrus) between limestone cliffs
  and open desert.
- *Districts:*
  - **Pyramid Plateau**: the landmark, 80 m, on the west bank desert edge.
  - **Obelisk Quay.**
  - **Felucca Harbour.**
  - **Papyrus Workshops.**
  - **Dovecote Village**, on the east bank.

**Tents of Rimal** (desert) — centre (5.6, 4.6), **radius 400 m**. A *tent city* at a large oasis
in the dune sea. Core y ≈ 15.
- *Terrain:* golden erg with 60–90 m star dunes, a red sandstone massif with arches to the north,
  an oasis pool and palm ring.
- *Districts:*
  - **Oasis Pool**: the landmark, a palm ring plus a 25 m watch tower.
  - **Great Majlis Tent.**
  - **Weavers' Tents**, for camel wool.
  - **Camel Yard.**
  - **Star Dune**, a viewing crest with fire pits.

---

## 3. Highway network

Lengths are **road lengths** between city centres, including a winding factor (×1.2 on flat
land, up to ×1.5 over passes). **Open country** is road length minus the two city radii. Van
times are at ~87 % of top speed. "Sightings" are the headline natural features; fill the gaps
with procedural roadside moments. Every segment gets one **Thread Rest** at its best reveal.

### 3.1 Segment table

| # | Segment | Class | Road km | Open country km | Van | Walk | Terrain passed |
|---|---|---|---|---|---|---|---|
| 1 | Aurora ↔ Fjordhavn | H | 3.4 | 2.6 | 2.3 min | 9 min | tundra → arctic coast → fjord cliffs |
| 2 | Fjordhavn ↔ Alpenrose | H + S (ladder) | 3.9 | 3.0 | 2.6 min | 10 min | fjord → hairpin ladder → plateau lakes → alpine valley |
| 3 | Alpenrose ↔ Old London | H + S (pass) | 3.8 | 2.8 | 2.6 min | 10 min | pass summit → waterfall valley → honey-stone downs → chalk coast |
| 4 | Old London ↔ New Yonder | H | 3.5 | 2.3 | 2.4 min | 9 min | estuary marsh → heath headland → Sound bridge |
| 5 | Aurora ↔ Hanok Village | H | 3.5 | 2.7 | 2.4 min | 9 min | black-sand coast → geothermal field → taiga → pine coast |
| 6 | Hanok ↔ Sakura Hollow | H | 3.3 | 2.4 | 2.3 min | 8 min | tea terraces → volcanic cone coast → cherry river |
| 7 | Hanok ↔ Jade Terraces | H | 3.5 | 2.6 | 2.4 min | 9 min | granite crags & cloud sea → crane marsh → first karst |
| 8 | Sakura Hollow ↔ Jade Terraces | H | 4.1 | 3.2 | 2.8 min | 11 min | cedar post road → bamboo → karst river |
| 9 | Jade Terraces ↔ Nusa Rinjani | H + causeway | 3.5 | 2.6 | 2.4 min | 9 min | dragon's-backbone terraces → sandstone pillars → mangrove estuary → causeway |
| 10 | Nusa Rinjani ↔ Kaveri Coast | H + causeway | 2.6 | 1.8 | 1.8 min | 7 min | caldera rim → black beach → strait → palm coast |
| 11 | Kaveri Coast ↔ Gulabi Nagar | H | 2.5 | 1.5 | 1.7 min | 6 min | backwaters → monsoon hills & tea → dry plain |
| 12 | Gulabi Nagar ↔ Bagh-e-Noor | H | 2.6 | 1.6 | 1.8 min | 7 min | dunes & salt flat → canal fields → garden vale |
| 13 | Bagh-e-Noor ↔ Nile Crossing | H | 3.2 | 2.3 | 2.2 min | 8 min | lotus vale → dry hills → Long River greenbelt |
| 14 | Nile Crossing ↔ Tents of Rimal | H | 3.0 | 2.2 | 2.1 min | 8 min | greenbelt → black & white deserts → salt-lake oasis → erg |
| 15 | New Yonder ↔ Maple Row | H | 3.3 | 2.2 | 2.2 min | 8 min | Palisade river → blue ridges → foliage valleys |
| 16 | Maple Row ↔ Souq al-Qamar | H + Strait Bridge | 3.4 | 2.4 | 2.3 min | 9 min | coves → **Strait Bridge** → coastal sabkha → date palms |
| 17 | Souq al-Qamar ↔ Tents of Rimal | H | 2.9 | 2.0 | 2.0 min | 7 min | Hajar ridge & wadis → red sandstone → dune sea |
| 18 | Firenzia ↔ Maple Row | H | 3.3 | 2.3 | 2.2 min | 8 min | cypress hills → travertine terraces → sea cliffs → autumn woods |
| 19 | Firenzia ↔ Madinat an-Nur | H | 3.1 | 2.0 | 2.1 min | 8 min | olive terraces → marble ridge → Sierra white villages → orange groves |
| 20 | Madinat an-Nur ↔ Nile Crossing | H + S (Atlas) | 2.8 | 1.8 | 1.9 min | 7 min | Atlas hairpins → kasbah valley → gorge → delta |
| 21 | Souq al-Qamar ↔ Nile Crossing | H | 3.8 | 2.8 | 2.6 min | 10 min | south shore sabkha → delta lagoons → papyrus |
| 22 | Old London ↔ Firenzia | H | 3.6 | 2.4 | 2.4 min | 9 min | highland glen → lake-district tarns → alpine lake → Tuscan hills |
| 23 | Meadow ↔ Alpenrose | H (spoke) | 4.1 | 3.3 | 2.8 min | 11 min | high grassland → Glacier River gorge → alpine pastures |
| 24 | Meadow ↔ Sakura Hollow | H (spoke) | 3.6 | 2.8 | 2.4 min | 9 min | flower downs → birch–oak → cherry hills & snow cone |
| 25 | Meadow ↔ Firenzia | H (spoke) | 3.3 | 2.4 | 2.3 min | 9 min | windmill ridge → poppy & wheat → cypress, first sea view |
| 26 | Meadow ↔ Madinat an-Nur | H (spoke) | 4.1 | 3.2 | 2.8 min | 11 min | grassland → **Mirror Lake shore under the Sky Isles** → lavender & rose → orange groves |
| 27 | Meadow ↔ Bagh-e-Noor | **S (Roof Pass)** | 6.1 | 5.3 | 4.2 min | 16 min | grassland → granite needles → turquoise lake → snow pass → chinar vale |

The total is about **95 km**. **Build in phases:**

- **Phase A:** the five Meadow spokes (23–27) plus 1, 4, 11, 14 and 16. This makes a playable
  loop through all four quarters.
- **Phase B:** the rest of the coast loop.
- **Phase C:** the cross-links (7, 8, 18–22).
- If needed, shorten by applying `WORLD_SCALE` rather than removing roads.

Water links, all optional:

- A **ferry** across the Middle Sea, Firenzia ↔ Madinat an-Nur (~2 km, 80 s), with dolphins.
- A **unicorn glide** over any water.
- The **Lantern Stair** from Mirror Lake to the Sky Isles.

### 3.2 Segments in detail

Each segment lists its **sightings** (the natural features passed on the highway) and its
**side roads** (branch roads to settlements). The type of each settlement and what is there
are given inline.

**1 · Aurora ↔ Fjordhavn — "The Arctic Shore"**
- *Sightings:*
  - A frozen lake with pressure ridges and ice-fishing holes.
  - A reindeer herd crossing the road (a timed moment).
  - Sea stacks and a sea arch with the aurora behind them at night. The "clear-sky hole" idea:
    this stretch is always clear.
  - A sea-cliff waterfall dropping straight into the bay, Múlafossur-style.
- *Side roads:*
  - **Revontuli Camp** (*northern-lights hut camp*): glass-dome huts, a sauna, reindeer
    pens, a husky yard and a sky-watching bench ring. Beacon: the domes glow green at night.
  - **Rorbu Point** (*fishing hamlet*): red stilt cabins over water, fish-drying racks, an
    arched bridge to an islet, boat sheds.

**2 · Fjordhavn ↔ Alpenrose — "The Troll Ladder"**
- *Sightings:*
  - A triple waterfall ("seven sisters" style) seen across the fjord from the shore road.
  - An **11-bend hairpin ladder** up a 200 m wall, with a waterfall passing under a stone bridge
    at bend 6.
  - A **cantilevered viewing deck** jutting 30 m out, 150 m above the fjord (the Thread Rest).
  - A plateau of snowmelt lakes and cairns, then a glacier tongue with a meltwater lake at the
    pass.
- *Side roads:*
  - **Grasstak** (*turf-roof hamlet*): black timber cottages with grass roofs, sheep,
    a weaver.
  - **High Seter** (*summer dairy*): goat huts, a cheese kitchen, cowbells. It sits in a flower
    meadow on a shelf.

**3 · Alpenrose ↔ Old London — "The Three Passes"**
- *Sightings:*
  - A granite pass with a dammed turquoise lake and slabs polished by old ice (Grimsel-like).
  - The **Valley of Falls**: a sheer U-valley with a dozen ribbon falls, one breaking into mist
    before it lands (Lauterbrunnen/Staubbach-like).
  - Honey-stone downs with a packhorse bridge over the Tamesis headwaters.
  - Where the road touches the coast, **white chalk cliffs** in a wave-cut row.
- *Side roads:*
  - **Wengi** (*car-free cliff village*): reached by a P-path and cable-car, perched
    above the Valley of Falls, with a chalet inn and a telescope.
  - **Stonerow** (*weavers' hamlet*): honey-stone cottages on a stream, a mill wheel,
    a wool market.

**4 · Old London ↔ New Yonder — "The Sound"**
- *Sightings:*
  - A tidal estuary with mudflats and red-sailed barges.
  - A heathland headland with a striped lighthouse on a stack.
  - A covered bridge over a creek in autumn colour.
  - **The Sound Bridge reveal**: New Yonder's skyline across the harbour, best at dusk when the
    windows light.
- *Side roads:*
  - **Gull Harbour** (*fishing hamlet*): clapboard huts, lobster-pot stacks, a
    chowder stall.
  - **Keeper's Light** (*lighthouse cottage*): one keeper, a tiny garden, a letter to deliver.

**5 · Aurora ↔ Hanok — "The Fire-and-Ice Coast"**
- *Sightings:*
  - A **glacier lagoon** with drifting icebergs and ice chunks on a black-sand beach
    ("diamond beach").
  - A **basalt-column sea cave**.
  - A steaming **geothermal field** with hot pools and a geyser on a timer.
  - Taiga lakes under the aurora, with the northern lights visible up to about z = −2.
- *Side roads:*
  - **Steamvale** (*hot-spring hamlet*): turf bathhouses (separate for men and women), wooden
    boardwalks, eggs cooked in the ground.
  - **Taiga Lodge** (*northern-lights hut camp*): log cabins round a fire, a sled track,
    an owl.

**6 · Hanok ↔ Sakura Hollow — "Tea and Blossom"**
- *Sightings:*
  - **Green tea terraces** combed round a hill, with a viewing platform at the top
    (Boseong-like).
  - A coastal **tuff cone crater** rising from the sea (Jeju-like).
  - A **cherry-blossom stream tunnel** with boardwalks and an arched red bridge.
  - A maple gorge with granite crags, fiery in autumn.
- *Side roads:*
  - **Dawon** (*tea-pickers' village*): drying sheds, a tea house, terrace paths.
  - **Squid-Light Cove** (*fishing hamlet*): drying racks and lamp-boats that glow at night.

**7 · Hanok ↔ Jade Terraces — "Above the Clouds"**
- *Sightings:*
  - **Granite peaks with cliff pines over a sea of clouds**, a morning-only fog layer below the
    road (Huangshan/Seoraksan-like).
  - A reed marsh with cranes.
  - The first karst towers on the horizon, a *reveal* as the road crests.
- *Side roads:*
  - **Cloud Gate Retreat** (*hill retreat*): a stone stair of ~300 steps to a quiet hilltop
    library-retreat with a bell pavilion, pines and a scholar's rock garden. Architecture only,
    no statues.
  - **Crane Marsh** (*reed-hut hamlet*): stilt huts, boardwalks, a boat-builder.

**8 · Sakura Hollow ↔ Jade Terraces — "The Inner Mountain Road"**
- *Sightings:*
  - A **cedar and cypress forest corridor** where the highway runs beside a stone-paved old road
    (Kiso/Nakasendo-like).
  - Twin waterfalls, a tall one and a short one.
  - A **bamboo tunnel**.
  - Karst towers reflected in the Jade River, with bamboo rafts.
- *Side roads:*
  - **Kiso-juku** (*post town*): a preserved street of timber inns, a water wheel,
    a horse stable, a signboard of the old road.
  - **Yuzawa** (*onsen hamlet*): steaming pools in snow-dusted cedars.

**9 · Jade Terraces ↔ Nusa Rinjani — "Dragon's Backbone"**
- *Sightings:*
  - **Dragon's-backbone rice terraces** wrapping a ridge from river to summit (Longji-like).
    Flooded and mirror-like in spring, green in summer, gold in autumn.
  - **Sandstone pillar forest** in mist (Zhangjiajie-like).
  - A mangrove estuary.
  - A **3-arch causeway** to the islands with the volcano across the strait.
- *Side roads:*
  - **Longji Stilt Village** (*terrace village*): wooden stilt houses, a drum tower,
    water buffalo.
  - **Mangrove Stilts** (*fishing village*): houses on piles, a plank-walk, fish traps.

**10 · Nusa Rinjani ↔ Kaveri Coast — "Fire Mountains"**
- *Sightings:*
  - A **caldera with a grey sand sea** and a smoking cone (Bromo-like), seen at sunrise from the
    rim road.
  - A **turquoise crater lake** that glows with blue flame at night (Ijen-like).
  - A black-sand beach with outrigger canoes.
  - Cooperative water-temple rice terraces (subak-like), shown only as water gates and channels.
- *Side roads:*
  - **Rim Village** (*caldera-rim hamlet*): a sunrise viewpoint, pony stable, blanket sellers.
  - **Outrigger Bay** (*fishing hamlet*): canoes on the sand, a net-mending shade.

**11 · Kaveri Coast ↔ Gulabi Nagar — "Backwaters to the Plain"**
- *Sightings:*
  - **Backwater canals** with houseboats, paddy and coconut.
  - A **broad monsoon waterfall** in the hills (a wide curtain, not a ribbon).
  - **Misty tea hills**, clipped rounded bushes in rows (Munnar-like).
  - A deep geometric **stepwell** at the edge of the dry plain.
- *Side roads:*
  - **Kuttanad Jetty** (*houseboat hamlet*): moored houseboats you can board and rent.
  - **Tea Estate** (*plantation village*): a bungalow, factory, pickers' paths.

**12 · Gulabi Nagar ↔ Bagh-e-Noor — "White Desert, Lotus Vale"**
- *Sightings:*
  - A **white salt flat** with a hexagon crust, crossed by a dead-straight **causeway**
    ("Road to Heaven"-like). At full moon the flat glows.
  - A dune field with a camel caravan.
  - A lake palace on a lake.
  - Canal-irrigated mustard and wheat fields, yellow in season.
- *Side roads:*
  - **Sam Dunes Camp** (*desert tent camp*): canvas tents, fire circle, musicians,
    sand-sledding.
  - **Bhunga Salt Village** (*salt-pan village*): round mud huts with mirror-work walls,
    salt heaps, embroidery.

**13 · Bagh-e-Noor ↔ Nile Crossing — "Gardens to the River"**
- *Sightings:*
  - A **lotus lake with floating gardens** and canopied boats (Dal Lake-like), plus a
    **twelve-step terraced water garden** climbing a slope.
  - Dry sandstone hills with a lone acacia.
  - The **greenbelt contrast view**: bright fields on one side, limestone cliffs and sand on the
    other, felucca sails on the river.
- *Side roads:*
  - **Khan al-Wasat** (*caravanserai*): a square courtyard inn with a well, arcades,
    camels, merchants. The model for every caravanserai in the game.
  - **Reedhaven** (*papyrus village*): reed boats and paper-makers.

**14 · Nile Crossing ↔ Tents of Rimal — "Black, White, Gold"**
- *Sightings:*
  - A **black desert** of basalt-capped hills.
  - The **White Desert**: chalk "mushrooms" and wind-carved towers on pale ground.
  - A **salt-lake oasis** with palm islands and mirror pools (Siwa-like).
  - A **mega-dune** 90 m tall beside the road (Moreeb-like), with a slipface.
- *Side roads:*
  - **Siwa Oasis** (*oasis village*): a mud-brick hill town, salt pools to float in,
    date palms.
  - **Bayt ash-Sha'r** (*Bedouin tent camp*): black goat-hair tents, coffee over a
    fire, stars.

**15 · New Yonder ↔ Maple Row — "The Blue Ridge Parkway"**
- *Sightings:*
  - **Palisade cliffs** along the river.
  - **Layered blue ridges** from a string of overlooks. Put 3 small pull-offs here; this road is
    the parkway archetype.
  - A **covered bridge** over a creek in red and gold foliage.
  - A tiered waterfall in a forest gorge.
- *Side roads:*
  - **Cider Mill Farm** (*farm village*): orchard, press, pumpkin field, farm stand.
  - **Loon Lake** (*cabin hamlet*): canoes, a dock, loons calling at dusk.

**16 · Maple Row ↔ Souq al-Qamar — "The Strait"**
- *Sightings:*
  - Rocky coves with a sea arch.
  - **The Strait Bridge**, 700 m long and the longest structure in the world, with ships passing
    under.
  - A **coastal sabkha** (salt flat) with flamingos.
  - A **wadi of turquoise pools** in a palm gorge (Wadi Shab-like), reached by a P-path.
- *Side roads:*
  - **Dhow Yard** (*fishing hamlet*): dhows being built on the beach, nets, a fish grill.
  - **Wadi Village** (*palm village*): falaj channels between gardens.

**17 · Souq al-Qamar ↔ Tents of Rimal — "Rose Mountain to Red Sand"**
- *Sightings:*
  - **Rose Mountain terraces**: stepped orchards and rose beds on a steep face, fed by channels
    (Jebel Akhdar-like). The roses bloom in spring.
  - A **red sandstone massif** with **natural arches** and rock bridges (Wadi Rum-like).
  - The edge of the **golden dune sea**, a reveal from a col.
- *Side roads:*
  - **Rose Terraces** (*mountain village*): a rose-water still, pomegranate trees, a
    precarious stair.
  - **Najm Camp** (*Bedouin star camp*): tents tucked against the red cliffs, rugs,
    telescope, no lights.

**18 · Firenzia ↔ Maple Row — "The North Shore"**
- *Sightings:*
  - A **cypress-lined S-road** up a wheat hill to a walled hill-town tower (Val d'Orcia-like).
  - **White travertine terraces** of steaming blue pools cascading down a slope
    (Pamukkale-like).
  - Sea cliffs with a lone umbrella pine.
  - Where the land turns cooler, the first maples.
- *Side roads:*
  - **Monticello** (*hill town*): medieval walls, one tower, a bakery.
  - **Frantoio** (*olive-press farm*): a stone press, groves, oil jars.

**19 · Firenzia ↔ Madinat an-Nur — "The West Shore"**
- *Sightings:*
  - A **marble quarry ridge** with white cuts and stepped benches.
  - **White villages clinging to a Sierra slope**, with flat roofs and chimneys, and snowmelt
    channels feeding terraces (Alpujarras-like).
  - A **waterfall of irrigation water** tumbling through orange terraces.
  - The Middle Sea glittering from a high bend.
- *Side roads:*
  - **Qaryat al-Bayda** (*white hill village*): flat roofs, covered alleys, acequia
    channels, a carpet loom.
  - **Quarry Camp** (*workers' hamlet*): marble blocks, a crane, a stone-carver
    teaching pottery and marble crafts.

**20 · Madinat an-Nur ↔ Nile Crossing — "Kasbah Road"**
- *Sightings:*
  - **Atlas hairpins** over a 2,000 m-style pass (Tizi n'Tichka-like).
  - An **earthen fortified village** stacked on a hill above a river (Aït Benhaddou-like).
  - A **narrow gorge** with 150 m walls just wider than the road (Todra-like). The road runs
    through it: a denial space before the delta reveal.
  - A **ribbon oasis** of palms along a dry river.
- *Side roads:*
  - **Ksar Tamdakht** (*kasbah village*): mud towers, a well, a date market.
  - **Caravanserai of the Pass** (*caravanserai*): a mule yard and a mint-tea
    fire.

**21 · Souq al-Qamar ↔ Nile Crossing — "The Delta"**
- *Sightings:*
  - **Delta lagoons** with papyrus and herons.
  - A **mirror sabkha** that reflects the sky after rain.
  - Egyptian **dovecote towers** in the fields.
  - A pharos-style lighthouse on the sea mole.
- *Side roads:*
  - **Burg al-Hamam** (*delta village*): dovecotes, mud-brick houses, a water wheel.
  - **Lagoon Hamlet** (*fishing hamlet*): reed huts, flat boats.

**22 · Old London ↔ Firenzia — "The Grand Tour"**
- *Sightings:*
  - A **highland glen** with three stepped peaks (Glencoe-like) and heather.
  - **Lake-district tarns** with stone walls.
  - A long **alpine lake** with villa gardens and a steamer (Como-like).
  - A **stone viaduct** over a wooded gorge.
- *Side roads:*
  - **Croft of Glen** (*highland croft*): stone cottages, shaggy cattle, peat smoke.
  - **Boathouse Bay** (*lakeside hamlet*): wooden boathouses, a steamer pier.

**23 · Meadow ↔ Alpenrose — "Up the Glacier River"**
- *Sightings:*
  - **Rainbow Falls**: a gorge waterfall where the spray makes a rainbow every sunny afternoon.
  - **Alpine flower slopes** with cows and bells.
  - A **horn peak reveal** around a bend (a Matterhorn-like silhouette).
  - The **glacier** and its milky river.
- *Side roads:*
  - **Rainbow Hill** (*high-grassland cottage village*): round cottages with painted roofs on a
    windy upland, **rainbows by day and a dense star field by night**, a stargazing
    hill, a bee meadow. This is the owner's brief.
  - **Jailoo Camp** (*summer-pasture felt-tent camp*): white felt tents by a high lake,
    horses, a yoghurt stall (Song Kol-like).

**24 · Meadow ↔ Sakura Hollow — "Blossom Road"**
- *Sightings:*
  - A **windmill ridge** in a flower sea.
  - A **hillside cherry grove** where petals blow across the road.
  - A **mirror lake with a snow-capped cone** reflected in it.
  - A wisteria tunnel.
- *Side roads:*
  - **Firefly Hollow** (*firefly hamlet*): cottages by a slow stream, a lantern bridge. It
    comes alive at dusk.
  - **Hanabatake** (*flower-farm village*): striped flower fields, a seed shop.

**25 · Meadow ↔ Firenzia — "Wheat and Poppies"**
- *Sightings:*
  - A **lone great tree on a hill**. This is the BotW triangle: the tree is the reveal and the
    hill hides the valley.
  - **Poppy and wheat fields** in bands.
  - A **stone aqueduct** marching across a valley.
  - The **first sight of the Middle Sea** from a crest.
- *Side roads:*
  - **Mulino** (*windmill village*): a flour mill and bakery.
  - **Apiary Hamlet** (*beekeepers*): hives in lavender, a honey stall.

**26 · Meadow ↔ Madinat an-Nur — "Under the Sky Isles"**
- *Sightings:*
  - **Mirror Lake**, a caldera lake that reflects the Sky Isles floating overhead.
  - **Cloud falls** pouring from the isles into the lake, lit gold at night by the Great
    Lantern.
  - **Lavender and damask-rose fields**.
  - Terraced orange groves.
- *Side roads:*
  - **Lanternside** (*lantern-makers' hamlet*): a lakeside village where every house hangs a
    lamp, with the lampcraft trainer and the base of the Lantern Stair.
  - **Khan an-Nahr** (*caravanserai*): by the lake outlet.

**27 · Meadow ↔ Bagh-e-Noor — "The Roof Pass"** (S-class, the one long mountain road)
- *Sightings:*
  - A row of **granite needle peaks** ("cathedral" cones, Passu-like).
  - A **turquoise landslide lake** with a swaying **suspension footbridge** (Attabad and Hussaini
    bridge-like).
  - A **snow-walled pass summit** with strings of coloured cloth pennants in the wind.
  - A **cliff retreat** stacked up a crag (Thiksey-like), seen across the valley.
  - The descent into the chinar and lotus vale of Bagh-e-Noor.
- *Side roads:*
  - **Ridge Retreat** (*hill monastery*): a white-and-ochre stacked stone retreat on a crag, a
    library and a butter-lamp hall. Architecture only, no statues.
  - **Apricot Terraces** (*mountain village*): orchards, a glacier-snout walk, stone houses with
    flat roofs drying fruit.
  - **Glacier Hut** (*climbers' hut*): the highest bed in the world, beside ice.

**Settlements:** 55 in total across the 27 segments, about 2 per segment. Types used:

| Type | Count |
|---|---|
| Fishing hamlet (in its regional variants) | 7 |
| Caravanserai | 3 |
| Northern-lights hut camp | 2 |
| Desert or Bedouin tent camp | 3 |
| Hill retreat / monastery | 2 |
| High-grassland cottage village | 1 |
| Summer-pasture camp | 1 |
| Everything else | terraces, oases, post town, onsen, kasbah, croft… |

Each settlement is a small data record, reusing the land's kit with a different palette weight.
A record holds:
- 5–15 buildings
- 2–4 residents and 1 side quest
- 1 trade good
- 1 beacon

---

## 4. Terrain and biome catalogue (low-poly rendering)

**Conventions.**
- *Ground* and *alt* feed `groundColor` (lerped by noise).
- *Cliff* is used when the slope is above about 40°. This is the height-gradient plus
  slope-gradient technique.
- *Height character* describes the noise recipe:
  - **fbm**: soft rolling.
  - **ridged**: `1−|2n−1|`.
  - **terraced**: quantise the height into steps with smooth risers.
  - **worley peaks**: sparse cones from cellular noise.
  - **dune**: `|sin|` ridges along a domain-warped wind axis.
- Flora names in `code` exist in `kit.ts`. *New* marks a species the kit would need.
- Keep saturation mid-high but avoid "neon grass". Stylised-art guides warn that pushing grass
  saturation too far ruins low-poly.

| # | Biome | Ground / alt / cliff | Height character | Vegetation | Water & sky notes | Used in |
|---|---|---|---|---|---|---|
| 1 | Snowfield tundra | `#e9f0f7` / `#d6e4f0` / `#9aa7b4` | fbm, low domes, amplitude 20–40 m | sparse `snowpine`, *new* lichen tufts (flat discs) | ice sheet `#cfe6f2` with crack lines; aurora | Aurora, seg 1 & 5 |
| 2 | Taiga | `#5f7f5a` / `#8aa07a` / `#6b6f70` | fbm + low ridged | `snowpine`, `pine`, `birch` (ecotone) | dark lakes `#2e4a5a` | seg 5 |
| 3 | Fjord cliffs | `#6f9a5a` / `#557f4a` / `#5e6468` | ridged valleys cut below sea level, 150–250 m walls | `pine`, `birch` on shelves only | deep teal `#1f5260`; ribbon waterfalls | Fjordhavn, seg 2 |
| 4 | Arctic coast & black sand | `#3a3a40` sand / `#6f8a6a` turf / `#2c2c30` basalt | flat beach, **hex-prism basalt columns** (instanced hexagonal cylinders) | turf, no trees | white surf, drifting icebergs (low-poly shards `#d8f0ff`) | seg 1, 5 |
| 5 | Geothermal field | `#b8a98a` / `#d9c27a` (sulphur) / `#7a6a5a` | flat with mounds | none | pools `#5fd0d8`, steam particles, timed geyser | seg 5 |
| 6 | Alpine meadow | `#7fb35a` / `#94c46a` / `#8a8a8a` | U-valley: a parabola across the valley + ridged horns | `pine` belts, flower dots `#ffffff #ff6b8b #f2d14e` | snowline ~y 200; cowbell ambience | Alpenrose, seg 23 |
| 7 | Glacier & high rock | `#f5f8ff` / `#dbe9f7` / `#7d8894` | ridged, crevasse stripes painted as darker blue lines | none | meltwater `#9fd8e0` milky | seg 2, 23 |
| 8 | Chalk downs & cliffs | `#8ab86a` / `#a3c77a` / `#f2f0e8` chalk | smooth fbm; sea edge cut vertical in a wave pattern | `oak` copses, hedgerow lines | grey-blue sea `#5a7f8f` | seg 3 |
| 9 | Heath & highland glen | `#7a6a5a` / `#9a6a8a` heather / `#6a6a6a` | long ridged valleys | few trees; *new* gorse | peat-brown tarns `#3a3a30` | seg 22 |
| 10 | Autumn forest & blue ridges | `#8fae5c` / `#c27a3a` / `#7a6a60` | parallel ridged ranges; distance fog tinted `#8fa6c9` | `maple` (red/orange/gold variants), `oak`, `birch` | leaves ambient | Maple Row, seg 15 |
| 11 | Flower grassland (high downs) | `#96cf6c` / `#b3dd7a` / `#8f9a7a` | gentle fbm, large wavelength; knolls | `oak`, `birch`, `sakura` accents; flower drifts | rainbow; fireflies; star field | Meadow, seg 23–26 |
| 12 | Wheat & cypress hills | `#c9b36a` / `#9fb86a` / `#b09a7a` | fbm rolling; field patchwork painted by low-frequency cells | `cypress` rows along roads, `olive` | golden hour | Firenzia, seg 18, 25 |
| 13 | Mediterranean maquis & groves | `#a9b87a` / `#c2c98a` / `#c9b08a` | terraced slopes (step 2–3 m) | `olive`, `orange`, `cypress`, `palm` near the shore | sea `#2f8fa5` | Madinat an-Nur, seg 19 |
| 14 | Pine crag & sea of clouds | `#6f8a5a` / `#8a9a7a` / `#bdb8ae` granite | worley peaks + ridged, 80–160 m | *new* cliff pine (flat-crowned, leaning) | fog layer plane at a fixed y, morning only | seg 7 |
| 15 | Tea terraces | `#5f9f4a` / `#7fb85a` / `#8a7a5a` | terraced contours following the hill (rows as stripes) | *new* tea bush rows (rounded boxes) | mist | Hanok, seg 6, 11 |
| 16 | Cherry hills | `#8cbf6a` / `#a3cf7a` / `#8a7a6a` | fbm | `sakura`, `pine`, `bamboo` | petals ambient | Sakura Hollow, seg 6, 24 |
| 17 | Cedar & bamboo valley | `#5f8a4a` / `#6f9a5a` / `#6a6050` | steep V-valley, river in the floor | *new* cedar (tall narrow cone), `bamboo` | green-tinted light | seg 8 |
| 18 | Karst river | `#86b86a` / `#6fa65a` / `#9a9a8a` limestone | **worley peaks** as tall, narrow towers (h 60–120 m, radius 30–50 m) on a flat floodplain | `bamboo`, `willow` on banks | jade water `#3fa58a`; morning mist | Jade Terraces, seg 7–9 |
| 19 | Rice terraces | flooded `#9fc9d8` / green `#6fbf5a` / gold `#d9c26a`, risers `#7a6a4a` | **terraced**, step 1.5 m following contours | `palm`, `banana` on ridges | seasonal colour cycle | seg 9, 10, Nusa |
| 20 | Volcanic caldera | ash `#8a8580` / `#a8a29a` / `#4a4040` | cone: radial falloff + crater dip; caldera floor flat "sand sea" | none on the sand; `palm` on the lower flanks | smoke column; crater lake `#6fd8c8`, blue flame at night | Nusa, seg 10 |
| 21 | Tropical coast | `#6fbf5a` / `#e8d6a0` sand / `#6a5a4a` | flat to gentle | `coconut`, `palm`, `banana` | lagoon `#3fc0c8` | Kaveri, Nusa |
| 22 | Mangrove & backwater | `#4f8a4a` / `#6a7a4a` mud / — | at water level ±0.5 m, braided channels | *new* mangrove (canopy on arched stilt roots), `coconut` | brown-green water `#4a7a5a`; tide shifts water y | seg 9, 11, 21 |
| 23 | Monsoon hills | `#4f9a3f` / `#6fb85a` / `#5a4a3a` laterite | ridged, steep | `banana`, `palm`, dense *new* jungle clump | broad waterfall | seg 11 |
| 24 | Thar scrub & dunes | `#d9c28a` / `#c2b27a` / `#b08a5a` | small dunes (amplitude 6–12 m) | *new* khejri / acacia (umbrella), sparse `palm` | heat shimmer | Gulabi Nagar, seg 12 |
| 25 | Salt flat | `#f4f4f0` / `#e6e8ec`, crust lines `#d0d4d8` | dead flat; **hexagon crack pattern** in vertex colour | none | mirror after rain (reflective material); moonlit | seg 12, 16, 21 |
| 26 | Lotus lake vale | `#8fbf6a` / `#7aae5a` / `#9a8a7a` | bowl with a flat lake; terraced gardens on one side | `plane` (chinar), `cypress`, `willow` | lotus pads (flat discs) and pink flowers; floating gardens | Bagh-e-Noor, seg 13 |
| 27 | High cold desert & needles | `#b0a08a` / `#9a8a7a` / `#6a6058` | worley needles (tall, sharp) + ridged; 280–380 m | *new* poplar and apricot in the oases only | turquoise lake `#3fc8c8`; cloth pennants | Roof Pass, seg 27 |
| 28 | River-oasis greenbelt | `#6faa4a` / `#8fbf5a` / `#d4b77a` | flat strip ~300 m wide inside cliffs 30–60 m tall | `palm` (date), *new* papyrus and sugar cane | Nile blue-green `#3a8a9a`; felucca sails | Nile Crossing, seg 13, 21 |
| 29 | Chalk White Desert | `#f2ece0` / `#e8dcc8` / `#fbf7ee` | flat, scattered **mushroom rocks** (a thin stem under a wide cap, instanced) | none | intense stars | seg 14 |
| 30 | Red sandstone desert | `#c8643a` / `#d98a5a` / `#9a4a2a` | mesas + **arches** (torus segments) | *new* desert shrub | stars; red dusk | seg 17, Rimal |
| 31 | Golden erg | `#ecc98a` / `#e0b877` / `#c9a06a` | **dune** noise, 40–90 m star dunes, sharp crests (take the max of two warped ridges) | `palm` ring at oases only | sand ambient; deep stars | Rimal, seg 14, 17 |
| 32 | Mountain wadi & rose terraces | `#b09a7a` / `#c9b08a` / `#8a7a6a` | ridged + terraced benches | `palm`, *new* pomegranate, rose bushes | turquoise pools `#4fd0c8` | seg 16, 17 |
| 33 | Travertine terraces | `#fbfbf6` / `#eef4f4` / `#e0e0da` | stepped bowls (terraced, lipped) | none | pools `#7fd8e8`; steam | seg 18 |
| 34 | Cloudland | `#f4f4ff` / `#e6e8ff` / `#dcd8ff` | islands: flat top, inverted rock cone underneath | `cloud`, `crystal` | everything glows; cloud falls | Sky Isles |

**Recipes for sighting set-pieces.** A small kit renders most of the sightings:

| Set-piece | Low-poly recipe |
|---|---|
| Waterfall | A vertical strip of scrolling-UV quads with a lighter lip line. A mist particle puff at the base. A rainbow arc (a transparent torus sector) when the sun is behind the camera. |
| Fjord / gorge | Carve with a spline: set height to `min(h, floorY + k·dist²)` along the channel. Water plane inside. |
| Canyon / gorge | The same spline carve, with vertical walls and colour stripes by height (sandstone bands). |
| Terraces (rice, tea, rose) | `h' = step·floor(h/step) + riser·smoothstep(…)` inside a mask. Colour by the terrace index. |
| Dunes | Domain-warped `abs(sin)` ridges along the wind direction. The slipface is the steep side. Sand-curl particles. |
| Glacier | A white-blue tongue mesh following a valley spline. Dark crevasse lines. A milky lake at the snout. |
| Cherry / blossom grove | `sakura` instances + a petal ambient emitter in a radius + a pink ground tint under the trees. |
| Volcano | A radial cone with a crater, ash colour. A smoke column of billboards. Optional glow at night. |
| Salt flat | A flat plane, a hex-crack vertex pattern, a reflective material after rain. |
| Oasis | A pool + a `palm` ring + a green ground ring fading to sand. |
| Lotus lake | A water plane + instanced pad discs + pink cup flowers + canopied boats. |
| Mangrove | Instanced arched root cages under a round canopy, in shallow water. |
| Aurora / stars / rainbow | Already exist in `Sky.ts` and `Ambience.ts`. Allow per-segment overrides so a road inherits its sky. |
| Sea of clouds | A soft, semi-transparent plane at a fixed y in the morning that burns off by noon. |
| Karst towers | Instanced tall rounded cones, clustered by Worley cells, with vegetation caps. |

---

## 5. Implementation notes (for whoever builds this)

These notes are advice only; no code was changed.

- **Replace the grid with anchors.** Store each land as `{id, x, z, cityRadius, coreY}` in km/m
  instead of `col/row`. Blend with normalised inverse-distance weights using a sharpness
  exponent of about 6–8. That keeps a land "pure" near its centre and blends over ~500 m near
  the midpoint. `regionAt` becomes "the anchor with the largest weight".
- **Continent mask.** A signed-distance function from coast polygons, plus a noise wobble,
  replaces `outside()`. The Middle Sea is a negative mask inside the continent.
- **Roads as data.** Store a spline per segment `{from, to, class, controlPoints, gates[],
  sightings[], branches[]}`. `terrainHeight` gets a corridor-flatten term along each spline, like
  the plot flattening already in place. Generate bridges wherever the spline crosses water
  and tunnels where the grade is too steep.
- **Per-land city radius.** `CITY_RADIUS` becomes `r.cityRadius`. Districts are sub-anchors
  inside it, each with its own building mix.
- **Visibility.** Landmarks and the Great Lantern need impostors beyond the chunk streaming
  radius. Consider a far plane or fog end of at least 3 km for the silhouettes only.
- **Relief numbers grow with scale.** Today relief is 6–75 m. The proposal needs peaks of
  250–380 m in the Crown and Roof Ranges. Keep city cores at their `coreY` and let highways
  climb with capped grades.

---

## 6. Sources

Game and level design
- [Breath of the Wild Open World Analysis: Gravity to go Forward — Game Developer](https://www.gamedeveloper.com/design/breath-of-the-wild-open-world-analysis-gravity-to-go-forward)
- [Open world level design: spatial composition and flow in Breath of the Wild — Radiator Blog](https://www.blog.radiator.debacle.us/2017/10/open-world-level-design-spatial.html)
- [Breath of the Wild's Biggest Design Secret: Lots Of Triangles — Kotaku](https://kotaku.com/breath-of-the-wilds-biggest-design-secret-lots-of-tria-1819113140)
- [Holism: Breath of the Wild's Golden Triangles — Source Gaming](https://sourcegaming.info/2017/11/25/holism-breath-of-the-wilds-golden-triangles/)
- [It takes 57 minutes to cross Hyrule corner to corner — Zelda Universe](https://zeldauniverse.net/2017/03/26/it-takes-57-minutes-to-cross-hyrule-corner-to-corner-in-breath-of-the-wild/)
- [How long it takes to travel across the Skyrim map — 80.lv](https://80.lv/articles/player-traveled-across-skyrim-map-with-real-life-steps)
- [Open World Game Design: Pacing, Points of Interest, and Player Freedom — StraySpark](https://www.strayspark.studio/blog/open-world-design-pacing-player-freedom)
- [How to make an exciting Open World: the POIs Diversity Rule — MY.GAMES](https://medium.com/my-games-company/how-to-make-an-exciting-open-world-the-pois-diversity-rule-90de6d748eac)
- [How to Design an Open-World Game — Game Design Skills](https://gamedesignskills.com/game-design/open-world/)
- [See how Ghost of Tsushima's Guiding Wind came to life at GDC 2021 — Game Developer](https://www.gamedeveloper.com/audio/see-how-i-ghost-of-tsushima-s-i-guiding-wind-came-to-life-at-gdc-2021)
- [How Ghost of Tsushima Guides Players Without HUD — Medium](https://ludonodestudios.medium.com/%EF%B8%8F-the-invisible-hand-how-ghost-of-tsushima-guides-players-without-a-traditional-hud-70f6772fcacc)
- [Forza Horizon 5: Crafting Rich and Diverse Mexican Biomes — Adobe Substance](https://www.adobe.com/products/substance3d/magazine/forza-horizon-5-crafting-rich-and-diverse-mexican-biomes.html)
- [Exploring Forza Horizon 5's Biomes and Seasons — Forza.net](https://forza.net/news/exploring-forza-horizon-5-biomes-and-seasons)
- [Forza Horizon 5 has the longest highway in the series — TechRadar](https://www.techradar.com/news/forza-horizon-5-has-the-longest-highway-in-the-series-and-i-cant-wait-to-tear-it-up)
- [GDC 2020: Crafting the art of Sky: Children of the Light — Pocket Tactics](https://www.pockettactics.com/sky-children-of-the-light/art)
- [Realms — Sky: Children of the Light Wiki](https://sky-children-of-the-light.fandom.com/wiki/Realms)
- [Journey (2012 video game) — Wikipedia](https://en.wikipedia.org/wiki/Journey_(2012_video_game))
- [Designing Journey — GDC Vault](https://gdcvault.com/play/1017700/Designing)
- [Learning the Land — Unwinnable (RDR2 landscape)](https://unwinnable.com/2026/06/11/learning-the-land/)
- [Playing the Vanishing Frontier: RDR2 and the Environmental Imagination — NiCHE](https://niche-canada.org/2025/12/12/playing-the-vanishing-frontier-red-dead-redemption-2-and-the-environmental-imagination/)
- [Euro Truck Simulator 2 map scale explained: why 1:19 — racinggames.gg](https://racinggames.gg/article/euro-truck-simulator-2-is-roughly-119-and-thats-why-it-works)
- [The Rescale — SCS Software blog](https://blog.scssoft.com/2016/06/the-rescale.html)
- [The Crew's travel distances compared to the real world — DualShockers](https://www.dualshockers.com/the-crews-travel-distance-compared-to-the-real-world-3893-miles-become-93/)
- [How big is The Crew Motorfest map — Charlie INTEL](https://www.charlieintel.com/the-crew/how-big-is-the-crew-motorfest-map-266589/)
- [Death Stranding — Level Design Tropes — Medium](https://iuliu-cosmin-oniscu.medium.com/death-stranding-level-design-tropes-22d156f9309)
- [Tears of the Kingdom map: surface, Sky and Depths — GamesRadar](https://www.gamesradar.com/zelda-tears-of-the-kingdom-map-full-hyrule-revealed/)
- [Cartographers Play Video Games: TotK map review — Stamen](https://stamen.com/cartographers-play-video-games-a-review-of-the-map-in-the-legend-of-zelda-tears-of-the-kingdom/)
- [Level Design: Views and Vistas — Envato Tuts+](https://gamedevelopment.tutsplus.com/articles/level-design-views-and-vistas--cms-25036)
- [Wayfinding in Themed Design: The "Weenie" — Theory of Theme Parks](https://theoryofthemeparks.blogspot.com/2015/08/wayfinding-in-themed-design-weenie.html)
- [Disneyland — The Level Design Book](https://book.leveldesignbook.com/studies/irl/disneyland)
- [Road hierarchy — Wikipedia](https://en.wikipedia.org/wiki/Road_hierarchy)
- [Mastering Road Hierarchy in Cities: Skylines II — Chill Place Gaming](https://chillplacegaming.com/road-hierarchies-cities-skylines-ii/)
- [Smooth transitions between biomes — itch.io devlog](https://myrmyxo.itch.io/cave/devlog/544546/smooth-transitions-between-biomes)
- [Semi-procedural world generation in Edge Of Eternity — Game Developer](https://www.gamedeveloper.com/programming/semi-procedural-world-generation-and-rendering-in-edge-of-eternity-part-i-)
- [How to Color Low Poly Terrain with Gradients and Curves — Pinwheel Studio](https://www.pinwheelstud.io/post/how-to-color-low-poly-terrain-with-gradients-and-curves)
- [How To Make Low Poly Look Good — Sunday Sundae](https://sundaysundae.co/how-to-make-low-poly-look-good/)

Scenic roads and landscape design
- [National Tourist Routes in Norway — Wikipedia](https://en.wikipedia.org/wiki/National_Tourist_Routes_in_Norway)
- [Geiranger – Trollstigen — Nasjonale turistveger](https://www.nasjonaleturistveger.no/en/routes/geiranger--trollstigen/)
- [Trollstigen — Fjord Norway](https://www.fjordnorway.com/en/attractions/trollstigen)
- [National Tourist Routes Project: architecture and artworks — OnCurating](https://www.on-curating.org/issue-41-reader/national-tourist-routes-project-in-norway-architecture-and-artworks-for-resting-recollecting-and-reflecting.html)
- [Stegastein viewpoint — Norway's Best](https://www.norwaysbest.com/en/flam/things-to-do/stegastein-viewpoint)
- [Stanley W. Abbott, Wizard of the Blue Ridge Parkway — National Parks Traveler](https://www.nationalparkstraveler.org/2008/10/stanley-w-abbott-wizard-blue-ridge-parkway)
- [The Blue Ridge Parkway planning and design — NCPTT / NPS](https://www.ncptt.nps.gov/blog/the-blue-ridge-parkway-exemplifying-the-evolution-of-the-nps-planning-and-design/)
- [Blue Ridge Parkway in fall: overlooks — Blue Ridge Mountains Travel Guide](https://blueridgemountainstravelguide.com/blue-ridge-parkway-in-fall/)
- [Best fall road trips in the US and Canada — Lonely Planet](https://www.lonelyplanet.com/articles/best-fall-road-trips-usa-and-canada)
- [Furka Pass — Wikipedia](https://en.wikipedia.org/wiki/Furka_Pass)
- [Grimsel, Furka, Susten — TheTravel](https://www.thetravel.com/what-is-the-most-scenic-pass-in-switzerland/)
- [Lauterbrunnen — Switzerland Tourism](https://www.myswitzerland.com/en-us/destinations/lauterbrunnen/)
- [Staubbach Falls — World of Waterfalls](https://www.world-of-waterfalls.com/waterfalls/europe-staubbach-falls/)
- [Nakasendo — Japan National Tourism Organization](https://www.japan.travel/en/spot/1367/)
- [Kiso Valley walk: Tsumago to Magome — Japan Uncharted](https://japanuncharted.com/nagano/hiking/kiso-valley-post-towns-walk)
- [Passu — Wikipedia](https://en.wikipedia.org/wiki/Passu)
- [Hunza Valley guide — CKNP](https://www.cknp.org/hunza-valley-burusho-wakhi-karimabad/)
- [Journey through Pakistan on the Karakoram Highway — G Adventures](https://www.gadventures.com/blog/karakoram-highway/)
- [Caravanserai — National Geographic Education](https://education.nationalgeographic.org/resource/caravanserai/)
- [Persian caravanserai: roadside inns on Iran's Silk Road — SURFIRAN](https://surfiran.com/mag/persian-caravanserai/)
- [Silk Road caravanserais in Turkey — All About Turkey](https://www.allaboutturkey.com/caravanserai.html)
- [Sam Sand Dunes, Jaisalmer — Rajasthan Places](https://www.rajasthanplaces.com/jaisalmer/sam-sand-dunes/)
- [Road to Heaven, Kutch — Wikipedia](https://en.wikipedia.org/wiki/Road_to_Heaven,_Kutch)
- [Rann of Kutch — Incredible India](https://www.incredibleindia.gov.in/en/gujarat/kutch/rann-of-kutch)
- [Cruising Kerala's backwaters by houseboat — Horizon Guides](https://horizonguides.com/guides/houseboat-trip-on-keralas-backwaters)
- [Experience Kerala: backwaters, tea fields & wildlife — kimkim](https://www.kimkim.com/c/experience-kerala-southern-india-s-backwaters-tea-fields-wildlife-7-days)
- [Mount Ijen blue fire and Mount Bromo — Kura-Kura](https://kura2bus.com/blog/mount-ijen-blue-fire-and-mount-bromo-a-journey-of-volcanoes/)
- [How to visit Kawah Ijen — The World Travel Guy](https://theworldtravelguy.com/kawah-ijen-volcano-blue-fire-banyuwangi/)
- [The River Nile's greatest attractions from Aswan to Luxor — CNN](https://www.cnn.com/travel/article/egypt-river-nile-attractions/index.html)
- [Luxor to Aswan itinerary — SEV](https://semelegantvoyage.com/en-us/luxor-aswan-itinerary-day-by-day/)
- [Liwa Oasis and the Empty Quarter — MOCCAE](https://moccae.gov.ae/en/knowledge/ecotourism/liwa-oasis-and-the-empty-quarter)
- [Moreeb Dune — Wikipedia](https://en.wikipedia.org/wiki/Moreeb_Dune)
- [A guide to Liwa Oasis and the Moreeb dune — Against the Compass](https://againstthecompass.com/en/liwa-oasis-moreeb-dune-tal-mireb/)
- [Abisko, Swedish Lapland — Fifty Degrees North](https://fiftydegreesnorth.com/eu/destinations/abisko)
- [Glass igloo guide, Finland — Nordic Visitor](https://www.nordicvisitor.com/blog/glass-igloos-finland-guide/)
- [Longji Rice Terraces: the complete guide — Fabio Nodari](https://www.fabionodariphoto.com/en/longji-rice-terraces-complete-guide/)
- [Guilin travel guide: Li River, Yangshuo & terraces — Chinotrips](https://chinotrips.com/guilin/)
- [Mount Huangshan — UNESCO](https://whc.unesco.org/en/list/547)
- [Four wonders of Huangshan — Travel China Guide](https://www.travelchinaguide.com/attraction/anhui/huangshan/wonders.htm)
- [Dal Lake — Wikipedia](https://en.wikipedia.org/wiki/Dal_Lake)
- [Shalimar Garden — District Srinagar](https://srinagar.nic.in/tourist-place/shalimar-garden/)
- [Mountain passes in Ladakh — Cliffhangers India](https://cliffhangersindia.com/passes-in-ladakh/)
- [Thiksey Monastery guide — Ride and Fire](https://rideandfire.in/blog/thiksey-monastery-ladakh-guide)
- [The Sundarbans — UNESCO](https://whc.unesco.org/en/list/798/)
- [Sundarbans — Britannica](https://www.britannica.com/place/Sundarbans)
- [Cypress road, Monticchiello — Valdorcia.it](https://valdorcia.it/en/schede/cypresses-road-monticchiello-pienza/)
- [Val d'Orcia road trips — Travlinmad](https://www.travlinmad.com/blog/val-dorcia-tuscany-road-trips)
- [Morocco's southern oases routes — Rough Guides](https://www.roughguides.com/morocco/southern-oases-routes/)
- [Ksar of Ait-Ben-Haddou — UNESCO](https://whc.unesco.org/en/list/444)
- [Western Desert, Egypt — Egypt Tours Plus](https://www.egypttoursplus.com/western-desert-egypt/)
- [The White Desert of Egypt — Egypt Top Tours](https://www.egypttoptours.com/Egypt/egypt-travel-information/desert-attractions/the-white-desert-of-egypt)
- [Boseong green tea fields — The Soul of Seoul](https://thesoulofseoul.net/boseong-green-tea-fields-korea/)
- [Yeojwacheon Stream (Cherry Blossom Road) — Trazy](https://www.trazy.com/spot/1650/yeojwacheon-stream-cherry-blossom-road-%EC%97%AC%EC%A2%8C%EC%B2%9C-%EB%B2%9A%EA%BD%83%EB%AA%85%EC%86%8C)
- [Jokulsarlon glacier lagoon — Guide to Iceland](https://guidetoiceland.is/nature-info/jokulsarlon-glacier-lagoon-the-crown-jewel-of-iceland-s-nature)
- [Reynisfjara black sand beach — Guide to Iceland](https://guidetoiceland.is/travel-iceland/drive/reynisfjara)
- [Jebel Akhdar (Oman) — Wikipedia](https://en.wikipedia.org/wiki/Jebel_Akhdar_(Oman))
- [A week through wadis, mountains and deserts in Oman — Coddiwomple Chronicles](https://www.coddichronicles.com/wadis-deserts-oman/)
- [Seven Sisters, East Sussex — Wikipedia](https://en.wikipedia.org/wiki/Seven_Sisters,_East_Sussex)
- [Most beautiful places in England — England Tourism](https://www.englandtourism.org/most-beautiful-places-in-england/)
- [Pamukkale — Wikipedia](https://en.wikipedia.org/wiki/Pamukkale)
- [Göreme Historical National Park — Wikipedia](https://en.wikipedia.org/wiki/G%C3%B6reme_Historical_National_Park)
- [Hamnøy travel guide — Norway Explained](https://norwayexplained.com/hamnoy-travel-guide/)
- [Eliassen Rorbuer — Visit Norway](https://www.visitnorway.com/listings/eliassen-rorbuer/235957/)
- [Alpujarra of Granada — Love Granada](https://www.lovegranada.com/alpujarra/)
- [Generalife — Wikipedia](https://en.wikipedia.org/wiki/Generalife)
- [Wadi Rum, Jordan — wadi-rum.com](https://www.wadi-rum.com/wadi-rum/)
- [Song-Kul Lake — Visit Kyrgyzstan](https://www.visitkyrgyzstan.org/destinations/song-kul/)
- [West Lake, Hangzhou — Travel China Guide](https://www.travelchinaguide.com/attraction/zhejiang/hangzhou/west_lake.htm)
- [Múlafossur waterfall — Guide to Faroe Islands](https://guidetofaroeislands.fo/travel-faroe-islands/drive/mulafossur/)
- [Turf-roofed houses — Guide to Faroe Islands](https://guidetofaroeislands.fo/best-of-faroe-islands/8-places-to-see-turf-roofed-houses/)

Notes on sources:
- The Top Gear piece on Forza Horizon map-making returned HTTP 403 and was not used.
- Figures quoted from travel sites (heights, lengths) are used only as proportions for the
  game's compressed scale.

---

## 7. Keyword log

**Round 1 — how open worlds and roads are designed** (15 queries/fetches)
- *Breath of the Wild map design triangle rule gravity landmarks GDC*: harvested: triangle rule,
  gravity, three landmark scales, CEDEC.
- *open world map design points of interest density spacing*: harvested: empty-world syndrome,
  80/20 procedural/hand-placed, funnelled POIs.
- Fetched StraySpark pacing: 60–120 s between POIs, fast travel every 3–5 min.
- Fetched the Radiator Blog BotW analysis: occlusion, curving paths.
- *Ghost of Tsushima guiding wind open world navigation design*: harvested: diegetic guidance,
  golden birds, foxes, layered sightlines.
- *Forza Horizon 5 map design roads biomes Mexico Playground Games interview*: harvested: 11
  biomes, constant visual contrast, longest highway.
- The Top Gear fetch failed (403).
- *road hierarchy game level design highways arterial local roads open world*: harvested:
  functional classification, tree hierarchy, no level-skipping.
- *Sky Children of the Light realms level design journey flow landmarks*: harvested: a
  time-of-day progression across realms.
- *Red Dead Redemption 2 world design biome transitions roads trails landscape*: harvested:
  imperceptible transitions.
- *Euro Truck Simulator 2 map scale compression scenic roads design*: harvested: 1:19 scale,
  abstract cities, rescale.
- Fetched the SCS "The Rescale" post: 1:35 → 1:20, 75 % longer roads, no interstate-to-interstate
  junctions.
- *Journey thatgamecompany level design mountain landmark always visible*
- *Genshin Impact map design regions teyvat landmark visibility exploration waypoint distance*
- *The Crew compressed United States map scale driving time coast to coast*: harvested: 2.4 %
  compression, Motorfest 10 minutes.

**Round 1b — widening the design vocabulary** (4)
- *Death Stranding road building terrain traversal level design interview*
- *procedural biome transition blending ecotone game terrain design*: harvested: weights summing
  to 1, sigmoid, climate tuples.
- *Tears of the Kingdom sky islands design vertical layers map depths surface*
- *level design reveal vista framing view corridor weenie Disney landmark*: harvested: weenie,
  valve, denial space.

**Round 2 — real scenic routes matched to lands** (12)
- *Norway national tourist routes Atlantic Ocean Road Trollstigen Geiranger waterfalls hairpin*:
  harvested: 11 bends, Seven Sisters falls.
- *Swiss alpine passes Grimsel Furka Susten glacier hairpins scenic road*: harvested: Rhône
  Glacier, reservoirs.
- *Nakasendo Kiso road post towns Magome Tsumago cedar forest*: harvested: shukuba, stone-paved
  road.
- *Karakoram Highway Hunza valley Attabad lake Passu cones glaciers*: harvested: cathedral
  peaks, landslide lake, suspension bridge.
- *Silk Road caravanserai spacing one day's journey 30-40 km design*: harvested: 30–40 km,
  8–10 h spacing.
- *Rajasthan Thar desert road Jaisalmer Sam dunes Kuldhara stepwell desert camp*
- *Kerala backwaters Alleppey houseboat Munnar tea plantations Western Ghats road*
- *Java volcano route Bromo Ijen blue fire Tegallalang rice terraces Bali subak*
- *Nile valley road Aswan Luxor felucca sugarcane desert edge green strip landscape*
- *Liwa oasis Empty Quarter Moreeb dune road Wadi Rum sandstone arches Bedouin camp*
- *Lapland winter road aurora glass igloo village reindeer Kiruna Abisko scenic route*:
  harvested: "blue hole" clear sky, Ofoten line.
- *Guilin Li River karst Longji rice terraces Zhangjiajie pillars scenic drive*: harvested:
  dragon's backbone.

**Round 3 — harvested keywords turned into new searches** (8)
- *Norway National Tourist Routes architecture viewpoints rest stops Stegastein design philosophy*
  (from the tourist-route results)
- *Great Rann of Kutch white salt desert full moon Dholavira road*: salt flats in the brief.
  Harvested: Road to Heaven.
- *Srinagar Dal Lake lotus floating gardens Shalimar Bagh Mughal terraces Kashmir*: lotus lakes
  for the Mughal land. Harvested: Nishat's 12 terraces.
- *Ladakh Leh Manali highway monasteries Thiksey Pangong lake high passes prayer flags*: hill
  monasteries.
- *Sundarbans mangrove forest tidal creeks boat villages landscape*: mangroves.
- *Val d'Orcia cypress-lined road Tuscany hill towns rolling wheat fields*: Firenzia.
- *Morocco Tizi n'Tichka pass Todra gorge Dades valley kasbahs Ait Benhaddou*: the Islamic land
  to Egypt link.
- *Siwa oasis White Desert Egypt chalk formations salt lakes Farafra Bahariya road*: Egypt to
  the desert.

**Round 4 — the remaining lands and rendering** (10)
- *Boseong green tea terraces Seoraksan autumn Jeju volcanic coast Korea scenic road*
- *Blue Ridge Parkway overlooks fall foliage New England covered bridges Hudson Valley scenic
  byway*
- *Iceland Ring Road Jokulsarlon glacier lagoon black sand beach basalt columns Skogafoss*
- *Lauterbrunnen valley 72 waterfalls Staubbach cliffs Swiss village*
- *Oman Wadi Shab Jebel Akhdar terraces rose farms Wahiba Sands road*
- *Seven Sisters chalk cliffs Cotswolds honey stone villages Lake District Scottish Highlands
  Glencoe road*
- *low poly terrain biome color palette flat shading stylized landscape tips*
- Fetched the Pinwheel Studio article on colouring low-poly terrain with gradients: height plus
  slope gradient.
- *how long to walk across Skyrim map minutes / Breath of the Wild map walk time km*
- *parkway design principles landscape architecture Stanley Abbott Blue Ridge curvilinear
  alignment borrowed views* (harvested from the Blue Ridge results)

**Round 5 — filling settlement types and last sightings** (9)
- *Pamukkale travertine terraces Cappadocia fairy chimneys Hampi boulders landscape*
- *Guangxi Detian waterfall Huangshan sea of clouds yellow mountain pines*
- *Lofoten rorbuer red fishing cabins Reine Hamnøy bridges fish drying racks*: fishing
  hamlets.
- *Alpujarras white villages Sierra Nevada Alhambra Generalife acequia water channels
  Andalusia*: Madinat an-Nur's hinterland.
- *Wadi Rum red sand sandstone mountains rock bridges Bedouin camp stars*
- *Jinhae cherry blossom stream Yeojwacheon road Gyeongju tumuli hanok Korea spring*: cherry
  groves.
- *Song Kol lake yurt camp high summer pasture Kyrgyzstan jailoo horses*: high-grassland camps.
- *Hangzhou West Lake lotus causeway willows Su Causeway broken bridge*
- *Faroe Islands turf roof houses Gasadalur waterfall Mulafossur village sea cliff*: turf-roof
  hamlet, sea-cliff waterfall.

In total: 5 rounds, 58 queries and fetches (one fetch failed).
