# Dragons, fantasy and sci-fi creatures and vehicles: ideas, parts, kits (2026-09-29)

Owner's request: a kit for the Chinese dragon and the other dragons, more detail; fantasy and
sci-fi animals and vehicles — ideate them, ideate their components, write a kit for each family,
then build the 3D in detail. Method: DESIGN_METHOD.md. Rules kept by every kit: no eyes, nose or
mouth on any creature; every head floats clear of its neck (`animalHeadGap`); only
`ALLOWED_PARTS`; nothing in the traffic carries a person; no deities or religious figures.

## What exists today (four separate builds, no shared kit)
| Dragon | Where | How it is built |
|---|---|---|
| The great lung of the Jade Terraces | `world/ChinaDragon.ts` | one deformable tube (72 m), painted scale texture, belly plates, dorsal fins, mane, 4 legs, flame tail, pearl — the most detailed |
| The festival dragon | `traffic/designs.ts` `festivalDragon` | a head piece + 22 ball segments on a chain |
| Little dragons | `traffic/designs.ts` | the generic `quadruped` with feathered wings |
| The Night Dragon (rideable) | `event/Dragon.ts` | hand-built: scale skin, membrane wings, twin tail fins, glitter breath |

## 1. The dragon kit — `creatures/dragonKit.ts`
One kit, four body plans, parts swapped per land.

**Body plans**
- *Lung* (serpent, no wings, four short legs): the Jade tube generalised — length, girth profile,
  ripple.
- *Wyrm* (winged, four legs, long neck): western drake.
- *Wyvern* (winged, two legs, the wings are its arms).
- *Naga/sea serpent* (limbless, finned, swims through water or cloud).

**Components**
- **Body:** a tube swept along a path with a girth profile; a scale texture per palette
  (shingles, rimmed); belly plates; a dorsal crest (fins, spines or a flame ridge); a chest ruff.
- **Head (floating):** lung (long muzzle, antlers, whiskers, mane, pearl held ahead); drake
  (wedge skull, swept horns, frill); frost (crystal horns); sea (fin crests); mech (plates, visor
  strip without eyes).
- **Limbs:** jointed legs with three to five claws; wings as finger bones with a membrane between
  them, a scalloped trailing edge and veins; or feathered wings.
- **Tails:** flame fan, spade, twin fins, frond, crystal shard.
- **Ornaments:** pearl, cloud wisps, ribbons, runes that glow at night, aurora trails, sparks.
- **Motion:** the path-follow ripple (lung and naga), wing beat, tail sweep, head bob.

**Each land's dragon, from the kit**
| Land | Dragon | Palette and details |
|---|---|---|
| Jade Terraces | lung (the great dragon) rebuilt on the kit, + festival dragon | red and gold, pearl, flame tail |
| Sakura Hollow | ryū — three claws, slender, over the pagoda lake | blue-green, white mane, cloud wisps |
| Hanok Village | yong — with the wish pearl, over the palace | azure and white, jade pearl |
| Kaveri Coast | sea serpent surfacing in the bay (Nusa Rinjani is inland) | teal, gold crown fins |
| Aurora Huts | frost wyrm | ice-white, crystal horns, aurora ribbon trail at night |
| Alpenrose | mountain drake perched on a peak | slate and moss, stone crest |
| Old London | heraldic red wyvern (on the flags, and one circling the tower) | red, gold spade tail |
| Firenzia | Leonardo's clockwork dragon (fantasy/sci-fi) | brass ribs, canvas wings, turning gears |
| New Yonder | mech dragon drone | white plates, cyan seams, ducted-fan wings |
| Sky Isles | cloud dragon | translucent pastel, star scatter |
| Tents of Rimal | sand wyrm arcing out of the dunes | ochre, sand spray |
| Wanderers' Meadow | the Night Dragon (rideable) and little meadow dragons | rebuilt on the kit, keeps the saddles |

## 2. Fantasy animals — the creature kit — `creatures/fantasyKit.ts`
Built on the animal kit (`animals/detailed.ts` body plans) plus new parts: feathered or membrane
wings, horns (single, antler, spiral, crystal), tails (plume, many-tailed, flame), coats (scales,
feathers, cloud, crystal, starry, glowing runes), auras (motes round the body).
| Land | Creature | Parts |
|---|---|---|
| Jade Terraces | qilin | deer plan, scale coat, flame mane, single horn |
| Hanok Village | haetae (the palace guardian lion) | cat plan scaled, curly mane, single horn |
| Sakura Hollow | kitsune (nine-tailed fox) | fox plan, nine brush tails, glowing tips |
| Old London / Firenzia | griffin | cat plan hindquarters, feathered wings and forelegs, eagle-beaked floating head |
| Alpenrose | alpine pegasus | horse plan, white feathered wings |
| Maple Row | thunderbird | bird plan, huge span, lightning-glow feather tips |
| Bagh-e-Noor / Madinat an-Nur | simurgh | bird plan, peacock tail, jewel colours |
| Kaveri Coast | lotus swan | bird plan, petal wings, glowing lotus crest |
| Nile Crossing | phoenix (exists) — rebuild with flame feathers | bird plan, ember aura |
| Wanderers' Meadow | moon rabbit, fairy deer, lantern moths | rabbit and deer plans, glow coats |
| Sky Isles | crystal stag, star whale calf | deer plan with crystal antlers; whale |
| Aurora Huts | aurora fox | fox plan, ribbon tail that shimmers at night |

