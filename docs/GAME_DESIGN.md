# The Golden Thread — Game Design

A peaceful open-world journey. Two wanderers — a girl (the player) and a boy (her companion) —
travel the world in their van, joined by a shining golden thread. They help people, learn crafts,
make friends with people and animals, and build small homes wherever they are welcomed.

## 1. Pillars

1. **Together, never touching.** The boy follows wherever the girl goes. They are joined by a
   golden thread of light, never by touch. The thread is the relationship made visible.
2. **Journey over destination.** Twenty lands, each as big as a city, each with its own
   architecture, flora, animals, light and people. Arriving somewhere should feel like arriving.
3. **Provide value wherever you go.** The couple are nomads who earn their living by helping:
   crafting, fixing, cooking, delivering. Money comes from being useful, not from combat.
4. **Peace.** No combat, no enemies, no fail state. Problems are solved by skill and kindness.
5. **Belonging.** Friends remember you and write to you. Land, houses, farms, animals and a
   decorated van turn a journey into a life.

## 2. Hard content rules (enforced in code, tested)

These come from the brief and follow Islamic principles. They are **invariants**, not style
guidance — each has a function and a test so a later change cannot quietly break it.

| Rule | Where it is enforced | Test |
|---|---|---|
| The girl and boy never touch. Walking, flying, riding — a minimum gap is kept. On a unicorn, each rides their own. In vehicles they sit in separated seats. | `src/characters/follow.ts` (`MIN_GAP`, `followStep`), `src/vehicles/vehicles.ts` (`SEAT_GAP`) | `tests/follow.test.ts`, `tests/vehicles.test.ts` |
| No character or animal has eyes, or any facial feature. | `src/characters/CharacterModel.ts`, `src/animals/AnimalModel.ts` build no face geometry; `anatomy.ts` declares the permitted parts | `tests/anatomy.test.ts` |
| Every head floats, detached from the body. | `HEAD_GAP` in `anatomy.ts`, used by both builders | `tests/anatomy.test.ts` |
| No revealing clothing. Every outfit covers arms to the wrist and legs to the ankle; the girl's always includes a head covering; silhouettes are loose. | `src/characters/modesty.ts` (`modestify`, `isModest`) | `tests/modesty.test.ts` |
| Reference designs that are not fully covering are **merged** with trousers, sleeves and a headscarf rather than dropped. | `modestify()` | `tests/modesty.test.ts` |

## 3. Core loop

```
arrive in a land ─► meet people & animals ─► learn what they need
      ▲                                              │
      │                                              ▼
 travel on (van, plane,       gather materials ─► craft with a skill ─► help / sell
 unicorn, flight)                                              │
      ▲                                                        ▼
      └── thread grows brighter ◄── friendship, coins, land, the land's lantern lit
```

## 4. Systems

| System | Summary | Code |
|---|---|---|
| World | 20 lands on a 5×4 grid, 700 units each, streamed around the player. Terrain is continuous; each land flattens into a city core. | `src/world/` |
| Day & night | 16-minute day. Sun, moon, stars, per-land specials: aurora, rainbows, fireflies, lanterns, snow, petals. | `src/world/Sky.ts`, `Ambience.ts` |
| Companion | Spring-follow with hard minimum gap; catches up by gliding when far. | `src/characters/follow.ts` |
| Golden thread | Sagging glowing ribbon with light motes; brightness = shared light. Flight energy recharges while the boy is near — the thread shares light, so no touching is needed. | `src/characters/Thread.ts` |
| Travel | Walk, cape-flight, car, van, truck, plane, unicorn (two unicorns). | `src/vehicles/` |
| Wardrobe | ~40 outfits from many cultures, eras, fantasy and sci-fi, all modest by construction. | `src/characters/outfits.ts` |
| People & animals | Residents with dialogue, friendship hearts and quests. Animals to feed, befriend and adopt. | `src/npc/`, `src/animals/` |
| Messages | Befriended residents write in. Reply, ask how they are, send gifts, accept requests. | `src/social/Messages.ts` |
| Skills & crafts | 8 skills, materials per land, recipes gated by skill level. Markets value goods not made locally. | `src/economy/` |
| Quests | Main story (one chapter per land) and side quests, all data. | `src/quests/` |
| Homes | Buy plots, place decor, build houses, plant farms, keep animals. Decorate the van interior. | `src/housing/` |
| Save | Versioned JSON in localStorage. | `src/core/save.ts` |

## 5. Story — *The Golden Thread*

The lanterns of the world have dimmed. People have drifted apart, and each land's Lantern Keeper
can no longer light the lamp at its heart. Grandmother Noor of Wanderers' Meadow gives the two
travellers her old van, *Safar*, and says only: "A thread is strong because it is shared."

Each land is a chapter. Arrive, meet its Keeper, help its people with what you have learned, and
the land's lantern is relit by the light of the thread. With every lantern the thread grows
brighter and the cape of light carries them higher, until they can reach the Sky Isles and the
Great Lantern at the top of the world.

Side quests are small kindnesses: a lost goat, a broken lamp, a letter that needs writing, a
recipe someone's grandmother used to make.

## 6. Controls

| Key | Action |
|---|---|
| WASD / arrows | Move · steer |
| Mouse drag · wheel | Camera · zoom |
| Space / Shift | Jump or ascend · sprint or descend |
| F | Cape of light (fly) |
| E | Interact · talk · gather · board |
| V | Vehicles |
| C | Wardrobe |
| I | Bag & crafting |
| J | Journal |
| M | Map & travel |
| N | Messages |
| B | Build (on your own land) |
| Esc | Close |

## 7. Non-goals for now

Multiplayer, voice, combat, real-money anything, AI-generated dialogue at runtime.
