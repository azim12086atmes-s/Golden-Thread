# The Golden Thread

A peaceful open-world web game. Two wanderers — a girl (you) and a boy who follows wherever she
goes — travel twenty lands joined by a shining golden thread. They help people, learn crafts,
befriend people and animals, buy land, farm, and decorate their van, lighting each land's lantern
along the way.

Built with three.js + TypeScript + Vite. Everything is procedural — no model or texture files.

## Run it

```
npm install
npm run dev        # http://127.0.0.1:5191
npm test           # rules, systems and world checks
npm run build      # typecheck + production bundle in dist/
```

## What is in it

- **Twenty lands**, each a city-sized region with its own architecture, landmark, flora, fauna,
  people and light: Wanderers' Meadow (cottages, rainbows, stars), Japan, Korea, China, Norway,
  Switzerland, London, New York, Renaissance, Vintage, Islamic, Middle East, Desert tents, Egypt,
  North India, South India, Mughal, Indonesia, Aurora huts, and the Sky Isles.
- **Travel** on foot, by cape of light, car, van, truck, biplane, or two unicorns (one each).
- **Wardrobe** of 42 outfits across cultures, eras, fantasy and sci-fi — all fully covering.
- **Story**: a chapter per land (meet the Keeper, make what they need, light the lantern) and
  side quests that send you between lands.
- **Living**: 8 skills, ~40 recipes, markets that pay more for goods from far away.
- **Friends** write to you; reply, ask how they are, send gifts, fulfil requests.
- **Homes**: buy plots, build and decorate, farm, keep animals; decorate the van's interior.
- **Day and night** with aurora, rainbows, fireflies, snow, petals and drifting sand.

## Rules that are code, not guidelines

From the brief, and tested in `tests/`:

| Rule | Enforced in |
|---|---|
| The two never touch — walking, flying, riding, seated | `src/characters/follow.ts`, `src/vehicles/vehicles.ts` |
| No eyes or faces on any character or animal | `src/characters/anatomy.ts` + both model builders |
| Heads float, detached | `HEAD_GAP` / `ANIMAL_HEAD_GAP` |
| Clothing is fully covering; non-covering inspirations are merged with sleeves, trousers, headscarf | `src/characters/modesty.ts` |

## Docs

- [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) — pillars, systems, story, controls
- [docs/ART_BIBLE.md](docs/ART_BIBLE.md) — research notes, wardrobe and land references
- [docs/ROADMAP.md](docs/ROADMAP.md) — what is built and what comes next

## Playtesting from the console

Under `npm run dev`, `window.dev` steps the game at a fixed 60 fps (works even in a hidden tab):

```js
dev.start();                                   // leave the title screen
dev.go('mughal', 8, 70, Math.PI, 0.12, 14, 17.6); // land, offset, camera yaw/pitch/dist, hour
dev.hold(['w'], 2);                            // hold keys for 2 seconds
dev.info();                                    // position, gap between them, mode, target
```

## Development copy

This is a local Git development copy of the original Golden_Thread folder; no hosted GitHub fork
exists because the source had no Git repository or remote. Dependencies currently use a local
node_modules junction to the original installation; on another machine run npm install.
The original source remains untouched. Run on port 5191 to keep saves separate from port 5190.

Help now includes Low / High graphics and Save photo. P saves a PNG without the HUD.
Touch screens have Interact, Fly, Jump / Rise, and Run / Descend controls.
