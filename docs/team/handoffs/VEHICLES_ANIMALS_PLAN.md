# Vehicles and animals: the map, then the kits (DESIGN_METHOD.md), 2026-09-28

Existing: 120 traffic designs (`traffic/designs.ts`, built from `car()`, `bus()`, boats, creatures
with the `Shaper` kit) and 21 animal species (`animals/AnimalModel.ts`). Below, for every land:
what is still missing, the keywords behind it, and the kit parts it needs. ✅ = exists.

## The kits to write first
- **Road kit** (extends `car()`/`bus()`): body shapes (boxy, rounded, wedge, cab-over, three-wheeler,
  cart), wheels (spoked, whitewall, balloon, tracks, skis, hover pads), roofs (hard, canopy, solar,
  rack, awning), liveries (two-tone, stripes, painted art, neon), lamps (round, slit, lantern).
- **Water kit**: hulls (flat punt, round, keeled, canoe, outrigger, catamaran, ship), cabins, sails
  (lateen, junk battened, square, crab-claw), oars/poles/paddle wheels, awnings and garlands.
- **Sky kit**: envelopes (blimp, balloon), wings (fixed, flapping, rotor, ducted fan), gondolas,
  magical fliers (carpets, boats with wings, creatures).
- **Animal kit** (extends `quadruped`/`bird`): body plans (quad, bird, fish, insect, serpent),
  coats (fur, feather, scale, plate), heads (no eyes, floating), tails, horns/antlers, gear
  (saddles, bells, harness), and a *cyborg* layer (glowing seams, panels, antennae) for New Yonder.

## Land by land
| Land | Road — new | Water — new | Sky — new | Animals — new (keywords) |
|---|---|---|---|---|
| Aurora Huts | tracked snowcat, sami pulka sled | ice-sailer on skis | aurora kites, snowy owls ✅ | arctic fox, snowy hare, musk ox, husky |
| Fjordhavn | vintage Volvo estate, fish lorry | coastal rib, færing rowboat | puffins, sea eagles ✅ | puffin, elk, lynx |
| Alpenrose | cog railway car, Vespa | lake steamer ✅, pedalo | cable car gondolas, hang gliders | marmot, ibex, St Bernard, Swiss cow ✅ |
| Old London | Routemaster ✅, milk float, pedicab | Thames clipper, rowing eight | police helicopter, starlings | fox ✅, squirrel, corgi, ravens |
| New Yonder | yellow e-cab ✅, delivery robot, e-scooter | water taxi, solar ferry | drone swarm, VTOL shuttle | **stray cats, cyborg cats and dogs, robo-pigeons**, rats-free |
| Hanok Village | 1980s Pony car, cargo trike | nakseo boat | kites (yeon), magpies | magpie, Jindo dog, tiger (spirit) |
| Sakura Hollow | kei truck, rickshaw | ✅ | sky koi ✅, crows | shiba, tanuki, deer ✅, koi |
| Wanderers' Meadow | ✅ fairy cart, hedgehog wagon | leaf boat | fairy lanterns, bumble-bee riders | hedgehog, fawn, bunny ✅, fairy fox |
| Firenzia | Fiat 500, Ape three-wheeler | vaporetto | Leonardo glider ✅ | Italian greyhound, doves, lion (Marzocco) |
| Maple Row | Model T, ice-cream truck, school bus | paddle wheeler | crop duster, blimp ✅ | raccoon, squirrel, cardinal |
| Jade Terraces | tuk-tuk ✅, e-moped | bamboo raft, cormorant boat | kites, festival dragon ✅ | panda ✅, golden monkey, red panda, cormorant |
| Nusa Rinjani | bemo ✅, scooter family | outrigger ✅ | janggan ✅, kites | orangutan, Komodo, hornbill, macaque |
| Sky Isles | — | cloud skiff | sky whales ✅, cloud jellies, star mantas | cloud sheep, light birds ✅, star cats |
| Madinat an-Nur | petit taxi ✅, carriage | ✅ | carpets ✅, lanterns | Arabian horse ✅, doves ✅, fennec fox |
| Souq al-Qamar | Land Cruiser ✅, camel ✅ | pearling dhow | falcons ✅ | oryx, saluki, falcon |
| Kaveri Coast | auto ✅, Ambassador car | snake boat ✅, coracle | kites | elephant ✅, peacock ✅, langur |
| Gulabi Nagar | Tata truck ✅, Royal Enfield | — | Pushpaka ✅, kites | camel ✅, macaque, Rajasthani cow |
| Bagh-e-Noor | tonga ✅, palanquin | shikara ✅ | kites | peacock ✅, nilgai, parakeets |
| Nile Crossing | microbus, donkey cart ✅ | felucca ✅ | ibis, sun-barque ✅ | ibis, Egyptian mau cat, donkey ✅ |
| Tents of Rimal | dune buggy ✅ | — | roc ✅ | fennec, desert hare, saluki |

Animals: every land's list above is built (2026-09-29) — primates on new monkey and orangutan
plans (golden monkey, macaque, grey langur, orangutan), a Komodo dragon on a sprawling lizard plan,
the Horangi tiger (stripes) and Marzocco lion (mane) on the cat's, hedgehog (spines), fawn (spots),
fairy fox (glowing wisps), cardinal, desert hare and Kankrej cattle. Heads float, no faces
(tests/anatomy.test.ts).

Kites are already in every land's sky by day (`SkyFX.ts` kites on strings; `FestivalAir.ts`
Basant patang and Bali's bebean), so the "kites" entries above are done.

## Order of work
1. Animal kit + New Yonder's cats and cyborg pets, then every land's missing animals.
2. Road kit extensions, then each land's missing road vehicles; rebuild the car, truck and biplane
   (the travellers' own) in painted steel like Safar.
3. Water kit and sky kit, then each land's missing boats and fliers.
Rules kept throughout: no eyes on any animal, heads float (`ANIMAL_HEAD_GAP`), nothing carries the
two together in one seat.

## Rides (vehicles you board) — `travel/Ride.ts`
One ride class carries them on a course with a model, their two seats and the family's:
- **Intercity coach** (`travel/bus.ts`): every bus stop to every town on the ground, by the roads.
- **Coastal ferry** (`travel/ferry.ts`): from the pier head of every harbour, out across the ship
  lanes and round the island outside them, to any other harbour; benches port and starboard on the
  open foredeck with a planter between. Board from the harbour panel.
- **Air taxi** (`travel/air.ts`): from beside any bus stop, lift off, cruise 110 m above the highest
  ground, and settle beside the stop of any land — or on the landing stage floating beside the
  Sky Isles' top island (built in `architecture.ts`), where it also boards. Seats either side of
  a console.
- **Sky Isles cable car** (`travel/gondola.ts`, `travel/SkyTram.ts`): a valley station on the meadow
  (ground reserved in `reserved.ts`), a mountain station built out from the temple isle's rim, two
  cables rising at ~40° clear of every isle; two cabins shuttle, one up as the other comes down.
  Free. The two sit on the front bench either side of a divider.
- Left: trams, rideable water taxis.
