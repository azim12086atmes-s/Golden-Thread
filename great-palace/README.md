# Great Palace candidate

Read-only source snapshot fetched through the GitHub connector from `azim12086atmes-s/birthday-castle`, branch `claude/project-thread-ua4w3i`, commit `0ca8fb371203f5c3a1f7d2306add622fc6014b41` (2026-10-16). It is not wired into Golden Thread or the deployed party.

This branch is the strongest complete palace implementation found. Its bespoke `js/world/palace.js` is 147,148 bytes and builds the Princess Palace as a four-tier architectural complex, with the great gate, sculpted wall/wings, spires, dome, roof gardens, conservatories, arcades, fountains, textures, and colliders. It includes the architectural detailing directly. The approach and palace geometry are authored in world metres and scale the palace drawings by `S = 2.75`.

## Module closure

The palace and grand approach need these nine authored modules:

- `js/world/palace.js`, `js/world/approach.js`
- `js/world/layout.js`, `js/world/kit.js`, `js/world/arch.js`, `js/world/artifacts.js`
- `js/world/materials.js`, `js/world/textures.js`, `js/world/sky.js`

They depend on vendored Three.js at `vendor/three.module.min.js` and `vendor/addons/utils/BufferGeometryUtils.js`. In a browser module page, resolve the bare imports with:

```json
{
  "imports": {
    "three": "./vendor/three.module.min.js",
    "three/addons/": "./vendor/addons/"
  }
}
```

`createPalace(scene, preset, { makePortal })` and `createApproach(scene, preset, { makePortal })` add their groups to the scene and return update/portal helpers. `layout.js` owns terrain, floors, colliders, bridge data and palace heights; callers must pair it with these branch modules rather than the current Golden Thread layout.

## Measured spatial interface

North is negative z. The origin reference is the palace base at `PAL.y = 40 * 2.75 = 110 m`.

- Palace plan: x = -1058.75..1237.5 m and z = -929.5..646.25 m (about 2.30 km wide). Four walkable tiers are at y = 253 m, 533.5 m, 621.5 m and 704 m. The entry facade/gate is centered at x = 0, z = 563.75 m; gate sill / landing floor is y = 253 m; gate opening is 148.5 m wide and 255.75 m high.
- The cascade court continues from z = 646.25 to 935 m with twin stair flights descending from the gate landing to the upper terrace. The terrace decks run at y = 110 m (z 935..1540), y = 66 m (z 1540..1980), and y = 22 m (z 1980..2420). Grand stairs connect them.
- The golden causeway is 30 m wide, y = 6 m, z = 2420..6220.5 m. It joins the Bridge Pavilions plaza at (0, 13.75, 6421.25), radius 198 m. Its side branches are arched bridges to B02 and B03.
- The source header describes a 2.3 by 1.9 km palace and spires labelled 840–1100 m. Geometry is drawn and scaled by 2.75; the tallest listed spire is 394 drawn metres above the palace base (about 1083.5 m above that base).

## Comparison note

The default/main and `play` branches use `js/world/castle.js` (~33 KB), with optional `castleArch.js` (~18 KB) and `castleDetail.js` (~8 KB) passes. The two detail passes add arcades, gate/window tracery, stair details, landing decorations, banners and lights to that older castle geometry. They are absent from the selected palace branch and depend on its own older `castle.js`/layout API, so they are not part of this closure.

