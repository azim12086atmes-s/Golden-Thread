# How to design visuals (owner's method, 2026-09-28)

For any 3D, effect or particle requirement:

1. **Map every location.** List all twenty lands.
2. **List what each needs:** the 3D models, the effects, the particles, any magical aura. Think of
   keywords from the real place (and its fantasy twin) — e.g. New Yonder: stray cats, cyborg
   animals, drones, neon; Sakura Hollow: hotaru, koinobori, torii mist.
3. **Design a kit before building.** For a family of things (vehicles, animals, institute
   buildings), work out the design components, the types of design and the types of thing, then
   write a parts kit (like `facade.ts`, `traditions.ts`, `monumentKit.ts`) with its detailing.
4. **Build each land from its kit**, inspired by real references, then screenshot and compare.
5. **Effects:** search the particles and effects tied to that place (auroras, incense, spray,
   embers, festival lights), design them per land, and wire them through `atmosphere.ts` /
   `Atmos.ts` / `RegionFX.ts`.

Examples: vehicles — per land, the kinds of vehicle, their components and styles, a vehicle kit,
then builds. Animals — per land, native and fantasy animals (New Yonder's cyborg pets), an animal
kit. Institutes — per land, a kit of that land's institutional architecture with its detailing.

## Where each kit stands (2026-09-29)
- **Vehicles:** road, water and sky kits in `traffic/designs.ts`, every land's own list built
  (VEHICLES_ANIMALS_PLAN.md); rides — coach, ferry, air taxi, Sky Isles cable car (`travel/`).
- **Animals:** 24 body plans in `animals/detailed.ts` (monkey, orangutan and Komodo added) with coat
  overlays in `AnimalModel.ts`; every land's fauna built.
- **Institutes:** the kit exists for all twenty lands — five wall traditions (classic, timber,
  masonry, nordic, sky), a land-specific entrance for each land, and each land's own boundary and
  gate (`instituteFronts.ts`), used by the care institutes (`institutes3d.ts`) and the sciences
  (`sciences3d.ts`).
- **Effects:** `atmosphere.ts` / `Atmos.ts` (wings, motes, smoke, mist, beams), `SkyFX.ts`,
  `FestivalAir.ts`, `RegionFX.ts`.
