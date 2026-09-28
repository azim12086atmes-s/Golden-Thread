# Institutional buildings — audit (2026-09-28)

Every institute kind in `src/institutions/catalogue.ts` has a 3D builder for all four stages
(stall → workshop → hall → academy), and an interior (`src/world/interiors3d.ts`, `scienceRoom`).
`tests/institutes3d.test.ts` builds every kind × stage in its land and keeps it inside its radius.

| Kind | Land | Built | Detail added in this pass |
|---|---|---|---|
| kitchen, clinic, school, library | every land | ✔ 4 stages | — (already rich) |
| magic | Meadow | ✔ | stall: bubbling cauldron, broom rack, floating candles, star sign |
| tea | Japan | ✔ | tea house: stone lantern, stone basin and spout, bamboo fence, maple |
| celadon, tcm, shipwright, watchmaking, engineering, anatomy, radio, islamicsciences, navigation, ayurveda, siddha | — | ✔ | — (already detailed) |
| tech | New Yonder | ✔ | garage start-up with screens, panels, aerial, scooter; turbines, holo screens, green podium and entrance canopy on the tower; dome ribs, turbines, trees and lit paving on the campus |
| irrigation | Nile | ✔ | water jars and a shaduf at the stall; channel, palms and beds at the house; kiosk over the nilometer, obelisks, palms, flax |
| starlore | Desert | ✔ | armillary sphere, palms, star-map in the sand; academy: doors and merlons on the halls, tent moved off the pool, windows up the tower, armillary on top, sundial and meridian line |
| gardens | Mughal | ✔ | charbagh quarters of flower beds edged in stone, cypress walks |
| subak | Indonesia | ✔ | paddies of young rice, offering shrines, meru shrines, palms, kulkul drum tower; academy terraces now step up to the back with rice on every lip and the bales on top |
| polar | Aurora | ✔ | lit windows, doors, chimneys, drifts, sleds, fuel drums, a dish; stairs and rail to the stilt deck; a covered way between the halls, a mast and a dish |
| lightcraft | Sky Isles | ✔ | rainbow arch, prisms and crystal clusters at the stall; lens ring, stained glass, moonstone forecourt and crystals at the tower |
