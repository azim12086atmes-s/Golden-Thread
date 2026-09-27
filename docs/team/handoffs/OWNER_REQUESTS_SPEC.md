# Owner requests — specifications and status

Every request the owner has made in the 2026-09-27 working sessions, written as a specification:
what it is, how it must look and behave, where it lives in the code, and whether it is done.
Keep this file current: when a request is finished, mark it **Done** with the commit; when the
owner adds or changes one, add it here first.

Status key: **Done** (live on the site), **Partly** (what is left is said), **Open**, **Codex**
(3D model work handed to Codex / ChatGPT; Claude wires it).

The content rules in `CLAUDE.md` apply to all of it: no eyes, noses or mouths; floating heads;
the two never touch or share a seat (≥ `SEAT_GAP`, ≥ 2.2 m apart indoors); modest dress through
`modestify()`; halal-friendly (no alcohol, gambling or pork; modest billboards; a green crescent
or herb leaf for medicine, never a cross).

---

## 1. Water

| # | Request | Specification | Status |
|---|---------|---------------|--------|
| 1.1 | All water flows | Built water (channels, pools, basins) carries a flow direction and speed in its vertex colour; ripples run downstream; basins turn slowly; world water drifts on a slow current. `flowWater.ts`, `Water.ts`. | Done (6028060) |
| 1.2 | Foam glows, water banked like fountains | Every built water piece has a raised stone kerb and a foam line in the glow builder, just above the bloom threshold at night. | Done (6028060) |
| 1.3 | Water in Egypt, Madinat an-Nur and all 20 lands; many fountains | Each town has four water squares (radius 12 m, 100 m out on the diagonals) with a feature in the land's own tradition: tiered fountains, koi and lotus ponds, a stepwell, a falaj, an oasis pool, a hot spring…; sebils along the Islamic lands' streets. `landWaters.ts`. | Done (27526ff) |
| 1.4 | The Nile animated, not overlapping the path | The Nile is a real carved river at local x ≈ 300 (22 m wide), flowing, foamed, bridged at the east avenue, clear of roads. `reserved.ts`, `waters.ts`. | Done (27526ff) |
| 1.5 | Banking, pavements, channels | Rivers run between stone quay walls with coping; towpaths in the road colour, frieze-edged, lit by the land's lanterns every 42 m; ghats every 90 m; ponds and lakes edged with flat stones. `banks.ts`. | Done (27526ff) |
| 1.6 | Sky Isles waterfall | Floating islands (about 2 in 5) have a spring pool that spills over the rim in a long fall into the clouds; the built-water shader draws vertical sheets as falling water. `flowWater.waterfall`. | Done (27526ff) |
| 1.7 | Rougher sea waves at the harbours | Choppier water and breaking foam near each harbour's quay and pier. | Open |
| 1.8 | Shine on water not uniform | A sun-glitter path from reflected sunlight on swells; glints cluster in it; calm slicks drift. | Done (27526ff) |

## 2. Ground, terrain and nature

| # | Request | Specification | Status |
|---|---------|---------------|--------|
| 2.1 | Terrain patterns slower, less uniform (sand, snow, grass, wind) | All ground patterns use rotated, warped noise (no grid). Sand ripples 1.2–2 m apart, strong in patches, crests that wander, end and fork, a second set at a slight angle, low megaripples. Snow sastrugi start, swell and taper; soft drifts elsewhere. Wind moves in slow, patchy gusts; each plant sways a little out of step. | Done (36d842f) |
| 2.2 | Grainy sand (Gulabi Nagar especially) | Up close, sand is fine specks of every size, patches of coarse and fine sand, scattered grit and pebbles, pinker and more ochre drifts. Fades out by 70 m. | Done (36d842f) |
| 2.3 | Snow and water shine not grid-like | Snow glints are scattered sparks in clusters that shift as you move; brightness varies. | Done (36d842f) |
| 2.4 | Grass not uniform | Tufts anywhere in their cell; thick patches and clearings; taller where thick; ground tint in light/shade patches and sun-dried gold stretches. | Done (36d842f) |
| 2.5 | Owned plots blend into the land; a plot being chosen shows green | Only the plot open in the land-for-sale panel, or for sale where you stand, is painted as a soft lawn with a glowing edge. | Done (bda5a54) |
| 2.6 | Trees: more foliage, more organic, less low-poly | Fuller crowns from many overlapping leaf clusters along the branches (not one blob); irregular silhouettes; smoother trunks with root flare; new species forms. See §9. | Open |
| 2.7 | Organic caves and rocks by land | Rock from noise-displaced forms: layered sandstone with ledges and undercuts, ridged crags, faceted ice, pebbles; hoodoos. Caves: sandstone mounds with hoodoos; craggy outcrops; ice caverns with shards and icicles; crystal grottoes in the Sky Isles. Outcrops out in the country by land. `rocks.ts`, `outcrops.ts`, `models/caves.ts`. | Done (36d842f) |
| 2.8 | Sky Isles: islands not cones; a crystal meadow | Floating islands are craggy earth-and-rock masses with ragged lawns, roots and hanging crags. Pastel crystal clusters grow all over the open ground round the travellers, glowing at night; giant crystal sprays in the wild. `islands.ts`, `Meadow.ts`. | Done (5aa09c2) |

