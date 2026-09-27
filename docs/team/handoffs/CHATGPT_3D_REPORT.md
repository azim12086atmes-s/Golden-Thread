# 3D monument pass — 2026-09-27

Branch: `codex/3d-models`, created from `3d-builds`. All edits were made directly on GitHub; no local repository checkout was used.

## Models changed

`src/world/architecture.ts` now has a monument detail pass for all 19 regional landmark builders. The Meadow's Great Tree was already complete and was left in place.

| Region | Model work |
| --- | --- |
| Sakura Hollow | Five-tier pagoda, bracketed eaves, railings, sōrin, torii and stone lanterns |
| Hanok Village | Geunjeongjeon terrace, hall, painted beams and gate |
| Jade Terraces | Temple of Heaven terraces, round hall, tiered roofs and columns |
| Fjordhavn | Borgund stave church gallery, stacked roofs and bell cage |
| Alpenrose | Zytglogge clock tower, dials, spire and bell cage |
| Old London | Westminster frontage, river terrace and four-faced Elizabeth Tower clock |
| New Yonder | Art Deco setbacks, sky gardens, solar terraces, crown and plaza displays |
| Maple Row | Carousel, bandstand and Victorian pier pavilion |
| Firenzia | Cathedral façade, rose window, dome ribs and campanile detail |
| Madinat an-Nur | Arcade columns, courtyard detail and fountain |
| Souq al-Qamar | Fort gate, covered souq bays and wind-tower setting |
| Tents of Rimal | Majlis rugs, cushions, low tables, poles and well |
| Nile Crossing | Pylon gateway, hypostyle columns, obelisks and torches |
| Gulabi Nagar | Five-storey Hawa Mahal façade with jharokha bays and chhatris |
| Kaveri Coast | Gopuram ornament, stepped tank and pillared mandapa |
| Bagh-e-Noor | Taj inlay, decorative bands, garden lamps and fountains |
| Nusa Rinjani | Borobudur relief bands, split gate and meru towers |
| Aurora Huts | Ice hall wings, entrance arch, block pattern and lavvu shelters |
| Sky Isles | Walkable spiral bridges, spires and lights around the Great Lantern |

The builders retain the `landmarks[land](c, o)` contract, use the existing merged `GeoBuilder` groups, and add or preserve colliders and platform entries where needed. Ornament is geometric and faceless.

## Validation

GitHub Actions workflow `.github/workflows/validate-3d.yml` runs on pushes to this branch. The latest run for commit `889faf2` passed `npm run typecheck`, `npm test` (451 tests), and `npm run build`: https://github.com/azim12086atmes-s/Golden-Thread/actions/runs/36320800770 . An earlier run timed out once in `tests/houses.test.ts` on the London case; the unchanged test passed on the latest run.

## Visual review and remaining work

Day and night `scripts/probe/` screenshots were not produced in this GitHub-only pass, so silhouettes, entrances, lighting, and triangle budgets still need visual review before merge. In particular, inspect the bridge slope in Sky Isles and large plaza footprints in Nile Crossing and Bagh-e-Noor. The existing standard landmark interior remains in use; region-specific monument interiors are a separate contract in `src/world/models/interiors.ts`. The Meadow celebration castle is specified separately in §19 of the handoff and has not been changed here.
