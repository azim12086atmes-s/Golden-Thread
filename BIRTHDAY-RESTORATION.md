# Golden Thread birthday restoration

The birthday branch retains the original Golden Thread source. The hosted party composes its original World, Sky, CharacterModel, wardrobe, Travellers controller, Guide, NPCs, Townsfolk, Animals, TownDressing, WonderSites, quests, economy, Housing/HousingView, Messages, and VanInterior with invitation-filtered multiplayer. The original single-player entry and personal story/cinematics are not served.

The entire registered outfit collection is available through cultural shelves, search, pagination, and one rotating model preview. Fusion outfits are accepted and persisted by the party server.

The Great Palace is sourced from birthday-castle branch `claude/project-thread-ua4w3i`, commit `0ca8fb371203f5c3a1f7d2306add622fc6014b41`. Its complete architectural dependency closure lives in great-palace/. The palace stands beyond the existing northern lands; its elevated causeway crosses above them. The meadow lift, bridge pavilions, terrace gardens, Rose Gate, crown courtyard and four side venues form one connected route. Source collision and floor queries use the same transform as rendering. Shared coordinates drive the cake, race and courier objectives on both server and client.

Original progression is preserved: new profiles begin with 40 coins and walk, cape flight and Safar; there are no free unlock or finale flags. Crafts, vehicle prerequisites, friendships, animal care, crops and properties use the original rule modules. Movement reuses Travellers; its optional terrain adapter defaults to the original terrain functions. VanInterior retains its original appearance and default behavior, with its optional occupant flag disabled in the party so it never fabricates a private companion. Local findings, quests, inventory and property are saved per invitation in this browser. Party movement, chosen outfits, current rides, rounds, Twenty Lights progress and album remain server-backed.

AbdulAzim remains a private observer who follows Fathima. Private companions and their vehicle visuals/thread are excluded from the public polaroid render, presence, scores and voice projection. Existing invitation URLs are unchanged. No personal invitation config or original story entry is emitted by the build.

## Verification

22 authoritative party tests, 10 chase tests, 4 cooperative story tests, 3 voice privacy tests and 6 hosted Worker scenarios pass. The build checks all emitted module dependencies, versioned imports, private-file exclusion and Worker bindings.

A CPU scene check constructs the actual Great Palace and Golden Thread world, samples the eight bridge segments, checks all nine destinations and five race gates, the two lift endpoints, and all forty story stations. It checks that unrelated Golden Thread terrain remains unchanged. Extended scene checks instantiate PartyLife and Travellers and exercise populated towns, original defaults, follow spacing, cape energy drain and vehicle selection.

GPU/browser rendering, real microphone calls and fourteen graphical clients remain unverified: local browser/server execution was blocked by the session sandbox. The original Vitest/typecheck dependencies were unavailable; the attempt to install them was interrupted while awaiting network permissions. No full-suite pass is claimed. Automatic graphics reduces render cost on sustained slow frames; high/low settings remain available.