## 3. Keeping things apart

| # | Request | Specification | Status |
|---|---------|---------------|--------|
| 3.1 | Houses off fountains, water bodies, landmarks | Houses keep off squares, sebils, fields, institute sites, plots, reserved landmark grounds (the pyramids' plateau, Bagh-e-Noor's garden x ±54, z −70…110) and 12 m of any river or lake. Tested in `tests/houses.test.ts`. | Done (27526ff) |
| 3.2 | Bagh-e-Noor not clumped | Garden-city grid (27 m), the whole charbagh kept clear. | Done (27526ff) |
| 3.3 | Pyramids clear of houses; brick courses level on every face | Three pyramids on a plateau west of town, flat-faced, set on the lowest ground under their corners; the surface shader lays courses horizontally on sloped faces. | Done (27526ff) |
| 3.4 | Grass off paths (New Yonder) and off built ground | A paved-ground registry (`paved.ts`) of houses and forecourts, squares, sebils, fields, sites, quays, caves, towpaths and landmark grounds; the meadow never grows there and replants when a land loads. Wider avenue and ring margins. | Done (27526ff) |
| 3.5 | Trees not overlapping each other or houses | Crowns keep clear of buildings, caves and towpaths, and of each other (a spatial grid). | Done (27526ff) |

## 4. Towns and their dressing

| # | Request | Specification | Status |
|---|---------|---------------|--------|
| 4.1 | Gulabi Nagar: more relief, artifacts, rangolis, pichkaris | Relief 34 and dunes beyond town; pink city gates (pols) on every avenue; rangolis at doorsteps and along the streets; Holi stalls with pichkaris and gulal; kite sellers; marigold torans across the avenues; charpais; piaos; jharokha kiosks; dupattas drying; stone chhatris on the rises. `gulabi.ts`. | Done (5aa09c2) |
| 4.2 | Bridges more beautiful, matched to the land, lit | Per-land bridge designs blending with their banks; lanterns with real light pools. | Partly — placement and an arched placeholder done (6a9010d); the land designs are open |
| 4.3 | Real light from lamps and lanterns | Each lamp lights a small area of ground round it (a pool of light), not just glows; bridges, towpaths and avenues too. Must stay within the draw-call/light budget. | Open |
| 4.4 | Taj Mahal windows aligned | Glow framed with the stone; the tomb turned so an arched face looks down the garden. | Done (97f8597) |

## 5. People, story and interface

| # | Request | Specification | Status |
|---|---------|---------------|--------|
| 5.1 | Intro wording | "she and her beloved"; "both of you" wherever the two are meant. | Done (a5ee22a) |
| 5.2 | People finder | People in need stand in the crowds with a soft rose glow until met; the 🔎 finder (Y) lists those met, with "Show the way". | Done (a5ee22a) |
| 5.3 | Hide the UI inside houses | A Hide/Show toggle on the house panel. | Done (a5ee22a) |
| 5.4 | Sponsored people seen in their homes | They stand in the front garden of the home you gave them, and inside it. | Done (979ed1f) |
| 5.5 | Show what can be built on land | The land-for-sale and homes panels list everything you can build on a plot (with prices), the land's own house style, and where institutes and fields can be founded. | Open (next) |
| 5.6 | Interiors shaped like their building | Igloo (domed, round), tent (sloped cloth, poles), round tent/yurt, courtyard house (open court), terraced London house (narrow, stairs), chalet, haveli, riad… each room's walls, ceiling and furniture follow the building's form. Houses must return a footprint `kind`. | Open |

## 6. Dress

| # | Request | Specification | Status |
|---|---------|---------------|--------|
| 6.1 | More colour and pattern on all dresses | Patterned fabrics (prints, borders, embroidery motifs) from textures, per outfit. | Open |
| 6.2 | Starry dress: large glowing butterfly wings | **Owner's exact brief:** stained (tinted) glass wings on Syeda Fathima's starry dress, **heart-shaped**, each pair **twice the girl's height**. They **flap slowly** (they are large) and **curve/bend while flapping**. The pattern is an intricate, delicate stained-glass mosaic: **small and large, geometric and fragmented, uneven**, with **uneven straight and curved lines**, **curved strokes**, colourful **mosaic panes with even patches of colour**, all **partitioned by veins and strokes** (the leading between the panes). Shining and glowing, drawn as images (canvas textures). Modest: they attach at the back over the dress; they never touch the boy. | Open (after the institutes and game logic, as the owner ordered) |

## 7. Building, institutes and monuments