## 3. Sci-fi animals — the mech kit — `creatures/mechKit.ts`
Parts: armour plates over any body plan, glowing seams, joint rings, piston legs, ducted fans,
antenna, visor band (never eyes), holo fins. The cyber cat and dog overlay exists; this extends it.
| Land | Creature |
|---|---|
| New Yonder | robo-pigeons, mecha-horse, hover-hound, drone-fish in the canals |
| Firenzia | clockwork songbirds and a brass automaton horse (Leonardo's workshop) |
| Old London | steampunk clockwork ravens at the tower |
| Sky Isles | holo-jellies, star mantas (exist) — add a starlight whale |

## 4. Fantasy and sci-fi vehicles — the vehicle kit extension (`traffic/designs.ts`)
Parts: hover pads and glow skirts, ducted fans, maglev bogies, walker legs, solar sails, crystal
hulls, ornithopter wings, gear trains, envelope rigs. Traffic only — nothing carries a person.
| Land | Vehicles |
|---|---|
| New Yonder | hover-bikes, maglev pods, cargo walker, drone swarm |
| Old London | steampunk ornithopter, brass airship tug |
| Firenzia | Leonardo's ornithopter (exists as glider; add), clockwork carriage |
| Sky Isles | crystal sled, solar sailship, cloud galleon |
| Wanderers' Meadow | leaf glider, dandelion balloon |
| Aurora Huts | hover sled on glow runners |
| Nusa Rinjani / Kaveri | bubble submersible in the bays |
| Tents of Rimal | sand skiff with a sail on hover runners |

## Built (2026-09-29, 5b03b73)
- **Dragon kit** `creatures/dragonKit.ts` and every land's dragon in `creatures/Dragons.ts` (the
  Jade lung rebuilt on it; `world/ChinaDragon.ts` retired). Tests: `tests/dragons.test.ts` —
  allowed parts, the head clear of the body, flights clear over every building, the sand wyrm in
  and out of the dunes, the sea serpent in deep water.
- **Fantasy and mech kit** on the animal kit (`AnimalModel.ts` `Fantasy`, `enchant`): all the
  creatures in §2 and §3, in their lands' fauna.
- **Vehicles** `traffic/fantasyDesigns.ts`: all of §4 plus a VTOL shuttle.
- Wings refined (fe130b4): bat-like fanned fingers with claws, deeper scallops, bones through
  the membrane.

## Built (2026-09-29, second pass)
- **Festival dragon** on the kit (`Dragons.ts` `festival-dragon`): a lung of red silk with gold
  embroidered scales, lantern hoops round the body and a fringe down the belly (new hide style
  `silk`), chasing its pearl on a wide circle over the Jade Terraces. The old chain-of-balls
  traffic design stays defined but flies nowhere.
- **Little meadow dragons** on the kit: a flock of three small mint wyrms with lung heads
  (`DragonHome.flock`), each on its own wider, higher circle, one behind another. The old
  `little-dragons` traffic design is retired.
- **The Night Dragon** (`event/Dragon.ts`) rebuilt on the kit: short neck (`DragonSpec.neck`), the
  cat-like `night` head with swept ear flaps, bat wings, plated spine with glowing scales,
  star-scales down the flanks (`stars`), and the `twin` tail with one red leather-and-steel
  prosthetic fin. As a mount it is held by `perch()` (straight body, tail sways, neck arched), the
  wings beating with speed; the saddles, divider and seat positions are unchanged. Over the
  celebration it still loops its figure-eight and breathes glitter. Test: its back meets both
  saddles, its head floats clear, allowed parts only.
- **Starlight whale** (Sky Isles), **cloud galleon** (Sky Isles), **drone fish** shoals (New
  Yonder's waters) in `traffic/fantasyDesigns.ts`.
- Still open: squarer mech and brass dragon heads could be refined; the thunderbird reads blobby
  at its scale.

## Order of work
1. Dragon kit, then the Jade lung and the festival dragon rebuilt on it; then each land's dragon.
2. Fantasy creature kit, then each land's creatures.
3. Mech kit, then the sci-fi animals.
4. Vehicle kit parts, then the fantasy and sci-fi vehicles.
Each step: tests (anatomy rules, `tests/anatomy.test.ts`; traffic designs build), then a studio
render (the probe's canvas capture) and an in-world screenshot, then commit, push and deploy.
