# Blender authoring → web game

Decision proposed 2026-09-25: retain Three.js/TypeScript/Vite; introduce Blender as the art-authoring application. Blender MCP is not exposed among tools in this session; no Blender scene or export has been executed here.

## Responsibilities

Blender: modelling, UVs, material baking, rigging, skinning, animation clips, collision proxies and authored kit placement.
GLB: delivery of geometry, supported materials/textures, skeletons, animation and agreed metadata.
Three.js: runtime rendering, instancing, LOD selection, streaming, lighting, golden-thread effects and animation playback.
TypeScript simulation: inventory, economy, quests, library knowledge, contracts, vehicles, physics/navigation and save migration.

The result is an interactive 3D game rendered locally by the player's browser, not a video streamed from Blender. Blender Cycles/Eevee renders are useful for reference turntables and promotional art; the runtime appearance must be verified in Three.js.

Primary documentation: [Blender glTF manual](https://docs.blender.org/manual/en/3.2/addons/import_export/scene_gltf2.html), [Three.js GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html). Current latest-manual URL could not be retrieved in this session; verify exporter options against the installed Blender version before running a script.

## Asset contract

- Source `.blend` retained under `art/blender/`; web exports under `public/assets/`; manifest under `src/assets/`.
- Metric modelling: 1 Blender unit = 1 metre. Apply rotation/scale. Exporter handles Blender Z-up → glTF Y-up; browser code must not blindly rotate a second time.
- Runtime front is +Z for current characters. Test a marked orientation fixture before accepting the rig.
- Static asset origin at useful ground/placement anchor. Vehicle origin/chassis/socket contract fixed before modelling interiors.
- Named clips: idle, walk, run, sit, study, work, ascend, glide, board, disembark. Separate traveller sockets must respect minimum gap throughout clips.
- Named nodes: `socket_seat_girl`, `socket_seat_boy`, `socket_door`, `socket_thread`, `socket_cargo`, `socket_reading`, `collider_*`. Custom properties export as extras where supported.
- Character meshes carry `part` metadata. Add explicit glasses/beard/hair categories; forbid eye/pupil/iris/eyelid/nose/mouth meshes. Labels are not proof: also inspect geometry and references.
- Detached heads remain detached including hair/scarf/beard across animation and clothing changes. Do not let beard or long headscarf close the visible gap. Rig head independently while preserving parent motion.
- Glasses are frame geometry around an empty/blank eye area; no painted pupils or eye highlights. Opaque face remains blank.
- Modest opaque garments, loose silhouette, full coverage; no exposed body under skirts during motion. Head covering for girl in every outfit.
- Shared material palette and atlas. Bake procedural nodes to supported texture channels when necessary; a complex Blender node graph is not automatically portable.
- PBR base colour, metallic/roughness, normal, occlusion and emissive; keep glow limited. Use nontransparent frames or restrained lenses to avoid sorting problems.
- Simple separate collision proxies; render mesh is not the physics mesh. Collider geometry must not obstruct intended doors or reading/shop interactions.
- Source images/Pinterest references are inspiration records, not automatically licensed game textures or geometry. Create original assets; track third-party asset licences separately.

## Initial performance targets (hypotheses to measure)

| Asset / frame | Starting target |
|---|---|
| Hero character including active outfit | 15–30k triangles at closest LOD; 3–6 draw calls |
| Resident | 4–10k triangles; share materials, reuse rigs |
| Small interactable prop | 100–2k triangles |
| Modular building piece | 0.5–5k triangles depending on silhouette |
| Vehicle exterior | 10–25k triangles; load interior separately |
| Textures | Prefer 1k shared atlases; 2k only when measured benefit warrants it |
| First district payload | Aim ≤10–15 MB compressed, loaded incrementally |
| Visible scene on reference mobile device | Start with ≤150 draw calls and ≤300k triangles; revise from GPU profiling |
| Performance gate | Target 30 fps mobile / 60 fps desktop at documented resolution; record device, memory and frame-time percentiles |

These are engineering budgets, not verified capabilities of the current game. Triangle counts alone do not bound performance: shadows, transparency, texture memory, overdraw, skinned meshes and script time matter.

Stream by chunks and interiors. Instantiate repeated static modules with shared geometry/material; dispose unused resources deliberately. Use simplified distant town silhouettes and terrain LOD. Export one building/kit/vehicle per manageable asset, not all cities in a giant GLB. Start uncompressed for validation, then evaluate Meshopt/Draco and KTX2 with decoder delivery tested offline.

## Authoring and review sequence

1. Inspect selected reference pins and primary-source context; record silhouette/material/function, not just a mood label.
2. Greybox a street and library at walking scale. Check door widths, sightlines, turning radius and two-person seating.
3. Model one coherent hero kit: protagonists, Safar, kirana frontage/interior, library shelf/table and workshop tools.
4. Export GLB plus manifest: ID, path, bounds, triangles, materials, clips, sockets, colliders, licence/provenance, intended region/style.
5. Load in an isolated browser asset-review scene: neutral daylight, evening, wireframe and scale reference. Rotate all sides; check head gap, garment coverage and glasses.
6. Integrate via registry while preserving procedural fallback until the new asset passes tests. Metadata does not contain executable game logic.
7. Measure runtime and inspect on touch hardware before approving regional production.

## Blender MCP connection checklist

Read-only first: list scene/version; identify the user's open scene; create a new named collection or a new file instead of clearing an existing scene. Use the actual exposed tool schema. No guessed socket ports, hidden API calls, or scripts sent to an unknown running service.

Once connected, produce `golden_thread_asset_review.blend` and `traveller_pair.glb`, then a shop/library kit. The supplied export helper is a starter for an already prepared scene, not evidence of a finished model. New source files and exports must stay in the separate game development repo.