| # | Request | Specification | Status |
|---|---------|---------------|--------|
| 7.1 | Found clinics, colleges, institutions | Three open institute sites per land; found a kitchen, clinic, school, library or the land's science; grow it in four stages; staff by skill, hire or a sponsored learner. | Done (logic) |
| 7.2 | Functional 3D institute buildings | Real buildings per kind and stage, in the land's architecture: the four care institutes (institutes3d.ts) and all 20 land sciences (sciences3d.ts), 96 buildings, each within its stage's radius (tested). Interiors per kind still to come. | Done (buildings); interiors Open |
| 7.3 | Monuments and their interiors | After 7.2: each land's landmark gets a walk-in interior. | Open |

## 8. Game functions still to build (Claude's queue)

1. Travel between lands — vehicles, couriers, ships, buses and ferries crossing borders without popping in.
2. Stops (bus stops, ferry piers, airfields); the two riding buses, ferries, gondolas and air taxis in separate seats.
3. Junctions — traffic lights or roundabouts, people crossing streets, hiding far-off traffic.
4. Traffic by time of day — quieter nights, lantern boats at dusk, kites and balloons by day, Sky Isles cable gondolas.
5. A door into the celebration castle: its hall, library and tower.
6. Penthouses in New Yonder (after Codex builds them).
7. Paying people with a course or training; certificates that unlock better jobs.
8. Markets that fill up when you sell things yourselves.
9. Making and selling your theses' inventions; healthcare, tech and logistics as businesses you run.
10. Children going home when they reach their destination.
11. Performance work.
12. Real-world sources for each land's science.
13. Wiring in Codex's models as they arrive.

## 9. Trees (specification for 2.6)

- **Crowns**: built from 20–60 leaf clusters placed at branch tips and along the upper limbs,
  each an irregular clump (not a sphere), overlapping, with gaps the sky shows through. The
  silhouette is uneven: some limbs reach out further, the top is not flat.
- **Leaves**: the leaf cards stay (translucent, lit through by the sun) and are denser, with the
  species' leaf shape; colour varies within a crown (sunlit outer leaves lighter, inner darker).
- **Trunks and limbs**: tapered, bent, smooth (more sides near the ground), a root flare at the
  foot, limbs thinning at each fork.
- **Forms by species**: spreading (oak, banyan, flame), conical (pine, fir, cedar), columnar
  (cypress, poplar), weeping (willow, wisteria), palms with arching fronds, fruit trees, and
  the fantasy trees (cloud, candy, crystal, glowtree).
- **Budget**: each land stays a few draw calls (merged); triangles per land within the measured
  baseline (≈ 3–5 M per frame).

## 10. Requests of 2026-09-27 (evening) — queued after the institutes and the game logic

The owner's order: **institutional buildings first, then complete the game logic and its 3D assets**, then these.

| # | Request | Specification | Status |
|---|---------|---------------|--------|
| 10.1 | Multi-coloured crystals in the Sky Isles | Each crystal cluster mixes several pastel hues (not one colour per cluster); facets catch different colours. | Open |
| 10.2 | Materials on tree trunks | Bark surfaces by species: furrowed oak, papery birch, ringed palm, jointed bamboo, smooth baobab, silver moon bark. | Open |
| 10.3 | Some trees look inverted | Find and fix species whose crowns or cones point the wrong way. | Open |
| 10.4 | Canals, pathways and roads follow the terrain | Roads, towpaths and channels laid as strips draped on the ground, not flat boxes; no gaps or chunks where they meet the land. | Open |
| 10.5 | Bridges larger and fancier, in each land's architecture | Spans high enough for boats to pass under, wide enough for vehicles over; stone, timber, moon, red-lacquer, suspension and marble designs; lit by the land's lanterns, lamps and posts. | Open |
| 10.6 | Mountains and plateaus by geography | Desert plateaus in mud and ochre (mesas); arctic mountains and ice plateaus in blue-white; highland mountains and plateaus light grey and rocky. | Open |
| 10.7 | Houses less monotonous | More structural types per land, more colour variety, and textures: grainy plaster, timber, bamboo, stone, brick, thatch. | Open |
| 10.8 | Aurora snow texture | Beyond the ripples: crusted, powdery and windblown patches, footprints of snow, sparkle. | Open |
| 10.9 | Caves textured and enterable | Rock, ice and crystal surfaces; walk in through the mouth into a cave interior. | Open |
| 10.10 | Organic town layouts | Houses not on a grid: winding lanes, clusters and gardens. | Open |
| 10.11 | Desert pebbles and small rocks | Scattered procedurally round the travellers, like the grass. | Open |
| 10.12 | Roads overlapping and chunking with the land | See 10.4. | Open |
| 10.13 | Butterfly wings and dress decoration | As §6.2: large, glowing, animated stained-glass wings on the starry dress with intricate curves, hearts, curved strokes and veins, drawn as images; richer patterns on all dresses. | Open |
| 10.14 | Monuments: external architecture detail and texturing | Each of the 20 landmarks rebuilt with real architectural detail (mouldings, arcades, carving, domes, finials, stairs) and surface textures (stone coursing, marble veining, brick, glazed tile, timber). | Open |
